/**
 * PropsCapturer - Captures component props (Phase 1 feature)
 * @module @domscribe/runtime/capture/props-capturer
 */

import type { FrameworkAdapter } from '../adapters/adapter.interface.js';
import type { CaptureResult, PropsCaptureOptions } from './types.js';
import { serializeValue } from '../utils/serialization.js';
import { isRecord, redactPII, redactSensitiveFields } from '@domscribe/core';
import { ContextCaptureError } from '../errors/index.js';

/**
 * PropsCapturer class
 *
 * Captures component props using the framework adapter and serializes them safely
 */
export class PropsCapturer {
  constructor(
    private adapter: FrameworkAdapter,
    private options: PropsCaptureOptions = {},
  ) {}

  /**
   * Capture props from a component instance
   *
   * @param component - The component instance
   * @returns Capture result with serialized props
   */
  capture(component: unknown): CaptureResult<Record<string, unknown>> {
    try {
      // Use adapter to get props
      const rawProps = this.adapter.captureProps(component);

      if (!rawProps) {
        return {
          success: true,
          data: {},
        };
      }

      // Serialize props safely
      const serialized = serializeValue(rawProps, {
        maxDepth: this.options.maxDepth ?? 10,
        includeFunctions: false,
      });

      // Apply redaction if enabled
      let props = this.ensureRecord(serialized);
      if (this.options.redactPII !== false) {
        props = this.ensureRecord(redactPII(props));
        props = this.ensureRecord(redactSensitiveFields(props));
      }

      if (this.options.debug) {
        console.log(
          '[domscribe-runtime][props-capturer] Captured props:',
          Object.keys(props),
        );
      }

      return {
        success: true,
        data: props,
      };
    } catch (error) {
      const err = new ContextCaptureError(
        'Failed to capture props',
        error instanceof Error ? error : undefined,
      );

      if (this.options.debug) {
        console.error('[domscribe-runtime][props-capturer]', err);
      }

      return {
        success: false,
        error: err,
      };
    }
  }

  /**
   * Coerce value to a Record, returning an empty object if it isn't one.
   */
  private ensureRecord(value: unknown): Record<string, unknown> {
    if (isRecord(value)) {
      return value;
    }
    return {};
  }
}
