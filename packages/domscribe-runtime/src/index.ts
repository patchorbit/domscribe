/**
 * @domscribe/runtime - Browser-side runtime context capture
 * @module @domscribe/runtime
 */

// Main runtime manager
export { RuntimeManager } from './core/runtime-manager.js';

// Adapter system
export type {
  FrameworkAdapter,
  SerializationHints,
} from './adapters/adapter.interface.js';
export type { ComponentTreeNode } from './adapters/types.js';

// Bridge
export { BridgeDispatch } from './bridge/bridge-dispatch.js';
export type { IRuntimeTransport } from './bridge/transport.interface.js';

// Configuration types
export type { DomscribeRuntimeOptions } from './core/types.js';
export type { SerializationConstraints } from './capture/types.js';

// Style capture (RFC 0001)
export {
  StyleCapturer,
  STYLE_CAPTURE_ALLOWLIST,
} from './capture/style-capturer.js';
export type { StyleCaptureOptions } from './capture/style-capturer.js';

// Screenshot capture (RFC 0002 — verify_after_edit)
export {
  ScreenshotCapturer,
  SCREENSHOT_MAX_BYTES,
  SCREENSHOT_DEFAULT_QUALITY,
} from './capture/screenshot-capturer.js';
export type {
  ScreenshotCaptureOptions,
  ScreenshotCaptureRequest,
  ScreenshotCaptureResult,
  ScreenshotDriver,
} from './capture/screenshot-capturer.js';
