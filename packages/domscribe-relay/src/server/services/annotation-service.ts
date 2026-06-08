/**
 * AnnotationService - Domain logic for annotation lifecycle management.
 *
 * Storage is delegated to an AnnotationStorageProvider, keeping this
 * service focused on status transitions, events, search, and pagination.
 */
import type {
  AgentResponse,
  Annotation,
  AnnotationContext,
  AnnotationId,
  AnnotationInteraction,
  AnnotationStatus,
  AnnotationSummary,
  BoundingRect,
  ComponentStyles,
  InteractionMode,
  ManifestEntry,
  ManifestEntryId,
  VerifyResult,
} from '@domscribe/core';
import {
  ANNOTATION_SCHEMA_VERSION,
  AnnotationStatusEnum,
  generateAnnotationId,
  WS_EVENTS,
} from '@domscribe/core';
import { compare } from '@domscribe/verify';
import type { AnnotationStorageProvider } from './storage/annotation-storage.js';

/**
 * Valid annotation status values
 */
const STATUSES: readonly AnnotationStatus[] = [
  AnnotationStatusEnum.QUEUED,
  AnnotationStatusEnum.PROCESSING,
  AnnotationStatusEnum.PROCESSED,
  AnnotationStatusEnum.FAILED,
  AnnotationStatusEnum.ARCHIVED,
] as const;

/**
 * Valid status transitions for annotation lifecycle
 */
const VALID_TRANSITIONS: Record<AnnotationStatus, AnnotationStatus[]> = {
  [AnnotationStatusEnum.QUEUED]: [
    AnnotationStatusEnum.PROCESSING,
    AnnotationStatusEnum.ARCHIVED,
  ],
  [AnnotationStatusEnum.PROCESSING]: [
    AnnotationStatusEnum.PROCESSED,
    AnnotationStatusEnum.FAILED,
    AnnotationStatusEnum.ARCHIVED,
  ],
  [AnnotationStatusEnum.PROCESSED]: [AnnotationStatusEnum.ARCHIVED],
  [AnnotationStatusEnum.FAILED]: [
    AnnotationStatusEnum.QUEUED,
    AnnotationStatusEnum.ARCHIVED,
  ], // Allow retry (queued) from failed
  [AnnotationStatusEnum.ARCHIVED]: [], // Terminal state
};

export interface CreateAnnotationInput {
  mode: InteractionMode;
  interaction: AnnotationInteraction;
  context: Omit<AnnotationContext, 'manifestSnapshot'>;
}

export interface ListAnnotationsOptions {
  status?: AnnotationStatus[];
  limit?: number;
  offset?: number;
}

export interface ListAnnotationsResult {
  annotations: Annotation[];
  total: number;
  hasMore: boolean;
}

export interface SearchAnnotationsOptions {
  entryId?: ManifestEntryId;
  file?: string;
  query?: string;
  status?: AnnotationStatus[];
  limit?: number;
}

export interface SearchAnnotationsResult {
  annotations: AnnotationSummary[];
  total: number;
}

export interface UpdateStatusOptions {
  errorDetails?: string;
}

/**
 * Event types emitted by AnnotationService
 */
type AnnotationEvent =
  | {
      type: typeof WS_EVENTS.ANNOTATION_CREATED;
      data: { id: string; status: AnnotationStatus };
    }
  | {
      type: typeof WS_EVENTS.ANNOTATION_UPDATED;
      data: { id: string; status: AnnotationStatus };
    };

/**
 * Listener for annotation events
 */
type AnnotationEventListener = (event: AnnotationEvent) => void;

/**
 * AnnotationService - Annotation lifecycle management with pluggable storage.
 */
export class AnnotationService {
  private readonly listeners: Set<AnnotationEventListener> = new Set();

  constructor(private readonly storage: AnnotationStorageProvider) {}

  /**
   * Initialize the service by preparing storage buckets.
   */
  async initialize(): Promise<void> {
    await this.storage.initialize(STATUSES);
  }

  /**
   * Create a new annotation
   */
  async create(
    input: CreateAnnotationInput,
    manifestSnapshot?: ManifestEntry[],
  ): Promise<Annotation> {
    const timestamp = new Date().toISOString();
    const id = generateAnnotationId();

    const annotation: Annotation = {
      metadata: {
        id,
        timestamp,
        mode: input.mode,
        status: AnnotationStatusEnum.QUEUED,
        schemaVersion: ANNOTATION_SCHEMA_VERSION,
      },
      interaction: input.interaction,
      context: {
        ...input.context,
        manifestSnapshot,
      },
    };

    await this.storage.write(annotation);
    this.emit({
      type: WS_EVENTS.ANNOTATION_CREATED,
      data: { id, status: AnnotationStatusEnum.QUEUED },
    });

    return annotation;
  }

  /**
   * Get an annotation by ID
   */
  async get(id: AnnotationId): Promise<Annotation | null> {
    for (const status of STATUSES) {
      const annotation = await this.storage.read(id, status);
      if (annotation) {
        return annotation;
      }
    }
    return null;
  }

  /**
   * List annotations with optional filters
   */
  async list(
    options: ListAnnotationsOptions = {},
  ): Promise<ListAnnotationsResult> {
    const statuses = options.status ?? [
      AnnotationStatusEnum.QUEUED,
      AnnotationStatusEnum.PROCESSING,
      AnnotationStatusEnum.PROCESSED,
      AnnotationStatusEnum.FAILED,
    ];
    const limit = Math.min(options.limit ?? 50, 100);
    const offset = options.offset ?? 0;

    const annotations: Annotation[] = [];

    for (const status of statuses) {
      const items = await this.storage.listByStatus(status);
      annotations.push(...items);
    }

    // Sort by timestamp descending (newest first)
    annotations.sort(
      (a, b) =>
        new Date(b.metadata.timestamp).getTime() -
        new Date(a.metadata.timestamp).getTime(),
    );

    const total = annotations.length;
    const paged = annotations.slice(offset, offset + limit);

    return {
      annotations: paged,
      total,
      hasMore: offset + limit < total,
    };
  }

  /**
   * Update annotation status with validation
   */
  async updateStatus(
    id: string,
    newStatus: AnnotationStatus,
    options: UpdateStatusOptions = {},
  ): Promise<Annotation> {
    const annotation = await this.get(id);
    if (!annotation) {
      throw new Error(`Annotation not found: ${id}`);
    }

    const currentStatus = annotation.metadata.status;

    // Validate transition
    if (!VALID_TRANSITIONS[currentStatus].includes(newStatus)) {
      throw new Error(
        `Invalid status transition: ${currentStatus} → ${newStatus}`,
      );
    }

    // Update metadata
    annotation.metadata.status = newStatus;
    if (options.errorDetails !== undefined) {
      annotation.metadata.errorDetails = options.errorDetails;
    }

    // Write to new location
    await this.storage.write(annotation);

    // Remove from old location if different
    if (currentStatus !== newStatus) {
      await this.storage.remove(id, currentStatus);
    }

    this.emit({
      type: WS_EVENTS.ANNOTATION_UPDATED,
      data: { id, status: newStatus },
    });

    return annotation;
  }

  /**
   * Archive an annotation (move to archived status)
   */
  async archive(id: string): Promise<void> {
    const annotation = await this.get(id);
    if (!annotation) {
      throw new Error(`Annotation not found: ${id}`);
    }

    // Any status can transition to archived
    const currentStatus = annotation.metadata.status;
    if (currentStatus === AnnotationStatusEnum.ARCHIVED) {
      return; // Already archived
    }

    annotation.metadata.status = AnnotationStatusEnum.ARCHIVED;
    await this.storage.write(annotation);
    await this.storage.remove(id, currentStatus);

    this.emit({
      type: WS_EVENTS.ANNOTATION_UPDATED,
      data: { id, status: AnnotationStatusEnum.ARCHIVED },
    });
  }

  /**
   * Delete an annotation permanently
   */
  async delete(id: string): Promise<boolean> {
    for (const status of STATUSES) {
      const removed = await this.storage.remove(id, status);
      if (removed) {
        return true;
      }
    }
    return false;
  }

  /**
   * Subscribe to annotation events
   */
  onEvent(listener: AnnotationEventListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Get the count of annotations by status
   */
  async getCountByStatus(): Promise<Record<AnnotationStatus, number>> {
    const counts: Record<AnnotationStatus, number> = {
      [AnnotationStatusEnum.QUEUED]: 0,
      [AnnotationStatusEnum.PROCESSING]: 0,
      [AnnotationStatusEnum.PROCESSED]: 0,
      [AnnotationStatusEnum.FAILED]: 0,
      [AnnotationStatusEnum.ARCHIVED]: 0,
    };

    for (const status of STATUSES) {
      counts[status] = await this.storage.countByStatus(status);
    }

    return counts;
  }

  /**
   * Atomically claim the next queued annotation for processing.
   */
  async claimNext(maxRetries = 3): Promise<Annotation | null> {
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      const { annotations } = await this.list({
        status: [AnnotationStatusEnum.QUEUED],
      });

      if (annotations.length === 0) {
        return null;
      }

      // Take the oldest annotation (last in the list since sorted newest-first)
      const annotation = annotations[annotations.length - 1];

      try {
        return await this.updateStatus(
          annotation.metadata.id,
          AnnotationStatusEnum.PROCESSING,
        );
      } catch (error) {
        // Race condition - another agent claimed it first, retry with next
        const message = error instanceof Error ? error.message : String(error);
        if (
          message.includes('not found') ||
          message.includes('Invalid status transition')
        ) {
          continue;
        }
        throw error;
      }
    }

    return null;
  }

  /**
   * Store agent response on an annotation.
   */
  async respond(
    id: string,
    response: Pick<AgentResponse, 'message'>,
  ): Promise<Annotation> {
    const annotation = await this.get(id);
    if (!annotation) {
      throw new Error(`Annotation not found: ${id}`);
    }

    if (annotation.metadata.status !== AnnotationStatusEnum.PROCESSING) {
      throw new Error(
        `Cannot respond to annotation in '${annotation.metadata.status}' status. ` +
          `Must be in '${AnnotationStatusEnum.PROCESSING}' status.`,
      );
    }

    // Set agent response with timestamp
    annotation.agentResponse = {
      message: response.message,
    };

    // Write updated annotation
    await this.storage.write(annotation);

    return annotation;
  }

  /**
   * Run verify_after_edit against a stored annotation.
   *
   * Reads the pre-edit baseline from the annotation's
   * `context.runtimeContext.componentStyles` and `interaction.boundingRect`,
   * compares it to the caller-supplied post-edit capture via
   * `@domscribe/verify`, and appends the resulting `VerifyResult` to the
   * annotation's `verifyHistory`.
   *
   * Soft-recommended: there is NO lifecycle gate — `updateStatus(PROCESSED)`
   * works whether or not `verifyAfterEdit` has been called. RFC 0002 §Decision
   * routes the escalation path through a falsifier-trip review, not the
   * state machine.
   *
   * Screenshots are never inlined into the annotation — only the opaque
   * `screenshotRef` is stored. The pixel-diff axis is therefore inactive
   * here; it activates when the overlay later wires the runtime
   * ScreenshotCapturer through the blob endpoint (deferred to a follow-up
   * PR per RFC 0002 §B1).
   */
  async verifyAfterEdit(
    id: string,
    postEdit: {
      componentStyles?: ComponentStyles;
      boundingRect?: BoundingRect;
      screenshotRef?: string;
    },
  ): Promise<VerifyResult> {
    const annotation = await this.get(id);
    if (!annotation) {
      throw new Error(`Annotation not found: ${id}`);
    }

    const beforeStyles = annotation.context.runtimeContext?.componentStyles;
    const beforeRect = annotation.interaction.boundingRect;

    const result = compare({
      annotationId: annotation.metadata.id as AnnotationId,
      beforeStyles,
      afterStyles: postEdit.componentStyles,
      beforeRect,
      afterRect: postEdit.boundingRect,
      screenshotRef: postEdit.screenshotRef,
    });

    annotation.verifyHistory = [...(annotation.verifyHistory ?? []), result];

    await this.storage.write(annotation);
    this.emit({
      type: WS_EVENTS.ANNOTATION_UPDATED,
      data: { id, status: annotation.metadata.status },
    });

    return result;
  }

  /**
   * Patch an annotation with partial context updates.
   */
  async patch(
    id: string,
    updates: { context?: Partial<AnnotationContext> },
  ): Promise<Annotation> {
    const annotation = await this.get(id);
    if (!annotation) {
      throw new Error(`Annotation not found: ${id}`);
    }

    if (updates.context) {
      annotation.context = {
        ...annotation.context,
        ...updates.context,
      };
    }

    await this.storage.write(annotation);
    this.emit({
      type: WS_EVENTS.ANNOTATION_UPDATED,
      data: { id, status: annotation.metadata.status },
    });

    return annotation;
  }

  /**
   * Search annotations by various criteria.
   */
  async search(
    options: SearchAnnotationsOptions = {},
  ): Promise<SearchAnnotationsResult> {
    const { entryId, file, query, status, limit = 50 } = options;
    const maxLimit = Math.min(limit, 100);

    const statuses = status ?? [
      AnnotationStatusEnum.QUEUED,
      AnnotationStatusEnum.PROCESSING,
      AnnotationStatusEnum.PROCESSED,
      AnnotationStatusEnum.FAILED,
    ];

    const allAnnotations: Annotation[] = [];

    for (const s of statuses) {
      const items = await this.storage.listByStatus(s);
      allAnnotations.push(...items);
    }

    // Apply filters
    let filtered = allAnnotations;

    if (entryId) {
      filtered = filtered.filter(
        (a) => a.interaction.selectedElement?.dataDs === entryId,
      );
    }

    if (file) {
      filtered = filtered.filter((a) =>
        a.context.manifestSnapshot?.some((m) => m.file === file),
      );
    }

    if (query) {
      const lowerQuery = query.toLowerCase();
      filtered = filtered.filter(
        (a) =>
          a.context.userMessage?.toLowerCase().includes(lowerQuery) ?? false,
      );
    }

    // Sort by timestamp descending
    filtered.sort(
      (a, b) =>
        new Date(b.metadata.timestamp).getTime() -
        new Date(a.metadata.timestamp).getTime(),
    );

    const total = filtered.length;

    // Apply limit and convert to summaries
    const summaries: AnnotationSummary[] = filtered
      .slice(0, maxLimit)
      .map((a) => ({
        id: a.metadata.id,
        status: a.metadata.status,
        timestamp: a.metadata.timestamp,
        entryId: a.interaction.selectedElement?.dataDs,
        file: a.context.manifestSnapshot?.[0]?.file,
        userMessage: a.context.userMessage,
      }));

    return {
      annotations: summaries,
      total,
    };
  }

  private emit(event: AnnotationEvent): void {
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch {
        // Ignore listener errors
      }
    }
  }
}
