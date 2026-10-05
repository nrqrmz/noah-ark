import test from 'node:test';
import assert from 'node:assert/strict';
import { createDoveState, FLIGHT_TIME } from '../scenes/state/dove.js';
import { run } from './helpers.js';

const fly = (s) => { const ev = s.tap('window'); run(s, FLIGHT_TIME + 0.1); return ev; };

test('flights happen in biblical order (Genesis 8:7-12)', () => {
  const s = createDoveState();
  assert.deepEqual([fly(s), fly(s), fly(s), fly(s)], ['raven', 'dove:empty', 'dove:leaf', 'dove:gone']);
});

test('taps during a flight are ignored', () => {
  const s = createDoveState();
  s.tap('window');
  assert.equal(s.locked, true);
  assert.equal(s.tap('window'), null);
  run(s, FLIGHT_TIME + 0.1);
  assert.equal(s.locked, false);
  assert.equal(s.tap('window'), 'dove:empty');
});

test('unknown ids are ignored', () => {
  assert.equal(createDoveState().tap('door'), null);
});

test('done after the fourth flight', () => {
  const s = createDoveState();
  fly(s); fly(s); fly(s);
  s.tap('window');
  run(s, FLIGHT_TIME - 0.2);
  assert.equal(s.done, false);
  run(s, 0.4);
  assert.equal(s.done, true);
});

test('a fifth tap is ignored', () => {
  const s = createDoveState();
  for (let i = 0; i < 4; i++) fly(s);
  assert.equal(s.tap('window'), null);
});
