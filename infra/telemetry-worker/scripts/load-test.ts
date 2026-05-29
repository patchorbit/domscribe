/**
 * Load-test harness for the telemetry Worker.
 *
 * Usage:
 *   # 1. In one terminal, run the worker locally:
 *   pnpm dev
 *   # 2. In another, drive it:
 *   pnpm load-test
 *
 * Or point at a deployed environment:
 *   TELEMETRY_URL=https://telemetry.domscribe.dev/v1/session \
 *   CONCURRENCY=50 TOTAL=10000 pnpm load-test
 *
 * What this validates (RFC 0002 acceptance: "write-rate ceiling tested"):
 *   - p50/p95/p99 latency under sustained POST load
 *   - error rate under concurrent writes (KV per-account write ceiling is
 *     1000/s globally; per-key is 1/s but each session_id is unique so
 *     per-key throttling does not apply here)
 *   - no throttling at the projected 2026-08-20 falsifier scale
 *     (≥10 WAU = ~1.4 writes/day — well under any limit)
 *   - headroom: 10k sessions/week = ~17 writes/min; 100k sessions/week = ~165/min
 */

import { randomBytes } from 'node:crypto';
import { performance } from 'node:perf_hooks';

const TELEMETRY_URL =
  process.env.TELEMETRY_URL ?? 'http://127.0.0.1:8787/v1/session';
const CONCURRENCY = Number(process.env.CONCURRENCY ?? 20);
const TOTAL = Number(process.env.TOTAL ?? 2000);

const PLATFORMS = ['darwin', 'linux', 'win32'] as const;
const FRAMEWORKS = [
  'react',
  'vue',
  'next',
  'nuxt',
  'svelte',
  'unknown',
] as const;

function randomPayload() {
  return {
    protocol_version: '1.0.0',
    daemon_version: '0.5.2',
    session_id: randomBytes(16).toString('base64url'),
    platform: PLATFORMS[Math.floor(Math.random() * PLATFORMS.length)]!,
    node_version: 'v20.10.0',
    primary_framework:
      FRAMEWORKS[Math.floor(Math.random() * FRAMEWORKS.length)]!,
  };
}

type Sample = {
  status: number;
  latency_ms: number;
  ok: boolean;
};

async function sendOne(): Promise<Sample> {
  const body = JSON.stringify(randomPayload());
  const t0 = performance.now();
  try {
    const res = await fetch(TELEMETRY_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body,
    });
    return {
      status: res.status,
      latency_ms: performance.now() - t0,
      ok: res.status === 204,
    };
  } catch {
    return { status: 0, latency_ms: performance.now() - t0, ok: false };
  }
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.min(
    sorted.length - 1,
    Math.floor((p / 100) * sorted.length),
  );
  return sorted[idx]!;
}

async function main() {
  console.log(
    `[load-test] target=${TELEMETRY_URL} concurrency=${CONCURRENCY} total=${TOTAL}`,
  );

  const samples: Sample[] = [];
  let inFlight = 0;
  let dispatched = 0;
  const t0 = performance.now();

  await new Promise<void>((resolve) => {
    const tick = () => {
      while (inFlight < CONCURRENCY && dispatched < TOTAL) {
        inFlight++;
        dispatched++;
        sendOne()
          .then((s) => samples.push(s))
          .finally(() => {
            inFlight--;
            if (samples.length === TOTAL) resolve();
            else tick();
          });
      }
    };
    tick();
  });

  const wall_ms = performance.now() - t0;
  const latencies = samples.map((s) => s.latency_ms).sort((a, b) => a - b);
  const ok = samples.filter((s) => s.ok).length;
  const errors = TOTAL - ok;
  const byStatus = new Map<number, number>();
  for (const s of samples) {
    byStatus.set(s.status, (byStatus.get(s.status) ?? 0) + 1);
  }

  console.log('');
  console.log(`  wall:        ${wall_ms.toFixed(0)}ms`);
  console.log(`  throughput:  ${(TOTAL / (wall_ms / 1000)).toFixed(1)} req/s`);
  console.log(`  ok (204):    ${ok} / ${TOTAL}`);
  console.log(`  errors:      ${errors}`);
  console.log(
    `  status mix:  ${[...byStatus.entries()].map(([k, v]) => `${k}=${v}`).join(' ')}`,
  );
  console.log(`  latency p50: ${percentile(latencies, 50).toFixed(1)}ms`);
  console.log(`  latency p95: ${percentile(latencies, 95).toFixed(1)}ms`);
  console.log(`  latency p99: ${percentile(latencies, 99).toFixed(1)}ms`);
  console.log(
    `  latency max: ${latencies[latencies.length - 1]?.toFixed(1)}ms`,
  );

  // Falsifier: p95 < 100ms locally, < 500ms against a deployed Worker; error rate < 1%.
  const p95 = percentile(latencies, 95);
  const errorRate = errors / TOTAL;
  const localTarget =
    TELEMETRY_URL.startsWith('http://127.') ||
    TELEMETRY_URL.startsWith('http://localhost');
  const p95Ceiling = localTarget ? 100 : 500;
  let failed = false;
  if (errorRate >= 0.01) {
    console.log(
      `\n  FAIL: error rate ${(errorRate * 100).toFixed(2)}% exceeds 1% threshold`,
    );
    failed = true;
  }
  if (p95 > p95Ceiling) {
    console.log(
      `\n  FAIL: p95 ${p95.toFixed(1)}ms exceeds ${p95Ceiling}ms ceiling`,
    );
    failed = true;
  }
  if (failed) process.exit(1);
  console.log('\n  PASS');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
