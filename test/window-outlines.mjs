// Audit the final cached mesh, including untagged voxel remnants outside the
// openings. Reveal-plane tests alone cannot detect those flat exterior faces.
export const windowOutlineProbe = () => {
  const BL = window.BL, island = window.__ooga.island, H = island.headquarters;
  const guides = BL.rockGuides.create({ island }), rows = [], margin = island.unit * Math.SQRT2;
  const camera = BL.scene.createCamera({ near: 0.1 });
  const insideBody = (context, x, y, z) => {
    const s = context.source;
    if (context.kind === "room") {
      const dx = x - s.x, dz = z - s.z, along = dx * Math.sin(s.angle) - dz * Math.cos(s.angle), across = Math.abs(dx * Math.cos(s.angle) + dz * Math.sin(s.angle));
      return y >= s.floor - margin && y <= s.ceiling + margin && along <= s.depth / 2 + margin && across <= s.width / 2 + margin;
    }
    if (context.kind === "common") return y >= H.floor - margin && y <= H.ceiling + margin && Math.hypot(x, z) <= H.gallery.radius + margin;
    let distance = Infinity, floor = 0;
    for (let n = 1; n < s.samples.length; n++) {
      const a = s.samples[n - 1], b = s.samples[n], dx = b.x - a.x, dz = b.z - a.z;
      const t = Math.max(0, Math.min(1, ((x - a.x) * dx + (z - a.z) * dz) / (dx * dx + dz * dz))), d = Math.hypot(x - a.x - t * dx, z - a.z - t * dz);
      if (d < distance) { distance = d; floor = a.y + t * (b.y - a.y); }
    }
    return distance <= s.width / 2 + margin && y >= floor - margin && y <= floor + context.height + margin;
  };
  for (const w of H.windows) {
    const context = guides.contexts.find((c) => c.windows.includes(w)), v = context.surface;
    const inOpening = (x, y, z) => w.flare.frusta.some((f) => f.planes.every((p) => p[0] * x + p[1] * y + p[2] * z <= p[3] + margin));
    let exteriorFaces = 0, originalExteriorFaces = 0;
    for (let at = 0; at < v.length; at += 9) {
      const x = (v[at] + v[at + 3] + v[at + 6]) / 3, y = (v[at + 1] + v[at + 4] + v[at + 7]) / 3, z = (v[at + 2] + v[at + 5] + v[at + 8]) / 3;
      if (inOpening(x, y, z) && !insideBody(context, x, y, z)) exteriorFaces++;
    }
    const source = island.geometry.verts;
    for (const face of island.geometry.faces) {
      if (face.headquartersWindowReveal) continue;
      let x = 0, y = 0, z = 0;
      for (const vertex of face.i) { x += source[vertex * 3]; y += source[vertex * 3 + 1]; z += source[vertex * 3 + 2]; }
      x /= face.i.length; y /= face.i.length; z /= face.i.length;
      if (inOpening(x, y, z) && !insideBody(context, x, y, z)) originalExteriorFaces++;
    }
    rows.push({ index: w.index, kind: w.kind, basement: !!w.basement, exteriorFaces, originalExteriorFaces });
  }
  const panorama = H.windows.find((w) => w.kind === "panorama"), common = guides.contexts.find((c) => c.kind === "common" && !c.basement);
  const segments = panorama.flare.frusta.map(() => 0), visibleSegments = segments.slice();
  const radius = H.gallery.radius - 2, sx = Math.sin(panorama.angle), sz = -Math.cos(panorama.angle);
  Object.assign(camera.position, { x: sx * (radius + 10), y: H.floor + 8, z: sz * (radius + 10) });
  Object.assign(camera.target, { x: sx * radius, y: H.floor + 1, z: sz * radius });
  guides.updateSurfaces(sx * radius, H.floor + 1.1, sz * radius, camera, 0.3);
  for (let group = 0; group < common.surfaceGroupCount; group++) {
    const at = group * 3, c = common.surfaceCenters, r = Math.hypot(c[at], c[at + 2]), angle = Math.atan2(c[at], -c[at + 2]);
    if (r < H.gallery.radius - margin || r > H.gallery.radius + margin || c[at + 1] <= H.floor || c[at + 1] >= panorama.sill || angle < panorama.startAngle || angle >= panorama.endAngle) continue;
    const segment = Math.floor((angle - panorama.startAngle) / (panorama.endAngle - panorama.startAngle) * segments.length);
    segments[segment]++; if (common.surfaceTargets[group] > 0) visibleSegments[segment]++;
  }
  const selection = guides.select(sx * radius, H.floor, sz * radius, camera.position.x, camera.position.y, camera.position.z);
  const result = { rows, panorama: { segments, visibleSegments, selected: selection === common }, backend: window.__ooga.renderer.kind };
  guides.dispose(); return result;
};
