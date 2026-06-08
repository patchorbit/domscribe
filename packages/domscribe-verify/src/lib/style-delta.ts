/**
 * Style and bounding-rect delta computation for VerifyResult.
 *
 * Pure functions — no I/O, no DOM. Consumed by both the CI falsifier
 * harness and the relay's verify_after_edit handler so the verdict
 * semantics live in exactly one place.
 *
 * @module @domscribe/verify/style-delta
 */

import type {
  BoundingRect,
  BoundingRectDelta,
  ComponentStyles,
  ComponentStylesDelta,
} from '@domscribe/core';

/**
 * Per-coordinate tolerance for boundingRect (pixels). Sub-pixel deltas are
 * indistinguishable visually; treating them as "changed" would inflate the
 * partial-verdict rate on browsers that report `getBoundingClientRect`
 * coordinates as fractional even when the layout hasn't actually moved.
 */
const BOUNDING_RECT_TOLERANCE_PX = 0.5;

/**
 * Compute the per-CSS-property delta between two `ComponentStyles` snapshots.
 *
 * Only entries that actually changed (or appeared / disappeared) are
 * included. Custom properties (`--*`) are merged into the same delta map
 * so the agent sees a single shape regardless of where a token-vs-value
 * change originated.
 */
export function computeComponentStylesDelta(
  before: ComponentStyles | undefined,
  after: ComponentStyles | undefined,
): ComponentStylesDelta {
  const delta: Record<string, [string, string]> = {};

  const beforeComputed = before?.computed ?? {};
  const afterComputed = after?.computed ?? {};
  const beforeCustom = before?.customProperties ?? {};
  const afterCustom = after?.customProperties ?? {};

  diffStringMap(beforeComputed, afterComputed, delta);
  diffStringMap(beforeCustom, afterCustom, delta);

  return delta;
}

function diffStringMap(
  before: Record<string, string>,
  after: Record<string, string>,
  out: Record<string, [string, string]>,
): void {
  const keys = new Set<string>([...Object.keys(before), ...Object.keys(after)]);
  for (const key of keys) {
    const a = before[key] ?? '';
    const b = after[key] ?? '';
    if (a !== b) {
      out[key] = [a, b];
    }
  }
}

/**
 * Compute the per-axis delta between two boundingRects, with sub-pixel
 * tolerance to absorb the fractional values browsers can produce even on
 * a layout that didn't actually shift.
 */
export function computeBoundingRectDelta(
  before: BoundingRect | undefined,
  after: BoundingRect | undefined,
): BoundingRectDelta {
  if (!before || !after) {
    return {};
  }
  const axes: (keyof BoundingRect)[] = [
    'x',
    'y',
    'width',
    'height',
    'top',
    'right',
    'bottom',
    'left',
  ];
  const delta: BoundingRectDelta = {};
  for (const axis of axes) {
    const a = before[axis];
    const b = after[axis];
    if (Math.abs(a - b) > BOUNDING_RECT_TOLERANCE_PX) {
      delta[axis] = [a, b];
    }
  }
  return delta;
}
