// Exterior ramp views keep context while a walker passes a window.
export const rampOutlineVisibilityProbe = () => {
  const B = window.__ooga, BL = window.BL, scene = BL.scenes.hub, island = B.island, H = B.headquarters, camera = B.camera;
  const actor = [...B.cavemen.values()].find((cave) => cave.state === "working"), rows = [], failures = [];
  const clear = (...points) => island.sightClearAt(...points);
  clear.boxSolid = island.sightBoxSolidAt; clear.boxClear = island.sightBoxClearAt; clear.boxGrid = island.sightGrid;
  B.pilot.possess(actor);
  let last = null;
  const render = (point, eye) => {
    B.crew.relocatePlayer(point, 0);
    Object.assign(camera.position, eye); Object.assign(camera.target, { x: point.x, y: actor.root.position.y + 0.6, z: point.z });
    camera.near = 0.1;
    BL.scene.updateWorld(scene.root); B.renderer.render(scene.root, camera, B.renderOpts); scene.overlay(1 / 60);
    const visible = H.objectGuides.actorVisible(actor, clear);
    return { visible, enabled: H.sightGuides.objectsEnabled, outlined: H.cameraCover.outlined, structureFaces: H.cameraCover.structureFaces };
  };
  for (const context of H.rockGuides.contexts.filter((entry) => entry.kind === "ramp")) {
    const ramp = context.source;
    let fixture = null;
    for (const window of context.windows) {
      const sx = Math.sin(window.angle), sz = -Math.cos(window.angle);
      const eye = { x: window.x + sx * 20, y: window.y, z: window.z + sz * 20 };
      let nearest = 0, distance = Infinity;
      for (let n = 0; n < ramp.samples.length; n++) {
        const p = ramp.samples[n], d = Math.hypot(p.x - window.x, p.z - window.z);
        if (d < distance) { nearest = n; distance = d; }
      }
      for (let n = Math.max(1, nearest - 3); n <= Math.min(ramp.samples.length - 2, nearest + 3); n++) {
        const point = ramp.samples[n], state = render(point, eye);
        if (state.visible) { fixture = { point, eye, sample: n, window: window.index, state }; break; }
      }
      if (fixture) break;
    }
    if (!fixture) { failures.push({ kind: "no visible ramp window fixture", basement: context.basement, index: context.index }); continue; }
    const row = { basement: context.basement, index: context.index, window: fixture.window, visible: 0, hidden: 0, frames: 0, dropouts: 0, interior: null };
    for (const direction of [1, -1]) for (let step = 0; step < 9; step++) {
      const offset = (direction > 0 ? step : 8 - step) - 4, eye = { ...fixture.eye };
      const radial = Math.atan2(eye.x, eye.z), radius = Math.hypot(eye.x, eye.z);
      eye.x = Math.sin(radial + offset * 0.035) * radius; eye.z = Math.cos(radial + offset * 0.035) * radius;
      const state = render(fixture.point, eye); row.frames++;
      if (state.visible) row.visible++; else row.hidden++;
      if (!state.enabled || !state.outlined || !state.structureFaces) row.dropouts++;
    }
    const column = { floor: 0, ceiling: 0 };
    for (const offset of [-16, -8, 0, 8, 16, 8, 0, -8, -16]) {
      const point = ramp.samples[Math.max(1, Math.min(ramp.samples.length - 2, fixture.sample + offset))];
      if (point.y >= -0.1 || island.rampColumnAt(point.x, point.z, context.basement, column) !== context.index + 1) continue;
      const state = render(point, fixture.eye); row.frames++;
      if (state.visible) row.visible++; else row.hidden++;
      if (!state.enabled || !state.outlined || !state.structureFaces) row.dropouts++;
    }
    // A normal camera inside the same ramp retains the immediate visible-body gate.
    const eye = { x: fixture.point.x, y: fixture.point.y + 1.1, z: fixture.point.z + 0.6 };
    row.interior = render(fixture.point, eye);
    if (row.dropouts || !row.visible || !row.hidden || !row.interior.visible || row.interior.enabled) failures.push({ kind: "ramp visibility exception", ...row });
    last = fixture;
    rows.push(row);
  }
  let first = null;
  if (last) {
    B.pilot.enterClose(); first = render(last.point, last.eye);
    if (first.enabled || first.outlined || first.structureFaces) failures.push({ kind: "first person exception leak", ...first });
  }
  return { rows, first, failures };
};
