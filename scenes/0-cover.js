import { createWater } from '../world/terrain.js';
import { createClouds, setSky } from '../world/sky.js';
import { createArk } from '../world/ark.js';
import { disposeTree } from './common.js';

// Cover: the finished ark floating gently on calm water.
export default function createScene(ctx) {
  let water;
  let clouds;
  let ark;
  let t = 0;

  return {
    build() {
      setSky(ctx.world, 'clear');
      water = createWater({ color: 0x4a9ad8 });
      water.setLevel(0);
      ctx.root.add(water.mesh);
      clouds = createClouds(5);
      ctx.root.add(clouds.group);
      ark = createArk({ length: 14 });
      ark.root.position.y = -1.2; // floating: the hull sits partly under water
      ctx.root.add(ark.root);
      ctx.frame({ cx: 0, cy: 2.2, cz: 0, w: 16, h: 11, elev: 0.18 });
    },
    update(dt) {
      t += dt;
      water.update(dt);
      clouds.update(dt);
      ark.root.position.y = -1.2 + Math.sin(t * 0.9) * 0.15;
      ark.root.rotation.z = Math.sin(t * 0.7) * 0.025;
      ark.root.rotation.x = Math.sin(t * 0.55 + 1) * 0.015;
    },
    onTap() {},
    isLocked: () => false,
    // The cover's own Start button advances the story.
    isDone: () => true,
    dispose() { disposeTree(ctx.root); },
  };
}
