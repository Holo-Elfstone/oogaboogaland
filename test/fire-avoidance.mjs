// Keep the authored pits and movement controllers; remove unrelated passers-by
// and scattered props so every detour is attributable to the flame hazard.
export const fireAvoidanceProbe = ({ dt = 1 / 60 } = {}) => {
  const B = window.__ooga, BL = window.BL, S = BL.scene, scene = BL.scenes.hub, crew = B.crew;
  const H = B.headquarters, solids = H.solids.props, actors = [...B.cavemen.values()];
  const cave = actors.find((c) => c.state === "working" && !c.build), hazards = H.fireHazards;
  const outdoor = hazards.find((h) => h.y >= 0), hearth = hazards.find((h) => h.y < 0);
  const saved = actors.map((c) => ({ cave: c, visible: c.root.visible, override: c.override }));
  const scenery = B.props.filter((p) => p.prop !== "firepit").map((p) => ({ node: p.node, visible: p.node.visible }));
  let time = B.renderOpts.matrix.time;
  const sync = () => { S.updateWorld(scene.root); solids.sync(); };
  const park = (x, z, y) => {
    cave.root.visible = true; cave.root.quaternion = null;
    Object.assign(cave.root.position, { x, y: y + cave.baseY, z });
    Object.assign(cave.root.rotation, { x: 0, y: 0, z: 0 });
    cave.state = "working"; cave.bedTravel.mode = ""; cave.walk = null;
    cave.hop = cave.hopV = cave.cheer = cave.catchT = cave.yawn = cave.viewLift = 0;
    cave.leap.vx = cave.leap.vz = cave.leap.land = 0; cave.cloudSupport = null;
    cave.act.kind = "idle"; cave.act.until = cave.nextBuildAt = cave.yawnAt = Infinity; cave.act.said = true;
    cave.avoidance.active = false; cave.avoidance.navigation.mode = 0; cave.avoidance.tx = NaN;
    cave.pathing.tx = NaN; cave.shoulder.phase = 0;
    Object.assign(cave.camp, { burning: false, rolling: false, cooldown: 0 });
    Object.assign(cave.camp.panic, { active: false, threat: null, remembered: false, resumeWalk: null, resumeSleep: false });
    cave.camp.panic.memory.fill(0); crew.removeJetpack(cave); sync();
  };
  const phase = (hour) => { cave.root.visible = false; B.setHour(hour); scene.update(dt, time += dt); sync(); };
  const tick = () => { crew.update(dt, time += dt); sync(); };
  const clearBody = () => {
    const p = cave.root.position, feet = p.y - cave.baseY;
    return B.island.clearAt(p.x, feet + 1e-5, p.z, 0.295, cave.bodyHeight - 1e-5)
      && solids.clearAt(p.x, feet + 1e-5, p.z, 0.295, cave.bodyHeight - 1e-5);
  };
  const route = (target) => {
    cave.act.kind = "wander"; Object.assign(cave.act.spot, { ...target, ry: 0 });
    cave.walk = { tx: target.x, tz: target.z, speed: 1.7, phase: 0, heading: 0, to: "spot" };
  };
  const chooseLine = (hazard) => {
    let fallback = null;
    for (let i = 0; i < 64; i++) {
      const angle = i * Math.PI / 32, dx = Math.cos(angle), dz = Math.sin(angle);
      const from = { x: hazard.x - dx * 1.5, z: hazard.z - dz * 1.5 }, to = { x: hazard.x + dx * 1.5, z: hazard.z + dz * 1.5 };
      park(from.x, from.z, hazard.y);
      if (!clearBody() || !solids.clearAt(to.x, hazard.y + 1e-5, to.z, 0.295, cave.bodyHeight - 1e-5)
        || !B.island.clearAt(to.x, hazard.y + 1e-5, to.z, 0.295, cave.bodyHeight - 1e-5)) continue;
      H.npcPaths.target(cave, to.x, to.z);
      const direct = Math.hypot(cave.pathing.targetX - to.x, cave.pathing.targetZ - to.z) < 1e-6;
      const line = { from, to, dx, dz, direct };
      if (direct) return line;
      fallback ||= line;
    }
    if (!fallback) throw new Error("No clear opposite-side fire approach");
    return fallback;
  };
  const traverse = (hazard, line, name, reverse = false) => {
    const from = reverse ? line.to : line.from, to = reverse ? line.from : line.to;
    park(from.x, from.z, hazard.y); route(to);
    const beforeJumps = cave.avoidance.navigation.jumps;
    let frames = 0, burning = false, preserved = true, clear = true, minimumDistance = Infinity, lateral = 0, maximumStep = 0;
    let lastX = from.x, lastZ = from.z;
    while (cave.walk && !burning && frames++ < Math.ceil(15 / dt)) {
      tick();
      const p = cave.root.position, dx = p.x - lastX, dz = p.z - lastZ, length = dx * dx + dz * dz;
      const t = length ? Math.max(0, Math.min(1, ((hazard.x - lastX) * dx + (hazard.z - lastZ) * dz) / length)) : 0;
      minimumDistance = Math.min(minimumDistance, Math.hypot(lastX + dx * t - hazard.x, lastZ + dz * t - hazard.z));
      lateral = Math.max(lateral, Math.abs((p.x - hazard.x) * line.dz - (p.z - hazard.z) * line.dx));
      maximumStep = Math.max(maximumStep, Math.hypot(dx, dz));
      if (cave.walk) preserved &&= cave.walk.tx === to.x && cave.walk.tz === to.z;
      burning ||= cave.camp.burning; clear &&= clearBody(); lastX = p.x; lastZ = p.z;
    }
    return { name, lit: hazard.node.visible, arrived: !cave.walk, distance: Math.hypot(cave.root.position.x - to.x, cave.root.position.z - to.z),
      frames, burning, preserved, clear, minimumDistance, lateral, maximumStep, jumps: cave.avoidance.navigation.jumps - beforeJumps, direct: line.direct };
  };
  B.pilot.release(true);
  for (const actor of actors) actor.override = "working";
  crew.refreshStates(true);
  for (const actor of actors) { actor.root.visible = false; actor.walk = null; actor.act.kind = "idle"; actor.act.until = actor.nextBuildAt = Infinity; }
  for (const prop of scenery) prop.node.visible = false;
  sync();
  try {
    phase(0);
    const outdoorLine = chooseLine(outdoor), hearthLine = chooseLine(hearth), lit = [];
    for (const [hazard, line, name] of [[outdoor, outdoorLine, "outdoor"], [hearth, hearthLine, "headquarters"]]) {
      lit.push(traverse(hazard, line, name));
      lit.push(traverse(hazard, line, `${name} return`, true));
    }
    const query = {
      blocked: !H.solids.npcWalkable(hearth.x - 1.5, hearth.z, hearth.x + 1.5, hearth.z, hearth.y, cave.bodyHeight, cave),
      outward: H.solids.npcWalkable(hearth.x + 0.8, hearth.z, hearth.x + 1.1, hearth.z, hearth.y + 0.35, cave.bodyHeight, cave),
      inward: H.solids.npcWalkable(hearth.x + 0.8, hearth.z, hearth.x + 0.7, hearth.z, hearth.y + 0.35, cave.bodyHeight, cave),
      destination: H.solids.npcWalkable(hearth.x, hearth.z, hearth.x, hearth.z, hearth.y + 0.35, cave.bodyHeight, cave)
    };
    const escapeLine = { from: { x: hearth.x + 0.8, z: hearth.z }, to: { x: hearth.x + 1.6, z: hearth.z }, dx: 1, dz: 0, direct: true };
    const escape = traverse(hearth, escapeLine, "outward escape");
    park(outdoorLine.from.x, outdoorLine.from.z, outdoor.y); route(outdoor); tick();
    const rejected = { changed: !cave.walk || cave.walk.tx !== outdoor.x || cave.walk.tz !== outdoor.z,
      safe: !!cave.walk && Math.hypot(cave.walk.tx - outdoor.x, cave.walk.tz - outdoor.z) >= 1 && Math.hypot(cave.walk.tx - hearth.x, cave.walk.tz - hearth.z) >= 1 };

    phase(12);
    const unlit = traverse(outdoor, outdoorLine, "unlit outdoor");
    phase(0);
    park(outdoorLine.from.x, outdoorLine.from.z, outdoor.y); B.pilot.possess(cave);
    crew.steer(outdoorLine.dx, outdoorLine.dz, 0, 1, 0);
    for (let i = 0; i < Math.ceil(2 / dt) && !cave.camp.burning; i++) tick();
    crew.steer(0, 0);
    const player = { burning: cave.camp.burning, controlled: crew.player === cave,
      distance: Math.hypot(cave.root.position.x - outdoor.x, cave.root.position.z - outdoor.z),
      moved: Math.hypot(cave.root.position.x - outdoorLine.from.x, cave.root.position.z - outdoorLine.from.z) };
    return { backend: B.renderer.kind, dt, lit, query, escape, rejected, unlit, player };
  } finally {
    crew.steer(0, 0); B.pilot.release(true);
    for (const entry of saved) { entry.cave.override = entry.override; entry.cave.root.visible = entry.visible; }
    for (const prop of scenery) prop.node.visible = prop.visible;
    sync();
  }
};
