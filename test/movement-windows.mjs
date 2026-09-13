// Enter through a real headquarters doorway, then fly out through a panorama
// or rear-room window and back. Only the exterior fixture is placed directly.
export const movementWindowsProbe = ({ id = "c5", dt = 1 / 60, roomIndex = null, basement = false, rampIndex = null, sampleIndex = null } = {}, entranceProbe = null) => {
  const B = window.__ooga, scene = window.BL.scenes.hub, H = B.island.headquarters, o = B.pilot.orbit;
  const opening = B.cameraCave.openings.find((entry) => entry.id === id), m = opening.mouth;
  const ramp = H.ramps.find((entry) => entry.id === id), level = basement ? H.basement : H, room = roomIndex === null ? null : level.rooms.find((entry) => entry.index === roomIndex);
  const aperture = H.windows.find((entry) => rampIndex !== null ? entry.kind === "ramp" && entry.basement && entry.rampIndex === rampIndex && entry.sampleIndex === sampleIndex : room ? entry.kind === "room" && entry.roomIndex === roomIndex && !!entry.basement === basement : entry.kind === "panorama");
  const insideRadius = room ? room.radius : rampIndex !== null ? Math.hypot(aperture.x, aperture.z) : 22.5;
  const descent = basement ? rampIndex === null ? level.ramps[0] : level.ramps.find((entry) => entry.index === rampIndex) : null;
  const held = new Set(), checkpoints = [], violations = [], volume = [[0, 0], [0.27, 0], [-0.27, 0], [0, 0.27], [0, -0.27], [0.19, 0.19], [-0.19, 0.19], [0.19, -0.19], [-0.19, -0.19]];
  let elapsed = B.matrixCave.world.sampleStream(0).time, samples = 0, previous = null, maxStep = 0;
  const entrances = entranceProbe && entranceProbe();
  const solid = (x, y, z) => B.island.solidAt(x, y, z) || !!entrances && entrances.solid(x, y, z);
  const keys = (next) => {
    for (const key of held) if (!next.includes(key)) { window.dispatchEvent(new KeyboardEvent("keyup", { key })); held.delete(key); }
    for (const key of next) if (!held.has(key)) { window.dispatchEvent(new KeyboardEvent("keydown", { key })); held.add(key); }
  };
  const snapshot = () => {
    const p = B.camera.position, column = {};
    const cavity = B.island.cavityAt(p.x, p.z, column, H.caveIndex, p.y);
    return { x: p.x, y: p.y, z: p.z, radius: Math.hypot(p.x, p.z), camera: B.cameraCave.index, player: B.cameraCave.playerIndex, controlled: !!B.pilot.player, layer: cavity && p.y >= column.floor && p.y < column.ceiling ? column.caveIndex : 0, matrixInside: B.matrixCave.inside };
  };
  const inspect = () => {
    const p = B.camera.position;
    samples++;
    if (previous) {
      const distance = Math.hypot(p.x - previous.x, p.y - previous.y, p.z - previous.z), count = Math.max(1, Math.ceil(distance / 0.08));
      maxStep = Math.max(maxStep, distance);
      for (let n = 1; n <= count; n++) {
        const k = n / count, x = previous.x + (p.x - previous.x) * k, y = previous.y + (p.y - previous.y) * k, z = previous.z + (p.z - previous.z) * k;
        if (solid(x, y, z) && violations.length < 6) violations.push({ kind: "eye sweep", sample: samples, x, y, z });
        if (entrances && !entrances.clearAt(x, y - 0.27, z, 0.27, 0.54) && violations.length < 6) violations.push({ kind: "doorway eye volume sweep", sample: samples, x, y, z });
      }
    }
    // There is no controlled actor on this route. Check the entire free eye's
    // collision body near its sides and caps, not just its center point.
    for (const [dx, dz] of volume) for (const dy of [-0.27, 0, 0.27]) {
      if (solid(p.x + dx, p.y + dy, p.z + dz) && violations.length < 6) violations.push({ kind: "camera body", sample: samples, x: p.x + dx, y: p.y + dy, z: p.z + dz });
    }
    previous = { x: p.x, y: p.y, z: p.z };
  };
  const step = (check = true) => { scene.update(dt, elapsed += dt); if (check) inspect(); };
  const seek = (name, destination, seconds = 4) => {
    const tolerance = Math.max(0.25, dt * 8), limit = Math.ceil(seconds / dt);
    let reached = false, frame = 0;
    for (; frame < limit; frame++) {
      const p = B.camera.position, dx = destination.x - p.x, dz = destination.z - p.z, dy = destination.y - p.y;
      if (Math.hypot(dx, dz) <= tolerance && Math.abs(dy) <= 0.18) { reached = true; break; }
      const right = dx * Math.cos(o.yaw) - dz * Math.sin(o.yaw), forward = -dx * Math.sin(o.yaw) - dz * Math.cos(o.yaw), input = [];
      if (Math.abs(right) > Math.max(tolerance * 0.5, Math.abs(forward) * Math.tan(Math.PI / 8))) input.push(right > 0 ? "d" : "a");
      if (Math.abs(forward) > Math.max(tolerance * 0.5, Math.abs(right) * Math.tan(Math.PI / 8))) input.push(forward > 0 ? "w" : "s");
      if (Math.abs(dy) > 0.12) input.push(dy > 0 ? "z" : "x");
      keys(input); step();
    }
    keys([]);
    checkpoints.push({ name, reached, seconds: frame * dt, requested: destination, ...snapshot() });
    return reached;
  };
  const follow = (name, points) => {
    for (let n = 0; n < points.length; n++) {
      const q = points[n], p = B.camera.position, x = p.x, y = p.y, z = p.z;
      const count = Math.max(1, Math.ceil(Math.hypot(q.x - x, q.y - y, q.z - z) / 0.65));
      for (let j = 1; j <= count; j++) {
        if (!seek(`${name}:${n}:${j}`, { x: x + (q.x - x) * j / count, y: y + (q.y - y) * j / count, z: z + (q.z - z) * j / count })) return false;
      }
    }
    return true;
  };
  const radial = (radius, y) => ({ x: Math.sin(aperture.angle) * radius, y, z: -Math.cos(aperture.angle) * radius });
  const initialX = m.x + opening.sr * 1.6, initialZ = m.z + opening.cr * 1.6;
  const target = { x: initialX - opening.sr * 3.5, y: 1.1, z: initialZ - opening.cr * 3.5 };
  B.pilot.release(true);
  o.target = target; o.tx = target.x; o.ty = target.y; o.tz = target.z;
  o.yaw = o.tYaw = m.ry; o.pitch = o.tPitch = 0; o.dist = o.tDist = 3.5;
  B.pilot.update(0.1);
  for (let n = 0; n < Math.ceil(1 / dt); n++) step(false);
  const initial = snapshot(), expectedHeight = aperture.sill + aperture.height / 2;
  let completed = false, admitted = null, atWindow = null, outside = null, reentered = null;
  try {
    const down = ramp.samples.filter((_, n) => n % 3 === 0 || n === ramp.samples.length - 1).map((point) => ({ x: point.x, y: point.y + 1.1, z: point.z }));
    completed = follow("down", down);
    if (completed) {
      admitted = snapshot();
      const destinationAngle = descent ? Math.atan2(descent.from.x, -descent.from.z) : aperture.angle;
      const startAngle = Math.atan2(ramp.to.x, -ramp.to.z), arc = [];
      for (let n = 0; n <= 16; n++) {
        const angle = startAngle + (destinationAngle - startAngle) * n / 16;
        arc.push({ x: Math.sin(angle) * 10.5, y: H.floor + 1.1, z: -Math.cos(angle) * 10.5 });
      }
      completed = follow("upper-gallery", arc);
      if (completed && descent) {
        const points = rampIndex === null ? descent.samples : descent.samples.slice(0, sampleIndex + 1);
        completed = follow("basement-down", points.map((point) => ({ x: point.x, y: point.y + 1.1, z: point.z })));
        const start = Math.atan2(descent.to.x, -descent.to.z), lowerArc = [];
        for (let n = 0; n <= 24; n++) {
          const angle = start + (aperture.angle - start) * n / 24;
          lowerArc.push({ x: Math.sin(angle) * (level.room.radius - 1), y: level.floor + 1.1, z: -Math.cos(angle) * (level.room.radius - 1) });
        }
        if (completed && rampIndex === null) completed = follow("basement-gallery", lowerArc);
      }
      const approach = room ? [room.approach, room.entrance, room].map((point) => ({ x: point.x, y: (point.y ?? point.floor ?? level.floor) + 1.1, z: point.z })) : [radial(insideRadius, (rampIndex === null ? H.floor : aperture.floor) + 1.1)];
      if (completed) completed = follow(room ? "room" : "gallery", approach);
    }
    if (completed) completed = seek("rise-to-window", radial(insideRadius, expectedHeight));
    if (completed) {
      atWindow = snapshot();
      completed = follow("out-window", [radial(31.25, expectedHeight)]);
    }
    if (completed) {
      outside = snapshot();
      completed = follow("in-window", [radial(insideRadius, expectedHeight)]);
    }
    if (completed) {
      reentered = snapshot();
      completed = seek(room ? "room-floor" : rampIndex !== null ? "ramp-floor" : "gallery-floor", radial(room || rampIndex !== null ? insideRadius : 22, (room ? room.floor : rampIndex !== null ? aperture.floor : H.floor) + 1.1));
    }
    if (completed && rampIndex !== null) {
      completed = follow("finish-basement-descent", descent.samples.slice(sampleIndex + 1).map((point) => ({ x: point.x, y: point.y + 1.1, z: point.z })));
      if (completed) completed = follow("leave-basement", [...descent.samples].reverse().map((point) => ({ x: point.x, y: point.y + 1.1, z: point.z })));
      const radius = Math.hypot(descent.from.x, descent.from.z);
      if (completed) completed = seek("upper-floor", { x: descent.from.x * 11 / radius, y: H.floor + 1.1, z: descent.from.z * 11 / radius });
    }
    keys([]);
    for (let n = 0; n < Math.ceil(0.5 / dt); n++) step();
    return { id, dt, roomIndex, rampIndex, sampleIndex, basement, kind: aperture.kind, floor: room ? room.floor : H.floor, backend: B.renderer.kind, completed, initial, admitted, atWindow, outside, reentered, expectedHeight, samples, maxStep, violations, entrances: entrances && entrances.stats(), checkpoints: checkpoints.length, failed: checkpoints.filter((point) => !point.reached), final: snapshot(), scene: B.scene };
  } finally { keys([]); }
};
