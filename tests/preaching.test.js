import test from 'node:test';
import assert from 'node:assert/strict';
import { createPreachingState, LISTENERS, REACTION_ORDER, TURN_TIME, ALONE_TIME } from '../scenes/state/preaching.js';
import { run } from './helpers.js';

const tapAll = (s) => { for (const id of LISTENERS) s.tap(id); };

test('reaction follows tap order, not the person', () => {
  for (const order of [[0, 1, 2, 3], [3, 2, 1, 0], [2, 0, 3, 1]]) {
    const s = createPreachingState();
    assert.deepEqual(order.map((i) => s.tap(`person-${i}`)), REACTION_ORDER);
  }
});

test('a tapped listener cannot be tapped again, even while leaving', () => {
  const s = createPreachingState();
  s.tap('person-1'); s.tap('person-0'); s.tap('person-3');
  assert.equal(s.tap('person-3'), null);
  assert.equal(s.tap('person-2'), 'leave');
  assert.equal(s.tap('person-2'), null);
});

test('turnAway then walkOff only after the fourth tap', () => {
  const s = createPreachingState();
  s.tap('person-2'); s.tap('person-0'); s.tap('person-1');
  assert.deepEqual(run(s, 5), []);
  assert.equal(s.locked, false);
  s.tap('person-3');
  assert.equal(s.locked, true);
  assert.deepEqual(run(s, 0.1), ['turnAway']);
  assert.deepEqual(run(s, TURN_TIME - 0.2), []);
  assert.deepEqual(run(s, 0.2), ['walkOff']);
});

test('done after TURN_TIME + ALONE_TIME', () => {
  const s = createPreachingState();
  tapAll(s);
  run(s, TURN_TIME + ALONE_TIME - 0.2);
  assert.equal(s.done, false);
  run(s, 0.4);
  assert.equal(s.done, true);
});

test('unknown ids are ignored', () => {
  const s = createPreachingState();
  assert.equal(s.tap('noah'), null);
  assert.equal(s.tap('person-laugh'), null);
  assert.equal(s.tap('person-0'), 'laugh');
});
