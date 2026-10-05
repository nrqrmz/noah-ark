import * as THREE from 'three';

const GLOW_COLOR = new THREE.Color(0xffd27a);
const PULSE_PERIOD = 1.6;
const GLOW = 0.25;
const HINT_GLOW = 0.5;
const HINT_AFTER = 6; // seconds without a tap before the glow gets stronger

// Tap input and the soft glow on tappable objects.
export function createTapSystem({ camera, dom, onTap }) {
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  const marked = new Map(); // object -> meshes with cloned materials
  let time = 0;
  let idle = 0;
  let locked = false;

  function onPointerDown(e) {
    idle = 0;
    if (locked || !marked.size) return;
    const rect = dom.getBoundingClientRect();
    pointer.set(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      -((e.clientY - rect.top) / rect.height) * 2 + 1
    );
    raycaster.setFromCamera(pointer, camera);
    for (const hit of raycaster.intersectObjects([...marked.keys()], true)) {
      for (let o = hit.object; o; o = o.parent) {
        if (o.userData.tapId) {
          onTap(o.userData.tapId);
          return;
        }
      }
    }
  }
  dom.addEventListener('pointerdown', onPointerDown);

  function setGlow(meshes, amount) {
    for (const m of meshes) {
      if (!m.material.emissive) continue;
      m.material.emissive.copy(m.userData.tapEmissive).lerp(GLOW_COLOR, amount);
    }
  }

  return {
    mark(obj, id) {
      if (marked.has(obj)) this.unmark(obj);
      obj.userData.tapId = id;
      const meshes = [];
      obj.traverse((m) => {
        if (!m.isMesh || Array.isArray(m.material)) return;
        m.userData.tapOriginal = m.material;
        m.material = m.material.clone();
        m.userData.tapEmissive = m.material.emissive ? m.material.emissive.clone() : null;
        meshes.push(m);
      });
      marked.set(obj, meshes);
    },

    unmark(obj) {
      const meshes = marked.get(obj);
      if (!meshes) return;
      for (const m of meshes) {
        m.material.dispose();
        m.material = m.userData.tapOriginal;
        delete m.userData.tapOriginal;
        delete m.userData.tapEmissive;
      }
      delete obj.userData.tapId;
      marked.delete(obj);
    },

    update(dt, isLocked) {
      locked = isLocked;
      time += dt;
      idle += dt;
      const base = idle > HINT_AFTER ? HINT_GLOW : GLOW;
      const pulse = 0.5 + 0.5 * Math.sin((time / PULSE_PERIOD) * Math.PI * 2);
      const amount = locked ? 0 : base * pulse;
      for (const meshes of marked.values()) setGlow(meshes, amount);
    },

    // Unmarks everything (called between scenes).
    clear() {
      for (const obj of [...marked.keys()]) this.unmark(obj);
      idle = 0;
    },

    dispose() {
      this.clear();
      dom.removeEventListener('pointerdown', onPointerDown);
    },
  };
}
