// Jump off the actual upper rim, fall outside the rock, then steer through an
// existing window. After the initial placement, movement uses production input.
export const windowJumpProbe = ({ basement = false, mode = "first-person", dt = 1 / 60, jet = false, roomIndex = null, exit = false, offset = 0 } = {}) => {
  const B = window.__ooga, scene = window.BL.scenes.hub, H = B.island.headquarters, island = B.island;
  const cave = B.cavemen.get("w-s-bitcoin"), level = basement ? H.basement : H;
  const room = basement || roomIndex !== null ? level.rooms.find((r) => roomIndex === null || r.index === roomIndex) : null;
  const aperture = H.windows.find((w) => room ? w.kind === "room" && w.roomIndex === room.index && !!w.basement === basement : w.kind === "panorama");
  const sx = Math.sin(aperture.angle), sz = -Math.cos(aperture.angle), o = B.pilot.orbit, held = new Set(), trace = [], violations = [];
  let elapsed = B.renderOpts.matrix.time, previous = null, maxStep = 0, maxEyeGap = 0, rawChecks = 0, maximumRawError = 0, samples = 0, apertureCrossing = null, largestStep = null, largestGap = null, wideEntry = null;
  const key = (value, down) => { if (held.has(value) === down) return; globalThis.dispatchEvent(new KeyboardEvent(down ? "keydown" : "keyup", { key: value })); if (down) held.add(value); else held.delete(value); };
  const sample = (phase) => { const p = cave.root.position; return { phase, x: p.x, z: p.z, r: p.x * sx + p.z * sz, across: p.x * -sz + p.z * sx, y: p.y - cave.baseY, hop: cave.hop, v: cave.hopV, jet: !!cave.jet, player: B.cameraCave.playerIndex, camera: B.cameraCave.index, eye: [B.camera.position.x, B.camera.position.y, B.camera.position.z] }; };
  const step = (inspect = true) => {
    scene.update(dt, elapsed += dt);
    if (!inspect) return;
    const p = cave.root.position, eye = B.camera.position, feet = p.y - cave.baseY, physicalEye = B.pilot.closeMix > 0 && !B.pilot.preserveExitAngle && !B.cameraCave.transitioning;
    samples++;
    if (B.pilot.closeMix === 0) {
      const pitch = B.pilot.viewPitch, cp = Math.cos(pitch);
      rawChecks++;
      maximumRawError = Math.max(maximumRawError, Math.hypot(eye.x - o.tx - Math.sin(o.yaw) * cp * o.dist, eye.y - o.ty - Math.sin(pitch) * o.dist, eye.z - o.tz - Math.cos(o.yaw) * cp * o.dist));
    }
    const gap = Math.hypot(eye.x - p.x, eye.y - feet - cave.headOffset * 0.95, eye.z - p.z);
    if (gap > maxEyeGap) { maxEyeGap = gap; largestGap = { ...sample("largest gap"), head: feet + cave.headOffset * 0.95 }; }
    if (!apertureCrossing && feet < 0 && p.x * sx + p.z * sz <= Math.hypot(aperture.x, aperture.z) + 0.3) apertureCrossing = { ...sample("aperture"), floor: island.supportAt(p.x, p.z, feet, 0, -120, 0.295), ceiling: island.ceilingAt(p.x, feet + 0.01, p.z, 0.295) };
    if (!island.clearAt(p.x, feet + 1e-5, p.z, 0.295, cave.bodyHeight - 1e-5) && violations.length < 8) violations.push({ kind: "body", ...sample("collision") });
    if (physicalEye && !island.clearAt(eye.x, eye.y - 0.295, eye.z, 0.295, 0.59) && violations.length < 8) violations.push({ kind: "eye", ...sample("collision") });
    if (previous) {
      const distance = Math.hypot(eye.x - previous[0], eye.y - previous[1], eye.z - previous[2]);
      if (distance > maxStep) { maxStep = distance; largestStep = { from: previous, to: sample("largest step") }; }
      if (physicalEye && !island.voxelSegmentClearAt(previous[0], previous[1] - 0.295, previous[2], eye.x, eye.y - 0.295, eye.z, 0.295, 0.59) && violations.length < 8) violations.push({ kind: "eye sweep", ...sample("collision") });
    }
    previous = [eye.x, eye.y, eye.z];
  };
  let start = null;
  for (let r = 29.5; r > 24; r -= 0.05) {
    const x = sx * r - sz * offset, z = sz * r + sx * offset, y = island.surfaceAt(x, z);
    if (island.onLand(x, z) && island.clearAt(x, y + 1e-5, z, 0.3, cave.bodyHeight)) { start = { x, y, z }; break; }
  }
  if (!start) throw new Error("No upper rim launch point above window");
  B.pilot.release(true);
  B.pilot.possess(cave);
  B.crew.relocatePlayer(start, Math.atan2(sx, sz));
  o.yaw = o.tYaw = Math.atan2(-sx, -sz); o.pitch = o.tPitch = 0.2; o.dist = o.tDist = 6;
  if (mode === "first-person") B.pilot.enterClose();
  else if (B.pilot.closeWanted) B.pilot.hooks.onZoom(2);
  B.pilot.navigate({ position: start, target: start, yaw: Math.atan2(-sx, -sz), pitch: mode === "first-person" ? 0 : 0.2, dist: 6 });
  for (let i = 0; i < Math.ceil(1 / dt); i++) step(false);
  if (jet) {
    cave.jetFuel = 0.1;
    B.crew.wearJetpack(cave, globalThis.BL.hubModels.jetpack(), globalThis.BL.hubModels.jetFlame());
  }
  const initial = sample("initial"), targetRadius = room ? room.radius : 23;
  let turned = false, entering = false, secondJump = false, leftRock = false, completed = false;
  try {
    key(" ", true); step(); key(" ", false);
    key("w", true);
    for (let frame = 0; frame < Math.ceil(8 / dt); frame++) {
      const p = cave.root.position, r = p.x * sx + p.z * sz, feet = p.y - cave.baseY;
      if (!turned && r >= 30.65) { key("w", false); turned = true; leftRock = true; trace.push(sample("outside")); }
      if (turned && !entering && feet <= initial.y - 1) { key("s", true); entering = true; trace.push(sample("steer in")); }
      if (offset && entering && r < aperture.flare.edge - 0.5) {
        const across = p.x * -sz + p.z * sx;
        if (!wideEntry && across > aperture.width / 2 + 0.05 && feet < 0 && island.clearAt(p.x, feet + 1e-5, p.z, 0.3, cave.bodyHeight - 1e-5)) wideEntry = sample("wide approach");
        key("a", across > 0.8);
      }
      if (entering && !secondJump && feet <= aperture.sill + (basement ? -0.5 : 0.45) && cave.hopV < 0) { key(" ", true); key(" ", false); secondJump = true; trace.push(sample("air jump")); }
      step();
      if (frame % Math.ceil(0.2 / dt) === 0) trace.push(sample("route"));
      if (r <= targetRadius + 0.35 && Math.abs(feet - level.floor) < 0.01 && cave.hop === 0) { completed = true; break; }
      if (feet < level.floor - 4 || B.scene !== "hub") break;
    }
    key("w", false); key("s", false); key("a", false);
    for (let i = 0; i < Math.ceil(0.3 / dt); i++) step();
    const final = sample("entered");
    let exited = null;
    if (exit && completed) {
      // Keep the chosen outward view while turning the body toward the sill.
      B.pilot.hooks.onOrbit(0, 0);
      key("w", true);
      let jumped = false;
      for (let i = 0; i < Math.ceil(5 / dt); i++) {
        const p = cave.root.position, r = p.x * sx + p.z * sz;
        if (!jumped && r >= Math.hypot(aperture.x, aperture.z) - 0.8) { key(" ", true); key(" ", false); jumped = true; trace.push(sample("jump out")); }
        step();
        if (i % Math.ceil(0.2 / dt) === 0) trace.push(sample("exit route"));
        if (r > aperture.flare.edge + 0.5 && (mode === "trailing" || B.cameraCave.index === 0)) { exited = sample("exited"); break; }
        if (p.y - cave.baseY < level.floor - 4) break;
      }
      key("w", false);
    }
    return { basement, mode: B.pilot.mode, dt, jet, offset, roomIndex: room?.index ?? null, window: { angle: aperture.angle, sill: aperture.sill, height: aperture.height, width: aperture.width, radius: Math.hypot(aperture.x, aperture.z), edge: aperture.flare.edge }, floor: level.floor, bodyHeight: cave.bodyHeight, completed, leftRock, secondJump, initial, wideEntry, apertureCrossing, final, exited, maxStep, maxEyeGap, largestStep, largestGap, rawChecks, maximumRawError, samples, violations, trace, scene: B.scene, backend: B.renderer.kind };
  } finally { for (const value of held) key(value, false); }
};
