/**
 * Logo SVG path data - SOURCE OF TRUTH
 *
 * Extracted from logo-assets.html. If the brand changes,
 * update these constants and all usages will update automatically.
 *
 * Design rules:
 * - Simplified (cursor only): rendered size ≤ 24px
 * - Full detail (cursor + click line + sparkles): rendered size ≥ 32px
 */

/**
 * Cursor pointer path (used in mask as cutout)
 */
export const CURSOR_PATH = 'M15 15l-2 5L9 9l11 4-5 2z';

/**
 * Click line path (diagonal line from cursor tip)
 */
export const CLICK_LINE_PATH = 'M15 15l5 5';

/**
 * Sparkle paths (4 sparkle lines around cursor)
 */
export const SPARKLE_PATHS =
  'M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122';

/**
 * Simplified variant - cursor only, larger cursor for small sizes
 * Use for rendered sizes ≤ 24px
 */
export const SIMPLIFIED = {
  /** D shape path - slightly different bounds for small sizes */
  dPath: 'M4 2H38C56 2 64 16 64 32C64 48 56 62 38 62H4V2Z',
  /** Transform to apply to cursor group - larger, centered in D */
  cursorTransform: 'translate(-6, -6) scale(2.75)',
  /** Stroke width for mask elements */
  strokeWidth: 2,
} as const;

/**
 * Full detail variant - cursor + click line + sparkles
 * Use for rendered sizes ≥ 32px
 */
export const FULL = {
  /** D shape path - standard bounds */
  dPath: 'M6 4H36C54 4 62 18 62 32C62 46 54 60 36 60H6V4Z',
  /** Transform to apply to cursor group - smaller, centered */
  cursorTransform: 'translate(12, 10) scale(1.6)',
  /** Stroke width for mask elements */
  strokeWidth: 2,
} as const;

/**
 * Size threshold for variant selection
 * Sizes <= this use simplified, sizes > this use full
 */
export const SIMPLIFIED_THRESHOLD = 24;

/**
 * Default brand color
 */
export const DEFAULT_COLOR = '#06b6d4';
