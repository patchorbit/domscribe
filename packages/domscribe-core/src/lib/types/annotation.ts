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
 * Runtime style snapshot for the annotated element.
 *
 * Captured by `@domscribe/runtime` at interaction time when
 * `domscribe.config.captureStyles` is enabled. Two slots:
 *
 * - `computed`: a fixed allowlist of computed-style properties (≤32 entries
 *   covering layout, spacing, typography, visual, and positioning). This is
 *   the ground truth for "what the user sees" — survives conditional class
 *   names, responsive variants, and runtime theme switches that build-time
 *   attribution alone cannot resolve.
 * - `customProperties`: resolved CSS custom properties (`--*` vars) on the
 *   element and its ancestors up to `:root`. Lets the agent recover the
 *   design-system token boundary without re-resolving Tailwind config or a
 *   styled-components theme.
 *
 * Both fields are optional. Capture is best-effort and respects the
 * existing per-element serialization budget (≤4 KB).
 */
export const ComponentStylesSchema = z.object({
  computed: z
    .record(z.string(), z.string())
    .optional()
    .describe(
      'Subset of computed CSS properties for the element, drawn from a fixed ≤32-property allowlist',
    ),
  customProperties: z
    .record(z.string(), z.string())
    .optional()
    .describe(
      'Resolved CSS custom properties (--* variables) inherited by the element from itself up to :root',
    ),
});

export const RuntimeContextSchema = z.object({
  componentProps: z.unknown().optional().describe('Component props snapshot'),
  componentState: z.unknown().optional().describe('Component state snapshot'),
  componentStyles: ComponentStylesSchema.optional().describe(
    'Computed-style allowlist + resolved CSS custom properties (captured when domscribe.config.captureStyles is enabled)',
  ),
  eventFlow: z.unknown().optional().describe('Event flow breadcrumbs'),
  performance: z.unknown().optional().describe('Performance metrics'),
});

export const AnnotationIdSchema = z
  .string()
  .regex(PATTERNS.ANNOTATION_ID)
  .describe('Unique identifier: ann_<nanoid>_<timestamp>');

/**
 * Verdict for a single post-edit verification call.
 *
 * - `match`: the post-edit state matches the user's intent (within the
 *   visual-diff threshold and the requested computed-style deltas).
 * - `partial`: some requested deltas match and some do not — the agent
 *   should consult `componentStylesDelta` / `computedStyleDelta` and retry.
 * - `no_change`: the comparator detected no visual or computed-style delta
 *   from the pre-edit baseline — the agent's edit did not affect the
 *   rendered element. Typically a wrong selector or a no-op edit.
 * - `regression`: the post-edit state diverged from the baseline in a way
 *   that did not match the intent — the agent likely broke something.
 */
export const VerifyVerdictSchema = z.enum([
  'match',
  'partial',
  'no_change',
  'regression',
]);

/**
 * Numeric delta between a baseline value and a post-edit value for a single
 * `BoundingRect` field. Recorded only when a non-zero delta is observed.
 */
export const BoundingRectDeltaSchema = z.object({
  field: z
    .enum(['x', 'y', 'width', 'height', 'top', 'right', 'bottom', 'left'])
    .describe('Which BoundingRect field changed'),
  before: z.number().describe('Baseline value (px)'),
  after: z.number().describe('Post-edit value (px)'),
});

/**
 * Delta between baseline and post-edit values for a single style property.
 * Used for both `componentStyles.computed` and `selectedElement.computedStyles`.
 * Recorded only when the property's resolved value differs.
 */
export const StylePropertyDeltaSchema = z.object({
  property: z.string().describe('CSS property name (e.g. "padding")'),
  before: z
    .string()
    .nullable()
    .describe(
      'Baseline resolved value; `null` when the property was absent before',
    ),
  after: z
    .string()
    .nullable()
    .describe(
      'Post-edit resolved value; `null` when the property is absent after',
    ),
});

/**
 * Result of a single `verify_after_edit` MCP call (RFC 0002).
 *
 * Returned by the relay's verify tool to the agent so it can reason about
 * its own edit on retry rather than re-guessing from source. Shape is
 * deliberately structured (not a binary pass/fail) — the falsifier
 * (≥60% retry-resolution rate) requires actionable deltas.
 *
 * All delta fields are optional; the verdict alone may be sufficient when
 * the baseline matches exactly.
 *
 * `screenshotRef` is intentionally a relay-side blob reference, never inline
 * bytes — preserves the 4 KB-per-element serialization budget from RFC 0001.
 */
export const VerifyResultSchema = z.object({
  verdict: VerifyVerdictSchema.describe('Overall verification outcome'),
  timestamp: z.string().describe('ISO 8601 timestamp of the verify call'),
  pixelDiffRatio: z
    .number()
    .min(0)
    .max(1)
    .optional()
    .describe(
      'Fraction of pixels that differ between the post-edit screenshot and the pre-edit baseline (0 = identical)',
    ),
  componentStylesDelta: z
    .array(StylePropertyDeltaSchema)
    .optional()
    .describe(
      'Per-property deltas on the runtime `componentStyles.computed` allowlist (RFC 0001)',
    ),
  computedStyleDelta: z
    .array(StylePropertyDeltaSchema)
    .optional()
    .describe(
      'Per-property deltas on `selectedElement.computedStyles` outside the componentStyles allowlist',
    ),
  boundingRectDelta: z
    .array(BoundingRectDeltaSchema)
    .optional()
    .describe('Per-field deltas on the element bounding rectangle'),
  screenshotRef: z
    .string()
    .optional()
    .describe(
      'Relay-side blob reference for the post-edit element screenshot (never inlined bytes)',
    ),
  notes: z
    .string()
    .optional()
    .describe(
      'Human-readable reason or comparator note (e.g. "baseline missing")',
    ),
});

/**
 * Current annotation schema version. Bump when the Annotation shape changes.
 *
 * Version history:
 * - v1: initial schema.
 * - v2: added optional `runtimeContext.componentStyles` (computed-style
 *   allowlist + CSS custom properties) and optional `styleSource` on
 *   embedded `manifestSnapshot` entries, per RFC 0001.
 * - v3: added optional `context.verifyHistory` (an array of `VerifyResult`
 *   records from `verify_after_edit` MCP calls), per RFC 0002. Older
 *   clients silently ignore the field.
 */
export const ANNOTATION_SCHEMA_VERSION = 3;

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
  verifyHistory: z
    .array(VerifyResultSchema)
    .optional()
    .describe(
      'Append-only history of `verify_after_edit` calls for this annotation (RFC 0002). Optional — absent on annotations that were not verified, and silently ignored by pre-v3 clients.',
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
export type ComponentStyles = z.infer<typeof ComponentStylesSchema>;
export type VerifyVerdict = z.infer<typeof VerifyVerdictSchema>;
export type VerifyResult = z.infer<typeof VerifyResultSchema>;
export type StylePropertyDelta = z.infer<typeof StylePropertyDeltaSchema>;
export type BoundingRectDelta = z.infer<typeof BoundingRectDeltaSchema>;

/**
 * Allowlist of computed-style property names captured by the runtime
 * `StyleCapturer` (≤32 entries). Lives in `@domscribe/core` so the
 * runtime, the relay, and downstream tools agree on the contract.
 *
 * Covers layout, spacing, typography, visual, and positioning — chosen to
 * be a useful styling-debug subset without bloating the per-element
 * serialization budget.
 */
export const COMPONENT_STYLES_ALLOWLIST = [
  // Layout
  'display',
  'position',
  'flex-direction',
  'flex-wrap',
  'align-items',
  'justify-content',
  'gap',
  'grid-template-columns',
  'grid-template-rows',
  // Spacing
  'margin',
  'padding',
  'width',
  'height',
  'min-width',
  'min-height',
  'max-width',
  'max-height',
  // Typography
  'font-family',
  'font-size',
  'font-weight',
  'line-height',
  'letter-spacing',
  'text-align',
  'color',
  // Visual
  'background-color',
  'border',
  'border-radius',
  'box-shadow',
  'opacity',
  // Positioning
  'top',
  'right',
  'bottom',
  'left',
] as const satisfies readonly string[];

export type ComponentStylesAllowlist =
  (typeof COMPONENT_STYLES_ALLOWLIST)[number];
