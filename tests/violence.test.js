import test from 'node:test';
import assert from 'node:assert/strict';
import { createViolenceState, HOUSES, PAUSE_TIME, LIGHT_TIME } from '../scenes/state/violence.js';

const revealAll = (s) => { for (let i = 0; i < HOUSES; i++) s.tap(`house-${i}`); };
const run = (s, seconds, step = 0.05) => {
  const events = [];
  for (let t = 0; t < seconds - 1e-9; t += step) events.push(...s.tick(step));
  return events;
};

test('four houses, a pause long enough for the thief to leave, then the light', () => {
  assert.equal(HOUSES, 4);
  assert.equal(PAUSE_TIME, 3);
  assert.equal(LIGHT_TIME, 3);
});

test('first pair house fights, the other is robbed', () => {
  for (const [first, second] of [[0, 1], [1, 0]]) {
    const s = createViolenceState();
    assert.equal(s.tap(`house-${first}`), `fight:${first}`);
    assert.equal(s.tap(`house-${second}`), `thief:${second}`);
  }
});

test('jars and food houses', () => {
  const s = createViolenceState();
  assert.equal(s.tap('house-2'), 'jars:2');
  assert.equal(s.tap('house-3'), 'food:3');
});

test('the pair resolves the same way when other houses come first', () => {
  const s = createViolenceState();
  assert.equal(s.tap('house-2'), 'jars:2');
  assert.equal(s.tap('house-1'), 'fight:1');
  assert.equal(s.tap('house-3'), 'food:3');
  assert.equal(s.tap('house-0'), 'thief:0');
});

test('all four taps in one tick start every event and then the light', () => {
  const s = createViolenceState();
  const evs = [3, 1, 2, 0].map((i) => s.tap(`house-${i}`));
  assert.deepEqual(evs, ['food:3', 'fight:1', 'jars:2', 'thief:0']);
  assert.ok(run(s, PAUSE_TIME + 0.1).includes('lightStart'));
});

test('each house reveals once', () => {
  const s = createViolenceState();
  assert.equal(s.tap('house-0'), 'fight:0');
  assert.equal(s.tap('house-0'), null);
  assert.equal(s.tap('house-1'), 'thief:1');
  assert.equal(s.tap('house-1'), null);
  assert.equal(s.tap('house-2'), 'jars:2');
  assert.equal(s.tap('house-2'), null);
});

test('unknown ids are ignored', () => {
  const s = createViolenceState();
  assert.equal(s.tap('noah'), null);
  assert.equal(s.tap('house-4'), null);
  assert.equal(s.tap('house-x'), null);
});

test('light starts only after all four houses', () => {
  const s = createViolenceState();
  for (let i = 0; i < HOUSES - 1; i++) s.tap(`house-${i}`);
  assert.deepEqual(run(s, PAUSE_TIME + 1), []);
  assert.equal(s.locked, false);
  s.tap(`house-${HOUSES - 1}`);
  const early = run(s, PAUSE_TIME - 0.2);
  assert.ok(!early.includes('lightStart'));
  assert.ok(run(s, 0.3).includes('lightStart'));
});

test('taps are locked during the light', () => {
  const s = createViolenceState();
  revealAll(s);
  run(s, PAUSE_TIME + 0.1);
  assert.equal(s.locked, true);
  assert.equal(s.tap('house-0'), null);
});

test('done only after LIGHT_TIME', () => {
  const s = createViolenceState();
  revealAll(s);
  run(s, PAUSE_TIME + LIGHT_TIME - 0.2);
  assert.equal(s.done, false);
  const events = run(s, 0.4);
  assert.ok(events.includes('lightEnd'));
  assert.equal(s.done, true);
});
