/**
 * Integration tests for POST /api/v1/verify/baseline
 *
 * Uses a real VerifyService and AnnotationService (in-memory storage).
 * WSServer is mocked since the test harness doesn't wire WebSocket.
 */
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import Fastify, { type FastifyInstance, type FastifyError } from 'fastify';
import cors from '@fastify/cors';
import {
  serializerCompiler,
  validatorCompiler,
} from 'fastify-type-provider-zod';
import { HTTP_STATUS, DomscribeErrorCode } from '@domscribe/core';
import { VerifyBaselineRoute } from './verify-baseline.route.js';
import { registerRoute } from '../route.interface.js';
import {
  AnnotationService,
  InMemoryAnnotationStorage,
  VerifyService,
} from '../../services/index.js';
import type { WSServer } from '../../ws-server.js';
import type { WSContextResponse } from '../../../schema.js';

function createMockWSServer(overrides?: Partial<WSServer>): WSServer {
  return {
    broadcast: vi.fn(),
    getClientCount: vi.fn().mockReturnValue(0),
    requestContext: vi.fn().mockResolvedValue(null),
    requestTargets: vi.fn().mockResolvedValue(null),
    close: vi.fn(),
    ...overrides,
  };
}

function createWSResponse(
  overrides: Partial<WSContextResponse> = {},
): WSContextResponse {
  return {
    requestId: 'req-1',
    success: true,
    rendered: true,
    context: {
      componentStyles: {
        computed: { padding: '8px', color: 'rgb(0, 0, 0)' },
      },
    },
    elementInfo: {
      tagName: 'button',
      boundingRect: {
        x: 100,
        y: 200,
        width: 320,
        height: 48,
        top: 200,
        right: 420,
        bottom: 248,
        left: 100,
      },
    },
    ...overrides,
  };
}

describe('POST /api/v1/verify/baseline', () => {
  let app: FastifyInstance;
  let mockWsServer: WSServer;

  beforeAll(async () => {
    mockWsServer = createMockWSServer();
    const annotationService = new AnnotationService(
      new InMemoryAnnotationStorage(),
    );
    await annotationService.initialize();
    const verifyService = new VerifyService(mockWsServer, annotationService);

    app = Fastify({ logger: false });
    app.setValidatorCompiler(validatorCompiler);
    app.setSerializerCompiler(serializerCompiler);
    await app.register(cors, { origin: true });

    app.setErrorHandler((error: FastifyError, _request, reply) => {
      const statusCode = error.statusCode ?? HTTP_STATUS.INTERNAL_SERVER_ERROR;
      reply.status(statusCode).send({
        error: error.message,
        code: DomscribeErrorCode.DS_INTERNAL_ERROR,
        statusCode,
      });
    });

    registerRoute(VerifyBaselineRoute, { app, verifyService });

    await app.ready();
  });

  afterAll(() => {
    app.close();
  });

  it('should report captured:false when no browser is connected', async () => {
    // Arrange
    vi.mocked(mockWsServer.getClientCount).mockReturnValue(0);

    // Act
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/verify/baseline',
      payload: { entryId: 'aB3dEf7h' },
    });

    // Assert
    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.captured).toBe(false);
    expect(body.browserConnected).toBe(false);
    expect(body.error).toContain('No browser is connected');
  });

  it('should capture a baseline with styles and geometry', async () => {
    // Arrange
    vi.mocked(mockWsServer.getClientCount).mockReturnValue(1);
    vi.mocked(mockWsServer.requestContext).mockResolvedValue(
      createWSResponse(),
    );

    // Act
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/verify/baseline',
      payload: { entryId: 'aB3dEf7h' },
    });

    // Assert
    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.captured).toBe(true);
    expect(body.baselineId).toMatch(/^vb_/);
    expect(body.entryId).toBe('aB3dEf7h');
    expect(body.browserConnected).toBe(true);
    expect(body.hasComponentStyles).toBe(true);
    expect(body.hasBoundingRect).toBe(true);
    expect(mockWsServer.requestContext).toHaveBeenCalledWith('aB3dEf7h');
  });

  it('should capture a geometry-only baseline when styles are unavailable', async () => {
    // Arrange
    vi.mocked(mockWsServer.getClientCount).mockReturnValue(1);
    vi.mocked(mockWsServer.requestContext).mockResolvedValue(
      createWSResponse({ context: {} }),
    );

    // Act
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/verify/baseline',
      payload: { entryId: 'aB3dEf7h' },
    });

    // Assert
    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.captured).toBe(true);
    expect(body.hasComponentStyles).toBe(false);
    expect(body.hasBoundingRect).toBe(true);
  });

  it('should report captured:false when the element is not rendered', async () => {
    // Arrange
    vi.mocked(mockWsServer.getClientCount).mockReturnValue(1);
    vi.mocked(mockWsServer.requestContext).mockResolvedValue(
      createWSResponse({ success: false, rendered: false, context: undefined }),
    );

    // Act
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/verify/baseline',
      payload: { entryId: 'aB3dEf7h' },
    });

    // Assert
    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.captured).toBe(false);
    expect(body.browserConnected).toBe(true);
    expect(body.error).toContain('not currently rendered');
  });

  it('should return 400 for an invalid entry ID', async () => {
    // Act
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/verify/baseline',
      payload: { entryId: 'not a valid id!' },
    });

    // Assert
    expect(response.statusCode).toBe(400);
  });
});
