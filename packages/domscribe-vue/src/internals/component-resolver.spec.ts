import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  resolveComponentFromElement,
  checkVNodeAccess,
  findNearestUserComponent,
} from './component-resolver.js';
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

describe('component-resolver', () => {
  describe('resolveComponentFromElement', () => {
    it('should resolve component from __vnode.component', () => {
      const instance = createMockInstance();
      const element = {
        __vnode: {
          type: {},
          props: null,
          shapeFlag: 4,
          component: instance,
        },
        parentElement: null,
      } as unknown as HTMLElement;

      const result = resolveComponentFromElement(element);

      expect(result.success).toBe(true);
      expect(result.instance).toBe(instance);
    });

    it('should resolve component from __vueParentComponent', () => {
      const instance = createMockInstance();
      const element = {
        __vueParentComponent: instance,
        parentElement: null,
      } as unknown as HTMLElement;

      const result = resolveComponentFromElement(element);

      expect(result.success).toBe(true);
      expect(result.instance).toBe(instance);
    });

    it('should walk up DOM tree to find component in ancestors', () => {
      const instance = createMockInstance();
      const parent = {
        __vueParentComponent: instance,
        parentElement: null,
        nodeType: Node.ELEMENT_NODE,
      } as unknown as HTMLElement;
      const child = {
        parentElement: parent,
      } as unknown as HTMLElement;

      const result = resolveComponentFromElement(child);

      expect(result.success).toBe(true);
      expect(result.instance).toBe(instance);
    });

    it('should return error when no component found', () => {
      const element = {
        parentElement: null,
      } as unknown as HTMLElement;

      const result = resolveComponentFromElement(element);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle errors gracefully', () => {
      const element = {
        get __vnode() {
          throw new Error('access error');
        },
        parentElement: null,
      } as unknown as HTMLElement;

      const result = resolveComponentFromElement(element);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('checkVNodeAccess', () => {
    beforeEach(() => {
      // Reset document state
      vi.stubGlobal('document', {
        querySelectorAll: vi.fn().mockReturnValue([]),
      });
    });

    it('should return false when no elements have Vue keys', () => {
      const elements = [
        { nodeType: Node.ELEMENT_NODE, className: 'test' },
        { nodeType: Node.ELEMENT_NODE, id: 'app' },
      ];
      vi.stubGlobal('document', {
        querySelectorAll: vi.fn().mockReturnValue(elements),
      });

      expect(checkVNodeAccess()).toBe(false);
    });

    it('should return true when an element has __vnode', () => {
      const elements = [{ nodeType: Node.ELEMENT_NODE, __vnode: {} }];
      vi.stubGlobal('document', {
        querySelectorAll: vi.fn().mockReturnValue(elements),
      });

      expect(checkVNodeAccess()).toBe(true);
    });

    it('should return true when an element has __vueParentComponent', () => {
      const elements = [
        { nodeType: Node.ELEMENT_NODE, __vueParentComponent: {} },
      ];
      vi.stubGlobal('document', {
        querySelectorAll: vi.fn().mockReturnValue(elements),
      });

      expect(checkVNodeAccess()).toBe(true);
    });

    it('should return false when document is undefined', () => {
      vi.stubGlobal('document', undefined);

      expect(checkVNodeAccess()).toBe(false);
    });

    it('should sample at most 50 elements', () => {
      const elements = Array.from({ length: 100 }, (_, i) => ({
        nodeType: Node.ELEMENT_NODE,
        id: `el-${i}`,
      }));
      const querySelectorAll = vi.fn().mockReturnValue(elements);
      vi.stubGlobal('document', { querySelectorAll });

      checkVNodeAccess();

      // Should still work - it just limits iteration, not the query
      expect(querySelectorAll).toHaveBeenCalledWith('*');
    });
  });

  describe('findNearestUserComponent', () => {
    it('should return the instance if it is a user component', () => {
      const instance = createMockInstance({
        type: { name: 'MyComponent' },
      });

      const result = findNearestUserComponent(instance);

      expect(result).toBe(instance);
    });

    it('should skip Transition component', () => {
      const userComponent = createMockInstance({
        type: { name: 'UserComponent' },
      });
      const transition = createMockInstance({
        type: { name: 'Transition' },
        parent: userComponent,
      });

      const result = findNearestUserComponent(transition);

      expect(result).toBe(userComponent);
    });

    it('should skip KeepAlive component', () => {
      const userComponent = createMockInstance({
        type: { name: 'UserComponent' },
      });
      const keepAlive = createMockInstance({
        type: { name: 'KeepAlive' },
        parent: userComponent,
      });

      const result = findNearestUserComponent(keepAlive);

      expect(result).toBe(userComponent);
    });

    it('should skip Teleport component', () => {
      const userComponent = createMockInstance({
        type: { name: 'UserComponent' },
      });
      const teleport = createMockInstance({
        type: { name: 'Teleport' },
        parent: userComponent,
      });

      const result = findNearestUserComponent(teleport);

      expect(result).toBe(userComponent);
    });

    it('should skip Suspense component', () => {
      const userComponent = createMockInstance({
        type: { name: 'UserComponent' },
      });
      const suspense = createMockInstance({
        type: { name: 'Suspense' },
        parent: userComponent,
      });

      const result = findNearestUserComponent(suspense);

      expect(result).toBe(userComponent);
    });

    it('should skip Fragment component', () => {
      const userComponent = createMockInstance({
        type: { name: 'UserComponent' },
      });
      const fragment = createMockInstance({
        type: { name: 'Fragment' },
        parent: userComponent,
      });

      const result = findNearestUserComponent(fragment);

      expect(result).toBe(userComponent);
    });

    it('should skip multiple internal components', () => {
      const userComponent = createMockInstance({
        type: { name: 'UserComponent' },
      });
      const transition = createMockInstance({
        type: { name: 'Transition' },
        parent: userComponent,
      });
      const keepAlive = createMockInstance({
        type: { name: 'KeepAlive' },
        parent: transition,
      });

      const result = findNearestUserComponent(keepAlive);

      expect(result).toBe(userComponent);
    });

    it('should return original instance if no user component found in ancestors', () => {
      const instance = createMockInstance({
        type: { name: 'Transition' },
        parent: null,
      });

      const result = findNearestUserComponent(instance);

      expect(result).toBe(instance);
    });

    it('should handle function type with name', () => {
      const fn = function MyComponent() {
        //
      };
      const instance = createMockInstance({
        type: fn as unknown as VueComponentInstance['type'],
      });

      const result = findNearestUserComponent(instance);

      expect(result).toBe(instance);
    });

    it('should resolve __name from script setup', () => {
      const instance = createMockInstance({
        type: { __name: 'SetupComponent' },
      });

      const result = findNearestUserComponent(instance);

      expect(result).toBe(instance);
    });
  });
});
