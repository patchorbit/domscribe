export const config = {
  version: 1,
  repo: '/trusted/repo',
  base: 'main',
  head: 'feature',
  install: ['npm', 'ci'],
  start: ['npm', 'run', 'dev', '--', '--port', '{port}'],
  journeys: [
    {
      id: 'edit',
      intent: 'Change Lyra shipping city to Austin without changing Orion',
      expectations: [
        {
          id: 'lyra-city',
          target: { role: 'status', name: 'Lyra city' },
          kind: 'text',
          expected: 'Austin',
        },
        {
          id: 'orion-city',
          target: { role: 'status', name: 'Orion city' },
          kind: 'text',
          expected: 'Seattle',
        },
      ],
    },
  ],
};
export const metadata = {
  baseCommit: '1'.repeat(40),
  headCommit: '2'.repeat(40),
  configDigest: 'a'.repeat(64),
  diffDigest: 'b'.repeat(64),
  at: '2026-10-27T23:00:00.000Z',
  environment: 'local-trusted-repo',
  agentBrowserUsed: true,
  domscribeUsed: false,
  model: null,
};
export const proposal = {
  version: 1,
  plans: [
    {
      journeyId: 'edit',
      steps: [
        { action: 'click', target: { role: 'button', name: 'Edit Lyra' } },
      ],
    },
  ],
  uncovered: [],
};
export function observation(phase: string, lyra = 'Austin', orion = 'Seattle') {
  return {
    journeyId: 'edit',
    phase,
    status: 'completed',
    actuals: [
      { expectationId: 'lyra-city', value: lyra },
      { expectationId: 'orion-city', value: orion },
    ],
    artifacts: [phase + '.png'],
    errorCount: 0,
  };
}
