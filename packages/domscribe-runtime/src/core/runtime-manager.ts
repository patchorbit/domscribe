/**
 * RuntimeManager - Central runtime coordinator (singleton)
 *
 * Coordinates all runtime operations including:
 * - Element tracking
 * - Runtime context capture
 * - Framework adapter management
 * - Lifecycle management
 *
 * @module @domscribe/runtime/core/runtime-manager
 */

import type { ManifestEntryId, RuntimeContext } from '@domscribe/core';
import type { RuntimeOptions, ElementInfo } from './types.js';
import type { CaptureOptions } from '../capture/types.js';
import { ElementTracker } from './element-tracker.js';
import { ContextCapturer } from './context-capturer.js';
import { NoopAdapter } from '../adapters/noop-adapter.js';
import { RuntimeNotInitializedError, RuntimeError } from '../errors/index.js';
import { isHTMLElement } from '../utils/validation.js';
import { FrameworkAdapter } from '../adapters/adapter.interface.js';

/**
 * RuntimeManager singleton class
 *
 * Provides a unified API for runtime context capture and element tracking
 */
export class RuntimeManager {
  private static instance: RuntimeManager | null = null;

  private elementTracker: ElementTracker | null = null;
  private contextCapturer: ContextCapturer | null = null;
  private options: Required<Omit<RuntimeOptions, 'serialization'>> &
    Pick<RuntimeOptions, 'serialization'>;
  private isInitialized = false;

  private constructor() {
    // Default options
    this.options = {
      phase: 1,
      adapter: new NoopAdapter(), // Default
      debug: false,
      redactPII: true,
      blockSelectors: [],
      serialization: undefined,
    };
  }

  /**
   * Get the singleton instance
   *
   * @returns RuntimeManager instance
   */
  static getInstance(): RuntimeManager {
    if (!RuntimeManager.instance) {
      RuntimeManager.instance = new RuntimeManager();
    }
    return RuntimeManager.instance;
  }

  /**
   * Reset the singleton instance (useful for testing)
   */
  static resetInstance(): void {
    if (RuntimeManager.instance) {
      RuntimeManager.instance.cleanup();
    }
    RuntimeManager.instance = null;
  }

  /**
   * Initialize the runtime manager
   *
   * @param options - Runtime options
   */
  async initialize(options: RuntimeOptions = {}): Promise<void> {
    if (typeof window !== 'undefined' && !window.__DOMSCRIBE_RELAY_PORT__) {
      console.warn(
        '[domscribe-runtime] No active Domscribe dev session detected. ' +
          'RuntimeManager is dev-only and will not initialize in production.',
      );
      return;
    }

    if (this.isInitialized) {
      if (this.options.debug) {
        console.warn(
          '[domscribe-runtime][runtime-manager] Already initialized, re-initializing with new options',
        );
      }
      this.cleanup();
    }

    // Merge options with defaults
    this.options = {
      phase: options.phase ?? 1,
      adapter: options.adapter ?? new NoopAdapter(),
      debug: options.debug ?? false,
      redactPII: options.redactPII ?? true,
      blockSelectors: options.blockSelectors ?? [],
      serialization: options.serialization,
    };

    try {
      // Initialize element tracker
      this.elementTracker = new ElementTracker({
        adapter: this.options.adapter,
        debug: this.options.debug,
      });

      // Start observing DOM
      this.elementTracker.observeDOM();

      // Initialize context capturer
      this.contextCapturer = new ContextCapturer({
        adapter: this.options.adapter,
        phase: this.options.phase,
        serialization: this.options.serialization,
        redactPII: this.options.redactPII,
        debug: this.options.debug,
      });

      this.isInitialized = true;

      if (this.options.debug) {
        console.log('[domscribe-runtime][runtime-manager] Initialized', {
          phase: this.options.phase,
          adapter: this.options.adapter.name,
          trackedElements: this.elementTracker.getTrackedCount(),
        });
      }
    } catch (error) {
      throw new RuntimeError(
        'Failed to initialize RuntimeManager',
        error instanceof Error ? error : undefined,
      );
    }
  }

  /**
   * Capture runtime context for an element by its entry ID
   *
   * @param entryId - The manifest entry ID (data-ds attribute value)
   * @param options - Capture options
   * @returns Runtime context or null if element not found
   */
  async captureContext(
    entryId: ManifestEntryId,
    options: CaptureOptions = {},
  ): Promise<RuntimeContext | null> {
    this.ensureInitialized();

    try {
      // Get element from tracker
      const element = this.elementTracker?.getElement(entryId);
      if (!element) {
        if (this.options.debug) {
          console.warn(
            `[domscribe-runtime][runtime-manager] Element not found: ${entryId}`,
          );
        }
        return null;
      }

      // Check if element is blocked
      if (this.isElementBlocked(element)) {
        if (this.options.debug) {
          console.warn(
            `[domscribe-runtime][runtime-manager] Element is blocked: ${entryId}`,
          );
        }
        return null;
      }

      // Capture context
      const context = this.contextCapturer
        ? await this.contextCapturer.captureForElement(element, options)
        : null;

      return context;
    } catch (error) {
      throw new RuntimeError(
        `Failed to capture context for element with data-ds ID ${entryId}`,
        error instanceof Error ? error : undefined,
      );
    }
  }

  /**
   * Capture runtime context for a DOM element directly
   *
   * Use this when you have the element reference (e.g., from click events
   * in the Overlay picker). This is preferred over captureContext(entryId)
   * when the element is already available, as it avoids the registry lookup.
   *
   * @param element - The DOM element to capture context for
   * @param options - Capture options
   * @returns Runtime context or null if capture fails
   */
  async captureContextForElement(
    element: HTMLElement,
    options: CaptureOptions = {},
  ): Promise<RuntimeContext | null> {
    this.ensureInitialized();

    // Validate element
    if (!isHTMLElement(element)) {
      if (this.options.debug) {
        console.warn(
          '[domscribe-runtime][runtime-manager] Invalid element provided to captureContextForElement',
        );
      }
      return null;
    }

    try {
      // Check if element is blocked
      if (this.isElementBlocked(element)) {
        if (this.options.debug) {
          console.warn(
            '[domscribe-runtime][runtime-manager] Element is blocked',
          );
        }
        return null;
      }

      // Capture context
      const context = this.contextCapturer
        ? await this.contextCapturer.captureForElement(element, options)
        : null;

      return context;
    } catch (error) {
      throw new RuntimeError(
        'Failed to capture context for element',
        error instanceof Error ? error : undefined,
      );
    }
  }

  /**
   * Get element info by its entry ID
   *
   * @param entryId - The manifest entry ID
   * @returns Element info or null
   */
  getElementInfo(entryId: ManifestEntryId): ElementInfo | null {
    this.ensureInitialized();
    return this.elementTracker
      ? this.elementTracker.getElementInfo(entryId)
      : null;
  }

  /**
   * Get all tracked element IDs
   *
   * @returns Array of element IDs
   */
  getAllEntryIds(): string[] {
    this.ensureInitialized();
    return this.elementTracker ? this.elementTracker.getAllEntryIds() : [];
  }

  /**
   * Get count of tracked elements
   *
   * @returns Number of tracked elements
   */
  getTrackedCount(): number {
    this.ensureInitialized();
    return this.elementTracker ? this.elementTracker.getTrackedCount() : 0;
  }

  /**
   * Register a framework adapter
   *
   * @param adapter - The framework adapter
   */
  registerAdapter(adapter: FrameworkAdapter): void {
    this.options.adapter = adapter;

    if (this.isInitialized) {
      // Re-initialize with new adapter
      this.initialize(this.options).catch((error) => {
        if (this.options.debug) {
          console.error(
            '[domscribe-runtime][runtime-manager] Failed to re-initialize with new adapter:',
            error,
          );
        }
      });
    }

    if (this.options.debug) {
      console.log(
        `[domscribe-runtime][runtime-manager] Registered adapter: ${adapter.name}`,
      );
    }
  }

  /**
   * Cleanup and dispose
   */
  cleanup(): void {
    if (this.elementTracker) {
      this.elementTracker.dispose();
      this.elementTracker = null;
    }

    this.contextCapturer = null;
    this.isInitialized = false;

    if (this.options.debug) {
      console.log('[domscribe-runtime][runtime-manager] Cleaned up');
    }
  }

  /**
   * Check if the manager is initialized
   *
   * @returns True if initialized
   */
  isReady(): boolean {
    return this.isInitialized;
  }

  // Private helpers

  /**
   * Ensure the manager is initialized
   */
  private ensureInitialized(): void {
    if (!this.isInitialized) {
      throw new RuntimeNotInitializedError();
    }
  }

  /**
   * Check if an element matches any block selectors
   *
   * @param element - The element to check
   * @returns True if the element is blocked
   */
  private isElementBlocked(element: HTMLElement): boolean {
    if (this.options.blockSelectors.length === 0) {
      return false;
    }

    return this.options.blockSelectors.some((selector) => {
      try {
        return element.matches(selector);
      } catch {
        return false;
      }
    });
  }
}
