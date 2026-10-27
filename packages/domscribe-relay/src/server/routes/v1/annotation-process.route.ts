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
  AnnotationProcessResponse,
  AnnotationProcessResponseSchema,
} from '../../../schema.js';
import { AnnotationService } from '../../services/index.js';
import { RelayErrorResponse, RelayErrorResponseSchema } from '../../types.js';
import { ApiVersion, RelayRoute } from '../route.interface.js';

export class AnnotationProcessRoute implements RelayRoute {
  apiPath = API_PATHS.ANNOTATION_PROCESS;
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
    const route = new AnnotationProcessRoute(annotationService);
    const { apiPath, version, method, handler } = route;
    const url = path.posix.join(
      API_PATHS.BASE.replace(':version', version),
      apiPath,
    );

    app.withTypeProvider<ZodTypeProvider>().route<{
      Reply: AnnotationProcessResponse | RelayErrorResponse;
    }>({
      url,
      method,
      handler: handler.bind(route),
      schema: {
        response: {
          200: AnnotationProcessResponseSchema,
          400: RelayErrorResponseSchema,
          500: RelayErrorResponseSchema,
        },
      },
    });
  }

  async handler(
    _request: FastifyRequest,
    reply: FastifyReply<{
      Reply: AnnotationProcessResponse | RelayErrorResponse;
    }>,
  ): Promise<AnnotationProcessResponse> {
    try {
      const annotation = await this.annotationService.claimNext();

      if (!annotation) {
        return reply.status(HTTP_STATUS.NOT_FOUND).send({
          error: 'No annotation found',
          code: DomscribeErrorCode.DS_ANNOTATION_NOTFOUND,
        });
      }

      // Build flattened, agent-friendly response
      const selectedElement = annotation.interaction.selectedElement;
      const manifestEntry = annotation.context.manifestSnapshot?.[0];
      const runtimeCtx = annotation.context.runtimeContext;

      return reply.status(HTTP_STATUS.OK).send({
        found: true,
        annotationId: annotation.metadata.id,
        userIntent: annotation.context.userMessage,
        element: selectedElement
          ? {
              tagName: selectedElement.tagName,
              dataDs: selectedElement.dataDs,
              selector: selectedElement.selector,
              attributes: selectedElement.attributes,
              innerText: selectedElement.innerText,
            }
          : undefined,
        sourceLocation: manifestEntry
          ? {
              file: manifestEntry.file,
              line: manifestEntry.start.line,
              column: manifestEntry.start.column,
              componentName: manifestEntry.componentName,
              tagName: manifestEntry.tagName,
            }
          : undefined,
        runtimeContext: runtimeCtx
          ? {
              componentIdentity: runtimeCtx.componentIdentity,
              componentProps: runtimeCtx.componentProps,
              componentState: runtimeCtx.componentState,
            }
          : undefined,
        fullAnnotation: annotation,
      });
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
