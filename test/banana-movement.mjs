// Real hub key routing, flight, and walking against the current mound mesh.
export const bananaMovementProbe = ({ firstPerson = false, dt = 1 / 60 } = {}) => {
  const B = window.__ooga, BL = window.BL, scene = BL.scenes.hub, cover = B.headquarters.bananaCover;
  const actors = [...B.cavemen.values()], cave = actors.find((entry) => entry.state === "working");
  const hidden = [], held = new Set(), rows = [];
  let time = B.renderOpts.matrix.time;
  const tick = (n = 1) => { for (let i = 0; i < n; i++) scene.update(dt, time += dt); };
  const key = (down, value) => { window.dispatchEvent(new KeyboardEvent(down ? "keydown" : "keyup", { key: value })); if (down) held.add(value); else held.delete(value); };
  const release = () => { for (const value of held) window.dispatchEvent(new KeyboardEvent("keyup", { key: value })); held.clear(); };
  const state = () => ({ x: cave.root.position.x, y: cave.root.position.y - cave.baseY, z: cave.root.position.z, hop: cave.hop, velocity: cave.hopV,
    jumps: cave.jumps, fuel: cave.jetFuel, equipped: !!cave.jet, thrust: !!cave.jet?.thrust, flame: !!cave.jet?.flame.visible,
    spending: !!cave.jet?.spending, inside: cover.contains(cave.root.position.x, cave.root.position.y - cave.baseY + 0.3, cave.root.position.z) });
  B.setPileLevel(100000); B.pilot.possess(cave);
  for (const entry of actors) if (entry !== cave) { hidden.push([entry.root, entry.root.visible]); entry.root.visible = false; }
  for (const prop of B.props) { hidden.push([prop.node, prop.node.visible]); prop.node.visible = false; }
  if (firstPerson) B.pilot.enterClose();
  const radius = B.altar.platformRadius, top = cover.heightAt(0, 0), outsideX = radius + 2;
  const place = (x, y, z) => {
    release(); B.crew.relocatePlayer({ x, y, z }, 0);
    const orbit = B.pilot.orbit; orbit.yaw = orbit.tYaw = 0; orbit.pitch = orbit.tPitch = 0;
    tick(2);
  };
  const walking = (name, x, y, z) => {
    place(x, y, z);
    const before = state(), frames = Math.round(0.2 / dt);
    key(true, "w"); tick(frames); key(false, "w");
    const after = state();
    rows.push({ name, before, after, speed: Math.hypot(after.x - before.x, after.z - before.z) / (frames * dt) });
  };
  try {
    B.crew.removeJetpack(cave); place(outsideX, B.island.surfaceAt(outsideX, 0), 0); tick(Math.ceil(1 / dt));
    walking("outside-walk", outsideX, B.island.surfaceAt(outsideX, 0), 0);
    walking("inside-walk", 0, 0.34, 0);
    walking("above-mound", 0, top + 4, 0);
    place(0, 0.34, 0);
    const grounded = state(); key(true, " "); tick(Math.round(0.2 / dt)); key(false, " ");
    const heldJump = state(); key(true, " "); tick(); key(false, " ");
    const freshJump = state(); key(true, " "); tick(); key(false, " ");
    const limitedJump = state();
    tick(Math.ceil(2 / dt));
    const landed = state(); key(true, " "); tick(); key(false, " ");
    rows.push({ name: "inside-jump", before: grounded, held: heldJump, fresh: freshJump, limited: limitedJump, landed, renewed: state() });
    place(outsideX, B.island.surfaceAt(outsideX, 0), 0); key(true, " "); tick(); key(false, " ");
    rows.push({ name: "outside-jump", ...state() });
    place(0, 0.34, 0); B.jetpack.grant(cave, true); cave.jetFuel = 0.6;
    const pack = cave.jet, fuel = cave.jetFuel;
    key(true, " "); tick(Math.round(0.2 / dt)); key(false, " ");
    rows.push({ name: "inside-ground-jet", ...state(), startFuel: fuel, samePack: cave.jet === pack });
    place(0, 0.34, 0); cave.hop = 0.6; cave.root.position.y += cave.hop; cave.hopV = 0; cave.jetFuel = 0.6;
    const airborne = state(); key(true, " "); key(true, "w"); tick(Math.round(0.2 / dt));
    const afterAir = state(); release();
    rows.push({ name: "inside-air-jet", before: airborne, after: afterAir, samePack: cave.jet === pack });
    place(0, 0.34, 0); cave.jetFuel = 0.6; key(true, " "); tick();
    // Preserve the actual held Space across an exit. Neither relocation nor
    // changing the pile should require unequipping/re-equipping the pack.
    B.crew.relocatePlayer({ x: outsideX, y: B.island.surfaceAt(outsideX, 0), z: 0 }, 0);
    tick(Math.round(0.2 / dt));
    rows.push({ name: "held-exit-jet", ...state(), samePack: cave.jet === pack });
    release(); key(true, " "); tick(Math.round(0.2 / dt)); key(false, " ");
    rows.push({ name: "outside-fresh-jet", ...state(), samePack: cave.jet === pack });
    for (const equipped of [false, true]) {
      if (!equipped) B.crew.removeJetpack(cave); else B.jetpack.grant(cave, true);
      const falls = [], rises = [];
      for (const x of [outsideX, 0]) {
        place(x, x ? B.island.surfaceAt(x, 0) : 0.34, 0);
        cave.hop = 1; cave.hopV = -4; cave.root.position.y += 1;
        const before = state(); tick(); const after = state();
        falls.push({ before, after, drop: before.y - after.y });
        place(x, x ? B.island.surfaceAt(x, 0) : 0.34, 0);
        cave.hop = 0.4; cave.hopV = 4; cave.root.position.y += 0.4;
        cave.jetFuel = 0.6; cave.jetRecovering = false;
        if (equipped) key(true, " ");
        const rising = state(); tick(); const risen = state(); release();
        rises.push({ before: rising, after: risen, rise: risen.y - rising.y });
      }
      rows.push({ name: "fall", equipped, falls });
      rows.push({ name: "rise", equipped, rises });
    }
    return { firstPerson, mode: B.pilot.mode, dt, radius, top, rows };
  } finally {
    release();
    for (const [node, visible] of hidden) node.visible = visible;
  }
};

// Only continuous crossings emit fruit: entering, resting, pile resizing and
// teleporting must not consume effects from the bounded exit-animation pool.
export const bananaExitProbe = ({ dt = 1 / 60 } = {}) => {
  const B = window.__ooga, BL = window.BL, scene = BL.scenes.hub, cover = B.headquarters.bananaCover;
  const actors = [...B.cavemen.values()], cave = actors.find((entry) => entry.state === "working"), hidden = [];
  const state = B.spillEffect.state, bursts = () => state.bursts, rows = [];
  let time = B.renderOpts.matrix.time;
  const sync = () => { BL.scene.updateWorld(scene.root); B.headquarters.solids.props.sync(); };
  const tick = () => { sync(); B.crew.update(dt, time += dt); sync(); };
  const inside = () => B.headquarters.solids.inBananas(cave);
  const place = (x, y, z) => { B.crew.relocatePlayer({ x, y, z }, 0); sync(); };
  B.setPileLevel(100000); B.pilot.possess(cave); B.crew.removeJetpack(cave);
  for (const entry of actors) if (entry !== cave) { hidden.push([entry.root, entry.root.visible]); entry.root.visible = false; }
  for (const prop of B.props) { hidden.push([prop.node, prop.node.visible]); prop.node.visible = false; }
  const outside = B.altar.platformRadius + 2, top = cover.heightAt(0, 0);
  try {
    place(0, 0.34, 0);
    let start = bursts(), frames = 0;
    B.crew.steer(1, 0);
    while (inside() && frames++ < 600) tick();
    rows.push({ name: "side", crossed: !inside(), frames, bursts: bursts() - start, active: state.active });
    start = bursts();
    for (let n = 0; n < 20; n++) tick();
    rows.push({ name: "outside", bursts: bursts() - start });
    place(0, top - 0.12, 0); cave.hopV = 4;
    start = bursts(); frames = 0;
    const beganInside = inside();
    while (inside() && frames++ < 60) tick();
    rows.push({ name: "top", beganInside, crossed: !inside(), frames, bursts: bursts() - start, velocity: cave.hopV });
    start = bursts(); place(0, 0.34, 0); tick();
    place(outside, B.island.surfaceAt(outside, 0), 0); tick();
    rows.push({ name: "teleport", bursts: bursts() - start });
    place(B.altar.platformRadius * 0.7, 0.34, 0);
    const beforeShrink = inside(); start = bursts(); B.setPileLevel(302); tick();
    rows.push({ name: "shrink", before: beforeShrink, after: inside(), bursts: bursts() - start });
    B.setPileLevel(100000); place(0, 0.34, 0); start = bursts();
    for (let n = 0; n < 30; n++) tick();
    rows.push({ name: "rest", inside: inside(), bursts: bursts() - start });
    // The same crossing hook runs after autonomous walking, not just when
    // this character is under keyboard control.
    B.pilot.release(true); cave.act.kind = "idle"; cave.act.until = 1e12; cave.nextBuildAt = 1e12;
    cave.walk = { tx: outside, tz: 0, speed: 2, phase: 0, heading: Math.PI / 2, to: "spot" };
    cave.act.spot.x = outside; cave.act.spot.z = 0; cave.act.spot.ry = Math.PI / 2;
    start = bursts(); frames = 0;
    while (inside() && frames++ < 600) tick();
    rows.push({ name: "npc", crossed: !inside(), frames, bursts: bursts() - start });
    return { backend: B.renderer.kind, rows, active: state.active, capacity: state.capacity };
  } finally {
    B.crew.steer(0, 0);
    for (const [node, visible] of hidden) node.visible = visible;
  }
};

// Non-player routes detour around the mound. A character already within it
// can still leave, moving at half its usual walking speed until clear.
export const bananaNpcMovementProbe = ({ dt = 1 / 60 } = {}) => {
  const B = window.__ooga, BL = window.BL, S = BL.scene, scene = BL.scenes.hub, cover = B.headquarters.bananaCover;
  const actors = [...B.cavemen.values()], cave = actors.find((entry) => entry.state === "working"), hidden = [];
  B.pilot.release(true); B.setPileLevel(100000);
  for (const entry of actors) if (entry !== cave) { hidden.push([entry.root, entry.root.visible]); entry.root.visible = false; }
  for (const prop of B.props) { hidden.push([prop.node, prop.node.visible]); prop.node.visible = false; }
  const radius = B.altar.platformRadius + 1.5;
  let time = B.renderOpts.matrix.time;
  const sync = () => { S.updateWorld(scene.root); B.headquarters.solids.props.sync(); };
  const step = () => { sync(); B.crew.update(dt, time += dt); sync(); };
  const route = (x, y, z, tx, tz) => {
    cave.root.visible = true; cave.root.quaternion = null;
    cave.root.rotation.x = cave.root.rotation.z = 0;
    cave.state = "working"; cave.bedTravel.mode = ""; cave.bedTravel.route = null;
    cave.build = null; cave.hop = cave.hopV = cave.cheer = cave.catchT = cave.yawn = 0;
    cave.cloudSupport = null; cave.viewLift = 0; cave.nextBuildAt = 1e12;
    cave.act.kind = "idle"; cave.act.until = 1e12; cave.act.said = true;
    cave.root.position.x = x; cave.root.position.y = y + cave.baseY; cave.root.position.z = z;
    cave.leap.vx = cave.leap.vz = cave.leap.land = 0;
    cave.walk = { tx, tz, speed: 2, phase: 0, heading: Math.atan2(tx - x, tz - z), to: "spot" };
    cave.act.spot.x = tx; cave.act.spot.z = tz; cave.act.spot.ry = 0;
    B.crew.removeJetpack(cave); sync();
  };
  const inside = () => cover.contains(cave.root.position.x, cave.root.position.y - cave.baseY + 0.3, cave.root.position.z);
  try {
    route(0, B.island.surfaceAt(0, radius), radius, 0, -radius);
    let frames = 0, entries = 0, lateral = 0, minimumRadius = Infinity;
    while (cave.walk && frames++ < Math.ceil(25 / dt)) {
      step(); if (inside()) entries++;
      lateral = Math.max(lateral, Math.abs(cave.root.position.x));
      minimumRadius = Math.min(minimumRadius, Math.hypot(cave.root.position.x, cave.root.position.z));
    }
    const detour = { arrived: !cave.walk, frames, entries, lateral, minimumRadius, platformRadius: B.altar.platformRadius, distance: Math.hypot(cave.root.position.x, cave.root.position.z + radius) };
    route(0, 0.34, 0, 0, radius);
    const sampleFrames = Math.round(0.2 / dt);
    for (let n = 0; n < sampleFrames; n++) step();
    const escape = { insideSpeed: Math.hypot(cave.root.position.x, cave.root.position.z) / (sampleFrames * dt), stillInside: inside() };
    frames = sampleFrames;
    while (cave.walk && frames++ < Math.ceil(15 / dt)) step();
    Object.assign(escape, { arrived: !cave.walk, frames, outside: !inside(), distance: Math.hypot(cave.root.position.x, cave.root.position.z - radius) });
    // A donation can bury a destination after the route was chosen. The
    // walker must replace that destination instead of circling the new heap.
    B.setPileLevel(302);
    route(0, B.island.surfaceAt(0, radius + 1), radius + 1, 0, 2);
    const oldTargetZ = B.altar.platformRadius + 0.3 + 0.0001;
    cave.walk.tz = cave.act.spot.z = oldTargetZ;
    const initiallyClear = oldTargetZ > B.altar.platformRadius + 0.3 && !B.headquarters.solids.inBananas(cave, 0, oldTargetZ);
    // A single banana updates the shape without the separate >=2-banana
    // meal rush replacing the authored walk before its own route check runs.
    B.setPileLevel(303);
    for (const [node] of hidden) node.visible = false;
    const growth = { initiallyClear, coveredAfterGrowth: oldTargetZ < B.altar.platformRadius + 0.3, sourceOutside: !inside(), preservedBeforeStep: cave.walk.to === "spot" && cave.walk.tx === 0 && cave.walk.tz === oldTargetZ, entries: 0, moved: 0, frames: 0 };
    let previousX = cave.root.position.x, previousZ = cave.root.position.z;
    step();
    const targetX = cave.walk ? cave.walk.tx : cave.act.spot.x, targetZ = cave.walk ? cave.walk.tz : cave.act.spot.z;
    growth.retargeted = Math.hypot(targetX, targetZ - oldTargetZ) > 0.1;
    growth.targetClear = Math.hypot(targetX, targetZ) >= B.altar.platformRadius + 0.3 && !B.headquarters.solids.inBananas(cave, targetX, targetZ);
    growth.target = { x: targetX, z: targetZ };
    for (let n = 0; n < Math.ceil(2 / dt); n++) {
      if (n) step();
      growth.frames++; if (inside()) growth.entries++;
      growth.moved += Math.hypot(cave.root.position.x - previousX, cave.root.position.z - previousZ);
      previousX = cave.root.position.x; previousZ = cave.root.position.z;
      if (!cave.walk) break;
    }
    growth.arrived = !cave.walk;
    return { dt, radius, detour, escape, growth };
  } finally { for (const [node, visible] of hidden) node.visible = visible; }
};

// Exercise the production overlay across both contact planes, including
// near-plane views split between all adjoining solid materials.
export const bananaPlatformInteriorProbe = () => {
  const B = window.__ooga, BL = window.BL, scene = BL.scenes.hub, overlay = document.getElementById("overlay"), rows = [];
  const copy = document.createElement("canvas"); copy.width = overlay.width; copy.height = overlay.height;
  const ctx = copy.getContext("2d", { willReadFrequently: true }), overlayCtx = overlay.getContext("2d");
  B.pilot.release(true); B.setPileLevel(100000);
  for (let n = 0; n < 120; n++) scene.update(1 / 60, B.renderOpts.matrix.time + 1 / 60);
  for (const y of [-0.12, -0.02, 0, 0.02, 0.17, 0.32, 0.34, 0.35, 0.36, 0.38, 0.5]) {
    Object.assign(B.camera.position, { x: 0, y, z: 0 });
    Object.assign(B.camera.target, { x: 1, y, z: 0 });
    BL.scene.updateWorld(scene.root); B.renderer.render(scene.root, B.camera, B.renderOpts);
    overlayCtx.clearRect(0, 0, overlay.width, overlay.height); scene.overlay(1 / 60);
    ctx.clearRect(0, 0, copy.width, copy.height); ctx.drawImage(overlay, 0, 0);
    const image = ctx.getImageData(2, 2, overlay.width - 4, overlay.height - 4), pixels = image.data;
    let gaps = 0;
    for (let at = 3; at < pixels.length; at += 4) if (pixels[at] !== 255) gaps++;
    const center = ((Math.floor(image.height / 2) * image.width) + Math.floor(image.width / 2)) * 4;
    rows.push({ y, gaps, rgb: Array.from(pixels.slice(center, center + 3)), rock: B.headquarters.cameraCover.rockCoverage, fruit: B.headquarters.bananaCover.state.coverage });
  }
  return { backend: B.renderer.kind, closeMix: B.pilot.closeMix, rows };
};

export const bananaSlotProbe = () => {
  const B = window.__ooga, S = window.BL.scene, scene = window.BL.scenes.hub;
  B.pilot.release(true); B.setPileLevel(100000);
  const actors = [...B.cavemen.values()], working = actors.filter((c) => c.state === "working"), [walker, player, intruder] = working;
  const slots = working.map((c) => ({ x: c.slot.x, z: c.slot.z }));
  for (const c of actors) { c.walk = null; c.build = null; c.root.visible = false; c.act.kind = "idle"; c.act.until = 1e12; c.nextBuildAt = 1e12; }
  for (const prop of B.props) prop.node.visible = false;
  const place = (c, p) => { c.root.visible = true; Object.assign(c.root.position, { x: p.x, y: c.baseY + B.island.surfaceAt(p.x, p.z), z: p.z }); c.hop = c.hopV = 0; };
  const first = slots[0], radius = Math.hypot(first.x, first.z);
  place(walker, { x: first.x * (radius + 3) / radius, z: first.z * (radius + 3) / radius });
  place(player, { x: 18, z: 0 }); B.pilot.possess(player);
  const closest = (blocked) => slots.filter((s) => blocked.every((p) => Math.hypot(s.x - p.x, s.z - p.z) >= 0.68))
    .sort((a, b) => Math.hypot(a.x - walker.root.position.x, a.z - walker.root.position.z) - Math.hypot(b.x - walker.root.position.x, b.z - walker.root.position.z))[0];
  const matches = (p) => !!walker.walk && Math.hypot(walker.walk.tx - p.x, walker.walk.tz - p.z) < 1e-7;
  const tick = () => { S.updateWorld(scene.root); B.headquarters.solids.props.sync(); B.crew.update(1 / 60, B.renderOpts.matrix.time + 1 / 60); };
  const expected = closest([]); B.crew.rush(); const initial = matches(expected);
  B.crew.relocatePlayer({ x: expected.x, y: B.island.surfaceAt(expected.x, expected.z), z: expected.z }, 0);
  const second = closest([expected]); tick(); const playerRetarget = matches(second);
  place(intruder, second); intruder.walk = null;
  const third = closest([expected, second]); tick(); const npcRetarget = matches(third);
  const returning = closest([expected, second]); walker.walk = null;
  Object.assign(walker.bedTravel, { mode: "walk", toBed: false, index: 1, route: [{ x: walker.root.position.x, y: 0, z: walker.root.position.z }, { x: expected.x, y: 0, z: expected.z }] });
  tick(); const bedReturn = !walker.bedTravel.mode && matches(returning);
  place(intruder, { x: 17, z: 1 }); intruder.act.kind = "idle";
  B.crew.rush();
  const reserved = !!walker.walk && !!intruder.walk && Math.hypot(walker.walk.tx - intruder.walk.tx, walker.walk.tz - intruder.walk.tz) >= 0.68;
  return { initial, playerRetarget, npcRetarget, bedReturn, reserved, slots: slots.length, expected, second, third };
};

export const bananaGlyphInteriorProbe = () => {
  const B = window.__ooga, BL = window.BL, scene = BL.scenes.hub, overlay = document.getElementById("overlay"), rows = [];
  B.pilot.release(true); B.setPileLevel(100000);
  const copy = document.createElement("canvas"); copy.width = overlay.width; copy.height = overlay.height;
  const ctx = copy.getContext("2d", { willReadFrequently: true });
  let time = B.renderOpts.matrix.time;
  const sample = (name) => {
    for (const y of [0.17, 0.5]) {
      Object.assign(B.camera.position, { x: 0, y, z: 0 }); Object.assign(B.camera.target, { x: 1, y, z: 0 });
      S(); scene.overlay(1 / 60); ctx.clearRect(0, 0, copy.width, copy.height); ctx.drawImage(overlay, 0, 0);
      const pixels = ctx.getImageData(0, 0, copy.width, copy.height).data;
      let green = 0, dark = 0, hash = 2166136261;
      for (let at = 0; at < pixels.length; at += 4) {
        if (pixels[at + 1] > pixels[at] * 2 && pixels[at + 1] > pixels[at + 2] * 2) green++;
        if (pixels[at] < 10 && pixels[at + 1] < 10 && pixels[at + 2] < 10) dark++;
        for (let c = 0; c < 3; c++) hash = Math.imul(hash ^ pixels[at + c], 16777619);
      }
      const state = y < 0.34 ? B.headquarters.cameraCover : B.headquarters.bananaCover.state;
      rows.push({ name, y, green, dark, hash: hash >>> 0, glyph: state.glyphInterior, min: state.glyphBlendMin, max: state.glyphBlendMax });
    }
  };
  const S = () => { BL.scene.updateWorld(scene.root); B.renderer.render(scene.root, B.camera, B.renderOpts); };
  sample("normal"); B.matrixGate.set(true); scene.update(0, time); sample("unreached");
  scene.update(0.005, time += 0.005); sample("partial");
  for (let n = 0; n < 240; n++) scene.update(0.05, time += 0.05);
  sample("glyph"); scene.update(0.1, time += 0.1); sample("animated");
  B.matrixGate.set(false); for (let n = 0; n < 240; n++) scene.update(0.05, time += 0.05);
  sample("restored");
  return { backend: B.renderer.kind, rows };
};
