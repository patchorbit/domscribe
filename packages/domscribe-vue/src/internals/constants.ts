/**
 * Internal constants for Vue adapter
 * NOT exported from the package.
 *
 * @internal
 * @module @domscribe/vue/internals/constants
 */

/**
 * Vue DevTools global hook key
 * @internal
 */
export const DEVTOOLS_HOOK_KEY = '__VUE_DEVTOOLS_GLOBAL_HOOK__';

/**
 * Vue internal element keys (attached to DOM elements)
 * @internal
 */
export const VUE_ELEMENT_KEYS = {
  /**
   * VNode reference on DOM element
   */
  VNODE: '__vnode',

  /**
   * Parent component reference on DOM element
   */
  PARENT_COMPONENT: '__vueParentComponent',
} as const;

/**
 * Props to filter out when extracting component props
 * These are Vue internal props that shouldn't be exposed
 * @internal
 */
export const VUE_INTERNAL_PROPS = new Set([
  'key',
  'ref',
  'ref_for',
  'ref_key',
  'onVnodeBeforeMount',
  'onVnodeMounted',
  'onVnodeBeforeUpdate',
  'onVnodeUpdated',
  'onVnodeBeforeUnmount',
  'onVnodeUnmounted',
]);

/**
 * State keys to filter out when extracting component state
 * @internal
 */
export const VUE_INTERNAL_STATE_KEYS = new Set([
  '__v_isRef',
  '__v_isShallow',
  '__v_isReadonly',
  '__v_raw',
  '__v_skip',
]);

/**
 * Default adapter options
 * @internal
 */
export const DEFAULT_OPTIONS = {
  maxTreeDepth: 50,
  debug: false,
} as const;
