import { z } from 'zod';
import {
  McpToolDefinition,
  McpToolOutputSchema,
  MCP_TOOLS,
  mcpErrorResult,
} from './tool.defs.js';
import { SourcePositionSchema } from '@domscribe/core';
import { RelayHttpClient } from '../../client/relay-http-client.js';

const ResolveBatchToolInputSchema = z.object({
  elementIds: z
    .array(z.string())
    .describe('Array of element IDs (data-ds values) to resolve'),
});

type ResolveBatchToolInput = z.infer<typeof ResolveBatchToolInputSchema>;

const ResolveResultSchema = z.object({
  found: z.boolean(),
  file: z.string().optional(),
  start: SourcePositionSchema.optional(),
  end: SourcePositionSchema.optional(),
  componentName: z.string().optional(),
  tagName: z.string().optional(),
  error: z.string().optional(),
});

const ResolveBatchToolOutputSchema = McpToolOutputSchema.extend({
  results: z.record(z.string(), ResolveResultSchema),
  resolveTimeMs: z.number(),
  count: z.number(),
});

type ResolveBatchToolOutput = z.infer<typeof ResolveBatchToolOutputSchema>;

export class ResolveBatchTool implements McpToolDefinition<
  typeof ResolveBatchToolInputSchema,
  typeof ResolveBatchToolOutputSchema
> {
  name = MCP_TOOLS.RESOLVE_BATCH;
  description =
    'Resolve multiple element IDs to source locations in a single call. ' +
    'More efficient than multiple resolve calls when working with several elements. ' +
    'Use when you need to look up multiple data-ds IDs at once.';
  inputSchema = ResolveBatchToolInputSchema;
  outputSchema = ResolveBatchToolOutputSchema;

  constructor(private readonly relayHttpClient: RelayHttpClient) {}

  async toolCallback(input: ResolveBatchToolInput) {
    try {
      const response = await this.relayHttpClient.batchResolveManifestEntries(
        input.elementIds,
      );

      // Map each ResolveResult to the tool output format
      const mappedResults: Record<
        string,
        z.infer<typeof ResolveResultSchema>
      > = {};
      for (const [entryId, resolveResult] of Object.entries(response.results)) {
        mappedResults[entryId] = {
          found: resolveResult.success,
          file: resolveResult.entry?.file,
          start: resolveResult.entry?.start,
          end: resolveResult.entry?.end,
          componentName: resolveResult.entry?.componentName,
          tagName: resolveResult.entry?.tagName,
          error: resolveResult.error,
        };
      }

      const output: ResolveBatchToolOutput = {
        results: mappedResults,
        resolveTimeMs: response.resolveTimeMs,
        count: response.count,
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
