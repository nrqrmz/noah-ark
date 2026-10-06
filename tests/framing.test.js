import test from 'node:test';
import assert from 'node:assert/strict';
import { fitDistance, fitPoints } from '../systems/framing.js';

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

// Projects a world point with the camera main.js places for `box` (NDC in [-1, 1] = visible).
function project(p, box, aspect, fov) {
  const d = fitDistance(box, aspect, fov);
  const e = box.elev;
  const cam = { x: box.cx, y: box.cy + Math.sin(e) * d, z: box.cz + Math.cos(e) * d };
  const f = { x: 0, y: -Math.sin(e), z: -Math.cos(e) };
  const u = { x: 0, y: Math.cos(e), z: -Math.sin(e) };
  const rel = { x: p.x - cam.x, y: p.y - cam.y, z: p.z - cam.z };
  const depth = rel.x * f.x + rel.y * f.y + rel.z * f.z;
  const halfTan = Math.tan((fov * Math.PI) / 360);
  return { x: rel.x / (depth * halfTan * aspect), y: (rel.y * u.y + rel.z * u.z) / (depth * halfTan) };
}

// Ground characters spread toward the camera, as in scene 8, plus a tall backdrop.
const POINTS = [
  { x: -8, y: 0, z: -1 }, { x: -8, y: 2, z: -1 }, { x: 9.5, y: 0, z: 8.5 }, { x: 9.5, y: 1, z: 8.5 },
  { x: 0, y: 0, z: 9 }, { x: -3, y: 3.6, z: 5 }, { x: -6.5, y: 5.5, z: -5.5 }, { x: 6.5, y: 5.5, z: -5.5 },
];

for (const elev of [0.34, 0.55]) {
  for (const aspect of [0.6, 0.77, 1, 1.41, 2]) {
    test(`fitPoints keeps every point in view (elev ${elev}, aspect ${aspect})`, () => {
      const box = fitPoints(POINTS, { elev, fovDeg: 40, cz: -1 });
      assert.equal(box.elev, elev);
      assert.equal(box.cz, -1);
      for (const p of POINTS) {
        const s = project(p, box, aspect, 40);
        assert.ok(Math.abs(s.x) <= 1 + 1e-6 && Math.abs(s.y) <= 1 + 1e-6, `${JSON.stringify(p)} -> ${JSON.stringify(s)}`);
      }
    });
  }
}

test('fitPoints is tight: some point touches the frame', () => {
  const box = fitPoints(POINTS, { elev: 0.34, fovDeg: 40, cz: -1 });
  const aspect = box.w / box.h; // both constraints bind at this aspect
  const edge = Math.max(...POINTS.map((p) => { const s = project(p, box, aspect, 40); return Math.max(Math.abs(s.x), Math.abs(s.y)); }));
  assert.ok(edge > 0.9, `edge ${edge}`);
});

for (const aspect of [0.77, 1.04, 1.41]) {
  test(`fitPoints for a known aspect fits exactly that view (aspect ${aspect})`, () => {
    const box = fitPoints(POINTS, { elev: 0.34, fovDeg: 40, cz: -1, aspect });
    const edges = POINTS.map((p) => project(p, box, aspect, 40));
    assert.ok(edges.every((s) => Math.abs(s.x) <= 1 + 1e-6 && Math.abs(s.y) <= 1 + 1e-6));
    // Tight: something touches a side, so the characters are as big as they can be.
    assert.ok(Math.max(...edges.map((s) => Math.max(Math.abs(s.x), Math.abs(s.y)))) > 0.99);
  });
}
