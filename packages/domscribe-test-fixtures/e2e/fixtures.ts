/**
 * Shared Playwright fixtures for Domscribe E2E tests.
 *
 * Dev Server Pool
 * ───────────────
 * Each `e2e--<id>` Nx target launches a single Playwright process
 * filtered by `--grep <id>`. Within that process, multiple spec files
 * may need a dev server for the same fixture (e.g. overlay-interaction
 * and annotation-lifecycle both test vite-v5-react-18-ts).
 *
 * The server pool starts each fixture's dev server lazily on first
 * request and keeps it alive for the duration of the worker. Spec
 * files call `getServer(id)` in beforeAll and never manage teardown —
 * the auto worker fixture handles that when the worker exits.
 *
 * This guarantees exactly one dev server per fixture per Playwright
 * process, regardless of how many spec files or describe blocks need it.
 */

import { test as base } from '@playwright/test';
import { startDevServer, type DevServerHandle } from './helpers/dev-server.js';

// ── Server pool (module-level, shared across spec files in one worker) ──

const servers = new Map<string, DevServerHandle>();

/**
 * Get a running dev server for the given fixture.
 * Starts the server on first call; returns the cached handle on subsequent calls.
 */
export async function getServer(fixtureId: string): Promise<DevServerHandle> {
  const existing = servers.get(fixtureId);
  if (existing) return existing;

  const server = await startDevServer(fixtureId, { timeout: 60_000 });
  servers.set(fixtureId, server);
  return server;
}

// ── Extended test with automatic server cleanup ─────────────────────────

export const test = base.extend<object, { _serverPool: void }>({
  /**
   * Auto worker fixture — activates for every test without being
   * referenced in test parameters. Tears down all pooled dev servers
   * when the worker exits.
   */
  _serverPool: [
    // eslint-disable-next-line no-empty-pattern -- This auto worker fixture has no dependencies.
    async ({}, use) => {
      await use();
      await Promise.all(
        [...servers.values()].map((s) =>
          s.close().catch(() => {
            // Continue closing the other servers if one already exited.
          }),
        ),
      );
      servers.clear();
    },
    { scope: 'worker', auto: true },
  ],
});

export { expect } from '@playwright/test';
