(() => {
  "use strict";
  const BL = window.BL = window.BL || {};
  const { math, models, contributors } = BL;
  const { clamp, lerp, damp, ease, randomInt } = math;
  const { createNode, addChild, removeChild, addTween } = BL.scene;
  const EAT_RATE = 1 / 20;
  const CHEW_PERIOD = 3.2;
  const BODY_PARTS = ["torso", "head", "legL", "legR", "armL", "armR"];
  const SWAG_ANCHORS = ["hat", "face"];
  const FAN_STANDOFF = 1.1;
  const FAN_ARC = 2.2;
  // The widest the fan opens, so the near side stays clear however many eat
  const FAN_SPREAD = 5;
  const POKES = ["Ooga?", "Booga!", "No poke.", "Hmm banana?", "Ooga booga booga."];
  const SLEEP_POKES = ["zzz... grr", "five more minutes", "zzz"];
  const SLEEP_POSES = ["left", "stomach", "back", "right"];
  const BUILD_QUOTES = ["Ooga Booga!", "Ooga Booga BUILD!", "Ooga Booga MORE TOOLS!"];
  const IDLE_QUOTES = ["Ooga.", "Hmm.", "Nice rock.", "Booga?", "Where banana?", "Ooga booga.", "Sky big.", "Good cave."];
  const PHASE_QUOTES = {
    dawn: ["Sun come.", "Big yawn.", "Cold rock.", "Bird loud.", "Sky pink.", "Ooga wake."],
    morning: ["Good day for banana.", "Ooga work.", "Sun warm.", "Rock dry now.", "Big day.", "Booga hungry."],
    noon: ["Hot rock.", "Sun high.", "Shade good.", "Ooga sweat.", "Banana warm.", "Too bright."],
    dusk: ["Sky orange. Pretty.", "Fire soon.", "Sun go down.", "Long shadow.", "Ooga tired.", "Bug sing."],
    night: ["Stars many.", "Fire warm.", "Moon big.", "Dark out there.", "Ooga count star.", "Owl."],
    midnight: ["Ooga not sleepy.", "Owl says hoo.", "Very dark. Very quiet.", "Rock cold.", "Booga snore.", "Moon watch."]
  };
  // Meal and idle timings for a working caveman
  const EAT_MIN = 14, EAT_SPREAD = 20, HUNGRY_LINGER = 4, IDLE_MIN = 3, IDLE_SPREAD = 6, TRIPS_MAX = 3;
  const { WALK } = BL.pilot;
  const WANDER_SPEED = 1.3, RUSH_SPEED = 2.8, PLAYER_SPEED = WALK.speed;
  const PLAYER_STEP = 0.125;
  const NAV_WIDTH = 21, NAV_SIZE = NAV_WIDTH * NAV_WIDTH, NAV_HALF = 10, NAV_CELL = 0.5, NAV_CENTER = NAV_HALF * NAV_WIDTH + NAV_HALF;
  const JUMP_SPEED = 4.8, JET_FUEL_SECONDS = 8, JET_MOVE_SECONDS = JET_FUEL_SECONDS * 2, JET_REFILL_SECONDS = 4, JET_LAUNCH_FUEL = 0.2;
  // Fuel limits range and altitude; releasing thrust uses ordinary gravity.
  const JET_ACCEL = 20, JET_RISE = 7, JET_SPEED = 6.4, JET_PUFF = 0.05;
  const JET_SPARKS = [models.particleGeometry("#ffb13b", 0.09, 1), models.particleGeometry("#f3efe4", 0.07, 0.6)];
  const LAND_DUST = [models.particleGeometry("#a3874f", 0.1, 0)];
  // A drop deeper than a step, mirroring the hub's STEP_MAX
  const STEP = WALK.step;
  const YAWN_DUR = 2.4;
  const REACH = 1.6;
  const MUZZLE = new Float32Array(3);
  const SLEEP_COMPRESSION = 0.025, SLEEP_SIDE_COMPRESSION = 0.16;
  const SLEEP_BOUNDS = { min: Infinity, headMin: Infinity, coreMin: Infinity, feetMin: Infinity };
  const SLEEP_BASE = math.quat.create(), SLEEP_TILT = math.quat.create(), SLEEP_INVERSE = math.quat.create();
  const LOOK_ROTATION = math.quat.create();
  const PILLOW_CLIP_A = new Float64Array(48), PILLOW_CLIP_B = new Float64Array(48);
  const PILLOW_FRAME = { x: 0, y: 0, z: 0, sr: 0, cr: 1, minX: 0, maxX: 0, minZ: 0, maxZ: 0, minimum: Infinity };
  const clipHeadToPillow = (node) => {
    if (!node.visible) return;
    const frame = PILLOW_FRAME;
    if (node.geometry) {
      const verts = node.geometry.verts, m = node.world;
      for (const face of node.geometry.faces) {
        let src = PILLOW_CLIP_A, dst = PILLOW_CLIP_B, count = face.i.length;
        for (let i = 0; i < count; i++) {
          const v = face.i[i] * 3, x = m[0] * verts[v] + m[4] * verts[v + 1] + m[8] * verts[v + 2] + m[12] - frame.x;
          const z = m[2] * verts[v] + m[6] * verts[v + 1] + m[10] * verts[v + 2] + m[14] - frame.z;
          src[i * 3] = x * frame.cr - z * frame.sr;
          src[i * 3 + 1] = m[1] * verts[v] + m[5] * verts[v + 1] + m[9] * verts[v + 2] + m[13] - frame.y;
          src[i * 3 + 2] = x * frame.sr + z * frame.cr;
        }
        for (let edge = 0; edge < 4 && count >= 3; edge++) {
          const axis = edge < 2 ? 0 : 2, sign = edge & 1 ? -1 : 1;
          const bound = edge === 0 ? frame.maxX : edge === 1 ? frame.minX : edge === 2 ? frame.maxZ : frame.minZ;
          let out = 0;
          for (let i = 0; i < count; i++) {
            const a = i * 3, b = ((i + 1) % count) * 3, ai = (src[a + axis] - bound) * sign <= 0, bi = (src[b + axis] - bound) * sign <= 0;
            if (ai) { dst[out * 3] = src[a]; dst[out * 3 + 1] = src[a + 1]; dst[out * 3 + 2] = src[a + 2]; out++; }
            if (ai !== bi) {
              const k = (bound - src[a + axis]) / (src[b + axis] - src[a + axis]);
              dst[out * 3] = lerp(src[a], src[b], k); dst[out * 3 + 1] = lerp(src[a + 1], src[b + 1], k); dst[out * 3 + 2] = lerp(src[a + 2], src[b + 2], k); out++;
            }
          }
          count = out;
          const swap = src; src = dst; dst = swap;
        }
        let area = 0, minimum = Infinity;
        for (let i = 0; i < count; i++) {
          const a = i * 3, b = ((i + 1) % count) * 3;
          area += src[a] * src[b + 2] - src[b] * src[a + 2];
          minimum = Math.min(minimum, src[a + 1]);
        }
        if (Math.abs(area) > 1e-12) frame.minimum = Math.min(frame.minimum, minimum);
      }
    }
    for (const child of node.children) clipHeadToPillow(child);
  };
  const pillowMinimum = (cave, bed, fitting) => {
    const frame = PILLOW_FRAME, box = bed.collisionBoxes, travel = cave.bedTravel;
    frame.x = fitting ? 0 : bed.x; frame.y = fitting ? -travel.restY : bed.y; frame.z = fitting ? -travel.restZ : bed.z;
    frame.sr = fitting ? 0 : bed.sr; frame.cr = fitting ? 1 : bed.cr;
    frame.minX = box[6]; frame.maxX = box[9]; frame.minZ = box[8]; frame.maxZ = box[11]; frame.minimum = Infinity;
    clipHeadToPillow(cave.parts.head);
    return frame.minimum;
  };
  const measureSleeper = (node, head, headNode, feet = false, legL, legR) => {
    if (!node.visible) return;
    if (node.geometry) {
      const verts = node.geometry.verts, m = node.world;
      for (let i = 0; i < verts.length; i += 3) {
        const y = m[1] * verts[i] + m[5] * verts[i + 1] + m[9] * verts[i + 2] + m[13];
        if (head) SLEEP_BOUNDS.headMin = Math.min(SLEEP_BOUNDS.headMin, y);
        else {
          SLEEP_BOUNDS.min = Math.min(SLEEP_BOUNDS.min, y);
          if (feet) SLEEP_BOUNDS.feetMin = Math.min(SLEEP_BOUNDS.feetMin, y);
          else SLEEP_BOUNDS.coreMin = Math.min(SLEEP_BOUNDS.coreMin, y);
        }
      }
    }
    for (const child of node.children) measureSleeper(child, head || child === headNode, headNode, feet || child === legL || child === legR, legL, legR);
  };
  const measureSleepPitch = (cave, pitch) => {
    const scale = cave.parts.torso.scale.y;
    cave.parts.torso.scale.y = 0.985;
    math.quat.fromAxisAngle(SLEEP_TILT, 1, 0, 0, pitch);
    math.quat.multiply(cave.sleepTargetRotation, SLEEP_TILT, SLEEP_BASE);
    cave.root.quaternion = cave.sleepTargetRotation;
    BL.scene.updateWorld(cave.root);
    SLEEP_BOUNDS.min = SLEEP_BOUNDS.headMin = SLEEP_BOUNDS.coreMin = SLEEP_BOUNDS.feetMin = Infinity;
    measureSleeper(cave.root, false, cave.parts.head, false, cave.parts.legL, cave.parts.legR);
    // Fit both ends of the breathing cycle once, so it cannot deepen the
    // settled mattress compression on a later frame.
    cave.parts.torso.scale.y = 1.015;
    BL.scene.updateWorld(cave.parts.torso, cave.root.world);
    measureSleeper(cave.parts.torso, false, cave.parts.head);
    cave.parts.torso.scale.y = scale;
  };
  const setVec = (v, x, y, z) => {
    v.x = x;
    v.y = y;
    v.z = z;
    return v;
  };
  const popNode = (node) => {
    const target = { ...node.scale };
    Object.assign(node.scale, { x: 0.01, y: 0.01, z: 0.01 });
    addTween({
      dur: 0.5, ease: ease.outBack, update: (k) => {
        node.scale.x = target.x * k;
        node.scale.y = target.y * k;
        node.scale.z = target.z * k;
      }
    });
  };
  // Cache the head's full pitch envelope once, including fixed attachments.
  // Looking around at a ceiling must fit the same body used by movement.
  const bodyHeightOf = (cave) => {
    BL.scene.updateWorld(cave.root);
    const head = cave.parts.head, pivotY = head.world[13], pivotZ = head.world[14];
    let reach = 0;
    const inspect = (geometry, m) => {
      const verts = geometry.verts;
      for (let i = 0; i < verts.length; i += 3) {
        const y = m[1] * verts[i] + m[5] * verts[i + 1] + m[9] * verts[i + 2] + m[13] - pivotY;
        const z = m[2] * verts[i] + m[6] * verts[i + 1] + m[10] * verts[i + 2] + m[14] - pivotZ;
        reach = Math.max(reach, Math.hypot(y, z));
      }
    };
    const visit = (node) => {
      if (!node.visible) return;
      if (node.geometry) inspect(node.geometry, node.world);
      for (const child of node.children) visit(child);
    };
    visit(head);
    inspect(cave.headClosed, head.world);
    return pivotY + reach;
  };
  // The cavemen of one scene
  const create = (ctx) => {
    const { root, input, hud, game, world, bedrolls, viewYaw, buildSpots, walkIn, wanderSpot } = ctx;
    // Ground under a point, given how high the caveman already is
    const groundAt = ctx.groundAt || (() => 0);
    const walkable = ctx.walkable || (() => true);
    const npcWalkable = ctx.npcWalkable || walkable;
    const inBananas = ctx.inBananas || (() => false);
    const npcDestinationBlocked = ctx.npcDestinationBlocked || inBananas;
    // Where a flying caveman may go
    const flyable = ctx.flyable || walkable;
    const cavemen = new Map();
    contributors.roster.forEach((contributor, i) => {
      const cave = models.caveman(contributors.traitsFor(contributor.name));
      Object.assign(cave, {
        slot: null,
        index: i,
        bedroll: null,
        bedTravel: { mode: "", route: null, index: 0, toBed: false, bed: null, manual: false, pose: "left", roll: 1, phase: 0, blocked: 0, retry: 0, fromX: 0, fromY: 0, fromZ: 0, fromYaw: 0, fromHeadX: 0, fromHeadY: 0, fromHeadZ: 0, fromArmLX: 0, fromArmRX: 0, fromArmLZ: 0, fromArmRZ: 0, armLX: 0, armRX: 0, armLZ: 0, armRZ: 0, compression: SLEEP_COMPRESSION, fromCompression: SLEEP_COMPRESSION, restY: 0, restZ: 0, pitch: 0, headDrop: 0, headDropX: 0, headDropY: 0, headDropZ: 0 },
        sleepHead: { x: 0, y: 0, z: 0 },
        headLookRotation: math.quat.create(), headLookPosition: { x: 0, y: 0, z: 0 },
        sleepRotation: math.quat.create(), sleepFromRotation: math.quat.create(), sleepTargetRotation: math.quat.create(),
        sleepParts: { armLX: cave.parts.armL.position.x, armRX: cave.parts.armR.position.x, headX: cave.parts.head.position.x, headY: cave.parts.head.position.y, headZ: cave.parts.head.position.z, equipment: cave.root.children.filter((node) => !BODY_PARTS.some((key) => cave.parts[key] === node)) },
        phase: i * 1.37,
        baseY: cave.root.position.y,
        bodyHeight: bodyHeightOf(cave),
        state: "away",
        contributor,
        zzzTimer: 0,
        build: null,
        walk: null,
        pathing: ctx.npcPaths ? ctx.npcPaths.createState() : null,
        avoidance: { active: false, side: i & 1 ? 1 : -1, stalled: 0, best: Infinity, tx: NaN, tz: NaN,
          navigation: { mode: 0, x: 0, z: 0, count: 0, index: 0, searches: 0, expansions: 0,
            jumpCandidate: 0, jumps: 0, jumpX: 0, jumpZ: 0, clearance: 0, double: false, boosted: false, moving: false,
            costs: new Float32Array(NAV_SIZE), parents: new Int16Array(NAV_SIZE), heights: new Float32Array(NAV_SIZE), closed: new Uint8Array(NAV_SIZE), path: new Int16Array(NAV_SIZE) } },
        hop: 0,
        hopV: 0,
        jumps: 0,
        cheer: 0,
        catchT: 0,
        yawn: 0,
        yawnAt: 12 + i * 4.3 + Math.random() * 20,
        leap: { vx: 0, vz: 0, land: 0 },
        highlightTarget: 0,
        highlight: 0,
        nextBuildAt: 8 + i * 2.5 + Math.random() * 6,
        jet: null,
        jetFuel: 1,
        jetRecovering: false,
        cloudSupport: null,
        viewLift: 0,
        act: { kind: "eat", until: 0, trips: 0, sayAt: 0, said: true, phase: 0, spot: { x: 0, z: 0, ry: NaN } },
        swagNodes: []
      });
      cave.root.visible = false;
      addChild(root, cave.root);
      for (const key of BODY_PARTS) input.add(cave.parts[key], { kind: "caveman", cave, priority: 1 });
      cavemen.set(contributor.name, cave);
    });
    const stateOf = (cave) => cave.override || contributors.stateFor(cave.contributor);
    const groundY = (cave) => {
      const p = cave.root.position;
      const feet = p.y - cave.baseY;
      return cave.baseY + groundAt(p.x, p.z, feet, feet, cave);
    };
    const grounded = (cave) => cave.bedTravel.mode === "rest" || cave.hop === 0 && cave.hopV <= 0 && Math.abs(cave.root.position.y - groundY(cave)) < 1e-6;
    const atPile = (cave) => cave.act.kind === "eat" || cave.act.kind === "rush";
    // Rooms are reserved only for this nap. The lab keeps its existing bedrolls.
    const claimBedroll = (cave) => {
      if (cave.bedroll) return true;
      if (ctx.bedRoute) {
        let available = 0;
        for (const bed of bedrolls) if (!bed.sleeper) available++;
        if (!available) return false;
        let chosen = randomInt(available);
        for (const bed of bedrolls) if (!bed.sleeper && chosen-- === 0) { cave.bedroll = bed; bed.sleeper = cave; return true; }
      }
      cave.bedroll = bedrolls.find((bed) => !bed.sleeper) || bedrolls[cave.index % bedrolls.length];
      if (!cave.bedroll.sleeper) cave.bedroll.sleeper = cave;
      return true;
    };
    const releaseBedroll = (cave) => {
      if (cave.bedroll && cave.bedroll.sleeper === cave) {
        cave.bedroll.sleeper = null;
      }
      cave.bedroll = null;
    };
    const stateCounts = () => {
      const counts = { working: 0, sleeping: 0, away: 0 };
      for (const cave of cavemen.values()) counts[cave.state]++;
      return counts;
    };
    const workingCavemen = () => [...cavemen.values()].filter((c) => c.state === "working" && !c.walk && !c.bedTravel.mode);
    const eatingCavemen = () => [...cavemen.values()].filter((c) => c.state === "working" && !c.walk && !c.build && atPile(c));
    const feedableCavemen = () => [...cavemen.values()].filter((c) => c.root.visible && (c.state === "working" || c.state === "sleeping"));
    const releaseBuild = (cave) => {
      if (!cave.build) return;
      if (!cave.build.built) buildSpots.push(cave.build.spot);
      cave.build = null;
    };
    const clearHeadLook = (cave) => {
      const head = cave.parts.head;
      if (head.quaternion !== cave.headLookRotation) return;
      head.quaternion = null;
      setVec(head.position, cave.headLookPosition.x, cave.headLookPosition.y, cave.headLookPosition.z);
    };
    const resetPose = (cave) => {
      clearHeadLook(cave);
      Object.assign(cave.root.rotation, { x: 0, y: 0, z: 0 });
      cave.root.quaternion = null;
      Object.assign(cave.root.scale, { x: 1, y: 1, z: 1 });
      Object.assign(cave.parts.armL.rotation, { x: -0.2, y: 0, z: -0.12 });
      Object.assign(cave.parts.armR.rotation, { x: -0.2, y: 0, z: 0.12 });
      cave.parts.legL.rotation.x = 0;
      cave.parts.legR.rotation.x = 0;
      cave.parts.legL.rotation.z = cave.parts.legR.rotation.z = 0;
      cave.parts.head.rotation.x = 0;
      cave.parts.head.rotation.y = 0;
      cave.parts.head.position.x = cave.sleepParts.headX;
      cave.parts.head.position.y = cave.sleepParts.headY + cave.viewLift;
      cave.parts.head.position.z = cave.sleepParts.headZ;
      cave.parts.armL.position.x = cave.sleepParts.armLX;
      cave.parts.armR.position.x = cave.sleepParts.armRX;
      cave.parts.torso.scale.y = 1;
      cave.parts.club.visible = true;
      for (const node of cave.sleepParts.equipment) node.visible = true;
      cave.parts.snack.visible = false;
      cave.parts.gun.visible = false;
      cave.yawn = 0;
    };
    const refreshRosterRow = (cave) => {
      hud.setRosterRow(cave.traits.name, cave.state, contributors.ageLabel(cave.contributor));
    };
    let player = null;
    // World-space drive vector plus signed close-view intent. Reused every frame.
    const steer = { x: 0, z: 0, view: 0, forward: 0, strafe: 0 };
    const startBedRoute = (cave, bed, toBed) => {
      const travel = cave.bedTravel;
      cave.avoidance.tx = NaN;
      if (!toBed) {
        const slot = closestSlot(cave);
        if (slot) cave.slot = slot;
      }
      const ground = groundY(cave), airborne = cave.hop > 0 || cave.hopV > 0 || cave.root.position.y - ground > 0.1;
      travel.route = airborne ? null : ctx.bedRoute(cave, bed, toBed);
      if (airborne) cave.hop = Math.max(cave.hop, cave.root.position.y - ground);
      else cave.root.position.y = ground;
      travel.index = travel.phase = travel.blocked = 0;
      travel.toBed = toBed;
      travel.bed = bed;
      travel.mode = airborne ? "landing" : travel.route ? "walk" : "waiting";
      if (travel.route) cave.cloudSupport = null;
      travel.retry = 1;
      cave.walk = null;
      cave.act.kind = toBed ? "bed" : "return";
    };
    const standFromBed = (cave) => {
      const travel = cave.bedTravel, lying = travel.mode === "rest" || travel.mode === "lie";
      if (lying) cave.root.position.y = cave.baseY + (cave.bedroll.y === undefined ? groundAt(cave.root.position.x, cave.root.position.z, Infinity, Infinity, cave) : cave.bedroll.y);
      resetPose(cave);
      if (lying) {
        cave.hop = cave.hopV = cave.jumps = 0;
        cave.leap.vx = cave.leap.vz = cave.leap.land = 0;
        cave.cloudSupport = null;
      }
      cave.cheer = cave.catchT = 0;
      travel.mode = "";
      travel.route = null;
      travel.manual = false;
    };
    const startSleep = (cave) => {
      const r = cave.root, visible = r.visible;
      if (cave === player) release();
      standFromBed(cave);
      releaseBuild(cave);
      removeJetpack(cave);
      cave.state = "sleeping";
      cave.parts.head.geometry = cave.headOpen;
      r.visible = true;
      if (!visible) setVec(r.position, walkIn.x, cave.baseY + groundAt(walkIn.x, walkIn.z, Infinity, Infinity, cave), walkIn.z);
      if (claimBedroll(cave)) startBedRoute(cave, cave.bedroll, true);
      else { cave.bedTravel.mode = "waiting"; cave.bedTravel.toBed = true; cave.bedTravel.retry = 1; }
      refreshRosterRow(cave);
    };
    const applyState = (cave, state) => {
      if (cave.state === state) {
        // Re-seat a moved eater, interrupt nothing else
        if (state === "working") walkToSlot(cave);
        return;
      }
      if (ctx.bedRoute && state === "sleeping") { startSleep(cave); return; }
      if (ctx.bedRoute && cave.state === "sleeping" && state === "working") { beginWalk(cave); return; }
      if (state === "working" && cave.walk) {
        cave.walk.tx = cave.slot.x;
        cave.walk.tz = cave.slot.z;
        cave.walk.to = "slot";
        return;
      }
      if (cave === player) release();
      if (ctx.bedRoute || cave.bedTravel.mode) { standFromBed(cave); cave.bedTravel.bed = null; }
      cave.state = state;
      cave.parts.head.geometry = state === "sleeping" ? cave.headClosed : cave.headOpen;
      resetPose(cave);
      releaseBuild(cave);
      if (state === "sleeping") claimBedroll(cave);
      else releaseBedroll(cave);
      const r = cave.root;
      if (state === "working") {
        r.visible = true;
        standAtSlot(cave);
        startMeal(cave);
        popNode(r);
      } else if (state === "sleeping") {
        r.visible = !cave.bedroll.hidden;
        Object.assign(r.position, { x: cave.bedroll.x, y: cave.bedroll.y === undefined ? 0.42 : cave.bedroll.y, z: cave.bedroll.z });
        Object.assign(r.rotation, { x: cave.bedroll.rx || 0, y: cave.bedroll.ry || 0, z: cave.bedroll.rz === undefined ? -Math.PI / 2 : cave.bedroll.rz });
        cave.parts.armL.rotation.x = -1.5;
        cave.parts.armR.rotation.x = -1.5;
        if (r.visible) popNode(r);
      } else {
        r.visible = false;
      }
      refreshRosterRow(cave);
    };
    const beginWalk = (cave) => {
      if (cave === player && cave.bedTravel.manual && cave.state === "sleeping") { wakePlayer(); return; }
      if (ctx.bedRoute && cave.state === "sleeping") {
        const bed = cave.bedroll;
        standFromBed(cave);
        releaseBedroll(cave);
        cave.state = "working";
        cave.parts.head.geometry = cave.headOpen;
        startBedRoute(cave, bed, false);
        refreshRosterRow(cave);
        return;
      }
      const from = cave.state === "sleeping" ? cave.bedroll.wakeAt || cave.bedroll : walkIn;
      const fresh = cave.state !== "sleeping";
      if (cave.bedTravel.mode) standFromBed(cave);
      cave.state = "working";
      releaseBedroll(cave);
      cave.parts.head.geometry = cave.headOpen;
      cave.walk = { tx: cave.slot.x, tz: cave.slot.z, speed: 2, phase: 0, heading: Math.atan2(cave.slot.x - from.x, cave.slot.z - from.z), to: "slot" };
      cave.avoidance.tx = NaN;
      resetPose(cave);
      releaseBuild(cave);
      cave.act.kind = "eat";
      const r = cave.root;
      r.visible = true;
      Object.assign(r.position, { x: from.x, y: cave.baseY + groundAt(from.x, from.z, Infinity, Infinity, cave), z: from.z });
      r.rotation.y = cave.walk.heading;
      walkToSlot(cave, true);
      cave.walk.speed = 2;
      if (fresh) popNode(r);
      refreshRosterRow(cave);
    };
    // Eaters gather on the far side of the view
    const FAN_CENTER = Math.atan2(Math.cos(viewYaw), Math.sin(viewYaw)) + Math.PI;
    const wantedFanRadius = () => Math.max(ctx.pile.footprintEdge, ctx.pile.pileEdge()) + FAN_STANDOFF;
    let fanRadius = wantedFanRadius();
    const fanSlots = [];
    const assignFanSlots = (entries, isWorking) => {
      const farSide = FAN_CENTER;
      const eaters = entries.filter(isWorking);
      fanSlots.length = 0;
      // Neighbours stand FAN_ARC apart at any radius, closer only when the fan would wrap
      const angleStep = Math.min(clamp(FAN_ARC / fanRadius, 0.5, 1.1), FAN_SPREAD / Math.max(1, eaters.length - 1));
      // Nobody stands between the camera and the pile
      eaters.forEach((cave, i) => {
        const angle = farSide + (i - (eaters.length - 1) / 2) * angleStep;
        cave.slot = { x: Math.cos(angle) * fanRadius, z: Math.sin(angle) * fanRadius };
        fanSlots.push(cave.slot);
      });
    };
    const slotAvailable = (cave, slot) => {
      const floor = groundAt(slot.x, slot.z, 0, 0, cave);
      for (const other of cavemen.values()) {
        if (other === cave || !other.root.visible) continue;
        const p = other.root.position, feet = p.y - other.baseY;
        if (feet < floor + cave.bodyHeight && feet + other.bodyHeight > floor && Math.hypot(p.x - slot.x, p.z - slot.z) < 0.68) return false;
        // Reserve approaching eaters' destinations as well as checking their
        // bodies. A player can still take that place before they arrive.
        if (other !== player && other.walk?.to === "slot" && Math.hypot(other.walk.tx - slot.x, other.walk.tz - slot.z) < 0.68) return false;
      }
      return true;
    };
    const closestSlot = (cave) => {
      let closest = null, distance = Infinity;
      const p = cave.root.position;
      for (const slot of fanSlots) {
        const d = Math.hypot(slot.x - p.x, slot.z - p.z);
        if (d < distance && slotAvailable(cave, slot)) { closest = slot; distance = d; }
      }
      return closest;
    };
    const standAtSlot = (cave) => {
      setVec(cave.root.position, cave.slot.x, cave.baseY + groundAt(cave.slot.x, cave.slot.z, Infinity, Infinity, cave), cave.slot.z);
      cave.root.rotation.y = Math.atan2(-cave.slot.x, -cave.slot.z);
    };
    let elapsed = 0;
    // Start a meal and time it
    const startMeal = (cave) => {
      cave.act.kind = "eat";
      cave.act.until = elapsed + EAT_MIN + Math.random() * EAT_SPREAD;
      cave.act.trips = 0;
    };
    // Walk an eater to its slot
    const walkToSlot = (cave, force = false) => {
      if (cave.state !== "working" || cave.build) return;
      if (cave.bedTravel.mode) return;
      if (!force && !atPile(cave)) return;
      const slot = closestSlot(cave);
      if (slot) cave.slot = slot;
      if (cave.walk) {
        cave.walk.tx = cave.slot.x;
        cave.walk.tz = cave.slot.z;
        cave.walk.to = "slot";
        if (force) cave.walk.speed = RUSH_SPEED;
        return;
      }
      const { x, z } = cave.root.position;
      if (Math.hypot(cave.slot.x - x, cave.slot.z - z) < 0.15) return;
      cave.walk = { tx: cave.slot.x, tz: cave.slot.z, speed: force ? RUSH_SPEED : 1.6, phase: 0, heading: cave.root.rotation.y, to: "slot" };
      cave.avoidance.tx = NaN;
      cave.parts.snack.visible = false;
      cave.parts.head.rotation.x = 0;
      cave.parts.head.rotation.y = 0;
    };
    const updateFan = () => {
      const wanted = wantedFanRadius();
      if (Math.abs(wanted - fanRadius) < 0.08) return;
      fanRadius = wanted;
      const entries = [...cavemen.values()];
      assignFanSlots(entries, (cave) => cave.state === "working");
      for (const cave of entries) walkToSlot(cave);
    };
    const refreshStates = (settle = false) => {
      const entries = [...cavemen.values()];
      const next = new Map(entries.map((cave) => [cave, stateOf(cave)]));
      fanRadius = wantedFanRadius();
      assignFanSlots(entries, (cave) => next.get(cave) === "working");
      for (const cave of entries) {
        const target = next.get(cave);
        if (!settle && target === "working" && cave.state !== "working") beginWalk(cave);
        else applyState(cave, target);
      }
    };
    // Everyone awake and free runs to the pile
    const rush = () => {
      if (!wanderSpot) return;
      for (const cave of cavemen.values()) {
        if (cave.state !== "working" || cave.build || cave === player) continue;
        cave.act.kind = "rush";
        cave.act.until = elapsed + EAT_MIN + Math.random() * EAT_SPREAD;
        cave.act.trips = 0;
        walkToSlot(cave, true);
        if (!cave.walk) cave.act.kind = "eat";
      }
    };
    // Send a caveman off to a spot
    const startWander = (cave) => {
      const spot = cave.act.spot;
      wanderSpot(spot, cave);
      cave.act.kind = "wander";
      cave.act.trips++;
      cave.walk = { tx: spot.x, tz: spot.z, speed: WANDER_SPEED + Math.random() * 0.5, phase: 0, heading: cave.root.rotation.y, to: "spot" };
      cave.avoidance.tx = NaN;
      cave.parts.snack.visible = false;
      cave.parts.head.rotation.x = 0;
      cave.parts.head.rotation.y = 0;
    };
    const arriveAtSpot = (cave) => {
      const a = cave.act;
      if (!Number.isNaN(a.spot.ry)) cave.root.rotation.y = a.spot.ry;
      a.kind = "idle";
      a.until = elapsed + IDLE_MIN + Math.random() * IDLE_SPREAD;
      a.sayAt = elapsed + 0.8 + Math.random() * 2;
      a.said = false;
    };
    const headWorldOf = (cave) => cave.bedTravel.mode === "rest" || cave.bedTravel.mode === "lie" ? cave.sleepHead : ({ x: cave.root.position.x, y: cave.state === "sleeping" && !ctx.bedRoute ? 0.5 : cave.root.position.y - cave.baseY + cave.headOffset * 0.95 + cave.viewLift, z: cave.root.position.z });
    const bulletPool = Array.from({ length: 12 }, () => {
      const node = createNode({ geometry: models.bananaGeometry(), scale: { x: models.BANANA_AMMO_SCALE, y: models.BANANA_AMMO_SCALE, z: models.BANANA_AMMO_SCALE }, visible: false, matrixLiving: !!ctx.matrixLivingPile });
      addChild(root, node);
      return node;
    });
    let bulletIdx = 0;
    const flash = createNode({ geometry: models.box({ w: 0.3, h: 0.3, d: 0.3, color: "#ffd94a", emissive: 1 }), visible: false });
    addChild(root, flash);
    const fireBullet = (cave, spot) => {
      const node = bulletPool[bulletIdx++ % bulletPool.length];
      const h = cave.traits.height;
      // Muzzle at z = 0.64h in gun-local space
      math.mat4.transformPoint(MUZZLE, cave.parts.gun.world, 0, 0.03 * h, 0.64 * h);
      const from = { x: MUZZLE[0], y: MUZZLE[1], z: MUZZLE[2] };
      const to = { x: spot.x + (Math.random() - 0.5) * 0.4, y: 0.5 + Math.random() * 0.5, z: spot.z + (Math.random() - 0.5) * 0.2 };
      const dx = to.x - from.x, dz = to.z - from.z;
      Object.assign(node.rotation, { x: 0, y: Math.atan2(dx, dz), z: 0.6 });
      node.visible = true;
      addTween({
        dur: 0.22, update: (k) => {
          setVec(node.position, lerp(from.x, to.x, k), lerp(from.y, to.y, k), lerp(from.z, to.z, k));
          node.rotation.x += 0.5;
        }, done: () => {
          node.visible = false;
          Object.assign(flash.position, to);
          flash.visible = true;
          addTween({
            dur: 0.18, update: (k) => {
              const s = 0.2 + k * 1.1;
              setVec(flash.scale, s, s, s);
            }, done: () => {
              flash.visible = false;
            }
          });
        }
      });
    };
    const builtEquipment = [];
    const dismantling = [];
    const spawnEquipment = (spot) => {
      const geometry = models.buildableGeos[Math.floor(Math.random() * models.buildableGeos.length)]();
      const node = createNode({ position: { x: spot.x, y: groundAt(spot.x, spot.z), z: spot.z }, rotation: { x: 0, y: spot.ry, z: 0 }, geometry, sightHidden: !!geometry.sightHidden });
      addChild(root, node);
      builtEquipment.push({ node, spot });
      popNode(node);
      if (ctx.onModelChange) ctx.onModelChange();
    };
    const startBuild = (cave) => {
      if (!buildSpots.length) {
        const oldest = builtEquipment.shift();
        if (!oldest) {
          cave.nextBuildAt = elapsed + 20;
          return;
        }
        dismantling.push(oldest.node);
        addTween({
          dur: 0.4, ease: ease.inQuad, update: (k) => {
            const s = Math.max(0.01, 1 - k);
            setVec(oldest.node.scale, s, s, s);
          }, done: () => {
            removeChild(root, oldest.node);
            const i = dismantling.indexOf(oldest.node);
            if (i >= 0) dismantling.splice(i, 1);
            if (ctx.onModelChange) ctx.onModelChange();
          }
        });
        buildSpots.push(oldest.spot);
      }
      const spot = buildSpots.splice(Math.floor(Math.random() * buildSpots.length), 1)[0];
      cave.build = {
        spot,
        phase: "turn",
        t: 0,
        age: 0,
        shots: 0,
        shotTimer: 0,
        built: false,
        quote: BUILD_QUOTES[Math.floor(Math.random() * BUILD_QUOTES.length)],
        startYaw: cave.root.rotation.y,
        targetYaw: Math.atan2(spot.x - cave.slot.x, spot.z - cave.slot.z)
      };
      cave.parts.snack.visible = false;
      cave.parts.head.rotation.x = 0;
    };
    const runBuild = (cave, dt) => {
      const b = cave.build, parts = cave.parts;
      b.t += dt;
      b.age += dt;
      if (b.phase === "turn") {
        const k = Math.min(1, b.t / 0.35);
        cave.root.rotation.y = lerp(b.startYaw, b.targetYaw, k);
        parts.armR.rotation.x = lerp(-0.2, -1.55, k);
        parts.armL.rotation.x = lerp(-0.2, -1.1, k);
        parts.gun.visible = true;
        parts.snack.visible = false;
        if (k >= 1) {
          b.phase = "shoot";
          b.t = 0;
        }
      } else if (b.phase === "shoot") {
        parts.armR.rotation.x = -1.55 + Math.sin(b.t * 45) * 0.06;
        b.shotTimer -= dt;
        if (b.shotTimer <= 0 && b.shots < 5) {
          b.shotTimer = 0.16;
          b.shots++;
          fireBullet(cave, b.spot);
        }
        if (b.shots >= 5 && b.t > 1.15) {
          b.phase = "reveal";
          b.t = 0;
        }
      } else if (b.phase === "reveal") {
        if (!b.built) {
          b.built = true;
          spawnEquipment(b.spot);
        }
        if (b.t > 0.45) {
          b.phase = "return";
          b.t = 0;
        }
      } else if (b.phase === "return") {
        const k = Math.min(1, b.t / 0.35);
        cave.root.rotation.y = lerp(b.targetYaw, Math.atan2(-cave.slot.x, -cave.slot.z), k);
        parts.armR.rotation.x = lerp(-1.55, -0.2, k);
        parts.armL.rotation.x = lerp(-1.1, -0.2, k);
        if (k >= 1) {
          parts.gun.visible = false;
          cave.build = null;
          cave.nextBuildAt = elapsed + 14 + Math.random() * 22;
        }
      }
    };
    // Swinging limbs and bobbing feet
    const walkPose = (cave, phase) => {
      const parts = cave.parts;
      const swing = Math.sin(phase);
      parts.legL.rotation.x = swing * 0.55;
      parts.legR.rotation.x = -swing * 0.55;
      parts.armL.rotation.x = -0.2 - swing * 0.3;
      parts.armR.rotation.x = -0.2 + swing * 0.3;
      cave.root.position.y = groundY(cave) + Math.abs(Math.sin(phase)) * 0.04;
    };
    const standPose = (cave) => {
      const parts = cave.parts;
      parts.legL.rotation.x = parts.legR.rotation.x = 0;
      parts.legL.rotation.z = parts.legR.rotation.z = 0;
      parts.armL.rotation.x = parts.armR.rotation.x = -0.2;
      parts.torso.rotation.x = parts.torso.rotation.z = 0;
    };
    const sleepParts = (cave, k) => {
      clearHeadLook(cave);
      const parts = cave.parts, travel = cave.bedTravel;
      parts.armL.position.x = lerp(cave.sleepParts.armLX, travel.armLX, k);
      parts.armR.position.x = lerp(cave.sleepParts.armRX, travel.armRX, k);
      parts.armL.rotation.x = parts.armR.rotation.x = lerp(-0.2, 0, k);
      parts.armL.rotation.z = lerp(-0.12, travel.armLZ, k);
      parts.armR.rotation.z = lerp(0.12, travel.armRZ, k);
      parts.legL.rotation.x = parts.legL.rotation.z = parts.legR.rotation.x = parts.legR.rotation.z = 0;
      parts.head.position.x = cave.sleepParts.headX + travel.headDropX * k;
      parts.head.position.y = cave.sleepParts.headY + travel.headDropY * k;
      parts.head.position.z = cave.sleepParts.headZ + travel.headDropZ * k;
      parts.head.rotation.x = parts.head.rotation.y = 0;
    };
    const updateSleepHead = (cave) => {
      const p = cave.root.position, head = cave.parts.head.position;
      math.quat.rotateVec(MUZZLE, cave.sleepRotation, head.x, head.y + cave.traits.height * 3.5 / 16, head.z);
      setVec(cave.sleepHead, p.x + MUZZLE[0], p.y + MUZZLE[1], p.z + MUZZLE[2]);
    };
    const fitSleepPose = (cave, pose) => {
      clearHeadLook(cave);
      const travel = cave.bedTravel, bed = cave.bedroll, r = cave.root;
      const px = r.position.x, py = r.position.y, pz = r.position.z, hx = cave.parts.head.position.x, hy = cave.parts.head.position.y, hz = cave.parts.head.position.z, ax = cave.parts.armL.position.x, bx = cave.parts.armR.position.x;
      const az = cave.parts.armL.rotation.z, bz = cave.parts.armR.rotation.z, side = pose === "left" || pose === "right";
      travel.headDrop = travel.headDropX = travel.headDropY = travel.headDropZ = 0;
      travel.armLX = cave.sleepParts.armLX; travel.armRX = cave.sleepParts.armRX;
      travel.armLZ = side ? 0.35 : 0; travel.armRZ = -travel.armLZ;
      sleepParts(cave, 1);
      r.quaternion = null;
      setVec(r.position, 0, 0, 0);
      if (pose === "left") setVec(r.rotation, 0, Math.PI / 2, -Math.PI / 2);
      else if (pose === "right") setVec(r.rotation, 0, -Math.PI / 2, Math.PI / 2);
      else if (pose === "stomach") setVec(r.rotation, Math.PI / 2, Math.PI, 0);
      else setVec(r.rotation, -Math.PI / 2, 0, 0);
      math.quat.fromEuler(SLEEP_BASE, r.rotation.x, r.rotation.y, r.rotation.z);
      measureSleepPitch(cave, 0);
      let pitch = 0;
      if (side) {
        // A straight neck and legs share one rigid body transform. Solve its
        // pitch from the real pillow face and supporting foot, allowing the
        // broader shoulder/side to compress the mattress between those ends.
        let lo = -Math.PI / 6, hi = Math.PI / 6;
        for (let i = 0; i < 20; i++) {
          pitch = (lo + hi) / 2;
          measureSleepPitch(cave, pitch);
          travel.restY = bed.sleep.surface - SLEEP_COMPRESSION - SLEEP_BOUNDS.feetMin;
          math.quat.rotateVec(MUZZLE, cave.sleepTargetRotation, cave.sleepParts.headX, cave.sleepParts.headY + cave.traits.height * 3.5 / 16, cave.sleepParts.headZ);
          travel.restZ = bed.sleep.pillowZ - MUZZLE[2];
          if (pillowMinimum(cave, bed, true) < bed.sleep.pillowTop - SLEEP_COMPRESSION * 0.6) lo = pitch;
          else hi = pitch;
        }
        pitch = hi;
      } else if (SLEEP_BOUNDS.feetMin > SLEEP_BOUNDS.coreMin) {
        let lo = 0, hi = Math.PI / 3;
        for (let i = 0; i < 20; i++) {
          pitch = (lo + hi) / 2;
          measureSleepPitch(cave, pitch);
          if (SLEEP_BOUNDS.feetMin > SLEEP_BOUNDS.coreMin) lo = pitch;
          else hi = pitch;
        }
        pitch = hi;
      }
      measureSleepPitch(cave, pitch);
      travel.pitch = pitch;
      travel.restY = bed.sleep.surface - SLEEP_COMPRESSION - (side ? SLEEP_BOUNDS.feetMin : SLEEP_BOUNDS.min);
      // Keep the legs straight and tilt the whole body only as far as its
      // actual feet require. Only head faces over the pillow provide pillow
      // support; overhanging hair can rest lower over the surrounding sheet.
      const q = cave.sleepTargetRotation;
      math.quat.rotateVec(MUZZLE, q, cave.sleepParts.headX, cave.sleepParts.headY + cave.traits.height * 3.5 / 16, cave.sleepParts.headZ);
      travel.restZ = bed.sleep.pillowZ - MUZZLE[2];
      travel.compression = SLEEP_COMPRESSION;
      if (side) {
        // Rest the lower arm close to the torso instead of driving its broad
        // shoulder through the mattress and into the stone beneath it.
        const arm = pose === "left" ? cave.parts.armR : cave.parts.armL;
        SLEEP_BOUNDS.min = Infinity;
        measureSleeper(arm, false, cave.parts.head);
        const tuck = Math.max(0, bed.sleep.surface - SLEEP_SIDE_COMPRESSION - travel.restY - SLEEP_BOUNDS.min) / Math.cos(pitch);
        if (pose === "left") arm.position.x = travel.armRX -= tuck;
        else arm.position.x = travel.armLX += tuck;
        measureSleepPitch(cave, pitch);
        travel.compression = Math.max(SLEEP_COMPRESSION, bed.sleep.surface - travel.restY - Math.min(SLEEP_BOUNDS.min, SLEEP_BOUNDS.headMin));
      } else {
        travel.headDrop = pillowMinimum(cave, bed, true) - (bed.sleep.pillowTop - SLEEP_COMPRESSION * 0.6);
        SLEEP_INVERSE[0] = -q[0]; SLEEP_INVERSE[1] = -q[1]; SLEEP_INVERSE[2] = -q[2]; SLEEP_INVERSE[3] = q[3];
        math.quat.rotateVec(MUZZLE, SLEEP_INVERSE, 0, -travel.headDrop, 0);
        travel.headDropX = MUZZLE[0]; travel.headDropY = MUZZLE[1]; travel.headDropZ = MUZZLE[2];
      }
      math.quat.fromAxisAngle(SLEEP_TILT, 0, 1, 0, bed.node.rotation.y);
      math.quat.multiply(q, SLEEP_TILT, q);
      setVec(r.position, px, py, pz);
      cave.parts.head.position.x = hx; cave.parts.head.position.y = hy; cave.parts.head.position.z = hz;
      cave.parts.armL.position.x = ax; cave.parts.armR.position.x = bx;
      cave.parts.armL.rotation.z = az; cave.parts.armR.rotation.z = bz;
      r.quaternion = cave.sleepRotation;
      travel.pose = pose;
    };
    const lieDown = (cave) => {
      const travel = cave.bedTravel, r = cave.root;
      travel.fromX = r.position.x; travel.fromY = r.position.y; travel.fromZ = r.position.z; travel.fromYaw = r.rotation.y;
      resetPose(cave);
      cave.parts.club.visible = false;
      for (const node of cave.sleepParts.equipment) node.visible = false;
      math.quat.fromEuler(cave.sleepFromRotation, 0, travel.fromYaw, 0);
      math.quat.copy(cave.sleepRotation, cave.sleepFromRotation);
      fitSleepPose(cave, "left");
      sleepParts(cave, 0);
      travel.mode = "lie";
      travel.phase = 0;
      travel.route = null;
      travel.roll = 1;
      updateSleepHead(cave);
    };
    const turnSleep = (cave, pose) => {
      clearHeadLook(cave);
      const travel = cave.bedTravel;
      if (travel.pose === pose) return;
      travel.fromX = cave.root.position.x; travel.fromY = cave.root.position.y; travel.fromZ = cave.root.position.z;
      travel.fromHeadX = cave.parts.head.position.x; travel.fromHeadY = cave.parts.head.position.y; travel.fromHeadZ = cave.parts.head.position.z;
      travel.fromArmLX = cave.parts.armL.position.x; travel.fromArmRX = cave.parts.armR.position.x; travel.fromCompression = travel.compression;
      travel.fromArmLZ = cave.parts.armL.rotation.z; travel.fromArmRZ = cave.parts.armR.rotation.z;
      math.quat.copy(cave.sleepFromRotation, cave.sleepRotation);
      fitSleepPose(cave, pose);
      travel.roll = 0;
    };
    // Walkers use the same swept body as the visitor. Hold one detour side
    // until the direct route clears, instead of alternating at every corner.
    const walkerClear = (cave, x, z) => {
      const p = cave.root.position, feet = p.y - cave.baseY;
      return npcWalkable(p.x, p.z, x, z, feet, cave.bodyHeight, cave) && groundAt(x, z, feet, feet, cave) >= feet - STEP - 1e-7;
    };
    const recoverWalker = (cave, tx, tz, dt) => {
      const a = cave.avoidance, nav = a.navigation, p = cave.root.position, distance = Math.hypot(tx - p.x, tz - p.z);
      if (tx !== a.tx || tz !== a.tz) { a.tx = tx; a.tz = tz; a.best = distance; a.stalled = 0; nav.mode = 0; }
      if (distance < a.best - 0.1) { a.best = distance; a.stalled = 0; }
      else a.stalled += dt;
      if (!nav.mode && a.stalled > 0.75 && distance > 0.15) {
        // A small, fixed local search can back out of a cul-de-sac. Spread
        // its work over frames; ordinary unobstructed walking never searches.
        nav.mode = 1; nav.x = p.x; nav.z = p.z; nav.count = nav.index = 0; nav.searches++;
        nav.costs.fill(Infinity); nav.parents.fill(-1); nav.closed.fill(0);
        nav.costs[NAV_CENTER] = 0; nav.heights[NAV_CENTER] = p.y - cave.baseY;
      }
    };
    const searchWalker = (cave, tx, tz) => {
      const nav = cave.avoidance.navigation;
      for (let budget = 0; budget < 6; budget++) {
        let current = -1, best = Infinity;
        for (let i = 0; i < NAV_SIZE; i++) if (!nav.closed[i] && nav.costs[i] < Infinity) {
          const x = nav.x + (i % NAV_WIDTH - NAV_HALF) * NAV_CELL, z = nav.z + (Math.floor(i / NAV_WIDTH) - NAV_HALF) * NAV_CELL;
          const score = nav.costs[i] + Math.hypot(tx - x, tz - z);
          if (score < best) { current = i; best = score; }
        }
        if (current < 0) { nav.mode = 3; nav.jumpCandidate = 0; return; }
        nav.closed[current] = 1; nav.expansions++;
        const col = current % NAV_WIDTH, row = Math.floor(current / NAV_WIDTH);
        const x = nav.x + (col - NAV_HALF) * NAV_CELL, z = nav.z + (row - NAV_HALF) * NAV_CELL, y = nav.heights[current];
        const remaining = Math.hypot(tx - x, tz - z);
        const destination = remaining < 0.75 && npcWalkable(x, z, tx, tz, y, cave.bodyHeight, cave)
          && groundAt(tx, tz, y, y, cave) >= y - STEP - 1e-7;
        const exit = (col === 0 || row === 0 || col === NAV_WIDTH - 1 || row === NAV_WIDTH - 1)
          && remaining < Math.hypot(tx - nav.x, tz - nav.z) - 0.5;
        if (destination || exit) {
          for (let i = current; i !== NAV_CENTER && i >= 0; i = nav.parents[i]) nav.path[nav.count++] = i;
          nav.index = nav.count - 1; nav.mode = 2;
          return;
        }
        for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) {
          if ((!dx && !dz) || col + dx < 0 || col + dx >= NAV_WIDTH || row + dz < 0 || row + dz >= NAV_WIDTH) continue;
          const next = current + dz * NAV_WIDTH + dx, cost = nav.costs[current] + Math.hypot(dx, dz) * NAV_CELL;
          if (nav.closed[next] || cost >= nav.costs[next]) continue;
          const nx = x + dx * NAV_CELL, nz = z + dz * NAV_CELL;
          if (!npcWalkable(x, z, nx, nz, y, cave.bodyHeight, cave)) continue;
          const height = groundAt(nx, nz, y, y, cave);
          if (height < y - STEP - 1e-7 || height > y + STEP + 1e-7) continue;
          nav.costs[next] = cost; nav.parents[next] = current; nav.heights[next] = height;
        }
      }
    };
    const jumpWalker = (cave, tx, tz) => {
      const nav = cave.avoidance.navigation, p = cave.root.position, feet = p.y - cave.baseY;
      if (inBananas(cave) || nav.jumpCandidate >= 8) { nav.mode = 0; cave.avoidance.stalled = -1; return; }
      const candidate = nav.jumpCandidate++, turn = candidate ? Math.ceil(candidate / 2) * (candidate & 1 ? 1 : -1) * Math.PI / 4 : 0;
      const angle = Math.atan2(tx - p.x, tz - p.z) + turn, endX = p.x + Math.sin(angle) * 1.1, endZ = p.z + Math.cos(angle) * 1.1;
      const landing = groundAt(endX, endZ, feet + 2.1, feet + 2.1, cave), clearance = Math.max(feet, landing) + 0.08;
      if (landing < feet - 3 || landing > feet + 2.1 || !flyable(endX, endZ, endX, endZ, landing + 1e-5, cave.bodyHeight, cave)
        || ctx.npcLandingAllowed && !ctx.npcLandingAllowed(endX, landing, endZ, cave.bodyHeight)) return;
      const double = landing > feet + 0.85;
      let x = p.x, z = p.z, y = feet, velocity = JUMP_SPEED, boosted = false, moving = false;
      // Check one candidate per frame against swept bodies and actual support.
      // A lift before lateral travel lets a wedged NPC jump onto its obstacle.
      for (let i = 0; i < 120; i++) {
        velocity -= WALK.gravity * 0.025;
        if (double && !boosted && velocity <= 0) { velocity = JUMP_SPEED; boosted = true; }
        const nextY = y + velocity * 0.025;
        if (nextY >= clearance) moving = true;
        const remaining = Math.hypot(endX - x, endZ - z), step = moving ? Math.min(0.075, remaining) : 0;
        const nx = remaining ? x + (endX - x) * step / remaining : x, nz = remaining ? z + (endZ - z) * step / remaining : z;
        if (moving && velocity < 0 && nextY <= landing && Math.hypot(endX - nx, endZ - nz) < 0.6) {
          if (!flyable(nx, nz, nx, nz, landing + 1e-5, cave.bodyHeight, cave)) return;
          nav.mode = 4; nav.jumpX = endX; nav.jumpZ = endZ; nav.clearance = clearance; nav.double = double;
          nav.boosted = nav.moving = false; nav.jumps++; cave.hopV = JUMP_SPEED;
          cave.leap.vx = cave.leap.vz = 0;
          return;
        }
        if (nextY < feet - 3 || !flyable(x, z, nx, nz, Math.min(y, nextY) + 1e-5, cave.bodyHeight, cave)
          || !flyable(nx, nz, nx, nz, nextY + 1e-5, cave.bodyHeight, cave)) return;
        x = nx; z = nz; y = nextY;
      }
    };
    const walkToward = (cave, tx, tz, distance) => {
      const nav = cave.avoidance.navigation;
      if (nav.mode === 1) { searchWalker(cave, tx, tz); return 0; }
      if (nav.mode === 3) { jumpWalker(cave, tx, tz); return 0; }
      if (nav.mode === 4) return 0;
      if (nav.mode === 2) {
        while (nav.index >= 0) {
          const i = nav.path[nav.index], x = nav.x + (i % NAV_WIDTH - NAV_HALF) * NAV_CELL, z = nav.z + (Math.floor(i / NAV_WIDTH) - NAV_HALF) * NAV_CELL;
          if (Math.hypot(x - cave.root.position.x, z - cave.root.position.z) < 1e-6) { nav.index--; continue; }
          tx = x; tz = z; break;
        }
        if (nav.index < 0) { nav.mode = 0; cave.avoidance.stalled = 0; cave.avoidance.best = Infinity; cave.avoidance.active = false; }
      }
      const p = cave.root.position, dx = tx - p.x, dz = tz - p.z, remaining = Math.hypot(dx, dz);
      if (remaining < 1e-7) return 0;
      const step = Math.min(distance, PLAYER_STEP, remaining), heading = Math.atan2(dx, dz), avoidance = cave.avoidance;
      let angle = heading;
      const ahead = nav.mode === 2 ? step : avoidance.active ? Math.min(0.9, remaining) : step;
      if (walkerClear(cave, p.x + Math.sin(heading) * step, p.z + Math.cos(heading) * step)
        && (ahead === step || walkerClear(cave, p.x + Math.sin(heading) * ahead, p.z + Math.cos(heading) * ahead))) avoidance.active = false;
      else {
        if (nav.mode === 2) { nav.mode = 0; avoidance.stalled = 0.8; return 0; }
        let clear = false;
        // Fixed capacity, no path allocation: each candidate is checked for
        // both the actual step and a short body-width look-ahead.
        for (let side = 0; side < 2 && !clear; side++) {
          const sign = side ? -avoidance.side : avoidance.side;
          for (let turn = 1; turn <= 4; turn++) {
            angle = heading + sign * turn * Math.PI / 6;
            const look = Math.max(step, 0.35), sx = Math.sin(angle), sz = Math.cos(angle);
            if (!walkerClear(cave, p.x + sx * look, p.z + sz * look) || !walkerClear(cave, p.x + sx * step, p.z + sz * step)) continue;
            avoidance.side = sign;
            avoidance.active = clear = true;
            break;
          }
        }
        if (!clear) { if (avoidance.stalled >= 0) avoidance.stalled = Math.max(0.8, avoidance.stalled); return 0; }
      }
      p.x += Math.sin(angle) * step; p.z += Math.cos(angle) * step;
      p.y = groundY(cave);
      cave.root.rotation.y += Math.atan2(Math.sin(angle - cave.root.rotation.y), Math.cos(angle - cave.root.rotation.y)) * 0.35;
      return step;
    };
    const runBed = (cave, dt) => {
      const travel = cave.bedTravel, p = cave.root.position;
      if (travel.mode === "landing") {
        runPlayer(cave, dt, false);
        if (ctx.abyssAt && ctx.abyssAt(p.x, p.z, p.y - cave.baseY, cave) && p.y - cave.baseY < ctx.abyssRespawnY) {
          setVec(p, walkIn.x, cave.baseY + groundAt(walkIn.x, walkIn.z, Infinity, Infinity, cave), walkIn.z);
          cave.hop = cave.hopV = 0;
        }
        if (grounded(cave)) startBedRoute(cave, travel.toBed ? cave.bedroll : travel.bed, travel.toBed);
        return;
      }
      if (travel.mode === "waiting") {
        if (!grounded(cave)) { startBedRoute(cave, travel.toBed ? cave.bedroll : travel.bed, travel.toBed); return; }
        travel.retry -= dt;
        if (travel.retry <= 0) {
          if (!travel.toBed || claimBedroll(cave)) startBedRoute(cave, travel.toBed ? cave.bedroll : travel.bed, travel.toBed);
          else travel.retry = 1;
        }
        return;
      }
      if (travel.mode === "walk") {
        if (cave.hop > 0 || cave.hopV > 0) { runPlayer(cave, dt, false); return; }
        // The architectural route ends at the meadow. Select its final
        // eating place live, so a newly occupied slot cannot block a return.
        if (!travel.toBed && travel.index >= travel.route.length - 1) {
          travel.mode = ""; travel.route = null; travel.bed = null;
          cave.act.kind = "eat"; walkToSlot(cave, true);
          return;
        }
        let remaining = dt * 2 * (inBananas(cave) ? 0.5 : 1), recoveryChecked = false;
        while (remaining > 1e-8 && travel.index < travel.route.length) {
          const target = travel.route[travel.index], dx = target.x - p.x, dz = target.z - p.z, distance = Math.hypot(dx, dz);
          if (distance < 1e-6) { travel.index++; continue; }
          // Scenery may cover an intermediate architectural waypoint. Aim
          // around that prop toward the next one; never insist on occupying
          // an impossible point inside its trunk, barrel or another walker.
          if (distance < 3 && travel.index + 1 < travel.route.length && !npcWalkable(target.x, target.z, target.x, target.z, target.y, cave.bodyHeight, cave)) { travel.index++; continue; }
          if (!recoveryChecked) { recoverWalker(cave, target.x, target.z, dt); recoveryChecked = true; }
          const step = walkToward(cave, target.x, target.z, remaining);
          if (!step) { travel.blocked += dt; break; }
          // This is the current obstruction duration, like avoidance.stalled.
          // Clear it when progress resumes after yielding to another Ooga.
          travel.blocked = 0;
          travel.phase += step * 4.5;
          remaining -= step;
          if (Math.hypot(target.x - p.x, target.z - p.z) < 1e-6) travel.index++;
        }
        if (travel.index === travel.route.length) {
          standPose(cave);
          if (travel.toBed) lieDown(cave);
          else { travel.mode = ""; travel.route = null; travel.bed = null; cave.root.rotation.y = Math.atan2(-p.x, -p.z); startMeal(cave); }
        } else {
          walkPose(cave, travel.phase);
          // Contact stays on the physical floor; gait motion is in the limbs.
          p.y = groundY(cave);
        }
        return;
      }
      const bed = cave.bedroll;
      if (travel.mode === "lie") {
        travel.phase = Math.min(1, travel.phase + dt / 0.85);
        const k = ease.inOutQuad(travel.phase), angle = bed.node.rotation.y;
        setVec(p, lerp(travel.fromX, bed.x + Math.sin(angle) * travel.restZ, k), lerp(travel.fromY, bed.y + travel.restY, k), lerp(travel.fromZ, bed.z + Math.cos(angle) * travel.restZ, k));
        math.quat.copy(cave.sleepRotation, cave.sleepFromRotation);
        math.quat.slerpTo(cave.sleepRotation, cave.sleepTargetRotation, k);
        sleepParts(cave, k);
        if (travel.phase === 1) {
          travel.mode = "rest";
          cave.parts.head.geometry = cave.headClosed;
        }
      } else if (travel.mode === "rest") {
        if (travel.manual && cave === player && bed.sleep) {
          if (Math.abs(steer.forward) > 0.05 && Math.abs(steer.forward) >= Math.abs(steer.strafe)) turnSleep(cave, steer.forward > 0 ? "stomach" : "back");
          else if (Math.abs(steer.strafe) > 0.05) turnSleep(cave, steer.strafe < 0 ? "right" : "left");
        }
        if (travel.roll < 1) {
          travel.roll = Math.min(1, travel.roll + dt / 0.55);
          const k = ease.inOutQuad(travel.roll);
          math.quat.copy(cave.sleepRotation, cave.sleepFromRotation);
          math.quat.slerpTo(cave.sleepRotation, cave.sleepTargetRotation, k);
          setVec(p, lerp(travel.fromX, bed.x + Math.sin(bed.node.rotation.y) * travel.restZ, k), lerp(travel.fromY, bed.y + travel.restY, k) + Math.sin(k * Math.PI) * 0.09, lerp(travel.fromZ, bed.z + Math.cos(bed.node.rotation.y) * travel.restZ, k));
          cave.parts.head.position.x = lerp(travel.fromHeadX, cave.sleepParts.headX + travel.headDropX, k);
          cave.parts.head.position.y = lerp(travel.fromHeadY, cave.sleepParts.headY + travel.headDropY, k);
          cave.parts.head.position.z = lerp(travel.fromHeadZ, cave.sleepParts.headZ + travel.headDropZ, k);
          cave.parts.armL.position.x = lerp(travel.fromArmLX, travel.armLX, k);
          cave.parts.armR.position.x = lerp(travel.fromArmRX, travel.armRX, k);
          cave.parts.armL.rotation.z = lerp(travel.fromArmLZ, travel.armLZ, k);
          cave.parts.armR.rotation.z = lerp(travel.fromArmRZ, travel.armRZ, k);
          // A side-to-back roll has a wider vertical envelope than either end
          // pose. Lift from the actual meshes while turning, then settle again.
          BL.scene.updateWorld(cave.root);
          SLEEP_BOUNDS.min = SLEEP_BOUNDS.headMin = Infinity;
          measureSleeper(cave.root, false, cave.parts.head);
          const compression = lerp(travel.fromCompression, travel.compression, k);
          const lift = Math.max(0, bed.y + bed.sleep.surface - compression - Math.min(SLEEP_BOUNDS.min, SLEEP_BOUNDS.headMin), bed.sleep.pillowTop - SLEEP_COMPRESSION * 0.6 - pillowMinimum(cave, bed, false));
          p.y += lift;
        }
      }
      cave.parts.torso.scale.y = 1 + Math.sin(elapsed * 1.4 + cave.phase) * 0.015;
      updateSleepHead(cave);
      if (travel.mode === "rest") {
        cave.zzzTimer -= dt;
        if (cave.zzzTimer <= 0) { cave.zzzTimer = 1.6; ctx.fx.zzzAt(cave.sleepHead.x, cave.sleepHead.y + 0.35, cave.sleepHead.z, cave); }
      }
    };
    // Keep backward and lateral steps readable in a mirror without turning the body.
    const closeWalkPose = (cave) => {
      const parts = cave.parts;
      const side = steer.strafe, backward = steer.forward < -0.05;
      parts.torso.rotation.x = backward ? 0.07 : 0;
      parts.torso.rotation.z = -side * 0.08;
      parts.legL.rotation.z = parts.legR.rotation.z = side * 0.1;
    };
    // Flying pose, legs trailing and arms out
    const flyPose = (cave) => {
      const parts = cave.parts;
      parts.legL.rotation.x = -0.5;
      parts.legR.rotation.x = -0.3;
      parts.armL.rotation.x = parts.armR.rotation.x = -1.1;
    };
    const runWalk = (cave, dt) => {
      // Donations can cover a destination after it was chosen. Choose a new
      // clear spot instead of circling a point now buried inside the mound.
      if (cave.walk.to === "spot" && npcDestinationBlocked(cave, cave.walk.tx, cave.walk.tz)) startWander(cave);
      const w = cave.walk, p = cave.root.position;
      if (w.to === "slot" && !slotAvailable(cave, cave.slot)) {
        const slot = closestSlot(cave);
        if (!slot) { standPose(cave); return; }
        cave.slot = slot; w.tx = slot.x; w.tz = slot.z;
        cave.avoidance.active = false;
      }
      if (ctx.npcPaths && (!cave.avoidance.navigation.mode || cave.pathing.tx !== w.tx || cave.pathing.tz !== w.tz)) ctx.npcPaths.target(cave, w.tx, w.tz);
      recoverWalker(cave, ctx.npcPaths ? cave.pathing.targetX : w.tx, ctx.npcPaths ? cave.pathing.targetZ : w.tz, dt);
      let remaining = w.speed * dt * (inBananas(cave) ? 0.5 : 1), moved = 0;
      while (remaining > 1e-8 && Math.hypot(w.tx - p.x, w.tz - p.z) > 1e-6) {
        if (ctx.npcPaths && (!cave.avoidance.navigation.mode || cave.pathing.tx !== w.tx || cave.pathing.tz !== w.tz)) ctx.npcPaths.target(cave, w.tx, w.tz);
        const step = walkToward(cave, ctx.npcPaths ? cave.pathing.targetX : w.tx, ctx.npcPaths ? cave.pathing.targetZ : w.tz, remaining);
        if (!step) break;
        moved += step; remaining -= step;
      }
      if (Math.hypot(w.tx - p.x, w.tz - p.z) < 1e-6) {
        if (w.to === "spot") {
          arriveAtSpot(cave);
        } else {
          cave.root.rotation.y = Math.atan2(-p.x, -p.z);
          if (cave !== player) startMeal(cave);
        }
        standPose(cave);
        cave.walk = null;
        return;
      }
      w.heading = cave.root.rotation.y;
      w.phase += moved * 5;
      walkPose(cave, w.phase);
      // The gait belongs to the limbs; its physical feet stay on the support.
      p.y = groundY(cave);
    };
    const quoteFor = () => {
      const table = ctx.phase ? PHASE_QUOTES[ctx.phase()] : IDLE_QUOTES;
      return table[Math.floor(Math.random() * table.length)];
    };
    // A midnight yawn, arms up and head back, settling like a cheer
    const runYawn = (cave) => {
      // Re-armed in every phase so the stagger holds when midnight arrives mid-visit
      if (ctx.phase && elapsed > cave.yawnAt) {
        cave.yawnAt = elapsed + 25 + Math.random() * 30;
        if (ctx.phase() === "midnight") cave.yawn = YAWN_DUR;
      }
      if (cave.yawn <= 0) return false;
      const parts = cave.parts;
      const k = Math.sin((1 - cave.yawn / YAWN_DUR) * Math.PI);
      parts.armL.rotation.x = parts.armR.rotation.x = -0.2 - 2.2 * k;
      parts.head.rotation.x = -0.25 * k;
      parts.snack.visible = false;
      return true;
    };
    // Standing about, with the odd scratch and remark
    const runIdle = (cave, dt) => {
      const parts = cave.parts, a = cave.act;
      cave.root.position.y = groundY(cave) + cave.hop;
      parts.torso.scale.y = 1 + Math.sin(elapsed * 2.2 + cave.phase) * 0.015;
      if (cave.cheer > 0) {
        const wave = Math.sin(elapsed * 14 + cave.phase) * 0.35;
        parts.armL.rotation.x = -2.6 + wave;
        parts.armR.rotation.x = -2.6 - wave;
        parts.head.rotation.x = -0.15;
        if (cave.hop === 0 && cave.hopV <= 0 && !inBananas(cave)) cave.hopV = 2.2;
        return;
      }
      if (cave.catchT > 0) {
        const k = cave.catchT;
        parts.armL.rotation.x = -0.2 - k * 1.6;
        parts.armR.rotation.x = -0.2 - k * 1.6;
        parts.head.rotation.x = -k * 0.2;
        return;
      }
      if (runYawn(cave)) return;
      parts.head.rotation.y = Math.sin(elapsed * 0.9 + cave.phase) * 0.55;
      parts.head.rotation.x = 0.08 + Math.sin(elapsed * 0.5 + cave.phase) * 0.1;
      const scratch = Math.max(0, Math.sin(elapsed * 1.7 + cave.phase * 2) - 0.6) * 2.5;
      parts.armR.rotation.x = -0.2 - scratch * 1.6;
      parts.armL.rotation.x = damp(parts.armL.rotation.x, -0.2, 10, dt);
      if (!a.said && elapsed > a.sayAt) {
        a.said = true;
        if (Math.random() < 0.6) ctx.fx.say(cave, quoteFor(), 2);
      }
      if (elapsed < a.until) return;
      parts.head.rotation.y = 0;
      parts.head.rotation.x = 0;
      if (!wanderSpot || (world.level >= 1 && (a.trips >= TRIPS_MAX || Math.random() < 0.45))) {
        a.kind = "eat";
        walkToSlot(cave, true);
        if (cave.walk) cave.walk.speed = 1.6;
      } else {
        startWander(cave);
      }
    };
    // Thrust against ordinary gravity, with fuel-scaled exhaust.
    const runJet = (cave, dt) => {
      const jet = cave.jet;
      if (cave.jetRecovering) jet.thrust = false;
      const moving = !cave.jetRecovering && (cave.hop > 0 || cave.hopV > 0) && Math.hypot(steer.x, steer.z) > 0.05;
      jet.power = (jet.thrust ? 2 : 0) + (moving ? 1 : 0);
      jet.spending = jet.power > 0;
      if (jet.spending) cave.jetFuel = Math.max(0, cave.jetFuel - dt * jet.power / JET_MOVE_SECONDS);
      if (cave.jetFuel < 1e-10) { cave.jetFuel = 0; jet.thrust = false; jet.power = 0; }
      if (jet.thrust) {
        cave.hopV = Math.min(cave.hopV + JET_ACCEL * dt, JET_RISE);
      }
      if (jet.power) {
        jet.puff -= dt;
        if (jet.puff <= 0) {
          jet.puff = JET_PUFF;
          const p = cave.root.position;
          ctx.fx.burst(p.x, p.y + 0.12, p.z, jet.power, JET_SPARKS, 1.1);
        }
      }
      jet.flame.visible = jet.power > 0;
      if (jet.power) jet.flame.scale.y = (0.7 + Math.sin(elapsed * 40 + cave.phase) * 0.3) * jet.power / 2;
    };
    // Flying also stops at rock standing above him
    const canStep = (cave, flying, fromX, fromZ, toX, toZ) => {
      const y = cave.root.position.y - cave.baseY;
      const height = cave.bodyHeight + Math.max(0, cave.viewLift);
      return flying || cave.hop > 0
        ? flyable(fromX, fromZ, toX, toZ, y, height, cave) && groundAt(toX, toZ, y, y, cave) <= y
        : walkable(fromX, fromZ, toX, toZ, y, height, cave);
    };
    const movePlayer = (cave, flying, dx, dz) => {
      const p = cave.root.position, steps = Math.max(1, Math.ceil(Math.hypot(dx, dz) / PLAYER_STEP));
      dx /= steps;
      dz /= steps;
      for (let i = 0; i < steps; i++) {
        const speed = inBananas(cave) ? 0.5 : 1, sx = dx * speed, sz = dz * speed;
        if (canStep(cave, flying, p.x, p.z, p.x + sx, p.z + sz)) {
          p.x += sx;
          p.z += sz;
        } else {
          if (sx && canStep(cave, flying, p.x, p.z, p.x + sx, p.z)) p.x += sx;
          if (sz && canStep(cave, flying, p.x, p.z, p.x, p.z + sz)) p.z += sz;
        }
        if (!flying && cave.hop === 0) p.y = groundY(cave);
      }
    };
    const clampPlayerCeiling = (cave, ground, feet = cave.root.position.y - cave.baseY) => {
      if (!ctx.ceilingAt) return;
      const p = cave.root.position, ceiling = ctx.ceilingAt(p.x, p.z, feet, cave);
      const height = cave.bodyHeight + Math.max(0, cave.viewLift);
      const limit = Math.max(0, ceiling - (ground - cave.baseY) - height);
      // Held thrust stays in contact instead of integrating a small gravity
      // drop before the next thrust impulse. A higher roof releases contact.
      const held = cave.jet && cave.jet.thrust && feet + height >= ceiling - 1e-7;
      if (cave.hop <= limit && !held) return;
      cave.hop = limit;
      cave.hopV = held ? 0 : Math.min(cave.hopV, 0);
    };
    // Move the visitor's caveman
    const runPlayer = (cave, dt, driving = true) => {
      const p = cave.root.position, leap = cave.leap;
      const wasGround = groundY(cave);
      if (cave.jet) runJet(cave, dt);
      clampPlayerCeiling(cave, wasGround);
      p.y = wasGround + cave.hop;
      if (cave.jet && cave.jet.thrust && ctx.glideJetCeiling && ctx.glideJetCeiling(cave, dt)) cave.hopV = Math.max(cave.hopV, JET_RISE);
      const flying = !!cave.jet && !cave.jetRecovering && cave.jetFuel > 0 && (cave.jet.thrust || cave.hop > 0.05);
      const len = driving ? Math.hypot(steer.x, steer.z) : 0;
      if (len > 0.05) {
        const k = Math.min(1, len) * (flying ? JET_SPEED : PLAYER_SPEED) * dt;
        const dx = steer.x / len * k, dz = steer.z / len * k;
        movePlayer(cave, flying, dx, dz);
        const heading = Math.atan2(steer.x, steer.z);
        if (Math.abs(steer.forward) > 0.05 && Math.abs(steer.strafe) <= 0.05) cave.root.rotation.y = heading;
        else cave.root.rotation.y += Math.atan2(Math.sin(heading - cave.root.rotation.y), Math.cos(heading - cave.root.rotation.y)) * Math.min(1, 12 * dt) * (1 - steer.view);
        cave.act.phase += dt * 10 * (steer.view > 0 && steer.forward < -0.05 ? -1 : 1);
        const positionY = p.y;
        walkPose(cave, cave.act.phase);
        p.y = positionY;
        if (steer.view > 0) closeWalkPose(cave);
        cave.parts.snack.visible = false;
      } else {
        cave.act.phase = 0;
        standPose(cave);
        cave.parts.torso.scale.y = 1 + Math.sin(elapsed * 2.2 + cave.phase) * 0.015;
      }
      // Airborne after a ledge the leap carries him on, fading, legs tucked
      if (cave.hop > 0 && (leap.vx || leap.vz)) {
        const dx = leap.vx * dt, dz = leap.vz * dt;
        movePlayer(cave, flying, dx, dz);
        leap.vx = damp(leap.vx, 0, WALK.ledgeDrag, dt);
        leap.vz = damp(leap.vz, 0, WALK.ledgeDrag, dt);
        flyPose(cave);
      }
      if (flying) flyPose(cave);
      else if (cave.hop > 0 && ctx.abyssAt && ctx.abyssAt(p.x, p.z, p.y - cave.baseY, cave)) {
        // Arms rise and legs trail during the visible fall beneath the island.
        flyPose(cave);
        cave.parts.armL.rotation.x = cave.parts.armR.rotation.x = -2.1;
      }
      // Airborne he holds a world height, so ground steps never lift him
      if (flying || cave.hop > 0) cave.hop = Math.max(0, cave.hop + wasGround - groundY(cave));
      else {
        // Off a ledge, support at the new spot is the lower layer (walkable lets any drop
        // through) and the height line below would snap him down in one frame; carry the
        // drop in hop instead so he leaves at his old height and falls forward
        const drop = wasGround - groundY(cave);
        if (drop > STEP) {
          cave.hop += drop;
          if (!cave.cloudSupport && !inBananas(cave)) {
            cave.hopV = Math.max(cave.hopV, WALK.ledgeRise);
            leap.vx = Math.sin(cave.root.rotation.y) * WALK.ledgeSpeed;
            leap.vz = Math.cos(cave.root.rotation.y) * WALK.ledgeSpeed;
          }
        }
      }
      // One place sets the height, so nothing compounds
      const ground = groundY(cave);
      // A fresh ledge fall remains above the cave roof, even when its new
      // support is the apron below. Query the ceiling at that world height.
      clampPlayerCeiling(cave, ground, ground - cave.baseY + cave.hop);
      cave.root.position.y = ground + cave.hop;
      // Movement can acquire a cloud after the pre-gravity support query.
      // Keep that exact destination layer if it drifts away next frame.
      if (ctx.cloudAt) cave.cloudSupport = ctx.cloudAt(p.x, p.z, p.y - cave.baseY);
      if (grounded(cave)) {
        cave.jumps = 0;
      } else cave.jumps = Math.max(1, cave.jumps);
      if (cave.hop === 0 && (leap.vx || leap.vz)) {
        leap.vx = leap.vz = 0;
        leap.land = 0.25;
        ctx.fx.burst(p.x, p.y + 0.05, p.z, 6, LAND_DUST, 1.2);
      }
      if (leap.land > 0) {
        leap.land = Math.max(0, leap.land - dt);
        cave.parts.torso.scale.y = 1 - leap.land * 0.6;
      }
      if (cave.catchT > 0) {
        const k = cave.catchT;
        cave.parts.armL.rotation.x = -0.2 - k * 1.6;
        cave.parts.armR.rotation.x = -0.2 - k * 1.6;
        cave.parts.head.rotation.x = -k * 0.2;
      } else cave.parts.head.rotation.x = 0;
    };
    const updateCaveman = (cave, dt) => {
      clearHeadLook(cave);
      const parts = cave.parts;
      if (ctx.prepareCloudSupport && (!cave.bedTravel.mode || cave.bedTravel.mode === "landing" || cave.bedTravel.mode === "waiting")) ctx.prepareCloudSupport(cave);
      if (cave.root.visible && (cave.state === "working" || cave.bedTravel.mode === "landing" || cave.bedTravel.mode === "waiting" || cave.bedTravel.mode === "walk")) {
        // Hop is relative to the support, but the body lives at a world height.
        // Rebase before gravity when a moving character or prop comes or goes.
        const floor = groundY(cave), p = cave.root.position;
        cave.hop = Math.max(0, p.y - floor);
        if (p.y < floor) p.y = floor;
      }
      cave.highlight = damp(cave.highlight, cave.highlightTarget, 12, dt);
      for (const key of BODY_PARTS) parts[key].highlight = cave.highlight;
      if (cave.hopV > 0 || cave.hop > 0) {
        cave.hopV -= WALK.gravity * dt;
        // Fruit slows travel in either vertical direction without changing
        // ballistic momentum; leaving restores ordinary movement immediately.
        const verticalScale = inBananas(cave) ? 0.5 : 1;
        cave.hop = Math.max(0, cave.hop + cave.hopV * dt * verticalScale);
        if (cave.hop === 0 && cave.hopV < 0) {
          cave.hopV = 0;
          if (cave.jet && cave.jetFuel < JET_LAUNCH_FUEL) cave.jetRecovering = true;
        }
      }
      const recovery = cave.avoidance.navigation;
      if (recovery.mode === 4 && cave !== player) {
        if (cave.hop === 0 && cave.hopV <= 0) {
          recovery.mode = 0; cave.avoidance.stalled = 0; cave.avoidance.best = Infinity;
          cave.leap.vx = cave.leap.vz = 0; cave.root.position.y = groundY(cave);
        } else {
          if (recovery.double && !recovery.boosted && cave.hopV <= 0 && !inBananas(cave)) { recovery.boosted = true; cave.hopV = JUMP_SPEED; }
          if (groundY(cave) - cave.baseY + cave.hop >= recovery.clearance) recovery.moving = true;
          const dx = recovery.jumpX - cave.root.position.x, dz = recovery.jumpZ - cave.root.position.z, distance = Math.hypot(dx, dz);
          const speed = recovery.moving && !inBananas(cave) ? Math.min(3, distance / dt) : 0;
          cave.leap.vx = distance ? dx / distance * speed : 0; cave.leap.vz = distance ? dz / distance * speed : 0;
        }
      }
      if (cave.cheer > 0) cave.cheer -= dt;
      if (cave.yawn > 0) cave.yawn -= dt;
      if (cave.catchT > 0) cave.catchT = Math.max(0, cave.catchT - dt * 1.6);
      for (const node of cave.swagNodes) {
        if (node.swag.float) node.position.y = (node.swag.offset ? node.swag.offset.y : 0) + Math.sin(elapsed * 2.5 + cave.phase) * 0.04;
        for (const child of node.children) if (child.spin) child.rotation.y += dt * 9;
      }
      if (cave.bedTravel.mode) { runBed(cave, dt); return; }
      if (cave.state !== "working") {
        if (cave.state === "sleeping" && !cave.bedroll.hidden) {
          parts.torso.scale.y = 1 + Math.sin(elapsed * 1.4 + cave.phase) * 0.03;
          cave.zzzTimer -= dt;
          if (cave.zzzTimer <= 0) {
            cave.zzzTimer = 1.6;
            ctx.fx.zzzAt(cave.bedroll.x + 0.6, (cave.bedroll.y === undefined ? 0 : cave.bedroll.y) + 0.55, cave.bedroll.z, cave);
          }
        }
        return;
      }
      if (cave === player) {
        runPlayer(cave, dt);
        return;
      }
      if (ctx.abyssAt && ctx.abyssAt(cave.root.position.x, cave.root.position.z, cave.root.position.y - cave.baseY, cave)) {
        // Releasing possession must not strand an Ooga beneath the world.
        cave.root.position.y = groundY(cave) + cave.hop;
        flyPose(cave);
        cave.parts.armL.rotation.x = cave.parts.armR.rotation.x = -2.1;
        if (cave.root.position.y - cave.baseY < ctx.abyssRespawnY) {
          cave.hop = cave.hopV = cave.jumps = 0;
          standPose(cave);
          standAtSlot(cave);
          startMeal(cave);
        }
        return;
      }
      if (cave.hop > 0 || cave.hopV > 0) { runPlayer(cave, dt, false); return; }
      if (cave.walk) {
        runWalk(cave, dt);
        return;
      }
      if (cave.build) {
        runBuild(cave, dt);
        cave.root.position.y = groundY(cave) + cave.hop;
        return;
      }
      if (cave.act.kind === "idle") {
        runIdle(cave, dt);
        return;
      }
      // Idle breathing scales the torso, not the root
      cave.root.position.y = groundY(cave) + cave.hop;
      parts.torso.scale.y = 1 + Math.sin(elapsed * 2.2 + cave.phase) * 0.015;
      const fed = world.level >= 1;
      if (cave.cheer > 0) {
        const wave = Math.sin(elapsed * 14 + cave.phase) * 0.35;
        parts.armL.rotation.x = -2.6 + wave;
        parts.armR.rotation.x = -2.6 - wave;
        parts.head.rotation.x = -0.15;
        parts.snack.visible = false;
        if (cave.hop === 0 && cave.hopV <= 0 && !inBananas(cave)) cave.hopV = 2.2;
        return;
      }
      if (cave.catchT > 0) {
        const k = cave.catchT;
        parts.armL.rotation.x = -0.2 - k * 1.6;
        parts.armR.rotation.x = -0.2 - k * 1.6;
        parts.head.rotation.x = -k * 0.2;
        return;
      }
      if (runYawn(cave)) return;
      // Settle the club arm back to rest
      parts.armL.rotation.x = damp(parts.armL.rotation.x, -0.2, 10, dt);
      if (wanderSpot) {
        if (!fed && cave.act.until > elapsed + HUNGRY_LINGER) cave.act.until = elapsed + HUNGRY_LINGER;
        if (elapsed > cave.act.until) {
          startWander(cave);
          return;
        }
      }
      if (fed) {
        if (elapsed > cave.nextBuildAt && (buildSpots.length || builtEquipment.length)) {
          startBuild(cave);
          return;
        }
        world.level = Math.max(0, world.level - EAT_RATE * dt);
        const chew = (elapsed + cave.phase) % CHEW_PERIOD / CHEW_PERIOD;
        if (chew < 0.18) parts.armR.rotation.x = lerp(-0.2, -1.05, chew / 0.18);
        else if (chew < 0.42) parts.armR.rotation.x = lerp(-1.05, -2.3, (chew - 0.18) / 0.24);
        else if (chew < 0.58) parts.armR.rotation.x = lerp(-2.3, -0.2, (chew - 0.42) / 0.16);
        else parts.armR.rotation.x = -0.2;
        parts.head.rotation.x = chew > 0.34 && chew < 0.54 ? Math.sin((chew - 0.34) / 0.2 * Math.PI) * 0.22 : 0;
        parts.snack.visible = chew >= 0.18 && chew < 0.42;
        parts.snack.scale.x = parts.snack.scale.y = parts.snack.scale.z = models.BANANA_AMMO_SCALE;
      } else {
        parts.armR.rotation.x = -0.1;
        parts.snack.visible = false;
        parts.head.rotation.x = 0.35;
      }
    };
    // ---------- the jetpack ----------
    // Put the jetpack on a caveman's back
    const wearJetpack = (cave, geometry, flameGeometry) => {
      if (cave.jet || ctx.jetpackAllowed && !ctx.jetpackAllowed(cave)) return null;
      const h = cave.traits.height;
      const node = createNode({ position: { x: 0, y: 0.06 * h + cave.viewLift, z: -0.18 * h }, scale: { x: h, y: h, z: h }, geometry });
      const flame = createNode({ geometry: flameGeometry, visible: false });
      addChild(node, flame);
      addChild(cave.root, node);
      cave.jet = { node, flame, thrust: false, spending: false, power: 0, puff: 0 };
      if (cave.jetFuel < JET_LAUNCH_FUEL && grounded(cave)) cave.jetRecovering = true;
      return node;
    };
    const removeJetpack = (cave) => {
      if (!cave.jet) return false;
      removeChild(cave.root, cave.jet.node);
      cave.jet = null;
      return true;
    };
    const thrust = (on) => {
      if (player && player.jet) player.jet.thrust = !!on && !player.jetRecovering && player.jetFuel > 0;
    };

    // ---------- the visitor's caveman ----------
    const sleepPlayer = (bed) => {
      const cave = player;
      if (!cave || cave.state === "sleeping" || !bed || bed.sleeper && bed.sleeper !== cave) return false;
      // The view's step smoothing can still be settling when SLEEP appears.
      // Admission uses the planted feet, before clearing that visual offset.
      if (!grounded(cave)) return false;
      elevatePlayer(0);
      releaseBuild(cave);
      removeJetpack(cave);
      cave.walk = null;
      cave.hop = cave.hopV = cave.cheer = cave.catchT = 0;
      cave.override = cave.state = "sleeping";
      cave.bedroll = bed;
      bed.sleeper = cave;
      cave.bedTravel.manual = true;
      cave.bedTravel.bed = bed;
      cave.act.kind = "bed";
      lieDown(cave);
      refreshRosterRow(cave);
      return true;
    };
    const wakePlayer = () => {
      const cave = player;
      if (!cave || !cave.bedTravel.manual || cave.state !== "sleeping") return false;
      const bed = cave.bedroll;
      standFromBed(cave);
      releaseBedroll(cave);
      cave.override = cave.state = "working";
      cave.bedTravel.bed = null;
      cave.parts.head.geometry = cave.headOpen;
      cave.root.position.y = groundY(cave);
      cave.root.rotation.y = bed.node ? bed.node.rotation.y : bed.ry || 0;
      cave.act.kind = "player";
      cave.act.phase = 0;
      refreshRosterRow(cave);
      return true;
    };
    const control = (cave) => {
      if (cave === player || cave.state !== "working" && cave.state !== "sleeping") return false;
      release();
      if (cave.state === "sleeping" && (!ctx.bedRoute || cave.bedTravel.mode === "rest" || cave.bedTravel.mode === "lie")) {
        player = cave;
        cave.bedTravel.manual = true;
        if (!ctx.bedRoute) {
          math.quat.fromEuler(cave.sleepRotation, cave.root.rotation.x, cave.root.rotation.y, cave.root.rotation.z);
          cave.root.quaternion = cave.sleepRotation;
          cave.bedTravel.mode = "rest";
          cave.bedTravel.roll = 1;
          updateSleepHead(cave);
        }
        return true;
      }
      if (cave.state === "sleeping") {
        if (ctx.bedRoute) standFromBed(cave);
        else { resetPose(cave); cave.root.position.y = cave.baseY + groundAt(cave.root.position.x, cave.root.position.z, Infinity, Infinity, cave); }
        releaseBedroll(cave);
        cave.override = cave.state = "working";
        cave.parts.head.geometry = cave.headOpen;
        assignFanSlots([...cavemen.values()], (entry) => entry.state === "working");
        refreshRosterRow(cave);
      }
      player = cave;
      releaseBuild(cave);
      cave.avoidance.navigation.mode = 0; cave.avoidance.tx = NaN;
      cave.walk = null;
      cave.bedTravel.mode = "";
      cave.bedTravel.route = null;
      cave.act.kind = "player";
      cave.act.phase = 0;
      cave.parts.gun.visible = false;
      cave.parts.snack.visible = false;
      cave.parts.head.rotation.x = 0;
      cave.parts.head.rotation.y = 0;
      standPose(cave);
      if (!ctx.abyssAt || !ctx.abyssAt(cave.root.position.x, cave.root.position.z, cave.root.position.y - cave.baseY, cave)) cave.root.position.y = groundY(cave) + cave.hop;
      if (cave.jet && cave.jetFuel < JET_LAUNCH_FUEL && grounded(cave)) cave.jetRecovering = true;
      return true;
    };
    const release = () => {
      if (player) clearHeadLook(player);
      if (!player) return;
      const cave = player;
      if (cave.bedTravel.manual && cave.state === "sleeping") {
        cave.bedTravel.manual = false;
        player = null;
        steer.x = steer.z = steer.view = steer.forward = steer.strafe = 0;
        return;
      }
      elevatePlayer(0);
      player = null;
      steer.x = steer.z = steer.view = steer.forward = steer.strafe = 0;
      cave.leap.vx = cave.leap.vz = cave.leap.land = 0;
      if (cave.jet) {
        cave.jet.thrust = false;
        cave.jet.spending = false;
        cave.jet.power = 0;
        cave.jet.flame.visible = false;
      }
      standPose(cave);
      if (!ctx.abyssAt || !ctx.abyssAt(cave.root.position.x, cave.root.position.z, cave.root.position.y - cave.baseY, cave)) cave.root.position.y = groundY(cave) + cave.hop;
      cave.act.kind = "idle";
      cave.act.until = elapsed + 1.5;
      cave.act.said = true;
      cave.act.trips = 0;
      if (ctx.bedRoute && cave.root.position.y - cave.baseY < -0.5 && (!ctx.abyssAt || !ctx.abyssAt(cave.root.position.x, cave.root.position.z, cave.root.position.y - cave.baseY, cave))) startBedRoute(cave, null, false);
    };
    const steerPlayer = (x, z, view = 0, forward = 0, strafe = 0) => {
      steer.x = x;
      steer.z = z;
      steer.view = clamp(view, 0, 1);
      steer.forward = forward;
      steer.strafe = strafe;
    };
    // Keep possession and equipment while discarding motion at a safe arrival.
    const relocatePlayer = (position, heading) => {
      const cave = player;
      if (!cave) return;
      if (cave.bedTravel.manual) wakePlayer();
      elevatePlayer(0);
      steer.x = steer.z = steer.view = steer.forward = steer.strafe = 0;
      cave.hop = cave.hopV = cave.act.phase = 0;
      cave.cloudSupport = null;
      cave.jumps = 0;
      cave.leap.vx = cave.leap.vz = cave.leap.land = 0;
      cave.cheer = cave.catchT = cave.yawn = 0;
      if (cave.jet) {
        cave.jet.thrust = false;
        cave.jet.spending = false;
        cave.jet.power = 0;
        cave.jet.flame.visible = false;
        cave.jet.puff = 0;
      }
      standPose(cave);
      cave.parts.torso.scale.y = 1;
      cave.parts.head.rotation.x = cave.parts.head.rotation.y = 0;
      cave.root.rotation.x = cave.root.rotation.z = 0;
      cave.root.rotation.y = heading;
      setVec(cave.root.position, position.x, position.y + cave.baseY, position.z);
      if (cave.jet && cave.jetFuel < JET_LAUNCH_FUEL && grounded(cave)) cave.jetRecovering = true;
    };
    // Applied after the camera's damped angles update, keeping pose and view in lockstep.
    const lookPlayer = (heading, pitch, mix, viewRotation = null) => {
      if (!player) return;
      clearHeadLook(player);
      if (mix <= 0) return;
      const root = player.root, head = player.parts.head;
      if (player.bedTravel.manual) {
        if (!viewRotation || !root.quaternion) return;
        const q = root.quaternion, look = player.headLookRotation;
        // The camera looks along -Z, while the model's face looks along +Z.
        LOOK_ROTATION[0] = -viewRotation[2]; LOOK_ROTATION[1] = viewRotation[3]; LOOK_ROTATION[2] = viewRotation[0]; LOOK_ROTATION[3] = -viewRotation[1];
        SLEEP_INVERSE[0] = -q[0]; SLEEP_INVERSE[1] = -q[1]; SLEEP_INVERSE[2] = -q[2]; SLEEP_INVERSE[3] = q[3];
        math.quat.multiply(LOOK_ROTATION, SLEEP_INVERSE, LOOK_ROTATION);
        math.quat.fromEuler(look, 0, 0, 0);
        math.quat.slerpTo(look, LOOK_ROTATION, mix);
        setVec(player.headLookPosition, head.position.x, head.position.y, head.position.z);
        // Rotate about the face's center, leaving the physical eye anchor and
        // authored pillow contact available unchanged when close view ends.
        const center = player.traits.height * 3.5 / 16;
        math.quat.rotateVec(MUZZLE, look, 0, center, 0);
        head.position.x -= MUZZLE[0]; head.position.y += center - MUZZLE[1]; head.position.z -= MUZZLE[2];
        head.quaternion = look;
        return;
      }
      root.rotation.y += Math.atan2(Math.sin(heading - root.rotation.y), Math.cos(heading - root.rotation.y)) * mix;
      head.rotation.x += (pitch - head.rotation.x) * mix;
      head.rotation.y = 0;
    };
    // Shift the visible body while its root remains on the exact collision surface.
    // Scaling each leg about its hip keeps the feet on that same voxel step.
    const elevatePlayer = (lift) => {
      if (!player || player.bedTravel.manual) return;
      const cave = player, parts = cave.parts;
      // Step smoothing moves the rendered head after physics. Keep that lift
      // within the same full-footprint ceiling used by walking and jumping.
      if (lift > 0 && ctx.ceilingAt) {
        const p = cave.root.position, feet = p.y - cave.baseY;
        lift = Math.min(lift, Math.max(0, ctx.ceilingAt(p.x, p.z, feet, cave) - feet - cave.bodyHeight));
      }
      const delta = lift - cave.viewLift;
      if (!delta) return;
      parts.legL.position.y += delta;
      parts.legR.position.y += delta;
      parts.torso.position.y += delta;
      parts.armL.position.y += delta;
      parts.armR.position.y += delta;
      parts.head.position.y += delta;
      if (parts.lion) parts.lion.position.y += delta;
      if (cave.jet) cave.jet.node.position.y += delta;
      cave.viewLift = lift;
      parts.legL.scale.y = parts.legR.scale.y = (cave.baseY + lift) / cave.baseY;
    };
    const jumpPlayer = () => {
      if (!player || player.bedTravel.manual || player.jet && !player.jetRecovering) return false;
      if (grounded(player)) player.jumps = 0;
      else player.jumps = Math.max(1, player.jumps);
      if (player.jumps >= 2) return false;
      // A takeoff leaves step smoothing behind before testing its headroom.
      elevatePlayer(0);
      player.jumps++;
      player.hopV = JUMP_SPEED;
      return true;
    };
    // The pack's weight halves a tap jump's height. Holding continues thrust;
    // a nearby action consumes the press and airborne presses add no impulse.
    const playerAction = () => {
      if (!player) return false;
      if (player.bedTravel.manual) return wakePlayer();
      const p = player.root.position, feet = p.y - player.baseY;
      if (ctx.useNear && ctx.useNear(p.x, p.z, REACH + 0.6, feet)) return true;
      if (player.jet && !player.jetRecovering) {
        if (player.jetFuel > 0 && grounded(player)) {
          elevatePlayer(0);
          player.jumps = 1;
          player.hopV = JUMP_SPEED * Math.SQRT1_2;
        }
        return false;
      }
      jumpPlayer();
      return true;
    };
    const applySwag = (cave) => {
      for (const anchorKey of SWAG_ANCHORS) {
        const anchor = cave.parts[anchorKey];
        for (const child of anchor.children.slice()) removeChild(anchor, child);
        anchor.visible = false;
      }
      cave.swagNodes.length = 0;
      cave.parts.club.geometry = cave.skins.club.default;
      cave.parts.gunBody.geometry = cave.skins.gun.default;
      const entryId = game.state.assignments[cave.traits.name];
      const item = entryId ? game.itemOf(entryId) : null;
      if (!item) return;
      if (item.skin) {
        // Weapon items reskin the club or rifle
        const target = item.skin === "club" ? cave.parts.club : cave.parts.gunBody;
        target.geometry = cave.skins[item.skin].gold;
        return;
      }
      const anchor = item.slot === "face" ? cave.parts.face : cave.parts.hat;
      const node = item.buildNode();
      if (item.offset) Object.assign(node.position, item.offset);
      if (item.rotation) Object.assign(node.rotation, item.rotation);
      node.swag = item;
      addChild(anchor, node);
      anchor.visible = true;
      cave.swagNodes.push(node);
    };
    const applyAllSwag = () => {
      for (const cave of cavemen.values()) applySwag(cave);
      if (ctx.onModelChange) ctx.onModelChange();
    };
    const wornBy = (name) => {
      const item = game.itemOf(game.state.assignments[name] || "");
      return item ? item.name : null;
    };
    const renderLocker = () => hud.renderInventory(game.state.inventory, game.assignedTo, wornBy);
    const pokeCave = (cave) => {
      if (cave.state === "sleeping") {
        ctx.fx.say(cave, SLEEP_POKES[randomInt(SLEEP_POKES.length)], 1.8);
        const travel = cave.bedTravel;
        if (travel.mode === "rest" && travel.roll === 1 && cave.bedroll.sleep && randomInt(3) === 0) turnSleep(cave, SLEEP_POSES[(SLEEP_POSES.indexOf(travel.pose) + 1 + randomInt(3)) % SLEEP_POSES.length]);
        return;
      }
      ctx.fx.say(cave, POKES[randomInt(POKES.length)], 1.8);
    };
    // Build quotes, drawn by fx.drawOverlay
    const drawQuotes = (ctx2d, project, drawBubble) => {
      for (const cave of cavemen.values()) {
        const b = cave.build;
        if (!b || b.phase === "return") continue;
        const pos = project(cave.root.position.x, cave.root.position.y - cave.baseY + cave.headOffset + cave.viewLift + 0.45, cave.root.position.z);
        if (pos) drawBubble(ctx2d, b.quote, pos.x, pos.y, Math.min(1, (b.age || 0) / 0.25));
      }
    };
    const update = (dt, now) => {
      elapsed = now;
      for (const cave of cavemen.values()) {
        const p = cave.root.position, x = p.x, y = p.y, z = p.z;
        // Test both endpoints against the same current heap. A resize or a
        // relocation between frames must not masquerade as an exit.
        const wasInBananas = cave.root.visible && cave.state === "working" && inBananas(cave);
        updateCaveman(cave, dt);
        if (wasInBananas && dt > 0 && cave.root.visible && cave.state === "working" && !inBananas(cave) && ctx.pile.spill) {
          const dx = p.x - x, dy = p.y - y, dz = p.z - z;
          // Respawns and scripted arrivals can move during an update too.
          // Only continuous character movement should carry fruit with it.
          if (Math.hypot(dx, dz) <= (JET_SPEED + WALK.ledgeSpeed) * dt + 1e-5 && Math.abs(dy) <= Math.abs(cave.hopV) * dt + STEP + 1e-5
            && Math.abs(dx) + Math.abs(dy) + Math.abs(dz) > 1e-7) {
            ctx.pile.spill(p.x, p.y - cave.baseY + cave.bodyHeight * 0.5, p.z, dx / dt, dy / dt, dz / dt);
          }
        }
        if (grounded(cave)) {
          if (cave.jet && cave.jetFuel < JET_LAUNCH_FUEL) cave.jetRecovering = true;
          if (cave.jetFuel < 1 && (!cave.jet || !cave.jet.spending)) cave.jetFuel = Math.min(1, cave.jetFuel + dt / JET_REFILL_SECONDS);
        }
        if (cave.jetFuel > JET_LAUNCH_FUEL) cave.jetRecovering = false;
      }
    };
    const dispose = () => {
      player = null;
      for (const cave of cavemen.values()) {
        releaseBedroll(cave);
        for (const key of BODY_PARTS) input.remove(cave.parts[key]);
        removeChild(root, cave.root);
      }
      cavemen.clear();
      fanSlots.length = 0;
      for (const node of bulletPool) removeChild(root, node);
      bulletPool.length = 0;
      removeChild(root, flash);
      for (const built of builtEquipment) removeChild(root, built.node);
      builtEquipment.length = 0;
      for (const node of dismantling) removeChild(root, node);
      dismantling.length = 0;
    };
    const stats = () => ({ built: builtEquipment.length });
    return {
      cavemen, stateOf, stateCounts, workingCavemen, eatingCavemen, feedableCavemen, refreshStates, refreshRosterRow, updateFan, rush, headWorldOf, applyAllSwag, wornBy, renderLocker, pokeCave, drawQuotes,
      control, release, relocatePlayer, sleepPlayer, wakePlayer, steer: steerPlayer, look: lookPlayer, elevate: elevatePlayer, playerAction, jumpPlayer, wearJetpack, removeJetpack, thrust, update, dispose, stats,
      get sleeping() { return !!(player && player.bedTravel.manual && player.state === "sleeping"); },
      get player() {
        return player;
      }
    };
  };
  BL.crew = { create, EAT_RATE, JUMP_SPEED, JET_SPEED, JET_RISE, JET_FUEL_SECONDS, JET_MOVE_SECONDS, JET_REFILL_SECONDS, JET_LAUNCH_FUEL };
})();
