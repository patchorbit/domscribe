/**
 * Schema tests for RFC 0002 additions to @domscribe/core.
 *
 * Covers the additive surface: VerifyResultSchema, AnnotationContext.verifyHistory,
 * and the v3 schema-version bump. The pre-RFC 0002 annotation shape is exercised
 * exhaustively in `annotation-migrations.spec.ts` and the wider integration
 * suites; this spec is scoped to the new fields.
 */

import { describe, it, expect } from 'vitest';
import {
  ANNOTATION_SCHEMA_VERSION,
  AnnotationContextSchema,
  VerifyResultSchema,
  VerifyVerdictSchema,
} from './annotation.js';

describe('ANNOTATION_SCHEMA_VERSION', () => {
  it('is at v3 (RFC 0002 — verifyHistory)', () => {
    expect(ANNOTATION_SCHEMA_VERSION).toBe(3);
  });
});

describe('VerifyVerdictSchema', () => {
  it.each(['match', 'partial', 'no_change', 'regression'] as const)(
    'accepts %s',
    (verdict) => {
      expect(VerifyVerdictSchema.parse(verdict)).toBe(verdict);
    },
  );

  it('rejects unknown verdicts', () => {
    expect(() => VerifyVerdictSchema.parse('ok')).toThrow();
  });
});

describe('VerifyResultSchema', () => {
  it('parses a minimal match result (verdict + timestamp only)', () => {
    const parsed = VerifyResultSchema.parse({
      verdict: 'match',
      timestamp: '2026-06-08T12:00:00.000Z',
    });
    expect(parsed.verdict).toBe('match');
    expect(parsed.componentStylesDelta).toBeUndefined();
    expect(parsed.screenshotRef).toBeUndefined();
  });

  it('parses a fully-populated partial result with all delta arrays', () => {
    const parsed = VerifyResultSchema.parse({
      verdict: 'partial',
      timestamp: '2026-06-08T12:00:00.000Z',
      pixelDiffRatio: 0.012,
      componentStylesDelta: [
        { property: 'padding', before: '16px', after: '24px' },
      ],
      computedStyleDelta: [
        { property: 'background-color', before: null, after: 'rgb(0, 0, 0)' },
      ],
      boundingRectDelta: [{ field: 'height', before: 32, after: 40 }],
      screenshotRef: 'blob://relay/ann_x/post-edit-1.png',
      notes: 'padding matched intent; background-color regressed',
    });
    expect(parsed.componentStylesDelta).toHaveLength(1);
    expect(parsed.boundingRectDelta?.[0]?.field).toBe('height');
    expect(parsed.screenshotRef).toMatch(/^blob:\/\//);
  });

  it('rejects out-of-range pixelDiffRatio', () => {
    expect(() =>
      VerifyResultSchema.parse({
        verdict: 'match',
        timestamp: '2026-06-08T12:00:00.000Z',
        pixelDiffRatio: 1.5,
      }),
    ).toThrow();
  });

  it('rejects unknown BoundingRectDelta fields', () => {
    expect(() =>
      VerifyResultSchema.parse({
        verdict: 'partial',
        timestamp: '2026-06-08T12:00:00.000Z',
        boundingRectDelta: [
          // @ts-expect-error — runtime rejection is the point
          { field: 'depth', before: 0, after: 10 },
        ],
      }),
    ).toThrow();
  });
});

describe('AnnotationContextSchema.verifyHistory', () => {
  it('accepts a context without verifyHistory (older clients silently ignore)', () => {
    const parsed = AnnotationContextSchema.parse({
      pageUrl: 'http://localhost:3000',
      pageTitle: 'Test',
      viewport: { width: 1920, height: 1080 },
      userAgent: 'test-agent',
    });
    expect(parsed.verifyHistory).toBeUndefined();
  });

  it('accepts an append-only history of VerifyResults', () => {
    const parsed = AnnotationContextSchema.parse({
      pageUrl: 'http://localhost:3000',
      pageTitle: 'Test',
      viewport: { width: 1920, height: 1080 },
      userAgent: 'test-agent',
      verifyHistory: [
        { verdict: 'partial', timestamp: '2026-06-08T12:00:00.000Z' },
        { verdict: 'match', timestamp: '2026-06-08T12:00:05.000Z' },
      ],
    });
    expect(parsed.verifyHistory).toHaveLength(2);
    expect(parsed.verifyHistory?.[1]?.verdict).toBe('match');
  });
});
