import * as THREE from 'three';
import { geo } from '../rig.js';
import { markings } from './markings.js';

// Painted coats: markings are drawn flat into a canvas texture that follows the body,
// instead of bumps glued onto it.

const SIZE = 256;

// Tiny deterministic hash -> [0, 1), so every blob keeps the same outline across builds.
function noise(seed, i, k) {
  let h = Math.imul(seed * 374761393 + i * 668265263 + k * 2147483647, 1274126177) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 1103515245) >>> 0;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

const hex = (c) => `#${c.toString(16).padStart(6, '0')}`;

// A closed, soft-cornered blob: an irregular polygon smoothed through its edge midpoints.
// Giraffe patches get few corners (polygonal look), cow spots get many (round, wavy).
function blob(g, x, y, r, corners, jitter, seed, i) {
  const turn = noise(seed, i, 99) * Math.PI * 2;
  const pts = Array.from({ length: corners }, (_, k) => {
    const a = turn + ((k + (noise(seed, i, k) - 0.5) * 0.5) / corners) * Math.PI * 2;
    const rr = r * (1 - jitter + jitter * 2 * noise(seed, i, k + 50));
    return [x + Math.cos(a) * rr, y + Math.sin(a) * rr];
  });
  const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  g.beginPath();
  const start = mid(pts[corners - 1], pts[0]);
  g.moveTo(...start);
  for (let k = 0; k < corners; k++) {
    const m = mid(pts[k], pts[(k + 1) % corners]);
    g.quadraticCurveTo(pts[k][0], pts[k][1], m[0], m[1]);
  }
  g.closePath();
  g.fill();
}

// A wavy band around the part at height v. The wave has a whole number of periods around u,
// so it meets itself at the seam; it is thinner near u = 0/1 (belly on the body).
// `pinch` (0-1) narrows it further there: at 1 both sides end in a point under the belly,
// so the band reads as a stripe down each flank instead of a hoop around the part.
// `slant` sweeps the band's top toward v = 0 (the rump on the body), more for bands
// near that end, so the hindquarter stripes lean back like a zebra's.
function band(g, { v, width, wobble, phase }, { pinch = 0, slant = 0 } = {}) {
  const steps = 64;
  const lean = slant * (1 - v) ** 2;
  const edge = (side) => Array.from({ length: steps + 1 }, (_, k) => {
    const u = k / steps;
    const round = 0.5 - 0.5 * Math.cos(u * Math.PI * 2); // 0 at the seam, 1 opposite it
    const taper = (0.55 + 0.45 * round) * (1 - pinch) + Math.sqrt(round) * pinch;
    const center = v + wobble * Math.sin(u * Math.PI * 4 + phase) - lean * round;
    return [u * SIZE, (1 - (center + side * taper * width / 2)) * SIZE];
  });
  const top = edge(1);
  const bottom = edge(-1).reverse();
  g.beginPath();
  g.moveTo(...top[0]);
  for (const p of [...top.slice(1), ...bottom]) g.lineTo(...p);
  g.closePath();
  g.fill();
}

// One material per call (not shared), so disposeTree frees it and its texture.
export function coatMaterial({ base, mark, kind, seed = 1, count, repeat = [1, 1], pinch = 0, slant = 0, bareEnds = 0 }) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = SIZE;
  const g = canvas.getContext('2d');
  g.fillStyle = hex(base);
  g.fillRect(0, 0, SIZE, SIZE);
  g.fillStyle = hex(mark);

  const shapes = markings(kind, { seed, count });
  if (kind === 'stripes') {
    // `bareEnds` leaves the tips of the part plain: a band there would be a small
    // ring (a bullseye) on the capsule's end cap.
    for (const s of shapes) if (s.v > bareEnds && s.v < 1 - bareEnds) band(g, s, { pinch, slant });
  } else {
    const [corners, jitter] = kind === 'patches' ? [6, 0.18] : [10, 0.22];
    shapes.forEach((s, i) => {
      const r = s.r * SIZE * (1 + jitter);
      const x = s.u * SIZE;
      const y = (1 - s.v) * SIZE;
      // Shapes crossing the seam (or the tile edge, when repeated along v) are painted
      // on both sides of it.
      for (const dx of [-SIZE, 0, SIZE]) {
        for (const dy of [-SIZE, 0, SIZE]) {
          const inside = x + dx + r >= 0 && x + dx - r <= SIZE && y + dy + r >= 0 && y + dy - r <= SIZE;
          if (inside) blob(g, x + dx, y + dy, s.r * SIZE, corners, jitter, seed, i);
        }
      }
    });
  }

  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.wrapS = map.wrapT = THREE.RepeatWrapping;
  map.repeat.set(...repeat);
  map.anisotropy = 4;
  return new THREE.MeshStandardMaterial({ map, roughness: 0.7 });
}

// A capsule whose v coordinate follows arc length along its profile (three's capsule spends
// almost all of v on the end caps, which would squash markings onto the ends).
export function coatCapsule(r, len) {
  return geo(`coat-c${r}:${len}`, () => {
    const g = new THREE.CapsuleGeometry(r, len, 6, 16);
    const pos = g.attributes.position;
    const uv = g.attributes.uv;
    const total = Math.PI * r + len;
    const clamp = (x) => Math.min(1, Math.max(-1, x));
    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i);
      let s;
      if (y < -len / 2) s = r * Math.acos(clamp((-len / 2 - y) / r));
      else if (y > len / 2) s = r * Math.PI / 2 + len + r * Math.asin(clamp((y - len / 2) / r));
      else s = r * Math.PI / 2 + (y + len / 2);
      uv.setY(i, s / total);
    }
    uv.needsUpdate = true;
    return g;
  });
}

// Integer repeat along a capsule so markings stay roughly round on long thin parts.
export function capsuleRepeat(r, len, girth = 1) {
  return [1, Math.max(1, Math.round((Math.PI * r + len) / (2 * Math.PI * r * girth)))];
}
