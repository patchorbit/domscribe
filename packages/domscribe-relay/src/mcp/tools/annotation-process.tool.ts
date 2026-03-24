import { z } from 'zod';
import {
  McpToolDefinition,
  McpToolOutputSchema,
  MCP_TOOLS,
  mcpErrorResult,
} from './tool.defs.js';
import { RelayHttpClient } from '../../client/relay-http-client.js';

const AnnotationsProcessToolInputSchema = z.object({});

type AnnotationsProcessToolInput = z.infer<
  typeof AnnotationsProcessToolInputSchema
>;

/** Schema for element details in flattened format */
const ProcessToolElementSchema = z.object({
  tagName: z.string().describe('HTML tag name'),
  dataDs: z.string().optional().describe('Domscribe element ID if available'),
  selector: z.string().describe('CSS selector path'),
  attributes: z
    .record(z.string(), z.string())
    .optional()
    .describe('Element attributes'),
  innerText: z
    .string()
    .optional()
    .describe('First 100 characters of inner text'),
});

/** Schema for source location in flattened format */
const ProcessToolSourceLocationSchema = z.object({
  file: z.string().describe('Source file path (relative to workspace root)'),
  line: z.number().nullable().describe('Line number (1-based)'),
  column: z.number().nullable().describe('Column number (1-based)'),
  componentName: z.string().optional().describe('Component name if available'),
  tagName: z.string().optional().describe('Tag name from manifest'),
});

/** Schema for runtime context in flattened format */
const ProcessToolRuntimeContextSchema = z.object({
  componentProps: z.unknown().optional().describe('Component props snapshot'),
  componentState: z.unknown().optional().describe('Component state snapshot'),
});

const AnnotationsProcessToolOutputSchema = McpToolOutputSchema.extend({
  found: z.boolean().describe('Whether an annotation was found and claimed'),
  annotationId: z
    .string()
    .optional()
    .describe('Annotation ID (for status updates after processing)'),
  userIntent: z.string().optional().describe("User's intent/message"),
  element: ProcessToolElementSchema.optional().describe(
    'Selected element details',
  ),
  sourceLocation: ProcessToolSourceLocationSchema.optional().describe(
    'Source code location from manifest',
  ),
  runtimeContext: ProcessToolRuntimeContextSchema.optional().describe(
    'Runtime context (props, state)',
  ),
  fullAnnotation: z
    .unknown()
    .optional()
    .describe('Full annotation for advanced use cases'),
  nextStep: z
    .string()
    .optional()
    .describe('Workflow hint — what to do after this tool call'),
});

type AnnotationsProcessToolOutput = z.infer<
  typeof AnnotationsProcessToolOutputSchema
>;

export class AnnotationsProcessTool implements McpToolDefinition<
  typeof AnnotationsProcessToolInputSchema,
  typeof AnnotationsProcessToolOutputSchema
> {
  name = MCP_TOOLS.ANNOTATION_PROCESS;
  description =
    'Claim the next queued annotation for processing (atomic — no annotation ID needed). ' +
    'This is the correct tool for picking up work. Do NOT use annotation.list to manually pick annotations. ' +
    'Returns the oldest queued annotation with full context including resolved source location. ' +
    'After implementing the change, call annotation.respond then annotation.updateStatus to complete the lifecycle.';
  inputSchema = AnnotationsProcessToolInputSchema;
  outputSchema = AnnotationsProcessToolOutputSchema;

  constructor(private readonly relayHttpClient: RelayHttpClient) {}

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async toolCallback(_input: AnnotationsProcessToolInput) {
    try {
      const response = await this.relayHttpClient.processAnnotation();

      // Direct passthrough - API already returns agent-optimized format
      const output: AnnotationsProcessToolOutput = {
        found: response.found,
        annotationId: response.annotationId,
        userIntent: response.userIntent,
        element: response.element,
        sourceLocation: response.sourceLocation,
        runtimeContext: response.runtimeContext,
        fullAnnotation: response.fullAnnotation,
        nextStep: response.found
          ? 'Implement the change described in userIntent. ' +
            'Then call domscribe.query.bySource with the same file and line to verify your changes in the live browser. ' +
            'Then call domscribe.annotation.respond with your summary, then domscribe.annotation.updateStatus with status "processed".'
          : undefined,
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
