// Conservative acceleration must preserve openings, moving blockers and the
// renderer's near plane while avoiding per-witness terrain rays for solid cover.
export const objectVisibilityPerformanceProbe = () => {
  const B = window.BL, S = B.scene, root = S.createNode(), actor = { root: S.createNode({ position: { x: 0, y: 1, z: 2 } }) };
  const target = S.createNode({ geometry: B.models.box({ w: 4, h: 4, d: 2, color: "#ffffff" }), position: { x: 0, y: 1, z: 4 } });
  const blocker = S.createNode({ geometry: B.models.box({ w: 0.2, h: 0.2, d: 0.2, color: "#ffffff" }), position: { x: 0, y: 1, z: 1 }, visible: false });
  S.addChild(root, actor.root, target, blocker);
  const roots = [target, blocker], objects = B.objectGuides.create({ roots, crew: { cavemen: new Map() } });
  const camera = S.createCamera({ fov: 80, near: 0.1, far: 100 });
  Object.assign(camera.position, { x: 0, y: 1, z: -6 }); Object.assign(camera.target, target.position);
  const rows = [], failures = [];
  let open = false, rays = 0;
  const clear = (ax, ay, az, bx, by, bz) => {
    rays++;
    if (Math.max(az, bz) < -0.2 || Math.min(az, bz) > 0.2) return true;
    if (!open || Math.abs(bz - az) < 1e-12) return false;
    for (const plane of [-0.2, 0.2]) {
      const t = Math.max(0, Math.min(1, (plane - az) / (bz - az)));
      if (Math.abs(ax + (bx - ax) * t) >= 0.001 || Math.abs(ay + (by - ay) * t - 1) >= 0.001) return false;
    }
    return true;
  };
  clear.boxSolid = (ax, ay, az, bx, by, bz) => az >= -0.2 && bz <= 0.2
    && (!open || ax >= 0.001 || bx <= -0.001 || ay >= 1.001 || by <= 0.999);
  clear.boxClear = (ax, ay, az, bx, by, bz) => bz < -0.2 || az > 0.2;
  clear.boxGrid = new Float64Array([0.25, -8, -8, -8]);
  const sample = (name, expected) => {
    S.updateWorld(root);
    const p = actor.root.position;
    objects.collect(actor, p.x, p.y, p.z, camera, 1.6);
    const before = rays, hidden = objects.concealed(target, actor, clear);
    const row = { name, expected, hidden, rays: rays - before, certificates: objects.stats.cameraCertificates, witnessHits: objects.stats.cameraWitnessHits };
    rows.push(row);
    if (hidden !== expected) failures.push(row);
    return row;
  };
  let efficient = false, witnessReused = false, disposed = false;
  try {
    const covered = sample("solid wall", true);
    efficient = covered.certificates > 0 && covered.rays < 8 && objects.stats.samples > 1000;
    open = true; sample("two millimetre opening", false);
    const before = objects.stats.cameraWitnessHits;
    const cached = sample("same visible surface", false);
    witnessReused = cached.witnessHits > before && cached.rays <= 2;
    blocker.visible = true; sample("moving prop blocks cached witness", true);
    blocker.visible = false; sample("prop moves away", false);
    target.position.x = 3; sample("target moves behind stone", true);
    target.position.x = 0;
    target.geometry = B.models.box({ w: 0.6, h: 0.8, d: 0.4, color: "#ffffff" });
    objects.register(target); sample("replacement geometry visible through opening", false);
    open = false; sample("opening closes", true);
    camera.position.z = -0.1; camera.near = 0.5;
    sample("rock behind near plane", false);
    camera.position.z = -6; camera.near = 0.1;
    target.rotation.y = 0.47; Object.assign(target.scale, { x: 0.8, y: 1.3, z: 0.6 });
    sample("transformed target behind stone", true);
    roots.splice(roots.indexOf(target), 1); S.removeChild(root, target);
    objects.refresh(); sample("owner removed", false);
  } finally {
    objects.dispose();
    disposed = objects.stats.registered === 0 && objects.result.count === 0 && objects.result.nearCount === 0;
  }
  return { rows, failures, efficient, witnessReused, disposed };
};
