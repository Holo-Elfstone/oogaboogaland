// Fixed walking routes between the meadow and the headquarters beds.
(() => {
  "use strict";
  const BL = window.BL = window.BL || {};
  const RADIUS = 0.3, HEIGHT = 2, STEP = 0.6, SAMPLE = 0.125;
  const create = ({ island, beds, walkable = null }) => {
    const H = island.headquarters, points = [], edges = [], bedNodes = new Map(), surface = [];
    const floorAt = (x, y, z) => island.supportAt(x, z, y, STEP, -120, RADIUS);
    const clear = (x, y, z) => island.clearAt(x, y + STEP, z, RADIUS, HEIGHT - STEP) && island.ceilingAt(x, y, z, RADIUS) >= y + HEIGHT - 1e-7;
    const segment = (a, b, surfaceOnly = false) => {
      const count = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.z - a.z) / SAMPLE));
      let x = a.x, y = a.y, z = a.z;
      if (!clear(x, y, z)) return false;
      for (let i = 1; i <= count; i++) {
        const t = i / count, nx = a.x + (b.x - a.x) * t, nz = a.z + (b.z - a.z) * t, guide = a.y + (b.y - a.y) * t;
        const ny = floorAt(nx, surfaceOnly ? island.surfaceAt(nx, nz) : guide, nz);
        // A route follows support, never a drop into another layer or the shaft.
        if ((surfaceOnly ? ny < -1e-7 : Math.abs(ny - guide) > STEP + 1e-6) || Math.abs(ny - y) > STEP + 1e-6 || !clear(nx, ny, nz)) return false;
        if (!island.voxelSegmentClearAt(x, y + STEP, z, nx, ny + STEP, nz, RADIUS, HEIGHT - STEP)) return false;
        if (walkable && !walkable(x, z, nx, nz, y, HEIGHT)) return false;
        x = nx; y = ny; z = nz;
      }
      return Math.abs(y - b.y) < 0.025;
    };
    const node = (x, y, z) => {
      const floor = floorAt(x, y, z);
      if (Math.abs(floor - y) > STEP + 1e-6 || !clear(x, floor, z)) throw new Error(`Headquarters sleep waypoint has no clear floor: ${x},${y},${z} (support ${floor})`);
      const id = points.length;
      points.push({ x, y: floor, z }); edges.push([]);
      return id;
    };
    const link = (a, b) => {
      if (!segment(points[a], points[b]) || !segment(points[b], points[a])) return false;
      const p = points[a], q = points[b], cost = Math.hypot(p.x - q.x, p.y - q.y, p.z - q.z);
      edges[a].push({ to: b, cost }); edges[b].push({ to: a, cost });
      return true;
    };
    const requireLink = (a, b) => { if (!link(a, b)) throw new Error(`Headquarters sleep route crosses rock: ${a} to ${b}`); };
    const ring = (radius, y, count) => {
      const ids = [];
      for (let i = 0; i < count; i++) { const angle = i * Math.PI * 2 / count; ids.push(node(Math.sin(angle) * radius, y, -Math.cos(angle) * radius)); }
      for (let i = 0; i < count; i++) requireLink(ids[i], ids[(i + 1) % count]);
      return ids;
    };
    const joinRing = (id, ids) => {
      const p = points[id]; let closest = 0, distance = Infinity;
      for (let i = 0; i < ids.length; i++) { const q = points[ids[i]], d = (p.x - q.x) ** 2 + (p.z - q.z) ** 2; if (d < distance) { distance = d; closest = i; } }
      requireLink(id, ids[closest]);
    };
    const chain = (samples) => {
      let first = -1, previous = -1;
      for (const p of samples) {
        const id = node(p.x, p.y, p.z);
        if (previous >= 0) requireLink(previous, id); else first = id;
        previous = id;
      }
      return { first, last: previous };
    };
    surface.push(...ring(17, 0, 72));
    const upper = ring(11, H.floor, 48), lower = ring(7, H.basement.floor, 48);
    for (const ramp of H.ramps) {
      const m = island.mouths.find((mouth) => mouth.id === ramp.id), apron = node(m.apron.x, 0, m.apron.z), route = chain(ramp.samples);
      joinRing(apron, surface); requireLink(apron, route.first); joinRing(route.last, upper);
    }
    for (const ramp of H.basement.ramps) {
      const route = chain(ramp.samples);
      joinRing(route.first, upper); joinRing(route.last, lower);
    }
    for (const bed of beds) {
      const room = bed.room, approach = node(room.approach.x, room.floor, room.approach.z), entrance = node(room.entrance.x, room.floor, room.entrance.z), center = node(room.x, room.floor, room.z), at = bed.walkAt;
      const end = node(at.x, room.floor, at.z);
      joinRing(approach, room.basement ? lower : upper);
      requireLink(approach, entrance); requireLink(entrance, center); requireLink(center, end);
      bedNodes.set(bed, end);
    }
    // Search storage belongs to this visit and is reused for each state change.
    const size = points.length, distance = new Float64Array(size), previous = new Int32Array(size), visited = new Uint8Array(size);
    const candidates = new Int32Array(16), candidateDistance = new Float64Array(16);
    const attach = (from, onlySurface, out) => {
      candidates.fill(-1); candidateDistance.fill(Infinity);
      const count = onlySurface ? surface.length : size;
      for (let j = 0; j < count; j++) {
        const id = onlySurface ? surface[j] : j, p = points[id];
        if (!onlySurface && Math.abs(p.y - from.y) > STEP + 1e-6) continue;
        const d = Math.hypot(p.x - from.x, p.y - from.y, p.z - from.z);
        if (d >= candidateDistance[15]) continue;
        let k = 15;
        while (k > 0 && d < candidateDistance[k - 1]) { candidates[k] = candidates[k - 1]; candidateDistance[k] = candidateDistance[k - 1]; k--; }
        candidates[k] = id; candidateDistance[k] = d;
      }
      for (let i = 0; i < candidates.length; i++) if (candidates[i] >= 0 && segment(from, points[candidates[i]], onlySurface) && segment(points[candidates[i]], from, onlySurface)) out.push({ id: candidates[i], cost: candidateDistance[i] });
    };
    const route = (x, y, z, bed, toBed, homeX = 0, homeZ = -16) => {
      const from = { x, y, z }, starts = [], ends = [];
      attach(from, y >= -0.1, starts);
      let target = null;
      if (toBed) {
        const id = bedNodes.get(bed);
        if (id === undefined) return null;
        ends.push({ id, cost: 0 });
      } else {
        target = { x: homeX, y: island.surfaceAt(homeX, homeZ), z: homeZ };
        attach(target, true, ends);
      }
      if (!starts.length || !ends.length) return null;
      distance.fill(Infinity); previous.fill(-1); visited.fill(0);
      for (const start of starts) distance[start.id] = start.cost;
      for (let count = 0; count < size; count++) {
        let current = -1, best = Infinity;
        for (let i = 0; i < size; i++) if (!visited[i] && distance[i] < best) { best = distance[i]; current = i; }
        if (current < 0) break;
        visited[current] = 1;
        for (const edge of edges[current]) {
          const next = best + edge.cost;
          if (next < distance[edge.to]) { distance[edge.to] = next; previous[edge.to] = current; }
        }
      }
      let end = -1, best = Infinity;
      for (const candidate of ends) if (distance[candidate.id] + candidate.cost < best) { best = distance[candidate.id] + candidate.cost; end = candidate.id; }
      if (end < 0) return null;
      const result = [];
      for (let i = end; i >= 0; i = previous[i]) result.push(points[i]);
      result.push(from); result.reverse();
      if (target) result.push(target);
      return result;
    };
    return { route, points, radius: RADIUS, height: HEIGHT, nodeCount: size, edgeCount: edges.reduce((sum, list) => sum + list.length, 0) / 2 };
  };
  BL.headquartersSleep = { create };
})();
