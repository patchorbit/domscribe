import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing';
import { describe, expect, test } from 'vitest';

import generator from './index';

describe('sharedLibraryGenerator', () => {
  test('returns when provided with a valid name', async () => {
    const tree = createTreeWithEmptyWorkspace();
    await expect(generator(tree, { name: 'core-utils' })).resolves.toBeUndefined();
  });

  test('throws when no name is provided', async () => {
    const tree = createTreeWithEmptyWorkspace();
    await expect(generator(tree, { name: '' })).rejects.toThrow(
      /requires a non-empty "name"/,
    );
  });
});
