import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { ResolveTool } from './resolve.tool.js';
import {
  createMockRelayClient,
  getResultText,
} from '../__test-utils__/mock-relay-client.js';
import { MCP_TOOLS } from './tool.defs.js';

describe('ResolveTool', () => {
  describe('toolCallback', () => {
    it('should resolve a manifest entry and return structured output', async () => {
      // Arrange
      const mockClient = createMockRelayClient({
        resolveManifestEntry: vi.fn().mockResolvedValue({
          success: true,
          entry: {
            file: 'src/components/Button.tsx',
            start: { line: 10, column: 5 },
            end: { line: 10, column: 30 },
            componentName: 'Button',
            tagName: 'button',
          },
        }),
      });
      const tool = new ResolveTool(mockClient);

      // Act
      const result: CallToolResult = await tool.toolCallback({
        entryId: 'ds_abc123',
      });

      // Assert
      expect(mockClient.resolveManifestEntry).toHaveBeenCalledWith('ds_abc123');
      expect(result.structuredContent).toEqual({
        found: true,
        file: 'src/components/Button.tsx',
        start: { line: 10, column: 5 },
        end: { line: 10, column: 30 },
        componentName: 'Button',
        tagName: 'button',
        styleSource: undefined,
        error: undefined,
      });
      expect(JSON.parse(getResultText(result))).toEqual(
        result.structuredContent,
      );
    });

    it('should forward styleSource when present on the manifest entry', async () => {
      // Build-time style capture path (RFC 0001): when the transform was
      // run with captureStyles enabled, the entry carries className tokens
      // and any CSS-in-JS source-block info. The tool must pass it through.
      const mockClient = createMockRelayClient({
        resolveManifestEntry: vi.fn().mockResolvedValue({
          success: true,
          entry: {
            file: 'src/components/Button.tsx',
            start: { line: 10, column: 5 },
            end: { line: 10, column: 30 },
            componentName: 'Button',
            tagName: 'button',
            styleSource: {
              className: 'px-4 py-2 bg-blue-500',
              classes: ['px-4', 'py-2', 'bg-blue-500'],
            },
          },
        }),
      });
      const tool = new ResolveTool(mockClient);

      const result: CallToolResult = await tool.toolCallback({
        entryId: 'ds_abc123',
      });

      expect(
        (
          result.structuredContent as {
            styleSource?: { classes?: string[]; className?: string };
          }
        )?.styleSource,
      ).toEqual({
        className: 'px-4 py-2 bg-blue-500',
        classes: ['px-4', 'py-2', 'bg-blue-500'],
      });
    });

    it('should handle not-found entries', async () => {
      // Arrange
      const mockClient = createMockRelayClient({
        resolveManifestEntry: vi.fn().mockResolvedValue({
          success: false,
          error: 'Entry not found',
        }),
      });
      const tool = new ResolveTool(mockClient);

      // Act
      const result: CallToolResult = await tool.toolCallback({
        entryId: 'ds_missing',
      });

      // Assert
      expect(result.structuredContent).toEqual({
        found: false,
        file: undefined,
        start: undefined,
        end: undefined,
        componentName: undefined,
        tagName: undefined,
        styleSource: undefined,
        error: 'Entry not found',
      });
    });

    it('should return MCP error result on exception', async () => {
      // Arrange
      const mockClient = createMockRelayClient({
        resolveManifestEntry: vi
          .fn()
          .mockRejectedValue(new Error('Connection refused')),
      });
      const tool = new ResolveTool(mockClient);

      // Act
      const result: CallToolResult = await tool.toolCallback({
        entryId: 'ds_abc123',
      });

      // Assert
      expect(result.isError).toBe(true);
      const parsed = JSON.parse(getResultText(result));
      expect(parsed.title).toBe('Connection refused');
    });
  });

  it('should have correct tool metadata', () => {
    const tool = new ResolveTool(createMockRelayClient());

    expect(tool.name).toBe(MCP_TOOLS.RESOLVE);
    expect(tool.description).toContain('Resolve');
    expect(tool.inputSchema).toBeDefined();
    expect(tool.outputSchema).toBeDefined();
  });
});
