/**
 * Zod validation schemas for Domscribe data models.
 * Provides runtime validation and type inference.
 * @module @domscribe/core/validation/schemas
 */

import { z } from 'zod';
import { PATTERNS, SCHEMA_VERSION } from '../constants/index.js';
import type { Annotation } from '../types/annotation.js';
import type { ManifestEntry } from '../types/manifest.js';
import type {
  AgentPatch,
  AgentPatchBundle,
  PatchApplyRequest,
  PatchApplyResponse,
  PatchPreviewRequest,
  PatchPreviewResponse,
} from '../types/tools.js';

/**
 * Status lifecycle states for an annotation
 */
export const AnnotationStatusSchema = z.enum([
  'queued',
  'processing',
  'processed',
  'failed',
  'archived',
]);

/**
 * Types of user interactions
 */
export const InteractionModeSchema = z.enum([
  'element-click',
  'text-selection',
]);

/**
 * Types of annotation interactions
 */
export const InteractionTypeSchema = z.enum([
  'element-annotation',
  'text-selection',
]);

/**
 * Element ID validation
 */
export const ElementIdSchema = z
  .string()
  .regex(PATTERNS.ELEMENT_ID, 'Invalid element ID format');

/**
 * Annotation ID validation
 */
export const AnnotationIdSchema = z
  .string()
  .regex(PATTERNS.ANNOTATION_ID, 'Invalid annotation ID format');

/**
 * Namespaced element ID validation
 */
export const NamespacedIdSchema = z
  .string()
  .regex(PATTERNS.NAMESPACED_ID, 'Invalid namespaced ID format');

/**
 * Source position schema
 */
export const SourcePositionSchema = z.object({
  line: z.number().int().positive(),
  column: z.number().int().nonnegative(),
});

/**
 * Bounding rectangle schema
 */
export const BoundingRectSchema = z.object({
  x: z.number(),
  y: z.number(),
  width: z.number().nonnegative(),
  height: z.number().nonnegative(),
  top: z.number(),
  right: z.number(),
  bottom: z.number(),
  left: z.number(),
});

/**
 * Viewport schema
 */
export const ViewportSchema = z.object({
  width: z.number().positive(),
  height: z.number().positive(),
});

/**
 * Selected element schema
 */
export const SelectedElementSchema = z.object({
  tagName: z.string().min(1),
  selector: z.string().min(1),
  dataDs: ElementIdSchema.optional(),
  attributes: z.record(z.string()).optional(),
  innerText: z.string().max(100).optional(),
  computedStyles: z.record(z.string()).optional(),
});

/**
 * Annotation metadata schema
 */
export const AnnotationMetadataSchema = z.object({
  id: AnnotationIdSchema,
  timestamp: z.string().datetime(),
  mode: InteractionModeSchema,
  status: AnnotationStatusSchema,
  agentId: z.string().optional(),
  errorDetails: z.string().optional(),
});

/**
 * Annotation interaction schema
 */
export const AnnotationInteractionSchema = z.object({
  type: InteractionTypeSchema,
  selectedText: z.string().optional(),
  selectedElement: SelectedElementSchema.optional(),
  boundingRect: BoundingRectSchema.optional(),
});

/**
 * Environment schema
 */
export const EnvironmentSchema = z.object({
  nodeVersion: z.string().optional(),
  frameworkVersion: z.string().optional(),
  packageManager: z.string().optional(),
});

/**
 * Runtime context schema
 */
export const RuntimeContextSchema = z.object({
  componentProps: z.unknown().optional(),
  componentState: z.unknown().optional(),
  eventFlow: z.unknown().optional(),
  performance: z.unknown().optional(),
});

/**
 * Style info schema
 */
export const StyleInfoSchema = z.object({
  file: z.string().optional(),
  classNames: z.array(z.string()).optional(),
  modules: z.boolean().optional(),
  inline: z.string().optional(),
});

/**
 * Manifest entry schema
 */
export const ManifestEntrySchema = z.object({
  id: ElementIdSchema,
  elementId: z.string().optional(),
  file: z.string().min(1),
  start: SourcePositionSchema,
  end: SourcePositionSchema.optional(),
  tagName: z.string().min(1).optional(),
  componentName: z.string().min(1).optional(),
  dataBindings: z.record(z.unknown()).optional(),
  parent: ElementIdSchema.optional(),
  children: z.array(ElementIdSchema).optional(),
  styles: StyleInfoSchema.optional(),
  isApproximateLocation: z.boolean().optional(),
  wrappers: z.array(z.string()).optional(),
  componentMetadata: z
    .record(z.string().or(z.number()).or(z.boolean()).or(z.object({})))
    .optional(),
});

/**
 * Annotation context schema
 */
export const AnnotationContextSchema = z.object({
  pageUrl: z.string().url(),
  pageTitle: z.string(),
  viewport: ViewportSchema,
  userAgent: z.string(),
  domSnapshot: z.string().optional(),
  manifestSnapshot: z.array(ManifestEntrySchema).optional(),
  userMessage: z.string().optional(),
  environment: EnvironmentSchema.optional(),
  runtimeContext: RuntimeContextSchema.optional(),
});

/**
 * Agent response schema
 */
export const AgentResponseSchema = z.object({
  message: z.string().optional(),
  patchBundle: z.lazy(() => AgentPatchBundleSchema).optional(),
  previewId: z.string().min(1).optional(),
  appliedAt: z.string().datetime().optional(),
});

/**
 * Complete annotation schema
 */
export const AnnotationSchema = z.object({
  metadata: AnnotationMetadataSchema,
  interaction: AnnotationInteractionSchema,
  context: AnnotationContextSchema,
  agentResponse: AgentResponseSchema.optional(),
});

/**
 * Manifest metadata schema
 */
export const ManifestMetadataSchema = z.object({
  schemaVersion: z.string().default(SCHEMA_VERSION),
  generatedAt: z.string().datetime(),
  projectRoot: z.string(),
  framework: z.string().optional(),
  frameworkVersion: z.string().optional(),
});

/**
 * Manifest delta schema
 */
export const ManifestDeltaSchema = z.object({
  type: z.enum(['add', 'update', 'delete']),
  id: ElementIdSchema,
  entry: ManifestEntrySchema.optional(),
  timestamp: z.string().datetime(),
});

/**
 * Manifest snapshot schema
 */
export const ManifestSnapshotSchema = z.object({
  id: z.string().min(1),
  timestamp: z.string().datetime(),
  entries: z.array(ManifestEntrySchema),
  metadata: ManifestMetadataSchema,
});

/**
 * Unified diff entry schema
 */
export const AgentPatchSchema: z.ZodSchema<AgentPatch> = z.object({
  path: z.string().min(1),
  diff: z.string().min(1),
  summary: z.string().optional(),
});

/**
 * Agent patch bundle schema
 */
export const AgentPatchBundleSchema: z.ZodSchema<AgentPatchBundle> = z.object({
  schemaVersion: z.string().default(SCHEMA_VERSION),
  patches: z.array(AgentPatchSchema).nonempty(),
});

/**
 * Patch preview request schema
 */
export const PatchPreviewRequestSchema: z.ZodSchema<PatchPreviewRequest> =
  z.object({
    diff: z.string().min(1),
    title: z.string().optional(),
  });

/**
 * Patch preview response schema
 */
export const PatchPreviewResponseSchema: z.ZodSchema<PatchPreviewResponse> =
  z.object({
    previewId: z.string().min(1),
    warnings: z.array(z.string()).optional(),
    affected: z.array(z.string().min(1)),
  });

/**
 * Patch apply request schema
 */
export const PatchApplyRequestSchema: z.ZodSchema<PatchApplyRequest> = z.object(
  {
    previewId: z.string().min(1),
  },
);

/**
 * Patch apply response schema
 */
export const PatchApplyResponseSchema: z.ZodSchema<PatchApplyResponse> = z
  .object({
    commit: z
      .object({
        sha: z.string().min(1),
        message: z.string().min(1),
      })
      .optional(),
  })
  .strict();

// Type inference: Use the types from annotation.ts and manifest.ts instead
// These schemas provide runtime validation for those types

/**
 * Validation helper functions
 */

/**
 * Validates an annotation object
 * @param data - The data to validate
 * @returns Validated annotation or throws ZodError
 */
export function validateAnnotation(data: unknown): Annotation {
  return AnnotationSchema.parse(data);
}

/**
 * Safely validates an annotation object
 * @param data - The data to validate
 * @returns SafeParseResult with success/error information
 */
export function safeValidateAnnotation(data: unknown) {
  return AnnotationSchema.safeParse(data);
}

/**
 * Validates a manifest entry
 * @param data - The data to validate
 * @returns Validated manifest entry or throws ZodError
 */
export function validateManifestEntry(data: unknown): ManifestEntry {
  return ManifestEntrySchema.parse(data);
}

/**
 * Safely validates a manifest entry
 * @param data - The data to validate
 * @returns SafeParseResult with success/error information
 */
export function safeValidateManifestEntry(data: unknown) {
  return ManifestEntrySchema.safeParse(data);
}

/**
 * Validates an agent patch bundle
 * @param data - The data to validate
 * @returns Validated bundle or throws ZodError
 */
export function validateAgentPatchBundle(data: unknown): AgentPatchBundle {
  return AgentPatchBundleSchema.parse(data);
}

/**
 * Safely validates an agent patch bundle
 * @param data - The data to validate
 * @returns SafeParseResult with success/error information
 */
export function safeValidateAgentPatchBundle(data: unknown) {
  return AgentPatchBundleSchema.safeParse(data);
}

/**
 * Validates a patch preview request
 * @param data - The data to validate
 * @returns Validated request or throws ZodError
 */
export function validatePatchPreviewRequest(
  data: unknown,
): PatchPreviewRequest {
  return PatchPreviewRequestSchema.parse(data);
}

/**
 * Safely validates a patch preview request
 * @param data - The data to validate
 * @returns SafeParseResult with success/error information
 */
export function safeValidatePatchPreviewRequest(data: unknown) {
  return PatchPreviewRequestSchema.safeParse(data);
}

/**
 * Validates a patch preview response
 * @param data - The data to validate
 * @returns Validated response or throws ZodError
 */
export function validatePatchPreviewResponse(
  data: unknown,
): PatchPreviewResponse {
  return PatchPreviewResponseSchema.parse(data);
}

/**
 * Safely validates a patch preview response
 * @param data - The data to validate
 * @returns SafeParseResult with success/error information
 */
export function safeValidatePatchPreviewResponse(data: unknown) {
  return PatchPreviewResponseSchema.safeParse(data);
}

/**
 * Validates a patch apply request
 * @param data - The data to validate
 * @returns Validated request or throws ZodError
 */
export function validatePatchApplyRequest(data: unknown): PatchApplyRequest {
  return PatchApplyRequestSchema.parse(data);
}

/**
 * Safely validates a patch apply request
 * @param data - The data to validate
 * @returns SafeParseResult with success/error information
 */
export function safeValidatePatchApplyRequest(data: unknown) {
  return PatchApplyRequestSchema.safeParse(data);
}

/**
 * Validates a patch apply response
 * @param data - The data to validate
 * @returns Validated response or throws ZodError
 */
export function validatePatchApplyResponse(data: unknown): PatchApplyResponse {
  return PatchApplyResponseSchema.parse(data);
}

/**
 * Safely validates a patch apply response
 * @param data - The data to validate
 * @returns SafeParseResult with success/error information
 */
export function safeValidatePatchApplyResponse(data: unknown) {
  return PatchApplyResponseSchema.safeParse(data);
}

// Note: isValidElementId and isValidAnnotationId are exported from utils/id-generator.ts
