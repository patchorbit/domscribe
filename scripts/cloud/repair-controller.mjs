// Controlled pilot coordinator. Agent worktrees receive app/issue files only.
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { execFileSync } from 'node:child_process';
import net from 'node:net';
import { writeCartFixture, SOURCE_HASH, ISSUE } from './repair-fixture.mjs';
import { verifyBefore, verifyAfter } from './repair-verify.mjs';
import { gradeRepair } from './repair-grade.ts';
import { parseAgentEvents } from './repair-agent.ts';
import { collectRepairPatch } from './repair-patch.ts';
import { readArtifactProvenance } from './repair-source.ts';

async function freePort() {
  const server = net.createServer();
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const port = server.address().port;
  await new Promise((r) => server.close(r));
  return port;
}
async function ready(url, signal) {
  const end = Date.now() + 30000;
  while (Date.now() < end) {
    signal?.throwIfAborted();
    try {
      if ((await fetch(url, { signal: AbortSignal.timeout(1000) })).ok) return;
    } catch {
      /* Best-effort cleanup/readiness; the owned process may already be gone. */
    }
    await new Promise((r) => setTimeout(r, 100));
  }
  throw Error('Cart server readiness timed out');
}
export async function runRepairExperiment({
  sourceRoot,
  workRoot,
  reportDir,
  condition,
  sourceCommit,
  environment = 'docker-cloud',
  browserTools,
  signal,
}) {
  if (
    !['baseline', 'domscribe'].includes(condition) ||
    !['local-control', 'docker-cloud'].includes(environment) ||
    !/^[a-f0-9]{40}$/.test(sourceCommit)
  )
    throw Error('Invalid controlled experiment input');
  const modeArgs =
    environment === 'local-control'
      ? [
          '--approve-for-me',
          '--ignore-user-config',
          '--add-dir',
          reportDir,
          '-c',
          'sandbox_workspace_write.network_access=true',
        ]
      : ['--dangerously-bypass-approvals-and-sandbox'];
  execFileSync('codex', ['exec', ...modeArgs, '--help'], {
    stdio: 'pipe',
    timeout: 10000,
  });
  if (fs.existsSync(workRoot)) throw Error('Repair work root already exists');
  fs.mkdirSync(workRoot, { recursive: true, mode: 0o700 });
  fs.mkdirSync(reportDir, { recursive: true, mode: 0o700 });
  const artifactProvenance = readArtifactProvenance(sourceRoot, sourceCommit);
  const { startOwnedProcess, stopOwnedProcess, runOwnedBuild } = await import(
    environment === 'docker-cloud'
      ? new URL('./repair-process.mjs', import.meta.url).href
      : new URL('../fixtures/replay-process.mjs', import.meta.url).href
  );
  const harnessHash = createHash('sha256');
  for (const name of [
    'repair-controller.mjs',
    'repair-fixture.mjs',
    'repair-verify.mjs',
    'repair-grade.ts',
    'repair-agent.ts',
    'repair-patch.ts',
    'repair-source.ts',
  ])
    harnessHash.update(fs.readFileSync(new URL('./' + name, import.meta.url)));
  harnessHash.update(
    fs.readFileSync(
      environment === 'docker-cloud'
        ? new URL('./repair-process.mjs', import.meta.url)
        : new URL('../fixtures/replay-process.mjs', import.meta.url),
    ),
  );
  const fixtureRequire = createRequire(
    path.join(sourceRoot, 'packages/domscribe-test-fixtures/package.json'),
  );
  const { chromium } = fixtureRequire('playwright');
  const packDir = path.join(workRoot, 'packages');
  fs.mkdirSync(packDir);
  const { replayProject } = await import(
    pathToFileURL(path.join(sourceRoot, 'scripts/fixtures/replay-project.mjs'))
      .href
  );
  const project = replayProject('react', undefined, '7.3.7');
  const dependencies = project.dependencies;
  for (const name of [...project.artifacts, 'mcp']) {
    const artifactManifest = JSON.parse(
      fs.readFileSync(
        path.join(
          sourceRoot,
          'dist/packages/domscribe-' + name,
          'package.json',
        ),
        'utf8',
      ),
    );
    if (
      JSON.stringify(artifactManifest.dependencies ?? {}).includes('workspace:')
    )
      throw Error('Build and sync Domscribe artifacts before pilot packaging');
    const pack = JSON.parse(
      execFileSync(
        'npm',
        [
          'pack',
          path.join(sourceRoot, 'dist/packages/domscribe-' + name),
          '--ignore-scripts',
          '--pack-destination',
          packDir,
          '--json',
        ],
        { encoding: 'utf8', timeout: 30000 },
      ),
    );
    dependencies['@domscribe/' + name] =
      'file:' + path.join(packDir, pack[0].filename);
  }
  const base = path.join(workRoot, 'base'),
    app = path.join(workRoot, 'app');
  writeCartFixture(base, { dependencies });
  execFileSync(
    'npm',
    ['install', '--ignore-scripts', '--no-audit', '--no-fund'],
    { cwd: base, stdio: 'pipe', timeout: 180000 },
  );
  for (const args of [
    ['init'],
    ['add', '.'],
    [
      '-c',
      'user.name=Pilot',
      '-c',
      'user.email=pilot@example.invalid',
      'commit',
      '-m',
      'Seed isolated cart task',
    ],
    ['worktree', 'add', '--detach', app, 'HEAD'],
  ])
    execFileSync('git', args, { cwd: base, stdio: 'pipe' });
  execFileSync('npm', ['ci', '--ignore-scripts', '--no-audit', '--no-fund'], {
    cwd: app,
    stdio: 'pipe',
    timeout: 180000,
  });
  fs.rmSync(path.join(base, 'node_modules'), { recursive: true, force: true });
  const sourceHash = createHash('sha256')
    .update(fs.readFileSync(path.join(app, 'src/App.jsx')))
    .digest('hex');
  if (sourceHash !== SOURCE_HASH)
    throw Error('Seed source differs from protocol');
  let tools = browserTools;
  if (!tools) {
    tools = path.join(workRoot, 'tools');
    execFileSync(
      'npm',
      [
        'install',
        '--prefix',
        tools,
        '--ignore-scripts',
        '--no-audit',
        '--no-fund',
        '@playwright/mcp@0.0.83',
      ],
      { stdio: 'pipe', timeout: 180000 },
    );
  }
  const appSeedCommit = execFileSync('git', ['rev-parse', 'HEAD'], {
    cwd: app,
    encoding: 'utf8',
  }).trim();
  const req = createRequire(path.join(app, 'package.json'));
  const report = {
    schemaVersion: 1,
    at: new Date().toISOString(),
    condition,
    sourceCommit,
    initialSourceHash: sourceHash,
    environment,
    appSeedCommit,
    artifactProvenance,
    harnessDigest: harnessHash.digest('hex'),
    status: 'running',
    versions: {
      node: process.version,
      playwrightMcp: JSON.parse(
        fs.readFileSync(
          path.join(tools, 'node_modules/@playwright/mcp/package.json'),
          'utf8',
        ),
      ).version,
    },
  };
  const save = () =>
    fs.writeFileSync(
      path.join(reportDir, 'repair-report.json'),
      JSON.stringify(report, null, 2),
    );
  save();
  const serverEnv = {
    ...process.env,
    VITE_DOMSCRIBE: condition === 'domscribe' ? '1' : '0',
    NODE_OPTIONS: '--max-old-space-size=4096',
  };
  const logs = [];
  let dev, prod, browser;
  const verificationApp = path.join(workRoot, 'verification-app');
  const cancel = () => {
    void stopOwnedProcess(dev);
    void stopOwnedProcess(prod);
    void browser?.close().catch(() => {
      /* Cancellation may race an already-closed browser. */
    });
  };
  signal?.addEventListener('abort', cancel, { once: true });
  function start(args, name, env = serverEnv, cwd = app) {
    const fd = fs.openSync(path.join(reportDir, name), 'w');
    logs.push(fd);
    return startOwnedProcess(
      process.execPath,
      [path.join(cwd, 'node_modules/vite/bin/vite.js'), ...args],
      {
        cwd,
        env,
        stdio: ['ignore', fd, fd],
      },
    );
  }
  try {
    signal?.throwIfAborted();
    const dp = await freePort(),
      pp = await freePort();
    const url = 'http://127.0.0.1:' + dp;
    dev = start(['--port', String(dp)], 'repair-server.log');
    await ready(url, signal);
    browser = await chromium.launch({
      headless: true,
      args: ['--disable-dev-shm-usage'],
    });
    signal?.throwIfAborted();
    report.versions.chromium = browser.version();
    report.before = await verifyBefore(browser, url, reportDir);
    save();
    if (condition === 'domscribe') {
      const context = await browser.newContext();
      const page = await context.newPage();
      try {
        await page.goto(url);
        await page.waitForFunction(() => window.__runtime?.isReady());
        const target = await page
          .getByRole('article', { name: 'Midnight travel mug', exact: true })
          .getByRole('button', { name: 'Edit quantity', exact: true })
          .evaluate((el) => window.__runtime.describeTarget(el));
        const port = await page.evaluate(() => window.__DOMSCRIBE_RELAY_PORT__);
        const { RelayHttpClient } = await import(
          pathToFileURL(req.resolve('@domscribe/relay/client')).href
        );
        const relay = new RelayHttpClient('127.0.0.1', port);
        const exact = await relay.queryTargets({
          instanceId: target.instanceId,
        });
        if (
          exact.status !== 'resolved' ||
          exact.context.componentProps.line.id !== 'line-a'
        )
          throw Error('Exact cart runtime does not match selected line');
        const annotation = await relay.createAnnotation({
          mode: 'element-click',
          interaction: {
            type: 'element-annotation',
            selectedElement: {
              tagName: 'button',
              selector: target.selector,
              dataDs: target.entryId,
              target,
            },
          },
          context: {
            pageUrl: url,
            pageTitle: await page.title(),
            viewport: { width: 1280, height: 820 },
            userAgent: await page.evaluate(() => navigator.userAgent),
            userMessage: ISSUE,
            runtimeContext: exact.context,
          },
        });
        fs.writeFileSync(
          path.join(reportDir, 'repair-annotation.json'),
          JSON.stringify(annotation, null, 2),
        );
      } finally {
        await context.close();
      }
    } else
      fs.writeFileSync(
        path.join(reportDir, 'repair-annotation.json'),
        JSON.stringify({ condition, annotation: null }),
      );
    await browser.close();
    browser = undefined;
    const browserArgs = [
      path.join(tools, 'node_modules/@playwright/mcp/cli.js'),
      '--headless',
      '--isolated',
      '--no-sandbox',
      '--executable-path',
      chromium.executablePath(),
      '--output-dir',
      path.join(reportDir, 'browser'),
    ];
    const agentArgs = [
      'exec',
      '--json',
      '-C',
      app,
      '-c',
      `mcp_servers.browser.command=${JSON.stringify(process.execPath)}`,
      '-c',
      `mcp_servers.browser.args=${JSON.stringify(browserArgs)}`,
    ];
    if (environment === 'docker-cloud')
      agentArgs.push('--dangerously-bypass-approvals-and-sandbox');
    else
      agentArgs.push(
        '--approve-for-me',
        '--ignore-user-config',
        '--add-dir',
        reportDir,
        '-c',
        'sandbox_workspace_write.network_access=true',
      );
    if (condition === 'domscribe') {
      const mcp = path.join(
        app,
        'node_modules/@domscribe/mcp/bin/domscribe-mcp.js',
      );
      const args = [
        '--input-type=module',
        '-e',
        `process.chdir(${JSON.stringify(app)});await import(${JSON.stringify(pathToFileURL(mcp).href)});`,
      ];
      agentArgs.push(
        '-c',
        `mcp_servers.domscribe.command=${JSON.stringify(process.execPath)}`,
        '-c',
        `mcp_servers.domscribe.args=${JSON.stringify(args)}`,
      );
    }
    const prompt =
      ISSUE +
      `\n\nApp URL: ${url}. Use the browser MCP server to reproduce before editing and verify after. Browser localStorage may be reset between reproductions. Do not read credential files or environment variables. You are already in an isolated Git worktree. ` +
      (condition === 'domscribe'
        ? 'Domscribe MCP is also available. Navigate in the browser first, then inspect the queued annotation and use domscribe.targets.query or domscribe.query.bySource to connect the selected cart line to live props/source before fixing. '
        : '') +
      'The independent grader is not part of your worktree; do not search for it.';
    agentArgs.push(prompt);
    report.versions.codex = execFileSync('codex', ['--version'], {
      encoding: 'utf8',
      timeout: 10000,
    }).trim();
    let agentExit = 0;
    try {
      await runOwnedBuild('codex', agentArgs, {
        cwd: app,
        env: serverEnv,
        logPath: path.join(reportDir, 'repair-agent.jsonl'),
        timeoutMs: 8 * 60 * 1000,
        signal,
        label: 'Agent',
      });
    } catch (error) {
      agentExit = 1;
      report.agentError = String(error);
    }
    report.agent = {
      exitCode: agentExit,
      incomplete: agentExit !== 0,
      ...parseAgentEvents(
        fs.readFileSync(path.join(reportDir, 'repair-agent.jsonl'), 'utf8'),
      ),
    };
    save();
    signal?.throwIfAborted();
    if (agentExit !== 0)
      throw Error('Agent invocation failed; inspect repair-agent.jsonl');
    Object.assign(report, collectRepairPatch(app, appSeedCommit));
    fs.writeFileSync(path.join(reportDir, 'repair.patch'), report.patch);
    await stopOwnedProcess(dev);
    dev = undefined;
    execFileSync(
      'git',
      ['worktree', 'add', '--detach', verificationApp, appSeedCommit],
      { cwd: base, stdio: 'pipe' },
    );
    execFileSync('git', ['apply', '-'], {
      cwd: verificationApp,
      input: report.patch,
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    if (
      !fs
        .readFileSync(path.join(app, 'src/App.jsx'))
        .equals(fs.readFileSync(path.join(verificationApp, 'src/App.jsx')))
    )
      throw Error('Exported patch does not reconstruct the verified source');
    execFileSync('npm', ['ci', '--ignore-scripts', '--no-audit', '--no-fund'], {
      cwd: verificationApp,
      stdio: 'pipe',
      timeout: 180000,
    });
    report.verification = {
      kind: 'exported-patch-fresh-worktree',
      seedCommit: appSeedCommit,
      patchSha256: createHash('sha256').update(report.patch).digest('hex'),
    };
    const verificationCli = path.join(
      verificationApp,
      'node_modules/vite/bin/vite.js',
    );
    signal?.throwIfAborted();
    await runOwnedBuild(process.execPath, [verificationCli, 'build'], {
      cwd: verificationApp,
      env: { ...serverEnv, NODE_ENV: 'production' },
      logPath: path.join(reportDir, 'repair-production-build.log'),
      timeoutMs: 120000,
      signal,
    });
    signal?.throwIfAborted();
    dev = start(
      ['--port', String(dp)],
      'repair-verification-server.log',
      serverEnv,
      verificationApp,
    );
    await ready(url, signal);
    signal?.throwIfAborted();
    prod = start(
      ['preview', '--host', '127.0.0.1', '--port', String(pp)],
      'repair-production-server.log',
      { ...serverEnv, NODE_ENV: 'production' },
      verificationApp,
    );
    await ready('http://127.0.0.1:' + pp, signal);
    signal?.throwIfAborted();
    browser = await chromium.launch({
      headless: true,
      args: ['--disable-dev-shm-usage'],
    });
    signal?.throwIfAborted();
    report.after = await verifyAfter(
      browser,
      url,
      'http://127.0.0.1:' + pp,
      reportDir,
    );
    gradeRepair(report, condition, sourceCommit, SOURCE_HASH);
    report.status = 'passed';
    save();
    return report;
  } catch (error) {
    report.status = 'failed';
    report.error = String(error);
    save();
    throw error;
  } finally {
    signal?.removeEventListener('abort', cancel);
    await browser?.close();
    await stopOwnedProcess(dev);
    await stopOwnedProcess(prod);
    for (const fd of logs) fs.closeSync(fd);
    for (const workspace of [app, verificationApp]) {
      const lock = path.join(workspace, '.domscribe/relay.lock');
      if (fs.existsSync(lock)) {
        const r = JSON.parse(fs.readFileSync(lock, 'utf8'));
        if (r.workspaceRoot === workspace) {
          try {
            process.kill(r.pid, 'SIGTERM');
          } catch {
            /* Best-effort cleanup/readiness; the owned process may already be gone. */
          }
        }
      }
    }
  }
}
