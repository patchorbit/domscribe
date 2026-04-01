import { Command } from 'commander';
import { RelayControl } from '../../lifecycle/relay-control.js';
import { createMcpAdapter, McpAdapter } from '../../mcp/mcp-adapter.js';
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

function setupShutdownHandlers(adapter: McpAdapter): void {
  const shutdown = async (signal: string): Promise<void> => {
    console.error(`\n[domscribe-cli] Received ${signal}, shutting down MCP...`);
    await adapter.close();
    process.exit(0);
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

async function mcp(options: McpCommandOptions) {
  const { debug } = options;
  const workspaceRoot = getWorkspaceRoot();

  if (!workspaceRoot) {
    if (debug) {
      console.error(
        '[domscribe-cli] No workspace found, starting in dormant mode',
      );
    }

    const adapter = createMcpAdapter({
      mode: 'dormant',
      cwd: process.cwd(),
      debug,
    });

    await adapter.start();
    setupShutdownHandlers(adapter);
    return;
  }

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

  const adapter = createMcpAdapter({
    mode: 'active',
    relayHost,
    relayPort,
    debug,
  });

  await adapter.start();
  setupShutdownHandlers(adapter);
}
