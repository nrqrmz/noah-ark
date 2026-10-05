import { createSequence } from './sequence.js';

// Scene 3: Noah studies the ark's instructions; each tapped light point reveals a part.
export const PARTS = ['length', 'decks', 'window', 'door', 'pitch'];
export const GLOW_TIME = 2;

export function createBlueprintState() {
  const revealed = new Set();
  const finale = createSequence([{ duration: GLOW_TIME, start: 'glow' }]);

  return {
    get locked() { return revealed.size === PARTS.length; },
    get done() { return finale.finished; },

    tap(id) {
      if (!PARTS.includes(id) || revealed.has(id) || this.locked) return null;
      revealed.add(id);
      if (revealed.size === PARTS.length) finale.begin();
      return `reveal:${id}`;
    },

    tick(dt) {
      return finale.tick(dt);
    },
  };
}
