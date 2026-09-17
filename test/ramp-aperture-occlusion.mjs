// Pixel-level coverage of partially blocked window cones. Expected visibility
// comes from independent ray/triangle intersections and the terrain sight grid.
export const rampApertureOcclusionProbe = () => {
  const BL = window.BL, canvas = document.createElement("canvas");
  canvas.width = 640; canvas.height = 360;
  Object.defineProperties(canvas, { clientWidth: { value: 640 }, clientHeight: { value: 360 } });
  const ctx = canvas.getContext("2d", { willReadFrequently: true }), cover = BL.cameraCover.create(canvas), camera = BL.scene.createCamera({ near: 0.1 });
  camera.fov = Math.PI / 2;
  const view = BL.math.mat4.create(), ray = new Float64Array(3), rows = [], failures = [];
  const makeSurface = (sx, sz, r, y) => {
    const v = [], tx = -sz, tz = sx;
    for (const pair of [[-7, -5], [-7, 5], [7, 5], [-7, -5], [7, 5], [7, -5]]) v.push(sx * r + tx * pair[0], y + pair[1], sz * r + tz * pair[0]);
    return { surface: new Float32Array(v), surfaceCount: 2, surfaceGroups: new Uint16Array([0, 0]), surfaceWholePhases: new Float32Array([1]), surfacePhases: new Float32Array([1]), surfaceHidden: new Uint8Array([1]), surfaceAperture: new Uint8Array([1]), surfaceWholeActive: 1, surfaceActive: 1 };
  };
  const guides = { structures: [], objectsEnabled: true, count: 0, providerCount: 0, lines: new Float32Array(0) };
  const direction = (px, py) => {
    const x = (px + 0.5 - 320) / 180, y = (180 - py - 0.5) / 180;
    ray[0] = view[0] * x + view[1] * y - view[2]; ray[1] = view[4] * x + view[5] * y - view[6]; ray[2] = view[8] * x + view[9] * y - view[10];
  };
  const draw = (surface, aperture, outside = true) => {
    surface.apertures = aperture; guides.structures[0] = surface;
    aperture.update(camera, outside); ctx.clearRect(0, 0, 640, 360); cover.draw(camera, null, false, false, () => false, () => null, guides);
    BL.math.mat4.lookAt(view, camera.position, camera.target, { x: 0, y: 1, z: 0 });
    return ctx.getImageData(0, 0, 640, 360).data;
  };
  // Thin foreground pillar, diagonal foreground ledge, and a wall behind the
  // frame. The last must not erase the clear part of the window's mask.
  const geometry = {
    verts: [-0.1, -1, -3, 0.1, -1, -3, 0.1, 1, -3, -0.1, 1, -3, -1, 0.1, -2.8, 1, 0.8, -2.8, -1, 0.8, -2.8, -2, -2, -1, 2, -2, -1, 2, 2, -1, -2, 2, -1],
    faces: [{ i: [0, 1, 2, 3] }, { i: [4, 5, 6] }, { i: [7, 8, 9, 10] }]
  };
  const fixtureWindow = { sill: -0.6, height: 1.2, flare: { frusta: [{ angle: 0, start: 2, half: 0.6, inner: false }] } };
  const aperture = BL.wallApertures.create({ windows: [fixtureWindow], island: { geometry } }), surface = makeSurface(0, -1, 0, 0);
  const triangleHit = (a, b, c, max) => {
    const v = geometry.verts, p = camera.position, ax = v[a * 3], ay = v[a * 3 + 1], az = v[a * 3 + 2];
    const ux = v[b * 3] - ax, uy = v[b * 3 + 1] - ay, uz = v[b * 3 + 2] - az, vx = v[c * 3] - ax, vy = v[c * 3 + 1] - ay, vz = v[c * 3 + 2] - az;
    const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx, den = nx * ray[0] + ny * ray[1] + nz * ray[2];
    if (Math.abs(den) < 1e-9) return false;
    const t = (nx * (ax - p.x) + ny * (ay - p.y) + nz * (az - p.z)) / den;
    if (t < camera.near || t > max) return false;
    const qx = p.x + ray[0] * t - ax, qy = p.y + ray[1] * t - ay, qz = p.z + ray[2] * t - az;
    const uu = ux * ux + uy * uy + uz * uz, uv = ux * vx + uy * vy + uz * vz, vv = vx * vx + vy * vy + vz * vz;
    const qu = qx * ux + qy * uy + qz * uz, qv = qx * vx + qy * vy + qz * vz, d = uu * vv - uv * uv;
    const u = (qu * vv - qv * uv) / d, w = (qv * uu - qu * uv) / d;
    return u >= 0 && w >= 0 && u + w <= 1;
  };
  const expected = (px, py) => {
    direction(px, py);
    const p = camera.position, t = (-2 - p.z) / ray[2], x = p.x + ray[0] * t, y = p.y + ray[1] * t;
    if (Math.abs(x) > 0.53 || Math.abs(y) > 0.53) return -1;
    for (const face of geometry.faces) for (let fan = 1; fan + 1 < face.i.length; fan++) if (triangleHit(face.i[0], face.i[fan], face.i[fan + 1], t)) return 1;
    return 0;
  };
  for (const distance of [5, 7, 9]) for (const x of [-1.5, 0, 1.5]) {
    Object.assign(camera.position, { x, y: 0.35, z: -distance }); Object.assign(camera.target, { x: 0, y: 0, z: 0 });
    const pixels = draw(surface, aperture);
    let blocked = 0, clear = 0, missing = 0, leaked = 0;
    for (let py = 40; py < 320; py += 2) for (let px = 40; px < 600; px += 2) {
      const want = expected(px, py);
      if (want < 0 || expected(px - 2, py) !== want || expected(px + 2, py) !== want || expected(px, py - 2) !== want || expected(px, py + 2) !== want) continue;
      const alpha = pixels[(py * 640 + px) * 4 + 3];
      if (want) { blocked++; if (alpha < 20) missing++; }
      else { clear++; if (alpha > 1) leaked++; }
    }
    rows.push({ kind: "synthetic", distance, x, blocked, clear, missing, leaked });
  }
  const realIsland = window.__ooga.island;
  for (const w of realIsland.headquarters.windows.filter((w) => w.kind === "ramp")) for (const offset of [-8, 8]) {
    const f = w.flare.frusta.find((f) => !f.inner), sx = Math.sin(f.angle), sz = -Math.cos(f.angle), tx = -sz, tz = sx, r = f.start;
    Object.assign(camera.position, { x: sx * 35 + tx * offset, y: w.y + 1, z: sz * 35 + tz * offset }); Object.assign(camera.target, { x: sx * r, y: w.y, z: sz * r });
    const a = BL.wallApertures.create({ windows: [w], island: realIsland }), s = makeSurface(sx, sz, r - 2, w.y), pixels = draw(s, a);
    let blocked = 0, clear = 0, missing = 0, leaked = 0;
    const sample = (px, py) => {
      direction(px, py);
      const p = camera.position, den = ray[0] * sx + ray[2] * sz, t = (r - p.x * sx - p.z * sz) / den;
      const x = p.x + ray[0] * t, y = p.y + ray[1] * t, z = p.z + ray[2] * t, across = x * tx + z * tz;
      if (Math.abs(across) > f.half - 0.1 || y < w.sill + 0.1 || y > w.sill + w.height - 0.1) return -1;
      return realIsland.sightClearAt(p.x, p.y, p.z, x - sx * 0.0001, y, z - sz * 0.0001) ? 0 : 1;
    };
    for (let py = 50; py < 310; py += 2) for (let px = 60; px < 580; px += 2) {
      const want = sample(px, py);
      if (want < 0) continue;
      // Compare solid interiors rather than antialiased edge pixels. Check
      // the whole neighborhood so thin diagonal flares cannot pass between
      // the center and four cardinal probes.
      let interior = true;
      for (let dy = -2; dy <= 2 && interior; dy += 0.5) for (let dx = -2; dx <= 2; dx += 0.5) if (sample(px + dx, py + dy) !== want) { interior = false; break; }
      if (!interior) continue;
      const alpha = pixels[(py * 640 + px) * 4 + 3];
      if (want) { blocked++; if (alpha < 20) missing++; }
      else { clear++; if (alpha > 1) leaked++; }
    }
    rows.push({ kind: "ramp", window: w.index, basement: !!w.basement, offset, blocked, clear, missing, leaked });
  }
  for (const row of rows) if (row.missing || row.leaked) failures.push(row);
  cover.dispose(); return { rows, failures };
};
