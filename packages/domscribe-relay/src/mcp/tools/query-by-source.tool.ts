import { z } from 'zod';
import { SourcePositionSchema } from '@domscribe/core';
import {
  McpToolDefinition,
  McpToolOutputSchema,
  MCP_TOOLS,
  mcpErrorResult,
} from './tool.defs.js';
import { RelayHttpClient } from '../../client/relay-http-client.js';

const QueryBySourceToolInputSchema = z.object({
  file: z
    .string()
    .describe(
      'Absolute file path as stored in the manifest (e.g. "/home/user/project/src/components/Button.tsx"). ' +
        'Use domscribe.manifest.query to discover the exact paths the manifest uses.',
    ),
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
    .describe('Maximum line distance to consider (default: 0)'),
  includeRuntime: z
    .boolean()
    .optional()
    .describe(
      'Whether to query live runtime context from the browser (default: true)',
    ),
});

type QueryBySourceToolInput = z.infer<typeof QueryBySourceToolInputSchema>;

const QueryBySourceToolOutputSchema = McpToolOutputSchema.extend({
  found: z.boolean(),
  entryId: z.string().optional(),
  sourceLocation: z
    .object({
      file: z.string(),
      start: SourcePositionSchema,
      end: SourcePositionSchema.optional(),
      tagName: z.string().optional(),
      componentName: z.string().optional(),
    })
    .optional(),
  runtime: z
    .object({
      rendered: z.boolean(),
      componentProps: z.unknown().optional(),
      componentState: z.unknown().optional(),
      domSnapshot: z
        .object({
          tagName: z.string().optional(),
          attributes: z.record(z.string(), z.string()).optional(),
          innerText: z.string().optional(),
        })
        .optional(),
    })
    .optional(),
  browserConnected: z.boolean().optional(),
});

type QueryBySourceToolOutput = z.infer<typeof QueryBySourceToolOutputSchema>;

export class QueryBySourceTool implements McpToolDefinition<
  typeof QueryBySourceToolInputSchema,
  typeof QueryBySourceToolOutputSchema
> {
  name = MCP_TOOLS.QUERY_BY_SOURCE;
  description =
    "Query a live dev server by source file and position to get the element's " +
    'manifest entry and live runtime context (props, state, DOM info). ' +
    'Use when you have a source location and want to understand what the element ' +
    'looks like at runtime. Returns manifest data even if the browser is not connected.';
  inputSchema = QueryBySourceToolInputSchema;
  outputSchema = QueryBySourceToolOutputSchema;

  constructor(private readonly relayHttpClient: RelayHttpClient) {}

  async toolCallback(input: QueryBySourceToolInput) {
    try {
      const result = await this.relayHttpClient.queryBySource(input);

      const output: QueryBySourceToolOutput = {
        found: result.found,
        entryId: result.entryId,
        sourceLocation: result.sourceLocation,
        runtime: result.runtime,
        browserConnected: result.browserConnected,
        error: result.error,
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
