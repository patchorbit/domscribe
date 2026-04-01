/**
 * Shared types and helpers for the serialization module
 * @module @domscribe/runtime/utils/serialization-utils
 */

import type { SerializationConstraints } from '../capture/types.js';

/**
 * Full serialization options for the internal `serializeValue()` function.
 *
 * Extends user-facing `SerializationConstraints` (sizing limits) with
 * internal-only options (replacer, skip keys, function handling) that
 * are set by the capture layer, not by end users.
 */
export interface SerializationOptions extends SerializationConstraints {
  /**
   * Whether to include function references
   * @default false
   */
  includeFunctions?: boolean;

  /**
   * Custom replacer for special values.
   * Return value is used directly as the serialized output.
   * Return `undefined` to skip the property entirely.
   */
  replacer?: (key: string, value: unknown) => unknown;

  /**
   * Set of property keys to skip during serialization.
   * Properties with these keys are omitted from the output at any depth.
   */
  skipKeys?: Set<string>;

  /**
   * Key prefixes to skip during serialization.
   * Any property whose key starts with one of these prefixes is omitted.
   */
  skipKeyPrefixes?: string[];
}

/**
 * Sentinel values used to represent non-serializable types in output.
 * Each sentinel is a human-readable string that aids debugging.
 */
export const SENTINEL_REF = {
  /**
   * Sentinel value for circular references
   */
  CIRCULAR: '[Circular Reference]',
  /**
   * Sentinel value for functions
   */
  FUNCTION: '[Function]',
  /**
   * Sentinel value for undefined
   */
  UNDEFINED: '[Undefined]',
  /**
   * Sentinel value for symbols
   */
  SYMBOL: '[Symbol]',
  /**
   * Sentinel value for max depth exceeded
   */
  MAX_DEPTH: '[Max Depth Exceeded]',
  /**
   * Sentinel value for truncated output (byte budget exceeded)
   */
  TRUNCATED: '[Truncated: size limit]',
} as const;

/**
 * Type guard to check if a value is an object (non-null object type)
 *
 * Note: In JS, `Array` and `Object` are both `object` types.
 */
export function isObject(value: unknown): value is object {
  return typeof value === 'object' && value !== null;
}

/**
 * Type guard to check if a value is a record
 */
export function isRecord(value: unknown): value is Record<string, unknown> {
  return isObject(value) && !Array.isArray(value);
}

/**
 * Type guard for special serialized interface that domscribe uses
 * to serialize special types like Map, Set, Date, RegExp, Error, BigInt.
 */
export interface SerializedSpecialType {
  __type: string;
  [key: string]: unknown;
}

export function isSerializedSpecialType(
  value: unknown,
): value is SerializedSpecialType {
  return (
    isObject(value) && '__type' in value && typeof value.__type === 'string'
  );
}
