/**
 * Injector Performance Benchmark
 *
 * Measures per-file transform overhead by running the DomscribeInjector
 * directly on representative source files (.tsx, .vue).
 *
 * This is a unit benchmark of the transform layer, not an integration test.
 * It lives in domscribe-transform so it has no cross-package dependencies.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'fs';
import { join, extname, resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { InjectorRegistry } from './injector.registry.js';
import type { InjectorFileExtension } from './injector.registry.js';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Maximum acceptable average per-file transform time (ms) */
const MAX_AVG_PER_FILE_MS = 50;

/** Maximum acceptable p95 per-file transform time (ms) */
const MAX_P95_PER_FILE_MS = 100;

/** Number of iterations for the benchmark */
const TRANSFORM_ITERATIONS = 5;

const __dirname_resolved = dirname(fileURLToPath(import.meta.url));
const FIXTURES_DIR = resolve(__dirname_resolved, '__fixtures__');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const TRANSFORMABLE_EXTENSIONS = new Set(['.tsx', '.jsx', '.vue']);

interface SourceFile {
  path: string;
  content: string;
  extension: string;
}

/**
 * Collect all transformable source files from the __fixtures__ directory.
 */
function collectSourceFiles(dir: string): SourceFile[] {
  const files: SourceFile[] = [];

  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isFile()) {
      const ext = extname(full);
      if (TRANSFORMABLE_EXTENSIONS.has(ext)) {
        files.push({
          path: full,
          content: readFileSync(full, 'utf-8'),
          extension: ext.slice(1), // strip leading dot
        });
      }
    }
  }

  return files;
}

interface TransformTimingResult {
  fileCount: number;
  totalMs: number;
  avgMs: number;
  p50Ms: number;
  p95Ms: number;
  p99Ms: number;
  maxMs: number;
  perFileMs: number[];
}

/**
 * Run the DomscribeInjector on every source file and collect timing.
 */
async function measureTransformOverhead(
  sourceFiles: SourceFile[],
): Promise<TransformTimingResult> {
  const registry = new InjectorRegistry(FIXTURES_DIR);
  await registry.initialize();

  const perFileMs: number[] = [];

  for (const file of sourceFiles) {
    const ext = file.extension as InjectorFileExtension;
    const injector = await registry.getInjector(ext);

    const start = performance.now();
    injector.inject(file.content, { sourceFile: file.path });
    const elapsed = performance.now() - start;

    perFileMs.push(elapsed);
  }

  registry.close();

  const sorted = [...perFileMs].sort((a, b) => a - b);
  const totalMs = perFileMs.reduce((a, b) => a + b, 0);

  return {
    fileCount: perFileMs.length,
    totalMs,
    avgMs: perFileMs.length > 0 ? totalMs / perFileMs.length : 0,
    p50Ms: percentile(sorted, 50),
    p95Ms: percentile(sorted, 95),
    p99Ms: percentile(sorted, 99),
    maxMs: sorted.length > 0 ? sorted[sorted.length - 1] : 0,
    perFileMs,
  };
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, idx)];
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Injector Performance', () => {
  it('per-file transform time within budget', async () => {
    const sourceFiles = collectSourceFiles(FIXTURES_DIR);
    expect(
      sourceFiles.length,
      'No transformable source files found in __fixtures__',
    ).toBeGreaterThan(0);

    // Run multiple iterations, take the median to reduce noise.
    // First iteration is a warmup (JIT, parser init, caches).
    const iterationResults: TransformTimingResult[] = [];
    for (let i = 0; i < TRANSFORM_ITERATIONS; i++) {
      iterationResults.push(await measureTransformOverhead(sourceFiles));
    }

    // Drop first iteration (warmup), take median of the rest
    const steadyState = iterationResults.slice(1);
    const avgTimes = steadyState.map((r) => r.avgMs);
    const p95Times = steadyState.map((r) => r.p95Ms);
    const medianAvg = median(avgTimes);
    const medianP95 = median(p95Times);

    // Report
    const bestRun = steadyState.reduce((best, r) =>
      r.totalMs < best.totalMs ? r : best,
    );
    console.log(
      `[injector-bench] ${sourceFiles.length} files | ` +
        `avg=${medianAvg.toFixed(2)}ms | ` +
        `p50=${bestRun.p50Ms.toFixed(2)}ms | ` +
        `p95=${medianP95.toFixed(2)}ms | ` +
        `total=${bestRun.totalMs.toFixed(0)}ms`,
    );

    // Assert
    expect(
      medianAvg,
      `median avg per-file time ${medianAvg.toFixed(2)}ms exceeds ${MAX_AVG_PER_FILE_MS}ms`,
    ).toBeLessThan(MAX_AVG_PER_FILE_MS);

    expect(
      medianP95,
      `median p95 per-file time ${medianP95.toFixed(2)}ms exceeds ${MAX_P95_PER_FILE_MS}ms`,
    ).toBeLessThan(MAX_P95_PER_FILE_MS);
  }, 120_000);
});
