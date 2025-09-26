/**
 * StateCapturer - Captures component state (Phase 1 feature)
 * @module @domscribe/runtime/capture/state-capturer
 */

import type { FrameworkAdapter } from '../adapters/adapter.interface.js';
import type { CaptureResult, StateCaptureOptions } from './types.js';
import { serializeValue } from '../utils/serialization.js';
import { isRecord, redactPII, redactSensitiveFields } from '@domscribe/core';
import { ContextCaptureError } from '../errors/index.js';

/**
 * StateCapturer class
 *
 * Captures component state using the framework adapter and serializes it safely
 */
export class StateCapturer {
  constructor(
    private adapter: FrameworkAdapter,
    private options: StateCaptureOptions = {},
  ) {}

  /**
   * Capture state from a component instance
   *
   * @param component - The component instance
   * @returns Capture result with serialized state
   */
  capture(component: unknown): CaptureResult<Record<string, unknown>> {
    try {
      // Use adapter to get state
      const rawState = this.adapter.captureState(component);

      if (!rawState) {
        return {
          success: true,
          data: {},
        };
      }

      // Serialize state safely
      const serialized = serializeValue(rawState, {
        maxDepth: this.options.maxDepth ?? 10,
        includeFunctions: false,
      });

      // Apply redaction if enabled
      let state = this.ensureRecord(serialized);
      if (this.options.redactPII !== false) {
        state = this.ensureRecord(redactPII(state));
        state = this.ensureRecord(redactSensitiveFields(state));
      }

      if (this.options.debug) {
        console.log(
          '[domscribe-runtime][state-capturer] Captured state:',
          Object.keys(state),
        );
      }

      return {
        success: true,
        data: state,
      };
    } catch (error) {
      const err = new ContextCaptureError(
        'Failed to capture state',
        error instanceof Error ? error : undefined,
      );

      if (this.options.debug) {
        console.error('[domscribe-runtime][state-capturer]', err);
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
