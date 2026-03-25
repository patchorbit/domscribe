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
  hint: z
    .string()
    .optional()
    .describe('Actionable guidance based on the result'),
});

type QueryBySourceToolOutput = z.infer<typeof QueryBySourceToolOutputSchema>;

export class QueryBySourceTool implements McpToolDefinition<
  typeof QueryBySourceToolInputSchema,
  typeof QueryBySourceToolOutputSchema
> {
  name = MCP_TOOLS.QUERY_BY_SOURCE;
  description =
    'Get live DOM snapshot, component props, and state for a source location (file + line). ' +
    'Call this when fixing visual/styling bugs, debugging conditional rendering, tracing prop values, or verifying UI changes after editing. ' +
    "Skip for pure logic changes, new files, refactoring, or type fixes — runtime context won't help there. " +
    'If browserConnected is false, ask the user to open the page in their browser and retry. ' +
    'Returns manifest data even when the browser is not connected.';
  inputSchema = QueryBySourceToolInputSchema;
  outputSchema = QueryBySourceToolOutputSchema;

  constructor(private readonly relayHttpClient: RelayHttpClient) {}

  private buildHint(result: {
    found: boolean;
    browserConnected?: boolean;
    runtime?: { rendered?: boolean };
  }): string | undefined {
    if (!result.found) {
      return (
        'No manifest entry found for this source location. ' +
        'Try domscribe.manifest.query with the file path to discover which lines have entries, ' +
        'or use tolerance > 0 to widen the search.'
      );
    }
    if (result.browserConnected === false) {
      return (
        'No browser is connected — runtime data is unavailable. ' +
        'Ask the user to open the page containing this component in their browser, then retry to get live props, state, and DOM snapshot.'
      );
    }
    if (result.runtime && !result.runtime.rendered) {
      return (
        'The element exists in the manifest but is not currently rendered in the browser. ' +
        'Ask the user to navigate to a page that renders this component, then retry.'
      );
    }
    return undefined;
  }

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
        hint: this.buildHint(result),
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
