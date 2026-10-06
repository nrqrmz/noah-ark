// Pure geometry for a person's tunic skirt and legs (no three.js), so the rule
// "no leg or sandal ever passes through a skirt" can be tested with node.
//
// All values are in the person's nominal units (see people.js). The skirt is a
// truncated cone from the waist down to the hem, split at hip height: the upper
// part is fixed to the body; the lower part hangs from a pivot at (0, HIP_Y, 0)
// and can tilt (rotation about x), shorten (scale y, like a hiked robe) and
// flatten (scale z, a lap when seated). A hip ellipsoid covers the seam.

export const TORSO_R = 0.28;
export const SKIRT_TOP = 1.22;
export const SKIRT_TOP_R = TORSO_R * 1.02;
export const SKIRT_BOTTOM_R = TORSO_R * 1.5;
export const HIP_Y = 0.72;
export const LEG_X = 0.12;
export const LEG_R = 0.1;
export const LEG_LEN = 0.42;
// Sandal box, centered below the leg pivot: [width, height, length], center y and z.
export const SANDAL_SIZE = [0.17, 0.07, 0.3];
export const SANDAL_Y = -(LEG_LEN + LEG_R * 2) + 0.03;
export const SANDAL_Z = 0.05;

// Seated pose: the lap flattens to this depth and the robe ends before the sandals.
export const SIT_DEPTH = 0.32;
export const SIT_MAX_LEN = 0.52;
// How far the body drops when seated, so the lap and hips rest on the ground.
export const SIT_DROP = HIP_Y - SKIRT_BOTTOM_R * SIT_DEPTH;
// Hip ellipsoid half-height when standing and when seated.
export const HIP_RY = [0.2, 0.125];
// The lower skirt starts this far above the hip pivot (hidden inside the upper
// skirt when standing) so tilting it never opens a gap at the seam.
export const SKIRT_OVERLAP = 0.1;
const OVERLAP_SHRINK = 0.98;
// The hip ellipsoid stays a little inside the skirt so their surfaces never flicker.
export const HIP_SHRINK = 0.94;

// How much the lap has flattened for a seated weight: it waits until the legs,
// which settle faster than the body drops, have closed together.
export const lapWeight = (sitW) => Math.min(1, Math.max(0, (sitW - 0.3) / 0.7));
export const hipHalfHeight = (sitW) => HIP_RY[0] + (HIP_RY[1] - HIP_RY[0]) * lapWeight(sitW);

// Skirt radius at body height y for a given hem height.
export function skirtRadius(hem, y) {
  return SKIRT_BOTTOM_R + (SKIRT_TOP_R - SKIRT_BOTTOM_R) * (y - hem) / (SKIRT_TOP - hem);
}

export const hipRadius = (hem) => skirtRadius(hem, HIP_Y);
// Overlap piece radii [top, bottom at the hip pivot], just inside the skirt.
export function overlapRadii(hem) {
  const rP = hipRadius(hem);
  const top = (rP + (SKIRT_BOTTOM_R - rP) * (-SKIRT_OVERLAP / (HIP_Y - hem))) * OVERLAP_SHRINK;
  return [top, rP * OVERLAP_SHRINK];
}

// Sample points on one leg's surface (joint, capsule, sandal) in body coordinates.
// side: -1 left, 1 right; angle: the leg pivot's rotation.x (negative swings forward).
export function legSamplePoints(side, angle) {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  const pts = [];
  const add = (x, y, z) => pts.push([x + side * LEG_X, HIP_Y + y * c - z * s, y * s + z * c]);
  const ring = (y, r) => { for (let a = 0; a < 24; a++) add(r * Math.cos(a * Math.PI / 12), y, r * Math.sin(a * Math.PI / 12)); };
  ring(0, LEG_R * 1.1); // joint sphere equator
  const top = -LEG_R;
  const bottom = -(LEG_LEN + LEG_R);
  for (let i = 0; i <= 20; i++) ring(top + (bottom - top) * i / 20, LEG_R);
  for (let b = 1; b <= 6; b++) {
    const B = b / 6 * Math.PI / 2;
    ring(bottom - LEG_R * Math.sin(B), LEG_R * Math.cos(B));
  }
  const [w, h, l] = SANDAL_SIZE;
  for (let i = 0; i <= 6; i++) for (let j = 0; j <= 4; j++) for (let k = 0; k <= 10; k++) {
    if (i % 6 && j % 4 && k % 10) continue; // surface only
    add(-w / 2 + w * i / 6, SANDAL_Y - h / 2 + h * j / 4, SANDAL_Z - l / 2 + l * k / 10);
  }
  return pts;
}

// How far (max) any point sticks out through the skirt wall; <= 0 means nothing does.
// pose: { tilt, length, depth } for the lower skirt; sitW scales the hip ellipsoid.
export function skirtPenetration(hem, pose, pts, sitW = 0) {
  const L = HIP_Y - hem;
  const rP = hipRadius(hem);
  const ry = hipHalfHeight(sitW);
  const c = Math.cos(-pose.tilt);
  const s = Math.sin(-pose.tilt);
  let worst = -Infinity;
  for (const [x, by, bz] of pts) {
    const dy = by - HIP_Y;
    const ly = (dy * c - bz * s) / pose.length;
    const lz = (dy * s + bz * c) / pose.depth;
    if (ly < -L) continue; // past the open end of the robe: free
    let out = Infinity;
    const r = rP + (SKIRT_BOTTOM_R - rP) * (-ly / L);
    if (ly <= 0) out = Math.min(out, Math.hypot(x, lz) - r);
    else if (ly <= SKIRT_OVERLAP) out = Math.min(out, Math.hypot(x, lz) - r * OVERLAP_SHRINK);
    if (by >= HIP_Y && by <= SKIRT_TOP) out = Math.min(out, Math.hypot(x, bz) - skirtRadius(hem, by));
    const e = Math.hypot(x / (rP * HIP_SHRINK), dy / ry, bz / (rP * HIP_SHRINK));
    if (e <= 1) out = Math.min(out, 0);
    worst = Math.max(worst, out);
  }
  return worst;
}

const both = (spread) => [...legSamplePoints(1, -spread), ...legSamplePoints(-1, spread)];

const SPREAD_STEP = 0.04;
const SPREAD_MAX = 1.6;
const fitTables = new Map();

// For a hem, the longest lower-skirt length scale that fits two legs spread
// symmetrically by +-spread around the skirt axis, on a spread grid.
export function fitTable(hem) {
  const table = [];
  for (let i = 0; i * SPREAD_STEP <= SPREAD_MAX + 1e-9; i++) {
    const pts = both(i * SPREAD_STEP);
    const fits = (length) => skirtPenetration(hem, { tilt: 0, length, depth: 1 }, pts) <= 0;
    let lo = 0;
    let hi = 1;
    if (fits(1)) lo = 1;
    else for (let k = 0; k < 14; k++) { const m = (lo + hi) / 2; if (fits(m)) lo = m; else hi = m; }
    table.push(Math.min(lo, table.at(-1) ?? 1));
  }
  return table;
}

// Tables for the hems the people actually use (women 0.1, men 0.3), precomputed
// with fitTable and floored to FIT_DECIMALS so they stay conservative; this keeps
// the brute-force sampler off the first-frame path. Regenerate if the skirt
// geometry changes (tests/skirt-fit.test.js fails when they drift).
export const FIT_DECIMALS = 4;
export const FIT_TABLE_CONSTANTS = new Map([
  [0.1, [1, 1, 1, 1, 1, 1, 1, 0.8968, 0.7674, 0.7241, 0.6988, 0.6724, 0.645, 0.6165, 0.587, 0.5566, 0.5253, 0.4931, 0.4602, 0.4265, 0.3922, 0.3572, 0.3217, 0.2856, 0.249, 0.2121, 0.1749, 0.1373, 0.0996, 0.0617, 0.0236, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]],
  [0.3, [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0.9926, 0.9521, 0.91, 0.8666, 0.8217, 0.7755, 0.728, 0.6794, 0.6297, 0.579, 0.5274, 0.4749, 0.4216, 0.3677, 0.3132, 0.2582, 0.2028, 0.147, 0.0911, 0.0349, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]],
]);
const tableFor = (hem) => {
  let t = FIT_TABLE_CONSTANTS.get(hem) ?? fitTables.get(hem);
  if (!t) { t = fitTable(hem); fitTables.set(hem, t); } // unknown hem: compute once
  return t;
};

// Widest walking leg swing (radians each way) that stays inside the full skirt.
export function maxSwing(hem) {
  const t = tableFor(hem);
  let i = 0;
  while (i + 1 < t.length && t[i + 1] >= 1) i++;
  return i * SPREAD_STEP;
}

// Lower-skirt pose for the current leg angles: it tilts with the legs' mean,
// shortens when they spread apart (a kick), and becomes a lap when seated.
export function skirtPose(hem, legL, legR, sitW = 0) {
  const t = tableFor(hem);
  const spread = Math.abs(legL - legR) / 2;
  const i = Math.min(t.length - 1, Math.ceil(spread / SPREAD_STEP - 1e-9)); // round up: conservative
  const L = HIP_Y - hem;
  const sitLen = Math.min(1, SIT_MAX_LEN / L);
  return {
    tilt: (legL + legR) / 2,
    length: Math.max(0.05, Math.min(t[i], 1 + (sitLen - 1) * sitW)),
    depth: 1 + (SIT_DEPTH - 1) * lapWeight(sitW),
  };
}
