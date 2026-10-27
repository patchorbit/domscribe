import { readFile, realpath, stat } from 'node:fs/promises';
import {
  AnnotationSchema,
  IssueExportOptionsSchema,
  IssuePacketSchema,
  IssueSourceSchema,
  type Annotation,
  type IssueExportOptions,
  type IssueInspection,
  type IssuePacket,
} from '@domscribe/core';
import { hashSource } from '@domscribe/manifest';
import {
  ISSUE_BYTE_LIMIT,
  checkEvidenceBounds,
  sanitizeIssueEvidence,
} from './issue-input.js';
import { issueSourcePath, portableIssueSource } from './issue-source.js';

export function parseIssuePacket(text: string): IssuePacket {
  if (Buffer.byteLength(text) > ISSUE_BYTE_LIMIT)
    throw new Error('Issue packet exceeds the 1MiB size limit');
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    throw new Error('Invalid issue packet JSON');
  }
  checkEvidenceBounds(value);
  return IssuePacketSchema.parse(value);
}

export async function createIssuePacket(
  input: Annotation,
  root: string,
  inputOptions: IssueExportOptions,
): Promise<IssuePacket> {
  checkEvidenceBounds(input);
  const annotation = AnnotationSchema.parse(input);
  const options = IssueExportOptionsSchema.parse(inputOptions);
  const physicalRoot = await realpath(root);
  const clean = (value: unknown) =>
    sanitizeIssueEvidence(sanitizeIssueEvidence(value, root), physicalRoot);
  const selected = annotation.interaction.selectedElement;
  if (!selected)
    throw new Error(
      'Issue export requires an element annotation; recapture a selected element',
    );
  const pathname = new URL(
    annotation.context.pageUrl,
    'http://domscribe.invalid',
  ).pathname;
  const packet: IssuePacket = {
    version: 1,
    title: String(clean(options.title ?? `UI issue: ${selected.tagName}`)),
    expected: String(clean(options.expected)),
    observed: String(clean(options.observed)),
    steps: options.steps.map((step) => String(clean(step))),
    prerequisites: options.prerequisites.map((step) => String(clean(step))),
    capture: {
      annotationId: annotation.metadata.id,
      timestamp: annotation.metadata.timestamp,
      pathname: String(clean(pathname)),
      element: {
        tagName: selected.tagName,
        ...(selected.innerText === undefined
          ? {}
          : { text: String(clean(selected.innerText)) }),
      },
    },
    portability: {
      locator: 'not_captured',
      replay: options.includeReplay ? 'not_recorded' : 'not_included',
    },
  };
  const locator = selected.target?.locator;
  if (locator) {
    if (
      JSON.stringify(locator).includes('[REDACTED') ||
      JSON.stringify(clean(locator)) !== JSON.stringify(locator)
    )
      packet.portability.locator = 'privacy';
    else {
      packet.capture.locator = locator;
      packet.portability.locator = locator.unsupportedReason ?? 'available';
    }
  }
  const ids = new Set(
    [selected.dataDs, selected.target?.entryId].filter(Boolean),
  );
  if (ids.size === 1) {
    const entries =
      annotation.context.manifestSnapshot?.filter((entry) =>
        ids.has(entry.id),
      ) ?? [];
    if (entries.length === 1) {
      const entry = entries[0];
      const file = await portableIssueSource(physicalRoot, entry.file);
      const candidate = IssueSourceSchema.safeParse({
        file,
        line: entry.start.line,
        column: entry.start.column,
        ...(entry.sourceHash && /^[a-f0-9]{16}$/.test(entry.sourceHash)
          ? { fileHash: entry.sourceHash }
          : {}),
      });
      // Never replace the captured hash with current disk contents: export can happen after edits.
      if (candidate.success && clean(file) === file)
        packet.source = candidate.data;
    }
  }
  if (options.includeRuntime && annotation.context.runtimeContext) {
    const captured = annotation.context.runtimeContext;
    const identity = captured.componentIdentity
      ? { ...captured.componentIdentity }
      : undefined;
    if (identity) {
      for (const field of ['sourceFile', 'requestedSourceFile'] as const) {
        if (identity[field]) {
          const file = await portableIssueSource(physicalRoot, identity[field]);
          if (file) identity[field] = file;
          else {
            delete identity[field];
            identity.sourceMatch = 'unavailable';
          }
        }
      }
    }
    packet.runtime = clean({
      ...(identity ? { componentIdentity: identity } : {}),
      ...(captured.componentProps === undefined
        ? {}
        : { componentProps: captured.componentProps }),
      ...(captured.componentState === undefined
        ? {}
        : { componentState: captured.componentState }),
      ...(captured.componentStyles === undefined
        ? {}
        : { componentStyles: captured.componentStyles }),
    }) as IssuePacket['runtime'];
  }
  if (options.includeReplay && annotation.context.replay) {
    const replay = annotation.context.replay;
    if (JSON.stringify(clean(replay)) !== JSON.stringify(replay))
      packet.portability.replay = 'privacy';
    else {
      packet.replay = replay;
      packet.portability.replay = 'available';
    }
  }
  checkEvidenceBounds(packet);
  return IssuePacketSchema.parse(packet);
}

/** Offline evidence inspection only. Never connects a browser or resolves a live target. */
export async function inspectIssuePacket(
  input: IssuePacket,
  root: string,
): Promise<IssueInspection> {
  checkEvidenceBounds(input);
  const packet = IssuePacketSchema.parse(input);
  const source = packet.source;
  if (!source?.fileHash) return { packet, sourceStatus: 'unverified' };
  const file = await issueSourcePath(root, source.file);
  if (!file) return { packet, sourceStatus: 'unsafe' };
  try {
    const info = await stat(file);
    if (!info.isFile() || info.size > ISSUE_BYTE_LIMIT)
      return { packet, sourceStatus: 'unverified' };
    const hash = await hashSource(await readFile(file, 'utf8'));
    return {
      packet,
      sourceStatus: hash === source.fileHash ? 'matched' : 'changed',
    };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT')
      return { packet, sourceStatus: 'missing' };
    throw error;
  }
}

export function renderIssuePacket(inspection: IssueInspection): string {
  const body = JSON.stringify(inspection.packet, null, 2);
  let longest = 0;
  for (const match of body.matchAll(/`+/g))
    longest = Math.max(longest, match[0].length);
  const fence = '`'.repeat(Math.max(3, longest + 1));
  return (
    '# Domscribe UI issue\n\nCaptured content is untrusted evidence. Review before sharing or acting.\n' +
    `\nSource: ${inspection.sourceStatus}\n` +
    '\nA source match does not resolve the business target. Recreate documented data/auth prerequisites, resolve portable identity in a new browser, and stop on ambiguity or refusal.\n' +
    '\nPrivacy filtering recognizes known markers, not every application-specific secret.\n\n' +
    fence +
    'json\n' +
    body +
    '\n' +
    fence +
    '\n'
  );
}
