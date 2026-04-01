/**
 * Tests for serialization utilities
 *
 * Tests safe serialization/deserialization of runtime data with circular references,
 * special values, and depth limits. Follows Arrange-Act-Assert methodology.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  serializeValue,
  deserializeValue,
  toJSON,
  fromJSON,
} from './serialization.js';
import { SerializationError } from '../errors/index.js';
import { SENTINEL_REF } from './serialization-utils.js';

describe('serializeValue', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Primitives', () => {
    it('should serialize null', () => {
      // Arrange
      const value = null;

      // Act
      const result = serializeValue(value);

      // Assert
      expect(result).toBeNull();
    });

    it('should serialize undefined as sentinel', () => {
      // Arrange
      const value = undefined;

      // Act
      const result = serializeValue(value);

      // Assert
      expect(result).toBe(SENTINEL_REF.UNDEFINED);
    });

    it('should serialize string primitives', () => {
      // Arrange
      const value = 'hello world';

      // Act
      const result = serializeValue(value);

      // Assert
      expect(result).toBe('hello world');
    });

    it('should serialize empty strings', () => {
      // Arrange
      const value = '';

      // Act
      const result = serializeValue(value);

      // Assert
      expect(result).toBe('');
    });

    it('should serialize number primitives', () => {
      // Arrange
      const value = 42;

      // Act
      const result = serializeValue(value);

      // Assert
      expect(result).toBe(42);
    });

    it('should serialize zero', () => {
      // Arrange
      const value = 0;

      // Act
      const result = serializeValue(value);

      // Assert
      expect(result).toBe(0);
    });

    it('should serialize negative numbers', () => {
      // Arrange
      const value = -123.456;

      // Act
      const result = serializeValue(value);

      // Assert
      expect(result).toBe(-123.456);
    });

    it('should serialize NaN', () => {
      // Arrange
      const value = NaN;

      // Act
      const result = serializeValue(value);

      // Assert
      expect(result).toBeNaN();
    });

    it('should serialize Infinity', () => {
      // Arrange
      const value = Infinity;

      // Act
      const result = serializeValue(value);

      // Assert
      expect(result).toBe(Infinity);
    });

    it('should serialize boolean primitives', () => {
      // Arrange
      const trueValue = true;
      const falseValue = false;

      // Act
      const trueResult = serializeValue(trueValue);
      const falseResult = serializeValue(falseValue);

      // Assert
      expect(trueResult).toBe(true);
      expect(falseResult).toBe(false);
    });

    it('should serialize bigint as string representation', () => {
      // Arrange
      const value = BigInt('9007199254740991');

      // Act
      const result = serializeValue(value);

      // Assert
      expect(result).toBe('[BigInt: 9007199254740991]');
    });

    it('should serialize very large bigint', () => {
      // Arrange
      const value = BigInt('999999999999999999999999999');

      // Act
      const result = serializeValue(value);

      // Assert
      expect(result).toBe('[BigInt: 999999999999999999999999999]');
    });

    it('should serialize symbol as sentinel', () => {
      // Arrange
      const value = Symbol('test');

      // Act
      const result = serializeValue(value);

      // Assert
      expect(result).toBe(SENTINEL_REF.SYMBOL);
    });

    it('should serialize well-known symbols as sentinel', () => {
      // Arrange
      const value = Symbol.for('react.element');

      // Act
      const result = serializeValue(value);

      // Assert
      expect(result).toBe(SENTINEL_REF.SYMBOL);
    });
  });

  describe('Functions', () => {
    it('should exclude functions by default', () => {
      // Arrange
      const value = function testFunction() {
        return 42;
      };

      // Act
      const result = serializeValue(value);

      // Assert
      expect(result).toBeUndefined();
    });

    it('should serialize functions as sentinel when includeFunctions is true', () => {
      // Arrange
      const value = () => 'hello';

      // Act
      const result = serializeValue(value, { includeFunctions: true });

      // Assert
      expect(result).toBe(SENTINEL_REF.FUNCTION);
    });

    it('should serialize arrow functions as sentinel when includeFunctions is true', () => {
      // Arrange
      const value = () => {
        // noop
      };

      // Act
      const result = serializeValue(value, { includeFunctions: true });

      // Assert
      expect(result).toBe(SENTINEL_REF.FUNCTION);
    });

    it('should serialize async functions as sentinel when includeFunctions is true', () => {
      // Arrange
      const value = async () => {
        // noop
      };

      // Act
      const result = serializeValue(value, { includeFunctions: true });

      // Assert
      expect(result).toBe(SENTINEL_REF.FUNCTION);
    });
  });

  describe('Special Objects', () => {
    it('should serialize Date to ISO string', () => {
      // Arrange
      const value = new Date('2025-01-01T00:00:00.000Z');

      // Act
      const result = serializeValue(value);

      // Assert
      expect(result).toBe('2025-01-01T00:00:00.000Z');
    });

    it('should serialize Date with timezone', () => {
      // Arrange
      const value = new Date('2025-06-15T12:30:45.123Z');

      // Act
      const result = serializeValue(value);

      // Assert
      expect(result).toBe('2025-06-15T12:30:45.123Z');
    });

    it('should serialize RegExp to string representation', () => {
      // Arrange
      const value = /test/gi;

      // Act
      const result = serializeValue(value);

      // Assert
      expect(result).toBe('[RegExp: /test/gi]');
    });

    it('should serialize RegExp without flags', () => {
      // Arrange
      const value = /pattern/;

      // Act
      const result = serializeValue(value);

      // Assert
      expect(result).toBe('[RegExp: /pattern/]');
    });

    it('should serialize RegExp with special characters', () => {
      // Arrange
      const value = /[a-z0-9]+@[a-z]+\.[a-z]{2,}/i;

      // Act
      const result = serializeValue(value);

      // Assert
      expect(result).toBe('[RegExp: /[a-z0-9]+@[a-z]+\\.[a-z]{2,}/i]');
    });

    it('should serialize Error with all properties', () => {
      // Arrange
      const value = new Error('Test error');
      value.stack = 'Error: Test error\n  at test.js:1:1';

      // Act
      const result = serializeValue(value);

      // Assert
      expect(result).toEqual({
        name: 'Error',
        message: 'Test error',
        stack: 'Error: Test error\n  at test.js:1:1',
      });
    });

    it('should serialize custom Error subclasses', () => {
      // Arrange
      const value = new TypeError('Type mismatch');

      // Act
      const result = serializeValue(value);

      // Assert
      expect(result).toEqual({
        name: 'TypeError',
        message: 'Type mismatch',
        stack: expect.any(String),
      });
    });

    it('should serialize Error without stack', () => {
      // Arrange
      const value = new Error('No stack');
      delete value.stack;

      // Act
      const result = serializeValue(value);

      // Assert
      expect(result).toEqual({
        name: 'Error',
        message: 'No stack',
        stack: undefined,
      });
    });
  });

  describe('Map Serialization', () => {
    it('should serialize empty Map', () => {
      // Arrange
      const value = new Map();

      // Act
      const result = serializeValue(value);

      // Assert
      expect(result).toEqual({
        __type: 'Map',
        entries: [],
      });
    });

    it('should serialize Map with primitive entries', () => {
      // Arrange
      const value = new Map([
        ['key1', 'value1'],
        ['key2', 'value2'],
      ]);

      // Act
      const result = serializeValue(value);

      // Assert
      expect(result).toEqual({
        __type: 'Map',
        entries: [
          ['key1', 'value1'],
          ['key2', 'value2'],
        ],
      });
    });

    it('should serialize Map with number keys', () => {
      // Arrange
      const value = new Map([
        [1, 'one'],
        [2, 'two'],
        [3, 'three'],
      ]);

      // Act
      const result = serializeValue(value);

      // Assert
      expect(result).toEqual({
        __type: 'Map',
        entries: [
          [1, 'one'],
          [2, 'two'],
          [3, 'three'],
        ],
      });
    });

    it('should serialize Map with object values', () => {
      // Arrange
      const value = new Map([
        ['user', { name: 'Alice', age: 30 }],
        ['admin', { name: 'Bob', role: 'admin' }],
      ]);

      // Act
      const result = serializeValue(value);

      // Assert
      expect(result).toEqual({
        __type: 'Map',
        entries: [
          ['user', { name: 'Alice', age: 30 }],
          ['admin', { name: 'Bob', role: 'admin' }],
        ],
      });
    });

    it('should serialize nested Maps', () => {
      // Arrange
      const innerMap = new Map([
        ['inner1', 'value1'],
        ['inner2', 'value2'],
      ]);
      const value = new Map([['outer', innerMap]]);

      // Act
      const result = serializeValue(value);

      // Assert
      expect(result).toEqual({
        __type: 'Map',
        entries: [
          [
            'outer',
            {
              __type: 'Map',
              entries: [
                ['inner1', 'value1'],
                ['inner2', 'value2'],
              ],
            },
          ],
        ],
      });
    });

    it('should serialize Map with mixed key types', () => {
      // Arrange
      const value = new Map<string, string | { id: number }>([
        ['string', 'value1'],
        ['42', 'value2'],
        ['objKey', { id: 1 }],
      ]);

      // Act
      const result = serializeValue(value);

      // Assert
      expect(result).toEqual({
        __type: 'Map',
        entries: [
          ['string', 'value1'],
          ['42', 'value2'],
          ['objKey', { id: 1 }],
        ],
      });
    });
  });

  describe('Set Serialization', () => {
    it('should serialize empty Set', () => {
      // Arrange
      const value = new Set();

      // Act
      const result = serializeValue(value);

      // Assert
      expect(result).toEqual({
        __type: 'Set',
        values: [],
      });
    });

    it('should serialize Set with primitive values', () => {
      // Arrange
      const value = new Set([1, 2, 3, 4, 5]);

      // Act
      const result = serializeValue(value);

      // Assert
      expect(result).toEqual({
        __type: 'Set',
        values: [1, 2, 3, 4, 5],
      });
    });

    it('should serialize Set with string values', () => {
      // Arrange
      const value = new Set(['apple', 'banana', 'cherry']);

      // Act
      const result = serializeValue(value);

      // Assert
      expect(result).toEqual({
        __type: 'Set',
        values: ['apple', 'banana', 'cherry'],
      });
    });

    it('should serialize Set with mixed types', () => {
      // Arrange
      const value = new Set([1, 'two', true, null]);

      // Act
      const result = serializeValue(value);

      // Assert
      expect(result).toEqual({
        __type: 'Set',
        values: [1, 'two', true, null],
      });
    });

    it('should serialize Set with object values', () => {
      // Arrange
      const value = new Set([{ id: 1 }, { id: 2 }]);

      // Act
      const result = serializeValue(value);

      // Assert
      expect(result).toEqual({
        __type: 'Set',
        values: [{ id: 1 }, { id: 2 }],
      });
    });

    it('should serialize nested Sets', () => {
      // Arrange
      const innerSet = new Set([1, 2, 3]);
      const value = new Set([innerSet, 'value']);

      // Act
      const result = serializeValue(value);

      // Assert
      expect(result).toEqual({
        __type: 'Set',
        values: [
          {
            __type: 'Set',
            values: [1, 2, 3],
          },
          'value',
        ],
      });
    });
  });

  describe('Arrays', () => {
    it('should serialize empty array', () => {
      // Arrange
      const value: unknown[] = [];

      // Act
      const result = serializeValue(value);

      // Assert
      expect(result).toEqual([]);
    });

    it('should serialize array with primitives', () => {
      // Arrange
      const value = [1, 'two', true, null];

      // Act
      const result = serializeValue(value);

      // Assert
      expect(result).toEqual([1, 'two', true, null]);
    });

    it('should serialize array with undefined elements', () => {
      // Arrange
      const value = [1, undefined, 3];

      // Act
      const result = serializeValue(value);

      // Assert
      expect(result).toEqual([1, SENTINEL_REF.UNDEFINED, 3]);
    });

    it('should serialize nested arrays', () => {
      // Arrange
      const value = [
        [1, 2],
        [3, 4],
        [5, 6],
      ];

      // Act
      const result = serializeValue(value);

      // Assert
      expect(result).toEqual([
        [1, 2],
        [3, 4],
        [5, 6],
      ]);
    });

    it('should serialize array with objects', () => {
      // Arrange
      const value = [
        { id: 1, name: 'Alice' },
        { id: 2, name: 'Bob' },
      ];

      // Act
      const result = serializeValue(value);

      // Assert
      expect(result).toEqual([
        { id: 1, name: 'Alice' },
        { id: 2, name: 'Bob' },
      ]);
    });

    it('should serialize array with special objects', () => {
      // Arrange
      const value = [
        new Date('2025-01-01'),
        /test/i,
        new Map([['key', 'value']]),
      ];

      // Act
      const result = serializeValue(value);

      // Assert
      expect(result).toEqual([
        '2025-01-01T00:00:00.000Z',
        '[RegExp: /test/i]',
        {
          __type: 'Map',
          entries: [['key', 'value']],
        },
      ]);
    });

    it('should serialize sparse arrays', () => {
      // Arrange
      const value: unknown[] = [];
      value[0] = 'first';
      value[5] = 'sixth';

      // Act
      const result = serializeValue(value);

      // Assert
      expect(result).toHaveLength(6);
      // Note: Array.map() skips holes in sparse arrays, so undefined remains undefined
      expect(result).toEqual([
        'first',
        undefined,
        undefined,
        undefined,
        undefined,
        'sixth',
      ]);
    });
  });

  describe('Plain Objects', () => {
    it('should serialize empty object', () => {
      // Arrange
      const value = {};

      // Act
      const result = serializeValue(value);

      // Assert
      expect(result).toEqual({});
    });

    it('should serialize object with primitive properties', () => {
      // Arrange
      const value = {
        name: 'Alice',
        age: 30,
        active: true,
      };

      // Act
      const result = serializeValue(value);

      // Assert
      expect(result).toEqual({
        name: 'Alice',
        age: 30,
        active: true,
      });
    });

    it('should serialize object with null and undefined properties', () => {
      // Arrange
      const value = {
        present: 'value',
        nullable: null,
        missing: undefined,
      };

      // Act
      const result = serializeValue(value);

      // Assert
      expect(result).toEqual({
        present: 'value',
        nullable: null,
        missing: SENTINEL_REF.UNDEFINED,
      });
    });

    it('should serialize nested objects', () => {
      // Arrange
      const value = {
        user: {
          name: 'Alice',
          address: {
            city: 'New York',
            zip: '10001',
          },
        },
      };

      // Act
      const result = serializeValue(value);

      // Assert
      expect(result).toEqual({
        user: {
          name: 'Alice',
          address: {
            city: 'New York',
            zip: '10001',
          },
        },
      });
    });

    it('should serialize object with array properties', () => {
      // Arrange
      const value = {
        items: [1, 2, 3],
        tags: ['a', 'b', 'c'],
      };

      // Act
      const result = serializeValue(value);

      // Assert
      expect(result).toEqual({
        items: [1, 2, 3],
        tags: ['a', 'b', 'c'],
      });
    });

    it('should serialize object with special type properties', () => {
      // Arrange
      const value = {
        timestamp: new Date('2025-01-01'),
        pattern: /test/i,
        metadata: new Map([['key', 'value']]),
      };

      // Act
      const result = serializeValue(value);

      // Assert
      expect(result).toEqual({
        timestamp: '2025-01-01T00:00:00.000Z',
        pattern: '[RegExp: /test/i]',
        metadata: {
          __type: 'Map',
          entries: [['key', 'value']],
        },
      });
    });

    it('should only serialize own properties', () => {
      // Arrange
      const proto = { inherited: 'value' };
      const value = Object.create(proto);
      value.own = 'property';

      // Act
      const result = serializeValue(value);

      // Assert
      expect(result).toEqual({
        own: 'property',
      });
    });

    it('should exclude function properties by default', () => {
      // Arrange
      const value = {
        name: 'test',
        method: () => {
          // noop
        },
        value: 42,
      };

      // Act
      const result = serializeValue(value);

      // Assert
      expect(result).toEqual({
        name: 'test',
        value: 42,
      });
    });

    it('should include function properties when includeFunctions is true', () => {
      // Arrange
      const value = {
        name: 'test',
        method: () => {
          // noop
        },
        value: 42,
      };

      // Act
      const result = serializeValue(value, { includeFunctions: true });

      // Assert
      expect(result).toEqual({
        name: 'test',
        method: SENTINEL_REF.FUNCTION,
        value: 42,
      });
    });
  });

  describe('Circular References', () => {
    it('should handle circular reference in object', () => {
      // Arrange
      const value: Record<string, unknown> = { name: 'test' };
      value.self = value;

      // Act
      const result = serializeValue(value);

      // Assert
      expect(result).toEqual({
        name: 'test',
        self: SENTINEL_REF.CIRCULAR,
      });
    });

    it('should handle circular reference in nested object', () => {
      // Arrange
      const inner: Record<string, unknown> = { id: 1 };
      const outer: Record<string, unknown> = { inner };
      inner.outer = outer;

      // Act
      const result = serializeValue(outer);

      // Assert
      expect(result).toEqual({
        inner: {
          id: 1,
          outer: SENTINEL_REF.CIRCULAR,
        },
      });
    });

    it('should handle circular reference in array', () => {
      // Arrange
      const value: unknown[] = [1, 2, 3];
      value.push(value);

      // Act
      const result = serializeValue(value);

      // Assert
      expect(result).toEqual([1, 2, 3, SENTINEL_REF.CIRCULAR]);
    });

    it('should handle multiple references to same object (not circular)', () => {
      // Arrange
      const shared = { id: 1 };
      const value = {
        first: shared,
        second: shared,
      };

      // Act
      const result = serializeValue(value);

      // Assert
      // Note: WeakSet is cleaned up after each object traversal,
      // so the same object can be visited multiple times
      expect(result).toEqual({
        first: { id: 1 },
        second: { id: 1 },
      });
    });

    it('should handle complex circular reference chain', () => {
      // Arrange
      const a: Record<string, unknown> = { name: 'a' };
      const b: Record<string, unknown> = { name: 'b', ref: a };
      const c: Record<string, unknown> = { name: 'c', ref: b };
      a.ref = c;

      // Act
      const result = serializeValue(a);

      // Assert
      expect(result).toEqual({
        name: 'a',
        ref: {
          name: 'c',
          ref: {
            name: 'b',
            ref: SENTINEL_REF.CIRCULAR,
          },
        },
      });
    });
  });

  describe('Depth Limiting', () => {
    it('should respect default maxDepth of 6', () => {
      // Arrange
      const value: Record<string, unknown> = { level: 0 };
      let current = value;
      for (let i = 1; i <= 15; i++) {
        const next: Record<string, unknown> = { level: i };
        current.child = next;
        current = next;
      }

      // Act
      const result = serializeValue(value);

      // Assert
      let depth = 0;
      let node = result as Record<string, unknown>;
      while (node.child && node.child !== SENTINEL_REF.MAX_DEPTH) {
        depth++;
        node = node.child as Record<string, unknown>;
      }
      expect(depth).toBe(6);
      expect(node.child).toBe(SENTINEL_REF.MAX_DEPTH);
    });

    it('should respect custom maxDepth', () => {
      // Arrange
      const value: Record<string, unknown> = { level: 0 };
      let current = value;
      for (let i = 1; i <= 10; i++) {
        const next: Record<string, unknown> = { level: i };
        current.child = next;
        current = next;
      }

      // Act
      const result = serializeValue(value, { maxDepth: 3 });

      // Assert
      let depth = 0;
      let node = result as Record<string, unknown>;
      while (node.child && node.child !== SENTINEL_REF.MAX_DEPTH) {
        depth++;
        node = node.child as Record<string, unknown>;
      }
      expect(depth).toBe(3);
      expect(node.child).toBe(SENTINEL_REF.MAX_DEPTH);
    });

    it('should handle maxDepth of 0', () => {
      // Arrange
      const value = { nested: { value: 'deep' } };

      // Act
      const result = serializeValue(value, { maxDepth: 0 });

      // Assert
      // Note: maxDepth check is depth > maxDepth, so at depth 0 the object
      // itself is serialized, but its properties exceed maxDepth
      expect(result).toEqual({
        nested: SENTINEL_REF.MAX_DEPTH,
      });
    });

    it('should apply maxDepth to arrays', () => {
      // Arrange
      const value = [[[['too deep']]]];

      // Act
      const result = serializeValue(value, { maxDepth: 2 });

      // Assert
      // Note: depth 0 is outer array, depth 1 is first nested array,
      // depth 2 is second nested array, depth 3 exceeds maxDepth
      expect(result).toEqual([[[SENTINEL_REF.MAX_DEPTH]]]);
    });

    it('should apply maxDepth to Map entries', () => {
      // Arrange
      const innerMap = new Map([['key', 'value']]);
      const outerMap = new Map([['inner', innerMap]]);

      // Act
      const result = serializeValue(outerMap, { maxDepth: 1 });

      // Assert
      // Note: depth 0 is outerMap, depth 1 is outerMap entry key/value (innerMap),
      // depth 2 would be innerMap entry key/value which exceed maxDepth
      expect(result).toEqual({
        __type: 'Map',
        entries: [
          [
            'inner',
            {
              __type: 'Map',
              entries: [[SENTINEL_REF.MAX_DEPTH, SENTINEL_REF.MAX_DEPTH]],
            },
          ],
        ],
      });
    });
  });

  describe('Custom Replacer', () => {
    it('should use custom replacer for object properties', () => {
      // Arrange
      const value = {
        email: 'user@example.com',
        password: 'secret123',
        name: 'Alice',
      };
      const replacer = (key: string, val: unknown) => {
        if (key === 'password' || key === 'email') {
          return '[REDACTED]';
        }
        return val;
      };

      // Act
      const result = serializeValue(value, { replacer });

      // Assert
      expect(result).toEqual({
        email: '[REDACTED]',
        password: '[REDACTED]',
        name: 'Alice',
      });
    });

    it('should allow replacer to return undefined to exclude property', () => {
      // Arrange
      const value = {
        public: 'visible',
        private: 'hidden',
        internal: 'also hidden',
      };
      const replacer = (key: string, val: unknown) => {
        if (key.startsWith('private') || key.startsWith('internal')) {
          return undefined;
        }
        return val;
      };

      // Act
      const result = serializeValue(value, { replacer });

      // Assert
      expect(result).toEqual({
        public: 'visible',
      });
    });

    it('should apply replacer to direct properties only', () => {
      // Arrange
      const value = {
        user: {
          email: 'user@example.com',
          name: 'Alice',
        },
      };
      const replacer = (key: string, val: unknown) => {
        if (key === 'user') {
          return { name: 'Bob' };
        }
        return val;
      };

      // Act
      const result = serializeValue(value, { replacer });

      // Assert
      // Note: replacer is only called for direct properties, not nested ones
      expect(result).toEqual({
        user: {
          name: 'Bob',
        },
      });
    });

    it('should apply replacer before other transformations', () => {
      // Arrange
      const value = {
        timestamp: new Date('2025-01-01'),
      };
      const replacer = (key: string, val: unknown) => {
        if (key === 'timestamp' && val instanceof Date) {
          return 'REPLACED';
        }
        return val;
      };

      // Act
      const result = serializeValue(value, { replacer });

      // Assert
      expect(result).toEqual({
        timestamp: 'REPLACED',
      });
    });
  });

  describe('Non-Plain Objects', () => {
    it('should serialize class instances as plain objects', () => {
      // Arrange
      class CustomClass {
        constructor(public value: string) {}
      }
      const value = new CustomClass('test');

      // Act
      const result = serializeValue(value);

      // Assert
      // Note: isRecord() checks for object && !Array, so class instances
      // are serialized as plain objects with their own properties
      expect(result).toEqual({ value: 'test' });
    });

    it('should serialize objects with custom prototypes as plain objects', () => {
      // Arrange
      const value = {
        toString() {
          return '[object HTMLDivElement]';
        },
        id: 'test-element',
      };
      Object.setPrototypeOf(value, Object.create(null));

      // Act
      const result = serializeValue(value);

      // Assert
      // Note: Objects with custom prototypes are serialized as plain objects
      expect(result).toEqual({
        id: 'test-element',
      });
    });
  });

  describe('Error Handling', () => {
    it('should throw SerializationError on unexpected error', () => {
      // Arrange
      const value = {
        get badProperty() {
          throw new Error('Property access failed');
        },
      };

      // Act & Assert
      expect(() => serializeValue(value)).toThrow(SerializationError);
      expect(() => serializeValue(value)).toThrow('Failed to serialize value');
    });

    it('should wrap non-Error exceptions', () => {
      // Arrange
      const value = {
        get badProperty() {
          throw 'string error';
        },
      };

      // Act & Assert
      expect(() => serializeValue(value)).toThrow(SerializationError);
    });
  });

  describe('Integration Scenarios', () => {
    it('should serialize React component props', () => {
      // Arrange
      const value = {
        onClick: () => {
          // noop
        },
        className: 'btn-primary',
        disabled: false,
        user: {
          name: 'Alice',
          email: 'alice@example.com',
        },
        metadata: new Map([['key', 'value']]),
      };

      // Act
      const result = serializeValue(value, { includeFunctions: true });

      // Assert
      expect(result).toEqual({
        onClick: SENTINEL_REF.FUNCTION,
        className: 'btn-primary',
        disabled: false,
        user: {
          name: 'Alice',
          email: 'alice@example.com',
        },
        metadata: {
          __type: 'Map',
          entries: [['key', 'value']],
        },
      });
    });

    it('should serialize Vue component state', () => {
      // Arrange
      const value = {
        count: 0,
        items: [1, 2, 3],
        user: {
          name: 'Bob',
          preferences: new Set(['dark-mode', 'notifications']),
        },
        timestamp: new Date('2025-01-01'),
      };

      // Act
      const result = serializeValue(value);

      // Assert
      expect(result).toEqual({
        count: 0,
        items: [1, 2, 3],
        user: {
          name: 'Bob',
          preferences: {
            __type: 'Set',
            values: ['dark-mode', 'notifications'],
          },
        },
        timestamp: '2025-01-01T00:00:00.000Z',
      });
    });

    it('should handle complex nested structure with all types', () => {
      // Arrange
      const value = {
        string: 'text',
        number: 42,
        boolean: true,
        null: null,
        undefined: undefined,
        date: new Date('2025-01-01'),
        regex: /test/gi,
        map: new Map([['key', 'value']]),
        set: new Set([1, 2, 3]),
        array: [1, 'two', true],
        object: {
          nested: {
            deep: 'value',
          },
        },
      };

      // Act
      const result = serializeValue(value);

      // Assert
      expect(result).toEqual({
        string: 'text',
        number: 42,
        boolean: true,
        null: null,
        undefined: SENTINEL_REF.UNDEFINED,
        date: '2025-01-01T00:00:00.000Z',
        regex: '[RegExp: /test/gi]',
        map: {
          __type: 'Map',
          entries: [['key', 'value']],
        },
        set: {
          __type: 'Set',
          values: [1, 2, 3],
        },
        array: [1, 'two', true],
        object: {
          nested: {
            deep: 'value',
          },
        },
      });
    });
  });
});

describe('deserializeValue', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Primitives', () => {
    it('should deserialize null', () => {
      // Arrange
      const value = null;

      // Act
      const result = deserializeValue(value);

      // Assert
      expect(result).toBeNull();
    });

    it('should deserialize undefined', () => {
      // Arrange
      const value = undefined;

      // Act
      const result = deserializeValue(value);

      // Assert
      expect(result).toBeUndefined();
    });

    it('should deserialize strings', () => {
      // Arrange
      const value = 'hello world';

      // Act
      const result = deserializeValue(value);

      // Assert
      expect(result).toBe('hello world');
    });

    it('should deserialize numbers', () => {
      // Arrange
      const value = 42;

      // Act
      const result = deserializeValue(value);

      // Assert
      expect(result).toBe(42);
    });

    it('should deserialize booleans', () => {
      // Arrange
      const trueValue = true;
      const falseValue = false;

      // Act
      const trueResult = deserializeValue(trueValue);
      const falseResult = deserializeValue(falseValue);

      // Assert
      expect(trueResult).toBe(true);
      expect(falseResult).toBe(false);
    });
  });

  describe('Sentinel Values', () => {
    it('should deserialize CIRCULAR sentinel', () => {
      // Arrange
      const value = SENTINEL_REF.CIRCULAR;

      // Act
      const result = deserializeValue(value);

      // Assert
      expect(result).toBe('[Circular]');
    });

    it('should deserialize FUNCTION sentinel', () => {
      // Arrange
      const value = SENTINEL_REF.FUNCTION;

      // Act
      const result = deserializeValue(value);

      // Assert
      expect(result).toBe('[Function]');
    });

    it('should deserialize UNDEFINED sentinel', () => {
      // Arrange
      const value = SENTINEL_REF.UNDEFINED;

      // Act
      const result = deserializeValue(value);

      // Assert
      expect(result).toBeUndefined();
    });

    it('should deserialize SYMBOL sentinel', () => {
      // Arrange
      const value = SENTINEL_REF.SYMBOL;

      // Act
      const result = deserializeValue(value);

      // Assert
      expect(result).toEqual(expect.any(Symbol));
    });

    it('should deserialize MAX_DEPTH sentinel', () => {
      // Arrange
      const value = SENTINEL_REF.MAX_DEPTH;

      // Act
      const result = deserializeValue(value);

      // Assert
      expect(result).toBe('[Max Depth]');
    });
  });

  describe('Special Types', () => {
    it('should deserialize Map', () => {
      // Arrange
      const value = {
        __type: 'Map',
        entries: [
          ['key1', 'value1'],
          ['key2', 'value2'],
        ],
      };

      // Act
      const result = deserializeValue(value);

      // Assert
      expect(result).toBeInstanceOf(Map);
      expect(result).toEqual(
        new Map([
          ['key1', 'value1'],
          ['key2', 'value2'],
        ]),
      );
    });

    it('should deserialize empty Map', () => {
      // Arrange
      const value = {
        __type: 'Map',
        entries: [],
      };

      // Act
      const result = deserializeValue(value);

      // Assert
      expect(result).toBeInstanceOf(Map);
      expect((result as Map<unknown, unknown>).size).toBe(0);
    });

    it('should deserialize Map with nested values', () => {
      // Arrange
      const value = {
        __type: 'Map',
        entries: [['key', { nested: { deep: 'value' } }]],
      };

      // Act
      const result = deserializeValue(value);

      // Assert
      expect(result).toBeInstanceOf(Map);
      expect((result as Map<unknown, unknown>).get('key')).toEqual({
        nested: { deep: 'value' },
      });
    });

    it('should deserialize nested Maps', () => {
      // Arrange
      const value = {
        __type: 'Map',
        entries: [
          [
            'outer',
            {
              __type: 'Map',
              entries: [
                ['inner1', 'value1'],
                ['inner2', 'value2'],
              ],
            },
          ],
        ],
      };

      // Act
      const result = deserializeValue(value);

      // Assert
      expect(result).toBeInstanceOf(Map);
      const innerMap = (result as Map<unknown, unknown>).get('outer');
      expect(innerMap).toBeInstanceOf(Map);
      expect(innerMap).toEqual(
        new Map([
          ['inner1', 'value1'],
          ['inner2', 'value2'],
        ]),
      );
    });

    it('should deserialize Set', () => {
      // Arrange
      const value = {
        __type: 'Set',
        values: [1, 2, 3, 4, 5],
      };

      // Act
      const result = deserializeValue(value);

      // Assert
      expect(result).toBeInstanceOf(Set);
      expect(result).toEqual(new Set([1, 2, 3, 4, 5]));
    });

    it('should deserialize empty Set', () => {
      // Arrange
      const value = {
        __type: 'Set',
        values: [],
      };

      // Act
      const result = deserializeValue(value);

      // Assert
      expect(result).toBeInstanceOf(Set);
      expect((result as Set<unknown>).size).toBe(0);
    });

    it('should deserialize Set with nested objects', () => {
      // Arrange
      const value = {
        __type: 'Set',
        values: [{ id: 1 }, { id: 2 }],
      };

      // Act
      const result = deserializeValue(value);

      // Assert
      expect(result).toBeInstanceOf(Set);
      const values = Array.from(result as Set<unknown>);
      expect(values).toEqual([{ id: 1 }, { id: 2 }]);
    });

    it('should return object as-is for unknown __type', () => {
      // Arrange
      const value = {
        __type: 'CustomType',
        data: 'value',
      };

      // Act
      const result = deserializeValue(value);

      // Assert
      expect(result).toEqual({
        __type: 'CustomType',
        data: 'value',
      });
    });

    it('should handle Map with invalid entries field', () => {
      // Arrange
      const value = {
        __type: 'Map',
        entries: 'not an array',
      };

      // Act
      const result = deserializeValue(value);

      // Assert
      expect(result).toEqual({
        __type: 'Map',
        entries: 'not an array',
      });
    });

    it('should handle Set with invalid values field', () => {
      // Arrange
      const value = {
        __type: 'Set',
        values: 'not an array',
      };

      // Act
      const result = deserializeValue(value);

      // Assert
      expect(result).toEqual({
        __type: 'Set',
        values: 'not an array',
      });
    });
  });

  describe('Arrays', () => {
    it('should deserialize empty array', () => {
      // Arrange
      const value: unknown[] = [];

      // Act
      const result = deserializeValue(value);

      // Assert
      expect(result).toEqual([]);
    });

    it('should deserialize array with primitives', () => {
      // Arrange
      const value = [1, 'two', true, null];

      // Act
      const result = deserializeValue(value);

      // Assert
      expect(result).toEqual([1, 'two', true, null]);
    });

    it('should deserialize array with sentinels', () => {
      // Arrange
      const value = [1, SENTINEL_REF.UNDEFINED, SENTINEL_REF.FUNCTION];

      // Act
      const result = deserializeValue(value);

      // Assert
      expect(result).toEqual([1, undefined, '[Function]']);
    });

    it('should deserialize nested arrays', () => {
      // Arrange
      const value = [
        [1, 2],
        [3, 4],
      ];

      // Act
      const result = deserializeValue(value);

      // Assert
      expect(result).toEqual([
        [1, 2],
        [3, 4],
      ]);
    });

    it('should deserialize array with objects', () => {
      // Arrange
      const value = [{ id: 1 }, { id: 2 }];

      // Act
      const result = deserializeValue(value);

      // Assert
      expect(result).toEqual([{ id: 1 }, { id: 2 }]);
    });
  });

  describe('Objects', () => {
    it('should deserialize empty object', () => {
      // Arrange
      const value = {};

      // Act
      const result = deserializeValue(value);

      // Assert
      expect(result).toEqual({});
    });

    it('should deserialize object with primitives', () => {
      // Arrange
      const value = {
        name: 'Alice',
        age: 30,
        active: true,
      };

      // Act
      const result = deserializeValue(value);

      // Assert
      expect(result).toEqual({
        name: 'Alice',
        age: 30,
        active: true,
      });
    });

    it('should deserialize object with sentinels', () => {
      // Arrange
      const value = {
        name: 'test',
        missing: SENTINEL_REF.UNDEFINED,
        handler: SENTINEL_REF.FUNCTION,
      };

      // Act
      const result = deserializeValue(value);

      // Assert
      expect(result).toEqual({
        name: 'test',
        missing: undefined,
        handler: '[Function]',
      });
    });

    it('should deserialize nested objects', () => {
      // Arrange
      const value = {
        user: {
          name: 'Alice',
          address: {
            city: 'New York',
          },
        },
      };

      // Act
      const result = deserializeValue(value);

      // Assert
      expect(result).toEqual({
        user: {
          name: 'Alice',
          address: {
            city: 'New York',
          },
        },
      });
    });

    it('should deserialize object with array properties', () => {
      // Arrange
      const value = {
        items: [1, 2, 3],
        tags: ['a', 'b'],
      };

      // Act
      const result = deserializeValue(value);

      // Assert
      expect(result).toEqual({
        items: [1, 2, 3],
        tags: ['a', 'b'],
      });
    });
  });

  describe('Integration Scenarios', () => {
    it('should deserialize complex nested structure', () => {
      // Arrange
      const value = {
        string: 'text',
        number: 42,
        map: {
          __type: 'Map',
          entries: [['key', 'value']],
        },
        set: {
          __type: 'Set',
          values: [1, 2, 3],
        },
        array: [1, 'two', SENTINEL_REF.UNDEFINED],
        object: {
          nested: {
            deep: 'value',
          },
        },
      };

      // Act
      const result = deserializeValue(value);

      // Assert
      expect(result).toEqual({
        string: 'text',
        number: 42,
        map: new Map([['key', 'value']]),
        set: new Set([1, 2, 3]),
        array: [1, 'two', undefined],
        object: {
          nested: {
            deep: 'value',
          },
        },
      });
    });
  });
});

describe('toJSON', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should convert value to formatted JSON string', () => {
    // Arrange
    const value = { name: 'Alice', age: 30 };

    // Act
    const result = toJSON(value);

    // Assert
    expect(result).toBe('{\n  "name": "Alice",\n  "age": 30\n}');
  });

  it('should handle serialization of special types', () => {
    // Arrange
    const value = {
      date: new Date('2025-01-01T00:00:00.000Z'),
      map: new Map([['key', 'value']]),
    };

    // Act
    const result = toJSON(value);

    // Assert
    expect(result).toContain('"date": "2025-01-01T00:00:00.000Z"');
    expect(result).toContain('"__type": "Map"');
  });

  it('should apply options to serialization', () => {
    // Arrange
    const value = {
      func: () => {
        // noop
      },
      name: 'test',
    };

    // Act
    const result = toJSON(value, { includeFunctions: true });

    // Assert
    expect(result).toContain('"func": "[Function]"');
    expect(result).toContain('"name": "test"');
  });

  it('should produce valid JSON', () => {
    // Arrange
    const value = {
      nested: {
        array: [1, 2, 3],
        set: new Set(['a', 'b']),
      },
    };

    // Act
    const result = toJSON(value);

    // Assert
    expect(() => JSON.parse(result)).not.toThrow();
  });
});

describe('fromJSON', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should parse JSON string and deserialize', () => {
    // Arrange
    const json = '{"name":"Alice","age":30}';

    // Act
    const result = fromJSON(json);

    // Assert
    expect(result).toEqual({ name: 'Alice', age: 30 });
  });

  it('should deserialize special types from JSON', () => {
    // Arrange
    const json =
      '{"map":{"__type":"Map","entries":[["key","value"]]},"set":{"__type":"Set","values":[1,2,3]}}';

    // Act
    const result = fromJSON(json);

    // Assert
    expect(result).toEqual({
      map: new Map([['key', 'value']]),
      set: new Set([1, 2, 3]),
    });
  });

  it('should handle sentinel values in JSON', () => {
    // Arrange
    const json =
      '{"name":"test","missing":"[Undefined]","handler":"[Function]"}';

    // Act
    const result = fromJSON(json);

    // Assert
    expect(result).toEqual({
      name: 'test',
      missing: undefined,
      handler: '[Function]',
    });
  });

  it('should throw on invalid JSON', () => {
    // Arrange
    const json = 'invalid json{{{';

    // Act & Assert
    expect(() => fromJSON(json)).toThrow();
  });
});

describe('Round-trip Serialization', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should preserve primitives through serialize and deserialize', () => {
    // Arrange
    const original = {
      string: 'text',
      number: 42,
      boolean: true,
      null: null,
      undefined: undefined,
    };

    // Act
    const serialized = serializeValue(original);
    const deserialized = deserializeValue(serialized);

    // Assert
    expect(deserialized).toEqual({
      string: 'text',
      number: 42,
      boolean: true,
      null: null,
      undefined: undefined,
    });
  });

  it('should preserve Maps through serialize and deserialize', () => {
    // Arrange
    const original = new Map<string, string | { nested: string }>([
      ['key1', 'value1'],
      ['key2', { nested: 'value2' }],
    ]);

    // Act
    const serialized = serializeValue(original);
    const deserialized = deserializeValue(serialized);

    // Assert
    expect(deserialized).toEqual(
      new Map<string, string | { nested: string }>([
        ['key1', 'value1'],
        ['key2', { nested: 'value2' }],
      ]),
    );
  });

  it('should preserve Sets through serialize and deserialize', () => {
    // Arrange
    const original = new Set([1, 2, 3, 'four', { id: 5 }]);

    // Act
    const serialized = serializeValue(original);
    const deserialized = deserializeValue(serialized);

    // Assert
    expect(deserialized).toEqual(new Set([1, 2, 3, 'four', { id: 5 }]));
  });

  it('should preserve complex structures through toJSON and fromJSON', () => {
    // Arrange
    const original = {
      user: {
        name: 'Alice',
        preferences: new Set(['dark-mode', 'notifications']),
      },
      metadata: new Map<string, string | Date>([
        ['version', '1.0'],
        ['updated', new Date('2025-01-01')],
      ]),
      items: [1, 2, 3],
    };

    // Act
    const json = toJSON(original);
    const restored = fromJSON(json);

    // Assert
    expect(restored).toEqual({
      user: {
        name: 'Alice',
        preferences: new Set(['dark-mode', 'notifications']),
      },
      metadata: new Map([
        ['version', '1.0'],
        ['updated', '2025-01-01T00:00:00.000Z'],
      ]),
      items: [1, 2, 3],
    });
  });

  it('should handle circular references in round-trip', () => {
    // Arrange
    const original: Record<string, unknown> = { name: 'test' };
    original.self = original;

    // Act
    const serialized = serializeValue(original);
    const deserialized = deserializeValue(serialized);

    // Assert
    expect(deserialized).toEqual({
      name: 'test',
      self: '[Circular]',
    });
  });
});

describe('serializeValue - bounded constraints', () => {
  describe('maxArrayLength', () => {
    it('should truncate arrays exceeding maxArrayLength', () => {
      // Arrange
      const value = Array.from({ length: 50 }, (_, i) => i);

      // Act
      const result = serializeValue(value, { maxArrayLength: 5 });

      // Assert
      expect(result).toHaveLength(6); // 5 items + truncation metadata
      const arr = result as unknown[];
      expect(arr[0]).toBe(0);
      expect(arr[4]).toBe(4);
      expect(arr[5]).toEqual({ __truncated: true, originalLength: 50 });
    });

    it('should not truncate arrays within maxArrayLength', () => {
      // Arrange
      const value = [1, 2, 3];

      // Act
      const result = serializeValue(value, { maxArrayLength: 10 });

      // Assert
      expect(result).toEqual([1, 2, 3]);
    });

    it('should truncate Map entries exceeding maxArrayLength', () => {
      // Arrange
      const value = new Map(
        Array.from({ length: 30 }, (_, i) => [`key${i}`, i]),
      );

      // Act
      const result = serializeValue(value, { maxArrayLength: 5 }) as Record<
        string,
        unknown
      >;

      // Assert
      expect(result.__type).toBe('Map');
      expect(result.__truncated).toBe(true);
      expect(result.originalSize).toBe(30);
      expect((result.entries as unknown[]).length).toBe(5);
    });

    it('should truncate Set values exceeding maxArrayLength', () => {
      // Arrange
      const value = new Set(Array.from({ length: 25 }, (_, i) => i));

      // Act
      const result = serializeValue(value, { maxArrayLength: 5 }) as Record<
        string,
        unknown
      >;

      // Assert
      expect(result.__type).toBe('Set');
      expect(result.__truncated).toBe(true);
      expect(result.originalSize).toBe(25);
      expect((result.values as unknown[]).length).toBe(5);
    });
  });

  describe('maxStringLength', () => {
    it('should truncate strings exceeding maxStringLength', () => {
      // Arrange
      const value = 'a'.repeat(5000);

      // Act
      const result = serializeValue(value, { maxStringLength: 100 });

      // Assert
      expect(result).toBe('a'.repeat(100) + '... [truncated]');
    });

    it('should not truncate strings within maxStringLength', () => {
      // Arrange
      const value = 'hello world';

      // Act
      const result = serializeValue(value, { maxStringLength: 100 });

      // Assert
      expect(result).toBe('hello world');
    });

    it('should truncate strings in nested objects', () => {
      // Arrange
      const value = { data: 'x'.repeat(3000) };

      // Act
      const result = serializeValue(value, { maxStringLength: 50 }) as Record<
        string,
        unknown
      >;

      // Assert
      expect(result.data).toBe('x'.repeat(50) + '... [truncated]');
    });
  });

  describe('maxProperties', () => {
    it('should limit properties per object', () => {
      // Arrange
      const value: Record<string, number> = {};
      for (let i = 0; i < 100; i++) {
        value[`key${i}`] = i;
      }

      // Act
      const result = serializeValue(value, { maxProperties: 10 }) as Record<
        string,
        unknown
      >;

      // Assert
      const keys = Object.keys(result).filter((k) => !k.startsWith('__'));
      expect(keys.length).toBe(10);
      expect(result.__truncated).toBe(true);
      expect(result.__originalKeyCount).toBe(100);
    });

    it('should not add truncation metadata when within limit', () => {
      // Arrange
      const value = { a: 1, b: 2, c: 3 };

      // Act
      const result = serializeValue(value, { maxProperties: 10 }) as Record<
        string,
        unknown
      >;

      // Assert
      expect(result).toEqual({ a: 1, b: 2, c: 3 });
      expect(result.__truncated).toBeUndefined();
    });
  });

  describe('maxTotalBytes', () => {
    it('should stop serializing when byte budget is exceeded', () => {
      // Arrange — create an object with many string values that collectively
      // exceed the byte budget. Each value is 200 chars, budget is 500 bytes.
      const value: Record<string, string> = {};
      for (let i = 0; i < 20; i++) {
        value[`key${i}`] = 'x'.repeat(200);
      }

      // Act — with a tiny byte budget
      const result = serializeValue(value, {
        maxTotalBytes: 500,
        maxStringLength: 10000, // Don't let string truncation interfere
      }) as Record<string, unknown>;

      // Assert — later values should be truncated sentinels
      const values = Object.values(result);
      const truncatedCount = values.filter(
        (v) => v === SENTINEL_REF.TRUNCATED,
      ).length;
      expect(truncatedCount).toBeGreaterThan(0);

      // Early values should still be serialized
      const serializedCount = values.filter(
        (v) => typeof v === 'string' && v.startsWith('x'),
      ).length;
      expect(serializedCount).toBeGreaterThan(0);
    });

    it('should not truncate when within byte budget', () => {
      // Arrange
      const value = { a: 'hello', b: 42, c: true };

      // Act
      const result = serializeValue(value, { maxTotalBytes: 262144 });

      // Assert
      expect(result).toEqual({ a: 'hello', b: 42, c: true });
    });
  });

  describe('skipKeys', () => {
    it('should omit properties in skipKeys set', () => {
      // Arrange
      const value = {
        name: 'test',
        _owner: { huge: 'fiber tree' },
        _store: { internal: true },
        visible: 'data',
      };

      // Act
      const result = serializeValue(value, {
        skipKeys: new Set(['_owner', '_store']),
      }) as Record<string, unknown>;

      // Assert
      expect(result).toEqual({ name: 'test', visible: 'data' });
      expect(result._owner).toBeUndefined();
      expect(result._store).toBeUndefined();
    });

    it('should skip keys at nested depths', () => {
      // Arrange
      const value = {
        child: {
          _owner: { nested: 'fiber' },
          name: 'inner',
        },
      };

      // Act
      const result = serializeValue(value, {
        skipKeys: new Set(['_owner']),
      }) as Record<string, unknown>;

      // Assert
      expect(result).toEqual({ child: { name: 'inner' } });
    });
  });

  describe('skipKeyPrefixes', () => {
    it('should skip keys matching any prefix', () => {
      // Arrange — simulate React Fiber keys attached to a DOM node
      const value = {
        tagName: 'div',
        __reactFiber$abc123: { tag: 5, stateNode: 'massive fiber tree' },
        __reactProps$abc123: { onClick: 'handler' },
        __reactEvents$abc123: ['click'],
        className: 'container',
      };

      // Act
      const result = serializeValue(value, {
        skipKeyPrefixes: ['__react'],
      }) as Record<string, unknown>;

      // Assert
      expect(result.tagName).toBe('div');
      expect(result.className).toBe('container');
      expect(result.__reactFiber$abc123).toBeUndefined();
      expect(result.__reactProps$abc123).toBeUndefined();
      expect(result.__reactEvents$abc123).toBeUndefined();
    });

    it('should skip prefixed keys at nested depths', () => {
      // Arrange
      const value = {
        child: {
          __reactFiber$xyz: { huge: 'tree' },
          name: 'inner',
        },
      };

      // Act
      const result = serializeValue(value, {
        skipKeyPrefixes: ['__react'],
      }) as Record<string, unknown>;

      // Assert
      expect(result).toEqual({ child: { name: 'inner' } });
    });

    it('should work together with skipKeys', () => {
      // Arrange
      const value = {
        _owner: { fiberChain: 'data' },
        __reactFiber$hash: { tag: 5 },
        name: 'test',
      };

      // Act
      const result = serializeValue(value, {
        skipKeys: new Set(['_owner']),
        skipKeyPrefixes: ['__react'],
      }) as Record<string, unknown>;

      // Assert
      expect(result).toEqual({ name: 'test' });
    });
  });

  describe('combined constraints', () => {
    it('should apply all constraints together', () => {
      // Arrange — simulate a React component capture scenario
      const value = {
        _owner: { fiberChain: 'massive data' },
        _store: {},
        __reactFiber$hash: { tag: 5, stateNode: 'fiber tree' },
        props: { className: 'btn' },
        items: Array.from({ length: 100 }, (_, i) => ({
          id: i,
          label: 'x'.repeat(5000),
        })),
      };

      // Act
      const result = serializeValue(value, {
        maxDepth: 4,
        maxArrayLength: 5,
        maxStringLength: 100,
        maxProperties: 20,
        skipKeys: new Set(['_owner', '_store']),
        skipKeyPrefixes: ['__react'],
      }) as Record<string, unknown>;

      // Assert
      expect(result._owner).toBeUndefined();
      expect(result._store).toBeUndefined();
      expect(result.__reactFiber$hash).toBeUndefined();
      expect(result.props).toEqual({ className: 'btn' });
      const items = result.items as unknown[];
      expect(items.length).toBe(6); // 5 items + truncation metadata
    });
  });
});
