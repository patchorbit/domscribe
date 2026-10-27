/**
 * @domscribe/manifest - Manifest management for Domscribe
 *
 * Provides centralized manifest operations:
 * - Batch writing to JSONL format
 * - In-memory index for fast lookups
 * - Fast element ID resolution
 *
 * @example
 * ```typescript
 * import { ManifestWriter, ManifestReader } from '@domscribe/manifest';
 *
 * // Writer (for transforms)
 * const writer = ManifestWriter.getInstance('/workspace');
 * writer.initialize();
 * writer.appendEntries(entries);
 * writer.close();
 *
 * // Reader (for relay)
 * const reader = new ManifestReader('/workspace');
 * reader.initialize();
 * const result = reader.resolve('abc12345');
 * reader.close();
 * ```
 */

// Writer (for transforms)
export { ManifestWriter } from './writer/manifest-writer.js';
export type { ManifestWriterStats } from './writer/types.js';

// Reader (for relay)
export { ManifestReader } from './reader/manifest-reader.js';
export type { ManifestResolveResult } from './reader/manifest-reader.js';

// ID stabilization for consistent element IDs across builds
export { IDStabilizer } from './id-stabilizer/id-stabilizer.js';
export type { IDGenerator } from './id-stabilizer/types.js';

export { hashSource } from './source-hash.js';
