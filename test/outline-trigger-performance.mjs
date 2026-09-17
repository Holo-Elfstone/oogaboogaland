// Decorative cover must not activate the expensive hidden-character guides.
// Use real model faces and the live hub registry so this also checks scene wiring.
export const outlineTriggerPolicyProbe = () => {
  const BL = window.BL, B = window.__ooga, S = BL.scene, scene = BL.scenes.hub, production = B.headquarters.objectGuides;
  const actor = { root: S.createNode({ geometry: BL.models.box({ w: 0.025, h: 0.025, d: 0.025, color: "#ffffff" }) }) };
  const camera = S.createCamera({ near: 0.01, far: 100 }), rows = [], failures = [];
  const empty = () => true;
  let certificates = 0;
  empty.boxSolid = () => { certificates++; return false; };
  empty.boxClear = () => true;
  const faceView = (geometry) => {
    const v = geometry.verts;
    let best = null;
    for (const face of geometry.faces) {
      if (face.i.length < 3) continue;
      const a = face.i[0] * 3, b = face.i[1] * 3, c = face.i[2] * 3;
      const ux = v[b] - v[a], uy = v[b + 1] - v[a + 1], uz = v[b + 2] - v[a + 2], vx = v[c] - v[a], vy = v[c + 1] - v[a + 1], vz = v[c + 2] - v[a + 2];
      const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx, area = Math.hypot(nx, ny, nz);
      if (area < 0.01 || Math.abs(ny) > area * 0.9 || best && area <= best.area) continue;
      const center = [0, 0, 0];
      for (const index of face.i) for (let axis = 0; axis < 3; axis++) center[axis] += v[index * 3 + axis] / face.i.length;
      best = { area, center, normal: [nx / area, ny / area, nz / area] };
    }
    if (!best) throw new Error("Missing solid model face for outline trigger fixture");
    return best;
  };
  S.addChild(scene.root, actor.root); production.register(actor.root);
  try {
    const stoneNodes = { borders: 0, seals: 0, entrances: 0 };
    S.traverseVisible(scene.root, (node) => {
      const kind = node.geometry?.openingBounds ? "borders" : node.geometry?.sealBounds ? "seals" : B.headquarters.entrances.some((entry) => entry.node === node) ? "entrances" : null;
      if (!kind) return;
      stoneNodes[kind]++;
      if (!node.sightSolid) failures.push({ kind: "production stone missing structural occlusion", type: kind });
    });
    if (!stoneNodes.borders || stoneNodes.seals !== 3 || !stoneNodes.entrances) failures.push({ kind: "missing production stone fixtures", ...stoneNodes });
    for (const [name, geometry, structural = false] of [["tree", BL.hubModels.tree(0)], ["cloud", BL.hubModels.cloud(0)], ["mirror", BL.hubModels.mirrorPanel()], ["stone cave border", BL.hubModels.caveMouthRim(), true], ["sealed cave wall", BL.hubModels.sealedCaveFace(0), true], ["room entrance", BL.headquartersModels.roomEntrance(0), true]]) {
      const prop = S.createNode({ geometry, position: { x: 200, y: 200, z: 200 } }), view = faceView(geometry), c = view.center, n = view.normal;
      prop.sightSolid = structural;
      if (name === "mirror") prop.mirror = true;
      S.addChild(scene.root, prop); production.register(prop);
      const legacy = BL.objectGuides.create({ roots: [actor.root, prop], crew: { cavemen: new Map() } });
      const local = BL.objectGuides.create({ roots: [actor.root, prop], crew: { cavemen: new Map() }, propsBlockActor: false });
      try {
        Object.assign(actor.root.position, { x: 200 + c[0] - n[0] * 0.2, y: 200 + c[1] - n[1] * 0.2, z: 200 + c[2] - n[2] * 0.2 });
        Object.assign(camera.target, actor.root.position);
        const samples = [];
        for (const shift of [-0.02, 0, 0.02, 0, -0.02]) {
          Object.assign(camera.position, { x: 200 + c[0] + n[0] * 2 + n[2] * shift, y: 200 + c[1] + n[1] * 2, z: 200 + c[2] + n[2] * 2 - n[0] * shift });
          S.updateWorld(scene.root);
          const values = [];
          for (const objects of [legacy, local, production]) {
            const p = actor.root.position, source = objects.collect(actor, p.x, p.y, p.z, camera, 1.6);
            values.push({ visible: objects.actorVisible(actor, empty), registered: source.nearOwners.slice(0, source.nearCount).includes(prop) });
          }
          samples.push({ legacy: values[0], local: values[1], production: values[2] });
        }
        // Moving props still affect individual hidden object pixels, but
        // must not retrace stationary actor/rock certificates on every frame.
        const before = certificates, version = local.result.occlusionVersion;
        for (let frame = 0; frame < 12; frame++) {
          prop.position.x += 0.001; S.updateWorld(scene.root);
          const p = actor.root.position;
          local.collect(actor, p.x, p.y, p.z, camera, 1.6); local.actorVisible(actor, empty);
        }
        const row = { name, structural, samples, movingQueries: certificates - before, propVersionChanged: local.result.occlusionVersion > version };
        if (structural) {
          row.changes = [];
          const position = { ...prop.position };
          for (const phase of ["hidden", "restored", "moved", "returned"]) {
            prop.visible = phase !== "hidden";
            Object.assign(prop.position, position);
            if (phase === "moved") { prop.position.x += n[2] * 30; prop.position.z -= n[0] * 30; }
            S.updateWorld(scene.root);
            const views = [];
            for (const objects of [local, production]) {
              const p = actor.root.position;
              objects.collect(actor, p.x, p.y, p.z, camera, 1.6);
              views.push(objects.actorVisible(actor, empty));
            }
            const expected = phase === "hidden" || phase === "moved";
            row.changes.push({ phase, views, expected });
            if (views.some((visible) => visible !== expected)) failures.push({ kind: "structural visibility cache is stale", name, phase, views, expected });
          }
        }
        rows.push(row);
        if (samples.some((sample) => sample.legacy.visible || sample.local.visible === structural || sample.production.visible === structural || !sample.local.registered || !sample.production.registered)) failures.push({ kind: "decorative and structural occlusion policy", ...row });
        if ((!structural && row.movingQueries) || !row.propVersionChanged) failures.push({ kind: "moving prop invalidated actor visibility", ...row });
      } finally { legacy.dispose(); local.dispose(); S.removeChild(scene.root, prop); }
    }
    const structures = [];
    for (const axis of [0, 1, 2]) {
      // A continuous wall/floor/ceiling slab still enables the actor outline,
      // including when the camera is on the opposite side of the slab.
      for (const sign of [-1, 1]) {
        Object.assign(actor.root.position, { x: 200, y: 200, z: 200 }); actor.root.position[["x", "y", "z"][axis]] += sign * 2;
        Object.assign(camera.position, { x: 200, y: 200, z: 200 }); camera.position[["x", "y", "z"][axis]] -= sign * 2;
        camera.position.x += axis === 1 ? 0.2 : 0; Object.assign(camera.target, actor.root.position);
        const slab = () => false;
        slab.boxSolid = (x, y, z, xx, yy, zz) => [x, y, z][axis] >= 199.5 && [xx, yy, zz][axis] <= 200.5;
        S.updateWorld(scene.root);
        const p = actor.root.position;
        production.collect(actor, p.x, p.y, p.z, camera, 1.6);
        const visible = production.actorVisible(actor, slab);
        structures.push({ axis, sign, visible });
        if (visible) failures.push({ kind: "rock slab no longer activates outlines", axis, sign });
      }
    }
    return { rows, structures, stoneNodes, failures };
  } finally { S.removeChild(scene.root, actor.root); production.refresh(); }
};
