// Visibility caches keep exact witnesses without repeating unrelated terrain work.
export const outlinePerformanceProbe = () => {
  const B = window.__ooga, BL = window.BL, island = B.island, guides = B.headquarters.rockGuides;
  const camera = BL.scene.createCamera({ near: 0.1, far: 100 }), actor = { baseY: 0, root: { position: { x: 0, y: 0, z: 0 } } };
  const rows = [], failures = [];
  for (const context of guides.contexts) {
    if (context.kind !== "surface" || context.surfaceGroupCount < 100) continue;
    const s = context.surfaceSamples, c = context.surfaceCenters, wall = context.walls[0];
    const ex = s[0] + (s[0] - c[0]) * 20, ey = s[1] + 0.6, ez = s[2] + (s[2] - c[2]) * 20;
    if (!island.clearAt(ex, ey, ez)) continue;
    Object.assign(actor.root.position, { x: ex, y: ey - 1.1, z: ez });
    Object.assign(camera.position, { x: ex * 1.8, y: ey, z: ez * 1.8 });
    Object.assign(camera.target, { x: ex, y: ey, z: ez });
    guides.resetSurface();
    let blocked = -1, queries = 0;
    const objectClear = (ax, ay, az, x, y, z) => {
      queries++;
      return blocked < 0 || Math.abs(x - s[blocked * 3]) + Math.abs(y - s[blocked * 3 + 1]) + Math.abs(z - s[blocked * 3 + 2]) > 1e-7;
    };
    guides.updateSurface(context, ex, ey, ez, camera, 0.3, actor, objectClear, 1);
    if (!wall.perceived) continue;
    let first = -1, witnesses = 0;
    for (let group = 0; group < context.surfaceGroupCount; group++) {
      const at = group * 3, p = actor.root.position;
      if (Math.hypot(c[at] - p.x, c[at + 1] - p.y, c[at + 2] - p.z) <= 12 && island.sightClearAt(ex, ey, ez, s[at], s[at + 1], s[at + 2])) {
        if (first < 0) first = group;
        witnesses++;
      }
    }
    if (witnesses < 2) continue;
    const lazy = context.surfaceTerrainSeen.filter((value) => value === 2).length;
    const beforeRays = guides.stats.surfaceRays, beforeCertificates = guides.stats.surfaceCertificates, initialQueries = queries;
    blocked = first;
    guides.updateSurface(context, ex, ey, ez, camera, 0.3, actor, objectClear, 2);
    const remaining = context.surfaceTerrainSeen.filter((value) => value === 2).length;
    const row = { groups: context.surfaceGroupCount, witnesses, initialQueries, lazy, remaining, stillPerceived: wall.perceived, retraced: guides.stats.surfaceRays - beforeRays + guides.stats.surfaceCertificates - beforeCertificates };
    // Moving the actor alone does not invalidate a fixed camera's rock rays.
    actor.root.position.y += 0.05;
    guides.updateSurface(context, ex, ey + 0.05, ez, camera, 0.3, actor, objectClear, 3);
    row.actorRetraced = guides.stats.surfaceRays - beforeRays + guides.stats.surfaceCertificates - beforeCertificates;
    const anchor = context.surfaceEye[0];
    for (let step = 1; step <= 4; step++) {
      actor.root.position.x = ex + step * 0.01;
      guides.updateSurface(context, ex + step * 0.01, ey + 0.05, ez, camera, 1 / 120, actor, objectClear, 10 + step);
    }
    // Small moves must accumulate against the last terrain query, even if
    // unrelated moving objects invalidate perception during every frame.
    row.accumulatedMotion = Math.abs(context.surfaceEye[0] - anchor) >= 0.025;
    // A previously inactive wall must be evaluated when it becomes visible,
    // even if the camera has not moved at all.
    guides.resetSurface();
    guides.updateSurface(context, ex, ey, ez, camera, 0.3, actor, () => false, 4);
    const inactive = !wall.cameraReady && !wall.target;
    const inactiveRays = guides.stats.surfaceRays + guides.stats.surfaceCertificates;
    guides.updateSurface(context, ex, ey, ez, camera, 0.3, actor, () => true, 5);
    row.newlyActive = inactive && wall.cameraReady && wall.target > 0 && guides.stats.surfaceRays + guides.stats.surfaceCertificates > inactiveRays;
    if (!lazy || remaining >= lazy || !row.stillPerceived || row.retraced || row.actorRetraced || !row.accumulatedMotion || !row.newlyActive) failures.push(row);
    rows.push(row);
    if (rows.length === 3) break;
  }
  guides.resetSurface();
  if (rows.length !== 3) failures.push({ kind: "missing hill fixtures", count: rows.length });
  return { rows, failures };
};
