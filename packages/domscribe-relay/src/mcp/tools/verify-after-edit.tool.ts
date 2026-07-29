import { z } from 'zod';
import { VerifyResultSchema } from '@domscribe/core';
import {
  McpToolDefinition,
  McpToolOutputSchema,
  MCP_TOOLS,
  mcpErrorResult,
} from './tool.defs.js';
import { RelayHttpClient } from '../../client/relay-http-client.js';

const VerifyAfterEditToolInputSchema = z.object({
  baselineId: z
    .string()
    .describe('Baseline handle returned by domscribe.verify.baseline'),
  expectedChanges: z
    .array(
      z.object({
        property: z
          .string()
          .describe('CSS property you intended to change (e.g. "padding")'),
        value: z
          .string()
          .optional()
          .describe(
            'Expected resolved value as getComputedStyle reports it (e.g. "12px", "rgb(255, 0, 0)"). Omit to only assert the property changed.',
          ),
      }),
    )
    .optional()
    .describe(
      'Declare what your edit was meant to change. With expectations the verdict distinguishes match/partial/regression; without them it only distinguishes changed vs no_change.',
    ),
  annotationId: z
    .string()
    .optional()
    .describe(
      'When processing an annotation, pass its ID to append this verify result to the annotation’s verifyHistory',
    ),
});

type VerifyAfterEditToolInput = z.infer<typeof VerifyAfterEditToolInputSchema>;

const VerifyAfterEditToolOutputSchema = McpToolOutputSchema.extend({
  verified: z.boolean(),
  browserConnected: z.boolean().optional(),
  result: VerifyResultSchema.optional(),
  hint: z
    .string()
    .optional()
    .describe('Actionable guidance based on the verdict'),
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
    'Verify that a UI edit actually took effect, AFTER editing source and letting HMR apply it. ' +
    'Re-captures the element snapshotted by domscribe.verify.baseline and returns a deterministic verdict with per-property deltas: ' +
    '`no_change` means your edit did not reach the rendered element (wrong file, wrong selector, or HMR miss) — do not claim success on a no_change verdict. ' +
    '`match`/`partial`/`regression` are computed from your declared expectedChanges. ' +
    'The deltas are exact measurements, not judgments — you decide whether an unexpected delta is acceptable. ' +
    'Style values compare as getComputedStyle strings (colors as rgb(...), lengths resolved to px). ' +
    'Call within a few seconds of the edit so the page state has not drifted.';
  inputSchema = VerifyAfterEditToolInputSchema;
  outputSchema = VerifyAfterEditToolOutputSchema;

  constructor(private readonly relayHttpClient: RelayHttpClient) {}

  private buildHint(result: {
    verified: boolean;
    browserConnected: boolean;
    result?: { verdict: string };
  }): string | undefined {
    if (!result.verified && !result.browserConnected) {
      return 'No browser is connected. Ask the user to open the page in their browser, then retry.';
    }
    if (!result.verified) {
      return undefined;
    }
    switch (result.result?.verdict) {
      case 'no_change':
        return (
          'The rendered element did not change. Check that you edited the file the manifest points at, ' +
          'that the style path you changed actually applies to this element (specificity, conditional classes), ' +
          'and that the dev server hot-reloaded. Re-verify after fixing.'
        );
      case 'partial':
        return 'Some of the intended changes applied. Consult the deltas, adjust the edit, and re-verify with the same baselineId.';
      case 'regression':
        return 'The element changed, but not how you intended. Your edit likely hit the wrong element or property — review the deltas before retrying.';
      default:
        return undefined;
    }
  }

  async toolCallback(input: VerifyAfterEditToolInput) {
    try {
      const result = await this.relayHttpClient.verifyCheck(input);

      const output: VerifyAfterEditToolOutput = {
        verified: result.verified,
        browserConnected: result.browserConnected,
        result: result.result,
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
