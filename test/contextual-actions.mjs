export const contextualActionProbe = async ({ kind = "matrix", mode = "trailing", dt = 1 / 60 } = {}) => {
  const B = window.__ooga, BL = window.BL, scene = BL.scenes.hub, crew = B.crew, H = B.headquarters;
  const cave = [...B.cavemen.values()].find((c) => c.state === "working" && !c.build);
  const others = [...B.cavemen.values()].filter((c) => c !== cave).map((c) => ({ cave: c, visible: c.root.visible }));
  let time = B.renderOpts.matrix.time;
  const step = () => scene.update(dt, time += dt);
  const key = (type, value) => window.dispatchEvent(new KeyboardEvent(type, { key: value, bubbles: true, cancelable: true }));
  const press = () => { key("keydown", " "); key("keyup", " "); };
  const canvas = document.getElementById("scene"), button = document.getElementById("act");
  const chord = (buttons) => {
    // Synthetic pointers have no browser capture owner. Keep the real event
    // handlers, stubbing capture only for this fixture's synchronous dispatch.
    const descriptor = Object.getOwnPropertyDescriptor(canvas, "setPointerCapture"), capture = canvas.setPointerCapture;
    canvas.setPointerCapture = (id) => { if (id !== 71) capture.call(canvas, id); };
    try { canvas.dispatchEvent(new PointerEvent(buttons ? "pointermove" : "pointerup", { pointerType: "mouse", buttons, pointerId: 71, bubbles: true })); }
    finally {
      if (descriptor) Object.defineProperty(canvas, "setPointerCapture", descriptor);
      else delete canvas.setPointerCapture;
    }
  };
  const label = () => button.textContent;
  const releaseKeys = () => { for (const k of ["w", "q", " "]) key("keyup", k); chord(0); };
  for (const entry of others) entry.cave.root.visible = false;
  B.pilot.possess(cave); crew.removeJetpack(cave);
  if (mode === "first-person") { B.pilot.enterClose(); B.pilot.update(1); }
  BL.scene.updateWorld(scene.root); H.solids.props.sync();
  const mouth = B.mouths.find((m) => m.id === "c9"), roof = B.launchers[0], seat = H.benches[0];
  const local = (x, z, top = false) => {
    const origin = kind === "drop" ? roof : mouth, sr = Math.sin(origin.ry), cr = Math.cos(origin.ry);
    const px = origin.x + cr * x + sr * z, pz = origin.z - sr * x + cr * z;
    const base = kind === "drop" ? roof.y : mouth.floorY;
    const hint = base + (top ? 2.5 : 0.05), y = H.solids.supportAt(px, pz, hint, hint, cave);
    return { x: px, y, z: pz, yaw: origin.ry, name: `${x},${z}${top ? ":top" : ""}` };
  };
  let points;
  if (kind === "race") points = [local(-1.85, -3.6), local(1.85, -4), local(0, -5.6), local(1, -3.6, true), local(0, -1.6)];
  else if (kind === "drop") points = [local(-3.2, 0.9), local(3.2, 0.9), local(0, -2.7), local(1.5, 0.35, true), local(0, 2.7)];
  else if (kind === "bench") points = [{ ...seat.walkAt, y: seat.floor, yaw: seat.ry, name: "bench" }];
  else {
    const m = B.mirrorCave.mouth, w = B.matrixGate.button.world;
    points = [{ x: w[12] + Math.sin(m.ry) * 1.5, y: m.floorY, z: w[14] + Math.cos(m.ry) * 1.5, yaw: m.ry, name: "button" }];
  }
  const place = (point) => {
    releaseKeys(); crew.relocatePlayer(point, point.yaw);
    B.pilot.orbit.yaw = B.pilot.orbit.tYaw = point.yaw + Math.PI;
    step();
  };
  const unchanged = (pressed) => B.scene === "hub" && crew.player === cave && !cave.camp.seat && B.matrixGate.pressed === pressed;
  const rows = [];
  try {
    for (const point of points) {
      const row = { point: point.name, y: point.y };
      place(point);
      const p = cave.root.position, feet = p.y - cave.baseY;
      row.clear = B.island.clearAt(p.x, feet + 1e-5, p.z, 0.295, cave.bodyHeight - 1e-5)
        && H.solids.props.clearAt(p.x, feet + 1e-5, p.z, 0.295, cave.bodyHeight - 1e-5);
      row.stopped = label();
      let before = B.matrixGate.pressed;
      key("keydown", "w"); press();
      row.fresh = { jumped: cave.hopV > 0 && cave.jumps === 1, unchanged: unchanged(before) };
      if (crew.player !== cave) { rows.push(row); return { backend: B.renderer.kind, kind, mode, rows, enteredWhileMoving: true }; }
      key("keyup", "w"); step();
      row.airborne = { label: label(), elevated: cave.hop > 0 };
      before = B.matrixGate.pressed; press();
      row.airborne.unchanged = unchanged(before);
      row.airborne.secondJump = cave.jumps === 2 && cave.hopV > 0;

      place(point); key("keydown", "w"); step();
      row.moving = label(); before = B.matrixGate.pressed; press();
      row.held = { jumped: cave.hopV > 0 && cave.jumps === 1, unchanged: unchanged(before) };
      if (crew.player !== cave) { rows.push(row); return { backend: B.renderer.kind, kind, mode, rows, enteredWhileMoving: true }; }

      place(point); chord(3); before = B.matrixGate.pressed; press();
      row.chord = { jumped: cave.hopV > 0 && cave.jumps === 1, unchanged: unchanged(before) };
      if (crew.player !== cave) { rows.push(row); return { backend: B.renderer.kind, kind, mode, rows, enteredWhileMoving: true }; }
      place(point); key("keydown", "q"); step(); row.looking = label(); key("keyup", "q");
      rows.push(row);
    }
    const expected = kind === "drop" ? "FLY PLANE" : kind === "race" ? "START RALLY" : kind === "bench" ? "SIT" : B.matrixGate.pressed ? "PRESS OUT" : "PRESS IN";
    let wrongFloor = null, far = null;
    if (kind === "drop" || kind === "race") {
      const lower = { x: mouth.x - Math.cos(mouth.ry) * 1.85 - Math.sin(mouth.ry) * 3.6, y: mouth.floorY,
        z: mouth.z + Math.sin(mouth.ry) * 1.85 - Math.cos(mouth.ry) * 3.6, yaw: mouth.ry };
      place(kind === "drop" ? lower : { ...points[0], y: B.island.surfaceAt(points[0].x, points[0].z) });
      wrongFloor = label();
      place(local(9, kind === "drop" ? 0 : -3.6)); far = label();
    }
    let emergency = null;
    if (kind === "bench") {
      place(points[0]); crew.ignite(cave); key("keydown", "w"); step();
      const prompt = label(); press(); emergency = { prompt, rolling: cave.camp.rolling };
      releaseKeys(); for (let i = 0; i < Math.ceil(3.2 / dt); i++) step();
    }
    place(points[points.length - 1]);
    // The key release and action arrive before readInput runs again.
    key("keydown", "w"); step(); key("keyup", "w");
    const before = B.matrixGate.pressed, driver = cave.traits.name;
    press();
    const stoppedAction = { jumped: cave.hopV > 0, toggled: B.matrixGate.pressed !== before, seated: cave.camp.seat === seat, released: crew.player !== cave };
    if (kind === "race" || kind === "drop") {
      const start = performance.now();
      await new Promise((resolve) => {
        const poll = () => B.scene === kind || performance.now() - start > 10000 ? resolve() : requestAnimationFrame(poll);
        requestAnimationFrame(poll);
      });
      stoppedAction.scene = B.scene;
      stoppedAction.selected = kind === "drop" ? B.diver?.cave.traits.name === driver : B.scene === "race";
    }
    return { backend: B.renderer.kind, kind, mode, rows, expected, wrongFloor, far, emergency, stoppedAction, enteredWhileMoving: false };
  } finally {
    releaseKeys();
    for (const entry of others) entry.cave.root.visible = entry.visible;
  }
};
