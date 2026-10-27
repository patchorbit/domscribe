import { SourceMapConsumer } from 'source-map';
import { originalSourceHash } from './source-hash.js';

describe('capture-time original source hash', () => {
  it('hashes exact original source content rather than the transformed module', async () => {
    const map = await new SourceMapConsumer(
      JSON.stringify({
        version: 3,
        sources: ['/project/src/Card.jsx'],
        sourcesContent: ['abc'],
        names: [],
        mappings: 'AAAA',
      }),
    );
    try {
      expect(await originalSourceHash(map, '/project/src/Card.jsx')).toBe(
        '44bc2cf5ad770999',
      );
    } finally {
      map.destroy();
    }
  });
  it('does not substitute another source with an identical basename', async () => {
    const map = await new SourceMapConsumer(
      JSON.stringify({
        version: 3,
        sources: ['/other/src/Card.jsx'],
        sourcesContent: ['abc'],
        names: [],
        mappings: 'AAAA',
      }),
    );
    try {
      expect(
        await originalSourceHash(map, '/project/src/Card.jsx'),
      ).toBeUndefined();
    } finally {
      map.destroy();
    }
  });
  it('leaves missing original content unverified', async () => {
    const map = await new SourceMapConsumer(
      JSON.stringify({
        version: 3,
        sources: ['/project/src/Card.jsx'],
        sourcesContent: [null],
        names: [],
        mappings: 'AAAA',
      }),
    );
    try {
      expect(
        await originalSourceHash(map, '/project/src/Card.jsx'),
      ).toBeUndefined();
      expect(
        await originalSourceHash(undefined, '/project/src/Card.jsx'),
      ).toBeUndefined();
    } finally {
      map.destroy();
    }
  });
});
