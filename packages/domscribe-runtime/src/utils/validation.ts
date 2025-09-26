/**
 * Validation utilities for runtime data
 * @module @domscribe/runtime/utils/validation
 */

import { PATTERNS } from '@domscribe/core';

/**
 * Validate a Domscribe element ID
 *
 * @param id - The ID to validate
 * @returns True if valid
 */
export function validateElementId(id: string): boolean {
  return typeof id === 'string' && PATTERNS.MANIFEST_ENTRY_ID.test(id);
}

/**
 * Type guard for runtime context structure
 */
interface RuntimeContextLike {
  componentProps?: unknown;
  componentState?: unknown;
  eventFlow?: unknown;
  performance?: unknown;
}

function hasRuntimeContextShape(value: object): value is RuntimeContextLike {
  return (
    'componentProps' in value ||
    'componentState' in value ||
    'eventFlow' in value ||
    'performance' in value
  );
}

/**
 * Validate runtime context data
 *
 * @param context - The context to validate
 * @returns True if valid
 */
export function validateRuntimeContext(context: unknown): boolean {
  if (typeof context !== 'object' || context === null) {
    return false;
  }

  // If it's an empty object, it's valid
  if (Object.keys(context).length === 0) {
    return true;
  }

  if (!hasRuntimeContextShape(context)) {
    return false;
  }

  // Context can have optional fields but they must be objects if present
  if (
    'componentProps' in context &&
    context.componentProps !== undefined &&
    typeof context.componentProps !== 'object'
  ) {
    return false;
  }

  if (
    'componentState' in context &&
    context.componentState !== undefined &&
    typeof context.componentState !== 'object'
  ) {
    return false;
  }

  if (
    'eventFlow' in context &&
    context.eventFlow !== undefined &&
    !Array.isArray(context.eventFlow)
  ) {
    return false;
  }

  if (
    'performance' in context &&
    context.performance !== undefined &&
    typeof context.performance !== 'object'
  ) {
    return false;
  }

  return true;
}

/**
 * Check if a value is a valid HTMLElement
 *
 * @param value - The value to check
 * @returns True if valid HTMLElement
 */
export function isHTMLElement(value: unknown): value is HTMLElement {
  return (
    typeof value === 'object' && value !== null && value instanceof HTMLElement
  );
}

/**
 * Check if an object is plain (not a class instance, array, etc.) and
 * not from a different realm like iframes. In jsdom, this will return false
 * for objects from a different realm.
 *
 * @param value - The value to check
 * @returns True if plain object
 */
export function isPlainObject(value: unknown): boolean {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}
