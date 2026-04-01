/**
 * @domscribe/runtime - Browser-side runtime context capture
 * @module @domscribe/runtime
 */

// Main runtime manager
export { RuntimeManager } from './core/runtime-manager.js';

// Adapter system
export type {
  FrameworkAdapter,
  SerializationHints,
} from './adapters/adapter.interface.js';
export type { ComponentTreeNode } from './adapters/types.js';

// Bridge
export { BridgeDispatch } from './bridge/bridge-dispatch.js';
export type { IRuntimeTransport } from './bridge/transport.interface.js';

// Configuration types
export type { DomscribeRuntimeOptions } from './core/types.js';
export type { SerializationConstraints } from './capture/types.js';
