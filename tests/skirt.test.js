import test from 'node:test';
import assert from 'node:assert/strict';
import { legSamplePoints, skirtPenetration, skirtPose, maxSwing, SIT_DROP, SKIRT_BOTTOM_R, SIT_DEPTH, HIP_Y, LEG_R, hipHalfHeight } from '../characters/skirt.js';

const HEMS = { female: 0.1, male: 0.3 };
const EPS = 1e-3;

const penetration = (hem, legL, legR, sitW = 0) => skirtPenetration(
  hem,
  skirtPose(hem, legL, legR, sitW),
  [...legSamplePoints(-1, legL), ...legSamplePoints(1, legR)],
  sitW,
);

// Same smoothing as rig.js `approach`.
const approach = (c, t, dt, speed = 10) => c + (t - c) * (1 - Math.exp(-speed * dt));

for (const [who, hem] of Object.entries(HEMS)) {
  test(`${who}: the walking swing fits the full skirt and is not tiny`, () => {
    const swing = maxSwing(hem);
    assert.ok(swing >= 0.2, `swing ${swing}`);
    assert.equal(skirtPose(hem, swing, -swing).length, 1);
  });

  test(`${who}: no leg pokes through the skirt at any walking leg pair`, () => {
    const s = Math.min(0.7, maxSwing(hem));
    for (let a = -s; a <= s + 1e-9; a += s / 8) {
      for (let b = -s; b <= s + 1e-9; b += s / 8) {
        assert.ok(penetration(hem, a, b) <= EPS, `legs ${a.toFixed(2)}, ${b.toFixed(2)}`);
      }
    }
  });

  test(`${who}: no leg pokes through the skirt while kicking`, () => {
    const s = Math.min(0.7, maxSwing(hem));
    for (let r = -1.1; r <= 0.2 + 1e-9; r += 0.05) {
      for (const l of [-s, 0, s]) assert.ok(penetration(hem, l, r) <= EPS, `legs ${l.toFixed(2)}, ${r.toFixed(2)}`);
    }
  });

  test(`${who}: sitting down and standing up keep the legs inside, hips on the ground`, () => {
    // Mirrors updatePerson: sitW eases to 1 (speed 5), legs ease (speed 14) to -PI/2 * sitW.
    const dt = 1 / 60;
    let sitW = 0;
    let l = 0.3;
    let r = -0.3; // mid-stride when the push lands
    const step = (goal) => {
      sitW = approach(sitW, goal, dt, 5);
      l = approach(l, -Math.PI / 2 * sitW, dt, 14);
      r = approach(r, -Math.PI / 2 * sitW, dt, 14);
      assert.ok(penetration(hem, l, r, sitW) <= EPS, `sitW ${sitW.toFixed(2)} legs ${l.toFixed(2)}, ${r.toFixed(2)}`);
    };
    for (let i = 0; i < 180; i++) step(1);
    // Seated: the lowest point of the lap touches the ground, the legs rest just above it.
    const lap = HIP_Y - SKIRT_BOTTOM_R * SIT_DEPTH - SIT_DROP * sitW;
    assert.ok(Math.abs(lap) < 0.01, `lap bottom ${lap}`);
    assert.ok(HIP_Y - LEG_R - SIT_DROP >= 0, 'legs above the ground');
    const hips = HIP_Y - hipHalfHeight(1) - SIT_DROP;
    assert.ok(hips >= 0 && hips < 0.03, `hips bottom ${hips}`);
    for (let i = 0; i < 180; i++) step(0);
  });
}
