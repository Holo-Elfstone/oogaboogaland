// A free camera must follow a descending roof without corrective climb keys.
// The return deliberately presses upward, reproducing grazing ceiling contact.
export const rampCeilingProbe = ({ id = "c730", lateral = 0, dt = 1 / 60, fromNavigation = false } = {}) => {
  const B = window.__ooga, island = B.island, H = island.headquarters, scene = window.BL.scenes.hub, o = B.pilot.orbit;
  const opening = B.cameraCave.openings.find((entry) => entry.id === id), m = opening.mouth, ramp = H.ramps.find((entry) => entry.id === id);
  const held = new Set(), failures = [], violations = [], stages = [];
  let elapsed = B.matrixCave.world.sampleStream(0).time, samples = 0, phase = "setup", stall = 0, maxStall = 0, maxStep = 0, minimumY = Infinity, roofContacts = 0, descentClimbInputs = 0;
  let previous = null, previousInput = false;
  const keys = (next) => {
    for (const key of held) if (!next.includes(key)) { window.dispatchEvent(new KeyboardEvent("keyup", { key })); held.delete(key); }
    for (const key of next) if (!held.has(key)) { window.dispatchEvent(new KeyboardEvent("keydown", { key })); held.add(key); }
    previousInput = next.some((key) => "wasd".includes(key));
    if (phase === "down" && next.some((key) => key === "z" || key === "x")) descentClimbInputs++;
  };
  const snapshot = () => {
    const p = B.camera.position;
    return { x: p.x, y: p.y, z: p.z, camera: B.cameraCave.index, mode: B.pilot.mode };
  };
  const step = (check = true) => {
    scene.update(dt, elapsed += dt);
    if (!check) return;
    const p = B.camera.position;
    samples++;
    minimumY = Math.min(minimumY, p.y);
    if (previous) {
      const distance = Math.hypot(p.x - previous.x, p.y - previous.y, p.z - previous.z), count = Math.max(1, Math.ceil(distance / 0.08));
      maxStep = Math.max(maxStep, distance);
      stall = previousInput && Math.hypot(p.x - previous.x, p.z - previous.z) < 1e-5 ? stall + dt : 0;
      maxStall = Math.max(maxStall, stall);
      for (let i = 1; i <= count; i++) {
        const k = i / count, x = previous.x + (p.x - previous.x) * k, y = previous.y + (p.y - previous.y) * k, z = previous.z + (p.z - previous.z) * k;
        if (island.solidAt(x, y, z) && violations.length < 4) violations.push({ phase, kind: "eye sweep", x, y, z });
      }
    }
    // The production volume query checks every intersecting voxel. A sparse
    // disk of point samples alone misses the exact corner behind this bug.
    if (!island.clearAt(p.x, p.y - 0.299, p.z, 0.299, 0.598) && violations.length < 4) violations.push({ phase, kind: "eye volume", ...snapshot() });
    const roof = island.ceilingAt(p.x, p.y - 0.3, p.z, 0.3);
    if (Number.isFinite(roof) && Math.abs(roof - p.y - 0.3) < 0.015) roofContacts++;
    previous = { x: p.x, y: p.y, z: p.z };
  };
  const rest = (seconds, check = true) => { keys([]); for (let i = 0; i < Math.ceil(seconds / dt); i++) step(check); };
  const point = (along) => ({ x: m.x + opening.sr * along - opening.cr * lateral, z: m.z + opening.cr * along + opening.sr * lateral });
  const start = point(1.6), target = { x: start.x - opening.sr * 3.5, y: 1.1, z: start.z - opening.cr * 3.5 };
  B.pilot.release(true);
  if (fromNavigation) document.querySelector('nav[data-scene="hub"] [data-preset="underground"]').click();
  else {
    o.target = target; o.tx = target.x; o.ty = target.y; o.tz = target.z;
    o.yaw = o.tYaw = m.ry; o.pitch = o.tPitch = 0; o.dist = o.tDist = 3.5;
    B.pilot.update(0.1);
  }
  rest(1, false);
  const seek = (name, goal, climb = false) => {
    const limit = Math.ceil(3 / dt), tolerance = Math.max(0.28, dt * 8);
    for (let frame = 0; frame < limit; frame++) {
      const p = B.camera.position, dx = goal.x - p.x, dz = goal.z - p.z;
      if (Math.hypot(dx, dz) <= tolerance) { keys([]); return true; }
      const forward = -dx * Math.sin(o.yaw) - dz * Math.cos(o.yaw), right = dx * Math.cos(o.yaw) - dz * Math.sin(o.yaw), input = [];
      if (Math.abs(right) > Math.max(tolerance * 0.5, Math.abs(forward) * Math.tan(Math.PI / 8))) input.push(right > 0 ? "d" : "a");
      if (Math.abs(forward) > Math.max(tolerance * 0.5, Math.abs(right) * Math.tan(Math.PI / 8))) input.push(forward > 0 ? "w" : "s");
      // This is a deliberate ceiling-hugging ascent, never a correction based
      // on waypoint height. Descent has horizontal inputs exclusively.
      if (climb) input.push("z");
      keys(input); step();
    }
    keys([]);
    failures.push({ name, goal, ...snapshot() });
    return false;
  };
  const follow = (name, points, climb = false) => {
    for (const [i, q] of points.entries()) {
      const p = B.camera.position, x = p.x, z = p.z, count = Math.max(1, Math.ceil(Math.hypot(q.x - x, q.z - z) / 0.65));
      for (let j = 1; j <= count; j++) if (!seek(`${name}:${i}:${j}`, { x: x + (q.x - x) * j / count, z: z + (q.z - z) * j / count }, climb)) return false;
    }
    return true;
  };
  const down = ramp.samples.filter((_, i) => i % 3 === 0 || i === ramp.samples.length - 1).map((q, i, list) => {
    const a = list[Math.max(0, i - 1)], b = list[Math.min(list.length - 1, i + 1)], dx = b.x - a.x, dz = b.z - a.z, length = Math.hypot(dx, dz);
    return { x: q.x + dz / length * lateral, z: q.z - dx / length * lateral };
  });
  let completed = false, reversal = null;
  try {
    if (fromNavigation) completed = true;
    else {
      phase = "down";
      completed = follow("down", down);
      stages.push({ phase, ...snapshot() });
    }
    if (completed) {
      phase = "turn";
      completed = follow("center", [H.room]);
    }
    if (completed) {
      // Turn using the same look/zoom hooks as real input, in the open room.
      B.pilot.hooks.onZoom(6 / o.tDist);
      const frames = Math.ceil(1 / dt);
      for (let i = 0; i < frames; i++) { B.pilot.hooks.onOrbit(-Math.PI / frames / 0.004, 0.25 / frames / 0.0035); step(); }
      rest(0.6);
      phase = "up";
      completed = follow("up", [...down].reverse(), true);
      stages.push({ phase, ...snapshot() });
    }
    if (completed) {
      phase = "reverse";
      const before = snapshot();
      // Back into the upper curve, then resume the outward-facing ascent.
      completed = follow("reverse", [down[2]], false);
      reversal = { before, back: snapshot() };
      if (completed) completed = follow("resume", [down[1], down[0]], true);
      reversal.resumed = snapshot();
    }
    if (completed) {
      phase = "outside";
      completed = follow("outside", [point(2.5)]);
      rest(0.4);
      stages.push({ phase, ...snapshot() });
    }
    return { id, lateral, dt, fromNavigation, backend: B.renderer.kind, completed, failures, violations, samples, maxStep, maxStall, minimumY, roofContacts, descentClimbInputs, stages, reversal, final: snapshot(), scene: B.scene, selected: !!B.pilot.player };
  } finally { keys([]); }
};
