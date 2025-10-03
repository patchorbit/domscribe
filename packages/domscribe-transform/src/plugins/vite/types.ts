import type { Plugin } from 'vite';
/**
 * Configuration options for the Vite plugin
 */
export interface VitePluginOptions {
  /**
   * Enforce plugin invocation tier similar to webpack loaders.
   *
   * Plugin invocation order:
   * - alias resolution
   * - `enforce: 'pre'` plugins
   * - vite core plugins (esbuild)
   * - normal plugins
   * - vite build plugins
   * - `enforce: 'post'` plugins
   * - vite build post plugins
   */
  enforce?: Plugin['enforce'];
  /**
   * File pattern to include for transformation
   *
   * @default /\.(jsx|tsx)$/i
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
}
