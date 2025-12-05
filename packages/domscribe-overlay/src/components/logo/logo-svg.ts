/**
 * Logo SVG generator
 *
 * Generates SVG markup with unique mask IDs to avoid conflicts
 * when multiple logos are rendered on the same page.
 */

import { html, svg, type TemplateResult } from 'lit';
import {
  CURSOR_PATH,
  CLICK_LINE_PATH,
  SPARKLE_PATHS,
  SIMPLIFIED,
  FULL,
  SIMPLIFIED_THRESHOLD,
} from './logo-paths.js';

/**
 * Counter for generating unique mask IDs
 */
let instanceCounter = 0;

/**
 * Logo variant type
 */
export type LogoVariant = 'simplified' | 'full' | 'auto';

/**
 * Options for logoSvg function
 */
export interface LogoOptions {
  /**
   * Rendered size in pixels (width and height)
   * Used for both dimensions and auto variant selection
   */
  size: number;

  /**
   * Fill color for the logo
   * @default 'var(--ds-brand-primary)' for theme integration
   */
  color?: string;

  /**
   * CSS class to apply to the SVG element
   */
  className?: string;

  /**
   * Force a specific variant instead of auto-selecting based on size
   * - 'simplified': cursor only (better for small sizes)
   * - 'full': cursor + click line + sparkles
   * - 'auto': select based on size threshold (default)
   */
  variant?: LogoVariant;
}

/**
 * Generate the mask content for simplified variant (cursor only)
 */
function simplifiedMask(maskId: string): TemplateResult {
  return svg`
    <mask id="${maskId}">
      <rect width="64" height="64" fill="white" />
      <g transform="${SIMPLIFIED.cursorTransform}">
        <path d="${CURSOR_PATH}" fill="black" />
      </g>
    </mask>
  `;
}

/**
 * Generate the mask content for full variant (cursor + sparkles)
 */
function fullMask(maskId: string): TemplateResult {
  return svg`
    <mask id="${maskId}">
      <rect width="64" height="64" fill="white" />
      <g transform="${FULL.cursorTransform}">
        <path d="${CURSOR_PATH}" fill="black" />
        <path
          d="${CLICK_LINE_PATH}"
          stroke="black"
          stroke-width="${FULL.strokeWidth}"
          stroke-linecap="round"
        />
        <path
          d="${SPARKLE_PATHS}"
          stroke="black"
          stroke-width="${FULL.strokeWidth}"
          stroke-linecap="round"
        />
      </g>
    </mask>
  `;
}

/**
 * Generate a Domscribe logo SVG
 *
 * @example
 * ```ts
 * // In a Lit component render method:
 * render() {
 *   return html`
 *     <div class="brand">
 *       ${logoSvg({ size: 24 })}
 *       <span>domscribe</span>
 *     </div>
 *   `;
 * }
 * ```
 *
 * @example
 * ```ts
 * // Force full variant at small size:
 * ${logoSvg({ size: 24, variant: 'full' })}
 *
 * // Custom color:
 * ${logoSvg({ size: 32, color: '#fafafa' })}
 * ```
 */
export function logoSvg(options: LogoOptions): TemplateResult {
  const {
    size,
    color = 'var(--ds-brand-primary)',
    className,
    variant = 'auto',
  } = options;

  // Generate unique mask ID for this instance
  const maskId = `ds-logo-mask-${++instanceCounter}`;

  // Determine which variant to use
  const useSimplified =
    variant === 'simplified' ||
    (variant === 'auto' && size <= SIMPLIFIED_THRESHOLD);

  // Select paths and mask based on variant
  const dPath = useSimplified ? SIMPLIFIED.dPath : FULL.dPath;
  const maskContent = useSimplified ? simplifiedMask(maskId) : fullMask(maskId);

  return html`
    <svg
      width="${size}"
      height="${size}"
      viewBox="0 0 64 64"
      fill="none"
      class="${className || ''}"
      aria-hidden="true"
    >
      <defs>${maskContent}</defs>
      <path d="${dPath}" fill="${color}" mask="url(#${maskId})" />
    </svg>
  `;
}

/**
 * Reset the instance counter (useful for testing)
 * @internal
 */
export function _resetInstanceCounter(): void {
  instanceCounter = 0;
}
