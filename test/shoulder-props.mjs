// The real hub controllers pass copies of the shipped scenery on a clear
// support. Mesh holes and walkable steps must not become shoulder obstacles.
export const shoulderPropsProbe = ({ dt = 1 / 60, firstPerson = true } = {}) => {
  const B = window.__ooga, BL = window.BL, S = BL.scene, scene = BL.scenes.hub, crew = B.crew, solids = B.headquarters.solids.props;
  const actors = [...B.cavemen.values()], cave = actors[0], saved = actors.map((actor) => ({ actor, visible: actor.root.visible, override: actor.override }));
  const floor = 12.1, fixture = S.createNode(), rows = [];
  S.addChild(fixture, S.createNode({ position: { x: 0, y: 12, z: 0 }, geometry: BL.models.box({ w: 24, h: 0.2, d: 24, color: "#665544" }) }));
  // Select the actual right bench from the headquarters' merged room mesh.
  const room = BL.headquartersModels.room(), bench = { verts: [], faces: [] }, indices = new Map();
  for (const face of room.faces) {
    if (!face.i.every((i) => room.verts[i * 3] > 2)) continue;
    const remapped = face.i.map((i) => {
      if (!indices.has(i)) { indices.set(i, bench.verts.length / 3); bench.verts.push(room.verts[i * 3] - 2.6, room.verts[i * 3 + 1], room.verts[i * 3 + 2]); }
      return indices.get(i);
    });
    bench.faces.push({ ...face, i: remapped });
  }
  const shapes = [
    { name: "tree", geometry: BL.hubModels.tree(0) },
    { name: "rock", geometry: BL.hubModels.rock(0) },
    { name: "barrel", geometry: BL.hubModels.barrel() },
    { name: "bench", geometry: bench, control: true },
    { name: "rotated prop", geometry: BL.models.box({ w: 0.7, h: 1.6, d: 0.55, color: "#665544", offset: { y: 0.8 } }), rotation: { x: 0, y: 0.47, z: 0 }, scale: { x: 1.4, y: 1, z: 0.8 } },
    { name: "hollow arch", geometry: BL.hubModels.gate(), control: true },
    { name: "low step", geometry: BL.models.box({ w: 2, h: 0.2, d: 1, color: "#665544", offset: { y: 0.1 } }), control: true }
  ];
  for (const shape of shapes) {
    shape.node = S.createNode({ position: { x: 0, y: floor, z: 0 }, geometry: shape.geometry, visible: false,
      ...(shape.rotation ? { rotation: shape.rotation } : {}), ...(shape.scale ? { scale: shape.scale } : {}) });
    S.addChild(fixture, shape.node);
  }
  S.addChild(scene.root, fixture); solids.add(fixture);
  const sync = () => { S.updateWorld(scene.root); solids.sync(); };
  let time = B.renderOpts.matrix.time;
  const place = (x) => {
    cave.root.visible = true; cave.root.quaternion = null;
    Object.assign(cave.root.position, { x, y: floor + cave.baseY, z: -4 });
    Object.assign(cave.root.rotation, { x: 0, y: 0, z: 0 }); Object.assign(cave.root.scale, { x: 1, y: 1, z: 1 });
    cave.parts.head.rotation.x = cave.parts.head.rotation.y = 0; cave.parts.head.quaternion = null;
    cave.state = "working"; cave.bedTravel.mode = ""; cave.walk = cave.build = null;
    cave.hop = cave.hopV = cave.cheer = cave.catchT = cave.yawn = cave.viewLift = 0;
    cave.leap.vx = cave.leap.vz = cave.leap.land = 0; cave.cloudSupport = null;
    cave.act.kind = "idle"; cave.act.until = cave.nextBuildAt = cave.yawnAt = Infinity; cave.act.said = true;
    cave.avoidance.active = false; cave.avoidance.navigation.mode = 0; cave.avoidance.tx = cave.pathing.tx = NaN;
    Object.assign(cave.shoulder, { other: null, phase: 0, rear: false, prop: false, propOffset: 0, amount: 0, yaw: 0, targetYaw: 0, attempted: false, motionX: 0, motionZ: 0, snapVX: 0, snapVZ: 0 });
    for (const node of cave.root.children) node.poseYaw = 0;
    crew.removeJetpack(cave); sync();
  };
  const blocked = (x) => !solids.segmentClear(x, floor + BL.pilot.WALK.step, -3, x, floor + BL.pilot.WALK.step, 3, 0.3, cave.bodyHeight - BL.pilot.WALK.step);
  const edge = (side) => {
    let inside = 0, outside = 3;
    for (let i = 0; i < 22; i++) { const middle = (inside + outside) / 2; if (blocked(side * middle)) inside = middle; else outside = middle; }
    return outside;
  };
  const wrap = (v) => Math.atan2(Math.sin(v), Math.cos(v));
  try {
    B.pilot.release(true);
    for (const actor of actors) actor.override = "working";
    crew.refreshStates(true);
    for (const actor of actors) actor.root.visible = false;
    for (const shape of shapes) {
      shape.node.visible = true; sync();
      const leftEdge = edge(-1), rightEdge = edge(1);
      const paths = shape.name === "tree" ? [
        { name: "center", x: 0 }, { name: "left near", x: -leftEdge * 0.5 }, { name: "right near", x: rightEdge * 0.5 },
        { name: "left graze", x: -leftEdge + 0.05 }, { name: "right graze", x: rightEdge - 0.05 }
      ] : [{ name: "center", x: 0 }];
      for (const mode of ["player", "npc"]) for (const path of paths) {
        B.pilot.release(true); place(path.x);
        if (mode === "player") {
          B.pilot.possess(cave);
          if (firstPerson) { B.pilot.enterClose(); B.pilot.update(1); }
          crew.look(0, 0, firstPerson ? 1 : 0); sync();
          crew.steer(0, 1, firstPerson ? 1 : 0, 1, 0);
        } else {
          cave.act.kind = "wander"; Object.assign(cave.act.spot, { x: path.x, z: 4, ry: 0 });
          cave.walk = { tx: path.x, tz: 4, speed: 1.7, phase: 0, heading: 0, to: "spot" };
        }
        const row = { name: shape.name, path: path.name, mode, control: !!shape.control, blocked: blocked(path.x), frames: 0, clear: true, goalPreserved: true,
          peakYaw: 0, peakAmount: 0, side: 0, pullback: 0, oppositeForward: 0, deflection: 0, lateral: 0, originalHeadError: 0, maximumStep: 0, maximumLift: 0 };
        let lastX = cave.root.position.x, lastZ = cave.root.position.z;
        const headHeading = Math.atan2(cave.parts.head.world[8], cave.parts.head.world[10]);
        const limit = Math.ceil((mode === "player" ? 1.8 : 10) / dt);
        while (row.frames++ < limit && (mode === "player" || cave.walk)) {
          crew.update(dt, time += dt); sync();
          const p = cave.root.position, feet = p.y - cave.baseY, s = cave.shoulder;
          row.clear &&= solids.clearAt(p.x, feet + 1e-5, p.z, 0.295, cave.bodyHeight - 1e-5);
          row.maximumStep = Math.max(row.maximumStep, Math.hypot(p.x - lastX, p.z - lastZ));
          row.maximumLift = Math.max(row.maximumLift, feet - floor);
          row.lateral = Math.max(row.lateral, Math.abs(p.x - path.x));
          row.peakAmount = Math.max(row.peakAmount, s.amount);
          if (s.phase === 1) row.originalHeadError = Math.max(row.originalHeadError, Math.abs(wrap(Math.atan2(cave.parts.head.world[8], cave.parts.head.world[10]) - headHeading)));
          if (Math.abs(s.yaw) > row.peakYaw) {
            row.peakYaw = Math.abs(s.yaw); row.side = s.side; row.deflection = p.x - path.x;
            const arm = s.side > 0 ? cave.parts.armR : cave.parts.armL, opposite = s.side > 0 ? cave.parts.armL : cave.parts.armR;
            const heading = cave.root.rotation.y, fx = Math.sin(heading), fz = Math.cos(heading);
            row.pullback = -((arm.world[12] - p.x) * fx + (arm.world[14] - p.z) * fz - arm.position.z);
            row.oppositeForward = (opposite.world[12] - p.x) * fx + (opposite.world[14] - p.z) * fz - opposite.position.z;
          }
          if (cave.walk) row.goalPreserved &&= cave.walk.tx === path.x && cave.walk.tz === 4;
          lastX = p.x; lastZ = p.z;
        }
        crew.steer(0, 0);
        row.arrived = mode === "player" ? cave.root.position.z > 3 : !cave.walk;
        row.lineError = Math.abs(cave.root.position.x - path.x);
        row.targetError = mode === "npc" ? Math.hypot(cave.root.position.x - path.x, cave.root.position.z - 4) : 0;
        row.finalYaw = Math.abs(cave.shoulder.yaw); row.finalZ = cave.root.position.z;
        rows.push(row);
      }
      shape.node.visible = false; sync();
    }
    // Removing a registered group leaves the tracked mesh's parent pointer
    // intact. The encounter must still release on the very next moving frame.
    const removable = S.createNode({ position: { x: 0, y: floor, z: 0 } });
    const child = S.createNode({ geometry: BL.models.box({ w: 0.8, h: 2, d: 0.8, color: "#665544", offset: { y: 1 } }) });
    S.addChild(removable, child); S.addChild(fixture, removable); solids.add(removable);
    B.pilot.release(true); place(0); B.pilot.possess(cave);
    crew.look(0, 0, 1); sync(); crew.steer(0, 1, firstPerson ? 1 : 0, 1, 0);
    for (let i = 0; i < Math.ceil(1 / dt) && Math.abs(cave.root.position.x) < 0.25; i++) { crew.update(dt, time += dt); sync(); }
    const removal = { activeBefore: cave.shoulder.phase === 1 && cave.shoulder.prop && cave.shoulder.obstacle.node === child, outwardDrift: 0 };
    const removedAt = Math.abs(cave.root.position.x);
    solids.remove(removable); S.removeChild(fixture, removable); sync();
    removal.childStillParented = child.parent === removable;
    crew.update(dt, time += dt); sync();
    removal.released = cave.shoulder.phase !== 1;
    for (let i = 0; i < Math.ceil(1.1 / dt); i++) {
      removal.outwardDrift = Math.max(removal.outwardDrift, Math.abs(cave.root.position.x) - removedAt);
      crew.update(dt, time += dt); sync();
    }
    removal.lineError = Math.abs(cave.root.position.x); removal.passed = cave.root.position.z > 3;
    crew.steer(0, 0);
    const sensorNode = S.createNode({ position: { x: 5, y: floor, z: 0 }, geometry: BL.models.box({ w: 0.7, h: 1.4, d: 0.7, color: "#665544", offset: { y: 0.7 } }) });
    const beforeClear = solids.segmentClear(5, floor + 0.01, -2, 5, floor + 0.01, 2, 0.3, cave.bodyHeight);
    const beforeSupport = solids.supportAt(5, 0, floor + 3, floor, 0.3), out = {};
    S.addChild(fixture, sensorNode); solids.add(sensorNode, true); sync();
    const sensor = {
      hit: solids.shoulderAt(5, floor + BL.pilot.WALK.step, -2, 0, 1, 0.3, cave.bodyHeight - BL.pilot.WALK.step, 3, out) && out.node === sensorNode,
      collisionUnchanged: beforeClear && solids.segmentClear(5, floor + 0.01, -2, 5, floor + 0.01, 2, 0.3, cave.bodyHeight),
      supportUnchanged: solids.supportAt(5, 0, floor + 3, floor, 0.3) === beforeSupport
    };
    solids.remove(sensorNode); S.removeChild(fixture, sensorNode); sync();
    sensor.removed = !solids.shoulderAt(5, floor + BL.pilot.WALK.step, -2, 0, 1, 0.3, cave.bodyHeight - BL.pilot.WALK.step, 3, out);
    return { backend: B.renderer.kind, dt, firstPerson, benchFaces: bench.faces.length, sensor, removal, rows };
  } finally {
    crew.steer(0, 0); B.pilot.release(true);
    solids.remove(fixture); S.removeChild(scene.root, fixture);
    for (const entry of saved) { entry.actor.override = entry.override; entry.actor.root.visible = entry.visible; }
    sync();
  }
};
