/**
 * MCP tool definitions, base class, and shared helpers
 * @module @domscribe/relay/mcp/tools/tool-defs
 */
import { z } from 'zod';
import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { DomscribeError, DomscribeErrorCode } from '@domscribe/core';

/**
 * Available MCP tool names
 */
export const MCP_TOOLS = {
  // Resolve tools
  RESOLVE: 'domscribe.resolve',
  RESOLVE_BATCH: 'domscribe.resolve.batch',
  // Manifest tools
  MANIFEST_STATS: 'domscribe.manifest.stats',
  MANIFEST_QUERY: 'domscribe.manifest.query',
  // Annotation tools
  ANNOTATION_LIST: 'domscribe.annotation.list',
  ANNOTATION_GET: 'domscribe.annotation.get',
  ANNOTATION_UPDATE_STATUS: 'domscribe.annotation.updateStatus',
  ANNOTATION_PROCESS: 'domscribe.annotation.process',
  ANNOTATION_RESPOND: 'domscribe.annotation.respond',
  ANNOTATION_SEARCH: 'domscribe.annotation.search',
  // Query tools
  QUERY_BY_SOURCE: 'domscribe.query.bySource',
  // System tools
  STATUS: 'domscribe.status',
} as const;

export type McpToolName = (typeof MCP_TOOLS)[keyof typeof MCP_TOOLS];

/**
 * MCP tool definition with Zod schema for input validation.
 * Each tool class implements this interface.
 */
export interface McpToolDefinition<
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  TInput extends z.ZodType<any> = z.ZodType<any>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  TOutput extends z.ZodType<any> = z.ZodType<any>,
> {
  name: McpToolName;
  description: string;
  inputSchema: TInput;
  outputSchema: TOutput;
  toolCallback: (args: z.infer<TInput>) => Promise<CallToolResult>;
}

/**
 * Base output schema for all MCP tools.
 * Tool output schemas extend this via `.extend()`.
 */
export const McpToolOutputSchema = z.object({
  error: z
    .string()
    .optional()
    .describe('Error message if the tool call failed'),
});

/**
 * Converts any caught error into a structured MCP error result.
 */
export function mcpErrorResult(error: unknown): CallToolResult {
  const problemDetails =
    error instanceof DomscribeError
      ? error.toProblemDetails()
      : {
          code: DomscribeErrorCode.DS_INTERNAL_ERROR,
          title: error instanceof Error ? error.message : 'Unknown error',
        };

  return {
    isError: true,
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify(problemDetails),
      },
    ],
  };
}
