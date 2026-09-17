// Real player and voluntary NPC controllers on a clear solid support. Raising
// the fixture keeps authored trails and scattered props out of the encounter.
export const shoulderPassProbe = ({ dt = 1 / 60, firstPerson = false } = {}) => {
  const B = window.__ooga, BL = window.BL, S = BL.scene, scene = BL.scenes.hub, crew = B.crew, props = B.headquarters.solids.props;
  const actors = [...B.cavemen.values()], saved = actors.map((cave) => ({ cave, visible: cave.root.visible, override: cave.override }));
  const fixture = S.createNode(), floor = 12.1;
  S.addChild(fixture, S.createNode({ position: { x: 0, y: 12, z: 0 }, geometry: BL.models.box({ w: 24, h: 0.2, d: 24, color: "#665544" }) }));
  const walls = [-1, 1].map((side) => S.createNode({ position: { x: side * 0.8, y: floor + 2.5, z: 0 }, visible: false, geometry: BL.models.box({ w: 0.12, h: 5, d: 6, color: "#665544" }) }));
  S.addChild(fixture, ...walls); S.addChild(scene.root, fixture); props.add(fixture);
  const sync = () => { S.updateWorld(scene.root); props.sync(); };
  let time = B.renderOpts.matrix.time;
  const tick = () => { sync(); crew.update(dt, time += dt); sync(); };
  const step = (seconds) => { for (let i = 0; i < Math.ceil(seconds / dt); i++) tick(); };
  const place = (cave, x, z, yaw = 0) => {
    cave.root.visible = true; cave.root.quaternion = null;
    Object.assign(cave.root.position, { x, y: floor + cave.baseY, z });
    Object.assign(cave.root.rotation, { x: 0, y: yaw, z: 0 });
    Object.assign(cave.root.scale, { x: 1, y: 1, z: 1 });
    cave.parts.head.rotation.x = cave.parts.head.rotation.y = 0; cave.parts.head.quaternion = null;
    cave.state = "working"; cave.bedTravel.mode = ""; cave.walk = null;
    cave.hop = cave.hopV = cave.cheer = cave.catchT = cave.yawn = cave.viewLift = 0;
    cave.leap.vx = cave.leap.vz = cave.leap.land = 0; cave.cloudSupport = null;
    cave.act.kind = "idle"; cave.act.until = cave.nextBuildAt = cave.yawnAt = Infinity; cave.act.said = true;
    cave.avoidance.active = false; cave.avoidance.navigation.mode = 0; cave.avoidance.tx = NaN;
    if (cave.pathing) cave.pathing.tx = NaN;
    Object.assign(cave.shoulder, { other: null, phase: 0, rear: false, prop: false, propOffset: 0, amount: 0, yaw: 0, targetYaw: 0, attempted: false, motionX: 0, motionZ: 0, snapVX: 0, snapVZ: 0 });
    for (const node of cave.root.children) node.poseYaw = 0;
    crew.removeJetpack(cave); sync();
  };
  const [a, b] = actors;
  const wrap = (v) => Math.atan2(Math.sin(v), Math.cos(v));
  const measurePose = (cave) => {
    const p = cave.root.position, heading = cave.root.rotation.y, fx = Math.sin(heading), fz = Math.cos(heading), s = cave.shoulder;
    const arm = s.side > 0 ? cave.parts.armR : cave.parts.armL, opposite = s.side > 0 ? cave.parts.armL : cave.parts.armR;
    return { amount: s.amount, yaw: s.yaw, side: s.side,
      pullback: -((arm.world[12] - p.x) * fx + (arm.world[14] - p.z) * fz - arm.position.z),
      oppositeForward: (opposite.world[12] - p.x) * fx + (opposite.world[14] - p.z) * fz - opposite.position.z,
      headError: Math.abs(wrap(Math.atan2(cave.parts.head.world[8], cave.parts.head.world[10]) - heading - cave.parts.head.rotation.y)) };
  };
  const monitor = (left, right) => {
    const result = { samples: 0, minimumGap: Infinity, maximumStep: 0, clear: true, grounded: true, headError: 0, originalHeadError: 0, peakAmount: 0, peakYaw: 0, pullback: 0, oppositeForward: 0, side: 0, signedDeflection: 0, lateral: 0,
      rearPeakYaw: 0, rearPullback: 0, rearOppositeForward: 0, rearAlong: 0, rearSide: 0 };
    let lx = left.root.position.x, lz = left.root.position.z;
    const originX = lx, headHeading = Math.atan2(left.parts.head.world[8], left.parts.head.world[10]);
    const startsBehind = (right.root.position.x - lx) * Math.sin(left.root.rotation.y) + (right.root.position.z - lz) * Math.cos(left.root.rotation.y) < 0;
    let rearApproach = startsBehind;
    return { result, sample() {
      const p = left.root.position, q = right.root.position;
      result.samples++;
      result.minimumGap = Math.min(result.minimumGap, Math.hypot(p.x - q.x, p.z - q.z));
      result.maximumStep = Math.max(result.maximumStep, Math.hypot(p.x - lx, p.z - lz));
      result.lateral = Math.max(result.lateral, Math.abs(p.x - originX));
      for (const cave of [left, right]) {
        const v = cave.root.position, feet = v.y - cave.baseY;
        result.clear &&= props.clearAt(v.x, feet + 1e-5, v.z, 0.295, cave.bodyHeight - 1e-5);
        result.grounded &&= Math.abs(feet - floor) < 1e-6;
      }
      const pose = measurePose(left);
      result.headError = Math.max(result.headError, pose.headError);
      if (left.shoulder.phase === 1 && (!startsBehind || rearApproach)) result.originalHeadError = Math.max(result.originalHeadError, Math.abs(wrap(Math.atan2(left.parts.head.world[8], left.parts.head.world[10]) - headHeading)));
      result.peakAmount = Math.max(result.peakAmount, pose.amount);
      if (Math.abs(pose.yaw) > result.peakYaw) {
        result.peakYaw = Math.abs(pose.yaw);
        result.pullback = pose.pullback; result.oppositeForward = pose.oppositeForward;
        result.side = pose.side; result.signedDeflection = p.x - originX;
      }
      const heading = left.root.rotation.y, along = (q.x - p.x) * Math.sin(heading) + (q.z - p.z) * Math.cos(heading);
      if (along >= 0) rearApproach = false;
      if (rearApproach && left.walk && along < -0.05 && Math.abs(pose.yaw) > result.rearPeakYaw) {
        result.rearPeakYaw = Math.abs(pose.yaw); result.rearPullback = pose.pullback;
        result.rearOppositeForward = pose.oppositeForward; result.rearAlong = along; result.rearSide = pose.side;
      }
      lx = p.x; lz = p.z;
    } };
  };
  const startWalk = (cave, x, z, speed) => {
    cave.act.kind = "wander";
    Object.assign(cave.act.spot, { x, z, ry: cave.root.rotation.y });
    cave.walk = { tx: x, tz: z, speed, phase: 0, heading: cave.root.rotation.y, to: "spot" };
  };
  try {
    B.pilot.release(true);
    for (const cave of actors) cave.override = "working";
    crew.refreshStates(true);
    for (const cave of actors) cave.root.visible = false;
    place(a, 0, -2.5); place(b, 0, 0);
    B.pilot.possess(a);
    if (firstPerson) { B.pilot.enterClose(); B.pilot.update(1); }
    const stationary = [];
    for (const offset of [0, 0.2, -0.2, 0.58, -0.58, 0.95]) {
      place(a, 0, -2.5); place(b, offset, 0);
      const tracked = monitor(a, b), initialX = b.root.position.x, initialZ = b.root.position.z;
      crew.steer(0, 1, firstPerson ? 1 : 0, 1, 0);
      let stationaryTravel = 0, stationaryYaw = 0;
      for (let i = 0; i < Math.ceil(1.3 / dt); i++) {
        tick(); tracked.sample();
        stationaryTravel = Math.max(stationaryTravel, Math.hypot(b.root.position.x - initialX, b.root.position.z - initialZ));
        stationaryYaw = Math.max(stationaryYaw, Math.abs(b.shoulder.yaw));
      }
      crew.steer(0, 0);
      stationary.push({ offset, approach: "rear", ...tracked.result, passed: a.root.position.z > 2, lineError: Math.abs(a.root.position.x), finalYaw: Math.abs(a.shoulder.yaw), stationaryTravel, stationaryYaw });
    }

    place(a, 0, -2.5); place(b, 0, 0);
    crew.steer(0, 1, firstPerson ? 1 : 0, 1, 0);
    for (let i = 0; i < Math.ceil(1 / dt) && Math.abs(a.root.position.x) < 0.25; i++) tick();
    const activeBeforeStop = a.shoulder.phase === 1 && Math.abs(a.root.position.x) > 0.2;
    crew.steer(0, 0);
    const stopped = { x: a.root.position.x, z: a.root.position.z, yaw: a.shoulder.yaw };
    step(0.4);
    const drift = Math.hypot(a.root.position.x - stopped.x, a.root.position.z - stopped.z), idleYawChange = Math.abs(a.shoulder.yaw - stopped.yaw);
    crew.steer(0, 1, firstPerson ? 1 : 0, 1, 0); step(1.1); crew.steer(0, 0);
    const release = { activeBeforeStop, drift, idleYawChange, resumed: a.root.position.z > 2, lineError: Math.abs(a.root.position.x - stopped.x), finalYaw: Math.abs(a.shoulder.yaw) };

    const wallRows = [];
    for (const narrow of [false, true]) {
      walls[0].visible = true; walls[1].visible = narrow;
      walls[0].position.x = narrow ? -0.58 : -0.8; walls[1].position.x = 0.58;
      place(a, 0, -2.5); place(b, 0, 0);
      const tracked = monitor(a, b);
      crew.steer(0, 1, firstPerson ? 1 : 0, 1, 0);
      for (let i = 0; i < Math.ceil(1.1 / dt); i++) { tick(); tracked.sample(); }
      crew.steer(0, 0);
      wallRows.push({ narrow, ...tracked.result, finalX: a.root.position.x, finalZ: a.root.position.z });
      walls[0].visible = walls[1].visible = false; sync();
    }

    B.pilot.release(true);
    const pairs = [];
    for (const config of [
      // Destinations extend past the other actor's starting collision volume;
      // an occupied destination legitimately triggers routine replanning.
      { name: "head-on", ax: 0, bx: 0, az: -2.5, bz: 2.5, aGoal: 4, bGoal: -4, aSpeed: 1.7, bSpeed: 1.7 },
      { name: "offset head-on", ax: -0.22, bx: 0.22, az: -2.5, bz: 2.5, aGoal: 4, bGoal: -4, aSpeed: 1.7, bSpeed: 1.7 },
      { name: "overtake", ax: 0, bx: 0, az: -3, bz: -1, aGoal: 4, bGoal: 6, aSpeed: 2.8, bSpeed: 1.3 }
    ]) {
      place(a, config.ax, config.az); place(b, config.bx, config.bz, config.bGoal < config.bz ? Math.PI : 0);
      startWalk(a, config.ax, config.aGoal, config.aSpeed); startWalk(b, config.bx, config.bGoal, config.bSpeed);
      const left = monitor(a, b), right = monitor(b, a);
      let goalsPreserved = true, frames = 0;
      while ((a.walk || b.walk) && frames++ < Math.ceil(8 / dt)) {
        tick(); left.sample(); right.sample();
        if (a.walk) goalsPreserved &&= a.walk.tx === config.ax && a.walk.tz === config.aGoal;
        if (b.walk) goalsPreserved &&= b.walk.tx === config.bx && b.walk.tz === config.bGoal;
      }
      pairs.push({ name: config.name, frames, aSpeed: config.aSpeed, bSpeed: config.bSpeed, left: left.result, right: right.result, goalsPreserved,
        arrived: !a.walk && !b.walk, aError: Math.hypot(a.root.position.x - config.ax, a.root.position.z - config.aGoal), bError: Math.hypot(b.root.position.x - config.bx, b.root.position.z - config.bGoal) });
    }
    return { backend: B.renderer.kind, dt, firstPerson, stationary, release, walls: wallRows, pairs };
  } finally {
    crew.steer(0, 0); B.pilot.release(true);
    props.remove(fixture); S.removeChild(scene.root, fixture);
    for (const entry of saved) { entry.cave.override = entry.override; entry.cave.root.visible = entry.visible; }
    sync();
  }
};
