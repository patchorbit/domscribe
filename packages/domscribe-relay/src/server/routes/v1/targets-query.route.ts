import { TargetQuerySchema, type TargetQuery } from '@domscribe/core';
import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { TargetsQueryResponseSchema } from '../../../schema.js';
import type { WSServer } from '../../ws-server.js';

export class TargetsQueryRoute {
  static register({
    app,
    wsServer,
  }: {
    app: FastifyInstance;
    wsServer: WSServer;
  }): void {
    app.withTypeProvider<ZodTypeProvider>().post(
      '/api/v1/targets/query',
      {
        schema: {
          body: TargetQuerySchema,
          response: { 200: TargetsQueryResponseSchema },
        },
      },
      async (request) => {
        const browserConnected = wsServer.getClientCount() > 0;
        const result = await wsServer.requestTargets(
          request.body as TargetQuery,
        );
        return {
          ...(result ?? {
            status: 'unavailable' as const,
            targets: [],
            total: 0,
          }),
          browserConnected,
        };
      },
    );
  }
}
