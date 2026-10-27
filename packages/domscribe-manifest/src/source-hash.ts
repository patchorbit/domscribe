import xxhash from 'xxhash-wasm';

let hasher: ReturnType<typeof xxhash> | undefined;

/** Same content hash used by transform-time manifest entries; no cache/filesystem writes. */
export async function hashSource(content: string): Promise<string> {
  const api = await (hasher ??= xxhash());
  return api.h64(content).toString(16).padStart(16, '0');
}
