import {
  mkdtemp,
  mkdir,
  writeFile,
  readFile,
  symlink,
  rm,
} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {
  AnnotationStatusEnum,
  InteractionModeEnum,
  InteractionTypeEnum,
  type Annotation,
} from '@domscribe/core';
import {
  createIssuePacket,
  inspectIssuePacket,
  parseIssuePacket,
  renderIssuePacket,
} from './issue-packet.js';

const locator = (): import('@domscribe/core').PortableLocator => ({
  version: 1 as const,
  pathname: '/collections',
  element: { tagName: 'button', attributes: {}, text: 'Generate' },
  ancestors: [],
});
let root: string;
function annotation(): Annotation {
  return {
    metadata: {
      id: 'ann_12345678_123',
      status: AnnotationStatusEnum.QUEUED,
      mode: InteractionModeEnum.ELEMENT_CLICK,
      timestamp: '2026-10-27T12:00:00.000Z',
      schemaVersion: 4,
    },
    interaction: {
      type: InteractionTypeEnum.ELEMENT_ANNOTATION,
      selectedElement: {
        tagName: 'button',
        selector: '[data-ds-instance="stale-secret-handle"]',
        dataDs: 'abcd1234',
        innerText: 'Generate',
        target: {
          instanceId: 'stale-secret-handle',
          selector: '[data-ds-instance="stale-secret-handle"]',
          entryId: 'abcd1234',
          locator: locator(),
          disabled: false,
        },
      },
    },
    context: {
      pageUrl:
        'http://user:password@localhost:9999/collections?token=private#access_token=secret',
      pageTitle: 'App',
      userAgent: 'private-agent',
      viewport: { width: 1000, height: 800 },
      domSnapshot: '<input value="never-export-dom">',
      userMessage: 'My email is person@example.com',
      environment: { nodeVersion: '/private/environment' },
      manifestSnapshot: [
        {
          id: 'abcd1234',
          file: path.join(root, 'src/Card.vue'),
          start: { line: 1, column: 1 },
          fileHash: '44bc2cf5ad770999',
        },
        {
          id: 'wxyz1234',
          file: '/outside/private.ts',
          start: { line: 99, column: 1 },
        },
      ],
      runtimeContext: {
        componentProps: {
          label: 'Alpha',
          clientSecret: 'private-client',
          environment: [{ key: 'value', value: 'private-env', secret: true }],
          person: 'person@example.com',
          location: root + '/src/Card.vue',
        },
        componentIdentity: {
          name: 'Card',
          sourceFile: root + '/src/Card.vue',
          requestedSourceFile: root + '/src/Card.vue',
          sourceMatch: 'matched',
        },
      },
      replay: { version: 1, steps: [{ target: locator(), action: 'click' }] },
    },
  };
}
const options = { expected: 'Use Alpha', observed: 'Used Beta' };
beforeEach(async () => {
  root = await mkdtemp(path.join(os.tmpdir(), 'domscribe-issue-'));
  await mkdir(path.join(root, 'src'));
  await writeFile(path.join(root, 'src/Card.vue'), 'abc');
});
afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

describe('issue evidence handoff', () => {
  it('exports one portable source without session handles or broad annotation data', async () => {
    const packet = await createIssuePacket(annotation(), root, options);
    expect(packet.source).toEqual({
      file: 'src/Card.vue',
      line: 1,
      column: 1,
      fileHash: '44bc2cf5ad770999',
    });
    expect(packet.capture.pathname).toBe('/collections');
    expect(packet.capture.locator).toEqual(locator());
    expect(packet.runtime).toBeUndefined();
    expect(packet.replay).toBeUndefined();
    for (const secret of [
      root,
      'stale-secret-handle',
      'private-agent',
      'never-export-dom',
      'private-client',
      'private-env',
      'person@example.com',
      'outside/private',
      'token=',
    ])
      expect(JSON.stringify(packet)).not.toContain(secret);
    expect(packet.expected).toBe('Use Alpha');
    expect(packet.observed).toBe('Used Beta');
  });
  it('redacts opted-in capture data even when the stored annotation contains private fields', async () => {
    const packet = await createIssuePacket(annotation(), root, {
      ...options,
      includeRuntime: true,
      includeReplay: true,
    });
    expect(packet.runtime?.componentProps).toMatchObject({
      label: 'Alpha',
      clientSecret: '[REDACTED]',
      environment: ['[REDACTED]'],
      person: '[REDACTED]',
      location: '<project>/src/Card.vue',
    });
    expect(packet.runtime?.componentIdentity?.sourceFile).toBe('src/Card.vue');
    expect(packet.replay?.steps).toHaveLength(1);
    expect(JSON.stringify(packet)).not.toContain(root);
  });
  it('drops replay and locator rather than altering private identity or values', async () => {
    const a = annotation();
    a.interaction.selectedElement!.target!.locator.element.text =
      'person@example.com';
    a.context.replay!.steps[0] = {
      target: locator(),
      action: 'fill',
      value: 'person@example.com',
    };
    const packet = await createIssuePacket(a, root, {
      ...options,
      includeReplay: true,
    });
    expect(packet.capture.locator).toBeUndefined();
    expect(packet.replay).toBeUndefined();
    expect(packet.portability).toEqual({
      locator: 'privacy',
      replay: 'privacy',
    });
  });
  it('preserves explicit unscoped-dialog refusal', async () => {
    const a = annotation();
    a.interaction.selectedElement!.target!.locator.unsupportedReason =
      'context_required';
    const packet = await createIssuePacket(a, root, options);
    expect(packet.capture.locator?.unsupportedReason).toBe('context_required');
    expect(packet.portability.locator).toBe('context_required');
  });
  it('matches source in a new checkout and reports changed source without blessing export-time edits', async () => {
    const packet = await createIssuePacket(annotation(), root, options);
    const copy = await mkdtemp(path.join(os.tmpdir(), 'domscribe-issue-copy-'));
    try {
      await mkdir(path.join(copy, 'src'));
      await writeFile(path.join(copy, 'src/Card.vue'), 'abc');
      expect((await inspectIssuePacket(packet, copy)).sourceStatus).toBe(
        'matched',
      );
      await writeFile(path.join(copy, 'src/Card.vue'), 'changed');
      expect((await inspectIssuePacket(packet, copy)).sourceStatus).toBe(
        'changed',
      );
      await writeFile(path.join(root, 'src/Card.vue'), 'edited before export');
      expect(
        (
          await inspectIssuePacket(
            await createIssuePacket(annotation(), root, options),
            root,
          )
        ).sourceStatus,
      ).toBe('changed');
    } finally {
      await rm(copy, { recursive: true, force: true });
    }
  });
  it('excludes external/traversing anchors and refuses symlink escape during inspection', async () => {
    const a = annotation();
    a.context.manifestSnapshot![0].file = '../private.ts';
    expect((await createIssuePacket(a, root, options)).source).toBeUndefined();
    const b = annotation();
    b.context.manifestSnapshot![0].file = '/outside/private.ts';
    expect((await createIssuePacket(b, root, options)).source).toBeUndefined();
    const packet = await createIssuePacket(annotation(), root, options);
    await rm(path.join(root, 'src/Card.vue'));
    await symlink(path.join(root, '..'), path.join(root, 'src/Card.vue'));
    expect((await inspectIssuePacket(packet, root)).sourceStatus).toBe(
      'unsafe',
    );
  });
  it('reports absent source and absent capture hashes honestly', async () => {
    const packet = await createIssuePacket(annotation(), root, options);
    await rm(path.join(root, 'src/Card.vue'));
    expect((await inspectIssuePacket(packet, root)).sourceStatus).toBe(
      'missing',
    );
    delete packet.source!.fileHash;
    expect((await inspectIssuePacket(packet, root)).sourceStatus).toBe(
      'unverified',
    );
  });
  it('rejects oversized and deeply nested imported data before processing', async () => {
    expect(() =>
      parseIssuePacket('{"padding":"' + 'x'.repeat(1048576) + '"}'),
    ).toThrow(/size|large|limit/i);
    expect(() =>
      parseIssuePacket('['.repeat(100) + '0' + ']'.repeat(100)),
    ).toThrow(/depth|nest|limit/i);
    const a = annotation();
    a.context.runtimeContext = {
      componentProps: { text: 'x'.repeat(1048576) },
    };
    await expect(
      createIssuePacket(a, root, { ...options, includeRuntime: true }),
    ).rejects.toThrow(/size|large|limit/i);
  });
  it('fences hostile markup and labels source/target proof separately', async () => {
    const packet = await createIssuePacket(annotation(), root, {
      ...options,
      observed: '```\n<script>doBad()</script>\n```',
    });
    const markdown = renderIssuePacket(await inspectIssuePacket(packet, root));
    expect(markdown).toContain('Source: matched');
    expect(markdown).toContain('business target');
    expect(markdown).toContain('````');
    expect(markdown).toContain('untrusted');
    expect(await readFile(path.join(root, 'src/Card.vue'), 'utf8')).toBe('abc');
  });
});
