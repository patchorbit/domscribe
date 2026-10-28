import { mkdir, mkdtemp, realpath, writeFile } from 'node:fs/promises';
import { isAbsolute, join, relative, sep } from 'node:path';
import { FixturesSchema, type FileFixture } from './schema.js';
function contained(root: string, path: string): void {
  const rel = relative(root, path);
  if (isAbsolute(rel) || rel === '..' || rel.startsWith('..' + sep))
    throw Error('Fixture directory outside app');
}
export async function stageFixtures(app: string, rawFixtures: FileFixture[]) {
  const fixtures = FixturesSchema.parse(rawFixtures);
  if (!fixtures.length) return [];
  const root = await realpath(app),
    modules = join(root, 'node_modules');
  await mkdir(modules, { recursive: true });
  contained(root, await realpath(modules));
  const cache = join(modules, '.cache');
  await mkdir(cache, { recursive: true });
  contained(root, await realpath(cache));
  const dir = await mkdtemp(join(cache, 'domscribe-inputs-'));
  const descriptors = [];
  for (const fixture of fixtures) {
    const path = join(dir, fixture.name);
    await writeFile(path, fixture.content, {
      encoding: 'utf8',
      mode: 0o600,
      flag: 'wx',
    });
    descriptors.push({
      id: fixture.id,
      name: fixture.name,
      relativePath: relative(root, path).split(sep).join('/'),
    });
  }
  return descriptors;
}
