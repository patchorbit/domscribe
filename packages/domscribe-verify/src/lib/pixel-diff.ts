/**
 * Pixel-diff comparator lifted from the RFC 0001 falsifier harness in
 * `@domscribe/test-fixtures`. Kept identical here so CI and the live relay
 * grade post-edit captures against pre-edit baselines through one
 * implementation.
 *
 * The harness retains its driver (Playwright + Vite preview) — this module
 * is the inner comparator only, so we can run it from a Node process that
 * already has the screenshot bytes in hand (e.g. when the relay receives
 * them from the browser overlay).
 *
 * Tolerances are the same constants used in the falsifier:
 *   PER_PIXEL_THRESHOLD = 0.1 — pixelmatch's per-pixel color distance
 *   MAX_DIFF_RATIO      = 0.001 — 0.1% of total pixels may differ before
 *                                 we call the verdict a fail
 *
 * @module @domscribe/verify/pixel-diff
 */

import pixelmatch from 'pixelmatch';
import { PNG } from 'pngjs';

export const PER_PIXEL_THRESHOLD = 0.1;
export const MAX_DIFF_RATIO = 0.001;

export interface PixelDiffResult {
  diffPixels: number;
  pixelDiffRatio: number;
  withinTolerance: boolean;
}

/**
 * Decode a PNG buffer. Surfaces as a thin helper so callers can substitute
 * in a different encoding later without touching the comparator.
 */
function decode(buf: Buffer): PNG {
  return PNG.sync.read(buf);
}

/**
 * Compute the pixel-diff between two PNG buffers using pixelmatch with the
 * harness's stable tolerances.
 *
 * If the dimensions differ we treat the entire image as a diff — there is
 * no useful per-pixel comparison when the element changed size.
 */
export function diffPng(beforePng: Buffer, afterPng: Buffer): PixelDiffResult {
  const a = decode(beforePng);
  const b = decode(afterPng);

  if (a.width !== b.width || a.height !== b.height) {
    const diffPixels = Math.max(a.width * a.height, b.width * b.height);
    return {
      diffPixels,
      pixelDiffRatio: 1,
      withinTolerance: false,
    };
  }

  const out = new PNG({ width: a.width, height: a.height });
  const diffPixels = pixelmatch(a.data, b.data, out.data, a.width, a.height, {
    threshold: PER_PIXEL_THRESHOLD,
  });
  const total = a.width * a.height;
  const pixelDiffRatio = total === 0 ? 0 : diffPixels / total;

  return {
    diffPixels,
    pixelDiffRatio,
    withinTolerance: pixelDiffRatio <= MAX_DIFF_RATIO,
  };
}
