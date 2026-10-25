import { TargetQuerySchema, type TargetQuery } from '@domscribe/core';
import { TargetsQueryResponseSchema } from '../../schema.js';
import { RelayHttpClient } from '../../client/relay-http-client.js';
import {
  MCP_TOOLS,
  mcpErrorResult,
  type McpToolDefinition,
} from './tool.defs.js';

export class TargetsQueryTool implements McpToolDefinition<
  typeof TargetQuerySchema,
  typeof TargetsQueryResponseSchema
> {
  name = MCP_TOOLS.TARGETS_QUERY;
  description =
    'List live rendered instances (mode: list, optional entryId), inspect an exact instanceId, or resolve a captured portable locator in the current browser session. Source IDs can have multiple instances. Only resolved returns context. Missing, stale, ambiguous, not_ready, unsupported and ambiguous_browser must stop selection; never guess a positional target. Use the resolved strict selector with browser tools for real actions. Instance handles are transient; persist locator for replay. Resolve entryId with domscribe.resolve for source location.';
  inputSchema = TargetQuerySchema;
  outputSchema = TargetsQueryResponseSchema;
  constructor(private readonly client: RelayHttpClient) {}
  async toolCallback(input: TargetQuery) {
    try {
      const result = await this.client.queryTargets(input);
      return {
        structuredContent: result,
        content: [{ type: 'text' as const, text: JSON.stringify(result) }],
      };
    } catch (error) {
      return mcpErrorResult(error);
    }
  }
}
