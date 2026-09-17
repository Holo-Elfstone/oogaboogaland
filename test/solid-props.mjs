// Exercise the same transformed mesh queries used by hub movement. The old
// arch and the plane wing also prove that a prop's empty bounding-box space
// remains traversable.
export const solidPropsProbe = () => {
  const { scene, models, hubModels, raceModels, dropModels, solidProps } = window.BL;
  const solids = solidProps.create(), rows = [];
  const box = scene.createNode({ geometry: models.box({ w: 2, h: 2, d: 2, color: "#fff", offset: { y: 1 } }) });
  const sync = (root) => { scene.updateWorld(root); solids.sync(); };
  solids.add(box); solids.add(box); sync(box);
  rows.push({ name: "solid volume and swept sides", ok: solids.stats.nodes === 1 && !solids.clearAt(0, 0.2, 0, 0.2, 0.4) && !solids.segmentClear(-3, 0.2, 0, 3, 0.2, 0, 0.2, 1) && solids.clearAt(2, 0, 0, 0.2, 1) });
  rows.push({ name: "landing footprint and head clearance", ok: solids.supportAt(0, 0, 3, 0, 0.2) === 2 && solids.supportAt(1.1, 0, 3, 0, 0.2) === 2 && solids.clearAt(0, 2, 0, 0.2, 1) && solids.ceilingAt(0, 0, -2, 0.2) === 0 && solids.ceilingAt(3, 0, -2, 0.2) === Infinity });
  box.rotation.z = 0.4; box.scale.x = 2; box.scale.z = 0.5; box.position.x = 5; sync(box);
  const tiltedTop = solids.supportAt(5, 0, 10, 0, 0.3);
  rows.push({ name: "rotation and nonuniform scale", ok: tiltedTop > 2 && tiltedTop < 2.5 && !solids.clearAt(5, 0.5, 0, 0.2, 0.3) && solids.clearAt(5, tiltedTop, 0, 0.3, 1.5) && solids.clearAt(5, 0.5, 0, 0.2, 0.3, box), top: tiltedTop });
  box.visible = false; solids.sync();
  rows.push({ name: "hidden and removed scenery", ok: solids.clearAt(5, 0.5, 0, 0.2, 0.3) && solids.supportAt(5, 0, 10, 0, 0.3) === -Infinity });
  solids.remove(box);
  const gate = scene.createNode({ geometry: hubModels.gate() }); solids.add(gate); sync(gate);
  const bounds = scene.boundsOf(gate.geometry), left = (bounds.min[0] * 2 + bounds.max[0]) / 3;
  rows.push({ name: "old gate opening and columns", ok: solids.segmentClear(0, 0, -2, 0, 0, 2, 0.2, 1.2) && !solids.segmentClear(bounds.min[0] + 0.05, 0, -2, bounds.min[0] + 0.05, 0, 2, 0.2, 1.2) && solids.supportAt(left, 0, 10, 0, 0.2) > 1.5 });
  solids.remove(gate);
  for (const [name, root] of [
    ["barrel", scene.createNode({ geometry: hubModels.barrel() })],
    ["box", scene.createNode({ geometry: hubModels.woodCrate() })],
    ["tree", scene.createNode({ geometry: hubModels.tree(0) })],
    ["rock", scene.createNode({ geometry: hubModels.rock(0) })],
    ["rally car", raceModels.kart("#d98a2e").node],
    ["plane", dropModels.plane().node]
  ]) {
    solids.add(root); sync(root);
    const top = solids.supportAt(0, 0, 20, 0, 0.3);
    const side = solids.segmentClear(-4, 0.05, 0, 4, 0.05, 0, 0.3, 1.5);
    rows.push({ name: `${name} sides and landing`, ok: Number.isFinite(top) && top > 0 && !side && solids.clearAt(0, top, 0, 0.3, 1.5), top });
    if (name === "plane") rows.push({ name: "walk below wing and land on wing", ok: solids.clearAt(2.5, 0, 0.35, 0.2, 1) && solids.supportAt(2.5, 0.35, 5, 0, 0.2) > 1.4 });
    solids.remove(root);
  }
  solids.dispose();
  rows.push({ name: "registry cleanup", ok: solids.stats.nodes === 0 && solids.stats.triangles === 0 });
  return rows;
};
