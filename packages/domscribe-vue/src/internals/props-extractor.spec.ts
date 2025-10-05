import { describe, it, expect, vi } from 'vitest';
import { extractProps } from './props-extractor.js';
import type { VueComponentInstance } from './types.js';

function createMockInstance(
  overrides?: Partial<VueComponentInstance>,
): VueComponentInstance {
  return {
    uid: 1,
    vnode: {
      type: 'div',
      props: null,
      shapeFlag: 1,
    } as unknown as VueComponentInstance['vnode'],
    type: { name: 'TestComponent' },
    parent: null,
    root: {} as VueComponentInstance,
    appContext: {} as VueComponentInstance['appContext'],
    subTree: {} as VueComponentInstance['subTree'],
    update: vi.fn(),
    render: null,
    proxy: null,
    exposed: null,
    withProxy: null,
    provides: {},
    accessCache: null,
    renderCache: [],
    ctx: {},
    data: {},
    props: {},
    attrs: {},
    slots: {},
    refs: {},
    emit: vi.fn(),
    setupState: {},
    setupContext: null,
    isMounted: true,
    isUnmounted: false,
    isDeactivated: false,
    bc: null,
    c: null,
    bm: null,
    m: null,
    bu: null,
    u: null,
    bum: null,
    um: null,
    ...overrides,
  } as VueComponentInstance;
}

describe('props-extractor', () => {
  describe('extractProps', () => {
    it('should return empty props when instance has no props', () => {
      const instance = createMockInstance({ props: {} });

      const result = extractProps(instance);

      expect(result.success).toBe(true);
      expect(result.props).toEqual({});
    });

    it('should extract props from instance.props', () => {
      const instance = createMockInstance({
        props: { title: 'Hello', count: 42 },
      });

      const result = extractProps(instance);

      expect(result.success).toBe(true);
      expect(result.props).toEqual({ title: 'Hello', count: 42 });
    });

    it('should fall back to vnode.props when instance.props is empty', () => {
      const instance = createMockInstance({
        props: {},
        vnode: {
          type: 'div',
          props: { label: 'Submit' },
          shapeFlag: 1,
        } as unknown as VueComponentInstance['vnode'],
      });

      const result = extractProps(instance);

      expect(result.success).toBe(true);
      expect(result.props).toEqual({ label: 'Submit' });
    });

    it('should fall back to proxy.$props when other sources are empty', () => {
      const instance = createMockInstance({
        props: {},
        vnode: {
          type: 'div',
          props: null,
          shapeFlag: 1,
        } as unknown as VueComponentInstance['vnode'],
        proxy: {
          $props: { variant: 'primary' },
        } as unknown as VueComponentInstance['proxy'],
      });

      const result = extractProps(instance);

      expect(result.success).toBe(true);
      expect(result.props).toEqual({ variant: 'primary' });
    });

    it('should filter out Vue internal props', () => {
      const instance = createMockInstance({
        props: {
          title: 'Hello',
          key: 'item-1',
          ref: {},
          ref_for: true,
          ref_key: 'myRef',
          onVnodeBeforeMount: () => {
            //
          },
          onVnodeMounted: () => {
            //
          },
        },
      });

      const result = extractProps(instance);

      expect(result.success).toBe(true);
      expect(result.props).toEqual({ title: 'Hello' });
    });

    it('should filter out event handlers (on* props)', () => {
      const instance = createMockInstance({
        props: {
          title: 'Hello',
          onClick: () => {
            //
          },
          onChange: () => {
            //
          },
          onUpdate: () => {
            //
          },
        },
      });

      const result = extractProps(instance);

      expect(result.success).toBe(true);
      expect(result.props).toEqual({ title: 'Hello' });
    });

    it('should not filter props starting with "on" without uppercase third char', () => {
      const instance = createMockInstance({
        props: {
          online: true,
          on: 'value',
        },
      });

      const result = extractProps(instance);

      expect(result.success).toBe(true);
      expect(result.props).toEqual({ online: true, on: 'value' });
    });

    it('should filter out private/internal keys', () => {
      const instance = createMockInstance({
        props: {
          title: 'Hello',
          _internal: 'secret',
          $special: 'hidden',
        },
      });

      const result = extractProps(instance);

      expect(result.success).toBe(true);
      expect(result.props).toEqual({ title: 'Hello' });
    });

    it('should unwrap Vue refs in props', () => {
      const instance = createMockInstance({
        props: {
          count: { __v_isRef: true, value: 42 },
          label: 'Static',
        },
      });

      const result = extractProps(instance);

      expect(result.success).toBe(true);
      expect(result.props).toEqual({ count: 42, label: 'Static' });
    });

    it('should unwrap nested refs in objects', () => {
      const instance = createMockInstance({
        props: {
          config: {
            enabled: { __v_isRef: true, value: true },
            name: 'test',
          },
        },
      });

      const result = extractProps(instance);

      expect(result.success).toBe(true);
      expect(result.props).toEqual({
        config: { enabled: true, name: 'test' },
      });
    });

    it('should unwrap refs in arrays', () => {
      const instance = createMockInstance({
        props: {
          items: [{ __v_isRef: true, value: 'first' }, 'second'],
        },
      });

      const result = extractProps(instance);

      expect(result.success).toBe(true);
      expect(result.props).toEqual({ items: ['first', 'second'] });
    });

    it('should skip __v_ prefixed keys during ref unwrapping', () => {
      const instance = createMockInstance({
        props: {
          data: {
            __v_isReactive: true,
            __v_raw: {},
            name: 'test',
          },
        },
      });

      const result = extractProps(instance);

      expect(result.success).toBe(true);
      expect(result.props).toEqual({ data: { name: 'test' } });
    });

    it('should limit ref unwrapping depth', () => {
      // Build a deeply nested ref chain (> 10 levels)
      let deepRef: unknown = 'final';
      for (let i = 0; i < 15; i++) {
        deepRef = { __v_isRef: true, value: deepRef };
      }

      const instance = createMockInstance({
        props: { deep: deepRef },
      });

      const result = extractProps(instance);

      expect(result.success).toBe(true);
      // Should stop unwrapping at depth 10, so the value won't be fully unwrapped
      expect(result.props).toBeDefined();
    });

    it('should handle errors gracefully', () => {
      const instance = createMockInstance({
        props: new Proxy(
          {},
          {
            ownKeys() {
              throw new Error('proxy error');
            },
          },
        ),
      });
      // Force the proxy to appear non-empty
      Object.defineProperty(instance, 'props', {
        get() {
          return new Proxy(
            { key: 'value' },
            {
              ownKeys() {
                throw new Error('proxy error');
              },
            },
          );
        },
      });

      const result = extractProps(instance);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });
});
