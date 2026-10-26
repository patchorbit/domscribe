import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

export function preferUbuntuMirrors(content) {
  const order = [
    'archive.ubuntu.com',
    'security.ubuntu.com',
    'azure.archive.ubuntu.com',
  ];
  const comments = [],
    rows = [];
  const unsupported = () => {
    throw new Error('Unsupported Ubuntu runner mirror list');
  };
  for (const line of content.split(/\r?\n/)) {
    if (!line.trim() || line.trimStart().startsWith('#')) {
      comments.push(line);
      continue;
    }
    const match = line.match(/^(https?:\/\/[^\s]+)\t(.+)$/);
    if (!match) unsupported();
    let uri;
    try {
      uri = new URL(match[1]);
    } catch {
      // Native URL errors retain input; do not echo unfamiliar runner data.
      unsupported();
    }
    const metadata = match[2].trim().split(/\s+/);
    const priorities = metadata.filter((value) =>
      value.startsWith('priority:'),
    );
    if (
      !order.includes(uri.hostname) ||
      uri.username ||
      uri.password ||
      uri.search ||
      uri.hash ||
      uri.port ||
      !/^\/ubuntu\/?$/.test(uri.pathname) ||
      priorities.length !== 1 ||
      !/^priority:\d+$/.test(priorities[0])
    )
      unsupported();
    rows.push({ uri: match[1], host: uri.hostname, metadata });
  }
  if (
    rows.length !== order.length ||
    new Set(rows.map((row) => row.host)).size !== order.length
  )
    unsupported();
  rows.sort((a, b) => order.indexOf(a.host) - order.indexOf(b.host));
  return (
    [
      ...comments.filter((line) => line.trim()),
      ...rows.map(
        (row, i) =>
          `${row.uri}\t${row.metadata.map((value) => (/^priority:\d+$/.test(value) ? `priority:${i + 1}` : value)).join(' ')}`,
      ),
    ].join('\n') + '\n'
  );
}

if (
  process.argv[1] &&
  pathToFileURL(resolve(process.argv[1])).href === import.meta.url
) {
  const [input, output] = process.argv.slice(2);
  if (!input || !output || resolve(input) === resolve(output)) {
    throw new Error(
      'Usage: browser-mirrors.mjs <runner-mirror-list> <prepared-list>',
    );
  }
  writeFileSync(output, preferUbuntuMirrors(readFileSync(input, 'utf8')));
}
