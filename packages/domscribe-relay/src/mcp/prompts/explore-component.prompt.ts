import { z } from 'zod';
import {
  McpPromptDefinition,
  McpPromptMessage,
  MCP_PROMPTS,
} from './prompt.defs.js';

const ExploreComponentArgsSchema = {
  componentName: z.string().describe('Name of the component to explore'),
};

export class ExploreComponentPrompt
  implements McpPromptDefinition<typeof ExploreComponentArgsSchema>
{
  name = MCP_PROMPTS.EXPLORE_COMPONENT;
  description =
    'List all DOM elements in a component. Use to understand component structure before making changes.';
  argsSchema = ExploreComponentArgsSchema;

  promptCallback(args: Record<string, string>): McpPromptMessage[] {
    return [
      {
        role: 'user',
        content: {
          type: 'text',
          text: `Explore the "${args.componentName}" component.

Use the domscribe.manifest.query tool with componentName="${args.componentName}" to list all DOM elements.

For each element, show:
- Tag name
- Element ID (data-ds)
- Source location (file:line)

This helps understand the component structure before making changes.`,
        },
      },
    ];
  }
}
