/**
 * MCP prompt definitions and base interface
 * @module @domscribe/relay/mcp/prompts/prompt-defs
 */
import { z } from 'zod';

/**
 * Available MCP prompt names
 */
export const MCP_PROMPTS = {
  PROCESS_NEXT: 'process_next',
  CHECK_STATUS: 'check_status',
  EXPLORE_COMPONENT: 'explore_component',
  FIND_ANNOTATIONS: 'find_annotations',
} as const;

export type McpPromptName = (typeof MCP_PROMPTS)[keyof typeof MCP_PROMPTS];

/** Message shape returned by MCP prompt handlers */
export interface McpPromptMessage {
  role: 'user' | 'assistant';
  content: { type: 'text'; text: string };
}

/**
 * Instance-level contract for all MCP prompts.
 * Each prompt class owns its args schema AND its message generation.
 */
export interface McpPromptDefinition<
  TArgs extends z.ZodRawShape = z.ZodRawShape,
> {
  name: McpPromptName;
  description: string;
  argsSchema: TArgs;
  /** Generate the prompt messages from validated args */
  promptCallback(args: Record<string, string>): McpPromptMessage[];
}
