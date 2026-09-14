// Camera cones through window frames, used to cut visible portions out of a
// wall cue without dropping the surrounding mesh's whole visibility patch.
(() => {
  "use strict";
  const BL = window.BL = window.BL || {};
  const create = ({ windows, island }) => {
    const entries = [];
    for (const window of windows) for (const frustum of window.flare.frusta) if (!frustum.inner) {
      const sx = Math.sin(frustum.angle), sz = -Math.cos(frustum.angle), tx = -sz, tz = sx, r = frustum.start;
      const corners = new Float64Array(12);
      for (let n = 0; n < 4; n++) {
        const across = (n === 0 || n === 3 ? -1 : 1) * frustum.half;
        corners[n * 3] = sx * r + tx * across;
        corners[n * 3 + 1] = window.sill + (n < 2 ? 0 : window.height);
        corners[n * 3 + 2] = sz * r + tz * across;
      }
      entries.push({ sx, sz, r, corners, planes: new Float64Array(20), active: false });
    }
    const forward = new Float64Array(3), a = new Float64Array(36), b = new Float64Array(36);
    const result = { points: a, count: 0 };
    let active = false, near = 0.1;
    const update = (camera, outside) => {
      const p = camera.position; near = camera.near; active = false;
      const length = Math.hypot(camera.target.x - p.x, camera.target.y - p.y, camera.target.z - p.z);
      forward[0] = (camera.target.x - p.x) / length; forward[1] = (camera.target.y - p.y) / length; forward[2] = (camera.target.z - p.z) / length;
      for (const entry of entries) {
        entry.active = outside && p.x * entry.sx + p.z * entry.sz > entry.r + 0.05;
        if (!entry.active) continue;
        const c = entry.corners, planes = entry.planes;
        // Establish visibility at the aperture itself. Testing every rear
        // wall triangle would leave its self-hidden facets as little spikes
        // inside an otherwise open window. Visible foreground stone already
        // accounts for those pixels, so the entire cone masks rear cues.
        entry.active = false;
        for (let row = 0; row < 3 && !entry.active; row++) for (let column = 0; column < 3 && !entry.active; column++) {
          const u = 0.01 + column * 0.49, v = 0.01 + row * 0.49;
          const x = c[0] + (c[3] - c[0]) * u - entry.sx * 0.02, y = c[1] + (c[7] - c[1]) * v, z = c[2] + (c[5] - c[2]) * u - entry.sz * 0.02;
          const dx = x - p.x, dy = y - p.y, dz = z - p.z, depth = dx * forward[0] + dy * forward[1] + dz * forward[2];
          if (depth <= near) continue;
          const start = near / depth;
          entry.active = island.sightClearAt(p.x + dx * start, p.y + dy * start, p.z + dz * start, x, y, z);
        }
        if (!entry.active) continue;
        active = true;
        for (let n = 0; n < 4; n++) {
          const i = n * 3, j = ((n + 1) % 4) * 3;
          const ax = c[i] - p.x, ay = c[i + 1] - p.y, az = c[i + 2] - p.z, bx = c[j] - p.x, by = c[j + 1] - p.y, bz = c[j + 2] - p.z;
          let nx = ay * bz - az * by, ny = az * bx - ax * bz, nz = ax * by - ay * bx;
          const centerX = entry.sx * entry.r - p.x, centerY = (c[1] + c[7]) / 2 - p.y, centerZ = entry.sz * entry.r - p.z;
          const length = Math.hypot(nx, ny, nz) * (nx * centerX + ny * centerY + nz * centerZ > 0 ? -1 : 1);
          nx /= length; ny /= length; nz /= length;
          planes[n * 4] = nx; planes[n * 4 + 1] = ny; planes[n * 4 + 2] = nz; planes[n * 4 + 3] = nx * p.x + ny * p.y + nz * p.z;
        }
        planes[16] = entry.sx; planes[17] = 0; planes[18] = entry.sz; planes[19] = entry.r;
      }
    };
    const overlaps = (bounds, at) => {
      if (!active) return false;
      for (const entry of entries) if (entry.active) {
        let outside = false;
        for (let n = 0; n < 20; n += 4) {
          const p = entry.planes;
          if (p[n] * bounds[at + (p[n] < 0 ? 3 : 0)] + p[n + 1] * bounds[at + (p[n + 1] < 0 ? 4 : 1)] + p[n + 2] * bounds[at + (p[n + 2] < 0 ? 5 : 2)] > p[n + 3] + 1e-5) { outside = true; break; }
        }
        if (!outside) return true;
      }
      return false;
    };
    const clip = (index, surface, at) => {
      const entry = entries[index]; result.count = 0;
      if (!entry.active) return result;
      let input = a, output = b, count = 3;
      for (let n = 0; n < 9; n++) input[n] = surface[at + n];
      for (let plane = 0; plane < 20; plane += 4) {
        const p = entry.planes; let next = 0;
        for (let n = 0; n < count; n++) {
          const i = n * 3, j = ((n + 1) % count) * 3;
          const da = p[plane] * input[i] + p[plane + 1] * input[i + 1] + p[plane + 2] * input[i + 2] - p[plane + 3];
          const db = p[plane] * input[j] + p[plane + 1] * input[j + 1] + p[plane + 2] * input[j + 2] - p[plane + 3];
          if (da <= 0) { for (let axis = 0; axis < 3; axis++) output[next * 3 + axis] = input[i + axis]; next++; }
          if (da * db < 0) {
            const t = da / (da - db);
            for (let axis = 0; axis < 3; axis++) output[next * 3 + axis] = input[i + axis] + (input[j + axis] - input[i + axis]) * t;
            next++;
          }
        }
        if (next < 3) return result;
        const swap = input; input = output; output = swap; count = next;
      }
      result.points = input; result.count = count; return result;
    };
    return { update, overlaps, clip, get count() { return active ? entries.length : 0; } };
  };
  BL.wallApertures = { create };
})();
