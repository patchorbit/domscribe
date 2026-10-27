import path from 'node:path';
import {
  AnnotationStatusEnum,
  InteractionModeEnum,
  InteractionTypeEnum,
  type Annotation,
  type PortableLocator,
} from '@domscribe/core';
const locator = (): PortableLocator => ({
  version: 1 as const,
  pathname: '/collections',
  element: { tagName: 'button', attributes: {}, text: 'Generate' },
  ancestors: [],
});
export function createIssueAnnotation(root: string): Annotation {
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
          fileHash: '0011223344556677',
          sourceHash: '44bc2cf5ad770999',
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
