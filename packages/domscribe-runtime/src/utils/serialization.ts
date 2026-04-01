/**
 * Safe serialization utilities for runtime data
 * Handles circular references, special values, and depth limits
 * @module @domscribe/runtime/utils/serialization
 */

import { SerializationError } from '../errors/index.js';
import {
  SerializationOptions,
  SENTINEL_REF,
  isRecord,
  isSerializedSpecialType,
} from './serialization-utils.js';

/**
 * Safely serialize a value, handling circular references and special cases.
 *
 * We have our own serialization logic because JSON.stringify() would:
 * 1. Throw an error if the value contains a circular reference
 * 2. Remove functions, maps and symbols
 * 3. Not allow depth control (Could serialize the entire app tree)
 *
 * To avoid these issues, our solution is:
 * 1. Handle circular references
 *   - WeakSet tracking of visited objects
 *   - Sentinel value [Circular Reference]
 *   - Clean up WeakSet after traversal (memory efficiency)
 * 2. Depth limiting
 *   - maxDepth is 10 by default
 *   - Early exit with sentinel [Max Depth Exceeded]
 *   - User-configurable maxDepth for special cases
 * 3. Handle special types
 *   - `Function` -> `[Function]` sentinel
 *   - `Symbol` ---> `[Symbol]` sentinel
 *   - `Map` ------> `{ __type: 'Map', entries: [key, value] }`
 *   - `Set` ------> `{ __type: 'Set', values: [value] }`
 *   - `Date` -----> ISO string
 *   - `RegExp` ---> `[RegExp: /pattern/flags]`
 *   - `Error` ----> `{ name: string, message: string, stack: string }`
 *   - `BigInt` ---> `[BigInt: value]`
 * 4. First class redaction integration
 * 5. Better error handling
 *   - Readable sentinel values are critical for debugging
 *
 * Example props capture:
 * ```
 * const props = {
 *   email: 'user@example.com',
 *   onClick: function () {},
 *   validUntil: new Date(),
 *   metadata: new Map([...]),
 * }
 * ```
 *
 * Redacted props:
 * ```
 * const props = {
 *   email: '[REDACTED]',
 *   onClick: '[Function]',
 *   validUntil: '2025-01-01T00:00:00.000Z',
 *   metadata: { __type: 'Map', entries: [...] },
 * }
 * ```
 *
 * Example React fiber node structure:
 * ```
 * const fiber = {
 *   tag: 0,
 *   type: function Component() {},
 *   memoizedProps: { onClick: fn },
 *   memoizedState: new Map([...]),
 *   return: parentFiber,
 *   child: childFiber,
 *   sibling: siblingFiber,
 *   _debugOwner: fiber,
 *   $$typeof: Symbol.for('react.element')
 * }
 * ```
 *
 * Example Vue component instance structure:
 * ```
 * const instance = {
 *   $data: { count: 0 },
 *   $props: { onUpdate: fn },
 *   $parent: parentInstance,
 *   $children: [childInstance],
 *   $refs: { input: domElement },
 *   _uid: Symbol('uid'),
 *   $options: {
 *     computed: { value: fn }
 *   }
 * }
 * ```
 *
 * @param value - The value to serialize
 * @param options - Serialization options
 * @returns Serialized value safe for JSON stringification
 */
export function serializeValue(
  value: unknown,
  options: SerializationOptions = {},
): unknown {
  const {
    maxDepth = 6,
    maxArrayLength = 20,
    maxStringLength = 2048,
    maxProperties = 50,
    maxTotalBytes = 262144,
    includeFunctions = false,
    replacer,
    skipKeys,
    skipKeyPrefixes,
  } = options;

  /*
   * Track visited objects to detect circular references. WeakSets are
   * memory efficient because they are automatically garbage collected.
   */
  const seen = new WeakSet<object>();

  /*
   * Byte budget tracker. Shared across the entire serialization tree.
   * This is an approximation — we count string lengths and number
   * representation sizes as they are serialized.
   */
  const budget = { bytesUsed: 0 };

  function trackBytes(val: unknown): void {
    if (typeof val === 'string') {
      budget.bytesUsed += val.length;
    } else if (typeof val === 'number') {
      budget.bytesUsed += 8;
    } else if (typeof val === 'boolean') {
      budget.bytesUsed += 5;
    }
  }

  function isBudgetExceeded(): boolean {
    return budget.bytesUsed > maxTotalBytes;
  }

  function serialize(val: unknown, depth: number): unknown {
    // Check byte budget
    if (isBudgetExceeded()) {
      trackBytes(SENTINEL_REF.TRUNCATED);
      return SENTINEL_REF.TRUNCATED;
    }

    // Check depth limit
    if (depth > maxDepth) {
      trackBytes(SENTINEL_REF.MAX_DEPTH);
      return SENTINEL_REF.MAX_DEPTH;
    }

    // Handle primitives
    if (val === null) return null;
    if (val === undefined) return SENTINEL_REF.UNDEFINED;

    const type = typeof val;

    if (type === 'string') {
      const str = val as string;
      if (str.length > maxStringLength) {
        const truncated = str.slice(0, maxStringLength) + '... [truncated]';
        trackBytes(truncated);
        return truncated;
      }
      trackBytes(str);
      return str;
    }

    if (type === 'number' || type === 'boolean') {
      trackBytes(val);
      return val;
    }

    if (type === 'function') {
      return includeFunctions ? SENTINEL_REF.FUNCTION : undefined;
    }

    if (type === 'symbol') {
      return SENTINEL_REF.SYMBOL;
    }

    // Handle special objects
    if (type === 'bigint') {
      const result = `[BigInt: ${val.toString()}]`;
      trackBytes(result);
      return result;
    }

    // Handle objects and arrays
    if (type === 'object' && val !== null && typeof val === 'object') {
      // Check for circular reference
      if (seen.has(val)) {
        return SENTINEL_REF.CIRCULAR;
      }

      seen.add(val);

      try {
        // Handle Date
        if (val instanceof Date) {
          const result = val.toISOString();
          trackBytes(result);
          return result;
        }

        // Handle RegExp
        if (val instanceof RegExp) {
          const result = `[RegExp: ${val.toString()}]`;
          trackBytes(result);
          return result;
        }

        // Handle Error
        if (val instanceof Error) {
          return {
            name: val.name,
            message: val.message,
            stack: val.stack,
          };
        }

        // Handle Map
        if (val instanceof Map) {
          const entries: Array<[unknown, unknown]> = [];
          let count = 0;
          for (const [k, v] of val.entries()) {
            if (count >= maxArrayLength) break;
            entries.push([serialize(k, depth + 1), serialize(v, depth + 1)]);
            count++;
          }
          const result: Record<string, unknown> = {
            __type: 'Map',
            entries,
          };
          if (val.size > maxArrayLength) {
            result.__truncated = true;
            result.originalSize = val.size;
          }
          return result;
        }

        // Handle Set
        if (val instanceof Set) {
          const values: unknown[] = [];
          let count = 0;
          for (const v of val.values()) {
            if (count >= maxArrayLength) break;
            values.push(serialize(v, depth + 1));
            count++;
          }
          const result: Record<string, unknown> = {
            __type: 'Set',
            values,
          };
          if (val.size > maxArrayLength) {
            result.__truncated = true;
            result.originalSize = val.size;
          }
          return result;
        }

        // Handle Array
        if (Array.isArray(val)) {
          const items = val.slice(0, maxArrayLength);
          const serialized = items.map((item) => serialize(item, depth + 1));
          if (val.length > maxArrayLength) {
            serialized.push({
              __truncated: true,
              originalLength: val.length,
            });
          }
          return serialized;
        }

        // Handle plain objects
        if (isRecord(val)) {
          const serialized: Record<string, unknown> = {};
          const keys = Object.keys(val);
          let propCount = 0;

          for (const key of keys) {
            if (propCount >= maxProperties) break;

            if (Object.prototype.hasOwnProperty.call(val, key)) {
              // Skip framework-internal keys by exact match or prefix
              if (skipKeys?.has(key)) continue;
              if (skipKeyPrefixes?.some((p) => key.startsWith(p))) continue;

              const propValue = val[key];
              const serializedValue = replacer
                ? replacer(key, propValue)
                : serialize(propValue, depth + 1);

              if (serializedValue !== undefined) {
                serialized[key] = serializedValue;
                propCount++;
              }
            }
          }

          if (keys.length > maxProperties && propCount >= maxProperties) {
            serialized.__truncated = true;
            serialized.__originalKeyCount = keys.length;
          }

          return serialized;
        }

        // Non-plain object, return string representation
        return `[Object: ${Object.prototype.toString.call(val)}]`;
      } finally {
        seen.delete(val);
      }
    }

    // Unknown type
    return `[Unknown: ${String(val)}]`;
  }

  try {
    return serialize(value, 0);
  } catch (error) {
    throw new SerializationError(
      'Failed to serialize value',
      error instanceof Error ? error : undefined,
    );
  }
}

/**
 * Deserialize a value that was serialized with serializeValue
 *
 * @param value - The serialized value
 * @returns Deserialized value
 */
export function deserializeValue(value: unknown): unknown {
  if (value === null || value === undefined) {
    return value;
  }

  // Handle sentinel values
  if (value === SENTINEL_REF.CIRCULAR) {
    return '[Circular]';
  }

  if (value === SENTINEL_REF.FUNCTION) {
    return '[Function]';
  }

  if (value === SENTINEL_REF.UNDEFINED) {
    return undefined;
  }

  if (value === SENTINEL_REF.SYMBOL) {
    return Symbol('deserialized');
  }

  if (value === SENTINEL_REF.MAX_DEPTH) {
    return '[Max Depth]';
  }

  if (value === SENTINEL_REF.TRUNCATED) {
    return '[Truncated]';
  }

  const type = typeof value;

  if (type === 'string' || type === 'number' || type === 'boolean') {
    return value;
  }

  if (type === 'object' && value !== null && typeof value === 'object') {
    // Handle special types
    if (isSerializedSpecialType(value)) {
      if (value.__type === 'Map' && 'entries' in value) {
        const entries = value.entries;
        if (Array.isArray(entries)) {
          return new Map(
            entries.map(([k, v]) => [deserializeValue(k), deserializeValue(v)]),
          );
        }
      }

      if (value.__type === 'Set' && 'values' in value) {
        const values = value.values;
        if (Array.isArray(values)) {
          return new Set(values.map((v) => deserializeValue(v)));
        }
      }
    }

    // Handle Array
    if (Array.isArray(value)) {
      return value.map((item) => deserializeValue(item));
    }

    // Handle plain objects
    if (isRecord(value)) {
      const deserialized: Record<string, unknown> = {};
      for (const key in value) {
        if (Object.prototype.hasOwnProperty.call(value, key)) {
          deserialized[key] = deserializeValue(value[key]);
        }
      }

      return deserialized;
    }
  }

  return value;
}

/**
 * Safely convert a value to JSON string
 *
 * @param value - The value to convert
 * @param options - Serialization options
 * @returns JSON string
 */
export function toJSON(
  value: unknown,
  options: SerializationOptions = {},
): string {
  const serialized = serializeValue(value, options);
  return JSON.stringify(serialized, null, 2);
}

/**
 * Safely parse a JSON string with deserialization
 *
 * @param json - The JSON string
 * @returns Deserialized value
 */
export function fromJSON(json: string): unknown {
  const parsed = JSON.parse(json);
  return deserializeValue(parsed);
}
