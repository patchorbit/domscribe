#!/usr/bin/env node
import {
  createLockManager,
  RelayLockManager,
} from '../../lifecycle/lock-manager.js';
import { createRelayServer } from '../../server/http-server.js';
import { randomUUID } from 'node:crypto';
import { RELAY_VERSION } from '../../version.js';

const SHUTDOWN_INTERVAL_MS = 60_000;

let lockManager: RelayLockManager | null = null;

async function main(): Promise<void> {
  // Read configuration from environment
  const workspaceRoot = process.env.DS_WORKSPACE_ROOT;

  if (!workspaceRoot) {
    console.error('[domscribe-relay] DS_WORKSPACE_ROOT not set');
    process.exit(1);
  }

  const port = process.env.DS_RELAY_PORT
    ? parseInt(process.env.DS_RELAY_PORT, 10)
    : undefined;
  const host = process.env.DS_RELAY_HOST;
  const bodyLimit = process.env.DS_RELAY_BODY_LIMIT
    ? parseInt(process.env.DS_RELAY_BODY_LIMIT, 10)
    : undefined;
  const debug = process.env.DS_DEBUG === '1' || process.env.DS_DEBUG === 'true';

  const nonce = randomUUID();

  lockManager = createLockManager(workspaceRoot, { nonce });
  lockManager.claim();

  const relayServer = await createRelayServer({
    workspaceRoot,
    port,
    host,
    nonce,
    debug,
    bodyLimit,
  });

  const { port: assignedPort, host: assignedHost } = await relayServer.start();
  lockManager.finalize({ host: assignedHost, port: assignedPort });

  let shuttingDown = false;

  const shutdownIntervalTimer = setInterval(() => {
    const pid = process.pid;
    const lockData = lockManager?.getLockData();

    if (!lockData) {
      console.error('[domscribe-relay] Lock file not found, shutting down...');
      shutdown(1);
      return;
    }

    const {
      pid: lockPid,
      nonce: lockNonce,
      version: lockVersion,
      workspaceRoot: lockWorkspaceRoot,
    } = lockData;

    if (pid !== lockPid) {
      console.error('[domscribe-relay] PID mismatch, shutting down...');
      shutdown(1);
      return;
    }

    if (lockNonce !== nonce) {
      console.error('[domscribe-relay] Nonce mismatch, shutting down...');
      shutdown(1);
      return;
    }

    if (lockVersion !== RELAY_VERSION) {
      console.error(
        '[domscribe-relay] Relay version mismatch, shutting down...',
      );
      shutdown(1);
      return;
    }

    if (lockWorkspaceRoot !== workspaceRoot) {
      console.error(
        '[domscribe-relay] Workspace root mismatch, shutting down...',
      );
      shutdown(1);
      return;
    }
  }, SHUTDOWN_INTERVAL_MS);

  // Handle graceful shutdown
  async function shutdown(exitCode: number, signal?: string): Promise<void> {
    if (shuttingDown) {
      return;
    }

    shuttingDown = true;

    if (signal) {
      console.log(`\n[domscribe-relay] Received ${signal}, shutting down...`);
    }

    await relayServer.stop();
    lockManager?.release();
    clearInterval(shutdownIntervalTimer);

    console.log(`[domscribe-relay] Shutdown complete`);
    process.exit(exitCode);
  }

  process.on('SIGINT', () => shutdown(0, 'SIGINT'));
  process.on('SIGTERM', () => shutdown(0, 'SIGTERM'));

  // Handle uncaught errors
  process.on('uncaughtException', (error) => {
    console.error('[domscribe-relay] Uncaught exception:', error);
    lockManager?.release();
    process.exit(1);
  });

  process.on('unhandledRejection', (reason) => {
    console.error('[domscribe-relay] Unhandled rejection:', reason);
    lockManager?.release();
    process.exit(1);
  });
}

main().catch((error) => {
  console.error('[domscribe-relay] Fatal error:', error);
  lockManager?.release();
  process.exit(1);
});
