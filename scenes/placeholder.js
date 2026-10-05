import * as THREE from 'three';

// Temporary scene: a box that finishes the page when tapped.
export default function createScene(ctx) {
  let box;
  let done = false;
  return {
    build() {
      box = new THREE.Mesh(
        new THREE.BoxGeometry(2, 2, 2),
        new THREE.MeshStandardMaterial({ color: 0xc0643a })
      );
      ctx.root.add(box);
      ctx.tap.mark(box, 'box');
      ctx.frame({ cx: 0, cy: 0, cz: 0, w: 6, h: 6 });
    },
    update(dt) {
      box.rotation.y += dt * (done ? 3 : 1);
    },
    onTap(id) {
      if (id === 'box') {
        done = true;
        ctx.tap.unmark(box);
      }
    },
    isLocked: () => false,
    isDone: () => done,
    dispose() {
      box.geometry.dispose();
      box.material.dispose();
    },
  };
}
