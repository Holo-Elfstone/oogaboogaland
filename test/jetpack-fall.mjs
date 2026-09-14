// Compare complete fall trajectories in open air, so neither terrain support
// nor different walking/flying horizontal speeds can mask a gravity change.
export const jetpackFallProbe = ({ mode = "trailing", dt = 1 / 60 } = {}) => {
  const B = window.__ooga, scene = window.BL.scenes.hub, cave = [...B.cavemen.values()].find((c) => c.state === "working" && !c.jet), o = B.pilot.orbit;
  const rows = [], reference = [], directions = ["", "w", "a", "s", "d"], frames = Math.round(2 / dt);
  let cloudCeiling = -Infinity;
  for (const cloud of B.matrixCave.clouds) for (let i = 1; i < cloud.node.geometry.verts.length; i += 3) cloudCeiling = Math.max(cloudCeiling, cloud.node.position.y + cloud.node.geometry.verts[i]);
  let time = B.renderOpts.matrix.time, held = "";
  const key = (type, value) => window.dispatchEvent(new KeyboardEvent(type, { key: value }));
  const start = () => {
    B.crew.relocatePlayer({ x: 60, y: 55, z: 0 }, Math.PI);
    cave.hop = 175; cave.hopV = -5;
    o.yaw = o.tYaw = 0; o.pitch = o.tPitch = 0;
  };
  B.pilot.possess(cave);
  if (mode === "first-person") B.pilot.enterClose();
  try {
    for (const fuel of [null, 1, 0.4, 0]) for (const direction of directions) {
      start();
      if (fuel !== null && !cave.jet) { key("keydown", "j"); key("keyup", "j"); }
      if (fuel !== null) cave.jetFuel = fuel;
      if (direction) { key("keydown", direction); held = direction; }
      let maxVelocityError = 0, maxTrajectoryError = 0, maxAccelerationError = 0, previousVelocity = -5, thrustFrames = 0, bodyFailures = 0;
      for (let frame = 0; frame < frames; frame++) {
        scene.update(dt, time += dt);
        const p = cave.root.position, y = p.y - cave.baseY, velocity = cave.hopV;
        if (fuel === null && !direction) reference.push({ y, velocity });
        maxVelocityError = Math.max(maxVelocityError, Math.abs(velocity - reference[frame].velocity));
        maxTrajectoryError = Math.max(maxTrajectoryError, Math.abs(y - reference[frame].y));
        maxAccelerationError = Math.max(maxAccelerationError, Math.abs(velocity - previousVelocity + 9.8 * dt));
        if (cave.jet && cave.jet.thrust) thrustFrames++;
        if (!B.island.clearAt(p.x, y + 1e-5, p.z, 0.295, cave.bodyHeight - 1e-5)) bodyFailures++;
        previousVelocity = velocity;
      }
      if (held) { key("keyup", held); held = ""; }
      rows.push({ fuel, direction, equipped: !!cave.jet, endFuel: cave.jetFuel, y: cave.root.position.y - cave.baseY, velocity: cave.hopV, maxVelocityError, maxTrajectoryError, maxAccelerationError, thrustFrames, bodyFailures, mode: B.pilot.mode, scene: B.scene, selected: B.pilot.player === cave });
    }
    return { mode, dt, frames, rows, cloudCeiling, backend: B.renderer.kind };
  } finally { if (held) key("keyup", held); }
};
