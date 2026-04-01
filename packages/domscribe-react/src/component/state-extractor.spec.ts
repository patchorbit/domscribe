import { describe, it, expect } from 'vitest';
import { StateExtractor } from './state-extractor.js';
import type { ExtendedReactFiber } from '../fiber/types.js';
import { REACT_FIBER_TAGS } from '../utils/constants.js';

function createFiber(
  overrides: Partial<ExtendedReactFiber> = {},
): ExtendedReactFiber {
  return {
    tag: REACT_FIBER_TAGS.FunctionComponent,
    memoizedProps: {},
    ...overrides,
  };
}

describe('StateExtractor', () => {
  let extractor: StateExtractor;

  beforeEach(() => {
    extractor = new StateExtractor();
  });

  describe('extract', () => {
    it('should return failure for null fiber', () => {
      const result = extractor.extract(null as unknown as ExtendedReactFiber);

      expect(result.success).toBe(false);
      expect(result.stateType).toBe('none');
      expect(result.error).toBeDefined();
    });

    it('should return none for non-stateful fiber tags', () => {
      const fiber = createFiber({ tag: REACT_FIBER_TAGS.HostComponent });

      const result = extractor.extract(fiber);

      expect(result.success).toBe(true);
      expect(result.stateType).toBe('none');
    });

    describe('class components', () => {
      it('should extract class component state', () => {
        const fiber = createFiber({
          tag: REACT_FIBER_TAGS.ClassComponent,
          memoizedState: { count: 0, name: 'test' },
        });

        const result = extractor.extract(fiber);

        expect(result.success).toBe(true);
        expect(result.stateType).toBe('class');
        expect(result.state).toEqual({ count: 0, name: 'test' });
      });

      it('should handle null class state', () => {
        const fiber = createFiber({
          tag: REACT_FIBER_TAGS.ClassComponent,
          memoizedState: null,
        });

        const result = extractor.extract(fiber);

        expect(result.success).toBe(true);
        expect(result.stateType).toBe('class');
        expect(result.state).toBeUndefined();
      });

      it('should handle undefined class state', () => {
        const fiber = createFiber({
          tag: REACT_FIBER_TAGS.ClassComponent,
          memoizedState: undefined,
        });

        const result = extractor.extract(fiber);

        expect(result.success).toBe(true);
        expect(result.stateType).toBe('class');
        expect(result.state).toBeUndefined();
      });

      it('should return empty record for non-object state', () => {
        const fiber = createFiber({
          tag: REACT_FIBER_TAGS.ClassComponent,
          memoizedState: 'string-state',
        });

        const result = extractor.extract(fiber);

        expect(result.success).toBe(true);
        expect(result.stateType).toBe('class');
        expect(result.state).toEqual({});
      });

      it('should return empty record for array state', () => {
        const fiber = createFiber({
          tag: REACT_FIBER_TAGS.ClassComponent,
          memoizedState: [1, 2, 3],
        });

        const result = extractor.extract(fiber);

        expect(result.success).toBe(true);
        expect(result.state).toEqual({});
      });
    });

    describe('function components', () => {
      it('should extract state from hook chain with semantic names', () => {
        // Arrange - useState hooks have a `queue` property
        const hookChain = {
          memoizedState: 'hello',
          queue: {},
          next: {
            memoizedState: 42,
            queue: {},
            next: null,
          },
        };
        const fiber = createFiber({
          tag: REACT_FIBER_TAGS.FunctionComponent,
          memoizedState: hookChain,
        });

        // Act
        const result = extractor.extract(fiber);

        // Assert
        expect(result.success).toBe(true);
        expect(result.stateType).toBe('hooks');
        expect(result.state).toEqual({
          state_0: 'hello',
          state_1: 42,
        });
      });

      it('should handle function component with no hooks', () => {
        const fiber = createFiber({
          tag: REACT_FIBER_TAGS.FunctionComponent,
          memoizedState: undefined,
        });

        const result = extractor.extract(fiber);

        expect(result.success).toBe(true);
        expect(result.stateType).toBe('hooks');
        expect(result.state).toBeUndefined();
      });

      it('should handle empty hook chain', () => {
        const fiber = createFiber({
          tag: REACT_FIBER_TAGS.FunctionComponent,
          memoizedState: { notAHook: true },
        });

        const result = extractor.extract(fiber);

        expect(result.success).toBe(true);
        expect(result.stateType).toBe('hooks');
        // Non-hook memoizedState -> empty record -> no state property set
        expect(result.state).toBeUndefined();
      });

      it('should recognize hook nodes with queue property as state hooks', () => {
        const hookChain = {
          queue: {},
          memoizedState: 'value',
          next: null,
        };
        const fiber = createFiber({
          tag: REACT_FIBER_TAGS.FunctionComponent,
          memoizedState: hookChain,
        });

        const result = extractor.extract(fiber);

        expect(result.success).toBe(true);
        expect(result.state).toEqual({ state_0: 'value' });
      });

      it('should recognize hook nodes with baseState property', () => {
        const hookChain = {
          baseState: 'base',
          memoizedState: 'current',
          next: null,
        };
        const fiber = createFiber({
          tag: REACT_FIBER_TAGS.FunctionComponent,
          memoizedState: hookChain,
        });

        const result = extractor.extract(fiber);

        expect(result.success).toBe(true);
        expect(result.state).toEqual({ unknown_0: 'current' });
      });

      it('should respect the 100-hook safety limit', () => {
        // Build a long hook chain (all state hooks with queue)
        const first: Record<string, unknown> = {
          memoizedState: 0,
          queue: {},
          next: null,
        };
        let current = first;
        for (let i = 1; i < 150; i++) {
          const next: Record<string, unknown> = {
            memoizedState: i,
            queue: {},
            next: null,
          };
          current.next = next;
          current = next;
        }

        const fiber = createFiber({
          tag: REACT_FIBER_TAGS.FunctionComponent,
          memoizedState: first,
        });

        const result = extractor.extract(fiber);

        expect(result.success).toBe(true);
        expect(Object.keys(result.state ?? {}).length).toBe(100);
      });

      it('should extract from MemoComponent fibers', () => {
        const hookChain = {
          memoizedState: 'memo-state',
          queue: {},
          next: null,
        };
        const fiber = createFiber({
          tag: REACT_FIBER_TAGS.MemoComponent,
          memoizedState: hookChain,
        });

        const result = extractor.extract(fiber);

        expect(result.success).toBe(true);
        expect(result.stateType).toBe('hooks');
        expect(result.state).toEqual({ state_0: 'memo-state' });
      });

      it('should extract from SimpleMemoComponent fibers', () => {
        const hookChain = {
          memoizedState: 'simple-memo',
          queue: {},
          next: null,
        };
        const fiber = createFiber({
          tag: REACT_FIBER_TAGS.SimpleMemoComponent,
          memoizedState: hookChain,
        });

        const result = extractor.extract(fiber);

        expect(result.success).toBe(true);
        expect(result.stateType).toBe('hooks');
      });

      it('should extract from ForwardRef fibers', () => {
        const hookChain = {
          memoizedState: 'fwd-ref',
          queue: {},
          next: null,
        };
        const fiber = createFiber({
          tag: REACT_FIBER_TAGS.ForwardRef,
          memoizedState: hookChain,
        });

        const result = extractor.extract(fiber);

        expect(result.success).toBe(true);
        expect(result.stateType).toBe('hooks');
      });
    });

    describe('hook classification', () => {
      it('should skip effect hooks entirely', () => {
        const hookChain = {
          memoizedState: {
            tag: 5,
            create: () => undefined,
            deps: [1, 2],
            inst: {},
            next: null,
          },
          next: {
            memoizedState: 'actual-state',
            queue: {},
            next: null,
          },
        };
        const fiber = createFiber({
          tag: REACT_FIBER_TAGS.FunctionComponent,
          memoizedState: hookChain,
        });

        const result = extractor.extract(fiber);

        expect(result.success).toBe(true);
        // Effect hook should be skipped, only state hook remains
        expect(result.state).toEqual({ state_0: 'actual-state' });
      });

      it('should extract only cached value from memo hooks (discard deps)', () => {
        const hookChain = {
          memoizedState: ['cachedValue', ['dep1', 'dep2']],
          next: null,
        };
        const fiber = createFiber({
          tag: REACT_FIBER_TAGS.FunctionComponent,
          memoizedState: hookChain,
        });

        const result = extractor.extract(fiber);

        expect(result.success).toBe(true);
        expect(result.state).toEqual({ memo_0: 'cachedValue' });
      });

      it('should keep ref hooks as {current: value}', () => {
        const hookChain = {
          memoizedState: { current: 'ref-value' },
          next: null,
        };
        const fiber = createFiber({
          tag: REACT_FIBER_TAGS.FunctionComponent,
          memoizedState: hookChain,
        });

        const result = extractor.extract(fiber);

        expect(result.success).toBe(true);
        expect(result.state).toEqual({ ref_0: { current: 'ref-value' } });
      });

      it('should handle mixed hook types with correct naming', () => {
        // Build a chain: useState → useEffect → useRef → useMemo → useEffect
        const hookChain = {
          memoizedState: 'count',
          queue: {},
          next: {
            memoizedState: {
              tag: 5,
              create: () => undefined,
              deps: null,
              inst: {},
            },
            next: {
              memoizedState: { current: null },
              next: {
                memoizedState: ['computed', [1, 2]],
                next: {
                  memoizedState: {
                    tag: 3,
                    create: () => undefined,
                    deps: ['a'],
                    inst: {},
                  },
                  next: null,
                },
              },
            },
          },
        };
        const fiber = createFiber({
          tag: REACT_FIBER_TAGS.FunctionComponent,
          memoizedState: hookChain,
        });

        const result = extractor.extract(fiber);

        expect(result.success).toBe(true);
        // Effects skipped, remaining hooks get semantic names
        expect(result.state).toEqual({
          state_0: 'count',
          ref_0: { current: null },
          memo_0: 'computed',
        });
      });

      it('should handle memo hooks with null deps (useCallback)', () => {
        const hookChain = {
          memoizedState: ['callback-fn', null],
          next: null,
        };
        const fiber = createFiber({
          tag: REACT_FIBER_TAGS.FunctionComponent,
          memoizedState: hookChain,
        });

        const result = extractor.extract(fiber);

        expect(result.success).toBe(true);
        expect(result.state).toEqual({ memo_0: 'callback-fn' });
      });
    });

    it('should handle extraction errors gracefully', () => {
      const fiber = createFiber({
        tag: REACT_FIBER_TAGS.FunctionComponent,
        memoizedState: new Proxy(
          {},
          {
            has() {
              throw new Error('proxy error');
            },
            get() {
              throw new Error('proxy error');
            },
          },
        ),
      });

      const result = extractor.extract(fiber);

      expect(result.success).toBe(false);
      expect(result.stateType).toBe('none');
      expect(result.error).toBeDefined();
    });
  });
});
