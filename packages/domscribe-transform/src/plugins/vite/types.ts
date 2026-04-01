/**
 * Types for the Vite plugin
 * @module @domscribe/transform/plugins/vite/types
 */
import type { RelayPluginOptions, OverlayPluginOptions } from '../types.js';

export type { RelayPluginOptions, OverlayPluginOptions };

/**
 * Configuration options for the Vite plugin
 */
export interface VitePluginOptions {
  /**
   * File pattern to include for transformation
   *
   * @default /\.(jsx|tsx|vue)$/i
   */
  include?: RegExp;

  /**
   * File pattern to exclude from transformation
   *
   * @default /node_modules|\.test\.|\.spec\./i
   */
  exclude?: RegExp;

  /**
   * Enable debug logging
   *
   * @default false
   */
  debug?: boolean;

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

  /**
   * Override the root directory for `.domscribe/` artifacts (manifest,
   * transform cache, relay lock).
   *
   * When omitted, defaults to Vite's `config.root`. Needed when the Vite
   * root differs from the project root (e.g., Nuxt with a custom `srcDir`).
   */
  rootDir?: string;
}
