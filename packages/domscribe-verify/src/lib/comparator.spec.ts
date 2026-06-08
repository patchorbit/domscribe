/**
 * Unit tests for the visual-snapshot comparator.
 *
 * The comparator is the only behaviour @domscribe/verify owns; these tests
 * pin the contract the RFC 0001 falsifier and (future) RFC 0002
 * verify_after_edit MCP tool depend on.
 */

import { describe, it, expect } from 'vitest';
import { PNG } from 'pngjs';
import {
  MAX_DIFF_RATIO,
  PER_PIXEL_THRESHOLD,
  compareScreenshots,
  diff,
  loadPng,
} from './comparator.js';

function makePng(
  width: number,
  height: number,
  fill: [number, number, number, number],
): Buffer {
  const png = new PNG({ width, height });
  for (let i = 0; i < png.data.length; i += 4) {
    png.data[i] = fill[0];
    png.data[i + 1] = fill[1];
    png.data[i + 2] = fill[2];
    png.data[i + 3] = fill[3];
  }
  return PNG.sync.write(png);
}

function paintRect(
  buf: Buffer,
  rect: { x: number; y: number; w: number; h: number },
  rgba: [number, number, number, number],
): Buffer {
  const png = PNG.sync.read(buf);
  for (let y = rect.y; y < rect.y + rect.h; y++) {
    for (let x = rect.x; x < rect.x + rect.w; x++) {
      const i = (y * png.width + x) * 4;
      png.data[i] = rgba[0];
      png.data[i + 1] = rgba[1];
      png.data[i + 2] = rgba[2];
      png.data[i + 3] = rgba[3];
    }
  }
  return PNG.sync.write(png);
}

describe('comparator constants', () => {
  it('keeps the falsifier defaults (PER_PIXEL_THRESHOLD = 0.1, MAX_DIFF_RATIO = 0.001)', () => {
    // These defaults are load-bearing: every committed RFC 0001 baseline
    // was recorded against them. Bumping them silently would shift CI
    // verdicts on already-merged fixture annotations.
    expect(PER_PIXEL_THRESHOLD).toBe(0.1);
    expect(MAX_DIFF_RATIO).toBe(0.001);
  });
});

describe('diff', () => {
  it('returns zero diff for two pixel-identical PNGs', () => {
    const a = loadPng(makePng(20, 20, [255, 0, 0, 255]));
    const b = loadPng(makePng(20, 20, [255, 0, 0, 255]));
    expect(diff(a, b)).toEqual({ diffPixels: 0, ratio: 0 });
  });

  it('reports a small ratio for a localised pixel change', () => {
    const baseline = makePng(20, 20, [255, 255, 255, 255]);
    const altered = paintRect(
      baseline,
      { x: 0, y: 0, w: 2, h: 2 },
      [0, 0, 0, 255],
    );
    const result = diff(loadPng(altered), loadPng(baseline));
    // 4 changed pixels out of 400 = 1% — well above MAX_DIFF_RATIO.
    expect(result.diffPixels).toBe(4);
    expect(result.ratio).toBeCloseTo(0.01, 5);
  });

  it('short-circuits to ratio = 1 on dimension mismatch (no throw)', () => {
    const a = loadPng(makePng(10, 10, [0, 0, 0, 255]));
    const b = loadPng(makePng(20, 20, [0, 0, 0, 255]));
    expect(diff(a, b)).toEqual({ diffPixels: 100, ratio: 1 });
  });
});

describe('compareScreenshots', () => {
  it('passes when actual equals baseline', () => {
    const buf = makePng(20, 20, [10, 20, 30, 255]);
    const result = compareScreenshots(buf, buf);
    expect(result.passed).toBe(true);
    expect(result.ratio).toBe(0);
  });

  it('fails when the change exceeds the default tolerance', () => {
    const baseline = makePng(20, 20, [255, 255, 255, 255]);
    const altered = paintRect(
      baseline,
      { x: 0, y: 0, w: 4, h: 4 },
      [0, 0, 0, 255],
    );
    const result = compareScreenshots(altered, baseline);
    // 16/400 = 4%, well above 0.1% tolerance.
    expect(result.passed).toBe(false);
  });

  it('honours a custom maxDiffRatio override', () => {
    const baseline = makePng(40, 40, [255, 255, 255, 255]);
    // Change 4 pixels out of 1600 = 0.25%. Default tolerance (0.1%) fails;
    // a relaxed 1% tolerance passes.
    const altered = paintRect(
      baseline,
      { x: 0, y: 0, w: 2, h: 2 },
      [0, 0, 0, 255],
    );
    expect(compareScreenshots(altered, baseline).passed).toBe(false);
    expect(
      compareScreenshots(altered, baseline, { maxDiffRatio: 0.01 }).passed,
    ).toBe(true);
  });
});
