import { createSequence } from './sequence.js';

// Scene 2: Noah preaches in the square. Each tapped listener reacts, and the
// reaction depends on how many have been tapped before, not on who is tapped.
export const LISTENERS = ['person-0', 'person-1', 'person-2', 'person-3'];
export const REACTION_ORDER = ['laugh', 'mock', 'disbelief', 'leave'];
export const TURN_TIME = 1;
export const ALONE_TIME = 2.5;

export function createPreachingState() {
  const reacted = new Set();
  // After the 4th tap: the others turn their backs, then walk off slowly.
  const finale = createSequence([
    { duration: TURN_TIME, start: 'turnAway' },
    { duration: ALONE_TIME, start: 'walkOff' },
  ]);

  return {
    // Nothing is left to tap once everyone has reacted.
    get locked() { return reacted.size === LISTENERS.length; },
    get done() { return finale.finished; },

    tap(id) {
      if (!LISTENERS.includes(id) || reacted.has(id) || this.locked) return null;
      const reaction = REACTION_ORDER[reacted.size];
      reacted.add(id);
      if (this.locked) finale.begin();
      return reaction;
    },

    tick(dt) {
      return finale.tick(dt);
    },
  };
}
