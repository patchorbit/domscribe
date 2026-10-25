#!/usr/bin/env node
/**
 * Verify real npm/pnpm installs of packed artifacts without workspace aliases.
 *
 * First build and sync the adapter and its dependency closure:
 *   pnpm nx sync-dist domscribe-react
 *   pnpm nx sync-dist domscribe-vue
 * Then run (each invocation creates its own registry and consumer):
 *   node scripts/check-packed-vite.mjs npm react 5.4.21
 *   node scripts/check-packed-vite.mjs pnpm vue 7.3.7
 */
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { once } from 'node:events';
import {
  closeSync,
  cpSync,
  mkdtempSync,
  mkdirSync,
  openSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { createRequire } from 'node:module';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { setTimeout } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';

const [manager, framework, viteVersion = '5.4.21'] = process.argv.slice(2);
assert(
  ['npm', 'pnpm'].includes(manager) && ['react', 'vue'].includes(framework),
  'Usage: node scripts/check-packed-vite.mjs <npm|pnpm> <react|vue> [vite-version]',
);
const workspace = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const temporary = mkdtempSync(
  join(tmpdir(), `domscribe-packed-${manager}-${framework}-`),
);
const packages = join(temporary, 'packages');
const tarballs = join(temporary, 'tarballs');
const consumer = join(temporary, 'consumer');
for (const path of [packages, tarballs, consumer]) mkdirSync(path);
const logPath = join(temporary, 'commands.log');
const log = openSync(logPath, 'a');

function run(command, args, cwd = temporary, capture = false) {
  const result = spawnSync(command, args, {
    cwd,
    encoding: 'utf8',
    stdio: capture ? ['ignore', 'pipe', log] : ['ignore', log, log],
  });
  assert.equal(
    result.status,
    0,
    `${command} ${args.join(' ')} failed; see ${logPath}\n${readFileSync(logPath, 'utf8').slice(-5000)}`,
  );
  return result.stdout;
}

const manifests = new Map();
function snapshot(name) {
  if (manifests.has(name)) return;
  const directory = `domscribe-${name.slice('@domscribe/'.length)}`;
  const source = join(workspace, 'dist/packages', directory);
  const manifest = JSON.parse(
    readFileSync(join(source, 'package.json'), 'utf8'),
  );
  assert(
    !JSON.stringify(manifest.dependencies ?? {}).includes('workspace:'),
    `${name} must be synchronized with nx sync-dist before running this check`,
  );
  manifests.set(name, manifest);
  cpSync(source, join(packages, directory), { recursive: true });
  for (const dependency of Object.keys(manifest.dependencies ?? {})) {
    if (dependency.startsWith('@domscribe/')) snapshot(dependency);
  }
}
snapshot(`@domscribe/${framework}`);

const portProbe = createServer();
portProbe.listen(0, '127.0.0.1');
await once(portProbe, 'listening');
const port = portProbe.address().port;
await new Promise((resolve) => portProbe.close(resolve));
const registry = `http://127.0.0.1:${port}`;
const config = join(temporary, 'verdaccio.yml');
writeFileSync(
  config,
  `storage: ${JSON.stringify(join(temporary, 'storage'))}
packages:
  '@domscribe/*':
    access: $all
    publish: $all
log: {type: stdout, format: pretty, level: warn}
publish: {allow_offline: true}
`,
);
const require = createRequire(import.meta.url);
const verdaccioManifest = require.resolve('verdaccio/package.json');
const verdaccioBin = JSON.parse(readFileSync(verdaccioManifest, 'utf8')).bin;
const registryProcess = spawn(
  process.execPath,
  [
    resolve(dirname(verdaccioManifest), verdaccioBin),
    '--config',
    config,
    '--listen',
    `127.0.0.1:${port}`,
  ],
  { stdio: ['ignore', log, log] },
);
let succeeded = false;
try {
  let ready = false;
  for (let attempt = 0; attempt < 100; attempt++) {
    assert.equal(
      registryProcess.exitCode,
      null,
      `Registry exited; see ${logPath}`,
    );
    try {
      ready = (await fetch(`${registry}/-/ping`)).ok;
      if (ready) break;
    } catch {
      /* Wait for the registry socket. */
    }
    await setTimeout(100);
  }
  assert(ready, `Registry did not start; see ${logPath}`);

  const npmrc = `registry=https://registry.npmjs.org/\n@domscribe:registry=${registry}/\n//127.0.0.1:${port}/:_authToken=local-regression\n`;
  const userconfig = join(temporary, '.npmrc');
  writeFileSync(userconfig, npmrc);
  for (const name of manifests.keys()) {
    const directory = `domscribe-${name.slice('@domscribe/'.length)}`;
    const packed = JSON.parse(
      run(
        'npm',
        ['pack', '--json', '--pack-destination', tarballs],
        join(packages, directory),
        true,
      ),
    );
    run('npm', [
      'publish',
      join(tarballs, packed[0].filename),
      `--registry=${registry}`,
      '--userconfig',
      userconfig,
      '--ignore-scripts',
      '--access=public',
      '--tag=local-regression',
    ]);
  }

  writeFileSync(join(consumer, '.npmrc'), npmrc);
  writeFileSync(
    join(consumer, 'package.json'),
    JSON.stringify(
      {
        name: 'domscribe-packed-regression',
        version: '1.0.0',
        private: true,
        type: 'module',
        dependencies: {
          [`@domscribe/${framework}`]: manifests.get(`@domscribe/${framework}`)
            .version,
          [framework]: framework === 'react' ? '18.3.1' : '3.5.44',
          vite: viteVersion,
        },
      },
      null,
      2,
    ),
  );
  writeFileSync(
    join(consumer, 'index.html'),
    '<!doctype html><html><body><h1>Installed package regression</h1></body></html>',
  );
  run(manager, ['install', '--ignore-scripts'], consumer);
  run(process.execPath, [
    join(workspace, 'scripts/check-installed-vite.mjs'),
    consumer,
    framework,
  ]);
  console.log(
    `${manager}/${framework}/Vite ${viteVersion}: packed dependency graph passes`,
  );
  succeeded = true;
} finally {
  if (registryProcess.exitCode === null) {
    const exited = once(registryProcess, 'exit');
    registryProcess.kill();
    await exited;
  }
  closeSync(log);
  if (succeeded) rmSync(temporary, { recursive: true, force: true });
  else console.error(`Regression evidence retained at ${temporary}`);
}
