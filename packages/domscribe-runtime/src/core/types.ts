/**
 * Core runtime types for @domscribe/runtime
 * @module @domscribe/runtime/core/types
 */

import type { ManifestEntryId, RuntimeContext } from '@domscribe/core';
import type { FrameworkAdapter } from '../adapters/adapter.interface.js';
import type { SerializationConstraints } from '../capture/types.js';

/**
 * User-facing runtime configuration options (minus adapter, which is framework-specific).
 *
 * Shared across all framework adapters (React, Vue, Next, Nuxt).
 * Each adapter re-exports this type in its own plugin options.
 */
export interface DomscribeRuntimeOptions {
  /** Capture phase. @default 1 */
  phase?: 1 | 2;
  /** Redact PII from captured data. @default true */
  redactPII?: boolean;
  /** CSS selectors to block from capture. @default [] */
  blockSelectors?: string[];
  /** Serialization constraints for captured props and state. */
  serialization?: SerializationConstraints;
}

/**
 * Internal configuration options for RuntimeManager.
 *
 * Extends user-facing options with the framework adapter.
 */
export interface RuntimeOptions extends DomscribeRuntimeOptions {
  /**
   * Framework adapter for runtime context capture.
   * If not provided, a noop adapter will be used.
   */
  adapter?: FrameworkAdapter;

  /**
   * Enable debug logging
   */
  debug?: boolean;
}

/**
 * Information about a tracked DOM element
 */
export interface ElementInfo {
  /**
   * The DOM element
   */
  element: HTMLElement;

  /**
   * The Domscribe manifest entry ID (data-ds attribute value)
   */
  entryId: ManifestEntryId;

  /**
   * Component instance if available
   */
  componentInstance?: unknown;

  /**
   * Component name if available
   */
  componentName?: string;
}

/**
 * Cross-context bridge interface for communicating with RuntimeManager.
 *
 * @deprecated Use `IRuntimeTransport` from `@domscribe/runtime/bridge` instead.
 * This interface is kept for backward compatibility and will be removed in a future version.
 */
export interface IRuntimeBridge {
  isReady(): boolean;
  captureContextForEntry(
    entryId: ManifestEntryId,
  ): Promise<RuntimeContext | null>;
  getElementInfo(entryId: ManifestEntryId): ElementInfo | null;
  getComponentName(entryId: ManifestEntryId): string | null;
  getTrackedCount(): number;
}

// Re-export RuntimeContext from core for convenience
export type { RuntimeContext };

/**
 * Global window properties injected by the build plugins
 */
declare global {
  interface Window {
    __DOMSCRIBE_RELAY_PORT__?: number;
  }
}
