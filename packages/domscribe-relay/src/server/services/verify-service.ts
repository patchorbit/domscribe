/**
 * Post-edit verification service (RFC 0002).
 *
 * Captures element snapshots (computed-style allowlist + bounding rect)
 * over the existing WS request/response channel, stores them as in-memory
 * baselines, and compares a post-edit re-capture against a baseline using
 * the deterministic delta functions from `@domscribe/verify`.
 *
 * Baselines are session-scoped by design: they describe the live page in
 * the developer's browser right now, so persisting them across relay
 * restarts would only produce stale comparisons.
 *
 * @module @domscribe/relay/server/services/verify-service
 */
import crypto from 'crypto';
import type {
  BoundingRect,
  ManifestEntryId,
  VerifyResult,
} from '@domscribe/core';
import {
  diffBoundingRects,
  diffStyleMaps,
  resolveVerdict,
  type ExpectedChange,
} from '@domscribe/verify';
import type { WSServer } from '../ws-server.js';
import type { AnnotationService } from './annotation-service.js';
import type {
  VerifyBaselineResponse,
  VerifyCheckResponse,
} from '../../schema.js';

interface ElementSnapshot {
  computed?: Record<string, string>;
  boundingRect?: BoundingRect;
}

interface VerifyBaseline extends ElementSnapshot {
  id: string;
  entryId: ManifestEntryId;
  capturedAt: string;
}

/** Cap stored baselines; oldest entries are evicted first. */
const MAX_BASELINES = 100;

export class VerifyService {
  private readonly baselines = new Map<string, VerifyBaseline>();

  constructor(
    private readonly wsServer: WSServer,
    private readonly annotationService: AnnotationService,
  ) {}

  /**
   * Capture a pre-edit baseline snapshot for a manifest entry.
   */
  async captureBaseline(
    entryId: ManifestEntryId,
  ): Promise<VerifyBaselineResponse> {
    const capture = await this.captureSnapshot(entryId);
    if ('error' in capture) {
      return {
        captured: false,
        browserConnected: capture.browserConnected,
        error: capture.error,
      };
    }

    const baseline: VerifyBaseline = {
      id: `vb_${crypto.randomUUID()}`,
      entryId,
      capturedAt: new Date().toISOString(),
      ...capture.snapshot,
    };
    this.baselines.set(baseline.id, baseline);
    this.evictOldest();

    return {
      captured: true,
      baselineId: baseline.id,
      entryId,
      capturedAt: baseline.capturedAt,
      browserConnected: true,
      hasComponentStyles: baseline.computed !== undefined,
      hasBoundingRect: baseline.boundingRect !== undefined,
    };
  }

  /**
   * Re-capture the element and compare against a stored baseline.
   */
  async check(params: {
    baselineId: string;
    expectedChanges?: ExpectedChange[];
    annotationId?: string;
  }): Promise<VerifyCheckResponse> {
    const { baselineId, expectedChanges, annotationId } = params;

    const baseline = this.baselines.get(baselineId);
    if (!baseline) {
      return {
        verified: false,
        browserConnected: this.wsServer.getClientCount() > 0,
        error: `Unknown baselineId "${baselineId}" — capture a baseline before verifying. Baselines do not survive relay restarts.`,
      };
    }

    const capture = await this.captureSnapshot(baseline.entryId);
    if ('error' in capture) {
      return {
        verified: false,
        browserConnected: capture.browserConnected,
        error: capture.error,
      };
    }

    const result = this.compare(baseline, capture.snapshot, expectedChanges);

    if (annotationId) {
      await this.appendToAnnotation(annotationId, result);
    }

    return { verified: true, browserConnected: true, result };
  }

  private compare(
    baseline: ElementSnapshot,
    current: ElementSnapshot,
    expectedChanges?: ExpectedChange[],
  ): VerifyResult {
    const stylesAvailable =
      baseline.computed !== undefined || current.computed !== undefined;
    const styleDeltas = stylesAvailable
      ? diffStyleMaps(baseline.computed ?? {}, current.computed ?? {})
      : [];

    const rectsAvailable =
      baseline.boundingRect !== undefined && current.boundingRect !== undefined;
    const rectDeltas =
      baseline.boundingRect && current.boundingRect
        ? diffBoundingRects(baseline.boundingRect, current.boundingRect)
        : [];

    // Without style data, declared expectations cannot be evaluated —
    // fall back to change detection and say so.
    const { verdict, notes } = resolveVerdict({
      styleDeltas,
      rectDeltas,
      expectedChanges: stylesAvailable ? expectedChanges : undefined,
    });

    const unavailableNote = stylesAvailable
      ? undefined
      : 'Style snapshots are unavailable (runtime captureStyles is off) — verdict is based on element geometry only. Enable captureStyles for per-property deltas.';

    return {
      verdict,
      timestamp: new Date().toISOString(),
      componentStylesDelta: stylesAvailable ? styleDeltas : undefined,
      boundingRectDelta: rectsAvailable ? rectDeltas : undefined,
      notes: [unavailableNote, notes].filter(Boolean).join(' ') || undefined,
    };
  }

  private async captureSnapshot(
    entryId: ManifestEntryId,
  ): Promise<
    | { snapshot: ElementSnapshot }
    | { error: string; browserConnected: boolean }
  > {
    if (this.wsServer.getClientCount() === 0) {
      return {
        error:
          'No browser is connected — open the page in the browser and retry.',
        browserConnected: false,
      };
    }

    const response = await this.wsServer.requestContext(entryId);
    if (!response || !response.success || response.rendered === false) {
      return {
        error:
          response?.error ??
          'Element is not currently rendered in the browser — navigate to a page that renders it and retry.',
        browserConnected: true,
      };
    }

    return {
      snapshot: {
        computed: response.context?.componentStyles?.computed,
        boundingRect: response.elementInfo?.boundingRect,
      },
    };
  }

  private async appendToAnnotation(
    annotationId: string,
    result: VerifyResult,
  ): Promise<void> {
    const annotation = await this.annotationService.get(annotationId);
    if (!annotation) return;

    await this.annotationService.patch(annotationId, {
      context: {
        verifyHistory: [...(annotation.context.verifyHistory ?? []), result],
      },
    });
  }

  private evictOldest(): void {
    while (this.baselines.size > MAX_BASELINES) {
      const oldestKey = this.baselines.keys().next().value;
      if (oldestKey === undefined) return;
      this.baselines.delete(oldestKey);
    }
  }
}
