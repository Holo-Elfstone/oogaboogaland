// Keep the effect pool still while the real controller crosses a prop's edge.
// The first unsupported frame must not leave a walking puff in midair.
export const drivenSmokeGroundProbe = ({ dt = 1 / 60 } = {}) => {
  const B = window.__ooga, BL = window.BL, S = BL.scene, scene = BL.scenes.hub, crew = B.crew, solids = B.headquarters.solids;
  const actors = [...B.cavemen.values()], cave = actors.find((actor) => actor.state === "working" && !actor.traits.gasMask && !actor.jet);
  const saved = actors.map((actor) => ({ actor, visible: actor.root.visible, override: actor.override })), update = scene.update;
  const origin = { x: cave.root.position.x, y: cave.root.position.y - cave.baseY, z: cave.root.position.z }, heading = cave.root.rotation.y;
  const floor = 12.1, rows = [], fixture = S.createNode({ position: { x: 0, y: 12, z: 0 }, geometry: BL.models.box({ w: 4, h: 0.2, d: 4, color: "#665544" }) });
  S.addChild(scene.root, fixture); solids.props.add(fixture);
  const sync = () => { S.updateWorld(scene.root); solids.props.sync(); };
  let time = B.renderOpts.matrix.time;
  const supported = (z) => Math.abs(solids.supportAt(0, z, floor, floor, cave) - floor) < 1e-6;
  const place = (z = 0, height = floor) => {
    crew.removeJetpack(cave); crew.relocatePlayer({ x: 0, y: height, z }, 0);
    cave.act.until = cave.nextBuildAt = cave.yawnAt = Infinity;
    cave.smoke = 0.55; sync();
  };
  const tick = (name) => {
    const p = cave.root.position, x = p.x, z = p.z, before = B.stats().particles;
    cave.smoke = 0.55;
    crew.update(dt, time += dt); sync();
    const feet = p.y - cave.baseY, support = solids.supportAt(p.x, p.z, feet, feet, cave);
    const row = { name, particles: B.stats().particles - before, travel: Math.hypot(p.x - x, p.z - z),
      feet, support, hop: cave.hop, velocity: cave.hopV, grounded: cave.hop === 0 && cave.hopV <= 0 && Math.abs(feet - support) < 1e-6 };
    rows.push(row); return row;
  };
  try {
    scene.update = () => {};
    B.pilot.release(true);
    for (const actor of actors) actor.override = "working";
    crew.refreshStates(true);
    for (const actor of actors) actor.root.visible = actor === cave;
    B.pilot.possess(cave); place();
    const idle = tick("idle"); idle.ok = idle.grounded && idle.travel === 0 && idle.particles === 0;
    crew.steer(0, 1, 1, 1, 0);
    const walking = tick("walking"); walking.ok = walking.grounded && walking.travel > 0 && walking.particles === 1;
    place(); crew.steer(0, 1, 1, 1, 0);
    const jumped = crew.jumpPlayer(), jump = tick("jumping");
    jump.ok = jumped && !jump.grounded && jump.velocity > 0 && jump.travel > 0 && jump.particles === 0;
    place(0, floor + 1);
    const equipped = !!crew.wearJetpack(cave, BL.hubModels.jetpack(), BL.hubModels.jetFlame());
    cave.jetFuel = 1; cave.jetRecovering = false; crew.thrust(true); crew.steer(0, 1, 1, 1, 0);
    // Exhaust has its own particles; postpone its next burst for this one tick.
    cave.jet.puff = 1;
    const jet = tick("jetpack"); jet.ok = equipped && !jet.grounded && cave.jet.spending && jet.travel > 0 && jet.particles === 0;
    place();
    let inside = 0, outside = 4;
    const bracketed = supported(inside) && !supported(outside);
    for (let i = 0; i < 24; i++) {
      const middle = (inside + outside) / 2;
      if (supported(middle)) inside = middle; else outside = middle;
    }
    // Probe the actual support footprint, including the actor's support radius.
    const start = inside - Math.min(0.02, BL.pilot.WALK.speed * dt / 4);
    place(start); const onEdge = supported(start); crew.steer(0, 1, 1, 1, 0);
    const ledge = tick("first ledge frame");
    ledge.ok = bracketed && onEdge && !ledge.grounded && ledge.hop > 0 && ledge.support < floor - 0.6 && ledge.travel > 0 && ledge.particles === 0;
    return { backend: B.renderer.kind, dt, floor, edge: inside, rows };
  } finally {
    crew.steer(0, 0); crew.thrust(false); crew.removeJetpack(cave); crew.relocatePlayer(origin, heading); B.pilot.release(true);
    solids.props.remove(fixture); S.removeChild(scene.root, fixture);
    for (const entry of saved) { entry.actor.override = entry.override; entry.actor.root.visible = entry.visible; }
    scene.update = update; sync();
  }
};
