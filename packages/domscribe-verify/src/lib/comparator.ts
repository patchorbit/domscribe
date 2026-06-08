/**
 * Top-level comparator — combines pixel-diff, style-delta, and verdict
 * derivation into a single `VerifyResult` constructor.
 *
 * The comparator is intentionally I/O-free: the caller supplies decoded
 * PNG buffers and computed-style snapshots. The relay's verify_after_edit
 * handler is responsible for fetching the post-edit screenshot blob and
 * passing its bytes here.
 *
 * @module @domscribe/verify/comparator
 */

import type {
  AnnotationId,
  BoundingRect,
  ComponentStyles,
  VerifyResult,
} from '@domscribe/core';
import { diffPng } from './pixel-diff.js';
import {
  computeBoundingRectDelta,
  computeComponentStylesDelta,
} from './style-delta.js';
import { composeReason, deriveVerdict } from './verdict.js';

export interface CapturePair {
  annotationId: AnnotationId;
  beforeScreenshot?: Buffer;
  afterScreenshot?: Buffer;
  beforeStyles?: ComponentStyles;
  afterStyles?: ComponentStyles;
  beforeRect?: BoundingRect;
  afterRect?: BoundingRect;
  /**
   * Opaque relay-blob reference for the post-edit screenshot. The
   * comparator never inlines bytes into the result — the caller passes
   * the reference through so the agent can fetch the image if it needs to.
   */
  screenshotRef?: string;
  /**
   * Optional override for the `capturedAt` timestamp; defaults to "now".
   * Mostly useful in tests so snapshots are deterministic.
   */
  capturedAt?: string;
}

/**
 * Run the comparator and return a `VerifyResult`. When either screenshot
 * buffer is absent the pixel-diff axis silently records 0 — the caller
 * (typically the relay's verify_after_edit handler) is expected to refuse
 * the request if no post-edit capture is available.
 */
export function compare(pair: CapturePair): VerifyResult {
  const pixelDiff =
    pair.beforeScreenshot && pair.afterScreenshot
      ? diffPng(pair.beforeScreenshot, pair.afterScreenshot)
      : { diffPixels: 0, pixelDiffRatio: 0, withinTolerance: true };

  const componentStylesDelta = computeComponentStylesDelta(
    pair.beforeStyles,
    pair.afterStyles,
  );
  const boundingRectDelta = computeBoundingRectDelta(
    pair.beforeRect,
    pair.afterRect,
  );

  const verdict = deriveVerdict({
    pixelDiff,
    componentStylesDelta,
    boundingRectDelta,
  });

  return {
    annotationId: pair.annotationId,
    verdict,
    pixelDiffRatio: pixelDiff.pixelDiffRatio,
    pixelDiffPixels: pixelDiff.diffPixels,
    componentStylesDelta,
    boundingRectDelta,
    screenshotRef: pair.screenshotRef,
    capturedAt: pair.capturedAt ?? new Date().toISOString(),
    reason: composeReason(verdict, {
      pixelDiff,
      componentStylesDelta,
      boundingRectDelta,
    }),
  };
}
