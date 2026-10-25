#!/usr/bin/env node
// Installs local build artifacts into an isolated public-style consumer. No repo
// lockfile changes, publishing, framework state injection or synthetic clicks.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import net from 'node:net';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { execFileSync } from 'node:child_process';
import { parseArgs } from 'node:util';
import { writeReplayConsumer } from './fixtures/replay-consumer.mjs';
import { replayProject } from './fixtures/replay-project.mjs';
import {
  startOwnedProcess,
  stopOwnedProcess,
  runOwnedBuild,
} from './fixtures/replay-process.mjs';

const { values } = parseArgs({
  options: {
    framework: { type: 'string', default: 'react' },
    'package-manager': { type: 'string', default: 'npm' },
    'vite-version': { type: 'string' },
    'report-dir': { type: 'string' },
    'framework-version': { type: 'string' },
  },
});
const framework = values.framework,
  manager = values['package-manager'],
  viteVersion = values['vite-version'] ?? '7.3.7';
const project = replayProject(
  framework,
  values['framework-version'],
  viteVersion,
);
assert(
  !(project.ssr && values['vite-version']),
  'vite-version is only supported for react/vue',
);
assert(
  ['npm', 'pnpm'].includes(manager),
  'package-manager must be npm or pnpm',
);
assert(
  /^[567]\.\d+\.\d+$/.test(viteVersion),
  'vite-version must be an exact Vite 5/6/7 release',
);
const reportDirectory = values['report-dir']
  ? path.resolve(values['report-dir'])
  : null;
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const work = fs.mkdtempSync(
  path.join(os.tmpdir(), `domscribe-instance-replay-${manager}-${framework}-`),
);
const consumer = path.join(work, 'consumer');
fs.mkdirSync(consumer, { recursive: true });
const packs = path.join(work, 'packages');
fs.mkdirSync(packs);
const names = project.artifacts;
const dependencies = project.dependencies;
let server, browser, log;
const evidence = {
  at: new Date().toISOString(),
  node: process.version,
  framework,
  packageManager: manager,
  requestedVite: project.ssr ? undefined : viteVersion,
  requestedFrameworkVersion: project.ssr ? project.requestedVersion : undefined,
  bundler: project.bundler,
  installMode: 'local-tarballs',
  localArtifactOverrides: manager === 'pnpm',
  work,
  consumer,
  checks: [],
};
const check = (name, details) =>
  evidence.checks.push({ name, pass: true, ...details });
async function stopServer() {
  await stopOwnedProcess(server);
  server = undefined;
}
try {
  for (const name of names) {
    const artifact = path.join(root, 'dist/packages', `domscribe-${name}`);
    const manifest = JSON.parse(
      fs.readFileSync(path.join(artifact, 'package.json'), 'utf8'),
    );
    assert(
      !JSON.stringify(manifest.dependencies ?? {}).includes('workspace:'),
      'Build and sync-dist artifacts before running replay verification',
    );
    const snapshot = path.join(packs, `domscribe-${name}`);
    fs.cpSync(artifact, snapshot, { recursive: true });
    const result = JSON.parse(
      execFileSync(
        'npm',
        [
          'pack',
          snapshot,
          '--pack-destination',
          packs,
          '--ignore-scripts',
          '--json',
        ],
        { encoding: 'utf8', timeout: 30000 },
      ),
    );
    dependencies[`@domscribe/${name}`] =
      `file:${path.join(packs, result[0].filename)}`;
  }
  fs.writeFileSync(
    path.join(consumer, 'package.json'),
    JSON.stringify(
      {
        private: true,
        type: 'module',
        dependencies,
        ...(manager === 'pnpm'
          ? {
              pnpm: {
                overrides: Object.fromEntries(
                  names.map((name) => [
                    `@domscribe/${name}`,
                    dependencies[`@domscribe/${name}`],
                  ]),
                ),
              },
            }
          : {}),
      },
      null,
      2,
    ),
  );
  const installArgs =
    manager === 'npm'
      ? ['install', '--ignore-scripts', '--no-audit', '--no-fund']
      : ['install', '--ignore-scripts', '--config.auto-install-peers=false'];
  try {
    fs.writeFileSync(
      path.join(work, 'install.log'),
      execFileSync(manager, installArgs, {
        cwd: consumer,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
        timeout: 180000,
      }),
    );
  } catch (error) {
    fs.writeFileSync(
      path.join(work, 'install.log'),
      `${error.stdout ?? ''}\n${error.stderr ?? ''}`,
    );
    throw error;
  }
  writeReplayConsumer(consumer, framework);

  async function freePort() {
    const server = net.createServer();
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    const port = server.address().port;
    await new Promise((resolve) => server.close(resolve));
    return port;
  }
  async function until(fn, timeoutMs = 10000) {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      try {
        const value = await fn();
        if (value) return value;
      } catch {}
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    throw new Error('Timed out waiting for dev server/browser readiness');
  }
  const fixtureRequire = createRequire(
    path.join(root, 'packages/domscribe-test-fixtures/package.json'),
  );
  const { chromium } = fixtureRequire('playwright');
  const consumerRequire = createRequire(path.join(consumer, 'package.json'));
  const { replaySteps } = await import(
    pathToFileURL(consumerRequire.resolve('@domscribe/core')).href
  );
  const { RelayHttpClient } = await import(
    pathToFileURL(consumerRequire.resolve('@domscribe/relay/client')).href
  );
  const installed = JSON.parse(
    fs.readFileSync(
      path.join(
        consumer,
        'node_modules',
        project.versionPackage,
        'package.json',
      ),
      'utf8',
    ),
  );
  assert.equal(installed.version, project.requestedVersion);
  evidence.installedVite = project.ssr ? undefined : installed.version;
  evidence.appFrameworkVersion = project.ssr ? installed.version : undefined;
  evidence.frameworkVersion = JSON.parse(
    fs.readFileSync(
      path.join(consumer, 'node_modules', project.ui, 'package.json'),
      'utf8',
    ),
  ).version;
  evidence.packageManagerVersion = execFileSync(manager, ['--version'], {
    encoding: 'utf8',
  }).trim();
  const runtimePath = fs.realpathSync(
    consumerRequire.resolve('@domscribe/runtime'),
  );
  for (const name of new Set(['overlay', project.ui, framework])) {
    const packageRequire = createRequire(
      consumerRequire.resolve(`@domscribe/${name}`),
    );
    assert.equal(
      fs.realpathSync(packageRequire.resolve('@domscribe/runtime')),
      runtimePath,
      `${name} must use the same local runtime`,
    );
  }
  const cli = path.join(consumer, 'node_modules', project.cli);
  const port = await freePort();
  log = fs.openSync(path.join(work, 'server.log'), 'a');
  const serverEnv = {
    ...process.env,
    NEXT_TELEMETRY_DISABLED: '1',
    NUXT_TELEMETRY_DISABLED: '1',
    RAYON_NUM_THREADS: '2',
    HOST: '127.0.0.1',
    PORT: String(port),
    NODE_OPTIONS: '--max-old-space-size=4096',
  };
  function startServer(entry, args) {
    return startOwnedProcess(process.execPath, [entry, ...args], {
      cwd: consumer,
      env: serverEnv,
      stdio: ['ignore', log, log],
    });
  }
  server = startServer(cli, project.devArgs(port));
  await until(
    async () =>
      (
        await fetch(`http://127.0.0.1:${port}`, {
          signal: AbortSignal.timeout(1000),
        })
      ).ok,
    project.ssr ? 120000 : 10000,
  );
  browser = await chromium.launch({
    headless: true,
    args: ['--disable-dev-shm-usage'],
  });
  evidence.chromium = browser.version();
  let context = await browser.newContext();
  let page = await context.newPage();
  const errors = [];
  evidence.pageErrors = errors;
  const consoleErrors = [],
    networkErrors = [];
  evidence.consoleErrors = consoleErrors;
  evidence.networkErrors = networkErrors;
  function observePage(page) {
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (message) => {
      if (message.type() === 'error') consoleErrors.push(message.text());
    });
    page.on('requestfailed', (request) => {
      if (request.failure()?.errorText !== 'net::ERR_ABORTED')
        networkErrors.push({
          url: request.url(),
          error: request.failure()?.errorText,
        });
    });
    page.on('response', (response) => {
      if (response.status() >= 400)
        networkErrors.push({ url: response.url(), status: response.status() });
    });
  }
  observePage(page);
  await page.goto(`http://127.0.0.1:${port}`);
  await page.waitForFunction(() => window.__runtime?.isReady());
  const relayPort = await page.evaluate(() => window.__DOMSCRIBE_RELAY_PORT__);
  const client = new RelayHttpClient('127.0.0.1', relayPort);
  await until(
    async () =>
      (await client.queryTargets({ mode: 'list' })).status === 'listed',
  );
  const edit = page
    .getByRole('article', { name: 'Lyra', exact: true })
    .getByRole('button', { name: 'Edit' });
  const selected = await edit.evaluate((element) =>
    window.__runtime.describeTarget(element),
  );
  const source = await (
    await fetch(
      `http://127.0.0.1:${relayPort}/api/v1/manifest/resolve?id=${selected.entryId}`,
    )
  ).json();
  const bySource = await client.queryBySource({
    file: source.entry.file,
    line: source.entry.start.line,
    column: source.entry.start.column,
  });
  assert(
    source.entry.file.endsWith(project.expectedSource),
    'Mapped source must belong to the selected framework fixture',
  );
  evidence.mappedSource = source.entry.file;
  assert.equal(bySource.selectionStatus, 'ambiguous');
  assert.equal(bySource.total, 3);
  assert.equal(bySource.runtime.componentProps, undefined);
  const exact = await client.queryBySource({
    file: source.entry.file,
    line: source.entry.start.line,
    column: source.entry.start.column,
    instanceId: selected.instanceId,
  });
  assert.equal(exact.runtime.componentProps.customer.name, 'Lyra');
  check('source ambiguity refused; exact instance has Lyra props', {
    instances: bySource.total,
  });
  const steps = [];
  async function record(locator, action) {
    steps.push(
      await locator.evaluate(
        (element, action) => window.__runtime.createReplayStep(element, action),
        action,
      ),
    );
  }
  await record(edit, { action: 'click' });
  await edit.click();
  const city = page.getByRole('textbox', { name: 'Shipping city' });
  await record(city, { action: 'fill', value: 'Austin' });
  await city.fill('Austin');
  const confirmed = page.getByRole('checkbox', {
    name: 'Confirm shipping change',
  });
  await record(confirmed, { action: 'check', checked: true });
  await confirmed.check();
  const field = await city.evaluate((element) =>
    window.__runtime.describeTarget(element),
  );
  const liveEditor = await client.queryTargets({
    instanceId: field.instanceId,
  });
  assert.equal(liveEditor.status, 'resolved');
  assert.equal(liveEditor.context.componentProps.customer.name, 'Lyra');
  const editorState = liveEditor.context.componentState;
  assert.equal(
    project.ui === 'vue' ? editorState.city : editorState.state_0,
    'Austin',
  );
  assert.equal(
    project.ui === 'vue' ? editorState.confirmed : editorState.state_1,
    true,
  );
  check('exact editor instance exposes committed typed and checked state', {
    state: editorState,
  });
  const save = page.getByRole('button', { name: 'Save', exact: true });
  await record(save, { action: 'click' });
  await save.click();
  assert.equal(
    (await client.queryTargets({ instanceId: field.instanceId })).status,
    'stale',
  );
  check('unmounted editor handle is stale after saving', {});
  const trace = { version: 1, steps };
  const annotation = await client.createAnnotation({
    mode: 'element-click',
    interaction: {
      type: 'element-annotation',
      selectedElement: {
        tagName: 'button',
        selector: selected.selector,
        dataDs: selected.entryId,
        target: selected,
      },
    },
    context: {
      pageUrl: page.url(),
      pageTitle: await page.title(),
      viewport: { width: 1280, height: 720 },
      userAgent: await page.evaluate(() => navigator.userAgent),
      userMessage: 'Replay updates Lyra only',
      runtimeContext: exact.runtime,
      replay: trace,
    },
  });
  fs.writeFileSync(
    path.join(work, 'trace.json'),
    JSON.stringify(trace, null, 2),
  );
  await context.close();
  context = await browser.newContext();
  page = await context.newPage();
  observePage(page);
  await page.goto(`http://127.0.0.1:${port}`);
  await page.waitForFunction(() => window.__runtime?.isReady());
  await until(
    async () =>
      (await client.queryTargets({ mode: 'list' })).status === 'listed',
  );
  await page.getByRole('button', { name: 'Sort', exact: true }).click();
  assert.equal(
    (await client.queryTargets({ instanceId: selected.instanceId })).status,
    'stale',
  );
  const saved = await client.getAnnotation(annotation.metadata.id);
  const replay = await replaySteps(saved.context.replay, {
    resolve: (locator) => client.queryTargets({ locator }),
    async act(step, target) {
      const element = page.locator(target.selector);
      if (step.action === 'click') await element.click();
      else if (step.action === 'fill') await element.fill(step.value);
      else if (step.action === 'check') await element.setChecked(step.checked);
      else if (step.action === 'select') await element.selectOption(step.value);
    },
  });
  assert.equal(replay.status, 'completed');
  assert.equal(replay.completed, 4);
  assert.equal(
    await page
      .getByRole('article', { name: 'Lyra', exact: true })
      .locator('strong')
      .innerText(),
    'Austin',
  );
  assert.equal(
    await page
      .getByRole('article', { name: 'Orion', exact: true })
      .locator('strong')
      .innerText(),
    'Seattle',
  );
  assert.equal(
    await page
      .getByRole('article', { name: 'Vega', exact: true })
      .locator('strong')
      .innerText(),
    'Denver',
  );
  check(
    'persisted annotation replayed in fresh Chromium context with reordered rows',
    { annotationId: annotation.metadata.id, steps: replay.completed },
  );
  const ambiguous = JSON.parse(JSON.stringify(trace));
  ambiguous.steps[0].target.ancestors = [];
  const stopped = await replaySteps(ambiguous, {
    resolve: (locator) => client.queryTargets({ locator }),
    async act() {
      throw new Error('Must not act on an ambiguous target');
    },
  });
  assert.equal(stopped.reason, 'ambiguous');
  assert.equal(stopped.completed, 0);
  check('ambiguous replay stops before any action', {});
  assert.deepEqual(errors, []);
  assert.deepEqual(consoleErrors, []);
  assert.deepEqual(networkErrors, []);
  check('no application page errors', { errors });
  await page.screenshot({ path: path.join(work, 'replayed.png') });
  await context.close();
  await stopServer();
  await runOwnedBuild(process.execPath, [cli, ...project.buildArgs], {
    cwd: consumer,
    env: { ...serverEnv, NODE_ENV: 'production' },
    logPath: path.join(work, 'production-build.log'),
  });
  server = startServer(
    project.productionEntry
      ? path.join(consumer, project.productionEntry)
      : cli,
    project.productionArgs(port),
  );
  await until(
    async () =>
      (
        await fetch(`http://127.0.0.1:${port}`, {
          signal: AbortSignal.timeout(1000),
        })
      ).ok,
    project.ssr ? 120000 : 10000,
  );
  const production = await browser.newPage();
  observePage(production);
  await production.goto(`http://127.0.0.1:${port}`);
  await production
    .getByRole('heading', { name: 'Customer operations' })
    .waitFor();
  assert.equal(
    await production.locator('[data-ds], [data-ds-instance]').count(),
    0,
  );
  await production
    .getByRole('article', { name: 'Lyra', exact: true })
    .getByRole('button', { name: 'Edit' })
    .click();
  await production
    .getByRole('textbox', { name: 'Shipping city' })
    .waitFor({ state: 'visible' });
  assert.equal(
    await production.locator('[data-ds], [data-ds-instance]').count(),
    0,
  );
  check('production DOM has no source or instance instrumentation', {});
  await production
    .getByRole('textbox', { name: 'Shipping city' })
    .fill('Dallas');
  await production
    .getByRole('checkbox', { name: 'Confirm shipping change' })
    .check();
  await production.getByRole('button', { name: 'Save', exact: true }).click();
  assert.equal(
    await production
      .getByRole('article', { name: 'Lyra', exact: true })
      .locator('strong')
      .innerText(),
    'Dallas',
  );
  assert.equal(
    await production
      .getByRole('article', { name: 'Orion', exact: true })
      .locator('strong')
      .innerText(),
    'Seattle',
  );
  assert.deepEqual(errors, []);
  assert.deepEqual(consoleErrors, []);
  assert.deepEqual(networkErrors, []);
  check(
    'production UI still updates only the selected customer without page errors',
    {},
  );
} catch (error) {
  evidence.error = error.stack;
  evidence.failureScreenshots = [];
  for (const [index, page] of (
    browser?.contexts().flatMap((context) => context.pages()) ?? []
  ).entries()) {
    const file = `failure-${index}.png`;
    try {
      await page.screenshot({ path: path.join(work, file), timeout: 3000 });
      evidence.failureScreenshots.push(file);
    } catch {
      /* Preserve the original failure even if the page cannot be captured. */
    }
  }
  process.exitCode = 1;
} finally {
  await browser?.close();
  await stopServer();
  if (log !== undefined) fs.closeSync(log);
  const lock = path.join(consumer, '.domscribe/relay.lock');
  if (fs.existsSync(lock)) {
    const relay = JSON.parse(fs.readFileSync(lock, 'utf8'));
    if (relay.workspaceRoot === consumer) {
      try {
        process.kill(relay.pid, 'SIGTERM');
      } catch {}
    }
  }
  fs.writeFileSync(
    path.join(work, 'result.json'),
    JSON.stringify(evidence, null, 2),
  );
  if (reportDirectory) {
    fs.mkdirSync(reportDirectory, { recursive: true });
    for (const name of [
      'result.json',
      'trace.json',
      'replayed.png',
      'production-build.log',
      'install.log',
      'server.log',
      ...(evidence.failureScreenshots ?? []),
    ]) {
      const from = path.join(work, name);
      if (fs.existsSync(from))
        fs.copyFileSync(from, path.join(reportDirectory, name));
    }
  }
  console.log(JSON.stringify(evidence, null, 2));
}
