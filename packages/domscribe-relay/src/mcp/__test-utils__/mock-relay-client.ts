import { vi } from 'vitest';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { RelayHttpClient } from '../../client/relay-http-client.js';

/**
 * Creates a mock RelayHttpClient with all methods stubbed as vi.fn().
 * Override individual methods by passing partial overrides.
 */
export function createMockRelayClient(
  overrides?: Partial<Record<keyof RelayHttpClient, ReturnType<typeof vi.fn>>>,
): RelayHttpClient {
  return {
    resolveManifestEntry: vi.fn(),
    batchResolveManifestEntries: vi.fn(),
    getManifestStats: vi.fn(),
    queryManifestEntries: vi.fn(),
    getAnnotation: vi.fn(),
    listAnnotations: vi.fn(),
    searchAnnotations: vi.fn(),
    processAnnotation: vi.fn(),
    updateAnnotationStatus: vi.fn(),
    updateAnnotationResponse: vi.fn(),
    verifyAnnotation: vi.fn(),
    createAnnotation: vi.fn(),
    deleteAnnotation: vi.fn(),
    patchAnnotation: vi.fn(),
    queryBySource: vi.fn(),
    getStatus: vi.fn(),
    getHealth: vi.fn(),
    shutdown: vi.fn(),
    ...overrides,
  } as unknown as RelayHttpClient;
}

/**
 * Extract the text from the first content item of a CallToolResult.
 * All MCP tools in this project return text content.
 */
export function getResultText(result: CallToolResult): string {
  const item = result.content?.[0];
  if (item.type !== 'text') {
    throw new Error(`Expected text content, got ${item.type}`);
  }
  return item.text;
}
