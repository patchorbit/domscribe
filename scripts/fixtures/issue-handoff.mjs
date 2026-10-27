import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import { runOwnedBuild } from './replay-process.mjs';

async function cli(consumer, work, args, name) {
  const req = createRequire(path.join(consumer, 'package.json'));
  const log = path.join(work, name + '.log');
  await runOwnedBuild(process.execPath, [req.resolve('domscribe'), ...args], {
    cwd: consumer,
    env: process.env,
    logPath: log,
    timeoutMs: 30000,
    label: 'Issue CLI ' + name,
  });
  return fs.readFileSync(log, 'utf8');
}
function customer(page, name) {
  return page
    .locator('article,li,tr')
    .filter({ has: page.getByRole('heading', { name, exact: true }) })
    .or(
      page
        .locator('li,tr')
        .filter({ has: page.getByText(name, { exact: true }) }),
    );
}
export async function captureIssuePacket({ page, consumer, work, client }) {
  const began = Date.now();
  await customer(page, 'Orion')
    .getByRole('button', { name: 'Edit', exact: true })
    .click();
  await page.getByRole('checkbox', { name: 'Confirm shipping change' }).check();
  await page
    .getByRole('button', { name: 'Open Domscribe overlay', exact: true })
    .click();
  const save = page.getByRole('button', { name: 'Save', exact: true });
  await save.scrollIntoViewIfNeeded();
  const rect = await save.boundingBox();
  assert(rect);
  await page
    .getByRole('button', { name: 'Capture element', exact: true })
    .click();
  await page.mouse.click(rect.x + 4, rect.y + 4);
  await page
    .getByPlaceholder('Describe the change you want...', { exact: true })
    .fill(
      'Handoff acceptance fixture: inspect the exact Orion Save control and preserve its historical context. This fixture is not a confirmed product bug.',
    );
  const response = page.waitForResponse(
    (r) =>
      r.request().method() === 'POST' &&
      new URL(r.url()).pathname === '/api/v1/annotations',
  );
  await page
    .getByRole('button', { name: 'Submit annotation', exact: true })
    .click();
  const annotation = await (await response).json();
  assert(annotation.metadata?.id);
  assert(
    annotation.context.manifestSnapshot?.[0]?.sourceHash,
    'native annotation must include confirmed original-source hash',
  );
  fs.writeFileSync(
    path.join(work, 'native-annotation.json'),
    JSON.stringify(annotation, null, 2),
  );
  await page.screenshot({ path: path.join(work, 'native-annotation.png') });
  const packetFile = path.join(work, 'issue.domscribe.json');
  await cli(
    consumer,
    work,
    [
      'issue',
      'export',
      annotation.metadata.id,
      '--expected',
      'Only the selected Orion record is identified',
      '--observed',
      'Captured this Orion Save instance for handoff testing, not a confirmed defect',
      '--prerequisite',
      'Start this synthetic customer fixture with its seeded records',
      '--step',
      'Open Orion Edit and confirm the shipping change',
      '--include-runtime',
      '--include-replay',
      '--out',
      packetFile,
    ],
    'issue-export',
  );
  assert.deepEqual(
    await client.getAnnotation(annotation.metadata.id),
    annotation,
    'export must not mutate stored annotation',
  );
  const packet = JSON.parse(fs.readFileSync(packetFile));
  assert.equal(packet.runtime.componentProps.customer.id, 'c1');
  assert.equal(packet.capture.element.tagName, 'button');
  assert.equal(packet.portability.locator, 'available');
  assert.equal(packet.portability.replay, 'not_recorded');
  assert(!JSON.stringify(packet).includes(consumer));
  assert(
    !JSON.stringify(packet).includes(
      annotation.interaction.selectedElement.target.instanceId,
    ),
  );
  await page
    .getByRole('button', { name: 'Close sidebar', exact: true })
    .click();
  await save.click();
  await customer(page, 'Vega')
    .getByRole('button', { name: 'Edit', exact: true })
    .click();
  const wrong = await client.queryTargets({ locator: packet.capture.locator });
  assert.equal(wrong.status, 'not_found');
  assert.equal(
    await page.getByRole('textbox', { name: 'Shipping city' }).inputValue(),
    'Denver',
  );
  await page.getByRole('checkbox', { name: 'Confirm shipping change' }).check();
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  return {
    packetFile,
    annotationId: annotation.metadata.id,
    source: packet.source,
    wrongBusinessStatus: wrong.status,
    captureExportAutomationMs: Date.now() - began,
    packetSha256: createHash('sha256')
      .update(fs.readFileSync(packetFile))
      .digest('hex'),
  };
}
export async function verifyIssueOffline({
  consumer,
  work,
  handoff,
  relayPort,
}) {
  await cli(consumer, work, ['stop'], 'issue-stop-reporter');
  await assert.rejects(() =>
    fetch('http://127.0.0.1:' + relayPort + '/health', {
      signal: AbortSignal.timeout(2000),
    }),
  );
  const git = (...args) =>
    execFileSync('git', args, {
      cwd: consumer,
      encoding: 'utf8',
      stdio: 'pipe',
    });
  git('init');
  git('add', 'src', 'package.json', 'index.html', 'vite.config.mjs');
  git(
    '-c',
    'user.name=Handoff fixture',
    '-c',
    'user.email=fixture@example.invalid',
    '-c',
    'commit.gpgsign=false',
    'commit',
    '-m',
    'Isolated handoff source fixture',
  );
  const receiving = path.join(work, 'receiving-source');
  git('worktree', 'add', '--detach', receiving, 'HEAD');
  const began = Date.now();
  const matched = JSON.parse(
    await cli(
      consumer,
      work,
      [
        'issue',
        'inspect',
        handoff.packetFile,
        '--root',
        receiving,
        '--format',
        'json',
      ],
      'issue-inspect-matched',
    ),
  );
  assert.equal(matched.sourceStatus, 'matched');
  assert(
    !fs.existsSync(path.join(receiving, '.domscribe')),
    'offline inspect must not create relay metadata',
  );
  assert.equal(matched.packet.runtime.componentProps.customer.id, 'c1');
  await cli(
    consumer,
    work,
    ['issue', 'inspect', handoff.packetFile, '--root', receiving],
    'issue-inspect-markdown',
  );
  const sourceFile = path.join(receiving, handoff.source.file);
  fs.appendFileSync(sourceFile, '\n<!-- receiving checkout changed -->\n');
  const changed = JSON.parse(
    await cli(
      consumer,
      work,
      [
        'issue',
        'inspect',
        handoff.packetFile,
        '--root',
        receiving,
        '--format',
        'json',
      ],
      'issue-inspect-changed',
    ),
  );
  assert.equal(changed.sourceStatus, 'changed');
  assert.equal(
    createHash('sha256')
      .update(fs.readFileSync(handoff.packetFile))
      .digest('hex'),
    handoff.packetSha256,
  );
  const result = {
    ...handoff,
    receiving,
    matchingSourceStatus: matched.sourceStatus,
    changedSourceStatus: changed.sourceStatus,
    reporterBrowserClosed: true,
    reporterRelayStopped: true,
    manualPacketEdits: 0,
    offlineInspectionAutomationMs: Date.now() - began,
    timingScope:
      'automated fixture operations, not human usability or agent repair timing',
  };
  fs.writeFileSync(
    path.join(work, 'issue-handoff-result.json'),
    JSON.stringify(result, null, 2),
  );
  return result;
}
