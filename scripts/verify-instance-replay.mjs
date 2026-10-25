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
import { execFileSync, spawn } from 'node:child_process';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const work = fs.mkdtempSync(
  path.join(os.tmpdir(), 'domscribe-instance-replay-'),
);
const consumer = path.join(work, 'consumer');
fs.mkdirSync(consumer, { recursive: true });
const packs = path.join(work, 'packages');
fs.mkdirSync(packs);
const names = [
  'core',
  'manifest',
  'runtime',
  'relay',
  'overlay',
  'transform',
  'react',
  'verify',
];
const dependencies = {
  react: '18.3.1',
  'react-dom': '18.3.1',
  vite: '7.3.7',
  '@vitejs/plugin-react': '4.7.0',
};
for (const name of names) {
  const result = JSON.parse(
    execFileSync(
      'npm',
      [
        'pack',
        path.join(root, 'dist/packages', `domscribe-${name}`),
        '--pack-destination',
        packs,
        '--ignore-scripts',
        '--json',
      ],
      { encoding: 'utf8' },
    ),
  );
  dependencies[`@domscribe/${name}`] =
    `file:${path.join(packs, result[0].filename)}`;
}
fs.writeFileSync(
  path.join(consumer, 'package.json'),
  JSON.stringify({ private: true, type: 'module', dependencies }, null, 2),
);
fs.writeFileSync(
  path.join(work, 'install.log'),
  execFileSync(
    'npm',
    ['install', '--ignore-scripts', '--no-audit', '--no-fund'],
    { cwd: consumer, encoding: 'utf8' },
  ),
);
fs.mkdirSync(path.join(consumer, 'src'));
fs.writeFileSync(
  path.join(consumer, 'index.html'),
  '<html><head><title>Instance replay regression</title></head><body><div id="root"></div><script type="module" src="/src/main.jsx"></script></body></html>',
);
fs.writeFileSync(
  path.join(consumer, 'src/main.jsx'),
  `
import React,{useState} from 'react';import{createRoot}from'react-dom/client';
if(import.meta.env.DEV)import('@domscribe/runtime').then(({RuntimeManager})=>window.__runtime=RuntimeManager.getInstance());
function Card({customer,onEdit}){return <article aria-label={customer.name}><h2>{customer.name}</h2><strong>{customer.city}</strong><button onClick={()=>onEdit(customer)}>Edit</button></article>}
function Editor({customer,onSave}){const[city,setCity]=useState(customer.city);const[confirmed,setConfirmed]=useState(false);return <section role="dialog" aria-label={'Edit '+customer.name}><label>Shipping city<input name="city" value={city} onChange={e=>setCity(e.target.value)}/></label><label><input type="checkbox" checked={confirmed} onChange={e=>setConfirmed(e.target.checked)}/>Confirm shipping change</label><button disabled={!confirmed} onClick={()=>onSave(customer.id,city)}>Save</button></section>}
function App(){const[customers,setCustomers]=useState([{id:'c1',name:'Orion',city:'Seattle'},{id:'c2',name:'Lyra',city:'Portland'},{id:'c3',name:'Vega',city:'Denver'}]);const[editing,setEditing]=useState(null);const[reverse,setReverse]=useState(false);const sorted=[...customers].sort((a,b)=>reverse?b.name.localeCompare(a.name):a.name.localeCompare(b.name));return <main><h1>Customer operations</h1><button onClick={()=>setReverse(x=>!x)}>Sort</button>{sorted.map(customer=><Card key={customer.id} customer={customer} onEdit={setEditing}/>)}{editing&&<Editor customer={editing} onSave={(id,city)=>{setCustomers(all=>all.map(c=>c.id===id?{...c,city}:c));setEditing(null)}}/>}</main>}
createRoot(document.getElementById('root')).render(<App/>);
`,
);
fs.writeFileSync(
  path.join(consumer, 'vite.config.mjs'),
  "import{defineConfig}from'vite';import react from'@vitejs/plugin-react';import{domscribe}from'@domscribe/react/vite';export default defineConfig({plugins:[react(),domscribe({overlay:true,relay:{port:0}})],server:{host:'127.0.0.1',strictPort:true}});",
);

async function freePort() {
  const server = net.createServer();
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  await new Promise((resolve) => server.close(resolve));
  return port;
}
async function until(fn) {
  for (let i = 0; i < 100; i++) {
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
const vite = path.join(consumer, 'node_modules/vite/bin/vite.js');
const port = await freePort(),
  log = fs.openSync(path.join(work, 'vite.log'), 'a');
let server = spawn(process.execPath, [vite, '--port', String(port)], {
  cwd: consumer,
  stdio: ['ignore', log, log],
});
let browser;
const evidence = {
  at: new Date().toISOString(),
  node: process.version,
  work,
  consumer,
  checks: [],
};
const check = (name, details) =>
  evidence.checks.push({ name, pass: true, ...details });
try {
  await until(async () => (await fetch(`http://127.0.0.1:${port}`)).ok);
  browser = await chromium.launch({
    headless: true,
    args: ['--disable-dev-shm-usage'],
  });
  evidence.chromium = browser.version();
  let context = await browser.newContext();
  let page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
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
  const save = page.getByRole('button', { name: 'Save', exact: true });
  await record(save, { action: 'click' });
  await save.click();
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
  page.on('pageerror', (error) => errors.push(error.message));
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
  check('no application page errors', { errors });
  await page.screenshot({ path: path.join(work, 'replayed.png') });
  await context.close();
  const build = execFileSync(process.execPath, [vite, 'build'], {
    cwd: consumer,
    encoding: 'utf8',
  });
  fs.writeFileSync(path.join(work, 'production-build.log'), build);
  server.kill('SIGTERM');
  await new Promise((resolve) => server.once('exit', resolve));
  server = spawn(
    process.execPath,
    [vite, 'preview', '--host', '127.0.0.1', '--port', String(port)],
    { cwd: consumer, stdio: ['ignore', log, log] },
  );
  await until(async () => (await fetch(`http://127.0.0.1:${port}`)).ok);
  const production = await browser.newPage();
  await production.goto(`http://127.0.0.1:${port}`);
  await production
    .getByRole('heading', { name: 'Customer operations' })
    .waitFor();
  assert.equal(
    await production.locator('[data-ds], [data-ds-instance]').count(),
    0,
  );
  check('production DOM has no source or instance instrumentation', {});
} catch (error) {
  evidence.error = error.stack;
  process.exitCode = 1;
} finally {
  await browser?.close();
  server.kill('SIGTERM');
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
  console.log(JSON.stringify(evidence, null, 2));
}
