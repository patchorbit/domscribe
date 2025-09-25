/**
 * Core runtime types for @domscribe/runtime
 * @module @domscribe/runtime/core/types
 */

import type { ManifestEntryId, RuntimeContext } from '@domscribe/core';
import type { FrameworkAdapter } from '../adapters/adapter.interface.js';

/**
 * Configuration options for RuntimeManager
 */
export interface RuntimeOptions {
  /**
   * Feature phase gate (Phase 1 or Phase 2)
   * - Phase 1: Props and state capture
   * - Phase 2: Event flow and performance metrics
   */
  phase?: 1 | 2;

  /**
   * Framework adapter for runtime context capture
   * If not provided, a noop adapter will be used
   */
  adapter?: FrameworkAdapter;

  /**
   * Enable debug logging
   */
  debug?: boolean;

  /**
   * Enable PII redaction in captured data
   * @default true
   */
  redactPII?: boolean;

  /**
   * CSS selectors for elements to skip during capture
   * @default []
   */
  blockSelectors?: string[];
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
