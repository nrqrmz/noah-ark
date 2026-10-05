import test from 'node:test';
import assert from 'node:assert/strict';
import { createStory } from '../story.js';

// Fake scenes record every call; `done` and `locked` are set by the test.
function setup(count = 3) {
  const scenes = [];
  const factories = Array.from({ length: count }, (_, i) => () => {
    const s = {
      i, done: false, locked: false, builds: 0, disposed: 0, taps: [], dts: [],
      build() { this.builds++; },
      update(dt) { this.dts.push(dt); },
      onTap(id) { this.taps.push(id); },
      isLocked() { return this.locked; },
      isDone() { return this.done; },
      dispose() { this.disposed++; },
    };
    scenes.push(s);
    return s;
  });
  const calls = { pages: [], next: [], progress: [] };
  const ui = {
    showPage: (i) => calls.pages.push(i),
    setNext: (v) => calls.next.push(v),
    setProgress: (i) => calls.progress.push(i),
  };
  const story = createStory({ factories, makeCtx: () => ({}), ui });
  return { story, scenes, calls, current: () => scenes[scenes.length - 1] };
}

test('start builds scene 0 and shows page 0', () => {
  const { story, scenes, calls } = setup();
  story.start();
  assert.equal(scenes[0].builds, 1);
  assert.deepEqual(calls.pages, [0]);
  assert.equal(story.index, 0);
});

test('next is refused before isDone', () => {
  const { story, scenes } = setup();
  story.start(1);
  assert.equal(story.next(), false);
  assert.equal(story.index, 1);
  assert.equal(scenes[0].disposed, 0);
});

test('next disposes and builds the following scene once done', () => {
  const { story, scenes } = setup();
  story.start(1);
  scenes[0].done = true;
  assert.equal(story.next(), true);
  assert.equal(scenes[0].disposed, 1);
  assert.equal(scenes[1].builds, 1);
  assert.equal(story.index, 2);
});

test('Next button only shows when done', () => {
  const { story, current, calls } = setup();
  story.start(1);
  story.update(0.016);
  assert.equal(calls.next.at(-1), false);
  current().done = true;
  story.update(0.016);
  assert.equal(calls.next.at(-1), true);
});

test('Next button never shows on the cover', () => {
  const { story, current, calls } = setup();
  story.start(0);
  current().done = true;
  story.update(0.016);
  assert.ok(!calls.next.includes(true));
});

test('taps are forwarded only when not locked', () => {
  const { story, current } = setup();
  story.start(1);
  story.tap('a');
  current().locked = true;
  story.tap('b');
  assert.deepEqual(current().taps, ['a']);
});

test('update clamps dt to 0.05', () => {
  const { story, current } = setup();
  story.start(1);
  story.update(10);
  assert.deepEqual(current().dts, [0.05]);
});

test('setLanguage repaints without rebuilding', () => {
  const { story, current, calls } = setup();
  story.start(1);
  story.setLanguage();
  assert.equal(current().builds, 1);
  assert.deepEqual(calls.pages, [1, 1]);
});

test('restart goes to scene 1', () => {
  const { story, current } = setup(4);
  story.start(3);
  const last = current();
  last.done = true;
  story.restart();
  assert.equal(last.disposed, 1);
  assert.equal(story.index, 1);
  assert.equal(current().builds, 1);
});

test('last scene exposes restart instead of next', () => {
  const { story, current } = setup(3);
  story.start(2);
  current().done = true;
  assert.equal(story.next(), false);
  assert.equal(story.index, 2);
});

test('scene context is released on dispose', () => {
  let released = 0;
  const factories = [() => ({ build() {}, update() {}, onTap() {}, isLocked: () => false, isDone: () => true, dispose() {} }),
    () => ({ build() {}, update() {}, onTap() {}, isLocked: () => false, isDone: () => false, dispose() {} })];
  const story = createStory({
    factories,
    makeCtx: () => ({ release: () => released++ }),
    ui: { showPage() {}, setNext() {}, setProgress() {} },
  });
  story.start(0);
  story.next();
  assert.equal(released, 1);
});

test('locked reflects the current scene', () => {
  const { story, current } = setup();
  story.start(1);
  assert.equal(story.locked, false);
  current().locked = true;
  assert.equal(story.locked, true);
});
