// Stair faces belong to a hillside side; its crest remains a sight barrier.
export const slopeOutlineSectionsProbe = () => {
  const BL = window.BL, B = window.__ooga, island = B.island, guides = B.headquarters.rockGuides;
  const failures = [], fail = (kind, detail = {}) => { if (failures.length < 12) failures.push({ kind, ...detail }); };
  const synthetic = { risers: 0, treads: 0, joined: 0, excluded: 0, terraceCells: 0, terraceEndsJoined: false, oppositeSides: false, diagonalJoined: false, cacheReused: false };
  const fixture = (surfaceAt) => ({ unit: 0.25, radius: 8, sightGrid: new Float64Array([0.25, -8, -8, -8]), surfaceAt, frontageColumnAt: () => 0 });
  const ridge = fixture((x) => Math.max(0, 4 - Math.ceil(Math.max(0, Math.abs(x) - 1.5) / 0.5) * 0.5));
  const ridgeGuides = BL.slopeGuides.create({ island: ridge }), out = { side: -1, sector: -1, x: 0, z: 0 }, sides = [];
  for (const sign of [-1, 1]) {
    let side = -1;
    for (let step = 0; step < 8; step++) {
      const x = sign * (5 - step * 0.5), height = (step + 1) * 0.5;
      const accepted = ridgeGuides.classify(x, height - 0.25, 0.125, sign, 0, 0, out);
      synthetic.risers++;
      if (!accepted || side >= 0 && side !== out.side) fail("split synthetic riser", { sign, step, accepted, side, actual: out.side });
      else { side = out.side; synthetic.joined++; }
      if (step === 7) continue;
      const tread = ridgeGuides.classify(x - sign * 0.125, height, 0.125, 0, 1, 0, out);
      synthetic.treads++;
      if (!tread || out.side !== side) fail("split synthetic tread", { sign, step, tread, side, actual: out.side });
      else synthetic.joined++;
    }
    sides.push(side);
  }
  synthetic.oppositeSides = sides[0] >= 0 && sides[1] >= 0 && sides[0] !== sides[1];
  if (!synthetic.oppositeSides) fail("ridge sides joined", { sides });
  for (const x of [-1.375, -0.125, 0.125, 1.375]) {
    if (ridgeGuides.classify(x, 4, 0.125, 0, 1, 0, out)) fail("crest outlined", { x });
    else synthetic.excluded++;
  }
  for (const normal of [[0, -1, 0], [-1, 0, 0]]) {
    if (ridgeGuides.classify(-5, 4.5, 0.125, ...normal, out)) fail("ceiling or buried riser outlined", { normal });
    else synthetic.excluded++;
  }
  const shelf = fixture((x) => x < -4 ? 1 : x < -2 ? 2 : x < 2 ? 3 : 4);
  const shelfGuides = BL.slopeGuides.create({ island: shelf });
  if (shelfGuides.classify(0.125, 3, 0.125, 0, 1, 0, out)) fail("broad intermediate platform outlined");
  else synthetic.excluded++;
  // A 1.5 m terrace is one six-cell strip. The endpoint cells are more than
  // one metre from the opposite riser, but still belong to the same stair.
  const terrace = fixture((x) => x < -2 ? 1 : x < -0.75 ? 2 : x < 0.75 ? 3 : x < 2 ? 4 : 5);
  const terraceGuides = BL.slopeGuides.create({ island: terrace });
  const lowerRiser = terraceGuides.classify(-0.75, 2.5, 0.125, -1, 0, 0, out), terraceSide = out.side;
  const upperRiser = terraceGuides.classify(0.75, 3.5, 0.125, -1, 0, 0, out);
  synthetic.terraceEndsJoined = lowerRiser && upperRiser && out.side === terraceSide;
  if (!synthetic.terraceEndsJoined) fail("terrace risers split", { lowerRiser, upperRiser, expected: terraceSide, actual: out.side });
  for (let cell = 0; cell < 6; cell++) {
    const x = -0.625 + cell * 0.25, accepted = terraceGuides.classify(x, 3, 0.125, 0, 1, 0, out);
    if (!accepted || out.side !== terraceSide) fail("short terrace cell missing or split", { cell, x, accepted, expected: terraceSide, actual: out.side });
    else synthetic.terraceCells++;
  }
  const diagonal = fixture((x, z) => Math.max(0, Math.min(4, Math.floor((x + z + 8) / 0.5) * 0.5)));
  const diagonalGuides = BL.slopeGuides.create({ island: diagonal });
  let diagonalSide = -1, diagonalJoined = true;
  for (let step = 0; step < 4; step++) {
    const height = 2 + step * 0.5;
    for (const p of [[-3 + step * 0.5, height - 0.25, -3.125, -1, 0, 0], [-3.125 + step * 0.5, height - 0.25, -3, 0, 0, -1], [-2.875 + step * 0.5, height, -3.125, 0, 1, 0]]) {
      const accepted = diagonalGuides.classify(...p, out);
      if (!accepted || diagonalSide >= 0 && diagonalSide !== out.side) { diagonalJoined = false; fail("diagonal stair split", { step, p, accepted, expected: diagonalSide, actual: out.side }); }
      else diagonalSide = out.side;
    }
  }
  synthetic.diagonalJoined = diagonalJoined;
  synthetic.cacheReused = BL.slopeGuides.create({ island: ridge }) === ridgeGuides && BL.slopeGuides.create({ island: island }) === BL.slopeGuides.create({ island });
  if (!synthetic.cacheReused) fail("slope cache rebuilt");

  const contexts = guides.contexts.filter((context) => context.kind === "surface");
  const geometry = { sides: contexts.length, triangles: 0, risers: 0, treads: 0, mixedSides: 0, invalid: 0, buried: 0, covered: 0, crestOrPlatform: 0, splitOwner: 0 };
  const ownerIds = new Set(), directions = [];
  for (let sector = 0; sector < 8; sector++) directions.push([Math.cos(sector * Math.PI / 4), Math.sin(sector * Math.PI / 4)]);
  for (const context of contexts) {
    if (!Number.isInteger(context.source.slopeSide) || context.source.sector < 0 || context.source.sector > 7 || context.walls.length !== 1) { geometry.invalid++; fail("slope owner missing", { index: context.index }); }
    if (ownerIds.has(context.source.slopeSide)) geometry.splitOwner++;
    ownerIds.add(context.source.slopeSide);
    let hasRiser = false, hasTread = false;
    for (let group = 0; group < context.surfaceGroupCount; group++) {
      const at = group * 3, c = context.surfaceCenters, s = context.surfaceSamples, x = c[at], y = c[at + 1], z = c[at + 2];
      const dx = s[at] - x, dy = s[at + 1] - y, dz = s[at + 2] - z;
      if (!island.clearAt(s[at], s[at + 1], s[at + 2])) geometry.buried++;
      if (Number.isFinite(island.ceilingAt(s[at], s[at + 1], s[at + 2]))) geometry.covered++;
      if (dy > 0.02) {
        hasTread = true; geometry.treads++;
        if (Math.abs(y - island.surfaceAt(x, z)) > 1e-4) geometry.invalid++;
        // Find the first actual height change in both directions. Every
        // point along a short terrace has the same total strip width; its
        // distance to just one endpoint can exceed the former search radius.
        let intermediate = false;
        for (const direction of directions) {
          const dx = Math.round(direction[0]), dz = Math.round(direction[1]), stride = Math.hypot(dx, dz) * island.unit;
          let lower = 0, higher = 0, downOpen = true, upOpen = true;
          for (let step = 1; step * stride <= 2 + stride + 1e-4 && ((!lower && downOpen) || (!higher && upOpen)); step++) {
            if (downOpen && !lower) {
              const height = island.surfaceAt(x + dx * step * island.unit, z + dz * step * island.unit);
              if (height > y + 1e-4) downOpen = false;
              else if (height < y - 1e-4) lower = step * stride;
            }
            if (upOpen && !higher) {
              const height = island.surfaceAt(x - dx * step * island.unit, z - dz * step * island.unit);
              if (height < y - 1e-4) upOpen = false;
              else if (height > y + 1e-4) higher = step * stride;
            }
          }
          if (lower && higher && lower + higher - stride <= 2 + 1e-4) { intermediate = true; break; }
        }
        if (!intermediate) { geometry.crestOrPlatform++; fail("real crest or platform outlined", { x, y, z, index: context.index }); }
      } else {
        hasRiser = true; geometry.risers++;
        const lower = island.surfaceAt(s[at], s[at + 2]), higher = island.surfaceAt(x - dx, z - dz);
        if (Math.abs(dy) > 1e-4 || lower >= higher - 1e-4 || y < Math.max(0, lower) - 1e-4 || y > higher + 1e-4) { geometry.invalid++; fail("not an exposed riser", { x, y, z, lower, higher }); }
      }
    }
    if (hasRiser && hasTread) geometry.mixedSides++;
    for (let at = 0; at < context.surface.length; at += 9) {
      geometry.triangles++;
      const v = context.surface, ux = v[at + 3] - v[at], uy = v[at + 4] - v[at + 1], uz = v[at + 5] - v[at + 2], vx = v[at + 6] - v[at], vy = v[at + 7] - v[at + 1], vz = v[at + 8] - v[at + 2];
      const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx, length = Math.hypot(nx, ny, nz);
      if (length <= 1e-8 || Math.abs(ny) > length * 0.1 && Math.abs(ny) < length * 0.9) geometry.invalid++;
    }
  }
  if (!geometry.mixedSides || !geometry.treads || !geometry.risers || geometry.invalid || geometry.buried || geometry.covered || geometry.crestOrPlatform || geometry.splitOwner) fail("invalid real slopes", geometry);

  const actor = { baseY: 0, root: { position: { x: 0, y: 0, z: 0 } } }, camera = BL.scene.createCamera({ near: 0.1, far: 100 });
  const fixtures = [], runtime = { positions: 0, candidates: 0, rays: 0, blockedBelow: 0, revealedAbove: 0, partialFadeIn: 0, partialFadeOut: 0, uniformSamples: 0, selfHiddenSamples: 0, cameraVisible: 0, cameraOutlined: 0, orbitError: 0, returnError: 0, cacheStable: true, buffersStable: true };
  const witness = (context, eye, firstOnly = true) => {
    let seen = -1;
    for (let group = 0; group < context.surfaceGroupCount; group++) {
      const at = group * 3, c = context.surfaceCenters, s = context.surfaceSamples;
      if (Math.hypot(c[at] - eye.x, c[at + 1] - eye.y + 1.1, c[at + 2] - eye.z) > 12) continue;
      runtime.rays++;
      if (island.sightClearAt(eye.x, eye.y, eye.z, s[at], s[at + 1], s[at + 2])) { seen = group; if (firstOnly) break; }
    }
    return seen;
  };
  // Select real opposing faces from the heightfield. No hard-coded seed
  // geometry or assumed eye height determines whether the crest blocks them.
  for (let angleIndex = 0; angleIndex < 24 && fixtures.length < 2; angleIndex++) for (const radius of [22.5, 24.5, 26.5]) {
    if (fixtures.length >= 2) break;
    const angle = angleIndex * Math.PI / 12, x = Math.cos(angle) * radius, z = Math.sin(angle) * radius;
    const lower = { x, y: island.surfaceAt(x, z) + 1.1, z };
    if (!island.clearAt(x, lower.y, z) || Number.isFinite(island.ceilingAt(x, lower.y, z))) continue;
    runtime.positions++;
    const nearby = contexts.filter((context) => {
      const b = context.bounds, cx = (b[0] + b[3]) / 2, cz = (b[2] + b[5]) / 2, direction = directions[context.source.sector];
      const dx = Math.max(b[0] - x, 0, x - b[3]), dz = Math.max(b[2] - z, 0, z - b[5]);
      return b[4] > lower.y + 0.25 && dx * dx + dz * dz < 49 && (x - cx) * direction[0] + (z - cz) * direction[1] < -0.75;
    }).sort((a, b) => a.surfaceGroupCount - b.surfaceGroupCount);
    for (const context of nearby.slice(0, 16)) {
      runtime.candidates++;
      const upper = { x, y: context.bounds[4] + 1.5, z };
      if (witness(context, lower) >= 0 || !island.clearAt(x, upper.y, z)) continue;
      const seen = witness(context, upper);
      if (seen < 0 || fixtures.some((row) => row.side === context.source.slopeSide)) continue;
      // Nearby witnesses on the opposite-facing side prove that the lower
      // point is beside this hill, rather than isolated under another level.
      const nearSide = contexts.find((other) => {
        const difference = Math.abs(context.source.sector - other.source.sector), turn = Math.min(difference, 8 - difference), b = other.bounds;
        if (turn < 3 || Math.max(b[0] - x, 0, x - b[3]) ** 2 + Math.max(b[2] - z, 0, z - b[5]) ** 2 > 49) return false;
        return witness(other, lower) >= 0;
      });
      if (!nearSide) continue;
      fixtures.push({ side: context.source.slopeSide, nearSide: nearSide.source.slopeSide, lower, upper, seen, context });
      break;
    }
  }
  const uniform = (context, eye) => {
    const expected = context.walls[0].phase ** 2 * (3 - 2 * context.walls[0].phase);
    for (let group = 0; group < context.surfaceGroupCount; group++) {
      runtime.uniformSamples++;
      if (Math.abs(context.surfaceWholePhases[group] - expected) > 1e-6 || context.surfaceSections[group] !== 1) fail("slope fades split", { side: context.source.slopeSide, group });
      const at = group * 3, s = context.surfaceSamples;
      if (expected > 0 && !island.sightClearAt(eye.x, eye.y, eye.z, s[at], s[at + 1], s[at + 2])) runtime.selfHiddenSamples++;
    }
  };
  try {
    for (const row of fixtures) {
      const context = row.context, wall = context.walls[0], s = context.surfaceSamples, seenAt = row.seen * 3;
      const buffers = [context.surface, context.surfacePhases, context.surfaceWholePhases, context.surfacePerceived, context.surfaceHidden, context.surfaceTerrainSeen];
      const update = (eye, dt) => { Object.assign(actor.root.position, { x: eye.x, y: eye.y - 1.1, z: eye.z }); guides.updateSurface(context, eye.x, eye.y, eye.z, camera, dt, actor); };
      guides.resetSurface();
      Object.assign(camera.position, { x: row.lower.x, y: row.lower.y - 1.35, z: row.lower.z });
      Object.assign(camera.target, { x: s[seenAt], y: s[seenAt + 1], z: s[seenAt + 2] });
      update(row.lower, 0.3);
      if (wall.target === 0 && !context.surfaceWholeActive) runtime.blockedBelow++; else fail("far side through crest", { side: row.side, target: wall.target });
      update(row.upper, 0.025);
      if (wall.phase > 0 && wall.phase < wall.target) runtime.partialFadeIn++; else fail("slope appeared without fade", { side: row.side, phase: wall.phase, target: wall.target });
      uniform(context, row.upper);
      update(row.upper, 0.3);
      if (wall.target > 0 && context.surfaceWholeActive === context.surfaceGroupCount) runtime.revealedAbove++; else fail("far side missing above crest", { side: row.side });
      uniform(context, row.upper);
      const target = wall.target;
      for (const offset of [0, 4, -4]) {
        Object.assign(camera.position, { x: row.upper.x + offset, y: row.upper.y, z: row.upper.z });
        Object.assign(camera.target, { x: s[seenAt], y: s[seenAt + 1], z: s[seenAt + 2] });
        update(row.upper, 0.3);
        runtime.orbitError = Math.max(runtime.orbitError, Math.abs(wall.target - target));
        const p = camera.position, t = camera.target, length = Math.hypot(t.x - p.x, t.y - p.y, t.z - p.z), fx = (t.x - p.x) / length, fy = (t.y - p.y) / length, fz = (t.z - p.z) / length;
        for (let group = 0; group < context.surfaceGroupCount; group++) {
          const at = group * 3, dx = s[at] - p.x, dy = s[at + 1] - p.y, dz = s[at + 2] - p.z, depth = dx * fx + dy * fy + dz * fz;
          if (depth <= camera.near || !island.sightClearAt(p.x + dx * camera.near / depth, p.y + dy * camera.near / depth, p.z + dz * camera.near / depth, s[at], s[at + 1], s[at + 2])) continue;
          runtime.cameraVisible++;
          if (context.surfaceTargets[group] > 0 || context.surfacePhases[group] > 0) runtime.cameraOutlined++;
        }
      }
      const version = context.surfaceVersion, rays = guides.stats.surfaceRays;
      for (let frame = 0; frame < 12; frame++) update(row.upper, 0);
      runtime.cacheStable &&= context.surfaceVersion === version && guides.stats.surfaceRays === rays;
      runtime.buffersStable &&= buffers.every((buffer, index) => buffer === [context.surface, context.surfacePhases, context.surfaceWholePhases, context.surfacePerceived, context.surfaceHidden, context.surfaceTerrainSeen][index]);
      update(row.lower, 0.025);
      if (wall.target === 0 && wall.phase > 0 && wall.phase < target) runtime.partialFadeOut++; else fail("slope disappeared without fade", { side: row.side, phase: wall.phase, target: wall.target });
      uniform(context, row.lower);
      update(row.lower, 0.3);
      if (wall.phase || context.surfaceWholeActive) fail("stale far side after descent", { side: row.side });
      update(row.upper, 0.3);
      runtime.returnError = Math.max(runtime.returnError, Math.abs(wall.target - target));
    }
  } finally { guides.resetSurface(); }
  if (!fixtures.length) fail("no real crest fixture", { positions: runtime.positions, candidates: runtime.candidates });
  if (!runtime.cameraVisible || runtime.cameraOutlined || runtime.orbitError > 1e-6 || runtime.returnError > 1e-6 || !runtime.cacheStable || !runtime.buffersStable) fail("unstable slope visibility", runtime);
  return { synthetic, geometry, runtime, fixtures: fixtures.map(({ context, ...row }) => row), failures };
};
