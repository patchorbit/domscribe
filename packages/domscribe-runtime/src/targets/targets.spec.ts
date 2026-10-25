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
    const lyra = runtime.describeTarget(document.querySelector('button')!)!;
    const selected = await runtime.queryTargets({
      instanceId: lyra.instanceId,
    });
    expect(selected.status).toBe('resolved');
    expect(
      selected.targets[0].locator.ancestors[0].attributes['aria-label'],
    ).toBe('Lyra');
  });
  it('preserves handles through sorting but refuses detached or recycled targets', async () => {
    const button = document.querySelector('button')!;
    const target = runtime.describeTarget(button)!;
    document.querySelector('main')!.append(button.parentElement!);
    expect(
      (await runtime.queryTargets({ instanceId: target.instanceId })).status,
    ).toBe('resolved');
    button.parentElement!.setAttribute('aria-label', 'Orion');
    expect(
      (await runtime.queryTargets({ instanceId: target.instanceId })).status,
    ).toBe('stale');
    const replacement = runtime.describeTarget(button)!;
    expect(replacement.instanceId).not.toBe(target.instanceId);
    button.remove();
    expect(
      (await runtime.queryTargets({ instanceId: replacement.instanceId }))
        .status,
    ).toBe('stale');
  });
  it('resolves a serialized locator after a fresh runtime and reordered DOM', async () => {
    const old = runtime.describeTarget(document.querySelector('button')!)!;
    const locator = JSON.parse(JSON.stringify(old.locator));
    RuntimeManager.resetInstance();
    fixture();
    document
      .querySelector('main')!
      .prepend(document.querySelectorAll('article')[1]);
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
    const locator = runtime.describeTarget(
      document.querySelector('button')!,
    )!.locator;
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
      runtime.describeTarget(document.querySelector('button')!),
    ).toBeNull();
    const list = await runtime.queryTargets({ mode: 'list' });
    expect(list.targets).toHaveLength(2);
    expect(JSON.stringify(list)).not.toContain('person@example.com');
    expect(JSON.stringify(list)).not.toContain('secret input value');
    expect(
      (await runtime.queryTargets({ locator: list.targets[0].locator })).status,
    ).toBe('not_found');
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
    const button = document.querySelector('button')!;
    const old = runtime.describeTarget(button)!;
    button.remove();
    await new Promise((resolve) => setTimeout(resolve, 0));
    document.querySelector('article')!.append(button);
    expect(
      (await runtime.queryTargets({ instanceId: old.instanceId })).status,
    ).toBe('stale');
  });
  it('retires a handle when the source identity of a reused node changes', async () => {
    window.__DOMSCRIBE_RELAY_PORT__ = 6412;
    fixture();
    const runtime = RuntimeManager.getInstance();
    await runtime.initialize();
    const button = document.querySelector('button')!;
    const old = runtime.describeTarget(button)!;
    button.setAttribute('data-ds', 'nEw1d123');
    expect(
      (await runtime.queryTargets({ instanceId: old.instanceId })).status,
    ).toBe('stale');
  });
});
