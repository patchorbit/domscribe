/**
 * Types for the Turbopack loader
 * @module @domscribe/transform/plugins/turbopack/types
 */
import type { RelayPluginOptions, OverlayPluginOptions } from '../types.js';

/**
 * Loader options for the Turbopack self-initializing loader.
 *
 * Unlike the webpack loader (which relies on DomscribeWebpackPlugin for init),
 * the Turbopack loader handles its own singleton initialization, relay auto-start,
 * and cleanup — because Turbopack has no plugin system.
 */
export interface TurbopackLoaderOptions {
  /**
   * Enable debug logging
   *
   * @default false
   */
  debug?: boolean;

  /**
   * Enable transformation.
   * Set to false in production builds.
   *
   * @default true
   */
  enabled?: boolean;

  /**
   * Relay server configuration.
   * Since there is no separate plugin to handle relay lifecycle,
   * the loader manages it directly.
   */
  relay?: RelayPluginOptions;

  /**
   * Overlay UI configuration.
   * When provided, the loader injects overlay options as client-side globals
   * so DomscribeDevProvider (or equivalent) can initialize the overlay.
   *
   * @default false
   */
  overlay?: boolean | OverlayPluginOptions;
}

/**
 * Result of the Turbopack loader's lazy initialization.
 * Available via getInitResult() after the first file is processed.
 */
export interface TurbopackInitResult {
  relayHost: string | undefined;
  relayPort: number | undefined;
}
