// The three sealed mouths must be closed stone volumes fitted to the native
// rim, rather than independently outlined decorative front fragments.
export const sealedCaveBlocksProbe = async (backend) => {
  const BL = window.BL, B = window.__ooga, S = BL.scene, EPS = 0.0001, failures = [];
  const fail = (kind, detail) => { if (failures.length < 16) failures.push({ kind, ...detail }); };
  const contains = (a, b, c, x, y) => {
    const ux = b[0] - a[0], uy = b[1] - a[1], vx = c[0] - a[0], vy = c[1] - a[1], dx = x - a[0], dy = y - a[1], det = ux * vy - uy * vx;
    if (Math.abs(det) < 1e-10) return false;
    const u = (dx * vy - dy * vx) / det, v = (ux * dy - uy * dx) / det;
    return u >= -EPS && v >= -EPS && u + v <= 1 + EPS;
  };
  const triangles = (geometry) => {
    const rows = [], v = geometry.verts;
    for (const face of geometry.faces) for (let fan = 1; fan + 1 < face.i.length; fan++) rows.push([face.i[0], face.i[fan], face.i[fan + 1]].map((at) => [v[at * 3], v[at * 3 + 1], v[at * 3 + 2]]));
    return rows;
  };
  const audit = (rows, bounds, outline) => {
    const faces = Array.from({ length: 6 }, () => []), areas = new Float64Array(6);
    let outside = 0, internal = 0, missing = 0, samples = 0;
    for (const row of rows) {
      const [a, b, c] = row, u = b.map((v, i) => v - a[i]), v = c.map((v, i) => v - a[i]);
      const normal = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
      if (row.some((p) => p.some((value, axis) => value < bounds[axis] - EPS || value > bounds[axis + 3] + EPS))) { if (outline) outside++; continue; }
      let boundary = false;
      for (let axis = 0; axis < 3; axis++) for (let side = 0; side < 2; side++) {
        const plane = bounds[axis + side * 3];
        if (!row.every((p) => Math.abs(p[axis] - plane) < EPS)) continue;
        boundary = true;
        // Back faces of decorative moss lie on the front of the core, but
        // cannot count twice toward its independently closed stone shell.
        if (!outline && normal[axis] * (side ? 1 : -1) <= 0) continue;
        const h = (axis + 1) % 3, k = (axis + 2) % 3, slot = axis * 2 + side;
        faces[slot].push(row.map((p) => [p[h], p[k]])); areas[slot] += Math.abs(normal[axis]) / 2;
      }
      if (!boundary) internal++;
    }
    for (let axis = 0; axis < 3; axis++) for (let side = 0; side < 2; side++) {
      const h = (axis + 1) % 3, k = (axis + 2) % 3, slot = axis * 2 + side;
      for (let y = 0; y <= 24; y++) for (let x = 0; x <= 40; x++) {
        const px = bounds[h] + (bounds[h + 3] - bounds[h]) * x / 40, py = bounds[k] + (bounds[k + 3] - bounds[k]) * y / 24;
        samples++; if (!faces[slot].some((row) => contains(row[0], row[1], row[2], px, py))) missing++;
      }
    }
    return { triangles: rows.length, samples, missing, outside, internal, areas: Array.from(areas) };
  };
  const size = 384, canvas = document.createElement("canvas");
  Object.defineProperties(canvas, { clientWidth: { value: size }, clientHeight: { value: size } });
  if (backend === "canvas2d") canvas.getContext("2d", { willReadFrequently: true });
  const renderer = (backend === "webgl2" ? BL.glRenderer : BL.canvasRenderer).createRenderer(canvas, { quality: "high" });
  const gl = backend === "webgl2" ? canvas.getContext("webgl2") : null, ctx = gl ? null : canvas.getContext("2d");
  const root = S.createNode(), rim = S.createNode({ geometry: BL.hubModels.caveMouthRim(), position: { x: 0, y: 0, z: 0.5 } });
  const sealNode = S.createNode({ position: { x: 0, y: 0, z: 0.52 } });
  const backdrop = S.createNode({ geometry: BL.models.box({ w: 16, h: 12, d: 0.05, color: "#ff00ff", emissive: 1 }), position: { x: 0, y: 1.5, z: -3 } });
  S.addChild(root, backdrop, rim, sealNode);
  const camera = S.createCamera({ near: 0.01, far: 100 }); camera.target = { x: 0, y: 1.5, z: 0.5 };
  const opts = { clear: [0, 0, 0], sky: [0.6, 0.6, 0.6], ground: [0.4, 0.4, 0.4], sun: [0.6, 0.6, 0.6], light: { x: 0.25, y: 0.7, z: 1 }, bloomStrength: 0 };
  const pixels = new Uint8Array(size * size * 4), seams = [[-2.8, 0.1, 2.8, 2.9], [-2.4, 2.8, 2.4, 3.35]], variants = [];
  const overlay = document.createElement("canvas"); overlay.width = overlay.height = size;
  Object.defineProperties(overlay, { clientWidth: { value: size }, clientHeight: { value: size } });
  const overlayCtx = overlay.getContext("2d", { willReadFrequently: true }), cover = BL.cameraCover.create(overlay);
  const structural = { surface: null, surfaceCount: 0, surfaceGroups: null, surfaceWholePhases: new Float32Array([1]), surfacePhases: new Float32Array([1]), surfaceHidden: new Uint8Array([1]), surfaceWholeActive: 1, surfaceActive: 1, surfaceVersion: 0 };
  const guideSet = { structures: [structural], objectsEnabled: true, count: 0, providerCount: 0 }, noRock = () => false, noMaterial = () => null;
  const rimTriangles = triangles(rim.geometry);
  const capture = (angle) => {
    camera.position = { x: Math.sin(angle) * 11, y: 2.1, z: 0.5 + Math.cos(angle) * 11 };
    backdrop.position.z = Math.cos(angle) > 0 ? -3 : 4;
    renderer.render(root, camera, opts);
    if (gl) gl.readPixels(0, 0, size, size, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
    else pixels.set(ctx.getImageData(0, 0, size, size).data);
    overlayCtx.clearRect(0, 0, size, size); cover.draw(camera, null, false, false, noRock, noMaterial, guideSet, 0);
    const outlinePixels = overlayCtx.getImageData(0, 0, size, size).data;
    let samples = 0, leaks = 0, outlineLeaks = 0, innerRims = 0, fingerprint = 2166136261;
    for (const [x0, y0, x1, y1] of seams) {
      const quad = [[x0, y0], [x1, y0], [x1, y1], [x0, y1]].map(([x, y]) => { const p = {}; renderer.project(x, y, 0.5, p); return [p.x, p.y]; });
      const left = Math.max(0, Math.ceil(Math.min(...quad.map((p) => p[0])))), right = Math.min(size - 1, Math.floor(Math.max(...quad.map((p) => p[0]))));
      const top = Math.max(0, Math.ceil(Math.min(...quad.map((p) => p[1])))), bottom = Math.min(size - 1, Math.floor(Math.max(...quad.map((p) => p[1]))));
      for (let y = top; y <= bottom; y++) for (let x = left; x <= right; x++) {
        if (!contains(quad[0], quad[1], quad[2], x + 0.5, y + 0.5) && !contains(quad[0], quad[2], quad[3], x + 0.5, y + 0.5)) continue;
        const at = ((gl ? size - 1 - y : y) * size + x) * 4, r = pixels[at], g = pixels[at + 1], b = pixels[at + 2];
        samples++; if (r > 170 && b > 170 && g < 80) leaks++;
        const opacity = outlinePixels[(y * size + x) * 4 + 3];
        if (opacity < 3) outlineLeaks++;
        if (opacity > 50) innerRims++;
        fingerprint = Math.imul(fingerprint ^ (r << 16 | g << 8 | b), 16777619);
      }
    }
    return { angle, samples, leaks, outlineLeaks, innerRims, fingerprint: fingerprint >>> 0 };
  };
  try {
    camera.position = { x: 0, y: 2.1, z: 11.5 }; sealNode.geometry = BL.hubModels.sealedCaveFace(0);
    const started = performance.now();
    while (!renderer.render(root, camera, opts)) {
      if (renderer.failure || performance.now() - started > 8000) throw new Error(renderer.failure || "Sealed-cave renderer did not become ready");
      await new Promise(requestAnimationFrame);
    }
    for (const seal of B.matrixGate.sealed) {
      const geometry = seal.node.geometry, b = geometry.sealBounds, m = seal.mouth, sr = Math.sin(m.ry), cr = Math.cos(m.ry);
      const bounds = [b.minX, b.minY, b.minZ, b.maxX, b.maxY, b.maxZ], core = audit(triangles(geometry), bounds, false);
      const opening = B.cameraCave.openings.find((entry) => entry.id === m.id), frame = seal.node.parent.children.find((node) => node.geometry?.openingBounds);
      const fit = !!frame && Math.abs(bounds[0] - frame.geometry.openingBounds.minX) < EPS && Math.abs(bounds[3] - frame.geometry.openingBounds.maxX) < EPS
        && Math.abs(bounds[1] - frame.geometry.openingBounds.floorY) < EPS && Math.abs(bounds[4] - frame.geometry.openingBounds.ceilingY) < EPS
        && Math.abs(seal.node.position.z + bounds[2] - frame.position.z - frame.geometry.openingBounds.minZ) < EPS
        && Math.abs(seal.node.position.z + bounds[5] - frame.position.z - frame.geometry.openingBounds.maxZ) < EPS;
      const context = B.headquarters.rockGuides.contexts.find((entry) => entry.kind === "sealed" && entry.source.id === m.id), rows = [];
      if (context) for (let at = 0; at < context.surface.length; at += 9) {
        const points = [];
        for (let n = 0; n < 3; n++) {
          const i = at + n * 3, x = context.surface[i] - m.x, z = context.surface[i + 2] - m.z;
          points.push([x * cr - z * sr, context.surface[i + 1] - m.floorY, x * sr + z * cr - seal.node.position.z]);
        }
        rows.push(points);
      }
      const outline = audit(rows, bounds, true), walls = context?.walls.length || 0;
      const blocked = !!opening?.blocked && Math.abs(opening.stopZ - seal.stopZ) < EPS;
      sealNode.geometry = geometry;
      // Feed the production overlay the real registered seal triangles and
      // native rim triangles in one local frame. The union must stay filled
      // at their shared joint without inventing internal silhouette edges.
      const surface = [];
      for (const row of rows) for (const p of row) surface.push(p[0], p[1], p[2] + sealNode.position.z);
      for (const row of rimTriangles) for (const p of row) surface.push(p[0], p[1], p[2] + rim.position.z);
      structural.surface = new Float32Array(surface); structural.surfaceCount = surface.length / 9;
      structural.surfaceGroups = new Uint16Array(structural.surfaceCount); structural.surfaceVersion++;
      const views = [0, -0.85, 0.85, Math.PI, Math.PI - 0.85, Math.PI + 0.85].map(capture);
      const row = { id: m.id, fit, blocked, core, outline, walls, views }; variants.push(row);
      const areas = [3, 3, 5, 5, 15, 15];
      if (!fit || !blocked || core.missing || core.internal || core.areas.some((area, i) => Math.abs(area - areas[i]) > EPS)) fail("incomplete stone core or rim joint", { id: m.id, fit, blocked, core });
      if (!context || walls !== 1 || outline.missing || outline.outside || outline.internal || outline.areas.some((area, i) => Math.abs(area - areas[i]) > 0.001)) fail("fragmented seal outline", { id: m.id, outline, walls });
      if (views.some((view) => view.samples < 1000 || view.leaks || view.outlineLeaks || view.innerRims)) fail("visible seal or rim slit", { id: m.id, views });
    }
    const accessible = B.cameraCave.openings.filter((opening) => !opening.blocked);
    const closedOpenings = accessible.filter((opening) => B.headquarters.rockGuides.contexts.some((context) => context.kind === "sealed" && context.source.id === opening.id)).map((opening) => opening.id);
    if (variants.length !== 3 || closedOpenings.length) fail("incorrect sealed cave registry", { count: variants.length, closedOpenings });
    return { backend: renderer.kind, variants, accessible: accessible.length, closedOpenings, failures };
  } finally { cover.dispose(); renderer.dispose(); }
};
