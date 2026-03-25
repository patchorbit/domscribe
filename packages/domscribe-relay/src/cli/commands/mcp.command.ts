import { Command } from 'commander';
import { RelayControl } from '../../lifecycle/relay-control.js';
import { createMcpAdapter } from '../../mcp/mcp-adapter.js';
import { getWorkspaceRoot } from '../utils.js';

interface McpCommandOptions {
  debug: boolean;
  bodyLimit?: string;
}

export const McpCommand = new Command('mcp')
  .description('Start MCP adapter for agent integration (stdio transport)')
  .option(
    '--body-limit <bytes>',
    'Max request body size in bytes (default: 10MB)',
  )
  .option('--debug', 'Enable debug logging')
  .action(async (options: McpCommandOptions) => {
    try {
      await mcp(options);
    } catch (error) {
      console.error(`[domscribe-cli] Failed to start MCP adapter: ${error}`);
      process.exit(1);
    }
  });

async function mcp(options: McpCommandOptions) {
  const workspaceRoot = getWorkspaceRoot();

  if (!workspaceRoot) {
    throw new Error(
      'No workspace root found. Ensure you are running this command inside a workspace where domscribe is installed.',
    );
  }

  const { debug } = options;
  const bodyLimit = options.bodyLimit
    ? parseInt(options.bodyLimit, 10)
    : undefined;
  const relayControl = new RelayControl(workspaceRoot);

  const { host: relayHost, port: relayPort } = await relayControl.ensureRunning(
    { bodyLimit },
  );

  console.error(
    `[domscribe-cli] Starting MCP adapter (relay at http://${relayHost}:${relayPort})`,
  );

  // Create and start MCP adapter
  const adapter = createMcpAdapter({
    relayHost,
    relayPort,
    debug,
  });

  await adapter.start();

  // Handle shutdown
  const shutdown = async (signal: string): Promise<void> => {
    console.error(`\n[domscribe-cli] Received ${signal}, shutting down MCP...`);
    await adapter.close();
    process.exit(0);
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}
