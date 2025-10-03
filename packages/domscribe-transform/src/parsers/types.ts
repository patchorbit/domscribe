import { SourcePosition } from '@domscribe/core';

/**
 * Configuration options for parsing
 */
export interface ParseParams {
  /**
   * Source file path (for error messages and source maps)
   */
  sourceFile?: string;

  /**
   * Module type: 'module' (default) or 'script'
   */
  sourceType?: 'module' | 'script';
}

/**
 * Source location information with line, column, and byte offset
 */
export interface SourceLocation {
  /**
   * Starting position in source code
   */
  start: SourcePosition;

  /**
   * Ending position in source code (optional for single-point positions)
   */
  end?: SourcePosition;
}
