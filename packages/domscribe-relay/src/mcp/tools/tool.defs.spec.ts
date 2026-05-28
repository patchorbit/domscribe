import { DomscribeError, DomscribeErrorCode } from '@domscribe/core';
import {
  mcpErrorResult,
  MCP_TOOLS,
  LEGACY_TOOL_ALIASES,
  MCP_TOOL_NAME_REGEX,
} from './tool.defs.js';
import { getResultText } from '../__test-utils__/mock-relay-client.js';

describe('tool.defs', () => {
  describe('MCP_TOOLS canonical names', () => {
    it('should define all expected canonical tool names in underscore form', () => {
      expect(MCP_TOOLS.RESOLVE).toBe('domscribe_resolve');
      expect(MCP_TOOLS.RESOLVE_BATCH).toBe('domscribe_resolve_batch');
      expect(MCP_TOOLS.MANIFEST_STATS).toBe('domscribe_manifest_stats');
      expect(MCP_TOOLS.MANIFEST_QUERY).toBe('domscribe_manifest_query');
      expect(MCP_TOOLS.ANNOTATION_LIST).toBe('domscribe_annotation_list');
      expect(MCP_TOOLS.ANNOTATION_GET).toBe('domscribe_annotation_get');
      expect(MCP_TOOLS.ANNOTATION_UPDATE_STATUS).toBe(
        'domscribe_annotation_update_status',
      );
      expect(MCP_TOOLS.ANNOTATION_PROCESS).toBe('domscribe_annotation_process');
      expect(MCP_TOOLS.ANNOTATION_RESPOND).toBe('domscribe_annotation_respond');
      expect(MCP_TOOLS.ANNOTATION_SEARCH).toBe('domscribe_annotation_search');
      expect(MCP_TOOLS.QUERY_BY_SOURCE).toBe('domscribe_query_by_source');
      expect(MCP_TOOLS.STATUS).toBe('domscribe_status');
    });

    it('every canonical tool name should match the Windsurf-compatible regex', () => {
      // Per MCP spec + Windsurf enforcement: ^[a-zA-Z0-9_-]{1,64}$
      for (const name of Object.values(MCP_TOOLS)) {
        expect(name).toMatch(MCP_TOOL_NAME_REGEX);
        expect(name.length).toBeLessThanOrEqual(64);
      }
    });

    it('canonical tool names should not contain dots', () => {
      for (const name of Object.values(MCP_TOOLS)) {
        expect(name).not.toContain('.');
      }
    });
  });

  describe('LEGACY_TOOL_ALIASES', () => {
    it('should map every canonical name to its legacy dotted form', () => {
      expect(LEGACY_TOOL_ALIASES[MCP_TOOLS.RESOLVE]).toBe('domscribe.resolve');
      expect(LEGACY_TOOL_ALIASES[MCP_TOOLS.RESOLVE_BATCH]).toBe(
        'domscribe.resolve.batch',
      );
      expect(LEGACY_TOOL_ALIASES[MCP_TOOLS.MANIFEST_STATS]).toBe(
        'domscribe.manifest.stats',
      );
      expect(LEGACY_TOOL_ALIASES[MCP_TOOLS.MANIFEST_QUERY]).toBe(
        'domscribe.manifest.query',
      );
      expect(LEGACY_TOOL_ALIASES[MCP_TOOLS.ANNOTATION_LIST]).toBe(
        'domscribe.annotation.list',
      );
      expect(LEGACY_TOOL_ALIASES[MCP_TOOLS.ANNOTATION_GET]).toBe(
        'domscribe.annotation.get',
      );
      expect(LEGACY_TOOL_ALIASES[MCP_TOOLS.ANNOTATION_UPDATE_STATUS]).toBe(
        'domscribe.annotation.updateStatus',
      );
      expect(LEGACY_TOOL_ALIASES[MCP_TOOLS.ANNOTATION_PROCESS]).toBe(
        'domscribe.annotation.process',
      );
      expect(LEGACY_TOOL_ALIASES[MCP_TOOLS.ANNOTATION_RESPOND]).toBe(
        'domscribe.annotation.respond',
      );
      expect(LEGACY_TOOL_ALIASES[MCP_TOOLS.ANNOTATION_SEARCH]).toBe(
        'domscribe.annotation.search',
      );
      expect(LEGACY_TOOL_ALIASES[MCP_TOOLS.QUERY_BY_SOURCE]).toBe(
        'domscribe.query.bySource',
      );
      expect(LEGACY_TOOL_ALIASES[MCP_TOOLS.STATUS]).toBe('domscribe.status');
    });

    it('should cover every canonical tool', () => {
      const canonicalNames = Object.values(MCP_TOOLS);
      const aliasKeys = Object.keys(LEGACY_TOOL_ALIASES);
      for (const name of canonicalNames) {
        expect(aliasKeys).toContain(name);
      }
    });
  });

  describe('mcpErrorResult', () => {
    it('should convert DomscribeError to structured MCP error', () => {
      // Arrange
      const error = new DomscribeError({
        code: DomscribeErrorCode.DS_VALIDATION_FAILED,
        title: 'Validation failed',
        detail: 'Invalid entry ID',
        status: 400,
      });

      // Act
      const result = mcpErrorResult(error);

      // Assert
      expect(result.isError).toBe(true);
      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');

      const parsed = JSON.parse(getResultText(result));
      expect(parsed.code).toBe(DomscribeErrorCode.DS_VALIDATION_FAILED);
      expect(parsed.title).toBe('Validation failed');
      expect(parsed.detail).toBe('Invalid entry ID');
      expect(parsed.status).toBe(400);
    });

    it('should convert plain Error to structured MCP error with message as title', () => {
      // Arrange
      const error = new Error('Something broke');

      // Act
      const result = mcpErrorResult(error);

      // Assert
      expect(result.isError).toBe(true);

      const parsed = JSON.parse(getResultText(result));
      expect(parsed.code).toBe(DomscribeErrorCode.DS_INTERNAL_ERROR);
      expect(parsed.title).toBe('Something broke');
    });

    it('should handle non-Error values with fallback title', () => {
      // Act
      const result = mcpErrorResult('string error');

      // Assert
      expect(result.isError).toBe(true);

      const parsed = JSON.parse(getResultText(result));
      expect(parsed.code).toBe(DomscribeErrorCode.DS_INTERNAL_ERROR);
      expect(parsed.title).toBe('Unknown error');
    });
  });
});
