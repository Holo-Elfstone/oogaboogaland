export const fireContactProbe = ({ dt = 1 / 60 } = {}) => {
  const B = window.__ooga, BL = window.BL, scene = BL.scenes.hub, crew = B.crew, H = B.headquarters;
  const floor = B.island.headquarters.floor, keys = ["torso", "head", "legL", "legR", "armL", "armR"];
  let time = B.renderOpts.matrix.time;
  const step = (seconds = dt, full = false) => {
    for (let i = 0; i < Math.ceil(seconds / dt); i++) (full ? scene : crew).update(dt, time += dt);
  };
  step(2, true);
  const entries = [...B.cavemen.values()], saved = entries.map((cave) => ({ cave, override: cave.override, visible: cave.root.visible }));
  for (const cave of entries) cave.override = "working";
  crew.refreshStates(true);
  const [player, receiver, source, extra] = entries;
  for (const cave of entries) cave.root.visible = false;
  const park = (cave, x, z, y = floor) => {
    cave.root.visible = true;
    cave.root.position.x = x; cave.root.position.y = y + cave.baseY; cave.root.position.z = z;
    cave.root.rotation.x = cave.root.rotation.y = cave.root.rotation.z = 0;
    cave.root.quaternion = null;
    cave.hop = cave.hopV = cave.cheer = cave.catchT = cave.yawn = 0;
    cave.leap.vx = cave.leap.vz = 0;
    cave.walk = null;
    cave.bedTravel.mode = "";
    cave.avoidance.navigation.mode = 0;
    cave.act.kind = "idle"; cave.act.until = Infinity; cave.act.said = true;
    cave.nextBuildAt = cave.yawnAt = Infinity;
    Object.assign(cave.camp.panic, { active: false, threat: null, resumeWalk: null, resumeSleep: false, clearFor: 0 });
  };
  const key = (type, value) => window.dispatchEvent(new KeyboardEvent(type, { key: value, bubbles: true, cancelable: true }));
  const values = (cave, field) => keys.map((name) => cave.parts[name][field]);
  const settleFire = (cave) => {
    if (cave.camp.burning) crew.dropRoll(cave);
    step(4.4);
  };
  let wall = null;
  park(player, 1.3, 2.8);
  B.pilot.possess(player);
  try {
    crew.relocatePlayer({ x: 1.3, y: floor, z: 2.8 }, 0);
    const parts = keys.map((name) => player.parts[name]);
    const original = parts.map((part) => ({ geometry: part.geometry, children: part.children.length }));
    crew.ignite(player); step();
    const early = values(player, "ember");
    for (let i = 0; i < Math.ceil(4 / dt) && player.camp.spread[2] < 0.999; i++) step();
    const legFull = { age: player.camp.burnAge, spread: player.camp.spread[2], ember: player.parts.legL.ember };
    step(1.3);
    const legHot = { age: player.camp.burnAge, spread: player.camp.spread[2], ember: player.parts.legL.ember };
    step(Math.max(0, 4 - player.camp.burnAge));
    const middle = values(player, "ember");
    for (let i = 0; i < Math.ceil(8 / dt) && player.camp.spread[1] === 0; i++) step();
    const headNew = { age: player.camp.burnAge, headSpread: player.camp.spread[1], legSpread: player.camp.spread[2], head: player.parts.head.ember, leg: player.parts.legL.ember };
    step(Math.max(0, 11 - player.camp.burnAge));
    const late = values(player, "ember"), cleanBeforeRoll = values(player, "scorch").every((v) => v === 0);
    crew.dropRoll(player); step(1);
    const rolling = values(player, "ember"), charDuringRoll = parts.every((part, i) => part.scorch > 0 && part.scorch < player.camp.spread[i] && part.ember > 0);
    step(2.1);
    const glow = { early, middle, late, rolling, legFull, legHot, headNew, cleanBeforeRoll, charDuringRoll,
      brightensAtFixedCoverage: legFull.spread >= 0.999 && legHot.spread >= 0.999 && legHot.ember > legFull.ember + 0.08,
      oldLegHotter: headNew.headSpread > 0 && headNew.leg / headNew.legSpread > headNew.head / headNew.headSpread * 2,
      out: !player.camp.burning && !player.camp.rolling && values(player, "ember").every((v) => v === 0),
      scorched: values(player, "scorch").every((v) => v > 0),
      nativeParts: parts.every((part, i) => part.geometry === original[i].geometry && part.children.length === original[i].children) };
    step(1.3);

    crew.relocatePlayer({ x: 1.3, y: floor, z: 2.8 }, 0);
    park(receiver, 2.8, 2.8);
    crew.ignite(player); step();
    const distant = !receiver.camp.burning;
    park(receiver, 1.95, 2.8, floor + player.bodyHeight + 0.25); step();
    const vertical = !receiver.camp.burning;
    park(receiver, 2.08, 2.8);
    wall = BL.scene.createNode({ position: { x: 1.69, y: floor + 1.25, z: 2.8 }, geometry: BL.models.box({ w: 0.08, h: 2.5, d: 1.5, color: "#655848" }) });
    BL.scene.addChild(scene.root, wall); H.solids.props.add(wall); H.solids.props.sync();
    const wallBlocked = !H.solids.props.segmentClear(1.3, floor + 0.8, 2.8, 2.08, floor + 0.8, 2.8, 0.01, 0.1);
    step();
    const throughWall = !receiver.camp.burning;
    H.solids.props.remove(wall); BL.scene.removeChild(scene.root, wall); wall = null;

    park(receiver, 2.7, 2.8);
    // A healthy Ooga now flees faster than the walking player. This small
    // alcove lets the approach make real contact without disabling fear.
    wall = BL.scene.createNode();
    for (const z of [2.3, 3.3]) BL.scene.addChild(wall, BL.scene.createNode({ position: { x: 2.6, y: floor + 1.5, z }, geometry: BL.models.box({ w: 1.5, h: 3, d: 0.08, color: "#655848" }) }));
    BL.scene.addChild(wall, BL.scene.createNode({ position: { x: 3.18, y: floor + 1.5, z: 2.8 }, geometry: BL.models.box({ w: 0.08, h: 3, d: 1.2, color: "#655848" }) }));
    BL.scene.addChild(scene.root, wall); H.solids.props.add(wall); H.solids.props.sync();
    B.pilot.orbit.yaw = B.pilot.orbit.tYaw = 0;
    const startX = player.root.position.x;
    key("keydown", "d");
    for (let i = 0; i < Math.ceil(1 / dt) && !receiver.camp.burning; i++) step(dt, true);
    key("keyup", "d");
    const walking = { lit: receiver.camp.burning, moved: player.root.position.x - startX,
      distance: Math.hypot(player.root.position.x - receiver.root.position.x, player.root.position.z - receiver.root.position.z),
      prompt: document.getElementById("act").textContent };
    const receiverIgnitions = receiver.camp.ignitions;
    step(0.1);
    walking.stableIgnition = receiver.camp.ignitions === receiverIgnitions;
    H.solids.props.remove(wall); BL.scene.removeChild(scene.root, wall); wall = null;
    crew.relocatePlayer({ x: -12, y: 0, z: -6 }, 0);
    const reactions = [];
    const observeReaction = (cave) => {
      const x = cave.root.position.x, z = cave.root.position.z, delay = cave.camp.reactionDelay;
      let panicTravel = 0;
      for (let i = 0; i < Math.ceil(16 / dt) && !cave.camp.rolling; i++) {
        const px = cave.root.position.x, pz = cave.root.position.z;
        step();
        if (!cave.camp.rolling) panicTravel += Math.hypot(cave.root.position.x - px, cave.root.position.z - pz);
      }
      const age = cave.camp.burnAge, began = cave.camp.rolling && !!cave.root.quaternion;
      step(3.1);
      const out = !cave.camp.burning && !cave.camp.rolling;
      const cooldown = cave.camp.cooldown > 0 && !crew.ignite(cave);
      const recovery = cave.act.kind === "idle" && Number.isFinite(cave.act.until) || !!cave.walk || !!cave.bedTravel.mode;
      const embersOut = values(cave, "ember").every((v) => v === 0);
      step(1.6);
      const resumes = !cave.camp.burning && !cave.camp.rolling && (cave.act.kind !== "idle" || !!cave.walk || !!cave.bedTravel.mode);
      reactions.push({ name: cave.traits.name, delay, age, panicTravel, began, out, cooldown, recovery, embersOut, resumes });
      park(cave, x, z);
      cave.root.visible = false;
    };
    observeReaction(receiver);
    settleFire(player);

    crew.relocatePlayer({ x: 2.08, y: floor, z: 2.8 }, 0);
    park(source, 1.3, 2.8);
    crew.ignite(source); step(dt, true);
    const reverse = { lit: player.camp.burning, prompt: document.getElementById("act").textContent };
    crew.relocatePlayer({ x: -12, y: 0, z: -6 }, 0);
    key("keydown", " "); key("keyup", " "); step(dt, true);
    reverse.rolling = player.camp.rolling;
    observeReaction(source);

    // Each bystander reacts without player input, with its own bounded delay.
    park(extra, 1.3, 2.8);
    crew.ignite(extra);
    observeReaction(extra);
    const varyingDelays = new Set(reactions.map((r) => r.delay)).size;

    // Fresh flames remain contagious while the just-extinguished actor is
    // protected long enough to get up and move away from the same contact.
    crew.relocatePlayer({ x: 1.3, y: floor, z: 2.8 }, 0);
    crew.ignite(player); crew.dropRoll(player); step(3.05);
    const cleanIgnitions = player.camp.ignitions;
    park(receiver, player.root.position.x + 0.78, player.root.position.z);
    crew.ignite(receiver); step(0.1);
    const contactCooldown = { sourceBurning: receiver.camp.burning, protected: !player.camp.burning && player.camp.ignitions === cleanIgnitions, remaining: player.camp.cooldown };
    crew.relocatePlayer({ x: -1.4, y: floor, z: 2.8 }, 0);
    settleFire(receiver); receiver.root.visible = false;

    // Let an actual bed pose settle before bringing the burning player up
    // to its visible body bounds. Ignition must interrupt the nap safely.
    const bed = H.mattresses.find((entry) => !entry.sleeper && !entry.basement);
    park(extra, bed.walkAt.x, bed.walkAt.z, bed.walkAt.y);
    B.pilot.possess(extra);
    crew.relocatePlayer(bed.walkAt, 0);
    const admitted = crew.sleepPlayer(bed);
    step(1, true);
    const resting = extra.state === "sleeping" && extra.bedTravel.mode === "rest" && !!extra.root.quaternion;
    B.pilot.possess(player);
    const bounds = Array.from(extra.solidBounds), centerX = (bounds[0] + bounds[3]) * 0.5, centerZ = (bounds[2] + bounds[5]) * 0.5;
    const approaches = [
      { x: bounds[3] + 0.4, z: centerZ }, { x: bounds[0] - 0.4, z: centerZ },
      { x: centerX, z: bounds[5] + 0.4 }, { x: centerX, z: bounds[2] - 0.4 }
    ].sort((a, b) => Math.hypot(a.x - bed.walkAt.x, a.z - bed.walkAt.z) - Math.hypot(b.x - bed.walkAt.x, b.z - bed.walkAt.z));
    crew.ignite(player);
    for (const point of approaches) {
      if (!B.island.clearAt(point.x, bed.y + 0.01, point.z, 0.3, player.bodyHeight)) continue;
      crew.relocatePlayer({ x: point.x, y: bed.y, z: point.z }, 0);
      step();
      if (extra.camp.burning) break;
    }
    const sleeper = { admitted, resting, lit: extra.camp.burning, awake: extra.state === "working" && extra.bedTravel.mode === "", bedFreed: bed.sleeper === null && extra.bedroll === null };
    crew.relocatePlayer({ x: -12, y: 0, z: -6 }, 0);
    observeReaction(extra);
    sleeper.reaction = reactions.pop();
    return { backend: B.renderer.kind, dt, glow, separation: { distant, vertical, wallBlocked, throughWall }, walking, reverse, reactions, varyingDelays, contactCooldown, sleeper };
  } finally {
    key("keyup", "d");
    if (wall) { H.solids.props.remove(wall); BL.scene.removeChild(scene.root, wall); }
    for (const entry of saved) { entry.cave.override = entry.override; entry.cave.root.visible = entry.visible; }
  }
};
