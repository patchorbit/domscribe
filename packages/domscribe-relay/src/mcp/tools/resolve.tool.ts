import { z } from 'zod';
import {
  McpToolDefinition,
  McpToolOutputSchema,
  MCP_TOOLS,
  mcpErrorResult,
} from './tool.defs.js';
import { SourcePositionSchema } from '@domscribe/core';
import { RelayHttpClient } from '../../client/relay-http-client.js';

const ResolveToolInputSchema = z.object({
  entryId: z
    .string()
    .describe('The manifest entry ID (data-ds attribute value) to resolve'),
});

type ResolveToolInput = z.infer<typeof ResolveToolInputSchema>;

const ResolveToolOutputSchema = McpToolOutputSchema.extend({
  found: z.boolean(),
  file: z.string().optional(),
  start: SourcePositionSchema.optional(),
  end: SourcePositionSchema.optional(),
  componentName: z.string().optional(),
  tagName: z.string().optional(),
});

type ResolveToolOutput = z.infer<typeof ResolveToolOutputSchema>;

export class ResolveTool implements McpToolDefinition<
  typeof ResolveToolInputSchema,
  typeof ResolveToolOutputSchema
> {
  name = MCP_TOOLS.RESOLVE;
  description =
    'Resolve a Domscribe element ID (data-ds attribute) to its source code location. ' +
    'Returns file path, line/column positions, component name, and tag name. ' +
    'Use when you have a data-ds ID and need to find where the element is defined in source code.';
  inputSchema = ResolveToolInputSchema;
  outputSchema = ResolveToolOutputSchema;

  constructor(private readonly relayHttpClient: RelayHttpClient) {}

  async toolCallback(input: ResolveToolInput) {
    try {
      const result = await this.relayHttpClient.resolveManifestEntry(
        input.entryId,
      );

      const output: ResolveToolOutput = {
        found: result.success,
        file: result.entry?.file,
        start: result.entry?.start,
        end: result.entry?.end,
        componentName: result.entry?.componentName,
        tagName: result.entry?.tagName,
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
