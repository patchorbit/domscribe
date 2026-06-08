/**
 * Route barrel exports
 * @module @domscribe/relay/server/routes
 */

/** Annotation routes */
export { AnnotationCreateRoute } from './v1/annotation-create.route.js';
export { AnnotationGetRoute } from './v1/annotation-get.route.js';
export { AnnotationListRoute } from './v1/annotation-list.route.js';
export { AnnotationProcessRoute } from './v1/annotation-process.route.js';
export { AnnotationSearchRoute } from './v1/annotation-search.route.js';
export { AnnotationUpdateResponseRoute } from './v1/annotation-update-response.route.js';
export { AnnotationUpdateStatusRoute } from './v1/annotation-update-status.route.js';
export { AnnotationVerifyRoute } from './v1/annotation-verify.route.js';
export { AnnotationDeleteRoute } from './v1/annotation-delete.route.js';
export { AnnotationPatchRoute } from './v1/annotation-patch.route.js';

/** Manifest routes */
export { ManifestBatchResolveRoute } from './v1/manifest-batch-resolve.route.js';
export { ManifestResolveRoute } from './v1/manifest-resolve.route.js';
export { ManifestStatsRoute } from './v1/manifest-stats.route.js';
export { ManifestQueryRoute } from './v1/manifest-query.route.js';
export { QueryBySourceRoute } from './v1/query-by-source.route.js';
