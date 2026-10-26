import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  runCloudReplay,
  validateBrowserEvidence,
  type CloudClient,
  type CloudSandbox,
} from './runner.js';
import type { CallOptions, KitLaunchOptions } from '@docker/sandboxes';
const commit = '92e939a643b7f882b5f997e3197413befcc93b41';
const names = [
  'source ambiguity refused; exact instance has Lyra props',
  'exact editor instance exposes committed typed and checked state',
  'unmounted editor handle is stale after saving',
  'persisted annotation replayed in fresh Chromium context with reordered rows',
  'ambiguous replay stops before any action',
  'no application page errors',
  'production DOM has no source or instance instrumentation',
  'production UI still updates only the selected customer without page errors',
];
function result() {
  return {
    framework: 'react',
    packageManager: 'npm',
    installMode: 'local-tarballs',
    localArtifactOverrides: false,
    node: 'v24.22.1',
    installedVite: '7.3.7',
    frameworkVersion: '18.3.1',
    consumer: '/tmp/consumer',
    mappedSource: '/tmp/consumer/src/main.jsx',
    checks: names.map((name) => ({ name, pass: true })),
    pageErrors: [],
    consoleErrors: [],
    networkErrors: [],
  };
}
interface FakeOptions {
  eof?: boolean;
  exitCode?: number;
  readyError?: boolean;
  transferError?: boolean;
  missingResult?: boolean;
  rpcNotFound?: boolean;
  cleanupError?: boolean;
  launchError?: boolean;
  rejected?: boolean;
  replacement?: boolean;
  cancelDuringStream?: AbortController;
}
function fake(options: FakeOptions = {}) {
  const calls: string[] = [];
  let launchKit: string | undefined,
    launchInput: KitLaunchOptions | undefined,
    createdOptions: CallOptions | undefined,
    cleanupSignal: AbortSignal | undefined,
    executionSignal: AbortSignal | undefined;
  const bytes = new Map<string, Uint8Array>([
    ['result.json', Buffer.from(JSON.stringify(result()))],
    [
      'provenance.json',
      Buffer.from(JSON.stringify({ commit, node: 'v24.22.1' })),
    ],
    [
      'trace.json',
      Buffer.from(
        JSON.stringify({
          version: 1,
          steps: Array.from({ length: 4 }, () => ({ action: 'click' })),
        }),
      ),
    ],
    ['replayed.png', Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])],
    ...['production-build.log', 'install.log', 'server.log'].map(
      (n) => [n, Buffer.from('test log\n')] as const,
    ),
  ]);
  const connection = {
    async *[Symbol.asyncIterator]() {
      yield { type: 'chunk', data: Buffer.from('remote log\n') };
      if (options.cancelDuringStream) {
        options.cancelDuringStream.abort();
        executionSignal?.throwIfAborted();
      }
      if (!options.eof)
        yield { type: 'exited', exitCode: options.exitCode ?? 0 };
    },
    async close() {
      calls.push('connection.close');
    },
  };
  const sandbox: CloudSandbox = {
    name: 'sandboxes/owned',
    uid: 'original-uid',
    async waitUntilRunning() {
      calls.push('ready');
      if (options.readyError) throw new Error('readiness failed');
      return sandbox;
    },
    files: {
      async write() {
        calls.push('write');
      },
      async read(p: string) {
        calls.push('read:' + path.posix.basename(p));
        if (options.transferError && p.endsWith('trace.json'))
          throw Error('transfer failed');
        const name = path.posix.basename(p);
        if (options.missingResult && name === 'result.json')
          throw Object.assign(Error('not found'), { httpStatus: 404 });
        const b = bytes.get(name);
        if (!b)
          throw Object.assign(
            Error('not found'),
            options.rpcNotFound
              ? { code: 'notFound', httpStatus: 200 }
              : { httpStatus: 404 },
          );
        return b;
      },
    },
    processes: {
      async start() {
        calls.push('start');
        return {
          name: 'sandboxes/owned/processes/task',
          async connect(_input, o) {
            executionSignal = o.signal;
            calls.push('connect');
            return connection;
          },
        };
      },
    },
    async waitUntilDeleted() {
      calls.push('deleted');
    },
    async delete(_input, o) {
      calls.push('delete');
      cleanupSignal = o.signal;
      if (options.cleanupError) throw Error('cleanup failed');
      return {
        ...sandbox,
        async waitUntilDeleted() {
          calls.push('deleted');
        },
      };
    },
  };
  const client: CloudClient = {
    kits: {
      async launch(_kit, input, call) {
        calls.push('launch');
        launchKit = _kit;
        launchInput = input;
        createdOptions = call;
        if (options.launchError)
          throw Object.assign(
            Error('uncertain create'),
            options.rejected
              ? {
                  name: 'ValidationError',
                  httpStatus: 400,
                  code: 'invalidArgument',
                  violations: [
                    { field: 'labels', description: 'Unsupported field' },
                  ],
                }
              : {},
          );
        return sandbox;
      },
    },
    async get() {
      calls.push('get');
      return options.replacement
        ? { ...sandbox, uid: 'replacement-uid' }
        : sandbox;
    },
    async close() {
      calls.push('client.close');
    },
  };
  return {
    client,
    calls,
    bytes,
    get launchKit() {
      return launchKit;
    },
    get launchInput() {
      return launchInput;
    },
    get createdOptions() {
      return createdOptions;
    },
    get cleanupSignal() {
      return cleanupSignal;
    },
  };
}
async function exercise(
  f: ReturnType<typeof fake>,
  options: Record<string, unknown> = {},
) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cloud-run-test-'));
  try {
    return await runCloudReplay(f.client, {
      commit,
      reportDir: dir,
      bootstrap: 'echo smoke',
      ...options,
    });
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}
test('process exit0 plus validated browser evidence and confirmed cleanup produce success', async () => {
  const f = fake();
  const report = await exercise(f);
  assert.equal(report.status, 'passed');
  assert.equal(report.cloud.deletion, 'confirmed');
  assert.equal(report.process.exitCode, 0);
  assert(f.calls.includes('deleted'));
  assert.equal(f.calls.at(-1), 'client.close');
  assert(f.launchInput && f.createdOptions);
  assert.equal(f.launchInput.resources, 'medium');
  assert.equal(
    f.launchInput.storage,
    undefined,
    'omit stored-secrets feature when no secrets are used',
  );
  assert.equal(f.launchInput.lifecycle?.onTimeout, 'delete');
  assert.equal(f.createdOptions.idempotencyKey, report.runId);
});
for (const [name, options] of [
  ['readiness', { readyError: true }],
  ['nonzero process', { exitCode: 2 }],
  ['stream EOF', { eof: true }],
  ['artifact transfer', { transferError: true }],
  ['missing browser result', { missingResult: true }],
] as const) {
  test(`cleans accepted sandbox after ${name} failure`, async () => {
    const f = fake(options);
    const report = await exercise(f);
    assert.equal(report.status, 'failed');
    assert.equal(report.cloud.deletion, 'confirmed');
    assert(f.calls.includes('deleted'));
    assert.equal(f.calls.at(-1), 'client.close');
    assert(f.cleanupSignal && !f.cleanupSignal.aborted);
  });
}
test('refuses to delete a replacement with the same name', async () => {
  const f = fake({ replacement: true });
  const report = await exercise(f);
  assert.equal(report.status, 'failed');
  assert.equal(report.cloud.deletion, 'unconfirmed');
  assert(!f.calls.includes('delete'));
  assert.equal(f.calls.at(-1), 'client.close');
});
test('keeps command failure and cleanup failure distinct', async () => {
  const f = fake({ exitCode: 2, cleanupError: true });
  const report = await exercise(f);
  assert.equal(report.status, 'failed');
  assert(report.failures.some((x) => x.phase === 'run'));
  assert(report.failures.some((x) => x.phase === 'cleanup'));
  assert.equal(report.cloud.deletion, 'unconfirmed');
});
test('uncertain creation is not retried or reported as deleted', async () => {
  const f = fake({ launchError: true });
  const report = await exercise(f);
  assert.equal(report.status, 'failed');
  assert.equal(report.cloud.deletion, 'unknown_creation');
  assert.equal(f.calls.filter((c) => c === 'launch').length, 1);
  assert.equal(f.calls.at(-1), 'client.close');
});
test('invalid commit fails before cloud allocation', async () => {
  const f = fake();
  const report = await exercise(f, { commit: 'main; echo injected' });
  assert.equal(report.status, 'failed');
  assert(!f.calls.includes('launch'));
});
test('exit0 cannot mask a failed browser assertion, stale provenance or app console error', () => {
  const provenance = { commit, node: 'v24.22.1' };
  validateBrowserEvidence(result(), commit, provenance);
  const bad = result();
  bad.checks[0].pass = false;
  assert.throws(() => validateBrowserEvidence(bad, commit, provenance));
  assert.throws(() =>
    validateBrowserEvidence(result(), commit, {
      ...provenance,
      commit: 'a'.repeat(40),
    }),
  );
  const errors = result();
  errors.consoleErrors = ['unexpected'] as never;
  assert.throws(() => validateBrowserEvidence(errors, commit, provenance));
  const missing = result();
  missing.checks.pop();
  assert.throws(() => validateBrowserEvidence(missing, commit, provenance));
});

test('recognizes SDK notFound stream errors for optional failure screenshots', async () => {
  const f = fake({ rpcNotFound: true });
  assert.equal((await exercise(f)).status, 'passed');
});
test('rejects oversized artifacts and still confirms sandbox deletion', async () => {
  const f = fake();
  f.bytes.set('replayed.png', new Uint8Array(5 * 1024 * 1024));
  const report = await exercise(f);
  assert.equal(report.status, 'failed');
  assert.equal(report.cloud.deletion, 'confirmed');
});
test('pre-cancelled work never allocates a sandbox', async () => {
  const f = fake();
  const controller = new AbortController();
  controller.abort();
  const report = await exercise(f, { signal: controller.signal });
  assert.equal(report.status, 'failed');
  assert(!f.calls.includes('launch'));
});
test('refuses a nonempty report directory without overwriting prior evidence', async () => {
  const f = fake();
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cloud-run-test-'));
  const p = path.join(dir, 'cloud-result.json');
  fs.writeFileSync(p, 'prior evidence');
  try {
    const report = await runCloudReplay(f.client, {
      commit,
      reportDir: dir,
      bootstrap: 'echo smoke',
    });
    assert.equal(report.status, 'failed');
    assert.equal(fs.readFileSync(p, 'utf8'), 'prior evidence');
    assert(!f.calls.includes('launch'));
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('records server validation fields and distinguishes rejected from uncertain allocation', async () => {
  const f = fake({ launchError: true, rejected: true });
  const report = await exercise(f);
  assert.equal(report.cloud.deletion, 'not_created');
  assert.equal(report.failures[0].code, 'invalidArgument');
  assert.deepEqual(report.failures[0].violations, [
    { field: 'labels', description: 'Unsupported field' },
  ]);
});

// The actual SDK streaming transport propagates its supplied abort signal.
// Model that behavior after acceptance, rather than only testing pre-cancel.
test('cancellation during streaming detaches and deletes the accepted sandbox with a fresh signal', async () => {
  const controller = new AbortController();
  const f = fake({ cancelDuringStream: controller });
  const report = await exercise(f, { signal: controller.signal });
  assert.equal(report.status, 'failed');
  assert.equal(report.process.exitedObserved, false);
  assert.equal(report.cloud.deletion, 'confirmed');
  assert(f.calls.indexOf('connection.close') < f.calls.indexOf('delete'));
  assert(f.calls.includes('deleted'));
  assert(controller.signal.aborted);
  assert(f.cleanupSignal && !f.cleanupSignal.aborted);
});

test('controlled agent workload launches the selected kit with a secret reference and retains required extra evidence', async () => {
  const f = fake();
  f.bytes.set(
    'repair-report.json',
    Buffer.from('{"kind":"controller-evidence"}'),
  );
  const r = await exercise(f, {
    kit: 'codex',
    secretReferences: ['secrets/00000000-0000-4000-8000-000000000000'],
    extraArtifacts: ['repair-report.json'],
  });
  assert.equal(r.status, 'passed');
  assert.equal(f.launchKit, 'codex');
  assert.deepEqual(f.launchInput?.storage, {
    secrets: ['secrets/00000000-0000-4000-8000-000000000000'],
  });
  assert(r.artifacts.includes('repair-report.json'));
});
test('agent evidence cannot overwrite local journals or escape the evidence directory', async () => {
  for (const extraArtifacts of [
    ['cloud-result.json'],
    ['../escape'],
    ['bootstrap.log'],
  ]) {
    const f = fake();
    const r = await exercise(f, { extraArtifacts });
    assert.equal(r.status, 'failed');
    assert(!f.calls.includes('launch'));
  }
});
test('missing requested repair evidence fails even when the ordinary replay smoke passes', async () => {
  const f = fake();
  const r = await exercise(f, { extraArtifacts: ['repair-report.json'] });
  assert.equal(r.status, 'failed');
  assert.equal(r.cloud.deletion, 'confirmed');
});
test('agent launches require a provider resource reference, never a token value', async () => {
  for (const secretReferences of [
    [],
    ['sk-never-transmit-test-value'],
    ['secrets/../../other'],
  ]) {
    const f = fake();
    const r = await exercise(f, { kit: 'codex', secretReferences });
    assert.equal(r.status, 'failed');
    assert(!f.calls.includes('launch'));
  }
});
