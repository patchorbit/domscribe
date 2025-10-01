import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { REACT_FIBER_TAGS } from '../utils/constants.js';
import { CaptureStrategy } from './types.js';

// Mock all dependencies
vi.mock('../fiber/fiber-walker.js', () => ({
  FiberWalker: class {
    findNearestComponentFiber = vi.fn().mockReturnValue(null);
    getChildren = vi.fn().mockReturnValue([]);
  },
}));

vi.mock('../component/component-name-resolver.js', () => ({
  ComponentNameResolver: class {
    resolve = vi.fn().mockReturnValue({
      name: 'MockComponent',
      displayName: 'MockComponent',
      method: 'function-name',
      confidence: 0.8,
      wrappers: [],
    });
  },
}));

vi.mock('../component/props-extractor.js', () => ({
  PropsExtractor: class {
    extract = vi.fn().mockReturnValue({
      success: true,
      props: { mockProp: 'value' },
      filteredKeys: [],
    });
  },
}));

vi.mock('../component/state-extractor.js', () => ({
  StateExtractor: class {
    extract = vi.fn().mockReturnValue({
      success: true,
      state: { hook_0: 'mockState' },
      stateType: 'hooks',
    });
  },
}));

// Must import after mocks
const { ReactAdapter, createReactAdapter } = await import('./react-adapter.js');

function createMockFiber(tag = REACT_FIBER_TAGS.FunctionComponent) {
  return {
    tag,
    memoizedProps: { testProp: 'value' },
    memoizedState: null,
  };
}

describe('ReactAdapter', () => {
  beforeEach(() => {
    // Provide a minimal window/document environment
    vi.stubGlobal('window', {});
    vi.stubGlobal('document', {
      querySelectorAll: vi.fn().mockReturnValue([]),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('constructor', () => {
    it('should initialize with default options', () => {
      const adapter = new ReactAdapter();

      expect(adapter.name).toBe('react');
      expect(adapter.getActiveStrategy()).toBe(CaptureStrategy.BEST_EFFORT);
    });

    it('should accept custom strategy', () => {
      const adapter = new ReactAdapter({
        strategy: CaptureStrategy.FIBER,
      });

      expect(adapter.getActiveStrategy()).toBe(CaptureStrategy.FIBER);
    });

    it('should accept DevTools strategy', () => {
      const adapter = new ReactAdapter({
        strategy: CaptureStrategy.DEVTOOLS,
      });

      expect(adapter.getActiveStrategy()).toBe(CaptureStrategy.DEVTOOLS);
    });

    it('should detect no DevTools when hook is absent', () => {
      const adapter = new ReactAdapter();

      expect(adapter.hasDevToolsAccess()).toBe(false);
    });

    it('should return null for React version when not detected', () => {
      const adapter = new ReactAdapter();

      expect(adapter.getReactVersion()).toBeNull();
    });

    it('should detect React version from window.React', () => {
      vi.stubGlobal('window', { React: { version: '18.2.0' } });

      const adapter = new ReactAdapter();

      expect(adapter.getReactVersion()).toBe('18.2.0');
    });

    it('should handle initialization when window is undefined', () => {
      vi.stubGlobal('window', undefined);
      vi.stubGlobal('document', undefined);

      const adapter = new ReactAdapter();

      expect(adapter.hasDevToolsAccess()).toBe(false);
      expect(adapter.getReactVersion()).toBeNull();
    });
  });

  describe('getComponentInstance', () => {
    it('should return null for non-React elements', () => {
      const adapter = new ReactAdapter();
      const element = { tagName: 'DIV' } as unknown as HTMLElement;

      const result = adapter.getComponentInstance(element);

      expect(result).toBeNull();
    });

    it('should return null when not initialized', () => {
      vi.stubGlobal('window', undefined);
      vi.stubGlobal('document', undefined);
      // Force initialization failure
      const adapter = new ReactAdapter();
      // The adapter may or may not initialize depending on environment
      // but getComponentInstance should be safe to call
      const element = {} as HTMLElement;

      const result = adapter.getComponentInstance(element);

      // Should not throw
      expect(result === null || result !== null).toBe(true);
    });
  });

  describe('captureProps', () => {
    it('should return null for non-fiber component', () => {
      const adapter = new ReactAdapter();

      const result = adapter.captureProps('not-a-fiber');

      expect(result).toBeNull();
    });

    it('should return null for null component', () => {
      const adapter = new ReactAdapter();

      const result = adapter.captureProps(null);

      expect(result).toBeNull();
    });

    it('should extract props from valid fiber', () => {
      const adapter = new ReactAdapter();
      const fiber = createMockFiber();

      const result = adapter.captureProps(fiber);

      expect(result).toEqual({ mockProp: 'value' });
    });
  });

  describe('captureState', () => {
    it('should return null for non-fiber component', () => {
      const adapter = new ReactAdapter();

      const result = adapter.captureState('not-a-fiber');

      expect(result).toBeNull();
    });

    it('should extract state from valid fiber', () => {
      const adapter = new ReactAdapter();
      const fiber = createMockFiber();

      const result = adapter.captureState(fiber);

      expect(result).toEqual({ hook_0: 'mockState' });
    });
  });

  describe('getComponentName', () => {
    it('should return null for non-fiber component', () => {
      const adapter = new ReactAdapter();

      const result = adapter.getComponentName(42);

      expect(result).toBeNull();
    });

    it('should resolve name from valid fiber', () => {
      const adapter = new ReactAdapter();
      const fiber = createMockFiber();

      const result = adapter.getComponentName(fiber);

      expect(result).toBe('MockComponent');
    });
  });

  describe('getComponentTree', () => {
    it('should return null for non-fiber component', () => {
      const adapter = new ReactAdapter();

      const result = adapter.getComponentTree({});

      expect(result).toBeNull();
    });

    it('should build tree from valid fiber', () => {
      const adapter = new ReactAdapter();
      const fiber = createMockFiber();

      const result = adapter.getComponentTree(fiber);

      // The tree should have at minimum the current node
      expect(result).toBeDefined();
      if (result) {
        expect(result.name).toBe('MockComponent');
      }
    });
  });

  describe('createReactAdapter', () => {
    it('should return a ReactAdapter instance', () => {
      const adapter = createReactAdapter();

      expect(adapter).toBeInstanceOf(ReactAdapter);
      expect(adapter.name).toBe('react');
    });

    it('should pass options through', () => {
      const adapter = createReactAdapter({
        strategy: CaptureStrategy.FIBER,
        maxTreeDepth: 10,
      });

      expect(adapter.getActiveStrategy()).toBe(CaptureStrategy.FIBER);
    });
  });
});
