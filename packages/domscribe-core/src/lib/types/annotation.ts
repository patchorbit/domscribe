/**
 * Canonical Annotation data model for Domscribe.
 * Represents a structured record of a user interaction with captured context.
 * @module @domscribe/core/types/annotation
 */

import type { AgentPatchBundle } from './tools.js';
import type { ManifestEntry } from './manifest.js';

/**
 * Status lifecycle states for an annotation
 */
export type AnnotationStatus =
  | 'queued'
  | 'processing'
  | 'processed'
  | 'failed'
  | 'archived';

/**
 * Types of user interactions that can be annotated
 */
export type InteractionMode = 'element-click' | 'text-selection';

/**
 * Types of annotation interactions
 */
export type InteractionType = 'element-annotation' | 'text-selection';

/**
 * Metadata about an annotation
 */
export interface AnnotationMetadata {
  /** Unique identifier: ann_<nanoid>_<timestamp> */
  id: string;
  /** ISO 8601 timestamp */
  timestamp: string;
  /** Mode of interaction */
  mode: InteractionMode;
  /** Current status in the lifecycle */
  status: AnnotationStatus;
  /** ID of the agent processing this annotation */
  agentId?: string;
  /** Details about any errors that occurred */
  errorDetails?: string;
}

/**
 * Information about the selected element
 */
export interface SelectedElement {
  /** HTML tag name */
  tagName: string;
  /** CSS selector path to the element */
  selector: string;
  /** Domscribe element ID if transformed */
  dataDs?: string;
  /** Element attributes */
  attributes?: Record<string, string>;
  /** First 100 characters of inner text */
  innerText?: string;
  /** Computed styles for the element */
  computedStyles?: Record<string, string>;
}

/**
 * Bounding rectangle dimensions
 */
export interface BoundingRect {
  x: number;
  y: number;
  width: number;
  height: number;
  top: number;
  right: number;
  bottom: number;
  left: number;
}

/**
 * Details about the user interaction
 */
export interface AnnotationInteraction {
  /** Type of interaction */
  type: InteractionType;
  /** Selected text content if applicable */
  selectedText?: string;
  /** Selected element details if applicable */
  selectedElement?: SelectedElement;
  /** Bounding rectangle of the selection */
  boundingRect?: BoundingRect;
}

/**
 * Viewport dimensions
 */
export interface Viewport {
  width: number;
  height: number;
}

/**
 * Environment information
 */
export interface Environment {
  /** Node.js version */
  nodeVersion?: string;
  /** Framework version */
  frameworkVersion?: string;
  /** Package manager used */
  packageManager?: string;
}

/**
 * Runtime context captured during interaction
 */
export interface RuntimeContext {
  /** Component props snapshot */
  componentProps?: unknown;
  /** Component state snapshot */
  componentState?: unknown;
  /** Event flow breadcrumbs */
  eventFlow?: unknown;
  /** Performance metrics */
  performance?: unknown;
}

/**
 * Context surrounding the annotation
 */
export interface AnnotationContext {
  /** URL of the page */
  pageUrl: string;
  /** Title of the page */
  pageTitle: string;
  /** Viewport dimensions */
  viewport: Viewport;
  /** User agent string */
  userAgent: string;
  /** DOM snapshot at time of interaction */
  domSnapshot?: string;
  /** Manifest snapshot at time of interaction */
  manifestSnapshot?: ManifestEntry[];
  /** User's message/intent */
  userMessage?: string;
  /** Development environment info */
  environment?: Environment;
  /** Runtime context (Phase 1 & 2 features) */
  runtimeContext?: RuntimeContext;
}

/**
 * Response from an AI agent
 */
export interface AgentResponse {
  /** Message from the agent */
  message?: string;
  /** Unified diff bundle proposed by the agent */
  patchBundle?: AgentPatchBundle;
  /** Preview identifier returned by patch.preview */
  previewId?: string;
  /** Timestamp when patches were applied */
  appliedAt?: string;
}

/**
 * Complete annotation structure
 */
export interface Annotation {
  /** Annotation metadata */
  metadata: AnnotationMetadata;
  /** User interaction details */
  interaction: AnnotationInteraction;
  /** Context at time of interaction */
  context: AnnotationContext;
  /** Agent's response if processed */
  agentResponse?: AgentResponse;
}
