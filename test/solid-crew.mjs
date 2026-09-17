// Real crew controllers and prop meshes on an isolated elevated stone slab.
// The fixture removes scatter/roster timing from the collision assertions.
export const solidCrewProbe = ({ dt = 1 / 60, firstPerson = false } = {}) => {
  const B = window.__ooga, BL = window.BL, S = BL.scene, scene = BL.scenes.hub;
  const physics = B.headquarters.solids, props = physics.props;
  const actors = [...B.cavemen.values()], cave = actors.find((entry) => entry.state === "working"), other = actors.find((entry) => entry !== cave && entry.state === "working");
  const visible = actors.map((entry) => entry.root.visible), fixture = S.createNode(), rows = [], failures = [];
  const slab = S.createNode({ geometry: BL.models.box({ w: 16, h: 0.2, d: 16, color: "#665544" }), position: { x: 0, y: 12, z: 0 } });
  const barrel = S.createNode({ geometry: BL.hubModels.barrel(), position: { x: 0, y: 12.1, z: 0 } });
  S.addChild(fixture, slab); S.addChild(fixture, barrel); S.addChild(scene.root, fixture); props.add(fixture);
  const sync = () => { S.updateWorld(scene.root); props.sync(); };
  let time = B.renderOpts.matrix.time;
  const step = () => { sync(); B.crew.update(dt, time += dt); sync(); };
  const place = (actor, x, y, z) => {
    actor.root.visible = true; actor.root.quaternion = null; actor.root.rotation.x = actor.root.rotation.z = 0;
    actor.root.scale.x = actor.root.scale.y = actor.root.scale.z = 1;
    actor.state = "working"; actor.bedTravel.mode = ""; actor.walk = actor.build = null;
    actor.hop = actor.hopV = actor.cheer = actor.catchT = actor.yawn = 0;
    actor.cloudSupport = null; actor.viewLift = 0; actor.nextBuildAt = 1e12;
    actor.act.kind = "idle"; actor.act.until = 1e12; actor.act.said = true;
    actor.root.position.x = x; actor.root.position.y = y + actor.baseY; actor.root.position.z = z;
    actor.leap.vx = actor.leap.vz = actor.leap.land = 0;
    B.crew.removeJetpack(actor); sync();
  };
  const feet = (actor) => actor.root.position.y - actor.baseY;
  const drop = (actor, x, y, z) => {
    place(actor, x, y, z); actor.hop = y - 12.1; actor.hopV = -1;
    let frames = 0, upward = 0, prior = feet(actor);
    while (frames++ < Math.ceil(3 / dt)) {
      step(); upward = Math.max(upward, feet(actor) - prior); prior = feet(actor);
      if (!actor.hop && actor.hopV <= 0) break;
    }
    return { frames, feet: feet(actor), upward, grounded: actor.hop === 0 && actor.hopV === 0 };
  };
  try {
    B.pilot.release(true);
    for (const actor of actors) actor.root.visible = false;
    place(cave, 0, 12.1, -3);
    cave.walk = { tx: 0, tz: 3, speed: 1.7, phase: 0, heading: 0, to: "spot" };
    cave.act.spot.x = 0; cave.act.spot.z = 3; cave.act.spot.ry = 0;
    let frames = 0, lateral = 0, intersections = 0;
    while (cave.walk && frames++ < Math.ceil(12 / dt)) {
      step(); lateral = Math.max(lateral, Math.abs(cave.root.position.x));
      if (!props.clearAt(cave.root.position.x, feet(cave) + 1e-5, cave.root.position.z, 0.295, cave.bodyHeight - 1e-5)) intersections++;
    }
    rows.push({ kind: "npc-detour", arrived: !cave.walk, distance: Math.hypot(cave.root.position.x, cave.root.position.z - 3), lateral, intersections, frames });
    B.pilot.possess(cave);
    if (firstPerson) { B.pilot.enterClose(); B.pilot.update(1); }
    const bounds = S.boundsOf(barrel.geometry), top = barrel.position.y + bounds.max[1];
    const landed = drop(cave, 0, top + 3, 0);
    for (let i = 0; i < Math.ceil(0.4 / dt); i++) step();
    rows.push({ kind: "prop-landing", ...landed, expected: top, held: Math.abs(feet(cave) - top) });
    barrel.visible = false; sync();
    const start = feet(cave); step();
    rows.push({ kind: "prop-support-loss", drop: start - feet(cave), expected: BL.pilot.WALK.gravity * dt * dt, velocity: cave.hopV, airborne: cave.hop > 0 });
    place(other, 0, 12.1, 0);
    const otherTop = feet(other) + other.bodyHeight;
    const onCharacter = drop(cave, 0, otherTop + 2, 0);
    for (let i = 0; i < Math.ceil(0.4 / dt); i++) step();
    rows.push({ kind: "character-landing", ...onCharacter, expected: otherTop, held: Math.abs(feet(cave) - otherTop) });
    const before = feet(cave); other.root.position.x = 3; sync(); step();
    rows.push({ kind: "character-support-loss", drop: before - feet(cave), expected: BL.pilot.WALK.gravity * dt * dt, velocity: cave.hopV, airborne: cave.hop > 0 });
    place(cave, 0, 12.1, -2); place(other, 0, 12.1, 0);
    B.crew.steer(0, 1, 0, 1, 0);
    for (let i = 0; i < Math.ceil(0.5 / dt); i++) step();
    B.crew.steer(0, 0);
    rows.push({ kind: "character-side", separation: Math.hypot(cave.root.position.x - other.root.position.x, cave.root.position.z - other.root.position.z), initialZ: -2, finalZ: cave.root.position.z, feet: feet(cave) });
    place(cave, 0, 12.1, -0.3); place(other, 0, 12.1, 0);
    B.crew.steer(0, 1, 0, 1, 0); step(); B.crew.steer(0, 0);
    const inward = cave.root.position.z + 0.3;
    B.crew.steer(0, -1, 0, -1, 0);
    for (let i = 0; i < Math.ceil(0.3 / dt); i++) step();
    B.crew.steer(0, 0);
    rows.push({ kind: "character-overlap", inward, separation: Math.hypot(cave.root.position.x - other.root.position.x, cave.root.position.z - other.root.position.z), feet: feet(cave) });
    B.pilot.release(true);
    place(cave, 0, 12.1, -3); place(other, 0, 12.1, 0);
    cave.walk = { tx: 0, tz: 3, speed: 1.7, phase: 0, heading: 0, to: "spot" };
    frames = 0; lateral = 0; let minimumSeparation = Infinity;
    while (cave.walk && frames++ < Math.ceil(12 / dt)) {
      step(); lateral = Math.max(lateral, Math.abs(cave.root.position.x));
      minimumSeparation = Math.min(minimumSeparation, Math.hypot(cave.root.position.x - other.root.position.x, cave.root.position.z - other.root.position.z));
    }
    rows.push({ kind: "npc-character-detour", arrived: !cave.walk, distance: Math.hypot(cave.root.position.x, cave.root.position.z - 3), lateral, minimumSeparation, frames });
    other.root.visible = false; barrel.visible = true; sync();
    const npcLanding = drop(cave, 0, top + 3, 0);
    rows.push({ kind: "npc-prop-landing", ...npcLanding, expected: top });
    barrel.visible = false; sync();
    const npcBefore = feet(cave); step();
    rows.push({ kind: "npc-support-loss", drop: npcBefore - feet(cave), expected: BL.pilot.WALK.gravity * dt * dt, velocity: cave.hopV, airborne: cave.hop > 0 });
    for (const row of rows) if (!Number.isFinite(row.feet ?? row.drop ?? row.distance ?? row.separation)) failures.push(row);
    return { firstPerson, dt, rows, failures, backend: B.renderer.kind };
  } finally {
    B.crew.steer(0, 0); B.pilot.release(true);
    props.remove(fixture); S.removeChild(scene.root, fixture);
    actors.forEach((actor, i) => { actor.root.visible = visible[i]; }); sync();
  }
};

// An actual lying Ooga must block movement over its mattress without sealing
// the rest of that room or losing the head/limb bounds as its pose turns.
export const sleepingSolidProbe = () => {
  const B = window.__ooga, scene = window.BL.scenes.hub, physics = B.headquarters.solids;
  const cave = [...B.cavemen.values()].find((entry) => entry.state === "working");
  const bed = B.headquarters.mattresses.find((entry) => !entry.sleeper), dt = 1 / 60;
  let time = B.renderOpts.matrix.time;
  B.pilot.possess(cave);
  B.crew.relocatePlayer({ x: bed.x, y: bed.y + bed.sleep.surface, z: bed.z }, bed.node.rotation.y);
  scene.update(dt, time += dt);
  const admitted = B.crew.sleepPlayer(bed);
  for (let i = 0; i < 80; i++) scene.update(dt, time += dt);
  const bounds = Array.from(cave.solidBounds), middleZ = (bounds[2] + bounds[5]) / 2, middleX = (bounds[0] + bounds[3]) / 2;
  const feet = bed.y + bed.sleep.surface;
  const across = physics.flyable(bounds[0] - 0.5, middleZ, bounds[3] + 0.5, middleZ, feet, 1.5, null);
  const top = physics.supportAt(middleX, middleZ, bounds[4] + 0.2, bounds[4] + 0.2, null);
  return { admitted, mode: cave.bedTravel.mode, reserved: bed.sleeper === cave, bounds, across, top, expected: bounds[4], backend: B.renderer.kind };
};

// Call immediately after a fresh ?bananas= load, before changing pile state.
export const crewBootRadiusProbe = () => {
  const B = window.__ooga;
  const rows = [...B.cavemen.values()].filter((cave) => cave.state === "working").map((cave) => ({
    name: cave.contributor.name, radius: Math.hypot(cave.root.position.x, cave.root.position.z),
    slot: Math.hypot(cave.slot.x, cave.slot.z), walking: !!cave.walk
  }));
  return { rows, pileEdge: B.altar.radius, shown: B.shown, platformRadius: B.altar.platformRadius, backend: B.renderer.kind };
};
