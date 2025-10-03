/**
 * Webpack plugin for Domscribe transform layer
 *
 * This plugin coordinates manifest writing after webpack processes all modules.
 * It collects manifest entries from the loader metadata and writes them to disk.
 *
 * Architecture:
 * - Collects manifest entries from all transformed modules
 * - Writes entries to .domscribe/manifest.jsonl (append-only JSONL)
 * - Tracks statistics (files transformed, elements injected)
 * - Dev-only operation (stripped in production via enabled option)
 *
 * Key Features:
 * - Failsafe: never breaks webpack builds
 * - Efficient: only runs after full compilation (not on every HMR update)
 * - Debug mode: optional performance tracking and statistics logging
 *
 * Performance:
 * - Target: <20ms plugin overhead per full compilation
 * - Typical: 10-15ms (collection + write)
 */

import { Compiler, Compilation } from 'webpack';
import type { ManifestEntry } from '@domscribe/core';
import { ManifestManager } from '@domscribe/manifest';
import { TransformStats } from '../../core/stats.js';
import { WebpackPluginOptions } from './types.js';

export class DomscribeWebpackPlugin {
  public static name = 'DomscribeWebpackPlugin';

  private options: Required<WebpackPluginOptions>;
  private stats: TransformStats;
  private manager: ManifestManager | null = null;

  constructor(options: WebpackPluginOptions = {}) {
    // Disable in production by default
    const isProduction = process.env.NODE_ENV === 'production';

    const { debug = false, enabled = !isProduction } = options;

    this.options = {
      debug,
      enabled,
    };

    this.stats = new TransformStats();
  }

  apply(compiler: Compiler): void {
    // Skip if disabled (production builds)
    if (!this.options.enabled) {
      if (this.options.debug) {
        console.log(
          '[domscribe-transform][webpack-plugin] Skipping (disabled for production)',
        );
      }
      return;
    }

    const {
      hooks: { beforeCompile, compilation, done },
    } = compiler;

    // Initialize manifest manager before compilation
    beforeCompile.tapAsync(DomscribeWebpackPlugin.name, (_, callback) => {
      this.preCompilationHook(compiler);
      callback();
    });

    // Collect and write manifest entries after compilation
    compilation.tap(DomscribeWebpackPlugin.name, (compilation) =>
      this.compilationHook(compilation),
    );

    // Flush, close manager, and print statistics after compilation
    done.tapAsync(DomscribeWebpackPlugin.name, (_, callback) => {
      this.doneHook();
      callback();
    });
  }

  private collectManifestEntries(compilation: Compilation): ManifestEntry[] {
    const allEntries: ManifestEntry[] = [];

    // Iterate through all modules in the compilation
    for (const module of compilation.modules) {
      const buildInfo = module.buildInfo;

      if (!buildInfo || !buildInfo.domscribeManifestEntries) {
        continue;
      }

      const entries = buildInfo.domscribeManifestEntries as ManifestEntry[];
      allEntries.push(...entries);

      if (this.options.debug && entries.length > 0) {
        console.log(
          `[domscribe-transform][webpack-plugin] Collected ${entries.length} manifest entries`,
        );
      }
    }

    return allEntries;
  }

  private printStats(): void {
    const managerStats = this.manager?.getStats();
    this.stats.print('domscribe-plugin', managerStats);
  }

  private preCompilationHook = (compiler: Compiler) => {
    try {
      this.manager = ManifestManager.getInstance(compiler.context, {
        debug: this.options.debug,
      });
      this.manager.initialize();

      if (this.options.debug) {
        console.log(
          '[domscribe-transform][webpack-plugin] Webpack plugin initialized',
        );
      }
    } catch (error) {
      console.error(
        '[domscribe-transform][webpack-plugin] Failed to initialize:',
        error instanceof Error ? error.message : String(error),
      );
    }
  };

  private compilationHook = (compilation: Compilation) => {
    // Run after optimization, before emit
    compilation.hooks.processAssets.tapAsync(
      {
        name: DomscribeWebpackPlugin.name,
        stage: Compilation.PROCESS_ASSETS_STAGE_REPORT,
      },
      (_, callback) => {
        this.processAssetsHook(compilation);
        callback();
      },
    );
  };

  private processAssetsHook = (compilation: Compilation) => {
    const startTime = this.options.debug ? performance.now() : 0;

    try {
      // Collect manifest entries from all modules
      const entries = this.collectManifestEntries(compilation);

      // Count unique files that were transformed
      const uniqueFiles = new Set<string>();
      for (const entry of entries) {
        uniqueFiles.add(entry.file);
      }

      // Record statistics for each unique file (we don't have per-file timing in plugin)
      // Since we collect all at once, we record timing once but count all files
      const durationPerFile = this.options.debug
        ? (performance.now() - startTime) / uniqueFiles.size
        : 0;

      for (let i = 0; i < uniqueFiles.size; i++) {
        this.stats.recordTransform(
          entries.length / uniqueFiles.size,
          durationPerFile,
        );
      }

      // Write manifest entries via manager
      if (entries.length > 0 && this.manager) {
        this.manager.appendEntries(entries);
      }

      if (this.options.debug) {
        const duration = performance.now() - startTime;

        console.log(
          `[domscribe-transform][webpack-plugin] Collected and wrote ${entries.length} manifest entries from ${uniqueFiles.size} files in ${duration.toFixed(2)}ms`,
        );
      }
    } catch (error) {
      // Log error but don't break the build (failsafe behavior)
      console.error(
        '[domscribe-transform][webpack-plugin] Failed to write manifest:',
        error instanceof Error ? error.message : String(error),
      );
    }
  };

  private doneHook = () => {
    try {
      // Flush and close manifest manager
      if (this.manager) {
        this.manager.flush();
        this.manager.close();
      }

      // Print statistics in debug mode
      if (this.options.debug) {
        this.printStats();
      }
    } catch (error) {
      console.error(
        '[domscribe-transform][webpack-plugin] Failed to close manager:',
        error instanceof Error ? error.message : String(error),
      );
    }
  };
}

export default DomscribeWebpackPlugin;
