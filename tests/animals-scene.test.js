import test from 'node:test';
import assert from 'node:assert/strict';
import { createAnimalsState, BOARD_TIME } from '../scenes/state/animals.js';
import { animalsInRound, ANIMALS } from '../characters/animals/data.js';
import { run } from './helpers.js';

const foodOf = (id) => ANIMALS.find((a) => a.id === id).food;
const board = (s, id) => { s.tap(`food-${foodOf(id)}`); return s.tap(`pair-${id}`); };
const finishRound = (s, round) => { for (const id of animalsInRound(round)) board(s, id); return run(s, BOARD_TIME + 0.1); };

test('starts in round 1 with nothing selected', () => {
  const s = createAnimalsState();
  assert.equal(s.round, 1);
  assert.equal(s.selected, null);
});

test('pair needs a selected food', () => {
  assert.equal(createAnimalsState().tap('pair-lion'), null);
});

test('right food boards and clears selection', () => {
  const s = createAnimalsState();
  assert.equal(s.tap('food-meat'), 'select:meat');
  assert.equal(s.tap('pair-lion'), 'board:lion');
  assert.equal(s.selected, null);
});

test('wrong food rejects and keeps selection', () => {
  const s = createAnimalsState();
  s.tap('food-grass');
  assert.equal(s.tap('pair-lion'), 'reject:lion');
  assert.equal(s.selected, 'grass');
});

test('selecting another food replaces the selection', () => {
  const s = createAnimalsState();
  s.tap('food-grass');
  assert.equal(s.tap('food-carrot'), 'select:carrot');
  assert.equal(s.selected, 'carrot');
});

test('foods and pairs from other rounds are ignored', () => {
  const s = createAnimalsState();
  assert.equal(s.tap('food-bone'), null);
  s.tap('food-meat');
  assert.equal(s.tap('pair-crocodile'), null);
});

test('tapping a boarded pair is ignored', () => {
  const s = createAnimalsState();
  board(s, 'lion');
  s.tap('food-meat');
  assert.equal(s.tap('pair-lion'), null);
});

test('round advances only after the last pair finishes boarding', () => {
  const s = createAnimalsState();
  const [last, ...first] = animalsInRound(1).reverse();
  for (const id of first) board(s, id);
  assert.deepEqual(run(s, BOARD_TIME + 1), []);
  board(s, last);
  assert.deepEqual(run(s, BOARD_TIME - 0.2), []);
  assert.equal(s.round, 1);
  assert.ok(run(s, 0.4).includes('round:2'));
  assert.equal(s.round, 2);
});

test('tap while locked is ignored', () => {
  const s = createAnimalsState();
  for (const id of animalsInRound(1)) board(s, id);
  assert.equal(s.locked, true); // waiting for the round's last pair to board
  assert.equal(s.tap('food-meat'), null);
});

test('done after round 3', () => {
  const s = createAnimalsState();
  finishRound(s, 1);
  finishRound(s, 2);
  assert.equal(s.done, false);
  const events = finishRound(s, 3);
  assert.ok(events.includes('allAboard'));
  assert.equal(s.done, true);
});
