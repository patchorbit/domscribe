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

  it('should walk legacy (unversioned) data forward to the current version', () => {
    // readVersion defaults missing metadata.schemaVersion to 1, so a legacy
    // annotation is migrated through every registered step up to the current
    // version and then stamped.
    const raw = buildRawAnnotation();
    delete (raw['metadata'] as Record<string, unknown>)['schemaVersion'];

    const result = migrateAnnotation(raw);

    expect(result.metadata.schemaVersion).toBe(ANNOTATION_SCHEMA_VERSION);
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

  it('should migrate a v1 annotation up to v2 (additive, no field rewrite)', () => {
    // Simulates a v1 annotation persisted before RFC 0001 schema bump.
    // The v1 → v2 step is purely additive (componentStyles + styleSource
    // are new optional fields) — the migration must not rewrite or delete
    // any existing payload data.
    const raw = buildRawAnnotation({
      metadata: { schemaVersion: 1 },
      context: {
        pageUrl: 'http://localhost:3000',
        pageTitle: 'Test',
        viewport: { width: 1920, height: 1080 },
        userAgent: 'test-agent',
        runtimeContext: {
          componentProps: { foo: 'bar' },
        },
      },
    });

    const result = migrateAnnotation(raw);

    expect(result.metadata.schemaVersion).toBe(ANNOTATION_SCHEMA_VERSION);
    expect(result.context.runtimeContext).toEqual({
      componentProps: { foo: 'bar' },
    });
  });

  it('should leave v1 payloads structurally untouched (forward-compat for v1-pinned clients)', () => {
    // Forward-compat guarantee for annotation-process.tool: a v1-pinned
    // downstream consumer reading a v2-migrated annotation sees exactly the
    // v1 fields it already understood. The new componentStyles slot is
    // optional and is absent (`undefined`) on migrated v1 payloads.
    const raw = buildRawAnnotation({ metadata: { schemaVersion: 1 } });

    const result = migrateAnnotation(raw);

    expect(result.context.runtimeContext).toBeUndefined();
  });

  it('should migrate a v2 annotation up to v3 (additive verifyHistory, no field rewrite)', () => {
    // Simulates a v2 annotation persisted between RFC 0001 (v1→v2) and
    // RFC 0002 (v2→v3). The v2 → v3 step is purely additive (verifyHistory
    // is a new optional field) — pre-existing runtimeContext data must
    // survive untouched.
    const raw = buildRawAnnotation({
      metadata: { schemaVersion: 2 },
      context: {
        pageUrl: 'http://localhost:3000',
        pageTitle: 'Test',
        viewport: { width: 1920, height: 1080 },
        userAgent: 'test-agent',
        runtimeContext: {
          componentStyles: { computed: { padding: '16px' } },
        },
      },
    });

    const result = migrateAnnotation(raw);

    expect(result.metadata.schemaVersion).toBe(ANNOTATION_SCHEMA_VERSION);
    expect(result.context.runtimeContext).toEqual({
      componentStyles: { computed: { padding: '16px' } },
    });
    expect(result.context.verifyHistory).toBeUndefined();
  });
});
