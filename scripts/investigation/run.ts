import { readFile, stat } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { investigate } from './controller.js';
import { discover } from './agent.js';
export function parseArguments(
  args: string[],
): { help: true } | { config: string; out: string } {
  if (args.length === 1 && args[0] === '--help') return { help: true };
  if (
    args.length !== 2 ||
    !args.some((a) => a.startsWith('--config=')) ||
    !args.some((a) => a.startsWith('--out='))
  )
    throw Error('Use --config=<file> --out=<new-directory>');
  const config = args.find((a) => a.startsWith('--config='))?.slice(9),
    out = args.find((a) => a.startsWith('--out='))?.slice(6);
  if (!config || !out) throw Error('Config and new output directory required');
  return { config: resolve(config), out: resolve(out) };
}
export async function main(args: string[]): Promise<number> {
  const parsed = parseArguments(args);
  if ('help' in parsed) {
    console.log(
      'Experimental trusted-local browser PR investigation\nUsage: pnpm exec tsx scripts/investigation/run.ts --config=<file> --out=<new-directory>\nRequires configured synthetic-data app, local Codex sign-in and installed Playwright Chromium. No external posting or app changes.',
    );
    return 0;
  }
  if ((await stat(parsed.config)).size > 1048576)
    throw Error('Config exceeds 1MiB');
  const stop = new AbortController();
  const abort = () => stop.abort();
  process.once('SIGINT', abort);
  process.once('SIGTERM', abort);
  try {
    const report = await investigate(
      JSON.parse(await readFile(parsed.config, 'utf8')),
      parsed.out,
      discover,
      stop.signal,
    );
    console.log(
      JSON.stringify({
        status: report.status,
        journeys: report.journeys.map((j) => ({ id: j.id, status: j.status })),
        report: resolve(parsed.out, 'report.json'),
      }),
    );
    return report.status === 'verified' ? 0 : 2;
  } finally {
    process.removeListener('SIGINT', abort);
    process.removeListener('SIGTERM', abort);
  }
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
)
  main(process.argv.slice(2))
    .then((code) => {
      process.exitCode = code;
    })
    .catch(() => {
      console.error(
        'Investigation failed; verify configuration and inspect private output logs.',
      );
      process.exitCode = 1;
    });
