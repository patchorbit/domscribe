/**
 * Shared types for test utilities
 */

import type { ManifestEntry } from '@domscribe/core';

/**
 * Configuration for a fixture
 */
export interface FixtureConfig {
  /** Path to fixture directory */
  path: string;
  /** Bundler type */
  bundler: 'vite' | 'webpack';
  /** Framework */
  framework: 'react' | 'vue' | 'angular';
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

/**
 * Manifest validation result
 */
export interface ManifestValidationResult {
  /** Whether manifest is valid */
  valid: boolean;
  /** Validation errors */
  errors: string[];
  /** Validation warnings */
  warnings: string[];
}
