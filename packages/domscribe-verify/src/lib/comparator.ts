/**
 * Pixel-diff comparator. Lifted verbatim from the RFC 0001 falsifier
 * harness in `@domscribe/test-fixtures` (originally
 * `styling/scripts/falsifier.ts`).
 *
 * The numeric defaults (`PER_PIXEL_THRESHOLD`, `MAX_DIFF_RATIO`) and the
 * `loadPng` / `diff` semantics are unchanged so the existing styling-
 * fixture baselines stay valid and CI behaviour does not shift on this
 * package lift.
 *
 * @module @domscribe/verify/lib/comparator
 */

import pixelmatch from 'pixelmatch';
import { PNG } from 'pngjs';

/**
 * Pixel-diff tolerance.
 *
 *   PER_PIXEL_THRESHOLD — pixelmatch's `threshold` (color distance per
 *   pixel below which two pixels are considered equal). 0.1 is the
 *   library's recommended starting point; we keep it modest so the
 *   harness catches real visual deltas but tolerates AA jitter.
 *
 *   MAX_DIFF_RATIO — the fraction of total pixels that may differ before
 *   we call the annotation a fail. The canonical-after path diffs at 0,
 *   so this is a defensive floor for CI worker AA jitter on text glyphs.
 *   0.1% (0.001) is tight enough that two images that happen to share
 *   a mostly-white background (a real false-positive risk we observed in
 *   sanity testing) cannot slip through, while still absorbing a few
 *   pixels of subpixel font rendering noise.
 */
export const PER_PIXEL_THRESHOLD = 0.1;
export const MAX_DIFF_RATIO = 0.001;

/**
 * Decode a PNG buffer into a `PNG` instance. Thin wrapper kept exported so
 * callers can pre-decode and reuse the structure across multiple diffs.
 */
export function loadPng(buf: Buffer): PNG {
  return PNG.sync.read(buf);
}

/**
 * Result of comparing two decoded PNGs.
 *
 * `diffPixels` is the absolute count of pixels that exceed
 * `PER_PIXEL_THRESHOLD`; `ratio` is `diffPixels / totalPixels` in `[0, 1]`.
 *
 * When the two PNGs have different dimensions the comparator returns
 * `ratio = 1` and `diffPixels = a.width * a.height` — i.e. "everything
 * differs," matching the falsifier's existing behaviour.
 */
export interface DiffResult {
  diffPixels: number;
  ratio: number;
}

/**
 * Pixel-diff two decoded PNGs using `pixelmatch` with `PER_PIXEL_THRESHOLD`.
 *
 * Dimension-mismatched images short-circuit to `ratio = 1` rather than
 * throwing, so a baseline-vs-agent-screenshot size mismatch reports as a
 * failed verify rather than crashing the harness or the relay tool.
 */
export function diff(a: PNG, b: PNG): DiffResult {
  if (a.width !== b.width || a.height !== b.height) {
    return {
      diffPixels: a.width * a.height,
      ratio: 1,
    };
  }
  const out = new PNG({ width: a.width, height: a.height });
  const diffPixels = pixelmatch(a.data, b.data, out.data, a.width, a.height, {
    threshold: PER_PIXEL_THRESHOLD,
  });
  return {
    diffPixels,
    ratio: diffPixels / (a.width * a.height),
  };
}

/**
 * One-shot convenience for the common "compare two screenshots" call site.
 *
 * Decodes both buffers and runs `diff`. Use the lower-level `loadPng` +
 * `diff` pair when the same baseline is compared against many candidates.
 *
 * Returns the `DiffResult` plus a `passed` flag against the package-default
 * `MAX_DIFF_RATIO`. Pass a stricter `maxDiffRatio` (e.g. `0.0001`) to the
 * options to tighten on a per-call basis — e.g. the RFC 0002 retry round
 * documents a tighter tolerance than the first-attempt round.
 */
export function compareScreenshots(
  actual: Buffer,
  baseline: Buffer,
  options: { maxDiffRatio?: number } = {},
): DiffResult & { passed: boolean } {
  const maxDiffRatio = options.maxDiffRatio ?? MAX_DIFF_RATIO;
  const result = diff(loadPng(actual), loadPng(baseline));
  return {
    ...result,
    passed: result.ratio <= maxDiffRatio,
  };
}
