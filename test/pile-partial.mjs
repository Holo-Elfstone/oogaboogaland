// A solid shell stays one cue, but camera-visible pixels must be removed
// without turning that removal boundary into a new silhouette edge.
export const pilePartialProbe = () => {
  const BL = window.BL, S = BL.scene, width = 640, height = 360, root = S.createNode();
  const canvas = document.createElement("canvas"); canvas.width = width; canvas.height = height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  const core = S.createNode({ geometry: BL.models.box({ w: 4, h: 4, d: 2, color: "#ffff44" }) });
  const shell = S.createNode(), slab = S.createNode({ geometry: BL.models.box({ w: 5, h: 0.3, d: 3, color: "#777777" }), position: { x: 0, y: -2.15, z: 0 } });
  S.addChild(root, core, shell, slab); S.updateWorld(root);
  const camera = S.createCamera({ fov: 60, near: 0.1, far: 100 });
  Object.assign(camera.position, { x: 0, y: 0, z: 10 }); Object.assign(camera.target, { x: 0, y: 0, z: 0 });
  let mode = "hidden", revision = 0, rays = 0, boxes = 0;
  // An opaque half-plane at z=5 lies between the camera and shell. Its
  // straight x=0 boundary cuts through the middle of the projected front.
  const cameraClear = (ax, ay, az, bx, by, bz) => {
    rays++;
    if (mode === "hidden") return false;
    if (mode === "clear") return true;
    const t = (5 - az) / (bz - az);
    return !(t > 0 && t < 1 && ax + (bx - ax) * t <= 0);
  };
  const cameraBoundsState = (minX, minY, minZ, maxX) => {
    boxes++;
    if (mode === "hidden") return 2;
    if (mode === "clear") return 1;
    return maxX < -1e-7 ? 2 : minX > 1e-7 ? 1 : 0;
  };
  const provider = BL.pileGuides.create({ pile: { core, shell, slots: [] }, altar: { node: slab, slab }, cameraClear, cameraBoundsState, occlusionVersion: () => revision });
  const rows = [], images = new Map(), cap = { rockOnly: true };
  const sample = (name, rockOnly = false) => {
    rays = boxes = 0; provider.active(); ctx.clearRect(0, 0, width, height);
    provider.draw(camera, ctx, 1, width, height, 0, rockOnly ? cap : null);
    const pixels = ctx.getImageData(0, 0, width, height).data;
    let nonzero = 0, hash = 2166136261, maximum = 0;
    for (let at = 3; at < pixels.length; at += 4) {
      const a = pixels[at]; if (a) nonzero++; maximum = Math.max(maximum, a); hash = Math.imul(hash ^ a, 16777619);
    }
    images.set(name, pixels);
    rows.push({ name, nonzero, maximum, hash: hash >>> 0, rays, boxes, updates: provider.state.updates,
      occlusionUpdates: provider.state.occlusionUpdates, occlusionRays: provider.state.occlusionRays, occlusionTiles: provider.state.occlusionTiles });
  };
  try {
    sample("hidden"); sample("cached"); mode = "partial"; revision++; sample("partial");
    mode = "clear"; revision++; sample("clear"); sample("cap", true);
    mode = "hidden"; revision++; sample("restored");
    // A nearly empty heap can project thinner than one depth-mask pixel.
    // Preserve its real silhouette instead of dropping the whole remnant.
    core.scale.y = 0.006; S.updateWorld(root); mode = "partial"; revision++;
    sample("tiny"); sample("tiny-cap", true);
    const full = images.get("hidden"), partial = images.get("partial");
    let left = 0, leftKept = 0, right = 0, rightRemoved = 0, cutBright = 0, cutMaximum = 0;
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
      const at = (y * width + x) * 4 + 3, reference = full[at], actual = partial[at];
      if (reference && x < width / 2 - 6) { left++; if (Math.abs(actual - reference) <= 1) leftKept++; }
      if (reference && x > width / 2 + 6) { right++; if (!actual) rightRemoved++; }
      if (Math.abs(x - width / 2) <= 3 && Math.abs(y - height / 2) <= 30) {
        cutMaximum = Math.max(cutMaximum, actual);
        if (actual > reference + 2) cutBright++;
      }
    }
    const tinyFull = images.get("tiny-cap"), tinyPartial = images.get("tiny");
    let tinyLeft = 0, tinyKept = 0, tinyRight = 0, tinyRemoved = 0;
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
      const at = (y * width + x) * 4 + 3;
      if (tinyFull[at] && x < width / 2 - 6) { tinyLeft++; if (Math.abs(tinyFull[at] - tinyPartial[at]) <= 1) tinyKept++; }
      if (tinyFull[at] && x > width / 2 + 6) { tinyRight++; if (!tinyPartial[at]) tinyRemoved++; }
    }
    return { backend: window.__ooga.renderer.kind, rows, left, leftKept, right, rightRemoved, cutBright, cutMaximum,
      tiny: { left: tinyLeft, kept: tinyKept, right: tinyRight, removed: tinyRemoved, projectedHeight: 4 * core.scale.y * height / (2 * Math.tan(camera.fov / 2) * 9) } };
  } finally { provider.dispose(); }
};

// A partially hidden provider owns its per-pixel clipping. The ordinary
// whole-object visibility rule must not drop it before that draw can run.
export const pilePartialEligibilityProbe = () => {
  const BL = window.BL, S = BL.scene, actor = { root: S.createNode() }, shell = S.createNode(), ordinary = S.createNode();
  const partial = { partialOcclusion: true }, normal = {}, source = { count: 0, capacity: 0, ownerCapacity: 2,
    lines: new Float32Array(0), owners: [], nearOwners: [shell, ordinary], nearDistances: new Float64Array([1, 1]), nearCount: 2,
    version: 1, occlusionVersion: 1, nearVersion: 1 };
  const clear = () => true, concealed = () => false;
  const guides = BL.sightGuides.create({ segmentClear: clear, objectClear: clear, ownerPerceived: clear, ownerConcealed: concealed,
    ownerInView: clear, getProvider: (owner) => owner === shell ? partial : normal });
  const camera = S.createCamera(); Object.assign(camera.position, { x: 0, y: 0, z: 8 }); Object.assign(camera.target, { x: 0, y: 0, z: 0 });
  try {
    const state = guides.update(actor, null, source, camera, 1.6, 1, true, false);
    const a = state.owners.indexOf(shell), b = state.owners.indexOf(ordinary);
    return { shell: { state: state.ownerStates[a], alpha: state.ownerAlphas[a], provider: state.ownerProviders[a] === partial },
      ordinary: { state: state.ownerStates[b], alpha: state.ownerAlphas[b] }, providerCount: state.providerCount };
  } finally { guides.dispose(); }
};

// Use the production terrain/prop visibility callbacks at the three canopy
// poses that previously caused the million-banana outline stall.
export const pilePartialSceneProbe = () => {
  const B = window.__ooga, BL = window.BL, scene = BL.scenes.hub, H = B.headquarters, provider = H.pileGuides;
  const actor = [...B.cavemen.values()].find((cave) => cave.state === "working"), width = 640, height = 360;
  const canvas = document.createElement("canvas"); canvas.width = width; canvas.height = height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true }), rows = [], cap = { rockOnly: true };
  const cases = [[0, 1, -26.08493723861947, 8.15, 12.811184468393678], [1, 0, 28.044528645827203, 8.9, -1.8912998152277658], [0, -1, 13.15289368298812, 9.4, -25.122891324817388]];
  B.setPileLevel(1000000); B.pilot.possess(actor);
  const radius = B.altar.platformRadius + 1.5;
  for (let index = 0; index < cases.length; index++) {
    const p = cases[index], x = p[0] * radius, z = p[1] * radius;
    B.crew.relocatePlayer({ x, y: B.island.surfaceAt(x, z), z }, 0);
    BL.scene.updateWorld(scene.root);
    Object.assign(B.camera.target, { x, y: actor.root.position.y + 0.7, z });
    for (const lift of [0, 2]) {
      Object.assign(B.camera.position, { x: p[2], y: p[3] + lift, z: p[4] });
      H.objectGuides.collect(actor, actor.root.position.x, actor.root.position.y, actor.root.position.z, B.camera, width / height);
      provider.active(); ctx.clearRect(0, 0, width, height);
      const start = performance.now(); provider.draw(B.camera, ctx, 1, width, height); const ms = performance.now() - start;
      const partial = ctx.getImageData(0, 0, width, height).data;
      const rays = provider.state.occlusionRays, tiles = provider.state.occlusionTiles;
      ctx.clearRect(0, 0, width, height); provider.draw(B.camera, ctx, 1, width, height, 0, cap);
      const full = ctx.getImageData(0, 0, width, height).data;
      let hidden = 0, clear = 0, reference = 0, leaked = 0;
      for (let at = 3; at < full.length; at += 4) {
        if (full[at]) { reference++; if (partial[at]) hidden++; else clear++; }
        else if (partial[at]) leaked++;
      }
      rows.push({ index, lift, ms, rays, tiles, hidden, clear, reference, leaked,
        instances: provider.state.instances, considered: provider.state.considered, samples: provider.state.visibilitySamples });
    }
  }
  return { backend: B.renderer.kind, selected: B.crew.player === actor, fruitInstances: B.shell.instanceCount, rows };
};
