import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import Fastify from 'fastify';
import {
  serializerCompiler,
  validatorCompiler,
} from 'fastify-type-provider-zod';
import { TargetQuerySchema, type ElementTarget } from '@domscribe/core';
import { TargetsQueryRoute } from './targets-query.route.js';
import { TargetsQueryTool } from '../../../mcp/tools/targets-query.tool.js';
import { RelayHttpClient } from '../../../client/relay-http-client.js';
import type { WSServer } from '../../ws-server.js';

const target: ElementTarget = {
  instanceId: 'ds_test_1',
  entryId: 'aB3dEf7h',
  selector: '[data-ds-instance="ds_test_1"]',
  locator: {
    version: 1,
    pathname: '/',
    element: { tagName: 'button', attributes: {}, text: 'Edit' },
    ancestors: [{ tagName: 'article', attributes: { 'aria-label': 'Lyra' } }],
  },
  disabled: false,
};
describe('agent target query boundary', () => {
  const app = Fastify();
  let port: number;
  const ws: WSServer = {
    broadcast() {
      /* no broadcasts in this HTTP boundary fixture */
    },
    getClientCount: () => 1,
    close() {
      /* no sockets owned by this boundary fixture */
    },
    requestContext: async () => null,
    requestTargets: async (query) =>
      query.instanceId === 'ds_test_1'
        ? {
            status: 'resolved',
            targets: [target],
            total: 1,
            context: {
              componentProps: { customer: { id: 'c2', name: 'Lyra' } },
            },
          }
        : {
            status: 'ambiguous',
            targets: [target, { ...target, instanceId: 'ds_test_2' }],
            total: 2,
          },
  };
  beforeAll(async () => {
    app.setValidatorCompiler(validatorCompiler);
    app.setSerializerCompiler(serializerCompiler);
    TargetsQueryRoute.register({ app, wsServer: ws });
    const address = await app.listen({ host: '127.0.0.1', port: 0 });
    port = Number(new URL(address).port);
  });
  afterAll(async () => {
    await app.close();
  });
  it('serializes exact instance context through HTTP and MCP', async () => {
    const tool = new TargetsQueryTool(new RelayHttpClient('127.0.0.1', port));
    const result = await tool.toolCallback(
      TargetQuerySchema.parse({ instanceId: 'ds_test_1' }),
    );
    expect(result.isError).not.toBe(true);
    expect(result.structuredContent).toMatchObject({
      status: 'resolved',
      browserConnected: true,
      targets: [{ instanceId: 'ds_test_1' }],
      context: { componentProps: { customer: { name: 'Lyra' } } },
    });
  });
  it('preserves ambiguity and validates contradictory selection before dispatch', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/targets/query',
      payload: { entryId: 'aB3dEf7h' },
    });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({ status: 'ambiguous', total: 2 });
    const invalid = await app.inject({
      method: 'POST',
      url: '/api/v1/targets/query',
      payload: { instanceId: 'ds_test_1', locator: target.locator },
    });
    expect(invalid.statusCode).toBe(400);
  });
});
