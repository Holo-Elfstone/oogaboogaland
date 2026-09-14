// Cached camera silhouettes and exact local-space visibility queries.
(() => {
  "use strict";
  const BL = window.BL = window.BL || {};
  const RANGE = 12, SURFACE_STEP = 0.1, EDGE_STEP = 0.035, EPS = 1e-6;
  const create = ({ roots, crew, exclude = [], providers = [] }) => {
    const excluded = new Set(exclude), geometries = new Map(), registered = [], seen = new Set(), entries = new Map(), ownerEntries = new Map(), ownerGroups = [];
    const aliases = new Map(), providerOwners = new Map();
    for (const provider of providers) {
      providerOwners.set(provider.owner, provider);
      for (const node of provider.roots) aliases.set(node, provider.owner);
    }
    const sceneRoot = roots.length ? roots[0].parent : null, stack = new Int32Array(64);
    let candidates = [], occluders = [], cameraOccluders = [], targetOccluders = [];
    let lines = new Float32Array(0), owners = [], nearOwners = [], nearDistances = new Float64Array(0);
    const result = { lines, owners, count: 0, contours: 0, capacity: 0, version: 0, occlusionVersion: 0, nearOwners, nearDistances, nearCount: 0, nearVersion: 0, ownerCapacity: 0 };
    const stats = { geometries: 0, registered: 0, candidates: 0, occluders: 0, cameraOccluders: 0, limit: 0, nodes: 0, owners: 0, nearOwners: 0, triangles: 0, samples: 0, perceptionQueries: 0, perceptionCacheHits: 0 };
    const characterRoots = new Map();
    let targetCount = 0, targetStamp = -1, targetOwnerCache = null, targetX = 0, targetY = 0, targetZ = 0, targetRadius = 0;
    const cameraView = BL.math.mat4.create(), worldUp = { x: 0, y: 1, z: 0 };
    let candidateCount = 0, occluderCount = 0, cameraOccluderCount = 0, collectStamp = 0;
    let activeCamera = null, cameraAspect = 1, hasCamera = false, near = 0, far = Infinity, tanX = 1, tanY = 1, planeX = 1, planeY = 1, cameraX = 0, cameraY = 0, cameraZ = 0;
    const cameraIncludes = (x, y, z, radius) => {
      if (!hasCamera) return true;
      const m = cameraView, cx = m[0] * x + m[4] * y + m[8] * z + m[12], cy = m[1] * x + m[5] * y + m[9] * z + m[13], depth = -(m[2] * x + m[6] * y + m[10] * z + m[14]);
      return depth + radius >= near && depth - radius <= far && Math.abs(cx) <= depth * tanX + radius * planeX && Math.abs(cy) <= depth * tanY + radius * planeY;
    };
    const cameraBoundsIncludes = (worldX, worldY, worldZ, hx, hy, hz) => {
      const m = cameraView, x = worldX - cameraX, y = worldY - cameraY, z = worldZ - cameraZ, depth = -(m[2] * x + m[6] * y + m[10] * z);
      const reach = Math.abs(m[2]) * hx + Math.abs(m[6]) * hy + Math.abs(m[10]) * hz;
      if (depth + reach < near || depth - reach > far) return false;
      for (let side = -1; side <= 1; side += 2) for (let axis = 0; axis < 2; axis++) {
        const tan = axis ? tanY : tanX, nx = side * m[axis] + tan * m[2], ny = side * m[axis + 4] + tan * m[6], nz = side * m[axis + 8] + tan * m[10];
        if (nx * x + ny * y + nz * z > Math.abs(nx) * hx + Math.abs(ny) * hy + Math.abs(nz) * hz) return false;
      }
      return true;
    };
    const cameraBoxIncludes = (e) => cameraBoundsIncludes(e.x, e.y, e.z, e.hx, e.hy, e.hz);
    const geometryOf = (geometry) => {
      if (!geometry || excluded.has(geometry) || geometry.matrixGlyph || !geometry.faces || !geometry.faces.length) return null;
      let cached = geometries.get(geometry);
      if (cached) return cached;
      const v = geometry.verts, triangles = [], triangleBounds = [], coverFaces = [], edgeMap = new Map(), planes = new Map(), surfacePoints = new Map();
      const vertexKey = (i) => `${Math.round(v[i] / EPS)},${Math.round(v[i + 1] / EPS)},${Math.round(v[i + 2] / EPS)}`;
      const sample = (x, y, z) => { const key = `${Math.round(x / EPS)},${Math.round(y / EPS)},${Math.round(z / EPS)}`; if (!surfacePoints.has(key)) surfacePoints.set(key, [x, y, z]); };
      for (let faceIndex = 0; faceIndex < geometry.faces.length; faceIndex++) {
        const face = geometry.faces[faceIndex];
        if (face.i.length < 3) continue;
        const a = face.i[0] * 3, b = face.i[1] * 3, c = face.i[2] * 3;
        const ux = v[b] - v[a], uy = v[b + 1] - v[a + 1], uz = v[b + 2] - v[a + 2], vx = v[c] - v[a], vy = v[c + 1] - v[a + 1], vz = v[c + 2] - v[a + 2];
        let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
        const length = Math.hypot(nx, ny, nz);
        if (length < EPS) continue;
        nx /= length; ny /= length; nz /= length;
        let convex = true;
        for (let j = 0; j < face.i.length && convex; j++) {
          const p = face.i[j] * 3, q = face.i[(j + 1) % face.i.length] * 3;
          if (Math.abs(nx * (v[p] - v[a]) + ny * (v[p + 1] - v[a + 1]) + nz * (v[p + 2] - v[a + 2])) > 1e-7) { convex = false; break; }
          const ux = v[q] - v[p], uy = v[q + 1] - v[p + 1], uz = v[q + 2] - v[p + 2];
          for (const vertex of face.i) {
            const r = vertex * 3, vx = v[r] - v[p], vy = v[r + 1] - v[p + 1], vz = v[r + 2] - v[p + 2];
            if ((uy * vz - uz * vy) * nx + (uz * vx - ux * vz) * ny + (ux * vy - uy * vx) * nz < -1e-7) { convex = false; break; }
          }
        }
        if (convex) coverFaces.push(faceIndex);
        const planeKey = `${Math.round(nx / EPS)},${Math.round(ny / EPS)},${Math.round(nz / EPS)},${Math.round((nx * v[a] + ny * v[a + 1] + nz * v[a + 2]) / EPS)}`;
        let plane = planes.get(planeKey);
        if (!plane) { plane = []; planes.set(planeKey, plane); }
        const bounds = [Infinity, Infinity, Infinity, -Infinity, -Infinity, -Infinity];
        for (const vertex of face.i) for (let axis = 0; axis < 3; axis++) { bounds[axis] = Math.min(bounds[axis], v[vertex * 3 + axis]); bounds[axis + 3] = Math.max(bounds[axis + 3], v[vertex * 3 + axis]); }
        plane.push({ face, bounds });
        let centerX = 0, centerY = 0, centerZ = 0;
        for (const vertex of face.i) {
          const at = vertex * 3;
          centerX += v[at]; centerY += v[at + 1]; centerZ += v[at + 2];
          sample(v[at], v[at + 1], v[at + 2]);
        }
        // Interior witnesses are needed when a window reveals only a patch
        // between every vertex, face center and outer contour. Project a
        // regular grid onto the actual convex face; paint seams deduplicate.
        const normal = [nx, ny, nz];
        let drop = 0;
        if (Math.abs(ny) > Math.abs(normal[drop])) drop = 1;
        if (Math.abs(nz) > Math.abs(normal[drop])) drop = 2;
        const u = (drop + 1) % 3, w = (drop + 2) % 3;
        const nu = Math.max(1, Math.ceil((bounds[u + 3] - bounds[u]) / SURFACE_STEP)), nw = Math.max(1, Math.ceil((bounds[w + 3] - bounds[w]) / SURFACE_STEP)), point = [0, 0, 0];
        const interior = (pu, pw) => {
          // Some tube quads bend slightly. Interpolate their actual triangle
          // fan so every witness lies on a rendered surface, not its plane.
          for (let j = 1; j < face.i.length - 1; j++) {
            const b = face.i[j] * 3, c = face.i[j + 1] * 3, bu = v[b + u] - v[a + u], bw = v[b + w] - v[a + w], cu = v[c + u] - v[a + u], cw = v[c + w] - v[a + w], determinant = bu * cw - bw * cu;
            if (Math.abs(determinant) < 1e-12) continue;
            const du = pu - v[a + u], dw = pw - v[a + w], beta = (du * cw - dw * cu) / determinant, gamma = (bu * dw - bw * du) / determinant;
            if (beta < -EPS || gamma < -EPS || beta + gamma > 1 + EPS) continue;
            point[u] = pu; point[w] = pw; point[drop] = v[a + drop] + beta * (v[b + drop] - v[a + drop]) + gamma * (v[c + drop] - v[a + drop]);
            sample(point[0], point[1], point[2]); return;
          }
        };
        const center = [centerX / face.i.length, centerY / face.i.length, centerZ / face.i.length];
        interior(center[u], center[w]);
        for (let iu = 0; iu < nu; iu++) for (let iw = 0; iw < nw; iw++) interior(bounds[u] + (bounds[u + 3] - bounds[u]) * (iu + 0.5) / nu, bounds[w] + (bounds[w + 3] - bounds[w]) * (iw + 0.5) / nw);
        for (let j = 1; j < face.i.length - 1; j++) {
          const b = face.i[j] * 3, c = face.i[j + 1] * 3;
          triangles.push(v[a], v[a + 1], v[a + 2], v[b] - v[a], v[b + 1] - v[a + 1], v[b + 2] - v[a + 2], v[c] - v[a], v[c + 1] - v[a + 1], v[c + 2] - v[a + 2]);
          triangleBounds.push(Math.min(v[a], v[b], v[c]), Math.min(v[a + 1], v[b + 1], v[c + 1]), Math.min(v[a + 2], v[b + 2], v[c + 2]), Math.max(v[a], v[b], v[c]), Math.max(v[a + 1], v[b + 1], v[c + 1]), Math.max(v[a + 2], v[b + 2], v[c + 2]));
        }
        for (let j = 0; j < face.i.length; j++) {
          const a = face.i[j] * 3, b = face.i[(j + 1) % face.i.length] * 3, ak = vertexKey(a), bk = vertexKey(b), key = ak < bk ? `${ak}:${bk}` : `${bk}:${ak}`;
          const existing = edgeMap.get(key);
          if (existing) {
            existing.shared = true;
            if (existing.nx * nx + existing.ny * ny + existing.nz * nz < 0.9999) existing.crease = true;
            if (!existing.normals.some((n) => n[0] * nx + n[1] * ny + n[2] * nz > 0.999999)) existing.normals.push([nx, ny, nz]);
          } else edgeMap.set(key, { a, b, nx, ny, nz, plane, normals: [[nx, ny, nz]], shared: false, crease: false });
        }
      }
      // Merge collinear structural spans after eliminating paint-pixel and
      // triangle diagonals shared by faces on the same plane.
      const groups = new Map(), edges = [];
      for (const edge of edgeMap.values()) {
        if (edge.shared && !edge.crease) continue;
        const a = edge.a, b = edge.b;
        let dx = v[b] - v[a], dy = v[b + 1] - v[a + 1], dz = v[b + 2] - v[a + 2], length = Math.hypot(dx, dy, dz);
        if (length < EPS) continue;
        dx /= length; dy /= length; dz /= length;
        if (!edge.crease && edge.plane.length > 1) {
          // A large paint rectangle can meet several small ones. Their
          // mismatched edge endpoints are still a coplanar seam, not a crease.
          const x = (v[a] + v[b]) * 0.5 - (edge.ny * dz - edge.nz * dy) * 0.001;
          const y = (v[a + 1] + v[b + 1]) * 0.5 - (edge.nz * dx - edge.nx * dz) * 0.001;
          const z = (v[a + 2] + v[b + 2]) * 0.5 - (edge.nx * dy - edge.ny * dx) * 0.001;
          let covered = false;
          for (const entry of edge.plane) {
            const box = entry.bounds;
            if (x < box[0] - EPS || x > box[3] + EPS || y < box[1] - EPS || y > box[4] + EPS || z < box[2] - EPS || z > box[5] + EPS) continue;
            const indices = entry.face.i;
            let inside = true;
            for (let j = 0; j < indices.length; j++) {
              const p = indices[j] * 3, q = indices[(j + 1) % indices.length] * 3;
              const ux = v[q] - v[p], uy = v[q + 1] - v[p + 1], uz = v[q + 2] - v[p + 2], vx = x - v[p], vy = y - v[p + 1], vz = z - v[p + 2];
              if ((uy * vz - uz * vy) * edge.nx + (uz * vx - ux * vz) * edge.ny + (ux * vy - uy * vx) * edge.nz < -EPS) { inside = false; break; }
            }
            if (inside) { covered = true; break; }
          }
          if (covered) continue;
        }
        if (Math.abs(dx) > EPS ? dx < 0 : Math.abs(dy) > EPS ? dy < 0 : dz < 0) { dx = -dx; dy = -dy; dz = -dz; }
        const round = (n) => Math.round(n / EPS), ax = v[a], ay = v[a + 1], az = v[a + 2];
        edge.normals.sort((a, b) => a[0] - b[0] || a[1] - b[1] || a[2] - b[2]);
        const faces = edge.normals.map((n) => `${round(n[0])},${round(n[1])},${round(n[2])}`).join(":");
        const key = `${round(dx)},${round(dy)},${round(dz)}:${round(ay * dz - az * dy)},${round(az * dx - ax * dz)},${round(ax * dy - ay * dx)}:${faces}`;
        let group = groups.get(key);
        const start = ax * dx + ay * dy + az * dz, end = v[b] * dx + v[b + 1] * dy + v[b + 2] * dz;
        if (!group) { group = { ax, ay, az, dx, dy, dz, origin: start, normals: edge.normals, spans: [] }; groups.set(key, group); }
        group.spans.push([Math.min(start, end), Math.max(start, end)]);
      }
      for (const g of groups.values()) {
        g.spans.sort((a, b) => a[0] - b[0]);
        let lo = Infinity, hi = -Infinity;
        const emit = () => { if (hi - lo > 0.025) edges.push({ g, lo, hi }); };
        for (const span of g.spans) {
          if (span[0] > hi + EPS * 4) { emit(); lo = span[0]; hi = span[1]; }
          else hi = Math.max(hi, span[1]);
        }
        emit();
      }
      edges.sort((a, b) => b.hi - b.lo - a.hi + a.lo);
      const edgeLines = new Float32Array(edges.length * 6);
      const edgeStarts = new Uint32Array(edgeLines.length / 6 + 1), edgeNormals = [];
      for (let i = 0; i < edgeLines.length / 6; i++) {
        edgeStarts[i] = edgeNormals.length;
        for (const n of edges[i].g.normals) edgeNormals.push(...n);
      }
      edgeStarts[edgeLines.length / 6] = edgeNormals.length;
      for (let i = 0; i < edgeLines.length / 6; i++) for (let end = 0; end < 2; end++) {
        const e = edges[i], g = e.g, t = (end ? e.hi : e.lo) - g.origin, at = i * 6 + end * 3;
        edgeLines[at] = g.ax + g.dx * t; edgeLines[at + 1] = g.ay + g.dy * t; edgeLines[at + 2] = g.az + g.dz * t;
      }
      const samples = new Float32Array(surfacePoints.size * 3);
      let sampleAt = 0;
      for (const point of surfacePoints.values()) { samples[sampleAt++] = point[0]; samples[sampleAt++] = point[1]; samples[sampleAt++] = point[2]; }
      surfacePoints.clear();
      const count = triangles.length / 9;
      if (!count) return null;
      const indices = Array.from({ length: count }, (_, i) => i), bounds = [], left = [], right = [], starts = [], counts = [];
      const build = (lo, hi) => {
        const id = left.length, b = [Infinity, Infinity, Infinity, -Infinity, -Infinity, -Infinity];
        for (let n = lo; n < hi; n++) { const at = indices[n] * 6; for (let axis = 0; axis < 3; axis++) { b[axis] = Math.min(b[axis], triangleBounds[at + axis]); b[axis + 3] = Math.max(b[axis + 3], triangleBounds[at + axis + 3]); } }
        bounds.push(...b); left.push(-1); right.push(-1); starts.push(lo); counts.push(hi - lo);
        if (hi - lo <= 8) return id;
        let axis = 0; if (b[4] - b[1] > b[3] - b[0]) axis = 1; if (b[5] - b[2] > b[axis + 3] - b[axis]) axis = 2;
        const ordered = indices.slice(lo, hi).sort((a, b) => triangleBounds[a * 6 + axis] + triangleBounds[a * 6 + axis + 3] - triangleBounds[b * 6 + axis] - triangleBounds[b * 6 + axis + 3]);
        for (let n = 0; n < ordered.length; n++) indices[lo + n] = ordered[n];
        const middle = (lo + hi) >> 1;
        left[id] = build(lo, middle); right[id] = build(middle, hi); counts[id] = 0;
        return id;
      };
      if (count) build(0, count);
      cached = { lines: edgeLines, samples, coverFaces: new Uint32Array(coverFaces), edgeStarts, edgeNormals: new Float64Array(edgeNormals), triangles: new Float64Array(triangles), indices: new Uint32Array(indices), bounds: new Float64Array(bounds), left: new Int32Array(left), right: new Int32Array(right), starts: new Uint32Array(starts), counts: new Uint32Array(counts), sphere: BL.scene.boundsOf(geometry) };
      geometries.set(geometry, cached); stats.geometries++; stats.triangles += count; stats.samples += samples.length / 3;
      return cached;
    };
    const groupOf = (owner) => {
      let group = ownerEntries.get(owner);
      if (!group) {
        group = []; group.owner = owner; group.provider = providerOwners.get(owner) || null;
        group.stamp = group.retained = group.revision = 0; group.near = group.active = false; group.providerVersion = -1; group.providerActive = false;
        group.cacheActor = group.cacheTerrain = null; group.cacheOcclusion = group.cacheRevision = -1; group.cacheResult = false; group.observer = new Float64Array(6);
        ownerEntries.set(owner, group); ownerGroups.push(group);
      }
      return group;
    };
    const registerNode = (node, owner = node, character = -1) => {
      if (node.sightHidden) return;
      seen.add(node);
      if (aliases.has(node)) owner = aliases.get(node);
      if (character < 0 && characterRoots.has(owner)) character = characterRoots.get(owner);
      if (node.geometry && !node.instanceData) {
        const geometry = geometryOf(node.geometry);
        if (geometry) {
          let entry = entries.get(node);
          if (!entry) {
            const group = groupOf(owner);
            entry = { node, owner, group, character, geometry, capacity: 0, source: node.geometry, inverse: BL.math.mat4.create(), world: new Float64Array(16), visible: false, shown: false, x: 0, y: 0, z: 0, radius: 0, hx: 0, hy: 0, hz: 0 };
            registered.push(entry); entries.set(node, entry); group.push(entry);
          }
          entry.capacity = geometry.lines.length / 6;
        }
      }
      for (const child of node.children) registerNode(child, owner, character);
    };
    const reserveHead = (cave) => {
      const open = geometryOf(cave.headOpen), closed = geometryOf(cave.headClosed), entry = cave.parts && entries.get(cave.parts.head);
      if (entry) entry.capacity = Math.max(entry.capacity, open ? open.lines.length / 6 : 0, closed ? closed.lines.length / 6 : 0);
    };
    const resize = () => {
      let capacity = 0;
      for (const entry of registered) if (!entry.group.provider) capacity += entry.capacity;
      const count = registered.length;
      if (candidates.length !== count) {
        candidates = new Array(count).fill(null); occluders = new Array(count).fill(null); cameraOccluders = new Array(count).fill(null); targetOccluders = new Array(count).fill(null);
      }
      if (result.capacity !== capacity) { lines = result.lines = new Float32Array(capacity * 6); owners = result.owners = new Array(capacity).fill(null); }
      if (result.ownerCapacity !== ownerGroups.length) { nearOwners = result.nearOwners = new Array(ownerGroups.length).fill(null); nearDistances = result.nearDistances = new Float64Array(ownerGroups.length); }
      result.capacity = stats.limit = capacity; result.ownerCapacity = stats.owners = ownerGroups.length; stats.nodes = stats.registered = count;
      candidates.fill(null); occluders.fill(null); cameraOccluders.fill(null); targetOccluders.fill(null); owners.fill(null); nearOwners.fill(null);
      targetOwnerCache = null; targetStamp = -1; targetCount = 0;
      result.count = result.contours = result.nearCount = candidateCount = occluderCount = cameraOccluderCount = 0;
      result.version++; result.nearVersion++; result.occlusionVersion++;
    };
    for (const provider of providers) groupOf(provider.owner);
    let characterIndex = 0;
    for (const cave of crew.cavemen.values()) {
      characterRoots.set(cave.root, characterIndex);
      registerNode(cave.root, cave.root, characterIndex++); reserveHead(cave);
    }
    for (const node of roots) registerNode(node);
    for (const cave of crew.cavemen.values()) reserveHead(cave);
    resize();
    const register = (node, owner = node, character = -1) => { registerNode(node, owner, character); resize(); };
    const visible = (node) => {
      if (!node.parent) return false;
      for (let p = node; p; p = p.parent) { if (!p.visible) return false; if (p === sceneRoot) return true; }
      return false;
    };
    const collect = (actor, ex, ey, ez, camera = null, aspect = 1, retainedOwners = null, retainedCount = 0) => {
      const actorRoot = actor && actor.root;
      let changed = false, occlusionChanged = false;
      candidateCount = occluderCount = cameraOccluderCount = 0; collectStamp++;
      if (retainedOwners) for (let n = 0; n < retainedCount; n++) {
        const group = ownerEntries.get(retainedOwners[n]);
        if (group) group.retained = collectStamp;
      }
      activeCamera = camera; cameraAspect = aspect; hasCamera = !!camera;
      for (let n = 0; n < ownerGroups.length; n++) {
        const group = ownerGroups[n], provider = group.provider;
        group.near = group.retained === collectStamp; group.active = false;
        if (provider) {
          const active = provider.active(), version = provider.version;
          if (group.providerActive !== active || group.providerVersion !== version) { group.revision++; occlusionChanged = true; }
          group.providerActive = active; group.providerVersion = version; group.active = active;
          if (active && provider.distance(ex, ey, ez) <= RANGE) group.near = true;
        }
      }
      const eyeX = camera ? camera.position.x : ex, eyeY = camera ? camera.position.y : ey, eyeZ = camera ? camera.position.z : ez;
      cameraX = eyeX; cameraY = eyeY; cameraZ = eyeZ;
      const rayX = ex - eyeX, rayY = ey - eyeY, rayZ = ez - eyeZ, rayLength2 = rayX * rayX + rayY * rayY + rayZ * rayZ;
      if (camera) {
        BL.math.mat4.lookAt(cameraView, camera.position, camera.target, camera.up || worldUp);
        near = camera.near; far = camera.far; tanY = Math.tan(camera.fov / 2); tanX = tanY * aspect;
        planeX = Math.hypot(1, tanX); planeY = Math.hypot(1, tanY);
      }
      for (let n = 0; n < registered.length; n++) {
        const entry = registered[n], node = entry.node, geometry = geometries.get(node.geometry), w = node.world;
        const scaleX = Math.hypot(w[0], w[1], w[2]), scaleY = Math.hypot(w[4], w[5], w[6]), scaleZ = Math.hypot(w[8], w[9], w[10]);
        const shown = !!geometry && scaleX * scaleY * scaleZ > 1e-12 && visible(node) && (!entry.group.provider || !entry.group.provider.includes || entry.group.provider.includes(node)), active = shown && entry.owner !== actorRoot;
        const wasActive = entry.visible, wasShown = entry.shown;
        let moved = wasShown !== shown || entry.source !== node.geometry;
        for (let i = 0; i < 16; i++) if (entry.world[i] !== w[i]) { moved = true; entry.world[i] = w[i]; }
        entry.visible = active; entry.shown = shown; entry.source = node.geometry;
        if (geometry) entry.geometry = geometry;
        if (moved) {
          if (active || wasActive) occlusionChanged = true;
          if (shown || wasShown) entry.group.revision++;
          if (shown) {
            BL.math.mat4.invert(entry.inverse, w);
            const b = geometry.sphere, p = b.center;
            entry.x = w[0] * p[0] + w[4] * p[1] + w[8] * p[2] + w[12];
            entry.y = w[1] * p[0] + w[5] * p[1] + w[9] * p[2] + w[13];
            entry.z = w[2] * p[0] + w[6] * p[1] + w[10] * p[2] + w[14];
            entry.radius = b.radius * Math.max(scaleX, scaleY, scaleZ);
            const hx = (b.max[0] - b.min[0]) * 0.5, hy = (b.max[1] - b.min[1]) * 0.5, hz = (b.max[2] - b.min[2]) * 0.5;
            entry.hx = Math.abs(w[0]) * hx + Math.abs(w[4]) * hy + Math.abs(w[8]) * hz;
            entry.hy = Math.abs(w[1]) * hx + Math.abs(w[5]) * hy + Math.abs(w[9]) * hz;
            entry.hz = Math.abs(w[2]) * hx + Math.abs(w[6]) * hy + Math.abs(w[10]) * hz;
          }
        }
        if (active !== wasActive) occlusionChanged = true;
        if (!active) continue;
        // Blockers are independent of line distance and candidate caps: the
        // camera can be far away with an opaque object close to its eye.
        occluders[occluderCount++] = entry;
        const dx = entry.x - ex, dy = entry.y - ey, dz = entry.z - ez;
        const group = entry.group;
        group.active = true;
        if (Math.hypot(dx, dy, dz) - entry.radius <= RANGE) group.near = true;
      }
      let nearCount = 0, nearChanged = false;
      for (let n = 0; n < ownerGroups.length; n++) {
        const group = ownerGroups[n];
        if (!group.active || !group.near || group.owner === actorRoot) continue;
        const d = distance(group.owner, ex, ey, ez);
        if (nearOwners[nearCount] !== group.owner || nearDistances[nearCount] !== d) nearChanged = true;
        nearOwners[nearCount] = group.owner; nearDistances[nearCount++] = d;
      }
      for (let n = nearCount; n < result.nearCount; n++) nearOwners[n] = null;
      if (result.nearCount !== nearCount) nearChanged = true;
      result.nearCount = stats.nearOwners = nearCount; if (nearChanged) result.nearVersion++;
      // A nearby owner's whole contour remains eligible, including parts
      // beyond the proximity sphere. Expand the camera corridor accordingly
      // so a blocker beside those farther parts cannot be missed.
      let guideRange = RANGE;
      for (let n = 0; n < occluderCount; n++) {
        const entry = occluders[n];
        if (entry.group.near) guideRange = Math.max(guideRange, Math.hypot(entry.x - ex, entry.y - ey, entry.z - ez) + entry.radius);
      }
      for (let n = 0; n < occluderCount; n++) {
        const entry = occluders[n];
        const t = rayLength2 ? Math.max(0, Math.min(1, ((entry.x - eyeX) * rayX + (entry.y - eyeY) * rayY + (entry.z - eyeZ) * rayZ) / rayLength2)) : 0;
        const qx = entry.x - eyeX - rayX * t, qy = entry.y - eyeY - rayY * t, qz = entry.z - eyeZ - rayZ * t;
        if (!camera || qx * qx + qy * qy + qz * qz <= (guideRange + entry.radius) ** 2 && cameraIncludes(entry.x, entry.y, entry.z, entry.radius)) cameraOccluders[cameraOccluderCount++] = entry;
        if (entry.group.provider || !entry.group.near || !cameraIncludes(entry.x, entry.y, entry.z, entry.radius)) continue;
        candidates[candidateCount++] = entry;
      }
      let used = 0;
      for (let n = 0; n < candidateCount; n++) {
        const entry = candidates[n], geometry = entry.geometry, v = geometry.lines, w = entry.node.world, inverse = entry.inverse;
        const eyeX = inverse[0] * cameraX + inverse[4] * cameraY + inverse[8] * cameraZ + inverse[12], eyeY = inverse[1] * cameraX + inverse[5] * cameraY + inverse[9] * cameraZ + inverse[13], eyeZ = inverse[2] * cameraX + inverse[6] * cameraY + inverse[10] * cameraZ + inverse[14];
        for (let j = 0; j < v.length; j += 6) {
          const start = geometry.edgeStarts[j / 6], end = geometry.edgeStarts[j / 6 + 1], normals = geometry.edgeNormals;
          if (hasCamera && end - start > 3) {
            let front = false, back = false;
            for (let at = start; at < end; at += 3) {
              const facing = normals[at] * (eyeX - v[j]) + normals[at + 1] * (eyeY - v[j + 1]) + normals[at + 2] * (eyeZ - v[j + 2]);
              if (facing > EPS) front = true; else back = true;
            }
            if (!front || !back) continue;
          }
          const mx = (v[j] + v[j + 3]) * 0.5, my = (v[j + 1] + v[j + 4]) * 0.5, mz = (v[j + 2] + v[j + 5]) * 0.5;
          const dx = w[0] * mx + w[4] * my + w[8] * mz + w[12] - ex, dy = w[1] * mx + w[5] * my + w[9] * mz + w[13] - ey, dz = w[2] * mx + w[6] * my + w[10] * mz + w[14] - ez;
          const lx = v[j + 3] - v[j], ly = v[j + 4] - v[j + 1], lz = v[j + 5] - v[j + 2];
          const vx = w[0] * lx + w[4] * ly + w[8] * lz, vy = w[1] * lx + w[5] * ly + w[9] * lz, vz = w[2] * lx + w[6] * ly + w[10] * lz, length2 = vx * vx + vy * vy + vz * vz;
          if (!cameraIncludes(dx + ex, dy + ey, dz + ez, Math.sqrt(length2) / 2)) continue;
          for (let end = 0; end < 2; end++) {
            const at = j + end * 3, target = used * 6 + end * 3, x = v[at], y = v[at + 1], z = v[at + 2];
            const px = Math.fround(w[0] * x + w[4] * y + w[8] * z + w[12]), py = Math.fround(w[1] * x + w[5] * y + w[9] * z + w[13]), pz = Math.fround(w[2] * x + w[6] * y + w[10] * z + w[14]);
            if (lines[target] !== px || lines[target + 1] !== py || lines[target + 2] !== pz) changed = true;
            lines[target] = px; lines[target + 1] = py; lines[target + 2] = pz;
          }
          if (owners[used] !== entry.owner) changed = true;
          owners[used++] = entry.owner;
        }
      }
      if (result.count !== used) changed = true;
      for (let i = used; i < result.count; i++) owners[i] = null;
      result.count = result.contours = used; if (changed) result.version++; if (occlusionChanged) result.occlusionVersion++;
      stats.candidates = candidateCount; stats.occluders = occluderCount; stats.cameraOccluders = cameraOccluderCount;
      return result;
    };
    const boxHit = (bounds, at, ax, ay, az, dx, dy, dz) => {
      let lo = 0, hi = 1;
      for (let axis = 0; axis < 3; axis++) {
        const a = axis === 0 ? ax : axis === 1 ? ay : az, d = axis === 0 ? dx : axis === 1 ? dy : dz;
        if (Math.abs(d) < 1e-12) { if (a < bounds[at + axis] - EPS || a > bounds[at + axis + 3] + EPS) return false; }
        else {
          let t0 = (bounds[at + axis] - a) / d, t1 = (bounds[at + axis + 3] - a) / d;
          if (t0 > t1) { const t = t0; t0 = t1; t1 = t; }
          lo = Math.max(lo, t0); hi = Math.min(hi, t1); if (lo > hi + 1e-9) return false;
        }
      }
      return hi > 1e-5 && lo < 1 - 1e-5;
    };
    const entryClear = (e, ax, ay, az, vx, vy, vz, length) => {
      const t = length ? Math.max(0, Math.min(1, ((e.x - ax) * vx + (e.y - ay) * vy + (e.z - az) * vz) / length)) : 0;
      const sx = ax + vx * t - e.x, sy = ay + vy * t - e.y, sz = az + vz * t - e.z;
      if (sx * sx + sy * sy + sz * sz > (e.radius + EPS) ** 2) return true;
      const m = e.inverse, g = e.geometry;
      const x = m[0] * ax + m[4] * ay + m[8] * az + m[12], y = m[1] * ax + m[5] * ay + m[9] * az + m[13], z = m[2] * ax + m[6] * ay + m[10] * az + m[14];
      const dx = m[0] * vx + m[4] * vy + m[8] * vz, dy = m[1] * vx + m[5] * vy + m[9] * vz, dz = m[2] * vx + m[6] * vy + m[10] * vz;
      let top = 1; stack[0] = 0;
      while (top) {
        const id = stack[--top];
        if (!boxHit(g.bounds, id * 6, x, y, z, dx, dy, dz)) continue;
        if (!g.counts[id]) { stack[top++] = g.left[id]; stack[top++] = g.right[id]; continue; }
        for (let i = g.starts[id], end = i + g.counts[id]; i < end; i++) {
          const at = g.indices[i] * 9, v = g.triangles;
          const px = dy * v[at + 8] - dz * v[at + 7], py = dz * v[at + 6] - dx * v[at + 8], pz = dx * v[at + 7] - dy * v[at + 6];
          const det = v[at + 3] * px + v[at + 4] * py + v[at + 5] * pz;
          if (Math.abs(det) < 1e-10) continue;
          const tx = x - v[at], ty = y - v[at + 1], tz = z - v[at + 2], u = (tx * px + ty * py + tz * pz) / det;
          if (u < -1e-7 || u > 1 + 1e-7) continue;
          const qx = ty * v[at + 5] - tz * v[at + 4], qy = tz * v[at + 3] - tx * v[at + 5], qz = tx * v[at + 4] - ty * v[at + 3], w = (dx * qx + dy * qy + dz * qz) / det;
          if (w < -1e-7 || u + w > 1 + 1e-7) continue;
          const t = (v[at + 6] * qx + v[at + 7] * qy + v[at + 8] * qz) / det;
          if (t > 1e-5 && t < 1 - 1e-5) return false;
        }
      }
      return true;
    };
    const clear = (ax, ay, az, bx, by, bz, actor, targetOwner = null, fromCamera = false) => {
      const actorRoot = actor && actor.root;
      const vx = bx - ax, vy = by - ay, vz = bz - az, length = vx * vx + vy * vy + vz * vz;
      const pool = fromCamera === 2 ? targetOccluders : fromCamera ? cameraOccluders : occluders, count = fromCamera === 2 ? targetCount : fromCamera ? cameraOccluderCount : occluderCount;
      for (let n = 0; n < count; n++) {
        const e = pool[n]; if (e.owner === actorRoot || e.owner === targetOwner) continue;
        if (!entryClear(e, ax, ay, az, vx, vy, vz, length)) return false;
      }
      for (let n = 0; n < providers.length; n++) {
        const provider = providers[n], group = ownerEntries.get(provider.owner);
        if (group.providerActive && provider.owner !== actorRoot && provider.owner !== targetOwner && provider.clear && !provider.clear(ax, ay, az, bx, by, bz)) return false;
      }
      return true;
    };
    // Certify an entire ray volume only when every opaque bound misses it.
    // A false answer is inconclusive and falls back to the exact triangles.
    const boxClear = (minX, minY, minZ, maxX, maxY, maxZ, actor, targetOwner = null) => {
      const actorRoot = actor && actor.root;
      for (let n = 0; n < occluderCount; n++) {
        const e = occluders[n];
        if (e.owner === actorRoot || e.owner === targetOwner) continue;
        if (e.x + e.hx >= minX - EPS && e.x - e.hx <= maxX + EPS && e.y + e.hy >= minY - EPS && e.y - e.hy <= maxY + EPS && e.z + e.hz >= minZ - EPS && e.z - e.hz <= maxZ + EPS) return false;
      }
      for (let n = 0; n < providers.length; n++) {
        const provider = providers[n], group = ownerEntries.get(provider.owner);
        if (group.providerActive && provider.owner !== actorRoot && provider.owner !== targetOwner
          && (!provider.boxClear || !provider.boxClear(minX, minY, minZ, maxX, maxY, maxZ))) return false;
      }
      return true;
    };
    clear.boxClear = boxClear;
    const ownerClear = (owner, ax, ay, az, bx, by, bz) => {
      const group = ownerEntries.get(owner);
      if (!group) return true;
      const vx = bx - ax, vy = by - ay, vz = bz - az, length = vx * vx + vy * vy + vz * vz;
      for (let n = 0; n < group.length; n++) {
        const e = group[n];
        if (e.shown && !entryClear(e, ax, ay, az, vx, vy, vz, length)) return false;
      }
      return !(group.providerActive && group.provider.clear && !group.provider.clear(ax, ay, az, bx, by, bz));
    };
    const cameraClear = (ax, ay, az, bx, by, bz, actor, targetOwner = null) => {
      const group = targetOwner && ownerEntries.get(targetOwner);
      if (!group) return clear(ax, ay, az, bx, by, bz, actor, targetOwner, true);
      if (targetOwnerCache !== targetOwner || targetStamp !== collectStamp) {
        targetOwnerCache = targetOwner; targetStamp = collectStamp; targetCount = 0;
        const w = targetOwner.world;
        targetX = w[12]; targetY = w[13]; targetZ = w[14]; targetRadius = 0;
        for (let n = 0; n < group.length; n++) {
          const e = group[n];
          if (e.visible) targetRadius = Math.max(targetRadius, Math.hypot(e.x - targetX, e.y - targetY, e.z - targetZ) + e.radius);
        }
        // Every near-plane ray to this owner lies in this smaller capsule.
        // Reject unrelated objects once, retaining exact triangle tests for
        // every possible blocker and the original pool for other endpoints.
        const dx = targetX - cameraX, dy = targetY - cameraY, dz = targetZ - cameraZ, length = dx * dx + dy * dy + dz * dz;
        for (let n = 0; n < cameraOccluderCount; n++) {
          const e = cameraOccluders[n];
          if (e.owner === targetOwner) continue;
          const t = length ? Math.max(0, Math.min(1, ((e.x - cameraX) * dx + (e.y - cameraY) * dy + (e.z - cameraZ) * dz) / length)) : 0;
          if ((e.x - cameraX - dx * t) ** 2 + (e.y - cameraY - dy * t) ** 2 + (e.z - cameraZ - dz * t) ** 2 <= (targetRadius + e.radius + EPS) ** 2) targetOccluders[targetCount++] = e;
        }
      }
      const inside = (bx - targetX) ** 2 + (by - targetY) ** 2 + (bz - targetZ) ** 2 <= targetRadius * targetRadius + EPS
        && (ax - cameraX) ** 2 + (ay - cameraY) ** 2 + (az - cameraZ) ** 2 <= targetRadius * targetRadius + EPS;
      return clear(ax, ay, az, bx, by, bz, actor, targetOwner, inside ? 2 : true);
    };
    const distance = (owner, x, y, z) => {
      const group = ownerEntries.get(owner);
      let nearest = Infinity;
      if (group) for (let n = 0; n < group.length; n++) {
        const e = group[n];
        if (!e.visible) continue;
        const dx = x - e.x, dy = y - e.y, dz = z - e.z;
        const box = Math.hypot(Math.max(0, Math.abs(dx) - e.hx), Math.max(0, Math.abs(dy) - e.hy), Math.max(0, Math.abs(dz) - e.hz));
        nearest = Math.min(nearest, Math.max(0, box, Math.hypot(dx, dy, dz) - e.radius));
      }
      if (group && group.providerActive) nearest = Math.min(nearest, group.provider.distance(x, y, z));
      return nearest;
    };
    const inView = (owner) => {
      const group = ownerEntries.get(owner);
      if (!group) return false;
      for (let n = 0; n < group.length; n++) { const e = group[n]; if (e.visible && cameraIncludes(e.x, e.y, e.z, e.radius)) return true; }
      return !!(group.providerActive && group.provider.inView(activeCamera, cameraAspect));
    };
    const getProvider = (owner) => providerOwners.get(owner) || null;
    const pointPerceived = (px, py, pz, actor, eyeX, eyeY, eyeZ, segmentClear, owner) => {
      const center = actor.root.position;
      if ((px - center.x) ** 2 + (py - center.y) ** 2 + (pz - center.z) ** 2 > RANGE * RANGE) return false;
      const dx = px - eyeX, dy = py - eyeY, dz = pz - eyeZ, length = Math.hypot(dx, dy, dz), t = length > 0.018 ? 1 - 0.018 / length : 0;
      const bx = eyeX + dx * t, by = eyeY + dy * t, bz = eyeZ + dz * t;
      return segmentClear(eyeX, eyeY, eyeZ, bx, by, bz) && clear(eyeX, eyeY, eyeZ, bx, by, bz, actor, owner);
    };
    const entrySightBlocked = (entry, x, y, z, segmentClear) => {
      if (!segmentClear.boxSolid) return false;
      const dx = entry.x - x, dy = entry.y - y, dz = entry.z - z;
      const nearest = Math.hypot(Math.max(0, Math.abs(dx) - entry.hx), Math.max(0, Math.abs(dy) - entry.hy), Math.max(0, Math.abs(dz) - entry.hz));
      // Each cross-section contains every ray to the real entry bounds. It
      // must lie before even the closest retreated surface endpoint.
      const end = nearest > 0.018 ? 1 - 0.018 / nearest : 0;
      for (let i = 1; i < 16; i++) {
        const t = i / 16;
        if (t >= end) break;
        if (segmentClear.boxSolid(x + (dx - entry.hx) * t, y + (dy - entry.hy) * t, z + (dz - entry.hz) * t,
          x + (dx + entry.hx) * t, y + (dy + entry.hy) * t, z + (dz + entry.hz) * t)) return true;
      }
      return false;
    };
    const perceiveOwner = (group, actor, eyeX, eyeY, eyeZ, segmentClear) => {
      const owner = group.owner, center = actor.root.position;
      for (let n = 0; n < group.length; n++) {
        const entry = group[n];
        if (!entry.visible || Math.hypot(entry.x - center.x, entry.y - center.y, entry.z - center.z) - entry.radius > RANGE) continue;
        if (entrySightBlocked(entry, eyeX, eyeY, eyeZ, segmentClear)) continue;
        const geometry = entry.geometry, samples = geometry.samples, w = entry.node.world;
        for (let i = 0; i < samples.length; i += 3) {
          const x = samples[i], y = samples[i + 1], z = samples[i + 2];
          const px = w[0] * x + w[4] * y + w[8] * z + w[12], py = w[1] * x + w[5] * y + w[9] * z + w[13], pz = w[2] * x + w[6] * y + w[10] * z + w[14];
          if (pointPerceived(px, py, pz, actor, eyeX, eyeY, eyeZ, segmentClear, owner)) return true;
        }
        // The fallback is the actor-eye contour in every direction, never
        // the orbit camera's contour or frustum. Its witness set therefore
        // stays unchanged when the visitor turns, zooms or looks elsewhere.
        const v = geometry.lines, m = entry.inverse;
        const ex = m[0] * eyeX + m[4] * eyeY + m[8] * eyeZ + m[12], ey = m[1] * eyeX + m[5] * eyeY + m[9] * eyeZ + m[13], ez = m[2] * eyeX + m[6] * eyeY + m[10] * eyeZ + m[14];
        for (let j = 0; j < v.length; j += 6) {
          const start = geometry.edgeStarts[j / 6], end = geometry.edgeStarts[j / 6 + 1], normals = geometry.edgeNormals;
          if (end - start > 3) {
            let front = false, back = false;
            for (let at = start; at < end; at += 3) {
              const facing = normals[at] * (ex - v[j]) + normals[at + 1] * (ey - v[j + 1]) + normals[at + 2] * (ez - v[j + 2]);
              if (facing > EPS) front = true; else back = true;
            }
            if (!front || !back) continue;
          }
          const ax = w[0] * v[j] + w[4] * v[j + 1] + w[8] * v[j + 2] + w[12], ay = w[1] * v[j] + w[5] * v[j + 1] + w[9] * v[j + 2] + w[13], az = w[2] * v[j] + w[6] * v[j + 1] + w[10] * v[j + 2] + w[14];
          const dx = w[0] * v[j + 3] + w[4] * v[j + 4] + w[8] * v[j + 5] + w[12] - ax, dy = w[1] * v[j + 3] + w[5] * v[j + 4] + w[9] * v[j + 5] + w[13] - ay, dz = w[2] * v[j + 3] + w[6] * v[j + 4] + w[10] * v[j + 5] + w[14] - az;
          const steps = Math.max(1, Math.ceil(Math.hypot(dx, dy, dz) / EDGE_STEP));
          for (let i = 0; i <= steps; i++) { const t = i / steps; if (pointPerceived(ax + dx * t, ay + dy * t, az + dz * t, actor, eyeX, eyeY, eyeZ, segmentClear, owner)) return true; }
        }
      }
      return !!(group.providerActive && group.provider.perceived(actor, eyeX, eyeY, eyeZ, segmentClear, clear));
    };
    const perceived = (owner, actor, eyeX, eyeY, eyeZ, segmentClear) => {
      const group = ownerEntries.get(owner);
      if (!group) return false;
      const p = actor.root.position, o = group.observer;
      if (group.cacheActor === actor && group.cacheTerrain === segmentClear && group.cacheOcclusion === result.occlusionVersion && group.cacheRevision === group.revision
        && o[0] === p.x && o[1] === p.y && o[2] === p.z && o[3] === eyeX && o[4] === eyeY && o[5] === eyeZ) {
        stats.perceptionCacheHits++; return group.cacheResult;
      }
      stats.perceptionQueries++;
      group.cacheActor = actor; group.cacheTerrain = segmentClear; group.cacheOcclusion = result.occlusionVersion; group.cacheRevision = group.revision;
      o[0] = p.x; o[1] = p.y; o[2] = p.z; o[3] = eyeX; o[4] = eyeY; o[5] = eyeZ;
      group.cacheResult = perceiveOwner(group, actor, eyeX, eyeY, eyeZ, segmentClear);
      return group.cacheResult;
    };
    const entryVolumeClear = (entry, actor, segmentClear) => {
      if (!segmentClear.boxClear) return false;
      const minX = Math.min(cameraX, entry.x - entry.hx), minY = Math.min(cameraY, entry.y - entry.hy), minZ = Math.min(cameraZ, entry.z - entry.hz);
      const maxX = Math.max(cameraX, entry.x + entry.hx), maxY = Math.max(cameraY, entry.y + entry.hy), maxZ = Math.max(cameraZ, entry.z + entry.hz);
      return segmentClear.boxClear(minX, minY, minZ, maxX, maxY, maxZ) && boxClear(minX, minY, minZ, maxX, maxY, maxZ, actor, entry.owner);
    };
    const cameraPointState = (x, y, z, owner, actor, segmentClear, hidden, certified) => {
      const m = cameraView, dx = x - cameraX, dy = y - cameraY, dz = z - cameraZ;
      const depth = -(m[2] * dx + m[6] * dy + m[10] * dz);
      if (depth <= near || depth > far || Math.abs(m[0] * dx + m[4] * dy + m[8] * dz) > depth * tanX || Math.abs(m[1] * dx + m[5] * dy + m[9] * dz) > depth * tanY) return 0;
      const start = near / depth, end = 1 - 0.018 / Math.hypot(dx, dy, dz);
      if (end <= start) return 0;
      if (certified) return 1;
      const ax = cameraX + dx * start, ay = cameraY + dy * start, az = cameraZ + dz * start;
      const bx = cameraX + dx * end, by = cameraY + dy * end, bz = cameraZ + dz * end;
      // A clear ray to any surface proves some part of this owner visible,
      // even if a nearer part of the same owner covers the sampled surface.
      if (segmentClear(ax, ay, az, bx, by, bz) && cameraClear(ax, ay, az, bx, by, bz, actor, owner)) return 1;
      // A buried back face alone cannot qualify a wholly hidden object.
      return !hidden && ownerClear(owner, ax, ay, az, bx, by, bz) ? 2 : 0;
    };
    const concealed = (owner, actor, segmentClear) => {
      const group = ownerEntries.get(owner);
      if (!hasCamera || !group) return false;
      let hidden = false;
      for (let n = 0; n < group.length; n++) {
        const entry = group[n];
        if (!entry.visible || !cameraIncludes(entry.x, entry.y, entry.z, entry.radius)) continue;
        const geometry = entry.geometry, samples = geometry.samples, w = entry.node.world, certified = entryVolumeClear(entry, actor, segmentClear);
        for (let i = 0; i < samples.length; i += 3) {
          const x = samples[i], y = samples[i + 1], z = samples[i + 2];
          const state = cameraPointState(w[0] * x + w[4] * y + w[8] * z + w[12], w[1] * x + w[5] * y + w[9] * z + w[13], w[2] * x + w[6] * y + w[10] * z + w[14], owner, actor, segmentClear, hidden, certified);
          if (state === 1) return false;
          if (state === 2) hidden = true;
        }
        // Retain thin-slit witnesses on camera contours. Recognition uses its
        // separate actor-eye samples and never depends on these camera edges.
        const v = geometry.lines, m = entry.inverse;
        const ex = m[0] * cameraX + m[4] * cameraY + m[8] * cameraZ + m[12], ey = m[1] * cameraX + m[5] * cameraY + m[9] * cameraZ + m[13], ez = m[2] * cameraX + m[6] * cameraY + m[10] * cameraZ + m[14];
        for (let j = 0; j < v.length; j += 6) {
          const start = geometry.edgeStarts[j / 6], end = geometry.edgeStarts[j / 6 + 1], normals = geometry.edgeNormals;
          if (end - start > 3) {
            let front = false, back = false;
            for (let at = start; at < end; at += 3) {
              const facing = normals[at] * (ex - v[j]) + normals[at + 1] * (ey - v[j + 1]) + normals[at + 2] * (ez - v[j + 2]);
              if (facing > EPS) front = true; else back = true;
            }
            if (!front || !back) continue;
          }
          const ax = w[0] * v[j] + w[4] * v[j + 1] + w[8] * v[j + 2] + w[12], ay = w[1] * v[j] + w[5] * v[j + 1] + w[9] * v[j + 2] + w[13], az = w[2] * v[j] + w[6] * v[j + 1] + w[10] * v[j + 2] + w[14];
          const dx = w[0] * v[j + 3] + w[4] * v[j + 4] + w[8] * v[j + 5] + w[12] - ax, dy = w[1] * v[j + 3] + w[5] * v[j + 4] + w[9] * v[j + 5] + w[13] - ay, dz = w[2] * v[j + 3] + w[6] * v[j + 4] + w[10] * v[j + 5] + w[14] - az;
          const steps = Math.max(1, Math.ceil(Math.hypot(dx, dy, dz) / EDGE_STEP));
          for (let i = 0; i <= steps; i++) {
            const t = i / steps, state = cameraPointState(ax + dx * t, ay + dy * t, az + dz * t, owner, actor, segmentClear, hidden, certified);
            if (state === 1) return false;
            if (state === 2) hidden = true;
          }
        }
      }
      if (group.providerActive) {
        const state = group.provider.cameraVisibility(actor, activeCamera, cameraAspect, segmentClear, clear, ownerClear);
        if (state === 1) return false;
        if (state === 2) hidden = true;
      }
      return hidden;
    };
    const actorView = new Float64Array(20);
    let lastActor = null, lastActorTerrain = null, lastActorRevision = -1, lastActorOcclusion = -1, actorViewMode = 0, actorVisibleResult = false;
    actorView.fill(NaN);
    const actorViewChanged = (actor, group, segmentClear, mode) => {
      let changed = actorViewMode !== mode || lastActor !== actor || lastActorTerrain !== segmentClear || lastActorRevision !== group.revision || lastActorOcclusion !== result.occlusionVersion;
      for (let i = 0; i < 16; i++) if (actorView[i] !== cameraView[i]) { actorView[i] = cameraView[i]; changed = true; }
      if (actorView[16] !== near || actorView[17] !== far || actorView[18] !== tanX || actorView[19] !== tanY) changed = true;
      actorView[16] = near; actorView[17] = far; actorView[18] = tanX; actorView[19] = tanY;
      if (!changed) return false;
      lastActor = actor; lastActorTerrain = segmentClear; lastActorRevision = group.revision; lastActorOcclusion = result.occlusionVersion; actorViewMode = mode; actorVisibleResult = false;
      return true;
    };
    const section = new Float64Array(6);
    const boundsCameraRockBlocked = (worldX, worldY, worldZ, hx, hy, hz, segmentClear) => {
      const dx = worldX - cameraX, dy = worldY - cameraY, dz = worldZ - cameraZ;
      const firstTarget = -(cameraView[2] * dx + cameraView[6] * dy + cameraView[10] * dz)
        - Math.abs(cameraView[2]) * hx - Math.abs(cameraView[6]) * hy - Math.abs(cameraView[10]) * hz;
      // An eye just inside a wall may leave its rock before the first broad
      // distance fraction. Certify the actual ray cone immediately after the
      // near plane, then widen its depth in small deterministic increments.
      for (let step = 0; step < 10; step++) {
        const cut = near + (step ? 0.002 * 2 ** (step - 1) : 0.00001);
        if (cut >= firstTarget - 0.018) break;
        section[0] = section[1] = section[2] = Infinity; section[3] = section[4] = section[5] = -Infinity;
        for (let corner = 0; corner < 8; corner++) {
          const x = dx + (corner & 1 ? hx : -hx), y = dy + (corner & 2 ? hy : -hy), z = dz + (corner & 4 ? hz : -hz);
          const t = cut / -(cameraView[2] * x + cameraView[6] * y + cameraView[10] * z), px = cameraX + x * t, py = cameraY + y * t, pz = cameraZ + z * t;
          section[0] = Math.min(section[0], px); section[1] = Math.min(section[1], py); section[2] = Math.min(section[2], pz);
          section[3] = Math.max(section[3], px); section[4] = Math.max(section[4], py); section[5] = Math.max(section[5], pz);
        }
        if (segmentClear.boxSolid(section[0], section[1], section[2], section[3], section[4], section[5])) return true;
      }
      const axis = Math.abs(dx) >= Math.abs(dy) && Math.abs(dx) >= Math.abs(dz) ? 0 : Math.abs(dy) >= Math.abs(dz) ? 1 : 2;
      const span = axis === 0 ? dx : axis === 1 ? dy : dz, half = axis === 0 ? hx : axis === 1 ? hy : hz;
      if (Math.abs(span) <= half + 0.018) return false;
      const nearEnd = near * (-Math.sign(span) * cameraView[axis * 4 + 2] + tanX * Math.abs(cameraView[axis * 4]) + tanY * Math.abs(cameraView[axis * 4 + 1]));
      const grid = segmentClear.boxGrid;
      let gridCell = 0, gridCut = 0, gridEnd = 0, gridStep = 0;
      if (grid) {
        const sign = Math.sign(span), coordinate = axis === 0 ? cameraX : axis === 1 ? cameraY : cameraZ, origin = grid[axis + 1], unit = grid[0];
        gridCell = Math.floor((coordinate - origin) / unit);
        gridCut = origin + (gridCell + 0.5) * unit - coordinate;
        if (sign * gridCut <= EPS) { gridCell += sign; gridCut += sign * unit; }
        gridEnd = Math.abs(span) - half - 0.018;
        gridStep = sign * unit;
      }
      const sections = grid ? Math.ceil(gridEnd / grid[0]) + 1 : 15;
      for (let step = 1; step <= sections; step++) {
        const cut = grid ? gridCut + gridStep * (step - 1) : span * step / 16;
        if (Math.abs(span - cut) <= half + 0.018) break;
        // Off-screen box corners can point behind the eye. A cut beyond the
        // entire viewport's near plane still precedes every rendered body ray.
        const pastNear = Math.abs(cut) > nearEnd + EPS;
        section[0] = section[1] = section[2] = Infinity; section[3] = section[4] = section[5] = -Infinity;
        let valid = true;
        for (let corner = 0; corner < 8; corner++) {
          const x = dx + (corner & 1 ? hx : -hx), y = dy + (corner & 2 ? hy : -hy), z = dz + (corner & 4 ? hz : -hz);
          const t = cut / (axis === 0 ? x : axis === 1 ? y : z), depth = -(cameraView[2] * x + cameraView[6] * y + cameraView[10] * z);
          if (!pastNear && t * depth <= near + EPS) { valid = false; break; }
          const px = cameraX + x * t, py = cameraY + y * t, pz = cameraZ + z * t;
          section[0] = Math.min(section[0], px); section[1] = Math.min(section[1], py); section[2] = Math.min(section[2], pz);
          section[3] = Math.max(section[3], px); section[4] = Math.max(section[4], py); section[5] = Math.max(section[5], pz);
        }
        // A plane cross-section stays thin even for a deep body, so a thin
        // wall can certify every ray without closing any real window slit.
        if (valid && segmentClear.boxSolid(section[0], section[1], section[2], section[3], section[4], section[5])) return true;
      }
      return false;
    };
    const splitCameraRockBlocked = (worldX, worldY, worldZ, hx, hy, hz, segmentClear, depth) => {
      if (!cameraBoundsIncludes(worldX, worldY, worldZ, hx, hy, hz)) return true;
      if (boundsCameraRockBlocked(worldX, worldY, worldZ, hx, hy, hz, segmentClear)) return true;
      if (!depth) return false;
      const shx = hx / 2, shy = hy / 2, shz = hz / 2;
      for (let part = 0; part < 8; part++) if (!splitCameraRockBlocked(worldX + (part & 1 ? shx : -shx), worldY + (part & 2 ? shy : -shy), worldZ + (part & 4 ? shz : -shz), shx, shy, shz, segmentClear, depth - 1)) return false;
      return true;
    };
    const triangleCameraRockBlocked = (ax, ay, az, bx, by, bz, cx, cy, cz, segmentClear, depth) => {
      const minX = Math.min(ax, bx, cx), minY = Math.min(ay, by, cy), minZ = Math.min(az, bz, cz), maxX = Math.max(ax, bx, cx), maxY = Math.max(ay, by, cy), maxZ = Math.max(az, bz, cz);
      const worldX = (minX + maxX) / 2, worldY = (minY + maxY) / 2, worldZ = (minZ + maxZ) / 2, hx = (maxX - minX) / 2, hy = (maxY - minY) / 2, hz = (maxZ - minZ) / 2;
      if (!cameraBoundsIncludes(worldX, worldY, worldZ, hx, hy, hz)) return true;
      const adx = ax - cameraX, ady = ay - cameraY, adz = az - cameraZ, bdx = bx - cameraX, bdy = by - cameraY, bdz = bz - cameraZ, cdx = cx - cameraX, cdy = cy - cameraY, cdz = cz - cameraZ;
      const da = -(cameraView[2] * adx + cameraView[6] * ady + cameraView[10] * adz), db = -(cameraView[2] * bdx + cameraView[6] * bdy + cameraView[10] * bdz), dc = -(cameraView[2] * cdx + cameraView[6] * cdy + cameraView[10] * cdz), cut = near + 0.00001;
      if (Math.min(da, db, dc) > cut + 0.018) {
        const ta = cut / da, tb = cut / db, tc = cut / dc;
        const pax = cameraX + adx * ta, pay = cameraY + ady * ta, paz = cameraZ + adz * ta, pbx = cameraX + bdx * tb, pby = cameraY + bdy * tb, pbz = cameraZ + bdz * tb, pcx = cameraX + cdx * tc, pcy = cameraY + cdy * tc, pcz = cameraZ + cdz * tc;
        if (segmentClear.boxSolid(Math.min(pax, pbx, pcx), Math.min(pay, pby, pcy), Math.min(paz, pbz, pcz), Math.max(pax, pbx, pcx), Math.max(pay, pby, pcy), Math.max(paz, pbz, pcz))) return true;
      }
      if (boundsCameraRockBlocked(worldX, worldY, worldZ, hx, hy, hz, segmentClear)) return true;
      if (!depth) return false;
      const abx = (ax + bx) / 2, aby = (ay + by) / 2, abz = (az + bz) / 2, bcx = (bx + cx) / 2, bcy = (by + cy) / 2, bcz = (bz + cz) / 2, cax = (cx + ax) / 2, cay = (cy + ay) / 2, caz = (cz + az) / 2;
      return triangleCameraRockBlocked(ax, ay, az, abx, aby, abz, cax, cay, caz, segmentClear, depth - 1)
        && triangleCameraRockBlocked(abx, aby, abz, bx, by, bz, bcx, bcy, bcz, segmentClear, depth - 1)
        && triangleCameraRockBlocked(cax, cay, caz, bcx, bcy, bcz, cx, cy, cz, segmentClear, depth - 1)
        && triangleCameraRockBlocked(abx, aby, abz, bcx, bcy, bcz, cax, cay, caz, segmentClear, depth - 1);
    };
    const entryCameraRockBlocked = (entry, segmentClear) => {
      if (!segmentClear.boxSolid) return false;
      if (splitCameraRockBlocked(entry.x, entry.y, entry.z, entry.hx, entry.hy, entry.hz, segmentClear, 2)) return true;
      const triangles = entry.geometry.triangles, w = entry.node.world;
      for (let i = 0; i < triangles.length; i += 9) {
        const x = triangles[i], y = triangles[i + 1], z = triangles[i + 2], ux = triangles[i + 3], uy = triangles[i + 4], uz = triangles[i + 5], vx = triangles[i + 6], vy = triangles[i + 7], vz = triangles[i + 8];
        const ax = w[0] * x + w[4] * y + w[8] * z + w[12], ay = w[1] * x + w[5] * y + w[9] * z + w[13], az = w[2] * x + w[6] * y + w[10] * z + w[14];
        const bx = ax + w[0] * ux + w[4] * uy + w[8] * uz, by = ay + w[1] * ux + w[5] * uy + w[9] * uz, bz = az + w[2] * ux + w[6] * uy + w[10] * uz;
        const cx = ax + w[0] * vx + w[4] * vy + w[8] * vz, cy = ay + w[1] * vx + w[5] * vy + w[9] * vz, cz = az + w[2] * vx + w[6] * vy + w[10] * vz;
        if (!triangleCameraRockBlocked(ax, ay, az, bx, by, bz, cx, cy, cz, segmentClear, 2)) return false;
      }
      return true;
    };
    const entryCameraPropBlocked = (entry, actor) => {
      const dx = entry.x - cameraX, dy = entry.y - cameraY, dz = entry.z - cameraZ, length = dx * dx + dy * dy + dz * dz, radius = Math.hypot(entry.hx, entry.hy, entry.hz);
      for (let n = 0; n < cameraOccluderCount; n++) {
        const e = cameraOccluders[n];
        if (e.owner === actor.root) continue;
        const t = length ? Math.max(0, Math.min(1, ((e.x - cameraX) * dx + (e.y - cameraY) * dy + (e.z - cameraZ) * dz) / length)) : 0;
        if ((e.x - cameraX - dx * t) ** 2 + (e.y - cameraY - dy * t) ** 2 + (e.z - cameraZ - dz * t) ** 2 > (radius + e.radius) ** 2) continue;
        const g = e.node.geometry, v = g.verts, m = e.inverse;
        // Reflected transforms reverse rendered winding. Leave these rare
        // cases uncertain instead of certifying with a back-facing polygon.
        if (m[0] * (m[5] * m[10] - m[6] * m[9]) - m[4] * (m[1] * m[10] - m[2] * m[9]) + m[8] * (m[1] * m[6] - m[2] * m[5]) <= 0) continue;
        const ex = m[0] * cameraX + m[4] * cameraY + m[8] * cameraZ + m[12], ey = m[1] * cameraX + m[5] * cameraY + m[9] * cameraZ + m[13], ez = m[2] * cameraX + m[6] * cameraY + m[10] * cameraZ + m[14];
        for (let faceIndex = 0; faceIndex < e.geometry.coverFaces.length; faceIndex++) {
          const face = g.faces[e.geometry.coverFaces[faceIndex]], a = face.i[0] * 3, b = face.i[1] * 3, c = face.i[2] * 3;
          const ux = v[b] - v[a], uy = v[b + 1] - v[a + 1], uz = v[b + 2] - v[a + 2], vx = v[c] - v[a], vy = v[c + 1] - v[a + 1], vz = v[c + 2] - v[a + 2];
          const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx, front = nx * (ex - v[a]) + ny * (ey - v[a + 1]) + nz * (ez - v[a + 2]);
          if (front <= EPS) continue;
          const wx = nx * m[0] + ny * m[1] + nz * m[2], wy = nx * m[4] + ny * m[5] + nz * m[6], wz = nx * m[8] + ny * m[9] + nz * m[10];
          const target = front + wx * dx + wy * dy + wz * dz, support = Math.abs(wx) * entry.hx + Math.abs(wy) * entry.hy + Math.abs(wz) * entry.hz;
          if (target + support >= -0.018 * Math.hypot(wx, wy, wz) - EPS) continue;
          let covered = true;
          for (let corner = 0; corner < 8 && covered; corner++) {
            const x = dx + (corner & 1 ? entry.hx : -entry.hx), y = dy + (corner & 2 ? entry.hy : -entry.hy), z = dz + (corner & 4 ? entry.hz : -entry.hz), t = -front / (wx * x + wy * y + wz * z);
            if (t * -(cameraView[2] * x + cameraView[6] * y + cameraView[10] * z) <= near + EPS) { covered = false; break; }
            const px = ex + (m[0] * x + m[4] * y + m[8] * z) * t, py = ey + (m[1] * x + m[5] * y + m[9] * z) * t, pz = ez + (m[2] * x + m[6] * y + m[10] * z) * t;
            for (let j = 0; j < face.i.length; j++) {
              const p = face.i[j] * 3, q = face.i[(j + 1) % face.i.length] * 3, ux = v[q] - v[p], uy = v[q + 1] - v[p + 1], uz = v[q + 2] - v[p + 2], vx = px - v[p], vy = py - v[p + 1], vz = pz - v[p + 2];
              if ((uy * vz - uz * vy) * nx + (uz * vx - ux * vz) * ny + (ux * vy - uy * vx) * nz <= EPS) { covered = false; break; }
            }
          }
          if (covered) return true;
        }
      }
      return false;
    };
    const actorVisible = (actor, segmentClear) => {
      const group = actor && ownerEntries.get(actor.root);
      if (!hasCamera || !group) return false;
      if (!actorViewChanged(actor, group, segmentClear, 1)) return actorVisibleResult;
      for (let n = 0; n < group.length; n++) {
        const entry = group[n];
        if (!entry.shown || !cameraBoxIncludes(entry)) continue;
        if (entryCameraRockBlocked(entry, segmentClear) || entryCameraPropBlocked(entry, actor)) continue;
        // A finite sample grid cannot rule out a tiny visible sliver. Only
        // complete occlusion certificates enable outlines; uncertainty hides
        // them, including when a bound just grazes the camera frustum.
        actorVisibleResult = true;
        return true;
      }
      return false;
    };
    const actorFullyVisible = (actor, segmentClear) => {
      const group = actor && ownerEntries.get(actor.root);
      if (!hasCamera || !group) return false;
      if (!actorViewChanged(actor, group, segmentClear, 2)) return actorVisibleResult;
      let present = false;
      for (let n = 0; n < group.length; n++) {
        const entry = group[n];
        if (!entry.shown) continue;
        present = true;
        const vertices = entry.node.geometry.verts, samples = entry.geometry.samples, w = entry.node.world, m = cameraView;
        // The frustum is convex, so its six planes need only the actual mesh
        // vertices. A clipped part means the whole character is not visible.
        for (let i = 0; i < vertices.length; i += 3) {
          const x = vertices[i], y = vertices[i + 1], z = vertices[i + 2];
          const dx = w[0] * x + w[4] * y + w[8] * z + w[12] - cameraX, dy = w[1] * x + w[5] * y + w[9] * z + w[13] - cameraY, dz = w[2] * x + w[6] * y + w[10] * z + w[14] - cameraZ;
          const depth = -(m[2] * dx + m[6] * dy + m[10] * dz);
          if (depth <= near || depth > far || Math.abs(m[0] * dx + m[4] * dy + m[8] * dz) > depth * tanX || Math.abs(m[1] * dx + m[5] * dy + m[9] * dz) > depth * tanY) return false;
        }
        if (entryVolumeClear(entry, actor, segmentClear)) continue;
        for (let i = 0; i < samples.length; i += 3) {
          const x = samples[i], y = samples[i + 1], z = samples[i + 2];
          if (cameraPointState(w[0] * x + w[4] * y + w[8] * z + w[12], w[1] * x + w[5] * y + w[9] * z + w[13], w[2] * x + w[6] * y + w[10] * z + w[14], actor.root, actor, segmentClear, false, false) === 2) return false;
        }
      }
      actorVisibleResult = present;
      return actorVisibleResult;
    };
    const ownerHit = (group, dx, dy, dz, depth, endDepth) => {
      const start = near / depth, span = (endDepth - near) / depth;
      const ax = cameraX + dx * start, ay = cameraY + dy * start, az = cameraZ + dz * start;
      const vx = dx * span, vy = dy * span, vz = dz * span, length = vx * vx + vy * vy + vz * vz;
      for (let i = 0; i < group.length; i++) {
        const e = group[i];
        if (e.visible && !entryClear(e, ax, ay, az, vx, vy, vz, length)) return true;
      }
      return false;
    };
    const ownerBoundaryAt = (owner, x, y, z, dx, dy, dz) => {
      const group = ownerEntries.get(owner);
      if (!hasCamera || !group) return false;
      const m = cameraView, vx = x - cameraX, vy = y - cameraY, vz = z - cameraZ;
      const depth = -(m[2] * vx + m[6] * vy + m[10] * vz);
      if (depth < near || depth > far) return false;
      const rx = m[0] * vx + m[4] * vy + m[8] * vz, ry = m[1] * vx + m[5] * vy + m[9] * vz;
      const dd = -(m[2] * dx + m[6] * dy + m[10] * dz);
      const tx = (m[0] * dx + m[4] * dy + m[8] * dz) * depth - rx * dd, ty = (m[1] * dx + m[5] * dy + m[9] * dz) * depth - ry * dd, length = Math.hypot(tx, ty);
      if (length < 1e-9) return false;
      // Quarter of a pixel in a fixed 1024-wide view: sample the projected
      // owner union on either side, not just the edge's nearest surface.
      // A limb or pillow contour over another part then has two solid sides.
      const epsilon = Math.max(1e-5, depth * tanX / 2048), px = -ty / length * epsilon, py = tx / length * epsilon;
      const ox = m[0] * px + m[1] * py, oy = m[4] * px + m[5] * py, oz = m[8] * px + m[9] * py;
      let endDepth = near;
      for (let i = 0; i < group.length; i++) {
        const e = group[i];
        if (e.visible) endDepth = Math.max(endDepth, -(m[2] * (e.x - cameraX) + m[6] * (e.y - cameraY) + m[10] * (e.z - cameraZ)) + e.radius + 0.01);
      }
      endDepth = Math.min(far, endDepth);
      return endDepth > near && ownerHit(group, vx + ox, vy + oy, vz + oz, depth, endDepth) !== ownerHit(group, vx - ox, vy - oy, vz - oz, depth, endDepth);
    };
    const refresh = () => {
      // Registration boundaries size every reused buffer from actual scene
      // contents. The frame path never grows them or discards visible items.
      const live = new Set(), wanted = new Set();
      const visit = (node) => { if (live.has(node)) return; live.add(node); if (node.geometry) wanted.add(node.geometry); for (const child of node.children) visit(child); };
      for (const node of roots) visit(node);
      for (const cave of crew.cavemen.values()) visit(cave.root);
      for (let i = registered.length - 1; i >= 0; i--) if (!live.has(registered[i].node)) { entries.delete(registered[i].node); registered.splice(i, 1); }
      for (const node of seen) if (!live.has(node)) seen.delete(node);
      aliases.clear();
      for (const provider of providers) for (const node of provider.roots) aliases.set(node, provider.owner);
      ownerEntries.clear(); ownerGroups.length = 0;
      for (const provider of providers) groupOf(provider.owner);
      for (const entry of registered) { const group = groupOf(entry.owner); entry.group = group; group.push(entry); }
      for (const cave of crew.cavemen.values()) {
        registerNode(cave.root, cave.root, characterRoots.get(cave.root));
        wanted.add(cave.headOpen); wanted.add(cave.headClosed);
      }
      for (const node of roots) registerNode(node);
      for (const cave of crew.cavemen.values()) reserveHead(cave);
      for (const geometry of geometries.keys()) if (!wanted.has(geometry)) geometries.delete(geometry);
      stats.geometries = geometries.size; stats.triangles = stats.samples = 0;
      for (const geometry of geometries.values()) { stats.triangles += geometry.triangles.length / 9; stats.samples += geometry.samples.length / 3; }
      resize();
      stats.candidates = stats.occluders = stats.cameraOccluders = stats.nearOwners = 0;
    };
    const dispose = () => {
      registered.length = ownerGroups.length = 0; seen.clear(); entries.clear(); ownerEntries.clear(); aliases.clear(); providerOwners.clear(); geometries.clear(); characterRoots.clear();
      lastActor = lastActorTerrain = null;
      targetOccluders.fill(null); targetOwnerCache = null; targetStamp = -1; targetCount = 0; activeCamera = null;
      candidates.fill(null); occluders.fill(null); cameraOccluders.fill(null); owners.fill(null); nearOwners.fill(null);
      result.count = result.contours = result.nearCount = candidateCount = occluderCount = cameraOccluderCount = 0;
      stats.geometries = stats.registered = stats.candidates = stats.occluders = stats.cameraOccluders = stats.triangles = stats.samples = stats.owners = stats.nearOwners = 0;
    };
    return { collect, clear, cameraClear, perceived, concealed, distance, inView, getProvider, ownerClear, actorVisible, actorFullyVisible, ownerBoundaryAt, register, refresh, dispose, stats, result };
  };
  BL.objectGuides = { create };
})();
