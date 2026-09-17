// Fading smoke must lose coverage without shrinking its mesh in either renderer.
export const maskSmokePixelsProbe = async (backend) => {
  const BL = window.BL, S = BL.scene, canvas = document.createElement("canvas"), size = 128;
  Object.defineProperties(canvas, { clientWidth: { value: size }, clientHeight: { value: size } });
  if (backend === "canvas2d") canvas.getContext("2d", { willReadFrequently: true });
  const renderer = (backend === "canvas2d" ? BL.canvasRenderer : BL.glRenderer).createRenderer(canvas, { quality: "high" });
  const gl = backend === "webgl2" ? canvas.getContext("webgl2") : null, context = gl ? null : canvas.getContext("2d");
  const root = S.createNode(), node = S.createNode({ geometry: BL.models.particleGeometry("#c9cbce", 1, 0.15), smokeOpacity: 1 });
  S.addChild(root, node);
  const camera = S.createCamera({ near: 0.1, far: 20 });
  camera.position.z = 3; camera.position.y = 0; camera.target.y = 0;
  const opts = { clear: [0, 0, 0], sky: [1, 1, 1], ground: [1, 1, 1], sun: [0, 0, 0], light: { x: 0, y: 1, z: 0 }, bloomStrength: 0 };
  const pixels = new Uint8Array(size * size * 4), rows = [], batchRows = [];
  try {
    const start = performance.now();
    S.updateWorld(root);
    while (!renderer.render(root, camera, opts)) {
      if (renderer.failure || performance.now() - start > 8000) throw new Error(renderer.failure || "Smoke renderer did not become ready");
      await new Promise(requestAnimationFrame);
    }
    for (const values of [rows, batchRows]) {
      if (values === batchRows) {
        node.instanceData = new Float32Array(20); node.instanceData.set(node.world);
        node.instanceData[16] = 1; node.instanceCount = 1; node.instanceVersion = 0;
      }
      for (const opacity of [1, 0.5, 0]) {
        node.smokeOpacity = opacity;
        if (node.instanceData) { node.instanceData[18] = -1 - opacity; node.instanceVersion++; }
        renderer.render(root, camera, opts);
        if (gl) gl.readPixels(0, 0, size, size, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
        else pixels.set(context.getImageData(0, 0, size, size).data);
        let light = 0;
        for (let i = 0; i < pixels.length; i += 4) light += pixels[i] + pixels[i + 1] + pixels[i + 2];
        values.push(light);
      }
    }
    return { rows, batchRows, sameSize: node.scale.x === 1 && node.scale.y === 1 && node.scale.z === 1, error: gl ? gl.getError() : 0 };
  } finally {
    renderer.dispose();
  }
};
