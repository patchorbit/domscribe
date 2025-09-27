/**
 * Tests for PropsCapturer
 *
 * Tests the props capture functionality using framework adapters.
 * Follows Arrange-Act-Assert methodology and only mocks direct dependencies.
 */

import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import { PropsCapturer } from './props-capturer.js';
import type { FrameworkAdapter } from '../adapters/adapter.interface.js';
import type { CaptureResult, PropsCaptureOptions } from './types.js';
import { ContextCaptureError } from '../errors/index.js';

// Type Definitions
interface MockFrameworkAdapter extends FrameworkAdapter {
  captureProps: Mock;
  captureState: Mock;
  getComponentInstance: Mock;
}

// Mock objects (defined outside vi.mock to avoid hoisting issues)
const mockSerializeValue = vi.fn();
const mockRedactPII = vi.fn();
const mockRedactSensitiveFields = vi.fn();
const mockIsRecord = vi.fn();

// Mock serialization module
vi.mock('../utils/serialization.js', () => ({
  serializeValue: (...args: unknown[]) => mockSerializeValue(...args),
}));

// Mock isRecord from @domscribe/core
vi.mock('@domscribe/core', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@domscribe/core')>();
  return {
    ...actual,
    redactPII: (...args: unknown[]) => mockRedactPII(...args),
    redactSensitiveFields: (...args: unknown[]) =>
      mockRedactSensitiveFields(...args),
    isRecord: (...args: unknown[]) => mockIsRecord(...args),
  };
});

// Test Helpers
function createMockAdapter(
  overrides?: Partial<FrameworkAdapter>,
): MockFrameworkAdapter {
  return {
    name: 'mock-adapter',
    version: '1.0.0',
    getComponentInstance: vi.fn().mockReturnValue(null),
    captureProps: vi.fn().mockReturnValue(null),
    captureState: vi.fn().mockReturnValue(null),
    ...overrides,
  } as MockFrameworkAdapter;
}

function createMockComponent(): Record<string, unknown> {
  return {
    type: 'MockComponent',
    props: {
      name: 'test',
      value: 42,
    },
  };
}

describe('PropsCapturer', () => {
  let adapter: MockFrameworkAdapter;

  beforeEach(() => {
    vi.clearAllMocks();

    // Reset mock return values to defaults
    mockSerializeValue.mockImplementation((value: unknown) => value);
    mockRedactPII.mockImplementation((value: unknown) => value);
    mockRedactSensitiveFields.mockImplementation((value: unknown) => value);
    mockIsRecord.mockReturnValue(true);
  });

  describe('Constructor', () => {
    it('should create instance with adapter and default options', () => {
      // Arrange
      adapter = createMockAdapter();

      // Act
      const capturer = new PropsCapturer(adapter);

      // Assert
      expect(capturer).toBeDefined();
      expect(capturer).toBeInstanceOf(PropsCapturer);
    });

    it('should create instance with adapter and custom options', () => {
      // Arrange
      adapter = createMockAdapter();
      const options: PropsCaptureOptions = {
        maxDepth: 5,
        redactPII: false,
        debug: true,
      };

      // Act
      const capturer = new PropsCapturer(adapter, options);

      // Assert
      expect(capturer).toBeDefined();
      expect(capturer).toBeInstanceOf(PropsCapturer);
    });

    it('should create instance with empty options', () => {
      // Arrange
      adapter = createMockAdapter();

      // Act
      const capturer = new PropsCapturer(adapter, {});

      // Assert
      expect(capturer).toBeDefined();
    });
  });

  describe('capture - basic functionality', () => {
    it('should return success with empty data when adapter returns null', () => {
      // Arrange
      adapter = createMockAdapter();
      adapter.captureProps.mockReturnValue(null);
      const capturer = new PropsCapturer(adapter);
      const component = createMockComponent();

      // Act
      const result = capturer.capture(component);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toEqual({});
      expect(adapter.captureProps).toHaveBeenCalledWith(component);
    });

    it('should return success with empty data when adapter returns undefined', () => {
      // Arrange
      adapter = createMockAdapter();
      adapter.captureProps.mockReturnValue(undefined);
      const capturer = new PropsCapturer(adapter);
      const component = createMockComponent();

      // Act
      const result = capturer.capture(component);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toEqual({});
    });

    it('should capture and serialize props successfully', () => {
      // Arrange
      const rawProps = { name: 'test', count: 5 };
      const serializedProps = { name: 'test', count: 5 };
      adapter = createMockAdapter();
      adapter.captureProps.mockReturnValue(rawProps);
      mockSerializeValue.mockReturnValue(serializedProps);
      mockIsRecord.mockReturnValue(true);

      const capturer = new PropsCapturer(adapter);
      const component = createMockComponent();

      // Act
      const result = capturer.capture(component);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toEqual(serializedProps);
      expect(adapter.captureProps).toHaveBeenCalledWith(component);
    });

    it('should call serializeValue with correct parameters', () => {
      // Arrange
      const rawProps = { name: 'test', value: 42 };
      adapter = createMockAdapter();
      adapter.captureProps.mockReturnValue(rawProps);
      mockSerializeValue.mockReturnValue(rawProps);
      mockIsRecord.mockReturnValue(true);

      const capturer = new PropsCapturer(adapter, { maxDepth: 5 });
      const component = createMockComponent();

      // Act
      capturer.capture(component);

      // Assert
      expect(mockSerializeValue).toHaveBeenCalledWith(rawProps, {
        maxDepth: 5,
        includeFunctions: false,
      });
    });

    it('should use default maxDepth of 10 when not specified', () => {
      // Arrange
      const rawProps = { name: 'test' };
      adapter = createMockAdapter();
      adapter.captureProps.mockReturnValue(rawProps);
      mockSerializeValue.mockReturnValue(rawProps);
      mockIsRecord.mockReturnValue(true);

      const capturer = new PropsCapturer(adapter);
      const component = createMockComponent();

      // Act
      capturer.capture(component);

      // Assert
      expect(mockSerializeValue).toHaveBeenCalledWith(rawProps, {
        maxDepth: 10,
        includeFunctions: false,
      });
    });

    it('should always set includeFunctions to false', () => {
      // Arrange
      const rawProps = {
        onClick: () => {
          // noop
        },
      };
      adapter = createMockAdapter();
      adapter.captureProps.mockReturnValue(rawProps);
      mockSerializeValue.mockReturnValue({});
      mockIsRecord.mockReturnValue(true);

      const capturer = new PropsCapturer(adapter);
      const component = createMockComponent();

      // Act
      capturer.capture(component);

      // Assert
      expect(mockSerializeValue).toHaveBeenCalledWith(rawProps, {
        maxDepth: 10,
        includeFunctions: false,
      });
    });
  });

  describe('capture - redaction', () => {
    it('should apply redaction by default', () => {
      // Arrange
      const rawProps = { email: 'user@example.com', name: 'Alice' };
      const serialized = { email: 'user@example.com', name: 'Alice' };
      const redactedPII = { email: '[REDACTED]', name: 'Alice' };
      const redactedFields = { email: '[REDACTED]', name: 'Alice' };

      adapter = createMockAdapter();
      adapter.captureProps.mockReturnValue(rawProps);
      mockSerializeValue.mockReturnValue(serialized);
      mockRedactPII.mockReturnValue(redactedPII);
      mockRedactSensitiveFields.mockReturnValue(redactedFields);
      mockIsRecord.mockReturnValue(true);

      const capturer = new PropsCapturer(adapter);
      const component = createMockComponent();

      // Act
      const result = capturer.capture(component);

      // Assert
      expect(mockRedactPII).toHaveBeenCalledWith(serialized);
      expect(mockRedactSensitiveFields).toHaveBeenCalledWith(redactedPII);
      expect(result.data).toEqual(redactedFields);
    });

    it('should skip redaction when redactPII is false', () => {
      // Arrange
      const rawProps = { email: 'user@example.com', password: 'secret' };
      const serialized = { email: 'user@example.com', password: 'secret' };

      adapter = createMockAdapter();
      adapter.captureProps.mockReturnValue(rawProps);
      mockSerializeValue.mockReturnValue(serialized);
      mockIsRecord.mockReturnValue(true);

      const capturer = new PropsCapturer(adapter, { redactPII: false });
      const component = createMockComponent();

      // Act
      const result = capturer.capture(component);

      // Assert
      expect(mockRedactPII).not.toHaveBeenCalled();
      expect(mockRedactSensitiveFields).not.toHaveBeenCalled();
      expect(result.data).toEqual(serialized);
    });

    it('should apply redaction when redactPII is explicitly true', () => {
      // Arrange
      const rawProps = { apiKey: '123456' };
      const serialized = { apiKey: '123456' };
      const redacted = { apiKey: '[REDACTED]' };

      adapter = createMockAdapter();
      adapter.captureProps.mockReturnValue(rawProps);
      mockSerializeValue.mockReturnValue(serialized);
      mockRedactPII.mockReturnValue(redacted);
      mockRedactSensitiveFields.mockReturnValue(redacted);
      mockIsRecord.mockReturnValue(true);

      const capturer = new PropsCapturer(adapter, { redactPII: true });
      const component = createMockComponent();

      // Act
      capturer.capture(component);

      // Assert
      expect(mockRedactPII).toHaveBeenCalledWith(serialized);
      expect(mockRedactSensitiveFields).toHaveBeenCalledWith(redacted);
    });

    it('should apply both redactPII and redactSensitiveFields in correct order', () => {
      // Arrange
      const rawProps = { email: 'user@example.com', password: 'secret123' };
      const serialized = { email: 'user@example.com', password: 'secret123' };
      const afterPII = { email: '[REDACTED]', password: 'secret123' };
      const afterFields = { email: '[REDACTED]', password: '[REDACTED]' };

      adapter = createMockAdapter();
      adapter.captureProps.mockReturnValue(rawProps);
      mockSerializeValue.mockReturnValue(serialized);
      mockRedactPII.mockReturnValue(afterPII);
      mockRedactSensitiveFields.mockReturnValue(afterFields);
      mockIsRecord.mockReturnValue(true);

      const capturer = new PropsCapturer(adapter);
      const component = createMockComponent();

      // Act
      const result = capturer.capture(component);

      // Assert
      expect(mockRedactPII).toHaveBeenCalledWith(serialized);
      expect(mockRedactSensitiveFields).toHaveBeenCalledWith(afterPII);
      expect(result.data).toEqual(afterFields);
    });
  });

  describe('capture - ensureRecord behavior', () => {
    it('should use serialized value when isRecord returns true', () => {
      // Arrange
      const rawProps = { name: 'test' };
      const serialized = { name: 'test' };

      adapter = createMockAdapter();
      adapter.captureProps.mockReturnValue(rawProps);
      mockSerializeValue.mockReturnValue(serialized);
      mockIsRecord.mockReturnValue(true);

      const capturer = new PropsCapturer(adapter, { redactPII: false });
      const component = createMockComponent();

      // Act
      const result = capturer.capture(component);

      // Assert
      expect(mockIsRecord).toHaveBeenCalledWith(serialized);
      expect(result.data).toEqual(serialized);
    });

    it('should return empty object when isRecord returns false', () => {
      // Arrange
      const rawProps = { name: 'test' };
      const serialized = 'not a record';

      adapter = createMockAdapter();
      adapter.captureProps.mockReturnValue(rawProps);
      mockSerializeValue.mockReturnValue(serialized);
      mockIsRecord.mockReturnValue(false);

      const capturer = new PropsCapturer(adapter, { redactPII: false });
      const component = createMockComponent();

      // Act
      const result = capturer.capture(component);

      // Assert
      expect(mockIsRecord).toHaveBeenCalledWith(serialized);
      expect(result.data).toEqual({});
    });

    it('should handle array serialization result', () => {
      // Arrange
      const rawProps = { items: [1, 2, 3] };
      const serializedArray = [1, 2, 3];

      adapter = createMockAdapter();
      adapter.captureProps.mockReturnValue(rawProps);
      mockSerializeValue.mockReturnValue(serializedArray);
      mockIsRecord.mockReturnValue(false);

      const capturer = new PropsCapturer(adapter, { redactPII: false });
      const component = createMockComponent();

      // Act
      const result = capturer.capture(component);

      // Assert
      expect(result.data).toEqual({});
    });

    it('should handle primitive serialization result', () => {
      // Arrange
      const rawProps = { value: 42 };

      adapter = createMockAdapter();
      adapter.captureProps.mockReturnValue(rawProps);
      mockSerializeValue.mockReturnValue(42);
      mockIsRecord.mockReturnValue(false);

      const capturer = new PropsCapturer(adapter, { redactPII: false });
      const component = createMockComponent();

      // Act
      const result = capturer.capture(component);

      // Assert
      expect(result.data).toEqual({});
    });

    it('should ensure record is checked after redaction when enabled', () => {
      // Arrange
      const rawProps = { name: 'test' };
      const serialized = { name: 'test' };

      adapter = createMockAdapter();
      adapter.captureProps.mockReturnValue(rawProps);
      mockSerializeValue.mockReturnValue(serialized);
      mockRedactPII.mockReturnValue(serialized);
      mockRedactSensitiveFields.mockReturnValue(serialized);
      mockIsRecord.mockReturnValue(true);

      const capturer = new PropsCapturer(adapter);
      const component = createMockComponent();

      // Act
      capturer.capture(component);

      // Assert
      expect(mockIsRecord).toHaveBeenCalledTimes(3); // Once for serialized, once after redactPII, once after redactSensitiveFields
    });
  });

  describe('capture - error handling', () => {
    it('should return error when adapter.captureProps throws', () => {
      // Arrange
      const error = new Error('Adapter failed');
      adapter = createMockAdapter();
      adapter.captureProps.mockImplementation(() => {
        throw error;
      });

      const capturer = new PropsCapturer(adapter);
      const component = createMockComponent();

      // Act
      const result = capturer.capture(component);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBeInstanceOf(ContextCaptureError);
      expect(result.error?.message).toContain('Failed to capture props');
    });

    it('should return error when serializeValue throws', () => {
      // Arrange
      const rawProps = { name: 'test' };
      adapter = createMockAdapter();
      adapter.captureProps.mockReturnValue(rawProps);
      mockSerializeValue.mockImplementation(() => {
        throw new Error('Serialization failed');
      });

      const capturer = new PropsCapturer(adapter);
      const component = createMockComponent();

      // Act
      const result = capturer.capture(component);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBeInstanceOf(ContextCaptureError);
    });

    it('should return error when redactPII throws', () => {
      // Arrange
      const rawProps = { email: 'user@example.com' };
      adapter = createMockAdapter();
      adapter.captureProps.mockReturnValue(rawProps);
      mockSerializeValue.mockReturnValue(rawProps);
      mockIsRecord.mockReturnValue(true);
      mockRedactPII.mockImplementation(() => {
        throw new Error('Redaction failed');
      });

      const capturer = new PropsCapturer(adapter);
      const component = createMockComponent();

      // Act
      const result = capturer.capture(component);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBeInstanceOf(ContextCaptureError);
    });

    it('should handle non-Error exceptions', () => {
      // Arrange
      adapter = createMockAdapter();
      adapter.captureProps.mockImplementation(() => {
        throw 'string error';
      });

      const capturer = new PropsCapturer(adapter);
      const component = createMockComponent();

      // Act
      const result = capturer.capture(component);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBeInstanceOf(ContextCaptureError);
      expect(result.error?.message).toContain('Failed to capture props');
    });

    it('should wrap original error in ContextCaptureError', () => {
      // Arrange
      const originalError = new Error('Original error message');
      adapter = createMockAdapter();
      adapter.captureProps.mockImplementation(() => {
        throw originalError;
      });

      const capturer = new PropsCapturer(adapter);
      const component = createMockComponent();

      // Act
      const result = capturer.capture(component);

      // Assert
      expect(result.error).toBeInstanceOf(ContextCaptureError);
      expect(result.error?.message).toContain('Failed to capture props');
    });

    it('should return no data when error occurs', () => {
      // Arrange
      adapter = createMockAdapter();
      adapter.captureProps.mockImplementation(() => {
        throw new Error('Fail');
      });

      const capturer = new PropsCapturer(adapter);
      const component = createMockComponent();

      // Act
      const result = capturer.capture(component);

      // Assert
      expect(result.success).toBe(false);
      expect(result.data).toBeUndefined();
    });
  });

  describe('capture - component variations', () => {
    it('should handle null component', () => {
      // Arrange
      adapter = createMockAdapter();
      adapter.captureProps.mockReturnValue(null);

      const capturer = new PropsCapturer(adapter);

      // Act
      const result = capturer.capture(null);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toEqual({});
      expect(adapter.captureProps).toHaveBeenCalledWith(null);
    });

    it('should handle undefined component', () => {
      // Arrange
      adapter = createMockAdapter();
      adapter.captureProps.mockReturnValue(null);

      const capturer = new PropsCapturer(adapter);

      // Act
      const result = capturer.capture(undefined);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toEqual({});
      expect(adapter.captureProps).toHaveBeenCalledWith(undefined);
    });

    it('should handle primitive component', () => {
      // Arrange
      adapter = createMockAdapter();
      adapter.captureProps.mockReturnValue(null);

      const capturer = new PropsCapturer(adapter);

      // Act
      const result = capturer.capture('string-component');

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toEqual({});
      expect(adapter.captureProps).toHaveBeenCalledWith('string-component');
    });

    it('should handle complex component object', () => {
      // Arrange
      const complexComponent = {
        type: 'ComplexComponent',
        props: {
          user: { name: 'Alice', roles: ['admin', 'user'] },
          settings: { theme: 'dark', notifications: true },
          callbacks: {
            onClick: () => {
              // noop
            },
            onHover: () => {
              // noop
            },
          },
        },
      };
      const capturedProps = {
        user: { name: 'Alice', roles: ['admin', 'user'] },
        settings: { theme: 'dark', notifications: true },
      };

      adapter = createMockAdapter();
      adapter.captureProps.mockReturnValue(capturedProps);
      mockSerializeValue.mockReturnValue(capturedProps);
      mockIsRecord.mockReturnValue(true);

      const capturer = new PropsCapturer(adapter, { redactPII: false });

      // Act
      const result = capturer.capture(complexComponent);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toEqual(capturedProps);
    });
  });

  describe('integration scenarios', () => {
    it('should handle complete capture flow with all options', () => {
      // Arrange
      const rawProps = {
        email: 'user@example.com',
        password: 'secret123',
        username: 'alice',
        age: 30,
      };
      const serialized = {
        email: 'user@example.com',
        password: 'secret123',
        username: 'alice',
        age: 30,
      };
      const afterPII = {
        email: '[REDACTED]',
        password: 'secret123',
        username: 'alice',
        age: 30,
      };
      const afterFields = {
        email: '[REDACTED]',
        password: '[REDACTED]',
        username: 'alice',
        age: 30,
      };

      adapter = createMockAdapter();
      adapter.captureProps.mockReturnValue(rawProps);
      mockSerializeValue.mockReturnValue(serialized);
      mockRedactPII.mockReturnValue(afterPII);
      mockRedactSensitiveFields.mockReturnValue(afterFields);
      mockIsRecord.mockReturnValue(true);

      const capturer = new PropsCapturer(adapter, {
        maxDepth: 8,
        redactPII: true,
      });
      const component = createMockComponent();

      // Act
      const result = capturer.capture(component);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toEqual(afterFields);
      expect(mockSerializeValue).toHaveBeenCalledWith(rawProps, {
        maxDepth: 8,
        includeFunctions: false,
      });
      expect(mockRedactPII).toHaveBeenCalledWith(serialized);
      expect(mockRedactSensitiveFields).toHaveBeenCalledWith(afterPII);
    });

    it('should handle empty props object', () => {
      // Arrange
      const emptyProps = {};

      adapter = createMockAdapter();
      adapter.captureProps.mockReturnValue(emptyProps);
      mockSerializeValue.mockReturnValue(emptyProps);
      mockIsRecord.mockReturnValue(true);

      const capturer = new PropsCapturer(adapter, { redactPII: false });
      const component = createMockComponent();

      // Act
      const result = capturer.capture(component);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toEqual({});
    });

    it('should handle deeply nested props', () => {
      // Arrange
      const deepProps = {
        level1: {
          level2: {
            level3: {
              level4: {
                value: 'deep',
              },
            },
          },
        },
      };

      adapter = createMockAdapter();
      adapter.captureProps.mockReturnValue(deepProps);
      mockSerializeValue.mockReturnValue(deepProps);
      mockIsRecord.mockReturnValue(true);

      const capturer = new PropsCapturer(adapter, {
        maxDepth: 20,
        redactPII: false,
      });
      const component = createMockComponent();

      // Act
      const result = capturer.capture(component);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toEqual(deepProps);
      expect(mockSerializeValue).toHaveBeenCalledWith(deepProps, {
        maxDepth: 20,
        includeFunctions: false,
      });
    });

    it('should handle multiple capture calls with same capturer', () => {
      // Arrange
      adapter = createMockAdapter();
      const component1 = { id: 1, props: { name: 'first' } };
      const component2 = { id: 2, props: { name: 'second' } };
      const props1 = { name: 'first' };
      const props2 = { name: 'second' };

      adapter.captureProps
        .mockReturnValueOnce(props1)
        .mockReturnValueOnce(props2);
      mockSerializeValue
        .mockReturnValueOnce(props1)
        .mockReturnValueOnce(props2);
      mockIsRecord.mockReturnValue(true);

      const capturer = new PropsCapturer(adapter, { redactPII: false });

      // Act
      const result1 = capturer.capture(component1);
      const result2 = capturer.capture(component2);

      // Assert
      expect(result1.success).toBe(true);
      expect(result1.data).toEqual(props1);
      expect(result2.success).toBe(true);
      expect(result2.data).toEqual(props2);
      expect(adapter.captureProps).toHaveBeenCalledTimes(2);
    });

    it('should handle props with special characters in keys', () => {
      // Arrange
      const specialProps = {
        'data-id': '123',
        'aria-label': 'button',
        '@click': 'handler',
        $store: 'value',
      };

      adapter = createMockAdapter();
      adapter.captureProps.mockReturnValue(specialProps);
      mockSerializeValue.mockReturnValue(specialProps);
      mockIsRecord.mockReturnValue(true);

      const capturer = new PropsCapturer(adapter, { redactPII: false });
      const component = createMockComponent();

      // Act
      const result = capturer.capture(component);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toEqual(specialProps);
    });
  });

  describe('options variations', () => {
    it('should respect maxDepth option', () => {
      // Arrange
      const rawProps = { a: { b: { c: 'deep' } } };

      adapter = createMockAdapter();
      adapter.captureProps.mockReturnValue(rawProps);
      mockSerializeValue.mockReturnValue(rawProps);
      mockIsRecord.mockReturnValue(true);

      const capturer = new PropsCapturer(adapter, {
        maxDepth: 2,
        redactPII: false,
      });
      const component = createMockComponent();

      // Act
      capturer.capture(component);

      // Assert
      expect(mockSerializeValue).toHaveBeenCalledWith(rawProps, {
        maxDepth: 2,
        includeFunctions: false,
      });
    });

    it('should respect redactPII option when true', () => {
      // Arrange
      const rawProps = { sensitive: 'data' };

      adapter = createMockAdapter();
      adapter.captureProps.mockReturnValue(rawProps);
      mockSerializeValue.mockReturnValue(rawProps);
      mockRedactPII.mockReturnValue(rawProps);
      mockRedactSensitiveFields.mockReturnValue(rawProps);
      mockIsRecord.mockReturnValue(true);

      const capturer = new PropsCapturer(adapter, { redactPII: true });
      const component = createMockComponent();

      // Act
      capturer.capture(component);

      // Assert
      expect(mockRedactPII).toHaveBeenCalled();
      expect(mockRedactSensitiveFields).toHaveBeenCalled();
    });

    it('should handle all options set to default values', () => {
      // Arrange
      const rawProps = { name: 'test' };

      adapter = createMockAdapter();
      adapter.captureProps.mockReturnValue(rawProps);
      mockSerializeValue.mockReturnValue(rawProps);
      mockRedactPII.mockReturnValue(rawProps);
      mockRedactSensitiveFields.mockReturnValue(rawProps);
      mockIsRecord.mockReturnValue(true);

      const capturer = new PropsCapturer(adapter, {
        maxDepth: 10,
        redactPII: true,
        debug: false,
      });
      const component = createMockComponent();

      // Act
      const result = capturer.capture(component);

      // Assert
      expect(result.success).toBe(true);
      expect(mockSerializeValue).toHaveBeenCalledWith(rawProps, {
        maxDepth: 10,
        includeFunctions: false,
      });
      expect(mockRedactPII).toHaveBeenCalled();
    });
  });

  describe('CaptureResult type conformance', () => {
    it('should return CaptureResult with success true and data on success', () => {
      // Arrange
      const rawProps = { name: 'test' };

      adapter = createMockAdapter();
      adapter.captureProps.mockReturnValue(rawProps);
      mockSerializeValue.mockReturnValue(rawProps);
      mockIsRecord.mockReturnValue(true);

      const capturer = new PropsCapturer(adapter, { redactPII: false });
      const component = createMockComponent();

      // Act
      const result: CaptureResult<Record<string, unknown>> =
        capturer.capture(component);

      // Assert
      expect(result).toHaveProperty('success');
      expect(result.success).toBe(true);
      expect(result).toHaveProperty('data');
      expect(result.data).toEqual(rawProps);
      expect(result.error).toBeUndefined();
    });

    it('should return CaptureResult with success false and error on failure', () => {
      // Arrange
      adapter = createMockAdapter();
      adapter.captureProps.mockImplementation(() => {
        throw new Error('Capture failed');
      });

      const capturer = new PropsCapturer(adapter);
      const component = createMockComponent();

      // Act
      const result: CaptureResult<Record<string, unknown>> =
        capturer.capture(component);

      // Assert
      expect(result).toHaveProperty('success');
      expect(result.success).toBe(false);
      expect(result).toHaveProperty('error');
      expect(result.error).toBeInstanceOf(Error);
      expect(result.data).toBeUndefined();
    });
  });
});
