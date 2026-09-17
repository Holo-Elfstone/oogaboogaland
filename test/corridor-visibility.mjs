// Exercise the production overlay with the real narrow entrance walls. The
// independent witnesses come from the rendered body, not its bounding boxes.
export const corridorVisibilityProbe = () => {
  const BL = window.BL, B = window.__ooga, S = BL.scene, scene = BL.scenes.hub, island = B.island, camera = B.camera, H = B.headquarters;
  const actor = [...B.cavemen.values()].find((cave) => cave.state === "working"), failures = [], rows = [];
  const fail = (kind, detail = {}) => { if (failures.length < 12) failures.push({ kind, ...detail }); };
  if (!actor) throw new Error("No working character for the corridor visibility regression");
  const saved = { position: { ...camera.position }, target: { ...camera.target }, up: camera.up, near: camera.near, far: camera.far, actor: { ...actor.root.position }, rotation: { ...actor.root.rotation } };
  const aspect = B.renderer.size.width / B.renderer.size.height, points = [], runtime = { frames: 0, hidden: 0, visible: 0, clearView: 0, bodySamples: 0, checkedSamples: 0, dropout: 0, visibleOutlined: 0, corridorWalls: 0, panReversals: 0, zooms: 0, nearPlane: 0, firstPerson: false };
  const putActor = (frontIndex, along) => {
    const front = island.headquarters.fronts[frontIndex], position = { x: front.center.x + front.tangent.x * along, y: 0, z: front.center.z + front.tangent.z * along };
    B.crew.relocatePlayer(position, 0); S.updateWorld(scene.root);
    points.length = 0;
    const keys = new Set();
    S.traverseVisible(actor.root, (node) => {
      if (!node.geometry || node.cameraHidden) return;
      const v = node.geometry.verts, w = node.world;
      const add = (x, y, z) => {
        const point = [w[0] * x + w[4] * y + w[8] * z + w[12], w[1] * x + w[5] * y + w[9] * z + w[13], w[2] * x + w[6] * y + w[10] * z + w[14]], key = point.map((n) => n.toFixed(7)).join(",");
        if (!keys.has(key)) { keys.add(key); points.push(point); }
      };
      for (let n = 0; n < v.length; n += 3) add(v[n], v[n + 1], v[n + 2]);
      for (const face of node.geometry.faces) {
        let x = 0, y = 0, z = 0;
        for (let n = 0; n < face.i.length; n++) {
          const a = face.i[n] * 3, b = face.i[(n + 1) % face.i.length] * 3;
          add((v[a] + v[b]) / 2, (v[a + 1] + v[b + 1]) / 2, (v[a + 2] + v[b + 2]) / 2);
          x += v[a]; y += v[a + 1]; z += v[a + 2];
        }
        add(x / face.i.length, y / face.i.length, z / face.i.length);
      }
    });
    runtime.bodySamples = Math.max(runtime.bodySamples, points.length);
    return position;
  };
  const aim = (position, yaw, distance, height) => {
    Object.assign(camera.position, { x: position.x + Math.sin(yaw) * distance, y: height, z: position.z + Math.cos(yaw) * distance });
    Object.assign(camera.target, { x: position.x, y: actor.root.position.y + 0.6, z: position.z });
  };
  const witness = () => {
    const e = camera.position, t = camera.target, length = Math.hypot(t.x - e.x, t.y - e.y, t.z - e.z), fx = (t.x - e.x) / length, fy = (t.y - e.y) / length, fz = (t.z - e.z) / length;
    const horizontal = Math.hypot(fx, fz), rx = -fz / horizontal, rz = fx / horizontal, ux = -rz * fy, uy = rz * fx - rx * fz, uz = rx * fy;
    const tanY = Math.tan(camera.fov / 2), tanX = tanY * aspect;
    let inView = 0, clear = 0;
    for (const p of points) {
      const dx = p[0] - e.x, dy = p[1] - e.y, dz = p[2] - e.z, depth = dx * fx + dy * fy + dz * fz;
      if (depth <= camera.near || depth >= camera.far || Math.abs(dx * rx + dz * rz) > depth * tanX || Math.abs(dx * ux + dy * uy + dz * uz) > depth * tanY) continue;
      inView++;
      const start = camera.near / depth;
      if (island.sightClearAt(e.x + dx * start, e.y + dy * start, e.z + dz * start, p[0], p[1], p[2])) clear++;
    }
    runtime.checkedSamples += inView;
    return { inView, clear };
  };
  const sample = (name, frontIndex, expected = "hidden", dt = 0.3) => {
    const seen = witness();
    scene.overlay(dt); runtime.frames++;
    const guide = H.sightGuides, cover = H.cameraCover;
    const row = { name, front: frontIndex, ...seen, enabled: guide.objectsEnabled, rockOnly: guide.rockOnly, rockCoverage: cover.rockCoverage, outlined: cover.outlined, structureFaces: cover.structureFaces, structureFilled: cover.structureFilled, guideLines: cover.guideLines };
    rows.push(row);
    if (!seen.inView) fail("character outside test viewport", row);
    if (expected === "hidden" && seen.clear) fail("corridor fixture is visible", row);
    if (expected === "visible" && !seen.clear) fail("visible fixture is blocked", row);
    if (!seen.clear && seen.inView) {
      runtime.hidden++;
      if (!guide.objectsEnabled || !cover.outlined) { runtime.dropout++; fail("hidden corridor actor lost outlines", row); }
      if (frontIndex >= 0) {
        const front = H.rockGuides.contexts.find((context) => context.kind === "front" && context.index === frontIndex);
        if (front.surfaceActive > 0 && cover.structureFaces > 0 && cover.structureFilled) runtime.corridorWalls++;
        else fail("hidden corridor wall lost outline", row);
      }
    } else if (seen.clear) {
      runtime.visible++;
      const rendered = cover.outlined || cover.structureFaces || cover.structureFilled || cover.guideLines;
      // The conservative near-plane check can prepare rock-only candidates
      // even when its exact rock mask is empty. These remain invisible; the
      // partial-cap tests separately verify clipping when a real cap exists.
      const leaked = guide.rockOnly ? cover.rockCoverage !== 0 || rendered
        : guide.objectsEnabled || rendered || guide.count || guide.providerCount;
      if (!guide.rockOnly) runtime.clearView++;
      if (leaked) { runtime.visibleOutlined++; fail("visible actor did not immediately clear outlines", row); }
    }
    return row;
  };
  let boundary = null;
  try {
    B.pilot.possess(actor); camera.up = null; camera.near = 0.5; camera.far = 100;
    for (let frontIndex = 0; frontIndex < 2; frontIndex++) {
      const position = putActor(frontIndex, 3), radial = Math.atan2(position.x, position.z);
      // These angles pass behind the one-voxel strip along both diagonally
      // oriented entrances. Reverse the pan without moving the character.
      const angles = frontIndex ? [0.3, 0.325, 0.35, 0.325, 0.3] : [-0.15, -0.1, -0.05, 0, -0.05, -0.1, -0.15];
      for (const height of [1, 3, 6]) {
        for (const angle of angles) { aim(position, radial + angle, 20, height); sample(`pan ${angle}, height ${height}`, frontIndex); }
        runtime.panReversals++;
      }
      for (const distance of [12, 20, 32, 20, 12]) {
        aim(position, radial + (frontIndex ? 0.3 : 0), distance, 3);
        sample(`zoom ${distance}`, frontIndex); runtime.zooms++;
      }
    }
    for (const along of [-3, 0]) {
      const position = putActor(0, along), radial = Math.atan2(position.x, position.z);
      for (const height of [1, 3]) { aim(position, radial, 20, height); sample(`along ${along}, height ${height}`, 0); }
    }
    const position = putActor(0, 3), radial = Math.atan2(position.x, position.z);
    aim(position, radial, 20, 3);
    const start = { ...camera.position }, target = { ...camera.target }, length = Math.hypot(target.x - start.x, target.y - start.y, target.z - start.z), dx = (target.x - start.x) / length, dy = (target.y - start.y) / length, dz = (target.z - start.z) / length;
    let wallDistance = null;
    for (let distance = 0; distance < length - 1; distance += 0.02) if (island.solidAt(start.x + dx * distance, start.y + dy * distance, start.z + dz * distance)) { wallDistance = distance; break; }
    if (wallDistance === null) fail("no narrow wall on the central view ray");
    else for (const offset of [-1, -0.6, -0.3, 0.1]) {
      Object.assign(camera.position, { x: start.x + dx * (wallDistance + offset), y: start.y + dy * (wallDistance + offset), z: start.z + dz * (wallDistance + offset) });
      sample(`near-plane crossing ${offset}`, 0, "either"); runtime.nearPlane++;
    }
    // Find a genuine partial reveal at the edge of this same corridor. Its
    // visible body witness must disable all overlays on that very frame.
    for (let step = 1; step <= 32 && !boundary; step++) {
      aim(position, radial + step * Math.PI / 32, 12, 3);
      const seen = witness();
      if (seen.clear && seen.clear < seen.inView) boundary = { eye: { ...camera.position }, target: { ...camera.target }, ...seen };
    }
    if (!boundary) fail("no partial character reveal around corridor edge");
    else {
      aim(position, radial, 20, 3); sample("hidden before partial reveal", 0);
      Object.assign(camera.position, boundary.eye); Object.assign(camera.target, boundary.target);
      sample("first frame of partial reveal", 0, "visible", 0);
      aim(position, radial, 20, 3); sample("hidden again after partial reveal", 0);
    }
    // Exercise the strict disabled-state rule in a genuinely clear camera
    // volume as well as the conservative near-plane cases above.
    let clearView = false;
    for (let step = 0; step < 32 && !clearView; step++) {
      aim(position, radial + step * Math.PI / 16, 3, 1.8);
      if (!witness().clear) continue;
      scene.overlay(0);
      if (H.sightGuides.rockOnly) continue;
      sample("visible actor in clear camera volume", 0, "visible", 0); clearView = true;
    }
    if (!clearView || !runtime.clearView) fail("no unobstructed visible-actor fixture");
    B.pilot.enterClose(); scene.overlay(0); runtime.frames++;
    runtime.firstPerson = B.pilot.closeWanted && !H.sightGuides.objectsEnabled && !H.cameraCover.outlined && H.cameraCover.structureFaces === 0 && H.cameraCover.guideLines === 0;
    if (!runtime.firstPerson) fail("first-person entry retained outlines");
  } finally {
    B.pilot.goPreset("pile"); Object.assign(actor.root.position, saved.actor); Object.assign(actor.root.rotation, saved.rotation);
    Object.assign(camera.position, saved.position); Object.assign(camera.target, saved.target); camera.up = saved.up; camera.near = saved.near; camera.far = saved.far;
    S.updateWorld(scene.root);
  }
  // A grid plane immediately behind a very small visible part is not an
  // occluder. This guards the termination of the terrain section walk.
  const small = { root: S.createNode({ geometry: BL.models.box({ w: 0.002, h: 0.002, d: 0.002, color: "#ffffff" }), position: { x: 0, y: 0, z: 0.12 } }) }, root = S.createNode();
  S.addChild(root, small.root); S.updateWorld(root);
  const objects = BL.objectGuides.create({ roots: [small.root], crew: { cavemen: new Map([["small", small]]) } }), view = S.createCamera({ near: 0.1, far: 10 });
  Object.assign(view.position, { x: 0, y: 0, z: -1 }); Object.assign(view.target, small.root.position);
  const clear = (ax, ay, az, bx, by, bz) => Math.max(az, bz) < 0.124 || Math.min(az, bz) > 0.251;
  clear.boxSolid = (minX, minY, minZ, maxX, maxY, maxZ) => minZ >= 0.124 && maxZ <= 0.251;
  clear.boxGrid = new Float64Array([0.25, 0, 0, 0]);
  let behindVisible = false;
  try {
    objects.collect(small, 0, 0, 0.12, view, aspect);
    behindVisible = objects.actorVisible(small, clear);
    if (!behindVisible) fail("rock behind a tiny body incorrectly occludes it");
  } finally { objects.dispose(); }
  return { backend: B.renderer.kind, runtime, boundary, behindVisible, rows, failures };
};
