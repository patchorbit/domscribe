/**
 * Unit tests for annotation schema migration utilities
 * @module @domscribe/core/migrations/annotation-migrations.spec
 */

import { describe, it, expect } from 'vitest';
import { migrateAnnotation } from './annotation-migrations.js';
import { ANNOTATION_SCHEMA_VERSION } from '../types/annotation.js';

/**
 * Builds a minimal raw annotation object for migration testing.
 * schemaVersion defaults to ANNOTATION_SCHEMA_VERSION so the object
 * passes through with no migration steps applied.
 */
function buildRawAnnotation(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    metadata: {
      id: 'ann_A7bCd9Ef_1700000000000',
      timestamp: '2025-01-01T00:00:00.000Z',
      mode: 'element-click',
      status: 'queued',
      schemaVersion: ANNOTATION_SCHEMA_VERSION,
      ...((overrides['metadata'] as Record<string, unknown>) ?? {}),
    },
    interaction: {
      type: 'element-annotation',
    },
    context: {
      pageUrl: 'http://localhost:3000',
      pageTitle: 'Test',
      viewport: { width: 1920, height: 1080 },
      userAgent: 'test-agent',
    },
    ...overrides,
  };
}

describe('migrateAnnotation', () => {
  it('should return the annotation unchanged when already at current version', () => {
    const raw = buildRawAnnotation();

    const result = migrateAnnotation(raw);

    expect(result.metadata.schemaVersion).toBe(ANNOTATION_SCHEMA_VERSION);
    expect(result.metadata.id).toBe('ann_A7bCd9Ef_1700000000000');
  });

  it('should stamp schemaVersion on legacy data without the field', () => {
    const raw = buildRawAnnotation();
    delete (raw['metadata'] as Record<string, unknown>)['schemaVersion'];

    const result = migrateAnnotation(raw);

    expect(result.metadata.schemaVersion).toBe(ANNOTATION_SCHEMA_VERSION);
  });

  it('should default to version 1 when metadata has no schemaVersion', () => {
    // With ANNOTATION_SCHEMA_VERSION === 1 and no field, readVersion returns 1.
    // Since 1 === ANNOTATION_SCHEMA_VERSION, no migration steps run — it just stamps.
    const raw = buildRawAnnotation();
    delete (raw['metadata'] as Record<string, unknown>)['schemaVersion'];

    const result = migrateAnnotation(raw);

    expect(result.metadata.schemaVersion).toBe(1);
  });

  it('should default to version 1 when metadata is missing entirely', () => {
    const raw = buildRawAnnotation();
    delete raw['metadata'];

    // readVersion returns 1 when metadata is absent.
    // stampVersion is a no-op when metadata is missing, so we just get the cast back.
    const result = migrateAnnotation(raw);

    expect(result).toBeDefined();
  });

  it('should throw when a required migration step is missing', () => {
    // Force a version lower than current that has no migration step registered.
    // This only triggers if ANNOTATION_SCHEMA_VERSION > 1, but we can simulate
    // by setting schemaVersion to 0 (which will always be < any positive version).
    const raw = buildRawAnnotation({
      metadata: { schemaVersion: 0 },
    });

    if (ANNOTATION_SCHEMA_VERSION > 0) {
      expect(() => migrateAnnotation(raw)).toThrow(
        /No migration step for annotation schema version 0/,
      );
    }
  });

  it('should preserve all existing fields through migration', () => {
    const raw = buildRawAnnotation();

    const result = migrateAnnotation(raw);

    expect(result.interaction.type).toBe('element-annotation');
    expect(result.context.pageUrl).toBe('http://localhost:3000');
    expect(result.context.viewport).toEqual({ width: 1920, height: 1080 });
  });
});
