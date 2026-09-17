// The interior must follow the same live solar lighting as the fruit outside,
// including while neither the camera nor the pile is moving.
export const bananaLightingProbe = () => {
  const B = window.__ooga, BL = window.BL, canvas = document.createElement("canvas");
  canvas.width = 320; canvas.height = 200;
  Object.defineProperties(canvas, { clientWidth: { value: 320 }, clientHeight: { value: 200 } });
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  const geometry = BL.models.bananaPileCoreGeometry(2.7, 2.88, 0.16);
  const core = BL.scene.createNode({ geometry, position: { x: 0, y: 0.36, z: 0 }, scale: { x: 4, y: 4, z: 4 } });
  const cover = BL.bananaCover.create({ overlay: canvas, pile: { core }, renderOpts: B.renderOpts, renderer: B.renderer });
  const camera = BL.scene.createCamera();
  Object.assign(camera.position, { x: 0, y: 1.8, z: 0.3 });
  Object.assign(camera.target, { x: 0, y: 0.6, z: -0.4 });
  const rows = [];
  let time = B.renderOpts.matrix.time;
  try {
    for (const hour of [12, 18.8, 0, 12]) {
      B.setHour(hour); BL.scenes.hub.update(0, time);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      cover.prepare(camera, null); cover.draw(camera, null, 0);
      const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data, rgb = [0, 0, 0];
      let filled = 0, hash = 2166136261;
      for (let at = 0; at < pixels.length; at += 4) {
        if (pixels[at + 3] === 255) filled++;
        for (let c = 0; c < 3; c++) { rgb[c] += pixels[at + c]; hash = Math.imul(hash ^ pixels[at + c], 16777619); }
      }
      for (let c = 0; c < 3; c++) rgb[c] /= canvas.width * canvas.height;
      rows.push({ hour, rgb, luminance: rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722, filled, hash: hash >>> 0, coverage: cover.state.coverage });
    }
  } finally { cover.dispose(); B.setHour(12); BL.scenes.hub.update(0, time); }
  return { backend: B.renderer.kind, pixels: canvas.width * canvas.height, rows };
};

// The production interior must honor terrain/prop shadows, especially the
// low dawn sun. Canvas has no shadow pass and retains its existing lighting.
export const bananaDawnShadowProbe = () => {
  const B = window.__ooga, BL = window.BL, scene = BL.scenes.hub, overlay = document.getElementById("overlay"), rows = [];
  B.pilot.release(true); B.setPileLevel(100000);
  const copy = document.createElement("canvas"); copy.width = 320; copy.height = 200;
  const ctx = copy.getContext("2d", { willReadFrequently: true });
  const blocker = BL.scene.createNode({ geometry: BL.models.box({ w: 3, h: 8, d: 3, color: "#555555" }) });
  BL.scene.addChild(scene.root, blocker); B.headquarters.solids.props.add(blocker);
  let time = B.renderOpts.matrix.time;
  try {
    for (const hour of [5.8, 6.3, 7.2, 12]) {
      B.setHour(hour); scene.update(0, time);
      const light = B.renderOpts.light, length = Math.hypot(light.x, light.y, light.z);
      Object.assign(blocker.position, { x: light.x / length * 6, y: B.headquarters.bananaCover.heightAt(0, 0) + light.y / length * 6, z: light.z / length * 6 });
      const samples = [];
      for (const visible of [false, true, false]) {
        blocker.visible = visible; scene.update(0.15, time += 0.15);
        Object.assign(B.camera.position, { x: 0, y: 0.8, z: 0 }); Object.assign(B.camera.target, { x: 1, y: 0.8, z: 0 });
        BL.scene.updateWorld(scene.root); B.renderer.render(scene.root, B.camera, B.renderOpts); scene.overlay(1 / 60);
        ctx.clearRect(0, 0, 320, 200); ctx.drawImage(overlay, 0, 0, 320, 200);
        const pixels = ctx.getImageData(0, 0, 320, 200).data;
        let luminance = 0;
        for (let at = 0; at < pixels.length; at += 4) luminance += pixels[at] * 0.2126 + pixels[at + 1] * 0.7152 + pixels[at + 2] * 0.0722;
        samples.push({ luminance: luminance / 64000, shadowed: B.headquarters.bananaCover.state.shadowedSamples, coverage: B.headquarters.bananaCover.state.coverage });
      }
      rows.push({ hour, sunAltitude: B.renderOpts.sunAltitude, samples });
    }
    return { backend: B.renderer.kind, rows };
  } finally { B.headquarters.solids.props.remove(blocker); BL.scene.removeChild(scene.root, blocker); B.setHour(12); scene.update(0, time); }
};

// Real object contours, actor perception, and fruit clipping share one draw.
// A clear slice of the image must remain untouched even when a whole object
// straddles that boundary; hidden and distant props remain ineligible.
export const bananaGuideClippingProbe = () => {
  const BL = window.BL, S = BL.scene, canvas = document.createElement("canvas"), width = 640, height = 360;
  canvas.width = width; canvas.height = height;
  Object.defineProperties(canvas, { clientWidth: { value: width }, clientHeight: { value: height } });
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  const core = S.createNode({ geometry: BL.models.bananaPileCoreGeometry(2.7, 2.88, 0.16), position: { x: 0, y: 0.36, z: 0 }, scale: { x: 4, y: 4, z: 4 } });
  const cover = BL.bananaCover.create({ overlay: canvas, pile: { core } }), root = S.createNode();
  const actor = { root: S.createNode({ position: { x: 3, y: 2, z: 2.4 } }), baseY: 0, bodyHeight: 1.6 };
  S.addChild(root, actor.root);
  const props = [], labels = ["left", "right", "blocked", "distant"];
  for (const [x, z] of [[5, 1.1], [5, 3.7], [9, 2.4], [30, 2.4]]) {
    const node = S.createNode({ geometry: BL.models.box({ w: 0.5, h: 3, d: 1, color: "#ffffff" }), position: { x, y: 2, z } });
    S.addChild(root, node); props.push(node);
  }
  const objects = BL.objectGuides.create({ roots: props, crew: { cavemen: new Map() } });
  const clear = (ax, ay, az, bx, by, bz) => !((ax < 7 && bx > 7) || (bx < 7 && ax > 7));
  const filter = BL.sightGuides.create({ segmentClear: clear, objectClear: objects.cameraClear, actorClear: objects.perceptionClear,
    ownerBoundary: objects.ownerBoundaryAt, ownerPerceived: objects.perceived, ownerConcealed: objects.concealed, ownerClear: objects.ownerClear,
    ownerDistance: objects.distance, ownerInView: objects.inView, getProvider: objects.getProvider });
  const camera = S.createCamera({ fov: 70, near: 0.2, far: 100 }), rows = [];
  const draw = (guides) => {
    ctx.clearRect(0, 0, width, height);
    cover.prepare(camera, null); cover.draw(camera, null, 0, null, guides);
    return ctx.getImageData(0, 0, width, height).data;
  };
  try {
    S.updateWorld(root);
    for (const mode of ["inside", "partial", "first-person"]) {
      const z = mode === "inside" ? 0 : 2.4, y = mode === "inside" ? 1.8 : cover.heightAt(0, z);
      Object.assign(camera.position, { x: 0, y, z }); Object.assign(camera.target, { x: 5, y, z });
      const source = objects.collect(actor, 3, 2, 2.4, camera, width / height);
      const guides = filter.update(actor, null, source, camera, width / height, 0.3, true, true);
      const baseline = draw(null), pixels = draw(guides);
      let changes = 0, clearChanges = 0, covered = 0;
      for (let py = 0; py < height; py++) for (let px = 0; px < width; px++) {
        const at = (py * width + px) * 4;
        let changed = false; for (let c = 0; c < 4; c++) if (pixels[at + c] !== baseline[at + c]) changed = true;
        if (baseline[at + 3] === 255) covered++;
        if (!changed) continue;
        changes++;
        // Ignore the antialiased border itself, while checking every pixel
        // more than two pixels into the original clear view.
        let nearCover = false;
        for (let dy = -2; dy <= 2 && !nearCover; dy++) for (let dx = -2; dx <= 2; dx++) {
          const x = px + dx, yy = py + dy;
          if (x >= 0 && x < width && yy >= 0 && yy < height && baseline[(yy * width + x) * 4 + 3]) nearCover = true;
        }
        if (!nearCover) clearChanges++;
      }
      const owners = props.map((owner, index) => {
        const slot = guides.owners.indexOf(owner);
        return { name: labels[index], perceived: slot >= 0 && !!(guides.ownerStates[slot] & 1), alpha: slot >= 0 ? guides.ownerAlphas[slot] : 0 };
      });
      rows.push({ mode, changes, clearChanges, covered, coverage: cover.state.coverage, partial: cover.state.partial, owners, count: guides.count });
    }
  } finally { cover.dispose(); filter.dispose(); objects.dispose(); }
  return { pixels: width * height, rows };
};

// Exercise both an exterior actor with an immersed orbit camera and the real
// first-person eye of a character standing inside the fruit.
export const bananaSceneGuidesProbe = () => {
  const B = window.__ooga, BL = window.BL, scene = BL.scenes.hub, H = B.headquarters;
  const actor = [...B.cavemen.values()].find((cave) => cave.state === "working");
  B.setPileLevel(50000); B.pilot.possess(actor);
  const cover = H.bananaCover, radius = B.altar.platformRadius, z = radius + 1.1;
  B.pilot.navigate({ position: { x: 0, y: B.island.surfaceAt(0, z), z }, yaw: 0, pitch: 0.25, dist: 10 });
  let time = B.renderOpts.matrix.time;
  const tick = (frames) => { for (let n = 0; n < frames; n++) scene.update(1 / 60, time += 1 / 60); };
  tick(2);
  const props = [-1.4, 1.4].map((x) => BL.scene.createNode({ geometry: BL.models.box({ w: 0.6, h: 3, d: 0.6, color: "#896746", offset: { y: 1.5 } }), position: { x, y: B.island.surfaceAt(x, z + 1.8), z: z + 1.8 } }));
  for (const node of props) BL.scene.addChild(scene.root, node);
  const otherActors = [...B.cavemen.values()].filter((cave) => cave !== actor).map((cave) => [cave.root, cave.root.visible]);
  for (const [root] of otherActors) root.visible = false;
  const scenery = B.props.map((prop) => [prop.node, prop.node.visible]);
  for (const [node] of scenery) node.visible = false;
  const wall = BL.scene.createNode({ geometry: BL.models.box({ w: 1.6, h: 5, d: 0.5, color: "#777777" }), position: { x: -0.7, y: 2.5, z: (z + 1.8) / 2 }, visible: false });
  BL.scene.addChild(scene.root, wall);
  H.objectGuides.refresh();
  const rows = [];
  const sample = (mode, x, y, z, tx, ty, tz) => {
    if (x !== undefined) { Object.assign(B.camera.position, { x, y, z }); Object.assign(B.camera.target, { x: tx, y: ty, z: tz }); }
    BL.scene.updateWorld(scene.root);
    for (let n = 0; n < 3; n++) scene.overlay(0.15);
    const state = H.bananaGuides;
    const eligible = props.map((node) => {
      const slot = state.owners.indexOf(node);
      return slot >= 0 && !!(state.ownerStates[slot] & 1) && state.ownerAlphas[slot] > 0;
    });
    const eye = B.camera.position;
    rows.push({ mode, actorInPile: cover.state.actorInPile, coverage: cover.state.coverage, partial: cover.state.partial,
      guideLines: cover.state.guideLines, enabled: state.objectsEnabled, eligible, firstPerson: B.pilot.closeMix === 1,
      platformBlocks: !H.objectGuides.perceptionClear(eye.x, eye.y, eye.z, 0, -0.2, 0, actor), cameraInPile: cover.contains(eye.x, eye.y, eye.z) });
  };
  try {
    sample("inside", 0, 1.2, 0, 0, 1.2, z);
    const edgeZ = B.core.scale.x * 0.5, edgeY = cover.heightAt(0, edgeZ + B.camera.near);
    sample("partial", 0, edgeY, edgeZ, 0, edgeY, edgeZ + 1);
    B.pilot.navigate({ position: { x: 0, y: 0.34, z: 0 }, yaw: Math.PI, pitch: 0, dist: 10 });
    B.pilot.enterClose(); tick(120);
    sample("first-person");
    wall.visible = true; sample("first-person-wall");
    wall.visible = false; sample("first-person-restored");
    B.pilot.navigate({ position: { x: 0, y: B.island.surfaceAt(0, z), z }, yaw: Math.PI, pitch: 0, dist: 10 });
    tick(3); sample("first-person-outside");
  } finally {
    for (const node of props) BL.scene.removeChild(scene.root, node);
    BL.scene.removeChild(scene.root, wall);
    for (const [root, visible] of otherActors) root.visible = visible;
    for (const [node, visible] of scenery) node.visible = visible;
    H.objectGuides.refresh();
  }
  return { rows };
};

// Ignoring fruit belongs only to the immersed observer's perception rays.
// Camera occlusion and solid platform/wall checks must retain real geometry,
// and the same stationary target must invalidate its cache on entry/exit.
export const bananaPerceptionProbe = () => {
  const BL = window.BL, S = BL.scene, root = S.createNode(), rows = [];
  const node = (w, h, d, x, y, z) => {
    const n = S.createNode({ geometry: BL.models.box({ w, h, d, color: "#888888" }), position: { x, y, z } });
    S.addChild(root, n); return n;
  };
  const shell = node(4, 4, 4, 0, 2, 0), platform = node(5, 0.4, 5, 0, -0.2, 0);
  const target = node(0.5, 1, 0.5, 5, 1.5, 0), wall = node(0.4, 4, 4, 3, 2, 0);
  const actor = { root: S.createNode({ position: { x: 0, y: 0, z: 0 } }) }; S.addChild(root, actor.root);
  const camera = S.createCamera(); Object.assign(camera.position, { x: 0, y: 1.5, z: 0 }); Object.assign(camera.target, { x: 5, y: 1.5, z: 0 });
  let immersed = false;
  wall.visible = false;
  const objects = BL.objectGuides.create({ roots: [shell, platform, target, wall], crew: { cavemen: new Map() }, perceptionThrough: () => immersed ? shell : null });
  const clear = () => true;
  const sample = (name) => {
    S.updateWorld(root); const source = objects.collect(actor, 0, 0, 0, camera, 1.6), cached = objects.stats.perceptionCacheHits;
    const perceived = objects.perceived(target, actor, 0, 1.5, 0, clear);
    const repeated = objects.perceived(target, actor, 0, 1.5, 0, clear);
    rows.push({ name, perceived, repeated, cached: objects.stats.perceptionCacheHits > cached, version: source.perceptionVersion,
      actorClear: objects.perceptionClear(0, 1.5, 0, 5, 1.5, 0, actor, target), cameraClear: objects.cameraClear(0, 1.5, 0, 5, 1.5, 0, actor, target),
      ordinaryClear: objects.clear(0, 1.5, 0, 5, 1.5, 0, actor, target), platformClear: objects.perceptionClear(0, 1.5, 0, 0, -1, 0, actor) });
  };
  try {
    sample("outside"); immersed = true; sample("immersed"); sample("cached");
    wall.visible = true; sample("wall"); wall.visible = false; sample("restored");
    immersed = false; sample("exited");
  } finally { objects.dispose(); }
  return { rows };
};
