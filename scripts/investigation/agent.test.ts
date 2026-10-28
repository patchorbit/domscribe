import test from 'node:test';
import assert from 'node:assert/strict';
import {
  agentOutputSchema,
  parseAgentProposal,
  buildAgentArguments,
  discoveryEvidence,
  buildPrompt,
} from './agent.js';
import { ConfigSchema } from './schema.js';
import { config } from './test-fixtures.js';

test('discovery is read-only, isolated from unrelated MCPs, schema-bound and does not ask for fixes', () => {
  const args = buildAgentArguments({
    app: '/repo/app',
    out: '/private/out',
    browserCli: '/tools/mcp.js',
    executable: '/tools/chrome',
    schema: '/private/schema.json',
    prompt: 'Investigate',
    domscribeCli: null,
  });
  assert(args.includes('--ignore-user-config'));
  assert(
    args.includes('mcp_servers.browser.default_tools_approval_mode="approve"'),
  );
  assert.equal(args[args.indexOf('--sandbox') + 1], 'read-only');
  assert(!args.includes('--output-schema'));
  assert(args.at(-1)?.includes('/private/schema.json'));
  assert.throws(() => parseAgentProposal('{"version":1,"verdict":"clean"}'));
  assert(!args.includes('--dangerously-bypass-approvals-and-sandbox'));
  assert(!args.some((v) => v.includes('domscribe.command')));
  const prompt = buildPrompt(
    ConfigSchema.parse(config),
    'http://127.0.0.1:1',
    'http://127.0.0.1:2',
    'diff',
  );
  assert(prompt.includes('Do not modify'));
  assert(prompt.toLowerCase().includes('approved'));
  assert(prompt.includes('fresh'));
  assert(!prompt.includes('/trusted/repo'));
});
test('browser-use proof requires a completed real browser call; errors and invented final claims do not count', () => {
  const event = (status: string, isError = false) =>
    JSON.stringify({
      type: 'item.completed',
      item: {
        type: 'mcp_tool_call',
        server: 'browser',
        tool: 'browser_navigate',
        arguments: { url: 'http://127.0.0.1:4000' },
        status,
        result: { isError },
      },
    });
  assert.equal(
    discoveryEvidence(event('completed'), ['http://127.0.0.1:4000'])
      .browserUsed,
    true,
  );
  assert.equal(
    discoveryEvidence(event('failed'), ['http://127.0.0.1:4000']).browserUsed,
    false,
  );
  assert.equal(
    discoveryEvidence(event('completed', true), ['http://127.0.0.1:4000'])
      .browserUsed,
    false,
  );
  assert.equal(discoveryEvidence('{"browserUsed":true}').browserUsed, false);
  assert.equal(
    discoveryEvidence(event('completed'), ['http://127.0.0.1:4000']).model,
    null,
  );
});
test('model output schema uses supported anyOf and required nullable optionals, then normalizes to strict proposal', () => {
  const schema = agentOutputSchema();
  const walk = (node: unknown) => {
    if (!node || typeof node !== 'object') return;
    const n = node as Record<string, unknown>;
    assert(!('oneOf' in n));
    if (n.type === 'object') {
      assert.deepEqual(
        new Set(n.required as string[]),
        new Set(Object.keys(n.properties as object)),
      );
      assert.equal(n.additionalProperties, false);
    }
    for (const value of Object.values(n))
      if (Array.isArray(value)) value.forEach(walk);
      else walk(value);
  };
  walk(schema);
  const p = parseAgentProposal(
    JSON.stringify({
      version: 1,
      plans: [
        {
          journeyId: 'edit',
          steps: [
            {
              action: 'click',
              target: { role: 'button', name: 'Save', text: null, scope: null },
            },
          ],
        },
      ],
      uncovered: [],
    }),
  );
  assert.equal(p.plans[0].steps[0].action, 'click');
});
test('browser bookkeeping or an unrelated page cannot qualify actual app exploration', () => {
  const event = (tool: string, url: string) =>
    JSON.stringify({
      type: 'item.completed',
      item: {
        type: 'mcp_tool_call',
        server: 'browser',
        tool,
        status: 'completed',
        arguments: { url },
        result: { isError: false },
      },
    });
  assert.equal(
    discoveryEvidence(event('browser_tabs', 'http://127.0.0.1:4000'), [
      'http://127.0.0.1:4000',
    ]).browserUsed,
    false,
  );
  assert.equal(
    discoveryEvidence(event('browser_navigate', 'https://unrelated.invalid'), [
      'http://127.0.0.1:4000',
    ]).browserUsed,
    false,
  );
  assert.equal(
    discoveryEvidence(
      event('browser_navigate', 'http://127.0.0.1:4000/tasks'),
      ['http://127.0.0.1:4000'],
    ).browserUsed,
    true,
  );
});
test('approved fixture descriptors are discoverable without inlining data or permitting arbitrary files', () => {
  const c = ConfigSchema.parse({
    ...config,
    fixtures: [
      {
        id: 'payload',
        name: 'data.json',
        mimeType: 'application/json',
        content: '{"fileOnlyCanary":"synthetic-only"}',
      },
    ],
  });
  const prompt = buildPrompt(
    c,
    'http://127.0.0.1:1',
    'http://127.0.0.1:2',
    '',
    [
      {
        id: 'payload',
        name: 'data.json',
        relativePath: 'node_modules/.cache/inputs/data.json',
      },
    ],
  );
  assert(prompt.includes('node_modules/.cache/inputs/data.json'));
  assert(prompt.includes('fixtureId'));
  assert(prompt.includes('never other host files'));
  assert(!prompt.includes('fileOnlyCanary'));
  assert(!prompt.includes('password/file controls'));
});
