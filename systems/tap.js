import * as THREE from 'three';

const GLOW_COLOR = new THREE.Color(0xfff0c8);
const PULSE_PERIOD = 1.6;
const GLOW = 0.2;
const HINT_GLOW = 0.4;
const HINT_AFTER = 6; // seconds without a tap before the glow gets stronger

// The tappable object for a list of raycast hits (nearest first). A real mesh
// wins over an invisible tap proxy (userData.tapProxy), even one in front of it,
// so a food's enlarged target never steals a tap aimed at an animal behind it.
function pickTarget(hits) {
  const owner = (hit) => {
    let o = hit.object;
    while (o && !o.userData.tapId) o = o.parent;
    return o;
  };
  for (const hit of hits) {
    if (hit.object.userData.tapProxy) continue;
    const o = owner(hit);
    if (o) return o;
  }
  for (const hit of hits) {
    const o = owner(hit);
    if (o) return o;
  }
  return null;
}

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
    const target = pickTarget(raycaster.intersectObjects([...marked.keys()], true));
    if (target) onTap(target.userData.tapId);
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

    // Screen position (client px) of a marked object's center, for dev tooling.
    // Tries a few points on the object and returns the first one a tap there would hit.
    screenPoint(id) {
      const rect = dom.getBoundingClientRect();
      for (const obj of marked.keys()) {
        if (obj.userData.tapId !== id) continue;
        const box = new THREE.Box3().setFromObject(obj);
        const origin = obj.getWorldPosition(new THREE.Vector3());
        const candidates = [box.getCenter(new THREE.Vector3())];
        for (const up of [0.3, 0.6, 1, 1.5]) candidates.push(origin.clone().setY(origin.y + up));
        for (const c of candidates) {
          const ndc = c.clone().project(camera);
          raycaster.setFromCamera(new THREE.Vector2(ndc.x, ndc.y), camera);
          const o = pickTarget(raycaster.intersectObjects([...marked.keys()], true));
          if (o === obj) return { x: rect.left + ((ndc.x + 1) / 2) * rect.width, y: rect.top + ((1 - ndc.y) / 2) * rect.height };
        }
      }
      return null;
    },

    // Ids currently tappable.
    ids() {
      return [...marked.keys()].map((o) => o.userData.tapId);
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
