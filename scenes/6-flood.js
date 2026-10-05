import * as THREE from 'three';
import { createFloodState, FAMILY_IDS, DOOR_TIME, RAIN_TIME } from './state/flood.js';
import { createLandscape, disposeTree, keepApart, createBoarding } from './common.js';
import { createPerson, familyLook, updatePerson } from '../characters/people.js';
import { createArk } from '../world/ark.js';
import { createWater } from '../world/terrain.js';
import { createClouds, createRain, createGodLight, setSky } from '../world/sky.js';

const ARK_POS = new THREE.Vector3(0, 0, -5.5);
const FAMILY_Z = 1.6;
const WATER_START = -0.6;
const WATER_END = 6.5; // above the hills: the whole earth is covered (Genesis 7:19-20)
const DRAFT = 1.1; // how deep the floating hull sits

const lerp = (a, b, t) => a + (b - a) * t;

// Scene 6: the eight go in, God shuts the door, and it rains until the ark floats.
export default function createScene(ctx) {
  const state = createFloodState();
  const people = [];
  let landscape;
  let ark;
  let boarder;
  let obstacles = [];
  let light;
  let water;
  let rain;
  let stormClouds;
  let doorT = -1;
  let rainT = -1;

  const landBox = { cx: 0, cy: 2, cz: -1, w: 16, h: 8.5, elev: 0.34, portrait: { w: 14.5, cy: 1.4, elev: 0.58 } };
  const seaBox = { cx: 0, cy: 4.5, cz: -4, w: 26, h: 12, elev: 0.3, portrait: { w: 22, cy: 4.5, elev: 0.45 } };

  return {
    build() {
      landscape = createLandscape(ctx, { mood: 'gray', clouds: 5, darkClouds: true });
      ark = createArk({ length: 13 });
      ark.root.position.copy(ARK_POS);
      ark.setDoor(1);
      ctx.root.add(ark.root);
      boarder = createBoarding(ark.rampFoot.clone().add(ARK_POS), ark.doorPoint.clone().add(ARK_POS));
      obstacles = ark.footprint.map((c) => ({ x: c.x + ARK_POS.x, z: c.z + ARK_POS.z, r: c.r }));

      FAMILY_IDS.forEach((id, i) => {
        const p = createPerson(familyLook(id));
        p.root.position.set((i - 3.5) * 1.45, 0, FAMILY_Z + (i % 2) * 0.5);
        ctx.root.add(p.root);
        ctx.tap.mark(p.root, id);
        people.push({ id, p, walking: false });
      });

      light = createGodLight({ radius: 1.4, height: 18 });
      light.group.position.copy(ark.rampFoot).add(ARK_POS);
      light.setIntensity(0);
      ctx.root.add(light.group);
      water = createWater({ color: 0x3a78b0 });
      water.setLevel(WATER_START);
      ctx.root.add(water.mesh);
      rain = createRain({ center: new THREE.Vector3(0, -1, -4), width: 70, height: 26, depth: 40 });
      ctx.root.add(rain.group);

      ctx.frame(landBox);
    },

    update(dt) {
      landscape.update(dt);
      for (const ev of state.tick(dt)) {
        if (ev === 'doorClose') doorT = 0;
        if (ev === 'rainStart') {
          rainT = 0;
          setSky(ctx.world, 'storm');
          stormClouds = createClouds(8, true, { y: 11, z: -18 });
          ctx.root.add(stormClouds.group);
        }
      }

      const solid = [];
      for (const person of people) {
        const { p } = person;
        if (!person.walking) {
          updatePerson(p, dt);
          solid.push(p);
          continue;
        }
        if (!p.root.visible) continue;
        const phase = boarder.step(p, 3.2, dt);
        updatePerson(p, dt, { moving: phase === 'ground' || phase === 'ramp' });
        if (phase === 'ground') solid.push(p);
      }
      keepApart(solid, obstacles);

      // God shuts the door, in light.
      if (doorT >= 0 && doorT < DOOR_TIME + 1) {
        doorT += dt;
        const u = Math.min(1, doorT / DOOR_TIME);
        light.setIntensity(Math.sin(Math.PI * Math.min(1, doorT / (DOOR_TIME + 0.8))));
        ark.setDoor(1 - u);
      }

      // Rain until the water covers everything and the ark floats.
      if (rainT >= 0) {
        rainT += dt;
        const u = Math.min(1, rainT / (RAIN_TIME * 0.85));
        rain.setIntensity(Math.min(1, rainT / 1.5) * (state.done ? 0.5 : 1));
        const level = lerp(WATER_START, WATER_END, u * u * (3 - 2 * u));
        water.setLevel(level);
        ark.root.position.y = Math.max(0, level - DRAFT) + (level > DRAFT ? Math.sin(rainT * 1.3) * 0.12 : 0);
        ark.root.rotation.z = level > DRAFT ? Math.sin(rainT * 0.9) * 0.03 : 0;
        const f = Math.min(1, u * 1.2);
        const box = {
          cx: 0, cy: lerp(landBox.cy, seaBox.cy, f), cz: lerp(landBox.cz, seaBox.cz, f),
          w: lerp(landBox.w, seaBox.w, f), h: lerp(landBox.h, seaBox.h, f), elev: lerp(landBox.elev, seaBox.elev, f),
          portrait: {
            w: lerp(landBox.portrait.w, seaBox.portrait.w, f), cy: lerp(landBox.portrait.cy, seaBox.portrait.cy, f),
            elev: lerp(landBox.portrait.elev, seaBox.portrait.elev, f),
          },
        };
        ctx.frame(box);
      }
      water.update(dt);
      rain.update(dt);
      stormClouds?.update(dt);
    },

    onTap(id) {
      if (!state.tap(id)) return;
      const person = people.find((x) => x.id === id);
      ctx.tap.unmark(person.p.root);
      person.walking = true;
      person.p.walk = { delay: 0, points: boarder.path() };
    },
    isLocked: () => state.locked,
    isDone: () => state.done,
    dispose() { disposeTree(ctx.root); },
  };
}
