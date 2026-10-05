import { createSequence } from './sequence.js';

// Scene 2: Noah preaches in the square; each person reacts when tapped.
export const REACTIONS = {
  'person-laugh': 'laugh',
  'person-mock': 'mock',
  'person-ears': 'coverEars',
  'person-leave': 'turnAway',
};
export const ALONE_TIME = 2.5;

export function createPreachingState() {
  const reacted = new Set();
  const finale = createSequence([{ duration: ALONE_TIME, start: 'alone' }]);
  const total = Object.keys(REACTIONS).length;

  return {
    // Nothing is left to tap once everyone has reacted.
    get locked() { return reacted.size === total; },
    get done() { return finale.finished; },

    tap(id) {
      if (!(id in REACTIONS) || reacted.has(id) || this.locked) return null;
      reacted.add(id);
      if (reacted.size === total) finale.begin();
      return REACTIONS[id];
    },

    tick(dt) {
      return finale.tick(dt);
    },
  };
}
