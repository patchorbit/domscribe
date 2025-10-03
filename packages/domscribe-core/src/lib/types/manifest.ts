/**
 * Canonical Manifest data model for Domscribe.
 * Represents the DOM→source mapping index for element resolution.
 * @module @domscribe/core/types/manifest
 */

/**
 * Source code position
 */
export interface SourcePosition {
  /** Line number (1-indexed) */
  line: number | null;
  /** Column number (0-indexed) */
  column: number | null;
  /** Byte offset from start of file */
  offset?: number;
}

/**
 * Style information for a component
 */
export interface StyleInfo {
  /** Path to style file */
  file?: string;
  /** Class names */
  classNames?: string[];
  /** Whether CSS modules are used */
  modules?: boolean;
  /** Inline style content */
  inline?: string;
}

/**
 * Canonical manifest entry mapping a DOM element to source code
 */
export interface ManifestEntry<TMetaRecord extends object = object> {
  /** 8-character nanoid for the element */
  id: string;
  /** Element ID from the <id> attribute if present */
  elementId?: string;
  /** File path from project root */
  file: string;
  /** Start position in source */
  start: SourcePosition;
  /** End position in source (optional for single-line elements) */
  end?: SourcePosition;
  /** Tag name */
  tagName?: string;
  /** Associated styles */
  styles?: StyleInfo;
  /** Parent element ID */
  parent?: string;
  /** Child element IDs */
  children?: string[];
  /** Whether the source location is approximate (fallback to nearest stable ancestor) */
  isApproximateLocation?: boolean;
  /** Component name */
  componentName?: string;
  /** Component data bindings */
  dataBindings?: Record<string, unknown>;
  /** Wrapper component names in order */
  wrappers?: string[];
  /** Framework-specific component metadata */
  componentMetadata?: ComponentMetadata<TMetaRecord>;
}

/**
 * Manifest metadata
 */
export interface ManifestMetadata {
  /** Schema version for the manifest format */
  schemaVersion: string;
  /** Timestamp of manifest generation */
  generatedAt: string;
  /** Project root path */
  projectRoot: string;
  /** Framework being used */
  framework?: string;
  /** Framework version */
  frameworkVersion?: string;
}

/**
 * Complete manifest structure
 */
export interface Manifest {
  /** Manifest metadata */
  metadata: ManifestMetadata;
  /** Map of element IDs to manifest entries */
  entries: Map<string, ManifestEntry>;
}

/**
 * Manifest delta for incremental updates
 */
export interface ManifestDelta {
  /** Type of change */
  type: 'add' | 'update' | 'delete';
  /** Entry ID affected */
  id: string;
  /** New or updated entry (not present for deletions) */
  entry?: ManifestEntry;
  /** Timestamp of the change */
  timestamp: string;
}

/**
 * Manifest snapshot for recovery
 */
export interface ManifestSnapshot {
  /** Git commit SHA or timestamp */
  id: string;
  /** Timestamp when snapshot was taken */
  timestamp: string;
  /** Complete manifest entries at this point */
  entries: ManifestEntry[];
  /** Associated metadata */
  metadata: ManifestMetadata;
}

/**
 * Manifest index for fast lookups
 */
export interface ManifestIndex {
  /** Map from element ID to file path for O(1) lookups */
  idToFile: Map<string, string>;
  /** Map from file path to element IDs in that file */
  fileToIds: Map<string, string[]>;
  /** Map from component name to element IDs */
  componentToIds: Map<string, string[]>;
  /** Last rebuild timestamp */
  lastRebuild: string;
  /** Total number of entries */
  entryCount: number;
}

export type ComponentMetadata<TMetaRecord extends object = object> = Record<
  string,
  TMetaRecord | string | number | boolean
>;
