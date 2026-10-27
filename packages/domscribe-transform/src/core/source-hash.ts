import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { SourceMapConsumer } from 'source-map';
import { hashSource } from '@domscribe/manifest';

function absoluteName(value: string): string | undefined {
  try {
    const file = value.startsWith('file:') ? fileURLToPath(value) : value;
    return path.isAbsolute(file) ? path.normalize(file) : undefined;
  } catch {
    return;
  }
}

/** Confirm the exact source-map file; never guess from a basename or hash generated code as source. */
export async function originalSourceHash(
  map: SourceMapConsumer | undefined,
  file: string,
): Promise<string | undefined> {
  const requested = absoluteName(file);
  if (!requested || !map) return;
  const sources: unknown = 'sources' in map ? map.sources : undefined;
  if (!Array.isArray(sources)) return;
  const names = sources.filter(
    (name: unknown): name is string =>
      typeof name === 'string' && absoluteName(name) === requested,
  );
  if (names.length !== 1) return;
  const content = map.sourceContentFor(names[0], true);
  return typeof content === 'string' ? hashSource(content) : undefined;
}
