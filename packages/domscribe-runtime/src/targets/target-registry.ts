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
      if (records.length) this.prune();
    });
    this.observer.observe(options.document, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: [...IDENTITY_ATTRIBUTES, 'data-ds'],
    });
  }

  private fingerprint(element: HTMLElement): string {
    return JSON.stringify({
      locator: this.locator(element),
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
      this.instances.delete(instanceId);
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
      locator: (this.options.redact
        ? redactPII(rawLocator)
        : rawLocator) as PortableLocator,
      disabled: element.matches(':disabled, [aria-disabled="true"]'),
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
      this.instances.delete(instanceId);
      if (element && this.handles.get(element) === instanceId) {
        this.handles.delete(element);
        element.removeAttribute(INSTANCE_ATTRIBUTE);
      }
      return null;
    }
    return element;
  }

  dispose(): void {
    this.observer.disconnect();
    for (const [id, instance] of this.instances) {
      const element = instance.element.deref();
      if (element?.getAttribute(INSTANCE_ATTRIBUTE) === id)
        element.removeAttribute(INSTANCE_ATTRIBUTE);
    }
    this.instances.clear();
    this.handles = new WeakMap();
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
      if (value) attributes[name] = value.slice(0, 256);
    }
    const identity: LocatorIdentity = {
      tagName: element.tagName.toLowerCase(),
      attributes,
    };
    if (scope) {
      const heading = Array.from(element.children).find((child) =>
        /^H[1-6]$/.test(child.tagName),
      );
      if (
        this.options.document.defaultView &&
        heading instanceof this.options.document.defaultView.HTMLElement
      )
        identity.heading = this.text(heading).slice(0, 128);
    } else if (!element.matches('input, textarea, select')) {
      const text = this.text(element);
      if (text) identity.text = text.slice(0, 128);
    }
    return identity;
  }

  /** Form/editable values and blocked descendants are never locator identity. */
  private text(element: HTMLElement): string {
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
    return normalize(chunks.join(''));
  }

  private locator(element: HTMLElement): PortableLocator {
    const ancestors: LocatorIdentity[] = [];
    let ancestor = element.parentElement;
    while (
      ancestor &&
      ancestor !== this.options.document.body &&
      ancestors.length < 4
    ) {
      const identity = this.identity(ancestor, true);
      if (Object.keys(identity.attributes).length || identity.heading)
        ancestors.push(identity);
      ancestor = ancestor.parentElement;
    }
    return {
      version: 1,
      pathname: this.options.document.location.pathname,
      element: this.identity(element),
      ancestors,
    };
  }

  private matchesIdentity(
    element: HTMLElement,
    identity: LocatorIdentity,
  ): boolean {
    if (element.tagName.toLowerCase() !== identity.tagName) return false;
    if (
      !Object.entries(identity.attributes).every(
        ([name, value]) => element.getAttribute(name) === value,
      )
    )
      return false;
    if (identity.text !== undefined && this.text(element) !== identity.text)
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
      while (ancestor && !this.matchesIdentity(ancestor, scope))
        ancestor = ancestor.parentElement;
      if (!ancestor) return false;
      ancestor = ancestor.parentElement;
    }
    return true;
  }
}
