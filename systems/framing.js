// Camera distance so a box of size {w, h} fits entirely in a perspective view.
export function fitDistance(size, aspect, fovDeg) {
  const halfTan = Math.tan((fovDeg * Math.PI) / 360);
  const forHeight = size.h / (2 * halfTan);
  const forWidth = size.w / (2 * halfTan * aspect);
  return Math.max(forHeight, forWidth);
}
