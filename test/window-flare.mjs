export const windowFlareProbe = () => {
  const B = window.__ooga, island = B.island, H = island.headquarters, geometry = island.geometry, failures = [];
  const family = (w) => w.kind === "panorama" ? "panorama" : `${w.basement ? "basement" : "HQ"} ${w.kind}`;
  const families = {};
  for (const w of H.windows) { const name = family(w); families[name] = (families[name] || 0) + 1; }
  let faces = 0, samples = 0, sweeps = 0, sloped = 0;
  for (const face of geometry.faces) {
    if (!face.headquartersWindowReveal) continue;
    if (face.i.length > 7 && failures.length < 12) failures.push({ kind: "Canvas polygon capacity", vertices: face.i.length });
    for (let triangle = 1; triangle < face.i.length - 1; triangle++) {
      faces++;
      const a = face.i[0] * 3, b = face.i[triangle] * 3, c = face.i[triangle + 1] * 3, v = geometry.verts;
      const ux = v[b] - v[a], uy = v[b + 1] - v[a + 1], uz = v[b + 2] - v[a + 2], vx = v[c] - v[a], vy = v[c + 1] - v[a + 1], vz = v[c + 2] - v[a + 2];
      let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
      const area = Math.hypot(nx, ny, nz);
      if (area < 1e-10) { failures.push({ kind: "degenerate", face: faces }); continue; }
      nx /= area; ny /= area; nz /= area;
      if (Math.abs(ny) > 0.01 && Math.abs(ny) < 0.9999) sloped++;
      if (faces % 11) continue;
      const x = (v[a] + v[b] + v[c]) / 3, y = (v[a + 1] + v[b + 1] + v[c + 1]) / 3, z = (v[a + 2] + v[b + 2] + v[c + 2]) / 3;
      // A reveal can meet the last sliver of an outer cliff voxel. Stay close
      // enough to test that face instead of stepping through its entire rock.
      const inward = island.solidAt(x - nx * 1e-5, y - ny * 1e-5, z - nz * 1e-5), outward = island.solidAt(x + nx * 1e-5, y + ny * 1e-5, z + nz * 1e-5);
      samples++;
      if ((!inward || outward) && failures.length < 12) failures.push({ kind: "mesh/rock", x, y, z, inward, outward });
      if (area > 0.005 && faces % 77 === 0) {
        sweeps++;
        if (island.voxelSegmentClearAt(x + nx * 0.06, y + ny * 0.06 - 0.005, z + nz * 0.06, x - nx * 0.04, y - ny * 0.04 - 0.005, z - nz * 0.04, 0.005, 0.01) && failures.length < 12) failures.push({ kind: "swept reveal", x, y, z });
      }
    }
  }
  const aperture = H.windows.find((w) => w.kind === "room" && w.basement && w.roomIndex === 0), f = aperture.flare.frusta[0];
  const sx = Math.sin(f.angle), sz = -Math.cos(f.angle), tx = -sz, tz = sx, middle = (f.start + aperture.flare.edge) / 2;
  const across = aperture.width / 2 + 0.1, x = sx * middle + tx * across, z = sz * middle + tz * across, y = aperture.sill + aperture.height / 2;
  const enlargedAim = { across, oldHalfWidth: aperture.width / 2, widthHere: f.half + f.horizontal * (middle - f.start), clear: island.clearAt(x, y - 0.4, z, 0.3, 0.8) };
  let floorSamples = 0, ceilingSamples = 0, floorError = 0, ceilingError = 0;
  for (let radius = f.start + 0.5; radius < aperture.flare.edge - 0.5; radius += 0.02) {
    const x = sx * radius, z = sz * radius, expectedFloor = aperture.sill - f.vertical * (radius - f.start), expectedCeiling = aperture.sill + aperture.height + f.vertical * (radius - f.start);
    const floor = island.supportAt(x, z, y, 0, -120), ceiling = island.ceilingAt(x, expectedFloor + 0.05, z);
    if (floor > -120) { floorSamples++; floorError = Math.max(floorError, Math.abs(floor - expectedFloor)); }
    if (ceiling < Infinity) { ceilingSamples++; ceilingError = Math.max(ceilingError, Math.abs(ceiling - expectedCeiling)); }
  }
  // Intersect each real tapered aperture with concentric shell sections.
  // This derives angular bounds from its side planes, independently of the
  // construction's approximate arc-gap budget, and includes panorama sectors.
  const halfAngle = (f, radius) => Math.min(Math.acos(Math.min(1, f.start / radius)), Math.atan(f.horizontal) + Math.asin((f.half - f.horizontal * f.start) / (radius * Math.hypot(1, f.horizontal))));
  let separationSamples = 0, pairs = 0, neighborGap = Infinity, stackedGap = Infinity;
  for (let i = 0; i < H.windows.length; i++) for (let j = i + 1; j < H.windows.length; j++) {
    const a = H.windows[i], b = H.windows[j];
    let inspected = false;
    for (const af of a.flare.frusta) for (const bf of b.flare.frusta) {
      if (af.inner || bf.inner) continue;
      const angle = Math.abs(Math.atan2(Math.sin(af.angle - bf.angle), Math.cos(af.angle - bf.angle))), start = Math.max(af.start, bf.start), end = Math.min(a.flare.edge, b.flare.edge);
      if (start >= end || angle > Math.PI / 2) continue;
      const steps = Math.ceil((end - start) / 0.05);
      for (let n = 0; n <= steps; n++) {
        const radius = start + (end - start) * n / steps;
        const horizontal = 2 * radius * Math.sin(Math.max(0, angle - halfAngle(af, radius) - halfAngle(bf, radius)) / 2);
        const aLow = a.sill - af.vertical * (radius - af.start), aHigh = a.sill + a.height + af.vertical * (radius - af.start);
        const bLow = b.sill - bf.vertical * (radius - bf.start), bHigh = b.sill + b.height + bf.vertical * (radius - bf.start);
        const vertical = Math.max(0, aLow - bHigh, bLow - aHigh), gap = Math.hypot(horizontal, vertical);
        separationSamples++; inspected = true;
        if (vertical < 1e-6) neighborGap = Math.min(neighborGap, gap);
        else if (horizontal < 1e-6) stackedGap = Math.min(stackedGap, gap);
        if (gap < H.rockCover - 1e-6 && failures.length < 12) failures.push({ kind: "aperture separation", a: i, b: j, radius, gap });
      }
    }
    if (inspected) pairs++;
  }
  // Ray-test the rendered terrain independently of collision, looking from
  // every room across the inner aperture. Stray retained wall triangles must
  // not hide an opening whose physical air is clear.
  let roomViews = 0, roomViewRays = 0;
  for (const w of H.windows) {
    if (w.kind !== "room") continue;
    const room = (w.basement ? H.basement : H).rooms.find((r) => r.index === w.roomIndex), sx = Math.sin(w.angle), sz = -Math.cos(w.angle);
    roomViews++;
    for (const across of [-w.width / 2 + 0.2, 0, w.width / 2 - 0.2]) for (const height of [0.2, w.height / 2, w.height - 0.2]) for (const exterior of [false, true]) {
      const frame = Math.hypot(w.x, w.z) + 0.05, frameX = sx * frame - sz * across, frameZ = sz * frame + sx * across;
      const fromX = exterior ? frameX : room.x, fromZ = exterior ? frameZ : room.z;
      const x = exterior ? sx * (w.flare.edge + 0.25) - sz * across : frameX, z = exterior ? sz * (w.flare.edge + 0.25) + sx * across : frameZ, y = w.sill + height, dx = x - fromX, dz = z - fromZ;
      roomViewRays++;
      if (!island.voxelSegmentClearAt(fromX, y - 0.025, fromZ, x, y - 0.025, z, 0.025, 0.05) && failures.length < 12) failures.push({ kind: "room window wall", window: w.index, across, height, exterior });
      for (const face of geometry.faces) for (let n = 1; n < face.i.length - 1; n++) {
        const ai = face.i[0] * 3, bi = face.i[n] * 3, ci = face.i[n + 1] * 3, v = geometry.verts;
        if (y < Math.min(v[ai + 1], v[bi + 1], v[ci + 1]) || y > Math.max(v[ai + 1], v[bi + 1], v[ci + 1])) continue;
        const ax = v[ai], ay = v[ai + 1], az = v[ai + 2], ux = v[bi] - ax, uy = v[bi + 1] - ay, uz = v[bi + 2] - az, vx = v[ci] - ax, vy = v[ci + 1] - ay, vz = v[ci + 2] - az;
        const px = -dz * vy, py = dz * vx - dx * vz, pz = dx * vy, determinant = ux * px + uy * py + uz * pz;
        if (Math.abs(determinant) < 1e-9) continue;
        const tx = fromX - ax, ty = y - ay, tz = fromZ - az, u = (tx * px + ty * py + tz * pz) / determinant;
        if (u < 0 || u > 1) continue;
        const qx = ty * uz - tz * uy, qy = tz * ux - tx * uz, qz = tx * uy - ty * ux, vWeight = (dx * qx + dz * qz) / determinant;
        if (vWeight < 0 || u + vWeight > 1) continue;
        const t = (vx * qx + vy * qy + vz * qz) / determinant;
        if (t > 1e-6 && t < 1 - 1e-6 && failures.length < 12) failures.push({ kind: "rendered room window wall", window: w.index, across, height, exterior, x: fromX + dx * t, y, z: fromZ + dz * t });
      }
    }
  }
  const rampFrames = [];
  const clipPolygon = (points, plane) => {
    const out = [];
    for (let i = 0; i < points.length; i++) {
      const a = points[i], b = points[(i + 1) % points.length], da = a[0] * plane[0] + a[1] * plane[1] + a[2] * plane[2] - plane[3], db = b[0] * plane[0] + b[1] * plane[1] + b[2] * plane[2] - plane[3];
      if (da <= 1e-8) out.push(a);
      if ((da < 0 && db > 0) || (da > 0 && db < 0)) {
        const t = da / (da - db);
        out.push(a.map((v, axis) => v + (b[axis] - v) * t));
      }
    }
    return out;
  };
  for (const w of H.windows) {
    if (w.kind !== "ramp") continue;
    const floorFaces = geometry.faces.filter((f) => w.basement ? f.headquartersBasementRamp || f.i.every((i) => Math.abs(geometry.verts[i * 3 + 1] - H.basement.floor) < 1e-8) : f.headquartersRamp);
    const sx = Math.sin(w.angle), sz = -Math.cos(w.angle), radius = Math.hypot(w.x, w.z);
    let clearance = Infinity, missing = 0, throatClearance = Infinity, floorExtent = -Infinity, floorPieces = 0, intersections = 0;
    const throat = w.flare.frusta.find((f) => f.inner), flare = w.flare.frusta.find((f) => !f.inner);
    const throatPlanes = [[-sx, 0, -sz, -radius], [sx, 0, sz, throat.end], [-sz, 0, sx, w.width / 2], [sz, 0, -sx, w.width / 2]];
    for (const f of floorFaces) for (let n = 1; n < f.i.length - 1; n++) {
      const triangle = [f.i[0], f.i[n], f.i[n + 1]].map((i) => Array.from(geometry.verts.slice(i * 3, i * 3 + 3)));
      const [a, b, c] = triangle;
      if ((b[0] - a[0]) * (c[2] - a[2]) - (b[2] - a[2]) * (c[0] - a[0]) >= -1e-9) continue;
      let clipped = triangle;
      for (const plane of throatPlanes) clipped = clipPolygon(clipped, plane);
      if (clipped.length >= 3) {
        floorPieces++;
        for (const point of clipped) {
          throatClearance = Math.min(throatClearance, w.sill - point[1]);
          floorExtent = Math.max(floorExtent, point[0] * sx + point[2] * sz);
        }
      }
      // The expanding outer opening must never remove or intersect any part
      // of the visible sloping floor, even along its off-center side edges.
      clipped = triangle;
      for (const plane of flare.planes) clipped = clipPolygon(clipped, plane);
      if (clipped.length >= 3) {
        let area = 0;
        for (let k = 1; k < clipped.length - 1; k++) area += Math.abs((clipped[k][0] - clipped[0][0]) * (clipped[k + 1][2] - clipped[0][2]) - (clipped[k][2] - clipped[0][2]) * (clipped[k + 1][0] - clipped[0][0]));
        if (area > 1e-8) intersections++;
      }
    }
    for (let sample = 0; sample <= 60; sample++) {
      const across = (sample / 60 - 0.5) * w.width, x = sx * radius - sz * across, z = sz * radius + sx * across;
      let floor = -Infinity;
      for (const f of floorFaces) for (let n = 1; n < f.i.length - 1; n++) {
        const a = f.i[0] * 3, b = f.i[n] * 3, c = f.i[n + 1] * 3, v = geometry.verts;
        if (x < Math.min(v[a], v[b], v[c]) - 1e-8 || x > Math.max(v[a], v[b], v[c]) + 1e-8 || z < Math.min(v[a + 2], v[b + 2], v[c + 2]) - 1e-8 || z > Math.max(v[a + 2], v[b + 2], v[c + 2]) + 1e-8) continue;
        const ux = v[b] - v[a], uz = v[b + 2] - v[a + 2], vx = v[c] - v[a], vz = v[c + 2] - v[a + 2], determinant = ux * vz - uz * vx;
        if (determinant >= -1e-9) continue;
        const u = ((x - v[a]) * vz - (z - v[a + 2]) * vx) / determinant, q = (ux * (z - v[a + 2]) - uz * (x - v[a])) / determinant;
        if (u >= -1e-7 && q >= -1e-7 && u + q <= 1 + 1e-7) floor = Math.max(floor, v[a + 1] + u * (v[b + 1] - v[a + 1]) + q * (v[c + 1] - v[a + 1]));
      }
      if (!Number.isFinite(floor)) missing++;
      else clearance = Math.min(clearance, w.sill - floor);
    }
    rampFrames.push({ window: w.index, basement: !!w.basement, width: w.width, height: w.height, samples: 61, clearance, missing, throatClearance, floorExtent, floorPieces, intersections, marker: radius, frame: throat.end, throatWidth: throat.half * 2, throatHorizontal: throat.horizontal, throatVertical: throat.vertical });
  }
  return { families, windows: H.windows.map((w) => ({ kind: w.kind, basement: !!w.basement, innerWidth: w.width, innerHeight: w.height, outerWidth: w.kind === "panorama" ? w.flare.edge * (w.endAngle - w.startAngle) : w.width + w.flare.horizontal * 2, outerHeight: w.height + w.flare.vertical * 2, horizontal: w.flare.horizontal, vertical: w.flare.vertical, edge: w.flare.edge })), fragments: H.windowFragments, totalFaces: geometry.faces.length, faces, samples, sweeps, sloped, failures, enlargedAim, floorSamples, ceilingSamples, floorError, ceilingError, separationSamples, pairs, neighborGap, stackedGap, rockCover: H.rockCover, roomViews, roomViewRays, rampFrames, unit: island.unit };
};
