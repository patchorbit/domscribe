/**
 * Shared types for test utilities
 */

/** Source position in a file (mirrors @domscribe/core shape) */
export interface SourcePosition {
  line: number | null;
  column: number | null;
  offset?: number;
}

/**
 * A single manifest entry mapping an element to its source location.
 * Defined locally so integration tests have zero compile-time dependency
 * on @domscribe/* packages (black-box testing contract).
 */
export interface ManifestEntry {
  id: string;
  elementId?: string;
  file: string;
  start: SourcePosition;
  end?: SourcePosition;
  tagName?: string;
  parent?: string;
  children?: string[];
  isApproximateLocation?: boolean;
  componentName?: string;
  fileHash?: string;
  styles?: {
    file?: string;
    classNames?: string[];
    modules?: boolean;
    inline?: string;
  };
  dataBindings?: Record<string, unknown>;
  wrappers?: string[];
  componentMetadata?: Record<
    string,
    Record<string, unknown> | string | number | boolean
  >;
}

/**
 * Configuration for a fixture
 */
export interface FixtureConfig {
  /** Path to fixture directory */
  path: string;
  /** Bundler type */
  bundler: 'vite' | 'webpack' | 'next' | 'nuxt';
  /** Framework */
  framework: 'react' | 'vue' | 'angular' | 'next' | 'nuxt';
  /** Language variant */
  language: 'ts' | 'js';
  /** Bundler version */
  bundlerVersion: string;
  /** Framework version */
  frameworkVersion: string;
}

/**
 * Options for building a fixture
 */
export interface BuildOptions {
  /** Build mode */
  mode?: 'development' | 'production';
  /** Capture build statistics */
  captureStats?: boolean;
  /** Disable Domscribe (for baseline comparison) */
  disableDomscribe?: boolean;
}

/**
 * Result of building a fixture
 */
export interface FixtureBuildResult {
  /** Output directory path */
  outputDir: string;
  /** Path to manifest.jsonl */
  manifestPath: string;
  /** Build time in milliseconds */
  buildTime: number;
  /** Build statistics (if captured) */
  stats?: {
    filesTransformed: number;
    elementsInjected: number;
    averageTimePerFile: number;
  };
}

/**
 * Parsed bundle information
 */
export interface ParsedBundle {
  /** HTML content */
  html: string;
  /** JavaScript content */
  js: string;
  /** Extracted data-ds attribute values */
  dataDs: string[];
  /** Total element count */
  elementCount: number;
}

/**
 * Manifest data
 */
export interface ManifestData {
  /** Manifest metadata */
  metadata?: {
    version: string;
    createdAt: string;
    updatedAt: string;
  };
  /** Map of element ID to manifest entry */
  entries: Map<string, ManifestEntry>;
}
