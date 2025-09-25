/**
 * ElementTracker - Tracks DOM elements with data-ds attributes
 *
 * Uses MutationObserver to maintain a registry of elements and their
 * component instances for fast lookup.
 *
 * Performance:
 * - O(1) lookup by manifest entry ID
 * - Weak references to prevent memory leaks
 * - Automatic cleanup when elements are removed
 *
 * @module @domscribe/runtime/core/element-tracker
 */

import type { FrameworkAdapter } from '../adapters/adapter.interface.js';
import type { ElementInfo } from './types.js';
import {
  getDsIdFromElement,
  getAllDsElements,
  hasDsId,
} from '../utils/dom-utils.js';
import { ElementTrackingError } from '../errors/index.js';
import { ManifestEntryId } from '@domscribe/core';

/**
 * Options for ElementTracker
 */
export interface ElementTrackerOptions {
  /**
   * Framework adapter for component resolution
   */
  adapter?: FrameworkAdapter;

  /**
   * Enable debug logging
   */
  debug?: boolean;

  /**
   * Root element to observe (defaults to document.body)
   */
  root?: HTMLElement | null;
}

/**
 * ElementTracker class
 *
 * Maintains a registry of elements with data-ds attributes and provides
 * fast lookup by manifest entry ID.
 */
export class ElementTracker {
  private registry = new Map<string, WeakRef<HTMLElement>>();
  private componentInstances = new Map<string, WeakRef<object>>();
  private observer: MutationObserver | null = null;
  private options: Required<Omit<ElementTrackerOptions, 'adapter'>> & {
    adapter?: FrameworkAdapter;
  };
  private isObserving = false;

  constructor(options: ElementTrackerOptions = {}) {
    const defaultRoot =
      typeof document !== 'undefined' && document.body ? document.body : null;

    this.options = {
      adapter: options.adapter,
      debug: options.debug ?? false,
      root: options.root ?? defaultRoot ?? null,
    };
  }

  /**
   * Start observing the DOM for elements with data-ds attributes
   */
  observeDOM(): void {
    if (this.isObserving) {
      if (this.options.debug) {
        console.warn(
          '[domscribe-runtime][element-tracker] Already observing DOM',
        );
      }
      return;
    }

    // Check if we have a valid root element
    if (!this.options.root || !this.options.root.nodeType) {
      if (this.options.debug) {
        console.warn(
          '[domscribe-runtime][element-tracker] No valid root element, skipping DOM observation',
        );
      }
      return;
    }

    try {
      // Initial scan of existing elements
      this.scanExistingElements();

      // Set up MutationObserver
      this.observer = new MutationObserver((mutations) => {
        this.handleMutations(mutations);
      });

      this.observer.observe(this.options.root, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['data-ds'],
        attributeOldValue: true,
      });

      this.isObserving = true;

      if (this.options.debug) {
        console.log(
          `[domscribe-runtime][element-tracker] Started observing DOM (${this.registry.size} elements)`,
        );
      }
    } catch (error) {
      console.error(
        '[domscribe-runtime][element-tracker] Failed to start DOM observation',
        error,
      );
      throw new ElementTrackingError(
        'Failed to start DOM observation',
        error instanceof Error ? error : undefined,
      );
    }
  }

  /**
   * Stop observing the DOM
   */
  stopObserving(): void {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
      this.isObserving = false;

      if (this.options.debug) {
        console.log(
          '[domscribe-runtime][element-tracker] Stopped observing DOM',
        );
      }
    }
  }

  /**
   * Track an element manually
   *
   * @param element - The element to track
   */
  trackElement(element: HTMLElement): void {
    if (!hasDsId(element)) {
      if (this.options.debug) {
        console.warn(
          '[domscribe-runtime][element-tracker] Element does not have data-ds attribute',
        );
      }
      return;
    }

    const entryId = getDsIdFromElement(element);
    if (!entryId) {
      return;
    }

    // Add to registry
    this.registry.set(entryId, new WeakRef(element));

    // Try to resolve component instance if adapter is available
    if (this.options.adapter) {
      try {
        const componentInstance =
          this.options.adapter.getComponentInstance(element);
        if (componentInstance && typeof componentInstance === 'object') {
          this.componentInstances.set(entryId, new WeakRef(componentInstance));
        }
      } catch (error) {
        if (this.options.debug) {
          console.warn(
            `[domscribe-runtime][element-tracker] Failed to resolve component for entry ID ${entryId}:`,
            error,
          );
        }
      }
    }

    if (this.options.debug) {
      console.log(
        `[domscribe-runtime][element-tracker] Tracked element with entry ID ${entryId}`,
      );
    }
  }

  /**
   * Untrack an element
   *
   * @param entryId - The manifest entry ID to untrack
   */
  untrackElement(entryId: ManifestEntryId): void {
    this.registry.delete(entryId);
    this.componentInstances.delete(entryId);

    if (this.options.debug) {
      console.log(
        `[domscribe-runtime][element-tracker] Untracked element with entry ID ${entryId}`,
      );
    }
  }

  /**
   * Get an element by its manifest entry ID
   *
   * @param entryId - The manifest entry ID to look up
   * @returns The element or null if not found
   */
  getElement(entryId: ManifestEntryId): HTMLElement | null {
    const ref = this.registry.get(entryId);
    if (!ref) {
      return null;
    }

    const element = ref.deref();
    if (!element) {
      // Element was garbage collected, clean up
      this.untrackElement(entryId);
      return null;
    }

    return element;
  }

  /**
   * Get component instance for an element
   *
   * @param entryId - The manifest entry ID
   * @returns The component instance or null
   */
  getComponentInstance(entryId: ManifestEntryId): unknown | null {
    const ref = this.componentInstances.get(entryId);
    if (!ref) {
      return null;
    }

    const instance = ref.deref();
    if (!instance) {
      // Instance was garbage collected, clean up
      this.componentInstances.delete(entryId);
      return null;
    }

    return instance;
  }

  /**
   * Get element info (element + component instance)
   *
   * @param entryId - The manifest entry ID
   * @returns Element info or null
   */
  getElementInfo(entryId: ManifestEntryId): ElementInfo | null {
    const element = this.getElement(entryId);
    if (!element) {
      return null;
    }

    const componentInstance = this.getComponentInstance(entryId);
    const componentName =
      this.options.adapter?.getComponentName?.(
        componentInstance ?? undefined,
      ) ?? null;

    return {
      element,
      entryId,
      componentInstance: componentInstance ?? undefined,
      componentName: componentName ?? undefined,
    };
  }

  /**
   * Get all tracked manifest entry IDs
   *
   * @returns Array of manifest entry IDs
   */
  getAllEntryIds(): string[] {
    return Array.from(this.registry.keys());
  }

  /**
   * Get count of tracked elements
   *
   * @returns Number of tracked elements
   */
  getTrackedCount(): number {
    return this.registry.size;
  }

  /**
   * Clear all tracked elements
   */
  clear(): void {
    this.registry.clear();
    this.componentInstances.clear();

    if (this.options.debug) {
      console.log(
        '[domscribe-runtime][element-tracker] Cleared all tracked elements',
      );
    }
  }

  /**
   * Cleanup and dispose
   */
  dispose(): void {
    this.stopObserving();
    this.clear();

    if (this.options.debug) {
      console.log('[domscribe-runtime][element-tracker] Disposed');
    }
  }

  // Private methods

  /**
   * Scan existing elements in the DOM
   */
  private scanExistingElements(): void {
    if (!this.options.root) {
      if (this.options.debug) {
        console.warn(
          '[domscribe-runtime][element-tracker] No root element, skipping scan',
        );
      }
      return;
    }

    const elements = getAllDsElements(this.options.root);
    for (const element of elements) {
      this.trackElement(element);
    }

    if (this.options.debug) {
      console.log(
        `[domscribe-runtime][element-tracker] Scanned ${elements.length} existing elements`,
      );
    }
  }

  /**
   * Handle mutation events
   */
  private handleMutations(mutations: MutationRecord[]): void {
    for (const mutation of mutations) {
      // Handle added nodes
      if (mutation.type === 'childList') {
        Array.from(mutation.addedNodes).forEach((node) => {
          this.trackNode(node);
        });

        // Handle removed nodes
        Array.from(mutation.removedNodes).forEach((node) => {
          this.untrackNode(node);
        });
      }

      // Handle attribute changes
      if (
        mutation.type === 'attributes' &&
        mutation.attributeName === 'data-ds'
      ) {
        const target = mutation.target;
        if (this.isHTMLElement(target)) {
          if (hasDsId(target)) {
            this.trackElement(target);
          } else {
            const entryId = mutation.oldValue;
            if (entryId) {
              this.untrackElement(entryId);
            }
          }
        }
      }
    }
  }

  private trackNode(node: Node): void {
    if (!this.isHTMLElement(node)) {
      return;
    }

    // Track the element if it has data-ds
    if (hasDsId(node)) {
      this.trackElement(node);
    }
    // Also check children
    const children = getAllDsElements(node);
    for (const child of children) {
      this.trackElement(child);
    }
  }

  private untrackNode(node: Node): void {
    if (!this.isHTMLElement(node)) {
      return;
    }

    // Untrack the element if it has data-ds
    const entryId = getDsIdFromElement(node);
    if (entryId) {
      this.untrackElement(entryId);
    }

    // Also check children
    const children = getAllDsElements(node);
    for (const child of children) {
      const childId = getDsIdFromElement(child);
      if (childId) {
        this.untrackElement(childId);
      }
    }
  }

  /**
   * Type guard to check if a node is an HTMLElement
   */
  private isHTMLElement(node: Node): node is HTMLElement {
    return node.nodeType === Node.ELEMENT_NODE;
  }
}
