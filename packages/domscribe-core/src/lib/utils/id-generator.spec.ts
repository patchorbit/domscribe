/**
 * Unit tests for ID generation utilities
 * @module @domscribe/core/utils/id-generator.spec
 */

import { describe, it, expect } from 'vitest';
import {
  generateEntryId,
  generateAnnotationId,
  isValidElementId,
} from './id-generator.js';

describe('ID Generator Utilities', () => {
  describe('generateEntryId', () => {
    it('should generate an 8-character ID', () => {
      const id = generateEntryId();
      expect(id).toHaveLength(8);
    });

    it('should only use characters from the safe alphabet', () => {
      const id = generateEntryId();
      const validChars = /^[0-9A-HJ-NP-Za-hj-np-z]+$/;
      expect(id).toMatch(validChars);
    });

    it('should generate unique IDs', () => {
      const ids = new Set();
      for (let i = 0; i < 1000; i++) {
        ids.add(generateEntryId());
      }
      expect(ids.size).toBe(1000);
    });

    it('should not contain ambiguous characters', () => {
      // Generate many IDs to increase likelihood of catching issues
      for (let i = 0; i < 100; i++) {
        const id = generateEntryId();
        expect(id).not.toMatch(/[IOilo]/);
      }
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

  describe('generateAnnotationId', () => {
    it('should generate an ID with the ann_ prefix', () => {
      const id = generateAnnotationId();
      expect(id).toMatch(/^ann_/);
    });

    it('should include an 8-character element ID and a timestamp', () => {
      const id = generateAnnotationId();
      expect(id).toMatch(/^ann_[0-9A-HJ-NP-Za-hj-np-z]{8}_\d+$/);
    });

    it('should generate unique IDs', () => {
      const ids = new Set<string>();
      for (let i = 0; i < 100; i++) {
        ids.add(generateAnnotationId());
      }
      expect(ids.size).toBe(100);
    });
  });

  describe('Cross-function validation', () => {
    it('should generate entry IDs that pass validation', () => {
      for (let i = 0; i < 100; i++) {
        const id = generateEntryId();
        expect(isValidElementId(id)).toBe(true);
      }
    });
  });
});
