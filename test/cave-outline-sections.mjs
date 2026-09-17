// Upper caves expose their walkable interiors; sealed mouths stay solid.
export const caveOutlineSectionsProbe = () => {
  const BL = window.BL, B = window.__ooga, island = B.island, guides = B.headquarters.rockGuides;
  const failures = [], fail = (kind, detail = {}) => { if (failures.length < 12) failures.push({ kind, ...detail }); };
  const contexts = guides.contexts.filter((context) => context.kind === "cave" || context.kind === "sealed");
  const slots = BL.caves.slots.filter((slot) => slot.status !== "headquarters");
  const registry = { accessible: 0, sealed: 0, headquarters: 0, duplicate: 0, missing: 0, blockedInteriors: 0 };
  const geometry = { triangles: 0, interiorTriangles: 0, sealTriangles: 0, nonvertical: 0, roofRisers: 0, wrongCave: 0, degenerate: 0, sealedWalls: 0 };
  const coverage = { interiorSamples: 0, missingInterior: 0, doorwaySamples: 0, filledDoorway: 0, sealSamples: 0, missingSeal: 0 };
  const cavity = { caveIndex: 0, floor: 0, ceiling: 0 }, unit = island.unit;
  const caveAt = (x, z) => island.cavityAt(x, z, cavity, 0, 1.1) ? cavity.caveIndex : 0;
  const world = (mouth, x, y, z) => ({ x: mouth.x + Math.cos(mouth.ry) * x + Math.sin(mouth.ry) * z, y: mouth.floorY + y, z: mouth.z - Math.sin(mouth.ry) * x + Math.cos(mouth.ry) * z });
  const contains2D = (ax, ay, bx, by, cx, cy, x, y) => {
    bx -= ax; by -= ay; cx -= ax; cy -= ay; x -= ax; y -= ay;
    const determinant = bx * cy - by * cx;
    if (Math.abs(determinant) < 1e-10) return false;
    const u = (x * cy - y * cx) / determinant, v = (bx * y - by * x) / determinant;
    return u >= -1e-5 && v >= -1e-5 && u + v <= 1 + 1e-5;
  };
  const planeKey = (axis, plane) => `${axis}:${Math.round(plane * 1e5)}`;
  const buckets = new Map();
  for (const context of contexts) {
    const id = context.source.id, slot = BL.caves.slots.find((entry) => entry.id === id), mouth = island.mouths.find((entry) => entry.id === id);
    if (!slot || !mouth || context.source.caveIndex !== island.mouths.indexOf(mouth) + 1 || context.source.mouth !== mouth) fail("cave source identity", { id });
    if (slot?.status === "headquarters") registry.headquarters++;
    if (context.kind === "sealed") { registry.sealed++; geometry.sealedWalls += context.walls.length; }
    else { registry.accessible++; if (slot?.status === "dark") registry.blockedInteriors++; }
    if (!!context.source.blocked !== (context.kind === "sealed")) fail("cave blocking state", { id });
    const v = context.surface;
    for (let at = 0; at < v.length; at += 9) {
      geometry.triangles++;
      const ux = v[at + 3] - v[at], uy = v[at + 4] - v[at + 1], uz = v[at + 5] - v[at + 2], vx = v[at + 6] - v[at], vy = v[at + 7] - v[at + 1], vz = v[at + 8] - v[at + 2];
      const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx, length = Math.hypot(nx, ny, nz);
      if (length < 1e-9) { geometry.degenerate++; continue; }
      if (context.kind === "sealed") { geometry.sealTriangles++; continue; }
      geometry.interiorTriangles++;
      if (Math.abs(ny) > length * 1e-5) { geometry.nonvertical++; continue; }
      const x = (v[at] + v[at + 3] + v[at + 6]) / 3, y = (v[at + 1] + v[at + 4] + v[at + 7]) / 3, z = (v[at + 2] + v[at + 5] + v[at + 8]) / 3;
      const dx = nx / length * 0.025, dz = nz / length * 0.025;
      const positive = caveAt(x + dx, z + dz), negative = caveAt(x - dx, z - dz), owner = context.source.caveIndex;
      if (positive === owner && negative === owner) geometry.roofRisers++;
      if (positive !== owner && negative !== owner || y < mouth.floorY - 1e-5) geometry.wrongCave++;
      const axis = Math.abs(nx) > Math.abs(nz) ? 0 : 2, key = `${id}:${planeKey(axis, v[at + axis])}`;
      if (!buckets.has(key)) buckets.set(key, []);
      buckets.get(key).push({ context, at, horizontal: axis === 0 ? 2 : 0 });
    }
  }
  const covered = (id, axis, plane, horizontal, y) => (buckets.get(`${id}:${planeKey(axis, plane)}`) || []).some(({ context, at, horizontal: h }) => {
    const v = context.surface;
    return contains2D(v[at + h], v[at + 1], v[at + 3 + h], v[at + 4], v[at + 6 + h], v[at + 7], horizontal, y);
  });
  // Check the rendered stone, independently of the helper's face registry.
  const v = island.geometry.verts;
  for (const face of island.geometry.faces) {
    const mouth = island.mouths[face.matrixCave - 1], slot = mouth && slots.find((entry) => entry.id === mouth.id);
    if (!slot || slot.status === "dark" || face.i.length < 3) continue;
    const a = face.i[0] * 3, b = face.i[1] * 3, c = face.i[2] * 3;
    const ux = v[b] - v[a], uy = v[b + 1] - v[a + 1], uz = v[b + 2] - v[a + 2], vx = v[c] - v[a], vy = v[c + 1] - v[a + 1], vz = v[c + 2] - v[a + 2];
    const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx, length = Math.hypot(nx, ny, nz);
    if (length < 1e-9 || Math.abs(ny) > length * 1e-5) continue;
    const axis = Math.abs(nx) > Math.abs(nz) ? 0 : 2, h = axis === 0 ? 2 : 0;
    let low = Infinity, high = -Infinity, bottom = Infinity, top = -Infinity;
    for (const index of face.i) { low = Math.min(low, v[index * 3 + h]); high = Math.max(high, v[index * 3 + h]); bottom = Math.min(bottom, v[index * 3 + 1]); top = Math.max(top, v[index * 3 + 1]); }
    for (let column = Math.floor(low / unit); column < Math.ceil(high / unit); column++) {
      const horizontal = (column + 0.5) * unit, x = axis === 0 ? v[a] : horizontal, z = axis === 2 ? v[a + 2] : horizontal;
      const dx = nx / length * 0.025, dz = nz / length * 0.025, positive = caveAt(x + dx, z + dz), negative = caveAt(x - dx, z - dz);
      if ((positive === face.matrixCave) === (negative === face.matrixCave)) continue;
      for (let row = Math.max(0, Math.floor(bottom / unit)); row < Math.ceil(top / unit); row++) {
        const y = (row + 0.5) * unit;
        if (island.clearAt(x + dx, y, z + dz) === island.clearAt(x - dx, y, z - dz)) continue;
        coverage.interiorSamples++;
        if (!covered(mouth.id, axis, v[a + axis], horizontal, y)) { coverage.missingInterior++; fail("missing upper cave wall", { id: mouth.id, x, y, z }); }
      }
    }
  }
  for (const slot of slots) {
    const found = contexts.filter((context) => context.source.id === slot.id);
    if (!found.length) registry.missing++;
    if (found.length > 1) registry.duplicate++;
    if (found.length !== 1) { fail("cave registry", { id: slot.id, count: found.length }); continue; }
    const context = found[0], mouth = context.source.mouth, verts = context.surface, projected = [];
    const sr = Math.sin(mouth.ry), cr = Math.cos(mouth.ry);
    for (let at = 0; at < verts.length; at += 3) projected.push((verts[at] - mouth.x) * cr - (verts[at + 2] - mouth.z) * sr, verts[at + 1] - mouth.floorY, (verts[at] - mouth.x) * sr + (verts[at + 2] - mouth.z) * cr);
    if (slot.status === "dark") {
      for (let row = 0; row < 12; row++) for (let column = 0; column < 20; column++) {
        const x = -2.5 + (column + 0.5) * 0.25, y = (row + 0.5) * 0.25;
        let solid = false;
        for (let at = 0; at < projected.length && !solid; at += 9) solid = contains2D(projected[at], projected[at + 1], projected[at + 3], projected[at + 4], projected[at + 6], projected[at + 7], x, y);
        coverage.sealSamples++;
        if (!solid) { coverage.missingSeal++; fail("hole in sealed entrance", { id: slot.id, x, y }); }
      }
    } else {
      // The guide may outline the back wall seen through the entrance, but
      // cannot invent a front wall across the walkable doorway itself.
      for (let at = 0; at < projected.length; at += 9) {
        const x = (projected[at] + projected[at + 3] + projected[at + 6]) / 3, y = (projected[at + 1] + projected[at + 4] + projected[at + 7]) / 3, z = (projected[at + 2] + projected[at + 5] + projected[at + 8]) / 3;
        coverage.doorwaySamples++;
        if (Math.abs(x) < 1.75 && y > 0.25 && y < 2.75 && z > -0.25 && z < 0.8) coverage.filledDoorway++;
      }
    }
  }
  if (registry.missing || registry.duplicate || registry.headquarters || registry.blockedInteriors || registry.accessible !== 3 || registry.sealed !== 3) fail("invalid cave registry", registry);
  if (geometry.nonvertical || geometry.roofRisers || geometry.wrongCave || geometry.degenerate || geometry.sealedWalls !== registry.sealed) fail("invalid cave surfaces", geometry);
  if (!coverage.interiorSamples || coverage.missingInterior || !coverage.sealSamples || coverage.missingSeal || coverage.filledDoorway) fail("incomplete cave surfaces", coverage);

  const actor = { baseY: 0, root: { position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 } } }, camera = BL.scene.createCamera({ near: 0.1, far: 100 });
  const runtime = { revealed: 0, sealedWhole: 0, sceneRevealed: 0, sceneChecks: 0, fadeIn: 0, fadeOut: 0, rangeFade: 0, hiddenPatches: 0, cameraVisible: 0, visibleOutlined: 0, facingError: 0, cameraEligibilityError: 0, cacheStable: true, buffersStable: true };
  const rows = [];
  try {
    for (const context of contexts) {
      const mouth = context.source.mouth, samples = context.surfaceSamples, centers = context.surfaceCenters;
      const row = { id: mouth.id, kind: context.kind, witnesses: 0, visibleWalls: 0, activeWalls: 0, hiddenPatches: 0 };
      let eye = null, best = 0;
      for (const z of [1.2, 1.8, 2.4]) for (const x of [0, -0.7, 0.7]) {
        const point = world(mouth, x, 1.1, z);
        if (!island.clearAt(point.x, point.y, point.z)) continue;
        let witnesses = 0;
        for (let group = 0; group < context.surfaceGroupCount; group++) {
          const at = group * 3;
          if (Math.hypot(centers[at] - point.x, centers[at + 1] - point.y + 1.1, centers[at + 2] - point.z) <= 12 && island.sightClearAt(point.x, point.y, point.z, samples[at], samples[at + 1], samples[at + 2])) witnesses++;
        }
        if (witnesses > best) { eye = point; best = witnesses; }
      }
      if (!eye) { fail("no cave-front sight fixture", { id: mouth.id }); continue; }
      row.witnesses = best;
      let buried = null;
      for (const x of [-4, 4, -5, 5]) for (const z of [-2, -4, -6]) {
        const point = world(mouth, x, 1.5, z);
        if (!buried && island.solidAt(point.x, point.y, point.z)) buried = point;
      }
      if (!buried) { fail("no camera rock fixture", { id: mouth.id }); continue; }
      const update = (point, dt) => {
        Object.assign(actor.root.position, { x: point.x, y: point.y - 1.1, z: point.z });
        guides.updateSurface(context, point.x, point.y, point.z, camera, dt, actor);
      };
      const buffers = [context.surface, context.surfacePhases, context.surfaceWholePhases, context.surfaceTerrainSeen];
      guides.resetSurface(); Object.assign(camera.position, buried); Object.assign(camera.target, eye);
      update(eye, 0.025);
      if (context.walls.some((wall) => wall.phase > 0 && wall.phase < wall.target)) runtime.fadeIn++; else fail("cave appeared without fade", { id: mouth.id });
      update(eye, 0.3);
      row.activeWalls = context.walls.filter((wall) => wall.target > 0).length;
      const expectedWalls = new Set();
      for (let group = 0; group < context.surfaceGroupCount; group++) {
        const at = group * 3;
        if (Math.hypot(centers[at] - eye.x, centers[at + 1] - eye.y + 1.1, centers[at + 2] - eye.z) <= 12 && island.sightClearAt(eye.x, eye.y, eye.z, samples[at], samples[at + 1], samples[at + 2])) expectedWalls.add(context.surfaceWallGroups[group]);
        if (context.surfacePhases[group] > 0) row.hiddenPatches++;
      }
      row.visibleWalls = expectedWalls.size;
      for (const index of expectedWalls) if (context.walls[index].target <= 0) fail("perceived cave wall missing", { id: mouth.id, wall: index });
      runtime.hiddenPatches += row.hiddenPatches;
      if (row.activeWalls && row.hiddenPatches) runtime.revealed++; else fail("cave not revealed through camera rock", row);
      if (context.kind === "sealed") {
        if (context.walls.length === 1 && context.surfaceWholeActive === context.surfaceGroupCount && context.surfaceSections.every((phase) => phase === 1)) runtime.sealedWhole++;
        else fail("sealed slab fragmented", { id: mouth.id, active: context.surfaceWholeActive, total: context.surfaceGroupCount });
      }
      const targets = context.walls.map((wall) => wall.target), perceived = new Float32Array(context.surfacePerceived);
      for (const angle of [Math.PI / 2, Math.PI, Math.PI * 1.5]) {
        actor.root.rotation.y = angle; update(eye, 0.3);
        context.walls.forEach((wall, index) => { runtime.facingError = Math.max(runtime.facingError, Math.abs(wall.target - targets[index])); });
      }
      for (const offset of [-3, 0, 3]) {
        Object.assign(camera.position, world(mouth, offset, 1.1, 2)); Object.assign(camera.target, world(mouth, 0, 1.1, -3)); update(eye, 0.3);
        for (let group = 0; group < context.surfaceGroupCount; group++) {
          runtime.cameraEligibilityError = Math.max(runtime.cameraEligibilityError, Math.abs(perceived[group] - context.surfacePerceived[group]));
          if (!context.surfacePerceived[group]) continue;
          const at = group * 3, p = camera.position, t = camera.target, length = Math.hypot(t.x - p.x, t.y - p.y, t.z - p.z), dx = samples[at] - p.x, dy = samples[at + 1] - p.y, dz = samples[at + 2] - p.z;
          const depth = (dx * (t.x - p.x) + dy * (t.y - p.y) + dz * (t.z - p.z)) / length;
          if (depth <= camera.near || !island.sightClearAt(p.x + dx * camera.near / depth, p.y + dy * camera.near / depth, p.z + dz * camera.near / depth, samples[at], samples[at + 1], samples[at + 2])) continue;
          runtime.cameraVisible++;
          if (context.surfaceTargets[group] > 0 || context.surfacePhases[group] > 0) runtime.visibleOutlined++;
        }
      }
      const version = context.surfaceVersion, rays = guides.stats.surfaceRays;
      for (let frame = 0; frame < 12; frame++) update(eye, 0);
      runtime.cacheStable &&= context.surfaceVersion === version && guides.stats.surfaceRays === rays;
      runtime.buffersStable &&= buffers.every((buffer, index) => buffer === [context.surface, context.surfacePhases, context.surfaceWholePhases, context.surfaceTerrainSeen][index]);
      const far = world(mouth, 0, 1.1, 30);
      update(far, 0.025);
      if (context.walls.some((wall) => wall.phase > 0 && wall.target === 0)) runtime.fadeOut++; else fail("cave disappeared without fade", { id: mouth.id });
      update(far, 0.3);
      if (context.surfaceWholeActive || context.surfaceActive) fail("cave lingered outside range", { id: mouth.id });
      for (let z = 9; z <= 20; z += 0.25) {
        update(world(mouth, 0, 1.1, z), 0.3);
        if (context.walls.some((wall) => wall.target > 0 && wall.target < 1)) { runtime.rangeFade++; break; }
      }
      // Include the scene's actual props and entrance rim in a separate
      // pass. A seal must not self-occlude its own outward-facing guide.
      // The mirror remains an opaque reflective panel to visual rays.
      if (BL.caves.slots.find((slot) => slot.id === mouth.id).status !== "mirror") {
        const objects = B.headquarters.objectGuides;
        guides.resetSurface(); Object.assign(camera.position, buried); Object.assign(camera.target, eye);
        Object.assign(actor.root.position, { x: eye.x, y: eye.y - 1.1, z: eye.z });
        guides.updateSurface(context, eye.x, eye.y, eye.z, camera, 0.3, actor, objects.clear, objects.result.occlusionVersion);
        runtime.sceneChecks++;
        if (context.surfaceActive) runtime.sceneRevealed++; else fail("cave outline occluded by scene props", { id: mouth.id });
      }
      rows.push(row);
    }
  } finally { guides.resetSurface(); }
  if (runtime.revealed !== contexts.length || runtime.sealedWhole !== registry.sealed || runtime.sceneRevealed !== runtime.sceneChecks || runtime.fadeIn !== contexts.length || runtime.fadeOut !== contexts.length || !runtime.rangeFade || !runtime.cameraVisible || runtime.visibleOutlined || runtime.facingError > 1e-6 || runtime.cameraEligibilityError > 1e-6 || !runtime.cacheStable || !runtime.buffersStable) fail("unstable cave guides", runtime);
  return { registry, geometry, coverage, runtime, rows, failures };
};
