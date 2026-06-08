import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { VerifyAfterEditTool } from './verify-after-edit.tool.js';
import { createMockRelayClient } from '../__test-utils__/mock-relay-client.js';
import { MCP_TOOLS } from './tool.defs.js';

const annotationId = 'ann_A7bCd9Ef_1700000000000';

describe('VerifyAfterEditTool', () => {
  it('declares the verify_after_edit canonical name', () => {
    const tool = new VerifyAfterEditTool(createMockRelayClient());
    expect(tool.name).toBe(MCP_TOOLS.VERIFY_AFTER_EDIT);
    expect(tool.name).toBe('domscribe.verify.afterEdit');
  });

  it('forwards componentStyles, boundingRect, and screenshotRef to the relay', async () => {
    const verifyAnnotation = vi.fn().mockResolvedValue({
      success: true,
      annotationId,
      result: {
        annotationId,
        verdict: 'match',
        pixelDiffRatio: 0,
        pixelDiffPixels: 0,
        componentStylesDelta: {},
        boundingRectDelta: {},
        screenshotRef: 'blob://post-edit/abc',
        capturedAt: '2025-01-01T00:00:00.000Z',
      },
    });
    const mockClient = createMockRelayClient({ verifyAnnotation });
    const tool = new VerifyAfterEditTool(mockClient);

    await tool.toolCallback({
      annotationId,
      postEditComponentStyles: { computed: { color: 'rgb(0, 0, 0)' } },
      postEditBoundingRect: {
        x: 0,
        y: 0,
        width: 10,
        height: 10,
        top: 0,
        right: 10,
        bottom: 10,
        left: 0,
      },
      screenshotRef: 'blob://post-edit/abc',
    });

    expect(verifyAnnotation).toHaveBeenCalledWith(annotationId, {
      componentStyles: { computed: { color: 'rgb(0, 0, 0)' } },
      boundingRect: {
        x: 0,
        y: 0,
        width: 10,
        height: 10,
        top: 0,
        right: 10,
        bottom: 10,
        left: 0,
      },
      screenshotRef: 'blob://post-edit/abc',
    });
  });

  it('returns the relay verdict as structured content', async () => {
    const verifyAnnotation = vi.fn().mockResolvedValue({
      success: true,
      annotationId,
      result: {
        annotationId,
        verdict: 'partial',
        pixelDiffRatio: 0.005,
        pixelDiffPixels: 250,
        componentStylesDelta: { color: ['red', 'blue'] },
        boundingRectDelta: {},
        capturedAt: '2025-01-01T00:00:00.000Z',
      },
    });
    const tool = new VerifyAfterEditTool(
      createMockRelayClient({ verifyAnnotation }),
    );

    const result: CallToolResult = await tool.toolCallback({ annotationId });

    expect(result.structuredContent).toMatchObject({
      success: true,
      result: { verdict: 'partial' },
    });
  });

  it('hints at retry when the verdict is regression or no_change', async () => {
    const verifyAnnotation = vi.fn().mockResolvedValue({
      success: true,
      annotationId,
      result: {
        annotationId,
        verdict: 'no_change',
        pixelDiffRatio: 0,
        pixelDiffPixels: 0,
        componentStylesDelta: {},
        boundingRectDelta: {},
        capturedAt: '2025-01-01T00:00:00.000Z',
        reason: 'edit did not land',
      },
    });
    const tool = new VerifyAfterEditTool(
      createMockRelayClient({ verifyAnnotation }),
    );

    const result: CallToolResult = await tool.toolCallback({ annotationId });
    const structured = result.structuredContent as { nextStep: string };

    expect(structured.nextStep).toMatch(/retry/i);
    expect(structured.nextStep).toContain('edit did not land');
  });

  it('returns an MCP error result when the relay call throws', async () => {
    const verifyAnnotation = vi.fn().mockRejectedValue(new Error('relay down'));
    const tool = new VerifyAfterEditTool(
      createMockRelayClient({ verifyAnnotation }),
    );

    const result: CallToolResult = await tool.toolCallback({ annotationId });

    expect(result.isError).toBe(true);
  });

  it('NEVER inlines screenshot bytes — the serialized tool output stays small even with a long screenshotRef', async () => {
    const longRef = 'blob://post-edit/' + 'x'.repeat(64);
    const verifyAnnotation = vi.fn().mockResolvedValue({
      success: true,
      annotationId,
      result: {
        annotationId,
        verdict: 'match',
        pixelDiffRatio: 0,
        pixelDiffPixels: 0,
        componentStylesDelta: {},
        boundingRectDelta: {},
        screenshotRef: longRef,
        capturedAt: '2025-01-01T00:00:00.000Z',
      },
    });
    const tool = new VerifyAfterEditTool(
      createMockRelayClient({ verifyAnnotation }),
    );

    const result: CallToolResult = await tool.toolCallback({
      annotationId,
      screenshotRef: longRef,
    });
    const serialized = JSON.stringify(result.structuredContent);

    expect(serialized).not.toMatch(/base64/i);
    expect(serialized).not.toMatch(/data:image/i);
    expect(serialized).toContain(longRef);
    expect(serialized.length).toBeLessThan(2048);
  });
});
