/**
 * State extractor - extracts state from Vue component instances
 * NOT exported from the package.
 *
 * @internal
 * @module @domscribe/vue/internals/state-extractor
 */

import type { VueComponentInstance, Nullable } from './types.js';
import { VUE_INTERNAL_STATE_KEYS } from './constants.js';
import {
  isRecord,
  isVueRef,
  isFunctionComponent,
  isOptionsComponent,
} from './type-guards.js';
import { StateExtractionError } from '../errors/index.js';

/**
 * Unwrap Vue refs in a value tree.
 * This is Vue-specific domain logic — general serialization
 * is handled by @domscribe/runtime's serialization utilities.
 * @internal
 */
function unwrapRefs(value: unknown, depth = 0): unknown {
  if (depth > 10) return value;
  if (value === null || value === undefined) return value;

  // Unwrap Vue refs to their inner value
  if (isVueRef(value)) {
    return unwrapRefs(value.value, depth + 1);
  }

  // Recurse into arrays
  if (Array.isArray(value)) {
    return value.map((item) => unwrapRefs(item, depth + 1));
  }

  // Recurse into plain objects, skipping Vue internals.
  // Don't recurse into special object types (Map, Set, Date, etc.)
  // — the runtime serializer handles those.
  if (
    isRecord(value) &&
    (value.constructor === Object || value.constructor === undefined)
  ) {
    const result: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      if (k.startsWith('__v_') || k.startsWith('__V_')) continue;
      result[k] = unwrapRefs(v, depth + 1);
    }
    return result;
  }

  return value;
}

/**
 * Result of state extraction
 * @internal
 */
export interface StateExtractionResult {
  success: boolean;
  state?: Record<string, unknown>;
  error?: Error;
}

/**
 * Extract state from a Vue component instance
 * Handles both Composition API (setupState) and Options API (data)
 *
 * @param instance - The Vue component instance
 * @returns Extraction result with state or error
 * @internal
 */
export function extractState(
  instance: VueComponentInstance,
): StateExtractionResult {
  try {
    const state: Record<string, unknown> = {};

    // Extract Composition API state (setupState)
    if (isFunctionComponent(instance) || hasSetupState(instance)) {
      const setupState = extractSetupState(instance);
      if (setupState) {
        Object.assign(state, setupState);
      }
    }

    // Extract Options API state (data)
    if (isOptionsComponent(instance) || hasData(instance)) {
      const dataState = extractDataState(instance);
      if (dataState) {
        Object.assign(state, dataState);
      }
    }

    // If no state extracted from above, try the ctx object
    if (Object.keys(state).length === 0) {
      const ctxState = extractCtxState(instance);
      if (ctxState) {
        Object.assign(state, ctxState);
      }
    }

    return {
      success: true,
      state: unwrapRefs(state) as Record<string, unknown>,
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error
          : new StateExtractionError('State extraction failed'),
    };
  }
}

/**
 * Check if instance has setupState
 * @internal
 */
function hasSetupState(instance: VueComponentInstance): boolean {
  return (
    isRecord(instance.setupState) && Object.keys(instance.setupState).length > 0
  );
}

/**
 * Check if instance has data
 * @internal
 */
function hasData(instance: VueComponentInstance): boolean {
  return isRecord(instance.data) && Object.keys(instance.data).length > 0;
}

/**
 * Extract Composition API state from setupState
 * @internal
 */
function extractSetupState(
  instance: VueComponentInstance,
): Nullable<Record<string, unknown>> {
  if (!isRecord(instance.setupState)) {
    return null;
  }

  const state: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(instance.setupState)) {
    // Skip internal keys
    if (shouldSkipStateKey(key)) {
      continue;
    }

    // Skip functions (computed properties return their value when accessed)
    if (typeof value === 'function') {
      continue;
    }

    state[key] = value;
  }

  return Object.keys(state).length > 0 ? state : null;
}

/**
 * Extract Options API state from data
 * @internal
 */
function extractDataState(
  instance: VueComponentInstance,
): Nullable<Record<string, unknown>> {
  if (!isRecord(instance.data)) {
    return null;
  }

  const state: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(instance.data)) {
    // Skip internal keys
    if (shouldSkipStateKey(key)) {
      continue;
    }

    state[key] = value;
  }

  return Object.keys(state).length > 0 ? state : null;
}

/**
 * Extract state from ctx (fallback)
 * @internal
 */
function extractCtxState(
  instance: VueComponentInstance,
): Nullable<Record<string, unknown>> {
  if (!isRecord(instance.ctx)) {
    return null;
  }

  const state: Record<string, unknown> = {};
  const skipKeys = new Set([
    '_',
    '$', // Private/internal
    'props',
    'attrs',
    'slots',
    'refs',
    'emit', // Built-in
    'expose',
    'forceUpdate',
    'nextTick', // Methods
  ]);

  for (const [key, value] of Object.entries(instance.ctx)) {
    // Skip private/built-in keys
    if (key.startsWith('_') || key.startsWith('$')) {
      continue;
    }

    // Skip known built-in properties
    if (skipKeys.has(key)) {
      continue;
    }

    // Skip functions
    if (typeof value === 'function') {
      continue;
    }

    // Skip internal Vue properties
    if (shouldSkipStateKey(key)) {
      continue;
    }

    state[key] = value;
  }

  return Object.keys(state).length > 0 ? state : null;
}

/**
 * Check if a state key should be skipped
 * @internal
 */
function shouldSkipStateKey(key: string): boolean {
  // Skip Vue internal state keys
  if (VUE_INTERNAL_STATE_KEYS.has(key)) {
    return true;
  }

  // Skip private/internal keys
  if (key.startsWith('_') || key.startsWith('$') || key.startsWith('__')) {
    return true;
  }

  return false;
}
