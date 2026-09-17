// Drive the real held-key controls and production scene updates. Only the
// initial exterior fixture is placed directly; every later waypoint is reached
// by movement, with independent solid-voxel checks on the resulting trajectory.
export const movementCollisionProbe = ({ id = "c5", mode = "orbit", dt = 1 / 120, rooms = false, ceiling = false, fromNavigation = false } = {}, entranceProbe = null) => {
  const B = window.__ooga, scene = window.BL.scenes.hub, H = B.island.headquarters;
  const opening = B.cameraCave.openings.find((entry) => entry.id === id), m = opening.mouth, o = B.pilot.orbit;
  const driven = mode === "trailing" || mode === "first-person", close = mode === "eye-level" || mode === "first-person";
  const cave = driven ? [...B.cavemen.values()].find((entry) => entry.state === "working") : null;
  const ramp = H.ramps.find((entry) => entry.id === id), held = new Set(), checkpoints = [], violations = [], visitedRooms = [];
  let elapsed = B.matrixCave.world.sampleStream(0).time, samples = 0, maxSeparation = 0, maxSeparationAt = null, maxStep = 0, maxStepAt = null, previous = null;
  let meshSamples = 0, headTop = 0, peakFeet = -Infinity, plateauFrames = 0, previousFeet = 0;
  let previousRampFeet = NaN;
  let previousRestricted = false;
  let rawChecks = 0, maximumRawError = 0;
  const rampViews = { mainDown: 0, mainUp: 0, basementDown: 0, basementUp: 0, maxSeparation: 0, maxSeparationAt: null, rawChecks: 0, maximumRawError: 0, blocked: [] };
  const accessRamps = H.ramps.concat(H.basement.ramps);
  const keys = (next) => {
    for (const key of held) if (!next.includes(key)) { window.dispatchEvent(new KeyboardEvent("keyup", { key })); held.delete(key); }
    for (const key of next) if (!held.has(key)) { window.dispatchEvent(new KeyboardEvent("keydown", { key })); held.add(key); }
  };
  const position = () => driven ? cave.root.position : B.camera.position;
  const snapshot = () => {
    const p = position(), eye = B.camera.position;
    return { x: p.x, y: p.y - (driven ? cave.baseY : 0), z: p.z, eye: [eye.x, eye.y, eye.z], camera: B.cameraCave.index, player: B.cameraCave.playerIndex, lightCount: B.renderOpts.lightCount, view: B.pilot.mode };
  };
  const entrances = entranceProbe && entranceProbe();
  const solid = (x, y, z) => B.island.solidAt(x, y, z) || !!entrances && entrances.solid(x, y, z);
  const inspect = () => {
    const p = B.camera.position, actor = cave && cave.root.position;
    const restricted = B.pilot.closeMix > 0 && !B.pilot.preserveExitAngle;
    const physicalEye = restricted && !B.cameraCave.transitioning;
    if (B.pilot.closeMix === 0) {
      const pitch = B.pilot.viewPitch, cp = Math.cos(pitch);
      rawChecks++;
      maximumRawError = Math.max(maximumRawError, Math.hypot(p.x - o.tx - Math.sin(o.yaw) * cp * o.dist, p.y - o.ty - Math.sin(pitch) * o.dist, p.z - o.tz - Math.cos(o.yaw) * cp * o.dist));
    }
    if (physicalEye && !B.island.clearAt(p.x, p.y - 0.3, p.z, 0.3, 0.6) && violations.length < 4) violations.push({ kind: "full eye volume", sample: samples, x: p.x, y: p.y, z: p.z });
    if (physicalEye && previousRestricted && previous && !B.island.voxelSegmentClearAt(previous.x, previous.y - 0.3, previous.z, p.x, p.y - 0.3, p.z, 0.3, 0.6) && violations.length < 4) violations.push({ kind: "full eye sweep", sample: samples, x: p.x, y: p.y, z: p.z });
    samples++;
    if (previous) {
      const distance = Math.hypot(p.x - previous.x, p.y - previous.y, p.z - previous.z), count = Math.max(1, Math.ceil(distance / 0.1));
      if (distance > maxStep) { maxStep = distance; maxStepAt = { sample: samples, before: previous, after: { x: p.x, y: p.y, z: p.z }, actor: actor ? [actor.x, actor.y - cave.baseY, actor.z] : null, camera: B.cameraCave.index, player: B.cameraCave.playerIndex }; }
      for (let i = 1; i <= count; i++) {
        const k = i / count, x = previous.x + (p.x - previous.x) * k, y = previous.y + (p.y - previous.y) * k, z = previous.z + (p.z - previous.z) * k;
        if (physicalEye && previousRestricted && solid(x, y, z) && violations.length < 4) violations.push({ kind: "eye sweep", sample: samples, x, y, z });
        const radius = driven ? 0.09 : 0.27;
        if (physicalEye && previousRestricted && entrances && !entrances.clearAt(x, y - radius, z, radius, radius * 2) && violations.length < 4) violations.push({ kind: "doorway eye volume sweep", sample: samples, x, y, z });
      }
    }
    for (const [x, y, z] of [[0, 0, 0], [0.09, 0, 0], [-0.09, 0, 0], [0, 0.09, 0], [0, -0.09, 0], [0, 0, 0.09], [0, 0, -0.09]]) {
      if (physicalEye && solid(p.x + x, p.y + y, p.z + z) && violations.length < 4) violations.push({ kind: "eye clearance", sample: samples, x: p.x + x, y: p.y + y, z: p.z + z });
    }
    if (!driven && physicalEye && entrances && entrances.near(p.x, p.y - 0.27, p.z, 0.27, 0.54)) for (const [x, z] of [[0, 0], [0.27, 0], [-0.27, 0], [0, 0.27], [0, -0.27], [0.19, 0.19], [-0.19, 0.19], [0.19, -0.19], [-0.19, -0.19]]) for (const y of [-0.27, 0, 0.27]) {
      if (entrances.solid(p.x + x, p.y + y, p.z + z) && violations.length < 4) violations.push({ kind: "free camera doorway clearance", sample: samples, x: p.x + x, y: p.y + y, z: p.z + z });
    }
    if (actor) {
      const feet = actor.y - cave.baseY, rise = feet - previousRampFeet;
      previousRampFeet = feet;
      if (Math.abs(rise) > 1e-6) for (const route of accessRamps) {
        let nearest = Infinity, floor = 0;
        for (let i = 1; i < route.samples.length; i++) {
          const a = route.samples[i - 1], b = route.samples[i];
          if (Math.abs(b.y - a.y) < 1e-6) continue;
          const dx = b.x - a.x, dz = b.z - a.z, k = Math.max(0, Math.min(1, ((actor.x - a.x) * dx + (actor.z - a.z) * dz) / (dx * dx + dz * dz)));
          const distance = (actor.x - a.x - dx * k) ** 2 + (actor.z - a.z - dz * k) ** 2;
          if (distance < nearest) { nearest = distance; floor = a.y + (b.y - a.y) * k; }
        }
        // The center of the real sloping corridor excludes adjacent rooms,
        // windows and the flat landing shared with the common area.
        if (nearest > (route.width * 0.2) ** 2 || Math.abs(feet - floor) > 0.35) continue;
        const key = `${route.basement ? "basement" : "main"}${rise > 0 ? "Up" : "Down"}`;
        rampViews[key]++;
        if (B.pilot.closeMix === 0 && !B.pilot.preserveExitAngle) {
          const pitch = B.pilot.viewPitch, cp = Math.cos(pitch);
          rampViews.rawChecks++;
          rampViews.maximumRawError = Math.max(rampViews.maximumRawError, Math.hypot(p.x - o.tx - Math.sin(o.yaw) * cp * o.dist, p.y - o.ty - Math.sin(pitch) * o.dist, p.z - o.tz - Math.cos(o.yaw) * cp * o.dist));
        }
        const gap = B.cameraCave.transitioning ? 0 : Math.hypot(p.x - actor.x, p.y - feet - 1, p.z - actor.z);
        if (gap > rampViews.maxSeparation) { rampViews.maxSeparation = gap; rampViews.maxSeparationAt = { key, checkpoint: checkpoints.at(-1)?.name, actor: [actor.x, feet, actor.z], eye: [p.x, p.y, p.z] }; }
        if (!B.cameraCave.transitioning && !B.island.voxelSegmentClearAt(actor.x, feet + cave.headOffset * 0.95, actor.z, p.x, p.y, p.z, 0, 0) && rampViews.blocked.length < 12) rampViews.blocked.push({ key, checkpoint: checkpoints.at(-1)?.name, actor: [actor.x, feet, actor.z], eye: [p.x, p.y, p.z] });
        break;
      }
      const separation = Math.hypot(p.x - actor.x, p.y - actor.y + cave.baseY - 1, p.z - actor.z);
      if (separation > maxSeparation) { maxSeparation = separation; maxSeparationAt = { sample: samples, checkpoint: checkpoints.at(-1)?.name, ...snapshot() }; }
      for (const height of [0.3, cave.headOffset * 0.75]) for (const [x, z] of [[0, 0], [0.12, 0], [-0.12, 0], [0, 0.12], [0, -0.12]]) {
        const y = actor.y - cave.baseY + height;
        if (solid(actor.x + x, y, actor.z + z) && violations.length < 4) violations.push({ kind: "body", sample: samples, x: actor.x + x, y, z: actor.z + z });
      }
      if (ceiling || entrances && entrances.near(actor.x, actor.y - cave.baseY, actor.z)) {
        // Check the posed render geometry independently of the collision body's
        // cached height. Inset surface vertices slightly to allow exact contact.
        window.BL.scene.updateWorld(cave.root);
        headTop = -Infinity;
        const inspectMesh = (name, node) => {
          const verts = node.geometry.verts, matrix = node.world;
          for (let i = 0; i < verts.length; i += 3) {
            const x = verts[i] * 0.995, y = verts[i + 1] * 0.995, z = verts[i + 2] * 0.995;
            const wx = matrix[0] * x + matrix[4] * y + matrix[8] * z + matrix[12];
            const wy = matrix[1] * x + matrix[5] * y + matrix[9] * z + matrix[13];
            const wz = matrix[2] * x + matrix[6] * y + matrix[10] * z + matrix[14];
            meshSamples++;
            if (name.startsWith("head")) headTop = Math.max(headTop, wy);
            if (solid(wx, wy, wz) && violations.length < 4) violations.push({ kind: name + " mesh", sample: samples, x: wx, y: wy, z: wz });
          }
        };
        const inspectHead = (node) => {
          if (!node.visible) return;
          if (node.geometry) inspectMesh(node === cave.parts.head ? "head" : "head attachment", node);
          for (const child of node.children) inspectHead(child);
        };
        inspectHead(cave.parts.head);
        inspectMesh("torso", cave.parts.torso);
        const feet = actor.y - cave.baseY;
        peakFeet = Math.max(peakFeet, feet);
        if (cave.jet && cave.jet.thrust && cave.hop > 0.5 && Math.abs(feet - previousFeet) < 1e-6) plateauFrames++;
        previousFeet = feet;
      }
    }
    previous = { x: p.x, y: p.y, z: p.z }; previousRestricted = physicalEye;
  };
  const step = (check = true) => { scene.update(dt, elapsed += dt); if (check) inspect(); };
  const tickFor = (seconds, input) => { keys(input); for (let i = 0; i < Math.ceil(seconds / dt); i++) step(); keys([]); };
  const point = (along, across = 0, y = 1.1) => ({ x: m.x + opening.sr * along + opening.cr * across, z: m.z + opening.cr * along - opening.sr * across, y });
  const start = point(1.6), target = { x: start.x - opening.sr * (driven ? 0 : 3.5), y: 1.1, z: start.z - opening.cr * (driven ? 0 : 3.5) };
  B.pilot.release(true);
  if (driven) {
    cave.root.position.x = start.x; cave.root.position.z = start.z; cave.root.position.y = cave.baseY + m.floorY;
    cave.hop = cave.hopV = 0; cave.root.rotation.y = m.ry + Math.PI;
    B.pilot.possess(cave);
  }
  if (driven) {
    // Keep the pilot's real moving follow target. Replacing it with a static
    // object made the old forced boom conceal an invalid trailing fixture.
    B.pilot.enterClose();
    B.pilot.navigate({ position: { x: start.x, y: m.floorY, z: start.z }, target, yaw: m.ry, pitch: 0, dist: 3.5 });
    for (let i = 0; i < Math.ceil(0.5 / dt); i++) step(false);
    if (!close) {
      document.getElementById("scene").dispatchEvent(new WheelEvent("wheel", { deltaY: 60, cancelable: true }));
      for (let i = 0; i < Math.ceil(0.6 / dt); i++) step(false);
    }
  } else {
    o.target = target; o.tx = target.x; o.ty = target.y; o.tz = target.z;
    o.yaw = o.tYaw = m.ry; o.pitch = o.tPitch = 0; o.dist = o.tDist = 3.5;
    B.pilot.update(0.1);
  }
  if (close && !driven) B.pilot.hooks.onZoom(0.1);
  if (fromNavigation) document.querySelector('nav[data-scene="hub"] [data-preset="underground"]').click();
  for (let i = 0; i < Math.ceil(1 / dt); i++) step(false);
  const initial = snapshot();
  initial.eyeClear = B.island.clearAt(B.camera.position.x, B.camera.position.y - 0.3, B.camera.position.z, 0.3, 0.6);
  const seek = (name, destination, seconds = 8) => {
    const before = snapshot(), limit = Math.ceil(seconds / dt), tolerance = Math.max(0.28, dt * 8);
    let reached = false, frame = 0;
    for (; frame < limit; frame++) {
      const p = position(), dx = destination.x - p.x, dz = destination.z - p.z, dy = destination.y - (p.y - (driven ? cave.baseY : 0));
      if (Math.hypot(dx, dz) <= tolerance && (driven || close || Math.abs(dy) <= 0.4)) { reached = true; break; }
      const right = dx * Math.cos(o.yaw) - dz * Math.sin(o.yaw), forward = -dx * Math.sin(o.yaw) - dz * Math.cos(o.yaw), input = [];
      // Choose the closest keyboard heading. Treating every nonzero error as
      // a full axis can command diagonally into a wall beside a straight path.
      if (Math.abs(right) > Math.max(tolerance * 0.5, Math.abs(forward) * Math.tan(Math.PI / 8))) input.push(right > 0 ? "d" : "a");
      if (Math.abs(forward) > Math.max(tolerance * 0.5, Math.abs(right) * Math.tan(Math.PI / 8))) input.push(forward > 0 ? "w" : "s");
      if (!driven && !close && Math.abs(dy) > 0.18) input.push(dy > 0 ? "z" : "x");
      keys(input); step();
    }
    keys([]);
    const after = snapshot(), result = { name, reached, seconds: +(frame * dt).toFixed(3), distance: Math.hypot(after.x - destination.x, after.z - destination.z), movement: Math.hypot(after.x - before.x, after.z - before.z), ...after };
    checkpoints.push(result);
    return reached;
  };
  const follow = (name, points) => {
    for (let i = 0; i < points.length; i++) {
      const q = points[i], p = position(), x = p.x, y = p.y - (driven ? cave.baseY : 1.1), z = p.z, count = Math.max(1, Math.ceil(Math.hypot(q.x - x, q.z - z) / 0.65));
      // A distant endpoint is insufficient guidance for eight digital headings:
      // keep the walked line within narrow room corridors and gallery edges.
      for (let j = 1; j <= count; j++) {
        const label = `${name}:${i}${j === count ? "" : ":" + j}`;
        if (!seek(label, { x: x + (q.x - x) * j / count, y: y + ((q.y ?? q.floor ?? H.floor) - y) * j / count + (driven ? 0 : 1.1), z: z + (q.z - z) * j / count }, 3)) return false;
      }
    }
    return true;
  };
  const leaveCave = () => {
    if (!seek("center", point(-2.5))) return false;
    if (driven && id === B.mirrorCave.mouth.id) {
      // These roof/wall checks leave after the wave has closed the entrance.
      // Release only this gate so the normal exit still reverses the wave.
      if (!seek("gate release", point(-0.5))) return false;
      const gate = B.matrixGate.gates.find((entry) => entry.caveIndex === opening.caveIndex);
      if (gate.node.visible && !gate.open) {
        const p = cave.root.position;
        if (!B.matrixGate.openNear(p.x, p.y - cave.baseY + 1.1, p.z)) throw new Error("Could not reach the interior glyph-gate release");
        let frames = 0;
        while (gate.node.position.y < B.matrixGate.hiddenHeight && frames++ < Math.ceil(2 / dt)) step();
        if (gate.node.position.y !== B.matrixGate.hiddenHeight) throw new Error("The interior glyph gate did not finish opening");
      }
    }
    return seek("outside", point(2.5));
  };
  const aroundBasementHole = (name, destination) => {
    const p = position(), radius = H.basement.room.radius - 1, from = Math.atan2(p.x, -p.z), to = Math.atan2(destination.x, -destination.z);
    const angle = Math.atan2(Math.sin(to - from), Math.cos(to - from)), count = Math.max(1, Math.ceil(Math.abs(angle) / 0.15)), arc = [];
    // Room tours use the retained walking ring; the central shaft has its own
    // deliberate fall test. Radial joins and short chords stay clear of its rim.
    for (let i = 0; i <= count; i++) { const a = from + angle * i / count; arc.push({ x: Math.sin(a) * radius, y: H.basement.floor, z: -Math.cos(a) * radius }); }
    return follow(name, arc);
  };
  const visitRooms = (rooms, floor, radius, name) => {
    for (const room of rooms) {
      const radial = Math.hypot(room.approach.x, room.approach.z), approach = { x: room.approach.x * radius / radial, y: floor, z: room.approach.z * radius / radial };
      const entrance = [room.approach, room.entrance].map((point) => ({ x: point.x, y: floor, z: point.z }));
      if (floor === H.basement.floor && !aroundBasementHole(`${name}-ring:${room.index}`, approach)) return false;
      if (!follow(`${name}:${room.index}`, [approach, ...entrance, room])) return false;
      tickFor(0.3, []);
      visitedRooms.push({ index: room.index, basement: !!room.basement, floor: room.floor, ...snapshot() });
      if (!follow(`${name}-exit:${room.index}`, [...entrance].reverse().concat([approach]))) return false;
    }
    return true;
  };
  let completed = true, collision = null, reversal = null, underground = null, ceilingContact = null;
  try {
    if (ramp) {
      const down = ramp.samples.filter((_, i) => i % 3 === 0 || i === ramp.samples.length - 1);
      if (fromNavigation) completed = seek("landing", { x: ramp.to.x, y: H.floor + (driven ? 0 : 1.1), z: ramp.to.z });
      else completed = follow("down", down);
      if (completed && !fromNavigation) {
        // Start this independent layer check at rest, after normal orbit
        // damping has settled from the final downward waypoint.
        tickFor(0.6, []);
        const before = snapshot(), y = o.target.y;
        tickFor(0.4, ["a"]);
        const after = snapshot();
        underground = { before, after, targetBefore: y, targetAfter: o.target.y };
        completed = seek("landing", { x: ramp.to.x, y: H.floor + (driven ? 0 : 1.1), z: ramp.to.z });
      }
      if (completed && rooms) {
        const angle = Math.atan2(ramp.to.x, -ramp.to.z), circle = [];
        for (let i = 0; i <= 48; i++) { const a = angle + Math.PI * 2 * i / 48; circle.push({ x: Math.sin(a) * 11, z: -Math.cos(a) * 11 }); }
        completed = follow("circle", circle);
        if (completed) completed = visitRooms(H.rooms, H.floor, 11, "room");
        const basement = H.basement, descent = basement.ramps[0], ascent = basement.ramps[1];
        if (completed) completed = follow("basement-down", descent.samples);
        if (completed) completed = visitRooms(basement.rooms, basement.floor, basement.room.radius - 1, "basement-room");
        if (completed) completed = aroundBasementHole("basement-return-ring", ascent.to);
        if (completed) completed = follow("basement-up", [...ascent.samples].reverse());
        if (completed) {
          const from = Math.atan2(ascent.from.x, -ascent.from.z), to = Math.atan2(ramp.to.x, -ramp.to.z), arc = [];
          for (let i = 0; i <= 32; i++) { const angle = from + (to - from) * i / 32; arc.push({ x: Math.sin(angle) * 11, y: H.floor, z: -Math.cos(angle) * 11 }); }
          completed = follow("return-to-main-ramp", arc);
        }
      }
      if (completed) completed = follow("up", [...down].reverse());
      if (completed) completed = seek("outside", point(2.5));
    } else {
      // Clear the doorway soffit with the entire body before pressing against
      // the interior roof, including the coarser 20 Hz walking increment.
      completed = seek("enter", point(ceiling ? -3.2 : -2.5));
      if (completed && ceiling) {
        const entryAction = document.getElementById("act").textContent;
        // Space near the mirror control belongs to that button. Walk to a
        // clear roof station outside its reach before testing held thrust.
        if (!seek("roof takeoff", point(-3.2, -1.6))) throw new Error("Could not reach clear ceiling takeoff station");
        const entered = snapshot();
        // The flight test starts with a collected pack; J only toggles owned
        // equipment now that the world pickup lives on a distant cloud.
        B.jetpack.grant(cave);
        tickFor(dt, ["j"]);
        const takeoffAction = document.getElementById("act").textContent;
        tickFor(2, [" "]);
        const column = {};
        B.island.cavityAt(cave.root.position.x, cave.root.position.z, column, opening.caveIndex);
        const hover = { ...snapshot(), headTop, roof: column.ceiling, thrust: !!cave.jet && cave.jet.thrust, hop: cave.hop, velocity: cave.hopV };
        const pitched = [];
        if (close) {
          // Pitch the real posed head while thrust holds it against the roof.
          // Neutral-pose ceiling bounds previously let its corners enter rock.
          for (const pitch of [-0.46, 0.46, -1.1, 1.1, 0]) {
            B.pilot.hooks.onOrbit(0, (pitch - o.tPitch) / 0.0035);
            tickFor(0.5, [" "]);
            pitched.push({ requested: pitch, actual: cave.parts.head.rotation.x, headTop, roof: column.ceiling, thrust: cave.jet.thrust, hop: cave.hop, ...snapshot() });
          }
        }
        tickFor(0.2, [" ", "d"]);
        const side = snapshot();
        tickFor(0.2, [" ", "w", "a"]);
        const diagonal = snapshot();
        tickFor(0.4, [" "]);
        const heldAtRoof = snapshot();
        keys([]);
        let landingFrames = 0;
        while ((cave.hop > 0 || cave.hopV > 0) && landingFrames++ < Math.ceil(3 / dt)) step();
        const landed = { ...snapshot(), hop: cave.hop, velocity: cave.hopV, thrust: cave.jet.thrust };
        ceilingContact = { entered, entryAction, takeoffAction, equipped: !!cave.jet, hover, pitched, side, diagonal, heldAtRoof, landed, peakFeet, plateauFrames, meshSamples, sideways: Math.hypot(side.x - hover.x, side.z - hover.z), diagonalTravel: Math.hypot(diagonal.x - side.x, diagonal.z - side.z), landingSeconds: landingFrames * dt };
        completed = leaveCave();
      } else if (completed) {
        const before = snapshot();
        // Press into the jagged side wall with a forward component. Tangential
        // travel must continue, then opposite input must work immediately.
        tickFor(0.8, ["w", "d", ...(!close && !driven ? ["z"] : [])]);
        const contact = snapshot();
        tickFor(2, ["d"]);
        const pinned = snapshot(), reverseX = -Math.cos(o.yaw), reverseZ = Math.sin(o.yaw);
        keys(["a"]); step(); keys([]);
        const firstReverse = snapshot();
        tickFor(0.3, ["a", "s", ...(!close && !driven ? ["x"] : [])]);
        const retreat = snapshot();
        collision = { before, contact, pinned, travel: Math.hypot(contact.x - before.x, contact.z - before.z) };
        reversal = { firstReverse, retreat, firstDistance: Math.hypot(firstReverse.x - pinned.x, firstReverse.z - pinned.z), firstDot: (firstReverse.x - pinned.x) * reverseX + (firstReverse.z - pinned.z) * reverseZ, distance: Math.hypot(retreat.x - pinned.x, retreat.z - pinned.z) };
        completed = leaveCave();
      }
    }
    tickFor(0.5, []);
    return { id, mode, dt, fromNavigation, backend: B.renderer.kind, initial, completed, visitedRooms, rampViews, rawChecks, maximumRawError, entrances: entrances && entrances.stats(), checkpoints: checkpoints.length, failed: checkpoints.filter((checkpoint) => !checkpoint.reached), stages: checkpoints.filter((checkpoint) => checkpoint.name === "outside" || checkpoint.name === "down:32" || checkpoint.name === "up:32"), collision, reversal, underground, ceilingContact, samples, violations, maxSeparation, maxSeparationAt, maxStep, maxStepAt, final: snapshot(), scene: B.scene };
  } finally { keys([]); }
};
