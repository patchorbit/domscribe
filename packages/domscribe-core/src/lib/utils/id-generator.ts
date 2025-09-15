/**
 * Utility functions for generating and validating Domscribe identifiers.
 * Uses nanoid with a custom alphabet for unique 8-character base IDs.
 * @module @domscribe/core/utils/id-generator
 */

import { customAlphabet } from 'nanoid';

/**
 * Custom alphabet for ID generation.
 * Uses URL-safe characters excluding ambiguous ones.
 */
const ALPHABET = '0123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz';

/**
 * ID length for element IDs (8 characters provides ~10^14 unique combinations)
 */
const ID_LENGTH = 8;

/**
 * Nanoid generator configured with custom alphabet
 */
const generateId = customAlphabet(ALPHABET, ID_LENGTH);

/**
 * Generates a unique 8-character element ID for use in data-ds attributes.
 * @returns {string} An 8-character unique identifier
 * @example
 * const id = generateEntryId(); // "A7bCd9Ef"
 */
export function generateEntryId(): string {
  return generateId();
}

/**
 * Validates if a string is a valid element ID.
 * @param {string} id - The ID to validate
 * @returns {boolean} True if the ID is valid
 */
export function isValidElementId(id: string): boolean {
  if (!id || typeof id !== 'string') {
    return false;
  }

  // Check length
  if (id.length !== ID_LENGTH) {
    return false;
  }

  // Check characters are from our alphabet
  const validChars = new Set(ALPHABET);
  return id.split('').every((char) => validChars.has(char));
}

/**
 * Generates a unique annotation ID in the format `ann_<nanoid>_<timestamp>`.
 * @returns {string} An annotation ID matching the PATTERNS.ANNOTATION_ID format
 */
export function generateAnnotationId(): string {
  return `ann_${generateId()}_${Date.now()}`;
}
