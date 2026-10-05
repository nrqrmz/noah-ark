import test from 'node:test';
import assert from 'node:assert/strict';
import { createRainbowState, GROUPS, RECEDE_TIME, EXIT_TIME, RAINBOW_TIME } from '../scenes/state/rainbow.js';
import { run } from './helpers.js';

const afterRecede = () => { const s = createRainbowState(); run(s, RECEDE_TIME + 0.1); return s; };
const exitAll = (s) => { for (const g of GROUPS) s.tap(g); };

test('four groups leave the ark', () => {
  assert.deepEqual(GROUPS, ['exit-family', 'exit-round-1', 'exit-round-2', 'exit-round-3']);
});

test('taps are ignored while the water recedes', () => {
  const s = createRainbowState();
  assert.equal(s.locked, true);
  assert.equal(s.tap('exit-family'), null);
  const events = run(s, RECEDE_TIME + 0.1);
  assert.ok(events.includes('recede'));
  assert.ok(events.includes('doorOpen'));
  assert.equal(s.locked, false);
});

test('each group exits once', () => {
  const s = afterRecede();
  assert.equal(s.tap('exit-round-2'), 'exit:exit-round-2');
  assert.equal(s.tap('exit-round-2'), null);
});

test('unknown ids are ignored', () => {
  assert.equal(afterRecede().tap('rainbow'), null);
});

test('tap while locked is ignored', () => {
  const s = afterRecede();
  exitAll(s);
  assert.equal(s.locked, true);
  assert.equal(s.tap('exit-family'), null);
});

test('rainbow only after all groups finished', () => {
  const s = afterRecede();
  for (const g of GROUPS.slice(0, 3)) s.tap(g);
  assert.deepEqual(run(s, EXIT_TIME + 1), []);
  s.tap(GROUPS[3]);
  assert.deepEqual(run(s, EXIT_TIME - 0.2), []);
  assert.ok(run(s, 0.4).includes('rainbow'));
});

test('done after RAINBOW_TIME', () => {
  const s = afterRecede();
  exitAll(s);
  run(s, EXIT_TIME + 0.1);
  run(s, RAINBOW_TIME - 0.4);
  assert.equal(s.done, false);
  run(s, 0.4);
  assert.equal(s.done, true);
});
