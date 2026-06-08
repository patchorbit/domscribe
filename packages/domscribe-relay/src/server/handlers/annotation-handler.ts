/**
 * Annotation HTTP handlers for Domscribe Relay
 */
import type { FastifyInstance } from 'fastify';
import type { ManifestReader } from '@domscribe/manifest';
import type { AnnotationService } from '../services/index.js';
import {
  AnnotationCreateRoute,
  AnnotationListRoute,
  AnnotationGetRoute,
  AnnotationDeleteRoute,
  AnnotationPatchRoute,
  AnnotationSearchRoute,
  AnnotationUpdateResponseRoute,
  AnnotationUpdateStatusRoute,
  AnnotationProcessRoute,
  AnnotationVerifyRoute,
} from '../routes/index.js';
import { registerRoute } from '../routes/route.interface.js';

/**
 * Register annotation routes on a Fastify instance
 */
export function registerAnnotationHandlers(
  app: FastifyInstance,
  annotationService: AnnotationService,
  manifestReader: ManifestReader,
): void {
  /**
   * POST /api/v1/annotations
   * Create a new annotation
   */
  registerRoute(AnnotationCreateRoute, {
    app,
    annotationService,
    manifestReader,
  });

  /**
   * GET /api/v1/annotations
   * List annotations with optional filters
   */
  registerRoute(AnnotationListRoute, {
    app,
    annotationService,
  });

  /**
   * GET /api/v1/annotations/:id
   * Get a single annotation
   */
  registerRoute(AnnotationGetRoute, {
    app,
    annotationService,
  });

  /**
   * PUT /api/v1/annotations/:id/status
   * Update annotation status
   */
  registerRoute(AnnotationUpdateStatusRoute, {
    app,
    annotationService,
  });

  /**
   * PUT /api/v1/annotations/:id/response
   * Store agent response on an annotation
   */
  registerRoute(AnnotationUpdateResponseRoute, {
    app,
    annotationService,
  });

  /**
   * PATCH /api/v1/annotations/:id
   * Partially update annotation context
   */
  registerRoute(AnnotationPatchRoute, {
    app,
    annotationService,
  });

  /**
   * DELETE /api/v1/annotations/:id
   * Archive an annotation
   */

  registerRoute(AnnotationDeleteRoute, {
    app,
    annotationService,
  });

  /**
   * GET /api/v1/annotations/search
   * Search annotations by various criteria
   */
  registerRoute(AnnotationSearchRoute, {
    app,
    annotationService,
  });

  /**
   * POST /api/v1/annotations/process
   * Atomically fetch and claim the next queued annotation
   */
  registerRoute(AnnotationProcessRoute, {
    app,
    annotationService,
  });

  /**
   * POST /api/v1/annotations/:id/verify
   * Grade a post-edit capture against the pre-edit baseline (RFC 0002)
   */
  registerRoute(AnnotationVerifyRoute, {
    app,
    annotationService,
  });
}
