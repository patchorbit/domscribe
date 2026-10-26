import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import type { CallOptions, KitLaunchOptions } from '@docker/sandboxes';

export const SOURCE_REPOSITORY = 'https://github.com/patchorbit/domscribe.git';
export const DEFAULT_COMMIT = '92e939a643b7f882b5f997e3197413befcc93b41';
export const REMOTE_REPORT = '/tmp/domscribe-cloud-evidence';
const SCRIPT = '/tmp/domscribe-cloud-bootstrap.sh';
const REQUIRED_CHECKS = [
  'source ambiguity refused; exact instance has Lyra props',
  'exact editor instance exposes committed typed and checked state',
  'unmounted editor handle is stale after saving',
  'persisted annotation replayed in fresh Chromium context with reordered rows',
  'ambiguous replay stops before any action',
  'no application page errors',
  'production DOM has no source or instance instrumentation',
  'production UI still updates only the selected customer without page errors',
];
const ARTIFACTS = [
  'result.json',
  'provenance.json',
  'trace.json',
  'replayed.png',
  'production-build.log',
  'install.log',
  'server.log',
  ...Array.from({ length: 4 }, (_, i) => `failure-${i}.png`),
];
const REQUIRED_ARTIFACTS = ARTIFACTS.slice(0, 7);
const MAX_FILE = 4 * 1024 * 1024,
  MAX_TOTAL = 16 * 1024 * 1024,
  MAX_OUTPUT = 8 * 1024 * 1024;
export interface CloudEvent {
  type: string;
  data?: Uint8Array;
  exitCode?: number;
}
export interface CloudConnection extends AsyncIterable<CloudEvent> {
  close(): Promise<void>;
}
export interface CloudSandbox {
  name: string;
  uid: string;
  waitUntilRunning(options: CallOptions): Promise<CloudSandbox>;
  files: {
    write(
      p: string,
      content: string,
      input: undefined,
      options: CallOptions,
    ): Promise<unknown>;
    read(
      p: string,
      input: { maxBytes: number },
      options: CallOptions,
    ): Promise<Uint8Array>;
  };
  processes: {
    start(
      input: { args: string[]; label: string; session: string },
      options: CallOptions,
    ): Promise<{
      name: string;
      connect(input: undefined, options: CallOptions): Promise<CloudConnection>;
    }>;
  };
  delete(
    input: { force: boolean },
    options: CallOptions,
  ): Promise<CloudSandbox | undefined>;
  waitUntilDeleted(options: CallOptions): Promise<void>;
}
export interface CloudClient {
  kits: {
    launch(
      name: string,
      input: KitLaunchOptions,
      options: CallOptions,
    ): Promise<CloudSandbox>;
  };
  get(name: string, options: CallOptions): Promise<CloudSandbox>;
  close(): Promise<void>;
}
export interface Failure {
  phase: string;
  kind: string;
  message?: string;
  httpStatus?: number;
  code?: string;
  violations?: Array<{ field?: string; description?: string }>;
}
export interface CloudRunReport {
  schemaVersion: 1;
  runId: string;
  startedAt: string;
  finishedAt?: string;
  status: 'running' | 'passed' | 'failed';
  source: { repository: string; commit: string };
  sdkVersion?: string;
  cloud: {
    kit?: 'shell' | 'codex';
    name?: string;
    uid?: string;
    resources: 'medium';
    ttlMs: number;
    deletion: 'not_created' | 'unknown_creation' | 'unconfirmed' | 'confirmed';
  };
  process: { name?: string; exitCode?: number; exitedObserved: boolean };
  artifacts: string[];
  failures: Failure[];
  browser?: Record<string, unknown>;
}
export interface RunOptions {
  kit?: 'shell' | 'codex';
  secretReferences?: readonly string[];
  extraArtifacts?: readonly string[];
  commit: string;
  reportDir: string;
  bootstrap: string;
  sdkVersion?: string;
  runId?: string;
  signal?: AbortSignal;
  onProgress?: (phase: string) => void;
  timeoutMs?: number;
  cleanupMs?: number;
}
class SmokeError extends Error {
  override name = 'SmokeError';
}
function ensure(value: unknown, message: string): asserts value {
  if (!value) throw new SmokeError(message);
}
function object(value: unknown): Record<string, unknown> {
  ensure(
    typeof value === 'object' && value !== null && !Array.isArray(value),
    'Expected evidence object',
  );
  return value as Record<string, unknown>;
}
function failure(phase: string, error: unknown): Failure {
  const e = error as {
    name?: unknown;
    httpStatus?: unknown;
    code?: unknown;
    violations?: Array<{ field?: unknown; description?: unknown }>;
  };
  return {
    phase,
    kind:
      typeof e?.name === 'string' && /^[A-Za-z0-9_]{1,64}$/.test(e.name)
        ? e.name
        : 'Error',
    ...(error instanceof SmokeError ? { message: error.message } : {}),
    ...(e?.name === 'ValidationError' && error instanceof Error
      ? {
          message: error.message
            .slice(0, 500)
            .replace(/https?:\/\/\S+/g, '[URL]')
            .replace(/Bearer\s+\S+/gi, 'Bearer [redacted]'),
        }
      : {}),
    ...(typeof e?.httpStatus === 'number' ? { httpStatus: e.httpStatus } : {}),
    ...(typeof e?.code === 'string' && /^[a-zA-Z]{1,64}$/.test(e.code)
      ? { code: e.code }
      : {}),
    ...(e?.name === 'ValidationError' && Array.isArray(e.violations)
      ? {
          violations: e.violations.slice(0, 10).map((v) => ({
            field:
              typeof v.field === 'string' ? v.field.slice(0, 160) : undefined,
            description:
              typeof v.description === 'string'
                ? v.description.slice(0, 300)
                : undefined,
          })),
        }
      : {}),
  };
}
function isMissing(error: unknown) {
  const e = error as { httpStatus?: number; code?: string };
  return e?.httpStatus === 404 || e?.code === 'notFound';
}
function call(timeoutMs: number, signal?: AbortSignal): CallOptions {
  return {
    timeoutMs,
    signal: signal
      ? AbortSignal.any([signal, AbortSignal.timeout(timeoutMs)])
      : AbortSignal.timeout(timeoutMs),
    maxRetries: 1,
  };
}
export function validateBrowserEvidence(
  input: unknown,
  commit: string,
  provenanceInput: unknown,
): void {
  const result = object(input),
    provenance = object(provenanceInput);
  ensure(
    provenance.commit === commit,
    'Executed commit differs from requested commit',
  );
  ensure(
    typeof result.node === 'string' &&
      /^v24\./.test(result.node) &&
      provenance.node === result.node,
    'Expected the same Node24 runtime for build and browser verification',
  );
  ensure(!result.error, 'Browser harness reported an error');
  ensure(
    result.framework === 'react' &&
      result.packageManager === 'npm' &&
      result.installedVite === '7.3.7' &&
      result.frameworkVersion === '18.3.1',
    'Unexpected consumer integration/version',
  );
  ensure(
    result.installMode === 'local-tarballs' &&
      result.localArtifactOverrides === false,
    'Unexpected installation scope',
  );
  ensure(
    typeof result.consumer === 'string' &&
      typeof result.mappedSource === 'string' &&
      result.mappedSource.startsWith(result.consumer + '/') &&
      result.mappedSource.endsWith('/src/main.jsx'),
    'Missing exact consumer source mapping',
  );
  const checks = result.checks;
  ensure(Array.isArray(checks), 'Missing browser checks');
  ensure(
    checks.every((c) => object(c).pass === true),
    'A browser check failed',
  );
  for (const name of REQUIRED_CHECKS)
    ensure(
      checks.filter((c) => object(c).name === name).length === 1,
      `Missing or duplicate required browser check: ${name}`,
    );
  for (const name of ['pageErrors', 'consoleErrors', 'networkErrors'])
    ensure(
      Array.isArray(result[name]) && result[name].length === 0,
      `Browser reported ${name}`,
    );
}

export async function runCloudReplay(
  client: CloudClient,
  options: RunOptions,
): Promise<CloudRunReport> {
  const report: CloudRunReport = {
    schemaVersion: 1,
    runId: options.runId ?? randomUUID(),
    startedAt: new Date().toISOString(),
    status: 'running',
    source: { repository: SOURCE_REPOSITORY, commit: options.commit },
    sdkVersion: options.sdkVersion,
    cloud: {
      kit: options.kit ?? 'shell',
      resources: 'medium',
      ttlMs: 30 * 60 * 1000,
      deletion: 'not_created',
    },
    process: { exitedObserved: false },
    artifacts: [],
    failures: [],
  };
  let owned: CloudSandbox | undefined,
    running: CloudSandbox | undefined,
    phase = 'input',
    output: number | undefined,
    writable = false;
  let artifacts: readonly string[] = ARTIFACTS;
  const extraArtifacts = options.extraArtifacts ?? [];
  const secretReferences = options.secretReferences ?? [];
  const timeout = options.timeoutMs ?? 25 * 60 * 1000,
    cleanupMs = options.cleanupMs ?? 60000;
  const save = () => {
    if (!writable) return;
    fs.writeFileSync(
      path.join(options.reportDir, 'cloud-result.json.tmp'),
      JSON.stringify(report, null, 2),
      { mode: 0o600 },
    );
    fs.renameSync(
      path.join(options.reportDir, 'cloud-result.json.tmp'),
      path.join(options.reportDir, 'cloud-result.json'),
    );
  };
  const stage = (next: string) => {
    phase = next;
    save();
    options.onProgress?.(next);
  };
  try {
    ensure(
      ['shell', 'codex'].includes(options.kit ?? 'shell'),
      'Unsupported controlled workload kit',
    );
    ensure(
      Array.isArray(secretReferences) &&
        secretReferences.every(
          (ref) =>
            typeof ref === 'string' &&
            /^secrets\/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(
              ref,
            ),
        ),
      'Provider references must be secret resource names',
    );
    ensure(
      (options.kit ?? 'shell') === 'codex'
        ? secretReferences.length === 1
        : secretReferences.length === 0,
      'Codex requires one provider reference; shell smoke requires none',
    );
    ensure(
      Array.isArray(extraArtifacts) &&
        extraArtifacts.length <= 8 &&
        new Set(extraArtifacts).size === extraArtifacts.length &&
        extraArtifacts.every(
          (name) =>
            typeof name === 'string' &&
            /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,79}$/.test(name) &&
            ![
              ...ARTIFACTS,
              'cloud-result.json',
              'cloud-result.json.tmp',
              'bootstrap.log',
            ].includes(name),
        ),
      'Unsafe, duplicate or reserved extra artifact',
    );
    artifacts = [...ARTIFACTS, ...extraArtifacts];
    ensure(
      /^[a-f0-9]{40}$/.test(options.commit),
      'Use an exact lowercase40-character source commit',
    );
    ensure(
      timeout > 0 &&
        timeout <= 25 * 60 * 1000 &&
        cleanupMs > 0 &&
        cleanupMs <= 60000,
      'Deadlines exceed bounded smoke limits',
    );
    ensure(/^[a-zA-Z0-9-]{1,64}$/.test(report.runId), 'Invalid run identity');
    fs.mkdirSync(options.reportDir, { recursive: true, mode: 0o700 });
    ensure(
      fs.readdirSync(options.reportDir).length === 0,
      'Report directory must be empty',
    );
    writable = true;
    options.signal?.throwIfAborted();
    const execution = call(timeout, options.signal);
    stage('launch');
    report.cloud.deletion = 'unknown_creation';
    save();
    owned = await client.kits.launch(
      options.kit ?? 'shell',
      {
        displayName: `domscribe-replay-${report.runId}`,
        resources: 'medium',
        lifecycle: { timeoutMs: report.cloud.ttlMs, onTimeout: 'delete' },
        labels: { domscribeRunId: report.runId },
        ...(secretReferences.length
          ? { storage: { secrets: [...secretReferences] } }
          : {}),
      },
      {
        ...execution,
        timeoutMs: Math.min(timeout, 180000),
        idempotencyKey: report.runId,
      },
    );
    report.cloud = {
      ...report.cloud,
      name: owned.name,
      uid: owned.uid,
      deletion: 'unconfirmed',
    };
    save();
    ensure(
      owned.name && owned.uid,
      'Accepted sandbox lacks stable identity; cannot safely delete by name',
    );
    stage('ready');
    running = await owned.waitUntilRunning({
      ...execution,
      timeoutMs: Math.min(timeout, 180000),
    });
    ensure(
      running.name === owned.name && running.uid === owned.uid,
      'Readiness returned a different sandbox identity',
    );
    stage('upload');
    await running.files.write(SCRIPT, options.bootstrap, undefined, execution);
    stage('run');
    const task = await running.processes.start(
      {
        args: ['bash', SCRIPT, options.commit],
        label: 'Domscribe browser replay smoke',
        session: report.runId,
      },
      { ...execution, idempotencyKey: report.runId + '-process' },
    );
    report.process.name = task.name;
    save();
    const connection = await task.connect(undefined, execution);
    output = fs.openSync(
      path.join(options.reportDir, 'bootstrap.log'),
      'wx',
      0o600,
    );
    let outputBytes = 0;
    let streamError: unknown;
    try {
      for await (const event of connection) {
        if (event.type === 'chunk' && event.data) {
          outputBytes += event.data.byteLength;
          ensure(outputBytes <= MAX_OUTPUT, 'Remote output exceeded8MiB limit');
          fs.writeSync(output, event.data);
        }
        if (event.type === 'exited') {
          report.process.exitedObserved = true;
          report.process.exitCode = event.exitCode ?? 0;
          break;
        }
      }
    } catch (error) {
      streamError = error;
    } finally {
      try {
        await connection.close();
      } catch (error) {
        report.failures.push(failure('disconnect', error));
      }
      fs.closeSync(output);
      output = undefined;
    }
    if (streamError) throw streamError;
    ensure(
      report.process.exitedObserved,
      'Process stream ended before an exit event',
    );
    ensure(
      report.process.exitCode === 0,
      `Remote command exited with code ${report.process.exitCode}`,
    );
  } catch (error) {
    const detail = failure(phase, error);
    if (
      phase === 'launch' &&
      !owned &&
      detail.kind === 'ValidationError' &&
      detail.httpStatus === 400 &&
      detail.code === 'invalidArgument'
    )
      report.cloud.deletion = 'not_created';
    report.failures.push(detail);
  } finally {
    if (output !== undefined) fs.closeSync(output);
    if (running) {
      phase = 'artifacts';
      const transfer = call(60000);
      let total = 0;
      for (const name of artifacts) {
        try {
          const bytes = await running.files.read(
            `${REMOTE_REPORT}/${name}`,
            { maxBytes: MAX_FILE },
            transfer,
          );
          ensure(
            bytes instanceof Uint8Array,
            'Artifact transfer did not return bytes',
          );
          ensure(bytes.length <= MAX_FILE, 'Artifact exceeded4MiB limit');
          total += bytes.length;
          ensure(total <= MAX_TOTAL, 'Artifacts exceeded16MiB total limit');
          fs.writeFileSync(path.join(options.reportDir, name), bytes, {
            mode: 0o600,
          });
          report.artifacts.push(name);
        } catch (error) {
          if (!isMissing(error)) {
            report.failures.push(failure(phase, error));
            if (transfer.signal?.aborted) break;
          }
        }
      }
      if (report.failures.length === 0) {
        try {
          for (const name of [...REQUIRED_ARTIFACTS, ...extraArtifacts])
            ensure(
              report.artifacts.includes(name),
              `Missing required artifact: ${name}`,
            );
          const browser = JSON.parse(
            fs.readFileSync(
              path.join(options.reportDir, 'result.json'),
              'utf8',
            ),
          );
          validateBrowserEvidence(
            browser,
            options.commit,
            JSON.parse(
              fs.readFileSync(
                path.join(options.reportDir, 'provenance.json'),
                'utf8',
              ),
            ),
          );
          const trace = JSON.parse(
            fs.readFileSync(path.join(options.reportDir, 'trace.json'), 'utf8'),
          );
          ensure(
            trace.version === 1 &&
              Array.isArray(trace.steps) &&
              trace.steps.length === 4,
            'Missing persisted four-step replay trace',
          );
          ensure(
            fs
              .readFileSync(path.join(options.reportDir, 'replayed.png'))
              .subarray(0, 8)
              .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])),
            'Replay screenshot is not PNG',
          );
          report.browser = browser;
        } catch (error) {
          report.failures.push(failure('validate', error));
        }
      }
    }
    if (owned) {
      try {
        const cleanup = call(cleanupMs);
        ensure(owned.uid, 'Cannot confirm ownership without UID');
        const latest = await client.get(owned.name, cleanup);
        ensure(
          latest.uid === owned.uid && latest.name === owned.name,
          'Sandbox identity changed; refusing to delete replacement',
        );
        const deleting = await latest.delete({ force: true }, cleanup);
        if (deleting) {
          ensure(
            deleting.uid === owned.uid,
            'Deletion returned a different resource',
          );
          await deleting.waitUntilDeleted(cleanup);
        }
        report.cloud.deletion = 'confirmed';
      } catch (error) {
        report.failures.push(failure('cleanup', error));
      }
    }
    try {
      await client.close();
    } catch (error) {
      report.failures.push(failure('client.close', error));
    }
    report.status =
      report.failures.length === 0 && report.cloud.deletion === 'confirmed'
        ? 'passed'
        : 'failed';
    report.finishedAt = new Date().toISOString();
    // If the local output path is unusable, expose that local failure to the caller.
    if (fs.existsSync(options.reportDir)) save();
  }
  return report;
}
