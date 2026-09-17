// Exercise the real mirror owner and doorway, plus pixel-level checks on its
// custom cue. Animation must stay on the authored mirror plane without
// invalidating the shared visibility cache each frame.
export const mirrorOutlineProbe = () => {
  const B = window.__ooga, BL = window.BL, scene = BL.scenes.hub, mirror = B.mirrorCave, provider = mirror.guides;
  const actor = [...B.cavemen.values()].find((c) => c.state === "working"), mouth = mirror.mouth, sr = Math.sin(mouth.ry), cr = Math.cos(mouth.ry);
  const world = (x, y, z) => ({ x: mouth.x + cr * x + sr * z, y: mouth.floorY + y, z: mouth.z - sr * x + cr * z });
  const camera = BL.scene.createCamera({ near: 0.1 }), canvas = document.createElement("canvas");
  canvas.width = 720; canvas.height = 480;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  Object.assign(camera.position, world(0, 1.5, 12)); Object.assign(camera.target, world(0, 1.5, 0.5));
  BL.scene.updateWorld(scene.root);
  const paint = (inside, time, alpha = 1, view = camera) => {
    provider.update(inside, time); ctx.clearRect(0, 0, 720, 480); provider.draw(view, ctx, alpha, 720, 480, inside ? 1 : 0);
    return ctx.getImageData(0, 0, 720, 480).data;
  };
  const a = paint(false, 10), outside = { ...provider.state }, version = provider.version;
  const b = paint(false, 10.08), animated = { ...provider.state }, sameVersion = provider.version === version;
  const repeated = paint(false, 10), deterministic = a.every((value, i) => value === repeated[i]);
  const matrix = BL.math.mat4.create(), inverse = BL.math.mat4.create();
  BL.math.mat4.lookAt(matrix, camera.position, camera.target, camera.up || { x: 0, y: 1, z: 0 }); BL.math.mat4.invert(inverse, mirror.node.world);
  const m = mirror.node.world, eye = camera.position, focal = 240 / Math.tan(camera.fov / 2);
  const numerator = m[8] * (m[12] - eye.x) + m[9] * (m[13] - eye.y) + m[10] * (m[14] - eye.z);
  let changed = 0, outsidePlane = 0, downwardMatches = 0, upwardMatches = 0;
  for (let y = 0; y < 480; y++) for (let x = 0; x < 720; x++) {
    const i = (y * 720 + x) * 4;
    if (a[i + 3] === b[i + 3]) continue;
    changed++;
    const right = (x + 0.5 - 360) / focal, up = (240 - y - 0.5) / focal;
    const dx = matrix[0] * right + matrix[1] * up - matrix[2], dy = matrix[4] * right + matrix[5] * up - matrix[6], dz = matrix[8] * right + matrix[9] * up - matrix[10];
    const t = numerator / (m[8] * dx + m[9] * dy + m[10] * dz), wx = eye.x + dx * t, wy = eye.y + dy * t, wz = eye.z + dz * t;
    const lx = inverse[0] * wx + inverse[4] * wy + inverse[8] * wz + inverse[12], ly = inverse[1] * wx + inverse[5] * wy + inverse[9] * wz + inverse[13];
    if (t <= 0 || lx < -2.52 || lx > 2.52 || ly < -1.77 || ly > 1.52) outsidePlane++;
    if (a[i + 3] > 15 && y > 8 && y < 471) for (let offset = 1; offset <= 8; offset++) {
      downwardMatches += Math.min(a[i + 3], b[i + offset * 720 * 4 + 3]);
      upwardMatches += Math.min(a[i + 3], b[i - offset * 720 * 4 + 3]);
    }
  }
  const faded = paint(false, 10, 0).every((value, i) => i % 4 !== 3 || value === 0);
  paint(true, 10); const inside = { ...provider.state };
  const insideFrame = paint(true, 11), insideLater = paint(true, 12), noInteriorRain = insideFrame.every((value, i) => value === insideLater[i]);
  const oblique = [];
  for (const [x, y, z] of [[8, 3, 4], [-8, 3, 4], [0, 1.5, 0.55], [0, 1.5, -8]]) {
    Object.assign(camera.position, world(x, y, z)); Object.assign(camera.target, world(0, 1.5, 0.5));
    paint(false, 10); oblique.push({ ...provider.state });
  }
  // Crossing the physical portal, rather than moving the camera through it,
  // selects the interior contrast mode. The usual visibility gates still win.
  B.pilot.possess(actor);
  let time = B.renderOpts.matrix.time;
  const tick = (frames = 4) => { for (let n = 0; n < frames; n++) scene.update(1 / 60, time += 1 / 60); };
  const place = (z) => { B.pilot.navigate({ position: world(0, 0, z), yaw: mouth.ry, pitch: 0.15, dist: 4 }); tick(); };
  const draw = (eye, target, frames = 20) => {
    Object.assign(B.camera.position, eye); Object.assign(B.camera.target, target);
    BL.scene.updateWorld(scene.root); B.renderer.render(scene.root, B.camera, B.renderOpts);
    const before = provider.state.draws;
    for (let n = 0; n < frames; n++) scene.overlay(1 / 60);
    return { inside: provider.state.inside, portalInside: B.matrixCave.inside, enabled: B.headquarters.sightGuides.objectsEnabled, draws: provider.state.draws - before, glyphCells: provider.state.glyphCells, selected: !!B.pilot.player };
  };
  place(2);
  const hiddenOutside = draw(world(0, 1.4, -10), world(0, 1.1, 1));
  const visible = draw(world(0, 1.4, 6), world(0, 1.1, 2), 1);
  for (const z of [1.2, 0.7, 0.4, -0.5, -1.5, -3.5]) place(z);
  const hiddenInside = draw(world(9, 1.4, -3.5), world(0, 1.1, -3.5));
  B.pilot.enterClose(); const first = draw(world(9, 1.4, -3.5), world(0, 1.1, -3.5), 1);
  const registry = B.headquarters.objectGuides.getProvider(mirror.group) === provider;
  return { backend: B.renderer.kind, outside, animated, inside, sameVersion, deterministic, changed, outsidePlane, downwardMatches, upwardMatches, faded, noInteriorRain, oblique, registry, hiddenOutside, visible, hiddenInside, first };
};

// A latched glyph button keeps the stronger treatment throughout the island,
// including custom providers. Only the effect ending restores normal rims.
export const glyphOutlineContrastProbe = () => {
  const B = window.__ooga, BL = window.BL, scene = BL.scenes.hub, H = B.headquarters;
  const actor = [...B.cavemen.values()].find((c) => c.state === "working"), rows = [], providers = [];
  B.pilot.possess(actor);
  let elapsed = B.renderOpts.matrix.time;
  const tick = (frames = 4) => { for (let n = 0; n < frames; n++) scene.update(1 / 60, elapsed += 1 / 60); };
  const sample = (name, position) => {
    B.pilot.navigate({ position, yaw: 1.2, pitch: 0.3, dist: 8 }); tick();
    BL.scene.updateWorld(scene.root); B.renderer.render(scene.root, B.camera, B.renderOpts); scene.overlay(1 / 60);
    rows.push({ name, active: B.renderOpts.matrix.active, inside: B.mirrorCave.guides.state.inside, contrast: H.cameraCover.contrast });
  };
  const ground = { x: 5, y: B.island.surfaceAt(5, 0), z: 0 };
  B.matrixGate.set(true); tick(60);
  sample("main level", ground);
  const mouth = B.mouths.find((m) => m.id !== B.mirrorCave.mouth.id), roof = mouth.inside;
  sample("hill", { x: roof.x, y: B.island.surfaceAt(roof.x, roof.z), z: roof.z });
  for (const basement of [false, true]) {
    const room = (basement ? H.basement.rooms : H.rooms)[0];
    sample(basement ? "basement" : "HQ", { x: room.x, y: room.floor, z: room.z });
  }
  const canvas = document.createElement("canvas"); canvas.width = 640; canvas.height = 360;
  const ctx = canvas.getContext("2d", { willReadFrequently: true }), camera = BL.scene.createCamera({ near: 0.1 });
  const mirror = B.mirrorCave, m = mirror.mouth, sr = Math.sin(m.ry), cr = Math.cos(m.ry);
  for (const provider of [H.pileGuides, mirror.guides]) {
    const isMirror = provider === mirror.guides;
    if (isMirror) {
      provider.update(false, 10);
      Object.assign(camera.position, { x: m.x + sr * 12, y: m.floorY + 1.5, z: m.z + cr * 12 });
      Object.assign(camera.target, { x: m.x, y: m.floorY + 1.5, z: m.z });
    } else {
      provider.active(); Object.assign(camera.position, { x: 0, y: 5, z: 12 }); Object.assign(camera.target, { x: 0, y: 1, z: 0 });
    }
    let background = null;
    const paint = (contrast, alpha = 1) => {
      ctx.clearRect(0, 0, 640, 360); ctx.fillStyle = "#183721"; ctx.fillRect(0, 0, 640, 360);
      ctx.fillStyle = "#63ef7f";
      for (let y = 0; y < 360; y += 8) for (let x = 0; x < 640; x += 8) ctx.fillRect(x, y, 4, 5);
      if (!background) background = ctx.getImageData(0, 0, 640, 360).data;
      provider.draw(camera, ctx, alpha, 640, 360, contrast);
      return ctx.getImageData(0, 0, 640, 360).data;
    };
    const normal = paint(0), version = provider.version, builds = isMirror ? provider.state.builds : provider.state.updates;
    const strong = paint(1), again = paint(1), restored = paint(0), faded = paint(1, 0);
    let brighter = 0, darker = 0;
    for (let i = 0; i < normal.length; i += 4) {
      const before = normal[i] + normal[i + 1] + normal[i + 2], after = strong[i] + strong[i + 1] + strong[i + 2];
      if (after > before + 12) brighter++;
      if (after < before - 12) darker++;
    }
    providers.push({ name: isMirror ? "mirror" : "pile", brighter, darker, cached: builds === (isMirror ? provider.state.builds : provider.state.updates) && version === provider.version, repeat: strong.every((v, i) => v === again[i]), restored: normal.every((v, i) => v === restored[i]), faded: faded.every((v, i) => v === background[i]) });
  }
  B.matrixGate.set(false); tick(60); sample("glyphs ended", ground);
  return { backend: B.renderer.kind, rows, providers };
};

export const glyphInteriorProbe = () => {
  const BL = window.BL, canvas = document.createElement("canvas"); canvas.width = 640; canvas.height = 360;
  Object.defineProperties(canvas, { clientWidth: { value: 640 }, clientHeight: { value: 360 } });
  const ctx = canvas.getContext("2d", { willReadFrequently: true }), cover = BL.cameraCover.create(canvas), camera = BL.scene.createCamera({ near: 0.1 });
  Object.assign(camera.position, { x: 1.3, y: 0, z: -8 }); Object.assign(camera.target, { x: 1.3, y: 0, z: 0 });
  const material = [100, 88, 75], stone = () => material, solid = () => true, partial = (x, y) => y < 0;
  const paint = (contrast, dt = 0, occupancy = solid) => {
    ctx.clearRect(0, 0, 640, 360); cover.draw(camera, null, true, false, occupancy, stone, null, dt, contrast);
    return ctx.getImageData(0, 0, 640, 360).data;
  };
  const normal = paint(0), before = cover.state.textureUpdates, glyph = paint(1), entered = { ...cover.state };
  const repeated = paint(1), cached = cover.state.textureUpdates === entered.textureUpdates;
  let green = 0, nearBlack = 0, opaque = 0, maximum = 0;
  for (let i = 0; i < glyph.length; i += 4) {
    if (glyph[i + 1] > glyph[i] + 8 && glyph[i + 1] > glyph[i + 2] + 8) green++;
    if (glyph[i] < 15 && glyph[i + 1] < 15 && glyph[i + 2] < 15) nearBlack++;
    if (glyph[i + 3] === 255) opaque++;
    maximum = Math.max(maximum, glyph[i], glyph[i + 1], glyph[i + 2]);
  }
  const start = cover.state.textureUpdates;
  for (let n = 0; n < 60; n++) paint(1, 1 / 60);
  const moved = paint(1), animationUpdates = cover.state.textureUpdates - start;
  const cut = paint(1, 0, partial), crossing = { ...cover.state };
  let clearTop = 0, solidBottom = 0;
  for (let y = 0; y < 360; y++) for (let x = 0; x < 640; x++) {
    const alpha = cut[(y * 640 + x) * 4 + 3];
    if (y < 178 && alpha === 0) clearTop++;
    if (y > 181 && alpha === 255) solidBottom++;
  }
  const restored = paint(0), ended = { ...cover.state };
  cover.dispose();
  return { before, entered, cached, repeated: glyph.every((v, i) => v === repeated[i]), green, nearBlack, opaque, maximum, total: glyph.length / 4, animationUpdates, animated: moved.some((v, i) => v !== glyph[i]), crossing, clearTop, solidBottom, restored: normal.every((v, i) => v === restored[i]), ended };
};

export const mirrorOpeningVisibilityProbe = () => {
  const B = window.__ooga, BL = window.BL, S = BL.scene, mirror = B.mirrorCave, m = mirror.mouth, H = B.headquarters;
  const actor = [...B.cavemen.values()].find((c) => c.state === "working"), cr = Math.cos(m.ry), sr = Math.sin(m.ry);
  const world = (x, y, z) => ({ x: m.x + cr * x + sr * z, y: m.floorY + y, z: m.z - sr * x + cr * z });
  const scene = BL.scenes.hub; let elapsed = B.renderOpts.matrix.time;
  B.pilot.possess(actor);
  for (const z of [2, 1.2, 0.7, 0.4, -0.5, -1.5, -3.5]) {
    B.pilot.navigate({ position: world(0, 0, z), yaw: m.ry, pitch: 0.15, dist: 4 });
    for (let i = 0; i < 4; i++) scene.update(1 / 60, elapsed += 1 / 60);
  }
  for (let i = 0; i < 90; i++) scene.update(1 / 60, elapsed += 1 / 60);
  const views = [];
  for (const [x, y, z] of [[0, 1.3, 5], [1, 1.3, 6], [-1, 1.8, 8], [9, 1.3, -3.5], [0, 1.3, 5]]) {
    Object.assign(B.camera.position, world(x, y, z)); Object.assign(B.camera.target, world(0, 1.1, -3.5));
    S.updateWorld(scene.root); B.renderer.render(scene.root, B.camera, B.renderOpts); scene.overlay(1 / 60);
    views.push({ x, y, z, reveal: mirror.node.mirrorReveal, inside: B.matrixCave.inside, enabled: H.sightGuides.objectsEnabled, outlined: H.cameraCover.outlined, lines: H.cameraCover.guideLines, wallFaces: H.cameraCover.structureFaces, providers: H.sightGuides.providerCount });
  }
  // Fixed actor and camera: only the rendered mirror cut changes. Exercise
  // both direct rays and whole-body occlusion certificates through it.
  const root = S.createNode(), panel = S.createNode({ geometry: BL.hubModels.mirrorPanel(), position: { x: 0, y: 1.5, z: 0 }, mirror: true, mirrorReveal: 0 });
  const body = S.createNode({ geometry: BL.models.box({ w: 0.3, h: 0.4, d: 0.3, color: "#fff" }), position: { x: 0, y: 0.55, z: -2 } });
  S.addChild(root, panel); S.addChild(root, body); S.updateWorld(root);
  const testActor = { root: body }, objects = BL.objectGuides.create({ roots: root.children, crew: { cavemen: new Map([["test", testActor]]) } });
  const camera = S.createCamera({ near: 0.1 }); Object.assign(camera.position, { x: 0, y: 0.55, z: 4 }); Object.assign(camera.target, body.position);
  const clear = () => true, steps = [];
  try {
    for (const reveal of [0, 0.1, 0.5, 1, 0.5, 0.1, 0]) {
      panel.mirrorReveal = reveal; panel.mirrorPortal = reveal === 1;
      const p = body.position; objects.collect(testActor, p.x, p.y, p.z, camera, 1.5);
      steps.push({ reveal, version: objects.result.occlusionVersion, actorVisible: objects.actorVisible(testActor, clear), lowClear: objects.cameraClear(0, 0.55, 3, 0, 0.55, -1, testActor), highClear: objects.cameraClear(0, 2.5, 3, 0, 2.5, -1, testActor) });
    }
    return { backend: B.renderer.kind, views, steps };
  } finally { objects.dispose(); }
};
