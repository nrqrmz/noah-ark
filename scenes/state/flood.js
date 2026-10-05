import { createSequence } from './sequence.js';

// Scene 6: tap each of the eight to walk into the ark; then God shuts the door
// and it rains (Genesis 7:7-20). Must match FAMILY in characters/people.js.
export const FAMILY_IDS = ['noah', 'noahWife', 'shem', 'shemWife', 'ham', 'hamWife', 'japheth', 'japhethWife'];
export const WALK_TIME = 2;
export const DOOR_TIME = 2;
export const RAIN_TIME = 8;

export function createFloodState() {
  const walking = new Map(); // id -> seconds left walking aboard
  const finale = createSequence([
    { duration: DOOR_TIME, start: 'doorClose' },
    { duration: RAIN_TIME, start: 'rainStart' },
  ]);

  return {
    get locked() { return walking.size === FAMILY_IDS.length; },
    get done() { return finale.finished; },

    tap(id) {
      if (!FAMILY_IDS.includes(id) || walking.has(id)) return null;
      walking.set(id, WALK_TIME);
      return `board:${id}`;
    },

    tick(dt) {
      for (const [id, left] of walking) walking.set(id, left - dt);
      const allInside = this.locked && [...walking.values()].every((left) => left <= 0);
      if (allInside) finale.begin();
      return finale.tick(dt);
    },
  };
}
