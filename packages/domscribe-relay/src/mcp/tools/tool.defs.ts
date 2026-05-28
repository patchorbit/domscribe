/**
 * MCP tool definitions, base class, and shared helpers
 * @module @domscribe/relay/mcp/tools/tool-defs
 */
import { z } from 'zod';
import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { DomscribeError, DomscribeErrorCode } from '@domscribe/core';

/**
 * Grammar every MCP tool name must satisfy.
 *
 * Per the MCP specification's tool-name field and the strictest known client
 * (Windsurf / Cascade — see issue #18), tool names must match
 * `^[a-zA-Z0-9_-]{1,64}$`. Dots are NOT permitted, which is why the legacy
 * `domscribe.<segment>` form (advertised pre-RCP-v1) is now an alias only.
 */
export const MCP_TOOL_NAME_REGEX = /^[a-zA-Z0-9_-]{1,64}$/;

/**
 * Canonical MCP tool names, in `domscribe_<verb>_<object>` underscore form.
 *
 * Underscores were chosen over hyphens to match the dominant convention in
 * the MCP server ecosystem (e.g. `read_file`, `list_directory`).
 */
export const MCP_TOOLS = {
  // Resolve tools
  RESOLVE: 'domscribe_resolve',
  RESOLVE_BATCH: 'domscribe_resolve_batch',
  // Manifest tools
  MANIFEST_STATS: 'domscribe_manifest_stats',
  MANIFEST_QUERY: 'domscribe_manifest_query',
  // Annotation tools
  ANNOTATION_LIST: 'domscribe_annotation_list',
  ANNOTATION_GET: 'domscribe_annotation_get',
  ANNOTATION_UPDATE_STATUS: 'domscribe_annotation_update_status',
  ANNOTATION_PROCESS: 'domscribe_annotation_process',
  ANNOTATION_RESPOND: 'domscribe_annotation_respond',
  ANNOTATION_SEARCH: 'domscribe_annotation_search',
  // Query tools
  QUERY_BY_SOURCE: 'domscribe_query_by_source',
  // System tools
  STATUS: 'domscribe_status',
} as const;

export type McpToolName = (typeof MCP_TOOLS)[keyof typeof MCP_TOOLS];

/**
 * Legacy dotted tool names → kept resolvable for backwards compatibility.
 *
 * The dotted form (e.g. `domscribe.status`) was advertised before RCP v1
 * but fails Windsurf's stricter regex. Clients with `.mcp.json` configs
 * pinned to the old names continue to resolve here; calls emit a
 * deprecation warning on stderr.
 *
 * Removal is scheduled for the first major version after RCP v1.0.0.
 */
export const LEGACY_TOOL_ALIASES: Readonly<Record<McpToolName, string>> = {
  [MCP_TOOLS.RESOLVE]: 'domscribe.resolve',
  [MCP_TOOLS.RESOLVE_BATCH]: 'domscribe.resolve.batch',
  [MCP_TOOLS.MANIFEST_STATS]: 'domscribe.manifest.stats',
  [MCP_TOOLS.MANIFEST_QUERY]: 'domscribe.manifest.query',
  [MCP_TOOLS.ANNOTATION_LIST]: 'domscribe.annotation.list',
  [MCP_TOOLS.ANNOTATION_GET]: 'domscribe.annotation.get',
  [MCP_TOOLS.ANNOTATION_UPDATE_STATUS]: 'domscribe.annotation.updateStatus',
  [MCP_TOOLS.ANNOTATION_PROCESS]: 'domscribe.annotation.process',
  [MCP_TOOLS.ANNOTATION_RESPOND]: 'domscribe.annotation.respond',
  [MCP_TOOLS.ANNOTATION_SEARCH]: 'domscribe.annotation.search',
  [MCP_TOOLS.QUERY_BY_SOURCE]: 'domscribe.query.bySource',
  [MCP_TOOLS.STATUS]: 'domscribe.status',
};

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
