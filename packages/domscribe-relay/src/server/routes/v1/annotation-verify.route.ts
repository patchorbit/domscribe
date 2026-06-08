/**
 * Route: POST /api/v1/annotations/:id/verify
 *
 * Backs the `domscribe.verify.afterEdit` MCP tool (RFC 0002). Caller
 * supplies a post-edit capture (componentStyles + boundingRect + an opaque
 * screenshotRef); the relay grades it against the annotation's pre-edit
 * baseline via `@domscribe/verify` and stores the result on the
 * annotation's optional `verifyHistory`.
 *
 * Soft-recommended — does NOT affect the annotation lifecycle.
 *
 * @module @domscribe/relay/server/routes/v1/annotation-verify.route
 */
import {
  API_PATHS,
  DomscribeError,
  DomscribeErrorCode,
  HTTP_STATUS,
} from '@domscribe/core';
import {
  FastifyInstance,
  FastifyReply,
  FastifyRequest,
  HTTPMethods,
} from 'fastify';
import { AnnotationService } from '../../services/index.js';
import { RelayErrorResponse, RelayErrorResponseSchema } from '../../types.js';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import path from 'path';
import { ApiVersion, RelayRoute } from '../route.interface.js';
import {
  AnnotationVerifyRequestBody,
  AnnotationVerifyRequestBodySchema,
  AnnotationVerifyRequestParams,
  AnnotationVerifyRequestParamsSchema,
  AnnotationVerifyResponse,
  AnnotationVerifyResponseSchema,
} from '../../../schema.js';

export class AnnotationVerifyRoute implements RelayRoute {
  apiPath = API_PATHS.ANNOTATION_VERIFY;
  method: HTTPMethods = 'POST';
  version: ApiVersion = 'v1';

  constructor(private readonly annotationService: AnnotationService) {}

  static register({
    app,
    annotationService,
  }: {
    app: FastifyInstance;
    annotationService: AnnotationService;
  }): void {
    const route = new AnnotationVerifyRoute(annotationService);
    const { apiPath, version, method, handler } = route;
    const url = path.posix.join(
      API_PATHS.BASE.replace(':version', version),
      apiPath,
    );

    app.withTypeProvider<ZodTypeProvider>().route<{
      Params: AnnotationVerifyRequestParams;
      Body: AnnotationVerifyRequestBody;
      Reply: AnnotationVerifyResponse | RelayErrorResponse;
    }>({
      url,
      method,
      handler: handler.bind(route),
      schema: {
        params: AnnotationVerifyRequestParamsSchema,
        body: AnnotationVerifyRequestBodySchema,
        response: {
          200: AnnotationVerifyResponseSchema,
          400: RelayErrorResponseSchema,
          404: RelayErrorResponseSchema,
          500: RelayErrorResponseSchema,
        },
      },
    });
  }

  async handler(
    request: FastifyRequest<{
      Params: AnnotationVerifyRequestParams;
      Body: AnnotationVerifyRequestBody;
    }>,
    reply: FastifyReply<{
      Reply: AnnotationVerifyResponse | RelayErrorResponse;
    }>,
  ) {
    try {
      const { id } = request.params;
      const { postEdit } = request.body;

      const result = await this.annotationService.verifyAfterEdit(id, postEdit);

      return { success: true, result, annotationId: id };
    } catch (error: unknown) {
      if (error instanceof Error && /not found/i.test(error.message)) {
        return reply.status(HTTP_STATUS.NOT_FOUND).send({
          error: error.message,
          code: DomscribeErrorCode.DS_ANNOTATION_NOTFOUND,
        });
      }
      if (error instanceof DomscribeError) {
        return reply.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).send({
          ...error.toProblemDetails(),
          error: error.message,
        });
      }
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      return reply.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).send({
        error: errorMessage,
        code: DomscribeErrorCode.DS_INTERNAL_ERROR,
      });
    }
  }
}
