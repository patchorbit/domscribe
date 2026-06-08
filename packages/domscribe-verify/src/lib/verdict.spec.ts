import { describe, it, expect } from 'vitest';
import { composeReason, deriveVerdict } from './verdict.js';

const matchingPixel = {
  diffPixels: 0,
  pixelDiffRatio: 0,
  withinTolerance: true,
};
const drifted = {
  diffPixels: 4000,
  pixelDiffRatio: 0.02,
  withinTolerance: false,
};

describe('deriveVerdict', () => {
  it('emits no_change when every axis matches', () => {
    expect(
      deriveVerdict({
        pixelDiff: matchingPixel,
        componentStylesDelta: {},
        boundingRectDelta: {},
      }),
    ).toBe('no_change');
  });

  it('emits regression when every axis disagrees with the baseline', () => {
    expect(
      deriveVerdict({
        pixelDiff: drifted,
        componentStylesDelta: { color: ['red', 'blue'] },
        boundingRectDelta: { width: [100, 120] },
      }),
    ).toBe('regression');
  });

  it('emits partial when only some axes changed', () => {
    expect(
      deriveVerdict({
        pixelDiff: drifted,
        componentStylesDelta: {},
        boundingRectDelta: {},
      }),
    ).toBe('partial');
    expect(
      deriveVerdict({
        pixelDiff: matchingPixel,
        componentStylesDelta: { color: ['red', 'blue'] },
        boundingRectDelta: {},
      }),
    ).toBe('partial');
  });
});

describe('composeReason', () => {
  it('returns an explanation for the no_change verdict', () => {
    const reason = composeReason('no_change', {
      pixelDiff: matchingPixel,
      componentStylesDelta: {},
      boundingRectDelta: {},
    });
    expect(reason).toMatch(/did not land/i);
  });

  it('summarises the axes that drifted for partial / regression verdicts', () => {
    const reason = composeReason('regression', {
      pixelDiff: drifted,
      componentStylesDelta: { color: ['red', 'blue'] },
      boundingRectDelta: { width: [100, 120] },
    });
    expect(reason).toContain('pixel-diff');
    expect(reason).toContain('CSS');
    expect(reason).toContain('boundingRect');
  });

  it('omits axes with no delta from the summary', () => {
    const reason = composeReason('partial', {
      pixelDiff: matchingPixel,
      componentStylesDelta: { color: ['red', 'blue'] },
      boundingRectDelta: {},
    });
    expect(reason).not.toContain('pixel-diff');
    expect(reason).not.toContain('boundingRect');
    expect(reason).toContain('1 CSS property changed');
  });
});
