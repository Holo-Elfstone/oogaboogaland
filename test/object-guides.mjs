// Exercise the real object registry independently of the current camera's
// contour list. These probes also run in Node with the classic modules loaded.
export const objectCrowdingProbe = () => {
  const BL = window.BL, S = BL.scene, root = S.createNode(), actor = { root: S.createNode({ position: { x: 0, y: 1, z: 0 } }) };
  const props = [], characters = new Map(), small = BL.models.box({ w: 0.08, h: 0.08, d: 0.08, color: "#ffffff" }), body = BL.models.box({ w: 0.3, h: 0.3, d: 0.3, color: "#ffffff" });
  S.addChild(root, actor.root);
  const target = S.createNode({ geometry: BL.models.box({ w: 1, h: 1, d: 1, color: "#ffffff" }), position: { x: 0, y: 1, z: 8 } });
  S.addChild(root, target); props.push(target);
  const addProp = (i) => {
    const node = S.createNode({ geometry: small, position: { x: 2 + i % 25 * 0.08, y: 0.5 + Math.floor(i / 25) * 0.08, z: 2 } });
    S.addChild(root, node); props.push(node); return node;
  };
  for (let i = 0; i < 250; i++) addProp(i);
  for (let i = 0; i < 7; i++) {
    const node = S.createNode({ geometry: body, position: { x: -30 - i, y: 1, z: 2 } });
    S.addChild(root, node); S.addChild(node, S.createNode({ geometry: body, position: { x: 0, y: 0.4, z: 0 } }));
    characters.set(`fixture${i}`, { root: node, headOpen: body, headClosed: body });
  }
  const roots = props.concat([...characters.values()].map((c) => c.root));
  const objects = BL.objectGuides.create({ roots, crew: { cavemen: characters } }), camera = S.createCamera({ fov: 90, near: 0.1, far: 100 });
  Object.assign(camera.position, { x: 0, y: 4, z: -15 }); Object.assign(camera.target, { x: 0, y: 1, z: 2 });
  const clear = (ax, ay, az, bx, by, bz) => !((az < -10 && bz > -10) || (bz < -10 && az > -10));
  const filter = BL.sightGuides.create({ segmentClear: clear, objectClear: objects.cameraClear, actorClear: objects.clear, ownerBoundary: objects.ownerBoundaryAt, ownerPerceived: objects.perceived, ownerConcealed: objects.concealed, ownerClear: objects.ownerClear, ownerDistance: objects.distance, ownerInView: objects.inView, getProvider: objects.getProvider });
  const empty = { count: 0, lines: new Float32Array(0) }, rows = [];
  const inspect = (label, expectedNodes, expectedOwners) => {
    S.updateWorld(root);
    const source = objects.collect(actor, 0, 1, 0, camera, 1.6), state = filter.update(actor, empty, source, camera, 1.6, 0.3);
    const candidateOwners = new Set(source.owners.slice(0, source.count)), nearby = source.nearOwners.slice(0, source.nearCount), slot = state.owners.indexOf(target);
    let targetEdges = 0; for (let n = 0; n < state.count; n++) if (state.kinds[n] && source.owners[state.sources[n]] === target) targetEdges++;
    rows.push({ label, expectedNodes, expectedOwners, candidates: objects.stats.candidates, nearCount: source.nearCount, stateOwners: state.owners.slice(0, state.ownerCount).filter(Boolean).length, allProps: props.every((p) => candidateOwners.has(p) && nearby.includes(p)), targetEdges, targetPerceived: objects.perceived(target, actor, 0, 1, 0, clear), targetClear: objects.clear(0, 1, 0, 0, 1, 7.49, actor, target), recognized: slot >= 0 && !!(state.ownerStates[slot] & 1), outputCount: state.count, sourceCount: source.count, sourceCapacity: source.capacity, outputCapacity: state.capacity, ownerCapacity: state.ownerCapacity });
    return { sourceLines: source.lines, nearOwners: source.nearOwners, stateLines: state.lines, ownerAlphas: state.ownerAlphas, growths: state.bufferGrowths };
  };
  let buffers, stable = true;
  try {
    inspect("before", 251, 251);
    let i = 0; for (const c of characters.values()) Object.assign(c.root.position, { x: -3 - i++ * 0.4, y: 1, z: 2 });
    buffers = inspect("characters enter", 265, 258);
    for (let cycle = 0; cycle < 3; cycle++) {
      i = 0; for (const c of characters.values()) c.root.position.x = -30 - i++;
      let next = inspect("characters leave", 251, 251);
      stable = stable && Object.keys(buffers).every((key) => buffers[key] === next[key]);
      i = 0; for (const c of characters.values()) c.root.position.x = -3 - i++ * 0.4;
      next = inspect("characters return", 265, 258);
      stable = stable && Object.keys(buffers).every((key) => buffers[key] === next[key]);
    }
    // Grow the actual registry beyond the former source-edge limit as well.
    for (let n = 250; n < 750; n++) roots.push(addProp(n));
    objects.refresh(); inspect("scene grows", 765, 758);
  } finally { filter.dispose(); objects.dispose(); }
  return { rows, stable, disposed: objects.stats.registered === 0 && objects.result.count === 0 && filter.state.ownerCount === 0 && filter.state.owners.every((owner) => owner === null) };
};

export const objectCameraIndependenceProbe = () => {
  const BL = window.BL, S = BL.scene, rows = [], empty = { count: 0, lines: new Float32Array(0) }, failures = [];
  for (const fixture of [{ name: "interior aperture", x: 0.42, y: 0.18, witness: [0.7, 0.3, -1] }, { name: "edge aperture", x: 1.2, y: 0.18, witness: [2, 0.3, -1] }]) {
    const root = S.createNode(), actor = { root: S.createNode({ position: { x: 0, y: 0, z: -6 } }) }, owner = S.createNode({ geometry: BL.models.box({ w: 4, h: 4, d: 2, color: "#ffffff" }) });
    S.addChild(root, actor.root, owner);
    const objects = BL.objectGuides.create({ roots: [owner], crew: { cavemen: new Map() } }), camera = S.createCamera({ fov: 90, near: 0.1, far: 100 });
    let open = true;
    const clear = (ax, ay, az, bx, by, bz) => {
      const t = (-3 - az) / (bz - az);
      if (t > 0 && t < 1) {
        const x = ax + (bx - ax) * t, y = ay + (by - ay) * t;
        if (!open || Math.abs(x - fixture.x) >= 0.04 || Math.abs(y - fixture.y) >= 0.04) return false;
      }
      return !((az < 5 && bz > 5) || (az > 5 && bz < 5) || (az < -10 && bz > -10) || (az > -10 && bz < -10));
    };
    const filter = BL.sightGuides.create({ segmentClear: clear, objectClear: objects.cameraClear, actorClear: objects.clear, ownerBoundary: objects.ownerBoundaryAt, ownerPerceived: objects.perceived, ownerConcealed: objects.concealed, ownerClear: objects.ownerClear, ownerDistance: objects.distance, ownerInView: objects.inView, getProvider: objects.getProvider });
    const state = filter.state;
    const sample = (dt = 0) => {
      S.updateWorld(root);
      const p = actor.root.position, source = objects.collect(actor, p.x, p.y, p.z, camera, 1.6, state.retainedOwners, state.retainedCount);
      filter.update(actor, empty, source, camera, 1.6, dt);
      const slot = state.owners.indexOf(owner);
      return { present: source.nearOwners.slice(0, source.nearCount).includes(owner), recognized: slot >= 0 && !!(state.ownerStates[slot] & 1), hidden: slot >= 0 && !!(state.ownerStates[slot] & 2), inView: slot >= 0 && !!state.ownerViews[slot], alpha: slot >= 0 ? state.ownerAlphas[slot] : 0, slot, count: state.count, nearVersion: source.nearVersion, distance: slot >= 0 ? state.ownerDistances[slot] : null };
    };
    const samples = [];
    try {
      Object.assign(camera.target, { x: 0, y: 0, z: 0 });
      for (const distance of [6, 18, 40]) for (const pitch of [0, 0.7]) for (let n = 0; n < 8; n++) {
        const yaw = n * Math.PI / 4;
        Object.assign(camera.position, { x: Math.sin(yaw) * Math.cos(pitch) * distance, y: Math.sin(pitch) * distance, z: -Math.cos(yaw) * Math.cos(pitch) * distance });
        const result = sample(); samples.push(result);
        if ((!result.present || !result.recognized) && failures.length < 12) failures.push({ fixture: fixture.name, distance, pitch, yaw, ...result });
      }
      Object.assign(camera.position, { x: 0, y: 0, z: -18 }); sample(0.3);
      const beforeTurn = sample(), queries = objects.stats.perceptionQueries;
      actor.root.rotation.y = Math.PI; const turned = sample();
      const rotationStable = turned.recognized === beforeTurn.recognized && turned.distance === beforeTurn.distance && objects.stats.perceptionQueries === queries;
      actor.root.rotation.y = 0;
      // Compare equal elapsed time with and without the owner in view. Looking
      // away must neither reset recognition nor restart its opacity on return.
      filter.update(null, null, null, camera, 1.6); sample(); sample(0.1); const control = sample(0.5);
      filter.update(null, null, null, camera, 1.6); sample(); const partial = sample(0.1);
      Object.assign(camera.target, { x: 0, y: 0, z: -36 }); const away = sample(), held = sample(0.5);
      Object.assign(camera.target, { x: 0, y: 0, z: 0 }); const returned = sample(); sample(0.3); const settled = sample();
      Object.assign(camera.target, { x: 0, y: 0, z: -36 }); sample(0.5);
      Object.assign(camera.target, { x: 0, y: 0, z: 0 }); const settledReturn = sample();
      Object.assign(camera.target, { x: 0, y: 0, z: -36 }); sample();
      open = false; objects.result.occlusionVersion++; const blocked = sample(0.3);
      open = true; objects.result.occlusionVersion++; const reopened = sample(0.3);
      owner.visible = false; const removed = sample();
      const cleared = !removed.present && state.owners.every((node) => node !== owner) && state.retainedOwners.every((node) => node !== owner);
      rows.push({ name: fixture.name, samples: samples.length, witness: clear(0, 0, -6, ...fixture.witness), recognized: samples.every((s) => s.present && s.recognized), distanceStable: samples.every((s) => s.distance === samples[0].distance), nearVersionStable: samples.every((s) => s.nearVersion === samples[0].nearVersion), rotationStable, control, partial, away, held, returned, settled, settledReturn, blocked, reopened, cleared });
    } finally { filter.dispose(); objects.dispose(); }
  }
  return { rows, failures };
};

export const objectProviderStateProbe = () => {
  const BL = window.BL, owner = {}, provider = { owner }, actor = { root: { position: { x: 0, y: 0, z: 0 } } };
  const source = { lines: new Float32Array(0), owners: [], count: 0, capacity: 0, version: 1, occlusionVersion: 1, nearOwners: [owner], nearDistances: new Float64Array([2]), nearCount: 1, nearVersion: 1, ownerCapacity: 1 };
  const camera = BL.scene.createCamera({ near: 0.1 }), empty = { count: 0, lines: new Float32Array(0) };
  let recognized = true, hidden = true, inView = true, enabled = true;
  const filter = BL.sightGuides.create({ segmentClear: () => true, objectClear: () => true, ownerPerceived: () => recognized, ownerConcealed: () => hidden, ownerInView: () => inView, getProvider: (node) => node === owner ? provider : null });
  const sample = (dt) => {
    const s = filter.update(actor, empty, source, camera, 1, dt, enabled), slot = s.owners.indexOf(owner);
    return { count: s.count, owners: s.ownerCount, providers: s.providerCount, same: slot >= 0 && s.ownerProviders[slot] === provider, alpha: slot < 0 ? 0 : s.ownerAlphas[slot], recognized: slot >= 0 && !!(s.ownerStates[slot] & 1) };
  };
  const initial = sample(0), visible = sample(0.3);
  inView = false; camera.target.x += 1; const away = sample(0.5);
  inView = true; camera.target.x -= 1; const returned = sample(0);
  hidden = false; source.occlusionVersion++; const clear = sample(0.3);
  hidden = true; recognized = false; source.occlusionVersion++; const blocked = sample(0.3);
  recognized = true; source.occlusionVersion++; const restored = sample(0.3);
  source.nearCount = 0; source.nearOwners[0] = null; source.nearVersion++; const removed = sample(0);
  source.nearCount = 1; source.nearOwners[0] = owner; source.nearVersion++; sample(0.3);
  enabled = false; const gated = sample(0);
  source.nearCount = 0; source.nearOwners[0] = null; source.nearVersion++; const removedWhileGated = sample(0);
  filter.dispose();
  return { initial, visible, away, returned, clear, blocked, restored, removed, gated, removedWhileGated, disposed: filter.state.owners.every((node) => node === null) && filter.state.ownerProviders.every((node) => node === null) && filter.state.retainedOwners.every((node) => node === null) };
};

export const objectVisibilityGateProbe = () => {
  const BL = window.BL, S = BL.scene, root = S.createNode(), body = BL.models.box({ w: 1, h: 2, d: 1, color: "#ffffff" });
  const actor = { root: S.createNode({ geometry: body }) }, owner = S.createNode({ geometry: body, position: { x: 3, y: 0, z: 0 } });
  S.addChild(root, actor.root, owner); S.updateWorld(root);
  const objects = BL.objectGuides.create({ roots: [actor.root, owner], crew: { cavemen: new Map([["actor", actor]]) } });
  const camera = S.createCamera({ fov: 90, near: 0.1, far: 100 }); Object.assign(camera.position, { x: 0, y: 0, z: -12 });
  let edge = 1, sliver = false;
  const clear = (ax, ay, az, bx, by, bz) => {
    const t = (-6 - az) / (bz - az);
    if (!(t > 0 && t < 1)) return true;
    const x = ax + (bx - ax) * t, y = ay + (by - ay) * t;
    if (sliver) return Math.abs(x - 0.073) < 0.001 && Math.abs(y - 0.117) < 0.001;
    return x < edge || x > 2 || Math.abs(y) > 2;
  };
  const boxSolid = (minX, minY, minZ, maxX, maxY, maxZ) => minZ >= -6.01 && maxZ <= -5.99 && minX >= edge && maxX <= 2 && minY >= -2 && maxY <= 2 && (!sliver || maxX < 0.072 || minX > 0.074 || maxY < 0.116 || minY > 0.118);
  const filter = BL.sightGuides.create({ segmentClear: clear, objectClear: objects.cameraClear, actorClear: objects.clear, ownerBoundary: objects.ownerBoundaryAt, ownerPerceived: objects.perceived, ownerConcealed: objects.concealed, ownerClear: objects.ownerClear, ownerDistance: objects.distance, ownerInView: objects.inView, getProvider: objects.getProvider });
  const structure = { count: 1, lines: new Float32Array([3, 1.5, 1, 3.5, 1.5, 1]) }, rows = [];
  try {
    for (const fixture of [{ name: "fully visible actor", edge: 1 }, { name: "partially visible actor", edge: -0.1 }, { name: "two millimetre slit", edge: -2, sliver: true }, { name: "hidden actor", edge: -2 }, { name: "uncertified occlusion", edge: -2, uncertified: true }, { name: "first person gate", edge: -2, first: true }, { name: "reopened", edge: -2 }]) {
      edge = fixture.edge; sliver = !!fixture.sliver; clear.boxSolid = fixture.uncertified ? null : boxSolid; objects.result.occlusionVersion++;
      const source = objects.collect(actor, 0, 0, 0, camera, 1.6), fullyVisible = objects.actorFullyVisible(actor, clear), anyVisible = objects.actorVisible(actor, clear), enabled = !fixture.first && !anyVisible;
      const state = filter.update(actor, structure, source, camera, 1.6, 0.3, enabled);
      let visibleActorSamples = 0, hiddenActorSamples = 0;
      for (let y = -1; y <= 1; y += 0.25) for (let x = -0.5; x <= 0.5; x += 0.125) {
        if (clear(0, 0, -12, x, y, -0.5)) visibleActorSamples++; else hiddenActorSamples++;
      }
      rows.push({ name: fixture.name, fullyVisible, anyVisible, enabled: state.objectsEnabled, count: state.count, objects: state.objectCount, structures: state.structureCount, providers: state.providerCount, perceived: objects.perceived(owner, actor, 0, 0, 0, clear), concealed: objects.concealed(owner, actor, clear), visibleActorSamples, hiddenActorSamples, sliverWitness: sliver && clear(0, 0, -12, 0.073 * 11.5 / 6, 0.117 * 11.5 / 6, -0.5) });
    }
  } finally { filter.dispose(); objects.dispose(); }
  // A grounded body can straddle the oblique camera near plane while a solid
  // floor still covers every visible ray. A real 2 mm slot through that floor
  // must instead keep the gate off, including between cached mesh witnesses.
  const grounded = { root: S.createNode({ geometry: BL.models.box({ w: 0.6, h: 1.3, d: 0.6, color: "#ffffff" }), position: { x: 0, y: 0.65, z: 0 } }) };
  const floorRoot = S.createNode(); S.addChild(floorRoot, grounded.root); S.updateWorld(floorRoot);
  const floorObjects = BL.objectGuides.create({ roots: [grounded.root], crew: { cavemen: new Map([["grounded", grounded]]) } });
  Object.assign(camera.position, { x: 0, y: -0.4, z: 0 }); Object.assign(camera.target, { x: 2, y: 1, z: 0 });
  let floorSlot = false;
  const floorClear = (ax, ay, az, bx, by, bz) => {
    if (Math.min(ay, by) >= 0) return true;
    if (!floorSlot) return false;
    const crossing = -ay / (by - ay), from = ay < 0 ? 0 : crossing, to = by < 0 ? 1 : crossing;
    const za = az + (bz - az) * from, zb = az + (bz - az) * to;
    return Math.min(za, zb) > -0.001 && Math.max(za, zb) < 0.001;
  };
  floorClear.boxSolid = (minX, minY, minZ, maxX, maxY, maxZ) => maxY < 0 && (!floorSlot || maxZ < -0.001 || minZ > 0.001);
  const floorFilter = BL.sightGuides.create({ segmentClear: floorClear, objectClear: floorObjects.cameraClear, actorClear: floorObjects.clear });
  const floorStructure = { count: 1, lines: new Float32Array([2, 1, -0.2, 2, 1, 0.2]) }, underfloor = [];
  try {
    for (const slot of [false, true]) {
      floorSlot = slot;
      const terrainClear = (...p) => floorClear(...p); terrainClear.boxSolid = floorClear.boxSolid;
      const source = floorObjects.collect(grounded, 0, 0.65, 0, camera, 1.6), anyVisible = floorObjects.actorVisible(grounded, terrainClear);
      const state = floorFilter.update(grounded, floorStructure, source, camera, 1.6, 0.3, !anyVisible);
      const forward = [2 / Math.hypot(2, 1.4), 1.4 / Math.hypot(2, 1.4), 0];
      const minimumDepth = -0.3 * forward[0] + 0.4 * forward[1], maximumDepth = 0.3 * forward[0] + 1.7 * forward[1];
      underfloor.push({ slot, anyVisible, enabled: state.objectsEnabled, count: state.count, structures: state.structureCount, objects: state.objectCount, providers: state.providerCount, witnessClear: floorClear(0, -0.4, 0, 0.2, 0, 0), minimumDepth, maximumDepth, near: camera.near });
    }
  } finally { floorFilter.dispose(); floorObjects.dispose(); }
  return { rows, underfloor };
};

export const grassOutlineProbe = () => {
  const B = window.__ooga, BL = window.BL, S = BL.scene, scene = BL.scenes.hub, geometry = BL.hubModels.grass(), grass = [];
  S.traverseVisible(scene.root, (node) => { if (node.geometry === geometry) grass.push(node); });
  if (!grass.length) throw new Error("No actual meadow grass fixture");
  const p = grass[0].position, actor = { root: { position: { x: p.x, y: p.y + 0.2, z: p.z } } };
  const control = S.createNode({ geometry: BL.models.box({ w: 0.6, h: 0.6, d: 0.6, color: "#ffffff" }), position: { x: p.x + 1, y: p.y + 0.4, z: p.z } });
  S.addChild(scene.root, control); S.updateWorld(scene.root);
  const objects = BL.objectGuides.create({ roots: [...grass, control], crew: { cavemen: new Map() } }), camera = S.createCamera({ fov: 90, near: 0.1, far: 100 });
  const empty = { count: 0, lines: new Float32Array(0) }, members = new Set(grass), rows = [];
  const clear = (ax, ay, az, bx, by, bz) => !((az < p.z - 2 && bz > p.z - 2) || (az > p.z - 2 && bz < p.z - 2));
  const filter = BL.sightGuides.create({ segmentClear: clear, objectClear: objects.cameraClear, actorClear: objects.clear, ownerBoundary: objects.ownerBoundaryAt, ownerPerceived: objects.perceived, ownerConcealed: objects.concealed, ownerClear: objects.ownerClear, ownerDistance: objects.distance, ownerInView: objects.inView, getProvider: objects.getProvider });
  try {
    for (const x of [-1, 0, 1]) {
      Object.assign(camera.position, { x: p.x + x, y: p.y + 1, z: p.z - 6 }); Object.assign(camera.target, { x: p.x, y: p.y + 0.2, z: p.z });
      const source = objects.collect(actor, p.x, p.y + 0.2, p.z, camera, 1.6), state = filter.update(actor, empty, source, camera, 1.6, 0.3);
      let controlLines = 0, grassLines = 0;
      for (let n = 0; n < state.count; n++) { const owner = source.owners[state.sources[n]]; if (owner === control) controlLines++; if (members.has(owner)) grassLines++; }
      const production = B.headquarters.objectGuides.collect(actor, p.x, p.y + 0.2, p.z, camera, 1.6);
      rows.push({ registered: objects.stats.registered, nearby: source.nearCount, controlLines, grassLines, grassSources: source.owners.slice(0, source.count).some((owner) => members.has(owner)), grassNearby: source.nearOwners.slice(0, source.nearCount).some((owner) => members.has(owner)), productionSources: production.owners.slice(0, production.count).some((owner) => members.has(owner)), productionNearby: production.nearOwners.slice(0, production.nearCount).some((owner) => members.has(owner)) });
    }
    return { grass: grass.length, rendered: grass.every((node) => node.visible && node.geometry === geometry && node.geometry.faces.length > 0), excluded: grass.every((node) => node.sightHidden), rows };
  } finally { filter.dispose(); objects.dispose(); S.removeChild(scene.root, control); }
};

export const pileGuideProbe = () => {
  const B = window.__ooga, BL = window.BL, S = BL.scene, H = B.headquarters, provider = H.pileGuides, objects = H.objectGuides;
  const canvas = document.createElement("canvas"), mask = document.createElement("canvas"), width = 256, height = 192;
  canvas.width = mask.width = width; canvas.height = mask.height = height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true }), maskCtx = mask.getContext("2d", { willReadFrequently: true });
  const camera = S.createCamera({ fov: 48, near: 0.1, far: 500 }), view = BL.math.mat4.create(), up = { x: 0, y: 1, z: 0 }, focal = height / 2 / Math.tan(camera.fov / 2);
  const actor = { root: { position: { x: 0, y: 1, z: 0 } } }, oldLevel = B.level, rows = [], failures = [];
  const originalNodes = objects.stats.registered, originalCapacity = objects.result.capacity, bytes = provider.state.buffers;
  const draw = () => {
    ctx.clearRect(0, 0, width, height); provider.draw(camera, ctx, 1, width, height);
    return ctx.getImageData(0, 0, width, height).data;
  };
  // Independent projected face union: no provider bounds, triangle classifier,
  // certainty grid, contour candidates or simplified pile shape is consulted.
  const paint = (node, matrix = node.world, offset = 0) => {
    const g = node.geometry, vertices = new Float64Array(g.verts.length / 3 * 2);
    for (let n = 0; n < g.verts.length; n += 3) {
      const x = g.verts[n], y = g.verts[n + 1], z = g.verts[n + 2];
      const wx = matrix[offset] * x + matrix[offset + 4] * y + matrix[offset + 8] * z + matrix[offset + 12], wy = matrix[offset + 1] * x + matrix[offset + 5] * y + matrix[offset + 9] * z + matrix[offset + 13], wz = matrix[offset + 2] * x + matrix[offset + 6] * y + matrix[offset + 10] * z + matrix[offset + 14];
      const vx = view[0] * wx + view[4] * wy + view[8] * wz + view[12], vy = view[1] * wx + view[5] * wy + view[9] * wz + view[13], depth = -(view[2] * wx + view[6] * wy + view[10] * wz + view[14]);
      if (depth <= camera.near) throw new Error("Pile mask fixture crosses its near plane");
      vertices[n / 3 * 2] = width / 2 + vx * focal / depth; vertices[n / 3 * 2 + 1] = height / 2 - vy * focal / depth;
    }
    for (const face of g.faces) {
      maskCtx.beginPath();
      for (let n = 0; n < face.i.length; n++) { const i = face.i[n] * 2; if (n) maskCtx.lineTo(vertices[i], vertices[i + 1]); else maskCtx.moveTo(vertices[i], vertices[i + 1]); }
      maskCtx.closePath(); maskCtx.fill();
    }
  };
  const reference = () => {
    maskCtx.clearRect(0, 0, width, height); maskCtx.fillStyle = "#ffffff";
    BL.math.mat4.lookAt(view, camera.position, camera.target, up);
    for (const node of [B.altar.slab, B.core, ...B.slots.filter((slot) => !slot.moving).map((slot) => slot.node)]) if (node.visible) paint(node);
    for (const node of [B.shell, ...B.altar.rings]) if (node.visible) for (let n = 0; n < node.instanceCount; n++) paint(node, node.instanceData, n * 20);
    return maskCtx.getImageData(0, 0, width, height).data;
  };
  try {
    for (const level of [0, 1, 302, 303, 1000, BL.pile.MAX_BANANAS]) {
      B.setPileLevel(level); S.updateWorld(BL.scenes.hub.root); const active = provider.active();
      const span = Math.max(3, B.altar.platformRadius), top = B.core.visible ? B.core.position.y + S.boundsOf(B.core.geometry).max[1] * B.core.scale.y + 0.2 : 1;
      Object.assign(camera.position, { x: span * 1.65, y: top + span * 0.85, z: span * 2.6 }); Object.assign(camera.target, { x: 0, y: top * 0.35, z: 0 });
      Object.assign(actor.root.position, { x: span + 1, y: 1, z: 0 });
      const source = objects.collect(actor, actor.root.position.x, 1, 0, camera, width / height), nearby = source.nearOwners.slice(0, source.nearCount);
      const pixels = draw(), updates = provider.state.updates, repeat = draw();
      let changed = 0, outline = 0, maximumAlpha = 0, fingerprint = 2166136261;
      for (let n = 3; n < pixels.length; n += 4) { if (pixels[n]) outline++; maximumAlpha = Math.max(maximumAlpha, pixels[n]); if (pixels[n] !== repeat[n]) changed++; fingerprint = Math.imul(fingerprint ^ pixels[n], 16777619); }
      let referencePixels = null, interior = 0, seams = 0, distant = 0;
      if (level !== BL.pile.MAX_BANANAS || B.renderer.kind === "canvas2d") {
        const actual = reference(); referencePixels = 0;
        for (let y = 3; y < height - 3; y++) for (let x = 3; x < width - 3; x++) {
          const at = (y * width + x) * 4 + 3; if (actual[at] > 250) referencePixels++;
          let filled = true, near = false;
          for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) { const alpha = actual[((y + dy) * width + x + dx) * 4 + 3]; filled = filled && alpha > 250; near = near || alpha > 0; }
          if (filled) { interior++; if (pixels[at]) seams++; }
          if (pixels[at] && !near) distant++;
        }
      }
      const expectedInstances = [B.shell, ...B.altar.rings].reduce((sum, node) => sum + (node.visible ? node.instanceCount : 0), 0);
      const own = new Set(provider.roots), singleOwner = nearby.filter((node) => own.has(node)).length === 1 && nearby.includes(provider.owner) && !source.owners.slice(0, source.count).some((node) => own.has(node));
      rows.push({ level, active, singleOwner, provider: objects.getProvider(provider.owner) === provider, instances: provider.state.instances, expectedInstances, shell: B.shell.instanceCount, considered: provider.state.considered, contained: provider.state.contained, outside: provider.state.outside, buffers: provider.state.buffers, registered: objects.stats.registered, capacity: source.capacity, outline, maximumAlpha, fingerprint, cached: provider.state.updates === updates && changed === 0, referencePixels, interior, seams, distant });
      if ((!active || !singleOwner || seams || distant) && failures.length < 10) failures.push({ level, active, singleOwner, seams, distant });
    }
    // Delivery bananas are flying objects, not part of the resting pile union.
    const drop = B.drops[0], saved = { visible: drop.node.visible, position: { ...drop.node.position } }, before = draw();
    drop.node.visible = true; Object.assign(drop.node.position, { x: 0, y: camera.target.y + 10, z: 0 }); S.updateWorld(BL.scenes.hub.root); provider.active();
    const after = draw(); let dropChanged = 0;
    for (let n = 0; n < before.length; n++) if (before[n] !== after[n]) dropChanged++;
    drop.node.visible = saved.visible; Object.assign(drop.node.position, saved.position);
    return { rows, originalNodes, originalCapacity, bytes, dropChanged, failures };
  } finally { B.setPileLevel(oldLevel); S.updateWorld(BL.scenes.hub.root); provider.active(); }
};
