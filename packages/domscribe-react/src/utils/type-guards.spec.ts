import { describe, it, expect } from 'vitest';
import {
  isReactFiber,
  isComponentFiber,
  hasReactFiberKey,
  isReactDevToolsHook,
  isReactDevToolsRenderer,
  isReactDevToolsRendererInterface,
} from './type-guards.js';
import { REACT_FIBER_TAGS } from './constants.js';

describe('type-guards', () => {
  describe('isReactFiber', () => {
    it('should return true for valid Fiber node', () => {
      const fiber = { tag: 0, memoizedProps: {} };

      expect(isReactFiber(fiber)).toBe(true);
    });

    it('should return false for null', () => {
      expect(isReactFiber(null)).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(isReactFiber(undefined)).toBe(false);
    });

    it('should return false for non-object', () => {
      expect(isReactFiber('string')).toBe(false);
      expect(isReactFiber(42)).toBe(false);
    });

    it('should return false when tag is missing', () => {
      expect(isReactFiber({ memoizedProps: {} })).toBe(false);
    });

    it('should return false when tag is not a number', () => {
      expect(isReactFiber({ tag: 'string', memoizedProps: {} })).toBe(false);
    });

    it('should return false when memoizedProps is missing', () => {
      expect(isReactFiber({ tag: 0 })).toBe(false);
    });
  });

  describe('isComponentFiber', () => {
    it('should return true for FunctionComponent', () => {
      expect(
        isComponentFiber({ tag: REACT_FIBER_TAGS.FunctionComponent }),
      ).toBe(true);
    });

    it('should return true for ClassComponent', () => {
      expect(isComponentFiber({ tag: REACT_FIBER_TAGS.ClassComponent })).toBe(
        true,
      );
    });

    it('should return true for ForwardRef', () => {
      expect(isComponentFiber({ tag: REACT_FIBER_TAGS.ForwardRef })).toBe(true);
    });

    it('should return true for MemoComponent', () => {
      expect(isComponentFiber({ tag: REACT_FIBER_TAGS.MemoComponent })).toBe(
        true,
      );
    });

    it('should return true for SimpleMemoComponent', () => {
      expect(
        isComponentFiber({ tag: REACT_FIBER_TAGS.SimpleMemoComponent }),
      ).toBe(true);
    });

    it('should return false for HostComponent', () => {
      expect(isComponentFiber({ tag: REACT_FIBER_TAGS.HostComponent })).toBe(
        false,
      );
    });

    it('should return false for HostText', () => {
      expect(isComponentFiber({ tag: REACT_FIBER_TAGS.HostText })).toBe(false);
    });

    it('should return false for Fragment', () => {
      expect(isComponentFiber({ tag: REACT_FIBER_TAGS.Fragment })).toBe(false);
    });
  });

  describe('hasReactFiberKey', () => {
    it('should return true for React 16 fiber key', () => {
      const element = {
        __reactInternalInstance$abc123: {},
      } as unknown as HTMLElement;

      expect(hasReactFiberKey(element)).toBe(true);
    });

    it('should return true for React 17/18 fiber key', () => {
      const element = { __reactFiber$abc123: {} } as unknown as HTMLElement;

      expect(hasReactFiberKey(element)).toBe(true);
    });

    it('should return false when no fiber key exists', () => {
      const element = { className: 'test' } as unknown as HTMLElement;

      expect(hasReactFiberKey(element)).toBe(false);
    });
  });

  describe('isReactDevToolsHook', () => {
    it('should return true for valid DevTools hook', () => {
      const hook = {
        renderers: new Map([[1, { findFiberByHostInstance: () => null }]]),
      };

      expect(isReactDevToolsHook(hook)).toBe(true);
    });

    it('should return true for hook with rendererInterfaces', () => {
      const hook = {
        renderers: new Map([[1, { findFiberByHostInstance: () => null }]]),
        rendererInterfaces: new Map([[1, { version: '18.2.0' }]]),
      };

      expect(isReactDevToolsHook(hook)).toBe(true);
    });

    it('should return false for null', () => {
      expect(isReactDevToolsHook(null)).toBe(false);
    });

    it('should return false for non-object', () => {
      expect(isReactDevToolsHook('string')).toBe(false);
    });

    it('should return false when renderers is missing', () => {
      expect(isReactDevToolsHook({})).toBe(false);
    });

    it('should return false when renderers is null', () => {
      expect(isReactDevToolsHook({ renderers: null })).toBe(false);
    });

    it('should return false when renderer is invalid', () => {
      // Object.values() on a Map returns [] — use plain object to test validation
      const hook = {
        renderers: { 1: { findFiberByHostInstance: 'not-a-function' } },
      };

      expect(isReactDevToolsHook(hook)).toBe(false);
    });

    it('should return false when rendererInterfaces is null', () => {
      const hook = {
        renderers: new Map([[1, { findFiberByHostInstance: () => null }]]),
        rendererInterfaces: null,
      };

      expect(isReactDevToolsHook(hook)).toBe(false);
    });

    it('should return false when renderer interface has non-string version', () => {
      const hook = {
        renderers: new Map([[1, { findFiberByHostInstance: () => null }]]),
        rendererInterfaces: { 1: { version: 123 } },
      };

      expect(isReactDevToolsHook(hook)).toBe(false);
    });
  });

  describe('isReactDevToolsRenderer', () => {
    it('should return true for valid renderer', () => {
      const renderer = { findFiberByHostInstance: () => null };

      expect(isReactDevToolsRenderer(renderer)).toBe(true);
    });

    it('should return true for renderer with version', () => {
      const renderer = {
        findFiberByHostInstance: () => null,
        version: '18.2.0',
      };

      expect(isReactDevToolsRenderer(renderer)).toBe(true);
    });

    it('should return false for null', () => {
      expect(isReactDevToolsRenderer(null)).toBe(false);
    });

    it('should return false when findFiberByHostInstance is missing', () => {
      expect(isReactDevToolsRenderer({})).toBe(false);
    });

    it('should return false when findFiberByHostInstance is not a function', () => {
      expect(
        isReactDevToolsRenderer({ findFiberByHostInstance: 'not-fn' }),
      ).toBe(false);
    });

    it('should return false when version is not a string', () => {
      expect(
        isReactDevToolsRenderer({
          findFiberByHostInstance: () => null,
          version: 123,
        }),
      ).toBe(false);
    });
  });

  describe('isReactDevToolsRendererInterface', () => {
    it('should return true for empty object', () => {
      expect(isReactDevToolsRendererInterface({})).toBe(true);
    });

    it('should return true with string version', () => {
      expect(isReactDevToolsRendererInterface({ version: '18.2.0' })).toBe(
        true,
      );
    });

    it('should return false for null', () => {
      expect(isReactDevToolsRendererInterface(null)).toBe(false);
    });

    it('should return false for non-object', () => {
      expect(isReactDevToolsRendererInterface(42)).toBe(false);
    });

    it('should return false when version is not a string', () => {
      expect(isReactDevToolsRendererInterface({ version: 123 })).toBe(false);
    });
  });
});
