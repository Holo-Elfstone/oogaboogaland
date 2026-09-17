// Passing Oogas should not blink an item's or wall's eligibility. They still
// occlude ordinary camera rays; solid scenery still blocks actor perception.
export const outlineMovingCharactersProbe = () => {
  const BL = window.BL, B = window.__ooga, S = BL.scene, failures = [], rows = [], caches = [];
  const fail = (kind, detail) => { if (failures.length < 12) failures.push({ kind, ...detail }); };
  const root = S.createNode(), actor = { baseY: 0, root: S.createNode({ geometry: BL.models.box({ w: 0.5, h: 1.4, d: 0.5, color: "#ffffff" }), position: { x: 0, y: 1, z: 0 } }) };
  const body = BL.models.box({ w: 1.6, h: 2, d: 0.4, color: "#ffffff" });
  const npc = { root: S.createNode({ geometry: body, position: { x: 3, y: 1, z: 3 } }), headOpen: body, headClosed: body };
  S.addChild(npc.root, S.createNode({ geometry: body, scale: { x: 0.5, y: 0.4, z: 0.6 }, position: { x: 0, y: 0.6, z: 0 } }));
  const target = S.createNode({ geometry: BL.models.box({ w: 0.6, h: 0.8, d: 0.6, color: "#ffffff" }), position: { x: 0, y: 1, z: 6 } });
  const blocker = S.createNode({ geometry: body, position: { x: 0, y: 1, z: 3 }, visible: false });
  const distant = S.createNode({ geometry: body, position: { x: 30, y: 1, z: 3 } });
  const providerOwner = S.createNode({ position: { x: -0.8, y: 1, z: 6 } });
  S.addChild(root, actor.root, npc.root, target, blocker, distant, providerOwner);
  const provider = { owner: providerOwner, roots: [providerOwner], active: () => true, distance: () => 6, inView: () => true, cameraVisibility: () => 2, clear: () => true, boxClear: () => true, draw: () => {},
    perceived: (cave, x, y, z, terrainClear, objectClear) => terrainClear(x, y, z, -0.8, 1, 5.98) && objectClear(x, y, z, -0.8, 1, 5.98, cave, providerOwner) };
  const objects = BL.objectGuides.create({ roots: [actor.root, npc.root, target, blocker, distant, providerOwner], crew: { cavemen: new Map([["selected", actor], ["passing", npc]]) }, providers: [provider] });
  const camera = S.createCamera({ fov: 90, near: 0.1, far: 100 }); Object.assign(camera.position, { x: 0, y: 1, z: -8 }); Object.assign(camera.target, { x: 0, y: 1, z: 4 });
  let cameraWall = true, terrainWall = false, partialWindow = false;
  const terrainClear = (ax, ay, az, bx, by, bz) => {
    const intersects = (lo, hi, half) => {
      if (Math.max(az, bz) < lo || Math.min(az, bz) > hi) return false;
      const dz = bz - az, a = dz ? Math.max(0, Math.min((lo - az) / dz, (hi - az) / dz)) : 0, b = dz ? Math.min(1, Math.max((lo - az) / dz, (hi - az) / dz)) : 1;
      return !half || Math.min(ax + (bx - ax) * a, ax + (bx - ax) * b) <= 0;
    };
    return !(terrainWall && intersects(3.9, 4.1, false) || cameraWall && intersects(-4.1, -3.9, partialWindow));
  };
  terrainClear.boxSolid = (minX, minY, minZ, maxX, maxY, maxZ) => terrainWall && minZ >= 3.9 && maxZ <= 4.1 || cameraWall && minZ >= -4.1 && maxZ <= -3.9 && (!partialWindow || maxX <= 0);
  const filter = BL.sightGuides.create({ segmentClear: terrainClear, objectClear: objects.cameraClear, actorClear: objects.perceptionClear,
    eyeAt: (cave, out) => { Object.assign(out, cave.root.position); }, ownerBoundary: objects.ownerBoundaryAt, ownerPerceived: objects.perceived,
    ownerConcealed: objects.concealed, ownerClear: objects.ownerClear, ownerDistance: objects.distance, ownerInView: objects.inView, getProvider: objects.getProvider });
  const empty = { count: 0, lines: new Float32Array(0) };
  const sample = (name, dt = 0.3, first = false) => {
    S.updateWorld(root);
    const source = objects.collect(actor, 0, 1, 0, camera, 1.6, filter.state.retainedOwners, filter.state.retainedCount);
    const actorVisible = objects.actorVisible(actor, terrainClear), enabled = !first && !actorVisible;
    const state = filter.update(actor, empty, source, camera, 1.6, dt, enabled), index = state.owners.indexOf(target), pi = state.owners.indexOf(providerOwner);
    const row = { name, x: npc.root.position.x, perceived: objects.perceived(target, actor, 0, 1, 0, terrainClear), providerPerceived: objects.perceived(providerOwner, actor, 0, 1, 0, terrainClear),
      directClear: objects.clear(0, 1, 0, 0, 1, 5.68, actor, target), perceptionClear: objects.perceptionClear(0, 1, 0, 0, 1, 5.68, actor, target),
      cameraClear: objects.cameraClear(0, 1, 0, 0, 1, 5.68, actor, target), cameraWrapperClear: objects.perceptionClear(0, 1, 0, 0, 1, 5.68, actor, target, true),
      actorVisible, fullyVisible: objects.actorFullyVisible(actor, terrainClear), enabled: state.objectsEnabled, count: state.count,
      recognized: index >= 0 && !!(state.ownerStates[index] & 1), hidden: index >= 0 && !!(state.ownerStates[index] & 2), alpha: index < 0 ? 0 : state.ownerAlphas[index],
      providerRecognized: pi >= 0 && !!(state.ownerStates[pi] & 1), providerAlpha: pi < 0 ? 0 : state.ownerAlphas[pi] };
    rows.push(row); return row;
  };
  try {
    const before = sample("before");
    for (const x of [1.2, 0.6, 0, -0.6, -1.2, -3, -0.6, 0, 0.6, 3]) {
      npc.root.position.x = x; const row = sample("passing", 1 / 30);
      if (!row.perceived || !row.providerPerceived || !row.recognized || !row.providerRecognized || !row.hidden || !row.enabled || Math.abs(row.alpha - before.alpha) > 1e-6 || Math.abs(row.providerAlpha - before.providerAlpha) > 1e-6) fail("passing character changed eligibility", row);
      if (row.cameraClear !== row.cameraWrapperClear) fail("perception wrapper changed camera rays", row);
      if (x === 0 && (row.directClear || row.cameraClear || !row.perceptionClear)) fail("NPC ray fixture or query separation", row);
    }
    npc.root.position.x = 0; blocker.visible = true;
    const staticWall = sample("static prop blocks");
    if (staticWall.perceived || staticWall.providerPerceived || staticWall.perceptionClear || staticWall.recognized || staticWall.alpha) fail("static prop no longer blocks", staticWall);
    blocker.visible = false; const restored = sample("static prop removed");
    if (!restored.perceived || !restored.recognized || Math.abs(restored.alpha - before.alpha) > 1e-6) fail("static prop removal did not restore", restored);
    terrainWall = true; objects.result.occlusionVersion++; objects.result.perceptionVersion++; const terrain = sample("terrain blocks");
    if (terrain.perceived || terrain.providerPerceived || terrain.recognized || terrain.alpha) fail("terrain no longer blocks", terrain);
    terrainWall = false; objects.result.occlusionVersion++; objects.result.perceptionVersion++; sample("terrain removed");
    npc.root.position.x = 3; partialWindow = true; objects.result.occlusionVersion++;
    const visible = sample("partly visible selected character");
    if (!visible.actorVisible || visible.fullyVisible || visible.enabled || visible.count) fail("partial selected character gate changed", visible);
    partialWindow = false; objects.result.occlusionVersion++; const first = sample("first person", 0.3, true);
    if (first.enabled || first.count) fail("first-person gate changed", first);
    const hiddenAgain = sample("hidden again");
    if (!hiddenAgain.enabled || !hiddenAgain.perceived || !hiddenAgain.alpha || !hiddenAgain.count) fail("hidden outlines did not return", hiddenAgain);
    const cacheSample = (name) => {
      S.updateWorld(root);
      const source = objects.collect(actor, 0, 1, 0, camera, 1.6);
      const row = { name, occlusion: source.occlusionVersion, perception: source.perceptionVersion };
      for (const [key, owner] of [["target", target], ["provider", providerOwner], ["npc", npc.root]]) {
        const before = objects.stats.perceptionQueries;
        row[key] = objects.perceived(owner, actor, 0, 1, 0, terrainClear);
        row[`${key}Queries`] = objects.stats.perceptionQueries - before;
      }
      caches.push(row); return row;
    };
    const cached = cacheSample("settled");
    npc.root.position.x = 30;
    const moved = cacheSample("NPC left range");
    if (!cached.npc || moved.npc || moved.npcQueries !== 1 || moved.targetQueries || moved.providerQueries || !moved.target || !moved.provider || moved.occlusion <= cached.occlusion || moved.perception !== cached.perception) fail("NPC invalidated scenery or retained stale target", { cached, moved });
    blocker.visible = true;
    const blocked = cacheSample("scenery appeared");
    if (blocked.target || blocked.provider || blocked.targetQueries !== 1 || blocked.providerQueries !== 1 || blocked.perception <= moved.perception) fail("scenery did not invalidate perception", blocked);
    blocker.visible = false;
    const cleared = cacheSample("scenery removed");
    if (!cleared.target || !cleared.provider || cleared.targetQueries !== 1 || cleared.providerQueries !== 1 || cleared.perception <= blocked.perception) fail("removed scenery retained stale perception", cleared);
    distant.position.x = 31;
    const farMoved = cacheSample("distant scenery moved");
    if (!farMoved.target || farMoved.targetQueries || farMoved.perception <= cleared.perception || farMoved.occlusion <= cleared.occlusion) fail("distant scenery invalidated an unrelated ray volume", farMoved);
    distant.position.x = 0;
    const entered = cacheSample("moving scenery entered sight rays");
    if (entered.target || entered.targetQueries !== 1) fail("incoming scenery kept cached visibility", entered);
    distant.position.x = 31;
    const departed = cacheSample("moving scenery left sight rays");
    if (!departed.target || departed.targetQueries !== 1) fail("departed scenery kept cached occlusion", departed);
  } finally { filter.dispose(); objects.dispose(); }

  // Use an actual registered cave wall and its real terrain sight rays. A
  // large passing body covers every wall witness; an identical static prop
  // proves the perception query is still respecting opaque scenery.
  const structural = [], guides = B.headquarters.rockGuides, context = guides.contexts.find((entry) => entry.kind === "sealed");
  const m = context.source.mouth, sr = Math.sin(m.ry), cr = Math.cos(m.ry), worldAt = (x, y, z) => ({ x: m.x + cr * x + sr * z, y: m.floorY + y, z: m.z - sr * x + cr * z });
  const stage = S.createNode(), wallActor = { baseY: 0, root: S.createNode() }, shield = BL.models.box({ w: 12, h: 8, d: 0.25, color: "#ffffff" });
  const wallNPC = { root: S.createNode({ geometry: shield, rotation: { x: 0, y: m.ry, z: 0 } }), headOpen: shield, headClosed: shield };
  const stone = S.createNode({ geometry: shield, rotation: { x: 0, y: m.ry, z: 0 }, visible: false });
  S.addChild(stage, wallActor.root, wallNPC.root, stone);
  const wallObjects = BL.objectGuides.create({ roots: [wallActor.root, wallNPC.root, stone], crew: { cavemen: new Map([["selected", wallActor], ["passing", wallNPC]]) } });
  let eye = null, buried = null;
  for (const z of [3.5, 2.8, 2.2]) {
    const candidate = worldAt(0, 1.1, z);
    if (!B.island.clearAt(candidate.x, candidate.y, candidate.z)) continue;
    for (let n = 0; n < context.surfaceSamples.length; n += 3) if (B.island.sightClearAt(candidate.x, candidate.y, candidate.z, context.surfaceSamples[n], context.surfaceSamples[n + 1], context.surfaceSamples[n + 2])) { eye = candidate; break; }
    if (eye) break;
  }
  for (const x of [-4, 4, -5, 5]) for (const z of [-2, -4, -6]) {
    const point = worldAt(x, 1.5, z); if (!buried && B.island.solidAt(point.x, point.y, point.z)) buried = point;
  }
  try {
    if (!eye || !buried) fail("missing real cave witness fixture", { id: m.id, eye, buried });
    else {
      const eyeZ = (eye.x - m.x) * sr + (eye.z - m.z) * cr, shieldZ = (eyeZ + 1) / 2;
      Object.assign(wallActor.root.position, { x: eye.x, y: eye.y - 1.1, z: eye.z }); Object.assign(camera.position, buried); Object.assign(camera.target, eye);
      Object.assign(stone.position, worldAt(0, 1.5, shieldZ)); guides.resetSurface();
      const inspect = (name, x, blocked) => {
        Object.assign(wallNPC.root.position, worldAt(x, 1.5, shieldZ)); stone.visible = blocked; S.updateWorld(stage);
        const source = wallObjects.collect(wallActor, eye.x, eye.y, eye.z, camera, 1.6);
        guides.updateSurface(context, eye.x, eye.y, eye.z, camera, 0.3, wallActor, wallObjects.perceptionClear, source.occlusionVersion);
        const row = { name, targets: context.walls.map((wall) => wall.target), phases: context.walls.map((wall) => wall.phase), active: context.surfaceWholeActive, count: context.surfaceGroupCount };
        structural.push(row); return row;
      };
      const before = inspect("before", 12, false), across = inspect("NPC crossing", 0, false), departed = inspect("NPC left", -12, false), blocked = inspect("static prop", 0, true), restored = inspect("static prop removed", 0, false);
      if (!before.targets.some((target) => target > 0) || !before.active || across.targets.some((target, n) => target !== before.targets[n]) || departed.targets.some((target, n) => target !== before.targets[n]) || restored.targets.some((target, n) => target !== before.targets[n]) || blocked.targets.some((target) => target > 0)) fail("real cave wall perception changed", { id: m.id, structural });
    }
  } finally { guides.resetSurface(); wallObjects.dispose(); }
  return { rows, structural, caches, failures, disposed: objects.stats.registered === 0 && wallObjects.stats.registered === 0 };
};
