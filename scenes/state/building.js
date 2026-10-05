import { createSequence } from './sequence.js';

// Scene 4: each tree is tapped three times: chop it into logs, saw the logs
// into planks, and send the planks onto the ark.
export const TREES = 4;
export const FINISH_TIME = 1.5;

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
