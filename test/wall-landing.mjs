// Real jagged cliff edges whose center column is lower than rock under the
// character's feet. Point-only support let falls embed the body and trap it.
export const wallLandingProbe = ({ mode = "trailing", dt = 1 / 60 } = {}) => {
  const B = window.__ooga, scene = window.BL.scenes.hub, island = B.island, c = [...B.cavemen.values()].find((entry) => entry.state === "working" && !entry.jet), o = B.pilot.orbit;
  const fixtures = [{ x: -26.125, z: 14.125 }, { x: -24.875, z: -4.125 }, { x: -24.875, z: 4.125 }, { x: -24.375, z: 5.875 }], rows = [], failures = [], held = new Set();
  let time = B.renderOpts.matrix.time, checks = 0;
  const key = (type, value) => window.dispatchEvent(new KeyboardEvent(type, { key: value }));
  const press = (value) => { key("keydown", value); held.add(value); };
  const release = (value) => { key("keyup", value); held.delete(value); };
  const step = () => {
    scene.update(dt, time += dt);
    const p = c.root.position, y = p.y - c.baseY;
    const clear = island.clearAt(p.x, y + 1e-5, p.z, 0.295, c.bodyHeight - 1e-5);
    checks++;
    if ((!clear || !Number.isFinite(y) || B.scene !== "hub" || B.pilot.player !== c || B.pilot.mode !== mode) && failures.length < 12) failures.push({ x: p.x, y, z: p.z, hop: c.hop, velocity: c.hopV, clear, scene: B.scene, mode: B.pilot.mode });
  };
  const position = () => ({ x: c.root.position.x, y: c.root.position.y - c.baseY, z: c.root.position.z });
  B.pilot.possess(c);
  if (mode === "first-person") B.pilot.enterClose();
  try {
    for (const jet of [false, true]) for (let i = 0; i < fixtures.length; i++) {
      const target = fixtures[i], angle = i * Math.PI / 2, distance = jet ? 0.7 : 0;
      const start = { x: target.x - Math.sin(angle) * distance, y: 12, z: target.z - Math.cos(angle) * distance };
      B.crew.relocatePlayer(start, angle);
      c.hop = start.y - island.supportAt(start.x, start.z, start.y, 0.6, -120, 0.3); c.hopV = -3;
      if (!!c.jet !== jet) { press("j"); step(); release("j"); }
      o.yaw = o.tYaw = angle + Math.PI; o.pitch = o.tPitch = 0;
      if (jet) {
        press("w");
        for (let frame = 0; frame < Math.max(1, Math.round(distance / 6.4 / dt)); frame++) step();
        release("w");
      }
      const approach = position();
      let fallFrames = 0, sweepFailures = 0;
      for (; fallFrames < Math.ceil(5 / dt) && (c.hop > 0 || c.hopV > 0); fallFrames++) {
        const before = position(); step(); const after = position();
        if (!island.voxelSegmentClearAt(before.x, before.y + 1e-5, before.z, after.x, after.y + 1e-5, after.z, 0.295, c.bodyHeight - 1e-5)) sweepFailures++;
      }
      const landed = position(), support = island.supportAt(landed.x, landed.z, landed.y, 0.6, -120, 0.3), center = island.supportAt(landed.x, landed.z, landed.y, 0.6, -120);
      const escapes = [];
      for (let direction = 0; direction < 4; direction++) {
        B.crew.relocatePlayer(landed, direction * Math.PI / 2);
        o.yaw = o.tYaw = direction * Math.PI / 2 + Math.PI;
        press("w");
        for (let frame = 0; frame < Math.ceil(0.35 / dt); frame++) step();
        release("w");
        const end = position();
        escapes.push(Math.hypot(end.x - landed.x, end.z - landed.z));
      }
      rows.push({ jet, index: i, approach, landed, support, center, fallFrames, sweepFailures, escapes });
    }
    return { mode, dt, rows, checks, failures, backend: B.renderer.kind };
  } finally { for (const value of held) key("keyup", value); }
};
