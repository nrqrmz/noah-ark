import test from 'node:test';
import assert from 'node:assert/strict';
import { separate, queuePositions } from '../systems/solid.js';

const dist = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);

test('two overlapping bodies end at least r1+r2 apart', () => {
  const a = { x: 0, z: 0, r: 0.5 };
  const b = { x: 0.01, z: 0, r: 0.7 };
  separate([a, b]);
  assert.ok(dist(a, b) >= 1.2 - 1e-6);
});

test('a body pushed into an obstacle ends outside it and the obstacle does not move', () => {
  const body = { x: 0.2, z: 0, r: 0.5 };
  const rock = { x: 0, z: 0, r: 1 };
  separate([body], [rock]);
  assert.ok(dist(body, rock) >= 1.5 - 1e-6);
  assert.deepEqual(rock, { x: 0, z: 0, r: 1 });
});

test('twelve bodies spawned on one point all end separated', () => {
  const bodies = Array.from({ length: 12 }, () => ({ x: 1, z: 1, r: 0.4 }));
  separate(bodies, [], 20);
  for (let i = 0; i < bodies.length; i++) {
    for (let j = i + 1; j < bodies.length; j++) {
      assert.ok(dist(bodies[i], bodies[j]) >= 0.8 - 1e-3, `${i}-${j}: ${dist(bodies[i], bodies[j])}`);
    }
  }
});

test('bodies already apart are unchanged', () => {
  const a = { x: 0, z: 0, r: 0.5 };
  const b = { x: 3, z: 0, r: 0.5 };
  separate([a, b]);
  assert.deepEqual([a, b], [{ x: 0, z: 0, r: 0.5 }, { x: 3, z: 0, r: 0.5 }]);
});

test('queuePositions spaces items exactly', () => {
  const pts = queuePositions({ x: 1, z: 2 }, { x: 3, z: 4 }, 4, 1.5);
  assert.equal(pts.length, 4);
  assert.deepEqual(pts[0], { x: 1, z: 2 });
  for (let i = 1; i < pts.length; i++) assert.ok(Math.abs(dist(pts[i - 1], pts[i]) - 1.5) < 1e-9);
});
