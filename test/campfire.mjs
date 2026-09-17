export const campfireProbe = ({ dt = 1 / 60 } = {}) => {
  const B = window.__ooga, BL = window.BL, scene = BL.scenes.hub, H = B.headquarters, floor = B.island.headquarters.floor;
  let time = B.renderOpts.matrix.time;
  const step = (seconds = dt) => { for (let i = 0; i < Math.ceil(seconds / dt); i++) scene.update(dt, time += dt); };
  step(2);
  const cave = [...B.cavemen.values()].find((c) => c.state === "working" && !c.build), c = cave.camp;
  const parts = ["torso", "head", "legL", "legR", "armL", "armR"].map((key) => cave.parts[key]);
  const originals = parts.map((part) => ({ geometry: part.geometry, children: part.children.length }));
  const nativeParts = () => parts.every((part, i) => part.geometry === originals[i].geometry && part.children.length === originals[i].children && part.scorch === c.scorch[i]);
  const trackRoll = () => {
    const result = { samples: 0, maxScorchStep: 0, standScorchStep: 0, standGlowStep: 0, monotonicScorch: true, untouchedClean: true, untouchedParts: c.spread.filter((v) => v === 0).length, mixedDuringRoll: false };
    return { result, step(seconds = dt) {
      for (let frame = 0; frame < Math.ceil(seconds / dt); frame++) {
        const wasRolling = c.rolling, scorch = parts.map((part) => part.scorch), glow = parts.map((part) => part.ember);
        step();
        if (!wasRolling) continue;
        result.samples++;
        for (let i = 0; i < parts.length; i++) {
          const part = parts[i], change = Math.abs(part.scorch - scorch[i]);
          result.maxScorchStep = Math.max(result.maxScorchStep, change);
          if (c.rolling) {
            result.monotonicScorch &&= part.scorch + 1e-6 >= scorch[i];
            result.mixedDuringRoll ||= part.scorch > 0 && part.scorch < c.spread[i] * 0.9 && part.ember > 0;
          } else {
            result.standScorchStep = Math.max(result.standScorchStep, change);
            result.standGlowStep = Math.max(result.standGlowStep, Math.abs(part.ember - glow[i]));
          }
          if (c.spread[i] === 0) result.untouchedClean &&= part.scorch === 0 && part.ember === 0;
        }
      }
    } };
  };
  const others = [...B.cavemen.values()].filter((v) => v !== cave).map((v) => ({ cave: v, visible: v.root.visible }));
  for (const other of others) other.cave.root.visible = false;
  const key = (type, value) => window.dispatchEvent(new KeyboardEvent(type, { key: value, bubbles: true, cancelable: true }));
  const press = () => { key("keydown", " "); key("keyup", " "); };
  const label = () => document.getElementById("act").textContent;
  const seats = [], fire = [], solids = H.solids.props;
  B.pilot.possess(cave);
  try {
    const collision = {
      bench: !solids.clearAt(2.6, floor + 0.4, 0, 0.3, 0.8),
      benchTop: solids.supportAt(2.6, 0, floor + 2, 0, 0.2) - floor,
      hearth: !solids.segmentClear(-1.5, floor + 0.02, 0, 1.5, floor + 0.02, 0, 0.3, 1.5),
      flameNotSolid: solids.clearAt(0, floor + 0.6, 0, 0.04, 0.2)
    };
    B.crew.relocatePlayer({ x: -1.75, y: floor, z: 0 }, -Math.PI / 2);
    B.pilot.orbit.yaw = B.pilot.orbit.tYaw = 0;
    key("keydown", "a");
    collision.walkingClear = true;
    for (let i = 0; i < Math.ceil(0.35 / dt); i++) {
      step();
      const p = cave.root.position;
      collision.walkingClear &&= solids.clearAt(p.x, p.y - cave.baseY + 1e-5, p.z, 0.3, cave.bodyHeight);
    }
    key("keyup", "a");
    for (const seat of H.benches) {
      B.crew.relocatePlayer({ x: seat.walkAt.x, y: floor, z: seat.walkAt.z }, seat.ry);
      step(0.1);
      const prompt = label();
      press(); step();
      const selected = c.seat === seat && seat.sitter === cave, y = cave.root.position.y;
      const facing = Math.cos(cave.root.rotation.y - Math.atan2(-seat.x, -seat.z));
      step(0.5);
      const held = c.seat === seat && Math.abs(cave.root.position.y - y) < 1e-6;
      press(); step();
      seats.push({ prompt, selected, facing, held, stood: !c.seat && !seat.sitter, feet: cave.root.position.y - cave.baseY - floor });
    }
    B.crew.relocatePlayer({ x: H.benches[0].walkAt.x, y: floor, z: H.benches[0].walkAt.z }, 0);
    step(); press(); step(); key("keydown", "d"); step(); key("keyup", "d");
    const movementStands = !c.seat;
    for (const hazard of H.fireHazards) {
      B.setHour(0); step();
      B.crew.relocatePlayer({ x: hazard.x - 1.5, y: hazard.y, z: hazard.z }, Math.PI / 2);
      B.pilot.orbit.yaw = B.pilot.orbit.tYaw = 0;
      key("keydown", "d");
      for (let i = 0; i < Math.ceil(1 / dt) && !c.burning; i++) step();
      key("keyup", "d"); step();
      const lit = c.burning, prompt = label(), particles = B.stats().particles;
      const startsAtLegs = c.spread[2] > 0 && c.spread[3] > 0 && c.spread[0] === 0 && c.spread[1] === 0;
      const beforeRollClean = parts.every((part) => part.scorch === 0);
      B.crew.relocatePlayer({ x: hazard.x + 1.4, y: hazard.y, z: hazard.z + 1.8 }, 0);
      step(); press();
      const transition = trackRoll(); transition.step();
      const rolling = c.rolling && !!cave.root.quaternion;
      let minX = cave.root.position.x, maxX = minX, positive = false, negative = false;
      for (let i = 0; i < Math.ceil(1 / dt); i++) {
        transition.step(); minX = Math.min(minX, cave.root.position.x); maxX = Math.max(maxX, cave.root.position.x);
        positive ||= c.turn[1] > 0.1; negative ||= c.turn[1] < -0.1;
      }
      const beforeRepeat = c.rollTime;
      const nearbyFlames = scene.root.children.filter((node) => node.visible && node.sightHidden && node.geometry?.faces.some((face) => face.emissive === 1) && Math.hypot(node.position.x - cave.root.position.x, node.position.z - cave.root.position.z) < 0.8 && Math.abs(node.position.y - cave.root.position.y) < 1.5).length;
      press(); transition.step();
      const repeatKeptProgress = c.rollTime >= beforeRepeat;
      const charDuringRoll = c.scorch[2] > 0 && c.scorch[3] > 0 && c.scorch[0] === 0 && c.scorch[1] === 0;
      transition.step(2.2);
      const out = !c.burning && !c.rolling && !cave.root.quaternion, smoke = c.smokeTime > 0 && B.stats().particles > 0, soot = c.soot;
      const onlyReachedParts = c.scorch[2] > 0 && c.scorch[3] > 0 && c.scorch[0] === 0 && c.scorch[1] === 0;
      const nativeColors = nativeParts();
      step(5);
      const fading = c.soot < soot && c.soot > 0;
      step(6);
      fire.push({ lit, startsAtLegs, beforeRollClean, charDuringRoll, onlyReachedParts, nativeColors, prompt, particles, nearbyFlames, rolling, travel: maxX - minX, positive, negative, repeatKeptProgress, rollTransition: transition.result, out, smoke, fading, cleared: c.soot === 0 && parts.every((part) => part.scorch === 0), stableNodes: nativeParts(), particlesAfter: B.stats().particles });
    }
    B.crew.relocatePlayer({ x: 1.4, y: floor, z: 1.8 }, 0);
    B.crew.ignite(cave);
    const initial = Array.from(c.spread);
    step(4);
    const middle = Array.from(c.spread);
    step(7);
    const late = Array.from(c.spread), cleanUntilRoll = parts.every((part) => part.scorch === 0);
    press();
    const transition = trackRoll(); transition.step(1);
    const charDuringRoll = parts.every((part, i) => part.scorch > 0 && part.scorch < late[i] && part.ember > 0), frozenSpread = c.spread.every((v, i) => v === late[i]);
    transition.step(2.2);
    const reachedHead = c.scorch[1] > 0.5, nativeColors = nativeParts();
    step(11);
    const delayed = { initial, middle, late, cleanUntilRoll, charDuringRoll, rollTransition: transition.result, frozenSpread, reachedHead, nativeColors, cleared: parts.every((part) => part.scorch === 0), particlesAfter: B.stats().particles };
    return { backend: B.renderer.kind, dt, collision, seats, movementStands, fire, delayed };
  } finally {
    key("keyup", "d");
    key("keyup", "a");
    for (const other of others) other.cave.root.visible = other.visible;
  }
};
