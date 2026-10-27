import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { ManifestWriter } from './manifest-writer.js';
import { ManifestReader } from '../reader/manifest-reader.js';

it('upgrades source-hash metadata for an existing ID once, including after restart, without duplicate index entries', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'domscribe-hash-upgrade-'));
  let writer: ManifestWriter | undefined;
  let reader: ManifestReader | undefined;
  try {
    await mkdir(path.join(root, '.domscribe'));
    const file = path.join(root, '.domscribe/manifest.jsonl');
    const entry = {
      id: 'abcd1234',
      file: 'src/Button.tsx',
      start: { line: 1, column: 0 },
      fileHash: '0011223344556677',
    };
    await writeFile(file, JSON.stringify(entry) + '\n');
    writer = ManifestWriter.getInstance(root);
    const updated = { ...entry, sourceHash: '44bc2cf5ad770999' };
    writer.appendEntries([updated]);
    writer.appendEntries([updated]);
    expect(writer.getStats().entryCount).toBe(1);
    expect(writer.getEntriesByFile(entry.file)).toEqual([entry.id]);
    writer.close();
    writer = undefined;
    let rows = (await readFile(file, 'utf8'))
      .trim()
      .split('\n')
      .map((line) => JSON.parse(line));
    expect(rows.at(-1).sourceHash).toBe('44bc2cf5ad770999');
    expect(rows).toHaveLength(2);
    writer = ManifestWriter.getInstance(root);
    expect(writer.getStats().entryCount).toBe(1);
    writer.appendEntries([updated]);
    writer.close();
    writer = undefined;
    rows = (await readFile(file, 'utf8'))
      .trim()
      .split('\n')
      .map((line) => JSON.parse(line));
    expect(rows).toHaveLength(2);
    reader = new ManifestReader(root);
    reader.initialize();
    expect(reader.resolve(entry.id).entry?.sourceHash).toBe('44bc2cf5ad770999');
  } finally {
    writer?.close();
    reader?.close();
    await rm(root, { recursive: true, force: true });
  }
});

it('keeps the existing last-record mapping when loading legacy duplicate IDs from different files', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'domscribe-legacy-index-'));
  let writer: ManifestWriter | undefined;
  try {
    await mkdir(path.join(root, '.domscribe'));
    const entries = ['src/First.tsx', 'src/Last.tsx'].map((file) => ({
      id: 'abcd1234',
      file,
      start: { line: 1, column: 0 },
    }));
    await writeFile(
      path.join(root, '.domscribe/manifest.jsonl'),
      entries.map((entry) => JSON.stringify(entry)).join('\n') + '\n',
    );
    writer = ManifestWriter.getInstance(root);
    expect(writer.resolveId('abcd1234')).toBe('src/Last.tsx');
  } finally {
    writer?.close();
    await rm(root, { recursive: true, force: true });
  }
});

it.each([false, true])(
  'does not inherit an earlier source hash when the winning record omitted it (same file: %s)',
  async (sameFile) => {
    const root = await mkdtemp(
      path.join(os.tmpdir(), 'domscribe-hash-absence-'),
    );
    let writer: ManifestWriter | undefined;
    let reader: ManifestReader | undefined;
    try {
      await mkdir(path.join(root, '.domscribe'));
      const file = path.join(root, '.domscribe/manifest.jsonl');
      const last = {
        id: 'abcd1234',
        file: 'src/Last.tsx',
        start: { line: 1, column: 0 },
        fileHash: '0011223344556677',
      };
      const first = {
        ...last,
        file: sameFile ? last.file : 'src/First.tsx',
        sourceHash: '44bc2cf5ad770999',
      };
      await writeFile(
        file,
        [first, last].map((entry) => JSON.stringify(entry)).join('\n') + '\n',
      );
      writer = ManifestWriter.getInstance(root);
      writer.appendEntries([{ ...last, sourceHash: '44bc2cf5ad770999' }]);
      writer.close();
      writer = undefined;
      reader = new ManifestReader(root);
      reader.initialize();
      expect(reader.resolve(last.id).entry?.sourceHash).toBe(
        '44bc2cf5ad770999',
      );
      reader.close();
      reader = undefined;
      const before = await readFile(file, 'utf8');
      writer = ManifestWriter.getInstance(root);
      writer.appendEntries([{ ...last, sourceHash: '44bc2cf5ad770999' }]);
      writer.close();
      writer = undefined;
      expect(await readFile(file, 'utf8')).toBe(before);
    } finally {
      writer?.close();
      reader?.close();
      await rm(root, { recursive: true, force: true });
    }
  },
);
