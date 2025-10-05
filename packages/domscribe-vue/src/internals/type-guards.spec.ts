import { describe, it, expect } from 'vitest';
import {
  isRecord,
  isVueVNode,
  isVueComponentInstance,
  isVueComponentType,
  isVueDevToolsHook,
  hasVueVNode,
  isVueRef,
  isVueReactive,
  isFunctionComponent,
  isOptionsComponent,
  isHTMLElement,
} from './type-guards.js';
import type { VueComponentInstance } from './types.js';

function createMockInstance(
  overrides?: Partial<VueComponentInstance>,
): VueComponentInstance {
  return {
    uid: 1,
    vnode: {} as VueComponentInstance['vnode'],
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

describe('type-guards', () => {
  describe('isRecord', () => {
    it('should return true for plain objects', () => {
      expect(isRecord({})).toBe(true);
      expect(isRecord({ key: 'value' })).toBe(true);
    });

    it('should return false for null', () => {
      expect(isRecord(null)).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(isRecord(undefined)).toBe(false);
    });

    it('should return false for arrays', () => {
      expect(isRecord([])).toBe(false);
      expect(isRecord([1, 2, 3])).toBe(false);
    });

    it('should return false for primitives', () => {
      expect(isRecord('string')).toBe(false);
      expect(isRecord(42)).toBe(false);
      expect(isRecord(true)).toBe(false);
    });
  });

  describe('isVueVNode', () => {
    it('should return true for valid VNode', () => {
      const vnode = { type: 'div', props: {}, shapeFlag: 1 };

      expect(isVueVNode(vnode)).toBe(true);
    });

    it('should return true for VNode with null props', () => {
      const vnode = { type: 'div', props: null, shapeFlag: 1 };

      expect(isVueVNode(vnode)).toBe(true);
    });

    it('should return false for null', () => {
      expect(isVueVNode(null)).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(isVueVNode(undefined)).toBe(false);
    });

    it('should return false when type is missing', () => {
      expect(isVueVNode({ props: {}, shapeFlag: 1 })).toBe(false);
    });

    it('should return false when props is missing', () => {
      expect(isVueVNode({ type: 'div', shapeFlag: 1 })).toBe(false);
    });

    it('should return false when shapeFlag is missing', () => {
      expect(isVueVNode({ type: 'div', props: {} })).toBe(false);
    });

    it('should return false when shapeFlag is not a number', () => {
      expect(isVueVNode({ type: 'div', props: {}, shapeFlag: 'string' })).toBe(
        false,
      );
    });
  });

  describe('isVueComponentInstance', () => {
    it('should return true for valid component instance', () => {
      const instance = {
        uid: 1,
        vnode: {},
        type: {},
        proxy: null,
        setupState: {},
      };

      expect(isVueComponentInstance(instance)).toBe(true);
    });

    it('should return false for null', () => {
      expect(isVueComponentInstance(null)).toBe(false);
    });

    it('should return false for non-object', () => {
      expect(isVueComponentInstance('string')).toBe(false);
    });

    it('should return false when uid is missing', () => {
      expect(
        isVueComponentInstance({
          vnode: {},
          type: {},
          proxy: null,
          setupState: {},
        }),
      ).toBe(false);
    });

    it('should return false when uid is not a number', () => {
      expect(
        isVueComponentInstance({
          uid: 'string',
          vnode: {},
          type: {},
          proxy: null,
          setupState: {},
        }),
      ).toBe(false);
    });

    it('should return false when vnode is missing', () => {
      expect(
        isVueComponentInstance({
          uid: 1,
          type: {},
          proxy: null,
          setupState: {},
        }),
      ).toBe(false);
    });

    it('should return false when setupState is missing', () => {
      expect(
        isVueComponentInstance({ uid: 1, vnode: {}, type: {}, proxy: null }),
      ).toBe(false);
    });
  });

  describe('isVueComponentType', () => {
    it('should return true for component with setup', () => {
      expect(isVueComponentType({ setup: () => {
        //
      } })).toBe(true);
    });

    it('should return true for component with render', () => {
      expect(isVueComponentType({ render: () => {
        //
      } })).toBe(true);
    });

    it('should return true for component with template', () => {
      expect(isVueComponentType({ template: '<div></div>' })).toBe(true);
    });

    it('should return true for component with name', () => {
      expect(isVueComponentType({ name: 'MyComponent' })).toBe(true);
    });

    it('should return true for component with __name', () => {
      expect(isVueComponentType({ __name: 'MyComponent' })).toBe(true);
    });

    it('should return false for null', () => {
      expect(isVueComponentType(null)).toBe(false);
    });

    it('should return false for empty object', () => {
      expect(isVueComponentType({})).toBe(false);
    });

    it('should return false for non-object', () => {
      expect(isVueComponentType('string')).toBe(false);
    });
  });

  describe('isVueDevToolsHook', () => {
    it('should return true for valid DevTools hook', () => {
      const hook = {
        apps: new Map(),
        on: vi.fn(),
        emit: vi.fn(),
      };

      expect(isVueDevToolsHook(hook)).toBe(true);
    });

    it('should return false for null', () => {
      expect(isVueDevToolsHook(null)).toBe(false);
    });

    it('should return false for non-object', () => {
      expect(isVueDevToolsHook('string')).toBe(false);
    });

    it('should return false when apps is missing', () => {
      expect(isVueDevToolsHook({ on: vi.fn(), emit: vi.fn() })).toBe(false);
    });

    it('should return false when on is not a function', () => {
      expect(
        isVueDevToolsHook({ apps: new Map(), on: 'not-fn', emit: vi.fn() }),
      ).toBe(false);
    });

    it('should return false when emit is not a function', () => {
      expect(
        isVueDevToolsHook({ apps: new Map(), on: vi.fn(), emit: 'not-fn' }),
      ).toBe(false);
    });
  });

  describe('hasVueVNode', () => {
    it('should return true when element has __vnode', () => {
      const element = { __vnode: {} } as unknown as HTMLElement;

      expect(hasVueVNode(element)).toBe(true);
    });

    it('should return true when element has __vueParentComponent', () => {
      const element = {
        __vueParentComponent: {},
      } as unknown as HTMLElement;

      expect(hasVueVNode(element)).toBe(true);
    });

    it('should return false when element has neither', () => {
      const element = { className: 'test' } as unknown as HTMLElement;

      expect(hasVueVNode(element)).toBe(false);
    });
  });

  describe('isVueRef', () => {
    it('should return true for Vue ref', () => {
      expect(isVueRef({ __v_isRef: true, value: 42 })).toBe(true);
    });

    it('should return false when __v_isRef is false', () => {
      expect(isVueRef({ __v_isRef: false, value: 42 })).toBe(false);
    });

    it('should return false for null', () => {
      expect(isVueRef(null)).toBe(false);
    });

    it('should return false for plain object without __v_isRef', () => {
      expect(isVueRef({ value: 42 })).toBe(false);
    });
  });

  describe('isVueReactive', () => {
    it('should return true for reactive object', () => {
      expect(isVueReactive({ __v_isReactive: true })).toBe(true);
    });

    it('should return false for non-reactive object', () => {
      expect(isVueReactive({ key: 'value' })).toBe(false);
    });

    it('should return false for null', () => {
      expect(isVueReactive(null)).toBe(false);
    });
  });

  describe('isFunctionComponent', () => {
    it('should return true when type is a function', () => {
      const instance = createMockInstance({
        type: (() => {
          //
        }) as unknown as VueComponentInstance['type'],
      });

      expect(isFunctionComponent(instance)).toBe(true);
    });

    it('should return true when type has setup function', () => {
      const instance = createMockInstance({
        type: { setup: () => {
          //
        } },
      });

      expect(isFunctionComponent(instance)).toBe(true);
    });

    it('should return false for Options API component', () => {
      const instance = createMockInstance({
        type: { data: () => ({}) },
      });

      expect(isFunctionComponent(instance)).toBe(false);
    });

    it('should return false for string type', () => {
      const instance = createMockInstance({
        type: 'div' as unknown as VueComponentInstance['type'],
      });

      expect(isFunctionComponent(instance)).toBe(false);
    });
  });

  describe('isOptionsComponent', () => {
    it('should return true when type has data function', () => {
      const instance = createMockInstance({
        type: { data: () => ({}) },
      });

      expect(isOptionsComponent(instance)).toBe(true);
    });

    it('should return true when type has computed', () => {
      const instance = createMockInstance({
        type: { computed: { fullName: () => '' } },
      });

      expect(isOptionsComponent(instance)).toBe(true);
    });

    it('should return true when type has methods', () => {
      const instance = createMockInstance({
        type: { methods: { handleClick: () => {
          //
        } } },
      });

      expect(isOptionsComponent(instance)).toBe(true);
    });

    it('should return false for function component', () => {
      const instance = createMockInstance({
        type: { setup: () => {
          //
        } },
      });

      expect(isOptionsComponent(instance)).toBe(false);
    });

    it('should return false for string type', () => {
      const instance = createMockInstance({
        type: 'div' as unknown as VueComponentInstance['type'],
      });

      expect(isOptionsComponent(instance)).toBe(false);
    });
  });

  describe('isHTMLElement', () => {
    it('should return true for element with nodeType ELEMENT_NODE', () => {
      const element = { nodeType: Node.ELEMENT_NODE };

      expect(isHTMLElement(element)).toBe(true);
    });

    it('should return false for text node', () => {
      const node = { nodeType: Node.TEXT_NODE };

      expect(isHTMLElement(node)).toBe(false);
    });

    it('should return false for null', () => {
      expect(isHTMLElement(null)).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(isHTMLElement(undefined)).toBe(false);
    });

    it('should return false for non-object', () => {
      expect(isHTMLElement('string')).toBe(false);
    });
  });
});
