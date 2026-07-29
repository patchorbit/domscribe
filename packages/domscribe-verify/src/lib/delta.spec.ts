import { describe, it, expect } from 'vitest';
import type { BoundingRect } from '@domscribe/core';
import {
  RECT_EPSILON_PX,
  diffBoundingRects,
  diffStyleMaps,
  resolveVerdict,
} from './delta.js';

function createRect(overrides: Partial<BoundingRect> = {}): BoundingRect {
  return {
    x: 100,
    y: 200,
    width: 320,
    height: 48,
    top: 200,
    right: 420,
    bottom: 248,
    left: 100,
    ...overrides,
  };
}

describe('diffStyleMaps', () => {
  it('should return no deltas for identical maps', () => {
    // Arrange
    const styles = { padding: '8px', color: 'rgb(0, 0, 0)' };

    // Act
    const deltas = diffStyleMaps(styles, { ...styles });

    // Assert
    expect(deltas).toEqual([]);
  });

  it('should report a changed value with before and after', () => {
    // Arrange
    const before = { padding: '8px', color: 'rgb(0, 0, 0)' };
    const after = { padding: '12px', color: 'rgb(0, 0, 0)' };

    // Act
    const deltas = diffStyleMaps(before, after);

    // Assert
    expect(deltas).toEqual([
      { property: 'padding', before: '8px', after: '12px' },
    ]);
  });

  it('should report a removed property with after null', () => {
    // Arrange
    const before = { 'box-shadow': '0 1px 2px rgba(0,0,0,0.2)' };
    const after = {};

    // Act
    const deltas = diffStyleMaps(before, after);

    // Assert
    expect(deltas).toEqual([
      {
        property: 'box-shadow',
        before: '0 1px 2px rgba(0,0,0,0.2)',
        after: null,
      },
    ]);
  });

  it('should report an added property with before null', () => {
    // Arrange
    const before = {};
    const after = { gap: '16px' };

    // Act
    const deltas = diffStyleMaps(before, after);

    // Assert
    expect(deltas).toEqual([{ property: 'gap', before: null, after: '16px' }]);
  });
});

describe('diffBoundingRects', () => {
  it('should return no deltas for identical rects', () => {
    // Arrange
    const rect = createRect();

    // Act
    const deltas = diffBoundingRects(rect, createRect());

    // Assert
    expect(deltas).toEqual([]);
  });

  it('should ignore sub-epsilon jitter', () => {
    // Arrange
    const before = createRect();
    const after = createRect({ width: 320 + RECT_EPSILON_PX });

    // Act
    const deltas = diffBoundingRects(before, after);

    // Assert
    expect(deltas).toEqual([]);
  });

  it('should report fields that moved beyond epsilon', () => {
    // Arrange
    const before = createRect();
    const after = createRect({ width: 328, right: 428 });

    // Act
    const deltas = diffBoundingRects(before, after);

    // Assert
    expect(deltas).toEqual([
      { field: 'width', before: 320, after: 328 },
      { field: 'right', before: 420, after: 428 },
    ]);
  });

  it('should honor a custom epsilon', () => {
    // Arrange
    const before = createRect();
    const after = createRect({ height: 52 });

    // Act
    const deltas = diffBoundingRects(before, after, 10);

    // Assert
    expect(deltas).toEqual([]);
  });
});

describe('resolveVerdict', () => {
  const paddingDelta = { property: 'padding', before: '8px', after: '12px' };
  const colorDelta = {
    property: 'color',
    before: 'rgb(0, 0, 0)',
    after: 'rgb(255, 0, 0)',
  };
  const widthRectDelta = { field: 'width' as const, before: 320, after: 328 };

  it('should return no_change when nothing changed', () => {
    // Act
    const result = resolveVerdict({ styleDeltas: [], rectDeltas: [] });

    // Assert
    expect(result.verdict).toBe('no_change');
    expect(result.notes).toContain('did not affect the rendered element');
  });

  it('should return match with a caveat note when no expectations are declared', () => {
    // Act
    const result = resolveVerdict({
      styleDeltas: [paddingDelta],
      rectDeltas: [],
    });

    // Assert
    expect(result.verdict).toBe('match');
    expect(result.notes).toContain('change detection only');
  });

  it('should return match without notes when all expectations are met exactly', () => {
    // Act
    const result = resolveVerdict({
      styleDeltas: [paddingDelta],
      rectDeltas: [widthRectDelta],
      expectedChanges: [{ property: 'padding', value: '12px' }],
    });

    // Assert
    expect(result.verdict).toBe('match');
    expect(result.notes).toBeUndefined();
  });

  it('should treat an expectation without a value as met when the property changed', () => {
    // Act
    const result = resolveVerdict({
      styleDeltas: [paddingDelta],
      rectDeltas: [],
      expectedChanges: [{ property: 'padding' }],
    });

    // Assert
    expect(result.verdict).toBe('match');
  });

  it('should return partial when expectations are met but other properties changed', () => {
    // Act
    const result = resolveVerdict({
      styleDeltas: [paddingDelta, colorDelta],
      rectDeltas: [],
      expectedChanges: [{ property: 'padding', value: '12px' }],
    });

    // Assert
    expect(result.verdict).toBe('partial');
    expect(result.notes).toContain('unexpected properties also changed: color');
  });

  it('should return partial when only some expectations are met', () => {
    // Act
    const result = resolveVerdict({
      styleDeltas: [paddingDelta],
      rectDeltas: [],
      expectedChanges: [
        { property: 'padding', value: '12px' },
        { property: 'color', value: 'rgb(255, 0, 0)' },
      ],
    });

    // Assert
    expect(result.verdict).toBe('partial');
    expect(result.notes).toContain('1/2 expected changes applied');
    expect(result.notes).toContain('unchanged: color');
  });

  it('should return partial when a property changed to the wrong value', () => {
    // Act
    const result = resolveVerdict({
      styleDeltas: [paddingDelta],
      rectDeltas: [],
      expectedChanges: [{ property: 'padding', value: '16px' }],
    });

    // Assert
    expect(result.verdict).toBe('partial');
    expect(result.notes).toContain('padding changed to "12px"');
    expect(result.notes).toContain('expected "16px"');
  });

  it('should return regression when nothing expected changed but other styles did', () => {
    // Act
    const result = resolveVerdict({
      styleDeltas: [colorDelta],
      rectDeltas: [],
      expectedChanges: [{ property: 'padding', value: '12px' }],
    });

    // Assert
    expect(result.verdict).toBe('regression');
    expect(result.notes).toContain('other properties changed: color');
  });

  it('should return regression when only geometry moved and expectations were unmet', () => {
    // Act
    const result = resolveVerdict({
      styleDeltas: [],
      rectDeltas: [widthRectDelta],
      expectedChanges: [{ property: 'padding', value: '12px' }],
    });

    // Assert
    expect(result.verdict).toBe('regression');
    expect(result.notes).toContain('only geometry changed: width');
  });
});
