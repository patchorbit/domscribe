/**
 * ScreenshotCapturer — element-scoped image capture for verify_after_edit.
 *
 * Issues a relay-side capture request for the picked element's bounding box.
 * The actual pixel-grab lives in the browser overlay (it has access to
 * `html2canvas` / the experimental `ImageCapture` API depending on platform);
 * this module is the runtime-side contract: it returns a structured
 * `ScreenshotCaptureResult` whose `screenshotRef` is an opaque relay-blob
 * reference. We never inline image bytes into the annotation payload — the
 * RFC 0001 per-element 4 KB serialization budget assumes screenshots live
 * outside the annotation.
 *
 * @module @domscribe/runtime/capture/screenshot-capturer
 */

import type { CaptureResult } from './types.js';
import { ContextCaptureError } from '../errors/index.js';

/**
 * Soft cap for the encoded screenshot payload that the relay accepts on the
 * blob-upload endpoint. RFC 0002 §B1 fixes this at 200 KB so a high-DPR
 * fullscreen capture cannot starve other annotation traffic.
 */
export const SCREENSHOT_MAX_BYTES = 200 * 1024;

/**
 * Default JPEG quality when the browser-side encoder supports format hints.
 * 0.85 balances pixel-diff fidelity (we still need to detect 0.1% drift
 * downstream) against payload size — well-formed mid-density UI captures
 * land at 60–120 KB at this setting in our overlay smoke tests.
 */
export const SCREENSHOT_DEFAULT_QUALITY = 0.85;

export interface ScreenshotCaptureOptions {
  /**
   * Maximum encoded bytes the relay will accept for a single capture.
   * The capturer surfaces this as a contract; the actual enforcement runs
   * in the overlay's encoder loop (it can re-encode at lower quality if
   * the first attempt exceeds the cap).
   * @default 204800 (200 KB)
   */
  maxBytes?: number;
  /**
   * Optional fixed device-pixel scale. When unset the capturer uses the
   * caller's `devicePixelRatio` (the overlay reads `window.devicePixelRatio`).
   */
  scale?: number;
  /**
   * Encoder format hint — JPEG is preferred over PNG for screenshots
   * because it consistently lands well under the 200 KB cap on dense UI.
   * @default 'jpeg'
   */
  format?: 'jpeg' | 'png';
  /**
   * JPEG quality in [0, 1]. Ignored when `format === 'png'`.
   * @default 0.85
   */
  quality?: number;
  /**
   * Enable debug logging.
   * @default false
   */
  debug?: boolean;
}

/**
 * Capture request handed to the overlay. The overlay turns this into pixels
 * and resolves with a relay-blob reference.
 *
 * Shape lives in the runtime so adapters (`@domscribe/react`, `-vue`, etc.)
 * can synthesize requests without depending on overlay internals.
 */
export interface ScreenshotCaptureRequest {
  /** Bounding rect of the picked element in viewport coordinates. */
  rect: { x: number; y: number; width: number; height: number };
  scale: number;
  format: 'jpeg' | 'png';
  quality: number;
  maxBytes: number;
}

/**
 * Result of a successful screenshot capture. The agent never receives the
 * raw bytes through this surface — only an opaque blob reference it can
 * resolve through the relay if it needs the image.
 */
export interface ScreenshotCaptureResult {
  /** Opaque relay-blob reference, e.g. "blob://post-edit/<annotation>/<sha>". */
  screenshotRef: string;
  /** Encoded byte size — useful for telemetry; ≤ `maxBytes`. */
  byteSize: number;
  /** Format the overlay actually encoded to. */
  format: 'jpeg' | 'png';
  /** Pixel dimensions of the encoded capture. */
  width: number;
  height: number;
}

/**
 * Driver contract — implemented by the overlay (browser context). The
 * runtime never imports the overlay directly; the driver is injected at
 * construction time so the capturer remains test-pure and adapter-agnostic.
 */
export interface ScreenshotDriver {
  capture(request: ScreenshotCaptureRequest): Promise<ScreenshotCaptureResult>;
}

const DEFAULT_FORMAT: 'jpeg' | 'png' = 'jpeg';

export class ScreenshotCapturer {
  private readonly maxBytes: number;
  private readonly fixedScale: number | undefined;
  private readonly format: 'jpeg' | 'png';
  private readonly quality: number;
  private readonly debug: boolean;

  constructor(
    private readonly driver: ScreenshotDriver,
    options: ScreenshotCaptureOptions = {},
  ) {
    this.maxBytes = options.maxBytes ?? SCREENSHOT_MAX_BYTES;
    this.fixedScale = options.scale;
    this.format = options.format ?? DEFAULT_FORMAT;
    this.quality = options.quality ?? SCREENSHOT_DEFAULT_QUALITY;
    this.debug = options.debug ?? false;
  }

  /**
   * Capture an element-scoped screenshot.
   *
   * Returns `CaptureResult<ScreenshotCaptureResult>` — on failure the result
   * is `{ success: false, error }` so the caller (annotation flow) can
   * choose to surface or swallow. The verify_after_edit MCP handler treats
   * a missing capture as a "no post-edit data" condition and rejects the
   * call with a clear error instead of returning a partial verdict.
   */
  async capture(
    element: HTMLElement,
  ): Promise<CaptureResult<ScreenshotCaptureResult>> {
    try {
      const rect = element.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) {
        return {
          success: false,
          error: new ContextCaptureError(
            'ScreenshotCapturer: element has zero width or height — refusing to capture',
          ),
        };
      }

      const scale = this.fixedScale ?? this.detectScale(element);
      const request: ScreenshotCaptureRequest = {
        rect: {
          x: rect.x,
          y: rect.y,
          width: rect.width,
          height: rect.height,
        },
        scale,
        format: this.format,
        quality: this.quality,
        maxBytes: this.maxBytes,
      };

      const result = await this.driver.capture(request);

      if (result.byteSize > this.maxBytes) {
        return {
          success: false,
          error: new ContextCaptureError(
            `ScreenshotCapturer: overlay returned ${result.byteSize} bytes; exceeds maxBytes ${this.maxBytes}`,
          ),
        };
      }

      if (this.debug) {
        console.log(
          '[domscribe-runtime][screenshot-capturer] Captured screenshot',
          {
            ref: result.screenshotRef,
            bytes: result.byteSize,
            format: result.format,
            width: result.width,
            height: result.height,
          },
        );
      }

      return { success: true, data: result };
    } catch (error) {
      const err = new ContextCaptureError(
        'Failed to capture element screenshot',
        error instanceof Error ? error : undefined,
      );
      if (this.debug) {
        console.error('[domscribe-runtime][screenshot-capturer]', err);
      }
      return { success: false, error: err };
    }
  }

  /**
   * Read the device-pixel ratio from the element's owner window, falling
   * back to 1 in jsdom-style environments.
   */
  private detectScale(element: HTMLElement): number {
    const win = element.ownerDocument?.defaultView;
    const dpr = (win as { devicePixelRatio?: number } | null)?.devicePixelRatio;
    return typeof dpr === 'number' && dpr > 0 ? dpr : 1;
  }
}
