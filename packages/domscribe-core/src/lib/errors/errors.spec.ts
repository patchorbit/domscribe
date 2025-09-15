/**
 * Unit tests for error types and utilities
 * @module @domscribe/core/errors.spec
 */

import { describe, it, expect } from 'vitest';
import {
  DomscribeError,
  DomscribeErrorCode,
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
});
