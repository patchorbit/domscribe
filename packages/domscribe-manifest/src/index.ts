/**
 * @domscribe/manifest - Manifest management for Domscribe
 *
 * Provides centralized manifest operations:
 * - Batch writing to JSONL format
 * - In-memory index for fast lookups
 * - Singleton manager per workspace
 * - HMR-stable ID generation via IDStabilizer
 *
 * @example
 * ```typescript
 * import { ManifestManager } from '@domscribe/manifest';
 *
 * const manager = ManifestManager.getInstance('/workspace');
 * await manager.initialize();
 *
 * const stabilizer = manager.getIDStabilizer();
 * const id = stabilizer.getStableId('/file.tsx', fileHash, { line: 10, column: 5 });
 *
 * await manager.appendEntries(entries);
 * await manager.flush();
 * ```
 */
export { ManifestManager } from './manifest-manager/manifest-manager.js';
export type { ManagerOptions, ManagerStats } from './manifest-manager/types.js';

export { BatchWriter } from './batch-writer/batch-writer.js';
export type { BatchWriterOptions, WriterStats } from './batch-writer/types.js';

export { IDStabilizer } from './id-stabilizer/id-stabilizer.js';
export type {
  IDCacheEntry,
  IDStabilizerOptions,
  IDCacheStats,
  SerializedIDCache,
  SerializedIDCacheEntry,
} from './id-stabilizer/types.js';
