import { z } from 'zod';
import {
  McpToolDefinition,
  McpToolOutputSchema,
  MCP_TOOLS,
  mcpErrorResult,
} from './tool.defs.js';
import { RelayHttpClient } from '../../client/relay-http-client.js';

const ManifestStatsToolInputSchema = z.object({});

type ManifestStatsToolInput = z.infer<typeof ManifestStatsToolInputSchema>;

const ManifestStatsToolOutputSchema = McpToolOutputSchema.extend({
  entryCount: z.number().describe('Total number of manifest entries'),
  fileCount: z.number().describe('Number of files indexed'),
  componentCount: z.number().describe('Number of unique components'),
  lastUpdated: z
    .string()
    .nullable()
    .describe('Timestamp of last manifest update'),
  cacheHitRate: z.number().describe('Cache hit rate for resolves (0-1)'),
});

type ManifestStatsToolOutput = z.infer<typeof ManifestStatsToolOutputSchema>;

export class ManifestStatsTool
  implements
    McpToolDefinition<
      typeof ManifestStatsToolInputSchema,
      typeof ManifestStatsToolOutputSchema
    >
{
  name = MCP_TOOLS.MANIFEST_STATS;
  description =
    'Get statistics about the Domscribe manifest including entry count, ' +
    'number of files indexed, and cache hit rate. ' +
    'Use for debugging or getting an overview of instrumentation coverage.';
  inputSchema = ManifestStatsToolInputSchema;
  outputSchema = ManifestStatsToolOutputSchema;

  constructor(private readonly relayHttpClient: RelayHttpClient) {}

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async toolCallback(_input: ManifestStatsToolInput) {
    try {
      const stats = await this.relayHttpClient.getManifestStats();

      const output: ManifestStatsToolOutput = {
        entryCount: stats.entryCount,
        fileCount: stats.fileCount,
        componentCount: stats.componentCount,
        lastUpdated: stats.lastUpdated,
        cacheHitRate: stats.cacheHitRate,
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
