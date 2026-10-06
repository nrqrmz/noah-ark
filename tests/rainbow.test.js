import test from 'node:test';
import assert from 'node:assert/strict';
import { createRainbowState, GROUPS, RECEDE_TIME, DOOR_TIME, RAINBOW_TIME } from '../scenes/state/rainbow.js';
import { run } from './helpers.js';

const INTRO = RECEDE_TIME + DOOR_TIME;
const ready = () => { const s = createRainbowState(); run(s, INTRO + 0.1); return s; };
const exitAll = (s) => { for (const g of GROUPS) { s.tap(g); s.settled(g); } };

test('four groups leave the ark', () => {
  assert.deepEqual(GROUPS, ['exit-family', 'exit-round-1', 'exit-round-2', 'exit-round-3']);
});

test('taps are ignored while the water recedes and the door opens', () => {
  const s = createRainbowState();
  const early = run(s, RECEDE_TIME + 0.1);
  assert.ok(early.includes('recede'));
  assert.ok(early.includes('doorOpening'));
  assert.equal(s.locked, true);
  assert.equal(s.tap('exit-family'), null);
  assert.ok(run(s, DOOR_TIME).includes('doorOpen'));
  assert.equal(s.locked, false);
});

test('each group exits once', () => {
  const s = ready();
  assert.equal(s.tap('exit-round-2'), 'exit:exit-round-2');
  s.settled('exit-round-2');
  assert.equal(s.tap('exit-round-2'), null);
});

test('unknown ids are ignored', () => {
  assert.equal(ready().tap('rainbow'), null);
});

test('locked until the previous group has settled', () => {
  const s = ready();
  s.tap('exit-family');
  assert.equal(s.locked, true);
  assert.equal(s.tap('exit-round-1'), null);
  s.settled('exit-family');
  assert.equal(s.locked, false);
  assert.equal(s.tap('exit-round-1'), 'exit:exit-round-1');
});

test('tap is ignored while the previous group is still walking to its slots', () => {
  const s = ready();
  assert.equal(s.tap('exit-family'), 'exit:exit-family');
  assert.equal(s.tap('exit-round-1'), null);
  s.settled('exit-family');
  assert.equal(s.tap('exit-round-1'), 'exit:exit-round-1');
});

test('settled is ignored for a group that has not been called', () => {
  const s = ready();
  s.settled('exit-family');
  assert.equal(s.locked, false);
  assert.equal(s.tap('exit-family'), 'exit:exit-family');
  assert.equal(s.locked, true);
});

test('tap while locked is ignored', () => {
  const s = ready();
  exitAll(s);
  assert.equal(s.locked, true);
  assert.equal(s.tap('exit-family'), null);
});

test('rainbow only after all groups settled', () => {
  const s = ready();
  for (const g of GROUPS.slice(0, 3)) { s.tap(g); s.settled(g); }
  assert.deepEqual(run(s, 5), []);
  s.tap(GROUPS[3]);
  assert.deepEqual(run(s, 5), []);
  s.settled(GROUPS[3]);
  assert.ok(run(s, 0.1).includes('rainbow'));
});

test('done after RAINBOW_TIME', () => {
  const s = ready();
  exitAll(s);
  run(s, RAINBOW_TIME - 0.4);
  assert.equal(s.done, false);
  run(s, 0.6);
  assert.equal(s.done, true);
});
