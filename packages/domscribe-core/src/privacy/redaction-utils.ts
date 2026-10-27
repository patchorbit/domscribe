/**
 * Shared type guards for the privacy module
 * @module @domscribe/core/privacy/redaction-utils
 */

import { SENSITIVE_FIELD_NAMES } from './patterns.js';

const sensitiveRecordNames = new Set<string>(SENSITIVE_FIELD_NAMES);

/**
 * Type guard to check if a value is a record
 */
export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Recognize explicit secret records and named credential-field descriptors.
 * Read only own data properties: an arbitrary accessor must not run as a probe.
 */
export function hasSensitiveRecordMarker(value: unknown): boolean {
  if (!isRecord(value)) return false;
  const ownValue = (key: string) =>
    Object.getOwnPropertyDescriptor(value, key)?.value;
  if (ownValue('secret') === true) return true;
  return ['id', 'key', 'name'].some((key) => {
    const name = ownValue(key);
    return (
      typeof name === 'string' && sensitiveRecordNames.has(name.toLowerCase())
    );
  });
}
