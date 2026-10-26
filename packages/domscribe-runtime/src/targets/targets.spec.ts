/** @vitest-environment jsdom */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { RuntimeManager } from '../core/runtime-manager.js';
const fixture = () => {
  document.body.innerHTML =
    '<main><article aria-label="Lyra"><button data-ds="aB3dEf7h">Edit</button></article><article aria-label="Vega"><button data-ds="aB3dEf7h">Edit</button></article></main>';
};
describe('strict runtime targets', () => {
  let runtime: RuntimeManager;
  beforeEach(async () => {
    window.__DOMSCRIBE_RELAY_PORT__ = 6412;
    fixture();
    runtime = RuntimeManager.getInstance();
    await runtime.initialize();
  });
  afterEach(() => {
    RuntimeManager.resetInstance();
    document.body.innerHTML = '';
    window.history.replaceState({}, '', '/');
  });
  it('lists repeated source instances and captures only the selected instance', async () => {
    const result = await runtime.queryTargets({ entryId: 'aB3dEf7h' });
    expect(result.status).toBe('ambiguous');
    expect(result.targets).toHaveLength(2);
    expect(result.context).toBeUndefined();
    const lyra = required(
      runtime.describeTarget(required(document.querySelector('button'))),
    );
    const selected = await runtime.queryTargets({
      instanceId: lyra.instanceId,
    });
    expect(selected.status).toBe('resolved');
    expect(
      selected.targets[0].locator.ancestors[0].attributes['aria-label'],
    ).toBe('Lyra');
  });
  it('preserves handles through sorting but refuses detached or recycled targets', async () => {
    const button = required(document.querySelector('button'));
    const target = required(runtime.describeTarget(button));
    required(document.querySelector('main')).append(
      required(button.parentElement),
    );
    expect(
      (await runtime.queryTargets({ instanceId: target.instanceId })).status,
    ).toBe('resolved');
    required(button.parentElement).setAttribute('aria-label', 'Orion');
    expect(
      (await runtime.queryTargets({ instanceId: target.instanceId })).status,
    ).toBe('stale');
    const replacement = required(runtime.describeTarget(button));
    expect(replacement.instanceId).not.toBe(target.instanceId);
    button.remove();
    expect(
      (await runtime.queryTargets({ instanceId: replacement.instanceId }))
        .status,
    ).toBe('stale');
  });
  it('resolves a serialized locator after a fresh runtime and reordered DOM', async () => {
    const old = required(
      runtime.describeTarget(required(document.querySelector('button'))),
    );
    const locator = JSON.parse(JSON.stringify(old.locator));
    RuntimeManager.resetInstance();
    fixture();
    required(document.querySelector('main')).prepend(
      document.querySelectorAll('article')[1],
    );
    runtime = RuntimeManager.getInstance();
    await runtime.initialize();
    expect(
      (await runtime.queryTargets({ instanceId: old.instanceId })).status,
    ).toBe('stale');
    const result = await runtime.queryTargets({ locator });
    expect(result.status).toBe('resolved');
    expect(result.targets[0].instanceId).not.toBe(old.instanceId);
    expect(
      document
        .querySelector(result.targets[0].selector)
        ?.closest('article')
        ?.getAttribute('aria-label'),
    ).toBe('Lyra');
  });
  it('refuses duplicate scope identities and changed routes instead of guessing by position', async () => {
    const locator = required(
      runtime.describeTarget(required(document.querySelector('button'))),
    ).locator;
    document.querySelectorAll('article')[1].setAttribute('aria-label', 'Lyra');
    expect((await runtime.queryTargets({ locator })).status).toBe('ambiguous');
    window.history.replaceState({}, '', '/other');
    expect((await runtime.queryTargets({ locator })).status).toBe('wrong_page');
  });
  it('does not return blocked elements, form values or unredacted private locator text', async () => {
    document.body.innerHTML =
      '<section class="private"><button data-ds="aB3dEf7h">Hidden</button></section><button data-ds="bB3dEf7h">person@example.com</button><input data-ds="cB3dEf7h" value="secret input value">';
    await runtime.initialize({ blockSelectors: ['.private'] });
    expect(
      runtime.describeTarget(required(document.querySelector('button'))),
    ).toBeNull();
    const list = await runtime.queryTargets({ mode: 'list' });
    expect(list.targets).toHaveLength(2);
    expect(JSON.stringify(list)).not.toContain('person@example.com');
    expect(JSON.stringify(list)).not.toContain('secret input value');
    expect(
      (await runtime.queryTargets({ locator: list.targets[0].locator })).status,
    ).toBe('not_found');
  });
  it('does not derive locator text from editable or blocked descendants', async () => {
    document.body.innerHTML =
      '<label data-ds="aB3dEf7h">Notes<textarea>private textarea value</textarea></label><div data-ds="bB3dEf7h">Public<span class="private">private child text</span></div>';
    await runtime.initialize({ blockSelectors: ['.private'] });
    const result = await runtime.queryTargets({ mode: 'list' });
    expect(JSON.stringify(result)).not.toContain('private textarea value');
    expect(JSON.stringify(result)).not.toContain('private child text');
  });
  it('returns not_ready before initialization instead of throwing', async () => {
    runtime.cleanup();
    expect((await runtime.queryTargets({ mode: 'list' })).status).toBe(
      'not_ready',
    );
  });
});
describe('target lifecycle boundaries', () => {
  afterEach(() => {
    RuntimeManager.resetInstance();
    document.body.innerHTML = '';
  });
  it('retires a handle after unmount even if the same node is later reinserted', async () => {
    window.__DOMSCRIBE_RELAY_PORT__ = 6412;
    fixture();
    const runtime = RuntimeManager.getInstance();
    await runtime.initialize();
    const button = required(document.querySelector('button'));
    const old = required(runtime.describeTarget(button));
    button.remove();
    await new Promise((resolve) => setTimeout(resolve, 0));
    required(document.querySelector('article')).append(button);
    expect(
      (await runtime.queryTargets({ instanceId: old.instanceId })).status,
    ).toBe('stale');
  });
  it('retires a handle when the source identity of a reused node changes', async () => {
    window.__DOMSCRIBE_RELAY_PORT__ = 6412;
    fixture();
    const runtime = RuntimeManager.getInstance();
    await runtime.initialize();
    const button = required(document.querySelector('button'));
    const old = required(runtime.describeTarget(button));
    button.setAttribute('data-ds', 'nEw1d123');
    expect(
      (await runtime.queryTargets({ instanceId: old.instanceId })).status,
    ).toBe('stale');
  });
});
describe('strict browser selector integrity', () => {
  afterEach(() => {
    RuntimeManager.resetInstance();
    document.body.innerHTML = '';
  });
  it('refuses a copied instance selector rather than letting browser actions select another node', async () => {
    window.__DOMSCRIBE_RELAY_PORT__ = 6412;
    fixture();
    const runtime = RuntimeManager.getInstance();
    await runtime.initialize();
    const target = required(
      runtime.describeTarget(required(document.querySelector('button'))),
    );
    document
      .querySelectorAll('button')[1]
      .setAttribute('data-ds-instance', target.instanceId);
    expect(
      (await runtime.queryTargets({ instanceId: target.instanceId })).status,
    ).toBe('stale');
  });
  it('invalidates a browser selector when only an ancestor identity attribute changes', async () => {
    window.__DOMSCRIBE_RELAY_PORT__ = 6412;
    fixture();
    const runtime = RuntimeManager.getInstance();
    await runtime.initialize();
    const target = required(
      runtime.describeTarget(required(document.querySelector('button'))),
    );
    required(document.querySelector('article')).setAttribute(
      'aria-label',
      'Orion',
    );
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(document.querySelector(target.selector)).toBeNull();
  });
});

function required<T>(value: T | null | undefined): T {
  if (value == null) throw new Error('Expected test fixture element/target');
  return value;
}

describe('semantic row identity', () => {
  afterEach(() => {
    RuntimeManager.resetInstance();
    document.body.innerHTML = '';
  });

  it('revokes a retained table button when its visible business row is recycled', async () => {
    window.__DOMSCRIBE_RELAY_PORT__ = 6412;
    document.body.innerHTML =
      '<table><tbody><tr><td>Invoice 1042</td><td><button data-ds="aB3dEf7h">Retry</button></td></tr></tbody></table>';
    const runtime = RuntimeManager.getInstance();
    await runtime.initialize();
    const button = required(document.querySelector('button'));
    const target = required(runtime.describeTarget(button));
    required(document.querySelector('td')).textContent = 'Invoice 2048';
    expect(
      (await runtime.queryTargets({ instanceId: target.instanceId })).status,
    ).toBe('stale');
    expect(document.querySelector(target.selector)).toBeNull();
  });

  it.each([
    [
      'table',
      '<table><tbody>',
      '</tbody></table>',
      '<tr><td>',
      '</td><td><button data-ds="aB3dEf7h">Edit</button></td></tr>',
    ],
    [
      'list',
      '<ul>',
      '</ul>',
      '<li><span>',
      '</span><button data-ds="aB3dEf7h">Edit</button></li>',
    ],
    [
      'ARIA row',
      '<div role="table">',
      '</div>',
      '<div role="row"><span>',
      '</span><button data-ds="aB3dEf7h">Edit</button></div>',
    ],
    [
      'ARIA list item',
      '<div role="list">',
      '</div>',
      '<div role="listitem"><span>',
      '</span><button data-ds="aB3dEf7h">Edit</button></div>',
    ],
  ])(
    'replays a %s action using sibling business text after a fresh session and reorder',
    async (_, open, close, rowOpen, rowClose) => {
      window.__DOMSCRIBE_RELAY_PORT__ = 6412;
      document.body.innerHTML =
        open +
        rowOpen +
        'Lyra' +
        rowClose +
        rowOpen +
        'Vega' +
        rowClose +
        close;
      let runtime = RuntimeManager.getInstance();
      await runtime.initialize();
      const target = required(
        runtime.describeTarget(required(document.querySelector('button'))),
      );
      const locator = JSON.parse(JSON.stringify(target.locator));
      RuntimeManager.resetInstance();
      document.body.innerHTML =
        open +
        rowOpen +
        'Vega' +
        rowClose +
        rowOpen +
        'Lyra' +
        rowClose +
        close;
      runtime = RuntimeManager.getInstance();
      await runtime.initialize();
      const result = await runtime.queryTargets({ locator });
      expect(result.status).toBe('resolved');
      expect(document.querySelector(result.targets[0].selector)).toBe(
        document.querySelectorAll('button')[1],
      );
    },
  );

  it('preserves a row handle on moves but refuses duplicate visible row identity', async () => {
    window.__DOMSCRIBE_RELAY_PORT__ = 6412;
    document.body.innerHTML =
      '<ul><li>Lyra<button data-ds="aB3dEf7h">Edit</button></li><li>Vega<button data-ds="aB3dEf7h">Edit</button></li></ul>';
    const runtime = RuntimeManager.getInstance();
    await runtime.initialize();
    const button = required(document.querySelector('button'));
    const target = required(runtime.describeTarget(button));
    required(document.querySelector('ul')).append(
      required(button.parentElement),
    );
    expect(
      (await runtime.queryTargets({ instanceId: target.instanceId })).status,
    ).toBe('resolved');
    required(document.querySelector('ul')).append(
      required(button.parentElement).cloneNode(true),
    );
    expect(
      (await runtime.queryTargets({ locator: target.locator })).status,
    ).toBe('ambiguous');
  });

  it('does not confuse row cell text that has the same concatenated value', async () => {
    window.__DOMSCRIBE_RELAY_PORT__ = 6412;
    document.body.innerHTML =
      '<table><tbody><tr><td>AB</td><td>C</td><td><button data-ds="aB3dEf7h">Edit</button></td></tr></tbody></table>';
    const runtime = RuntimeManager.getInstance();
    await runtime.initialize();
    const target = required(
      runtime.describeTarget(required(document.querySelector('button'))),
    );
    document.querySelectorAll('td')[0].textContent = 'A';
    document.querySelectorAll('td')[1].textContent = 'BC';
    expect(
      (await runtime.queryTargets({ instanceId: target.instanceId })).status,
    ).toBe('stale');
    expect(
      (await runtime.queryTargets({ locator: target.locator })).status,
    ).toBe('not_found');
  });

  it('omits private and editable row descendants and ignores form value changes', async () => {
    window.__DOMSCRIBE_RELAY_PORT__ = 6412;
    document.body.innerHTML =
      '<ul><li>Invoice 1042<span class="private">hidden billing detail</span><textarea>draft secret</textarea><span contenteditable>editable secret</span><input value="private value"><button data-ds="aB3dEf7h">Retry</button></li></ul>';
    const runtime = RuntimeManager.getInstance();
    await runtime.initialize({ blockSelectors: ['.private'] });
    const target = required(
      runtime.describeTarget(required(document.querySelector('button'))),
    );
    const serialized = JSON.stringify(target.locator);
    for (const secret of [
      'hidden billing detail',
      'draft secret',
      'editable secret',
      'private value',
    ])
      expect(serialized).not.toContain(secret);
    required(document.querySelector('input')).value = 'new private value';
    required(document.querySelector('textarea')).value = 'another draft';
    expect(
      (await runtime.queryTargets({ instanceId: target.instanceId })).status,
    ).toBe('resolved');
    expect(
      (await runtime.queryTargets({ locator: target.locator })).status,
    ).toBe('resolved');
  });

  it('redacts row identity and refuses portable replay of the redacted identity', async () => {
    window.__DOMSCRIBE_RELAY_PORT__ = 6412;
    document.body.innerHTML =
      '<ul><li>person@example.com<button data-ds="aB3dEf7h">Edit</button></li></ul>';
    const runtime = RuntimeManager.getInstance();
    await runtime.initialize();
    const target = required(
      runtime.describeTarget(required(document.querySelector('button'))),
    );
    expect(JSON.stringify(target.locator)).not.toContain('person@example.com');
    expect(
      (await runtime.queryTargets({ locator: target.locator })).status,
    ).toBe('not_found');
  });

  it('refuses over-limit row identity and invalidates changes beyond its bounded prefix', async () => {
    window.__DOMSCRIBE_RELAY_PORT__ = 6412;
    document.body.innerHTML =
      '<ul><li><span>' +
      'x'.repeat(128) +
      'A</span><button data-ds="aB3dEf7h">Edit</button></li></ul>';
    const runtime = RuntimeManager.getInstance();
    await runtime.initialize();
    const button = required(document.querySelector('button'));
    const target = required(runtime.describeTarget(button));
    expect(
      (await runtime.queryTargets({ locator: target.locator })).status,
    ).toBe('unsupported');
    expect(() =>
      runtime.createReplayStep(button, { action: 'click' }),
    ).toThrow();
    required(document.querySelector('span')).textContent =
      'x'.repeat(128) + 'B';
    expect(
      (await runtime.queryTargets({ instanceId: target.instanceId })).status,
    ).toBe('stale');
  });
});

describe('reviewed target lifecycle regressions', () => {
  afterEach(() => {
    RuntimeManager.resetInstance();
    document.body.innerHTML = '';
  });
  async function setup(html: string) {
    window.__DOMSCRIBE_RELAY_PORT__ = 6412;
    document.body.innerHTML = html;
    const runtime = RuntimeManager.getInstance();
    await runtime.initialize({ blockSelectors: ['.private'] });
    return runtime;
  }
  it('revokes every copied selector attribute when retiring an instance', async () => {
    const runtime = await setup('<button data-ds="aB3dEf7h">Edit</button>');
    const button = required(document.querySelector('button'));
    const target = required(runtime.describeTarget(button));
    document.body.append(button.cloneNode(true));
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(document.querySelectorAll(target.selector)).toHaveLength(0);
  });
  it('makes over-limit identity explicitly unsupported and still invalidates local suffix changes', async () => {
    const runtime = await setup(
      '<button data-ds="aB3dEf7h">' + 'x'.repeat(128) + 'A</button>',
    );
    const button = required(document.querySelector('button'));
    const target = required(runtime.describeTarget(button));
    expect(
      (await runtime.queryTargets({ locator: target.locator })).status,
    ).toBe('unsupported');
    expect(() =>
      runtime.createReplayStep(button, { action: 'click' }),
    ).toThrow();
    button.textContent = 'x'.repeat(128) + 'B';
    expect(
      (await runtime.queryTargets({ instanceId: target.instanceId })).status,
    ).toBe('stale');
  });
  it('revokes a pending selector when class-based privacy changes', async () => {
    const runtime = await setup('<button data-ds="aB3dEf7h">Edit</button>');
    const button = required(document.querySelector('button'));
    const target = required(runtime.describeTarget(button));
    button.className = 'private';
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(document.querySelector(target.selector)).toBeNull();
  });
  it('revokes copied selectors when synchronous re-description retires the original identity', async () => {
    const runtime = await setup('<button data-ds="aB3dEf7h">Edit</button>');
    const button = required(document.querySelector('button'));
    const old = required(runtime.describeTarget(button));
    document.body.append(button.cloneNode(true));
    button.textContent = 'Changed';
    runtime.describeTarget(button);
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(document.querySelectorAll(old.selector)).toHaveLength(0);
    runtime.cleanup();
    expect(document.querySelectorAll(old.selector)).toHaveLength(0);
  });
});
