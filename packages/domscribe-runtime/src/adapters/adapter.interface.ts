/**
 * Framework adapter interface for runtime context capture
 * @module @domscribe/runtime/adapters/adapter.interface
 */

import type { ComponentTreeNode, Nullable } from './types.js';

/**
 * Framework-specific hints for the serializer.
 *
 * Adapters use this to tell the runtime which object keys are framework
 * internals that should be omitted during serialization. This keeps
 * framework-specific knowledge in the adapter rather than hardcoding
 * it in the generic runtime.
 */
export interface SerializationHints {
  /**
   * Exact keys to skip (e.g., '_owner', '_store').
   * Properties with these keys are omitted at any depth.
   */
  skipKeys?: Set<string>;

  /**
   * Key prefixes to skip (e.g., '__react' catches '__reactFiber$xyz').
   * Any property whose key starts with one of these prefixes is omitted.
   */
  skipKeyPrefixes?: string[];
}

/**
 * Framework adapter interface
 *
 * Provides hooks for runtime context capture from framework-specific
 * component instances. Each framework adapter (React, Vue, etc.) implements
 * this interface to expose component props, state, and metadata.
 *
 * Domscribe will invoke these methods to capture the runtime
 * context of a component when users pick a DOM element.
 */
export interface FrameworkAdapter {
  /**
   * Framework name (e.g., 'react', 'vue')
   */
  readonly name: string;

  /**
   * Framework version
   */
  readonly version?: string;

  /**
   * Get component instance from a DOM element
   *
   * @param element - The DOM element to query
   * @returns Component instance or null if not found
   */
  getComponentInstance(element: HTMLElement): Nullable<unknown>;

  /**
   * Capture component props
   *
   * @param component - The component instance
   * @returns Serialized props object or null
   */
  captureProps(component: unknown): Nullable<Record<string, unknown>>;

  /**
   * Capture component state
   *
   * @param component - The component instance
   * @returns Serialized state object or null
   */
  captureState(component: unknown): Nullable<Record<string, unknown>>;

  /**
   * Get component name (optional)
   *
   * @param component - The component instance
   * @returns Component name or null
   */
  getComponentName?(component: unknown): Nullable<string>;

  /**
   * Get component tree (optional)
   *
   * @param component - The component instance
   * @returns Component tree node or null
   */
  getComponentTree?(component: unknown): Nullable<ComponentTreeNode>;

  /**
   * Return framework-specific serialization hints (optional).
   *
   * Called once during capturer initialization. The runtime uses these hints
   * to skip framework-internal keys during serialization, preventing useless
   * data (e.g., React Fiber trees, Vue reactivity markers) from consuming
   * the serialization byte budget.
   *
   * @returns Serialization hints or undefined
   */
  getSerializationHints?(): SerializationHints;
}
