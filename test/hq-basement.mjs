// Inspect actual voxel clearance and support in the second HQ level. Every
// sample selects its height explicitly where the upper rooms occupy the same XZ.
export const headquartersBasementProbe = () => {
  const B = window.__ooga, island = B.island, H = island.headquarters, basement = H.basement;
  const failures = [], rooms = [], ramps = [], column = {}, upper = {};
  let commonSamples = 0, rockSamples = 0;
  const fail = (kind, x, y, z, detail = null) => {
    if (failures.length < 12) failures.push({ kind, x, y, z, detail });
  };
  const inspect = (x, z, floor, body = true, rock = false) => {
    const open = island.cavityAt(x, z, column, H.caveIndex, floor + 1.1);
    if (!open || column.caveIndex !== H.caveIndex || Math.abs(column.floor - floor) > 0.08 || column.ceiling < floor + 3.5) fail("floor and comfortable height", x, floor, z, { ...column });
    if (body && !island.clearAt(x, floor + 0.3, z, 0.29, 2.75)) fail("character and camera volume", x, floor, z);
    if (!rock) return;
    for (let y = column.ceiling + 0.02; y < column.ceiling + H.rockCover; y += 0.1) {
      rockSamples++;
      if (!island.solidAt(x, y, z)) fail("solid rock above basement", x, y, z, { ceiling: column.ceiling });
    }
  };
  for (let x = -basement.room.radius + 0.75; x <= basement.room.radius - 0.75; x += 0.5) for (let z = -basement.room.radius + 0.75; z <= basement.room.radius - 0.75; z += 0.5) {
    const radius = Math.hypot(x, z);
    if (radius >= basement.room.radius - 0.75 || radius <= basement.hole.mouthRadius + island.unit) continue;
    inspect(basement.room.x + x, basement.room.z + z, basement.floor, true, true);
    commonSamples++;
  }
  for (const room of basement.rooms) {
    const sx = Math.sin(room.angle), sz = -Math.cos(room.angle);
    let floorSamples = 0, corridorSamples = 0;
    for (let along = -room.depth / 2 + 0.5; along <= room.depth / 2 - 0.5 + 1e-7; along += 0.25) for (let across = -room.width / 2 + 0.5; across <= room.width / 2 - 0.5 + 1e-7; across += 0.25) {
      const x = room.x + sx * along - sz * across, z = room.z + sz * along + sx * across;
      inspect(x, z, room.floor, Math.abs(along) <= room.depth / 2 - 0.75 && Math.abs(across) <= room.width / 2 - 0.75, true);
      floorSamples++;
      for (const other of basement.rooms) {
        if (other === room) continue;
        const dx = x - other.x, dz = z - other.z, acrossOther = dx * Math.cos(other.angle) + dz * Math.sin(other.angle), alongOther = dx * Math.sin(other.angle) - dz * Math.cos(other.angle);
        if (Math.abs(acrossOther) < other.width / 2 && Math.abs(alongOther) < other.depth / 2) fail("neighboring rooms overlap", x, room.floor + 1, z, { room: room.index, other: other.index });
      }
    }
    const length = Math.hypot(room.x - room.approach.x, room.z - room.approach.z), count = Math.ceil(length / 0.2);
    for (let i = 0; i <= count; i++) {
      const x = room.approach.x + (room.x - room.approach.x) * i / count, z = room.approach.z + (room.z - room.approach.z) * i / count;
      inspect(x, z, room.floor, true, true);
      corridorSamples++;
    }
    const walls = [[-room.width / 2 - 0.5, 0], [room.width / 2 + 0.5, 0], [0, room.depth / 2 + 0.5]].map(([across, along]) => island.solidAt(room.x + sx * along - sz * across, room.floor + 0.5, room.z + sz * along + sx * across));
    const aperture = H.windows.find((entry) => entry.kind === "room" && entry.basement && entry.roomIndex === room.index);
    rooms.push({ index: room.index, basement: room.basement, floor: room.floor, ceiling: room.ceiling, radius: room.radius, width: room.width, depth: room.depth, floorSamples, corridorSamples, walls, windowFloor: aperture && aperture.floor, resident: room.resident ?? null });
  }
  for (const ramp of basement.ramps) {
    let maxSlope = 0, maxStep = 0, smoothSamples = 0, samples = 0;
    for (let i = 1; i < ramp.samples.length; i++) {
      const a = ramp.samples[i - 1], b = ramp.samples[i], dx = b.x - a.x, dz = b.z - a.z, length = Math.hypot(dx, dz), count = Math.max(1, Math.ceil(length / 0.1));
      maxSlope = Math.max(maxSlope, Math.abs(b.y - a.y) / length);
      maxStep = Math.max(maxStep, Math.abs(b.y - a.y));
      if (b.y > a.y + 1e-7) fail("basement entrance must descend monotonically", b.x, b.y, b.z);
      for (let j = 0; j < count; j++) {
        const k = j / count, x = a.x + dx * k, z = a.z + dz * k, floor = a.y + (b.y - a.y) * k;
        if (Math.abs(floor / island.unit - Math.round(floor / island.unit)) > 0.02) smoothSamples++;
        for (const offset of [0, -0.65, 0.65]) inspect(x + dz / length * offset, z - dx / length * offset, floor, offset === 0);
        samples++;
      }
    }
    const first = ramp.samples[0], last = ramp.samples.at(-1);
    ramps.push({ index: ramp.index, first: first.y, last: last.y, width: ramp.width, startAngle: Math.atan2(first.x, -first.z), endRadius: Math.hypot(last.x - basement.room.x, last.z - basement.room.z), maxSlope, maxStep, smoothSamples, samples });
  }
  // Rasterize every rendered lower floor, including the outermost slope cells.
  // These full-width checks catch unsupported flanks that centerline probes miss.
  const g = island.geometry, cells = new Map(), U = island.unit;
  for (const face of g.faces) {
    const a = face.i[0] * 3, b = face.i[1] * 3, c = face.i[2] * 3;
    const bx = g.verts[b] - g.verts[a], bz = g.verts[b + 2] - g.verts[a + 2], cx = g.verts[c] - g.verts[a], cz = g.verts[c + 2] - g.verts[a + 2], determinant = bx * cz - bz * cx;
    if (determinant >= 0) continue;
    const xs = face.i.map((i) => g.verts[i * 3]), ys = face.i.map((i) => g.verts[i * 3 + 1]), zs = face.i.map((i) => g.verts[i * 3 + 2]);
    const low = Math.min(...ys), high = Math.max(...ys), ramp = face.headquartersBasementRamp || 0;
    if (!ramp && (high - low > 1e-7 || low < basement.floor - 1e-7 || high >= H.floor - 1e-7)) continue;
    for (let x = Math.min(...xs) + U / 2; x < Math.max(...xs) - 1e-7; x += U) for (let z = Math.min(...zs) + U / 2; z < Math.max(...zs) - 1e-7; z += U) {
      const dx = x - g.verts[a], dz = z - g.verts[a + 2], u = (dx * cz - dz * cx) / determinant, v = (bx * dz - bz * dx) / determinant;
      // Greedy flat floors are rectangular quads; the slope faces are triangles.
      if (face.i.length === 3 && (u < -1e-7 || v < -1e-7 || u + v > 1 + 1e-7)) continue;
      const floor = ramp ? g.verts[a + 1] + u * (g.verts[b + 1] - g.verts[a + 1]) + v * (g.verts[c + 1] - g.verts[a + 1]) : low;
      if (!island.cavityAt(x, z, column, H.caveIndex, floor + 1.1) || Math.abs(column.floor - floor) > 0.08) {
        if (!ramp) continue;
        fail("rendered basement floor keeps its collision interval", x, floor, z, { ...column });
      }
      const key = Math.floor(x / U) + ":" + Math.floor(z / U), previous = cells.get(key);
      cells.set(key, { x, z, floor, ramp, low: Math.min(low, previous ? previous.low : Infinity) });
    }
  }
  const voxelTop = (x, z, floor) => {
    let y = floor - 0.001;
    while (!island.solidAt(x, y, z) && y > floor - 1) y -= U / 10;
    return island.solidAt(x, y, z) ? Math.ceil(y / U) * U : -Infinity;
  };
  let footingSamples = 0, stackedCells = 0, renderCells = 0;
  for (const cell of cells.values()) {
    const { x, z, floor, ramp } = cell, top = voxelTop(x, z, cell.low);
    if (ramp) renderCells++;
    for (const depth of [U / 2, U * 1.5, U * 2.5]) {
      footingSamples++;
      if (!Number.isFinite(top) || !island.solidAt(x, top - depth, z)) fail("complete rock footing below rendered floor cell", x, top - depth, z, { floor, ramp });
    }
    island.cavityAt(x, z, column, H.caveIndex, floor + 1.1);
    island.cavityAt(x, z, upper, H.caveIndex);
    if (upper.floor <= column.floor + 0.5) continue;
    let station = Infinity;
    if (ramp) {
      let distance = Infinity;
      const points = basement.ramps[ramp - 1].samples;
      for (let i = 1; i < points.length; i++) {
        const a = points[i - 1], b = points[i], dx = b.x - a.x, dz = b.z - a.z, t = Math.max(0, Math.min(1, ((x - a.x) * dx + (z - a.z) * dz) / (dx * dx + dz * dz))), d = (x - a.x - dx * t) ** 2 + (z - a.z - dz * t) ** 2;
        if (d < distance) { distance = d; station = a.s + (b.s - a.s) * t; }
      }
    }
    if (station < 1) continue;
    const base = voxelTop(x, z, upper.floor) - U;
    stackedCells++;
    if (column.ceiling + H.rockCover > base + 1e-7) fail("full rock cover at actual stacked ceiling", x, column.ceiling, z, { ramp, upperFloor: upper.floor, upperRockBase: base });
    for (const depth of [U / 2, U * 1.5, U * 2.5]) if (!island.solidAt(x, column.ceiling + depth, z)) fail("solid separating rock across rendered ramp width", x, column.ceiling + depth, z, { ramp });
  }
  island.cavityAt(basement.room.x, basement.room.z, upper, H.caveIndex, H.floor + 1.1);
  const upperSupport = island.supportAt(basement.room.x, basement.room.z, H.floor + 0.1, 0.2);
  let upperRockBase = Infinity;
  for (const ramp of H.ramps) for (const point of ramp.samples) {
    let y = point.y - 0.001;
    while (!island.solidAt(point.x, y, point.z) && y > point.y - 1) y -= 0.025;
    if (island.solidAt(point.x, y, point.z)) upperRockBase = Math.min(upperRockBase, Math.ceil(y / island.unit) * island.unit - island.unit);
  }
  return { floor: basement.floor, ceiling: basement.ceiling, height: basement.ceiling - basement.floor, radius: basement.room.radius, upperFloor: upper.floor, upperSupport, upperRockBase, requiredCeiling: upperRockBase - H.rockCover, separation: upperSupport - basement.ceiling, rockCover: H.rockCover, unit: island.unit, commonSamples, rockSamples, floorCells: cells.size, renderCells, footingSamples, stackedCells, rooms, ramps, failures };
};
