// Compare the fast cell traversal with independent point occupancy, exact
// voxel/window sweeps, and known crossings of the actual rendered surfaces.
export const terrainSightProbe = () => {
  const BL = window.BL, island = window.__ooga.island, geometry = island.geometry, random = BL.math.mulberry32(414);
  const counts = { voxel: 0, window: 0, main: 0, basement: 0 }, rays = [], failures = [];
  const reference = (a, b, spacing = 0.02) => {
    const dx = b[0] - a[0], dy = b[1] - a[1], dz = b[2] - a[2], steps = Math.max(1, Math.ceil(Math.hypot(dx, dy, dz) / spacing));
    let px = a[0], py = a[1], pz = a[2];
    if (island.rockMaterialAt(px, py, pz)) return false;
    for (let n = 1; n <= steps; n++) {
      const t = n / steps, x = a[0] + dx * t, y = a[1] + dy * t, z = a[2] + dz * t;
      if (island.rockMaterialAt(x, y, z) || !island.voxelSegmentClearAt(px, py, pz, x, y, z, 0, 0)) return false;
      px = x; py = y; pz = z;
    }
    return true;
  };
  for (const face of geometry.faces) {
    const kind = face.headquartersWindowReveal ? "window" : face.headquartersRamp ? "main" : face.headquartersBasementRamp ? "basement" : "voxel";
    if (counts[kind] >= 120) continue;
    const v = geometry.verts, a = face.i[0] * 3, b = face.i[1] * 3, c = face.i[2] * 3;
    const ux = v[b] - v[a], uy = v[b + 1] - v[a + 1], uz = v[b + 2] - v[a + 2], vx = v[c] - v[a], vy = v[c + 1] - v[a + 1], vz = v[c + 2] - v[a + 2];
    let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    const length = Math.hypot(nx, ny, nz);
    if (length < 1e-9) continue;
    nx /= length; ny /= length; nz /= length;
    let x = 0, y = 0, z = 0;
    for (const i of face.i) { x += v[i * 3]; y += v[i * 3 + 1]; z += v[i * 3 + 2]; }
    x /= face.i.length; y /= face.i.length; z /= face.i.length;
    const front = [x + nx * 0.04, y + ny * 0.04, z + nz * 0.04], away = [x + nx * 0.08, y + ny * 0.08, z + nz * 0.08];
    if (island.rockMaterialAt(...front) || island.rockMaterialAt(...away)) continue;
    counts[kind]++;
    rays.push({ kind, a: front, b: [x - nx * 0.04, y - ny * 0.04, z - nz * 0.04], expected: false }, { kind, a: front, b: away, expected: true });
  }
  const rooms = [...island.headquarters.rooms, ...island.headquarters.basement.rooms];
  for (let n = 0; n < 400; n++) {
    const room = rooms[n % rooms.length], a = [room.x + (random() - 0.5) * 2, room.floor + 0.6 + random() * 2.5, room.z + (random() - 0.5) * 2];
    const angle = random() * Math.PI * 2, distance = random() * 35, b = [a[0] + Math.cos(angle) * distance, a[1] + (random() - 0.5) * distance, a[2] + Math.sin(angle) * distance];
    if (!island.rockMaterialAt(...a)) rays.push({ kind: "room", a, b });
  }
  for (const opening of island.headquarters.windows) for (let n = 0; n < 8; n++) {
    const distance = 3 + random() * 12, sx = Math.sin(opening.angle), sz = -Math.cos(opening.angle);
    const a = [opening.x - sx * distance, opening.y + (random() - 0.5) * 2, opening.z - sz * distance], b = [opening.x + sx * distance, opening.y + (random() - 0.5) * 2, opening.z + sz * distance];
    if (!island.rockMaterialAt(...a)) rays.push({ kind: "window passage", a, b });
  }
  let certifiedRays = 0;
  for (const ray of rays) {
    const actual = island.sightClearAt(...ray.a, ...ray.b), reverse = island.sightClearAt(...ray.b, ...ray.a);
    let expected = ray.expected ?? reference(ray.a, ray.b);
    if (actual !== expected && ray.expected === undefined) expected = reference(ray.a, ray.b, 0.0025);
    if ((actual !== expected || actual !== reverse) && failures.length < 8) failures.push({ ...ray, actual, reverse, expected });
    const emptyBox = island.sightBoxClearAt(Math.min(ray.a[0], ray.b[0]), Math.min(ray.a[1], ray.b[1]), Math.min(ray.a[2], ray.b[2]), Math.max(ray.a[0], ray.b[0]), Math.max(ray.a[1], ray.b[1]), Math.max(ray.a[2], ray.b[2]));
    if (emptyBox) certifiedRays++;
    if (emptyBox && !expected && failures.length < 8) failures.push({ kind: "unsafe box certificate", ...ray });
  }
  let clearBoxes = 0, boxRays = 0, boxPoints = 0;
  for (let n = 0; n < 600; n++) {
    const room = rooms[n % rooms.length], x = n % 3 ? room.x + (random() - 0.5) * 6 : (random() - 0.5) * 100;
    const y = n % 3 ? room.floor + 0.5 + random() * 4 : -40 + random() * 80, z = n % 3 ? room.z + (random() - 0.5) * 6 : (random() - 0.5) * 100;
    const radius = 0.03 + random() * 0.7;
    if (!island.sightBoxClearAt(x - radius, y - radius, z - radius, x + radius, y + radius, z + radius)) continue;
    clearBoxes++;
    for (let i = 0; i < 27; i++) {
      const px = x + (i % 3 - 1) * radius, py = y + (Math.floor(i / 3) % 3 - 1) * radius, pz = z + (Math.floor(i / 9) - 1) * radius;
      boxPoints++;
      if (island.rockMaterialAt(px, py, pz) && failures.length < 8) failures.push({ kind: "occupied certified box", point: [px, py, pz] });
    }
    for (let i = 0; i < 8; i++) {
      const a = [x + (random() * 2 - 1) * radius, y + (random() * 2 - 1) * radius, z + (random() * 2 - 1) * radius];
      const b = [x + (random() * 2 - 1) * radius, y + (random() * 2 - 1) * radius, z + (random() * 2 - 1) * radius];
      boxRays++;
      if ((!island.sightClearAt(...a, ...b) || !reference(a, b)) && failures.length < 8) failures.push({ kind: "blocked certified box", a, b });
    }
  }
  let solidBoxes = 0, solidPoints = 0;
  for (let n = 0; n < 1000; n++) {
    const x = (random() - 0.5) * 62, y = -28 + random() * 38, z = (random() - 0.5) * 62, radius = random() * 0.4;
    if (!island.sightBoxSolidAt(x - radius, y - radius, z - radius, x + radius, y + radius, z + radius)) continue;
    solidBoxes++;
    for (let i = 0; i < 27; i++) {
      const px = x + (i % 3 - 1) * radius, py = y + (Math.floor(i / 3) % 3 - 1) * radius, pz = z + (Math.floor(i / 9) - 1) * radius;
      solidPoints++;
      if ((!island.rockMaterialAt(px, py, pz) || island.sightClearAt(x, y, z, px, py, pz)) && failures.length < 8) failures.push({ kind: "empty certified solid box", point: [px, py, pz] });
    }
  }
  // Use the rendered reveal polygons, not the certificate's cached planes.
  // Each pair has a box within the remaining stone and one extending 2 mm
  // through that same visible surface. An explicit clear air witness makes
  // the latter unsafe even when most of the box is occupied.
  const fragmentWindows = new Array(island.headquarters.windows.length).fill(0);
  let fragmentBoxes = 0, fragmentAirBoxes = 0, fragmentPoints = 0;
  for (const face of geometry.faces) {
    if (!face.headquartersWindowReveal || fragmentWindows[face.windowIndex] >= 3) continue;
    const v = geometry.verts, a = face.i[0] * 3, b = face.i[1] * 3, c = face.i[2] * 3;
    const u = [v[b] - v[a], v[b + 1] - v[a + 1], v[b + 2] - v[a + 2]], w = [v[c] - v[a], v[c + 1] - v[a + 1], v[c + 2] - v[a + 2]];
    const normal = [u[1] * w[2] - u[2] * w[1], u[2] * w[0] - u[0] * w[2], u[0] * w[1] - u[1] * w[0]], length = Math.hypot(...normal);
    if (length < 1e-9) continue;
    for (let axis = 0; axis < 3; axis++) normal[axis] /= length;
    const surface = [0, 0, 0];
    for (const i of face.i) for (let axis = 0; axis < 3; axis++) surface[axis] += v[i * 3 + axis] / face.i.length;
    const center = surface.map((x, axis) => x - normal[axis] * 0.006), air = surface.map((x, axis) => x + normal[axis] * 0.002);
    const away = surface.map((x, axis) => x + normal[axis] * 0.004), radius = 0.001;
    if (island.rockMaterialAt(...air) || !island.clearAt(...air, 0, 0) || !reference(air, away, 0.00025)) continue;
    const points = [];
    for (let i = 0; i < 27; i++) points.push([center[0] + (i % 3 - 1) * radius, center[1] + (Math.floor(i / 3) % 3 - 1) * radius, center[2] + (Math.floor(i / 9) - 1) * radius]);
    if (points.some((p) => !island.rockMaterialAt(...p) || island.clearAt(...p, 0, 0))) continue;
    // GJK against the actual convex mesh proves one fragment contains the
    // corners and therefore the whole box, without reading its sight planes.
    const pieces = island.windowPiecesAt(center[0], center[2]) || [];
    if (!pieces.some((piece) => points.every((p) => BL.convex.sweptCylinder(piece.vertices, ...p, ...p, 0, 0)))) continue;
    fragmentWindows[face.windowIndex]++;
    fragmentBoxes++;
    fragmentPoints += points.length;
    const inside = island.sightBoxSolidAt(...center.map((x) => x - radius), ...center.map((x) => x + radius));
    if (!inside && failures.length < 8) failures.push({ kind: "uncertified solid window fragment", window: face.windowIndex, center, radius });
    const min = center.map((x, axis) => Math.min(x - radius, air[axis] - 0.0001)), max = center.map((x, axis) => Math.max(x + radius, air[axis] + 0.0001));
    fragmentAirBoxes++;
    if ((island.sightBoxSolidAt(...min, ...max) || reference(center, air, 0.00025)) && failures.length < 8) failures.push({ kind: "window certificate hides a 2 mm air opening", window: face.windowIndex, min, max, air });
  }
  // This lies on a shared convex-fragment plane. Both sides are solid, so a
  // zero-radius touch must not create an infinitesimal see-through seam.
  const seam = [-28.81, -1.625, 4.75], seamCovered = !!island.rockMaterialAt(...seam)
    && !!island.rockMaterialAt(seam[0], seam[1], seam[2] - 1e-6) && !!island.rockMaterialAt(seam[0], seam[1], seam[2] + 1e-6)
    && !island.sightClearAt(-28.79, -1.625, 4.75, -28.83, -1.625, 4.75);
  const floor = island.headquarters.basement.floor, outside = island.sightClearAt(80, 2, 80, 80, 5, 80), throughIsland = !island.sightClearAt(0, 20, 0, 0, -50, 0), shaft = island.sightClearAt(0, floor - 0.1, 0, 0, -50, 0);
  return { counts, rays: rays.length, certifiedRays, clearBoxes, boxRays, boxPoints, solidBoxes, solidPoints, fragmentWindows, fragmentBoxes, fragmentAirBoxes, fragmentPoints, failures, seamCovered, outside, throughIsland, shaft };
};
