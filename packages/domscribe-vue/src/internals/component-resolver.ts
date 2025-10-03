/**
 * Component resolver - resolves Vue component instances from DOM elements
 * NOT exported from the package.
 *
 * @internal
 * @module @domscribe/vue/internals/component-resolver
 */

import type {
  VueComponentInstance,
  VueVNode,
  ComponentResolutionResult,
  Nullable,
} from './types.js';
import { VUE_ELEMENT_KEYS } from './constants.js';
import {
  isVueComponentInstance,
  isVueVNode,
  isHTMLElement,
} from './type-guards.js';
import { ComponentResolutionError } from '../errors/index.js';

/**
 * Resolve Vue component instance from a DOM element
 *
 * Uses Vue's internal DOM-attached VNode/component references.
 * Vue does not expose a DevTools-based DOM-to-component API,
 * so VNode access is the only resolution mechanism.
 *
 * @param element - The DOM element to resolve
 * @returns Resolution result with component instance or error
 * @internal
 */
export function resolveComponentFromElement(
  element: HTMLElement,
): ComponentResolutionResult {
  try {
    // Try to get component from the element directly
    let instance = getComponentFromElement(element);

    // If not found, walk up the DOM tree
    if (!instance) {
      instance = findComponentInAncestors(element);
    }

    if (instance) {
      return {
        success: true,
        instance,
      };
    }

    return {
      success: false,
      error: new ComponentResolutionError(
        'No Vue component found on element or ancestors',
      ),
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error
          : new ComponentResolutionError('Component resolution failed'),
    };
  }
}

/**
 * Get Vue component instance directly from a DOM element
 * @internal
 */
function getComponentFromElement(
  element: HTMLElement,
): Nullable<VueComponentInstance> {
  // Method 1: __vnode property
  const vnode = getVNodeFromElement(element);
  if (vnode?.component && isVueComponentInstance(vnode.component)) {
    return vnode.component;
  }

  // Method 2: __vueParentComponent property
  const parentComponent = (element as unknown as Record<string, unknown>)[
    VUE_ELEMENT_KEYS.PARENT_COMPONENT
  ];
  if (isVueComponentInstance(parentComponent)) {
    return parentComponent;
  }

  return null;
}

/**
 * Get VNode from a DOM element
 * @internal
 */
function getVNodeFromElement(element: HTMLElement): Nullable<VueVNode> {
  const vnode = (element as unknown as Record<string, unknown>)[
    VUE_ELEMENT_KEYS.VNODE
  ];
  if (isVueVNode(vnode)) {
    return vnode;
  }
  return null;
}

/**
 * Walk up the DOM tree to find the nearest Vue component
 * @internal
 */
function findComponentInAncestors(
  element: HTMLElement,
): Nullable<VueComponentInstance> {
  let current: Nullable<Element> = element.parentElement;
  let depth = 0;
  const maxDepth = 100; // Prevent infinite loops

  while (current && depth < maxDepth) {
    if (isHTMLElement(current)) {
      const instance = getComponentFromElement(current);
      if (instance) {
        return instance;
      }
    }
    current = current.parentElement;
    depth++;
  }

  return null;
}

/**
 * Check if VNode access is available on any element
 * @internal
 */
export function checkVNodeAccess(): boolean {
  if (typeof document === 'undefined') {
    return false;
  }

  // Check a sample of elements for Vue VNode keys
  const elements = document.querySelectorAll('*');
  const sampleSize = Math.min(elements.length, 50);

  for (let i = 0; i < sampleSize; i++) {
    const element = elements[i];
    if (isHTMLElement(element)) {
      if (
        VUE_ELEMENT_KEYS.VNODE in element ||
        VUE_ELEMENT_KEYS.PARENT_COMPONENT in element
      ) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Find nearest user component (skip internal Vue components)
 * @internal
 */
export function findNearestUserComponent(
  instance: VueComponentInstance,
): Nullable<VueComponentInstance> {
  let current: Nullable<VueComponentInstance> = instance;
  let depth = 0;
  const maxDepth = 50;

  while (current && depth < maxDepth) {
    const name = getComponentNameFromInstance(current);

    // Skip Vue internal components (start with uppercase and common patterns)
    if (name && !isInternalComponent(name)) {
      return current;
    }

    current = current.parent;
    depth++;
  }

  // If no user component found, return the original
  return instance;
}

/**
 * Get component name from instance
 * @internal
 */
function getComponentNameFromInstance(
  instance: VueComponentInstance,
): Nullable<string> {
  const type = instance.type;

  if (typeof type === 'string') {
    return type;
  }

  if (typeof type === 'function') {
    return type.name || null;
  }

  if (typeof type === 'object' && type !== null) {
    return type.name || type.__name || type.displayName || null;
  }

  return null;
}

/**
 * Check if a component name is an internal Vue component
 * @internal
 */
function isInternalComponent(name: string): boolean {
  const internalPatterns = [
    /^Transition$/,
    /^TransitionGroup$/,
    /^KeepAlive$/,
    /^Teleport$/,
    /^Suspense$/,
    /^Fragment$/,
    /^BaseTransition$/,
  ];

  return internalPatterns.some((pattern) => pattern.test(name));
}
