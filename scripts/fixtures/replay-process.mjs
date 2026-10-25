import fs from 'node:fs';
import { spawn } from 'node:child_process';

export function startOwnedProcess(command, args, options) {
  return spawn(command, args, { ...options, detached: true });
}

export async function stopOwnedProcess(child, graceMs = 1000) {
  if (!child?.pid) return;
  try {
    process.kill(-child.pid, 'SIGTERM');
  } catch {}
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
  } catch {}
}

export async function runOwnedBuild(
  command,
  args,
  { cwd, env, logPath, timeoutMs = 300000, graceMs = 1000 },
) {
  const log = fs.openSync(logPath, 'w');
  let child, timer;
  try {
    child = startOwnedProcess(command, args, {
      cwd,
      env,
      stdio: ['ignore', log, log],
    });
    await new Promise((resolve, reject) => {
      let timedOut = false;
      timer = setTimeout(async () => {
        timedOut = true;
        await stopOwnedProcess(child, graceMs);
        reject(new Error(`Production build timed out after ${timeoutMs}ms`));
      }, timeoutMs);
      child.once('error', reject);
      child.once('exit', (code, signal) => {
        if (timedOut) return;
        if (code === 0) resolve();
        else reject(new Error(`Production build failed: ${signal ?? code}`));
      });
    });
  } finally {
    clearTimeout(timer);
    await stopOwnedProcess(child, graceMs);
    fs.closeSync(log);
  }
}
