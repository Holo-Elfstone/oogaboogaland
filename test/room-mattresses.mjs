// Inspect the authored render geometry, rather than trusting its dimensions or
// a bedding count alone. LifeHash's independent reference vectors live in
// lifehash.mjs; here every fabric pixel must survive the model's face merging.
export const roomMattressGeometryProbe = async () => {
  const B = window.__ooga, BL = window.BL, H = B.headquarters, beds = H.mattresses, rooms = H.rooms.concat(H.basement.rooms), failures = [], signatures = [], rows = [];
  const nodes = [];
  BL.scene.traverseVisible(BL.scenes.hub.root, (node) => { if (node.geometry?.mattress) nodes.push(node); });
  BL.scene.updateWorld(BL.scenes.hub.root);
  let pixels = 0, edges = 0, vertices = 0, floorSamples = 0, cached = 0, unclaimed = 0, rotations = 0;
  const fail = (kind, detail) => { if (failures.length < 12) failures.push({ kind, ...detail }); };
  for (const bed of beds) {
    const room = bed.room, node = bed.node, geo = BL.headquartersModels.mattress(room), c = Math.cos(room.angle), s = Math.sin(room.angle), world = node.world;
    const key = [room.x, room.floor, room.z].map((n) => Number(n.toFixed(6))).join(",");
    const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
    if (BL.headquartersModels.mattress(room) === geo && node.geometry === geo) cached++;
    if (room.resident == null && !geo.collisionBoxes && !B.props.some((prop) => prop.node === node)) unclaimed++;
    if (bed.roomKey !== key || bed.corner !== "rear-left" || !rooms.includes(room) || node.parent !== BL.scenes.hub.root || nodes.filter((n) => n === node).length !== 1) fail("room identity", { key });
    for (let i = 0; i < geo.verts.length; i += 3) {
      const x = geo.verts[i], y = geo.verts[i + 1], z = geo.verts[i + 2];
      const wx = world[0] * x + world[4] * y + world[8] * z + world[12], wy = world[1] * x + world[5] * y + world[9] * z + world[13], wz = world[2] * x + world[6] * y + world[10] * z + world[14];
      const p = [(wx - room.x) * c + (wz - room.z) * s, wy - room.floor, (wx - room.x) * s - (wz - room.z) * c];
      for (let axis = 0; axis < 3; axis++) { min[axis] = Math.min(min[axis], p[axis]); max[axis] = Math.max(max[axis], p[axis]); }
      vertices++;
      if (!p.every(Number.isFinite) || B.island.solidAt(wx, wy + 1e-5, wz)) fail("render vertex in rock", { key, wx, wy, wz });
    }
    const inset = BL.headquartersModels.MATTRESS.wallInset, height = BL.headquartersModels.MATTRESS.height;
    const placement = inset >= 0.45 && Math.abs(min[0] + room.width / 2 - inset) < 5e-6 && Math.abs(max[2] - room.depth / 2 + inset) < 5e-6 && max[0] < -0.3 && min[2] > -room.depth / 2 + 0.5 && Math.abs(min[1]) < 5e-6 && Math.abs(max[1] - height) < 5e-6 && Math.abs(max[0] - min[0] - 1.45) < 5e-6 && Math.abs(max[2] - min[2] - 2.45) < 5e-6;
    if (!placement) fail("corner bounds", { key, min, max });
    for (let a = 0; a <= 10; a++) for (let d = 0; d <= 18; d++) {
      const across = min[0] + (max[0] - min[0]) * a / 10, along = min[2] + (max[2] - min[2]) * d / 18;
      const x = room.x + c * across + s * along, z = room.z + s * across - c * along;
      floorSamples++;
      if (Math.abs(B.island.supportAt(x, z, room.floor + 0.01, 0, -120) - room.floor) > 1e-6 || !B.island.clearAt(x, room.floor + 1e-5, z, 0, height)) fail("mattress footing", { key, x, z });
    }
    const surfaces = [];
    for (const kind of ["sheet", "pillow"]) {
      const fabric = bed[kind], pattern = fabric.pattern, faces = geo.faces.filter((f) => f.mattressFabric === kind), top = faces.filter((f) => f.i.every((i) => Math.abs(geo.verts[i * 3 + 1] - geo.verts[f.i[0] * 3 + 1]) < 1e-10));
      const xs = top.flatMap((f) => f.i.map((i) => geo.verts[i * 3])), zs = top.flatMap((f) => f.i.map((i) => geo.verts[i * 3 + 2]));
      const x0 = Math.min(...xs), x1 = Math.max(...xs), z0 = Math.min(...zs), z1 = Math.max(...zs), y = geo.verts[top[0].i[0] * 3 + 1];
      if (fabric.seed !== `room:${key}:sheet` || pattern.width !== 32 || pattern.height !== 32 || pattern.colors.length !== 3072 || !faces.every((f) => f.emissive === 0 && f.color.length === 3 && f.color.every((v) => Number.isInteger(v) && v >= 0 && v <= 255))) fail("fabric domain", { key, kind });
      const canonical = BL.lifehash.make(`room:${key}:sheet`).colors;
      let oriented = true;
      for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) for (let channel = 0; channel < 3; channel++) {
        const source = kind === "pillow" ? (31 - x) * 32 + y : y * 32 + x;
        if (pattern.colors[(y * 32 + x) * 3 + channel] !== canonical[source * 3 + channel]) oriented = false;
      }
      if (!oriented) fail("fabric orientation", { key, kind });
      if (kind === "pillow" && oriented) rotations++;
      const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", pattern.colors));
      signatures.push(Array.from(digest, (n) => n.toString(16).padStart(2, "0")).join(""));
      const contains = (f, x, z) => x > Math.min(...f.i.map((i) => geo.verts[i * 3])) - 1e-9 && x < Math.max(...f.i.map((i) => geo.verts[i * 3])) + 1e-9 && z > Math.min(...f.i.map((i) => geo.verts[i * 3 + 2])) - 1e-9 && z < Math.max(...f.i.map((i) => geo.verts[i * 3 + 2])) + 1e-9;
      for (let row = 0; row < 32; row++) for (let col = 0; col < 32; col++) {
        const x = x0 + (col + 0.5) / 32 * (x1 - x0), z = z0 + (row + 0.5) / 32 * (z1 - z0), matches = top.filter((f) => contains(f, x, z)), offset = (row * 32 + col) * 3;
        pixels++;
        if (matches.length !== 1 || matches[0].color.some((v, axis) => v !== pattern.colors[offset + axis])) fail("fabric pixel", { key, kind, row, col, matches: matches.length });
      }
      for (let edge = 0; edge < 4; edge++) for (let cell = 0; cell < 32; cell++) {
        const x = edge < 2 ? x0 + (cell + 0.5) / 32 * (x1 - x0) : edge === 2 ? x0 : x1;
        const z = edge < 2 ? edge ? z1 : z0 : z0 + (cell + 0.5) / 32 * (z1 - z0);
        const pixel = edge < 2 ? (edge ? 31 : 0) * 32 + cell : cell * 32 + (edge === 3 ? 31 : 0);
        const matches = faces.filter((f) => !top.includes(f) && contains(f, x, z));
        edges++;
        if (matches.length !== 1 || matches[0].color.some((v, axis) => v !== pattern.colors[pixel * 3 + axis])) fail("fabric wrap", { key, kind, edge, cell });
      }
      surfaces.push({ kind, top: y, width: x1 - x0, depth: z1 - z0, faces: faces.length });
    }
    if (!(surfaces[1].top > surfaces[0].top && surfaces[1].depth < surfaces[0].depth && Math.abs(surfaces[0].top - 0.245) < 1e-7 && Math.abs(surfaces[0].width - 1.45) < 1e-7 && Math.abs(surfaces[0].depth - 2.45) < 1e-7)) fail("pillow and wrapped blanket silhouette", { key, surfaces });
    rows.push({ roomIndex: room.index, basement: bed.basement, min, max, surfaces, faces: geo.faces.length });
  }
  return { beds: beds.length, nodes: nodes.length, rooms: rooms.length, uniqueRooms: new Set(beds.map((b) => b.room)).size, uniqueGeometry: new Set(beds.map((b) => b.node.geometry)).size, signatures, uniqueFabrics: new Set(signatures.filter((_, i) => !(i % 2))).size, rotations, rows, pixels, edges, vertices, floorSamples, cached, unclaimed, failures };
};

// Hide each complete authored bed for a reference frame. Both independent
// renderers must show changed pixels at its sheet and pillow in the actual room.
export const roomMattressVisibilityProbe = () => {
  const B = window.__ooga, scene = window.BL.scenes.hub, canvas = document.getElementById("scene"), gl = B.renderer.kind === "webgl2" ? canvas.getContext("webgl2") : null;
  const ctx = gl ? null : document.createElement("canvas").getContext("2d", { willReadFrequently: true });
  if (ctx) { ctx.canvas.width = canvas.width; ctx.canvas.height = canvas.height; }
  const before = new Uint8Array(canvas.width * canvas.height * 4), after = new Uint8Array(before.length), rows = [];
  const savedPosition = B.camera.position, savedTarget = B.camera.target;
  const savedBeds = B.headquarters.mattresses.map((bed) => ({ node: bed.node, geometry: bed.node.geometry, visible: bed.node.visible }));
  const savedCrew = [...B.cavemen.values()].map((cave) => ({ node: cave.root, visible: cave.root.visible }));
  const capture = (out) => { B.renderer.render(scene.root, B.camera, B.renderOpts); if (gl) gl.readPixels(0, 0, canvas.width, canvas.height, gl.RGBA, gl.UNSIGNED_BYTE, out); else { ctx.drawImage(canvas, 0, 0); out.set(ctx.getImageData(0, 0, canvas.width, canvas.height).data); } };
  try {
    for (const entry of savedCrew) entry.node.visible = false;
    for (const bed of B.headquarters.mattresses) {
      const room = bed.room, node = bed.node, original = node.geometry, geo = window.BL.headquartersModels.mattress(room);
      node.geometry = geo;
      B.camera.position = { x: room.x, y: room.floor + 2.6, z: room.z };
      B.camera.target = { x: node.position.x, y: room.floor + 0.08, z: node.position.z };
      node.visible = false; capture(before); node.visible = true; capture(after);
      const surfaces = [];
      for (const kind of ["sheet", "pillow"]) {
        const faces = geo.faces.filter((f) => f.mattressFabric === kind && f.i.every((i) => geo.verts[i * 3 + 1] === geo.verts[f.i[0] * 3 + 1]));
        const xs = faces.flatMap((f) => f.i.map((i) => geo.verts[i * 3])), zs = faces.flatMap((f) => f.i.map((i) => geo.verts[i * 3 + 2]));
        const x0 = Math.min(...xs), x1 = Math.max(...xs), z0 = Math.min(...zs), z1 = Math.max(...zs), y = geo.verts[faces[0].i[0] * 3 + 1], m = node.world;
        let changed = 0, colored = 0, samples = 0; const colors = new Set();
        for (let row = 0; row < 8; row++) for (let col = 0; col < 8; col++) {
          const x = x0 + (col + 0.5) / 8 * (x1 - x0), z = z0 + (row + 0.5) / 8 * (z1 - z0);
          const screen = B.renderer.project(m[0] * x + m[4] * y + m[8] * z + m[12], m[1] * x + m[5] * y + m[9] * z + m[13], m[2] * x + m[6] * y + m[10] * z + m[14], {});
          if (!screen) continue;
          const px = Math.floor(screen.x * canvas.width / B.renderer.size.width), py = Math.floor(screen.y * canvas.height / B.renderer.size.height);
          if (px < 0 || py < 0 || px >= canvas.width || py >= canvas.height) continue;
          const offset = ((gl ? canvas.height - 1 - py : py) * canvas.width + px) * 4, rgb = after.slice(offset, offset + 3);
          samples++; if (rgb.some((v, axis) => Math.abs(v - before[offset + axis]) > 3)) changed++;
          if (Math.max(...rgb) - Math.min(...rgb) > 3) colored++;
          colors.add(rgb.join(","));
        }
        surfaces.push({ kind, changed, colored, samples, colors: colors.size });
      }
      rows.push({ roomIndex: room.index, basement: bed.basement, surfaces });
      node.geometry = original;
    }
  } finally {
    for (const entry of savedBeds) { entry.node.geometry = entry.geometry; entry.node.visible = entry.visible; }
    for (const entry of savedCrew) entry.node.visible = entry.visible;
    B.camera.position = savedPosition; B.camera.target = savedTarget; B.renderer.render(scene.root, B.camera, B.renderOpts);
  }
  return { backend: B.renderer.kind, rows };
};

// Every room starts at its existing approach. Entrance, both accessible bed
// edges, window and exit are reached using real held keys and scene updates.
export const roomMattressMovementProbe = ({ mode = "trailing", dt = 1 / 60 } = {}) => {
  const B = window.__ooga, scene = window.BL.scenes.hub, cave = [...B.cavemen.values()].find((c) => c.state === "working"), held = new Set(), rows = [], failures = [];
  let time = B.renderOpts.matrix.time, checks = 0, previous = null;
  const keys = (next) => {
    for (const key of held) if (!next.includes(key)) { window.dispatchEvent(new KeyboardEvent("keyup", { key })); held.delete(key); }
    for (const key of next) if (!held.has(key)) { window.dispatchEvent(new KeyboardEvent("keydown", { key })); held.add(key); }
  };
  const step = (check = true) => {
    scene.update(dt, time += dt);
    if (!check) return;
    const p = cave.root.position, feet = p.y - cave.baseY, eye = B.camera.position;
    checks++;
    const physicalEye = B.pilot.closeMix > 0 && !B.pilot.preserveExitAngle && !B.cameraCave.transitioning;
    const body = B.island.clearAt(p.x, feet + 1e-5, p.z, 0.295, cave.bodyHeight - 1e-5), camera = !physicalEye || B.island.clearAt(eye.x, eye.y - 0.09, eye.z, 0.09, 0.18);
    const swept = !previous || B.island.voxelSegmentClearAt(previous.x, previous.y + 1e-5, previous.z, p.x, feet + 1e-5, p.z, 0.295, cave.bodyHeight - 1e-5);
    if ((!body || !camera || !swept || B.pilot.mode !== mode || B.pilot.player !== cave || B.scene !== "hub") && failures.length < 8) failures.push({ kind: "movement", body, camera, swept, x: p.x, y: feet, z: p.z });
    previous = { x: p.x, y: feet, z: p.z };
  };
  const seek = (destination) => {
    const tolerance = Math.max(0.13, dt * 8), o = B.pilot.orbit;
    let frame = 0;
    for (; frame < Math.ceil(5 / dt); frame++) {
      const p = cave.root.position, dx = destination.x - p.x, dz = destination.z - p.z;
      if (Math.hypot(dx, dz) < tolerance) break;
      const right = dx * Math.cos(o.yaw) - dz * Math.sin(o.yaw), forward = -dx * Math.sin(o.yaw) - dz * Math.cos(o.yaw), next = [];
      if (Math.abs(right) > Math.max(tolerance * 0.4, Math.abs(forward) * Math.tan(Math.PI / 8))) next.push(right > 0 ? "d" : "a");
      if (Math.abs(forward) > Math.max(tolerance * 0.4, Math.abs(right) * Math.tan(Math.PI / 8))) next.push(forward > 0 ? "w" : "s");
      B.pilot.hooks.onOrbit(0, 0); keys(next); step();
    }
    keys([]);
    return frame < Math.ceil(5 / dt);
  };
  B.pilot.possess(cave); if (mode === "first-person") B.pilot.enterClose();
  try {
    for (const bed of B.headquarters.mattresses) {
      const room = bed.room, c = Math.cos(room.angle), s = Math.sin(room.angle), local = (across, along) => ({ x: room.x + c * across + s * along, y: room.floor, z: room.z + s * across - c * along });
      const inset = window.BL.headquartersModels.MATTRESS.wallInset, across = -(room.width / 2 - inset - 0.725), along = room.depth / 2 - inset - 1.225;
      B.pilot.enterClose();
      B.pilot.navigate({ position: { x: room.approach.x, y: room.floor, z: room.approach.z }, yaw: -room.angle, pitch: 0, dist: 3.5 });
      for (let n = 0; n < Math.ceil(0.5 / dt); n++) step(false);
      if (mode === "trailing") {
        document.getElementById("scene").dispatchEvent(new WheelEvent("wheel", { deltaY: 60, cancelable: true }));
        B.pilot.hooks.onZoom(4 / B.pilot.orbit.tDist);
        for (let n = 0; n < Math.ceil(1 / dt); n++) step(false);
      }
      previous = null;
      const points = [room.entrance, local(0, 0), local(across, along - 1.225 - 0.5), local(across + 0.725 + 0.55, along - 1.225 - 0.5), local(across + 0.725 + 0.55, along), local(0, 0), local(0, room.depth / 2 - 0.7), local(0, 0), room.entrance, room.approach];
      let reached = 0;
      for (const destination of points) if (seek(destination)) reached++; else break;
      rows.push({ roomIndex: room.index, basement: bed.basement, reached, points: points.length, claimed: room.resident != null, feet: cave.root.position.y - cave.baseY, floor: room.floor });
    }
    return { mode, dt, rows, checks, failures };
  } finally { keys([]); }
};

export const roomSleepProbe = ({ dt = 1 / 20 } = {}) => {
  const B = window.__ooga, BL = window.BL, scene = BL.scenes.hub, entries = [...B.cavemen.values()], beds = B.headquarters.mattresses, failures = [];
  const randy = B.cavemen.get("RandyMcMillan"), initial = { state: randy.state, mode: randy.bedTravel.mode, visible: randy.root.visible, claimed: beds.includes(randy.bedroll) };
  const before = entries.map((c) => ({ x: c.root.position.x, y: c.root.position.y, z: c.root.position.z }));
  for (const c of entries) c.override = "sleeping";
  B.refreshStates(true);
  const startMotion = Math.max(...entries.map((c, i) => Math.hypot(c.root.position.x - before[i].x, c.root.position.y - before[i].y, c.root.position.z - before[i].z)));
  const reserved = new Set(entries.map((c) => c.bedroll)), claims = entries.every((c) => beds.includes(c.bedroll) && c.bedroll.sleeper === c);
  let time = B.renderOpts.matrix.time, checks = 0, maxWalkStep = 0, frame = 0;
  const previous = new Map(), returnedAt = new Map();
  const fail = (kind, detail) => { if (failures.length < 12) failures.push({ kind, ...detail }); };
  const step = () => {
    scene.update(dt, time += dt);
    for (const c of entries) {
      const p = c.root.position, y = p.y - c.baseY, old = previous.get(c);
      if (c.bedTravel.mode === "walk") {
        checks++;
        // Analytic ramps intentionally support feet at their center height;
        // their uphill half intersects a flat foot cylinder. Check actual foot
        // contact separately, and the full torso/head volume above that slope.
        if (!B.island.clearAt(p.x, y + 1e-5, p.z, 0, 0.01) || !B.island.clearAt(p.x, y + 0.3, p.z, 0.295, c.bodyHeight - 0.3)) fail("walking body", { name: c.traits.name, x: p.x, y, z: p.z });
        if (old?.mode === "walk") {
          maxWalkStep = Math.max(maxWalkStep, Math.hypot(p.x - old.x, p.z - old.z));
          if (!B.island.voxelSegmentClearAt(old.x, old.y + 0.3, old.z, p.x, y + 0.3, p.z, 0.295, c.bodyHeight - 0.3)) fail("walking sweep", { name: c.traits.name, old, x: p.x, y, z: p.z });
        }
      }
      if (old?.mode === "walk" && !c.bedTravel.mode && c.state === "working" && !returnedAt.has(c)) returnedAt.set(c, { name: c.traits.name, mode: c.bedTravel.mode, state: c.state, y, distance: Math.hypot(p.x - c.slot.x, p.z - c.slot.z), claimed: !!c.bedroll });
      previous.set(c, { x: p.x, y, z: p.z, mode: c.bedTravel.mode });
    }
  };
  for (; frame < Math.ceil(180 / dt) && entries.some((c) => c.bedTravel.mode !== "rest"); frame++) step();
  BL.scene.updateWorld(scene.root);
  const poses = [];
  for (const c of entries) {
    const bed = c.bedroll, inverse = BL.math.mat4.create();
    BL.math.mat4.invert(inverse, bed.node.world);
    const point = (node, offset) => {
      const g = node.geometry.verts, m = node.world, x = g[offset], y = g[offset + 1], z = g[offset + 2];
      const wx = m[0] * x + m[4] * y + m[8] * z + m[12], wy = m[1] * x + m[5] * y + m[9] * z + m[13], wz = m[2] * x + m[6] * y + m[10] * z + m[14];
      return [inverse[0] * wx + inverse[4] * wy + inverse[8] * wz + inverse[12], inverse[1] * wx + inverse[5] * wy + inverse[9] * wz + inverse[13], inverse[2] * wx + inverse[6] * wy + inverse[10] * wz + inverse[14]];
    };
    let headBottom = Infinity, headTop = -Infinity, bodySamples = 0, bodyFloor = Infinity, headX = 0, headZ = 0, headSamples = 0, bodyInside = true, headClear = true, pillowContact = 0, pillowBottom = Infinity;
    const outside = [];
    const head = (node) => {
      if (!node.visible) return;
      if (node.geometry) for (let i = 0; i < node.geometry.verts.length; i += 3) {
        const p = point(node, i); headBottom = Math.min(headBottom, p[1]); headTop = Math.max(headTop, p[1]); headX += p[0]; headZ += p[2]; headSamples++;
        const m = bed.node.world, x = m[0] * p[0] + m[4] * p[1] + m[8] * p[2] + m[12], y = m[1] * p[0] + m[5] * p[1] + m[9] * p[2] + m[13], z = m[2] * p[0] + m[6] * p[1] + m[10] * p[2] + m[14];
        if (B.island.solidAt(x, y, z)) headClear = false;
        if (Math.abs(p[0]) > bed.width / 2 + 1e-5 || Math.abs(p[2]) > bed.depth / 2 + 1e-5) { if (outside.length < 8) outside.push({ part: "head", p }); }
      }
      if (node.geometry) for (const face of node.geometry.faces) {
        let points = face.i.map((i) => point(node, i * 3));
        // A tilted cheek contacts the pillow over a small compressed patch,
        // not a perfectly horizontal face. Clip actual mesh faces against the
        // pillow top and footprint, then measure their projected contact area.
        for (const [axis, bound, sign] of [[1, bed.sleep.pillowTop, 1], [0, 0.45, 1], [0, -0.45, -1], [2, bed.sleep.pillowZ + 0.25, 1], [2, bed.sleep.pillowZ - 0.25, -1]]) {
          const clipped = [];
          for (let i = 0; i < points.length; i++) {
            const a = points[i], b = points[(i + 1) % points.length], insideA = (a[axis] - bound) * sign <= 0, insideB = (b[axis] - bound) * sign <= 0;
            if (insideA) clipped.push(a);
            if (insideA !== insideB) { const k = (bound - a[axis]) / (b[axis] - a[axis]); clipped.push(a.map((v, j) => v + (b[j] - v) * k)); }
          }
          points = clipped;
        }
        let area = 0;
        for (const p of points) pillowBottom = Math.min(pillowBottom, p[1]);
        for (let i = 0; i < points.length; i++) { const a = points[i], b = points[(i + 1) % points.length]; area += a[0] * b[2] - b[0] * a[2]; }
        pillowContact += Math.abs(area) / 2;
      }
      for (const child of node.children) head(child);
    };
    head(c.parts.head);
    for (const name of ["torso", "armL", "armR", "legL", "legR"]) {
      const node = c.parts[name];
      if (!node.geometry) continue;
      for (let i = 0; i < node.geometry.verts.length; i += 3) {
        const p = point(node, i); bodySamples++; bodyFloor = Math.min(bodyFloor, p[1]);
        if (Math.abs(p[0]) > bed.width / 2 + 1e-5 || Math.abs(p[2]) > bed.depth / 2 + 1e-5) { bodyInside = false; if (outside.length < 8) outside.push({ part: name, p }); }
      }
    }
    poses.push({ name: c.traits.name, room: bed.roomIndex, basement: bed.basement, mode: c.bedTravel.mode, blocked: c.bedTravel.blocked, closed: c.parts.head.geometry === c.headClosed, pose: c.bedTravel.pose, quaternionLength: c.root.quaternion ? Math.hypot(...c.root.quaternion) : 0, headOffset: [c.parts.head.position.x - c.sleepParts.headX, c.parts.head.position.y - c.sleepParts.headY, c.parts.head.position.z - c.sleepParts.headZ], reserved: bed.sleeper === c, flatFabric: bed.node.geometry === BL.headquartersModels.mattress(bed.room), headBottom, headTop, pillowTop: bed.sleep.pillowTop, pillowZ: bed.sleep.pillowZ, headX: headX / headSamples, headZ: headZ / headSamples, bodyFloor, surface: bed.sleep.surface, bodySamples, bodyInside, headClear, pillowContact, pillowBottom, outside });
  }
  const restPosition = entries.map((c) => ({ x: c.root.position.x, z: c.root.position.z }));
  for (const c of entries) c.override = "working";
  B.refreshStates(true);
  const wake = { movement: Math.max(...entries.map((c, i) => Math.hypot(c.root.position.x - restPosition[i].x, c.root.position.z - restPosition[i].z))), released: beds.every((bed) => !bed.sleeper && bed.node.geometry === BL.headquartersModels.mattress(bed.room)), returning: entries.every((c) => c.state === "working" && c.bedTravel.mode === "walk" && !c.bedroll) };
  previous.clear();
  for (let n = 0; n < Math.ceil(180 / dt) && entries.some((c) => c.bedTravel.mode); n++) step();
  const returned = entries.map((c) => returnedAt.get(c) || { name: c.traits.name, mode: c.bedTravel.mode, state: c.state, y: c.root.position.y - c.baseY, distance: Math.hypot(c.root.position.x - c.slot.x, c.root.position.z - c.slot.z), claimed: !!c.bedroll });
  return { initial, startMotion, claims, reserved: reserved.size, sleepSeconds: frame * dt, poses, wake, returned, checks, maxWalkStep, dt, failures };
};

export const roomManualSleepProbe = ({ mode = "trailing", dt = 1 / 60, basement = false } = {}) => {
  const B = window.__ooga, BL = window.BL, scene = BL.scenes.hub, cave = [...B.cavemen.values()].find((c) => c.state === "working"), bed = B.headquarters.mattresses.find((b) => b.basement === basement && !b.sleeper), held = new Set(), failures = [], poses = [];
  let time = B.renderOpts.matrix.time, checks = 0, minBodyAbovePad = Infinity, maxEyeStep = 0, previousEye = null, previousArms = null, armRollSamples = 0, maxArmRotationStep = 0;
  const key = (value, down) => {
    if (held.has(value) === down) return;
    window.dispatchEvent(new KeyboardEvent(down ? "keydown" : "keyup", { key: value }));
    if (down) held.add(value); else held.delete(value);
  };
  const local = () => { const p = cave.root.position, dx = p.x - bed.x, dz = p.z - bed.z; return { x: dx * bed.cr - dz * bed.sr, z: dx * bed.sr + dz * bed.cr, y: p.y - cave.baseY - bed.y }; };
  const state = () => ({ ...local(), lift: cave.viewLift, sleeping: B.crew.sleeping, manual: cave.bedTravel.manual, state: cave.state, mode: cave.bedTravel.mode, pose: cave.bedTravel.pose, hop: cave.hop, velocity: cave.hopV, act: document.getElementById("act").textContent, reserved: bed.sleeper === cave, selected: B.pilot.player === cave, view: B.pilot.mode });
  const step = (inspect = true) => {
    scene.update(dt, time += dt);
    if (!inspect) return;
    checks++;
    const eye = B.camera.position, physicalEye = B.pilot.closeMix > 0 && !B.pilot.preserveExitAngle && !B.cameraCave.transitioning;
    if (previousEye) {
      maxEyeStep = Math.max(maxEyeStep, Math.hypot(eye.x - previousEye.x, eye.y - previousEye.y, eye.z - previousEye.z));
      if (physicalEye && !B.island.voxelSegmentClearAt(previousEye.x, previousEye.y - 0.09, previousEye.z, eye.x, eye.y - 0.09, eye.z, 0.09, 0.18) && failures.length < 8) failures.push({ kind: "eye sweep", before: previousEye, eye: { ...eye }, ...state() });
    }
    previousEye = { ...eye };
    if (!Object.values(eye).every(Number.isFinite) || physicalEye && !B.island.clearAt(eye.x, eye.y - 0.09, eye.z, 0.09, 0.18) || B.pilot.player !== cave || B.pilot.mode !== mode || B.scene !== "hub") { if (failures.length < 8) failures.push({ kind: "view", eye, ...state() }); }
    if (B.crew.sleeping && cave.bedTravel.mode === "rest") {
      const arms = [cave.parts.armL.rotation.z, cave.parts.armR.rotation.z];
      if (previousArms) {
        maxArmRotationStep = Math.max(maxArmRotationStep, ...arms.map((angle, i) => Math.abs(angle - previousArms[i])));
        if (cave.bedTravel.roll < 1) armRollSamples++;
      }
      previousArms = arms;
      BL.scene.updateWorld(scene.root);
      for (const part of [cave.parts.torso, cave.parts.armL, cave.parts.armR, cave.parts.legL, cave.parts.legR]) {
        if (!part.geometry) continue;
        const g = part.geometry.verts, m = part.world;
        for (let i = 0; i < g.length; i += 3) minBodyAbovePad = Math.min(minBodyAbovePad, m[1] * g[i] + m[5] * g[i + 1] + m[9] * g[i + 2] + m[13] - bed.y - bed.sleep.surface);
      }
    } else previousArms = null;
  };
  const tick = (seconds) => { for (let n = 0; n < Math.ceil(seconds / dt); n++) step(); };
  const stage = (position) => {
    B.pilot.enterClose();
    B.pilot.navigate({ position, yaw: bed.node.rotation.y, pitch: 0, dist: 3.5 });
    for (let n = 0; n < Math.ceil(0.7 / dt); n++) step(false);
    if (mode === "trailing") {
      document.getElementById("scene").dispatchEvent(new WheelEvent("wheel", { deltaY: 60, cancelable: true }));
      B.pilot.hooks.onZoom(4 / B.pilot.orbit.tDist);
      for (let n = 0; n < Math.ceil(1 / dt); n++) step(false);
    }
    previousEye = null;
  };
  B.pilot.possess(cave); stage(bed.walkAt);
  const off = state();
  try {
    B.pilot.hooks.onOrbit(0, 0); key("a", true);
    for (let n = 0; n < Math.ceil(2 / dt) && document.getElementById("act").textContent !== "SLEEP"; n++) step();
    key("a", false);
    const on = state();
    key(" ", true); tick(1.2);
    window.dispatchEvent(new KeyboardEvent("keydown", { key: " ", repeat: true })); tick(0.2);
    const sleepingHeld = state(); key(" ", false);
    for (const [input, expected] of [["w", "stomach"], ["d", "left"], ["s", "back"], ["a", "right"]]) {
      key(input, true); tick(0.75); key(input, false); tick(0.1);
      const eye = B.camera.position, target = B.camera.target, q = cave.root.quaternion, forward = new Float64Array(3), up = new Float64Array(3), direction = [target.x - eye.x, target.y - eye.y, target.z - eye.z], length = Math.hypot(...direction), actualUp = B.camera.up;
      BL.math.quat.rotateVec(forward, q, 0, 0, 1); BL.math.quat.rotateVec(up, q, 0, 1, 0);
      BL.scene.updateWorld(scene.root);
      const lowest = (node, children = false) => {
        if (!node.visible) return Infinity;
        let bottom = Infinity;
        if (node.geometry) { const g = node.geometry.verts, m = node.world; for (let i = 0; i < g.length; i += 3) bottom = Math.min(bottom, m[1] * g[i] + m[5] * g[i + 1] + m[9] * g[i + 2] + m[13] - bed.y); }
        if (children) for (const child of node.children) bottom = Math.min(bottom, lowest(child, true));
        return bottom;
      };
      const pillowLowest = (node) => {
        if (!node.visible) return Infinity;
        let bottom = Infinity;
        if (node.geometry) {
          const g = node.geometry, m = node.world;
          for (const face of g.faces) {
            let points = face.i.map((i) => { const x = g.verts[i * 3], y = g.verts[i * 3 + 1], z = g.verts[i * 3 + 2], dx = m[0] * x + m[4] * y + m[8] * z + m[12] - bed.x, dz = m[2] * x + m[6] * y + m[10] * z + m[14] - bed.z; return [dx * bed.cr - dz * bed.sr, m[1] * x + m[5] * y + m[9] * z + m[13] - bed.y, dx * bed.sr + dz * bed.cr]; });
            for (const [axis, bound, sign] of [[0, 0.45, 1], [0, -0.45, -1], [2, bed.sleep.pillowZ + 0.25, 1], [2, bed.sleep.pillowZ - 0.25, -1]]) {
              const clipped = [];
              for (let i = 0; i < points.length; i++) { const a = points[i], b = points[(i + 1) % points.length], insideA = (a[axis] - bound) * sign <= 0, insideB = (b[axis] - bound) * sign <= 0; if (insideA) clipped.push(a); if (insideA !== insideB) { const k = (bound - a[axis]) / (b[axis] - a[axis]); clipped.push(a.map((v, j) => v + (b[j] - v) * k)); } }
              points = clipped;
            }
            for (const p of points) bottom = Math.min(bottom, p[1]);
          }
        }
        for (const child of node.children) bottom = Math.min(bottom, pillowLowest(child));
        return bottom;
      };
      poses.push({ input, expected, ...state(), quaternion: Array.from(q), roll: cave.bedTravel.roll, flatFabric: bed.node.geometry === BL.headquartersModels.mattress(bed.room), headBottom: lowest(cave.parts.head, true), pillowBottom: pillowLowest(cave.parts.head), headOffset: [cave.parts.head.position.x - cave.sleepParts.headX, cave.parts.head.position.y - cave.sleepParts.headY, cave.parts.head.position.z - cave.sleepParts.headZ], armOffset: [cave.parts.armL.position.x - cave.sleepParts.armLX, cave.parts.armR.position.x - cave.sleepParts.armRX], bodyBottom: Math.min(...[cave.parts.torso, cave.parts.armL, cave.parts.armR, cave.parts.legL, cave.parts.legR].map((node) => lowest(node))), feet: [lowest(cave.parts.legL), lowest(cave.parts.legR)], limbRotations: [cave.parts.legL, cave.parts.legR, cave.parts.armL, cave.parts.armR].flatMap((node) => [node.rotation.x, node.rotation.z]), chosenDistance: B.pilot.orbit.tDist, actualDistance: B.pilot.orbit.dist, faceAcross: forward[0] * bed.cr - forward[2] * bed.sr, directionDot: direction.reduce((sum, v, i) => sum + v / length * forward[i], 0), upDot: actualUp ? actualUp.x * up[0] + actualUp.y * up[1] + actualUp.z * up[2] : null, upLength: actualUp ? Math.hypot(actualUp.x, actualUp.y, actualUp.z) : null });
    }
    const poke = (values) => {
      const random = crypto.getRandomValues, before = { ...state(), p: { ...cave.root.position }, q: Array.from(cave.root.quaternion) };
      let calls = 0;
      crypto.getRandomValues = (buffer) => { if (calls === values.length) throw new Error("Unexpected random draw in sleeping poke"); buffer[0] = values[calls++]; return buffer; };
      try { B.crew.pokeCave(cave); } finally { crypto.getRandomValues = random; }
      return { before, after: { ...state(), roll: cave.bedTravel.roll, p: { ...cave.root.position }, q: Array.from(cave.root.quaternion) }, calls };
    };
    const pokes = { quiet: poke([0, 1]), rolling: poke([0, 0, 0]) };
    tick(0.25); pokes.repeat = poke([0]); tick(0.4);
    pokes.settled = { ...state(), roll: cave.bedTravel.roll };
    const overlay = document.getElementById("overlay").getContext("2d"), fillText = overlay.fillText, eye = { ...B.camera.position }, target = { ...B.camera.target }, cameraUp = B.camera.up, words = [];
    overlay.fillText = function(text, ...args) { words.push(text); return fillText.call(this, text, ...args); };
    try {
      Object.assign(B.camera.position, { x: bed.walkAt.x, y: bed.y + 1.8, z: bed.walkAt.z }); Object.assign(B.camera.target, cave.sleepHead); B.camera.up = null;
      B.renderer.render(scene.root, B.camera, B.renderOpts); scene.overlay(0);
      pokes.sleepyText = words.includes("zzz... grr");
    } finally { overlay.fillText = fillText; Object.assign(B.camera.position, eye); Object.assign(B.camera.target, target); B.camera.up = cameraUp; }
    key(" ", true); tick(0.5);
    const awakeHeld = state(); key(" ", false);
    // Waking keeps the chosen world look, which need not face the bed's axis.
    // Follow the clear bedside waypoint using keys relative to that real view.
    for (let n = 0; n < Math.ceil(2 / dt); n++) {
      const p = cave.root.position, o = B.pilot.orbit, dx = bed.walkAt.x - p.x, dz = bed.walkAt.z - p.z;
      if (Math.hypot(dx, dz) < Math.max(0.15, dt * 8)) break;
      const right = dx * Math.cos(o.yaw) - dz * Math.sin(o.yaw), forward = -dx * Math.sin(o.yaw) - dz * Math.cos(o.yaw);
      key("d", right > Math.abs(forward) * 0.414); key("a", -right > Math.abs(forward) * 0.414);
      key("w", forward > Math.abs(right) * 0.414); key("s", -forward > Math.abs(right) * 0.414);
      B.pilot.hooks.onOrbit(0, 0); step();
    }
    for (const value of ["w", "a", "s", "d"]) key(value, false);
    tick(0.4);
    const exited = state(); key(" ", true); step(); key(" ", false); const jumped = state();
    tick(1.3);
    stage({ x: bed.x, y: bed.y + bed.sleep.surface, z: bed.z });
    tick(0.2); key(" ", true); tick(1.2); key(" ", false);
    B.pilot.release();
    const other = [...B.cavemen.values()].find((c) => c !== cave && c.state === "working");
    B.pilot.possess(other);
    stage({ x: bed.x, y: bed.y + bed.sleep.surface, z: bed.z });
    for (let n = 0; n < Math.ceil(0.3 / dt); n++) scene.update(dt, time += dt);
    const refused = !B.crew.sleepPlayer(bed), busyAct = document.getElementById("act").textContent;
    key(" ", true); scene.update(dt, time += dt); key(" ", false);
    const exclusive = { refused, act: busyAct, owner: bed.sleeper === cave, ownerAsleep: cave.state === "sleeping" && cave.bedTravel.mode === "rest", visitorAwake: other.state === "working" && !other.bedroll, visitorJumps: other.hopV > 0 };
    // A double-click's first ordinary click may legitimately start a sleepy
    // roll. The possession half must retain that in-progress bed pose.
    const beforeSelection = poke([0, 0, 0]), sleepingPose = cave.bedTravel.pose;
    B.pilot.hooks.onDoubleTap({ owner: { kind: "caveman", cave } });
    exclusive.selectedSleeping = B.pilot.player === cave && cave.state === "sleeping" && B.crew.sleeping && cave.bedroll === bed && bed.sleeper === cave && cave.bedTravel.pose === sleepingPose && beforeSelection.before.pose !== sleepingPose && cave.bedTravel.roll === 0 && beforeSelection.after.q.every((v, i) => v === cave.root.quaternion[i]);
    key(" ", true); scene.update(dt, time += dt); key(" ", false);
    exclusive.explicitWake = !B.crew.sleeping && !bed.sleeper && cave.state === "working" && !cave.bedroll;
    scene.update(dt, time += dt); key(" ", true);
    for (let n = 0; n < Math.ceil(1.2 / dt); n++) scene.update(dt, time += dt);
    key(" ", false);
    const navigation = { sleepingBefore: B.crew.sleeping };
    document.querySelector('nav[data-scene="hub"] [data-preset="pile"]').click();
    for (let n = 0; n < Math.ceil(0.4 / dt); n++) scene.update(dt, time += dt);
    Object.assign(navigation, { sleepingAfter: B.crew.sleeping, released: !bed.sleeper && !cave.bedroll, selected: B.pilot.player === cave, view: B.pilot.mode, state: cave.state, feet: cave.root.position.y - cave.baseY, camera: B.cameraCave.index, scene: B.scene });
    return { mode, dt, basement, off, on, sleepingHeld, poses, pokes, awakeHeld, exited, jumped, exclusive, navigation, checks, minBodyAbovePad, maxEyeStep, armRollSamples, maxArmRotationStep, failures, surface: bed.sleep.surface, pillowTop: bed.sleep.pillowTop };
  } finally { for (const value of held) key(value, false); }
};
