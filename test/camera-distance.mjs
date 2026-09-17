// A wall may hide the Ooga while the chosen eye position remains clear. Find
// that condition from actual rock geometry, then use real movement controls.
export const cameraDistanceProbe = ({ dt = 1 / 20, basement = false } = {}) => {
  const B = window.__ooga, scene = window.BL.scenes.hub, island = B.island, H = island.headquarters;
  const cave = [...B.cavemen.values()].find((c) => c.state === "working"), rows = [], failures = [];
  let time = B.renderOpts.matrix.time, rampSamples = 0, rampOcclusions = 0, rampRequestedError = 0, rampDistanceError = 0, stagingReached = true;
  B.pilot.possess(cave);
  document.querySelector('nav[data-scene="hub"] [data-preset="underground"]').click();
  for (let i = 0; i < Math.ceil(0.5 / dt); i++) scene.update(dt, time += dt);
  if (basement) {
    // The scene owns cross-level admission. Walk its real descent instead of
    // teleporting beneath stale HQ camera metadata through pilot.navigate.
    const p = cave.root.position, bed = B.headquarters.mattresses.find((b) => b.basement), route = B.headquarters.sleepNavigation.route(p.x, p.y - cave.baseY, p.z, bed, true), held = new Set();
    const keys = (next) => {
      for (const key of held) if (!next.includes(key)) { window.dispatchEvent(new KeyboardEvent("keyup", { key })); held.delete(key); }
      for (const key of next) if (!held.has(key)) { window.dispatchEvent(new KeyboardEvent("keydown", { key })); held.add(key); }
    };
    if (!route) stagingReached = false;
    else for (const target of route) {
      let reached = false;
      for (let i = 0; i < Math.ceil(4 / dt); i++) {
        const p = cave.root.position, dx = target.x - p.x, dz = target.z - p.z, o = B.pilot.orbit, tolerance = Math.max(0.15, dt * 8);
        if (Math.hypot(dx, dz) < tolerance) { reached = true; break; }
        const right = dx * Math.cos(o.yaw) - dz * Math.sin(o.yaw), forward = -dx * Math.sin(o.yaw) - dz * Math.cos(o.yaw), next = [];
        if (Math.abs(right) > Math.max(tolerance * 0.4, Math.abs(forward) * Math.tan(Math.PI / 8))) next.push(right > 0 ? "d" : "a");
        if (Math.abs(forward) > Math.max(tolerance * 0.4, Math.abs(right) * Math.tan(Math.PI / 8))) next.push(forward > 0 ? "w" : "s");
        keys(next); scene.update(dt, time += dt);
        const eye = B.camera.position, feet = p.y - cave.baseY;
        for (const ramp of H.basement.ramps) {
          let onRamp = false;
          for (let n = 1; n < ramp.samples.length; n++) {
            const a = ramp.samples[n - 1], b = ramp.samples[n], vx = b.x - a.x, vz = b.z - a.z, k = Math.max(0, Math.min(1, ((p.x - a.x) * vx + (p.z - a.z) * vz) / (vx * vx + vz * vz)));
            if (Math.hypot(p.x - a.x - vx * k, p.z - a.z - vz * k) < ramp.width / 2 - 0.4 && Math.abs(feet - a.y - (b.y - a.y) * k) < 0.15 && feet < H.floor - 0.75 && feet > H.basement.floor + 0.75) { onRamp = true; break; }
          }
          if (!onRamp) continue;
          rampSamples++;
          const o = B.pilot.orbit, pitch = B.pilot.viewPitch, cp = Math.cos(pitch);
          rampRequestedError = Math.max(rampRequestedError, Math.hypot(eye.x - o.tx - Math.sin(o.yaw) * cp * o.dist, eye.y - o.ty - Math.sin(pitch) * o.dist, eye.z - o.tz - Math.cos(o.yaw) * cp * o.dist));
          rampDistanceError = Math.max(rampDistanceError, Math.abs(Math.hypot(eye.x - o.tx, eye.y - o.ty, eye.z - o.tz) - o.tDist));
          if (!island.voxelSegmentClearAt(p.x, feet + 1.1, p.z, eye.x, eye.y, eye.z, 0.09, 0.18)) rampOcclusions++;
        }
      }
      if (!reached) { stagingReached = false; failures.push({ kind: "staging route", target, position: { ...cave.root.position } }); break; }
    }
    keys([]);
  }
  try {
    {
      let fixture = null;
      for (const room of basement ? H.basement.rooms : H.rooms) {
        if (fixture) break;
        for (const dist of [4, 5, 6, 7, 8, 9, 10]) {
          if (fixture) break;
          for (let a = 0; a < 72; a++) {
            const yaw = a * Math.PI / 36, s = Math.sin(yaw), c = Math.cos(yaw), pitch = 0.2, reach = Math.cos(pitch) * dist, y = room.floor + 0.9 + Math.sin(pitch) * dist;
            let valid = true;
            for (let i = 0; i <= 5; i++) {
              const x = room.x + c * i * 0.2, z = room.z - s * i * 0.2, ex = x + s * reach, ez = z + c * reach;
              if (!island.clearAt(x, room.floor + 1e-5, z, 0.3, cave.bodyHeight) || Math.abs(island.supportAt(x, z, room.floor + 0.01, 0.3, -120) - room.floor) > 1e-5 || !island.clearAt(ex, y - 0.3, ez, 0.3, 0.6) || island.voxelSegmentClearAt(x, room.floor + 0.9, z, ex, y, ez, 0, 0)) { valid = false; break; }
            }
            if (valid) { fixture = { room: room.index, basement, position: { x: room.x, y: room.floor, z: room.z }, yaw, pitch, dist }; break; }
          }
        }
      }
      if (!fixture) return { rows, failures: failures.concat({ kind: "no clear occluded view", basement }), backend: B.renderer.kind, dt, stagingReached, rampSamples, rampOcclusions, rampRequestedError, rampDistanceError };
      B.pilot.navigate({ position: fixture.position, yaw: fixture.yaw, pitch: fixture.pitch, dist: fixture.dist });
      for (let i = 0; i < Math.ceil(1 / dt); i++) scene.update(dt, time += dt);
      const initial = { ...B.camera.position }, start = { ...cave.root.position };
      let samples = 0, hidden = 0, maxDistanceError = 0, maxRequestedError = 0, maxEyeStep = 0, previous = null;
      const inspect = () => {
        const o = B.pilot.orbit, eye = B.camera.position, p = cave.root.position, cp = Math.cos(B.pilot.viewPitch);
        const expected = { x: o.tx + Math.sin(o.yaw) * cp * o.dist, y: o.ty + Math.sin(B.pilot.viewPitch) * o.dist, z: o.tz + Math.cos(o.yaw) * cp * o.dist };
        samples++;
        maxRequestedError = Math.max(maxRequestedError, Math.hypot(eye.x - expected.x, eye.y - expected.y, eye.z - expected.z));
        maxDistanceError = Math.max(maxDistanceError, Math.abs(Math.hypot(eye.x - o.tx, eye.y - o.ty, eye.z - o.tz) - fixture.dist));
        if (!island.voxelSegmentClearAt(p.x, p.y - cave.baseY + 0.9, p.z, eye.x, eye.y, eye.z, 0, 0)) hidden++;
        const clear = island.clearAt(eye.x, eye.y - 0.3, eye.z, 0.3, 0.6), swept = !previous || island.voxelSegmentClearAt(previous.x, previous.y - 0.3, previous.z, eye.x, eye.y - 0.3, eye.z, 0.3, 0.6);
        if (previous) maxEyeStep = Math.max(maxEyeStep, Math.hypot(eye.x - previous.x, eye.y - previous.y, eye.z - previous.z));
        if ((!clear || !swept || B.pilot.player !== cave || B.pilot.mode !== "trailing" || B.scene !== "hub") && failures.length < 8) failures.push({ kind: "physical view", basement, clear, swept, eye: { ...eye }, previous });
        previous = { ...eye };
      };
      inspect();
      // Hold a fixed selected heading: camera auto-follow must not rotate the
      // digital movement route while this independent occlusion check runs.
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "d" }));
      for (let i = 0; i < Math.floor(0.1 / dt); i++) { B.pilot.hooks.onOrbit(0, 0); scene.update(dt, time += dt); inspect(); }
      window.dispatchEvent(new KeyboardEvent("keyup", { key: "d" }));
      for (let i = 0; i < Math.ceil(1 / dt); i++) { scene.update(dt, time += dt); inspect(); }
      rows.push({ ...fixture, samples, hidden, maxDistanceError, maxRequestedError, maxEyeStep, initial, final: { ...B.camera.position }, movement: Math.hypot(cave.root.position.x - start.x, cave.root.position.z - start.z), chosen: B.pilot.orbit.tDist, actual: B.pilot.orbit.dist });
    }
    return { rows, failures, backend: B.renderer.kind, dt, stagingReached, rampSamples, rampOcclusions, rampRequestedError, rampDistanceError };
  } finally { window.dispatchEvent(new KeyboardEvent("keyup", { key: "d" })); }
};

// Explicit input owns the exact trailing eye position,
// including angles that carry it through the room's floor or ceiling.
export const cameraPitchProbe = ({ dt = 1 / 60 } = {}) => {
  const B = window.__ooga, BL = window.BL, scene = BL.scenes.hub, cave = [...B.cavemen.values()].find((c) => c.state === "working"), rows = [], failures = [];
  const view = BL.math.mat4.create(), up = { x: 0, y: 1, z: 0 };
  let time = B.renderOpts.matrix.time, samples = 0;
  const step = (inspect = true) => {
    scene.update(dt, time += dt);
    if (!inspect) return;
    samples++;
    const eye = B.camera.position;
    BL.math.mat4.lookAt(view, eye, B.camera.target, B.camera.up || up);
    const finite = view.every(Number.isFinite) && [0, 1, 2].every((axis) => Math.abs(Math.hypot(view[axis], view[axis + 4], view[axis + 8]) - 1) < 1e-5);
    const physicalEye = B.pilot.closeMix > 0 && !B.pilot.preserveExitAngle && !B.cameraCave.transitioning;
    if ((!finite || physicalEye && !B.island.clearAt(eye.x, eye.y - 0.299, eye.z, 0.299, 0.598)) && failures.length < 8) failures.push({ kind: "view", eye: { ...eye }, finite });
  };
  const tick = (seconds, inspect = true) => { for (let i = 0; i < Math.ceil(seconds / dt); i++) step(inspect); };
  const setPitch = (pitch) => { B.pilot.hooks.onOrbit(0, (pitch - B.pilot.orbit.tPitch) / 0.0035); step(); tick(1); };
  const capture = (name) => {
    const o = B.pilot.orbit, eye = B.camera.position, p = cave.root.position, cp = Math.cos(B.pilot.viewPitch);
    const expected = { x: o.tx + Math.sin(o.yaw) * cp * o.dist, y: o.ty + Math.sin(B.pilot.viewPitch) * o.dist, z: o.tz + Math.cos(o.yaw) * cp * o.dist };
    return { name, chosen: o.tPitch, pitch: o.pitch, viewPitch: B.pilot.viewPitch, chosenDistance: o.tDist, distance: o.dist, actualDistance: Math.hypot(eye.x - o.tx, eye.y - o.ty, eye.z - o.tz), requestedError: Math.hypot(eye.x - expected.x, eye.y - expected.y, eye.z - expected.z), throughRock: !B.island.voxelSegmentClearAt(p.x, p.y - cave.baseY + 0.9, p.z, eye.x, eye.y, eye.z, 0, 0), eye: { ...eye }, feet: p.y - cave.baseY, radial: Math.hypot(eye.x - p.x, eye.z - p.z), mode: B.pilot.mode, selected: B.pilot.player === cave };
  };
  B.pilot.possess(cave);
  document.querySelector('nav[data-scene="hub"] [data-preset="pile"]').click(); tick(0.5, false);
  setPitch(-Math.PI / 2); rows.push(capture("floor"));
  setPitch(Math.PI / 2); rows.push(capture("overhead"));
  setPitch(0); rows.push(capture("level"));
  const before = { ...cave.root.position };
  window.dispatchEvent(new KeyboardEvent("keydown", { key: "d" })); tick(0.2); window.dispatchEvent(new KeyboardEvent("keyup", { key: "d" })); tick(0.4);
  const movement = Math.hypot(cave.root.position.x - before.x, cave.root.position.z - before.z);
  const room = B.headquarters.rooms[0];
  B.pilot.enterClose(); B.pilot.navigate({ position: { x: room.x, y: room.floor, z: room.z }, yaw: -room.angle, pitch: 0, dist: 6 }); tick(0.8, false);
  document.getElementById("scene").dispatchEvent(new WheelEvent("wheel", { deltaY: 60, cancelable: true })); tick(1, false);
  setPitch(Math.PI / 2); rows.push(capture("ceiling"));
  setPitch(0); rows.push(capture("room level"));
  return { rows, movement, samples, failures, backend: B.renderer.kind };
};

export const cameraFreeOrbitProbe = () => {
  const B = window.__ooga, BL = window.BL, scene = BL.scenes.hub, island = B.island, room = B.headquarters.rooms[0], rows = [], failures = [];
  const dt = 1 / 60, view = BL.math.mat4.create(); let time = B.renderOpts.matrix.time, samples = 0, maxError = 0;
  B.pilot.release(true);
  const target = { x: room.x, y: room.floor - 0.5, z: room.z };
  let yaw = null;
  for (const depth of [0.4, 0.6, 0.8, 1]) {
    if (yaw !== null) break;
    target.y = room.floor - depth;
    for (let n = 0; n < 72; n++) {
      const a = n * Math.PI / 36, x = target.x + Math.sin(a) * 6, z = target.z + Math.cos(a) * 6;
      let solid = true;
      for (const dx of [-0.2, 0, 0.2]) for (const dy of [-0.2, 0, 0.2]) for (const dz of [-0.2, 0, 0.2]) if (!island.solidAt(x + dx, target.y + dy, z + dz)) solid = false;
      if (solid && island.solidAt(target.x, target.y, target.z)) { yaw = a; break; }
    }
  }
  if (yaw === null || !island.solidAt(target.x, target.y, target.z)) throw new Error("No rock focal-point fixture");
  const inspect = () => {
    const o = B.pilot.orbit, eye = B.camera.position, pitch = B.pilot.viewPitch, cp = Math.cos(pitch);
    const error = Math.hypot(eye.x - o.tx - Math.sin(o.yaw) * cp * o.dist, eye.y - o.ty - Math.sin(pitch) * o.dist, eye.z - o.tz - Math.cos(o.yaw) * cp * o.dist);
    maxError = Math.max(maxError, error); samples++;
    BL.math.mat4.lookAt(view, eye, B.camera.target, B.camera.up || { x: 0, y: 1, z: 0 });
    if ((!view.every(Number.isFinite) || B.pilot.player || B.pilot.mode !== "orbit" || error > 1e-5) && failures.length < 8) failures.push({ kind: "free orbit", error, mode: B.pilot.mode, eye: { ...eye } });
  };
  const tick = (seconds) => { for (let n = 0; n < Math.ceil(seconds / dt); n++) { scene.update(dt, time += dt); inspect(); } };
  B.pilot.navigate({ position: target, target, yaw, pitch: 0, dist: 6 }); tick(0.5);
  BL.scene.updateWorld(scene.root); B.renderer.render(scene.root, B.camera, B.renderOpts); scene.overlay(0);
  const initial = { targetError: Math.hypot(B.pilot.orbit.tx - target.x, B.pilot.orbit.ty - target.y, B.pilot.orbit.tz - target.z), targetSolid: island.solidAt(B.pilot.orbit.tx, B.pilot.orbit.ty, B.pilot.orbit.tz), eyeSolid: island.solidAt(B.camera.position.x, B.camera.position.y, B.camera.position.z), ...B.headquarters.cameraCover };
  const before = { x: B.pilot.orbit.tx, y: B.pilot.orbit.ty, z: B.pilot.orbit.tz };
  window.dispatchEvent(new KeyboardEvent("keydown", { key: "d" })); tick(0.2); window.dispatchEvent(new KeyboardEvent("keyup", { key: "d" })); tick(0.5);
  const movement = Math.hypot(B.pilot.orbit.tx - before.x, B.pilot.orbit.ty - before.y, B.pilot.orbit.tz - before.z);
  for (const pitch of [-Math.PI / 2, Math.PI / 2, 0]) {
    B.pilot.hooks.onOrbit(0, (pitch - B.pilot.orbit.tPitch) / 0.0035);
    for (let n = 0; n < 120 && Math.abs(B.pilot.orbit.pitch - B.pilot.orbit.tPitch) > 1e-8; n++) tick(dt);
    rows.push({ requested: pitch, chosen: B.pilot.orbit.tPitch, view: B.pilot.viewPitch, distance: Math.hypot(B.camera.position.x - B.pilot.orbit.tx, B.camera.position.y - B.pilot.orbit.ty, B.camera.position.z - B.pilot.orbit.tz), selectedDistance: B.pilot.orbit.tDist });
  }
  B.pilot.enterClose();
  for (let n = 0; n < 60; n++) scene.update(dt, time += dt);
  B.pilot.hooks.onOrbit(120, -100);
  for (let n = 0; n < 60; n++) scene.update(dt, time += dt);
  const basis = () => {
    const p = B.camera.position, t = B.camera.target, length = Math.hypot(t.x - p.x, t.y - p.y, t.z - p.z);
    BL.math.mat4.lookAt(view, p, t, B.camera.up || { x: 0, y: 1, z: 0 });
    return { direction: [(t.x - p.x) / length, (t.y - p.y) / length, (t.z - p.z) / length], up: [view[1], view[5], view[9]] };
  };
  const exitBasis = basis(), exitEye = { ...B.camera.position }, dot = (a, b) => a.reduce((sum, v, i) => sum + v * b[i], 0);
  const exit = { firstPerson: B.pilot.mode === "eye-level", forwardDot: 1, upDot: 1, rayError: 0 };
  document.getElementById("scene").dispatchEvent(new WheelEvent("wheel", { deltaY: 60, cancelable: true }));
  for (let n = 0; n < 60; n++) {
    scene.update(dt, time += dt);
    const current = basis(), p = B.camera.position, delta = [p.x - exitEye.x, p.y - exitEye.y, p.z - exitEye.z], along = dot(delta, exitBasis.direction);
    exit.forwardDot = Math.min(exit.forwardDot, dot(current.direction, exitBasis.direction));
    exit.upDot = Math.min(exit.upDot, dot(current.up, exitBasis.up));
    exit.rayError = Math.max(exit.rayError, Math.hypot(...delta.map((v, i) => v - exitBasis.direction[i] * along)));
  }
  exit.mode = B.pilot.mode; exit.unpossessed = !B.pilot.player;
  return { backend: B.renderer.kind, initial, movement, rows, samples, maxError, failures, exit };
};

export const cameraEntryTrajectoryProbe = () => {
  const B = window.__ooga, BL = window.BL, scene = BL.scenes.hub, cave = [...B.cavemen.values()].find((c) => c.state === "working"), canvas = document.getElementById("scene"), rows = [];
  let time = B.renderOpts.matrix.time;
  const update = (dt) => { scene.update(dt, time += dt); BL.scene.updateWorld(scene.root); };
  B.pilot.possess(cave);
  const cases = [1 / 120, 1 / 20].flatMap((dt) => [0.3, 0.6, 0.9].map((pitch) => ({ dt, pitch })));
  cases.push({ dt: 1 / 120, pitch: 0.6, ramp: "main" }, { dt: 1 / 20, pitch: 0.6, ramp: "basement" });
  for (const fixture of cases) {
    const { dt, pitch } = fixture;
    document.querySelector('nav[data-scene="hub"] [data-preset="pile"]').click();
    for (let n = 0; n < Math.ceil(0.5 / dt); n++) update(dt);
    const p = cave.root.position;
    let position = { x: p.x, y: p.y - cave.baseY, z: p.z };
    if (fixture.ramp) {
      const H = B.island.headquarters, level = fixture.ramp === "basement" ? H.basement : H, ramp = level.ramps[0], sample = ramp.samples[Math.floor(ramp.samples.length / 2)];
      position = { x: sample.x, y: B.island.supportAt(sample.x, sample.z, sample.y, 0.3, -120), z: sample.z };
      B.pilot.enterClose(); B.pilot.navigate({ position, yaw: -Math.PI, pitch: 0, dist: 6 });
      for (let n = 0; n < Math.ceil(0.8 / dt); n++) update(dt);
      canvas.dispatchEvent(new WheelEvent("wheel", { deltaY: 60, cancelable: true }));
      for (let n = 0; n < Math.ceil(1 / dt); n++) update(dt);
    }
    B.pilot.navigate({ position, yaw: -Math.PI, pitch: 0, dist: 6 });
    if (fixture.ramp) for (let n = 0; n < Math.ceil(1.5 / dt); n++) update(dt);
    B.pilot.hooks.onOrbit((-Math.PI - 2.1) / 0.004, pitch / 0.0035);
    for (let n = 0; n < Math.ceil(0.6 / dt); n++) update(dt);
    const frames = [], snapshot = (phase) => {
      const eye = B.camera.position, target = B.camera.target, head = cave.parts.head.world, o = B.pilot.orbit;
      frames.push({ phase, eye: [eye.x, eye.y, eye.z], target: [target.x, target.y, target.z], root: [p.x, p.y, p.z], head: [head[12], head[13], head[14]], hop: cave.hop, viewLift: cave.viewLift, mix: B.pilot.closeMix, wanted: B.pilot.closeWanted, angleHold: B.pilot.preserveExitAngle, dist: o.dist, chosen: o.tDist, pitch: o.pitch, yaw: o.yaw, camera: B.cameraCave.index, access: B.cameraCave.accessRamp, assist: B.cameraCave.rampAssist, transitioning: B.cameraCave.transitioning });
    };
    snapshot("initial");
    for (let n = 0; n < 20 && !B.pilot.closeWanted; n++) { canvas.dispatchEvent(new WheelEvent("wheel", { deltaY: -60, cancelable: true })); update(dt); snapshot("wheel in"); }
    for (let n = 0; n < Math.ceil(1 / dt); n++) { update(dt); snapshot("enter"); }
    canvas.dispatchEvent(new WheelEvent("wheel", { deltaY: 60, cancelable: true }));
    for (let n = 0; n < Math.ceil(1 / dt); n++) { update(dt); snapshot("exit"); }
    const steps = [], metrics = { maximumSpeed: 0, maximumAcceleration: 0, minimumDirectionDot: 1, maximumRelativeChange: 0, motionChecks: 0, bodyMovement: 0, eyeViolations: 0, firstPerson: false, firstPersonHeadGap: Infinity };
    for (let n = 1; n < frames.length; n++) steps.push({ n, distance: Math.hypot(...frames[n].eye.map((v, i) => v - frames[n - 1].eye[i])) });
    for (let n = 1; n < frames.length; n++) {
      const f = frames[n], prior = frames[n - 1], delta = f.eye.map((v, i) => v - prior.eye[i]), distance = Math.hypot(...delta);
      metrics.maximumSpeed = Math.max(metrics.maximumSpeed, distance / dt);
      metrics.bodyMovement = Math.max(metrics.bodyMovement, Math.hypot(...f.root.map((v, i) => v - frames[0].root[i])));
      if (f.wanted && !f.transitioning && !B.island.clearAt(f.eye[0], f.eye[1] - 0.3, f.eye[2], 0.3, 0.6)) metrics.eyeViolations++;
      if (f.wanted && f.mix === 1) { metrics.firstPerson = true; metrics.firstPersonHeadGap = Math.min(metrics.firstPersonHeadGap, Math.hypot(...f.eye.map((v, i) => v - f.head[i]))); }
      if (n < 2 || !f.wanted && f.phase !== "exit") continue;
      const before = prior.eye.map((v, i) => v - frames[n - 2].eye[i]), previousDistance = Math.hypot(...before);
      metrics.maximumAcceleration = Math.max(metrics.maximumAcceleration, Math.hypot(...delta.map((v, i) => v - before[i])) / dt / dt);
      if (previousDistance < 0.005 || distance < 0.005) continue;
      metrics.motionChecks++;
      metrics.minimumDirectionDot = Math.min(metrics.minimumDirectionDot, delta.reduce((sum, v, i) => sum + v * before[i], 0) / distance / previousDistance);
      metrics.maximumRelativeChange = Math.max(metrics.maximumRelativeChange, Math.hypot(...delta.map((v, i) => v - before[i])) / previousDistance);
    }
    steps.sort((a, b) => b.distance - a.distance);
    let reversals = null;
    if (!fixture.ramp && dt === 1 / 120 && pitch === 0.6 || fixture.ramp === "basement") {
      reversals = { events: 0, maximumJump: 0, minimumForwardDot: 1, positiveFrames: 0, maximumSpeed: 0, maximumAcceleration: 0, accelerationAt: null, discontinuities: [] };
      let previousEye = { ...B.camera.position }, previousDelta = null;
      const advance = () => {
        update(dt);
        const eye = B.camera.position, delta = [eye.x - previousEye.x, eye.y - previousEye.y, eye.z - previousEye.z];
        reversals.positiveFrames++;
        reversals.maximumSpeed = Math.max(reversals.maximumSpeed, Math.hypot(...delta) / dt);
        if (previousDelta) {
          const acceleration = Math.hypot(...delta.map((v, i) => v - previousDelta[i])) / dt / dt;
          if (acceleration > reversals.maximumAcceleration) {
            reversals.maximumAcceleration = acceleration;
            reversals.accelerationAt = { frame: reversals.positiveFrames, event: reversals.events, previous: previousEye, eye: { ...eye }, previousDelta, delta, mix: B.pilot.closeMix, wanted: B.pilot.closeWanted, dist: B.pilot.orbit.dist, chosen: B.pilot.orbit.tDist };
          }
        }
        previousEye = { ...eye }; previousDelta = delta;
      };
      const event = (deltaY) => {
        const eye = { ...B.camera.position }, target = B.camera.target, direction = [target.x - eye.x, target.y - eye.y, target.z - eye.z], length = Math.hypot(...direction);
        const before = { mix: B.pilot.closeMix, wanted: B.pilot.closeWanted, angleHold: B.pilot.preserveExitAngle, assist: B.cameraCave.rampAssist, transitioning: B.cameraCave.transitioning, dist: B.pilot.orbit.dist, chosen: B.pilot.orbit.tDist };
        for (let i = 0; i < 3; i++) direction[i] /= length;
        canvas.dispatchEvent(new WheelEvent("wheel", { deltaY, cancelable: true })); update(0);
        const p = B.camera.position, t = B.camera.target, next = [t.x - p.x, t.y - p.y, t.z - p.z], nextLength = Math.hypot(...next);
        reversals.events++;
        const jump = Math.hypot(p.x - eye.x, p.y - eye.y, p.z - eye.z);
        reversals.maximumJump = Math.max(reversals.maximumJump, jump);
        if (jump > 1e-5) reversals.discontinuities.push({ deltaY, eye, next: { ...p }, before, after: { mix: B.pilot.closeMix, wanted: B.pilot.closeWanted, angleHold: B.pilot.preserveExitAngle, assist: B.cameraCave.rampAssist, transitioning: B.cameraCave.transitioning, dist: B.pilot.orbit.dist, chosen: B.pilot.orbit.tDist } });
        reversals.minimumForwardDot = Math.min(reversals.minimumForwardDot, direction.reduce((sum, v, i) => sum + v * next[i] / nextLength, 0));
        advance();
      };
      for (let n = 0; n < 10 && !B.pilot.closeWanted; n++) event(-60);
      for (let n = 0; n < 3; n++) advance();
      event(60); for (let n = 0; n < 3; n++) advance();
      for (let n = 0; n < 10 && !B.pilot.closeWanted; n++) event(-60);
      for (let n = 0; n < 3; n++) advance();
      event(60);
      for (let n = 0; n < Math.ceil(1 / dt); n++) advance();
    }
    rows.push({ dt, pitch, ramp: fixture.ramp || null, frames, worst: steps.slice(0, 8), metrics, reversals });
  }
  return { rows };
};

// Two otherwise identical pilots must enter from the same view even when one
// carried camera velocity before possession invalidated its motion history.
export const cameraMotionResetProbe = () => {
  const BL = window.BL, rows = [];
  const make = () => {
    const camera = BL.scene.createCamera(), root = BL.scene.createNode(), rotation = BL.math.quat.create();
    BL.math.quat.fromEuler(rotation, -Math.PI / 2 + 0.25, 0, 0);
    root.quaternion = rotation; root.position.y = 0.5;
    const head = BL.scene.createNode({ geometry: BL.models.box({ w: 0.4, h: 0.4, d: 0.4, color: "#ffffff" }) });
    BL.scene.addChild(root, head);
    const cave = { root, parts: { head }, camp: { burning: false, seat: null }, traits: { name: "fixture" }, sleepHead: { x: 0, y: 0.65, z: 0 }, state: "sleeping", bedroll: { sleep: {} }, baseY: 0.3, hop: 0, hopV: 0, leap: { vx: 0, vz: 0 }, jet: null, jetFuel: 1 };
    let player = null;
    const crew = { get player() { return player; }, get sleeping() { return !!player; }, control(c) { player = c; return true; }, release() { player = null; }, elevate() {}, look() {}, steer() {}, playerAction() { return true; } };
    const view = { yaw: 0.75, pitch: 0.8, dist: 6, target: { x: 0, y: 0.65, z: 0 } };
    const hud = { el: { act: document.createElement("button") }, setJetpack() {}, setAct() {}, tooltip: { hide() {} }, hint() {}, toast() {} };
    const pilot = BL.pilot.create({ renderer: { size: { width: 1440, height: 900 } }, canvas: document.createElement("canvas"), camera, hud, presets: { pile: view }, landing: "pile", pitch: [-0.5, 1.5], dist: [0.5, 20], follow: { y: 0.9, min: 4, max: 10, pitch: [0.25, 0.8] }, fly: {}, clampTarget() {}, clampCamera() { return false; }, close: { eyeHeight: 1.1, eyeForward: 0.16, eyeRatio: 0.95, pitch: [-1.35, 1.35], trailingDist: 6, orbitDist: 6, maxStep: 0.6, groundAt: () => 0 } });
    pilot.bind({ crew, fx: { say() {} } });
    return { pilot, camera, cave };
  };
  for (const dt of [1 / 20, 1 / 120]) {
    const a = make(), b = make(), pair = [a, b];
    const distance = () => Math.hypot(a.camera.position.x - b.camera.position.x, a.camera.position.y - b.camera.position.y, a.camera.position.z - b.camera.position.z);
    try {
      for (const f of pair) f.pilot.update(0);
      a.pilot.hooks.onOrbit(-250, 0); a.pilot.update(dt);
      b.pilot.orbit.yaw = a.pilot.orbit.yaw; b.pilot.orbit.tYaw = a.pilot.orbit.tYaw; b.pilot.update(0);
      for (const f of pair) { f.pilot.possess(f.cave); f.pilot.update(dt); }
      const before = distance();
      for (const f of pair) f.pilot.enterClose();
      let maximumSeparation = 0, firstStep = 0, finite = true, samples = 0;
      for (let i = 0; i < Math.ceil(1 / dt); i++) {
        for (const f of pair) f.pilot.update(dt);
        const separation = distance();
        if (!i) firstStep = separation;
        maximumSeparation = Math.max(maximumSeparation, separation); samples++;
        for (const f of pair) finite = finite && Object.values(f.camera.position).every(Number.isFinite) && Object.values(f.camera.target).every(Number.isFinite);
      }
      rows.push({ dt, before, firstStep, maximumSeparation, finite, samples, entered: pair.every((f) => f.pilot.closeMix === 1 && f.pilot.mode === "first-person" && f.pilot.player === f.cave) });
    } finally { for (const f of pair) f.pilot.dispose(); }
  }
  return { rows };
};
