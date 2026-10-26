import {
  generateEntryId,
  redactPII,
  TargetQuerySchema,
  type ElementTarget,
  type LocatorIdentity,
  type PortableLocator,
  type TargetQueryInput,
  type TargetResolution,
} from '@domscribe/core';

const IDENTITY_ATTRIBUTES = [
  'id',
  'data-testid',
  'data-test',
  'aria-label',
  'name',
  'type',
  'role',
] as const;
const INSTANCE_ATTRIBUTE = 'data-ds-instance';
const SEMANTIC_ROW_SELECTOR = 'tr, li, [role="row"], [role="listitem"]';
const normalize = (value: string) => value.replace(/\s+/g, ' ').trim();
interface Instance {
  element: WeakRef<HTMLElement>;
  fingerprint: string;
}

/** Document-local identity and fail-closed, non-positional portable matching. */
export class TargetRegistry {
  private readonly session = `${generateEntryId()}${generateEntryId()}`;
  private sequence = 0;
  private handles = new WeakMap<HTMLElement, string>();
  private instances = new Map<string, Instance>();
  private readonly observer: MutationObserver;

  constructor(
    private readonly options: {
      document: Document;
      blocked: (element: HTMLElement) => boolean;
      redact: boolean;
    },
  ) {
    const view = options.document.defaultView;
    if (!view)
      throw new Error('A browser document is required for target selection');
    this.observer = new view.MutationObserver((records) => {
      // Moves remain connected at the end of the batch; a genuine unmount retires
      // the handle even if the same DOM object is reinserted in a later task.
      if (
        records.some(
          (record) =>
            record.type !== 'attributes' ||
            record.attributeName !== INSTANCE_ATTRIBUTE,
        )
      )
        this.prune();
    });
    this.observer.observe(options.document, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
    });
  }

  private fingerprint(element: HTMLElement): string {
    return JSON.stringify({
      locator: this.locator(element, false),
      entryId: element.getAttribute('data-ds'),
    });
  }

  describe(element: HTMLElement): ElementTarget | null {
    if (!this.eligible(element)) return null;
    const rawLocator = this.locator(element);
    const fingerprint = this.fingerprint(element);
    let instanceId = this.handles.get(element);
    if (
      instanceId &&
      this.instances.get(instanceId)?.fingerprint !== fingerprint
    ) {
      this.retire(instanceId, element);
      instanceId = undefined;
    }
    if (!instanceId) {
      instanceId = `ds_${this.session}_${++this.sequence}`;
      this.handles.set(element, instanceId);
      this.instances.set(instanceId, {
        element: new WeakRef(element),
        fingerprint,
      });
    }
    element.setAttribute(INSTANCE_ATTRIBUTE, instanceId);
    return {
      instanceId,
      entryId: element.getAttribute('data-ds') ?? undefined,
      selector: `[${INSTANCE_ATTRIBUTE}="${instanceId}"]`,
      locator: this.boundLocator(
        (this.options.redact
          ? redactPII(rawLocator)
          : rawLocator) as PortableLocator,
      ),
      disabled: element.matches(':disabled, [aria-disabled="true"]'),
      inputType:
        element.tagName === 'INPUT'
          ? (element as HTMLInputElement).type.toLowerCase()
          : undefined,
    };
  }

  query(input: TargetQueryInput): TargetResolution {
    const query = TargetQuerySchema.parse(input);
    this.prune();
    let elements: HTMLElement[];
    if (query.instanceId) {
      const element = this.getElement(query.instanceId);
      if (!element) return { status: 'stale', targets: [], total: 0 };
      elements = [element];
    } else if (query.locator) {
      const locator = query.locator;
      if (locator.unsupportedReason)
        return { status: 'unsupported', targets: [], total: 0 };
      if (locator.pathname !== this.options.document.location.pathname) {
        return { status: 'wrong_page', targets: [], total: 0 };
      }
      if (JSON.stringify(locator).includes('[REDACTED')) {
        return { status: 'not_found', targets: [], total: 0 };
      }
      elements = Array.from(
        this.options.document.getElementsByTagName(locator.element.tagName),
      )
        .filter((element): element is HTMLElement => this.eligible(element))
        .filter((element) => this.matches(element, locator));
    } else {
      elements = Array.from(
        this.options.document.querySelectorAll('[data-ds]'),
      ).filter((element): element is HTMLElement => this.eligible(element));
    }
    if (query.entryId)
      elements = elements.filter(
        (element) => element.getAttribute('data-ds') === query.entryId,
      );
    const total = elements.length;
    return {
      status:
        query.mode === 'list'
          ? 'listed'
          : total === 1
            ? 'resolved'
            : total > 1
              ? 'ambiguous'
              : 'not_found',
      targets: elements.slice(0, query.limit).flatMap((element) => {
        const target = this.describe(element);
        return target ? [target] : [];
      }),
      total,
    };
  }

  getElement(instanceId: string): HTMLElement | null {
    const instance = this.instances.get(instanceId);
    const element = instance?.element.deref();
    if (
      !element ||
      !this.eligible(element) ||
      element.getAttribute(INSTANCE_ATTRIBUTE) !== instanceId ||
      this.options.document.querySelectorAll(
        `[${INSTANCE_ATTRIBUTE}="${instanceId}"]`,
      ).length !== 1 ||
      instance?.fingerprint !== this.fingerprint(element)
    ) {
      if (instance) this.retire(instanceId, element);
      return null;
    }
    return element;
  }

  dispose(): void {
    this.observer.disconnect();
    for (const [id, instance] of this.instances)
      this.retire(id, instance.element.deref());
    this.instances.clear();
    this.handles = new WeakMap();
  }

  private retire(instanceId: string, element?: HTMLElement): void {
    this.instances.delete(instanceId);
    if (element && this.handles.get(element) === instanceId)
      this.handles.delete(element);
    if (element?.getAttribute(INSTANCE_ATTRIBUTE) === instanceId)
      element.removeAttribute(INSTANCE_ATTRIBUTE);
    // Revoke copied selectors too: removing only the original leaves a uniquely
    // matching clone, which an already-issued browser locator could act on.
    for (const candidate of Array.from(
      this.options.document.querySelectorAll(`[${INSTANCE_ATTRIBUTE}]`),
    )) {
      if (candidate.getAttribute(INSTANCE_ATTRIBUTE) === instanceId)
        candidate.removeAttribute(INSTANCE_ATTRIBUTE);
    }
  }

  private prune(): void {
    for (const id of this.instances.keys()) this.getElement(id);
  }

  private eligible(element: Element): element is HTMLElement {
    const view = this.options.document.defaultView;
    return (
      !!view &&
      element instanceof view.HTMLElement &&
      element.isConnected &&
      element.ownerDocument === this.options.document &&
      element.getRootNode() === this.options.document &&
      !this.options.blocked(element)
    );
  }

  private identity(element: HTMLElement, scope = false): LocatorIdentity {
    const attributes: Record<string, string> = {};
    for (const name of IDENTITY_ATTRIBUTES) {
      const value = element.getAttribute(name);
      if (value) attributes[name] = value;
    }
    const identity: LocatorIdentity = {
      tagName: element.tagName.toLowerCase(),
      attributes,
    };
    if (scope) {
      // Repeated row actions often have no label/ID on their container. Keep
      // sibling business text as a constraint, including in local fingerprints,
      // so a virtualized DOM slot cannot silently become another entity.
      if (element.matches(SEMANTIC_ROW_SELECTOR))
        identity.text = this.text(element, true);
      const heading = Array.from(element.children).find((child) =>
        /^H[1-6]$/.test(child.tagName),
      );
      if (
        this.options.document.defaultView &&
        heading instanceof this.options.document.defaultView.HTMLElement
      )
        identity.heading = this.text(heading);
    } else if (!element.matches('input, textarea, select')) {
      const text = this.text(element);
      if (text) identity.text = text;
    }
    return identity;
  }

  /** Form/editable values and blocked descendants are never locator identity. */
  private text(element: HTMLElement, segments = false): string {
    const walker = this.options.document.createTreeWalker(
      element,
      4 /* SHOW_TEXT */,
    );
    const chunks: string[] = [];
    let node = walker.nextNode();
    while (node) {
      const parent = node.parentElement;
      if (
        parent &&
        !parent.closest(
          'input, textarea, select, [contenteditable], [role="textbox"]',
        ) &&
        !this.options.blocked(parent)
      ) {
        chunks.push(node.textContent ?? '');
      }
      node = walker.nextNode();
    }
    // Preserve segment boundaries for row identity: cells "AB"/"C" must not
    // collide with "A"/"BC". Values/editable/private text remain excluded.
    return segments
      ? JSON.stringify(chunks.map(normalize).filter(Boolean))
      : normalize(chunks.join(''));
  }

  private locator(element: HTMLElement, bounded = true): PortableLocator {
    const ancestors: LocatorIdentity[] = [];
    let ancestor = element.parentElement;
    while (
      ancestor &&
      ancestor !== this.options.document.body &&
      ancestors.length < 4
    ) {
      const identity = this.identity(ancestor, true);
      if (
        Object.keys(identity.attributes).length ||
        identity.heading ||
        identity.text
      )
        ancestors.push(identity);
      ancestor = ancestor.parentElement;
    }
    const locator: PortableLocator = {
      version: 1,
      pathname: this.options.document.location.pathname,
      element: this.identity(element),
      ancestors,
    };
    return bounded ? this.boundLocator(locator) : locator;
  }

  private boundLocator(locator: PortableLocator): PortableLocator {
    let unsupported =
      !!locator.unsupportedReason || locator.pathname.length > 2048;
    const bound = (identity: LocatorIdentity): LocatorIdentity => {
      if (
        identity.tagName.length > 64 ||
        (identity.text?.length ?? 0) > 128 ||
        (identity.heading?.length ?? 0) > 128 ||
        Object.values(identity.attributes).some(
          (value) => typeof value === 'string' && value.length > 256,
        )
      )
        unsupported = true;
      return {
        ...identity,
        tagName: identity.tagName.slice(0, 64),
        attributes: Object.fromEntries(
          Object.entries(identity.attributes).map(([key, value]) => [
            key,
            typeof value === 'string' ? value.slice(0, 256) : undefined,
          ]),
        ),
        text: identity.text?.slice(0, 128),
        heading: identity.heading?.slice(0, 128),
      };
    };
    const result = {
      ...locator,
      pathname: locator.pathname.slice(0, 2048),
      element: bound(locator.element),
      ancestors: locator.ancestors.map(bound),
    };
    return {
      ...result,
      unsupportedReason: unsupported ? 'identity_too_long' : undefined,
    };
  }

  private matchesIdentity(
    element: HTMLElement,
    identity: LocatorIdentity,
    scope = false,
  ): boolean {
    if (element.tagName.toLowerCase() !== identity.tagName) return false;
    if (
      !Object.entries(identity.attributes).every(
        ([name, value]) => element.getAttribute(name) === value,
      )
    )
      return false;
    if (
      identity.text !== undefined &&
      this.text(element, scope && element.matches(SEMANTIC_ROW_SELECTOR)) !==
        identity.text
    )
      return false;
    if (identity.heading !== undefined) {
      const heading = Array.from(element.children).find((child) =>
        /^H[1-6]$/.test(child.tagName),
      );
      if (!heading || this.text(heading as HTMLElement) !== identity.heading)
        return false;
    }
    return true;
  }

  private matches(element: HTMLElement, locator: PortableLocator): boolean {
    if (!this.matchesIdentity(element, locator.element)) return false;
    let ancestor = element.parentElement;
    for (const scope of locator.ancestors) {
      while (ancestor && !this.matchesIdentity(ancestor, scope, true))
        ancestor = ancestor.parentElement;
      if (!ancestor) return false;
      ancestor = ancestor.parentElement;
    }
    return true;
  }
}
