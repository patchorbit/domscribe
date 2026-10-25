import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { runOwnedBuild } from './replay-process.mjs';

test('retains output for successful and failed builds', async () => {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'replay-build-test-'));
  const logPath = path.join(cwd, 'build.log');
  try {
    await runOwnedBuild(process.execPath, ['-e', 'console.log("built")'], {
      cwd,
      logPath,
    });
    assert.match(fs.readFileSync(logPath, 'utf8'), /built/);
    await assert.rejects(
      runOwnedBuild(
        process.execPath,
        ['-e', 'console.error("broken");process.exit(2)'],
        { cwd, logPath },
      ),
      /build failed: 2/,
    );
    assert.match(fs.readFileSync(logPath, 'utf8'), /broken/);
  } finally {
    fs.rmSync(cwd, { recursive: true, force: true });
  }
});

test(
  'deadline kills a TERM-ignoring build and its worker',
  { timeout: 10000 },
  async () => {
    const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'replay-build-test-'));
    const logPath = path.join(cwd, 'build.log');
    const marker = path.join(cwd, 'pids.json');
    const parent = `
    const {spawn}=require('node:child_process'),fs=require('node:fs');
    process.on('SIGTERM',()=>{});
    const worker=spawn(process.execPath,['-e',"process.on('SIGTERM',()=>{});setInterval(()=>{},1000)"],{stdio:'ignore'});
    fs.writeFileSync(${JSON.stringify(marker)},JSON.stringify([process.pid,worker.pid]));
    console.log('started');setInterval(()=>{},1000);
  `;
    const started = Date.now();
    try {
      await assert.rejects(
        runOwnedBuild(process.execPath, ['-e', parent], {
          cwd,
          logPath,
          timeoutMs: 1000,
          graceMs: 100,
        }),
        /build timed out/,
      );
      assert(
        Date.now() - started < 5000,
        'deadline must include bounded escalation',
      );
      assert.match(fs.readFileSync(logPath, 'utf8'), /started/);
      for (const pid of JSON.parse(fs.readFileSync(marker, 'utf8'))) {
        let running = true;
        const deadline = Date.now() + 1000;
        while (running && Date.now() < deadline) {
          try {
            // A killed orphan can briefly remain a zombie until init reaps it.
            running = !fs
              .readFileSync(`/proc/${pid}/stat`, 'utf8')
              .split(') ')[1]
              .startsWith('Z');
          } catch (error) {
            if (error.code !== 'ENOENT') throw error;
            running = false;
          }
          if (running) await new Promise((resolve) => setTimeout(resolve, 20));
        }
        assert.equal(
          running,
          false,
          `process ${pid} must not survive the deadline`,
        );
      }
    } finally {
      if (fs.existsSync(marker))
        for (const pid of JSON.parse(fs.readFileSync(marker, 'utf8'))) {
          try {
            process.kill(pid, 'SIGKILL');
          } catch {}
        }
      fs.rmSync(cwd, { recursive: true, force: true });
    }
  },
);
