/**
 * Canonical Annotation data model for Domscribe.
 * Represents a structured record of a user interaction with captured context.
 * @module @domscribe/core/types/annotation
 */
import { ManifestEntryIdSchema, ManifestEntrySchema } from './manifest.js';
import { z } from 'zod';
import { PATTERNS } from '../constants/index.js';

export enum AnnotationStatusEnum {
  QUEUED = 'queued',
  PROCESSING = 'processing',
  PROCESSED = 'processed',
  FAILED = 'failed',
  ARCHIVED = 'archived',
}

export const AnnotationStatusSchema = z.enum([
  AnnotationStatusEnum.QUEUED,
  AnnotationStatusEnum.PROCESSING,
  AnnotationStatusEnum.PROCESSED,
  AnnotationStatusEnum.FAILED,
  AnnotationStatusEnum.ARCHIVED,
]);

export enum InteractionModeEnum {
  ELEMENT_CLICK = 'element-click',
  TEXT_SELECTION = 'text-selection',
}

export const InteractionModeSchema = z.enum([
  InteractionModeEnum.ELEMENT_CLICK,
  InteractionModeEnum.TEXT_SELECTION,
]);

export enum InteractionTypeEnum {
  ELEMENT_ANNOTATION = 'element-annotation',
  TEXT_SELECTION = 'text-selection',
}

export const InteractionTypeSchema = z.enum([
  InteractionTypeEnum.ELEMENT_ANNOTATION,
  InteractionTypeEnum.TEXT_SELECTION,
]);

export const ViewportSchema = z.object({
  width: z.number().describe('Width of the viewport'),
  height: z.number().describe('Height of the viewport'),
});

export const EnvironmentSchema = z.object({
  nodeVersion: z.string().optional().describe('Node.js version'),
  frameworkVersion: z.string().optional().describe('Framework version'),
  packageManager: z.string().optional().describe('Package manager used'),
});

export const RuntimeContextSchema = z.object({
  componentProps: z.unknown().optional().describe('Component props snapshot'),
  componentState: z.unknown().optional().describe('Component state snapshot'),
  eventFlow: z.unknown().optional().describe('Event flow breadcrumbs'),
  performance: z.unknown().optional().describe('Performance metrics'),
});

export const AnnotationIdSchema = z
  .string()
  .regex(PATTERNS.ANNOTATION_ID)
  .describe('Unique identifier: ann_<nanoid>_<timestamp>');

/**
 * Current annotation schema version. Bump when the Annotation shape changes.
 */
export const ANNOTATION_SCHEMA_VERSION = 1;

export const AnnotationMetadataSchema = z.object({
  id: AnnotationIdSchema,
  timestamp: z.string().describe('ISO 8601 timestamp'),
  mode: InteractionModeSchema.describe('Mode of interaction'),
  status: AnnotationStatusSchema.describe('Current status in the lifecycle'),
  schemaVersion: z
    .number()
    .int()
    .default(ANNOTATION_SCHEMA_VERSION)
    .describe('Schema version for forward migration'),
  errorDetails: z
    .string()
    .optional()
    .describe('Details about any errors that occurred'),
});

export const SelectedElementSchema = z.object({
  tagName: z.string().describe('HTML tag name'),
  selector: z.string().describe('CSS selector path to the element'),
  dataDs: z.string().optional().describe('Domscribe element ID if transformed'),
  attributes: z
    .record(z.string(), z.string())
    .optional()
    .describe('Element attributes'),
  innerText: z
    .string()
    .optional()
    .describe('First 100 characters of inner text'),
  computedStyles: z
    .record(z.string(), z.string())
    .optional()
    .describe('Computed styles for the element'),
});

export const BoundingRectSchema = z.object({
  x: z.number().describe('X coordinate of the top-left corner'),
  y: z.number().describe('Y coordinate of the top-left corner'),
  width: z.number().describe('Width of the rectangle'),
  height: z.number().describe('Height of the rectangle'),
  top: z.number().describe('Y coordinate of the top edge'),
  right: z.number().describe('X coordinate of the right edge'),
  bottom: z.number().describe('Y coordinate of the bottom edge'),
  left: z.number().describe('X coordinate of the left edge'),
});

export const AnnotationInteractionSchema = z.object({
  type: InteractionTypeSchema.describe('Type of interaction'),
  selectedText: z
    .string()
    .optional()
    .describe('Selected text content if applicable'),
  selectedElement: SelectedElementSchema.optional().describe(
    'Selected element details if applicable',
  ),
  boundingRect: BoundingRectSchema.optional().describe(
    'Bounding rectangle of the selection',
  ),
});

export const AnnotationContextSchema = z.object({
  pageUrl: z.string().describe('URL of the page'),
  pageTitle: z.string().describe('Title of the page'),
  viewport: ViewportSchema.describe('Viewport dimensions'),
  userAgent: z.string().describe('User agent string'),
  domSnapshot: z
    .string()
    .optional()
    .describe('DOM snapshot at time of interaction'),
  manifestSnapshot: z
    .array(ManifestEntrySchema)
    .optional()
    .describe('Manifest snapshot at time of interaction'),
  userMessage: z.string().optional().describe("User's message/intent"),
  environment: EnvironmentSchema.optional().describe(
    'Development environment info',
  ),
  runtimeContext: RuntimeContextSchema.optional().describe(
    'Runtime context (Phase 1 & 2 features)',
  ),
});

export const AgentResponseSchema = z.object({
  message: z.string().optional().describe('Message from the agent'),
});

export const AnnotationSchema = z.object({
  metadata: AnnotationMetadataSchema.describe('Annotation metadata'),
  interaction: AnnotationInteractionSchema.describe('User interaction details'),
  context: AnnotationContextSchema.describe('Context at time of interaction'),
  agentResponse: AgentResponseSchema.optional().describe(
    "Agent's response if processed",
  ),
});

export const AnnotationSummarySchema = z.object({
  id: AnnotationIdSchema.describe('The annotation ID'),
  status: AnnotationStatusSchema.describe('The status of the annotation'),
  timestamp: z.string().describe('ISO 8601 timestamp of the annotation'),
  entryId: ManifestEntryIdSchema.optional().describe(
    'Associated manifest entry ID',
  ),
  componentName: z.string().optional().describe('The component name'),
  userMessageExcerpt: z
    .string()
    .optional()
    .describe('The user message excerpt'),
});

export type Annotation = z.infer<typeof AnnotationSchema>;
export type AnnotationSummary = z.infer<typeof AnnotationSummarySchema>;
export type AnnotationId = z.infer<typeof AnnotationIdSchema>;
export type AnnotationStatus = z.infer<typeof AnnotationStatusSchema>;
export type AnnotationInteraction = z.infer<typeof AnnotationInteractionSchema>;
export type AnnotationContext = z.infer<typeof AnnotationContextSchema>;
export type AnnotationMetadata = z.infer<typeof AnnotationMetadataSchema>;
export type AgentResponse = z.infer<typeof AgentResponseSchema>;

export type InteractionMode = z.infer<typeof InteractionModeSchema>;
export type InteractionType = z.infer<typeof InteractionTypeSchema>;
export type SelectedElement = z.infer<typeof SelectedElementSchema>;
export type BoundingRect = z.infer<typeof BoundingRectSchema>;

export type Viewport = z.infer<typeof ViewportSchema>;
export type Environment = z.infer<typeof EnvironmentSchema>;
export type RuntimeContext = z.infer<typeof RuntimeContextSchema>;
