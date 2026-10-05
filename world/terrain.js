import * as THREE from 'three';

export function createGround({ radius = 40, color = 0x6cc24a } = {}) {
  const ground = new THREE.Mesh(
    new THREE.CircleGeometry(radius, 48),
    new THREE.MeshStandardMaterial({ color, roughness: 0.95 })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  return ground;
}

// Rolling green hills in the background.
export function createHills({ color = 0x5cae42, z = -22 } = {}) {
  const group = new THREE.Group();
  const material = new THREE.MeshStandardMaterial({ color, roughness: 1 });
  const hills = [[-18, 9, 3.5], [-6, 12, 4.5], [8, 10, 3.8], [20, 11, 4.2]];
  for (const [x, r, h] of hills) {
    const hill = new THREE.Mesh(new THREE.SphereGeometry(r, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), material);
    hill.scale.y = h / r;
    hill.position.set(x, 0, z);
    hill.receiveShadow = true;
    group.add(hill);
  }
  return group;
}

// The mountains of Ararat: one central peak where the ark rests, two smaller ones.
export function createArarat() {
  const group = new THREE.Group();
  const rock = new THREE.MeshStandardMaterial({ color: 0x8a7a66, roughness: 1, flatShading: true });
  const snow = new THREE.MeshStandardMaterial({ color: 0xf4f4f4, roughness: 0.9, flatShading: true });
  const peaks = [[0, 0, 12, 7], [-14, -4, 9, 5], [13, -5, 10, 5.5]];
  for (const [x, z, r, h] of peaks) {
    const peak = new THREE.Mesh(new THREE.ConeGeometry(r, h, 9, 1), rock);
    peak.position.set(x, h / 2, z);
    peak.castShadow = peak.receiveShadow = true;
    group.add(peak);
    if (x !== 0) {
      const cap = new THREE.Mesh(new THREE.ConeGeometry(r * 0.25, h * 0.25, 9, 1), snow);
      cap.position.set(x, h - h * 0.125 + 0.02, z);
      group.add(cap);
    }
  }
  // Flattened top of the central peak where the ark sits.
  group.userData.restY = 7 * 0.82;
  group.children[0].scale.y = 0.82;
  group.children[0].position.y = (7 * 0.82) / 2;
  return group;
}

// A wide water surface with gentle waves; `setLevel` moves it up and down.
export function createWater({ size = 220, color = 0x3f8fd6 } = {}) {
  const geometry = new THREE.PlaneGeometry(size, size, 64, 64);
  geometry.rotateX(-Math.PI / 2);
  const base = geometry.attributes.position.array.slice();
  const mesh = new THREE.Mesh(
    geometry,
    new THREE.MeshStandardMaterial({ color, roughness: 0.35, metalness: 0.05, transparent: true, opacity: 0.92, flatShading: true })
  );
  mesh.receiveShadow = true;
  let time = 0;
  return {
    mesh,
    setLevel(y) { mesh.position.y = y; },
    update(dt) {
      time += dt;
      const pos = geometry.attributes.position.array;
      for (let i = 0; i < pos.length; i += 3) {
        const x = base[i];
        const z = base[i + 2];
        pos[i + 1] = Math.sin(x * 0.35 + time * 1.2) * 0.12 + Math.cos(z * 0.3 + time * 0.9) * 0.1;
      }
      geometry.attributes.position.needsUpdate = true;
      geometry.computeVertexNormals();
    },
    // Height of the wave surface at a point (for floating objects).
    heightAt(x, z) {
      return mesh.position.y + Math.sin(x * 0.35 + time * 1.2) * 0.12 + Math.cos(z * 0.3 + time * 0.9) * 0.1;
    },
  };
}
