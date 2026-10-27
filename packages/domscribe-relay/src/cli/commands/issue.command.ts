import { Command } from 'commander';
import { z } from 'zod/v4';
import { readFile, stat, writeFile } from 'node:fs/promises';
import {
  AnnotationIdSchema,
  IssueExportOptionsSchema,
  type Annotation,
} from '@domscribe/core';
import { RelayControl } from '../../lifecycle/relay-control.js';
import { RelayHttpClient } from '../../client/relay-http-client.js';
import { getWorkspaceRoot } from '../utils.js';
import {
  createIssuePacket,
  inspectIssuePacket,
  parseIssuePacket,
  renderIssuePacket,
} from '../../issue/issue-packet.js';
import { ISSUE_BYTE_LIMIT } from '../../issue/issue-input.js';

const ExportOptionsSchema = IssueExportOptionsSchema.omit({
  steps: true,
  prerequisites: true,
}).extend({
  step: z.array(z.string()).default([]),
  prerequisite: z.array(z.string()).default([]),
  out: z.string().min(1).optional(),
});
const InspectOptionsSchema = z
  .object({
    root: z.string().min(1).optional(),
    format: z.enum(['markdown', 'json']).default('markdown'),
  })
  .strict();
type AnnotationLoader = (
  id: string,
) => Promise<{ annotation: Annotation; root: string }>;

async function loadWorkspaceAnnotation(id: string) {
  const root = getWorkspaceRoot();
  if (!root)
    throw new Error(
      'Run export from a Domscribe workspace with a running relay',
    );
  const { running, lockData } = await new RelayControl(root).getStatus();
  if (!running || !lockData?.host || !lockData.port)
    throw new Error(
      'Relay is not running. Start your instrumented dev server before exporting.',
    );
  const annotation = await new RelayHttpClient(
    lockData.host,
    lockData.port,
  ).getAnnotation(id);
  return { root, annotation };
}

function fail(command: Command, error: unknown): never {
  return command.error(
    `[domscribe] ${error instanceof z.ZodError ? 'Invalid issue evidence: does not match the supported schema' : error instanceof Error ? error.message : 'Issue operation failed'}`,
    { exitCode: 1, code: 'domscribe.issue' },
  );
}
function output(command: Command, value: string): void {
  command.configureOutput().writeOut?.(value);
}
const append = (value: string, previous: string[]) => [...previous, value];

/** New instances let callers configure output and exit handling without global console/process mocks. */
export function createIssueCommand(
  loadAnnotation: AnnotationLoader = loadWorkspaceAnnotation,
): Command {
  const issue = new Command('issue').description(
    'Export or inspect portable, historical UI issue evidence',
  );
  issue.addCommand(
    new Command('export')
      .argument(
        '<annotationId>',
        'Annotation to export from the current workspace relay',
      )
      .requiredOption('--expected <text>', 'Expected behavior')
      .requiredOption('--observed <text>', 'Observed behavior')
      .option('--title <text>', 'Issue title')
      .option(
        '--step <text>',
        'Document a reproduction step (repeatable)',
        append,
        [],
      )
      .option(
        '--prerequisite <text>',
        'Document app/data/auth prerequisites (repeatable)',
        append,
        [],
      )
      .option(
        '--include-runtime',
        'Include captured props/state with known-marker redaction',
      )
      .option(
        '--include-replay',
        'Include explicit recorded steps after privacy checks',
      )
      .option(
        '--out <file>',
        'Create a new packet file; existing files are never overwritten',
      )
      .action(async (id: string, raw: unknown, command: Command) => {
        try {
          const options = ExportOptionsSchema.parse(raw);
          const { annotation, root } = await loadAnnotation(
            AnnotationIdSchema.parse(id),
          );
          const packet = await createIssuePacket(annotation, root, {
            expected: options.expected,
            observed: options.observed,
            title: options.title,
            steps: options.step,
            prerequisites: options.prerequisite,
            includeRuntime: options.includeRuntime,
            includeReplay: options.includeReplay,
          });
          const encoded = JSON.stringify(packet) + '\n';
          if (options.out)
            await writeFile(options.out, encoded, { flag: 'wx', mode: 0o600 });
          else output(command, encoded);
        } catch (error) {
          fail(command, error);
        }
      }),
  );
  issue.addCommand(
    new Command('inspect')
      .argument('<file>', 'JSON packet to inspect offline')
      .option(
        '--root <checkout>',
        'Receiving source checkout root (default current directory)',
      )
      .option('--format <format>', 'markdown or json', 'markdown')
      .action(async (file: string, raw: unknown, command: Command) => {
        try {
          const options = InspectOptionsSchema.parse(raw);
          const info = await stat(file);
          if (!info.isFile() || info.size > ISSUE_BYTE_LIMIT)
            throw new Error(
              'Issue packet must be a regular file within the 1MiB size limit',
            );
          const packet = parseIssuePacket(await readFile(file, 'utf8'));
          const inspection = await inspectIssuePacket(
            packet,
            options.root ?? process.cwd(),
          );
          output(
            command,
            options.format === 'json'
              ? JSON.stringify(inspection) + '\n'
              : renderIssuePacket(inspection),
          );
        } catch (error) {
          fail(command, error);
        }
      }),
  );
  return issue;
}

export const IssueCommand = createIssueCommand();
