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
  const { maxDepth = 10, includeFunctions = false, replacer } = options;

  /*
   * Track visited objects to detect circular references. WeakSets are
   * memory efficient because they are automatically garbage collected.
   */
  const seen = new WeakSet<object>();

  function serialize(val: unknown, depth: number): unknown {
    // Check depth limit
    if (depth > maxDepth) {
      return SENTINEL_REF.MAX_DEPTH;
    }

    // Handle primitives
    if (val === null) return null;
    if (val === undefined) return SENTINEL_REF.UNDEFINED;

    const type = typeof val;

    if (type === 'string' || type === 'number' || type === 'boolean') {
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
      return `[BigInt: ${val.toString()}]`;
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
          return val.toISOString();
        }

        // Handle RegExp
        if (val instanceof RegExp) {
          return `[RegExp: ${val.toString()}]`;
        }

        // Handle Error
        if (val instanceof Error) {
          return {
            name: val.name,
            message: val.message,
            stack: val.stack,
          };
        }

        /*
         * Handle Map.

         * Example:
         * ```
         * {
         *   foo: 'bar',
         *   baz: 'qux',
         *   quux: {
         *     quuz: 'corge',
         *     grault: 'garply',
         *     waldo: 'fred',
         *   }
         * }
         * 
         * depth = 0
         * ```
         */
        if (val instanceof Map) {
          const entries: Array<[unknown, unknown]> = [];
          /*
           * keys and values per iteration
           * - ['foo', 'bar']
           * - ['baz', 'qux']
           * - ['quux', { quuz: 'corge', grault: 'garply', waldo: 'fred' }]
           */
          for (const [k, v] of val.entries()) {
            /*
             * [[serialize('foo', 1), serialize('bar'), 1],
             *  [serialize('baz', 1), serialize('qux'), 1],
             *  [serialize('quux', 1), serialize({ quuz: 'corge', grault: 'garply', waldo: 'fred' }), 1]
             */
            entries.push([serialize(k, depth + 1), serialize(v, depth + 1)]);
          }
          /*
           * {
           *   __type: 'Map',
           *   entries: [
           *     ['foo', 'bar'],
           *     ['baz', 'qux'],
           *     ['quux', {
           *       __type: 'Map',
           *       entries: [
           *         ['quuz', 'corge'],
           *         ['grault', 'garply'],
           *         ['waldo', 'fred']
           *       ]
           *     }]
           *   ]
           * }
           */
          return { __type: 'Map', entries };
        }

        // Handle Set
        if (val instanceof Set) {
          const values: unknown[] = [];
          for (const v of val.values()) {
            values.push(serialize(v, depth + 1));
          }
          return { __type: 'Set', values };
        }

        // Handle Array
        if (Array.isArray(val)) {
          /*
           * Example:
           * ```
           * [1, 2, Map([['foo', 'bar']])]
           * ```
           *
           * Serialized:
           * ```
           * [1, 2, { __type: 'Map', entries: [['foo', 'bar']] }]
           * ```
           */
          return val.map((item) => serialize(item, depth + 1));
        }

        // Handle plain objects
        if (isRecord(val)) {
          const serialized: Record<string, unknown> = {};
          for (const key in val) {
            if (Object.prototype.hasOwnProperty.call(val, key)) {
              const propValue = val[key];
              const serializedValue = replacer
                ? replacer(key, propValue)
                : serialize(propValue, depth + 1);

              if (serializedValue !== undefined) {
                serialized[key] = serializedValue;
              }
            }
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
