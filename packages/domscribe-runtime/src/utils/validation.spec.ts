/**
 * Tests for validation utilities
 *
 * Tests validation of element IDs, runtime context structures, and type guards.
 * Follows Arrange-Act-Assert methodology.
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect } from 'vitest';
import {
  validateElementId,
  validateRuntimeContext,
  isHTMLElement,
  isPlainObject,
} from './validation';

interface WindowWithGlobals extends Window {
  Object: typeof Object;
}

describe('validateElementId', () => {
  describe('Valid IDs', () => {
    it('should validate 8-character alphanumeric ID', () => {
      // Arrange
      const id = 'abc12345';

      // Act
      const result = validateElementId(id);

      // Assert
      expect(result).toBe(true);
    });

    it('should validate ID with lowercase letters', () => {
      // Arrange
      const id = 'abcdefgh';

      // Act
      const result = validateElementId(id);

      // Assert
      expect(result).toBe(true);
    });

    it('should validate ID with numbers', () => {
      // Arrange
      const id = '12345678';

      // Act
      const result = validateElementId(id);

      // Assert
      expect(result).toBe(true);
    });

    it('should validate ID with mixed case', () => {
      // Arrange
      const id = 'aBc12DeF';

      // Act
      const result = validateElementId(id);

      // Assert
      expect(result).toBe(true);
    });
  });

  describe('Invalid IDs', () => {
    it('should reject ID that is too short', () => {
      // Arrange
      const id = 'abc123';

      // Act
      const result = validateElementId(id);

      // Assert
      expect(result).toBe(false);
    });

    it('should reject ID that is too long', () => {
      // Arrange
      const id = 'abc123456';

      // Act
      const result = validateElementId(id);

      // Assert
      expect(result).toBe(false);
    });

    it('should reject ID with special characters', () => {
      // Arrange
      const id = 'abc-1234';

      // Act
      const result = validateElementId(id);

      // Assert
      expect(result).toBe(false);
    });

    it('should reject ID with spaces', () => {
      // Arrange
      const id = 'abc 1234';

      // Act
      const result = validateElementId(id);

      // Assert
      expect(result).toBe(false);
    });

    it('should reject ID with uppercase I (ambiguous)', () => {
      // Arrange
      const id = 'abcI2345';

      // Act
      const result = validateElementId(id);

      // Assert
      expect(result).toBe(false);
    });

    it('should reject ID with uppercase O (ambiguous)', () => {
      // Arrange
      const id = 'abcO2345';

      // Act
      const result = validateElementId(id);

      // Assert
      expect(result).toBe(false);
    });

    it('should reject empty string', () => {
      // Arrange
      const id = '';

      // Act
      const result = validateElementId(id);

      // Assert
      expect(result).toBe(false);
    });

    it('should reject ID with underscores', () => {
      // Arrange
      const id = 'abc_1234';

      // Act
      const result = validateElementId(id);

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('Edge Cases', () => {
    it('should handle non-string input gracefully', () => {
      // Arrange
      const id = 123 as unknown as string;

      // Act
      const result = validateElementId(id);

      // Assert
      expect(result).toBe(false);
    });
  });
});

describe('validateRuntimeContext', () => {
  describe('Valid Contexts', () => {
    it('should validate empty object', () => {
      // Arrange
      const context = {};

      // Act
      const result = validateRuntimeContext(context);

      // Assert
      expect(result).toBe(true);
    });

    it('should validate context with componentProps', () => {
      // Arrange
      const context = {
        componentProps: { foo: 'bar' },
      };

      // Act
      const result = validateRuntimeContext(context);

      // Assert
      expect(result).toBe(true);
    });

    it('should validate context with componentState', () => {
      // Arrange
      const context = {
        componentState: { count: 0 },
      };

      // Act
      const result = validateRuntimeContext(context);

      // Assert
      expect(result).toBe(true);
    });

    it('should validate context with eventFlow', () => {
      // Arrange
      const context = {
        eventFlow: [{ type: 'click', timestamp: 123 }],
      };

      // Act
      const result = validateRuntimeContext(context);

      // Assert
      expect(result).toBe(true);
    });

    it('should validate context with performance', () => {
      // Arrange
      const context = {
        performance: { renderTime: 16 },
      };

      // Act
      const result = validateRuntimeContext(context);

      // Assert
      expect(result).toBe(true);
    });

    it('should validate context with all fields', () => {
      // Arrange
      const context = {
        componentProps: { foo: 'bar' },
        componentState: { count: 0 },
        eventFlow: [{ type: 'click' }],
        performance: { renderTime: 16 },
      };

      // Act
      const result = validateRuntimeContext(context);

      // Assert
      expect(result).toBe(true);
    });

    it('should validate context with null componentProps', () => {
      // Arrange
      const context = {
        componentProps: null,
      };

      // Act
      const result = validateRuntimeContext(context);

      // Assert
      expect(result).toBe(true);
    });

    it('should validate context with undefined componentState', () => {
      // Arrange
      const context = {
        componentState: undefined,
      };

      // Act
      const result = validateRuntimeContext(context);

      // Assert
      expect(result).toBe(true);
    });

    it('should validate context with empty eventFlow array', () => {
      // Arrange
      const context = {
        eventFlow: [],
      };

      // Act
      const result = validateRuntimeContext(context);

      // Assert
      expect(result).toBe(true);
    });

    it('should validate context with nested object in componentProps', () => {
      // Arrange
      const context = {
        componentProps: {
          user: { name: 'John', age: 30 },
          settings: { theme: 'dark' },
        },
      };

      // Act
      const result = validateRuntimeContext(context);

      // Assert
      expect(result).toBe(true);
    });
  });

  describe('Invalid Contexts', () => {
    it('should reject null', () => {
      // Arrange
      const context = null;

      // Act
      const result = validateRuntimeContext(context);

      // Assert
      expect(result).toBe(false);
    });

    it('should reject undefined', () => {
      // Arrange
      const context = undefined;

      // Act
      const result = validateRuntimeContext(context);

      // Assert
      expect(result).toBe(false);
    });

    it('should reject primitive string', () => {
      // Arrange
      const context = 'not an object';

      // Act
      const result = validateRuntimeContext(context);

      // Assert
      expect(result).toBe(false);
    });

    it('should reject primitive number', () => {
      // Arrange
      const context = 123;

      // Act
      const result = validateRuntimeContext(context);

      // Assert
      expect(result).toBe(false);
    });

    it('should reject object without expected fields', () => {
      // Arrange
      const context = {
        randomField: 'value',
      };

      // Act
      const result = validateRuntimeContext(context);

      // Assert
      expect(result).toBe(false);
    });

    it('should reject context with non-object componentProps', () => {
      // Arrange
      const context = {
        componentProps: 'not an object',
      };

      // Act
      const result = validateRuntimeContext(context);

      // Assert
      expect(result).toBe(false);
    });

    it('should reject context with number componentProps', () => {
      // Arrange
      const context = {
        componentProps: 123,
      };

      // Act
      const result = validateRuntimeContext(context);

      // Assert
      expect(result).toBe(false);
    });

    it('should reject context with non-object componentState', () => {
      // Arrange
      const context = {
        componentState: 'invalid',
      };

      // Act
      const result = validateRuntimeContext(context);

      // Assert
      expect(result).toBe(false);
    });

    it('should reject context with boolean componentState', () => {
      // Arrange
      const context = {
        componentState: true,
      };

      // Act
      const result = validateRuntimeContext(context);

      // Assert
      expect(result).toBe(false);
    });

    it('should reject context with non-array eventFlow', () => {
      // Arrange
      const context = {
        eventFlow: { type: 'click' },
      };

      // Act
      const result = validateRuntimeContext(context);

      // Assert
      expect(result).toBe(false);
    });

    it('should reject context with string eventFlow', () => {
      // Arrange
      const context = {
        eventFlow: 'events',
      };

      // Act
      const result = validateRuntimeContext(context);

      // Assert
      expect(result).toBe(false);
    });

    it('should reject context with non-object performance', () => {
      // Arrange
      const context = {
        performance: 'fast',
      };

      // Act
      const result = validateRuntimeContext(context);

      // Assert
      expect(result).toBe(false);
    });

    it('should reject context with number performance', () => {
      // Arrange
      const context = {
        performance: 100,
      };

      // Act
      const result = validateRuntimeContext(context);

      // Assert
      expect(result).toBe(false);
    });

    it('should reject non-empty array', () => {
      // Arrange
      const context = [1, 2, 3];

      // Act
      const result = validateRuntimeContext(context);

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('Edge Cases', () => {
    it('should validate context with extra fields alongside valid fields', () => {
      // Arrange
      const context = {
        componentProps: { foo: 'bar' },
        extraField: 'ignored',
      };

      // Act
      const result = validateRuntimeContext(context);

      // Assert
      expect(result).toBe(true);
    });

    it('should reject context with only invalid extra fields', () => {
      // Arrange
      const context = {
        invalidField1: 'value1',
        invalidField2: 'value2',
      };

      // Act
      const result = validateRuntimeContext(context);

      // Assert
      expect(result).toBe(false);
    });
  });
});

describe('isHTMLElement', () => {
  describe('Valid HTMLElements', () => {
    it('should return true for div element', () => {
      // Arrange
      const element = document.createElement('div');

      // Act
      const result = isHTMLElement(element);

      // Assert
      expect(result).toBe(true);
    });

    it('should return true for span element', () => {
      // Arrange
      const element = document.createElement('span');

      // Act
      const result = isHTMLElement(element);

      // Assert
      expect(result).toBe(true);
    });

    it('should return true for button element', () => {
      // Arrange
      const element = document.createElement('button');

      // Act
      const result = isHTMLElement(element);

      // Assert
      expect(result).toBe(true);
    });

    it('should return true for input element', () => {
      // Arrange
      const element = document.createElement('input');

      // Act
      const result = isHTMLElement(element);

      // Assert
      expect(result).toBe(true);
    });

    it('should return true for custom element', () => {
      // Arrange
      const element = document.createElement('custom-element');

      // Act
      const result = isHTMLElement(element);

      // Assert
      expect(result).toBe(true);
    });
  });

  describe('Invalid Values', () => {
    it('should return false for null', () => {
      // Arrange
      const value = null;

      // Act
      const result = isHTMLElement(value);

      // Assert
      expect(result).toBe(false);
    });

    it('should return false for undefined', () => {
      // Arrange
      const value = undefined;

      // Act
      const result = isHTMLElement(value);

      // Assert
      expect(result).toBe(false);
    });

    it('should return false for plain object', () => {
      // Arrange
      const value = { nodeType: 1 };

      // Act
      const result = isHTMLElement(value);

      // Assert
      expect(result).toBe(false);
    });

    it('should return false for string', () => {
      // Arrange
      const value = '<div>HTML</div>';

      // Act
      const result = isHTMLElement(value);

      // Assert
      expect(result).toBe(false);
    });

    it('should return false for number', () => {
      // Arrange
      const value = 123;

      // Act
      const result = isHTMLElement(value);

      // Assert
      expect(result).toBe(false);
    });

    it('should return false for array', () => {
      // Arrange
      const value = [document.createElement('div')];

      // Act
      const result = isHTMLElement(value);

      // Assert
      expect(result).toBe(false);
    });

    it('should return false for boolean', () => {
      // Arrange
      const value = true;

      // Act
      const result = isHTMLElement(value);

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('Edge Cases', () => {
    it('should return false for Text node', () => {
      // Arrange
      const value = document.createTextNode('text');

      // Act
      const result = isHTMLElement(value);

      // Assert
      expect(result).toBe(false);
    });

    it('should return false for Comment node', () => {
      // Arrange
      const value = document.createComment('comment');

      // Act
      const result = isHTMLElement(value);

      // Assert
      expect(result).toBe(false);
    });

    it('should return false for DocumentFragment', () => {
      // Arrange
      const value = document.createDocumentFragment();

      // Act
      const result = isHTMLElement(value);

      // Assert
      expect(result).toBe(false);
    });
  });
});

describe('isPlainObject', () => {
  describe('Plain Objects', () => {
    it('should return true for empty object literal', () => {
      // Arrange
      const value = {};

      // Act
      const result = isPlainObject(value);

      // Assert
      expect(result).toBe(true);
    });

    it('should return true for object literal with properties', () => {
      // Arrange
      const value = { foo: 'bar', baz: 123 };

      // Act
      const result = isPlainObject(value);

      // Assert
      expect(result).toBe(true);
    });

    it('should return true for Object.create(null)', () => {
      // Arrange
      const value = Object.create(null);

      // Act
      const result = isPlainObject(value);

      // Assert
      expect(result).toBe(true);
    });

    it('should return true for Object.create(Object.prototype)', () => {
      // Arrange
      const value = Object.create(Object.prototype);

      // Act
      const result = isPlainObject(value);

      // Assert
      expect(result).toBe(true);
    });

    it('should return true for nested object', () => {
      // Arrange
      const value = { outer: { inner: { deep: 'value' } } };

      // Act
      const result = isPlainObject(value);

      // Assert
      expect(result).toBe(true);
    });
  });

  describe('Non-Plain Objects', () => {
    it('should return false for null', () => {
      // Arrange
      const value = null;

      // Act
      const result = isPlainObject(value);

      // Assert
      expect(result).toBe(false);
    });

    it('should return false for undefined', () => {
      // Arrange
      const value = undefined;

      // Act
      const result = isPlainObject(value);

      // Assert
      expect(result).toBe(false);
    });

    it('should return false for array', () => {
      // Arrange
      const value = [1, 2, 3];

      // Act
      const result = isPlainObject(value);

      // Assert
      expect(result).toBe(false);
    });

    it('should return false for Date', () => {
      // Arrange
      const value = new Date();

      // Act
      const result = isPlainObject(value);

      // Assert
      expect(result).toBe(false);
    });

    it('should return false for RegExp', () => {
      // Arrange
      const value = /test/;

      // Act
      const result = isPlainObject(value);

      // Assert
      expect(result).toBe(false);
    });

    it('should return false for Error', () => {
      // Arrange
      const value = new Error('test');

      // Act
      const result = isPlainObject(value);

      // Assert
      expect(result).toBe(false);
    });

    it('should return false for Map', () => {
      // Arrange
      const value = new Map();

      // Act
      const result = isPlainObject(value);

      // Assert
      expect(result).toBe(false);
    });

    it('should return false for Set', () => {
      // Arrange
      const value = new Set();

      // Act
      const result = isPlainObject(value);

      // Assert
      expect(result).toBe(false);
    });

    it('should return false for WeakMap', () => {
      // Arrange
      const value = new WeakMap();

      // Act
      const result = isPlainObject(value);

      // Assert
      expect(result).toBe(false);
    });

    it('should return false for WeakSet', () => {
      // Arrange
      const value = new WeakSet();

      // Act
      const result = isPlainObject(value);

      // Assert
      expect(result).toBe(false);
    });

    it('should return false for Promise', () => {
      // Arrange
      const value = Promise.resolve();

      // Act
      const result = isPlainObject(value);

      // Assert
      expect(result).toBe(false);
    });

    it('should return false for function', () => {
      // Arrange
      const value = function () {
        return 'test';
      };

      // Act
      const result = isPlainObject(value);

      // Assert
      expect(result).toBe(false);
    });

    it('should return false for arrow function', () => {
      // Arrange
      const value = () => 'test';

      // Act
      const result = isPlainObject(value);

      // Assert
      expect(result).toBe(false);
    });

    it('should return false for class instance', () => {
      // Arrange
      class TestClass {
        constructor(public value: string) {}
      }
      const value = new TestClass('test');

      // Act
      const result = isPlainObject(value);

      // Assert
      expect(result).toBe(false);
    });

    it('should return false for HTMLElement', () => {
      // Arrange
      const value = document.createElement('div');

      // Act
      const result = isPlainObject(value);

      // Assert
      expect(result).toBe(false);
    });

    it('should return false for string', () => {
      // Arrange
      const value = 'not an object';

      // Act
      const result = isPlainObject(value);

      // Assert
      expect(result).toBe(false);
    });

    it('should return false for number', () => {
      // Arrange
      const value = 123;

      // Act
      const result = isPlainObject(value);

      // Assert
      expect(result).toBe(false);
    });

    it('should return false for boolean', () => {
      // Arrange
      const value = true;

      // Act
      const result = isPlainObject(value);

      // Assert
      expect(result).toBe(false);
    });

    it('should return false for Symbol', () => {
      // Arrange
      const value = Symbol('test');

      // Act
      const result = isPlainObject(value);

      // Assert
      expect(result).toBe(false);
    });

    it('should return false for BigInt', () => {
      // Arrange
      const value = BigInt(123);

      // Act
      const result = isPlainObject(value);

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('Edge Cases', () => {
    it('should return false for Object with custom prototype', () => {
      // Arrange
      const proto = { custom: true };
      const value = Object.create(proto);

      // Act
      const result = isPlainObject(value);

      // Assert
      expect(result).toBe(false);
    });

    it('should return false for object from different realm (iframe)', () => {
      // Arrange
      const iframe = document.createElement('iframe');
      document.body.appendChild(iframe);
      const iframeWindow = iframe.contentWindow as WindowWithGlobals | null;
      const value = iframeWindow ? new iframeWindow.Object() : {};
      document.body.removeChild(iframe);

      // Act
      const result = isPlainObject(value);

      // Assert
      expect(result).toBe(false);
    });

    it('should handle frozen object', () => {
      // Arrange
      const value = Object.freeze({ foo: 'bar' });

      // Act
      const result = isPlainObject(value);

      // Assert
      expect(result).toBe(true);
    });

    it('should handle sealed object', () => {
      // Arrange
      const value = Object.seal({ foo: 'bar' });

      // Act
      const result = isPlainObject(value);

      // Assert
      expect(result).toBe(true);
    });

    it('should handle non-extensible object', () => {
      // Arrange
      const value = Object.preventExtensions({ foo: 'bar' });

      // Act
      const result = isPlainObject(value);

      // Assert
      expect(result).toBe(true);
    });
  });

  describe('Integration', () => {
    it('should correctly identify plain objects in mixed array', () => {
      // Arrange
      const values = [
        {},
        { foo: 'bar' },
        [],
        new Date(),
        null,
        undefined,
        'string',
        123,
        true,
      ];

      // Act
      const results = values.map((v) => isPlainObject(v));

      // Assert
      expect(results).toEqual([
        true, // {}
        true, // { foo: 'bar' }
        false, // []
        false, // new Date()
        false, // null
        false, // undefined
        false, // 'string'
        false, // 123
        false, // true
      ]);
    });

    it('should work with Object.entries filtering', () => {
      // Arrange
      const data = {
        plain: { type: 'plain' },
        date: new Date(),
        array: [1, 2, 3],
        nested: { inner: { value: 'test' } },
      };

      // Act
      const plainEntries = Object.entries(data).filter(([, value]) =>
        isPlainObject(value),
      );

      // Assert
      expect(plainEntries).toHaveLength(2);
      expect(plainEntries.map(([key]) => key)).toEqual(['plain', 'nested']);
    });
  });
});
