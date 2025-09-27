/**
 * DirectTransport tests
 *
 * Verifies that DirectTransport delegates all calls to RuntimeManager
 * and handles errors gracefully.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { ManifestEntryId, RuntimeContext } from '@domscribe/core';
import type { ElementInfo } from '../core/types.js';
import { DirectTransport } from './direct-transport.js';

// Mock RuntimeManager
const mockRuntimeManager = {
  isReady: vi.fn().mockReturnValue(true),
  captureContext: vi.fn().mockResolvedValue(null),
  getElementInfo: vi.fn().mockReturnValue(null),
  getTrackedCount: vi.fn().mockReturnValue(0),
};

vi.mock('../core/runtime-manager.js', () => ({
  RuntimeManager: {
    getInstance: () => mockRuntimeManager,
  },
}));

describe('DirectTransport', () => {
  let transport: DirectTransport;

  beforeEach(() => {
    vi.clearAllMocks();
    mockRuntimeManager.isReady.mockReturnValue(true);
    mockRuntimeManager.captureContext.mockResolvedValue(null);
    mockRuntimeManager.getElementInfo.mockReturnValue(null);
    mockRuntimeManager.getTrackedCount.mockReturnValue(0);
    transport = new DirectTransport();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('isReady', () => {
    it('should delegate to RuntimeManager.isReady()', () => {
      // Arrange
      mockRuntimeManager.isReady.mockReturnValue(true);

      // Act
      const result = transport.isReady();

      // Assert
      expect(result).toBe(true);
      expect(mockRuntimeManager.isReady).toHaveBeenCalled();
    });

    it('should return false when RuntimeManager throws', () => {
      // Arrange
      mockRuntimeManager.isReady.mockImplementation(() => {
        throw new Error('not initialized');
      });

      // Act
      const result = transport.isReady();

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('captureContextForEntry', () => {
    it('should delegate to RuntimeManager.captureContext()', async () => {
      // Arrange
      const entryId = 'abc123' as ManifestEntryId;
      const context: RuntimeContext = {
        componentProps: { title: 'Hello' },
      };
      mockRuntimeManager.captureContext.mockResolvedValue(context);

      // Act
      const result = await transport.captureContextForEntry(entryId);

      // Assert
      expect(result).toBe(context);
      expect(mockRuntimeManager.captureContext).toHaveBeenCalledWith(entryId);
    });

    it('should return null when RuntimeManager throws', async () => {
      // Arrange
      mockRuntimeManager.captureContext.mockRejectedValue(
        new Error('capture failed'),
      );

      // Act
      const result = await transport.captureContextForEntry(
        'abc123' as ManifestEntryId,
      );

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('getElementInfo', () => {
    it('should delegate to RuntimeManager.getElementInfo()', () => {
      // Arrange
      const entryId = 'abc123' as ManifestEntryId;
      const info: ElementInfo = {
        element: {} as HTMLElement,
        entryId,
        componentName: 'TestComp',
      };
      mockRuntimeManager.getElementInfo.mockReturnValue(info);

      // Act
      const result = transport.getElementInfo(entryId);

      // Assert
      expect(result).toBe(info);
      expect(mockRuntimeManager.getElementInfo).toHaveBeenCalledWith(entryId);
    });

    it('should return null when RuntimeManager throws', () => {
      // Arrange
      mockRuntimeManager.getElementInfo.mockImplementation(() => {
        throw new Error('not found');
      });

      // Act
      const result = transport.getElementInfo('abc123' as ManifestEntryId);

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('getComponentName', () => {
    it('should return componentName from getElementInfo', () => {
      // Arrange
      const entryId = 'abc123' as ManifestEntryId;
      const info: ElementInfo = {
        element: {} as HTMLElement,
        entryId,
        componentName: 'MyButton',
      };
      mockRuntimeManager.getElementInfo.mockReturnValue(info);

      // Act
      const result = transport.getComponentName(entryId);

      // Assert
      expect(result).toBe('MyButton');
    });

    it('should return null when elementInfo has no componentName', () => {
      // Arrange
      const entryId = 'abc123' as ManifestEntryId;
      const info: ElementInfo = {
        element: {} as HTMLElement,
        entryId,
      };
      mockRuntimeManager.getElementInfo.mockReturnValue(info);

      // Act
      const result = transport.getComponentName(entryId);

      // Assert
      expect(result).toBeNull();
    });

    it('should return null when getElementInfo returns null', () => {
      // Arrange
      mockRuntimeManager.getElementInfo.mockReturnValue(null);

      // Act
      const result = transport.getComponentName('abc123' as ManifestEntryId);

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('getTrackedCount', () => {
    it('should delegate to RuntimeManager.getTrackedCount()', () => {
      // Arrange
      mockRuntimeManager.getTrackedCount.mockReturnValue(42);

      // Act
      const result = transport.getTrackedCount();

      // Assert
      expect(result).toBe(42);
      expect(mockRuntimeManager.getTrackedCount).toHaveBeenCalled();
    });

    it('should return 0 when RuntimeManager throws', () => {
      // Arrange
      mockRuntimeManager.getTrackedCount.mockImplementation(() => {
        throw new Error('not ready');
      });

      // Act
      const result = transport.getTrackedCount();

      // Assert
      expect(result).toBe(0);
    });
  });
});
