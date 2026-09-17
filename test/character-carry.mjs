// Stack real Oogas on a clear slab, then drive the same player/NPC controllers
// used in the island. Physical offsets reveal update-order lag immediately.
export const characterCarryProbe = ({ dt = 1 / 60 } = {}) => {
  const B = window.__ooga, BL = window.BL, S = BL.scene, scene = BL.scenes.hub, crew = B.crew, props = B.headquarters.solids.props;
  const actors = [...B.cavemen.values()], saved = actors.map((cave) => ({ cave, visible: cave.root.visible, override: cave.override }));
  const fixture = S.createNode(), floor = 12.1, rows = [];
  const slab = S.createNode({ geometry: BL.models.box({ w: 24, h: 0.2, d: 24, color: "#665544" }), position: { x: 0, y: 12, z: 0 } });
  const wall = S.createNode({ geometry: BL.models.box({ w: 5, h: 2.5, d: 0.2, color: "#665544" }), visible: false });
  const ceiling = S.createNode({ geometry: BL.models.box({ w: 6, h: 0.2, d: 6, color: "#665544" }), visible: false });
  S.addChild(fixture, slab, wall, ceiling); S.addChild(scene.root, fixture); props.add(fixture);
  let time = B.renderOpts.matrix.time;
  const sync = () => { S.updateWorld(scene.root); props.sync(); };
  const tick = () => { sync(); crew.update(dt, time += dt); sync(); };
  const step = (seconds, sample = () => {}) => { const count = Math.ceil(seconds / dt); for (let i = 0; i < count; i++) { tick(); sample(); } return count * dt; };
  const feet = (cave) => cave.root.position.y - cave.baseY;
  const top = (cave) => feet(cave) + cave.bodyHeight;
  const place = (cave, x, y, z, yaw = 0.37) => {
    cave.root.visible = true; cave.root.quaternion = null;
    Object.assign(cave.root.position, { x, y: y + cave.baseY, z });
    Object.assign(cave.root.rotation, { x: 0, y: yaw, z: 0 }); Object.assign(cave.root.scale, { x: 1, y: 1, z: 1 });
    cave.state = "working"; cave.bedTravel.mode = ""; cave.bedTravel.route = null; cave.walk = cave.build = null;
    cave.hop = cave.hopV = cave.jumps = cave.cheer = cave.catchT = cave.yawn = cave.viewLift = 0;
    cave.leap.vx = cave.leap.vz = cave.leap.land = 0; cave.cloudSupport = null;
    cave.act.kind = "idle"; cave.act.until = cave.nextBuildAt = cave.yawnAt = Infinity; cave.act.said = true;
    cave.avoidance.active = false; cave.avoidance.navigation.mode = 0; cave.avoidance.tx = NaN;
    if (cave.pathing) cave.pathing.tx = NaN;
    if (cave.riding) cave.riding.support = null;
    Object.assign(cave.shoulder, { phase: 0, other: null, yaw: 0, targetYaw: 0, motionX: 0, motionZ: 0, snapVX: 0, snapVZ: 0 });
    for (const node of cave.root.children) node.poseYaw = 0;
    crew.removeJetpack(cave); sync();
  };
  const reset = () => {
    crew.steer(0, 0); B.pilot.release(true); wall.visible = ceiling.visible = false;
    for (const cave of actors) cave.root.visible = false;
    sync();
  };
  const land = (upper, lower, controlled = true, offset = 0.12) => {
    const p = lower.root.position;
    place(upper, p.x + offset, top(lower) + 1.5, p.z + 0.08);
    upper.hop = 1.5; upper.hopV = -1;
    if (controlled) B.pilot.possess(upper);
    let count = 0;
    while ((upper.hop > 0 || upper.hopV !== 0) && count++ < Math.ceil(3 / dt)) tick();
    tick();
    return Math.abs(feet(upper) - top(lower)) < 1e-6 && upper.hop === 0 && upper.hopV === 0;
  };
  const walk = (cave, x, z, speed = 1.7) => {
    cave.act.kind = "wander"; Object.assign(cave.act.spot, { x, z, ry: Math.atan2(x - cave.root.position.x, z - cave.root.position.z) });
    cave.walk = { tx: x, tz: z, speed, phase: 0, heading: cave.root.rotation.y, to: "spot" };
  };
  const monitor = (upper, lower) => {
    const p = upper.root.position, q = lower.root.position, x = p.x - q.x, z = p.z - q.z, yaw = upper.root.rotation.y;
    const result = { samples: 0, offsetError: 0, heightError: 0, yawError: 0, intersections: 0 };
    return { result, sample() {
      result.samples++;
      result.offsetError = Math.max(result.offsetError, Math.hypot(p.x - q.x - x, p.z - q.z - z));
      result.heightError = Math.max(result.heightError, Math.abs(feet(upper) - top(lower)));
      result.yawError = Math.max(result.yawError, Math.abs(upper.root.rotation.y - yaw));
      if (!props.clearAt(p.x, feet(upper) + 1e-5, p.z, 0.295, upper.bodyHeight - 1e-5)) result.intersections++;
    } };
  };
  const held = (result) => result.samples > 0 && result.offsetError < 1e-6 && result.heightError < 1e-6 && result.yawError < 1e-6 && result.intersections === 0;
  try {
    B.pilot.release(true);
    for (const cave of actors) cave.override = "working";
    crew.refreshStates(true);
    for (const order of [[0, 1], [1, 0]]) {
      reset(); const lower = actors[order[0]], upper = actors[order[1]];
      place(lower, 0, floor, -2, 0); const landed = land(upper, lower), check = monitor(upper, lower);
      let arrived = true;
      for (const [x, z] of [[0, 0.5], [2, 0.5]]) {
        walk(lower, x, z); let count = 0;
        while (lower.walk && count++ < Math.ceil(5 / dt)) { tick(); check.sample(); }
        arrived &&= !lower.walk && Math.hypot(lower.root.position.x - x, lower.root.position.z - z) < 1e-6;
        lower.act.until = Infinity;
      }
      const p = upper.root.position, stopX = p.x, stopZ = p.z; step(0.4, check.sample);
      const drift = Math.hypot(p.x - stopX, p.z - stopZ);
      rows.push({ name: `NPC turns and stops carry the controlled rider with roster order ${order.join("/")}`, ok: landed && arrived && held(check.result) && drift < 1e-9, landed, arrived, drift, ...check.result });
    }
    {
      reset(); const lower = actors[1], upper = actors[0]; place(lower, 0, floor, -2, 0); B.pilot.possess(lower);
      const landed = land(upper, lower, false), check = monitor(upper, lower), before = lower.root.position.z;
      crew.steer(0, 1, 1, 1, 0); const duration = step(0.4, check.sample); crew.steer(0, 0); step(0.2, check.sample);
      const travel = lower.root.position.z - before;
      rows.push({ name: "a player carrier transports an idle NPC at full walking speed", ok: landed && held(check.result) && Math.abs(travel - 7.75 * duration) < 1e-6, landed, travel, duration, ...check.result });
    }
    for (const limited of [false, true]) {
      reset(); const lower = actors[1], upper = actors[0]; place(lower, 0, floor, 0); B.pilot.possess(lower);
      const landed = land(upper, lower, false), check = monitor(upper, lower), initialTop = top(upper);
      ceiling.position.y = initialTop + 0.35; ceiling.visible = limited; sync();
      const jumped = crew.jumpPlayer(); let rise = 0, headroom = Infinity;
      step(1.3, () => { check.sample(); rise = Math.max(rise, feet(lower) - floor); headroom = Math.min(headroom, ceiling.position.y - 0.1 - top(upper)); });
      rows.push({ name: limited ? "a low ceiling limits the whole jumping stack without crushing its rider" : "a carrier's jump raises and lands its standing rider with it",
        ok: landed && jumped && held(check.result) && (limited ? rise > 0.15 && rise <= 0.250001 && headroom >= -1e-6 : rise > 0.75)
          && Math.abs(feet(lower) - floor) < 1e-6 && lower.hop === 0 && upper.hop === 0,
        landed, jumped, limited, rise, headroom, ...check.result });
    }
    {
      reset(); const lower = actors[0], upper = actors[1]; place(lower, 0, floor, -2, 0); const landed = land(upper, lower);
      walk(lower, 0, 5); const p = upper.root.position, q = lower.root.position, x = p.x - q.x, z = p.z - q.z;
      crew.steer(0.1, 0, 1, 0, 0.1); const duration = step(0.25); crew.steer(0, 0);
      const ownTravel = p.x - q.x - x, carriedError = Math.abs(p.z - q.z - z), supported = Math.abs(feet(upper) - top(lower)) < 1e-6;
      rows.push({ name: "a rider's own steering adds to the carrier movement", ok: landed && supported && carriedError < 1e-6 && Math.abs(ownTravel - 0.775 * duration) < 1e-6, ownTravel, duration, carriedError, supported });
      crew.steer(1, 0, 1, 0, 1); step(0.3); crew.steer(0, 0);
      const separation = Math.hypot(p.x - q.x, p.z - q.z), dropStart = feet(upper); step(1.5);
      rows.push({ name: "walking off a moving character releases support and lands normally", ok: separation > 0.68 && feet(upper) < dropStart && Math.abs(feet(upper) - floor) < 1e-6 && upper.hop === 0, separation, dropStart, feet: feet(upper), hop: upper.hop });
    }
    {
      reset(); const lower = actors[0], upper = actors[1]; place(lower, 0, floor, -2, 0); const landed = land(upper, lower);
      walk(lower, 0, 4); step(0.2); const x = upper.root.position.x, z = upper.root.position.z, lowerZ = lower.root.position.z;
      const jumped = crew.jumpPlayer(); step(0.1);
      const drift = Math.hypot(upper.root.position.x - x, upper.root.position.z - z), rise = feet(upper) - top(lower), lowerTravel = lower.root.position.z - lowerZ;
      rows.push({ name: "jumping off immediately releases inherited horizontal motion", ok: landed && jumped && drift < 1e-6 && rise > 0.2 && lowerTravel > 0.1 && upper.hopV > 0, landed, jumped, drift, rise, lowerTravel });
    }
    {
      reset(); const lower = actors[0], upper = actors[1]; place(lower, 0, floor, -2, 0); const landed = land(upper, lower);
      Object.assign(wall.position, { x: 0, y: top(lower) + 0.05 + 1.25, z: 0.5 }); wall.visible = true; sync(); walk(lower, 0, 3);
      let intersections = 0, blocked = false, maximumZ = -Infinity;
      step(3.2, () => {
        const p = upper.root.position;
        if (!props.clearAt(p.x, feet(upper) + 1e-5, p.z, 0.295, upper.bodyHeight - 1e-5)) intersections++;
        if (feet(upper) + upper.bodyHeight > wall.position.y - 1.25 + 1e-6) maximumZ = Math.max(maximumZ, p.z);
        if (lower.root.position.z - p.z > 0.3) blocked = true;
      });
      rows.push({ name: "an obstruction at rider height blocks carrying without penetrating the wall", ok: landed && intersections === 0 && blocked && maximumZ <= 0.105 && lower.root.position.z > 2.5,
        landed, intersections, blocked, maximumZ, lowerZ: lower.root.position.z, upperZ: upper.root.position.z });
    }
    for (const kind of ["hidden", "teleported"]) {
      reset(); const lower = actors[0], upper = actors[1]; place(lower, 0, floor, 0); const landed = land(upper, lower), before = feet(upper), x = upper.root.position.x, z = upper.root.position.z;
      if (kind === "hidden") lower.root.visible = false; else lower.root.position.x += 3;
      tick(); const fall = before - feet(upper), expected = BL.pilot.WALK.gravity * dt * dt, drift = Math.hypot(upper.root.position.x - x, upper.root.position.z - z);
      rows.push({ name: `${kind} carriers release the rider to gravity without dragging them`, ok: landed && Math.abs(fall - expected) < 1e-6 && drift < 1e-9 && upper.hopV < 0, fall, expected, drift, velocity: upper.hopV });
    }
    for (const order of [[0, 1, 2], [2, 1, 0]]) {
      reset(); const lower = actors[order[0]], middle = actors[order[1]], upper = actors[order[2]];
      place(lower, 0, floor, -2, 0); const middleLanded = land(middle, lower, false, 0), upperLanded = land(upper, middle, true, 0);
      const a = monitor(middle, lower), b = monitor(upper, middle); walk(lower, 0, 1);
      step(1, () => { a.sample(); b.sample(); });
      rows.push({ name: `three-character stacks propagate carrier movement with roster order ${order.join("/")}`,
        ok: middleLanded && upperLanded && held(a.result) && held(b.result) && lower.root.position.z > -0.4, middleLanded, upperLanded, lowerZ: lower.root.position.z, middle: a.result, upper: b.result });
    }
    {
      reset(); const lower = actors[2], middle = actors[1], upper = actors[0];
      place(lower, 0, floor, -2, 0); const middleLanded = land(middle, lower, true, 0);
      // Start behind the lower Ooga so one full-speed step stays on its head.
      middle.root.position.z = lower.root.position.z - 0.4; sync();
      const upperLanded = land(upper, middle, false, 0), check = monitor(upper, middle);
      const lowerZ = lower.root.position.z, middleZ = middle.root.position.z, upperZ = upper.root.position.z;
      walk(lower, 0, 4); crew.steer(0, 1, 1, 1, 0); tick(); check.sample(); crew.steer(0, 0);
      const lowerTravel = lower.root.position.z - lowerZ, middleTravel = middle.root.position.z - middleZ, upperTravel = upper.root.position.z - upperZ;
      rows.push({ name: "a top rider inherits both lower walking and the middle player's own full-speed step",
        ok: middleLanded && upperLanded && held(check.result) && Math.abs(lowerTravel - 1.7 * dt) < 1e-6
          && Math.abs(middleTravel - 9.45 * dt) < 1e-6 && Math.abs(upperTravel - middleTravel) < 1e-6 && Math.abs(feet(middle) - top(lower)) < 1e-6,
        middleLanded, upperLanded, lowerTravel, middleTravel, upperTravel, ...check.result });
    }
    {
      reset(); const lower = actors[1], upper = actors[0];
      place(lower, 0, floor + 50, 0); lower.hop = 50; lower.hopV = -20;
      place(upper, 0.12, top(lower), 0.08); B.pilot.possess(upper);
      const check = monitor(upper, lower); let landingStep = 0, landingSpeed = 0, count = 0;
      while ((lower.hop > 0 || lower.hopV !== 0) && count++ < Math.ceil(4 / dt)) {
        const previous = feet(lower), velocity = lower.hopV; tick(); check.sample();
        if (lower.hop === 0) { landingStep = previous - feet(lower); landingSpeed = Math.abs(velocity); }
      }
      step(0.2, check.sample);
      rows.push({ name: "a fast-falling carrier keeps its rider attached through the landing frame",
        ok: held(check.result) && landingSpeed > 30 && landingStep > 0 && (dt < 0.02 || landingStep > 0.65)
          && Math.abs(feet(lower) - floor) < 1e-6 && lower.hop === 0 && lower.hopV === 0 && upper.hop === 0 && upper.hopV === 0,
        landingStep, landingSpeed, lowerFeet: feet(lower), upperFeet: feet(upper), ...check.result });
    }
    return { backend: B.renderer.kind, dt, rows };
  } finally {
    crew.steer(0, 0); B.pilot.release(true); props.remove(fixture); S.removeChild(scene.root, fixture);
    for (const entry of saved) { entry.cave.root.visible = entry.visible; entry.cave.override = entry.override; }
    sync();
  }
};
