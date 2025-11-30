import { z } from 'zod';
import {
  McpToolDefinition,
  McpToolOutputSchema,
  MCP_TOOLS,
  mcpErrorResult,
} from './tool.defs.js';
import { ManifestEntrySchema } from '@domscribe/core';
import { RelayHttpClient } from '../../client/relay-http-client.js';

const ManifestQueryToolInputSchema = z.object({
  file: z
    .string()
    .optional()
    .describe(
      'Filter by exact file path as stored in the manifest (absolute path, e.g. "/home/user/project/src/App.tsx"). ' +
        'This is an exact match, not a substring search.',
    ),
  componentName: z
    .string()
    .optional()
    .describe('Filter by component name (exact match)'),
  tagName: z
    .string()
    .optional()
    .describe('Filter by HTML tag name (exact match)'),
  limit: z
    .number()
    .optional()
    .describe('Maximum number of entries to return (default: 50, max: 200)'),
});

type ManifestQueryToolInput = z.infer<typeof ManifestQueryToolInputSchema>;

const ManifestQueryToolOutputSchema = McpToolOutputSchema.extend({
  entries: z.array(ManifestEntrySchema).describe('Matching manifest entries'),
  total: z.number().describe('Total number of matching entries (before limit)'),
  hasMore: z
    .boolean()
    .describe('Whether there are more results beyond the limit'),
});

type ManifestQueryToolOutput = z.infer<typeof ManifestQueryToolOutputSchema>;

export class ManifestQueryTool implements McpToolDefinition<
  typeof ManifestQueryToolInputSchema,
  typeof ManifestQueryToolOutputSchema
> {
  name = MCP_TOOLS.MANIFEST_QUERY;
  description =
    'Query the Domscribe manifest to find UI elements by file, component, or tag name. ' +
    'Use to explore what elements exist in a file ("what\'s in Button.tsx?"), ' +
    'find all instances of a component ("find all Modal elements"), ' +
    'or list elements by tag ("show all input elements").';
  inputSchema = ManifestQueryToolInputSchema;
  outputSchema = ManifestQueryToolOutputSchema;

  constructor(private readonly relayHttpClient: RelayHttpClient) {}

  async toolCallback(input: ManifestQueryToolInput) {
    try {
      const response = await this.relayHttpClient.queryManifestEntries({
        file: input.file,
        componentName: input.componentName,
        tagName: input.tagName,
        limit: input.limit,
      });

      const output: ManifestQueryToolOutput = {
        entries: response.entries,
        total: response.total,
        hasMore: response.hasMore,
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
