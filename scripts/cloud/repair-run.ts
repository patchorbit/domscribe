import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { oauth, Sandboxes } from '@docker/sandboxes';
import { runCloudReplay } from './runner.js';
import { gradeRepair } from './repair-grade.js';
import { withPinnedSource, writeArtifactProvenance } from './repair-source.js';

const { values } = parseArgs({
  options: {
    help: { type: 'boolean' },
    local: { type: 'boolean' },
    condition: { type: 'string', default: 'baseline' },
    'provider-secret': { type: 'string' },
    'report-dir': { type: 'string' },
  },
});
if (values.help) {
  console.log(
    'Usage: pnpm exec tsx scripts/cloud/repair-run.ts --condition=baseline|domscribe [--local] [--provider-secret=secrets/<UUID>] [--report-dir=<empty directory>]\nCloud mode uses one Codex kit and an existing proxy-managed OpenAI secret reference; local mode uses the current Codex CLI sign-in. Reports distinguish both environments. No credentials are created or copied.',
  );
  process.exit(0);
}
if (!['baseline', 'domscribe'].includes(values.condition))
  throw Error('Invalid condition');
if (
  !values.local &&
  !/^secrets\/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(
    values['provider-secret'] ?? '',
  )
)
  throw Error(
    'Cloud mode requires an existing provider secret resource reference',
  );
for (const name of [
  'SANDBOXES_API_URL',
  'DOCKER_OAUTH_ISSUER',
  'DOCKER_TOKEN_EXCHANGE_URL',
  'DOCKER_GOVERNANCE_URL',
])
  if (process.env[name] !== undefined)
    throw Error(`Unset ${name} before authentication`);
const sourceRoot = fileURLToPath(new URL('../../', import.meta.url)),
  here = fileURLToPath(new URL('./', import.meta.url));
const commit = '23063854647954f4001d05a21a928bdc12bdc6fc';
const reportDir = values['report-dir']
  ? path.resolve(values['report-dir'])
  : fs.mkdtempSync(path.join(os.tmpdir(), 'domscribe-repair-evidence-'));
fs.mkdirSync(reportDir, { recursive: true, mode: 0o700 });
if (fs.readdirSync(reportDir).length)
  throw Error('Report directory must be empty');
console.log(`Pilot evidence: ${reportDir}`);
const environment = values.local ? 'local-control' : 'docker-cloud';
const cancellation = new AbortController();
for (const s of ['SIGINT', 'SIGTERM'] as const)
  process.once(s, () => cancellation.abort());
let client: Sandboxes | undefined;
try {
  if (values.local) {
    const controller = await import(
      new URL('./repair-controller.mjs', import.meta.url).href
    );
    const parent = fs.mkdtempSync(
      path.join(os.tmpdir(), 'domscribe-repair-local-'),
    );
    const { runOwnedBuild } = await import(
      new URL('../fixtures/replay-process.mjs', import.meta.url).href
    );
    await withPinnedSource(sourceRoot, commit, async (pinned) => {
      const env = {
        ...process.env,
        NX_DAEMON: 'false',
        NODE_OPTIONS: '--max-old-space-size=4096',
      };
      await runOwnedBuild('pnpm', ['install', '--frozen-lockfile'], {
        cwd: pinned,
        env,
        logPath: path.join(reportDir, 'pinned-install.log'),
        timeoutMs: 180000,
        signal: cancellation.signal,
        label: 'Pinned source install',
      });
      await runOwnedBuild(
        'pnpm',
        [
          'exec',
          'nx',
          'run-many',
          '-t',
          'build,sync-dist',
          '--exclude',
          'domscribe-test-fixtures',
          '--parallel=2',
          '--skip-nx-cache',
        ],
        {
          cwd: pinned,
          env,
          logPath: path.join(reportDir, 'pinned-build.log'),
          timeoutMs: 300000,
          signal: cancellation.signal,
          label: 'Pinned artifact build',
        },
      );
      writeArtifactProvenance(pinned, commit);
      await controller.runRepairExperiment({
        sourceRoot: pinned,
        workRoot: path.join(parent, 'work'),
        reportDir,
        condition: values.condition,
        sourceCommit: commit,
        environment,
        signal: cancellation.signal,
      });
    });
  } else {
    const auth = oauth({
      onVerification({ verificationUriComplete, verificationUri, userCode }) {
        console.error(
          `Docker sign-in: ${verificationUriComplete ?? verificationUri}`,
        );
        if (!verificationUriComplete) console.error(userCode);
      },
    });
    await auth.getAccessToken({
      signal: AbortSignal.any([
        cancellation.signal,
        AbortSignal.timeout(300000),
      ]),
    });
    client = new Sandboxes({ auth, maxRetries: 1 });
    const payload = [
      'repair-controller.mjs',
      'repair-fixture.mjs',
      'repair-verify.mjs',
      'repair-grade.ts',
      'repair-agent.ts',
      'repair-patch.ts',
      'repair-source.ts',
      'repair-process.mjs',
    ];
    let bootstrap =
      fs.readFileSync(path.join(here, 'bootstrap.sh'), 'utf8') +
      '\nmkdir -p /tmp/domscribe-repair-controller\n';
    for (const name of payload)
      bootstrap += `printf '%s' '${fs.readFileSync(name === 'repair-process.mjs' ? path.join(sourceRoot, 'scripts/fixtures/replay-process.mjs') : path.join(here, name)).toString('base64')}' | base64 --decode > /tmp/domscribe-repair-controller/${name}\n`;
    bootstrap += `printf '%s' '{"type":"module"}' > /tmp/domscribe-repair-controller/package.json\nnode --input-type=module <<'DOMSCRIBE_PILOT'\nimport {runRepairExperiment} from '/tmp/domscribe-repair-controller/repair-controller.mjs';\nimport {writeArtifactProvenance} from '/tmp/domscribe-repair-controller/repair-source.ts';\nwriteArtifactProvenance('/tmp/domscribe-cloud-smoke/subject','${commit}');\nawait runRepairExperiment({sourceRoot:'/tmp/domscribe-cloud-smoke/subject',workRoot:'/tmp/domscribe-repair-pilot',reportDir:'/tmp/domscribe-cloud-evidence',condition:${JSON.stringify(values.condition)},sourceCommit:'${commit}',environment:'docker-cloud'});\nDOMSCRIBE_PILOT\n`;
    const report = await runCloudReplay(client, {
      commit,
      reportDir,
      bootstrap,
      kit: 'codex',
      secretReferences: [values['provider-secret'] as string],
      extraArtifacts: [
        'repair-report.json',
        'repair.patch',
        'repair-agent.jsonl',
        'repair-before.png',
        'repair-after.png',
        'repair-annotation.json',
      ],
      signal: cancellation.signal,
      onProgress: (p) => console.log('Cloud pilot: ' + p),
    });
    if (report.status !== 'passed')
      throw Error('Cloud workload failed; inspect cloud-result.json');
  }
  const result = JSON.parse(
    fs.readFileSync(path.join(reportDir, 'repair-report.json'), 'utf8'),
  );
  const fixture = await import(
    new URL('./repair-fixture.mjs', import.meta.url).href
  );
  gradeRepair(result, values.condition, commit, fixture.SOURCE_HASH);
  fs.writeFileSync(
    path.join(reportDir, 'pilot-result.json'),
    JSON.stringify(
      {
        status: 'passed',
        environment,
        condition: values.condition,
        sourceCommit: commit,
        at: new Date().toISOString(),
      },
      null,
      2,
    ),
  );
  console.log(`Repair pilot passed (${environment}, ${values.condition})`);
} catch (error) {
  const message =
    error instanceof Error ? error.message : 'Unknown pilot failure';
  fs.writeFileSync(
    path.join(reportDir, 'pilot-result.json'),
    JSON.stringify(
      {
        status: 'failed',
        environment,
        condition: values.condition,
        error: message,
        at: new Date().toISOString(),
      },
      null,
      2,
    ),
  );
  console.error(message);
  process.exitCode = 1;
} finally {
  await client?.close();
}
