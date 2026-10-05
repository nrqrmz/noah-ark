import test from 'node:test';
import assert from 'node:assert/strict';
import { fitDistance } from '../systems/framing.js';

const visible = (d, fov, aspect) => {
  const h = 2 * d * Math.tan((fov * Math.PI) / 360);
  return { w: h * aspect, h };
};

for (const aspect of [0.4, 0.46, 1, 2.16, 2.5]) {
  test(`box fits at aspect ${aspect}`, () => {
    const box = { w: 20, h: 8 };
    const v = visible(fitDistance(box, aspect, 40), 40, aspect);
    assert.ok(v.w >= box.w - 1e-6 && v.h >= box.h - 1e-6);
    // Tight on one axis: the camera is no farther than needed.
    assert.ok(Math.abs(v.w - box.w) < 1e-6 || Math.abs(v.h - box.h) < 1e-6);
  });
}
