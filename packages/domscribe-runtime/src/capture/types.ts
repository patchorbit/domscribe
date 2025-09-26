/**
 * Capture-specific types for runtime context collection
 * @module @domscribe/runtime/capture/types
 */

/**
 * Result of a capture operation
 */
export interface CaptureResult<T> {
  /**
   * Whether the capture was successful
   */
  success: boolean;

  /**
   * Captured data (if successful)
   */
  data?: T;

  /**
   * Error that occurred (if unsuccessful)
   */
  error?: Error;
}

/**
 * Options for context capture
 */
export interface CaptureOptions {
  /**
   * Include props in capture (Phase 1)
   */
  includeProps?: boolean;

  /**
   * Include state in capture (Phase 1)
   */
  includeState?: boolean;

  /**
   * Maximum depth for object serialization
   */
  maxDepth?: number;
}

/**
 * Options for props capture
 */
export interface PropsCaptureOptions {
  /**
   * Maximum depth for object serialization
   * @default 10
   */
  maxDepth?: number;

  /**
   * Enable PII redaction
   * @default true
   */
  redactPII?: boolean;

  /**
   * Enable debug logging
   * @default false
   */
  debug?: boolean;
}

/**
 * Options for state capture
 */
export interface StateCaptureOptions {
  /**
   * Maximum depth for object serialization
   * @default 10
   */
  maxDepth?: number;

  /**
   * Enable PII redaction
   * @default true
   */
  redactPII?: boolean;

  /**
   * Enable debug logging
   * @default false
   */
  debug?: boolean;
}
