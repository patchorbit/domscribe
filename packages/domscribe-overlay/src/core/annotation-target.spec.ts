import { RelayService } from '../services/relay-service.js';
/** @vitest-environment jsdom */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AnnotationSchema } from '@domscribe/core';
import { RuntimeManager } from '@domscribe/runtime';
import { OverlayStore } from './overlay-store.js';
import '../components/ds-element-preview.js';
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
  it('captures source-owner context after manifest lookup and labels its provenance', async () => {
    window.__DOMSCRIBE_RELAY_PORT__ = 6412;
    document.body.innerHTML =
      '<button data-ds="aB3dEf7h">Generate Token</button>';
    const owner = { recordId: 'alpha' };
    let ownerName: string | null = 'OAuth2';
    Object.defineProperty(
      document.querySelector('button'),
      '__vueParentComponent',
      { value: { type: { name: 'Wrapper' } } },
    );
    const runtime = RuntimeManager.getInstance();
    await runtime.initialize({
      adapter: {
        name: 'fixture',
        getComponentInstance: () => ({ wrapper: true }),
        resolveSourceComponent: (_element, file) =>
          file === '/app/OAuth2.vue'
            ? { component: owner, sourceFile: file }
            : null,
        captureProps: (component) => component as Record<string, unknown>,
        captureState: () => null,
        getComponentName: (component) =>
          component === owner ? ownerName : 'Wrapper',
      },
    });
    vi.spyOn(RelayService.getInstance(), 'resolve').mockResolvedValue({
      id: 'aB3dEf7h',
      file: '/app/OAuth2.vue',
      start: { line: 1, column: 0 },
    });
    const store = OverlayStore.getInstance();
    await store.selectElement(required(document.querySelector('button')));
    expect(store.getState().runtimeContext).toMatchObject({
      componentProps: { recordId: 'alpha' },
      componentIdentity: {
        name: 'OAuth2',
        sourceMatch: 'matched',
        sourceFile: '/app/OAuth2.vue',
      },
    });
    const preview = document.createElement('ds-element-preview');
    document.body.append(preview);
    await preview.updateComplete;
    expect(
      preview.shadowRoot?.querySelector('.component-name')?.textContent,
    ).toBe('OAuth2');
    ownerName = null;
    await store.selectElement(required(document.querySelector('button')));
    await preview.updateComplete;
    expect(
      store.getState().runtimeContext?.componentIdentity?.sourceMatch,
    ).toBe('matched');
    expect(preview.shadowRoot?.querySelector('.component-name')).toBeNull();
    vi.restoreAllMocks();
  });
  it('does not capture a replacement after the selected node unmounts during manifest lookup', async () => {
    window.__DOMSCRIBE_RELAY_PORT__ = 6412;
    document.body.innerHTML =
      '<button data-ds="aB3dEf7h">Generate Token</button>';
    const captureProps = vi.fn(() => ({ recordId: 'wrong' }));
    const runtime = RuntimeManager.getInstance();
    await runtime.initialize({
      adapter: {
        name: 'fixture',
        getComponentInstance: () => ({}),
        captureProps,
        captureState: () => null,
      },
    });
    let resolve!: (value: null) => void;
    vi.spyOn(RelayService.getInstance(), 'resolve').mockImplementation(
      () =>
        new Promise((done) => {
          resolve = done;
        }),
    );
    const store = OverlayStore.getInstance();
    const selection = store.selectElement(
      required(document.querySelector('button')),
    );
    document.body.innerHTML =
      '<button data-ds="aB3dEf7h">Generate Token</button>';
    resolve(null);
    await selection;
    expect(store.getState().runtimeContext).toBeNull();
    expect(captureProps).not.toHaveBeenCalled();
    await expect(store.submitAnnotation('Selected Alpha')).rejects.toThrow(
      /changed|stale/i,
    );
    vi.restoreAllMocks();
  });
});

function required<T>(value: T | null | undefined): T {
  if (value == null) throw new Error('Expected test fixture element/target');
  return value;
}
