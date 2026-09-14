// Exercise the real overlay from clear apertures and through solid room walls.
export const sleepVisibilityProbe = () => {
  const B = window.__ooga, scene = BL.scenes.hub, beds = B.headquarters.mattresses;
  const entries = [...B.cavemen.values()], cave = entries.find((c) => c.state === "working");
  for (const c of entries) c.override = "working";
  B.refreshStates(true);
  B.pilot.possess(cave);
  const overlay = document.getElementById("overlay"), ctx = overlay.getContext("2d"), original = ctx.fillText;
  let drawn = 0, time = B.renderOpts.matrix.time;
  const rows = [];
  ctx.fillText = function(text, ...args) { if (text === "z") drawn++; return original.call(this, text, ...args); };
  const view = (name, eye, target, expected, bed) => {
    Object.assign(B.camera.position, eye);
    Object.assign(B.camera.target, target);
    B.camera.up = null;
    B.renderer.render(scene.root, B.camera, B.renderOpts);
    drawn = 0;
    scene.overlay(0);
    const visible = B.headquarters.sleepMarksVisible(cave);
    const head = cave.sleepHead;
    const headBlocked = !B.island.voxelSegmentClearAt(eye.x, eye.y, eye.z, head.x, head.y, head.z, 0.002, 0.004);
    return { name, expected, visible, drawn, headBlocked, room: bed.roomIndex, basement: bed.basement };
  };
  try {
    for (const bed of beds) {
      if (B.crew.sleeping) B.crew.wakePlayer();
      B.pilot.navigate({ position: { x: bed.x, y: bed.y + bed.sleep.surface, z: bed.z }, yaw: -bed.room.angle, pitch: 0.5, dist: 5 });
      cave.zzzTimer = 0;
      const started = B.crew.sleepPlayer(bed);
      for (let i = 0; i < 60; i++) scene.update(1 / 60, time += 1 / 60);
      // Age marks from the previous bed, then emit a fresh mark from this one.
      scene.overlay(3);
      cave.zzzTimer = 0;
      scene.update(1 / 60, time += 1 / 60);
      const head = { ...cave.sleepHead }, room = bed.room, w = bed.window;
      const near = { x: bed.x + bed.cr * 1.4, y: bed.y + 1.6, z: bed.z - bed.sr * 1.4 };
      const cases = [view("sleeper", near, head, true, bed)];
      cases.push(view("doorway", { x: room.approach.x, y: bed.y + 1.8, z: room.approach.z }, { x: room.entrance.x, y: bed.y + 1.8, z: room.entrance.z }, true, bed));
      if (w) cases.push(view("window", { x: Math.sin(w.angle) * 34, y: w.y, z: -Math.cos(w.angle) * 34 }, { x: w.x, y: w.y, z: w.z }, true, bed));
      cases.push(view("floor above", { x: room.x, y: 8, z: room.z }, head, false, bed));
      const others = beds.filter((other) => other !== bed && other.basement === bed.basement);
      // The upper gallery gives some adjacent doorways a legitimate shared
      // sightline. Use the earlier quarter across its wall for that level.
      const neighbor = bed.basement ? others.sort((a, b) => Math.hypot(a.room.x - room.x, a.room.z - room.z) - Math.hypot(b.room.x - room.x, b.room.z - room.z))[0] : others[0];
      cases.push(view("other room behind rock", { x: neighbor.x, y: neighbor.y + 1.8, z: neighbor.z }, head, false, bed));
      // A doorway can remain in view when facing away from the pillow, but
      // the marks behind the eye must never paint onto the screen.
      cases.push({ ...view("looking away", near, { x: near.x * 2 - head.x, y: near.y * 2 - head.y, z: near.z * 2 - head.z }, false, bed), projectionOnly: true });
      B.crew.wakePlayer();
      cases.push(view("awake", near, head, false, bed));
      rows.push({ started, woke: cave.state === "working", cases });
    }
    return { rows };
  } finally { ctx.fillText = original; }
};
