/**
 * HTTP Server for Domscribe Relay
 *
 * Provides HTTP APIs for manifest resolution and annotation management.
 *
 * @module @domscribe/relay/server/http-server
 */
import Fastify, { type FastifyInstance, type FastifyError } from 'fastify';
import cors from '@fastify/cors';
import {
  HTTP_STATUS,
  DEFAULT_CONFIG,
  DomscribeErrorCode,
  PATHS,
} from '@domscribe/core';
import path from 'path';
import { ManifestReader } from '@domscribe/manifest';
import { AnnotationService, FileAnnotationStorage } from './services/index.js';
import {
  registerManifestHandlers,
  registerAnnotationHandlers,
  registerStatusHandler,
  registerHealthHandler,
  registerShutdownHandler,
} from './handlers/index.js';
import { createWSServer, type WSServer } from './ws-server.js';
import { QueryBySourceRoute } from './routes/index.js';
import { registerRoute } from './routes/route.interface.js';
import {
  serializerCompiler,
  validatorCompiler,
} from 'fastify-type-provider-zod';
import { RELAY_VERSION } from '../version.js';

/**
 * Options for creating the relay server
 */
interface RelayServerOptions {
  /** Workspace root directory */
  workspaceRoot: string;
  /** HTTP port (default: 4318) */
  port?: number;
  /** Host to bind (default: '127.0.0.1') */
  host?: string;
  /** Enable debug logging */
  debug?: boolean;
  /** Nonce for the server */
  nonce: string;
}

/**
 * Relay server instance
 */
interface RelayServer {
  /** Fastify app instance */
  app: FastifyInstance;
  /** WebSocket server */
  ws: WSServer;
  /** Annotation service */
  annotationService: AnnotationService;
  /** Manifest reader */
  manifestReader: ManifestReader;
  /** Start the server */
  start(): Promise<{ port: number; host: string }>;
  /** Stop the server */
  stop(): Promise<void>;
}

/**
 * Create a relay server instance
 */
export async function createRelayServer(
  options: RelayServerOptions,
): Promise<RelayServer> {
  const {
    workspaceRoot,
    port = DEFAULT_CONFIG.RELAY_PORT,
    host = DEFAULT_CONFIG.RELAY_HOST,
    debug = false,
    nonce,
  } = options;

  // Track server start time for uptime calculation
  const startTime = Date.now();

  // Create Fastify instance
  const app = Fastify({
    bodyLimit: DEFAULT_CONFIG.RELAY_BODY_LIMIT,
    logger: debug
      ? {
          level: 'info',
          transport: {
            target: 'pino-pretty',
            options: { colorize: true },
          },
        }
      : false,
  });

  // Decorate the app with the nonce
  app.decorate('nonce', nonce);

  // Decorate the app with the relay version
  app.decorate('relayVersion', RELAY_VERSION);

  // Decorate the app with the workspace root
  app.decorate('workspaceRoot', workspaceRoot);

  // Set Zod compiler
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  // Register CORS plugin
  await app.register(cors, {
    origin: true, // Allow all origins in dev
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  });

  // Create services
  const annotationStorage = new FileAnnotationStorage(
    path.join(workspaceRoot, PATHS.ANNOTATIONS_DIR),
  );
  const annotationService = new AnnotationService(annotationStorage);
  const manifestReader = new ManifestReader(workspaceRoot);

  // Initialize services
  await annotationService.initialize();
  manifestReader.initialize();

  // Register handlers
  registerShutdownHandler(app);
  registerHealthHandler(app, manifestReader, annotationService);
  registerStatusHandler(app, manifestReader, annotationService, {
    port,
    startTime,
  });
  registerManifestHandlers(app, manifestReader);
  registerAnnotationHandlers(app, annotationService, manifestReader);

  // Create WebSocket server
  const ws = await createWSServer({
    app,
    annotationService,
    manifestReader,
    debug,
  });

  // Register routes that depend on WebSocket server
  registerRoute(QueryBySourceRoute, { app, manifestReader, wsServer: ws });

  // Error handler
  app.setErrorHandler((error: FastifyError, _request, reply) => {
    const statusCode = error.statusCode ?? HTTP_STATUS.INTERNAL_SERVER_ERROR;
    reply.status(statusCode).send({
      error: error.message,
      code: DomscribeErrorCode.DS_INTERNAL_ERROR,
      statusCode,
    });
  });

  return {
    app,
    ws,
    annotationService,
    manifestReader,
    async start() {
      const address = await app.listen({ port, host });
      const url = new URL(address);

      if (debug) {
        console.log(
          `[domscribe-relay] Server started on http://${url.hostname}:${url.port}`,
        );
        console.log(
          `[domscribe-relay] WebSocket: ws://${url.hostname}:${url.port}/ws`,
        );
        console.log(
          `[domscribe-relay] Health: http://${url.hostname}:${url.port}/health`,
        );
        console.log(
          `[domscribe-relay] Status: http://${url.hostname}:${url.port}/status`,
        );
      }

      return {
        port: parseInt(url.port, 10), // Dynamically assigned port
        host: url.hostname,
      };
    },

    async stop() {
      ws.close();
      manifestReader.close();
      await app.close();
    },
  };
}
