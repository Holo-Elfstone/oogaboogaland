// Exercise raw orbit separately from the physical free first-person eye.
// Every walking sample uses the production pilot, support and swept camera.
export const matrixNavigationProbe = (prime = () => {}) => {
  const B = window.__ooga, scene = window.BL.scenes.hub, C = B.matrixCave, W = C.world, R = B.renderer, o = B.pilot.orbit, dt = 1 / 120;
  let elapsed = W.sampleStream(0).time, draws = 0, samples = 0, collisions = 0;
  const failures = [], raw = [], cases = [], sealed = [], eyeHeight = 1.1;
  R.setQuality("high"); prime();
  const step = (draw = false) => { scene.update(dt, elapsed += dt); if (draw && R.render(scene.root, B.camera, B.renderOpts)) draws++; };
  const advance = (radius) => { let n = 0; while (W.radius !== radius && n++ < 400) step(); if (W.radius !== radius) throw new Error("Camera fixture wave did not settle"); };
  const worldAt = (opening, x, y, z) => {
    const m = opening.mouth, sr = Math.sin(m.ry), cr = Math.cos(m.ry);
    return { x: m.x + cr * x + sr * z, y: m.floorY + y, z: m.z - sr * x + cr * z };
  };
  const sample = (opening) => {
    const m = opening.mouth, p = B.camera.position, sr = Math.sin(m.ry), cr = Math.cos(m.ry), space = {};
    const cavity = B.island.cavityAt(p.x, p.z, space, opening.headquarters ? B.island.headquarters.caveIndex : opening.caveIndex, p.y);
    const clear = B.island.clearAt(p.x, p.y - 0.299, p.z, 0.299, 0.598);
    return { actual: [cr * (p.x - m.x) - sr * (p.z - m.z), p.y - m.floorY, sr * (p.x - m.x) + cr * (p.z - m.z)], id: B.cameraCave.id, index: B.cameraCave.index, contains: B.cameraCave.contains(p.x, p.y, p.z), matrixInside: C.inside, active: W.active, near: B.camera.near, clear, floor: cavity ? space.floor : null, ceiling: cavity && Number.isFinite(space.ceiling) ? space.ceiling : null, worldY: p.y, mode: B.pilot.mode };
  };
  const audit = (opening) => {
    const p = sample(opening); samples++;
    if (!p.clear) { collisions++; if (failures.length < 12) failures.push({ id: opening.id, ...p }); }
    return p;
  };
  const rawPose = (opening, x, y, z) => {
    const p = worldAt(opening, x, y, z), m = opening.mouth, sr = Math.sin(m.ry), cr = Math.cos(m.ry);
    o.target = { x: p.x - sr * 3.5, y: p.y, z: p.z - cr * 3.5 }; o.tx = o.target.x; o.ty = o.target.y; o.tz = o.target.z;
    o.yaw = o.tYaw = m.ry; o.pitch = o.tPitch = 0; o.dist = o.tDist = 3.5;
    B.pilot.update(0); step(true);
    return { requested: [x, y, z], ...sample(opening) };
  };
  const start = (opening, x = 0, y = eyeHeight, z = 0.9) => {
    B.pilot.goPreset("pile");
    const p = worldAt(opening, x, y, z), m = opening.mouth;
    o.target = { x: p.x, y: p.y, z: p.z }; o.tx = p.x; o.ty = p.y; o.tz = p.z;
    o.yaw = o.tYaw = m.ry; o.pitch = o.tPitch = 0; o.dist = o.tDist = 3.5;
    B.pilot.update(0); B.pilot.enterClose();
    let frames = 0;
    while (B.pilot.closeMix < 1 && frames++ < 60) scene.update(1 / 20, elapsed += 1 / 20);
    if (B.pilot.closeMix < 1) throw new Error("Free-camera entry did not settle");
    // Let the physical eye bind shared HQ air to the nearest real ramp after
    // the unrestricted focal-point dolly hands control back to collision.
    step();
    return audit(opening);
  };
  const move = (opening, x, z) => {
    const target = worldAt(opening, x, 0, z), before = B.camera.position, limit = Math.ceil(Math.hypot(target.x - before.x, target.z - before.z) / 0.05) + 12;
    for (let n = 0; n < limit; n++) {
      const p = B.camera.position, dx = target.x - p.x, dz = target.z - p.z, distance = Math.hypot(dx, dz);
      if (distance < 1e-5) break;
      const k = Math.min(1, 0.05 / distance); o.target.x = p.x + dx * k; o.target.z = p.z + dz * k;
      step(); audit(opening);
    }
    step(true);
    return { requested: [x, z], ...audit(opening), error: Math.hypot(target.x - B.camera.position.x, target.z - B.camera.position.z) };
  };
  const allOpenings = B.cameraCave.openings, openings = allOpenings.filter((opening) => !opening.blocked);
  for (const opening of allOpenings) {
    B.pilot.goPreset("pile");
    for (const [x, y, z] of [[0, -8, -3.5], [6, 1.1, -3.5], [0, 12, -3.5]]) raw.push({ id: opening.id, ...rawPose(opening, x, y, z) });
  }
  for (const active of [false, true]) for (const opening of openings) {
    B.pilot.goPreset("pile"); C.viewApproach(); step();
    B.matrixGate.set(active); advance(active ? W.maxRadius : 0);
    const route = [], lateral = [], invalid = [], pitchViews = [];
    start(opening);
    for (const z of [0.9, 0.6, 0.5, 0.4, 0.1, -0.5]) route.push(move(opening, 0, z));
    let insideX = 0, insideZ = -3.5;
    if (opening.headquarters) {
      const ramp = B.island.headquarters.ramps.find((r) => r.id === opening.id), sr = Math.sin(opening.mouth.ry), cr = Math.cos(opening.mouth.ry);
      const onRamp = (i) => { const q = ramp.samples[i], x = cr * (q.x - opening.mouth.x) - sr * (q.z - opening.mouth.z), z = sr * (q.x - opening.mouth.x) + cr * (q.z - opening.mouth.z); return move(opening, x, z); };
      for (let i = 4; i < ramp.samples.length; i += 4) route.push(onRamp(i));
      for (let i = ramp.samples.length - 5; i >= 12; i -= 4) route.push(onRamp(i));
      const q = ramp.samples[12]; insideX = cr * (q.x - opening.mouth.x) - sr * (q.z - opening.mouth.z); insideZ = sr * (q.x - opening.mouth.x) + cr * (q.z - opening.mouth.z);
      route.push(move(opening, insideX, insideZ));
    } else for (const z of [-1.5, -3.5, -5, -3.5]) route.push(move(opening, 0, z));
    const inside = sample(opening);
    for (const pitch of [-Math.PI / 2 + 0.001, Math.PI / 2 - 0.001, 0]) { o.pitch = o.tPitch = pitch; step(true); pitchViews.push({ pitch, ...audit(opening) }); }
    const ceiling = start(opening, insideX, inside.ceiling - opening.mouth.floorY - 0.05, insideZ);
    start(opening, insideX, inside.worldY - opening.mouth.floorY, insideZ);
    const wall = move(opening, insideX + 6, insideZ); move(opening, insideX, insideZ);
    if (opening.headquarters) {
      const ramp = B.island.headquarters.ramps.find((r) => r.id === opening.id), sr = Math.sin(opening.mouth.ry), cr = Math.cos(opening.mouth.ry);
      for (let i = 8; i >= 4; i -= 4) { const q = ramp.samples[i]; route.push(move(opening, cr * (q.x - opening.mouth.x) - sr * (q.z - opening.mouth.z), sr * (q.x - opening.mouth.x) + cr * (q.z - opening.mouth.z))); }
    }
    for (const z of [-0.5, 0.1, 0.4, 0.5, 0.6, 0.9, 1.2]) route.push(move(opening, 0, z));
    for (const x of opening.headquarters ? [-1.4, -1, 1, 1.4] : [-2.048, -1.674, 1.674, 2.048]) {
      start(opening, x); lateral.push({ x, route: [0.6, 0.4, 0.1, -0.5, 0.4, 0.6].map((z) => move(opening, x, z)) });
    }
    for (const [name, x, y] of [["above", 0, opening.maxY + 1], ["beside-left", opening.minX - 1, eyeHeight], ["beside-right", opening.maxX + 1, eyeHeight]]) {
      const before = start(opening, x, y), after = move(opening, x, 0.1); invalid.push({ name, before, after });
    }
    cases.push({ id: opening.id, index: opening.caveIndex, headquarters: !!opening.headquarters, active, route, lateral, invalid, inside, pitchViews, ceiling, wall, records: R.stats.records });
  }
  B.matrixGate.set(false);
  for (const opening of allOpenings.filter((opening) => opening.blocked)) { const before = start(opening), after = move(opening, 0, 0.1); sealed.push({ id: opening.id, before, after }); }
  B.pilot.goPreset("pile"); C.viewApproach(); step(); advance(0); step(true);
  return { backend: R.kind, openings: allOpenings.length, occupied: openings.length, raw, sealed, caveBytes: B.island.cavityBytes, cases, draws, samples, collisions, failures, final: { index: B.cameraCave.index, active: W.active, radius: W.radius } };
};

// Scene routing must depend on the driven Ooga's real doorway crossing, not
// merely occupying the cave's X/Z footprint or looking down through its roof.
export const caveRoutingRejections = async () => {
  const B = window.__ooga, o = B.pilot.orbit, cases = [];
  const wait = () => new Promise((resolve) => { const frame = B.renderedFrames, tick = () => B.scene !== "hub" || B.renderedFrames >= frame + 5 ? resolve() : requestAnimationFrame(tick); requestAnimationFrame(tick); });
  for (const id of ["c11", "c9"]) {
    const m = B.mouths.find((mouth) => mouth.id === id), sr = Math.sin(m.ry), cr = Math.cos(m.ry), cave = [...B.cavemen.values()].find((c) => c.state === "working" && !c.walk && !c.build);
    const place = (x, y, z, overhead = false) => {
      const p = cave.root.position; p.x = x; p.y = cave.baseY + y; p.z = z; cave.hop = cave.hopV = 0;
      const target = { x, y: y + 0.9, z }; o.target = target; o.tx = x; o.ty = target.y; o.tz = z;
      o.yaw = o.tYaw = m.ry; o.pitch = o.tPitch = overhead ? Math.PI / 2 - 0.05 : 0.3; o.dist = o.tDist = overhead ? 10 : 4;
      B.pilot.update(0.1);
    };
    const sample = (name) => {
      const p = cave.root.position, eye = B.camera.position, space = { caveIndex: 0, floor: 0, ceiling: 0 }, cavity = B.island.cavityAt(eye.x, eye.z, space);
      return { id, name, scene: B.scene, playerIndex: B.cameraCave.playerIndex, actorY: p.y - cave.baseY, ground: B.island.surfaceAt(p.x, p.z), atTrigger: Math.hypot(p.x - m.inside.x, p.z - m.inside.z) < 0.001, cameraY: eye.y, cameraCavity: cavity ? space.caveIndex : 0, ceiling: Number.isFinite(space.ceiling) ? space.ceiling : null };
    };
    B.crew.control(cave); place(m.inside.x, B.island.surfaceAt(m.inside.x, m.inside.z), m.inside.z); await wait();
    cases.push(sample("actor-on-roof")); if (B.scene !== "hub") return cases;
    B.crew.release(); await wait(); B.crew.control(cave); place(m.inside.x, m.floorY, m.inside.z); await wait();
    cases.push(sample("inside-without-crossing")); if (B.scene !== "hub") return cases;
    B.crew.release(); await wait(); B.crew.control(cave);
    for (const z of [1.2, 0.7, 0.4, -0.5, -1.5]) { place(m.x + sr * z, m.floorY, m.z + cr * z, true); await wait(); if (B.scene !== "hub") return cases; }
    place(m.inside.x, m.floorY, m.inside.z, true); await wait();
    cases.push(sample("camera-above-admitted-actor")); if (B.scene !== "hub") return cases;
    B.crew.release(); await wait();
  }
  B.pilot.goPreset("pile"); await wait();
  return cases;
};
