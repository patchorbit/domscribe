/**
 * Tests for StateCapturer
 *
 * Tests the state capture functionality using framework adapters.
 * Follows Arrange-Act-Assert methodology and only mocks direct dependencies.
 */

import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import { StateCapturer } from './state-capturer.js';
import type { FrameworkAdapter } from '../adapters/adapter.interface.js';
import type { CaptureResult, StateCaptureOptions } from './types.js';
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

// Mock serialization module
vi.mock('../utils/serialization.js', () => ({
  serializeValue: (...args: unknown[]) => mockSerializeValue(...args),
}));

// Mock redaction from @domscribe/core
vi.mock('@domscribe/core', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@domscribe/core')>();
  return {
    ...actual,
    redactPII: (...args: unknown[]) => mockRedactPII(...args),
    redactSensitiveFields: (...args: unknown[]) =>
      mockRedactSensitiveFields(...args),
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
    state: {
      count: 0,
      isActive: true,
    },
  };
}

describe('StateCapturer', () => {
  let adapter: MockFrameworkAdapter;

  beforeEach(() => {
    vi.clearAllMocks();

    // Reset mock return values to defaults
    mockSerializeValue.mockImplementation((value: unknown) => value);
    mockRedactPII.mockImplementation((value: unknown) => value);
    mockRedactSensitiveFields.mockImplementation((value: unknown) => value);
  });

  describe('Constructor', () => {
    it('should create instance with adapter and default options', () => {
      // Arrange
      adapter = createMockAdapter();

      // Act
      const capturer = new StateCapturer(adapter);

      // Assert
      expect(capturer).toBeDefined();
      expect(capturer).toBeInstanceOf(StateCapturer);
    });

    it('should create instance with adapter and custom options', () => {
      // Arrange
      adapter = createMockAdapter();
      const options: StateCaptureOptions = {
        maxDepth: 5,
        redactPII: false,
        debug: true,
      };

      // Act
      const capturer = new StateCapturer(adapter, options);

      // Assert
      expect(capturer).toBeDefined();
      expect(capturer).toBeInstanceOf(StateCapturer);
    });

    it('should create instance with empty options', () => {
      // Arrange
      adapter = createMockAdapter();

      // Act
      const capturer = new StateCapturer(adapter, {});

      // Assert
      expect(capturer).toBeDefined();
    });
  });

  describe('capture - basic functionality', () => {
    it('should return success with empty data when adapter returns null', () => {
      // Arrange
      adapter = createMockAdapter();
      adapter.captureState.mockReturnValue(null);
      const capturer = new StateCapturer(adapter);
      const component = createMockComponent();

      // Act
      const result = capturer.capture(component);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toEqual({});
      expect(adapter.captureState).toHaveBeenCalledWith(component);
    });

    it('should return success with empty data when adapter returns undefined', () => {
      // Arrange
      adapter = createMockAdapter();
      //
      adapter.captureState.mockReturnValue(undefined);
      const capturer = new StateCapturer(adapter);
      const component = createMockComponent();

      // Act
      const result = capturer.capture(component);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toEqual({});
    });

    it('should capture and serialize state successfully', () => {
      // Arrange
      const rawState = { count: 5, isActive: true };
      const serializedState = { count: 5, isActive: true };
      adapter = createMockAdapter();
      adapter.captureState.mockReturnValue(rawState);
      mockSerializeValue.mockReturnValue(serializedState);

      const capturer = new StateCapturer(adapter);
      const component = createMockComponent();

      // Act
      const result = capturer.capture(component);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toEqual(serializedState);
      expect(adapter.captureState).toHaveBeenCalledWith(component);
    });

    it('should call serializeValue with correct parameters', () => {
      // Arrange
      const rawState = { count: 0, items: [] };
      adapter = createMockAdapter();
      adapter.captureState.mockReturnValue(rawState);
      mockSerializeValue.mockReturnValue(rawState);

      const capturer = new StateCapturer(adapter, { maxDepth: 5 });
      const component = createMockComponent();

      // Act
      capturer.capture(component);

      // Assert
      expect(mockSerializeValue).toHaveBeenCalledWith(
        rawState,
        expect.objectContaining({
          maxDepth: 5,
          includeFunctions: false,
        }),
      );
    });

    it('should use default maxDepth of 4 when not specified', () => {
      // Arrange
      const rawState = { count: 0 };
      adapter = createMockAdapter();
      adapter.captureState.mockReturnValue(rawState);
      mockSerializeValue.mockReturnValue(rawState);

      const capturer = new StateCapturer(adapter);
      const component = createMockComponent();

      // Act
      capturer.capture(component);

      // Assert
      expect(mockSerializeValue).toHaveBeenCalledWith(
        rawState,
        expect.objectContaining({
          maxDepth: 4,
          includeFunctions: false,
        }),
      );
    });

    it('should always set includeFunctions to false', () => {
      // Arrange
      const rawState = {
        handler: () => {
          // noop
        },
      };
      adapter = createMockAdapter();
      adapter.captureState.mockReturnValue(rawState);
      mockSerializeValue.mockReturnValue({});

      const capturer = new StateCapturer(adapter);
      const component = createMockComponent();

      // Act
      capturer.capture(component);

      // Assert
      expect(mockSerializeValue).toHaveBeenCalledWith(
        rawState,
        expect.objectContaining({
          maxDepth: 4,
          includeFunctions: false,
        }),
      );
    });
  });

  describe('capture - redaction', () => {
    it('should apply redaction by default', () => {
      // Arrange
      const rawState = { email: 'user@example.com', count: 5 };
      const serialized = { email: 'user@example.com', count: 5 };
      const redactedPII = { email: '[REDACTED]', count: 5 };
      const redactedFields = { email: '[REDACTED]', count: 5 };

      adapter = createMockAdapter();
      adapter.captureState.mockReturnValue(rawState);
      mockSerializeValue.mockReturnValue(serialized);
      mockRedactPII.mockReturnValue(redactedPII);
      mockRedactSensitiveFields.mockReturnValue(redactedFields);

      const capturer = new StateCapturer(adapter);
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
      const rawState = { email: 'user@example.com', password: 'secret' };
      const serialized = { email: 'user@example.com', password: 'secret' };

      adapter = createMockAdapter();
      adapter.captureState.mockReturnValue(rawState);
      mockSerializeValue.mockReturnValue(serialized);

      const capturer = new StateCapturer(adapter, { redactPII: false });
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
      const rawState = { apiKey: '123456' };
      const serialized = { apiKey: '123456' };
      const redacted = { apiKey: '[REDACTED]' };

      adapter = createMockAdapter();
      adapter.captureState.mockReturnValue(rawState);
      mockSerializeValue.mockReturnValue(serialized);
      mockRedactPII.mockReturnValue(redacted);
      mockRedactSensitiveFields.mockReturnValue(redacted);

      const capturer = new StateCapturer(adapter, { redactPII: true });
      const component = createMockComponent();

      // Act
      capturer.capture(component);

      // Assert
      expect(mockRedactPII).toHaveBeenCalledWith(serialized);
      expect(mockRedactSensitiveFields).toHaveBeenCalledWith(redacted);
    });

    it('should apply both redactPII and redactSensitiveFields in correct order', () => {
      // Arrange
      const rawState = { email: 'user@example.com', password: 'secret123' };
      const serialized = { email: 'user@example.com', password: 'secret123' };
      const afterPII = { email: '[REDACTED]', password: 'secret123' };
      const afterFields = { email: '[REDACTED]', password: '[REDACTED]' };

      adapter = createMockAdapter();
      adapter.captureState.mockReturnValue(rawState);
      mockSerializeValue.mockReturnValue(serialized);
      mockRedactPII.mockReturnValue(afterPII);
      mockRedactSensitiveFields.mockReturnValue(afterFields);

      const capturer = new StateCapturer(adapter);
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
    it('should use serialized value when it is a plain object', () => {
      // Arrange
      const rawState = { count: 5 };
      const serialized = { count: 5 };

      adapter = createMockAdapter();
      adapter.captureState.mockReturnValue(rawState);
      mockSerializeValue.mockReturnValue(serialized);

      const capturer = new StateCapturer(adapter, { redactPII: false });
      const component = createMockComponent();

      // Act
      const result = capturer.capture(component);

      // Assert
      expect(result.data).toEqual(serialized);
    });

    it('should return empty object when serialized value is not an object', () => {
      // Arrange
      const rawState = { value: 'test' };
      const serialized = 'not an object';

      adapter = createMockAdapter();
      adapter.captureState.mockReturnValue(rawState);
      mockSerializeValue.mockReturnValue(serialized);

      const capturer = new StateCapturer(adapter, { redactPII: false });
      const component = createMockComponent();

      // Act
      const result = capturer.capture(component);

      // Assert
      expect(result.data).toEqual({});
    });

    it('should return empty object when serialized value is null', () => {
      // Arrange
      const rawState = { value: null };

      adapter = createMockAdapter();
      adapter.captureState.mockReturnValue(rawState);
      mockSerializeValue.mockReturnValue(null);

      const capturer = new StateCapturer(adapter, { redactPII: false });
      const component = createMockComponent();

      // Act
      const result = capturer.capture(component);

      // Assert
      expect(result.data).toEqual({});
    });

    it('should return empty object when serialized value is an array', () => {
      // Arrange
      const rawState = { items: [1, 2, 3] };
      const serializedArray = [1, 2, 3];

      adapter = createMockAdapter();
      adapter.captureState.mockReturnValue(rawState);
      mockSerializeValue.mockReturnValue(serializedArray);

      const capturer = new StateCapturer(adapter, { redactPII: false });
      const component = createMockComponent();

      // Act
      const result = capturer.capture(component);

      // Assert
      expect(result.data).toEqual({});
    });

    it('should return empty object when serialized value is a primitive', () => {
      // Arrange
      const rawState = { value: 42 };

      adapter = createMockAdapter();
      adapter.captureState.mockReturnValue(rawState);
      mockSerializeValue.mockReturnValue(42);

      const capturer = new StateCapturer(adapter, { redactPII: false });
      const component = createMockComponent();

      // Act
      const result = capturer.capture(component);

      // Assert
      expect(result.data).toEqual({});
    });

    it('should ensure record is checked after each redaction step', () => {
      // Arrange
      const rawState = { count: 5 };
      const serialized = { count: 5 };

      adapter = createMockAdapter();
      adapter.captureState.mockReturnValue(rawState);
      mockSerializeValue.mockReturnValue(serialized);
      mockRedactPII.mockReturnValue(serialized);
      mockRedactSensitiveFields.mockReturnValue(serialized);

      const capturer = new StateCapturer(adapter);
      const component = createMockComponent();

      // Act
      const result = capturer.capture(component);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toEqual(serialized);
    });

    it('should handle redaction returning non-object gracefully', () => {
      // Arrange
      const rawState = { count: 5 };
      const serialized = { count: 5 };

      adapter = createMockAdapter();
      adapter.captureState.mockReturnValue(rawState);
      mockSerializeValue.mockReturnValue(serialized);
      mockRedactPII.mockReturnValue('not an object');
      mockRedactSensitiveFields.mockReturnValue({});

      const capturer = new StateCapturer(adapter);
      const component = createMockComponent();

      // Act
      const result = capturer.capture(component);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toEqual({});
    });
  });

  describe('capture - error handling', () => {
    it('should return error when adapter.captureState throws', () => {
      // Arrange
      const error = new Error('Adapter failed');
      adapter = createMockAdapter();
      adapter.captureState.mockImplementation(() => {
        throw error;
      });

      const capturer = new StateCapturer(adapter);
      const component = createMockComponent();

      // Act
      const result = capturer.capture(component);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBeInstanceOf(ContextCaptureError);
      expect(result.error?.message).toContain('Failed to capture state');
    });

    it('should return error when serializeValue throws', () => {
      // Arrange
      const rawState = { count: 0 };
      adapter = createMockAdapter();
      adapter.captureState.mockReturnValue(rawState);
      mockSerializeValue.mockImplementation(() => {
        throw new Error('Serialization failed');
      });

      const capturer = new StateCapturer(adapter);
      const component = createMockComponent();

      // Act
      const result = capturer.capture(component);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBeInstanceOf(ContextCaptureError);
    });

    it('should return error when redactPII throws', () => {
      // Arrange
      const rawState = { email: 'user@example.com' };
      adapter = createMockAdapter();
      adapter.captureState.mockReturnValue(rawState);
      mockSerializeValue.mockReturnValue(rawState);
      mockRedactPII.mockImplementation(() => {
        throw new Error('Redaction failed');
      });

      const capturer = new StateCapturer(adapter);
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
      adapter.captureState.mockImplementation(() => {
        throw 'string error';
      });

      const capturer = new StateCapturer(adapter);
      const component = createMockComponent();

      // Act
      const result = capturer.capture(component);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBeInstanceOf(ContextCaptureError);
      expect(result.error?.message).toContain('Failed to capture state');
    });

    it('should wrap original error in ContextCaptureError', () => {
      // Arrange
      const originalError = new Error('Original error message');
      adapter = createMockAdapter();
      adapter.captureState.mockImplementation(() => {
        throw originalError;
      });

      const capturer = new StateCapturer(adapter);
      const component = createMockComponent();

      // Act
      const result = capturer.capture(component);

      // Assert
      expect(result.error).toBeInstanceOf(ContextCaptureError);
      expect(result.error?.message).toContain('Failed to capture state');
    });

    it('should return no data when error occurs', () => {
      // Arrange
      adapter = createMockAdapter();
      adapter.captureState.mockImplementation(() => {
        throw new Error('Fail');
      });

      const capturer = new StateCapturer(adapter);
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
      adapter.captureState.mockReturnValue(null);

      const capturer = new StateCapturer(adapter);

      // Act
      const result = capturer.capture(null);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toEqual({});
      expect(adapter.captureState).toHaveBeenCalledWith(null);
    });

    it('should handle undefined component', () => {
      // Arrange
      adapter = createMockAdapter();
      adapter.captureState.mockReturnValue(null);

      const capturer = new StateCapturer(adapter);

      // Act
      const result = capturer.capture(undefined);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toEqual({});
      expect(adapter.captureState).toHaveBeenCalledWith(undefined);
    });

    it('should handle primitive component', () => {
      // Arrange
      adapter = createMockAdapter();
      adapter.captureState.mockReturnValue(null);

      const capturer = new StateCapturer(adapter);

      // Act
      const result = capturer.capture('string-component');

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toEqual({});
      expect(adapter.captureState).toHaveBeenCalledWith('string-component');
    });

    it('should handle complex component object', () => {
      // Arrange
      const complexComponent = {
        type: 'ComplexComponent',
        state: {
          user: { name: 'Alice', roles: ['admin', 'user'] },
          settings: { theme: 'dark', notifications: true },
          data: { items: [1, 2, 3], total: 100 },
        },
      };
      const capturedState = {
        user: { name: 'Alice', roles: ['admin', 'user'] },
        settings: { theme: 'dark', notifications: true },
        data: { items: [1, 2, 3], total: 100 },
      };

      adapter = createMockAdapter();
      adapter.captureState.mockReturnValue(capturedState);
      mockSerializeValue.mockReturnValue(capturedState);

      const capturer = new StateCapturer(adapter, { redactPII: false });

      // Act
      const result = capturer.capture(complexComponent);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toEqual(capturedState);
    });
  });

  describe('integration scenarios', () => {
    it('should handle complete capture flow with all options', () => {
      // Arrange
      const rawState = {
        email: 'user@example.com',
        password: 'secret123',
        username: 'alice',
        count: 0,
      };
      const serialized = {
        email: 'user@example.com',
        password: 'secret123',
        username: 'alice',
        count: 0,
      };
      const afterPII = {
        email: '[REDACTED]',
        password: 'secret123',
        username: 'alice',
        count: 0,
      };
      const afterFields = {
        email: '[REDACTED]',
        password: '[REDACTED]',
        username: 'alice',
        count: 0,
      };

      adapter = createMockAdapter();
      adapter.captureState.mockReturnValue(rawState);
      mockSerializeValue.mockReturnValue(serialized);
      mockRedactPII.mockReturnValue(afterPII);
      mockRedactSensitiveFields.mockReturnValue(afterFields);

      const capturer = new StateCapturer(adapter, {
        maxDepth: 8,
        redactPII: true,
      });
      const component = createMockComponent();

      // Act
      const result = capturer.capture(component);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toEqual(afterFields);
      expect(mockSerializeValue).toHaveBeenCalledWith(
        rawState,
        expect.objectContaining({
          maxDepth: 8,
          includeFunctions: false,
        }),
      );
      expect(mockRedactPII).toHaveBeenCalledWith(serialized);
      expect(mockRedactSensitiveFields).toHaveBeenCalledWith(afterPII);
    });

    it('should handle empty state object', () => {
      // Arrange
      const emptyState = {};

      adapter = createMockAdapter();
      adapter.captureState.mockReturnValue(emptyState);
      mockSerializeValue.mockReturnValue(emptyState);

      const capturer = new StateCapturer(adapter, { redactPII: false });
      const component = createMockComponent();

      // Act
      const result = capturer.capture(component);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toEqual({});
    });

    it('should handle deeply nested state', () => {
      // Arrange
      const deepState = {
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
      adapter.captureState.mockReturnValue(deepState);
      mockSerializeValue.mockReturnValue(deepState);

      const capturer = new StateCapturer(adapter, {
        maxDepth: 20,
        redactPII: false,
      });
      const component = createMockComponent();

      // Act
      const result = capturer.capture(component);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toEqual(deepState);
      expect(mockSerializeValue).toHaveBeenCalledWith(
        deepState,
        expect.objectContaining({
          maxDepth: 20,
          includeFunctions: false,
        }),
      );
    });

    it('should handle multiple capture calls with same capturer', () => {
      // Arrange
      adapter = createMockAdapter();
      const component1 = { id: 1, state: { count: 0 } };
      const component2 = { id: 2, state: { count: 5 } };
      const state1 = { count: 0 };
      const state2 = { count: 5 };

      adapter.captureState
        .mockReturnValueOnce(state1)
        .mockReturnValueOnce(state2);
      mockSerializeValue
        .mockReturnValueOnce(state1)
        .mockReturnValueOnce(state2);

      const capturer = new StateCapturer(adapter, { redactPII: false });

      // Act
      const result1 = capturer.capture(component1);
      const result2 = capturer.capture(component2);

      // Assert
      expect(result1.success).toBe(true);
      expect(result1.data).toEqual(state1);
      expect(result2.success).toBe(true);
      expect(result2.data).toEqual(state2);
      expect(adapter.captureState).toHaveBeenCalledTimes(2);
    });

    it('should handle state with special characters in keys', () => {
      // Arrange
      const specialState = {
        'data-id': '123',
        'aria-label': 'button',
        '@click': 'handler',
        $store: 'value',
      };

      adapter = createMockAdapter();
      adapter.captureState.mockReturnValue(specialState);
      mockSerializeValue.mockReturnValue(specialState);

      const capturer = new StateCapturer(adapter, { redactPII: false });
      const component = createMockComponent();

      // Act
      const result = capturer.capture(component);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toEqual(specialState);
    });
  });

  describe('options variations', () => {
    it('should respect maxDepth option', () => {
      // Arrange
      const rawState = { a: { b: { c: 'deep' } } };

      adapter = createMockAdapter();
      adapter.captureState.mockReturnValue(rawState);
      mockSerializeValue.mockReturnValue(rawState);

      const capturer = new StateCapturer(adapter, {
        maxDepth: 2,
        redactPII: false,
      });
      const component = createMockComponent();

      // Act
      capturer.capture(component);

      // Assert
      expect(mockSerializeValue).toHaveBeenCalledWith(
        rawState,
        expect.objectContaining({
          maxDepth: 2,
          includeFunctions: false,
        }),
      );
    });

    it('should respect redactPII option when true', () => {
      // Arrange
      const rawState = { sensitive: 'data' };

      adapter = createMockAdapter();
      adapter.captureState.mockReturnValue(rawState);
      mockSerializeValue.mockReturnValue(rawState);
      mockRedactPII.mockReturnValue(rawState);
      mockRedactSensitiveFields.mockReturnValue(rawState);

      const capturer = new StateCapturer(adapter, { redactPII: true });
      const component = createMockComponent();

      // Act
      capturer.capture(component);

      // Assert
      expect(mockRedactPII).toHaveBeenCalled();
      expect(mockRedactSensitiveFields).toHaveBeenCalled();
    });

    it('should handle all options set to default values', () => {
      // Arrange
      const rawState = { count: 0 };

      adapter = createMockAdapter();
      adapter.captureState.mockReturnValue(rawState);
      mockSerializeValue.mockReturnValue(rawState);
      mockRedactPII.mockReturnValue(rawState);
      mockRedactSensitiveFields.mockReturnValue(rawState);

      const capturer = new StateCapturer(adapter, {
        maxDepth: 10,
        redactPII: true,
        debug: false,
      });
      const component = createMockComponent();

      // Act
      const result = capturer.capture(component);

      // Assert
      expect(result.success).toBe(true);
      expect(mockSerializeValue).toHaveBeenCalledWith(
        rawState,
        expect.objectContaining({
          maxDepth: 10,
          includeFunctions: false,
        }),
      );
      expect(mockRedactPII).toHaveBeenCalled();
    });
  });

  describe('CaptureResult type conformance', () => {
    it('should return CaptureResult with success true and data on success', () => {
      // Arrange
      const rawState = { count: 0 };

      adapter = createMockAdapter();
      adapter.captureState.mockReturnValue(rawState);
      mockSerializeValue.mockReturnValue(rawState);

      const capturer = new StateCapturer(adapter, { redactPII: false });
      const component = createMockComponent();

      // Act
      const result: CaptureResult<Record<string, unknown>> =
        capturer.capture(component);

      // Assert
      expect(result).toHaveProperty('success');
      expect(result.success).toBe(true);
      expect(result).toHaveProperty('data');
      expect(result.data).toEqual(rawState);
      expect(result.error).toBeUndefined();
    });

    it('should return CaptureResult with success false and error on failure', () => {
      // Arrange
      adapter = createMockAdapter();
      adapter.captureState.mockImplementation(() => {
        throw new Error('Capture failed');
      });

      const capturer = new StateCapturer(adapter);
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
