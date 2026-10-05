// Page controller: scene order, lifecycle, and the "Next" rule.
// Pure module: knows nothing about three.js or the DOM; `ui` and `makeCtx` are injected.

const MAX_DT = 0.05;

export function createStory({ factories, makeCtx, ui }) {
  const last = factories.length - 1;
  let index = -1;
  let scene = null;
  let ctx = null;
  let nextShown = false;

  function teardown() {
    if (!scene) return;
    scene.dispose();
    ctx.release?.();
    scene = null;
    ctx = null;
  }

  function start(i = 0) {
    teardown();
    index = i;
    ctx = makeCtx();
    scene = factories[i](ctx);
    scene.build();
    nextShown = false;
    ui.showPage(i);
    ui.setProgress(i);
    ui.setNext(false);
  }

  return {
    start,
    get index() { return index; },

    update(dt) {
      if (!scene) return;
      scene.update(Math.min(dt, MAX_DT));
      // The cover has its own Start button; Next never shows there.
      const show = index > 0 && scene.isDone();
      if (show !== nextShown) {
        nextShown = show;
        ui.setNext(show);
      }
    },

    tap(id) {
      if (scene && !scene.isLocked()) scene.onTap(id);
    },

    next() {
      if (!scene || index >= last || !scene.isDone()) return false;
      start(index + 1);
      return true;
    },

    restart() {
      start(1);
    },

    setLanguage() {
      if (scene) ui.showPage(index);
    },
  };
}
