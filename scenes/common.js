import * as THREE from 'three';
import { createGround, createHills } from '../world/terrain.js';
import { createClouds, setSky } from '../world/sky.js';
import { separate } from '../systems/solid.js';

// Frees every geometry/material under `root` except the shared character cache.
export function disposeTree(root) {
  root.traverse((o) => {
    if (o.geometry && !o.geometry.userData.shared) o.geometry.dispose();
    const mats = Array.isArray(o.material) ? o.material : o.material ? [o.material] : [];
    for (const m of mats) if (!m.userData.shared) m.dispose();
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
