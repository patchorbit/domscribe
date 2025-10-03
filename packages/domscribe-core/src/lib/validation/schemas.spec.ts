/**
 * Unit tests for validation schemas
 * @module @domscribe/core/validation/schemas.spec
 */

import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import {
  ElementIdSchema,
  AnnotationIdSchema,
  SourcePositionSchema,
  ManifestEntrySchema,
  AnnotationSchema,
  AgentPatchBundleSchema,
  PatchPreviewRequestSchema,
  PatchPreviewResponseSchema,
  PatchApplyRequestSchema,
  PatchApplyResponseSchema,
  validateAnnotation,
  safeValidateAnnotation,
  validateManifestEntry,
  validateAgentPatchBundle,
  safeValidateAgentPatchBundle,
  validatePatchPreviewRequest,
  safeValidatePatchPreviewRequest,
  validatePatchPreviewResponse,
  safeValidatePatchPreviewResponse,
  validatePatchApplyRequest,
  safeValidatePatchApplyRequest,
  validatePatchApplyResponse,
  safeValidatePatchApplyResponse,
} from './schemas.js';
import {
  isValidElementId,
  isValidAnnotationId,
} from '../utils/id-generator.js';

describe('Validation Schemas', () => {
  describe('ElementIdSchema', () => {
    it('should validate correct element IDs', () => {
      expect(() => ElementIdSchema.parse('A7bCd9Ef')).not.toThrow();
      expect(() => ElementIdSchema.parse('12345678')).not.toThrow();
      expect(() => ElementIdSchema.parse('aBcDeFgH')).not.toThrow();
    });

    it('should reject invalid element IDs', () => {
      expect(() => ElementIdSchema.parse('A7bCd9E')).toThrow(); // Too short
      expect(() => ElementIdSchema.parse('A7bCd9Ef1')).toThrow(); // Too long
      expect(() => ElementIdSchema.parse('A7bCd9E!')).toThrow(); // Invalid char
      expect(() => ElementIdSchema.parse('')).toThrow();
    });
  });

  describe('AnnotationIdSchema', () => {
    it('should validate correct annotation IDs', () => {
      expect(() =>
        AnnotationIdSchema.parse('ann_A7bCd9Ef_1704067200000'),
      ).not.toThrow();
      expect(() => AnnotationIdSchema.parse('ann_12345678_1')).not.toThrow();
    });

    it('should reject invalid annotation IDs', () => {
      expect(() => AnnotationIdSchema.parse('ann_A7bCd9Ef')).toThrow();
      expect(() => AnnotationIdSchema.parse('invalid_A7bCd9Ef_123')).toThrow();
      expect(() => AnnotationIdSchema.parse('')).toThrow();
    });
  });

  describe('SourcePositionSchema', () => {
    it('should validate correct source positions', () => {
      const position = { line: 1, column: 0 };
      expect(SourcePositionSchema.parse(position)).toEqual(position);
    });

    it('should reject invalid source positions', () => {
      expect(() =>
        SourcePositionSchema.parse({ line: 0, column: 0 }),
      ).toThrow(); // Line must be positive
      expect(() =>
        SourcePositionSchema.parse({ line: 1, column: -1 }),
      ).toThrow(); // Column must be non-negative
      expect(() =>
        SourcePositionSchema.parse({ line: 1.5, column: 0 }),
      ).toThrow(); // Must be integer
      expect(() => SourcePositionSchema.parse({ line: 1 })).toThrow(); // Missing column
    });
  });

  describe('ManifestEntrySchema', () => {
    it('should validate complete manifest entry', () => {
      const entry = {
        id: 'A7bCd9Ef',
        elementId: 'button-1',
        file: 'src/components/Button.tsx',
        start: { line: 10, column: 2 },
        end: { line: 15, column: 3 },
        tagName: 'button',
        componentName: 'Button',
        dataBindings: { variant: 'primary' },
        parent: 'B8cDe0Fg',
        children: ['C9dEf1Gh'],
        styles: {
          file: 'styles/button.css',
          classNames: ['btn', 'btn-primary'],
          modules: true,
        },
        isApproximateLocation: false,
        wrappers: ['withAuth'],
        componentMetadata: { framework: 'react' },
      };

      const validated = ManifestEntrySchema.parse(entry);
      expect(validated).toEqual(entry);
    });

    it('should validate minimal manifest entry', () => {
      const entry = {
        id: 'A7bCd9Ef',
        file: 'src/index.tsx',
        start: { line: 1, column: 0 },
      };

      const validated = ManifestEntrySchema.parse(entry);
      expect(validated).toEqual(entry);
    });

    it('should reject invalid manifest entries', () => {
      // Invalid ID
      expect(() =>
        ManifestEntrySchema.parse({
          id: 'invalid',
          file: 'test.tsx',
          start: { line: 1, column: 0 },
        }),
      ).toThrow();

      // Missing required fields
      expect(() =>
        ManifestEntrySchema.parse({
          id: 'A7bCd9Ef',
          file: 'test.tsx',
        }),
      ).toThrow();

      // Empty file path
      expect(() =>
        ManifestEntrySchema.parse({
          id: 'A7bCd9Ef',
          file: '',
          start: { line: 1, column: 0 },
        }),
      ).toThrow();
    });
  });

  describe('AgentPatchBundleSchema', () => {
    it('should validate complete patch bundle', () => {
      const bundle = {
        schemaVersion: '1.0.0',
        patches: [
          {
            path: 'src/components/Button.tsx',
            diff: '--- a/src/components/Button.tsx\n+++ b/src/components/Button.tsx\n@@',
            summary: 'Update button component',
          },
        ],
      };

      const validated = AgentPatchBundleSchema.parse(bundle);
      expect(validated).toEqual(bundle);
    });

    it('should reject bundles without patches', () => {
      expect(() =>
        AgentPatchBundleSchema.parse({
          schemaVersion: '1.0.0',
          patches: [],
        }),
      ).toThrow();
    });
  });

  describe('PatchPreviewRequestSchema', () => {
    it('should validate preview request', () => {
      const request = {
        diff: '--- a/file.ts\n+++ b/file.ts\n@@',
        title: 'Adjust file',
      };

      const validated = PatchPreviewRequestSchema.parse(request);
      expect(validated).toEqual(request);
    });

    it('should reject empty diff', () => {
      expect(() =>
        PatchPreviewRequestSchema.parse({
          diff: '',
        }),
      ).toThrow();
    });
  });

  describe('PatchPreviewResponseSchema', () => {
    it('should validate preview response', () => {
      const response = {
        previewId: 'pv_123',
        warnings: ['touches snapshots'],
        affected: ['src/components/Button.tsx'],
      };

      const validated = PatchPreviewResponseSchema.parse(response);
      expect(validated).toEqual(response);
    });

    it('should reject response without previewId', () => {
      expect(() =>
        PatchPreviewResponseSchema.parse({
          affected: ['src/components/Button.tsx'],
        }),
      ).toThrow();
    });
  });

  describe('PatchApplyRequestSchema', () => {
    it('should validate apply request', () => {
      const request = { previewId: 'pv_123' };
      expect(PatchApplyRequestSchema.parse(request)).toEqual(request);
    });

    it('should reject request without previewId', () => {
      expect(() => PatchApplyRequestSchema.parse({})).toThrow();
    });
  });

  describe('PatchApplyResponseSchema', () => {
    it('should validate apply response', () => {
      const response = {
        commit: {
          sha: 'abcdef',
          message: 'feat: update button',
        },
      };

      const validated = PatchApplyResponseSchema.parse(response);
      expect(validated).toEqual(response);
    });

    it('should allow empty apply response', () => {
      const response = {};
      const validated = PatchApplyResponseSchema.parse(response);
      expect(validated).toEqual(response);
    });
  });

  describe('AnnotationSchema', () => {
    it('should validate complete annotation', () => {
      const annotation = {
        metadata: {
          id: 'ann_A7bCd9Ef_1704067200000',
          timestamp: '2024-01-01T00:00:00.000Z',
          mode: 'element-click' as const,
          status: 'queued' as const,
          agentId: 'agent-123',
        },
        interaction: {
          type: 'element-annotation' as const,
          selectedElement: {
            tagName: 'BUTTON',
            selector: 'button.primary',
            dataDs: 'A7bCd9Ef',
            attributes: { class: 'primary' },
            innerText: 'Click me',
          },
          boundingRect: {
            x: 100,
            y: 200,
            width: 150,
            height: 40,
            top: 200,
            right: 250,
            bottom: 240,
            left: 100,
          },
        },
        context: {
          pageUrl: 'http://localhost:3000/test',
          pageTitle: 'Test Page',
          viewport: { width: 1920, height: 1080 },
          userAgent: 'Mozilla/5.0',
          userMessage: 'Make this button red',
          environment: {
            nodeVersion: '20.0.0',
            frameworkVersion: '18.2.0',
            packageManager: 'npm',
          },
        },
        agentResponse: {
          message: 'Changed button color',
          patchBundle: {
            schemaVersion: '1.0.0',
            patches: [
              {
                path: 'src/Button.tsx',
                diff: '--- a/src/Button.tsx\n+++ b/src/Button.tsx\n@@\n-className="primary"\n+className="primary red"',
                summary: 'Expand button color to include red variant',
              },
            ],
          },
          previewId: 'pv_123',
          appliedAt: '2024-01-01T00:01:00.000Z',
        },
      };

      const validated = AnnotationSchema.parse(annotation);
      expect(validated).toEqual(annotation);
    });

    it('should validate minimal annotation', () => {
      const annotation = {
        metadata: {
          id: 'ann_A7bCd9Ef_1704067200000',
          timestamp: '2024-01-01T00:00:00.000Z',
          mode: 'text-selection' as const,
          status: 'queued' as const,
        },
        interaction: {
          type: 'text-selection' as const,
          selectedText: 'Some text',
        },
        context: {
          pageUrl: 'http://localhost:3000',
          pageTitle: 'Page',
          viewport: { width: 1920, height: 1080 },
          userAgent: 'Mozilla/5.0',
        },
      };

      const validated = AnnotationSchema.parse(annotation);
      expect(validated).toEqual(annotation);
    });

    it('should reject invalid annotations', () => {
      // Invalid status
      expect(() =>
        AnnotationSchema.parse({
          metadata: {
            id: 'ann_A7bCd9Ef_1704067200000',
            timestamp: '2024-01-01T00:00:00.000Z',
            mode: 'element-click',
            status: 'invalid',
          },
          interaction: { type: 'element-annotation' },
          context: {
            pageUrl: 'http://localhost:3000',
            pageTitle: 'Page',
            viewport: { width: 1920, height: 1080 },
            userAgent: 'Mozilla',
          },
        }),
      ).toThrow();

      // Invalid URL
      expect(() =>
        AnnotationSchema.parse({
          metadata: {
            id: 'ann_A7bCd9Ef_1704067200000',
            timestamp: '2024-01-01T00:00:00.000Z',
            mode: 'element-click',
            status: 'queued',
          },
          interaction: { type: 'element-annotation' },
          context: {
            pageUrl: 'not-a-url',
            pageTitle: 'Page',
            viewport: { width: 1920, height: 1080 },
            userAgent: 'Mozilla',
          },
        }),
      ).toThrow();
    });
  });

  describe('Validation helper functions', () => {
    describe('validateAnnotation', () => {
      it('should validate and return valid annotation', () => {
        const validAnnotation = {
          metadata: {
            id: 'ann_A7bCd9Ef_1704067200000',
            timestamp: '2024-01-01T00:00:00.000Z',
            mode: 'element-click',
            status: 'queued',
          },
          interaction: {
            type: 'element-annotation',
          },
          context: {
            pageUrl: 'http://localhost:3000',
            pageTitle: 'Test',
            viewport: { width: 1920, height: 1080 },
            userAgent: 'Mozilla',
          },
        };

        const result = validateAnnotation(validAnnotation);
        expect(result).toEqual(validAnnotation);
      });

      it('should throw on invalid annotation', () => {
        const invalidAnnotation = {
          metadata: { invalid: 'data' },
        };

        expect(() => validateAnnotation(invalidAnnotation)).toThrow(z.ZodError);
      });
    });

    describe('safeValidateAnnotation', () => {
      it('should return success for valid annotation', () => {
        const validAnnotation = {
          metadata: {
            id: 'ann_A7bCd9Ef_1704067200000',
            timestamp: '2024-01-01T00:00:00.000Z',
            mode: 'element-click',
            status: 'queued',
          },
          interaction: {
            type: 'element-annotation',
          },
          context: {
            pageUrl: 'http://localhost:3000',
            pageTitle: 'Test',
            viewport: { width: 1920, height: 1080 },
            userAgent: 'Mozilla',
          },
        };

        const result = safeValidateAnnotation(validAnnotation);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data).toEqual(validAnnotation);
        }
      });

      it('should return error for invalid annotation', () => {
        const invalidAnnotation = {
          metadata: { invalid: 'data' },
        };

        const result = safeValidateAnnotation(invalidAnnotation);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error).toBeInstanceOf(z.ZodError);
        }
      });
    });

    describe('validateManifestEntry', () => {
      it('should validate and return valid manifest entry', () => {
        const validEntry = {
          id: 'A7bCd9Ef',
          file: 'test.tsx',
          start: { line: 1, column: 0 },
        };

        const result = validateManifestEntry(validEntry);
        expect(result).toEqual(validEntry);
      });

      it('should throw on invalid manifest entry', () => {
        const invalidEntry = {
          id: 'invalid',
          file: 'test.tsx',
        };

        expect(() => validateManifestEntry(invalidEntry)).toThrow(z.ZodError);
      });
    });

    describe('validateAgentPatchBundle', () => {
      it('should validate and return valid bundle', () => {
        const bundle = {
          schemaVersion: '1.0.0',
          patches: [
            {
              path: 'src/file.ts',
              diff: '--- a/src/file.ts\n+++ b/src/file.ts\n@@',
            },
          ],
        };

        const result = validateAgentPatchBundle(bundle);
        expect(result).toEqual(bundle);
      });

      it('should throw on invalid bundle', () => {
        expect(() =>
          validateAgentPatchBundle({
            schemaVersion: '1.0.0',
            patches: [],
          }),
        ).toThrow(z.ZodError);
      });
    });

    describe('safeValidateAgentPatchBundle', () => {
      it('should return success for valid bundle', () => {
        const result = safeValidateAgentPatchBundle({
          schemaVersion: '1.0.0',
          patches: [
            {
              path: 'src/file.ts',
              diff: '--- a/src/file.ts\n+++ b/src/file.ts\n@@',
            },
          ],
        });

        expect(result.success).toBe(true);
      });

      it('should return error for invalid bundle', () => {
        const result = safeValidateAgentPatchBundle({
          schemaVersion: '1.0.0',
          patches: [],
        });

        expect(result.success).toBe(false);
      });
    });

    describe('validatePatchPreviewRequest', () => {
      it('should validate request', () => {
        const request = {
          diff: '--- a/file.ts\n+++ b/file.ts\n@@',
          title: 'Update file',
        };

        const result = validatePatchPreviewRequest(request);
        expect(result).toEqual(request);
      });

      it('should throw on invalid request', () => {
        expect(() => validatePatchPreviewRequest({ diff: '' })).toThrow(
          z.ZodError,
        );
      });
    });

    describe('safeValidatePatchPreviewRequest', () => {
      it('should accept valid request', () => {
        const result = safeValidatePatchPreviewRequest({
          diff: '--- a/file.ts\n+++ b/file.ts\n@@',
        });

        expect(result.success).toBe(true);
      });

      it('should return error for invalid request', () => {
        const result = safeValidatePatchPreviewRequest({ diff: '' });
        expect(result.success).toBe(false);
      });
    });

    describe('validatePatchPreviewResponse', () => {
      it('should validate response', () => {
        const response = {
          previewId: 'pv_123',
          warnings: ['touches snapshots'],
          affected: ['src/file.ts'],
        };

        const result = validatePatchPreviewResponse(response);
        expect(result).toEqual(response);
      });

      it('should throw on invalid response', () => {
        expect(() =>
          validatePatchPreviewResponse({
            warnings: [],
            affected: ['src/file.ts'],
          }),
        ).toThrow(z.ZodError);
      });
    });

    describe('safeValidatePatchPreviewResponse', () => {
      it('should accept valid response', () => {
        const result = safeValidatePatchPreviewResponse({
          previewId: 'pv_123',
          affected: ['src/file.ts'],
        });

        expect(result.success).toBe(true);
      });

      it('should return error for invalid response', () => {
        const result = safeValidatePatchPreviewResponse({ affected: [] });
        expect(result.success).toBe(false);
      });
    });

    describe('validatePatchApplyRequest', () => {
      it('should validate request', () => {
        const request = { previewId: 'pv_123' };
        expect(validatePatchApplyRequest(request)).toEqual(request);
      });

      it('should throw on invalid request', () => {
        expect(() => validatePatchApplyRequest({})).toThrow(z.ZodError);
      });
    });

    describe('safeValidatePatchApplyRequest', () => {
      it('should accept valid request', () => {
        const result = safeValidatePatchApplyRequest({ previewId: 'pv_123' });
        expect(result.success).toBe(true);
      });

      it('should return error for invalid request', () => {
        const result = safeValidatePatchApplyRequest({});
        expect(result.success).toBe(false);
      });
    });

    describe('validatePatchApplyResponse', () => {
      it('should validate response', () => {
        const response = {
          commit: {
            sha: 'abcdef',
            message: 'feat: update',
          },
        };

        const result = validatePatchApplyResponse(response);
        expect(result).toEqual(response);
      });

      it('should allow empty response', () => {
        const response = {};
        expect(validatePatchApplyResponse(response)).toEqual(response);
      });
    });

    describe('safeValidatePatchApplyResponse', () => {
      it('should accept valid response', () => {
        const result = safeValidatePatchApplyResponse({});
        expect(result.success).toBe(true);
      });

      it('should return error for invalid response', () => {
        const result = safeValidatePatchApplyResponse({ previewId: 'pv_123' });
        expect(result.success).toBe(false);
      });
    });

    describe('isValidElementId', () => {
      it('should return true for valid element IDs', () => {
        expect(isValidElementId('A7bCd9Ef')).toBe(true);
        expect(isValidElementId('12345678')).toBe(true);
      });

      it('should return false for invalid element IDs', () => {
        expect(isValidElementId('invalid')).toBe(false);
        expect(isValidElementId('')).toBe(false);
        expect(isValidElementId('A7bCd9E')).toBe(false);
      });
    });

    describe('isValidAnnotationId', () => {
      it('should return true for valid annotation IDs', () => {
        expect(isValidAnnotationId('ann_A7bCd9Ef_1704067200000')).toBe(true);
        expect(isValidAnnotationId('ann_12345678_1')).toBe(true);
      });

      it('should return false for invalid annotation IDs', () => {
        expect(isValidAnnotationId('invalid')).toBe(false);
        expect(isValidAnnotationId('ann_invalid_123')).toBe(false);
        expect(isValidAnnotationId('')).toBe(false);
      });
    });
  });
});
