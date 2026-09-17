// Exit fruit is a finite visual effect, separate from donations and the
// resting mound. Exercise its actual instanced mesh in either renderer.
export const bananaSpillProbe = async (backend) => {
  const BL = window.BL, S = BL.scene, canvas = document.createElement("canvas"), size = 192;
  Object.defineProperties(canvas, { clientWidth: { value: size }, clientHeight: { value: size } });
  if (backend === "canvas2d") canvas.getContext("2d", { willReadFrequently: true });
  const renderer = (backend === "canvas2d" ? BL.canvasRenderer : BL.glRenderer).createRenderer(canvas, { quality: "high" });
  const gl = backend === "webgl2" ? canvas.getContext("webgl2") : null, context = gl ? null : canvas.getContext("2d");
  const root = S.createNode(), world = { level: 17 }, crew = { updateFan() {}, rush() {}, cavemen: new Map() };
  const pile = BL.pile.create({ root, world, renderer, crew, matrixLivingPile: true }), effect = pile.spillEffect, node = effect.node;
  pile.syncPile(true);
  // Register an ordinary banana after the explicit batch. Sharing their
  // geometry identity used to merge incompatible WebGL instance buffers.
  const ordinary = BL.models.banana();
  Object.assign(ordinary.position, { x: 1.3, y: 2, z: 0 });
  Object.assign(ordinary.scale, { x: BL.models.BANANA_AMMO_SCALE, y: BL.models.BANANA_AMMO_SCALE, z: BL.models.BANANA_AMMO_SCALE });
  S.addChild(root, ordinary);
  const objects = BL.objectGuides.create({ roots: [node], crew }), solids = BL.solidProps.create(); solids.add(node);
  const camera = S.createCamera({ near: 0.1, far: 40 });
  Object.assign(camera.position, { x: 2, y: 2.3, z: 4 }); Object.assign(camera.target, { x: 2, y: 2, z: 0 });
  const opts = { clear: [0, 0, 0], sky: [1, 1, 1], ground: [1, 1, 1], sun: [0, 0, 0], light: { x: 0, y: 1, z: 0 }, bloomStrength: 0 };
  const rows = [], buffer = node.instanceData, children = root.children.length;
  let tweens = 0;
  const emit = (...args) => {
    const random = Math.random;
    // A fixed cosmetic sample makes timing, shrink and inherited movement
    // measurable without depending on the page's other effects.
    try { Math.random = () => 0.5; return pile.spill(...args); } finally { Math.random = random; }
  };
  const sizeOf = () => Math.hypot(buffer[0], buffer[1], buffer[2]);
  const capture = (showOrdinary = false) => {
    for (const child of root.children) if (child !== node) child.visible = false;
    ordinary.visible = showOrdinary;
    S.updateWorld(root); renderer.render(root, camera, opts);
    const pixels = new Uint8Array(size * size * 4);
    if (gl) gl.readPixels(0, 0, size, size, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
    else pixels.set(context.getImageData(0, 0, size, size).data);
    let yellow = 0;
    for (let n = 0; n < pixels.length; n += 4) if (pixels[n] > 60 && pixels[n + 1] > 45 && pixels[n + 2] < pixels[n + 1] * 0.8) yellow++;
    return yellow;
  };
  try {
    const started = performance.now();
    while (!renderer.render(root, camera, opts)) {
      if (renderer.failure || performance.now() - started > 8000) throw new Error(renderer.failure || "Spill renderer did not become ready");
      await new Promise(requestAnimationFrame);
    }
    tweens = S.tweenCount();
    const blank = capture(), emitted = emit(2, 2, 0, 4, 0, 0), originX = buffer[12], originY = buffer[13], initialSize = sizeOf();
    const pixels = capture();
    rows.push({ name: "bounded visible exit burst", ok: blank === 0 && emitted === 8 && effect.state.active === emitted && node.visible && pile.inMotion && pixels > 10 && node.geometry !== ordinary.geometry && node.geometry.verts === ordinary.geometry.verts && node.geometry.faces === ordinary.geometry.faces, emitted, pixels });
    const together = capture(true), drawn = renderer.stats.drawn, error = gl ? gl.getError() : 0;
    rows.push({ name: "ordinary bananas and spills render together", ok: together > pixels && !error && (!gl || drawn >= emitted + 1), pixels, together, drawn, error });
    pile.update(0.1);
    rows.push({ name: "fruit follows outgoing movement and tosses upward", ok: buffer[12] > originX + 0.2 && buffer[13] > originY + 0.1 && node.instanceData === buffer && node.instanceCount === emitted && buffer[18] === 2, dx: buffer[12] - originX, dy: buffer[13] - originY });
    pile.update(0.65); const fullSize = sizeOf(); pile.update(0.15); const shrunkSize = sizeOf();
    rows.push({ name: "fruit shrinks before disappearing", ok: Math.abs(fullSize - initialSize) < 1e-6 && shrunkSize > 0 && shrunkSize < fullSize * 0.6, fullSize, shrunkSize });
    for (let n = 0; n < 20; n++) emit(2, 2, 0, 0, 5, 0);
    const saturated = effect.state.active, accepted = effect.state.emitted, rejected = emit(2, 2, 0, 0, 5, 0);
    rows.push({ name: "repeated exits reuse a fixed pool", ok: saturated === effect.state.capacity && rejected === 0 && node.instanceCount === saturated && node.instanceData === buffer && root.children.length === children && S.tweenCount() === tweens, saturated, accepted, rejected });
    pile.update(2);
    rows.push({ name: "all temporary fruit expires", ok: effect.state.active === 0 && node.instanceCount === 0 && !node.visible && !pile.inMotion && capture() === blank });
    emit(2, 2, 0, 0, 6, 0); const topY = buffer[13]; pile.update(0.1);
    rows.push({ name: "upward exits inherit vertical motion", ok: buffer[13] > topY + 0.4, rise: buffer[13] - topY });
    rows.push({ name: "spills do not change banana or delivery accounting", ok: world.level === 17 && pile.shown === 17 && pile.delivery.logicalOutstandingValue === 0 && pile.delivery.visualDropsStarted === 0 && pile.delivery.totalAcceptedValue === 0 && pile.delivery.totalLandedValue === 0 });
    S.updateWorld(root); solids.sync();
    rows.push({ name: "spills never become outline or collision targets", ok: node.sightHidden && objects.stats.registered === 0 && solids.stats.nodes === 0 && solids.segmentClear(2, 1, -1, 2, 3, 1, 0.3, 1) });
  } finally {
    objects.dispose(); solids.dispose(); pile.dispose(); S.removeChild(root, ordinary); renderer.dispose();
  }
  rows.push({ name: "scene teardown removes all spill resources", ok: root.children.length === 0 && node.parent === null && node.instanceCount === 0 && !node.visible && effect.state.active === 0 && pile.stats().spillPool === 0 && S.tweenCount() === tweens });
  return { backend, rows };
};
