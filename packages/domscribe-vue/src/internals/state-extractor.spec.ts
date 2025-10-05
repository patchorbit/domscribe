import { describe, it, expect, vi } from 'vitest';
import { extractState } from './state-extractor.js';
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

describe('state-extractor', () => {
  describe('extractState', () => {
    describe('Composition API (setupState)', () => {
      it('should extract setupState from function component', () => {
        const instance = createMockInstance({
          type: { setup: () => {
            //
          } },
          setupState: { count: 0, name: 'test' },
        });

        const result = extractState(instance);

        expect(result.success).toBe(true);
        expect(result.state).toEqual({ count: 0, name: 'test' });
      });

      it('should extract setupState when present even without setup function', () => {
        const instance = createMockInstance({
          type: { name: 'Component' },
          setupState: { count: 5 },
        });

        const result = extractState(instance);

        expect(result.success).toBe(true);
        expect(result.state).toEqual({ count: 5 });
      });

      it('should skip internal keys in setupState', () => {
        const instance = createMockInstance({
          type: { setup: () => {
            //
          } },
          setupState: {
            count: 0,
            _private: 'hidden',
            $special: 'internal',
            __internal: 'skip',
          },
        });

        const result = extractState(instance);

        expect(result.success).toBe(true);
        expect(result.state).toEqual({ count: 0 });
      });

      it('should skip functions in setupState', () => {
        const instance = createMockInstance({
          type: { setup: () => {
            //
          } },
          setupState: {
            count: 0,
            increment: () => {
              //
            },
            computedValue: vi.fn(),
          },
        });

        const result = extractState(instance);

        expect(result.success).toBe(true);
        expect(result.state).toEqual({ count: 0 });
      });

      it('should skip Vue internal state keys', () => {
        const instance = createMockInstance({
          type: { setup: () => {
            //
          } },
          setupState: {
            count: 0,
            __v_isRef: true,
            __v_isShallow: false,
            __v_isReadonly: false,
            __v_raw: {},
            __v_skip: true,
          },
        });

        const result = extractState(instance);

        expect(result.success).toBe(true);
        expect(result.state).toEqual({ count: 0 });
      });
    });

    describe('Options API (data)', () => {
      it('should extract data from Options API component', () => {
        const instance = createMockInstance({
          type: { data: () => ({}) },
          data: { message: 'hello', visible: true },
        });

        const result = extractState(instance);

        expect(result.success).toBe(true);
        expect(result.state).toEqual({ message: 'hello', visible: true });
      });

      it('should extract data when present even without data function on type', () => {
        const instance = createMockInstance({
          type: { name: 'Component' },
          data: { message: 'hello' },
        });

        const result = extractState(instance);

        expect(result.success).toBe(true);
        expect(result.state).toEqual({ message: 'hello' });
      });

      it('should skip internal keys in data', () => {
        const instance = createMockInstance({
          type: { data: () => ({}) },
          data: {
            message: 'hello',
            _internal: 'hidden',
            $computed: 'skip',
          },
        });

        const result = extractState(instance);

        expect(result.success).toBe(true);
        expect(result.state).toEqual({ message: 'hello' });
      });
    });

    describe('mixed Composition + Options API', () => {
      it('should merge setupState and data', () => {
        const instance = createMockInstance({
          type: { setup: () => {
            //
          }, data: () => ({}) },
          setupState: { count: 0 },
          data: { message: 'hello' },
        });

        const result = extractState(instance);

        expect(result.success).toBe(true);
        expect(result.state).toEqual({ count: 0, message: 'hello' });
      });
    });

    describe('ctx fallback', () => {
      it('should extract from ctx when setupState and data are empty', () => {
        const instance = createMockInstance({
          type: { name: 'Component' },
          setupState: {},
          data: {},
          ctx: { greeting: 'hi', count: 10 },
        });

        const result = extractState(instance);

        expect(result.success).toBe(true);
        expect(result.state).toEqual({ greeting: 'hi', count: 10 });
      });

      it('should skip private and built-in keys in ctx', () => {
        const instance = createMockInstance({
          type: { name: 'Component' },
          setupState: {},
          data: {},
          ctx: {
            greeting: 'hi',
            _internal: 'skip',
            $ref: 'skip',
            props: 'skip',
            attrs: 'skip',
            slots: 'skip',
            emit: 'skip',
            expose: 'skip',
            forceUpdate: 'skip',
            nextTick: 'skip',
          },
        });

        const result = extractState(instance);

        expect(result.success).toBe(true);
        expect(result.state).toEqual({ greeting: 'hi' });
      });

      it('should skip functions in ctx', () => {
        const instance = createMockInstance({
          type: { name: 'Component' },
          setupState: {},
          data: {},
          ctx: {
            greeting: 'hi',
            handleClick: () => {
              //
            },
          },
        });

        const result = extractState(instance);

        expect(result.success).toBe(true);
        expect(result.state).toEqual({ greeting: 'hi' });
      });

      it('should not use ctx fallback when setupState has data', () => {
        const instance = createMockInstance({
          type: { setup: () => {
            //
          } },
          setupState: { count: 0 },
          data: {},
          ctx: { ctxValue: 'should-not-appear' },
        });

        const result = extractState(instance);

        expect(result.success).toBe(true);
        expect(result.state).toEqual({ count: 0 });
      });
    });

    describe('ref unwrapping', () => {
      it('should unwrap Vue refs in state', () => {
        const instance = createMockInstance({
          type: { setup: () => {
            //
          } },
          setupState: {
            count: { __v_isRef: true, value: 42 },
          },
        });

        const result = extractState(instance);

        expect(result.success).toBe(true);
        expect(result.state).toEqual({ count: 42 });
      });

      it('should unwrap nested refs', () => {
        const instance = createMockInstance({
          type: { setup: () => {
            //
          } },
          setupState: {
            config: {
              enabled: { __v_isRef: true, value: true },
              label: 'test',
            },
          },
        });

        const result = extractState(instance);

        expect(result.success).toBe(true);
        expect(result.state).toEqual({
          config: { enabled: true, label: 'test' },
        });
      });

      it('should skip __v_ and __V_ prefixed keys during unwrapping', () => {
        const instance = createMockInstance({
          type: { setup: () => {
            //
          } },
          setupState: {
            data: {
              __v_isReactive: true,
              __V_skip: true,
              name: 'test',
            },
          },
        });

        const result = extractState(instance);

        expect(result.success).toBe(true);
        expect(result.state).toEqual({ data: { name: 'test' } });
      });

      it('should unwrap refs in arrays', () => {
        const instance = createMockInstance({
          type: { setup: () => {
            //
          } },
          setupState: {
            items: [{ __v_isRef: true, value: 'a' }, 'b'],
          },
        });

        const result = extractState(instance);

        expect(result.success).toBe(true);
        expect(result.state).toEqual({ items: ['a', 'b'] });
      });
    });

    describe('empty state', () => {
      it('should return empty state when all sources are empty', () => {
        const instance = createMockInstance({
          type: { name: 'Component' },
          setupState: {},
          data: {},
          ctx: {},
        });

        const result = extractState(instance);

        expect(result.success).toBe(true);
        expect(result.state).toEqual({});
      });
    });

    describe('error handling', () => {
      it('should handle errors gracefully', () => {
        const instance = createMockInstance({
          type: { setup: () => {
            //
          } },
        });
        Object.defineProperty(instance, 'setupState', {
          get() {
            throw new Error('access error');
          },
        });

        const result = extractState(instance);

        expect(result.success).toBe(false);
        expect(result.error).toBeDefined();
      });
    });
  });
});
