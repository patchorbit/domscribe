/**
 * Error types and error handling utilities for Domscribe.
 * Follows RFC 7807 (Problem Details for HTTP APIs) format.
 * @module @domscribe/core/errors
 */

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
export interface ProblemDetails {
  /** Error code from DomscribeErrorCode enum */
  code: DomscribeErrorCode;
  /** Short, human-readable summary of the problem */
  title: string;
  /** Human-readable explanation specific to this occurrence */
  detail?: string;
  /** URI reference that identifies the specific occurrence */
  instance?: string;
  /** HTTP status code (when applicable) */
  status?: number;
  /** Additional problem-specific data */
  extensions?: Record<string, unknown>;
}

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

/**
 * Error for validation operations
 */
export class ValidationError extends DomscribeError {
  constructor(detail?: string, extensions?: Record<string, unknown>) {
    super({
      code: DomscribeErrorCode.DS_VALIDATION_FAILED,
      title: 'Validation failed',
      detail,
      status: 422,
      extensions,
    });
    this.name = 'ValidationError';
  }
}

/**
 * Error for manifest operations
 */
export class ManifestError extends DomscribeError {
  constructor(
    code:
      | DomscribeErrorCode.DS_MANIFEST_INVALID
      | DomscribeErrorCode.DS_MANIFEST_NOTFOUND
      | DomscribeErrorCode.DS_MANIFEST_CORRUPTED,
    detail?: string,
  ) {
    const titles = {
      [DomscribeErrorCode.DS_MANIFEST_INVALID]: 'Invalid manifest',
      [DomscribeErrorCode.DS_MANIFEST_NOTFOUND]: 'Manifest not found',
      [DomscribeErrorCode.DS_MANIFEST_CORRUPTED]: 'Manifest corrupted',
    };

    const statuses = {
      [DomscribeErrorCode.DS_MANIFEST_INVALID]: 400,
      [DomscribeErrorCode.DS_MANIFEST_NOTFOUND]: 404,
      [DomscribeErrorCode.DS_MANIFEST_CORRUPTED]: 500,
    };

    super({
      code,
      title: titles[code],
      detail,
      status: statuses[code],
    });
    this.name = 'ManifestError';
  }
}

/**
 * Error for annotation operations
 */
export class AnnotationError extends DomscribeError {
  constructor(
    code:
      | DomscribeErrorCode.DS_ANNOTATION_INVALID
      | DomscribeErrorCode.DS_ANNOTATION_NOTFOUND
      | DomscribeErrorCode.DS_ANNOTATION_PROCESSING,
    detail?: string,
  ) {
    const titles = {
      [DomscribeErrorCode.DS_ANNOTATION_INVALID]: 'Invalid annotation',
      [DomscribeErrorCode.DS_ANNOTATION_NOTFOUND]: 'Annotation not found',
      [DomscribeErrorCode.DS_ANNOTATION_PROCESSING]:
        'Annotation is being processed',
    };

    const statuses = {
      [DomscribeErrorCode.DS_ANNOTATION_INVALID]: 400,
      [DomscribeErrorCode.DS_ANNOTATION_NOTFOUND]: 404,
      [DomscribeErrorCode.DS_ANNOTATION_PROCESSING]: 409,
    };

    super({
      code,
      title: titles[code],
      detail,
      status: statuses[code],
    });
    this.name = 'AnnotationError';
  }
}

/**
 * Error for stale resolve targets
 */
export class ResolveStaleTargetError extends DomscribeError {
  constructor(detail?: string) {
    super({
      code: DomscribeErrorCode.DS_RESOLVE_STALE_TARGET,
      title: 'Resolved element is stale',
      detail:
        detail ||
        'The selected element no longer maps to a manifest entry. Re-select the element and try again.',
      status: 409,
    });
    this.name = 'ResolveStaleTargetError';
  }
}

/**
 * Error for invalid diff payloads
 */
export class DiffInvalidError extends DomscribeError {
  constructor(detail?: string) {
    super({
      code: DomscribeErrorCode.DS_DIFF_INVALID,
      title: 'Invalid diff payload',
      detail:
        detail ||
        'The diff could not be parsed. Ensure the payload is a valid unified diff.',
      status: 422,
    });
    this.name = 'DiffInvalidError';
  }
}

/**
 * Error when patch apply is blocked by write guard
 */
export class WriteGuardBlockedError extends DomscribeError {
  constructor(detail?: string) {
    super({
      code: DomscribeErrorCode.DS_WRITE_GUARD_BLOCKED,
      title: 'Patch apply blocked',
      detail:
        detail ||
        'Apply requires explicit user approval. Confirm in the UI before retrying.',
      status: 403,
    });
    this.name = 'WriteGuardBlockedError';
  }
}

/**
 * Error for MCP/agent connectivity failures
 */
export class AgentUnavailableError extends DomscribeError {
  constructor(detail?: string) {
    super({
      code: DomscribeErrorCode.DS_AGENT_UNAVAILABLE,
      title: 'Agent unavailable',
      detail:
        detail ||
        'The connected agent became unavailable. Reconnect and retry.',
      status: 503,
    });
    this.name = 'AgentUnavailableError';
  }
}

/**
 * Helper function to determine if an error is a Domscribe error
 */
export function isDomscribeError(error: unknown): error is DomscribeError {
  return error instanceof DomscribeError;
}

/**
 * Helper function to create an error from a Problem Details object
 */
export function createErrorFromProblemDetails(
  problemDetails: ProblemDetails,
): DomscribeError {
  // Try to use specific error classes based on the code
  switch (problemDetails.code) {
    case DomscribeErrorCode.DS_VALIDATION_FAILED:
      return new ValidationError(
        problemDetails.detail,
        problemDetails.extensions,
      );

    case DomscribeErrorCode.DS_MANIFEST_INVALID:
    case DomscribeErrorCode.DS_MANIFEST_NOTFOUND:
    case DomscribeErrorCode.DS_MANIFEST_CORRUPTED:
      return new ManifestError(problemDetails.code, problemDetails.detail);

    case DomscribeErrorCode.DS_ANNOTATION_INVALID:
    case DomscribeErrorCode.DS_ANNOTATION_NOTFOUND:
    case DomscribeErrorCode.DS_ANNOTATION_PROCESSING:
      return new AnnotationError(problemDetails.code, problemDetails.detail);

    case DomscribeErrorCode.DS_RESOLVE_STALE_TARGET:
      return new ResolveStaleTargetError(problemDetails.detail);

    case DomscribeErrorCode.DS_DIFF_INVALID:
      return new DiffInvalidError(problemDetails.detail);

    case DomscribeErrorCode.DS_WRITE_GUARD_BLOCKED:
      return new WriteGuardBlockedError(problemDetails.detail);

    case DomscribeErrorCode.DS_AGENT_UNAVAILABLE:
      return new AgentUnavailableError(problemDetails.detail);

    default:
      return new DomscribeError(problemDetails);
  }
}
