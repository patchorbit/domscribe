/**
 * @domscribe/core - Core types, utilities, and constants for Domscribe
 * @module @domscribe/core
 */

// Export all types
export * from './lib/types/annotation.js';
export * from './lib/types/config.js';
export * from './lib/types/manifest.js';
export * from './lib/types/nullable.js';

// Export utilities
export {
  generateEntryId,
  generateAnnotationId,
} from './lib/utils/id-generator.js';

// Export errors
export * from './lib/errors/index.js';

// Export constants
export * from './lib/constants/index.js';

// Export migrations
export * from './lib/migrations/annotation-migrations.js';

// Export privacy patterns and redaction
export * from './privacy/patterns.js';
export { redactPII, redactSensitiveFields } from './privacy/redaction.js';
export type { RedactionOptions } from './privacy/redaction.js';
export * from './privacy/redaction-utils.js';
