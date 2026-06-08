import { describe, it, expect } from 'vitest';
import {
  computeBoundingRectDelta,
  computeComponentStylesDelta,
} from './style-delta.js';

describe('computeComponentStylesDelta', () => {
  it('emits an empty delta when before and after are identical', () => {
    const delta = computeComponentStylesDelta(
      { computed: { color: 'rgb(0, 0, 0)' } },
      { computed: { color: 'rgb(0, 0, 0)' } },
    );
    expect(delta).toEqual({});
  });

  it('emits [before, after] pairs only for changed properties', () => {
    const delta = computeComponentStylesDelta(
      {
        computed: {
          color: 'rgb(0, 0, 0)',
          'font-size': '16px',
          padding: '8px',
        },
      },
      {
        computed: {
          color: 'rgb(0, 0, 0)',
          'font-size': '18px',
          padding: '8px',
        },
      },
    );
    expect(delta).toEqual({ 'font-size': ['16px', '18px'] });
  });

  it('records appearance / disappearance with empty-string sentinel', () => {
    const delta = computeComponentStylesDelta(
      { computed: { 'box-shadow': 'none' } },
      { computed: { color: 'red' } },
    );
    expect(delta).toEqual({
      'box-shadow': ['none', ''],
      color: ['', 'red'],
    });
  });

  it('merges customProperties into the same delta map', () => {
    const delta = computeComponentStylesDelta(
      {
        computed: { color: 'rgb(15, 23, 42)' },
        customProperties: { '--color-fg': 'rgb(15, 23, 42)' },
      },
      {
        computed: { color: 'rgb(15, 23, 42)' },
        customProperties: { '--color-fg': 'rgb(255, 255, 255)' },
      },
    );
    expect(delta).toEqual({
      '--color-fg': ['rgb(15, 23, 42)', 'rgb(255, 255, 255)'],
    });
  });

  it('treats undefined inputs as empty (no spurious deltas)', () => {
    expect(computeComponentStylesDelta(undefined, undefined)).toEqual({});
    expect(
      computeComponentStylesDelta(undefined, { computed: { color: 'red' } }),
    ).toEqual({ color: ['', 'red'] });
  });
});

describe('computeBoundingRectDelta', () => {
  const baseRect = {
    x: 10,
    y: 20,
    width: 100,
    height: 50,
    top: 20,
    right: 110,
    bottom: 70,
    left: 10,
  };

  it('returns an empty delta when rects are identical', () => {
    expect(computeBoundingRectDelta(baseRect, baseRect)).toEqual({});
  });

  it('returns an empty delta when both rects are absent', () => {
    expect(computeBoundingRectDelta(undefined, undefined)).toEqual({});
  });

  it('records changes on axes that moved beyond the sub-pixel tolerance', () => {
    const after = { ...baseRect, width: 120, right: 130 };
    expect(computeBoundingRectDelta(baseRect, after)).toEqual({
      width: [100, 120],
      right: [110, 130],
    });
  });

  it('absorbs sub-pixel jitter (<=0.5px) on any single axis', () => {
    const after = { ...baseRect, x: 10.4 };
    expect(computeBoundingRectDelta(baseRect, after)).toEqual({});
  });
});
