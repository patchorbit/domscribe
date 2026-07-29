import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { VerifyAfterEditTool } from './verify-after-edit.tool.js';
import {
  createMockRelayClient,
  getResultText,
} from '../__test-utils__/mock-relay-client.js';
import { MCP_TOOLS } from './tool.defs.js';

describe('VerifyAfterEditTool', () => {
  it('should expose the correct tool name', () => {
    // Arrange
    const tool = new VerifyAfterEditTool(createMockRelayClient());

    // Assert
    expect(tool.name).toBe(MCP_TOOLS.VERIFY_AFTER_EDIT);
  });

  describe('toolCallback', () => {
    it('should return the verify result on a match verdict without a hint', async () => {
      // Arrange
      const verifyResult = {
        verdict: 'match',
        timestamp: '2026-07-27T00:00:00.000Z',
        componentStylesDelta: [
          { property: 'padding', before: '8px', after: '12px' },
        ],
        boundingRectDelta: [],
      };
      const mockClient = createMockRelayClient({
        verifyCheck: vi.fn().mockResolvedValue({
          verified: true,
          browserConnected: true,
          result: verifyResult,
        }),
      });
      const tool = new VerifyAfterEditTool(mockClient);

      // Act
      const result: CallToolResult = await tool.toolCallback({
        baselineId: 'vb_123',
        expectedChanges: [{ property: 'padding', value: '12px' }],
      });

      // Assert
      expect(mockClient.verifyCheck).toHaveBeenCalledWith({
        baselineId: 'vb_123',
        expectedChanges: [{ property: 'padding', value: '12px' }],
      });
      expect(result.structuredContent).toEqual({
        verified: true,
        browserConnected: true,
        result: verifyResult,
        error: undefined,
        hint: undefined,
      });
      expect(JSON.parse(getResultText(result))).toEqual(
        result.structuredContent,
      );
    });

    it('should hint that the edit did not land on a no_change verdict', async () => {
      // Arrange
      const mockClient = createMockRelayClient({
        verifyCheck: vi.fn().mockResolvedValue({
          verified: true,
          browserConnected: true,
          result: {
            verdict: 'no_change',
            timestamp: '2026-07-27T00:00:00.000Z',
          },
        }),
      });
      const tool = new VerifyAfterEditTool(mockClient);

      // Act
      const result = await tool.toolCallback({ baselineId: 'vb_123' });

      // Assert
      const output = result.structuredContent as { hint?: string };
      expect(output.hint).toContain('did not change');
      expect(output.hint).toContain('hot-reloaded');
    });

    it('should hint to retry with the same baseline on a partial verdict', async () => {
      // Arrange
      const mockClient = createMockRelayClient({
        verifyCheck: vi.fn().mockResolvedValue({
          verified: true,
          browserConnected: true,
          result: {
            verdict: 'partial',
            timestamp: '2026-07-27T00:00:00.000Z',
          },
        }),
      });
      const tool = new VerifyAfterEditTool(mockClient);

      // Act
      const result = await tool.toolCallback({ baselineId: 'vb_123' });

      // Assert
      const output = result.structuredContent as { hint?: string };
      expect(output.hint).toContain('re-verify with the same baselineId');
    });

    it('should hint about the wrong element on a regression verdict', async () => {
      // Arrange
      const mockClient = createMockRelayClient({
        verifyCheck: vi.fn().mockResolvedValue({
          verified: true,
          browserConnected: true,
          result: {
            verdict: 'regression',
            timestamp: '2026-07-27T00:00:00.000Z',
          },
        }),
      });
      const tool = new VerifyAfterEditTool(mockClient);

      // Act
      const result = await tool.toolCallback({ baselineId: 'vb_123' });

      // Assert
      const output = result.structuredContent as { hint?: string };
      expect(output.hint).toContain('not how you intended');
    });

    it('should hint about the browser when no client is connected', async () => {
      // Arrange
      const mockClient = createMockRelayClient({
        verifyCheck: vi.fn().mockResolvedValue({
          verified: false,
          browserConnected: false,
          error: 'No browser is connected',
        }),
      });
      const tool = new VerifyAfterEditTool(mockClient);

      // Act
      const result = await tool.toolCallback({ baselineId: 'vb_123' });

      // Assert
      const output = result.structuredContent as { hint?: string };
      expect(output.hint).toContain('open the page in their browser');
    });

    it('should return a structured MCP error when the client throws', async () => {
      // Arrange
      const mockClient = createMockRelayClient({
        verifyCheck: vi.fn().mockRejectedValue(new Error('relay down')),
      });
      const tool = new VerifyAfterEditTool(mockClient);

      // Act
      const result = await tool.toolCallback({ baselineId: 'vb_123' });

      // Assert
      expect(result.isError).toBe(true);
      expect(getResultText(result)).toContain('relay down');
    });
  });
});
