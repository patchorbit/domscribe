/**
 * Vue adapter type definitions
 * @module @domscribe/vue/adapter/types
 */

import type { FrameworkAdapter } from '@domscribe/runtime';

/**
 * Configuration options for VueAdapter
 */
export interface VueAdapterOptions {
  /**
   * Maximum depth to traverse the component tree
   * @default 50
   */
  maxTreeDepth?: number;

  /**
   * Enable debug logging
   * @default false
   */
  debug?: boolean;
}

/**
 * Internal state for VueAdapter
 * @internal
 */
export interface VueAdapterState {
  /**
   * Whether the adapter is initialized
   */
  initialized: boolean;

  /**
   * Detected Vue version
   */
  version?: string;

  /**
   * Whether VNode access is available on DOM elements
   */
  hasVNodeAccess: boolean;
}

/**
 * Extended FrameworkAdapter with Vue-specific methods
 */
export interface VueFrameworkAdapter extends FrameworkAdapter {
  /**
   * Get the Vue version
   */
  getVueVersion(): string | null;
}
