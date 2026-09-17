// Measure rendered foliage independently of the placement metadata, then walk
// the tallest real Ooga beneath it using the hub's production controller.
export const treeClearanceProbe = ({ dt = 1 / 60 } = {}) => {
  const B = window.__ooga, BL = window.BL, S = BL.scene, scene = BL.scenes.hub, crew = B.crew, island = B.island;
  const props = B.headquarters.solids.props, actors = [...B.cavemen.values()], cave = actors.reduce((a, b) => a.bodyHeight > b.bodyHeight ? a : b);
  const trees = B.props.filter((owner) => owner.scenery && owner.prop === "tree"), saved = actors.map((actor) => ({ actor, visible: actor.root.visible, override: actor.override }));
  const radius = 0.3, unit = island.unit, shape = (geometry) => {
    const v = geometry.verts, bark = (c) => c[0] === 107 && c[1] === 74 && c[2] === 43 || c[0] === 78 && c[1] === 54 && c[2] === 31;
    let bottom = Infinity, top = -Infinity, canopy = Infinity, reach = 0, root = 0, leaves = 0;
    for (let i = 0; i < v.length; i += 3) { bottom = Math.min(bottom, v[i + 1]); top = Math.max(top, v[i + 1]); reach = Math.max(reach, Math.hypot(v[i], v[i + 2])); }
    for (let i = 0; i < v.length; i += 3) if (v[i + 1] === bottom) root = Math.max(root, Math.hypot(v[i], v[i + 2]));
    for (const face of geometry.faces) if (!bark(face.color)) {
      leaves++;
      for (const i of face.i) canopy = Math.min(canopy, v[i * 3 + 1]);
    }
    return { bottom, top, canopy, reach, root, leaves };
  };
  const variants = [0, 1, 2, 3].map((i) => ({ variant: i, ...shape(BL.hubModels.tree(i)) }));
  S.updateWorld(scene.root); props.sync();
  let samples = 0;
  const placements = trees.map((owner) => {
    const node = owner.node, geometry = node.geometry.matrixSourceGeometry || node.geometry, model = shape(geometry);
    const x = node.world[12], y = node.world[13], z = node.world[14], reach = model.reach + radius;
    let roof = -Infinity, rootRoof = -Infinity;
    // Every intersected terrain cell, including cells whose centers lie just
    // beyond the circle, matters to a round character standing under a leaf.
    for (let ix = Math.floor((x - reach) / unit); ix <= Math.floor((x + reach) / unit); ix++) {
      const cx = (ix + 0.5) * unit, dx = Math.max(0, Math.abs(cx - x) - unit / 2);
      for (let iz = Math.floor((z - reach) / unit); iz <= Math.floor((z + reach) / unit); iz++) {
        const cz = (iz + 0.5) * unit, dz = Math.max(0, Math.abs(cz - z) - unit / 2), distance2 = dx * dx + dz * dz;
        if (distance2 > reach * reach) continue;
        const terrain = island.surfaceAt(cx, cz); samples++;
        roof = Math.max(roof, terrain);
        if (distance2 <= model.root * model.root) rootRoof = Math.max(rootRoof, terrain);
      }
    }
    return { active: owner.active, visible: node.visible, x, z, yaw: node.rotation.y,
      anchored: Math.abs(y + model.bottom - island.surfaceAt(x, z)) < 1e-6,
      rootBuried: rootRoof > y + model.bottom + 1e-6,
      headroom: y + model.canopy - roof, uphill: roof - y };
  });
  const fixture = S.createNode(), floor = 12.1;
  const slab = S.createNode({ position: { x: 0, y: 12, z: 0 }, geometry: BL.models.box({ w: 10, h: 0.2, d: 10, color: "#665544" }) });
  const tree = S.createNode({ position: { x: 0, y: floor, z: 0 }, geometry: BL.hubModels.tree(0) });
  S.addChild(fixture, slab, tree); S.addChild(scene.root, fixture); props.add(fixture);
  const isolated = BL.solidProps.create(), rows = [], rejectedThreats = [];
  const describeThreat = (node) => {
    const owner = B.props.find((entry) => { for (let p = node; p; p = p.parent) if (p === entry.node) return true; return false; });
    return { prop: owner?.prop || "architecture", x: node.world[12], y: node.world[13], z: node.world[14] };
  };
  let time = B.renderOpts.matrix.time;
  const sync = () => { S.updateWorld(scene.root); props.sync(); isolated.sync(); };
  const place = (x, y, z, heading) => {
    crew.steer(0, 0); B.pilot.release(true);
    cave.root.visible = true; cave.root.quaternion = null;
    Object.assign(cave.root.position, { x, y: y + cave.baseY, z });
    Object.assign(cave.root.rotation, { x: 0, y: heading, z: 0 }); Object.assign(cave.root.scale, { x: 1, y: 1, z: 1 });
    cave.state = "working"; cave.bedTravel.mode = ""; cave.bedTravel.route = null; cave.walk = cave.build = null;
    cave.hop = cave.hopV = cave.jumps = cave.cheer = cave.catchT = cave.yawn = cave.viewLift = 0;
    cave.leap.vx = cave.leap.vz = cave.leap.land = 0; cave.cloudSupport = null; cave.riding.support = null;
    cave.act.kind = "idle"; cave.act.until = cave.nextBuildAt = cave.yawnAt = Infinity;
    cave.avoidance.active = false; cave.avoidance.navigation.mode = 0; cave.avoidance.tx = cave.pathing.tx = NaN;
    Object.assign(cave.shoulder, { phase: 0, other: null, yaw: 0, targetYaw: 0, motionX: 0, motionZ: 0, snapVX: 0, snapVZ: 0 });
    for (const node of cave.root.children) node.poseYaw = 0;
    crew.removeJetpack(cave); sync(); B.pilot.possess(cave); crew.look(heading, 0, 1);
  };
  const walk = (line, label) => {
    const { x, y, z, fx, fz, length } = line, speed = BL.pilot.WALK.speed * 0.25;
    place(x, y, z, Math.atan2(fx, fz)); crew.steer(fx * 0.25, fz * 0.25, 1, 0.25, 0);
    const row = { name: label, clear: true, lateral: 0, minimumFeet: Infinity, maximumFeet: -Infinity, underCanopy: 0, peakTwist: 0, contacts: [] }, contacts = new Set();
    for (let i = 0; i < Math.ceil(length / speed / dt); i++) {
      crew.update(dt, time += dt); sync();
      const p = cave.root.position, feet = p.y - cave.baseY;
      row.clear &&= island.clearAt(p.x, feet + 1e-5, p.z, radius - 1e-5, cave.bodyHeight - 1e-5)
        && props.clearAt(p.x, feet + 1e-5, p.z, radius - 1e-5, cave.bodyHeight - 1e-5);
      row.lateral = Math.max(row.lateral, Math.abs((p.x - x) * fz - (p.z - z) * fx));
      row.minimumFeet = Math.min(row.minimumFeet, feet); row.maximumFeet = Math.max(row.maximumFeet, feet);
      row.peakTwist = Math.max(row.peakTwist, Math.abs(cave.shoulder.yaw));
      const obstacle = cave.shoulder.phase === 1 && cave.shoulder.prop && cave.shoulder.obstacle.node;
      if (obstacle && !contacts.has(obstacle) && row.contacts.length < 3) { contacts.add(obstacle); row.contacts.push(describeThreat(obstacle)); }
      if (Number.isFinite(isolated.ceilingAt(p.x, p.z, feet + 0.1, radius))) row.underCanopy++;
    }
    crew.steer(0, 0);
    row.progress = (cave.root.position.x - x) * fx + (cave.root.position.z - z) * fz;
    row.length = length; rows.push(row);
  };
  try {
    B.pilot.release(true);
    for (const actor of actors) actor.override = "working";
    crew.refreshStates(true);
    for (const actor of actors) actor.root.visible = false;
    for (const variant of variants) {
      tree.geometry = BL.hubModels.tree(variant.variant); tree.rotation.y = variant.variant * 0.37;
      // Geometry registry entries keep their triangles; re-register each mesh.
      props.remove(fixture); props.add(fixture); isolated.add(tree); sync();
      const fx = Math.sin(tree.rotation.y), fz = Math.cos(tree.rotation.y), side = 0.95;
      variant.trunkSolid = !isolated.segmentClear(-2, floor + 0.1, 0, 2, floor + 0.1, 0, radius, cave.bodyHeight);
      walk({ x: side * fz - 1.6 * fx, y: floor, z: -side * fx - 1.6 * fz, fx, fz, length: 3.2 }, `flat variant ${variant.variant}`);
      isolated.remove(tree);
    }
    tree.visible = slab.visible = false; cave.root.visible = false; sync();
    let roofLine = null, attempts = 0;
    // Select a short real roof corridor with at least one normal terrain step.
    // Clearance is only a fixture prerequisite; movement/arrival is asserted.
    for (const owner of trees) {
      if (!owner.active || roofLine) continue;
      isolated.add(owner.node); sync();
      for (let turn = 0; turn < 8 && !roofLine; turn++) for (const side of [-0.95, 0.95]) {
        const heading = owner.node.rotation.y + turn * Math.PI / 4, fx = Math.sin(heading), fz = Math.cos(heading);
        const x = owner.x + side * fz - fx * 1.6, z = owner.z - side * fx - fz * 1.6;
        let y = island.supportAt(x, z, island.surfaceAt(x, z), 0.5, -100, radius), low = y, high = y, under = 0, clear = y >= 3;
        const firstY = y; attempts++;
        for (let i = 1; i <= 32 && clear; i++) {
          const ax = x + fx * (i - 1) * 0.1, az = z + fz * (i - 1) * 0.1, bx = x + fx * i * 0.1, bz = z + fz * i * 0.1;
          const next = island.supportAt(bx, bz, y, 0.5, -100, radius);
          clear = next >= 3 && Math.abs(next - y) <= 0.5 && B.headquarters.solids.walkable(ax, az, bx, bz, y, cave.bodyHeight, cave);
          if (Number.isFinite(isolated.ceilingAt(bx, bz, next + 0.1, radius))) under++;
          low = Math.min(low, next); high = Math.max(high, next); y = next;
        }
        if (!clear || high - low < unit || high - low > 0.5 || under < 4) continue;
        // The player's held input also anticipates props 1.3m ahead. Reject
        // unrelated trunk/prop approaches beyond the physical crossing, but
        // retain any hit on this tree so a foliage-query bug still fails.
        const threat = {}, step = BL.pilot.WALK.step;
        y = firstY;
        for (let i = 0; i <= 33 && clear; i++) {
          const px = x + fx * i * 0.1, pz = z + fz * i * 0.1;
          y = island.supportAt(px, pz, y, step, -100, radius);
          if (props.shoulderAt(px, y + step, pz, fx, fz, radius, cave.bodyHeight - step, 1.3, threat, y + 1e-7) && threat.node !== owner.node) {
            if (rejectedThreats.length < 3) rejectedThreats.push({ candidate: [owner.x, owner.z], ...describeThreat(threat.node) });
            clear = false;
          }
        }
        if (clear) roofLine = { x, y: firstY, z, fx, fz, length: 3.2, variation: high - low, tree: [owner.x, owner.z], yaw: owner.node.rotation.y };
      }
      if (roofLine) walk(roofLine, "stepped cave roof");
      isolated.remove(owner.node);
    }
    // Horizontal rays through the highest leaf and root used to miss the
    // undersized pick sphere. Exercise the actual target registry independent
    // of camera framing; cliff trees remain outside even the maximum pile.
    cave.root.visible = false; sync();
    const owner = trees.find((entry) => entry.active && entry.node.visible), originalRay = B.renderer.ray, picking = { active: !!owner };
    try {
      if (owner) {
        const geometry = owner.node.geometry, bounds = S.boundsOf(geometry), m = owner.node.world, v = geometry.verts;
        let farthest = 0;
        for (let i = 0; i < v.length; i += 3) farthest = Math.max(farthest, Math.hypot(v[i] - bounds.center[0], v[i + 1] - bounds.center[1], v[i + 2] - bounds.center[2]));
        picking.enclosesMesh = owner.pickRadius >= farthest - 1e-9;
        const cast = (height) => {
          for (let side = 0; side < 8; side++) {
            const dx = Math.sin(side * Math.PI / 4), dz = Math.cos(side * Math.PI / 4);
            B.renderer.ray = (_x, _y, _camera, out) => Object.assign(out, { ox: m[12] - dx * 3, oy: m[13] + height, oz: m[14] - dz * 3, dx, dy: 0, dz });
            if (B.input.pick(0, 0)?.owner === owner) return true;
          }
          return false;
        };
        picking.highestLeaf = cast(bounds.max[1] - 0.01);
        picking.root = cast(bounds.min[1] + 0.01);
      }
    } finally { B.renderer.ray = originalRay; }
    return { backend: B.renderer.kind, dt, tallest: cave.traits.name, bodyHeight: cave.bodyHeight, variants, placements, samples, attempts, rejectedThreats, roofLine, rows, picking };
  } finally {
    crew.steer(0, 0); B.pilot.release(true); isolated.dispose();
    props.remove(fixture); S.removeChild(scene.root, fixture);
    for (const entry of saved) { entry.actor.override = entry.override; entry.actor.root.visible = entry.visible; }
    sync();
  }
};
