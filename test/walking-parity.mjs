// Compare the real held-key controllers on flat HQ ground, then walk off the
// same cave roof. Camera and character trajectories retain production collision.
export const walkingSpeedProbe = ({ dt = 1 / 60 } = {}) => {
  const B = window.__ooga, scene = window.BL.scenes.hub, o = B.pilot.orbit, rows = [];
  const cave = [...B.cavemen.values()].find((entry) => entry.state === "working" && !entry.jet);
  let time = B.renderOpts.matrix.time;
  const key = (type, value) => window.dispatchEvent(new KeyboardEvent(type, { key: value }));
  const step = () => scene.update(dt, time += dt);
  for (const driven of [false, true]) for (const distance of [3.5, 10, 24]) for (const diagonal of [false, true]) {
    B.pilot.release(true);
    if (driven) B.pilot.possess(cave);
    B.pilot.enterClose();
    document.querySelector('nav[data-scene="hub"] [data-preset="underground"]').click();
    o.yaw = o.tYaw = Math.PI; o.pitch = o.tPitch = 0; o.dist = o.tDist = distance;
    step();
    const position = () => driven ? cave.root.position : B.camera.position;
    const before = { ...position() };
    key("keydown", "w"); if (diagonal) key("keydown", "d");
    const frames = Math.round(0.5 / dt);
    try { for (let i = 0; i < frames; i++) step(); }
    finally { key("keyup", "w"); if (diagonal) key("keyup", "d"); }
    const after = { ...position() };
    for (let i = 0; i < Math.ceil(0.25 / dt); i++) step();
    const stopped = position();
    rows.push({ mode: B.pilot.mode, driven, distance, diagonal, speed: Math.hypot(after.x - before.x, after.z - before.z) / (frames * dt), drift: Math.hypot(stopped.x - after.x, stopped.z - after.z), scene: B.scene });
  }
  return { dt, rows, backend: B.renderer.kind };
};

export const walkingFallProbe = ({ driven = false, dt = 1 / 60, release = false } = {}) => {
  const B = window.__ooga, scene = window.BL.scenes.hub, o = B.pilot.orbit;
  const cave = [...B.cavemen.values()].find((entry) => entry.state === "working" && !entry.jet);
  const m = B.mouths.find((entry) => entry.id === "c11"), ox = Math.sin(m.angle), oz = -Math.cos(m.angle);
  const start = { x: m.x + ox * 1.2, z: m.z + oz * 1.2 }, roof = B.island.surfaceAt(start.x, start.z), yaw = Math.PI - m.angle;
  const rows = [], violations = [];
  let time = B.renderOpts.matrix.time, previous = null, firstAir = -1, releaseEvent = null, releaseStepError = 0;
  const step = () => scene.update(dt, time += dt);
  B.pilot.goPreset("pile");
  if (driven) {
    B.pilot.possess(cave);
    B.crew.relocatePlayer({ ...start, y: roof }, yaw + Math.PI);
  } else {
    const target = { x: start.x - Math.sin(yaw) * 3.5, y: roof + 1.5, z: start.z - Math.cos(yaw) * 3.5 };
    o.target = target; o.tx = target.x; o.ty = target.y; o.tz = target.z;
  }
  o.yaw = o.tYaw = yaw; o.pitch = o.tPitch = 0; o.dist = o.tDist = 3.5;
  B.pilot.update(0);
  B.pilot.enterClose();
  for (let i = 0; i < Math.ceil(1 / dt); i++) step();
  const initial = { x: B.camera.position.x, y: B.camera.position.y, z: B.camera.position.z, mode: B.pilot.mode };
  window.dispatchEvent(new KeyboardEvent("keydown", { key: "w" }));
  try {
    for (let frame = 0; frame < Math.ceil(2.1 / dt); frame++) {
      if (release && !releaseEvent && firstAir >= 0 && frame - firstAir >= Math.ceil(0.5 / dt)) {
        const before = { ...B.camera.position }, velocity = cave.hopV;
        B.pilot.release(true);
        releaseEvent = { frame, before, velocity, jump: Math.hypot(B.camera.position.x - before.x, B.camera.position.y - before.y, B.camera.position.z - before.z) };
      }
      step();
      const possessed = !!B.pilot.player, p = possessed ? cave.root.position : B.camera.position, eye = B.camera.position;
      const y = p.y - (possessed ? cave.baseY : 1.1), support = B.island.supportAt(p.x, p.z, y, 0.6);
      const row = { x: p.x, y, z: p.z, support, along: (p.x - m.x) * ox + (p.z - m.z) * oz, airborne: possessed ? cave.hop > 0 : B.pilot.freeFalling, eyeY: eye.y };
      if (row.airborne && firstAir < 0) firstAir = frame;
      if (releaseEvent && frame - releaseEvent.frame < Math.floor(0.3 / dt)) {
        const n = frame - releaseEvent.frame + 1, expected = releaseEvent.before.y + releaseEvent.velocity * n * dt - 9.8 * dt * dt * n * (n + 1) / 2;
        releaseStepError = Math.max(releaseStepError, Math.abs(eye.y - expected));
      }
      const count = previous ? Math.max(1, Math.ceil(Math.hypot(eye.x - previous.x, eye.y - previous.y, eye.z - previous.z) / 0.04)) : 1;
      for (let i = 1; i <= count; i++) {
        const k = i / count, x = previous ? previous.x + (eye.x - previous.x) * k : eye.x, ey = previous ? previous.y + (eye.y - previous.y) * k : eye.y, z = previous ? previous.z + (eye.z - previous.z) * k : eye.z;
        if (!B.island.clearAt(x, ey - 0.09, z, 0.09, 0.18) && violations.length < 4) violations.push({ frame, x, y: ey, z });
      }
      previous = { ...eye }; rows.push(row);
    }
  } finally { window.dispatchEvent(new KeyboardEvent("keyup", { key: "w" })); }
  const left = rows.findIndex((row) => row.airborne), landed = rows.findIndex((row, i) => i > left && left >= 0 && !row.airborne);
  let maxFallSpeed = 0, ballisticError = 0;
  if (left >= 0 && landed > left) for (let i = left + 1; i < landed; i++) {
    const n = i - left, expected = rows[left].y + 2.4 * n * dt - 9.8 * dt * dt * n * (n + 1) / 2;
    ballisticError = Math.max(ballisticError, Math.abs(rows[i].y - expected));
    maxFallSpeed = Math.max(maxFallSpeed, (rows[i - 1].y - rows[i].y) / dt);
  }
  return { driven, dt, roof, initial, left, landed, duration: (landed - left) * dt, maxFallSpeed, ballisticError, violations, landing: rows[landed], trajectory: left >= 0 && landed > left ? rows.slice(left, landed + 1).map((row) => row.y) : [], releaseEvent, releaseStepError, mode: B.pilot.mode, selected: !!B.pilot.player, scene: B.scene, backend: B.renderer.kind };
};
