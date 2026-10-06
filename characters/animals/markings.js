// Pure coat-marking generator in UV space [0,1]^2 (u wraps around the part, v runs along it).
// No three.js, no DOM: the coat material paints these shapes onto a canvas texture.

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const BLOB_RADIUS = { patches: [0.05, 0.08], spots: [0.12, 0.18] };
const GAP = 0.01;

function uvDist(a, b) {
  let du = Math.abs(a.u - b.u);
  du = Math.min(du, 1 - du);
  return Math.hypot(du, a.v - b.v);
}

// Dart throwing: largest radii first, shrinking toward the minimum when a dart keeps missing;
// restarts with the next PRNG draws if a run cannot place every blob.
function blobs(kind, rand, count) {
  const [rMin, rMax] = BLOB_RADIUS[kind];
  for (let run = 0; run < 200; run++) {
    const radii = Array.from({ length: count }, () => rMin + (rMax - rMin) * rand() * rand())
      .sort((a, b) => b - a);
    const placed = [];
    for (const wanted of radii) {
      let ok = false;
      for (let attempt = 0; attempt < 300 && !ok; attempt++) {
        const r = Math.max(rMin, wanted - (wanted - rMin) * (attempt / 300));
        if (1 - 2 * r <= 0) continue;
        const s = { u: rand(), v: r + rand() * (1 - 2 * r), r };
        if (placed.every((o) => uvDist(s, o) >= s.r + o.r + GAP)) {
          placed.push(s);
          ok = true;
        }
      }
      if (!ok) break;
    }
    if (placed.length === count) return placed;
  }
  throw new Error(`markings: cannot fit ${count} ${kind}`);
}

// Evenly spaced bands; width is 0.4-0.6 of its slot and the wobble is small enough
// that neighbouring bands never touch, even at the extremes of their waves.
function stripes(rand, count) {
  const slot = 1 / count;
  return Array.from({ length: count }, (_, i) => ({
    v: (i + 0.5) * slot,
    width: slot * (0.4 + 0.2 * rand()),
    wobble: slot * (0.03 + 0.05 * rand()),
    phase: rand() * Math.PI * 2,
  }));
}

export function markings(kind, { seed = 1, count } = {}) {
  const rand = mulberry32(seed);
  if (kind === 'patches' || kind === 'spots') return blobs(kind, rand, count);
  if (kind === 'stripes') return stripes(rand, count);
  throw new Error(`markings: unknown kind "${kind}"`);
}
