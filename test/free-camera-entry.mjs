// The orbit focus is the destination, even when it is high above support.
// Gravity starts only after the rendered eye has reached that destination.
export const freeCameraEntryProbe = () => {
  const B = window.__ooga, scene = window.BL.scenes.hub, rows = [];
  let time = B.renderOpts.matrix.time;
  const step = (dt) => scene.update(dt, time += dt);
  const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
  const direction = () => {
    const p = B.camera.position, t = B.camera.target, n = distance(p, t);
    return { x: (t.x - p.x) / n, y: (t.y - p.y) / n, z: (t.z - p.z) / n };
  };
  B.pilot.release(true);
  for (const dt of [1 / 120, 1 / 20]) for (const pitch of [-1.2, 0, 1.2]) {
    if (B.pilot.closeWanted) B.pilot.hooks.onZoom(2);
    const target = { x: 0, y: 40, z: 0 };
    B.pilot.navigate({ position: target, target, yaw: 0.7, pitch, dist: 6 });
    for (let i = 0; i < 3; i++) step(dt);
    // Portrait framing lowers the displayed focus slightly.
    target.y = B.camera.target.y;
    const before = { ...B.camera.position }, forward = direction();
    B.pilot.hooks.onZoom(0.01);
    const eventJump = distance(before, B.camera.position), initialMix = B.pilot.closeMix;
    let frames = 0, prematureFall = false, rayError = 0, forwardDot = 1, lastDistance = distance(before, target), retreat = 0;
    while (B.pilot.closeMix < 1 && frames < Math.ceil(2 / dt)) {
      step(dt); frames++;
      const p = B.camera.position, f = direction(), along = (p.x - before.x) * forward.x + (p.y - before.y) * forward.y + (p.z - before.z) * forward.z;
      rayError = Math.max(rayError, Math.hypot(p.x - before.x - forward.x * along, p.y - before.y - forward.y * along, p.z - before.z - forward.z * along));
      forwardDot = Math.min(forwardDot, f.x * forward.x + f.y * forward.y + f.z * forward.z);
      const remaining = distance(p, target);
      retreat = Math.max(retreat, remaining - lastDistance); lastDistance = remaining;
      if (B.pilot.closeMix < 1 && B.pilot.freeFalling) prematureFall = true;
    }
    const endpointError = distance(B.camera.position, target), arrived = B.pilot.closeMix === 1;
    let fallError = 0;
    for (let n = 1; n <= 5; n++) {
      step(dt);
      fallError = Math.max(fallError, Math.abs(B.camera.position.y - (target.y - 9.8 * dt * dt * n * (n + 1) / 2)));
    }
    // Reverse an unfinished outward zoom without a position jump.
    B.pilot.hooks.onZoom(2); for (let i = 0; i < 3; i++) step(dt);
    const reversalEye = { ...B.camera.position }, pivot = { ...B.pilot.orbit.target };
    B.pilot.hooks.onZoom(0.01);
    const reversalJump = distance(reversalEye, B.camera.position);
    for (let i = 0; B.pilot.closeMix < 1 && i < Math.ceil(2 / dt); i++) step(dt);
    rows.push({ dt, pitch, eventJump, initialMix, frames, prematureFall, rayError, forwardDot, retreat, endpointError, arrived, fallError, reversalJump, reversalError: distance(B.camera.position, pivot) });
  }
  return { rows };
};
