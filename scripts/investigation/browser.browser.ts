import test from 'node:test';
import { createHash } from 'node:crypto';
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
test('count observations require a unique existing ancestor while allowing target multiplicity', async () => {
  const server = createServer((req, res) =>
    res
      .writeHead(200, { 'Content-Type': 'text/html' })
      .end(
        req.url === '/missing'
          ? '<h1>No record</h1>'
          : req.url === '/duplicate'
            ? '<section aria-label="Record"><button>Count me</button></section><section aria-label="Record"></section>'
            : '<section aria-label="Record"><button>Count me</button><button>Count me</button></section>',
      ),
  );
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
  const address = server.address();
  if (!address || typeof address === 'string') throw Error('No port');
  const dir = await mkdtemp(join(tmpdir(), 'investigation-count-scope-')),
    browser = await chromium.launch();
  try {
    const journey = JourneySchema.parse({
      id: 'count',
      intent: 'Count controls in the intended record',
      expectations: [
        {
          id: 'buttons',
          kind: 'count',
          target: {
            role: 'button',
            name: 'Count me',
            scope: { role: 'region', name: 'Record' },
          },
          expected: 2,
        },
      ],
    });
    for (const pathname of ['/duplicate', '/missing', '/valid']) {
      const plan = ProposalSchema.parse({
        version: 1,
        plans: [
          { journeyId: 'count', steps: [{ action: 'navigate', pathname }] },
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
      if (pathname === '/valid') {
        assert.equal(result.status, 'completed');
        assert.equal(result.actuals[0].value, 2);
      } else {
        assert.equal(result.status, 'action_failed');
        assert.equal(
          result.errorCode,
          pathname === '/missing' ? 'target_unavailable' : 'target_ambiguous',
        );
        assert.equal(result.actuals.length, 0);
      }
    }
  } finally {
    await browser.close();
    server.closeAllConnections();
    await new Promise<void>((r) => server.close(() => r()));
    await rm(dir, { recursive: true, force: true });
  }
});
test('blocks cross-origin WebSocket handshakes while preserving same-origin sockets', async () => {
  let forbidden = 0,
    allowed = 0;
  const sockets = new Set<import('node:stream').Duplex>();
  const handshake = (
    req: import('node:http').IncomingMessage,
    socket: import('node:stream').Duplex,
  ) => {
    sockets.add(socket);
    socket.on('close', () => sockets.delete(socket));
    const accept = createHash('sha1')
      .update(
        String(req.headers['sec-websocket-key']) +
          '258EAFA5-E914-47DA-95CA-C5AB0DC85B11',
      )
      .digest('base64');
    socket.write(
      'HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: ' +
        accept +
        '\r\n\r\n',
    );
  };
  const other = createServer();
  other.on('upgrade', (req, socket) => {
    forbidden++;
    handshake(req, socket);
  });
  await new Promise<void>((r) => other.listen(0, '127.0.0.1', r));
  const otherAddress = other.address();
  if (!otherAddress || typeof otherAddress === 'string') throw Error('No port');
  const server = createServer((_, res) =>
    res
      .writeHead(200, { 'Content-Type': 'text/html' })
      .end(
        `<output aria-label="Socket">Waiting</output><script>const own=new WebSocket('ws://'+location.host+'/hmr');own.onopen=()=>document.querySelector('output').textContent='Connected';new WebSocket('ws://127.0.0.1:${otherAddress.port}/forbidden');</script>`,
      ),
  );
  server.on('upgrade', (req, socket) => {
    allowed++;
    handshake(req, socket);
  });
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
  const address = server.address();
  if (!address || typeof address === 'string') throw Error('No port');
  const dir = await mkdtemp(join(tmpdir(), 'investigation-sockets-')),
    browser = await chromium.launch();
  try {
    const journey = JourneySchema.parse({
      id: 'socket',
      intent: 'Keep local sockets and block other origins',
      expectations: [
        {
          id: 'socket',
          kind: 'text',
          target: { role: 'status', name: 'Socket' },
          expected: 'Connected',
        },
      ],
    });
    const plan = ProposalSchema.parse({
      version: 1,
      plans: [
        { journeyId: 'socket', steps: [{ action: 'navigate', pathname: '/' }] },
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
      { timeout: 500 },
    );
    assert.equal(result.status, 'completed');
    assert.equal(result.actuals[0].value, 'Connected');
    assert(allowed > 0);
    assert.equal(forbidden, 0);
    assert((result.networkErrorCount ?? 0) > 0);
  } finally {
    await browser.close();
    for (const socket of sockets) socket.destroy();
    server.closeAllConnections();
    other.closeAllConnections();
    await Promise.all([
      new Promise<void>((r) => server.close(() => r())),
      new Promise<void>((r) => other.close(() => r())),
    ]);
    await rm(dir, { recursive: true, force: true });
  }
});
