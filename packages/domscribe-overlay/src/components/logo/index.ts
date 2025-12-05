/**
 * Logo module - Single source of truth for Domscribe logo
 *
 * @example
 * ```ts
 * import { logoSvg } from './logo/index.js';
 *
 * // In render():
 * ${logoSvg({ size: 24 })}
 * ```
 */

export { logoSvg, type LogoOptions, type LogoVariant } from './logo-svg.js';
export {
  CURSOR_PATH,
  CLICK_LINE_PATH,
  SPARKLE_PATHS,
  SIMPLIFIED,
  FULL,
  SIMPLIFIED_THRESHOLD,
  DEFAULT_COLOR,
} from './logo-paths.js';
