import { describe, it, expect } from 'vitest';
import { DomscribeError } from '@domscribe/core';
import {
  VNodeAccessError,
  ComponentResolutionError,
  PropsExtractionError,
  StateExtractionError,
} from './index.js';

describe('Vue error classes', () => {
  describe('VNodeAccessError', () => {
    it('should extend DomscribeError', () => {
      const error = new VNodeAccessError('test message');

      expect(error).toBeInstanceOf(DomscribeError);
      expect(error).toBeInstanceOf(Error);
    });

    it('should set name to VNodeAccessError', () => {
      const error = new VNodeAccessError('test message');

      expect(error.name).toBe('VNodeAccessError');
    });

    it('should include message in title', () => {
      const error = new VNodeAccessError('element not found');

      expect(error.message).toContain('VNode access failed');
      expect(error.message).toContain('element not found');
    });

    it('should include cause detail when provided', () => {
      const cause = new Error('root cause');
      const error = new VNodeAccessError('failed', cause);

      expect(error.toProblemDetails().detail).toBe('root cause');
    });
  });

  describe('ComponentResolutionError', () => {
    it('should extend DomscribeError', () => {
      const error = new ComponentResolutionError('test message');

      expect(error).toBeInstanceOf(DomscribeError);
    });

    it('should set name to ComponentResolutionError', () => {
      const error = new ComponentResolutionError('test');

      expect(error.name).toBe('ComponentResolutionError');
    });
  });

  describe('PropsExtractionError', () => {
    it('should extend DomscribeError', () => {
      const error = new PropsExtractionError('test message');

      expect(error).toBeInstanceOf(DomscribeError);
    });

    it('should set name to PropsExtractionError', () => {
      const error = new PropsExtractionError('test');

      expect(error.name).toBe('PropsExtractionError');
    });
  });

  describe('StateExtractionError', () => {
    it('should extend DomscribeError', () => {
      const error = new StateExtractionError('test message');

      expect(error).toBeInstanceOf(DomscribeError);
    });

    it('should set name to StateExtractionError', () => {
      const error = new StateExtractionError('test');

      expect(error.name).toBe('StateExtractionError');
    });
  });
});
