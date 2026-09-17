// Follow actual authored cave-apron destinations against the shipped seal
// meshes. A nearby wall beyond the destination must not become a passing task.
export const sealedCaveWalkingProbe = ({ dt = 1 / 30, scenarios = ["apron", "close apron", "embedded goal", "depart"] } = {}) => {
  const B = window.__ooga, BL = window.BL, S = BL.scene, scene = BL.scenes.hub, crew = B.crew, physics = B.headquarters.solids;
  const actors = [...B.cavemen.values()], cave = actors.find((actor) => actor.state === "working"), rows = [], walls = [];
  const saved = actors.map((actor) => ({ actor, visible: actor.root.visible }));
  const seals = BL.solidProps.create();
  for (const seal of B.matrixGate.sealed) seals.add(seal.node);
  const sync = () => { S.updateWorld(scene.root); physics.props.sync(); seals.sync(); };
  let time = B.renderOpts.matrix.time;
  B.pilot.release(true);
  for (const actor of actors) actor.root.visible = false;
  try {
    for (const seal of B.matrixGate.sealed) for (const name of scenarios) {
      const m = seal.mouth, sr = Math.sin(m.ry), cr = Math.cos(m.ry);
      const outside = { x: m.x + sr * 5, z: m.z + cr * 5 }, apron = m.apron;
      const near = { x: m.x + sr * 2.3, z: m.z + cr * 2.3 };
      const embedded = { x: m.x + sr * (seal.stopZ + 0.06), z: m.z + cr * (seal.stopZ + 0.06) };
      const start = name === "depart" ? apron : name === "close apron" || name === "embedded goal" ? near : outside;
      let target = name === "depart" ? outside : name === "embedded goal" ? embedded : apron;
      const requestedTarget = target;
      const y = B.island.surfaceAt(start.x, start.z);
      cave.root.visible = true; cave.root.quaternion = null; cave.state = "working";
      Object.assign(cave.root.position, { x: start.x, y: y + cave.baseY, z: start.z });
      Object.assign(cave.root.rotation, { x: 0, y: Math.atan2(target.x - start.x, target.z - start.z), z: 0 });
      Object.assign(cave.root.scale, { x: 1, y: 1, z: 1 });
      cave.bedTravel.mode = ""; cave.build = null; cave.cloudSupport = null;
      cave.hop = cave.hopV = cave.cheer = cave.catchT = cave.yawn = cave.viewLift = 0;
      cave.leap.vx = cave.leap.vz = cave.leap.land = 0;
      cave.act.kind = "wander"; cave.act.until = cave.nextBuildAt = cave.yawnAt = Infinity; cave.act.said = true;
      Object.assign(cave.act.spot, { x: target.x, z: target.z, ry: cave.root.rotation.y });
      cave.walk = { tx: target.x, tz: target.z, speed: 1.7, phase: 0, heading: cave.root.rotation.y, to: "spot" };
      cave.avoidance.active = false; cave.avoidance.navigation.mode = 0; cave.avoidance.tx = cave.pathing.tx = NaN;
      Object.assign(cave.shoulder, { phase: 0, other: null, prop: false, rear: false, amount: 0, yaw: 0, targetYaw: 0, attempted: false, motionX: 0, motionZ: 0, snapVX: 0, snapVZ: 0 });
      for (const node of cave.root.children) node.poseYaw = 0;
      crew.removeJetpack(cave); sync();
      const nav = cave.avoidance.navigation, searches = nav.searches, jumps = nav.jumps;
      const row = { cave: m.id, name, dt, initialClear: seals.clearAt(start.x, y + 1e-5, start.z, 0.295, cave.bodyHeight - 1e-5), destinationClear: physics.walkable(target.x, target.z, target.x, target.z, y, cave.bodyHeight, cave), frames: 0, intersections: 0, maximumStep: 0, lateral: 0, peakYaw: 0, goalsPreserved: true, trace: [] };
      let lastX = start.x, lastZ = start.z;
      if (name === "embedded goal") {
        crew.update(dt, time += dt); sync(); row.frames++;
        const p = cave.root.position, feet = p.y - cave.baseY;
        row.retargeted = !!cave.walk && (cave.walk.tx !== target.x || cave.walk.tz !== target.z);
        row.replacementClear = !!cave.walk && physics.walkable(cave.walk.tx, cave.walk.tz, cave.walk.tx, cave.walk.tz, B.island.surfaceAt(cave.walk.tx, cave.walk.tz), cave.bodyHeight, cave);
        row.goalsPreserved = !row.retargeted;
        row.maximumStep = Math.hypot(p.x - lastX, p.z - lastZ);
        if (!seals.clearAt(p.x, feet + 1e-5, p.z, 0.295, cave.bodyHeight - 1e-5)) row.intersections++;
        lastX = p.x; lastZ = p.z;
        // Production selected a valid replacement. Continue to a known safe
        // authored spot so random wandering and distant fires do not enter
        // this seal-recovery regression.
        target = apron;
        cave.walk = { tx: target.x, tz: target.z, speed: 1.7, phase: 0, heading: Math.atan2(target.x - p.x, target.z - p.z), to: "spot" };
        Object.assign(cave.act.spot, { x: target.x, z: target.z, ry: m.ry + Math.PI });
        cave.avoidance.active = false; nav.mode = 0; cave.avoidance.tx = cave.pathing.tx = NaN;
      }
      while (cave.walk && row.frames++ < Math.ceil(12 / dt)) {
        crew.update(dt, time += dt); sync();
        const p = cave.root.position, feet = p.y - cave.baseY, across = (p.x - m.x) * cr - (p.z - m.z) * sr, along = (p.x - m.x) * sr + (p.z - m.z) * cr;
        row.maximumStep = Math.max(row.maximumStep, Math.hypot(p.x - lastX, p.z - lastZ));
        row.lateral = Math.max(row.lateral, Math.abs(across)); row.peakYaw = Math.max(row.peakYaw, Math.abs(cave.shoulder.yaw));
        if (!seals.clearAt(p.x, feet + 1e-5, p.z, 0.295, cave.bodyHeight - 1e-5)) row.intersections++;
        if (cave.walk) row.goalsPreserved &&= cave.walk.tx === target.x && cave.walk.tz === target.z;
        if (row.frames % Math.max(1, Math.round(0.5 / dt)) === 0) row.trace.push({ seconds: row.frames * dt, across, along, feet, phase: cave.shoulder.phase, prop: cave.shoulder.prop, navigation: nav.mode, stalled: cave.avoidance.stalled });
        lastX = p.x; lastZ = p.z;
      }
      row.arrived = !cave.walk; row.distance = Math.hypot(cave.root.position.x - target.x, cave.root.position.z - target.z);
      if (name === "embedded goal") row.rejectedDistance = Math.hypot(cave.root.position.x - requestedTarget.x, cave.root.position.z - requestedTarget.z);
      row.searches = nav.searches - searches; row.jumps = nav.jumps - jumps;
      rows.push(row);
    }
    for (const seal of B.matrixGate.sealed) {
      const m = seal.mouth, sr = Math.sin(m.ry), cr = Math.cos(m.ry), y = m.floorY;
      const x = m.x + sr * 2.3, z = m.z + cr * 2.3;
      cave.root.position.x = x; cave.root.position.y = y + cave.baseY; cave.root.position.z = z;
      cave.hop = cave.hopV = 0; cave.leap.vx = cave.leap.vz = cave.leap.land = 0;
      B.pilot.possess(cave); crew.look(Math.atan2(-sr, -cr), 0, 1); sync();
      const front = seal.node.position.z + seal.node.geometry.frontZ;
      const innerZ = seal.node.position.z + (seal.node.geometry.sealBounds.minZ + seal.node.geometry.sealBounds.maxZ) * 0.5;
      const innerX = m.x + sr * innerZ, innerWorldZ = m.z + cr * innerZ;
      const partialX = m.x + sr * (front + 0.15), partialZ = m.z + cr * (front + 0.15);
      const row = { cave: m.id, initialClear: seals.clearAt(x, y + 1e-5, z, 0.295, cave.bodyHeight - 1e-5), intersections: 0, maximumStep: 0,
        insideBlocked: !physics.walkable(innerX, innerWorldZ, innerX, innerWorldZ, y, cave.bodyHeight, cave),
        partialBlocked: !physics.walkable(partialX, partialZ, partialX, partialZ, y, cave.bodyHeight, cave),
        sweepBlocked: !physics.walkable(x, z, partialX, partialZ, y, cave.bodyHeight, cave) };
      let lastX = x, lastZ = z;
      crew.steer(-sr, -cr, 0, 1, 0);
      for (let i = 0; i < Math.ceil(1.25 / dt); i++) {
        crew.update(dt, time += dt); sync();
        const p = cave.root.position, feet = p.y - cave.baseY;
        if (!seals.clearAt(p.x, feet + 1e-5, p.z, 0.295, cave.bodyHeight - 1e-5)) row.intersections++;
        row.maximumStep = Math.max(row.maximumStep, Math.hypot(p.x - lastX, p.z - lastZ));
        lastX = p.x; lastZ = p.z;
      }
      const stopped = { x: cave.root.position.x, z: cave.root.position.z };
      crew.steer(sr, cr, 0, 1, 0);
      for (let i = 0; i < Math.ceil(0.75 / dt); i++) { crew.update(dt, time += dt); sync(); }
      row.walkedAway = Math.hypot(cave.root.position.x - stopped.x, cave.root.position.z - stopped.z) > 1;
      crew.steer(0, 0); B.pilot.release(true); walls.push(row);
    }
    return { backend: B.renderer.kind, dt, rows, walls };
  } finally {
    crew.steer(0, 0); B.pilot.release(true);
    seals.dispose();
    for (const entry of saved) entry.actor.root.visible = entry.visible;
    sync();
  }
};
