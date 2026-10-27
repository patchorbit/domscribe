import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { createIssuePacket } from '../../issue/issue-packet.js';
import { createIssueAnnotation } from '../../issue/__test-utils__/issue-fixture.js';
import { createIssueCommand } from './issue.command.js';

let root: string;
beforeEach(async () => {
  root = await mkdtemp(path.join(os.tmpdir(), 'domscribe-issue-cli-'));
  await mkdir(path.join(root, 'src'));
  await writeFile(path.join(root, 'src/Card.vue'), 'abc');
});
afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});
function command(online = false) {
  let output = '',
    errors = '';
  const cmd = createIssueCommand(async () => {
    if (!online) throw new Error('Relay is not running');
    return { root, annotation: createIssueAnnotation(root) };
  });
  for (const c of [cmd, ...cmd.commands]) {
    c.exitOverride();
    c.configureOutput({
      writeOut: (text) => {
        output += text;
      },
      writeErr: (text) => {
        errors += text;
      },
    });
  }
  return { cmd, output: () => output, errors: () => errors };
}
const args = [
  'export',
  'ann_12345678_123',
  '--expected',
  'Use Alpha',
  '--observed',
  'Uses Beta',
];
const run = (cmd: ReturnType<typeof createIssueCommand>, values: string[]) =>
  cmd.parseAsync(values, { from: 'user' });

it('exports usable JSON to stdout with opt-in runtime and documented prerequisites', async () => {
  const c = command(true);
  await run(c.cmd, [
    ...args,
    '--include-runtime',
    '--step',
    'Open properties',
    '--prerequisite',
    'Import Alpha',
  ]);
  const packet = JSON.parse(c.output());
  expect(packet.source.file).toBe('src/Card.vue');
  expect(packet.expected).toBe('Use Alpha');
  expect(packet.observed).toBe('Uses Beta');
  expect(packet.steps).toEqual(['Open properties']);
  expect(packet.prerequisites).toEqual(['Import Alpha']);
  expect(packet.runtime.componentProps.clientSecret).toBe('[REDACTED]');
  expect(c.output()).not.toContain(root);
});
it('requires expected and observed before trying an unavailable relay', async () => {
  const c = command();
  await expect(
    run(c.cmd, ['export', 'ann_12345678_123']),
  ).rejects.toMatchObject({ exitCode: 1 });
  expect(c.errors()).toContain('--expected');
});
it('reports an unavailable relay without creating output', async () => {
  const c = command();
  await expect(run(c.cmd, args)).rejects.toMatchObject({ exitCode: 1 });
  expect(c.errors()).toContain('Relay is not running');
  expect(c.output()).toBe('');
});
it('never overwrites an existing output file', async () => {
  const file = path.join(root, 'issue.json');
  await writeFile(file, 'keep this');
  const c = command(true);
  await expect(run(c.cmd, [...args, '--out', file])).rejects.toMatchObject({
    exitCode: 1,
  });
  expect(await readFile(file, 'utf8')).toBe('keep this');
});
it('inspects source in a second checkout offline, without any relay', async () => {
  const packet = await createIssuePacket(createIssueAnnotation(root), root, {
    expected: 'Use Alpha',
    observed: 'Uses Beta',
  });
  const file = path.join(root, 'issue.json');
  await writeFile(file, JSON.stringify(packet));
  const copy = path.join(root, 'copy');
  await mkdir(path.join(copy, 'src'), { recursive: true });
  await writeFile(path.join(copy, 'src/Card.vue'), 'abc');
  const c = command();
  await run(c.cmd, ['inspect', file, '--root', copy]);
  expect(c.output()).toContain('Source: matched');
  expect(c.output()).toContain('Use Alpha');
  await writeFile(path.join(copy, 'src/Card.vue'), 'changed');
  const json = command();
  await run(json.cmd, ['inspect', file, '--root', copy, '--format', 'json']);
  expect(JSON.parse(json.output()).sourceStatus).toBe('changed');
});
it('rejects malformed and oversized packets without echoing private input', async () => {
  const file = path.join(root, 'bad.json');
  await writeFile(file, 'private-credential-fixture');
  const c = command();
  await expect(run(c.cmd, ['inspect', file])).rejects.toMatchObject({
    exitCode: 1,
  });
  expect(c.errors()).not.toContain('private-credential-fixture');
  expect(c.output()).toBe('');
  await writeFile(file, 'x'.repeat(1048577));
  const large = command();
  await expect(run(large.cmd, ['inspect', file])).rejects.toMatchObject({
    exitCode: 1,
  });
  expect(large.errors()).toMatch(/size|large|limit/i);
});

it('does not echo private dictionary keys from schema validation failures', async () => {
  const packet = await createIssuePacket(createIssueAnnotation(root), root, {
    expected: 'Use Alpha',
    observed: 'Uses Beta',
  });
  const file = path.join(root, 'private-key.json');
  await writeFile(
    file,
    JSON.stringify({ ...packet, 'secret-person@example.com': 'private-value' }),
  );
  const c = command();
  await expect(run(c.cmd, ['inspect', file])).rejects.toMatchObject({
    exitCode: 1,
  });
  expect(c.errors()).not.toContain('secret-person@example.com');
  expect(c.errors()).not.toContain('private-value');
  expect(c.errors()).toContain('Invalid issue evidence');
});
