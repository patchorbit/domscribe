/**
 * ContextCapturer - Orchestrates runtime context capture
 *
 * Coordinates props and state capturers to assemble a complete RuntimeContext object.
 *
 * @module @domscribe/runtime/core/context-capturer
 */

import type { RuntimeContext } from '@domscribe/core';
import type { FrameworkAdapter } from '../adapters/adapter.interface.js';
import type { CaptureOptions } from '../capture/types.js';
import { PropsCapturer } from '../capture/props-capturer.js';
import { StateCapturer } from '../capture/state-capturer.js';
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
   * Maximum depth for serialization
   */
  maxDepth?: number;

  /**
   * Enable PII redaction
   */
  redactPII?: boolean;

  /**
   * Enable debug logging
   */
  debug?: boolean;
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
  private options: Required<ContextCapturerOptions>;

  constructor(options: ContextCapturerOptions) {
    this.options = {
      adapter: options.adapter,
      phase: options.phase ?? 1,
      maxDepth: options.maxDepth ?? 10,
      redactPII: options.redactPII ?? true,
      debug: options.debug ?? false,
    };

    // Initialize capturers
    const captureOptions = {
      maxDepth: this.options.maxDepth,
      redactPII: this.options.redactPII,
      debug: this.options.debug,
    };

    this.propsCapturer = new PropsCapturer(
      this.options.adapter,
      captureOptions,
    );
    this.stateCapturer = new StateCapturer(
      this.options.adapter,
      captureOptions,
    );
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

      return this.captureForComponent(componentInstance, options);
    } catch (error) {
      throw new ContextCaptureError(
        'Failed to capture context for element',
        error instanceof Error ? error : undefined,
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
      });
    }

    return context;
  }
}
