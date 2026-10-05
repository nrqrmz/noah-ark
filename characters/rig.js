import * as THREE from 'three';

// Shared, cached resources for every character. Characters never dispose them:
// the palette is small and reused across scenes.
const materials = new Map();
const geometries = new Map();

export function mat(hex, { basic = false, roughness = 0.7 } = {}) {
  const key = `${hex}:${basic}:${roughness}`;
  if (!materials.has(key)) {
    const m = basic
      ? new THREE.MeshBasicMaterial({ color: hex })
      : new THREE.MeshStandardMaterial({ color: hex, roughness });
    m.userData.shared = true; // scenes must not dispose cached resources
    materials.set(key, m);
  }
  return materials.get(key);
}

export function geo(key, make) {
  if (!geometries.has(key)) {
    const g = make();
    g.userData.shared = true;
    geometries.set(key, g);
  }
  return geometries.get(key);
}

export const sphere = (r, w = 16, h = 12) => geo(`s${r}:${w}:${h}`, () => new THREE.SphereGeometry(r, w, h));
export const capsule = (r, len) => geo(`c${r}:${len}`, () => new THREE.CapsuleGeometry(r, len, 6, 12));

export function mesh(geometry, material, parent, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(geometry, material);
  m.position.set(x, y, z);
  m.castShadow = true;
  parent.add(m);
  return m;
}

// Distance from a limb's pivot to the far end of its capsule.
export const limbEnd = (radius, length) => length + radius * 2;

// A limb hanging from a pivot, with a joint sphere covering the pivot so no gap
// shows while it rotates. The pivot must sit INSIDE the parent body's volume.
// `geometry` replaces the limb capsule (same size) and `jointMaterial` the joint's material.
export function addLimb(parent, { x, y, z = 0, radius, length, material, jointRadius = radius * 1.1, geometry, jointMaterial }) {
  const pivot = new THREE.Group();
  pivot.position.set(x, y, z);
  parent.add(pivot);
  mesh(sphere(jointRadius), jointMaterial ?? material, pivot);
  mesh(geometry ?? capsule(radius, length), material, pivot, 0, -(length / 2 + radius), 0);
  return pivot;
}

// Smoothly moves an angle toward a target (frame-rate independent).
export function approach(current, target, dt, speed = 10) {
  return current + (target - current) * (1 - Math.exp(-speed * dt));
}
