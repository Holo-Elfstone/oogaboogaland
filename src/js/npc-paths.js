// Surface walkers follow the terrain's curve midpoints. Collision avoidance
// can leave a trail, and off-path destinations retain their final approach.
(() => {
  "use strict";
  const BL = window.BL = window.BL || {};
  const CAPACITY = 4096, SPACING = 0.25, LOOK_AHEAD = 0.45;
  const create = ({ island, walkable }) => {
    const path = island.path, size = CAPACITY;
    const xs = new Float64Array(size), zs = new Float64Array(size), groups = new Int16Array(size), heads = new Int32Array(size);
    const edges = new Int32Array(size * 8), next = new Int32Array(size * 8), costs = new Float64Array(size * 8);
    const parents = new Int32Array(size), distances = new Float64Array(size), heap = new Int32Array(size), heapIndex = new Int32Array(size);
    let version = -1, count = 0, edgeCount = 0, heapCount = 0;
    const xAt = (i) => xs[i], zAt = (i) => zs[i];
    const createState = () => ({ tx: NaN, tz: NaN, version: -1, count: 0, index: 0, plans: 0,
      targetX: 0, targetZ: 0, route: new Int32Array(size) });
    const node = (x, z, group) => {
      if (count === size) throw new Error("NPC path node capacity exceeded");
      xs[count] = x; zs[count] = z; groups[count] = group; heads[count] = -1;
      return count++;
    };
    const connect = (a, b) => {
      if (edgeCount + 2 > edges.length) throw new Error("NPC path edge capacity exceeded");
      const length = Math.hypot(xs[a] - xs[b], zs[a] - zs[b]);
      edges[edgeCount] = b; costs[edgeCount] = length; next[edgeCount] = heads[a]; heads[a] = edgeCount++;
      edges[edgeCount] = a; costs[edgeCount] = length; next[edgeCount] = heads[b]; heads[b] = edgeCount++;
    };
    const rebuild = () => {
      version = path.version; count = edgeCount = 0;
      const radius = path.debug.ringCenterRadius;
      if (path.debug.active) {
        const steps = Math.ceil(Math.PI * 2 * radius / SPACING);
        for (let n = 0; n < steps; n++) {
          const angle = n / steps * Math.PI * 2;
          node(Math.sin(angle) * radius, -Math.cos(angle) * radius, 0);
          if (n) connect(n - 1, n);
        }
        connect(0, steps - 1);
      }
      for (let line = 0; line < path.centerlines.length; line++) {
        const points = path.centerlines[line];
        let previous = -1;
        for (let n = 1; n < points.length; n++) {
          const a = points[n - 1], b = points[n], dx = b.x - a.x, dz = b.z - a.z;
          const steps = Math.ceil(Math.hypot(dx, dz) / SPACING);
          for (let k = n === 1 ? 0 : 1; k <= steps; k++) {
            const t = k / steps, x = a.x + dx * t, z = a.z + dz * t;
            if (Math.hypot(x, z) < radius || !island.isPath(x, z)) { previous = -1; continue; }
            const i = node(x, z, line + 1);
            if (previous >= 0) connect(previous, i);
            previous = i;
          }
        }
      }
      // Join curve ends at the ring and at the frontage/pass junctions. Do
      // not connect parallel curves merely because their path masks overlap.
      for (let i = 0; i < count; i++) {
        if (!groups[i] || heads[i] < 0 || next[heads[i]] >= 0) continue;
        let closest = -1, best = 0.75 ** 2;
        for (let j = 0; j < count; j++) {
          if (groups[j] === groups[i]) continue;
          const distance = (xs[i] - xs[j]) ** 2 + (zs[i] - zs[j]) ** 2;
          if (distance < best) { closest = j; best = distance; }
        }
        if (closest >= 0) connect(i, closest);
      }
    };
    const nearest = (x, z) => {
      let closest = -1, best = Infinity;
      for (let i = 0; i < count; i++) {
        const distance = (xs[i] - x) ** 2 + (zs[i] - z) ** 2;
        if (distance < best) { closest = i; best = distance; }
      }
      return closest;
    };
    const enqueue = (i) => {
      let at = heapIndex[i];
      if (at < 0) at = heapCount++;
      while (at) {
        const parent = (at - 1) >> 1, above = heap[parent];
        if (distances[above] <= distances[i]) break;
        heap[at] = above; heapIndex[above] = at; at = parent;
      }
      heap[at] = i; heapIndex[i] = at;
    };
    const dequeue = () => {
      const result = heap[0], last = heap[--heapCount]; heapIndex[result] = -2;
      if (heapCount) {
        let at = 0;
        while (at * 2 + 1 < heapCount) {
          let child = at * 2 + 1;
          if (child + 1 < heapCount && distances[heap[child + 1]] < distances[heap[child]]) child++;
          if (distances[last] <= distances[heap[child]]) break;
          heap[at] = heap[child]; heapIndex[heap[at]] = at; at = child;
        }
        heap[at] = last; heapIndex[last] = at;
      }
      return result;
    };
    const plan = (state, x, z, tx, tz) => {
      if (version !== path.version) rebuild();
      state.tx = tx; state.tz = tz; state.version = version; state.count = state.index = 0; state.plans++;
      const start = nearest(x, z), end = nearest(tx, tz);
      if (start < 0 || end < 0 || start === end) return;
      parents.fill(-1, 0, count); distances.fill(Infinity, 0, count); heapIndex.fill(-1, 0, count); heapCount = 0;
      distances[end] = 0; parents[end] = end; enqueue(end);
      while (heapCount) {
        const i = dequeue();
        if (i === start) break;
        for (let e = heads[i]; e >= 0; e = next[e]) {
          const j = edges[e], distance = distances[i] + costs[e];
          if (heapIndex[j] === -2 || distance >= distances[j]) continue;
          distances[j] = distance; parents[j] = i; enqueue(j);
        }
      }
      if (parents[start] < 0) return;
      const length = Math.hypot(xs[start] - x, zs[start] - z) + distances[start] + Math.hypot(xs[end] - tx, zs[end] - tz);
      if (length > Math.hypot(tx - x, tz - z) * 2.5 + 3) return;
      for (let i = start; ; i = parents[i]) {
        state.route[state.count++] = i;
        if (i === end) break;
      }
    };
    const target = (cave, tx, tz) => {
      const state = cave.pathing, p = cave.root.position, feet = p.y - cave.baseY;
      state.targetX = tx; state.targetZ = tz;
      if (feet < -0.05 || Math.abs(feet - island.surfaceAt(p.x, p.z)) > 0.1 || cave.bedTravel.mode) { state.tx = NaN; return; }
      if (state.tx !== tx || state.tz !== tz || state.version !== path.version) plan(state, p.x, p.z, tx, tz);
      if (state.index >= state.count) return;
      let index = state.index, fraction = 0, best = Infinity;
      // Project onto the curve and aim a short distance along it. Continuous
      // progress avoids the steering corrections of discrete tile waypoints.
      for (let n = state.index; n < Math.min(state.count - 1, state.index + 32); n++) {
        const a = state.route[n], b = state.route[n + 1], dx = xs[b] - xs[a], dz = zs[b] - zs[a], length2 = dx * dx + dz * dz;
        const t = length2 ? Math.max(0, Math.min(1, ((p.x - xs[a]) * dx + (p.z - zs[a]) * dz) / length2)) : 1;
        const distance = (xs[a] + dx * t - p.x) ** 2 + (zs[a] + dz * t - p.z) ** 2;
        if (distance < best) { best = distance; index = n; fraction = t; }
      }
      state.index = index;
      const last = state.route[state.count - 1];
      if (state.count - index <= 2 && Math.hypot(xs[last] - p.x, zs[last] - p.z) < 0.2) { state.index = state.count; return; }
      let x = xs[state.route[index]], z = zs[state.route[index]], remaining = best < 0.75 ** 2 ? LOOK_AHEAD : 0;
      for (let n = index; n < state.count - 1; n++) {
        const a = state.route[n], b = state.route[n + 1], dx = xs[b] - xs[a], dz = zs[b] - zs[a], length = Math.hypot(dx, dz);
        const t = n === index ? fraction : 0;
        const available = length * (1 - t), aim = length ? t + Math.min(remaining, available) / length : 1;
        x = xs[a] + dx * aim; z = zs[a] + dz * aim;
        if (remaining <= available) break;
        remaining -= available;
      }
      if (walkable && !walkable(x, z, x, z, island.surfaceAt(x, z), cave.bodyHeight, cave)) {
        for (let n = index + 1; n < Math.min(state.count, index + 32); n++) {
          const i = state.route[n];
          if (!walkable(xs[i], zs[i], xs[i], zs[i], island.surfaceAt(xs[i], zs[i]), cave.bodyHeight, cave)) continue;
          state.index = n; x = xs[i]; z = zs[i]; break;
        }
      }
      state.targetX = x; state.targetZ = z;
    };
    const routeState = createState();
    // Bed journeys allocate their authored route only at departure. Share
    // the same surface centerlines before and after the underground portion.
    const route = (from, to) => {
      plan(routeState, from.x, from.z, to.x, to.z);
      const result = [from];
      for (let n = 0; n < routeState.count; n++) {
        const i = routeState.route[n];
        result.push({ x: xs[i], y: island.surfaceAt(xs[i], zs[i]), z: zs[i] });
      }
      result.push(to);
      return result;
    };
    return { createState, target, route, xAt, zAt, capacity: size, get nodes() { return count; }, buffers: xs.byteLength + zs.byteLength + groups.byteLength + heads.byteLength + edges.byteLength + next.byteLength + costs.byteLength + parents.byteLength + distances.byteLength + heap.byteLength + heapIndex.byteLength + routeState.route.byteLength };
  };
  BL.npcPaths = { create };
})();
