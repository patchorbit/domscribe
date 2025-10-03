/**
 * Vite plugin for Domscribe transform layer
 *
 * This plugin integrates the DomscribeInjector with Vite's plugin system,
 * providing:
 * - JSX file transformation with data-ds attribute injection
 * - Source map resolution for accurate TypeScript line numbers
 * - Manifest entry generation
 * - Dev-only operation (stripped in production)
 *
 * Architecture:
 * - Uses AcornParser (TypeScript already stripped by esbuild)
 *   - Can be replaced with BabelParser - Speed is the concern there
 * - Uses DomscribeInjector for parser-agnostic injection
 * - Resolves transpiled positions to original TypeScript via source maps
 *
 * Performance:
 * - Target: <10ms HMR overhead per file
 * - Typical: 3-6ms (parse + inject + source map resolution)
 */

import { createFilter, type Plugin } from 'vite';
import { SourceMapConsumer } from 'source-map';
import { IDStabilizer, ManifestManager } from '@domscribe/manifest';
import { DomscribeInjector } from '../../core/injector.js';
import { AcornParser } from '../../parsers/acorn/acorn.parser.js';
import { TransformStats } from '../../core/stats.js';
import { VitePluginOptions } from './types.js';

export function domscribe(options: VitePluginOptions = {}): Plugin {
  const {
    enforce = 'post', // Run after other plugins if not specified
    include = /\.jsx$/i, // Only transform JSX files
    exclude = /node_modules|\.test\.|\.spec\./i,
    debug = false,
  } = options;
  const filter = createFilter(include, exclude);

  // Parser instance (Used across transforms)
  const parser = new AcornParser();

  // IDStabilizer, Injector and ManifestManager are initialized in buildStart
  // and used across transforms
  let idStabilizer: IDStabilizer | undefined;
  let injector: DomscribeInjector | undefined;
  let manager: ManifestManager | undefined;

  // Statistics tracking (dev mode only)
  const stats = new TransformStats();

  let rootContext: string | undefined;

  return {
    name: 'vite-plugin-domscribe-transform',
    enforce,
    apply: 'serve',

    configResolved(config) {
      rootContext = config.root;
    },

    async buildStart() {
      if (!rootContext) {
        throw new Error('Root context not found');
      }

      // Initialize manifest manager once per build
      manager = ManifestManager.getInstance(rootContext, { debug });
      await manager.initialize();

      // Initialize injector instance
      idStabilizer = manager.getIDStabilizer();
      injector = new DomscribeInjector(parser, idStabilizer, { debug });

      if (debug) {
        console.log(
          '[domscribe-transform][vite-plugin] Vite plugin initialized',
        );
      }
    },

    async transform(code, sourceFile) {
      if (!injector) {
        throw new Error('Injector not initialized');
      }

      if (!idStabilizer) {
        throw new Error('IDStabilizer not initialized');
      }

      // Filter files
      if (!filter(sourceFile)) {
        return null;
      }

      const startTime = debug ? performance.now() : 0;

      try {
        // Compute file hash for ID stabilization
        const fileHash = await idStabilizer.computeFileHash(code);

        // Get combined source map from previous transforms if available
        const sourceMap = this.getCombinedSourcemap();

        // Create source map consumer for position resolution
        const sourceMapConsumer = sourceMap
          ? await new SourceMapConsumer(sourceMap)
          : undefined;

        // Inject data-ds attributes and generate manifest entries
        const {
          code: transformedCode,
          map,
          manifestEntries,
        } = injector.inject(code, {
          sourceFile,
          sourceMapConsumer,
          fileHash,
        });

        // Cleanup source map consumer
        sourceMapConsumer?.destroy();

        // Write manifest entries via manager
        manager?.appendEntries(manifestEntries);

        // Update statistics
        if (debug) {
          const duration = performance.now() - startTime;
          stats.recordTransform(manifestEntries.length, duration);

          console.log(
            `[domscribe-transform][vite-plugin] Transformed ${sourceFile}: ${manifestEntries.length} elements in ${duration.toFixed(2)}ms`,
          );
        }

        return {
          code: transformedCode,
          map,
        };
      } catch (error) {
        // Log error but don't break the build
        console.error(
          `[domscribe-transform][vite-plugin] Failed to transform ${sourceFile}:`,
          error instanceof Error ? error.message : String(error),
        );

        // Return original code on error (failsafe behavior)
        return null;
      }
    },

    async buildEnd() {
      // Flush and close manifest manager
      if (manager) {
        await manager.flush();
        await manager.close();
      }

      // Print statistics in debug mode
      if (debug) {
        const managerStats = manager?.getStats();
        stats.print('domscribe-transform][vite-plugin]', managerStats);
      }
    },
  };
}

export default domscribe;
