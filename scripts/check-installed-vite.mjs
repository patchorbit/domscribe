#!/usr/bin/env node
/**
 * Black-box regression check for published/packed Vite integrations.
 *
 * Install the packages into an otherwise clean consumer first, using npm or
 * pnpm, then run:
 *   node scripts/check-installed-vite.mjs /absolute/path/to/consumer react
 *   node scripts/check-installed-vite.mjs /absolute/path/to/consumer vue
 *
 * The consumer needs only vite, its framework, and @domscribe/<framework>.
 * No workspace aliases, hoisting settings, or direct transitive dependencies.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { createServer as createPortProbe } from 'node:net';
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const [consumerPath, framework] = process.argv.slice(2);
assert(
  consumerPath && ['react', 'vue'].includes(framework),
  'Usage: node scripts/check-installed-vite.mjs <consumer-directory> <react|vue>',
);
const consumerRoot = resolve(consumerPath);
const consumerRequire = createRequire(resolve(consumerRoot, 'package.json'));
const viteManifestPath = consumerRequire.resolve('vite/package.json');
const viteManifest = JSON.parse(readFileSync(viteManifestPath, 'utf8'));
const viteExport = viteManifest.exports['.'];
const viteImport =
  typeof viteExport === 'string'
    ? viteExport
    : (viteExport.import ?? viteExport.default);
const viteEntry =
  typeof viteImport === 'string' ? viteImport : viteImport.default;
const { createServer } = await import(
  pathToFileURL(resolve(dirname(viteManifestPath), viteEntry)).href
);
const { domscribe } = await import(
  pathToFileURL(consumerRequire.resolve(`@domscribe/${framework}/vite`)).href
);
// Vite 5 treats a configured port of zero as its default port. Reserve an
// ephemeral port explicitly so parallel package checks stay isolated.
const portProbe = createPortProbe();
await new Promise((resolve) => portProbe.listen(0, '127.0.0.1', resolve));
const port = portProbe.address().port;
await new Promise((resolve) => portProbe.close(resolve));
const server = await createServer({
  root: consumerRoot,
  configFile: false,
  plugins: [domscribe({ relay: { autoStart: false } })],
  server: { port, host: '127.0.0.1', strictPort: true, watch: null },
  optimizeDeps: { force: true },
});

try {
  await server.listen();
  const address = server.httpServer.address();
  assert(address && typeof address === 'object');
  const origin = `http://127.0.0.1:${address.port}`;
  const sources = new Map();
  const pending = [
    `/@domscribe/${framework}-init.js`,
    '/@domscribe/overlay-init.js',
  ];

  while (pending.length) {
    const path = pending.shift();
    if (sources.has(path)) continue;
    const response = await fetch(new URL(path, origin));
    const code = await response.text();
    assert.equal(response.status, 200, `${path}: ${code.slice(0, 1200)}`);
    assert(
      !code.startsWith('<!DOCTYPE'),
      `${path} returned HTML instead of a module`,
    );
    sources.set(path, code);

    // Follow Vite's emitted module imports, including optimized dependencies.
    for (const match of code.matchAll(
      /\b(?:from|import)\s*(?:\(\s*)?["']([^"']+)["']/g,
    )) {
      const specifier = match[1];
      if (/^(?:\/|\.\.?\/)/.test(specifier)) {
        const dependency = new URL(specifier, new URL(path, origin));
        pending.push(dependency.pathname + dependency.search);
      }
    }
  }

  const runtimeModules = [...sources].filter(([, code]) =>
    /class\s+_?RuntimeManager\b|\bRuntimeManager\s*=\s*class\b/.test(code),
  );
  assert.equal(
    runtimeModules.length,
    1,
    `Expected one shared RuntimeManager module, found ${runtimeModules.map(([path]) => path).join(', ')}`,
  );
  assert(
    [...sources.values()].some((code) => code.includes('ds-overlay')),
    'The overlay and its transitive dependencies must be served successfully',
  );
  console.log(
    `${framework}: ${sources.size} installed modules served; one shared RuntimeManager`,
  );
} finally {
  await server.close();
}
