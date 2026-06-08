/**
 * Shared API schemas — contract between server and client.
 *
 * This module is imported by both the browser client (RelayHttpClient)
 * and the server route handlers. Do NOT import anything from server/,
 * services/, or any Node-only dependency here.
 *
 * @module @domscribe/relay/schema
 */
import { z } from 'zod';
import {
  AnnotationContextSchema,
  AnnotationIdSchema,
  AnnotationInteractionSchema,
  AnnotationSchema,
  BoundingRectSchema,
  ComponentStylesSchema,
  InteractionModeSchema,
  ManifestEntryIdSchema,
  ManifestEntrySchema,
  RuntimeContextSchema,
  SelectedElementSchema,
  SourcePositionSchema,
  AnnotationStatusSchema,
  AnnotationSummarySchema,
  VerifyResultSchema,
} from '@domscribe/core';

/* =============================
 * Annotation - Create
 * ============================= */
export const AnnotationCreateRequestBodySchema = z
  .object({
    mode: InteractionModeSchema,
    interaction: AnnotationInteractionSchema,
    context: AnnotationContextSchema.omit({ manifestSnapshot: true }),
  })
  .describe('The annotation to create');
export type AnnotationCreateRequestBody = z.infer<
  typeof AnnotationCreateRequestBodySchema
>;

export const AnnotationCreateResponseSchema = AnnotationSchema.describe(
  'The created annotation',
);
export type AnnotationCreateResponse = z.infer<
  typeof AnnotationCreateResponseSchema
>;

/* =============================
 * Annotation - Delete
 * ============================= */
export const AnnotationDeleteRequestParamsSchema = z.object({
  id: AnnotationIdSchema.describe('The annotation ID to delete'),
});
export type AnnotationDeleteRequestParams = z.infer<
  typeof AnnotationDeleteRequestParamsSchema
>;

/* =============================
 * Annotation - Get
 * ============================= */
export const AnnotationGetRequestParamsSchema = z.object({
  id: AnnotationIdSchema.describe('The annotation ID to get'),
});
export type AnnotationGetRequestParams = z.infer<
  typeof AnnotationGetRequestParamsSchema
>;

export const AnnotationGetResponseSchema = AnnotationSchema.describe(
  'The annotation to get',
);
export type AnnotationGetResponse = z.infer<typeof AnnotationGetResponseSchema>;

/* =============================
 * Annotation - List
 * ============================= */
export const AnnotationListRequestQuerySchema = z.object({
  status: z
    .string()
    .optional()
    .describe('Comma-separated list of annotation statuses to filter by'),
  limit: z
    .string()
    .optional()
    .describe('Maximum number of annotations to return (default: 50)'),
  offset: z.string().optional().describe('Offset for pagination (default: 0)'),
});
export type AnnotationListRequestQuery = z.infer<
  typeof AnnotationListRequestQuerySchema
>;

export const AnnotationListResponseSchema = z
  .object({
    annotations: z.array(AnnotationSchema),
    total: z.number(),
    hasMore: z.boolean(),
  })
  .describe('List of annotations');
export type AnnotationListResponse = z.infer<
  typeof AnnotationListResponseSchema
>;

/* =============================
 * Annotation - Process
 * ============================= */
export const AnnotationProcessResponseSchema = z
  .object({
    found: z.boolean().describe('Whether an annotation was found and claimed'),
    annotationId: AnnotationIdSchema.optional().describe('The annotation ID'),
    userIntent: z.string().optional().describe('The user intent'),
    element: SelectedElementSchema.optional().describe('The selected element'),
    sourceLocation: z
      .object({
        file: ManifestEntrySchema.shape.file,
        line: SourcePositionSchema.shape.line,
        column: SourcePositionSchema.shape.column,
        componentName: ManifestEntrySchema.shape.componentName,
        tagName: ManifestEntrySchema.shape.tagName,
      })
      .optional()
      .describe('The source location'),
    runtimeContext: RuntimeContextSchema.optional().describe(
      'The runtime context',
    ),
    fullAnnotation: AnnotationSchema.optional().describe('The full annotation'),
  })
  .describe('The response from the annotation process endpoint');
export type AnnotationProcessResponse = z.infer<
  typeof AnnotationProcessResponseSchema
>;

/* =============================
 * Annotation - Search
 * ============================= */
export const AnnotationSearchRequestQuerySchema = z.object({
  entryId: ManifestEntryIdSchema.optional().describe('The manifest entry ID'),
  file: z.string().optional(),
  query: z.string().optional(),
  status: z.string().optional(),
  limit: z.string().optional(),
});
export type AnnotationSearchRequestQuery = z.infer<
  typeof AnnotationSearchRequestQuerySchema
>;

export const AnnotationSearchResponseSchema = z.object({
  annotations: z.array(AnnotationSummarySchema),
  total: z.number(),
});
export type AnnotationSearchResponse = z.infer<
  typeof AnnotationSearchResponseSchema
>;

/* =============================
 * Annotation - Update Response
 * ============================= */
export const AnnotationUpdateResponseRequestParamsSchema = z.object({
  id: AnnotationIdSchema.describe(
    'The annotation ID whose response is being updated',
  ),
});
export const AnnotationUpdateResponseRequestBodySchema = z.object({
  message: z
    .string()
    .optional()
    .describe("Agent's explanation of what was done"),
});
export type AnnotationUpdateResponseRequestParams = z.infer<
  typeof AnnotationUpdateResponseRequestParamsSchema
>;
export type AnnotationUpdateResponseRequestBody = z.infer<
  typeof AnnotationUpdateResponseRequestBodySchema
>;

export const AnnotationUpdateResponseResponseSchema = z.object({
  success: z
    .boolean()
    .describe('Whether the response was updated successfully'),
  annotation: AnnotationSchema.describe('The updated annotation'),
});

export type AnnotationUpdateResponseResponse = z.infer<
  typeof AnnotationUpdateResponseResponseSchema
>;

/* =============================
 * Annotation - Verify After Edit (RFC 0002)
 * ============================= */
export const AnnotationVerifyRequestParamsSchema = z.object({
  id: AnnotationIdSchema.describe('The annotation ID to verify'),
});
export type AnnotationVerifyRequestParams = z.infer<
  typeof AnnotationVerifyRequestParamsSchema
>;

export const AnnotationVerifyRequestBodySchema = z.object({
  postEdit: z
    .object({
      componentStyles: ComponentStylesSchema.optional().describe(
        'Post-edit ComponentStyles snapshot from the runtime StyleCapturer',
      ),
      boundingRect: BoundingRectSchema.optional().describe(
        'Post-edit boundingRect from the picked element',
      ),
      screenshotRef: z
        .string()
        .optional()
        .describe(
          'Opaque relay-blob reference for the post-edit screenshot (NEVER raw bytes)',
        ),
    })
    .describe(
      "Post-edit capture as observed by the overlay. The relay grades this against the annotation's pre-edit baseline.",
    ),
});
export type AnnotationVerifyRequestBody = z.infer<
  typeof AnnotationVerifyRequestBodySchema
>;

export const AnnotationVerifyResponseSchema = z.object({
  success: z.boolean().describe('Whether the verify result was recorded'),
  result: VerifyResultSchema.describe(
    'Structured verify verdict and per-axis deltas',
  ),
  annotationId: AnnotationIdSchema.describe(
    'Annotation ID that was verified (echoed for client convenience)',
  ),
});
export type AnnotationVerifyResponse = z.infer<
  typeof AnnotationVerifyResponseSchema
>;

/* =============================
 * Annotation - Update Status
 * ============================= */
export const AnnotationUpdateStatusRequestParamsSchema = z.object({
  id: AnnotationIdSchema.describe(
    'The annotation ID whose status is being updated',
  ),
});
export const AnnotationUpdateStatusRequestBodySchema = z.object({
  status: AnnotationStatusSchema.describe('The new status for the annotation'),
  errorDetails: z.string().optional(),
});
export type AnnotationUpdateStatusRequestParams = z.infer<
  typeof AnnotationUpdateStatusRequestParamsSchema
>;
export type AnnotationUpdateStatusRequestBody = z.infer<
  typeof AnnotationUpdateStatusRequestBodySchema
>;

export const AnnotationUpdateStatusResponseSchema = z.object({
  annotation: AnnotationSchema.describe('The annotation that was updated'),
});
export type AnnotationUpdateStatusResponse = z.infer<
  typeof AnnotationUpdateStatusResponseSchema
>;

/* =============================
 * Annotation - Patch (partial update)
 * ============================= */
export const AnnotationPatchRequestParamsSchema = z.object({
  id: AnnotationIdSchema.describe('The annotation ID to patch'),
});
export type AnnotationPatchRequestParams = z.infer<
  typeof AnnotationPatchRequestParamsSchema
>;

export const AnnotationPatchRequestBodySchema = z.object({
  context: AnnotationContextSchema.partial()
    .optional()
    .describe(
      'Partial context fields to merge (e.g. userMessage, manifestSnapshot, runtimeContext)',
    ),
});
export type AnnotationPatchRequestBody = z.infer<
  typeof AnnotationPatchRequestBodySchema
>;

export const AnnotationPatchResponseSchema = z.object({
  annotation: AnnotationSchema.describe('The updated annotation'),
});
export type AnnotationPatchResponse = z.infer<
  typeof AnnotationPatchResponseSchema
>;

/* =============================
 * Manifest - Batch Resolve
 * ============================= */
export const ManifestBatchResolveRequestBodySchema = z.object({
  entryIds: z.array(ManifestEntryIdSchema).describe('The entry IDs to resolve'),
});
export type ManifestBatchResolveRequestBody = z.infer<
  typeof ManifestBatchResolveRequestBodySchema
>;

export const ManifestBatchResolveResponseSchema = z.object({
  results: z.record(
    ManifestEntryIdSchema,
    z.object({
      success: z.boolean(),
      entry: ManifestEntrySchema.optional(),
      resolveTimeMs: z.number(),
      cacheHit: z.boolean(),
      error: z.string().optional(),
    }),
  ),
  resolveTimeMs: z.number(),
  count: z.number(),
});
export type ManifestBatchResolveResponse = z.infer<
  typeof ManifestBatchResolveResponseSchema
>;

/* =============================
 * Manifest - Query
 * ============================= */
export const ManifestQueryRequestQuerySchema = z.object({
  file: z.string().optional(),
  componentName: z.string().optional(),
  tagName: z.string().optional(),
  limit: z.string().optional(),
});
export type ManifestQueryRequestQuery = z.infer<
  typeof ManifestQueryRequestQuerySchema
>;

export const ManifestQueryResponseSchema = z.object({
  entries: z.array(ManifestEntrySchema),
  total: z.number(),
  hasMore: z.boolean(),
});
export type ManifestQueryResponse = z.infer<typeof ManifestQueryResponseSchema>;

/* =============================
 * Manifest - Resolve
 * ============================= */
export const ManifestResolveRequestQuerySchema = z.object({
  id: ManifestEntryIdSchema.describe('The entry ID to resolve'),
});
export type ManifestResolveRequestQuery = z.infer<
  typeof ManifestResolveRequestQuerySchema
>;

export const ManifestResolveResponseSchema = z.object({
  success: z.boolean(),
  entry: ManifestEntrySchema.optional(),
  resolveTimeMs: z.number(),
  cacheHit: z.boolean(),
  error: z.string().optional(),
});
export type ManifestResolveResponse = z.infer<
  typeof ManifestResolveResponseSchema
>;

/* =============================
 * Manifest - Stats
 * ============================= */
export const ManifestStatsResponseSchema = z.object({
  entryCount: z.number(),
  fileCount: z.number(),
  componentCount: z.number(),
  lastUpdated: z.string().nullable(),
  cacheHitRate: z.number(),
});
export type ManifestStatsResponse = z.infer<typeof ManifestStatsResponseSchema>;

/* =============================
 * Health
 * ============================= */
export const HealthResponseSchema = z.object({
  status: z.enum(['healthy', 'unhealthy']).describe('The health status'),
  pid: z.number().describe('The PID of the relay'),
  nonce: z.string().describe('The nonce of the relay'),
  version: z.string().describe('The version of the relay'),
  workspaceRoot: z.string().describe('The workspace root of the relay'),
  timestamp: z.string().describe('The timestamp of the health check'),
  services: z.object({
    annotations: z.object({
      counts: z.record(AnnotationStatusSchema, z.number()),
    }),
    manifest: z.object({
      entryCount: z.number(),
      fileCount: z.number(),
      componentCount: z.number(),
      lastUpdated: z.string().nullable(),
      cacheHitRate: z.number(),
    }),
  }),
});

export type HealthResponse = z.infer<typeof HealthResponseSchema>;

/* =============================
 * Shutdown
 * ============================= */
export const ShutdownRequestBodySchema = z.object({
  nonce: z.string().describe('The nonce of the relay'),
});
export type ShutdownRequestBody = z.infer<typeof ShutdownRequestBodySchema>;

export const ShutdownResponseSchema = z.object({
  success: z.boolean().describe('Whether the shutdown was successful'),
});
export type ShutdownResponse = z.infer<typeof ShutdownResponseSchema>;

/* =============================
 * Status
 * ============================= */
export const StatusResponseSchema = z.object({
  relay: z.object({
    version: z.string(),
    uptime: z.number(),
    port: z.number(),
  }),
  manifest: z.object({
    entryCount: z.number(),
    fileCount: z.number(),
    componentCount: z.number(),
    lastUpdated: z.string().nullable(),
    cacheHitRate: z.number(),
  }),
  annotations: z.record(AnnotationStatusSchema, z.number()),
});

export type StatusResponse = z.infer<typeof StatusResponseSchema>;

/* =============================
 * WS - Context Request/Response
 * ============================= */
export const WSContextRequestSchema = z.object({
  requestId: z.string(),
  entryId: ManifestEntryIdSchema,
});
export type WSContextRequest = z.infer<typeof WSContextRequestSchema>;

export const WSContextResponseSchema = z.object({
  requestId: z.string(),
  success: z.boolean(),
  rendered: z.boolean().optional(),
  context: RuntimeContextSchema.optional(),
  elementInfo: z
    .object({
      tagName: z.string().optional(),
      attributes: z.record(z.string(), z.string()).optional(),
      innerText: z.string().optional(),
    })
    .optional(),
  error: z.string().optional(),
});
export type WSContextResponse = z.infer<typeof WSContextResponseSchema>;

/* =============================
 * Query By Source
 * ============================= */
export const QueryBySourceRequestSchema = z.object({
  file: z.string().describe('Absolute file path as stored in the manifest'),
  line: z.number().int().positive().describe('Line number (1-indexed)'),
  column: z
    .number()
    .int()
    .nonnegative()
    .optional()
    .describe('Column number (0-indexed)'),
  tolerance: z
    .number()
    .int()
    .nonnegative()
    .optional()
    .default(0)
    .describe('Maximum line distance to consider'),
  includeRuntime: z
    .boolean()
    .optional()
    .default(true)
    .describe('Whether to query live runtime context from the browser'),
});
export type QueryBySourceRequest = z.infer<typeof QueryBySourceRequestSchema>;

export const QueryBySourceResponseSchema = z.object({
  found: z.boolean().describe('Whether a manifest entry was found'),
  entryId: z.string().optional().describe('The matching manifest entry ID'),
  sourceLocation: z
    .object({
      file: z.string(),
      start: SourcePositionSchema,
      end: SourcePositionSchema.optional(),
      tagName: z.string().optional(),
      componentName: z.string().optional(),
    })
    .optional()
    .describe('Source location from the manifest'),
  runtime: z
    .object({
      rendered: z.boolean(),
      componentProps: z.unknown().optional(),
      componentState: z.unknown().optional(),
      componentStyles: z
        .object({
          computed: z.record(z.string(), z.string()).optional(),
          customProperties: z.record(z.string(), z.string()).optional(),
        })
        .optional()
        .describe(
          'Runtime computed styles + resolved CSS custom properties (RFC 0001). ' +
            'Populated when the runtime is configured with `captureStyles: true`. ' +
            'Use this to verify what the user actually sees before editing styling source.',
        ),
      domSnapshot: z
        .object({
          tagName: z.string().optional(),
          attributes: z.record(z.string(), z.string()).optional(),
          innerText: z.string().optional(),
        })
        .optional(),
    })
    .optional()
    .describe('Live runtime context from the browser'),
  browserConnected: z
    .boolean()
    .optional()
    .describe('Whether a browser client is connected via WebSocket'),
  error: z.string().optional().describe('Error message if something failed'),
});
export type QueryBySourceResponse = z.infer<typeof QueryBySourceResponseSchema>;

/* =============================
 * WS - Events
 * ============================= */
export const WSMessageSchema = z.object({
  event: z.string(),
  data: z.unknown(),
});

export type WSMessage = z.infer<typeof WSMessageSchema>;
