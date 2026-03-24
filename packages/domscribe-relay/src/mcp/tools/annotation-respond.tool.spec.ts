import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { AnnotationsRespondTool } from './annotation-respond.tool.js';
import { createMockRelayClient } from '../__test-utils__/mock-relay-client.js';
import { MCP_TOOLS } from './tool.defs.js';

describe('AnnotationsRespondTool', () => {
  describe('toolCallback', () => {
    it('should store agent response and return success', async () => {
      // Arrange
      const mockClient = createMockRelayClient({
        updateAnnotationResponse: vi.fn().mockResolvedValue({
          success: true,
          annotation: {
            metadata: { id: 'ann_123' },
          },
        }),
      });
      const tool = new AnnotationsRespondTool(mockClient);

      // Act
      const result: CallToolResult = await tool.toolCallback({
        annotationId: 'ann_123',
        message: 'Changed button color to blue',
      });

      // Assert
      expect(mockClient.updateAnnotationResponse).toHaveBeenCalledWith(
        'ann_123',
        'Changed button color to blue',
      );
      expect(result.structuredContent).toEqual({
        success: true,
        annotationId: 'ann_123',
        nextStep:
          'Call domscribe.annotation.updateStatus with annotationId "ann_123" and status "processed" to complete the lifecycle.',
      });
    });

    it('should default message to empty string when not provided', async () => {
      // Arrange
      const mockClient = createMockRelayClient({
        updateAnnotationResponse: vi.fn().mockResolvedValue({
          success: true,
          annotation: {
            metadata: { id: 'ann_123' },
          },
        }),
      });
      const tool = new AnnotationsRespondTool(mockClient);

      // Act
      await tool.toolCallback({ annotationId: 'ann_123' });

      // Assert
      expect(mockClient.updateAnnotationResponse).toHaveBeenCalledWith(
        'ann_123',
        '',
      );
    });

    it('should return MCP error result on exception', async () => {
      // Arrange
      const mockClient = createMockRelayClient({
        updateAnnotationResponse: vi.fn().mockRejectedValue(new Error('fail')),
      });
      const tool = new AnnotationsRespondTool(mockClient);

      // Act
      const result: CallToolResult = await tool.toolCallback({
        annotationId: 'ann_123',
      });

      // Assert
      expect(result.isError).toBe(true);
    });
  });

  it('should have correct tool metadata', () => {
    const tool = new AnnotationsRespondTool(createMockRelayClient());

    expect(tool.name).toBe(MCP_TOOLS.ANNOTATION_RESPOND);
  });
});
