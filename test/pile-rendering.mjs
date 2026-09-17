// Exercise the real pile's distance selection without changing its banana
// population, then draw both cached meshes and audit their GPU lifetime.
export const pileRenderingProbe = async (backend) => {
  const BL = window.BL, S = BL.scene, canvas = document.createElement("canvas"), rows = [];
  let width = 384, height = 256;
  Object.defineProperties(canvas, { clientWidth: { get: () => width }, clientHeight: { get: () => height } });
  const gl = backend === "webgl2" ? canvas.getContext("webgl2", { antialias: false, alpha: false, powerPreference: "high-performance" }) : null;
  const context = gl ? null : canvas.getContext("2d", { willReadFrequently: true });
  const liveBuffers = new Set(), liveArrays = new Set(), restores = [], draws = [], uploads = [];
  const wrap = (name, inspect) => {
    const original = gl[name], descriptor = Object.getOwnPropertyDescriptor(gl, name);
    gl[name] = function (...args) { const result = original.apply(this, args); inspect(args, result); return result; };
    restores.push(() => descriptor ? Object.defineProperty(gl, name, descriptor) : delete gl[name]);
  };
  if (gl) {
    wrap("createBuffer", (_, value) => liveBuffers.add(value)); wrap("deleteBuffer", ([value]) => liveBuffers.delete(value));
    wrap("createVertexArray", (_, value) => liveArrays.add(value)); wrap("deleteVertexArray", ([value]) => liveArrays.delete(value));
    wrap("drawArraysInstanced", ([mode, first, count, instances]) => draws.push({ count, instances }));
    wrap("bufferSubData", ([target, offset, source, start, length]) => uploads.push({ source, length, y: source[13] }));
  }
  const renderer = (gl ? BL.glRenderer : BL.canvasRenderer).createRenderer(canvas, { quality: "low" });
  const root = S.createNode(), camera = S.createCamera({ near: 0.1, far: 160 });
  const world = { level: 302 }, crew = { updateFan() {}, rush() {} };
  let pile = BL.pile.create({ root, world, renderer, crew, camera });
  const full = BL.models.bananaTileGeometry(), distant = BL.models.bananaTileGeometry(true);
  const triangles = (geometry) => geometry.faces.reduce((n, face) => n + face.i.length - 2, 0);
  const bounds = (geometry) => {
    const result = [Infinity, Infinity, Infinity, -Infinity, -Infinity, -Infinity];
    for (const face of geometry.faces) for (const i of face.i) for (let axis = 0; axis < 3; axis++) {
      const value = geometry.verts[i * 3 + axis]; result[axis] = Math.min(result[axis], value); result[axis + 3] = Math.max(result[axis + 3], value);
    }
    return result;
  };
  const coloredEnds = (geometry) => geometry.faces.filter((face) => face.color.join() !== "245,197,66")
    .map((face) => face.color.join() + ":" + face.i.map((i) => geometry.verts.slice(i * 3, i * 3 + 3).join()).join(";")).sort().join("|");
  const hash = () => {
    const bytes = new Uint8Array(pile.shell.instanceData.buffer, pile.shell.instanceData.byteOffset, pile.shell.instanceCount * 80);
    let result = 2166136261; for (const byte of bytes) result = Math.imul(result ^ byte, 16777619); return result >>> 0;
  };
  const opts = { clear: [0, 0, 0], sky: [1, 1, 1], ground: [1, 1, 1], sun: [0, 0, 0],
    light: { x: 0, y: 1, z: 1 }, ambientFloor: 1, directStrength: 0, bloomStrength: 0 };
  const render = async () => {
    const start = performance.now();
    while (!renderer.render(root, camera, opts)) {
      if (renderer.failure || performance.now() - start > 8000) throw Error(renderer.failure || "Pile renderer did not become ready");
      await new Promise(requestAnimationFrame);
    }
  };
  const capture = async () => {
    draws.length = 0; await render();
    const pixels = new Uint8Array(canvas.width * canvas.height * 4);
    if (gl) gl.readPixels(0, 0, canvas.width, canvas.height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
    else pixels.set(context.getImageData(0, 0, canvas.width, canvas.height).data);
    return pixels;
  };
  const move = (x, y, z) => { Object.assign(camera.position, { x, y, z }); pile.update(0); return pile.shell.geometry; };
  let disposed = false;
  try {
    const a = bounds(full), b = bounds(distant), vertices = new Set();
    for (let i = 0; i < full.verts.length; i += 3) vertices.add(full.verts.slice(i, i + 3).join());
    let originalRings = true;
    for (let i = 0; i < distant.verts.length; i += 3) if (!vertices.has(distant.verts.slice(i, i + 3).join())) originalRings = false;
    rows.push({ name: "distant bananas retain original dimensions, end colors and ring positions with 25% fewer triangles",
      ok: full !== distant && triangles(full) === 80 && triangles(distant) === 60 && a.every((value, i) => Math.abs(value - b[i]) < 1e-9)
        && originalRings && coloredEnds(full) === coloredEnds(distant) && BL.models.bananaTileGeometry() === full && BL.models.bananaTileGeometry(true) === distant,
      full: triangles(full), distant: triangles(distant), originalRings, bounds: [a, b] });
    const switches = [];
    for (const level of [302, 1000, 1000000, 10000000]) {
      pile.setLevel(level);
      const data = pile.shell.instanceData, count = pile.shell.instanceCount, version = pile.shell.instanceVersion, before = hash();
      const eligible = count >= 1000, radius = pile.footprintEdge, y = pile.core.position.y + pile.core.scale.y * 0.4;
      for (const angle of [0, Math.PI / 2, Math.PI, Math.PI * 1.5]) {
        const x = Math.sin(angle), z = Math.cos(angle);
        const near = move(x * (radius + 0.5), y, z * (radius + 0.5)) === full;
        const far = move(x * (radius * 2 + 24), y, z * (radius * 2 + 24)) === (eligible ? distant : full);
        const heldFar = move(x * (radius + 9), y, z * (radius + 9)) === (eligible ? distant : full);
        const restored = move(x * (radius + 0.5), y, z * (radius + 0.5)) === full;
        const heldNear = move(x * (radius + 9), y, z * (radius + 9)) === full;
        switches.push({ level, angle, count, eligible, near, far, heldFar, restored, heldNear });
      }
      const stable = pile.shell.instanceData === data && pile.shell.instanceCount === count && pile.shell.instanceVersion === version && hash() === before
        && world.level === level && pile.shown === level && pile.delivery.logicalOutstandingValue === 0;
      rows.push({ name: `${level} bananas keep every instance and logical count through four complete distance cycles`, ok: stable && switches.slice(-4).every((r) => r.near && r.far && r.heldFar && r.restored && r.heldNear), samples: switches.slice(-4), stable });
    }
    pile.setLevel(1000000);
    const radius = pile.footprintEdge, y = pile.core.position.y + pile.core.scale.y * 0.5;
    Object.assign(camera.target, { x: 0, y, z: 0 }); move(0, y + 2, radius + 18);
    const selected = pile.shell.geometry;
    pile.shell.geometry = full; const reference = await capture();
    const fullDraw = gl ? draws.filter((draw) => draw.instances === pile.shell.instanceCount).reduce((n, draw) => n + draw.count * draw.instances, 0) : 0;
    pile.shell.geometry = selected; const reduced = await capture();
    const distantDraw = gl ? draws.filter((draw) => draw.instances === pile.shell.instanceCount).reduce((n, draw) => n + draw.count * draw.instances, 0) : 0;
    let occupied = 0, shared = 0, union = 0, difference = 0;
    for (let i = 0; i < reference.length; i += 4) {
      const left = reference[i] + reference[i + 1] + reference[i + 2] > 12, right = reduced[i] + reduced[i + 1] + reduced[i + 2] > 12;
      if (left) occupied++; if (left && right) shared++; if (left || right) union++;
      for (let c = 0; c < 3; c++) difference += Math.abs(reference[i + c] - reduced[i + c]);
    }
    rows.push({ name: "the distant shell preserves visible coverage while actual draw work falls by one quarter",
      ok: occupied > 1000 && shared / union > 0.99 && difference / (reference.length * 0.75) < 3 && (!gl || fullDraw > 0 && distantDraw === fullDraw * 0.75),
      occupied, coverage: shared / union, meanDifference: difference / (reference.length * 0.75), fullDraw, distantDraw });
    const retained = new Set(), collect = (node) => { if (node.geometry) retained.add(node.geometry); for (const child of node.children) collect(child); };
    collect(root); pile.liveGeometry(retained);
    const production = new Set(); BL.scenes[window.__ooga.scene].liveGeometry(production);
    const beforeRecords = renderer.stats.records, released = renderer.releaseUnused(retained);
    const buffers = liveBuffers.size, arrays = liveArrays.size;
    for (let i = 0; i < 4; i++) { move(0, y, radius + (i % 2 ? 24 : 0.5)); await render(); }
    rows.push({ name: "housekeeping retains both cached meshes and repeated distance switches allocate no GPU records",
      ok: retained.has(full) && retained.has(distant) && production.has(full) && production.has(distant)
        && (!gl || released === 0 && renderer.stats.records === beforeRecords && liveBuffers.size === buffers && liveArrays.size === arrays),
      beforeRecords, afterRecords: renderer.stats.records, released, buffers, arrays });
    const ownedRecords = renderer.stats.records;
    pile.dispose(); disposed = true;
    rows.push({ name: "ending a visit immediately releases both active and dormant shell buffers",
      ok: !gl || renderer.stats.records === ownedRecords - 2, before: ownedRecords, after: renderer.stats.records });
    renderer.releaseUnused(new Set());
    // Two new visits start with the same version and instance count. Retaining
    // an old LOD buffer across disposal must not suppress the next visit's upload.
    const visits = [];
    for (const floor of [2, 7]) {
      world.level = 1000000; pile = BL.pile.create({ root, world, renderer, crew, camera, pileY: floor }); disposed = false;
      pile.syncPile(true); pile.core.visible = false;
      const nextVisit = new Set([pile.core.geometry]); pile.liveGeometry(nextVisit); renderer.releaseUnused(nextVisit);
      const radius = pile.footprintEdge, center = floor + pile.core.scale.y * 0.5;
      Object.assign(camera.target, { x: 0, y: center, z: 0 });
      const visit = { floor, version: pile.shell.instanceVersion, count: pile.shell.instanceCount, y: pile.shell.instanceData[13], meshes: [] };
      for (const far of [false, true]) {
        move(0, center + 2, radius + (far ? 18 : 0.5)); uploads.length = 0;
        const pixels = await capture(), sent = uploads.filter((upload) => upload.source === pile.shell.instanceData && upload.length === pile.shell.instanceCount * 20);
        let visible = 0; for (let i = 0; i < pixels.length; i += 4) if (pixels[i] + pixels[i + 1] + pixels[i + 2] > 12) visible++;
        visit.meshes.push({ far, visible, uploads: sent.length, fresh: sent.length === 1 && sent[0].y === visit.y });
      }
      visits.push(visit); pile.dispose(); disposed = true;
    }
    rows.push({ name: "new visits upload their own shifted banana transforms even when both LOD versions repeat",
      ok: visits[0].version === visits[1].version && visits[0].count === visits[1].count && Math.abs(visits[1].y - visits[0].y - 5) < 1e-5
        && visits.every((visit) => visit.meshes.every((mesh) => mesh.visible > 100 && (!gl || mesh.fresh))), visits });
    renderer.releaseUnused(new Set());
    if (gl) {
      const block = S.createNode({ geometry: BL.models.box({ color: "#ff2244" }) }); S.addChild(root, block);
      Object.assign(camera.target, { x: 0, y: 0, z: 0 }); Object.assign(camera.position, { x: 0, y: 0, z: 4 });
      const sizes = [];
      for (const dimensions of [[3446, 1864], [5120, 2880]]) {
        [width, height] = dimensions;
        for (const quality of ["high", "low"]) {
          renderer.setQuality(quality); renderer.resize(); await render();
          const pixel = new Uint8Array(4); gl.readPixels(Math.floor(canvas.width / 2), Math.floor(canvas.height / 2), 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel);
          sizes.push({ quality, width, height, pixels: canvas.width * canvas.height, visible: pixel[0] > pixel[1] + 40 && pixel[0] > pixel[2] + 20, error: gl.getError() });
        }
      }
      rows.push({ name: "large display sizes respect the 2.6-million-pixel budget at every quality and still draw", ok: sizes.every((r) => r.pixels <= 2600000 && r.pixels > 2500000 && r.visible && !r.error), sizes });
      S.removeChild(root, block); renderer.releaseUnused(new Set());
    }
  } finally {
    if (!disposed) pile.dispose(); renderer.dispose(); for (const restore of restores) restore();
  }
  rows.push({ name: "teardown releases all pile nodes, vertex arrays and buffers", ok: root.children.length === 0 && liveBuffers.size === 0 && liveArrays.size === 0,
    nodes: root.children.length, buffers: liveBuffers.size, arrays: liveArrays.size });
  return { backend, rows };
};
