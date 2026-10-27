import { redactPII, redactSensitiveFields } from '@domscribe/core';

export const ISSUE_BYTE_LIMIT = 1024 * 1024;

/** Check before recursive schema/privacy work; JSON evidence only, not arbitrary live objects. */
export function checkEvidenceBounds(value: unknown): void {
  const pending: Array<[unknown, number]> = [[value, 0]];
  let count = 0;
  while (pending.length) {
    const item = pending.pop();
    if (!item) break;
    const [current, depth] = item;
    if (++count > 10000 || depth > 12)
      throw new Error('Issue evidence exceeds the nesting/node limit');
    if (current && typeof current === 'object') {
      for (const [key, child] of Object.entries(current)) {
        if (key === '__proto__') throw new Error('Unsafe issue evidence key');
        pending.push([child, depth + 1]);
      }
    }
  }
  const encoded = JSON.stringify(value);
  if (!encoded || Buffer.byteLength(encoded) + 1 > ISSUE_BYTE_LIMIT)
    throw new Error('Issue evidence exceeds the 1MiB size limit');
}

export function sanitizeIssueEvidence(value: unknown, root: string): unknown {
  const prefixes = [...new Set([root, root.replaceAll('\\', '/')])]
    .filter(Boolean)
    .sort((a, b) => b.length - a.length);
  function walk(current: unknown): unknown {
    if (typeof current === 'string') {
      let clean = current;
      for (const prefix of prefixes)
        clean = clean.replaceAll(prefix, '<project>');
      const redacted = redactPII(clean);
      try {
        const decoded = decodeURIComponent(clean);
        if (decoded !== clean && redactPII(decoded) !== decoded)
          return '[REDACTED]';
      } catch {
        /* Malformed percent escapes are ordinary evidence text. */
      }
      return redacted;
    }
    if (Array.isArray(current)) return current.map(walk);
    if (current && typeof current === 'object') {
      const entries = Object.entries(current);
      // Renaming two private keys to the same marker would silently merge distinct evidence.
      if (entries.some(([key]) => walk(key) !== key)) return '[REDACTED_KEYS]';
      return Object.fromEntries(
        entries.map(([key, child]) => [key, walk(child)]),
      );
    }
    return current;
  }
  return walk(
    redactSensitiveFields(value, [
      'localStorage',
      'sessionStorage',
      'storage',
      'nativeStorage',
    ]),
  );
}
