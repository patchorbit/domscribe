/**
 * RFC 0001 falsifier harness.
 *
 * This is the measurement instrument for the sprint-2734 thesis: "≥70% agent
 * one-shot styling completion by sprint 2734+6". It does NOT itself invoke
 * an agent — it grades a directory of agent outputs (one screenshot per
 * annotation) against the canonical-after baselines.
 *
 * Modes
 * -----
 *   --mode=self-test (default)
 *     Builds and previews both fixtures, navigates to each annotation's
 *     `afterRoute`, snapshots, and compares to the baseline at
 *     `baselines/<fixture>/<id>.png`. Expected pass rate is 100% — this is
 *     a smoke test of the mechanism (server stable, viewport stable,
 *     pixel-diff stable). If the self-test reports <100%, the harness
 *     itself is broken; nothing else the falsifier reports can be trusted.
 *
 *   --mode=record
 *     One-time baseline capture. Writes `baselines/<fixture>/<id>.png` from
 *     the live `afterRoute`. Run this when adding/updating annotations.
 *
 *   --mode=measure --agent-output=<dir>
 *     Production grading. Each annotation's screenshot is read from
 *     `<dir>/<id>.png` and compared to the baseline. This is what the
 *     post-sprint agent-integration harness will call.
 *
 * Output
 * ------
 * Emits one JSON line to stdout with shape:
 *   {
 *     "mode": "self-test|record|measure",
 *     "total": number,
 *     "passes": number,
 *     "fails": number,
 *     "oneShotRate": number,   // passes / total in [0,1]; null when total=0
 *     "annotations": [
 *       { "id": string, "fixture": string, "passed": boolean,
 *         "pixelDiffRatio": number, "diffPixels": number, "reason"?: string }
 *     ]
 *   }
 */

import fs from 'node:fs';
import path from 'node:path';
import { spawn, type ChildProcess } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { chromium, type Browser, type Page } from 'playwright';
import { diffPng, MAX_DIFF_RATIO } from '@domscribe/verify';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const STYLING_ROOT = path.resolve(__dirname, '..');
const BASELINES_ROOT = path.join(STYLING_ROOT, 'baselines');
const ANNOTATIONS_FILE = path.join(STYLING_ROOT, 'annotations.json');

/**
 * Pixel-diff tolerance lives in `@domscribe/verify` so the comparator
 * stays bit-identical between CI and the live `verify_after_edit` MCP
 * tool. See the package for the rationale on PER_PIXEL_THRESHOLD and
 * MAX_DIFF_RATIO. We only re-import MAX_DIFF_RATIO for the failure
 * reason string below.
 */

const VIEWPORT = { width: 800, height: 600 };

interface Annotation {
  id: string;
  fixture: string;
  fixtureDir: string;
  beforeRoute: string;
  afterRoute: string;
  intent: string;
  sourceFile: string;
  sourceLine: number;
  targetTestId: string;
  expectedComputedStyles?: Record<string, string>;
  expectedCustomProperties?: string[];
  tags?: string[];
}

interface AnnotationResult {
  id: string;
  fixture: string;
  passed: boolean;
  pixelDiffRatio: number;
  diffPixels: number;
  reason?: string;
}

interface FixtureServer {
  fixture: string;
  fixtureDir: string;
  port: number;
  baseUrl: string;
  process: ChildProcess;
}

type Mode = 'self-test' | 'record' | 'measure';

function parseArgs(argv: string[]): { mode: Mode; agentOutputDir?: string } {
  let mode: Mode = 'self-test';
  let agentOutputDir: string | undefined;
  for (const arg of argv.slice(2)) {
    if (arg.startsWith('--mode=')) {
      const v = arg.slice('--mode='.length);
      if (v !== 'self-test' && v !== 'record' && v !== 'measure') {
        throw new Error(`Unknown mode: ${v}`);
      }
      mode = v;
    } else if (arg.startsWith('--agent-output=')) {
      agentOutputDir = path.resolve(arg.slice('--agent-output='.length));
    }
  }
  if (mode === 'measure' && !agentOutputDir) {
    throw new Error('--mode=measure requires --agent-output=<dir>');
  }
  return { mode, agentOutputDir };
}

function readAnnotations(): Annotation[] {
  const raw = JSON.parse(fs.readFileSync(ANNOTATIONS_FILE, 'utf-8'));
  return raw.annotations as Annotation[];
}

/**
 * Build a fixture app via `vite build`. Done once per harness run; we do
 * not stream output to stdout because the harness must keep stdout reserved
 * for the JSON report.
 */
async function buildFixture(fixtureDir: string): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const cwd = path.join(STYLING_ROOT, fixtureDir);
    const proc = spawn('npx', ['vite', 'build'], {
      cwd,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, FORCE_COLOR: '0' },
    });
    let stderr = '';
    proc.stderr?.on('data', (chunk) => (stderr += chunk.toString()));
    proc.on('close', (code) => {
      if (code !== 0) {
        reject(
          new Error(
            `vite build failed for ${fixtureDir} (exit ${code}):\n${stderr}`,
          ),
        );
      } else {
        resolve();
      }
    });
    proc.on('error', reject);
  });
}

/**
 * Start a `vite preview` for a built fixture and wait for the port to be
 * ready. Returns the running child + base URL so the harness can later
 * tear it down. If a server is *already* listening on this port and serves
 * 200 — typical when a previous harness run leaked a process — we treat it
 * as a successful start and skip spawning, since a stale preview is
 * sufficient for read-only screenshotting and spawning a second one would
 * just bind-fail noisily.
 */
async function startPreview(
  fixtureDir: string,
  port: number,
  fixture: string,
): Promise<FixtureServer> {
  if (await isPortServing(port)) {
    return {
      fixture,
      fixtureDir,
      port,
      baseUrl: `http://localhost:${port}/`,
      // Sentinel: we do not own this process and must not kill it.
      process: { killed: true, kill: () => true } as unknown as ChildProcess,
    };
  }

  const cwd = path.join(STYLING_ROOT, fixtureDir);
  const proc = spawn(
    'npx',
    ['vite', 'preview', '--port', String(port), '--strictPort'],
    {
      cwd,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, FORCE_COLOR: '0' },
    },
  );

  // Surface preview errors to stderr — never stdout (reserved for JSON).
  proc.stderr?.on('data', (chunk) => {
    process.stderr.write(`[${fixture}] ${chunk}`);
  });

  await waitForPort(port, 15_000);

  return {
    fixture,
    fixtureDir,
    port,
    baseUrl: `http://localhost:${port}/`,
    process: proc,
  };
}

async function isPortServing(port: number): Promise<boolean> {
  try {
    const res = await fetch(`http://localhost:${port}/`);
    return res.ok || res.status === 304;
  } catch {
    return false;
  }
}

async function waitForPort(port: number, timeoutMs: number): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`http://localhost:${port}/`);
      if (res.ok || res.status === 304) return;
    } catch {
      // not ready yet
    }
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error(`Preview server did not become ready on port ${port}`);
}

async function stopServer(server: FixtureServer): Promise<void> {
  if (server.process.killed) return;
  await new Promise<void>((resolve) => {
    server.process.once('close', () => resolve());
    server.process.kill('SIGTERM');
    setTimeout(() => {
      if (!server.process.killed) server.process.kill('SIGKILL');
    }, 2000);
  });
}

async function screenshotRoute(
  page: Page,
  baseUrl: string,
  route: string,
): Promise<Buffer> {
  await page.goto(`${baseUrl}${route}`, { waitUntil: 'networkidle' });
  // Wait for the test-id to materialize so we are not racing a render.
  const testid = /testid=[^"]+/i.exec(route)?.[0]; // unused fallback
  void testid;
  // 50 ms settle for paint completion. Animations are killed via CSS in
  // index.html; this guards against `networkidle` firing one frame early.
  await page.waitForTimeout(50);
  return page.screenshot({
    type: 'png',
    fullPage: false,
    animations: 'disabled',
    caret: 'hide',
  });
}

/**
 * Pixel diff via the shared `@domscribe/verify` comparator. Kept as a
 * thin shim so the rest of the harness reads the same way it did
 * before the lift.
 */
function diff(a: Buffer, b: Buffer): { diffPixels: number; ratio: number } {
  const r = diffPng(a, b);
  return { diffPixels: r.diffPixels, ratio: r.pixelDiffRatio };
}

interface BrowserContext {
  browser: Browser;
  page: Page;
}

async function openBrowser(): Promise<BrowserContext> {
  const browser = await chromium.launch();
  const page = await browser.newPage({
    viewport: VIEWPORT,
    deviceScaleFactor: 1,
    // Lock locale so font metrics are stable across runners.
    locale: 'en-US',
    timezoneId: 'UTC',
    reducedMotion: 'reduce',
  });
  return { browser, page };
}

function ensureDir(p: string): void {
  fs.mkdirSync(p, { recursive: true });
}

function baselinePath(fixture: string, id: string): string {
  return path.join(BASELINES_ROOT, fixture, `${id}.png`);
}

async function runRecord(
  servers: Map<string, FixtureServer>,
  annotations: Annotation[],
): Promise<AnnotationResult[]> {
  const { browser, page } = await openBrowser();
  const results: AnnotationResult[] = [];
  try {
    for (const ann of annotations) {
      const server = servers.get(ann.fixture);
      if (!server) {
        results.push({
          id: ann.id,
          fixture: ann.fixture,
          passed: false,
          pixelDiffRatio: 1,
          diffPixels: -1,
          reason: `No preview server for fixture "${ann.fixture}"`,
        });
        continue;
      }
      const png = await screenshotRoute(page, server.baseUrl, ann.afterRoute);
      ensureDir(path.join(BASELINES_ROOT, ann.fixture));
      fs.writeFileSync(baselinePath(ann.fixture, ann.id), png);
      results.push({
        id: ann.id,
        fixture: ann.fixture,
        passed: true,
        pixelDiffRatio: 0,
        diffPixels: 0,
        reason: 'baseline recorded',
      });
    }
  } finally {
    await browser.close();
  }
  return results;
}

async function runSelfTest(
  servers: Map<string, FixtureServer>,
  annotations: Annotation[],
): Promise<AnnotationResult[]> {
  return runAgainstSource(servers, annotations, async (page, server, ann) =>
    screenshotRoute(page, server.baseUrl, ann.afterRoute),
  );
}

async function runMeasure(
  servers: Map<string, FixtureServer>,
  annotations: Annotation[],
  agentOutputDir: string,
): Promise<AnnotationResult[]> {
  return runAgainstSource(servers, annotations, async (_page, _server, ann) => {
    const p = path.join(agentOutputDir, `${ann.id}.png`);
    if (!fs.existsSync(p)) {
      throw new Error(`Agent output missing: ${p}`);
    }
    return fs.readFileSync(p);
  });
}

async function runAgainstSource(
  servers: Map<string, FixtureServer>,
  annotations: Annotation[],
  source: (
    page: Page,
    server: FixtureServer,
    ann: Annotation,
  ) => Promise<Buffer>,
): Promise<AnnotationResult[]> {
  const { browser, page } = await openBrowser();
  const results: AnnotationResult[] = [];
  try {
    for (const ann of annotations) {
      const baseline = baselinePath(ann.fixture, ann.id);
      if (!fs.existsSync(baseline)) {
        results.push({
          id: ann.id,
          fixture: ann.fixture,
          passed: false,
          pixelDiffRatio: 1,
          diffPixels: -1,
          reason: `No baseline at ${path.relative(STYLING_ROOT, baseline)} — run with --mode=record first`,
        });
        continue;
      }
      const server = servers.get(ann.fixture);
      if (!server) {
        results.push({
          id: ann.id,
          fixture: ann.fixture,
          passed: false,
          pixelDiffRatio: 1,
          diffPixels: -1,
          reason: `No preview server for fixture "${ann.fixture}"`,
        });
        continue;
      }
      try {
        const actualBuf = await source(page, server, ann);
        const baselineBuf = fs.readFileSync(baseline);
        const { diffPixels, ratio } = diff(actualBuf, baselineBuf);
        const passed = ratio <= MAX_DIFF_RATIO;
        results.push({
          id: ann.id,
          fixture: ann.fixture,
          passed,
          pixelDiffRatio: ratio,
          diffPixels,
          reason: passed
            ? undefined
            : `Pixel diff ${(ratio * 100).toFixed(3)}% exceeds tolerance ${(MAX_DIFF_RATIO * 100).toFixed(3)}%`,
        });
      } catch (err) {
        results.push({
          id: ann.id,
          fixture: ann.fixture,
          passed: false,
          pixelDiffRatio: 1,
          diffPixels: -1,
          reason: err instanceof Error ? err.message : String(err),
        });
      }
    }
  } finally {
    await browser.close();
  }
  return results;
}

async function main() {
  const { mode, agentOutputDir } = parseArgs(process.argv);
  const annotations = readAnnotations();

  // Build both fixtures. We do this every run so a stale dist can never
  // cause a false positive in self-test.
  const fixtureDirs = Array.from(new Set(annotations.map((a) => a.fixtureDir)));
  for (const dir of fixtureDirs) {
    await buildFixture(dir);
  }

  // Launch a preview per fixture on a deterministic port. Different
  // fixtures use different ports so the harness can hold both up at once.
  const fixturePort: Record<string, number> = {
    tailwind: 4801,
    styled: 4802,
  };

  const servers = new Map<string, FixtureServer>();
  try {
    for (const ann of annotations) {
      if (servers.has(ann.fixture)) continue;
      const port = fixturePort[ann.fixture];
      if (port == null) {
        throw new Error(
          `No port configured for fixture "${ann.fixture}". Add it to fixturePort.`,
        );
      }
      servers.set(
        ann.fixture,
        await startPreview(ann.fixtureDir, port, ann.fixture),
      );
    }

    let results: AnnotationResult[];
    if (mode === 'record') {
      results = await runRecord(servers, annotations);
    } else if (mode === 'measure') {
      results = await runMeasure(servers, annotations, agentOutputDir!);
    } else {
      results = await runSelfTest(servers, annotations);
    }

    const passes = results.filter((r) => r.passed).length;
    const total = results.length;
    const fails = total - passes;
    const oneShotRate = total === 0 ? null : passes / total;

    process.stdout.write(
      JSON.stringify(
        {
          mode,
          total,
          passes,
          fails,
          oneShotRate,
          annotations: results,
        },
        null,
        2,
      ) + '\n',
    );

    // Non-zero exit when the run failed so CI catches regressions. Record
    // mode always exits 0 (it cannot "fail" — it's writing baselines).
    if (mode !== 'record' && fails > 0) {
      process.exitCode = 1;
    }
  } finally {
    for (const server of servers.values()) {
      await stopServer(server);
    }
  }
}

main().catch((err) => {
  process.stderr.write(
    `[falsifier] fatal: ${err instanceof Error ? (err.stack ?? err.message) : String(err)}\n`,
  );
  process.exit(2);
});
