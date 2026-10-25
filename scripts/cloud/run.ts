import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { oauth, pat, Sandboxes } from '@docker/sandboxes';
import { DEFAULT_COMMIT, runCloudReplay, type CloudClient } from './runner.js';

const { values } = parseArgs({
  options: {
    help: { type: 'boolean' },
    auth: { type: 'string', default: 'oauth' },
    commit: { type: 'string', default: DEFAULT_COMMIT },
    'report-dir': { type: 'string' },
  },
});
if (values.help) {
  console.log(
    'Usage: pnpm exec tsx scripts/cloud/run.ts [--auth=oauth|pat] [--commit=<40-character SHA>] [--report-dir=<empty directory>]\nRuns one medium Docker shell sandbox for up to30minutes. OAuth is interactive; PAT reads DOCKER_ID and DOCKER_PAT from the environment. No model-provider credential is needed.',
  );
  process.exit(0);
}
if (!['oauth', 'pat'].includes(values.auth))
  throw Error('auth must be oauth or pat');
if (!/^[a-f0-9]{40}$/.test(values.commit))
  throw Error('commit must be an exact lowercase40-character SHA');
for (const name of [
  'SANDBOXES_API_URL',
  'DOCKER_OAUTH_ISSUER',
  'DOCKER_TOKEN_EXCHANGE_URL',
  'DOCKER_GOVERNANCE_URL',
])
  if (process.env[name] !== undefined)
    throw Error(`Unset ${name} before this production-service smoke test`);
const reportDir = values['report-dir']
  ? path.resolve(values['report-dir'])
  : fs.mkdtempSync(path.join(os.tmpdir(), 'domscribe-cloud-replay-'));
fs.mkdirSync(reportDir, { recursive: true, mode: 0o700 });
if (fs.readdirSync(reportDir).length !== 0)
  throw Error('report-dir must be empty');
console.log(`Evidence: ${reportDir}`);
const cancellation = new AbortController();
for (const signal of ['SIGINT', 'SIGTERM'] as const)
  process.once(signal, () =>
    cancellation.abort(new Error('Cloud run cancelled')),
  );
let client: Sandboxes | undefined;
try {
  const auth =
    values.auth === 'pat'
      ? (() => {
          const username = process.env.DOCKER_ID,
            personalAccessToken = process.env.DOCKER_PAT;
          if (!username || !personalAccessToken)
            throw Error(
              'Set DOCKER_ID and DOCKER_PAT through your environment/secret store',
            );
          return pat({ username, personalAccessToken });
        })()
      : oauth({
          onVerification({
            verificationUriComplete,
            verificationUri,
            userCode,
          }) {
            console.error(
              `Docker sign-in: ${verificationUriComplete ?? verificationUri}`,
            );
            if (!verificationUriComplete)
              console.error(`Verification code: ${userCode}`);
          },
        });
  // Sign in before the separately bounded allocation/execution budget starts.
  await auth.getAccessToken({
    signal: AbortSignal.any([
      cancellation.signal,
      AbortSignal.timeout(5 * 60 * 1000),
    ]),
  });
  client = new Sandboxes({ auth, maxRetries: 1 });
  // Structural compatibility is checked against the installed public SDK types.
  const api: CloudClient = client;
  const sdkVersion = createRequire(import.meta.url)(
    '@docker/sandboxes/package.json',
  ).version as string;
  const report = await runCloudReplay(api, {
    commit: values.commit,
    reportDir,
    bootstrap: fs.readFileSync(
      fileURLToPath(new URL('./bootstrap.sh', import.meta.url)),
      'utf8',
    ),
    sdkVersion,
    signal: cancellation.signal,
    onProgress: (phase) => console.log(`Cloud smoke: ${phase}`),
  });
  console.log(
    `Cloud smoke ${report.status}; sandbox deletion: ${report.cloud.deletion}`,
  );
  if (report.failures.length)
    console.error(JSON.stringify(report.failures, null, 2));
  process.exitCode = report.status === 'passed' ? 0 : 1;
} catch (error) {
  // Do not serialize SDK error payloads, tokens or authentication transport data.
  const e = error as { name?: unknown; httpStatus?: unknown };
  fs.writeFileSync(
    path.join(reportDir, 'authentication-result.json'),
    JSON.stringify(
      {
        status: 'failed',
        cloudAllocationAttempted: !!client,
        kind: typeof e?.name === 'string' ? e.name : 'Error',
        httpStatus:
          typeof e?.httpStatus === 'number' ? e.httpStatus : undefined,
      },
      null,
      2,
    ),
    { mode: 0o600 },
  );
  console.error(
    'Cloud smoke could not start or finish; inspect the retained result metadata.',
  );
  process.exitCode = 1;
} finally {
  await client?.close();
}
