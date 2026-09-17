// Exercise the HUD's actual click handlers. Navigation itself owns placement;
// this probe only selects a mode, holds movement keys, and inspects the result.
export const navigationButtonsProbe = ({ mode = "orbit", level = 300 } = {}) => {
  const B = window.__ooga, scene = window.BL.scenes.hub, island = B.island, H = island.headquarters;
  const driven = mode === "trailing" || mode === "first-person", close = mode === "eye-level" || mode === "first-person";
  const cave = driven ? [...B.cavemen.values()].find((entry) => entry.state === "working") : null;
  const held = new Set(), rows = [], violations = [], sequence = ["pile", "lab", "mirror", "underground", "basement", "mirror", "lab", "pile", "basement", "underground", "pile"];
  let elapsed = B.matrixCave.world.sampleStream(0).time, samples = 0, selected = null, equipment = null, stripped = false;
  const keys = (next) => {
    for (const key of held) if (!next.includes(key)) { window.dispatchEvent(new KeyboardEvent("keyup", { key })); held.delete(key); }
    for (const key of next) if (!held.has(key)) { window.dispatchEvent(new KeyboardEvent("keydown", { key })); held.add(key); }
  };
  const position = () => cave ? cave.root.position : B.camera.position;
  const inspect = () => {
    samples++;
    const eye = B.camera.position;
    const check = (kind, x, y, z) => {
      if (island.solidAt(x, y, z) && violations.length < 5) violations.push({ kind, sample: samples, x, y, z });
    };
    // A selected trailing camera may deliberately pass through rock and show
    // its filled-rock treatment. Physical close views must remain clear.
    if (!cave || close) for (const y of [-0.16, 0, 0.16]) for (let i = 0; i < 8; i++) {
      const angle = i * Math.PI / 4;
      check("eye", eye.x + Math.sin(angle) * 0.2, eye.y + y, eye.z + Math.cos(angle) * 0.2);
    }
    if (cave) {
      const p = cave.root.position, feet = p.y - cave.baseY;
      for (const y of [0.2, cave.headOffset * 0.6, cave.headOffset * 0.9]) for (let i = 0; i < 8; i++) {
        const angle = i * Math.PI / 4;
        check("body", p.x + Math.sin(angle) * 0.2, feet + y, p.z + Math.cos(angle) * 0.2);
      }
    }
  };
  const tick = (frames, input = [], check = true) => {
    keys(input);
    for (let i = 0; i < frames; i++) { scene.update(1 / 60, elapsed += 1 / 60); if (check) inspect(); }
    keys([]);
  };
  const project = (point) => {
    // Renderer matrices belong to the last drawn frame; derive this frame's
    // projection directly from the authored eye, look target, FOV and aspect.
    const camera = B.camera, eye = camera.position, target = camera.target;
    const length = Math.hypot(target.x - eye.x, target.y - eye.y, target.z - eye.z);
    const fx = (target.x - eye.x) / length, fy = (target.y - eye.y) / length, fz = (target.z - eye.z) / length, horizontal = Math.hypot(fx, fz);
    const dx = point.x - eye.x, dy = point.y - eye.y, dz = point.z - eye.z;
    const depth = dx * fx + dy * fy + dz * fz, tangent = Math.tan(camera.fov / 2), aspect = B.renderer.size.width / B.renderer.size.height;
    const x = 0.5 + (-fz * dx + fx * dz) / horizontal / (2 * depth * tangent * aspect);
    const y = 0.5 - (-fx * fy * dx / horizontal + horizontal * dy - fz * fy * dz / horizontal) / (2 * depth * tangent);
    return { x, y, depth, visible: depth > camera.near && x >= 0.05 && x <= 0.95 && y >= 0.05 && y <= 0.95 };
  };
  const avatarBlocker = (target) => {
    if (!cave) return null;
    window.BL.scene.updateWorld(cave.root);
    const eye = B.camera.position, direction = [target.x - eye.x, target.y - eye.y, target.z - eye.z];
    // Intersect the actual posed head/torso triangles, not an oversized body
    // bounding box that could falsely cover a visible hearth between limbs.
    const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
    const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
    const subtract = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
    for (const [name, node] of [["head", cave.parts.head], ["torso", cave.parts.torso]]) {
      if (!node.visible || node.cameraHidden) continue;
      const g = node.geometry, m = node.world, vertices = [];
      for (let i = 0; i < g.verts.length; i += 3) {
        const x = g.verts[i], y = g.verts[i + 1], z = g.verts[i + 2];
        vertices.push([m[0] * x + m[4] * y + m[8] * z + m[12], m[1] * x + m[5] * y + m[9] * z + m[13], m[2] * x + m[6] * y + m[10] * z + m[14]]);
      }
      for (const face of g.faces) for (let i = 1; i < face.i.length - 1; i++) {
        const a = vertices[face.i[0]], b = vertices[face.i[i]], c = vertices[face.i[i + 1]], e1 = subtract(b, a), e2 = subtract(c, a), h = cross(direction, e2), det = dot(e1, h);
        if (Math.abs(det) < 1e-8) continue;
        const s = [eye.x - a[0], eye.y - a[1], eye.z - a[2]], u = dot(s, h) / det;
        if (u < 0 || u > 1) continue;
        const q = cross(s, e1), v = dot(direction, q) / det;
        if (v < 0 || u + v > 1) continue;
        const t = dot(e2, q) / det;
        if (t > 1e-5 && t < 1 - 1e-5) return name;
      }
    }
    return null;
  };
  const framing = (destination) => {
    if (destination === "lab" || destination === "mirror") {
      const id = destination === "lab" ? "c11" : "c1", mouth = B.mouths.find((entry) => entry.id === id);
      const slot = window.BL.caves.slots.find((entry) => entry.id === id), label = B.labels.find((entry) => entry.text === slot.name);
      return { center: project({ x: mouth.x, y: mouth.floorY + 1.75, z: mouth.z }), sign: project(label) };
    }
    if (destination === "underground") {
      const node = B.headquarters.lights.find((entry) => entry.id === "headquarters:hearth").node;
      window.BL.scene.updateWorld(scene.root);
      const b = window.BL.scene.boundsOf(node.geometry), m = node.world, x = (b.min[0] + b.max[0]) / 2, y = (b.min[1] + b.max[1]) / 2, z = (b.min[2] + b.max[2]) / 2;
      const flame = { x: m[0] * x + m[4] * y + m[8] * z + m[12], y: m[1] * x + m[5] * y + m[9] * z + m[13], z: m[2] * x + m[6] * y + m[10] * z + m[14] };
      return { fire: project(flame), blocker: avatarBlocker(flame) };
    }
    return null;
  };
  const snapshot = (destination) => {
    const p = position(), eye = B.camera.position, look = B.camera.target, column = {};
    const x = p.x, y = p.y - (cave ? cave.baseY : 0), z = p.z;
    const opening = B.cameraCave.openings.find((entry) => entry.caveIndex === B.cameraCave.index);
    const playerOpening = B.cameraCave.openings.find((entry) => entry.caveIndex === B.cameraCave.playerIndex);
    let targetX = 0, targetZ = 0, near = false, detail = null;
    if (destination === "underground" || destination === "basement") {
      const inside = island.cavityAt(x, z, column, H.caveIndex);
      const level = destination === "basement" ? H.basement : H;
      near = inside && column.caveIndex === H.caveIndex && y >= level.floor && y < level.ceiling && Math.hypot(x - level.room.x, z - level.room.z) < level.room.radius && (destination !== "basement" || Math.hypot(x - level.hole.x, z - level.hole.z) > level.hole.mouthRadius);
      detail = { height: y, radius: Math.hypot(x, z), floor: column.floor };
    } else if (destination === "pile") {
      const radius = Math.hypot(x, z), edge = B.altar.platformRadius;
      near = radius > edge + 0.2 && radius < edge + 16 && y >= -0.01;
      detail = { radius, edge };
    } else {
      const mouth = B.mouths.find((entry) => entry.id === (destination === "lab" ? "c11" : "c1"));
      targetX = mouth.x; targetZ = mouth.z;
      const dx = x - mouth.x, dz = z - mouth.z, along = dx * Math.sin(mouth.ry) + dz * Math.cos(mouth.ry), across = dx * Math.cos(mouth.ry) - dz * Math.sin(mouth.ry);
      // Safe lateral offsets may move an orbit eye farther sideways than the
      // feet. It must remain in the entrance's forward cone and face its mouth.
      near = along > 0.6 && along < 18 && Math.abs(across) < Math.max(2, along * 0.5) && y >= mouth.floorY;
      detail = { along, across };
    }
    const dx = targetX - eye.x, dz = targetZ - eye.z, fx = look.x - eye.x, fz = look.z - eye.z;
    const faceDot = (dx * fx + dz * fz) / Math.max(1e-9, Math.hypot(dx, dz) * Math.hypot(fx, fz));
    const bodyDot = cave ? ((targetX - x) * Math.sin(cave.root.rotation.y) + (targetZ - z) * Math.cos(cave.root.rotation.y)) / Math.max(1e-9, Math.hypot(targetX - x, targetZ - z)) : 1;
    const layer = destination === "underground" || destination === "basement" ? !!opening && opening.headquarters && (!cave || !!playerOpening && playerOpening.headquarters) : B.cameraCave.index === 0 && B.cameraCave.playerIndex === 0;
    return { destination, near, detail, faceDot, bodyDot, layer, framing: framing(destination), mode: B.pilot.mode, selected: B.pilot.player === selected && B.crew.player === selected, equipment: !cave || (stripped ? !cave.jet : cave.jet === equipment), camera: B.cameraCave.index, player: B.cameraCave.playerIndex, eye: [eye.x, eye.y, eye.z], body: cave ? [x, y, z] : null, scene: B.scene, insideMirror: B.matrixCave.inside };
  };
  const click = (destination, move = true) => {
    const button = document.querySelector(`nav[data-scene="hub"] [data-preset="${destination}"]`);
    if (!button) throw new Error(`Missing ${destination} navigation button`);
    button.focus(); button.click();
    if (destination === "underground" || destination === "basement") stripped = true;
    inspect();
    tick(24);
    const row = snapshot(destination), p = position(), x = p.x, y = p.y, z = p.z;
    row.blurred = document.activeElement !== button;
    row.exercised = move;
    if (move) tick(18, ["a"]);
    row.movement = Math.hypot(p.x - x, p.y - y, p.z - z);
    tick(12);
    row.responsiveMode = B.pilot.mode;
    rows.push(row);
    return row;
  };
  B.setPileLevel(level);
  for (const entry of B.cavemen.values()) entry.nextBuildAt = 1e9;
  if (cave) B.pilot.possess(cave);
  if (close) B.pilot.hooks.onZoom(0.01);
  tick(90, [], false);
  selected = B.pilot.player;
  if (mode === "first-person") tick(1, ["j"], false);
  equipment = cave && cave.jet;
  const initial = { mode: B.pilot.mode, selected: !!selected, equipment: !!equipment };
  let caveOrigin = null, airborne = null;
  try {
    for (const destination of sequence) click(destination);
    if (close) {
      click("mirror", false);
      const mouth = B.mouths.find((entry) => entry.id === "c1"), index = island.mouths.indexOf(mouth) + 1;
      let frames = 0;
      while ((cave ? B.cameraCave.playerIndex : B.cameraCave.index) !== index && frames++ < 240) tick(1, ["w"]);
      tick(12, ["w"]);
      caveOrigin = { entered: (cave ? B.cameraCave.playerIndex : B.cameraCave.index) === index, frames, from: [position().x, position().y, position().z] };
      caveOrigin.underground = click("underground");
      caveOrigin.outside = click("lab");
    }
    if (equipment) {
      click("pile", false);
      // Find clear ground: nearby props and bananas now consume the press.
      let takeoff = null;
      for (let r = 10; r < 19 && !takeoff; r++) for (let i = 0; i < 64; i++) {
        const a = i / 64 * Math.PI * 2, x = Math.sin(a) * r, z = Math.cos(a) * r;
        if (!island.onLand(x, z) || island.surfaceAt(x, z) !== 0 || B.props.some((o) => o.active && Math.hypot(o.x - x, o.z - z) < 3.5) || [...B.cavemen.values()].some((c) => c !== cave && Math.hypot(c.root.position.x - x, c.root.position.z - z) < 3.5)) continue;
        takeoff = { x, y: 0, z }; break;
      }
      if (!takeoff) throw new Error("No clear takeoff fixture");
      B.crew.relocatePlayer(takeoff, 0);
      tick(1, ["j"], false);
      const flyingEquipment = cave.jet;
      tick(18, [" "]);
      airborne = { before: cave.hop, thrust: cave.jet.thrust };
      click("underground", false);
      airborne.after = { hop: cave.hop, velocity: cave.hopV, removed: !cave.jet, oldNodeRemoved: !cave.root.children.includes(flyingEquipment.node) };
    }
    return { backend: B.renderer.kind, initial, mode, level, rows, caveOrigin, airborne, violations, samples, scene: B.scene };
  } finally { keys([]); }
};

export const navigationButtonLayoutProbe = () => {
  const nav = document.querySelector('nav[data-scene="hub"]'), brand = document.querySelector(".brand"), clock = document.getElementById("world-clock"), bananas = document.querySelector(".world-bananas"), labels = [];
  const buttons = [...nav.querySelectorAll("button")].map((button) => {
    const r = button.getBoundingClientRect(), hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
    const label = button.textContent.trim();
    labels.push(getComputedStyle(button).textTransform === "uppercase" ? label.toUpperCase() : label);
    return { id: button.dataset.preset, x: r.x, y: r.y, width: r.width, height: r.height, hittable: hit === button || button.contains(hit), visible: !button.hidden && getComputedStyle(button).visibility === "visible" };
  });
  const bounds = nav.getBoundingClientRect(), title = brand.getBoundingClientRect(), clockBounds = clock.getBoundingClientRect(), bananaBounds = bananas.getBoundingClientRect();
  const intersects = (a, b) => Math.min(a.right, b.right) > Math.max(a.left, b.left) + 0.1 && Math.min(a.bottom, b.bottom) > Math.max(a.top, b.top) + 0.1;
  let overlap = false;
  for (let i = 0; i < buttons.length; i++) for (let j = 0; j < i; j++) {
    const a = buttons[i], b = buttons[j];
    if (Math.min(a.x + a.width, b.x + b.width) > Math.max(a.x, b.x) + 0.1 && Math.min(a.y + a.height, b.y + b.height) > Math.max(a.y, b.y) + 0.1) overlap = true;
  }
  const titleStyle = getComputedStyle(brand.querySelector("h1")), subtitle = brand.querySelector("p:not([hidden])"), bananaStyle = getComputedStyle(bananas);
  return { buttons, labels, overlap, singleRow: buttons.every((button) => Math.abs(button.y - buttons[0].y) < 0.1), scrollable: nav.scrollWidth > nav.clientWidth, scrollLeft: nav.scrollLeft, scrollMax: nav.scrollWidth - nav.clientWidth, brandClear: bounds.top >= title.bottom - 0.1 || bounds.left >= title.right - 0.1, clockCentered: Math.abs(clockBounds.left + clockBounds.width / 2 - innerWidth / 2) < 0.1, clockClear: !intersects(clockBounds, title) && !intersects(clockBounds, bounds), bananaClear: !intersects(bananaBounds, title) && !intersects(bananaBounds, bounds), bananaBelowClock: bananaBounds.top >= clockBounds.bottom, bananaCount: document.getElementById("world-banana-count").textContent, bananaLevel: Math.floor(window.__ooga.level), titleSize: parseFloat(titleStyle.fontSize), clockSize: parseFloat(getComputedStyle(clock).fontSize), subtitleVisible: !!subtitle && getComputedStyle(subtitle).display !== "none", subtitleSize: subtitle ? parseFloat(getComputedStyle(subtitle).fontSize) : 0, bananaSize: parseFloat(bananaStyle.fontSize), clock: clockBounds.toJSON(), bananas: bananaBounds.toJSON(), resetCount: document.querySelectorAll('[data-action="reset-view"]').length, viewport: innerWidth, documentWidth: document.documentElement.scrollWidth };
};
