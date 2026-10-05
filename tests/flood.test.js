import test from 'node:test';
import assert from 'node:assert/strict';
import { createFloodState, FAMILY_IDS, WALK_TIME, DOOR_TIME, RAIN_TIME } from '../scenes/state/flood.js';
import { run } from './helpers.js';

test('the eight people of 1 Peter 3:20', () => {
  assert.deepEqual(FAMILY_IDS, ['noah', 'noahWife', 'shem', 'shemWife', 'ham', 'hamWife', 'japheth', 'japhethWife']);
});

test('each family member boards once', () => {
  const s = createFloodState();
  assert.equal(s.tap('ham'), 'board:ham');
  assert.equal(s.tap('ham'), null);
});

test('unknown ids are ignored', () => {
  assert.equal(createFloodState().tap('lion'), null);
});

test('door closes only after all 8 finished walking', () => {
  const s = createFloodState();
  for (const id of FAMILY_IDS.slice(0, 7)) s.tap(id);
  assert.deepEqual(run(s, WALK_TIME + 1), []);
  s.tap(FAMILY_IDS[7]);
  assert.deepEqual(run(s, WALK_TIME - 0.2), []);
  assert.ok(run(s, 0.4).includes('doorClose'));
});

test('locked through door and rain', () => {
  const s = createFloodState();
  for (const id of FAMILY_IDS) s.tap(id);
  assert.equal(s.locked, true);
  run(s, WALK_TIME + DOOR_TIME + 0.2);
  assert.equal(s.locked, true);
  assert.equal(s.tap('noah'), null);
});

test('rain starts after the door and the scene is done after DOOR_TIME + RAIN_TIME', () => {
  const s = createFloodState();
  for (const id of FAMILY_IDS) s.tap(id);
  run(s, WALK_TIME + 0.1);
  const events = run(s, DOOR_TIME + 0.1);
  assert.ok(events.includes('rainStart'));
  run(s, RAIN_TIME - 0.4);
  assert.equal(s.done, false);
  run(s, 0.4);
  assert.equal(s.done, true);
});
