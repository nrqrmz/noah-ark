import test from 'node:test';
import assert from 'node:assert/strict';
import { markings } from '../characters/animals/markings.js';

// Distance in UV space, wrapping u across the 0/1 seam.
function uvDist(a, b) {
  let du = Math.abs(a.u - b.u);
  du = Math.min(du, 1 - du);
  return Math.hypot(du, a.v - b.v);
}

function assertNoOverlap(shapes) {
  for (let i = 0; i < shapes.length; i++) {
    for (let j = i + 1; j < shapes.length; j++) {
      assert.ok(uvDist(shapes[i], shapes[j]) >= shapes[i].r + shapes[j].r + 0.01, `shapes ${i} and ${j} overlap`);
    }
  }
}

test('patches do not overlap and stay inside the texture', () => {
  const p = markings('patches', { seed: 3, count: 40 });
  assert.equal(p.length, 40);
  assertNoOverlap(p);
  for (const s of p) {
    assert.ok(s.v - s.r >= 0);
    assert.ok(s.v + s.r <= 1);
  }
});

test('spots are fewer and larger than patches', () => {
  const patches = markings('patches', { seed: 3, count: 40 });
  const spots = markings('spots', { seed: 3, count: 6 });
  assert.equal(spots.length, 6);
  assert.ok(Math.min(...spots.map((s) => s.r)) > Math.max(...patches.map((s) => s.r)));
  assertNoOverlap(spots);
});

test('stripes alternate without overlapping', () => {
  const s = markings('stripes', { seed: 2, count: 14 }).sort((a, b) => a.v - b.v);
  assert.equal(s.length, 14);
  for (const b of s) assert.ok(b.width > 0);
  for (let i = 1; i < s.length; i++) {
    const prev = s[i - 1];
    const next = s[i];
    assert.ok(next.v - next.width / 2 - next.wobble >= prev.v + prev.width / 2 + prev.wobble);
  }
  assert.ok(s[0].v - s[0].width / 2 >= 0);
  assert.ok(s[s.length - 1].v + s[s.length - 1].width / 2 <= 1);
});

test('same seed, same markings; different seed, different markings', () => {
  for (const [kind, count] of [['patches', 40], ['spots', 6], ['stripes', 14]]) {
    assert.deepEqual(markings(kind, { seed: 5, count }), markings(kind, { seed: 5, count }));
    assert.notDeepEqual(markings(kind, { seed: 5, count }), markings(kind, { seed: 6, count }));
  }
});

test('patches and spots fit for many seeds', () => {
  for (let seed = 1; seed <= 30; seed++) {
    assert.equal(markings('patches', { seed, count: 40 }).length, 40);
    assert.equal(markings('spots', { seed, count: 6 }).length, 6);
  }
});
