import { McpAdapter, createMcpAdapter } from './mcp-adapter.js';

vi.mock('@modelcontextprotocol/sdk/server/stdio.js', () => ({
  StdioServerTransport: class {},
}));

vi.mock('@modelcontextprotocol/sdk/server/mcp.js', () => {
  return {
    McpServer: class {
      registeredTools = new Map<string, unknown>();
      registeredPrompts = new Map<string, unknown>();

      registerTool(name: string, config: unknown, handler: unknown) {
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
  },
}));

function getServer(adapter: McpAdapter) {
  return (
    adapter as unknown as {
      server: {
        registeredTools: Map<string, unknown>;
        registeredPrompts: Map<string, unknown>;
      };
    }
  ).server;
}

describe('McpAdapter', () => {
  describe('active mode', () => {
    it('should register all 12 tools', () => {
      // Act
      const adapter = new McpAdapter({
        mode: 'active',
        relayHost: 'localhost',
        relayPort: 9876,
      });

      // Assert
      const server = getServer(adapter);
      expect(server.registeredTools.size).toBe(12);
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
    it('should register only the status tool', () => {
      // Act
      const adapter = new McpAdapter({
        mode: 'dormant',
        cwd: '/home/user/some-project',
      });

      // Assert
      const server = getServer(adapter);
      expect(server.registeredTools.size).toBe(1);
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
