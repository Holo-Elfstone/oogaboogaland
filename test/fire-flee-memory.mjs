// A clear raised support isolates long escapes from the island's cliff edges.
// The source stays possessed so its fire lasts until the probe drops and rolls.
export const fireFleeMemoryProbe = ({ dt = 1 / 60 } = {}) => {
  const B = window.__ooga, BL = window.BL, S = BL.scene, scene = BL.scenes.hub, crew = B.crew;
  const solids = B.headquarters.solids.props, nav = B.headquarters.npcPaths, actors = [...B.cavemen.values()];
  const saved = actors.map((cave) => ({ cave, visible: cave.root.visible, override: cave.override }));
  const floor = 12.1, slab = S.createNode({ position: { x: 0, y: 12, z: 0 }, geometry: BL.models.box({ w: 64, h: 0.2, d: 28, color: "#665544" }) });
  S.addChild(scene.root, slab); solids.add(slab);
  const [source, bystander, second] = actors, target = nav.target;
  let time = B.renderOpts.matrix.time, calls = 0, clear = true, grounded = true, maximumStep = 0;
  nav.target = (...args) => { if (args[0] === bystander) calls++; return target(...args); };
  const sync = () => { S.updateWorld(scene.root); solids.sync(); };
  const park = (cave, x, z) => {
    cave.root.visible = true; cave.root.quaternion = null;
    Object.assign(cave.root.position, { x, y: floor + cave.baseY, z });
    Object.assign(cave.root.rotation, { x: 0, y: 0, z: 0 });
    cave.state = "working"; cave.bedTravel.mode = ""; cave.walk = null;
    cave.hop = cave.hopV = cave.cheer = cave.catchT = cave.yawn = cave.viewLift = 0;
    cave.leap.vx = cave.leap.vz = cave.leap.land = 0; cave.cloudSupport = null;
    cave.act.kind = "idle"; cave.act.until = cave.nextBuildAt = cave.yawnAt = Infinity; cave.act.said = true;
    cave.avoidance.active = false; cave.avoidance.navigation.mode = 0; cave.avoidance.tx = NaN;
    cave.pathing.tx = NaN; cave.shoulder.phase = 0;
    Object.assign(cave.camp, { burning: false, rolling: false, burnAge: 0, cooldown: 0 });
    Object.assign(cave.camp.panic, { active: false, threat: null, remembered: false, resumeWalk: null, resumeSleep: false });
    cave.camp.panic.memory.fill(0);
    crew.removeJetpack(cave);
  };
  const tick = () => {
    const p = bystander.root.position, x = p.x, z = p.z;
    sync(); crew.update(dt, time += dt); sync();
    maximumStep = Math.max(maximumStep, Math.hypot(p.x - x, p.z - z));
    const feet = p.y - bystander.baseY;
    clear &&= solids.clearAt(p.x, feet + 1e-5, p.z, 0.295, bystander.bodyHeight - 1e-5);
    grounded &&= Math.abs(feet - floor) < 1e-6;
  };
  const step = (seconds) => { for (let i = 0; i < Math.ceil(seconds / dt); i++) tick(); };
  const known = (other) => !!bystander.camp.panic.memory[other.index * 4 + 3];
  const distance = () => Math.hypot(bystander.root.position.x - source.root.position.x, bystander.root.position.z - source.root.position.z);
  const reset = (multiple = false) => {
    B.pilot.release(true);
    for (const cave of actors) { park(cave, 0, 0); cave.root.visible = false; }
    park(source, -10, multiple ? -1.5 : 0); park(bystander, -3.5, 0);
    Object.assign(bystander.act.spot, { x: -6, z: 0, ry: -Math.PI / 2 });
    const walk = bystander.walk = { tx: -6, tz: 0, speed: 1.7, phase: 0, heading: -Math.PI / 2, to: "spot" };
    bystander.act.kind = "wander";
    // Possession resolves support immediately, before the first simulated tick.
    sync();
    B.pilot.possess(source); crew.steer(0, 0); crew.ignite(source);
    if (multiple) {
      park(second, -10, 1.5); crew.ignite(second);
      // Hold the second source still too; only the bystander's escape is under test.
      second.camp.reactionDelay = Infinity; second.camp.panic.speed = 0;
    }
    calls = 0; clear = grounded = true; maximumStep = 0; sync();
    return walk;
  };
  const settle = () => {
    for (let i = 0; i < Math.ceil(5 / dt); i++) tick();
    return bystander.camp.panic.active && bystander.camp.panic.remembered && !bystander.camp.panic.threat;
  };
  const hold = (seconds) => {
    const x = bystander.root.position.x, z = bystander.root.position.z, before = calls;
    let drift = 0, minimumDistance = Infinity, held = true;
    for (let i = 0; i < Math.ceil(seconds / dt); i++) {
      tick(); drift = Math.max(drift, Math.hypot(bystander.root.position.x - x, bystander.root.position.z - z));
      minimumDistance = Math.min(minimumDistance, distance());
      held &&= bystander.camp.panic.active && bystander.camp.panic.remembered && !bystander.walk && !bystander.camp.burning;
    }
    return { held, drift, minimumDistance, graphCalls: calls - before };
  };
  const released = (walk, before) => ({
    released: !bystander.camp.panic.active && !bystander.camp.panic.remembered,
    restored: bystander.walk === walk, returned: before - bystander.root.position.x,
    cleared: !known(source) && !known(second)
  });
  try {
    B.pilot.release(true);
    for (const cave of actors) cave.override = "working";
    crew.refreshStates(true);
    let walk = reset();
    const initialDistance = distance(), startX = bystander.root.position.x;
    tick();
    const far = { initialDistance, detected: bystander.camp.panic.active && known(source), firstSpeed: (bystander.root.position.x - startX) / dt };
    far.settled = settle(); far.distance = distance(); far.routeSaved = bystander.camp.panic.resumeWalk === walk;
    const stationary = hold(8), memory = bystander.camp.panic.memory, offset = source.index * 4;
    stationary.snapshotError = Math.hypot(memory[offset] + 10, memory[offset + 1]);
    stationary.sourceHeld = crew.player === source && source.camp.burning && source.root.position.x === -10 && source.root.position.z === 0;
    stationary.clear = clear; stationary.grounded = grounded; stationary.maximumStep = maximumStep;
    crew.relocatePlayer({ x: -11, y: floor, z: 0 }, 0);
    const smallMove = hold(1);
    const beforeMove = bystander.root.position.x;
    crew.relocatePlayer({ x: -24, y: floor, z: 0 }, 0); step(1.2);
    const moved = { ...released(walk, beforeMove), sourceStillBurning: source.camp.burning };

    walk = reset(); settle();
    const beforeOut = bystander.root.position.x;
    crew.dropRoll(source); step(4.2);
    const extinguished = { ...released(walk, beforeOut), sourceOut: !source.camp.burning && !source.camp.rolling };

    walk = reset(true); settle();
    const multiple = { bothKnown: known(source) && known(second) };
    crew.dropRoll(source); step(3.2);
    multiple.firstCleared = !known(source); multiple.secondRetained = known(second) && second.camp.burning;
    multiple.hold = hold(2);
    const beforeSecondOut = bystander.root.position.x;
    crew.dropRoll(second); step(4.2);
    multiple.final = released(walk, beforeSecondOut);
    return { backend: B.renderer.kind, dt, far, stationary, smallMove, moved, extinguished, multiple };
  } finally {
    nav.target = target; crew.steer(0, 0); B.pilot.release(true);
    solids.remove(slab); S.removeChild(scene.root, slab);
    for (const entry of saved) { entry.cave.override = entry.override; entry.cave.root.visible = entry.visible; }
    sync();
  }
};
