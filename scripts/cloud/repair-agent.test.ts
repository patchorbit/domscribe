import test from 'node:test';
import assert from 'node:assert/strict';
import { parseAgentEvents } from './repair-agent.js';
test('counts successful full browser and Domscribe tool calls, retaining measured usage only', () => {
  const log = [
    {
      type: 'item.completed',
      item: {
        type: 'mcp_tool_call',
        server: 'browser',
        tool: 'browser_navigate',
        status: 'completed',
        result: { isError: false },
      },
    },
    {
      type: 'item.completed',
      item: {
        type: 'mcp_tool_call',
        server: 'domscribe',
        tool: 'domscribe.targets.query',
        status: 'completed',
        result: {},
      },
    },
    {
      type: 'turn.completed',
      usage: { input_tokens: 100, output_tokens: 20, cached_input_tokens: 50 },
    },
  ]
    .map((x) => JSON.stringify(x))
    .join('\n');
  const r = parseAgentEvents(log);
  assert.deepEqual(r.tools, [
    'browser.browser_navigate',
    'domscribe.domscribe.targets.query',
  ]);
  assert.equal(r.usage.length, 1);
});
test('failed tool calls and a claimed browser action in final text are not browser-use evidence', () => {
  const log = [
    {
      type: 'item.completed',
      item: {
        type: 'mcp_tool_call',
        server: 'browser',
        tool: 'browser_navigate',
        status: 'failed',
      },
    },
    {
      type: 'item.completed',
      item: { type: 'agent_message', text: 'I used browser.browser_navigate' },
    },
  ]
    .map((x) => JSON.stringify(x))
    .join('\n');
  assert.deepEqual(parseAgentEvents(log).tools, []);
});

test('Codex-normalized MCP errors are not successful tool evidence', () => {
  const event = {
    type: 'item.completed',
    item: {
      type: 'mcp_tool_call',
      server: 'browser',
      tool: 'browser_navigate',
      status: 'completed',
      result: { is_error: true },
    },
  };
  assert.deepEqual(parseAgentEvents(JSON.stringify(event)).tools, []);
});
