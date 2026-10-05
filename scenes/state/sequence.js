// A timed sequence of steps, used for animations that play on their own.
// Each step may emit an event when it starts and when it ends.
// Pure module: safe to import from node tests.

export function createSequence(steps) {
  let index = -1;
  let elapsed = 0;
  let pendingStart = false;

  return {
    get running() { return index >= 0 && index < steps.length; },
    get finished() { return index >= steps.length; },

    begin() {
      if (index !== -1) return;
      index = 0;
      elapsed = 0;
      pendingStart = true;
    },

    tick(dt) {
      const events = [];
      while (index >= 0 && index < steps.length) {
        const step = steps[index];
        if (pendingStart) {
          if (step.start) events.push(step.start);
          pendingStart = false;
        }
        elapsed += dt;
        dt = 0;
        if (elapsed < step.duration) break;
        if (step.end) events.push(step.end);
        dt = elapsed - step.duration; // carry the overshoot into the next step
        elapsed = 0;
        index++;
        pendingStart = true;
      }
      return events;
    },
  };
}
