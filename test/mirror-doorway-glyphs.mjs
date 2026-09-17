// Native cave-side hints preserve projection and foreground occlusion in both
// renderers. They share the overlay's rune pixels, streams and quality ranks.
export const mirrorDoorwayGlyphProbe = async (backend) => {
  const BL = window.BL, S = BL.scene, size = 384, canvas = document.createElement("canvas");
  Object.defineProperties(canvas, { clientWidth: { value: size }, clientHeight: { value: size } });
  if (backend === "canvas2d") canvas.getContext("2d", { willReadFrequently: true });
  const renderer = (backend === "webgl2" ? BL.glRenderer : BL.canvasRenderer).createRenderer(canvas, { quality: "high" });
  const gl = backend === "webgl2" ? canvas.getContext("webgl2") : null, ctx = gl ? null : canvas.getContext("2d");
  const root = S.createNode(), group = S.createNode({ position: { x: 1, y: 0.5, z: -0.8 }, rotation: { x: 0, y: 0.37, z: 0 } });
  const panel = S.createNode({ geometry: BL.hubModels.mirrorPanel(), position: { x: 0, y: 1.5, z: 0.5 }, mirror: true, mirrorWalkThrough: true, mirrorReveal: 0 });
  const stand = S.createNode({ geometry: BL.models.box({ w: 0.1, h: 0.1, d: 0.1, color: "#ffffff" }), visible: false });
  const stone = BL.models.box({ w: 6, h: 4, d: 0.2, color: "#5e5449" }); stone.castShadow = false;
  const blocker = S.createNode({ geometry: stone, position: { x: 0, y: 1.5, z: -1 }, visible: false });
  S.addChild(root, group); S.addChild(group, panel, stand, blocker); S.updateWorld(root);
  const provider = BL.mirrorGuides.create({ mirror: { group, node: panel }, stand });
  const nodes = provider.doorwayNodes, buffers = nodes.map((node) => node.instanceData), capacities = nodes.map((node) => node.instanceData.length / 20);
  const camera = S.createCamera({ near: 0.1, far: 60 }), cr = Math.cos(group.rotation.y), sr = Math.sin(group.rotation.y);
  const world = (x, y, z) => ({ x: group.position.x + cr * x + sr * z, y: group.position.y + y, z: group.position.z - sr * x + cr * z });
  Object.assign(camera.position, world(0, 1.5, -4)); Object.assign(camera.target, world(0, 1.5, 0.5));
  const opts = { clear: [0.04, 0.04, 0.04], sky: [1, 1, 1], ground: [1, 1, 1], sun: [0, 0, 0], light: { x: 0, y: 1, z: 0 }, bloomStrength: 0 };
  const errors = [], fail = (name, detail) => errors.push({ name, ...detail });
  const capture = (enabled, time = 10, density = 1) => {
    S.updateWorld(root); provider.updateDoorway(camera, enabled, time, density); renderer.render(root, camera, opts);
    const pixels = new Uint8Array(size * size * 4);
    if (gl) gl.readPixels(0, 0, size, size, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
    else pixels.set(ctx.getImageData(0, 0, size, size).data);
    return pixels;
  };
  const equal = (a, b) => a.every((value, i) => value === b[i]);
  const delta = (a, b) => {
    let changed = 0, red = 0, green = 0, blue = 0;
    for (let n = 0; n < a.length; n += 4) {
      if (a[n] !== b[n] || a[n + 1] !== b[n + 1] || a[n + 2] !== b[n + 2]) changed++;
      red += a[n] - b[n]; green += a[n + 1] - b[n + 1]; blue += a[n + 2] - b[n + 2];
    }
    return { changed, red, green, blue };
  };
  let result;
  try {
    const started = performance.now();
    while (!renderer.render(root, camera, opts)) {
      if (renderer.failure || performance.now() - started > 8000) throw new Error(renderer.failure || "Mirror doorway renderer did not become ready");
      await new Promise(requestAnimationFrame);
    }
    const off = capture(false), on = capture(true), count = provider.state.doorwayGlyphs, visible = delta(on, off);
    const repeat = capture(true), animated = capture(true, 10.2), animation = delta(animated, on);
    if (!count || !visible.changed || !(visible.red > visible.green && visible.green > visible.blue && visible.blue > 0)) fail("missing faded ivory doorway", { count, visible });
    if (!equal(on, repeat) || !animation.changed) fail("doorway animation is unstable or missing", { stable: equal(on, repeat), animation });
    for (const node of nodes) node.geometry.matrixGlyphOpacity = 1;
    const opaque = capture(true), full = delta(opaque, off), ratio = visible.red / full.red;
    if (!(ratio > 0.1 && ratio < 0.3 && full.changed > 0)) fail("doorway opacity did not blend", { ratio, visible, full });
    for (const node of nodes) node.geometry.matrixGlyphOpacity = 0.18;

    blocker.visible = true;
    const blockedOff = capture(false), blockedOn = capture(true);
    if (!equal(blockedOff, blockedOn)) fail("doorway drew over foreground stone", delta(blockedOn, blockedOff));
    blocker.visible = false;
    capture(true, 10, 0.25); const lowCount = provider.state.doorwayGlyphs;
    if (!(lowCount > 0 && lowCount < count * 0.55)) fail("doorway quality ranks differ from surface streams", { count, lowCount });
    capture(true);
    const inverse = BL.math.mat4.create(); BL.math.mat4.invert(inverse, panel.world);
    const bounds = BL.scene.boundsOf(panel.geometry); let outside = 0, glyphFaces = 0;
    for (const node of nodes) for (let n = 0; n < node.instanceCount; n++) {
      const data = node.instanceData, at = n * 20, vertices = node.geometry.verts;
      glyphFaces += node.geometry.faces.length;
      for (let i = 0; i < vertices.length; i += 3) {
        const x = data[at] * vertices[i] + data[at + 4] * vertices[i + 1] + data[at + 12];
        const y = data[at + 1] * vertices[i] + data[at + 5] * vertices[i + 1] + data[at + 13];
        const z = data[at + 2] * vertices[i] + data[at + 6] * vertices[i + 1] + data[at + 14];
        const lx = inverse[0] * x + inverse[4] * y + inverse[8] * z + inverse[12], ly = inverse[1] * x + inverse[5] * y + inverse[9] * z + inverse[13], lz = inverse[2] * x + inverse[6] * y + inverse[10] * z + inverse[14];
        if (lx < bounds.min[0] - 1e-5 || lx > bounds.max[0] + 1e-5 || ly < bounds.min[1] - 1e-5 || ly > bounds.max[1] + 1e-5 || Math.abs(lz + 0.015) > 1e-5) outside++;
      }
    }
    if (outside) fail("glyph pixels escaped the doorway plane", { outside });
    const bufferStable = nodes.every((node, n) => node.instanceData === buffers[n] && node.instanceCount <= capacities[n] && node.geometry.castShadow === false && node.sightHidden);
    if (!bufferStable) fail("doorway buffers or scene ownership changed", {});
    const disabled = capture(false), disabledCount = provider.state.doorwayGlyphs;
    if (!equal(off, disabled) || disabledCount || nodes.some((node) => node.visible || node.instanceCount)) fail("doorway remained when actor entered", { disabledCount });
    Object.assign(camera.position, world(0, 1.5, 6)); capture(true);
    const exteriorHidden = !provider.state.doorway && nodes.every((node) => !node.visible && !node.instanceCount);
    if (!exteriorHidden) fail("doorway replaced the exterior reflection", {});
    result = { backend: renderer.kind, count, lowCount, visible, animation, ratio, outside, glyphFaces, bufferStable, exteriorHidden, capacity: provider.state.doorwayCapacity, bytes: provider.state.doorwayBytes, errors };
  } finally { provider.dispose(); renderer.dispose(); }
  result.disposed = !provider.active() && provider.doorwayNodes.length === 0 && group.children.length === 3;
  return result;
};

// Use ordinary pilot state and scene updates so activation is proved against
// the camera's actual cave volume, independently of the selected actor.
export const mirrorDoorwaySceneProbe = () => {
  const B = window.__ooga, scene = window.BL.scenes.hub, pilot = B.pilot, mirror = B.mirrorCave, m = mirror.mouth, provider = mirror.guides;
  const actor = [...B.cavemen.values()].find((cave) => cave.state === "working"), sr = Math.sin(m.ry), cr = Math.cos(m.ry), caveIndex = B.mouths.indexOf(m) + 1;
  const world = (x, y, z) => ({ x: m.x + cr * x + sr * z, y: m.floorY + y, z: m.z - sr * x + cr * z });
  const rows = [], errors = [], column = { caveIndex: 0, floor: 0, ceiling: 0 };
  let elapsed = B.renderOpts.matrix.time;
  const tick = (dt = 0) => scene.update(dt, elapsed += dt);
  const place = (z) => { pilot.navigate({ position: world(0, 0, z), yaw: m.ry, pitch: 0, dist: 8 }); tick(); };
  const aim = (eye) => {
    // With a zero elapsed step, the exposed orbit anchor stays at the requested
    // point while normal camera-volume classification and presentation run.
    const orbit = pilot.orbit, yaw = m.ry + Math.PI, distance = 12;
    orbit.yaw = orbit.tYaw = yaw; orbit.pitch = orbit.tPitch = 0; orbit.dist = orbit.tDist = distance;
    orbit.tx = eye.x - Math.sin(yaw) * distance; orbit.ty = eye.y; orbit.tz = eye.z - Math.cos(yaw) * distance;
    tick();
  };
  const sample = (name, expected, eye = null) => {
    if (eye) aim(eye); else tick();
    const p = B.camera.position, actualCavity = B.island.cavityAt(p.x, p.z, column, caveIndex, p.y) && column.caveIndex === caveIndex && p.y >= column.floor && p.y < column.ceiling && B.island.clearAt(p.x, p.y, p.z, 1e-5, 2e-5);
    const row = { name, mode: pilot.mode, selected: !!pilot.player, actorInside: B.matrixCave.inside, actualCavity, enabled: provider.state.doorway,
      glyphs: provider.state.doorwayGlyphs, inMotion: scene.inMotion, eyeError: eye ? Math.hypot(p.x - eye.x, p.y - eye.y, p.z - eye.z) : 0 };
    rows.push(row);
    if (row.enabled !== expected || expected && (!row.glyphs || !row.actualCavity || !row.inMotion || row.actorInside) || !expected && row.glyphs || row.eyeError > 1e-4) errors.push(row);
    return row;
  };
  pilot.possess(actor); place(2); B.matrixGate.set(true);
  for (let n = 0; n < 90; n++) tick(1 / 60);
  let inside = null, rock = null;
  for (const z of [-2, -3, -4]) for (const x of [0, -1, 1]) {
    const p = world(x, 1.5, z);
    if (!inside && B.island.cavityAt(p.x, p.z, column, caveIndex, p.y) && column.caveIndex === caveIndex && p.y >= column.floor && p.y < column.ceiling && B.island.clearAt(p.x, p.y, p.z, 1e-5, 2e-5)) inside = p;
  }
  for (const x of [-4, 4, -5, 5, -6, 6]) for (const z of [-2, -4]) {
    const p = world(x, 1.5, z); if (!rock && B.island.solidAt(p.x, p.y, p.z)) rock = p;
  }
  if (!inside || !rock) return { rows, errors: [{ name: "missing real mirror volume fixture", inside, rock }] };
  const outside = world(0, 1.5, 4), roof = { x: inside.x, y: B.island.surfaceAt(inside.x, inside.z) + 1, z: inside.z };
  sample("outside actor, camera inside", true, inside);
  sample("camera outside", false, outside);
  sample("camera inside stone", false, rock);
  sample("camera above cave roof", false, roof);
  sample("camera returns inside", true, inside);
  for (const z of [1.2, 0.8, 0.3, -0.5, -2]) place(z);
  const entered = sample("actor inside, camera inside", false, inside);
  if (!entered.actorInside) errors.push({ name: "actor did not enter mirror fixture" });
  sample("actor inside, camera outside", false, outside);
  for (const z of [-0.5, 0.3, 0.8, 1.2, 2]) place(z);
  sample("actor exits, camera remains inside", true, inside);
  pilot.release(); sample("no selected actor", false, inside);
  pilot.possess(actor); place(2); pilot.enterClose(); place(2);
  const firstOutside = sample("first-person actor outside", false);
  if (firstOutside.mode !== "first-person" || firstOutside.actorInside || firstOutside.actualCavity) errors.push({ name: "outside first-person eye crossed the mirror", ...firstOutside });
  for (const z of [1.2, 0.8, 0.3, -0.5, -2]) place(z);
  const firstInside = sample("first-person actor inside", false);
  if (firstInside.mode !== "first-person" || !firstInside.actorInside || !firstInside.actualCavity) errors.push({ name: "inside first-person fixture failed", ...firstInside });
  return { rows, errors, caveIndex };
};
