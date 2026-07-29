import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { VerifyBaselineTool } from './verify-baseline.tool.js';
import {
  createMockRelayClient,
  getResultText,
} from '../__test-utils__/mock-relay-client.js';
import { MCP_TOOLS } from './tool.defs.js';

describe('VerifyBaselineTool', () => {
  it('should expose the correct tool name', () => {
    // Arrange
    const tool = new VerifyBaselineTool(createMockRelayClient());

    // Assert
    expect(tool.name).toBe(MCP_TOOLS.VERIFY_BASELINE);
  });

  describe('toolCallback', () => {
    it('should return the baselineId for a successful capture', async () => {
      // Arrange
      const mockClient = createMockRelayClient({
        verifyBaseline: vi.fn().mockResolvedValue({
          captured: true,
          baselineId: 'vb_123',
          entryId: 'aB3dEf7h',
          capturedAt: '2026-07-27T00:00:00.000Z',
          browserConnected: true,
          hasComponentStyles: true,
          hasBoundingRect: true,
        }),
      });
      const tool = new VerifyBaselineTool(mockClient);

      // Act
      const result: CallToolResult = await tool.toolCallback({
        entryId: 'aB3dEf7h',
      });

      // Assert
      expect(mockClient.verifyBaseline).toHaveBeenCalledWith({
        entryId: 'aB3dEf7h',
      });
      expect(result.structuredContent).toEqual({
        captured: true,
        baselineId: 'vb_123',
        capturedAt: '2026-07-27T00:00:00.000Z',
        browserConnected: true,
        hasComponentStyles: true,
        hasBoundingRect: true,
        error: undefined,
        hint: undefined,
      });
      expect(JSON.parse(getResultText(result))).toEqual(
        result.structuredContent,
      );
    });

    it('should hint about the browser when no client is connected', async () => {
      // Arrange
      const mockClient = createMockRelayClient({
        verifyBaseline: vi.fn().mockResolvedValue({
          captured: false,
          browserConnected: false,
          error: 'No browser is connected',
        }),
      });
      const tool = new VerifyBaselineTool(mockClient);

      // Act
      const result = await tool.toolCallback({ entryId: 'aB3dEf7h' });

      // Assert
      const output = result.structuredContent as { hint?: string };
      expect(output.hint).toContain('open the page in their browser');
    });

    it('should hint about navigation when the element is not rendered', async () => {
      // Arrange
      const mockClient = createMockRelayClient({
        verifyBaseline: vi.fn().mockResolvedValue({
          captured: false,
          browserConnected: true,
          error: 'Element is not currently rendered',
        }),
      });
      const tool = new VerifyBaselineTool(mockClient);

      // Act
      const result = await tool.toolCallback({ entryId: 'aB3dEf7h' });

      // Assert
      const output = result.structuredContent as { hint?: string };
      expect(output.hint).toContain('not currently rendered');
    });

    it('should hint about captureStyles when the baseline has geometry only', async () => {
      // Arrange
      const mockClient = createMockRelayClient({
        verifyBaseline: vi.fn().mockResolvedValue({
          captured: true,
          baselineId: 'vb_456',
          browserConnected: true,
          hasComponentStyles: false,
          hasBoundingRect: true,
        }),
      });
      const tool = new VerifyBaselineTool(mockClient);

      // Act
      const result = await tool.toolCallback({ entryId: 'aB3dEf7h' });

      // Assert
      const output = result.structuredContent as { hint?: string };
      expect(output.hint).toContain('captureStyles');
    });

    it('should return a structured MCP error when the client throws', async () => {
      // Arrange
      const mockClient = createMockRelayClient({
        verifyBaseline: vi.fn().mockRejectedValue(new Error('relay down')),
      });
      const tool = new VerifyBaselineTool(mockClient);

      // Act
      const result = await tool.toolCallback({ entryId: 'aB3dEf7h' });

      // Assert
      expect(result.isError).toBe(true);
      expect(getResultText(result)).toContain('relay down');
    });
  });
});
