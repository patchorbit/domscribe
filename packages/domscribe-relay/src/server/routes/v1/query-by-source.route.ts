import {
  API_PATHS,
  DomscribeError,
  DomscribeErrorCode,
  HTTP_STATUS,
} from '@domscribe/core';
import { ManifestReader } from '@domscribe/manifest';
import {
  FastifyInstance,
  FastifyReply,
  FastifyRequest,
  HTTPMethods,
} from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import path from 'path';
import {
  QueryBySourceRequest,
  QueryBySourceRequestSchema,
  QueryBySourceResponse,
  QueryBySourceResponseSchema,
} from '../../../schema.js';
import { RelayErrorResponse, RelayErrorResponseSchema } from '../../types.js';
import { ApiVersion, RelayRoute } from '../route.interface.js';
import type { WSServer } from '../../ws-server.js';

export class QueryBySourceRoute implements RelayRoute {
  apiPath = API_PATHS.MANIFEST_RESOLVE_BY_SOURCE;
  method: HTTPMethods = 'POST';
  version: ApiVersion = 'v1';

  constructor(
    private readonly manifestReader: ManifestReader,
    private readonly wsServer: WSServer,
  ) {}

  static register({
    app,
    manifestReader,
    wsServer,
  }: {
    app: FastifyInstance;
    manifestReader: ManifestReader;
    wsServer: WSServer;
  }): void {
    const route = new QueryBySourceRoute(manifestReader, wsServer);
    const { apiPath, version, method, handler } = route;
    const url = path.posix.join(
      API_PATHS.BASE.replace(':version', version),
      apiPath,
    );

    app.withTypeProvider<ZodTypeProvider>().route<{
      Body: QueryBySourceRequest;
      Reply: QueryBySourceResponse | RelayErrorResponse;
    }>({
      url,
      method,
      handler: handler.bind(route),
      schema: {
        body: QueryBySourceRequestSchema,
        response: {
          200: QueryBySourceResponseSchema,
          500: RelayErrorResponseSchema,
        },
      },
    });
  }

  async handler(
    request: FastifyRequest<{ Body: QueryBySourceRequest }>,
    reply: FastifyReply<{
      Reply: QueryBySourceResponse | RelayErrorResponse;
    }>,
  ) {
    try {
      const { file, line, column, tolerance, includeRuntime } = request.body;

      // Position-based manifest lookup
      const entry = this.manifestReader.getEntryByPosition(
        file,
        line,
        column,
        tolerance,
      );

      if (!entry) {
        return reply.status(HTTP_STATUS.OK).send({ found: false });
      }

      const response: QueryBySourceResponse = {
        found: true,
        entryId: entry.id,
        sourceLocation: {
          file: entry.file,
          start: entry.start,
          end: entry.end,
          tagName: entry.tagName,
          componentName: entry.componentName,
        },
      };

      // Optional runtime query via WS
      if (includeRuntime) {
        response.browserConnected = this.wsServer.getClientCount() > 0;
        if (response.browserConnected) {
          const wsResult = await this.wsServer.requestContext(entry.id);
          if (wsResult) {
            response.runtime = {
              rendered: wsResult.rendered ?? false,
              componentProps: wsResult.context?.componentProps,
              componentState: wsResult.context?.componentState,
              componentStyles: wsResult.context?.componentStyles,
              domSnapshot: wsResult.elementInfo,
            };
          }
        }
      }

      return reply.status(HTTP_STATUS.OK).send(response);
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
