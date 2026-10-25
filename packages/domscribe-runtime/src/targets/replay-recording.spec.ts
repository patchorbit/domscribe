/** @vitest-environment jsdom */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { RuntimeManager } from '../core/runtime-manager.js';

describe('explicit replay step recording', () => {
  let runtime: RuntimeManager;
  beforeEach(async () => {
    window.__DOMSCRIBE_RELAY_PORT__ = 6412;
    document.body.innerHTML =
      '<input name="city"><input type="password"><input type="file"><input class="private">';
    runtime = RuntimeManager.getInstance();
    await runtime.initialize({ blockSelectors: ['.private'] });
  });
  afterEach(() => {
    RuntimeManager.resetInstance();
    document.body.innerHTML = '';
  });
  it('records a portable target rather than a document-local handle', () => {
    const step = runtime.createReplayStep(document.querySelector('input')!, {
      action: 'fill',
      value: 'Austin',
    });
    expect(step).toMatchObject({
      action: 'fill',
      value: 'Austin',
      target: {
        version: 1,
        element: { tagName: 'input', attributes: { name: 'city' } },
      },
    });
    expect(JSON.stringify(step)).not.toContain('instanceId');
  });
  it('refuses password/file inputs, blocked elements and values requiring redaction', () => {
    for (const selector of [
      'input[type=password]',
      'input[type=file]',
      '.private',
    ])
      expect(() =>
        runtime.createReplayStep(document.querySelector(selector)!, {
          action: 'fill',
          value: 'private value',
        }),
      ).toThrow();
    expect(() =>
      runtime.createReplayStep(document.querySelector('input')!, {
        action: 'fill',
        value: 'person@example.com',
      }),
    ).toThrow();
  });
});
