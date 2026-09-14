// Land on the actual voxel cloud mesh, then exercise its moving lifecycle.
export const cloudSupportProbe = ({ mode = "trailing", dt = 1 / 60 } = {}) => {
  const B = window.__ooga, S = window.BL.scene, scene = window.BL.scenes.hub, clouds = B.matrixCave.clouds;
  const cave = [...B.cavemen.values()].find((c) => c.state === "working" && !c.jet), cloud = clouds[2], node = cloud.node;
  const failures = [], held = new Set(), rows = [];
  let time = B.renderOpts.matrix.time, checks = 0, maximumStep = 0;
  const key = (type, value) => window.dispatchEvent(new KeyboardEvent(type, { key: value }));
  const press = (value) => { key("keydown", value); held.add(value); };
  const release = (value) => { key("keyup", value); held.delete(value); };
  for (const c of clouds) c.node.visible = c === cloud;
  // Derive the highest broad top from render vertices, independently of the
  // platform's cached support rectangles.
  const v = node.geometry.verts, topFaces = [];
  for (const f of node.geometry.faces) {
    const a = f.i[0] * 3, b = f.i[1] * 3, c = f.i[2] * 3;
    if ((v[b + 2] - v[a + 2]) * (v[c] - v[a]) - (v[b] - v[a]) * (v[c + 2] - v[a + 2]) <= 0) continue;
    topFaces.push({ minX: Math.min(...f.i.map((i) => v[i * 3])), maxX: Math.max(...f.i.map((i) => v[i * 3])), minZ: Math.min(...f.i.map((i) => v[i * 3 + 2])), maxZ: Math.max(...f.i.map((i) => v[i * 3 + 2])), y: v[a + 1] });
  }
  topFaces.sort((a, b) => b.y - a.y || (b.maxX - b.minX) * (b.maxZ - b.minZ) - (a.maxX - a.minX) * (a.maxZ - a.minZ));
  const top = topFaces[0], localX = (top.minX + top.maxX) / 2, localZ = (top.minZ + top.maxZ) / 2;
  const at = () => ({ x: node.position.x + localX, y: node.position.y + top.y, z: node.position.z + localZ });
  const position = () => ({ x: cave.root.position.x, y: cave.root.position.y - cave.baseY, z: cave.root.position.z });
  const visibleTopAt = (x, z) => {
    let y = -Infinity;
    for (const f of topFaces) {
      const dx = Math.max(node.position.x + f.minX - x, 0, x - node.position.x - f.maxX), dz = Math.max(node.position.z + f.minZ - z, 0, z - node.position.z - f.maxZ);
      if (dx * dx + dz * dz < 0.3 * 0.3 - 1e-9) y = Math.max(y, node.position.y + f.y);
    }
    return y;
  };
  const step = (delta = dt) => {
    const before = position(); scene.update(delta, time += delta); const p = position();
    maximumStep = Math.max(maximumStep, Math.abs(p.y - before.y)); checks++;
    if ((!Number.isFinite(p.y) || !B.island.clearAt(p.x, p.y + 1e-5, p.z, 0.295, cave.bodyHeight - 1e-5) || B.scene !== "hub") && failures.length < 12) failures.push({ kind: "body", p, mode: B.pilot.mode });
  };
  const place = (height = 0) => {
    node.visible = true;
    if (!node.parent) S.addChild(scene.root, node);
    const p = at();
    B.pilot.navigate({ position: { x: p.x, y: p.y + height, z: p.z }, yaw: Math.PI, pitch: 0, dist: 3.5 });
    // Use the island's empty support initially: dynamic support must rebase
    // this old ground without teleporting the airborne actor upward.
    cave.hop = height ? p.y + height + 120 : 0;
    cave.hopV = height ? -3 : 0;
    step(0);
  };
  B.pilot.possess(cave);
  if (mode === "first-person") B.pilot.enterClose();
  try {
    place(4);
    const initial = position();
    let frames = 0;
    while ((cave.hop > 0 || cave.hopV > 0) && frames++ < Math.ceil(3 / dt)) step();
    step(0);
    const landed = position();
    rows.push({ kind: "landing", initial, landed, expected: visibleTopAt(landed.x, landed.z), frames, attached: cave.cloudSupport === cloud, grounded: cave.hop === 0 && cave.hopV === 0 });
    step();
    const rider = position(), cloudStart = { ...node.position };
    for (let i = 0; i < Math.ceil(0.6 / dt); i++) step();
    const carried = position();
    rows.push({ kind: "drift", error: Math.hypot(carried.x - rider.x - node.position.x + cloudStart.x, carried.z - rider.z - node.position.z + cloudStart.z), heightError: Math.abs(carried.y - visibleTopAt(carried.x, carried.z)), attached: cave.cloudSupport === cloud });
    place(4);
    const airborne = position(); node.visible = false; step();
    rows.push({ kind: "airborne-hidden", drop: airborne.y - position().y, expected: 3 * dt + 9.8 * dt * dt, velocity: cave.hopV, expectedVelocity: -3 - 9.8 * dt, horizontal: Math.hypot(cave.root.position.x - airborne.x, cave.root.position.z - airborne.z), detached: cave.cloudSupport === null });
    // Acquire support only at the destination of one airborne step. Drift
    // removes that narrow overlap before the next pre-gravity query.
    node.visible = true;
    const edgeX = 2.75, drift = cloud.speed * dt;
    let edgeZ = Infinity;
    for (const f of topFaces) {
      const dx = Math.max(f.minX - edgeX, 0, edgeX - f.maxX);
      if (dx < 0.3) edgeZ = Math.min(edgeZ, f.minZ - Math.sqrt(0.3 * 0.3 - dx * dx));
    }
    B.pilot.navigate({ position: { x: node.position.x + edgeX, y: 25, z: node.position.z + edgeZ + drift * 1.5 - 7.75 * dt }, yaw: 0, pitch: 0, dist: 3.5 });
    cave.hop = 145; cave.hopV = -5;
    const priorTop = visibleTopAt(cave.root.position.x, cave.root.position.z);
    press("s"); step(); release("s");
    const acquired = cave.cloudSupport === cloud, first = position(), firstTop = visibleTopAt(first.x, first.z);
    step();
    rows.push({ kind: "transient-overlap", initiallyClear: priorTop === -Infinity, acquired, firstTop, firstHeight: first.y, detached: cave.cloudSupport === null, finalHeight: position().y, expectedHeight: 25 - (5 + 9.8 * dt) * dt - (5 + 19.6 * dt) * dt, velocity: cave.hopV, expectedVelocity: -5 - 19.6 * dt });
    place();
    cave.jetFuel = 0.1; press("j"); step(); release("j");
    const recovering = cave.jetRecovering, fuelStart = cave.jetFuel;
    for (let i = 0; i < Math.ceil(0.6 / dt); i++) step();
    rows.push({ kind: "refill", recovering, unlocked: !cave.jetRecovering, fuel: cave.jetFuel, expected: Math.min(1, fuelStart + Math.ceil(0.6 / dt) * dt / 4) });
    press("j"); step(); release("j");
    place();
    const walkStart = position(); press("w");
    let groundedSteps = 0, floorError = 0;
    for (let i = 0; i < Math.ceil(1.5 / dt); i++) {
      step();
      if (cave.hop > 0) break;
      const p = position(); groundedSteps++; floorError = Math.max(floorError, Math.abs(p.y - visibleTopAt(p.x, p.z)));
    }
    release("w");
    rows.push({ kind: "walk-off", distance: Math.hypot(cave.root.position.x - walkStart.x, cave.root.position.z - walkStart.z), groundedSteps, floorError, falling: cave.hop > 0, velocity: cave.hopV, attached: !!cave.cloudSupport });
    for (const reason of ["hidden", "removed", "wrapped"]) {
      place();
      if (reason === "wrapped") {
        const axis = cloud.beside ? "z" : "x", shift = 60 - cloud.speed * dt / 2 - node.position[axis];
        node.position[axis] += shift; cave.root.position[axis] += shift;
        B.pilot.navigate({ position: position(), yaw: Math.PI, pitch: 0, dist: 3.5 });
        step(0);
      }
      const before = position();
      if (reason === "hidden") node.visible = false;
      else if (reason === "removed") S.removeChild(scene.root, node);
      step(); const after = position();
      rows.push({ kind: reason, drop: before.y - after.y, expected: 9.8 * dt * dt, velocity: cave.hopV, expectedVelocity: -9.8 * dt, horizontal: Math.hypot(after.x - before.x, after.z - before.z), detached: cave.cloudSupport === null });
    }
    // A one-way cloud must never stop upward thrust from underneath it.
    place(-3); cave.hopV = 0; cave.jetFuel = 1;
    press("j"); step(); release("j"); press(" ");
    let highest = -Infinity;
    for (let i = 0; i < Math.ceil(1.8 / dt); i++) { step(); highest = Math.max(highest, position().y); }
    release(" ");
    rows.push({ kind: "upward", highest, top: at().y, fuel: cave.jetFuel, equipped: !!cave.jet });
    press("j"); step(); release("j");
    // Real jagged island edge: the cloud drifts into a higher voxel, while
    // the rider's current position is clear and only 0.25 above its footing.
    const saved = { ...node.position }, fixture = { x: -22.25, y: 2.5, z: -4.55 };
    node.position.x = fixture.x - localX; node.position.y = fixture.y - top.y; node.position.z = fixture.z - localZ;
    place();
    const blockedStart = position(), blocked = !B.island.clearAt(fixture.x, fixture.y, fixture.z + 0.02, 0.3, cave.bodyHeight);
    let maximumCarry = 0, fell = false;
    for (let i = 0; i < Math.ceil(8 / dt); i++) {
      step(); maximumCarry = Math.max(maximumCarry, Math.hypot(cave.root.position.x - blockedStart.x, cave.root.position.z - blockedStart.z));
      if (cave.hop > 0) { fell = true; break; }
    }
    rows.push({ kind: "blocked-carry", blocked, maximumCarry, fell, cloudMovement: node.position.z - fixture.z + localZ });
    // Move a real higher puff beneath feet already close to the underside.
    // A support change must not lift the head into that rock ceiling.
    const localTopAt = (x, z) => {
      let y = -Infinity;
      for (const f of topFaces) {
        const dx = Math.max(f.minX - x, 0, x - f.maxX), dz = Math.max(f.minZ - z, 0, z - f.maxZ);
        if (dx * dx + dz * dz < 0.3 * 0.3 - 1e-9) y = Math.max(y, f.y);
      }
      return y;
    };
    let puff = null;
    for (let x = -5; x <= 5 && !puff; x += 0.125) for (let z = -3; z <= 3 && !puff; z += 0.125) {
      const low = localTopAt(x, z), high = localTopAt(x, z - 0.5);
      if (Number.isFinite(low) && high - low === 0.5) puff = { x, z, low, high };
    }
    const roof = B.island.ceilingAt(0, -40, 10, 0.3), feet = roof - cave.bodyHeight - 0.1, speed = cloud.speed;
    node.position.x = -puff.x; node.position.y = feet - puff.low; node.position.z = 10 - puff.z; cloud.speed = 0;
    B.pilot.navigate({ position: { x: 0, y: feet, z: 10 }, yaw: Math.PI, pitch: 0, dist: 3.5 }); step(0);
    const puffBefore = position(), raisedClear = B.island.clearAt(0, feet + 0.5, 10, 0.3, cave.bodyHeight);
    node.position.z += 0.5; step();
    rows.push({ kind: "higher-puff", difference: puff.high - puff.low, raisedClear, rise: position().y - puffBefore.y, headClearance: roof - position().y - cave.bodyHeight });
    cloud.speed = speed;
    Object.assign(node.position, saved);
    place();
    if (!B.pilot.closeWanted) B.pilot.enterClose();
    B.pilot.release(true);
    B.pilot.navigate({ position: at(), yaw: Math.PI, pitch: 0, dist: 3.5 });
    step(0); step();
    const eye = { ...B.camera.position }, start = { ...node.position };
    for (let i = 0; i < Math.ceil(0.3 / dt); i++) step();
    const freeDrift = Math.hypot(B.camera.position.x - eye.x - node.position.x + start.x, B.camera.position.z - eye.z - node.position.z + start.z);
    const before = { ...B.camera.position };
    node.visible = false; step(); step();
    rows.push({ kind: "free-eye", mode: B.pilot.mode, driftError: freeDrift, falling: B.pilot.freeFalling, drop: before.y - B.camera.position.y, expected: 9.8 * dt * dt });
    return { mode, dt, rows, checks, maximumStep, failures, backend: B.renderer.kind, topFaces: topFaces.length };
  } finally { for (const value of held) key("keyup", value); }
};

// Low clouds remain physical ground even below the island's outdoor floor.
export const cloudLowFreeEyeProbe = ({ dt = 1 / 60 } = {}) => {
  const B = window.__ooga, scene = window.BL.scenes.hub, clouds = B.matrixCave.clouds, cloud = clouds[2], node = cloud.node;
  for (const c of clouds) c.node.visible = c === cloud;
  const v = node.geometry.verts;
  let face = null, top = -Infinity;
  for (const f of node.geometry.faces) {
    const a = f.i[0] * 3, b = f.i[1] * 3, c = f.i[2] * 3;
    if ((v[b + 2] - v[a + 2]) * (v[c] - v[a]) - (v[b] - v[a]) * (v[c + 2] - v[a + 2]) > 0 && v[a + 1] > top) { top = v[a + 1]; face = f; }
  }
  const localX = face.i.reduce((sum, i) => sum + v[i * 3], 0) / face.i.length, localZ = face.i.reduce((sum, i) => sum + v[i * 3 + 2], 0) / face.i.length;
  node.position.x = 45 - localX; node.position.y = -4 - top; node.position.z = -localZ;
  // Arrive with an Ooga first so the scene's collision history is at the
  // cloud before releasing into the unpossessed eye-level view.
  B.pilot.possess([...B.cavemen.values()].find((c) => c.state === "working" && !c.jet));
  B.pilot.navigate({ position: { x: 45, y: -4, z: 0 }, yaw: Math.PI, pitch: 0, dist: 3.5 });
  B.pilot.enterClose();
  for (let i = 0; i < Math.ceil(3 / dt) && B.pilot.closeMix !== 1; i++) B.pilot.update(dt);
  if (B.pilot.closeMix !== 1) throw new Error("Low cloud fixture view did not settle");
  scene.update(0, B.renderOpts.matrix.time);
  B.pilot.release(true);
  B.pilot.navigate({ position: { x: 45, y: -4, z: 0 }, yaw: Math.PI, pitch: 0, dist: 3.5 });
  let time = B.renderOpts.matrix.time, samples = 0, minimum = Infinity, maxRise = 0;
  const failures = [];
  const step = (delta = dt) => {
    const before = B.camera.position.y;
    scene.update(delta, time += delta); samples++;
    const p = B.camera.position;
    if (!B.island.clearAt(p.x, p.y - 0.3, p.z, 0.3, 0.6) || B.scene !== "hub" || B.pilot.mode !== "eye-level") failures.push({ x: p.x, y: p.y, z: p.z, mode: B.pilot.mode });
    return p.y - before;
  };
  step(0); step();
  for (let i = 0; i < Math.ceil(1 / dt) && Math.abs(B.camera.position.y + 2.9) > 1e-7; i++) step();
  const initial = { ...B.camera.position }, start = { ...node.position };
  for (let i = 0; i < Math.round(0.3 / dt); i++) step();
  const driftError = Math.hypot(B.camera.position.x - initial.x - node.position.x + start.x, B.camera.position.z - initial.z - node.position.z + start.z);
  const supported = { ...B.camera.position }, grounded = !B.pilot.freeFalling;
  node.visible = false; step();
  const beforeFall = B.camera.position.y;
  step();
  const firstDrop = beforeFall - B.camera.position.y;
  for (let i = 0; i < Math.round(0.8 / dt); i++) { maxRise = Math.max(maxRise, step()); minimum = Math.min(minimum, B.camera.position.y); }
  return { dt, initial, supported, grounded, driftError, firstDrop, expectedDrop: 9.8 * dt * dt, minimum, maxRise, falling: B.pilot.freeFalling, samples, failures, backend: B.renderer.kind };
};
