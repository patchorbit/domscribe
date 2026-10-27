import { IssuePacketSchema, IssueExportOptionsSchema } from './issue.js';

const packet = () => ({
  version: 1,
  title: 'Wrong collection',
  expected: 'Use Alpha variables',
  observed: 'Uses Beta variables',
  steps: ['Open Alpha properties'],
  prerequisites: ['Import synthetic collections'],
  capture: {
    annotationId: 'ann_12345678_123',
    timestamp: '2026-10-27T12:00:00.000Z',
    pathname: '/collections',
    element: { tagName: 'button', text: 'Generate' },
  },
  source: {
    file: 'src/OAuth.vue',
    line: 10,
    column: 2,
    fileHash: '44bc2cf5ad770999',
  },
  portability: { locator: 'not_captured', replay: 'not_included' },
});

describe('portable issue contract', () => {
  it('retains required issue evidence and capture-time relative source', () => {
    expect(IssuePacketSchema.parse(packet())).toEqual(packet());
  });
  it.each([
    '../private.ts',
    '/private.ts',
    'C:/private.ts',
    'src\\private.ts',
    'src/../private.ts',
  ])('rejects non-portable source path %s', (file) => {
    expect(
      IssuePacketSchema.safeParse({
        ...packet(),
        source: { ...packet().source, file },
      }).success,
    ).toBe(false);
  });
  it('rejects live handles, unknown versions and URL state', () => {
    expect(
      IssuePacketSchema.safeParse({ ...packet(), version: 2 }).success,
    ).toBe(false);
    expect(
      IssuePacketSchema.safeParse({
        ...packet(),
        instanceId: 'old-browser-handle',
      }).success,
    ).toBe(false);
    expect(
      IssuePacketSchema.safeParse({
        ...packet(),
        capture: { ...packet().capture, pathname: '/?token=secret' },
      }).success,
    ).toBe(false);
  });
  it('requires separate nonempty expected and observed evidence', () => {
    expect(
      IssueExportOptionsSchema.safeParse({ expected: '  ', observed: 'Broken' })
        .success,
    ).toBe(false);
    expect(
      IssueExportOptionsSchema.safeParse({ observed: 'Broken' }).success,
    ).toBe(false);
    expect(
      IssueExportOptionsSchema.parse({ expected: 'Works', observed: 'Broken' }),
    ).toMatchObject({ includeRuntime: false, includeReplay: false });
  });
});

it('rejects available locators containing existing privacy redaction markers', () => {
  const value = packet();
  expect(
    IssuePacketSchema.safeParse({
      ...value,
      capture: {
        ...value.capture,
        locator: {
          version: 1,
          pathname: '/collections',
          element: { tagName: 'button', attributes: {}, text: '[REDACTED]' },
          ancestors: [],
        },
      },
      portability: { locator: 'available', replay: 'not_included' },
    }).success,
  ).toBe(false);
});

it('retains a confirmed original-source hash separately from transformed-code identity', async () => {
  const { ManifestEntrySchema } = await import('./manifest.js');
  const entry = ManifestEntrySchema.parse({
    id: 'abcd1234',
    file: '/project/src/Card.jsx',
    start: { line: 1, column: 0 },
    fileHash: '0011223344556677',
    sourceHash: '44bc2cf5ad770999',
  });
  expect(entry).toMatchObject({
    fileHash: '0011223344556677',
    sourceHash: '44bc2cf5ad770999',
  });
});
