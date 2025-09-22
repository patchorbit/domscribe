/**
 * Types for the webpack plugin and loader
 * @module @domscribe/transform/plugins/webpack/types
 */
import type { RelayPluginOptions, OverlayPluginOptions } from '../types.js';

export type { RelayPluginOptions, OverlayPluginOptions };

/**
 * Loader options passed via webpack config
 */
export interface WebpackLoaderOptions {
  /**
   * Enable debug logging
   *
   * @default false
   */
  debug?: boolean;

  /**
   * Enable transformation
   * Set to false in production builds
   *
   * @default true
   */
  enabled?: boolean;
}

/**
 * Configuration options for the webpack plugin
 */
export interface WebpackPluginOptions {
  /**
   * Enable debug logging
   *
   * @default false
   */
  debug?: boolean;

  /**
   * Enable plugin (set to false in production builds)
   *
   * @default true in development, false in production
   */
  enabled?: boolean;

  /**
   * Relay server configuration.
   * Controls auto-start behavior and connection settings.
   */
  relay?: RelayPluginOptions;

  /**
   * Overlay UI configuration.
   * Set to true for default options, or provide configuration.
   * Requires @domscribe/overlay package to be installed.
   *
   * @default true
   */
  overlay?: boolean | OverlayPluginOptions;
}
