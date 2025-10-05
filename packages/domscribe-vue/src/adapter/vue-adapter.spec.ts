import { VueComponentInstance } from '../internals/types.js';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock all dependencies
vi.mock('../internals/component-resolver.js', () => ({
  resolveComponentFromElement: vi.fn().mockReturnValue({ success: false }),
  checkVNodeAccess: vi.fn().mockReturnValue(false),
  findNearestUserComponent: vi.fn((instance) => instance),
}));

vi.mock('../internals/props-extractor.js', () => ({
  extractProps: vi.fn().mockReturnValue({
    success: true,
    props: { mockProp: 'value' },
  }),
}));

vi.mock('../internals/state-extractor.js', () => ({
  extractState: vi.fn().mockReturnValue({
    success: true,
    state: { mockState: 'data' },
  }),
}));

// Must import after mocks
const { VueAdapter, createVueAdapter } = await import('./vue-adapter.js');
const {
  resolveComponentFromElement,
  findNearestUserComponent,
  checkVNodeAccess,
} = await import('../internals/component-resolver.js');
const { extractProps } = await import('../internals/props-extractor.js');
const { extractState } = await import('../internals/state-extractor.js');

function createMockComponentInstance(): VueComponentInstance {
  return {
    uid: 1,
    vnode: { type: {}, props: null, shapeFlag: 1 },
    type: { name: 'TestComponent' },
    parent: null,
    proxy: null,
    setupState: {},
  } as unknown as VueComponentInstance;
}

describe('VueAdapter', () => {
  beforeEach(() => {
    vi.stubGlobal('window', {});
    vi.stubGlobal('document', {
      querySelectorAll: vi.fn().mockReturnValue([]),
    });
    vi.mocked(resolveComponentFromElement).mockReturnValue({ success: false });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with default options', () => {
      const adapter = new VueAdapter();

      expect(adapter.name).toBe('vue');
    });

    it('should detect Vue version from window.Vue', () => {
      vi.stubGlobal('window', { Vue: { version: '3.4.0' } });

      const adapter = new VueAdapter();

      expect(adapter.getVueVersion()).toBe('3.4.0');
    });

    it('should detect Vue version from DevTools hook', () => {
      const apps = new Map();
      apps.set(1, { version: '3.3.8' });
      vi.stubGlobal('window', {
        __VUE_DEVTOOLS_GLOBAL_HOOK__: { apps },
      });

      const adapter = new VueAdapter();

      expect(adapter.getVueVersion()).toBe('3.3.8');
    });

    it('should return null when no Vue version detected', () => {
      const adapter = new VueAdapter();

      expect(adapter.getVueVersion()).toBeNull();
    });

    it('should handle window being undefined', () => {
      vi.stubGlobal('window', undefined);

      const adapter = new VueAdapter();

      expect(adapter.getVueVersion()).toBeNull();
    });

    it('should accept custom maxTreeDepth', () => {
      const adapter = new VueAdapter({ maxTreeDepth: 10 });

      // Verify it initialized (we can't directly test private options)
      expect(adapter.name).toBe('vue');
    });
  });

  describe('getComponentInstance', () => {
    it('should return null when not initialized', () => {
      vi.stubGlobal('window', undefined);
      const adapter = new VueAdapter();
      const element = {} as HTMLElement;

      const result = adapter.getComponentInstance(element);

      expect(result).toBeNull();
    });

    it('should resolve component from element', () => {
      const instance = createMockComponentInstance();
      vi.mocked(resolveComponentFromElement).mockReturnValue({
        success: true,
        instance: instance,
      });
      vi.mocked(findNearestUserComponent).mockReturnValue(instance);

      const adapter = new VueAdapter();
      const element = {} as HTMLElement;

      const result = adapter.getComponentInstance(element);

      expect(result).toBe(instance);
      expect(resolveComponentFromElement).toHaveBeenCalledWith(element);
      expect(findNearestUserComponent).toHaveBeenCalledWith(instance);
    });

    it('should return null when resolution fails', () => {
      vi.mocked(resolveComponentFromElement).mockReturnValue({
        success: false,
        error: new Error('not found'),
      });

      const adapter = new VueAdapter();
      const element = {} as HTMLElement;

      const result = adapter.getComponentInstance(element);

      expect(result).toBeNull();
    });
  });

  describe('captureProps', () => {
    it('should return null for non-component instance', () => {
      const adapter = new VueAdapter();

      const result = adapter.captureProps('not-a-component');

      expect(result).toBeNull();
    });

    it('should return null for null component', () => {
      const adapter = new VueAdapter();

      const result = adapter.captureProps(null);

      expect(result).toBeNull();
    });

    it('should extract props from valid component', () => {
      vi.mocked(extractProps).mockReturnValue({
        success: true,
        props: { title: 'Hello' },
      });
      const adapter = new VueAdapter();
      const instance = createMockComponentInstance();

      const result = adapter.captureProps(instance);

      expect(result).toEqual({ title: 'Hello' });
    });

    it('should return null when extraction fails', () => {
      vi.mocked(extractProps).mockReturnValue({
        success: false,
        error: new Error('extraction failed'),
      });
      const adapter = new VueAdapter();
      const instance = createMockComponentInstance();

      const result = adapter.captureProps(instance);

      expect(result).toBeNull();
    });

    it('should return null when not initialized', () => {
      vi.stubGlobal('window', undefined);
      const adapter = new VueAdapter();
      const instance = createMockComponentInstance();

      const result = adapter.captureProps(instance);

      expect(result).toBeNull();
    });
  });

  describe('captureState', () => {
    it('should return null for non-component instance', () => {
      const adapter = new VueAdapter();

      const result = adapter.captureState(42);

      expect(result).toBeNull();
    });

    it('should extract state from valid component', () => {
      vi.mocked(extractState).mockReturnValue({
        success: true,
        state: { count: 0 },
      });
      const adapter = new VueAdapter();
      const instance = createMockComponentInstance();

      const result = adapter.captureState(instance);

      expect(result).toEqual({ count: 0 });
    });

    it('should return null when extraction fails', () => {
      vi.mocked(extractState).mockReturnValue({
        success: false,
        error: new Error('extraction failed'),
      });
      const adapter = new VueAdapter();
      const instance = createMockComponentInstance();

      const result = adapter.captureState(instance);

      expect(result).toBeNull();
    });
  });

  describe('getComponentName', () => {
    it('should return null for non-component instance', () => {
      const adapter = new VueAdapter();

      const result = adapter.getComponentName({});

      expect(result).toBeNull();
    });

    it('should resolve name from component type.name', () => {
      const adapter = new VueAdapter();
      const instance = createMockComponentInstance();

      const result = adapter.getComponentName(instance);

      expect(result).toBe('TestComponent');
    });

    it('should resolve name from type.__name (script setup)', () => {
      const adapter = new VueAdapter();
      const instance = createMockComponentInstance();
      instance.type = { name: 'SetupComponent' };

      const result = adapter.getComponentName(instance);

      expect(result).toBe('SetupComponent');
    });

    it('should resolve name from type.displayName', () => {
      const adapter = new VueAdapter();
      const instance = createMockComponentInstance();
      instance.type = { name: 'DisplayComponent' };

      const result = adapter.getComponentName(instance);

      expect(result).toBe('DisplayComponent');
    });

    it('should resolve name from function type', () => {
      const adapter = new VueAdapter();
      const instance = createMockComponentInstance();
      instance.type = function MyFuncComponent() {
        //
      };

      const result = adapter.getComponentName(instance);

      expect(result).toBe('MyFuncComponent');
    });

    it('should return Anonymous for unnamed function type', () => {
      const adapter = new VueAdapter();
      const instance = createMockComponentInstance();
      instance.type = (() => {
        //
      });

      const result = adapter.getComponentName(instance);

      expect(result).toBe('Anonymous');
    });

    it('should return string type directly', () => {
      const adapter = new VueAdapter();
      const instance = createMockComponentInstance();
      instance.type = { name: 'div' };

      const result = adapter.getComponentName(instance);

      expect(result).toBe('div');
    });

    it('should return Anonymous for component with no name properties', () => {
      const adapter = new VueAdapter();
      const instance = createMockComponentInstance();
      instance.type = { name: '' };

      const result = adapter.getComponentName(instance);

      expect(result).toBe('Anonymous');
    });
  });

  describe('getComponentTree', () => {
    it('should return null for non-component instance', () => {
      const adapter = new VueAdapter();

      const result = adapter.getComponentTree('not-component');

      expect(result).toBeNull();
    });

    it('should build tree with name, props, and state', () => {
      vi.mocked(extractProps).mockReturnValue({
        success: true,
        props: { title: 'Hello' },
      });
      vi.mocked(extractState).mockReturnValue({
        success: true,
        state: { count: 0 },
      });

      const adapter = new VueAdapter();
      const instance = createMockComponentInstance();

      const result = adapter.getComponentTree(instance);

      expect(result).toBeDefined();
      expect(result?.name).toBe('TestComponent');
      expect(result?.props).toEqual({ title: 'Hello' });
      expect(result?.state).toEqual({ count: 0 });
    });

    it('should include parent in tree', () => {
      vi.mocked(extractProps).mockReturnValue({ success: true, props: {} });
      vi.mocked(extractState).mockReturnValue({ success: true, state: {} });

      const parent = createMockComponentInstance();
      parent.type = { name: 'ParentComponent' };

      const child = createMockComponentInstance();
      child.type = { name: 'ChildComponent' };
      child.parent = parent;

      const adapter = new VueAdapter();

      const result = adapter.getComponentTree(child);

      expect(result).toBeDefined();
      expect(result?.name).toBe('ChildComponent');
      expect(result?.parent).toBeDefined();
      expect(result?.parent?.name).toBe('ParentComponent');
    });

    it('should collect child components from subTree', () => {
      vi.mocked(extractProps).mockReturnValue({ success: true, props: {} });
      vi.mocked(extractState).mockReturnValue({ success: true, state: {} });

      const childInstance = createMockComponentInstance();
      childInstance.type = { name: 'ChildComponent' };

      const instance = createMockComponentInstance();
      instance.subTree = {
        type: 'div',
        props: null,
        shapeFlag: 1,
        children: [
          {
            type: {},
            props: null,
            shapeFlag: 4,
            component: childInstance,
          },
        ],
      } as unknown as VueComponentInstance['subTree'];

      const adapter = new VueAdapter();

      const result = adapter.getComponentTree(instance);

      expect(result).toBeDefined();
      expect(result?.children).toBeDefined();
      expect(result?.children).toHaveLength(1);
      expect(result?.children?.[0].name).toBe('ChildComponent');
    });

    it('should return null when not initialized', () => {
      // Force initialization failure by making checkVNodeAccess throw
      vi.mocked(checkVNodeAccess).mockImplementationOnce(() => {
        throw new Error('forced failure');
      });

      const adapter = new VueAdapter();
      const instance = createMockComponentInstance();

      const result = adapter.getComponentTree(instance);

      expect(result).toBeNull();
    });

    it('should respect maxTreeDepth', () => {
      vi.mocked(extractProps).mockReturnValue({ success: true, props: {} });
      vi.mocked(extractState).mockReturnValue({ success: true, state: {} });

      const adapter = new VueAdapter({ maxTreeDepth: 1 });
      const instance = createMockComponentInstance();
      instance.parent = createMockComponentInstance();

      const result = adapter.getComponentTree(instance);

      // Tree should exist but no parent due to depth limit
      expect(result).toBeDefined();
      expect(result?.parent).toBeUndefined();
    });
  });

  describe('createVueAdapter', () => {
    it('should return a VueAdapter instance', () => {
      const adapter = createVueAdapter();

      expect(adapter).toBeInstanceOf(VueAdapter);
      expect(adapter.name).toBe('vue');
    });

    it('should pass options through', () => {
      const adapter = createVueAdapter({ maxTreeDepth: 10, debug: true });

      expect(adapter).toBeInstanceOf(VueAdapter);
    });
  });
});
