import { Command } from 'commander';
import { RelayControl } from '../../lifecycle/relay-control.js';
import { getWorkspaceRoot } from '../utils.js';

interface ServeCommandOptions {
  daemon: boolean;
  port?: string;
  host?: string;
  bodyLimit?: string;
  debug: boolean;
}

export const ServeCommand = new Command('serve')
  .description('Start the relay server')
  .option('-d, --daemon', 'Run as background daemon')
  .option('-p, --port <number>', 'Port to listen on (0 for dynamic)')
  .option('--host <string>', 'Host to bind to')
  .option(
    '--body-limit <bytes>',
    'Max request body size in bytes (default: 10MB)',
  )
  .option('--debug', 'Enable debug logging')
  .action(async (options: ServeCommandOptions) => {
    try {
      await serve(options);
    } catch (error) {
      console.error(`[domscribe-cli] Failed to start relay: ${error}`);
      process.exit(1);
    }
  });

async function serve(options: ServeCommandOptions) {
  const workspaceRoot = getWorkspaceRoot();

  if (!workspaceRoot) {
    throw new Error('No workspace root found');
  }

  const port = options.port ? parseInt(options.port, 10) : undefined;
  const bodyLimit = options.bodyLimit
    ? parseInt(options.bodyLimit, 10)
    : undefined;
  const { host, debug, daemon } = options;

  const relayControl = new RelayControl(workspaceRoot, { debug });

  if (daemon) {
    const { port: assignedPort } = await relayControl.ensureRunning({
      port,
      host,
      bodyLimit,
    });

    console.log(`[domscribe-cli] Relay daemon started on port ${assignedPort}`);
    console.log(`\nTo check status: domscribe status`);
    console.log(`To stop it: domscribe stop`);
    return;
  }

  const existing = await relayControl.validateAndClear();

  if (existing?.host && existing?.port) {
    console.log(
      `[domscribe-cli] Relay daemon already running on port ${existing.port}`,
    );
    console.log(`\nTo check status: domscribe status`);
    console.log(`To stop it: domscribe stop`);
    return;
  }

  const child = relayControl.spawn({
    port,
    host,
    bodyLimit,
    detached: false,
  });

  await new Promise<void>((resolve, reject) => {
    child.on('exit', (code) =>
      code === 0
        ? resolve()
        : reject(new Error(`Relay exited with code ${code}`)),
    );
    child.on('error', reject);
  });
}
