import placeholder from './placeholder.js';

// The cover is always done: its own Start button advances the story.
const cover = (ctx) => ({ ...placeholder(ctx), isDone: () => true });

// Scene factories, indexed like SCENE_IDS in i18n.js.
export default [
  cover, placeholder, placeholder, placeholder, placeholder,
  placeholder, placeholder, placeholder, placeholder,
];
