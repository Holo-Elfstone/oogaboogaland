// Exercise the real sky shader at flight heights, with a fixed celestial clock.
export const skyAltitudeProbe = async () => {
  const B = window.__ooga, BL = window.BL, S = BL.scene, size = 256;
  const canvas = document.createElement("canvas");
  Object.defineProperties(canvas, { clientWidth: { value: size }, clientHeight: { value: size } });
  const renderer = BL.glRenderer.createRenderer(canvas, { quality: "low" });
  const gl = canvas.getContext("webgl2"), root = S.createNode(), camera = S.createCamera({ fov: 65, near: 0.02, far: 300 });
  const opts = { ...B.renderOpts, sun: [0, 0, 0], moon: { x: 0, y: -1, z: 0 }, stars: 1, time: 0, bloomStrength: 0, matrix: null };
  const pixels = new Uint8Array(size * size * 4);
  const point = (x, y, z, yaw = 0, pitch = 0.55) => {
    Object.assign(camera.position, { x, y, z });
    Object.assign(camera.target, { x: x + Math.sin(yaw) * Math.cos(pitch), y: y + Math.sin(pitch), z: z - Math.cos(yaw) * Math.cos(pitch) });
  };
  const capture = () => {
    renderer.render(root, camera, opts);
    gl.readPixels(0, 0, size, size, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
    return pixels.slice();
  };
  const compare = (a, b, firstRow = 0) => {
    let changed = 0, max = 0, total = 0;
    for (let i = firstRow * size * 4; i < a.length; i += 4) {
      const delta = Math.max(Math.abs(a[i] - b[i]), Math.abs(a[i + 1] - b[i + 1]), Math.abs(a[i + 2] - b[i + 2]));
      if (delta) changed++;
      max = Math.max(max, delta); total += delta;
    }
    return { changed, max, mean: total / (size * (size - firstRow)) };
  };
  try {
    point(0, 2, 0);
    const started = performance.now();
    while (!renderer.render(root, camera, opts)) {
      if (performance.now() - started > 10000) throw new Error("Sky renderer did not become ready");
      await new Promise(requestAnimationFrame);
    }
    const base = capture();
    opts.stars = 0;
    const dark = capture();
    opts.stars = 1;
    let starPixels = 0;
    for (let i = 0; i < base.length; i += 4) if (base[i] > dark[i] + 12 || base[i + 1] > dark[i + 1] + 12 || base[i + 2] > dark[i + 2] + 12) starPixels++;
    const positions = [[0, -60, 0], [0, 0, 0], [0, 35, 0], [0, 72, 0], [140, 72, -140], [-140, 72, 140]];
    // The upper sky is above the haze at every altitude. Lower stars can
    // brighten as the observer rises through that fixed atmospheric layer.
    const translations = positions.map(([x, y, z]) => { point(x, y, z); return { position: [x, y, z], ...compare(base, capture(), Math.ceil(size * 2 / 3)) }; });
    point(0, 2, 0, 0.4);
    const yaw = compare(base, capture());
    point(0, 2, 0, 0, 0.9);
    const pitch = compare(base, capture());
    point(0, 2, 0);
    B.setHour(23, NaN, 80);
    BL.scenes.hub.update(0, B.renderOpts.matrix.time);
    const sidereal = compare(base, capture());
    const haze = [];
    for (const height of [2, 20, 40, 72]) {
      point(0, height, 0, 0, 0);
      opts.stars = 1; const lit = capture();
      opts.stars = 0; const unlit = capture();
      let count = 0, below = 0, peak = -1, horizonRow = 0;
      for (let y = 0; y < size; y++) {
        let row = 0;
        for (let x = 0; x < size; x++) {
          const i = (y * size + x) * 4;
          if (Math.max(lit[i] - unlit[i], lit[i + 1] - unlit[i + 1], lit[i + 2] - unlit[i + 2]) > 12) { count++; if (y < size / 2) below++; }
          row += unlit[i] + unlit[i + 1] + unlit[i + 2];
        }
        if (row > peak) { peak = row; horizonRow = y; }
      }
      haze.push({ height, stars: count, below, horizonRow });
    }
    return { starPixels, translations, yaw, pitch, sidereal, haze, backend: renderer.kind };
  } finally { renderer.dispose(); }
};

export const canvasHazeProbe = () => {
  const BL = window.BL, S = BL.scene, size = 128, canvas = document.createElement("canvas");
  Object.defineProperties(canvas, { clientWidth: { value: size }, clientHeight: { value: size } });
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  const renderer = BL.canvasRenderer.createRenderer(canvas, { width: size, height: size }), root = S.createNode(), camera = S.createCamera();
  const opts = { ...window.__ooga.renderOpts, matrix: null }, rows = [];
  try {
    for (const height of [2, 20, 40, 72, 2]) {
      Object.assign(camera.position, { x: 0, y: height, z: 0 });
      Object.assign(camera.target, { x: 0, y: height, z: -1 });
      renderer.render(root, camera, opts);
      const pixels = ctx.getImageData(0, 0, size, size).data;
      let peak = -1, horizonRow = 0;
      for (let y = 0; y < size; y++) {
        const i = (y * size + size / 2) * 4, brightness = pixels[i] + pixels[i + 1] + pixels[i + 2];
        if (brightness > peak) { peak = brightness; horizonRow = y; }
      }
      rows.push({ height, horizonRow, bottom: Array.from(pixels.slice((size * size - 1) * 4, (size * size - 1) * 4 + 3)) });
    }
    return { rows, backend: renderer.kind };
  } finally { renderer.dispose(); }
};
