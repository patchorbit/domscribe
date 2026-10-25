/**
 * @domscribe/relay/client - Browser-safe client exports
 *
 * These modules have no Node.js dependencies and can be safely
 * imported in browser environments (e.g., the overlay).
 *
 * @module @domscribe/relay/client
 */
export { RelayHttpClient } from './relay-http-client.js';
export { RelayWSClient } from './relay-ws-client.js';
export { WSTargetRequestSchema, WSContextRequestSchema } from '../schema.js';

export type { AnnotationListResponse } from '../schema.js';
