/**
 * MCP tool: `domscribe.verify.afterEdit`
 *
 * Posts a post-edit capture (componentStyles + boundingRect + opaque
 * screenshotRef) to the relay's verify endpoint, which grades it against
 * the annotation's pre-edit baseline and returns a structured `VerifyResult`.
 *
 * Soft-recommended in `process-next.prompt` — NO lifecycle gate. RFC 0002
 * §Decision routes the escalation path through a falsifier-trip review,
 * not the state machine.
 *
 * @module @domscribe/relay/mcp/tools/verify-after-edit
 */

import { z } from 'zod';
import {
  BoundingRectSchema,
  ComponentStylesSchema,
  VerifyResultSchema,
} from '@domscribe/core';
import { RelayHttpClient } from '../../client/relay-http-client.js';
import {
  McpToolDefinition,
  McpToolOutputSchema,
  MCP_TOOLS,
  mcpErrorResult,
} from './tool.defs.js';

const VerifyAfterEditToolInputSchema = z.object({
  annotationId: z.string().describe('The annotation ID to verify'),
  postEditComponentStyles: ComponentStylesSchema.optional().describe(
    "Post-edit ComponentStyles snapshot from the runtime StyleCapturer. The relay diffs this against the annotation's pre-edit baseline.",
  ),
  postEditBoundingRect: BoundingRectSchema.optional().describe(
    'Post-edit boundingRect from the picked element',
  ),
  screenshotRef: z
    .string()
    .optional()
    .describe(
      'Opaque relay-blob reference for the post-edit element screenshot. The overlay produces this via the runtime ScreenshotCapturer. NEVER raw image bytes — bytes live behind the reference, not in the tool input.',
    ),
});

type VerifyAfterEditToolInput = z.infer<typeof VerifyAfterEditToolInputSchema>;

const VerifyAfterEditToolOutputSchema = McpToolOutputSchema.extend({
  success: z.boolean().describe('Whether the verify result was recorded'),
  result: VerifyResultSchema.optional().describe(
    'Structured VerifyResult with verdict and per-axis deltas',
  ),
  nextStep: z
    .string()
    .optional()
    .describe('Workflow hint — what to do after this tool call'),
});

type VerifyAfterEditToolOutput = z.infer<
  typeof VerifyAfterEditToolOutputSchema
>;

export class VerifyAfterEditTool implements McpToolDefinition<
  typeof VerifyAfterEditToolInputSchema,
  typeof VerifyAfterEditToolOutputSchema
> {
  name = MCP_TOOLS.VERIFY_AFTER_EDIT;
  description =
    "Grade a post-edit capture against the annotation's pre-edit baseline. " +
    'Call this AFTER domscribe.annotation.respond and BEFORE ' +
    'domscribe.annotation.updateStatus so the verdict + per-axis deltas ' +
    'can inform a retry if the edit did not land as intended. ' +
    'Returns a structured VerifyResult (verdict ∈ match | partial | ' +
    'no_change | regression; componentStylesDelta; boundingRectDelta; ' +
    'pixelDiffRatio; screenshotRef). Soft-recommended — no lifecycle gate.';
  inputSchema = VerifyAfterEditToolInputSchema;
  outputSchema = VerifyAfterEditToolOutputSchema;

  constructor(private readonly relayHttpClient: RelayHttpClient) {}

  async toolCallback(input: VerifyAfterEditToolInput) {
    try {
      const response = await this.relayHttpClient.verifyAnnotation(
        input.annotationId,
        {
          componentStyles: input.postEditComponentStyles,
          boundingRect: input.postEditBoundingRect,
          screenshotRef: input.screenshotRef,
        },
      );

      const output: VerifyAfterEditToolOutput = {
        success: response.success,
        result: response.result,
        nextStep:
          response.result.verdict === 'match' ||
          response.result.verdict === 'partial'
            ? `Verify verdict: ${response.result.verdict}. Call domscribe.annotation.updateStatus with annotationId "${input.annotationId}" and status "processed" to complete the lifecycle.`
            : `Verify verdict: ${response.result.verdict}${response.result.reason ? ` (${response.result.reason})` : ''}. Reconcile the deltas above and retry your edit before marking the annotation processed.`,
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
