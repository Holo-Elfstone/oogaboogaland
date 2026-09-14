// A fitting character reaches a real sill where step smoothing would raise its
// head into the window. Every later jump and reversal uses production controls.
export const rampWindowContactProbe = ({ mode = "trailing", dt = 1 / 60 } = {}) => {
  const B = window.__ooga, scene = window.BL.scenes.hub, island = B.island;
  const windows = island.headquarters.windows.filter((w) => w.kind === "ramp");
  const cave = [...B.cavemen.values()].filter((c) => c.state === "working" && !c.jet && c.bodyHeight < Math.min(...windows.map((w) => w.height))).sort((a, b) => b.bodyHeight - a.bodyHeight)[0];
  const rows = [], failures = [], held = new Set();
  let time = B.renderOpts.matrix.time, samples = 0, previous = null, peak = -Infinity;
  const key = (value, down) => {
    if (held.has(value) === down) return;
    window.dispatchEvent(new KeyboardEvent(down ? "keydown" : "keyup", { key: value }));
    if (down) held.add(value); else held.delete(value);
  };
  const state = () => {
    const p = cave.root.position, y = p.y - cave.baseY, roof = island.ceilingAt(p.x, y, p.z, 0.3);
    return { x: p.x, y, z: p.z, hop: cave.hop, velocity: cave.hopV, lift: cave.viewLift, groundLift: B.pilot.groundLift, roof, head: y + cave.bodyHeight + Math.max(0, cave.viewLift), jumps: cave.jumps };
  };
  const step = (check = true) => {
    scene.update(dt, time += dt);
    if (!check) return;
    const s = state(), height = cave.bodyHeight + Math.max(0, cave.viewLift);
    samples++; peak = Math.max(peak, s.y);
    const clear = island.clearAt(s.x, s.y + 1e-5, s.z, 0.295, height - 1e-5);
    if ((!clear || s.head > s.roof + 1e-6 || Math.abs(s.lift - s.groundLift) > 1e-7 || B.scene !== "hub" || B.pilot.player !== cave || B.pilot.mode !== mode) && failures.length < 8) failures.push({ kind: "body", clear, ...s });
    if (previous && !island.voxelSegmentClearAt(previous.x, previous.y + 1e-5, previous.z, s.x, s.y + 1e-5, s.z, 0.295, Math.min(previous.height, height) - 1e-5) && failures.length < 8) failures.push({ kind: "sweep", before: previous, after: s });
    previous = { ...s, height };
  };
  const hold = (value, seconds) => {
    B.pilot.hooks.onOrbit(0, 0);
    key(value, true); for (let i = 0; i < Math.ceil(seconds / dt); i++) step(); key(value, false);
  };
  B.pilot.possess(cave);
  if (mode === "first-person") B.pilot.enterClose();
  try {
    for (const w of windows) {
      const sx = Math.sin(w.angle), sz = -Math.cos(w.angle), radius = Math.hypot(w.x, w.z);
      let fixture = null;
      for (let r = w.flare.innerRadius - 1.2; r <= w.flare.innerRadius + 0.5 && !fixture; r += 0.0625) for (let across = -w.width / 2 + 0.31; across <= w.width / 2 - 0.31 && !fixture; across += 0.0625) {
        if (r <= radius + 0.3) continue;
        const x = sx * r - sz * across, z = sz * r + sx * across;
        const y = island.supportAt(x, z, w.sill + 0.01, 0, -120, 0.3), roof = island.ceilingAt(x, y, z, 0.3), room = roof - y - cave.bodyHeight;
        const requested = Math.min(island.smoothSupportAt(x, z, y, 0.6, 0.3) - y, cave.baseY * 0.75);
        if (Math.abs(y - w.sill) > 1e-6 || room < 0.02 || room > 0.15 || requested <= room + 0.02 || !island.clearAt(x, y + 1e-5, z, 0.3, cave.bodyHeight - 1e-5)) continue;
        let routeClear = true;
        for (let d = 0; d <= 0.5; d += 0.05) if (!island.clearAt(x + sx * d, y + 1e-5, z + sz * d, 0.3, cave.bodyHeight - 1e-5)) routeClear = false;
        if (routeClear) fixture = { x, y, z, requested, room };
      }
      if (!fixture) { failures.push({ kind: "missing sill fixture", window: w.index }); continue; }
      previous = null;
      B.pilot.navigate({ position: fixture, yaw: Math.atan2(-sx, -sz), pitch: 0, dist: 3.5 });
      for (let i = 0; i < Math.ceil(0.2 / dt); i++) step();
      const contact = state();
      peak = contact.y;
      key(" ", true); step(); key(" ", false);
      const jumped = state();
      for (let i = 0; i < Math.ceil(0.4 / dt); i++) step();
      const rise = peak - contact.y, landed = state();
      hold("w", 0.05); const outward = state();
      hold("s", 0.05); const inward = state();
      rows.push({ index: w.index, basement: !!w.basement, fixture, contact, jumped, rise, landed, outward, inward, outwardDistance: Math.hypot(outward.x - contact.x, outward.z - contact.z), reverseDistance: Math.hypot(inward.x - outward.x, inward.z - outward.z) });
    }
    // This curved upper-ramp edge used to discard the sill under the outer
    // half of the feet and snap the character down into its solid sidewall.
    const w = windows.find((window) => window.index === 2), sx = Math.sin(w.angle), sz = -Math.cos(w.angle);
    const start = { x: sx * w.flare.innerRadius, y: w.sill, z: sz * w.flare.innerRadius };
    previous = null;
    B.pilot.navigate({ position: start, yaw: Math.atan2(-sx, -sz), pitch: 0, dist: 3.5 });
    for (let i = 0; i < Math.ceil(0.2 / dt); i++) step();
    const initial = state(); hold("a", 0.2); const contact = state(); hold("d", 0.2); const reversed = state();
    const lateral = { initial, contact, reversed, outwardDistance: Math.hypot(contact.x - initial.x, contact.z - initial.z), reverseDistance: Math.hypot(reversed.x - contact.x, reversed.z - contact.z) };
    return { mode, dt, rows, lateral, samples, failures, height: cave.bodyHeight, backend: B.renderer.kind };
  } finally { for (const value of held) key(value, false); }
};
