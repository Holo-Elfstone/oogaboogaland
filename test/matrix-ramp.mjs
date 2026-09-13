// Compare the actual HQ entrance triangles with the continuous material used by
// the rest of each ramp. Read pixels from isolated native geometry so neighboring
// walls or falling glyphs cannot stand in for missing floor coverage.
export const matrixRampGlyphProbe = async (backend) => {
  const BL = window.BL, B = window.__ooga, S = BL.scene, size = 384, canvas = document.createElement("canvas");
  Object.defineProperties(canvas, { clientWidth: { value: size }, clientHeight: { value: size } });
  if (backend === "canvas2d") canvas.getContext("2d", { willReadFrequently: true });
  const renderer = (backend === "webgl2" ? BL.glRenderer : BL.canvasRenderer).createRenderer(canvas, { quality: "high" });
  const gl = backend === "webgl2" ? canvas.getContext("webgl2") : null, ctx = gl ? null : canvas.getContext("2d");
  const source = B.island.geometry, faces = source.faces.filter((face) => face.headquartersRamp);
  const geometry = { verts: source.verts, faces, lines: [], castShadow: false };
  const control = { ...geometry, faces: faces.map((face) => ({ ...face, matrixCave: 0, matrixLocalGlyphSurface: false, matrixWorldGlyphSurface: false })) };
  const root = S.createNode(), floor = S.createNode({ geometry }); S.addChild(root, floor);
  const camera = S.createCamera({ near: 0.01, far: 100 });
  const opts = { clear: [0, 0, 0], sky: [0.5, 0.5, 0.5], ground: [0.2, 0.2, 0.2], sun: [0.8, 0.8, 0.8], light: { x: 0, y: 1, z: 0 }, bloomStrength: 0,
    matrix: { ...B.renderOpts.matrix, active: 1, radius: 100, time: 0.5055, permanentCave: 0 } };
  const pixels = new Uint8Array(size * size * 4), capture = () => {
    renderer.render(root, camera, opts);
    if (gl) gl.readPixels(0, 0, size, size, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
    else pixels.set(ctx.getImageData(0, 0, size, size).data);
    let green = 0, fingerprint = 2166136261;
    for (let y = 64; y < size - 64; y++) for (let x = 64; x < size - 64; x++) {
      const i = (y * size + x) * 4, r = pixels[i], g = pixels[i + 1], b = pixels[i + 2];
      if (g > 32 && g > r * 1.15 && g > b * 1.15) green++;
      fingerprint = Math.imul(fingerprint ^ (r << 16 | g << 8 | b), 16777619);
    }
    return { green, fingerprint: fingerprint >>> 0 };
  };
  const samples = [], owners = B.island.headquarters.ramps.map((ramp) => {
    const cave = B.matrixCave.caves.find((cave) => cave.id === ramp.id).caveIndex, owned = faces.filter((face) => face.matrixCave === cave);
    return { id: ramp.id, cave, faces: owned.length, continuous: owned.filter((face) => face.matrixWorldGlyphSurface && !face.matrixLocalGlyphSurface).length };
  });
  try {
    camera.position = { x: 0, y: 5, z: 0.01 }; camera.target = { x: 0, y: 0, z: 0 };
    const started = performance.now();
    while (!renderer.render(root, camera, opts)) {
      if (renderer.failure || performance.now() - started > 8000) throw new Error(renderer.failure || "Ramp glyph renderer did not become ready");
      await new Promise(requestAnimationFrame);
    }
    for (const ramp of B.island.headquarters.ramps) for (const distance of [0.2, 1.5, 3.5, 5.5]) {
      let station = 0, point = null;
      for (let i = 1; i < ramp.samples.length; i++) {
        const a = ramp.samples[i - 1], b = ramp.samples[i], length = Math.hypot(b.x - a.x, b.z - a.z);
        if (station + length >= distance) { const k = (distance - station) / length; point = { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k, z: a.z + (b.z - a.z) * k }; break; }
        station += length;
      }
      camera.target = point; camera.position = { x: point.x, y: point.y + 3.5, z: point.z + 0.02 };
      opts.matrix.active = 0; opts.matrix.radius = 0; floor.geometry = geometry;
      const inactive = capture();
      floor.geometry = control; const inactiveReference = capture();
      opts.matrix.active = 1; opts.matrix.radius = 100;
      const frames = [];
      for (const time of [0.5055, 0.543]) {
        opts.matrix.time = time; floor.geometry = geometry; const actual = capture(), saved = pixels.slice();
        floor.geometry = control; const reference = capture();
        let difference = 0;
        for (let i = 0; i < pixels.length; i++) difference += Math.abs(pixels[i] - saved[i]);
        frames.push({ time, actual, reference, meanDifference: difference / pixels.length });
      }
      samples.push({ id: ramp.id, distance, inactive, inactiveReference, frames });
    }
    return { backend: renderer.kind, owners, samples };
  } finally { renderer.dispose(); }
};
