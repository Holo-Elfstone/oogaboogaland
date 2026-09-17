// Pixel coverage of the shipped path geometry over grass at the hub's .1 near
// plane. Reference-only masks exclude antialiased boundaries from the count.
export const pathDepthProbe = async ({ backend = "webgl2" } = {}) => {
  const BL = window.BL, B = window.__ooga, S = BL.scene, canvas = document.createElement("canvas"), size = 512;
  Object.defineProperties(canvas, { clientWidth: { value: size }, clientHeight: { value: size } });
  if (backend === "canvas2d") canvas.getContext("2d", { willReadFrequently: true });
  const renderer = (backend === "webgl2" ? BL.glRenderer : BL.canvasRenderer).createRenderer(canvas, { quality: "low" });
  const gl = backend === "webgl2" ? canvas.getContext("webgl2") : null, context = gl ? null : canvas.getContext("2d");
  const root = S.createNode(), geometry = B.island.path.geometry, originalOffset = geometry.depthOffset, flatGeometry = { ...geometry };
  const terrain = S.createNode({ geometry: B.island.geometry });
  const actual = S.createNode({ geometry, instanceData: B.island.path.instanceData, instanceCount: B.island.path.debug.visibleInstanceCount, instanceVersion: 1, depthBias: 0.05 });
  const grass = S.createNode({ geometry: { verts: [-12, 0, -12, 12, 0, -12, 12, 0, 12, -12, 0, 12], faces: [{ i: [0, 3, 2, 1], color: [101, 115, 58], emissive: 0 }], lines: [] } });
  const width = geometry.verts[3] - geometry.verts[0], across = Math.round(8 / width), data = new Float32Array(across * across * 20);
  for (let z = 0, i = 0; z < across; z++) for (let x = 0; x < across; x++, i++) {
    const at = i * 20; data[at] = data[at + 5] = data[at + 10] = data[at + 15] = data[at + 16] = 1;
    data[at + 12] = (x + 0.5) * width - 4; data[at + 13] = 0.006; data[at + 14] = (z + 0.5) * width - 4;
  }
  const tiles = S.createNode({ geometry: flatGeometry, instanceData: data, instanceCount: across * across, instanceVersion: 1, depthBias: 0.05 });
  const blocker = S.createNode({ geometry: BL.models.box({ w: 3, h: 0.15, d: 3, color: "#ff0044", offset: { y: 0.085 } }), visible: false });
  S.addChild(root, terrain, actual, grass, tiles, blocker);
  const camera = S.createCamera({ fov: 48, near: 0.1, far: 140 });
  const opts = { clear: [0, 0, 0], sky: [1, 1, 1], ground: [1, 1, 1], sun: [0, 0, 0], light: { x: 0, y: 1, z: 0 }, ambientFloor: 1, directStrength: 0, bloomStrength: 0 };
  const capture = async () => {
    const began = performance.now();
    while (!renderer.render(root, camera, opts)) {
      if (renderer.failure || performance.now() - began > 8000) throw Error(renderer.failure || "Path renderer did not become ready");
      await new Promise(requestAnimationFrame);
    }
    const pixels = new Uint8Array(canvas.width * canvas.height * 4);
    if (gl) gl.readPixels(0, 0, canvas.width, canvas.height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
    else pixels.set(context.getImageData(0, 0, canvas.width, canvas.height).data);
    return pixels;
  };
  const brown = (pixels, at) => pixels[at] > pixels[at + 1] + 12 && pixels[at + 1] > pixels[at + 2] + 20;
  const rows = [];
  try {
    camera.position = { x: 0, y: 12, z: 0.01 };
    const began = performance.now();
    while (!renderer.render(root, camera, opts)) {
      if (renderer.failure || performance.now() - began > 8000) throw Error(renderer.failure || "Path renderer did not become ready");
      await new Promise(requestAnimationFrame);
    }
    for (const quality of ["low", "high"]) for (const fixture of ["flat", "island"]) for (const distance of [12, 64, 105]) {
      renderer.setQuality(quality); camera.position = { x: 0.13, y: distance, z: distance * 0.12 }; camera.target = { x: 0, y: 0, z: 0 };
      terrain.visible = grass.visible = blocker.visible = false; actual.visible = fixture === "island"; tiles.visible = fixture === "flat";
      geometry.depthOffset = flatGeometry.depthOffset = originalOffset; const reference = await capture(), mask = [];
      const w = canvas.width, h = canvas.height;
      for (let y = 2; y < h - 2; y++) for (let x = 2; x < w - 2; x++) {
        let inside = true;
        for (let dy = -2; dy <= 2 && inside; dy++) for (let dx = -2; dx <= 2; dx++) if (!brown(reference, ((y + dy) * w + x + dx) * 4)) { inside = false; break; }
        if (inside) mask.push((y * w + x) * 4);
      }
      terrain.visible = fixture === "island"; grass.visible = fixture === "flat";
      geometry.depthOffset = flatGeometry.depthOffset = false; const before = await capture();
      geometry.depthOffset = flatGeometry.depthOffset = originalOffset; const after = await capture();
      let baselineGrass = 0, correctedGrass = 0, delta = 0;
      for (const at of mask) {
        if (before[at + 1] > before[at] + 3) baselineGrass++;
        if (after[at + 1] > after[at] + 3) correctedGrass++;
        delta = Math.max(delta, Math.abs(before[at] - after[at]), Math.abs(before[at + 1] - after[at + 1]), Math.abs(before[at + 2] - after[at + 2]));
      }
      rows.push({ quality, fixture, distance, samples: mask.length, baselineGrass, correctedGrass, delta });
    }
    terrain.visible = actual.visible = false; grass.visible = tiles.visible = blocker.visible = true;
    camera.position = { x: 0.13, y: 64, z: 7.68 }; geometry.depthOffset = flatGeometry.depthOffset = false; const unoffset = await capture();
    geometry.depthOffset = flatGeometry.depthOffset = originalOffset; const offset = await capture(); let foreground = 0, occluded = 0;
    const pink = (pixels, at) => pixels[at] > 160 && pixels[at + 1] < 70 && pixels[at + 2] < 150;
    // At antialiased edges, correcting the grass behind the object also changes
    // mixed pixels. Only fully interior object pixels must remain unchanged.
    for (let y = 2; y < canvas.height - 2; y++) for (let x = 2; x < canvas.width - 2; x++) {
      let inside = true;
      for (let dy = -2; dy <= 2 && inside; dy++) for (let dx = -2; dx <= 2; dx++) if (!pink(unoffset, ((y + dy) * canvas.width + x + dx) * 4)) { inside = false; break; }
      if (!inside) continue;
      foreground++; if (!pink(offset, (y * canvas.width + x) * 4)) occluded++;
    }
    camera.position = { x: 0, y: -12, z: 0.01 }; blocker.visible = false;
    const underside = await capture(); let undersidePath = 0;
    for (let at = 0; at < underside.length; at += 4) if (brown(underside, at)) undersidePath++;
    return { backend, rows, foreground, occluded, undersidePath };
  } finally { geometry.depthOffset = flatGeometry.depthOffset = originalOffset; renderer.dispose(); }
};
