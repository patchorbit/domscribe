/**
 * Patterns for detecting PII (Personally Identifiable Information)
 * @module @domscribe/core/privacy/patterns
 */
export const PII_PATTERNS = {
  // Email addresses
  email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,

  // Phone numbers (various formats)
  phone: /(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g,

  // Credit card numbers (basic pattern)
  creditCard: /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g,

  // Social Security Numbers (US)
  ssn: /\b\d{3}-\d{2}-\d{4}\b/g,

  // IP addresses
  ip: /\b(?:\d{1,3}\.){3}\d{1,3}\b/g,

  // API keys and tokens (common patterns)
  apiKey: /\b[A-Za-z0-9_-]{32,}\b/g,

  // JWT tokens
  jwt: /eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g,
} as const;

/**
 * Sensitive field names that should be redacted
 */
export const SENSITIVE_FIELD_NAMES = [
  'password',
  'passwd',
  'pwd',
  'secret',
  'token',
  'apikey',
  'api_key',
  'authtoken',
  'auth_token',
  'accesstoken',
  'access_token',
  'refreshtoken',
  'refresh_token',
  'privatekey',
  'private_key',
  'creditcard',
  'credit_card',
  'cardnumber',
  'card_number',
  'cvv',
  'ssn',
  'social_security',
] as const;
