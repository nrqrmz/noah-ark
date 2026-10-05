import * as THREE from 'three';
import { createBlueprintState, PARTS } from './state/blueprint.js';
import { disposeTree } from './common.js';
import { createBlueprint } from '../world/ark.js';
import { setSky } from '../world/sky.js';

const LENGTH = 14;

// Scene 3: the ark's instructions drawn in light; Noah studies each part.
export default function createScene(ctx) {
  const state = createBlueprintState();
  let blueprint;
  let stars;
  let glowT = -1;
  let t = 0;

  function buildStars() {
    const positions = [];
    for (let i = 0; i < 400; i++) {
      positions.push((Math.random() - 0.5) * 120, Math.random() * 50 - 8, -30 - Math.random() * 30);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    stars = new THREE.Points(g, new THREE.PointsMaterial({ color: 0xffffff, size: 0.18, transparent: true, opacity: 0.8, fog: false }));
    ctx.root.add(stars);
  }

  return {
    build() {
      setSky(ctx.world, 'night');
      ctx.world.fog = null;
      buildStars();
      blueprint = createBlueprint({ length: LENGTH });
      ctx.root.add(blueprint.root);
      for (const part of PARTS) ctx.tap.mark(blueprint.points[part], part);
      ctx.frame({ cx: 0.6, cy: 0.5, cz: 0, w: LENGTH + 3.5, h: 4.5, portrait: { w: LENGTH + 2.5, h: 6 } });
    },

    update(dt) {
      t += dt;
      for (const ev of state.tick(dt)) if (ev === 'glow') glowT = 0;
      // Unrevealed points pulse gently so they read as "tap me".
      for (const part of PARTS) {
        const p = blueprint.points[part];
        if (p.visible) p.scale.setScalar(1 + Math.sin(t * 3 + part.length) * 0.12);
      }
      if (glowT >= 0) {
        glowT += dt;
        blueprint.setGlow(Math.min(1, glowT / 1.2));
      }
      stars.material.opacity = 0.65 + Math.sin(t * 0.8) * 0.15;
    },

    onTap(id) {
      if (!state.tap(id)) return;
      ctx.tap.unmark(blueprint.points[id]);
      blueprint.reveal(id);
    },
    isLocked: () => state.locked,
    isDone: () => state.done,
    dispose() { disposeTree(ctx.root); },
  };
}
