/**
 * ReactAdapter - React framework adapter for Domscribe
 *
 * Implements the FrameworkAdapter interface to provide runtime context capture
 * for React applications. Supports multiple capture strategies:
 * - DevTools: Use React DevTools hook (most reliable, requires DevTools)
 * - Fiber: Direct Fiber tree access (fast, but uses React internal API)
 * - Best-effort: Try multiple strategies in order of reliability
 *
 * @module @domscribe/react/adapter/react-adapter
 */

import type { ComponentTreeNode, SerializationHints } from '@domscribe/runtime';
import type { ExtendedReactFiber } from '../fiber/types.js';
import type {
  ReactAdapterOptions,
  ReactAdapterState,
  ComponentResolutionResult,
  ReactFrameworkAdapter,
  ReactDevToolsHook,
} from './types.js';
import { CaptureStrategy } from './types.js';
import { FiberWalker } from '../fiber/fiber-walker.js';
import { ComponentNameResolver } from '../component/component-name-resolver.js';
import { PropsExtractor } from '../component/props-extractor.js';
import { StateExtractor } from '../component/state-extractor.js';
import { DEVTOOLS_HOOK_KEY, REACT_ELEMENT_KEYS } from '../utils/constants.js';
import type { Nullable } from '../utils/types.js';
import {
  isReactFiber,
  hasReactFiberKey,
  isComponentFiber,
  isReactDevToolsHook,
} from '../utils/type-guards.js';
import { FiberAccessError, ComponentResolutionError } from '../errors/index.js';

/**
 * ReactAdapter class implementing FrameworkAdapter interface
 */
export class ReactAdapter implements ReactFrameworkAdapter {
  readonly name = 'react';
  readonly version?: string;

  private _version?: string;
  private state: ReactAdapterState;
  private options: Required<ReactAdapterOptions>;

  // Utilities
  private fiberWalker: FiberWalker;
  private nameResolver: ComponentNameResolver;
  private propsExtractor: PropsExtractor;
  private stateExtractor: StateExtractor;

  constructor(options?: ReactAdapterOptions) {
    // Initialize utilities
    this.fiberWalker = new FiberWalker();
    this.nameResolver = new ComponentNameResolver();
    this.propsExtractor = new PropsExtractor();
    this.stateExtractor = new StateExtractor();

    // Normalize options with defaults
    this.options = {
      strategy: options?.strategy ?? CaptureStrategy.BEST_EFFORT,
      maxTreeDepth: options?.maxTreeDepth ?? 50,
      debug: options?.debug ?? false,
      includeWrappers: options?.includeWrappers ?? true,
      hookNameResolvers: options?.hookNameResolvers ?? new Map(),
    };

    // Initialize state
    this.state = {
      initialized: false,
      hasDevTools: false,
      hasFiberAccess: false,
      activeStrategy: this.options.strategy,
    };

    try {
      // Detect React version
      this._version = this.detectReactVersion();
      this.state.version = this._version;

      // Set readonly version property
      Object.defineProperty(this, 'version', {
        value: this._version,
        writable: false,
        configurable: false,
      });

      // Check for DevTools hook
      this.state.hasDevTools = this.checkDevToolsAvailability();

      // Check for Fiber access
      this.state.hasFiberAccess = this.checkFiberAccess();

      this.state.initialized = true;

      if (this.options.debug) {
        console.log('[ReactAdapter] Initialized:', this.state);
      }
    } catch (error) {
      if (this.options.debug) {
        console.error('[ReactAdapter] Initialization failed:', error);
      }
      this.state.initialized = false;
    }
  }

  /**
   * Detect React version from global React object or DevTools
   */
  private detectReactVersion(): string | undefined {
    // Try React.version
    if (typeof window !== 'undefined' && 'React' in window) {
      const React = (window as unknown as { React?: { version?: string } })
        .React;
      if (React?.version) {
        return React.version;
      }
    }

    // Try DevTools hook
    if (this.state.hasDevTools) {
      const hook = this.getDevToolsHook();
      if (
        typeof hook === 'object' &&
        hook !== null &&
        'rendererInterfaces' in hook
      ) {
        const interfaces = hook.rendererInterfaces as Map<number, unknown>;
        const firstRenderer = interfaces.values().next().value;
        if (
          firstRenderer &&
          typeof firstRenderer === 'object' &&
          firstRenderer !== null &&
          'version' in firstRenderer
        ) {
          return String(firstRenderer.version);
        }
      }
    }

    return undefined;
  }

  /**
   * Check if React DevTools hook is available
   */
  private checkDevToolsAvailability(): boolean {
    if (typeof window === 'undefined') {
      return false;
    }

    const hook = this.getDevToolsHook();
    return hook !== null && typeof hook === 'object';
  }

  /**
   * Get the React DevTools hook object
   */
  private getDevToolsHook(): ReactDevToolsHook | null {
    if (typeof window === 'undefined') {
      return null;
    }

    const hook = (window as unknown as Record<string, unknown>)[
      DEVTOOLS_HOOK_KEY
    ] as unknown;

    if (isReactDevToolsHook(hook)) {
      return hook;
    }

    return null;
  }

  /**
   * Check if we can access Fiber internals
   */
  private checkFiberAccess(): boolean {
    // Try to find a React root in the document
    if (typeof document === 'undefined') {
      return false;
    }

    // Look for React root nodes
    const reactRoots = document.querySelectorAll('[data-reactroot]');
    if (reactRoots.length > 0) {
      const rootElement = reactRoots[0] as HTMLElement;
      return hasReactFiberKey(rootElement);
    }

    // Try finding any element with React Fiber keys
    const allElements = document.querySelectorAll('*');
    for (let i = 0; i < Math.min(allElements.length, 100); i++) {
      if (hasReactFiberKey(allElements[i] as HTMLElement)) {
        return true;
      }
    }

    return false;
  }

  // ============================================================================
  // FrameworkAdapter Interface Implementation
  // ============================================================================

  /**
   * Get component instance from a DOM element
   *
   * @param element - The DOM element to query
   * @returns Component instance (Fiber node) or null if not found
   */
  getComponentInstance(element: HTMLElement): Nullable<unknown> {
    if (!this.state.initialized) {
      return null;
    }

    try {
      const result = this.resolveComponent(element);
      if (result.success && result.component) {
        return result.component;
      }
      return null;
    } catch (error) {
      if (this.options.debug) {
        console.error('[ReactAdapter] getComponentInstance failed:', error);
      }
      return null;
    }
  }

  /**
   * Capture component props
   *
   * @param component - The component instance (Fiber node)
   * @returns Serialized props object or null
   */
  captureProps(component: unknown): Nullable<Record<string, unknown>> {
    if (!this.state.initialized || !isReactFiber(component)) {
      return null;
    }

    try {
      const result = this.propsExtractor.extract(component);
      if (result.success && result.props) {
        return result.props;
      }
      return null;
    } catch (error) {
      if (this.options.debug) {
        console.error('[ReactAdapter] captureProps failed:', error);
      }
      return null;
    }
  }

  /**
   * Capture component state
   *
   * @param component - The component instance (Fiber node)
   * @returns Serialized state object or null
   */
  captureState(component: unknown): Nullable<Record<string, unknown>> {
    if (!this.state.initialized || !isReactFiber(component)) {
      return null;
    }

    try {
      const result = this.stateExtractor.extract(component);
      if (result.success && result.state) {
        return result.state;
      }
      return null;
    } catch (error) {
      if (this.options.debug) {
        console.error('[ReactAdapter] captureState failed:', error);
      }
      return null;
    }
  }

  /**
   * Get component name
   *
   * @param component - The component instance (Fiber node)
   * @returns Component name or null
   */
  getComponentName(component: unknown): Nullable<string> {
    if (!this.state.initialized || !isReactFiber(component)) {
      return null;
    }

    try {
      const result = this.nameResolver.resolve(component, {
        includeWrappers: this.options.includeWrappers,
      });
      return result.name || null;
    } catch (error) {
      if (this.options.debug) {
        console.error('[ReactAdapter] getComponentName failed:', error);
      }
      return null;
    }
  }

  /**
   * Get component tree
   *
   * @param component - The component instance (Fiber node)
   * @returns Component tree node or null
   */
  getComponentTree(component: unknown): Nullable<ComponentTreeNode> {
    if (!this.state.initialized || !isReactFiber(component)) {
      return null;
    }

    try {
      return this.buildComponentTree(component);
    } catch (error) {
      if (this.options.debug) {
        console.error('[ReactAdapter] getComponentTree failed:', error);
      }
      return null;
    }
  }

  /**
   * Return React-specific serialization hints.
   *
   * Tells the runtime serializer which keys are React internals that should
   * be omitted. This prevents Fiber trees, element owner chains, and other
   * framework plumbing from consuming the serialization byte budget.
   */
  getSerializationHints(): SerializationHints {
    return {
      skipKeys: new Set(['_owner', '_store', '__self', '__source']),
      skipKeyPrefixes: ['__react'],
    };
  }

  // ============================================================================
  // React-Specific Methods
  // ============================================================================

  /**
   * Get the active capture strategy
   */
  getActiveStrategy(): CaptureStrategy {
    return this.state.activeStrategy;
  }

  /**
   * Get the React version
   */
  getReactVersion(): string | null {
    return this._version ?? null;
  }

  /**
   * Check if React DevTools is available
   */
  hasDevToolsAccess(): boolean {
    return this.state.hasDevTools;
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  /**
   * Resolve component from DOM element using active strategy
   */
  private resolveComponent(element: HTMLElement): ComponentResolutionResult {
    // Try strategies in order based on active strategy
    if (this.state.activeStrategy === CaptureStrategy.DEVTOOLS) {
      return this.resolveViaDevTools(element);
    } else if (this.state.activeStrategy === CaptureStrategy.FIBER) {
      return this.resolveViaFiber(element);
    } else {
      // Best-effort: try both
      const devToolsResult = this.resolveViaDevTools(element);
      if (devToolsResult.success) {
        return devToolsResult;
      }
      return this.resolveViaFiber(element);
    }
  }

  /**
   * Resolve component via React DevTools hook
   */
  private resolveViaDevTools(element: HTMLElement): ComponentResolutionResult {
    try {
      const hook = this.getDevToolsHook();
      if (!hook) {
        return {
          success: false,
          error: new ComponentResolutionError('DevTools hook not available'),
        };
      }

      for (const renderer of hook.renderers.values()) {
        if (renderer?.findFiberByHostInstance) {
          const fiber = renderer.findFiberByHostInstance(element);
          if (isReactFiber(fiber)) {
            // Find nearest component Fiber (not host Fiber)
            const componentFiber =
              this.fiberWalker.findNearestComponentFiber(fiber);
            if (componentFiber) {
              return {
                success: true,
                component: componentFiber,
                strategy: CaptureStrategy.DEVTOOLS,
              };
            }
          }
        }
      }

      return {
        success: false,
        error: new ComponentResolutionError(
          'Could not resolve Fiber via DevTools',
        ),
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error
            : new ComponentResolutionError('DevTools resolution failed'),
      };
    }
  }

  /**
   * Resolve component via direct Fiber access
   */
  private resolveViaFiber(element: HTMLElement): ComponentResolutionResult {
    try {
      // Get Fiber node from element
      const fiber = this.getFiberFromElement(element);
      if (!fiber) {
        return {
          success: false,
          error: new FiberAccessError('Could not find Fiber on element'),
        };
      }

      // Find nearest component Fiber
      const componentFiber = this.fiberWalker.findNearestComponentFiber(fiber);
      if (!componentFiber) {
        return {
          success: false,
          error: new FiberAccessError('Could not find component Fiber'),
        };
      }

      return {
        success: true,
        component: componentFiber,
        strategy: CaptureStrategy.FIBER,
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error
            : new FiberAccessError('Fiber resolution failed'),
      };
    }
  }

  /**
   * Get Fiber node from DOM element using internal React keys
   */
  private getFiberFromElement(element: HTMLElement): ExtendedReactFiber | null {
    // React attaches Fiber to DOM elements using internal keys
    // These keys vary by React version:
    // - React 16-17: __reactInternalInstance$...
    // - React 18+: __reactFiber$...

    const keys = Object.keys(element);
    const fiberKey = keys.find(
      (key) =>
        key.startsWith(REACT_ELEMENT_KEYS.FIBER_16) ||
        key.startsWith(REACT_ELEMENT_KEYS.FIBER_17_18),
    );

    if (!fiberKey) {
      return null;
    }

    const fiber = (element as unknown as Record<string, unknown>)[fiberKey];
    if (isReactFiber(fiber)) {
      return fiber;
    }

    return null;
  }

  /**
   * Build component tree from a Fiber node
   */
  private buildComponentTree(
    fiber: ExtendedReactFiber,
    depth = 0,
  ): ComponentTreeNode | null {
    if (depth >= this.options.maxTreeDepth) {
      return null;
    }

    try {
      const name = this.getComponentName(fiber);
      if (!name) {
        return null;
      }

      const node: ComponentTreeNode = {
        name,
        instance: fiber,
      };

      // Add props
      const props = this.captureProps(fiber);
      if (props) {
        node.props = props;
      }

      // Add state
      const state = this.captureState(fiber);
      if (state) {
        node.state = state;
      }

      // Add parent if within depth limit
      if (fiber.return) {
        const parentFiber = this.fiberWalker.findNearestComponentFiber(
          fiber.return,
        );
        if (parentFiber) {
          const parentNode = this.buildComponentTree(parentFiber, depth + 1);
          if (parentNode) {
            node.parent = parentNode;
          }
        }
      }

      // Add children if within depth limit
      if (depth + 1 < this.options.maxTreeDepth) {
        const allChildren = this.fiberWalker.getChildren(fiber);
        // Filter to only component fibers
        const componentChildren = allChildren.filter((child) =>
          isComponentFiber(child),
        );

        if (componentChildren.length > 0) {
          node.children = [];
          for (const child of componentChildren) {
            const childNode = this.buildComponentTree(child, depth + 1);
            if (childNode) {
              node.children.push(childNode);
            }
          }
        }
      }

      return node;
    } catch (error) {
      if (this.options.debug) {
        console.error('[ReactAdapter] buildComponentTree failed:', error);
      }
      return null;
    }
  }
}

/**
 * Create a ReactAdapter instance
 *
 * @param options - Adapter options
 * @returns ReactAdapter instance
 */
export function createReactAdapter(
  options?: ReactAdapterOptions,
): ReactAdapter {
  return new ReactAdapter(options);
}
