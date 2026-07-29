/**
 * Services for Domscribe Relay
 * @module @domscribe/relay/server/services
 */
export { AnnotationService } from './annotation-service.js';
export type {
  CreateAnnotationInput,
  ListAnnotationsOptions,
  ListAnnotationsResult,
  UpdateStatusOptions,
  SearchAnnotationsOptions,
  SearchAnnotationsResult,
} from './annotation-service.js';
export { VerifyService } from './verify-service.js';
export type { AnnotationStorageProvider } from './storage/index.js';
export {
  FileAnnotationStorage,
  InMemoryAnnotationStorage,
} from './storage/index.js';
