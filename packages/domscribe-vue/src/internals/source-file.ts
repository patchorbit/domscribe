/** Compare only absolute filesystem namespaces, never basenames or suffixes. */
export function normalizeSourceFile(value: string): string | null {
  let path = value.replace(/\\/g, '/');
  if (path.startsWith('file://')) {
    try {
      const url = new URL(path);
      if (url.hostname && url.hostname !== 'localhost') return null;
      path = decodeURIComponent(url.pathname);
    } catch {
      return null;
    }
  } else {
    if (path.startsWith('/@fs/')) {
      path = path.slice(5);
      if (!/^[A-Za-z]:\//.test(path)) path = '/' + path.replace(/^\/+/, '');
    }
  }
  if (/^\/[A-Za-z]:\//.test(path)) path = path.slice(1);
  if (!path.startsWith('/') && !/^[A-Za-z]:\//.test(path)) return null;
  // Do not collapse ambiguous dot segments supplied by unknown module namespaces.
  if (path.split('/').some((part) => part === '.' || part === '..'))
    return null;
  return path;
}
