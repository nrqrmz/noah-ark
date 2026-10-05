import test from 'node:test';
import assert from 'node:assert/strict';
import { createFloodState, FAMILY_IDS, DOOR_TIME, RAIN_TIME } from '../scenes/state/flood.js';
import { run } from './helpers.js';

const boardAll = (s) => { for (const id of FAMILY_IDS) { s.tap(id); s.inside(id); } };

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

test('the door waits for the last person to be inside, however long the walk', () => {
  const s = createFloodState();
  for (const id of FAMILY_IDS) s.tap(id);
  for (const id of FAMILY_IDS.slice(0, 7)) s.inside(id);
  assert.deepEqual(run(s, 10), []);
  s.inside(FAMILY_IDS[7]);
  assert.ok(run(s, 0.1).includes('doorClose'));
});

test('inside() only counts people who were sent in', () => {
  const s = createFloodState();
  s.inside('noah');
  for (const id of FAMILY_IDS) s.tap(id);
  for (const id of FAMILY_IDS.slice(1)) s.inside(id);
  assert.deepEqual(run(s, 5), []);
});

test('locked through door and rain', () => {
  const s = createFloodState();
  boardAll(s);
  assert.equal(s.locked, true);
  run(s, DOOR_TIME + 0.2);
  assert.equal(s.locked, true);
  assert.equal(s.tap('noah'), null);
});

test('rain starts after the door and the scene is done after DOOR_TIME + RAIN_TIME', () => {
  const s = createFloodState();
  boardAll(s);
  const events = run(s, DOOR_TIME + 0.1);
  assert.ok(events.includes('rainStart'));
  run(s, RAIN_TIME - 0.4);
  assert.equal(s.done, false);
  run(s, 0.4);
  assert.equal(s.done, true);
});
