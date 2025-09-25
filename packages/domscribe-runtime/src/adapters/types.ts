/**
 * Adapter-specific types
 * @module @domscribe/runtime/adapters/types
 */

/**
 * Component tree node for hierarchical representation
 */
export interface ComponentTreeNode {
  /**
   * Component name
   */
  name: string;

  /**
   * Component instance
   */
  instance: unknown;

  /**
   * Parent component node
   */
  parent?: ComponentTreeNode;

  /**
   * Child component nodes
   */
  children?: ComponentTreeNode[];

  /**
   * Props for this component
   */
  props?: Record<string, unknown>;

  /**
   * State for this component
   */
  state?: Record<string, unknown>;
}

// Re-export Nullable from core for local consumers
export type { Nullable } from '@domscribe/core';
