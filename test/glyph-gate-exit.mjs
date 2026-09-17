// Use real Space/movement routing at each rotated entrance. Wave and initial
// placement are fixtures; gate movement and its local release use production.
export const glyphGateExitProbe = ({ mode = "trailing", dt = 1 / 60 } = {}) => {
  const B = window.__ooga, scene = window.BL.scenes.hub, G = B.matrixGate, W = B.renderOpts.matrix;
  const cave = [...B.cavemen.values()].find((c) => c.state === "working" && !c.jet), held = new Set();
  const failures = [], rows = [], saved = { active: W.active, radius: W.radius, direction: W.direction };
  let time = W.time, pinWave = true;
  const fail = (name, detail) => { if (failures.length < 16) failures.push({ name, ...detail }); };
  const key = (type, value, repeat = false) => window.dispatchEvent(new KeyboardEvent(type, { key: value, repeat }));
  const press = (value) => { key("keydown", value); held.add(value); };
  const release = (value) => { key("keyup", value); held.delete(value); };
  const step = (count = 1) => {
    for (let i = 0; i < count; i++) {
      // Keep a completed wave present at the non-mirror gates as well, without
      // pressing the rear control (which intentionally opens every gate).
      if (pinWave) { W.active = 1; W.radius = W.maxRadius; W.direction = 0; }
      scene.update(dt, time += dt);
    }
  };
  const point = (gate, along, across = 0, lift = 0) => ({ x: gate.mouth.x + gate.sr * along + gate.cr * across, y: gate.mouth.floorY + lift, z: gate.mouth.z + gate.cr * along - gate.sr * across });
  const alongAt = (gate, p = cave.root.position) => (p.x - gate.mouth.x) * gate.sr + (p.z - gate.mouth.z) * gate.cr;
  const label = () => document.getElementById("act").textContent;
  const close = (gate, lift = gate.floor) => { gate.localOpen = gate.open = gate.raising = false; gate.node.position.y = lift; gate.node.visible = lift + gate.bottom < gate.ceiling; };
  const place = (gate, along, across = 0) => {
    const p = point(gate, along, across);
    // The HQ entrances already slope below the mouth's nominal floor here.
    // Start on their actual support so gravity is not mistaken for a Space
    // jump when checking that the gate consumes the interaction.
    p.y = B.headquarters.solids.supportAt(p.x, p.z, p.y, p.y, cave);
    B.crew.relocatePlayer(p, gate.mouth.ry + Math.PI);
    B.pilot.orbit.yaw = B.pilot.orbit.tYaw = gate.mouth.ry;
    B.pilot.orbit.pitch = B.pilot.orbit.tPitch = 0;
    step();
  };
  const sweep = (gate, a, b, lift = 0, height = cave.bodyHeight) => {
    const from = point(gate, a, 0, lift), to = point(gate, b, 0, lift);
    return G.segmentClear(from.x, from.y, from.z, to.x, to.y, to.z, 0.3, height);
  };
  B.pilot.possess(cave);
  if (mode === "first-person") B.pilot.enterClose();
  G.set(false);
  let safety = null, cycle = null, free = null;
  try {
    for (const gate of G.gates) {
      close(gate); place(gate, gate.minZ - 0.7); step(Math.ceil(0.3 / dt));
      const before = alongAt(gate), prompt = label();
      press("s"); step(Math.ceil(0.5 / dt)); release("s");
      const stopped = alongAt(gate), stoppedY = cave.root.position.y - cave.baseY;
      const walk = { before, stopped, stoppedY, limit: gate.minZ - 0.3, prompt };
      if (prompt !== "OPEN GATE!" || stopped > gate.minZ - 0.3 + 1e-6 || stopped < before + 0.05) fail("closed gate movement", { id: gate.mouth.id, ...walk });
      const closedSweep = sweep(gate, gate.minZ - 8, gate.maxZ + 8);
      const airborneSweep = sweep(gate, gate.minZ - 4, gate.maxZ + 4, 0.45);
      const corners = [];
      for (const side of [-1, 1]) {
        const edge = side < 0 ? gate.minX : gate.maxX;
        const acrossSweep = (offset, diagonal) => {
          const from = point(gate, gate.minZ - 1, edge + side * offset), to = point(gate, gate.maxZ + 1, edge + side * (diagonal ? -0.5 : offset));
          return G.segmentClear(from.x, from.y, from.z, to.x, to.y, to.z, 0.3, cave.bodyHeight);
        };
        const row = { side, roundedContact: acrossSweep(0.15, false), beyondEdge: acrossSweep(0.32, false), diagonal: acrossSweep(1, true) };
        corners.push(row);
        if (row.roundedContact || !row.beyondEdge || row.diagonal) fail("rounded gate edge sweep", { id: gate.mouth.id, ...row });
      }
      close(gate, 0.8);
      const partialSweep = sweep(gate, gate.minZ - 4, gate.maxZ + 4), belowSweep = sweep(gate, gate.minZ - 4, gate.maxZ + 4, 0, 0.4);
      close(gate);
      const facings = [];
      for (let turn = 0; turn < 4; turn++) {
        close(gate); place(gate, gate.minZ - 0.7);
        B.pilot.orbit.yaw = B.pilot.orbit.tYaw = gate.mouth.ry + turn * Math.PI / 2;
        cave.root.rotation.y = gate.mouth.ry + turn * Math.PI / 2;
        step();
        const text = label(), y = gate.node.position.y, other = G.gates.filter((g) => g !== gate).map((g) => g.localOpen);
        press(" ");
        const latched = gate.localOpen, immediateY = gate.node.position.y, immediateSweep = sweep(gate, gate.minZ - 4, gate.maxZ + 4);
        for (let i = 0; i < 5; i++) { key("keydown", " ", true); step(); }
        const row = { turn, text, latched, y, immediateY, immediateSweep, hop: cave.hop, jumps: cave.jumps, risingY: gate.node.position.y, othersUnchanged: G.gates.filter((g) => g !== gate).every((g, i) => g.localOpen === other[i]) };
        release(" "); facings.push(row);
        if (text !== "OPEN GATE!" || !latched || immediateY !== y || immediateSweep || cave.hop !== 0 || cave.jumps !== 0 || row.risingY <= y || !row.othersUnchanged) fail("one local action from any facing", { id: gate.mouth.id, ...row });
      }
      step(Math.ceil(1.2 / dt));
      const openSweep = sweep(gate, gate.minZ - 4, gate.maxZ + 4);
      B.pilot.orbit.yaw = B.pilot.orbit.tYaw = gate.mouth.ry;
      press("s"); step(Math.ceil(0.45 / dt)); release("s");
      const exited = alongAt(gate);
      if (closedSweep || airborneSweep || partialSweep || !belowSweep || !openSweep || exited <= gate.maxZ + 0.3) fail("physical opening and swept blocking", { id: gate.mouth.id, closedSweep, airborneSweep, partialSweep, belowSweep, openSweep, exited });
      close(gate); place(gate, gate.maxZ + 0.65);
      const outsidePrompt = label(), p = cave.root.position;
      const outsideAction = G.openNear(p.x, p.y - cave.baseY + 1.1, p.z);
      if (outsidePrompt === "OPEN GATE!" || outsideAction) fail("outside cannot release", { id: gate.mouth.id, outsidePrompt, outsideAction });
      press("w"); step(Math.ceil(0.35 / dt)); release("w");
      const outsideStopped = alongAt(gate);
      if (outsideStopped < gate.maxZ + 0.3 - 1e-6) fail("closed gate blocks entry", { id: gate.mouth.id, outsideStopped, limit: gate.maxZ + 0.3 });
      rows.push({ id: gate.mouth.id, walk, closedSweep, airborneSweep, corners, partialSweep, belowSweep, openSweep, exited, outsidePrompt, outsideAction, outsideStopped, facings });
    }

    const gate = G.gates.find((g) => g.mouth.id === "c1");
    close(gate, G.hiddenHeight); place(gate, gate.node.position.z - 0.1);
    const earlyPrompt = label();
    step(Math.ceil(1.2 / dt));
    const head = cave.root.position.y - cave.baseY + cave.bodyHeight + Math.max(0, cave.viewLift);
    const bottom = gate.mouth.floorY + gate.node.position.y + gate.bottom, stoppedAtHead = gate.held;
    // The regular jump path must respect a gate held over the doorway too.
    // Space itself is the release here, so call its existing jump primitive.
    B.crew.jumpPlayer();
    let penetration = 0;
    for (let i = 0; i < Math.ceil(0.25 / dt); i++) {
      step();
      penetration = Math.max(penetration, cave.root.position.y - cave.baseY + cave.bodyHeight + Math.max(0, cave.viewLift) - gate.mouth.floorY - gate.node.position.y - gate.bottom);
    }
    const ceiling = G.ceilingAt(cave.root.position.x, cave.root.position.z, cave.root.position.y - cave.baseY);
    press("w"); step(Math.ceil(0.2 / dt)); release("w");
    const escapedInward = alongAt(gate) < gate.minZ - 0.3, resumedDescent = gate.node.position.y + gate.bottom < bottom - gate.mouth.floorY;
    safety = { earlyPrompt, head, bottom, stoppedAtHead, penetration, ceiling, escapedInward, resumedDescent };
    if (earlyPrompt !== "OPEN GATE!" || !stoppedAtHead || bottom < head - 1e-7 || penetration > 1e-7 || !Number.isFinite(ceiling) || !escapedInward || !resumedDescent) fail("descending gate body safety", safety);

    place(gate, gate.minZ - 0.7); press(" "); step(); release(" ");
    const local = gate.localOpen; G.set(true); G.set(false); step(); const rearReset = !gate.localOpen;
    press(" "); step(); release(" "); const reopened = gate.localOpen;
    pinWave = false; W.active = 0; W.radius = 0; W.direction = 0;
    // The source actor remains near the threshold, so the world may grow while
    // inside the mirror. A stationary overlay does not change gate state;
    // temporarily release possession and navigate outside before one update.
    B.pilot.release(true); B.matrixCave.viewApproach(); W.active = 0; W.radius = 0; W.direction = 0; step();
    cycle = { local, rearReset, reopened, offReset: !gate.localOpen };
    if (!local || !rearReset || !reopened || !cycle.offReset) fail("local latch rearm", cycle);

    pinWave = true; close(gate);
    const inside = point(gate, gate.minZ - 0.7), target = point(gate, -3, 0, 1.1);
    B.pilot.enterClose();
    B.pilot.navigate({ position: inside, target, yaw: gate.mouth.ry, pitch: 0, dist: 3.5 }); step(Math.ceil(0.3 / dt));
    const cameraBefore = alongAt(gate, B.camera.position);
    press("s"); step(Math.ceil(0.65 / dt)); release("s");
    const cameraAfter = alongAt(gate, B.camera.position);
    free = { mode: B.pilot.mode, cameraBefore, cameraAfter, closed: gate.node.position.y === gate.floor, local: gate.localOpen };
    if (free.mode !== "eye-level" || cameraAfter <= gate.maxZ + 0.3 || !free.closed || free.local) fail("free camera passes closed gate", free);
    return { mode, dt, backend: B.renderer.kind, gateCount: G.gates.length, rows, safety, cycle, free, failures };
  } finally {
    for (const value of held) key("keyup", value);
    Object.assign(W, saved);
  }
};
