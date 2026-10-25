/**
 * WebSocket Server for Domscribe Relay
 *
 * Provides real-time updates to the overlay UI.
 *
 * @module @domscribe/relay/server/ws-server
 */
import type { FastifyInstance } from 'fastify';
import websocket from '@fastify/websocket';
import type { WebSocket } from 'ws';
import {
  API_PATHS,
  WS_EVENTS,
  TargetQuerySchema,
  type TargetQueryInput,
} from '@domscribe/core';
import type { ManifestReader } from '@domscribe/manifest';
import type { AnnotationService } from './services/index.js';
import crypto from 'crypto';
import {
  WSContextResponseSchema,
  WSTargetResponseSchema,
  type RuntimeTargetResponse,
  type WSMessage,
  type WSContextResponse,
} from '../schema.js';

/**
 * WebSocket server instance
 */
export interface WSServer {
  /** Broadcast a message to all connected clients */
  broadcast(event: string, data: unknown): void;
  /** Get connected client count */
  getClientCount(): number;
  /** Request runtime context from browser for a given entry ID */
  requestContext(
    entryId: string,
    timeoutMs?: number,
    selection?: Pick<TargetQueryInput, 'instanceId' | 'locator'>,
  ): Promise<WSContextResponse | null>;
  requestTargets(
    query: TargetQueryInput,
    timeoutMs?: number,
  ): Promise<RuntimeTargetResponse | null>;
  /** Clean up resources */
  close(): void;
}

/**
 * Options for creating the WebSocket server
 */
interface WSServerOptions {
  /** Fastify app instance to attach WebSocket to */
  app: FastifyInstance;
  /** Annotation service for event subscription */
  annotationService: AnnotationService;
  /** Manifest reader for event subscription */
  manifestReader: ManifestReader;
  /** WebSocket path (default: /ws) */
  path?: string;
  /** Enable debug logging */
  debug?: boolean;
}

/**
 * Create and attach WebSocket server to Fastify
 */
export async function createWSServer(
  options: WSServerOptions,
): Promise<WSServer> {
  const {
    app,
    annotationService,
    manifestReader,
    path = API_PATHS.WS,
    debug = false,
  } = options;

  const clients: Set<WebSocket> = new Set();
  const unsubscribers: Array<() => void> = [];
  const pendingRequests = new Map<
    string,
    {
      resolve: (value: WSContextResponse | null) => void;
      socket: WebSocket;
      timer: ReturnType<typeof setTimeout>;
    }
  >();

  const pendingTargets = new Map<
    string,
    {
      socket: WebSocket;
      resolve: (value: RuntimeTargetResponse | null) => void;
      timer: ReturnType<typeof setTimeout>;
    }
  >();

  // Register WebSocket plugin
  await app.register(websocket);

  // WebSocket route
  app.get(path, { websocket: true }, (socket: WebSocket) => {
    clients.add(socket);

    if (debug) {
      console.log(
        `[domscribe-relay][ws] Client connected (total: ${clients.size})`,
      );
    }

    // Send initial connection confirmation
    sendMessage(socket, WS_EVENTS.CONNECT, {
      timestamp: new Date().toISOString(),
      clientCount: clients.size,
    });

    socket.on('message', (raw: Buffer | string) => {
      try {
        const msg: WSMessage = JSON.parse(
          typeof raw === 'string' ? raw : raw.toString(),
        );
        if (msg.event === WS_EVENTS.TARGET_RESPONSE) {
          const response = WSTargetResponseSchema.parse(msg.data);
          const pending = pendingTargets.get(response.requestId);
          if (pending?.socket === socket) {
            clearTimeout(pending.timer);
            pendingTargets.delete(response.requestId);
            pending.resolve(
              clients.size === 1
                ? response.result
                : { status: 'ambiguous_browser', targets: [], total: 0 },
            );
          }
        }
        if (msg.event === WS_EVENTS.CONTEXT_RESPONSE) {
          const response = WSContextResponseSchema.parse(msg.data);
          const pending = pendingRequests.get(response.requestId);
          if (pending?.socket === socket) {
            clearTimeout(pending.timer);
            pendingRequests.delete(response.requestId);
            pending.resolve(
              clients.size === 1
                ? response
                : {
                    requestId: response.requestId,
                    success: false,
                    rendered: false,
                    selectionStatus: 'ambiguous_browser',
                  },
            );
          }
        }
      } catch {
        /* ignore malformed messages */
      }
    });

    socket.on('close', () => {
      clients.delete(socket);
      for (const [id, pending] of pendingTargets) {
        if (pending.socket === socket) {
          clearTimeout(pending.timer);
          pendingTargets.delete(id);
          pending.resolve(null);
        }
      }
      if (debug) {
        console.log(
          `[domscribe-relay][ws] Client disconnected (total: ${clients.size})`,
        );
      }
    });

    socket.on('error', (error) => {
      if (debug) {
        console.error('[domscribe-relay][ws] Socket error:', error);
      }
      clients.delete(socket);
    });
  });

  // Subscribe to annotation events
  const unsubAnnotation = annotationService.onEvent((event) => {
    if (event.type === WS_EVENTS.ANNOTATION_CREATED) {
      broadcast(WS_EVENTS.ANNOTATION_CREATED, event.data);
    } else if (event.type === WS_EVENTS.ANNOTATION_UPDATED) {
      broadcast(WS_EVENTS.ANNOTATION_UPDATED, event.data);
    }
  });
  unsubscribers.push(unsubAnnotation);

  // Subscribe to manifest events
  const unsubManifest = manifestReader.onEvent((event) => {
    if (event.type === WS_EVENTS.MANIFEST_UPDATED) {
      broadcast(WS_EVENTS.MANIFEST_UPDATED, event.data);
    }
  });
  unsubscribers.push(unsubManifest);

  /**
   * Send a message to a single client
   */
  function sendMessage(socket: WebSocket, event: string, data: unknown): void {
    if (socket.readyState === socket.OPEN) {
      const message: WSMessage = { event, data };
      socket.send(JSON.stringify(message));
    }
  }

  /**
   * Broadcast a message to all connected clients
   */
  function broadcast(event: string, data: unknown): void {
    const message: WSMessage = { event, data };
    const payload = JSON.stringify(message);

    for (const client of clients) {
      if (client.readyState === client.OPEN) {
        client.send(payload);
      }
    }

    if (debug) {
      console.log(
        `[domscribe-relay][ws] Broadcast ${event} to ${clients.size} clients`,
      );
    }
  }

  /**
   * Request runtime context from the browser for a given entry ID.
   * Broadcasts a context:request to all connected clients and waits
   * for the first context:response or timeout.
   */
  function requestContext(
    entryId: string,
    timeoutMs = 3000,
    selection?: Pick<TargetQueryInput, 'instanceId' | 'locator'>,
  ): Promise<WSContextResponse | null> {
    if (clients.size === 0) return Promise.resolve(null);
    if (clients.size > 1)
      return Promise.resolve({
        requestId: crypto.randomUUID(),
        success: false,
        rendered: false,
        selectionStatus: 'ambiguous_browser',
      });

    const socket = clients.values().next().value;
    if (!socket) return Promise.resolve(null);
    const requestId = crypto.randomUUID();
    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        pendingRequests.delete(requestId);
        resolve(null);
      }, timeoutMs);

      pendingRequests.set(requestId, {
        resolve,
        timer,
        socket,
      });
      broadcast(WS_EVENTS.CONTEXT_REQUEST, {
        requestId,
        entryId,
        ...selection,
      });
    });
  }

  function requestTargets(
    input: TargetQueryInput,
    timeoutMs = 3000,
  ): Promise<RuntimeTargetResponse | null> {
    const query = TargetQuerySchema.parse(input);
    if (clients.size === 0) return Promise.resolve(null);
    if (clients.size > 1)
      return Promise.resolve({
        status: 'ambiguous_browser',
        targets: [],
        total: 0,
      });
    const socket = clients.values().next().value;
    if (!socket) return Promise.resolve(null);
    const requestId = crypto.randomUUID();
    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        pendingTargets.delete(requestId);
        resolve(null);
      }, timeoutMs);
      pendingTargets.set(requestId, { socket, resolve, timer });
      sendMessage(socket, WS_EVENTS.TARGET_REQUEST, { requestId, query });
    });
  }

  return {
    broadcast,

    getClientCount(): number {
      return clients.size;
    },

    requestContext,
    requestTargets,

    close(): void {
      for (const pending of pendingTargets.values()) {
        clearTimeout(pending.timer);
        pending.resolve(null);
      }
      pendingTargets.clear();
      // Clear pending context requests
      for (const [, pending] of pendingRequests) {
        clearTimeout(pending.timer);
        pending.resolve(null);
      }
      pendingRequests.clear();

      // Unsubscribe from all events
      for (const unsub of unsubscribers) {
        unsub();
      }
      unsubscribers.length = 0;

      // Close all client connections
      for (const client of clients) {
        client.close();
      }
      clients.clear();
    },
  };
}
