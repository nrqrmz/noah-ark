// Scene 7: Noah opens the window and sends out birds, in the order of
// Genesis 8:7-12: the raven, then the dove three times.
export const FLIGHTS = ['raven', 'dove:empty', 'dove:leaf', 'dove:gone'];
export const FLIGHT_TIME = 4;

export function createDoveState() {
  let sent = 0;
  let flying = 0; // seconds left in the current flight

  return {
    get locked() { return flying > 0 || sent === FLIGHTS.length; },
    get done() { return sent === FLIGHTS.length && flying <= 0; },
    get flights() { return sent; },

    tap(id) {
      if (id !== 'window' || this.locked) return null;
      flying = FLIGHT_TIME;
      return FLIGHTS[sent++];
    },

    tick(dt) {
      if (flying <= 0) return [];
      flying -= dt;
      return flying <= 0 ? ['landed'] : [];
    },
  };
}
