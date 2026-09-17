// Camera cones through window frames, used to cut visible portions out of a
// wall cue without dropping the surrounding mesh's whole visibility patch.
(() => {
  "use strict";
  const BL = window.BL = window.BL || {};
  const trees = new WeakMap();
  // Share the immutable terrain index across every room/window. Faces retain
  // their rendered geometry, including the convex fragments of a flared sill.
  const terrainTree = (geometry) => {
    if (!geometry) return null;
    if (trees.has(geometry)) return trees.get(geometry);
    const bounds = new Float64Array(geometry.faces.length * 6), order = [];
    for (let face = 0; face < geometry.faces.length; face++) {
      const indices = geometry.faces[face].i, at = face * 6;
      if (indices.length < 3) continue;
      bounds.fill(Infinity, at, at + 3); bounds.fill(-Infinity, at + 3, at + 6);
      for (const index of indices) for (let axis = 0; axis < 3; axis++) {
        const value = geometry.verts[index * 3 + axis];
        bounds[at + axis] = Math.min(bounds[at + axis], value); bounds[at + axis + 3] = Math.max(bounds[at + axis + 3], value);
      }
      order.push(face);
    }
    const build = (start, end) => {
      const box = new Float64Array([Infinity, Infinity, Infinity, -Infinity, -Infinity, -Infinity]);
      for (let n = start; n < end; n++) for (let axis = 0; axis < 3; axis++) {
        const at = order[n] * 6;
        box[axis] = Math.min(box[axis], bounds[at + axis]); box[axis + 3] = Math.max(box[axis + 3], bounds[at + axis + 3]);
      }
      const node = { bounds: box, start, end, left: null, right: null };
      if (end - start > 16) {
        let axis = 0;
        for (let n = 1; n < 3; n++) if (box[n + 3] - box[n] > box[axis + 3] - box[axis]) axis = n;
        const sorted = order.slice(start, end).sort((a, b) => bounds[a * 6 + axis] + bounds[a * 6 + axis + 3] - bounds[b * 6 + axis] - bounds[b * 6 + axis + 3]);
        for (let n = 0; n < sorted.length; n++) order[start + n] = sorted[n];
        const middle = (start + end) >>> 1;
        node.left = build(start, middle); node.right = build(middle, end);
      }
      return node;
    };
    const tree = { root: build(0, order.length), order: new Uint32Array(order), bounds, geometry };
    trees.set(geometry, tree); return tree;
  };
  const create = ({ windows, island }) => {
    const entries = [], terrain = terrainTree(island.geometry);
    for (const window of windows) for (const frustum of window.flare.frusta) if (!frustum.inner) {
      const sx = Math.sin(frustum.angle), sz = -Math.cos(frustum.angle), tx = -sz, tz = sx, r = frustum.start;
      const corners = new Float64Array(12);
      for (let n = 0; n < 4; n++) {
        const across = (n === 0 || n === 3 ? -1 : 1) * frustum.half;
        corners[n * 3] = sx * r + tx * across;
        corners[n * 3 + 1] = window.sill + (n < 2 ? 0 : window.height);
        corners[n * 3 + 2] = sz * r + tz * across;
      }
      entries.push({ sx, sz, r, corners, planes: new Float64Array(24), active: false });
    }
    const forward = new Float64Array(3), a = new Float64Array(36), b = new Float64Array(36);
    const result = { points: a, count: 0 };
    let active = false, near = 0.1;
    const update = (camera, outside) => {
      const p = camera.position; near = camera.near; active = false;
      const length = Math.hypot(camera.target.x - p.x, camera.target.y - p.y, camera.target.z - p.z);
      forward[0] = (camera.target.x - p.x) / length; forward[1] = (camera.target.y - p.y) / length; forward[2] = (camera.target.z - p.z) / length;
      for (const entry of entries) {
        entry.active = outside && p.x * entry.sx + p.z * entry.sz > entry.r + 0.05;
        if (!entry.active) continue;
        const c = entry.corners, planes = entry.planes;
        active = true;
        for (let n = 0; n < 4; n++) {
          const i = n * 3, j = ((n + 1) % 4) * 3;
          const ax = c[i] - p.x, ay = c[i + 1] - p.y, az = c[i + 2] - p.z, bx = c[j] - p.x, by = c[j + 1] - p.y, bz = c[j + 2] - p.z;
          let nx = ay * bz - az * by, ny = az * bx - ax * bz, nz = ax * by - ay * bx;
          const centerX = entry.sx * entry.r - p.x, centerY = (c[1] + c[7]) / 2 - p.y, centerZ = entry.sz * entry.r - p.z;
          const length = Math.hypot(nx, ny, nz) * (nx * centerX + ny * centerY + nz * centerZ > 0 ? -1 : 1);
          nx /= length; ny /= length; nz /= length;
          planes[n * 4] = nx; planes[n * 4 + 1] = ny; planes[n * 4 + 2] = nz; planes[n * 4 + 3] = nx * p.x + ny * p.y + nz * p.z;
        }
        planes[16] = entry.sx; planes[17] = 0; planes[18] = entry.sz; planes[19] = entry.r;
        planes[20] = -forward[0]; planes[21] = -forward[1]; planes[22] = -forward[2]; planes[23] = -(p.x * forward[0] + p.y * forward[1] + p.z * forward[2] + near);
      }
    };
    const intersects = (bounds, at, planes, foreground) => {
      for (let n = 0; n < (foreground ? 24 : 20); n += 4) {
        const sign = foreground && n === 16 ? -1 : 1, nx = planes[n] * sign, ny = planes[n + 1] * sign, nz = planes[n + 2] * sign;
        if (nx * bounds[at + (nx < 0 ? 3 : 0)] + ny * bounds[at + (ny < 0 ? 4 : 1)] + nz * bounds[at + (nz < 0 ? 5 : 2)] > planes[n + 3] * sign + 1e-5) return false;
      }
      return true;
    };
    const overlaps = (bounds, at) => {
      if (!active) return false;
      for (const entry of entries) if (entry.active) {
        if (intersects(bounds, at, entry.planes, false)) return true;
      }
      return false;
    };
    const clipPrepared = (entry, foreground) => {
      result.count = 0;
      if (!entry.active) return result;
      let input = a, output = b, count = 3;
      for (let plane = 0; plane < (foreground ? 24 : 20); plane += 4) {
        const p = entry.planes, sign = foreground && plane === 16 ? -1 : 1; let next = 0;
        for (let n = 0; n < count; n++) {
          const i = n * 3, j = ((n + 1) % count) * 3;
          const da = (p[plane] * input[i] + p[plane + 1] * input[i + 1] + p[plane + 2] * input[i + 2] - p[plane + 3]) * sign;
          const db = (p[plane] * input[j] + p[plane + 1] * input[j + 1] + p[plane + 2] * input[j + 2] - p[plane + 3]) * sign;
          if (da <= 0) { for (let axis = 0; axis < 3; axis++) output[next * 3 + axis] = input[i + axis]; next++; }
          if (da * db < 0) {
            const t = da / (da - db);
            for (let axis = 0; axis < 3; axis++) output[next * 3 + axis] = input[i + axis] + (input[j + axis] - input[i + axis]) * t;
            next++;
          }
        }
        if (next < 3) return result;
        const swap = input; input = output; output = swap; count = next;
      }
      result.points = input; result.count = count; return result;
    };
    const clip = (index, surface, at) => {
      for (let n = 0; n < 9; n++) a[n] = surface[at + n];
      return clipPrepared(entries[index], false);
    };
    const visitBlockers = (node, entry, append) => {
      if (!intersects(node.bounds, 0, entry.planes, true)) return;
      if (node.left) { visitBlockers(node.left, entry, append); visitBlockers(node.right, entry, append); return; }
      const geometry = terrain.geometry;
      for (let n = node.start; n < node.end; n++) {
        const face = terrain.order[n];
        if (!intersects(terrain.bounds, face * 6, entry.planes, true)) continue;
        const indices = geometry.faces[face].i;
        for (let fan = 1; fan + 1 < indices.length; fan++) {
          for (let corner = 0; corner < 3; corner++) {
            const at = indices[corner ? fan + corner - 1 : 0] * 3;
            for (let axis = 0; axis < 3; axis++) a[corner * 3 + axis] = geometry.verts[at + axis];
          }
          const cut = clipPrepared(entry, true);
          if (cut.count) append(cut.points, cut.count);
        }
      }
    };
    // The cone is only the candidate opening. Subtract real stone between
    // the camera and its frame, rather than promoting one clear ray into an
    // entirely clear window. Rear wall faces remain part of the cue.
    const blockers = (index, append) => {
      const entry = entries[index];
      if (terrain && entry.active) visitBlockers(terrain.root, entry, append);
    };
    return { update, overlaps, clip, blockers, get count() { return active ? entries.length : 0; } };
  };
  BL.wallApertures = { create };
})();
