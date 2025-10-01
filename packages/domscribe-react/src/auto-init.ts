/**
 * Auto-initializing entry point for React adapter.
 *
 * Importing this module automatically initializes RuntimeManager with ReactAdapter.
 * Used by the webpack plugin which adds this as an entry point.
 *
 * When used with the webpack plugin, `__DOMSCRIBE_RUNTIME_OPTIONS__` and
 * `__DOMSCRIBE_ADAPTER_OPTIONS__` are injected via DefinePlugin. Falls back
 * to empty objects when not defined (e.g. direct import without the plugin).
 *
 * @module @domscribe/react/auto-init
 */
import { RuntimeManager } from '@domscribe/runtime';
import { createReactAdapter } from './adapter/react-adapter.js';

declare const __DOMSCRIBE_RUNTIME_OPTIONS__:
  | Record<string, unknown>
  | undefined;
declare const __DOMSCRIBE_ADAPTER_OPTIONS__:
  | Record<string, unknown>
  | undefined;

try {
  const runtimeOpts =
    typeof __DOMSCRIBE_RUNTIME_OPTIONS__ !== 'undefined'
      ? __DOMSCRIBE_RUNTIME_OPTIONS__
      : {};
  const adapterOpts =
    typeof __DOMSCRIBE_ADAPTER_OPTIONS__ !== 'undefined'
      ? __DOMSCRIBE_ADAPTER_OPTIONS__
      : {};

  // Reconstruct hookNameResolvers from plain object to Map<string, Map<number, string>>
  const rawResolvers = adapterOpts.hookNameResolvers as
    | Record<string, Record<number, string>>
    | undefined;
  const hookNameResolvers = rawResolvers
    ? new Map(
        Object.entries(rawResolvers).map(([k, v]) => [
          k,
          new Map(Object.entries(v).map(([i, n]) => [Number(i), n])),
        ]),
      )
    : undefined;

  RuntimeManager.getInstance().initialize({
    ...runtimeOpts,
    adapter: createReactAdapter({
      ...adapterOpts,
      hookNameResolvers,
    }),
  });
} catch (e) {
  console.warn(
    '[domscribe] Failed to auto-init React runtime:',
    e instanceof Error ? e.message : String(e),
  );
}
