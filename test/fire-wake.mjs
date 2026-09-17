export const fireWakeProbe = ({ dt = 1 / 60 } = {}) => {
  const B = window.__ooga, BL = window.BL, scene = BL.scenes.hub, crew = B.crew, floor = B.island.headquarters.floor;
  let time = B.renderOpts.matrix.time;
  const tick = () => scene.update(dt, time += dt);
  const step = (seconds) => { for (let i = 0; i < Math.ceil(seconds / dt); i++) tick(); };
  step(2); B.pilot.release(true);
  const actors = [...B.cavemen.values()], saved = actors.map((cave) => ({ cave, override: cave.override, visible: cave.root.visible }));
  for (const cave of actors) cave.override = "working";
  crew.refreshStates(true);
  for (const cave of actors) { cave.root.visible = false; cave.walk = null; cave.act.kind = "idle"; cave.act.until = cave.nextBuildAt = Infinity; }
  const [airborne, player] = actors;
  const key = (type, value) => window.dispatchEvent(new KeyboardEvent(type, { key: value, bubbles: true, cancelable: true }));
  try {
    const airSpot = [12, 10, 14, -12, -10, -14].flatMap((x) => [-6, 6, -10, 10].map((z) => ({ x, z }))).find(({ x, z }) =>
      B.island.surfaceAt(x, z) === 0 && B.island.clearAt(x, 0.01, z, 0.3, 3 + airborne.bodyHeight)
      && B.headquarters.solids.props.clearAt(x, 0.01, z, 0.3, 3 + airborne.bodyHeight));
    if (!airSpot) throw new Error("No clear meadow column for the airborne wake fixture");
    airborne.root.visible = true;
    Object.assign(airborne.root.position, { x: airSpot.x, y: airborne.baseY + 3, z: airSpot.z });
    airborne.hop = 3; airborne.hopV = -1.25;
    airborne.override = "sleeping";
    crew.refreshStates();
    const landingRoute = airborne.state === "sleeping" && airborne.bedTravel.mode === "landing";
    const startY = airborne.root.position.y, velocity = airborne.hopV;
    const lit = crew.ignite(airborne), preservedY = Math.abs(airborne.root.position.y - startY), preservedVelocity = Math.abs(airborne.hopV - velocity);
    crew.update(dt, time += dt);
    const expectedVelocity = velocity - BL.pilot.WALK.gravity * dt, expectedY = startY + expectedVelocity * dt;
    const air = { landingRoute, lit, preservedY, preservedVelocity,
      gravityError: Math.abs(airborne.hopV - expectedVelocity), positionError: Math.abs(airborne.root.position.y - expectedY),
      stillAirborne: airborne.root.position.y - airborne.baseY > 2 && !airborne.camp.rolling,
      routeInterrupted: airborne.bedTravel.mode === "" && airborne.bedroll === null };
    airborne.root.visible = false;

    const bed = B.headquarters.mattresses.find((entry) => !entry.sleeper && !entry.basement);
    player.root.visible = true;
    B.pilot.possess(player); crew.relocatePlayer(bed.walkAt, 0);
    const admitted = crew.sleepPlayer(bed);
    step(1);
    const sleeping = crew.sleeping && player.override === "sleeping" && player.bedTravel.mode === "rest";
    const playerLit = crew.ignite(player);
    const awake = player.state === "working" && !crew.sleeping && player.bedroll === null && bed.sleeper === null;
    const overrideCleared = player.override !== "sleeping" && crew.stateOf(player) === "working";
    const controlledWhileBurning = crew.player === player && !player.camp.panic.active;
    crew.dropRoll(player); step(3.2);
    crew.refreshStates(true); step(0.1);
    const refreshKeptControl = crew.player === player && player.state === "working" && !crew.sleeping && !player.camp.burning && !player.camp.rolling;
    crew.relocatePlayer({ x: 1.3, y: floor, z: 2.8 }, 0);
    B.pilot.orbit.yaw = B.pilot.orbit.tYaw = 0;
    const x = player.root.position.x, z = player.root.position.z;
    key("keydown", "d"); step(0.15); key("keyup", "d");
    const movement = Math.hypot(player.root.position.x - x, player.root.position.z - z);
    return { backend: B.renderer.kind, dt, air, player: { admitted, sleeping, lit: playerLit, awake, overrideCleared, controlledWhileBurning, refreshKeptControl, movement } };
  } finally {
    key("keyup", "d");
    for (const entry of saved) { entry.cave.override = entry.override; entry.cave.root.visible = entry.visible; }
  }
};

export const labFireWakeProbe = ({ dt = 1 / 60 } = {}) => {
  const B = window.__ooga, scene = window.BL.scenes.lab, crew = B.crew;
  let time = 0;
  const tick = () => scene.update(dt, time += dt);
  const step = (seconds) => { for (let i = 0; i < Math.ceil(seconds / dt); i++) tick(); };
  step(2); crew.release();
  const actors = [...B.cavemen.values()], saved = actors.map((cave) => ({ cave, override: cave.override, visible: cave.root.visible }));
  for (const cave of actors) cave.override = "working";
  crew.refreshStates(true);
  for (const cave of actors) { cave.root.visible = false; cave.walk = null; cave.act.kind = "idle"; cave.act.until = cave.nextBuildAt = Infinity; }
  const cave = actors[0];
  try {
    cave.override = "sleeping"; crew.refreshStates(true);
    const initialBed = cave.bedroll, sleeping = cave.state === "sleeping" && initialBed?.sleeper === cave && cave.root.visible;
    const lit = crew.ignite(cave), woke = cave.state === "working" && cave.bedroll === null && initialBed.sleeper === null;
    const planted = Math.abs(cave.root.position.y - cave.baseY) < 1e-6;
    for (let i = 0; i < Math.ceil(16 / dt) && !cave.camp.rolling; i++) tick();
    const rolled = cave.camp.rolling;
    step(3.2);
    const bed = cave.bedroll, restored = cave.state === "sleeping" && !!bed && bed.sleeper === cave && !cave.camp.burning && !cave.camp.rolling && !cave.camp.panic.active;
    const pose = !!bed && Math.abs(cave.root.position.x - bed.x) < 1e-6 && Math.abs(cave.root.position.z - bed.z) < 1e-6
      && Math.abs(cave.root.position.y - (bed.y === undefined ? 0.42 : bed.y)) < 1e-6 && Math.abs(cave.root.rotation.z + Math.PI / 2) < 1e-6 && cave.parts.head.geometry === cave.headClosed;
    crew.refreshStates(true); step(0.1);
    const staysAsleep = cave.state === "sleeping" && cave.bedroll?.sleeper === cave && !cave.camp.burning;
    return { backend: B.renderer.kind, dt, sleeping, lit, woke, planted, rolled, restored, pose, staysAsleep };
  } finally {
    for (const entry of saved) { entry.cave.override = entry.override; entry.cave.root.visible = entry.visible; }
  }
};
