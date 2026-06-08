import { describe, it, expect } from 'vitest';
import { PNG } from 'pngjs';
import { compare } from './comparator.js';

function solidPng(
  width: number,
  height: number,
  rgba: [number, number, number, number],
): Buffer {
  const png = new PNG({ width, height });
  for (let i = 0; i < png.data.length; i += 4) {
    png.data[i] = rgba[0];
    png.data[i + 1] = rgba[1];
    png.data[i + 2] = rgba[2];
    png.data[i + 3] = rgba[3];
  }
  return PNG.sync.write(png);
}

const annotationId = 'ann_A7bCd9Ef_1700000000000';

describe('compare', () => {
  it('returns no_change when every axis matches', () => {
    const buf = solidPng(8, 8, [255, 255, 255, 255]);
    const result = compare({
      annotationId,
      beforeScreenshot: buf,
      afterScreenshot: buf,
      beforeStyles: { computed: { color: 'rgb(0, 0, 0)' } },
      afterStyles: { computed: { color: 'rgb(0, 0, 0)' } },
    });
    expect(result.verdict).toBe('no_change');
    expect(result.pixelDiffRatio).toBe(0);
    expect(result.componentStylesDelta).toEqual({});
  });

  it('returns regression when pixel, style, and rect all disagree', () => {
    const before = solidPng(8, 8, [255, 255, 255, 255]);
    const after = solidPng(8, 8, [0, 0, 0, 255]);
    const result = compare({
      annotationId,
      beforeScreenshot: before,
      afterScreenshot: after,
      beforeStyles: { computed: { color: 'red' } },
      afterStyles: { computed: { color: 'blue' } },
      beforeRect: {
        x: 0,
        y: 0,
        width: 100,
        height: 50,
        top: 0,
        right: 100,
        bottom: 50,
        left: 0,
      },
      afterRect: {
        x: 0,
        y: 0,
        width: 120,
        height: 50,
        top: 0,
        right: 120,
        bottom: 50,
        left: 0,
      },
    });
    expect(result.verdict).toBe('regression');
    expect(result.pixelDiffRatio).toBeGreaterThan(0);
    expect(result.componentStylesDelta.color).toEqual(['red', 'blue']);
    expect(result.boundingRectDelta.width).toEqual([100, 120]);
  });

  it('returns partial when only one axis differs', () => {
    const buf = solidPng(8, 8, [255, 255, 255, 255]);
    const result = compare({
      annotationId,
      beforeScreenshot: buf,
      afterScreenshot: buf,
      beforeStyles: { computed: { color: 'red' } },
      afterStyles: { computed: { color: 'blue' } },
    });
    expect(result.verdict).toBe('partial');
  });

  it('passes screenshotRef through without inlining bytes anywhere in the result', () => {
    const buf = solidPng(8, 8, [255, 255, 255, 255]);
    const result = compare({
      annotationId,
      beforeScreenshot: buf,
      afterScreenshot: buf,
      screenshotRef: 'blob://post-edit/abc123',
    });
    expect(result.screenshotRef).toBe('blob://post-edit/abc123');
    const serialized = JSON.stringify(result);
    // Screenshot bytes (~hundreds of bytes for an 8x8 PNG) must never
    // appear in the serialized VerifyResult.
    expect(serialized.length).toBeLessThan(1024);
    expect(serialized).not.toContain('base64');
    expect(serialized).not.toContain('PNG');
  });

  it('stamps capturedAt as an ISO 8601 string', () => {
    const buf = solidPng(8, 8, [255, 255, 255, 255]);
    const result = compare({
      annotationId,
      beforeScreenshot: buf,
      afterScreenshot: buf,
    });
    expect(() => new Date(result.capturedAt).toISOString()).not.toThrow();
  });

  it('marks the verdict as changed when the element resized between captures', () => {
    const before = solidPng(8, 8, [255, 255, 255, 255]);
    const after = solidPng(12, 12, [255, 255, 255, 255]);
    const result = compare({
      annotationId,
      beforeScreenshot: before,
      afterScreenshot: after,
    });
    expect(result.pixelDiffRatio).toBe(1);
    expect(result.verdict).not.toBe('no_change');
  });

  it('honors an injected capturedAt for deterministic snapshots', () => {
    const buf = solidPng(8, 8, [255, 255, 255, 255]);
    const result = compare({
      annotationId,
      beforeScreenshot: buf,
      afterScreenshot: buf,
      capturedAt: '2025-01-01T00:00:00.000Z',
    });
    expect(result.capturedAt).toBe('2025-01-01T00:00:00.000Z');
  });
});
