// Compare the selected body's overlay against independent box rays. The wall
// opening, its foreground stone and a rear obstruction all have analytic edges.
export const rampActorOutlineProbe = () => {
  const BL = window.BL, canvas = document.createElement("canvas"); canvas.width = 640; canvas.height = 360;
  Object.defineProperties(canvas, { clientWidth: { get: () => canvas.width }, clientHeight: { get: () => canvas.height } });
  const ctx = canvas.getContext("2d", { willReadFrequently: true }), cover = BL.cameraCover.create(canvas), camera = BL.scene.createCamera({ near: 0.1 });
  const actor = BL.scene.createNode({ geometry: BL.models.box({ w: 1.6, h: 3.2, d: 0.5, color: "#ffffff" }) });
  BL.scene.updateWorld(actor); camera.fov = Math.PI / 2;
  const guides = { objectsEnabled: true, count: 1, providerCount: 0, lines: new Float32Array([3, -1, 0, 3, 1, 0]), kinds: new Uint8Array([1]), alphas: new Float32Array([1]) };
  const view = BL.math.mat4.create(), direction = new Float64Array(3), hit = new Float64Array(3), extent = [0.8, 1.6, 0.25];
  const visibility = new Int8Array(640 * 360), rows = [], controls = [], thin = [], failures = [];
  let blocker = null, contrast = 0;
  const visibleAt = (x, y, z) => {
    const p = camera.position, wall = (-2 - p.z) / (z - p.z);
    if (wall > 0 && wall < 1) {
      const wx = p.x + (x - p.x) * wall, wy = p.y + (y - p.y) * wall;
      if (Math.abs(wx) > 1 || wy < 0 || wy > 2) return false;
    }
    if (blocker) {
      const t = (blocker.z - p.z) / (z - p.z), bx = p.x + (x - p.x) * t, by = p.y + (y - p.y) * t;
      if (t > 0 && t < 1 && bx >= -3 && bx <= 0 && by >= 0 && by <= 3) return false;
    }
    return true;
  };
  // Slab intersections find the first rendered box face, independently of
  // the cover's triangle projection and visibility-mask rasterization.
  const bodyAt = (px, py) => {
    const x = (px + 0.5 - 320) / 180, y = (180 - py - 0.5) / 180, p = camera.position;
    direction[0] = view[0] * x + view[1] * y - view[2];
    direction[1] = view[4] * x + view[5] * y - view[6];
    direction[2] = view[8] * x + view[9] * y - view[10];
    let first = camera.near, last = Infinity;
    for (let axis = 0; axis < 3; axis++) {
      const origin = axis === 0 ? p.x : axis === 1 ? p.y : p.z, d = direction[axis];
      if (Math.abs(d) < 1e-12) { if (Math.abs(origin) > extent[axis]) return false; continue; }
      const a = (-extent[axis] - origin) / d, b = (extent[axis] - origin) / d;
      first = Math.max(first, Math.min(a, b)); last = Math.min(last, Math.max(a, b));
      if (first > last) return false;
    }
    hit[0] = p.x + direction[0] * first; hit[1] = p.y + direction[1] * first; hit[2] = p.z + direction[2] * first;
    return true;
  };
  const draw = (body, clear) => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    cover.draw(camera, body, false, true, () => false, () => null, guides, 0, contrast, null, clear);
    return ctx.getImageData(0, 0, canvas.width, canvas.height).data;
  };
  const samePixel = (a, b, at) => {
    for (let channel = 0; channel < 4; channel++) if (Math.abs(a[at + channel] - b[at + channel]) > 1) return false;
    return true;
  };
  for (contrast of [0, 1]) for (const distance of [6, 9]) for (const x of [-0.6, 0.6]) {
    Object.assign(camera.position, { x, y: 0.15, z: -distance }); Object.assign(camera.target, { x: 0, y: 0, z: 0 });
    BL.math.mat4.lookAt(view, camera.position, camera.target, { x: 0, y: 1, z: 0 });
    // Compositing the first offscreen rim can change Chromium's guide-stroke
    // raster. Settle that unchanged path before comparing visibility masks.
    if (!controls.length) draw(actor, null);
    const baseline = draw(actor, null), other = draw(null, null), hidden = draw(actor, () => false), exposed = draw(actor, () => true);
    const control = { contrast, distance, x, hiddenUnchanged: baseline.every((value, at) => value === hidden[at]), exposedClear: other.every((value, at) => value === exposed[at]) };
    controls.push(control);
    if (!control.hiddenUnchanged || !control.exposedClear) failures.push({ kind: "whole actor visibility", ...control });
    for (const kind of ["window", "foreground", "rear"]) {
      blocker = kind === "window" ? null : { z: kind === "foreground" ? -3 : -1 };
      const pixels = draw(actor, visibleAt);
      visibility.fill(-1);
      for (let py = 0; py < 360; py++) for (let px = 0; px < 640; px++) if (bodyAt(px, py)) visibility[py * 640 + px] = visibleAt(hit[0], hit[1], hit[2]) ? 1 : 0;
      let exposedRim = 0, hiddenRim = 0, exposedLeaks = 0, hiddenMissing = 0, newRim = 0, interior = 0, interiorLeaks = 0, guidePixels = 0, guideChanged = 0;
      for (let py = 0; py < 360; py++) for (let px = 0; px < 640; px++) {
        const index = py * 640 + px, at = index * 4;
        if (pixels[at + 3] > baseline[at + 3] + 1) newRim++;
        if (other[at + 3] > 1) { guidePixels++; if (!samePixel(pixels, other, at)) guideChanged++; }
        if (visibility[index] >= 0 && baseline[at + 3] === 0 && other[at + 3] === 0) { interior++; if (pixels[at + 3] > 1) interiorLeaks++; }
        if (baseline[at + 3] <= other[at + 3] + 2) continue;
        // The complete neighborhood avoids antialiasing and the few pixels
        // whose nearest body surface straddles a reveal or obstruction edge.
        let want = -1, mixed = false;
        for (let dy = -6; dy <= 6 && !mixed; dy++) for (let dx = -6; dx <= 6; dx++) {
          const xx = px + dx, yy = py + dy;
          if (xx < 0 || xx >= 640 || yy < 0 || yy >= 360) continue;
          const sample = visibility[yy * 640 + xx];
          if (sample < 0) continue;
          if (want < 0) want = sample;
          else if (want !== sample) { mixed = true; break; }
        }
        if (mixed || want < 0) continue;
        if (want) { exposedRim++; if (pixels[at + 3] > other[at + 3] + 1) exposedLeaks++; }
        else { hiddenRim++; if (!samePixel(pixels, baseline, at)) hiddenMissing++; }
      }
      const row = { kind, contrast, distance, x, exposedRim, hiddenRim, exposedLeaks, hiddenMissing, newRim, interior, interiorLeaks, guidePixels, guideChanged };
      rows.push(row);
      if (!exposedRim || !hiddenRim || exposedLeaks || hiddenMissing || newRim || !interior || interiorLeaks || !guidePixels || guideChanged) failures.push(row);
    }
  }
  // A detached sliver narrower than a pixel still has a Canvas silhouette.
  // Its outline must follow visibility even when no pixel center hits it.
  const sliver = BL.scene.createNode({ geometry: BL.models.box({ w: 0.005, h: 0.3, d: 0.005, color: "#ffffff" }), position: { x: 2, y: 0, z: 0 } });
  BL.scene.addChild(actor, sliver); BL.scene.updateWorld(actor);
  Object.assign(camera.position, { x: 0, y: 0, z: -6 }); Object.assign(camera.target, { x: 0, y: 0, z: 0 });
  for (contrast of [0, 1]) {
    sliver.visible = false; const bodyOnly = draw(actor, null);
    sliver.visible = true;
    const baseline = draw(actor, null), other = draw(null, null), hidden = draw(actor, () => false), exposed = draw(actor, () => true);
    let tinyRim = 0;
    for (let at = 3; at < baseline.length; at += 4) if (baseline[at] > bodyOnly[at] + 2) tinyRim++;
    const row = { contrast, tinyRim, hiddenUnchanged: baseline.every((value, at) => value === hidden[at]), exposedClear: other.every((value, at) => value === exposed[at]) };
    thin.push(row);
    if (tinyRim < 10 || !row.hiddenUnchanged || !row.exposedClear) failures.push({ kind: "subpixel part", ...row });
  }
  const resizes = [];
  for (const [width, height] of [[360, 640], [640, 360]]) {
    // Swapping dimensions preserves pixel count but changes row stride.
    canvas.width = width; canvas.height = height; draw(actor, null);
    const baseline = draw(actor, null), other = draw(null, null), hidden = draw(actor, () => false), exposed = draw(actor, () => true);
    const row = { width, height, hiddenUnchanged: baseline.every((value, at) => value === hidden[at]), exposedClear: other.every((value, at) => value === exposed[at]) };
    resizes.push(row);
    if (!row.hiddenUnchanged || !row.exposedClear) failures.push({ kind: "resize", ...row });
  }
  cover.dispose(); return { backend: window.__ooga.renderer.kind, rows, controls, thin, resizes, failures };
};
