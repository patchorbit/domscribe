/**
 * Utility functions for generating stable element IDs.
 * Uses nanoid for generating unique 8-character identifiers.
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
 * const id = generateElementId(); // "A7bCd9Ef"
 */
export function generateElementId(): string {
  return generateId();
}

/**
 * Generates a unique annotation ID with timestamp.
 * Format: ann_<nanoid>_<timestamp>
 * @returns {string} A unique annotation identifier
 * @example
 * const id = generateAnnotationId(); // "ann_A7bCd9Ef_1704067200000"
 */
export function generateAnnotationId(): string {
  const nanoid = generateId();
  const timestamp = Date.now();
  return `ann_${nanoid}_${timestamp}`;
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
 * Validates if a string is a valid annotation ID.
 * @param {string} id - The ID to validate
 * @returns {boolean} True if the ID is valid
 */
export function isValidAnnotationId(id: string): boolean {
  if (!id || typeof id !== 'string') {
    return false;
  }

  // Check format: ann_<nanoid>_<timestamp>
  const parts = id.split('_');
  if (parts.length !== 3) {
    return false;
  }

  const [prefix, nanoid, timestamp] = parts;

  // Check prefix
  if (prefix !== 'ann') {
    return false;
  }

  // Check nanoid part
  if (!isValidElementId(nanoid)) {
    return false;
  }

  // Check timestamp is a valid number
  const ts = parseInt(timestamp, 10);
  if (isNaN(ts) || ts <= 0) {
    return false;
  }

  return true;
}

/**
 * Extracts the timestamp from an annotation ID.
 * @param {string} id - The annotation ID
 * @returns {number | null} The timestamp or null if invalid
 */
export function extractTimestampFromAnnotationId(id: string): number | null {
  if (!isValidAnnotationId(id)) {
    return null;
  }

  const parts = id.split('_');
  return parseInt(parts[2], 10);
}

/**
 * Generates a namespaced element ID for multi-frame support.
 * Format: frameId:elementId
 * @param {string} frameId - The frame identifier
 * @param {string} elementId - The element ID (optional, generates new if not provided)
 * @returns {string} A namespaced element ID
 */
export function generateNamespacedElementId(
  frameId: string,
  elementId?: string
): string {
  const id = elementId || generateElementId();
  return `${frameId}:${id}`;
}

/**
 * Parses a namespaced element ID.
 * @param {string} namespacedId - The namespaced ID to parse
 * @returns {{ frameId: string; elementId: string } | null} Parsed components or null if invalid
 */
export function parseNamespacedElementId(
  namespacedId: string
): { frameId: string; elementId: string } | null {
  if (!namespacedId || typeof namespacedId !== 'string') {
    return null;
  }

  const parts = namespacedId.split(':');
  if (parts.length !== 2) {
    return null;
  }

  const [frameId, elementId] = parts;

  if (!frameId || !isValidElementId(elementId)) {
    return null;
  }

  return { frameId, elementId };
}
