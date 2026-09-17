// Real canvas rendering and exact mesh-height checks, independent of physics.
export const bananaInteriorProbe = () => {
  const BL = window.BL, overlay = document.createElement("canvas");
  overlay.width = 480; overlay.height = 320;
  const ctx = overlay.getContext("2d", { willReadFrequently: true });
  Object.defineProperties(overlay, { clientWidth: { value: 480 }, clientHeight: { value: 320 } });
  const geometry = BL.models.bananaPileCoreGeometry(2.7, 2.88, 0.16);
  const core = BL.scene.createNode({ geometry, position: { x: 0, y: 0.36, z: 0 }, scale: { x: 4, y: 4, z: 4 } });
  const cover = BL.bananaCover.create({ overlay, pile: { core } });
  const root = BL.scene.createNode({ position: { x: 0, y: 0.36, z: 0 } });
  BL.scene.addChild(root, BL.scene.createNode({ geometry: BL.models.box({ w: 0.62, h: 1.6, d: 0.45, color: "#987654", offset: { y: 0.8 } }) }));
  BL.scene.updateWorld(root);
  const actor = { root, baseY: 0, bodyHeight: 1.6 };
  const camera = BL.scene.createCamera();
  const setView = (x, y, z, tx, ty, tz) => { Object.assign(camera.position, { x, y, z }); Object.assign(camera.target, { x: tx, y: ty, z: tz }); };
  const draw = () => {
    ctx.clearRect(0, 0, overlay.width, overlay.height);
    const ownsActor = cover.prepare(camera, actor); cover.draw(camera, actor, 1 / 60);
    const pixels = ctx.getImageData(0, 0, overlay.width, overlay.height).data;
    let filled = 0, yellow = 0, outline = 0;
    for (let i = 0; i < pixels.length; i += 4) {
      if (pixels[i + 3] === 255) { filled++; if (pixels[i] > 180 && pixels[i + 1] > 125 && pixels[i + 2] < 90) yellow++; }
      else if (pixels[i + 3] > 0) outline++;
    }
    return { ...cover.state, ownsActor, filled, yellow, outline };
  };
  let checked = 0, mismatch = 0, maximumError = 0;
  for (let n = 0; n < geometry.faces.length; n += 11) {
    const face = geometry.faces[n].i;
    for (let k = 1; k < face.length - 1; k++) {
      const a = face[0] * 3, b = face[k] * 3, c = face[k + 1] * 3, v = geometry.verts;
      const x = (v[a] + v[b] + v[c]) / 3 * 4, z = (v[a + 2] + v[b + 2] + v[c + 2]) / 3 * 4;
      const y = (v[a + 1] + v[b + 1] + v[c + 1]) / 3 * 4 + 0.36;
      const error = Math.abs(cover.heightAt(x, z) - y);
      checked++; if (error > 1e-6) mismatch++; maximumError = Math.max(maximumError, error);
    }
  }
  setView(0, 1.8, 0.3, 0, 0.6, -0.4);
  const inside = draw();
  // Isolate the body contribution from the same stationary yellow texture.
  const withBody = ctx.getImageData(0, 0, overlay.width, overlay.height).data;
  root.visible = false; draw(); root.visible = true;
  const withoutBody = ctx.getImageData(0, 0, overlay.width, overlay.height).data;
  let bodyPixels = 0;
  for (let i = 0; i < withBody.length; i += 4) if (withBody[i] !== withoutBody[i] || withBody[i + 1] !== withoutBody[i + 1] || withBody[i + 2] !== withoutBody[i + 2]) bodyPixels++;
  setView(0, 2.4, 8, 0, 1.1, 0);
  const third = draw();
  // The near plane crosses the actual sloping mound, so only part is yellow.
  const edgeY = cover.heightAt(0, 2.4);
  setView(0, edgeY, 2.4, 1, edgeY, 2.4);
  const partial = draw();
  const rayHidden = !cover.segmentClear(0, 2.4, 8, 0, 1, 0);
  const rayClear = cover.segmentClear(0, 5, 8, 0, 5, 0);
  core.scale.y = 1;
  setView(0, 1.2, 8, 0, 1.2, 0);
  const exposed = draw(), exposedPixels = ctx.getImageData(0, 0, overlay.width, overlay.height).data;
  const height = cover.heightAt(0, 0), row = Math.floor(overlay.height / 2 - (height - 1.2) / 8 * (overlay.height / 2 / Math.tan(camera.fov / 2)) - 3);
  let visibleOutlinePixels = 0;
  for (let y = 0; y < row; y++) for (let x = 0; x < overlay.width; x++) if (exposedPixels[(y * overlay.width + x) * 4 + 3]) visibleOutlinePixels++;
  exposed.visibleOutlinePixels = visibleOutlinePixels;
  core.visible = false;
  const empty = draw();
  cover.dispose();
  return { inside: { ...inside, bodyPixels }, third, partial, exposed, empty, mesh: { checked, mismatch, maximumError }, rayHidden, rayClear };
};

// The first-person view keeps the real model's body and hides only its head.
// Falling/walking inside fruit must leave the feet on the stone platform.
export const bananaSceneInteriorProbe = () => {
  const B = window.__ooga, BL = window.BL, scene = BL.scenes.hub;
  const actor = [...B.cavemen.values()].find((cave) => cave.state === "working");
  const cover = B.headquarters.bananaCover, overlay = document.getElementById("overlay");
  const copy = document.createElement("canvas"), ctx = copy.getContext("2d", { willReadFrequently: true });
  copy.width = overlay.width; copy.height = overlay.height;
  let time = B.renderOpts.matrix.time;
  const tick = (frames) => { for (let n = 0; n < frames; n++) scene.update(1 / 60, time += 1 / 60); };
  const draw = () => { BL.scene.updateWorld(scene.root); B.renderer.render(scene.root, B.camera, B.renderOpts); scene.overlay(1 / 60); };
  B.setPileLevel(50000);
  B.pilot.possess(actor);
  const others = [...B.cavemen.values()].filter((cave) => cave !== actor).map((cave) => [cave.root, cave.root.visible]);
  for (const [root] of others) root.visible = false;
  const approach = B.altar.platformRadius + 1.3;
  B.pilot.navigate({ position: { x: 0, y: B.island.surfaceAt(0, approach), z: approach }, yaw: 0, pitch: 0.25, dist: 10 });
  const walking = { start: actor.root.position.z, minFeet: Infinity, maxFeet: -Infinity, frames: 0 };
  try {
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "w" }));
    for (let n = 0; n < 180 && actor.root.position.z > 0.08; n++) {
      tick(1); walking.frames++;
      const feet = actor.root.position.y - actor.baseY;
      walking.minFeet = Math.min(walking.minFeet, feet); walking.maxFeet = Math.max(walking.maxFeet, feet);
    }
  } finally { window.dispatchEvent(new KeyboardEvent("keyup", { key: "w" })); }
  tick(2); walking.end = actor.root.position.z; walking.feet = actor.root.position.y - actor.baseY;
  walking.inFruit = cover.contains(actor.root.position.x, walking.feet + 0.3, actor.root.position.z);
  const fruitTop = cover.heightAt(0, 0), dropY = fruitTop + 2;
  B.pilot.navigate({ position: { x: 0, y: dropY, z: 0 }, yaw: 0, pitch: 0.25, dist: 10 });
  const falling = { start: actor.root.position.y - actor.baseY, fruitTop, passedThrough: false, landedOnFruit: false };
  for (let n = 0; n < 150; n++) {
    tick(1);
    const feet = actor.root.position.y - actor.baseY;
    if (feet < fruitTop - 0.1 && feet > 0.4 && actor.hopV < 0) falling.passedThrough = true;
    if (Math.abs(feet - fruitTop) < 0.05 && actor.hop === 0 && actor.hopV === 0) falling.landedOnFruit = true;
  }
  falling.feet = actor.root.position.y - actor.baseY; falling.velocity = actor.hopV;
  for (const [root, visible] of others) root.visible = visible;
  B.pilot.navigate({ position: { x: 0, y: 0.34, z: 0 }, yaw: 0, pitch: 0.25, dist: 10 });
  tick(15); draw();
  const third = { ...cover.state, feet: actor.root.position.y - actor.baseY, mode: B.pilot.mode };
  B.pilot.navigate({ position: { x: 0, y: 0.34, z: 0 }, yaw: 0, pitch: 0.9, dist: 5 });
  B.pilot.enterClose(); tick(120);
  B.pilot.orbit.pitch = B.pilot.orbit.tPitch = 1.3; tick(2); draw();
  const first = { ...cover.state, feet: actor.root.position.y - actor.baseY, mode: B.pilot.mode, closeMix: B.pilot.closeMix, hiddenHead: actor.parts.head.cameraHidden };
  // Compare this exact first-person body's silhouette against its yellow cap.
  const overlayCtx = overlay.getContext("2d");
  overlayCtx.clearRect(0, 0, overlay.width, overlay.height);
  cover.prepare(B.camera, actor); cover.draw(B.camera, actor);
  ctx.drawImage(overlay, 0, 0);
  const withBody = ctx.getImageData(0, 0, copy.width, copy.height).data;
  overlayCtx.clearRect(0, 0, overlay.width, overlay.height); cover.draw(B.camera, null);
  ctx.clearRect(0, 0, copy.width, copy.height); ctx.drawImage(overlay, 0, 0);
  const withoutBody = ctx.getImageData(0, 0, copy.width, copy.height).data;
  first.bodyPixels = 0;
  for (let i = 0; i < withBody.length; i += 4) if (withBody[i] !== withoutBody[i] || withBody[i + 1] !== withoutBody[i + 1] || withBody[i + 2] !== withoutBody[i + 2]) first.bodyPixels++;
  draw();
  return { walking, falling, third, first };
};
