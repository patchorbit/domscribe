/**
 * Tool contract types used by MCP adapters and the relay.
 * Aligns with the Phase A specification for v1 launch.
 * @module @domscribe/core/types/tools
 */

import type { Annotation } from './annotation.js';

/**
 * Optional fields that can be requested when resolving an element.
 */
export type ResolveElementInclude =
  | 'component'
  | 'range'
  | 'breadcrumbs'
  | 'styles';

/**
 * Request payload for the resolve.element tool.
 */
export interface ResolveElementRequest {
  id?: string;
  selector?: string;
  include?: ResolveElementInclude[];
}

/**
 * Source range expressed as start/end line numbers.
 */
export interface SourceRange {
  start: number;
  end: number;
}

/**
 * Response payload for resolve.element.
 */
export interface ResolveElementResponse {
  file: string;
  component: string;
  range?: SourceRange;
  breadcrumbs?: string[];
  confidence: number;
  manifestVersion: string;
}

/**
 * Time window requested for runtime context capture.
 */
export interface ContextWindow {
  beforeMs?: number;
  afterMs?: number;
}

/**
 * Request payload for context.get.
 */
export interface ContextGetRequest {
  id: string;
  window?: ContextWindow;
}

/**
 * Runtime event breadcrumb emitted around an interaction.
 */
export interface ContextEvent {
  type: string;
  handler?: string;
  ts?: number;
}

/**
 * Response payload for context.get.
 */
export interface ContextGetResponse {
  props?: Record<string, unknown>;
  state?: Record<string, unknown>;
  events?: ContextEvent[];
  perf?: Record<string, unknown>;
}

/**
 * Request payload for annotation.create.
 */
export interface AnnotationCreateRequest {
  annotation: Annotation;
}

/**
 * Response payload for annotation.list.
 */
export interface AnnotationListResponse {
  annotations: Annotation[];
}

/**
 * Response payload for annotation.get.
 */
export interface AnnotationGetResponse {
  annotation: Annotation;
}

/**
 * Unified diff entry supplied by an agent.
 */
export interface AgentPatch {
  path: string;
  diff: string;
  summary?: string;
}

/**
 * Envelope for a batch of patches returned by an agent.
 */
export interface AgentPatchBundle {
  schemaVersion?: string;
  patches: AgentPatch[];
}

/**
 * Request payload for patch.preview.
 */
export interface PatchPreviewRequest {
  diff: string;
  title?: string;
}

/**
 * Response payload for patch.preview.
 */
export interface PatchPreviewResponse {
  previewId: string;
  warnings?: string[];
  affected: string[];
}

/**
 * Request payload for patch.apply.
 */
export interface PatchApplyRequest {
  previewId: string;
}

/**
 * Commit metadata returned from patch.apply.
 */
export interface PatchApplyCommit {
  sha: string;
  message: string;
}

/**
 * Response payload for patch.apply.
 */
export interface PatchApplyResponse {
  commit?: PatchApplyCommit;
}

/**
 * Normalized error envelope returned by tools.
 */
export interface ToolError {
  code: string;
  message: string;
  recoverable: boolean;
  hint?: string;
}
