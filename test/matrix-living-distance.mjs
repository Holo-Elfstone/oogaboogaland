// Exercise living material in the real renderers, including the outer reveal
// and retreat wave. The camera follows the sample so fog and pixel size cannot
// masquerade as a distance-dependent material change.
export const matrixLivingDistanceProbe = async (backend) => {
  const BL = window.BL, S = BL.scene, size = 256, canvas = document.createElement("canvas");
  Object.defineProperties(canvas, { clientWidth: { value: size }, clientHeight: { value: size } });
  if (backend === "canvas2d") canvas.getContext("2d", { willReadFrequently: true });
  const renderer = (backend === "webgl2" ? BL.glRenderer : BL.canvasRenderer).createRenderer(canvas, { quality: "high" });
  const gl = backend === "webgl2" ? canvas.getContext("webgl2") : null, ctx = gl ? null : canvas.getContext("2d");
  const geometry = BL.models.box({ w: 0.9, h: 1.8, d: 0.5, color: "#563521" });
  const root = S.createNode(), body = S.createNode({ geometry }); root.matrixLiving = true; S.addChild(root, body);
  const camera = S.createCamera({ near: 0.01, far: 100 });
  const opts = { clear: [0, 0, 0], sky: [0.5, 0.5, 0.5], ground: [0.2, 0.2, 0.2], sun: [0.8, 0.8, 0.8], light: { x: 0, y: 0, z: 1 }, bloomStrength: 0,
    matrix: { active: 0, radius: 0, time: 0, density: 0, permanentCave: 0, origin: new Float32Array(3), caves: new Float32Array(32) } };
  const pixels = new Uint8Array(size * size * 4);
  const place = (x, y) => {
    root.position.x = camera.position.x = camera.target.x = x;
    root.position.y = camera.position.y = camera.target.y = y;
    camera.position.z = 4; camera.target.z = 0;
  };
  const capture = (active, radius) => {
    opts.matrix.active = active; opts.matrix.radius = radius; renderer.render(root, camera, opts);
    if (gl) gl.readPixels(0, 0, size, size, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
    else pixels.set(ctx.getImageData(0, 0, size, size).data);
    let red = 0, green = 0, blue = 0, fingerprint = 2166136261, count = 0;
    for (let y = size / 2 - 16; y < size / 2 + 16; y++) for (let x = size / 2 - 16; x < size / 2 + 16; x++) {
      const at = (y * size + x) * 4, r = pixels[at], g = pixels[at + 1], b = pixels[at + 2];
      red += r; green += g; blue += b; count++;
      fingerprint = Math.imul(fingerprint ^ (r << 16 | g << 8 | b), 16777619);
    }
    return { active, radius, red: red / count, green: green / count, blue: blue / count, fingerprint: fingerprint >>> 0 };
  };
  try {
    place(80, 40);
    const started = performance.now();
    while (!renderer.render(root, camera, opts)) {
      if (renderer.failure || performance.now() - started > 8000) throw new Error(renderer.failure || "Living-distance renderer did not become ready");
      await new Promise(requestAnimationFrame);
    }
    const far = [];
    for (const x of [60, 100]) {
      place(x, 40);
      const off = capture(0, 0), reference = capture(1, 200);
      const frames = [0, 35.75, 36.25, 36.75, 37.25, 37.5, 38, 37.25, 36.75, 36.25, 35.75, 0].map((radius) => capture(1, radius));
      far.push({ x, off, reference, frames, disabled: capture(0, 38) });
    }
    place(12, 0);
    const near = { off: capture(0, 0), reference: capture(1, 200), frames: [10, 11.5, 12.5, 13.5, 14].map((radius) => capture(1, radius)) };
    place(80, 40); root.matrixLiving = false;
    const ordinary = { off: capture(0, 0), on: capture(1, 38) };
    root.matrixLiving = true;
    body.geometry = { ...geometry, matrixCave: 1, faces: geometry.faces.map((face) => ({ ...face, matrixCave: 1 })) };
    opts.matrix.caves[0] = 1; opts.matrix.caves[2] = 82;
    const cave = { off: capture(0, 0), notReached: capture(1, 38), reached: capture(1, 200) };
    opts.matrix.permanentCave = 1; cave.permanent = capture(0, 0);
    return { backend: renderer.kind, far, near, ordinary, cave };
  } finally { renderer.dispose(); }
};
