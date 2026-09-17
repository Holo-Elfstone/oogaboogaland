export const firePanicProbe = ({ dt = 1 / 60 } = {}) => {
  const B = window.__ooga, BL = window.BL, scene = BL.scenes.hub, crew = B.crew, S = BL.scene;
  const H = B.headquarters, nav = H.npcPaths, path = B.island.path, solids = H.solids.props;
  const actors = [...B.cavemen.values()], saved = actors.map((cave) => ({ cave, override: cave.override, visible: cave.root.visible }));
  const props = B.props.map((prop) => ({ node: prop.node, visible: prop.node.visible }));
  let time = B.renderOpts.matrix.time;
  for (let i = 0; i < Math.ceil(2 / dt); i++) scene.update(dt, time += dt);
  B.pilot.release(true);
  for (const cave of actors) cave.override = "working";
  crew.refreshStates(true);
  const park = (cave, x, z, y = 0) => {
    cave.root.visible = true; cave.root.quaternion = null;
    Object.assign(cave.root.position, { x, y: y + cave.baseY, z });
    cave.root.rotation.x = cave.root.rotation.y = cave.root.rotation.z = 0;
    cave.hop = cave.hopV = cave.cheer = cave.catchT = cave.yawn = 0;
    cave.leap.vx = cave.leap.vz = 0;
    cave.walk = null; cave.bedTravel.mode = ""; cave.avoidance.navigation.mode = 0;
    cave.act.kind = "idle"; cave.act.until = cave.nextBuildAt = cave.yawnAt = Infinity; cave.act.said = true;
    cave.pathing.tx = NaN;
    Object.assign(cave.camp.panic, { active: false, threat: null, remembered: false, resumeWalk: null, resumeSleep: false });
    cave.camp.panic.memory.fill(0);
  };
  for (const cave of actors) { park(cave, -12, -6); cave.root.visible = false; }
  for (const prop of props) prop.node.visible = false;
  S.updateWorld(scene.root); solids.sync();
  const tick = () => crew.update(dt, time += dt);
  const step = (seconds) => { for (let i = 0; i < Math.ceil(seconds / dt); i++) tick(); };
  let pathCalls = 0, wall = null, watched = null;
  const target = nav.target;
  nav.target = (...args) => { if (args[0] === watched) pathCalls++; return target(...args); };
  const removeWall = () => { if (wall) { solids.remove(wall); S.removeChild(scene.root, wall); wall = null; } };
  const addWall = (x, z, nx, nz, width = 2.5) => {
    removeWall();
    wall = S.createNode({ position: { x, y: 1.5, z }, rotation: { x: 0, y: Math.atan2(nx, nz), z: 0 }, geometry: BL.models.box({ w: width, h: 3, d: 0.08, color: "#655848" }) });
    S.addChild(scene.root, wall); solids.add(wall); solids.sync();
  };
  const checkBody = (cave) => {
    const p = cave.root.position, feet = p.y - cave.baseY;
    return B.island.clearAt(p.x, feet + 0.3, p.z, 0.295, cave.bodyHeight - 0.3)
      && solids.clearAt(p.x, feet + 1e-5, p.z, 0.295, cave.bodyHeight - 1e-5)
      && Math.abs(feet - B.island.supportAt(p.x, p.z, feet, 0.6, -120, 0.3)) < 0.03;
  };
  const walk = (cave, spot, speed) => {
    cave.act.kind = "wander";
    cave.walk = { tx: spot.x + spot.tx * 3, tz: spot.z + spot.tz * 3, speed, phase: 0, heading: 0, to: "spot" };
  };
  try {
    let spot = null;
    for (const line of path.centerlines) {
      for (let i = 1; i < line.length && !spot; i++) {
        const a = line[i - 1], b = line[i], length = Math.hypot(b.x - a.x, b.z - a.z);
        if (length < 0.01) continue;
        const x = (a.x + b.x) / 2, z = (a.z + b.z) / 2, tx = (b.x - a.x) / length, tz = (b.z - a.z) / length;
        if (Math.hypot(x, z) < path.debug.ringCenterRadius + 2 || Math.hypot(x, z) > 17 || !B.island.isPath(x, z)) continue;
        for (const sign of [-1, 1]) {
          const nx = tz * sign, nz = -tx * sign;
          let clear = true;
          for (const distance of [-2, 0, 1, 2, 3.5]) {
            const px = x + nx * distance, pz = z + nz * distance;
            clear &&= Math.abs(B.island.surfaceAt(px, pz)) < 1e-6 && B.island.clearAt(px, 0.01, pz, 0.3, actors[0].bodyHeight) && solids.clearAt(px, 0.01, pz, 0.3, actors[0].bodyHeight);
          }
          if (clear && !B.island.isPath(x + nx * 2, z + nz * 2)) { spot = { x, z, tx, tz, nx, nz }; break; }
        }
      }
      if (spot) break;
    }
    if (!spot) throw new Error("No clear flat path edge for the panic fixture");

    const reactions = [];
    let ordinarySpeed = 0;
    for (let index = 0; index < actors.length; index++) {
      const cave = actors[index], speed = index ? 1.6 : 1.7;
      watched = cave;
      park(cave, spot.x, spot.z); walk(cave, spot, speed);
      if (index === 0) {
        let travel = 0;
        const frames = Math.ceil(0.3 / dt);
        for (let i = 0; i < frames; i++) { const p = cave.root.position, x = p.x, z = p.z; tick(); travel += Math.hypot(p.x - x, p.z - z); }
        ordinarySpeed = travel / (frames * dt);
        park(cave, spot.x, spot.z); walk(cave, spot, speed);
      }
      const plans = pathCalls;
      crew.ignite(cave);
      const delay = cave.camp.reactionDelay, panicSpeed = cave.camp.panic.speed;
      let travel = 0, firstTravel = 0, firstTime = 0, clear = true, frames = 0;
      while (!cave.camp.rolling && frames++ < Math.ceil(16 / dt)) {
        const p = cave.root.position, x = p.x, z = p.z;
        tick();
        if (!cave.camp.rolling) {
          const moved = Math.hypot(p.x - x, p.z - z);
          travel += moved; clear &&= checkBody(cave);
          if (firstTime < 0.3 - 1e-6) { firstTravel += moved; firstTime += dt; }
        }
      }
      const age = cave.camp.burnAge, coverage = Array.from(cave.camp.spread), began = cave.camp.rolling;
      const graphCalls = pathCalls - plans;
      step(3.1);
      const out = !cave.camp.burning && !cave.camp.rolling && !cave.camp.panic.active;
      step(1.6);
      const resumed = !!cave.walk || !!cave.bedTravel.mode || cave.act.kind !== "idle" || Number.isFinite(cave.act.until);
      reactions.push({ delay, age, speed, panicSpeed, firstSpeed: firstTime ? firstTravel / firstTime : 0, travel, clear, graphCalls, coverage, began, out, resumed });
      cave.root.visible = false;
    }

    const source = actors[0], bystander = actors[1];
    watched = bystander;
    park(source, spot.x - spot.nx * 2, spot.z - spot.nz * 2);
    B.pilot.possess(source);
    park(bystander, spot.x, spot.z); walk(bystander, spot, 1.7);
    crew.ignite(source);
    const sourceX = source.root.position.x, sourceZ = source.root.position.z, firstDistance = Math.hypot(bystander.root.position.x - sourceX, bystander.root.position.z - sourceZ), plans = pathCalls;
    let fleeTravel = 0, fleeClear = true;
    const fleeFrames = Math.ceil(0.6 / dt);
    for (let i = 0; i < fleeFrames; i++) {
      const p = bystander.root.position, x = p.x, z = p.z; tick();
      fleeTravel += Math.hypot(p.x - x, p.z - z); fleeClear &&= checkBody(bystander);
    }
    const flee = { active: bystander.camp.panic.active, unburned: !bystander.camp.burning, speed: fleeTravel / (fleeFrames * dt), expectedSpeed: 3.4,
      gained: Math.hypot(bystander.root.position.x - sourceX, bystander.root.position.z - sourceZ) - firstDistance,
      offPath: !B.island.isPath(bystander.root.position.x, bystander.root.position.z), graphCalls: pathCalls - plans, clear: fleeClear,
      playerHeld: crew.player === source && !source.camp.panic.active && Math.hypot(source.root.position.x - sourceX, source.root.position.z - sourceZ) < 1e-6 };

    // Place an impassable wall across the escape heading and require a
    // physical detour while the source remains on the same clear side.
    park(bystander, spot.x, spot.z);
    addWall(spot.x + spot.nx * 0.8, spot.z + spot.nz * 0.8, spot.nx, spot.nz);
    const blocked = !solids.segmentClear(spot.x, 0.01, spot.z, spot.x + spot.nx * 1.6, 0.01, spot.z + spot.nz * 1.6, 0.3, bystander.bodyHeight);
    let obstacleClear = true, detour = 0, obstacleTravel = 0;
    for (let i = 0; i < Math.ceil(1 / dt); i++) {
      const p = bystander.root.position, x = p.x, z = p.z; tick();
      obstacleTravel += Math.hypot(p.x - x, p.z - z);
      detour = Math.max(detour, Math.abs((p.x - spot.x) * spot.tx + (p.z - spot.z) * spot.tz));
      obstacleClear &&= checkBody(bystander);
    }
    const obstacle = { blocked, clear: obstacleClear, detour, travel: obstacleTravel, unburned: !bystander.camp.burning };
    removeWall();
    crew.dropRoll(source); step(3.2);
    const recovered = !bystander.camp.panic.active && !bystander.camp.burning && (!!bystander.walk || !!bystander.bedTravel.mode || Number.isFinite(bystander.act.until));

    step(1.3);
    park(bystander, spot.x, spot.z);
    crew.relocatePlayer({ x: spot.x - spot.nx * 2, y: 4, z: spot.z - spot.nz * 2 }, 0);
    crew.ignite(source); tick();
    const differentFloor = !bystander.camp.panic.active;
    crew.relocatePlayer({ x: spot.x - spot.nx * 2, y: 0, z: spot.z - spot.nz * 2 }, 0);
    addWall(spot.x - spot.nx, spot.z - spot.nz, spot.nx, spot.nz, 4);
    tick();
    const behindWall = !bystander.camp.panic.active;
    return { backend: B.renderer.kind, dt, spot, ordinarySpeed, reactions, flee, obstacle, recovered, separation: { differentFloor, behindWall } };
  } finally {
    nav.target = target; removeWall();
    for (const prop of props) prop.node.visible = prop.visible;
    for (const entry of saved) { entry.cave.override = entry.override; entry.cave.root.visible = entry.visible; }
    solids.sync();
  }
};
