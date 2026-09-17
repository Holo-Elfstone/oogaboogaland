// Follow both button directions and reverse partway through an unfinished move.
export const matrixGateAnimationProbe = () => {
  const B = window.__ooga, G = B.matrixGate, C = B.matrixCave, scene = window.BL.scenes.hub, results = [];
  let time = B.renderOpts.matrix.time;
  for (const dt of [1 / 20, 1 / 120]) {
    const step = () => scene.update(dt, time += dt), heights = () => G.gates.map((gate) => gate.node.position.y);
    C.viewInside(false); G.set(false);
    for (let i = 0; i < Math.ceil(2 / dt); i++) step();
    const motion = (open) => {
      const start = heights(); G.set(open); const immediate = heights(), target = open ? G.hiddenHeight : G.visibleHeight;
      let previous = immediate, maxStep = 0, monotonic = true, visibility = true, intermediate = 0, frames = 0;
      while (frames < Math.ceil(1.5 / dt) && previous.some((y) => y !== target)) {
        step(); frames++;
        const next = heights();
        for (let i = 0; i < next.length; i++) {
          const delta = next[i] - previous[i];
          maxStep = Math.max(maxStep, Math.abs(delta));
          if (open ? delta < -1e-8 : delta > 1e-8) monotonic = false;
          const gate = G.gates[i];
          if (gate.node.visible !== (next[i] + gate.bottom < gate.ceiling && next[i] + gate.top > gate.floor)) visibility = false;
          if (next[i] < G.hiddenHeight && next[i] > G.visibleHeight) intermediate++;
        }
        previous = next;
      }
      return { start, immediate, end: previous, maxStep, monotonic, visibility, intermediate, duration: frames * dt, complete: previous.every((y) => y === target) };
    };
    const up = motion(true), down = motion(false);
    G.set(true);
    for (let i = 0; i < Math.ceil(0.25 / dt); i++) step();
    const rising = heights(); G.set(false); const release = heights(); step(); const falling = heights();
    G.set(true); const press = heights(); step(); const reversed = heights();
    const reversal = { rising, release, falling, press, reversed };
    G.set(false);
    for (let i = 0; i < Math.ceil(1.5 / dt); i++) step();
    const resetWave = () => {
      G.set(false); C.viewApproach();
      for (let i = 0; i < Math.ceil(2 / dt); i++) step();
    };
    resetWave();
    const initialAppearance = { inactive: !C.world.active, appeared: 0, firstStep: [], maxStep: 0, monotonic: true, intermediate: 0 };
    C.viewInside(false);
    let previous = heights();
    for (let i = 0; i < Math.ceil(2 / dt); i++) {
      step(); const next = heights();
      for (let j = 0; j < next.length; j++) {
        const delta = next[j] - previous[j];
        initialAppearance.maxStep = Math.max(initialAppearance.maxStep, Math.abs(delta));
        if (delta > 1e-8) initialAppearance.monotonic = false;
        if (previous[j] === G.hiddenHeight && delta < 0) { initialAppearance.appeared++; initialAppearance.firstStep.push(-delta); }
        if (next[j] < G.hiddenHeight && next[j] > G.visibleHeight) initialAppearance.intermediate++;
      }
      previous = next;
    }
    initialAppearance.complete = previous.every((y) => y === G.visibleHeight);
    resetWave();
    C.viewInside(false); G.set(true); step(); G.set(false);
    const early = { releasedBeforeFront: G.gates.every((gate) => C.world.radius < gate.distance), hidden: heights().every((y) => y === G.hiddenHeight), waiting: G.gates.map(() => 0), firstStep: G.gates.map(() => 0), intermediate: G.gates.map(() => 0), maxStep: 0, monotonic: true, visibility: true };
    previous = heights();
    for (let i = 0; i < Math.ceil(2 / dt); i++) {
      step(); const next = heights();
      for (let j = 0; j < next.length; j++) {
        const delta = next[j] - previous[j], gate = G.gates[j];
        early.maxStep = Math.max(early.maxStep, Math.abs(delta));
        if (delta > 1e-8) early.monotonic = false;
        if (gate.node.visible !== (next[j] + gate.bottom < gate.ceiling && next[j] + gate.top > gate.floor)) early.visibility = false;
        if (C.world.radius < gate.distance && next[j] === G.hiddenHeight) early.waiting[j]++;
        if (previous[j] === G.hiddenHeight && delta < 0) early.firstStep[j] = -delta;
        if (next[j] < G.hiddenHeight && next[j] > G.visibleHeight) early.intermediate[j]++;
      }
      previous = next;
    }
    early.complete = previous.every((y) => y === G.visibleHeight);
    results.push({ dt, count: G.gates.length, inside: C.inside, down, up, reversal, initialAppearance, early, settled: G.gates.every((gate) => !gate.open && !gate.raising && gate.node.position.y === G.visibleHeight) });
  }
  return results;
};

// Render the actual gate bars and their embedded glyph pixels separately. An
// unclipped control proves the above-ceiling region contains geometry, not empty sky.
export const matrixGateClipProbe = async (backend) => {
  const BL = window.BL, S = BL.scene, size = 384, canvas = document.createElement("canvas");
  Object.defineProperties(canvas, { clientWidth: { value: size }, clientHeight: { value: size } });
  if (backend === "canvas2d") canvas.getContext("2d", { willReadFrequently: true });
  const renderer = (backend === "webgl2" ? BL.glRenderer : BL.canvasRenderer).createRenderer(canvas, { quality: "high" });
  const gl = backend === "webgl2" ? canvas.getContext("webgl2") : null, ctx = gl ? null : canvas.getContext("2d");
  const root = S.createNode(), parent = S.createNode({ position: { x: 0.6, y: 0.75, z: 0 }, rotation: { x: 0, y: 0.23, z: 0 } });
  const source = window.__ooga.matrixGate.gates[0].node.geometry;
  const geometry = { ...source, faces: [], castShadow: false }, gate = S.createNode({ geometry });
  S.addChild(root, parent); S.addChild(parent, gate);
  const camera = S.createCamera({ near: 0.01, far: 100 });
  camera.position = { x: 0.6, y: source.clipMaxY, z: 9 }; camera.target = { x: 0.6, y: source.clipMaxY, z: 0 };
  const opts = { clear: [0, 0, 0], sky: [1, 1, 1], ground: [1, 1, 1], sun: [0, 0, 0], light: { x: 0, y: 0, z: 1 }, bloomStrength: 0 };
  const pixels = new Uint8Array(size * size * 4);
  const capture = () => {
    renderer.render(root, camera, opts);
    if (gl) gl.readPixels(0, 0, size, size, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
    else pixels.set(ctx.getImageData(0, 0, size, size).data);
    let above = 0, below = 0;
    for (let y = 4; y < size - 4; y++) for (let x = 4; x < size - 4; x++) {
      if (Math.abs(y - size / 2) < 6) continue;
      const o = ((gl ? size - 1 - y : y) * size + x) * 4;
      if (Math.max(pixels[o], pixels[o + 1], pixels[o + 2]) > 2) {
        if (y < size / 2) above++; else below++;
      }
    }
    return { above, below };
  };
  const samples = [];
  try {
    const started = performance.now();
    while (!renderer.render(root, camera, opts)) {
      if (renderer.failure || performance.now() - started > 8000) throw new Error(renderer.failure || "Gate clip renderer did not become ready");
      await new Promise(requestAnimationFrame);
    }
    for (const kind of ["bars", "glyphs"]) {
      // A different geometry record is needed when changing the source faces.
      gate.geometry = { ...geometry, faces: source.faces.filter((face) => (face.emissive > 0) === (kind === "glyphs")) };
      for (const lift of [0.5, 1.8, 2.6, 3.6]) {
        gate.position.y = lift - parent.position.y;
        gate.geometry.clipMaxY = source.clipMaxY;
        const clipped = capture();
        gate.geometry.clipMaxY = 100;
        const control = capture();
        samples.push({ kind, lift, clipped, control });
      }
    }
    return { backend: renderer.kind, floor: source.clipMinY, ceiling: source.clipMaxY, parentY: parent.position.y, samples };
  } finally { renderer.dispose(); }
};

// The custom entrance cue must clip the same world-space gate faces as the
// native renderers, including its brighter rim when glyphs are active.
export const mirrorGateClipProbe = () => {
  const BL = window.BL, S = BL.scene, size = 384, canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  const root = S.createNode(), group = S.createNode({ position: { x: 0.6, y: 0.75, z: 0 }, rotation: { x: 0, y: 0.4, z: 0 } });
  const geometry = BL.models.box({ w: 3.2, h: 6, d: 0.3, color: "#ffffff" }); geometry.clipMinY = 0; geometry.clipMaxY = 3;
  const gate = S.createNode({ geometry, position: { x: 0, y: 0.75, z: 0 } });
  // Keep the required plane and stand in the group, but hide their render
  // nodes so only the gate can contribute pixels to this clipping fixture.
  const panel = S.createNode({ geometry: BL.hubModels.mirrorPanel(), visible: false });
  const stand = S.createNode({ geometry: BL.models.box({ w: 0.2, h: 0.3, d: 0.2, color: "#ffffff" }), visible: false });
  S.addChild(root, group); S.addChild(group, gate, panel, stand);
  const provider = BL.mirrorGuides.create({ mirror: { group, node: panel }, stand });
  const camera = S.createCamera({ near: 0.1, far: 60 });
  Object.assign(camera.position, { x: 0.6, y: 3, z: 9 }); Object.assign(camera.target, { x: 0.6, y: 3, z: 0 });
  const samples = [], failures = [];
  const fail = (name, detail) => { if (failures.length < 12) failures.push({ name, ...detail }); };
  const capture = (contrast = 0) => {
    S.updateWorld(root); ctx.clearRect(0, 0, size, size); provider.draw(camera, ctx, 1, size, size, contrast);
    const pixels = ctx.getImageData(0, 0, size, size).data;
    let above = 0, below = 0, count = 0, fingerprint = 2166136261;
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      const at = (y * size + x) * 4;
      for (let channel = 0; channel < 4; channel++) fingerprint = Math.imul(fingerprint ^ pixels[at + channel], 16777619);
      if (pixels[at + 3] <= 2) continue;
      count++;
      // The horizontal camera makes the selected world-height plane lie on
      // the horizon. Leave room only for the intentionally narrow keyline.
      if (y < size / 2 - 6) above++;
      if (y > size / 2 + 6) below++;
    }
    return { above, below, count, fingerprint: fingerprint >>> 0, builds: provider.state.builds, faces: provider.state.faces, width: provider.state.width, height: provider.state.height };
  };
  let cache = null, hidden = null;
  try {
    provider.update(false, 10);
    for (const yaw of [-0.55, 0.4]) for (const contrast of [0, 1]) for (const plane of ["ceiling", "floor"]) {
      group.rotation.y = yaw; geometry.clipMinY = 0; geometry.clipMaxY = 3;
      camera.position.y = camera.target.y = plane === "ceiling" ? 3 : 0;
      const clipped = capture(contrast);
      if (plane === "ceiling") geometry.clipMaxY = Infinity; else geometry.clipMinY = -Infinity;
      const control = capture(contrast), row = { plane, yaw, contrast, clipped, control }; samples.push(row);
      const excluded = plane === "ceiling" ? "above" : "below", kept = plane === "ceiling" ? "below" : "above";
      if (clipped[excluded] || !clipped[kept] || !control[excluded] || clipped.width !== size || clipped.height !== size) fail("custom gate clipping", row);
    }
    geometry.clipMinY = 0; geometry.clipMaxY = 3; camera.position.y = camera.target.y = 3;
    const before = capture(), repeated = capture();
    geometry.clipMaxY = 2.4; const lowered = capture();
    geometry.clipMaxY = 3; const restored = capture(), contrasted = capture(1);
    cache = { before, repeated, lowered, restored, contrasted };
    if (repeated.builds !== before.builds || repeated.fingerprint !== before.fingerprint
      || lowered.builds !== repeated.builds + 1 || lowered.fingerprint === before.fingerprint
      || restored.builds !== lowered.builds + 1 || restored.fingerprint !== before.fingerprint
      || contrasted.builds !== restored.builds || contrasted.fingerprint === restored.fingerprint) fail("custom clip cache invalidation", cache);
    gate.position.y = 8; const overhead = capture(1);
    gate.position.y = -8; const underground = capture(1);
    gate.position.y = 0.75; const returned = capture(1);
    hidden = { overhead, underground, returned };
    if (overhead.count || overhead.faces || underground.count || underground.faces || !returned.count || !returned.faces || returned.fingerprint !== contrasted.fingerprint) fail("fully clipped custom gate", hidden);
  } finally { provider.dispose(); }
  return { samples, cache, hidden, failures, disposed: !provider.active() && provider.state.width === 0 && provider.state.height === 0 };
};
