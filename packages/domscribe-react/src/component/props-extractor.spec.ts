import { describe, it, expect } from 'vitest';
import { PropsExtractor } from './props-extractor.js';
import type { ExtendedReactFiber } from '../fiber/types.js';
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

describe('PropsExtractor', () => {
  let extractor: PropsExtractor;

  beforeEach(() => {
    extractor = new PropsExtractor();
  });

  describe('extract', () => {
    it('should return failure for null fiber', () => {
      const result = extractor.extract(null as unknown as ExtendedReactFiber);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should return empty props when fiber has no props', () => {
      const fiber = createFiber({ memoizedProps: undefined });

      const result = extractor.extract(fiber);

      expect(result.success).toBe(true);
      expect(result.props).toEqual({});
      expect(result.filteredKeys).toEqual([]);
    });

    it('should extract user props', () => {
      const fiber = createFiber({
        memoizedProps: {
          className: 'btn',
          onClick: () => {
            //
          },
          disabled: false,
        },
      });

      const result = extractor.extract(fiber);

      expect(result.success).toBe(true);
      expect(result.props).toHaveProperty('className', 'btn');
      expect(result.props).toHaveProperty('disabled', false);
      expect(result.props).toHaveProperty('onClick');
    });

    it('should filter out internal React props', () => {
      const fiber = createFiber({
        memoizedProps: {
          className: 'test',
          children: 'Hello',
          key: 'item-1',
          ref: {},
          __self: {},
          __source: {},
          __owner: {},
          _owner: {},
          _store: {},
          $$typeof: Symbol.for('react.element'),
        },
      });

      const result = extractor.extract(fiber);

      expect(result.success).toBe(true);
      expect(result.props).toEqual({ className: 'test' });
      expect(result.filteredKeys).toContain('children');
      expect(result.filteredKeys).toContain('key');
      expect(result.filteredKeys).toContain('ref');
      expect(result.filteredKeys).toContain('__self');
      expect(result.filteredKeys).toContain('__source');
      expect(result.filteredKeys).toContain('$$typeof');
    });

    it('should filter props starting with __', () => {
      const fiber = createFiber({
        memoizedProps: {
          title: 'hello',
          __customInternal: 'secret',
          __anotherInternal: true,
        },
      });

      const result = extractor.extract(fiber);

      expect(result.success).toBe(true);
      expect(result.props).toEqual({ title: 'hello' });
      expect(result.filteredKeys).toContain('__customInternal');
      expect(result.filteredKeys).toContain('__anotherInternal');
    });

    it('should fall back to pendingProps when memoizedProps is absent', () => {
      const fiber = createFiber({
        memoizedProps: undefined,
        pendingProps: { value: 42 },
      });

      const result = extractor.extract(fiber);

      expect(result.success).toBe(true);
      expect(result.props).toEqual({ value: 42 });
    });

    it('should prefer memoizedProps over pendingProps', () => {
      const fiber = createFiber({
        memoizedProps: { current: 'a' },
        pendingProps: { current: 'b' },
      });

      const result = extractor.extract(fiber);

      expect(result.success).toBe(true);
      expect(result.props).toEqual({ current: 'a' });
    });

    it('should return null props when memoizedProps is an array', () => {
      const fiber = createFiber({
        memoizedProps: [1, 2, 3] as unknown as Record<string, unknown>,
      });

      const result = extractor.extract(fiber);

      expect(result.success).toBe(true);
      expect(result.props).toEqual({});
    });

    it('should return null props when memoizedProps is a primitive', () => {
      const fiber = createFiber({
        memoizedProps: 'string' as unknown as Record<string, unknown>,
      });

      const result = extractor.extract(fiber);

      expect(result.success).toBe(true);
      expect(result.props).toEqual({});
    });

    it('should handle extraction errors gracefully', () => {
      const fiber = createFiber({
        memoizedProps: new Proxy(
          {},
          {
            ownKeys() {
              throw new Error('proxy error');
            },
          },
        ) as Record<string, unknown>,
      });

      const result = extractor.extract(fiber);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });
});
