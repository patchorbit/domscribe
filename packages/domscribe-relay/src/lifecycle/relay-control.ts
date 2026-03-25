/**
 * Consolidated relay lifecycle facade.
 * Composes lock-file, health-check, spawn, and process primitives.
 * Used by build plugins, CLI commands, and MCP.
 * @module @domscribe/relay/lifecycle/relay-control
 */
import path from 'node:path';
import { spawn, type ChildProcess } from 'node:child_process';
import { DEFAULT_CONFIG } from '@domscribe/core';
import { isProcessRunning, sleep } from './process.js';

import { RelayHttpClient } from '../client/relay-http-client.js';
import { RelayLock, RelayLockManager } from './lock-manager.js';
import { gt } from 'semver';
import { fileURLToPath } from 'node:url';
import { RELAY_VERSION } from '../version.js';

export interface RelayControlOptions {
  /** Enable debug logging */
  debug?: boolean;
}

/**
 * Options for ensuring relay is running.
 */
export interface RelayEnsureOptions {
  /** Port to use (only if starting). Default: 0 (dynamic) */
  port?: number;
  /** Host to use (only if starting). Default: '127.0.0.1' */
  host?: string;
  /** Max request body size in bytes (only if starting). Default: 10MB */
  bodyLimit?: number;
}

export interface RelayStatus {
  running: boolean;
  runData?: RelayRunData;
  lockData?: RelayLock;
}

export interface RelayRunData {
  pid: number;
  nonce: string;
  workspaceRoot: string;
  version: string;
}

export interface RelayHealth extends Partial<RelayRunData> {
  healthy: boolean;
}

export class RelayControl {
  /** Enable debug logging */
  private readonly debug: boolean;
  private readonly lockManager: RelayLockManager;

  constructor(
    private readonly workspaceRoot: string,
    options: RelayControlOptions = {},
  ) {
    this.debug = options.debug ?? false;
    this.lockManager = new RelayLockManager(this.workspaceRoot);
  }

  async ensureRunning(
    options: RelayEnsureOptions = {},
  ): Promise<{ host: string; port: number }> {
    const { host: requestedHost, port: requestedPort, bodyLimit } = options;

    const running = await this.validateAndClear();

    if (running?.host && running?.port) {
      return {
        host: running.host,
        port: running.port,
      };
    }

    const child = this.spawn({
      port: requestedPort,
      host: requestedHost,
      bodyLimit,
    });

    if (!child.pid) {
      throw new Error('Failed to spawn relay. No PID returned from spawn.');
    }

    const status = await this.waitForHealth({});

    if (!status) {
      throw new Error('Relay did not become healthy. Health check failed.');
    }

    return {
      host: status.host,
      port: status.port,
    };
  }

  async validateAndClear(): Promise<
    { host: string; port: number } | undefined
  > {
    const { running, runData, lockData } = await this.getStatus();

    if (running && runData && lockData?.host && lockData?.port) {
      const isValid = this.isValid(runData, lockData);
      const isOutdated = this.isOutdated(runData.version);

      if (isValid && !isOutdated) {
        return {
          host: lockData.host,
          port: lockData.port,
        };
      }

      await this.stop(lockData);
    }

    if (!running && this.lockManager.isLockFilePresent()) {
      // Stale lock data, remove it
      this.lockManager.removeLockFile();
    }

    return;
  }

  spawn({
    port,
    host,
    bodyLimit,
    detached = true,
  }: {
    port?: number;
    host?: string;
    bodyLimit?: number;
    detached?: boolean;
  }): ChildProcess {
    const processEntry = resolveProcessEntryPath();

    const env: NodeJS.ProcessEnv = {
      ...process.env,
      DS_WORKSPACE_ROOT: this.workspaceRoot,
      DS_DEBUG: this.debug ? '1' : '0',
    };

    if (port && port > 0) {
      env.DS_RELAY_PORT = String(port);
    }

    if (host) {
      env.DS_RELAY_HOST = host;
    }

    if (bodyLimit && bodyLimit > 0) {
      env.DS_RELAY_BODY_LIMIT = String(bodyLimit);
    }

    const child = spawn(process.execPath, [processEntry], {
      detached,
      stdio: detached ? 'ignore' : 'inherit',
      env,
      cwd: this.workspaceRoot,
    });

    if (detached) {
      child.unref();
    }

    return child;
  }

  async stop(lockData?: RelayLock) {
    lockData = lockData ?? this.lockManager.getLockData() ?? undefined;

    if (!lockData?.host || !lockData?.port || !lockData?.nonce) {
      return;
    }

    await this.shutdown({
      host: lockData.host,
      port: lockData.port,
      nonce: lockData.nonce,
    });

    const shutdownCompleted = await this.waitForShutdown({});

    if (!shutdownCompleted) {
      throw new Error('Failed to shutdown relay');
    }
  }

  async getStatus(): Promise<RelayStatus> {
    const lockData = this.lockManager.getLockData();

    if (!lockData) {
      return {
        running: false,
      };
    }

    if (!isProcessRunning(lockData.pid)) {
      return {
        running: false,
        lockData,
      };
    }

    if (!lockData.host || !lockData.port) {
      return {
        running: false,
        lockData,
      };
    }

    const { healthy, pid, nonce, workspaceRoot, version } =
      await this.checkHealth({
        host: lockData.host,
        port: lockData.port,
      });

    if (!healthy || !pid || !nonce || !workspaceRoot || !version) {
      return {
        running: false,
        lockData,
      };
    }

    return {
      running: true,
      runData: {
        pid,
        nonce,
        workspaceRoot,
        version,
      },
      lockData,
    };
  }

  private isValid(runData: RelayRunData, lockData: RelayLock): boolean {
    if (lockData.pid !== runData.pid) {
      return false;
    }

    if (lockData.nonce !== runData.nonce) {
      return false;
    }

    if (lockData.workspaceRoot !== runData.workspaceRoot) {
      return false;
    }

    return true;
  }

  private isOutdated(version: string): boolean {
    return gt(RELAY_VERSION, version);
  }

  private async waitForHealth({
    maxWaitMs = DEFAULT_CONFIG.RELAY_HEALTH_WAIT_MS,
    intervalMs = 100,
  }: {
    maxWaitMs?: number;
    intervalMs?: number;
  }): Promise<{ host: string; port: number } | undefined> {
    const startTime = Date.now();

    while (Date.now() - startTime < maxWaitMs) {
      const { running, runData, lockData } = await this.getStatus();

      if (running && runData && lockData?.host && lockData?.port) {
        const isValid = this.isValid(runData, lockData);
        if (isValid) {
          return {
            host: lockData.host,
            port: lockData.port,
          };
        }
      }

      await sleep(intervalMs);
    }

    return;
  }

  private async waitForShutdown({
    maxWaitMs = DEFAULT_CONFIG.RELAY_SHUTDOWN_WAIT_MS,
    intervalMs = 100,
  }: {
    maxWaitMs?: number;
    intervalMs?: number;
  }): Promise<boolean> {
    const startTime = Date.now();

    while (Date.now() - startTime < maxWaitMs) {
      const { running } = await this.getStatus();

      if (!running) {
        return true;
      }

      await sleep(intervalMs);
    }

    return false;
  }

  private async checkHealth({
    host,
    port,
    timeoutMs = DEFAULT_CONFIG.RELAY_HEALTH_TIMEOUT_MS,
  }: {
    host: string;
    port: number;
    timeoutMs?: number;
  }): Promise<RelayHealth> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const relayHttpClient = new RelayHttpClient(host, port);
      const response = await relayHttpClient.getHealth({
        signal: controller.signal,
      });

      return {
        healthy: response.status === 'healthy',
        pid: response.pid,
        nonce: response.nonce,
        version: response.version,
        workspaceRoot: response.workspaceRoot,
      };
    } catch {
      return {
        healthy: false,
      };
    } finally {
      clearTimeout(timeoutId);
    }
  }

  private async shutdown({
    host,
    port,
    nonce,
    timeoutMs = DEFAULT_CONFIG.RELAY_SHUTDOWN_TIMEOUT_MS,
  }: {
    host: string;
    port: number;
    nonce: string;
    timeoutMs?: number;
  }) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const relayHttpClient = new RelayHttpClient(host, port);
      const response = await relayHttpClient.shutdown(nonce, {
        signal: controller.signal,
      });

      if (!response.success) {
        throw new Error('Failed to initiate relay shutdown');
      }
    } finally {
      clearTimeout(timeoutId);
    }
  }
}

/**
 * Resolve the process entry point path relative to this module.
 * process-entry.js lives in cli/bin/
 */
function resolveProcessEntryPath(): string {
  const currentFileUrl = fileURLToPath(import.meta.url);
  const currentDir = path.dirname(currentFileUrl);

  // process-entry lives in src/cli/bin/
  return path.join(currentDir, '..', 'cli', 'bin', 'process-entry.js');
}
