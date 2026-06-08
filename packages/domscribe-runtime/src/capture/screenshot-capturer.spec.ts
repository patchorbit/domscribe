/**
 * Tests for ScreenshotCapturer.
 *
 * The capturer is driver-injected (the overlay implements the actual pixel
 * grab) — these tests exercise the runtime contract: request shape,
 * blob-reference passthrough, byte-cap enforcement, and the cardinal rule
 * that raw bytes never appear in the returned result.
 *
 * @module @domscribe/runtime/capture/screenshot-capturer.spec
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  ScreenshotCapturer,
  SCREENSHOT_MAX_BYTES,
  type ScreenshotCaptureRequest,
  type ScreenshotCaptureResult,
  type ScreenshotDriver,
} from './screenshot-capturer.js';

function makeElement(
  rect: Partial<DOMRect> = {},
  devicePixelRatio = 2,
): HTMLElement {
  const fullRect: DOMRect = {
    x: 10,
    y: 20,
    width: 200,
    height: 100,
    top: 20,
    right: 210,
    bottom: 120,
    left: 10,
    toJSON: () => ({}),
    ...rect,
  } as DOMRect;
  const win = { devicePixelRatio } as unknown as Window;
  const element = {
    getBoundingClientRect: () => fullRect,
    ownerDocument: { defaultView: win },
  } as unknown as HTMLElement;
  return element;
}

function driverReturning(
  result: ScreenshotCaptureResult,
): ScreenshotDriver & { calls: ScreenshotCaptureRequest[] } {
  const calls: ScreenshotCaptureRequest[] = [];
  return {
    calls,
    async capture(req) {
      calls.push(req);
      return result;
    },
  };
}

describe('ScreenshotCapturer', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('forwards the element bounding rect, scale, format, and budget to the driver', async () => {
    const driver = driverReturning({
      screenshotRef: 'blob://post-edit/abc',
      byteSize: 4096,
      format: 'jpeg',
      width: 400,
      height: 200,
    });
    const capturer = new ScreenshotCapturer(driver);

    const result = await capturer.capture(makeElement());

    expect(result.success).toBe(true);
    expect(driver.calls).toHaveLength(1);
    expect(driver.calls[0]).toEqual({
      rect: { x: 10, y: 20, width: 200, height: 100 },
      scale: 2,
      format: 'jpeg',
      quality: 0.85,
      maxBytes: SCREENSHOT_MAX_BYTES,
    });
  });

  it('returns the screenshotRef from the driver as an opaque string', async () => {
    const driver = driverReturning({
      screenshotRef: 'blob://post-edit/xyz789',
      byteSize: 8192,
      format: 'jpeg',
      width: 200,
      height: 100,
    });
    const capturer = new ScreenshotCapturer(driver);

    const result = await capturer.capture(makeElement());

    expect(result.success).toBe(true);
    expect(result.data?.screenshotRef).toBe('blob://post-edit/xyz789');
  });

  it('rejects captures with zero-dimension bounding rects', async () => {
    const driver = driverReturning({
      screenshotRef: 'blob://noop',
      byteSize: 0,
      format: 'jpeg',
      width: 0,
      height: 0,
    });
    const capturer = new ScreenshotCapturer(driver);

    const result = await capturer.capture(makeElement({ width: 0, height: 0 }));

    expect(result.success).toBe(false);
    expect(result.error?.message).toMatch(/zero width or height/);
  });

  it('fails when the overlay returns a payload over the byte cap', async () => {
    const driver = driverReturning({
      screenshotRef: 'blob://oversize',
      byteSize: SCREENSHOT_MAX_BYTES + 1,
      format: 'jpeg',
      width: 1000,
      height: 1000,
    });
    const capturer = new ScreenshotCapturer(driver);

    const result = await capturer.capture(makeElement());

    expect(result.success).toBe(false);
    expect(result.error?.message).toMatch(/exceeds maxBytes/);
  });

  it('honors a custom maxBytes from options', async () => {
    const driver = driverReturning({
      screenshotRef: 'blob://small',
      byteSize: 1500,
      format: 'jpeg',
      width: 200,
      height: 100,
    });
    const capturer = new ScreenshotCapturer(driver, { maxBytes: 1024 });

    const result = await capturer.capture(makeElement());
    expect(result.success).toBe(false);
    expect(result.error?.message).toMatch(/exceeds maxBytes 1024/);
  });

  it('falls back to scale=1 when devicePixelRatio is unavailable', async () => {
    const driver = driverReturning({
      screenshotRef: 'blob://x',
      byteSize: 1,
      format: 'jpeg',
      width: 1,
      height: 1,
    });
    const capturer = new ScreenshotCapturer(driver);

    await capturer.capture(makeElement({}, NaN));

    expect(driver.calls[0].scale).toBe(1);
  });

  it('NEVER inlines raw bytes — the returned CaptureResult must be serializable inside the 4 KB annotation budget', async () => {
    // Even at maximum byteSize, the SERIALIZED CaptureResult should be a
    // tiny metadata-only payload — the screenshot lives behind the
    // blob reference, not in the result.
    const driver = driverReturning({
      screenshotRef: 'blob://post-edit/' + 'x'.repeat(48),
      byteSize: SCREENSHOT_MAX_BYTES,
      format: 'jpeg',
      width: 1920,
      height: 1080,
    });
    const capturer = new ScreenshotCapturer(driver);

    const result = await capturer.capture(makeElement());

    expect(result.success).toBe(true);
    const serialized = JSON.stringify({
      success: result.success,
      data: result.data,
    });
    // Pad the budget heavily — the real cap is the per-annotation 4 KB
    // serialization budget from RFC 0001; metadata for one screenshot
    // should be well under 1 KB even with a long ref.
    expect(serialized.length).toBeLessThan(512);
    expect(serialized).not.toMatch(/data:image/i);
    expect(serialized).not.toMatch(/base64/i);
  });

  it('surfaces driver exceptions as a CaptureResult error', async () => {
    const driver: ScreenshotDriver = {
      async capture() {
        throw new Error('overlay timed out');
      },
    };
    const capturer = new ScreenshotCapturer(driver);

    const result = await capturer.capture(makeElement());

    expect(result.success).toBe(false);
    expect(result.error?.message).toMatch(/screenshot/);
  });
});
