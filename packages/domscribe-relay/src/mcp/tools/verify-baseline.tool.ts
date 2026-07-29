import { z } from 'zod';
import {
  McpToolDefinition,
  McpToolOutputSchema,
  MCP_TOOLS,
  mcpErrorResult,
} from './tool.defs.js';
import { RelayHttpClient } from '../../client/relay-http-client.js';

const VerifyBaselineToolInputSchema = z.object({
  entryId: z
    .string()
    .describe(
      'Manifest entry ID (data-ds attribute value) of the element you are about to edit. ' +
        'Get it from domscribe.resolve, domscribe.query.bySource, or an annotation.',
    ),
});

type VerifyBaselineToolInput = z.infer<typeof VerifyBaselineToolInputSchema>;

const VerifyBaselineToolOutputSchema = McpToolOutputSchema.extend({
  captured: z.boolean(),
  baselineId: z
    .string()
    .optional()
    .describe('Pass this to domscribe.verify.afterEdit once you have edited'),
  capturedAt: z.string().optional(),
  browserConnected: z.boolean().optional(),
  hasComponentStyles: z.boolean().optional(),
  hasBoundingRect: z.boolean().optional(),
  hint: z
    .string()
    .optional()
    .describe('Actionable guidance based on the result'),
});

type VerifyBaselineToolOutput = z.infer<typeof VerifyBaselineToolOutputSchema>;

export class VerifyBaselineTool implements McpToolDefinition<
  typeof VerifyBaselineToolInputSchema,
  typeof VerifyBaselineToolOutputSchema
> {
  name = MCP_TOOLS.VERIFY_BASELINE;
  description =
    'Capture a pre-edit baseline snapshot (computed styles + geometry) of a rendered element, BEFORE editing its source. ' +
    'Call this at the start of any styling or layout change, then edit, then call domscribe.verify.afterEdit with the returned baselineId to get a deterministic verdict on whether your edit took effect. ' +
    'The snapshot is captured from the live page in the user’s browser, so the element must currently be rendered. ' +
    'Baselines are session-scoped — they do not survive a relay restart, and stale baselines are evicted after 100 captures.';
  inputSchema = VerifyBaselineToolInputSchema;
  outputSchema = VerifyBaselineToolOutputSchema;

  constructor(private readonly relayHttpClient: RelayHttpClient) {}

  private buildHint(result: {
    captured: boolean;
    browserConnected: boolean;
    hasComponentStyles?: boolean;
  }): string | undefined {
    if (!result.captured && !result.browserConnected) {
      return 'No browser is connected. Ask the user to open the page in their browser, then retry.';
    }
    if (!result.captured) {
      return 'The element is not currently rendered. Ask the user to navigate to a page that renders it, then retry.';
    }
    if (result.hasComponentStyles === false) {
      return (
        'Baseline captured with geometry only — computed styles are unavailable because the runtime is not configured with `captureStyles: true`. ' +
        'Verification will still detect whether the element changed, but without per-property style deltas. ' +
        'For full deltas, ask the user to enable captureStyles and re-capture the baseline.'
      );
    }
    return undefined;
  }

  async toolCallback(input: VerifyBaselineToolInput) {
    try {
      const result = await this.relayHttpClient.verifyBaseline(input);

      const output: VerifyBaselineToolOutput = {
        captured: result.captured,
        baselineId: result.baselineId,
        capturedAt: result.capturedAt,
        browserConnected: result.browserConnected,
        hasComponentStyles: result.hasComponentStyles,
        hasBoundingRect: result.hasBoundingRect,
        error: result.error,
        hint: this.buildHint(result),
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
