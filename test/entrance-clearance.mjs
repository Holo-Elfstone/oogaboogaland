// Read the actual rendered doorway stones, including their scene transforms.
// Connected mesh components are boxes; derive their bounds from shared vertices
// rather than duplicating the model's lintel height or pillar dimensions.
export const createEntranceClearanceProbe = () => {
  const BL = window.BL, B = window.__ooga, cache = new Map(), visited = new Set();
  BL.scene.updateWorld(BL.scenes.hub.root);
  const arches = B.headquarters.entrances.map((entry) => {
    const node = entry.node, geometry = node.geometry;
    let boxes = cache.get(geometry);
    if (!boxes) {
      const parent = Array.from({ length: geometry.verts.length / 3 }, (_, i) => i);
      const find = (i) => parent[i] === i ? i : parent[i] = find(parent[i]);
      for (const face of geometry.faces) for (const i of face.i) parent[find(i)] = find(face.i[0]);
      const groups = new Map();
      for (let i = 0; i < parent.length; i++) {
        const key = find(i);
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key).push(i);
      }
      boxes = [...groups.values()].map((indices) => {
        const bounds = [Infinity, Infinity, Infinity, -Infinity, -Infinity, -Infinity];
        for (const i of indices) for (let axis = 0; axis < 3; axis++) {
          const value = geometry.verts[i * 3 + axis];
          bounds[axis] = Math.min(bounds[axis], value);
          bounds[axis + 3] = Math.max(bounds[axis + 3], value);
        }
        if (indices.length !== 8 || indices.some((i) => [0, 1, 2].some((axis) => ![bounds[axis], bounds[axis + 3]].includes(geometry.verts[i * 3 + axis])))) throw new Error("Doorway component is no longer a box; update the independent mesh probe");
        return bounds;
      });
      cache.set(geometry, boxes);
    }
    const inverse = new Float32Array(16), bounds = [Infinity, Infinity, Infinity, -Infinity, -Infinity, -Infinity], m = node.world;
    BL.math.mat4.invert(inverse, m);
    for (let i = 0; i < geometry.verts.length; i += 3) for (let axis = 0; axis < 3; axis++) {
      const value = m[axis] * geometry.verts[i] + m[axis + 4] * geometry.verts[i + 1] + m[axis + 8] * geometry.verts[i + 2] + m[axis + 12];
      bounds[axis] = Math.min(bounds[axis], value);
      bounds[axis + 3] = Math.max(bounds[axis + 3], value);
    }
    const scales = [Math.hypot(m[0], m[1], m[2]), Math.hypot(m[4], m[5], m[6]), Math.hypot(m[8], m[9], m[10])];
    return { id: `${entry.ramp ? "ramp" : entry.basement ? "basement" : "upper"}:${entry.roomIndex}`, inverse, bounds, boxes, scales };
  });
  let samples = 0;
  const nearby = (arch, x, y, z, radius, height) => x + radius >= arch.bounds[0] && x - radius <= arch.bounds[3] && y + height >= arch.bounds[1] && y <= arch.bounds[4] && z + radius >= arch.bounds[2] && z - radius <= arch.bounds[5];
  return {
    near: (x, y, z, radius = 0.5, height = 3) => arches.some((arch) => nearby(arch, x, y, z, radius, height)),
    solid: (x, y, z) => {
      for (const arch of arches) {
        if (!nearby(arch, x, y, z, 0, 0)) continue;
        visited.add(arch.id); samples++;
        const m = arch.inverse, lx = m[0] * x + m[4] * y + m[8] * z + m[12], ly = m[1] * x + m[5] * y + m[9] * z + m[13], lz = m[2] * x + m[6] * y + m[10] * z + m[14];
        if (arch.boxes.some((b) => lx > b[0] + 1e-5 && lx < b[3] - 1e-5 && ly > b[1] + 1e-5 && ly < b[4] - 1e-5 && lz > b[2] + 1e-5 && lz < b[5] - 1e-5)) return true;
      }
      return false;
    },
    clearAt: (x, y, z, radius, height) => {
      for (const arch of arches) {
        if (!nearby(arch, x, y, z, radius, height)) continue;
        visited.add(arch.id); samples++;
        const m = arch.inverse, lx = m[0] * x + m[4] * y + m[8] * z + m[12], ly = m[1] * x + m[5] * y + m[9] * z + m[13], lz = m[2] * x + m[6] * y + m[10] * z + m[14];
        for (const b of arch.boxes) {
          if (ly >= b[4] - 1e-5 || ly + height / arch.scales[1] <= b[1] + 1e-5) continue;
          const dx = (lx - Math.max(b[0], Math.min(b[3], lx))) * arch.scales[0], dz = (lz - Math.max(b[2], Math.min(b[5], lz))) * arch.scales[2];
          if (dx * dx + dz * dz < (radius - 1e-5) ** 2) return false;
        }
      }
      return true;
    },
    stats: () => ({ arches: arches.length, visited: [...visited].sort(), samples })
  };
};
