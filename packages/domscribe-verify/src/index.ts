/**
 * @domscribe/verify - Comparator for the verify_after_edit MCP tool.
 *
 * Lifts the pixel-diff comparator from the RFC 0001 falsifier harness and
 * adds componentStyles + boundingRect delta computation plus a three-axis
 * verdict derivation. Pure-TS, Node-friendly, no DOM dependency.
 *
 * @module @domscribe/verify
 */

export { compare } from './lib/comparator.js';
export type { CapturePair } from './lib/comparator.js';
export {
  diffPng,
  PER_PIXEL_THRESHOLD,
  MAX_DIFF_RATIO,
} from './lib/pixel-diff.js';
export type { PixelDiffResult } from './lib/pixel-diff.js';
export {
  computeComponentStylesDelta,
  computeBoundingRectDelta,
} from './lib/style-delta.js';
export { deriveVerdict, composeReason } from './lib/verdict.js';
export type { VerdictInputs } from './lib/verdict.js';
