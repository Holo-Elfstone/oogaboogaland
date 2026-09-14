// Exercise the rendered camera basis through real sleep, scroll and key actions.
// In particular, opposed head/world up vectors must never cancel mid-transition.
export const sleepOrientationProbe = () => {
  const B = window.__ooga, BL = window.BL, scene = BL.scenes.hub;
  const cave = [...B.cavemen.values()].find((c) => c.state === "working"), bed = B.headquarters.mattresses.find((b) => !b.sleeper);
  const canvas = document.getElementById("scene"), matrix = BL.math.mat4.create(), worldUp = { x: 0, y: 1, z: 0 }, forward = new Float64Array(3);
  const rows = [], awakeEntries = [], failures = [], dt = 1 / 120;
  let time = B.renderOpts.matrix.time, samples = 0, previous = null, minRightDot = 1, physicalChecks = 0, phase = "setup";
  const key = (value, down) => window.dispatchEvent(new KeyboardEvent(down ? "keydown" : "keyup", { key: value }));
  const basis = () => {
    const camera = B.camera, p = camera.position, t = camera.target, up = camera.up || worldUp;
    const direction = [t.x - p.x, t.y - p.y, t.z - p.z], length = Math.hypot(...direction);
    for (let i = 0; i < 3; i++) direction[i] /= length;
    BL.math.mat4.lookAt(matrix, p, t, up);
    const right = [matrix[0], matrix[4], matrix[8]];
    const finite = matrix.every(Number.isFinite) && Math.abs(Math.hypot(...right) - 1) < 1e-5 && Math.abs(Math.hypot(up.x, up.y, up.z) - 1) < 1e-5;
    const orthogonal = !camera.up || Math.abs(direction[0] * up.x + direction[1] * up.y + direction[2] * up.z) < 1e-5;
    if ((!finite || !orthogonal) && failures.length < 12) failures.push({ kind: "camera basis", finite, orthogonal, mix: B.pilot.closeMix });
    return { direction, right, up: [matrix[1], matrix[5], matrix[9]] };
  };
  const dot = (a, b) => a.reduce((sum, v, i) => sum + v * b[i], 0);
  const step = (check = true) => {
    scene.update(dt, time += dt);
    const now = basis();
    if (check) {
      samples++;
      if (previous) {
        const value = dot(now.right, previous.right);
        minRightDot = Math.min(minRightDot, value);
        if (value < 0.9 && failures.length < 12) failures.push({ kind: "orientation jump", phase, dot: value, mix: B.pilot.closeMix, pose: cave.bedTravel.pose, previous, now });
      }
      if (B.pilot.closeMix === 1) {
        physicalChecks++;
        const p = B.camera.position;
        if (!B.island.clearAt(p.x, p.y - 0.09, p.z, 0.09, 0.18) && failures.length < 12) failures.push({ kind: "first-person eye in rock", x: p.x, y: p.y, z: p.z });
      }
    }
    previous = now;
    return now;
  };
  const tick = (seconds, check = true) => { for (let i = 0; i < Math.ceil(seconds / dt); i++) step(check); };
  const press = (value) => { key(value, true); key(value, false); };
  const wheel = (deltaY) => canvas.dispatchEvent(new WheelEvent("wheel", { deltaY, cancelable: true }));
  const scrollIn = () => {
    let before = basis();
    for (let n = 0; n < 16 && !B.pilot.closeWanted; n++) { before = basis(); wheel(-60); step(); }
    tick(0.8);
    return before;
  };
  const scrollOut = () => {
    const before = basis(), eye = { ...B.camera.position }, body = { ...cave.root.position };
    let forwardDot = 1, upDot = 1, rayError = 0;
    previous = before; wheel(60);
    for (let n = 0; n < Math.ceil(0.8 / dt); n++) {
      const now = step(), p = B.camera.position, delta = [p.x - eye.x, p.y - eye.y, p.z - eye.z], along = dot(delta, before.direction);
      forwardDot = Math.min(forwardDot, dot(now.direction, before.direction));
      upDot = Math.min(upDot, dot(now.up, before.up));
      rayError = Math.max(rayError, Math.hypot(...delta.map((v, i) => v - before.direction[i] * along)));
    }
    return { forwardDot, upDot, rayError, lookY: before.direction[1], eyeDeltaY: B.camera.position.y - eye.y, bodyMovement: Math.hypot(cave.root.position.x - body.x, cave.root.position.y - body.y, cave.root.position.z - body.z), mode: B.pilot.mode };
  };
  B.pilot.possess(cave);
  try {
    for (const [pose, input] of [["left", "d"], ["right", "a"], ["stomach", "w"], ["back", "s"]]) {
      if (B.crew.sleeping) B.crew.wakePlayer();
      B.pilot.enterClose();
      B.pilot.navigate({ position: { x: bed.x, y: bed.y + bed.sleep.surface, z: bed.z }, yaw: bed.node.rotation.y, pitch: 0, dist: 4 });
      tick(0.2, false);
      const sleepLabel = document.getElementById("act").textContent;
      press(" "); tick(1.1, false);
      key(input, true); tick(0.7, false); key(input, false);
      wheel(60); tick(0.8, false);
      B.pilot.hooks.onOrbit(340, -80); tick(0.4, false);
      previous = basis();
      phase = "first scroll in";
      const approach = scrollIn();
      BL.math.quat.rotateVec(forward, cave.root.quaternion, 0, 0, 1);
      const entered = basis(), entryDot = dot(entered.direction, approach.direction), entryUpDot = dot(entered.up, approach.up), approachFaceDot = dot(approach.direction, forward);
      const asleep = B.crew.sleeping && cave.bedTravel.pose === pose && bed.sleeper === cave;
      // Add a substantial head-relative look before scrolling back out.
      B.pilot.hooks.onOrbit(180, -240); tick(0.5, false);
      phase = "scroll out with relative look";
      const exit = scrollOut();
      phase = "second scroll in"; previous = null; scrollIn();
      const beforeRelease = basis();
      phase = "release";
      press("Escape"); const afterRelease = step();
      const released = !B.pilot.player && cave.state === "sleeping" && bed.sleeper === cave, releaseDot = dot(beforeRelease.direction, afterRelease.direction);
      tick(0.7);
      B.pilot.hooks.onDoubleTap({ owner: { kind: "caveman", cave } });
      tick(0.8, false);
      const beforeWake = basis(), wakeLabel = document.getElementById("act").textContent;
      phase = "wake";
      press(" "); const afterWake = step();
      const wakeDot = dot(beforeWake.direction, afterWake.direction), awake = !B.crew.sleeping && !bed.sleeper && B.pilot.player === cave;
      tick(0.8);
      rows.push({ pose, sleepLabel, wakeLabel, asleep, entryDot, entryUpDot, approachFaceDot, exit, released, releaseDot, awake, wakeDot });
    }
    // The same entry contract applies to upright characters, including a view
    // approaching from the side rather than their authored forward direction.
    document.querySelector('nav[data-scene="hub"] [data-preset="pile"]').click(); tick(0.5, false);
    for (const [yaw, pitch] of [[0.85, -0.35], [-1.2, 0.6]]) {
      wheel(60); tick(0.8, false);
      B.pilot.hooks.onOrbit(yaw / 0.004, (pitch - B.pilot.orbit.tPitch) / 0.0035); tick(0.6, false);
      phase = "awake entry"; previous = basis();
      const approach = scrollIn(), entered = basis();
      const row = { entryDot: dot(entered.direction, approach.direction), entryUpDot: dot(entered.up, approach.up), mode: B.pilot.mode, selected: B.pilot.player === cave, sleeping: B.crew.sleeping };
      phase = "awake exit"; row.exit = scrollOut(); awakeEntries.push(row);
    }
  } finally { for (const value of [" ", "Escape", "w", "a", "s", "d"]) key(value, false); }
  return { backend: B.renderer.kind, rows, awakeEntries, samples, physicalChecks, minRightDot, failures };
};
