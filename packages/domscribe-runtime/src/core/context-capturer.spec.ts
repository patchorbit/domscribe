/**
 * Tests for ContextCapturer
 *
 * Tests the orchestration of runtime context capture.
 * Follows Arrange-Act-Assert methodology and only mocks direct dependencies.
 *
 * @vitest-environment happy-dom
 */

import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import {
  ContextCapturer,
  type ContextCapturerOptions,
} from './context-capturer.js';
import type { FrameworkAdapter } from '../adapters/adapter.interface.js';
import type { RuntimeContext } from '@domscribe/core';
import type { CaptureOptions } from '../capture/types.js';
import { ContextCaptureError } from '../errors/index.js';

// Type Definitions
interface MockFrameworkAdapter extends FrameworkAdapter {
  captureProps: Mock;
  captureState: Mock;
  getComponentInstance: Mock;
}

// Mock serialization and redaction utilities
const mockSerializeValue = vi.fn();
const mockRedactPII = vi.fn();
const mockRedactSensitiveFields = vi.fn();
const mockIsRecord = vi.fn(
  (value: unknown): value is Record<string, unknown> =>
    typeof value === 'object' && value !== null && !Array.isArray(value),
);

vi.mock('../utils/serialization.js', () => ({
  serializeValue: (...args: unknown[]) => mockSerializeValue(...args),
}));

vi.mock('@domscribe/core', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@domscribe/core')>();
  return {
    ...actual,
    redactPII: (...args: unknown[]) => mockRedactPII(...args),
    redactSensitiveFields: (...args: unknown[]) =>
      mockRedactSensitiveFields(...args),
    isRecord: (value: unknown) => mockIsRecord(value),
  };
});

const mockPropsCapture = vi.fn().mockReturnValue({
  success: false,
});
const mockStateCapture = vi.fn().mockReturnValue({
  success: false,
});

vi.mock('../capture/props-capturer.js', () => ({
  PropsCapturer: class {
    capture = (element: unknown) => mockPropsCapture(element);
  },
}));

vi.mock('../capture/state-capturer.js', () => ({
  StateCapturer: class {
    capture = (element: unknown) => mockStateCapture(element);
  },
}));

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

describe('ContextCapturer', () => {
  let adapter: MockFrameworkAdapter;

  beforeEach(() => {
    vi.clearAllMocks();

    // Create mock adapter
    adapter = createMockAdapter();

    // Set up default mock behaviors
    mockPropsCapture.mockReturnValue({
      success: false,
    });
    mockStateCapture.mockReturnValue({
      success: false,
    });
    mockSerializeValue.mockImplementation((value) => value);
    mockRedactPII.mockImplementation((value) => value);
    mockRedactSensitiveFields.mockImplementation((value) => value);
  });

  describe('Constructor', () => {
    it('should create instance with minimal options', () => {
      // Arrange
      const options: ContextCapturerOptions = { adapter };

      // Act
      const capturer = new ContextCapturer(options);

      // Assert
      expect(capturer).toBeDefined();
      expect(capturer).toBeInstanceOf(ContextCapturer);
    });

    it('should create instance with all options specified', () => {
      // Arrange
      const options: ContextCapturerOptions = {
        adapter,
        phase: 2,
        maxDepth: 15,
        redactPII: false,
        debug: true,
      };

      // Act
      const capturer = new ContextCapturer(options);

      // Assert
      expect(capturer).toBeDefined();
      expect(capturer).toBeInstanceOf(ContextCapturer);
    });
  });

  describe('captureForElement - basic functionality', () => {
    it('should return null when no component instance found', async () => {
      // Arrange
      adapter.getComponentInstance.mockReturnValue(null);
      const capturer = new ContextCapturer({ adapter });
      const element = document.createElement('div');

      // Act
      const result = await capturer.captureForElement(element);

      // Assert
      expect(result).toBeNull();
      expect(adapter.getComponentInstance).toHaveBeenCalledWith(element);
    });

    it('should capture context when component instance found', async () => {
      // Arrange
      const componentInstance = { type: 'TestComponent' };
      adapter.getComponentInstance.mockReturnValue(componentInstance);
      mockPropsCapture.mockReturnValue({
        success: true,
        data: { prop1: 'value1' },
      });
      mockStateCapture.mockReturnValue({
        success: true,
        data: { state1: 'value2' },
      });

      const capturer = new ContextCapturer({ adapter });
      const element = document.createElement('div');

      // Act
      const result = await capturer.captureForElement(element);

      // Assert
      expect(result).toBeDefined();
      expect(result?.componentProps).toEqual({ prop1: 'value1' });
      expect(result?.componentState).toEqual({ state1: 'value2' });
    });

    it('should pass options to captureForComponent', async () => {
      // Arrange
      const componentInstance = { type: 'TestComponent' };
      adapter.getComponentInstance.mockReturnValue(componentInstance);
      mockPropsCapture.mockReturnValue({
        success: true,
        data: { prop1: 'value1' },
      });

      const capturer = new ContextCapturer({ adapter });
      const element = document.createElement('div');
      const options: CaptureOptions = {
        includeProps: true,
        includeState: false,
      };

      // Act
      const result = await capturer.captureForElement(element, options);

      // Assert
      expect(result?.componentProps).toBeDefined();
      expect(result?.componentState).toBeUndefined();
    });

    it('should call adapter.getComponentInstance with the element', async () => {
      // Arrange
      adapter.getComponentInstance.mockReturnValue(null);
      const capturer = new ContextCapturer({ adapter });
      const element = document.createElement('button');
      element.id = 'test-button';

      // Act
      await capturer.captureForElement(element);

      // Assert
      expect(adapter.getComponentInstance).toHaveBeenCalledWith(element);
      expect(adapter.getComponentInstance).toHaveBeenCalledTimes(1);
    });
  });

  describe('captureForElement - error handling', () => {
    it('should throw ContextCaptureError when adapter throws', async () => {
      // Arrange
      adapter.getComponentInstance.mockImplementation(() => {
        throw new Error('Adapter failed');
      });
      const capturer = new ContextCapturer({ adapter });
      const element = document.createElement('div');

      // Act & Assert
      await expect(capturer.captureForElement(element)).rejects.toThrow(
        ContextCaptureError,
      );
      await expect(capturer.captureForElement(element)).rejects.toThrow(
        'Failed to capture context for element',
      );
    });

    it('should handle non-Error exceptions', async () => {
      // Arrange
      adapter.getComponentInstance.mockImplementation(() => {
        throw 'string error';
      });
      const capturer = new ContextCapturer({ adapter });
      const element = document.createElement('div');

      // Act & Assert
      await expect(capturer.captureForElement(element)).rejects.toThrow(
        ContextCaptureError,
      );
    });

    it('should wrap original error in ContextCaptureError', async () => {
      // Arrange
      const originalError = new Error('Original error');
      adapter.getComponentInstance.mockImplementation(() => {
        throw originalError;
      });
      const capturer = new ContextCapturer({ adapter });
      const element = document.createElement('div');

      // Act & Assert
      await expect(capturer.captureForElement(element)).rejects.toThrow(
        ContextCaptureError,
      );
    });
  });

  describe('captureForComponent - Phase 1 (props and state)', () => {
    it('should capture props when includeProps is not false', async () => {
      // Arrange
      const component = { type: 'TestComponent' };
      const propsData = { name: 'test', value: 42 };

      mockPropsCapture.mockReturnValue({
        success: true,
        data: propsData,
      });

      const capturer = new ContextCapturer({ adapter });

      // Act
      const result = await capturer.captureForComponent(component);

      // Assert
      expect(result.componentProps).toEqual(propsData);
      expect(mockPropsCapture).toHaveBeenCalledWith(component);
    });

    it('should capture state when includeState is not false', async () => {
      // Arrange
      const component = { type: 'TestComponent' };
      const stateData = { count: 5, isActive: true };

      mockPropsCapture.mockReturnValue({
        success: true,
        data: {},
      });
      mockStateCapture.mockReturnValue({
        success: true,
        data: stateData,
      });

      const capturer = new ContextCapturer({ adapter });

      // Act
      const result = await capturer.captureForComponent(component);

      // Assert
      expect(result.componentState).toEqual(stateData);
      expect(mockStateCapture).toHaveBeenCalledWith(component);
    });

    it('should skip props capture when includeProps is false', async () => {
      // Arrange
      const component = { type: 'TestComponent' };

      const capturer = new ContextCapturer({ adapter });
      const options: CaptureOptions = { includeProps: false };

      // Act
      const result = await capturer.captureForComponent(component, options);

      // Assert
      expect(result.componentProps).toBeUndefined();
      expect(mockPropsCapture).not.toHaveBeenCalled();
    });

    it('should skip state capture when includeState is false', async () => {
      // Arrange
      const component = { type: 'TestComponent' };

      const capturer = new ContextCapturer({ adapter });
      const options: CaptureOptions = { includeState: false };

      // Act
      const result = await capturer.captureForComponent(component, options);

      // Assert
      expect(result.componentState).toBeUndefined();
      expect(mockStateCapture).not.toHaveBeenCalled();
    });

    it('should handle props capture failure gracefully', async () => {
      // Arrange
      const component = { type: 'TestComponent' };

      mockPropsCapture.mockReturnValue({
        success: false,
        error: new Error('Props capture failed'),
      });
      mockStateCapture.mockReturnValue({
        success: true,
        data: { state: 'value' },
      });

      const capturer = new ContextCapturer({ adapter });

      // Act
      const result = await capturer.captureForComponent(component);

      // Assert
      expect(result.componentProps).toBeUndefined();
      expect(result.componentState).toEqual({ state: 'value' });
    });

    it('should handle state capture failure gracefully', async () => {
      // Arrange
      const component = { type: 'TestComponent' };

      mockPropsCapture.mockReturnValue({
        success: true,
        data: { prop: 'value' },
      });
      mockStateCapture.mockReturnValue({
        success: false,
        error: new Error('State capture failed'),
      });

      const capturer = new ContextCapturer({ adapter });

      // Act
      const result = await capturer.captureForComponent(component);

      // Assert
      expect(result.componentProps).toEqual({ prop: 'value' });
      expect(result.componentState).toBeUndefined();
    });

    it('should not include props in context when capture returns no data', async () => {
      // Arrange
      const component = { type: 'TestComponent' };

      mockPropsCapture.mockReturnValue({
        success: false,
      });

      const capturer = new ContextCapturer({ adapter });

      // Act
      const result = await capturer.captureForComponent(component);

      // Assert
      expect(result.componentProps).toBeUndefined();
    });

    it('should not include state in context when capture returns no data', async () => {
      // Arrange
      const component = { type: 'TestComponent' };

      mockStateCapture.mockReturnValue({
        success: false,
      });

      const capturer = new ContextCapturer({ adapter });

      // Act
      const result = await capturer.captureForComponent(component);

      // Assert
      expect(result.componentState).toBeUndefined();
    });
  });

  describe('Integration scenarios', () => {
    it('should handle complete Phase 1 workflow', async () => {
      // Arrange
      const componentInstance = { type: 'ComplexComponent' };
      const propsData = { user: { name: 'Alice' }, count: 5 };
      const stateData = { isActive: true, items: [1, 2, 3] };

      adapter.getComponentInstance.mockReturnValue(componentInstance);

      mockPropsCapture.mockReturnValue({
        success: true,
        data: propsData,
      });
      mockStateCapture.mockReturnValue({
        success: true,
        data: stateData,
      });

      const capturer = new ContextCapturer({ adapter, phase: 1 });
      const element = document.createElement('div');

      // Act
      const result = await capturer.captureForElement(element);

      // Assert
      expect(result).toBeDefined();
      expect(result?.componentProps).toEqual(propsData);
      expect(result?.componentState).toEqual(stateData);
    });

    it('should handle empty capture results', async () => {
      // Arrange
      const component = { type: 'TestComponent' };

      mockPropsCapture.mockReturnValue({
        success: true,
        data: {},
      });
      mockStateCapture.mockReturnValue({
        success: true,
        data: {},
      });

      const capturer = new ContextCapturer({ adapter });

      // Act
      const result = await capturer.captureForComponent(component);

      // Assert
      expect(result.componentProps).toEqual({});
      expect(result.componentState).toEqual({});
    });

    it('should handle all captures failing', async () => {
      // Arrange
      const component = { type: 'TestComponent' };

      mockPropsCapture.mockReturnValue({
        success: false,
        error: new Error('Props failed'),
      });
      mockStateCapture.mockReturnValue({
        success: false,
        error: new Error('State failed'),
      });

      const capturer = new ContextCapturer({ adapter });

      // Act
      const result = await capturer.captureForComponent(component);

      // Assert
      expect(result).toEqual({});
    });

    it('should handle multiple calls with same capturer instance', async () => {
      // Arrange
      const component1 = { id: 1 };
      const component2 = { id: 2 };

      mockPropsCapture
        .mockReturnValueOnce({ success: true, data: { id: 1 } })
        .mockReturnValueOnce({ success: true, data: { id: 2 } });

      mockStateCapture
        .mockReturnValueOnce({ success: true, data: { count: 1 } })
        .mockReturnValueOnce({ success: true, data: { count: 2 } });

      const capturer = new ContextCapturer({ adapter });

      // Act
      const result1 = await capturer.captureForComponent(component1);
      const result2 = await capturer.captureForComponent(component2);

      // Assert
      expect(result1.componentProps).toEqual({ id: 1 });
      expect(result1.componentState).toEqual({ count: 1 });
      expect(result2.componentProps).toEqual({ id: 2 });
      expect(result2.componentState).toEqual({ count: 2 });
    });
  });

  describe('RuntimeContext type conformance', () => {
    it('should return object conforming to RuntimeContext type', async () => {
      // Arrange
      const component = { type: 'TestComponent' };

      mockPropsCapture.mockReturnValue({
        success: true,
        data: { prop: 'value' },
      });
      mockStateCapture.mockReturnValue({
        success: true,
        data: { state: 'value' },
      });

      const capturer = new ContextCapturer({ adapter });

      // Act
      const result: RuntimeContext =
        await capturer.captureForComponent(component);

      // Assert
      expect(result).toBeDefined();
      expect(typeof result).toBe('object');
    });

    it('should have optional componentProps property', async () => {
      // Arrange
      const component = { type: 'TestComponent' };

      mockPropsCapture.mockReturnValue({
        success: true,
        data: { prop: 'value' },
      });

      const capturer = new ContextCapturer({ adapter });

      // Act
      const result = await capturer.captureForComponent(component);

      // Assert
      expect(result.componentProps).toBeDefined();
    });

    it('should have optional componentState property', async () => {
      // Arrange
      const component = { type: 'TestComponent' };

      mockStateCapture.mockReturnValue({
        success: true,
        data: { state: 'value' },
      });

      const capturer = new ContextCapturer({ adapter });

      // Act
      const result = await capturer.captureForComponent(component);

      // Assert
      expect(result.componentState).toBeDefined();
    });
  });

  describe('Edge cases', () => {
    it('should handle null component', async () => {
      // Arrange
      mockPropsCapture.mockReturnValue({});
      mockStateCapture.mockReturnValue({});

      const capturer = new ContextCapturer({ adapter });

      // Act
      const result = await capturer.captureForComponent(null);

      // Assert
      expect(result).toBeDefined();
      expect(mockPropsCapture).toHaveBeenCalledWith(null);
      expect(mockStateCapture).toHaveBeenCalledWith(null);
    });

    it('should handle undefined component', async () => {
      // Arrange

      mockPropsCapture.mockReturnValue({});
      mockStateCapture.mockReturnValue({});

      const capturer = new ContextCapturer({ adapter });

      // Act
      const result = await capturer.captureForComponent(undefined);

      // Assert
      expect(result).toBeDefined();
      expect(mockPropsCapture).toHaveBeenCalledWith(undefined);
      expect(mockStateCapture).toHaveBeenCalledWith(undefined);
    });

    it('should handle empty options object', async () => {
      // Arrange
      const component = { type: 'TestComponent' };

      mockPropsCapture.mockReturnValue({
        success: true,
        data: { prop: 'value' },
      });
      mockStateCapture.mockReturnValue({
        success: true,
        data: { state: 'value' },
      });

      const capturer = new ContextCapturer({ adapter });

      // Act
      const result = await capturer.captureForComponent(component, {});

      // Assert
      expect(result.componentProps).toBeDefined();
      expect(result.componentState).toBeDefined();
    });
  });
});
