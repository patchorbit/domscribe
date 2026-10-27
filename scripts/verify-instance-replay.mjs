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
import {
  captureIssuePacket,
  verifyIssueOffline,
} from './fixtures/issue-handoff.mjs';
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
    scope: { type: 'string', default: 'article' },
    'package-manager': { type: 'string', default: 'npm' },
    'vite-version': { type: 'string' },
    'report-dir': { type: 'string' },
    'framework-version': { type: 'string' },
    'schema-peer': { type: 'boolean', default: false },
    'adapter-only': { type: 'boolean', default: false },
    'raw-runtime': { type: 'boolean', default: false },
    'no-overlay': { type: 'boolean', default: false },
    'issue-handoff': { type: 'boolean', default: false },
  },
});
const scope = values.scope;
assert(
  ['article', 'table', 'list'].includes(scope),
  'scope must be article, table or list',
);
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
  /^[5678]\.\d+\.\d+$/.test(viteVersion),
  'vite-version must be an exact Vite 5/6/7/8 release',
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
assert(
  !values['issue-handoff'] || (!project.ssr && !values['no-overlay']),
  'issue-handoff requires a React/Vue Vite consumer with overlay',
);
const names = values['issue-handoff']
  ? [...project.artifacts, 'cli']
  : project.artifacts;
const dependencies = project.dependencies;
assert(
  !values['schema-peer'] || !project.ssr,
  'schema-peer covers Vite consumers',
);
if (values['schema-peer']) dependencies.zod = '3.25.32';
assert(
  !values['no-overlay'] || values['schema-peer'],
  'no-overlay is initialization-only and requires schema-peer',
);
assert(
  !values['adapter-only'] || (manager === 'pnpm' && values['schema-peer']),
  'adapter-only requires pnpm/schema-peer',
);
let server, browser, log;
const evidence = {
  at: new Date().toISOString(),
  node: process.version,
  framework,
  scope,
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
    dependencies[manifest.name] =
      `file:${path.join(packs, result[0].filename)}`;
  }
  fs.writeFileSync(
    path.join(consumer, 'package.json'),
    JSON.stringify(
      {
        private: true,
        type: 'module',
        dependencies: values['adapter-only']
          ? Object.fromEntries(
              Object.entries(dependencies).filter(
                ([name]) =>
                  !name.startsWith('@domscribe/') ||
                  name === `@domscribe/${framework}`,
              ),
            )
          : dependencies,
        ...(manager === 'pnpm'
          ? {
              pnpm: {
                overrides: Object.fromEntries(
                  names.map((name) => [
                    name === 'cli' ? 'domscribe' : `@domscribe/${name}`,
                    dependencies[
                      name === 'cli' ? 'domscribe' : `@domscribe/${name}`
                    ],
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
  writeReplayConsumer(consumer, framework, scope);
  if (values['schema-peer']) {
    const file = path.join(
      consumer,
      'src',
      framework === 'vue' ? 'main.js' : 'main.jsx',
    );
    let code = fs
      .readFileSync(file, 'utf8')
      .replace(
        "if(import.meta.env.DEV)import('@domscribe/runtime').then(({RuntimeManager})=>window.__runtime=RuntimeManager.getInstance());",
        '',
      );
    code =
      "import{z}from'zod';window.__APP_SCHEMA_PROBE__={value:z.string().parse('app-zod3'),partialRecord:typeof z.partialRecord};if(import.meta.env.DEV)window.__FIXTURE_DOCUMENT__=crypto.randomUUID();\n" +
      code;
    fs.writeFileSync(file, code);
    const config = path.join(consumer, 'vite.config.mjs');
    fs.appendFileSync(
      config,
      `
function createProbe(){return{name:'fixture-runtime-probe',apply:'serve',async resolveId(id){if(id==='/@fixture/runtime-probe.js')return id;if(id==='fixture-runtime'){const {createRequire}=await import('node:module');const adapter=createRequire(import.meta.url).resolve('@domscribe/${framework}');return this.resolve('@domscribe/runtime',adapter,{skipSelf:true})}},load(id){if(id==='/@fixture/runtime-probe.js')return "import{RuntimeManager}from'fixture-runtime';window.__runtime=RuntimeManager.getInstance();"},transformIndexHtml(){return[{tag:'script',attrs:{type:'module'},children:"import('/@fixture/runtime-probe.js')",injectTo:'body'}]}}};
`,
    );
    let configuration = fs
      .readFileSync(config, 'utf8')
      .replace('plugins:[framework(),', 'plugins:[createProbe(),framework(),');
    if (values['no-overlay'])
      configuration = configuration.replace('overlay:true', 'overlay:false');
    if (values['raw-runtime'])
      configuration = configuration.replace(
        'defineConfig({',
        'defineConfig({optimizeDeps:{exclude:["@domscribe/runtime"]},',
      );
    fs.writeFileSync(config, configuration);
  }

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
      } catch {
        // A starting server/relay may reject requests until its next poll.
      }
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    throw new Error('Timed out waiting for dev server/browser readiness');
  }
  const fixtureRequire = createRequire(
    path.join(root, 'packages/domscribe-test-fixtures/package.json'),
  );
  const { chromium } = fixtureRequire('playwright');
  const consumerRequire = createRequire(path.join(consumer, 'package.json'));
  const adapterRequire = project.ssr
    ? consumerRequire
    : createRequire(consumerRequire.resolve(`@domscribe/${framework}`));
  const transformRequire = project.ssr
    ? consumerRequire
    : createRequire(
        adapterRequire.resolve('@domscribe/transform/plugins/vite'),
      );
  const overlayRequire = createRequire(
    transformRequire.resolve('@domscribe/overlay'),
  );
  const { replaySteps } = await import(
    pathToFileURL(adapterRequire.resolve('@domscribe/core')).href
  );
  const { RelayHttpClient } = await import(
    pathToFileURL(overlayRequire.resolve('@domscribe/relay/client')).href
  );
  if (values['adapter-only']) {
    assert(
      !fs.existsSync(path.join(consumer, 'node_modules/@domscribe/runtime')),
    );
    assert(
      !fs.existsSync(path.join(consumer, 'node_modules/@domscribe/overlay')),
    );
    check('adapter-only install has no top-level runtime or overlay');
  }
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
    adapterRequire.resolve('@domscribe/runtime'),
  );
  for (const name of new Set(['overlay', project.ui, framework])) {
    const packageRequire = createRequire(
      name === 'overlay'
        ? transformRequire.resolve('@domscribe/overlay')
        : consumerRequire.resolve(`@domscribe/${name}`),
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
  if (values['schema-peer']) {
    await page.waitForFunction(() => window.__APP_SCHEMA_PROBE__);
    assert.deepEqual(await page.evaluate(() => window.__APP_SCHEMA_PROBE__), {
      value: 'app-zod3',
      partialRecord: 'undefined',
    });
    check('application retains Zod3 schema behavior', {});
  }
  await page.waitForFunction(() => window.__runtime?.isReady());
  let relayPort = await page.evaluate(() => window.__DOMSCRIBE_RELAY_PORT__);
  let client = new RelayHttpClient('127.0.0.1', relayPort);
  if (!values['no-overlay'])
    await until(
      async () =>
        (await client.queryTargets({ mode: 'list' })).status === 'listed',
    );
  if (values['schema-peer']) {
    check(
      'cold first navigation initializes with independent schema majors',
      {},
    );
    const firstDocument = await page.evaluate(
      () => window.__FIXTURE_DOCUMENT__,
    );
    await page.waitForLoadState('networkidle');
    await context.close();
    await stopServer();
    server = startServer(cli, [...project.devArgs(port), '--force']);
    await until(
      async () =>
        (
          await fetch(`http://127.0.0.1:${port}`, {
            signal: AbortSignal.timeout(1000),
          })
        ).ok,
    );
    context = await browser.newContext();
    page = await context.newPage();
    observePage(page);
    await page.goto(`http://127.0.0.1:${port}`);
    await page.waitForFunction(() => window.__runtime?.isReady());
    assert.notEqual(
      await page.evaluate(() => window.__FIXTURE_DOCUMENT__),
      firstDocument,
    );
    assert.deepEqual(await page.evaluate(() => window.__APP_SCHEMA_PROBE__), {
      value: 'app-zod3',
      partialRecord: 'undefined',
    });
    relayPort = await page.evaluate(() => window.__DOMSCRIBE_RELAY_PORT__);
    client = new RelayHttpClient('127.0.0.1', relayPort);
    if (!values['no-overlay'])
      await until(
        async () =>
          (await client.queryTargets({ mode: 'list' })).status === 'listed',
      );
    check(
      'forced optimizer restart preserves initialization and shared runtime',
      {},
    );
  }
  if (values['no-overlay']) {
    evidence.scope = 'initialization-only';
    assert.equal(await page.locator('ds-overlay').count(), 0);
    const result = await page.evaluate(async () => {
      const button = Array.from(
        document.querySelectorAll('button[data-ds]'),
      ).find((element) => element.textContent.trim() === 'Edit');
      const target = window.__runtime.describeTarget(button);
      return window.__runtime.queryTargets({ instanceId: target.instanceId });
    });
    assert.equal(result.status, 'resolved');
    assert(result.context?.componentProps?.customer?.id);
    assert.deepEqual(errors, []);
    assert.deepEqual(consoleErrors, []);
    assert.deepEqual(networkErrors, []);
    check(
      'overlay disabled preserves ready adapter and exact-instance runtime capture',
      {},
    );
  } else {
    function customer(page, name) {
      return scope === 'article'
        ? page.getByRole('article', { name, exact: true })
        : page
            .getByRole(scope === 'table' ? 'row' : 'listitem')
            .filter({ has: page.getByText(name, { exact: true }) });
    }
    const edit = customer(page, 'Lyra').getByRole('button', { name: 'Edit' });
    const selected = await edit.evaluate((element) =>
      window.__runtime.describeTarget(element),
    );
    assert(selected?.entryId, 'The selected action must be instrumented');
    const source = await until(async () => {
      const response = await fetch(
        `http://127.0.0.1:${relayPort}/api/v1/manifest/resolve?id=${selected.entryId}`,
      );
      const result = await response.json();
      // The runtime can connect before the manifest's batched write/poll lands.
      return response.ok && result.entry ? result : null;
    });
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
          (element, action) =>
            window.__runtime.createReplayStep(element, action),
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
    if (!values['no-overlay'])
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
        else if (step.action === 'check')
          await element.setChecked(step.checked);
        else if (step.action === 'select')
          await element.selectOption(step.value);
      },
    });
    assert.equal(replay.status, 'completed');
    assert.equal(replay.completed, 4);
    assert.equal(
      await customer(page, 'Lyra').locator('strong').innerText(),
      'Austin',
    );
    assert.equal(
      await customer(page, 'Orion').locator('strong').innerText(),
      'Seattle',
    );
    assert.equal(
      await customer(page, 'Vega').locator('strong').innerText(),
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
    if (scope !== 'article') {
      const edit = customer(page, 'Lyra').getByRole('button', { name: 'Edit' });
      const retained = await edit.elementHandle();
      const before = await edit.evaluate((element) =>
        window.__runtime.describeTarget(element),
      );
      await page
        .getByRole('button', { name: 'Recycle Lyra', exact: true })
        .click();
      const replacement = customer(page, 'Aster').getByRole('button', {
        name: 'Edit',
      });
      assert(
        await replacement.evaluate(
          (element, retained) => element === retained,
          retained,
        ),
        'Fixture must genuinely reuse the same action DOM node',
      );
      assert.equal(
        (await client.queryTargets({ instanceId: before.instanceId })).status,
        'stale',
      );
      assert.equal(await page.locator(before.selector).count(), 0);
      assert.equal(
        (await client.queryTargets({ locator: before.locator })).status,
        'not_found',
      );
      const current = await replacement.evaluate((element) =>
        window.__runtime.describeTarget(element),
      );
      const live = await client.queryTargets({
        instanceId: current.instanceId,
      });
      assert.equal(live.context.componentProps.customer.id, 'c4');
      assert.equal(live.context.componentProps.customer.name, 'Aster');
      await replacement.click();
      await page.getByRole('textbox', { name: 'Shipping city' }).fill('Tucson');
      await page
        .getByRole('checkbox', { name: 'Confirm shipping change' })
        .check();
      await page.getByRole('button', { name: 'Save', exact: true }).click();
      assert.equal(
        await customer(page, 'Aster').locator('strong').innerText(),
        'Tucson',
      );
      assert.equal(
        await customer(page, 'Orion').locator('strong').innerText(),
        'Seattle',
      );
      assert.equal(
        await customer(page, 'Vega').locator('strong').innerText(),
        'Denver',
      );
      await retained.dispose();
      check(
        'recycled action node retires its old target; recaptured runtime and UI address only the new business entity',
        { old: 'c2', current: 'c4' },
      );
    }
    assert.deepEqual(errors, []);
    assert.deepEqual(consoleErrors, []);
    assert.deepEqual(networkErrors, []);
    check('no application page errors', { errors });
    await page.screenshot({ path: path.join(work, 'replayed.png') });
    const handoff = values['issue-handoff']
      ? await captureIssuePacket({ page, consumer, work, client })
      : undefined;
    await context.close();
    await stopServer();
    if (handoff) {
      evidence.issueHandoff = await verifyIssueOffline({
        consumer,
        work,
        handoff,
        relayPort,
      });
      check(
        'native annotation exported and inspected offline in fresh source worktree without JSON edits',
        evidence.issueHandoff,
      );
    }
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
    await customer(production, 'Lyra')
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
      await customer(production, 'Lyra').locator('strong').innerText(),
      'Dallas',
    );
    assert.equal(
      await customer(production, 'Orion').locator('strong').innerText(),
      'Seattle',
    );
    assert.deepEqual(errors, []);
    assert.deepEqual(consoleErrors, []);
    assert.deepEqual(networkErrors, []);
    check(
      'production UI still updates only the selected customer without page errors',
      {},
    );
  }
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
      } catch {
        // The owned server group may already have stopped its relay.
      }
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
      'issue.domscribe.json',
      'native-annotation.json',
      'native-annotation.png',
      'issue-handoff-result.json',
      'issue-export.log',
      'issue-stop-reporter.log',
      'issue-inspect-matched.log',
      'issue-inspect-markdown.log',
      'issue-inspect-changed.log',
      ...(evidence.failureScreenshots ?? []),
    ]) {
      const from = path.join(work, name);
      if (fs.existsSync(from))
        fs.copyFileSync(from, path.join(reportDirectory, name));
    }
  }
  console.log(JSON.stringify(evidence, null, 2));
}
