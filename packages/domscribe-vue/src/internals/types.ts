/**
 * Internal Vue type definitions
 * These types model Vue 3 internal structures for component inspection.
 * NOT exported from the package.
 *
 * @internal
 * @module @domscribe/vue/internals/types
 */

/**
 * Vue 3 VNode structure (simplified)
 * @internal
 */
export interface VueVNode {
  type: VueComponentType | string | symbol;
  props: Record<string, unknown> | null;
  children: unknown;
  component: VueComponentInstance | null;
  el: Node | null;
  key: string | number | symbol | null;
  ref: unknown;
  shapeFlag: number;
  patchFlag: number;
  dirs: unknown[] | null;
  anchor: Node | null;
  target: Element | null;
  targetAnchor: Node | null;
  suspense: unknown;
  ssContent: VueVNode | null;
  ssFallback: VueVNode | null;
}

/**
 * Vue 3 Component definition/type
 * @internal
 */
export interface VueComponentType {
  name?: string;
  __name?: string;
  displayName?: string;
  props?: Record<string, unknown>;
  emits?: string[] | Record<string, unknown>;
  setup?: (...args: unknown[]) => unknown;
  render?: (...args: unknown[]) => unknown;
  template?: string;
  components?: Record<string, VueComponentType>;
  data?: () => Record<string, unknown>;
  computed?: Record<string, unknown>;
  methods?: Record<string, unknown>;
  watch?: Record<string, unknown>;
  // Lifecycle hooks
  beforeCreate?: () => void;
  created?: () => void;
  beforeMount?: () => void;
  mounted?: () => void;
  beforeUpdate?: () => void;
  updated?: () => void;
  beforeUnmount?: () => void;
  unmounted?: () => void;
}

/**
 * Vue functional component type
 * @internal
 */
export type VueFunctionalComponent = ((...args: unknown[]) => unknown) & {
  name?: string;
  displayName?: string;
};

/**
 * Vue 3 Component instance (internal structure)
 * @internal
 */
export interface VueComponentInstance {
  uid: number;
  vnode: VueVNode;
  type: VueComponentType | VueFunctionalComponent | string;
  parent: VueComponentInstance | null;
  root: VueComponentInstance;
  appContext: VueAppContext;
  subTree: VueVNode;
  update: () => void;
  render: ((...args: unknown[]) => unknown) | null;
  proxy: VueComponentProxy | null;
  exposed: Record<string, unknown> | null;
  withProxy: VueComponentProxy | null;
  provides: Record<string | symbol, unknown>;
  accessCache: Record<string, number> | null;
  renderCache: unknown[];
  ctx: Record<string, unknown>;
  data: Record<string, unknown>;
  props: Record<string, unknown>;
  attrs: Record<string, unknown>;
  slots: Record<string, unknown>;
  refs: Record<string, unknown>;
  emit: (event: string, ...args: unknown[]) => void;
  setupState: Record<string, unknown>;
  setupContext: unknown;
  isMounted: boolean;
  isUnmounted: boolean;
  isDeactivated: boolean;
  // Lifecycle hooks (abbreviated internal names)
  bc: (() => void)[] | null; // beforeCreate
  c: (() => void)[] | null; // created
  bm: (() => void)[] | null; // beforeMount
  m: (() => void)[] | null; // mounted
  bu: (() => void)[] | null; // beforeUpdate
  u: (() => void)[] | null; // updated
  bum: (() => void)[] | null; // beforeUnmount
  um: (() => void)[] | null; // unmounted
}

/**
 * Vue component proxy (public instance)
 * @internal
 */
export interface VueComponentProxy {
  $el: Element | null;
  $data: Record<string, unknown>;
  $props: Record<string, unknown>;
  $attrs: Record<string, unknown>;
  $refs: Record<string, unknown>;
  $slots: Record<string, unknown>;
  $root: VueComponentProxy;
  $parent: VueComponentProxy | null;
  $emit: (event: string, ...args: unknown[]) => void;
  $forceUpdate: () => void;
  $nextTick: (fn?: () => void) => Promise<void>;
  $watch: (
    source: string | (() => unknown),
    callback: (newVal: unknown, oldVal: unknown) => void,
    options?: Record<string, unknown>,
  ) => () => void;
  $options: VueComponentType;
  [key: string]: unknown;
}

/**
 * Vue App context
 * @internal
 */
export interface VueAppContext {
  app: VueApp;
  config: VueAppConfig;
  mixins: unknown[];
  components: Record<string, VueComponentType>;
  directives: Record<string, unknown>;
  provides: Record<string | symbol, unknown>;
}

/**
 * Vue App instance
 * @internal
 */
export interface VueApp {
  version: string;
  config: VueAppConfig;
  use: (plugin: unknown, ...options: unknown[]) => VueApp;
  mixin: (mixin: unknown) => VueApp;
  component: (
    name: string,
    component?: VueComponentType,
  ) => VueComponentType | VueApp;
  directive: (name: string, directive?: unknown) => unknown | VueApp;
  mount: (rootContainer: Element | string) => VueComponentProxy;
  unmount: () => void;
  provide: (key: string | symbol, value: unknown) => VueApp;
}

/**
 * Vue App config
 * @internal
 */
export interface VueAppConfig {
  errorHandler?: (err: unknown, instance: unknown, info: string) => void;
  warnHandler?: (msg: string, instance: unknown, trace: string) => void;
  globalProperties: Record<string, unknown>;
  isNativeTag?: (tag: string) => boolean;
  performance: boolean;
  compilerOptions: Record<string, unknown>;
}

/**
 * Vue DevTools global hook
 * @internal
 */
export interface VueDevToolsHook {
  enabled: boolean;
  apps: Map<number, VueApp>;
  appRecords: VueAppRecord[];
  cleanupBuffer?: ((event: unknown) => boolean)[];
  on: (event: string, fn: (...args: unknown[]) => void) => void;
  off: (event: string, fn: (...args: unknown[]) => void) => void;
  emit: (event: string, ...args: unknown[]) => void;
}

/**
 * Vue DevTools app record
 * @internal
 */
export interface VueAppRecord {
  id: number;
  app: VueApp;
  version: string;
  types: Record<string, unknown>;
}

/**
 * Result of component resolution
 * @internal
 */
export interface ComponentResolutionResult {
  success: boolean;
  instance?: VueComponentInstance;
  error?: Error;
}

// Re-export Nullable from core for local consumers
export type { Nullable } from '@domscribe/core';
