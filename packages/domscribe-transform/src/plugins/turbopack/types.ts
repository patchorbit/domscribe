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

  /**
   * Absolute filesystem path to the auto-init module.
   *
   * When provided, the loader computes a relative path from each transformed
   * file to this module and injects that as the dynamic `import()` specifier.
   * This avoids bare-specifier resolution issues in pnpm monorepos where the
   * transformed file may belong to a workspace package that doesn't directly
   * depend on the auto-init package.
   *
   * Meta-framework wrappers (e.g. `withDomscribe` in `@domscribe/next`)
   * should resolve this via `require.resolve()` and pass it here.
   *
   * Falls back to `@domscribe/next/auto-init` when omitted.
   */
  autoInitPath?: string;
}

/**
 * Result of the Turbopack loader's lazy initialization.
 * Available via getInitResult() after the first file is processed.
 */
export interface TurbopackInitResult {
  relayHost: string | undefined;
  relayPort: number | undefined;
}
