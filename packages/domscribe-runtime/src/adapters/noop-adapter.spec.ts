/**
 * Tests for NoopAdapter
 *
 * Tests the no-op fallback adapter that returns null for all operations.
 * Follows Arrange-Act-Assert methodology. No mocking needed as this is a pure class.
 *
 * @vitest-environment happy-dom
 */

import { describe, it, expect } from 'vitest';
import { NoopAdapter } from './noop-adapter.js';
import type { FrameworkAdapter } from './adapter.interface.js';

describe('NoopAdapter', () => {
  describe('Properties', () => {
    it('should have name set to "noop"', () => {
      // Arrange & Act
      const adapter = new NoopAdapter();

      // Assert
      expect(adapter.name).toBe('noop');
    });

    it('should have version set to undefined', () => {
      // Arrange & Act
      const adapter = new NoopAdapter();

      // Assert
      expect(adapter.version).toBeUndefined();
    });

    it('should implement FrameworkAdapter interface', () => {
      // Arrange & Act
      const adapter: FrameworkAdapter = new NoopAdapter();

      // Assert
      expect(typeof adapter.getComponentInstance).toBe('function');
      expect(typeof adapter.captureProps).toBe('function');
      expect(typeof adapter.captureState).toBe('function');
      expect(typeof adapter.getComponentName).toBe('function');
      expect(typeof adapter.getComponentTree).toBe('function');
    });
  });

  describe('getComponentInstance', () => {
    it('should return null for any element', () => {
      // Arrange
      const adapter = new NoopAdapter();
      const element = document.createElement('div');

      // Act
      const result = adapter.getComponentInstance(element);

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('captureProps', () => {
    it('should return null for any component', () => {
      // Arrange
      const adapter = new NoopAdapter();

      // Act & Assert
      expect(adapter.captureProps(null)).toBeNull();
      expect(adapter.captureProps({ type: 'Component' })).toBeNull();
    });
  });

  describe('captureState', () => {
    it('should return null for any component', () => {
      // Arrange
      const adapter = new NoopAdapter();

      // Act & Assert
      expect(adapter.captureState(null)).toBeNull();
      expect(adapter.captureState({ state: { count: 0 } })).toBeNull();
    });
  });

  describe('getComponentName', () => {
    it('should return null for any component', () => {
      // Arrange
      const adapter = new NoopAdapter();

      // Act & Assert
      expect(adapter.getComponentName(null)).toBeNull();
      expect(adapter.getComponentName({ name: 'Foo' })).toBeNull();
    });
  });

  describe('getComponentTree', () => {
    it('should return null for any component', () => {
      // Arrange
      const adapter = new NoopAdapter();

      // Act & Assert
      expect(adapter.getComponentTree(null)).toBeNull();
      expect(adapter.getComponentTree({ children: [] })).toBeNull();
    });
  });

  describe('Graceful Degradation', () => {
    it('should not throw for any valid input type', () => {
      // Arrange
      const adapter = new NoopAdapter();
      const inputs: unknown[] = [
        null,
        undefined,
        0,
        '',
        true,
        {},
        [],
        () => {
	  //
	},
        Symbol('test'),
        new Date(),
        /regex/,
      ];

      // Act & Assert
      for (const input of inputs) {
        expect(() => adapter.captureProps(input)).not.toThrow();
        expect(() => adapter.captureState(input)).not.toThrow();
        expect(() => adapter.getComponentName(input)).not.toThrow();
        expect(() => adapter.getComponentTree(input)).not.toThrow();
      }
    });

    it('should return null from all methods for same component', () => {
      // Arrange
      const adapter = new NoopAdapter();
      const component = { type: 'TestComponent', props: {}, state: {} };

      // Act & Assert
      expect(adapter.captureProps(component)).toBeNull();
      expect(adapter.captureState(component)).toBeNull();
      expect(adapter.getComponentName(component)).toBeNull();
      expect(adapter.getComponentTree(component)).toBeNull();
    });
  });
});
