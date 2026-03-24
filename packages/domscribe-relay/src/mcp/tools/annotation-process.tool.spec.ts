import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { AnnotationsProcessTool } from './annotation-process.tool.js';
import { createMockRelayClient } from '../__test-utils__/mock-relay-client.js';
import { MCP_TOOLS } from './tool.defs.js';

describe('AnnotationsProcessTool', () => {
  describe('toolCallback', () => {
    it('should return full annotation context when found', async () => {
      // Arrange
      const processResponse = {
        found: true,
        annotationId: 'ann_123',
        userIntent: 'Fix button color',
        element: {
          tagName: 'button',
          dataDs: 'ds_btn',
          selector: 'div > button.primary',
          attributes: { class: 'primary' },
          innerText: 'Submit',
        },
        sourceLocation: {
          file: 'src/Button.tsx',
          line: 10,
          column: 5,
          componentName: 'Button',
          tagName: 'button',
        },
        runtimeContext: {
          componentProps: { disabled: false },
          componentState: { loading: false },
        },
        fullAnnotation: { metadata: { id: 'ann_123' } },
      };
      const mockClient = createMockRelayClient({
        processAnnotation: vi.fn().mockResolvedValue(processResponse),
      });
      const tool = new AnnotationsProcessTool(mockClient);

      // Act
      const result: CallToolResult = await tool.toolCallback({});

      // Assert
      expect(mockClient.processAnnotation).toHaveBeenCalled();
      expect(result.structuredContent).toEqual({
        ...processResponse,
        nextStep:
          'Implement the change described in userIntent. ' +
          'Then call domscribe.query.bySource with the same file and line to verify your changes in the live browser. ' +
          'Then call domscribe.annotation.respond with your summary, then domscribe.annotation.updateStatus with status "processed".',
      });
    });

    it('should handle empty queue', async () => {
      // Arrange
      const mockClient = createMockRelayClient({
        processAnnotation: vi.fn().mockResolvedValue({
          found: false,
        }),
      });
      const tool = new AnnotationsProcessTool(mockClient);

      // Act
      const result: CallToolResult = await tool.toolCallback({});

      // Assert
      const structured = result.structuredContent as Record<string, unknown>;
      expect(structured['found']).toBe(false);
      expect(structured['annotationId']).toBeUndefined();
    });

    it('should return MCP error result on exception', async () => {
      // Arrange
      const mockClient = createMockRelayClient({
        processAnnotation: vi.fn().mockRejectedValue(new Error('fail')),
      });
      const tool = new AnnotationsProcessTool(mockClient);

      // Act
      const result: CallToolResult = await tool.toolCallback({});

      // Assert
      expect(result.isError).toBe(true);
    });
  });

  it('should have correct tool metadata', () => {
    const tool = new AnnotationsProcessTool(createMockRelayClient());

    expect(tool.name).toBe(MCP_TOOLS.ANNOTATION_PROCESS);
  });
});
