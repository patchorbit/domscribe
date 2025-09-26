/**
 * Shared types and helpers for the serialization module
 * @module @domscribe/runtime/utils/serialization-utils
 */

/**
 * Options for serialization
 */
export interface SerializationOptions {
  /**
   * Maximum depth for object traversal
   * @default 10
   */
  maxDepth?: number;

  /**
   * Whether to include function references
   * @default false
   */
  includeFunctions?: boolean;

  /**
   * Custom replacer for special values
   */
  replacer?: (key: string, value: unknown) => unknown;
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
