/**
 * StateExtractor - Extract state from React Fiber nodes
 *
 * Handles extraction of component state for both class and function components.
 * For class components, extracts from memoizedState. For function components,
 * classifies hooks by type and extracts only meaningful state — skipping
 * effect hooks and discarding memo dependency arrays.
 *
 * @module @domscribe/react/component/state-extractor
 */

import type { ExtendedReactFiber } from '../fiber/types.js';
import type {
  StateExtractionResult,
  ComponentExtractionOptions,
} from './types.js';
import { REACT_FIBER_TAGS } from '../utils/constants.js';
import { StateExtractionError } from '../errors/index.js';

/**
 * Hook classification based on structure of memoizedState.
 *
 * React doesn't tag hooks explicitly, so we infer by structure:
 * - Effect: memoizedState is `{tag, create, deps, ...}` (useEffect/useLayoutEffect)
 * - Ref: memoizedState is `{current}` with no other own keys
 * - Memo: memoizedState is Array[2] where [1] is array or null (useMemo/useCallback)
 * - State: hook node has a `queue` property (useState/useReducer)
 * - Unknown: anything else
 */
type HookType = 'effect' | 'ref' | 'memo' | 'state' | 'unknown';

/**
 * Counters for generating semantic hook key names (state_0, ref_0, memo_0).
 */
interface HookCounters {
  state: number;
  ref: number;
  memo: number;
  unknown: number;
}

/**
 * StateExtractor class for extracting state from Fiber nodes
 */
export class StateExtractor {
  /**
   * Extract state from a Fiber node
   *
   * @param fiber - Fiber node to extract state from
   * @param options - Extraction options
   * @returns State extraction result
   */
  extract(
    fiber: ExtendedReactFiber,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _options?: ComponentExtractionOptions,
  ): StateExtractionResult {
    if (!fiber) {
      return {
        success: false,
        stateType: 'none',
        error: new Error('Fiber node is required'),
      };
    }

    try {
      // Check component type and extract accordingly
      if (fiber.tag === REACT_FIBER_TAGS.ClassComponent) {
        return this.extractClassState(fiber);
      }

      if (
        fiber.tag === REACT_FIBER_TAGS.FunctionComponent ||
        fiber.tag === REACT_FIBER_TAGS.MemoComponent ||
        fiber.tag === REACT_FIBER_TAGS.SimpleMemoComponent ||
        fiber.tag === REACT_FIBER_TAGS.ForwardRef
      ) {
        return this.extractFunctionState(fiber);
      }

      // Other component types don't have state
      return {
        success: true,
        stateType: 'none',
      };
    } catch (error) {
      return {
        success: false,
        stateType: 'none',
        error:
          error instanceof Error
            ? error
            : new StateExtractionError('State extraction failed'),
      };
    }
  }

  /**
   * Extract state from a class component
   *
   * @param fiber - Class component Fiber node
   * @returns State extraction result
   */
  private extractClassState(fiber: ExtendedReactFiber): StateExtractionResult {
    // For class components, memoizedState IS the state
    const state = fiber.memoizedState;

    if (state === null || state === undefined) {
      return {
        success: true,
        stateType: 'class',
      };
    }

    // Ensure state is a record
    const stateRecord = this.ensureRecord(state);

    return {
      success: true,
      state: stateRecord,
      stateType: 'class',
    };
  }

  /**
   * Extract state from a function component
   *
   * @param fiber - Function component Fiber node
   * @returns State extraction result
   */
  private extractFunctionState(
    fiber: ExtendedReactFiber,
  ): StateExtractionResult {
    // For function components, we need to walk the hook chain
    if (!fiber.memoizedState) {
      return {
        success: true,
        stateType: 'hooks',
      };
    }

    // Extract state values from hooks - returns them as a record with indices as keys
    const stateRecord = this.extractStateFromHooks(fiber);

    if (Object.keys(stateRecord).length === 0) {
      return {
        success: true,
        stateType: 'hooks',
      };
    }

    return {
      success: true,
      state: stateRecord,
      stateType: 'hooks',
    };
  }

  /**
   * Extract state values from hook chain.
   *
   * Classifies each hook by type and extracts only meaningful data:
   * - Effect hooks are skipped entirely (internal implementation detail)
   * - Memo/callback hooks return only the cached value (deps discarded)
   * - State/reducer hooks return memoizedState as-is
   * - Ref hooks return {current: value}
   *
   * Keys use semantic names: state_0, ref_0, memo_0, unknown_0
   *
   * @param fiber - Fiber node with hooks
   * @returns Record mapping semantic hook names to state values
   */
  private extractStateFromHooks(
    fiber: ExtendedReactFiber,
  ): Record<string, unknown> {
    const stateRecord: Record<string, unknown> = {};
    let current: unknown = fiber.memoizedState;
    let hookIndex = 0;
    const counters: HookCounters = { state: 0, ref: 0, memo: 0, unknown: 0 };

    while (current && hookIndex < 100) {
      // Safety limit
      if (this.isHookNode(current)) {
        if ('memoizedState' in current) {
          const hookType = this.classifyHook(current);

          // Skip effect hooks — they contain only internal data
          // (tag, create, destroy, deps, inst, next)
          if (hookType !== 'effect') {
            const key = `${hookType}_${counters[hookType]++}`;
            stateRecord[key] = this.extractHookValue(
              hookType,
              current.memoizedState,
            );
          }
        }

        current = current.next;
      } else {
        break;
      }

      hookIndex++;
    }

    return stateRecord;
  }

  /**
   * Classify a hook node by examining its memoizedState structure.
   *
   * @param hookNode - A hook linked-list node
   * @returns The inferred hook type
   */
  private classifyHook(hookNode: {
    memoizedState: unknown;
    next: unknown;
    [key: string]: unknown;
  }): HookType {
    const ms = hookNode.memoizedState;

    // Effect hooks: memoizedState is {tag, create, deps, ...}
    if (this.isEffectState(ms)) {
      return 'effect';
    }

    // State/reducer hooks: hook node has a `queue` property
    if ('queue' in hookNode && hookNode.queue !== null) {
      return 'state';
    }

    // Ref hooks: memoizedState is {current: any} with no other own keys
    if (this.isRefState(ms)) {
      return 'ref';
    }

    // Memo/callback hooks: memoizedState is [value, deps]
    if (this.isMemoState(ms)) {
      return 'memo';
    }

    return 'unknown';
  }

  /**
   * Extract the meaningful value from a hook based on its type.
   *
   * @param hookType - The classified hook type
   * @param memoizedState - The hook's memoizedState
   * @returns The extracted value
   */
  private extractHookValue(
    hookType: HookType,
    memoizedState: unknown,
  ): unknown {
    switch (hookType) {
      case 'memo':
        // Memo/callback: return only the cached value, discard deps
        if (Array.isArray(memoizedState) && memoizedState.length === 2) {
          return memoizedState[0];
        }
        return memoizedState;

      case 'ref':
      case 'state':
      case 'unknown':
      default:
        return memoizedState;
    }
  }

  /**
   * Check if memoizedState looks like an effect hook's state.
   * Effect state has the shape: {tag: number, create: fn, deps: array|null, ...}
   */
  private isEffectState(ms: unknown): boolean {
    return (
      typeof ms === 'object' &&
      ms !== null &&
      !Array.isArray(ms) &&
      'tag' in ms &&
      'create' in ms &&
      'deps' in ms
    );
  }

  /**
   * Check if memoizedState looks like a ref hook's state.
   * Ref state has the shape: {current: any} with no other own keys.
   */
  private isRefState(ms: unknown): boolean {
    if (typeof ms !== 'object' || ms === null || Array.isArray(ms)) {
      return false;
    }
    const keys = Object.keys(ms);
    return keys.length === 1 && keys[0] === 'current';
  }

  /**
   * Check if memoizedState looks like a memo/callback hook's state.
   * Memo state has the shape: [cachedValue, deps] where deps is array|null.
   */
  private isMemoState(ms: unknown): boolean {
    return (
      Array.isArray(ms) &&
      ms.length === 2 &&
      (Array.isArray(ms[1]) || ms[1] === null)
    );
  }

  /**
   * Check if a value is a hook node
   *
   * @param value - Value to check
   * @returns True if hook node
   */
  private isHookNode(value: unknown): value is {
    memoizedState: unknown;
    next: unknown;
    [key: string]: unknown;
  } {
    return (
      typeof value === 'object' &&
      value !== null &&
      'next' in value &&
      ('memoizedState' in value || 'queue' in value || 'baseState' in value)
    );
  }

  /**
   * Ensure a value is a record (object with string keys)
   *
   * @param value - Value to check
   * @returns Record or empty object
   */
  private ensureRecord(value: unknown): Record<string, unknown> {
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      return value as Record<string, unknown>;
    }
    return {};
  }
}
