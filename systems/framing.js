// Camera distance so a box of size {w, h} fits entirely in a perspective view.
export function fitDistance(size, aspect, fovDeg) {
  const halfTan = Math.tan((fovDeg * Math.PI) / 360);
  const forHeight = size.h / (2 * halfTan);
  const forWidth = size.w / (2 * halfTan * aspect);
  return Math.max(forHeight, forWidth);
}

// Framing box (as main.js reads it: centre, size, `elev`) that keeps every world
// point { x, y, z } in view at any aspect, perspective included. The centre's
// depth `cz` is given; its x and height are solved so the points sit centred.
// With a known `aspect` the fit is exact for that view. Without one, points
// nearer than the centre are scaled up as the closest possible camera (the
// height-bound one) would show them and farther ones are not shrunk, so the
// fit holds at any aspect (but leaves room to spare).
export function fitPoints(points, { elev, fovDeg, cz, aspect = null }) {
  const halfTan = Math.tan((fovDeg * Math.PI) / 360);
  const sin = Math.sin(elev);
  const cos = Math.cos(elev);
  // Offsets of every point on the plane through the centre, as seen from distance d.
  const offsets = (cx, cy, d) => points.map((p) => {
    const ry = p.y - cy;
    const rz = p.z - cz;
    const ahead = -ry * sin - rz * cos; // past the centre plane, away from the camera
    const k = ahead < 0 || aspect ? d / Math.max(d * 0.05, d + ahead) : 1;
    return { u: (p.x - cx) * k, v: (ry * cos - rz * sin) * k };
  });
  let cx = points.reduce((s, p) => s + p.x, 0) / points.length;
  let cy = points.reduce((s, p) => s + p.y, 0) / points.length;
  let w = 1;
  let h = 1;
  const distance = () => (aspect ? fitDistance({ w, h }, aspect, fovDeg) : h / (2 * halfTan));
  for (let i = 0; i < 80; i++) {
    const o = offsets(cx, cy, distance());
    const us = o.map((q) => q.u);
    const vs = o.map((q) => q.v);
    // Re-centre (damped, since moving the centre also changes the perspective).
    cx += (Math.min(...us) + Math.max(...us)) / 4;
    cy += (Math.min(...vs) + Math.max(...vs)) / (4 * cos);
    const final = offsets(cx, cy, distance());
    w = Math.max(1e-3, 2 * Math.max(...final.map((q) => Math.abs(q.u))));
    h = Math.max(1e-3, 2 * Math.max(...final.map((q) => Math.abs(q.v))));
  }
  return { cx, cy, cz, w, h, elev };
}
