(() => {
  "use strict";
  const BL = window.BL = window.BL || {};
  const { mulberry32, hexToRgb, clamp } = BL.math;
  // Dense voxel grid, 0 and outside both empty
  const makeGrid = (sx, sy, sz) => {
    const data = new Uint8Array(sx * sy * sz);
    const inside = (x, y, z) => x >= 0 && y >= 0 && z >= 0 && x < sx && y < sy && z < sz;
    const index = (x, y, z) => (x * sy + y) * sz + z;
    return {
      data,
      sx,
      sy,
      sz,
      index,
      get: (x, y, z) => inside(x, y, z) ? data[index(x, y, z)] : 0,
      set: (x, y, z, c) => {
        data[index(x, y, z)] = c;
      },
      has: (x, y, z) => inside(x, y, z) && data[index(x, y, z)] !== 0
    };
  };
  // Exposed grid faces, greedy-merged a slice at a time
  const DIR_BIT = 0x100;
  const gridGeometry = (grid, { unit, palette, origin = { x: 0, y: 0, z: 0 }, matrixCaves = null }) => {
    const { data, sx, sy, sz } = grid;
    const dims = [sx, sy, sz], strides = [sy * sz, sz, 1];
    const geo = { verts: [], faces: [], lines: [] };
    const mask = new Int16Array(Math.max(sx * sy, sy * sz, sz * sx));
    const corner = new Float64Array(3);
    const at = (d, k, u, i, v, j) => {
      corner[d] = k;
      corner[u] = i;
      corner[v] = j;
      geo.verts.push(origin.x + corner[0] * unit, origin.y + corner[1] * unit, origin.z + corner[2] * unit);
      return geo.verts.length / 3 - 1;
    };
    for (let d = 0; d < 3; d++) {
      const u = (d + 1) % 3, v = (d + 2) % 3;
      const nd = dims[d], nu = dims[u], nv = dims[v];
      const sd = strides[d], su = strides[u], sv = strides[v];
      for (let k = 0; k <= nd; k++) {
        // Faces between cells k-1 and k along d
        let n = 0;
        for (let j = 0; j < nv; j++) {
          for (let i = 0; i < nu; i++, n++) {
            const base = i * su + j * sv + k * sd;
            const a = k > 0 ? data[base - sd] : 0, b = k < nd ? data[base] : 0;
            const cave = matrixCaves && (a && !b && k < nd ? matrixCaves[base] : !a && b && k > 0 ? matrixCaves[base - sd] : 0);
            mask[n] = a && !b ? a | DIR_BIT | (cave << 9) : !a && b ? b | (cave << 9) : 0;
          }
        }
        n = 0;
        for (let j = 0; j < nv; j++) {
          for (let i = 0; i < nu;) {
            const c = mask[n];
            if (!c) {
              i++;
              n++;
              continue;
            }
            let w = 1;
            while (i + w < nu && mask[n + w] === c) w++;
            let h = 1;
            for (; j + h < nv; h++) {
              let same = true;
              for (let x = 0; x < w && same; x++) same = mask[n + x + h * nu] === c;
              if (!same) break;
            }
            // (d, u, v) is cyclic, so this order faces +d
            const c0 = at(d, k, u, i, v, j), c1 = at(d, k, u, i + w, v, j), c2 = at(d, k, u, i + w, v, j + h), c3 = at(d, k, u, i, v, j + h);
            geo.faces.push({ i: c & DIR_BIT ? [c0, c1, c2, c3] : [c0, c3, c2, c1], color: palette[c & 0xff], emissive: 0, matrixCave: c >> 9, matrixLocalGlyphSurface: (c >> 9) !== 0 });
            for (let y = 0; y < h; y++) mask.fill(0, n + y * nu, n + y * nu + w);
            i += w;
            n += w;
          }
        }
      }
    }
    return geo;
  };
  // Smooth value noise, three octaves, roughly 0..1
  const LATTICE = 64;
  const valueNoise = (rand) => {
    const cells = new Float32Array(LATTICE * LATTICE);
    for (let i = 0; i < cells.length; i++) cells[i] = rand();
    const at = (x, y) => {
      const ix = Math.floor(x), iy = Math.floor(y);
      const fx = x - ix, fy = y - iy;
      const tx = fx * fx * (3 - 2 * fx), ty = fy * fy * (3 - 2 * fy);
      const x0 = ix & (LATTICE - 1), x1 = (ix + 1) & (LATTICE - 1);
      const y0 = (iy & (LATTICE - 1)) * LATTICE, y1 = ((iy + 1) & (LATTICE - 1)) * LATTICE;
      const a = cells[y0 + x0] + (cells[y0 + x1] - cells[y0 + x0]) * tx;
      const b = cells[y1 + x0] + (cells[y1 + x1] - cells[y1 + x0]) * tx;
      return a + (b - a) * ty;
    };
    return (x, y) => at(x, y) * 0.6 + at(x * 2.1 + 17.3, y * 2.1 + 5.7) * 0.3 + at(x * 4.3 + 3.1, y * 4.3 + 11.9) * 0.1;
  };
  const smooth = (t) => {
    const k = clamp(t, 0, 1);
    return k * k * (3 - 2 * k);
  };

  // ---------- hub island ----------
  // Quarter-unit cells, clocks running clockwise from -z
  const UNIT = 0.25;
  const SX = 248, SY = 156, SZ = 248;
  // Paths sit on a grid twice as fine as the voxels, so their edges step at half a voxel
  const PX = SX * 2, PZ = SZ * 2;
  const SURFACE = 120;
  const ORIGIN = { x: -SX / 2 * UNIT, y: -SURFACE * UNIT, z: -SZ / 2 * UNIT };
  const RADIUS = 30, MEADOW = 22, DEPTH = RADIUS / Math.SQRT2;
  const UNDER_SPHERE_RADIUS = DEPTH * 1.5;
  const UNDER_SPHERE_CENTER = DEPTH - UNDER_SPHERE_RADIUS;
  const MAX_HEIGHT = 8;
  const BLUFF = 6;
  const MOUTH = { w: 5, h: 3, depth: 5 };
  const ROOM = { w: 6, h: 4, from: 2.5, to: 6.5 };
  const PATH_HALF = 0.75;
  const PATH_UNIT = UNIT / 2;
  const PATH_CAPACITY = 32768;
  const PATH_LIFT = 0.006;
  const MASTER_PATH_CENTER = 2;
  const GATE_Z = -(RADIUS - 2), PASS_HALF = 2.5, PASS_TOP = 5, TRAIL_HALF = 1;
  // Bluff, apron and trail measures
  const BLUFF_LEN = 8, SIDE_OUT = 2.5, APRON = 3, TRAIL_LEAN = 1.2;
  const P = { grass: 1, grassLight: 2, grassDark: 3, path: 4, stone: 5, stoneDark: 6, inner: 7, dirt: 8, floor: 9 };
  const PALETTE = [null, "#6f7d3e", "#7b8945", "#65733a", "#a3874f", "#877869", "#5e5449", "#2f2824", "#6a4e39", "#3a302a"].map((hex) => hex && hexToRgb(hex));
  const PATH_TILE = {
    verts: [-PATH_UNIT / 2, 0, -PATH_UNIT / 2, PATH_UNIT / 2, 0, -PATH_UNIT / 2, PATH_UNIT / 2, 0, PATH_UNIT / 2, -PATH_UNIT / 2, 0, PATH_UNIT / 2],
    faces: [{ i: [0, 3, 2, 1], color: PALETTE[P.path], emissive: 0 }],
    lines: []
  };
  const UNDER_BANDS = [P.dirt, P.stoneDark, P.dirt, P.stone];
  const undersideDepthAt = (radius) => Math.max(0, UNDER_SPHERE_CENTER + Math.sqrt(Math.max(0, UNDER_SPHERE_RADIUS * UNDER_SPHERE_RADIUS - radius * radius)));
  // Slot, its ring clock, and its tunnel clock
  const CLOCKS = [["c11", 11], ["c10", 10], ["c9", 9], ["c730", 7.5, 10.5], ["c1", 1], ["c2", 2], ["c3", 3], ["c5", 5, 2]];
  const HEADQUARTERS_CAVE = 9;
  const HEADQUARTERS_FLOOR = -7;
  const HEADQUARTERS_CEILING = -2.75;
  const HEADQUARTERS_ROOM = { x: 0, z: 0, radius: 14 };
  const HEADQUARTERS_RAMP_ARC = 1.4;
  const HEADQUARTERS_RAMP_SAMPLES = 96;
  const facing = (angle) => {
    const ry = (Math.PI * 2 - angle) % (Math.PI * 2);
    return ry > Math.PI ? ry - Math.PI * 2 : ry;
  };
  const ISLANDS = new Map();
  const island = ({ seed = 1 } = {}) => {
    const hit = ISLANDS.get(seed);
    if (hit) return hit;
    const rand = mulberry32(seed);
    const noise = valueNoise(rand);
    // A spoke from the ring path to the cliff face
    const spoke = (angle, axis = angle) => {
      const ox = Math.sin(axis), oz = -Math.cos(axis);
      const lean = Math.cos(angle) * ox + Math.sin(angle) * oz;
      const sign = rand() < 0.5 ? -1 : 1, amp = 0.8 + rand() * 0.7;
      const reach = MEADOW + (lean ? SIDE_OUT : 0);
      return { angle, axis, ox, oz, lean, x: Math.sin(angle) * reach, z: -Math.cos(angle) * reach, e: UNIT / 2 * (Math.abs(ox) + Math.abs(oz)) - 1e-6, wobble: (lean ? -Math.sign(lean) : sign) * amp };
    };
    const frames = CLOCKS.map(([id, clock, axis = clock]) => ({ id, clock, ...spoke(clock / 12 * Math.PI * 2, axis / 12 * Math.PI * 2) }));
    const pass = spoke(0);
    const spokes = [...frames.filter((frame) => frame.id !== "c730" && frame.id !== "c5"), pass, spoke(Math.PI)];
    const headquartersFrames = [frames.find((f) => f.id === "c730"), frames.find((f) => f.id === "c5")];
    const headquartersFronts = headquartersFrames.map((f) => ({
      id: f.id,
      center: { x: f.x - f.ox * 1.6, z: f.z - f.oz * 1.6 },
      tangent: { x: -f.oz, z: f.ox },
      halfLength: 4.75,
      halfWidth: 1
    }));
    const grid = makeGrid(SX, SY, SZ);
    // Ownership follows carved empty cells, so merged exterior faces cannot inherit
    // a cave's local Matrix layer merely because they share a bounding box.
    const matrixCaves = new Uint8Array(grid.data.length);
    // Exact carved column ownership, floor and ceiling in quarter-unit cells.
    // Six bits apiece cover -8..7.5; ceiling 63 means open sky.
    const cavities = new Uint16Array(SX * SZ);
    const lowerCavities = new Uint16Array(SX * SZ);
    const rampCells = new Uint8Array(SX * SZ);
    const rampCollision = new Uint32Array(SX * SZ);
    const rampHeights = new Float32Array((SX + 1) * (SZ + 1));
    const height = new Float32Array(SX * SZ);
    const paths = new Uint8Array(PX * PZ);
    const meadow = new Uint8Array(SX * SZ);
    // Walkable top, colour and underside per column
    const NONE = -SY;
    const tops = new Float32Array(SX * SZ).fill(NONE);
    const surfaces = new Uint8Array(SX * SZ);
    const bottoms = new Uint8Array(SX * SZ);
    // Colours sample a half-unit lattice so quads merge
    const q = (w) => Math.floor(w * 2) / 2;
    // Seamless noise around the island, by sector
    const around = (theta, k, c) => noise(Math.cos(theta) * k + c, Math.sin(theta) * k + c);
    const grassAt = (wx, wz) => {
      const g = noise(q(wx) / 3 + 120, q(wz) / 3 + 60);
      return g < 0.38 ? P.grassDark : g < 0.68 ? P.grass : P.grassLight;
    };
    // Blocky stone and dirt strata on cliff faces
    const strata = (wx, wz, gy) => {
      const s = noise(q(wx) / 2 + q(gy * UNIT) * 1.8 + 400, q(wz) / 2 + 400);
      return s < 0.35 ? P.stoneDark : s < 0.7 ? P.stone : P.dirt;
    };
    for (let gx = 0; gx < SX; gx++) {
      const wx = (gx + 0.5) * UNIT + ORIGIN.x;
      for (let gz = 0; gz < SZ; gz++) {
        const wz = (gz + 0.5) * UNIT + ORIGIN.z;
        const i = gx * SZ + gz;
        const r = Math.hypot(wx, wz);
        if (r >= RADIUS) continue;
        // Flatten a bluff and apron around each mouth
        let bluff = 0, apron = false;
        for (const f of frames) {
          const dx = wx - f.x, dz = wz - f.z;
          const along = dx * f.ox + dz * f.oz, across = Math.abs(dz * f.ox - dx * f.oz);
          if (along > -f.e && across < 5) bluff = Math.max(bluff, (1 - smooth((across - 3) / 2)) * (1 - smooth((along - BLUFF_LEN) / 2)));
          else if (f.lean && along > -APRON && across < 3.5) apron = true;
        }
        const theta = Math.atan2(wx, -wz);
        // The rim erodes, except around the mouths
        const rim = bluff > 0 ? r : r + (noise(wx / 6 + 40, wz / 6 + 40) - 0.5) * 2 + (around(theta, 3, 120) - 0.5) * 4;
        if (rim >= RADIUS) continue;
        // Edge, slope and plateau vary by sector
        let near = 0;
        for (const f of frames) near = Math.max(near, 1 - smooth((Math.hypot(wx - f.x, wz - f.z) - 5) / 5));
        const edge = MEADOW + (around(theta, 2.2, 30) - 0.5) * 7 * (1 - near);
        const ramp = 3 + around(theta, 1.7, 60) * 6;
        const plateau = 2.5 + around(theta, 1.4, 90) * 5;
        let top = 0, surface = grassAt(wx, wz);
        if (r < edge && bluff <= 0) {
          meadow[i] = 1;
        } else {
          // Terraces to a plateau, dipping at rim and six
          let h = 0.4 + (plateau + noise(wx / 12 + 80, wz / 12 + 80) * 2.5) * smooth((r - edge) / ramp) - 1.2 * smooth((r - (RADIUS - 2)) / 2) + (noise(wx / 5 + 20, wz / 5 + 20) - 0.5) * 1.2;
          h *= 1 - 0.6 * smooth(1 - (Math.PI - Math.abs(theta)) / 0.5);
          const crest = BLUFF + noise(wx / 4 + 500, wz / 4 + 500) * 1.5;
          if (h < crest) h += (crest - h) * bluff;
          const patch = noise(q(wx) / 4 + 700, q(wz) / 4 + 700);
          if (apron) h = 0;
          else if (patch <= 0.58) surface = patch < 0.3 ? P.stoneDark : P.stone;
          if (Math.abs(wx) < PASS_HALF && wz < 0) {
            h = Math.min(PASS_TOP, Math.floor((r - MEADOW) / UNIT) * UNIT);
            surface = grassAt(wx, wz);
          }
          top = clamp(Math.round(h / UNIT) * UNIT, 0, MAX_HEIGHT);
        }
        // Carry the ground-level frontage across the outer ridge without
        // lowering any column behind the headquarters doorway plane.
        for (const front of headquartersFronts) {
          const dx = wx - front.center.x, dz = wz - front.center.z;
          const across = dx * front.tangent.x + dz * front.tangent.z, depth = dx * -front.tangent.z + dz * front.tangent.x;
          const padding = UNIT / 2 * (Math.abs(front.tangent.x) + Math.abs(front.tangent.z));
          if (Math.abs(across) < front.halfLength + padding && Math.abs(depth) < front.halfWidth + padding && depth > -1.1) {
            top = 0;
            surface = grassAt(wx, wz);
            meadow[i] = 1;
            break;
          }
        }
        // A voxel-stepped bottom-third spherical cap under the unchanged playable surface
        const depth = undersideDepthAt(r);
        tops[i] = top;
        surfaces[i] = surface;
        bottoms[i] = Math.max(0, SURFACE - 1 - Math.floor(depth / UNIT));
      }
    }
    // Fill columns, with stone showing at step edges
    const row = (j) => tops[j] === NONE ? -1 : SURFACE - 1 + Math.round(tops[j] / UNIT);
    const { data } = grid;
    for (let gx = 0; gx < SX; gx++) {
      const wx = (gx + 0.5) * UNIT + ORIGIN.x;
      for (let gz = 0; gz < SZ; gz++) {
        const i = gx * SZ + gz;
        const top = tops[i];
        if (top === NONE) continue;
        const wz = (gz + 0.5) * UNIT + ORIGIN.z;
        const gyTop = SURFACE - 1 + Math.round(top / UNIT);
        const band = Math.floor(noise(q(wx) / 6 + 300, q(wz) / 6 + 300) * 3);
        const edge = top > 0 && top - Math.min(tops[i - SZ], tops[i + SZ], tops[i - 1], tops[i + 1]) >= 1;
        const walled = Math.min(row(i - SZ), row(i + SZ), row(i - 1), row(i + 1));
        const column = (gx * SY) * SZ + gz;
        for (let gy = bottoms[i]; gy <= gyTop; gy++) {
          data[column + gy * SZ] = gy === gyTop && !edge ? surfaces[i] : gy < SURFACE ? UNDER_BANDS[Math.floor((SURFACE - 1 - gy + band * 2) / 6) % 4] : gy <= walled && gy < gyTop ? P.stone : strata(wx, wz, gy);
        }
      }
    }
    const encodeCavity = (caveIndex, floor, ceiling) => {
      const floorCell = Math.round(floor / UNIT) + 32;
      const ceilingCell = Number.isFinite(ceiling) ? Math.round(ceiling / UNIT) + 32 : 63;
      return caveIndex | (floorCell << 4) | (ceilingCell << 10);
    };
    // Carve tunnel and room as rotated boxes
    const carve = (f, caveIndex) => {
      const e = f.e;
      const cx = f.x + f.ox * 4, cz = f.z + f.oz * 4;
      const gx0 = Math.max(0, Math.floor((cx - 7 - ORIGIN.x) / UNIT)), gx1 = Math.min(SX - 1, Math.ceil((cx + 7 - ORIGIN.x) / UNIT));
      const gz0 = Math.max(0, Math.floor((cz - 7 - ORIGIN.z) / UNIT)), gz1 = Math.min(SZ - 1, Math.ceil((cz + 7 - ORIGIN.z) / UNIT));
      const columns = [];
      for (let gx = gx0; gx <= gx1; gx++) {
        const wx = (gx + 0.5) * UNIT + ORIGIN.x;
        for (let gz = gz0; gz <= gz1; gz++) {
          const wz = (gz + 0.5) * UNIT + ORIGIN.z;
          const dx = wx - f.x, dz = wz - f.z;
          const along = dx * f.ox + dz * f.oz, across = Math.abs(dz * f.ox - dx * f.oz);
          const room = along > ROOM.from - e && along < ROOM.to + e && across < ROOM.w / 2 + e;
          if (!room && !(along > -0.5 && along < MOUTH.depth + e && across < MOUTH.w / 2 + e)) continue;
          const gyTop = SURFACE - 1 + Math.round((room ? ROOM.h : MOUTH.h) / UNIT);
          for (let gy = SURFACE; gy <= gyTop; gy++) {
            grid.set(gx, gy, gz, 0);
            // The opening lies at local z=.5; the exterior rim remains global.
            if (along > e - 0.48) matrixCaves[grid.index(gx, gy, gz)] = caveIndex;
          }
          if (grid.has(gx, SURFACE - 1, gz)) {
            const ceiling = grid.has(gx, gyTop + 1, gz) ? Math.round((gyTop + 1 - SURFACE) * UNIT) : 0;
            cavities[gx * SZ + gz] = encodeCavity(caveIndex, 0, ceiling || Infinity);
          }
          if (along > -e) columns.push(gx, gyTop, gz);
        }
      }
      for (let i = 0; i < columns.length; i += 3) {
        const gx = columns[i], gyTop = columns[i + 1], gz = columns[i + 2];
        if (grid.has(gx, SURFACE - 1, gz)) grid.set(gx, SURFACE - 1, gz, P.floor);
        if (grid.has(gx, gyTop + 1, gz)) grid.set(gx, gyTop + 1, gz, P.inner);
        for (let gy = SURFACE; gy <= gyTop; gy++) {
          if (grid.has(gx + 1, gy, gz)) grid.set(gx + 1, gy, gz, P.inner);
          if (grid.has(gx - 1, gy, gz)) grid.set(gx - 1, gy, gz, P.inner);
          if (grid.has(gx, gy, gz + 1)) grid.set(gx, gy, gz + 1, P.inner);
          if (grid.has(gx, gy, gz - 1)) grid.set(gx, gy, gz - 1, P.inner);
        }
      }
    };
    for (let i = 0; i < frames.length; i++) {
      if (frames[i].id !== "c730" && frames[i].id !== "c5") carve(frames[i], i + 1);
    }
    const headquartersRamps = headquartersFrames.map((f, i) => {
      const from = { x: f.x - f.ox * 0.5, z: f.z - f.oz * 0.5 };
      const startAngle = Math.atan2(from.x, -from.z), direction = i ? -1 : 1;
      const startRadius = Math.hypot(from.x, from.z), endRadius = HEADQUARTERS_ROOM.radius - 0.8;
      const samples = [];
      for (let n = 0; n <= HEADQUARTERS_RAMP_SAMPLES; n++) {
        const t = n / HEADQUARTERS_RAMP_SAMPLES;
        const angle = startAngle + direction * HEADQUARTERS_RAMP_ARC * t;
        const radius = startRadius + (endRadius - startRadius) * smooth((t - 0.38) / 0.62);
        samples.push({ x: Math.sin(angle) * radius, z: -Math.cos(angle) * radius, y: HEADQUARTERS_FLOOR * Math.min(t / 0.54, 1), t });
      }
      const to = samples[samples.length - 1];
      return { id: f.id, from, to: { x: to.x, z: to.z }, width: 4, startAngle, endAngle: startAngle + direction * HEADQUARTERS_RAMP_ARC, direction, slope: -samples[1].y / Math.hypot(samples[1].x - from.x, samples[1].z - from.z), axis: { x: f.ox, z: f.oz }, samples };
    });
    const headquartersRooms = [120, 138, 160, 174, 188, 202, 216, 238, 255].map((degrees, index) => {
      const angle = degrees / 180 * Math.PI, sx = Math.sin(angle), sz = -Math.cos(angle);
      // The end rooms stay inside the descents; the rest nest into the outer shell.
      const window = index >= 2 && index <= 6, radius = window ? 23.25 : 19, width = 5, depth = 5;
      return { index, angle, radius, window, x: sx * radius, z: sz * radius, width, depth, approach: { x: sx * 13.25, z: sz * 13.25 }, entrance: { x: sx * (radius - depth / 2 - 0.05), z: sz * (radius - depth / 2 - 0.05) }, back: { x: sx * (radius + depth / 2 - 0.2), z: sz * (radius + depth / 2 - 0.2) } };
    });
    const headquartersGallery = { startAngle: -32 * Math.PI / 180, endAngle: 47 * Math.PI / 180, radius: 24.5 };
    // The two spare nooks open sideways off the window gallery, away from the
    // clear ramp landings. Their entrances face the gallery, not the island centre.
    for (const side of [-1, 1]) {
      const edge = side < 0 ? headquartersGallery.startAngle : headquartersGallery.endAngle, angle = edge + side * Math.PI / 2;
      const edgeRadius = 21.25, width = 7, depth = 6;
      const sx = Math.sin(angle), sz = -Math.cos(angle), edgeX = Math.sin(edge) * edgeRadius, edgeZ = -Math.cos(edge) * edgeRadius;
      // The window faces outward through the long side wall, not toward the ramp.
      const x = edgeX + sx * 3.7, z = edgeZ + sz * 3.7, windowScale = (edgeRadius + width / 2 - 0.2) / edgeRadius;
      headquartersRooms.push({ index: headquartersRooms.length, angle, radius: Math.hypot(x, z), window: true, windowAngle: Math.atan2(x, -z), windowAt: { x: x * windowScale, z: z * windowScale }, nook: true, x, z, width, depth, approach: { x: edgeX - sx * 1.1, z: edgeZ - sz * 1.1 }, entrance: { x: x - sx * (depth / 2 + 0.05), z: z - sz * (depth / 2 + 0.05) }, back: { x: x + sx * (depth / 2 - 0.2), z: z + sz * (depth / 2 - 0.2) } });
    }
    const carveHeadquartersColumn = (gx, gz, floor, ceiling) => {
      const floorGy = SURFACE - 1 + Math.round(floor / UNIT);
      const ceilingGy = SURFACE + Math.round(ceiling / UNIT);
      grid.set(gx, floorGy, gz, P.floor);
      for (let gy = floorGy + 1; gy < ceilingGy; gy++) grid.set(gx, gy, gz, 0);
      if (grid.has(gx, ceilingGy, gz)) grid.set(gx, ceilingGy, gz, P.inner);
      lowerCavities[gx * SZ + gz] = encodeCavity(HEADQUARTERS_CAVE, floor, ceiling);
      for (let gy = floorGy + 1; gy < ceilingGy; gy++) {
        if (grid.has(gx + 1, gy, gz)) grid.set(gx + 1, gy, gz, strata((gx + 1) * UNIT + ORIGIN.x, gz * UNIT + ORIGIN.z, gy));
        if (grid.has(gx - 1, gy, gz)) grid.set(gx - 1, gy, gz, strata((gx - 1) * UNIT + ORIGIN.x, gz * UNIT + ORIGIN.z, gy));
        if (grid.has(gx, gy, gz + 1)) grid.set(gx, gy, gz + 1, strata(gx * UNIT + ORIGIN.x, (gz + 1) * UNIT + ORIGIN.z, gy));
        if (grid.has(gx, gy, gz - 1)) grid.set(gx, gy, gz - 1, strata(gx * UNIT + ORIGIN.x, (gz - 1) * UNIT + ORIGIN.z, gy));
      }
    };
    const rampProbe = { distance: 0, floor: 0 };
    const sampleRamp = (ramp, x, z, out) => {
      let distance = Infinity, floor = 0;
      for (let i = 1; i < ramp.samples.length; i++) {
        const a = ramp.samples[i - 1], b = ramp.samples[i], dx = b.x - a.x, dz = b.z - a.z;
        const t = clamp(((x - a.x) * dx + (z - a.z) * dz) / (dx * dx + dz * dz), 0, 1);
        const ex = x - a.x - dx * t, ez = z - a.z - dz * t, d = ex * ex + ez * ez;
        if (d < distance) { distance = d; floor = a.y + (b.y - a.y) * t; }
      }
      out.distance = Math.sqrt(distance);
      const along = (x - ramp.from.x) * ramp.axis.x + (z - ramp.from.z) * ramp.axis.z;
      // A short planar throat meets the doorway exactly, then bends into the curve.
      const join = clamp((along - 1) / 0.75, 0, 1);
      out.floor = -Math.max(0, along) * ramp.slope * (1 - join) + floor * join;
    };
    // Stone tunnel walls keep their voxels; their walking surfaces are continuous slopes.
    for (let ri = 0; ri < headquartersRamps.length; ri++) {
      const ramp = headquartersRamps[ri];
      let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
      for (const sample of ramp.samples) {
        minX = Math.min(minX, sample.x - ramp.width / 2);
        maxX = Math.max(maxX, sample.x + ramp.width / 2);
        minZ = Math.min(minZ, sample.z - ramp.width / 2);
        maxZ = Math.max(maxZ, sample.z + ramp.width / 2);
      }
      const gx0 = Math.max(0, Math.floor((minX - ORIGIN.x) / UNIT)), gx1 = Math.min(SX - 1, Math.ceil((maxX - ORIGIN.x) / UNIT));
      const gz0 = Math.max(0, Math.floor((minZ - ORIGIN.z) / UNIT)), gz1 = Math.min(SZ - 1, Math.ceil((maxZ - ORIGIN.z) / UNIT));
      for (let gx = gx0; gx <= gx1; gx++) {
        const wx = (gx + 0.5) * UNIT + ORIGIN.x;
        for (let gz = gz0; gz <= gz1; gz++) {
          const wz = (gz + 0.5) * UNIT + ORIGIN.z;
          sampleRamp(ramp, wx, wz, rampProbe);
          if (rampProbe.distance > ramp.width / 2 || (wx - ramp.from.x) * ramp.axis.x + (wz - ramp.from.z) * ramp.axis.z < -UNIT / 2) continue;
          const floor = rampProbe.floor;
          rampCells[gx * SZ + gz] = ri + 1;
          carveHeadquartersColumn(gx, gz, Math.max(HEADQUARTERS_FLOOR - UNIT, Math.floor(floor / UNIT) * UNIT - UNIT), Math.ceil((floor + 3.5) / UNIT) * UNIT);
          const frame = headquartersFrames[ri], dx = wx - frame.x, dz = wz - frame.z;
          const along = dx * frame.ox + dz * frame.oz, across = Math.abs(dz * frame.ox - dx * frame.oz);
          if (along > frame.e - 0.48 && along < ROOM.to && across < ROOM.w / 2) {
            const index = frames.indexOf(frame) + 1;
            for (let gy = SURFACE + Math.floor(floor / UNIT) - 1; gy < SURFACE + Math.ceil((floor + 3.5) / UNIT); gy++) {
              if (!grid.has(gx, gy, gz)) matrixCaves[grid.index(gx, gy, gz)] = index;
            }
          }
        }
      }
    }
    const roomGX0 = Math.floor((-27 - ORIGIN.x) / UNIT), roomGX1 = Math.ceil((27 - ORIGIN.x) / UNIT);
    const roomGZ0 = Math.floor((-27 - ORIGIN.z) / UNIT), roomGZ1 = Math.ceil((27 - ORIGIN.z) / UNIT);
    for (let gx = roomGX0; gx <= roomGX1; gx++) {
      const wx = (gx + 0.5) * UNIT + ORIGIN.x;
      for (let gz = roomGZ0; gz <= roomGZ1; gz++) {
        const wz = (gz + 0.5) * UNIT + ORIGIN.z;
        const radius = Math.hypot(wx, wz), angle = Math.atan2(wx, -wz);
        let inside = radius < HEADQUARTERS_ROOM.radius || radius < headquartersGallery.radius && angle > headquartersGallery.startAngle && angle < headquartersGallery.endAngle;
        for (const room of headquartersRooms) {
          const sx = Math.sin(room.angle), sz = -Math.cos(room.angle);
          const dx = wx - room.x, dz = wz - room.z, along = dx * sx + dz * sz, across = Math.abs(dx * -sz + dz * sx);
          const depth = Math.abs(along), approach = (room.approach.x - room.x) * sx + (room.approach.z - room.z) * sz;
          if (across < room.width / 2 && depth < room.depth / 2 && across + depth < (room.width + room.depth) / 2 - 0.55 || along > approach && along < -room.depth / 2 + 1.15 && across < room.width / 2 - 0.65) inside = true;
        }
        if (!inside) continue;
        // Both ramps are level before they meet the common floor or personal caves.
        if (rampCells[gx * SZ + gz]) {
          sampleRamp(headquartersRamps[rampCells[gx * SZ + gz] - 1], wx, wz, rampProbe);
          if (rampProbe.floor > HEADQUARTERS_FLOOR) continue;
        }
        rampCells[gx * SZ + gz] = 0;
        carveHeadquartersColumn(gx, gz, HEADQUARTERS_FLOOR, HEADQUARTERS_CEILING);
      }
    }
    const rampGeometry = { verts: [], faces: [], lines: [] };
    for (let gx = 0; gx <= SX; gx++) {
      for (let gz = 0; gz <= SZ; gz++) {
        const ri = (gx < SX && gz < SZ && rampCells[gx * SZ + gz]) || (gx > 0 && gz < SZ && rampCells[(gx - 1) * SZ + gz]) || (gx < SX && gz > 0 && rampCells[gx * SZ + gz - 1]) || (gx > 0 && gz > 0 && rampCells[(gx - 1) * SZ + gz - 1]);
        if (!ri) continue;
        sampleRamp(headquartersRamps[ri - 1], gx * UNIT + ORIGIN.x, gz * UNIT + ORIGIN.z, rampProbe);
        rampHeights[gx * (SZ + 1) + gz] = rampProbe.floor;
      }
    }
    for (let gx = 0; gx < SX; gx++) {
      for (let gz = 0; gz < SZ; gz++) {
        if (!rampCells[gx * SZ + gz]) continue;
        const wx = gx * UNIT + ORIGIN.x, wz = gz * UNIT + ORIGIN.z, v = rampGeometry.verts.length / 3, i = gx * (SZ + 1) + gz;
        const ramp = headquartersRamps[rampCells[gx * SZ + gz] - 1];
        const corners = [[wx, rampHeights[i], wz], [wx, rampHeights[i + 1], wz + UNIT], [wx + UNIT, rampHeights[i + SZ + 2], wz + UNIT], [wx + UNIT, rampHeights[i + SZ + 1], wz]], clipped = [];
        for (let n = 0; n < 4; n++) {
          const a = corners[n], b = corners[(n + 1) % 4];
          const da = (a[0] - ramp.from.x) * ramp.axis.x + (a[2] - ramp.from.z) * ramp.axis.z, db = (b[0] - ramp.from.x) * ramp.axis.x + (b[2] - ramp.from.z) * ramp.axis.z;
          if (da >= 0) clipped.push(a);
          if ((da < 0) !== (db < 0)) { const t = da / (da - db); clipped.push([a[0] + (b[0] - a[0]) * t, 0, a[2] + (b[2] - a[2]) * t]); }
        }
        if (clipped.length < 3) continue;
        for (const p of clipped) rampGeometry.verts.push(...p);
        const frame = headquartersFrames[rampCells[gx * SZ + gz] - 1], dx = wx + UNIT / 2 - frame.x, dz = wz + UNIT / 2 - frame.z;
        const along = dx * frame.ox + dz * frame.oz, across = Math.abs(dz * frame.ox - dx * frame.oz);
        const cave = along > frame.e - 0.48 && along < ROOM.to && across < ROOM.w / 2 ? frames.indexOf(frame) + 1 : 0;
        // Curving slopes are not coplanar quads: glyphs and collision share the
        // renderer's exact triangles, including the clipped doorway boundary.
        rampCollision[gx * SZ + gz] = (rampGeometry.faces.length << 2) | (clipped.length - 2);
        for (let n = 1; n < clipped.length - 1; n++) rampGeometry.faces.push({ i: [v, v + n, v + n + 1], color: PALETTE[(Math.floor(gx / 4) + Math.floor(gz / 4)) % 5 === 0 ? P.stoneDark : P.floor], emissive: 0, headquartersRamp: true, matrixCave: cave, matrixLocalGlyphSurface: cave !== 0 });
      }
    }
    // Window openings cut through the cliff, with solid stone below each sill.
    const headquartersWindows = [];
    for (const ramp of headquartersRamps) {
      for (const index of [18, 30, 43]) {
        const sample = ramp.samples[index], angle = Math.atan2(sample.x, -sample.z);
        headquartersWindows.push({ kind: "ramp", x: sample.x, z: sample.z, floor: sample.y, y: sample.y + 2, sill: Math.ceil((sample.y + 1.05) / UNIT) * UNIT, angle, width: 3, height: 1.75 });
      }
    }
    for (const room of headquartersRooms) {
      // No borrowed views into the ramps: the inner rooms have solid backs.
      if (!room.window) continue;
      const sill = HEADQUARTERS_FLOOR + 1, height = 2, at = room.windowAt || room.back;
      headquartersWindows.push({ kind: "room", roomIndex: room.index, x: at.x, z: at.z, floor: HEADQUARTERS_FLOOR, y: sill + height / 2, sill, angle: room.windowAngle ?? room.angle, width: 3.5, height });
    }
    const panoramaStart = headquartersGallery.startAngle + Math.PI / 90, panoramaEnd = headquartersGallery.endAngle - Math.PI / 90;
    const panoramaAngle = (panoramaStart + panoramaEnd) / 2, panoramaRadius = headquartersGallery.radius - UNIT;
    headquartersWindows.push({ kind: "panorama", x: Math.sin(panoramaAngle) * panoramaRadius, z: -Math.cos(panoramaAngle) * panoramaRadius, floor: HEADQUARTERS_FLOOR, y: HEADQUARTERS_FLOOR + 2.125, sill: HEADQUARTERS_FLOOR + 1, angle: panoramaAngle, startAngle: panoramaStart, endAngle: panoramaEnd, radius: panoramaRadius, width: panoramaRadius * (panoramaEnd - panoramaStart), height: 2.25 });
    for (const window of headquartersWindows) {
      const sx = Math.sin(window.angle), sz = -Math.cos(window.angle), start = Math.hypot(window.x, window.z);
      window.outer = { x: sx * 31, z: sz * 31 };
      for (let gx = 0; gx < SX; gx++) {
        const wx = (gx + 0.5) * UNIT + ORIGIN.x;
        for (let gz = 0; gz < SZ; gz++) {
          const wz = (gz + 0.5) * UNIT + ORIGIN.z, along = wx * sx + wz * sz, across = Math.abs(wx * -sz + wz * sx);
          if (window.kind === "panorama") {
            const angle = Math.atan2(wx, -wz);
            if (Math.hypot(wx, wz) < window.radius || angle <= window.startAngle || angle >= window.endAngle) continue;
          } else if (along < start || across >= window.width / 2) continue;
          for (let gy = SURFACE + Math.round(window.sill / UNIT); gy < SURFACE + Math.round((window.sill + window.height) / UNIT); gy++) grid.set(gx, gy, gz, 0);
        }
      }
    }
    // Walkable height is the lowest run's top
    const surface = new Float32Array(SX * SZ);
    const land = new Uint8Array(SX * SZ);
    for (let gx = 0; gx < SX; gx++) {
      for (let gz = 0; gz < SZ; gz++) {
        const column = (gx * SY) * SZ + gz;
        let gy = 0;
        while (gy < SY && !data[column + gy * SZ]) gy++;
        if (gy === SY) continue;
        while (gy < SY && data[column + gy * SZ]) gy++;
        const i = gx * SZ + gz;
        height[i] = (gy - SURFACE) * UNIT;
        land[i] = 1;
        let top = SY;
        while (top > gy && !data[column + (top - 1) * SZ]) top--;
        surface[i] = (top - SURFACE) * UNIT;
      }
    }
    const column = (x, z) => {
      const gx = Math.floor((x - ORIGIN.x) / UNIT), gz = Math.floor((z - ORIGIN.z) / UNIT);
      return gx >= 0 && gz >= 0 && gx < SX && gz < SZ ? gx * SZ + gz : -1;
    };
    const rampFloorAt = (x, z) => {
      const px = (x - ORIGIN.x) / UNIT, pz = (z - ORIGIN.z) / UNIT;
      const gx = Math.floor(px), gz = Math.floor(pz), tx = px - gx, tz = pz - gz, i = gx * (SZ + 1) + gz;
      const ramp = headquartersRamps[rampCells[gx * SZ + gz] - 1], along = (x - ramp.from.x) * ramp.axis.x + (z - ramp.from.z) * ramp.axis.z;
      if (along <= 0) return 0;
      if (along < 0.75) return -along * ramp.slope;
      const a = rampHeights[i], b = rampHeights[i + 1], c = rampHeights[i + SZ + 2], d = rampHeights[i + SZ + 1];
      return tz >= tx ? a * (1 - tz) + b * (tz - tx) + c * tx : a * (1 - tx) + c * tz + d * (tx - tz);
    };
    const heightAt = (x, z) => {
      const i = column(x, z);
      return i < 0 ? 0 : rampCells[i] ? rampFloorAt(x, z) : height[i];
    };
    const surfaceAt = (x, z) => {
      const i = column(x, z);
      return i < 0 ? 0 : rampCells[i] ? Math.max(surface[i], rampFloorAt(x, z)) : surface[i];
    };
    // Select the actual supporting run by height, including shelves and window
    // sills. A rock column taller than the permitted step returns its own top,
    // so callers can reject it instead of falling back to the room below it.
    const supportAt = (x, z, y = Infinity, maxStep = 0.6) => {
      const i = column(x, z);
      if (i < 0 || !land[i]) return 0;
      if (y >= surface[i] - maxStep) return surfaceAt(x, z);
      const gx = Math.floor(i / SZ), gz = i % SZ, base = gx * SY * SZ + gz;
      let gy = clamp(Math.floor((y + maxStep - ORIGIN.y) / UNIT), 0, SY - 1);
      if (data[base + gy * SZ]) {
        while (gy < SY && data[base + gy * SZ]) gy++;
      } else {
        while (gy >= 0 && !data[base + gy * SZ]) gy--;
        gy++;
      }
      const floor = (gy - SURFACE) * UNIT;
      return rampCells[i] ? Math.max(floor, rampFloorAt(x, z)) : floor;
    };
    // A circle overlaps a column exactly; corner-only contact is not a wall.
    const overlapsColumn = (x, z, radius2, gx, gz) => {
      const dx = Math.max(0, Math.abs((gx + 0.5) * UNIT + ORIGIN.x - x) - UNIT / 2);
      const dz = Math.max(0, Math.abs((gz + 0.5) * UNIT + ORIGIN.z - z) - UNIT / 2);
      return radius2 ? dx * dx + dz * dz < radius2 - 1e-12 : dx === 0 && dz === 0;
    };
    // Highest point of a rendered slope triangle under a circular footprint.
    // The maximum is on an edge or at the disk's uphill point; no samples or
    // temporary vectors are needed, even at the clipped doorway triangles.
    const rampTriangleTop = (face, x, z, radius) => {
      const verts = geometry.verts, indices = face.i;
      const a = indices[0] * 3, b = indices[1] * 3, c = indices[2] * 3;
      const ax = verts[a], ay = verts[a + 1], az = verts[a + 2];
      const bx = verts[b] - ax, by = verts[b + 1] - ay, bz = verts[b + 2] - az;
      const cx = verts[c] - ax, cy = verts[c + 1] - ay, cz = verts[c + 2] - az;
      const determinant = bx * cz - bz * cx;
      const gradientX = (by * cz - cy * bz) / determinant, gradientZ = (bx * cy - cx * by) / determinant;
      const length = Math.hypot(gradientX, gradientZ), scale = length ? radius / length : 0;
      const px = x + gradientX * scale - ax, pz = z + gradientZ * scale - az;
      const u = (px * cz - pz * cx) / determinant, v = (bx * pz - bz * px) / determinant;
      let top = u >= -1e-9 && v >= -1e-9 && u + v <= 1 + 1e-9 ? ay + gradientX * px + gradientZ * pz : -Infinity;
      for (let edge = 0; edge < 3; edge++) {
        const p = indices[edge] * 3, q = indices[(edge + 1) % 3] * 3;
        const dx = verts[q] - verts[p], dz = verts[q + 2] - verts[p + 2], dy = verts[q + 1] - verts[p + 1];
        const ex = x - verts[p], ez = z - verts[p + 2], length2 = dx * dx + dz * dz;
        const middle = (ex * dx + ez * dz) / length2;
        const perpendicularX = ex - dx * middle, perpendicularZ = ez - dz * middle;
        const remaining = radius * radius - perpendicularX * perpendicularX - perpendicularZ * perpendicularZ;
        if (remaining < 0) continue;
        const half = Math.sqrt(remaining / length2), lo = Math.max(0, middle - half), hi = Math.min(1, middle + half);
        if (lo <= hi) top = Math.max(top, verts[p + 1] + dy * (dy > 0 ? hi : lo));
      }
      return top;
    };
    // Exact voxel overlap for a vertical cylinder, bottom y and upward height.
    // Slopes fill the small gap above their voxel bases using the render mesh.
    const clearAt = (x, y, z, radius = 0, bodyHeight = 0) => {
      const epsilon = 1e-7, edge = radius ? epsilon : 0, cap = bodyHeight ? epsilon : 0;
      const gx0 = Math.max(0, Math.floor((x - radius - ORIGIN.x + edge) / UNIT)), gx1 = Math.min(SX - 1, Math.floor((x + radius - ORIGIN.x - edge) / UNIT));
      const gz0 = Math.max(0, Math.floor((z - radius - ORIGIN.z + edge) / UNIT)), gz1 = Math.min(SZ - 1, Math.floor((z + radius - ORIGIN.z - edge) / UNIT));
      const gy0 = Math.max(0, Math.floor((y - ORIGIN.y + cap) / UNIT)), gy1 = Math.min(SY - 1, Math.floor((y + bodyHeight - ORIGIN.y - cap) / UNIT));
      for (let gx = gx0; gx <= gx1; gx++) for (let gz = gz0; gz <= gz1; gz++) {
        if (!overlapsColumn(x, z, radius * radius, gx, gz)) continue;
        const base = gx * SY * SZ + gz, i = gx * SZ + gz;
        for (let gy = gy0; gy <= gy1; gy++) if (data[base + gy * SZ]) return false;
        const range = rampCollision[i];
        if (!range || y + bodyHeight <= height[i] + epsilon) continue;
        for (let n = 0; n < (range & 3); n++) {
          const face = geometry.faces[rampFaceOffset + (range >>> 2) + n], verts = geometry.verts;
          if (Math.max(verts[face.i[0] * 3 + 1], verts[face.i[1] * 3 + 1], verts[face.i[2] * 3 + 1]) <= y + epsilon) continue;
          if (rampTriangleTop(face, x, z, radius) > y + epsilon) return false;
        }
      }
      return true;
    };
    const ceilingAt = (x, y, z, radius = 0) => {
      const gx0 = Math.max(0, Math.floor((x - radius - ORIGIN.x) / UNIT)), gx1 = Math.min(SX - 1, Math.floor((x + radius - ORIGIN.x) / UNIT));
      const gz0 = Math.max(0, Math.floor((z - radius - ORIGIN.z) / UNIT)), gz1 = Math.min(SZ - 1, Math.floor((z + radius - ORIGIN.z) / UNIT));
      let ceiling = Infinity;
      for (let gx = gx0; gx <= gx1; gx++) for (let gz = gz0; gz <= gz1; gz++) {
        if (!overlapsColumn(x, z, radius * radius, gx, gz)) continue;
        const base = gx * SY * SZ + gz;
        let gy = Math.max(0, Math.floor((y - ORIGIN.y + 1e-7) / UNIT));
        // The initial solid run is the floor at a slope's uphill edge.
        while (gy < SY && data[base + gy * SZ]) gy++;
        while (gy < SY && !data[base + gy * SZ]) gy++;
        if (gy < SY) ceiling = Math.min(ceiling, (gy - SURFACE) * UNIT);
      }
      return ceiling;
    };
    // Continuous movement-only support across neighboring walkable voxel tops.
    // Rendering and collision continue to use the exact stepped arrays above.
    const upperFloorAt = (i, fallback, y, maxStep) => {
      const cavity = cavities[i], floor = (((cavity >> 4) & 63) - 32) * UNIT;
      return cavity && floor <= y + maxStep && floor > fallback ? floor : fallback;
    };
    const smoothSupportAt = (x, z, y, maxStep) => {
      const center = column(x, z);
      if (center >= 0 && rampCells[center] && (y < surface[center] - maxStep || surface[center] <= rampFloorAt(x, z))) return upperFloorAt(center, rampFloorAt(x, z), y, maxStep);
      const px = (x - ORIGIN.x) / UNIT - 0.5, pz = (z - ORIGIN.z) / UNIT - 0.5;
      const gx = Math.floor(px), gz = Math.floor(pz), tx = px - gx, tz = pz - gz;
      if (gx < 0 || gz < 0 || gx + 1 >= SX || gz + 1 >= SZ) return y;
      const i00 = gx * SZ + gz, i10 = i00 + SZ, i01 = i00 + 1, i11 = i10 + 1;
      let a = land[i00] ? y >= surface[i00] - maxStep ? surface[i00] : height[i00] : y;
      let b = land[i10] ? y >= surface[i10] - maxStep ? surface[i10] : height[i10] : y;
      let c = land[i01] ? y >= surface[i01] - maxStep ? surface[i01] : height[i01] : y;
      let d = land[i11] ? y >= surface[i11] - maxStep ? surface[i11] : height[i11] : y;
      a = upperFloorAt(i00, a, y, maxStep);
      b = upperFloorAt(i10, b, y, maxStep);
      c = upperFloorAt(i01, c, y, maxStep);
      d = upperFloorAt(i11, d, y, maxStep);
      if (Math.abs(a - y) > maxStep) a = y;
      if (Math.abs(b - y) > maxStep) b = y;
      if (Math.abs(c - y) > maxStep) c = y;
      if (Math.abs(d - y) > maxStep) d = y;
      return (a + (b - a) * tx) * (1 - tz) + (c + (d - c) * tx) * tz;
    };
    const cavityAt = (x, z, out, caveIndex = 0) => {
      const i = column(x, z), cavity = i < 0 ? 0 : caveIndex === HEADQUARTERS_CAVE ? lowerCavities[i] : cavities[i] || lowerCavities[i];
      if (!cavity) return false;
      out.caveIndex = cavity & 15;
      out.floor = out.caveIndex === HEADQUARTERS_CAVE && rampCells[i] ? rampFloorAt(x, z) : (((cavity >> 4) & 63) - 32) * UNIT;
      const ceiling = cavity >> 10;
      out.ceiling = ceiling === 63 ? Infinity : (ceiling - 32) * UNIT;
      return true;
    };
    const pathColumn = (x, z) => {
      const gx = Math.floor((x - ORIGIN.x) / PATH_UNIT), gz = Math.floor((z - ORIGIN.z) / PATH_UNIT);
      return gx >= 0 && gz >= 0 && gx < PX && gz < PZ ? gx * PZ + gz : -1;
    };
    const isPath = (x, z) => {
      const i = pathColumn(x, z);
      return i >= 0 && paths[i] === 1;
    };
    const onLand = (x, z) => {
      const i = column(x, z);
      return i >= 0 && land[i] === 1;
    };
    // Banana-independent master spokes. Ring changes only clip this fixed mask.
    const masterPaths = new Uint8Array(PX * PZ);
    const masterList = [];
    // Meet the nearer end of each frontage along its own tangent, keeping the
    // doorway clear. Rasterize these fixed curves once; the ring only clips them.
    for (const front of headquartersFronts) {
      const side = front.center.x * front.tangent.x + front.center.z * front.tangent.z > 0 ? -1 : 1;
      const end = { x: front.center.x + front.tangent.x * side * (front.halfLength - 1), z: front.center.z + front.tangent.z * side * (front.halfLength - 1) };
      const radius = Math.hypot(end.x, end.z), start = { x: end.x * MASTER_PATH_CENTER / radius, z: end.z * MASTER_PATH_CENTER / radius };
      const bend = { x: end.x + front.tangent.x * side * 4, z: end.z + front.tangent.z * side * 4 };
      const control = { x: start.x + (bend.x - start.x) * 0.48 - end.z / radius * side * 0.9, z: start.z + (bend.z - start.z) * 0.48 + end.x / radius * side * 0.9 };
      const samples = front.connector = [];
      for (let n = 0; n <= 48; n++) {
        const t = n / 48, u = 1 - t;
        samples.push({ x: u * u * u * start.x + 3 * u * u * t * control.x + 3 * u * t * t * bend.x + t * t * t * end.x, z: u * u * u * start.z + 3 * u * u * t * control.z + 3 * u * t * t * bend.z + t * t * t * end.z });
      }
      for (let n = 1; n < samples.length; n++) {
        const a = samples[n - 1], b = samples[n], dx = b.x - a.x, dz = b.z - a.z, length2 = dx * dx + dz * dz;
        const gx0 = Math.max(0, Math.floor((Math.min(a.x, b.x) - PATH_HALF - ORIGIN.x) / PATH_UNIT)), gx1 = Math.min(PX - 1, Math.floor((Math.max(a.x, b.x) + PATH_HALF - ORIGIN.x) / PATH_UNIT));
        const gz0 = Math.max(0, Math.floor((Math.min(a.z, b.z) - PATH_HALF - ORIGIN.z) / PATH_UNIT)), gz1 = Math.min(PZ - 1, Math.floor((Math.max(a.z, b.z) + PATH_HALF - ORIGIN.z) / PATH_UNIT));
        for (let gx = gx0; gx <= gx1; gx++) for (let gz = gz0; gz <= gz1; gz++) {
          const x = (gx + 0.5) * PATH_UNIT + ORIGIN.x, z = (gz + 0.5) * PATH_UNIT + ORIGIN.z;
          const t = clamp(((x - a.x) * dx + (z - a.z) * dz) / length2, 0, 1);
          if ((x - a.x - dx * t) ** 2 + (z - a.z - dz * t) ** 2 < PATH_HALF * PATH_HALF && Math.hypot(x, z) >= MASTER_PATH_CENTER) masterPaths[gx * PZ + gz] = 1;
        }
      }
    }
    let masterPathCount = 0, masterHashValue = 2166136261;
    for (let gx = 0; gx < PX; gx++) {
      const wx = (gx + 0.5) * PATH_UNIT + ORIGIN.x;
      for (let gz = 0; gz < PZ; gz++) {
        const i = gx * PZ + gz, c = (gx >> 1) * SZ + (gz >> 1);
        if (!land[c]) continue;
        const wz = (gz + 0.5) * PATH_UNIT + ORIGIN.z, r = Math.hypot(wx, wz);
        let path = !!masterPaths[i], headquartersPath = false;
        if (!path && meadow[c] && r >= MASTER_PATH_CENTER) {
          const theta = Math.atan2(wx, -wz);
          for (const s of spokes) {
            const d = theta - s.angle;
            const lateral = r * Math.atan2(Math.sin(d), Math.cos(d));
            const t = (r - MASTER_PATH_CENTER) / (MEADOW - MASTER_PATH_CENTER);
            let bend = Math.sin(t * Math.PI * 2);
            if (s.id === "c1") bend *= 1 - smooth((t - 0.5) / 0.35);
            if (Math.abs(lateral + s.lean * TRAIL_LEAN - s.wobble * (s.lean ? Math.abs(bend) : bend)) < PATH_HALF) {
              path = true;
              break;
            }
          }
        }
        if (!path && !meadow[c]) {
          if (Math.abs(wx) < PASS_HALF && wz < 0) {
            path = Math.abs(wx - pass.wobble * Math.sin((r - MEADOW) / (-GATE_Z - MEADOW) * Math.PI * 2)) < TRAIL_HALF;
          } else if (Math.abs(wx) < PATH_HALF && wz > 0) path = true;
        }
        for (let n = 0; n < headquartersFronts.length && !headquartersPath; n++) {
          const front = headquartersFronts[n], dx = wx - front.center.x, dz = wz - front.center.z;
          const across = dx * front.tangent.x + dz * front.tangent.z;
          const depth = dx * -front.tangent.z + dz * front.tangent.x;
          headquartersPath = Math.abs(across) < front.halfLength && Math.abs(depth) < front.halfWidth && tops[c] === 0;
        }
        if (headquartersPath) {
          path = true;
        }
        if (!path) continue;
        masterPaths[i] = 1;
        masterList.push(i);
        masterPathCount++;
        masterHashValue = Math.imul(masterHashValue ^ i, 16777619);
      }
    }
    const masterPathHash = (masterHashValue >>> 0).toString(16).padStart(8, "0");
    const pathData = new Float32Array(PATH_CAPACITY * 20);
    let pathCount = 0, pathVersion = 0, pathReflows = 0, ringPathCount = 0, visibleSpokeCount = 0;
    let requestedInner = 0, ringInner = 0, ringCenter = 0, ringOuter = 0, pathVisible = false;
    const tileInnerRadius = (x, z) => Math.hypot(Math.max(0, Math.abs(x) - PATH_UNIT / 2), Math.max(0, Math.abs(z) - PATH_UNIT / 2));
    const writePathTile = (i, x, z) => {
      if (pathCount >= PATH_CAPACITY) throw new Error("Dynamic path instance capacity exceeded");
      paths[i] = 1;
      const o = pathCount++ * 20;
      pathData[o] = 1;
      pathData[o + 1] = 0;
      pathData[o + 2] = 0;
      pathData[o + 3] = 0;
      pathData[o + 4] = 0;
      pathData[o + 5] = 1;
      pathData[o + 6] = 0;
      pathData[o + 7] = 0;
      pathData[o + 8] = 0;
      pathData[o + 9] = 0;
      pathData[o + 10] = 1;
      pathData[o + 11] = 0;
      pathData[o + 12] = x;
      pathData[o + 13] = surfaceAt(x, z) + PATH_LIFT;
      pathData[o + 14] = z;
      pathData[o + 15] = 1;
      pathData[o + 16] = 1;
      pathData[o + 17] = 0;
      pathData[o + 18] = 0;
      pathData[o + 19] = 0;
    };
    // The ring scans only its own square of cells, the spokes only their master list
    const setPathRadius = (platformRadius) => {
      requestedInner = platformRadius + PATH_UNIT;
      const quantized = Math.ceil((requestedInner - 1e-9) / PATH_UNIT) * PATH_UNIT;
      if (quantized === ringInner) return false;
      ringInner = quantized;
      ringCenter = ringInner + PATH_HALF;
      ringOuter = ringCenter + PATH_HALF;
      pathVisible = ringOuter <= MEADOW;
      pathCount = 0;
      ringPathCount = 0;
      visibleSpokeCount = 0;
      paths.fill(0);
      if (pathVisible) {
        const g0 = Math.max(0, Math.floor((-ringOuter - ORIGIN.x) / PATH_UNIT)), g1 = Math.min(PX - 1, Math.ceil((ringOuter - ORIGIN.x) / PATH_UNIT));
        for (let gx = g0; gx <= g1; gx++) {
          const wx = (gx + 0.5) * PATH_UNIT + ORIGIN.x;
          for (let gz = g0; gz <= g1; gz++) {
            const i = gx * PZ + gz, c = (gx >> 1) * SZ + (gz >> 1);
            if (!land[c] || !meadow[c]) continue;
            const wz = (gz + 0.5) * PATH_UNIT + ORIGIN.z;
            const innerRadius = tileInnerRadius(wx, wz);
            if (innerRadius < ringInner || innerRadius >= ringOuter) continue;
            writePathTile(i, wx, wz);
            ringPathCount++;
          }
        }
      }
      for (let n = 0; n < masterList.length; n++) {
        const i = masterList[n], gx = Math.floor(i / PZ), gz = i % PZ;
        const wx = (gx + 0.5) * PATH_UNIT + ORIGIN.x, wz = (gz + 0.5) * PATH_UNIT + ORIGIN.z;
        if (tileInnerRadius(wx, wz) < ringOuter) continue;
        writePathTile(i, wx, wz);
        visibleSpokeCount++;
      }
      pathVersion++;
      pathReflows++;
      return true;
    };
    const overlapsPath = (x, z, radius) => {
      const gx0 = Math.max(0, Math.floor((x - radius - ORIGIN.x) / PATH_UNIT));
      const gx1 = Math.min(PX - 1, Math.floor((x + radius - ORIGIN.x) / PATH_UNIT));
      const gz0 = Math.max(0, Math.floor((z - radius - ORIGIN.z) / PATH_UNIT));
      const gz1 = Math.min(PZ - 1, Math.floor((z + radius - ORIGIN.z) / PATH_UNIT));
      const half = PATH_UNIT / 2, radius2 = radius * radius;
      for (let gx = gx0; gx <= gx1; gx++) {
        const cx = (gx + 0.5) * PATH_UNIT + ORIGIN.x;
        const dx = Math.max(0, Math.abs(cx - x) - half);
        for (let gz = gz0; gz <= gz1; gz++) {
          const i = gx * PZ + gz;
          if (!paths[i]) continue;
          const cz = (gz + 0.5) * PATH_UNIT + ORIGIN.z;
          const dz = Math.max(0, Math.abs(cz - z) - half);
          if (dx * dx + dz * dz <= radius2) return true;
        }
      }
      return false;
    };
    const path = {
      geometry: PATH_TILE,
      instanceData: pathData,
      setRadius: setPathRadius,
      overlaps: overlapsPath,
      apply(node) {
        node.instanceCount = pathCount;
        node.instanceVersion = pathVersion;
        node.visible = pathCount > 0;
      },
      debug: {
        get active() { return pathVisible; },
        get requestedInnerRadius() { return requestedInner; },
        get ringInnerRadius() { return ringInner; },
        get ringCenterRadius() { return ringCenter; },
        get ringOuterRadius() { return ringOuter; },
        get quantizedRadius() { return ringInner; },
        get visibleInstanceCount() { return pathCount; },
        masterSpokeCellCount: masterPathCount,
        get visibleSpokeCellCount() { return visibleSpokeCount; },
        get ringCellCount() { return ringPathCount; },
        get clippedSpokeCellCount() { return masterPathCount - visibleSpokeCount; },
        masterMaskBuildCount: 1,
        masterMaskHash: masterPathHash,
        bufferCapacity: PATH_CAPACITY,
        get reflowCount() { return pathReflows; }
      }
    };
    const inside = (ROOM.from + ROOM.to) / 2;
    const mouths = frames.map((f) => ({ id: f.id, clock: f.clock, angle: f.angle, x: f.x, z: f.z, ry: facing(f.axis), floorY: 0, inside: { x: f.x + f.ox * inside, z: f.z + f.oz * inside }, apron: { x: f.x - f.ox * 1.6, z: f.z - f.oz * 1.6 } }));
    const geometry = gridGeometry(grid, { unit: UNIT, palette: PALETTE, origin: ORIGIN, matrixCaves });
    const rampOffset = geometry.verts.length / 3;
    const rampFaceOffset = geometry.faces.length;
    for (const v of rampGeometry.verts) geometry.verts.push(v);
    for (const face of rampGeometry.faces) geometry.faces.push({ ...face, i: face.i.map((i) => i + rampOffset) });
    const built = {
      geometry,
      path,
      heightAt,
      surfaceAt,
      supportAt,
      clearAt,
      ceilingAt,
      smoothSupportAt,
      cavityAt,
      cavityBytes: cavities.byteLength + lowerCavities.byteLength,
      solidAt: (x, y, z) => grid.has(Math.floor((x - ORIGIN.x) / UNIT), Math.floor((y - ORIGIN.y) / UNIT), Math.floor((z - ORIGIN.z) / UNIT)),
      isPath,
      onLand,
      mouths,
      headquarters: { caveIndex: HEADQUARTERS_CAVE, floor: HEADQUARTERS_FLOOR, ceiling: HEADQUARTERS_CEILING, room: HEADQUARTERS_ROOM, rooms: headquartersRooms, windows: headquartersWindows, gallery: headquartersGallery, ramps: headquartersRamps, fronts: headquartersFronts },
      gate: { x: 0, z: GATE_Z, ry: 0 },
      radius: RADIUS,
      undersideDepth: DEPTH,
      undersideDepthAt,
      meadowRadius: MEADOW,
      passHalf: PASS_HALF,
      unit: UNIT,
      pathUnit: PATH_UNIT
    };
    ISLANDS.set(seed, built);
    return built;
  };
  BL.terrain = { makeGrid, gridGeometry, island, PALETTE, MAX_HEIGHT };
})();
