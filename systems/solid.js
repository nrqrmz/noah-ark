// Solidity on the ground plane: every character is a circle {x, z, r}.
// Pure module: safe to import from node tests.

const GOLDEN_ANGLE = 2.399963;

// Direction used when two centers coincide; deterministic per pair.
function fallbackDir(i, j) {
  const a = (i * 7 + j) * GOLDEN_ANGLE;
  return { x: Math.cos(a), z: Math.sin(a) };
}

// Pushes overlapping bodies apart (half the overlap each) and pushes bodies
// out of fixed obstacles (the full overlap). Mutates bodies; obstacles never move.
export function separate(bodies, obstacles = [], iterations = 4) {
  for (let it = 0; it < iterations; it++) {
    for (let i = 0; i < bodies.length; i++) {
      for (let j = i + 1; j < bodies.length; j++) {
        const a = bodies[i];
        const b = bodies[j];
        let dx = b.x - a.x;
        let dz = b.z - a.z;
        let d = Math.hypot(dx, dz);
        const min = a.r + b.r;
        if (d >= min) continue;
        if (d < 1e-9) {
          ({ x: dx, z: dz } = fallbackDir(i, j));
          d = 1;
        }
        const push = (min - Math.hypot(b.x - a.x, b.z - a.z)) / 2;
        const nx = dx / d;
        const nz = dz / d;
        a.x -= nx * push; a.z -= nz * push;
        b.x += nx * push; b.z += nz * push;
      }
    }
    for (const body of bodies) {
      for (let k = 0; k < obstacles.length; k++) {
        const o = obstacles[k];
        let dx = body.x - o.x;
        let dz = body.z - o.z;
        let d = Math.hypot(dx, dz);
        const min = body.r + o.r;
        if (d >= min) continue;
        if (d < 1e-9) {
          ({ x: dx, z: dz } = fallbackDir(k, 0));
          d = 1;
        }
        body.x = o.x + (dx / d) * min;
        body.z = o.z + (dz / d) * min;
      }
    }
  }
}

// `count` points in a straight line from `start` along `dir`, `spacing` apart.
export function queuePositions(start, dir, count, spacing) {
  const len = Math.hypot(dir.x, dir.z) || 1;
  const ux = dir.x / len;
  const uz = dir.z / len;
  return Array.from({ length: count }, (_, i) => ({
    x: start.x + ux * spacing * i,
    z: start.z + uz * spacing * i,
  }));
}
