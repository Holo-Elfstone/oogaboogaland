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
