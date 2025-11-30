import { z } from 'zod';
import {
  McpToolDefinition,
  McpToolOutputSchema,
  MCP_TOOLS,
  mcpErrorResult,
} from './tool.defs.js';
import { RelayHttpClient } from '../../client/relay-http-client.js';

const StatusToolInputSchema = z.object({});

type StatusToolInput = z.infer<typeof StatusToolInputSchema>;

const RelayStatusSchema = z.object({
  version: z.string().describe('Domscribe version'),
  uptime: z.number().describe('Server uptime in seconds'),
  port: z.number().describe('Server port'),
});

const ManifestStatusSchema = z.object({
  entryCount: z.number().describe('Number of manifest entries'),
  fileCount: z.number().describe('Number of files indexed'),
  componentCount: z.number().describe('Number of unique components'),
  lastUpdated: z.string().nullable().describe('Timestamp of last update'),
  cacheHitRate: z.number().describe('Cache hit rate for resolves (0-1)'),
});

const AnnotationQueueStatusSchema = z.object({
  queued: z.number().describe('Number of queued annotations'),
  processing: z.number().describe('Number of annotations being processed'),
  processed: z.number().describe('Number of processed annotations'),
  failed: z.number().describe('Number of failed annotations'),
  archived: z.number().describe('Number of archived annotations'),
});

const StatusToolOutputSchema = McpToolOutputSchema.extend({
  relay: RelayStatusSchema.describe('Relay server status'),
  manifest: ManifestStatusSchema.describe('Manifest status'),
  annotations: AnnotationQueueStatusSchema.describe('Annotation queue status'),
});

type StatusToolOutput = z.infer<typeof StatusToolOutputSchema>;

export class StatusTool
  implements
    McpToolDefinition<
      typeof StatusToolInputSchema,
      typeof StatusToolOutputSchema
    >
{
  name = MCP_TOOLS.STATUS;
  description =
    'Get the health status of Domscribe including relay server status, ' +
    'manifest loading state, and annotation queue counts. ' +
    'Use to diagnose issues, verify setup, or check if Domscribe is working.';
  inputSchema = StatusToolInputSchema;
  outputSchema = StatusToolOutputSchema;

  constructor(private readonly relayHttpClient: RelayHttpClient) {}

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async toolCallback(_input: StatusToolInput) {
    try {
      const response = await this.relayHttpClient.getStatus();

      const output: StatusToolOutput = {
        relay: {
          version: response.relay.version,
          uptime: response.relay.uptime,
          port: response.relay.port,
        },
        manifest: {
          entryCount: response.manifest.entryCount,
          fileCount: response.manifest.fileCount,
          componentCount: response.manifest.componentCount,
          lastUpdated: response.manifest.lastUpdated,
          cacheHitRate: response.manifest.cacheHitRate,
        },
        annotations: {
          queued: response.annotations.queued ?? 0,
          processing: response.annotations.processing ?? 0,
          processed: response.annotations.processed ?? 0,
          failed: response.annotations.failed ?? 0,
          archived: response.annotations.archived ?? 0,
        },
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
