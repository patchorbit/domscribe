import {
  McpPromptDefinition,
  McpPromptMessage,
  MCP_PROMPTS,
} from './prompt.defs.js';

const CheckStatusArgsSchema = {};

export class CheckStatusPrompt
  implements McpPromptDefinition<typeof CheckStatusArgsSchema>
{
  name = MCP_PROMPTS.CHECK_STATUS;
  description =
    'Check Domscribe system status. Shows relay health, manifest stats, and annotation queue counts.';
  argsSchema = CheckStatusArgsSchema;

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  promptCallback(_args: Record<string, string>): McpPromptMessage[] {
    return [
      {
        role: 'user',
        content: {
          type: 'text',
          text: `Check the Domscribe system status.

Use the domscribe.status tool to get:
- Relay server health (version, uptime, port)
- Manifest statistics (entry count, file count, component count)
- Annotation queue counts by status

Report any issues and summarize the system state.`,
        },
      },
    ];
  }
}
