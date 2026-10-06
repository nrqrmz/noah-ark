import { createSequence } from './sequence.js';

// Scene 1: tap each house to see what is happening there; then God's light
// falls on Noah (an animation the child does not trigger).
// Houses 0 and 1 are neighbors: whichever is tapped first sends both neighbors
// out to fight; the other one is then robbed. House 2 has jars, house 3 bread.
export const HOUSES = 4;
export const PAUSE_TIME = 3; // lets the last event play (the thief leaves) before the light
export const LIGHT_TIME = 3;

const PAIR = [0, 1];

export function createViolenceState() {
  const revealed = new Set();
  let fought = false;
  const finale = createSequence([
    { duration: PAUSE_TIME },
    { duration: LIGHT_TIME, start: 'lightStart', end: 'lightEnd' },
  ]);

  const eventFor = (i) => {
    if (PAIR.includes(i)) {
      const kind = fought ? 'thief' : 'fight';
      fought = true;
      return `${kind}:${i}`;
    }
    return `${i === 2 ? 'jars' : 'food'}:${i}`;
  };

  return {
    get locked() { return revealed.size === HOUSES; },
    get done() { return finale.finished; },

    // Returns 'fight:<i>' | 'thief:<i>' | 'jars:2' | 'food:3', or null.
    tap(id) {
      const m = /^house-(\d+)$/.exec(id);
      if (!m || Number(m[1]) >= HOUSES || revealed.has(id) || this.locked) return null;
      revealed.add(id);
      if (revealed.size === HOUSES) finale.begin();
      return eventFor(Number(m[1]));
    },

    tick(dt) {
      return finale.tick(dt);
    },
  };
}
