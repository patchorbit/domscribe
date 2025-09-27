/**
 * BridgeDispatch tests
 *
 * Verifies singleton behavior, transport delegation for ID-based methods,
 * and direct RuntimeManager access for element-based captureContext.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { ManifestEntryId, RuntimeContext } from '@domscribe/core';
import type { ElementInfo } from '../core/types.js';
import type { IRuntimeTransport } from './transport.interface.js';
import { BridgeDispatch } from './bridge-dispatch.js';

// Mock RuntimeManager for the element-based captureContext path
const mockRuntimeManager = {
  isReady: vi.fn().mockReturnValue(true),
  captureContextForElement: vi.fn().mockResolvedValue(null),
};

vi.mock('../core/runtime-manager.js', () => ({
  RuntimeManager: {
    getInstance: () => mockRuntimeManager,
  },
}));

// Mock DirectTransport so default constructor doesn't pull in real RuntimeManager
const mockDirectTransport = {
  isReady: vi.fn().mockReturnValue(true),
  captureContextForEntry: vi.fn().mockResolvedValue(null),
  getElementInfo: vi.fn().mockReturnValue(null),
  getComponentName: vi.fn().mockReturnValue(null),
  getTrackedCount: vi.fn().mockReturnValue(0),
};

vi.mock('./direct-transport.js', () => {
  return {
    DirectTransport: class {
      isReady = mockDirectTransport.isReady;
      captureContextForEntry = mockDirectTransport.captureContextForEntry;
      getElementInfo = mockDirectTransport.getElementInfo;
      getComponentName = mockDirectTransport.getComponentName;
      getTrackedCount = mockDirectTransport.getTrackedCount;
    },
  };
});

function createMockTransport(
  overrides?: Partial<
    Record<keyof IRuntimeTransport, ReturnType<typeof vi.fn>>
  >,
): IRuntimeTransport {
  return {
    isReady: vi.fn().mockReturnValue(false),
    captureContextForEntry: vi.fn().mockResolvedValue(null),
    getElementInfo: vi.fn().mockReturnValue(null),
    getComponentName: vi.fn().mockReturnValue(null),
    getTrackedCount: vi.fn().mockReturnValue(0),
    ...overrides,
  } as IRuntimeTransport;
}

describe('BridgeDispatch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    BridgeDispatch.resetInstance();

    // Reset mock defaults
    mockRuntimeManager.isReady.mockReturnValue(true);
    mockRuntimeManager.captureContextForElement.mockResolvedValue(null);
    mockDirectTransport.isReady.mockReturnValue(true);
    mockDirectTransport.captureContextForEntry.mockResolvedValue(null);
    mockDirectTransport.getElementInfo.mockReturnValue(null);
    mockDirectTransport.getComponentName.mockReturnValue(null);
    mockDirectTransport.getTrackedCount.mockReturnValue(0);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    BridgeDispatch.resetInstance();
  });

  describe('singleton', () => {
    it('should return the same instance on repeated calls', () => {
      // Act
      const a = BridgeDispatch.getInstance();
      const b = BridgeDispatch.getInstance();

      // Assert
      expect(a).toBe(b);
    });

    it('should return a new instance after reset', () => {
      // Arrange
      const a = BridgeDispatch.getInstance();

      // Act
      BridgeDispatch.resetInstance();
      const b = BridgeDispatch.getInstance();

      // Assert
      expect(a).not.toBe(b);
    });

    it('should accept a custom transport on first getInstance', () => {
      // Arrange
      const custom = createMockTransport({
        getTrackedCount: vi.fn().mockReturnValue(99),
      });

      // Act
      const dispatch = BridgeDispatch.getInstance(custom);

      // Assert
      expect(dispatch.getTrackedCount()).toBe(99);
      expect(custom.getTrackedCount).toHaveBeenCalled();
    });
  });

  describe('transport-delegated methods', () => {
    it('should delegate isReady to transport', () => {
      // Arrange
      mockDirectTransport.isReady.mockReturnValue(false);
      const dispatch = BridgeDispatch.getInstance();

      // Act
      const result = dispatch.isReady();

      // Assert
      expect(result).toBe(false);
      expect(mockDirectTransport.isReady).toHaveBeenCalled();
    });

    it('should delegate captureContextForEntry to transport', async () => {
      // Arrange
      const entryId = 'entry1' as ManifestEntryId;
      const context = {
        componentProps: { label: 'Click' },
      } satisfies RuntimeContext;
      mockDirectTransport.captureContextForEntry.mockResolvedValue(context);
      const dispatch = BridgeDispatch.getInstance();

      // Act
      const result = await dispatch.captureContextForEntry(entryId);

      // Assert
      expect(result).toBe(context);
      expect(mockDirectTransport.captureContextForEntry).toHaveBeenCalledWith(
        entryId,
      );
    });

    it('should delegate getElementInfo to transport', () => {
      // Arrange
      const entryId = 'entry1' as ManifestEntryId;
      const info: ElementInfo = {
        element: {} as HTMLElement,
        entryId,
      };
      mockDirectTransport.getElementInfo.mockReturnValue(info);
      const dispatch = BridgeDispatch.getInstance();

      // Act
      const result = dispatch.getElementInfo(entryId);

      // Assert
      expect(result).toBe(info);
    });

    it('should delegate getComponentName to transport', () => {
      // Arrange
      const entryId = 'entry1' as ManifestEntryId;
      mockDirectTransport.getComponentName.mockReturnValue('Button');
      const dispatch = BridgeDispatch.getInstance();

      // Act
      const result = dispatch.getComponentName(entryId);

      // Assert
      expect(result).toBe('Button');
    });

    it('should delegate getTrackedCount to transport', () => {
      // Arrange
      mockDirectTransport.getTrackedCount.mockReturnValue(7);
      const dispatch = BridgeDispatch.getInstance();

      // Act
      const result = dispatch.getTrackedCount();

      // Assert
      expect(result).toBe(7);
    });
  });

  describe('captureContext (element-based, same-context)', () => {
    it('should call RuntimeManager.captureContextForElement directly', async () => {
      // Arrange
      const element = {} as HTMLElement;
      const context = {
        componentProps: { title: 'Hi' },
      } satisfies RuntimeContext;
      mockRuntimeManager.captureContextForElement.mockResolvedValue(context);
      const dispatch = BridgeDispatch.getInstance();

      // Act
      const result = await dispatch.captureContext(element);

      // Assert
      expect(result).toBe(context);
      expect(mockRuntimeManager.captureContextForElement).toHaveBeenCalledWith(
        element,
      );
    });

    it('should return null when RuntimeManager is not ready', async () => {
      // Arrange
      mockRuntimeManager.isReady.mockReturnValue(false);
      const dispatch = BridgeDispatch.getInstance();

      // Act
      const result = await dispatch.captureContext({} as HTMLElement);

      // Assert
      expect(result).toBeNull();
      expect(
        mockRuntimeManager.captureContextForElement,
      ).not.toHaveBeenCalled();
    });

    it('should return null when RuntimeManager throws', async () => {
      // Arrange
      mockRuntimeManager.isReady.mockImplementation(() => {
        throw new Error('boom');
      });
      const dispatch = BridgeDispatch.getInstance();

      // Act
      const result = await dispatch.captureContext({} as HTMLElement);

      // Assert
      expect(result).toBeNull();
    });

    it('should not delegate to transport', async () => {
      // Arrange
      const dispatch = BridgeDispatch.getInstance();

      // Act
      await dispatch.captureContext({} as HTMLElement);

      // Assert — transport methods should NOT be called
      expect(mockDirectTransport.captureContextForEntry).not.toHaveBeenCalled();
    });
  });
});
