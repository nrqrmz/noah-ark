import test from 'node:test';
import assert from 'node:assert/strict';
import { EXIT_SECTORS, exitSlots } from '../scenes/state/exit-layout.js';
import { animalsInRound } from '../characters/animals/data.js';

// Solid radii of the real models (male, then female = male * 0.88), computed from
// the formulas that build them:
// - quadrupeds: max(halfLen * 0.85, bodyR * 1.2, waist ? legZ + legR * 1.25 : 0)
//   in characters/animals/quadruped.js, with the presets in characters/animals/index.js;
// - crocodile: HALF_LEN / 0.85 in characters/animals/crocodile.js;
// - birds: 0.3 in characters/animals/bird.js (no female scaling of the slot: kept at 0.3);
// - people: 0.42 * (1.8 / 2.2) * 1.3 in characters/people.js (every family look is 1.8 tall).
const MALE_RADIUS = {
  lion: 0.558, cow: 0.718, giraffe: 0.561, rabbit: 0.204,
  crocodile: 1.477, goat: 0.391, elephant: 0.914, dog: 0.306,
  cat: 0.221, zebra: 0.642, dove: 0.3, raven: 0.3,
};
const radiusOf = (id, sex) => {
  const r = MALE_RADIUS[id];
  if (id === 'dove' || id === 'raven') return r;
  return sex === 'female' ? r * 0.88 : r;
};
const PERSON = 0.447;

// Groups in release order, as scene 8 releases them (male then female per species).
const GROUPS = [
  { id: 'exit-family', radii: Array(8).fill(PERSON) },
  ...[1, 2, 3].map((round) => ({
    id: `exit-round-${round}`,
    radii: animalsInRound(round).flatMap((id) => [radiusOf(id, 'male'), radiusOf(id, 'female')]),
  })),
];
const GAP = 0.3;
// The brief's origin, and the real ramp foot of scene 8's ark (length 13 at z = -5.5).
const ORIGINS = [{ x: 0, z: -1 }, { x: 1.56, z: -1.64 }];
const deg = (rad) => (rad * 180) / Math.PI;

function flat(slots) {
  return GROUPS.flatMap((g) => slots[g.id].map((s, i) => ({ ...s, r: g.radii[i], group: g.id })));
}

for (const origin of ORIGINS) {
  const tag = `(origin ${origin.x}, ${origin.z})`;
  const slots = exitSlots(GROUPS, { origin, gap: GAP });

  test(`one slot per member, in every group ${tag}`, () => {
    for (const g of GROUPS) assert.equal(slots[g.id].length, g.radii.length, g.id);
  });

  test(`no two slots overlap, across all groups ${tag}`, () => {
    const all = flat(slots);
    for (let i = 0; i < all.length; i++) {
      for (let j = i + 1; j < all.length; j++) {
        const a = all[i];
        const b = all[j];
        const d = Math.hypot(a.x - b.x, a.z - b.z);
        assert.ok(d >= a.r + b.r + GAP * 0.99, `${a.group}[${i}] vs ${b.group}: ${d.toFixed(3)}`);
      }
    }
  });

  test(`every slot lies in its group's sector ${tag}`, () => {
    for (const g of GROUPS) {
      const [lo, hi] = EXIT_SECTORS[g.id];
      slots[g.id].forEach((s, i) => {
        const dx = s.x - origin.x;
        const dz = s.z - origin.z;
        const dist = Math.hypot(dx, dz);
        const angle = deg(Math.atan2(dx, dz));
        const half = deg(Math.asin(Math.min(1, g.radii[i] / dist)));
        assert.ok(angle - half >= lo - 1e-9 && angle + half <= hi + 1e-9, `${g.id}[${i}] spans ${(angle - half).toFixed(1)}..${(angle + half).toFixed(1)}`);
      });
    }
  });

  test(`first out goes farthest ${tag}`, () => {
    for (const g of GROUPS) {
      const dists = slots[g.id].map((s) => Math.hypot(s.x - origin.x, s.z - origin.z));
      for (let i = 1; i < dists.length; i++) assert.ok(dists[i] <= dists[i - 1] + 1e-9, `${g.id}[${i}]`);
    }
  });

  test(`slots stay framable ${tag}`, () => {
    for (const s of flat(slots)) {
      assert.ok(Math.abs(s.x) + s.r <= 13, `${s.group} x ${s.x.toFixed(2)}`);
      assert.ok(s.z + s.r <= 10, `${s.group} z ${s.z.toFixed(2)}`);
    }
  });
}

test('the four sectors fan out left to right without touching', () => {
  const ids = ['exit-family', 'exit-round-1', 'exit-round-2', 'exit-round-3'];
  assert.deepEqual(Object.keys(EXIT_SECTORS).sort(), [...ids].sort());
  for (let i = 0; i < ids.length; i++) {
    const [lo, hi] = EXIT_SECTORS[ids[i]];
    assert.ok(lo < hi);
    if (i > 0) assert.ok(lo > EXIT_SECTORS[ids[i - 1]][1]);
  }
});
