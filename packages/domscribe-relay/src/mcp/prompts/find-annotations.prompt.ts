import { z } from 'zod';
import {
  McpPromptDefinition,
  McpPromptMessage,
  MCP_PROMPTS,
} from './prompt.defs.js';

const FindAnnotationsArgsSchema = {
  query: z.string().optional().describe('Search query (matches user messages)'),
  file: z.string().optional().describe('Filter by source file path'),
  entryId: z
    .string()
    .optional()
    .describe('Filter by manifest entry ID (data-ds)'),
};

export class FindAnnotationsPrompt implements McpPromptDefinition<
  typeof FindAnnotationsArgsSchema
> {
  name = MCP_PROMPTS.FIND_ANNOTATIONS;
  description =
    'Search for annotations by manifest entry, file, or user message. Use to find related work items.';
  argsSchema = FindAnnotationsArgsSchema;

  promptCallback(args: Record<string, string>): McpPromptMessage[] {
    return [
      {
        role: 'user',
        content: {
          type: 'text',
          text: `Search for Domscribe annotations.

Use the domscribe.annotations.search tool with these filters:
${args.query ? `- query: "${args.query}"` : ''}
${args.file ? `- file: "${args.file}"` : ''}
${args.entryId ? `- entryId: "${args.entryId}"` : ''}
${!args.query && !args.file && !args.entryId ? '- No filters (list recent annotations)' : ''}

Show matching annotations with their status, timestamp, and user message.`,
        },
      },
    ];
  }
}
