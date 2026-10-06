import { createSequence } from './sequence.js';

// Scene 4: each tree is tapped three times: chop it into logs, saw the logs
// into planks, and send the planks onto the ark.
export const TREES = 4;
export const FINISH_TIME = 1.5;

export const TREE_X = [-5.4, -1.8, 1.8, 5.4];
export const TREE_Z = 3;
export const LANE_Z = 4.2; // sons walk along this lane in front of the trees
export const SON_FOR_TREE = [0, 0, 1, 2]; // 0 Shem, 1 Ham, 2 Japheth
export const SON_HOMES = [{ x: -3.6, z: LANE_Z }, { x: 0.6, z: LANE_Z }, { x: 4.2, z: LANE_Z }];

// Where a son stands to work tree i: on the lane, beside the tree on his home's side.
export function workSpot(i) {
  const home = SON_HOMES[SON_FOR_TREE[i]];
  const side = Math.sign(home.x - TREE_X[i]) || 1;
  return { x: TREE_X[i] + 0.9 * side, z: LANE_Z };
}

// The x range son k ever occupies: his home and work spots, widened by his radius.
export function sonStretch(k, radius = 0.35) {
  const xs = [SON_HOMES[k].x];
  SON_FOR_TREE.forEach((s, i) => { if (s === k) xs.push(workSpot(i).x); });
  return [Math.min(...xs) - radius, Math.max(...xs) + radius];
}

const NEXT = { standing: ['tree', 'logs', 'chop'], logs: ['logs', 'planks', 'saw'], planks: ['planks', 'gone', 'fly'] };

export function createBuildingState() {
  const stages = Array(TREES).fill('standing');
  const finale = createSequence([{ duration: FINISH_TIME, start: 'finished' }]);
  const built = () => stages.filter((s) => s === 'gone').length;

  return {
    get progress() { return built() / TREES; },
    get locked() { return built() === TREES; },
    get done() { return finale.finished; },
    stage: (i) => stages[i],

    tap(id) {
      const m = /^(tree|logs|planks)-(\d+)$/.exec(id);
      if (!m || this.locked) return null;
      const i = Number(m[2]);
      if (i >= TREES) return null;
      const [expected, next, event] = NEXT[stages[i]] ?? [];
      if (m[1] !== expected) return null;
      stages[i] = next;
      if (built() === TREES) finale.begin();
      return `${event}:${i}`;
    },

    tick(dt) {
      return finale.tick(dt);
    },
  };
}
