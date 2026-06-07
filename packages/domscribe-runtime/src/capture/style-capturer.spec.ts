/**
 * Tests for StyleCapturer
 *
 * Validates the bounded computed-style allowlist, CSS custom property
 * resolution from element through ancestors, the 4 KB serialization budget,
 * and detached-element error handling.
 *
 * @vitest-environment jsdom
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { StyleCapturer, STYLE_CAPTURE_ALLOWLIST } from './style-capturer.js';

function makeElement(html: string): HTMLElement {
  const host = document.createElement('div');
  host.innerHTML = html.trim();
  const el = host.firstElementChild as HTMLElement;
  document.body.appendChild(host);
  return el;
}

function makeStyle(css: string): HTMLStyleElement {
  const style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);
  return style;
}

describe('StyleCapturer', () => {
  let toRemove: Element[] = [];

  beforeEach(() => {
    toRemove = [];
  });

  afterEach(() => {
    for (const el of toRemove) {
      el.remove();
    }
    document.body.innerHTML = '';
    document.head.querySelectorAll('style').forEach((s) => s.remove());
  });

  describe('allowlist invariants', () => {
    it('exports a frozen allowlist of at most 32 entries', () => {
      expect(Object.isFrozen(STYLE_CAPTURE_ALLOWLIST)).toBe(true);
      expect(STYLE_CAPTURE_ALLOWLIST.length).toBeLessThanOrEqual(32);
    });

    it('orders entries deterministically (snapshot for CI stability)', () => {
      // Updating the allowlist requires updating this snapshot — the RFC
      // commits us to a fixed shape so agent prompts can rely on it.
      expect([...STYLE_CAPTURE_ALLOWLIST]).toMatchSnapshot();
    });
  });

  describe('basic capture', () => {
    it('captures computed allowlist properties for the target element', () => {
      makeStyle(`
        .box {
          display: block;
          color: rgb(15, 23, 42);
          padding: 16px;
        }
      `);
      const el = makeElement('<div class="box">box</div>');
      toRemove.push(el);

      const capturer = new StyleCapturer();
      const result = capturer.capture(el);

      expect(result.success).toBe(true);
      expect(result.data?.computed).toBeDefined();
      expect(result.data?.computed?.['display']).toBe('block');
      expect(result.data?.computed?.['color']).toBe('rgb(15, 23, 42)');
      expect(result.data?.computed?.['padding']).toBe('16px');
    });

    it('omits properties whose computed value is empty string', () => {
      const el = makeElement('<div></div>');
      toRemove.push(el);

      const capturer = new StyleCapturer({ allowlist: ['nonexistent-prop'] });
      const result = capturer.capture(el);

      expect(result.success).toBe(true);
      expect(result.data?.computed).toBeUndefined();
    });

    it('respects a custom allowlist override', () => {
      makeStyle('.tiny { color: red; }');
      const el = makeElement('<span class="tiny">x</span>');
      toRemove.push(el);

      const capturer = new StyleCapturer({ allowlist: ['color'] });
      const result = capturer.capture(el);

      expect(result.success).toBe(true);
      // Only the override property is captured.
      expect(Object.keys(result.data?.computed ?? {})).toEqual(['color']);
    });
  });

  describe('CSS custom properties', () => {
    it('resolves --* vars defined on the element', () => {
      makeStyle('.themed { --token-fg: #0f172a; }');
      const el = makeElement('<div class="themed">x</div>');
      toRemove.push(el);

      const capturer = new StyleCapturer();
      const result = capturer.capture(el);

      expect(result.success).toBe(true);
      expect(result.data?.customProperties?.['--token-fg']).toBe('#0f172a');
    });

    it('walks ancestors so :root tokens are visible at a leaf', () => {
      makeStyle(`
        :root { --color-fg: rgb(15, 23, 42); }
        .leaf { color: var(--color-fg); }
      `);
      const root = makeElement('<div><span class="leaf">x</span></div>');
      const leaf = root.querySelector('.leaf') as HTMLElement;
      toRemove.push(root);

      const capturer = new StyleCapturer();
      const result = capturer.capture(leaf);

      expect(result.success).toBe(true);
      expect(result.data?.customProperties?.['--color-fg']).toBeDefined();
    });

    it('caps custom properties at maxCustomProperties', () => {
      // Define many tokens; cap at 3.
      const css = [':root {'];
      for (let i = 0; i < 50; i++) {
        css.push(`  --t${i}: ${i}px;`);
      }
      css.push('}');
      makeStyle(css.join('\n'));

      const el = makeElement('<div>x</div>');
      toRemove.push(el);

      const capturer = new StyleCapturer({ maxCustomProperties: 3 });
      const result = capturer.capture(el);

      expect(result.success).toBe(true);
      expect(
        Object.keys(result.data?.customProperties ?? {}).length,
      ).toBeLessThanOrEqual(3);
    });
  });

  describe('serialization budget', () => {
    it('drops custom-property tail entries until payload fits maxBytes', () => {
      // Each --pad-N value is a long string; build a budget that forces drops.
      const css = [':root {'];
      const longValue = 'x'.repeat(200);
      for (let i = 0; i < 10; i++) {
        css.push(`  --pad-${i}: ${longValue};`);
      }
      css.push('}');
      makeStyle(css.join('\n'));

      const el = makeElement('<div>x</div>');
      toRemove.push(el);

      const capturer = new StyleCapturer({ maxBytes: 512 });
      const result = capturer.capture(el);

      expect(result.success).toBe(true);
      const serializedLength = JSON.stringify(result.data).length;
      expect(serializedLength).toBeLessThanOrEqual(512);
    });

    it('preserves computed allowlist values even when over budget', () => {
      // Tighter budget than even the computed section alone — the trimming
      // strategy never drops allowlist values, so the result will exceed the
      // budget. This is the explicit RFC tradeoff: the allowlist is the
      // ground truth.
      makeStyle(`
        .box { display: block; color: red; padding: 16px; }
      `);
      const el = makeElement('<div class="box">x</div>');
      toRemove.push(el);

      const capturer = new StyleCapturer({ maxBytes: 32 });
      const result = capturer.capture(el);

      expect(result.success).toBe(true);
      expect(result.data?.computed).toBeDefined();
    });

    it('disables budget enforcement when maxBytes is 0', () => {
      makeStyle(':root { --giant: ' + 'a'.repeat(5000) + '; }');
      const el = makeElement('<div>x</div>');
      toRemove.push(el);

      const capturer = new StyleCapturer({ maxBytes: 0 });
      const result = capturer.capture(el);

      expect(result.success).toBe(true);
      expect(JSON.stringify(result.data).length).toBeGreaterThan(4096);
    });
  });

  describe('error handling', () => {
    it('returns a CaptureResult error for a detached element with no owner window', () => {
      const detached = document.createElement('div');
      // Simulate a fully detached node: clobber ownerDocument.
      Object.defineProperty(detached, 'ownerDocument', { value: null });

      const capturer = new StyleCapturer();
      const result = capturer.capture(detached);

      expect(result.success).toBe(false);
      expect(result.error?.message).toMatch(/no owner window/i);
    });
  });
});
