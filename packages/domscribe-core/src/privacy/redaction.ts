/**
 * PII redaction utilities for privacy protection
 * @module @domscribe/core/privacy/redaction
 */

import { PII_PATTERNS, SENSITIVE_FIELD_NAMES } from './patterns.js';
import { isRecord } from './redaction-utils.js';

/**
 * Redaction options
 */
export interface RedactionOptions {
  /**
   * Patterns to use for redaction
   * @default All PII patterns
   */
  patterns?: Array<keyof typeof PII_PATTERNS>;

  /**
   * Custom patterns to redact
   */
  customPatterns?: RegExp[];

  /**
   * Replacement string
   * @default '[REDACTED]'
   */
  replacement?: string;

  /**
   * Whether to preserve partial values (e.g., show last 4 digits)
   * @default false
   */
  preservePartial?: boolean;
}

/**
 * Redact PII from a string
 *
 * @param text - The text to redact
 * @param options - Redaction options
 * @returns Redacted text
 */
export function redactText(
  text: string,
  options: RedactionOptions = {},
): string {
  const {
    patterns = Object.keys(PII_PATTERNS) as Array<keyof typeof PII_PATTERNS>,
    customPatterns = [],
    replacement = '[REDACTED]',
    preservePartial = false,
  } = options;

  let redacted = text;

  // Apply built-in patterns
  for (const patternKey of patterns) {
    const pattern = PII_PATTERNS[patternKey];
    redacted = redacted.replace(pattern, (match) => {
      if (preservePartial && match.length > 4) {
        // Preserve last 4 characters
        return replacement + match.slice(-4);
      }
      return replacement;
    });
  }

  // Apply custom patterns
  for (const pattern of customPatterns) {
    redacted = redacted.replace(pattern, replacement);
  }

  return redacted;
}

/**
 * Redact PII from an object recursively
 *
 * @param obj - The object to redact
 * @param options - Redaction options
 * @returns Redacted object
 */
export function redactObject(
  obj: unknown,
  options: RedactionOptions = {},
): unknown {
  if (obj === null || obj === undefined) {
    return obj;
  }

  // Handle strings
  if (typeof obj === 'string') {
    return redactText(obj, options);
  }

  // Handle primitives
  if (typeof obj !== 'object') {
    return obj;
  }

  // Handle arrays
  if (Array.isArray(obj)) {
    return obj.map((item) => redactObject(item, options));
  }

  // Handle plain objects
  if (isRecord(obj)) {
    const redacted: Record<string, unknown> = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        const value = obj[key];
        redacted[key] = redactObject(value, options);
      }
    }

    return redacted;
  }

  // Other object types
  return obj;
}

/**
 * Redact PII from arbitrary data using all built-in patterns
 *
 * Convenience wrapper around {@link redactObject} with all pattern types enabled.
 *
 * @param data - The data to redact
 * @returns Redacted data
 */
export function redactPII(data: unknown): unknown {
  return redactObject(data, {
    patterns: ['email', 'phone', 'creditCard', 'ssn', 'apiKey', 'jwt', 'ip'],
    preservePartial: false,
  });
}

/**
 * Redact sensitive fields by name
 *
 * @param obj - The object to redact
 * @param additionalFields - Additional field names to redact
 * @returns Redacted object
 */
export function redactSensitiveFields(
  obj: unknown,
  additionalFields: string[] = [],
): unknown {
  if (obj === null || obj === undefined || typeof obj !== 'object') {
    return obj;
  }

  const sensitiveNames = new Set([
    ...SENSITIVE_FIELD_NAMES,
    ...additionalFields.map((f) => f.toLowerCase()),
  ]);

  // Handle arrays
  if (Array.isArray(obj)) {
    return obj.map((item) => redactSensitiveFields(item, additionalFields));
  }

  // Handle plain objects
  if (isRecord(obj)) {
    const redacted: Record<string, unknown> = {};

    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        const lowerKey = key.toLowerCase();
        const value = obj[key];

        if (sensitiveNames.has(lowerKey)) {
          redacted[key] = '[REDACTED]';
        } else {
          redacted[key] = redactSensitiveFields(value, additionalFields);
        }
      }
    }

    return redacted;
  }

  // Other object types
  return obj;
}
