/**
 * Types for the core injector and transform metrics
 * @module @domscribe/transform/core/types
 */
import { ManifestEntry } from '@domscribe/core';
import MagicString from 'magic-string';
import { SourceMapConsumer } from 'source-map';

/**
 * Options shared by all injector instances
 */
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
}

// ===========================================
// Metrics types
// ===========================================

/**
 * Timing breakdown for a single file transform
 */
export interface FileTimings {
  /** Time to create + destroy SourceMapConsumer (0 if not used) */
  sourceMapConsumerMs: number;
  /** Time for parser.parse() */
  parseMs: number;
  /** Time to find JSX elements + check existing attributes */
  traversalMs: number;
  /** End-to-end transform time (separate measurement) */
  totalTransformMs: number;
}

/**
 * Element counts for a single file
 */
export interface FileCounts {
  /** JSX elements found by parser */
  elementsFound: number;
  /** Elements actually injected (after filtering) */
  elementsInjected: number;
}

/**
 * Complete metrics for a single file transform
 */
export interface FileMetrics {
  /** Source file path */
  file: string;
  /** Timing breakdown */
  timings: FileTimings;
  /** Element counts */
  counts: FileCounts;
}

/**
 * Metrics returned by injector
 */
export interface InjectorMetrics {
  /** Time for parser.parse() */
  parseMs: number;
  /** Time for AST traversal and element finding */
  traversalMs: number;
  /** Elements found by parser */
  elementsFound: number;
  /** Elements injected (after filtering) */
  elementsInjected: number;
}

/**
 * Aggregate timing breakdown across all files
 */
export interface AggregateTimingBreakdown {
  sourceMapConsumerMs: number;
  parseMs: number;
  traversalMs: number;
}

/**
 * Aggregate metrics computed from all file transforms
 */
export interface AggregateMetrics {
  filesTransformed: number;
  elementsFound: number;
  elementsInjected: number;
  totalTimeMs: number;
  avgTimePerFileMs: number;
  p50Ms: number;
  p95Ms: number;
  p99Ms: number;
  breakdown: AggregateTimingBreakdown;
}

// ===========================================
// Injector types
// ===========================================

/**
 * Result of the injection operation
 */
export interface InjectorResult {
  /** Transformed source code with `data-ds` attributes injected */
  code: string;
  /** Source map for the transformation (magic-string format) */
  map: ReturnType<MagicString['generateMap']> | null;
  /** List of manifest entries for injected elements */
  manifestEntries: ManifestEntry[];
  /** Timing and count metrics from the injection */
  metrics: InjectorMetrics;
}
