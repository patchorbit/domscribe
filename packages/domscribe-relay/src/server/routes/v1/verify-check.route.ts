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
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import path from 'path';
import {
  VerifyCheckRequest,
  VerifyCheckRequestSchema,
  VerifyCheckResponse,
  VerifyCheckResponseSchema,
} from '../../../schema.js';
import { RelayErrorResponse, RelayErrorResponseSchema } from '../../types.js';
import { ApiVersion, RelayRoute } from '../route.interface.js';
import type { VerifyService } from '../../services/verify-service.js';

export class VerifyCheckRoute implements RelayRoute {
  apiPath = API_PATHS.VERIFY_CHECK;
  method: HTTPMethods = 'POST';
  version: ApiVersion = 'v1';

  constructor(private readonly verifyService: VerifyService) {}

  static register({
    app,
    verifyService,
  }: {
    app: FastifyInstance;
    verifyService: VerifyService;
  }): void {
    const route = new VerifyCheckRoute(verifyService);
    const { apiPath, version, method, handler } = route;
    const url = path.posix.join(
      API_PATHS.BASE.replace(':version', version),
      apiPath,
    );

    app.withTypeProvider<ZodTypeProvider>().route<{
      Body: VerifyCheckRequest;
      Reply: VerifyCheckResponse | RelayErrorResponse;
    }>({
      url,
      method,
      handler: handler.bind(route),
      schema: {
        body: VerifyCheckRequestSchema,
        response: {
          200: VerifyCheckResponseSchema,
          500: RelayErrorResponseSchema,
        },
      },
    });
  }

  async handler(
    request: FastifyRequest<{ Body: VerifyCheckRequest }>,
    reply: FastifyReply<{
      Reply: VerifyCheckResponse | RelayErrorResponse;
    }>,
  ) {
    try {
      const { baselineId, expectedChanges, annotationId } = request.body;
      const result = await this.verifyService.check({
        baselineId,
        expectedChanges,
        annotationId,
      });
      return reply.status(HTTP_STATUS.OK).send(result);
    } catch (error: unknown) {
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
