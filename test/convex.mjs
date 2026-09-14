// Analytic boxes exercise the shared convex narrow phase without rendering.
export const convexProbe = () => {
  const collide = window.BL.convex.sweptCylinder, failures = [];
  let seed = 918273, stationary = 0, swept = 0, contacts = 0, rotated = 0, tetrahedra = 0, tilted = 0, ceiling = 0;
  const random = () => { seed = Math.imul(seed ^ seed >>> 15, 2246822519); seed = Math.imul(seed ^ seed >>> 13, 3266489917); return ((seed ^= seed >>> 16) >>> 0) / 4294967296; };
  const box = (x, y, z, width, height, depth) => {
    const vertices = new Float64Array(24);
    let i = 0;
    for (const a of [0, 1]) for (const b of [0, 1]) for (const c of [0, 1]) { vertices[i++] = x + a * width; vertices[i++] = y + b * height; vertices[i++] = z + c * depth; }
    return vertices;
  };
  const check = (kind, expected, actual, detail) => { if (expected !== actual && failures.length < 12) failures.push({ kind, expected, actual, ...detail }); };
  for (let i = 0; i < 20000; i++) {
    const x0 = random() * 60 - 30, y0 = random() * 30 - 25, z0 = random() * 60 - 30, w = 0.025 + random() * 0.225, h = 0.025 + random() * 0.225, d = 0.025 + random() * 0.225;
    const x = x0 + random() * 1.2 - 0.6, y = y0 + random() * 2.2 - 1.5, z = z0 + random() * 1.2 - 0.6, radius = i % 13 ? random() * 0.7 : 0, height = i % 17 ? random() * 1.8 : 0;
    const dx = Math.max(x0 - x, 0, x - x0 - w), dz = Math.max(z0 - z, 0, z - z0 - d);
    const horizontal = radius ? dx * dx + dz * dz < radius * radius : x > x0 && x < x0 + w && z > z0 && z < z0 + d;
    const vertical = height ? y < y0 + h && y + height > y0 : y > y0 && y < y0 + h;
    check("stationary box oracle", horizontal && vertical, collide(box(x0, y0, z0, w, h, d), x, y, z, x, y, z, radius, height), { x, y, z, radius, height, x0, y0, z0, w, h, d });
    stationary++;
  }
  const unit = box(-0.5, -0.5, -0.5, 1, 1, 1), thin = box(-0.002, -0.5, -0.5, 0.004, 1, 1);
  const cases = [
    ["side touch", false, 1, -0.25, 0, 0.5, 0.5],
    ["side inside", true, 1 - 1e-5, -0.25, 0, 0.5, 0.5],
    ["top cap touch", false, 0, 0.5, 0, 0.25, 0.5],
    ["bottom cap touch", false, 0, -1, 0, 0.25, 0.5],
    ["corner touch", false, 0.5 + Math.SQRT1_2 * 0.3, -0.25, 0.5 + Math.SQRT1_2 * 0.3, 0.3, 0.5],
    ["corner inside", true, 0.5 + Math.SQRT1_2 * 0.3 - 1e-5, -0.25, 0.5 + Math.SQRT1_2 * 0.3 - 1e-5, 0.3, 0.5],
    ["point inside", true, 0, 0, 0, 0, 0],
    ["point outside", false, 0.6, 0, 0, 0, 0],
    ["point on face", false, 0.5, 0, 0, 0, 0],
    ["point on edge", false, 0.5, 0.5, 0, 0, 0],
    ["point on corner", false, 0.5, 0.5, 0.5, 0, 0],
    ["flat disk on cap", false, 0, 0.5, 0, 0.25, 0],
    ["flat disk inside", true, 0, 0, 0, 0.25, 0],
    ["vertical line inside", true, 0, -1, 0, 0, 1],
    ["vertical line on face", false, 0.5, -1, 0, 0, 1]
  ];
  for (const [kind, expected, x, y, z, radius, height] of cases) {
    check(kind, expected, collide(unit, x, y, z, x, y, z, radius, height)); contacts++;
  }
  for (const [kind, expected, piece, x, y, z, tx, ty, tz, radius, height] of [
    ["thin wall tunneling", true, thin, -2, -0.25, 0, 2, -0.25, 0, 0.15, 0.5],
    ["point tunneling", true, thin, -2, 0, 0, 2, 0, 0, 0, 0],
    ["diagonal swept cap", true, thin, -2, 2, 0, 2, -2, 0, 0.15, 0.5],
    ["swept above", false, thin, -2, 0.50001, 0, 2, 0.50001, 0, 0.15, 0.5],
    ["parallel side tangent", false, unit, -2, -0.25, 0.75, 2, -0.25, 0.75, 0.25, 0.5],
    ["parallel side just inside", true, unit, -2, -0.25, 0.75 - 1e-5, 2, -0.25, 0.75 - 1e-5, 0.25, 0.5],
    ["almost parallel outside", false, unit, -2, -0.25, 0.75001, 2, -0.25, 0.750001, 0.25, 0.5],
    ["almost parallel entry", true, unit, -2, -0.25, 0.75001, 2, -0.25, 0.74999, 0.25, 0.5]
  ]) { check(kind, expected, collide(piece, x, y, z, tx, ty, tz, radius, height)); swept++; }
  // Random straight horizontal sweeps cross the X extent, reducing the oracle
  // to the exact cylinder-vs-box vertical interval and Z distance.
  for (let i = 0; i < 5000; i++) {
    const y = random() * 2 - 1, z = random() * 2 - 1, radius = random() * 0.4, height = random();
    const expected = y < 0.5 && y + height > -0.5 && Math.abs(z) < 0.5 + radius;
    check("swept box oracle", expected, collide(unit, -2, y, z, 2, y, z, radius, height), { y, z, radius, height }); swept++;
  }
  // Y rotations preserve the cylinder, providing an exact independent oracle
  // for oblique rock faces and non-axis-aligned sweeps through thin fragments.
  for (let i = 0; i < 5000; i++) {
    const angle = random() * Math.PI * 2, c = Math.cos(angle), s = Math.sin(angle), rock = box(-0.1, -0.1, -0.01, 0.2, 0.2, 0.02);
    for (let j = 0; j < rock.length; j += 3) { const x = rock[j], z = rock[j + 2]; rock[j] = x * c - z * s; rock[j + 2] = x * s + z * c; }
    const x = random() - 0.5, y = random() - 0.5, z = random() - 0.5, radius = random() * 0.3, height = random() * 0.5;
    const dx = Math.max(0, Math.abs(x) - 0.1), dz = Math.max(0, Math.abs(z) - 0.01), wx = x * c - z * s, wz = x * s + z * c;
    check("rotated stationary box", y < 0.1 && y + height > -0.1 && dx * dx + dz * dz < radius * radius, collide(rock, wx, y, wz, wx, y, wz, radius, height), { angle, x, y, z, radius, height });
    check("rotated swept box", y < 0.1 && y + height > -0.1 && Math.abs(z) < 0.01 + radius, collide(rock, -c - z * s, y, -s + z * c, c - z * s, y, s + z * c, radius, height), { angle, y, z, radius, height });
    rotated += 2;
  }
  const tetrahedron = new Float64Array([0, 0, 0, 0.25, 0, 0, 0, 0.25, 0, 0, 0, 0.25]);
  for (let i = 0; i < 5000; i++) {
    const x = random() * 0.5 - 0.1, y = random() * 0.5 - 0.1, z = random() * 0.5 - 0.1;
    check("tetrahedron point halfspaces", x > 0 && y > 0 && z > 0 && x + y + z < 0.25, collide(tetrahedron, x, y, z, x, y, z, 0, 0), { x, y, z }); tetrahedra++;
  }
  // Unlike a Y rotation, these slabs have inclined floors/ceilings. Their
  // tangential sides stay beyond the cylinder: the exact oracle is its support
  // span along the slab normal, r*hypot(nx,nz) + h/2*abs(ny).
  const gaps = [0, 0.000001, 0.00005, 0.0007, -0.000001, -0.00005, -0.0007];
  for (let i = 0; i < 5000; i++) {
    const angle = random() * Math.PI * 2, azimuth = random() * Math.PI * 2, sine = Math.sin(angle), cosine = Math.cos(angle), ca = Math.cos(azimuth), sa = Math.sin(azimuth);
    const nx = sine * ca, ny = cosine, nz = sine * sa, ux = -sa, uz = ca, vx = cosine * ca, vy = -sine, vz = cosine * sa;
    const rock = new Float64Array(24), radius = 0.05 + random() * 0.5, height = 0.2 + random() * 1.8, gap = gaps[i % gaps.length], sign = i % 2 ? 1 : -1;
    let at = 0;
    for (const n of [-0.125, 0.125]) for (const u of [-4, 4]) for (const v of [-4, 4]) {
      rock[at++] = -13 + nx * n + ux * u + vx * v;
      rock[at++] = -9 + ny * n + vy * v;
      rock[at++] = 18 + nz * n + uz * u + vz * v;
    }
    const distance = sign * (0.125 + radius * Math.hypot(nx, nz) + height / 2 * Math.abs(ny) + gap), x = -13 + nx * distance, y = -9 + ny * distance - height / 2, z = 18 + nz * distance;
    check("tilted slab grazing", gap < 0, collide(rock, x, y, z, x, y, z, radius, height), { angle, azimuth, gap, radius, height });
    check("tilted slab tangent sweep", gap < 0, collide(rock, x - ux, y, z - uz, x + ux, y, z + uz, radius, height), { angle, azimuth, gap, radius, height });
    tilted += 2;
  }
  // This real window-ceiling fragment formerly cycled the simplex for all 96
  // iterations despite a 0.000697-unit gap above the character's head.
  const fragment = new Float64Array([2.5, -3.4153745779425924, -26.5, 2.5, -3.25, -26.5, 2.75, -3.25, -26.5, 2.75, -3.412715065908091, -26.5, 2.75, -3.4474767912316704, -26.25, 2.75, -3.25, -26.25, 2.5, -3.25, -26.25, 2.5, -3.450136303266171, -26.25]);
  const x = 2.768242993333574, y = -4.946482208881706, z = -26.78966635837148, radius = 0.295, height = 1.5324024474716216;
  for (const offset of [0, -0.001, 0.001]) {
    check("window ceiling grazing", offset > 0, collide(fragment, x, y + offset, z, x, y + offset, z, radius, height), { offset }); ceiling++;
  }
  check("window ceiling crossing sweep", true, collide(fragment, x, y - 0.001, z, x, y + 0.001, z, radius, height)); ceiling++;
  return { stationary, swept, contacts, rotated, tetrahedra, tilted, ceiling, failures };
};
