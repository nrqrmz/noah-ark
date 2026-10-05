import test from 'node:test';
import assert from 'node:assert/strict';
import { createBlueprintState, PARTS, GLOW_TIME } from '../scenes/state/blueprint.js';
import { run } from './helpers.js';

test('the five parts from Genesis 6:14-16', () => {
  assert.deepEqual([...PARTS].sort(), ['decks', 'door', 'length', 'pitch', 'window']);
});

test('each part reveals once in any order', () => {
  const s = createBlueprintState();
  for (const p of ['pitch', 'door', 'length', 'window', 'decks']) assert.equal(s.tap(p), `reveal:${p}`);
  assert.equal(s.tap('door'), null);
});

test('unknown ids are ignored', () => {
  assert.equal(createBlueprintState().tap('roof'), null);
});

test('glow after all five', () => {
  const s = createBlueprintState();
  for (const p of PARTS.slice(0, 4)) s.tap(p);
  assert.deepEqual(run(s, GLOW_TIME + 1), []);
  s.tap(PARTS[4]);
  assert.ok(run(s, 0.1).includes('glow'));
});

test('tap while locked is ignored', () => {
  const s = createBlueprintState();
  for (const p of PARTS) s.tap(p);
  assert.equal(s.locked, true);
  assert.equal(s.tap('door'), null);
});

test('done after GLOW_TIME', () => {
  const s = createBlueprintState();
  for (const p of PARTS) s.tap(p);
  run(s, GLOW_TIME - 0.2);
  assert.equal(s.done, false);
  run(s, 0.4);
  assert.equal(s.done, true);
});
