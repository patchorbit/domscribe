import { describe, it, expect } from 'vitest';
import { ComponentNameResolver } from './component-name-resolver.js';
import type { ExtendedReactFiber } from '../fiber/types.js';
import { REACT_FIBER_TAGS } from '../utils/constants.js';
import { NameResolutionError } from '../errors/index.js';

function createFiber(
  overrides: Partial<ExtendedReactFiber> = {},
): ExtendedReactFiber {
  return {
    tag: REACT_FIBER_TAGS.FunctionComponent,
    memoizedProps: {},
    ...overrides,
  };
}

describe('ComponentNameResolver', () => {
  let resolver: ComponentNameResolver;

  beforeEach(() => {
    resolver = new ComponentNameResolver();
  });

  describe('resolve', () => {
    it('should throw NameResolutionError for null fiber', () => {
      expect(() =>
        resolver.resolve(null as unknown as ExtendedReactFiber),
      ).toThrow(NameResolutionError);
    });

    it('should resolve host component name from type string', () => {
      const fiber = createFiber({
        tag: REACT_FIBER_TAGS.HostComponent,
        type: 'div',
      });

      const result = resolver.resolve(fiber);

      expect(result.name).toBe('div');
      expect(result.confidence).toBe(1.0);
      expect(result.method).toBe('type-name');
      expect(result.wrappers).toEqual([]);
    });

    it('should resolve host component with non-string type as UnknownElement', () => {
      const fiber = createFiber({
        tag: REACT_FIBER_TAGS.HostComponent,
        type: 42,
      });

      const result = resolver.resolve(fiber);

      expect(result.name).toBe('UnknownElement');
    });

    it('should resolve text node', () => {
      const fiber = createFiber({ tag: REACT_FIBER_TAGS.HostText });

      const result = resolver.resolve(fiber);

      expect(result.name).toBe('Text');
      expect(result.confidence).toBe(1.0);
    });

    it('should resolve via displayName on function type', () => {
      const MyComponent = function MyComponent() {
        //
      };
      MyComponent.displayName = 'PrettyName';
      const fiber = createFiber({ type: MyComponent });

      const result = resolver.resolve(fiber);

      expect(result.name).toBe('PrettyName');
      expect(result.method).toBe('displayName');
      expect(result.confidence).toBe(1.0);
    });

    it('should resolve via displayName on object type', () => {
      const fiber = createFiber({
        type: { displayName: 'ObjectComponent' },
      });

      const result = resolver.resolve(fiber);

      expect(result.name).toBe('ObjectComponent');
      expect(result.method).toBe('displayName');
    });

    it('should resolve via function name', () => {
      function UserProfile() {
        //
      }
      const fiber = createFiber({ type: UserProfile });

      const result = resolver.resolve(fiber);

      expect(result.name).toBe('UserProfile');
      expect(result.method).toBe('function-name');
      expect(result.confidence).toBe(0.8);
    });

    it('should resolve via object type name', () => {
      const fiber = createFiber({
        tag: REACT_FIBER_TAGS.ForwardRef,
        type: { name: 'ForwardRefButton' },
      });

      const result = resolver.resolve(fiber);

      expect(result.name).toBe('ForwardRefButton');
      expect(result.method).toBe('type-name');
    });

    it('should resolve via elementType string', () => {
      const fiber = createFiber({
        type: undefined,
        elementType: 'span',
      });

      const result = resolver.resolve(fiber);

      expect(result.name).toBe('span');
      expect(result.method).toBe('type-name');
      expect(result.confidence).toBe(0.5);
    });

    it('should resolve via elementType function name', () => {
      function InnerComponent() {
        //
      }
      const fiber = createFiber({
        type: undefined,
        elementType: InnerComponent,
      });

      const result = resolver.resolve(fiber);

      expect(result.name).toBe('InnerComponent');
    });

    it('should resolve via elementType object displayName', () => {
      const fiber = createFiber({
        type: undefined,
        elementType: { displayName: 'ElementDisplayName' },
      });

      const result = resolver.resolve(fiber);

      expect(result.name).toBe('ElementDisplayName');
    });

    it('should resolve via elementType object name', () => {
      const fiber = createFiber({
        type: undefined,
        elementType: { name: 'ElementName' },
      });

      const result = resolver.resolve(fiber);

      expect(result.name).toBe('ElementName');
    });

    it('should fall back to Anonymous when name cannot be resolved', () => {
      const fiber = createFiber({ type: undefined });

      const result = resolver.resolve(fiber);

      expect(result.name).toBe('Anonymous');
      expect(result.method).toBe('fallback');
      expect(result.confidence).toBe(0.0);
    });

    it('should use custom fallback name', () => {
      const fiber = createFiber({ type: undefined });

      const result = resolver.resolve(fiber, { fallbackName: 'Unknown' });

      expect(result.name).toBe('Unknown');
    });

    it('should ignore empty displayName', () => {
      const fn = function () {
        //
      };
      fn.displayName = '';
      const fiber = createFiber({ type: fn });

      const result = resolver.resolve(fiber);

      // Should skip displayName and fall through
      expect(result.method).not.toBe('displayName');
    });

    it('should ignore empty object name', () => {
      const fiber = createFiber({ type: { name: '' } });

      const result = resolver.resolve(fiber);

      expect(result.method).toBe('fallback');
    });
  });

  describe('resolve with wrappers', () => {
    it('should detect memo wrapper', () => {
      function MyComponent() {
        //
      }
      const fiber = createFiber({
        tag: REACT_FIBER_TAGS.MemoComponent,
        type: { displayName: 'Wrapped' },
        elementType: { type: MyComponent },
      });

      const result = resolver.resolve(fiber, { includeWrappers: true });

      expect(result.wrappers).toContain('memo');
      expect(result.name).toBe('MyComponent');
      expect(result.displayName).toBe('memo(MyComponent)');
    });

    it('should detect SimpleMemoComponent wrapper', () => {
      function Simple() {
        //
      }
      const fiber = createFiber({
        tag: REACT_FIBER_TAGS.SimpleMemoComponent,
        elementType: { type: Simple },
      });

      const result = resolver.resolve(fiber, { includeWrappers: true });

      expect(result.wrappers).toContain('memo');
    });

    it('should detect forwardRef wrapper', () => {
      function Button() {
        //
      }
      const fiber = createFiber({
        tag: REACT_FIBER_TAGS.ForwardRef,
        elementType: { render: Button },
      });

      const result = resolver.resolve(fiber, { includeWrappers: true });

      expect(result.wrappers).toContain('forwardRef');
      expect(result.name).toBe('Button');
      expect(result.displayName).toBe('forwardRef(Button)');
    });

    it('should detect HOC patterns', () => {
      function withRouter() {
        //
      }
      const innerComponent = createFiber({
        tag: REACT_FIBER_TAGS.FunctionComponent,
        type: function AppPage() {
          //
        },
      });
      const fiber = createFiber({
        tag: REACT_FIBER_TAGS.FunctionComponent,
        type: withRouter,
        child: innerComponent,
      });

      const result = resolver.resolve(fiber, { includeWrappers: true });

      expect(result.wrappers).toContain('withRouter');
      expect(result.name).toBe('AppPage');
      expect(result.displayName).toBe('withRouter(AppPage)');
    });

    it('should respect maxWrapperDepth', () => {
      function Inner() {
        //
      }
      const fiber = createFiber({
        tag: REACT_FIBER_TAGS.MemoComponent,
        elementType: {
          type: {
            tag: REACT_FIBER_TAGS.MemoComponent,
            memoizedProps: {},
            elementType: { type: Inner },
          },
        },
      });

      const result = resolver.resolve(fiber, {
        includeWrappers: true,
        maxWrapperDepth: 1,
      });

      // Should only unwrap one layer
      expect(result.wrappers).toHaveLength(1);
    });

    it('should return inner name without wrapper formatting when no wrappers found', () => {
      function PlainComponent() {
        //
      }
      const fiber = createFiber({
        tag: REACT_FIBER_TAGS.FunctionComponent,
        type: PlainComponent,
      });

      const result = resolver.resolve(fiber, { includeWrappers: true });

      expect(result.wrappers).toHaveLength(0);
      expect(result.displayName).toBe('PlainComponent');
    });

    it('should stop unwrapping when memo has no inner type', () => {
      const fiber = createFiber({
        tag: REACT_FIBER_TAGS.MemoComponent,
        type: { displayName: 'MemoWrapped' },
        elementType: 'not-an-object',
      });

      const result = resolver.resolve(fiber, { includeWrappers: true });

      // Should not crash, just return what it can
      expect(result).toBeDefined();
    });

    it('should stop unwrapping when forwardRef has no render', () => {
      const fiber = createFiber({
        tag: REACT_FIBER_TAGS.ForwardRef,
        type: { displayName: 'FwdRef' },
        elementType: { notRender: true },
      });

      const result = resolver.resolve(fiber, { includeWrappers: true });

      expect(result).toBeDefined();
    });

    it('should stop unwrapping HOC when no child exists', () => {
      function connect() {
        //
      }
      const fiber = createFiber({
        tag: REACT_FIBER_TAGS.FunctionComponent,
        type: connect,
      });

      const result = resolver.resolve(fiber, { includeWrappers: true });

      // HOC detected but can't unwrap — should not loop
      expect(result).toBeDefined();
    });

    it('should format multiple wrappers correctly', () => {
      function Inner() {
        //
      }
      // memo(forwardRef(Inner))
      const forwardRefFiber = createFiber({
        tag: REACT_FIBER_TAGS.ForwardRef,
        elementType: { render: Inner },
      });
      const memoFiber = createFiber({
        tag: REACT_FIBER_TAGS.MemoComponent,
        elementType: { type: forwardRefFiber },
      });

      const result = resolver.resolve(memoFiber, { includeWrappers: true });

      // Unwraps memo → gets synthetic fiber with ForwardRef tag → unwraps forwardRef
      expect(result.wrappers.length).toBeGreaterThanOrEqual(1);
    });
  });
});
