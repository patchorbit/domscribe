import { z } from 'zod';
import {
  McpToolDefinition,
  McpToolOutputSchema,
  MCP_TOOLS,
  mcpErrorResult,
} from './tool.defs.js';
import {
  AnnotationStatusSchema,
  AnnotationSummarySchema,
} from '@domscribe/core';
import { RelayHttpClient } from '../../client/relay-http-client.js';

const AnnotationsListToolInputSchema = z.object({
  status: z
    .array(AnnotationStatusSchema)
    .optional()
    .describe('Filter by annotation statuses'),
  limit: z
    .number()
    .optional()
    .describe('Maximum number of annotations to return (default: 20)'),
  offset: z.number().optional().describe('Offset for pagination (default: 0)'),
});

type AnnotationsListToolInput = z.infer<typeof AnnotationsListToolInputSchema>;

const AnnotationsListToolOutputSchema = McpToolOutputSchema.extend({
  annotations: z
    .array(AnnotationSummarySchema)
    .describe('List of annotation summaries'),
  total: z.number().describe('Total count (before pagination)'),
  hasMore: z.boolean().describe('Whether there are more results'),
});

type AnnotationsListToolOutput = z.infer<
  typeof AnnotationsListToolOutputSchema
>;

export class AnnotationsListTool
  implements
    McpToolDefinition<
      typeof AnnotationsListToolInputSchema,
      typeof AnnotationsListToolOutputSchema
    >
{
  name = MCP_TOOLS.ANNOTATION_LIST;
  description =
    'List Domscribe annotations with optional status filtering and pagination. ' +
    'Annotations are user-captured UI interactions awaiting or completed by agent processing. ' +
    'Use to see pending work (status: queued), in-progress items, or review completed/failed tasks.';
  inputSchema = AnnotationsListToolInputSchema;
  outputSchema = AnnotationsListToolOutputSchema;

  constructor(private readonly relayHttpClient: RelayHttpClient) {}

  async toolCallback(input: AnnotationsListToolInput) {
    try {
      const { annotations, total, hasMore } =
        await this.relayHttpClient.listAnnotations({
          statuses: input.status,
          limit: input.limit,
          offset: input.offset,
        });

      const summaries = annotations.map((annotation) => ({
        id: annotation.metadata.id,
        status: annotation.metadata.status,
        timestamp: annotation.metadata.timestamp,
        entryId: annotation.context.manifestSnapshot?.[0]?.id,
        componentName: annotation.context.manifestSnapshot?.[0]?.componentName,
        userMessageExcerpt: annotation.context.userMessage
          ? annotation.context.userMessage.slice(0, 100)
          : undefined,
      }));

      const output: AnnotationsListToolOutput = {
        annotations: summaries,
        total,
        hasMore,
      };

      return {
        structuredContent: output,
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(output, null, 2),
          },
        ],
      };
    } catch (error: unknown) {
      return mcpErrorResult(error);
    }
  }
}
