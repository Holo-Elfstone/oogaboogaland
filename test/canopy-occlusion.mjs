// A close canopy must not cause a surface-by-surface search of a large object.
// Coverage is proved from the actual faces, preserving holes and near clipping.
export const canopyCertificateProbe = () => {
  const BL = window.BL, S = BL.scene, root = S.createNode(), actor = { root: S.createNode() };
  const box = (w, h, d) => BL.models.box({ w, h, d, color: "#ffffff" });
  const target = S.createNode({ geometry: box(8, 8, 2), position: { x: 0, y: 0, z: 24 } });
  const cover = S.createNode({ geometry: box(4, 4, 0.4), position: { x: 0, y: 0, z: 2 } });
  const left = S.createNode({ geometry: box(2, 4, 0.4), position: { x: -1.001, y: 0, z: 2 }, visible: false });
  const right = S.createNode({ geometry: left.geometry, position: { x: 1.001, y: 0, z: 2 }, visible: false });
  S.addChild(root, target, cover, left, right, actor.root);
  const objects = BL.objectGuides.create({ roots: [target, cover, left, right], crew: { cavemen: new Map() }, propsBlockActor: false });
  const camera = S.createCamera({ near: 0.1, far: 100 });
  Object.assign(camera.position, { x: 0, y: 0, z: 0 }); Object.assign(camera.target, target.position);
  let rays = 0;
  const clear = () => { rays++; return true; };
  clear.boxClear = () => true; clear.boxSolid = () => false;
  const rows = [], failures = [];
  const sample = (name, expected, efficient = false) => {
    S.updateWorld(root); objects.collect(actor, 0, 0, 24, camera, 1.6);
    rays = 0;
    const before = objects.stats.cameraCertificates, hidden = objects.concealed(target, actor, clear);
    const row = { name, hidden, rays, certificates: objects.stats.cameraCertificates - before };
    rows.push(row);
    if (hidden !== expected || efficient && (rays > 2 || row.certificates < 1)) failures.push(row);
  };
  try {
    sample("nearby solid canopy covers the full target", true, true);
    camera.position.x = 0.05; sample("small camera pan", true, true);
    camera.position.x = 0;
    cover.visible = false; left.visible = right.visible = true;
    sample("two millimetre opening remains visible", false);
    left.visible = right.visible = false; cover.visible = true;
    cover.position.x = 2; sample("uncovered target edge", false);
    cover.position.x = 0; camera.near = 3;
    sample("canopy clipped behind near plane", false);
    camera.near = 0.1;
    cover.geometry = { ...cover.geometry, clipMinY: 0.1 }; objects.register(cover);
    sample("moving gate cut does not count as coverage", false);
    cover.geometry = box(4, 4, 0.4); objects.register(cover);
    cover.rotation.y = 0.2; Object.assign(cover.scale, { x: 1.1, y: 1.2, z: 0.8 });
    sample("rotated nonuniform canopy", true, true);
    cover.rotation.y = 0; Object.assign(cover.scale, { x: 1, y: 1, z: 1 });
    cover.geometry = box(4, 4, 4); cover.position.z = 0; objects.register(cover);
    sample("camera inside canopy", true, true);
    cover.visible = false; sample("canopy moves away without a stale certificate", false);
  } finally { objects.dispose(); }
  return { rows, failures, disposed: objects.stats.registered === 0 };
};

export const canopyPileProbe = () => {
  const B = window.__ooga, S = window.BL.scenes.hub, H = B.headquarters;
  const actor = [...B.cavemen.values()].find((c) => c.state === "working");
  const provider = H.objectGuides.getProvider(B.core), update = S.update, clear = B.island.sightClearAt;
  const rows = [], failures = [], cases = [[0, 1, -26.08493723861947, 8.15, 12.811184468393678], [1, 0, 28.044528645827203, 8.9, -1.8912998152277658], [0, -1, 13.15289368298812, 9.4, -25.122891324817388]];
  let rays = 0;
  B.pilot.possess(actor); S.update = () => {};
  B.island.sightClearAt = (...args) => { rays++; return clear(...args); };
  try {
    const radius = B.altar.platformRadius + 1.5;
    for (let index = 0; index < cases.length; index++) {
      const point = cases[index], x = point[0] * radius, z = point[1] * radius;
      Object.assign(actor.root.position, { x, y: B.island.surfaceAt(x, z) + actor.baseY, z });
      window.BL.scene.updateWorld(S.root);
      Object.assign(B.camera.target, { x, y: actor.root.position.y + 0.7, z });
      for (const pan of [0, -0.05, 0.05, -0.1, 0.1]) {
        Object.assign(B.camera.position, { x: point[2] + pan, y: point[3], z: point[4] });
        rays = 0;
        const start = performance.now(); S.overlay(0.3);
        const row = { index, pan, ms: performance.now() - start, rays, samples: provider.state.visibilitySamples, instances: provider.state.instances, considered: provider.state.considered, enabled: H.sightGuides.objectsEnabled, outlines: H.sightGuides.objectCount };
        rows.push(row);
        if (!row.enabled || !row.outlines || row.samples || row.instances || row.considered || row.rays > 10000) failures.push(row);
      }
    }
  } finally { B.island.sightClearAt = clear; S.update = update; }
  return { rows, failures, fruitInstances: B.shell.instanceCount };
};
