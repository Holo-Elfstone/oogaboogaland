// Match the near-plane material to authored terrain ownership and wave travel.
export const cameraGlyphOwnershipProbe = () => {
  const B = window.__ooga, island = B.island, geometry = island.geometry, v = geometry.verts;
  const material = B.headquarters.glyphMaterial, matrix = B.renderOpts.matrix, unit = island.unit, grid = island.sightGrid;
  const saved = { active: matrix.active, radius: matrix.radius, permanentCave: matrix.permanentCave, time: matrix.time };
  const rows = [], failures = [], samples = [], keys = new Set(), expectedCaves = new Set(), coveredCaves = new Set(), horizontal = [];
  const revision = { withoutCharacter: !B.pilot.player, advanced: false, cached: false, reversed: false, synchronized: false };
  const summary = { faces: 0, caves: [], radial: 0, headquarters: 0, basement: 0, roofPairs: 0, roofCore: 0, roofThicknesses: [], fragments: 0, ownedFragments: 0, waveSamples: 0, permanentSamples: 0 };
  const note = (kind, detail) => { if (failures.length < 24) failures.push({ kind, ...detail }); };
  const faceInfo = (face, index) => {
    const a = face.i[0] * 3, b = face.i[1] * 3, c = face.i[2] * 3;
    const ux = v[b] - v[a], uy = v[b + 1] - v[a + 1], uz = v[b + 2] - v[a + 2], vx = v[c] - v[a], vy = v[c + 1] - v[a + 1], vz = v[c + 2] - v[a + 2];
    const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx, length = Math.hypot(nx, ny, nz);
    if (length < 1e-9) return null;
    const normal = [nx / length, ny / length, nz / length], min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
    for (const vertex of face.i) for (let axis = 0; axis < 3; axis++) { min[axis] = Math.min(min[axis], v[vertex * 3 + axis]); max[axis] = Math.max(max[axis], v[vertex * 3 + axis]); }
    const point = min.map((value, axis) => (value + max[axis]) / 2), axis = normal.findIndex((value) => Math.abs(value) > 0.999999);
    // Interior cell centers keep adjacent cave/exterior boundaries from
    // changing which face is nearest to the sample inside this face.
    if (axis >= 0) for (let n = 0; n < 3; n++) if (n !== axis) {
      const cell = grid[n + 1] + (Math.floor((point[n] - grid[n + 1]) / unit) + 0.5) * unit;
      if (cell > min[n] + 1e-6 && cell < max[n] - 1e-6) point[n] = cell;
    }
    return { index, owner: face.matrixCave || 0, normal, min, max, point, axis };
  };
  const sample = (kind, point, owner, face = -1) => {
    const actual = island.rockCaveAt(...point), solid = !!island.rockMaterialAt(...point);
    rows.push({ kind, face, owner, actual, solid });
    if (actual !== owner || !solid) note("terrain face ownership", { kind, face, owner, actual, solid, point });
    samples.push({ kind, point, owner });
  };
  for (let index = 0; index < geometry.faces.length; index++) {
    const face = geometry.faces[index];
    if (face.matrixCave > 0 && face.matrixCave <= 8) expectedCaves.add(face.matrixCave);
    if (face.headquartersRamp || face.headquartersBasementRamp || face.windowIndex !== undefined) continue;
    const info = faceInfo(face, index);
    if (!info || info.axis < 0) continue;
    if (info.axis === 1) horizontal.push(info);
    if (info.owner > 8) continue;
    const p = info.point, hq = island.headquarters;
    const kind = info.owner ? "cave" : p[1] >= 0 ? "exterior" : p[1] >= hq.floor - unit && p[1] <= hq.ceiling ? "headquarters" : p[1] >= hq.basement.floor - unit && p[1] <= hq.basement.ceiling ? "basement" : null;
    if (!kind) continue;
    const key = `${kind}:${info.owner}:${info.axis}:${Math.sign(info.normal[info.axis])}`;
    if (keys.has(key)) continue;
    keys.add(key);
    const point = p.map((value, axis) => value - info.normal[axis] * unit * 0.08);
    sample(kind, point, info.owner, index); summary.faces++;
    if (kind === "cave") coveredCaves.add(info.owner);
    else if (kind === "exterior") summary.radial++;
    else summary[kind]++;
  }
  summary.caves = [...coveredCaves].sort((a, b) => a - b);
  for (const cave of expectedCaves) if (!coveredCaves.has(cave)) note("missing cave face fixture", { cave });
  if (!summary.radial || !summary.headquarters || !summary.basement) note("missing radial material fixture", { radial: summary.radial, headquarters: summary.headquarters, basement: summary.basement });
  // Pair actual opposing roof faces across a continuous column of stone.
  // Their thickness comes from the mesh; ownership changes near each real
  // boundary, while a fully surrounded interior cell keeps the radial field.
  const roofCaves = new Set();
  for (const lower of horizontal) {
    if (lower.owner < 1 || lower.owner > 8 || lower.normal[1] > -0.999 || roofCaves.has(lower.owner)) continue;
    for (const upper of horizontal) {
      const thickness = upper.point[1] - lower.point[1];
      if (upper.owner || upper.normal[1] < 0.999 || thickness < unit * 0.99) continue;
      const minX = Math.max(lower.min[0], upper.min[0]), maxX = Math.min(lower.max[0], upper.max[0]), minZ = Math.max(lower.min[2], upper.min[2]), maxZ = Math.min(lower.max[2], upper.max[2]);
      if (maxX - minX < unit * 0.99 || maxZ - minZ < unit * 0.99) continue;
      const x = grid[1] + (Math.floor(((minX + maxX) / 2 - grid[1]) / unit) + 0.5) * unit;
      const z = grid[3] + (Math.floor(((minZ + maxZ) / 2 - grid[3]) / unit) + 0.5) * unit;
      if (x <= minX || x >= maxX || z <= minZ || z >= maxZ) continue;
      let continuous = true;
      for (let y = lower.point[1] + unit / 2; y < upper.point[1]; y += unit) if (!island.solidAt(x, y, z)) { continuous = false; break; }
      if (!continuous) continue;
      sample("roof underside", [x, lower.point[1] + unit * 0.08, z], lower.owner, lower.index);
      sample("roof exterior", [x, upper.point[1] - unit * 0.08, z], 0, upper.index);
      const middle = grid[2] + (Math.floor(((lower.point[1] + upper.point[1]) / 2 - grid[2]) / unit) + 0.5) * unit;
      if (island.solidAt(x, middle, z) && island.solidAt(x - unit, middle, z) && island.solidAt(x + unit, middle, z)
        && island.solidAt(x, middle - unit, z) && island.solidAt(x, middle + unit, z)
        && island.solidAt(x, middle, z - unit) && island.solidAt(x, middle, z + unit)) {
        sample("roof core", [x, middle, z], 0); summary.roofCore++;
      }
      summary.roofThicknesses.push(thickness);
      roofCaves.add(lower.owner); summary.roofPairs++;
      break;
    }
  }
  if (!summary.roofPairs) note("missing roof fixture", {});
  // A clipped window cell is no longer a voxel. Use its convex fragment's
  // centroid and its own authored ownership, not a surrounding room box.
  const fragments = new Set(), fragmentOwners = new Set();
  for (let index = 0; index < geometry.faces.length; index++) {
    const face = geometry.faces[index];
    if (face.windowIndex === undefined) continue;
    const info = faceInfo(face, index);
    if (!info) continue;
    const pieces = island.windowPiecesAt(info.point[0], info.point[2]);
    if (!pieces) continue;
    for (const piece of pieces) {
      if (fragments.has(piece)) continue;
      fragments.add(piece);
      const point = [0, 0, 0], count = piece.vertices.length / 3;
      for (let n = 0; n < piece.vertices.length; n++) point[n % 3] += piece.vertices[n] / count;
      const owner = piece.matrixCave || 0, actual = island.rockCaveAt(...point);
      summary.fragments++; if (owner) summary.ownedFragments++;
      if (actual !== owner || !island.rockMaterialAt(...point)) note("window fragment ownership", { owner, actual, point });
      if (!fragmentOwners.has(owner)) { fragmentOwners.add(owner); samples.push({ kind: "window fragment", point, owner }); }
    }
  }
  if (!summary.fragments) note("missing window fragment fixture", {});
  const travel = (point, owner) => {
    let x = point[0], z = point[2], depth = 0;
    if (owner) {
      const n = (owner - 1) * 4, normalX = matrix.caves[n], normalZ = matrix.caves[n + 1];
      depth = Math.max(0, matrix.caves[n + 2] - x * normalX - z * normalZ);
      x += normalX * depth; z += normalZ * depth;
    }
    return Math.hypot(x - matrix.origin[0], z - matrix.origin[2]) + depth;
  };
  try {
    matrix.permanentCave = 0;
    for (const fixture of samples) {
      const distance = travel(fixture.point, fixture.owner);
      matrix.active = 1;
      // Before arrival, three positions inside the feather, and fully covered.
      for (const delta of [-0.2, 0.375, 0.75, 1.125, 1.7]) {
        matrix.radius = distance + delta;
        const t = Math.max(0, Math.min(1, delta / 1.5)), expected = t * t * (3 - 2 * t), actual = material.coverageAt(...fixture.point);
        summary.waveSamples++;
        if (Math.abs(actual - expected) > 1e-6) note("material wave parity", { kind: fixture.kind, owner: fixture.owner, delta, expected, actual, point: fixture.point });
      }
      matrix.active = 0; matrix.radius = matrix.maxRadius;
      const off = material.coverageAt(...fixture.point);
      if (off !== 0) note("inactive radial wave", { kind: fixture.kind, owner: fixture.owner, actual: off });
    }
    const mirror = island.mouths.findIndex((mouth) => mouth.id === B.mirrorCave.mouth.id) + 1;
    matrix.active = 0; matrix.radius = 0; matrix.permanentCave = mirror;
    for (const fixture of samples) {
      const expected = fixture.owner === mirror ? 1 : 0, actual = material.coverageAt(...fixture.point);
      summary.permanentSamples++;
      if (actual !== expected) note("permanent mirror ownership", { kind: fixture.kind, owner: fixture.owner, expected, actual });
    }
    // Exercise the production overlay's descriptor update at a fixed clock,
    // including its early return path when there is no selected character.
    const scene = window.BL.scenes.hub, before = material.version;
    matrix.active = 1; matrix.permanentCave = saved.permanentCave; matrix.time = saved.time;
    matrix.radius = material.radius === 5.25 ? 6.25 : 5.25;
    scene.overlay(0);
    const advanced = material.version;
    revision.advanced = advanced > before;
    revision.synchronized = material.radius === matrix.radius && material.time === matrix.time;
    scene.overlay(0); revision.cached = material.version === advanced;
    matrix.radius -= 0.5; scene.overlay(0);
    revision.reversed = material.version > advanced;
    revision.synchronized = revision.synchronized && material.radius === matrix.radius && material.time === matrix.time;
    if (!revision.advanced || !revision.cached || !revision.reversed || !revision.synchronized) note("overlay material revision", revision);
  } finally { Object.assign(matrix, saved); window.BL.scenes.hub.overlay(0); }
  return { summary, rows, failures, revision, descriptor: { coverage: typeof material.coverageAt, version: typeof material.version, time: typeof material.time }, rockCaveBytes: island.rockCaveBytes };
};

// The material front is sampled at every real near-plane texel. Strong outline
// contrast must leave unreached stone intact, including during a retreat.
export const cameraGlyphWaveProbe = () => {
  const BL = window.BL, size = 128, canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  Object.defineProperties(canvas, { clientWidth: { value: size }, clientHeight: { value: size } });
  const ctx = canvas.getContext("2d", { willReadFrequently: true }), cover = BL.cameraCover.create(canvas), camera = BL.scene.createCamera({ near: 1, fov: 90 });
  Object.assign(camera.position, { x: 4, y: 0, z: 1 }); Object.assign(camera.target, { x: 4, y: 0, z: 0 });
  const material = [100, 88, 75], stone = () => material, solid = () => true, partial = (x, y) => y < 0;
  let radius = 0, samples = 0;
  const amountAt = (x, z) => { const t = Math.max(0, Math.min(1, (Math.hypot(x, z) - radius + 1.5) / 1.5)); return 1 - t * t * (3 - 2 * t); };
  const effect = { version: 0, time: 4, coverageAt(x, y, z) { samples++; return amountAt(x, z); } };
  const paint = (nextRadius, occupancy = solid, supplied = effect, contrast = 1) => {
    if (radius !== nextRadius) { radius = nextRadius; effect.version++; }
    ctx.clearRect(0, 0, size, size); cover.draw(camera, null, true, false, occupancy, stone, null, 0, contrast, supplied);
    return ctx.getImageData(0, 0, size, size).data;
  };
  const equal = (a, b) => a.every((v, i) => v === b[i]);
  try {
    const original = paint(0, solid, null, 0), untouched = paint(0), untouchedState = { ...cover.state };
    const before = cover.state.textureUpdates, sampleCount = samples;
    effect.time += 0.5; const waiting = paint(0);
    const untouchedCache = cover.state.textureUpdates === before && samples === sampleCount && equal(untouched, waiting);
    effect.time = 4;
    const glyphs = paint(8), fullState = { ...cover.state }, middle = paint(4.75), middleState = { ...cover.state };
    const middleUpdates = cover.state.textureUpdates, beforeRepeat = samples, repeated = paint(4.75);
    const cached = cover.state.textureUpdates === middleUpdates && samples === beforeRepeat && equal(middle, repeated);
    const compareBlend = (image) => {
      let rock = 0, glyph = 0, blend = 0, errors = 0, opaque = 0;
      for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
        const amount = amountAt(4 + ((x + 0.5) / size - 0.5) * 2, 0), i = (y * size + x) * 4;
        if (amount === 0) rock++; else if (amount === 1) glyph++; else blend++;
        for (let c = 0; c < 3; c++) if (Math.abs(image[i + c] - (original[i + c] * (1 - amount) + glyphs[i + c] * amount)) > 1.01) errors++;
        if (image[i + 3] === 255) opaque++;
      }
      return { rock, glyph, blend, errors, opaque };
    };
    const middleBlend = compareBlend(middle), advanced = paint(4.95), advancedBlend = compareBlend(advanced), advancedUpdates = cover.state.textureUpdates;
    const receded = paint(4.75), recededUpdates = cover.state.textureUpdates;
    let moved = 0;
    for (let i = 0; i < middle.length; i += 4) if (middle[i] !== advanced[i] || middle[i + 1] !== advanced[i + 1] || middle[i + 2] !== advanced[i + 2]) moved++;
    // Four native texture columns of camera movement must sample the same
    // old world positions, including the radial conversion boundary itself.
    const shift = 4, delta = 2 * shift / size;
    camera.position.x += delta; camera.target.x += delta;
    const translated = paint(4.75);
    let worldCompared = 0, worldMatches = 0;
    for (let y = 4; y < 124; y++) for (let x = 4; x < 120 - shift; x++) {
      const a = (y * size + x) * 4, b = (y * size + x + shift) * 4;
      worldCompared++;
      if ([0, 1, 2, 3].every((c) => Math.abs(translated[a + c] - middle[b + c]) <= 1)) worldMatches++;
    }
    camera.position.x -= delta; camera.target.x -= delta;
    const returned = paint(4.75), cut = paint(4.75, partial), cutState = { ...cover.state };
    let clearTop = 0, solidBottom = 0, coveredMatches = 0;
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      if (y < 62 && cut[i + 3] === 0) clearTop++;
      if (y >= 66 && cut[i + 3] === 255) solidBottom++;
      if (y >= 66 && [0, 1, 2, 3].every((c) => cut[i + c] === middle[i + c])) coveredMatches++;
    }
    effect.time = 4.25; const animated = paint(4.75);
    let animatedGlyph = 0, stationaryRock = 0;
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4, amount = amountAt(4 + ((x + 0.5) / size - 0.5) * 2, 0);
      const same = [0, 1, 2, 3].every((c) => animated[i + c] === middle[i + c]);
      if (amount === 0 && same) stationaryRock++;
      if (amount > 0 && !same) animatedGlyph++;
    }
    const restored = paint(0), ended = { ...cover.state };
    return { size, unconverted: equal(original, untouched), untouchedCache, untouchedState, fullState, middleState, middleBlend, advancedBlend,
      cached, versionUpdated: advancedUpdates === middleUpdates + 1 && recededUpdates === advancedUpdates + 1,
      moved, reversible: equal(middle, receded), worldCompared, worldMatches, returned: equal(middle, returned), cutState,
      clearTop, solidBottom, coveredMatches, animatedGlyph, stationaryRock, restored: equal(original, restored), ended };
  } finally { cover.dispose(); }
};
