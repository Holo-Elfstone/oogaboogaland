// Render-height clipping must also bound gate occlusion, witnesses and outlines.
// This fixture is renderer-independent and can run without a browser or DOM.
export const objectRenderClippingProbe = () => {
  const BL = window.BL, S = BL.scene, failures = [], rows = [];
  const check = (name, ok, detail) => { rows.push({ name, ok, ...detail }); if (!ok) failures.push(rows[rows.length - 1]); };
  const stage = S.createNode(), actor = { root: S.createNode({ geometry: BL.models.box({ w: 0.3, h: 0.3, d: 0.3, color: "#ffffff" }), position: { x: 0, y: 1.5, z: 0 } }) };
  const geometry = BL.models.box({ w: 4, h: 6, d: 0.3, color: "#ffffff" }); geometry.clipMinY = 0; geometry.clipMaxY = 3;
  const gate = S.createNode({ geometry, position: { x: 0, y: 1.5, z: 3 } });
  const target = S.createNode({ geometry: BL.models.box({ w: 0.2, h: 0.2, d: 0.2, color: "#ffffff" }), position: { x: 0, y: 1.5, z: 6 } });
  S.addChild(stage, actor.root, gate, target);
  const objects = BL.objectGuides.create({ roots: [actor.root, gate, target], crew: { cavemen: new Map([["selected", actor]]) } });
  const camera = S.createCamera({ fov: 70, near: 0.1, far: 60 }); Object.assign(camera.position, { x: 0, y: 1.5, z: -6 }); Object.assign(camera.target, { x: 0, y: 1.5, z: 3 });
  const terrainClear = () => true;
  const collect = (cameraAt = camera) => { S.updateWorld(stage); const p = actor.root.position; return objects.collect(actor, p.x, p.y, p.z, cameraAt, 1.6); };
  const ray = (y) => objects.clear(0, y, 0, 0, y, 6, actor, target);
  const bounds = (source) => {
    let count = 0, minY = Infinity, maxY = -Infinity, lower = 0, upper = 0;
    for (let i = 0; i < source.count; i++) if (source.owners[i] === gate) {
      const a = source.lines[i * 6 + 1], b = source.lines[i * 6 + 4]; count++; minY = Math.min(minY, a, b); maxY = Math.max(maxY, a, b);
      if (Math.abs(a - geometry.clipMinY) < 1e-5 && Math.abs(b - a) < 1e-5) lower++;
      if (Math.abs(a - geometry.clipMaxY) < 1e-5 && Math.abs(b - a) < 1e-5) upper++;
    }
    return { count, minY, maxY, lower, upper };
  };
  try {
    const source = collect(), storage = source.lines, ownerStorage = source.owners, capacity = source.capacity, first = bounds(source);
    check("world planes bound real ray blockers", !ray(1.5) && ray(-0.25) && ray(3.25), { within: ray(1.5), below: ray(-0.25), above: ray(3.25) });
    check("partial gate keeps its closed clipped contour", first.count > 0 && first.minY >= 0 && first.maxY <= 3 && first.lower > 0 && first.upper > 0, first);
    check("rendered gate still blocks actor perception", !objects.perceived(target, actor, 0, 1.5, 0, terrainClear), {});
    actor.root.position.y = target.position.y = 3.5; camera.position.y = camera.target.y = 3.5; collect();
    check("discarded gate cannot block actor perception", objects.perceived(target, actor, 0, 3.5, 0, terrainClear), {});

    // Put the clipped gate between the camera and selected character. The
    // original, taller mesh would falsely certify the high character hidden.
    actor.root.position.z = 6; target.visible = false; actor.root.position.y = 1.5; camera.position.y = camera.target.y = 1.5; collect();
    check("remaining gate can certify a hidden character", !objects.actorVisible(actor, terrainClear), {});
    actor.root.position.y = camera.position.y = camera.target.y = 3.5; collect();
    check("discarded gate cannot certify a hidden character", objects.actorVisible(actor, terrainClear), {});
    geometry.clipMaxY = 4; collect();
    check("clip changes invalidate visibility certificates", !objects.actorVisible(actor, terrainClear), {});
    geometry.clipMaxY = 3; collect();
    check("lowered ceiling restores character visibility", objects.actorVisible(actor, terrainClear), {});

    actor.root.position.z = 0; actor.root.position.y = camera.position.y = camera.target.y = 1.5;
    for (const y of [-5, 8]) {
      gate.position.y = y; const source = collect(), contour = bounds(source);
      check("fully clipped gate is absent", contour.count === 0 && !objects.perceived(gate, actor, 0, 1.5, 0, terrainClear) && objects.distance(gate, 0, 1.5, 0) === Infinity && !objects.inView(gate) && ray(1.5), { y, count: contour.count });
    }
    gate.position.y = 1.5; collect();
    check("gate returns after moving into render bounds", !ray(1.5) && objects.perceived(gate, actor, 0, 1.5, 0, terrainClear), {});

    // Even a remnant thinner than the normal witness spacing must be kept.
    geometry.clipMinY = 1.013; geometry.clipMaxY = 1.015; actor.root.position.y = camera.position.y = camera.target.y = 1.014;
    const slit = bounds(collect());
    check("thin clipped remnant has witnesses and no phantom edges", objects.perceived(gate, actor, 0, 1.014, 0, terrainClear) && !objects.concealed(gate, actor, terrainClear) && slit.count > 0 && slit.minY >= 1.013 - 1e-6 && slit.maxY <= 1.015 + 1e-6, slit);

    // Mirror reveal is local to its plane and must remain independent of the
    // generic world-height planes on translated or rotated gate geometry.
    geometry.clipMinY = -Infinity; geometry.clipMaxY = Infinity; gate.mirror = true; gate.mirrorReveal = 0.5; gate.position.y = 2; gate.rotation.y = 0.35;
    actor.root.position.y = camera.position.y = camera.target.y = 1.5; collect();
    check("mirror reveal retains its local threshold", ray(1.5) && !ray(2.5), { belowReveal: ray(1.5), aboveReveal: ray(2.5) });
    geometry.clipMinY = 1; geometry.clipMaxY = 3; collect();
    check("local mirror and world gate planes intersect", ray(1.5) && !ray(2.5) && ray(3.5), {});

    gate.mirror = false; gate.mirrorReveal = 0; gate.position.y = 1.5; gate.rotation.x = 0.3; gate.rotation.z = 0.2; gate.scale.x = 0.8; gate.scale.y = 1.2; gate.scale.z = 1.5;
    geometry.clipMinY = 0; geometry.clipMaxY = 3;
    const tilted = bounds(collect());
    check("world clipping survives tilt and nonuniform scale", !ray(1.5) && ray(-0.25) && ray(3.25) && tilted.count > 0 && tilted.minY >= 0 && tilted.maxY <= 3 && tilted.lower > 0 && tilted.upper > 0, tilted);
    let stable = true;
    for (let i = 0; i < 20; i++) {
      gate.position.y = 1.5 + i * 0.05; geometry.clipMaxY = 2.8 + i * 0.01;
      const source = collect(); stable &&= source.lines === storage && source.owners === ownerStorage && source.capacity === capacity && source.count <= capacity;
    }
    check("animated clips reuse bounded contour storage", stable, { capacity });
  } finally { objects.dispose(); }
  return { rows, failures, disposed: objects.stats.registered === 0 && objects.stats.geometries === 0 && objects.result.count === 0 };
};
