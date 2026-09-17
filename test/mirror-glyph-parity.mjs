// Inspect the quads actually emitted by the cue, in plane coordinates. Native
// rune geometry and the real Matrix surface settings supply the comparison.
export const mirrorGlyphParityProbe = () => {
  const B = window.__ooga, BL = window.BL, S = BL.scene, W = B.matrixCave.world;
  const group = S.createNode(), panel = S.createNode({ geometry: BL.hubModels.mirrorPanel() });
  S.addChild(group, panel); S.updateWorld(group);
  const provider = BL.mirrorGuides.create({ mirror: { group, node: panel }, stand: null });
  const camera = S.createCamera({ near: 0.1 }); camera.position.z = 10;
  Object.assign(camera.target, { x: 0, y: 0, z: 0 }); Object.assign(camera.position, { x: 0, y: 0, z: 10 });
  const unit = 10 / (240 / Math.tan(camera.fov / 2)), pitch = B.matrixCave.surfacePitch, gap = B.matrixCave.surfaceGap;
  const round = (n) => Math.round(n * 1e5), key = (rects) => rects.map((r) => [round(r.x), round(r.y)].join(",")).sort().join("|");
  const templates = [], sizes = [];
  let topPixel = -Infinity;
  for (let variant = 0; variant < 8; variant++) {
    const geometry = BL.hubModels.matrixGlyph(variant), v = geometry.verts, front = S.boundsOf(geometry).max[2], rects = [];
    for (const face of geometry.faces) {
      if (!face.i.every((i) => Math.abs(v[i * 3 + 2] - front) < 1e-6)) continue;
      const xs = face.i.map((i) => v[i * 3]), ys = face.i.map((i) => v[i * 3 + 1]);
      const x = Math.min(...xs), y = Math.min(...ys), width = Math.max(...xs) - x, height = Math.max(...ys) - y;
      if (width <= 0 || height <= 0) continue;
      sizes.push([width, height]); rects.push({ x, y }); topPixel = Math.max(topPixel, y + height / 2);
    }
    templates.push(key(rects));
  }
  const capture = (time, density = 1, inside = false) => {
    let path = [], polygon = [];
    const pixels = [], ctx = {
      save() {}, restore() {}, scale() {}, drawImage() {},
      beginPath() { path = []; polygon = []; },
      moveTo(x, y) { polygon.push(x, y); }, lineTo(x, y) { polygon.push(x, y); },
      closePath() { path.push(polygon); polygon = []; }, clip() { path = []; },
      fill() {
        for (const points of path) {
          let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
          for (let i = 0; i < points.length; i += 2) {
            const x = (points[i] - 360) * unit, y = (240 - points[i + 1]) * unit;
            minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y);
          }
          pixels.push({ x: minX, y: minY, width: maxX - minX, height: maxY - minY, alpha: this.globalAlpha,
            column: Math.round((minX + maxX) / 2 / pitch) });
        }
      }
    };
    provider.update(inside, time, density); provider.draw(camera, ctx, 1, 720, 480);
    const columns = new Map(), glyphs = [];
    for (const p of pixels) {
      if (!columns.has(p.column)) columns.set(p.column, []);
      columns.get(p.column).push(p);
    }
    for (const [column, cells] of columns) {
      const rows = [...new Set(cells.map((p) => round(p.y + p.height / 2)))].sort((a, b) => a - b), runs = [];
      for (const row of rows) {
        if (!runs.length || row - runs[runs.length - 1].at(-1) > W.pixelPitch * 1e5 * 1.5) runs.push([]);
        runs[runs.length - 1].push(row);
      }
      for (const run of runs) {
        const min = run[0] / 1e5, max = run.at(-1) / 1e5, y = max - topPixel;
        const rune = cells.filter((p) => p.y + p.height / 2 >= min - 1e-5 && p.y + p.height / 2 <= max + 1e-5);
        glyphs.push({ column, y, variant: templates.indexOf(key(rune.map((p) => ({ x: p.x - column * pitch, y: p.y - y })))), alpha: rune[0].alpha });
      }
    }
    return { pixels, columns: [...columns.keys()], glyphs, state: { ...provider.state }, version: provider.version };
  };
  try {
    const time = 12.001, dt = 0.00001, full = capture(time), advanced = capture(time + dt), mutated = capture(time + 1 / B.matrixCave.glyphCadenceHz);
    const speeds = new Map();
    let motion = full.pixels.length === advanced.pixels.length;
    for (let i = 0; i < full.pixels.length && i < advanced.pixels.length; i++) {
      const a = full.pixels[i], b = advanced.pixels[i], speed = (a.y - b.y) / dt;
      if (Math.abs(a.x - b.x) > 1e-8 || speed < W.minimumStreamSpeed - 1e-6 || speed > W.maximumStreamSpeed + 1e-6) motion = false;
      if (speeds.has(a.column) && Math.abs(speed - speeds.get(a.column)) > 1e-6) motion = false;
      speeds.set(a.column, speed);
    }
    let cadence = true, mutationPairs = 0, gapPairs = 0, gapsValid = true, completeTrains = 0, trainsValid = true;
    for (const glyph of full.glyphs) {
      const expectedY = glyph.y - speeds.get(glyph.column) / B.matrixCave.glyphCadenceHz;
      const next = mutated.glyphs.find((g) => g.column === glyph.column && Math.abs(g.y - expectedY) < 2e-5);
      if (next) { mutationPairs++; if (next.variant !== (glyph.variant + 1) % 8) cadence = false; }
    }
    for (const column of full.columns) {
      const runes = full.glyphs.filter((g) => g.column === column).sort((a, b) => a.y - b.y), runs = [[]];
      for (const rune of runes) {
        const previous = runs.at(-1).at(-1);
        if (previous) {
          const cells = Math.round((rune.y - previous.y) / gap);
          if (Math.abs(rune.y - previous.y - cells * gap) > 2e-5) gapsValid = false;
          if (cells > 1) {
            gapPairs++; if (cells - 1 < W.minimumGapLength || cells - 1 > W.maximumGapLength) gapsValid = false;
            runs.push([]);
          }
        }
        runs.at(-1).push(rune);
      }
      for (let i = 1; i + 1 < runs.length; i++) {
        completeTrains++;
        if (runs[i].length < W.minimumTrainLength || runs[i].length > W.maximumTrainLength) trainsValid = false;
        for (let r = 1; r < runs[i].length; r++) if (runs[i][r].alpha >= runs[i][r - 1].alpha) trainsValid = false;
      }
    }
    const tiers = [];
    for (const rank of [8, 5, 3, 1, 0]) {
      const captured = capture(time, rank / 8), expected = full.columns.filter((column) => (column % 8 + 8) % 8 < rank);
      tiers.push({ rank, columns: captured.columns.length, pixels: captured.pixels.length,
        matches: captured.columns.join("|") === expected.join("|") && captured.pixels.length === full.pixels.filter((p) => expected.includes(p.column)).length,
        cached: captured.state.builds === full.state.builds && captured.version === full.version });
    }
    const nativeSize = sizes.every(([width, height]) => Math.abs(width - W.pixelSize) < 1e-7 && Math.abs(height - W.pixelSize) < 1e-7);
    const size = full.pixels.every((p) => Math.abs(p.width - sizes[0][0]) < 1e-7 && Math.abs(p.height - sizes[0][1]) < 1e-7);
    const pattern = full.glyphs.every((g) => g.variant >= 0), sortedColumns = full.columns.slice().sort((a, b) => a - b);
    const spacing = sortedColumns.every((column, i) => !i || column - sortedColumns[i - 1] === 1) && full.columns.length === 41;
    const canvas = document.createElement("canvas"); canvas.width = 720; canvas.height = 480;
    const ctx = canvas.getContext("2d"), timings = [];
    for (const rank of [8, 5, 3, 1]) {
      const times = [];
      for (let n = 0; n < 18; n++) {
        provider.update(false, time + n / 60, rank / 8); ctx.clearRect(0, 0, 720, 480);
        const start = performance.now(); provider.draw(camera, ctx, 1, 720, 480);
        if (n >= 3) times.push(performance.now() - start);
      }
      times.sort((a, b) => a - b); timings.push({ rank, medianMs: times[Math.floor(times.length / 2)], maxMs: times.at(-1) });
    }
    const interior = capture(time, 1, true);
    return { nativeSize, size, pattern, spacing, motion, cadence, mutationPairs, gapPairs, gapsValid, completeTrains, trainsValid,
      glyphs: full.glyphs.length, pixels: full.pixels.length, speedMin: Math.min(...speeds.values()), speedMax: Math.max(...speeds.values()), tiers, timings,
      interiorHidden: interior.pixels.length === 0 && interior.state.activeStreams === 0 };
  } finally { provider.dispose(); }
};
