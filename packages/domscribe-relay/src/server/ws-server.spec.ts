/**
 * Integration tests for WebSocket server
 *
 * Uses a real Fastify server on an ephemeral port with real services.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { mkdtempSync, mkdirSync, rmSync } from 'fs';
import path from 'path';
import { tmpdir } from 'os';
import Fastify, { type FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import {
  serializerCompiler,
  validatorCompiler,
} from 'fastify-type-provider-zod';
import WebSocket from 'ws';
import {
  HTTP_STATUS,
  DomscribeErrorCode,
  PATHS,
  WS_EVENTS,
  AnnotationStatusEnum,
  InteractionModeEnum,
  InteractionTypeEnum,
} from '@domscribe/core';
import { ManifestReader } from '@domscribe/manifest';
import { AnnotationService } from './services/annotation-service.js';
import { FileAnnotationStorage } from './services/storage/index.js';
import {
  registerHealthHandler,
  registerStatusHandler,
  registerManifestHandlers,
  registerAnnotationHandlers,
} from './handlers/index.js';
import { createWSServer, type WSServer } from './ws-server.js';
import type { FastifyError } from 'fastify';
import type { WSMessage } from '../schema.js';

interface WSTestServer {
  app: FastifyInstance;
  ws: WSServer;
  baseUrl: string;
  manifestReader: ManifestReader;
  annotationService: AnnotationService;
  tempDir: string;
}

/**
 * Create a real HTTP+WS server on an ephemeral port for WebSocket testing.
 */
async function createTestWSServer(): Promise<WSTestServer> {
  const tempDir = mkdtempSync(path.join(tmpdir(), 'relay-ws-test-'));
  mkdirSync(path.join(tempDir, PATHS.DOMSCRIBE_DIR), { recursive: true });

  const manifestReader = new ManifestReader(tempDir);
  const annotationStorage = new FileAnnotationStorage(
    path.join(tempDir, PATHS.ANNOTATIONS_DIR),
  );
  const annotationService = new AnnotationService(annotationStorage);
  await annotationService.initialize();
  manifestReader.initialize();

  const app = Fastify({ logger: false });
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  await app.register(cors, {
    origin: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  });

  registerHealthHandler(app, manifestReader, annotationService);
  registerStatusHandler(app, manifestReader, annotationService, {
    port: 0,
    startTime: Date.now(),
  });
  registerManifestHandlers(app, manifestReader);
  registerAnnotationHandlers(app, annotationService, manifestReader);

  const ws = await createWSServer({
    app,
    annotationService,
    manifestReader,
  });

  app.setErrorHandler((error: FastifyError, _request, reply) => {
    const statusCode = error.statusCode ?? HTTP_STATUS.INTERNAL_SERVER_ERROR;
    reply.status(statusCode).send({
      error: error.message,
      code: DomscribeErrorCode.DS_INTERNAL_ERROR,
      statusCode,
    });
  });

  // Listen on port 0 for ephemeral port assignment
  const address = await app.listen({ port: 0, host: '127.0.0.1' });
  const url = new URL(address);
  const baseUrl = `ws://127.0.0.1:${url.port}`;

  return { app, ws, baseUrl, manifestReader, annotationService, tempDir };
}

function cleanupWSServer(server: WSTestServer): void {
  server.ws.close();
  server.manifestReader.close();
  server.app.close();
  rmSync(server.tempDir, { recursive: true, force: true });
}

/**
 * Collect N messages from a WebSocket client.
 */
function collectMessages(
  socket: WebSocket,
  count: number,
  timeoutMs = 5000,
): Promise<WSMessage[]> {
  return new Promise((resolve, reject) => {
    const messages: WSMessage[] = [];
    const timer = setTimeout(() => {
      socket.removeAllListeners('message');
      reject(
        new Error(
          `Timed out waiting for ${count} messages, got ${messages.length}`,
        ),
      );
    }, timeoutMs);

    socket.on('message', (data: WebSocket.Data) => {
      const msg = JSON.parse(data.toString()) as WSMessage;
      messages.push(msg);
      if (messages.length >= count) {
        clearTimeout(timer);
        socket.removeAllListeners('message');
        resolve(messages);
      }
    });
  });
}

/**
 * Connect a WebSocket client and wait for the CONNECT event.
 */
function connectClient(baseUrl: string): Promise<WebSocket> {
  return new Promise((resolve, reject) => {
    const socket = new WebSocket(`${baseUrl}/ws`);
    const timer = setTimeout(() => {
      reject(new Error('Connection timeout'));
    }, 5000);

    socket.on('message', (data: WebSocket.Data) => {
      const msg = JSON.parse(data.toString()) as WSMessage;
      if (msg.event === WS_EVENTS.CONNECT) {
        clearTimeout(timer);
        resolve(socket);
      }
    });

    socket.on('error', (err) => {
      clearTimeout(timer);
      reject(err);
    });
  });
}

describe('WebSocket Server', () => {
  let server: WSTestServer;

  beforeAll(async () => {
    server = await createTestWSServer();
  });

  afterAll(() => {
    cleanupWSServer(server);
  });

  it('should send CONNECT event on connection', async () => {
    const socket = new WebSocket(`${server.baseUrl}/ws`);
    const messages = await collectMessages(socket, 1);

    expect(messages[0].event).toBe(WS_EVENTS.CONNECT);
    expect(messages[0].data).toHaveProperty('timestamp');
    expect(messages[0].data).toHaveProperty('clientCount');

    socket.close();
  });

  it('should track client count', async () => {
    const client1 = await connectClient(server.baseUrl);
    const client2 = await connectClient(server.baseUrl);

    expect(server.ws.getClientCount()).toBe(2);

    client1.close();

    // Wait for disconnect to propagate
    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(server.ws.getClientCount()).toBe(1);

    client2.close();

    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(server.ws.getClientCount()).toBe(0);
  });

  it('should broadcast annotation created event', async () => {
    const client = await connectClient(server.baseUrl);

    // Set up listener for the next message
    const messagePromise = collectMessages(client, 1);

    // Create annotation via the service
    await server.annotationService.create({
      mode: InteractionModeEnum.ELEMENT_CLICK,
      interaction: {
        type: InteractionTypeEnum.ELEMENT_ANNOTATION,
        selectedElement: {
          tagName: 'div',
          selector: 'body > div',
        },
      },
      context: {
        pageUrl: 'http://localhost:3000',
        pageTitle: 'Test',
        viewport: { width: 1920, height: 1080 },
        userAgent: 'Test/1.0',
      },
    });

    const messages = await messagePromise;
    expect(messages[0].event).toBe(WS_EVENTS.ANNOTATION_CREATED);
    expect(messages[0].data).toHaveProperty('id');
    expect(messages[0].data).toHaveProperty('status');

    client.close();
  });

  it('should broadcast annotation updated event on status change', async () => {
    // Create an annotation first
    const annotation = await server.annotationService.create({
      mode: InteractionModeEnum.ELEMENT_CLICK,
      interaction: {
        type: InteractionTypeEnum.ELEMENT_ANNOTATION,
        selectedElement: {
          tagName: 'span',
          selector: 'body > span',
        },
      },
      context: {
        pageUrl: 'http://localhost:3000',
        pageTitle: 'Test',
        viewport: { width: 1920, height: 1080 },
        userAgent: 'Test/1.0',
      },
    });

    const client = await connectClient(server.baseUrl);
    const messagePromise = collectMessages(client, 1);

    // Update status
    await server.annotationService.updateStatus(
      annotation.metadata.id,
      AnnotationStatusEnum.PROCESSING,
    );

    const messages = await messagePromise;
    expect(messages[0].event).toBe(WS_EVENTS.ANNOTATION_UPDATED);

    client.close();
  });

  it('should close all clients on ws.close()', async () => {
    // Create a fresh server for this test to not interfere
    const freshServer = await createTestWSServer();

    const client1 = await connectClient(freshServer.baseUrl);
    const client2 = await connectClient(freshServer.baseUrl);

    const closePromise1 = new Promise<void>((resolve) => {
      client1.on('close', () => resolve());
    });
    const closePromise2 = new Promise<void>((resolve) => {
      client2.on('close', () => resolve());
    });

    freshServer.ws.close();

    await Promise.all([closePromise1, closePromise2]);

    expect(client1.readyState).toBe(WebSocket.CLOSED);
    expect(client2.readyState).toBe(WebSocket.CLOSED);

    // Clean up the rest
    freshServer.manifestReader.close();
    await freshServer.app.close();
    rmSync(freshServer.tempDir, { recursive: true, force: true });
  });
});

describe('strict browser target requests', () => {
  let server: WSTestServer;
  const sockets: WebSocket[] = [];
  beforeAll(async () => {
    server = await createTestWSServer();
  });
  afterAll(() => {
    for (const socket of sockets) socket.close();
    cleanupWSServer(server);
  });
  it('round-trips target ambiguity and binds the response to its browser request', async () => {
    const socket = await connectClient(server.baseUrl);
    sockets.push(socket);
    socket.on('message', (raw) => {
      const message = JSON.parse(raw.toString());
      if (message.event === 'target:request')
        socket.send(
          JSON.stringify({
            event: 'target:response',
            data: {
              requestId: message.data.requestId,
              result: { status: 'ambiguous', targets: [], total: 2 },
            },
          }),
        );
    });
    const result = await server.ws.requestTargets({ entryId: 'aB3dEf7h' });
    expect(result).toMatchObject({ status: 'ambiguous', total: 2 });
    await new Promise<void>((resolve) => {
      socket.once('close', () => resolve());
      socket.close();
    });
  });
  it('refuses to choose among connected browser sessions', async () => {
    const one = await connectClient(server.baseUrl),
      two = await connectClient(server.baseUrl);
    sockets.push(one, two);
    expect(await server.ws.requestTargets({ mode: 'list' })).toMatchObject({
      status: 'ambiguous_browser',
      targets: [],
    });
    expect(await server.ws.requestContext('aB3dEf7h')).toMatchObject({
      success: false,
      selectionStatus: 'ambiguous_browser',
    });
    await Promise.all(
      [one, two].map(
        (socket) =>
          new Promise<void>((resolve) => {
            socket.once('close', () => resolve());
            socket.close();
          }),
      ),
    );
  });
});
