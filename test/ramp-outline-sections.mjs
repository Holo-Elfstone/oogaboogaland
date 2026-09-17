// Real ramp exits distinguish continuous wall guides from stepped roof faces.
export const rampOutlineSectionsProbe = () => {
  const BL = window.BL, B = window.__ooga, island = B.island, H = island.headquarters, guides = B.headquarters.rockGuides;
  const ramps = guides.contexts.filter((context) => context.kind === "ramp");
  const outdoors = guides.contexts.filter((context) => context.kind === "surface" || context.kind === "front");
  const fronts = outdoors.filter((context) => context.kind === "front"), failures = [];
  const fail = (kind, detail) => { if (failures.length < 12) failures.push({ kind, ...detail }); };
  const column = { floor: 0, ceiling: 0 }, geometry = { ramps: ramps.length, triangles: 0, nonvertical: 0, wrongOwner: 0, ceilingSteps: 0, aboveCeiling: 0, maxCeilingError: 0, exteriorSamples: 0, buriedExterior: 0, coveredExterior: 0 };
  for (const context of ramps) {
    const v = context.surface;
    for (let at = 0; at < v.length; at += 9) {
      const ax = v[at + 3] - v[at], ay = v[at + 4] - v[at + 1], az = v[at + 5] - v[at + 2];
      const bx = v[at + 6] - v[at], by = v[at + 7] - v[at + 1], bz = v[at + 8] - v[at + 2];
      let nx = ay * bz - az * by, ny = az * bx - ax * bz, nz = ax * by - ay * bx;
      const length = Math.hypot(nx, ny, nz);
      if (length < 1e-9) continue;
      geometry.triangles++; nx /= length; ny /= length; nz /= length;
      if (Math.abs(ny) > 1e-5) geometry.nonvertical++;
      const x = (v[at] + v[at + 3] + v[at + 6]) / 3, y = (v[at + 1] + v[at + 4] + v[at + 7]) / 3, z = (v[at + 2] + v[at + 5] + v[at + 8]) / 3;
      const positive = island.rampColumnAt(x + nx * 0.025, z + nz * 0.025, context.basement, column), positiveCeiling = positive ? column.ceiling : Infinity;
      const negative = island.rampColumnAt(x - nx * 0.025, z - nz * 0.025, context.basement, column), negativeCeiling = negative ? column.ceiling : Infinity;
      // A side slab has ramp air on exactly one horizontal side. Ceiling
      // risers have the same ramp footprint on both sides, regardless of
      // triangle winding or the small floor-clipping fan at the lower edge.
      const expected = context.index + 1, ceiling = positive === expected ? positiveCeiling : negativeCeiling;
      if (positive !== expected && negative !== expected) { geometry.wrongOwner++; fail("ramp owner", { basement: context.basement, index: context.index, x, y, z, positive, negative }); }
      if (positive === expected && negative === expected) { geometry.ceilingSteps++; fail("ceiling step", { basement: context.basement, index: context.index, x, y, z }); }
      const excess = Math.max(v[at + 1], v[at + 4], v[at + 7]) - ceiling;
      geometry.maxCeilingError = Math.max(geometry.maxCeilingError, excess);
      if (excess > 1e-5) { geometry.aboveCeiling++; fail("above ceiling", { basement: context.basement, index: context.index, excess }); }
    }
  }
  for (const context of outdoors) for (let group = 0; group < context.surfaceGroupCount; group++) {
    const at = group * 3, s = context.surfaceSamples, x = s[at], y = s[at + 1], z = s[at + 2];
    geometry.exteriorSamples++;
    if (!island.clearAt(x, y, z)) { geometry.buriedExterior++; fail("buried exterior", { context: context.kind, index: context.index, x, y, z }); }
    if (Number.isFinite(island.ceilingAt(x, y, z))) { geometry.coveredExterior++; fail("covered exterior", { context: context.kind, index: context.index, x, y, z }); }
  }
  // Compare the original wall mesh with the guide mesh. Merely checking the
  // phases of registered panels cannot detect a panel given the wrong owner.
  const coverage = { samples: 0, missing: 0, wrongOwner: 0, duplicated: 0, fabricated: 0, doorwaySamples: 0, doorwayFilled: 0, sections: 0, longWallSpans: [] };
  const guideBuckets = new Map(), sourcePlanes = new Map(), coveredSections = new Set(), unit = island.unit, source = island.geometry.verts;
  const expectedFrontageAt = (x, z) => {
    // The corridor contains the mouth's original three-metre apron as well
    // as its later long extension. Derive that union independently of the
    // guide's ownership accessor, which once recorded only the extension.
    x = island.sightGrid[1] + (Math.floor((x - island.sightGrid[1]) / unit) + 0.5) * unit;
    z = island.sightGrid[3] + (Math.floor((z - island.sightGrid[3]) / unit) + 0.5) * unit;
    for (let index = 0; index < H.fronts.length; index++) {
      const front = H.fronts[index], ramp = H.ramps[index], dx = x - front.center.x, dz = z - front.center.z;
      const across = dx * front.tangent.x + dz * front.tangent.z, depth = dx * -front.tangent.z + dz * front.tangent.x;
      const padding = unit / 2 * (Math.abs(front.tangent.x) + Math.abs(front.tangent.z));
      const extension = Math.abs(across) < front.halfLength + padding && Math.abs(depth) < front.halfWidth + padding && depth > -1.1;
      const mx = x - ramp.from.x - ramp.axis.x * 0.5, mz = z - ramp.from.z - ramp.axis.z * 0.5;
      const along = mx * ramp.axis.x + mz * ramp.axis.z, mouthAcross = Math.abs(mz * ramp.axis.x - mx * ramp.axis.z);
      const doorwayInset = unit / 2 * (Math.abs(ramp.axis.x) + Math.abs(ramp.axis.z)) - 1e-6;
      const apron = along > -3 && along <= -doorwayInset && mouthAcross < 3.5;
      if (extension || apron) return index + 1;
    }
    return 0;
  };
  const planeKey = (axis, plane) => `${axis}:${Math.round(plane * 1e5)}`;
  const bucketKey = (axis, plane, horizontal) => `${planeKey(axis, plane)}:${Math.floor(horizontal / unit)}`;
  const triangleContains = (entry, horizontal, y) => {
    const v = entry.context.surface, at = entry.at, h = entry.horizontal;
    const x = v[at + h], py = v[at + 1], bx = v[at + 3 + h] - x, by = v[at + 4] - py, cx = v[at + 6 + h] - x, cy = v[at + 7] - py, determinant = bx * cy - by * cx;
    if (Math.abs(determinant) < 1e-9) return false;
    const u = ((horizontal - x) * cy - (y - py) * cx) / determinant, w = (bx * (y - py) - by * (horizontal - x)) / determinant;
    return u >= -1e-5 && w >= -1e-5 && u + w <= 1 + 1e-5;
  };
  for (const context of guides.contexts) for (let at = 0; at < context.surface.length; at += 9) {
    const v = context.surface, axis = Math.abs(v[at] - v[at + 3]) + Math.abs(v[at] - v[at + 6]) < 1e-5 ? 0
      : Math.abs(v[at + 2] - v[at + 5]) + Math.abs(v[at + 2] - v[at + 8]) < 1e-5 ? 2 : -1;
    if (axis < 0) continue;
    const horizontal = axis === 0 ? 2 : 0, low = Math.min(v[at + horizontal], v[at + 3 + horizontal], v[at + 6 + horizontal]), high = Math.max(v[at + horizontal], v[at + 3 + horizontal], v[at + 6 + horizontal]);
    const entry = { context, at, horizontal };
    for (let cell = Math.floor((low + 1e-5) / unit); cell < Math.ceil((high - 1e-5) / unit); cell++) {
      const key = bucketKey(axis, v[at + axis], (cell + 0.5) * unit);
      if (!guideBuckets.has(key)) guideBuckets.set(key, []);
      guideBuckets.get(key).push(entry);
    }
  }
  for (const face of island.geometry.faces) {
    if (face.i.length < 3 || face.headquartersWindowReveal || face.windowIndex !== undefined) continue;
    const a = face.i[0] * 3, b = face.i[1] * 3, c = face.i[2] * 3;
    const ux = source[b] - source[a], uy = source[b + 1] - source[a + 1], uz = source[b + 2] - source[a + 2], vx = source[c] - source[a], vy = source[c + 1] - source[a + 1], vz = source[c + 2] - source[a + 2];
    let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    const length = Math.hypot(nx, ny, nz);
    if (length < 1e-9 || Math.abs(ny) > length * 0.1) continue;
    nx /= length; nz /= length;
    const axis = Math.abs(nx) > 0.9 ? 0 : 2, horizontal = axis === 0 ? 2 : 0, plane = source[a + axis];
    let low = Infinity, high = -Infinity, bottom = Infinity, top = -Infinity;
    for (const index of face.i) { low = Math.min(low, source[index * 3 + horizontal]); high = Math.max(high, source[index * 3 + horizontal]); bottom = Math.min(bottom, source[index * 3 + 1]); top = Math.max(top, source[index * 3 + 1]); }
    const key = planeKey(axis, plane);
    if (!sourcePlanes.has(key)) sourcePlanes.set(key, []);
    sourcePlanes.get(key).push({ low, high, bottom, top });
    for (let cell = Math.floor(low / unit); cell < Math.ceil(high / unit); cell++) {
      const h = (cell + 0.5) * unit, x = axis === 0 ? plane : h, z = axis === 2 ? plane : h;
      const positiveOwner = expectedFrontageAt(x + nx * 0.025, z + nz * 0.025), negativeOwner = expectedFrontageAt(x - nx * 0.025, z - nz * 0.025);
      if ((!positiveOwner && !negativeOwner) || positiveOwner === negativeOwner) continue;
      const candidates = guideBuckets.get(bucketKey(axis, plane, h)) || [];
      for (let row = Math.max(0, Math.floor(bottom / unit)); row < Math.ceil(top / unit); row++) {
        const y = (row + 0.5) * unit;
        const positiveAir = island.clearAt(x + nx * 0.025, y, z + nz * 0.025), negativeAir = island.clearAt(x - nx * 0.025, y, z - nz * 0.025);
        if (positiveAir === negativeAir) continue;
        const owner = positiveAir ? positiveOwner : negativeOwner;
        if (!owner) continue;
        coverage.samples++;
        let correct = false, wrong = false, otherOwner = "";
        for (const entry of candidates) if (triangleContains(entry, h, y)) {
          const context = entry.context;
          if (context.kind === "front" && context.index === owner - 1) { correct = true; coveredSections.add(`${context.index}:${context.surfaceWallGroups[context.surfaceGroups[entry.at / 9]]}`); }
          else { wrong = true; otherOwner = `${context.kind}:${context.basement ? "basement:" : ""}${context.index}`; }
        }
        if (!correct) { if (wrong) coverage.wrongOwner++; else coverage.missing++; fail("frontage coverage", { index: owner - 1, x, y, z, wrong }); }
        if (correct && wrong) { coverage.duplicated++; fail("overlapping frontage", { index: owner - 1, x, y, z, otherOwner }); }
      }
    }
  }
  for (const context of fronts) for (let at = 0; at < context.surface.length; at += 9) {
    const v = context.surface, axis = Math.abs(v[at] - v[at + 3]) + Math.abs(v[at] - v[at + 6]) < 1e-5 ? 0 : 2, horizontal = axis === 0 ? 2 : 0;
    const h = (v[at + horizontal] + v[at + 3 + horizontal] + v[at + 6 + horizontal]) / 3, y = (v[at + 1] + v[at + 4] + v[at + 7]) / 3;
    const originals = sourcePlanes.get(planeKey(axis, v[at + axis])) || [];
    if (!originals.some((face) => h >= face.low - 1e-5 && h <= face.high + 1e-5 && y >= face.bottom - 1e-5 && y <= face.top + 1e-5)) coverage.fabricated++;
  }
  for (const context of fronts) for (let wall = 0; wall < 2; wall++) {
    const front = H.fronts[context.index], v = context.surface;
    let low = Infinity, high = -Infinity;
    for (let at = 0; at < v.length; at += 9) if (context.surfaceWallGroups[context.surfaceGroups[at / 9]] === wall) for (let corner = 0; corner < 9; corner += 3) {
      const across = (v[at + corner] - front.center.x) * front.tangent.x + (v[at + corner + 2] - front.center.z) * front.tangent.z;
      low = Math.min(low, across); high = Math.max(high, across);
    }
    coverage.longWallSpans.push(high - low);
  }
  for (let index = 0; index < H.fronts.length; index++) {
    const front = H.fronts[index], reach = front.halfLength + 2, ox = island.sightGrid[1], oz = island.sightGrid[3];
    for (let gx = Math.floor((front.center.x - reach - ox) / unit); gx <= Math.ceil((front.center.x + reach - ox) / unit); gx++) for (let gz = Math.floor((front.center.z - reach - oz) / unit); gz <= Math.ceil((front.center.z + reach - oz) / unit); gz++) for (const axis of [0, 2]) {
      const x = ox + (gx + (axis === 0 ? 1 : 0.5)) * unit, z = oz + (gz + (axis === 2 ? 1 : 0.5)) * unit, dx = axis === 0 ? 0.025 : 0, dz = axis === 2 ? 0.025 : 0;
      const positive = expectedFrontageAt(x + dx, z + dz), negative = expectedFrontageAt(x - dx, z - dz);
      if ((positive === index + 1) === (negative === index + 1)) continue;
      if (island.rampColumnAt(x + dx, z + dz, false, column) !== index + 1 && island.rampColumnAt(x - dx, z - dz, false, column) !== index + 1) continue;
      const h = axis === 0 ? z : x, candidates = guideBuckets.get(bucketKey(axis, axis === 0 ? x : z, h)) || [];
      for (let row = 0; row < 13; row++) {
        const y = (row + 0.5) * unit;
        if (!island.clearAt(x + dx, y, z + dz) || !island.clearAt(x - dx, y, z - dz)) continue;
        coverage.doorwaySamples++;
        if (candidates.some((entry) => entry.context.kind === "front" && triangleContains(entry, h, y))) coverage.doorwayFilled++;
      }
    }
  }
  coverage.sections = coveredSections.size;
  if (coverage.samples < 100 || coverage.sections !== H.fronts.length * 3 || coverage.longWallSpans.some((span) => span < 6) || !coverage.doorwaySamples || coverage.missing || coverage.wrongOwner || coverage.duplicated || coverage.fabricated || coverage.doorwayFilled) fail("incomplete frontage", coverage);
  const actor = { baseY: 0, root: { position: { x: 0, y: 0, z: 0 } } }, camera = BL.scene.createCamera({ near: 0.1, far: 100 });
  const rows = [], phases = { sections: fronts.reduce((sum, context) => sum + context.walls.length, 0), sampled: 0, selfHidden: 0, unequal: 0, cameraVisible: 0, visibleOutlined: 0, cameraEligibilityError: 0, returnError: 0 };
  const activeSections = new Set();
  const snapshot = () => outdoors.map((context) => new Float32Array(context.surfacePerceived));
  const difference = (before) => {
    let error = 0;
    for (let i = 0; i < outdoors.length; i++) for (let group = 0; group < before[i].length; group++) error = Math.max(error, Math.abs(before[i][group] - outdoors[i].surfacePerceived[group]));
    return error;
  };
  const checkSections = (eye) => {
    for (const context of fronts) for (let group = 0; group < context.surfaceGroupCount; group++) {
      const wallIndex = context.surfaceWallGroups[group], wall = context.walls[wallIndex], at = group * 3, s = context.surfaceSamples;
      if (wall.phase <= 0) continue;
      activeSections.add(`${context.index}:${wallIndex}`); phases.sampled++;
      if (Math.abs(context.surfaceWholePhases[group] - wall.phase * wall.phase * (3 - 2 * wall.phase)) > 1e-6 || context.surfaceSections[group] !== 1) phases.unequal++;
      if (!island.sightClearAt(eye.x, eye.y, eye.z, s[at], s[at + 1], s[at + 2])) phases.selfHidden++;
      if (!context.surfaceHidden[group] && context.surfaceTargets[group] > 0) phases.visibleOutlined++;
    }
  };
  try {
    guides.resetSurface();
    for (let index = 0; index < H.ramps.length; index++) {
      const ramp = H.ramps[index], front = H.fronts[index], frontage = fronts.find((context) => context.index === index), nx = -front.tangent.z, nz = front.tangent.x;
      const path = [6, 4, 2, 0].map((sample) => ({ ...ramp.samples[sample], sample }));
      path.push({ x: front.center.x, y: 0, z: front.center.z, sample: -1 });
      let buried = null;
      for (const offset of [0.5, 1, 1.5, 2]) for (const y of [0.75, 1.5, 2.5]) {
        const point = { x: front.center.x + nx * (front.halfWidth + offset), y, z: front.center.z + nz * (front.halfWidth + offset) };
        if (!buried && island.solidAt(point.x, point.y, point.z)) buried = point;
      }
      if (!buried || !frontage) { fail("entrance fixture", { index, buried: !!buried, frontage: !!frontage }); continue; }
      const row = { index, steps: 0, insideSteps: 0, visibleExitInside: 0, outlinedExitInside: 0, returnSamples: 0, buried: true };
      const saved = [];
      for (let traversal = 0; traversal < 2; traversal++) for (let step = 0; step < path.length; step++) {
        const key = traversal ? path.length - 1 - step : step, point = path[key];
        const floor = island.supportAt(point.x, point.z, point.y, 0.65);
        Object.assign(actor.root.position, { x: point.x, y: floor, z: point.z });
        const eye = { x: point.x, y: floor + 1.1, z: point.z };
        if (!island.clearAt(eye.x, eye.y, eye.z)) fail("route eye", { index, key });
        Object.assign(camera.position, buried); Object.assign(camera.target, eye);
        guides.updateSurfaces(eye.x, eye.y, eye.z, camera, 0.3, actor);
        row.steps++; checkSections(eye);
        if (!traversal) saved[key] = snapshot();
        else { row.returnSamples++; phases.returnError = Math.max(phases.returnError, difference(saved[key])); }
        const inside = point.sample > 0 && island.rampColumnAt(point.x, point.z, false, column) === index + 1;
        if (inside) {
          row.insideSteps++;
          // The far wall across the entrance remains perceptible before the
          // character crosses into the open frontage.
          for (let group = 0; group < frontage.surfaceGroupCount; group++) {
            if (frontage.surfaceWallGroups[group] !== 1) continue;
            const at = group * 3, s = frontage.surfaceSamples;
            if (Math.hypot(s[at] - eye.x, s[at + 1] - floor, s[at + 2] - eye.z) >= 10.5 || !island.sightClearAt(eye.x, eye.y, eye.z, s[at], s[at + 1], s[at + 2])) continue;
            row.visibleExitInside++;
            if (frontage.surfacePerceived[group] > 0 && frontage.surfacePhases[group] > 0) row.outlinedExitInside++;
          }
        }
      }
      const eye = { x: actor.root.position.x, y: actor.root.position.y + 1.1, z: actor.root.position.z }, beforeCamera = snapshot();
      for (const angle of [0, Math.PI / 2, Math.PI]) {
        Object.assign(camera.position, eye);
        Object.assign(camera.target, { x: eye.x + Math.cos(angle), y: eye.y, z: eye.z + Math.sin(angle) });
        guides.updateSurfaces(eye.x, eye.y, eye.z, camera, 0.3, actor);
        phases.cameraEligibilityError = Math.max(phases.cameraEligibilityError, difference(beforeCamera));
        for (const context of outdoors) for (let group = 0; group < context.surfaceGroupCount; group++) {
          if (context.surfacePerceived[group] <= 0) continue;
          const at = group * 3, s = context.surfaceSamples, dx = s[at] - eye.x, dy = s[at + 1] - eye.y, dz = s[at + 2] - eye.z;
          const depth = dx * Math.cos(angle) + dz * Math.sin(angle);
          if (depth <= camera.near || !island.sightClearAt(eye.x + dx * camera.near / depth, eye.y + dy * camera.near / depth, eye.z + dz * camera.near / depth, s[at], s[at + 1], s[at + 2])) continue;
          phases.cameraVisible++;
          if (context.surfaceTargets[group] > 0 || context.surfacePhases[group] > 0) phases.visibleOutlined++;
        }
      }
      if (!row.insideSteps || !row.visibleExitInside || !row.outlinedExitInside) fail("exit wall hidden inside ramp", row);
      rows.push(row);
    }
  } finally { guides.resetSurface(); }
  if (geometry.nonvertical || geometry.wrongOwner || geometry.ceilingSteps || geometry.aboveCeiling || geometry.buriedExterior || geometry.coveredExterior) fail("invalid geometry", {});
  if (phases.unequal || phases.visibleOutlined || phases.returnError > 1e-6 || phases.cameraEligibilityError > 1e-6) fail("unstable section", {});
  return { geometry, coverage, fronts: fronts.length, phases: { ...phases, activeSections: activeSections.size }, rows, failures };
};
