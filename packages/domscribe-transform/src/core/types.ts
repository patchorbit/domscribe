import { ManifestEntry } from '@domscribe/core';
import MagicString from 'magic-string';
import { SourceMapConsumer } from 'source-map';

export interface InjectorOptions {
  /**
   * Enable debug logging
   *
   * @default false
   */
  debug?: boolean;
}

/**
 * Configuration options for the injector
 */
export interface InjectParams {
  /**
   * Source file path (for error messages and manifest entries)
   */
  sourceFile?: string;

  /**
   * Optional source map consumer for resolving transpiled positions
   * to original TypeScript source locations.
   *
   * Used in Vite context where esbuild strips TypeScript before our plugin runs.
   */
  sourceMapConsumer?: SourceMapConsumer;

  /**
   * Optional file hash for ID stabilization across HMR cycles
   *
   * When provided with idStabilizer, enables HMR-stable element IDs.
   */
  fileHash?: string;
}

/**
 * Result of the injection operation
 */
export interface InjectorResult {
  /**
   * Transformed source code with `data-ds` attributes injected
   */
  code: string;

  /**
   * Source map for the transformation (magic-string format)
   */
  map: ReturnType<MagicString['generateMap']> | null;

  /**
   * List of manifest entries for injected elements
   */
  manifestEntries: ManifestEntry[];
}

/**
 * Transform statistics data
 */
export interface TransformStatsData {
  /**
   * Number of files that were transformed
   */
  filesTransformed: number;

  /**
   * Total number of elements that had data-ds attributes injected
   */
  elementsInjected: number;

  /**
   * Total time spent transforming in milliseconds
   */
  totalTimeMs: number;
}
