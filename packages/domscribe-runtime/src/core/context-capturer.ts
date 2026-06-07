/**
 * ContextCapturer - Orchestrates runtime context capture
 *
 * Coordinates props and state capturers to assemble a complete RuntimeContext object.
 *
 * @module @domscribe/runtime/core/context-capturer
 */

import type { RuntimeContext } from '@domscribe/core';
import type { FrameworkAdapter } from '../adapters/adapter.interface.js';
import type {
  CaptureOptions,
  SerializationConstraints,
} from '../capture/types.js';
import { PropsCapturer } from '../capture/props-capturer.js';
import { StateCapturer } from '../capture/state-capturer.js';
import {
  StyleCapturer,
  type StyleCaptureOptions,
} from '../capture/style-capturer.js';
import { ContextCaptureError } from '../errors/index.js';

/**
 * Options for ContextCapturer
 */
export interface ContextCapturerOptions {
  /**
   * Framework adapter for component data access
   */
  adapter: FrameworkAdapter;

  /**
   * Feature phase (1 or 2)
   * - Phase 1: Props and state
   * - Phase 2: Event flow and performance (future implementation)
   */
  phase?: 1 | 2;

  /**
   * Serialization constraints for captured props and state.
   * Individual fields fall back to sensible defaults in the serializer.
   */
  serialization?: SerializationConstraints;

  /**
   * Enable PII redaction
   */
  redactPII?: boolean;

  /**
   * Enable debug logging
   */
  debug?: boolean;

  /**
   * Enable computed-style + custom-property capture
   * (RFC 0001 `domscribe.config.captureStyles`).
   *
   * Off by default; flips on the {@link StyleCapturer} pass and makes
   * `RuntimeContext.componentStyles` available to `query.bySource` and the
   * annotation payload. Respects the existing ≤4 KB per-element budget via
   * `styleOptions.maxBytes`.
   */
  captureStyles?: boolean;

  /**
   * Tuning knobs forwarded to {@link StyleCapturer}. Ignored when
   * {@link captureStyles} is false.
   */
  styleOptions?: StyleCaptureOptions;
}

/**
 * ContextCapturer class
 *
 * Orchestrates all context capture operations and assembles the final
 * RuntimeContext object.
 */
export class ContextCapturer {
  private propsCapturer: PropsCapturer;
  private stateCapturer: StateCapturer;
  private styleCapturer: StyleCapturer | null;
  private options: Required<
    Omit<ContextCapturerOptions, 'serialization' | 'styleOptions'>
  > &
    Pick<ContextCapturerOptions, 'serialization' | 'styleOptions'>;

  constructor(options: ContextCapturerOptions) {
    this.options = {
      adapter: options.adapter,
      phase: options.phase ?? 1,
      serialization: options.serialization,
      redactPII: options.redactPII ?? true,
      debug: options.debug ?? false,
      captureStyles: options.captureStyles ?? false,
      styleOptions: options.styleOptions,
    };

    const s = this.options.serialization;

    // Ask the adapter which keys are framework internals
    const hints = this.options.adapter.getSerializationHints?.();

    // Initialize capturers with serialization constraints + adapter hints
    this.propsCapturer = new PropsCapturer(this.options.adapter, {
      ...s,
      skipKeys: hints?.skipKeys,
      skipKeyPrefixes: hints?.skipKeyPrefixes,
      redactPII: this.options.redactPII,
      debug: this.options.debug,
    });
    this.stateCapturer = new StateCapturer(this.options.adapter, {
      ...s,
      skipKeys: hints?.skipKeys,
      skipKeyPrefixes: hints?.skipKeyPrefixes,
      redactPII: this.options.redactPII,
      debug: this.options.debug,
    });
    this.styleCapturer = this.options.captureStyles
      ? new StyleCapturer({
          ...(this.options.styleOptions ?? {}),
          debug: this.options.debug,
        })
      : null;
  }

  /**
   * Capture runtime context for an element
   *
   * @param element - The DOM element
   * @param options - Capture options
   * @returns Runtime context or null if capture fails
   */
  async captureForElement(
    element: HTMLElement,
    options: CaptureOptions = {},
  ): Promise<RuntimeContext | null> {
    try {
      // Get component instance from adapter
      const componentInstance =
        this.options.adapter.getComponentInstance(element);

      if (!componentInstance) {
        if (this.options.debug) {
          console.warn(
            '[domscribe-runtime][context-capturer] No component instance found for element',
          );
        }
        return null;
      }

      const context = await this.captureForComponent(
        componentInstance,
        options,
      );
      this.attachStyles(context, element, options);
      return context;
    } catch (error) {
      throw new ContextCaptureError(
        'Failed to capture context for element',
        error instanceof Error ? error : undefined,
      );
    }
  }

  /**
   * Run the style capture pass and attach the result onto `context.componentStyles`.
   *
   * Skipped when the manager-level `captureStyles` flag is off OR the
   * per-call `includeStyles` override explicitly opts out. Style-capture
   * failures are swallowed (logged at debug) — props/state capture must
   * still succeed even on a page where computed-style resolution is broken.
   */
  private attachStyles(
    context: RuntimeContext,
    element: HTMLElement,
    options: CaptureOptions,
  ): void {
    if (!this.styleCapturer) return;
    if (options.includeStyles === false) return;

    const result = this.styleCapturer.capture(element);
    if (result.success && result.data) {
      context.componentStyles = result.data;
    } else if (this.options.debug && result.error) {
      console.warn(
        '[domscribe-runtime][context-capturer] Style capture failed:',
        result.error,
      );
    }
  }

  /**
   * Capture runtime context for a component instance
   *
   * @param component - The component instance
   * @param options - Capture options
   * @returns Runtime context
   */
  async captureForComponent(
    component: unknown,
    options: CaptureOptions = {},
  ): Promise<RuntimeContext> {
    const context: RuntimeContext = {};

    if (options.includeProps !== false) {
      const propsResult = this.propsCapturer.capture(component);
      if (propsResult.success && propsResult.data) {
        context.componentProps = propsResult.data;
      } else if (this.options.debug && propsResult.error) {
        console.warn(
          '[domscribe-runtime][context-capturer] Props capture failed:',
          propsResult.error,
        );
      }
    }

    if (options.includeState !== false) {
      const stateResult = this.stateCapturer.capture(component);
      if (stateResult.success && stateResult.data) {
        context.componentState = stateResult.data;
      } else if (this.options.debug && stateResult.error) {
        console.warn(
          '[domscribe-runtime][context-capturer] State capture failed:',
          stateResult.error,
        );
      }
    }

    if (this.options.debug) {
      console.log('[domscribe-runtime][context-capturer] Captured context:', {
        hasProps: !!context.componentProps,
        hasState: !!context.componentState,
        hasStyles: !!context.componentStyles,
      });
    }

    return context;
  }
}
