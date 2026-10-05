import * as THREE from 'three';

const MOODS = {
  day: 0x9fd3f0,
  gray: 0xa9b0b6,
  storm: 0x56606b,
  clear: 0xbfe6ff,
  night: 0x10233f,
};

export function setSky(scene, mood) {
  const color = new THREE.Color(MOODS[mood]);
  scene.background = color;
  scene.fog = new THREE.Fog(color, 45, 140);
}

// Puffy clouds drifting slowly to the right.
export function createClouds(count, dark = false, { spread = 60, y = 14, z = -30 } = {}) {
  const group = new THREE.Group();
  const material = new THREE.MeshStandardMaterial({
    color: dark ? 0x6b737c : 0xffffff, emissive: dark ? 0x1a1d21 : 0x8a8f96, roughness: 1, flatShading: true,
  });
  const puff = new THREE.IcosahedronGeometry(1, 1);
  for (let i = 0; i < count; i++) {
    const cloud = new THREE.Group();
    const n = 4 + (i % 3);
    for (let k = 0; k < n; k++) {
      const p = new THREE.Mesh(puff, material);
      const s = 1.4 + ((i * 7 + k * 3) % 5) * 0.35;
      p.scale.set(s, s * 0.75, s);
      p.position.set((k - n / 2) * 1.6, ((k * 5) % 3) * 0.35, ((k * 3) % 2) * 0.8);
      cloud.add(p);
    }
    cloud.position.set(-spread / 2 + (i + 0.5) * (spread / count), y + (i % 3) * 1.5, z - (i % 2) * 6);
    group.add(cloud);
  }
  return {
    group,
    update(dt) {
      for (const c of group.children) {
        c.position.x += dt * 0.6;
        if (c.position.x > spread / 2 + 6) c.position.x = -spread / 2 - 6;
      }
    },
  };
}

// Falling rain streaks inside a box around the camera's view.
export function createRain({ count = 2500, width = 60, height = 30, depth = 30, center = new THREE.Vector3(0, 0, 0) } = {}) {
  const positions = new Float32Array(count * 6);
  const drops = [];
  for (let i = 0; i < count; i++) {
    drops.push({
      x: center.x + (Math.random() - 0.5) * width,
      y: center.y + Math.random() * height,
      z: center.z + (Math.random() - 0.5) * depth,
      v: 18 + Math.random() * 8,
    });
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const lines = new THREE.LineSegments(
    geometry,
    new THREE.LineBasicMaterial({ color: 0xcfe3f5, transparent: true, opacity: 0.7 })
  );
  lines.frustumCulled = false;
  let intensity = 0;

  function write() {
    const visible = Math.floor(count * intensity);
    for (let i = 0; i < visible; i++) {
      const d = drops[i];
      positions.set([d.x, d.y, d.z, d.x - 0.08, d.y + 0.6, d.z], i * 6);
    }
    geometry.setDrawRange(0, visible * 2);
    geometry.attributes.position.needsUpdate = true;
  }

  return {
    group: lines,
    setIntensity(v) { intensity = Math.max(0, Math.min(1, v)); },
    update(dt) {
      const visible = Math.floor(count * intensity);
      for (let i = 0; i < visible; i++) {
        const d = drops[i];
        d.y -= d.v * dt;
        if (d.y < center.y - 2) d.y += height;
      }
      write();
    },
  };
}

// Seven bands, red outermost, revealed left to right.
export function createRainbow({ radius = 22, band = 0.7 } = {}) {
  const colors = [0xe8453c, 0xf39237, 0xf5d547, 0x5cbf4f, 0x3f8fd6, 0x4b4fb5, 0x8a4fb5];
  const group = new THREE.Group();
  const bands = colors.map((color, i) => {
    const m = new THREE.Mesh(
      new THREE.BufferGeometry(),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.8, depthWrite: false, fog: false })
    );
    m.userData.r = radius - i * band;
    group.add(m);
    return m;
  });
  let shown = -1;
  return {
    group,
    setProgress(p) {
      p = Math.max(0, Math.min(1, p));
      if (Math.abs(p - shown) < 0.004) return;
      shown = p;
      const arc = Math.max(0.0001, Math.PI * p);
      for (const m of bands) {
        m.geometry.dispose();
        m.geometry = new THREE.TorusGeometry(m.userData.r, band / 2, 6, 64, arc);
        m.rotation.z = Math.PI - arc; // the arc grows from the left end toward the right
        m.visible = p > 0;
      }
    },
  };
}

// Warm light from the sky (God is never shown as a figure).
export function createGodLight({ height = 16, radius = 2.2 } = {}) {
  const group = new THREE.Group();
  const beamMat = new THREE.MeshBasicMaterial({
    color: 0xfff0b0, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false,
  });
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.35, radius, height, 32, 1, true), beamMat);
  beam.position.y = height / 2;
  group.add(beam);
  const glowMat = new THREE.MeshBasicMaterial({ color: 0xfff4c4, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, fog: false });
  const glow = new THREE.Mesh(new THREE.CircleGeometry(radius * 1.1, 32), glowMat);
  glow.rotation.x = -Math.PI / 2;
  glow.position.y = 0.03;
  group.add(glow);
  const light = new THREE.PointLight(0xffe6a0, 0, 12, 1.5);
  light.position.y = 3;
  group.add(light);
  return {
    group,
    setIntensity(v) {
      beamMat.opacity = 0.32 * v;
      glowMat.opacity = 0.45 * v;
      light.intensity = 6 * v;
      group.visible = v > 0.001;
    },
  };
}
