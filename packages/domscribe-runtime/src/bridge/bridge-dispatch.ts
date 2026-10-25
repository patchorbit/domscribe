/**
 * BridgeDispatch - Singleton facade for runtime bridge operations
 *
 * Callers (overlay, extension) import this class, configure a transport
 * once at init, and use it for all runtime communication.
 *
 * ID-based methods delegate to the configured transport.
 * Element-based captureContext bypasses the transport and calls
 * RuntimeManager directly (same-context only).
 *
 * @module @domscribe/runtime/bridge/bridge-dispatch
 */

import type {
  ElementTarget,
  ManifestEntryId,
  RuntimeContext,
  TargetQueryInput,
  TargetResolution,
} from '@domscribe/core';
import type { ElementInfo } from '../core/types.js';
import type { IRuntimeTransport } from './transport.interface.js';
import { DirectTransport } from './direct-transport.js';
import { RuntimeManager } from '../core/runtime-manager.js';

export class BridgeDispatch {
  private static instance: BridgeDispatch | null = null;

  private transport: IRuntimeTransport;

  private constructor(transport?: IRuntimeTransport) {
    this.transport = transport ?? new DirectTransport();
  }

  /**
   * Get the singleton instance
   */
  static getInstance(transport?: IRuntimeTransport): BridgeDispatch {
    if (!BridgeDispatch.instance) {
      BridgeDispatch.instance = new BridgeDispatch(transport);
    }
    return BridgeDispatch.instance;
  }

  /**
   * Reset the singleton instance (useful for testing)
   */
  static resetInstance(): void {
    BridgeDispatch.instance = null;
  }

  // ===========================================================================
  // Transport-delegated methods (ID-based, serializable)
  // ===========================================================================

  /** Check if the runtime is initialized and ready. */
  isReady(): boolean {
    return this.transport.isReady();
  }

  /** Capture runtime context for an element by its data-ds ID (via transport). */
  async captureContextForEntry(
    entryId: ManifestEntryId,
  ): Promise<RuntimeContext | null> {
    return this.transport.captureContextForEntry(entryId);
  }

  /** Get element info by data-ds ID (via transport). */
  getElementInfo(entryId: ManifestEntryId): ElementInfo | null {
    return this.transport.getElementInfo(entryId);
  }

  /** Get the component name for an element by its data-ds ID (via transport). */
  getComponentName(entryId: ManifestEntryId): string | null {
    return this.transport.getComponentName(entryId);
  }

  /** Get the total number of tracked elements (via transport). */
  getTrackedCount(): number {
    return this.transport.getTrackedCount();
  }

  // ===========================================================================
  // Same-context only (bypasses transport)
  // ===========================================================================

  /**
   * Capture runtime context for a DOM element directly.
   * Only works in the same JS context as RuntimeManager.
   */
  async captureContext(element: HTMLElement): Promise<RuntimeContext | null> {
    try {
      const runtime = RuntimeManager.getInstance();
      if (!runtime.isReady()) return null;
      return await runtime.captureContextForElement(element);
    } catch {
      return null;
    }
  }

  /** Same-context target APIs, like element-based capture (no transport guessing). */
  describeTarget(element: HTMLElement): ElementTarget | null {
    return RuntimeManager.getInstance().describeTarget(element);
  }

  queryTargets(
    query: TargetQueryInput,
  ): Promise<TargetResolution & { context?: RuntimeContext }> {
    return RuntimeManager.getInstance().queryTargets(query);
  }
  resolveTargets(query: TargetQueryInput): TargetResolution {
    return RuntimeManager.getInstance().resolveTargets(query);
  }
}
