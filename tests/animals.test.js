import test from 'node:test';
import assert from 'node:assert/strict';
import { FOODS, ANIMALS, accepts, animalsInRound, foodsForRound } from '../characters/animals/data.js';

test('twelve animals, four per round', () => {
  assert.equal(ANIMALS.length, 12);
  for (const r of [1, 2, 3]) assert.equal(animalsInRound(r).length, 4);
});

test('rounds follow the spec order', () => {
  assert.deepEqual(animalsInRound(1), ['lion', 'cow', 'giraffe', 'rabbit']);
  assert.deepEqual(animalsInRound(2), ['crocodile', 'goat', 'elephant', 'dog']);
  assert.deepEqual(animalsInRound(3), ['cat', 'zebra', 'dove', 'raven']);
});

test('each animal accepts only its food', () => {
  const expected = {
    lion: 'meat', cow: 'grass', giraffe: 'leaves', rabbit: 'carrot',
    crocodile: 'meat', goat: 'grass', elephant: 'leaves', dog: 'bone',
    cat: 'fish', zebra: 'grass', dove: 'seeds', raven: 'seeds',
  };
  for (const a of ANIMALS) {
    for (const f of FOODS) assert.equal(accepts(a.id, f), f === expected[a.id], `${a.id} + ${f}`);
  }
});

test('round foods', () => {
  assert.deepEqual(foodsForRound(1), ['meat', 'grass', 'leaves', 'carrot']);
  assert.deepEqual(foodsForRound(2), ['meat', 'grass', 'leaves', 'bone']);
  assert.deepEqual(foodsForRound(3), ['grass', 'fish', 'seeds']);
});

test('every food is used by some animal', () => {
  for (const f of FOODS) assert.ok(ANIMALS.some((a) => a.food === f), f);
});

test('unknown animals accept nothing', () => {
  assert.equal(accepts('unicorn', 'grass'), false);
});
