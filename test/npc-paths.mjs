// Real voluntary walking, with the paths changing underneath a route and a
// second Ooga occupying the trail. Path preference must never block arrival.
export const npcPathWalkingProbe = () => {
  const B = window.__ooga, BL = window.BL, S = BL.scene, scene = BL.scenes.hub;
  const actors = [...B.cavemen.values()], cave = actors.find((c) => c.state === "working"), blocker = actors.find((c) => c !== cave);
  const nav = B.headquarters.npcPaths, path = B.island.path, rows = [], dt = 1 / 30;
  const cage = S.createNode(), wall = BL.models.box({ w: 2.6, h: 1.2, d: 0.25, color: "#777777" });
  for (let n = 0; n < 4; n++) S.addChild(cage, S.createNode({ geometry: wall,
    position: { x: n < 2 ? 0 : n === 2 ? -1 : 1, y: 0.6, z: n < 2 ? n ? 1 : -1 : 0 }, rotation: { x: 0, y: n < 2 ? 0 : Math.PI / 2, z: 0 } }));
  cage.visible = false; S.addChild(scene.root, cage); B.headquarters.solids.props.add(cage);
  const original = scene.update; scene.update = () => {}; B.pilot.release(true); B.setPileLevel(100000);
  for (const prop of B.props) prop.node.visible = false;
  for (const c of actors) {
    c.root.visible = false; c.state = "working"; c.build = null; c.bedTravel.mode = "";
    c.walk = null; c.act.kind = "idle"; c.act.until = c.nextBuildAt = 1e12;
    c.hop = c.hopV = c.cheer = c.catchT = c.yawn = 0;
  }
  let time = B.renderOpts.matrix.time;
  try {
    for (const name of ["ring", "passing", "changed path", "fireplace", "jump recovery"]) {
      path.setRadius(B.altar.platformRadius);
      const r = path.debug.ringCenterRadius, tx = name === "fireplace" ? B.fireSeats[0].x : r, tz = name === "fireplace" ? B.fireSeats[0].z : 0;
      cave.root.visible = true; blocker.root.visible = false;
      Object.assign(cave.root.position, { x: -r, y: cave.baseY, z: 0 });
      cave.act.kind = "wander"; Object.assign(cave.act.spot, { x: tx, z: tz, ry: 0 });
      cave.walk = { tx, tz, speed: 1.7, phase: 0, heading: 0, to: "spot" };
      cave.avoidance.tx = NaN; cave.avoidance.navigation.mode = 0; cave.pathing.tx = NaN;
      cave.hop = cave.hopV = 0; cave.leap.vx = cave.leap.vz = 0;
      cage.visible = name === "jump recovery"; cage.position.x = -r;
      S.updateWorld(scene.root); B.headquarters.solids.props.sync();
      nav.target(cave, tx, tz);
      const plans = cave.pathing.plans, count = cave.pathing.count, storage = cave.pathing.route;
      const jumps = cave.avoidance.navigation.jumps;
      if (name === "passing") {
        const i = storage[Math.floor(count / 2)];
        Object.assign(blocker.root.position, { x: nav.xAt(i), y: blocker.baseY, z: nav.zAt(i) });
        blocker.root.visible = true; S.updateWorld(scene.root);
      }
      let frames = 0, onPath = 0, separation = Infinity, maximumStep = 0, maximumTurn = 0, midpointError = 0, heading = NaN, changed = false, recovered = false, intersections = 0, lastX = cave.root.position.x, lastZ = cave.root.position.z;
      while (cave.walk && !recovered && frames++ < 3600) {
        if (name === "changed path" && frames === 30) { path.setRadius(B.altar.platformRadius + 0.5); changed = true; }
        B.crew.update(dt, time += dt); S.updateWorld(scene.root); B.headquarters.solids.props.sync();
        const p = cave.root.position;
        if (name === "jump recovery") {
          const feet = p.y - cave.baseY;
          if (!B.headquarters.solids.props.clearAt(p.x, feet + 1e-5, p.z, 0.295, cave.bodyHeight - 1e-5)) intersections++;
          recovered = cave.hop === 0 && feet > 1.1 && Math.hypot(p.x + r, p.z) > 0.6;
        }
        if (B.island.isPath(p.x, p.z)) onPath++;
        if (blocker.root.visible) separation = Math.min(separation, Math.hypot(p.x - blocker.root.position.x, p.z - blocker.root.position.z));
        const step = Math.hypot(p.x - lastX, p.z - lastZ), angle = Math.atan2(p.x - lastX, p.z - lastZ);
        if (step > 0.03 && Number.isFinite(heading)) maximumTurn = Math.max(maximumTurn, Math.abs(Math.atan2(Math.sin(angle - heading), Math.cos(angle - heading))));
        if (step > 0.03) heading = angle;
        if (name === "ring") midpointError = Math.max(midpointError, Math.abs(Math.hypot(p.x, p.z) - r));
        maximumStep = Math.max(maximumStep, step); lastX = p.x; lastZ = p.z;
      }
      rows.push({ name, arrived: !cave.walk, distance: Math.hypot(cave.root.position.x - tx, cave.root.position.z - tz), frames,
        onPath: onPath / frames, separation: Number.isFinite(separation) ? separation : null, maximumStep, maximumTurn, midpointError, changed,
        replans: cave.pathing.plans - plans, jumps: cave.avoidance.navigation.jumps - jumps, recovered, intersections, count, stable: cave.pathing.route === storage && storage.length === nav.capacity });
    }
    return rows;
  } finally { B.headquarters.solids.props.remove(cage); S.removeChild(scene.root, cage); path.setRadius(B.altar.platformRadius); scene.update = original; }
};

export const npcCenterlineProbe = () => {
  const B = window.__ooga, scene = window.BL.scenes.hub, S = window.BL.scene;
  const nav = B.headquarters.npcPaths, path = B.island.path, actors = [...B.cavemen.values()], cave = actors.find((c) => c.state === "working"), rows = [];
  B.pilot.release(true); B.setPileLevel(100000);
  const update = scene.update; scene.update = () => {};
  for (const prop of B.props) prop.node.visible = false;
  for (const c of actors) { c.root.visible = false; c.state = "working"; c.bedTravel.mode = ""; c.walk = null; c.act.kind = "idle"; c.act.until = c.nextBuildAt = 1e12; }
  cave.root.visible = true;
  let time = B.renderOpts.matrix.time;
  try {
    for (let line = 0; line < path.centerlines.length; line++) {
      const points = [];
      for (const p of path.centerlines[line]) {
        const previous = points.at(-1) || p;
        const clear = Math.hypot(p.x, p.z) >= path.debug.ringCenterRadius + 0.5 && B.island.isPath(p.x, p.z) && B.island.surfaceAt(p.x, p.z) === 0 && B.headquarters.solids.npcWalkable(previous.x, previous.z, p.x, p.z, 0, cave.bodyHeight, cave);
        if (clear) points.push(p); else if (points.length) break;
      }
      if (points.length < 2) continue;
      const start = points[0], end = points.at(-1), r = path.debug.ringCenterRadius;
      Object.assign(cave.root.position, { x: 0, y: cave.baseY, z: -r }); cave.pathing.tx = NaN;
      nav.target(cave, end.x, end.z); const connected = cave.pathing.count > 0;
      Object.assign(cave.root.position, { x: start.x, y: cave.baseY + B.island.surfaceAt(start.x, start.z), z: start.z });
      cave.act.kind = "wander"; Object.assign(cave.act.spot, { x: end.x, z: end.z, ry: 0 });
      cave.walk = { tx: end.x, tz: end.z, speed: 1.7, phase: 0, heading: 0, to: "spot" };
      cave.hop = cave.hopV = 0; cave.avoidance.tx = cave.pathing.tx = NaN; cave.avoidance.navigation.mode = 0;
      S.updateWorld(scene.root); B.headquarters.solids.props.sync();
      let frames = 0, error = 0, onPath = 0, deviation = null;
      while (cave.walk && frames++ < 1800) {
        B.crew.update(1 / 30, time += 1 / 30); S.updateWorld(scene.root);
        const p = cave.root.position;
        if (B.island.isPath(p.x, p.z)) onPath++;
        let best = Infinity;
        for (let n = 1; n < points.length; n++) {
          const a = points[n - 1], b = points[n], dx = b.x - a.x, dz = b.z - a.z, length2 = dx * dx + dz * dz;
          const t = length2 ? Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.z - a.z) * dz) / length2)) : 0;
          best = Math.min(best, Math.hypot(p.x - a.x - dx * t, p.z - a.z - dz * t));
        }
        error = Math.max(error, best);
        if (!deviation && best > 0.3) deviation = { x: p.x, z: p.z, targetX: cave.pathing.targetX, targetZ: cave.pathing.targetZ, index: cave.pathing.index, count: cave.pathing.count, mode: cave.avoidance.navigation.mode, goalX: cave.walk?.tx, goalZ: cave.walk?.tz };
      }
      rows.push({ line, connected, arrived: !cave.walk, onPath: onPath / frames, error, frames, deviation, distance: Math.hypot(cave.root.position.x - end.x, cave.root.position.z - end.z) });
    }
    return { rows, lines: path.centerlines.length, nodes: nav.nodes, capacity: nav.capacity };
  } finally { scene.update = update; }
};

export const npcLowerTurnsProbe = () => {
  const B = window.__ooga, BL = window.BL, scene = BL.scenes.hub, actors = [...B.cavemen.values()], cave = actors.find((c) => c.state === "working"), rows = [];
  B.pilot.release(true);
  const update = scene.update; scene.update = () => {};
  for (const prop of B.props) prop.node.visible = false;
  for (const c of actors) { c.root.visible = false; c.state = "working"; c.bedTravel.mode = ""; c.walk = null; c.act.kind = "idle"; c.act.until = c.nextBuildAt = 1e12; c.hop = c.hopV = 0; }
  cave.root.visible = true;
  let time = B.renderOpts.matrix.time;
  try {
    for (const ramp of B.island.headquarters.ramps) for (const bed of B.headquarters.mattresses) for (const toBed of [true, false]) {
      const apron = B.island.mouths.find((m) => m.id === ramp.id).apron;
      const start = toBed ? apron : bed.walkAt, floor = toBed ? 0 : bed.room.floor;
      const route = B.headquarters.sleepNavigation.route(start.x, floor, start.z, bed, toBed, apron.x, apron.z);
      if (!route) { rows.push({ room: bed.roomIndex, ramp: ramp.id, missing: true }); continue; }
      Object.assign(cave.root.position, { x: start.x, y: cave.baseY + floor, z: start.z }); cave.state = toBed ? "sleeping" : "working"; cave.bedroll = toBed ? bed : null; cave.walk = null;
      cave.avoidance.tx = NaN; cave.avoidance.navigation.mode = 0;
      Object.assign(cave.bedTravel, { mode: "walk", route, index: 0, phase: 0, blocked: 0, toBed, bed });
      BL.scene.updateWorld(scene.root); B.headquarters.solids.props.sync();
      let frames = 0, collisions = 0, maximumTurn = 0, turnAt = null, heading = NaN, lastX = start.x, lastZ = start.z;
      while (cave.bedTravel.mode === "walk" && frames++ < 2400) {
        B.crew.update(1 / 30, time += 1 / 30);
        const p = cave.root.position, feet = p.y - cave.baseY, step = Math.hypot(p.x - lastX, p.z - lastZ), angle = Math.atan2(p.x - lastX, p.z - lastZ);
        if (cave.bedTravel.mode === "walk") {
          if (!B.island.clearAt(p.x, feet + 0.3, p.z, 0.295, cave.bodyHeight - 0.3)) collisions++;
          if (step > 0.03 && Number.isFinite(heading)) {
            const turn = Math.abs(Math.atan2(Math.sin(angle - heading), Math.cos(angle - heading)));
            if (turn > maximumTurn) { maximumTurn = turn; turnAt = { x: p.x, y: feet, z: p.z, index: cave.bedTravel.index, points: route.slice(Math.max(0, cave.bedTravel.index - 2), cave.bedTravel.index + 2) }; }
          }
          if (step > 0.03) heading = angle;
        }
        lastX = p.x; lastZ = p.z;
      }
      rows.push({ room: bed.roomIndex, basement: bed.basement, ramp: ramp.id, toBed, arrived: toBed ? cave.bedTravel.mode === "lie" : cave.bedTravel.mode === "", collisions, maximumTurn, turnAt, frames, points: route.length });
      cave.bedTravel.mode = ""; cave.state = "working";
    }
    return rows;
  } finally { scene.update = update; }
};
