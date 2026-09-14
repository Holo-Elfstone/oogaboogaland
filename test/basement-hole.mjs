// The intended opening is checked separately from the retained basement floor:
// rendered cells, exact voxel support and the upper HQ must agree at its rim.
export const basementHoleGeometryProbe = () => {
  const island = window.__ooga.island, H = island.headquarters, basement = H.basement, hole = basement.hole;
  const failures = [], column = {};
  let shaftSamples = 0, ringSamples = 0, rimSamples = 0, rockSamples = 0, entranceSamples = 0, maxRimStep = 0, renderedRimCells = 0;
  const fail = (kind, x, y, z) => { if (failures.length < 12) failures.push({ kind, x, y, z }); };
  for (let x = -hole.radius + 0.75; x <= hole.radius - 0.75; x += 0.5) for (let z = -hole.radius + 0.75; z <= hole.radius - 0.75; z += 0.5) {
    if (Math.hypot(x, z) > hole.radius - 0.75) continue;
    for (let y = basement.floor - 0.05; y > hole.bottom - 1; y -= island.unit) {
      shaftSamples++;
      if (!island.clearAt(x, y, z, 0.3, 2.75) || island.supportAt(x, z, y, 0.6, -120, 0.3) !== -120) fail("open shaft and no phantom footing", x, y, z);
    }
    if (!island.cavityAt(x, z, column, H.caveIndex, basement.floor + 1.1) || column.floor !== -Infinity || column.ceiling !== basement.ceiling) fail("shaft cavity has no floor", x, basement.floor, z);
    if (!island.cavityAt(x, z, column, H.caveIndex, hole.bottom) || island.cavityAt(x, z, column, H.caveIndex, hole.bottom - 0.01)) fail("shaft metadata ends at the underside", x, hole.bottom, z);
    if (!island.cavityAt(x, z, column, H.caveIndex, H.floor + 1.1) || column.floor !== H.floor || island.supportAt(x, z, H.floor + 0.1, 0.2) !== H.floor) fail("upper HQ floor stays intact", x, H.floor, z);
    for (let y = basement.ceiling + 0.01; y < H.floor; y += island.unit) {
      rockSamples++;
      if (!island.solidAt(x, y, z)) fail("solid ceiling and separating rock", x, y, z);
    }
  }
  for (let i = 0; i < 128; i++) {
    const angle = i / 128 * Math.PI * 2, sx = Math.sin(angle), sz = Math.cos(angle);
    for (const radius of [hole.mouthRadius + 0.6, 6.5, basement.room.radius - 0.9]) {
      const x = hole.x + sx * radius, z = hole.z + sz * radius;
      ringSamples++;
      if (island.supportAt(x, z, basement.floor, 0.6, -120, 0.3) !== basement.floor || !island.clearAt(x, basement.floor + 0.01, z, 0.3, 2.75)) fail("continuous comfortable walking ring", x, basement.floor, z);
    }
    let previous = -120;
    for (let radius = hole.radius - 0.25; radius <= hole.mouthRadius + 0.5; radius += island.unit / 8) {
      const x = hole.x + sx * radius, z = hole.z + sz * radius, floor = island.supportAt(x, z, basement.floor + 0.01, 0.6, -120);
      if (floor === -120) { previous = floor; continue; }
      rimSamples++;
      if (previous > -120) maxRimStep = Math.max(maxRimStep, Math.abs(floor - previous));
      if (floor < basement.floor - hole.rimDepth || floor > basement.floor || !island.solidAt(x, floor - 0.01, z) || island.solidAt(x, floor + 0.01, z)) fail("beveled rim matches voxel footing", x, floor, z);
      previous = floor;
    }
  }
  for (const point of [...basement.rooms.map((room) => room.approach), ...basement.ramps.map((ramp) => ramp.to)]) {
    entranceSamples++;
    if (island.supportAt(point.x, point.z, basement.floor + 0.01, 0.6, -120, 0.3) !== basement.floor || !island.clearAt(point.x, basement.floor + 0.01, point.z, 0.3, 2.75)) fail("room and ramp landings stay clear", point.x, basement.floor, point.z);
  }
  const g = island.geometry, U = island.unit;
  for (const face of g.faces) {
    const ys = face.i.map((i) => g.verts[i * 3 + 1]), floor = ys[0];
    if (floor < hole.bottom || floor > basement.floor || ys.some((y) => Math.abs(y - floor) > 1e-7)) continue;
    const xs = face.i.map((i) => g.verts[i * 3]), zs = face.i.map((i) => g.verts[i * 3 + 2]);
    if (Math.max(...xs) < -hole.mouthRadius || Math.min(...xs) > hole.mouthRadius || Math.max(...zs) < -hole.mouthRadius || Math.min(...zs) > hole.mouthRadius) continue;
    for (let x = Math.min(...xs) + U / 2; x < Math.max(...xs); x += U) for (let z = Math.min(...zs) + U / 2; z < Math.max(...zs); z += U) {
      const radius = Math.hypot(x - hole.x, z - hole.z);
      if (radius >= hole.mouthRadius) continue;
      if (hole.contains(x, z)) fail("no rendered cap in the shaft", x, floor, z);
      else if (floor < basement.floor && island.solidAt(x, floor - 0.01, z)) {
        renderedRimCells++;
        if (island.supportAt(x, z, basement.floor, 0.6, -120) !== floor) fail("rendered bevel shares its exact support", x, floor, z);
      }
    }
  }
  const sweepClear = island.voxelSegmentClearAt(hole.x, basement.floor + 0.01, hole.z, hole.x, hole.bottom - 1, hole.z, 0.3, 2.75);
  return { diameter: hole.radius * 2, opening: hole.mouthRadius * 2, ringWidth: basement.room.radius - hole.mouthRadius, floor: basement.floor, bottom: hole.bottom, shaftSamples, ringSamples, rimSamples, renderedRimCells, rockSamples, entranceSamples, maxRimStep, sweepClear, failures };
};

// Only placement is direct. Walking off the bevel, gravity, falling pose and
// returning to the pile run through the actual hub controller in both views.
export const basementHoleMovementProbe = ({ mode = "trailing", dt = 1 / 60 } = {}) => {
  const B = window.__ooga, scene = window.BL.scenes.hub, island = B.island, basement = island.headquarters.basement, hole = basement.hole;
  const cave = [...B.cavemen.values()].find((c) => c.state === "working" && !c.jet), o = B.pilot.orbit, failures = [], poses = [];
  let time = B.renderOpts.matrix.time, enteredAt = -1, bottomAt = -1, respawn = null, previous = null, minY = Infinity, maxEyeGap = 0, accelerationError = 0, fallSamples = 0, groundedSteps = 0;
  const key = (type) => window.dispatchEvent(new KeyboardEvent(type, { key: "w" }));
  const step = () => scene.update(dt, time += dt);
  const state = () => {
    const p = cave.root.position, y = p.y - cave.baseY, eye = B.camera.position;
    return { x: p.x, y, z: p.z, velocity: cave.hopV, hop: cave.hop, selected: B.pilot.player === cave, scene: B.scene, mode: B.pilot.mode, eye: { x: eye.x, y: eye.y, z: eye.z } };
  };
  B.pilot.possess(cave);
  document.querySelector('nav[data-scene="hub"] [data-preset="underground"]').click();
  B.crew.relocatePlayer({ x: hole.x + 6.5, y: basement.floor, z: hole.z }, -Math.PI / 2);
  o.yaw = o.tYaw = Math.PI / 2; o.pitch = o.tPitch = 0; o.dist = o.tDist = 3.5;
  if (mode === "first-person") B.pilot.enterClose();
  for (let i = 0; i < Math.ceil(1 / dt); i++) step();
  const initial = state();
  try {
    key("keydown");
    for (let frame = 0; frame < Math.ceil(12 / dt); frame++) {
      step();
      const s = state(), elapsed = (frame + 1) * dt;
      if (s.x < hole.x + hole.radius - 1) key("keyup");
      if (s.y < basement.floor - hole.rimDepth - 0.2 && enteredAt < 0) enteredAt = elapsed;
      if (s.y + cave.bodyHeight < hole.bottom && bottomAt < 0) bottomAt = elapsed;
      if (bottomAt >= 0 && s.y >= 0) { respawn = s; break; }
      minY = Math.min(minY, s.y);
      if (enteredAt >= 0) {
        maxEyeGap = Math.max(maxEyeGap, Math.hypot(s.eye.x - s.x, s.eye.y - s.y - cave.headOffset * 0.95, s.eye.z - s.z));
        if (frame % Math.max(1, Math.round(0.1 / dt)) === 0) poses.push({ x: s.x, y: s.y, eyeY: s.eye.y, velocity: s.velocity });
        if (previous && previous.y < basement.floor - 1 && previous.velocity < 0) {
          fallSamples++;
          accelerationError = Math.max(accelerationError, Math.abs(s.velocity - previous.velocity + 9.8 * dt));
        }
      }
      const clear = island.clearAt(s.x, s.y + 1e-5, s.z, 0.295, cave.bodyHeight - 1e-5);
      const drop = previous ? previous.y - s.y : 0;
      const groundedStep = previous && previous.hop === 0 && s.hop === 0 && previous.velocity === 0 && s.velocity === 0 && drop > 1e-7 && drop <= island.unit + 1e-7;
      if (groundedStep) groundedSteps++;
      // Grounded voxel steps move horizontally, then lower onto their support.
      // Sweep that authored path; airborne bodies and every eye keep the
      // straight sweep, so a lip cannot hide a fall or camera intersection.
      const bodySweep = !previous || (groundedStep
        ? island.voxelSegmentClearAt(previous.x, previous.y + 1e-5, previous.z, s.x, previous.y + 1e-5, s.z, 0.295, cave.bodyHeight - 1e-5) && island.voxelSegmentClearAt(s.x, previous.y + 1e-5, s.z, s.x, s.y + 1e-5, s.z, 0.295, cave.bodyHeight - 1e-5)
        : island.voxelSegmentClearAt(previous.x, previous.y + 1e-5, previous.z, s.x, s.y + 1e-5, s.z, 0.295, cave.bodyHeight - 1e-5));
      const eyeClear = island.clearAt(s.eye.x, s.eye.y - 0.295, s.eye.z, 0.295, 0.59);
      const eyeSweep = !previous || island.voxelSegmentClearAt(previous.eye.x, previous.eye.y - 0.295, previous.eye.z, s.eye.x, s.eye.y - 0.295, s.eye.z, 0.295, 0.59);
      if ((!clear || !bodySweep || !eyeClear || !eyeSweep || ![s.x, s.y, s.z, s.eye.x, s.eye.y, s.eye.z].every(Number.isFinite) || !s.selected || s.scene !== "hub" || s.mode !== mode) && failures.length < 12) failures.push({ ...s, clear, bodySweep, eyeClear, eyeSweep });
      previous = s;
    }
    return { mode, dt, initial, enteredAt, bottomAt, respawn, minY, maxEyeGap, accelerationError, fallSamples, groundedSteps, poses, failures, pileRadius: B.altar.platformRadius, bottom: hole.bottom, backend: B.renderer.kind };
  } finally { key("keyup"); }
};

export const basementHoleFreeEyeProbe = ({ dt = 1 / 60 } = {}) => {
  const B = window.__ooga, scene = window.BL.scenes.hub, island = B.island, basement = island.headquarters.basement, hole = basement.hole, o = B.pilot.orbit;
  const cave = [...B.cavemen.values()].find((c) => c.state === "working" && !c.jet), failures = [], poses = [];
  let time = B.renderOpts.matrix.time, enteredAt = -1, bottomAt = -1, respawn = null, previous = null, previousVelocity = null, accelerationError = 0, fallSamples = 0, minY = Infinity, maxStep = 0;
  const step = () => scene.update(dt, time += dt);
  const key = (type) => window.dispatchEvent(new KeyboardEvent(type, { key: "w" }));
  const state = () => {
    const p = B.camera.position;
    return { x: p.x, y: p.y - 1.1, z: p.z, eyeY: p.y, falling: B.pilot.freeFalling, selected: !!B.pilot.player, mode: B.pilot.mode, scene: B.scene };
  };
  // Releasing a stationary eye on the ring establishes a valid initial layer.
  // All tested movement afterward is unpossessed free-eye navigation.
  B.pilot.possess(cave); document.querySelector('nav[data-scene="hub"] [data-preset="underground"]').click();
  B.crew.relocatePlayer({ x: hole.x + 6.5, y: basement.floor, z: hole.z }, -Math.PI / 2);
  o.yaw = o.tYaw = Math.PI / 2; o.pitch = o.tPitch = 0; o.dist = o.tDist = 3.5;
  B.pilot.enterClose();
  for (let i = 0; i < Math.ceil(1 / dt); i++) step();
  B.pilot.release(true);
  for (let i = 0; i < Math.ceil(0.25 / dt); i++) step();
  const initial = state(); previous = initial;
  try {
    key("keydown");
    for (let frame = 0; frame < Math.ceil(12 / dt); frame++) {
      step();
      const s = state(), elapsed = (frame + 1) * dt;
      if (s.x < hole.x + hole.radius - 1) key("keyup");
      if (s.y < basement.floor - hole.rimDepth - 0.2 && enteredAt < 0) enteredAt = elapsed;
      if (s.eyeY + 0.3 < hole.bottom && bottomAt < 0) bottomAt = elapsed;
      if (bottomAt >= 0 && s.y >= -1e-6) { respawn = s; break; }
      minY = Math.min(minY, s.y);
      maxStep = Math.max(maxStep, Math.hypot(s.x - previous.x, s.eyeY - previous.eyeY, s.z - previous.z));
      if (s.falling && previous.falling && previous.y < basement.floor - 1) {
        const velocity = (s.y - previous.y) / dt;
        if (previousVelocity !== null) { accelerationError = Math.max(accelerationError, Math.abs(velocity - previousVelocity + 9.8 * dt)); fallSamples++; }
        previousVelocity = velocity;
      } else previousVelocity = null;
      const clear = island.clearAt(s.x, s.eyeY - 0.295, s.z, 0.295, 0.59);
      const sweep = island.voxelSegmentClearAt(previous.x, previous.eyeY - 0.295, previous.z, s.x, s.eyeY - 0.295, s.z, 0.295, 0.59);
      if ((!clear || !sweep || ![s.x, s.y, s.z].every(Number.isFinite) || s.selected || s.mode !== "eye-level" || s.scene !== "hub") && failures.length < 8) failures.push({ ...s, clear, sweep });
      if (frame % Math.max(1, Math.round(0.1 / dt)) === 0) poses.push(s);
      previous = s;
    }
    return { dt, initial, enteredAt, bottomAt, respawn, minY, maxStep, accelerationError, fallSamples, poses, failures, pileRadius: B.altar.platformRadius, bottom: hole.bottom, backend: B.renderer.kind };
  } finally { key("keyup"); }
};

// Stage below the underside once, then use normal thrust and walking to fly
// through the shaft and step onto the retained basement circulation ring.
export const basementHoleJetpackProbe = ({ mode = "trailing", dt = 1 / 60 } = {}) => {
  const B = window.__ooga, scene = window.BL.scenes.hub, island = B.island, basement = island.headquarters.basement, hole = basement.hole;
  const cave = [...B.cavemen.values()].find((c) => c.state === "working"), o = B.pilot.orbit, failures = [], poses = [];
  let time = B.renderOpts.matrix.time, enteredAt = -1, clearedLipAt = -1, removedAt = -1, removal = null, toggled = null, previous = null, maxEyeStep = 0, maxEyeGap = 0, moving = false;
  const key = (type, name) => window.dispatchEvent(new KeyboardEvent(type, { key: name }));
  const tap = (name) => { key("keydown", name); key("keyup", name); };
  const step = () => scene.update(dt, time += dt);
  const state = () => {
    const p = cave.root.position, eye = B.camera.position;
    return { x: p.x, y: p.y - cave.baseY, z: p.z, hop: cave.hop, velocity: cave.hopV, equipped: !!cave.jet, fuel: cave.jetFuel, thrust: !!(cave.jet && cave.jet.thrust), selected: B.pilot.player === cave, scene: B.scene, mode: B.pilot.mode, eye: { x: eye.x, y: eye.y, z: eye.z } };
  };
  B.pilot.possess(cave);
  B.crew.relocatePlayer({ x: hole.x, y: hole.bottom - 3, z: hole.z }, Math.PI / 2);
  cave.hop = hole.bottom - 3 + 120;
  o.yaw = o.tYaw = -Math.PI / 2; o.pitch = o.tPitch = 0; o.dist = o.tDist = 3.5;
  if (mode === "first-person") B.pilot.enterClose();
  for (let i = 0; i < Math.ceil(0.35 / dt); i++) step();
  tap("j");
  const initial = state(); previous = initial;
  try {
    key("keydown", " ");
    for (let frame = 0; frame < Math.ceil(8 / dt); frame++) {
      step();
      const s = state(), elapsed = (frame + 1) * dt;
      if (s.y > hole.bottom && enteredAt < 0) enteredAt = elapsed;
      if (!toggled && s.y > hole.bottom + 1) {
        const before = state(); tap("j"); const off = state(); tap("j"); toggled = { before, off, on: state() };
      }
      if (!moving && s.y > basement.floor + 0.65) { moving = true; key("keydown", "w"); clearedLipAt = elapsed; }
      if (!s.equipped && removedAt < 0) { removedAt = elapsed; removal = s; key("keyup", " "); }
      if (s.x >= hole.x + 6.5) key("keyup", "w");
      const bodyClear = island.clearAt(s.x, s.y + 1e-5, s.z, 0.295, cave.bodyHeight - 1e-5);
      const bodySweep = island.voxelSegmentClearAt(previous.x, previous.y + 1e-5, previous.z, s.x, s.y + 1e-5, s.z, 0.295, cave.bodyHeight - 1e-5);
      const eyeClear = island.clearAt(s.eye.x, s.eye.y - 0.295, s.eye.z, 0.295, 0.59);
      const eyeSweep = island.voxelSegmentClearAt(previous.eye.x, previous.eye.y - 0.295, previous.eye.z, s.eye.x, s.eye.y - 0.295, s.eye.z, 0.295, 0.59);
      maxEyeStep = Math.max(maxEyeStep, Math.hypot(s.eye.x - previous.eye.x, s.eye.y - previous.eye.y, s.eye.z - previous.eye.z));
      maxEyeGap = Math.max(maxEyeGap, Math.hypot(s.eye.x - s.x, s.eye.y - s.y - cave.headOffset * 0.95, s.eye.z - s.z));
      if ((!bodyClear || !bodySweep || !eyeClear || !eyeSweep || !s.selected || s.scene !== "hub" || s.mode !== mode || !s.equipped && Math.hypot(s.x - hole.x, s.z - hole.z) <= hole.mouthRadius + 0.3) && failures.length < 12) failures.push({ ...s, bodyClear, bodySweep, eyeClear, eyeSweep });
      if (frame % Math.max(1, Math.round(0.1 / dt)) === 0) poses.push(s);
      previous = s;
      if (s.x >= hole.x + 6.5 && s.hop === 0 && Math.abs(s.y - basement.floor) < 1e-6) break;
    }
    key("keyup", " "); key("keyup", "w");
    const landed = state(); tap("j"); const rejected = state();
    return { mode, dt, initial, enteredAt, clearedLipAt, removedAt, removal, toggled, landed, rejected, maxEyeStep, maxEyeGap, poses, failures, floor: basement.floor, bottom: hole.bottom, mouthRadius: hole.mouthRadius, backend: B.renderer.kind };
  } finally { key("keyup", " "); key("keyup", "w"); }
};
