/**
 * StyleCapturer - Captures runtime computed styles and CSS custom properties
 *
 * Reads a fixed, bounded allowlist of computed CSS properties from the picked
 * element via `window.getComputedStyle()`, and resolves the `--*` custom
 * properties visible from the element through its ancestors up to `:root`.
 *
 * The allowlist (≤32 entries) is the runtime ground truth for "what the user
 * sees" — layout, spacing, typography, visual, positioning. The custom
 * properties are the runtime token boundary: the design system surfaces tokens
 * as `--*` vars, and capturing them is what lets an agent attribute a hex value
 * to a token (e.g. `color: rgb(15, 23, 42)` → `--color-fg`) without re-reading
 * the design-system config.
 *
 * Companion build-time `styleSource` attribution lives on `ManifestEntry` and
 * is a separate package's responsibility (`@domscribe/transform`).
 *
 * @module @domscribe/runtime/capture/style-capturer
 */

import type { ComponentStyles } from '@domscribe/core';
import type { CaptureResult } from './types.js';
import { ContextCaptureError } from '../errors/index.js';

/**
 * Bounded computed-property allowlist for runtime style capture (≤32 entries).
 *
 * Grouped by intent:
 *   - layout:       display, position, box-sizing
 *   - spacing:      margin/padding (4-side shorthands kept; the agent reads
 *                   the resolved per-side values from these — capturing all 16
 *                   would double the budget for marginal value)
 *   - typography:   font-family, font-size, font-weight, line-height,
 *                   letter-spacing, text-align, color
 *   - visual:       background-color, background-image, border, border-radius,
 *                   box-shadow, opacity
 *   - dimensions:   width, height
 *   - positioning:  top, right, bottom, left, z-index, transform
 *
 * Order is stable; CI snapshots of these strings must be deterministic.
 */
export const STYLE_CAPTURE_ALLOWLIST: readonly string[] = Object.freeze([
  'display',
  'position',
  'box-sizing',
  'margin',
  'padding',
  'width',
  'height',
  'top',
  'right',
  'bottom',
  'left',
  'z-index',
  'color',
  'background-color',
  'background-image',
  'font-family',
  'font-size',
  'font-weight',
  'line-height',
  'letter-spacing',
  'text-align',
  'border',
  'border-radius',
  'box-shadow',
  'opacity',
  'transform',
  'transition',
  'cursor',
  'flex',
  'gap',
  'grid-template-columns',
  'overflow',
]);

/**
 * Options for the StyleCapturer.
 */
export interface StyleCaptureOptions {
  /**
   * Computed-property allowlist override. Defaults to {@link STYLE_CAPTURE_ALLOWLIST}.
   *
   * If you pass a custom list, keep it ≤32 entries — the RFC's serialization
   * budget assumes that ceiling.
   */
  allowlist?: readonly string[];

  /**
   * Maximum number of `--*` CSS custom properties to surface.
   * @default 64
   */
  maxCustomProperties?: number;

  /**
   * Approximate maximum serialized bytes for the entire `ComponentStyles`
   * payload. The RFC's per-element budget is ≤4 KB. Captured strings beyond
   * this limit are dropped (rather than throwing) so a single oversize page
   * cannot poison a whole annotation.
   *
   * Set to 0 to disable the budget (not recommended).
   *
   * @default 4096
   */
  maxBytes?: number;

  /**
   * Enable debug logging.
   * @default false
   */
  debug?: boolean;
}

const DEFAULT_MAX_CUSTOM_PROPERTIES = 64;
const DEFAULT_MAX_BYTES = 4096;

/**
 * StyleCapturer class
 *
 * Captures a bounded snapshot of computed CSS properties and resolved CSS
 * custom properties for a single DOM element. Designed to be cheap enough to
 * run on every annotation: one `getComputedStyle()` call on the target, plus
 * one per ancestor while collecting `--*` vars (early-exits once the cap is
 * reached).
 */
export class StyleCapturer {
  private readonly allowlist: readonly string[];
  private readonly maxCustomProperties: number;
  private readonly maxBytes: number;
  private readonly debug: boolean;

  constructor(options: StyleCaptureOptions = {}) {
    this.allowlist = options.allowlist ?? STYLE_CAPTURE_ALLOWLIST;
    this.maxCustomProperties =
      options.maxCustomProperties ?? DEFAULT_MAX_CUSTOM_PROPERTIES;
    this.maxBytes = options.maxBytes ?? DEFAULT_MAX_BYTES;
    this.debug = options.debug ?? false;
  }

  /**
   * Capture styles for an element.
   *
   * Returns `CaptureResult<ComponentStyles>`. On failure (e.g. element
   * detached or no Window) the result is `{ success: false, error }` — the
   * caller decides whether to swallow or surface.
   */
  capture(element: HTMLElement): CaptureResult<ComponentStyles> {
    try {
      const ownerWindow = element.ownerDocument?.defaultView;
      if (!ownerWindow) {
        return {
          success: false,
          error: new ContextCaptureError(
            'StyleCapturer: element has no owner window — element may be detached or running outside a DOM',
          ),
        };
      }

      const computed = ownerWindow.getComputedStyle(element);
      const computedValues: Record<string, string> = {};
      for (const prop of this.allowlist) {
        const value = computed.getPropertyValue(prop);
        if (value !== '') {
          computedValues[prop] = value.trim();
        }
      }

      const customProperties = this.collectCustomProperties(
        element,
        ownerWindow,
      );

      const result: ComponentStyles = {};
      if (Object.keys(computedValues).length > 0) {
        result.computed = computedValues;
      }
      if (Object.keys(customProperties).length > 0) {
        result.customProperties = customProperties;
      }

      const trimmed = this.enforceBudget(result);

      if (this.debug) {
        console.log('[domscribe-runtime][style-capturer] Captured styles', {
          computedCount: Object.keys(trimmed.computed ?? {}).length,
          customPropCount: Object.keys(trimmed.customProperties ?? {}).length,
          approxBytes: this.approximateSize(trimmed),
        });
      }

      return { success: true, data: trimmed };
    } catch (error) {
      const err = new ContextCaptureError(
        'Failed to capture component styles',
        error instanceof Error ? error : undefined,
      );
      if (this.debug) {
        console.error('[domscribe-runtime][style-capturer]', err);
      }
      return { success: false, error: err };
    }
  }

  /**
   * Walk from the element to `:root` collecting `--*` custom properties.
   *
   * We collect from the leaf up so leaf-scoped overrides win — the resolved
   * value visible at the picked element is what the user actually sees.
   *
   * Early-exits once {@link maxCustomProperties} is reached. Token systems
   * that define hundreds of `--*` vars at `:root` (e.g. shadcn) would
   * otherwise blow through the 4 KB budget on tokens that are not even
   * relevant to the picked element.
   */
  private collectCustomProperties(
    element: HTMLElement,
    win: Window,
  ): Record<string, string> {
    const customProperties: Record<string, string> = {};
    let count = 0;

    let current: Element | null = element;
    while (current && count < this.maxCustomProperties) {
      const computed = win.getComputedStyle(current);
      // `computed.length` enumerates *all* property names visible on the
      // element, including custom properties whose computed value is set.
      for (
        let i = 0;
        i < computed.length && count < this.maxCustomProperties;
        i++
      ) {
        const name = computed[i];
        if (!name.startsWith('--')) continue;
        if (Object.prototype.hasOwnProperty.call(customProperties, name))
          continue;
        const value = computed.getPropertyValue(name).trim();
        if (value === '') continue;
        customProperties[name] = value;
        count++;
      }
      current = current.parentElement;
    }

    return customProperties;
  }

  /**
   * Enforce {@link maxBytes} by dropping entries from the tail until the
   * payload fits. Computed-allowlist entries are preserved; only custom
   * properties are trimmed, because the allowlist is small (≤32) and
   * deterministic while custom-properties can be unbounded.
   */
  private enforceBudget(styles: ComponentStyles): ComponentStyles {
    if (this.maxBytes <= 0) return styles;

    if (this.approximateSize(styles) <= this.maxBytes) {
      return styles;
    }

    const customProperties = styles.customProperties
      ? { ...styles.customProperties }
      : undefined;

    if (customProperties) {
      const names = Object.keys(customProperties);
      while (
        names.length > 0 &&
        this.approximateSize({ ...styles, customProperties }) > this.maxBytes
      ) {
        const dropped = names.pop();
        if (dropped !== undefined) {
          delete customProperties[dropped];
        }
      }
    }

    return {
      ...(styles.computed ? { computed: styles.computed } : {}),
      ...(customProperties && Object.keys(customProperties).length > 0
        ? { customProperties }
        : {}),
    };
  }

  private approximateSize(styles: ComponentStyles): number {
    // JSON length is a reasonable approximation of the wire size on the
    // bridge. We do not double-stringify for the budget check; this is the
    // same approximation `serializeValue` uses elsewhere.
    return JSON.stringify(styles).length;
  }
}
