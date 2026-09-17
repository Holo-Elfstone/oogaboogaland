// Contrast strengthens only existing cue boundaries. Geometry, window masks,
// visibility gates and zero-alpha fades remain shared with the normal overlay.
export const cameraCueContrastProbe = () => {
  const BL = window.BL, canvas = document.createElement("canvas"); canvas.width = 640; canvas.height = 360;
  Object.defineProperties(canvas, { clientWidth: { value: 640 }, clientHeight: { value: 360 } });
  const ctx = canvas.getContext("2d", { willReadFrequently: true }), cover = BL.cameraCover.create(canvas), camera = BL.scene.createCamera({ near: 0.1 });
  Object.assign(camera.position, { x: 0, y: 0, z: -8 }); Object.assign(camera.target, { x: 0, y: 0, z: 0 }); camera.fov = Math.PI / 2;
  const actor = BL.scene.createNode({ geometry: BL.models.box({ w: 1, h: 2, d: 0.6, color: "#ffffff" }) }); BL.scene.updateWorld(actor);
  const aperture = BL.wallApertures.create({ windows: [{ sill: -0.6, height: 1.2, flare: { frusta: [{ angle: 0, start: 2, half: 0.6, inner: false }] } }], island: { geometry: { verts: [], faces: [] } } }); aperture.update(camera, true);
  const wall = { surface: new Float32Array([-4,-2,0, -4,2,0, 4,2,0, -4,-2,0, 4,2,0, 4,-2,0]), surfaceCount: 2, surfaceGroups: new Uint16Array([0,0]), surfaceWholePhases: new Float32Array([1]), surfacePhases: new Float32Array([1]), surfaceHidden: new Uint8Array([1]), surfaceAperture: new Uint8Array([1]), surfaceWholeActive: 1, surfaceActive: 1, surfaceVersion: 1, apertures: aperture };
  const guides = { structures: [], objectsEnabled: true, count: 0, providerCount: 0, lines: new Float32Array([-1,-1,0, 1,-1,0, 1,-1,0, 1,1,0, 1,1,0, -1,1,0, -1,1,0, -1,-1,0]), kinds: new Uint8Array([1,1,1,1]), alphas: new Float32Array([1,1,1,1]) };
  const clear = () => false, material = () => null, rows = [];
  const paint = (kind, contrast, background = false) => {
    ctx.clearRect(0, 0, 640, 360);
    if (background) {
      ctx.fillStyle = "#183721"; ctx.fillRect(0, 0, 640, 360);
      ctx.fillStyle = "#63ef7f";
      for (let y = 0; y < 360; y += 8) for (let x = 0; x < 640; x += 8) ctx.fillRect(x, y, 4, 5);
    }
    guides.count = kind === "object" ? 4 : 0; guides.structures.length = 0;
    if (kind === "wall") guides.structures.push(wall);
    if (contrast === undefined) cover.draw(camera, kind === "actor" ? actor : null, false, kind === "actor", clear, material, guides, 0);
    else cover.draw(camera, kind === "actor" ? actor : null, false, kind === "actor", clear, material, guides, 0, contrast);
    return ctx.getImageData(0, 0, 640, 360).data;
  };
  const equal = (a, b) => a.every((v, i) => v === b[i]);
  const empty = (a) => a.every((v, i) => i % 4 !== 3 || v === 0);
  for (const kind of ["actor", "object", "wall"]) {
    const normal = paint(kind), explicitZero = paint(kind, 0), normalBackground = paint(kind, 0, true), strongBackground = paint(kind, 1, true), strong = paint(kind, 1), restored = paint(kind, 0);
    let brighter = 0, darker = 0, farChanged = 0;
    for (let y = 0; y < 360; y++) for (let x = 0; x < 640; x++) {
      const at = (y * 640 + x) * 4, before = normalBackground[at] + normalBackground[at + 1] + normalBackground[at + 2], after = strongBackground[at] + strongBackground[at + 1] + strongBackground[at + 2];
      if (after > before + 12) brighter++;
      if (after < before - 12) darker++;
      if ((x < 160 || x > 480 || y < 100 || y > 260) && before !== after) farChanged++;
    }
    guides.objectsEnabled = false; const gated = empty(paint(kind, 1)); guides.objectsEnabled = true;
    cover.state.opacity = 0; guides.alphas.fill(0); wall.surfaceWholePhases.fill(0); wall.surfacePhases.fill(0); wall.surfaceWholeActive = wall.surfaceActive = 0; wall.surfaceVersion++;
    const faded = empty(paint(kind, 1));
    cover.state.opacity = 0.22; guides.alphas.fill(1); wall.surfaceWholePhases.fill(1); wall.surfacePhases.fill(1); wall.surfaceWholeActive = wall.surfaceActive = 1; wall.surfaceVersion++;
    rows.push({ kind, defaultUnchanged: equal(normal, explicitZero), restored: equal(normal, restored), brighter, darker, farChanged, gated, faded, windowClear: kind !== "wall" || strong[(180 * 640 + 320) * 4 + 3] === 0 });
  }
  paint("wall", 0); const before = cover.state.structureUpdates; paint("wall", 1); const changed = cover.state.structureUpdates;
  const hits = cover.state.structureCacheHits; paint("wall", 1); const cached = cover.state.structureCacheHits > hits;
  let providerContrast = -1;
  guides.structures.length = 0; guides.ownerCount = guides.providerCount = 1; guides.ownerProviders = [{ draw: (camera, ctx, alpha, w, h, contrast) => { providerContrast = contrast; } }]; guides.ownerViews = [1]; guides.ownerStates = [2]; guides.ownerAlphas = [1];
  cover.draw(camera, null, false, false, clear, material, guides, 0, 0.75);
  cover.dispose();
  return { rows, contrastInvalidates: changed === before + 1, cached, providerContrast };
};
