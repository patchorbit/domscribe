/**
 * RelayService - Unified relay server communication service
 *
 * Combines HTTP and WebSocket clients for complete relay integration.
 * Manages connection state and updates OverlayStore.
 */

import { OverlayStore } from '../core/overlay-store.js';
import {
  type AnnotationListResponse,
  RelayHttpClient,
  RelayWSClient,
  WSContextRequestSchema,
  WSTargetRequestSchema,
} from '@domscribe/relay/client';
import type {
  Annotation,
  ManifestEntry,
  InteractionMode,
  AnnotationInteraction,
  AnnotationContext,
  AnnotationStatus,
  AnnotationId,
  TargetQueryInput,
} from '@domscribe/core';
import { AnnotationStatusEnum, WS_EVENTS } from '@domscribe/core';
import { BridgeDispatch } from '@domscribe/runtime';

/**
 * Unified relay service
 */
export class RelayService {
  private static instance: RelayService | null = null;

  private relayHttpClient: RelayHttpClient | null = null;
  private wsClient: RelayWSClient | null = null;
  private store: OverlayStore;
  private unsubscribers: Array<() => void> = [];

  private async querySourceContext(query: TargetQueryInput) {
    const bridge = BridgeDispatch.getInstance();
    const selection = bridge.resolveTargets(query);
    if (selection.status !== 'resolved') return selection;
    const target = selection.targets[0];
    let sourceFile: string | undefined;
    try {
      if (target.entryId)
        sourceFile = (await this.resolve(target.entryId))?.file;
    } catch {
      /* Source metadata may be unavailable; nearest context is labeled. */
    }
    return bridge.queryTargets(
      { instanceId: target.instanceId },
      { sourceFile },
    );
  }

  private constructor() {
    this.store = OverlayStore.getInstance();
  }

  /**
   * Get the singleton instance
   */
  static getInstance(): RelayService {
    if (!RelayService.instance) {
      RelayService.instance = new RelayService();
    }
    return RelayService.instance;
  }

  /**
   * Reset the singleton instance (useful for testing)
   */
  static resetInstance(): void {
    if (RelayService.instance) {
      RelayService.instance.cleanup();
    }
    RelayService.instance = null;
  }

  /**
   * Initialize connection using injected globals
   * @returns true if connected successfully
   */
  async initialize(): Promise<boolean> {
    const port = window.__DOMSCRIBE_RELAY_PORT__;
    const host = window.__DOMSCRIBE_RELAY_HOST__ || '127.0.0.1';
    const debug = this.store.getState().debug;

    if (!port) {
      if (debug) {
        console.warn(
          '[domscribe-overlay][relay-service] Relay port not found. ' +
            'Make sure the Domscribe plugin is configured with relay: { autoStart: true }',
        );
      }
      this.store.setRelayConnection(false);
      return false;
    }

    // Create HTTP client
    this.relayHttpClient = new RelayHttpClient(host, port);

    // Verify connection with health check
    try {
      const { status } = await this.relayHttpClient.getHealth();

      if (status !== 'healthy') {
        throw new Error('Relay is not healthy');
      }

      if (debug) {
        console.log(
          `[domscribe-overlay][relay-service] Connected to relay at ${host}:${port}`,
        );
      }
    } catch (error) {
      if (debug) {
        console.error(
          '[domscribe-overlay][relay-service] Health check failed:',
          error,
        );
      }
      this.store.setRelayConnection(false);
      return false;
    }

    // Create and connect WebSocket client
    this.wsClient = new RelayWSClient(host, port, { debug });

    // Subscribe to WebSocket events
    this.unsubscribers.push(
      this.wsClient.on(WS_EVENTS.CONNECTED, () => {
        this.store.setRelayConnection(true, port, host);
      }),
    );

    this.unsubscribers.push(
      this.wsClient.on(WS_EVENTS.DISCONNECTED, () => {
        this.store.setRelayConnection(false);
      }),
    );

    this.unsubscribers.push(
      this.wsClient.onAnnotationCreated(() => {
        this.refreshAnnotations();
      }),
    );

    this.unsubscribers.push(
      this.wsClient.onAnnotationUpdated(() => {
        this.refreshAnnotations();
      }),
    );

    this.unsubscribers.push(
      this.wsClient.on(WS_EVENTS.TARGET_REQUEST, async (data: unknown) => {
        const packet = WSTargetRequestSchema.safeParse(data);
        if (!packet.success) return;
        let result;
        try {
          result = await this.querySourceContext(packet.data.query);
        } catch {
          result = { status: 'unavailable', targets: [], total: 0 };
        }
        this.wsClient?.send(WS_EVENTS.TARGET_RESPONSE, {
          requestId: packet.data.requestId,
          result,
        });
      }),
    );

    // Handle context requests from relay server (bidirectional WS)
    this.unsubscribers.push(
      this.wsClient.on(WS_EVENTS.CONTEXT_REQUEST, async (data: unknown) => {
        const packet = WSContextRequestSchema.safeParse(data);
        if (!packet.success) return;
        const { requestId, entryId, instanceId, locator } = packet.data;
        const bridge = BridgeDispatch.getInstance();

        let responseData: Record<string, unknown>;
        if (!bridge.isReady()) {
          responseData = {
            requestId,
            success: false,
            rendered: false,
            selectionStatus: 'not_ready',
            targets: [],
            total: 0,
          };
        } else {
          try {
            const selection = await this.querySourceContext({
              entryId,
              instanceId,
              locator,
            });
            const context = selection.context;
            const selected =
              selection.status === 'resolved'
                ? document.querySelector<HTMLElement>(
                    selection.targets[0].selector,
                  )
                : null;
            const elementInfo = selected ? { element: selected } : null;
            responseData = {
              requestId,
              selectionStatus: selection.status,
              selectionReason: selection.reason,
              targets: selection.targets,
              total: selection.total,
              success: selection.status === 'resolved' && context != null,
              rendered: selection.status === 'resolved',
              context: context ?? undefined,
              elementInfo: elementInfo
                ? {
                    tagName: elementInfo.element?.tagName?.toLowerCase(),
                    attributes: Object.fromEntries(
                      Array.from(elementInfo.element?.attributes ?? []).map(
                        (attr) => [attr.name, attr.value],
                      ),
                    ),
                    innerText: elementInfo.element?.innerText?.slice(0, 500),
                    boundingRect: this.serializeBoundingRect(
                      elementInfo.element,
                    ),
                  }
                : undefined,
            };
          } catch {
            responseData = {
              requestId,
              success: false,
              rendered: false,
              error: 'Capture failed',
            };
          }
        }

        this.wsClient?.send(WS_EVENTS.CONTEXT_RESPONSE, responseData);
      }),
    );

    // Connect WebSocket
    this.wsClient.connect();

    // Update store with initial connection state
    this.store.setRelayConnection(true, port, host);

    // Load initial annotations
    await this.refreshAnnotations();

    return true;
  }

  /**
   * Serialize an element's bounding rect into a plain JSON-safe object.
   * DOMRect is not JSON-serializable directly (its fields are getters).
   */
  private serializeBoundingRect(element: HTMLElement | undefined):
    | {
        x: number;
        y: number;
        width: number;
        height: number;
        top: number;
        right: number;
        bottom: number;
        left: number;
      }
    | undefined {
    if (!element || typeof element.getBoundingClientRect !== 'function') {
      return undefined;
    }
    const rect = element.getBoundingClientRect();
    return {
      x: rect.x,
      y: rect.y,
      width: rect.width,
      height: rect.height,
      top: rect.top,
      right: rect.right,
      bottom: rect.bottom,
      left: rect.left,
    };
  }

  /**
   * Refresh annotations from server
   */
  async refreshAnnotations(): Promise<void> {
    if (!this.relayHttpClient) return;

    try {
      const result = await this.relayHttpClient.listAnnotations({
        statuses: [
          AnnotationStatusEnum.QUEUED,
          AnnotationStatusEnum.PROCESSING,
          AnnotationStatusEnum.PROCESSED,
          AnnotationStatusEnum.FAILED,
          AnnotationStatusEnum.ARCHIVED,
        ],
        limit: 50,
      });
      this.store.setState({ annotations: result.annotations });
    } catch (error) {
      if (this.store.getState().debug) {
        console.error(
          '[domscribe-overlay][relay-service] Failed to refresh annotations:',
          error,
        );
      }
    }
  }

  /**
   * Resolve element ID to source location
   */
  async resolve(entryId: string): Promise<ManifestEntry | null> {
    if (!this.relayHttpClient) return null;

    const result = await this.relayHttpClient.resolveManifestEntry(entryId);
    return result.success ? (result.entry ?? null) : null;
  }

  /**
   * Create a new annotation
   */
  async createAnnotation({
    mode,
    interaction,
    context,
  }: {
    mode: InteractionMode;
    interaction: AnnotationInteraction;
    context: AnnotationContext;
  }): Promise<Annotation> {
    if (!this.relayHttpClient) {
      throw new Error('Relay not connected');
    }

    this.store.setState({ isSubmitting: true });

    try {
      const annotation = await this.relayHttpClient.createAnnotation({
        mode,
        interaction,
        context,
      });

      // Clear input after successful submission
      this.store.setState({
        annotationInput: '',
        isSubmitting: false,
      });

      // Refresh to get latest list
      await this.refreshAnnotations();

      return annotation;
    } catch (error) {
      this.store.setState({ isSubmitting: false });
      throw error;
    }
  }

  /**
   * List annotations with optional filters
   */
  async listAnnotations({
    statuses,
    limit,
    offset,
  }: {
    statuses?: AnnotationStatus[];
    limit?: number;
    offset?: number;
  }): Promise<AnnotationListResponse> {
    if (!this.relayHttpClient) {
      throw new Error('Relay not connected');
    }

    return this.relayHttpClient.listAnnotations({
      statuses,
      limit,
      offset,
    });
  }

  /**
   * Get a single annotation
   */
  async getAnnotation(annotationId: AnnotationId): Promise<Annotation | null> {
    if (!this.relayHttpClient) return null;
    return this.relayHttpClient.getAnnotation(annotationId);
  }

  /**
   * Archive an annotation (transition to archived status)
   */
  async archiveAnnotation(annotationId: AnnotationId): Promise<void> {
    if (!this.relayHttpClient) {
      throw new Error('Relay not connected');
    }

    await this.relayHttpClient.updateAnnotationStatus(
      annotationId,
      AnnotationStatusEnum.ARCHIVED,
      {},
    );
    await this.refreshAnnotations();
  }

  /**
   * Delete an annotation permanently
   */
  async deleteAnnotation(annotationId: AnnotationId): Promise<void> {
    if (!this.relayHttpClient) {
      throw new Error('Relay not connected');
    }

    await this.relayHttpClient.deleteAnnotation(annotationId);
    await this.refreshAnnotations();
  }

  /**
   * Update annotation status
   */
  async updateAnnotationStatus(
    annotationId: AnnotationId,
    status: AnnotationStatus,
  ): Promise<void> {
    if (!this.relayHttpClient) {
      throw new Error('Relay not connected');
    }

    await this.relayHttpClient.updateAnnotationStatus(annotationId, status, {});
    await this.refreshAnnotations();
  }

  /**
   * Patch annotation context (partial update).
   * Used for refreshing metadata or editing the user message.
   */
  async patchAnnotation(
    annotationId: AnnotationId,
    updates: { context?: Partial<AnnotationContext> },
  ): Promise<Annotation> {
    if (!this.relayHttpClient) {
      throw new Error('Relay not connected');
    }

    const result = await this.relayHttpClient.patchAnnotation(
      annotationId,
      updates,
    );
    await this.refreshAnnotations();
    return result.annotation;
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.store.getState().relayConnected;
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    // Unsubscribe from events
    this.unsubscribers.forEach((unsub) => unsub());
    this.unsubscribers = [];

    // Disconnect WebSocket
    this.wsClient?.disconnect();
    this.wsClient = null;

    // Clear HTTP client
    this.relayHttpClient = null;
  }
}
