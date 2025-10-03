/**
 * Props extractor - extracts props from Vue component instances
 * NOT exported from the package.
 *
 * @internal
 * @module @domscribe/vue/internals/props-extractor
 */

import type { VueComponentInstance, Nullable } from './types.js';
import { VUE_INTERNAL_PROPS } from './constants.js';
import { isRecord, isVueRef } from './type-guards.js';
import { PropsExtractionError } from '../errors/index.js';

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
      if (k.startsWith('__v_')) continue;
      result[k] = unwrapRefs(v, depth + 1);
    }
    return result;
  }

  return value;
}

/**
 * Result of props extraction
 * @internal
 */
export interface PropsExtractionResult {
  success: boolean;
  props?: Record<string, unknown>;
  error?: Error;
}

/**
 * Extract props from a Vue component instance
 *
 * @param instance - The Vue component instance
 * @returns Extraction result with props or error
 * @internal
 */
export function extractProps(
  instance: VueComponentInstance,
): PropsExtractionResult {
  try {
    const rawProps = getRawProps(instance);

    if (!rawProps) {
      return {
        success: true,
        props: {},
      };
    }

    const filteredProps = filterProps(rawProps);
    const unwrappedProps = unwrapRefs(filteredProps) as Record<string, unknown>;

    return {
      success: true,
      props: unwrappedProps,
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error
          : new PropsExtractionError('Props extraction failed'),
    };
  }
}

/**
 * Get raw props from component instance
 * @internal
 */
function getRawProps(
  instance: VueComponentInstance,
): Nullable<Record<string, unknown>> {
  // Primary source: instance.props
  if (isRecord(instance.props) && Object.keys(instance.props).length > 0) {
    return instance.props;
  }

  // Fallback: vnode.props
  if (
    instance.vnode &&
    isRecord(instance.vnode.props) &&
    Object.keys(instance.vnode.props).length > 0
  ) {
    return instance.vnode.props;
  }

  // Fallback: proxy.$props
  if (
    instance.proxy &&
    isRecord(instance.proxy.$props) &&
    Object.keys(instance.proxy.$props).length > 0
  ) {
    return instance.proxy.$props;
  }

  return null;
}

/**
 * Filter out Vue internal props
 * @internal
 */
function filterProps(props: Record<string, unknown>): Record<string, unknown> {
  const filtered: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(props)) {
    // Skip internal props
    if (shouldSkipProp(key)) {
      continue;
    }

    filtered[key] = value;
  }

  return filtered;
}

/**
 * Check if a prop should be skipped
 * @internal
 */
function shouldSkipProp(key: string): boolean {
  // Skip Vue internal props
  if (VUE_INTERNAL_PROPS.has(key)) {
    return true;
  }

  // Skip event handlers (on* props)
  if (
    key.startsWith('on') &&
    key.length > 2 &&
    key[2] === key[2].toUpperCase()
  ) {
    return true;
  }

  // Skip private/internal keys
  if (key.startsWith('_') || key.startsWith('$')) {
    return true;
  }

  return false;
}
