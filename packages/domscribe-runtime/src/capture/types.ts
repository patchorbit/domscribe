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
 * Shared serialization constraint options for capturers.
 */
export interface SerializationConstraints {
  /**
   * Maximum depth for object serialization.
   * The serializer defaults to 6. The state capturer overrides to 4
   * since hook state branches more heavily than props.
   * @default 6
   */
  maxDepth?: number;

  /**
   * Maximum array elements to serialize
   * @default 20
   */
  maxArrayLength?: number;

  /**
   * Maximum string length before truncation
   * @default 2048
   */
  maxStringLength?: number;

  /**
   * Maximum properties per object
   * @default 50
   */
  maxProperties?: number;

  /**
   * Maximum total serialized bytes (approximate)
   * @default 262144 (256 KB)
   */
  maxTotalBytes?: number;
}

/**
 * Options for props capture
 */
export interface PropsCaptureOptions extends SerializationConstraints {
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

  /**
   * Exact keys to skip during serialization.
   * Provided by the framework adapter via getSerializationHints().
   */
  skipKeys?: Set<string>;

  /**
   * Key prefixes to skip during serialization.
   * Provided by the framework adapter via getSerializationHints().
   */
  skipKeyPrefixes?: string[];
}

/**
 * Options for state capture
 */
export interface StateCaptureOptions extends SerializationConstraints {
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

  /**
   * Exact keys to skip during serialization.
   * Provided by the framework adapter via getSerializationHints().
   */
  skipKeys?: Set<string>;

  /**
   * Key prefixes to skip during serialization.
   * Provided by the framework adapter via getSerializationHints().
   */
  skipKeyPrefixes?: string[];
}
