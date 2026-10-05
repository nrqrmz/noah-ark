import { createSequence } from './sequence.js';

// Scene 1: tap each house to see what is happening inside; then God's light
// falls on Noah (an animation the child does not trigger).
export const HOUSES = 4;
export const PAUSE_TIME = 1.5; // lets the last reveal play before the light
export const LIGHT_TIME = 3;

export function createViolenceState() {
  const revealed = new Set();
  const finale = createSequence([
    { duration: PAUSE_TIME },
    { duration: LIGHT_TIME, start: 'lightStart', end: 'lightEnd' },
  ]);

  return {
    get locked() { return revealed.size === HOUSES; },
    get done() { return finale.finished; },

    tap(id) {
      const m = /^house-(\d+)$/.exec(id);
      if (!m || Number(m[1]) >= HOUSES || revealed.has(id) || this.locked) return null;
      revealed.add(id);
      if (revealed.size === HOUSES) finale.begin();
      return 'reveal';
    },

    tick(dt) {
      return finale.tick(dt);
    },
  };
}
