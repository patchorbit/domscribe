import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import {
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
  symlinkSync,
  linkSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { preferUbuntuMirrors } from './browser-mirrors.mjs';

const runnerList =
  [
    'http://azure.archive.ubuntu.com/ubuntu\tpriority:1',
    'http://archive.ubuntu.com/ubuntu\tpriority:2',
    'http://security.ubuntu.com/ubuntu\tpriority:3',
  ].join('\n') + '\n';

test('prefer existing official Ubuntu mirrors while retaining Azure fallback', () => {
  const rows = preferUbuntuMirrors(runnerList).trim().split('\n');
  assert.equal(rows[0], 'http://archive.ubuntu.com/ubuntu\tpriority:1');
  assert.equal(rows[1], 'http://security.ubuntu.com/ubuntu\tpriority:2');
  assert.equal(rows[2], 'http://azure.archive.ubuntu.com/ubuntu\tpriority:3');
});

test('preserve transport, metadata and comments without adding package sources', () => {
  const source =
    '# Hosted runner mirrors\n\n' +
    runnerList
      .replaceAll('http:', 'https:')
      .replace('priority:2', 'priority:2 arch:amd64');
  const prepared = preferUbuntuMirrors(source);
  assert.match(
    prepared,
    /https:\/\/archive\.ubuntu\.com\/ubuntu\tpriority:1 arch:amd64/,
  );
  assert.match(prepared, /^# Hosted runner mirrors/m);
  assert.equal((prepared.match(/https:/g) ?? []).length, 3);
});

test('refuse unfamiliar or incomplete runner lists', () => {
  for (const source of [
    runnerList.replace(
      'archive.ubuntu.com/ubuntu\tpriority:2',
      'mirror.example/ubuntu\tpriority:2',
    ),
    runnerList.replace(/^http:\/\/azure[^\n]+\n/m, ''),
    runnerList + 'http://archive.ubuntu.com/ubuntu\tpriority:4\n',
    runnerList.replace('priority:2', ''),
  ])
    assert.throws(
      () => preferUbuntuMirrors(source),
      /Unsupported Ubuntu runner mirror list/,
    );
});

test('reject a malformed duplicate priority instead of preserving it', () => {
  assert.throws(
    () =>
      preferUbuntuMirrors(
        runnerList.replace('priority:2', 'priority:2 priority:invalid'),
      ),
    /Unsupported Ubuntu runner mirror list/,
  );
});

test('malformed URLs use a generic error without retaining raw input', () => {
  assert.throws(
    () =>
      preferUbuntuMirrors(
        runnerList.replace(
          'http://archive.ubuntu.com/ubuntu',
          'http://[invalid]/ubuntu',
        ),
      ),
    (error) =>
      error.message === 'Unsupported Ubuntu runner mirror list' &&
      !('input' in error),
  );
});

test('CLI writes a prepared copy and leaves the runner input unchanged', () => {
  const root = mkdtempSync(join(tmpdir(), 'domscribe-browser-mirrors-'));
  try {
    const input = join(root, 'input'),
      output = join(root, 'output');
    writeFileSync(input, runnerList);
    const result = spawnSync(
      process.execPath,
      [
        new URL('./browser-mirrors.mjs', import.meta.url).pathname,
        input,
        output,
      ],
      { encoding: 'utf8' },
    );
    assert.equal(result.status, 0, result.stderr);
    assert.equal(readFileSync(input, 'utf8'), runnerList);
    assert.match(
      readFileSync(output, 'utf8'),
      /^http:\/\/archive\.ubuntu\.com\/ubuntu\tpriority:1/m,
    );
  } finally {
    rmSync(root, { recursive: true });
  }
});

test('invalid CLI input fails without replacing an existing prepared copy', () => {
  const root = mkdtempSync(join(tmpdir(), 'domscribe-browser-mirrors-'));
  try {
    const input = join(root, 'input'),
      output = join(root, 'output');
    writeFileSync(input, 'http://mirror.example/ubuntu\tpriority:1\n');
    writeFileSync(output, 'unchanged');
    const result = spawnSync(
      process.execPath,
      [
        new URL('./browser-mirrors.mjs', import.meta.url).pathname,
        input,
        output,
      ],
      { encoding: 'utf8' },
    );
    assert.notEqual(result.status, 0);
    assert.equal(readFileSync(output, 'utf8'), 'unchanged');
    assert.doesNotMatch(result.stderr, /mirror\.example/);
  } finally {
    rmSync(root, { recursive: true });
  }
});

test('reject raw URL spellings that a URL parser would normalize into the allowlist', () => {
  for (const url of [
    'http://archive.ubuntu.com:80/ubuntu',
    'https://archive.ubuntu.com:443/ubuntu',
    'http://archive.ubuntu.com/unexpected/../ubuntu',
    'http://archive.ubuntu.com/ubuntu?',
    'http://archive.ubuntu.com/ubuntu#',
    'http://@archive.ubuntu.com/ubuntu',
    'http://%61rchive.ubuntu.com/ubuntu',
  ])
    assert.throws(
      () =>
        preferUbuntuMirrors(
          runnerList.replace('http://archive.ubuntu.com/ubuntu', url),
        ),
      { message: 'Unsupported Ubuntu runner mirror list' },
    );
});
test('CLI rejects normalized URL tokens without replacing existing output', () => {
  const root = mkdtempSync(join(tmpdir(), 'ds-mirror-normalized-'));
  try {
    const input = join(root, 'input'),
      output = join(root, 'output');
    writeFileSync(
      input,
      runnerList.replace(
        'http://archive.ubuntu.com/ubuntu',
        'http://archive.ubuntu.com:80/ubuntu',
      ),
    );
    writeFileSync(output, 'unchanged');
    const result = spawnSync(
      process.execPath,
      [
        new URL('./browser-mirrors.mjs', import.meta.url).pathname,
        input,
        output,
      ],
      { encoding: 'utf8' },
    );
    assert.notEqual(result.status, 0);
    assert.equal(readFileSync(output, 'utf8'), 'unchanged');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
for (const kind of ['symlink', 'hardlink'])
  test('CLI refuses ' + kind + ' output alias without modifying input', () => {
    const root = mkdtempSync(join(tmpdir(), 'ds-mirror-alias-'));
    try {
      const input = join(root, 'input'),
        output = join(root, 'output');
      writeFileSync(input, runnerList);
      if (kind === 'symlink') symlinkSync(input, output);
      else linkSync(input, output);
      const result = spawnSync(
        process.execPath,
        [
          new URL('./browser-mirrors.mjs', import.meta.url).pathname,
          input,
          output,
        ],
        { encoding: 'utf8' },
      );
      assert.notEqual(result.status, 0);
      assert.equal(readFileSync(input, 'utf8'), runnerList);
      assert.equal(readFileSync(output, 'utf8'), runnerList);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
test('CLI requires a new output even for valid input', () => {
  const root = mkdtempSync(join(tmpdir(), 'ds-mirror-existing-'));
  try {
    const input = join(root, 'input'),
      output = join(root, 'output');
    writeFileSync(input, runnerList);
    writeFileSync(output, 'keep');
    const result = spawnSync(
      process.execPath,
      [
        new URL('./browser-mirrors.mjs', import.meta.url).pathname,
        input,
        output,
      ],
      { encoding: 'utf8' },
    );
    assert.notEqual(result.status, 0);
    assert.equal(readFileSync(output, 'utf8'), 'keep');
    assert.equal(readFileSync(input, 'utf8'), runnerList);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
