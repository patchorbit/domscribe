/**
 * Shared type guards for the privacy module
 * @module @domscribe/core/privacy/redaction-utils
 */

/**
 * Type guard to check if a value is a record
 */
export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
