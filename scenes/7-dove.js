import * as THREE from 'three';
import { createDoveState, FLIGHT_TIME } from './state/dove.js';
import { disposeTree } from './common.js';
import { createAnimal, updateAnimal } from '../characters/animals/index.js';
import { createArk } from '../world/ark.js';
import { createArarat, createWater } from '../world/terrain.js';
import { createClouds, setSky } from '../world/sky.js';
import { createOliveLeaf } from '../world/props.js';
import { mat, mesh } from '../characters/rig.js';

const LENGTH = 13;
const BIRD_SCALE = 2.2;

// Scene 7: the ark rests on Ararat; Noah sends out the raven, then the dove three times.
export default function createScene(ctx) {
  const state = createDoveState();
  let water;
  let clouds;
  let ark;
  let shutter;
  let windowPos;
  let raven;
  let dove;
  let leaf;
  let flight = null; // { kind, t, bird }
  let level = 4;

  // Position along a flight at u in [0, 1], relative to the window.
  function flightPoint(kind, u, out) {
    const w = windowPos;
    if (kind === 'raven') {
      // Out, to and fro across the sky, then away to the right.
      const a = u * Math.PI * 3;
      out.set(w.x + Math.sin(a) * 5 + u * u * 12, w.y + 1.5 + Math.sin(a * 2) * 1 + u * 2, w.z + 1.5 + (1 - Math.cos(a)) * 0.8);
    } else if (kind === 'dove:gone') {
      // Out and away into the distance; it does not come back.
      out.set(w.x + u * 6, w.y + 1 + u * 5, w.z + 2 - u * 40);
    } else {
      // Out over the water and back to the window.
      const a = u * Math.PI * 2;
      out.set(w.x + Math.sin(a) * 4.5, w.y + 0.5 + Math.sin(u * Math.PI) * 3, w.z + 0.8 + (1 - Math.cos(a)) * 1);
    }
    return out;
  }

  return {
    build() {
      setSky(ctx.world, 'clear');
      const ararat = createArarat();
      ctx.root.add(ararat);
      water = createWater({ color: 0x4a8fca });
      water.setLevel(level);
      ctx.root.add(water.mesh);
      clouds = createClouds(4, false, { y: 16 });
      ctx.root.add(clouds.group);

      ark = createArk({ length: LENGTH });
      ark.root.position.y = ararat.userData.restY - 0.6; // resting on the peak (Genesis 8:4)
      ark.root.rotation.z = 0.03;
      ctx.root.add(ark.root);

      // The window shutter on the cabin, facing the viewer.
      const hullH = LENGTH * 0.2;
      const cabinH = LENGTH * 0.11;
      windowPos = new THREE.Vector3(-1.5, ark.root.position.y + hullH + cabinH * 0.55, ark.width * 0.39 + 0.08);
      shutter = new THREE.Group();
      shutter.position.copy(windowPos).add(new THREE.Vector3(-0.55, 0, 0));
      ctx.root.add(shutter);
      mesh(new THREE.BoxGeometry(1.1, 0.75, 0.1), mat(0x6e4422), shutter, 0.55, 0, 0);
      mesh(new THREE.BoxGeometry(1.0, 0.65, 0.04), mat(0x1e140c), ctx.root, windowPos.x, windowPos.y, windowPos.z - 0.04);
      ctx.tap.mark(shutter, 'window');

      raven = createAnimal('raven');
      dove = createAnimal('dove');
      for (const b of [raven, dove]) {
        b.root.scale.setScalar(BIRD_SCALE);
        b.root.visible = false;
        ctx.root.add(b.root);
      }
      leaf = createOliveLeaf();
      leaf.scale.setScalar(2.2);
      leaf.visible = false;
      dove.beakTip.add(leaf);

      ctx.frame({ cx: 0, cy: 6.5, cz: 0, w: 18, h: 9, elev: 0.18, portrait: { w: 15, cy: 6, elev: 0.3 } });
    },

    update(dt) {
      water.update(dt);
      clouds.update(dt);
      // The waters keep going down with every flight (Genesis 8:5).
      level += ((4 - state.flights * 0.3) - level) * Math.min(1, dt);
      water.setLevel(level);
      for (const ev of state.tick(dt)) {
        if (ev === 'landed') {
          flight.bird.root.visible = false;
          if (state.done) ctx.tap.unmark(shutter);
          flight = null;
        }
      }
      // Shutter swings open while a bird is out, closed otherwise.
      shutter.rotation.y += ((flight ? -1.9 : 0) - shutter.rotation.y) * Math.min(1, dt * 6);

      if (flight) {
        flight.t += dt;
        const u = Math.min(1, flight.t / FLIGHT_TIME);
        const prev = flight.bird.root.position.clone();
        flightPoint(flight.kind, u, flight.bird.root.position);
        const d = flight.bird.root.position.clone().sub(prev);
        if (d.lengthSq() > 1e-8) flight.bird.root.rotation.y = Math.atan2(d.x, d.z);
        // The olive leaf appears on the way back (Genesis 8:11).
        leaf.visible = flight.kind === 'dove:leaf' && u > 0.5;
        updateAnimal(flight.bird, dt, { fly: true });
      }
    },

    onTap(id) {
      const kind = state.tap(id);
      if (!kind) return;
      const bird = kind === 'raven' ? raven : dove;
      bird.root.visible = true;
      bird.root.position.copy(windowPos);
      flight = { kind, t: 0, bird };
    },
    isLocked: () => state.locked,
    isDone: () => state.done,
    dispose() { disposeTree(ctx.root); },
  };
}
