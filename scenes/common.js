import * as THREE from 'three';
import { createGround, createHills } from '../world/terrain.js';
import { createClouds, setSky } from '../world/sky.js';
import { separate, queueClear } from '../systems/solid.js';

// Frees every geometry/material (and its texture) under `root` except the shared character cache.
export function disposeTree(root) {
  root.traverse((o) => {
    if (o.geometry && !o.geometry.userData.shared) o.geometry.dispose();
    const mats = Array.isArray(o.material) ? o.material : o.material ? [o.material] : [];
    for (const m of mats) {
      if (m.userData.shared) continue;
      m.map?.dispose(); // painted coats own their canvas texture
      m.dispose();
    }
  });
}

// Ground, background hills, and drifting clouds for an outdoor scene.
export function createLandscape(ctx, { mood = 'day', clouds = 5, darkClouds = false, hills = true, ground = 0x6cc24a } = {}) {
  setSky(ctx.world, mood);
  ctx.root.add(createGround({ color: ground }));
  if (hills) ctx.root.add(createHills());
  const sky = createClouds(clouds, darkClouds);
  ctx.root.add(sky.group);
  return { update: (dt) => sky.update(dt) };
}

// Moves a ground position toward a target at `speed`; returns true on arrival.
export function stepToward(pos, target, speed, dt) {
  const dx = target.x - pos.x;
  const dz = target.z - pos.z;
  const d = Math.hypot(dx, dz);
  const step = speed * dt;
  if (d <= step) {
    pos.x = target.x;
    pos.z = target.z;
    return true;
  }
  pos.x += (dx / d) * step;
  pos.z += (dz / d) * step;
  return false;
}

export const v3 = (x, y, z) => new THREE.Vector3(x, y, z);

// Solidity for characters (people or animals): pushes overlapping ones apart
// and out of fixed obstacles, writing the result back to their root positions.
export function keepApart(characters, obstacles = []) {
  const bodies = characters.map((c) => ({ x: c.root.position.x, z: c.root.position.z, r: c.radius }));
  separate(bodies, obstacles);
  bodies.forEach((b, i) => {
    characters[i].root.position.x = b.x;
    characters[i].root.position.z = b.z;
  });
}

// Boarding path up an ark's ramp. `rampFoot` and `doorPoint` are world positions.
export function createBoarding(rampFoot, doorPoint) {
  // Height of the ramp surface at depth z (0 at its foot, door height at the doorway).
  const rampHeight = (z) => {
    const u = (rampFoot.z - z) / (rampFoot.z - doorPoint.z);
    return Math.max(0, Math.min(1, u)) * doorPoint.y;
  };
  return {
    height: rampHeight,
    // Waypoints: in front of the ramp, its foot, the doorway, inside.
    path: () => [
      rampFoot.clone().add(new THREE.Vector3(0, 0, 1.2)),
      rampFoot.clone(),
      doorPoint.clone(),
      doorPoint.clone().add(new THREE.Vector3(0, 0, -1.2)),
    ],
    // Advances `walker` ({ root, radius, walk: { delay, points } }) along its path,
    // single file behind `ahead` (the walker in front, if any).
    // Returns 'waiting' | 'queued' | 'ground' | 'ramp' | 'inside'.
    step(walker, speed, dt, { flying = false, ahead = null } = {}) {
      const w = walker.walk;
      if (w.delay > 0) {
        w.delay -= dt;
        return 'waiting';
      }
      if (!w.points.length) {
        walker.root.visible = false;
        return 'inside';
      }
      const pos = walker.root.position;
      const target = w.points[0];
      const front = ahead && ahead.root.visible && ahead.walk.delay <= 0 ? ahead : null;
      if (!flying && front && !queueClear(circle(walker), circle(front))) return 'queued';
      // On the ground, "close enough" counts as arrived: two big characters heading
      // for the same spot would otherwise push each other forever.
      const onGround = w.points.length >= 3;
      const tolerance = onGround ? Math.max(0.5, walker.radius * 0.6) : 0;
      const near = Math.hypot(target.x - pos.x, target.z - pos.z) <= tolerance;
      const arrived = near || stepToward(pos, target, speed, dt);
      if (Math.hypot(target.x - pos.x, target.z - pos.z) > 1e-3) {
        walker.root.rotation.y = Math.atan2(target.x - pos.x, target.z - pos.z);
      }
      pos.y = flying ? 0.8 : rampHeight(pos.z);
      if (arrived) w.points.shift();
      return onGround ? 'ground' : 'ramp';
    },
  };
}

// Ground circle of a character, for solidity.
export function circle(c) {
  return { x: c.root.position.x, z: c.root.position.z, r: c.radius };
}
