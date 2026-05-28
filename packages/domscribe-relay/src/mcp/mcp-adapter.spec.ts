import { McpAdapter, createMcpAdapter } from './mcp-adapter.js';
import { LEGACY_TOOL_ALIASES, MCP_TOOLS } from './tools/tool.defs.js';

vi.mock('@modelcontextprotocol/sdk/server/stdio.js', () => ({
  StdioServerTransport: class {},
}));

vi.mock('@modelcontextprotocol/sdk/server/mcp.js', () => {
  return {
    McpServer: class {
      registeredTools = new Map<
        string,
        { config: unknown; handler: unknown }
      >();
      registeredPrompts = new Map<string, unknown>();

      registerTool(
        name: string,
        config: unknown,
        handler: (args: unknown) => unknown,
      ) {
        this.registeredTools.set(name, { config, handler });
      }

      registerPrompt(name: string, config: unknown, handler: unknown) {
        this.registeredPrompts.set(name, { config, handler });
      }

      async connect() {
        //
      }
      async close() {
        //
      }
    },
  };
});

vi.mock('../client/relay-http-client.js', () => ({
  RelayHttpClient: class {
    constructor(
      public host: string,
      public port: number,
    ) {}
    async getStatus() {
      return {
        relay: { version: '0.0.0', uptime: 0, port: 9876 },
        manifest: {
          entryCount: 0,
          fileCount: 0,
          componentCount: 0,
          lastUpdated: null,
          cacheHitRate: 0,
        },
        annotations: {
          queued: 0,
          processing: 0,
          processed: 0,
          failed: 0,
          archived: 0,
        },
      };
    }
  },
}));

function getServer(adapter: McpAdapter) {
  return (
    adapter as unknown as {
      server: {
        registeredTools: Map<
          string,
          { config: unknown; handler: (args: unknown) => Promise<unknown> }
        >;
        registeredPrompts: Map<string, unknown>;
      };
    }
  ).server;
}

describe('McpAdapter', () => {
  describe('active mode', () => {
    it('should register all 12 canonical tools plus 12 legacy aliases (24 total)', () => {
      // Act
      const adapter = new McpAdapter({
        mode: 'active',
        relayHost: 'localhost',
        relayPort: 9876,
      });

      // Assert
      const server = getServer(adapter);
      expect(server.registeredTools.size).toBe(24);

      // Canonical names
      expect(server.registeredTools.has('domscribe_resolve')).toBe(true);
      expect(server.registeredTools.has('domscribe_resolve_batch')).toBe(true);
      expect(server.registeredTools.has('domscribe_manifest_stats')).toBe(true);
      expect(server.registeredTools.has('domscribe_manifest_query')).toBe(true);
      expect(server.registeredTools.has('domscribe_annotation_get')).toBe(true);
      expect(server.registeredTools.has('domscribe_annotation_list')).toBe(
        true,
      );
      expect(server.registeredTools.has('domscribe_annotation_process')).toBe(
        true,
      );
      expect(
        server.registeredTools.has('domscribe_annotation_update_status'),
      ).toBe(true);
      expect(server.registeredTools.has('domscribe_annotation_respond')).toBe(
        true,
      );
      expect(server.registeredTools.has('domscribe_annotation_search')).toBe(
        true,
      );
      expect(server.registeredTools.has('domscribe_status')).toBe(true);
      expect(server.registeredTools.has('domscribe_query_by_source')).toBe(
        true,
      );

      // Legacy aliases
      expect(server.registeredTools.has('domscribe.resolve')).toBe(true);
      expect(server.registeredTools.has('domscribe.resolve.batch')).toBe(true);
      expect(server.registeredTools.has('domscribe.manifest.stats')).toBe(true);
      expect(server.registeredTools.has('domscribe.manifest.query')).toBe(true);
      expect(server.registeredTools.has('domscribe.annotation.get')).toBe(true);
      expect(server.registeredTools.has('domscribe.annotation.list')).toBe(
        true,
      );
      expect(server.registeredTools.has('domscribe.annotation.process')).toBe(
        true,
      );
      expect(
        server.registeredTools.has('domscribe.annotation.updateStatus'),
      ).toBe(true);
      expect(server.registeredTools.has('domscribe.annotation.respond')).toBe(
        true,
      );
      expect(server.registeredTools.has('domscribe.annotation.search')).toBe(
        true,
      );
      expect(server.registeredTools.has('domscribe.status')).toBe(true);
      expect(server.registeredTools.has('domscribe.query.bySource')).toBe(true);
    });

    it('legacy alias should be marked deprecated in its description', () => {
      const adapter = new McpAdapter({
        mode: 'active',
        relayHost: 'localhost',
        relayPort: 9876,
      });

      const server = getServer(adapter);
      for (const legacyName of Object.values(LEGACY_TOOL_ALIASES)) {
        const entry = server.registeredTools.get(legacyName);
        expect(entry).toBeDefined();
        expect((entry?.config as { description: string }).description).toMatch(
          /deprecated/i,
        );
      }
    });

    it('legacy alias handler should emit deprecation warning on stderr and delegate to canonical handler', async () => {
      const warnings: string[] = [];
      const stderrWriteSpy = vi
        .spyOn(process.stderr, 'write')
        .mockImplementation((chunk: unknown) => {
          warnings.push(String(chunk));
          return true;
        });

      try {
        const adapter = new McpAdapter({
          mode: 'active',
          relayHost: 'localhost',
          relayPort: 9876,
        });

        const server = getServer(adapter);
        const legacyEntry = server.registeredTools.get('domscribe.status');
        expect(legacyEntry).toBeDefined();

        await legacyEntry!.handler({});

        const combined = warnings.join('');
        expect(combined).toMatch(/deprecated/i);
        expect(combined).toContain('domscribe.status');
        expect(combined).toContain(MCP_TOOLS.STATUS);
      } finally {
        stderrWriteSpy.mockRestore();
      }
    });

    it('canonical handler should NOT emit deprecation warning', async () => {
      const warnings: string[] = [];
      const stderrWriteSpy = vi
        .spyOn(process.stderr, 'write')
        .mockImplementation((chunk: unknown) => {
          warnings.push(String(chunk));
          return true;
        });

      try {
        const adapter = new McpAdapter({
          mode: 'active',
          relayHost: 'localhost',
          relayPort: 9876,
        });

        const server = getServer(adapter);
        const canonicalEntry = server.registeredTools.get(MCP_TOOLS.STATUS);
        expect(canonicalEntry).toBeDefined();

        await canonicalEntry!.handler({});

        const combined = warnings.join('');
        expect(combined).not.toMatch(/deprecated/i);
      } finally {
        stderrWriteSpy.mockRestore();
      }
    });

    it('should register all 4 prompts', () => {
      // Act
      const adapter = new McpAdapter({
        mode: 'active',
        relayHost: 'localhost',
        relayPort: 9876,
      });

      // Assert
      const server = getServer(adapter);
      expect(server.registeredPrompts.size).toBe(4);
      expect(server.registeredPrompts.has('process_next')).toBe(true);
      expect(server.registeredPrompts.has('check_status')).toBe(true);
      expect(server.registeredPrompts.has('explore_component')).toBe(true);
      expect(server.registeredPrompts.has('find_annotations')).toBe(true);
    });

    it('should start and connect transport', async () => {
      const adapter = new McpAdapter({
        mode: 'active',
        relayHost: 'localhost',
        relayPort: 9876,
      });

      // Should not throw
      await adapter.start();
    });

    it('should close gracefully', async () => {
      const adapter = new McpAdapter({
        mode: 'active',
        relayHost: 'localhost',
        relayPort: 9876,
      });

      // Should not throw
      await adapter.close();
    });
  });

  describe('dormant mode', () => {
    it('should register only the status tool plus its legacy alias (2 total)', () => {
      // Act
      const adapter = new McpAdapter({
        mode: 'dormant',
        cwd: '/home/user/some-project',
      });

      // Assert
      const server = getServer(adapter);
      expect(server.registeredTools.size).toBe(2);
      expect(server.registeredTools.has('domscribe_status')).toBe(true);
      expect(server.registeredTools.has('domscribe.status')).toBe(true);
    });

    it('should register no prompts', () => {
      // Act
      const adapter = new McpAdapter({
        mode: 'dormant',
        cwd: '/home/user/some-project',
      });

      // Assert
      const server = getServer(adapter);
      expect(server.registeredPrompts.size).toBe(0);
    });

    it('should start and connect transport', async () => {
      const adapter = new McpAdapter({
        mode: 'dormant',
        cwd: '/home/user/some-project',
      });

      // Should not throw
      await adapter.start();
    });

    it('should close gracefully', async () => {
      const adapter = new McpAdapter({
        mode: 'dormant',
        cwd: '/home/user/some-project',
      });

      // Should not throw
      await adapter.close();
    });
  });
});

describe('createMcpAdapter', () => {
  it('should return an McpAdapter instance for active mode', () => {
    const adapter = createMcpAdapter({
      mode: 'active',
      relayHost: 'localhost',
      relayPort: 9876,
    });

    expect(adapter).toBeInstanceOf(McpAdapter);
  });

  it('should return an McpAdapter instance for dormant mode', () => {
    const adapter = createMcpAdapter({
      mode: 'dormant',
      cwd: '/tmp/test',
    });

    expect(adapter).toBeInstanceOf(McpAdapter);
  });
});
