import * as THREE from 'three';
import { createViolenceState, LIGHT_TIME } from './state/violence.js';
import { createLandscape, disposeTree, stepToward, keepApart } from './common.js';
import { createPerson, createTownsperson, familyLook, updatePerson, facePoint } from '../characters/people.js';
import { createHouse, createFightCloud } from '../world/props.js';
import { createGodLight } from '../world/sky.js';
import { mat, mesh, sphere } from '../characters/rig.js';

// City houses: 0 and 2 hide a cartoon fight, 1 and 3 a masked thief.
// Staggered so the back houses show between the front ones; the back row uses
// the taller variants so no house is hidden behind another. [x, z, variant]
const HOUSE_SPOTS = [[-6, -4.4, 2], [-1.6, -4.8, 1], [-4, 0, 0], [0.6, -0.4, 3]];
const NOAH_SPOT = new THREE.Vector3(3.6, 0, 3);

// Scene 1: the world full of violence; God's light falls on Noah in his field.
export default function createScene(ctx) {
  const state = createViolenceState();
  const houses = [];
  const fights = [];
  const thieves = [];
  let landscape;
  let noah;
  let light;
  let lightT = -1;
  let walkers = [];

  function buildField() {
    const soil = mesh(new THREE.BoxGeometry(4.6, 0.06, 3.4), mat(0x8a6a44, { roughness: 1 }), ctx.root, 4.4, 0.03, 3.2);
    soil.receiveShadow = true;
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 5; c++) {
        mesh(sphere(0.18, 8, 6), mat(0x5fa83a), ctx.root, 2.7 + c * 0.85, 0.12, 2 + r * 1.1);
      }
    }
  }

  function revealHouse(i) {
    const house = houses[i];
    ctx.tap.unmark(house);
    const door = house.userData.door.clone().applyMatrix4(house.matrixWorld);
    if (i % 2 === 0) {
      const fight = createFightCloud();
      fight.root.position.set(door.x, 0, door.z + 0.9);
      ctx.root.add(fight.root);
      fights.push(fight);
    } else {
      // A masked thief sneaks in and comes back out with a sack, again and again.
      const thief = createTownsperson(5 + i, { mask: true });
      const sack = mesh(sphere(0.32, 10, 8), mat(0x9a7a4a), thief.body, 0, 1.45, -0.35);
      sack.visible = false;
      const start = new THREE.Vector3(door.x + 3, 0, door.z + 1.6);
      thief.root.position.copy(start);
      ctx.root.add(thief.root);
      thieves.push({ person: thief, sack, door, start, t: 0 });
    }
  }

  function updateThief(th, dt) {
    th.t = (th.t + dt) % 6;
    const p = th.person;
    const inside = th.t > 2 && th.t < 2.8;
    p.root.visible = !inside;
    th.sack.visible = th.t >= 2.8;
    let moving = false;
    if (th.t < 2) {
      moving = !stepToward(p.root.position, th.door, 1.8, dt);
      facePoint(p, th.door.x, th.door.z);
    } else if (th.t >= 2.8) {
      moving = !stepToward(p.root.position, th.start, 2.6, dt);
      facePoint(p, th.start.x, th.start.z);
    }
    updatePerson(p, dt, { moving });
  }

  return {
    build() {
      landscape = createLandscape(ctx, { mood: 'gray', clouds: 5, darkClouds: true, ground: 0x7fa65a });
      HOUSE_SPOTS.forEach(([x, z, variant], i) => {
        const house = createHouse(variant);
        house.position.set(x, 0, z);
        ctx.root.add(house);
        house.updateMatrixWorld();
        ctx.tap.mark(house, `house-${i}`);
        houses.push(house);
      });
      // A couple of townspeople wandering between the houses (not tappable).
      walkers = [0, 1].map((seed) => {
        const p = createTownsperson(seed + 2);
        p.root.position.set(-3.5 + seed, 0, 2.6);
        ctx.root.add(p.root);
        return { person: p, target: new THREE.Vector3(-6 + seed * 5, 0, 2.6) };
      });

      buildField();
      noah = createPerson(familyLook('noah'));
      noah.root.position.copy(NOAH_SPOT);
      facePoint(noah, -4, 0);
      ctx.root.add(noah.root);
      light = createGodLight({ radius: 1.6 });
      light.group.position.copy(NOAH_SPOT);
      light.setIntensity(0);
      ctx.root.add(light.group);

      ctx.frame({ cx: -0.6, cy: 1.2, cz: 0.5, w: 17, h: 7.5, elev: 0.42, portrait: { w: 12.5, cx: -0.2, cy: 0.6, cz: 0.5, elev: 0.75 } });
    },

    update(dt) {
      landscape.update(dt);
      for (const ev of state.tick(dt)) {
        if (ev === 'lightStart') lightT = 0;
      }
      for (const f of fights) f.update(dt);
      for (const th of thieves) updateThief(th, dt);
      for (const w of walkers) {
        if (stepToward(w.person.root.position, w.target, 0.9, dt)) w.target.x = w.target.x < -3 ? -1 : -6;
        facePoint(w.person, w.target.x, w.target.z);
        updatePerson(w.person, dt, { moving: true });
      }
      keepApart([...walkers.map((w) => w.person), ...thieves.filter((th) => th.person.root.visible).map((th) => th.person), noah]);
      if (lightT >= 0) {
        lightT += dt;
        light.setIntensity(Math.min(1, lightT / 1.2));
        // Noah turns toward the viewer and looks up into the light.
        noah.root.rotation.y += (0 - noah.root.rotation.y) * Math.min(1, dt * 2);
        noah.head.rotation.x = Math.max(-0.45, noah.head.rotation.x - dt * 0.5);
      }
      updatePerson(noah, dt, { gesture: lightT > LIGHT_TIME * 0.4 ? 'openArms' : null });
    },

    onTap(id) {
      if (state.tap(id) === 'reveal') revealHouse(Number(id.split('-')[1]));
    },
    isLocked: () => state.locked,
    isDone: () => state.done,
    dispose() { disposeTree(ctx.root); },
  };
}

