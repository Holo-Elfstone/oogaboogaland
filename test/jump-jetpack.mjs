// Exercise production input routing and physics at several frame rates. Only
// fixture placement is direct; presses, landing, fuel and ownership use the hub.
export const jumpJetpackProbe = ({ mode = "trailing", dt = 1 / 60 } = {}) => {
  const B = window.__ooga, scene = window.BL.scenes.hub, cave = [...B.cavemen.values()].find((c) => c.state === "working" && !c.jet);
  const held = new Set(), rows = [];
  let time = B.renderOpts.matrix.time;
  const key = (type, value, repeat = false) => window.dispatchEvent(new KeyboardEvent(type, { key: value, repeat }));
  const press = (value) => { key("keydown", value); held.add(value); };
  const release = (value) => { key("keyup", value); held.delete(value); };
  const step = (n = 1) => { for (let i = 0; i < n; i++) scene.update(dt, time += dt); };
  const tap = (value) => { press(value); step(); release(value); };
  const state = () => ({ jumps: cave.jumps, hop: cave.hop, velocity: cave.hopV, fuel: cave.jetFuel, equipped: !!cave.jet, thrust: !!cave.jet && cave.jet.thrust, flame: !!cave.jet && cave.jet.flame.visible, y: cave.root.position.y - cave.baseY, mode: B.pilot.mode });
  let flat = null;
  for (let radius = 10; radius < 19 && !flat; radius++) for (let i = 0; i < 64; i++) {
    const angle = i / 64 * Math.PI * 2, x = Math.sin(angle) * radius, z = Math.cos(angle) * radius;
    if (!B.island.onLand(x, z) || B.island.surfaceAt(x, z) !== 0 || B.props.some((o) => o.active && Math.hypot(o.x - x, o.z - z) < 3.5) || [...B.cavemen.values()].some((c) => c !== cave && Math.hypot(c.root.position.x - x, c.root.position.z - z) < 3.5)) continue;
    flat = { x, y: 0, z }; break;
  }
  if (!flat) throw new Error("No clear flat jumping fixture");
  B.pilot.possess(cave);
  B.crew.relocatePlayer(flat, 0);
  if (mode === "first-person") B.pilot.enterClose();
  step(Math.ceil(1 / dt));
  // Clear the earlier possession bubble through its normal overlay lifetime so
  // a new jump shout cannot hide by replacing an already-counted bubble.
  scene.overlay(4);
  const speechBefore = B.stats().bubbles;
  const landed = () => {
    let n = 0;
    while ((cave.hop > 0 || cave.hopV > 0) && n++ < Math.ceil(8 / dt)) step();
    return { ...state(), frames: n };
  };
  try {
    press(" "); step();
    const first = { ...state(), label: document.getElementById("act").textContent, speechBefore, speechAfter: B.stats().bubbles };
    for (let i = 0; i < Math.ceil(0.12 / dt); i++) { key("keydown", " ", true); step(); }
    const heldFirst = state();
    release(" "); tap(" ");
    const second = state();
    const beforeThird = state(); tap(" ");
    const third = state(), expectedThird = beforeThird.velocity - 9.8 * dt;
    rows.push({ name: "double", first, heldFirst, second, third, expectedThird });
    press(" ");
    const ground = landed();
    step(Math.ceil(0.25 / dt));
    const heldGround = state();
    release(" "); tap(" ");
    const fresh = state();
    rows.push({ name: "landing", ground, heldGround, fresh });
    landed();

    // A low cave roof stops ascent without replenishing the airborne jump.
    document.querySelector('nav[data-scene="hub"] [data-preset="underground"]').click();
    const room = B.island.headquarters.basement.rooms[0];
    B.crew.relocatePlayer({ x: room.entrance.x, y: room.floor, z: room.entrance.z }, 0);
    step(); tap(" "); step(Math.ceil(0.35 / dt)); tap(" ");
    let contact = null;
    for (let i = 0; i < Math.ceil(0.8 / dt); i++) {
      step();
      if (cave.hop > 0 && cave.hopV <= 0) { contact = state(); break; }
    }
    const beforeRoofPress = state(); tap(" ");
    const roofPress = state();
    rows.push({ name: "ceiling", contact, beforeRoofPress, roofPress });
    landed();

    document.querySelector('nav[data-scene="hub"] [data-preset="pile"]').click();
    B.crew.relocatePlayer(flat, 0); step();
    const tapPeak = () => {
      press(" "); release(" ");
      let peak = 0, frames = 0;
      while ((cave.hop > 0 || cave.hopV > 0) && frames++ < Math.ceil(3 / dt)) { step(); peak = Math.max(peak, cave.root.position.y - cave.baseY); }
      return { peak, frames, ...state() };
    };
    const normalHop = tapPeak();
    tap("j");
    const weightedHop = tapPeak();
    rows.push({ name: "weighted hop", normal: normalHop, weighted: weightedHop, ratio: weightedHop.peak / normalHop.peak });
    const equipped = state();
    press(" "); const takeoff = state(); step(Math.round(0.75 / dt));
    const flying = state();
    release(" ");
    const coastBefore = state(); step(Math.round(0.25 / dt));
    const coast = state();
    tap("j"); const removed = state(); tap("j"); const restored = state();
    const restartBefore = state(); press(" "); const restart = state();
    rows.push({ name: "flight", equipped, takeoff, flying, coastBefore, coast, removed, restored, restartBefore, restart });
    let used = 0;
    while (cave.jetFuel > 0 && used++ < Math.ceil(10 / dt)) step();
    const empty = state();
    // The fuel is still empty while falling. Fresh Space must not become jump.
    release(" "); const beforeEmptyPress = state(); tap(" "); const emptyPress = state();
    press(" "); step(Math.ceil(0.15 / dt)); const emptyHeld = state(); release(" ");
    rows.push({ name: "empty", empty, beforeEmptyPress, emptyPress, emptyHeld });
    const returnToGround = landed(), refillStart = state();
    step(Math.round(1 / dt)); const refilled = state();
    press(" "); step(Math.round(0.2 / dt)); release(" "); const resumed = state();
    rows.push({ name: "refill", returnToGround, refillStart, refilled, resumed });
    tap("j");
    const offAir = state(); step(Math.round(0.2 / dt)); const offAirLater = state();
    rows.push({ name: "off-air", before: offAir, after: offAirLater });
    landed();

    const mouth = B.mouths.find((m) => m.id === "c11"), ox = Math.sin(mouth.angle), oz = -Math.cos(mouth.angle);
    const edge = { x: mouth.x + ox * 1.2, z: mouth.z + oz * 1.2 };
    edge.y = B.island.surfaceAt(edge.x, edge.z);
    B.crew.relocatePlayer(edge, Math.PI * 2 - mouth.angle);
    B.pilot.orbit.yaw = B.pilot.orbit.tYaw = Math.PI - mouth.angle;
    step(); press("w");
    let edgeFrames = 0;
    while (cave.hop === 0 && edgeFrames++ < Math.ceil(2 / dt)) step();
    release("w"); const ledge = state();
    tap(" "); const rescue = state();
    tap("j"); tap("j"); const toggledAir = state();
    tap(" "); const exhaustedAir = state();
    rows.push({ name: "ledge", ledge, rescue, toggledAir, exhaustedAir });
    return { mode, dt, rows, scene: B.scene, backend: B.renderer.kind, selected: B.pilot.player === cave };
  } finally { for (const value of held) key("keyup", value); }
};

export const jetpackRecoveryProbe = ({ mode = "trailing", dt = 1 / 60 } = {}) => {
  const B = window.__ooga, scene = window.BL.scenes.hub, cave = [...B.cavemen.values()].find((c) => c.state === "working"), held = new Set();
  let time = B.renderOpts.matrix.time;
  const key = (type, value, repeat = false) => window.dispatchEvent(new KeyboardEvent(type, { key: value, repeat }));
  const press = (value) => { key("keydown", value); held.add(value); };
  const release = (value) => { key("keyup", value); held.delete(value); };
  const step = (n = 1) => { for (let i = 0; i < n; i++) scene.update(dt, time += dt); };
  const tap = (value) => { press(value); step(); release(value); };
  const state = () => ({ fuel: cave.jetFuel, locked: cave.jetRecovering, equipped: !!cave.jet, thrust: !!cave.jet && cave.jet.thrust, flame: !!cave.jet && cave.jet.flame.visible, hop: cave.hop, velocity: cave.hopV, jumps: cave.jumps, label: document.getElementById("act").textContent, mode: B.pilot.mode });
  const land = () => { for (let i = 0; cave.hop > 0 && i < Math.ceil(5 / dt); i++) step(); return state(); };
  B.pilot.possess(cave); B.crew.relocatePlayer({ x: 12, y: 0, z: 0 }, 0);
  if (mode === "first-person") B.pilot.enterClose();
  if (!cave.jet) tap("j");
  step(Math.ceil(1 / dt));
  // Start a real low-fuel landing; the lock must be earned by that touchdown.
  cave.jetFuel = 0.1; cave.hop = 0.25; cave.hopV = -1; cave.root.position.y += cave.hop;
  const airborne = state();
  try {
    const grounded = land();
    press(" "); step(); const first = state();
    for (let i = 0; i < Math.round(0.2 / dt); i++) { key("keydown", " ", true); step(); }
    const heldFirst = state();
    release(" "); tap(" "); const second = state();
    tap("j"); const off = state(); tap("j"); const on = state();
    press(" "); step(); const third = state();
    step(Math.round(0.15 / dt)); const idleAir = state();
    const landed = land();
    // Pin just below the exact boundary, then cross it through actual recharge.
    cave.jetFuel = 0.2 - dt / 4;
    step(); const atThreshold = state(); step(); const unlockedHeld = state();
    release(" "); press(" "); step(Math.round(0.2 / dt)); const resumed = state();
    return { airborne, grounded, first, heldFirst, second, off, on, third, idleAir, landed, atThreshold, unlockedHeld, resumed, dt, mode, backend: B.renderer.kind };
  } finally { for (const value of held) key("keyup", value); }
};

export const jumpActionProbe = ({ mode = "trailing" } = {}) => {
  const B = window.__ooga, scene = window.BL.scenes.hub, cave = [...B.cavemen.values()].find((c) => c.state === "working");
  const button = B.matrixGate.button, rows = [];
  let time = B.renderOpts.matrix.time;
  const step = () => scene.update(1 / 60, time += 1 / 60);
  const key = (type, value) => window.dispatchEvent(new KeyboardEvent(type, { key: value }));
  const tap = (value) => { key("keydown", value); step(); key("keyup", value); };
  B.pilot.possess(cave);
  if (mode === "first-person") B.pilot.enterClose();
  window.BL.scene.updateWorld(scene.root);
  const target = { x: button.world[12], y: button.world[13], z: button.world[14] };
  for (const jet of [false, true]) for (let i = 0; i < 8; i++) {
    const angle = i * Math.PI / 4, x = target.x + Math.sin(angle) * 1.5, z = target.z + Math.cos(angle) * 1.5;
    if (!B.island.clearAt(x, 0.05, z, 0.22, cave.bodyHeight)) continue;
    B.crew.relocatePlayer({ x, y: 0, z }, angle); step();
    if (!!cave.jet !== jet) tap("j");
    cave.hop = 0.12; cave.hopV = 0; cave.jumps = 2; cave.root.position.y = cave.baseY + cave.hop;
    const before = B.matrixGate.pressed, fuel = cave.jetFuel;
    tap(" ");
    rows.push({ angle, jet, toggled: B.matrixGate.pressed !== before, jumps: cave.jumps, velocity: cave.hopV, thrust: !!cave.jet && cave.jet.thrust, fuelBefore: fuel, fuelAfter: cave.jetFuel });
  }
  // Same X/Z above the roof is outside three-dimensional action reach.
  if (cave.jet) tap("j");
  B.crew.relocatePlayer({ x: target.x, y: B.island.surfaceAt(target.x, target.z), z: target.z }, 0); step();
  const before = B.matrixGate.pressed; tap(" ");
  const roof = { toggled: B.matrixGate.pressed !== before, jumps: cave.jumps, hop: cave.hop, height: cave.root.position.y - cave.baseY };
  return { rows, roof, mode: B.pilot.mode, scene: B.scene, backend: B.renderer.kind };
};

export const jetpackHudProbe = () => {
  const B = window.__ooga, scene = window.BL.scenes.hub, cave = [...B.cavemen.values()].find((c) => c.state === "working");
  let time = B.renderOpts.matrix.time;
  const step = () => scene.update(1 / 60, time += 1 / 60);
  const tap = () => { window.dispatchEvent(new KeyboardEvent("keydown", { key: "j" })); step(); window.dispatchEvent(new KeyboardEvent("keyup", { key: "j" })); };
  const snapshot = () => {
    const panel = document.getElementById("jetpack-hud"), fuel = document.getElementById("jetpack-fuel"), fill = document.getElementById("jetpack-fuel-fill"), box = panel.getBoundingClientRect();
    const overlap = (element) => {
      const style = getComputedStyle(element), r = element.getBoundingClientRect();
      return style.display !== "none" && style.visibility !== "hidden" && Math.min(box.right, r.right) > Math.max(box.left, r.left) && Math.min(box.bottom, r.bottom) > Math.max(box.top, r.top);
    };
    return { hidden: panel.hidden, role: fuel.getAttribute("role"), label: fuel.getAttribute("aria-label"), value: +fuel.getAttribute("aria-valuenow"), min: +fuel.getAttribute("aria-valuemin"), max: +fuel.getAttribute("aria-valuemax"), text: document.getElementById("jetpack-fuel-value").textContent, fill: fill.style.transform, level: panel.dataset.level, left: box.left, right: box.right, top: box.top, bottom: box.bottom, fits: box.left >= 0 && box.right <= innerWidth && box.top >= 0 && box.bottom <= innerHeight, leftSide: box.right < innerWidth / 2, pointerEvents: getComputedStyle(panel).pointerEvents, overlap: [document.querySelector(".brand"), document.querySelector('nav[data-scene="hub"]'), document.getElementById("joy-move"), document.getElementById("act")].some(overlap) };
  };
  const hidden = snapshot();
  B.pilot.possess(cave); tap();
  const full = snapshot();
  cave.jetFuel = 0.137; cave.hop = 1; cave.root.position.y += 1; step();
  const low = snapshot();
  tap(); const removed = snapshot(); tap(); const reequipped = snapshot();
  B.pilot.release(true); step(); const released = snapshot();
  return { hidden, full, low, removed, reequipped, released, backend: B.renderer.kind, viewport: [innerWidth, innerHeight] };
};

export const jetpackUndergroundProbe = ({ mode = "trailing" } = {}) => {
  const B = window.__ooga, scene = window.BL.scenes.hub, H = B.island.headquarters, o = B.pilot.orbit;
  const cave = [...B.cavemen.values()].find((c) => c.state === "working"), rows = [], held = new Set();
  let time = B.renderOpts.matrix.time;
  const key = (type, value) => window.dispatchEvent(new KeyboardEvent(type, { key: value }));
  const keys = (next) => {
    for (const value of held) if (!next.includes(value)) { key("keyup", value); held.delete(value); }
    for (const value of next) if (!held.has(value)) { key("keydown", value); held.add(value); }
  };
  const step = () => scene.update(1 / 60, time += 1 / 60);
  const tapJ = () => { key("keydown", "j"); step(); key("keyup", "j"); };
  const seek = (target) => {
    let i = 0;
    while (Math.hypot(cave.root.position.x - target.x, cave.root.position.z - target.z) > 0.2 && i++ < 600) {
      const p = cave.root.position;
      o.yaw = o.tYaw = Math.atan2(target.x - p.x, target.z - p.z) + Math.PI;
      keys(["w"]); step();
    }
    keys([]); step();
    return i < 600;
  };
  B.pilot.possess(cave);
  if (mode === "first-person") B.pilot.enterClose();
  try {
    for (const ramp of H.ramps) {
      document.querySelector('nav[data-scene="hub"] [data-preset="pile"]').click();
      const mouth = B.mouths.find((m) => m.id === ramp.id), start = { x: mouth.x + Math.sin(mouth.ry) * 1.6, y: 0, z: mouth.z + Math.cos(mouth.ry) * 1.6 };
      B.crew.relocatePlayer(start, mouth.ry + Math.PI); step();
      if (!cave.jet) tapJ();
      const equipment = cave.jet, equipped = !!equipment, fuel = cave.jetFuel;
      let completed = true, firstRemoved = null, rejectCount = 0, unexpected = 0;
      for (let i = 0; i < ramp.samples.length; i += 3) {
        if (!seek(ramp.samples[i])) { completed = false; break; }
        const feet = cave.root.position.y - cave.baseY;
        if (!cave.jet && !firstRemoved) firstRemoved = { i, feet, player: B.cameraCave.playerIndex };
        if (feet < -0.3) { tapJ(); rejectCount++; if (cave.jet) unexpected++; }
      }
      rows.push({ id: ramp.id, equipped, completed, firstRemoved, rejectCount, unexpected, nodeRemoved: equipment && !cave.root.children.includes(equipment.node), fuelBefore: fuel, fuel: cave.jetFuel });
    }
    for (const ramp of H.basement.ramps) {
      const sample = ramp.samples[Math.floor(ramp.samples.length / 2)];
      B.crew.relocatePlayer({ x: sample.x, y: sample.y, z: sample.z }, 0); step(); tapJ();
      rows.push({ id: ramp.id, basement: true, removed: !cave.jet, floor: cave.root.position.y - cave.baseY });
    }
    const room = H.basement.rooms[0];
    B.crew.relocatePlayer({ x: room.x, y: room.floor, z: room.z }, 0); step(); tapJ();
    const basement = { removed: !cave.jet, floor: cave.root.position.y - cave.baseY };
    document.querySelector('nav[data-scene="hub"] [data-preset="pile"]').click(); step(); tapJ();
    const outside = { equipped: !!cave.jet, fuel: cave.jetFuel, floor: cave.root.position.y - cave.baseY };
    return { rows, basement, outside, scene: B.scene, mode: B.pilot.mode, backend: B.renderer.kind };
  } finally { keys([]); }
};

export const jetpackInputFuelProbe = ({ mode = "trailing", dt = 1 / 60 } = {}) => {
  const B = window.__ooga, scene = window.BL.scenes.hub, cave = [...B.cavemen.values()].find((c) => c.state === "working"), rows = [], held = new Set();
  let time = B.renderOpts.matrix.time;
  const key = (type, value) => window.dispatchEvent(new KeyboardEvent(type, { key: value }));
  const step = (frames = 1) => { for (let i = 0; i < frames; i++) scene.update(dt, time += dt); };
  const state = () => ({ x: cave.root.position.x, y: cave.root.position.y - cave.baseY, z: cave.root.position.z, fuel: cave.jetFuel, thrust: cave.jet.thrust, flame: cave.jet.flame.visible, particles: B.stats().particles });
  B.pilot.possess(cave);
  for (const entry of B.cavemen.values()) entry.nextBuildAt = 1e9;
  if (mode === "first-person") B.pilot.enterClose();
  B.crew.relocatePlayer({ x: 12, y: 0, z: 0 }, 0);
  if (!cave.jet) { key("keydown", "j"); step(); key("keyup", "j"); }
  step(Math.ceil(1 / dt));
  try {
    const cases = [[], ["w"], ["a"], ["s"], ["d"], ["w", "d"], [" "], [" ", "w"]].map((input) => ({ input, airborne: true }));
    cases.push({ input: ["w"], airborne: false });
    for (const { input, airborne } of cases) {
      // These independent airborne fixtures isolate input consumption from a
      // landing, a wall, and the previous case's velocity or partially used tank.
      B.crew.relocatePlayer({ x: 12, y: 0, z: 0 }, 0);
      // Let prior sparks and the equip burst expire through normal updates;
      // the following half-second count then contains only this input's sparks.
      step(Math.ceil(2.5 / dt));
      cave.hop = airborne ? 20 : 0; cave.root.position.y += cave.hop; cave.jetFuel = airborne ? 1 : 0.5; cave.jet.puff = 0;
      const before = state();
      for (const value of input) { key("keydown", value); held.add(value); }
      let movement = 0, peakFlame = 0, previousX = cave.root.position.x, previousZ = cave.root.position.z;
      for (let i = 0; i < Math.round(0.5 / dt); i++) {
        step();
        movement += Math.hypot(cave.root.position.x - previousX, cave.root.position.z - previousZ);
        if (cave.jet.flame.visible) peakFlame = Math.max(peakFlame, cave.jet.flame.scale.y);
        previousX = cave.root.position.x; previousZ = cave.root.position.z;
      }
      const after = state();
      for (const value of held) key("keyup", value);
      held.clear(); step(Math.round(0.5 / dt));
      const released = state();
      rows.push({ input: input.map((value) => value === " " ? "Space" : value), airborne, before, after, released, consumed: before.fuel - after.fuel, movement, peakFlame, sparks: after.particles - before.particles });
    }
    return { rows, mode: B.pilot.mode, backend: B.renderer.kind, dt };
  } finally { for (const value of held) key("keyup", value); }
};

export const abyssRespawnProbe = ({ mode = "trailing", jet = false, dt = 1 / 60 } = {}) => {
  const B = window.__ooga, scene = window.BL.scenes.hub, cave = [...B.cavemen.values()].find((c) => c.state === "working"), held = new Set();
  const island = B.island, poses = [], violations = [];
  let time = B.renderOpts.matrix.time, elapsed = 0, outsideAt = -1, emptyAt = -1, returnedAt = -1, previous = null, maxEyeGap = 0, maxEyeGapAt = null, maxHeight = -Infinity, maxRadius = 0, minHeight = Infinity, accelerationError = 0, fallSamples = 0;
  const key = (type, value) => window.dispatchEvent(new KeyboardEvent(type, { key: value }));
  const keys = (next) => {
    for (const value of held) if (!next.includes(value)) { key("keyup", value); held.delete(value); }
    for (const value of next) if (!held.has(value)) { key("keydown", value); held.add(value); }
  };
  const state = () => {
    const p = cave.root.position, eye = B.camera.position;
    return { x: p.x, y: p.y - cave.baseY, z: p.z, radius: Math.hypot(p.x, p.z), onLand: island.onLand(p.x, p.z), fuel: cave.jetFuel, hop: cave.hop, velocity: cave.hopV, jumps: cave.jumps, eye: { x: eye.x, y: eye.y, z: eye.z }, scene: B.scene, mode: B.pilot.mode, selected: B.pilot.player === cave, equipped: !!cave.jet };
  };
  let start = null, heading = 0;
  for (let radius = island.radius - 0.5; radius >= island.radius - 4 && !start; radius -= 0.125) for (let i = 0; i < 128 && !start; i++) {
    const angle = i / 128 * Math.PI * 2, ox = Math.sin(angle), oz = Math.cos(angle), x = ox * radius, z = oz * radius, y = island.surfaceAt(x, z);
    if (!island.onLand(x, z) || !island.clearAt(x, y + 0.05, z, 0.3, cave.bodyHeight) || B.props.some((p) => p.active && Math.hypot(p.x - x, p.z - z) < 0.8)) continue;
    if (island.onLand(x + ox * 3, z + oz * 3)) continue;
    let clear = true;
    for (let distance = 0.25; distance <= 3; distance += 0.25) {
      const t = distance / (jet ? 6.4 : 7.75), feet = y + (jet ? 4.9 * t * t : 4.8 * t - 4.9 * t * t);
      if (!island.clearAt(x + ox * distance, feet + 0.05, z + oz * distance, 0.3, cave.bodyHeight)) { clear = false; break; }
    }
    if (!clear) continue;
    start = { x, y, z }; heading = angle;
  }
  if (!start) throw new Error("No clear island-edge fixture");
  B.pilot.possess(cave);
  // Stage the eye with the body; stale orbit focus can otherwise spend the
  // first second catching up from the banana pile before the jump even starts.
  B.pilot.navigate({ position: start, yaw: heading + Math.PI, pitch: 0, dist: 3.5 });
  if (mode === "first-person") B.pilot.enterClose();
  for (let i = 0; i < Math.ceil(1 / dt); i++) scene.update(dt, time += dt);
  if (jet) { key("keydown", "j"); scene.update(dt, time += dt); key("keyup", "j"); }
  const initial = state(), initialEyeGap = Math.hypot(initial.eye.x - initial.x, initial.eye.y - initial.y - cave.headOffset * 0.95, initial.eye.z - initial.z);
  let preRespawn = null, respawn = null, lastOutside = null;
  try {
    keys([" ", "w"]);
    for (let frame = 0; frame < Math.ceil(30 / dt); frame++) {
      scene.update(dt, time += dt); elapsed += dt;
      const s = state();
      if (!s.onLand && outsideAt < 0) outsideAt = elapsed;
      if (jet && s.fuel === 0 && emptyAt < 0) emptyAt = elapsed;
      if (!jet && frame === 0) keys(["w"]);
      if (jet ? emptyAt >= 0 : s.radius > island.radius + 3) keys([]);
      if (outsideAt >= 0 && s.onLand && s.radius < island.radius / 2) {
        returnedAt = elapsed; preRespawn = previous; respawn = s; break;
      }
      maxHeight = Math.max(maxHeight, s.y); minHeight = Math.min(minHeight, s.y); maxRadius = Math.max(maxRadius, s.radius);
      if (outsideAt >= 0) {
        const gap = Math.hypot(s.eye.x - s.x, s.eye.y - s.y - cave.headOffset * 0.95, s.eye.z - s.z);
        if (gap > maxEyeGap) { maxEyeGap = gap; maxEyeGapAt = { elapsed, ...s }; }
        if (!s.onLand) lastOutside = s;
        if (frame % Math.max(1, Math.round(0.1 / dt)) === 0 && poses.length < 300) poses.push({ y: s.y, eyeY: s.eye.y, radius: s.radius, velocity: s.velocity, fuel: s.fuel });
      }
      if (previous && !previous.onLand && !s.onLand && previous.velocity < 0 && (!jet || previous.fuel === 0)) {
        accelerationError = Math.max(accelerationError, Math.abs(s.velocity - previous.velocity + 9.8 * dt));
        fallSamples++;
      }
      if (![s.x, s.y, s.z, s.eye.x, s.eye.y, s.eye.z].every(Number.isFinite) || s.scene !== "hub" || !s.selected || s.mode !== mode) {
        if (violations.length < 4) violations.push(s);
      }
      previous = s;
    }
    keys([]);
    const pileEdge = B.altar.platformRadius;
    return { jet, dt, mode, initial, initialEyeGap, start, outsideAt, emptyAt, returnedAt, preRespawn, respawn, lastOutside, maxHeight, minHeight, maxRadius, maxEyeGap, maxEyeGapAt, accelerationError, fallSamples, poses, violations, pileEdge, backend: B.renderer.kind };
  } finally { keys([]); }
};

export const underIslandReleaseProbe = ({ dt = 1 / 60 } = {}) => {
  const B = window.__ooga, scene = window.BL.scenes.hub, cave = [...B.cavemen.values()].find((c) => c.state === "working"), island = B.island, o = B.pilot.orbit;
  let time = B.renderOpts.matrix.time, crossed = null, releaseEvent = null, respawn = null, previous = null, minHeight = -25, accelerationError = 0, fallSamples = 0;
  const key = (type) => window.dispatchEvent(new KeyboardEvent(type, { key: "w" }));
  const state = () => {
    const p = cave.root.position, y = p.y - cave.baseY;
    return { x: p.x, y, z: p.z, radius: Math.hypot(p.x, p.z), onLand: island.onLand(p.x, p.z), support: island.supportAt(p.x, p.z, y, 0, -120), clear: island.clearAt(p.x, y + 0.05, p.z, 0.3, cave.bodyHeight), velocity: cave.hopV, hop: cave.hop, jumps: cave.jumps, fuel: cave.jetFuel, selected: B.pilot.player === cave, mode: B.pilot.mode, scene: B.scene };
  };
  B.pilot.possess(cave);
  B.crew.relocatePlayer({ x: island.radius + 2, y: -25, z: 0 }, -Math.PI / 2);
  cave.hop = 95; cave.jetFuel = 0.37;
  o.yaw = o.tYaw = Math.PI / 2; o.pitch = o.tPitch = 0; o.dist = o.tDist = 3.5;
  B.pilot.enterClose();
  const initial = state();
  try {
    key("keydown");
    for (let frame = 0; frame < Math.ceil(8 / dt); frame++) {
      scene.update(dt, time += dt);
      const s = state();
      if (releaseEvent && s.y >= 0 && s.hop === 0) { respawn = s; break; }
      minHeight = Math.min(minHeight, s.y);
      if (previous && previous.velocity < 0) {
        accelerationError = Math.max(accelerationError, Math.abs(s.velocity - previous.velocity + 9.8 * dt));
        fallSamples++;
      }
      if (!crossed && s.onLand && s.radius < island.radius - 1) {
        crossed = s; key("keyup"); B.pilot.release(true);
        releaseEvent = { before: s, after: state() };
      }
      previous = s;
    }
    return { initial, crossed, releaseEvent, respawn, minHeight, accelerationError, fallSamples, slotDistance: respawn ? Math.hypot(respawn.x - cave.slot.x, respawn.z - cave.slot.z) : null, backend: B.renderer.kind };
  } finally { key("keyup"); }
};

export const jetpackNotchProbe = ({ mode = "first-person", dt = 1 / 60 } = {}) => {
  const B = window.__ooga, scene = window.BL.scenes.hub, island = B.island, cave = [...B.cavemen.values()].find((c) => c.state === "working"), o = B.pilot.orbit;
  const violations = [], trace = [], ceilings = new Set();
  let time = B.renderOpts.matrix.time, start = null, elapsed = 0, contactFrames = 0, maxBodyStep = 0, maxEyeStep = 0, maxStall = 0, stall = 0, previous = null;
  const key = (type, value) => window.dispatchEvent(new KeyboardEvent(type, { key: value }));
  const state = () => {
    const p = cave.root.position, y = p.y - cave.baseY, eye = B.camera.position;
    return { x: p.x, y, z: p.z, radius: Math.hypot(p.x, p.z), ceiling: island.ceilingAt(p.x, y, p.z, 0.3), fuel: cave.jetFuel, equipped: !!cave.jet, thrust: !!cave.jet && cave.jet.thrust, velocity: cave.hopV, onLand: island.onLand(p.x, p.z), eye: [eye.x, eye.y, eye.z], selected: B.pilot.player === cave, mode: B.pilot.mode, scene: B.scene };
  };
  // Select an actual underside band. Its ceiling and collision volume come
  // from the rendered voxels, including the full cylindrical footprint.
  for (const radius of [27, 26, 28]) for (let i = 0; i < 128 && !start; i++) {
    const angle = Math.PI * 3 / 8 + i / 128 * Math.PI * 2, x = Math.sin(angle) * radius, z = -Math.cos(angle) * radius;
    const ceiling = island.ceilingAt(x, -25, z, 0.3), y = ceiling - cave.bodyHeight - 0.35, column = {};
    if (!island.onLand(x, z) || !Number.isFinite(ceiling) || ceiling >= -1 || !island.clearAt(x, y + 0.01, z, 0.3, cave.bodyHeight) || island.supportAt(x, z, y, 0, -120) !== -120) continue;
    if (island.cavityAt(x, z, column, island.headquarters.caveIndex, y) && y >= column.floor && y < column.ceiling) continue;
    start = { x, y, z, angle, ceiling };
  }
  if (!start) throw new Error("No clear exterior underside band");
  B.pilot.possess(cave); B.crew.relocatePlayer(start, Math.atan2(start.x, start.z));
  cave.hop = start.y + 120; cave.jetFuel = 1;
  o.yaw = o.tYaw = cave.root.rotation.y + Math.PI; o.pitch = o.tPitch = 0; o.dist = o.tDist = 3.5;
  if (mode === "first-person") B.pilot.enterClose();
  key("keydown", "j"); key("keyup", "j");
  for (let i = 0; i < Math.ceil(0.35 / dt); i++) scene.update(dt, time += dt);
  const initial = state(); previous = initial;
  try {
    key("keydown", " ");
    for (let frame = 0; frame < Math.ceil(7 / dt); frame++) {
      scene.update(dt, time += dt); elapsed += dt;
      const s = state(), distance = Math.hypot(s.x - previous.x, s.y - previous.y, s.z - previous.z);
      maxBodyStep = Math.max(maxBodyStep, distance);
      maxEyeStep = Math.max(maxEyeStep, Math.hypot(s.eye[0] - previous.eye[0], s.eye[1] - previous.eye[1], s.eye[2] - previous.eye[2]));
      // The slide already reaches the next higher band in this frame. Record
      // the finite ceiling it moved past, not only the new post-slide gap.
      if (Number.isFinite(previous.ceiling) && s.radius > previous.radius + 1e-6) { contactFrames++; ceilings.add(previous.ceiling); }
      stall = distance < dt * 0.05 ? stall + dt : 0; maxStall = Math.max(maxStall, stall);
      const fail = (kind) => { if (violations.length < 6) violations.push({ kind, ...s }); };
      if (!island.clearAt(s.x, s.y + 1e-5, s.z, 0.295, cave.bodyHeight - 1e-5)) fail("body");
      if (!island.voxelSegmentClearAt(previous.x, previous.y + 1e-5, previous.z, s.x, s.y + 1e-5, s.z, 0.295, cave.bodyHeight - 1e-5)) fail("body sweep");
      if (!island.clearAt(s.eye[0], s.eye[1] - 0.295, s.eye[2], 0.295, 0.59)) fail("eye");
      if (!island.voxelSegmentClearAt(previous.eye[0], previous.eye[1] - 0.295, previous.eye[2], s.eye[0], s.eye[1] - 0.295, s.eye[2], 0.295, 0.59)) fail("eye sweep");
      if (!s.equipped || !s.selected || s.mode !== mode || s.scene !== "hub") fail("ownership");
      if (frame % Math.max(1, Math.round(0.25 / dt)) === 0) trace.push(s);
      previous = s;
      if (!s.onLand && s.y > 1) break;
    }
    key("keyup", " ");
    const final = state(), coastBefore = final;
    for (let i = 0; i < Math.round(0.25 / dt); i++) scene.update(dt, time += dt);
    const coast = state();
    return { start, initial, final, coastBefore, coast, elapsed, contactFrames, ceilingSteps: [...ceilings], maxBodyStep, maxEyeStep, maxStall, violations, trace, mode, dt, backend: B.renderer.kind };
  } finally { key("keyup", " "); }
};
