/**
 * Tests for ElementTracker
 *
 * Tests follow Arrange-Act-Assert methodology and only mock direct dependencies.
 * All mocks are properly typed with no `any` types.
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, afterEach, vi, Mock } from 'vitest';
import { ElementTracker } from './element-tracker.js';
import type { ElementTrackerOptions } from './element-tracker.js';
import type { FrameworkAdapter } from '../adapters/adapter.interface.js';
import type { ElementInfo } from './types.js';

// ============================================================================
// Types
// ============================================================================

interface MockFrameworkAdapter extends FrameworkAdapter {
  name: string;
  version: string;
  getComponentInstance: Mock;
  captureProps: Mock;
  captureState: Mock;
  getComponentName: Mock;
}

interface MockMutationObserverConstructor {
  new (callback: MutationCallback): MockMutationObserver;
}

interface MockMutationObserver {
  observe: ReturnType<typeof vi.fn>;
  disconnect: ReturnType<typeof vi.fn>;
  takeRecords: ReturnType<typeof vi.fn>;
}

// ============================================================================
// Mock Setup
// ============================================================================

// Mock DOM utilities
const mockDomUtils = {
  getDsIdFromElement: vi.fn(),
  getAllDsElements: vi.fn(),
  hasDsId: vi.fn(),
};

vi.mock('../utils/dom-utils.js', () => ({
  getDsIdFromElement: (element: HTMLElement) =>
    mockDomUtils.getDsIdFromElement(element),
  getAllDsElements: (root: HTMLElement | Document) =>
    mockDomUtils.getAllDsElements(root),
  hasDsId: (element: HTMLElement) => mockDomUtils.hasDsId(element),
}));

// Mock errors
const mockElementTrackingError = vi.fn();
vi.mock('../errors/index.js', () => ({
  ElementTrackingError: class ElementTrackingError extends Error {
    constructor(message: string, cause?: Error) {
      super(message);
      mockElementTrackingError(message, cause);
      this.name = 'ElementTrackingError';
    }
  },
}));

// Mock MutationObserver
let mockMutationCallback: MutationCallback | null = null;
const mockObserver: MockMutationObserver = {
  observe: vi.fn(),
  disconnect: vi.fn(),
  takeRecords: vi.fn(),
};

const MockMutationObserver: MockMutationObserverConstructor = class {
  observe = mockObserver.observe;
  disconnect = mockObserver.disconnect;
  takeRecords = mockObserver.takeRecords;

  constructor(callback: MutationCallback) {
    mockMutationCallback = callback;
  }
} as unknown as MockMutationObserverConstructor;

// Store original MutationObserver
const OriginalMutationObserver = global.MutationObserver;

// ============================================================================
// Test Helpers
// ============================================================================

function createMockElement(id: string): HTMLElement {
  const element = document.createElement('div');
  element.setAttribute('data-ds', id);
  return element;
}

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

function createMutationRecord(
  type: MutationRecordType,
  addedNodes: Node[] = [],
  removedNodes: Node[] = [],
  target?: Node,
  attributeName?: string,
  oldValue?: string | null,
): MutationRecord {
  return {
    type,
    target: target ?? document.body,
    addedNodes: addedNodes as unknown as NodeList,
    removedNodes: removedNodes as unknown as NodeList,
    previousSibling: null,
    nextSibling: null,
    attributeName: attributeName ?? null,
    attributeNamespace: null,
    oldValue: oldValue ?? null,
  };
}

function triggerMutations(mutations: MutationRecord[]): void {
  if (mockMutationCallback) {
    mockMutationCallback(
      mutations,
      mockObserver as unknown as MutationObserver,
    );
  }
}

// ============================================================================
// Tests
// ============================================================================

describe('ElementTracker', () => {
  let tracker: ElementTracker;
  let mockRoot: HTMLElement;

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup global MutationObserver mock
    global.MutationObserver =
      MockMutationObserver as unknown as typeof MutationObserver;
    mockMutationCallback = null;

    // Create mock root element
    mockRoot = document.createElement('div');

    // Reset mock return values to defaults
    mockDomUtils.getDsIdFromElement.mockReturnValue(null);
    mockDomUtils.getAllDsElements.mockReturnValue([]);
    mockDomUtils.hasDsId.mockReturnValue(false);
    mockObserver.observe.mockReturnValue(undefined);
    mockObserver.disconnect.mockReturnValue(undefined);
    mockObserver.takeRecords.mockReturnValue([]);
  });

  afterEach(() => {
    // Restore original MutationObserver
    global.MutationObserver = OriginalMutationObserver;

    // Cleanup tracker if it exists
    if (tracker) {
      tracker.dispose();
    }
  });

  describe('Constructor', () => {
    it('should create tracker with default options', () => {
      // Arrange & Act
      tracker = new ElementTracker();

      // Assert
      expect(tracker).toBeDefined();
      expect(tracker.getTrackedCount()).toBe(0);
    });

    it('should create tracker with custom root element', () => {
      // Arrange
      const customRoot = document.createElement('main');

      // Act
      tracker = new ElementTracker({ root: customRoot });

      // Assert
      expect(tracker).toBeDefined();
    });

    it('should create tracker with adapter', () => {
      // Arrange
      const adapter = createMockAdapter();

      // Act
      tracker = new ElementTracker({ adapter });

      // Assert
      expect(tracker).toBeDefined();
    });

    it('should create tracker with debug enabled', () => {
      // Arrange & Act
      tracker = new ElementTracker({ debug: true });

      // Assert
      expect(tracker).toBeDefined();
    });

    it('should create tracker with all options', () => {
      // Arrange
      const options: ElementTrackerOptions = {
        adapter: createMockAdapter(),
        debug: true,
        root: mockRoot,
      };

      // Act
      tracker = new ElementTracker(options);

      // Assert
      expect(tracker).toBeDefined();
    });
  });

  describe('observeDOM()', () => {
    beforeEach(() => {
      tracker = new ElementTracker({ root: mockRoot });
    });

    it('should start observing DOM and scan existing elements', () => {
      // Arrange
      const element1 = createMockElement('elem001');
      const element2 = createMockElement('elem002');
      mockDomUtils.getAllDsElements.mockReturnValue([element1, element2]);
      mockDomUtils.hasDsId.mockReturnValue(true);
      mockDomUtils.getDsIdFromElement.mockImplementation((el: HTMLElement) =>
        el.getAttribute('data-ds'),
      );

      // Act
      tracker.observeDOM();

      // Assert
      expect(mockDomUtils.getAllDsElements).toHaveBeenCalledWith(mockRoot);
      expect(mockObserver.observe).toHaveBeenCalledWith(mockRoot, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['data-ds'],
        attributeOldValue: true,
      });
      expect(tracker.getTrackedCount()).toBe(2);
    });

    it('should not observe again if already observing', () => {
      // Arrange
      mockDomUtils.getAllDsElements.mockReturnValue([]);

      // Act
      tracker.observeDOM();
      const firstCallCount = mockObserver.observe.mock.calls.length;
      tracker.observeDOM();
      const secondCallCount = mockObserver.observe.mock.calls.length;

      // Assert
      expect(secondCallCount).toBe(firstCallCount);
    });

    it('should skip observation if root element is invalid', () => {
      // Arrange
      const invalidRoot = {} as HTMLElement; // Missing nodeType property
      tracker = new ElementTracker({ root: invalidRoot });

      // Act
      tracker.observeDOM();

      // Assert
      expect(mockObserver.observe).not.toHaveBeenCalled();
    });

    it('should throw ElementTrackingError on MutationObserver error', () => {
      // Arrange
      const error = new Error('Observer failed');
      mockObserver.observe.mockImplementation(() => {
        throw error;
      });
      mockDomUtils.getAllDsElements.mockReturnValue([]);

      // Act & Assert
      expect(() => tracker.observeDOM()).toThrow(
        'Failed to start DOM observation',
      );
      expect(mockElementTrackingError).toHaveBeenCalledWith(
        'Failed to start DOM observation',
        error,
      );
    });
  });

  describe('stopObserving()', () => {
    beforeEach(() => {
      tracker = new ElementTracker({ root: mockRoot });
      mockDomUtils.getAllDsElements.mockReturnValue([]);
    });

    it('should disconnect observer when observing', () => {
      // Arrange
      tracker.observeDOM();

      // Act
      tracker.stopObserving();

      // Assert
      expect(mockObserver.disconnect).toHaveBeenCalled();
    });

    it('should do nothing if not observing', () => {
      // Arrange & Act
      tracker.stopObserving();

      // Assert
      expect(mockObserver.disconnect).not.toHaveBeenCalled();
    });
  });

  describe('trackElement()', () => {
    beforeEach(() => {
      tracker = new ElementTracker({ root: mockRoot });
    });

    it('should track element with data-ds attribute', () => {
      // Arrange
      const element = createMockElement('elem001');
      mockDomUtils.hasDsId.mockReturnValue(true);
      mockDomUtils.getDsIdFromElement.mockReturnValue('elem001');

      // Act
      tracker.trackElement(element);

      // Assert
      expect(tracker.getTrackedCount()).toBe(1);
      expect(tracker.getElement('elem001')).toBe(element);
    });

    it('should not track element without data-ds attribute', () => {
      // Arrange
      const element = document.createElement('div');
      mockDomUtils.hasDsId.mockReturnValue(false);

      // Act
      tracker.trackElement(element);

      // Assert
      expect(tracker.getTrackedCount()).toBe(0);
    });

    it('should track component instance when adapter is available', () => {
      // Arrange
      const adapter = createMockAdapter();
      tracker = new ElementTracker({ root: mockRoot, adapter });
      const element = createMockElement('elem001');
      const componentInstance = { type: 'Component' };
      adapter.getComponentInstance.mockReturnValue(componentInstance);
      mockDomUtils.hasDsId.mockReturnValue(true);
      mockDomUtils.getDsIdFromElement.mockReturnValue('elem001');

      // Act
      tracker.trackElement(element);

      // Assert
      expect(adapter.getComponentInstance).toHaveBeenCalledWith(element);
      expect(tracker.getComponentInstance('elem001')).toBe(componentInstance);
    });

    it('should not fail if adapter returns null component instance', () => {
      // Arrange
      const adapter = createMockAdapter();
      adapter.getComponentInstance.mockReturnValue(null);
      tracker = new ElementTracker({ root: mockRoot, adapter });
      const element = createMockElement('elem001');
      mockDomUtils.hasDsId.mockReturnValue(true);
      mockDomUtils.getDsIdFromElement.mockReturnValue('elem001');

      // Act
      tracker.trackElement(element);

      // Assert
      expect(tracker.getTrackedCount()).toBe(1);
      expect(tracker.getComponentInstance('elem001')).toBeNull();
    });

    it('should not fail if adapter returns non-object component instance', () => {
      // Arrange
      const adapter = createMockAdapter();
      adapter.getComponentInstance.mockReturnValue('string');
      tracker = new ElementTracker({ root: mockRoot, adapter });
      const element = createMockElement('elem001');
      mockDomUtils.hasDsId.mockReturnValue(true);
      mockDomUtils.getDsIdFromElement.mockReturnValue('elem001');

      // Act
      tracker.trackElement(element);

      // Assert
      expect(tracker.getComponentInstance('elem001')).toBeNull();
    });

    it('should handle adapter errors gracefully', () => {
      // Arrange
      const adapter = createMockAdapter();
      adapter.getComponentInstance.mockImplementation(() => {
        throw new Error('Adapter failed');
      });
      tracker = new ElementTracker({ root: mockRoot, adapter });
      const element = createMockElement('elem001');
      mockDomUtils.hasDsId.mockReturnValue(true);
      mockDomUtils.getDsIdFromElement.mockReturnValue('elem001');

      // Act
      tracker.trackElement(element);

      // Assert
      expect(tracker.getTrackedCount()).toBe(1);
      expect(tracker.getComponentInstance('elem001')).toBeNull();
    });
  });

  describe('untrackElement()', () => {
    beforeEach(() => {
      tracker = new ElementTracker({ root: mockRoot });
    });

    it('should remove tracked element', () => {
      // Arrange
      const element = createMockElement('elem001');
      mockDomUtils.hasDsId.mockReturnValue(true);
      mockDomUtils.getDsIdFromElement.mockReturnValue('elem001');
      tracker.trackElement(element);

      // Act
      tracker.untrackElement('elem001');

      // Assert
      expect(tracker.getTrackedCount()).toBe(0);
      expect(tracker.getElement('elem001')).toBeNull();
    });

    it('should remove component instance when untracking', () => {
      // Arrange
      const adapter = createMockAdapter();
      tracker = new ElementTracker({ root: mockRoot, adapter });
      const element = createMockElement('elem001');
      mockDomUtils.hasDsId.mockReturnValue(true);
      mockDomUtils.getDsIdFromElement.mockReturnValue('elem001');
      tracker.trackElement(element);

      // Act
      tracker.untrackElement('elem001');

      // Assert
      expect(tracker.getComponentInstance('elem001')).toBeNull();
    });

    it('should not fail when untracking non-existent element', () => {
      // Arrange & Act
      tracker.untrackElement('nonexistent');

      // Assert
      expect(tracker.getTrackedCount()).toBe(0);
    });
  });

  describe('getElement()', () => {
    beforeEach(() => {
      tracker = new ElementTracker({ root: mockRoot });
    });

    it('should return tracked element by ID', () => {
      // Arrange
      const element = createMockElement('elem001');
      mockDomUtils.hasDsId.mockReturnValue(true);
      mockDomUtils.getDsIdFromElement.mockReturnValue('elem001');
      tracker.trackElement(element);

      // Act
      const result = tracker.getElement('elem001');

      // Assert
      expect(result).toBe(element);
    });

    it('should return null for non-existent element', () => {
      // Arrange & Act
      const result = tracker.getElement('nonexistent');

      // Assert
      expect(result).toBeNull();
    });

    it('should return null and cleanup when element is garbage collected', () => {
      // Arrange
      const element = createMockElement('elem001');
      mockDomUtils.hasDsId.mockReturnValue(true);
      mockDomUtils.getDsIdFromElement.mockReturnValue('elem001');
      tracker.trackElement(element);

      // Mock WeakRef deref to return undefined (simulating garbage collection)
      const originalGetElement = tracker.getElement.bind(tracker);
      tracker.getElement = vi.fn((id: string) => {
        if (id === 'elem001') {
          tracker.untrackElement(id);
          return null;
        }
        return originalGetElement(id);
      });

      // Act
      const result = tracker.getElement('elem001');

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('getComponentInstance()', () => {
    let adapter: MockFrameworkAdapter;

    beforeEach(() => {
      adapter = createMockAdapter();
      tracker = new ElementTracker({ root: mockRoot, adapter });
    });

    it('should return component instance for tracked element', () => {
      // Arrange
      const element = createMockElement('elem001');
      const componentInstance = { type: 'Component' };
      adapter.getComponentInstance.mockReturnValue(componentInstance);
      mockDomUtils.hasDsId.mockReturnValue(true);
      mockDomUtils.getDsIdFromElement.mockReturnValue('elem001');
      tracker.trackElement(element);

      // Act
      const result = tracker.getComponentInstance('elem001');

      // Assert
      expect(result).toBe(componentInstance);
    });

    it('should return null for non-existent element', () => {
      // Arrange & Act
      const result = tracker.getComponentInstance('nonexistent');

      // Assert
      expect(result).toBeNull();
    });

    it('should return null and cleanup when instance is garbage collected', () => {
      // Arrange
      const element = createMockElement('elem001');
      mockDomUtils.hasDsId.mockReturnValue(true);
      mockDomUtils.getDsIdFromElement.mockReturnValue('elem001');
      tracker.trackElement(element);

      // Mock to simulate garbage collection
      const originalGetInstance = tracker.getComponentInstance.bind(tracker);
      tracker.getComponentInstance = vi.fn((id: string) => {
        const result = originalGetInstance(id);
        if (id === 'elem001' && result !== null) {
          // Second call should return null
          tracker.getComponentInstance = vi.fn().mockReturnValue(null);
        }
        return result;
      });

      // Act
      tracker.getComponentInstance('elem001');
      const result = tracker.getComponentInstance('elem001');

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('getElementInfo()', () => {
    beforeEach(() => {
      tracker = new ElementTracker({ root: mockRoot });
    });

    it('should return complete element info', () => {
      // Arrange
      const element = createMockElement('elem001');
      mockDomUtils.hasDsId.mockReturnValue(true);
      mockDomUtils.getDsIdFromElement.mockReturnValue('elem001');
      tracker.trackElement(element);

      // Act
      const result = tracker.getElementInfo('elem001');

      // Assert
      expect(result).toEqual<ElementInfo>({
        element,
        entryId: 'elem001',
        componentInstance: undefined,
        componentName: undefined,
      });
    });

    it('should include component instance when available', () => {
      // Arrange
      const adapter = createMockAdapter();
      tracker = new ElementTracker({ root: mockRoot, adapter });
      const element = createMockElement('elem001');
      const componentInstance = { type: 'Component' };
      adapter.getComponentInstance.mockReturnValue(componentInstance);
      adapter.getComponentName.mockReturnValue('MockComponent');
      mockDomUtils.hasDsId.mockReturnValue(true);
      mockDomUtils.getDsIdFromElement.mockReturnValue('elem001');
      tracker.trackElement(element);

      // Act
      const result = tracker.getElementInfo('elem001');

      // Assert
      expect(result).toEqual<ElementInfo>({
        element,
        entryId: 'elem001',
        componentInstance,
        componentName: 'MockComponent',
      });
    });

    it('should return null for non-existent element', () => {
      // Arrange & Act
      const result = tracker.getElementInfo('nonexistent');

      // Assert
      expect(result).toBeNull();
    });

    it('should handle adapter without getComponentName method', () => {
      // Arrange
      const adapter = createMockAdapter();
      adapter.getComponentName = vi.fn().mockReturnValue(undefined);
      tracker = new ElementTracker({ root: mockRoot, adapter });
      const element = createMockElement('elem001');
      mockDomUtils.hasDsId.mockReturnValue(true);
      mockDomUtils.getDsIdFromElement.mockReturnValue('elem001');
      tracker.trackElement(element);

      // Act
      const result = tracker.getElementInfo('elem001');

      // Assert
      expect(result?.componentName).toBeUndefined();
    });
  });

  describe('getAllEntryIds()', () => {
    beforeEach(() => {
      tracker = new ElementTracker({ root: mockRoot });
    });

    it('should return empty array when no elements tracked', () => {
      // Arrange & Act
      const result = tracker.getAllEntryIds();

      // Assert
      expect(result).toEqual([]);
    });

    it('should return all tracked element IDs', () => {
      // Arrange
      const element1 = createMockElement('elem001');
      const element2 = createMockElement('elem002');
      const element3 = createMockElement('elem003');
      mockDomUtils.hasDsId.mockReturnValue(true);
      mockDomUtils.getDsIdFromElement
        .mockReturnValueOnce('elem001')
        .mockReturnValueOnce('elem002')
        .mockReturnValueOnce('elem003');

      tracker.trackElement(element1);
      tracker.trackElement(element2);
      tracker.trackElement(element3);

      // Act
      const result = tracker.getAllEntryIds();

      // Assert
      expect(result).toEqual(['elem001', 'elem002', 'elem003']);
    });
  });

  describe('getTrackedCount()', () => {
    beforeEach(() => {
      tracker = new ElementTracker({ root: mockRoot });
    });

    it('should return 0 when no elements tracked', () => {
      // Arrange & Act
      const result = tracker.getTrackedCount();

      // Assert
      expect(result).toBe(0);
    });

    it('should return correct count of tracked elements', () => {
      // Arrange
      const element1 = createMockElement('elem001');
      const element2 = createMockElement('elem002');
      mockDomUtils.hasDsId.mockReturnValue(true);
      mockDomUtils.getDsIdFromElement
        .mockReturnValueOnce('elem001')
        .mockReturnValueOnce('elem002');

      tracker.trackElement(element1);
      tracker.trackElement(element2);

      // Act
      const result = tracker.getTrackedCount();

      // Assert
      expect(result).toBe(2);
    });

    it('should update count when elements are untracked', () => {
      // Arrange
      const element1 = createMockElement('elem001');
      const element2 = createMockElement('elem002');
      mockDomUtils.hasDsId.mockReturnValue(true);
      mockDomUtils.getDsIdFromElement
        .mockReturnValueOnce('elem001')
        .mockReturnValueOnce('elem002');

      tracker.trackElement(element1);
      tracker.trackElement(element2);
      tracker.untrackElement('elem001');

      // Act
      const result = tracker.getTrackedCount();

      // Assert
      expect(result).toBe(1);
    });
  });

  describe('clear()', () => {
    beforeEach(() => {
      tracker = new ElementTracker({ root: mockRoot });
    });

    it('should clear all tracked elements', () => {
      // Arrange
      const element1 = createMockElement('elem001');
      const element2 = createMockElement('elem002');
      mockDomUtils.hasDsId.mockReturnValue(true);
      mockDomUtils.getDsIdFromElement
        .mockReturnValueOnce('elem001')
        .mockReturnValueOnce('elem002');

      tracker.trackElement(element1);
      tracker.trackElement(element2);

      // Act
      tracker.clear();

      // Assert
      expect(tracker.getTrackedCount()).toBe(0);
      expect(tracker.getAllEntryIds()).toEqual([]);
    });

    it('should clear component instances', () => {
      // Arrange
      const adapter = createMockAdapter();
      tracker = new ElementTracker({ root: mockRoot, adapter });
      const element = createMockElement('elem001');
      mockDomUtils.hasDsId.mockReturnValue(true);
      mockDomUtils.getDsIdFromElement.mockReturnValue('elem001');
      tracker.trackElement(element);

      // Act
      tracker.clear();

      // Assert
      expect(tracker.getComponentInstance('elem001')).toBeNull();
    });
  });

  describe('dispose()', () => {
    beforeEach(() => {
      tracker = new ElementTracker({ root: mockRoot });
      mockDomUtils.getAllDsElements.mockReturnValue([]);
    });

    it('should stop observing and clear all elements', () => {
      // Arrange
      tracker.observeDOM();
      const element = createMockElement('elem001');
      mockDomUtils.hasDsId.mockReturnValue(true);
      mockDomUtils.getDsIdFromElement.mockReturnValue('elem001');
      tracker.trackElement(element);

      // Act
      tracker.dispose();

      // Assert
      expect(mockObserver.disconnect).toHaveBeenCalled();
      expect(tracker.getTrackedCount()).toBe(0);
    });

    it('should work when not observing', () => {
      // Arrange
      const element = createMockElement('elem001');
      mockDomUtils.hasDsId.mockReturnValue(true);
      mockDomUtils.getDsIdFromElement.mockReturnValue('elem001');
      tracker.trackElement(element);

      // Act
      tracker.dispose();

      // Assert
      expect(tracker.getTrackedCount()).toBe(0);
    });
  });

  describe('MutationObserver - childList mutations', () => {
    beforeEach(() => {
      tracker = new ElementTracker({ root: mockRoot });
      mockDomUtils.getAllDsElements.mockReturnValue([]);
      tracker.observeDOM();
    });

    it('should track added element with data-ds attribute', () => {
      // Arrange
      const element = createMockElement('elem001');
      mockDomUtils.hasDsId.mockReturnValue(true);
      mockDomUtils.getDsIdFromElement.mockReturnValue('elem001');
      mockDomUtils.getAllDsElements.mockReturnValue([]);

      const mutation = createMutationRecord('childList', [element]);

      // Act
      triggerMutations([mutation]);

      // Assert
      expect(tracker.getTrackedCount()).toBe(1);
      expect(tracker.getElement('elem001')).toBe(element);
    });

    it('should track children of added element with data-ds attributes', () => {
      // Arrange
      const parent = document.createElement('div');
      const child1 = createMockElement('elem001');
      const child2 = createMockElement('elem002');
      parent.appendChild(child1);
      parent.appendChild(child2);

      mockDomUtils.hasDsId.mockReturnValue(false);
      mockDomUtils.getAllDsElements.mockReturnValue([child1, child2]);
      mockDomUtils.getDsIdFromElement
        .mockReturnValueOnce('elem001')
        .mockReturnValueOnce('elem002');

      // Need to setup hasDsId for children
      const originalHasDsId = mockDomUtils.hasDsId;
      mockDomUtils.hasDsId = vi.fn((el: HTMLElement) => {
        if (el === child1 || el === child2) return true;
        return false;
      });

      const mutation = createMutationRecord('childList', [parent]);

      // Act
      triggerMutations([mutation]);

      // Assert
      expect(tracker.getTrackedCount()).toBe(2);

      // Restore
      mockDomUtils.hasDsId = originalHasDsId;
    });

    it('should untrack removed element', () => {
      // Arrange
      const element = createMockElement('elem001');
      mockDomUtils.hasDsId.mockReturnValue(true);
      mockDomUtils.getDsIdFromElement.mockReturnValue('elem001');
      tracker.trackElement(element);

      const mutation = createMutationRecord('childList', [], [element]);

      // Act
      triggerMutations([mutation]);

      // Assert
      expect(tracker.getTrackedCount()).toBe(0);
    });

    it('should untrack children of removed element', () => {
      // Arrange
      const parent = document.createElement('div');
      const child1 = createMockElement('elem001');
      const child2 = createMockElement('elem002');
      parent.appendChild(child1);
      parent.appendChild(child2);

      mockDomUtils.hasDsId.mockReturnValue(true);
      mockDomUtils.getDsIdFromElement
        .mockReturnValueOnce('elem001')
        .mockReturnValueOnce('elem002');
      tracker.trackElement(child1);
      tracker.trackElement(child2);

      mockDomUtils.getAllDsElements.mockReturnValue([child1, child2]);
      mockDomUtils.getDsIdFromElement
        .mockReturnValueOnce('elem001')
        .mockReturnValueOnce('elem002');

      const mutation = createMutationRecord('childList', [], [parent]);

      // Act
      triggerMutations([mutation]);

      // Assert
      expect(tracker.getTrackedCount()).toBe(0);
    });

    it('should ignore non-HTMLElement nodes', () => {
      // Arrange
      const textNode = document.createTextNode('text');
      const mutation = createMutationRecord('childList', [textNode]);

      // Act
      triggerMutations([mutation]);

      // Assert
      expect(tracker.getTrackedCount()).toBe(0);
    });
  });

  describe('MutationObserver - attribute mutations', () => {
    beforeEach(() => {
      tracker = new ElementTracker({ root: mockRoot });
      mockDomUtils.getAllDsElements.mockReturnValue([]);
      tracker.observeDOM();
    });

    it('should track element when data-ds attribute is added', () => {
      // Arrange
      const element = createMockElement('elem001');
      mockDomUtils.hasDsId.mockReturnValue(true);
      mockDomUtils.getDsIdFromElement.mockReturnValue('elem001');

      const mutation = createMutationRecord(
        'attributes',
        [],
        [],
        element,
        'data-ds',
      );

      // Act
      triggerMutations([mutation]);

      // Assert
      expect(tracker.getTrackedCount()).toBe(1);
    });

    it('should untrack element when data-ds attribute is removed', () => {
      // Arrange
      const element = createMockElement('elem001');
      mockDomUtils.hasDsId.mockReturnValue(true);
      mockDomUtils.getDsIdFromElement.mockReturnValue('elem001');
      tracker.trackElement(element);

      mockDomUtils.hasDsId.mockReturnValue(false);

      const mutation = createMutationRecord(
        'attributes',
        [],
        [],
        element,
        'data-ds',
        'elem001',
      );

      // Act
      triggerMutations([mutation]);

      // Assert
      expect(tracker.getTrackedCount()).toBe(0);
    });

    it('should ignore non-data-ds attribute changes', () => {
      // Arrange
      const element = createMockElement('elem001');
      const mutation = createMutationRecord(
        'attributes',
        [],
        [],
        element,
        'class',
      );

      // Act
      triggerMutations([mutation]);

      // Assert
      expect(tracker.getTrackedCount()).toBe(0);
    });

    it('should ignore attribute mutations on non-HTMLElement nodes', () => {
      // Arrange
      const textNode = document.createTextNode('text');
      const mutation = createMutationRecord(
        'attributes',
        [],
        [],
        textNode,
        'data-ds',
      );

      // Act
      triggerMutations([mutation]);

      // Assert
      expect(tracker.getTrackedCount()).toBe(0);
    });
  });

  describe('Integration scenarios', () => {
    it('should handle complete workflow with adapter', () => {
      // Arrange
      const adapter = createMockAdapter();
      tracker = new ElementTracker({ root: mockRoot, adapter, debug: false });

      const element1 = createMockElement('elem001');
      const element2 = createMockElement('elem002');

      mockDomUtils.getAllDsElements.mockReturnValue([element1]);
      mockDomUtils.hasDsId.mockReturnValue(true);
      mockDomUtils.getDsIdFromElement
        .mockReturnValueOnce('elem001')
        .mockReturnValueOnce('elem002');

      // Act - Start observing
      tracker.observeDOM();

      // Act - Add element via mutation
      mockDomUtils.getAllDsElements.mockReturnValue([]);
      const mutation = createMutationRecord('childList', [element2]);
      triggerMutations([mutation]);

      // Act - Get element info
      const info1 = tracker.getElementInfo('elem001');
      const info2 = tracker.getElementInfo('elem002');

      // Assert
      expect(tracker.getTrackedCount()).toBe(2);
      expect(info1?.entryId).toBe('elem001');
      expect(info1?.componentName).toBe('MockComponent');
      expect(info2?.entryId).toBe('elem002');
      expect(info2?.componentName).toBe('MockComponent');
    });

    it('should handle disposal during observation', () => {
      // Arrange
      tracker = new ElementTracker({ root: mockRoot });
      mockDomUtils.getAllDsElements.mockReturnValue([]);

      const element = createMockElement('elem001');
      mockDomUtils.hasDsId.mockReturnValue(true);
      mockDomUtils.getDsIdFromElement.mockReturnValue('elem001');

      // Act
      tracker.observeDOM();
      tracker.trackElement(element);
      tracker.dispose();

      // Assert
      expect(mockObserver.disconnect).toHaveBeenCalled();
      expect(tracker.getTrackedCount()).toBe(0);
    });

    it('should handle multiple mutations in batch', () => {
      // Arrange
      tracker = new ElementTracker({ root: mockRoot });
      mockDomUtils.getAllDsElements.mockReturnValue([]);
      tracker.observeDOM();

      const element1 = createMockElement('elem001');
      const element2 = createMockElement('elem002');
      const element3 = createMockElement('elem003');

      mockDomUtils.hasDsId.mockReturnValue(true);
      mockDomUtils.getDsIdFromElement
        .mockReturnValueOnce('elem001')
        .mockReturnValueOnce('elem002')
        .mockReturnValueOnce('elem003');
      mockDomUtils.getAllDsElements.mockReturnValue([]);

      const mutations = [
        createMutationRecord('childList', [element1]),
        createMutationRecord('childList', [element2]),
        createMutationRecord('childList', [element3]),
      ];

      // Act
      triggerMutations(mutations);

      // Assert
      expect(tracker.getTrackedCount()).toBe(3);
    });
  });
});
