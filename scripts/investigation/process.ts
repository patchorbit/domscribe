import { openSync, closeSync } from 'node:fs';
import { createServer } from 'node:net';
import type { ChildProcess } from 'node:child_process';
const lifecycle = (await import(
  new URL('../fixtures/replay-process.mjs', import.meta.url).href
)) as {
  startOwnedProcess: (
    command: string,
    args: string[],
    options: object,
  ) => ChildProcess;
  stopOwnedProcess: (child: ChildProcess, graceMs?: number) => Promise<void>;
  runOwnedBuild: (
    command: string,
    args: string[],
    options: object,
  ) => Promise<void>;
};
export function minimalEnvironment(): NodeJS.ProcessEnv {
  return Object.fromEntries(
    ['PATH', 'HOME', 'TMPDIR', 'LANG', 'LC_ALL', 'CODEX_HOME'].flatMap((key) =>
      process.env[key] ? [[key, process.env[key]]] : [],
    ),
  );
}
export async function runCommand(
  argv: string[],
  cwd: string,
  logPath: string,
  timeoutMs: number,
  signal: AbortSignal,
): Promise<void> {
  await lifecycle.runOwnedBuild(argv[0], argv.slice(1), {
    cwd,
    env: { ...minimalEnvironment(), CI: '1' },
    logPath,
    timeoutMs,
    signal,
    label: 'Investigation command',
  });
}
async function reservePort(): Promise<number> {
  const server = createServer();
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  const address = server.address();
  await new Promise<void>((resolve) => server.close(() => resolve()));
  if (!address || typeof address === 'string')
    throw Error('Port allocation failed');
  return address.port;
}
export async function startApp(
  argv: string[],
  cwd: string,
  logPath: string,
  timeout: number,
  signal: AbortSignal,
) {
  signal.throwIfAborted();
  const port = await reservePort();
  const args = argv.map((arg) => arg.replaceAll('{port}', String(port)));
  const log = openSync(logPath, 'w', 0o600);
  const child = lifecycle.startOwnedProcess(args[0], args.slice(1), {
    cwd,
    env: { ...minimalEnvironment(), CI: '1', BROWSER: 'none' },
    stdio: ['ignore', log, log],
  });
  let spawnError = false;
  child.once('error', () => {
    spawnError = true;
  });
  const stop = async () => {
    await lifecycle.stopOwnedProcess(child);
    closeSync(log);
  };
  const url = `http://127.0.0.1:${port}`;
  const deadline = Date.now() + timeout;
  try {
    while (Date.now() < deadline) {
      signal.throwIfAborted();
      if (spawnError || child.exitCode !== null || child.signalCode !== null)
        throw Error('App exited before readiness');
      try {
        const response = await fetch(url, {
          signal: AbortSignal.any([
            signal,
            AbortSignal.timeout(Math.min(1000, timeout)),
          ]),
          redirect: 'error',
        });
        await response.body?.cancel();
        if (response.ok) return { url, stop };
      } catch {
        signal.throwIfAborted();
      }
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    throw Error('App readiness deadline exceeded');
  } catch (error) {
    await stop();
    throw error;
  }
}
