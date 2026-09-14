// Context selection is independent of where an unrestricted eye happens to be.
// Check the cached segments against actual rock, then exercise their cap clip.
export const rockGuidesProbe = () => {
  const B = window.__ooga, BL = window.BL, island = B.island, H = island.headquarters, rows = [], failures = [];
  let openSight = false;
  const guideIsland = { ...island, sightClearAt: (ax, ay, az, bx, by, bz) => openSight || island.sightClearAt(ax, ay, az, bx, by, bz) }, guides = BL.rockGuides.create({ island: guideIsland });
  const sample = (kind, index, basement, x, y, z, ex = x + 30, ey = y + 1, ez = z) => {
    const c = guides.select(x, y, z, ex, ey, ez), again = guides.select(x, y, z, ex, ey, ez);
    rows.push({ kind, index, basement, selected: c && { kind: c.kind, index: c.index, basement: c.basement }, cached: c === again, count: c?.count || 0 });
  };
  for (const basement of [false, true]) {
    const level = basement ? H.basement : H;
    for (let i = 0; i < level.rooms.length; i++) {
      const room = level.rooms[i], other = level.rooms[(i + 1) % level.rooms.length];
      sample("room", room.index, basement, room.x, room.floor, room.z, other.x, other.floor + 1, other.z);
    }
    for (let i = 0; i < level.ramps.length; i++) {
      const ramp = level.ramps[i], p = ramp.samples[Math.floor(ramp.samples.length / 2)];
      sample("ramp", i, basement, p.x, p.y, p.z);
    }
    sample("common", -1, basement, 0, level.floor, 6.5);
  }
  let points = 0, finite = true;
  const directions = [];
  for (let x = -1; x <= 1; x++) for (let y = -1; y <= 1; y++) for (let z = -1; z <= 1; z++) if (x || y || z) directions.push([x * 0.025, y * 0.025, z * 0.025]);
  for (const context of guides.contexts) {
    finite = finite && context.lines instanceof Float32Array && context.lines.length === context.count * 6 && context.lines.every(Number.isFinite) && (context.kind === "hole" ? context.count === 0 : context.count > 0 && context.count <= 96);
    for (let n = 0; n < context.lines.length; n += 6) for (const t of [0.2, 0.5, 0.8]) {
      const v = context.lines, x = v[n] + (v[n + 3] - v[n]) * t, y = v[n + 1] + (v[n + 4] - v[n + 1]) * t, z = v[n + 2] + (v[n + 5] - v[n + 2]) * t;
      let air = false, rock = false;
      for (const d of directions) if (island.clearAt(x + d[0], y + d[1], z + d[2], 0, 0)) air = true; else rock = true;
      points++;
      if ((!air || !rock) && failures.length < 8) failures.push({ kind: "guide away from real boundary", context: context.kind, index: context.index, basement: context.basement, x, y, z, air, rock });
    }
  }
  const taggedWindowReveals = island.geometry.faces.reduce((count, face) => count + (face.headquartersWindowReveal ? 1 : 0), 0);
  const sky = guides.select(80, 20, 80, 85, 22, 85) === null, stats = { ...guides.stats, taggedWindowReveals };
  const room = H.rooms[0], context = guides.select(room.x, room.floor, room.z, room.x, room.floor + 1, room.z);
  const canvas = document.createElement("canvas"); canvas.width = 640; canvas.height = 360;
  Object.defineProperties(canvas, { clientWidth: { value: 640 }, clientHeight: { value: 360 } });
  const ctx = canvas.getContext("2d", { willReadFrequently: true }), cover = BL.cameraCover.create(canvas), camera = BL.scene.createCamera({ near: 0.1 }), views = [];
  const draw = (lines) => { ctx.clearRect(0, 0, 640, 360); cover.draw(camera, null, true, false, island.solidAt, island.rockMaterialAt, lines); return ctx.getImageData(0, 0, 640, 360).data; };
  for (const partial of [false, true]) {
    Object.assign(camera.position, { x: room.x, y: room.floor + (partial ? -0.015 : -0.15), z: room.z });
    Object.assign(camera.target, { x: room.x + Math.sin(room.angle) * 2, y: camera.position.y + 0.3, z: room.z - Math.cos(room.angle) * 2 });
    const base = draw(null), guided = draw(context), state = { ...cover.state };
    let changed = 0, leaked = 0, maximumDelta = 0;
    for (let i = 0; i < base.length; i += 4) {
      if ([0, 1, 2].some((channel) => base[i + channel] !== guided[i + channel])) changed++;
      if (base[i + 3] === 0 && guided[i + 3] !== 0) leaked++;
      for (let c = 0; c < 3; c++) if (base[i + 3] === 255) maximumDelta = Math.max(maximumDelta, Math.abs(base[i + c] - guided[i + c]));
    }
    views.push({ partial, changed, leaked, maximumDelta, ...state });
  }
  // The visible interval must remain continuous across self-hidden jagged
  // faces, while its hidden ends and unrelated spaces remain excluded.
  const ex = room.x, ey = room.floor + 1, ez = room.z;
  Object.assign(camera.position, { x: ex + 6, y: ey + 18, z: ez + 4 });
  Object.assign(camera.target, { x: ex, y: ey, z: ez });
  const nearby = guides.updateSurfaces(ex, ey, ez, camera, 0.3), auditedWindows = new Set(), wholeWalls = { activeContexts: 0, otherContexts: 0, patches: 0, actorBlocked: 0, beyondRadius: 0, unequalPhases: 0, distanceError: 0, targetError: 0, blockedNearbyWalls: 0, blockedActivated: 0, perceptionErrors: 0, otherLevelActive: 0, ceilingFaces: 0, windowRevealFaces: 0, capSamples: [], intervalError: 0, sectionError: 0, hiddenEndTargets: 0 };
  for (const item of nearby) {
    for (const window of item.windows) auditedWindows.add(window.index);
    const distances = item.walls.map(() => Infinity), witnesses = item.walls.map(() => false), first = item.walls.map(() => Infinity), last = item.walls.map(() => -Infinity);
    for (let group = 0; group < item.surfaceGroupCount; group++) {
      const at = group * 3, wallIndex = item.surfaceWallGroups[group], wall = item.walls[wallIndex], distance = Math.hypot(item.surfaceCenters[at] - ex, item.surfaceCenters[at + 1] - ey, item.surfaceCenters[at + 2] - ez);
      distances[wallIndex] = Math.min(distances[wallIndex], distance);
      const clear = island.sightClearAt(ex, ey, ez, item.surfaceSamples[at], item.surfaceSamples[at + 1], item.surfaceSamples[at + 2]);
      if (distance <= 12 && clear) witnesses[wallIndex] = true;
      if (clear) { first[wallIndex] = Math.min(first[wallIndex], item.surfaceStations[group]); last[wallIndex] = Math.max(last[wallIndex], item.surfaceStations[group]); }
      if (Math.abs(item.surfaceWholePhases[group] - wall.phase * wall.phase * (3 - 2 * wall.phase)) > 1e-6) wholeWalls.unequalPhases++;
      if (!item.surfaceWholePhases[group]) continue;
      wholeWalls.patches++;
      if (distance > 12) wholeWalls.beyondRadius++;
      if (!clear && item.surfaceSections[group] > 0 && item.surfaceTargets[group] > 0) wholeWalls.actorBlocked++;
    }
    if (item.walls.some((wall) => wall.phase > 0)) { wholeWalls.activeContexts++; if (item !== context) wholeWalls.otherContexts++; if (item.basement !== context.basement) wholeWalls.otherLevelActive++; }
    for (let n = 0; n < item.walls.length; n++) {
      const distance = distances[n], wall = item.walls[n], t = Math.max(0, Math.min(1, (12 - distance) / 1.5));
      if (wall.target > 0 || distance < 12) wholeWalls.distanceError = Math.max(wholeWalls.distanceError, Math.abs(distance - wall.distance));
      wholeWalls.targetError = Math.max(wholeWalls.targetError, Math.abs(wall.target - (witnesses[n] ? t : 0)));
      if (distance < 12 && !!wall.perceived !== witnesses[n]) wholeWalls.perceptionErrors++;
      if (distance < 12 && !witnesses[n]) { wholeWalls.blockedNearbyWalls++; if (wall.phase > 0) wholeWalls.blockedActivated++; }
      if (wall.perceived) wholeWalls.intervalError = Math.max(wholeWalls.intervalError, Math.abs(wall.visibleMin - first[n]), Math.abs(wall.visibleMax - last[n]));
    }
    for (let group = 0; group < item.surfaceGroupCount; group++) {
      const wallIndex = item.surfaceWallGroups[group], wall = item.walls[wallIndex];
      if (!wall.perceived) continue;
      const station = item.surfaceStations[group], edge = Math.min(station - first[wallIndex], last[wallIndex] - station), section = item.kind === "hole" ? 1 : Math.max(0, Math.min(1, (edge + 0.3) / 0.6));
      wholeWalls.sectionError = Math.max(wholeWalls.sectionError, Math.abs(item.surfaceSections[group] - section * section * (3 - 2 * section)));
      if (!section && item.surfaceTargets[group] > 0) wholeWalls.hiddenEndTargets++;
    }
    for (let at = 0; at < item.surface.length; at += 9) {
      const v = item.surface, ax = v[at + 3] - v[at], ay = v[at + 4] - v[at + 1], az = v[at + 5] - v[at + 2], bx = v[at + 6] - v[at], by = v[at + 7] - v[at + 1], bz = v[at + 8] - v[at + 2];
      const nx = ay * bz - az * by, ny = az * bx - ax * bz, nz = ax * by - ay * bx;
      if (ny < -Math.hypot(nx, ny, nz) * 0.82) wholeWalls.ceilingFaces++;
      const cx = (v[at] + v[at + 3] + v[at + 6]) / 3, cy = (v[at + 1] + v[at + 4] + v[at + 7]) / 3, cz = (v[at + 2] + v[at + 5] + v[at + 8]) / 3;
      for (const window of item.windows) for (const frustum of window.flare.frusta) {
        if (!frustum.planes.every((p) => p[0] * cx + p[1] * cy + p[2] * cz <= p[3] + 1e-4)) continue;
        for (const side of [2, 3, 4, 5]) {
          const p = frustum.planes[side]; let aligned = true;
          for (let n = 0; n < 9; n += 3) if (Math.abs(p[0] * v[at + n] + p[1] * v[at + n + 1] + p[2] * v[at + n + 2] - p[3]) > 1e-4) aligned = false;
          if (aligned) {
            wholeWalls.windowRevealFaces++;
            if (wholeWalls.capSamples.length < 6) wholeWalls.capSamples.push({ kind: item.kind, index: item.index, basement: item.basement, window: window.index, side, area: Math.hypot(nx, ny, nz) / 2, vertices: [...v.slice(at, at + 9)] });
          }
        }
      }
    }
  }
  wholeWalls.auditedWindows = auditedWindows.size;
  wholeWalls.totalWindows = H.windows.length;
  const beforeOrbit = nearby.map((item) => new Float32Array(item.surfaceWholePhases)), beforeSections = nearby.map((item) => new Float32Array(item.surfaceSections));
  camera.position.x -= 13; camera.position.z += 7;
  wholeWalls.reused = guides.updateSurfaces(ex, ey, ez, camera, 0) === nearby;
  wholeWalls.orbitStable = nearby.every((item, n) => item.surfaceWholePhases.every((phase, group) => phase === beforeOrbit[n][group]) && item.surfaceSections.every((section, group) => section === beforeSections[n][group]));
  // Approach the same entire wall through its fade band, then leave it. Its
  // far end must share the near end's opacity instead of being cut at 12 m.
  // This isolated open-sight fixture tests distance and time independently;
  // the real island audit above verifies room and floor occlusion.
  openSight = true;
  // An independent visibility aperture reveals both ends of one wall while
  // hiding its middle. Narrowing that aperture must fade the former far end,
  // without cutting holes into the connected section between witnesses.
  const intervalRanges = context.walls.map(() => [Infinity, -Infinity]);
  for (let group = 0; group < context.surfaceGroupCount; group++) {
    const range = intervalRanges[context.surfaceWallGroups[group]], station = context.surfaceStations[group];
    range[0] = Math.min(range[0], station); range[1] = Math.max(range[1], station);
  }
  let intervalWall = 0;
  for (let n = 1; n < intervalRanges.length; n++) if (intervalRanges[n][1] - intervalRanges[n][0] > intervalRanges[intervalWall][1] - intervalRanges[intervalWall][0]) intervalWall = n;
  const range = intervalRanges[intervalWall], span = range[1] - range[0], stations = new Map();
  for (let group = 0; group < context.surfaceGroupCount; group++) if (context.surfaceWallGroups[group] === intervalWall) {
    const at = group * 3; stations.set(`${context.surfaceSamples[at]},${context.surfaceSamples[at + 1]},${context.surfaceSamples[at + 2]}`, context.surfaceStations[group]);
  }
  let shortened = false;
  const sectionClear = (ax, ay, az, x, y, z) => {
    const station = stations.get(`${x},${y},${z}`);
    return station !== undefined && (station <= range[0] + span * 0.25 || !shortened && station >= range[1] - span * 0.25);
  };
  const intervalCamera = BL.scene.createCamera({ near: 0.1 });
  Object.assign(intervalCamera.position, { x: ex, y: ey, z: ez + 20 }); Object.assign(intervalCamera.target, { x: ex, y: ey, z: ez + 21 });
  guides.resetSurface(); guides.updateSurface(context, ex, ey, ez, intervalCamera, 0.3, null, sectionClear, 1);
  let connectedMiddle = 0;
  for (let group = 0; group < context.surfaceGroupCount; group++) if (context.surfaceWallGroups[group] === intervalWall && context.surfaceStations[group] > range[0] + span * 0.25 && context.surfaceStations[group] < range[1] - span * 0.25 && context.surfaceTargets[group] > 0) connectedMiddle++;
  const wide = new Float32Array(context.surfacePhases);
  shortened = true; guides.updateSurface(context, ex, ey, ez, intervalCamera, 0, null, sectionClear, 2);
  const retired = [];
  for (let group = 0; group < context.surfaceGroupCount; group++) if (wide[group] > 0 && context.surfaceTargets[group] === 0) retired.push(group);
  const held = retired.every((group) => context.surfacePhases[group] === wide[group]);
  guides.updateSurface(context, ex, ey, ez, intervalCamera, 0.05, null, sectionClear, 2);
  const fading = retired.some((group) => context.surfacePhases[group] > 0 && context.surfacePhases[group] < wide[group]);
  guides.updateSurface(context, ex, ey, ez, intervalCamera, 0.3, null, sectionClear, 2);
  const gone = retired.every((group) => context.surfacePhases[group] === 0);
  shortened = false; guides.updateSurface(context, ex, ey, ez, intervalCamera, 0.05, null, sectionClear, 3);
  const returning = retired.some((group) => context.surfacePhases[group] > 0 && context.surfacePhases[group] < context.surfaceTargets[group]);
  wholeWalls.intervalFade = { span, connectedMiddle, retired: retired.length, held, fading, gone, returning };
  const fadeContext = guides.contexts.find((item) => item.kind === "ramp"), wallIndex = fadeContext.surfaceWallGroups[0], wall = fadeContext.walls[wallIndex], px = fadeContext.surfaceCenters[0], py = fadeContext.surfaceCenters[1], pz = fadeContext.surfaceCenters[2];
  const distanceAt = (offset) => {
    let nearest = Infinity;
    for (let group = 0; group < fadeContext.surfaceGroupCount; group++) if (fadeContext.surfaceWallGroups[group] === wallIndex) {
      const at = group * 3;
      nearest = Math.min(nearest, Math.hypot(fadeContext.surfaceCenters[at] - px - offset, fadeContext.surfaceCenters[at + 1] - py, fadeContext.surfaceCenters[at + 2] - pz));
    }
    return nearest;
  };
  let lower = 0, upper = 64;
  for (let n = 0; n < 40; n++) { const middle = (lower + upper) / 2; if (distanceAt(middle) < 11.25) lower = middle; else upper = middle; }
  const edgeX = px + (lower + upper) / 2;
  guides.updateSurface(fadeContext, edgeX, py, pz, camera, 0.3);
  const edgePhase = wall.phase, edgeTarget = wall.target;
  let beyondRadius = 0, farPhaseError = 0;
  for (let group = 0; group < fadeContext.surfaceGroupCount; group++) if (fadeContext.surfaceWallGroups[group] === wallIndex) {
    const at = group * 3, distance = Math.hypot(fadeContext.surfaceCenters[at] - edgeX, fadeContext.surfaceCenters[at + 1] - py, fadeContext.surfaceCenters[at + 2] - pz);
    if (distance > 12) { beyondRadius++; farPhaseError = Math.max(farPhaseError, Math.abs(fadeContext.surfaceWholePhases[group] - edgePhase * edgePhase * (3 - 2 * edgePhase))); }
  }
  guides.updateSurface(fadeContext, px + 80, py, pz, camera, 0);
  const heldPhase = wall.phase;
  guides.updateSurface(fadeContext, px + 80, py, pz, camera, 0.05);
  const outPhase = wall.phase;
  guides.updateSurface(fadeContext, px + 80, py, pz, camera, 0.3);
  const gonePhase = wall.phase;
  guides.updateSurface(fadeContext, edgeX, py, pz, camera, 0.05);
  wholeWalls.fade = { edgePhase, edgeTarget, heldPhase, outPhase, gonePhase, inPhase: wall.phase, beyondRadius, farPhaseError };
  openSight = false;
  const holeContext = guides.contexts.find((item) => item.kind === "hole"), hole = H.basement.hole;
  const holeGuide = { count: holeContext.count, triangles: holeContext.surfaceCount, depth: holeContext.ceiling - holeContext.floor, boundarySamples: holeContext.surfaceGroupCount, invalidSamples: [], openCenter: island.clearAt(hole.x, hole.floor - 0.1, hole.z, 0, 0) };
  for (let group = 0; group < holeContext.surfaceGroupCount; group++) {
    const at = group * 3, c = holeContext.surfaceCenters, s = holeContext.surfaceSamples;
    if ((island.solidAt(s[at], s[at + 1], s[at + 2]) || !island.solidAt(c[at] * 2 - s[at], c[at + 1] * 2 - s[at + 1], c[at + 2] * 2 - s[at + 2])) && holeGuide.invalidSamples.length < 6) holeGuide.invalidSamples.push([...c.slice(at, at + 3)]);
  }
  Object.assign(camera.position, { x: hole.x, y: hole.floor + 12, z: hole.z }); Object.assign(camera.target, { x: hole.x, y: hole.floor, z: hole.z });
  camera.up = { x: 0, y: 0, z: -1 }; camera.fov = Math.PI / 2;
  guides.resetSurface(); guides.updateSurface(holeContext, hole.x, hole.floor + 1.1, hole.z + hole.mouthRadius + 1.5, camera, 0.3);
  const holeLayer = { structures: [holeContext], count: 0, lines: new Float32Array(0), objectsEnabled: true, providerCount: 0 };
  ctx.clearRect(0, 0, 640, 360); cover.draw(camera, null, false, false, island.solidAt, island.rockMaterialAt, holeLayer);
  const holePixels = ctx.getImageData(0, 0, 640, 360).data;
  holeGuide.outlinePixels = holeGuide.centerPixels = 0;
  for (let y = 0; y < 360; y++) for (let x = 0; x < 640; x++) if (holePixels[(y * 640 + x) * 4 + 3]) {
    holeGuide.outlinePixels++; if ((x - 320) ** 2 + (y - 180) ** 2 < 35 ** 2) holeGuide.centerPixels++;
  }
  holeGuide.perceived = holeContext.walls[0].perceived; holeGuide.filled = cover.state.structureFilled;
  guides.resetSurface();
  wholeWalls.reset = guides.contexts.every((item) => item.surfaceActive === 0 && item.surfacePhases.every((phase) => phase === 0) && item.surfaceWholePhases.every((phase) => phase === 0) && item.walls.every((entry) => entry.phase === 0));
  cover.dispose(); guides.dispose();
  return { backend: B.renderer.kind, rows, stats, finite, points, sky, views, wholeWalls, holeGuide, failures, disposed: guides.stats.contexts === 0 && guides.stats.lines === 0 && guides.contexts.length === 0 };
};

// Analytic blockers distinguish camera-hidden edge intervals from surfaces
// already visible in the normal rendering, independently of actor heading.
export const sightGuideClippingProbe = () => {
  const BL = window.BL, world = BL.math.mat4.create(), cave = { root: { position: { x: 0, y: 0, z: 0 } }, traits: { height: 0 }, parts: { head: { world } } };
  const camera = BL.scene.createCamera({ near: 0.1 }); camera.fov = Math.PI / 2;
  Object.assign(camera.position, { x: 0, y: 0, z: -5 }); Object.assign(camera.target, { x: 0, y: 0, z: 0 });
  const structure = { count: 6, lines: new Float32Array([
    -1, -1, 3, 1, -1, 3,
    -1, 1, -3, 1, 1, -3,
    -1, 0, 3, 1, 0, 3,
    -1, 0, 13, 1, 0, 13,
    -20, -1, 4, 20, -1, 4,
    -1, 0, 6, 1, 0, 6,
  ]) };
  const objects = { version: 0, occlusionVersion: 0, count: 0, lines: new Float32Array(0) };
  const filter = BL.sightGuides.create({
    segmentClear: (ax, ay, az, bx, by, bz) => Math.abs(az) < 1e-9 || !(by < -0.4 || by > 0.5 && bz < -2),
    objectClear: (ax, ay, az, bx, by, bz) => !(bz > 4 && Math.abs(by) < 0.01 && Math.abs(ax + (bx - ax) * -az / (bz - az)) < 0.25),
    actorClear: () => true,
  });
  const state = filter.update(cave, structure, objects, camera, 1);
  const initial = { count: state.count, structureCount: state.structureCount, objectCount: state.objectCount, lines: [...state.lines.slice(0, state.count * 6)], kinds: [...state.kinds.slice(0, state.count)], updates: state.updates };
  filter.update(cave, structure, objects, camera, 1); const cached = state.updates === initial.updates;
  world[0] = world[10] = -1; filter.update(cave, structure, objects, camera, 1);
  const rotationStable = state.updates === initial.updates && initial.lines.every((v, i) => v === state.lines[i]);
  let shownVisible = 0, samples = 0;
  for (let i = 0; i < initial.count * 6; i += 6) for (let n = 0; n <= 100; n++) {
    const t = n / 100, x = initial.lines[i] * (1 - t) + initial.lines[i + 3] * t, y = initial.lines[i + 1] * (1 - t) + initial.lines[i + 4] * t, z = initial.lines[i + 2] * (1 - t) + initial.lines[i + 5] * t;
    const blocked = y < -0.4 || y > 0.5 && z < -2 || z > 4 && Math.abs(y) < 0.01 && Math.abs(x * 5 / (z + 5)) <= 0.25 + 1e-6;
    samples++; if (!blocked) shownVisible++;
  }
  filter.update(null, structure, objects, camera, 1); const unpossessed = state.count === 0; filter.dispose();
  const empty = { version: 0, occlusionVersion: 0, count: 0, lines: new Float32Array(0) }, sphereSource = { count: 1, lines: new Float32Array([-20, -1, 4, 20, -1, 4]) };
  Object.assign(camera.position, { x: 0, y: 0, z: -20 });
  const sphereFilter = BL.sightGuides.create({ segmentClear: (ax, ay, az) => Math.abs(az) < 1e-9, objectClear: () => true, actorClear: () => true }), sphereState = sphereFilter.update(cave, sphereSource, empty, camera, 1);
  const sphere = { count: sphereState.count, radius: sphereState.radius, left: sphereState.lines[0], right: sphereState.lines[3] };
  cave.root.position.x = 0.5; sphereFilter.update(cave, sphereSource, empty, camera, 1);
  sphere.movedLeft = sphereState.lines[0]; sphere.movedRight = sphereState.lines[3]; sphereFilter.dispose(); cave.root.position.x = 0;
  Object.assign(camera.position, { x: 0, y: 0, z: -5 });
  const thin = [];
  for (const slit of [false, true]) {
    const narrow = BL.sightGuides.create({ segmentClear: () => true, actorClear: () => true, objectClear: (ax, ay, az, bx, by, bz) => {
      const planeX = ax + (bx - ax) * -az / (bz - az), inside = planeX > 0.11 * 5 / 8 && planeX < 0.19 * 5 / 8;
      return slit ? inside : !inside;
    } });
    const result = narrow.update(cave, { count: 1, lines: new Float32Array([-1, 0, 3, 1, 0, 3]) }, empty, camera, 1);
    let invalid = 0, length = 0;
    for (let i = 0; i < result.count * 6; i += 6) {
      length += result.lines[i + 3] - result.lines[i];
      for (let n = 0; n <= 1000; n++) {
        const x = result.lines[i] + (result.lines[i + 3] - result.lines[i]) * n / 1000;
        if (slit ? x > 0.11 + 1e-6 && x < 0.19 - 1e-6 : x < 0.11 - 1e-6 || x > 0.19 + 1e-6) invalid++;
      }
    }
    thin.push({ slit, count: result.count, length, invalid }); narrow.dispose();
  }
  return { initial, samples, shownVisible, cached, rotationStable, unpossessed, sphere, thin };
};

// Independent planes and apertures separate the actor's unrestricted field of
// regard from its line of sight. Camera occlusion alone cannot expose a room.
export const sightGuidePerceptionProbe = () => {
  const BL = window.BL, cave = { root: { position: { x: 0, y: 0, z: 0 } }, parts: { head: { world: BL.math.mat4.create() } } };
  const camera = BL.scene.createCamera({ near: 0.1 }); camera.fov = Math.PI * 2 / 3;
  Object.assign(camera.position, { x: 0, y: 6, z: -15 }); Object.assign(camera.target, { x: 0, y: 1, z: 0 });
  const empty = { version: 0, occlusionVersion: 0, count: 0, lines: new Float32Array(0) }, rows = [];
  const plane = (axis, value, aperture = null) => (ax, ay, az, bx, by, bz) => {
    const a = [ax, ay, az], b = [bx, by, bz], delta = b[axis] - a[axis];
    if (Math.abs(delta) < 1e-12) return true;
    const t = (value - a[axis]) / delta;
    return t <= 0 || t >= 1 || !!(aperture && aperture(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t));
  };
  const wall = plane(2, 2), doorway = plane(2, 2, (x, y) => Math.abs(x) < 0.4 && y > 0.1 && y < 2);
  const floor = plane(1, 0), ceiling = plane(1, 2), front = [-1, 1, 4, 1, 1, 4];
  const cases = [
    { name: "wall", lines: front, terrain: wall, expected: 0 },
    { name: "doorway", lines: front, terrain: doorway, expected: 1 },
    { name: "floor", lines: [-0.5, -2, 2, 0.5, -2, 2], terrain: floor, expected: 0 },
    { name: "ceiling", lines: [-0.5, 4, 2, 0.5, 4, 2], terrain: ceiling, expected: 0 },
    { name: "object wall", lines: front, objects: wall, expected: 0 },
    { name: "object doorway", lines: front, objects: doorway, expected: 1 },
    { name: "all directions", lines: [-0.5, 1, -3, 0.5, 1, -3, -0.5, 1, 3, 0.5, 1, 3, -3, 0.5, 0, -3, 1.5, 0, 3, 0.5, 0, 3, 1.5, 0], expected: 4 },
  ];
  let samples = 0, invalid = 0;
  for (const test of cases) {
    const terrain = test.terrain || (() => true), objects = test.objects || (() => true);
    const filter = BL.sightGuides.create({ segmentClear: terrain, actorClear: objects, objectClear: () => false,
      eyeAt: (actor, out) => Object.assign(out, { x: actor.root.position.x, y: actor.root.position.y + 1, z: actor.root.position.z }) });
    const source = { count: test.lines.length / 6, lines: new Float32Array(test.lines) }, result = filter.update(cave, source, empty, camera, 1);
    let length = 0;
    for (let k = 0; k < result.count * 6; k += 6) {
      length += Math.hypot(result.lines[k + 3] - result.lines[k], result.lines[k + 4] - result.lines[k + 1], result.lines[k + 5] - result.lines[k + 2]);
      for (let n = 0; n <= 200; n++) {
        const t = n / 200, x = result.lines[k] * (1 - t) + result.lines[k + 3] * t, y = result.lines[k + 1] * (1 - t) + result.lines[k + 4] * t, z = result.lines[k + 2] * (1 - t) + result.lines[k + 5] * t;
        samples++; if (!terrain(0, 1, 0, x, y, z) || !objects(0, 1, 0, x, y, z)) invalid++;
      }
    }
    const updates = result.updates, lines = [...result.lines.slice(0, result.count * 6)];
    for (let turn = 0; turn < 8; turn++) {
      cave.parts.head.world[0] = Math.cos(turn * Math.PI / 4); cave.parts.head.world[8] = Math.sin(turn * Math.PI / 4);
      filter.update(cave, source, empty, camera, 1);
    }
    rows.push({ name: test.name, count: result.count, expected: test.expected, length, rotationStable: updates === result.updates && lines.every((v, i) => v === result.lines[i]), eye: [...result.observer.slice(19)] });
    filter.dispose();
  }
  return { rows, samples, invalid };
};

// Slab-ray intersections are independent of the production triangle BVH.
// Check the projected union of a logical owner, including overlapping parts.
export const objectSilhouetteProbe = () => {
  const BL = window.BL, rows = [], failures = [], empty = { count: 0, lines: new Float32Array(0) };
  const hitBox = (origin, direction, box) => {
    let lo = 0, hi = Infinity;
    for (let axis = 0; axis < 3; axis++) {
      const low = box.center[axis] - box.size[axis] / 2, high = box.center[axis] + box.size[axis] / 2;
      if (Math.abs(direction[axis]) < 1e-12) { if (origin[axis] < low || origin[axis] > high) return false; }
      else { const a = (low - origin[axis]) / direction[axis], b = (high - origin[axis]) / direction[axis]; lo = Math.max(lo, Math.min(a, b)); hi = Math.min(hi, Math.max(a, b)); }
      if (lo > hi) return false;
    }
    return hi > 0;
  };
  const fixtures = [
    { name: "front cube", eye: [0, 0, -7], boxes: [{ center: [0, 0, 0], size: [2, 2, 2] }], count: 4 },
    { name: "oblique cube", eye: [4, 3, -7], boxes: [{ center: [0, 0, 0], size: [2, 2, 2] }], count: 6 },
    { name: "nested owner parts", eye: [0, 0, -7], boxes: [{ center: [0, 0, 0], size: [2, 2, 1] }, { center: [0, 0, -0.8], size: [0.8, 0.8, 0.2] }], count: 4 },
    { name: "overlapping owner parts", eye: [0, 0, -7], boxes: [{ center: [0, 0, 0], size: [2, 2, 1] }, { center: [0.9, 0.6, -0.5], size: [1.4, 0.8, 0.4] }] },
  ];
  let samples = 0, rejectedInterior = 0;
  for (const fixture of fixtures) {
    const root = BL.scene.createNode(), owner = BL.scene.createNode(); BL.scene.addChild(root, owner);
    for (const box of fixture.boxes) {
      const geometry = BL.models.box({ w: box.size[0], h: box.size[1], d: box.size[2], color: "#ffffff" });
      // Explicit triangulation must never introduce face diagonals as outlines.
      geometry.faces = geometry.faces.flatMap((face) => [{ ...face, i: [face.i[0], face.i[1], face.i[2]] }, { ...face, i: [face.i[0], face.i[2], face.i[3]] }]);
      BL.scene.addChild(owner, BL.scene.createNode({ geometry, position: { x: box.center[0], y: box.center[1], z: box.center[2] } }));
    }
    BL.scene.updateWorld(root);
    const camera = BL.scene.createCamera({ near: 0.1 }); camera.fov = Math.PI / 2;
    Object.assign(camera.position, { x: fixture.eye[0], y: fixture.eye[1], z: fixture.eye[2] });
    const actor = { root: { position: { x: 0, y: 0, z: -3 } } }, objects = BL.objectGuides.create({ roots: [owner], crew: { cavemen: new Map() } });
    const candidates = objects.collect(actor, 0, 0, -3, camera, 1), candidateCount = candidates.count;
    const filter = BL.sightGuides.create({ segmentClear: () => true, actorClear: () => true, objectClear: () => false, ownerBoundary: objects.ownerBoundaryAt });
    const state = filter.update(actor, empty, candidates, camera, 1), o = state.observer;
    const projected = (x, y, z) => { const d = [x - o[14], y - o[15], z - o[16]], depth = d[0] * o[9] + d[1] * o[10] + d[2] * o[11]; return [(d[0] * o[3] + d[1] * o[4] + d[2] * o[5]) / depth, (d[0] * o[6] + d[1] * o[7] + d[2] * o[8]) / depth]; };
    const boundary = (v, k, t) => {
      const a = projected(v[k], v[k + 1], v[k + 2]), b = projected(v[k + 3], v[k + 4], v[k + 5]), length = Math.hypot(b[0] - a[0], b[1] - a[1]);
      const p = projected(v[k] * (1 - t) + v[k + 3] * t, v[k + 1] * (1 - t) + v[k + 4] * t, v[k + 2] * (1 - t) + v[k + 5] * t);
      if (length < 1e-12) return false;
      const occupied = (sign) => {
        const x = p[0] - (b[1] - a[1]) / length * 0.0001 * sign, y = p[1] + (b[0] - a[0]) / length * 0.0001 * sign;
        const direction = [o[9] + o[3] * x + o[6] * y, o[10] + o[4] * x + o[7] * y, o[11] + o[5] * x + o[8] * y];
        return fixture.boxes.some((box) => hitBox(fixture.eye, direction, box));
      };
      return occupied(-1) !== occupied(1);
    };
    let invalid = 0, interior = 0;
    for (let k = 0; k < state.count * 6; k += 6) for (let n = 1; n < 20; n++) {
      samples++; if (!boundary(state.lines, k, n / 20)) { invalid++; if (failures.length < 8) failures.push({ name: fixture.name, line: [...state.lines.slice(k, k + 6)], t: n / 20 }); }
    }
    for (let k = 0; k < candidates.count * 6; k += 6) for (let n = 1; n < 20; n++) if (!boundary(candidates.lines, k, n / 20)) interior++;
    rejectedInterior += interior;
    rows.push({ name: fixture.name, candidates: candidateCount, count: state.count, expected: fixture.count ?? null, invalid, interior, owners: [...state.sources.slice(0, state.count)].every((source) => candidates.owners[source] === owner) });
    filter.dispose(); objects.dispose();
  }
  return { rows, samples, rejectedInterior, failures };
};

export const objectPerceptionProbe = () => {
  const BL = window.BL, rows = [], empty = { count: 0, lines: new Float32Array(0) };
  for (const name of ["clear", "solid wall", "center aperture", "half aperture", "camera aperture", "narrow screen", "center screen", "near owner, far parts", "outside range", "buried rear surface", "exterior front blocker"]) {
    const root = BL.scene.createNode(), owner = BL.scene.createNode({ geometry: BL.models.box({ w: 4, h: 4, d: 2, color: "#ffffff" }) });
    BL.scene.addChild(root, owner); BL.scene.updateWorld(root);
    const actorZ = name === "near owner, far parts" ? -11.5 : name === "outside range" ? -16 : -6;
    const actor = { root: { position: { x: 0, y: 0, z: actorZ } } }, camera = BL.scene.createCamera({ near: 0.1 }); camera.fov = Math.PI / 2;
    Object.assign(camera.position, name === "near owner, far parts" ? { x: -8, y: 3, z: -16 } : { x: 0, y: 0, z: -18 });
    const planeZ = name === "near owner, far parts" || name === "outside range" ? -6 : -3;
    const clear = (ax, ay, az, bx, by, bz) => {
      if (name === "clear") return true;
      // These actor-visibility cases have a second wall behind the actor,
      // fully hiding the owner from the camera while preserving its doorway.
      if (["center aperture", "half aperture", "near owner, far parts"].includes(name)) {
        const plane = name === "near owner, far parts" ? -14 : -10;
        if ((az < plane && bz > plane) || (az > plane && bz < plane)) return false;
      }
      if (name === "buried rear surface" || name === "exterior front blocker") {
        // The same solid slab first covers only the box's rear half, then
        // moves between the camera and its exposed front. The actor remains
        // beside the unobstructed front surface in both arrangements.
        const lower = [-3, -3, name === "buried rear surface" ? 0 : -11], upper = [3, 3, name === "buried rear surface" ? 2 : -9];
        const a = [ax, ay, az], b = [bx, by, bz]; let enter = 0, leave = 1;
        for (let axis = 0; axis < 3; axis++) {
          const d = b[axis] - a[axis];
          if (Math.abs(d) < 1e-12) { if (a[axis] < lower[axis] || a[axis] > upper[axis]) return true; continue; }
          const p = (lower[axis] - a[axis]) / d, q = (upper[axis] - a[axis]) / d;
          enter = Math.max(enter, Math.min(p, q)); leave = Math.min(leave, Math.max(p, q));
          if (enter > leave) return true;
        }
        return leave <= 0 || enter >= 1;
      }
      const t = (planeZ - az) / (bz - az);
      if (!(t > 0 && t < 1)) return true;
      const x = ax + (bx - ax) * t, y = ay + (by - ay) * t;
      if (name === "solid wall") return false;
      if (name === "half aperture") return x > 0;
      if (name === "narrow screen") return Math.abs(x) > 0.1;
      if (name === "center screen") return Math.abs(x) > 0.1 || Math.abs(y) > 0.1;
      return Math.abs(x) < 0.12 && Math.abs(y) < 0.12;
    };
    const objects = BL.objectGuides.create({ roots: [owner], crew: { cavemen: new Map() } }), candidates = objects.collect(actor, 0, 0, actorZ, camera, 1);
    const perceived = objects.perceived(owner, actor, 0, 0, actorZ, clear);
    const filter = BL.sightGuides.create({ segmentClear: clear, objectClear: objects.cameraClear, actorClear: objects.clear, ownerBoundary: objects.ownerBoundaryAt, ownerPerceived: objects.perceived, ownerConcealed: objects.concealed, ownerClear: objects.ownerClear, ownerDistance: objects.distance });
    const result = filter.update(actor, empty, candidates, camera, 1);
    const baseline = BL.sightGuides.create({ segmentClear: () => true, objectClear: () => false, actorClear: () => true, ownerBoundary: objects.ownerBoundaryAt, ownerPerceived: () => true, ownerDistance: objects.distance });
    const full = baseline.update(actor, empty, candidates, camera, 1);
    const complete = result.count === full.count && [...result.lines.slice(0, result.count * 6)].every((v, i) => Math.abs(v - full.lines[i]) < 1e-7);
    let length = 0, actorVisible = 0, cameraVisible = 0, outlineSamples = 0, beyondRadius = 0, visibleFrontSamples = 0;
    for (let y = -2; y <= 2; y += 0.5) for (let x = -2; x <= 2; x += 0.5) if (clear(camera.position.x, camera.position.y, camera.position.z, x, y, -1)) visibleFrontSamples++;
    for (let k = 0; k < result.count * 6; k += 6) {
      length += Math.hypot(result.lines[k + 3] - result.lines[k], result.lines[k + 4] - result.lines[k + 1], result.lines[k + 5] - result.lines[k + 2]);
      for (let n = 1; n < 20; n++) {
        const t = n / 20, x = result.lines[k] * (1 - t) + result.lines[k + 3] * t, y = result.lines[k + 1] * (1 - t) + result.lines[k + 4] * t, z = result.lines[k + 2] * (1 - t) + result.lines[k + 5] * t;
        outlineSamples++; if (clear(0, 0, actorZ, x, y, z)) actorVisible++;
        if (clear(camera.position.x, camera.position.y, camera.position.z, x, y, z)) cameraVisible++;
        if (Math.hypot(x, y, z - actorZ) > 12) beyondRadius++;
      }
    }
    rows.push({ name, perceived, concealed: objects.concealed(owner, actor, clear), candidates: candidates.count, count: result.count, complete, length, actorVisible, cameraVisible, outlineSamples, beyondRadius, visibleFrontSamples, centerVisible: clear(0, 0, actorZ, 0, 0, -1), frontVisible: clear(0, 0, -18, 0, 0, -1), rearBlocked: !clear(0, 0, -18, 0, 0, 1), rearSelfCovered: !objects.ownerClear(owner, 0, 0, -17.9, 0, 0, 0.982) });
    baseline.dispose(); filter.dispose(); objects.dispose();
  }
  return { rows };
};

export const objectFadeProbe = () => {
  const BL = window.BL, rows = [], empty = { count: 0, lines: new Float32Array(0) };
  for (const dt of [1 / 20, 1 / 120]) {
    const root = BL.scene.createNode(), owner = BL.scene.createNode({ geometry: BL.models.box({ w: 2, h: 2, d: 2, color: "#ffffff" }), position: { x: 0, y: 0, z: 4 } });
    BL.scene.addChild(root, owner); BL.scene.updateWorld(root);
    const actor = { root: { position: { x: 0, y: 0, z: 0 } } }, camera = BL.scene.createCamera({ near: 0.1 }); camera.fov = Math.PI / 2;
    Object.assign(camera.position, { x: 0, y: 0, z: -18 }); Object.assign(camera.target, { x: 0, y: 0, z: 4 });
    let perceived = true, hidden = true, queries = 0, active = actor;
    const clear = (ax, ay, az, bx, by, bz) => {
      queries++;
      const crosses = (plane) => (az < plane && bz > plane) || (az > plane && bz < plane);
      return !(hidden && crosses(-12) || !perceived && crosses(2));
    };
    const objectRoots = [owner], objects = BL.objectGuides.create({ roots: objectRoots, crew: { cavemen: new Map() } });
    const filter = BL.sightGuides.create({ segmentClear: clear, objectClear: objects.cameraClear, actorClear: objects.clear, ownerBoundary: objects.ownerBoundaryAt, ownerPerceived: objects.perceived, ownerConcealed: objects.concealed, ownerClear: objects.ownerClear, ownerDistance: objects.distance });
    const state = filter.state;
    const canvas = typeof document === "undefined" ? null : document.createElement("canvas");
    if (canvas) { canvas.width = 640; canvas.height = 360; Object.defineProperties(canvas, { clientWidth: { value: 640 }, clientHeight: { value: 360 } }); }
    const context = canvas?.getContext("2d", { willReadFrequently: true }), cover = canvas ? BL.cameraCover.create(canvas) : null;
    const pixelAlpha = () => {
      if (!cover) return null;
      context.clearRect(0, 0, 640, 360); cover.draw(camera, null, false, false, () => false, () => null, state);
      const pixels = context.getImageData(0, 0, 640, 360).data; let total = 0;
      for (let i = 3; i < pixels.length; i += 4) total += pixels[i];
      return total;
    };
    let alphaError = 0, complete = true, full = null;
    const take = () => {
      const slot = state.owners.indexOf(owner), alpha = slot < 0 ? 0 : state.ownerAlphas[slot];
      for (let n = 0; n < state.count; n++) if (state.kinds[n]) {
        const lineOwner = objects.result.owners[state.sources[n]], ownerSlot = state.owners.indexOf(lineOwner);
        alphaError = Math.max(alphaError, Math.abs(state.alphas[n] - state.ownerAlphas[ownerSlot]));
      }
      if (hidden && alpha > 1e-7 && full) complete = complete && state.count === full.length / 6 && full.every((v, i) => Math.abs(v - state.lines[i]) < 1e-7);
      return { alpha, count: state.count, target: slot < 0 ? 0 : state.ownerTargets[slot], distance: slot < 0 ? null : state.ownerDistances[slot] };
    };
    const step = (delta = dt) => {
      BL.scene.updateWorld(root);
      const source = objects.collect(active, actor.root.position.x, actor.root.position.y, actor.root.position.z, camera, 1, state.retainedOwners, state.retainedCount);
      filter.update(active, empty, source, camera, 1, delta); return take();
    };
    const run = (seconds, samples = null) => {
      for (let n = 0; n < Math.round(seconds / dt); n++) {
        const snapshot = step();
        if (samples && (n + 1) % Math.round(0.05 / dt) === 0) samples.push({ ...snapshot, pixels: pixelAlpha() });
      }
    };
    const invalidate = () => { objects.result.occlusionVersion++; };
    const initial = step(0), fadeIn = [{ ...initial, pixels: pixelAlpha() }], beforeQueries = queries, beforeUpdates = state.updates;
    run(0.3, fadeIn); const cached = queries === beforeQueries && state.updates === beforeUpdates;
    full = [...state.lines.slice(0, state.count * 6)];
    perceived = false; invalidate(); const beforeLoss = take().alpha, loss = step(0).alpha;
    run(0.1); const beforeReverse = take().alpha;
    perceived = true; invalidate(); const afterReverse = step(0).alpha; run(0.3); const recovered = take().alpha;
    const beforeVisible = take(); hidden = false; invalidate(); const visible = { ...step(0), pixels: pixelAlpha() };
    hidden = true; invalidate(); const hiddenReturn = { ...step(0), pixels: pixelAlpha() };
    perceived = false; invalidate(); step(0); const fadeOut = [{ ...take(), pixels: pixelAlpha() }]; run(0.3, fadeOut);
    perceived = true; invalidate(); run(0.3);
    const distances = [];
    for (const distance of [10.5, 10.75, 11, 11.25, 11.5, 11.75, 12]) {
      actor.root.position.z = 3 - distance; step(0); run(0.3);
      const t = Math.max(0, Math.min(1, (12 - distance) / 1.5)); distances.push({ distance, expected: t * t * (3 - 2 * t), ...take() });
    }
    actor.root.position.z = 0; step(0); run(0.3); actor.root.position.z = -9.1;
    const boundary = [step(0)]; run(0.3, boundary);
    actor.root.position.z = 0; step(0); run(0.3);
    owner.visible = false; step(0);
    const hiddenCleared = state.count === 0 && !state.owners.includes(owner) && !state.retainedOwners.includes(owner);
    owner.visible = true; step(0); run(0.3);
    BL.scene.removeChild(root, owner); objects.refresh(); step(0);
    const removedCleared = state.count === 0 && !state.owners.includes(owner) && !state.retainedOwners.includes(owner);
    BL.scene.addChild(root, owner); objects.refresh(); step(0); run(0.3);
    active = null; step(0);
    const releasedCleared = state.count === 0 && state.ownerCount === 0 && state.retainedCount === 0 && state.owners.every((owner) => owner === null) && state.retainedOwners.every((owner) => owner === null) && state.ownerAlphas.every((alpha) => alpha === 0);
    active = actor; const reentry = step(0).alpha; run(0.1); full = null; owner.position.x = 3; step(0);
    const second = BL.scene.createNode({ geometry: owner.geometry, position: { x: 6, y: 0, z: 4 } });
    BL.scene.addChild(root, second); objectRoots.push(second); objects.refresh(); step(0); step(0.05);
    const ownerAlpha = (node) => state.ownerAlphas[state.owners.indexOf(node)];
    const firstBefore = ownerAlpha(owner), secondBefore = ownerAlpha(second), orderBefore = objects.result.owners[0];
    // The uncapped registry keeps registration order instead of sorting by
    // distance. Reattach one owner between frames so its real source edges
    // move after the second owner without changing either remembered fade.
    second.position.x = -1.5; objectRoots.splice(objectRoots.indexOf(owner), 1); BL.scene.removeChild(root, owner); objects.refresh();
    BL.scene.addChild(root, owner); objectRoots.push(owner); objects.refresh(); step(0);
    const orderChanged = orderBefore !== objects.result.owners[0], reorderError = Math.max(Math.abs(firstBefore - ownerAlpha(owner)), Math.abs(secondBefore - ownerAlpha(second)));
    active = { root: { position: { ...actor.root.position } } }; step(0);
    const possessionReset = state.ownerAlphas.every((alpha) => alpha === 0) && state.retainedCount === 0;
    filter.dispose();
    const disposed = state.count === 0 && state.ownerCount === 0 && state.retainedCount === 0 && state.owners.every((owner) => owner === null) && state.retainedOwners.every((owner) => owner === null) && state.ownerAlphas.every((alpha) => alpha === 0);
    rows.push({ dt, fadeSeconds: state.fadeSeconds, fadeStart: state.fadeStart, initial, fadeIn, fadeOut, beforeVisible, visible, hiddenReturn, cached, reversalJump: Math.max(Math.abs(beforeLoss - loss), Math.abs(beforeReverse - afterReverse)), beforeReverse, recovered, distances, boundary, alphaError, complete, hiddenCleared, removedCleared, releasedCleared, reentry, orderChanged, reorderError, possessionReset, disposed });
    cover?.dispose(); objects.dispose();
  }
  const rateError = Math.max(...rows[0].fadeIn.map((sample, i) => Math.abs(sample.alpha - rows[1].fadeIn[i].alpha)), ...rows[0].fadeOut.map((sample, i) => Math.abs(sample.alpha - rows[1].fadeOut[i].alpha)), ...rows[0].distances.map((sample, i) => Math.abs(sample.alpha - rows[1].distances[i].alpha)));
  return { rows, rateError };
};

export const sightGuideWorldProbe = () => {
  const B = window.__ooga, BL = window.BL, scene = BL.scenes.hub, H = B.headquarters, cave = [...B.cavemen.values()].find((c) => c.state === "working");
  const rows = [], failures = [], characters = []; let time = B.renderOpts.matrix.time, samples = 0, objectSamples = 0, hiddenCandidates = 0, provenance = 0, behindActorSamples = 0, actorSamples = 0, ownerChecks = 0;
  const tick = (seconds) => { for (let n = 0; n < Math.ceil(seconds * 60); n++) scene.update(1 / 60, time += 1 / 60); };
  const draw = () => {
    BL.scene.updateWorld(scene.root); B.renderer.render(scene.root, B.camera, B.renderOpts);
    // These are settled visibility snapshots; objectFadeProbe checks every
    // intermediate opacity and retention state separately.
    for (let n = 0; n < 18; n++) scene.overlay(1 / 60);
  };
  const snapshot = () => {
    const s = H.sightGuides;
    return { count: s.count, capacity: s.capacity, structureCount: s.structureCount, structureFaces: H.cameraCover.structureFaces, objectCount: s.objectCount, radius: s.radius, updates: s.updates, observer: [...s.observer], lines: [...s.lines.slice(0, s.count * 6)], kinds: [...s.kinds.slice(0, s.count)], sources: [...s.sources.slice(0, s.count)] };
  };
  const same = (a, b) => a.count === b.count && a.lines.every((v, i) => v === b.lines[i]) && a.kinds.every((v, i) => v === b.kinds[i]);
  const ownerWitness = (owner, o) => {
    let perceived = false, hidden = false;
    const visit = (node) => {
      if (!node.visible || perceived && hidden) return;
      if (node.geometry) {
        const v = node.geometry.verts, m = node.world;
        for (const face of node.geometry.faces) for (let triangle = 1; triangle + 1 < face.i.length && !(perceived && hidden); triangle++) {
          const a = face.i[0] * 3, b = face.i[triangle] * 3, c = face.i[triangle + 1] * 3;
          for (const bary of [[1 / 3, 1 / 3], [0, 0], [0.5, 0], [0, 0.5], [0.5, 0.5], [1, 0], [0, 1]]) {
            const lx = v[a] + (v[b] - v[a]) * bary[0] + (v[c] - v[a]) * bary[1], ly = v[a + 1] + (v[b + 1] - v[a + 1]) * bary[0] + (v[c + 1] - v[a + 1]) * bary[1], lz = v[a + 2] + (v[b + 2] - v[a + 2]) * bary[0] + (v[c + 2] - v[a + 2]) * bary[1];
            const x = m[0] * lx + m[4] * ly + m[8] * lz + m[12], y = m[1] * lx + m[5] * ly + m[9] * lz + m[13], z = m[2] * lx + m[6] * ly + m[10] * lz + m[14];
            if (!perceived && Math.hypot(x - o[0], y - o[1], z - o[2]) <= 12 + 1e-5) {
              const dx = x - o[19], dy = y - o[20], dz = z - o[21], k = Math.max(0, 1 - 0.018 / Math.hypot(dx, dy, dz)), ex = o[19] + dx * k, ey = o[20] + dy * k, ez = o[21] + dz * k;
              perceived = B.island.sightClearAt(o[19], o[20], o[21], ex, ey, ez) && H.objectGuides.clear(o[19], o[20], o[21], ex, ey, ez, cave, owner);
            }
            if (!hidden) {
              const dx = x - o[14], dy = y - o[15], dz = z - o[16], depth = dx * o[9] + dy * o[10] + dz * o[11];
              if (depth > o[17] && depth < o[18]) {
                const start = o[17] / depth, k = Math.max(0, 1 - 0.018 / Math.hypot(dx, dy, dz));
                const ax = o[14] + dx * start, ay = o[15] + dy * start, az = o[16] + dz * start, ex = o[14] + dx * k, ey = o[15] + dy * k, ez = o[16] + dz * k;
                hidden = !B.island.sightClearAt(ax, ay, az, ex, ey, ez) || !H.objectGuides.clear(ax, ay, az, ex, ey, ez, cave, owner);
              }
            }
            if (perceived && hidden) break;
          }
        }
      }
      for (const child of node.children) visit(child);
    };
    visit(owner); return { perceived, hidden };
  };
  const audit = (s) => {
    const o = s.observer, checkedOwners = new Set();
    for (let i = 0; i < s.count; i++) {
      const original = (s.kinds[i] ? H.objectGuides.result : H.rockGuides.all), index = s.sources[i] * 6, v = original.lines;
      const vx = v[index + 3] - v[index], vy = v[index + 4] - v[index + 1], vz = v[index + 5] - v[index + 2], length2 = vx * vx + vy * vy + vz * vz;
      for (const endpoint of [0, 3]) {
        const n = i * 6 + endpoint, dx = s.lines[n] - v[index], dy = s.lines[n + 1] - v[index + 1], dz = s.lines[n + 2] - v[index + 2], t = (dx * vx + dy * vy + dz * vz) / length2;
        provenance++;
        if ((s.sources[i] >= original.count || t < -1e-5 || t > 1 + 1e-5 || Math.hypot(dx - t * vx, dy - t * vy, dz - t * vz) > 1e-5) && failures.length < 12) failures.push({ kind: "edge provenance", line: i, source: s.sources[i], t });
      }
      const k = i * 6, length = Math.hypot(s.lines[k + 3] - s.lines[k], s.lines[k + 4] - s.lines[k + 1], s.lines[k + 5] - s.lines[k + 2]);
      const steps = Math.max(2, Math.ceil(length / 0.025));
      for (let n = 0; n <= steps; n++) {
        const t = n / steps, x = s.lines[k] * (1 - t) + s.lines[k + 3] * t, y = s.lines[k + 1] * (1 - t) + s.lines[k + 4] * t, z = s.lines[k + 2] * (1 - t) + s.lines[k + 5] * t;
        const dx = x - o[14], dy = y - o[15], dz = z - o[16], distance = Math.hypot(dx, dy, dz), retreat = Math.max(0, 1 - 0.018 / distance);
        const depth = dx * o[9] + dy * o[10] + dz * o[11], right = dx * o[3] + dy * o[4] + dz * o[5], up = dx * o[6] + dy * o[7] + dz * o[8];
        const inView = depth >= o[17] - 1e-5 && depth <= o[18] + 1e-5 && Math.abs(right) <= depth * o[12] + 1e-5 && Math.abs(up) <= depth * o[13] + 1e-5;
        const inSphere = Math.hypot(x - o[0], y - o[1], z - o[2]) <= 12 + 1e-5, near = o[17] / depth;
        const ax = o[14] + dx * near, ay = o[15] + dy * near, az = o[16] + dz * near;
        const tx = o[14] + dx * retreat, ty = o[15] + dy * retreat, tz = o[16] + dz * retreat;
        const owner = s.kinds[i] ? H.objectGuides.result.owners[s.sources[i]] : null;
        if (owner && !checkedOwners.has(owner)) {
          checkedOwners.add(owner); ownerChecks++;
          const witness = ownerWitness(owner, o);
          if ((!witness.perceived || !witness.hidden) && failures.length < 12) failures.push({ kind: "ineligible object owner", line: i, ...witness });
        }
        const rockClear = B.island.sightClearAt(ax, ay, az, tx, ty, tz), objectClear = H.objectGuides.clear(ax, ay, az, tx, ty, tz, cave, owner);
        const hx = x - o[19], hy = y - o[20], hz = z - o[21], headRetreat = Math.max(0, 1 - 0.018 / Math.hypot(hx, hy, hz));
        const ex = o[19] + hx * headRetreat, ey = o[20] + hy * headRetreat, ez = o[21] + hz * headRetreat;
        const actorRockClear = B.island.sightClearAt(o[19], o[20], o[21], ex, ey, ez), actorObjectClear = H.objectGuides.clear(o[19], o[20], o[21], ex, ey, ez, cave, owner);
        if (!owner) actorSamples++;
        samples++; if (s.kinds[i]) objectSamples++;
        const h = cave.parts.head.world;
        if ((x - o[0]) * h[8] + (y - o[1]) * h[9] + (z - o[2]) * h[10] < -0.1) behindActorSamples++;
        if ((!inView || !owner && !inSphere || rockClear && objectClear) && failures.length < 12) failures.push({ kind: "camera-visible edge or distant structure", line: i, object: !!s.kinds[i], x, y, z, inView, inSphere, rockClear, objectClear });
        if (!owner && (!actorRockClear || !actorObjectClear) && failures.length < 12) failures.push({ kind: "structural edge hidden from actor", line: i, x, y, z, eye: o.slice(19), actorRockClear, actorObjectClear });
      }
    }
  };
  for (const basement of [false, true]) {
    const ownLevel = basement ? B.island.headquarters.basement : B.island.headquarters, oppositeLevel = basement ? B.island.headquarters : B.island.headquarters.basement;
    const bed = H.mattresses.find((b) => {
      if (b.basement !== basement || b.sleeper) return false;
      const room = b.room, x = room.x - Math.sin(room.angle) * 0.75, z = room.z + Math.cos(room.angle) * 0.75;
      const blocked = (r) => r !== room && Math.hypot(r.x - x, r.floor - room.floor, r.z - z) < 10 && !B.island.sightClearAt(x, room.floor + 1.1, z, r.x, r.floor + 1.1, r.z);
      return ownLevel.rooms.some(blocked) && oppositeLevel.rooms.some(blocked);
    });
    if (!bed) throw new Error(`No free ${basement ? "basement" : "HQ"} bed with real neighboring-room and cross-floor occlusion fixtures`);
    const room = bed.room;
    const position = { x: room.x - Math.sin(room.angle) * 0.75, y: room.floor, z: room.z + Math.cos(room.angle) * 0.75 };
    B.pilot.possess(cave); B.pilot.enterClose();
    B.pilot.navigate({ position, yaw: Math.atan2(bed.x - position.x, bed.z - position.z) - Math.PI, pitch: 0, dist: 6 }); tick(0.5);
    document.getElementById("scene").dispatchEvent(new WheelEvent("wheel", { deltaY: 60, cancelable: true })); tick(0.8);
    // Randy can reserve any room. Aim at this free bed so every eligible room
    // puts the same actor-visible object behind the floor and inside the view.
    Object.assign(B.camera.position, { x: room.x, y: room.floor - 0.4, z: room.z }); Object.assign(B.camera.target, { x: bed.x, y: bed.y + bed.sleep.surface, z: bed.z });
    const eye = B.camera.position, target = B.camera.target, near = B.camera.near / Math.hypot(target.x - eye.x, target.y - eye.y, target.z - eye.z);
    const cameraBedBlocked = !B.island.sightClearAt(eye.x + (target.x - eye.x) * near, eye.y + (target.y - eye.y) * near, eye.z + (target.z - eye.z) * near, target.x, target.y, target.z);
    if (!cameraBedBlocked) failures.push({ kind: "bed camera fixture has no intervening rock", basement, room: room.index });
    draw(); const initial = snapshot(); audit(initial);
    const bedEdges = initial.kinds.filter((kind, n) => kind && H.objectGuides.result.owners[initial.sources[n]] === bed.node).length;
    let cameraChanged = false, cameraUpdated = true;
    for (const dx of [-2, 1, 3]) {
      Object.assign(B.camera.position, { x: room.x + dx, y: room.floor - 0.4, z: room.z + 0.4 });
      Object.assign(B.camera.target, { x: room.x, y: room.floor + 1, z: room.z }); draw();
      const next = snapshot(); cameraChanged = cameraChanged || !same(initial, next); cameraUpdated = cameraUpdated && next.updates > initial.updates;
    }
    const beforeTurn = snapshot(), heading = cave.parts.head.rotation.y;
    cave.parts.head.rotation.y = heading + Math.PI; draw(); const turned = snapshot(); audit(turned);
    cave.parts.head.rotation.y = heading; cave.root.position.x += 0.15; draw(); const moved = snapshot(); audit(moved);
    const source = H.rockGuides.all.lines, observer = initial.observer;
    for (let i = 0; i < source.length; i += 6) {
      const x = (source[i] + source[i + 3]) / 2, y = (source[i + 1] + source[i + 4]) / 2, z = (source[i + 2] + source[i + 5]) / 2;
      const dx = x - observer[19], dy = y - observer[20], dz = z - observer[21], k = Math.max(0, 1 - 0.018 / Math.hypot(dx, dy, dz));
      if (Math.hypot(x - observer[0], y - observer[1], z - observer[2]) < 12 && !B.island.sightClearAt(observer[19], observer[20], observer[21], observer[19] + dx * k, observer[20] + dy * k, observer[21] + dz * k)) hiddenCandidates++;
    }
    rows.push({ basement, room: room.index, cameraBedBlocked, count: initial.count, capacity: initial.capacity, radius: initial.radius, structureCount: initial.structureCount, structureFaces: initial.structureFaces, objectCount: initial.objectCount, bedEdges, cameraChanged, cameraUpdated, rotationStable: same(beforeTurn, turned) && turned.updates === beforeTurn.updates, moved: moved.updates > turned.updates });
    const other = [...B.cavemen.values()].find((c) => c !== cave && c.state === "working"), saved = { ...other.root.position };
    const aim = (x, y, z) => {
      Object.assign(B.camera.target, { x, y, z });
    };
    const ownerCount = () => {
      const s = H.sightGuides, objects = H.objectGuides.result; let count = 0;
      for (let n = 0; n < s.count; n++) if (s.kinds[n] && objects.owners[s.sources[n]] === other.root) count++;
      return count;
    };
    try {
      Object.assign(other.root.position, { x: bed.walkAt.x, y: room.floor + other.baseY, z: bed.walkAt.z });
      Object.assign(B.camera.position, { x: position.x, y: room.floor + 1.1, z: position.z });
      aim(bed.walkAt.x, room.floor + 1.1, bed.walkAt.z); draw();
      const visible = ownerCount(); audit(snapshot());
      Object.assign(B.camera.position, { x: position.x, y: room.floor - 0.4, z: position.z }); draw();
      const sameRoomHidden = ownerCount(); audit(snapshot());
      const level = basement ? B.island.headquarters.basement : B.island.headquarters;
      const blocked = level.rooms.find((r) => r !== room && Math.hypot(r.x - cave.root.position.x, r.z - cave.root.position.z) < 11 && !B.island.sightClearAt(position.x, room.floor + 1.1, position.z, r.x, r.floor + 1.1, r.z));
      if (!blocked) throw new Error("No blocked neighboring room fixture");
      Object.assign(other.root.position, { x: blocked.x, y: blocked.floor + other.baseY, z: blocked.z });
      aim(blocked.x, blocked.floor + 1.1, blocked.z); draw();
      const row = { basement, visible, sameRoomHidden, blocked: ownerCount(), blockedCandidate: H.objectGuides.result.owners.slice(0, H.objectGuides.result.count).includes(other.root) }; audit(snapshot());
      const otherLevel = basement ? B.island.headquarters : B.island.headquarters.basement;
      const floorRoom = otherLevel.rooms.find((r) => Math.hypot(r.x - cave.root.position.x, r.floor + other.baseY - cave.root.position.y, r.z - cave.root.position.z) < 11 && !B.island.sightClearAt(position.x, room.floor + 1.1, position.z, r.x, r.floor + 1.1, r.z));
      if (!floorRoom) throw new Error(`No blocked other-floor room fixture: ${JSON.stringify({ basement, room: room.index, intended: position, actual: cave.root.position })}`);
      Object.assign(other.root.position, { x: floorRoom.x, y: floorRoom.floor + other.baseY, z: floorRoom.z });
      aim(floorRoom.x, floorRoom.floor + 1.1, floorRoom.z); draw();
      row.otherFloor = ownerCount(); row.otherFloorCandidate = H.objectGuides.result.owners.slice(0, H.objectGuides.result.count).includes(other.root); audit(snapshot());
      characters.push(row);
    } finally { Object.assign(other.root.position, saved); cave.parts.head.rotation.x = 0; cave.parts.head.rotation.y = heading; }
  }
  B.pilot.release(true); draw(); const unpossessed = H.sightGuides.count === 0;
  return { rows, samples, actorSamples, ownerChecks, objectSamples, hiddenCandidates, provenance, behindActorSamples, characters, unpossessed, failures };
};
