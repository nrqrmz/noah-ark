import test from 'node:test';
import assert from 'node:assert/strict';
import { createViolenceState, HOUSES, PAUSE_TIME, LIGHT_TIME } from '../scenes/state/violence.js';

const revealAll = (s) => { for (let i = 0; i < HOUSES; i++) s.tap(`house-${i}`); };
const run = (s, seconds, step = 0.05) => {
  const events = [];
  for (let t = 0; t < seconds - 1e-9; t += step) events.push(...s.tick(step));
  return events;
};

test('each house reveals once', () => {
  const s = createViolenceState();
  assert.equal(s.tap('house-0'), 'reveal');
  assert.equal(s.tap('house-0'), null);
});

test('unknown ids are ignored', () => {
  assert.equal(createViolenceState().tap('noah'), null);
});

test('light starts only after all four houses', () => {
  const s = createViolenceState();
  for (let i = 0; i < HOUSES - 1; i++) s.tap(`house-${i}`);
  assert.deepEqual(run(s, PAUSE_TIME + 1), []);
  assert.equal(s.locked, false);
  s.tap(`house-${HOUSES - 1}`);
  assert.ok(run(s, PAUSE_TIME + 0.1).includes('lightStart'));
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
