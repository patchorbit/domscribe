/**
 * MCP status tool for dormant mode — when no workspace is detected.
 * Returns diagnostic info without requiring a relay connection.
 * @module @domscribe/relay/mcp/tools/dormant-status-tool
 */
import { z } from 'zod';
import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import {
  McpToolDefinition,
  McpToolOutputSchema,
  MCP_TOOLS,
} from './tool.defs.js';

const DormantStatusToolInputSchema = z.object({});

type DormantStatusToolInput = z.infer<typeof DormantStatusToolInputSchema>;

const DormantStatusToolOutputSchema = McpToolOutputSchema.extend({
  active: z
    .literal(false)
    .describe('Whether Domscribe is active in this workspace'),
  cwd: z
    .string()
    .describe('The working directory where the MCP server was started'),
  guidance: z.string().describe('Explanation of why Domscribe is not active'),
  nextSteps: z
    .string()
    .describe('Actionable steps for the agent to set up Domscribe'),
});

type DormantStatusToolOutput = z.infer<typeof DormantStatusToolOutputSchema>;

export class DormantStatusTool implements McpToolDefinition<
  typeof DormantStatusToolInputSchema,
  typeof DormantStatusToolOutputSchema
> {
  name = MCP_TOOLS.STATUS;
  description =
    'Get Domscribe workspace status. ' +
    'Domscribe is not active in this workspace — call this tool to find out why and how to set it up.';
  inputSchema = DormantStatusToolInputSchema;
  outputSchema = DormantStatusToolOutputSchema;

  constructor(private readonly cwd: string) {}

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async toolCallback(_input: DormantStatusToolInput): Promise<CallToolResult> {
    const output: DormantStatusToolOutput = {
      active: false,
      cwd: this.cwd,
      guidance:
        'Domscribe is not active in this workspace. ' +
        'No .domscribe/ directory was found at or above the current working directory. ' +
        'The .domscribe/ directory is created automatically when the dev server starts ' +
        'with the Domscribe bundler plugin configured.',
      nextSteps:
        'To set up Domscribe: ' +
        '(1) Read package.json to detect the framework (next/nuxt/react/vue + vite/webpack), ' +
        '(2) detect the package manager from lockfiles (pnpm-lock.yaml/yarn.lock/bun.lock), ' +
        '(3) install the appropriate @domscribe/* package as a dev dependency, ' +
        '(4) edit the bundler config file to add the Domscribe plugin, ' +
        '(5) add .domscribe to .gitignore, ' +
        '(6) ask the user to start their dev server.',
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
  }
}
