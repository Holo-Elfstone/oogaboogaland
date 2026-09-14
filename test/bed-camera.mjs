// Walk onto every bed, turn through the sleeping poses and orbit each room.
// Waking must sweep from the lying eye even when its head anchor changes.
export const bedCameraProbe = ({ dt = 1 / 20 } = {}) => {
  const B = window.__ooga, BL = window.BL, scene = BL.scenes.hub, beds = B.headquarters.mattresses;
  const entries = [...B.cavemen.values()], cave = entries.find((c) => c.state === "working"), held = new Set(), failures = [], rows = [], scrolls = [];
  const view = BL.math.mat4.create(), up = { x: 0, y: 1, z: 0 }, canvas = document.getElementById("scene");
  let time = B.renderOpts.matrix.time, checks = 0, physicalChecks = 0, rawChecks = 0, previous = null, previousRestricted = false;
  for (const c of entries) c.override = "working";
  B.refreshStates(true);
  B.pilot.possess(cave);
  // Independently measure the rendered pad and pillow boxes. Their physical
  // eye clearance must agree with the actual fabric, including the case sides.
  const solids = beds.map((bed) => {
    const geometry = bed.node.geometry, boxes = [];
    for (const kind of [undefined, "sheet", "pillow"]) {
      const box = [Infinity, Infinity, Infinity, -Infinity, -Infinity, -Infinity];
      for (const face of geometry.faces) if (face.mattressFabric === kind) for (const index of face.i) {
        for (let axis = 0; axis < 3; axis++) {
          const value = geometry.verts[index * 3 + axis];
          box[axis] = Math.min(box[axis], value);
          box[axis + 3] = Math.max(box[axis + 3], value);
        }
      }
      boxes.push(box);
    }
    return { bed, boxes };
  });
  const keys = (next) => {
    for (const key of held) if (!next.includes(key)) { window.dispatchEvent(new KeyboardEvent("keyup", { key })); held.delete(key); }
    for (const key of next) if (!held.has(key)) { window.dispatchEvent(new KeyboardEvent("keydown", { key })); held.add(key); }
  };
  const bedClear = (x, y, z, toX, toY, toZ, radius, height) => {
    for (const { bed, boxes } of solids) {
      const lx = (x - bed.x) * bed.cr - (z - bed.z) * bed.sr, lz = (x - bed.x) * bed.sr + (z - bed.z) * bed.cr;
      const dx = (toX - x) * bed.cr - (toZ - z) * bed.sr, dz = (toX - x) * bed.sr + (toZ - z) * bed.cr;
      for (const box of boxes) if (!BL.terrain.segmentBoxClear(lx, y - bed.y, lz, dx, toY - y, dz, radius, height, ...box)) return false;
    }
    return true;
  };
  const step = (check = true) => {
    scene.update(dt, time += dt);
    if (!check) return;
    checks++;
    const eye = B.camera.position, p = cave.root.position, feet = p.y - cave.baseY;
    const restricted = B.pilot.closeMix > 0 && !B.pilot.preserveExitAngle && !B.cameraCave.transitioning;
    if (restricted) physicalChecks++;
    BL.math.mat4.lookAt(view, eye, B.camera.target, B.camera.up || up);
    const finite = view.every(Number.isFinite) && [0, 1, 2].every((axis) => Math.hypot(view[axis], view[axis + 4], view[axis + 8]) > 0.99);
    const eyeClear = !restricted || bedClear(eye.x, eye.y - 0.3, eye.z, eye.x, eye.y - 0.3, eye.z, 0.3, 0.6) && B.island.clearAt(eye.x, eye.y - 0.3, eye.z, 0.3, 0.6);
    const bedSweep = !restricted || !previousRestricted || !previous || bedClear(previous.x, previous.y - 0.3, previous.z, eye.x, eye.y - 0.3, eye.z, 0.3, 0.6);
    const terrainSweep = !restricted || !previousRestricted || !previous || B.island.voxelSegmentClearAt(previous.x, previous.y - 0.3, previous.z, eye.x, eye.y - 0.3, eye.z, 0.3, 0.6);
    let raw = true;
    if (B.pilot.closeMix === 0 && !B.cameraCave.transitioning) {
      const o = B.pilot.orbit, pitch = B.pilot.viewPitch, cp = Math.cos(pitch);
      rawChecks++;
      raw = Math.hypot(eye.x - o.tx - Math.sin(o.yaw) * cp * o.dist, eye.y - o.ty - Math.sin(pitch) * o.dist, eye.z - o.tz - Math.cos(o.yaw) * cp * o.dist) < 1e-4;
    }
    const body = B.crew.sleeping || bedClear(p.x, feet + 1e-5, p.z, p.x, feet + 1e-5, p.z, 0.3, cave.bodyHeight - 1e-5) && B.island.clearAt(p.x, feet + 1e-5, p.z, 0.3, cave.bodyHeight - 1e-5);
    if ((!finite || !eyeClear || !bedSweep || !terrainSweep || !body || !raw) && failures.length < 15) failures.push({ room: cave.bedroll?.roomIndex, basement: cave.bedroll?.basement, pose: cave.bedTravel.pose, mode: B.pilot.mode, finite, eyeClear, bedSweep, terrainSweep, body, raw, previous, eye: { ...eye }, feet });
    previous = { ...eye }; previousRestricted = restricted;
  };
  const seek = (x, z) => {
    const tolerance = Math.max(0.15, BL.pilot.WALK.speed * dt * 0.55);
    for (let i = 0; i < Math.ceil(2 / dt); i++) {
      const p = cave.root.position, dx = x - p.x, dz = z - p.z;
      if (Math.hypot(dx, dz) < tolerance) { keys([]); return true; }
      const o = B.pilot.orbit, right = dx * Math.cos(o.yaw) - dz * Math.sin(o.yaw), forward = -dx * Math.sin(o.yaw) - dz * Math.cos(o.yaw), next = [];
      if (Math.abs(right) > 0.1) next.push(right > 0 ? "d" : "a");
      if (Math.abs(forward) > 0.1) next.push(forward > 0 ? "w" : "s");
      B.pilot.hooks.onOrbit(0, 0);
      keys(next); step();
    }
    keys([]);
    return false;
  };
  try {
    for (const mode of ["trailing", "first-person"]) {
      for (const bed of beds) {
        // The low-level debug arrival does not seed the scene's camera
        // history. Start on the character's real face, then scroll outward
        // through clear air instead of staging an eye across a room wall.
        B.pilot.enterClose();
        B.pilot.navigate({ position: { ...bed.walkAt }, yaw: -bed.room.angle, pitch: 0.6, dist: 3.5 });
        for (let i = 0; i < 20; i++) step(false);
        if (mode === "trailing") {
          canvas.dispatchEvent(new WheelEvent("wheel", { deltaY: 60, cancelable: true }));
          for (let i = 0; i < 30; i++) step(false);
        }
        previous = null;
        const reached = seek(bed.x, bed.z);
        for (let i = 0; i < 5; i++) step();
        const standing = Math.abs(cave.root.position.y - cave.baseY - bed.y - bed.sleep.surface) < 1e-5, label = document.getElementById("act").textContent;
        keys([" "]); step(); keys([]);
        for (let i = 0; i < 25; i++) step();
        const sleeping = B.crew.sleeping;
        for (const key of ["a", "d", "w", "s"]) {
          keys([key]); step(); keys([]);
          for (let i = 0; i < 13; i++) step();
          if (bed === beds[0] && mode === "trailing" && (key === "a" || key === "s")) {
            for (let i = 0; i < 12 && !B.pilot.closeWanted; i++) { canvas.dispatchEvent(new WheelEvent("wheel", { deltaY: -60, cancelable: true })); step(); }
            for (let i = 0; i < 30; i++) step();
            const firstPerson = B.pilot.mode === "first-person";
            canvas.dispatchEvent(new WheelEvent("wheel", { deltaY: 60, cancelable: true }));
            for (let i = 0; i < 30; i++) step();
            for (let i = 0; i < Math.ceil(1 / dt) && Math.abs(B.pilot.orbit.dist - B.pilot.orbit.tDist) >= 1e-6; i++) step();
            scrolls.push({ pose: key, firstPerson, trailing: B.pilot.mode === "trailing", sleeping: B.crew.sleeping, chosen: B.pilot.orbit.tDist, actual: B.pilot.orbit.dist });
          }
          for (let angle = 0; angle < 4; angle++) {
            B.pilot.hooks.onOrbit(-Math.PI / 2 / 0.004, 0);
            for (let i = 0; i < 7; i++) step();
          }
        }
        keys([" "]); step(); keys([]);
        for (let i = 0; i < 15; i++) step();
        const woke = !B.crew.sleeping && B.pilot.player === cave && !bed.sleeper, exited = seek(bed.walkAt.x, bed.walkAt.z);
        for (let i = 0; i < 6; i++) step();
        rows.push({ room: bed.roomIndex, basement: bed.basement, mode, reached, standing, label, sleeping, woke, exited, exitDistance: Math.hypot(cave.root.position.x - bed.walkAt.x, cave.root.position.z - bed.walkAt.z), feet: cave.root.position.y - cave.baseY });
      }
    }
    return { rows, scrolls, checks, physicalChecks, rawChecks, failures };
  } finally { keys([]); }
};

// A rock-covered selected view must hand free movement a clear starting eye.
export const cameraReleaseProbe = () => {
  const B = window.__ooga, scene = window.BL.scenes.hub, canvas = document.getElementById("scene"), dt = 1 / 20;
  const cave = [...B.cavemen.values()].find((c) => c.state === "working"), rows = [];
  let time = B.renderOpts.matrix.time;
  const step = (count = 1) => { for (let i = 0; i < count; i++) scene.update(dt, time += dt); };
  const clear = (eye) => B.island.clearAt(eye.x, eye.y - 0.3, eye.z, 0.3, 0.6);
  for (const basement of [false, true]) {
    const bed = B.headquarters.mattresses.find((b) => b.basement === basement && !b.sleeper);
    B.pilot.possess(cave); B.pilot.enterClose();
    B.pilot.navigate({ position: { x: bed.x, y: bed.y + bed.sleep.surface, z: bed.z }, yaw: -bed.room.angle, pitch: 0, dist: 6 });
    step(15);
    if (basement) { window.dispatchEvent(new KeyboardEvent("keydown", { key: " " })); window.dispatchEvent(new KeyboardEvent("keyup", { key: " " })); step(25); }
    canvas.dispatchEvent(new WheelEvent("wheel", { deltaY: 60, cancelable: true })); step(25);
    let blocked = false;
    views: for (let turn = 0; turn < 8; turn++) for (const pitch of [1.55, 1.3, 1.1, 0.9, 0.7]) {
      const yaw = bed.room.angle + turn * Math.PI / 4;
      B.pilot.hooks.onOrbit((B.pilot.orbit.tYaw - yaw) / 0.004, (pitch - B.pilot.orbit.tPitch) / 0.0035); step(2);
      if (!clear(B.camera.position)) { blocked = true; break views; }
    }
    step(20);
    const wasSleeping = B.crew.sleeping;
    const beforeRelease = { ...B.camera.position };
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    const releasedEye = { ...B.camera.position };
    const releaseDelta = Math.hypot(releasedEye.x - beforeRelease.x, releasedEye.y - beforeRelease.y, releasedEye.z - beforeRelease.z);
    step(10);
    const stable = Math.hypot(B.camera.position.x - releasedEye.x, B.camera.position.y - releasedEye.y, B.camera.position.z - releasedEye.z);
    const freeCovered = !clear(B.camera.position), freeMode = B.pilot.mode;
    const beforeEntry = { ...B.camera.position };
    B.pilot.hooks.onZoom(0.1);
    const entryJump = Math.hypot(B.camera.position.x - beforeEntry.x, B.camera.position.y - beforeEntry.y, B.camera.position.z - beforeEntry.z);
    const entryTarget = { ...B.pilot.orbit.target };
    let entryFrames = 0, prematureFall = false;
    while (B.pilot.closeMix < 1 && entryFrames < 60) {
      step(); entryFrames++;
      if (B.pilot.closeMix < 1 && B.pilot.freeFalling) prematureFall = true;
    }
    const entryError = Math.hypot(B.camera.position.x - entryTarget.x, B.camera.position.y - entryTarget.y, B.camera.position.z - entryTarget.z);
    const recovered = { ...B.camera.position }, recoveredClear = clear(recovered);
    let entryPhysical = recoveredClear, entryPrevious = { ...recovered };
    for (let i = 0; i < 15; i++) {
      step(); const eye = B.camera.position;
      entryPhysical = entryPhysical && clear(eye) && B.island.voxelSegmentClearAt(entryPrevious.x, entryPrevious.y - 0.3, entryPrevious.z, eye.x, eye.y - 0.3, eye.z, 0.3, 0.6);
      entryPrevious = { ...eye };
    }
    let physical = recoveredClear, movement = 0, previous = { ...B.camera.position };
    for (const key of ["a", "d"]) {
      window.dispatchEvent(new KeyboardEvent("keydown", { key }));
      for (let i = 0; i < 5; i++) {
        step(); const eye = B.camera.position;
        physical = physical && clear(eye) && B.island.voxelSegmentClearAt(previous.x, previous.y - 0.3, previous.z, eye.x, eye.y - 0.3, eye.z, 0.3, 0.6);
        movement += Math.hypot(eye.x - previous.x, eye.y - previous.y, eye.z - previous.z); previous = { ...eye };
      }
      window.dispatchEvent(new KeyboardEvent("keyup", { key }));
    }
    rows.push({ basement, blocked, wasSleeping, keptSleeping: !wasSleeping || cave.state === "sleeping" && bed.sleeper === cave, released: B.pilot.player === null, releaseDelta, freeCovered, freeMode, entryJump, entryFrames, prematureFall, entryError, recoveredClear, entryPhysical, mode: B.pilot.mode, stable, movement, physical });
  }
  return { rows };
};

// Every trailing distance keeps the same chosen orbit while the Ooga walks
// on either real ramp. First-person navigation is exercised separately.
export const rampZoomProbe = ({ dt = 1 / 20 } = {}) => {
  const B = window.__ooga, scene = window.BL.scenes.hub, canvas = document.getElementById("scene"), H = B.island.headquarters;
  const cave = [...B.cavemen.values()].find((c) => c.state === "working"), rows = [], failures = [];
  let time = B.renderOpts.matrix.time, bodyChecks = 0, rawChecks = 0, maximumRawError = 0, route = null;
  const rawError = () => {
    const o = B.pilot.orbit, eye = B.camera.position, pitch = B.pilot.viewPitch, cp = Math.cos(pitch);
    return Math.hypot(eye.x - o.tx - Math.sin(o.yaw) * cp * o.dist, eye.y - o.ty - Math.sin(pitch) * o.dist, eye.z - o.tz - Math.cos(o.yaw) * cp * o.dist);
  };
  const step = (count = 1) => {
    for (let i = 0; i < count; i++) {
      scene.update(dt, time += dt);
      const p = cave.root.position, feet = p.y - cave.baseY;
      bodyChecks++;
      // A sloping floor intersects the horizontal cylinder's lowest corners;
      // the walker steps that foot band while its torso/head stay fully clear.
      if (!B.island.clearAt(p.x, feet + 0.3, p.z, 0.3, cave.bodyHeight - 0.3) && failures.length < 8) failures.push({ kind: "body", x: p.x, y: feet, z: p.z });
      if (B.pilot.closeMix === 0 && !B.pilot.preserveExitAngle) { rawChecks++; maximumRawError = Math.max(maximumRawError, rawError()); }
    }
  };
  const read = () => {
    const o = B.pilot.orbit, eye = B.camera.position, p = cave.root.position, feet = p.y - cave.baseY;
    const onRamp = route.samples.some((point) => Math.hypot(point.x - p.x, point.z - p.z) < route.width / 2 && Math.abs(point.y - feet) < 0.4);
    return { chosen: o.tDist, distance: o.dist, onRamp, rawError: rawError(), actualDistance: Math.hypot(eye.x - o.tx, eye.y - o.ty, eye.z - o.tz), chosenPitch: o.tPitch, pitch: B.pilot.viewPitch, chosenYaw: o.tYaw, yaw: o.yaw, eyeClear: B.island.clearAt(eye.x, eye.y - 0.3, eye.z, 0.3, 0.6) };
  };
  const settle = () => {
    for (let i = 0; i < Math.ceil(3 / dt); i++) {
      step(); const o = B.pilot.orbit;
      if (B.pilot.closeMix === 0 && Math.abs(o.dist - o.tDist) < 1e-7 && Math.abs(o.pitch - o.tPitch) < 1e-7 && Math.abs(o.yaw - o.tYaw) < 1e-7) break;
    }
  };
  const zoom = (distance) => { B.pilot.hooks.onZoom(distance / B.pilot.orbit.tDist); settle(); return read(); };
  const move = () => {
    const before = { ...cave.root.position };
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "w" }));
    for (let i = 0; i < Math.ceil(0.1 / dt); i++) { B.pilot.hooks.onOrbit(0, 0); step(); }
    window.dispatchEvent(new KeyboardEvent("keyup", { key: "w" }));
    const moved = Math.hypot(cave.root.position.x - before.x, cave.root.position.z - before.z);
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "s" }));
    for (let i = 0; i < Math.ceil(0.1 / dt); i++) { B.pilot.hooks.onOrbit(0, 0); step(); }
    window.dispatchEvent(new KeyboardEvent("keyup", { key: "s" }));
    return moved;
  };
  for (const basement of [false, true]) {
    const ramp = (basement ? H.basement.ramps : H.ramps)[0], floor = basement ? (H.floor + H.basement.floor) / 2 : H.floor / 2;
    route = ramp;
    const sample = ramp.samples.reduce((best, p) => Math.abs(p.y - floor) < Math.abs(best.y - floor) ? p : best);
    const y = B.island.supportAt(sample.x, sample.z, sample.y, 0.6, -120, 0.3);
    B.pilot.possess(cave); B.pilot.enterClose();
    B.pilot.navigate({ position: { x: sample.x, y, z: sample.z }, yaw: 0.4, pitch: 0.3, dist: 6 });
    step(Math.ceil(0.7 / dt));
    canvas.dispatchEvent(new WheelEvent("wheel", { deltaY: 60, cancelable: true })); step(Math.ceil(0.7 / dt));
    settle();
    // End the separately tested exit dolly at a supported pose before testing
    // ordinary orbit controls. The real follow target remains attached.
    B.pilot.navigate({ position: { x: sample.x, y, z: sample.z }, yaw: 0.4, pitch: 0.3, dist: 6 });
    B.pilot.hooks.onOrbit(0, (0.4 - B.pilot.orbit.tPitch) / 0.0035); settle();
    const wide = zoom(16), movedWide = move(), close = zoom(6), movedClose = move(), nearest = zoom(4), wideAgain = zoom(16), atLimit = zoom(8), aboveLimit = zoom(8.01);
    rows.push({ basement, wide, close, nearest, wideAgain, atLimit, aboveLimit, movedWide, movedClose });
  }
  return { rows, bodyChecks, rawChecks, maximumRawError, failures };
};
