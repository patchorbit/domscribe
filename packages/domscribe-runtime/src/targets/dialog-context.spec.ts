/** @vitest-environment jsdom */
import { afterEach, describe, expect, it } from 'vitest';
import { TargetRegistry } from './target-registry.js';

let registry: TargetRegistry;
afterEach(() => {
  registry?.dispose();
  document.body.replaceChildren();
});
function setup(html: string) {
  document.body.innerHTML = html;
  registry = new TargetRegistry({
    document,
    blocked: () => false,
    redact: true,
  });
  return document.querySelector('button')!;
}
describe('portable identity across reused dialogs', () => {
  it.each(['role="dialog"', 'role="alertdialog"', 'aria-modal="true"'])(
    'refuses unscoped %s even with an unchanged label',
    (attributes) => {
      const button = setup(
        `<section ${attributes} aria-label="Authorization"><button>Generate Token</button></section>`,
      );
      const target = registry.describe(button)!;
      expect(target.locator.unsupportedReason).toBe('context_required');
      expect(registry.query({ locator: target.locator })).toMatchObject({
        status: 'unsupported',
        reason: 'context_required',
        total: 0,
      });
      expect(registry.query({ instanceId: target.instanceId }).status).toBe(
        'resolved',
      );
    },
  );
  it('binds the business context and invalidates a retained DOM handle when it changes', () => {
    const button = setup(
      '<dialog open data-ds-context="collection:alpha"><button>Generate Token</button></dialog>',
    );
    const alpha = registry.describe(button)!;
    expect(registry.query({ locator: alpha.locator }).status).toBe('resolved');
    button.parentElement!.setAttribute('data-ds-context', 'collection:beta');
    expect(registry.query({ locator: alpha.locator }).status).toBe('not_found');
    expect(registry.query({ instanceId: alpha.instanceId }).status).toBe(
      'stale',
    );
  });
  it('refuses a legacy locator even when the new dialog supplies a context key', () => {
    const button = setup(
      '<dialog open data-ds-context="alpha"><button>Generate Token</button></dialog>',
    );
    const legacy = registry.describe(button)!.locator;
    delete (legacy as { contexts?: string[] }).contexts;
    legacy.ancestors = [];
    expect(registry.query({ locator: legacy })).toMatchObject({
      status: 'unsupported',
      reason: 'context_required',
    });
  });
  it('does not borrow keys from siblings or an outer dialog', () => {
    const button = setup(
      '<dialog open data-ds-context="outer"><section role="dialog"><span data-ds-context="sibling"></span><button>Generate Token</button></section></dialog>',
    );
    expect(registry.describe(button)!.locator.unsupportedReason).toBe(
      'context_required',
    );
  });
  it('supports a context on the selected ancestor path inside each nested dialog', () => {
    const button = setup(
      '<dialog open data-ds-context="outer"><section role="dialog"><div data-ds-context="inner"><button>Generate Token</button></div></section></dialog>',
    );
    const target = registry.describe(button)!;
    expect(target.locator).toMatchObject({ contexts: ['inner', 'outer'] });
    expect(target.locator.unsupportedReason).toBeUndefined();
    expect(registry.query({ locator: target.locator }).status).toBe('resolved');
  });
  it('requires context when selecting the dialog itself', () => {
    setup('<dialog open><button>Generate Token</button></dialog>');
    expect(
      registry.describe(document.querySelector('dialog')!)!.locator
        .unsupportedReason,
    ).toBe('context_required');
  });
  it('redacts private context and refuses exported replay', () => {
    const button = setup(
      '<dialog open data-ds-context="person@example.com"><button>Generate Token</button></dialog>',
    );
    const target = registry.describe(button)!;
    expect(JSON.stringify(target)).not.toContain('person@example.com');
    expect(registry.query({ locator: target.locator }).status).toBe(
      'not_found',
    );
  });
  it.each(['', '   '])('refuses an empty dialog context %j', (key) => {
    const button = setup(
      `<dialog open data-ds-context="${key}"><button>Generate Token</button></dialog>`,
    );
    expect(registry.describe(button)!.locator.unsupportedReason).toBe(
      'context_required',
    );
  });
  it('bounds context keys before export and refuses overflow', () => {
    const button = setup(
      `<dialog open data-ds-context="${'a'.repeat(257)}"><button>Generate Token</button></dialog>`,
    );
    const target = registry.describe(button)!;
    expect(target.locator.contexts![0].length).toBeLessThanOrEqual(256);
    expect(target.locator.unsupportedReason).toBe('identity_too_long');
    expect(registry.query({ locator: target.locator }).status).toBe(
      'unsupported',
    );
  });
  it('refuses context-chain overflow and a changed outer business key', () => {
    const button = setup(
      '<dialog open data-ds-context="outer"><section role="dialog" data-ds-context="inner"><button>Generate Token</button></section></dialog>',
    );
    const target = registry.describe(button)!;
    document.querySelector('dialog')!.setAttribute('data-ds-context', 'other');
    expect(registry.query({ locator: target.locator }).status).toBe(
      'not_found',
    );
    const wraps = Array.from(
      { length: 5 },
      (_, i) => `<section role="dialog" data-ds-context="context:${i}">`,
    ).join('');
    document.body.innerHTML =
      wraps + '<button>Generate Token</button>' + '</section>'.repeat(5);
    const overflow = registry.describe(document.querySelector('button')!)!;
    expect(overflow.locator.contexts).toHaveLength(4);
    expect(overflow.locator.unsupportedReason).toBe('identity_too_long');
  });
});
