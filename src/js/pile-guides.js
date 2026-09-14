// One silhouette for the actual stone base, mound and settled bananas.
(() => {
  "use strict";
  const BL = window.BL = window.BL || {}, { mat4 } = BL.math;
  const SIZE = 1024, INSTANCES = 65536 + 512, LEAF_SIZE = 8, TREE_SIZE = 32768, RANGE = 12, EPS = 1e-6;
  const UP = { x: 0, y: 1, z: 0 };
  const create = ({ pile, altar }) => {
    const owner = altar.node, roots = [owner, pile.core, pile.shell], slots = new Map(), geometryCache = new Map();
    for (const slot of pile.slots) { roots.push(slot.node); slots.set(slot.node, slot); }
    const ordinary = [altar.slab, pile.core];
    for (const slot of pile.slots) ordinary.push(slot.node);
    const batches = [pile.shell, ...altar.rings], batchVersions = new Float64Array(batches.length), batchCounts = new Uint32Array(batches.length), batchVisible = new Uint8Array(batches.length);
    batchVersions.fill(NaN);
    const ordinaryWorld = new Float64Array(ordinary.length * 16), ordinaryVisible = new Uint8Array(ordinary.length);
    ordinaryWorld.fill(NaN);
    const instanceBatch = new Uint8Array(INSTANCES), instanceOffsets = new Uint32Array(INSTANCES), instanceBounds = new Float64Array(INSTANCES * 6), tree = new Float64Array(TREE_SIZE * 6);
    const stack = new Uint32Array(64), candidates = new Uint32Array(64), bounds = new Float64Array(6), scratchBounds = new Float64Array(6), view = mat4.create(), lastView = new Float64Array(19), instanceMatrix = new Float64Array(16), inverse = new Float64Array(16);
    lastView.fill(NaN);
    const triangle = new Float64Array(9), clipped = new Float64Array(12), screen = new Float64Array(8);
    const certainty = new Uint8Array(SIZE * SIZE), unsafe = new Uint8Array(SIZE * SIZE), winding = new Int32Array((SIZE + 1) * SIZE), sums = new Uint32Array((SIZE + 1) * (SIZE + 1));
    const mask = document.createElement("canvas"), rim = document.createElement("canvas"), maskCtx = mask.getContext("2d"), rimCtx = rim.getContext("2d");
    let instanceCount = 0, leaves = 1, version = 0, renderedVersion = -1, live = true, width = 0, height = 0, focal = 1, near = 0.1;
    let minX = 0, minY = 0, maxX = 0, maxY = 0;
    const state = { instances: 0, considered: 0, contained: 0, outside: 0, faces: 0, updates: 0, queryInstances: 0, buffers: certainty.byteLength + unsafe.byteLength + winding.byteLength + sums.byteLength + instanceBounds.byteLength + tree.byteLength + instanceBatch.byteLength + instanceOffsets.byteLength };
    const geometryOf = (geometry) => {
      let g = geometryCache.get(geometry);
      if (g) return g;
      const b = BL.scene.boundsOf(geometry), triangles = [], indices = [], samples = [];
      for (const face of geometry.faces) {
        let x = 0, y = 0, z = 0;
        for (const i of face.i) { x += geometry.verts[i * 3]; y += geometry.verts[i * 3 + 1]; z += geometry.verts[i * 3 + 2]; }
        samples.push(x / face.i.length, y / face.i.length, z / face.i.length);
        for (let i = 1; i < face.i.length - 1; i++) for (const j of [face.i[0], face.i[i], face.i[i + 1]]) { indices.push(j); triangles.push(geometry.verts[j * 3], geometry.verts[j * 3 + 1], geometry.verts[j * 3 + 2]); }
      }
      const neighbors = new Int32Array(indices.length), edges = new Map(); neighbors.fill(-1);
      for (let i = 0; i < indices.length; i += 3) for (let a = 0; a < 3; a++) {
        const from = indices[i + a], to = indices[i + (a + 1) % 3], key = Math.min(from, to) + ":" + Math.max(from, to), previous = edges.get(key);
        if (previous === undefined) edges.set(key, i + a);
        else { neighbors[i + a] = Math.floor(previous / 3); neighbors[previous] = i / 3; }
      }
      g = { source: geometry, bounds: b, triangles: new Float64Array(triangles), samples: new Float64Array(samples), indices: new Uint32Array(indices), neighbors, projected: new Float64Array(geometry.verts.length), transformed: new Float64Array(geometry.verts.length), facing: new Uint8Array(indices.length / 3), next: new Int32Array(indices.length), heads: new Int32Array(geometry.verts.length / 3) };
      geometryCache.set(geometry, g); return g;
    };
    for (const node of ordinary) geometryOf(node.geometry);
    for (const node of batches) geometryOf(node.geometry);
    const includes = (node) => { const slot = slots.get(node); return !slot || !slot.moving; };
    const visible = (node) => {
      if (!node.parent || !includes(node)) return false;
      for (let n = node; n; n = n.parent) if (!n.visible) return false;
      return true;
    };
    const emptyBounds = (b, at = 0) => { b[at] = b[at + 1] = b[at + 2] = Infinity; b[at + 3] = b[at + 4] = b[at + 5] = -Infinity; };
    const unionBounds = (to, at, from, source) => {
      for (let a = 0; a < 3; a++) { to[at + a] = Math.min(to[at + a], from[source + a]); to[at + a + 3] = Math.max(to[at + a + 3], from[source + a + 3]); }
    };
    const transformBounds = (g, m, o, out, at) => {
      const b = g.bounds, cx = (b.min[0] + b.max[0]) / 2, cy = (b.min[1] + b.max[1]) / 2, cz = (b.min[2] + b.max[2]) / 2;
      const hx = (b.max[0] - b.min[0]) / 2, hy = (b.max[1] - b.min[1]) / 2, hz = (b.max[2] - b.min[2]) / 2;
      for (let a = 0; a < 3; a++) {
        const c = m[o + a] * cx + m[o + a + 4] * cy + m[o + a + 8] * cz + m[o + a + 12];
        const h = Math.abs(m[o + a]) * hx + Math.abs(m[o + a + 4]) * hy + Math.abs(m[o + a + 8]) * hz + EPS;
        out[at + a] = c - h; out[at + a + 3] = c + h;
      }
    };
    const sync = () => {
      if (!live) return false;
      let changed = false, layout = false;
      for (let n = 0; n < ordinary.length; n++) {
        const node = ordinary[n], shown = +visible(node);
        if (ordinaryVisible[n] !== shown) { ordinaryVisible[n] = shown; changed = true; }
        if (shown) for (let a = 0; a < 16; a++) if (ordinaryWorld[n * 16 + a] !== node.world[a]) { ordinaryWorld[n * 16 + a] = node.world[a]; changed = true; }
      }
      for (let n = 0; n < batches.length; n++) {
        const node = batches[n], shown = +visible(node);
        if (batchVersions[n] !== node.instanceVersion || batchCounts[n] !== node.instanceCount || batchVisible[n] !== shown) {
          batchVersions[n] = node.instanceVersion; batchCounts[n] = node.instanceCount; batchVisible[n] = shown; changed = layout = true;
        }
      }
      if (!changed) return visible(owner);
      if (layout) {
        instanceCount = 0;
        for (let n = 0; n < batches.length; n++) if (batchVisible[n]) {
          const node = batches[n], g = geometryOf(node.geometry);
          for (let i = 0; i < node.instanceCount; i++) {
            if (instanceCount === INSTANCES) throw new Error("Pile instance geometry exceeds its renderer capacity");
            instanceBatch[instanceCount] = n; instanceOffsets[instanceCount] = i * 20;
            transformBounds(g, node.instanceData, i * 20, instanceBounds, instanceCount++ * 6);
          }
        }
        leaves = 1; while (leaves * LEAF_SIZE < instanceCount) leaves *= 2;
        for (let n = 1; n < leaves * 2; n++) emptyBounds(tree, n * 6);
        for (let n = 0; n < instanceCount; n++) unionBounds(tree, (leaves + Math.floor(n / LEAF_SIZE)) * 6, instanceBounds, n * 6);
        for (let n = leaves - 1; n; n--) { unionBounds(tree, n * 6, tree, n * 12); unionBounds(tree, n * 6, tree, (n * 2 + 1) * 6); }
        state.instances = instanceCount;
      }
      emptyBounds(bounds);
      for (let n = 0; n < ordinary.length; n++) if (ordinaryVisible[n]) { transformBounds(geometryOf(ordinary[n].geometry), ordinary[n].world, 0, scratchBounds, 0); unionBounds(bounds, 0, scratchBounds, 0); }
      if (instanceCount) unionBounds(bounds, 0, tree, 6);
      version++;
      return visible(owner);
    };
    const boxDistance = (b, at, x, y, z) => Math.hypot(Math.max(0, b[at] - x, x - b[at + 3]), Math.max(0, b[at + 1] - y, y - b[at + 4]), Math.max(0, b[at + 2] - z, z - b[at + 5]));
    const distance = (x, y, z) => live ? boxDistance(bounds, 0, x, y, z) : Infinity;
    const boxHit = (b, at, ax, ay, az, dx, dy, dz) => {
      let lo = 0, hi = 1;
      for (let a = 0; a < 3; a++) {
        const p = a === 0 ? ax : a === 1 ? ay : az, d = a === 0 ? dx : a === 1 ? dy : dz;
        if (Math.abs(d) < 1e-12) { if (p < b[at + a] || p > b[at + a + 3]) return false; }
        else { const t0 = (b[at + a] - p) / d, t1 = (b[at + a + 3] - p) / d; lo = Math.max(lo, Math.min(t0, t1)); hi = Math.min(hi, Math.max(t0, t1)); if (lo > hi) return false; }
      }
      return hi > 1e-5 && lo < 1 - 1e-5;
    };
    const instanceClear = (n, ax, ay, az, dx, dy, dz) => {
      const node = batches[instanceBatch[n]], m = node.instanceData, o = instanceOffsets[n], v = geometryOf(node.geometry).triangles;
      for (let i = 0; i < 16; i++) instanceMatrix[i] = m[o + i];
      mat4.invert(inverse, instanceMatrix);
      const x = inverse[0] * ax + inverse[4] * ay + inverse[8] * az + inverse[12], y = inverse[1] * ax + inverse[5] * ay + inverse[9] * az + inverse[13], z = inverse[2] * ax + inverse[6] * ay + inverse[10] * az + inverse[14];
      const vx = inverse[0] * dx + inverse[4] * dy + inverse[8] * dz, vy = inverse[1] * dx + inverse[5] * dy + inverse[9] * dz, vz = inverse[2] * dx + inverse[6] * dy + inverse[10] * dz;
      state.queryInstances++;
      for (let i = 0; i < v.length; i += 9) {
        const ux = v[i + 3] - v[i], uy = v[i + 4] - v[i + 1], uz = v[i + 5] - v[i + 2], wx = v[i + 6] - v[i], wy = v[i + 7] - v[i + 1], wz = v[i + 8] - v[i + 2];
        const hx = vy * wz - vz * wy, hy = vz * wx - vx * wz, hz = vx * wy - vy * wx, det = ux * hx + uy * hy + uz * hz;
        if (Math.abs(det) < 1e-10) continue;
        const tx = x - v[i], ty = y - v[i + 1], tz = z - v[i + 2], u = (tx * hx + ty * hy + tz * hz) / det;
        if (u < -EPS || u > 1 + EPS) continue;
        const qx = ty * uz - tz * uy, qy = tz * ux - tx * uz, qz = tx * uy - ty * ux, w = (vx * qx + vy * qy + vz * qz) / det;
        if (w < -EPS || u + w > 1 + EPS) continue;
        const t = (wx * qx + wy * qy + wz * qz) / det;
        if (t > 1e-5 && t < 1 - 1e-5) return false;
      }
      return true;
    };
    const clear = (ax, ay, az, bx, by, bz) => {
      if (!live || !instanceCount) return true;
      const dx = bx - ax, dy = by - ay, dz = bz - az;
      let top = 1; stack[0] = 1;
      while (top) {
        const id = stack[--top];
        if (!boxHit(tree, id * 6, ax, ay, az, dx, dy, dz)) continue;
        if (id < leaves) { stack[top++] = id * 2; stack[top++] = id * 2 + 1; continue; }
        for (let n = (id - leaves) * LEAF_SIZE, end = Math.min(instanceCount, n + LEAF_SIZE); n < end; n++) if (boxHit(instanceBounds, n * 6, ax, ay, az, dx, dy, dz) && !instanceClear(n, ax, ay, az, dx, dy, dz)) return false;
      }
      return true;
    };
    const boxClear = (minX, minY, minZ, maxX, maxY, maxZ) => {
      if (!live || !instanceCount) return true;
      let top = 1; stack[0] = 1;
      while (top) {
        const id = stack[--top], at = id * 6;
        if (tree[at] > maxX || tree[at + 1] > maxY || tree[at + 2] > maxZ || tree[at + 3] < minX || tree[at + 4] < minY || tree[at + 5] < minZ) continue;
        if (id < leaves) { stack[top++] = id * 2; stack[top++] = id * 2 + 1; continue; }
        for (let n = (id - leaves) * LEAF_SIZE, end = Math.min(instanceCount, n + LEAF_SIZE); n < end; n++) {
          const b = n * 6;
          if (instanceBounds[b] <= maxX && instanceBounds[b + 1] <= maxY && instanceBounds[b + 2] <= maxZ && instanceBounds[b + 3] >= minX && instanceBounds[b + 4] >= minY && instanceBounds[b + 5] >= minZ) return false;
        }
      }
      return true;
    };
    const perceived = (actor, ex, ey, ez, segmentClear, objectClear) => {
      const p = actor.root.position;
      for (let n = 0; n < instanceCount; n++) {
        if (boxDistance(instanceBounds, n * 6, p.x, p.y, p.z) > RANGE) continue;
        const node = batches[instanceBatch[n]], m = node.instanceData, o = instanceOffsets[n], samples = geometryOf(node.geometry).samples;
        for (let i = 0; i < samples.length; i += 3) {
          const x = m[o] * samples[i] + m[o + 4] * samples[i + 1] + m[o + 8] * samples[i + 2] + m[o + 12], y = m[o + 1] * samples[i] + m[o + 5] * samples[i + 1] + m[o + 9] * samples[i + 2] + m[o + 13], z = m[o + 2] * samples[i] + m[o + 6] * samples[i + 1] + m[o + 10] * samples[i + 2] + m[o + 14];
          if ((x - p.x) ** 2 + (y - p.y) ** 2 + (z - p.z) ** 2 > RANGE * RANGE) continue;
          const dx = x - ex, dy = y - ey, dz = z - ez, k = Math.max(0, 1 - 0.018 / Math.max(1e-9, Math.hypot(dx, dy, dz)));
          if (segmentClear(ex, ey, ez, ex + dx * k, ey + dy * k, ez + dz * k) && objectClear(ex, ey, ez, ex + dx * k, ey + dy * k, ez + dz * k, actor, owner)) return true;
        }
      }
      return false;
    };
    const cameraVisibility = (actor, camera, aspect, segmentClear, objectClear, ownerClear, knownHidden = false) => {
      if (!instanceCount) return 0;
      mat4.lookAt(view, camera.position, camera.target, camera.up || UP);
      const p = camera.position, tanY = Math.tan(camera.fov / 2), tanX = tanY * aspect;
      let top = 1, hidden = knownHidden ? 2 : 0, nearest = Infinity; candidates[0] = 1;
      if (segmentClear.boxSolid) {
        for (let n = 0; n < instanceCount; n++) nearest = Math.min(nearest, boxDistance(instanceBounds, n * 6, p.x, p.y, p.z));
        for (let n = 0; n < ordinary.length; n++) if (ordinaryVisible[n]) { transformBounds(geometryOf(ordinary[n].geometry), ordinary[n].world, 0, scratchBounds, 0); nearest = Math.min(nearest, boxDistance(scratchBounds, 0, p.x, p.y, p.z)); }
      }
      while (top) {
        const id = candidates[--top], at = id * 6;
        if (tree[at] === Infinity) continue;
        const cx = (tree[at] + tree[at + 3]) / 2, cy = (tree[at + 1] + tree[at + 4]) / 2, cz = (tree[at + 2] + tree[at + 5]) / 2;
        const r = Math.hypot(tree[at + 3] - cx, tree[at + 4] - cy, tree[at + 5] - cz), depth = -(view[2] * cx + view[6] * cy + view[10] * cz + view[14]);
        if (depth + r <= camera.near || depth - r > camera.far || Math.abs(view[0] * cx + view[4] * cy + view[8] * cz + view[12]) > depth * tanX + r * Math.hypot(1, tanX) || Math.abs(view[1] * cx + view[5] * cy + view[9] * cz + view[13]) > depth * tanY + r * Math.hypot(1, tanY)) continue;
        const minX = Math.min(p.x, tree[at]), minY = Math.min(p.y, tree[at + 1]), minZ = Math.min(p.z, tree[at + 2]), maxX = Math.max(p.x, tree[at + 3]), maxY = Math.max(p.y, tree[at + 4]), maxZ = Math.max(p.z, tree[at + 5]);
        const empty = segmentClear.boxClear && objectClear.boxClear && segmentClear.boxClear(minX, minY, minZ, maxX, maxY, maxZ) && objectClear.boxClear(minX, minY, minZ, maxX, maxY, maxZ, actor, owner);
        // A solid cross-section must follow the near plane yet precede
        // every part of this owner until an exterior hidden witness is known;
        // then preceding this subtree suffices. Other subtrees still undergo
        // the independent visible-part search. This blocks every subtree ray,
        // including between our finite surface witnesses.
        let blocked = false;
        const nearestPart = hidden ? boxDistance(tree, at, p.x, p.y, p.z) : nearest;
        if (!empty && segmentClear.boxSolid && nearestPart > camera.near) {
          const hX = tree[at + 3] - cx, hY = tree[at + 4] - cy, hZ = tree[at + 5] - cz;
          const minimumDepth = depth - Math.abs(view[2]) * hX - Math.abs(view[6]) * hY - Math.abs(view[10]) * hZ;
          const reach = Math.hypot(Math.max(Math.abs(tree[at] - p.x), Math.abs(tree[at + 3] - p.x)), Math.max(Math.abs(tree[at + 1] - p.y), Math.abs(tree[at + 4] - p.y)), Math.max(Math.abs(tree[at + 2] - p.z), Math.abs(tree[at + 5] - p.z)));
          const maximum = Math.min(0.5, (nearestPart - EPS) / reach);
          if (minimumDepth > camera.near) for (let k = camera.near / minimumDepth * 1.001, attempts = 0; k < maximum && attempts < 8; k *= 2, attempts++) {
            if (segmentClear.boxSolid(p.x + (tree[at] - p.x) * k, p.y + (tree[at + 1] - p.y) * k, p.z + (tree[at + 2] - p.z) * k, p.x + (tree[at + 3] - p.x) * k, p.y + (tree[at + 4] - p.y) * k, p.z + (tree[at + 5] - p.z) * k)) { blocked = true; break; }
          }
        }
        if (blocked && hidden) continue;
        if (id < leaves && !blocked) { candidates[top++] = id * 2; candidates[top++] = id * 2 + 1; continue; }
        let first = id, span = 1; while (first < leaves) { first *= 2; span *= 2; }
        nodeSamples: for (let n = (first - leaves) * LEAF_SIZE, end = Math.min(instanceCount, n + span * LEAF_SIZE); n < end; n++) {
          const node = batches[instanceBatch[n]], m = node.instanceData, o = instanceOffsets[n], samples = geometryOf(node.geometry).samples;
          for (let i = 0; i < samples.length; i += 3) {
            const dx = m[o] * samples[i] + m[o + 4] * samples[i + 1] + m[o + 8] * samples[i + 2] + m[o + 12] - p.x, dy = m[o + 1] * samples[i] + m[o + 5] * samples[i + 1] + m[o + 9] * samples[i + 2] + m[o + 13] - p.y, dz = m[o + 2] * samples[i] + m[o + 6] * samples[i + 1] + m[o + 10] * samples[i + 2] + m[o + 14] - p.z;
            const depth = -(view[2] * dx + view[6] * dy + view[10] * dz);
            if (depth <= camera.near || depth > camera.far || Math.abs(view[0] * dx + view[4] * dy + view[8] * dz) > depth * tanX || Math.abs(view[1] * dx + view[5] * dy + view[9] * dz) > depth * tanY) continue;
            const start = camera.near / depth, finish = 1 - 0.018 / Math.hypot(dx, dy, dz);
            if (finish <= start) continue;
            if (blocked) { hidden = 2; break nodeSamples; }
            const ax = p.x + dx * start, ay = p.y + dy * start, az = p.z + dz * start, bx = p.x + dx * finish, by = p.y + dy * finish, bz = p.z + dz * finish;
            if (empty || segmentClear(ax, ay, az, bx, by, bz) && objectClear(ax, ay, az, bx, by, bz, actor, owner)) return 1;
            if (!hidden && (!ownerClear || ownerClear(owner, ax, ay, az, bx, by, bz))) hidden = 2;
          }
        }
      }
      return hidden;
    };
    const concealed = (actor, camera, aspect, segmentClear, objectClear, ownerClear) => cameraVisibility(actor, camera, aspect, segmentClear, objectClear, ownerClear) === 2;
    const projectBounds = (b, at) => {
      const x = (b[at] + b[at + 3]) / 2, y = (b[at + 1] + b[at + 4]) / 2, z = (b[at + 2] + b[at + 5]) / 2;
      const radius = Math.hypot(b[at + 3] - x, b[at + 4] - y, b[at + 5] - z);
      const cx = view[0] * x + view[4] * y + view[8] * z + view[12], cy = view[1] * x + view[5] * y + view[9] * z + view[13], depth = -(view[2] * x + view[6] * y + view[10] * z + view[14]);
      if (depth + radius < near) return false;
      if (depth - radius <= near) { minX = minY = 0; maxX = width; maxY = height; return true; }
      const a = focal / (depth - radius), c = focal / (depth + radius);
      minX = Math.floor(width / 2 + Math.min((cx - radius) * a, (cx - radius) * c) - 1);
      maxX = Math.ceil(width / 2 + Math.max((cx + radius) * a, (cx + radius) * c) + 1);
      minY = Math.floor(height / 2 - Math.max((cy + radius) * a, (cy + radius) * c) - 1);
      maxY = Math.ceil(height / 2 - Math.min((cy - radius) * a, (cy - radius) * c) + 1);
      return maxX > 0 && maxY > 0 && minX < width && minY < height;
    };
    const inView = (camera, aspect) => {
      if (!live) return false;
      mat4.lookAt(view, camera.position, camera.target, camera.up || UP);
      const x = (bounds[0] + bounds[3]) / 2, y = (bounds[1] + bounds[4]) / 2, z = (bounds[2] + bounds[5]) / 2, r = Math.hypot(bounds[3] - x, bounds[4] - y, bounds[5] - z);
      const depth = -(view[2] * x + view[6] * y + view[10] * z + view[14]), tx = Math.tan(camera.fov / 2) * aspect, ty = Math.tan(camera.fov / 2);
      return depth + r >= camera.near && depth - r <= camera.far && Math.abs(view[0] * x + view[4] * y + view[8] * z + view[12]) <= depth * tx + r * Math.hypot(1, tx) && Math.abs(view[1] * x + view[5] * y + view[9] * z + view[13]) <= depth * ty + r * Math.hypot(1, ty);
    };
    const certifyTriangle = (a, b, c) => {
      let ax = screen[a], ay = screen[a + 1], bx = screen[b], by = screen[b + 1], cx = screen[c], cy = screen[c + 1];
      if ((bx - ax) * (cy - ay) - (by - ay) * (cx - ax) < 0) { const x = bx, y = by; bx = cx; by = cy; cx = x; cy = y; }
      const y0 = Math.max(0, Math.ceil(Math.min(ay, by, cy))), y1 = Math.min(height - 1, Math.floor(Math.max(ay, by, cy)));
      for (let y = y0; y <= y1; y++) {
        let lo = 0, hi = width - 1;
        for (let e = 0; e < 3; e++) {
          const x0 = e === 0 ? ax : e === 1 ? bx : cx, yy = e === 0 ? ay : e === 1 ? by : cy;
          const dx = (e === 0 ? bx : e === 1 ? cx : ax) - x0, dy = (e === 0 ? by : e === 1 ? cy : ay) - yy;
          // All four pixel corners must lie inside this actual triangle.
          const rhs = dx * ((dx >= 0 ? y : y + 1) - yy) + dy * x0 - EPS;
          if (dy > 0) hi = Math.min(hi, Math.floor(rhs / dy - 1));
          else if (dy < 0) lo = Math.max(lo, Math.ceil(rhs / dy));
          else if (rhs < 0) { hi = -1; break; }
        }
        for (let x = lo; x <= hi; x++) certainty[y * width + x] = 1;
      }
    };
    // The projection of front-facing triangles is filled by its oriented
    // boundary. Shared interior edges cancel, including all panel diagonals.
    // A pixel is certified only when its centre is inside and no true boundary
    // touches its square; this proves full coverage without readback or gaps at
    // the core's internal tessellation seams.
    const certifyMesh = (g, m, offset) => {
      const verts = g.source.verts, p = g.projected, indices = g.indices, facing = g.facing;
      for (let i = 0; i < verts.length; i += 3) {
        const x = m[offset] * verts[i] + m[offset + 4] * verts[i + 1] + m[offset + 8] * verts[i + 2] + m[offset + 12], y = m[offset + 1] * verts[i] + m[offset + 5] * verts[i + 1] + m[offset + 9] * verts[i + 2] + m[offset + 13], z = m[offset + 2] * verts[i] + m[offset + 6] * verts[i + 1] + m[offset + 10] * verts[i + 2] + m[offset + 14];
        const depth = -(view[2] * x + view[6] * y + view[10] * z + view[14]);
        if (depth <= near) return false;
        p[i] = width / 2 + (view[0] * x + view[4] * y + view[8] * z + view[12]) * focal / depth;
        p[i + 1] = height / 2 - (view[1] * x + view[5] * y + view[9] * z + view[13]) * focal / depth;
      }
      for (let i = 0; i < indices.length; i += 3) {
        const a = indices[i] * 3, b = indices[i + 1] * 3, c = indices[i + 2] * 3;
        facing[i / 3] = +((p[b] - p[a]) * (p[c + 1] - p[a + 1]) - (p[b + 1] - p[a + 1]) * (p[c] - p[a]) < 0);
      }
      unsafe.fill(0, 0, width * height); winding.fill(0, 0, (width + 1) * height);
      for (let i = 0; i < indices.length; i += 3) if (facing[i / 3]) for (let e = 0; e < 3; e++) {
        const adjacent = g.neighbors[i + e]; if (adjacent >= 0 && facing[adjacent]) continue;
        const a = indices[i + e] * 3, b = indices[i + (e + 1) % 3] * 3, ax = p[a], ay = p[a + 1], bx = p[b], by = p[b + 1], dx = bx - ax, dy = by - ay;
        const y0 = Math.max(0, Math.floor(Math.min(ay, by) - EPS)), y1 = Math.min(height - 1, Math.floor(Math.max(ay, by) + EPS));
        for (let y = y0; y <= y1; y++) {
          const k0 = dy ? Math.max(0, Math.min(1, (y - ay) / dy)) : 0, k1 = dy ? Math.max(0, Math.min(1, (y + 1 - ay) / dy)) : 1;
          const x0 = Math.max(0, Math.floor(Math.min(ax + dx * k0, ax + dx * k1) - EPS)), x1 = Math.min(width - 1, Math.floor(Math.max(ax + dx * k0, ax + dx * k1) + EPS));
          for (let x = x0; x <= x1; x++) unsafe[y * width + x] = 1;
          if (y + 0.5 >= Math.min(ay, by) && y + 0.5 < Math.max(ay, by)) {
            const x = Math.max(0, Math.min(width, Math.ceil(ax + dx * (y + 0.5 - ay) / dy - 0.5)));
            winding[y * (width + 1) + x] += dy > 0 ? 1 : -1;
          }
        }
      }
      for (let y = 0; y < height; y++) { let inside = 0; for (let x = 0; x < width; x++) { inside += winding[y * (width + 1) + x]; if (inside && !unsafe[y * width + x]) certainty[y * width + x] = 1; } }
      return true;
    };
    const silhouetteMesh = (g) => {
      const t = g.transformed, p = g.projected, indices = g.indices, facing = g.facing, heads = g.heads, next = g.next;
      for (let i = 0; i < t.length; i += 3) {
        if (t[i + 2] >= -near) return false;
        p[i] = width / 2 - t[i] * focal / t[i + 2]; p[i + 1] = height / 2 + t[i + 1] * focal / t[i + 2];
      }
      for (let i = 0; i < indices.length; i += 3) {
        const a = indices[i] * 3, b = indices[i + 1] * 3, c = indices[i + 2] * 3;
        facing[i / 3] = +((p[b] - p[a]) * (p[c + 1] - p[a + 1]) - (p[b + 1] - p[a + 1]) * (p[c] - p[a]) < 0);
      }
      heads.fill(-1);
      for (let i = 0; i < indices.length; i += 3) if (facing[i / 3]) for (let e = 0; e < 3; e++) {
        const adjacent = g.neighbors[i + e]; if (adjacent >= 0 && facing[adjacent]) continue;
        const vertex = indices[i + e]; next[i + e] = heads[vertex]; heads[vertex] = i + e;
      }
      maskCtx.beginPath();
      for (let start = 0; start < heads.length; start++) while (heads[start] >= 0) {
        let vertex = start; maskCtx.moveTo(p[vertex * 3], p[vertex * 3 + 1]);
        do {
          const edge = heads[vertex]; if (edge < 0) break;
          heads[vertex] = next[edge]; vertex = indices[Math.floor(edge / 3) * 3 + (edge % 3 + 1) % 3];
          maskCtx.lineTo(p[vertex * 3], p[vertex * 3 + 1]); state.faces++;
        } while (vertex !== start);
        maskCtx.closePath();
      }
      maskCtx.fill(); maskCtx.stroke(); return true;
    };
    const mesh = (g, m, offset, certify) => {
      const v = g.source.verts, transformed = g.transformed, indices = g.indices;
      if (certify && (g.source === pile.core.geometry || g.source === altar.slab.geometry) && certifyMesh(g, m, offset)) certify = false;
      for (let a = 0; a < v.length; a += 3) {
        const x = m[offset] * v[a] + m[offset + 4] * v[a + 1] + m[offset + 8] * v[a + 2] + m[offset + 12], y = m[offset + 1] * v[a] + m[offset + 5] * v[a + 1] + m[offset + 9] * v[a + 2] + m[offset + 13], z = m[offset + 2] * v[a] + m[offset + 6] * v[a + 1] + m[offset + 10] * v[a + 2] + m[offset + 14];
        transformed[a] = view[0] * x + view[4] * y + view[8] * z + view[12]; transformed[a + 1] = view[1] * x + view[5] * y + view[9] * z + view[13]; transformed[a + 2] = view[2] * x + view[6] * y + view[10] * z + view[14];
      }
      if (!certify && silhouetteMesh(g)) return;
      maskCtx.beginPath();
      for (let i = 0; i < indices.length; i += 3) {
        for (let a = 0; a < 3; a++) { const j = indices[i + a] * 3; triangle[a * 3] = transformed[j]; triangle[a * 3 + 1] = transformed[j + 1]; triangle[a * 3 + 2] = transformed[j + 2]; }
        let count = 0;
        for (let a = 0; a < 3; a++) {
          const p = a * 3, q = (a + 1) % 3 * 3, inside = triangle[p + 2] <= -near, next = triangle[q + 2] <= -near;
          if (inside) { clipped[count * 3] = triangle[p]; clipped[count * 3 + 1] = triangle[p + 1]; clipped[count++ * 3 + 2] = triangle[p + 2]; }
          if (inside !== next) { const k = (-near - triangle[p + 2]) / (triangle[q + 2] - triangle[p + 2]); clipped[count * 3] = triangle[p] + (triangle[q] - triangle[p]) * k; clipped[count * 3 + 1] = triangle[p + 1] + (triangle[q + 1] - triangle[p + 1]) * k; clipped[count++ * 3 + 2] = -near; }
        }
        if (count < 3) continue;
        for (let a = 0; a < count; a++) {
          screen[a * 2] = width / 2 - clipped[a * 3] * focal / clipped[a * 3 + 2]; screen[a * 2 + 1] = height / 2 + clipped[a * 3 + 1] * focal / clipped[a * 3 + 2];
        }
        const reverse = (screen[2] - screen[0]) * (screen[5] - screen[1]) - (screen[3] - screen[1]) * (screen[4] - screen[0]) < 0;
        maskCtx.moveTo(screen[0], screen[1]);
        for (let a = 1; a < count; a++) { const j = (reverse ? count - a : a) * 2; maskCtx.lineTo(screen[j], screen[j + 1]); }
        maskCtx.closePath(); state.faces++;
        if (certify) { certifyTriangle(0, 2, 4); if (count === 4) certifyTriangle(0, 4, 6); }
      }
      maskCtx.fill(); maskCtx.stroke();
    };
    const draw = (camera, ctx, alpha, screenWidth, screenHeight) => {
      if (!live || alpha <= 0) return;
      const scale = Math.min(1, SIZE / Math.max(screenWidth, screenHeight)), w = Math.max(1, Math.ceil(screenWidth * scale)), h = Math.max(1, Math.ceil(screenHeight * scale));
      mat4.lookAt(view, camera.position, camera.target, camera.up || UP);
      let changed = version !== renderedVersion || w !== width || h !== height || lastView[16] !== camera.fov || lastView[17] !== camera.near || lastView[18] !== camera.far;
      for (let i = 0; i < 16; i++) if (lastView[i] !== view[i]) changed = true;
      if (changed) {
        if (w !== width || h !== height) { width = mask.width = rim.width = w; height = mask.height = rim.height = h; }
        lastView.set(view); lastView[16] = camera.fov; lastView[17] = camera.near; lastView[18] = camera.far; renderedVersion = version;
        focal = height / 2 / Math.tan(camera.fov / 2); near = camera.near;
        certainty.fill(0, 0, width * height); maskCtx.clearRect(0, 0, width, height); maskCtx.fillStyle = maskCtx.strokeStyle = "#d9c9a9"; maskCtx.lineWidth = 0.6; maskCtx.lineJoin = "round";
        state.considered = state.contained = state.outside = state.faces = 0;
        for (let i = 0; i < 2; i++) if (ordinaryVisible[i]) mesh(geometryOf(ordinary[i].geometry), ordinary[i].world, 0, true);
        for (let n = 0; n < instanceCount; n++) if (instanceBatch[n] !== 0) { const node = batches[instanceBatch[n]]; mesh(geometryOf(node.geometry), node.instanceData, instanceOffsets[n], true); }
        const stride = width + 1; sums.fill(0, 0, stride);
        for (let y = 0; y < height; y++) { let sum = 0; sums[(y + 1) * stride] = 0; for (let x = 0; x < width; x++) { sum += certainty[y * width + x]; sums[(y + 1) * stride + x + 1] = sums[y * stride + x + 1] + sum; } }
        for (let i = 2; i < ordinary.length; i++) if (ordinaryVisible[i]) mesh(geometryOf(ordinary[i].geometry), ordinary[i].world, 0, false);
        for (let n = 0; n < instanceCount; n++) if (instanceBatch[n] === 0) {
          state.considered++;
          if (!projectBounds(instanceBounds, n * 6)) { state.outside++; continue; }
          if (minX >= 0 && minY >= 0 && maxX <= width && maxY <= height && sums[maxY * stride + maxX] - sums[minY * stride + maxX] - sums[maxY * stride + minX] + sums[minY * stride + minX] === (maxX - minX) * (maxY - minY)) { state.contained++; continue; }
          mesh(geometryOf(pile.shell.geometry), pile.shell.instanceData, instanceOffsets[n], false);
        }
        rimCtx.clearRect(0, 0, width, height); rimCtx.globalCompositeOperation = "source-over";
        const spread = Math.max(1, 1.5 * scale);
        for (let y = -1; y <= 1; y++) for (let x = -1; x <= 1; x++) if (x || y) rimCtx.drawImage(mask, x * spread, y * spread);
        rimCtx.globalCompositeOperation = "destination-out"; rimCtx.drawImage(mask, 0, 0); state.updates++;
      }
      ctx.save(); ctx.globalAlpha = 0.18 * alpha; ctx.drawImage(rim, 0, 0, width, height, 0, 0, screenWidth, screenHeight); ctx.restore();
    };
    const dispose = () => {
      live = false; roots.length = ordinary.length = batches.length = 0; slots.clear(); geometryCache.clear(); instanceCount = state.instances = 0;
      mask.width = mask.height = rim.width = rim.height = 1;
    };
    return { owner, roots, includes, active: sync, distance, perceived, concealed, cameraVisibility, clear, boxClear, inView, draw, dispose, state, get version() { return version; } };
  };
  BL.pileGuides = { create };
})();
