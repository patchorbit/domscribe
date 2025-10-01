import { describe, it, expect } from 'vitest';
import { FiberWalker } from './fiber-walker.js';
import type { ExtendedReactFiber } from './types.js';
import { REACT_FIBER_TAGS } from '../utils/constants.js';

function createFiber(
  overrides: Partial<ExtendedReactFiber> = {},
): ExtendedReactFiber {
  return {
    tag: REACT_FIBER_TAGS.FunctionComponent,
    memoizedProps: {},
    ...overrides,
  };
}

describe('FiberWalker', () => {
  describe('findNearestComponentFiber', () => {
    it('should return the fiber itself if it is a component', () => {
      const walker = new FiberWalker();
      const fiber = createFiber({ tag: REACT_FIBER_TAGS.FunctionComponent });

      const result = walker.findNearestComponentFiber(fiber);

      expect(result).toBe(fiber);
    });

    it('should walk up to find a component fiber', () => {
      const walker = new FiberWalker();
      const parentComponent = createFiber({
        tag: REACT_FIBER_TAGS.ClassComponent,
      });
      const hostFiber = createFiber({
        tag: REACT_FIBER_TAGS.HostComponent,
        return: parentComponent,
      });

      const result = walker.findNearestComponentFiber(hostFiber);

      expect(result).toBe(parentComponent);
    });

    it('should return null when no component fiber is found', () => {
      const walker = new FiberWalker();
      const hostRoot = createFiber({ tag: REACT_FIBER_TAGS.HostRoot });
      const hostFiber = createFiber({
        tag: REACT_FIBER_TAGS.HostComponent,
        return: hostRoot,
      });

      const result = walker.findNearestComponentFiber(hostFiber);

      expect(result).toBeNull();
    });

    it('should respect maxDepth limit', () => {
      const walker = new FiberWalker({ maxDepth: 2 });
      const component = createFiber({
        tag: REACT_FIBER_TAGS.FunctionComponent,
      });
      const host1 = createFiber({
        tag: REACT_FIBER_TAGS.HostComponent,
        return: component,
      });
      const host2 = createFiber({
        tag: REACT_FIBER_TAGS.HostComponent,
        return: host1,
      });
      const host3 = createFiber({
        tag: REACT_FIBER_TAGS.HostComponent,
        return: host2,
      });

      const result = walker.findNearestComponentFiber(host3);

      expect(result).toBeNull();
    });

    it('should find ForwardRef fibers', () => {
      const walker = new FiberWalker();
      const forwardRef = createFiber({ tag: REACT_FIBER_TAGS.ForwardRef });
      const host = createFiber({
        tag: REACT_FIBER_TAGS.HostComponent,
        return: forwardRef,
      });

      const result = walker.findNearestComponentFiber(host);

      expect(result).toBe(forwardRef);
    });

    it('should find MemoComponent fibers', () => {
      const walker = new FiberWalker();
      const memo = createFiber({ tag: REACT_FIBER_TAGS.MemoComponent });
      const host = createFiber({
        tag: REACT_FIBER_TAGS.HostComponent,
        return: memo,
      });

      const result = walker.findNearestComponentFiber(host);

      expect(result).toBe(memo);
    });

    it('should find SimpleMemoComponent fibers', () => {
      const walker = new FiberWalker();
      const simpleMemo = createFiber({
        tag: REACT_FIBER_TAGS.SimpleMemoComponent,
      });
      const host = createFiber({
        tag: REACT_FIBER_TAGS.HostComponent,
        return: simpleMemo,
      });

      const result = walker.findNearestComponentFiber(host);

      expect(result).toBe(simpleMemo);
    });
  });

  describe('getChildren', () => {
    it('should return empty array when fiber has no children', () => {
      const walker = new FiberWalker();
      const fiber = createFiber();

      const children = walker.getChildren(fiber);

      expect(children).toEqual([]);
    });

    it('should collect all sibling children', () => {
      const walker = new FiberWalker();
      const child1 = createFiber({ tag: REACT_FIBER_TAGS.FunctionComponent });
      const child2 = createFiber({ tag: REACT_FIBER_TAGS.ClassComponent });
      child1.sibling = child2;
      const parent = createFiber({ child: child1 });

      const children = walker.getChildren(parent);

      expect(children).toHaveLength(2);
      expect(children).toContain(child1);
      expect(children).toContain(child2);
    });

    it('should exclude host components by default', () => {
      const walker = new FiberWalker();
      const componentChild = createFiber({
        tag: REACT_FIBER_TAGS.FunctionComponent,
      });
      const hostChild = createFiber({ tag: REACT_FIBER_TAGS.HostComponent });
      componentChild.sibling = hostChild;
      const parent = createFiber({ child: componentChild });

      const children = walker.getChildren(parent);

      expect(children).toHaveLength(1);
      expect(children[0]).toBe(componentChild);
    });

    it('should include host components when option is set', () => {
      const walker = new FiberWalker();
      const componentChild = createFiber({
        tag: REACT_FIBER_TAGS.FunctionComponent,
      });
      const hostChild = createFiber({ tag: REACT_FIBER_TAGS.HostComponent });
      componentChild.sibling = hostChild;
      const parent = createFiber({ child: componentChild });

      const children = walker.getChildren(parent, { includeHost: true });

      expect(children).toHaveLength(2);
    });

    it('should exclude text nodes by default', () => {
      const walker = new FiberWalker();
      const textChild = createFiber({ tag: REACT_FIBER_TAGS.HostText });
      const parent = createFiber({ child: textChild });

      const children = walker.getChildren(parent);

      expect(children).toHaveLength(0);
    });

    it('should include text nodes when option is set', () => {
      const walker = new FiberWalker();
      const textChild = createFiber({ tag: REACT_FIBER_TAGS.HostText });
      const parent = createFiber({ child: textChild });

      const children = walker.getChildren(parent, { includeText: true });

      expect(children).toHaveLength(1);
    });

    it('should exclude system components by default', () => {
      const walker = new FiberWalker();
      const suspense = createFiber({
        tag: REACT_FIBER_TAGS.SuspenseComponent,
      });
      const parent = createFiber({ child: suspense });

      const children = walker.getChildren(parent);

      expect(children).toHaveLength(0);
    });

    it('should include system components when option is set', () => {
      const walker = new FiberWalker();
      const suspense = createFiber({
        tag: REACT_FIBER_TAGS.SuspenseComponent,
      });
      const parent = createFiber({ child: suspense });

      const children = walker.getChildren(parent, { includeSystem: true });

      expect(children).toHaveLength(1);
    });

    it('should exclude all system component types by default', () => {
      const walker = new FiberWalker();
      const systemTags = [
        REACT_FIBER_TAGS.Mode,
        REACT_FIBER_TAGS.ContextConsumer,
        REACT_FIBER_TAGS.ContextProvider,
        REACT_FIBER_TAGS.Profiler,
        REACT_FIBER_TAGS.SuspenseComponent,
        REACT_FIBER_TAGS.SuspenseListComponent,
        REACT_FIBER_TAGS.OffscreenComponent,
        REACT_FIBER_TAGS.LegacyHiddenComponent,
        REACT_FIBER_TAGS.CacheComponent,
        REACT_FIBER_TAGS.TracingMarkerComponent,
      ];

      for (const tag of systemTags) {
        const child = createFiber({ tag });
        const parent = createFiber({ child });

        const children = walker.getChildren(parent);

        expect(children, `tag ${tag} should be excluded`).toHaveLength(0);
      }
    });

    it('should apply custom filter', () => {
      const walker = new FiberWalker();
      const child1 = createFiber({
        tag: REACT_FIBER_TAGS.FunctionComponent,
        key: 'keep',
      });
      const child2 = createFiber({
        tag: REACT_FIBER_TAGS.FunctionComponent,
        key: 'skip',
      });
      child1.sibling = child2;
      const parent = createFiber({ child: child1 });

      const children = walker.getChildren(parent, {
        filter: (f) => f.key === 'keep',
      });

      expect(children).toHaveLength(1);
      expect(children[0].key).toBe('keep');
    });
  });
});
