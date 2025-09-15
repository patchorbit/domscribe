/**
 * Annotation schema migration utilities.
 *
 * Implements a "migrate on read" pattern: when an annotation is loaded from
 * disk its schemaVersion is inspected and sequential migration steps are
 * applied until it reaches ANNOTATION_SCHEMA_VERSION.  The next write
 * persists the migrated version so the migration only runs once per file.
 *
 * @module @domscribe/core/migrations/annotation-migrations
 */
import {
  ANNOTATION_SCHEMA_VERSION,
  type Annotation,
} from '../types/annotation.js';

/**
 * Registry of migration functions keyed by the version they migrate FROM.
 * e.g. migrationSteps[1] migrates v1 → v2.
 *
 * Currently empty — only v1 exists.  When a v2 schema is introduced, add:
 *   migrationSteps[1] = (data: Record<string, unknown>) => { … mutate … };
 */
const migrationSteps: Record<number, (data: Record<string, unknown>) => void> =
  {};

/**
 * Read `metadata.schemaVersion` from raw JSON, defaulting to 1 for
 * annotations created before schema versioning was introduced.
 */
function readVersion(data: Record<string, unknown>): number {
  const metadata = data['metadata'];
  if (metadata && typeof metadata === 'object' && metadata !== null) {
    const v = (metadata as Record<string, unknown>)['schemaVersion'];
    if (typeof v === 'number') {
      return v;
    }
  }
  return 1;
}

/**
 * Stamp `schemaVersion` on the metadata object so the next write persists it.
 */
function stampVersion(data: Record<string, unknown>, version: number): void {
  const metadata = data['metadata'];
  if (metadata && typeof metadata === 'object' && metadata !== null) {
    (metadata as Record<string, unknown>)['schemaVersion'] = version;
  }
}

/**
 * Migrate a raw annotation object to the current schema version.
 *
 * Runs sequential migration steps and stamps the current schemaVersion
 * on the metadata. Does NOT re-validate through Zod so that already-
 * persisted data (which may pre-date stricter validation) is not rejected.
 */
export function migrateAnnotation(data: unknown): Annotation {
  const obj = data as Record<string, unknown>;

  let version = readVersion(obj);

  while (version < ANNOTATION_SCHEMA_VERSION) {
    const step = migrationSteps[version];
    if (!step) {
      throw new Error(
        `No migration step for annotation schema version ${version}`,
      );
    }
    step(obj);
    version++;
  }

  // Ensure schemaVersion is stamped (covers legacy data without the field)
  stampVersion(obj, ANNOTATION_SCHEMA_VERSION);

  return obj as unknown as Annotation;
}
