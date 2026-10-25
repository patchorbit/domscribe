/**
 * Integration tests for POST /api/v1/verify/check
 *
 * Uses a real VerifyService and AnnotationService (in-memory storage);
 * baselines are created through the real baseline route. WSServer is
 * mocked since the test harness doesn't wire WebSocket.
 */
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import Fastify, { type FastifyInstance, type FastifyError } from 'fastify';
import cors from '@fastify/cors';
import {
  serializerCompiler,
  validatorCompiler,
} from 'fastify-type-provider-zod';
import {
  HTTP_STATUS,
  DomscribeErrorCode,
  InteractionModeEnum,
  InteractionTypeEnum,
} from '@domscribe/core';
import { VerifyBaselineRoute } from './verify-baseline.route.js';
import { VerifyCheckRoute } from './verify-check.route.js';
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
    getClientCount: vi.fn().mockReturnValue(1),
    requestContext: vi.fn().mockResolvedValue(null),
    requestTargets: vi.fn().mockResolvedValue(null),
    close: vi.fn(),
    ...overrides,
  };
}

function createWSResponse(
  computed: Record<string, string> | undefined,
  rectOverrides: Partial<{
    x: number;
    y: number;
    width: number;
    height: number;
    top: number;
    right: number;
    bottom: number;
    left: number;
  }> = {},
): WSContextResponse {
  return {
    requestId: 'req-1',
    success: true,
    rendered: true,
    context: computed ? { componentStyles: { computed } } : {},
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
        ...rectOverrides,
      },
    },
  };
}

const BASELINE_STYLES = { padding: '8px', color: 'rgb(0, 0, 0)' };

describe('POST /api/v1/verify/check', () => {
  let app: FastifyInstance;
  let mockWsServer: WSServer;
  let annotationService: AnnotationService;

  async function captureBaseline(): Promise<string> {
    vi.mocked(mockWsServer.requestContext).mockResolvedValueOnce(
      createWSResponse(BASELINE_STYLES),
    );
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/verify/baseline',
      payload: { entryId: 'aB3dEf7h' },
    });
    return response.json().baselineId;
  }

  beforeAll(async () => {
    mockWsServer = createMockWSServer();
    annotationService = new AnnotationService(new InMemoryAnnotationStorage());
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
    registerRoute(VerifyCheckRoute, { app, verifyService });

    await app.ready();
  });

  afterAll(() => {
    app.close();
  });

  it('should reject an unknown baselineId', async () => {
    // Act
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/verify/check',
      payload: { baselineId: 'vb_does-not-exist' },
    });

    // Assert
    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.verified).toBe(false);
    expect(body.error).toContain('Unknown baselineId');
  });

  it('should return no_change when the element did not change', async () => {
    // Arrange
    const baselineId = await captureBaseline();
    vi.mocked(mockWsServer.requestContext).mockResolvedValueOnce(
      createWSResponse(BASELINE_STYLES),
    );

    // Act
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/verify/check',
      payload: { baselineId },
    });

    // Assert
    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.verified).toBe(true);
    expect(body.result.verdict).toBe('no_change');
    expect(body.result.componentStylesDelta).toEqual([]);
  });

  it('should return match with deltas when expectations are met', async () => {
    // Arrange
    const baselineId = await captureBaseline();
    vi.mocked(mockWsServer.requestContext).mockResolvedValueOnce(
      createWSResponse(
        { padding: '12px', color: 'rgb(0, 0, 0)' },
        { width: 328, right: 428 },
      ),
    );

    // Act
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/verify/check',
      payload: {
        baselineId,
        expectedChanges: [{ property: 'padding', value: '12px' }],
      },
    });

    // Assert
    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.verified).toBe(true);
    expect(body.result.verdict).toBe('match');
    expect(body.result.componentStylesDelta).toEqual([
      { property: 'padding', before: '8px', after: '12px' },
    ]);
    expect(body.result.boundingRectDelta).toEqual([
      { field: 'width', before: 320, after: 328 },
      { field: 'right', before: 420, after: 428 },
    ]);
  });

  it('should return regression when an unexpected property changed instead', async () => {
    // Arrange
    const baselineId = await captureBaseline();
    vi.mocked(mockWsServer.requestContext).mockResolvedValueOnce(
      createWSResponse({ padding: '8px', color: 'rgb(255, 0, 0)' }),
    );

    // Act
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/verify/check',
      payload: {
        baselineId,
        expectedChanges: [{ property: 'padding', value: '12px' }],
      },
    });

    // Assert
    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.result.verdict).toBe('regression');
  });

  it('should fall back to geometry-only verification when styles are unavailable', async () => {
    // Arrange — baseline without styles
    vi.mocked(mockWsServer.requestContext).mockResolvedValueOnce(
      createWSResponse(undefined),
    );
    const baselineResponse = await app.inject({
      method: 'POST',
      url: '/api/v1/verify/baseline',
      payload: { entryId: 'aB3dEf7h' },
    });
    const baselineId = baselineResponse.json().baselineId;

    vi.mocked(mockWsServer.requestContext).mockResolvedValueOnce(
      createWSResponse(undefined, { height: 60, bottom: 260 }),
    );

    // Act — expectations are declared but cannot be evaluated
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/verify/check',
      payload: {
        baselineId,
        expectedChanges: [{ property: 'padding', value: '12px' }],
      },
    });

    // Assert
    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.verified).toBe(true);
    expect(body.result.verdict).toBe('match');
    expect(body.result.componentStylesDelta).toBeUndefined();
    expect(body.result.boundingRectDelta).toEqual([
      { field: 'height', before: 48, after: 60 },
      { field: 'bottom', before: 248, after: 260 },
    ]);
    expect(body.result.notes).toContain('geometry only');
  });

  it('should report verified:false when the browser disconnected before the check', async () => {
    // Arrange
    const baselineId = await captureBaseline();
    vi.mocked(mockWsServer.getClientCount).mockReturnValueOnce(0);

    // Act
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/verify/check',
      payload: { baselineId },
    });

    // Assert
    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.verified).toBe(false);
    expect(body.browserConnected).toBe(false);
  });

  it('should append the verify result to an annotation verifyHistory', async () => {
    // Arrange
    const annotation = await annotationService.create({
      mode: InteractionModeEnum.ELEMENT_CLICK,
      interaction: { type: InteractionTypeEnum.ELEMENT_ANNOTATION },
      context: {
        pageUrl: 'http://localhost:3000/',
        pageTitle: 'Fixture',
        viewport: { width: 1280, height: 720 },
        userAgent: 'vitest',
      },
    });
    const baselineId = await captureBaseline();
    vi.mocked(mockWsServer.requestContext).mockResolvedValueOnce(
      createWSResponse({ padding: '12px', color: 'rgb(0, 0, 0)' }),
    );

    // Act
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/verify/check',
      payload: {
        baselineId,
        expectedChanges: [{ property: 'padding' }],
        annotationId: annotation.metadata.id,
      },
    });

    // Assert
    expect(response.statusCode).toBe(200);
    expect(response.json().result.verdict).toBe('match');

    const updated = await annotationService.get(annotation.metadata.id);
    expect(updated?.context.verifyHistory).toHaveLength(1);
    expect(updated?.context.verifyHistory?.[0].verdict).toBe('match');
  });

  it('should return 400 when baselineId is missing', async () => {
    // Act
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/verify/check',
      payload: {},
    });

    // Assert
    expect(response.statusCode).toBe(400);
  });
});
