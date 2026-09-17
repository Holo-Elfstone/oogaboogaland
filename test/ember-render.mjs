// Compare two instances of the same real body part through the active renderer.
// Heat matures from red/orange to fire-yellow, then cools into scorched material.
export const emberRenderProbe = () => {
  const B = window.__ooga, BL = window.BL, S = BL.scene, renderer = B.renderer;
  const scene = BL.scenes[B.scene], canvas = document.getElementById("scene");
  const geometry = B.cavemen.values().next().value.parts.legL.geometry, bounds = S.boundsOf(geometry);
  const root = S.createNode(), camera = S.createCamera({ near: 0.1, far: 30 });
  const scale = 1.4 / (bounds.max[1] - bounds.min[1]);
  const parts = [-0.7, 0.7].map((x) => S.createNode({ geometry,
    position: { x: x - bounds.center[0] * scale, y: -bounds.center[1] * scale, z: -bounds.center[2] * scale },
    scale: { x: scale, y: scale, z: scale }
  }));
  S.addChild(root, ...parts);
  Object.assign(camera.position, { x: 0, y: 0, z: 4 });
  Object.assign(camera.target, { x: 0, y: 0, z: 0 });
  const opts = { clear: [0, 0, 0], sky: [0.08, 0.08, 0.08], ground: [0.04, 0.04, 0.04], sun: [0, 0, 0],
    ambientFloor: 0.12, directStrength: 0, light: { x: 0, y: 1, z: 1 }, bloomStrength: 0,
    shadowCenter: { x: 0, y: 0, z: 0 }, shadowExtent: 3 };
  const copy = document.createElement("canvas"), width = 320, height = 240;
  copy.width = width; copy.height = height;
  const ctx = copy.getContext("2d", { willReadFrequently: true });
  const capture = () => {
    renderer.render(root, camera, opts);
    ctx.clearRect(0, 0, width, height);
    ctx.drawImage(canvas, 0, 0, width, height);
    return ctx.getImageData(0, 0, width, height).data;
  };
  try {
    const before = capture();
    const affected = [], untouched = [];
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
      const at = (y * width + x) * 4;
      // The black backdrop cannot pass this mask. Compare only occupied pixels
      // from the unheated surface, independent of ember color and brightness.
      if (before[at] + before[at + 1] + before[at + 2] <= 12) continue;
      (x < width / 2 ? affected : untouched).push(at);
    }
    let otherDelta = 0;
    const measure = (pixels) => {
      const rgb = [0, 0, 0];
      let changed = 0, warm = 0;
      for (const at of affected) {
        for (let c = 0; c < 3; c++) rgb[c] += pixels[at + c];
        if (pixels[at] > before[at] + 25) changed++;
        if (pixels[at] > pixels[at + 1] * 1.15 && pixels[at + 1] > pixels[at + 2] * 1.4) warm++;
      }
      for (const at of untouched) for (let c = 0; c < 3; c++) otherDelta = Math.max(otherDelta, Math.abs(before[at + c] - pixels[at + c]));
      for (let c = 0; c < 3; c++) rgb[c] /= Math.max(1, affected.length);
      return { rgb, luma: rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722, changed, warm };
    };
    const cold = measure(before);
    parts[0].ember = 0.4;
    const fresh = measure(capture());
    parts[0].ember = 1;
    const mature = measure(capture());
    const cooling = [mature.luma];
    for (let i = 1; i <= 10; i++) {
      parts[0].ember = 1 - i / 10;
      parts[0].scorch = i / 10;
      cooling.push(measure(capture()).luma);
    }
    const charred = cooling[cooling.length - 1];
    parts[0].ember = 0.001; parts[0].scorch = 0.999;
    const nearlyOut = measure(capture());
    parts[0].ember = parts[0].scorch = 0;
    const after = capture();
    let restoreDelta = 0;
    for (let at = 0; at < before.length; at++) if (at % 4 !== 3) restoreDelta = Math.max(restoreDelta, Math.abs(before[at] - after[at]));
    return { backend: renderer.kind, rows: [
      { name: "fresh ember warms and lights the actual body surface", ok: affected.length > 100 && fresh.changed > affected.length * 0.8 && fresh.warm > affected.length * 0.8 && fresh.luma > cold.luma * 1.5, affected: affected.length, cold, fresh },
      { name: "longer burning becomes brighter fire-yellow and cream", ok: mature.luma > fresh.luma * 1.5 && mature.rgb[1] > mature.rgb[0] * 0.8 && mature.rgb[2] > mature.rgb[0] * 0.45 && mature.rgb[1] / mature.rgb[0] > fresh.rgb[1] / fresh.rgb[0] + 0.15, fresh: fresh.rgb, mature },
      { name: "rolling heat fades continuously into dark body material", ok: cooling.every((v, i) => !i || v < cooling[i - 1]) && cooling[5] > charred * 3 && charred < cold.luma * 0.3 && Math.abs(nearlyOut.luma - charred) < 1, cooling, charred, nearlyOut: nearlyOut.luma },
      { name: "unreached shared body geometry stays unchanged", ok: untouched.length > 100 && otherDelta <= 1 && parts[0].geometry === geometry && parts[1].geometry === geometry, untouched: untouched.length, otherDelta },
      { name: "clearing heat and scorch restores the original surface pixels", ok: restoreDelta <= 1, restoreDelta }
    ] };
  } finally {
    S.removeChild(root, parts[0]); S.removeChild(root, parts[1]);
    renderer.render(scene.root, B.camera, B.renderOpts);
  }
};

// Exercise the fire controller before rendering its output on the actual mask
// geometry. An isolated crew keeps the active visit and its fire state intact.
export const maskedHeadEmberProbe = () => {
  const B = window.__ooga, BL = window.BL, S = BL.scene, renderer = B.renderer;
  const scene = BL.scenes[B.scene], canvas = document.getElementById("scene"), crewRoot = S.createNode();
  const crew = BL.crew.create({ root: crewRoot, input: { add() {}, remove() {} }, hud: {}, game: B.game,
    world: { level: 0 }, bedrolls: [], viewYaw: 0, buildSpots: [], walkIn: { x: 0, z: 0 },
    pile: { footprintEdge: 1, pileEdge: () => 1 }, fx: { say() {}, spawnParticle() {}, burst() {} } });
  const cave = crew.cavemen.get("MrHodlX"), head = cave.parts.head;
  const mask = head.children.find((child) => child.geometry && child !== cave.parts.hat && child !== cave.parts.face);
  const geometry = mask.geometry, bounds = S.boundsOf(geometry), scale = 1.4 / (bounds.max[1] - bounds.min[1]);
  const root = S.createNode(), camera = S.createCamera({ near: 0.1, far: 30 });
  const parts = [-0.7, 0.7].map((x) => S.createNode({ geometry,
    position: { x: x - bounds.center[0] * scale, y: -bounds.center[1] * scale, z: -bounds.center[2] * scale },
    scale: { x: scale, y: scale, z: scale }
  }));
  S.addChild(root, ...parts);
  Object.assign(camera.position, { x: 0, y: 0, z: 4 });
  Object.assign(camera.target, { x: 0, y: 0, z: 0 });
  const opts = { clear: [0, 0, 0], sky: [0.08, 0.08, 0.08], ground: [0.04, 0.04, 0.04], sun: [0, 0, 0],
    ambientFloor: 0.12, directStrength: 0, light: { x: 0, y: 1, z: 1 }, bloomStrength: 0,
    shadowCenter: { x: 0, y: 0, z: 0 }, shadowExtent: 3 };
  const copy = document.createElement("canvas"), width = 320, height = 240;
  copy.width = width; copy.height = height;
  const ctx = copy.getContext("2d", { willReadFrequently: true });
  const capture = () => {
    parts[0].ember = mask.ember; parts[0].scorch = mask.scorch;
    renderer.render(root, camera, opts);
    ctx.drawImage(canvas, 0, 0, width, height);
    return ctx.getImageData(0, 0, width, height).data;
  };
  const dt = 1 / 20;
  let time = 0, tracksHead = true;
  const step = (seconds) => {
    for (let i = 0; i < Math.ceil(seconds / dt); i++) {
      crew.update(dt, time += dt);
      tracksHead &&= mask.ember === head.ember && mask.scorch === head.scorch;
    }
  };
  try {
    cave.state = "working"; cave.root.visible = true;
    crew.control(cave);
    const before = capture(), affected = [], untouched = [];
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
      const at = (y * width + x) * 4;
      // Exclude the red emissive lenses: the hood, snout and filter must heat.
      if (before[at] + before[at + 1] + before[at + 2] <= 12 || before[at + 1] < before[at] * 0.8) continue;
      (x < width / 2 ? affected : untouched).push(at);
    }
    let otherDelta = 0;
    const measure = (pixels) => {
      let luma = 0, changed = 0;
      for (const at of affected) {
        luma += pixels[at] * 0.2126 + pixels[at + 1] * 0.7152 + pixels[at + 2] * 0.0722;
        if (pixels[at] > before[at] + 25 && pixels[at + 1] > before[at + 1] + 25) changed++;
      }
      for (const at of untouched) for (let c = 0; c < 3; c++) otherDelta = Math.max(otherDelta, Math.abs(before[at + c] - pixels[at + c]));
      return { luma: luma / Math.max(1, affected.length), changed };
    };
    const cold = measure(before), ignited = crew.ignite(cave);
    step(0.3);
    const startsClean = mask.ember === 0 && mask.scorch === 0;
    step(13);
    const hot = measure(capture()), heat = mask.ember, cleanBeforeRoll = mask.scorch === 0;
    crew.dropRoll(cave); step(1.5);
    const rolling = measure(capture()), blending = mask.ember > 0 && mask.ember < heat && mask.scorch > 0;
    step(1.6);
    const charred = measure(capture()), out = !cave.camp.burning && !cave.camp.rolling && mask.ember === 0;
    step(11);
    const after = capture();
    let restoreDelta = 0;
    for (let at = 0; at < before.length; at++) if (at % 4 !== 3) restoreDelta = Math.max(restoreDelta, Math.abs(before[at] - after[at]));
    const separateAttachments = [cave.parts.hat, cave.parts.face, cave.parts.club].every((part) => part.ember === 0 && part.scorch === 0);
    return { backend: renderer.kind, rows: [
      { name: "MrHodlX's visible mask heats with his head after fire reaches it", ok: ignited && startsClean && tracksHead && cleanBeforeRoll && heat > 0.8 && affected.length > 100 && hot.changed > affected.length * 0.8 && hot.luma > cold.luma * 2, affected: affected.length, heat, tracksHead, cold, hot },
      { name: "MrHodlX's mask cools into char during rolling and restores without changing shared geometry", ok: blending && out && rolling.luma < hot.luma && rolling.luma > charred.luma && charred.luma < cold.luma * 0.3 && mask.scorch === 0 && restoreDelta <= 1 && untouched.length > 100 && otherDelta <= 1 && mask.geometry === geometry && separateAttachments, blending, out, rolling, charred, restoreDelta, otherDelta, separateAttachments }
    ] };
  } finally {
    crew.dispose();
    S.removeChild(root, parts[0]); S.removeChild(root, parts[1]);
    renderer.render(scene.root, B.camera, B.renderOpts);
  }
};
