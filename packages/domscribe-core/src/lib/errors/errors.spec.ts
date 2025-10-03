/**
 * Unit tests for error types and utilities
 * @module @domscribe/core/errors.spec
 */

import { describe, it, expect } from 'vitest';
import {
  DomscribeError,
  DomscribeErrorCode,
  ValidationError,
  ManifestError,
  AnnotationError,
  ResolveStaleTargetError,
  DiffInvalidError,
  WriteGuardBlockedError,
  AgentUnavailableError,
  isDomscribeError,
  createErrorFromProblemDetails,
  type ProblemDetails,
} from './index.js';

describe('Error Types', () => {
  describe('DomscribeError', () => {
    it('should create a base error with all properties', () => {
      const problemDetails: ProblemDetails = {
        code: DomscribeErrorCode.DS_INTERNAL_ERROR,
        title: 'Internal server error',
        detail: 'Something went wrong',
        instance: '/api/v1/test',
        status: 500,
        extensions: { requestId: '123' },
      };

      const error = new DomscribeError(problemDetails);

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(DomscribeError);
      expect(error.name).toBe('DomscribeError');
      expect(error.message).toBe('Internal server error');
      expect(error.code).toBe(DomscribeErrorCode.DS_INTERNAL_ERROR);
      expect(error.detail).toBe('Something went wrong');
      expect(error.instance).toBe('/api/v1/test');
      expect(error.status).toBe(500);
      expect(error.extensions).toEqual({ requestId: '123' });
    });

    it('should convert to ProblemDetails', () => {
      const problemDetails: ProblemDetails = {
        code: DomscribeErrorCode.DS_INTERNAL_ERROR,
        title: 'Internal server error',
        detail: 'Something went wrong',
        instance: '/api/v1/test',
        status: 500,
        extensions: { requestId: '123' },
      };

      const error = new DomscribeError(problemDetails);
      const converted = error.toProblemDetails();

      expect(converted).toEqual(problemDetails);
    });

    it('should convert to JSON', () => {
      const error = new DomscribeError({
        code: DomscribeErrorCode.DS_INTERNAL_ERROR,
        title: 'Error',
        detail: 'Details',
        status: 500,
        extensions: { extra: 'data' },
      });

      const json = error.toJSON();

      expect(json).toEqual({
        code: DomscribeErrorCode.DS_INTERNAL_ERROR,
        title: 'Error',
        detail: 'Details',
        status: 500,
        extra: 'data',
      });
    });

    it('should maintain stack trace', () => {
      const error = new DomscribeError({
        code: DomscribeErrorCode.DS_INTERNAL_ERROR,
        title: 'Error',
      });

      expect(error.stack).toBeDefined();
      expect(error.stack).toContain('DomscribeError');
    });
  });

  describe('ValidationError', () => {
    it('should create validation error with details', () => {
      const error = new ValidationError('Invalid input format', {
        field: 'email',
        value: 'invalid',
      });

      expect(error).toBeInstanceOf(ValidationError);
      expect(error.name).toBe('ValidationError');
      expect(error.code).toBe(DomscribeErrorCode.DS_VALIDATION_FAILED);
      expect(error.message).toBe('Validation failed');
      expect(error.detail).toBe('Invalid input format');
      expect(error.status).toBe(422);
      expect(error.extensions).toEqual({
        field: 'email',
        value: 'invalid',
      });
    });

    it('should create validation error without extensions', () => {
      const error = new ValidationError('Invalid data');

      expect(error.detail).toBe('Invalid data');
      expect(error.extensions).toBeUndefined();
    });
  });

  describe('ManifestError', () => {
    it('should create invalid manifest error', () => {
      const error = new ManifestError(
        DomscribeErrorCode.DS_MANIFEST_INVALID,
        'Malformed JSON',
      );

      expect(error).toBeInstanceOf(ManifestError);
      expect(error.name).toBe('ManifestError');
      expect(error.code).toBe(DomscribeErrorCode.DS_MANIFEST_INVALID);
      expect(error.message).toBe('Invalid manifest');
      expect(error.detail).toBe('Malformed JSON');
      expect(error.status).toBe(400);
    });

    it('should create manifest not found error', () => {
      const error = new ManifestError(
        DomscribeErrorCode.DS_MANIFEST_NOTFOUND,
        'File does not exist',
      );

      expect(error.code).toBe(DomscribeErrorCode.DS_MANIFEST_NOTFOUND);
      expect(error.message).toBe('Manifest not found');
      expect(error.status).toBe(404);
    });

    it('should create manifest corrupted error', () => {
      const error = new ManifestError(
        DomscribeErrorCode.DS_MANIFEST_CORRUPTED,
        'Checksum mismatch',
      );

      expect(error.code).toBe(DomscribeErrorCode.DS_MANIFEST_CORRUPTED);
      expect(error.message).toBe('Manifest corrupted');
      expect(error.status).toBe(500);
    });
  });

  describe('AnnotationError', () => {
    it('should create invalid annotation error', () => {
      const error = new AnnotationError(
        DomscribeErrorCode.DS_ANNOTATION_INVALID,
        'Missing required fields',
      );

      expect(error).toBeInstanceOf(AnnotationError);
      expect(error.name).toBe('AnnotationError');
      expect(error.code).toBe(DomscribeErrorCode.DS_ANNOTATION_INVALID);
      expect(error.message).toBe('Invalid annotation');
      expect(error.detail).toBe('Missing required fields');
      expect(error.status).toBe(400);
    });

    it('should create annotation not found error', () => {
      const error = new AnnotationError(
        DomscribeErrorCode.DS_ANNOTATION_NOTFOUND,
        'ID does not exist',
      );

      expect(error.code).toBe(DomscribeErrorCode.DS_ANNOTATION_NOTFOUND);
      expect(error.message).toBe('Annotation not found');
      expect(error.status).toBe(404);
    });

    it('should create annotation processing error', () => {
      const error = new AnnotationError(
        DomscribeErrorCode.DS_ANNOTATION_PROCESSING,
        'Agent is currently processing',
      );

      expect(error.code).toBe(DomscribeErrorCode.DS_ANNOTATION_PROCESSING);
      expect(error.message).toBe('Annotation is being processed');
      expect(error.status).toBe(409);
    });
  });

  describe('ResolveStaleTargetError', () => {
    it('should create resolve stale target error', () => {
      const error = new ResolveStaleTargetError('Element removed');

      expect(error).toBeInstanceOf(ResolveStaleTargetError);
      expect(error.code).toBe(DomscribeErrorCode.DS_RESOLVE_STALE_TARGET);
      expect(error.message).toBe('Resolved element is stale');
      expect(error.detail).toBe('Element removed');
      expect(error.status).toBe(409);
    });
  });

  describe('DiffInvalidError', () => {
    it('should create diff invalid error', () => {
      const error = new DiffInvalidError('Malformed diff');

      expect(error).toBeInstanceOf(DiffInvalidError);
      expect(error.code).toBe(DomscribeErrorCode.DS_DIFF_INVALID);
      expect(error.message).toBe('Invalid diff payload');
      expect(error.detail).toBe('Malformed diff');
      expect(error.status).toBe(422);
    });
  });

  describe('WriteGuardBlockedError', () => {
    it('should create write guard blocked error', () => {
      const error = new WriteGuardBlockedError('Approval missing');

      expect(error).toBeInstanceOf(WriteGuardBlockedError);
      expect(error.code).toBe(DomscribeErrorCode.DS_WRITE_GUARD_BLOCKED);
      expect(error.message).toBe('Patch apply blocked');
      expect(error.detail).toBe('Approval missing');
      expect(error.status).toBe(403);
    });
  });

  describe('AgentUnavailableError', () => {
    it('should create agent unavailable error', () => {
      const error = new AgentUnavailableError('Agent disconnected');

      expect(error).toBeInstanceOf(AgentUnavailableError);
      expect(error.code).toBe(DomscribeErrorCode.DS_AGENT_UNAVAILABLE);
      expect(error.message).toBe('Agent unavailable');
      expect(error.detail).toBe('Agent disconnected');
      expect(error.status).toBe(503);
    });
  });

  describe('isDomscribeError', () => {
    it('should identify DomscribeError instances', () => {
      const domscribeError = new DomscribeError({
        code: DomscribeErrorCode.DS_INTERNAL_ERROR,
        title: 'Error',
      });
      const validationError = new ValidationError('Invalid');
      const manifestError = new ManifestError(
        DomscribeErrorCode.DS_MANIFEST_INVALID,
      );
      const standardError = new Error('Standard error');

      expect(isDomscribeError(domscribeError)).toBe(true);
      expect(isDomscribeError(validationError)).toBe(true);
      expect(isDomscribeError(manifestError)).toBe(true);
      expect(isDomscribeError(standardError)).toBe(false);
      expect(isDomscribeError(null)).toBe(false);
      expect(isDomscribeError(undefined)).toBe(false);
      expect(isDomscribeError('error')).toBe(false);
      expect(isDomscribeError({})).toBe(false);
    });
  });

  describe('createErrorFromProblemDetails', () => {
    it('should create ValidationError for validation code', () => {
      const error = createErrorFromProblemDetails({
        code: DomscribeErrorCode.DS_VALIDATION_FAILED,
        title: 'Validation failed',
        detail: 'Invalid field',
        extensions: { field: 'email' },
      });

      expect(error).toBeInstanceOf(ValidationError);
      expect(error.extensions).toEqual({ field: 'email' });
    });

    it('should create ManifestError for manifest codes', () => {
      const error = createErrorFromProblemDetails({
        code: DomscribeErrorCode.DS_MANIFEST_INVALID,
        title: 'Invalid manifest',
        detail: 'Parse error',
      });

      expect(error).toBeInstanceOf(ManifestError);
      expect(error.code).toBe(DomscribeErrorCode.DS_MANIFEST_INVALID);
    });

    it('should create AnnotationError for annotation codes', () => {
      const error = createErrorFromProblemDetails({
        code: DomscribeErrorCode.DS_ANNOTATION_NOTFOUND,
        title: 'Not found',
        detail: 'No such annotation',
      });

      expect(error).toBeInstanceOf(AnnotationError);
      expect(error.code).toBe(DomscribeErrorCode.DS_ANNOTATION_NOTFOUND);
    });

    it('should create ResolveStaleTargetError for resolve code', () => {
      const error = createErrorFromProblemDetails({
        code: DomscribeErrorCode.DS_RESOLVE_STALE_TARGET,
        title: 'Stale element',
      });

      expect(error).toBeInstanceOf(ResolveStaleTargetError);
      expect(error.code).toBe(DomscribeErrorCode.DS_RESOLVE_STALE_TARGET);
    });

    it('should create DiffInvalidError for diff code', () => {
      const error = createErrorFromProblemDetails({
        code: DomscribeErrorCode.DS_DIFF_INVALID,
        title: 'Diff invalid',
      });

      expect(error).toBeInstanceOf(DiffInvalidError);
      expect(error.code).toBe(DomscribeErrorCode.DS_DIFF_INVALID);
    });

    it('should create WriteGuardBlockedError for write guard code', () => {
      const error = createErrorFromProblemDetails({
        code: DomscribeErrorCode.DS_WRITE_GUARD_BLOCKED,
        title: 'Apply blocked',
      });

      expect(error).toBeInstanceOf(WriteGuardBlockedError);
      expect(error.code).toBe(DomscribeErrorCode.DS_WRITE_GUARD_BLOCKED);
    });

    it('should create AgentUnavailableError for agent unavailable code', () => {
      const error = createErrorFromProblemDetails({
        code: DomscribeErrorCode.DS_AGENT_UNAVAILABLE,
        title: 'Agent unavailable',
      });

      expect(error).toBeInstanceOf(AgentUnavailableError);
      expect(error.code).toBe(DomscribeErrorCode.DS_AGENT_UNAVAILABLE);
    });

    it('should create generic DomscribeError for unknown codes', () => {
      const error = createErrorFromProblemDetails({
        code: DomscribeErrorCode.DS_INTERNAL_ERROR,
        title: 'Internal error',
        detail: 'Unknown issue',
      });

      expect(error).toBeInstanceOf(DomscribeError);
      expect(error.code).toBe(DomscribeErrorCode.DS_INTERNAL_ERROR);
    });
  });
});
