// Inspect the actual scene overlay. A second, independent projection of the
// visible actor faces bounds the outline and excludes the filled body interior.
export const cameraCoverProbe = () => {
  const B = window.__ooga, BL = window.BL, scene = BL.scenes.hub, island = B.island;
  const cave = [...B.cavemen.values()].find((c) => c.state === "working"), room = B.headquarters.rooms[0], rows = [];
  const overlay = document.getElementById("overlay"), copy = document.createElement("canvas"), reference = document.createElement("canvas");
  copy.width = reference.width = overlay.width; copy.height = reference.height = overlay.height;
  const ctx = copy.getContext("2d", { willReadFrequently: true }), ref = reference.getContext("2d", { willReadFrequently: true });
  const actorRay = (ax, ay, az, bx, by, bz) => island.sightClearAt(ax, ay, az, bx, by, bz);
  actorRay.boxClear = island.sightBoxClearAt; actorRay.boxSolid = island.sightBoxSolidAt;
  let time = B.renderOpts.matrix.time;
  const tick = (seconds) => { for (let n = 0; n < Math.ceil(seconds * 60); n++) scene.update(1 / 60, time += 1 / 60); };
  const draw = (frames = 18) => {
    BL.scene.updateWorld(scene.root); B.renderer.render(scene.root, B.camera, B.renderOpts);
    for (let n = 0; n < Math.max(1, frames); n++) scene.overlay(frames ? 1 / 60 : 0);
    ctx.clearRect(0, 0, copy.width, copy.height); ctx.drawImage(overlay, 0, 0);
    return ctx.getImageData(0, 0, copy.width, copy.height).data;
  };
  const alpha = (pixels) => { let opaque = 0, clear = 0; for (let i = 3; i < pixels.length; i += 4) { if (pixels[i] === 255) opaque++; if (pixels[i] === 0) clear++; } return { opaque, clear, total: pixels.length / 4 }; };
  const objectLayer = () => ({ objectsEnabled: B.headquarters.sightGuides.objectsEnabled, cueCount: B.headquarters.sightGuides.count, structureCount: B.headquarters.sightGuides.structureCount, objectCount: B.headquarters.sightGuides.objectCount, providerCount: B.headquarters.sightGuides.providerCount, guideLines: B.headquarters.cameraCover.guideLines, outlined: B.headquarters.cameraCover.outlined, faces: B.headquarters.cameraCover.faces, actorVisible: B.headquarters.objectGuides.actorVisible(cave, actorRay), actorFullyVisible: B.headquarters.objectGuides.actorFullyVisible(cave, actorRay) });
  const choose = (solid) => {
    for (const dist of [4, 5, 6, 7, 8]) for (let n = 0; n < 72; n++) {
      const yaw = n * Math.PI / 36, pitch = 0.15, x = room.x + Math.sin(yaw) * Math.cos(pitch) * dist, y = room.floor + 0.9 + Math.sin(pitch) * dist, z = room.z + Math.cos(yaw) * Math.cos(pitch) * dist;
      if (solid ? island.solidAt(x, y, z) : island.clearAt(x, y - 0.3, z, 0.3, 0.6) && island.voxelSegmentClearAt(room.x, room.floor + 1.1, room.z, x, y, z, 0.01, 0.02)) return { yaw, pitch, dist };
    }
    throw new Error(`No ${solid ? "solid" : "clear"} real room camera fixture`);
  };
  B.pilot.possess(cave);
  const place = (view) => { B.pilot.navigate({ position: { x: room.x, y: room.floor, z: room.z }, ...view }); tick(1); };
  const solid = choose(true); place(solid);
  // Opacity checks isolate the rock/guide layer after the normal possession
  // greeting finishes; advancing a fade also advances those speech bubbles.
  for (let n = 0; n < 180 && B.stats().bubbles; n++) scene.overlay(1 / 60);
  if (B.stats().bubbles) throw new Error("Possession overlay did not settle before the cover snapshot");
  const covered = draw(), coveredState = { ...B.headquarters.cameraCover, ...objectLayer() }, eye = { ...B.camera.position };
  const matrix = BL.math.mat4.create(); BL.math.mat4.lookAt(matrix, B.camera.position, B.camera.target, B.camera.up || { x: 0, y: 1, z: 0 });
  const focal = reference.height / 2 / Math.tan(B.camera.fov / 2), project = (x, y, z) => {
    const vx = matrix[0] * x + matrix[4] * y + matrix[8] * z + matrix[12], vy = matrix[1] * x + matrix[5] * y + matrix[9] * z + matrix[13], vz = matrix[2] * x + matrix[6] * y + matrix[10] * z + matrix[14];
    if (vz >= -B.camera.near) throw new Error("Reference silhouette crosses its near plane");
    return { x: reference.width / 2 - vx * focal / vz, y: reference.height / 2 + vy * focal / vz };
  };
  ref.fillStyle = "#fff";
  BL.scene.traverseVisible(cave.root, (node) => {
    if (!node.geometry || node.cameraHidden) return;
    const m = node.world, v = node.geometry.verts;
    for (const face of node.geometry.faces) {
      ref.beginPath();
      for (let n = 0; n < face.i.length; n++) {
        const i = face.i[n] * 3, p = project(m[0] * v[i] + m[4] * v[i + 1] + m[8] * v[i + 2] + m[12], m[1] * v[i] + m[5] * v[i + 1] + m[9] * v[i + 2] + m[13], m[2] * v[i] + m[6] * v[i + 1] + m[10] * v[i + 2] + m[14]);
        if (n) ref.lineTo(p.x, p.y); else ref.moveTo(p.x, p.y);
      }
      ref.closePath(); ref.fill();
    }
  });
  const mask = ref.getImageData(0, 0, reference.width, reference.height).data;
  cave.root.visible = false;
  const rockOnly = draw(); cave.root.visible = true;
  let changed = 0, outside = 0, interiorChanged = 0, interior = 0, maximumDelta = 0, rockMax = 0;
  const w = copy.width, h = copy.height, band = Math.ceil(6 * w / overlay.clientWidth);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = (y * w + x) * 4;
    let different = false;
    for (let c = 0; c < 3; c++) { maximumDelta = Math.max(maximumDelta, Math.abs(covered[i + c] - rockOnly[i + c])); rockMax = Math.max(rockMax, rockOnly[i + c]); if (covered[i + c] !== rockOnly[i + c]) different = true; }
    if (!different && !mask[i + 3]) continue;
    let near = false, deep = mask[i + 3] === 255;
    for (let dy = -band; dy <= band; dy++) for (let dx = -band; dx <= band; dx++) {
      const xx = x + dx, yy = y + dy, a = xx >= 0 && xx < w && yy >= 0 && yy < h ? mask[(yy * w + xx) * 4 + 3] : 0;
      if (a) near = true; if (a !== 255) deep = false;
    }
    if (deep) interior++;
    if (different) { changed++; if (!near) outside++; if (deep) interiorChanged++; }
  }
  rows.push({ name: "inside rock", ...coveredState, ...alpha(covered), actualSolid: island.solidAt(eye.x, eye.y, eye.z), changed, outside, interiorChanged, interior, maximumDelta, rockMax });
  // This grounded window view reveals the upper body while its sill hides
  // the legs. Any exposed part must suppress every cue in the same frame.
  place(choose(false)); const partialPixels = draw(0), partialActor = { ...objectLayer(), ...alpha(partialPixels), feet: cave.root.position.y - cave.baseY, floor: room.floor, hop: cave.hop };
  place(solid); draw(0); const hiddenAgain = objectLayer();
  // From the room center, a four-metre eye sits outside a small room and its
  // window sill can hide the legs despite a clear head ray. Stand on the
  // opposite floor corner so the entire ordinary trailing view fits inside.
  const ca = Math.cos(room.angle), sa = Math.sin(room.angle);
  B.pilot.navigate({ position: { x: room.x + ca - sa, y: room.floor, z: room.z + sa + ca }, yaw: Math.atan2(-ca + sa, -sa - ca), pitch: 0.15, dist: 4 }); tick(1);
  const clear = draw(0); rows.push({ name: "clear view", ...B.headquarters.cameraCover, ...alpha(clear), ...objectLayer(), feet: cave.root.position.y - cave.baseY, floor: room.floor, hop: cave.hop, eligibleGuides: B.headquarters.sightGuides.count });
  place(solid); B.pilot.enterClose(); draw(0); const firstEntry = { ...objectLayer(), closeMix: B.pilot.closeMix, closeWanted: B.pilot.closeWanted };
  tick(1); const first = draw(); rows.push({ name: "first person", ...B.headquarters.cameraCover, ...alpha(first), ...objectLayer(), eligibleGuides: B.headquarters.sightGuides.count, mode: B.pilot.mode });
  document.getElementById("scene").dispatchEvent(new WheelEvent("wheel", { deltaY: 60, cancelable: true })); tick(1); place(solid); draw(); B.pilot.release(true); tick(0.3); const released = draw(); rows.push({ name: "released", ...B.headquarters.cameraCover, ...alpha(released), selected: !!B.pilot.player });
  B.pilot.possess(cave); place(solid); draw();
  return { rows, partialActor, hiddenAgain, firstEntry, backend: B.renderer.kind };
};

// Cross a real flat HQ floor in millimeter-scale camera increments. The cap
// should cover only near-plane rays in rock, with no whole-screen threshold.
export const cameraPartialCoverProbe = () => {
  const B = window.__ooga, BL = window.BL, scene = BL.scenes.hub, H = B.island.headquarters, island = B.island;
  const cave = [...B.cavemen.values()].find((c) => c.state === "working"), overlay = document.getElementById("overlay"), copy = document.createElement("canvas"), rows = [], failures = [];
  copy.width = overlay.width; copy.height = overlay.height;
  const ctx = copy.getContext("2d", { willReadFrequently: true }), view = BL.math.mat4.create();
  let fixture = null, time = B.renderOpts.matrix.time, comparisons = 0, partialPitch = null;
  for (let a = 0; a < 16 && !fixture; a++) for (let b = 0; b < 16 && !fixture; b++) {
    const angle = a * Math.PI / 8, yaw = b * Math.PI / 8, x = Math.sin(angle) * 6, z = Math.cos(angle) * 6, reach = Math.sqrt(16 - 0.9 ** 2), ex = x + Math.sin(yaw) * reach, ez = z + Math.cos(yaw) * reach;
    if (Math.hypot(ex, ez) > 9 || !island.clearAt(x, H.floor + 1e-5, z, 0.3, cave.bodyHeight) || Math.abs(island.supportAt(x, z, H.floor, 0.3, -120) - H.floor) > 1e-5) continue;
    let flat = true;
    for (const dx of [-0.2, 0, 0.2]) for (const dz of [-0.2, 0, 0.2]) if (!island.solidAt(ex + dx, H.floor - 0.02, ez + dz) || island.solidAt(ex + dx, H.floor + 0.02, ez + dz)) flat = false;
    if (flat) fixture = { position: { x, y: H.floor, z }, yaw, pitch: 0, dist: 4 };
  }
  if (!fixture) throw new Error("No flat rock-floor camera crossing");
  B.pilot.possess(cave); B.pilot.navigate(fixture);
  const tick = () => { for (let n = 0; n < 60; n++) scene.update(1 / 60, time += 1 / 60); };
  tick();
  const draw = () => {
    BL.scene.updateWorld(scene.root); B.renderer.render(scene.root, B.camera, B.renderOpts); scene.overlay(0);
    ctx.clearRect(0, 0, copy.width, copy.height); ctx.drawImage(overlay, 0, 0);
    return ctx.getImageData(0, 0, copy.width, copy.height).data;
  };
  for (let n = 0; n <= 32; n++) {
    const height = H.floor + 0.06 - n * 0.005, pitch = Math.asin((height - H.floor - 0.9) / 4);
    B.pilot.hooks.onOrbit(0, (pitch - B.pilot.orbit.tPitch) / 0.0035); tick();
    const pixels = draw(), state = { ...B.headquarters.cameraCover }, eye = B.camera.position;
    let opaque = 0; for (let i = 3; i < pixels.length; i += 4) if (pixels[i] === 255) opaque++;
    const fraction = opaque / (pixels.length / 4);
    rows.push({ height, fraction, ...state });
    if (state.partialRock && fraction > 0.4 && fraction < 0.6) partialPitch = pitch;
    BL.math.mat4.lookAt(view, eye, B.camera.target, B.camera.up || { x: 0, y: 1, z: 0 });
    const near = B.camera.near, scale = 2 * near * Math.tan(B.camera.fov / 2) / copy.height;
    for (let y = 0; y < 11; y++) for (let x = 0; x < 17; x++) {
      const px = Math.floor((x + 0.5) * copy.width / 17), py = Math.floor((y + 0.5) * copy.height / 11), right = (px - copy.width / 2) * scale, up = (copy.height / 2 - py) * scale;
      const wx = eye.x - view[2] * near + view[0] * right + view[1] * up, wy = eye.y - view[6] * near + view[4] * right + view[5] * up, wz = eye.z - view[10] * near + view[8] * right + view[9] * up;
      const below = island.solidAt(wx, wy - 0.002, wz), above = island.solidAt(wx, wy + 0.002, wz);
      if (below !== above) continue;
      comparisons++;
      const alpha = pixels[(py * copy.width + px) * 4 + 3];
      if ((above ? alpha !== 255 : alpha === 255) && failures.length < 8) failures.push({ n, px, py, wy, solid: above, alpha });
    }
  }
  if (partialPitch !== null) { B.pilot.hooks.onOrbit(0, (partialPitch - B.pilot.orbit.tPitch) / 0.0035); tick(); draw(); }
  return { rows, comparisons, failures, screenshotCoverage: B.headquarters.cameraCover.rockCoverage, backend: B.renderer.kind };
};

// Sweep both directions across two voxel walls and an exterior corner. The
// hidden spans cross many rendered panels, but visibility and the selected
// silhouette belong to the complete authored wall rather than any one panel.
export const wallPanOutlineProbe = () => {
  const B = window.__ooga, BL = window.BL, scene = BL.scenes.hub, H = B.headquarters, island = B.island;
  const cave = [...B.cavemen.values()].find((c) => c.state === "working"), room = H.rooms[0], camera = B.camera, rows = [], boundaries = [];
  B.pilot.possess(cave);
  B.pilot.navigate({ position: { x: room.x, y: room.floor, z: room.z }, yaw: room.angle + Math.PI, pitch: 0, dist: 4 });
  let time = B.renderOpts.matrix.time;
  for (let n = 0; n < 90; n++) scene.update(1 / 60, time += 1 / 60);
  const place = (distance, lift, step) => {
    const angle = step * Math.PI / 180;
    Object.assign(camera.position, { x: room.x + Math.sin(angle) * distance, y: room.floor + lift, z: room.z + Math.cos(angle) * distance });
    Object.assign(camera.target, { x: cave.root.position.x, y: cave.root.position.y + 0.6, z: cave.root.position.z });
    BL.scene.updateWorld(scene.root); B.renderer.render(scene.root, camera, B.renderOpts); scene.overlay(1 / 60);
    return { step, enabled: H.sightGuides.objectsEnabled, cues: H.sightGuides.count, outlined: H.cameraCover.outlined, faces: H.cameraCover.faces, lines: H.cameraCover.guideLines, structureFaces: H.cameraCover.structureFaces, structureFilled: H.cameraCover.structureFilled, activeWalls: H.rockGuides.contexts.reduce((count, context) => count + context.walls.filter((wall) => wall.phase > 0).length, 0), solidEye: island.solidAt(camera.position.x, camera.position.y, camera.position.z) };
  };
  const paths = [
    { name: "room wall", distance: 3.5, lift: 1.1, start: 55, end: 65, visible: 54 },
    { name: "opposite wall", distance: 3.5, lift: 1.1, start: 155, end: 166, visible: 167 },
    { name: "outer corner", distance: 5, lift: 0.75, start: 53, end: 62, visible: 52 }
  ];
  for (const path of paths) {
    boundaries.push({ name: path.name, ...place(path.distance, path.lift, path.visible) });
    for (let step = path.start; step <= path.end; step++) rows.push({ name: path.name, direction: 1, ...place(path.distance, path.lift, step) });
    for (let step = path.end; step >= path.start; step--) rows.push({ name: path.name, direction: -1, ...place(path.distance, path.lift, step) });
  }
  const observer = H.sightGuides.observer, structure = H.rockGuides.select(cave.root.position.x, cave.root.position.y - cave.baseY, cave.root.position.z, camera.position.x, camera.position.y, camera.position.z);
  const cameraSees = (tx, ty, tz) => {
    const vx = camera.target.x - camera.position.x, vy = camera.target.y - camera.position.y, vz = camera.target.z - camera.position.z, length = Math.hypot(vx, vy, vz);
    const dx = tx - camera.position.x, dy = ty - camera.position.y, dz = tz - camera.position.z, depth = (dx * vx + dy * vy + dz * vz) / length;
    if (depth <= camera.near) return false;
    const start = camera.near / depth;
    return island.sightClearAt(camera.position.x + dx * start, camera.position.y + dy * start, camera.position.z + dz * start, tx, ty, tz);
  };
  const apertureCuts = new Uint8Array(structure.surfaceGroupCount);
  if (structure.apertures) for (let at = 0; at < structure.surface.length; at += 9) {
    const group = structure.surfaceGroups[at / 9];
    if (!structure.surfaceAperture[group] || apertureCuts[group]) continue;
    for (let window = 0; window < structure.apertures.count; window++) if (structure.apertures.clip(window, structure.surface, at).count) { apertureCuts[group] = 1; break; }
  }
  let surfacePatches = 0, actorBlocked = 0, cameraClear = 0;
  for (let group = 0; group < structure.surfaceGroupCount; group++) if (structure.surfaceTargets[group] > 0) {
    const at = group * 3, tx = structure.surfaceSamples[at], ty = structure.surfaceSamples[at + 1], tz = structure.surfaceSamples[at + 2];
    surfacePatches++;
    if (!island.sightClearAt(observer[19], observer[20], observer[21], tx, ty, tz)) actorBlocked++;
    // A partially visible patch now stays whole, with an explicit window
    // polygon removing its visible part in the overlay raster.
    if (cameraSees(tx, ty, tz) && !apertureCuts[group]) cameraClear++;
  }
  // A camera at the character eye reveals the exposed wall faces while the
  // complete wall remains eligible, including its self-occluded jagged faces.
  const hiddenCamera = { ...camera.position };
  H.rockGuides.updateSurface(structure, observer[19], observer[20], observer[21], camera, 0.3);
  const before = new Float32Array(structure.surfacePhases);
  Object.assign(camera.position, { x: observer[19], y: observer[20], z: observer[21] });
  H.rockGuides.updateSurface(structure, observer[19], observer[20], observer[21], camera, 0);
  const revealed = [];
  for (let group = 0; group < structure.surfaceGroupCount; group++) if (before[group] > 0 && structure.surfaceTargets[group] === 0) revealed.push(group);
  let visibleTargets = 0;
  for (let group = 0; group < structure.surfaceGroupCount; group++) if (structure.surfaceTargets[group] > 0) {
    const at = group * 3, tx = structure.surfaceSamples[at], ty = structure.surfaceSamples[at + 1], tz = structure.surfaceSamples[at + 2];
    if (cameraSees(tx, ty, tz)) visibleTargets++;
  }
  const unchanged = structure.surfacePhases.every((phase, index) => Math.abs(phase - before[index]) < 1e-7);
  H.rockGuides.updateSurface(structure, observer[19], observer[20], observer[21], camera, 0.05);
  const fadingOut = revealed.some((group) => structure.surfacePhases[group] > 0 && structure.surfacePhases[group] < before[group]);
  H.rockGuides.updateSurface(structure, observer[19], observer[20], observer[21], camera, 0.25);
  const fadedOut = revealed.every((group) => structure.surfacePhases[group] === 0);
  Object.assign(camera.position, hiddenCamera);
  H.rockGuides.updateSurface(structure, observer[19], observer[20], observer[21], camera, 0);
  const hiddenTargets = structure.surfaceTargets.reduce((count, target) => count + (target > 0), 0);
  H.rockGuides.updateSurface(structure, observer[19], observer[20], observer[21], camera, 0.05);
  const fadingIn = revealed.some((group) => structure.surfacePhases[group] > 0 && structure.surfacePhases[group] < structure.surfaceTargets[group]);
  const surface = { patches: surfacePatches, actorBlocked, cameraClear, revealed: revealed.length, visibleTargets, hiddenTargets, unchanged, fadingOut, fadedOut, fadingIn };
  const source = H.rockGuides.all.lines, unique = new Set();
  for (let i = 0; i < source.length; i += 6) {
    const a = `${source[i].toFixed(5)},${source[i + 1].toFixed(5)},${source[i + 2].toFixed(5)}`, b = `${source[i + 3].toFixed(5)},${source[i + 4].toFixed(5)},${source[i + 5].toFixed(5)}`;
    unique.add(a < b ? `${a}:${b}` : `${b}:${a}`);
  }
  return { backend: B.renderer.kind, rows, boundaries, surface, wallLines: source.length / 6, uniqueLines: unique.size };
};

// The rim belongs to the full slab, even when a visible middle section is
// masked away. Its visibility boundary must never look like a stone edge.
export const wholeWallMaskProbe = () => {
  const BL = window.BL, canvas = document.createElement("canvas"); canvas.width = 640; canvas.height = 360;
  Object.defineProperties(canvas, { clientWidth: { value: 640 }, clientHeight: { value: 360 } });
  const ctx = canvas.getContext("2d", { willReadFrequently: true }), cover = BL.cameraCover.create(canvas), camera = BL.scene.createCamera({ near: 0.1 });
  camera.fov = Math.PI / 2;
  Object.assign(camera.position, { x: 0, y: 0, z: -6 }); Object.assign(camera.target, { x: 0, y: 0, z: 0 });
  const triangles = [], groups = [];
  for (let panel = 0; panel < 3; panel++) {
    const left = panel * 2 - 3, right = left + 2, top = panel === 1 ? 1.2 : 1;
    triangles.push(left, -1, 0, left, top, 0, right, top, 0, left, -1, 0, right, top, 0, right, -1, 0);
    groups.push(panel, panel);
  }
  const surface = { surface: new Float32Array(triangles), surfaceCount: 6, surfaceGroups: new Uint16Array(groups), surfaceWholePhases: new Float32Array([1, 1, 1]), surfacePhases: new Float32Array([1, 0, 1]), surfaceHidden: new Uint8Array([1, 0, 1]), surfaceWholeActive: 3, surfaceActive: 2 };
  const guides = { structures: [surface], objectsEnabled: true, count: 0, structureCount: 0, providerCount: 0, lines: new Float32Array(0) };
  const draw = () => { ctx.clearRect(0, 0, 640, 360); cover.draw(camera, null, false, false, () => false, () => null, guides); return ctx.getImageData(0, 0, 640, 360).data; };
  const pixels = draw(), alpha = (x, y) => pixels[(y * 640 + x) * 4 + 3];
  let internalMaximum = 0, visibleMaximum = 0, outerMaximum = 0;
  for (let y = 160; y <= 200; y++) {
    for (const boundary of [290, 350]) for (let x = boundary - 4; x <= boundary + 4; x++) internalMaximum = Math.max(internalMaximum, alpha(x, y));
    for (let x = 300; x <= 340; x++) visibleMaximum = Math.max(visibleMaximum, alpha(x, y));
    for (let x = 225; x <= 229; x++) outerMaximum = Math.max(outerMaximum, alpha(x, y));
  }
  const hiddenFill = alpha(260, 180), visibleFill = alpha(320, 180), filled = cover.state.structureFilled;
  guides.objectsEnabled = false;
  const disabled = draw(), cleared = disabled.every((value, i) => i % 4 !== 3 || value === 0);
  // A second, normally rendered wall in front has priority over a hidden
  // wall behind it. Rear fill and rim must not wrap the visible stone face.
  const front = { surface: new Float32Array([-3.2, -1.4, -0.1, -3.2, 1.4, -0.1, 3.2, 1.4, -0.1, -3.2, -1.4, -0.1, 3.2, 1.4, -0.1, 3.2, -1.4, -0.1]), surfaceCount: 2, surfaceGroups: new Uint16Array([0, 0]), surfaceWholePhases: new Float32Array([1]), surfacePhases: new Float32Array([0]), surfaceHidden: new Uint8Array([0]), surfaceWholeActive: 1, surfaceActive: 0 };
  surface.surfacePhases.fill(1); surface.surfaceHidden.fill(1); surface.surfaceActive = 3;
  guides.objectsEnabled = true; guides.structures = [surface, front];
  const overlap = draw(); let visibleOverlapMaximum = 0;
  for (let i = 3; i < overlap.length; i += 4) visibleOverlapMaximum = Math.max(visibleOverlapMaximum, overlap[i]);
  guides.structures.reverse(); const reversed = draw(), orderStable = overlap.every((value, i) => value === reversed[i]);
  cover.dispose();
  return { internalMaximum, visibleMaximum, outerMaximum, hiddenFill, visibleFill, filled, cleared, visibleOverlapMaximum, orderStable };
};

// Test the production texture raster at its native resolution using real rock
// material. An integer texel translation samples identical world coordinates.
export const cameraRockTextureProbe = () => {
  const B = window.__ooga, BL = window.BL, island = B.island, room = B.headquarters.rooms[0], w = document.getElementById("overlay").clientWidth, h = document.getElementById("overlay").clientHeight;
  const canvas = document.createElement("canvas"); canvas.width = canvas.height = 128;
  Object.defineProperties(canvas, { clientWidth: { value: w }, clientHeight: { value: h } });
  const ctx = canvas.getContext("2d", { willReadFrequently: true }); ctx.setTransform(128 / w, 0, 0, 128 / h, 0, 0);
  const cover = BL.cameraCover.create(canvas), camera = BL.scene.createCamera({ near: 0.1 }), view = BL.math.mat4.create(), failures = [];
  let fixture = false;
  for (let n = 0; n < 72 && !fixture; n++) {
    const a = n * Math.PI / 36;
    Object.assign(camera.position, { x: room.x + Math.sin(a) * 4, y: room.floor + 1.5, z: room.z + Math.cos(a) * 4 });
    Object.assign(camera.target, { x: room.x, y: room.floor + 1.5, z: room.z });
    if (island.solidAt(camera.position.x, camera.position.y, camera.position.z)) {
      ctx.clearRect(0, 0, w, h); cover.draw(camera, null, true, false, island.solidAt, island.rockMaterialAt);
      fixture = cover.state.insideRock;
    }
  }
  if (!fixture) throw new Error("No solid world texture plane");
  const draw = () => { ctx.clearRect(0, 0, w, h); cover.draw(camera, null, true, false, island.solidAt, island.rockMaterialAt); return ctx.getImageData(0, 0, 128, 128).data; };
  const position = { ...camera.position }, target = { ...camera.target }, base = draw(), updates = cover.state.textureUpdates;
  draw(); const stationaryUpdates = cover.state.textureUpdates - updates;
  BL.math.mat4.lookAt(view, camera.position, camera.target, { x: 0, y: 1, z: 0 });
  const sx = 2 * camera.near * Math.tan(camera.fov / 2) * w / h, sy = 2 * camera.near * Math.tan(camera.fov / 2), shift = 4;
  let materialSamples = 0;
  for (let y = 0; y < 128; y += 4) for (let x = 0; x < 128; x += 4) {
    const right = ((x + 0.5) / 128 - 0.5) * sx, up = (0.5 - (y + 0.5) / 128) * sy;
    const wx = position.x - view[2] * camera.near + view[0] * right + view[1] * up, wy = position.y - view[6] * camera.near + view[4] * right + view[5] * up, wz = position.z - view[10] * camera.near + view[8] * right + view[9] * up, material = island.rockMaterialAt(wx, wy, wz), index = (y * 128 + x) * 4;
    materialSamples++;
    if ((!material || base[index + 3] !== 255 || material.some((v, channel) => base[index + channel] < v * 0.2 - 1 || base[index + channel] > v * 0.36 + 1)) && failures.length < 8) failures.push({ kind: "actual stone color", x, y, material, pixel: Array.from(base.slice(index, index + 4)) });
  }
  const delta = sx * shift / 128;
  for (const p of [camera.position, camera.target]) { p.x += view[0] * delta; p.y += view[4] * delta; p.z += view[8] * delta; }
  const translated = draw();
  let compared = 0, worldMatches = 0, screenChanged = 0;
  for (let y = 4; y < 124; y++) for (let x = 4; x < 124 - shift; x++) {
    const i = (y * 128 + x) * 4, old = (y * 128 + x + shift) * 4;
    compared++;
    if ([0, 1, 2, 3].every((c) => Math.abs(translated[i + c] - base[old + c]) <= 1)) worldMatches++;
    if ([0, 1, 2].some((c) => translated[i + c] !== base[i + c])) screenChanged++;
  }
  Object.assign(camera.position, position); Object.assign(camera.target, target);
  const dx = target.x - position.x, dz = target.z - position.z;
  camera.target.x = position.x + dx * Math.cos(0.12) + dz * Math.sin(0.12);
  camera.target.z = position.z + dz * Math.cos(0.12) - dx * Math.sin(0.12);
  const rotated = draw(); let rotationChanged = 0;
  for (let i = 0; i < base.length; i += 4) if ([0, 1, 2].some((c) => rotated[i + c] !== base[i + c])) rotationChanged++;
  Object.assign(camera.target, target); const returned = draw();
  const revisitMatches = returned.every((value, i) => value === base[i]), textureSize = cover.state.textureSize, totalUpdates = cover.state.textureUpdates - updates;
  cover.dispose();
  return { backend: B.renderer.kind, textureSize, stationaryUpdates, totalUpdates, materialSamples, compared, worldMatches, screenChanged, rotationChanged, revisitMatches, failures };
};
