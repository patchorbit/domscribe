/**
 * @domscribe/verify - Pure-TS visual-snapshot comparator for Domscribe.
 *
 * Originally lifted verbatim from the RFC 0001 falsifier harness in
 * `@domscribe/test-fixtures`; productized as a standalone package so the
 * harness, the relay (RFC 0002 `verify_after_edit` MCP tool), and any
 * downstream CI consumer share one implementation.
 *
 * @module @domscribe/verify
 */

export {
  MAX_DIFF_RATIO,
  PER_PIXEL_THRESHOLD,
  compareScreenshots,
  diff,
  loadPng,
} from './lib/comparator.js';
export type { DiffResult } from './lib/comparator.js';
