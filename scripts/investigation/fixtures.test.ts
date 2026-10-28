import test from 'node:test';
import assert from 'node:assert/strict';
import {
  readdir,
  mkdtemp,
  mkdir,
  readFile,
  stat,
  symlink,
  rm,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, isAbsolute } from 'node:path';
import { stageFixtures } from './fixtures.js';
const fixture = {
  id: 'payload',
  name: 'payload.json',
  mimeType: 'application/json' as const,
  content: '{"approved":true}',
};
test('stages only approved bytes privately inside app, with relative descriptors and empty no-op', async () => {
  const root = await mkdtemp(join(tmpdir(), 'investigation-files-'));
  try {
    assert.deepEqual(await stageFixtures(join(root, 'absent'), []), []);
    const app = join(root, 'app');
    await mkdir(app);
    const staged = await stageFixtures(app, [fixture]);
    assert.equal(staged.length, 1);
    assert.equal(staged[0].id, 'payload');
    assert(!isAbsolute(staged[0].relativePath));
    assert.equal(
      await readFile(join(app, staged[0].relativePath), 'utf8'),
      fixture.content,
    );
    assert.equal(
      (await stat(join(app, staged[0].relativePath))).mode & 0o777,
      0o600,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
test('symlinked node/cache roots cannot stage outside the app', async () => {
  const root = await mkdtemp(join(tmpdir(), 'investigation-file-symlink-'));
  try {
    const app = join(root, 'app'),
      outside = join(root, 'outside');
    await mkdir(app);
    await mkdir(outside);
    await symlink(outside, join(app, 'node_modules'));
    await assert.rejects(() => stageFixtures(app, [fixture]), /outside/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
test('a symlinked cache and invalid fixtures cannot create files outside app', async () => {
  const root = await mkdtemp(join(tmpdir(), 'investigation-cache-symlink-'));
  try {
    const app = join(root, 'app'),
      outside = join(root, 'outside');
    await mkdir(join(app, 'node_modules'), { recursive: true });
    await mkdir(outside);
    await symlink(outside, join(app, 'node_modules/.cache'));
    await assert.rejects(() => stageFixtures(app, [fixture]), /outside/);
    await assert.rejects(() =>
      stageFixtures(app, [{ ...fixture, name: '../outside.json' }]),
    );
    assert.deepEqual(await readdir(outside), []);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
