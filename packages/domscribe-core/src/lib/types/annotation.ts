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

/**
 * Component-style snapshot captured at runtime.
 *
 * `computed` is a bounded subset of CSS properties resolved via
 * `getComputedStyle()` against the picked element (see the
 * `STYLE_CAPTURE_ALLOWLIST` in `@domscribe/runtime`). `customProperties` are
 * the resolved `--*` CSS variables visible from the element up to `:root`,
 * used as the runtime token boundary for design-system attribution.
 *
 * Both fields are optional so older clients can ignore them. Companion
 * build-time `styleSource` attribution lives on `ManifestEntry` and is
 * intentionally separate — runtime context here is ground truth for what is
 * rendered; the manifest field is ground truth for where it came from.
 */
export const ComponentStylesSchema = z.object({
  computed: z
    .record(z.string(), z.string())
    .optional()
    .describe(
      'Computed CSS properties from the allowlist (≤32 entries: layout, spacing, typography, visual, positioning)',
    ),
  customProperties: z
    .record(z.string(), z.string())
    .optional()
    .describe(
      'Resolved `--*` CSS custom properties visible from the element through its ancestors up to `:root`',
    ),
});

export const RuntimeContextSchema = z.object({
  componentProps: z.unknown().optional().describe('Component props snapshot'),
  componentState: z.unknown().optional().describe('Component state snapshot'),
  eventFlow: z.unknown().optional().describe('Event flow breadcrumbs'),
  performance: z.unknown().optional().describe('Performance metrics'),
  componentStyles: ComponentStylesSchema.optional().describe(
    'Captured computed styles + resolved CSS custom properties for the picked element. Populated when `domscribe.config.captureStyles` is enabled.',
  ),
});

export const AnnotationIdSchema = z
  .string()
  .regex(PATTERNS.ANNOTATION_ID)
  .describe('Unique identifier: ann_<nanoid>_<timestamp>');

/**
 * Current annotation schema version. Bump when the Annotation shape changes.
 *
 * v1 → v2: introduce optional `verifyHistory: VerifyResult[]` on Annotation
 *           for the RFC 0002 verify_after_edit workflow. Older clients ignore
 *           the field; the migration is a pure stamp (additive change).
 */
export const ANNOTATION_SCHEMA_VERSION = 2;

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

/**
 * Verdict produced by `verify_after_edit` comparing pre/post-edit captures.
 *
 *   match       — visual + computed-style + boundingRect within tolerance
 *   partial     — some axes match, some drifted (agent should reconcile)
 *   no_change   — post-edit capture is indistinguishable from pre-edit
 *                 baseline; almost always means the edit did not land in
 *                 the rendered output the user is looking at
 *   regression  — measurable backslide on at least one axis vs. baseline
 *
 * See RFC 0002 §Decision for the verdict semantics.
 */
export const VerifyVerdictSchema = z.enum([
  'match',
  'partial',
  'no_change',
  'regression',
]);

/**
 * Per-property delta keyed by CSS property name. Values are the
 * `[before, after]` pair; absence of a key means "unchanged". Bounded
 * by the StyleCapturer allowlist so the payload stays well under 4 KB.
 */
export const ComponentStylesDeltaSchema = z.record(
  z.string(),
  z.tuple([z.string(), z.string()]),
);

/**
 * Bounding-rect delta — only the four edges plus dimensions are surfaced,
 * matching `BoundingRectSchema`. Each axis is `[before, after]`. Keys
 * absent from this record were unchanged. Keys are constrained at the
 * comparator level (see `@domscribe/verify`), kept as `string` here so
 * the record stays partial without per-key optional bookkeeping.
 */
export const BoundingRectDeltaSchema = z.record(
  z.string(),
  z.tuple([z.number(), z.number()]),
);

/**
 * Result of `verify_after_edit` — the structured verdict the agent
 * reconciles against on retry. Built on RFC 0001's componentStyles surface;
 * `screenshotRef` is a relay-blob reference (never the raw bytes — the
 * 4 KB-per-element serialization budget assumes screenshots are external).
 */
export const VerifyResultSchema = z.object({
  annotationId: AnnotationIdSchema.describe(
    'Annotation this verify result is bound to',
  ),
  verdict: VerifyVerdictSchema.describe(
    'Overall verdict — see VerifyVerdictSchema for semantics',
  ),
  pixelDiffRatio: z
    .number()
    .min(0)
    .max(1)
    .describe(
      'Fraction of element-scoped pixels that differ between pre/post screenshots in [0, 1]',
    ),
  pixelDiffPixels: z
    .number()
    .int()
    .nonnegative()
    .describe('Absolute pixel-count diff (companion to pixelDiffRatio)'),
  componentStylesDelta: ComponentStylesDeltaSchema.describe(
    'Per-CSS-property [before, after] pairs for properties that changed',
  ),
  boundingRectDelta: BoundingRectDeltaSchema.describe(
    'Per-axis [before, after] pairs for boundingRect entries that changed',
  ),
  screenshotRef: z
    .string()
    .optional()
    .describe(
      'Opaque relay-blob reference for the post-edit element screenshot. NEVER raw bytes — fetch via the relay if the agent needs the image.',
    ),
  capturedAt: z
    .string()
    .describe('ISO 8601 timestamp when the post-edit capture was taken'),
  reason: z
    .string()
    .optional()
    .describe(
      'Human-readable explanation when the verdict is not "match" — surface in agent retry prompts',
    ),
});

export type VerifyVerdict = z.infer<typeof VerifyVerdictSchema>;
export type ComponentStylesDelta = z.infer<typeof ComponentStylesDeltaSchema>;
export type BoundingRectDelta = z.infer<typeof BoundingRectDeltaSchema>;
export type VerifyResult = z.infer<typeof VerifyResultSchema>;

export const AnnotationSchema = z.object({
  metadata: AnnotationMetadataSchema.describe('Annotation metadata'),
  interaction: AnnotationInteractionSchema.describe('User interaction details'),
  context: AnnotationContextSchema.describe('Context at time of interaction'),
  agentResponse: AgentResponseSchema.optional().describe(
    "Agent's response if processed",
  ),
  verifyHistory: z
    .array(VerifyResultSchema)
    .optional()
    .describe(
      'Verify-after-edit results, appended in call order. Optional — older clients ignore. Soft-recommended; not gated by the annotation lifecycle.',
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
export type ComponentStyles = z.infer<typeof ComponentStylesSchema>;
