/**
 * Next.js config wrapper that injects Domscribe transforms for both
 * Turbopack and Webpack bundler paths.
 *
 * @module @domscribe/next/with-domscribe
 */
import { createRequire } from 'node:module';
import type {
  JSONValue,
  TurbopackRuleConfigItem,
  WebpackConfigContext,
} from 'next/dist/server/config-shared.js';
import type { DomscribeNextOptions } from './types.js';
import type { NextConfig } from 'next';

// ESM-safe require.resolve — Next.js 15+ loads config as ESM
const esmRequire = createRequire(import.meta.url);

/**
 * Minimal webpack config shape used by the Next.js webpack callback.
 */
export interface WebpackConfig {
  module?: {
    rules?: Array<{
      test?: RegExp;
      exclude?: RegExp;
      enforce?: string;
      use?: Array<{ loader: string; options?: Record<string, unknown> }>;
    }>;
  };
  plugins?: Array<unknown>;
  resolve?: {
    alias?: Record<string, string | false>;
  };
}

const DEFAULT_INCLUDE = /\.(jsx|tsx)$/i;
const DEFAULT_EXCLUDE = /node_modules|\.test\.|\.spec\./i;

/**
 * Wrap a Next.js config with Domscribe dev-time transforms.
 *
 * Configures both Turbopack and Webpack paths using the same self-initializing
 * loader, so it works regardless of bundler choice (Next.js 15 webpack,
 * Next.js 16+ Turbopack).
 *
 * In production, injects resolve aliases that replace @domscribe/overlay
 * with a no-op stub as a safety net against accidental imports.
 *
 * @example
 * ```js
 * // next.config.js
 * import { withDomscribe } from '@domscribe/next';
 *
 * export default withDomscribe({
 *   debug: true,
 *   overlay: true,
 *   relay: { port: 4400 },
 * })({
 *   reactStrictMode: true,
 * });
 * ```
 */
export function withDomscribe(
  options: DomscribeNextOptions = {},
): (nextConfig: NextConfig) => NextConfig {
  return (nextConfig: NextConfig): NextConfig => {
    const enabled =
      process.env.NODE_ENV !== 'production' ||
      !!process.env.DOMSCRIBE_FORCE_TRANSFORM;

    return enabled
      ? applyDevTransforms(nextConfig, options)
      : applyProductionAliases(nextConfig);
  };
}

// ---------------------------------------------------------------------------
// Production path — alias dev-only packages to no-op stubs
// ---------------------------------------------------------------------------

/**
 * Resolve the absolute path to the no-op overlay stub shipped with this
 * package. Falls back to the bare specifier when require.resolve is
 * unavailable (ESM-only environments).
 */
function resolveNoopOverlay(): string {
  try {
    return esmRequire.resolve('@domscribe/next/noop/overlay');
  } catch {
    return '@domscribe/next/noop/overlay';
  }
}

/**
 * Replace @domscribe/overlay with a no-op stub in production builds.
 *
 * Safety net: if any code path accidentally imports @domscribe/overlay
 * in production, this alias ensures the bundle gets a tiny stub instead
 * of the full overlay package.
 */
function applyProductionAliases(nextConfig: NextConfig): NextConfig {
  const noopOverlay = resolveNoopOverlay();
  const turbopack = nextConfig.turbopack;
  const existingWebpack = nextConfig.webpack;

  return {
    ...nextConfig,

    turbopack: {
      ...((turbopack ?? {}) as Record<string, unknown>),
      resolveAlias: {
        ...((turbopack?.resolveAlias ?? {}) as Record<string, string>),
        '@domscribe/overlay': noopOverlay,
      },
    },

    webpack: (config: WebpackConfig, context: WebpackConfigContext) => {
      config.resolve ??= {};
      config.resolve.alias ??= {};
      config.resolve.alias['@domscribe/overlay'] = noopOverlay;

      return existingWebpack ? existingWebpack(config, context) : config;
    },
  };
}

// ---------------------------------------------------------------------------
// Development path — inject self-initializing loader for both bundlers
// ---------------------------------------------------------------------------

/**
 * Apply Domscribe dev-time transforms for both Turbopack and Webpack.
 */
function applyDevTransforms(
  nextConfig: NextConfig,
  options: DomscribeNextOptions,
): NextConfig {
  const {
    include = DEFAULT_INCLUDE,
    exclude = DEFAULT_EXCLUDE,
    debug = false,
    relay = {},
    overlay = true,
  } = options;

  return {
    ...nextConfig,
    turbopack: buildTurbopackConfig(nextConfig, { debug, relay, overlay }),
    webpack: buildWebpackFn(nextConfig, {
      include,
      exclude,
      debug,
      relay,
      overlay,
    }),
  };
}

function buildTurbopackConfig(
  nextConfig: NextConfig,
  options: {
    debug: boolean;
    relay: DomscribeNextOptions['relay'];
    overlay: DomscribeNextOptions['overlay'];
  },
): NextConfig['turbopack'] {
  let turbopackLoaderPath: string;
  try {
    turbopackLoaderPath = esmRequire.resolve(
      '@domscribe/transform/turbopack-loader',
    );
  } catch {
    turbopackLoaderPath = '@domscribe/transform/turbopack-loader';
  }

  const loaderOptions: Record<string, JSONValue> = {
    debug: options.debug,
    enabled: true,
    relay: options.relay as JSONValue,
    overlay: options.overlay as JSONValue,
  };

  // Run the loader for ALL compilations (server + client).
  //
  // Unlike Vite (client-only bundler) or webpack (where we can check
  // `context.isServer`), Turbopack compiles server and client bundles
  // in parallel.  We MUST inject data-ds on both sides because:
  //
  //   - Server Components are rendered ONLY on the server — the client
  //     never re-renders them.  If we skip the server compilation,
  //     Server Component elements will never have data-ds in the DOM.
  //
  //   - Client Components are rendered on both sides.  The eager
  //     ID-cache persistence (injectorRegistry.saveCache() after every
  //     transform) ensures both compilations converge on the SAME
  //     stable IDs, avoiding hydration mismatches.
  //
  // Exclude node_modules for performance (condition: {not: 'foreign'}).
  const turbopackRule: TurbopackRuleConfigItem = {
    condition: { not: 'foreign' },
    loaders: [{ loader: turbopackLoaderPath, options: loaderOptions }],
  };

  const turbopack = nextConfig.turbopack;
  const existingRules = turbopack?.rules ?? {};

  return {
    ...((turbopack ?? {}) as Record<string, unknown>),
    rules: {
      ...existingRules,
      '*.jsx': turbopackRule,
      '*.tsx': turbopackRule,
    },
  } as NextConfig['turbopack'];
}

/**
 * Build a webpack function that applies Domscribe transforms for Next.js.
 *
 * Uses the self-initializing turbopack loader (not the webpack loader + plugin
 * combination) because Next.js's webpack integration differs from standalone
 * webpack in ways that matter:
 *
 *   1. **Dual compilation** — Next.js runs server and client webpack compilers
 *      in parallel within the same process. Both MUST apply transforms so
 *      server-rendered HTML and client hydration produce matching data-ds
 *      attributes. The standalone webpack plugin calls `close()` on shared
 *      singletons in its `done` hook, which would race between compilers.
 *      The turbopack loader uses `saveCache()` per file instead, which is
 *      safe for concurrent compilations.
 *
 *   2. **No HtmlWebpackPlugin** — Next.js manages its own HTML rendering, so
 *      the webpack plugin's HTML-based globals injection (relay port, overlay
 *      options) has no effect. The turbopack loader injects globals directly
 *      into transformed source code via a `typeof window` guarded preamble.
 *
 *   3. **Self-initializing** — The turbopack loader manages its own singletons
 *      (ManifestWriter, InjectorRegistry), relay lifecycle, and cleanup via
 *      process exit handlers — no plugin coordination needed.
 *
 * The standalone webpack plugin + loader remain the correct choice for
 * non-Next.js webpack projects where a single compilation exists and
 * HtmlWebpackPlugin handles globals injection.
 */
function buildWebpackFn(
  nextConfig: NextConfig,
  options: {
    include: RegExp;
    exclude: RegExp;
    debug: boolean;
    relay: DomscribeNextOptions['relay'];
    overlay: DomscribeNextOptions['overlay'];
  },
): NextConfig['webpack'] {
  const existingWebpack = nextConfig.webpack;

  let loaderPath: string;
  try {
    loaderPath = esmRequire.resolve('@domscribe/transform/turbopack-loader');
  } catch {
    loaderPath = '@domscribe/transform/turbopack-loader';
  }

  const loaderOptions: Record<string, JSONValue> = {
    debug: options.debug,
    enabled: true,
    relay: options.relay as JSONValue,
    overlay: options.overlay as JSONValue,
  };

  return (config: WebpackConfig, context: WebpackConfigContext) => {
    config.module?.rules?.push({
      test: options.include,
      exclude: options.exclude,
      enforce: 'pre',
      use: [{ loader: loaderPath, options: loaderOptions }],
    });

    return existingWebpack ? existingWebpack(config, context) : config;
  };
}
