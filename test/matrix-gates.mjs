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
          if (open ? delta > 1e-8 : delta < -1e-8) monotonic = false;
          if (G.gates[i].node.visible !== (next[i] > G.hiddenHeight)) visibility = false;
          if (next[i] > G.hiddenHeight && next[i] < G.visibleHeight) intermediate++;
        }
        previous = next;
      }
      return { start, immediate, end: previous, maxStep, monotonic, visibility, intermediate, duration: frames * dt, complete: previous.every((y) => y === target) };
    };
    const down = motion(true), up = motion(false);
    G.set(true);
    for (let i = 0; i < Math.ceil(0.25 / dt); i++) step();
    const falling = heights(); G.set(false); const release = heights(); step(); const rising = heights();
    G.set(true); const press = heights(); step(); const reversed = heights();
    const reversal = { falling, release, rising, press, reversed };
    G.set(false);
    for (let i = 0; i < Math.ceil(1.5 / dt); i++) step();
    const resetWave = () => {
      G.set(false); C.viewApproach();
      for (let i = 0; i < Math.ceil(2 / dt); i++) step();
    };
    resetWave();
    const initialAppearance = { inactive: !C.world.active, appeared: 0, jumps: [] };
    C.viewInside(false);
    let previous = heights();
    for (let i = 0; i < Math.ceil(2 / dt); i++) {
      step(); const next = heights();
      for (let j = 0; j < next.length; j++) if (previous[j] === G.hiddenHeight && next[j] === G.visibleHeight) { initialAppearance.appeared++; initialAppearance.jumps.push(next[j] - previous[j]); }
      previous = next;
    }
    resetWave();
    C.viewInside(false); G.set(true); step(); G.set(false);
    const early = { releasedBeforeFront: G.gates.every((gate) => C.world.radius < gate.distance), hidden: heights().every((y) => y === G.hiddenHeight), waiting: G.gates.map(() => 0), firstStep: G.gates.map(() => 0), intermediate: G.gates.map(() => 0), maxStep: 0, monotonic: true, visibility: true };
    previous = heights();
    for (let i = 0; i < Math.ceil(2 / dt); i++) {
      step(); const next = heights();
      for (let j = 0; j < next.length; j++) {
        const delta = next[j] - previous[j], gate = G.gates[j];
        early.maxStep = Math.max(early.maxStep, Math.abs(delta));
        if (delta < -1e-8) early.monotonic = false;
        if (gate.node.visible !== (next[j] > G.hiddenHeight)) early.visibility = false;
        if (C.world.radius < gate.distance && next[j] === G.hiddenHeight) early.waiting[j]++;
        if (previous[j] === G.hiddenHeight && delta > 0) early.firstStep[j] = delta;
        if (next[j] > G.hiddenHeight && next[j] < G.visibleHeight) early.intermediate[j]++;
      }
      previous = next;
    }
    early.complete = previous.every((y) => y === G.visibleHeight);
    results.push({ dt, count: G.gates.length, inside: C.inside, down, up, reversal, initialAppearance, early, settled: G.gates.every((gate) => !gate.open && !gate.raising && gate.node.position.y === G.visibleHeight) });
  }
  return results;
};

// Render the actual gate bars and their embedded glyph pixels separately. An
// unclipped control proves the below-floor region contains geometry, not empty sky.
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
  camera.position = { x: 0.6, y: 0, z: 9 }; camera.target = { x: 0.6, y: 0, z: 0 };
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
      for (const sink of [0.5, 1.8, 2.6, 3.6]) {
        gate.position.y = -0.75 - sink;
        gate.geometry.clipMinY = source.clipMinY;
        const clipped = capture();
        gate.geometry.clipMinY = -100;
        const control = capture();
        samples.push({ kind, sink, clipped, control });
      }
    }
    return { backend: renderer.kind, floor: source.clipMinY, parentY: parent.position.y, samples };
  } finally { renderer.dispose(); }
};
