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

const AnnotationsSearchToolInputSchema = z.object({
  entryId: z
    .string()
    .optional()
    .describe('Filter by manifest entry ID (data-ds value)'),
  file: z
    .string()
    .optional()
    .describe('Filter by source file path (substring match)'),
  componentName: z.string().optional().describe('Filter by component name'),
  query: z.string().optional().describe('Full-text search in user message'),
  status: z
    .union([AnnotationStatusSchema, z.array(AnnotationStatusSchema)])
    .optional()
    .describe('Filter by annotation status'),
  limit: z
    .number()
    .optional()
    .describe('Maximum number of annotations to return (default: 20)'),
});

type AnnotationsSearchToolInput = z.infer<
  typeof AnnotationsSearchToolInputSchema
>;

const AnnotationsSearchToolOutputSchema = McpToolOutputSchema.extend({
  annotations: z
    .array(AnnotationSummarySchema)
    .describe('Matching annotations'),
  total: z.number().describe('Total number of matching annotations'),
  hasMore: z
    .boolean()
    .describe('Whether there are more results beyond the limit'),
});

type AnnotationsSearchToolOutput = z.infer<
  typeof AnnotationsSearchToolOutputSchema
>;

export class AnnotationsSearchTool implements McpToolDefinition<
  typeof AnnotationsSearchToolInputSchema,
  typeof AnnotationsSearchToolOutputSchema
> {
  name = MCP_TOOLS.ANNOTATION_SEARCH;
  description =
    'Search annotations by manifest entry ID, file, component, or user message text. ' +
    'Use to find related annotations ("other requests for this component"), ' +
    'check history ("what did the user ask about Header before"), ' +
    'or correlate work across elements.';
  inputSchema = AnnotationsSearchToolInputSchema;
  outputSchema = AnnotationsSearchToolOutputSchema;

  constructor(private readonly relayHttpClient: RelayHttpClient) {}

  async toolCallback(input: AnnotationsSearchToolInput) {
    try {
      // Normalize status to comma-separated string for the client
      const statusStr = input.status
        ? Array.isArray(input.status)
          ? input.status.join(',')
          : input.status
        : undefined;

      const response = await this.relayHttpClient.searchAnnotations({
        query: input.query,
        entryId: input.entryId,
        file: input.file,
        status: statusStr,
        limit: input.limit,
      });

      // Compute hasMore since the server response doesn't include it
      const hasMore = response.total > response.annotations.length;

      const output: AnnotationsSearchToolOutput = {
        annotations: response.annotations,
        total: response.total,
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
