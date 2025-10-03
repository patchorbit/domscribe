/**
 * Internal type guards for Vue structures
 * NOT exported from the package.
 *
 * @internal
 * @module @domscribe/vue/internals/type-guards
 */

import type {
  VueVNode,
  VueComponentInstance,
  VueDevToolsHook,
  VueComponentType,
} from './types.js';

/**
 * Check if a value is a plain object (record)
 * @internal
 */
export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Check if a value is a Vue VNode
 * @internal
 */
export function isVueVNode(value: unknown): value is VueVNode {
  return (
    isRecord(value) &&
    'type' in value &&
    'props' in value &&
    'shapeFlag' in value &&
    typeof value.shapeFlag === 'number'
  );
}

/**
 * Check if a value is a Vue component instance
 * @internal
 */
export function isVueComponentInstance(
  value: unknown,
): value is VueComponentInstance {
  return (
    isRecord(value) &&
    'uid' in value &&
    typeof value.uid === 'number' &&
    'vnode' in value &&
    'type' in value &&
    'proxy' in value &&
    'setupState' in value
  );
}

/**
 * Check if a value is a Vue component type (definition)
 * @internal
 */
export function isVueComponentType(value: unknown): value is VueComponentType {
  if (!isRecord(value)) {
    return false;
  }

  // A component type has at least one of: setup, render, template, or name
  return (
    'setup' in value ||
    'render' in value ||
    'template' in value ||
    'name' in value ||
    '__name' in value
  );
}

/**
 * Check if a value is the Vue DevTools hook
 * @internal
 */
export function isVueDevToolsHook(value: unknown): value is VueDevToolsHook {
  return (
    isRecord(value) &&
    'apps' in value &&
    'on' in value &&
    typeof value.on === 'function' &&
    'emit' in value &&
    typeof value.emit === 'function'
  );
}

/**
 * Check if an element has Vue VNode attached
 * @internal
 */
export function hasVueVNode(element: HTMLElement): boolean {
  return '__vnode' in element || '__vueParentComponent' in element;
}

/**
 * Check if a value is a Vue reactive ref
 * @internal
 */
export function isVueRef(value: unknown): value is { value: unknown } {
  return isRecord(value) && '__v_isRef' in value && value.__v_isRef === true;
}

/**
 * Check if a value is a Vue reactive object
 * @internal
 */
export function isVueReactive(value: unknown): boolean {
  return isRecord(value) && '__v_isReactive' in value;
}

/**
 * Check if a component instance is a function component (setup-based)
 * @internal
 */
export function isFunctionComponent(instance: VueComponentInstance): boolean {
  return (
    typeof instance.type === 'function' ||
    (isRecord(instance.type) && typeof instance.type.setup === 'function')
  );
}

/**
 * Check if a component instance uses Options API
 * @internal
 */
export function isOptionsComponent(instance: VueComponentInstance): boolean {
  return (
    isRecord(instance.type) &&
    (typeof instance.type.data === 'function' ||
      isRecord(instance.type.computed) ||
      isRecord(instance.type.methods))
  );
}

/**
 * Check if a node is an HTMLElement
 * @internal
 */
export function isHTMLElement(node: unknown): node is HTMLElement {
  return (
    typeof node === 'object' &&
    node !== null &&
    'nodeType' in node &&
    (node as Node).nodeType === Node.ELEMENT_NODE
  );
}
