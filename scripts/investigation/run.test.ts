import test from 'node:test';
import assert from 'node:assert/strict';
import { parseArguments, main } from './run.js';
test('CLI only accepts an explicit configuration/new output or help', async () => {
  assert.deepEqual(parseArguments(['--help']), { help: true });
  assert.equal(await main(['--help']), 0);
  for (const args of [
    [],
    ['--post'],
    ['--config=a', '--out=b', '--fix'],
    ['--config=a', '--config=b'],
    ['--config=', '--out=x'],
  ])
    assert.throws(() => parseArguments(args));
  assert('config' in parseArguments(['--out=new', '--config=config.json']));
});
