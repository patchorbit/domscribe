/**
 * VueAdapter - Vue framework adapter for Domscribe
 *
 * Implements the FrameworkAdapter interface to provide runtime context capture
 * for Vue 3 applications. Uses Vue's internal DOM-attached VNode references
 * for component resolution — Vue does not expose a DevTools-based
 * DOM-to-component API.
 *
 * @module @domscribe/vue/adapter/vue-adapter
 */

import type { ComponentTreeNode } from '@domscribe/runtime';
import type {
  VueAdapterOptions,
  VueAdapterState,
  VueFrameworkAdapter,
} from './types.js';
import type { VueComponentInstance, Nullable } from '../internals/types.js';
import { DEFAULT_OPTIONS, DEVTOOLS_HOOK_KEY } from '../internals/constants.js';
import {
  resolveComponentFromElement,
  checkVNodeAccess,
  findNearestUserComponent,
} from '../internals/component-resolver.js';
import { extractProps } from '../internals/props-extractor.js';
import { extractState } from '../internals/state-extractor.js';
import { isVueComponentInstance, isRecord } from '../internals/type-guards.js';

/**
 * VueAdapter class implementing FrameworkAdapter interface
 */
export class VueAdapter implements VueFrameworkAdapter {
  readonly name = 'vue';
  readonly version?: string;

  private _version?: string;
  private state: VueAdapterState;
  private options: Required<VueAdapterOptions>;

  constructor(options?: VueAdapterOptions) {
    // Normalize options with defaults
    this.options = {
      maxTreeDepth: options?.maxTreeDepth ?? DEFAULT_OPTIONS.maxTreeDepth,
      debug: options?.debug ?? DEFAULT_OPTIONS.debug,
    };

    // Initialize state
    this.state = {
      initialized: false,
      hasVNodeAccess: false,
    };

    // Initialize adapter
    try {
      // Detect Vue version
      this._version = this.detectVueVersion();
      this.state.version = this._version;

      // Set readonly version property
      Object.defineProperty(this, 'version', {
        value: this._version,
        writable: false,
        configurable: false,
      });

      // Check for VNode access
      this.state.hasVNodeAccess = checkVNodeAccess();

      this.state.initialized = true;

      if (this.options.debug) {
        console.log('[VueAdapter] Initialized:', this.state);
      }
    } catch (error) {
      if (this.options.debug) {
        console.error('[VueAdapter] Initialization failed:', error);
      }
      this.state.initialized = false;
    }
  }

  /**
   * Detect Vue version from global Vue object or DevTools hook
   */
  private detectVueVersion(): string | undefined {
    // Try window.Vue.version
    if (typeof window !== 'undefined' && 'Vue' in window) {
      const Vue = (window as unknown as { Vue?: { version?: string } }).Vue;
      if (Vue?.version) {
        return Vue.version;
      }
    }

    // Try DevTools hook (only for version detection — not used for resolution)
    if (typeof window !== 'undefined') {
      const hook = (window as unknown as Record<string, unknown>)[
        DEVTOOLS_HOOK_KEY
      ];
      if (
        isRecord(hook) &&
        'apps' in hook &&
        hook.apps instanceof Map &&
        hook.apps.size > 0
      ) {
        const firstApp = hook.apps.values().next().value;
        if (isRecord(firstApp) && 'version' in firstApp) {
          return String(firstApp.version);
        }
      }
    }

    return undefined;
  }

  // ============================================================================
  // FrameworkAdapter Interface Implementation
  // ============================================================================

  /**
   * Get component instance from a DOM element
   *
   * @param element - The DOM element to query
   * @returns Component instance or null if not found
   */
  getComponentInstance(element: HTMLElement): Nullable<unknown> {
    if (!this.state.initialized) {
      return null;
    }

    try {
      const result = resolveComponentFromElement(element);

      if (result.success && result.instance) {
        // Find nearest user component (skip internal Vue components)
        return findNearestUserComponent(result.instance);
      }

      return null;
    } catch (error) {
      if (this.options.debug) {
        console.error('[VueAdapter] getComponentInstance failed:', error);
      }
      return null;
    }
  }

  /**
   * Capture component props
   *
   * @param component - The component instance
   * @returns Serialized props object or null
   */
  captureProps(component: unknown): Nullable<Record<string, unknown>> {
    if (!this.state.initialized || !isVueComponentInstance(component)) {
      return null;
    }

    try {
      const result = extractProps(component);
      if (result.success && result.props) {
        return result.props;
      }
      return null;
    } catch (error) {
      if (this.options.debug) {
        console.error('[VueAdapter] captureProps failed:', error);
      }
      return null;
    }
  }

  /**
   * Capture component state
   *
   * @param component - The component instance
   * @returns Serialized state object or null
   */
  captureState(component: unknown): Nullable<Record<string, unknown>> {
    if (!this.state.initialized || !isVueComponentInstance(component)) {
      return null;
    }

    try {
      const result = extractState(component);
      if (result.success && result.state) {
        return result.state;
      }
      return null;
    } catch (error) {
      if (this.options.debug) {
        console.error('[VueAdapter] captureState failed:', error);
      }
      return null;
    }
  }

  /**
   * Get component name
   *
   * @param component - The component instance
   * @returns Component name or null
   */
  getComponentName(component: unknown): Nullable<string> {
    if (!this.state.initialized || !isVueComponentInstance(component)) {
      return null;
    }

    try {
      return this.resolveComponentName(component);
    } catch (error) {
      if (this.options.debug) {
        console.error('[VueAdapter] getComponentName failed:', error);
      }
      return null;
    }
  }

  /**
   * Get component tree
   *
   * @param component - The component instance
   * @returns Component tree node or null
   */
  getComponentTree(component: unknown): Nullable<ComponentTreeNode> {
    if (!this.state.initialized || !isVueComponentInstance(component)) {
      return null;
    }

    try {
      return this.buildComponentTree(component, 0);
    } catch (error) {
      if (this.options.debug) {
        console.error('[VueAdapter] getComponentTree failed:', error);
      }
      return null;
    }
  }

  // ============================================================================
  // Vue-Specific Methods
  // ============================================================================

  /**
   * Get the Vue version
   */
  getVueVersion(): string | null {
    return this._version ?? null;
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  /**
   * Resolve component name from instance
   */
  private resolveComponentName(
    instance: VueComponentInstance,
  ): Nullable<string> {
    const type = instance.type;

    // Handle string type (native elements, shouldn't happen for components)
    if (typeof type === 'string') {
      return type;
    }

    // Handle function component (check before isRecord since functions are objects)
    if (typeof type === 'function') {
      return type.name || 'Anonymous';
    }

    // Handle component definition object
    if (isRecord(type)) {
      // Try name property
      if (typeof type.name === 'string' && type.name) {
        return type.name;
      }

      // Try __name (from <script setup>)
      if (typeof type.__name === 'string' && type.__name) {
        return type.__name;
      }

      // Try displayName
      if (typeof type.displayName === 'string' && type.displayName) {
        return type.displayName;
      }
    }

    return 'Anonymous';
  }

  /**
   * Build component tree from a Vue component instance
   */
  private buildComponentTree(
    instance: VueComponentInstance,
    depth: number,
  ): ComponentTreeNode | null {
    if (depth >= this.options.maxTreeDepth) {
      return null;
    }

    const name = this.resolveComponentName(instance);
    if (!name) {
      return null;
    }

    const node: ComponentTreeNode = {
      name,
      instance,
    };

    // Add props
    const propsResult = extractProps(instance);
    if (propsResult.success && propsResult.props) {
      node.props = propsResult.props;
    }

    // Add state
    const stateResult = extractState(instance);
    if (stateResult.success && stateResult.state) {
      node.state = stateResult.state;
    }

    // Add parent
    if (instance.parent && depth < this.options.maxTreeDepth - 1) {
      const parentNode = this.buildComponentTree(instance.parent, depth + 1);
      if (parentNode) {
        node.parent = parentNode;
      }
    }

    // Add children (from subTree)
    if (depth < this.options.maxTreeDepth - 1) {
      const children = this.getChildComponents(instance);
      if (children.length > 0) {
        node.children = [];
        for (const child of children) {
          const childNode = this.buildComponentTree(child, depth + 1);
          if (childNode) {
            node.children.push(childNode);
          }
        }
      }
    }

    return node;
  }

  /**
   * Get child component instances from a parent instance
   */
  private getChildComponents(
    instance: VueComponentInstance,
  ): VueComponentInstance[] {
    const children: VueComponentInstance[] = [];

    // Walk the subTree to find child components
    if (instance.subTree) {
      this.collectChildComponents(instance.subTree, children);
    }

    return children;
  }

  /**
   * Recursively collect child components from a VNode tree
   */
  private collectChildComponents(
    vnode: unknown,
    children: VueComponentInstance[],
    depth = 0,
  ): void {
    if (depth > 20 || !isRecord(vnode)) {
      return;
    }

    // If this vnode has a component, add it
    if (
      'component' in vnode &&
      vnode.component &&
      isVueComponentInstance(vnode.component)
    ) {
      children.push(vnode.component);
      return; // Don't recurse into component's children
    }

    // Recurse into children
    if ('children' in vnode && Array.isArray(vnode.children)) {
      for (const child of vnode.children) {
        this.collectChildComponents(child, children, depth + 1);
      }
    }
  }
}

/**
 * Create a VueAdapter instance
 *
 * @param options - Adapter options
 * @returns VueAdapter instance
 */
export function createVueAdapter(options?: VueAdapterOptions): VueAdapter {
  return new VueAdapter(options);
}
