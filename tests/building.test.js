import test from 'node:test';
import assert from 'node:assert/strict';
import { createBuildingState, TREES, FINISH_TIME } from '../scenes/state/building.js';
import { run } from './helpers.js';

const finishTree = (s, i) => [s.tap(`tree-${i}`), s.tap(`logs-${i}`), s.tap(`planks-${i}`)];

test('tree goes standing → logs → planks → gone', () => {
  const s = createBuildingState();
  assert.deepEqual(finishTree(s, 0), ['chop:0', 'saw:0', 'fly:0']);
  assert.equal(s.stage(0), 'gone');
});

test('out-of-order ids are ignored', () => {
  const s = createBuildingState();
  assert.equal(s.tap('planks-0'), null);
  assert.equal(s.tap('logs-0'), null);
  s.tap('tree-0');
  assert.equal(s.tap('tree-0'), null);
  assert.equal(s.tap('planks-0'), null);
});

test('unknown ids are ignored', () => {
  const s = createBuildingState();
  assert.equal(s.tap(`tree-${TREES}`), null);
  assert.equal(s.tap('ark'), null);
});

test('progress is quarters', () => {
  const s = createBuildingState();
  assert.equal(s.progress, 0);
  finishTree(s, 2);
  assert.equal(s.progress, 1 / TREES);
  finishTree(s, 0);
  assert.equal(s.progress, 2 / TREES);
});

test('tap while locked is ignored', () => {
  const s = createBuildingState();
  for (let i = 0; i < TREES; i++) finishTree(s, i);
  assert.equal(s.locked, true);
  assert.equal(s.tap('tree-0'), null);
});

test('done after FINISH_TIME following the last plank', () => {
  const s = createBuildingState();
  for (let i = 0; i < TREES - 1; i++) finishTree(s, i);
  assert.deepEqual(run(s, FINISH_TIME + 1), []);
  finishTree(s, TREES - 1);
  const events = run(s, FINISH_TIME - 0.2);
  assert.ok(events.includes('finished'));
  assert.equal(s.done, false);
  run(s, 0.4);
  assert.equal(s.done, true);
});
