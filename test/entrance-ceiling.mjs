// Walk a physical first-person eye through every HQ stone lintel in both
// directions, and probe roof contacts against the actual rendered mesh.
export const entranceCeilingProbe = ({ dt = 1 / 60 } = {}, createClearance) => {
  const B = window.__ooga, scene = window.BL.scenes.hub, H = B.island.headquarters, o = B.pilot.orbit, arches = createClearance();
  const held = new Set(), failures = [], violations = [], crossed = [], contacts = [];
  let elapsed = B.matrixCave.world.sampleStream(0).time, previous = null, samples = 0, maxStep = 0, maxStall = 0, stall = 0, lowest = Infinity, phase = "setup";
  const snapshot = () => ({ x: B.camera.position.x, y: B.camera.position.y, z: B.camera.position.z });
  const keys = (next) => {
    for (const key of held) if (!next.includes(key)) { window.dispatchEvent(new KeyboardEvent("keyup", { key })); held.delete(key); }
    for (const key of next) if (!held.has(key)) { window.dispatchEvent(new KeyboardEvent("keydown", { key })); held.add(key); }
  };
  const step = () => {
    scene.update(dt, elapsed += dt);
    const p = snapshot(), distance = previous ? Math.hypot(p.x - previous.x, p.y - previous.y, p.z - previous.z) : 0;
    samples++; maxStep = Math.max(maxStep, distance); lowest = Math.min(lowest, p.y);
    stall = previous && [...held].some((key) => "wasd".includes(key)) && Math.hypot(p.x - previous.x, p.z - previous.z) < 1e-5 ? stall + dt : 0;
    maxStall = Math.max(maxStall, stall);
    const count = Math.max(1, Math.ceil(distance / 0.04));
    for (let i = 1; i <= count; i++) {
      const k = i / count, x = previous ? previous.x + (p.x - previous.x) * k : p.x, y = previous ? previous.y + (p.y - previous.y) * k : p.y, z = previous ? previous.z + (p.z - previous.z) * k : p.z;
      const terrainClear = B.island.clearAt(x, y - 0.299, z, 0.299, 0.598), archClear = arches.clearAt(x, y - 0.299, z, 0.299, 0.598);
      if ((!terrainClear || !archClear) && violations.length < 8) violations.push({ phase, x, y, z, terrainClear, archClear, fraction: k, previous, p });
    }
    previous = p;
  };
  const seek = (goal) => {
    const tolerance = Math.max(0.22, dt * 6);
    for (let frame = 0; frame < Math.ceil(3 / dt); frame++) {
      const p = B.camera.position, dx = goal.x - p.x, dz = goal.z - p.z;
      if (Math.hypot(dx, dz) <= tolerance) { keys([]); return true; }
      const right = dx * Math.cos(o.yaw) - dz * Math.sin(o.yaw), forward = -dx * Math.sin(o.yaw) - dz * Math.cos(o.yaw), input = [];
      if (Math.abs(right) > Math.max(tolerance * 0.45, Math.abs(forward) * Math.tan(Math.PI / 8))) input.push(right > 0 ? "d" : "a");
      if (Math.abs(forward) > Math.max(tolerance * 0.45, Math.abs(right) * Math.tan(Math.PI / 8))) input.push(forward > 0 ? "w" : "s");
      keys(input); step();
    }
    failures.push({ phase, goal, at: snapshot() }); keys([]); return false;
  };
  // A walking eye takes its height from actual support. The lintel base
  // remains level while its approach ramp slopes beneath it.
  const follow = (points) => {
    for (const q of points) {
      const p = snapshot(), count = Math.max(1, Math.ceil(Math.hypot(q.x - p.x, q.z - p.z) / 0.6));
      for (let i = 1; i <= count; i++) if (!seek({ x: p.x + (q.x - p.x) * i / count, y: p.y + (q.y - p.y) * i / count, z: p.z + (q.z - p.z) * i / count })) return false;
    }
    return true;
  };
  const cross = (entry) => {
    const node = entry.node, sr = Math.sin(node.rotation.y), cr = Math.cos(node.rotation.y), floor = node.position.y;
    const point = (along) => ({ x: node.position.x + sr * along, y: floor + 1.1, z: node.position.z + cr * along });
    phase = `${entry.ramp ? "ramp" : entry.basement ? "basement" : "upper"}:${entry.roomIndex}`;
    if (!follow([point(1.3)])) return false;
    // Find the first actual lintel/roof contact from clear standing eye air.
    const center = point(0), clearAt = (eyeY) => B.island.clearAt(center.x, eyeY - 0.299, center.z, 0.299, 0.598) && arches.clearAt(center.x, eyeY - 0.299, center.z, 0.299, 0.598);
    let low = floor + 1.1, high = floor + 4.25;
    const standingClear = clearAt(low), overheadBlocked = !clearAt(high);
    for (let i = 0; i < 24; i++) { const middle = (low + high) / 2; if (clearAt(middle)) low = middle; else high = middle; }
    contacts.push({ id: phase, standingClear, overheadBlocked, y: low, clear: clearAt(low - 0.001), blocked: !clearAt(high + 0.001) });
    const before = snapshot();
    lowest = before.y;
    if (!follow([point(-1.3)])) return false;
    const inside = snapshot();
    if (!follow([point(1.3)])) return false;
    crossed.push({ id: phase, before, inside, returned: snapshot(), lowest });
    return seek(point(1.3));
  };
  const circle = (goal, floor, radius) => {
    const p = B.camera.position, a = Math.atan2(p.x, -p.z), b = Math.atan2(goal.x, -goal.z), turn = Math.atan2(Math.sin(b - a), Math.cos(b - a));
    const points = [], count = Math.max(1, Math.ceil(Math.abs(turn) * radius / 0.65));
    for (let i = 0; i <= count; i++) { const angle = a + turn * i / count; points.push({ x: Math.sin(angle) * radius, y: floor + 1.1, z: -Math.cos(angle) * radius }); }
    return follow(points);
  };
  const rooms = (level) => {
    for (const room of level.rooms) {
      const approach = { ...room.approach, y: level.floor + 1.1 };
      const entry = B.headquarters.entrances.find((candidate) => !candidate.ramp && candidate.roomIndex === room.index && !!candidate.basement === !!room.basement);
      if (!circle(approach, level.floor, level.room.radius - 2.5) || !follow([approach]) || !cross(entry) || !follow([approach])) return false;
    }
    return true;
  };
  let completed = false;
  try {
    B.pilot.release(true);
    document.querySelector('nav[data-scene="hub"] [data-preset="underground"]').click();
    B.pilot.enterClose();
    for (let i = 0; i < Math.ceil(1.5 / dt); i++) scene.update(dt, elapsed += dt);
    const lower = H.basement, down = lower.ramps[0], up = lower.ramps[1];
    completed = rooms(H);
    const first = B.headquarters.entrances.find((entry) => entry.ramp && entry.roomIndex === down.index);
    if (completed) completed = circle(down.from, H.floor, H.room.radius - 2.5) && cross(first);
    phase = "basement descent";
    if (completed) completed = follow(down.samples.map((p) => ({ x: p.x, y: p.y + 1.1, z: p.z })));
    if (completed) completed = rooms(lower);
    phase = "basement ascent";
    if (completed) completed = circle(up.to, lower.floor, lower.room.radius - 2.5) && follow([...up.samples].reverse().map((p) => ({ x: p.x, y: p.y + 1.1, z: p.z })));
    const second = B.headquarters.entrances.find((entry) => entry.ramp && entry.roomIndex === up.index);
    if (completed) completed = cross(second);
    return { completed, crossed, contacts, failures, violations, samples, maxStep, maxStall, arches: arches.stats(), scene: B.scene, mode: B.pilot.mode, selected: !!B.pilot.player, backend: B.renderer.kind };
  } finally { keys([]); }
};
