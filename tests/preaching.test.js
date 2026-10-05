import test from 'node:test';
import assert from 'node:assert/strict';
import { createPreachingState, ALONE_TIME } from '../scenes/state/preaching.js';
import { run } from './helpers.js';

const REACTIONS = { 'person-laugh': 'laugh', 'person-mock': 'mock', 'person-ears': 'coverEars', 'person-leave': 'turnAway' };
const tapAll = (s) => { for (const id of Object.keys(REACTIONS)) s.tap(id); };

test('each reaction fires once', () => {
  const s = createPreachingState();
  for (const [id, reaction] of Object.entries(REACTIONS)) assert.equal(s.tap(id), reaction);
  for (const id of Object.keys(REACTIONS)) assert.equal(s.tap(id), null);
});

test('unknown ids are ignored', () => {
  assert.equal(createPreachingState().tap('noah'), null);
});

test('alone only after all four', () => {
  const s = createPreachingState();
  s.tap('person-laugh');
  assert.deepEqual(run(s, ALONE_TIME + 1), []);
  s.tap('person-mock'); s.tap('person-ears'); s.tap('person-leave');
  assert.ok(run(s, 0.1).includes('alone'));
});

test('tap while locked is ignored', () => {
  const s = createPreachingState();
  tapAll(s);
  assert.equal(s.locked, true);
  assert.equal(s.tap('person-laugh'), null);
});

test('done after ALONE_TIME', () => {
  const s = createPreachingState();
  tapAll(s);
  run(s, ALONE_TIME - 0.2);
  assert.equal(s.done, false);
  run(s, 0.4);
  assert.equal(s.done, true);
});
