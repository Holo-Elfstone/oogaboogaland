// Swept movement through a narrow gap and out of a cul-de-sac made of real
// collision meshes. Recovery must walk back out, never teleport or climb props.
export const npcRecoveryProbe = ({ dt = 1 / 60 } = {}) => {
  const B = window.__ooga, BL = window.BL, S = BL.scene, scene = BL.scenes.hub, solids = B.headquarters.solids.props;
  const actors = [...B.cavemen.values()], cave = actors.find((c) => c.state === "working"), fixture = S.createNode(), rows = [];
  const slab = S.createNode({ geometry: BL.models.box({ w: 20, h: 0.2, d: 20, color: "#665544" }), position: { x: 0, y: 12, z: 0 } });
  S.addChild(fixture, slab); S.addChild(scene.root, fixture);
  const block = (x, z, w, d) => {
    const node = S.createNode({ geometry: BL.models.box({ w, h: 2, d, color: "#665544" }), position: { x, y: 13.1, z } });
    S.addChild(fixture, node); return node;
  };
  const left = block(-0.9, -0.5, 0.6, 3), right = block(0.9, -0.5, 0.6, 3), cap = block(0, 1.3, 2.4, 0.6);
  const pairLeft = block(-0.8, 0, 1.2, 2), pairRight = block(0.8, 0, 1.2, 2), moving = block(7, 7, 0.9, 0.9);
  const ceiling = S.createNode({ geometry: BL.models.box({ w: 3, h: 0.2, d: 4, color: "#665544" }), position: { x: 0, y: 14.2, z: -0.5 } });
  S.addChild(fixture, ceiling);
  solids.add(fixture);
  const sync = () => { S.updateWorld(scene.root); solids.sync(); };
  let time = B.renderOpts.matrix.time;
  B.pilot.release(true);
  for (const actor of actors) actor.root.visible = false;
  for (const prop of B.props) prop.node.visible = false;
  try {
    for (const name of ["narrow gap", "dead end", "changed recovery path", "jump escape", "no safe jump"]) {
      left.visible = right.visible = cap.visible = name !== "narrow gap";
      pairLeft.visible = pairRight.visible = name === "narrow gap"; moving.visible = false;
      ceiling.visible = name === "no safe jump";
      if (name === "jump escape" || name === "no safe jump") { moving.position.x = 0; moving.position.z = -1.3; moving.visible = true; }
      cave.root.visible = true; cave.state = "working"; cave.root.quaternion = null;
      cave.root.rotation.x = cave.root.rotation.z = 0;
      cave.build = null; cave.bedTravel.mode = ""; cave.cloudSupport = null;
      cave.hop = cave.hopV = cave.cheer = cave.catchT = cave.yawn = 0; cave.nextBuildAt = 1e12;
      cave.act.kind = "idle"; cave.act.until = 1e12;
      Object.assign(cave.root.position, { x: 0, y: 12.1 + cave.baseY, z: name === "narrow gap" ? -3 : 0 });
      const target = name === "narrow gap" ? 3 : 4;
      cave.walk = { tx: 0, tz: target, speed: 1.7, phase: 0, heading: 0, to: "spot" };
      cave.act.spot.x = 0; cave.act.spot.z = target; cave.act.spot.ry = 0;
      const a = cave.avoidance, nav = a.navigation;
      a.active = false; a.tx = a.tz = NaN; nav.mode = 0;
      const searches = nav.searches;
      const jumps = nav.jumps;
      let frames = 0, intersections = 0, maximumWork = 0, minimumZ = 0, maximumStep = 0, maximumFeet = 12.1, changed = false;
      let lastX = 0, lastZ = cave.root.position.z;
      sync();
      while (cave.walk && frames++ < Math.ceil((name === "no safe jump" ? 6 : 25) / dt)) {
        if (name === "changed recovery path" && !changed && nav.mode === 2 && nav.index >= 4) {
          for (let at = nav.index - 3; at >= 0; at--) {
            const i = nav.path[at], x = nav.x + (i % 21 - 10) * 0.5, z = nav.z + (Math.floor(i / 21) - 10) * 0.5;
            // Obstruct a future waypoint in the open yard; sealing the only
            // exit of the U would make escape physically impossible.
            if (Math.abs(x) < 1.8 || Math.hypot(x - cave.root.position.x, z - cave.root.position.z) < 2) continue;
            moving.position.x = x; moving.position.z = z;
            moving.visible = true; changed = true; sync(); break;
          }
        }
        const expansions = nav.expansions;
        B.crew.update(dt, time += dt); sync();
        maximumWork = Math.max(maximumWork, nav.expansions - expansions);
        const p = cave.root.position, feet = p.y - cave.baseY;
        if (!solids.clearAt(p.x, feet + 1e-5, p.z, 0.295, cave.bodyHeight - 1e-5)) intersections++;
        minimumZ = Math.min(minimumZ, p.z); maximumFeet = Math.max(maximumFeet, feet);
        maximumStep = Math.max(maximumStep, Math.hypot(p.x - lastX, p.z - lastZ)); lastX = p.x; lastZ = p.z;
      }
      rows.push({ name, dt, arrived: !cave.walk, distance: Math.hypot(cave.root.position.x, cave.root.position.z - target), frames,
        intersections, maximumWork, minimumZ, maximumStep, maximumFeet, changed, searches: nav.searches - searches,
        jumps: nav.jumps - jumps,
        bounded: nav.path.length === 441 && nav.costs.length === 441 && nav.parents.length === 441 && nav.closed.length === 441,
        debug: !cave.walk ? null : { x: cave.root.position.x, z: cave.root.position.z, mode: nav.mode, count: nav.count, index: nav.index, movingX: moving.position.x, movingZ: moving.position.z, node: nav.path[nav.index], originX: nav.x, originZ: nav.z, stalled: a.stalled } });
    }
    return rows;
  } finally { solids.remove(fixture); S.removeChild(scene.root, fixture); sync(); }
};
