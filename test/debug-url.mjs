export const jetpackStartupSnapshot = () => {
  const B = window.__ooga, cave = B.pilot.player, button = document.getElementById("jetpack-hud"), bounds = button.getBoundingClientRect();
  return { selected: cave ? cave.traits.name : null,
    firstWorking: window.BL.contributors.roster.find((entry) => B.crew.stateOf(B.cavemen.get(entry.name)) === "working").name,
    mode: B.pilot.mode, owned: B.jetpack.owned, equipped: !!cave?.jet, fuel: cave && cave.jetFuel,
    hidden: button.hidden, disabled: button.disabled, opacity: Number(getComputedStyle(button).opacity),
    label: button.getAttribute("aria-label"), title: button.title, width: bounds.width, height: bounds.height,
    x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2,
    eyeY: B.camera.position.y, scene: B.scene, backend: B.renderer.kind };
};

export const basementStartupSnapshot = () => {
  const B = window.__ooga, island = B.island, H = island.headquarters, level = H.basement;
  const eye = B.camera.position, cave = B.pilot.player, p = cave ? cave.root.position : eye;
  const feet = p.y - (cave ? cave.baseY : 0), column = {};
  const inside = island.cavityAt(p.x, p.z, column, H.caveIndex, cave ? feet + 1.1 : p.y);
  return { backend: B.renderer.kind, scene: B.scene, mode: B.pilot.mode, mix: B.pilot.closeMix,
    selected: cave ? cave.traits.name : null, equipped: !!cave?.jet, ownedJetpack: B.jetpack.owned,
    hiddenJetpack: document.getElementById("jetpack-hud").hidden, disabledJetpack: document.getElementById("jetpack-hud").disabled,
    eyeY: eye.y, feet, floor: level.floor, ceiling: level.ceiling, camera: B.cameraCave.index, player: B.cameraCave.playerIndex,
    inside: inside && column.caveIndex === H.caveIndex && Math.abs(column.floor - level.floor) < 1e-6,
    supported: Math.hypot(p.x - level.hole.x, p.z - level.hole.z) > level.hole.mouthRadius,
    eyeClear: island.clearAt(eye.x, eye.y - 0.3, eye.z, 0.3, 0.6),
    bodyClear: !cave || island.clearAt(p.x, feet + 1e-5, p.z, 0.3, cave.bodyHeight),
    headHidden: !!cave?.parts.head.cameraHidden };
};

export const frozenClockProbe = async ({ reset = false } = {}) => {
  const B = window.__ooga, read = () => {
    const d = B.daylight, o = B.renderOpts, clock = document.getElementById("world-clock");
    return { scene: B.scene, backend: B.renderer.kind, hour: d ? d.hour : (o.continuousDay % 1) * 24,
      day: o.dayOfYear, continuous: o.continuousDay, sun: [o.sunDirection.x, o.sunDirection.y, o.sunDirection.z],
      stars: Array.from(o.starMatrix), sky: Array.from(o.sky), dateTime: clock.dateTime, label: clock.getAttribute("aria-label") };
  };
  const wait = () => new Promise((resolve) => {
    const frame = B.renderedFrames, tick = () => B.renderedFrames >= frame + 24 ? resolve() : requestAnimationFrame(tick);
    requestAnimationFrame(tick);
  });
  const before = read();
  if (reset) B.setHour(5, 1);
  await wait();
  return { before, after: read(), reset };
};

export const debugTimeParsingProbe = async () => {
  const D = window.BL.daylight;
  const good = [["0000", 0], ["0001", 1 / 60], ["1300", 13], ["1347", 13 + 47 / 60], ["2359", 23 + 59 / 60]];
  const bad = ["", "0", "130", "13000", "13:00", "2400", "2360", "1260", "-100", " 1300", "1300 ", "1300\n", "1e03", "abcd", null, 1300];
  const parsed = good.map(([text, hour]) => ({ text, expected: hour, actual: D.parseTime(text) }));
  const rejected = bad.map((text) => ({ text, rejected: Number.isNaN(D.parseTime(text)) }));
  const clocks = good.map(([time]) => D.createClock({ time, hour: 5, daylen: 1, day: 80 }));
  const fallback = D.createClock({ time: "2400", hour: 7, day: 80 });
  const running = D.createClock({ time: "13:00", hour: 7, daylen: 1000, day: 80 });
  const before = clocks.map((clock) => clock.read()), runningBefore = running.read();
  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  return { parsed, rejected, before, after: clocks.map((clock) => clock.read()), fallback: fallback.read(), advanced: running.read() > runningBefore };
};
