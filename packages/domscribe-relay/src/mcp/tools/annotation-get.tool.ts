import { z } from 'zod';
import {
  McpToolDefinition,
  McpToolOutputSchema,
  MCP_TOOLS,
  mcpErrorResult,
} from './tool.defs.js';
import { AnnotationIdSchema, AnnotationSchema } from '@domscribe/core';
import { RelayHttpClient } from '../../client/relay-http-client.js';

const AnnotationGetToolInputSchema = z.object({
  annotationId: AnnotationIdSchema.describe('The annotation ID to retrieve'),
});
const AnnotationGetToolOutputSchema = McpToolOutputSchema.extend({
  annotation: AnnotationSchema.optional().describe('Full annotation data'),
});

type AnnotationGetToolInput = z.infer<typeof AnnotationGetToolInputSchema>;
type AnnotationGetToolOutput = z.infer<typeof AnnotationGetToolOutputSchema>;

export class AnnotationGetTool
  implements
    McpToolDefinition<
      typeof AnnotationGetToolInputSchema,
      typeof AnnotationGetToolOutputSchema
    >
{
  name = MCP_TOOLS.ANNOTATION_GET;
  description =
    'Get the full details of a specific annotation including captured context, ' +
    'runtime props/state, element information, user message, and agent response. ' +
    'Use after listing annotations to get complete context for processing.';
  inputSchema = AnnotationGetToolInputSchema;
  outputSchema = AnnotationGetToolOutputSchema;

  constructor(private readonly relayHttpClient: RelayHttpClient) {}

  async toolCallback(input: AnnotationGetToolInput) {
    try {
      const annotation = await this.relayHttpClient.getAnnotation(
        input.annotationId,
      );

      const output: AnnotationGetToolOutput = {
        annotation,
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
