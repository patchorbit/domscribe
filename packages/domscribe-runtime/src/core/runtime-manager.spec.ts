/**
 * Tests for RuntimeManager
 *
 * Tests the singleton runtime coordinator that manages element tracking,
 * context capture, and framework adapters.
 * Follows Arrange-Act-Assert methodology and only mocks direct dependencies.
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, afterEach, vi, Mock } from 'vitest';
import { RuntimeManager } from './runtime-manager.js';
import type { RuntimeOptions, ElementInfo } from './types.js';
import type { FrameworkAdapter } from '../adapters/adapter.interface.js';
import type { RuntimeContext } from '@domscribe/core';
import type { CaptureOptions } from '../capture/types.js';

// ============================================================================
// Types
// ============================================================================

interface MockElementTracker {
  observeDOM: ReturnType<typeof vi.fn>;
  getElement: ReturnType<typeof vi.fn>;
  getElementInfo: ReturnType<typeof vi.fn>;
  getAllEntryIds: ReturnType<typeof vi.fn>;
  getTrackedCount: ReturnType<typeof vi.fn>;
  dispose: ReturnType<typeof vi.fn>;
}

interface MockContextCapturer {
  captureForElement: ReturnType<typeof vi.fn>;
}

interface MockFrameworkAdapter extends FrameworkAdapter {
  name: string;
  version: string;
  getComponentInstance: Mock;
  captureProps: Mock;
  captureState: Mock;
  getComponentName: Mock;
}

// ============================================================================
// Mock Setup
// ============================================================================

const mockElementTracker: MockElementTracker = {
  observeDOM: vi.fn(),
  getElement: vi.fn(),
  getElementInfo: vi.fn(),
  getAllEntryIds: vi.fn(),
  getTrackedCount: vi.fn(),
  dispose: vi.fn(),
};

const mockContextCapturer: MockContextCapturer = {
  captureForElement: vi.fn(),
};

const mockRuntimeNotInitializedError = vi.fn();
const mockRuntimeError = vi.fn();

// Mock ElementTracker
vi.mock('./element-tracker.js', () => ({
  ElementTracker: class MockElementTrackerClass {
    observeDOM = mockElementTracker.observeDOM;
    getElement = mockElementTracker.getElement;
    getElementInfo = mockElementTracker.getElementInfo;
    getAllEntryIds = mockElementTracker.getAllEntryIds;
    getTrackedCount = mockElementTracker.getTrackedCount;
    dispose = mockElementTracker.dispose;
  },
}));

// Mock ContextCapturer
vi.mock('./context-capturer.js', () => ({
  ContextCapturer: class MockContextCapturerClass {
    captureForElement = mockContextCapturer.captureForElement;
  },
}));

// Mock NoopAdapter
const mockNoopAdapter = {
  name: 'noop',
  version: '1.0.0',
  getComponentInstance: vi.fn(),
  captureProps: vi.fn(),
  captureState: vi.fn(),
  getComponentName: vi.fn(),
};

vi.mock('../adapters/noop-adapter.js', () => ({
  NoopAdapter: class MockNoopAdapter {
    name = 'noop';
    version = '1.0.0';
    getComponentInstance = mockNoopAdapter.getComponentInstance;
    captureProps = mockNoopAdapter.captureProps;
    captureState = mockNoopAdapter.captureState;
    getComponentName = mockNoopAdapter.getComponentName;
  },
}));

// Mock errors
vi.mock('../errors/index.js', () => ({
  RuntimeNotInitializedError: class RuntimeNotInitializedError extends Error {
    constructor() {
      super('RuntimeManager not initialized');
      mockRuntimeNotInitializedError();
      this.name = 'RuntimeNotInitializedError';
    }
  },
  RuntimeError: class RuntimeError extends Error {
    constructor(message: string, cause?: Error) {
      super(message);
      mockRuntimeError(message, cause);
      this.name = 'RuntimeError';
    }
  },
}));

// ============================================================================
// Test Helpers
// ============================================================================

function createMockAdapter(): MockFrameworkAdapter {
  return {
    name: 'mock',
    version: '1.0.0',
    getComponentInstance: vi.fn().mockReturnValue({ type: 'Component' }),
    captureProps: vi.fn().mockReturnValue({ prop: 'value' }),
    captureState: vi.fn().mockReturnValue({ state: 'data' }),
    getComponentName: vi.fn().mockReturnValue('MockComponent'),
  };
}

function createMockElement(id: string): HTMLElement {
  const element = document.createElement('div');
  element.setAttribute('data-ds', id);
  return element;
}

function createMockElementInfo(id: string): ElementInfo {
  return {
    element: createMockElement(id),
    entryId: id,
    componentInstance: { type: 'Component' },
    componentName: 'TestComponent',
  };
}

function createMockRuntimeContext(): RuntimeContext {
  return {
    componentProps: { prop: 'value' },
    componentState: { state: 'data' },
  };
}

// ============================================================================
// Tests
// ============================================================================

describe('RuntimeManager', () => {
  let manager: RuntimeManager;

  beforeEach(() => {
    vi.clearAllMocks();

    // Set dev-mode signal so existing tests continue to work
    window.__DOMSCRIBE_RELAY_PORT__ = 4500;

    // Reset singleton
    RuntimeManager.resetInstance();

    // Get fresh instance
    manager = RuntimeManager.getInstance();

    // Reset mock return values to defaults
    mockElementTracker.observeDOM.mockReturnValue(undefined);
    mockElementTracker.getElement.mockReturnValue(null);
    mockElementTracker.getElementInfo.mockReturnValue(null);
    mockElementTracker.getAllEntryIds.mockReturnValue([]);
    mockElementTracker.getTrackedCount.mockReturnValue(0);
    mockElementTracker.dispose.mockReturnValue(undefined);

    mockContextCapturer.captureForElement.mockResolvedValue(null);
  });

  afterEach(() => {
    RuntimeManager.resetInstance();
    delete window.__DOMSCRIBE_RELAY_PORT__;
  });

  describe('Singleton pattern', () => {
    it('should return the same instance on multiple calls', () => {
      // Arrange & Act
      const instance1 = RuntimeManager.getInstance();
      const instance2 = RuntimeManager.getInstance();

      // Assert
      expect(instance1).toBe(instance2);
    });

    it('should create new instance after reset', () => {
      // Arrange
      const instance1 = RuntimeManager.getInstance();

      // Act
      RuntimeManager.resetInstance();
      const instance2 = RuntimeManager.getInstance();

      // Assert
      expect(instance2).not.toBe(instance1);
    });

    it('should not dispose tracker when resetting uninitialized instance', () => {
      // Arrange & Act
      RuntimeManager.resetInstance();

      // Assert
      expect(mockElementTracker.dispose).not.toHaveBeenCalled();
    });
  });

  describe('initialize()', () => {
    it('should initialize with default options', async () => {
      // Arrange & Act
      await manager.initialize();

      // Assert
      expect(mockElementTracker.observeDOM).toHaveBeenCalled();
      expect(manager.isReady()).toBe(true);
    });

    it('should initialize with custom phase', async () => {
      // Arrange
      const options: RuntimeOptions = { phase: 2 };

      // Act
      await manager.initialize(options);

      // Assert
      expect(manager.isReady()).toBe(true);
    });

    it('should initialize with custom adapter', async () => {
      // Arrange
      const adapter = createMockAdapter();
      const options: RuntimeOptions = { adapter };

      // Act
      await manager.initialize(options);

      // Assert
      expect(manager.isReady()).toBe(true);
    });

    it('should initialize with all options', async () => {
      // Arrange
      const adapter = createMockAdapter();
      const options: RuntimeOptions = {
        phase: 2,
        adapter,
        debug: false,
        redactPII: false,
        blockSelectors: ['[data-private]', '.sensitive'],
      };

      // Act
      await manager.initialize(options);

      // Assert
      expect(manager.isReady()).toBe(true);
    });

    it('should cleanup and re-initialize when already initialized', async () => {
      // Arrange
      await manager.initialize();
      const disposeCallsBeforeReinit =
        mockElementTracker.dispose.mock.calls.length;

      // Act
      await manager.initialize();

      // Assert
      const disposeCallsAfterReinit =
        mockElementTracker.dispose.mock.calls.length;
      expect(disposeCallsAfterReinit).toBeGreaterThan(disposeCallsBeforeReinit);
      expect(manager.isReady()).toBe(true);
    });

    it('should throw RuntimeError if ElementTracker initialization fails', async () => {
      // Arrange
      const error = new Error('Tracker failed');
      mockElementTracker.observeDOM.mockImplementation(() => {
        throw error;
      });

      // Act & Assert
      await expect(manager.initialize()).rejects.toThrow(
        'Failed to initialize RuntimeManager',
      );
      expect(mockRuntimeError).toHaveBeenCalledWith(
        'Failed to initialize RuntimeManager',
        error,
      );
    });
  });

  describe('captureContext()', () => {
    beforeEach(async () => {
      await manager.initialize();
    });

    it('should capture context for existing element', async () => {
      // Arrange
      const entryId = 'elem001';
      const element = createMockElement(entryId);
      const context = createMockRuntimeContext();

      mockElementTracker.getElement.mockReturnValue(element);
      mockContextCapturer.captureForElement.mockResolvedValue(context);

      // Act
      const result = await manager.captureContext(entryId);

      // Assert
      expect(mockElementTracker.getElement).toHaveBeenCalledWith(entryId);
      expect(mockContextCapturer.captureForElement).toHaveBeenCalledWith(
        element,
        {},
      );
      expect(result).toBe(context);
    });

    it('should return null for non-existent element', async () => {
      // Arrange
      const entryId = 'nonexistent';
      mockElementTracker.getElement.mockReturnValue(null);

      // Act
      const result = await manager.captureContext(entryId);

      // Assert
      expect(result).toBeNull();
    });

    it('should return null for blocked element', async () => {
      // Arrange
      await manager.initialize({ blockSelectors: ['[data-private]'] });
      const entryId = 'elem001';
      const element = createMockElement(entryId);
      element.setAttribute('data-private', 'true');

      mockElementTracker.getElement.mockReturnValue(element);

      // Act
      const result = await manager.captureContext(entryId);

      // Assert
      expect(result).toBeNull();
      expect(mockContextCapturer.captureForElement).not.toHaveBeenCalled();
    });

    it('should pass capture options to context capturer', async () => {
      // Arrange
      const entryId = 'elem001';
      const element = createMockElement(entryId);
      const context = createMockRuntimeContext();
      const options: CaptureOptions = {
        includeProps: true,
        includeState: false,
        maxDepth: 5,
      };

      mockElementTracker.getElement.mockReturnValue(element);
      mockContextCapturer.captureForElement.mockResolvedValue(context);

      // Act
      await manager.captureContext(entryId, options);

      // Assert
      expect(mockContextCapturer.captureForElement).toHaveBeenCalledWith(
        element,
        options,
      );
    });

    it('should throw RuntimeError when not initialized', async () => {
      // Arrange
      RuntimeManager.resetInstance();
      const freshManager = RuntimeManager.getInstance();

      // Act & Assert
      await expect(freshManager.captureContext('elem001')).rejects.toThrow(
        'RuntimeManager not initialized',
      );
      expect(mockRuntimeNotInitializedError).toHaveBeenCalled();
    });

    it('should throw RuntimeError when captureForElement fails', async () => {
      // Arrange
      const entryId = 'elem001';
      const element = createMockElement(entryId);
      const error = new Error('Capture failed');

      mockElementTracker.getElement.mockReturnValue(element);
      mockContextCapturer.captureForElement.mockRejectedValue(error);

      // Act & Assert
      await expect(manager.captureContext(entryId)).rejects.toThrow(
        'Failed to capture context for element with data-ds ID elem001',
      );
      expect(mockRuntimeError).toHaveBeenCalledWith(
        'Failed to capture context for element with data-ds ID elem001',
        error,
      );
    });

    it('should handle multiple block selectors', async () => {
      // Arrange
      await manager.initialize({
        blockSelectors: ['[data-private]', '.sensitive', '#secret'],
      });
      const entryId = 'elem001';
      const element = createMockElement(entryId);
      element.className = 'sensitive';

      mockElementTracker.getElement.mockReturnValue(element);

      // Act
      const result = await manager.captureContext(entryId);

      // Assert
      expect(result).toBeNull();
    });

    it('should not block element that does not match selectors', async () => {
      // Arrange
      await manager.initialize({ blockSelectors: ['[data-private]'] });
      const entryId = 'elem001';
      const element = createMockElement(entryId);
      const context = createMockRuntimeContext();

      mockElementTracker.getElement.mockReturnValue(element);
      mockContextCapturer.captureForElement.mockResolvedValue(context);

      // Act
      const result = await manager.captureContext(entryId);

      // Assert
      expect(result).toBe(context);
      expect(mockContextCapturer.captureForElement).toHaveBeenCalled();
    });

    it('should handle invalid block selector gracefully', async () => {
      // Arrange
      await manager.initialize({ blockSelectors: ['[invalid:::selector]'] });
      const entryId = 'elem001';
      const element = createMockElement(entryId);
      const context = createMockRuntimeContext();

      mockElementTracker.getElement.mockReturnValue(element);
      mockContextCapturer.captureForElement.mockResolvedValue(context);

      // Act
      const result = await manager.captureContext(entryId);

      // Assert - should not crash and should capture context
      expect(result).toBe(context);
    });
  });

  describe('captureContextForElement()', () => {
    beforeEach(async () => {
      await manager.initialize();
    });

    it('should capture context for a valid element', async () => {
      // Arrange
      const entryId = 'elem001';
      const element = createMockElement(entryId);
      const context = createMockRuntimeContext();

      mockContextCapturer.captureForElement.mockResolvedValue(context);

      // Act
      const result = await manager.captureContextForElement(element);

      // Assert
      expect(mockContextCapturer.captureForElement).toHaveBeenCalledWith(
        element,
        {},
      );
      expect(result).toBe(context);
    });

    it('should return null for non-HTMLElement input', async () => {
      // Arrange
      const notAnElement = { tagName: 'DIV' } as unknown as HTMLElement;

      // Act
      const result = await manager.captureContextForElement(notAnElement);

      // Assert
      expect(result).toBeNull();
      expect(mockContextCapturer.captureForElement).not.toHaveBeenCalled();
    });

    it('should return null for null element', async () => {
      // Arrange & Act
      const result = await manager.captureContextForElement(
        null as unknown as HTMLElement,
      );

      // Assert
      expect(result).toBeNull();
    });

    it('should return null for undefined element', async () => {
      // Arrange & Act
      const result = await manager.captureContextForElement(
        undefined as unknown as HTMLElement,
      );

      // Assert
      expect(result).toBeNull();
    });

    it('should return null for blocked element', async () => {
      // Arrange
      await manager.initialize({ blockSelectors: ['[data-private]'] });
      const element = createMockElement('elem001');
      element.setAttribute('data-private', 'true');

      // Act
      const result = await manager.captureContextForElement(element);

      // Assert
      expect(result).toBeNull();
      expect(mockContextCapturer.captureForElement).not.toHaveBeenCalled();
    });

    it('should pass capture options to context capturer', async () => {
      // Arrange
      const element = createMockElement('elem001');
      const context = createMockRuntimeContext();
      const options: CaptureOptions = {
        includeProps: true,
        includeState: false,
        maxDepth: 5,
      };

      mockContextCapturer.captureForElement.mockResolvedValue(context);

      // Act
      await manager.captureContextForElement(element, options);

      // Assert
      expect(mockContextCapturer.captureForElement).toHaveBeenCalledWith(
        element,
        options,
      );
    });

    it('should throw RuntimeNotInitializedError when not initialized', async () => {
      // Arrange
      RuntimeManager.resetInstance();
      const freshManager = RuntimeManager.getInstance();
      const element = createMockElement('elem001');

      // Act & Assert
      await expect(
        freshManager.captureContextForElement(element),
      ).rejects.toThrow('RuntimeManager not initialized');
      expect(mockRuntimeNotInitializedError).toHaveBeenCalled();
    });

    it('should throw RuntimeError when captureForElement fails', async () => {
      // Arrange
      const element = createMockElement('elem001');
      const error = new Error('Capture failed');

      mockContextCapturer.captureForElement.mockRejectedValue(error);

      // Act & Assert
      await expect(manager.captureContextForElement(element)).rejects.toThrow(
        'Failed to capture context for element',
      );
      expect(mockRuntimeError).toHaveBeenCalledWith(
        'Failed to capture context for element',
        error,
      );
    });

    it('should work with element that has no data-ds attribute', async () => {
      // Arrange
      const element = document.createElement('div');
      element.className = 'no-ds-id';
      const context = createMockRuntimeContext();

      mockContextCapturer.captureForElement.mockResolvedValue(context);

      // Act
      const result = await manager.captureContextForElement(element);

      // Assert
      expect(result).toBe(context);
      expect(mockContextCapturer.captureForElement).toHaveBeenCalledWith(
        element,
        {},
      );
    });

    it('should handle multiple block selectors', async () => {
      // Arrange
      await manager.initialize({
        blockSelectors: ['[data-private]', '.sensitive', '#secret'],
      });
      const element = createMockElement('elem001');
      element.className = 'sensitive';

      // Act
      const result = await manager.captureContextForElement(element);

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('getElementInfo()', () => {
    beforeEach(async () => {
      await manager.initialize();
    });

    it('should get element info by ID', () => {
      // Arrange
      const entryId = 'elem001';
      const elementInfo = createMockElementInfo(entryId);
      mockElementTracker.getElementInfo.mockReturnValue(elementInfo);

      // Act
      const result = manager.getElementInfo(entryId);

      // Assert
      expect(mockElementTracker.getElementInfo).toHaveBeenCalledWith(entryId);
      expect(result).toBe(elementInfo);
    });

    it('should return null for non-existent element', () => {
      // Arrange
      const entryId = 'nonexistent';
      mockElementTracker.getElementInfo.mockReturnValue(null);

      // Act
      const result = manager.getElementInfo(entryId);

      // Assert
      expect(result).toBeNull();
    });

    it('should throw RuntimeNotInitializedError when not initialized', () => {
      // Arrange
      RuntimeManager.resetInstance();
      const freshManager = RuntimeManager.getInstance();

      // Act & Assert
      expect(() => freshManager.getElementInfo('elem001')).toThrow(
        'RuntimeManager not initialized',
      );
    });
  });

  describe('getAllEntryIds()', () => {
    beforeEach(async () => {
      await manager.initialize();
    });

    it('should return all tracked element IDs', () => {
      // Arrange
      const entryIds = ['elem001', 'elem002', 'elem003'];
      mockElementTracker.getAllEntryIds.mockReturnValue(entryIds);

      // Act
      const result = manager.getAllEntryIds();

      // Assert
      expect(mockElementTracker.getAllEntryIds).toHaveBeenCalled();
      expect(result).toEqual(entryIds);
    });

    it('should return empty array when no elements tracked', () => {
      // Arrange
      mockElementTracker.getAllEntryIds.mockReturnValue([]);

      // Act
      const result = manager.getAllEntryIds();

      // Assert
      expect(result).toEqual([]);
    });

    it('should throw RuntimeNotInitializedError when not initialized', () => {
      // Arrange
      RuntimeManager.resetInstance();
      const freshManager = RuntimeManager.getInstance();

      // Act & Assert
      expect(() => freshManager.getAllEntryIds()).toThrow(
        'RuntimeManager not initialized',
      );
    });
  });

  describe('getTrackedCount()', () => {
    beforeEach(async () => {
      await manager.initialize();
    });

    it('should return count of tracked elements', () => {
      // Arrange
      mockElementTracker.getTrackedCount.mockReturnValue(5);

      // Act
      const result = manager.getTrackedCount();

      // Assert
      expect(mockElementTracker.getTrackedCount).toHaveBeenCalled();
      expect(result).toBe(5);
    });

    it('should return 0 when no elements tracked', () => {
      // Arrange
      mockElementTracker.getTrackedCount.mockReturnValue(0);

      // Act
      const result = manager.getTrackedCount();

      // Assert
      expect(result).toBe(0);
    });

    it('should throw RuntimeNotInitializedError when not initialized', () => {
      // Arrange
      RuntimeManager.resetInstance();
      const freshManager = RuntimeManager.getInstance();

      // Act & Assert
      expect(() => freshManager.getTrackedCount()).toThrow(
        'RuntimeManager not initialized',
      );
    });
  });

  describe('registerAdapter()', () => {
    it('should register adapter before initialization', () => {
      // Arrange
      const adapter = createMockAdapter();

      // Act
      manager.registerAdapter(adapter);

      // Assert - no error, adapter stored for later use
      expect(manager.isReady()).toBe(false);
    });

    it('should register adapter and re-initialize when already initialized', async () => {
      // Arrange
      await manager.initialize();
      const adapter = createMockAdapter();
      mockElementTracker.getTrackedCount.mockReturnValue(0);

      // Act
      manager.registerAdapter(adapter);

      // Need to wait for async re-initialization
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Assert
      expect(mockElementTracker.dispose).toHaveBeenCalled();
    });
  });

  describe('cleanup()', () => {
    beforeEach(async () => {
      await manager.initialize();
    });

    it('should dispose element tracker', () => {
      // Arrange & Act
      manager.cleanup();

      // Assert
      expect(mockElementTracker.dispose).toHaveBeenCalled();
      expect(manager.isReady()).toBe(false);
    });

    it('should clear context capturer', () => {
      // Arrange & Act
      manager.cleanup();

      // Assert
      expect(manager.isReady()).toBe(false);
    });

    it('should allow cleanup when not initialized', () => {
      // Arrange
      RuntimeManager.resetInstance();
      const freshManager = RuntimeManager.getInstance();

      // Act & Assert - should not throw
      expect(() => freshManager.cleanup()).not.toThrow();
    });

    it('should handle multiple cleanup calls', () => {
      // Arrange & Act
      manager.cleanup();
      manager.cleanup();

      // Assert - should not throw
      expect(manager.isReady()).toBe(false);
    });
  });

  describe('isReady()', () => {
    it('should return false before initialization', () => {
      // Arrange & Act
      const result = manager.isReady();

      // Assert
      expect(result).toBe(false);
    });

    it('should return true after initialization', async () => {
      // Arrange
      await manager.initialize();

      // Act
      const result = manager.isReady();

      // Assert
      expect(result).toBe(true);
    });

    it('should return false after cleanup', async () => {
      // Arrange
      await manager.initialize();
      manager.cleanup();

      // Act
      const result = manager.isReady();

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('Dev-mode guard', () => {
    it('should not initialize when __DOMSCRIBE_RELAY_PORT__ is not set', async () => {
      // Arrange
      delete window.__DOMSCRIBE_RELAY_PORT__;

      // Act
      await manager.initialize();

      // Assert
      expect(manager.isReady()).toBe(false);
      expect(mockElementTracker.observeDOM).not.toHaveBeenCalled();
    });

    it('should initialize when __DOMSCRIBE_RELAY_PORT__ is set', async () => {
      // Arrange
      window.__DOMSCRIBE_RELAY_PORT__ = 4500;

      // Act
      await manager.initialize();

      // Assert
      expect(manager.isReady()).toBe(true);
      expect(mockElementTracker.observeDOM).toHaveBeenCalled();
    });
  });

  describe('Integration scenarios', () => {
    it('should handle complete workflow', async () => {
      // Arrange
      const adapter = createMockAdapter();
      const options: RuntimeOptions = {
        phase: 2,
        adapter,
        debug: false,
        redactPII: true,
        blockSelectors: ['[data-private]'],
      };

      const entryId = 'elem001';
      const element = createMockElement(entryId);
      const elementInfo = createMockElementInfo(entryId);
      const context = createMockRuntimeContext();

      mockElementTracker.getElement.mockReturnValue(element);
      mockElementTracker.getElementInfo.mockReturnValue(elementInfo);
      mockElementTracker.getAllEntryIds.mockReturnValue([entryId]);
      mockElementTracker.getTrackedCount.mockReturnValue(1);
      mockContextCapturer.captureForElement.mockResolvedValue(context);

      // Act
      await manager.initialize(options);
      const capturedContext = await manager.captureContext(entryId);
      const retrievedElementInfo = manager.getElementInfo(entryId);
      const allIds = manager.getAllEntryIds();
      const count = manager.getTrackedCount();

      // Assert
      expect(manager.isReady()).toBe(true);
      expect(capturedContext).toBe(context);
      expect(retrievedElementInfo).toBe(elementInfo);
      expect(allIds).toEqual([entryId]);
      expect(count).toBe(1);
    });

    it('should handle adapter registration and re-initialization', async () => {
      // Arrange
      await manager.initialize();
      const newAdapter = createMockAdapter();
      newAdapter.name = 'new-adapter';
      mockElementTracker.getTrackedCount.mockReturnValue(0);

      // Act
      manager.registerAdapter(newAdapter);
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Assert
      expect(mockElementTracker.dispose).toHaveBeenCalled();
    });

    it('should handle initialization, cleanup, and re-initialization', async () => {
      // Arrange & Act
      await manager.initialize();
      const readyBefore = manager.isReady();

      manager.cleanup();
      const readyAfterCleanup = manager.isReady();

      await manager.initialize();
      const readyAfterReinit = manager.isReady();

      // Assert
      expect(readyBefore).toBe(true);
      expect(readyAfterCleanup).toBe(false);
      expect(readyAfterReinit).toBe(true);
    });

    it('should handle errors gracefully in complete workflow', async () => {
      // Arrange
      await manager.initialize();
      const entryId = 'elem001';

      mockElementTracker.getElement.mockReturnValue(null);
      mockElementTracker.getElementInfo.mockReturnValue(null);
      mockElementTracker.getAllEntryIds.mockReturnValue([]);
      mockElementTracker.getTrackedCount.mockReturnValue(0);

      // Act
      const context = await manager.captureContext(entryId);
      const elementInfo = manager.getElementInfo(entryId);
      const allIds = manager.getAllEntryIds();
      const count = manager.getTrackedCount();

      // Assert
      expect(context).toBeNull();
      expect(elementInfo).toBeNull();
      expect(allIds).toEqual([]);
      expect(count).toBe(0);
    });
  });
});
