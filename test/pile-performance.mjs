// Compare exact partial masks with and without empty-volume batching. The
// ten-million-banana shell must keep the same pixels with fewer point queries.
export const pileVisibilityPerformanceProbe = () => {
  const B = window.__ooga, BL = window.BL, scene = BL.scenes.hub, H = B.headquarters;
  const actor = [...B.cavemen.values()].find((c) => c.state === "working");
  const objects = H.objectGuides, provider = H.pileGuides, update = scene.update, bounds = objects.cameraBoundsState;
  const canvas = document.createElement("canvas"); canvas.width = 640; canvas.height = 360;
  const ctx = canvas.getContext("2d", { willReadFrequently: true }), rows = [];
  const points = [[-8.15, 6.71, 18.77], [-6.46, 6.71, 20.35], [-9.24, 6.71, 25.90]];
  let batch = false;
  const uncached = () => true;
  objects.cameraBoundsState = (ax, ay, az, bx, by, bz, character, owner, clear, propsOnly) =>
    bounds(ax, ay, az, bx, by, bz, character, owner, propsOnly && !batch ? uncached : clear, propsOnly);
  const draw = () => {
    objects.result.occlusionVersion++; ctx.clearRect(0, 0, 640, 360);
    const start = performance.now(); provider.draw(B.camera, ctx, 1, 640, 360);
    const ms = performance.now() - start, pixels = ctx.getImageData(0, 0, 640, 360).data;
    let hash = 2166136261, count = 0;
    for (let n = 3; n < pixels.length; n += 4) { hash = Math.imul(hash ^ pixels[n], 16777619); if (pixels[n]) count++; }
    return { ms, hash: hash >>> 0, count, rays: provider.state.occlusionRays, tiles: provider.state.occlusionTiles };
  };
  try {
    B.setPileLevel(10000000); B.pilot.possess(actor); scene.update = () => {};
    Object.assign(actor.root.position, { x: -9, y: actor.baseY, z: B.altar.platformRadius + 3 });
    BL.scene.updateWorld(scene.root); provider.active();
    Object.assign(B.camera.target, { x: actor.root.position.x, y: actor.root.position.y + 0.7, z: actor.root.position.z });
    for (const point of points) {
      Object.assign(B.camera.position, { x: point[0], y: point[1], z: point[2] });
      objects.collect(actor, actor.root.position.x, actor.root.position.y + 0.7, actor.root.position.z, B.camera, 640 / 360);
      batch = false; const before = draw(); batch = true; const after = draw();
      rows.push({ before, after });
    }
    // Clear third-person views should never build a hidden-shell mask, even
    // while the selected character moves around the maximum-size pile.
    let visible = 0, masks = provider.state.occlusionUpdates;
    for (let n = 0; n < 16; n++) {
      actor.root.position.x = -n * 0.1; BL.scene.updateWorld(scene.root);
      const p = actor.root.position;
      Object.assign(B.camera.position, { x: p.x, y: 4, z: p.z + 10 });
      Object.assign(B.camera.target, { x: p.x, y: p.y + 0.7, z: p.z });
      scene.overlay(1 / 60);
      if (!H.sightGuides.objectsEnabled) visible++;
    }
    return { rows, visible, idleMasks: provider.state.occlusionUpdates === masks, fruit: B.shell.instanceCount };
  } finally { objects.cameraBoundsState = bounds; scene.update = update; }
};
