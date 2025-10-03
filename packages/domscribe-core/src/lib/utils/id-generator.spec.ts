/**
 * Unit tests for ID generation utilities
 * @module @domscribe/core/utils/id-generator.spec
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  generateElementId,
  generateAnnotationId,
  isValidElementId,
  isValidAnnotationId,
  extractTimestampFromAnnotationId,
  generateNamespacedElementId,
  parseNamespacedElementId,
} from './id-generator.js';

describe('ID Generator Utilities', () => {
  describe('generateElementId', () => {
    it('should generate an 8-character ID', () => {
      const id = generateElementId();
      expect(id).toHaveLength(8);
    });

    it('should only use characters from the safe alphabet', () => {
      const id = generateElementId();
      const validChars = /^[0-9A-HJ-NP-Za-hj-np-z]+$/;
      expect(id).toMatch(validChars);
    });

    it('should generate unique IDs', () => {
      const ids = new Set();
      for (let i = 0; i < 1000; i++) {
        ids.add(generateElementId());
      }
      expect(ids.size).toBe(1000);
    });

    it('should not contain ambiguous characters', () => {
      // Generate many IDs to increase likelihood of catching issues
      for (let i = 0; i < 100; i++) {
        const id = generateElementId();
        expect(id).not.toMatch(/[IOilo]/);
      }
    });
  });

  describe('generateAnnotationId', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    it('should generate ID with correct format', () => {
      const timestamp = 1704067200000;
      vi.setSystemTime(timestamp);

      const id = generateAnnotationId();
      expect(id).toMatch(/^ann_[0-9A-HJ-NP-Za-hj-np-z]{8}_\d+$/);
      expect(id).toContain(`_${timestamp}`);
    });

    it('should include current timestamp', () => {
      const timestamp = Date.now();
      const id = generateAnnotationId();
      const extractedTimestamp = parseInt(id.split('_')[2], 10);

      // Allow small time difference for execution
      expect(Math.abs(extractedTimestamp - timestamp)).toBeLessThanOrEqual(10);
    });

    it('should generate unique IDs even when called rapidly', () => {
      const ids = new Set();
      const timestamp = 1704067200000;
      vi.setSystemTime(timestamp);

      for (let i = 0; i < 100; i++) {
        ids.add(generateAnnotationId());
      }
      expect(ids.size).toBe(100);
    });
  });

  describe('isValidElementId', () => {
    it('should validate correct element IDs', () => {
      expect(isValidElementId('A7bCd9Ef')).toBe(true);
      expect(isValidElementId('12345678')).toBe(true);
      expect(isValidElementId('aBcDeFgH')).toBe(true);
    });

    it('should reject invalid element IDs', () => {
      expect(isValidElementId('')).toBe(false);
      expect(isValidElementId('A7bCd9E')).toBe(false); // Too short
      expect(isValidElementId('A7bCd9Ef1')).toBe(false); // Too long
      expect(isValidElementId('A7bCd9E!')).toBe(false); // Invalid character
      expect(isValidElementId('IOIOioio')).toBe(false); // Contains I, O, i, o
      /* eslint-disable @typescript-eslint/no-explicit-any */
      expect(isValidElementId(null as any)).toBe(false);
      expect(isValidElementId(undefined as any)).toBe(false);
      expect(isValidElementId(123 as any)).toBe(false);
      /* eslint-enable @typescript-eslint/no-explicit-any */
    });

    it('should reject IDs with ambiguous characters', () => {
      expect(isValidElementId('I2345678')).toBe(false); // Contains I
      expect(isValidElementId('O2345678')).toBe(false); // Contains O
      expect(isValidElementId('l2345678')).toBe(false); // Contains l
      expect(isValidElementId('12345678')).toBe(true); // Valid
    });
  });

  describe('isValidAnnotationId', () => {
    it('should validate correct annotation IDs', () => {
      expect(isValidAnnotationId('ann_A7bCd9Ef_1704067200000')).toBe(true);
      expect(isValidAnnotationId('ann_12345678_1')).toBe(true);
      expect(isValidAnnotationId('ann_aBcDeFgH_9999999999999')).toBe(true);
    });

    it('should reject invalid annotation IDs', () => {
      expect(isValidAnnotationId('')).toBe(false);
      expect(isValidAnnotationId('ann_')).toBe(false);
      expect(isValidAnnotationId('ann_A7bCd9Ef')).toBe(false); // Missing timestamp
      expect(isValidAnnotationId('ann_A7bCd9Ef_')).toBe(false); // Empty timestamp
      expect(isValidAnnotationId('ann_A7bCd9Ef_abc')).toBe(false); // Non-numeric timestamp
      expect(isValidAnnotationId('ann_A7bCd9E_1704067200000')).toBe(false); // Invalid nanoid
      expect(isValidAnnotationId('annotation_A7bCd9Ef_1704067200000')).toBe(
        false
      ); // Wrong prefix
      expect(isValidAnnotationId('ann_A7bCd9Ef_0')).toBe(false); // Timestamp <= 0
      expect(isValidAnnotationId('ann_A7bCd9Ef_-1')).toBe(false); // Negative timestamp
      /* eslint-disable @typescript-eslint/no-explicit-any */
      expect(isValidAnnotationId(null as any)).toBe(false);
      expect(isValidAnnotationId(undefined as any)).toBe(false);
      /* eslint-enable @typescript-eslint/no-explicit-any */
    });

    it('should handle edge cases', () => {
      expect(isValidAnnotationId('ann__1704067200000')).toBe(false); // Empty nanoid
      expect(isValidAnnotationId('_A7bCd9Ef_1704067200000')).toBe(false); // Missing prefix
      expect(isValidAnnotationId('ann_A7bCd9Ef_1704067200000_extra')).toBe(
        false
      ); // Extra parts
    });
  });

  describe('extractTimestampFromAnnotationId', () => {
    it('should extract timestamp from valid annotation ID', () => {
      const timestamp = 1704067200000;
      const id = `ann_A7bCd9Ef_${timestamp}`;
      expect(extractTimestampFromAnnotationId(id)).toBe(timestamp);
    });

    it('should return null for invalid annotation IDs', () => {
      expect(extractTimestampFromAnnotationId('')).toBeNull();
      expect(extractTimestampFromAnnotationId('invalid')).toBeNull();
      expect(extractTimestampFromAnnotationId('ann_A7bCd9Ef')).toBeNull();
      expect(
        extractTimestampFromAnnotationId('ann_A7bCd9E_1704067200000')
      ).toBeNull();
    });

    it('should handle edge cases', () => {
      /* eslint-disable @typescript-eslint/no-explicit-any */
      expect(extractTimestampFromAnnotationId(null as any)).toBeNull();
      expect(extractTimestampFromAnnotationId(undefined as any)).toBeNull();
      expect(extractTimestampFromAnnotationId(123 as any)).toBeNull();
      /* eslint-enable @typescript-eslint/no-explicit-any */
    });
  });

  describe('generateNamespacedElementId', () => {
    it('should generate namespaced ID with provided element ID', () => {
      const frameId = 'frame1';
      const elementId = 'A7bCd9Ef';
      const result = generateNamespacedElementId(frameId, elementId);
      expect(result).toBe('frame1:A7bCd9Ef');
    });

    it('should generate new element ID if not provided', () => {
      const frameId = 'frame1';
      const result = generateNamespacedElementId(frameId);
      expect(result).toMatch(/^frame1:[0-9A-HJ-NP-Za-hj-np-z]{8}$/);
    });

    it('should handle various frame ID formats', () => {
      expect(generateNamespacedElementId('main', 'A7bCd9Ef')).toBe(
        'main:A7bCd9Ef'
      );
      expect(generateNamespacedElementId('iframe-1', 'A7bCd9Ef')).toBe(
        'iframe-1:A7bCd9Ef'
      );
      expect(generateNamespacedElementId('micro.frontend', 'A7bCd9Ef')).toBe(
        'micro.frontend:A7bCd9Ef'
      );
    });

    it('should handle empty frame ID', () => {
      // Even empty frame ID should work (though not recommended)
      expect(generateNamespacedElementId('', 'A7bCd9Ef')).toBe(':A7bCd9Ef');
    });
  });

  describe('parseNamespacedElementId', () => {
    it('should parse valid namespaced IDs', () => {
      const result = parseNamespacedElementId('frame1:A7bCd9Ef');
      expect(result).toEqual({
        frameId: 'frame1',
        elementId: 'A7bCd9Ef',
      });
    });

    it('should return null for invalid namespaced IDs', () => {
      expect(parseNamespacedElementId('')).toBeNull();
      expect(parseNamespacedElementId('A7bCd9Ef')).toBeNull(); // No namespace
      expect(parseNamespacedElementId('frame1:')).toBeNull(); // No element ID
      expect(parseNamespacedElementId(':A7bCd9Ef')).toBeNull(); // Empty frame ID
      expect(parseNamespacedElementId('frame1:invalid')).toBeNull(); // Invalid element ID
      expect(parseNamespacedElementId('frame1:A7bCd9E')).toBeNull(); // Too short element ID
      expect(parseNamespacedElementId('frame1:A7bCd9Ef:extra')).toBeNull(); // Too many parts
    });

    it('should handle edge cases', () => {
      /* eslint-disable @typescript-eslint/no-explicit-any */
      expect(parseNamespacedElementId(null as any)).toBeNull();
      expect(parseNamespacedElementId(undefined as any)).toBeNull();
      expect(parseNamespacedElementId(123 as any)).toBeNull();
      expect(parseNamespacedElementId({} as any)).toBeNull();
      /* eslint-enable @typescript-eslint/no-explicit-any */
    });

    it('should validate the element ID part', () => {
      expect(parseNamespacedElementId('frame1:IIIIIIII')).toBeNull(); // Contains invalid chars
      expect(parseNamespacedElementId('frame1:12345678')).toEqual({
        frameId: 'frame1',
        elementId: '12345678',
      });
    });
  });

  describe('Integration tests', () => {
    it('should generate and validate element IDs consistently', () => {
      for (let i = 0; i < 100; i++) {
        const id = generateElementId();
        expect(isValidElementId(id)).toBe(true);
      }
    });

    it('should generate and validate annotation IDs consistently', () => {
      for (let i = 0; i < 100; i++) {
        const id = generateAnnotationId();
        expect(isValidAnnotationId(id)).toBe(true);

        const timestamp = extractTimestampFromAnnotationId(id);
        expect(timestamp).toBeGreaterThan(0);
      }
    });

    it('should handle full namespaced ID workflow', () => {
      const frameId = 'iframe-main';
      const elementId = generateElementId();

      // Generate namespaced ID
      const namespacedId = generateNamespacedElementId(frameId, elementId);
      expect(namespacedId).toBe(`${frameId}:${elementId}`);

      // Parse it back
      const parsed = parseNamespacedElementId(namespacedId);
      expect(parsed).toEqual({ frameId, elementId });

      // Validate the element ID
      expect(parsed).not.toBeNull();
      if (parsed) {
        expect(isValidElementId(parsed.elementId)).toBe(true);
      }
    });
  });
});
