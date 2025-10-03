/**
 * Webpack loader for Domscribe transform layer
 *
 * This loader integrates the DomscribeInjector with webpack's loader system,
 * providing:
 * - JSX/TSX file transformation with data-ds attribute injection
 * - Source map generation for accurate TypeScript line numbers
 * - Manifest entry generation
 * - Dev-only operation (stripped in production via loader options)
 *
 * Architecture:
 * - Uses BabelParser to parse TypeScript source code
 * - Uses DomscribeInjector for parser-agnostic injection
 * - Works with both TypeScript and JavaScript source code
 *
 * Key Difference from Vite:
 * - Can receive both TypeScript and JavaScript source code
 * - Uses BabelParser for TypeScript parsing
 *
 * Performance:
 * - Target: <10ms per file
 * - Typical: 3-5ms (parse + inject)
 */

import type { LoaderContext } from 'webpack';
import { DomscribeInjector } from '../../core/injector.js';
import { InjectorResult } from '../../core/types.js';
import { BabelParser } from '../../parsers/babel/babel.parser.js';
import { TransformStats } from '../../core/stats.js';
import { ManifestManager } from '@domscribe/manifest';
import { WebpackLoaderOptions } from './types.js';
import { SourceMap } from 'magic-string';
import { SourceMapConsumer } from 'source-map';

// Global stats object (shared across all loader instances)
const stats = new TransformStats();

export default function domscribeLoader(
  this: LoaderContext<WebpackLoaderOptions>,
  source: string,
  sourceMap?: SourceMap,
): string | void {
  // Get loader options
  const callback = this.async();

  transform(this, { source, sourceMap }, callback).catch((error) => {
    console.warn(
      `[domscribe-transform][webpack-loader] Failed to transform ${this.resourcePath}:`,
      error instanceof Error ? error.message : String(error),
    );

    // Swallow the error and return the original source
    return callback(null, source);
  });
}

export async function transform(
  context: LoaderContext<WebpackLoaderOptions>,
  { source, sourceMap }: { source: string; sourceMap?: SourceMap },
  callback: ReturnType<LoaderContext<WebpackLoaderOptions>['async']>,
) {
  if (!source) {
    return callback(null, source);
  }

  const { rootContext, resourcePath: sourceFile } = context;
  const { debug, enabled = true } = context.getOptions();

  // Skip transformation if disabled (production builds)
  if (!enabled) {
    return callback(null, source);
  }

  // Track start time for debug mode
  const startTime = debug ? performance.now() : 0;

  // Get ManifestManager instance for ID stabilization
  const manager = ManifestManager.getInstance(rootContext);
  const idStabilizer = manager.getIDStabilizer();

  await idStabilizer.initialize();

  const fileHash = idStabilizer.computeFileHashSync(source);

  // Create parser and injector instances
  const parser = new BabelParser();
  const injector = new DomscribeInjector(parser, idStabilizer, { debug });
  let result: InjectorResult | undefined;

  const sourceMapConsumer = sourceMap
    ? await new SourceMapConsumer(sourceMap)
    : undefined;

  // Inject data-ds attributes and generate manifest entries
  try {
    result = injector.inject(source, {
      sourceFile,
      fileHash,
      sourceMapConsumer,
    });
  } catch (error) {
    console.warn(
      `[domscribe-transform][webpack-loader] Failed to transform ${sourceFile}:`,
      error instanceof Error ? error.message : String(error),
    );
    return callback(null, source);
  }

  const { code: transformedCode, map, manifestEntries } = result;

  if (!map) {
    if (debug) {
      console.warn(
        `[domscribe-transform][webpack-loader] No source map generated for ${sourceFile}, skipping transformation`,
      );
    }
    return callback(null, source);
  }

  // Update statistics
  const duration = debug ? performance.now() - startTime : 0;
  stats.recordTransform(manifestEntries.length, duration);

  if (debug) {
    console.log(
      `[domscribe-transform][webpack-loader] Transformed ${sourceFile}: ${manifestEntries.length} elements in ${duration.toFixed(2)}ms`,
    );
  }

  callback(null, transformedCode, map, {
    domscribeManifestEntries: manifestEntries,
    webpackAST: {},
  });
}

/**
 * Get loader statistics (for testing and debugging)
 *
 * @returns Current loader statistics
 */
export function getLoaderStats() {
  return stats.getData();
}

/**
 * Reset loader statistics (for testing)
 */
export function resetLoaderStats(): void {
  stats.reset();
}

/**
 * Print loader statistics to console
 */
export function printLoaderStats(): void {
  stats.print('domscribe-transform][webpack-loader');
}
