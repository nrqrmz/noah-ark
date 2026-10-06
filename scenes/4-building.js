import * as THREE from 'three';
import { createBuildingState, TREES, TREE_X, TREE_Z, SON_FOR_TREE, SON_HOMES, workSpot } from './state/building.js';
import { createLandscape, disposeTree, stepToward, keepApart } from './common.js';
import { createPerson, familyLook, updatePerson, facePoint } from '../characters/people.js';
import { createArk } from '../world/ark.js';
import { createTree } from '../world/props.js';

const ARK_POS = new THREE.Vector3(0, 0, -5);
const SONS = ['shem', 'ham', 'japheth'];
const CHOP_TIME = 1.4; // a son's axe strokes before the tree changes
const FLY_TIME = 1.3;

// Scene 4: Noah's sons cut wood; the planks fly onto the ark, which grows.
export default function createScene(ctx) {
  const state = createBuildingState();
  const trees = [];
  const sons = [];
  const flights = [];
  let landscape;
  let ark;
  let noah;
  let landed = 0;
  let shown = 0;
  let obstacles = [];

  // A son walks to tree i and works there; `then` runs when he is done.
  function assignWork(i, then) {
    const son = sons[SON_FOR_TREE[i]];
    son.jobs.push({ tree: i, spot: new THREE.Vector3(workSpot(i).x, 0, workSpot(i).z), t: CHOP_TIME, then });
  }

  function updateSon(son, dt) {
    const job = son.jobs[0];
    let moving = false;
    let gesture = null;
    if (job) {
      const arrived = stepToward(son.p.root.position, job.spot, 2.4, dt);
      if (!arrived) {
        moving = true;
        facePoint(son.p, job.spot.x, job.spot.z);
      } else {
        facePoint(son.p, TREE_X[job.tree], TREE_Z);
        gesture = 'chop';
        job.t -= dt;
        if (job.t <= 0) {
          son.jobs.shift();
          job.then();
        }
      }
    } else {
      stepToward(son.p.root.position, son.home, 1.5, dt);
      moving = son.p.root.position.distanceTo(son.home) > 0.05;
      if (moving) facePoint(son.p, son.home.x, son.home.z);
      else facePoint(son.p, 0, TREE_Z);
    }
    updatePerson(son.p, dt, { moving, gesture });
  }

  return {
    build() {
      landscape = createLandscape(ctx, { mood: 'day', clouds: 5 });
      ark = createArk({ length: 13 });
      ark.root.position.copy(ARK_POS);
      ark.setBuilt(0);
      ctx.root.add(ark.root);
      obstacles = ark.footprint.map((c) => ({ x: c.x + ARK_POS.x, z: c.z + ARK_POS.z, r: c.r }));
      TREE_X.forEach((x) => obstacles.push({ x, z: TREE_Z, r: 0.45 }));

      TREE_X.forEach((x, i) => {
        const tree = createTree();
        tree.root.position.set(x, 0, TREE_Z);
        tree.root.rotation.y = i * 1.3;
        ctx.root.add(tree.root);
        ctx.tap.mark(tree.stages.standing, `tree-${i}`);
        trees.push(tree);
      });

      SONS.forEach((id, k) => {
        const p = createPerson(familyLook(id));
        const home = new THREE.Vector3(SON_HOMES[k].x, 0, SON_HOMES[k].z); // on the lane
        p.root.position.copy(home);
        ctx.root.add(p.root);
        sons.push({ p, home, jobs: [] });
      });
      noah = createPerson(familyLook('noah'));
      noah.root.position.set(5.2, 0, -1.4);
      facePoint(noah, 3, -3);
      ctx.root.add(noah.root);

      ctx.frame({ cx: 0, cy: 1.8, cz: -0.5, w: 15.5, h: 8, elev: 0.38, portrait: { w: 16, cy: 1, elev: 0.6 } });
    },

    update(dt) {
      landscape.update(dt);
      state.tick(dt);
      for (const son of sons) updateSon(son, dt);
      // Noah hammers at the ark while it is being built.
      updatePerson(noah, dt, { gesture: state.done ? 'wave' : 'chop' });
      keepApart([noah, ...sons.map((s) => s.p)], obstacles);

      // Planks arc through the air onto the ark.
      for (let k = flights.length - 1; k >= 0; k--) {
        const f = flights[k];
        f.t += dt;
        const u = Math.min(1, f.t / FLY_TIME);
        f.obj.position.lerpVectors(f.from, f.to, u);
        f.obj.position.y += Math.sin(Math.PI * u) * 3.5;
        f.obj.rotation.y += dt * 4;
        if (u >= 1) {
          f.obj.visible = false;
          flights.splice(k, 1);
          landed++;
        }
      }
      shown += (landed / TREES - shown) * Math.min(1, dt * 3);
      ark.setBuilt(shown);
    },

    onTap(id) {
      const ev = state.tap(id);
      if (!ev) return;
      const [kind, n] = ev.split(':');
      const i = Number(n);
      const tree = trees[i];
      ctx.tap.unmark(kind === 'chop' ? tree.stages.standing : kind === 'saw' ? tree.stages.logs : tree.stages.planks);
      if (kind === 'chop') {
        assignWork(i, () => {
          tree.setStage('logs');
          ctx.tap.mark(tree.stages.logs, `logs-${i}`);
        });
      } else if (kind === 'saw') {
        assignWork(i, () => {
          tree.setStage('planks');
          ctx.tap.mark(tree.stages.planks, `planks-${i}`);
        });
      } else {
        // The plank stack leaves the tree spot and flies onto the ark.
        const stack = tree.stages.planks;
        const from = new THREE.Vector3();
        stack.getWorldPosition(from);
        ctx.root.attach(stack);
        stack.visible = true;
        const to = ARK_POS.clone().add(new THREE.Vector3((i - 1.5) * 2.5, 2.5, 0));
        flights.push({ obj: stack, from, to, t: 0 });
      }
    },
    isLocked: () => state.locked,
    // Done once the state says so and the last planks have landed.
    isDone: () => state.done && flights.length === 0,
    dispose() { disposeTree(ctx.root); },
  };
}

