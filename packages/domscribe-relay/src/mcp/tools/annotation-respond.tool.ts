import { z } from 'zod';
import {
  McpToolDefinition,
  McpToolOutputSchema,
  MCP_TOOLS,
  mcpErrorResult,
} from './tool.defs.js';
import { RelayHttpClient } from '../../client/relay-http-client.js';

const AnnotationsRespondToolInputSchema = z.object({
  annotationId: z.string().describe('The annotation ID to respond to'),
  message: z
    .string()
    .optional()
    .describe("Agent's explanation of what was done"),
});

type AnnotationsRespondToolInput = z.infer<
  typeof AnnotationsRespondToolInputSchema
>;

const AnnotationsRespondToolOutputSchema = McpToolOutputSchema.extend({
  success: z.boolean().describe('Whether the response was stored successfully'),
  annotationId: z
    .string()
    .optional()
    .describe('The annotation ID that received the response'),
});

type AnnotationsRespondToolOutput = z.infer<
  typeof AnnotationsRespondToolOutputSchema
>;

export class AnnotationsRespondTool
  implements
    McpToolDefinition<
      typeof AnnotationsRespondToolInputSchema,
      typeof AnnotationsRespondToolOutputSchema
    >
{
  name = MCP_TOOLS.ANNOTATION_RESPOND;
  description =
    "Store the agent's response to an annotation including explanation message and code patches. " +
    'Use after implementing changes to record what was done so users can review in the overlay.';
  inputSchema = AnnotationsRespondToolInputSchema;
  outputSchema = AnnotationsRespondToolOutputSchema;

  constructor(private readonly relayHttpClient: RelayHttpClient) {}

  async toolCallback(input: AnnotationsRespondToolInput) {
    try {
      const response = await this.relayHttpClient.updateAnnotationResponse(
        input.annotationId,
        input.message ?? '',
      );

      const output: AnnotationsRespondToolOutput = {
        success: response.success,
        annotationId: response.annotation.metadata.id,
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
