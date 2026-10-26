import fs from 'node:fs';
import { spawn } from 'node:child_process';

export function startOwnedProcess(command, args, options) {
  return spawn(command, args, { ...options, detached: true });
}

export async function stopOwnedProcess(child, graceMs = 1000) {
  if (!child?.pid) return;
  try {
    process.kill(-child.pid, 'SIGTERM');
  } catch {
    /* Best-effort cleanup/readiness; the owned process may already be gone. */
  }
  if (child.exitCode === null && child.signalCode === null) {
    await new Promise((resolve) => {
      const timer = setTimeout(resolve, graceMs);
      child.once('exit', () => {
        clearTimeout(timer);
        resolve();
      });
    });
  }
  // The leader may have exited before its workers. Always retire the group.
  try {
    process.kill(-child.pid, 'SIGKILL');
  } catch {
    /* Best-effort cleanup/readiness; the owned process may already be gone. */
  }
}

export async function runOwnedBuild(
  command,
  args,
  {
    cwd,
    env,
    logPath,
    timeoutMs = 300000,
    graceMs = 1000,
    signal,
    label = 'Production build',
  },
) {
  signal?.throwIfAborted();
  const log = fs.openSync(logPath, 'w');
  let child, timer, onAbort;
  try {
    child = startOwnedProcess(command, args, {
      cwd,
      env,
      stdio: ['ignore', log, log],
    });
    await new Promise((resolve, reject) => {
      let interrupted = false;
      const interrupt = (message) => {
        if (interrupted) return;
        interrupted = true;
        stopOwnedProcess(child, graceMs).then(
          () => reject(new Error(message)),
          reject,
        );
      };
      timer = setTimeout(
        () => interrupt(`${label} timed out after ${timeoutMs}ms`),
        timeoutMs,
      );
      onAbort = () => interrupt(`${label} cancelled`);
      signal?.addEventListener('abort', onAbort, { once: true });
      if (signal?.aborted) onAbort();
      child.once('error', reject);
      child.once('exit', (code, signal) => {
        if (interrupted) return;
        if (code === 0) resolve();
        else reject(new Error(`${label} failed: ${signal ?? code}`));
      });
    });
  } finally {
    clearTimeout(timer);
    if (onAbort) signal?.removeEventListener('abort', onAbort);
    await stopOwnedProcess(child, graceMs);
    fs.closeSync(log);
  }
}
