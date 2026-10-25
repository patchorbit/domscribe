/**
 * FiberWalker - Navigate the React Fiber tree safely
 *
 * Provides utilities for traversing the React Fiber tree structure,
 * finding specific nodes, and analyzing relationships between fibers.
 *
 * @module @domscribe/react/fiber/fiber-walker
 */

import type { ExtendedReactFiber, FiberWalkOptions } from './types.js';
import { DEFAULT_OPTIONS, REACT_FIBER_TAGS } from '../utils/constants.js';

/**
 * FiberWalker class for navigating the React Fiber tree
 */
export class FiberWalker {
  private readonly maxDepth: number;

  constructor(options?: { maxDepth?: number }) {
    this.maxDepth = options?.maxDepth ?? DEFAULT_OPTIONS.MAX_TREE_DEPTH;
  }

  /**
   * Find nearest component fiber (walking up the tree)
   *
   * @param fiber - Starting fiber node
   * @returns Nearest component fiber or null
   */
  findNearestComponentFiber(
    fiber: ExtendedReactFiber,
  ): ExtendedReactFiber | null {
    const component = this.walkUp(fiber, (f) => this.isComponentFiber(f));
    return component ? this.findCurrentFiber(component) : null;
  }

  /**
   * Get all child fibers
   *
   * @param fiber - Parent fiber node
   * @param options - Walk options
   * @returns Array of child fibers
   */
  getChildren(
    fiber: ExtendedReactFiber,
    options?: FiberWalkOptions,
  ): ExtendedReactFiber[] {
    const children: ExtendedReactFiber[] = [];
    let child = fiber.child;

    while (child) {
      if (this.shouldIncludeFiber(child, options)) {
        children.push(child);
      }
      child = child.sibling;
    }

    return children;
  }

  // Private helpers

  /**
   * Resolve a fiber's committed alternate. DOM nodes can keep the original
   * fiber after React swaps its current and work-in-progress trees.
   *
   * Return pointers alone are insufficient after a bailout: parent alternates
   * can share a child list, or both child alternates can point to one parent.
   * Follow child membership in those cases, then use the root's current pointer.
   */
  private findCurrentFiber(fiber: ExtendedReactFiber): ExtendedReactFiber {
    const alternate = fiber.alternate;
    if (!alternate) {
      return fiber;
    }

    let first = fiber;
    let second = alternate;
    // Root selection must cross every framework provider, independently of
    // the component search depth. Detect cycles instead of truncating a valid
    // deep tree before reaching its committed root.
    const visited = new Set<ExtendedReactFiber>();
    while (!visited.has(first)) {
      visited.add(first);
      const parentFirst = first.return;
      if (!parentFirst) {
        const root = first.stateNode;
        if (
          first.tag === REACT_FIBER_TAGS.HostRoot &&
          typeof root === 'object' &&
          root !== null &&
          'current' in root &&
          root.current !== first &&
          first.alternate &&
          root.current === first.alternate
        ) {
          return alternate;
        }
        return fiber;
      }

      const parentSecond = parentFirst.alternate;
      if (!parentSecond) {
        // Hidden Suspense trees can insert a fragment with no alternate.
        const nextParent = parentFirst.return;
        if (!nextParent) {
          return fiber;
        }
        first = second = nextParent;
        continue;
      }

      if (parentFirst.child === parentSecond.child) {
        const child = this.findBranchChild(parentFirst, first, second);
        return child === second && child !== first ? alternate : fiber;
      }

      if (first.return !== second.return) {
        first = parentFirst;
        second = parentSecond;
        continue;
      }

      const firstChild = this.findBranchChild(parentFirst, first, second);
      if (firstChild) {
        const firstBelongsToFirstParent = firstChild === first;
        first = firstBelongsToFirstParent ? parentFirst : parentSecond;
        second = firstBelongsToFirstParent ? parentSecond : parentFirst;
        continue;
      }

      const secondChild = this.findBranchChild(parentSecond, first, second);
      if (!secondChild) {
        return fiber;
      }
      const firstBelongsToSecondParent = secondChild === first;
      first = firstBelongsToSecondParent ? parentSecond : parentFirst;
      second = firstBelongsToSecondParent ? parentFirst : parentSecond;
    }

    // Keep inspection safe for disconnected or unfamiliar Fiber structures.
    return fiber;
  }

  private findBranchChild(
    parent: ExtendedReactFiber,
    first: ExtendedReactFiber,
    second: ExtendedReactFiber,
  ): ExtendedReactFiber | undefined {
    let child = parent.child;
    const visited = new Set<ExtendedReactFiber>();
    while (child && !visited.has(child)) {
      if (child === first || child === second) {
        return child;
      }
      visited.add(child);
      child = child.sibling;
    }
    return undefined;
  }

  /**
   * Walk up the Fiber tree from a starting fiber
   */
  private walkUp(
    fiber: ExtendedReactFiber,
    predicate: (fiber: ExtendedReactFiber) => boolean,
  ): ExtendedReactFiber | null {
    let current: ExtendedReactFiber | undefined = fiber;
    let depth = 0;

    while (current && depth < this.maxDepth) {
      if (predicate(current)) {
        return current;
      }

      current = current.return;
      depth++;
    }

    return null;
  }

  /**
   * Check if a fiber should be included based on options
   */
  private shouldIncludeFiber(
    fiber: ExtendedReactFiber,
    options?: FiberWalkOptions,
  ): boolean {
    // Apply custom filter if provided
    if (options?.filter && !options.filter(fiber)) {
      return false;
    }

    // Check fiber type inclusions
    if (!options?.includeHost && this.isHostComponent(fiber)) {
      return false;
    }

    if (!options?.includeText && this.isTextNode(fiber)) {
      return false;
    }

    if (!options?.includeSystem && this.isSystemComponent(fiber)) {
      return false;
    }

    return true;
  }

  /**
   * Check if a fiber is a component (not host/text)
   */
  private isComponentFiber(fiber: ExtendedReactFiber): boolean {
    return (
      fiber.tag === REACT_FIBER_TAGS.FunctionComponent ||
      fiber.tag === REACT_FIBER_TAGS.ClassComponent ||
      fiber.tag === REACT_FIBER_TAGS.ForwardRef ||
      fiber.tag === REACT_FIBER_TAGS.MemoComponent ||
      fiber.tag === REACT_FIBER_TAGS.SimpleMemoComponent
    );
  }

  /**
   * Check if a fiber is a host component (DOM element)
   */
  private isHostComponent(fiber: ExtendedReactFiber): boolean {
    return fiber.tag === REACT_FIBER_TAGS.HostComponent;
  }

  /**
   * Check if a fiber is a text node
   */
  private isTextNode(fiber: ExtendedReactFiber): boolean {
    return fiber.tag === REACT_FIBER_TAGS.HostText;
  }

  /**
   * Check if a fiber is a system component
   */
  private isSystemComponent(fiber: ExtendedReactFiber): boolean {
    return (
      fiber.tag === REACT_FIBER_TAGS.Mode ||
      fiber.tag === REACT_FIBER_TAGS.ContextConsumer ||
      fiber.tag === REACT_FIBER_TAGS.ContextProvider ||
      fiber.tag === REACT_FIBER_TAGS.Profiler ||
      fiber.tag === REACT_FIBER_TAGS.SuspenseComponent ||
      fiber.tag === REACT_FIBER_TAGS.SuspenseListComponent ||
      fiber.tag === REACT_FIBER_TAGS.OffscreenComponent ||
      fiber.tag === REACT_FIBER_TAGS.LegacyHiddenComponent ||
      fiber.tag === REACT_FIBER_TAGS.CacheComponent ||
      fiber.tag === REACT_FIBER_TAGS.TracingMarkerComponent
    );
  }
}
