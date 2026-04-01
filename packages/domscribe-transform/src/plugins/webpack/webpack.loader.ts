/**
 * Webpack loader for Domscribe transform
 *
 * Per-file transform loader that injects `data-ds` attributes into JSX/TSX/Vue
 * source code. Requires DomscribeWebpackPlugin to be registered for lifecycle
 * management (InjectorRegistry and ManifestWriter initialization).
 *
 * @module @domscribe/transform/plugins/webpack/webpack-loader
 */
import type { LoaderContext } from 'webpack';
import { FileTimings } from '../../core/types.js';
import { WebpackLoaderOptions } from './types.js';
import { SourceMap } from 'magic-string';
import { SourceMapConsumer } from 'source-map';
import {
  InjectorRegistry,
  isInjectorFileExtension,
} from '../../core/injector.registry.js';
import { ManifestWriter } from '@domscribe/manifest';
import { TransformStats } from '../../core/stats.js';
import { PATHS } from '@domscribe/core';
import path from 'path';

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
  const totalStart = performance.now();
  const timings: FileTimings = {
    sourceMapConsumerMs: 0,
    parseMs: 0,
    traversalMs: 0,
    totalTransformMs: 0,
  };

  if (!source) {
    return callback(null, source);
  }

  const { rootContext, resourcePath: sourceFile } = context;
  const { debug, enabled = true } = context.getOptions();

  // Skip transformation if disabled (production builds)
  if (!enabled) {
    return callback(null, source);
  }

  // Declare dependencies on domscribe cache files so webpack's persistent
  // filesystem cache invalidates when they change (e.g., ID cache cleared).
  const idCachePath = path.join(
    rootContext,
    PATHS.TRANSFORM_CACHE,
    'id-cache.json',
  );
  context.addDependency(idCachePath);

  const injectorRegistry = InjectorRegistry.getInstance(rootContext);

  if (!injectorRegistry) {
    if (debug) {
      console.warn(
        `[domscribe-transform][webpack-loader] No injector registry found for ${rootContext}, skipping transformation`,
      );
    }
    return callback(null, source);
  }

  const fileExtension = sourceFile.split('.').pop();

  if (!fileExtension) {
    if (debug) {
      console.warn(
        `[domscribe-transform][webpack-loader] No file extension found for ${sourceFile}, skipping transformation`,
      );
    }
    return callback(null, source);
  }

  if (!isInjectorFileExtension(fileExtension)) {
    if (debug) {
      console.warn(
        `[domscribe-transform][webpack-loader] Invalid file extension ${fileExtension} for ${sourceFile}, skipping transformation`,
      );
    }
    return callback(null, source);
  }

  // Create source map consumer if source map is provided
  let sourceMapConsumer: SourceMapConsumer | undefined;
  if (sourceMap) {
    const smStart = performance.now();
    sourceMapConsumer = await new SourceMapConsumer(sourceMap);
    timings.sourceMapConsumerMs = performance.now() - smStart;
  }

  const injector = await injectorRegistry.getInjector(fileExtension);

  // Inject data-ds attributes and generate manifest entries
  let result;
  try {
    result = injector.inject(source, {
      sourceFile,
      sourceMapConsumer,
    });
  } catch (error) {
    console.warn(
      `[domscribe-transform][webpack-loader] Failed to transform ${sourceFile}:`,
      error instanceof Error ? error.message : String(error),
    );
    return callback(null, source);
  }

  const {
    code: transformedCode,
    map,
    manifestEntries,
    metrics: injectorMetrics,
  } = result;

  // Copy injector metrics
  timings.parseMs = injectorMetrics.parseMs;
  timings.traversalMs = injectorMetrics.traversalMs;

  // Cleanup source map consumer
  if (sourceMapConsumer) {
    const destroyStart = performance.now();
    sourceMapConsumer.destroy();
    timings.sourceMapConsumerMs += performance.now() - destroyStart;
  }

  const writer = ManifestWriter.getInstance(rootContext);
  writer.appendEntries(manifestEntries);

  if (!map) {
    if (debug) {
      console.warn(
        `[domscribe-transform][webpack-loader] No source map generated for ${sourceFile}, skipping transformation`,
      );
    }
    return callback(null, source);
  }

  // Calculate total transform time
  timings.totalTransformMs = performance.now() - totalStart;

  // Record metrics
  const stats = TransformStats.getInstance(rootContext);
  stats.record({
    file: sourceFile,
    timings,
    counts: {
      elementsFound: injectorMetrics.elementsFound,
      elementsInjected: injectorMetrics.elementsInjected,
    },
  });

  // Debug logging
  if (debug) {
    console.log(
      `[domscribe-transform][webpack-loader] Transformed ${sourceFile}: ` +
        `${injectorMetrics.elementsInjected} elements in ${timings.totalTransformMs.toFixed(2)}ms ` +
        `(parse=${timings.parseMs.toFixed(2)}ms, traverse=${timings.traversalMs.toFixed(2)}ms, ` +
        `smConsumer=${timings.sourceMapConsumerMs.toFixed(2)}ms)`,
    );
  }

  callback(null, transformedCode, map);
}
