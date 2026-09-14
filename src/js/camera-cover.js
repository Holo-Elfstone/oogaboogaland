(() => {
  "use strict";
  const BL = window.BL = window.BL || {};
  const { mat4, lerp } = BL.math;
  const UP = { x: 0, y: 1, z: 0 };
  const grainHash = (x, y, z) => {
    let n = Math.imul(x, 73856093) ^ Math.imul(y, 19349663) ^ Math.imul(z, 83492791);
    n = Math.imul(n ^ n >>> 16, 2146121005);
    n = Math.imul(n ^ n >>> 15, -2073254261);
    return ((n ^ n >>> 16) >>> 0) / 4294967296;
  };
  const grain = (x, y, z) => {
    const ix = Math.floor(x), iy = Math.floor(y), iz = Math.floor(z);
    x -= ix; y -= iy; z -= iz;
    x *= x * (3 - 2 * x); y *= y * (3 - 2 * y); z *= z * (3 - 2 * z);
    return lerp(lerp(lerp(grainHash(ix, iy, iz), grainHash(ix + 1, iy, iz), x), lerp(grainHash(ix, iy + 1, iz), grainHash(ix + 1, iy + 1, iz), x), y),
      lerp(lerp(grainHash(ix, iy, iz + 1), grainHash(ix + 1, iy, iz + 1), x), lerp(grainHash(ix, iy + 1, iz + 1), grainHash(ix + 1, iy + 1, iz + 1), x), y), z);
  };
  // The island is a solid volume, but its surface mesh has no interior faces.
  // Cap its solid intersection with the near plane, keeping the driven Ooga's
  // silhouette visible. A crossing surface covers only its part of the view.
  // This shared overlay uses the same world transforms in both renderers.
  const create = (overlay) => {
    const ctx = overlay.getContext("2d");
    const mask = document.createElement("canvas"), rim = document.createElement("canvas"), stone = document.createElement("canvas");
    const maskCtx = mask.getContext("2d"), rimCtx = rim.getContext("2d"), stoneCtx = stone.getContext("2d");
    const concealed = document.createElement("canvas"), concealedRim = document.createElement("canvas");
    const concealedCtx = concealed.getContext("2d"), concealedRimCtx = concealedRim.getContext("2d");
    const visible = document.createElement("canvas"), visibleCtx = visible.getContext("2d");
    const wallLayer = document.createElement("canvas"), wallCtx = wallLayer.getContext("2d");
    const wallView = new Float64Array(18), phaseHeads = new Int32Array(256);
    let wallContexts = new Array(32), wallVersions = new Float64Array(32), wallCount = 0, wallFaces = 0, wallCached = false;
    let surfacePoints = new Float32Array(0), surfaceCorners = new Uint8Array(0), surfaceNext = new Int32Array(0);
    const view = mat4.create(), triangle = new Float64Array(9), clipped = new Float64Array(12);
    const apertureView = new Float64Array(36), apertureClip = new Float64Array(39);
    let structurePhases = new Float32Array(0), structureTargets = new Uint8Array(0), structureSeen = new Uint8Array(0), structureLines = new Float32Array(0);
    const ROCK_GRID = 32, rockSamples = new Uint8Array((ROCK_GRID + 1) ** 2), rockTriangle = new Float64Array(9);
    const TEXTURE_SIZE = 128, textureTransform = new Float64Array(9), textureNext = new Float64Array(9);
    textureTransform.fill(NaN);
    stone.width = stone.height = TEXTURE_SIZE;
    const stoneImage = stoneCtx.createImageData(TEXTURE_SIZE, TEXTURE_SIZE), stonePixels = stoneImage.data;
    let width = 0, height = 0, scale = 1, focal = 1, near = 0.2;
    const state = { insideRock: false, partialRock: false, rockCoverage: 0, outlined: false, faces: 0, opacity: 0.22, textureSize: TEXTURE_SIZE, textureUpdates: 0, guideLines: 0, structureFaces: 0, structureFilled: false, structureUpdates: 0, structureCacheHits: 0, guideKind: null, guideIndex: -1, guideBasement: false };
    let rockAt = null, screenW = 1, screenH = 1, planeX = 0, planeY = 0, planeZ = 0, planeScale = 1;
    const sampleRock = (x, y) => {
      const right = (x - screenW / 2) * planeScale, up = (screenH / 2 - y) * planeScale;
      return rockAt(planeX + view[0] * right + view[1] * up, planeY + view[4] * right + view[5] * up, planeZ + view[8] * right + view[9] * up);
    };
    const rockCorner = (index, x, y, solid) => {
      rockTriangle[index] = x; rockTriangle[index + 1] = y; rockTriangle[index + 2] = solid;
    };
    const capTriangle = () => {
      let count = 0;
      for (let i = 0; i < 3; i++) {
        const a = i * 3, b = ((i + 1) % 3) * 3, aIn = rockTriangle[a + 2], bIn = rockTriangle[b + 2];
        if (aIn) {
          if (count++) ctx.lineTo(rockTriangle[a], rockTriangle[a + 1]); else ctx.moveTo(rockTriangle[a], rockTriangle[a + 1]);
        }
        if (aIn === bIn) continue;
        let lo = 0, hi = 1;
        // Refine actual rock boundaries, rather than exposing square mask tiles.
        for (let n = 0; n < 8; n++) {
          const t = (lo + hi) / 2;
          if (+sampleRock(rockTriangle[a] + (rockTriangle[b] - rockTriangle[a]) * t, rockTriangle[a + 1] + (rockTriangle[b + 1] - rockTriangle[a + 1]) * t) === aIn) lo = t;
          else hi = t;
        }
        const t = (lo + hi) / 2, x = rockTriangle[a] + (rockTriangle[b] - rockTriangle[a]) * t, y = rockTriangle[a + 1] + (rockTriangle[b + 1] - rockTriangle[a + 1]) * t;
        if (count++) ctx.lineTo(x, y); else ctx.moveTo(x, y);
      }
      if (count) ctx.closePath();
    };
    const updateStone = (materialAt) => {
      textureNext[0] = planeX; textureNext[1] = planeY; textureNext[2] = planeZ;
      textureNext[3] = view[0] * screenW * planeScale; textureNext[4] = view[4] * screenW * planeScale; textureNext[5] = view[8] * screenW * planeScale;
      textureNext[6] = view[1] * screenH * planeScale; textureNext[7] = view[5] * screenH * planeScale; textureNext[8] = view[9] * screenH * planeScale;
      let changed = false;
      for (let i = 0; i < 9; i++) if (!(Math.abs(textureNext[i] - textureTransform[i]) < 1e-5)) { changed = true; break; }
      if (!changed) return;
      textureTransform.set(textureNext);
      // Sample the real section exposed by the near-plane cut. Grain is a
      // stationary 3D field; moving or turning reveals different stone, while
      // a stationary view never animates or slides a screen-space wallpaper.
      for (let y = 0; y < TEXTURE_SIZE; y++) for (let x = 0; x < TEXTURE_SIZE; x++) {
        const right = (x + 0.5) / TEXTURE_SIZE - 0.5, up = 0.5 - (y + 0.5) / TEXTURE_SIZE;
        const wx = planeX + textureNext[3] * right + textureNext[6] * up;
        const wy = planeY + textureNext[4] * right + textureNext[7] * up;
        const wz = planeZ + textureNext[5] * right + textureNext[8] * up;
        const material = materialAt(wx, wy, wz) || BL.terrain.PALETTE[5];
        const light = 0.2 + grain(wx * 15, wy * 18, wz * 13) * 0.12 + grain(wx * 73, wy * 67, wz * 79) * 0.04;
        const i = (y * TEXTURE_SIZE + x) * 4;
        stonePixels[i] = material[0] * light; stonePixels[i + 1] = material[1] * light; stonePixels[i + 2] = material[2] * light; stonePixels[i + 3] = 255;
      }
      stoneCtx.putImageData(stoneImage, 0, 0);
      state.textureUpdates++;
    };
    const drawRock = (camera, solidAt, materialAt) => {
      rockAt = solidAt;
      screenW = overlay.clientWidth; screenH = overlay.clientHeight;
      planeX = camera.position.x - view[2] * camera.near;
      planeY = camera.position.y - view[6] * camera.near;
      planeZ = camera.position.z - view[10] * camera.near;
      planeScale = 2 * camera.near * Math.tan(camera.fov / 2) / screenH;
      const cols = Math.max(1, Math.ceil(ROCK_GRID * Math.min(1, screenW / screenH))), rows = Math.max(1, Math.ceil(ROCK_GRID * Math.min(1, screenH / screenW)));
      const stride = cols + 1, dx = screenW / cols, dy = screenH / rows;
      let count = 0;
      for (let y = 0; y <= rows; y++) for (let x = 0; x <= cols; x++) {
        const solid = +sampleRock(x * dx, y * dy);
        rockSamples[y * stride + x] = solid;
        count += solid;
      }
      const total = (cols + 1) * (rows + 1);
      state.insideRock = count === total;
      state.partialRock = count > 0 && count < total;
      state.rockCoverage = count / total;
      ctx.beginPath();
      if (state.insideRock) ctx.rect(0, 0, screenW, screenH);
      else if (state.partialRock) {
        // One combined path prevents seams between neighboring mask triangles.
        for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
          const i = y * stride + x, a = rockSamples[i], b = rockSamples[i + 1], c = rockSamples[i + stride + 1], d = rockSamples[i + stride];
          if (a && b && c && d) { ctx.rect(x * dx, y * dy, dx, dy); continue; }
          if (!(a || b || c || d)) continue;
          rockCorner(0, x * dx, y * dy, a); rockCorner(3, (x + 1) * dx, y * dy, b); rockCorner(6, (x + 1) * dx, (y + 1) * dy, c);
          capTriangle();
          rockCorner(3, (x + 1) * dx, (y + 1) * dy, c); rockCorner(6, x * dx, (y + 1) * dy, d);
          capTriangle();
        }
      }
      if (count) {
        updateStone(materialAt);
        ctx.save();
        ctx.clip();
        ctx.drawImage(stone, 0, 0, screenW, screenH);
        ctx.restore();
      }
      rockAt = null;
    };
    const ensureBuffers = (w, h) => {
      const nextScale = Math.min(1, 1024 / Math.max(w, h));
      const nextW = Math.max(1, Math.ceil(w * nextScale)), nextH = Math.max(1, Math.ceil(h * nextScale));
      if (nextW !== width || nextH !== height) {
        width = mask.width = rim.width = concealed.width = concealedRim.width = visible.width = wallLayer.width = nextW;
        height = mask.height = rim.height = concealed.height = concealedRim.height = visible.height = wallLayer.height = nextH;
        wallCached = false;
      }
      scale = nextScale;
    };
    const appendAperture = (points, count) => {
      for (let n = 0; n < count * 3; n += 3) {
        const x = points[n], y = points[n + 1], z = points[n + 2];
        apertureView[n] = view[0] * x + view[4] * y + view[8] * z + view[12];
        apertureView[n + 1] = view[1] * x + view[5] * y + view[9] * z + view[13];
        apertureView[n + 2] = view[2] * x + view[6] * y + view[10] * z + view[14];
      }
      let corners = 0;
      for (let n = 0; n < count; n++) {
        const a = n * 3, b = ((n + 1) % count) * 3, aIn = apertureView[a + 2] <= -near, bIn = apertureView[b + 2] <= -near;
        if (aIn) { for (let axis = 0; axis < 3; axis++) apertureClip[corners * 3 + axis] = apertureView[a + axis]; corners++; }
        if (aIn !== bIn) {
          const t = (-near - apertureView[a + 2]) / (apertureView[b + 2] - apertureView[a + 2]);
          for (let axis = 0; axis < 3; axis++) apertureClip[corners * 3 + axis] = apertureView[a + axis] + (apertureView[b + axis] - apertureView[a + axis]) * t;
          corners++;
        }
      }
      if (corners < 3) return;
      for (let n = 0; n < corners * 3; n += 3) {
        apertureClip[n] = width / 2 - apertureClip[n] * focal / apertureClip[n + 2];
        apertureClip[n + 1] = height / 2 + apertureClip[n + 1] * focal / apertureClip[n + 2];
      }
      const reverse = (apertureClip[3] - apertureClip[0]) * (apertureClip[7] - apertureClip[1]) - (apertureClip[4] - apertureClip[1]) * (apertureClip[6] - apertureClip[0]) < 0;
      for (let corner = 0; corner < corners; corner++) {
        const n = (reverse ? corners - 1 - corner : corner) * 3;
        if (corner) visibleCtx.lineTo(apertureClip[n], apertureClip[n + 1]); else visibleCtx.moveTo(apertureClip[n], apertureClip[n + 1]);
      }
      visibleCtx.closePath();
    };
    const drawStructure = (camera, guides, w, h) => {
      if (guides.objectsEnabled === false) return;
      const structures = guides.structures, size = structures ? structures.length : guides.structure ? 1 : 0;
      if (!size) return;
      ensureBuffers(w, h);
      let changed = !wallCached || wallCount !== size || wallView[16] !== camera.fov || wallView[17] !== camera.near;
      for (let n = 0; n < 16; n++) if (wallView[n] !== view[n]) changed = true;
      let surfaceCapacity = 0;
      for (let item = 0; item < size; item++) {
        const structure = structures ? structures[item] : guides.structure;
        if (wallContexts[item] !== structure || wallVersions[item] !== structure.surfaceVersion || structure.surfaceVersion === undefined) changed = true;
        if (structure.surfaceWholeActive || structure.surfaceActive) surfaceCapacity += structure.surfaceCount;
      }
      if (!changed) {
        state.structureCacheHits++;
        state.structureFaces = wallFaces; state.structureFilled = wallFaces > 0;
        if (wallFaces) { ctx.globalAlpha = 1; ctx.drawImage(wallLayer, 0, 0, width, height, 0, 0, w, h); }
        return;
      }
      if (size > wallVersions.length) {
        const capacity = Math.max(size, wallVersions.length * 2);
        wallContexts = new Array(capacity); wallVersions = new Float64Array(capacity);
      }
      if (surfaceCapacity > surfaceCorners.length) {
        const capacity = Math.max(surfaceCapacity, surfaceCorners.length * 2, 4096);
        surfacePoints = new Float32Array(capacity * 8); surfaceCorners = new Uint8Array(capacity); surfaceNext = new Int32Array(capacity);
      }
      wallCount = size; wallView.set(view); wallView[16] = camera.fov; wallView[17] = camera.near;
      for (let item = 0; item < size; item++) {
        const structure = structures ? structures[item] : guides.structure;
        wallContexts[item] = structure; wallVersions[item] = structure.surfaceVersion;
      }
      wallCached = true; wallFaces = 0;
      state.structureUpdates++;
      focal = height / 2 / Math.tan(camera.fov / 2);
      near = camera.near;
      maskCtx.clearRect(0, 0, width, height);
      concealedCtx.clearRect(0, 0, width, height);
      visibleCtx.clearRect(0, 0, width, height);
      wallCtx.clearRect(0, 0, width, height);
      maskCtx.globalAlpha = 1;
      maskCtx.fillStyle = maskCtx.strokeStyle = concealedCtx.fillStyle = visibleCtx.fillStyle = visibleCtx.strokeStyle = "#ffffff";
      maskCtx.lineWidth = visibleCtx.lineWidth = 0.6;
      maskCtx.beginPath(); visibleCtx.beginPath(); phaseHeads.fill(-1);
      let opaqueBatch = 0, visibleBatch = 0;
      for (let item = 0; item < size; item++) {
        const structure = structures ? structures[item] : guides.structure;
        if (!(structure.surfaceWholeActive || structure.surfaceActive)) continue;
        const surface = structure.surface;
        for (let at = 0; at < structure.surfaceCount * 9; at += 9) {
          const group = structure.surfaceGroups[at / 9], phase = structure.surfacePhases[group];
          const whole = structure.surfaceWholePhases ? structure.surfaceWholePhases[group] : phase;
          if (whole <= 0) continue;
          for (let n = 0; n < 3; n++) {
            const i = at + n * 3, x = surface[i], y = surface[i + 1], z = surface[i + 2];
            triangle[n * 3] = view[0] * x + view[4] * y + view[8] * z + view[12];
            triangle[n * 3 + 1] = view[1] * x + view[5] * y + view[9] * z + view[13];
            triangle[n * 3 + 2] = view[2] * x + view[6] * y + view[10] * z + view[14];
          }
          let count = 0;
          for (let n = 0; n < 3; n++) {
            const a = n * 3, b = ((n + 1) % 3) * 3, aIn = triangle[a + 2] <= -near, bIn = triangle[b + 2] <= -near;
            if (aIn) { clipped[count++] = triangle[a]; clipped[count++] = triangle[a + 1]; clipped[count++] = triangle[a + 2]; }
            if (aIn !== bIn) {
              const t = (-near - triangle[a + 2]) / (triangle[b + 2] - triangle[a + 2]);
              clipped[count++] = triangle[a] + (triangle[b] - triangle[a]) * t;
              clipped[count++] = triangle[a + 1] + (triangle[b + 1] - triangle[a + 1]) * t;
              clipped[count++] = -near;
            }
          }
          if (count < 9) continue;
          let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
          for (let n = 0; n < count; n += 3) {
            const x = width / 2 - clipped[n] * focal / clipped[n + 2], y = height / 2 + clipped[n + 1] * focal / clipped[n + 2];
            clipped[n] = x; clipped[n + 1] = y;
            minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y);
          }
          if (maxX < -4 || minX > width + 4 || maxY < -4 || minY > height + 4) continue;
          // Equal winding preserves the union where opposing slab faces
          // overlap. Keep each rasterized path small: a single huge path
          // makes the canvas resolve thousands of overlapping contours.
          const reverse = (clipped[3] - clipped[0]) * (clipped[7] - clipped[1]) - (clipped[4] - clipped[1]) * (clipped[6] - clipped[0]) < 0;
          const corners = count / 3, start = wallFaces * 8, cameraVisible = structure.surfaceHidden && !structure.surfaceHidden[group];
          for (let corner = 0; corner < corners; corner++) {
            const n = (reverse ? corners - 1 - corner : corner) * 3, x = clipped[n], y = clipped[n + 1];
            if (corner) maskCtx.lineTo(x, y); else maskCtx.moveTo(x, y);
            if (cameraVisible) { if (corner) visibleCtx.lineTo(x, y); else visibleCtx.moveTo(x, y); }
            if (phase > 0) { surfacePoints[start + corner * 2] = x; surfacePoints[start + corner * 2 + 1] = y; }
          }
          maskCtx.closePath();
          if (++opaqueBatch === 16) { maskCtx.fill(); maskCtx.stroke(); maskCtx.beginPath(); opaqueBatch = 0; }
          if (cameraVisible) {
            visibleCtx.closePath();
            if (++visibleBatch === 16) { visibleCtx.fill(); visibleCtx.stroke(); visibleCtx.beginPath(); visibleBatch = 0; }
          }
          if (structure.surfaceAperture?.[group]) for (let aperture = 0; aperture < structure.apertures.count; aperture++) {
            const cut = structure.apertures.clip(aperture, surface, at);
            if (!cut.count) continue;
            appendAperture(cut.points, cut.count);
            if (++visibleBatch === 16) { visibleCtx.fill(); visibleCtx.stroke(); visibleCtx.beginPath(); visibleBatch = 0; }
          }
          if (phase > 0) {
            // One alpha unit is below the final overlay's 8-bit opacity.
            // Reusable buckets preserve smooth fades without a path or a
            // canvas allocation for every triangle in every frame.
            const level = Math.max(1, Math.min(255, Math.round(phase * 255)));
            surfaceCorners[wallFaces] = corners; surfaceNext[wallFaces] = phaseHeads[level]; phaseHeads[level] = wallFaces++;
          }
        }
      }
      if (opaqueBatch) { maskCtx.fill(); maskCtx.stroke(); }
      if (visibleBatch) { visibleCtx.fill(); visibleCtx.stroke(); }
      for (let level = 1; level < phaseHeads.length; level++) if (phaseHeads[level] >= 0) {
        concealedCtx.beginPath();
        concealedCtx.globalAlpha = level / 255;
        let batch = 0;
        for (let face = phaseHeads[level]; face >= 0; face = surfaceNext[face]) {
          const start = face * 8;
          for (let corner = 0; corner < surfaceCorners[face]; corner++) {
            const at = start + corner * 2;
            if (corner) concealedCtx.lineTo(surfacePoints[at], surfacePoints[at + 1]); else concealedCtx.moveTo(surfacePoints[at], surfacePoints[at + 1]);
          }
          concealedCtx.closePath();
          if (++batch === 16) { concealedCtx.fill(); concealedCtx.beginPath(); batch = 0; }
        }
        if (batch) concealedCtx.fill();
      }
      concealedCtx.globalAlpha = 1;
      // Visible front faces win over hidden rear faces projected onto the
      // same pixels. Otherwise a thick slab would outline its visible side.
      concealedCtx.globalCompositeOperation = "destination-out";
      concealedCtx.drawImage(visible, 0, 0);
      concealedCtx.globalCompositeOperation = "source-over";
      state.structureFaces = wallFaces;
      if (!wallFaces) return;
      // The full wall supplies its silhouette; only afterward does camera
      // visibility mask its fill and rim. Patch boundaries cannot become
      // false wall edges, including the steps of a jagged stone surface.
      wallCtx.globalAlpha = 0.12;
      wallCtx.drawImage(concealed, 0, 0);
      rimCtx.clearRect(0, 0, width, height);
      rimCtx.globalCompositeOperation = "source-over";
      concealedRimCtx.clearRect(0, 0, width, height);
      concealedRimCtx.drawImage(concealed, 0, 0);
      const spread = Math.max(1.5, 2.25 * scale);
      for (let y = -1; y <= 1; y++) for (let x = -1; x <= 1; x++) if (x || y) {
        rimCtx.drawImage(mask, x * spread, y * spread);
        concealedRimCtx.drawImage(concealed, x * spread, y * spread);
      }
      rimCtx.globalCompositeOperation = "destination-out";
      rimCtx.drawImage(mask, 0, 0);
      rimCtx.globalCompositeOperation = "destination-in";
      rimCtx.drawImage(concealedRim, 0, 0);
      concealedRimCtx.clearRect(0, 0, width, height);
      concealedRimCtx.drawImage(visible, 0, 0);
      for (let y = -1; y <= 1; y++) for (let x = -1; x <= 1; x++) if (x || y) concealedRimCtx.drawImage(visible, x * spread, y * spread);
      rimCtx.globalCompositeOperation = "destination-out";
      rimCtx.drawImage(concealedRim, 0, 0);
      rimCtx.globalCompositeOperation = "source-over";
      wallCtx.globalAlpha = 0.34;
      wallCtx.drawImage(rim, 0, 0);
      ctx.globalAlpha = 1;
      ctx.drawImage(wallLayer, 0, 0, width, height, 0, 0, w, h);
      state.structureFilled = true;
    };
    const reserveStructure = (count) => {
      if (count <= structurePhases.length) return;
      const capacity = Math.max(count, structurePhases.length * 2, 256), phases = new Float32Array(capacity), lines = new Float32Array(capacity * 6);
      phases.set(structurePhases); lines.set(structureLines);
      structurePhases = phases; structureTargets = new Uint8Array(capacity); structureSeen = new Uint8Array(capacity); structureLines = lines;
    };
    const drawGuideLine = (lines, n, object, opacity, observer, radius, focal, near) => {
      if (opacity <= 0) return;
      let ax = view[0] * lines[n] + view[4] * lines[n + 1] + view[8] * lines[n + 2] + view[12];
      let ay = view[1] * lines[n] + view[5] * lines[n + 1] + view[9] * lines[n + 2] + view[13];
      let az = view[2] * lines[n] + view[6] * lines[n + 1] + view[10] * lines[n + 2] + view[14];
      let bx = view[0] * lines[n + 3] + view[4] * lines[n + 4] + view[8] * lines[n + 5] + view[12];
      let by = view[1] * lines[n + 3] + view[5] * lines[n + 4] + view[9] * lines[n + 5] + view[13];
      let bz = view[2] * lines[n + 3] + view[6] * lines[n + 4] + view[10] * lines[n + 5] + view[14];
      if (az > -near && bz > -near) return;
      if (az > -near) { const t = (-near - az) / (bz - az); ax = lerp(ax, bx, t); ay = lerp(ay, by, t); az = -near; }
      else if (bz > -near) { const t = (-near - bz) / (az - bz); bx = lerp(bx, ax, t); by = lerp(by, ay, t); bz = -near; }
      const x0 = screenW / 2 - ax * focal / az, y0 = screenH / 2 + ay * focal / az;
      const x1 = screenW / 2 - bx * focal / bz, y1 = screenH / 2 + by * focal / bz;
      if (Math.max(x0, x1) < 0 || Math.min(x0, x1) > screenW || Math.max(y0, y1) < 0 || Math.min(y0, y1) > screenH) return;
      const distance = observer ? Math.hypot((lines[n] + lines[n + 3]) / 2 - observer[0], (lines[n + 1] + lines[n + 4]) / 2 - observer[1], (lines[n + 2] + lines[n + 5]) / 2 - observer[2]) : 0;
      ctx.strokeStyle = object ? "#d9c9a9" : "#b6aa95";
      ctx.lineWidth = object ? 1.5 : 1;
      ctx.globalAlpha = object ? 0.18 * opacity : 0.14 * Math.min(1, Math.max(0, 2 - 2 * distance / radius)) * opacity;
      ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
      state.guideLines++;
    };
    const drawGuides = (camera, guides, dt) => {
      const lines = guides.lines, focal = screenH / 2 / Math.tan(camera.fov / 2), near = camera.near;
      state.guideKind = guides.kind; state.guideIndex = guides.index; state.guideBasement = guides.basement;
      if (guides.structures) {
        // Complete walls already have a continuous rim. Retaining the former
        // section lines would put panel seams back on top of that silhouette.
        structurePhases.fill(0);
        for (let n = 0; n < guides.count * 6; n += 6) if (guides.kinds && guides.kinds[n / 6]) drawGuideLine(lines, n, true, guides.alphas ? guides.alphas[n / 6] : 1, guides.observer, guides.radius || 12, focal, near);
        return;
      }
      const sourceCount = guides.structureSourceCount || guides.structureCount || (!guides.sources ? guides.count : 0);
      reserveStructure(sourceCount);
      structureTargets.fill(0, 0, sourceCount); structureSeen.fill(0, 0, sourceCount);
      for (let n = 0; n < guides.count * 6; n += 6) {
        const object = guides.kinds && guides.kinds[n / 6];
        if (object) { drawGuideLine(lines, n, true, guides.alphas ? guides.alphas[n / 6] : 1, guides.observer, guides.radius || 12, focal, near); continue; }
        const source = guides.sources ? guides.sources[n / 6] : n / 6;
        if (source >= structurePhases.length) continue;
        structureTargets[source] = structureSeen[source] = 1;
        for (let axis = 0; axis < 6; axis++) structureLines[source * 6 + axis] = lines[n + axis];
      }
      if (guides.objectsEnabled === false) structurePhases.fill(0);
      else {
        const step = Math.max(0, dt) / 0.25;
        for (let source = 0; source < sourceCount; source++) {
          const before = structurePhases[source], target = structureTargets[source];
          structurePhases[source] = before < target ? Math.min(target, before + step) : Math.max(target, before - step);
        }
      }
      for (let n = 0; n < guides.count * 6; n += 6) if (!(guides.kinds && guides.kinds[n / 6])) {
        const source = guides.sources ? guides.sources[n / 6] : n / 6;
        drawGuideLine(lines, n, false, structurePhases[source], guides.observer, guides.radius || 12, focal, near);
      }
      for (let source = 0; source < sourceCount; source++) if (!structureSeen[source] && structurePhases[source] > 0) drawGuideLine(structureLines, source * 6, false, structurePhases[source], guides.observer, guides.radius || 12, focal, near);
    };
    const drawNode = (node) => {
      if (!node.visible || node.cameraHidden) return;
      const geometry = node.geometry, world = node.world;
      if (geometry) for (const face of geometry.faces) {
        // Triangles clip to at most four corners, so scratch space stays fixed.
        for (let fan = 1; fan + 1 < face.i.length; fan++) {
          for (let n = 0; n < 3; n++) {
            const i = face.i[n === 0 ? 0 : fan + n - 1] * 3, v = geometry.verts;
            const x = world[0] * v[i] + world[4] * v[i + 1] + world[8] * v[i + 2] + world[12];
            const y = world[1] * v[i] + world[5] * v[i + 1] + world[9] * v[i + 2] + world[13];
            const z = world[2] * v[i] + world[6] * v[i + 1] + world[10] * v[i + 2] + world[14];
            triangle[n * 3] = view[0] * x + view[4] * y + view[8] * z + view[12];
            triangle[n * 3 + 1] = view[1] * x + view[5] * y + view[9] * z + view[13];
            triangle[n * 3 + 2] = view[2] * x + view[6] * y + view[10] * z + view[14];
          }
          let count = 0;
          for (let n = 0; n < 3; n++) {
            const a = n * 3, b = ((n + 1) % 3) * 3, aIn = triangle[a + 2] <= -near, bIn = triangle[b + 2] <= -near;
            if (aIn) {
              clipped[count++] = triangle[a]; clipped[count++] = triangle[a + 1]; clipped[count++] = triangle[a + 2];
            }
            if (aIn !== bIn) {
              const t = (-near - triangle[a + 2]) / (triangle[b + 2] - triangle[a + 2]);
              clipped[count++] = triangle[a] + (triangle[b] - triangle[a]) * t;
              clipped[count++] = triangle[a + 1] + (triangle[b + 1] - triangle[a + 1]) * t;
              clipped[count++] = -near;
            }
          }
          if (count < 9) continue;
          maskCtx.beginPath();
          for (let n = 0; n < count; n += 3) {
            const x = width / 2 - clipped[n] * focal / clipped[n + 2], y = height / 2 + clipped[n + 1] * focal / clipped[n + 2];
            if (n) maskCtx.lineTo(x, y); else maskCtx.moveTo(x, y);
          }
          maskCtx.closePath();
          maskCtx.fill();
          maskCtx.stroke();
          state.faces++;
        }
      }
      for (const child of node.children) drawNode(child);
    };
    const draw = (camera, actor, touchesRock, occluded, solidAt, materialAt, guides = null, dt = 1 / 60) => {
      state.insideRock = state.partialRock = false;
      state.rockCoverage = 0;
      state.outlined = false;
      state.faces = 0;
      state.guideLines = 0;
      state.structureFaces = 0;
      state.structureFilled = false;
      state.guideKind = null; state.guideIndex = -1; state.guideBasement = false;
      // The selected-character visibility gate is absolute. Clear remembered
      // structural fades before the early return so a newly hidden wall eases
      // back in instead of restoring its former opacity in one frame.
      if (guides?.objectsEnabled === false) structurePhases.fill(0);
      const hasStructures = guides?.objectsEnabled !== false && (guides?.structures ? guides.structures.length : guides?.structure?.surfaceActive);
      if (!touchesRock && !occluded && !guides?.count && !guides?.providerCount && !hasStructures) return;
      const w = overlay.clientWidth, h = overlay.clientHeight;
      screenW = w; screenH = h;
      ctx.save();
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = "source-over";
      mat4.lookAt(view, camera.position, camera.target, camera.up || UP);
      if (touchesRock) drawRock(camera, solidAt, materialAt);
      if (guides) drawStructure(camera, guides, w, h);
      // Occlusion is evaluated against the camera for each guide segment.
      // It applies in open air too, independently of the near-plane rock cap.
      if (guides && guides.objectsEnabled !== false) drawGuides(camera, guides, dt);
      if (guides?.providerCount && guides.objectsEnabled !== false) for (let i = 0; i < guides.ownerCount; i++) {
        const provider = guides.ownerProviders[i];
        if (provider && guides.ownerViews[i] && guides.ownerStates[i] & 2 && guides.ownerAlphas[i] > 0) provider.draw(camera, ctx, guides.ownerAlphas[i], w, h);
      }
      if (actor && occluded && guides?.objectsEnabled !== false) {
        ensureBuffers(w, h);
        focal = height / 2 / Math.tan(camera.fov / 2);
        near = camera.near;
        maskCtx.clearRect(0, 0, width, height);
        maskCtx.fillStyle = maskCtx.strokeStyle = "#d9c9a9";
        maskCtx.lineWidth = 0.6;
        drawNode(actor);
        rimCtx.clearRect(0, 0, width, height);
        rimCtx.globalCompositeOperation = "source-over";
        const spread = Math.max(1, 1.5 * scale);
        for (let y = -1; y <= 1; y++) for (let x = -1; x <= 1; x++) if (x || y) rimCtx.drawImage(mask, x * spread, y * spread);
        rimCtx.globalCompositeOperation = "destination-out";
        rimCtx.drawImage(mask, 0, 0);
        ctx.globalAlpha = state.opacity;
        ctx.drawImage(rim, 0, 0, width, height, 0, 0, w, h);
        state.outlined = state.faces > 0;
      }
      ctx.restore();
    };
    const dispose = () => {
      mask.width = mask.height = rim.width = rim.height = stone.width = stone.height = concealed.width = concealed.height = concealedRim.width = concealedRim.height = visible.width = visible.height = wallLayer.width = wallLayer.height = 1;
      wallContexts.fill(null); wallCached = false;
    };
    return { draw, dispose, state };
  };
  BL.cameraCover = { create };
})();
