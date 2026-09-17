(() => {
  "use strict";
  const BL = window.BL = window.BL || {};
  const { mat4 } = BL.math;
  const EPS = 1e-7, geometries = new WeakMap();
  // The render mesh is also the collision shell. A shared local-space tree
  // preserves openings in arches, branches and aircraft without voxelizing
  // each placed copy or rebuilding its triangles when a prop moves.
  const geometryOf = (geometry) => {
    let cached = geometries.get(geometry);
    if (cached) return cached;
    const vertices = geometry.verts, triangles = [], bounds = [], order = [];
    for (const face of geometry.faces) for (let i = 1; i + 1 < face.i.length; i++) {
      const a = face.i[0] * 3, b = face.i[i] * 3, c = face.i[i + 1] * 3;
      const ux = vertices[b] - vertices[a], uy = vertices[b + 1] - vertices[a + 1], uz = vertices[b + 2] - vertices[a + 2];
      const vx = vertices[c] - vertices[a], vy = vertices[c + 1] - vertices[a + 1], vz = vertices[c + 2] - vertices[a + 2];
      if (Math.hypot(uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx) < 1e-12) continue;
      order.push(order.length);
      triangles.push(a, b, c);
      bounds.push(Math.min(vertices[a], vertices[b], vertices[c]), Math.min(vertices[a + 1], vertices[b + 1], vertices[c + 1]), Math.min(vertices[a + 2], vertices[b + 2], vertices[c + 2]),
        Math.max(vertices[a], vertices[b], vertices[c]), Math.max(vertices[a + 1], vertices[b + 1], vertices[c + 1]), Math.max(vertices[a + 2], vertices[b + 2], vertices[c + 2]));
    }
    const nodes = [];
    const build = (from, to) => {
      const box = [Infinity, Infinity, Infinity, -Infinity, -Infinity, -Infinity];
      for (let i = from; i < to; i++) for (let axis = 0; axis < 3; axis++) {
        box[axis] = Math.min(box[axis], bounds[order[i] * 6 + axis]);
        box[axis + 3] = Math.max(box[axis + 3], bounds[order[i] * 6 + axis + 3]);
      }
      const index = nodes.length, node = { box, from, to, left: -1, right: -1 };
      nodes.push(node);
      if (to - from > 8) {
        let axis = 0;
        if (box[4] - box[1] > box[3] - box[0]) axis = 1;
        if (box[5] - box[2] > box[axis + 3] - box[axis]) axis = 2;
        const sorted = order.slice(from, to).sort((a, b) => bounds[a * 6 + axis] + bounds[a * 6 + axis + 3] - bounds[b * 6 + axis] - bounds[b * 6 + axis + 3]);
        for (let i = 0; i < sorted.length; i++) order[from + i] = sorted[i];
        const middle = (from + to) >>> 1;
        node.left = build(from, middle); node.right = build(middle, to);
      }
      return index;
    };
    if (order.length) build(0, order.length);
    cached = { vertices, triangles: new Uint32Array(triangles), order: new Uint32Array(order), nodes };
    geometries.set(geometry, cached);
    return cached;
  };
  const create = () => {
    const entries = [], registered = new Map(), transforms = new WeakMap(), stack = new Int32Array(64), triangle = new Float64Array(9), query = new Float64Array(6);
    const stats = { nodes: 0, active: 0, transforms: 0, triangles: 0, queries: 0, triangleTests: 0 };
    let generation = 0;
    // Refresh only registered meshes and their ancestors, once per sync.
    // The scene's normal render traversal handles every unrelated node.
    const refreshWorld = (node) => {
      const stamp = transforms.get(node);
      if (stamp === generation) return true;
      if (stamp === -generation) return false;
      const active = node.visible && (!node.parent || refreshWorld(node.parent));
      transforms.set(node, active ? generation : -generation);
      if (!active) return false;
      if (node.quaternion) mat4.fromTQS(node.local, node.position, node.quaternion, node.scale);
      else mat4.fromTRS(node.local, node.position, node.rotation, node.scale);
      if (node.parent) mat4.multiply(node.world, node.parent.world, node.local);
      else node.world.set(node.local);
      stats.transforms++;
      return true;
    };
    const belongs = (node, root) => {
      for (let at = node; at; at = at.parent) if (at === root) return true;
      return false;
    };
    const add = (root) => {
      const visit = (node) => {
        if (node.geometry && node.geometry.faces.length && !node.instanceData && !registered.has(node)) {
          const geometry = geometryOf(node.geometry);
          if (geometry.nodes.length) {
            const entry = { node, geometry, world: mat4.create(), inverse: mat4.create(), box: new Float64Array(6), active: false, initialized: false, orientation: 1 };
            entries.push(entry); registered.set(node, entry);
            stats.triangles += geometry.triangles.length / 3;
          }
        }
        for (const child of node.children) visit(child);
      };
      visit(root); stats.nodes = entries.length;
    };
    const remove = (root) => {
      for (let i = entries.length - 1; i >= 0; i--) if (belongs(entries[i].node, root)) {
        stats.triangles -= entries[i].geometry.triangles.length / 3;
        registered.delete(entries[i].node); entries.splice(i, 1);
      }
      stats.nodes = entries.length;
    };
    const sync = () => {
      generation++;
      stats.active = stats.transforms = 0;
      for (const entry of entries) {
        entry.active = refreshWorld(entry.node);
        if (!entry.active) continue;
        const world = entry.node.world;
        let changed = !entry.initialized;
        for (let i = 0; i < 16 && !changed; i++) changed = world[i] !== entry.world[i];
        if (changed) {
          const determinant = world[0] * (world[5] * world[10] - world[6] * world[9]) - world[4] * (world[1] * world[10] - world[2] * world[9]) + world[8] * (world[1] * world[6] - world[2] * world[5]);
          // Opening crates can collapse their scale to zero before removal.
          if (Math.abs(determinant) < 1e-12) { entry.active = false; continue; }
          entry.orientation = determinant < 0 ? -1 : 1;
          entry.world.set(world); mat4.invert(entry.inverse, world); entry.initialized = true;
          const box = entry.geometry.nodes[0].box;
          const x = (box[0] + box[3]) / 2, y = (box[1] + box[4]) / 2, z = (box[2] + box[5]) / 2;
          const hx = (box[3] - box[0]) / 2, hy = (box[4] - box[1]) / 2, hz = (box[5] - box[2]) / 2;
          for (let axis = 0; axis < 3; axis++) {
            const center = world[axis] * x + world[axis + 4] * y + world[axis + 8] * z + world[axis + 12];
            const reach = Math.abs(world[axis]) * hx + Math.abs(world[axis + 4]) * hy + Math.abs(world[axis + 8]) * hz;
            entry.box[axis] = center - reach; entry.box[axis + 3] = center + reach;
          }
        }
        stats.active++;
      }
    };
    const overlaps = (box, x0, y0, z0, x1, y1, z1) => box[0] <= x1 + EPS && box[3] >= x0 - EPS && box[1] <= y1 + EPS && box[4] >= y0 - EPS && box[2] <= z1 + EPS && box[5] >= z0 - EPS;
    const localQuery = (entry, x0, y0, z0, x1, y1, z1) => {
      const m = entry.inverse, x = (x0 + x1) / 2, y = (y0 + y1) / 2, z = (z0 + z1) / 2, hx = (x1 - x0) / 2, hy = (y1 - y0) / 2, hz = (z1 - z0) / 2;
      for (let axis = 0; axis < 3; axis++) {
        const center = m[axis] * x + m[axis + 4] * y + m[axis + 8] * z + m[axis + 12];
        const reach = Math.abs(m[axis]) * hx + Math.abs(m[axis + 4]) * hy + Math.abs(m[axis + 8]) * hz;
        query[axis] = center - reach; query[axis + 3] = center + reach;
      }
    };
    const transformTriangle = (entry, index) => {
      const geometry = entry.geometry, vertices = geometry.vertices, m = entry.world;
      for (let i = 0; i < 3; i++) {
        const from = geometry.triangles[index * 3 + i], to = i * 3, x = vertices[from], y = vertices[from + 1], z = vertices[from + 2];
        triangle[to] = m[0] * x + m[4] * y + m[8] * z + m[12];
        triangle[to + 1] = m[1] * x + m[5] * y + m[9] * z + m[13];
        triangle[to + 2] = m[2] * x + m[6] * y + m[10] * z + m[14];
      }
      stats.triangleTests++;
    };
    // Maximum height of a triangle over a circular footprint, including
    // contacts along its edges and the steepest point inside the disk.
    const triangleTop = (x, z, radius, direction) => {
      const ax = triangle[0], ay = triangle[1] * direction, az = triangle[2];
      const bx = triangle[3] - ax, by = triangle[4] * direction - ay, bz = triangle[5] - az, cx = triangle[6] - ax, cy = triangle[7] * direction - ay, cz = triangle[8] - az;
      const determinant = bx * cz - bz * cx;
      if (Math.abs(determinant) < 1e-12) return -Infinity;
      const gx = (by * cz - cy * bz) / determinant, gz = (bx * cy - cx * by) / determinant, length = Math.hypot(gx, gz), scale = length ? radius / length : 0;
      const px = x + gx * scale - ax, pz = z + gz * scale - az, u = (px * cz - pz * cx) / determinant, v = (bx * pz - bz * px) / determinant;
      let top = u >= -EPS && v >= -EPS && u + v <= 1 + EPS ? ay + gx * px + gz * pz : -Infinity;
      for (let edge = 0; edge < 3; edge++) {
        const p = edge * 3, q = (edge + 1) % 3 * 3, dx = triangle[q] - triangle[p], dz = triangle[q + 2] - triangle[p + 2], dy = (triangle[q + 1] - triangle[p + 1]) * direction;
        const length2 = dx * dx + dz * dz;
        if (!length2) continue;
        const ex = x - triangle[p], ez = z - triangle[p + 2], middle = (ex * dx + ez * dz) / length2, rx = ex - dx * middle, rz = ez - dz * middle, remaining = radius * radius - rx * rx - rz * rz;
        if (remaining < -1e-12) continue;
        const half = Math.sqrt(Math.max(0, remaining) / length2), lo = Math.max(0, middle - half), hi = Math.min(1, middle + half);
        if (lo <= hi) top = Math.max(top, triangle[p + 1] * direction + dy * (dy > 0 ? hi : lo));
      }
      return top;
    };
    const surfaceAt = (x, z, y, maxStep, radius, ignore, direction) => {
      stats.queries++;
      let best = -Infinity;
      const limit = y * direction + maxStep;
      for (const entry of entries) {
        const box = entry.box;
        if (!entry.active || ignore && belongs(entry.node, ignore) || box[0] > x + radius || box[3] < x - radius || box[2] > z + radius || box[5] < z - radius) continue;
        const low = direction > 0 ? box[1] : Math.max(box[1], y - maxStep), high = direction > 0 ? Math.min(box[4], y + maxStep) : box[4];
        if (low > high + EPS) continue;
        localQuery(entry, x - radius, low, z - radius, x + radius, high, z + radius);
        let size = 1; stack[0] = 0;
        while (size) {
          const node = entry.geometry.nodes[stack[--size]];
          if (!overlaps(node.box, query[0], query[1], query[2], query[3], query[4], query[5])) continue;
          if (node.left >= 0) { stack[size++] = node.left; stack[size++] = node.right; continue; }
          for (let i = node.from; i < node.to; i++) {
            transformTriangle(entry, entry.geometry.order[i]);
            const ny = ((triangle[5] - triangle[2]) * (triangle[6] - triangle[0]) - (triangle[3] - triangle[0]) * (triangle[8] - triangle[2])) * entry.orientation;
            if (ny * direction <= 1e-10) continue;
            const top = triangleTop(x, z, radius, direction);
            if (top <= limit + EPS && top > best) best = top;
          }
        }
      }
      return best * direction;
    };
    // A half-open edge convention counts shared diagonals only once. Signed
    // crossings also handle overlapping closed parts of a merged model.
    const inside = (entry, x, y, z) => {
      if (!overlaps(entry.box, x, y, z, x, y, z)) return false;
      localQuery(entry, x, y, z, x, entry.box[4] + EPS, z);
      let winding = 0, size = 1; stack[0] = 0;
      while (size) {
        const node = entry.geometry.nodes[stack[--size]];
        if (!overlaps(node.box, query[0], query[1], query[2], query[3], query[4], query[5])) continue;
        if (node.left >= 0) { stack[size++] = node.left; stack[size++] = node.right; continue; }
        for (let i = node.from; i < node.to; i++) {
          transformTriangle(entry, entry.geometry.order[i]);
          const determinant = (triangle[3] - triangle[0]) * (triangle[8] - triangle[2]) - (triangle[5] - triangle[2]) * (triangle[6] - triangle[0]);
          if (Math.abs(determinant) < 1e-12) continue;
          let covered = true;
          const sign = determinant < 0 ? -1 : 1;
          for (let edge = 0; edge < 3; edge++) {
            const a = edge * 3, b = (edge + 1) % 3 * 3, dx = (triangle[b] - triangle[a]) * sign, dz = (triangle[b + 2] - triangle[a + 2]) * sign;
            const cross = dx * (z - triangle[a + 2]) - dz * (x - triangle[a]);
            if (cross < -1e-12 || Math.abs(cross) <= 1e-12 && !(dz > 0 || dz === 0 && dx < 0)) { covered = false; break; }
          }
          if (!covered) continue;
          const height = triangleTop(x, z, 0, 1);
          if (height > y + EPS) winding -= sign * entry.orientation;
        }
      }
      return winding > 0;
    };
    const segmentClear = (x, y, z, toX, toY, toZ, radius, height, ignore = null) => {
      stats.queries++;
      const x0 = Math.min(x, toX) - radius, x1 = Math.max(x, toX) + radius, y0 = Math.min(y, toY), y1 = Math.max(y, toY) + height, z0 = Math.min(z, toZ) - radius, z1 = Math.max(z, toZ) + radius;
      for (const entry of entries) {
        if (!entry.active || ignore && belongs(entry.node, ignore) || !overlaps(entry.box, x0, y0, z0, x1, y1, z1)) continue;
        if (inside(entry, x, y + height / 2, z) || inside(entry, toX, toY + height / 2, toZ)) return false;
        localQuery(entry, x0, y0, z0, x1, y1, z1);
        let size = 1; stack[0] = 0;
        while (size) {
          const node = entry.geometry.nodes[stack[--size]];
          if (!overlaps(node.box, query[0], query[1], query[2], query[3], query[4], query[5])) continue;
          if (node.left >= 0) { stack[size++] = node.left; stack[size++] = node.right; continue; }
          for (let i = node.from; i < node.to; i++) {
            transformTriangle(entry, entry.geometry.order[i]);
            if (Math.max(triangle[1], triangle[4], triangle[7]) <= y0 + EPS || Math.min(triangle[1], triangle[4], triangle[7]) >= y1 - EPS) continue;
            if (BL.convex.sweptCylinder(triangle, x, y, z, toX, toY, toZ, radius, height)) return false;
          }
        }
      }
      return true;
    };
    return {
      add, remove, sync, segmentClear, stats,
      clearAt: (x, y, z, radius, height, ignore = null) => segmentClear(x, y, z, x, y, z, radius, height, ignore),
      supportAt: (x, z, y, maxStep = 0, radius = 0, ignore = null) => surfaceAt(x, z, y, maxStep, radius, ignore, 1),
      ceilingAt: (x, z, y, radius = 0, ignore = null) => surfaceAt(x, z, y, 0, radius, ignore, -1),
      dispose() { entries.length = 0; registered.clear(); stats.nodes = stats.active = stats.transforms = stats.triangles = 0; }
    };
  };
  BL.solidProps = { create };
})();
