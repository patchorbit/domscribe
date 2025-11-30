import { z } from 'zod';
import {
  McpToolDefinition,
  McpToolOutputSchema,
  MCP_TOOLS,
  mcpErrorResult,
} from './tool.defs.js';
import { AnnotationStatusSchema } from '@domscribe/core';
import { RelayHttpClient } from '../../client/relay-http-client.js';

const AnnotationsUpdateStatusToolInputSchema = z.object({
  annotationId: z.string().describe('The annotation ID to update'),
  status: AnnotationStatusSchema.describe('The new status for the annotation'),
  errorDetails: z
    .string()
    .optional()
    .describe('Error details (for failed status)'),
});

type AnnotationsUpdateStatusToolInput = z.infer<
  typeof AnnotationsUpdateStatusToolInputSchema
>;

const AnnotationsUpdateStatusToolOutputSchema = McpToolOutputSchema.extend({
  success: z.boolean().describe('Whether the update was successful'),
  newStatus: AnnotationStatusSchema.describe('The new status after update'),
  annotationId: z.string().describe('The annotation ID that was updated'),
});

type AnnotationsUpdateStatusToolOutput = z.infer<
  typeof AnnotationsUpdateStatusToolOutputSchema
>;

export class AnnotationsUpdateStatusTool
  implements
    McpToolDefinition<
      typeof AnnotationsUpdateStatusToolInputSchema,
      typeof AnnotationsUpdateStatusToolOutputSchema
    >
{
  name = MCP_TOOLS.ANNOTATION_UPDATE_STATUS;
  description =
    "Update an annotation's status in its lifecycle. " +
    'Valid transitions: queued→processing, processing→processed/failed, any→archived. ' +
    'Use to mark work as complete (processed), failed with error details, or archived.';
  inputSchema = AnnotationsUpdateStatusToolInputSchema;
  outputSchema = AnnotationsUpdateStatusToolOutputSchema;

  constructor(private readonly relayHttpClient: RelayHttpClient) {}

  async toolCallback(input: AnnotationsUpdateStatusToolInput) {
    try {
      const response = await this.relayHttpClient.updateAnnotationStatus(
        input.annotationId,
        input.status,
        {
          errorDetails: input.errorDetails,
        },
      );

      const output: AnnotationsUpdateStatusToolOutput = {
        success: true,
        newStatus: response.annotation.metadata.status,
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
