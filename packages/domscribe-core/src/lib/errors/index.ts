/**
 * Error types and error handling utilities for Domscribe.
 * Follows RFC 7807 (Problem Details for HTTP APIs) format.
 * @module @domscribe/core/errors
 */

import { z } from 'zod/v4';

/**
 * Domscribe error codes following the DS_* convention.
 * These codes are used across the system for consistent error identification.
 */
export enum DomscribeErrorCode {
  // Validation errors
  DS_VALIDATION_FAILED = 'DS_VALIDATION_FAILED',

  // Conflict errors
  DS_CONFLICT = 'DS_CONFLICT',

  // Manifest errors
  DS_MANIFEST_INVALID = 'DS_MANIFEST_INVALID',
  DS_MANIFEST_NOTFOUND = 'DS_MANIFEST_NOTFOUND',
  DS_MANIFEST_CORRUPTED = 'DS_MANIFEST_CORRUPTED',
  DS_ELEMENT_NOT_FOUND = 'DS_ELEMENT_NOT_FOUND',

  // Annotation errors
  DS_ANNOTATION_INVALID = 'DS_ANNOTATION_INVALID',
  DS_ANNOTATION_NOTFOUND = 'DS_ANNOTATION_NOTFOUND',
  DS_ANNOTATION_PROCESSING = 'DS_ANNOTATION_PROCESSING',

  // Adapter/agent tool errors
  DS_RESOLVE_STALE_TARGET = 'DS_RESOLVE_STALE_TARGET',
  DS_DIFF_INVALID = 'DS_DIFF_INVALID',
  DS_WRITE_GUARD_BLOCKED = 'DS_WRITE_GUARD_BLOCKED',
  DS_AGENT_UNAVAILABLE = 'DS_AGENT_UNAVAILABLE',

  // Transform errors
  DS_TRANSFORM_FAILED = 'DS_TRANSFORM_FAILED',
  DS_TRANSFORM_UNSUPPORTED = 'DS_TRANSFORM_UNSUPPORTED',

  // Relay errors
  DS_RELAY_UNAVAILABLE = 'DS_RELAY_UNAVAILABLE',
  DS_RELAY_TIMEOUT = 'DS_RELAY_TIMEOUT',

  // MCP errors
  DS_MCP_INVALID_REQUEST = 'DS_MCP_INVALID_REQUEST',
  DS_MCP_METHOD_NOT_FOUND = 'DS_MCP_METHOD_NOT_FOUND',

  // Generic errors
  DS_INTERNAL_ERROR = 'DS_INTERNAL_ERROR',
  DS_INVALID_INPUT = 'DS_INVALID_INPUT',
  DS_NOT_IMPLEMENTED = 'DS_NOT_IMPLEMENTED',
}

/**
 * Problem Details object following RFC 7807
 */
export const ProblemDetailsSchema = z.object({
  code: z
    .enum(DomscribeErrorCode)
    .describe('Error code from DomscribeErrorCode enum'),
  title: z.string().describe('Short, human-readable summary of the problem'),
  detail: z
    .string()
    .optional()
    .describe('Human-readable explanation specific to this occurrence'),
  instance: z
    .string()
    .optional()
    .describe('URI reference that identifies the specific occurrence'),
  status: z.number().optional().describe('HTTP status code (when applicable)'),
  extensions: z
    .record(z.string(), z.unknown())
    .optional()
    .describe('Additional problem-specific data'),
});

export type ProblemDetails = z.infer<typeof ProblemDetailsSchema>;

/**
 * Base class for all Domscribe errors
 */
export class DomscribeError extends Error {
  public readonly code: DomscribeErrorCode;
  public readonly status?: number;
  public readonly detail?: string;
  public readonly instance?: string;
  public readonly extensions?: Record<string, unknown>;

  constructor(problemDetails: ProblemDetails) {
    super(problemDetails.title);
    this.name = 'DomscribeError';
    this.code = problemDetails.code;
    this.status = problemDetails.status;
    this.detail = problemDetails.detail;
    this.instance = problemDetails.instance;
    this.extensions = problemDetails.extensions;

    // Maintain proper stack trace for debugging
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, DomscribeError);
    }
  }

  /**
   * Converts the error to a Problem Details object
   */
  toProblemDetails(): ProblemDetails {
    return {
      code: this.code,
      title: this.message,
      detail: this.detail,
      instance: this.instance,
      status: this.status,
      extensions: this.extensions,
    };
  }

  /**
   * Converts the error to a JSON representation
   */
  toJSON(): Record<string, unknown> {
    return {
      code: this.code,
      title: this.message,
      detail: this.detail,
      instance: this.instance,
      status: this.status,
      ...this.extensions,
    };
  }
}
