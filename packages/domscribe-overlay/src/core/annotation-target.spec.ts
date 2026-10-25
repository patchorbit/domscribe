import { RelayService } from '../services/relay-service.js';
/** @vitest-environment jsdom */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AnnotationSchema } from '@domscribe/core';
import { RuntimeManager } from '@domscribe/runtime';
import { OverlayStore } from './overlay-store.js';
function annotation(selectedElement: Record<string, unknown>) {
  return AnnotationSchema.parse({
    metadata: {
      id: 'ann_AbCdEfGh_1234567890123',
      timestamp: new Date().toISOString(),
      mode: 'element-click',
      status: 'queued',
    },
    mode: 'element-click',
    interaction: { type: 'element-annotation', selectedElement },
    context: {
      pageUrl: 'http://localhost/',
      pageTitle: 'Test',
      viewport: { width: 1280, height: 900 },
      userAgent: 'test',
    },
  });
}
describe('annotation target resolution', () => {
  afterEach(() => {
    RuntimeManager.resetInstance();
    OverlayStore.resetInstance();
    document.body.innerHTML = '';
  });
  it('locates the recorded repeated instance after runtime reset and row reordering', async () => {
    window.__DOMSCRIBE_RELAY_PORT__ = 6412;
    document.body.innerHTML =
      '<article aria-label="Lyra"><button data-ds="aB3dEf7h">Edit</button></article><article aria-label="Vega"><button data-ds="aB3dEf7h">Edit</button></article>';
    let runtime = RuntimeManager.getInstance();
    await runtime.initialize();
    const target = required(
      runtime.describeTarget(required(document.querySelector('button'))),
    );
    const saved = annotation({
      tagName: 'button',
      selector: '[data-ds="aB3dEf7h"]',
      dataDs: 'aB3dEf7h',
      target,
    });
    RuntimeManager.resetInstance();
    document.body.innerHTML =
      '<article aria-label="Vega"><button data-ds="aB3dEf7h">Edit</button></article><article aria-label="Lyra"><button data-ds="aB3dEf7h">Edit</button></article>';
    runtime = RuntimeManager.getInstance();
    await runtime.initialize();
    for (const element of document.querySelectorAll('button'))
      element.scrollIntoView = () => {
        /* jsdom has no layout scrolling */
      };
    expect(
      OverlayStore.getInstance()
        .locateElement(saved)
        ?.closest('article')
        ?.getAttribute('aria-label'),
    ).toBe('Lyra');
  });
  it('does not fall back to the first source match for a legacy ambiguous annotation', () => {
    document.body.innerHTML =
      '<button data-ds="aB3dEf7h">Wrong</button><button data-ds="aB3dEf7h">Right</button>';
    for (const element of document.querySelectorAll('button'))
      element.scrollIntoView = () => {
        /* jsdom has no layout scrolling */
      };
    const saved = annotation({
      tagName: 'button',
      selector: 'button:nth-of-type(2)',
      dataDs: 'aB3dEf7h',
    });
    expect(OverlayStore.getInstance().locateElement(saved)).toBeNull();
  });
  it('refuses to submit a selection whose row identity was recycled after selection', async () => {
    window.__DOMSCRIBE_RELAY_PORT__ = 6412;
    document.body.innerHTML =
      '<article aria-label="Lyra"><button data-ds="aB3dEf7h">Edit</button></article>';
    const runtime = RuntimeManager.getInstance();
    await runtime.initialize();
    const relay = RelayService.getInstance();
    vi.spyOn(relay, 'resolve').mockResolvedValue(null);
    const create = vi
      .spyOn(relay, 'createAnnotation')
      .mockResolvedValue(annotation({ tagName: 'button', selector: 'button' }));
    const store = OverlayStore.getInstance();
    await store.selectElement(required(document.querySelector('button')));
    required(document.querySelector('article')).setAttribute(
      'aria-label',
      'Vega',
    );
    await expect(store.submitAnnotation('Change Lyra')).rejects.toThrow(
      /changed|stale/i,
    );
    expect(create).not.toHaveBeenCalled();
    vi.restoreAllMocks();
  });
});

function required<T>(value: T | null | undefined): T {
  if (value == null) throw new Error('Expected test fixture element/target');
  return value;
}
