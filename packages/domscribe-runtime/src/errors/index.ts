/**
 * Runtime-specific error classes
 * @module @domscribe/runtime/errors
 */

import { DomscribeError, DomscribeErrorCode } from '@domscribe/core';

/**
 * Base error for runtime-related issues
 */
export class RuntimeError extends DomscribeError {
  constructor(message: string, _cause?: Error) {
    super({
      code: DomscribeErrorCode.DS_INTERNAL_ERROR,
      title: message,
      detail: _cause?.message,
      status: 500,
    });
    this.name = 'RuntimeError';
  }
}

/**
 * Error thrown when runtime manager is not initialized
 */
export class RuntimeNotInitializedError extends DomscribeError {
  constructor() {
    super({
      code: DomscribeErrorCode.DS_INTERNAL_ERROR,
      title: 'RuntimeManager not initialized',
      detail: 'Call initialize() before using RuntimeManager methods.',
      status: 500,
    });
    this.name = 'RuntimeNotInitializedError';
  }
}

/**
 * Error thrown when context capture fails
 */
export class ContextCaptureError extends DomscribeError {
  constructor(message: string, cause?: Error) {
    super({
      code: DomscribeErrorCode.DS_INTERNAL_ERROR,
      title: `Context capture failed: ${message}`,
      detail: cause?.message,
      status: 500,
    });
    this.name = 'ContextCaptureError';
  }
}

/**
 * Error thrown when element tracking fails
 */
export class ElementTrackingError extends DomscribeError {
  constructor(message: string, cause?: Error) {
    super({
      code: DomscribeErrorCode.DS_INTERNAL_ERROR,
      title: `Element tracking failed: ${message}`,
      detail: cause?.message,
      status: 500,
    });
    this.name = 'ElementTrackingError';
  }
}

/**
 * Error thrown when serialization fails
 */
export class SerializationError extends DomscribeError {
  constructor(message: string, cause?: Error) {
    super({
      code: DomscribeErrorCode.DS_INTERNAL_ERROR,
      title: `Serialization failed: ${message}`,
      detail: cause?.message,
      status: 500,
    });
    this.name = 'SerializationError';
  }
}
