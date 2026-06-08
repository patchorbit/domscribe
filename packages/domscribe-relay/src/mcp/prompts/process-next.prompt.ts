import {
  McpPromptDefinition,
  McpPromptMessage,
  MCP_PROMPTS,
} from './prompt.defs.js';

const ProcessNextArgsSchema = {};

export class ProcessNextPrompt implements McpPromptDefinition<
  typeof ProcessNextArgsSchema
> {
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

Use the domscribe.annotation.process tool to claim the next annotation.

If an annotation is found:
1. Read the userIntent and sourceLocation
2. Navigate to the source file and understand the context
3. Implement the requested change
4. Use domscribe.annotation.respond to store your response
5. RECOMMENDED: call domscribe.verify.afterEdit with your post-edit ComponentStyles / boundingRect (and a screenshotRef when the overlay supplied one). The tool grades your edit against the pre-edit baseline and returns a verdict (match | partial | no_change | regression) plus per-axis deltas. If the verdict is no_change or regression, reconcile the deltas and retry your edit before moving on.
6. Use domscribe.annotation.updateStatus to mark the annotation 'processed'. (NOTE: updateStatus does NOT require verify — it is a soft-recommended diagnostic, not a lifecycle gate.)

If no annotation is found, inform the user that the queue is empty.`,
        },
      },
    ];
  }
}
