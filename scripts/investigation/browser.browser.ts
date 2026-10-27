import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { chromium } from 'playwright';
import { executeJourney } from './browser.js';
import { JourneySchema, ProposalSchema } from './schema.js';

test('real browser grades business state, refuses ambiguous/sensitive targets, and starts fresh contexts', async () => {
  const server = createServer((_, res) =>
    res
      .writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
      .end(
        `<button onclick="document.getElementById('city').textContent='Austin'">Save Lyra</button><output id="city" aria-label="Lyra city">Portland</output><button>Duplicate</button><button>Duplicate</button><input aria-label="Password" type="password">`,
      ),
  );
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
  const address = server.address();
  if (!address || typeof address === 'string') throw Error('No port');
  const url = `http://127.0.0.1:${address.port}`;
  const dir = await mkdtemp(join(tmpdir(), 'investigation-browser-'));
  const browser = await chromium.launch({ headless: true });
  const journey = JourneySchema.parse({
    id: 'edit',
    intent: 'Save Lyra',
    expectations: [
      {
        id: 'city',
        kind: 'text',
        target: { role: 'status', name: 'Lyra city' },
        expected: 'Austin',
      },
    ],
  });
  const plan = (steps: unknown[]) =>
    ProposalSchema.parse({
      version: 1,
      plans: [{ journeyId: 'edit', steps }],
      uncovered: [],
    }).plans[0];
  try {
    const passed = await executeJourney(
      browser,
      url,
      plan([
        { action: 'click', target: { role: 'button', name: 'Save Lyra' } },
      ]),
      journey,
      dir,
      'base',
      { timeout: 300 },
    );
    assert.equal(passed.status, 'completed');
    assert.equal(passed.actuals[0].value, 'Austin');
    assert.equal(passed.errorCount, 0);
    const fresh = await executeJourney(
      browser,
      url,
      plan([{ action: 'navigate', pathname: '/' }]),
      journey,
      dir,
      'head',
      { timeout: 300 },
    );
    assert.equal(fresh.actuals[0].value, 'Portland');
    const ambiguous = await executeJourney(
      browser,
      url,
      plan([
        { action: 'click', target: { role: 'button', name: 'Duplicate' } },
      ]),
      journey,
      dir,
      'head-repeat',
      { timeout: 300 },
    );
    assert.equal(ambiguous.status, 'action_failed');
    assert.equal(ambiguous.errorCode, 'target_ambiguous');
    const sensitive = await executeJourney(
      browser,
      url,
      plan([
        {
          action: 'fill',
          target: { role: 'textbox', name: 'Password' },
          value: 'secret',
        },
      ]),
      journey,
      dir,
      'head',
      { timeout: 300 },
    );
    assert.equal(sensitive.errorCode, 'unsafe_target');
  } finally {
    await browser.close();
    server.closeAllConnections();
    await new Promise<void>((r) => server.close(() => r()));
    await rm(dir, { recursive: true, force: true });
  }
});
test('replays keyboard-driven real app controls and disambiguates by visible record text', async () => {
  const server = createServer((_, res) =>
    res
      .writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
      .end(
        `<input placeholder="What needs doing?" onkeyup="if(event.key==='Enter'){document.querySelector('ul').innerHTML='<li>'+this.value+'</li>';this.value=''}"><ul><li>Other task</li></ul>`,
      ),
  );
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
  const address = server.address();
  if (!address || typeof address === 'string') throw Error('No port');
  const dir = await mkdtemp(join(tmpdir(), 'investigation-keyboard-'));
  const browser = await chromium.launch();
  try {
    const journey = JourneySchema.parse({
      id: 'add',
      intent: 'Add a task',
      expectations: [
        {
          id: 'title',
          kind: 'text',
          target: { role: 'listitem', name: '', text: 'Ship release' },
          expected: 'Ship release',
        },
      ],
    });
    const plan = ProposalSchema.parse({
      version: 1,
      plans: [
        {
          journeyId: 'add',
          steps: [
            {
              action: 'fill',
              target: { role: 'textbox', name: 'What needs doing?' },
              value: 'Ship release',
            },
            {
              action: 'press',
              target: { role: 'textbox', name: 'What needs doing?' },
              key: 'Enter',
            },
          ],
        },
      ],
      uncovered: [],
    }).plans[0];
    const result = await executeJourney(
      browser,
      `http://127.0.0.1:${address.port}`,
      plan,
      journey,
      dir,
      'base',
      { timeout: 300 },
    );
    assert.equal(result.status, 'completed', JSON.stringify(result));
    assert.equal(result.actuals[0].value, 'Ship release');
  } finally {
    await browser.close();
    server.closeAllConnections();
    await new Promise<void>((r) => server.close(() => r()));
    await rm(dir, { recursive: true, force: true });
  }
});
test('oversized observations cannot pass by truncation, and ambiguous scopes refuse even with one matching child', async () => {
  const server = createServer((_, res) =>
    res
      .writeHead(200, { 'Content-Type': 'text/html' })
      .end(
        `<output aria-label="Long value">${'x'.repeat(2001)}</output><section aria-label="Record"><button>Only once</button></section><section aria-label="Record"></section>`,
      ),
  );
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
  const address = server.address();
  if (!address || typeof address === 'string') throw Error('No port');
  const dir = await mkdtemp(join(tmpdir(), 'investigation-bounds-'));
  const browser = await chromium.launch();
  try {
    const journey = JourneySchema.parse({
      id: 'bounds',
      intent: 'Observe complete state',
      expectations: [
        {
          id: 'long',
          kind: 'text',
          target: { role: 'status', name: 'Long value' },
          expected: 'x'.repeat(2000),
        },
      ],
    });
    const plan = ProposalSchema.parse({
      version: 1,
      plans: [
        { journeyId: 'bounds', steps: [{ action: 'navigate', pathname: '/' }] },
      ],
      uncovered: [],
    }).plans[0];
    const result = await executeJourney(
      browser,
      `http://127.0.0.1:${address.port}`,
      plan,
      journey,
      dir,
      'base',
      { timeout: 300 },
    );
    assert.equal(result.status, 'action_failed');
    assert.equal(result.actuals.length, 0);
    const scoped = {
      ...plan,
      steps: [
        {
          action: 'click' as const,
          target: {
            role: 'button' as const,
            name: 'Only once',
            scope: { role: 'region' as const, name: 'Record' },
          },
        },
      ],
    };
    const ambiguous = await executeJourney(
      browser,
      `http://127.0.0.1:${address.port}`,
      scoped,
      journey,
      dir,
      'head',
      { timeout: 300 },
    );
    assert.equal(ambiguous.errorCode, 'target_ambiguous');
  } finally {
    await browser.close();
    server.closeAllConnections();
    await new Promise<void>((r) => server.close(() => r()));
    await rm(dir, { recursive: true, force: true });
  }
});
test('records failed app network requests separately from business observations', async () => {
  const server = createServer((req, res) =>
    req.url === '/missing.png'
      ? res.writeHead(404).end()
      : res
          .writeHead(200, { 'Content-Type': 'text/html' })
          .end('<h1>Ready</h1><img src="/missing.png">'),
  );
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
  const address = server.address();
  if (!address || typeof address === 'string') throw Error('No port');
  const dir = await mkdtemp(join(tmpdir(), 'investigation-network-')),
    browser = await chromium.launch();
  try {
    const journey = JourneySchema.parse({
      id: 'network',
      intent: 'Observe heading and network separately',
      expectations: [
        {
          id: 'heading',
          kind: 'text',
          target: { role: 'heading', name: 'Ready' },
          expected: 'Ready',
        },
      ],
    });
    const plan = ProposalSchema.parse({
      version: 1,
      plans: [
        {
          journeyId: 'network',
          steps: [{ action: 'navigate', pathname: '/' }],
        },
      ],
      uncovered: [],
    }).plans[0];
    const result = await executeJourney(
      browser,
      `http://127.0.0.1:${address.port}`,
      plan,
      journey,
      dir,
      'base',
      { timeout: 300 },
    );
    assert.equal(result.status, 'completed');
    assert((result.networkErrorCount ?? 0) > 0);
  } finally {
    await browser.close();
    server.closeAllConnections();
    await new Promise<void>((r) => server.close(() => r()));
    await rm(dir, { recursive: true, force: true });
  }
});
