
/**
 * Stub type declarations for template/registry files.
 *
 * These files live in _registry/, _templates/, and _shared/ and are copied
 * into fixture apps where the real dependencies are installed. This file
 * silences "Cannot find module" errors in the IDE for external imports.
 */

declare module 'react' {
  const _: unknown;
  export default _;
  export const useState: any;
  export const useEffect: any;
  export const useCallback: any;
  export const useRef: any;
  export const useId: any;
  export const useTransition: any;
  export const useDeferredValue: any;
  export const createContext: any;
  export const useContext: any;
  export const memo: any;
  export const forwardRef: any;
  export const lazy: any;
  export const Suspense: any;
  export const Fragment: any;
  export const Component: any;
  export const useImperativeHandle: any;
  export const isValidElement: any;
  export const Children: any;
  export const cloneElement: any;
  export type ReactElement = any;
  export type ReactNode = any;
  export type ComponentType<P = any> = any;
  export type CSSProperties = any;
}

declare module 'react-dom' {
  const _: unknown;
  export default _;
}

declare module 'react-dom/client' {
  const _: unknown;
  export default _;
}

declare module 'react/jsx-runtime' {
  const _: unknown;
  export default _;
}

declare module 'vue' {
  export const ref: any;
  export const reactive: any;
  export const computed: any;
  export const watch: any;
  export const watchEffect: any;
  export const watchPostEffect: any;
  export const onMounted: any;
  export const onUnmounted: any;
  export const onActivated: any;
  export const onDeactivated: any;
  export const onErrorCaptured: any;
  export const provide: any;
  export const inject: any;
  export const h: any;
  export const toRef: any;
  export const toRefs: any;
  export const shallowRef: any;
  export const triggerRef: any;
  export const defineAsyncComponent: any;
  export type Component = any;
  export type Ref<T = any> = { value: T };
  export type InjectionKey<T = any> = symbol;
  export type VNode = any;
  export type Directive = any;
  export type DirectiveBinding = any;
}

declare module 'next' {
  export type Metadata = any;
}

declare module 'next/*' {
  const mod: any;
  export default mod;
}

declare module 'vite' {
  export const defineConfig: any;
}

declare module '@vitejs/plugin-react' {
  const plugin: any;
  export default plugin;
}

declare module '@vitejs/plugin-vue' {
  const plugin: any;
  export default plugin;
}

declare module '*.vue' {
  const component: any;
  export default component;
}
