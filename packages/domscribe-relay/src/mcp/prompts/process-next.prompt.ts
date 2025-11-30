import {
  McpPromptDefinition,
  McpPromptMessage,
  MCP_PROMPTS,
} from './prompt.defs.js';

const ProcessNextArgsSchema = {};

export class ProcessNextPrompt
  implements McpPromptDefinition<typeof ProcessNextArgsSchema>
{
  name = MCP_PROMPTS.PROCESS_NEXT;
  description =
    'Process the next queued UI annotation. Claims and processes one annotation from the queue.';
  argsSchema = ProcessNextArgsSchema;

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  promptCallback(_args: Record<string, string>): McpPromptMessage[] {
    return [
      {
        role: 'user',
        content: {
          type: 'text',
          text: `Process the next queued Domscribe annotation.

Use the domscribe.annotations.process tool to claim the next annotation.

If an annotation is found:
1. Read the userIntent and sourceLocation
2. Navigate to the source file and understand the context
3. Implement the requested change
4. Use domscribe.annotations.respond to store your response
5. Use domscribe.annotations.updateStatus to mark it as 'processed'

If no annotation is found, inform the user that the queue is empty.`,
        },
      },
    ];
  }
}
