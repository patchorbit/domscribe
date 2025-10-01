import { describe, it, expect } from 'vitest';
import { DomscribeError, DomscribeErrorCode } from '@domscribe/core';
import {
  FiberAccessError,
  ComponentResolutionError,
  NameResolutionError,
  PropsExtractionError,
  StateExtractionError,
} from './index.js';

describe('Error classes', () => {
  describe('FiberAccessError', () => {
    it('should extend DomscribeError', () => {
      const error = new FiberAccessError('test');

      expect(error).toBeInstanceOf(DomscribeError);
      expect(error).toBeInstanceOf(Error);
    });

    it('should set the correct name', () => {
      const error = new FiberAccessError('test');

      expect(error.name).toBe('FiberAccessError');
    });

    it('should include message in title', () => {
      const error = new FiberAccessError('element not found');

      expect(error.code).toBe(DomscribeErrorCode.DS_INTERNAL_ERROR);
      expect(error.message).toBe('Fiber access failed: element not found');
    });

    it('should include cause error detail', () => {
      const cause = new Error('underlying issue');

      const error = new FiberAccessError('something broke', cause);

      const problem = error.toProblemDetails();
      expect(problem.detail).toBe('underlying issue');
    });
  });

  describe('ComponentResolutionError', () => {
    it('should extend DomscribeError with correct name', () => {
      const error = new ComponentResolutionError('no component');

      expect(error).toBeInstanceOf(DomscribeError);
      expect(error.name).toBe('ComponentResolutionError');
      expect(error.message).toBe('Component resolution failed: no component');
    });
  });

  describe('NameResolutionError', () => {
    it('should extend DomscribeError with correct name', () => {
      const error = new NameResolutionError('unnamed');

      expect(error).toBeInstanceOf(DomscribeError);
      expect(error.name).toBe('NameResolutionError');
      expect(error.message).toBe('Component name resolution failed: unnamed');
    });
  });

  describe('PropsExtractionError', () => {
    it('should extend DomscribeError with correct name', () => {
      const error = new PropsExtractionError('bad props');

      expect(error).toBeInstanceOf(DomscribeError);
      expect(error.name).toBe('PropsExtractionError');
      expect(error.message).toBe('Props extraction failed: bad props');
    });
  });

  describe('StateExtractionError', () => {
    it('should extend DomscribeError with correct name', () => {
      const error = new StateExtractionError('no state');

      expect(error).toBeInstanceOf(DomscribeError);
      expect(error.name).toBe('StateExtractionError');
      expect(error.message).toBe('State extraction failed: no state');
    });
  });
});
