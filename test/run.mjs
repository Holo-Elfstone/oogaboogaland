// End-to-end checks in headless Chrome
import { AsyncLocalStorage } from "node:async_hooks";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { launch } from "./browser.mjs";
import { yellowLikenessProbe } from "./contributor-likeness.mjs";
import { matrixPixelProbe, matrixCaveSnapshot } from "./matrix-pixels.mjs";
import { matrixWaveProbe, primeMatrixControls } from "./matrix-wave.mjs";
import { matrixRespawnProbe } from "./matrix-respawn.mjs";
import { matrixSurfaceSnapshot, matrixSurfaceViews } from "./matrix-surface.mjs";
import { matrixNavigationProbe, caveRoutingRejections } from "./matrix-navigation.mjs";
import { matrixHorizontalProbe } from "./matrix-horizontal.mjs";
import { matrixRampGlyphProbe } from "./matrix-ramp.mjs";
import { matrixRainProbe, matrixRainCycleProbe } from "./matrix-rain.mjs";
import { matrixGateAnimationProbe, matrixGateClipProbe, mirrorGateClipProbe } from "./matrix-gates.mjs";
import { objectRenderClippingProbe } from "./object-render-clipping.mjs";
import { cameraGlyphWaveProbe, cameraGlyphOwnershipProbe } from "./camera-glyph-wave.mjs";
import { glyphGateExitProbe } from "./glyph-gate-exit.mjs";
import { mirrorDoorwayGlyphProbe, mirrorDoorwaySceneProbe } from "./mirror-doorway-glyphs.mjs";
import { movementCollisionProbe } from "./movement-collision.mjs";
import { solidPropsProbe } from "./solid-props.mjs";
import { treeClearanceProbe } from "./tree-clearance.mjs";
import { solidCrewProbe, sleepingSolidProbe, crewBootRadiusProbe } from "./solid-crew.mjs";
import { characterCarryProbe } from "./character-carry.mjs";
import { shoulderPassProbe } from "./shoulder-pass.mjs";
import { shoulderPropsProbe } from "./shoulder-props.mjs";
import { npcRecoveryProbe } from "./npc-recovery.mjs";
import { npcPathWalkingProbe, npcCenterlineProbe, npcLowerTurnsProbe } from "./npc-paths.mjs";
import { pathDepthProbe } from "./path-depth.mjs";
import { bananaInteriorProbe, bananaSceneInteriorProbe } from "./banana-cover.mjs";
import { bananaLightingProbe, bananaDawnShadowProbe, bananaGuideClippingProbe, bananaSceneGuidesProbe, bananaPerceptionProbe } from "./banana-light-guides.mjs";
import { bananaSpillProbe } from "./banana-spill.mjs";
import { pilePartialProbe, pilePartialEligibilityProbe, pilePartialSceneProbe } from "./pile-partial.mjs";
import { pileVisibilityPerformanceProbe } from "./pile-performance.mjs";
import { pileRenderingProbe } from "./pile-rendering.mjs";
import { bananaMovementProbe, bananaExitProbe, bananaNpcMovementProbe, bananaPlatformInteriorProbe, bananaSlotProbe, bananaGlyphInteriorProbe } from "./banana-movement.mjs";
import { movementWindowsProbe } from "./movement-windows.mjs";
import { windowJumpProbe } from "./window-jump.mjs";
import { windowFlareProbe } from "./window-flare.mjs";
import { createEntranceClearanceProbe } from "./entrance-clearance.mjs";
import { navigationButtonsProbe, navigationButtonLayoutProbe } from "./navigation-buttons.mjs";
import { contextualActionProbe } from "./contextual-actions.mjs";
import { rampCeilingProbe } from "./ramp-ceiling.mjs";
import { entranceCeilingProbe } from "./entrance-ceiling.mjs";
import { headquartersBasementProbe } from "./hq-basement.mjs";
import { walkingSpeedProbe, walkingFallProbe } from "./walking-parity.mjs";
import { jumpJetpackProbe, jetpackRecoveryProbe, jumpActionProbe, jetpackHudProbe, jetpackUndergroundProbe, jetpackInputFuelProbe, abyssRespawnProbe, underIslandReleaseProbe, jetpackNotchProbe } from "./jump-jetpack.mjs";
import { basementHoleGeometryProbe, basementHoleMovementProbe, basementHoleFreeEyeProbe, basementHoleJetpackProbe } from "./basement-hole.mjs";
import { convexProbe } from "./convex.mjs";
import { wallLandingProbe } from "./wall-landing.mjs";
import { jetpackFallProbe } from "./jetpack-fall.mjs";
import { rampWindowContactProbe } from "./ramp-window-contact.mjs";
import { cloudSupportProbe, cloudLowFreeEyeProbe } from "./cloud-support.mjs";
import { skyAltitudeProbe, canvasHazeProbe } from "./sky-altitude.mjs";
import { canvasCullingProbe } from "./canvas-culling.mjs";
import { lifehashProbe } from "./lifehash.mjs";
import { roomMattressGeometryProbe, roomMattressVisibilityProbe, roomMattressMovementProbe, roomLifehashSignProbe, roomLifehashSignVisibilityProbe, roomLifehashSignImpactProbe, roomSignPassingProbe, roomSleepProbe, roomManualSleepProbe } from "./room-mattresses.mjs";
import { cameraDistanceProbe, cameraPitchProbe, cameraFreeOrbitProbe, cameraEntryTrajectoryProbe, cameraMotionResetProbe } from "./camera-distance.mjs";
import { headCameraProbe } from "./head-camera.mjs";
import { campfireProbe } from "./campfire.mjs";
import { fireContactProbe } from "./fire-contact.mjs";
import { firePanicProbe } from "./fire-panic.mjs";
import { fireFleeMemoryProbe } from "./fire-flee-memory.mjs";
import { fireWakeProbe, labFireWakeProbe } from "./fire-wake.mjs";
import { fireAvoidanceProbe } from "./fire-avoidance.mjs";
import { emberRenderProbe, maskedHeadEmberProbe } from "./ember-render.mjs";
import { freeCameraEntryProbe } from "./free-camera-entry.mjs";
import { bedCameraProbe, cameraReleaseProbe, rampZoomProbe } from "./bed-camera.mjs";
import { sleepVisibilityProbe } from "./sleep-visibility.mjs";
import { cameraCoverProbe, cameraPartialCoverProbe, cameraPartialCueProbe, cameraPartialEligibilityProbe, cameraPartialWallEligibilityProbe, cameraRockTextureProbe, wallPanOutlineProbe, wholeWallMaskProbe } from "./camera-cover.mjs";
import { cameraCueContrastProbe } from "./camera-cue-contrast.mjs";
import { mirrorOutlineProbe, glyphOutlineContrastProbe, glyphInteriorProbe, mirrorOpeningVisibilityProbe } from "./mirror-outlines.mjs";
import { mirrorGlyphParityProbe } from "./mirror-glyph-parity.mjs";
import { matrixLivingDistanceProbe } from "./matrix-living-distance.mjs";
import { sleepOrientationProbe } from "./sleep-orientation.mjs";
import { rampOutlineSectionsProbe } from "./ramp-outline-sections.mjs";
import { slopeOutlineSectionsProbe } from "./slope-outline-sections.mjs";
import { caveOutlineSectionsProbe } from "./cave-outline-sections.mjs";
import { sealedCaveBlocksProbe } from "./sealed-cave-blocks.mjs";
import { sealedCaveWalkingProbe } from "./sealed-cave-walking.mjs";
import { outlineMovingCharactersProbe } from "./outline-moving-characters.mjs";
import { corridorVisibilityProbe } from "./corridor-visibility.mjs";
import { rampOutlineVisibilityProbe } from "./ramp-outline-visibility.mjs";
import { rampActorOutlineProbe } from "./ramp-actor-outline.mjs";
import { rampApertureOcclusionProbe } from "./ramp-aperture-occlusion.mjs";
import { outlinePerformanceProbe } from "./outline-performance.mjs";
import { objectVisibilityPerformanceProbe } from "./object-visibility-performance.mjs";
import { canopyCertificateProbe, canopyPileProbe } from "./canopy-occlusion.mjs";
import { outlineTriggerPolicyProbe } from "./outline-trigger-performance.mjs";
import { mirrorViewportProbe } from "./mirror-viewport.mjs";
import { rockGuidesProbe, surfaceRockGuideProbe, sightGuideClippingProbe, sightGuidePerceptionProbe, objectSilhouetteProbe, objectPerceptionProbe, objectFadeProbe, sightGuideWorldProbe } from "./rock-guides.mjs";
import { terrainSightProbe } from "./terrain-sight.mjs";
import { windowOutlineProbe } from "./window-outlines.mjs";
import { apertureOutlineProbe, rampWallFloorProbe } from "./ramp-wall-outlines.mjs";
import { objectCrowdingProbe, objectCameraIndependenceProbe, objectProviderStateProbe, objectVisibilityGateProbe, grassOutlineProbe, pileGuideProbe } from "./object-guides.mjs";
import { maskSmokePixelsProbe } from "./mask-smoke.mjs";
import { drivenSmokeGroundProbe } from "./driven-smoke.mjs";
import { jetpackStartupSnapshot, basementStartupSnapshot, frozenClockProbe, debugTimeParsingProbe } from "./debug-url.mjs";
import { jumbotronProbe } from "./jumbotron.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const src = `file://${join(root, "src", "index.html")}`;
const dist = `file://${join(root, "oogaboogaland.html")}`;
// Checks pin the clock at noon unless they ask for another hour
const clock = (query = "") => `${query.includes("hour=") ? "" : "&hour=12"}${query ? "&" + query : ""}`;
const page = (base, query) => `${base}?debug=1&nosim=1&scene=lab${clock(query)}`;
// Without scene= the page lands on the hub
const hubPage = (base, query) => `${base}?debug=1&nosim=1${clock(query)}`;
const matrixSettled = (b, full = true) => b.evaluate(`new Promise((resolve, reject) => { const B = window.__ooga, W = B.matrixCave.world, start = performance.now(), frame = B.renderedFrames, tick = () => { if (${full ? "W.radius === W.maxRadius" : "W.radius === 0 && !W.active"} && B.renderedFrames > frame) resolve(); else if (performance.now() - start > 30000) reject(new Error("Matrix wave did not ${full ? "finish expanding" : "finish retracting"}")); else requestAnimationFrame(tick); }; requestAnimationFrame(tick); })`);
// Sets the pile level, then measures how far any point of the mound surface is from the nearest shell banana
const shellCoverage = `(level) => { const B = window.__ooga, M = window.BL.models, profile = M.BANANA_PILE_PROFILE; B.setPileLevel(level); const data = B.shell.instanceData, n = B.shell.instanceCount, core = B.core, coreColors = core.geometry.faces.map((f) => f.color); const surfaceY = (r) => { for (let i = 0; i < profile.length - 1; i++) { const o = profile[i], q = profile[i + 1]; if (r < q[0]) continue; return o[1] + (q[1] - o[1]) * (o[0] - r) / (o[0] - q[0]); } return profile[profile.length - 1][1]; }; let worst = 0, sum = 0; const samples = 600; for (let s = 0; s < samples; s++) { const u = (s + 0.5) / samples, angle = s * 2.399963; const r = Math.sqrt(u) * 0.97, wr = r * M.bananaPileRadiusScale(angle, r) * core.scale.x, x = Math.cos(angle) * wr, z = Math.sin(angle) * wr, y = core.position.y + (surfaceY(r) + M.bananaPileHeightOffset(angle, r)) * core.scale.y; let nearest = Infinity; for (let i = 0; i < n; i++) { const o = i * 20, d = Math.hypot(data[o + 12] - x, data[o + 13] - y, data[o + 14] - z); if (d < nearest) nearest = d; } worst = Math.max(worst, nearest); sum += nearest; } return { level, tiles: n, worstGap: +worst.toFixed(3), meanGap: +(sum / samples).toFixed(3), yellowPanels: coreColors.every((c) => c[0] >= 180 && c[1] >= 135 && c[2] <= 65), panelColors: new Set(coreColors.map((c) => c.join(","))).size }; }`;
// The most the working crew can eat between two snapshots taken at performance.now() stamps
const eatenBetween = (before, after) => `(() => { const B = window.__ooga; return [...B.cavemen.values()].filter((c) => c.state === "working").length * window.BL.crew.EAT_RATE * (${after} - ${before}) / 1000 + 0.05; })()`;
const covered = (c) => c.worstGap <= 0.14 && c.meanGap <= 0.08 && c.yellowPanels && c.panelColors >= 5 && c.tiles > 0;
const results = [];
let scenerySignature = "";
let pathMasterHash = "";
// Blocks run side by side, so each one collects its lines and prints them together when it finishes
const output = new AsyncLocalStorage();
const record = (name, ok, detail = "") => {
  results.push({ name, ok, detail });
  const line = `${ok ? "PASS" : "FAIL"} ${name}${detail ? " · " + detail : ""}`;
  const lines = output.getStore();
  if (lines) lines.push(line);
  else console.log(line);
};
// The page is ready once the leaf curtain has opened and left the DOM: the first frame is drawn and the scene is live
const untilReady = async (b) => {
  const t0 = Date.now();
  for (;;) {
    let ready = false;
    try {
      ready = await b.evaluate(`!!window.__ooga && window.__ooga.renderedFrames >= 2 && !document.getElementById("curtain")`);
    } catch {
      // The old document is still tearing down
    }
    if (ready) return;
    if (Date.now() - t0 > 20000) throw new Error("the page did not draw its first frame");
    await b.sleep(40);
  }
};
// Blocks that share a page run one after another in the same Chrome; each keeps its own name, error and clean-console check
const fold = (url, steps, opts = {}) => output.run([], async () => {
  const lines = output.getStore();
  const t0 = Date.now();
  let b = null, started = t0, ready = t0;
  try {
    b = await launch(opts);
    started = Date.now();
    await b.open(url);
    await b.focus(true);
    await untilReady(b);
    ready = Date.now();
    for (const [i, [name, fn]] of steps.entries()) {
      const from = i ? b.logs.length : 0;
      try {
        await fn(b);
        const noise = b.logs.slice(from).filter((l) => !l.includes("WebGL2 renderer failed"));
        record(`${name}: clean console`, noise.length === 0, `${((Date.now() - started) / 1000).toFixed(1)}s ${noise.join(" | ").slice(0, 200)}`);
      } catch (err) {
        record(name, false, String(err.message || err).slice(0, 200));
      }
    }
  } catch (err) {
    record(steps[0][0], false, String(err.message || err).slice(0, 200));
  } finally {
    if (b) b.close();
    const s = (ms) => (ms / 1000).toFixed(1);
    lines.push(`TIME ${steps.map((step) => step[0]).join(" + ")} · launch ${s(started - t0)}s · boot ${s(ready - started)}s · body ${s(Date.now() - ready)}s`);
    console.log(lines.join("\n"));
  }
});
const withPage = (name, url, fn, opts) => fold(url, [[name, fn]], opts);
// Waits for a condition on the page, then two more drawn frames so its effects are on screen
const untilPage = (b, cond, ms = 6000) => b.evaluate(`new Promise((resolve) => { const B = window.__ooga, t0 = performance.now(); let hitFrame = 0; const tick = () => { const s = B.stats(); if (!hitFrame && (${cond})) hitFrame = B.renderedFrames; if ((hitFrame && B.renderedFrames >= hitFrame + 2) || performance.now() - t0 > ${ms}) resolve(!!hitFrame); else requestAnimationFrame(tick); }; tick(); })`);

const core = (label, base) => withPage(label, page(base), async (b) => {
  const before = await b.evaluate(`(() => { const B = window.__ooga; const cave = [...B.cavemen.values()].find(c => c.state === "working" && !c.walk); const cp = B.project(cave.root.position.x, cave.headOffset * 0.5, cave.root.position.z); return { cave: cp, caveName: cave.traits.name, shown: B.shown, targets: B.input.targetCount, slots: B.slots.length }; })()`);
  const tusks = await b.evaluate(`(() => { const c = [...window.__ooga.cavemen.values()].find(c => c.traits.name === "w-s-bitcoin"), g = c.headOpen, u = c.traits.height / 16, close = (a, b) => Math.abs(a - b) < 1e-5, bounds = (face) => { const p = face.i.map((i) => [g.verts[i * 3] / u + 3.5, g.verts[i * 3 + 1] / u, g.verts[i * 3 + 2] / u + 3]); return { face, minX: Math.min(...p.map((q) => q[0])), maxX: Math.max(...p.map((q) => q[0])), minY: Math.min(...p.map((q) => q[1])), maxY: Math.max(...p.map((q) => q[1])), minZ: Math.min(...p.map((q) => q[2])), maxZ: Math.max(...p.map((q) => q[2])) }; }, faces = g.faces.map(bounds), frontColor = (x, y) => faces.find((f) => close(f.minZ, 8) && close(f.maxZ, 8) && f.minX <= x + 0.5 && f.maxX >= x + 0.5 && f.minY <= y + 0.5 && f.maxY >= y + 0.5)?.face.color.join(","), sideGap = (x) => faces.some((f) => close(f.minX, x) && close(f.maxX, x) && f.minY <= 0.5 && f.maxY >= 0.5 && f.minZ <= 6.5 && f.maxZ >= 6.5), rows = [0, 1].map((y) => Array.from({ length: 7 }, (_, x) => frontColor(x, y))), colors = rows.flat(), white = rows[0][1], tan = rows[0][0]; return { trait: c.traits.symmetricTusks, rows, mirrored: rows.every((row) => row.every((color, x) => color === row[6 - x])), whites: colors.filter((color) => color === white).length, tans: colors.filter((color) => color === tan).length, colorsDiffer: white !== tan && tan !== rows[0][2], rearGaps: sideGap(1) && sideGap(6) }; })()`);
  const bee = await b.evaluate(`(() => { const all = [...window.__ooga.cavemen.values()], c = all.find((c) => c.traits.name === "RandyMcMillan"), colors = (g) => new Set(g.faces.map((f) => f.color.join(","))), head = colors(c.headOpen), torso = colors(c.parts.torso.geometry), rgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)).join(","); return { bee: c.traits.bee, state: c.state, goggles: head.has(rgb("#3a9dff")), antennae: head.has(rgb("#141414")), stripes: torso.has(rgb("#141414")), wings: torso.has(rgb("#e4f3fb")), children: c.root.children.length, plain: all.find((o) => o.traits.name === "portlandhodl").root.children.length }; })()`);
  record(`${label}: RandyMcMillan is the sleeping Bee Ooga, with goggles, antennae, stripes and wings baked into his own head and torso`, bee.bee && bee.state === "sleeping" && bee.goggles && bee.antennae && bee.stripes && bee.wings && bee.children === bee.plain, JSON.stringify(bee));
  record(`${label}: w-s-bitcoin has mirrored tusks without stray rear cubes`, tusks.trait && tusks.mirrored && tusks.whites === 2 && tusks.tans === 4 && tusks.colorsDiffer && tusks.rearGaps, JSON.stringify(tusks));
  const anunnaki = await b.evaluate(`(() => { const c = [...window.__ooga.cavemen.values()].find(c => c.traits.name === "timechainb"), u = c.traits.height / 16, top = (g) => Math.max(...g.verts.filter((_, i) => i % 3 === 1)) / u; return { trait: c.traits.anunnaki, lionFaces: c.parts.lion.geometry.faces.length, lionOnRoot: c.root.children.includes(c.parts.lion), staffTop: +top(c.skins.club.default).toFixed(1), goldTop: +top(c.skins.club.gold).toFixed(1), upright: c.parts.club.rotation.x < 0.5 }; })()`);
  record(`${label}: timechainb is the Anunnaki with a lion under his arm and a staff in his grip`, anunnaki.trait && anunnaki.lionFaces > 50 && anunnaki.lionOnRoot && anunnaki.staffTop >= 16 && anunnaki.goldTop === anunnaki.staffTop && anunnaki.upright, JSON.stringify(anunnaki));
  const drop = await b.evaluate(`({ height: window.BL.pile.BANANA_DROP_HEIGHT, tallestTree: window.BL.terrain.MAX_HEIGHT + window.BL.hubModels.TREE_HEIGHT })`);
  record(`${label}: bananas start falling from twice the tallest treetop`, drop.height === drop.tallestTree * 2, JSON.stringify(drop));
  await b.mouse("mouseMoved", before.cave.x, before.cave.y, { button: "none" });
  await b.sleep(300);
  const tip = await b.evaluate(`(() => { const t = document.getElementById("tooltip"); return { hidden: t.hidden, text: t.textContent }; })()`);
  record(`${label}: hover tooltip`, !tip.hidden && tip.text.includes(before.caveName), tip.text);
  record(`${label}: pile bananas are decorative, not interaction targets`, before.targets < before.slots, `${before.targets} targets for ${before.slots} shell bananas`);
  await b.evaluate("window.BL.scenes[window.__ooga.scene].overlay(4)");
  await b.click(before.cave.x, before.cave.y);
  await b.sleep(150);
  const poke = await b.evaluate(`(() => { const B = window.__ooga, c = B.cavemen.get(${JSON.stringify(before.caveName)}); return { hop: c.hop, velocity: c.hopV, bubbles: B.stats().bubbles }; })()`);
  record(`${label}: clicking an Ooga shows a talking bubble without making it hop`, poke.hop === 0 && poke.velocity <= 0 && poke.bubbles > 0, JSON.stringify(poke));
  const landedBeforeTip = await b.evaluate("window.__ooga.stats().dropsLanded");
  await b.key("l");
  await untilPage(b, `s.dropsLanded > ${landedBeforeTip} && s.deliveries + s.pendingDrops === 0`);
  const loot = await b.evaluate(`(() => { const B = window.__ooga; return { enabled: B.lootEnabled, crates: B.crates.length, inventory: B.game.state.inventory.length, rows: document.querySelectorAll("#inventory .loot-row").length, tabHidden: document.getElementById("loot-tab").hidden, panelHidden: document.querySelector('[data-panel="loot"]').hidden, helpHidden: document.getElementById("crate-help").hidden, worn: [...B.cavemen.values()].reduce((sum, cave) => sum + cave.swagNodes.length, 0), sats: document.getElementById("stat-sats").textContent }; })()`);
  record(`${label}: loot drops, worn swag and the Loot panel stay off by default`, !loot.enabled && loot.crates === 0 && loot.inventory === 0 && loot.rows === 0 && loot.tabHidden && loot.panelHidden && loot.helpHidden && loot.worn === 0, JSON.stringify(loot));
  record(`${label}: large counts read short`, loot.sats === "120K" && (await b.evaluate(`[1200, 9999, 139600, 2100000].map(window.BL.game.formatLarge).join(",")`)) === "1.2K,9.9K,139K,2.1M", loot.sats);
  await b.key("p");
  await untilPage(b, "B.shown >= 290");
  const perf = await b.evaluate(`new Promise((resolve) => { const B = window.__ooga; const t0 = performance.now(); let frames = 0; const f = () => { frames++; if (performance.now() - t0 < 3000) requestAnimationFrame(f); else resolve({ fps: +(frames / 3).toFixed(1), shown: B.shown }); }; requestAnimationFrame(f); })`);
  record(`${label}: full pile runs`, perf.shown >= 290, `${perf.fps} fps at ${perf.shown} bananas`);
  const transition = await b.evaluate(`(() => { const B = window.__ooga, P = window.BL.pile, profile = window.BL.models.BANANA_PILE_PROFILE; const sample = (level) => { B.setPileLevel(level); const data = B.shell.instanceData; let minY = Infinity, maxY = -Infinity; for (let i = 0; i < B.shell.instanceCount; i++) { const offset = i * 20; minY = Math.min(minY, data[offset + 13]); maxY = Math.max(maxY, data[offset + 13]); } return { level, shell: B.shell.instanceCount, version: B.shell.instanceVersion, loose: B.slots.filter((slot) => slot.node.visible).length, coreVisible: B.core.visible, radius: B.core.scale.x, height: B.core.scale.y, coreTop: B.core.position.y + profile[profile.length - 1][1] * B.core.scale.y, minY, maxY }; }; return { capacity: P.DISK_BANANAS, packingHeight: P.PACKING_HEIGHT, one: sample(1), half: sample(Math.floor(P.DISK_BANANAS / 2)), near: sample(300), full: sample(P.DISK_BANANAS), swapped: sample(P.DISK_BANANAS + 1) }; })()`);
  record(`${label}: one surface layer and its backing inflate continuously through the 302-banana transition`, transition.capacity === 302 && transition.packingHeight > 1 && [transition.one, transition.half, transition.near, transition.full, transition.swapped].every((sample) => sample.loose === 0 && sample.coreVisible && sample.shell > 0) && transition.one.shell === 1 && transition.one.shell < transition.half.shell && transition.half.shell < transition.near.shell && transition.near.shell <= transition.full.shell && transition.full.shell === transition.swapped.shell && transition.one.radius === transition.full.radius && transition.swapped.radius > transition.full.radius && transition.one.height < transition.half.height && transition.half.height < transition.near.height && transition.near.height < transition.full.height && transition.full.height < transition.swapped.height && transition.full.shell < transition.capacity && Math.abs(transition.near.coreTop - transition.full.coreTop) < 0.01 && Math.abs(transition.full.coreTop - transition.swapped.coreTop) < 0.002 && Math.abs(transition.near.maxY - transition.full.maxY) < 0.01 && Math.abs(transition.full.maxY - transition.swapped.maxY) < 1e-6 && transition.full.version === transition.swapped.version, JSON.stringify(transition));
  const shell = await b.evaluate(`(() => { const B = window.__ooga; B.setPileLevel(1000); const data = B.shell.instanceData, scale = window.BL.models.BANANA_AMMO_SCALE, profile = window.BL.models.BANANA_PILE_PROFILE, verts = B.shell.geometry.verts; let maxScaleError = 0, minCenter = Infinity, maxTurn = 0, minZ = Infinity, maxZ = -Infinity; for (let i = 2; i < verts.length; i += 3) { minZ = Math.min(minZ, verts[i]); maxZ = Math.max(maxZ, verts[i]); } for (let i = 0; i < B.shell.instanceCount; i++) { const o = i * 20, sx = Math.hypot(data[o], data[o + 1], data[o + 2]), sy = Math.hypot(data[o + 4], data[o + 5], data[o + 6]), sz = Math.hypot(data[o + 8], data[o + 9], data[o + 10]), angle = Math.atan2(data[o + 14], data[o + 12]), tangentX = -Math.sin(angle), tangentZ = Math.cos(angle), alignment = Math.abs(data[o] / scale * tangentX + data[o + 2] / scale * tangentZ); maxScaleError = Math.max(maxScaleError, Math.abs(sx - scale), Math.abs(sy - scale), Math.abs(sz - scale)); maxTurn = Math.max(maxTurn, Math.acos(Math.min(1, alignment))); for (let j = 0; j < B.shell.instanceCount; j++) { if (i === j) continue; const q = j * 20; minCenter = Math.min(minCenter, Math.hypot(data[o + 12] - data[q + 12], data[o + 13] - data[q + 13], data[o + 14] - data[q + 14])); } } return { looseVisible: B.slots.filter((s) => s.node.visible).length, coverage: (${shellCoverage})(1000), maxScaleError, minCenter, maxTurn, depth: (maxZ - minZ) * scale, faces: B.shell.geometry.faces.length, apex: profile[profile.length - 1][1], shoulder: profile[profile.length - 2][1] }; })()`);
  record(`${label}: the restored layered ammo-size shell covers the larger loose-volume mound`, shell.looseVisible === 0 && covered(shell.coverage) && shell.coverage.tiles >= 120 && shell.coverage.tiles <= 320 && shell.maxScaleError < 1e-6 && shell.minCenter > 0.02 && shell.maxTurn > 0.3 && shell.depth > 0.06 && shell.faces >= 40 && shell.apex < 0.95 && shell.apex - shell.shoulder < 0.03, JSON.stringify(shell));
  const redrawn = await b.evaluate(`(() => { const B = window.__ooga; B.setPileLevel(1000); const beforeVersion = B.shell.instanceVersion, before = B.shell.instanceCount, edge = B.core.scale.x; B.setPileLevel(1001); const oneMore = { version: B.shell.instanceVersion, tiles: B.shell.instanceCount, edge: B.core.scale.x }; B.setPileLevel(1100); const grown = { version: B.shell.instanceVersion, tiles: B.shell.instanceCount, edge: B.core.scale.x }; B.setPileLevel(1000); return { beforeVersion, before, edge, oneMore, grown, back: { version: B.shell.instanceVersion, tiles: B.shell.instanceCount, edge: B.core.scale.x } }; })()`);
  record(`${label}: the restored shell relays only when its established band layout needs more bananas`, redrawn.oneMore.edge > redrawn.edge && redrawn.oneMore.version === redrawn.beforeVersion && redrawn.oneMore.tiles === redrawn.before && redrawn.grown.version === redrawn.beforeVersion + 1 && redrawn.grown.tiles > redrawn.before && redrawn.grown.edge > redrawn.oneMore.edge && redrawn.back.version === redrawn.grown.version + 1 && redrawn.back.tiles === redrawn.before && redrawn.back.edge === redrawn.edge, JSON.stringify(redrawn));
  const drift = await b.evaluate(`(() => { const B = window.__ooga; const grab = (level) => { B.setPileLevel(level); const d = B.shell.instanceData, n = B.shell.instanceCount, out = new Float32Array(n * 6); for (let i = 0; i < n; i++) { const o = i * 20, s = Math.hypot(d[o], d[o + 1], d[o + 2]); out.set([d[o + 12], d[o + 13], d[o + 14], Math.abs(d[o]) / s * 0.15, Math.abs(d[o + 1]) / s * 0.15, Math.abs(d[o + 2]) / s * 0.15], i * 6); } return out; }; const A = grab(1000), C = grab(1030), dists = []; for (let i = 0; i < A.length; i += 6) { let best = Infinity; for (let j = 0; j < C.length; j += 6) best = Math.min(best, Math.hypot(A[i] - C[j], A[i + 1] - C[j + 1], A[i + 2] - C[j + 2], A[i + 3] - C[j + 3], A[i + 4] - C[j + 4], A[i + 5] - C[j + 5])); dists.push(best); } dists.sort((x, y) => x - y); return { relaid: A.length !== C.length, median: +dists[dists.length >> 1].toFixed(3), max: +dists[dists.length - 1].toFixed(3) }; })()`);
  record(`${label}: a relay keeps every banana in place and facing the same way while the mound grows under it`, drift.relaid && drift.median < 0.04 && drift.max < 0.1, JSON.stringify(drift));
  const streamStart = await b.evaluate(`(() => { const B = window.__ooga, stats = B.stats(); B.demoTip(1200); B.demoTip(1200); return { level: B.level, shown: B.shown, landed: stats.dropsLanded, at: performance.now() }; })()`);
  await b.key("b");
  const queued = await b.evaluate(`(() => { const B = window.__ooga, s = B.stats(); return { level: B.level, shown: B.shown, deliveries: s.deliveries, pendingDrops: s.pendingDrops, dropPool: s.dropPool, dropRate: s.dropRate, started: s.dropsStarted, landed: s.dropsLanded }; })()`);
  record(`${label}: every donated banana enters the faster bounded stream`, queued.deliveries + queued.pendingDrops === 106 && queued.dropPool === 96 && queued.dropRate === 72 && queued.level <= streamStart.level && queued.shown === Math.floor(queued.level), JSON.stringify({ before: streamStart, after: queued }));
  await b.sleep(450);
  const waveA = await b.evaluate(`window.__ooga.stats()`);
  await b.sleep(450);
  const waveB = await b.evaluate(`(() => { const B = window.__ooga, stats = B.stats(), radius = window.BL.pile.footprintFor(B.shown, 0.45), moving = B.drops.filter((drop) => drop.moving), radii = moving.map((drop) => Math.hypot(drop.landing.pos.x, drop.landing.pos.z) / radius); let sumI = 0, sumR = 0, inner = 0; const quadrants = new Set(); for (let i = 0; i < moving.length; i++) { sumI += i; sumR += radii[i]; if (radii[i] < 0.5) inner++; quadrants.add((moving[i].landing.pos.x >= 0 ? 1 : 0) + (moving[i].landing.pos.z >= 0 ? 2 : 0)); } const meanI = sumI / moving.length, meanR = sumR / moving.length; let covariance = 0, varianceI = 0, varianceR = 0; for (let i = 0; i < moving.length; i++) { covariance += (i - meanI) * (radii[i] - meanR); varianceI += (i - meanI) ** 2; varianceR += (radii[i] - meanR) ** 2; } return { ...stats, landingCount: moving.length, meanRadius: meanR, maxRadius: Math.max(...radii), innerShare: inner / moving.length, quadrants: quadrants.size, orderCorrelation: covariance / Math.sqrt(varianceI * varianceR) }; })()`);
  record(`${label}: falling bananas launch continuously instead of in disjoint waves`, waveA.deliveries > 24 && waveA.pendingDrops > 0 && waveB.dropsStarted > waveA.dropsStarted && waveB.pendingDrops < waveA.pendingDrops, JSON.stringify({ first: waveA, second: waveB }));
  record(`${label}: falling bananas use a random normal distribution across the pile radius`, waveB.landingCount > 40 && waveB.meanRadius < 0.58 && waveB.maxRadius > 0.7 && waveB.maxRadius < 1.05 && waveB.innerShare > 0.4 && waveB.quadrants === 4 && Math.abs(waveB.orderCorrelation) < 0.45, JSON.stringify(waveB));
  await b.sleep(650);
  const live = await b.evaluate(`(() => { const B = window.__ooga, s = B.stats(); return { level: B.level, shown: B.shown, deliveries: s.deliveries, pendingDrops: s.pendingDrops, landed: s.dropsLanded }; })()`);
  record(`${label}: pile and counter grow as falling bananas land`, live.landed > streamStart.landed && live.deliveries > 0 && live.level > streamStart.level && live.shown === Math.floor(live.level), JSON.stringify({ before: streamStart, live }));
  await b.sleep(2000);
  const streamed = await b.evaluate(`(() => { const B = window.__ooga, s = B.stats(); return { level: B.level, shown: B.shown, outstanding: s.deliveries + s.pendingDrops, landed: s.dropsLanded, at: performance.now() }; })()`);
  const streamEaten = await b.evaluate(eatenBetween(streamStart.at, streamed.at));
  record(`${label}: the complete donation lands promptly and exactly`, streamed.outstanding === 0 && streamed.landed - streamStart.landed === 106 && streamed.level > streamStart.level + 106 - streamEaten && streamed.level <= streamStart.level + 106 && streamed.shown === Math.floor(streamed.level), JSON.stringify({ before: streamStart, after: streamed, eaten: streamEaten }));
  const scaling = await b.evaluate(`(() => { const B = window.__ooga, geo = B.core.geometry, verts = geo.verts; const sample = (level) => { const coverage = (${shellCoverage})(level); const stats = B.stats(), positions = B.slots.map((s) => s.base.pos), scale = B.core.scale; const radius = Math.max(...positions.map((p) => Math.hypot(p.x, p.z))), height = Math.max(...positions.map((p) => p.y)); let baseMin = Infinity, baseMax = 0, innerVariance = 0; for (let ring = 0; ring < geo.pileRings; ring++) { let ringMin = Infinity, ringMax = 0; for (let i = 0; i < geo.pileSegments; i++) { const offset = (ring * geo.pileSegments + i) * 3, r = Math.hypot(verts[offset], verts[offset + 2]) * scale.x; ringMin = Math.min(ringMin, r); ringMax = Math.max(ringMax, r); } if (ring === 0) { baseMin = ringMin; baseMax = ringMax; } else innerVariance = Math.max(innerVariance, ringMax - ringMin); } return { level, radius, height, volume: radius * radius * height, nodes: stats.allNodes, rendered: stats.rendered, coverage, baseVariance: baseMax - baseMin, innerVariance, crewRadius: Math.min(...[...B.cavemen.values()].filter((c) => c.state === "working").map((c) => Math.hypot(c.slot.x, c.slot.z))) }; }; return { samples: [sample(window.BL.pile.DISK_BANANAS * 2), sample(1000), sample(10000), sample(1000000), sample(window.BL.pile.MAX_BANANAS)], coreGeometries: new Set([window.BL.pile.DISK_BANANAS * 2, 1000, 1000000].map((level) => { B.setPileLevel(level); return B.core.geometry; })).size, budget: window.BL.pile.MAX_WEBGL_TILES }; })()`);
  const [smallest, small, medium, million, cap] = scaling.samples;
  const volume10x = medium.volume / small.volume;
  const volume100x = million.volume / medium.volume;
  record(`${label}: growing pile keeps a circular, lumpy yellow-paneled base covered in bananas at every level`, small.radius < medium.radius && medium.radius < million.radius && small.height < medium.height && medium.height < million.height && Math.abs(volume10x - 10) < 1 && Math.abs(volume100x - 100) < 6 && scaling.samples.every((s) => s.nodes === small.nodes && s.crewRadius > s.radius + 0.9 && s.baseVariance < 1e-6 && s.innerVariance / s.radius > 0.025 && covered(s.coverage) && s.rendered === s.coverage.tiles && s.rendered <= scaling.budget) && smallest.rendered < small.rendered && small.rendered < medium.rendered && medium.rendered < million.rendered && million.rendered < cap.rendered && million.rendered >= 8000 && cap.level === 10000000 && scaling.coreGeometries === 1, JSON.stringify(scaling));
  const baseCoverage = await b.evaluate(`(() => { const B = window.__ooga, P = window.BL.pile; const sample = (level) => { B.setPileLevel(level); const data = B.shell.instanceData, verts = B.shell.geometry.verts, floor = B.core.position.y + 0.004, angles = []; let minY = Infinity, maxRadius = 0; for (let instance = 0; instance < B.shell.instanceCount; instance++) { const offset = instance * 20; let instanceMinY = Infinity; for (let i = 0; i < verts.length; i += 3) { const x = verts[i], y = verts[i + 1], z = verts[i + 2], worldX = data[offset] * x + data[offset + 4] * y + data[offset + 8] * z + data[offset + 12], worldY = data[offset + 1] * x + data[offset + 5] * y + data[offset + 9] * z + data[offset + 13], worldZ = data[offset + 2] * x + data[offset + 6] * y + data[offset + 10] * z + data[offset + 14]; instanceMinY = Math.min(instanceMinY, worldY); minY = Math.min(minY, worldY); maxRadius = Math.max(maxRadius, Math.hypot(worldX, worldZ)); } if (instanceMinY <= floor + 1e-5) angles.push(Math.atan2(data[offset + 14], data[offset + 12])); } angles.sort((a, b) => a - b); let maxArcGap = 0; for (let i = 0; i < angles.length; i++) { const next = i + 1 < angles.length ? angles[i + 1] : angles[0] + Math.PI * 2; maxArcGap = Math.max(maxArcGap, (next - angles[i]) * B.core.scale.x); } return { level, floor, minY, edgeBananas: angles.length, maxArcGap, maxRadius, pileBoundary: P.visualFootprintFor(level, 0.45) }; }; return [sample(1000000), sample(P.MAX_BANANAS)]; })()`);
  record(`${label}: the outer banana layer reaches the platform around the complete large-pile base without crossing it`, baseCoverage.every((sample) => sample.edgeBananas >= 100 && sample.minY >= sample.floor - 1e-6 && sample.minY <= sample.floor + 1e-5 && sample.maxArcGap <= 0.36 && sample.maxRadius <= sample.pileBoundary + 1e-6), JSON.stringify(baseCoverage));
  await b.sleep(1500);
  await b.evaluate(`window.__ooga.setPileLevel(window.BL.pile.MAX_BANANAS)`);
  await b.sleep(80);
  const capPerf = await b.evaluate(`new Promise((resolve) => { const B = window.__ooga, t0 = performance.now(); let frames = 0; const tick = () => { frames++; if (performance.now() - t0 < 2000) requestAnimationFrame(tick); else resolve({ fps: +(frames / 2).toFixed(1), nodes: B.stats().allNodes, rendered: B.stats().rendered, shown: B.shown }); }; requestAnimationFrame(tick); })`);
  record(`${label}: ten-million-banana pile keeps a bounded instanced render budget`, capPerf.fps >= 50 && Math.abs(capPerf.nodes - small.nodes) <= 3 && capPerf.rendered >= 40000 && capPerf.rendered <= scaling.budget && capPerf.shown >= 9999999, JSON.stringify(capPerf));
});

const governor = () => withPage("governor", page(src), async (b) => {
  const interval = () => b.evaluate("+window.__ooga.frameInterval.toFixed(1)");
  await b.focus(true);
  await b.sleep(9500);
  const idle = await interval();
  await b.focus(false);
  await b.sleep(400);
  const background = await interval();
  await b.focus(true);
  await b.mouse("mouseMoved", 600, 400, { button: "none" });
  await b.mouse("mouseMoved", 620, 410, { button: "none" });
  await b.sleep(100);
  const active = await interval();
  record("governor: full rate when focused, 30fps when another window is in front", idle === 0 && background === 33.3 && active === 0, `idle=${idle} unfocused=${background} active=${active}`);
  // Render the whole lifecycle without advancing animation: a newly uploaded
  // blink variant must not mask the crown's removal from the aggregate count.
  const crown = await b.evaluate(`(() => { const B = window.__ooga, scene = window.BL.scenes.lab, R = B.renderer; R.render(scene.root, B.camera, scene.renderOpts); B.housekeep(); const baseline = R.stats.records; const it = window.BL.models.SWAG.find(c => c.id === "crown"), e = B.game.addItem({ item: it, tier: it.tier, donationId: "hk" }); B.game.assign(e.id, "portlandhodl"); B.applyAllSwag(); const node = B.cavemen.get("portlandhodl").swagNodes[0], attached = !!node.parent; R.render(scene.root, B.camera, scene.renderOpts); const worn = R.stats.records; B.game.unassign("portlandhodl"); B.applyAllSwag(); R.render(scene.root, B.camera, scene.renderOpts); const removed = R.stats.records, released = B.housekeep(), after = R.stats.records, again = B.housekeep(); return { baseline, worn, removed, released, after, again, attached, detached: node.parent === null }; })()`);
  record("housekeeping releases unused geometry", crown.attached && crown.detached && crown.worn === crown.baseline + 1 && crown.removed === crown.worn && crown.released === 1 && crown.after === crown.baseline && crown.again === 0, JSON.stringify(crown));
});

const locker = ["locker", async (b) => {
  await b.evaluate(`(() => { const B = window.__ooga; const g = B.game; const cat = window.BL.models.SWAG; const add = (id, d) => { const it = cat.find(c => c.id === id); return g.addItem({ item: it, tier: it.tier, donationId: d }); }; add("crown", "d1"); add("crown", "d2"); add("crown", "d3"); add("bandana", "d4"); add("laser-eyes", "d5"); B.renderLocker(); })()`);
  const rows = await b.evaluate(`[...document.querySelectorAll("#inventory .loot-row")].map(r => ({ name: r.querySelector(".loot-name").textContent, count: r.querySelector(".loot-count")?.textContent || "", icon: (() => { const c = r.querySelector(".loot-icon"); if (!c) return false; const d = c.getContext("2d").getImageData(0, 0, c.width, c.height).data; for (let i = 3; i < d.length; i += 4) if (d[i] > 0) return true; return false; })() }))`);
  record("locker: grouped by item, tier order, icons drawn", rows.length === 3 && rows[0].name === "Laser Eyes" && rows[1].count === "×3" && rows.every((r) => r.icon), JSON.stringify(rows));
  for (const who of ["portlandhodl", "bc1gui"]) {
    await b.evaluate(`(() => { const row = [...document.querySelectorAll("#inventory .loot-row")].find(r => r.querySelector(".loot-name").textContent === "Crown"); const sel = row.querySelector(".loot-assign"); sel.value = ${JSON.stringify(who)}; sel.dispatchEvent(new Event("change")); })()`);
    await b.sleep(150);
  }
  const worn = await b.evaluate(`(() => { const row = [...document.querySelectorAll("#inventory .loot-row")].find(r => r.querySelector(".loot-name").textContent === "Crown"); return { chips: row.querySelectorAll(".chip").length, free: row.querySelector(".loot-assign option").textContent }; })()`);
  record("locker: give one at a time, worn chips", worn.chips === 2 && worn.free.includes("1 free"), JSON.stringify(worn));
  // Nine of an item is the ceiling: the tenth is refused, a full tier rolls no crate, the others still do
  const cap = await b.evaluate(`(() => { const B = window.__ooga; const g = B.game; const cat = window.BL.models.SWAG; const add = (id, d) => { const it = cat.find(c => c.id === id); return g.addItem({ item: it, tier: it.tier, donationId: d }); }; for (const it of cat.filter(c => c.tier === "legendary")) for (let i = 0; i < 12; i++) add(it.id, "cap-" + it.id + i); B.renderLocker(); const row = [...document.querySelectorAll("#inventory .loot-row")].find(r => r.querySelector(".loot-name").textContent === "Halo"); return { halo: g.countOf("halo"), tenth: add("halo", "cap-extra"), shown: row.querySelector(".loot-count").textContent, legendary: g.lootFor({ id: "cap-roll", sats: 120000 }), epic: g.lootFor({ id: "cap-roll", sats: 21000 })?.tier }; })()`);
  record("locker: stacks stop at nine and a full tier drops no crate", cap.halo === 9 && cap.tenth === null && cap.shown === "×9" && cap.legendary === null && cap.epic === "epic", JSON.stringify(cap));
}];

const fan = () => withPage("fan", page(src), async (b) => {
  const radius = () => b.evaluate(`[...window.__ooga.cavemen.values()].filter(c => c.state === "working").map(c => +Math.hypot(c.slot.x, c.slot.z).toFixed(2))`);
  const r0 = await radius();
  await b.key("p");
  await b.sleep(300);
  const walking = await b.evaluate(`[...window.__ooga.cavemen.values()].filter(c => c.state === "working" && c.walk).length`);
  const r1 = await radius();
  const edge = await b.evaluate(`+window.BL.pile.visualFootprintFor(window.__ooga.level, 0.45).toFixed(2)`);
  record("the ground layer fixes the eaters' nearest radius", r1.every((r, i) => Math.abs(r - r0[i]) < 0.05 && Math.abs(r - edge - 1.1) < 0.06) && walking === 0, `radius ${r0[0]} -> ${r1[0]}, edge ${edge}`);
  const gaps = await b.evaluate(`(() => { const c = [...window.__ooga.cavemen.values()].filter(c => c.state === "working").map(c => c.slot); let m = Infinity; for (let i = 0; i < c.length; i++) for (let j = i + 1; j < c.length; j++) m = Math.min(m, Math.hypot(c[i].x - c[j].x, c[i].z - c[j].z)); return +m.toFixed(2); })()`);
  record("eaters keep their distance", gaps >= 1.5, `min gap ${gaps}`);
  await b.sleep(2500);
  const eating = await b.evaluate(`new Promise((resolve) => { const B = window.__ooga, cave = [...B.cavemen.values()].find((c) => c.state === "working" && !c.walk && !c.build); cave.nextBuildAt = 1e9; let heldAtReach = false, vanishedAtMouth = false, hiddenAtRest = false, pileMoved = false, wasVisible = cave.parts.snack.visible; const start = performance.now(); const tick = () => { const visible = cave.parts.snack.visible, arm = cave.parts.armR.rotation.x; if (visible && arm < -0.9) heldAtReach = true; if (wasVisible && !visible && arm < -2.1) vanishedAtMouth = true; if (!visible && arm > -0.4) hiddenAtRest = true; if (B.slots.some((s) => s.moving)) pileMoved = true; wasVisible = visible; if (performance.now() - start >= 3800) resolve({ heldAtReach, vanishedAtMouth, hiddenAtRest, pileMoved }); else requestAnimationFrame(tick); }; tick(); })`);
  record("eaters pick up in-hand at the edge and the banana vanishes at their mouth", eating.heldAtReach && eating.vanishedAtMouth && eating.hiddenAtRest && !eating.pileMoved, JSON.stringify(eating));
});

const crates = ["crates", async (b) => {
  for (let i = 0; i < 10; i++) {
    await b.evaluate(`window.__ooga.demoTip(1200)`);
    await b.sleep(120);
  }
  await b.sleep(4500);
  const r = await b.evaluate(`(() => { const B = window.__ooga; const live = B.crates.filter(c => !c.opened); let m = Infinity; for (let i = 0; i < live.length; i++) for (let j = i + 1; j < live.length; j++) m = Math.min(m, Math.hypot(live[i].node.position.x - live[j].node.position.x, live[i].node.position.z - live[j].node.position.z)); return { live: live.length, minDistance: +m.toFixed(2) }; })()`);
  record("crates never overlap and cap at three", r.live <= 3 && (r.live < 2 || r.minDistance >= 1.9), JSON.stringify(r));
}];

const keys = () => withPage("keys", page(src), async (b) => {
  const count = () => b.evaluate(`window.__ooga.level`);
  const eating = () => b.evaluate(`document.querySelectorAll('.roster-state[data-state="working"]').length`);
  // Keep the fifth Ooga asleep so the digit has a real sleeper to wake.
  await b.evaluate(`(() => { const B = window.__ooga; B.crew.cavemen.get("RandyMcMillan").override = "sleeping"; B.crew.refreshStates(); })()`);
  await b.sleep(300);
  const c0 = await count(), e0 = await eating(), landed0 = await b.evaluate(`window.__ooga.stats().dropsLanded`);
  await b.evaluate(`document.querySelector('[data-preset="racks"]').focus()`);
  await b.key("b");
  await b.key("b");
  await b.key("5");
  await b.sleep(4800);
  const c1 = await count(), landed1 = await b.evaluate(`window.__ooga.stats().dropsLanded`);
  record("keys: B streams 100 bananas and digits force eating, even with a button focused", landed1 - landed0 === 200 && c1 - c0 > 198 && c1 - c0 <= 200 && (await eating()) === e0 + 1, `${landed1 - landed0} landed · ${(c1 - c0).toFixed(2)} net bananas`);
  await b.key("Delete", 8);
  await b.sleep(200);
  record("keys: Shift+Delete clears loot", (await b.evaluate(`window.__ooga.game.state.inventory.length`)) === 0);
  // Open the feed dialog, close it with Escape
  await b.evaluate(`document.querySelector('[data-action="feed"]').click()`);
  await b.sleep(150);
  const opened = await b.evaluate(`({ open: document.getElementById("feed").open, focused: document.activeElement && document.activeElement.id })`);
  await b.key("w");
  const stillTyping = await b.evaluate(`(() => { const c = window.__ooga.camera; return +c.target.z.toFixed(2); })()`);
  await b.key("Escape");
  await b.sleep(400);
  const closed = await b.evaluate(`({ open: document.getElementById("feed").open, scene: window.__ooga.scene })`);
  record("feed dialog opens from the panel, keeps the keys, and Escape only closes it", opened.open && opened.focused === "handle" && stillTyping === 0 && !closed.open && closed.scene === "lab", JSON.stringify({ opened, stillTyping, closed }));
  await b.key("R", 8);
  await b.sleep(2500);
  const reset = await b.evaluate(`({ stored: localStorage.getItem("oogaboogaland.v1"), donations: document.getElementById("stat-donations").textContent })`);
  record("keys: Shift+R resets the demo", reset.stored === null && reset.donations === "0");
});

const sheetIntro = () => withPage("sheet intro", hubPage(src), async (b) => {
  const shown = await b.evaluate(`({ open: document.getElementById("sheet").dataset.open, signs: document.querySelectorAll(".sign path").length, tab: getComputedStyle(document.getElementById("sheet-toggle")).display })`);
  // The sheet folds five seconds after load
  const folded = await b.evaluate(`new Promise((resolve) => { const t0 = performance.now(), tick = () => { const open = document.getElementById("sheet").dataset.open; if (open === "false" || performance.now() - t0 > 7000) resolve(open); else setTimeout(tick, 50); }; tick(); })`);
  await b.evaluate(`document.getElementById("sheet-toggle").click()`);
  const reopened = await b.evaluate(`document.getElementById("sheet").dataset.open`);
  record("sheet: shows on load in sign lettering, folds to the pull tab after five seconds, the tab reopens it", shown.open === "true" && shown.signs >= 6 && shown.tab !== "none" && folded === "false" && reopened === "true", JSON.stringify({ shown, folded, reopened }));
  const bananas = await b.evaluate(`(() => { const sheet = document.getElementById("sheet"), tab = () => document.querySelector('[data-tab][aria-selected="true"]').dataset.tab, panel = () => !document.querySelector('[data-panel="bananas"]').hidden; document.getElementById("sheet-bananas").click(); const opened = { open: sheet.dataset.open, tab: tab(), panel: panel(), meterInPanel: !!document.querySelector('[data-panel="bananas"] #meter-count'), metrics: document.querySelectorAll("#project-metrics .stat").length, topbarMeter: !!document.querySelector(".topbar .meter") }; document.getElementById("sheet-bananas").click(); const folded = sheet.dataset.open; document.getElementById("sheet-toggle").click(); const roster = { open: sheet.dataset.open, tab: tab() }; return { opened, folded, roster }; })()`);
  const clockBananas = await b.evaluate(`(() => { const sheet = document.getElementById("sheet"), button = document.getElementById("world-bananas"), tab = () => document.querySelector('[data-tab][aria-selected="true"]').dataset.tab; button.click(); const opened = { open: sheet.dataset.open, tab: tab() }; button.click(); return { opened, held: { open: sheet.dataset.open, tab: tab() } }; })()`);
  const wrapped = await b.evaluate(`(() => { const el = document.createElement("span"); el.textContent = "Ooga Booga\\n            Land"; try { return { glyphs: window.BL.hud.signLettering(el.textContent).querySelectorAll("path").length, ok: true }; } catch (e) { return { ok: false, error: String(e) }; } })()`);
  record("sheet: sign lettering survives text wrapped across markup lines", wrapped.ok && wrapped.glyphs > 0, JSON.stringify(wrapped));
  record("sheet: the banana tab opens the bananas panel with the meter and project metrics, folds on a second tap, and the caveman tab opens the roster", bananas.opened.open === "true" && bananas.opened.tab === "bananas" && bananas.opened.panel && bananas.opened.meterInPanel && bananas.opened.metrics === 4 && !bananas.opened.topbarMeter && bananas.folded === "false" && bananas.roster.open === "true" && bananas.roster.tab === "roster", JSON.stringify(bananas));
  record("sheet: the clock banana count opens its panel and leaves an already-open Bananas panel open", clockBananas.opened.open === "true" && clockBananas.opened.tab === "bananas" && clockBananas.held.open === "true" && clockBananas.held.tab === "bananas", JSON.stringify(clockBananas));
});

const refresh = ["refresh", async (b) => {
  const r = await b.evaluate(`new Promise((resolve) => { const B = window.__ooga; const cave = [...B.cavemen.values()].find(c => c.state === "working" && !c.walk); cave.nextBuildAt = -1; setTimeout(() => { const before = cave.build && cave.build.phase; B.refreshStates(); resolve({ before, after: cave.build && cave.build.phase, walking: !!cave.walk }); }, 600); })`);
  record("state refresh does not interrupt builds", !!r.before && r.after === r.before && !r.walking, JSON.stringify(r));
}];

const weapons = ["weapons", async (b) => {
  const r = await b.evaluate(`new Promise((resolve) => { const B = window.__ooga; const g = B.game; const cat = window.BL.models.SWAG; const give = (id, name) => { const it = cat.find(c => c.id === id); const e = g.addItem({ item: it, tier: it.tier, donationId: "w-" + id }); g.assign(e.id, name); }; const [a, b2] = [...B.cavemen.values()].filter(c => c.state === "working" && !c.walk); give("golden-club", a.traits.name); give("golden-ak", b2.traits.name); B.applyAllSwag(); const club = { gold: a.parts.club.geometry === a.skins.club.gold, sameModel: a.skins.club.gold.verts.length === a.skins.club.default.verts.length, visible: a.parts.club.visible }; b2.nextBuildAt = -1; setTimeout(() => { resolve({ club, ak: { phase: b2.build && b2.build.phase, gold: b2.parts.gunBody.geometry === b2.skins.gun.gold, sameModel: b2.skins.gun.gold.verts.length === b2.skins.gun.default.verts.length, visible: b2.parts.gun.visible } }); }, 700); })`);
  record("golden club is a gold skin of the same club", r.club.gold && r.club.sameModel && r.club.visible, JSON.stringify(r.club));
  record("golden AK is a gold skin of the same rifle, shown while shooting", r.ak.phase === "shoot" && r.ak.gold && r.ak.sameModel && r.ak.visible, JSON.stringify(r.ak));
}];

const props = () => withPage("props", page(src, "yaw=2.4"), async (b) => {
  const die = await b.evaluate(`(() => { const B = window.__ooga; for (const [i, d] of B.lab.equipment.dice.entries()) { const w = d.world; const p = B.project(w[12], w[13] + 0.15, w[14]); const hit = p && B.input.pick(p.x, p.y); if (p && p.x > 0 && p.x < 1100 && hit && hit.owner.kind === "die") return { i, x: p.x, y: p.y }; } return null; })()`);
  if (die) {
    await b.click(die.x, die.y);
    await b.sleep(250);
  }
  record("tap a die rolls it", !!die && (await b.evaluate(`window.__ooga.lab.equipment.dice[${die ? die.i : 0}].rolling`)) === true);
  await b.sleep(900);
  // The top face must match the rolled number
  const face = await b.evaluate(`(() => { const d = window.__ooga.lab.equipment.dice[${die ? die.i : 0}]; const w = d.world; const axes = { "+x": w[1], "+y": w[5], "+z": w[9] }; const pips = { "+y": 5, "-y": 2, "+x": 6, "-x": 1, "+z": 3, "-z": 4 }; let best = null, bestV = 0; for (const [axis, v] of Object.entries(axes)) { if (Math.abs(v) > bestV) { bestV = Math.abs(v); best = (v > 0 ? "+" : "-") + axis[1]; } } return { up: pips[best], rolled: d.lastRoll, vertical: +bestV.toFixed(3) }; })()`);
  record("die lands with the rolled face up", !!die && face.up === face.rolled && face.vertical > 0.999, JSON.stringify(face));
  const card = await b.evaluate(`(() => { const B = window.__ooga; for (const [i, c] of B.lab.equipment.cards.entries()) { const w = c.world; const p = B.project(w[12], w[13] + 0.05, w[14]); const hit = p && B.input.pick(p.x, p.y); if (p && p.x > 0 && p.x < 1100 && hit && hit.owner.kind === "card") return { i, x: p.x, y: p.y }; } return null; })()`);
  if (card) {
    await b.click(card.x, card.y);
    await b.sleep(150);
  }
  record("tap a card flips it", !!card && (await b.evaluate(`window.__ooga.lab.equipment.cards[${card ? card.i : 0}].flipping`)) === true);
});

const fallback = () => withPage("canvas2d fallback", page(src, "canvas2d"), async (b) => {
  const kind = await b.evaluate(`document.getElementById("quality").textContent`);
  record("fallback renderer draws", kind.startsWith("canvas2d"), kind);
});

const phone = () => withPage("phone", hubPage(src), async (b) => {
  // The touch hint shows a moment after load
  const r = await b.evaluate(`new Promise((resolve) => { const t0 = performance.now(), tick = () => { const hint = document.getElementById("hint").textContent; if (hint || performance.now() - t0 > 4000) resolve({ quality: document.getElementById("quality").textContent, sheet: document.getElementById("sheet").dataset.open, hint, stick: getComputedStyle(document.getElementById("joy-move")).display }); else setTimeout(tick, 50); }; tick(); })`);
  record("phone: medium tier, collapsed sheet, touch hint, joysticks shown", r.quality.includes("medium") && r.sheet === "false" && r.hint.includes("pinch") && r.stick === "block", JSON.stringify(r));
  // The open sheet takes the sticks' box
  const stickWith = (open) => b.evaluate(`(() => { document.getElementById("sheet").dataset.open = ${JSON.stringify(open)}; const m = document.getElementById("joy-move"); return { box: getComputedStyle(document.querySelector(".joysticks")).display, width: Math.round(m.getBoundingClientRect().width), laidOut: m.offsetParent !== null }; })()`);
  const sticks = { open: await stickWith("true"), closed: await stickWith("false") };
  record("phone: the sticks hide behind the open sheet and return when it collapses", sticks.open.box === "none" && !sticks.open.laidOut && sticks.open.width === 0 && sticks.closed.box === "block" && sticks.closed.width > 0, JSON.stringify(sticks));
  // Hold the move stick up and the camera flies
  const stick = await b.evaluate(`(() => { const r = document.getElementById("joy-move").getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; })()`);
  const target = () => b.evaluate(`(() => { const c = window.__ooga.camera; return { x: +c.target.x.toFixed(2), z: +c.target.z.toFixed(2) }; })()`);
  const t0 = await target();
  await b.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: stick.x, y: stick.y }] });
  for (let i = 1; i <= 6; i++) {
    await b.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: stick.x, y: stick.y - i * 6 }] });
    await b.sleep(100);
  }
  await b.sleep(400);
  const t1 = await target();
  await b.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await b.sleep(1000);
  const t2 = await target();
  await b.sleep(1000);
  const t3 = await target();
  record("phone: the move stick flies the camera and lets go cleanly", t1.z < t0.z - 3 && Math.abs(t3.z - t2.z) < 0.5, `${JSON.stringify(t0)} -> ${JSON.stringify(t1)} -> ${JSON.stringify(t3)}`);
}, { w: 390, h: 844, mobile: true });

const scenes = ["scenes", async (b) => {
  // A transition runs ~30 frames, animations settle later
  const snapshot = () => b.evaluate(`(() => { const B = window.__ooga; return { scene: B.scene, stats: B.stats(), records: B.renderer.stats.records }; })()`);
  const rendered = (frames) => b.evaluate(`new Promise((resolve) => { const B = window.__ooga; const start = B.renderedFrames; const t0 = performance.now(); const tick = () => { if (B.renderedFrames >= start + ${frames} || performance.now() - t0 > 4000) resolve(B.renderedFrames - start); else requestAnimationFrame(tick); }; requestAnimationFrame(tick); })`);
  const settled = () => b.evaluate(`new Promise((resolve) => { const B = window.__ooga; const t0 = performance.now(); const tick = () => { if (B.stats().tweens === 0 || performance.now() - t0 > 3000) resolve(); else requestAnimationFrame(tick); }; tick(); })`);
  await rendered(2);
  const before = await snapshot();
  for (let i = 0; i < 2; i++) {
    await b.evaluate(`window.__ooga.go("lab")`);
    await rendered(40);
    await settled();
  }
  const after = await snapshot();
  const same = (key) => before.stats[key] === after.stats[key];
  record("scenes: go(lab) twice lands in the lab", before.scene === "lab" && after.scene === "lab", `${before.scene} -> ${after.scene}`);
  record("scenes: node, target, tween and DOM counts identical after re-entering", same("allNodes") && same("targets") && same("tweens") && same("dom"), `${JSON.stringify(before.stats)} -> ${JSON.stringify(after.stats)}`);
  record("scenes: GPU records identical after re-entering", Math.abs(after.records - before.records) <= 3, `${before.records} -> ${after.records}`);
  record("scenes: no error thrown during the transitions", !b.logs.some((l) => l.startsWith("[exception]")), b.logs.join(" | ").slice(0, 200));
}];

const hub = () => withPage("hub", hubPage(src), async (b) => {
  const rendered = (frames) => b.evaluate(`new Promise((resolve) => { const B = window.__ooga; const start = B.renderedFrames; const t0 = performance.now(); const tick = () => { if (B.renderedFrames >= start + ${frames} || performance.now() - t0 > 4000) resolve(B.renderedFrames - start); else requestAnimationFrame(tick); }; requestAnimationFrame(tick); })`);
  const loaded = await b.evaluate(`(() => { const B = window.__ooga; return { scene: B.scene, terrain: window.BL.scenes.hub.root.children.some((n) => n.geometry === B.island.geometry), mouths: B.mouths.length, leaveHidden: document.querySelector('[data-action="leave"]').hidden, startLevel: B.startLevel, level: B.level, lootEnabled: B.lootEnabled, lootCrates: B.crates.length, decorativeCrates: B.props.filter((o) => o.scenery && o.prop === "crate" && o.active).length, jetpackCloud: !!B.jetpack.pickup?.host, lootTabHidden: document.getElementById("loot-tab").hidden, worldLootHintHidden: document.getElementById("world-loot-hint").hidden }; })()`);
  const advanced = await rendered(3);
  record("hub: default scene starts with 1,000 bananas and loads clean", loaded.scene === "hub" && loaded.terrain && loaded.mouths === 8 && loaded.leaveHidden && loaded.startLevel === 1000 && loaded.level <= 1000 && loaded.level > 995 && advanced >= 3, JSON.stringify({ ...loaded, advanced }));
  // Measure the outer underside: floor slopes face up, while a room or window
  // roof has more stone beneath it along the same vertical column. The shaft
  // exposes its own ceiling, so exclude that opening from the outer cap.
  const underside = await b.evaluate(`(() => { const I = window.__ooga.island, g = I.geometry, hole = I.headquarters.basement.hole, radii = [0, 15, 27, 29.5, 30], profile = radii.map((r) => I.undersideDepthAt(r)), colors = new Set(); let minY = Infinity, deepFaces = 0, interiorFaces = 0; for (let i = 1; i < g.verts.length; i += 3) minY = Math.min(minY, g.verts[i]); for (const face of g.faces) { if (!face.i.every((i) => g.verts[i * 3 + 1] < -8)) continue; const a = face.i[0] * 3, b = face.i[1] * 3, c = face.i[2] * 3, normalY = (g.verts[b + 2] - g.verts[a + 2]) * (g.verts[c] - g.verts[a]) - (g.verts[b] - g.verts[a]) * (g.verts[c + 2] - g.verts[a + 2]); if (normalY >= 0) continue; let x = 0, y = 0, z = 0; for (const i of face.i) { x += g.verts[i * 3]; y += g.verts[i * 3 + 1]; z += g.verts[i * 3 + 2]; } x /= face.i.length; y = y / face.i.length - 0.01; z /= face.i.length; if (hole.contains(x, z)) { interiorFaces++; continue; } let backedBelow = false; for (let below = y; below > -I.undersideDepth - I.unit; below -= I.unit) if (I.solidAt(x, below, z)) { backedBelow = true; break; } if (backedBelow) { interiorFaces++; continue; } deepFaces++; colors.add(face.color.join(",")); } return { depth: I.undersideDepth, radii, profile, minY, retainedBottom: -Math.ceil(I.undersideDepthAt(hole.radius) / I.unit) * I.unit, deepFaces, interiorFaces, deepMaterials: colors.size }; })()`);
  record("hub terrain: the underside is a layered voxel bottom-third spherical cap instead of a flat slab", Math.abs(underside.depth - 30 / Math.SQRT2) < 1e-9 && underside.minY === underside.retainedBottom && Math.abs(underside.profile[0] - underside.depth) < 1e-9 && underside.profile.at(-1) === 0 && underside.profile.every((v, i, a) => i === 0 || v < a[i - 1]) && underside.profile[1] > 17 && underside.profile[2] > 6 && underside.profile[3] > 1 && underside.deepFaces > 0 && underside.deepMaterials === 3, JSON.stringify(underside));
  record("hub: donation loot and its panel stay hidden while decorative crates and the cloud jetpack remain", !loaded.lootEnabled && loaded.lootCrates === 0 && loaded.decorativeCrates > 0 && loaded.jetpackCloud && loaded.lootTabHidden && loaded.worldLootHintHidden, JSON.stringify(loaded));
  const curtain = await b.evaluate(`({ drawn: window.__ooga.timing.drawn > 0, gone: !document.getElementById("curtain") })`);
  record("hub: the leaf curtain opens on the first drawn frame and leaves the DOM", curtain.drawn && curtain.gone, JSON.stringify(curtain));
  const signView = () => b.evaluate(`(() => { const B = window.__ooga, l = B.labels[0], m = B.mouths.find((m) => m.id === "c11"), s = l.world.map((p) => B.project(p.x, p.y, p.z)), cx = l.world.reduce((sum, p) => sum + p.x, 0) / 4, cy = l.world.reduce((sum, p) => sum + p.y, 0) / 4, cz = l.world.reduce((sum, p) => sum + p.z, 0) / 4; return { text: l.text, depthTested: l.node.parent !== null && l.node.geometry.faces.length > 100, world: l.world.flatMap((p) => [p.x, p.y, p.z]), attached: Math.hypot(cx - l.x, cy - l.y, cz - l.z) < 1e-9 && cy > m.floorY + 4, width: Math.hypot(s[1].x - s[0].x, s[1].y - s[0].y), shear: (s[1].y - s[0].y) / Math.max(0.001, Math.hypot(s[1].x - s[0].x, s[1].y - s[0].y)) }; })()`);
  const signBefore = await signView();
  await b.drag({ x: 400, y: 450 }, { x: 470, y: 450 });
  await rendered(1);
  const signAfter = await signView();
  record("hub: EntropyLab sign is depth-tested, fixed above its cave and follows perspective", signBefore.text === "EntropyLab" && signBefore.depthTested && signAfter.depthTested && signBefore.attached && signAfter.attached && signBefore.world.every((v, i) => v === signAfter.world[i]) && Math.abs(signAfter.width - signBefore.width) > 0.2 && Math.abs(signAfter.shear - signBefore.shear) > 0.001, JSON.stringify({ before: signBefore, after: signAfter }));
  const mouth = await b.evaluate(`(() => { const B = window.__ooga; const m = B.mouths.find((m) => m.id === "c11"); const p = B.project(m.x, 2, m.z); const hit = B.input.pick(p.x, p.y); return { x: Math.round(p.x), y: Math.round(p.y), kind: hit && hit.owner.kind, slot: hit && hit.owner.slot && hit.owner.slot.id }; })()`);
  await b.click(mouth.x, mouth.y);
  // Wait for the dolly and both fades, including scene construction under load.
  await untilPage(b, 'B.scene === "lab" && !B.transitioning', 15000);
  const entered = await b.evaluate(`({ scene: window.__ooga.scene, leaveShown: !document.querySelector('[data-action="leave"]').hidden })`);
  record("hub: tap the lab cave enters the lab", mouth.kind === "cave" && mouth.slot === "c11" && entered.scene === "lab" && entered.leaveShown, JSON.stringify({ ...mouth, ...entered }));
  await b.key("Escape");
  await untilPage(b, 'B.scene === "hub" && !B.transitioning', 15000);
  const back = await b.evaluate(`(() => { const B = window.__ooga; const c = B.camera; return { scene: B.scene, toPile: +Math.hypot(c.target.x, c.target.z).toFixed(2), dist: +Math.hypot(c.position.x - c.target.x, c.position.y - c.target.y, c.position.z - c.target.z).toFixed(1), leaveHidden: document.querySelector('[data-action="leave"]').hidden }; })()`);
  record("lab: Escape returns to the hub on the landing view", back.scene === "hub" && back.toPile < 0.5 && Math.abs(back.dist - 24) < 1 && back.leaveHidden, JSON.stringify(back));
  await b.key("p");
  await b.sleep(200);
  const level = await b.evaluate("window.__ooga.level");
  await b.evaluate(`window.__ooga.go("lab")`);
  await untilPage(b, 'B.scene === "lab" && !B.transitioning', 15000);
  const carried = await b.evaluate(`(() => { const B = window.__ooga; return { scene: B.scene, level: B.level, shown: B.shown }; })()`);
  record("pile level carries between scenes", carried.scene === "lab" && level >= 290 && Math.abs(carried.level - level) < 2 && carried.shown === Math.floor(carried.level), `${level} -> ${JSON.stringify(carried)}`);
  await b.evaluate(`document.querySelector('[data-action="leave"]').click()`);
  await untilPage(b, 'B.scene === "hub" && !B.transitioning', 15000);
  const left = await b.evaluate(`({ scene: window.__ooga.scene, blurred: document.activeElement !== document.querySelector('[data-action="leave"]') })`);
  record("lab: Leave cave button returns to the hub", left.scene === "hub" && left.blurred, JSON.stringify(left));
});

const mirrorCave = ["mirror cave", async (b) => {
  const rendered = (frames, ms = 6000) => b.evaluate(`new Promise((resolve) => { const B = window.__ooga, start = B.renderedFrames, t0 = performance.now(); const tick = () => { if (B.renderedFrames >= start + ${frames} || performance.now() - t0 > ${ms}) resolve(B.renderedFrames - start); else requestAnimationFrame(tick); }; requestAnimationFrame(tick); })`);
  const built = await b.evaluate(`(() => { const B = window.__ooga, H = window.BL.hubModels, C = B.mirrorCave, slot = window.BL.caves.slots.find((s) => s.id === "c1"), g = C.node.geometry, rim = C.rim.geometry, original = H.caveMouthRim(), bounds = window.BL.scene.boundsOf(g), ooga = H.caveSign("Ooga Booga Land"), entropy = H.caveSign("EntropyLab"); let liners = 0; const scan = (node) => { if (node.geometry?.matrixRevealBacking) liners++; for (const child of node.children) scan(child); }; scan(window.BL.scenes.hub.root); const rear = rim.faces.filter((face) => face.i.every((i) => rim.verts[i * 3 + 2] === -0.5)), soffit = rim.faces.filter((face) => { const a = face.i[0] * 3, b = face.i[1] * 3, c = face.i[2] * 3, v = rim.verts; return face.i.every((i) => v[i * 3 + 1] === 3 && Math.abs(v[i * 3]) <= 2.5) && (v[b + 2] - v[a + 2]) * (v[c] - v[a]) - (v[b] - v[a]) * (v[c + 2] - v[a + 2]) < 0; }); return { status: slot.status, name: slot.name, scene: slot.scene, children: C.group.children.length - C.guides.doorwayNodes.length, glyphBatches: C.guides.doorwayNodes.length, glyphsAttached: C.guides.doorwayNodes.every((node) => node.parent === C.group && node.sightHidden && node.geometry.matrixGlyph && node.fixedInstanceCapacity), mirrorMarked: C.node.mirror === true, walkThrough: C.node.mirrorWalkThrough === true, attached: [C.node, C.rim, C.sign].every((n) => n.parent === C.group), bounds: { min: bounds.min, max: bounds.max }, worldBottom: C.node.position.y + bounds.min[1], plane: C.node.position.z, noRoom: !("room" in C), liners, originalVertices: rim.verts === original.verts, originalFaces: rim.faces.length === original.faces.length && rim.faces.every((face, i) => face.i === original.faces[i].i && face.color === original.faces[i].color && face.emissive === original.faces[i].emissive), rear: rear.length, soffit: soffit.length, stone: [...rear, ...soffit].every((f) => f.color.some((v) => v > 0)), sign: { label: B.labels.find((l) => l.text === slot.name).text, cached: ooga === H.caveSign(slot.name), wider: ooga.signWidth > entropy.signWidth, faces: ooga.faces.length } }; })()`);
  record("mirror cave: c1 keeps its sign and walk-through mirror without a separate room shell", built.status === "mirror" && built.name === "Ooga Booga Land" && built.scene === null && built.children === 8 && built.glyphBatches === 8 && built.glyphsAttached && built.mirrorMarked && built.walkThrough && built.attached && built.worldBottom < 0 && built.plane === 0.5 && built.bounds.min.join("|") === "-2.5|-1.75|0" && built.bounds.max.join("|") === "2.5|1.5|0" && built.sign.label === built.name && built.sign.cached && built.sign.wider && built.sign.faces > 100 && built.noRoom && built.liners === 0, JSON.stringify(built));
  const matrixGateBuilt = await b.evaluate(`(() => { const B = window.__ooga, G = B.matrixGate, cave = B.matrixCave.caves.find((c) => c.id === "c1").caveIndex, bounds = window.BL.scene.boundsOf; return { count: G.gates.length, caveIndices: G.gates.map((g) => g.caveIndex), sealedIndices: G.sealed.map((s) => s.caveIndex), sealedIds: G.sealed.map((s) => s.mouth.id), uniqueSeals: new Set(G.sealed.map((s) => s.node.geometry)).size, sealed: G.sealed.map((s) => { const b = bounds(s.node.geometry); return { exterior: s.node.matrixExterior, span: [b.max[0] - b.min[0], b.max[1] - b.min[1]], faces: s.node.geometry.faces.length }; }), blocked: B.cameraCave.openings.filter((o) => o.blocked).map((o) => o.caveIndex), hiddenHeight: G.hiddenHeight, hidden: G.gates.every((g) => g.node.position.y === G.hiddenHeight && !g.open), mapped: G.gates.every((g) => g.node.geometry.matrixCave === g.caveIndex && g.node.matrixExterior), glyphFaces: G.gates.map((g) => g.node.geometry.faces.filter((f) => f.emissive > 0).length), spans: G.gates.map((g) => { const b = bounds(g.node.geometry); return [b.max[0] - b.min[0], b.max[1] - b.min[1]]; }), pressed: G.pressed, unlocked: G.unlocked, buttonMapped: G.button.geometry.matrixCave === cave && G.button.matrixExterior && !G.button.matrixLiving && G.button.glow < 0.5, standMapped: G.stand.geometry.matrixCave === cave && G.stand.matrixExterior, target: B.input.targets ? B.input.targets.includes(G.button) : true }; })()`);
  record("matrix gates: only occupied caves own overhead glyph bars while all three unused mouths have unique sealed stone faces", matrixGateBuilt.count === 5 && matrixGateBuilt.caveIndices.join("|") === "1|3|4|5|8" && matrixGateBuilt.sealedIndices.join("|") === "2|6|7" && matrixGateBuilt.sealedIds.join("|") === "c10|c2|c3" && matrixGateBuilt.uniqueSeals === 3 && matrixGateBuilt.blocked.join("|") === "2|6|7" && matrixGateBuilt.sealed.every((s) => s.exterior && s.span[0] >= 4.9 && s.span[1] >= 2.9 && s.faces >= 300) && matrixGateBuilt.hiddenHeight > 3 && matrixGateBuilt.hidden && matrixGateBuilt.mapped && matrixGateBuilt.glyphFaces.every((count) => count > 250) && matrixGateBuilt.spans.every((s) => s[0] >= 4.8 && s[1] >= 3.1) && !matrixGateBuilt.pressed && !matrixGateBuilt.unlocked && matrixGateBuilt.buttonMapped && matrixGateBuilt.standMapped && matrixGateBuilt.target, JSON.stringify(matrixGateBuilt));
  record("mirror cave: original jagged rim, rear stone and soffit geometry remain intact with no artificial black paneling", built.originalVertices && built.originalFaces && built.rear === 18 && built.soffit === 11 && built.stone && built.noRoom && built.liners === 0, JSON.stringify(built));
  const descenders = await b.evaluate(`(() => { const glyphMin = (ch) => { const g = window.BL.hubModels.caveSign(ch); let min = Infinity; for (const face of g.faces) { if (face.emissive !== 0.2) continue; for (const i of face.i) min = Math.min(min, g.verts[i * 3 + 1]); } return min; }, baseline = glyphMin("o"), samples = ["g", "p", "q", "y", "j"].map((ch) => ({ ch, min: glyphMin(ch) })), board = window.BL.hubModels.caveSign("Ooga Booga Land"); return { baseline, samples, height: board.signHeight, contained: samples.every((sample) => sample.min > -board.signHeight * 0.5) }; })()`);
  record("cave signs: descenders extend below the lowercase baseline and remain inside the taller board", descenders.samples.every((sample) => sample.min < descenders.baseline - 0.05) && descenders.contained && descenders.height > 0.91, JSON.stringify(descenders));
  const entranceLayout = await b.evaluate(`(() => { const B = window.__ooga, all = B.entranceLights.map((l) => ({ ...l, localPosition: [...l.localPosition], worldPosition: [...l.worldPosition] })), caves = ["c11", "c9", "c1"].map((id) => { const m = B.mouths.find((v) => v.id === id), fixtures = all.filter((l) => l.caveId === id), torches = fixtures.filter((l) => l.kind === "torch"), lanterns = fixtures.filter((l) => l.kind === "lantern"), transformError = Math.max(...fixtures.map((l) => { const p = l.localPosition, x = m.x + Math.cos(m.ry) * p[0] + Math.sin(m.ry) * p[2], y = m.floorY + p[1], z = m.z - Math.sin(m.ry) * p[0] + Math.cos(m.ry) * p[2]; return Math.max(Math.abs(x - l.worldPosition[0]), Math.abs(y - l.worldPosition[1]), Math.abs(z - l.worldPosition[2])); })); return { id, fixtures, torches, lanterns, transformError }; }); return { all, caves, mirrorPlane: B.mirrorCave.node.position.z }; })()`);
  const torchPairs = entranceLayout.caves.map((c) => c.torches);
  record("entrance lights: EntropyLab, Ooga Rally and Ooga Booga Land use symmetric cave-local torch pairs", entranceLayout.all.length === 9 && entranceLayout.caves.every((c) => c.fixtures.length === 3 && c.torches.length === 2 && c.lanterns.length === 1 && c.transformError < 1e-6 && c.fixtures.every((l) => l.registered)) && torchPairs.every((pair) => pair[0].side === "left" && pair[1].side === "right" && Math.abs(pair[0].localPosition[0] + pair[1].localPosition[0]) < 1e-8 && Math.abs(Math.abs(pair[0].localPosition[0]) - 2.75) < 1e-8 && pair[0].localPosition[1] === pair[1].localPosition[1] && pair[0].localPosition[2] === pair[1].localPosition[2]), JSON.stringify(entranceLayout));
  record("entrance lights: every torch clears the front of its jamb and the c1 mirror plane", torchPairs.flat().every((l) => Math.abs(l.gap - 0.12) < 1e-8 && Math.abs(l.fixtureBack - l.rimFront - 0.12) < 1e-8 && l.fixtureBack > l.rimFront && (l.caveId !== "c1" || l.fixtureBack > entranceLayout.mirrorPlane)), JSON.stringify(torchPairs));
  const approach = await b.evaluate(`(() => { const B = window.__ooga, m = B.mouths.find((mouth) => mouth.id === "c1"), ox = -Math.sin(m.ry), oz = -Math.cos(m.ry), px = oz, pz = -ox, stations = [0.5, 1, 1.5, 2, 2.5].map((distance) => { let sum = 0, count = 0; for (let lateral = -2; lateral <= 2.0001; lateral += 0.025) { const x = m.x - ox * distance + px * lateral, z = m.z - oz * distance + pz * lateral; if (B.island.isPath(x, z)) { sum += lateral; count++; } } return { distance, center: count ? sum / count : null, count }; }); return { stations, maxOffset: Math.max(...stations.map((station) => Math.abs(station.center))) }; })()`);
  record("mirror cave: only c1's path eases into a perpendicular final approach", approach.stations.every((station) => station.count > 0) && approach.maxOffset <= 0.15, JSON.stringify(approach));
  const mouth = await b.evaluate(`(() => { const B = window.__ooga, m = B.mouths.find((v) => v.id === "c1"), p = B.project(m.x, 2, m.z), hit = B.input.pick(p.x, p.y); return { x: p.x, y: p.y, kind: hit && hit.owner.kind, slot: hit && hit.owner.slot.id }; })()`);
  await b.mouse("mouseMoved", mouth.x, mouth.y, { button: "none" });
  await rendered(2);
  const tooltip = await b.evaluate(`document.getElementById("tooltip").textContent`);
  await b.click(mouth.x, mouth.y);
  await rendered(12);
  record("mirror cave: tooltip identifies the physical mirror without starting a scene transition", mouth.kind === "cave" && mouth.slot === "c1" && tooltip === "Ooga Booga Land · mirror" && (await b.evaluate(`window.__ooga.scene`)) === "hub", JSON.stringify({ mouth, tooltip }));
  const reflected = await b.evaluate(`(() => { const B = window.__ooga, r = B.mirror, c = B.camera, center = Array.from(r.planeCenter), normal = Array.from(r.planeNormal), gotEye = Array.from(r.cameraPosition), gotTarget = Array.from(r.cameraTarget), reflect = (p) => { const d = (p.x - center[0]) * normal[0] + (p.y - center[1]) * normal[1] + (p.z - center[2]) * normal[2]; return [p.x - 2 * d * normal[0], p.y - 2 * d * normal[1], p.z - 2 * d * normal[2]]; }, eye = reflect(c.position), target = eye.map((v, i) => v + normal[i]), error = (a, z) => Math.max(...a.map((v, i) => Math.abs(v - z[i]))); return { active: r.active, eyeError: error(eye, gotEye), targetError: error(target, gotTarget), planeDistance: r.planeDistance, normalLength: Math.hypot(...normal), captureExcluded: r.captureExcluded, passes: r.reflectionPassCount, resources: r.resources, samples: r.samples, allocations: r.allocationCount, width: r.width, height: r.height, viewport: [B.renderer.size.width, B.renderer.size.height], bytes: r.width * r.height * (4 + Math.max(1, r.samples) * 8) }; })()`);
  record("mirror cave: the reflected eye and fixed aperture camera are mathematically correct and exclude the mirror itself", reflected.active && reflected.eyeError < 1e-4 && reflected.targetError < 1e-4 && reflected.planeDistance > 0 && Math.abs(reflected.normalLength - 1) < 1e-6 && reflected.captureExcluded && reflected.passes > 0, JSON.stringify(reflected));
  const lightingPasses = await b.evaluate(`new Promise((resolve) => { const B = window.__ooga, start = { frames: B.renderedFrames, shadows: B.renderer.stats.shadowPassCount, reflections: B.mirror.reflectionPassCount, resources: B.renderer.stats.shadowResources }; const tick = () => { if (B.renderedFrames < start.frames + 8) return requestAnimationFrame(tick); resolve({ frames: B.renderedFrames - start.frames, shadows: B.renderer.stats.shadowPassCount - start.shadows, reflections: B.mirror.reflectionPassCount - start.reflections, resources: [start.resources, B.renderer.stats.shadowResources] }); }; requestAnimationFrame(tick); })`);
  record("mirror cave: its reflection reuses current lighting without another shadow pass", lightingPasses.reflections > 0 && lightingPasses.shadows === lightingPasses.frames && lightingPasses.resources[0] === lightingPasses.resources[1], JSON.stringify(lightingPasses));
  const aspect = (sample) => Math.abs(sample.width / sample.height - sample.viewport[0] / sample.viewport[1]);
  const mirrorResources = (sample) => sample.samples > 0 ? 6 : 4;
  record("mirror cave: high target is bounded, multisampled, and resolves into one RGBA8 texture under 10 MB", Math.max(reflected.width, reflected.height) <= 512 && aspect(reflected) < 0.01 && reflected.samples > 1 && reflected.resources === 6 && reflected.allocations === 1 && reflected.bytes <= 512 * 512 * 36, JSON.stringify(reflected));
  // Texels the glass gets against the pixels it covers, one to one below the target size and the whole target above it
  const coverage = `(() => { const B = window.__ooga, r = B.mirror, node = B.mirrorCave.node, g = node.geometry, T = window.BL.math.mat4, P = new Float32Array(3), C = new Float32Array(4), px = [[Infinity, -Infinity], [Infinity, -Infinity]], uv = [[Infinity, -Infinity], [Infinity, -Infinity]]; for (let i = 0; i < g.verts.length; i += 3) { T.transformPoint(P, node.world, g.verts[i], g.verts[i + 1], g.verts[i + 2]); const s = B.project(P[0], P[1], P[2]); T.transformPoint4(C, r.capturedViewProj, P[0], P[1], P[2]); const t = [C[0] / C[3] * 0.5 + 0.5, C[1] / C[3] * 0.5 + 0.5]; [s.x, s.y].forEach((v, a) => { px[a] = [Math.min(px[a][0], v), Math.max(px[a][1], v)]; }); t.forEach((v, a) => { uv[a] = [Math.min(uv[a][0], v), Math.max(uv[a][1], v)]; }); } return { pixels: px.map((b) => b[1] - b[0]), texels: [(uv[0][1] - uv[0][0]) * r.width, (uv[1][1] - uv[1][0]) * r.height], target: [r.width, r.height], inside: uv.every((b) => b[0] >= -0.01 && b[1] <= 1.01) }; })()`;
  const cropped = (c) => c.inside && c.texels.every((t, a) => Math.abs(t - Math.min(c.pixels[a], c.target[a])) <= 3);
  const far = await b.evaluate(coverage);
  await b.evaluate(`(() => { const s = window.__ooga.mirrorCave.node.scale; s.x = s.y = 6; })()`);
  await rendered(3);
  const near = await b.evaluate(coverage);
  await b.evaluate(`(() => { const s = window.__ooga.mirrorCave.node.scale; s.x = s.y = 1; })()`);
  await rendered(3);
  record("mirror cave: the capture is cropped to the glass, one texel per pixel until the target is full", far.pixels[0] < far.target[0] && cropped(far) && near.pixels[0] > near.target[0] && near.pixels[1] > near.target[1] && cropped(near), JSON.stringify({ far, near }));
  const quality = async (name, cap) => {
    const sample = await b.evaluate(`new Promise((resolve) => { const B = window.__ooga; B.renderer.setQuality(${JSON.stringify(name)}); const startFrame = B.renderedFrames, startPass = B.mirror.reflectionPassCount, t0 = performance.now(); const tick = () => { if (B.renderedFrames >= startFrame + 8 || performance.now() - t0 > 6000) resolve({ name: B.renderer.quality, width: B.mirror.width, height: B.mirror.height, viewport: [B.renderer.size.width, B.renderer.size.height], passes: B.mirror.reflectionPassCount - startPass, resources: B.mirror.resources, samples: B.mirror.samples }); else requestAnimationFrame(tick); }; requestAnimationFrame(tick); })`);
    sample.cap = cap;
    return sample;
  };
  const tiers = [await quality("high", 512), await quality("medium", 384), await quality("low", 256)];
  record("mirror cave: quality tiers preserve aspect, sample with the tier, and medium/low update every second frame", tiers.every((s) => s.name === (s.cap === 512 ? "high" : s.cap === 384 ? "medium" : "low") && Math.max(s.width, s.height) <= s.cap && aspect(s) < 0.01 && s.resources === mirrorResources(s)) && tiers[0].samples > tiers[1].samples && tiers[1].samples > 0 && tiers[2].samples === 0 && tiers[0].passes >= 7 && tiers[1].passes >= 3 && tiers[1].passes <= 5 && tiers[2].passes >= 3 && tiers[2].passes <= 5, JSON.stringify(tiers));
  await b.evaluate(`window.__ooga.renderer.setQuality("high")`);
  await rendered(4);
  const skips = await b.evaluate(`new Promise((resolve) => { const B = window.__ooga, node = B.mirrorCave.node, wait = (count, done) => { const start = B.renderedFrames, tick = () => B.renderedFrames >= start + count ? done() : requestAnimationFrame(tick); requestAnimationFrame(tick); }, start = { pass: B.mirror.reflectionPassCount, skip: B.mirror.skippedPassCount }; node.mirrorWalkThrough = false; node.rotation.y = Math.PI; wait(3, () => { const back = { pass: B.mirror.reflectionPassCount, skip: B.mirror.skippedPassCount, reason: B.mirror.skipReason }; node.rotation.y = 0; node.position.x = 20; wait(3, () => { const offscreen = { pass: B.mirror.reflectionPassCount, skip: B.mirror.skippedPassCount, reason: B.mirror.skipReason }; node.position.x = 0; node.mirrorWalkThrough = true; wait(3, () => resolve({ start, back, offscreen, restored: { pass: B.mirror.reflectionPassCount, reason: B.mirror.skipReason } })); }); }); })`);
  record("mirror cave: back-facing and offscreen mirrors skip reflection work", skips.back.pass === skips.start.pass && skips.back.skip > skips.start.skip && skips.back.reason === "back-facing" && skips.offscreen.pass === skips.back.pass && skips.offscreen.skip > skips.back.skip && skips.offscreen.reason === "offscreen" && skips.restored.pass > skips.offscreen.pass, JSON.stringify(skips));
  const beforeResize = await b.evaluate(`({ resources: window.__ooga.mirror.resources, allocations: window.__ooga.mirror.allocationCount })`);
  await b.send("Emulation.setDeviceMetricsOverride", { width: 900, height: 700, deviceScaleFactor: 1, mobile: false });
  await rendered(8);
  const resized = await b.evaluate(`(() => { const B = window.__ooga; return { resources: B.mirror.resources, allocations: B.mirror.allocationCount, width: B.mirror.width, height: B.mirror.height, viewport: [B.renderer.size.width, B.renderer.size.height] }; })()`);
  await b.send("Emulation.clearDeviceMetricsOverride");
  await rendered(8);
  const resetSize = await b.evaluate(`(() => { const B = window.__ooga; return { resources: B.mirror.resources, width: B.mirror.width, height: B.mirror.height }; })()`);
  record("mirror cave: resize rebuilds only the bounded target and keeps resource count flat", beforeResize.resources === 6 && resized.resources === 6 && resetSize.resources === 6 && resized.allocations > beforeResize.allocations && Math.max(resized.width, resized.height) <= 512 && aspect(resized) < 0.01, JSON.stringify({ beforeResize, resized, resetSize }));
  await b.evaluate(`window.__ooga.matrixCave.viewApproach()`);
  await rendered(4);
  const prewarmed = await b.evaluate(`(() => { const B = window.__ooga, a = B.matrixCave.activeSurfaceCounts; return { preloaded: B.matrixCave.preloaded, visible: B.matrixCave.visible, drawEnabled: B.matrixCave.drawEnabled, drawnGlyphs: B.matrixCave.drawnGlyphCount, preloadDistance: B.matrixCave.preloadDistance, prewarmCount: B.matrixCave.prewarmCount, records: B.renderer.stats.records, updates: B.matrixCave.updates, activeSurfaces: a.floor + a.ceiling + a.wall + a.prop, registeredSurfaces: B.matrixCave.surfaceGlyphCount, gaps: B.matrixCave.movingGapCount, y: B.matrixCave.firstGlyphY, portal: B.mirror.portal, surfaceDrawn: B.mirror.surfaceDrawn }; })()`);
  await rendered(8);
  const prewarmedAfter = await b.evaluate(`(() => { const B = window.__ooga; return { updates: B.matrixCave.updates, y: B.matrixCave.firstGlyphY, portal: B.mirror.portal, surfaceDrawn: B.mirror.surfaceDrawn }; })()`);
  record("mirror interior: its fixed glyph buffers remain visible and animated before the mirror is crossed", !prewarmed.preloaded && prewarmed.visible && prewarmed.drawEnabled && prewarmed.drawnGlyphs > 0 && prewarmed.prewarmCount === 0 && prewarmed.records > 0 && prewarmed.updates > 0 && prewarmed.registeredSurfaces > 9000 && prewarmed.activeSurfaces > 0 && prewarmedAfter.updates > prewarmed.updates && prewarmedAfter.y !== prewarmed.y && !prewarmed.portal && prewarmed.surfaceDrawn && !prewarmedAfter.portal && prewarmedAfter.surfaceDrawn, JSON.stringify({ before: prewarmed, after: prewarmedAfter }));
  const exteriorMatrixViews = await b.evaluate(`new Promise((resolve) => { const B = window.__ooga, m = B.mirrorCave.mouth, o = B.pilot.orbit, views = [["front", 0, 0.08], ["left-oblique", -0.62, 0.12], ["right-side", 1.08, 0.08], ["elevated", 0.18, 0.52], ["low", -0.18, -0.08]], samples = [], wait = (count, done) => { const start = B.renderedFrames, tick = () => B.renderedFrames >= start + count ? done() : requestAnimationFrame(tick); requestAnimationFrame(tick); }, pose = (view) => { const localZ = 0.45, target = { x: m.x + Math.sin(m.ry) * localZ, y: m.floorY + 1.55, z: m.z + Math.cos(m.ry) * localZ }; o.target = target; o.tx = target.x; o.ty = target.y; o.tz = target.z; o.yaw = o.tYaw = m.ry + view[1]; o.pitch = o.tPitch = view[2]; o.dist = o.tDist = 6; B.pilot.update(0.1); }, next = (i) => { if (i === views.length) return resolve({ samples, maxLocalZ: B.matrixCave.maxLocalZ, portalZ: B.matrixCave.portal.opening.planeZ, clearance: B.matrixCave.portalClearance }); pose(views[i]); wait(4, () => { samples.push({ name: views[i][0], inside: B.matrixCave.inside, visible: B.matrixCave.visible, drawEnabled: B.matrixCave.drawEnabled, drawn: B.matrixCave.drawnGlyphCount, batchDrawn: B.matrixCave.batchDrawCount, active: B.matrixCave.activeGlyphCount, suppressed: B.renderer.stats.suppressed }); next(i + 1); }); }; B.matrixCave.viewApproach(); wait(3, () => next(0)); })`);
  record("mirror exterior: permanent room glyphs stay live behind the fixed mirror from frontal, oblique, side, elevated and low views", exteriorMatrixViews.samples.length === 5 && exteriorMatrixViews.samples.every((sample) => !sample.inside && sample.visible && sample.drawEnabled && sample.drawn > 0 && sample.batchDrawn === sample.drawn && sample.active === sample.drawn), JSON.stringify(exteriorMatrixViews.samples));
  record("mirror exterior: the complete extruded native glyph registry stops behind the real entrance", exteriorMatrixViews.maxLocalZ < exteriorMatrixViews.portalZ - 0.0099 && exteriorMatrixViews.clearance >= 0.0099, JSON.stringify({ maxLocalZ: exteriorMatrixViews.maxLocalZ, portalZ: exteriorMatrixViews.portalZ, clearance: exteriorMatrixViews.clearance }));
  const overhead = await b.evaluate(`new Promise((resolve) => {
    const B = window.__ooga, m = B.mirrorCave.mouth, o = B.pilot.orbit, cr = Math.cos(m.ry), sr = Math.sin(m.ry), samples = [];
    const wait = (count, done) => { const start = B.renderedFrames, tick = () => B.renderedFrames >= start + count ? done() : requestAnimationFrame(tick); requestAnimationFrame(tick); };
    const pose = (z) => {
      const dist = 3.5, eyeX = m.x + sr * z, eyeY = m.floorY + 4.4, eyeZ = m.z + cr * z, tx = eyeX - sr * dist, tz = eyeZ - cr * dist;
      o.target = { x: tx, y: eyeY, z: tz }; o.tx = tx; o.ty = eyeY; o.tz = tz;
      o.yaw = o.tYaw = m.ry; o.pitch = o.tPitch = 0; o.dist = o.tDist = dist; B.pilot.update(0.1);
      return { x: eyeX, y: eyeY, z: eyeZ };
    };
    const capture = (requested) => { const p = B.camera.position; samples.push({ error: Math.hypot(p.x - requested.x, p.y - requested.y, p.z - requested.z), cameraY: p.y - m.floorY, mode: B.pilot.mode, selected: !!B.pilot.player, inside: B.matrixCave.inside, portal: B.mirror.portal }); };
    const first = pose(1.5);
    wait(3, () => {
      capture(first); const before = B.matrixCave.portal.rejected.above, second = pose(-2);
      wait(4, () => {
        capture(second);
        resolve({ samples, visible: B.matrixCave.visible, drawEnabled: B.matrixCave.drawEnabled, drawnGlyphs: B.matrixCave.drawnGlyphCount, maxLocalZ: B.matrixCave.maxLocalZ, portalZ: B.matrixCave.portal.opening.planeZ, openingTop: B.matrixCave.portal.opening.maxY, rejectedAbove: B.matrixCave.portal.rejected.above - before });
      });
    });
  })`);
  record("mirror portal: the raw overhead orbit retains its requested pose while glyphs stay behind the closed mirror", overhead.samples.length === 2 && overhead.samples.every((sample) => sample.error < 1e-7 && sample.mode === "orbit" && !sample.selected && !sample.inside && !sample.portal && sample.cameraY > overhead.openingTop) && overhead.visible && overhead.drawEnabled && overhead.drawnGlyphs > 0 && overhead.maxLocalZ < overhead.portalZ - 0.0099 && overhead.rejectedAbove === 0, JSON.stringify(overhead));
  await b.evaluate(`window.__ooga.matrixCave.viewApproach()`);
  await rendered(4);
  const matrixWorldOutside = await b.evaluate(`(() => { const B = window.__ooga, H = window.BL.hubModels, nodes = [], walk = (node) => { nodes.push(node); for (const child of node.children) walk(child); }; walk(window.BL.scenes.hub.root); const crew = new Set([...B.cavemen.values()].map((cave) => cave.root)), trees = new Set(B.props.filter((o) => o.prop === "tree").map((o) => o.node)), settled = new Set(B.slots.map((slot) => slot.node)), falling = new Set(B.drops.map((slot) => slot.node)), bananaGeometry = window.BL.models.bananaGeometry(), bullets = nodes.filter((node) => node.parent === window.BL.scenes.hub.root && node.geometry === bananaGeometry && !settled.has(node) && !falling.has(node)), butterflyGeometry = new Set([H.butterfly(0), H.butterfly(1)]), butterflies = nodes.filter((node) => butterflyGeometry.has(node.geometry)), fireflies = nodes.filter((node) => node.geometry === H.firefly()), embers = nodes.filter((node) => node.geometry === H.ember()), signs = B.labels.map((label) => label.node), undergroundSigns = nodes.filter((node) => node.geometry?.signWidth && node.world[13] < -3), undergroundFires = B.headquarters.lights.map((lamp) => lamp.node), torches = B.props.filter((o) => o.prop === "torch").map((o) => o.node), fires = B.lamps.filter((lamp) => lamp.id === "firepit").map((lamp) => lamp.node), smallPlantGeometry = new Set([H.bush(0), H.bush(1), H.bush(2), H.flowerTuft(), H.grass(), H.vine()]), glowing = nodes.filter((node) => node.matrixLiving), partial = nodes.filter((node) => node.matrixEmissiveLiving), allowed = new Set([...crew, ...trees, B.shell, B.spillEffect.node, ...falling, ...bullets, ...butterflies, ...fireflies, ...embers]), allowedPartial = new Set([...signs, ...undergroundFires, ...torches, ...fires]), hasMixedFaces = (node) => node.geometry.faces.some((face) => face.emissive > 0) && node.geometry.faces.some((face) => !face.emissive); return { active: B.matrixCave.world.active, radius: B.matrixCave.world.radius, origin: Array.from(B.matrixCave.world.origin), crew: [...crew].length > 0 && [...crew].every((node) => node.matrixLiving), trees: [...trees].length > 0 && [...trees].every((node) => node.matrixLiving), bananaPile: !B.core.matrixLiving && !B.core.matrixEmissiveLiving && B.shell.matrixLiving && B.shell.instanceCount > 0 && B.shell.instanceData[18] === 2, spillingBananas: B.spillEffect.node.matrixLiving && B.spillEffect.node.fixedInstanceCapacity && B.spillEffect.node.geometry.faces === bananaGeometry.faces, fallingBananas: falling.size === 96 && [...falling].every((node) => node.matrixLiving), firedBananas: bullets.length === 12 && bullets.every((node) => node.matrixLiving), flyingBees: butterflies.length === 2 && butterflies.every((node) => node.matrixLiving && node.instanceCount > 0 && node.instanceData[18] === 2), fireflies: fireflies.length === 1 && fireflies.every((node) => node.matrixLiving), embers: embers.length === 2 && embers.every((node) => node.matrixLiving), signLetters: signs.length === 3 && signs.every((node) => node.matrixEmissiveLiving && hasMixedFaces(node)) && undergroundSigns.length === 0, torchFires: torches.length === 6 && torches.every((node) => node.matrixEmissiveLiving && hasMixedFaces(node)) && undergroundFires.length === 3 && undergroundFires.every((node) => node.matrixEmissiveLiving && node.geometry.faces.some((face) => face.emissive > 0)), firePit: fires.length === 1 && fires.every((node) => node.matrixEmissiveLiving && node.geometry.faces.every((face) => face.emissive > 0)), smallPlants: nodes.filter((node) => smallPlantGeometry.has(node.geometry)).every((node) => !node.matrixLiving && !node.matrixEmissiveLiving), onlyBrightClasses: glowing.every((node) => allowed.has(node)) && glowing.length === allowed.size && partial.every((node) => allowedPartial.has(node)) && partial.length === allowedPartial.size, inanimate: B.props.filter((o) => ["bush", "flower", "rock", "crate", "barrel", "gate"].includes(o.prop)).every((o) => !o.node.matrixLiving && !o.node.matrixEmissiveLiving), glyphAlphabet: Array.from({ length: 8 }, (_, i) => H.matrixGlyph(i).matrixGlyph === true).every(Boolean), referenceIsolated: B.matrixCave.caves.every((c) => c.sections.every((s) => (s.supports || [s]).every((support) => support.face.matrixLocalGlyphSurface && support.face.matrixCave === c.caveIndex))), brightClasses: B.matrixCave.world.brightClasses, livingNodes: glowing.length, expectedLivingNodes: allowed.size, partialNodes: partial.length, expectedPartialNodes: allowedPartial.size }; })()`);
  record("mirror world: surface, spilled, falling and fired bananas glow while the supporting dome remains a falling-glyph receiver", !matrixWorldOutside.active && matrixWorldOutside.radius === 0 && matrixWorldOutside.origin.join("|") === "0|0|0" && matrixWorldOutside.crew && matrixWorldOutside.trees && matrixWorldOutside.bananaPile && matrixWorldOutside.spillingBananas && matrixWorldOutside.fallingBananas && matrixWorldOutside.firedBananas && matrixWorldOutside.flyingBees && matrixWorldOutside.fireflies && matrixWorldOutside.embers && matrixWorldOutside.signLetters && matrixWorldOutside.torchFires && matrixWorldOutside.firePit && matrixWorldOutside.smallPlants && matrixWorldOutside.onlyBrightClasses && matrixWorldOutside.inanimate && matrixWorldOutside.glyphAlphabet && matrixWorldOutside.referenceIsolated && matrixWorldOutside.brightClasses === "cavemen|trees|banana-pile|flying-bees|cave-sign-letters|fireflies|fires" && matrixWorldOutside.livingNodes === matrixWorldOutside.expectedLivingNodes && matrixWorldOutside.partialNodes === matrixWorldOutside.expectedPartialNodes, JSON.stringify(matrixWorldOutside));
  const passAtEntry = await b.evaluate(`(() => { const B = window.__ooga, pass = B.mirror.reflectionPassCount; B.matrixCave.viewInside(false); return pass; })()`);
  await rendered(3);
  const matrixWorldEarly = await b.evaluate(`(() => { const W = window.__ooga.matrixCave.world; return { active: W.active, radius: W.radius, direction: W.direction, speed: W.speed, maxRadius: W.maxRadius, density: W.density, pile: W.covered(0, 0), meadow: W.covered(12, 0), rim: W.covered(22, 0), cave: W.covered(27, 0), distances: [W.flowDistance(0, 0), W.flowDistance(12, 0), W.flowDistance(22, 0), W.flowDistance(27, 0)] }; })()`);
  record("mirror world: crossing starts the pile-centered Matrix wave before it reaches the meadow, rim, or caves", matrixWorldEarly.active && matrixWorldEarly.radius > 0 && matrixWorldEarly.radius < matrixWorldEarly.maxRadius && matrixWorldEarly.direction === 1 && matrixWorldEarly.speed === 72 && matrixWorldEarly.maxRadius >= 38 && matrixWorldEarly.density === 1 && matrixWorldEarly.pile && !matrixWorldEarly.meadow && !matrixWorldEarly.rim && !matrixWorldEarly.cave && matrixWorldEarly.distances.join("|") === "0|12|22|27", JSON.stringify(matrixWorldEarly));
  const matrixWorldMotion = await b.evaluate(`new Promise((resolve) => { const B = window.__ooga, W = B.matrixCave.world, before = W.sampleStream(23), beforeWall = W.sampleWallStream(85), radii = [0.75, 1, 2, 6, 12, 24, 38], start = B.renderedFrames, tick = () => { if (B.renderedFrames >= start + 12) resolve({ before, after: W.sampleStream(23), beforeWall, afterWall: W.sampleWallStream(85), radial: { radii, counts: radii.map(W.radialStreamCountAt), spacings: radii.map(W.radialSpacingAt), line: [W.radialLinePoint(640, 2), W.radialLinePoint(640, 10), W.radialLinePoint(640, 30)] }, parity: { streamPitch: W.streamPitch, glyphGap: W.glyphGap, pixelPitch: W.pixelPitch, pixelSize: W.pixelSize, cadence: W.glyphCadenceHz, caveStreamPitch: B.matrixCave.surfacePitch, caveGlyphGap: B.matrixCave.surfaceGap, caveCadence: B.matrixCave.glyphCadenceHz, speed: [W.minimumStreamSpeed, W.maximumStreamSpeed], trains: [W.minimumTrainLength, W.maximumTrainLength], gaps: [W.minimumGapLength, W.maximumGapLength], palette: W.palette, leadingTipColor: W.leadingTipColor, voxelFaceShading: W.voxelFaceShading, antialiasedGlyphEdges: W.antialiasedGlyphEdges, caveEmissiveLighting: W.caveEmissiveLighting, sharedEmissionCurve: W.sharedEmissionCurve, lightingIndependentBrightness: W.lightingIndependentBrightness, emission: [W.emissionFloor, W.emissionCeiling], viewDependentPixelSides: W.viewDependentPixelSides, opaqueGlyphFaces: W.opaqueGlyphFaces, coordinateSystem: W.coordinateSystem, caveRestarts: W.caveRestartCount, wallDirection: W.wallFlowDirection } }); else requestAnimationFrame(tick); }; requestAnimationFrame(tick); })`);
  const outwardHead = ((matrixWorldMotion.after.head - matrixWorldMotion.before.head) % matrixWorldMotion.before.span + matrixWorldMotion.before.span) % matrixWorldMotion.before.span;
  const outwardGap = ((matrixWorldMotion.after.gap - matrixWorldMotion.before.gap) % matrixWorldMotion.before.span + matrixWorldMotion.before.span) % matrixWorldMotion.before.span;
  const expectedOutward = (matrixWorldMotion.after.time - matrixWorldMotion.before.time) * matrixWorldMotion.before.speed;
  const downwardHead = ((matrixWorldMotion.beforeWall.head - matrixWorldMotion.afterWall.head) % matrixWorldMotion.beforeWall.span + matrixWorldMotion.beforeWall.span) % matrixWorldMotion.beforeWall.span;
  const downwardGap = ((matrixWorldMotion.beforeWall.gap - matrixWorldMotion.afterWall.gap) % matrixWorldMotion.beforeWall.span + matrixWorldMotion.beforeWall.span) % matrixWorldMotion.beforeWall.span;
  const expectedDownward = (matrixWorldMotion.afterWall.time - matrixWorldMotion.beforeWall.time) * matrixWorldMotion.beforeWall.speed;
  const parity = matrixWorldMotion.parity;
  record("mirror world: glyph heads and their moving gaps travel outward instead of mutating on a stationary grid", outwardHead > 0.01 && Math.abs(outwardHead - outwardGap) < 0.002 && Math.abs(outwardHead - expectedOutward) < 0.01 && matrixWorldMotion.after.time > matrixWorldMotion.before.time, JSON.stringify({ ...matrixWorldMotion, outwardHead, outwardGap, expectedOutward }));
  record("mirror world: vertical surface glyph trains and their gaps move downward together", parity.wallDirection === "down" && downwardHead > 0.01 && Math.abs(downwardHead - downwardGap) < 0.002 && Math.abs(downwardHead - expectedDownward) < 0.01 && matrixWorldMotion.afterWall.direction === -1, JSON.stringify({ before: matrixWorldMotion.beforeWall, after: matrixWorldMotion.afterWall, downwardHead, downwardGap, expectedDownward }));
  record("mirror world: straight center rays progressively subdivide to fill widening gaps", matrixWorldMotion.radial.counts.join("|") === "32|64|128|256|512|1024|2048" && Math.max(...matrixWorldMotion.radial.spacings) < 0.148 && Math.abs(matrixWorldMotion.radial.line[0].x * matrixWorldMotion.radial.line[1].z - matrixWorldMotion.radial.line[0].z * matrixWorldMotion.radial.line[1].x) < 1e-8 && Math.abs(matrixWorldMotion.radial.line[1].x * matrixWorldMotion.radial.line[2].z - matrixWorldMotion.radial.line[1].z * matrixWorldMotion.radial.line[2].x) < 1e-8, JSON.stringify(matrixWorldMotion.radial));
  record("mirror world: exterior streams retain cave scale, palette, cadence, spacing and head-to-tail timing", parity.streamPitch === 0.12 && parity.streamPitch === parity.caveStreamPitch && parity.glyphGap === 0.13 && parity.glyphGap === parity.caveGlyphGap && parity.pixelPitch === 0.021 && parity.pixelSize === 0.016 && parity.cadence === 20 && parity.cadence === parity.caveCadence && Math.abs(parity.speed[0] - 0.56) < 1e-12 && Math.abs(parity.speed[1] - 1.2) < 1e-12 && parity.trains.join("|") === "7|12" && parity.gaps.join("|") === "2|6" && parity.palette === "#46ff70|#18dc4a" && parity.leadingTipColor === "#d6ffe3" && matrixWorldMotion.before.trainLength >= 7 && matrixWorldMotion.before.trainLength <= 12 && matrixWorldMotion.before.gapLength >= 2 && matrixWorldMotion.before.gapLength <= 6 && matrixWorldMotion.before.leadingGlow > matrixWorldMotion.before.secondGlow && matrixWorldMotion.before.secondGlow > matrixWorldMotion.before.trailingGlow && Math.abs((((matrixWorldMotion.before.gap - matrixWorldMotion.before.head) % matrixWorldMotion.before.span) + matrixWorldMotion.before.span) % matrixWorldMotion.before.span - 0.13) < 1e-9 && parity.coordinateSystem === "pile-centered-world-space", JSON.stringify(matrixWorldMotion));
  await matrixSettled(b);
  const surfaceSnapshot = () => b.evaluate(`(${matrixSurfaceSnapshot.toString()})()`);
  const matrixBefore = await surfaceSnapshot(), actualBacking = await b.evaluate(`(${matrixCaveSnapshot.toString()})()`), mirrorBacking = actualBacking.caves.find((c) => c.id === "c1");
  await rendered(16);
  const matrixAfter = await surfaceSnapshot();
  const population = (sample) => sample.expected.every((count, i) => count === sample.batches[i] && count === sample.drawn[i]);
  record("mirror interior: native code follows the actual jagged terrain floor, stepped ceiling, walls and back of the cave", actualBacking.linerNodes === 0 && mirrorBacking.owned && mirrorBacking.backingSourcesValid && mirrorBacking.sourceError < 0.0001 && mirrorBacking.terrain > 20 && mirrorBacking.terrainPlanes > 6 && mirrorBacking.ceilingLevels >= 2 && mirrorBacking.backFaces > 0 && mirrorBacking.sideFaces > 0 && mirrorBacking.fullFloor && mirrorBacking.fullCeiling && matrixBefore.noRoom, JSON.stringify(mirrorBacking));
  record("mirror interior: every full extruded glyph remains on its real source face and behind the entrance", mirrorBacking.finite && mirrorBacking.escaped === 0 && mirrorBacking.maxLocalZ < 0.48 && mirrorBacking.clearanceMin >= 0.0099 && mirrorBacking.clearanceMax <= 0.0101 && actualBacking.overlappingFaces === 0 && actualBacking.missingFlags === 0, JSON.stringify({ escaped: mirrorBacking.escaped, maxZ: mirrorBacking.maxLocalZ, clearance: [mirrorBacking.clearanceMin, mirrorBacking.clearanceMax], sourceError: mirrorBacking.sourceError }));
  record("mirror interior: each of the eight native batches matches the independently calculated moving train population", matrixBefore.inside && matrixBefore.visible && population(matrixBefore) && population(matrixAfter) && matrixBefore.batches.length === 8 && matrixBefore.batches.reduce((a, z) => a + z, 0) > 6000 && Object.values(matrixBefore.activeCategories).every((count) => count > 0), JSON.stringify({ expected: matrixBefore.expected, before: matrixBefore.batches, afterExpected: matrixAfter.expected, after: matrixAfter.batches, categories: matrixBefore.activeCategories }));
  record("mirror interior: head-to-tail brightness and staggered ceiling gaps preserve their complete contrast range", [matrixBefore, matrixAfter].every((s) => s.leaders > 100 && s.second > 100 && s.trailing > s.leaders && s.gaps > 500 && s.maximumGlow - s.minimumGlow > 0.3 && Object.values(s.distributions).every((d) => d.brightness[0] >= 0.58 && d.brightness[1] <= 0.94 && d.brightness[1] - d.brightness[0] > 0.3 && d.trains.join("|") === "7|8|9|10|11|12" && d.gaps.join("|") === "2|3|4|5|6") && s.distributions.ceiling.phases >= 14), JSON.stringify({ before: matrixBefore.distributions, after: matrixAfter.distributions, roles: [matrixBefore.leaders, matrixBefore.second, matrixBefore.trailing], glow: [matrixBefore.minimumGlow, matrixBefore.maximumGlow], gaps: matrixBefore.gaps }));
  record("mirror interior: twenty-hertz mutations and moving gaps reuse fixed native buffers", matrixBefore.cadence === 20 && matrixAfter.updates > matrixBefore.updates && matrixAfter.mutation !== matrixBefore.mutation && matrixAfter.versions.every((v, i) => v > matrixBefore.versions[i]) && [matrixBefore, matrixAfter].every((s) => s.buffers === 8 && s.allocations === 8 && s.rebuilds === 1 && s.capacity === s.expectedCapacity && s.bytes === s.capacity * 80 && s.capacity >= s.batches.reduce((a, z) => a + z, 0)) && matrixAfter.bytes === matrixBefore.bytes && matrixAfter.hash === matrixBefore.hash, JSON.stringify({ before: matrixBefore.versions, after: matrixAfter.versions, mutations: [matrixBefore.mutation, matrixAfter.mutation], capacity: matrixBefore.capacity, bytes: matrixBefore.bytes }));
  const matrixMotion = [matrixBefore, matrixAfter].map((sample) => ({ time: sample.time, motions: sample.motions }));
  const motion = Object.keys(matrixBefore.motions).map((name) => { const a = matrixBefore.motions[name], z = matrixAfter.motions[name], mod = (n) => (n % a.flowRange + a.flowRange) % a.flowRange; return { name, direction: a.direction, head: mod((z.head - a.head) * a.direction), gap: mod((z.gap - a.gap) * a.direction), expected: (matrixAfter.time - matrixBefore.time) * a.speed, separation: mod((a.head - a.gap) * a.direction), trail: a.trainLength * 0.13 }; });
  record("mirror interior: floor, ceiling and vertical trains carry their moving gaps in the configured world direction", motion.every((m) => m.head > 0.01 && Math.abs(m.head - m.gap) < 0.002 && Math.abs(m.head - m.expected) < 0.002 && Math.abs(m.separation - m.trail) < 0.002) && motion.find((m) => m.name === "wall").direction === -1 && matrixBefore.distributions.floor.directions.join("|") === "1" && matrixBefore.distributions.ceiling.directions.join("|") === "-1", JSON.stringify({ motion, samples: matrixMotion }));
  const matrixTiers = [matrixBefore];
  for (const quality of ["medium", "low", "high"]) { await b.evaluate(`window.__ooga.renderer.setQuality(${JSON.stringify(quality)})`); await rendered(3); matrixTiers.push(await surfaceSnapshot()); }
  record("mirror interior: every quality tier preserves real floor, ceiling and wall coverage within unchanged capacities", matrixTiers.map((s) => s.quality).join("|") === "high|medium|low|high" && matrixTiers.map((s) => s.density).join("|") === "1|0.625|0.375|1" && matrixTiers[0].batches.reduce((a, z) => a + z, 0) > matrixTiers[1].batches.reduce((a, z) => a + z, 0) && matrixTiers[1].batches.reduce((a, z) => a + z, 0) > matrixTiers[2].batches.reduce((a, z) => a + z, 0) && matrixTiers.every((s) => population(s) && Object.values(s.activeCategories).every((count) => count > 0) && s.capacity === matrixBefore.capacity && s.bytes === matrixBefore.bytes && s.buffers === 8 && s.allocations === 8 && s.rebuilds === 1), JSON.stringify(matrixTiers.map((s) => ({ quality: s.quality, counts: s.batches, categories: s.activeCategories, capacity: s.capacity, bytes: s.bytes }))));
  record("mirror interior: the one-way surface stops reflection work on entry and the completed wave leaves a live doorway", matrixBefore.portal && !matrixBefore.surfaceDrawn && matrixBefore.resources === 6 && matrixBefore.passes === passAtEntry && matrixAfter.passes === matrixBefore.passes && !matrixAfter.surfaceDrawn && matrixAfter.reason === "portal-open" && matrixAfter.resources === matrixBefore.resources, JSON.stringify({ passAtEntry, before: matrixBefore.passes, after: matrixAfter.passes }));
  await b.evaluate(`(${primeMatrixControls.toString()})()`); await rendered(2);
  const entranceViews = await b.evaluate(`(${matrixSurfaceViews.toString()})(${matrixSurfaceSnapshot.toString()})`);
  record("mirror entrance: jagged terrain and native floor, wall and ceiling coverage remain intact from nine interior viewpoints", entranceViews.length === 9 && entranceViews.every((s) => s.inside && s.visible && s.noRoom && s.liners === 0 && Object.values(s.categories).every((count) => count > 0) && s.hash === matrixBefore.hash && s.records === entranceViews[0].records), JSON.stringify(entranceViews));
  const portalView = await b.evaluate(`(() => { const B = window.__ooga, w = B.mirrorCave.node.world, p = B.project(w[12], w[13], w[14]); return { scene: B.scene, p, inside: B.cameraCave.id === "c1", portal: B.mirror.portal, surfaceDrawn: B.mirror.surfaceDrawn, passes: B.mirror.reflectionPassCount, frames: B.renderedFrames, width: B.renderer.size.width, height: B.renderer.size.height }; })()`);
  record("mirror interior: looking back frames the correctly oriented live world through the open doorway", portalView.scene === "hub" && portalView.inside && portalView.portal && !portalView.surfaceDrawn && portalView.p && portalView.p.x >= 0 && portalView.p.x <= portalView.width && portalView.p.y >= 0 && portalView.p.y <= portalView.height && portalView.passes === matrixBefore.passes, JSON.stringify(portalView));
  const portalCycles = await b.evaluate(`new Promise((resolve) => { const B = window.__ooga, samples = [], base = { records: B.renderer.stats.records, buffers: B.matrixCave.bufferCount, allocations: B.matrixCave.allocationCount, rebuilds: B.matrixCave.rebuildCount }, wait = (count, done) => { const start = B.renderedFrames, tick = () => B.renderedFrames >= start + count ? done() : requestAnimationFrame(tick); requestAnimationFrame(tick); }, sample = (side) => samples.push({ side, inside: B.matrixCave.inside, drawEnabled: B.matrixCave.drawEnabled, drawn: B.matrixCave.drawnGlyphCount, active: B.matrixCave.activeGlyphCount, worldActive: B.matrixCave.world.active, worldRadius: B.matrixCave.world.radius, records: B.renderer.stats.records, resources: B.mirror.resources }), cycle = (i) => { if (i === 3) return resolve({ base, samples }); B.matrixCave.viewApproach(); wait(2, () => { sample("outside"); B.matrixCave.viewInside(false); wait(2, () => { sample("inside"); cycle(i + 1); }); }); }; cycle(0); })`);
  record("mirror interior: repeated crossings keep the existing wave and fixed resources alive during reversal", portalCycles.samples.filter((sample) => sample.side === "outside").every((sample) => !sample.inside && sample.worldActive && sample.worldRadius > 0) && portalCycles.samples.filter((sample) => sample.side === "inside").every((sample, i) => sample.inside && sample.worldActive && sample.worldRadius > portalCycles.samples[i * 2].worldRadius) && portalCycles.samples.every((sample) => sample.records === portalCycles.base.records && sample.resources === 6) && portalCycles.base.buffers === 8 && portalCycles.base.allocations === 8 && portalCycles.base.rebuilds === 1, JSON.stringify(portalCycles));
  await matrixSettled(b);
  const overlaySight = await b.evaluate(`(() => { const B = window.__ooga, m = B.mirrorCave.mouth, world = (x, y, z) => [m.x + Math.cos(m.ry) * x + Math.sin(m.ry) * z, m.floorY + y, m.z - Math.sin(m.ry) * x + Math.cos(m.ry) * z], test = (x, y, z) => B.matrixCave.overlayVisible(...world(x, y, z)); return { doorway: test(0, 1.5, 3), leftWall: test(-6, 1.5, 3), rightWall: test(6, 1.5, 3), aboveRim: test(0, 4.2, 3) }; })()`);
  record("mirror interior: speech and sleep overlays are visible only through the doorway", overlaySight.doorway && !overlaySight.leftWall && !overlaySight.rightWall && !overlaySight.aboveRim, JSON.stringify(overlaySight));
  // Eating debits fractional supply before the pile floors it for display. Keep
  // a sub-banana reserve (well above the eight eaters' maximum .040/frame debit)
  // so every measured frame displays exactly one million. Normal crew updates
  // continue, and replenishment work remains inside the measured FPS interval.
  const matrixPerf = await b.evaluate(`new Promise((resolve) => { const B = window.__ooga; B.renderer.setQuality("high"); B.setPileLevel(1000000.5); B.matrixCave.viewInside(false); const startFrame = B.renderedFrames, start = performance.now(); let minimumShown = B.shown, maximumShown = B.shown; const tick = () => { minimumShown = Math.min(minimumShown, B.shown); maximumShown = Math.max(maximumShown, B.shown); if (B.level < 1000000.25) B.setPileLevel(1000000.5); const frames = B.renderedFrames - startFrame, seconds = (performance.now() - start) / 1000; if (frames >= 120 || seconds > 6) resolve({ fps: frames / seconds, frames, shown: B.shown, minimumShown, maximumShown, active: B.matrixCave.activeGlyphCount, buffers: B.matrixCave.bufferCount, bytes: B.matrixCave.bufferBytes, allocations: B.matrixCave.allocationCount, rebuilds: B.matrixCave.rebuildCount, records: B.renderer.stats.records }); else requestAnimationFrame(tick); }; requestAnimationFrame(tick); })`);
  record("mirror interior: full surface code and the million-banana pile remain at least 50 FPS", matrixPerf.fps >= 50 && matrixPerf.frames >= 120 && matrixPerf.shown === 1000000 && matrixPerf.minimumShown === 1000000 && matrixPerf.maximumShown === 1000000 && matrixPerf.active > 6000 && matrixPerf.buffers === 8 && matrixPerf.bytes === matrixBefore.bytes && matrixBefore.capacity === matrixBefore.expectedCapacity && matrixPerf.allocations === 8 && matrixPerf.rebuilds === 1, JSON.stringify(matrixPerf));
  await b.evaluate(`window.__ooga.setPileLevel(1000)`);
  await rendered(4);
  const entranceLighting = await b.evaluate(`new Promise((resolve) => { const B = window.__ooga, sample = () => ({ fixtures: B.entranceLights.map((l) => ({ id: l.id, caveId: l.caveId, kind: l.kind, side: l.side, worldPosition: [...l.worldPosition], factor: l.factor, lit: l.lit, selected: l.selected, approximated: l.approximated })), lighting: { registered: B.lighting.registeredLampCount, active: B.lighting.activeFullLightCount, approximated: B.lighting.approximatedLightCount, capacity: B.lighting.configuredLightCapacity, selected: B.lighting.selectedIds.slice(0, B.lighting.selectedCount), approximateIds: B.lighting.approximatedIds.slice(0, B.lighting.approximatedCount), tier: B.lighting.tier }, lightData: Array.from(B.renderOpts.lights.slice(0, B.renderOpts.lightCount * 8)) }), wait = (frames, done) => { const start = B.renderedFrames, tick = () => B.renderedFrames >= start + frames ? done() : requestAnimationFrame(tick); requestAnimationFrame(tick); }, setView = (id) => { const m = B.mouths.find((v) => v.id === id), o = B.pilot.orbit, target = { x: m.x, y: m.floorY + 1.5, z: m.z }; o.target = target; o.tx = target.x; o.ty = target.y; o.tz = target.z; o.yaw = o.tYaw = m.ry; o.pitch = o.tPitch = 0.15; o.dist = o.tDist = 6; B.pilot.update(0.1); }; B.renderer.setQuality("high"); B.setHour(12, NaN, 80); wait(3, () => { const day = sample(); B.setHour(18.08, NaN, 80); wait(3, () => { const dusk = sample(); B.setHour(22, NaN, 80); setView("c11"); wait(3, () => { const entropy = sample(); setView("c1"); wait(3, () => { const ooga = sample(); B.renderer.setQuality("medium"); wait(3, () => { const medium = sample(); B.renderer.setQuality("low"); wait(3, () => { const low = sample(); B.renderer.setQuality("high"); wait(3, () => resolve({ day, dusk, entropy, ooga, medium, low })); }); }); }); }); }); }); })`);
  const equivalent = (sample) => ["torch:left", "torch:right", "lantern:right"].every((key) => { const [kind, side] = key.split(":"), a = sample.fixtures.find((l) => l.caveId === "c11" && l.kind === kind && l.side === side), z = sample.fixtures.find((l) => l.caveId === "c1" && l.kind === kind && l.side === side); return a && z && Math.abs(a.factor - z.factor) < 1e-8 && a.lit === z.lit; });
  record("entrance lights: both caves fade identically through day, dusk, and night", entranceLighting.day.fixtures.every((l) => !l.lit && l.factor === 0) && entranceLighting.dusk.fixtures.some((l) => l.factor > 0 && l.factor < 1) && equivalent(entranceLighting.day) && equivalent(entranceLighting.dusk) && equivalent(entranceLighting.entropy), JSON.stringify(entranceLighting));
  const exactProfiles = (sample) => sample.fixtures.every((l) => l.selected && !l.approximated && sample.lighting.selected.includes(l.id) && Array.from({ length: sample.lightData.length / 8 }, (_, i) => i * 8).some((i) => Math.max(Math.abs(sample.lightData[i] - l.worldPosition[0]), Math.abs(sample.lightData[i + 1] - l.worldPosition[1]), Math.abs(sample.lightData[i + 2] - l.worldPosition[2])) < 1e-5));
  record("entrance lights: all nine fixtures keep simultaneous full local-light profiles on every WebGL tier", [entranceLighting.entropy, entranceLighting.ooga, entranceLighting.medium, entranceLighting.low].every((sample) => sample.lighting.registered === 10 && sample.lighting.active === 10 && sample.lighting.approximated === 0 && sample.lighting.capacity === 10 && sample.lighting.selected.length === 10 && sample.lighting.selected.includes("firepit") && exactProfiles(sample)), JSON.stringify(entranceLighting));
  record("entrance lights: camera movement cannot exchange or reorder the fixed light set", entranceLighting.entropy.lighting.selected.join("|") === entranceLighting.ooga.lighting.selected.join("|") && entranceLighting.entropy.lightData.every((v, i) => v === entranceLighting.ooga.lightData[i]), JSON.stringify({ entropy: entranceLighting.entropy.lighting, ooga: entranceLighting.ooga.lighting }));
  await b.evaluate(`window.__ooga.matrixCave.viewInside(false)`);
  // The lighting views above leave the cave and retract its wave. Wait for
  // both the returning wave and the physical descent before testing closure.
  await matrixSettled(b);
  await b.evaluate(`new Promise((resolve, reject) => { const B = window.__ooga, start = performance.now(), tick = () => { if (B.matrixGate.gates.every((g) => !g.open && !g.held && g.node.position.y === g.floor)) resolve(); else if (performance.now() - start > 5000) reject(new Error("Glyph gates did not finish descending")); else requestAnimationFrame(tick); }; requestAnimationFrame(tick); })`);
  const controlHint = await b.evaluate(`document.getElementById("hint").textContent`);
  const controlPoint = await b.evaluate(`(() => { const B = window.__ooga, n = B.matrixGate.button, w = n.world, p = B.project(w[12], w[13] + 0.08, w[14]), hit = B.input.pick(p.x, p.y); return { x: p.x, y: p.y, kind: hit && hit.owner.kind, inside: B.matrixCave.inside }; })()`);
  await b.mouse("mouseMoved", controlPoint.x, controlPoint.y, { button: "none" });
  await rendered(2);
  const controlTooltip = await b.evaluate(`document.getElementById("tooltip").textContent`);
  const gatesWaiting = await b.evaluate(`(() => { const G = window.__ooga.matrixGate; return { visible: G.gates.every((g) => !g.open && g.node.position.y === G.visibleHeight), visibleHeight: G.visibleHeight, hiddenHeight: G.hiddenHeight }; })()`);
  await b.click(controlPoint.x, controlPoint.y);
  await rendered(72);
  const gatesRemoved = await b.evaluate(`(() => { const B = window.__ooga, G = B.matrixGate; return { unlocked: G.unlocked, pressed: G.pressed, living: G.button.matrixLiving, glow: G.button.glow, buttonY: G.button.position.y, gates: G.gates.map((g) => ({ open: g.open, y: g.node.position.y, cave: g.node.geometry.matrixCave })), hiddenHeight: G.hiddenHeight, mirror: { portal: B.mirror.portal, reveal: B.mirror.reveal }, world: { active: B.matrixCave.world.active, direction: B.matrixCave.world.direction, radius: B.matrixCave.world.radius } }; })()`);
  await b.evaluate(`window.__ooga.matrixCave.viewApproach()`);
  await rendered(6);
  const gatesLatchedOutside = await b.evaluate(`(() => { const B = window.__ooga, G = B.matrixGate; return { inside: B.matrixCave.inside, unlocked: G.unlocked, removed: G.gates.every((g) => g.open && g.node.position.y === G.hiddenHeight), portal: B.mirror.portal, reveal: B.mirror.reveal, active: B.matrixCave.world.active, direction: B.matrixCave.world.direction, radius: B.matrixCave.world.radius }; })()`);
  record("matrix gate control: the completed wave leaves every occupied cave's barred entrance visible", gatesWaiting.visible && gatesWaiting.visibleHeight === 0 && gatesWaiting.hiddenHeight > 3, JSON.stringify(gatesWaiting));
  record("matrix gate control: proximity prompts at the physical rear button and pressing it raises every glyph-covered entrance gate", controlHint === "Press Space or tap the control to press it in" && controlPoint.inside && controlPoint.kind === "matrix-button" && controlTooltip === "Matrix gate control · press in" && gatesRemoved.unlocked && gatesRemoved.pressed && gatesRemoved.living && gatesRemoved.glow === 1 && gatesRemoved.buttonY === 1.04 && gatesRemoved.gates.every((g) => g.open && g.y === gatesRemoved.hiddenHeight && g.cave > 0) && gatesRemoved.mirror.portal && gatesRemoved.mirror.reveal === 1 && gatesRemoved.world.active, JSON.stringify({ controlHint, controlPoint, controlTooltip, gatesRemoved }));
  record("matrix gate control: leaving the cave keeps the gates underground, glyph world active, and exterior mirror hidden", !gatesLatchedOutside.inside && gatesLatchedOutside.unlocked && gatesLatchedOutside.removed && gatesLatchedOutside.portal && gatesLatchedOutside.reveal === 1 && gatesLatchedOutside.active && gatesLatchedOutside.direction >= 0 && gatesLatchedOutside.radius > 0, JSON.stringify(gatesLatchedOutside));
  await b.evaluate(`window.__ooga.matrixCave.viewInside(false)`);
  await rendered(4);
  await b.evaluate(`window.__ooga.matrixGate.set(false)`);
  await rendered(72);
  const gatesReset = await b.evaluate(`(() => { const B = window.__ooga, G = B.matrixGate; return { unlocked: G.unlocked, pressed: G.pressed, living: G.button.matrixLiving, glow: G.button.glow, buttonY: G.button.position.y, closed: G.gates.every((g) => !g.open && g.node.position.y === G.visibleHeight), portal: B.mirror.portal, reveal: B.mirror.reveal }; })()`);
  record("matrix gate control: pressing back out lowers the bars from the ceiling and darkens the button", !gatesReset.unlocked && !gatesReset.pressed && !gatesReset.living && gatesReset.glow < 0.5 && gatesReset.buttonY === 1.12 && gatesReset.closed && gatesReset.portal && gatesReset.reveal === 1, JSON.stringify(gatesReset));
  await b.evaluate(`window.__ooga.matrixCave.viewApproach()`);
  await rendered(72);
  const travel = (id) => b.evaluate(`new Promise((resolve) => { const B = window.__ooga, t0 = performance.now(); let enteredAt = 0; B.go(${JSON.stringify(id)}); const tick = () => { if (!enteredAt && B.scene === ${JSON.stringify(id)}) enteredAt = B.renderedFrames; if (enteredAt && B.renderedFrames >= enteredAt + 25) resolve(true); else if (performance.now() - t0 > 6000) resolve(false); else requestAnimationFrame(tick); }; requestAnimationFrame(tick); })`);
  const reachedLab = await travel("lab");
  const labResources = await b.evaluate(`(() => { const B = window.__ooga; return { scene: B.scene, active: B.mirror.active, resources: B.mirror.resources }; })()`);
  const reachedHub = await travel("hub");
  const hubResources = await b.evaluate(`(() => { const B = window.__ooga; return { scene: B.scene, active: B.mirror.active, resources: B.mirror.resources, records: B.renderer.stats.records, entranceLights: B.entranceLights.length, registered: B.entranceLights.every((l) => l.registered), matrix: { hash: B.matrixCave.registryHash, capacity: B.matrixCave.capacity, buffers: B.matrixCave.bufferCount, allocations: B.matrixCave.allocationCount, rebuilds: B.matrixCave.rebuildCount } }; })()`);
  const cycled = { reachedLab, reachedHub, lab: labResources, hub: hubResources };
  const restored = await b.evaluate(`new Promise((resolve) => { const B = window.__ooga, before = { resources: B.mirror.resources, records: B.renderer.stats.records, allocations: B.mirror.allocationCount }, gl = document.getElementById("scene").getContext("webgl2"), ext = gl.getExtension("WEBGL_lose_context"), t0 = performance.now(); ext.loseContext(); setTimeout(() => ext.restoreContext(), 150); const tick = () => { if (B.mirror.active && B.mirror.resources === before.resources && B.mirror.allocationCount > before.allocations && B.mirror.reflectionPassCount > 0 && B.renderer.stats.records === before.records) resolve({ before, after: { resources: B.mirror.resources, records: B.renderer.stats.records, allocations: B.mirror.allocationCount, width: B.mirror.width, height: B.mirror.height } }); else if (performance.now() - t0 > 6000) resolve({ before, after: { resources: B.mirror.resources, records: B.renderer.stats.records, allocations: B.mirror.allocationCount, width: B.mirror.width, height: B.mirror.height } }); else requestAnimationFrame(tick); }; requestAnimationFrame(tick); })`);
  record("mirror cave: scene cycling and context restoration release and recreate a fixed resource set", cycled.lab.scene === "lab" && !cycled.lab.active && cycled.lab.resources === 0 && cycled.hub.scene === "hub" && cycled.hub.active && cycled.hub.resources === 6 && cycled.hub.entranceLights === 9 && cycled.hub.registered && restored.before.resources === 6 && restored.after.resources === 6 && restored.after.records === restored.before.records && Math.max(restored.after.width, restored.after.height) <= 512, JSON.stringify({ cycled, restored }));
  record("mirror interior: scene cycling rebuilds the same bounded deterministic surface registry", cycled.hub.matrix.hash === matrixBefore.hash && cycled.hub.matrix.capacity === matrixBefore.capacity && cycled.hub.matrix.buffers === 8 && cycled.hub.matrix.allocations === 8 && cycled.hub.matrix.rebuilds === 1, JSON.stringify({ before: { hash: matrixBefore.hash, capacity: matrixBefore.capacity }, after: cycled.hub.matrix }));
}];

const mirrorCanvas = () => withPage("mirror canvas fallback", hubPage(src, "canvas2d=1&bananas=1000000&hour=22"), async (b) => {
  const r = await b.evaluate(`(() => { const B = window.__ooga, C = B.mirrorCave, candidates = B.props.filter((o) => o.scenery); return { kind: B.renderer.kind, active: B.mirror.active, faux: B.mirror.faux, surfaceDrawn: B.mirror.surfaceDrawn, resources: B.mirror.resources, passes: B.mirror.reflectionPassCount, skipped: B.mirror.skippedPassCount, children: C.group.children.length - C.guides.doorwayNodes.length, glyphBatches: C.guides.doorwayNodes.length, glyphsAttached: C.guides.doorwayNodes.every((node) => node.parent === C.group && node.sightHidden && node.geometry.matrixGlyph && node.fixedInstanceCapacity), mirrorMarked: C.node.mirror === true, path: { active: B.path.active, inner: B.path.ringInnerRadius, outer: B.path.ringOuterRadius, count: B.path.visibleInstanceCount, capacity: B.path.bufferCapacity, masterMaskBuildCount: B.path.masterMaskBuildCount, masterMaskHash: B.path.masterMaskHash }, scenery: { ...B.scenery, signature: candidates.map((o) => [o.prop, o.x, o.z, o.node.rotation.y].join(":" )).join("|") } }; })()`);
  record("mirror canvas fallback: depth-sorted faux mirror draws without reflection resources", r.kind === "canvas2d" && r.active && r.faux && r.surfaceDrawn && r.resources === 0 && r.passes === 0 && r.skipped > 0 && r.children === 8 && r.glyphBatches === 8 && r.glyphsAttached && r.mirrorMarked, JSON.stringify({ kind: r.kind, active: r.active, faux: r.faux, surfaceDrawn: r.surfaceDrawn, resources: r.resources, passes: r.passes, skipped: r.skipped, children: r.children, glyphBatches: r.glyphBatches, glyphsAttached: r.glyphsAttached, mirrorMarked: r.mirrorMarked }));
  const canvasPanel = await b.evaluate(`(() => { const B = window.__ooga, rim = B.mirrorCave.rim.geometry, original = window.BL.hubModels.caveMouthRim(); return { vertices: rim.verts === original.verts, faces: rim.faces.length === original.faces.length && rim.faces.every((face, i) => face.i === original.faces[i].i && face.color === original.faces[i].color), rear: rim.faces.filter((face) => face.i.every((i) => rim.verts[i * 3 + 2] === -0.5)).length, noRoom: !("room" in B.mirrorCave) }; })()`);
  record("mirror canvas fallback: the original stone rim is complete and no artificial room replaces the terrain", canvasPanel.vertices && canvasPanel.faces && canvasPanel.rear === 18 && canvasPanel.noRoom, JSON.stringify(canvasPanel));
  const canvasLights = await b.evaluate(`(() => { const B = window.__ooga; return { count: B.entranceLights.length, registered: B.entranceLights.every((l) => l.registered), lit: B.entranceLights.every((l) => l.lit && l.factor > 0.9), pointLights: B.renderOpts.lightCount, lighting: { registered: B.lighting.registeredLampCount, active: B.lighting.activeFullLightCount, approximated: B.lighting.approximatedLightCount, capacity: B.lighting.configuredLightCapacity, ids: B.lighting.approximatedIds.slice(0, B.lighting.approximatedCount), tier: B.lighting.tier } }; })()`);
  record("entrance lights: Canvas fallback draws all emissive fixtures without point-light resources", canvasLights.count === 9 && canvasLights.registered && canvasLights.lit && canvasLights.pointLights === 0 && canvasLights.lighting.registered === 10 && canvasLights.lighting.active === 0 && canvasLights.lighting.approximated === 10 && canvasLights.lighting.capacity === 0 && canvasLights.lighting.ids.length === 10 && canvasLights.lighting.tier === "canvas2d", JSON.stringify(canvasLights));
  record("dynamic path: Canvas fallback renders the same immutable million-banana network", r.path.active && r.path.inner === 7.25 && r.path.outer === 8.75 && r.path.count > 0 && r.path.count <= r.path.capacity && r.path.masterMaskBuildCount === 1 && r.path.masterMaskHash === pathMasterHash, JSON.stringify(r.path));
  record("dynamic scenery: Canvas fallback starts large with the same deterministic registry", r.scenery.candidateCount === 376 && r.scenery.visibleCount > 0 && r.scenery.signature === scenerySignature, JSON.stringify({ candidateCount: r.scenery.candidateCount, visibleCount: r.scenery.visibleCount, radiusCulledCount: r.scenery.radiusCulledCount, pathCulledCount: r.scenery.pathCulledCount }));
  await b.evaluate(`window.__ooga.matrixCave.viewApproach()`);
  await matrixSettled(b, false);
  const canvasExterior = await b.evaluate(`(${matrixSurfaceSnapshot.toString()})()`);
  record("mirror exterior: Canvas fallback keeps the sealed Mirror Cave's native glyph batches live before crossing", !canvasExterior.inside && !canvasExterior.active && canvasExterior.radius === 0 && canvasExterior.visible && canvasExterior.batches.length === 8 && canvasExterior.expected.every((count, i) => count > 0 && count === canvasExterior.batches[i] && count === canvasExterior.drawn[i]) && canvasExterior.entries > 0 && canvasExterior.entries < canvasExterior.registered / 4, JSON.stringify({ batches: canvasExterior.batches, drawn: canvasExterior.drawn, retained: canvasExterior.entries, registered: canvasExterior.registered }));
  await b.evaluate(`window.__ooga.matrixCave.viewInside(true)`);
  await matrixSettled(b);
  const matrix = await b.evaluate(`(${matrixSurfaceSnapshot.toString()})()`);
  record("mirror interior: Canvas draws the complete eligible jagged-surface population in eight fixed batches", matrix.scene === "hub" && matrix.kind === "canvas2d" && matrix.active && matrix.portal && !matrix.surfaceDrawn && matrix.faux && matrix.resources === 0 && matrix.expected.every((count, i) => count === matrix.batches[i] && count === matrix.drawn[i]) && matrix.batches.length === 8 && Object.values(matrix.activeCategories).every((count) => count > 0) && matrix.leaders > 80 && matrix.capacity >= matrix.batches.reduce((sum, n) => sum + n, 0) && matrix.capacity < matrix.registered && matrix.quality === "canvas2d" && matrix.density === 0.125 && matrix.buffers === 8 && matrix.capacity === matrix.expectedCapacity && matrix.bytes === matrix.capacity * 80 && matrix.allocations === 8 && matrix.rebuilds === 1 && matrix.visible && matrix.inside && matrix.updates > 0 && matrix.noRoom && matrix.liners === 0, JSON.stringify(matrix));
  const canvasMotion = await b.evaluate(`new Promise((resolve) => { const B = window.__ooga, before = B.matrixCave.sampleMotion("wall"), start = B.renderedFrames, tick = () => { if (B.renderedFrames >= start + 10) resolve({ before, after: B.matrixCave.sampleMotion("wall") }); else requestAnimationFrame(tick); }; requestAnimationFrame(tick); })`);
  const canvasHead = ((canvasMotion.before.head - canvasMotion.after.head) % canvasMotion.before.flowRange + canvasMotion.before.flowRange) % canvasMotion.before.flowRange;
  const canvasGap = ((canvasMotion.before.gap - canvasMotion.after.gap) % canvasMotion.before.flowRange + canvasMotion.before.flowRange) % canvasMotion.before.flowRange;
  record("mirror interior: Canvas fallback moves each train and gap together", canvasHead > 0.01 && Math.abs(canvasHead - canvasGap) < 0.002 && canvasMotion.before.direction === -1 && canvasMotion.after.direction === -1, JSON.stringify({ ...canvasMotion, headDistance: canvasHead, gapDistance: canvasGap }));
  await b.evaluate(`new Promise((resolve, reject) => { const B = window.__ooga, W = B.matrixCave.world, start = performance.now(), frame = B.renderedFrames, tick = () => { if (W.radius >= W.maxRadius && B.renderedFrames > frame) resolve(); else if (performance.now() - start > 20000) reject(new Error("Canvas Matrix propagation did not reach the island perimeter")); else requestAnimationFrame(tick); }; requestAnimationFrame(tick); })`);
  const canvasWorld = await b.evaluate(`(() => { const B = window.__ooga, W = B.matrixCave.world, stats = B.renderer.stats; return { active: W.active, radius: W.radius, maxRadius: W.maxRadius, pile: W.covered(0, 0), rim: W.covered(22, 0), cave: W.covered(27, 0), matrixSurfaces: stats.matrixSurfaces, livingSurfaces: stats.matrixLivingSurfaces, samples: stats.matrixSamples, sampleBudget: stats.matrixSampleBudget, sampleStep: stats.matrixSampleStep, tileBytes: stats.matrixTileBytes }; })()`);
  record("mirror world: Canvas fallback surface-clips code and preserves glowing living silhouettes after the wave reaches the caves", canvasWorld.active && canvasWorld.radius === canvasWorld.maxRadius && canvasWorld.pile && canvasWorld.rim && canvasWorld.cave && canvasWorld.matrixSurfaces > 0 && canvasWorld.livingSurfaces > 0, JSON.stringify(canvasWorld));
  record("mirror world: Canvas surface rasterization keeps a fixed tile and bounded per-frame samples", canvasWorld.tileBytes === 4096 && canvasWorld.sampleBudget === 524288 && canvasWorld.samples > 0 && canvasWorld.samples <= canvasWorld.sampleBudget && canvasWorld.sampleStep >= 1, JSON.stringify(canvasWorld));
});

const matrixPhotometry = (backend, interpolation = true) => [`matrix pixels ${backend}${interpolation ? "" : " without optional sample interpolation"}`, async (b) => {
  const label = backend + (interpolation ? "" : " without optional sample interpolation");
  const measured = await b.evaluate(`(${matrixPixelProbe.toString()})(${JSON.stringify(backend)}, ${interpolation})`);
  const { samples, interiors } = measured, close = (a, z, tolerance) => Math.abs(a - z) <= tolerance * Math.max(a, 0.02);
  const detail = samples.map((s) => ({ pose: `${s.surface}/${s.distance}/${s.condition}`, mean: [s.reference.mean, s.world.mean].map((v) => +v.toFixed(4)), contrast: [s.reference.range, s.world.range].map((v) => +v.toFixed(4)), bloom: [s.referenceBloom.mean, s.worldBloom.mean].map((v) => +v.toFixed(4)) }));
  record(`matrix pixels ${label}: measured glyph energy and contrast match voxel references at three projected sizes on floors and walls`, samples.length === 36 && samples.every((s) => s.reference.count > 1000 && close(s.reference.mean, s.world.mean, 0.05) && close(s.reference.range, s.world.range, backend === "webgl2" && !measured.nativeSamples ? s.distance === 10 ? 0.25 : 0.08 : 0.06)), JSON.stringify(detail));
  record(`matrix pixels ${label}: resolved leaders, second glyphs, bodies and darker tails retain the original brightness gradient`, samples.filter((s) => s.distance === 2.4).every((s) => { const a = s.reference.roles, z = s.world.roles; return [a, z].every((r) => r.head > r.second && r.second > r.body && r.body > r.tail && r.tail > r.gap + 0.3) && ["head", "second", "body", "tail", "gap"].every((role) => Math.abs(a[role] - z[role]) < 0.025); }), JSON.stringify(samples.filter((s) => s.distance === 2.4).map((s) => ({ surface: s.surface, condition: s.condition, reference: s.reference.roles, world: s.world.roles }))));
  record(`matrix pixels ${label}: bright-tip color and bloom match through oblique views and fog`, samples.every((s) => close(s.referenceBloom.mean, s.worldBloom.mean, backend === "webgl2" ? 0.07 : 0.05) && s.reference.rgb.every((v, i) => Math.abs(v - s.world.rgb[i]) < 0.06)) && samples.filter((s) => s.distance === 2.4 && s.condition !== "fog").every((s) => s.reference.white > 0.005 && s.world.white > 0.005), JSON.stringify(detail));
  record(`matrix pixels ${label}: reversing the light leaves glyph fronts equally bright`, ["wall", "floor"].every((surface) => [2.4, 5.4, 10].every((distance) => { const a = samples.find((s) => s.surface === surface && s.distance === distance && s.condition === "lit"), z = samples.find((s) => s.surface === surface && s.distance === distance && s.condition === "unlit"); return Math.abs(a.world.mean - z.world.mean) < 0.001 && Math.abs(a.reference.mean - z.reference.mean) < 0.001; })));
  record(`matrix pixels ${label}: radial and downward glyphs move between mutation ticks with bright leaders and moving dark gaps`, measured.motion.length === 2 && measured.motion.every((s) => { const a = s.frames[0], z = s.frames[1]; return Math.floor(a.time * 20) === Math.floor(z.time * 20) && a.reference.fingerprint !== z.reference.fingerprint && a.world.fingerprint !== z.world.fingerprint && s.frames.every((f) => ["head", "tail", "gap"].every((role) => Math.abs(f.reference.roles[role] - f.world.roles[role]) < 0.025) && f.world.roles.head > f.world.roles.tail && f.world.roles.tail > f.world.roles.gap + 0.3); }), JSON.stringify(measured.motion));
  record(`matrix pixels ${label}: each cave stays normal before the entrance, reveals front to back, and restores in reverse without global glyph leakage`, interiors.length === 8 && interiors.every((s) => { const [near, deep] = s.planes; return s.planes.every((p) => p.normal > 0.15 && Math.abs(p.normal - p.restored) < 1e-9 && [0, 1, 2, 8, 9].every((i) => Math.abs(p.values[i] - p.normal) < 0.001) && p.values[5] < 0.001 && p.values[3] === p.values[7] && p.values[4] === p.values[6]) && near.values[3] < 0.001 && Math.abs(deep.values[3] - deep.normal) < 0.001 && Math.abs(deep.values[4] / deep.normal - 0.5) < 0.025; }), JSON.stringify(interiors));
  record(`matrix pixels ${label}: native cave glyph pixels follow the same smooth reversible wave without premature glow`, interiors.every((s) => { const v = s.glyphValues; return v[0] === 0 && v[1] === 0 && v[5] === 0 && v[3] > 0.0001 && Math.abs(v[2] / v[3] - 0.5) < 0.04 && v[2] === v[4]; }), JSON.stringify(interiors.map((s) => ({ cave: s.cave, values: s.glyphValues }))));
  record(`matrix pixels ${label}: a permanent cave stays black-backed with native glyphs while the global wave is inactive`, interiors.filter((s) => s.permanent).length === 1 && interiors.find((s) => s.permanent).permanent.surface < 0.001 && interiors.find((s) => s.permanent).permanent.glyph > 0.0001, JSON.stringify(interiors.map((s) => ({ cave: s.cave, permanent: s.permanent }))));
  record(`matrix pixels ${label}: unowned bright occupants inside each cave follow its doorway wave instead of the shorter direct radius`, measured.occupants.length === 8 && measured.occupants.every((s) => { const v = s.values; return s.normal > 0.15 && [0, 1, 5, 6].every((i) => v[i] === s.normal) && v[3] > s.normal + 0.3 && Math.abs(v[2] - (s.normal + v[3]) * 0.5) < 0.025 && v[2] === v[4] && s.restored === s.normal; }), JSON.stringify(measured.occupants));
  if (backend === "webgl2") {
    record(`matrix pixels ${label}: partial hot leaders, trails and emissive silhouettes blend finalized color and bloom endpoints`, measured.transitions.length === 3 && measured.transitions.every((s) => s.midpoint.color.max <= 3 && s.midpoint.color.mean < 1 && s.midpoint.bloom.max <= 5 && s.midpoint.bloom.mean < 1), JSON.stringify(measured.transitions));
    record(`matrix pixels ${label}: code and source emission remain continuous on both sides of the old 0.999 threshold`, measured.transitions.every((s) => s.nearFull.every((f) => f.color.max <= 2 && f.color.mean < 0.5 && f.bloom.max <= 3 && f.bloom.mean < 0.5)), JSON.stringify(measured.transitions.map((s) => ({ kind: s.kind, nearFull: s.nearFull }))));
  }
  if (backend === "webgl2") record(`matrix pixels ${label}: shadowed comparisons use a real off-camera shadow caster`, measured.shadow.lit > 0.15 && measured.shadow.blocked < measured.shadow.lit * 0.1, JSON.stringify(measured.shadow));
}];

const matrixNavigation = (backend) => withPage(`cave camera ${backend}`, hubPage(src, backend === "canvas2d" ? "canvas2d=1" : ""), async (b) => {
  const label = `cave camera ${backend}`;
  await b.evaluate(`window.__oogaCameraTraversal = (${matrixNavigationProbe.toString()})(${primeMatrixControls.toString()}); true`);
  let r;
  try {
    for (;;) {
      const next = await b.evaluate("window.__oogaCameraTraversal.next()");
      if (next.done) { r = next.value; break; }
    }
  } finally { await b.evaluate("delete window.__oogaCameraTraversal"); }
  const entered = (p) => p.requested[1] < 0.499, left = (p) => p.requested[1] > 0.501;
  const routes = r.cases.map((c) => ({ id: c.id, active: c.active, samples: c.route.map((p) => ({ requested: p.requested, actual: p.actual, error: p.error, id: p.id, contains: p.contains, matrixInside: p.matrixInside, active: p.active })) }));
  record(`${label}: raw free orbit keeps exact requested views through floors, side walls and roofs`, r.raw.length === 24 && r.raw.every((p) => p.mode === "orbit" && p.near === 0.1 && p.actual.every((v, i) => Math.abs(v - p.requested[i]) < 0.00001)), JSON.stringify(r.raw));
  record(`${label}: first-person entry and exit follow every occupied aperture and both real HQ ramps`, r.openings === 8 && r.occupied === 5 && r.cases.length === 10 && r.cases.every((c) => c.route.every((p) => p.mode === "eye-level" && p.error < 0.001 && (entered(p) ? p.id === c.id && p.contains : left(p) ? p.index === 0 : true))), JSON.stringify(routes));
  record(`${label}: all three unused cave mouths still reject a physical low crossing`, r.sealed.length === 3 && r.sealed.map((s) => s.id).sort().join("|") === "c10|c2|c3" && r.sealed.every((s) => s.before.index === 0 && s.after.index === 0 && !s.after.contains && s.after.actual[2] >= 0.499 && s.after.error > 0.39 && s.after.clear), JSON.stringify(r.sealed));
  record(`${label}: rotated apron slivers preserve physical lateral entry and exit on both sides of every cave`, r.cases.every((c) => c.lateral.length === 4 && c.lateral.every((path) => path.route.every((p) => p.error < 0.001 && p.clear && Math.abs(p.actual[0] - path.x) < 0.001 && (entered(p) ? p.id === c.id && p.contains : p.index === 0)))), JSON.stringify(r.cases.map((c) => ({ id: c.id, active: c.active, lateral: c.lateral }))));
  record(`${label}: touching the exact entrance plane preserves the grounded eye and the following crossing`, r.cases.every((c) => c.route.filter((p) => p.requested[1] === 0.5).length === 2 && c.route.filter((p) => p.requested[1] === 0.5).every((p) => Math.abs(p.actual[1] - 1.1) < 0.001) && c.route.filter((p) => p.requested[1] === 0.4).every((p) => p.id === c.id) && c.route.filter((p) => p.requested[1] === 0.6).every((p) => p.index === 0)), JSON.stringify(routes));
  record(`${label}: the Mirror portal follows physical ownership while the button keeps the full wave active`, r.cases.every((c) => c.route.every((p) => (entered(p) ? p.matrixInside === (c.id === "c1") : left(p) ? !p.matrixInside : true) && (!c.active || p.active)) && (!c.active && c.id !== "c1" ? c.route.every((p) => !p.active) : true)), JSON.stringify(routes));
  record(`${label}: high and side approaches never admit a first-person eye or open the Mirror portal`, r.cases.every((c) => c.invalid.length === 3 && c.invalid.every(({ before, after }) => before.index === 0 && after.index === 0 && !after.contains && !after.matrixInside && after.clear)), JSON.stringify(r.cases.map((c) => ({ id: c.id, active: c.active, invalid: c.invalid }))));
  record(`${label}: every intermediate first-person eye keeps its full terrain clearance`, r.samples > 10000 && r.collisions === 0 && r.failures.length === 0, JSON.stringify({ samples: r.samples, collisions: r.collisions, failures: r.failures }));
  record(`${label}: a near-ceiling orbit recovers first person to clear interior or entrance air below the roof`, r.cases.every((c) => (c.ceiling.id === c.id && c.ceiling.contains || !c.headquarters && c.ceiling.index === 0 && Math.abs(c.ceiling.actual[0]) < 0.001 && c.ceiling.actual[2] > 0 && c.ceiling.actual[2] < 0.5) && c.ceiling.clear && c.ceiling.worldY >= c.inside.floor + 0.2999 && c.ceiling.worldY <= c.inside.ceiling - 0.2999 && c.ceiling.near > 0 && c.ceiling.near < 0.3), JSON.stringify(r.cases.map((c) => ({ id: c.id, active: c.active, ceiling: c.ceiling }))));
  record(`${label}: looking fully up or down leaves the physical eye inside the real floor and ceiling`, r.cases.every((c) => c.pitchViews.length === 3 && c.pitchViews.every((p) => p.id === c.id && p.contains && p.clear && p.near > 0 && p.near < 0.3 && p.worldY >= p.floor + 0.2999 && p.worldY <= p.ceiling - 0.2999 && p.actual.every((v, i) => Math.abs(v - c.inside.actual[i]) < 0.00001))), JSON.stringify(r.cases.map((c) => ({ id: c.id, active: c.active, views: c.pitchViews }))));
  record(`${label}: physical wall pressure stops inside and reversing returns without trapping`, r.cases.every((c) => c.wall.id === c.id && c.wall.contains && c.wall.clear && c.wall.error > 0.5 && c.route[c.route.length - 1].index === 0 && c.route[c.route.length - 1].error < 0.001), JSON.stringify(r.cases.map((c) => ({ id: c.id, active: c.active, wall: c.wall, exit: c.route[c.route.length - 1] }))));
  record(`${label}: camera traversal uses bounded cavity data and restores the normal scene`, r.draws > 500 && r.caveBytes > 0 && r.caveBytes <= 256 * 256 * 6 && r.cases.every((c) => c.records === r.cases[0].records) && r.final.index === 0 && !r.final.active && r.final.radius === 0, JSON.stringify({ draws: r.draws, cavityBytes: r.caveBytes, records: r.cases.map((c) => c.records), final: r.final }));
});

const matrixCaves = ["matrix cave ownership", async (b) => {
  const rendered = (count) => b.evaluate(`new Promise((resolve) => { const B = window.__ooga, start = B.renderedFrames, tick = () => B.renderedFrames >= start + ${count} ? resolve() : requestAnimationFrame(tick); requestAnimationFrame(tick); })`);
  const snapshot = () => b.evaluate(`(${matrixCaveSnapshot.toString()})()`);
  await b.evaluate(`window.__ooga.renderer.setQuality("high"); window.__ooga.matrixCave.viewInside(false)`);
  await matrixSettled(b);
  // Ambient shooting may first reveal an existing gun or muzzle-flash mesh
  // during this longer wave cycle. Prime those finite, already-owned ordinary
  // geometries independently; never prewarm the unreached cave glyph batches.
  await b.evaluate(`(${primeMatrixControls.toString()})()`);
  await rendered(2);
  const movement = await b.evaluate(`(() => { const B = window.__ooga, scene = window.BL.scenes.hub, snapshot = ${matrixCaveSnapshot.toString()}, before = snapshot(); let time = before.time; for (let i = 0; i < 6; i++) scene.update(1 / 60, time += 1 / 60); B.renderer.render(scene.root, B.camera, B.renderOpts); return { before, after: snapshot() }; })()`);
  const before = movement.before, after = movement.after;
  record("matrix caves: all eight interiors own exclusive backed glyph sets, including walls, ceilings, floors and interior props", before.active && before.caveCount === 8 && before.caves.map((c) => c.id).sort().join("|") === before.caveIds.sort().join("|") && before.taggedFaces > 100 && before.overlappingFaces === 0 && before.missingFlags === 0 && before.brightGlyphFaces === 0 && before.caves.every((c) => c.owned && c.backingSourcesValid && c.sourceError < 0.0001 && c.terrain > 0 && c.horizontal > 0 && c.vertical > 0 && c.fullCeiling && c.fullFloor && c.actualCount > 0 && c.tips > 0 && c.dim > 0) && before.caves.find((c) => c.id === "c11").props > 0 && before.caves.find((c) => c.id === "c9").props > 0, JSON.stringify({ taggedFaces: before.taggedFaces, overlappingFaces: before.overlappingFaces, missingFlags: before.missingFlags, brightGlyphFaces: before.brightGlyphFaces, caves: before.caves.map((c) => ({ id: c.id, owned: c.owned, backingSourcesValid: c.backingSourcesValid, sourceError: c.sourceError, sections: c.sections, terrain: c.terrain, props: c.props, count: c.actualCount, ceiling: c.fullCeiling, floor: c.fullFloor, tips: c.tips, dim: c.dim })) }));
  record("matrix caves: actual extruded instances stay on their physical faces and behind every entrance", before.caves.every((c) => c.finite && c.escaped === 0 && c.maxLocalZ < 0.48 && c.clearanceMin >= 0.0099 && c.clearanceMax <= 0.0101), JSON.stringify(before.caves.map((c) => ({ id: c.id, escaped: c.escaped, maxZ: c.maxLocalZ, clearance: [c.clearanceMin, c.clearanceMax] }))));
  const motion = before.caves.map((a) => { const z = after.caves.find((c) => c.id === a.id), span = a.stream.flowRange, delta = ((a.stream.head - z.stream.head) % span + span) % span, gap = ((a.stream.gap - z.stream.gap) % span + span) % span, shift = (after.time - before.time) * a.stream.speed; const eligible = a.positions.filter((p) => p - shift >= a.stream.min && p - shift <= a.stream.max), moved = eligible.filter((p) => z.positions.some((q) => Math.abs(q - (p - shift)) < 0.0001)).length; return { id: a.id, direction: a.stream.direction, delta, gap, expected: shift, eligible: eligible.length, moved, updates: z.updates - a.updates }; });
  record("matrix caves: independent streams and gaps fall at their configured speeds, confirmed in uploaded instance positions", new Set(before.caves.map((c) => c.seedSignature)).size === 8 && motion.every((m) => m.direction === -1 && m.updates > 0 && m.delta > 0.001 && Math.abs(m.delta - m.gap) < 0.001 && Math.abs(m.delta - m.expected) < 0.001 && m.eligible >= 2 && m.moved === m.eligible), JSON.stringify(motion));
  const tierSamples = [before];
  for (const quality of ["medium", "low", "high"]) { await b.evaluate(`window.__ooga.renderer.setQuality(${JSON.stringify(quality)})`); await rendered(4); tierSamples.push(await snapshot()); }
  record("matrix caves: quality tiers reduce glyph counts within immutable fixed-capacity instance buffers", tierSamples.every((s) => s.caves.every((c) => { const base = before.caves.find((v) => v.id === c.id); return c.fixed && c.buffers === 8 && c.capacity === base.capacity && c.bytes === base.bytes && c.actualCount <= c.capacity; })) && before.caves.every((c) => { const medium = tierSamples[1].caves.find((v) => v.id === c.id), low = tierSamples[2].caves.find((v) => v.id === c.id); return c.actualCount > medium.actualCount && medium.actualCount > low.actualCount; }), JSON.stringify(tierSamples.map((s) => ({ quality: s.quality, bytes: s.caves.reduce((n, c) => n + c.bytes, 0), counts: s.caves.map((c) => c.actualCount) }))));
  await b.evaluate(`window.__ooga.matrixCave.viewApproach()`); await matrixSettled(b, false);
  const outside = await snapshot();
  await b.evaluate(`window.__ooga.matrixCave.viewInside(false)`); await matrixSettled(b);
  const reentered = await snapshot();
  record("matrix caves: completed retraction keeps only the permanent Mirror Cave and reexpansion reuses every GPU record and buffer", !outside.active && outside.caves.every((c, i) => i + 1 === outside.permanentCave ? c.drawn > 0 : c.drawn === 0) && reentered.active && reentered.records === before.records && outside.records === before.records && reentered.caves.every((c) => c.drawn > 0 && c.bytes === before.caves.find((v) => v.id === c.id).bytes), JSON.stringify({ permanentCave: outside.permanentCave, records: [before.records, outside.records, reentered.records], outside: outside.caves.map((c) => c.drawn), reentered: reentered.caves.map((c) => c.drawn) }));
}];

const matrixHorizontal = (backend) => [`matrix horizontal lanes ${backend}`, async (b) => {
  await b.evaluate(`window.__ooga.renderer.setQuality("high"); window.__ooga.matrixCave.viewInside(false)`);
  await matrixSettled(b);
  const r = await b.evaluate(`(${matrixHorizontalProbe.toString()})()`), label = `matrix horizontal ${backend}`, samples = [r.before, r.after];
  record(`${label}: every cave floor and ceiling uses upright single-file lanes parallel to its actual entrance-to-back axis`, r.backend === backend && r.active && r.radius === 38 && r.isolated && r.drawn && samples.every((s) => s.caves.length === 8 && s.caves.every((c) => c.count > 0 && c.planes >= 2 && c.axisError < 0.00001 && c.laneError < 0.00001 && c.directionError < 0.000001 && c.phaseMismatch === 0)), JSON.stringify(samples.map((s) => ({ time: s.time, caves: s.caves.map(({ lanes, ...c }) => c) }))));
  record(`${label}: compact .12-wide lanes and .13 character spacing cover eligible coplanar seams exactly once without filling edges or holes`, samples.every((s) => s.caves.every((c) => (c.slopeFaces ? c.lanes.length <= 6 : c.lanes.length === 6 && ["floor", "ceiling"].every((kind) => c.lanes.filter((l) => l.kind === kind).length === 3)) && c.lanes.every((l) => l.expected > 3 && l.missing === 0 && l.doubles === 0 && l.excludedRows > 0 && l.unsafe === 0 && l.spacingError < 0.00001))) && samples.every((s) => s.caves.flatMap((c) => c.lanes).reduce((sum, l) => sum + l.seamRows, 0) > 10), JSON.stringify(samples));
  const ramps = await b.evaluate(`(${matrixRampGlyphProbe.toString()})(${JSON.stringify(backend)})`);
  record(`${label}: both HQ ramp entrances carry continuous moving glyphs on their actual triangles through the first six units`, ramps.backend === backend && ramps.owners.length === 2 && ramps.owners.every((owner) => owner.faces > 100 && owner.continuous === owner.faces) && ramps.samples.length === 8 && ramps.samples.every((sample) => sample.inactive.green === 0 && sample.inactive.fingerprint === sample.inactiveReference.fingerprint && sample.frames.every((frame) => frame.actual.green > 100 && frame.reference.green > 100 && frame.meanDifference < 0.1) && sample.frames[0].actual.fingerprint !== sample.frames[1].actual.fingerprint), JSON.stringify(ramps));
  record(`${label}: twenty-hertz glyph identities, bright leaders, fading trains and deliberate gaps survive continuous surface lanes`, samples.every((s) => s.caves.every((c) => c.lanes.every((l) => l.gaps > 0 && l.filledGaps === 0 && l.shadeError < 0.000001 && l.mutationErrors === 0))), JSON.stringify(samples.map((s) => s.caves.map((c) => ({ id: c.id, lanes: c.lanes.map((l) => ({ kind: l.kind, gaps: l.gaps, filled: l.filledGaps, shadeError: l.shadeError, mutationErrors: l.mutationErrors })) })))));
  record(`${label}: actual floor and ceiling instances move inward along unchanged lanes, including source-face seams`, r.motion.length >= 36 && r.motion.length === r.before.caves.reduce((sum, cave) => sum + cave.lanes.length, 0) && r.motion.every((m) => m.eligible > 3 && m.moved === m.eligible && m.gapPairs > 0 && m.distance >= 0.056 - 1e-8 && m.distance <= 0.12 + 1e-8 && m.error < 0.00001) && r.motion.reduce((sum, m) => sum + m.seams, 0) > 10, JSON.stringify(r.motion));
}];

const matrixRain = (backend) => withPage(`matrix falling rain ${backend}`, hubPage(src, backend === "canvas2d" ? "canvas2d=1" : ""), async (b) => {
  const r = await b.evaluate(`(${matrixRainProbe.toString()})(${primeMatrixControls.toString()})`), label = `matrix rain ${backend}`, full = [r.before, r.after];
  const permanent = r.inactive.caves.findIndex((c) => c.count > 0), upper = (s) => s.caves.filter((c) => !c.headquarters);
  record(`${label}: all six upper caves retain native ceiling-to-floor rain and their surface glyph sets`, r.backend === backend && r.drawn && full.every((s) => s.active && s.caves.length === 8 && upper(s).length === 6 && upper(s).every((c) => c.streams === (backend === "canvas2d" ? 18 : 48) && c.count > 0 && c.count === c.reported && c.drawn === c.count && c.sharedStyle)), JSON.stringify(full.map((s) => s.caves.map((c) => ({ id: c.id, streams: c.streams, count: c.count, drawn: c.drawn, sharedStyle: c.sharedStyle })))));
  record(`${label}: both HQ ramps and every lower level allocate no falling glyphs while retaining floor and wall code`, [r.inactive, ...r.tiers, r.reversed, r.receded, r.restored, r.idle].every((s) => s.caves.filter((c) => c.headquarters).length === 2 && s.caves.filter((c) => c.headquarters).every((c) => c.streams === 0 && c.buffers === 0 && c.capacity === 0 && c.bytes === 0 && c.count === 0 && c.drawn === 0 && c.reported === 0 && c.updates === 0)) && full.every((s) => s.caves.filter((c) => c.headquarters).every((c) => c.surfaceCounts.floor > 0 && c.surfaceCounts.wall > 0)), JSON.stringify(full.map((s) => s.caves.filter((c) => c.headquarters).map((c) => ({ id: c.id, streams: c.streams, buffers: c.buffers, count: c.count, surfaces: c.surfaceCounts })))));
  record(`${label}: the actual glyph boxes remain upright, visible from both sides, inside carved cave space and behind entrances`, full.every((s) => upper(s).every((c) => c.finite && c.upright && c.twoSided && c.escaped === 0 && c.unknown === 0 && c.boundsError < 0.00001 && c.maxLocalZ < 0.48)), JSON.stringify(full.map((s) => s.caves.map((c) => ({ id: c.id, upright: c.upright, twoSided: c.twoSided, escaped: c.escaped, unknown: c.unknown, boundsError: c.boundsError, maxLocalZ: c.maxLocalZ })))));
  record(`${label}: staggered rain retains the historical .19 spacing, twenty-hertz mutations, bright heads and darker tails`, full.every((s) => new Set(upper(s).map((c) => c.seeds)).size === 6 && upper(s).every((c) => c.spacing === 0.19 && c.expected === c.count && c.missing === 0 && c.doubles === 0 && c.unwanted === 0 && c.positionError < 0.00001 && c.shadeError < 0.000001 && c.mutationErrors === 0 && c.leaders > 0 && c.second > 0 && c.trailing > c.leaders && c.minGlow < 0.6 && c.maxGlow > 0.6 && c.excluded > 0 && c.speeds > 8 && c.phases > 8 && c.brightness[1] - c.brightness[0] > 0.1)), JSON.stringify(full.map((s) => s.caves.map((c) => ({ id: c.id, expected: c.expected, count: c.count, missing: c.missing, doubles: c.doubles, unwanted: c.unwanted, shadeError: c.shadeError, mutationErrors: c.mutationErrors, leaders: c.leaders, second: c.second, trailing: c.trailing, excluded: c.excluded })))));
  record(`${label}: uploaded rain glyphs actually descend in fixed columns instead of changing characters in place`, r.motion.length === 8 && r.motion.filter((m) => !m.headquarters).length === 6 && r.motion.every((m) => m.headquarters ? m.eligible === 0 && m.moved === 0 : m.eligible > 10 && m.moved === m.eligible && m.error < 0.00001), JSON.stringify(r.motion));
  record(`${label}: the old gate has its own bounded, two-sided ceiling-to-floor glyph rain`, r.before.gate.streams === (backend === "canvas2d" ? 8 : 28) && r.before.gate.count > 0 && r.before.gate.count === r.before.gate.drawn && r.before.gate.count === r.before.gate.reported && r.before.gate.buffers === 8 && r.before.gate.fixed && r.before.gate.finite && r.before.gate.upright && r.before.gate.twoSided && r.before.gate.within && r.before.gate.leaders > 0 && r.before.gate.second > 0 && r.before.gate.trailing > r.before.gate.leaders && r.before.gate.minGlow < 0.6 && r.before.gate.maxGlow > 0.6 && r.gateMotion === r.before.gate.streams, JSON.stringify({ gate: r.before.gate, motion: r.gateMotion }));
  record(`${label}: all surrounding clouds opt into the world-wrapping surface glyph path`, full.every((s) => s.clouds.count === 30 && s.clouds.wrapped === s.clouds.count && s.clouds.nearest > 36 && s.clouds.farthest > s.radius), JSON.stringify(full.map((s) => s.clouds)));
  record(`${label}: the Mirror Cave rains permanently while the completed outward wave reaches the other upper caves and the gate`, permanent >= 0 && !r.inactive.active && r.inactive.radius === 0 && r.inactive.gate.count === 0 && r.inactive.caves.every((c, i) => i === permanent ? c.count > 0 && c.drawn === c.count : c.count === 0 && c.drawn === 0) && r.before.inside && r.before.active && r.before.direction === 0 && r.before.radius === 38 && r.before.gate.count > 0 && r.before.gate.updates > r.inactive.gate.updates && r.before.caves.every((c, i) => c.headquarters ? c.count === 0 && c.drawn === 0 && c.updates === 0 : c.count > 0 && c.drawn === c.count && c.updates > r.inactive.caves[i].updates) && !r.reversed.inside && r.reversed.direction === -1 && r.reversed.radius < r.before.radius && r.reversed.gate.count > 0 && r.reversed.caves.every((c, i) => (i === permanent || c.farthest <= r.reversed.radius + 0.16001) && c.missing === 0 && c.unwanted === 0), JSON.stringify({ inactive: { radius: r.inactive.radius, gate: r.inactive.gate.count, caves: r.inactive.caves.map((c) => c.count) }, entered: { radius: r.before.radius, direction: r.before.direction, gate: r.before.gate.count, caves: r.before.caves.map((c) => c.count) }, reversed: { radius: r.reversed.radius, direction: r.reversed.direction, gate: r.reversed.gate.count, caves: r.reversed.caves.map((c) => ({ id: c.id, count: c.count, farthest: c.farthest })) } }));
  record(`${label}: quality-tier density limits reuse bounded fixed-capacity rain buffers`, r.buffersStable && r.totalBytes < 2000000 && r.tiers.every((s) => s.caves.every((c, i) => c.fixed && c.buffers === (c.headquarters ? 0 : 8) && c.bytes === c.capacity * 80 && c.capacity === c.perGlyphCapacity * 8 && c.capacities.every((n) => n === c.perGlyphCapacity) && c.capacity === r.before.caves[i].capacity && c.bytes === r.before.caves[i].bytes && c.count <= c.capacity)) && (backend === "canvas2d" || r.before.caves.every((c, i) => c.headquarters ? c.count === 0 && r.tiers[1].caves[i].count === 0 && r.tiers[2].caves[i].count === 0 : c.count > r.tiers[1].caves[i].count && r.tiers[1].caves[i].count > r.tiers[2].caves[i].count)), JSON.stringify({ stable: r.buffersStable, bytes: r.totalBytes, tiers: r.tiers.map((s) => s.caves.map((c) => ({ id: c.id, density: c.density, count: c.count, capacity: c.capacity, bytes: c.bytes }))) }));
  record(`${label}: retreat clears only world-triggered rain and leaves the permanent Mirror Cave animating in fixed buffers`, r.receded.active && r.receded.radius > 0 && r.receded.gate.count === 0 && r.receded.caves.every((c, i) => i === permanent ? c.count > 0 && c.drawn === c.count : c.count === 0 && c.drawn === 0) && !r.restored.active && r.restored.radius === 0 && r.restored.gate.count === 0 && r.idle.gate.count === 0 && r.idle.gate.updates === r.restored.gate.updates && r.restored.caves.every((c, i) => i === permanent ? c.count > 0 && c.drawn === c.count && r.idle.caves[i].updates > c.updates : c.count === 0 && c.drawn === 0 && r.idle.caves[i].updates === c.updates && r.idle.caves[i].versions.every((v, j) => v === c.versions[j])) && r.restored.records === r.before.records && r.idle.records === r.before.records, JSON.stringify({ records: [r.before.records, r.restored.records, r.idle.records], gate: [r.receded.gate.count, r.restored.gate.count, r.idle.gate.count], receded: r.receded.caves.map((c) => c.count), restored: r.restored.caves.map((c) => ({ id: c.id, count: c.count, updates: c.updates, versions: c.versions })), idle: r.idle.caves.map((c) => ({ id: c.id, count: c.count, updates: c.updates, versions: c.versions })) }));
  const cycle = await b.evaluate(`(${matrixRainCycleProbe.toString()})(${primeMatrixControls.toString()})`);
  record(`${label}: an active-rain scene cycle detaches all 56 upper-cave and gate batches and recreates only the same bounded cave and gate resources`, cycle.detached && cycle.noHubDebug && cycle.fresh && cycle.distinct && cycle.oldBuffers === 56 && cycle.newBuffers === 56 && cycle.before.targets === cycle.after.targets && cycle.before.gate.streams === cycle.after.gate.streams && cycle.before.gate.capacity === cycle.after.gate.capacity && cycle.before.gate.bytes === cycle.after.gate.bytes && cycle.before.gate.count > 0 && cycle.after.gate.count > 0 && cycle.before.rain.every((c, i) => { const n = cycle.after.rain[i]; return c.id === n.id && c.streams === n.streams && c.capacity === n.capacity && c.bytes === n.bytes && (c.headquarters ? c.count === 0 && n.count === 0 && c.capacity === 0 && c.bytes === 0 : c.count > 0 && n.count > 0); }), JSON.stringify(cycle));
});

const matrixWave = (backend) => [`matrix reversible wave ${backend}`, async (b) => {
  const r = await b.evaluate(`(${matrixWaveProbe.toString()})(${primeMatrixControls.toString()})`), label = `matrix wave ${backend}`;
  const slope = (a, z, speed) => Math.abs(z.radius - a.radius - (z.time - a.time) * speed) < 1e-7;
  const permanent = r.start.caves.findIndex((c) => c.count > 0);
  record(`${label}: the closed Mirror Cave stays populated while a viewer crossing starts the world at the pile center`, permanent >= 0 && r.start.radius === 0 && !r.start.active && r.start.caves.every((c, i) => i === permanent ? c.count > 0 && c.drawn > 0 : c.count === 0 && c.drawn === 0) && r.entryCrossing.inside && r.entryCrossing.active && r.entryCrossing.radius === 0 && r.entryCrossing.direction === 1 && !r.entryCrossing.nodePortal && r.entryCrossing.nodeReveal === 0 && !r.entered.portal && r.entered.reveal === 0 && r.entered.radius > 0 && r.entered.radius < r.mirrorDistance && r.entered.direction === 1 && r.entered.caves[permanent].updates > r.start.caves[permanent].updates, JSON.stringify({ permanent, start: r.start, crossing: r.entryCrossing, entered: r.entered }));
  const revealSlope = (a, z) => Math.abs((z.reveal - a.reveal) * r.mirrorHeight - (z.radius - a.radius)) < 1e-6;
  record(`${label}: the mirror waits for the global glyph front, then wipes bottom-to-top at its 72-unit travel rate`, r.mirrorHeight === 3.25 && r.mirrorWaiting.radius < r.mirrorDistance && r.mirrorWaiting.reveal === 0 && r.mirrorWaiting.nodeReveal === 0 && !r.mirrorWaiting.portal && r.mirrorWaiting.surfaceDrawn && r.mirrorStarted.radius > r.mirrorDistance && r.mirrorStarted.reveal > 0 && r.mirrorStarted.reveal < 1 && r.mirrorStarted.reveal === r.mirrorStarted.nodeReveal && !r.mirrorStarted.portal && r.mirrorStarted.surfaceDrawn && r.mirrorContinuing.reveal > r.mirrorStarted.reveal && revealSlope(r.mirrorStarted, r.mirrorContinuing) && r.mirrorGone.reveal === 1 && r.mirrorGone.nodeReveal === 1 && r.mirrorGone.portal && !r.mirrorGone.surfaceDrawn, JSON.stringify({ distance: r.mirrorDistance, height: r.mirrorHeight, waiting: r.mirrorWaiting, started: r.mirrorStarted, continuing: r.mirrorContinuing, gone: r.mirrorGone }));
  const gateSamples = [r.start, r.mirrorWaiting, r.mirrorStarted, r.mirrorContinuing, r.mirrorGone, r.expanded, r.gatesClosed];
  record(`${label}: each occupied cave's bars begin descending at the glyph front and move continuously to the floor`, r.gateMotion.samples > 0 && !r.gateMotion.failures.length && r.gateMotion.maxStep <= r.gateSpeed * r.dt + 1e-8 && r.gateMotion.starts.length === 5 && r.gateMotion.starts.every((gate) => gate.radius >= gate.distance && gate.radius < gate.distance + r.speed * r.dt + 1e-8 && Math.abs(gate.step - r.gateSpeed * r.dt) < 1e-8) && r.start.gates.items.every((gate) => gate.y === r.start.gates.hidden) && r.mirrorContinuing.gates.items.some((gate) => gate.y > r.mirrorContinuing.gates.visible && gate.y < r.mirrorContinuing.gates.hidden) && r.gatesClosed.gates.items.every((gate) => gate.y === r.gatesClosed.gates.visible), JSON.stringify({ motion: r.gateMotion, samples: gateSamples.map((sample) => ({ radius: sample.radius, active: sample.active, gates: sample.gates })) }));
  record(`${label}: removal and expansion retain their 72-unit speeds while reentry resumes the interrupted wave`, r.speed === 72 && r.retreatSpeed === 72 && !r.exit.inside && r.exit.direction === -1 && r.exit.active && slope(r.beforeExit, r.exit, -r.retreatSpeed) && slope(r.exit, r.reverse, -r.retreatSpeed) && r.partialReentryCrossing.inside && r.partialReentryCrossing.radius === r.reverse.radius && r.partialReentryCrossing.direction === 1 && slope(r.partialReentryCrossing, r.reentry, r.speed) && r.reentry.direction === 1 && r.resumed.radius > r.reentry.radius && r.resumed.radius < r.maxRadius && r.resumed.direction === 1, JSON.stringify({ speed: r.speed, retreatSpeed: r.retreatSpeed, beforeExit: r.beforeExit.radius, exit: r.exit.radius, reverse: r.reverse.radius, crossing: r.partialReentryCrossing.radius, reentry: r.reentry.radius, resumed: r.resumed.radius }));
  const immediateExits = [[r.beforeExit, r.partialCrossing, r.exit, r.partialMirror], [r.beforeFullExit, r.fullCrossing, r.fullExit, r.fullMirror]];
  record(`${label}: crossing just outside keeps or restores the closed mirror on the first frame`, immediateExits.every(([before, crossing, exit, mirror]) => before.inside && !before.nodePortal && !crossing.inside && !crossing.nodePortal && crossing.radius === before.radius && Math.abs(crossing.entranceZ - 0.52) < 0.00001 && exit.active && exit.direction === -1 && slope(before, exit, -r.retreatSpeed) && !exit.portal && !exit.nodePortal && exit.caves[permanent].count > 0 && exit.caves[permanent].drawn > 0 && mirror.drawn && !mirror.portal && mirror.surfaceDrawn && (backend === "canvas2d" ? mirror.faux && mirror.captures === 0 : !mirror.faux && mirror.captures === 1)), JSON.stringify(immediateExits.map(([before, crossing, exit, mirror]) => ({ before: before.radius, crossing: { radius: crossing.radius, z: crossing.entranceZ, inside: crossing.inside, nodePortal: crossing.nodePortal }, exit: { radius: exit.radius, portal: exit.portal, caves: exit.caves.map((c) => c.count) }, mirror }))));
  const immediateReentries = [[r.reverse, r.partialReentryCrossing, r.reentry, r.partialReentryMirror], [r.fullExit, r.fullReentryCrossing, r.fullReentry, r.fullReentryMirror]];
  record(`${label}: the returned mirror remains visible inside the ordinary near plane without changing cave camera clipping`, immediateExits.every(([, , , mirror]) => mirror.near === 0.1 && (backend === "canvas2d" || mirror.pixels.changed > 0 && mirror.pixels.difference > 0.01)), JSON.stringify(immediateExits.map(([, , , mirror]) => ({ near: mirror.near, pixels: mirror.pixels, drawn: mirror.surfaceDrawn }))));
  record(`${label}: immediate reentry keeps the mirror closed until the resumed wave reaches it`, immediateReentries.every(([before, crossing, reentry, mirror]) => crossing.inside && !crossing.nodePortal && crossing.radius === before.radius && crossing.direction === 1 && reentry.inside && !reentry.portal && !reentry.nodePortal && reentry.radius > crossing.radius && reentry.radius < r.mirrorDistance && reentry.direction === 1 && mirror.drawn && !mirror.portal && mirror.captures === 0), JSON.stringify(immediateReentries.map(([before, crossing, reentry, mirror]) => ({ before: before.radius, crossing: crossing.radius, reentry: reentry.radius, portal: reentry.portal, drawn: mirror.surfaceDrawn, captures: mirror.captures }))));
  record(`${label}: all eight doorway paths are continuous and depth adds distance instead of restarting at each cave`, r.descriptors.length === 32 && r.frontWidth === 1.5 && r.paths.length === 8 && r.paths.every((p) => p.points.every((v) => Math.abs(v.actual - v.expected) < 0.00001) && Math.abs(p.points[4].actual - p.points[3].actual - 3) < 0.00001 && Math.abs(p.points[2].actual - p.points[1].actual - 0.01) < 0.00001), JSON.stringify(r.paths));
  record(`${label}: the outward wave eventually fills all eight bounded cave layers through their farthest registered surfaces`, r.expanded.radius === r.maxRadius && r.expanded.direction === 0 && r.expanded.caves.length === 8 && r.expanded.caves.every((c) => c.minimum < r.maxRadius && c.farthest <= r.maxRadius + 0.16001 && c.revealed > 0 && c.count > 0 && c.drawn > 0), JSON.stringify(r.expanded.caves.map((c) => ({ id: c.id, minimum: c.minimum, farthest: c.farthest, updates: c.updates, count: c.count, revealed: c.revealed }))));
  const idle = r.measurements.at(-1), full = r.measurements.find((m) => m.state === "retracting"), fixedCamera = r.measurements[0].before.camera;
  record(`${label}: glyph retreat restores every triggered cave while permanent Mirror Cave code remains independent`, r.cavesRestored.active && r.cavesRestored.radius > 0 && r.cavesRestored.direction === -1 && !r.cavesRestored.inside && !r.cavesRestored.portal && r.cavesRestored.caves.every((c, i) => i === permanent ? c.count > 0 && c.drawn > 0 : c.count === 0 && c.drawn === 0), JSON.stringify(r.cavesRestored));
  if (backend === "webgl2") {
    const same = (a, z) => a.length === z.length && a.every((v, i) => Number.isFinite(v) && Math.abs(v - z[i]) < 0.0001), reflections = [r.partialMirror, r.fullMirror, r.reflection];
    record(`${label}: first-frame and later closed-mirror draws use a finite reflected eye and the current retreating Matrix wave`, reflections.every((reflection) => { const reflected = reflection.passes.find((p) => same(p.eye, reflection.reflectedEye)); return reflection.captures === 1 && !reflection.portal && reflection.expectedMatrix[0] === 1 && reflection.expectedMatrix[1] > 0 && reflection.passes.length === 2 && reflection.passes.every((p) => p.eye.every(Number.isFinite) && same(p.matrix, reflection.expectedMatrix) && same(p.origin, reflection.expectedOrigin) && same(p.caves, reflection.expectedCaves)) && !!reflected && reflected.samples === reflection.samples && reflection.passes.some((p) => same(p.eye, reflection.mainEye)); }), JSON.stringify(reflections));
    record(`${label}: medium and low quality capture a fresh visible reflection on the first closure even on cadence-skipped frames`, r.cadence.length === 2 && r.cadence.every(({ quality, previous, mirror }) => ["medium", "low"].includes(quality) && previous === "cadence" && mirror.drawn && !mirror.portal && mirror.surfaceDrawn && mirror.captures === 1 && mirror.near === 0.1 && mirror.pixels.changed > 0 && mirror.pixels.difference > 0.01), JSON.stringify(r.cadence));
  }
  record(`${label}: full retraction leaves only bounded permanent-room work and every phase retains fixed GPU resources`, !r.restored.active && r.restored.radius === 0 && r.restored.direction === 0 && r.buffersStable && r.bufferCount === 64 && r.bytes < 12000000 && r.restored.caves.every((c, i) => i === permanent ? c.count > 0 && c.drawn > 0 && idle.after.caves[i].updates > c.updates : c.count === 0 && c.drawn === 0 && idle.after.caves[i].updates === c.updates && idle.after.caves[i].versions.every((v, j) => v === c.versions[j])) && r.measurements.every((m) => m.before.records <= full.after.records && m.after.records <= full.after.records && m.after.resources === r.start.resources), JSON.stringify({ buffers: r.bufferCount, bytes: r.bytes, stable: r.buffersStable, restored: r.restored, idle: idle.after }));
  record(`${label}: measured update and rendering costs stay bounded at identical camera and quality throughout the wave`, r.measurements.every((m) => m.ready && m.drawn === 24 && (backend === "canvas2d" || m.after.shadowPasses - m.before.shadowPasses === 24) && m.before.camera.every((v, i) => Math.abs(v - fixedCamera[i]) < 1e-9) && m.after.camera.every((v, i) => Math.abs(v - fixedCamera[i]) < 1e-9) && m.update.mean < 20 && m.update.p95 < 50 && m.render.mean + m.gpu.mean < (backend === "canvas2d" ? 500 : 50)), JSON.stringify({ backend: r.backend, quality: r.quality, phases: r.measurements.map((m) => ({ state: m.state, drawn: m.drawn, ready: m.ready, update: m.update, render: m.render, gpu: m.gpu, records: [m.before.records, m.after.records] })) }));
}];

// The built file must run both scenes
const hubDist = () => withPage("hub dist", hubPage(dist), async (b) => {
  const loaded = await b.evaluate(`(() => { const B = window.__ooga; return { scene: B.scene, mouths: B.mouths.length }; })()`);
  record("dist: lands on the hub", loaded.scene === "hub" && loaded.mouths === 8, JSON.stringify(loaded));
  const mouth = await b.evaluate(`(() => { const B = window.__ooga; const m = B.mouths.find((m) => m.id === "c11"); const p = B.project(m.x, 2, m.z); const hit = B.input.pick(p.x, p.y); return { x: Math.round(p.x), y: Math.round(p.y), kind: hit && hit.owner.kind }; })()`);
  await b.click(mouth.x, mouth.y);
  await b.sleep(1600);
  const scene = await b.evaluate("window.__ooga.scene");
  record("dist: tap the lab cave enters the lab", mouth.kind === "cave" && scene === "lab", JSON.stringify({ ...mouth, scene }));
  // The built file stands in for the source suite only here: the lab must keep drawing with its crew and pile live
  const lab = await b.evaluate(`new Promise((resolve) => { const B = window.__ooga, start = B.renderedFrames, t0 = performance.now(), tick = () => B.renderedFrames >= start + 30 || performance.now() - t0 > 4000 ? resolve({ frames: B.renderedFrames - start, crew: B.cavemen.size, shown: B.shown, quality: document.getElementById("quality").textContent }) : requestAnimationFrame(tick); requestAnimationFrame(tick); })`);
  record("dist: the lab keeps rendering with its crew and pile live", lab.frames >= 30 && lab.crew === 8 && lab.shown > 0 && lab.quality.startsWith("webgl2"), JSON.stringify(lab));
});

// A prototype key in ?scene= falls through to the hub
const hubRoute = () => withPage("hub route", hubPage(src, "scene=toString"), async (b) => {
  const r = await b.evaluate(`(() => { const B = window.__ooga; return { scene: B.scene, mouths: B.mouths.length, help: [...document.querySelectorAll(".panel .help[data-scene]")].map((p) => p.dataset.scene + ":" + p.hidden).join(",") }; })()`);
  record("hub: unknown ?scene= lands on the hub with the hub help text", r.scene === "hub" && r.mouths === 8 && r.help === "hub:false", JSON.stringify(r));
});

const headquartersWindowProbe = () => {
  const B = window.__ooga, H = B.island.headquarters, geometry = B.island.geometry, triangles = [], rooms = H.rooms.concat(H.basement.rooms);
  for (const face of geometry.faces) if (face.headquartersRamp || face.headquartersBasementRamp) for (let n = 1; n < face.i.length - 1; n++) {
    const a = face.i[0] * 3, b = face.i[n] * 3, c = face.i[n + 1] * 3, v = geometry.verts;
    triangles.push([v[a], v[a + 1], v[a + 2], v[b] - v[a], v[b + 1] - v[a + 1], v[b + 2] - v[a + 2], v[c] - v[a], v[c + 1] - v[a + 1], v[c + 2] - v[a + 2]]);
  }
  const meshClear = (x, y, z, dx, dy, dz, length) => {
    for (const t of triangles) {
      const px = dy * t[8] - dz * t[7], py = dz * t[6] - dx * t[8], pz = dx * t[7] - dy * t[6], determinant = t[3] * px + t[4] * py + t[5] * pz;
      if (Math.abs(determinant) < 1e-8) continue;
      const ox = x - t[0], oy = y - t[1], oz = z - t[2], u = (ox * px + oy * py + oz * pz) / determinant;
      if (u < 0 || u > 1) continue;
      const qx = oy * t[5] - oz * t[4], qy = oz * t[3] - ox * t[5], qz = ox * t[4] - oy * t[3], v = (dx * qx + dy * qy + dz * qz) / determinant;
      if (v < 0 || u + v > 1) continue;
      const distance = (t[6] * qx + t[7] * qy + t[8] * qz) / determinant;
      if (distance > 1e-5 && distance < length - 1e-5) return false;
    }
    return true;
  };
  const inRamp = (x, y, z, ownRamp) => {
    for (const ramp of H.ramps.concat(H.basement.ramps)) for (let i = 1; i < ramp.samples.length; i++) {
      if (ramp === ownRamp) continue;
      const a = ramp.samples[i - 1], b = ramp.samples[i], dx = b.x - a.x, dz = b.z - a.z, t = Math.max(0, Math.min(1, ((x - a.x) * dx + (z - a.z) * dz) / (dx * dx + dz * dz))), ex = x - a.x - dx * t, ez = z - a.z - dz * t, floor = a.y + (b.y - a.y) * t;
      if (ex * ex + ez * ez < (ramp.width / 2 - 0.1) ** 2 && y > floor + 0.1 && y < floor + (H.basement.ramps.includes(ramp) ? 4.15 : 3.4)) return true;
    }
    return false;
  };
  return H.windows.map((window) => {
    const apertures = [], radius = Math.hypot(window.x, window.z), outerRadius = Math.hypot(window.outer.x, window.outer.z);
    const ownRamp = window.kind === "ramp" ? (window.basement ? H.basement.ramps : H.ramps).find((ramp) => ramp.samples.some((point) => Math.hypot(point.x - window.x, point.y - window.floor, point.z - window.z) < 1e-6)) : null;
    if (window.kind === "panorama") {
      const count = Math.ceil((window.endAngle - window.startAngle) * window.radius / 0.5), inset = 0.25 / window.radius;
      for (let i = 0; i <= count; i++) {
        const angle = window.startAngle + inset + (window.endAngle - window.startAngle - inset * 2) * i / count;
        apertures.push({ x: Math.sin(angle) * window.radius, z: -Math.cos(angle) * window.radius, dx: Math.sin(angle), dz: -Math.cos(angle), length: outerRadius - window.radius });
      }
    } else {
      const length = Math.hypot(window.outer.x - window.x, window.outer.z - window.z), dx = (window.outer.x - window.x) / length, dz = (window.outer.z - window.z) / length;
      for (const cross of [-window.width / 2 + 0.25, 0, window.width / 2 - 0.25]) apertures.push({ x: window.x - dz * cross, z: window.z + dx * cross, dx, dz, length });
    }
    let clear = true, backed = true, stoneBelow = true, rampOpening = false, neighborOpening = false, gallery = true, firstBlocked = null, firstRamp = null, firstGallery = null;
    for (const aperture of apertures) {
      if (window.kind === "panorama") for (let r = H.room.radius - 0.5; r < window.radius - 0.25; r += 0.5) { const c = {}, x = aperture.dx * r, z = aperture.dz * r; if (!B.island.cavityAt(x, z, c, 9) || c.floor !== H.floor) { gallery = false; firstGallery ||= [x, z, c.floor]; } }
      let sill = false;
      for (let d = 0; d <= Math.min(aperture.length, 5); d += 0.125) {
        const x = aperture.x + aperture.dx * d, z = aperture.z + aperture.dz * d;
        let floor = Infinity;
        for (const f of window.flare.frusta) {
          const along = x * Math.sin(f.angle) - z * Math.cos(f.angle), across = Math.abs(x * Math.cos(f.angle) + z * Math.sin(f.angle));
          if (along >= f.start - 1e-7 && along <= f.end + 1e-7 && across <= f.half + f.horizontal * (along - f.start) + 1e-7) floor = Math.min(floor, window.sill - f.vertical * (along - f.start));
        }
        if (floor < Infinity && B.island.solidAt(x, floor - 0.025, z) && B.island.clearAt(x, floor + 0.01, z, 0, 0.05)) sill = true;
      }
      stoneBelow &&= sill;
      for (const height of [0.25, window.height / 2, window.height - 0.25]) {
        const y = window.sill + height;
        backed &&= meshClear(aperture.x, y, aperture.z, aperture.dx, window.rise || 0, aperture.dz, aperture.length);
        for (let d = 0; d <= aperture.length; d += 0.125) {
          const x = aperture.x + aperture.dx * d, z = aperture.z + aperture.dz * d, floorY = y + (window.rise || 0) * d;
          if (B.island.solidAt(x, floorY, z)) { clear = false; firstBlocked ||= [x, floorY, z]; }
          if (inRamp(x, floorY, z, ownRamp)) { rampOpening = true; firstRamp ||= [x, floorY, z]; }
          if (window.kind !== "panorama") for (const room of rooms) {
            if ((window.kind === "room" && room.index === window.roomIndex && !!room.basement === !!window.basement) || floorY <= room.floor || floorY >= room.ceiling) continue;
            const dx = x - room.x, dz = z - room.z, across = dx * Math.cos(room.angle) + dz * Math.sin(room.angle), along = dx * Math.sin(room.angle) - dz * Math.cos(room.angle);
            if (Math.abs(across) < room.width / 2 && Math.abs(along) < room.depth / 2) neighborOpening = true;
          }
        }
      }
    }
    const landingAngles = H.ramps.map((ramp) => Math.atan2(ramp.to.x, -ramp.to.z)).sort((a, b) => a - b);
    return { kind: window.kind, roomIndex: window.roomIndex, basement: !!window.basement, rampIndex: window.rampIndex, sampleIndex: window.sampleIndex, onRamp: !!ownRamp, width: window.width, height: window.height, sill: window.sill, floor: window.floor, radius, outerRadius, arc: window.kind === "panorama" ? window.endAngle - window.startAngle : 0, betweenLandings: window.kind === "panorama" && window.startAngle > landingAngles[0] && window.endAngle < landingAngles[1], apertures: apertures.length, clear, meshClear: backed, stoneBelow, rampOpening, neighborOpening, gallery, firstBlocked, firstRamp, firstGallery };
  });
};

const matrixGateClipping = () => withPage("matrix gate clipping", hubPage(src), async (b) => {
  const objects = await b.evaluate(`(${objectRenderClippingProbe.toString()})()`);
  record("matrix gates: discarded overhead geometry cannot block perception, camera visibility or outlines", objects.rows.length === 16 && objects.failures.length === 0 && objects.disposed, JSON.stringify(objects));
  const mirror = await b.evaluate(`(${mirrorGateClipProbe.toString()})()`);
  record("matrix gates: the custom mirror silhouette excludes stored bars and clips partial gates exactly at the doorway", mirror.samples.length === 8 && mirror.failures.length === 0 && mirror.disposed, JSON.stringify(mirror));
  const lifecycle = await b.evaluate(`(() => { const B = window.__ooga, G = B.matrixGate, scene = window.BL.scenes.hub, rim = window.BL.hubModels.caveMouthRim().openingBounds, initial = G.gates.map((gate) => { const mouth = B.mouths.find((mouth) => mouth.id === B.matrixCave.caves.find((cave) => cave.caveIndex === gate.caveIndex).id); return { hidden: !gate.node.visible && gate.node.position.y === G.hiddenHeight, floor: gate.node.geometry.clipMinY, ceiling: gate.node.geometry.clipMaxY, mouthFloor: mouth.floorY + rim.floorY, mouthCeiling: mouth.floorY + rim.ceilingY }; }); let time = B.renderOpts.matrix.time; G.set(true); for (const gate of G.gates) gate.node.position.y = 1.7; scene.update(1 / 60, time += 1 / 60); const partial = G.gates.map((gate) => ({ visible: gate.node.visible, y: gate.node.position.y })); for (let i = 0; i < 40; i++) scene.update(1 / 60, time += 1 / 60); return { initial, partial, hiddenHeight: G.hiddenHeight, overhead: G.gates.every((gate) => !gate.node.visible && gate.node.position.y === G.hiddenHeight) }; })()`);
  record("matrix gates: each doorway clips at its actual floor and ceiling, keeps partial rises visible, and suppresses stored overhead nodes", lifecycle.initial.length === 5 && lifecycle.initial.every((gate) => gate.hidden && gate.floor === gate.mouthFloor && gate.ceiling === gate.mouthCeiling) && lifecycle.partial.every((gate) => gate.visible && gate.y > 1.7 && gate.y < lifecycle.hiddenHeight) && lifecycle.overhead, JSON.stringify(lifecycle));
  const motion = await b.evaluate(`(${matrixGateAnimationProbe.toString()})()`);
  record("matrix gates: releasing the button lowers every gate at the same smooth speed as opening, including mid-motion reversals", motion.length === 2 && motion.every((r) => r.count === 5 && r.inside && r.settled && [r.down, r.up].every((m) => m.complete && m.monotonic && m.visibility && m.intermediate > 50 && m.start.every((y, i) => y === m.immediate[i]) && m.duration >= 1 - r.dt && m.duration <= 1 + r.dt * 1.01 && m.maxStep <= 3.2 * r.dt + 1e-7) && Math.abs(r.down.maxStep - r.up.maxStep) < 1e-7 && r.reversal.rising.every((y, i) => y === r.reversal.release[i] && r.reversal.falling[i] < y && r.reversal.falling[i] === r.reversal.press[i] && r.reversal.reversed[i] > r.reversal.press[i])), JSON.stringify(motion));
  record("matrix gates: initial wave arrival and early button release both wait for the front then descend smoothly", motion.length === 2 && motion.every((r) => r.initialAppearance.inactive && r.initialAppearance.appeared === r.count && r.initialAppearance.complete && r.initialAppearance.monotonic && r.initialAppearance.intermediate > 50 && r.initialAppearance.firstStep.every((step) => Math.abs(step - 3.2 * r.dt) < 1e-7) && r.initialAppearance.maxStep <= 3.2 * r.dt + 1e-7 && r.early.releasedBeforeFront && r.early.hidden && r.early.complete && r.early.monotonic && r.early.visibility && r.early.waiting.every((frames) => frames > 0) && r.early.intermediate.every((frames) => frames > 10) && r.early.firstStep.every((step) => Math.abs(step - 3.2 * r.dt) < 1e-7) && r.early.maxStep <= 3.2 * r.dt + 1e-7), JSON.stringify(motion.map(({ dt, initialAppearance, early }) => ({ dt, initialAppearance, early }))));
  for (const backend of ["webgl2", "canvas2d"]) {
    const clipping = await b.evaluate(`(${matrixGateClipProbe.toString()})(${JSON.stringify(backend)})`);
    record(`matrix gates: ${backend} clips the actual rising bars and glyph pixels at the world ceiling`, clipping.backend === backend && clipping.floor === 0 && clipping.ceiling === 3 && clipping.parentY > 0 && clipping.samples.length === 8 && clipping.samples.every((s) => s.clipped.above === 0 && s.control.above > 0 && (s.lift < 3 ? s.clipped.below > 0 && Math.abs(s.control.below - s.clipped.below) <= 2 : s.clipped.below === 0)), JSON.stringify(clipping));
  }
});

const headquartersApronCameraProbe = () => {
  const B = window.__ooga, o = B.pilot.orbit, saved = { ...o }, samples = [];
  const pose = (m, across, y, along) => {
    const sr = Math.sin(m.ry), cr = Math.cos(m.ry), x = m.x + cr * across + sr * along, z = m.z - sr * across + cr * along;
    o.target = { x: x - sr * 3.5, y, z: z - cr * 3.5 }; o.tx = o.target.x; o.ty = y; o.tz = o.target.z;
    o.yaw = o.tYaw = m.ry; o.pitch = o.tPitch = 0; o.dist = o.tDist = 3.5;
    B.pilot.update(0.1);
    const p = B.camera.position, lower = {};
    return { id: m.id, across, along, y: p.y, requested: [x, y, z], orbitError: Math.hypot(p.x - x, p.y - y, p.z - z), ground: B.island.surfaceAt(x, z), drift: Math.hypot(p.x - x, p.z - z), index: B.cameraCave.index, lowerCeiling: B.island.cavityAt(x, z, lower, 9) ? lower.ceiling : null };
  };
  try {
    for (const front of B.island.headquarters.fronts) {
      const m = B.mouths.find((mouth) => mouth.id === front.id);
      pose(m, 0, 12, 3);
      for (let across = -4; across <= 4; across++) samples.push(pose(m, across, 0.8, 1.6));
      for (const across of [-1, 0, 1]) samples.push(pose(m, across, 0.8, 3));
      pose(m, 0, 12, 3);
    }
  } finally { Object.assign(o, saved); B.pilot.update(0.1); }
  return samples;
};

const headquartersBareRoomProbe = () => {
  const B = window.__ooga, H = B.headquarters, M = window.BL.headquartersModels, scene = window.BL.scenes.hub, nodes = [], rooms = H.rooms.concat(H.basement.rooms);
  const walk = (node) => { nodes.push(node); for (const child of node.children) walk(child); };
  walk(scene.root);
  window.BL.scene.updateWorld(scene.root);
  const entrances = new Set(rooms.map((room) => M.roomEntrance(room.index)));
  const bedding = new Set(H.mattresses.map((bed) => bed.node)), signs = new Set(H.roomSigns.map((sign) => sign.node)), occupants = new Set();
  const occupant = (node) => { occupants.add(node); for (const child of node.children) occupant(child); };
  for (const cave of B.cavemen.values()) occupant(cave.root);
  const inside = (node, room) => {
    const dx = node.world[12] - room.x, dz = node.world[14] - room.z;
    return node.world[13] >= room.floor && node.world[13] < room.ceiling && Math.abs(dx * Math.cos(room.angle) + dz * Math.sin(room.angle)) < room.width / 2 && Math.abs(dx * Math.sin(room.angle) - dz * Math.cos(room.angle)) < room.depth / 2;
  };
  const extras = nodes.filter((node) => node.geometry && node.world[13] < -3 && !entrances.has(node.geometry) && !bedding.has(node) && !signs.has(node) && !occupants.has(node) && rooms.some((room) => inside(node, room)));
  const basementExtras = nodes.filter((node) => node.geometry && !occupants.has(node) && node.world[13] >= H.basement.floor && node.world[13] < H.basement.ceiling && Math.hypot(node.world[12] - H.basement.room.x, node.world[14] - H.basement.room.z) < H.basement.room.radius - 0.5);
  const savedPosition = B.camera.position, savedTarget = B.camera.target, hits = [];
  try {
    for (const room of rooms) {
      const sx = Math.sin(room.angle), cz = Math.cos(room.angle);
      for (const [side, depth, y] of [[room.width / 2 - 0.25, 0, room.floor + 1.5], [-room.width / 2 + 0.25, 0, room.floor + 1.5], [-0.85, 0.3, room.floor + 0.2]]) {
        const x = room.x + cz * side + sx * depth, z = room.z + sx * side - cz * depth;
        B.camera.position = { x: room.x, y: room.floor + 1.5, z: room.z };
        B.camera.target = { x, y, z };
        B.renderer.render(scene.root, B.camera, B.renderOpts);
        const screen = B.renderer.project(x, y, z, {}), hit = screen && B.input.pick(screen.x, screen.y);
        hits.push(hit && hit.owner.kind);
      }
    }
  } finally {
    B.camera.position = savedPosition; B.camera.target = savedTarget;
    B.renderer.render(scene.root, B.camera, B.renderOpts);
  }
  return { mattresses: bedding.size, furnishedRooms: new Set(H.mattresses.filter((bed) => inside(bed.node, bed.room) && bed.node.geometry === M.mattress(bed.room)).map((bed) => bed.room)).size, basementExtras: basementExtras.length, noBeds: !("cots" in H) && !("cot" in M), noWallAPI: !("personalWalls" in H) && !("cycleWall" in H), noNumberAPI: !("roomNumbers" in H), noDecorModels: !("wallBay" in M) && !("roomNumber" in M), numberNodes: nodes.filter((node) => node.geometry && "roomNumber" in node.geometry).length, extras: extras.map((node) => ({ x: node.world[12], y: node.world[13], z: node.world[14], faces: node.geometry.faces.length })), hits, savedThemes: localStorage.getItem("ooga-headquarters-walls-v1") };
};

const roomMattresses = (backend) => withPage(`room mattresses ${backend}`, hubPage(src, backend === "canvas2d" ? "canvas2d=1" : ""), async (b) => {
  let sourceSignatures = null;
  for (const base of [src, dist]) {
    if (base !== src) { await b.open(hubPage(base, backend === "canvas2d" ? "canvas2d=1" : "")); await untilReady(b); }
    const r = await b.evaluate(`(${roomMattressGeometryProbe.toString()})()`), label = `room mattresses ${backend} ${base === src ? "source" : "built"}`;
    record(`${label}: fifteen full-size corner mattresses remain on clear rock floors with open room circulation`, r.beds === 15 && r.nodes === 15 && r.rooms === 15 && r.uniqueRooms === 15 && r.uniqueGeometry === 15 && r.cached === 15 && r.unclaimed === 15 && r.rows.filter((row) => row.basement).length === 8 && r.floorSamples === 3135 && r.vertices > 10000 && r.failures.length === 0, JSON.stringify({ ...r, signatures: undefined }));
    record(`${label}: every blanket pixel and wrapped edge retain the room LifeHash, with the pillow rotated a quarter turn`, r.pixels === 30720 && r.edges === 3840 && r.uniqueFabrics === 15 && r.signatures.length === 30 && r.rotations === 15 && (!sourceSignatures || JSON.stringify(r.signatures) === JSON.stringify(sourceSignatures)) && r.failures.length === 0, JSON.stringify({ pixels: r.pixels, edges: r.edges, unique: r.uniqueFabrics, failures: r.failures }));
    if (!sourceSignatures) sourceSignatures = r.signatures;
    const signs = await b.evaluate(`(${roomLifehashSignProbe.toString()})()`);
    record(`${label}: each small wooden sign hangs centered under its beam and prints the first eight hex characters of the bedding hash`, signs.signs === 15 && signs.nodes === 15 && signs.rows.filter((row) => row.basement).length === 8 && signs.rows.every((row) => row.ok && row.pixels === 120 && row.ink > 25) && new Set(signs.rows.map((row) => row.hash.slice(0, 8))).size === 15 && signs.failures.length === 0, JSON.stringify(signs));
  }
  const visible = await b.evaluate(`(${roomMattressVisibilityProbe.toString()})()`);
  record(`room mattresses ${backend}: actual room views show both printed blanket and pillow in every room`, visible.backend === backend && visible.rows.length === 15 && visible.rows.every((row) => row.surfaces.length === 2 && row.surfaces.every((surface) => surface.samples === 64 && surface.changed > 32 && surface.colored > 16 && surface.colors > 6)), JSON.stringify(visible));
  const signsVisible = await b.evaluate(`(${roomLifehashSignVisibilityProbe.toString()})()`);
  record(`room mattresses ${backend}: the hallway view renders every hanging sign inscription`, signsVisible.backend === backend && signsVisible.rows.length === 15 && signsVisible.rows.every((row) => row.samples > 25 && row.changed > row.samples * 0.6), JSON.stringify(signsVisible));
  for (const fixture of [{ mode: "trailing", dt: 1 / 20 }, { mode: "first-person", dt: 1 / 120 }]) {
    await b.open(hubPage(src, backend === "canvas2d" ? "canvas2d=1" : "")); await untilReady(b);
    const r = await b.evaluate(`(${roomMattressMovementProbe.toString()})(${JSON.stringify(fixture)})`);
    record(`room mattresses ${backend}: ${fixture.mode} reaches each room, both bedside aisles and its window, then exits smoothly`, r.rows.length === 15 && r.rows.every((row) => row.reached === row.points && !row.claimed && Math.abs(row.feet - row.floor) < 0.05) && r.checks > 500 && r.failures.length === 0, JSON.stringify(r));
    const impacts = await b.evaluate(`(${roomLifehashSignImpactProbe.toString()})(${JSON.stringify(fixture)})`);
    record(`room mattresses ${backend}: ${fixture.mode} head bumps swing every sign once, preserve ascent and settle without reacting to nearby misses`, impacts.mode === fixture.mode && impacts.rows.length === 15 && impacts.rows.every((row) => row.still && row.hits === 1 && row.continued && row.maximum > 0.01 && row.maximum <= 1.35 && row.settled && row.miss), JSON.stringify(impacts));
    const passing = await b.evaluate(`(${roomSignPassingProbe.toString()})(${JSON.stringify(fixture)})`);
    record(`room mattresses ${backend}: ${fixture.mode} front and back head impacts push signs aside without interrupting the jump arc`, passing.mode === fixture.mode && passing.rows.length === 4 && passing.rows.every((row) => row.hits === 1 && row.error < 1e-6 && row.direction === row.side && row.continued && row.rendered && row.crossed && row.maximum > 0.3 && row.maximum <= 1.35 && row.settled), JSON.stringify(passing));
  }
});

const roomSleeping = (backend) => withPage(`room sleeping ${backend}`, hubPage(src, backend === "canvas2d" ? "canvas2d=1" : ""), async (b) => {
  const r = await b.evaluate(`(${roomSleepProbe.toString()})()`);
  record(`room sleeping ${backend}: Randy starts asleep and all eight Oogas walk continuously to separate available beds`, r.initial.state === "sleeping" && r.initial.mode === "walk" && r.initial.visible && r.initial.claimed && r.startMotion < 1e-7 && r.claims && r.reserved === 8 && r.sleepSeconds < 180 && r.checks > 1000 && r.maxWalkStep <= 2 * r.dt + 1e-7 && r.failures.length === 0, JSON.stringify({ ...r, poses: undefined, returned: undefined }));
  record(`room sleeping ${backend}: shared routes keep yielding within the local search budget and recovery flight within its speed limit`, r.maxBlocked <= r.recoveryWait && r.maxJumpStep <= 3 * r.dt + 1e-7, JSON.stringify({ maxBlocked: r.maxBlocked, recoveryWait: r.recoveryWait, maxJumpStep: r.maxJumpStep, dt: r.dt }));
  record(`room sleeping ${backend}: every resting body lies on the unchanged printed mattress with slight compression and its head supported by the pillow`, r.poses.length === 8 && r.poses.every((p) => p.mode === "rest" && p.blocked === 0 && p.closed && p.pose === "left" && Math.abs(p.quaternionLength - 1) < 1e-6 && p.reserved && p.flatFabric && p.bodyInside && p.headClear && p.pillowContact > 1e-5 && Math.abs(p.pillowBottom - p.pillowTop + 0.015) < 1e-5 && p.headBottom >= p.surface - 0.02501 && Math.abs(p.headX) < 0.45 && Math.abs(p.headZ - p.pillowZ) < 0.25 && p.bodyFloor >= p.surface - 0.16001 && p.headOffset.every((offset) => Math.abs(offset) < 1e-6) && p.bodySamples > 1000), JSON.stringify(r.poses));
  record(`room sleeping ${backend}: waking releases each bed in place and follows a clear route back to its pile slot`, r.wake.movement < 1e-7 && r.wake.released && r.wake.returning && r.returned.length === 8 && r.returned.every((c) => c.mode === "" && c.state === "working" && c.y >= 0 && c.distance < 0.1 && !c.claimed) && r.failures.length === 0, JSON.stringify({ wake: r.wake, returned: r.returned, failures: r.failures }));
  for (const fixture of [{ mode: "trailing", dt: 1 / 20, basement: false }, { mode: "trailing", dt: 1 / 120, basement: true }, { mode: "first-person", dt: 1 / 20, basement: true }, { mode: "first-person", dt: 1 / 120, basement: false }]) {
    await b.open(hubPage(src, backend === "canvas2d" ? "canvas2d=1" : "")); await untilReady(b);
    const p = await b.evaluate(`(${roomManualSleepProbe.toString()})(${JSON.stringify(fixture)})`), label = `room sleeping ${backend}: ${fixture.mode} ${Math.round(1 / fixture.dt)} Hz`;
    record(`${label} steps onto the mattress and a fresh Space press sleeps, while holding does not wake`, p.off.act === "JUMP!" && p.on.act === "SLEEP" && Math.abs(p.on.y - p.surface) < 1e-6 && p.sleepingHeld.sleeping && p.sleepingHeld.manual && p.sleepingHeld.mode === "rest" && p.sleepingHeld.act === "WAKE UP!" && p.sleepingHeld.selected && p.sleepingHeld.view === fixture.mode, JSON.stringify({ off: p.off, on: p.on, sleepingHeld: p.sleepingHeld }));
    record(`${label} all WASD poses keep the head and supporting feet in slight bedding contact with the chosen camera distance`, p.poses.length === 4 && p.poses.every((row) => row.pose === row.expected && (row.input !== "a" || row.faceAcross < -0.9999) && (row.input !== "d" || row.faceAcross > 0.9999) && row.sleeping && row.reserved && row.flatFabric && row.roll === 1 && row.limbRotations.slice(0, 4).every((angle) => angle === 0) && row.limbRotations.slice(4).every((angle) => Math.abs(angle) <= 0.4) && row.selected && row.view === fixture.mode && row.bodyBottom >= p.surface - (["left", "right"].includes(row.pose) ? 0.16001 : 0.02501) && (!["left", "right"].includes(row.pose) || row.headOffset.every((offset) => Math.abs(offset) < 1e-6)) && Math.abs(row.pillowBottom - p.pillowTop + 0.015) < 1e-5 && row.headBottom >= p.surface - 0.02501 && Math.abs(Math.min(...row.feet) - p.surface + 0.025) < 1e-5 && (!["back", "stomach"].includes(row.pose) || row.feet.every((foot) => Math.abs(foot - p.surface + 0.025) < 1e-5)) && Math.abs(Math.hypot(...row.quaternion) - 1) < 1e-6 && (fixture.mode !== "first-person" ? row.chosenDistance === 4 && Math.abs(row.actualDistance - row.chosenDistance) < 1e-9 : row.directionDot > 0.999 && row.upDot > 0.999 && Math.abs(row.upLength - 1) < 1e-6)) && p.minBodyAbovePad >= -0.16001 && p.checks > 100 && p.failures.length === 0, JSON.stringify({ poses: p.poses, minimum: p.minBodyAbovePad, maxEyeStep: p.maxEyeStep, failures: p.failures }));
    record(`${label} back and stomach arms rest along the torso while side poses retain their inward arms and turn smoothly`, p.poses.every((row) => ["back", "stomach"].includes(row.pose) ? row.limbRotations.slice(4).every((angle) => Math.abs(angle) < 1e-6) && row.armOffset.every((offset) => Math.abs(offset) < 1e-6) : row.limbRotations[4] === 0 && row.limbRotations[6] === 0 && Math.abs(row.limbRotations[5] - 0.35) < 1e-6 && Math.abs(row.limbRotations[7] + 0.35) < 1e-6) && p.armRollSamples > 20 && p.maxArmRotationStep <= 1.4 * fixture.dt + 1e-6 && p.failures.length === 0, JSON.stringify({ poses: p.poses.map((row) => ({ pose: row.pose, rotations: row.limbRotations.slice(4), offsets: row.armOffset })), samples: p.armRollSamples, step: p.maxArmRotationStep, dt: fixture.dt, failures: p.failures }));
    record(`${label} only Space wakes, stepping off restores jumping, and a sleeper keeps its bed when selected or released`, !p.awakeHeld.sleeping && !p.awakeHeld.reserved && p.awakeHeld.state === "working" && p.awakeHeld.hop === 0 && p.awakeHeld.velocity === 0 && p.exited.act === "JUMP!" && Math.abs(p.exited.y) < 1e-6 && p.jumped.velocity > 0 && !p.jumped.sleeping && p.exclusive.refused && p.exclusive.act === "JUMP!" && p.exclusive.owner && p.exclusive.ownerAsleep && p.exclusive.visitorAwake && p.exclusive.visitorJumps && p.exclusive.selectedSleeping && p.exclusive.explicitWake, JSON.stringify({ awakeHeld: p.awakeHeld, exited: p.exited, jumped: p.jumped, exclusive: p.exclusive }));
    record(`${label} navigating to the pile wakes and releases the bed while preserving possession and view`, p.navigation.sleepingBefore && !p.navigation.sleepingAfter && p.navigation.released && p.navigation.selected && p.navigation.view === fixture.mode && p.navigation.state === "working" && p.navigation.feet >= 0 && p.navigation.camera === 0 && p.navigation.scene === "hub", JSON.stringify(p.navigation));
    const poke = p.pokes, unchanged = (r) => r.before.q.every((v, i) => v === r.after.q[i]) && ["x", "y", "z"].every((axis) => r.before.p[axis] === r.after.p[axis]);
    record(`${label} sleepy pokes sometimes roll to a different pose smoothly without waking, hopping or restarting an active turn`, poke.quiet.calls === 2 && poke.quiet.after.pose === poke.quiet.before.pose && poke.quiet.after.roll === 1 && unchanged(poke.quiet) && poke.rolling.calls === 3 && poke.rolling.after.pose !== poke.rolling.before.pose && poke.rolling.after.roll === 0 && unchanged(poke.rolling) && poke.repeat.calls === 1 && poke.repeat.after.pose === poke.rolling.after.pose && poke.repeat.after.roll > 0 && poke.repeat.after.roll < 1 && unchanged(poke.repeat) && poke.settled.roll === 1 && poke.settled.pose === poke.rolling.after.pose && [poke.quiet.after, poke.rolling.after, poke.repeat.after, poke.settled].every((s) => s.sleeping && s.reserved && s.selected && s.hop === 0 && s.velocity === 0) && poke.sleepyText, JSON.stringify(poke));
  }
});

const movementCollision = (backend) => withPage(`movement collision ${backend}`, hubPage(src, backend === "canvas2d" ? "canvas2d=1" : ""), async (b) => {
  const modes = ["orbit", "eye-level", "trailing", "first-person"], cases = [];
  for (const mode of modes) {
    cases.push({ id: "c5", mode, dt: 1 / 120, rooms: mode === "orbit" || mode === "first-person" });
    cases.push({ id: "c730", mode, dt: 1 / 20, rooms: mode === "eye-level" || mode === "trailing" });
    cases.push({ id: "c1", mode, dt: 1 / 120 });
  }
  cases.push({ id: "c5", mode: "trailing", dt: 1 / 20, fromNavigation: true, rooms: true });
  cases.push({ id: "c5", mode: "first-person", dt: 1 / 120, fromNavigation: true, rooms: true });
  cases.push({ id: "c9", mode: "orbit", dt: 1 / 20 }, { id: "c11", mode: "eye-level", dt: 1 / 20 });
  for (const [i, fixture] of cases.entries()) {
    if (i) { await b.open(hubPage(src, backend === "canvas2d" ? "canvas2d=1" : "")); await untilReady(b); }
    const r = await b.evaluate(`(${movementCollisionProbe.toString()})(${JSON.stringify(fixture)}, (${createEntranceClearanceProbe.toString()}))`), name = `movement collision ${backend}: ${fixture.id} ${fixture.mode}${fixture.fromNavigation ? " after HQ navigation" : ""}`;
    const detail = { dt: r.dt, checkpoints: r.checkpoints, samples: r.samples, entrances: r.entrances, failed: r.failed, violations: r.violations, separation: r.maxSeparation, separationAt: r.maxSeparation >= 6.5 ? r.maxSeparationAt : null, step: r.maxStep, stepAt: r.maxStep > 1 ? r.maxStepAt : null, ramps: r.rampViews, rawChecks: r.rawChecks, maximumRawError: r.maximumRawError, initialView: r.initial.view, final: r.final };
    record(`${name} follows continuous routes with the requested orbit or physical walking view`, r.backend === backend && r.scene === "hub" && r.initial.view === fixture.mode && r.final.view === fixture.mode && r.completed && r.violations.length === 0 && (fixture.mode !== "orbit" || r.rawChecks === r.samples && r.maximumRawError < 1e-5) && (fixture.mode === "trailing" || r.maxSeparation < 6.5) && r.maxStep < 1, JSON.stringify(detail));
    if (["c5", "c730"].includes(fixture.id) && ["trailing", "first-person"].includes(fixture.mode)) {
      const v = r.rampViews;
      record(`${name} preserves the chosen orbit or physical first-person eye on both ramp directions`, v.mainUp > 10 && (fixture.fromNavigation || v.mainDown > 10) && (!fixture.rooms || v.basementDown > 10 && v.basementUp > 10) && (fixture.mode === "trailing" ? v.rawChecks > 30 && v.maximumRawError < 1e-5 : v.blocked.length === 0 && v.maxSeparation < 6.5), JSON.stringify(v));
    }
    if (fixture.rooms) record(`${name} visits all fifteen rooms and returns through the other basement descent with the correct camera policy`, r.visitedRooms.length === 15 && (fixture.mode === "orbit" ? r.rawChecks === r.samples && r.rawChecks > 100 && r.maximumRawError < 1e-5 : r.entrances.visited.length === 17 && r.entrances.samples > 100) && r.visitedRooms.every((room) => Math.abs(room.y - room.floor - (["trailing", "first-person"].includes(fixture.mode) ? 0 : 1.1)) < 0.5 && (fixture.mode === "trailing" || room.camera !== 0)) && r.visitedRooms.filter((room) => room.basement && room.floor < -7 && (fixture.mode === "trailing" || room.lightCount === 0)).length === 8 && r.completed, JSON.stringify({ rooms: r.visitedRooms, entrances: r.entrances }));
    if (r.underground) {
      const u = r.underground;
      record(`${name} horizontal movement stays on the lower elevation layer`, u.before.y < -5 && u.after.y < -5 && Math.hypot(u.after.x - u.before.x, u.after.z - u.before.z) > 0.35 && (fixture.mode === "trailing" || u.before.camera !== 0 && u.after.camera !== 0) && (fixture.mode !== "orbit" || u.targetBefore < 0 && u.targetAfter < 0), JSON.stringify(u));
    }
    if (r.collision) record(`${name} ${fixture.mode === "orbit" ? "passes through the wall at its requested pose" : "slides at wall contact"} and reverses immediately after sustained input`, r.collision.travel > 0.5 && r.reversal.firstDot > 0.0001 && r.reversal.distance > 0.25, JSON.stringify({ collision: r.collision, reversal: r.reversal }));
  }
});

const movementWindows = (backend) => withPage(`movement windows ${backend}`, hubPage(src, backend === "canvas2d" ? "canvas2d=1" : ""), async (b) => {
  const rampWindows = await b.evaluate(`window.__ooga.headquarters.windows.filter((entry) => entry.kind === "ramp" && entry.basement).map(({ rampIndex, sampleIndex }) => ({ basement: true, rampIndex, sampleIndex }))`);
  for (const [i, fixture] of [{}, { roomIndex: 4 }, { roomIndex: 10 }, ...Array.from({ length: 8 }, (_, roomIndex) => ({ roomIndex, basement: true })), ...rampWindows].entries()) {
    if (i) { await b.open(hubPage(src, backend === "canvas2d" ? "canvas2d=1" : "")); await untilReady(b); }
    const r = await b.evaluate(`(${movementWindowsProbe.toString()})(${JSON.stringify(fixture)}, (${createEntranceClearanceProbe.toString()}))`), label = r.kind === "room" ? `${r.basement ? "basement " : ""}room ${r.roomIndex} window` : r.kind === "ramp" ? `basement ramp ${r.rampIndex} window ${r.sampleIndex}` : "panorama";
    record(`movement windows ${backend}: the exact free orbit crosses the ${label} and returns to headquarters at the same height`, r.completed && r.backend === backend && r.scene === "hub" && r.rawChecks === r.samples && r.samples > 100 && r.violations.length === 0 && r.maxStep < 1 && r.initial.mode === "orbit" && r.final.mode === "orbit" && r.physicalChecks === 0 && r.admitted.layer === 9 && r.outside.radius > 30.8 && r.outside.camera === 0 && r.outside.layer === 0 && Math.abs(r.outside.y - r.expectedHeight) < 0.3 && r.reentered.layer === 9 && Math.abs(r.reentered.y - r.expectedHeight) < 0.3 && r.final.layer === 9 && Math.abs(r.final.y - r.floor - 1.1) < 0.4 && !r.final.controlled && !r.final.matrixInside, JSON.stringify(r));
  }
});

const windowJump = (backend) => withPage(`window jump ${backend}`, hubPage(src, backend === "canvas2d" ? "canvas2d=1" : ""), async (b) => {
  const url = hubPage(src, backend === "canvas2d" ? "canvas2d=1" : ""), dt = backend === "canvas2d" ? 1 / 20 : 1 / 60;
  const fixtures = [false, true].flatMap((basement) => ["trailing", "first-person"].map((mode) => ({ basement, mode, dt, exit: true })));
  fixtures.push({ basement: true, mode: "first-person", dt, jet: true });
  fixtures.push({ basement: true, mode: "first-person", dt, offset: 1.9 });
  for (const [i, fixture] of fixtures.entries()) {
    if (i) { await b.open(url); await untilReady(b); }
    const r = await b.evaluate(`(${windowJumpProbe.toString()})(${JSON.stringify(fixture)})`), name = `window jump ${backend}: ${fixture.mode} ${fixture.basement ? "basement room" : "HQ panorama"}${fixture.jet ? " with a recovering jetpack" : fixture.offset ? " from outside the old frame" : ""}`;
    record(`${name} jumps from the upper rim and steers through the real opening onto its lower floor`, r.completed && r.leftRock && r.secondJump && r.initial.y >= 0 && r.apertureCrossing && r.apertureCrossing.floor >= r.floor && r.apertureCrossing.y >= r.apertureCrossing.floor - 0.01 && r.apertureCrossing.y + r.bodyHeight <= r.apertureCrossing.ceiling + 0.01 && r.final.hop === 0 && Math.abs(r.final.y - r.floor) < 1e-7 && r.final.player !== 0 && r.scene === "hub" && r.mode === fixture.mode, JSON.stringify({ initial: r.initial, aperture: r.apertureCrossing, final: r.final, completed: r.completed, window: r.window }));
    record(`${name} keeps the body clear and the selected view continuous, with physical first-person clearance`, r.samples > 60 && r.backend === backend && r.violations.length === 0 && r.maxStep < 1.2 && (fixture.mode === "first-person" ? r.maxEyeGap < 0.5 : r.rawChecks === r.samples && r.maximumRawError < 1e-5) && (fixture.mode === "trailing" || r.final.camera !== 0), JSON.stringify({ samples: r.samples, maxStep: r.maxStep, maxEyeGap: r.maxEyeGap, rawChecks: r.rawChecks, maximumRawError: r.maximumRawError, violations: r.violations }));
    if (fixture.jet) record(`${name} removes the pack on entry through the window`, r.initial.jet && !r.final.jet && !r.apertureCrossing.jet, JSON.stringify({ initial: r.initial.jet, aperture: r.apertureCrossing.jet, final: r.final.jet }));
    if (fixture.exit) record(`${name} jumps back onto the sill and leaves through the window without retaining actor HQ ownership`, r.exited && r.exited.r > r.window.edge + 0.5 && r.exited.player === 0 && (fixture.mode === "trailing" || r.exited.camera === 0) && r.violations.length === 0, JSON.stringify({ exited: r.exited, edge: r.window.edge, violations: r.violations }));
    if (fixture.offset) record(`${name} uses the wider outer mouth before steering through the unchanged inner frame`, r.completed && r.wideEntry && r.wideEntry.across > r.window.width / 2 + 0.05 && r.final.across < 1 && r.violations.length === 0, JSON.stringify({ initial: r.initial, wideEntry: r.wideEntry, final: r.final, violations: r.violations }));
  }
});

const windowFlares = () => withPage("window flares", hubPage(src), async (b) => {
  const r = await b.evaluate(`(${windowFlareProbe.toString()})()`);
  record("window flares: all existing frames retain their inner sizes and expand toward the actual outer shell", r.windows.length === 28 && r.families["HQ room"] === 7 && r.families["basement room"] === 8 && r.families["HQ ramp"] === 6 && r.families["basement ramp"] === 6 && r.families.panorama === 1 && r.windows.every((w) => w.outerWidth > w.innerWidth && w.outerHeight > w.innerHeight && (w.kind === "room" ? w.innerWidth === 3.5 && w.innerHeight === 2 : w.kind === "ramp" ? w.innerWidth === 3 && w.innerHeight >= 1.75 : w.innerHeight === 2.25)), JSON.stringify({ families: r.families, windows: r.windows }));
  record("window flares: smooth merged reveal triangles agree with solid rock, clear air, and continuous cylinder sweeps", r.fragments > 0 && r.fragments < 40000 && r.totalFaces < 220000 && r.faces > 1000 && r.samples > 1000 && r.sweeps > 100 && r.sloped > 1000 && r.failures.length === 0, JSON.stringify({ fragments: r.fragments, totalFaces: r.totalFaces, faces: r.faces, samples: r.samples, sweeps: r.sweeps, sloped: r.sloped, failures: r.failures }));
  record("window flares: neighboring and stacked apertures retain the required rock separation through the shell", r.pairs > 100 && r.separationSamples > 5000 && r.neighborGap >= r.rockCover && r.stackedGap >= r.rockCover && r.failures.length === 0, JSON.stringify({ pairs: r.pairs, samples: r.separationSamples, neighborGap: r.neighborGap, stackedGap: r.stackedGap, required: r.rockCover, failures: r.failures }));
  record("window flares: every room sees through its full inner frame without retained wall geometry", r.roomViews === 15 && r.roomViewRays === 270 && r.failures.length === 0, JSON.stringify({ rooms: r.roomViews, rays: r.roomViewRays, failures: r.failures }));
  record("window flares: all twelve ramp inner frames retain their size through the visible wall and clear the entire rendered floor", r.rampFrames.length === 12 && r.rampFrames.every((f) => f.width === 3 && f.height === 1.75 && f.samples === 61 && f.missing === 0 && f.clearance >= r.unit && f.throatClearance >= r.unit && f.floorPieces > 0 && f.intersections === 0 && f.frame > f.floorExtent && f.frame > f.marker && f.throatWidth === 3 && f.throatHorizontal === 0 && f.throatVertical === 0), JSON.stringify(r.rampFrames));
  record("window flares: the wider passage admits an approach outside the old frame and its floor and ceiling are continuous slopes", r.enlargedAim.clear && r.enlargedAim.across > r.enlargedAim.oldHalfWidth && r.enlargedAim.widthHere > r.enlargedAim.oldHalfWidth + 0.4 && r.floorSamples > 30 && r.ceilingSamples > 40 && r.floorError < 1e-6 && r.ceilingError < 1e-6, JSON.stringify({ aim: r.enlargedAim, floorSamples: r.floorSamples, ceilingSamples: r.ceilingSamples, floorError: r.floorError, ceilingError: r.ceilingError }));
});

const movementCeiling = (backend) => withPage(`movement ceiling ${backend}`, hubPage(src, backend === "canvas2d" ? "canvas2d=1" : ""), async (b) => {
  for (const [i, mode] of ["trailing", "first-person"].entries()) {
    if (i) { await b.open(hubPage(src, backend === "canvas2d" ? "canvas2d=1" : "")); await untilReady(b); }
    const fixture = { id: "c1", mode, dt: i ? 1 / 120 : 1 / 20, ceiling: true };
    const r = await b.evaluate(`(${movementCollisionProbe.toString()})(${JSON.stringify(fixture)})`), c = r.ceilingContact, name = `movement ceiling ${backend}: ${mode}`;
    record(`${name} the real posed head stops at the cave roof while thrust stays held`, !!c && c.equipped && c.takeoffAction === "Blast off!" && c.entered.player !== 0 && c.hover.thrust && c.hover.hop > 0.5 && c.hover.headTop <= c.hover.roof + 0.01 && c.hover.roof - c.hover.headTop < 0.12 && c.plateauFrames >= Math.ceil(0.2 / r.dt) && c.meshSamples > 10000 && r.violations.length === 0, JSON.stringify({ contact: c, violations: r.violations }));
    if (mode === "first-person") record(`${name} looking up and down while thrust stays held keeps the posed head beneath the roof`, !!c && c.pitched.length === 5 && c.pitched.every((pose) => Math.abs(pose.actual - pose.requested) < 0.01 && pose.headTop <= pose.roof + 0.01 && pose.thrust && pose.hop > 0.5) && r.violations.length === 0, JSON.stringify({ pitched: c && c.pitched, violations: r.violations }));
    record(`${name} sideways and diagonal thrust remain responsive and release lands before a continuous exit`, !!c && c.sideways > 0.4 && c.diagonalTravel > 0.4 && c.landingSeconds < 3 && c.landed.hop === 0 && !c.landed.thrust && Math.abs(c.landed.y) < 0.01 && r.completed && r.scene === "hub" && r.backend === backend && (mode === "first-person" ? r.maxSeparation < 6.5 : r.rawChecks === r.samples && r.maximumRawError < 1e-5) && r.maxStep < 1 && r.final.player === 0 && r.violations.length === 0, JSON.stringify({ side: c && c.sideways, diagonal: c && c.diagonalTravel, landing: c && c.landed, completed: r.completed, failed: r.failed, final: r.final, separation: r.maxSeparation, step: r.maxStep, violations: r.violations }));
  }
});

const rampCeiling = (backend) => withPage(`ramp ceiling ${backend}`, hubPage(src, backend === "canvas2d" ? "canvas2d=1" : ""), async (b) => {
  const cases = [];
  for (const id of ["c730", "c5"]) for (const lateral of [0, -0.6, 0.9]) cases.push({ id, lateral, dt: lateral ? 1 / 20 : 1 / 60 });
  for (const id of ["c730", "c5"]) cases.push({ id, lateral: 0, dt: 1 / 20, fromNavigation: true });
  for (const [i, fixture] of cases.entries()) {
    if (i) { await b.open(hubPage(src, backend === "canvas2d" ? "canvas2d=1" : "")); await untilReady(b); }
    const r = await b.evaluate(`(${rampCeilingProbe.toString()})(${JSON.stringify(fixture)})`), name = `ramp ceiling ${backend}: ${fixture.id} offset ${fixture.lateral}${fixture.fromNavigation ? " after HQ navigation" : ""}`;
    record(`${name} walks down and up in physical first person beneath contact-tested roofs`, r.completed && r.initial.mode === "eye-level" && r.descentClimbInputs === 0 && r.minimumY < -3 && r.roofChecks > 20 && r.roofFailures.length === 0 && r.maxStall < 0.5 && r.maxStep < 1.1 && r.violations.length === 0, JSON.stringify({ completed: r.completed, failures: r.failures, violations: r.violations, roofChecks: r.roofChecks, roofFailures: r.roofFailures, maxStall: r.maxStall, maxStep: r.maxStep, minimumY: r.minimumY, stages: r.stages }));
    const reverse = r.reversal;
    record(`${name} reverses on the upper curve and exits without recentring or changing mode`, !!reverse && Math.hypot(reverse.back.x - reverse.before.x, reverse.back.z - reverse.before.z) > 0.5 && Math.hypot(reverse.resumed.x - reverse.back.x, reverse.resumed.z - reverse.back.z) > 0.5 && r.completed && r.final.camera === 0 && r.final.mode === "eye-level" && r.scene === "hub" && r.backend === backend && !r.selected, JSON.stringify({ reversal: reverse, final: r.final, scene: r.scene }));
  }
});

const entranceCeiling = (backend) => withPage(`entrance ceiling ${backend}`, hubPage(src, backend === "canvas2d" ? "canvas2d=1" : ""), async (b) => {
  const dt = backend === "canvas2d" ? 1 / 20 : 1 / 60;
  const r = await b.evaluate(`(${entranceCeilingProbe.toString()})({dt:${dt}},${createEntranceClearanceProbe.toString()})`);
  record(`entrance ceiling ${backend}: physical first-person walking crosses all 17 lintels in both directions within the same hub`, r.completed && r.crossed.length === 17 && new Set(r.crossed.map((entry) => entry.id)).size === 17 && r.crossed.every((entry) => Math.hypot(entry.inside.x - entry.before.x, entry.inside.z - entry.before.z) > 2 && Math.hypot(entry.returned.x - entry.inside.x, entry.returned.z - entry.inside.z) > 2) && r.scene === "hub" && r.backend === backend && r.mode === "eye-level" && !r.selected, JSON.stringify({ completed: r.completed, crossed: r.crossed.map((entry) => entry.id), failures: r.failures }));
  record(`entrance ceiling ${backend}: every swept eye clears the rendered stones, with clear and penetrating probes at each lintel roof`, r.contacts.length === 17 && r.contacts.every((contact) => contact.standingClear && contact.overheadBlocked && contact.clear && contact.blocked) && r.violations.length === 0 && r.samples > 1000 && r.arches.visited.length === 17 && r.maxStep < 0.7 && r.maxStall < 0.5, JSON.stringify({ contacts: r.contacts, violations: r.violations, samples: r.samples, arches: r.arches, maxStep: r.maxStep, maxStall: r.maxStall }));
});

const walkingParity = (backend) => withPage(`walking parity ${backend}`, hubPage(src, backend === "canvas2d" ? "canvas2d=1" : ""), async (b) => {
  const url = hubPage(src, backend === "canvas2d" ? "canvas2d=1" : "");
  for (const dt of [1 / 20, 1 / 60, 1 / 120]) {
    const speed = await b.evaluate(`(${walkingSpeedProbe.toString()})({dt:${dt}})`);
    record(`walking parity ${backend}: character and free first-person walk at 7.75 units per second at ${Math.round(1 / dt)} Hz`, speed.rows.length === 12 && speed.rows.every((row) => Math.abs(row.speed - 7.75) < 0.01 && row.drift < 1e-5 && row.scene === "hub" && row.mode === (row.driven ? "first-person" : "eye-level")), JSON.stringify(speed));
    const falls = [];
    for (const driven of [false, true]) {
      await b.open(url); await untilReady(b);
      const fall = await b.evaluate(`(${walkingFallProbe.toString()})({driven:${driven},dt:${dt}})`);
      falls.push(fall);
      const { trajectory, ...detail } = fall;
      record(`walking parity ${backend}: ${driven ? "character" : "free eye"} falls ballistically from the roof at ${Math.round(1 / dt)} Hz`, fall.left >= 0 && fall.landed > fall.left + 8 && fall.maxFallSpeed > 6 && fall.ballisticError < 0.035 && fall.violations.length === 0 && fall.landing.along < -1.2 && Math.abs(fall.landing.y - fall.landing.support) < 0.1 && fall.scene === "hub", JSON.stringify(detail));
    }
    const a = falls[0], c = falls[1], count = Math.min(a.trajectory.length, c.trajectory.length) - 1;
    let difference = 0;
    for (let i = 0; i < count; i++) difference = Math.max(difference, Math.abs(a.trajectory[i] - c.trajectory[i]));
    const landingDistance = a.landing && c.landing ? Math.hypot(a.landing.x - c.landing.x, a.landing.z - c.landing.z) : Infinity;
    record(`walking parity ${backend}: both perspectives follow the same undamped fall at ${Math.round(1 / dt)} Hz`, count > 8 && difference < 0.035 && landingDistance < 0.01 && Math.abs(a.duration - c.duration) <= dt + 1e-6, JSON.stringify({ samples: count, difference, landingDistance, freeDuration: a.duration, characterDuration: c.duration }));
    await b.open(url); await untilReady(b);
    const released = await b.evaluate(`(${walkingFallProbe.toString()})({driven:true,release:true,dt:${dt}})`);
    record(`walking parity ${backend}: releasing a falling character preserves the eye and its velocity at ${Math.round(1 / dt)} Hz`, !!released.releaseEvent && released.releaseEvent.velocity < 0 && released.releaseEvent.jump < 1e-7 && released.releaseStepError < 0.035 && released.landed > released.left && released.mode === "eye-level" && !released.selected && released.violations.length === 0, JSON.stringify({ event: released.releaseEvent, error: released.releaseStepError, landing: released.landing, mode: released.mode, violations: released.violations }));
  }
});

const jumpJetpack = (backend) => withPage(`jump and jetpack ${backend}`, hubPage(src, backend === "canvas2d" ? "canvas2d=1" : ""), async (b) => {
  const url = hubPage(src, backend === "canvas2d" ? "canvas2d=1" : "");
  for (const [i, fixture] of ["trailing", "first-person"].flatMap((mode) => [1 / 20, 1 / 120].map((dt) => ({ mode, dt }))).entries()) {
    if (i) { await b.open(url); await untilReady(b); }
    const r = await b.evaluate(`(${jumpJetpackProbe.toString()})(${JSON.stringify(fixture)})`), name = `jump and jetpack ${backend}: ${fixture.mode} ${Math.round(1 / fixture.dt)} Hz`, row = (id) => r.rows.find((entry) => entry.name === id);
    const jump = row("double"), ground = row("landing"), roof = row("ceiling"), flight = row("flight"), empty = row("empty"), refill = row("refill"), off = row("off-air"), ledge = row("ledge"), weighted = row("weighted hop");
    record(`${name} JUMP! permits two fresh-press jumps, while holding and repeat events cannot add a third`, jump.first.label === "JUMP!" && jump.first.jumps === 1 && jump.first.hop > 0 && jump.heldFirst.jumps === 1 && jump.second.jumps === 2 && jump.second.velocity > jump.heldFirst.velocity && jump.third.jumps === 2 && Math.abs(jump.third.velocity - jump.expectedThird) < 1e-6, JSON.stringify(jump));
    record(`${name} Space jumps without making the character speak`, jump.first.speechBefore === 0 && jump.first.speechAfter === 0, JSON.stringify({ before: jump.first.speechBefore, after: jump.first.speechAfter }));
    record(`${name} landing restores jumps but held Space must be released before jumping again`, ground.ground.hop === 0 && ground.ground.jumps === 0 && ground.heldGround.hop === 0 && ground.fresh.jumps === 1 && ground.fresh.velocity > 0 && ground.fresh.hop > 0, JSON.stringify(ground));
    record(`${name} an airborne ceiling or apex cannot replenish the jump budget`, !!roof.contact && roof.contact.hop > 0 && roof.contact.jumps === 2 && roof.roofPress.jumps === 2 && roof.roofPress.velocity <= roof.beforeRoofPress.velocity, JSON.stringify(roof));
    record(`${name} held jetpack thrust consumes fuel, releasing freezes it in the air, and J cannot refill it`, flight.equipped.equipped && flight.equipped.fuel === 1 && flight.flying.hop > 0.5 && flight.flying.thrust && flight.flying.jumps === 1 && flight.coast.hop > 0 && !flight.coast.thrust && flight.coast.fuel === flight.coastBefore.fuel && !flight.removed.equipped && flight.restored.equipped && flight.restored.fuel === flight.removed.fuel && flight.removed.fuel === flight.coast.fuel, JSON.stringify(flight));
    record(`${name} the weighted jetpack hop reaches half a normal tap jump's height without changing held thrust`, weighted.normal.peak > 1 && weighted.weighted.peak > 0.45 && weighted.ratio > 0.45 && weighted.ratio < 0.51 && weighted.weighted.hop === 0 && weighted.weighted.fuel === 1 && flight.equipped.hop === 0 && flight.takeoff.hop === 0 && flight.takeoff.velocity > 0 && flight.takeoff.velocity < 4.8 && flight.takeoff.jumps === 1 && flight.takeoff.fuel === flight.equipped.fuel && flight.flying.y > 4 && flight.flying.thrust && flight.restartBefore.hop > 0 && flight.restartBefore.velocity < 7 && flight.restart.velocity === flight.restartBefore.velocity && flight.restart.jumps === flight.restartBefore.jumps && flight.restart.fuel === flight.restartBefore.fuel, JSON.stringify({ weighted, takeoff: flight.takeoff, flying: flight.flying, beforeAirPress: flight.restartBefore, airPress: flight.restart }));
    record(`${name} a full tank climbs beyond the old ceiling, then empty fuel stops thrust without becoming a jump`, empty.empty.fuel === 0 && !empty.empty.thrust && !empty.empty.flame && empty.empty.y > 45 && empty.emptyPress.jumps === empty.beforeEmptyPress.jumps && !empty.emptyPress.thrust && Math.abs(empty.emptyPress.velocity - empty.beforeEmptyPress.velocity + 9.8 * fixture.dt) < 1e-6 && empty.emptyHeld.velocity < empty.emptyPress.velocity && empty.emptyHeld.fuel === 0, JSON.stringify(empty));
    record(`${name} fuel recharges on actual ground and recovered fuel restores the existing thrust control`, refill.returnToGround.hop === 0 && Math.abs(refill.refilled.fuel - refill.refillStart.fuel - 0.25) < 1e-6 && refill.resumed.hop > 0 && refill.resumed.fuel < refill.refilled.fuel && !off.before.equipped && off.after.hop > 0 && off.after.fuel === off.before.fuel && r.scene === "hub" && r.backend === backend && r.selected, JSON.stringify({ refill, off, mode: r.mode }));
    record(`${name} walking off a ledge leaves one rescue jump and toggling equipment cannot restore spent jumps`, ledge.ledge.hop > 0 && ledge.ledge.jumps === 1 && ledge.rescue.jumps === 2 && ledge.rescue.velocity > ledge.ledge.velocity && ledge.toggledAir.hop > 0 && !ledge.toggledAir.equipped && ledge.toggledAir.jumps === 2 && ledge.exhaustedAir.jumps === 2 && ledge.exhaustedAir.velocity < ledge.toggledAir.velocity, JSON.stringify(ledge));
  }
  for (const mode of ["trailing", "first-person"]) {
    await b.open(url); await untilReady(b);
    const recovery = await b.evaluate(`(${jetpackRecoveryProbe.toString()})({mode:${JSON.stringify(mode)},dt:${backend === "canvas2d" ? 1 / 20 : 1 / 120}})`), low = recovery;
    record(`jump and jetpack ${backend}: ${mode} landing below 20% restores fresh-press double jumping while the jetpack recovers`, !low.airborne.locked && low.airborne.hop > 0 && low.grounded.locked && low.grounded.hop === 0 && low.grounded.fuel < 0.2 && low.grounded.label === "JUMP!" && low.first.jumps === 1 && low.first.hop > 0 && !low.first.thrust && low.heldFirst.jumps === 1 && low.second.jumps === 2 && low.second.velocity > low.heldFirst.velocity && low.third.jumps === 2 && low.third.velocity < low.second.velocity && low.idleAir.hop > 0 && low.idleAir.fuel === low.first.fuel && !low.idleAir.flame, JSON.stringify(low));
    record(`jump and jetpack ${backend}: ${mode} J cannot bypass recovery and only ground recharge above 20% enables a fresh thrust press`, !low.off.equipped && low.off.locked && low.on.equipped && low.on.locked && low.on.fuel === low.off.fuel && low.landed.locked && low.landed.hop === 0 && Math.abs(low.atThreshold.fuel - 0.2) < 1e-7 && low.atThreshold.locked && low.atThreshold.label === "JUMP!" && !low.unlockedHeld.locked && low.unlockedHeld.fuel > 0.2 && low.unlockedHeld.hop === 0 && !low.unlockedHeld.thrust && low.unlockedHeld.label === "Blast off!" && low.resumed.thrust && low.resumed.hop > 0 && low.resumed.fuel < low.unlockedHeld.fuel && low.resumed.mode === mode, JSON.stringify(low));
    await b.open(url); await untilReady(b);
    const r = await b.evaluate(`(${jumpActionProbe.toString()})({mode:${JSON.stringify(mode)}})`);
    record(`jump and jetpack ${backend}: ${mode} stationary mirror actions work from every clear approach while airborne presses preserve jump or thrust`, r.rows.length >= 8 && r.rows.every((row) => row.toggled && row.jumps === 0 && row.velocity <= 0 && !row.thrust && !row.airborne.toggled && row.airborne.jumps === 2 && (row.jet ? row.airborne.thrust && row.airborne.fuelAfter < row.airborne.fuelBefore : row.airborne.velocity <= 0 && !row.airborne.thrust)) && r.rows.some((row) => row.jet) && r.rows.some((row) => !row.jet), JSON.stringify(r.rows));
    record(`jump and jetpack ${backend}: ${mode} a character above the mirror roof cannot activate the button below`, !r.roof.toggled && r.roof.height > 3, JSON.stringify(r.roof));
    await b.open(url); await untilReady(b);
    const underground = await b.evaluate(`(${jetpackUndergroundProbe.toString()})({mode:${JSON.stringify(mode)}})`), ramps = underground.rows.filter((row) => !row.basement), lower = underground.rows.filter((row) => row.basement);
    record(`jump and jetpack ${backend}: ${mode} walking into either HQ ramp removes its jetpack and J stays disabled throughout the descent`, ramps.length === 2 && ramps.every((row) => row.equipped && row.completed && row.firstRemoved && row.firstRemoved.feet > -2 && row.rejectCount > 10 && row.unexpected === 0 && row.nodeRemoved), JSON.stringify(ramps));
    record(`jump and jetpack ${backend}: ${mode} basement ramps and rooms prohibit jetpacks and returning outside restores J`, lower.length === 2 && lower.every((row) => row.removed && row.floor < -7) && underground.basement.removed && underground.basement.floor === -12.5 && underground.outside.equipped && underground.outside.floor >= 0 && underground.scene === "hub" && underground.mode === mode, JSON.stringify({ lower, basement: underground.basement, outside: underground.outside, mode: underground.mode }));
  }
  await b.open(url); await untilReady(b);
  const initial = await b.evaluate(`(() => { const B = window.__ooga; B.matrixCave.viewInside(false); return { y: B.camera.position.y, pressed: B.matrixGate.pressed, player: !!B.crew.player }; })()`);
  await b.send("Input.dispatchKeyEvent", { type: "keyDown", key: " ", text: " " });
  await untilPage(b, "B.matrixGate.pressed");
  const down = await b.evaluate(`(() => { const B = window.__ooga; return { y: B.camera.position.y, pressed: B.matrixGate.pressed, up: B.controls.read().up }; })()`);
  await b.send("Input.dispatchKeyEvent", { type: "keyDown", key: " ", text: " ", autoRepeat: true });
  const repeat = await b.evaluate(`({ pressed: window.__ooga.matrixGate.pressed, up: window.__ooga.controls.read().up })`);
  await b.send("Input.dispatchKeyEvent", { type: "keyUp", key: " " });
  await b.key(" ");
  const released = await b.evaluate(`({ pressed: window.__ooga.matrixGate.pressed, up: window.__ooga.controls.read().up })`);
  record(`jump and jetpack ${backend}: a real Space press claims a free-camera mirror action without vertical flight or repeat activation`, !initial.player && !initial.pressed && down.pressed && down.up === 0 && Math.abs(down.y - initial.y) < 0.01 && repeat.pressed && repeat.up === 0 && !released.pressed && released.up === 0, JSON.stringify({ initial, down, repeat, released }));
});

const jetpackRange = (backend) => withPage(`jetpack range ${backend}`, hubPage(src, backend === "canvas2d" ? "canvas2d=1" : ""), async (b) => {
  const url = hubPage(src, backend === "canvas2d" ? "canvas2d=1" : ""), dt = backend === "canvas2d" ? 1 / 20 : 1 / 120;
  for (const [i, mode] of ["trailing", "first-person"].entries()) {
    if (i) { await b.open(url); await untilReady(b); }
    const input = await b.evaluate(`(${jetpackInputFuelProbe.toString()})({mode:${JSON.stringify(mode)},dt:${dt}})`);
    const air = input.rows.filter((row) => row.airborne), ground = input.rows.find((row) => !row.airborne), directional = air.find((row) => row.input.join() === "w"), vertical = air.find((row) => row.input.join() === "Space"), combined = air.find((row) => row.input.join() === "Space,w");
    record(`jetpack range ${backend}: ${mode} airborne Space uses twice directional fuel, diagonals stay normalized, and simultaneous inputs add their fuel use`, air.length === 8 && air.every((row) => Math.abs(row.consumed - ((row.input.includes("Space") ? 0.5 / 8 : 0) + (row.input.some((key) => key !== "Space") ? 0.5 / 16 : 0))) < 1e-7 && row.released.fuel === row.after.fuel && row.released.y > 0) && air.filter((row) => row.input.some((key) => key !== "Space")).every((row) => Math.abs(row.movement - 3.2) < 0.01), JSON.stringify(air));
    record(`jetpack range ${backend}: ${mode} airborne direction, thrust and combined inputs emit proportional sparks and flame`, directional.sparks > 5 && vertical.sparks === directional.sparks * 2 && combined.sparks === directional.sparks * 3 && directional.peakFlame > 0.4 && directional.peakFlame <= 0.5 && vertical.peakFlame > 0.8 && vertical.peakFlame <= 1 && combined.peakFlame > 1.2 && combined.peakFlame <= 1.5 && [directional, vertical, combined].every((row) => row.after.flame && !row.released.flame) && !air[0].after.flame && air[0].sparks === 0, JSON.stringify({ directional, vertical, combined, idle: air[0] }));
    record(`jetpack range ${backend}: ${mode} walking on the ground uses no jetpack fuel or sparks and keeps refilling`, ground.before.y === 0 && ground.after.y === 0 && Math.abs(ground.movement - 3.875) < 0.01 && Math.abs(ground.after.fuel - ground.before.fuel - 0.125) < 1e-7 && !ground.after.flame && ground.sparks === 0, JSON.stringify(ground));
    for (const jet of [false, true]) {
      await b.open(url); await untilReady(b);
      const r = await b.evaluate(`(${abyssRespawnProbe.toString()})({mode:${JSON.stringify(mode)},jet:${jet},dt:${dt}})`), name = `jetpack range ${backend}: ${mode} ${jet ? "empty tank beyond the island" : "jump off the cliff"}`;
      record(`${name} starts grounded with its selected view already following the staged character`, r.initial.onLand && r.initial.hop === 0 && r.initial.velocity === 0 && r.initial.selected && r.initial.mode === mode && r.initialEyeGap < (mode === "first-person" ? 0.3 : 10), JSON.stringify({ initial: r.initial, gap: r.initialEyeGap }));
      record(`${name} crosses the edge and falls continuously into the abyss with its camera`, r.outsideAt > 0 && r.returnedAt > r.outsideAt + 2 && r.minHeight < -55 && r.fallSamples > 30 && r.accelerationError < 1e-6 && r.poses.length > 20 && r.poses.some((pose) => pose.eyeY < -40) && r.maxEyeGap < (mode === "first-person" ? 0.3 : 10) && r.violations.length === 0, JSON.stringify({ outsideAt: r.outsideAt, returnedAt: r.returnedAt, minHeight: r.minHeight, fallSamples: r.fallSamples, accelerationError: r.accelerationError, maxEyeGap: r.maxEyeGap, maxEyeGapAt: r.maxEyeGapAt, poses: r.poses.filter((_, i) => i % 10 === 0), violations: r.violations }));
      record(`${name} respawns at the banana pile with possession and perspective but without a carried jetpack`, !!r.respawn && r.respawn.onLand && r.respawn.radius > r.pileEdge + 0.2 && r.respawn.radius < r.pileEdge + 16 && r.respawn.hop === 0 && r.respawn.velocity === 0 && r.respawn.jumps === 0 && r.respawn.selected && r.respawn.mode === mode && r.respawn.scene === "hub" && !r.respawn.equipped && !r.respawn.owned && r.respawn.pickup && r.respawn.fuel === 1 && r.backend === backend, JSON.stringify({ before: r.preRespawn, respawn: r.respawn, pileEdge: r.pileEdge }));
      if (jet) record(`${name} a full combined-input tank reaches past the old height and perimeter limits before fuel runs out`, r.initial.equipped && r.initial.fuel === 1 && r.maxHeight > 30 && r.maxRadius > 60 && Math.abs(r.emptyAt - 16 / 3) < dt * 2 + 1e-6 && r.lastOutside.fuel === 0, JSON.stringify({ initial: r.initial, maxHeight: r.maxHeight, maxRadius: r.maxRadius, emptyAt: r.emptyAt, lastOutside: r.lastOutside }));
    }
  }
  await b.open(url); await untilReady(b);
  const under = await b.evaluate(`(${underIslandReleaseProbe.toString()})({dt:${dt}})`), event = under.releaseEvent;
  record(`jetpack range ${backend}: a falling character can move beneath the island footprint without an invisible wall or floor`, !under.initial.onLand && under.initial.y === -25 && under.initial.clear && under.initial.support === -120 && !!under.crossed && under.crossed.onLand && under.crossed.radius < 29 && under.crossed.y < -25 && under.crossed.clear && under.crossed.support === -120 && under.crossed.selected, JSON.stringify(under));
  record(`jetpack range ${backend}: releasing beneath the island preserves gravity and returns the character to its pile slot without reclaiming the view`, !!event && Math.abs(event.after.y - event.before.y) < 1e-7 && event.after.velocity === event.before.velocity && !event.after.selected && under.minHeight < -55 && under.fallSamples > 30 && under.accelerationError < 1e-6 && !!under.respawn && !under.respawn.selected && under.respawn.mode === "eye-level" && under.respawn.scene === "hub" && under.respawn.hop === 0 && under.respawn.jumps === 0 && under.slotDistance < 0.01 && Math.abs(under.respawn.fuel - event.after.fuel - dt / 4) < 1e-7, JSON.stringify(under));
});

const cloudSupport = (backend) => withPage(`cloud support ${backend}`, hubPage(src, backend === "canvas2d" ? "canvas2d=1" : ""), async (b) => {
  const url = hubPage(src, backend === "canvas2d" ? "canvas2d=1" : "");
  for (const [i, fixture] of ["trailing", "first-person"].flatMap((mode) => [1 / 20, 1 / 120].map((dt) => ({ mode, dt }))).entries()) {
    if (i) { await b.open(url); await untilReady(b); }
    const r = await b.evaluate(`(${cloudSupportProbe.toString()})(${JSON.stringify(fixture)})`), name = `cloud support ${backend}: ${fixture.mode} ${Math.round(1 / fixture.dt)} Hz`;
    const row = (kind) => r.rows.find((entry) => entry.kind === kind), landing = row("landing"), drift = row("drift"), refill = row("refill"), walk = row("walk-off"), upward = row("upward"), blocked = row("blocked-carry"), puff = row("higher-puff"), free = row("free-eye");
    record(`${name} lands and walks on the rendered cloud tops while drifting and refilling grounded fuel`, r.topFaces > 0 && r.checks > 100 && r.maximumStep <= 0.6 && r.backend === backend && r.failures.length === 0 && landing.grounded && landing.attached && landing.frames > 0 && Math.abs(landing.landed.y - landing.expected) < 1e-7 && drift.attached && drift.error < 1e-7 && drift.heightError < 1e-7 && refill.recovering && refill.unlocked && Math.abs(refill.fuel - refill.expected) < 1e-7 && walk.distance > 1 && walk.groundedSteps > 0 && walk.floorError < 1e-7 && walk.falling && walk.velocity <= 0, JSON.stringify(r));
    record(`${name} leaving, hiding, removing and wrapping clouds release support into normal gravity`, ["hidden", "removed", "wrapped", "airborne-hidden"].every((kind) => { const s = row(kind); return s.detached && s.horizontal === 0 && Math.abs(s.drop - s.expected) < 1e-7 && Math.abs(s.velocity - s.expectedVelocity) < 1e-7; }) && upward.highest > upward.top + 1 && upward.equipped && upward.fuel > 0 && upward.fuel < 1 && blocked.blocked && blocked.maximumCarry < 0.05 && blocked.fell && blocked.cloudMovement > 0.5 && puff.difference === 0.5 && !puff.raisedClear && puff.rise <= 1e-7 && puff.headClearance >= 0.099 && free.mode === "eye-level" && free.driftError < 1e-7 && free.falling && Math.abs(free.drop - free.expected) < 1e-7 && r.failures.length === 0, JSON.stringify(r));
    const transient = row("transient-overlap");
    record(`${name} crossing a briefly overlapping cloud preserves the airborne height and gravity`, transient.initiallyClear && transient.acquired && transient.detached && transient.firstHeight > transient.firstTop + 10 && Math.abs(transient.finalHeight - transient.expectedHeight) < 1e-7 && Math.abs(transient.velocity - transient.expectedVelocity) < 1e-7 && r.failures.length === 0, JSON.stringify(transient));
  }
});

const cloudLowSupport = (backend) => withPage(`cloud low support ${backend}`, hubPage(src, backend === "canvas2d" ? "canvas2d=1" : ""), async (b) => {
  const url = hubPage(src, backend === "canvas2d" ? "canvas2d=1" : "");
  for (const [i, dt] of [1 / 20, 1 / 120].entries()) {
    if (i) { await b.open(url); await untilReady(b); }
    const r = await b.evaluate(`(${cloudLowFreeEyeProbe.toString()})({dt:${dt}})`);
    record(`cloud low support ${backend}: ${Math.round(1 / dt)} Hz free eye drifts below the island floor and falls continuously when its cloud disappears`, r.backend === backend && Math.abs(r.initial.y + 2.9) < 1e-7 && Math.abs(r.supported.y + 2.9) < 1e-7 && r.grounded && r.driftError < 1e-7 && Math.abs(r.firstDrop - r.expectedDrop) < 1e-7 && r.minimum < -6 && r.maxRise === 0 && r.falling && r.failures.length === 0, JSON.stringify(r));
  }
});

const rampWindowContact = (backend) => withPage(`ramp window contact ${backend}`, hubPage(src, backend === "canvas2d" ? "canvas2d=1" : ""), async (b) => {
  const url = hubPage(src, backend === "canvas2d" ? "canvas2d=1" : "");
  for (const [i, fixture] of ["trailing", "first-person"].flatMap((mode) => [1 / 20, 1 / 120].map((dt) => ({ mode, dt }))).entries()) {
    if (i) { await b.open(url); await untilReady(b); }
    const r = await b.evaluate(`(${rampWindowContactProbe.toString()})(${JSON.stringify(fixture)})`), name = `ramp window contact ${backend}: ${fixture.mode} ${Math.round(1 / fixture.dt)} Hz`;
    record(`${name} all twelve ramp sills keep the full rendered body clear when step smoothing meets a low frame`, r.rows.length === 12 && r.rows.filter((row) => row.basement).length === 6 && r.samples > 100 && r.backend === backend && r.failures.length === 0 && r.rows.every((row) => row.fixture.requested > row.fixture.room + 0.02 && row.contact.lift > 0 && row.contact.head <= row.contact.roof + 1e-7 && Math.abs(row.contact.lift - row.contact.groundLift) < 1e-7), JSON.stringify(r));
    record(`${name} a fresh jump uses real headroom and every frame contact allows an immediate movement reversal`, r.rows.every((row) => row.rise > 0.02 && row.rise <= row.fixture.room + 1e-6 && row.landed.hop === 0 && row.landed.jumps === 0 && row.outwardDistance > 0.25 && row.reverseDistance > 0.25) && r.failures.length === 0, JSON.stringify(r));
    record(`${name} the curved ramp retains partial sill footing during sideways frame contact and immediate reversal`, r.lateral.outwardDistance > 0.5 && r.lateral.reverseDistance > 0.5 && r.failures.length === 0, JSON.stringify(r.lateral));
  }
});

const jetpackFall = (backend) => withPage(`jetpack fall ${backend}`, hubPage(src, backend === "canvas2d" ? "canvas2d=1" : ""), async (b) => {
  const url = hubPage(src, backend === "canvas2d" ? "canvas2d=1" : "");
  for (const [i, fixture] of ["trailing", "first-person"].flatMap((mode) => [1 / 20, 1 / 120].map((dt) => ({ mode, dt }))).entries()) {
    if (i) { await b.open(url); await untilReady(b); }
    const r = await b.evaluate(`(${jetpackFallProbe.toString()})(${JSON.stringify(fixture)})`), name = `jetpack fall ${backend}: ${fixture.mode} ${Math.round(1 / fixture.dt)} Hz`;
    record(`${name} full, partial and empty packs fall exactly like no pack with every direction held or released`, r.rows.length === 20 && r.frames === Math.round(2 / fixture.dt) && r.backend === backend && Number.isFinite(r.cloudCeiling) && r.rows.every((row) => row.y > r.cloudCeiling + 10 && row.maxVelocityError < 1e-7 && row.maxTrajectoryError < 1e-7 && row.maxAccelerationError < 1e-7 && row.velocity < -24 && row.thrustFrames === 0 && row.bodyFailures === 0 && row.selected && row.scene === "hub" && row.mode === fixture.mode && row.equipped === (row.fuel !== null)), JSON.stringify(r));
    record(`${name} falling consumes fuel only for held directional input`, r.rows.filter((row) => row.fuel !== null).every((row) => Math.abs(row.endFuel - Math.max(0, row.fuel - (row.direction ? 0.125 : 0))) < 1e-7), JSON.stringify(r.rows));
  }
});

const jetpackNotches = (backend) => withPage(`jetpack notches ${backend}`, hubPage(src, backend === "canvas2d" ? "canvas2d=1" : ""), async (b) => {
  for (const [i, mode] of ["trailing", "first-person"].entries()) {
    if (i) { await b.open(hubPage(src, backend === "canvas2d" ? "canvas2d=1" : "")); await untilReady(b); }
    const r = await b.evaluate(`(${jetpackNotchProbe.toString()})({mode:${JSON.stringify(mode)},dt:${backend === "canvas2d" ? 1 / 20 : 1 / 120}})`), name = `jetpack notches ${backend}: ${mode}`;
    record(`${name} holding only Space climbs past actual underside voxel steps and clears the island edge`, r.initial.equipped && r.initial.fuel === 1 && r.initial.onLand && r.contactFrames > 5 && r.ceilingSteps.length > 3 && !r.final.onLand && r.final.y > 1 && r.final.radius > r.initial.radius + 1 && r.maxStall < 0.5 && r.violations.length === 0, JSON.stringify(r));
    record(`${name} body and camera motion remain continuous and only held thrust consumes fuel`, r.maxBodyStep <= 10 * r.dt && r.maxEyeStep < 1 && r.violations.length === 0 && Math.abs(r.final.fuel - (r.initial.fuel - r.elapsed / 8)) < 1e-6 && r.coast.fuel === r.final.fuel && Math.hypot(r.coast.x - r.final.x, r.coast.z - r.final.z) < 1e-6 && r.coast.velocity < r.final.velocity, JSON.stringify({ elapsed: r.elapsed, bodyStep: r.maxBodyStep, eyeStep: r.maxEyeStep, final: r.final, coast: r.coast, violations: r.violations }));
  }
});

const convexCollision = () => withPage("convex collision", hubPage(src), async (b) => {
  const r = await b.evaluate(`(${convexProbe.toString()})()`);
  record("convex collision: cylinder contact and swept thin-wall collisions agree with independent box oracles", r.stationary === 20000 && r.swept === 5008 && r.contacts === 15 && r.failures.length === 0, JSON.stringify(r));
  record("convex collision: oblique fragments and tetrahedron interiors preserve exact contact boundaries", r.rotated === 10000 && r.tetrahedra === 5000 && r.failures.length === 0, JSON.stringify(r));
  record("convex collision: tilted ceilings clear grazing bodies and block penetrations and crossing sweeps", r.tilted === 10000 && r.ceiling === 4 && r.failures.length === 0, JSON.stringify(r));
});

const wallLanding = (backend) => withPage(`wall landing ${backend}`, hubPage(src, backend === "canvas2d" ? "canvas2d=1" : ""), async (b) => {
  for (const [i, fixture] of ["trailing", "first-person"].flatMap((mode) => [1 / 20, 1 / 120].map((dt) => ({ mode, dt }))).entries()) {
    if (i) { await b.open(hubPage(src, backend === "canvas2d" ? "canvas2d=1" : "")); await untilReady(b); }
    const r = await b.evaluate(`(${wallLandingProbe.toString()})(${JSON.stringify(fixture)})`), name = `wall landing ${backend}: ${fixture.mode} ${Math.round(1 / fixture.dt)} Hz`;
    record(`${name} falls and directional jet flight land on the full jagged cliff footprint without embedding in rock`, r.rows.length === 8 && r.checks > 100 && r.rows.every((row) => Math.abs(row.landed.y - row.support) < 1e-6 && row.fallFrames > 0 && row.fallFrames < 5 / fixture.dt && row.sweepFailures === 0) && r.rows.filter((row) => !row.jet).every((row) => row.support - row.center >= 0.5) && r.failures.length === 0, JSON.stringify(r));
    record(`${name} every wall-side landing can walk away in all four directions`, r.rows.every((row) => row.escapes.length === 4 && row.escapes.every((distance) => distance > 2)) && r.failures.length === 0 && r.backend === backend, JSON.stringify(r));
  }
});

const basementHole = (backend) => withPage(`basement hole ${backend}`, hubPage(src, backend === "canvas2d" ? "canvas2d=1" : ""), async (b) => {
  const geometry = await b.evaluate(`(${basementHoleGeometryProbe.toString()})()`);
  record(`basement hole ${backend}: the wide beveled opening reaches the underside while retaining the walking ring, room approaches, and upper HQ`, geometry.diameter === 8 && geometry.opening === 9 && geometry.ringWidth === 4.5 && geometry.shaftSamples > 4800 && geometry.ringSamples === 384 && geometry.rimSamples > 4000 && geometry.renderedRimCells >= 200 && geometry.rockSamples >= 600 && geometry.entranceSamples === 10 && geometry.maxRimStep <= 0.25 + 1e-7 && geometry.sweepClear && geometry.failures.length === 0, JSON.stringify(geometry));
  for (const [i, mode] of ["trailing", "first-person"].entries()) {
    if (i) { await b.open(hubPage(src, backend === "canvas2d" ? "canvas2d=1" : "")); await untilReady(b); }
    const r = await b.evaluate(`(${basementHoleMovementProbe.toString()})({mode:${JSON.stringify(mode)},dt:${backend === "canvas2d" ? 1 / 20 : 1 / 120}})`), name = `basement hole ${backend}: ${mode}`;
    record(`${name} walks off the rim and falls continuously through the shaft into the abyss`, r.enteredAt > 0 && r.bottomAt > r.enteredAt && r.minY < -55 && r.minY < r.bottom - 1 && r.groundedSteps === 2 && r.fallSamples > 20 && r.accelerationError < 1e-6 && r.maxEyeGap < (mode === "first-person" ? 0.3 : 10) && r.poses.some((pose) => pose.eyeY < r.bottom - 1) && r.failures.length === 0, JSON.stringify(r));
    record(`${name} returns to the banana pile with the same character and perspective`, !!r.respawn && r.respawn.selected && r.respawn.scene === "hub" && r.respawn.mode === mode && r.respawn.y === 0 && r.respawn.hop === 0 && Math.hypot(r.respawn.x, r.respawn.z) > r.pileRadius + 0.2 && Math.hypot(r.respawn.x, r.respawn.z) < r.pileRadius + 16 && r.backend === backend && r.failures.length === 0, JSON.stringify({ respawn: r.respawn, pileRadius: r.pileRadius, failures: r.failures }));
  }
  await b.open(hubPage(src, backend === "canvas2d" ? "canvas2d=1" : "")); await untilReady(b);
  const free = await b.evaluate(`(${basementHoleFreeEyeProbe.toString()})({dt:${backend === "canvas2d" ? 1 / 20 : 1 / 120}})`);
  record(`basement hole ${backend}: an unpossessed eye walks into the shaft and falls with continuous gravity and clear camera sweeps`, !free.initial.selected && free.initial.mode === "eye-level" && Math.abs(free.initial.y + 12.5) < 1e-6 && free.enteredAt > 0 && free.bottomAt > free.enteredAt && free.minY < -55 && free.fallSamples > 20 && free.accelerationError < 1e-6 && free.maxStep < Math.max(0.3, 35 * free.dt) && free.failures.length === 0, JSON.stringify(free));
  record(`basement hole ${backend}: free-eye abyss recovery returns to the pile without selecting a character or changing perspective`, !!free.respawn && !free.respawn.selected && free.respawn.mode === "eye-level" && free.respawn.scene === "hub" && Math.abs(free.respawn.y) < 1e-6 && !free.respawn.falling && Math.hypot(free.respawn.x, free.respawn.z) > free.pileRadius + 0.2 && Math.hypot(free.respawn.x, free.respawn.z) < free.pileRadius + 16 && free.failures.length === 0, JSON.stringify({ respawn: free.respawn, pileRadius: free.pileRadius, failures: free.failures }));
});

const basementShaftJetpack = (backend) => withPage(`basement shaft jetpack ${backend}`, hubPage(src, backend === "canvas2d" ? "canvas2d=1" : ""), async (b) => {
  for (const [i, mode] of ["trailing", "first-person"].entries()) {
    if (i) { await b.open(hubPage(src, backend === "canvas2d" ? "canvas2d=1" : "")); await untilReady(b); }
    const r = await b.evaluate(`(${basementHoleJetpackProbe.toString()})({mode:${JSON.stringify(mode)},dt:${backend === "canvas2d" ? 1 / 20 : 1 / 120}})`), name = `basement shaft jetpack ${backend}: ${mode}`;
    record(`${name} thrust rises from below the island through the shaft and stays equipped until clearing its lip`, r.initial.equipped && r.initial.y < r.bottom && r.enteredAt > 0 && r.clearedLipAt > r.enteredAt && r.removedAt > r.clearedLipAt && r.removal.x > r.mouthRadius + 0.3 && r.poses.some((p) => p.y > r.floor && p.equipped) && r.failures.length === 0, JSON.stringify(r));
    record(`${name} shaft toggling preserves fuel and landing on the basement ring removes the pack and prohibits reequipping`, !!r.toggled && !r.toggled.off.equipped && r.toggled.on.equipped && r.toggled.before.fuel === r.toggled.off.fuel && r.toggled.off.fuel === r.toggled.on.fuel && r.landed.x >= 6.5 && Math.abs(r.landed.y - r.floor) < 1e-6 && r.landed.hop === 0 && !r.rejected.equipped && r.landed.selected && r.landed.mode === mode && r.landed.scene === "hub" && r.backend === backend && r.maxEyeStep < 1.2 && r.maxEyeGap < (mode === "first-person" ? 0.5 : 7) && r.failures.length === 0, JSON.stringify(r));
  }
});

const jetpackDebugStartup = (backend) => withPage(`jetpack debug startup ${backend}`, hubPage(src, backend === "canvas2d" ? "canvas2d=1" : ""), async (b) => {
  const base = backend === "canvas2d" ? dist : src, snapshot = `(${jetpackStartupSnapshot.toString()})()`;
  for (const fixture of [
    { query: "jetpack=1", mode: "trailing", selected: "first", owned: true, equipped: true },
    { query: "jetpack=1&character=%20W-S-BITCOIN%20&firstperson=1", mode: "first-person", selected: "w-s-bitcoin", owned: true, equipped: true },
    ...["hq", "bsmt"].flatMap((view) => [
      { query: `jetpack=1&view=${view}`, mode: "orbit", selected: null, owned: true, equipped: false, underground: true },
      { query: `jetpack=1&view=${view}&firstperson=1`, mode: "eye-level", selected: null, owned: true, equipped: false, underground: true },
      { query: `jetpack=1&view=${view}&character=w-s-bitcoin&firstperson=1`, mode: "first-person", selected: "w-s-bitcoin", owned: true, equipped: false, underground: true }
    ]),
    { query: "jetpack=1&character=unknown-ooga", mode: "orbit", selected: null, owned: false, equipped: false },
    { query: "jetpack=0&character=w-s-bitcoin", mode: "trailing", selected: "w-s-bitcoin", owned: false, equipped: false }
  ]) {
    await b.open(hubPage(base, `${backend === "canvas2d" ? "canvas2d=1&" : ""}${fixture.query}`)); await untilReady(b);
    const r = await b.evaluate(snapshot), name = `jetpack debug startup ${backend}: ${fixture.query}`;
    record(`${name} preserves its requested selection, view and jetpack ownership`, r.selected === (fixture.selected === "first" ? r.firstWorking : fixture.selected) && r.mode === fixture.mode && r.equipped === fixture.equipped && r.owned === fixture.owned && r.hidden !== fixture.owned && r.disabled === !!fixture.underground && (!fixture.equipped || r.fuel === 1) && (!fixture.underground || r.eyeY < 0 && r.width === 52 && r.height > 0 && r.opacity === 0.5 && r.label === "Jetpack unavailable underground" && r.title === r.label) && r.scene === "hub" && r.backend === backend, JSON.stringify(r));
    if (fixture.underground) {
      await b.key("j"); await untilPage(b, "true");
      const keyed = await b.evaluate(snapshot);
      await b.click(keyed.x, keyed.y); await untilPage(b, "true");
      const clicked = await b.evaluate(snapshot);
      record(`${name} J and clicking the disabled icon cannot equip or change selection`, [keyed, clicked].every((s) => !s.equipped && s.owned && !s.hidden && s.disabled && s.selected === r.selected && s.mode === r.mode && s.eyeY < 0), JSON.stringify({ keyed, clicked }));
      await b.evaluate(`document.querySelector('nav[data-scene="hub"] [data-preset="pile"]').click()`);
      await untilPage(b, 'B.cameraCave.index === 0 && !document.getElementById("jetpack-hud").disabled');
      const surfaced = await b.evaluate(snapshot);
      if (!r.selected) {
        await b.evaluate(`(() => { const B = window.__ooga; B.pilot.possess(B.cavemen.get(${JSON.stringify(r.firstWorking)})); document.querySelector('nav[data-scene="hub"] [data-preset="pile"]').click(); })()`);
        await untilPage(b, 'B.cameraCave.index === 0 && !document.getElementById("jetpack-hud").disabled');
      }
      const ready = await b.evaluate(snapshot);
      await b.click(ready.x, ready.y); await untilPage(b, "!!B.pilot.player?.jet");
      const equipped = await b.evaluate(snapshot);
      record(`${name} returning above ground restores a usable owned icon`, surfaced.owned && !surfaced.hidden && !surfaced.disabled && !surfaced.equipped && surfaced.opacity === 1 && surfaced.selected === r.selected && surfaced.mode === r.mode && equipped.owned && equipped.equipped && !equipped.hidden && !equipped.disabled && equipped.fuel === 1 && equipped.selected === (r.selected || r.firstWorking), JSON.stringify({ surfaced, equipped }));
    }
  }
  await b.open(hubPage(src, `jetpack=1&firstperson=1${backend === "canvas2d" ? "&canvas2d=1" : ""}`)); await untilReady(b);
  const travel = async (id) => {
    await b.evaluate(`window.__ooga.go(${JSON.stringify(id)}); true`);
    return untilPage(b, `B.scene === ${JSON.stringify(id)} && !B.transitioning`, 15000);
  };
  const reachedLab = await travel("lab"), reachedHub = await travel("hub"), returned = await b.evaluate(snapshot);
  record(`jetpack debug startup ${backend}: returning to the hub keeps ownership compact without reapplying equipment or selection`, reachedLab && reachedHub && !returned.selected && !returned.equipped && returned.mode === "orbit" && !returned.hidden, JSON.stringify({ reachedLab, reachedHub, returned }));
  await b.open(hubPage(src, `scene=lab&jetpack=1&character=w-s-bitcoin&firstperson=1${backend === "canvas2d" ? "&canvas2d=1" : ""}`)); await untilReady(b);
  const routed = await b.evaluate(`({ scene: window.__ooga.scene, selected: !!window.__ooga.crew.player, equipped: [...window.__ooga.cavemen.values()].some((c) => !!c.jet), hidden: document.getElementById("jetpack-hud").hidden })`);
  record(`jetpack debug startup ${backend}: an explicit lab route ignores the hub equipment preload`, routed.scene === "lab" && !routed.selected && !routed.equipped && routed.hidden, JSON.stringify(routed));
  await b.open(`${src}?nosim=1&jetpack=1&character=w-s-bitcoin&firstperson=1${backend === "canvas2d" ? "&canvas2d=1" : ""}`);
  const started = Date.now(); let ignored = null;
  while (!ignored && Date.now() - started < 20000) {
    try { ignored = await b.evaluate(`(() => { const s = window.BL?.scenes.hub; if (!s?.debug || document.getElementById("curtain")) return null; return { exposed: !!window.__ooga, selected: !!s.debug.pilot.player, mode: s.debug.pilot.mode, hidden: document.getElementById("jetpack-hud").hidden }; })()`); } catch {}
    if (!ignored) await b.sleep(40);
  }
  record(`jetpack debug startup ${backend}: normal URLs ignore the debug equipment and character flags`, !!ignored && !ignored.exposed && !ignored.selected && ignored.mode === "orbit" && ignored.hidden, JSON.stringify(ignored));
});

const jetpackHud = (mobile = false, landscape = false) => withPage(`jetpack HUD ${landscape ? "landscape" : mobile ? "mobile" : "desktop"}`, hubPage(src), async (b) => {
  const r = await b.evaluate(`(${jetpackHudProbe.toString()})()`), shown = [r.full, r.low, r.reequipped];
  record(`jetpack HUD ${landscape ? "landscape" : mobile ? "mobile" : "desktop"}: a themed clickable left-side fuel meter fits without covering navigation or controls`, shown.every((s) => !s.hidden && s.fits && s.leftSide && !s.overlap && s.pointerEvents === "auto" && s.equipped === "true" && s.gauge === "visible" && s.width === 158) && r.full.role === "progressbar" && r.full.label === "Jetpack fuel" && r.full.min === 0 && r.full.max === 100 && r.full.value === 100, JSON.stringify(r));
  record(`jetpack HUD ${landscape ? "landscape" : mobile ? "mobile" : "desktop"}: pickup, removal and release retain a compact icon while worn fuel remains expanded`, r.hidden.hidden && [r.carried, r.removed, r.released].every((s) => !s.hidden && s.equipped === "false" && s.gauge === "hidden" && s.width === 52) && r.low.value === 14 && r.low.text === "14%" && r.low.fill === "scaleX(0.14)" && r.reequipped.value >= r.low.value && r.reequipped.value < 25, JSON.stringify(r));
  const hover = await b.evaluate(`(() => { const panel = document.getElementById("jetpack-hud"), r = panel.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2, base: getComputedStyle(panel).backgroundImage }; })()`);
  await b.mouse("mouseMoved", hover.x, hover.y);
  await b.sleep(80);
  hover.active = await b.evaluate(`getComputedStyle(document.getElementById("jetpack-hud")).backgroundImage`);
  record(`jetpack HUD ${landscape ? "landscape" : mobile ? "mobile" : "desktop"}: hover uses a subtle opaque gray highlight`, hover.active !== hover.base && hover.active.includes("rgb(80, 75, 71)") && !hover.active.includes("rgba"), JSON.stringify(hover));
  if (mobile) {
    const readMessages = () => b.evaluate(`(() => { const panel = document.getElementById("jetpack-hud").getBoundingClientRect(), stack = document.getElementById("message-stack"), read = (id) => { const node = document.getElementById(id), box = node.getBoundingClientRect(), style = getComputedStyle(node); return { hidden: node.hidden, box: box.toJSON(), opacity: style.opacity, color: style.color, border: style.borderTopWidth, background: style.backgroundImage, backgroundColor: style.backgroundColor, shadow: style.boxShadow, padding: style.paddingTop, textShadow: style.textShadow, whiteSpace: style.whiteSpace }; }; return { viewport: innerWidth, panel: panel.toJSON(), stack: stack.getBoundingClientRect().toJSON(), order: [...stack.children].map((node) => node.id), toast: read("toast"), hint: read("hint") }; })()`);
    await b.evaluate(`{ window.__ooga.hud.hint("Older white message", 400); window.setTimeout(() => window.__ooga.hud.toast("Newer yellow message"), 50); }`);
    await b.sleep(250);
    const stacked = await readMessages();
    await b.sleep(550);
    const shifted = await readMessages(), floating = (entry, state) => !entry.hidden && entry.opacity === "1" && entry.box.width <= 220 && entry.box.left === state.panel.left && entry.box.right <= state.viewport - 12 && entry.border === "0px" && entry.background === "none" && entry.backgroundColor === "rgba(0, 0, 0, 0)" && entry.shadow === "none" && entry.padding === "0px" && entry.textShadow !== "none" && entry.whiteSpace === "normal";
    record(`jetpack HUD ${landscape ? "landscape" : "mobile"}: yellow and white messages share a narrow borderless stack and newer messages move up as older ones fade`, stacked.order.join("|") === "hint|toast" && stacked.stack.width <= 220 && stacked.hint.box.top >= stacked.panel.bottom + 5 && stacked.hint.box.top <= stacked.panel.bottom + 10 && stacked.hint.box.bottom <= stacked.toast.box.top && floating(stacked.hint, stacked) && floating(stacked.toast, stacked) && stacked.hint.color !== stacked.toast.color && shifted.hint.hidden && floating(shifted.toast, shifted) && shifted.toast.box.top < stacked.toast.box.top && Math.abs(shifted.toast.box.top - stacked.hint.box.top) < 0.1, JSON.stringify({ stacked, shifted }));
    const target = await b.evaluate(`(() => { const B = window.__ooga, scene = window.BL.scenes.hub, cave = [...B.cavemen.values()].find((c) => c.state === "working"), mouth = B.mirrorCave.mouth; B.pilot.possess(cave); B.pilot.enterClose(); window.BL.scene.updateWorld(scene.root); const button = B.matrixGate.button.world; B.crew.relocatePlayer({ x: button[12] + Math.sin(mouth.ry) * 1.5, y: mouth.floorY, z: button[14] + Math.cos(mouth.ry) * 1.5 }, mouth.ry); if (!cave.jet) { window.dispatchEvent(new KeyboardEvent("keydown", { key: "j" })); window.dispatchEvent(new KeyboardEvent("keyup", { key: "j" })); } scene.update(1 / 60, B.renderOpts.matrix.time + 1 / 60); const rect = document.getElementById("act").getBoundingClientRect(); return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2, before: B.matrixGate.pressed, equipped: !!cave.jet }; })()`);
    await b.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: target.x, y: target.y, id: 1 }] });
    await untilPage(b, `B.matrixGate.pressed !== ${target.before}`);
    const held = await b.evaluate(`(() => { const B = window.__ooga, cave = B.crew.player; return { pressed: B.matrixGate.pressed, hop: cave.hop, thrust: cave.jet.thrust }; })()`);
    await b.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    await untilPage(b, "B.renderedFrames > 0");
    const released = await b.evaluate(`({ pressed: window.__ooga.matrixGate.pressed, up: window.__ooga.controls.read().up })`);
    record(`jetpack HUD ${landscape ? "landscape" : "mobile"}: touching the nearby action fires once without thrust, and releasing cannot trigger a duplicate click`, target.equipped && held.pressed !== target.before && held.hop === 0 && !held.thrust && released.pressed === held.pressed && released.up === 0, JSON.stringify({ target, held, released }));
  }
}, mobile ? { w: landscape ? 667 : 390, h: landscape ? 375 : 844, mobile: true } : {});

const navigationButtons = (backend) => withPage(`navigation buttons ${backend}`, hubPage(src, backend === "canvas2d" ? "canvas2d=1" : ""), async (b) => {
  const layout = await b.evaluate(`(${navigationButtonLayoutProbe.toString()})()`);
  record(`navigation buttons ${backend}: the toolbar contains PILE, LAB, MIRROR, HQ and BSMT in that order`, layout.labels.join("|") === "PILE|LAB|MIRROR|HQ|BSMT" && layout.buttons.map((button) => button.id).join("|") === "pile|lab|mirror|underground|basement", JSON.stringify({ labels: layout.labels, ids: layout.buttons.map((button) => button.id) }));
  const modes = ["orbit", "eye-level", "trailing", "first-person"];
  for (const [i, mode] of modes.entries()) {
    if (i) { await b.open(hubPage(src, backend === "canvas2d" ? "canvas2d=1" : "")); await untilReady(b); }
    const fixture = { mode, level: mode === "trailing" ? 1000000 : 300 };
    const r = await b.evaluate(`(${navigationButtonsProbe.toString()})(${JSON.stringify(fixture)})`), name = `navigation buttons ${backend}: ${mode}`;
    const arrives = (row) => row.near && row.faceDot > 0.94 && row.bodyDot > 0.94 && row.layer && !row.insideMirror && row.scene === "hub";
    const preserves = (row) => row.mode === mode && row.responsiveMode === mode && row.selected && row.equipment && row.blurred;
    record(`${name} all destinations preserve perspective and possession, and underground arrivals remove equipped jetpacks`, r.backend === backend && r.initial.mode === mode && r.initial.selected === (mode === "trailing" || mode === "first-person") && r.rows.every(preserves), JSON.stringify({ clicks: r.rows.length, initial: r.initial, failed: r.rows.filter((row) => !preserves(row)) }));
    record(`${name} arrives safely facing each destination with correct upper or lower ownership`, r.scene === "hub" && r.rows.every(arrives) && r.violations.length === 0, JSON.stringify({ level: r.level, samples: r.samples, violations: r.violations, failed: r.rows.filter((row) => !arrives(row)) }));
    const framed = (row) => !row.framing || (row.destination === "underground" ? row.framing.fire.visible && !row.framing.blocker : row.framing.center.visible && row.framing.sign.visible);
    record(`${name} frames cave entrances and signs and the unobscured headquarters hearth`, r.rows.every(framed), JSON.stringify({ failed: r.rows.filter((row) => !framed(row)).map((row) => ({ destination: row.destination, framing: row.framing, eye: row.eye, body: row.body })) }));
    const moves = r.rows.filter((row) => row.exercised);
    record(`${name} held movement works immediately after every arrival`, moves.every((row) => row.movement > 0.2), JSON.stringify({ minimum: Math.min(...moves.map((row) => row.movement)), failed: moves.filter((row) => row.movement <= 0.2) }));
    if (r.caveOrigin) record(`${name} leaves an actually entered Mirror Cave for headquarters and clears ownership on returning outside`, r.caveOrigin.entered && arrives(r.caveOrigin.underground) && arrives(r.caveOrigin.outside), JSON.stringify(r.caveOrigin));
    if (r.airborne) record(`${name} an airborne HQ arrival cancels motion and removes the prohibited jetpack`, r.airborne.before > 0.2 && r.airborne.after.hop === 0 && r.airborne.after.velocity === 0 && r.airborne.after.removed && r.airborne.after.oldNodeRemoved, JSON.stringify(r.airborne));
    const rendered = await b.evaluate("({ frame: window.__ooga.renderedFrames, time: performance.now() })");
    // The software fallback can take over 150 ms per draw alongside the soak
    // lanes. Keep the same 45-frame proof without imposing a WebGL time budget.
    const live = await untilPage(b, `B.renderedFrames >= ${rendered.frame + 45}`, backend === "canvas2d" ? 15000 : 6000);
    const after = await b.evaluate(`(() => { const B = window.__ooga, p = B.camera.position; return { scene: B.scene, mode: B.pilot.mode, frame: B.renderedFrames, milliseconds: performance.now() - ${rendered.time}, camera: [p.x, p.y, p.z], selected: !!B.pilot.player }; })()`);
    record(`${name} stays in the same live hub after rendering the arrival`, live && after.scene === "hub", JSON.stringify({ live, beforeFrame: rendered.frame, ...after }));
  }
});

const navigationButtonsMobile = () => withPage("navigation buttons mobile", hubPage(src, "canvas2d=1"), async (b) => {
  const layout = await b.evaluate(`(${navigationButtonLayoutProbe.toString()})()`), ids = ["pile", "lab", "mirror", "underground", "basement"];
  record("navigation buttons mobile: the matching title and clock, subtitle, banana count and all five controls remain clear and on one row", layout.labels.join("|") === "PILE|LAB|MIRROR|HQ|BSMT" && layout.buttons.map((button) => button.id).join("|") === ids.join("|") && layout.resetCount === 0 && !layout.overlap && layout.singleRow && layout.brandClear && !layout.clockCentered && layout.clockClear && layout.bananaClear && layout.bananaBelowClock && layout.bananaCount === layout.bananaLevel.toLocaleString("en-US") && layout.titleSize === layout.clockSize && layout.subtitleVisible && layout.bananaSize === layout.subtitleSize && layout.documentWidth <= layout.viewport && layout.buttons.length === ids.length && ids.every((id) => layout.buttons.some((button) => button.id === id && button.hittable && button.visible && button.width >= 44 && button.height >= 32 && button.x >= 0 && button.x + button.width <= layout.viewport)), JSON.stringify(layout));
  const tapped = [];
  for (const id of ["mirror", "underground", "basement", "lab", "pile"]) {
    const button = await b.evaluate(`(() => { const nav = document.querySelector('nav[data-scene="hub"]'), button = nav.querySelector('[data-preset="${id}"]'); nav.scrollLeft = button.offsetLeft - (nav.clientWidth - button.offsetWidth) / 2; const r = button.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height }; })()`);
    if (!button) continue;
    await b.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: button.x + button.width / 2, y: button.y + button.height / 2 }] });
    await b.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    await untilPage(b, id === "basement" ? "B.cameraCave.index !== 0 && B.camera.position.y < B.headquarters.basement.ceiling" : id === "underground" ? "B.cameraCave.index !== 0 && B.camera.position.y < 0 && B.camera.position.y >= B.headquarters.floor" : "B.cameraCave.index === 0 && B.camera.position.y >= 0");
    tapped.push(await b.evaluate(`(() => { const B = window.__ooga; return { id: ${JSON.stringify(id)}, scene: B.scene, mode: B.pilot.mode, selected: !!B.pilot.player, y: B.camera.position.y, camera: B.cameraCave.index, hqFloor: B.island.headquarters.floor, basementCeiling: B.headquarters.basement.ceiling }; })()`));
  }
  record("navigation buttons mobile: real taps navigate to HQ, basement and back without changing orbit mode", tapped.length === ids.length && tapped.every((row) => row.scene === "hub" && row.mode === "orbit" && !row.selected && (row.id === "underground" ? row.y < 0 && row.y >= row.hqFloor && row.camera !== 0 : row.id === "basement" ? row.y < row.basementCeiling && row.camera !== 0 : row.y >= 0 && row.camera === 0)), JSON.stringify(tapped));
  await b.send("Emulation.setDeviceMetricsOverride", { width: 240, height: 640, deviceScaleFactor: 1, mobile: true });
  await untilPage(b, "B.renderer.size.width === 240");
  const narrowStart = await b.evaluate(`(${navigationButtonLayoutProbe.toString()})()`);
  await b.evaluate(`{ const nav = document.querySelector('nav[data-scene="hub"]'); nav.scrollLeft = nav.scrollWidth; }`);
  const narrowEnd = await b.evaluate(`(${navigationButtonLayoutProbe.toString()})()`), last = narrowEnd.buttons[narrowEnd.buttons.length - 1];
  record("navigation buttons mobile: very narrow screens keep one horizontal row that scrolls through BSMT", narrowStart.singleRow && narrowStart.scrollable && narrowStart.scrollMax > 0 && narrowStart.scrollLeft === 0 && narrowEnd.singleRow && narrowEnd.scrollLeft > 0 && Math.abs(narrowEnd.scrollLeft - narrowEnd.scrollMax) < 1 && last.x >= 0 && last.x + last.width <= narrowEnd.viewport && last.hittable && narrowEnd.documentWidth <= narrowEnd.viewport, JSON.stringify({ start: narrowStart, end: narrowEnd }));
}, { w: 390, h: 844, mobile: true });

const headquarters = () => withPage("headquarters", hubPage(src), async (b) => {
  const oldThemes = [0, 1, 2, 0, 1, 2, 0];
  await b.evaluate(`localStorage.setItem("ooga-headquarters-walls-v1", ${JSON.stringify(JSON.stringify(oldThemes))})`);
  await b.open(hubPage(src));
  await untilReady(b);
  const built = await b.evaluate(`(() => { const B = window.__ooga, H = B.headquarters, column = {}; B.island.cavityAt(0, 0, column, 9); const slots = window.BL.caves.slots.filter((s) => s.status === "headquarters"); return { scene: B.scene, separateScene: !!window.BL.scenes.headquarters, rooms: H.rooms.map((r) => ({ index: r.index, angle: r.angle, radius: r.radius, floor: r.floor, ceiling: r.ceiling, window: r.window, nook: !!r.nook, resident: r.resident ?? null, approach: r.approach, x: r.x, z: r.z, width: r.width, depth: r.depth, entrance: r.entrance, back: r.back })), slots: slots.map((s) => ({ id: s.id, scene: s.scene, name: s.name })), floor: H.openFloor, column, caveBytes: B.island.cavityBytes }; })()`);
  const sleepers = await b.evaluate(`(() => { const B = window.__ooga, entries = [...B.cavemen.values()], overrides = entries.map((cave) => cave.override); try { for (const cave of entries) cave.override = "sleeping"; B.refreshStates(true); const sleeping = entries.map((cave) => ({ state: cave.state, visible: cave.root.visible, reserved: B.headquarters.mattresses.includes(cave.bedroll) && cave.bedroll.sleeper === cave, mode: cave.bedTravel.mode, x: cave.root.position.x, z: cave.root.position.z })), unique = new Set(entries.map((cave) => cave.bedroll)).size; for (const cave of entries) cave.override = "working"; B.refreshStates(true); return { sleeping, unique, released: B.headquarters.mattresses.every((bed) => !bed.sleeper), awake: entries.map((cave, i) => ({ state: cave.state, visible: cave.root.visible, claimedBed: !!cave.bedroll, movement: Math.hypot(cave.root.position.x - sleeping[i].x, cave.root.position.z - sleeping[i].z) })) }; } finally { entries.forEach((cave, i) => { cave.override = overrides[i]; }); B.refreshStates(true); } })()`);
  record("headquarters: the lower floor remains embedded in the hub with no scene or cutscene boundary", built.scene === "hub" && !built.separateScene && built.slots.length === 2 && built.slots.map((s) => s.id).sort().join("|") === "c5|c730" && built.slots.every((s) => s.scene === null && s.name === "Headquarters") && built.column.caveIndex === 9 && built.column.floor === -7 && Math.abs(built.column.ceiling + 2.8) < 0.06 && built.caveBytes <= 256 * 256 * 6, JSON.stringify({ scene: built.scene, slots: built.slots, floor: built.floor, column: built.column, caveBytes: built.caveBytes }));
  const rearRooms = built.rooms.filter((room) => !room.nook), nooks = built.rooms.filter((room) => room.nook);
  const bare = await b.evaluate(`(${headquartersBareRoomProbe.toString()})()`);
  const apronCameras = await b.evaluate(`(${headquartersApronCameraProbe.toString()})()`);
  record("headquarters: free orbit retains its exact requested pose at every frontage station, including rock above lower rooms", apronCameras.length === 24 && apronCameras.some((p) => p.lowerCeiling !== null && p.lowerCeiling < 0) && apronCameras.some((p) => p.y < p.ground) && apronCameras.every((p) => p.index === 0 && (p.along !== 1.6 || p.ground === 0) && p.orbitError < 1e-6), JSON.stringify(apronCameras));
  record("headquarters: all fifteen rooms keep their mattress and hash sign without extra furnishings, and the basement common area stays empty", bare.mattresses === 15 && bare.furnishedRooms === 15 && bare.noBeds && bare.noWallAPI && bare.noNumberAPI && bare.noDecorModels && bare.numberNodes === 0 && bare.extras.length === 0 && bare.basementExtras === 0 && bare.hits.length === 45 && bare.hits.every((kind) => !kind || !kind.startsWith("headquarters-")), JSON.stringify(bare));
  record("headquarters: the upper floor retains its five rear rooms and two panorama nooks after replacing the four entrance-side rooms", built.floor.radius === 14 && built.rooms.length === 7 && rearRooms.length === 5 && rearRooms.filter((room) => room.radius >= 23).length === 5 && nooks.length === 2 && built.rooms.every((room, i) => room.index === [2, 3, 4, 5, 6, 9, 10][i] && room.floor === -7 && (room.nook ? room.width === 7 && room.depth === 6 : room.width === 5 && room.depth === 5) && room.radius >= 19 && Math.abs(Math.hypot(room.x, room.z) - room.radius) < 1e-6 && room.resident === null) && rearRooms.every((room) => Math.abs(Math.atan2(room.x, -room.z) - (room.angle > Math.PI ? room.angle - 2 * Math.PI : room.angle)) < 1e-6) && nooks[0].x < 0 && nooks[1].x > 0 && nooks.every((room) => room.z < -10 && room.window && Math.abs((room.x * Math.sin(room.angle) - room.z * Math.cos(room.angle)) / room.radius) < 0.25), JSON.stringify(built.rooms));
  record("headquarters: sleepers reserve separate mattresses and waking releases every reservation without teleporting", sleepers.sleeping.length === 8 && sleepers.unique === 8 && sleepers.sleeping.every((sleeper) => sleeper.state === "sleeping" && sleeper.visible && sleeper.reserved && ["walk", "lie", "rest"].includes(sleeper.mode)) && sleepers.released && sleepers.awake.length === 8 && sleepers.awake.every((cave) => cave.state === "working" && cave.visible && !cave.claimedBed && cave.movement < 1e-7), JSON.stringify(sleepers));
  const routes = await b.evaluate(`(() => { const B = window.__ooga, H = B.island.headquarters, samples = B.headquarters.ramps.map((r) => { const heights = [], cavities = [], radii = [], m = B.mouths.find((mouth) => mouth.id === r.id); for (let i = 0; i <= 256; i++) { const t = i / 256 * (r.samples.length - 1), n = Math.min(r.samples.length - 2, Math.floor(t)), k = t - n, a = r.samples[n], q = r.samples[n + 1], x = a.x + (q.x - a.x) * k, z = a.z + (q.z - a.z) * k, c = {}, h = B.island.heightAt(x, z); heights.push(h); cavities.push(B.island.cavityAt(x, z, c, 9) && c.caveIndex === 9 && Math.abs(c.floor - h) < 1e-6); radii.push(Math.hypot(x, z)); } let length = 0, maxDrop = 0, maxDropAt = 0, uphill = 0, plateaus = 0; for (let i = 1; i < heights.length; i++) { const drop = heights[i - 1] - heights[i]; if (drop > maxDrop) { maxDrop = drop; maxDropAt = i / 256; } if (drop < -1e-5) uphill++; if (heights[i] > -6.9 && drop <= 1e-6) plateaus++; } for (let i = 1; i < r.samples.length; i++) length += Math.hypot(r.samples[i].x - r.samples[i - 1].x, r.samples[i].z - r.samples[i - 1].z); return { id: r.id, first: heights[0], next: heights[1], last: heights.at(-1), maxDrop, maxDropAt, uphill, plateaus, fractional: heights.filter((h) => Math.abs(h / B.island.unit - Math.round(h / B.island.unit)) > 0.01).length, cavities: cavities.every(Boolean), entranceGap: Math.hypot(r.from.x - m.x - Math.sin(m.ry) * 0.5, r.from.z - m.z - Math.cos(m.ry) * 0.5), length, direct: Math.hypot(r.to.x - r.from.x, r.to.z - r.from.z), angle: Math.abs(r.endAngle - r.startAngle), outer: Math.max(...radii), inner: radii.at(-1) }; }); const fronts = H.fronts.map((front) => { const along = [-4, -3, -2, -1, 0, 1, 2, 3, 4].map((d) => B.island.isPath(front.center.x + front.tangent.x * d, front.center.z + front.tangent.z * d)); const nx = front.tangent.z, nz = -front.tangent.x; return { id: front.id, along, into: [1.25, 2, 3].map((d) => B.island.isPath(front.center.x + nx * d, front.center.z + nz * d)) }; }); const circle = []; for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2, c = {}; circle.push(B.island.cavityAt(Math.sin(a) * (H.room.radius - 1), -Math.cos(a) * (H.room.radius - 1), c, 9) && c.caveIndex === 9 && c.floor === -7); } const rear = H.rooms.filter((room) => !room.nook), rooms = H.rooms.map((room) => { const sx = Math.sin(room.angle), sz = -Math.cos(room.angle), c = {}, corridorErrors = [], galleryErrors = [], radius = Math.hypot(room.approach.x, room.approach.z), end = { x: room.x + sx * (room.depth / 2 - 0.5), z: room.z + sz * (room.depth / 2 - 0.5) }, length = Math.hypot(end.x - room.approach.x, end.z - room.approach.z), count = Math.ceil(length / 0.25); for (let i = 0; i <= count; i++) { const x = room.approach.x + (end.x - room.approach.x) * i / count, z = room.approach.z + (end.z - room.approach.z) * i / count; const floor = room.floor; if (!B.island.cavityAt(x, z, c, 9, floor + 1.1) || Math.abs(c.floor - floor) > 0.05) corridorErrors.push([x, z, c.floor, floor]); } for (let r = H.room.radius - 0.75; r <= radius; r += 0.25) { const x = room.approach.x * r / radius, z = room.approach.z * r / radius; if (!B.island.cavityAt(x, z, c, 9) || c.floor !== -7) galleryErrors.push([x, z, c.floor]); } const floorErrors = []; let floorSamples = 0; for (let along = -room.depth / 2 + 0.5; along <= room.depth / 2 - 0.5 + 1e-6; along += 0.5) for (let across = -room.width / 2 + 0.5; across <= room.width / 2 - 0.5 + 1e-6; across += 0.5) { const x = room.x + sx * along + Math.cos(room.angle) * across, z = room.z + sz * along + Math.sin(room.angle) * across; floorSamples++; if (!B.island.cavityAt(x, z, c, 9, room.floor + 1.1) || c.floor !== room.floor) floorErrors.push([x, z, c.floor]); } let wall = true, divider = null; const walls = []; if (room.nook) { for (const [across, along] of [[-room.width / 2 - 0.5, 1], [room.width / 2 + 0.5, 1], [0, room.depth / 2 + 0.5]]) { const x = room.x + sx * along + Math.cos(room.angle) * across, z = room.z + sz * along + Math.sin(room.angle) * across; let y = H.floor + (across ? 0.5 : 1.5); for (const w of H.windows) for (const f of w.flare.frusta) { const alongWindow = x * Math.sin(f.angle) - z * Math.cos(f.angle), acrossWindow = Math.abs(x * Math.cos(f.angle) + z * Math.sin(f.angle)); if (alongWindow >= f.start && alongWindow <= f.end && acrossWindow <= f.half + f.horizontal * (alongWindow - f.start) && y >= w.sill - f.vertical * (alongWindow - f.start) && y <= w.sill + w.height + f.vertical * (alongWindow - f.start)) y = w.sill - f.vertical * (alongWindow - f.start) - 0.1; } const outsideFlare = H.windows.every((w) => w.flare.frusta.every((f) => f.planes.some((p) => p[0] * x + p[1] * y + p[2] * z > p[3] + 1e-7))); walls.push({ x, y, z, outsideFlare, solid: B.island.solidAt(x, y, z) }); } } else { const position = rear.indexOf(room), neighbor = rear[position === rear.length - 1 ? position - 1 : position + 1], angle = (room.angle + neighbor.angle) / 2, radius = Math.hypot(room.x, room.z), x = Math.sin(angle) * radius, z = -Math.cos(angle) * radius; divider = {}; B.island.cavityAt(x, z, divider, 9); wall = B.island.solidAt(x, room.floor + 1.5, z); } return { index: room.index, nook: !!room.nook, floorSamples, floorErrors, connected: corridorErrors.length === 0 && galleryErrors.length === 0, corridorErrors, galleryErrors, wall, walls, divider }; }); const upper = B.mouths.filter((m) => ["c9", "c11", "c1"].includes(m.id)).map((m) => { const c = {}; return { id: m.id, open: B.island.cavityAt(m.inside.x, m.inside.z, c), floor: c.floor, caveIndex: c.caveIndex }; }); const g = B.island.geometry, rampFaces = g.faces.filter((f) => f.headquartersRamp), slopedFaces = rampFaces.filter((f) => { const ys = f.i.map((i) => g.verts[i * 3 + 1]); return Math.max(...ys) - Math.min(...ys) > 0.0001; }).length; return { samples, fronts, circle, rooms, upper, rampFaces: rampFaces.length, slopedFaces }; })()`);
  record("headquarters: both smooth ramps begin descending at the cave threshold and curve along the island shell", routes.samples.length === 2 && routes.samples.every((r) => Math.abs(r.first) < 0.001 && r.next < -0.001 && r.last === -7 && r.cavities && r.entranceGap < 0.3 && r.maxDrop < 0.1 && r.uphill === 0 && r.plateaus === 0 && r.fractional > 128 && r.angle > 1 && r.length > r.direct * 1.05 && r.outer > 21 && r.inner < built.floor.radius) && routes.slopedFaces > 100, JSON.stringify({ ramps: routes.samples, faces: routes.rampFaces, slopedFaces: routes.slopedFaces }));
  record("headquarters: the path runs across each entrance face without turning into the cave or down its ramp", routes.fronts.every((front) => front.along.every(Boolean) && front.into.every((cell) => !cell)), JSON.stringify(routes.fronts));
  record("headquarters: the lower chamber has a continuous circular walkable floor", routes.circle.every(Boolean), JSON.stringify(routes.circle));
  record("headquarters: all seven upper caves retain flat floors, connected entrances and their enclosing stone", routes.rooms.length === 7 && routes.rooms.every((r) => r.connected && (r.nook ? r.walls.length === 3 && r.walls.every((wall) => wall.solid && wall.outsideFlare) : r.wall) && r.floorSamples >= (r.nook ? 143 : 81) && r.floorErrors.length === 0), JSON.stringify(routes.rooms));
  const basement = await b.evaluate(`(${headquartersBasementProbe.toString()})()`);
  record("headquarters: a second common floor uses the minimum depth that preserves full height and rock beneath the upper HQ", basement.height === 4.25 && basement.radius === 9 && basement.floor < -11 && basement.upperFloor === -7 && basement.upperSupport === -7 && basement.ceiling <= basement.requiredCeiling + 1e-7 && basement.requiredCeiling - basement.ceiling < basement.unit + 1e-7 && basement.rockCover >= 0.75, JSON.stringify(basement));
  record("headquarters: eight unclaimed basement rooms have flat floors, clear connected corridors, exterior windows and solid separating rock", basement.rooms.length === 8 && basement.rooms.every((room, i) => room.index === i && room.basement && room.floor === basement.floor && room.ceiling === basement.ceiling && room.radius === 18 && room.width === 5 && room.depth === 5 && room.floorSamples >= 289 && room.corridorSamples > 40 && room.walls.every(Boolean) && room.windowFloor === basement.floor && room.resident === null) && basement.commonSamples > 500 && basement.rockSamples > 10000 && basement.failures.length === 0, JSON.stringify({ rooms: basement.rooms, commonSamples: basement.commonSamples, rockSamples: basement.rockSamples, failures: basement.failures }));
  record("headquarters: every rendered basement floor cell has full rock footing and every stacked ramp column preserves its ceiling cover", basement.floorCells > 5000 && basement.renderCells > 500 && basement.footingSamples === basement.floorCells * 3 && basement.stackedCells > 1000 && basement.failures.length === 0, JSON.stringify({ floorCells: basement.floorCells, renderCells: basement.renderCells, footingSamples: basement.footingSamples, stackedCells: basement.stackedCells, failures: basement.failures }));
  record("headquarters: the two former second-nearest entrances descend gently into the same basement circulation area", basement.ramps.map((ramp) => ramp.index).join("|") === "1|7" && basement.ramps.every((ramp) => ramp.first === -7 && ramp.last === basement.floor && ramp.width >= 3.5 && ramp.endRadius < basement.radius && ramp.maxSlope < 1.05 && ramp.maxStep < 0.3 && ramp.smoothSamples > 20 && ramp.samples > 50), JSON.stringify(basement.ramps));
  const landings = await b.evaluate(`(() => { const B = window.__ooga, H = B.headquarters, fixtures = H.lights; return H.ramps.map((ramp) => { const points = ramp.samples.slice(-12).map((p) => ({ x: p.x, z: p.z })), radius = Math.hypot(ramp.to.x, ramp.to.z); for (let i = 1; i <= 16; i++) { const k = 1 - (1 - 4 / radius) * i / 16; points.push({ x: ramp.to.x * k, z: ramp.to.z * k }); } const c = {}; let roomClearance = Infinity, fixtureClearance = Infinity; for (const p of points) { for (const room of H.rooms) roomClearance = Math.min(roomClearance, Math.hypot(p.x - room.x, p.z - room.z) - Math.hypot(room.width, room.depth) / 2); for (const fixture of fixtures) fixtureClearance = Math.min(fixtureClearance, Math.hypot(p.x - fixture.node.position.x, p.z - fixture.node.position.z)); } return { id: ramp.id, floor: points.every((p) => B.island.cavityAt(p.x, p.z, c, 9) && c.floor === -7), roomClearance, fixtureClearance }; }); })()`);
  record("headquarters: both ramp bottoms open onto clear shared floor before the character rooms", landings.length === 2 && landings.every((landing) => landing.floor && landing.roomClearance > 1 && landing.fixtureClearance > 1.5), JSON.stringify(landings));
  record("headquarters: the rooms below preserve the floors of the existing upper caves", routes.upper.length === 3 && routes.upper.every((r) => r.open && r.floor === 0 && r.caveIndex !== 9), JSON.stringify(routes.upper));
  const windows = await b.evaluate(`(${headquartersWindowProbe.toString()})()`);
  record("headquarters: numerous wide windows are real openings through the outer shell with raised stone sills", windows.length === 28 && windows.every((w) => w.width >= 2 && w.height >= 1 && w.sill > w.floor + 0.7 && w.clear && w.meshClear && w.stoneBelow && w.outerRadius >= 30), JSON.stringify(windows));
  const rampWindows = windows.filter((window) => window.kind === "ramp" && window.basement);
  record("headquarters: both outward basement ramps have three windows looking outside with no upper-ramp or neighboring-room openings", rampWindows.length === 6 && [1, 7].every((index) => rampWindows.filter((window) => window.rampIndex === index).length === 3) && rampWindows.every((window) => window.onRamp && !window.rampOpening && !window.neighborOpening && window.clear && window.meshClear), JSON.stringify(rampWindows));
  const roomWindows = windows.filter((window) => window.kind === "room"), panorama = windows.filter((window) => window.kind === "panorama");
  record("headquarters: room windows look outside without opening into main ramps or neighboring rooms", roomWindows.length === 15 && roomWindows.filter((window) => window.basement).length === 8 && built.rooms.every((room) => roomWindows.some((window) => !window.basement && window.roomIndex === room.index) === room.window) && built.rooms.every((room) => room.window) && roomWindows.every((window) => !window.rampOpening && !window.neighborOpening), JSON.stringify(roomWindows));
  record("headquarters: one continuous curved common-room window spans between the ramp landings", panorama.length === 1 && panorama[0].arc > 1 && panorama[0].width > 20 && panorama[0].apertures > 40 && panorama[0].betweenLandings && panorama[0].gallery && !panorama[0].rampOpening && panorama[0].clear && panorama[0].meshClear, JSON.stringify(panorama));
  const approach = await b.evaluate(`(() => { const B = window.__ooga, m = B.mouths.find((mouth) => mouth.id === "c5"), cave = [...B.cavemen.values()].find((entry) => entry.state === "working" && !entry.walk && !entry.build); B.pilot.release(true); cave.root.position.x = m.apron.x; cave.root.position.z = m.apron.z; cave.root.position.y = cave.baseY + B.island.surfaceAt(m.apron.x, m.apron.z); cave.hop = cave.hopV = 0; cave.root.rotation.y = Math.atan2(m.x - m.apron.x, m.z - m.apron.z); B.pilot.possess(cave); B.pilot.navigate({ position: { x: m.apron.x, y: B.island.surfaceAt(m.apron.x, m.apron.z), z: m.apron.z }, yaw: cave.root.rotation.y + Math.PI, pitch: 0.25, dist: 3.5 }); const p = B.camera.position, o = B.pilot.orbit, pitch = B.pilot.viewPitch, cp = Math.cos(pitch), body = cave.root.position, feet = body.y - cave.baseY; return { mode: B.pilot.mode, cameraCave: B.cameraCave.index, eye: [p.x, p.y, p.z], horizontalGap: Math.hypot(p.x - body.x, p.z - body.z), orbitError: Math.hypot(p.x - o.tx - Math.sin(o.yaw) * cp * o.dist, p.y - o.ty - Math.sin(pitch) * o.dist, p.z - o.tz - Math.cos(o.yaw) * cp * o.dist), bodyClear: B.island.clearAt(body.x, feet + 0.3, body.z, 0.3, cave.bodyHeight - 0.3), supportError: Math.abs(feet - B.island.supportAt(body.x, body.z, feet, 0.6, -120, 0.3)), floor: B.island.surfaceAt(p.x, p.z), clear: B.island.clearAt(p.x, p.y - 0.3, p.z, 0.3, 0.6) }; })()`);
  record("headquarters: the staged ramp approach keeps the exact trailing orbit while the character has a clear supported body", approach.mode === "trailing" && approach.cameraCave === 0 && Math.abs(approach.horizontalGap - 3.5) < 1e-6 && approach.orbitError < 1e-6 && approach.bodyClear && approach.supportError < 1e-6, JSON.stringify(approach));
  await b.send("Input.dispatchKeyEvent", { type: "keyDown", key: "w", text: "w" });
  await b.evaluate(`new Promise((resolve) => { const B = window.__ooga, r = B.headquarters.ramps.find((ramp) => ramp.id === "c5"), start = performance.now(), tick = () => { const p = B.crew.player.root.position; if (Math.hypot(p.x - r.from.x, p.z - r.from.z) < 1.5 || performance.now() - start > 4000) resolve(); else requestAnimationFrame(tick); }; tick(); })`);
  await b.send("Input.dispatchKeyEvent", { type: "keyUp", key: "w" });
  await b.send("Input.dispatchKeyEvent", { type: "keyDown", key: "w", text: "w" });
  const walked = await b.evaluate(`new Promise((resolve) => { const B = window.__ooga, r = B.headquarters.ramps.find((ramp) => ramp.id === "c5"), o = B.pilot.orbit, start = performance.now(); let target = 3, maxGroundError = 0, maxGroundAt = null, traceTarget = -1; const trace = []; const tick = () => { const cave = B.crew.player, p = cave.root.position, q = r.samples[target]; if (target !== traceTarget && target % 12 === 3) { traceTarget = target; const eye = B.camera.position; trace.push({ target, body: [p.x, p.y - cave.baseY, p.z], eye: [eye.x, eye.y, eye.z], playerCave: B.cameraCave.playerIndex, cameraCave: B.cameraCave.index, eyeClear: B.island.clearAt(eye.x, eye.y - 0.3, eye.z, 0.3, 0.6), mode: B.pilot.mode }); } const error = Math.abs(p.y - cave.baseY - B.island.heightAt(p.x, p.z)); if (error > maxGroundError) { maxGroundError = error; maxGroundAt = [p.x, p.y - cave.baseY, p.z, B.island.heightAt(p.x, p.z), B.cameraCave.playerIndex]; } if (q) { if (Math.hypot(p.x - q.x, p.z - q.z) < 0.65 && target < r.samples.length - 1) target = Math.min(r.samples.length - 1, target + 3); const next = r.samples[target], heading = Math.atan2(next.x - p.x, next.z - p.z); o.yaw = o.tYaw = heading + Math.PI; } if (target === r.samples.length - 1 && Math.hypot(p.x - r.to.x, p.z - r.to.z) < 0.65 || performance.now() - start > 20000) { const column = {}; resolve({ scene: B.scene, position: [p.x, p.y - cave.baseY, p.z], target, maxGroundError, maxGroundAt, trace, eye: [B.camera.position.x, B.camera.position.y, B.camera.position.z], playerCave: B.cameraCave.playerIndex, cameraCave: B.cameraCave.index, cavity: B.island.cavityAt(p.x, p.z, column, 9) ? column : null }); } else requestAnimationFrame(tick); }; tick(); })`);
  await b.send("Input.dispatchKeyEvent", { type: "keyUp", key: "w" });
  record("headquarters: a driven Ooga follows the smooth curved ramp into the chamber with its camera and no scene change", walked.scene === "hub" && walked.position[1] === -7 && Math.hypot(walked.position[0], walked.position[2]) < built.floor.radius && walked.maxGroundError < 0.1 && walked.playerCave === 8 && walked.cameraCave === 8 && walked.cavity.caveIndex === 9 && walked.cavity.floor === -7, JSON.stringify(walked));
  const lighting = await b.evaluate(`(async () => { const B = window.__ooga, H = B.headquarters, sources = H.sources, buffer = B.renderOpts.lights, daylight = sources.filter((source) => source.daylight), groups = H.windows.map((window, i) => { const prefix = "headquarters:window:" + i, group = daylight.filter((source) => source.id === prefix || source.id.startsWith(prefix + ":")), angles = group.map((source) => Math.atan2(source.x, -source.z)); return { kind: window.kind, count: group.length, height: group.every((source) => source.y > window.sill && source.y < window.sill + window.height), spread: window.kind === "panorama" ? Math.max(...angles) - Math.min(...angles) : 0, arc: window.kind === "panorama" ? window.endAngle - window.startAngle : 0 }; }), wait = () => new Promise((resolve) => { const frame = B.renderedFrames, tick = () => B.renderedFrames >= frame + 3 ? resolve() : requestAnimationFrame(tick); requestAnimationFrame(tick); }), sample = () => { const data = B.renderOpts.lights; let sky = 0, fire = 0, skyCount = 0, fireCount = 0; for (let i = 0; i < B.renderOpts.lightCount; i++) { const o = i * 8, energy = data[o + 4] + data[o + 5] + data[o + 6]; if (data[o + 3] === 11) { sky += energy; skyCount++; } else { fire += energy; fireCount++; } } return { count: B.renderOpts.lightCount, skyCount, fireCount, sky: skyCount ? sky / skyCount : 0, fire: fireCount ? fire / fireCount : 0 }; }; B.setHour(12); await wait(); const noon = sample(); B.setHour(0); await wait(); const night = sample(); B.setHour(12); await wait(); return { sources: sources.length, warm: H.lights.length, daylight: daylight.length, unique: new Set(sources.map((source) => source.id)).size, groups, noon, night, stable: H.sources === sources && B.renderOpts.lights === buffer }; })()`);
  record("headquarters: the hearth is the only shared point light and no window creates proximity lighting", lighting.sources === 1 && lighting.warm === 3 && lighting.daylight === 0 && lighting.unique === 1 && lighting.groups.every((group) => group.count === 0) && lighting.noon.count === 1 && lighting.night.count === 1 && lighting.noon.skyCount === 0 && lighting.night.skyCount === 0 && lighting.noon.fireCount === 1 && lighting.night.fireCount === 1 && Math.abs(lighting.noon.fire - lighting.night.fire) < 0.00001 && lighting.stable, JSON.stringify(lighting));
  const hearthEffect = await b.evaluate(`new Promise((resolve) => { const B = window.__ooga, H = B.headquarters, models = window.BL.hubModels, hearth = H.hearth; let frames = 0, min = Infinity, max = -Infinity; const tick = () => { min = Math.min(min, hearth.node.glow); max = Math.max(max, hearth.node.glow); if (++frames < 90) requestAnimationFrame(tick); else { const emberNodes = []; const walk = (node) => { if (node.geometry === models.ember()) emberNodes.push(node); for (const child of node.children) walk(child); }; walk(window.BL.scenes.hub.root); resolve({ pitModel: H.firepit.geometry === models.firepit(), flameModel: hearth.node.geometry === models.fireFlame(), nested: hearth.node.parent === H.firepit, source: H.sources.includes(hearth), visible: H.firepit.visible && hearth.node.visible, min, max, range: max - min, embers: B.critters.headquartersEmbers, emberNodes: emberNodes.length, undergroundEmitter: emberNodes.some((node) => { for (let i = 0; i < node.instanceCount; i++) if (node.instanceData[i * 20 + 13] < -3) return true; return false; }) }); } }; requestAnimationFrame(tick); })`);
  record("headquarters: the central hearth reuses the surface fire pit with a flickering flame and rising ash", hearthEffect.pitModel && hearthEffect.flameModel && hearthEffect.nested && hearthEffect.source && hearthEffect.visible && hearthEffect.min > 0.7 && hearthEffect.max > 0.9 && hearthEffect.range > 0.2 && hearthEffect.embers > 0 && hearthEffect.emberNodes === 2 && hearthEffect.undergroundEmitter, JSON.stringify(hearthEffect));
  const preservedThemes = await b.evaluate(`localStorage.getItem("ooga-headquarters-walls-v1")`);
  record("headquarters: removing wall customization leaves previously saved visitor data untouched", bare.savedThemes === JSON.stringify(oldThemes) && preservedThemes === bare.savedThemes, preservedThemes);
  await b.open(hubPage(src, "canvas2d=1"));
  await untilReady(b);
  const canvas = await b.evaluate(`(() => { const B = window.__ooga, H = B.headquarters, bare = (${headquartersBareRoomProbe.toString()})(); return { scene: B.scene, renderer: B.renderer.kind, frames: B.renderedFrames, rooms: H.rooms.length + H.basement.rooms.length, upperRooms: H.rooms.length, ramps: H.ramps.length + H.basement.ramps.length, bare }; })()`);
  record("headquarters: Canvas fallback keeps one mattress in each private room and old saved data untouched", canvas.scene === "hub" && canvas.renderer === "canvas2d" && canvas.frames >= 2 && canvas.rooms === 15 && canvas.upperRooms === 7 && canvas.ramps === 4 && canvas.bare.mattresses === 15 && canvas.bare.furnishedRooms === 15 && canvas.bare.noBeds && canvas.bare.noWallAPI && canvas.bare.noNumberAPI && canvas.bare.noDecorModels && canvas.bare.numberNodes === 0 && canvas.bare.extras.length === 0 && canvas.bare.basementExtras === 0 && canvas.bare.hits.length === 45 && canvas.bare.hits.every((kind) => !kind || !kind.startsWith("headquarters-")) && canvas.bare.savedThemes === preservedThemes, JSON.stringify(canvas));
});

const pileParameter = () => withPage("pile parameter", hubPage(src, "bananas=12345&b=37"), async (b) => {
  const r = await b.evaluate(`(() => { const B = window.__ooga, expectedRadius = window.BL.pile.visualFootprintFor(12345, 0.45), stats = B.stats(); return { startLevel: B.startLevel, level: B.level, shown: B.shown, radius: B.altar.radius, expectedRadius, testBananas: B.testBananas, outstanding: stats.deliveries + stats.pendingDrops, at: performance.now() }; })()`);
  record("debug bananas parameter sets the starting pile", r.startLevel === 12345 && r.level <= 12345 && r.level > 12340 && r.shown === Math.floor(r.level) && Math.abs(r.radius - r.expectedRadius) < 0.001, JSON.stringify(r));
  await b.key("b");
  const added = await b.evaluate(`(() => { const B = window.__ooga, stats = B.stats(); return { level: B.level, shown: B.shown, testBananas: B.testBananas, outstanding: stats.deliveries + stats.pendingDrops }; })()`);
  record("debug b parameter sets the bananas streamed per B press", added.testBananas === 37 && added.level <= r.level && added.outstanding - r.outstanding === 37, JSON.stringify({ before: r, queued: added }));
  await b.sleep(2300);
  const landed = await b.evaluate(`(() => { const B = window.__ooga, stats = B.stats(); return { level: B.level, shown: B.shown, outstanding: stats.deliveries + stats.pendingDrops, landed: stats.dropsLanded, at: performance.now() }; })()`);
  const eaten = await b.evaluate(eatenBetween(r.at, landed.at));
  record("debug b parameter credits all bananas as they land", landed.outstanding === 0 && landed.landed === 37 && landed.level - r.level > 37 - eaten && landed.level - r.level <= 37 && landed.shown === Math.floor(landed.level), JSON.stringify({ before: r, after: landed, eaten }));
  const capped = await b.evaluate(`(() => { const B = window.__ooga, max = window.BL.pile.MAX_BANANAS; B.setPileLevel(max * 5); return { max, level: B.level, shown: B.shown }; })()`);
  await b.key("b");
  const atCap = await b.evaluate(`(() => { const B = window.__ooga, stats = B.stats(); return { level: B.level, outstanding: stats.deliveries + stats.pendingDrops }; })()`);
  record("the pile caps at ten million bananas and queues nothing beyond it", capped.max === 10000000 && capped.level === capped.max && capped.shown === capped.max && atCap.level <= capped.max && atCap.outstanding === 0, JSON.stringify({ capped, atCap }));
});
const pileCapParameter = () => withPage("pile cap parameter", hubPage(src, "bananas=50000000"), async (b) => {
  const r = await b.evaluate(`(() => { const B = window.__ooga; return { startLevel: B.startLevel, max: window.BL.pile.MAX_BANANAS, level: B.level }; })()`);
  record("debug bananas parameter stops at the cap", r.startLevel === r.max && r.level <= r.max, JSON.stringify(r));
});

const weightedDelivery = () => withPage("weighted banana delivery", hubPage(src, "bananas=1000"), async (b) => {
  await b.evaluate(`[...window.__ooga.cavemen.values()].forEach((c) => { c.nextBuildAt = 1e9; })`);
  const measured = await b.evaluate(`(async () => {
    const B = window.__ooga, P = window.BL.pile, capacity = P.BACKLOG_VISUAL_CAPACITY;
    const frame = () => new Promise((resolve) => requestAnimationFrame(resolve));
    // Load both fixed shell meshes before measuring delivery residency. Growth
    // may select either detail level, but must not keep adding GPU records.
    const geometry = B.shell.geometry;
    for (const distant of [false, true]) {
      B.shell.geometry = window.BL.models.bananaTileGeometry(distant);
      B.renderer.render(window.BL.scenes.hub.root, B.camera, B.renderOpts);
    }
    B.shell.geometry = geometry;
    const snapshot = () => { const D = B.delivery; return { outstanding: D.logicalOutstandingValue, pending: D.pendingLogicalValue, pendingDrops: D.pendingVisualDropCount, airborne: D.airborneVisualDropCount, airborneValue: D.airborneLogicalValue, min: D.minDropWeight, max: D.maxDropWeight, started: D.visualDropsStarted, landed: D.visualDropsLanded, canceled: D.visualDropsCanceled, acceptedValue: D.totalAcceptedValue, landedValue: D.totalLandedValue, active: D.activeTime, remaining: D.estimatedActiveTimeRemaining, replans: D.replanCount, maxConcurrent: D.maxConcurrentDrops, lastDrain: D.lastDrainSeconds }; };
    const run = async (logicalValue) => {
      B.setPileLevel(1000);
      await frame();
      await frame();
      const base = { nodes: B.stats().allNodes, records: B.renderer.stats.records, level: B.level, altar: B.altar.platformRadius, path: B.path.quantizedRadius, scenery: B.scenery.visibilityReflowCount };
      const accepted = B.delivery.enqueue(logicalValue), plan = snapshot();
      for (let i = 0; i < 4; i++) await frame();
      const beforeLanding = { ...snapshot(), level: B.level, shown: B.shown, altar: B.altar.platformRadius, path: B.path.quantizedRadius, scenery: B.scenery.visibilityReflowCount };
      let maxConcurrent = 0, previousStarted = B.delivery.visualDropsStarted, previousTime = B.delivery.activeTime, maxLaunchRate = 0;
      while (B.delivery.logicalOutstandingValue && B.delivery.activeTime - plan.active <= P.BACKLOG_SECONDS + 0.2) {
        await frame();
        maxConcurrent = Math.max(maxConcurrent, B.delivery.airborneVisualDropCount);
        const span = B.delivery.activeTime - previousTime;
        if (span >= 1) {
          maxLaunchRate = Math.max(maxLaunchRate, (B.delivery.visualDropsStarted - previousStarted) / span);
          previousStarted = B.delivery.visualDropsStarted;
          previousTime = B.delivery.activeTime;
        }
      }
      const done = { ...snapshot(), nodes: B.stats().allNodes, records: B.renderer.stats.records, level: B.level, shown: B.shown };
      return { logicalValue, accepted, base, plan, beforeLanding, done, maxConcurrent, maxLaunchRate: +maxLaunchRate.toFixed(2) };
    };
    const one = await run(capacity), ten = await run(capacity * 10), hundred = await run(capacity * 100);
    B.setPileLevel(1000);
    B.delivery.enqueue(capacity * 10 + 1);
    const remainder = snapshot();
    B.setPileLevel(1000);
    B.delivery.enqueue(capacity * 2);
    while (B.delivery.airborneVisualDropCount < 12) await frame();
    const airborne = B.drops.map((drop, index) => drop.moving ? [index, drop.token, drop.bananaValue] : null).filter(Boolean);
    const beforeSecond = snapshot();
    B.delivery.enqueue(capacity * 7 + 1);
    const immutable = airborne.every(([index, token, value]) => B.drops[index].token === token && B.drops[index].bananaValue === value);
    const secondStart = B.delivery.activeTime;
    while (B.delivery.logicalOutstandingValue && B.delivery.activeTime - secondStart <= P.BACKLOG_SECONDS + 0.2) await frame();
    const backToBack = { beforeSecond, after: snapshot(), immutable, activeSinceSecond: B.delivery.lastDrainSeconds, exact: B.delivery.totalAcceptedValue === capacity * 9 + 1 && B.delivery.totalLandedValue === capacity * 9 + 1 && B.delivery.logicalOutstandingValue === 0 };
    return { capacity, pool: P.DROP_POOL_SIZE, rate: P.DROP_RATE, duration: P.DROP_DURATION_MAX, one, ten, hundred, remainder, backToBack };
  })()`);
  const rows = [measured.one, measured.ten, measured.hundred];
  record("weighted delivery: capacity is derived from the unchanged pool, cadence, and worst fall", measured.capacity === 608 && measured.pool === 96 && measured.rate === 72 && measured.duration === 1.35, JSON.stringify({ capacity: measured.capacity, pool: measured.pool, rate: measured.rate, duration: measured.duration }));
  record("weighted delivery: capacity-sized donations remain one visual banana per banana", measured.one.plan.pendingDrops === measured.capacity && measured.one.plan.min === 1 && measured.one.plan.max === 1, JSON.stringify(measured.one.plan));
  record("weighted delivery: 1x, 10x, and 100x use the same bounded visual-drop count", rows.every((row) => row.done.started === measured.capacity && row.done.landed === measured.capacity && row.done.canceled === 0), JSON.stringify(rows.map((row) => ({ logical: row.logicalValue, drops: row.done.landed, weights: [row.plan.min, row.plan.max] }))));
  record("weighted delivery: weights are even and exact at 1x, 10x, and 100x", rows.every((row, i) => row.plan.min === 10 ** i && row.plan.max === 10 ** i && row.done.acceptedValue === row.logicalValue && row.done.landedValue === row.logicalValue && row.done.outstanding === 0), JSON.stringify(rows.map((row) => ({ logical: row.logicalValue, accepted: row.done.acceptedValue, landed: row.done.landedValue, weights: [row.plan.min, row.plan.max] }))));
  record("weighted delivery: every representative backlog lands within ten active seconds", rows.every((row) => row.done.lastDrain <= 10.1), JSON.stringify(rows.map((row) => ({ logical: row.logicalValue, activeSeconds: +row.done.lastDrain.toFixed(3) }))));
  record("weighted delivery: concurrency, launch cadence, nodes, and GPU records stay bounded", rows.every((row) => row.maxConcurrent <= measured.pool && row.maxLaunchRate <= measured.rate + 1 && row.done.nodes === row.base.nodes && row.done.records === row.base.records), JSON.stringify(rows.map((row) => ({ logical: row.logicalValue, concurrent: row.maxConcurrent, launchesPerSecond: row.maxLaunchRate, nodes: [row.base.nodes, row.done.nodes], records: [row.base.records, row.done.records] }))));
  record("weighted delivery: queued and airborne value causes no pile-dependent growth before landing", rows.every((row) => row.beforeLanding.landedValue === 0 && row.beforeLanding.level <= row.base.level && row.beforeLanding.altar <= row.base.altar && row.beforeLanding.path === row.base.path && row.beforeLanding.scenery === row.base.scenery), JSON.stringify(rows.map((row) => ({ logical: row.logicalValue, base: row.base, beforeLanding: row.beforeLanding }))));
  record("weighted delivery: uneven remainders use deterministic adjacent integer weights", measured.remainder.pendingDrops === measured.capacity && measured.remainder.min === 10 && measured.remainder.max === 11 && measured.remainder.outstanding === measured.capacity * 10 + 1, JSON.stringify(measured.remainder));
  record("weighted delivery: back-to-back donations preserve airborne weights and replan only pending value", measured.backToBack.immutable && measured.backToBack.after.replans > measured.backToBack.beforeSecond.replans && measured.backToBack.exact && measured.backToBack.activeSinceSecond <= 10.1, JSON.stringify(measured.backToBack));

  const transition = await b.evaluate(`(async () => { const B = window.__ooga, P = window.BL.pile, frame = () => new Promise((resolve) => requestAnimationFrame(resolve)); B.setPileLevel(1000); const accepted = B.delivery.enqueue(P.BACKLOG_VISUAL_CAPACITY * 10 + 1), initial = { level: B.level, accepted: B.delivery.totalAcceptedValue }; B.go("lab"); while (B.scene !== "lab") await frame(); const swapped = { level: B.level, accepted: B.delivery.totalAcceptedValue, landed: B.delivery.totalLandedValue, outstanding: B.delivery.logicalOutstandingValue, canceled: B.delivery.visualDropsCanceled }; const start = B.delivery.activeTime; while (B.delivery.logicalOutstandingValue && B.delivery.activeTime - start <= P.BACKLOG_SECONDS + 0.2) await frame(); return { accepted, initial, swapped, done: { level: B.level, accepted: B.delivery.totalAcceptedValue, landed: B.delivery.totalLandedValue, outstanding: B.delivery.logicalOutstandingValue, started: B.delivery.visualDropsStarted, visualLanded: B.delivery.visualDropsLanded, canceled: B.delivery.visualDropsCanceled, drain: B.delivery.lastDrainSeconds } }; })()`);
  record("weighted delivery: scene transitions neither credit early nor lose or duplicate value", transition.swapped.landed === 0 && transition.swapped.outstanding === transition.accepted && transition.swapped.level <= transition.initial.level && transition.done.accepted === transition.accepted && transition.done.landed === transition.accepted && transition.done.outstanding === 0 && transition.done.started === transition.done.visualLanded + transition.done.canceled && transition.done.drain <= 10.1, JSON.stringify(transition));

  await b.evaluate(`(() => { const B = window.__ooga, capacity = window.BL.pile.BACKLOG_VISUAL_CAPACITY; B.setPileLevel(1000); B.delivery.enqueue(capacity * 10); })()`);
  await b.sleep(150);
  await b.focus(false);
  let pausedBefore, pausedAfter;
  try {
    await b.send("Page.setWebLifecycleState", { state: "frozen" });
    // Both readings belong to the frozen interval. Active protocol round trips
    // before freezing or after resuming must not consume its pause allowance.
    pausedBefore = await b.evaluate(`({ active: window.__ooga.delivery.activeTime, remaining: window.__ooga.delivery.estimatedActiveTimeRemaining })`);
    await b.sleep(700);
    pausedAfter = await b.evaluate(`({ active: window.__ooga.delivery.activeTime, remaining: window.__ooga.delivery.estimatedActiveTimeRemaining })`);
  } finally {
    await b.send("Page.setWebLifecycleState", { state: "active" });
    await b.focus(true);
    await b.send("Page.bringToFront");
  }
  record("weighted delivery: background pause time does not consume the active drain horizon", pausedAfter.active - pausedBefore.active < 0.3 && pausedBefore.remaining - pausedAfter.remaining < 0.3, JSON.stringify({ before: pausedBefore, after: pausedAfter, wallPause: 0.7 }));
  const resumed = await untilPage(b, `B.delivery.activeTime > ${pausedAfter.active} && B.delivery.estimatedActiveTimeRemaining < ${pausedAfter.remaining}`);
  const running = await b.evaluate(`({ active: window.__ooga.delivery.activeTime, remaining: window.__ooga.delivery.estimatedActiveTimeRemaining })`);
  record("weighted delivery: resuming restarts the active drain horizon", resumed && running.active > pausedAfter.active && running.remaining < pausedAfter.remaining, JSON.stringify({ frozen: pausedAfter, running }));

});

const weightedDeliveryCanvas = () => withPage("weighted banana delivery canvas", hubPage(src, "canvas2d=1&bananas=1000"), async (b) => {
  const result = await b.evaluate(`(async () => { const B = window.__ooga, P = window.BL.pile, frame = () => new Promise((resolve) => requestAnimationFrame(resolve)), logical = P.BACKLOG_VISUAL_CAPACITY * 10, start = B.delivery.activeTime; B.delivery.enqueue(logical); const plan = { drops: B.delivery.pendingVisualDropCount, min: B.delivery.minDropWeight, max: B.delivery.maxDropWeight }; while (B.delivery.logicalOutstandingValue && B.delivery.activeTime - start <= P.BACKLOG_SECONDS + 0.2) await frame(); return { kind: B.renderer.kind, logical, plan, landed: B.delivery.totalLandedValue, outstanding: B.delivery.logicalOutstandingValue, drops: B.delivery.visualDropsLanded, drain: B.delivery.lastDrainSeconds, concurrent: B.delivery.maxConcurrentDrops }; })()`);
  record("weighted delivery: Canvas fallback drains the same bounded exact weighted plan", result.kind === "canvas2d" && result.plan.drops === result.drops && result.plan.min === 10 && result.plan.max === 10 && result.landed === result.logical && result.outstanding === 0 && result.drain <= 10.1 && result.concurrent <= 96, JSON.stringify(result));
});

// Flood the actual rendered ground-level tiles, independently of isPath, from
// the expanding banana ring to every station across both cave frontages.
const headquartersPathProbe = () => {
  const B = window.__ooga, unit = B.island.pathUnit, size = 496, origin = -31, total = size * size, before = B.level;
  const data = B.island.path.instanceData, node = window.BL.scenes.hub.root.children.find((child) => child.instanceData === data);
  const samples = [];
  try {
    for (const level of [1000, 10000, 1000000]) {
      B.setPileLevel(level);
      const mask = new Uint8Array(total), ground = new Uint8Array(total), seen = new Uint8Array(total), heights = new Float32Array(total), queue = new Int32Array(total), path = B.path;
      let head = 0, tail = 0;
      for (let n = 0; n < node.instanceCount; n++) {
        const o = n * 20, x = data[o + 12], y = data[o + 13], z = data[o + 14], gx = Math.floor((x - origin) / unit), gz = Math.floor((z - origin) / unit), i = gx * size + gz;
        mask[i] = 1; heights[i] = y;
        if (Math.abs(y - 0.006) > 1e-5 || Math.abs(B.island.surfaceAt(x, z)) > 1e-5) continue;
        ground[i] = 1;
        const radius = Math.hypot(x, z);
        if (radius >= path.ringInnerRadius && radius < path.ringOuterRadius) { seen[i] = 1; queue[tail++] = i; }
      }
      const ringSeeds = tail;
      while (head < tail) {
        const i = queue[head++], gx = Math.floor(i / size);
        for (const next of [i - size, i + size, i - 1, i + 1]) {
          if (next < 0 || next >= total || !ground[next] || seen[next] || (Math.abs(next - i) !== size && Math.floor(next / size) !== gx)) continue;
          seen[next] = 1; queue[tail++] = next;
        }
      }
      const fronts = B.island.headquarters.fronts.map((front) => ({ id: front.id, stations: [-4, -3, -2, -1, 0, 1, 2, 3, 4].map((d) => {
        const x = front.center.x + front.tangent.x * d, z = front.center.z + front.tangent.z * d, i = Math.floor((x - origin) / unit) * size + Math.floor((z - origin) / unit);
        return { d, rendered: !!mask[i], connected: !!seen[i], y: heights[i], isPath: B.island.isPath(x, z) };
      }) }));
      samples.push({ level, inner: path.ringInnerRadius, outer: path.ringOuterRadius, ringSeeds, connected: tail, rendered: node.instanceCount, expected: path.visibleInstanceCount, fronts });
    }
  } finally { B.setPileLevel(before); }
  return samples;
};

const dynamicPaths = () => withPage("dynamic paths", hubPage(src, "bananas=1000&b=100"), async (b) => {
  // Keep unrelated timed crew builds from changing active geometry mid-cycle.
  await b.evaluate(`[...window.__ooga.cavemen.values()].forEach((c) => { c.nextBuildAt = 1e9; })`);
  const result = await b.evaluate(`(async () => { const B = window.__ooga, unit = B.island.pathUnit, size = 496, origin = -31, total = size * size, beforeMouths = JSON.stringify(B.mouths.map((m) => [m.id, m.x, m.z, m.ry])); const frame = () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))); const analyze = (level) => { B.setPileLevel(level); const p = B.path, mask = new Uint8Array(total), seen = new Uint8Array(total), queue = new Int32Array(total); let count = 0, violations = 0, minTileRadius = Infinity, ringCells = 0, head = 0, tail = 0; for (let gx = 0; gx < size; gx++) for (let gz = 0; gz < size; gz++) { const x = (gx + 0.5) * unit + origin, z = (gz + 0.5) * unit + origin, i = gx * size + gz; if (!B.island.isPath(x, z)) continue; mask[i] = 1; count++; const inner = Math.hypot(Math.max(0, Math.abs(x) - unit / 2), Math.max(0, Math.abs(z) - unit / 2)); minTileRadius = Math.min(minTileRadius, inner); if (inner < p.ringInnerRadius - 1e-8) violations++; const r = Math.hypot(x, z); if (r >= p.ringInnerRadius && r < p.ringOuterRadius) { seen[i] = 1; queue[tail++] = i; ringCells++; } } while (head < tail) { const i = queue[head++], gx = Math.floor(i / size); for (const next of [i - size, i + size, i - 1, i + 1]) { if (next < 0 || next >= total || !mask[next] || seen[next] || (Math.abs(next - i) !== size && Math.floor(next / size) !== gx)) continue; seen[next] = 1; queue[tail++] = next; } } const targets = [...B.mouths.map((m) => ({ id: m.id, x: m.x, z: m.z })), { id: "gate", x: B.island.gate.x, z: B.island.gate.z }, { id: "south", x: 0, z: 28 }]; const joins = targets.map((target) => { let distance = Infinity; for (let gx = 0; gx < size; gx++) for (let gz = 0; gz < size; gz++) { const i = gx * size + gz; if (seen[i]) distance = Math.min(distance, Math.hypot((gx + 0.5) * unit + origin - target.x, (gz + 0.5) * unit + origin - target.z)); } return { id: target.id, distance }; }); const m = B.mouths.find((mouth) => mouth.id === "c1"), ox = -Math.sin(m.ry), oz = -Math.cos(m.ry), px = oz, pz = -ox, stations = [0.5, 1, 1.5, 2, 2.5].map((distance) => { let sum = 0, hits = 0; for (let lateral = -2; lateral <= 2.0001; lateral += 0.025) { const x = m.x - ox * distance + px * lateral, z = m.z - oz * distance + pz * lateral; if (B.island.isPath(x, z)) { sum += lateral; hits++; } } return { center: hits ? sum / hits : null, hits }; }); return { level, platform: B.altar.platformRadius, requested: p.requestedInnerRadius, inner: p.ringInnerRadius, center: p.ringCenterRadius, outer: p.ringOuterRadius, quantized: p.quantizedRadius, count: p.visibleInstanceCount, capacity: p.bufferCapacity, reflows: p.reflowCount, active: p.active, violations, minTileRadius, ringCells, connected: tail, joins, c1Hits: stations.every((s) => s.hits > 0), c1Offset: Math.max(...stations.map((s) => Math.abs(s.center))) }; }; const samples = [analyze(1000), analyze(10000), analyze(1000000)]; await frame(); return { samples, endpointsStable: beforeMouths === JSON.stringify(B.mouths.map((m) => [m.id, m.x, m.z, m.ry])) }; })()`);
  const samples = result.samples;
  const headquartersPaths = await b.evaluate(`(${headquartersPathProbe.toString()})()`);
  record("dynamic path: actual ground-level tiles join both full headquarters frontages to the banana ring at 1K, 10K and 1M", headquartersPaths.length === 3 && headquartersPaths.every((sample) => sample.ringSeeds > 0 && sample.connected > sample.ringSeeds && sample.rendered === sample.expected && sample.fronts.length === 2 && sample.fronts.every((front) => front.stations.length === 9 && front.stations.every((station) => station.rendered && station.connected && station.isPath && Math.abs(station.y - 0.006) < 1e-5))), JSON.stringify(headquartersPaths));
  record("dynamic path: ring grows monotonically at 1K, 10K and 1M bananas", samples.every((s, i) => !i || s.platform > samples[i - 1].platform && s.inner > samples[i - 1].inner) && samples.every((s) => s.active), JSON.stringify(samples.map(({ level, platform, inner, center, outer }) => ({ level, platform, inner, center, outer }))));
  record("dynamic path: quantized inner edge stays at least 0.125 beyond the platform", samples.every((s) => s.inner + 1e-8 >= s.platform + 0.125 && Math.abs(s.inner / 0.125 - Math.round(s.inner / 0.125)) < 1e-8 && s.center === s.inner + 0.75 && s.outer === s.center + 0.75), JSON.stringify(samples.map(({ level, platform, requested, inner, quantized }) => ({ level, platform, requested, inner, quantized }))));
  record("dynamic path: every visible path tile connects to the ring without crossing its inner edge", samples.every((s) => s.violations === 0 && s.minTileRadius + 1e-8 >= s.inner && s.count === s.connected && s.count <= s.capacity && s.ringCells > 0), JSON.stringify(samples.map(({ level, count, connected, violations, minTileRadius, inner }) => ({ level, count, connected, violations, minTileRadius, inner }))));
  record("dynamic path: every cave, including both headquarters entrances, the gate and southern trail stays joined to the ring", samples.every((s) => s.joins.every((join) => join.distance < 2.75)), JSON.stringify(samples.map((s) => ({ level: s.level, joins: s.joins }))));
  record("dynamic path: cave endpoints stay fixed and c1 keeps its perpendicular approach", result.endpointsStable && samples.every((s) => s.c1Hits && s.c1Offset <= 0.15), JSON.stringify({ endpointsStable: result.endpointsStable, c1: samples.map((s) => ({ level: s.level, offset: s.c1Offset })) }));

  const stability = await b.evaluate(`(() => { const B = window.__ooga, unit = B.island.pathUnit, size = 496, origin = -31, total = size * size; const snapshot = (level) => { B.setPileLevel(level); const p = { ...B.path }, data = B.island.path.instanceData, cells = new Map(), rendered = new Uint8Array(total); let minSpokeInner = Infinity; for (let n = 0; n < p.visibleInstanceCount; n++) { const o = n * 20, x = data[o + 12], y = data[o + 13], z = data[o + 14], gx = Math.floor((x - origin) / unit), gz = Math.floor((z - origin) / unit), i = gx * size + gz, inner = Math.hypot(Math.max(0, Math.abs(x) - unit / 2), Math.max(0, Math.abs(z) - unit / 2)); rendered[i] = 1; if (inner >= p.ringOuterRadius - 1e-8) { cells.set(i, x + ":" + y + ":" + z); minSpokeInner = Math.min(minSpokeInner, inner); } } let maskExact = true; for (let gx = 0; gx < size && maskExact; gx++) for (let gz = 0; gz < size; gz++) { const i = gx * size + gz, x = (gx + 0.5) * unit + origin, z = (gz + 0.5) * unit + origin; if (!!rendered[i] !== B.island.isPath(x, z)) { maskExact = false; break; } } return { level, p, cells, maskExact, minSpokeInner }; }; const sameSubset = (smaller, larger) => { for (const [i, transform] of larger.cells) if (smaller.cells.get(i) !== transform) return false; return true; }; const sameSet = (a, b) => a.cells.size === b.cells.size && sameSubset(a, b); const small = snapshot(1000), medium = snapshot(10000), large = snapshot(1000000), restored = snapshot(1000); const summary = (s) => ({ level: s.level, master: s.p.masterSpokeCellCount, visible: s.p.visibleSpokeCellCount, clipped: s.p.clippedSpokeCellCount, ring: s.p.ringCellCount, total: s.p.visibleInstanceCount, hash: s.p.masterMaskHash, builds: s.p.masterMaskBuildCount }); return { rows: [small, medium, large].map(summary), masterStable: [small, medium, large, restored].every((s) => s.p.masterMaskBuildCount === 1 && s.p.masterSpokeCellCount === small.p.masterSpokeCellCount && s.p.masterMaskHash === small.p.masterMaskHash), monotonicExact: sameSubset(small, medium) && sameSubset(medium, large), restoredExact: sameSet(small, restored), masksExact: [small, medium, large, restored].every((s) => s.maskExact && s.p.visibleSpokeCellCount + s.p.ringCellCount === s.p.visibleInstanceCount && s.p.clippedSpokeCellCount + s.p.visibleSpokeCellCount === s.p.masterSpokeCellCount && s.minSpokeInner + 1e-8 >= s.p.ringOuterRadius) }; })()`);
  pathMasterHash = stability.rows[0].hash;
  record("dynamic path: the deterministic master spoke mask is built exactly once", stability.masterStable && stability.rows[0].master > 0, JSON.stringify(stability.rows));
  record("dynamic path: growth only clips immutable spoke cells and transforms", stability.monotonicExact && stability.rows[0].visible > stability.rows[1].visible && stability.rows[1].visible > stability.rows[2].visible, JSON.stringify(stability.rows));
  record("dynamic path: shrinking restores the identical spoke cells and transforms", stability.restoredExact, JSON.stringify(stability.rows));
  record("dynamic path: rendered instances, isPath and radial clipping stay synchronized", stability.masksExact, JSON.stringify(stability.rows));

  const scenery = await b.evaluate(`(() => { const B = window.__ooga, kinds = ["flower", "bush", "tree", "crate", "barrel", "rock"], candidates = B.props.filter((o) => o.scenery), transforms = new Map(candidates.map((o) => [o, [o.x, o.z, o.node.position.y, o.node.rotation.y]])); const sample = (level) => { B.setPileLevel(level); const active = candidates.filter((o) => o.active), byKind = Object.fromEntries(kinds.map((kind) => [kind, active.filter((o) => o.prop === kind).length])); let radiusViolations = 0, pathViolations = 0; for (const o of active) { if (Math.hypot(o.x, o.z) - o.footprint < B.scenery.clearanceRadius - 1e-8) radiusViolations++; if (B.island.path.overlaps(o.x, o.z, o.footprint)) pathViolations++; } return { level, debug: { ...B.scenery }, byKind, radiusViolations, pathViolations, targets: B.input.targetCount, active }; }; const small = sample(1000), medium = sample(10000), large = sample(1000000), crossed = candidates.find((o) => small.active.includes(o) && !o.active), hidden = crossed && { active: crossed.active, visible: crossed.node.visible, transform: transforms.get(crossed) }; sample(1000); const restored = crossed && { active: crossed.active, visible: crossed.node.visible, sameTransform: transforms.get(crossed).every((v, i) => v === [crossed.x, crossed.z, crossed.node.position.y, crossed.node.rotation.y][i]), targets: B.input.targetCount }; const signature = candidates.map((o) => [o.prop, o.x, o.z, o.node.rotation.y].join(":" )).join("|"); return { small: { ...small, active: undefined }, medium: { ...medium, active: undefined }, large: { ...large, active: undefined }, hidden, restored, candidateCount: candidates.length, signature }; })()`);
  scenerySignature = scenery.signature;
  record("dynamic scenery: representative meadow props return outside the 1K ring", scenery.candidateCount >= 200 && Object.values(scenery.small.byKind).every((count) => count > 0) && scenery.small.debug.visibleCount > 0, JSON.stringify({ candidates: scenery.candidateCount, visible: scenery.small.debug.visibleCount, kinds: scenery.small.byKind }));
  record("dynamic scenery: visible footprints clear the ring and path at 1K, 10K and 1M", [scenery.small, scenery.medium, scenery.large].every((s) => s.radiusViolations === 0 && s.pathViolations === 0 && s.debug.visibleCount + s.debug.radiusCulledCount + s.debug.pathCulledCount + s.debug.fixedCulledCount === s.debug.candidateCount), JSON.stringify({ small: scenery.small, medium: scenery.medium, large: scenery.large }));
  record("dynamic scenery: growth hides and unregisters crossed props, then shrink restores them exactly once", scenery.hidden && !scenery.hidden.active && !scenery.hidden.visible && scenery.large.targets < scenery.small.targets && scenery.restored.active && scenery.restored.visible && scenery.restored.sameTransform && scenery.restored.targets === scenery.small.targets, JSON.stringify({ hidden: scenery.hidden, restored: scenery.restored, targets: [scenery.small.targets, scenery.large.targets, scenery.restored.targets] }));

  const cycles = await b.evaluate(`new Promise(async (resolve) => { const B = window.__ooga, rows = []; for (const level of [1000, 10000, 1000000, 1000, 1000000, 10000, 1000]) { B.setPileLevel(level); await new Promise((next) => requestAnimationFrame(() => requestAnimationFrame(next))); B.housekeep(); rows.push({ level, records: B.renderer.stats.records, active: B.renderer.stats.active, targets: B.input.targetCount, pathCount: B.path.visibleInstanceCount, sceneryVisible: B.scenery.visibleCount, candidates: B.scenery.candidateCount, pathReflows: B.path.reflowCount, sceneryReflows: B.scenery.visibilityReflowCount }); } resolve(rows); })`);
  const stableCycle = (row, i) => { const first = cycles.findIndex((other) => other.level === row.level); return i === first || row.targets === cycles[first].targets && row.sceneryVisible === cycles[first].sceneryVisible && row.candidates === cycles[first].candidates; };
  // Drawn records may differ by the snack a chewing caveman shows for part of each bite; resident records may not
  record("dynamic path and scenery: repeated growth and shrink keep targets and GPU resources bounded", cycles.every((row, i) => row.records === cycles[0].records && Math.abs(row.active - cycles[0].active) <= 1 && row.pathCount <= samples[0].capacity && stableCycle(row, i)) && cycles.at(-1).pathReflows >= cycles[0].pathReflows + cycles.length - 1 && cycles.at(-1).sceneryReflows >= cycles[0].sceneryReflows + cycles.length - 1, JSON.stringify(cycles));

  await b.evaluate(`window.__ooga.setPileLevel(1000)`);
  const airborneBefore = await b.evaluate(`({ level: window.__ooga.level, inner: window.__ooga.path.ringInnerRadius, reflows: window.__ooga.path.reflowCount, sceneryReflows: window.__ooga.scenery.visibilityReflowCount })`);
  await b.key("b");
  const airborne = await b.evaluate(`(() => { const B = window.__ooga, stats = B.stats(); return { level: B.level, inner: B.path.ringInnerRadius, reflows: B.path.reflowCount, sceneryReflows: B.scenery.visibilityReflowCount, outstanding: stats.deliveries + stats.pendingDrops }; })()`);
  await untilPage(b, "s.deliveries + s.pendingDrops === 0");
  const landed = await b.evaluate(`(() => { const B = window.__ooga, stats = B.stats(); return { level: B.level, inner: B.path.ringInnerRadius, reflows: B.path.reflowCount, sceneryReflows: B.scenery.visibilityReflowCount, outstanding: stats.deliveries + stats.pendingDrops }; })()`);
  record("dynamic path and scenery: queued bananas cause no reflow before landing", airborne.outstanding === 100 && airborne.level === airborneBefore.level && airborne.inner === airborneBefore.inner && airborne.reflows === airborneBefore.reflows && airborne.sceneryReflows === airborneBefore.sceneryReflows && landed.outstanding === 0 && landed.level > airborne.level + 98.5 && landed.inner > airborne.inner && landed.reflows > airborne.reflows && landed.sceneryReflows > airborne.sceneryReflows, JSON.stringify({ before: airborneBefore, airborne, landed }));

  await b.evaluate(`window.__ooga.setPileLevel(1000000)`);
  const perf = await b.evaluate(`new Promise((resolve) => { const t0 = performance.now(); let frames = 0; const tick = () => { frames++; if (performance.now() - t0 < 2000) requestAnimationFrame(tick); else resolve({ fps: +(frames / 2).toFixed(1), count: window.__ooga.path.visibleInstanceCount, shown: window.__ooga.shown }); }; requestAnimationFrame(tick); })`);
  record("dynamic path: million-banana hub remains at least 50 FPS", perf.fps >= 50 && perf.count === samples[2].count && perf.shown >= 999999, JSON.stringify(perf));
});

const hubCamera = () => withPage("hub camera", hubPage(src), async (b) => {
  const wheel = async (n, dy) => {
    for (let i = 0; i < n; i++) {
      await b.send("Input.dispatchMouseEvent", { type: "mouseWheel", x: 400, y: 450, deltaX: 0, deltaY: dy });
      await b.sleep(20);
    }
  };
  const view = () => b.evaluate(`(() => { const B = window.__ooga; const c = B.camera; return { y: +c.position.y.toFixed(2), floor: +B.island.heightAt(c.position.x, c.position.z).toFixed(2), dist: +Math.hypot(c.position.x - c.target.x, c.position.y - c.target.y, c.position.z - c.target.z).toFixed(1), tz: +c.target.z.toFixed(1) }; })()`);
  // Zoom in, fly out, orbit a turn, pitch up
  const samples = [];
  await wheel(14, -60);
  await hold(b, "w", 3000);
  await b.drag({ x: 400, y: 500 }, { x: 400, y: 100 });
  await b.sleep(700);
  samples.push(await view());
  for (let i = 0; i < 8; i++) {
    await b.drag({ x: 300, y: 500 }, { x: 496, y: 500 });
    await b.sleep(400);
    samples.push(await view());
  }
  await b.drag({ x: 400, y: 100 }, { x: 400, y: 850 });
  await b.sleep(700);
  samples.push(await view());
  const worst = samples.reduce((m, s) => Math.min(m, s.y - s.floor), Infinity);
  record("hub: camera stays above the island", samples[0].dist <= 16.5 && worst >= 1.09, `min clearance ${worst.toFixed(2)} over ${samples.length} views, zoomed to ${samples[0].dist}, target z ${samples[0].tz}`);
});

const hubPerspective = () => withPage("hub perspective", hubPage(src), async (b) => {
  const wheel = async (count, deltaY) => {
    for (let i = 0; i < count; i++) {
      await b.send("Input.dispatchMouseEvent", { type: "mouseWheel", x: 720, y: 400, deltaX: 0, deltaY });
      await b.sleep(20);
    }
  };
  const settle = (mode, mix) => b.evaluate(`new Promise((resolve) => { const B = window.__ooga, start = performance.now(), tick = () => { if (B.pilot.mode === ${JSON.stringify(mode)} && B.pilot.closeMix === ${mix} || performance.now() - start > 3000) resolve({ mode: B.pilot.mode, mix: B.pilot.closeMix }); else requestAnimationFrame(tick); }; requestAnimationFrame(tick); })`);
  const cameraState = () => b.evaluate(`(() => { const B = window.__ooga, c = B.camera, feet = c.position.y - 1.1; return { mode: B.pilot.mode, mix: B.pilot.closeMix, p: [c.position.x, c.position.y, c.position.z], target: [c.target.x, c.target.y, c.target.z], floor: B.headquarters.solids.supportAt(c.position.x, c.position.z, feet), yaw: B.pilot.orbit.yaw, pitch: B.pilot.orbit.pitch, dist: B.pilot.orbit.dist, near: c.near }; })()`);
  const base = await b.evaluate(`(() => { const B = window.__ooga, stats = B.stats(); return { nodes: stats.allNodes, built: stats.built, targets: B.input.targetCount }; })()`);
  await wheel(20, -60);
  // Entering from an elevated orbit preserves gravity; its landing can finish
  // after the view blend, before stationary eye-level look is measured.
  await untilPage(b, 'B.pilot.mode === "eye-level" && B.pilot.closeMix === 1 && !B.pilot.freeFalling');
  const meadow = await cameraState();
  record("hub perspective: free zoom settles at Ooga eye height above the current ground", meadow.mode === "eye-level" && meadow.mix === 1 && Math.abs(meadow.p[1] - meadow.floor - 1.1) < 0.001 && meadow.near === 0.1, JSON.stringify(meadow));
  record("hub perspective: a pile focus overlapping the solid platform recovers above it without moving into HQ", Math.hypot(meadow.p[0], meadow.p[2]) < 0.001 && Math.abs(meadow.floor - 0.34) < 0.001, JSON.stringify(meadow));

  const beforeLook = await cameraState();
  await b.drag({ x: 100, y: 650 }, { x: 1320, y: 120 });
  await b.sleep(500);
  const afterLook = await cameraState();
  record("hub perspective: eye-level mouse look is a tight, unrestricted swivel that does not move the viewpoint", Math.abs(afterLook.yaw - beforeLook.yaw) > 4 && afterLook.pitch < beforeLook.pitch - 1 && Math.hypot(afterLook.p[0] - beforeLook.p[0], afterLook.p[1] - beforeLook.p[1], afterLook.p[2] - beforeLook.p[2]) < 0.01, JSON.stringify({ before: beforeLook, after: afterLook }));

  await wheel(1, 60);
  await settle("orbit", 0);
  await b.evaluate(`(() => { const B = window.__ooga, m = B.mouths.find((v) => v.id === "c11"), o = B.pilot.orbit, ox = Math.sin(m.angle), oz = -Math.cos(m.angle), x = m.x + ox * 1.2, z = m.z + oz * 1.2, floor = B.island.surfaceAt(x, z), pitch = 0.2, dist = 3.5, cp = Math.cos(pitch), sp = Math.sin(pitch); o.target = { x, y: floor + 1.1 - sp * dist, z: z - cp * dist }; o.tx = o.target.x; o.ty = o.target.y; o.tz = o.target.z; o.yaw = o.tYaw = 0; o.pitch = o.tPitch = pitch; o.dist = o.tDist = dist; B.pilot.update(0.1); })()`);
  await wheel(1, -60);
  await settle("eye-level", 1);
  const roof = await cameraState();
  record("hub perspective: free eye height follows elevated walkable rock instead of a fixed world Y", roof.floor > 3 && Math.abs(roof.p[1] - roof.floor - 1.1) < 0.001, JSON.stringify(roof));

  await wheel(1, 60);
  await settle("orbit", 0);
  const picked = await b.evaluate(`(() => { const B = window.__ooga, cave = [...B.cavemen.values()].find((v) => v.state === "working" && !v.walk && !v.build), o = B.pilot.orbit; B.pilot.possess(cave); const p = cave.root.position; B.pilot.navigate({ position: { x: p.x, y: p.y - cave.baseY, z: p.z }, yaw: o.yaw, pitch: 0, dist: 10 }); B.pilot.hooks.onOrbit(0, 0.75 / 0.0035); B.pilot.update(0); return cave.traits.name; })()`);
  const zoomTrack = [];
  for (let i = 0; i < 7; i++) {
    await wheel(1, -60);
    await b.sleep(40);
    zoomTrack.push(await b.evaluate(`(() => { const B = window.__ooga, o = B.pilot.orbit; return { mode: B.pilot.mode, dist: o.dist, targetDist: o.tDist, pitch: o.pitch, viewPitch: B.pilot.viewPitch, mix: B.pilot.closeMix }; })()`));
  }
  const trailingTrack = zoomTrack.filter((sample) => sample.mode === "trailing");
  const easedZoom = zoomTrack.some((sample) => sample.dist - sample.targetDist > 0.05) && zoomTrack.every((sample, i) => sample.dist >= sample.targetDist - 0.000001 && (!i || sample.dist <= zoomTrack[i - 1].dist + 0.000001 && sample.targetDist <= zoomTrack[i - 1].targetDist));
  record("hub perspective: controlled zoom eases toward its chosen distance, retains the selected angle, and enters first person", easedZoom && trailingTrack.length >= 5 && trailingTrack.every((sample) => Math.abs(sample.pitch - 0.75) < 0.000001 && Math.abs(sample.viewPitch - 0.75) < 0.000001) && zoomTrack[zoomTrack.length - 1].mode === "first-person", JSON.stringify(zoomTrack));
  await settle("first-person", 1);
  const first = await b.evaluate(`(() => { const B = window.__ooga, cave = B.crew.player, p = cave.root.position, h = cave.root.rotation.y, eye = [p.x + Math.sin(h) * 0.16, p.y - cave.baseY + cave.headOffset * 0.95, p.z + Math.cos(h) * 0.16], view = [B.camera.target.x - B.camera.position.x, B.camera.target.z - B.camera.position.z], facing = [Math.sin(h), Math.cos(h)], length = Math.hypot(view[0], view[1]); return { name: cave.traits.name, mode: B.pilot.mode, mix: B.pilot.closeMix, eye, camera: [B.camera.position.x, B.camera.position.y, B.camera.position.z], facingDot: (view[0] * facing[0] + view[1] * facing[1]) / length, headVisible: cave.parts.head.visible, headCameraHidden: cave.parts.head.cameraHidden, torso: cave.parts.torso.visible }; })()`);
  record("hub perspective: closest controlled zoom becomes first person at the Ooga's unobstructed eyes and preserves its facing", first.name === picked && first.mode === "first-person" && first.mix === 1 && Math.hypot(first.eye[0] - first.camera[0], first.eye[1] - first.camera[1], first.eye[2] - first.camera[2]) < 0.001 && first.facingDot > 0.999 && first.headVisible && first.headCameraHidden && first.torso, JSON.stringify(first));

  await b.evaluate(`(() => { const o = window.__ooga.pilot.orbit; o.pitch = o.tPitch = 1.35; })()`);
  await b.sleep(100);
  const feetView = await b.evaluate(`(() => { const B = window.__ooga, cave = B.crew.player, T = window.BL.math.mat4, point = new Float32Array(3), projectFoot = (leg) => { T.transformPoint(point, leg.world, 0, -cave.baseY, 0); const screen = B.renderer.project(point[0], point[1], point[2]); return screen && [screen.x, screen.y]; }, size = B.renderer.size, p = cave.root.position, h = cave.root.rotation.y; return { forward: (B.camera.position.x - p.x) * Math.sin(h) + (B.camera.position.z - p.z) * Math.cos(h), left: projectFoot(cave.parts.legL), right: projectFoot(cave.parts.legR), size: [size.width, size.height] }; })()`);
  record("hub perspective: the face-surface eye keeps both feet in the downward first-person view", Math.abs(feetView.forward - 0.16) < 0.001 && feetView.left && feetView.right && [feetView.left, feetView.right].every((foot) => foot[0] >= 0 && foot[0] <= feetView.size[0] && foot[1] >= 0 && foot[1] <= feetView.size[1]), JSON.stringify(feetView));
  await b.evaluate(`(() => { const o = window.__ooga.pilot.orbit; o.pitch = o.tPitch = 0; })()`);
  await b.sleep(100);

  const poseState = () => b.evaluate(`(() => { const B = window.__ooga, cave = B.crew.player, p = cave.root.position, h = cave.root.rotation.y, yaw = B.pilot.orbit.yaw, eye = [p.x + Math.sin(h) * 0.16, p.y - cave.baseY + cave.headOffset * 0.95, p.z + Math.cos(h) * 0.16]; return { actor: [p.x, p.y, p.z], body: [cave.root.rotation.x, h, cave.root.rotation.z], head: [cave.parts.head.rotation.x, cave.parts.head.rotation.y], camera: [B.camera.position.x, B.camera.position.y, B.camera.position.z], eye, yaw, pitch: B.pilot.orbit.pitch, phase: cave.act.phase, torso: [cave.parts.torso.rotation.x, cave.parts.torso.rotation.z], legsZ: [cave.parts.legL.rotation.z, cave.parts.legR.rotation.z] }; })()`);
  const angleError = (a, b) => Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b)));
  const actor0 = await poseState();
  await b.drag({ x: 100, y: 650 }, { x: 1320, y: 120 });
  await b.sleep(500);
  const actor1 = await poseState();
  record("hub perspective: first-person look rotates the upright body with yaw and only the head with pitch without translating the Ooga", actor0.actor.every((v, i) => Math.abs(v - actor1.actor[i]) < 0.000001) && Math.abs(actor1.yaw - actor0.yaw) > 4 && actor1.pitch < actor0.pitch - 1 && angleError(actor1.body[1], actor1.yaw + Math.PI) < 0.001 && Math.abs(actor1.body[0]) < 0.000001 && Math.abs(actor1.body[2]) < 0.000001 && Math.abs(actor1.head[0] - actor1.pitch) < 0.001 && Math.abs(actor1.head[1]) < 0.000001, JSON.stringify({ before: actor0, after: actor1 }));

  await b.send("Input.dispatchKeyEvent", { type: "keyDown", key: "w", text: "w" });
  await b.sleep(450);
  const forward = await poseState();
  await b.send("Input.dispatchKeyEvent", { type: "keyUp", key: "w" });
  const facing = [-Math.sin(actor1.yaw), -Math.cos(actor1.yaw)], right = [Math.cos(actor1.yaw), -Math.sin(actor1.yaw)];
  const forwardDelta = [forward.actor[0] - actor1.actor[0], forward.actor[2] - actor1.actor[2]];
  record("hub perspective: W walks forward without changing the first-person heading or eye anchor", forwardDelta[0] * facing[0] + forwardDelta[1] * facing[1] > 0.5 && angleError(forward.body[1], actor1.body[1]) < 0.001 && forward.phase > 0 && Math.hypot(forward.eye[0] - forward.camera[0], forward.eye[1] - forward.camera[1], forward.eye[2] - forward.camera[2]) < 0.001, JSON.stringify({ before: actor1, after: forward }));

  await b.sleep(50);
  await b.send("Input.dispatchKeyEvent", { type: "keyDown", key: "s", text: "s" });
  await b.sleep(450);
  const backward = await poseState();
  await b.send("Input.dispatchKeyEvent", { type: "keyUp", key: "s" });
  const backwardDelta = [backward.actor[0] - forward.actor[0], backward.actor[2] - forward.actor[2]];
  record("hub perspective: S visibly walks backward without turning the Ooga around", backwardDelta[0] * facing[0] + backwardDelta[1] * facing[1] < -0.5 && angleError(backward.body[1], actor1.body[1]) < 0.001 && backward.phase < 0 && backward.torso[0] > 0.05 && Math.abs(backward.head[0] - actor1.pitch) < 0.001, JSON.stringify({ before: forward, after: backward }));

  await b.sleep(50);
  await b.send("Input.dispatchKeyEvent", { type: "keyDown", key: "d", text: "d" });
  await b.sleep(450);
  const strafed = await poseState();
  await b.send("Input.dispatchKeyEvent", { type: "keyUp", key: "d" });
  const strafeDelta = [strafed.actor[0] - backward.actor[0], strafed.actor[2] - backward.actor[2]];
  await b.sleep(50);
  await b.send("Input.dispatchKeyEvent", { type: "keyDown", key: "a", text: "a" });
  await b.sleep(450);
  const strafedLeft = await poseState();
  await b.send("Input.dispatchKeyEvent", { type: "keyUp", key: "a" });
  const strafeLeftDelta = [strafedLeft.actor[0] - strafed.actor[0], strafedLeft.actor[2] - strafed.actor[2]];
  record("hub perspective: A and D strafe without changing view direction and use mirrored lateral poses", strafeDelta[0] * right[0] + strafeDelta[1] * right[1] > 0.5 && strafeLeftDelta[0] * right[0] + strafeLeftDelta[1] * right[1] < -0.5 && angleError(strafed.body[1], actor1.body[1]) < 0.001 && angleError(strafedLeft.body[1], actor1.body[1]) < 0.001 && strafed.torso[1] < -0.05 && strafed.legsZ[0] > 0.05 && strafedLeft.torso[1] > 0.05 && strafedLeft.legsZ[0] < -0.05 && Math.abs(strafedLeft.head[0] - actor1.pitch) < 0.001, JSON.stringify({ right: strafed, left: strafedLeft }));

  await wheel(1, 60);
  await settle("trailing", 0);
  await b.sleep(500);
  const trailing = await b.evaluate(`(() => { const B = window.__ooga, cave = B.crew.player; return { mode: B.pilot.mode, mix: B.pilot.closeMix, selected: cave && cave.traits.name, headVisible: cave && cave.parts.head.visible, headCameraHidden: cave && cave.parts.head.cameraHidden, dist: B.pilot.orbit.dist }; })()`);
  record("hub perspective: outward scroll restores the normal trailing camera without deselecting the Ooga", trailing.mode === "trailing" && trailing.mix === 0 && trailing.selected === picked && trailing.headVisible && !trailing.headCameraHidden && Math.abs(trailing.dist - 6) < 0.01, JSON.stringify(trailing));

  await b.evaluate(`(() => { const B = window.__ooga, o = B.pilot.orbit; o.yaw = o.tYaw = 0.73; B.crew.player.root.rotation.y = -1.4; })()`);
  await b.send("Input.dispatchKeyEvent", { type: "keyDown", key: "ArrowUp" });
  await b.sleep(120);
  const forwardHeading = await b.evaluate(`({ body: window.__ooga.crew.player.root.rotation.y, camera: window.__ooga.pilot.orbit.yaw + Math.PI })`);
  await b.send("Input.dispatchKeyEvent", { type: "keyUp", key: "ArrowUp" });
  await b.send("Input.dispatchKeyEvent", { type: "keyDown", key: "ArrowDown" });
  await b.sleep(120);
  const backwardHeading = await b.evaluate(`({ body: window.__ooga.crew.player.root.rotation.y, camera: window.__ooga.pilot.orbit.yaw })`);
  await b.send("Input.dispatchKeyEvent", { type: "keyUp", key: "ArrowDown" });
  record("hub perspective: forward and back snap the trailing Ooga exactly toward and away from the camera heading", angleError(forwardHeading.body, forwardHeading.camera) < 0.000001 && angleError(backwardHeading.body, backwardHeading.camera) < 0.000001, JSON.stringify({ forwardHeading, backwardHeading }));

  for (let i = 0; i < 3; i++) {
    await wheel(5, -60);
    await settle("first-person", 1);
    await wheel(1, 60);
    await settle("trailing", 0);
  }
  const stable = await b.evaluate(`(() => { const B = window.__ooga, cave = B.crew.player, stats = B.stats(); return { mode: B.pilot.mode, mix: B.pilot.closeMix, selected: cave && cave.traits.name, headVisible: cave && cave.parts.head.visible, headCameraHidden: cave && cave.parts.head.cameraHidden, nodes: stats.allNodes, built: stats.built, targets: B.input.targetCount }; })()`);
  record("hub perspective: repeated first-person crossings do not flicker, lose selection, or accumulate resources", stable.mode === "trailing" && stable.mix === 0 && stable.selected === picked && stable.headVisible && !stable.headCameraHidden && stable.nodes - stable.built === base.nodes - base.built && stable.targets === base.targets, JSON.stringify({ base, stable }));

  const terrainSetup = await b.evaluate(`(() => { const B = window.__ooga, cave = B.crew.player, island = B.island, o = B.pilot.orbit, heights = []; for (let z = -21; z >= -26.001; z -= 0.25) heights.push(island.surfaceAt(0, z)); B.pilot.release(true); cave.root.position.x = 0; cave.root.position.z = -21; cave.root.position.y = cave.baseY + island.surfaceAt(0, -21); cave.hop = cave.hopV = 0; cave.root.rotation.y = Math.PI; B.pilot.possess(cave); o.yaw = o.tYaw = 0; o.pitch = o.tPitch = 0; o.dist = o.tDist = 3.5; return { heights, verts: island.geometry.verts.length, faces: island.geometry.faces.length }; })()`);
  await b.sleep(100);
  await wheel(1, -60);
  await settle("first-person", 1);
  const traverse = async (key, limit, comparison) => {
    await b.send("Input.dispatchKeyEvent", { type: "keyDown", key, text: key });
    const result = await b.evaluate(`new Promise((resolve) => { const B = window.__ooga, cave = B.crew.player, leg = cave.parts.legL, eyeHeight = cave.headOffset * 0.95, start = performance.now(), levels = new Set(), done = (z) => z ${comparison} ${limit}, state = { samples: 0, levels: 0, minGround: Infinity, maxGround: -Infinity, maxRootStep: 0, maxEyeStep: 0, maxEyeError: 0, maxFootError: 0, maxLift: 0, easedBoundaries: 0, liftSamples: 0 }, tick = () => { const p = cave.root.position, ground = p.y - cave.baseY, eye = ground + eyeHeight + cave.viewLift, foot = p.y + leg.position.y - cave.baseY * leg.scale.y, previous = state.previousGround; levels.add(ground); state.samples++; state.minGround = Math.min(state.minGround, ground); state.maxGround = Math.max(state.maxGround, ground); state.maxEyeError = Math.max(state.maxEyeError, Math.abs(B.camera.position.y - eye)); state.maxFootError = Math.max(state.maxFootError, Math.abs(foot - ground)); state.maxLift = Math.max(state.maxLift, Math.abs(cave.viewLift)); if (Math.abs(cave.viewLift) > 0.005) state.liftSamples++; if (previous !== undefined) { const rootStep = Math.abs(ground - previous), eyeStep = Math.abs(B.camera.position.y - state.previousEye); state.maxRootStep = Math.max(state.maxRootStep, rootStep); state.maxEyeStep = Math.max(state.maxEyeStep, eyeStep); if (rootStep > 0.1 && eyeStep < rootStep * 0.8) state.easedBoundaries++; } state.previousGround = ground; state.previousEye = B.camera.position.y; if (done(p.z) || performance.now() - start > 3500) { state.levels = levels.size; state.z = p.z; delete state.previousGround; delete state.previousEye; resolve(state); } else requestAnimationFrame(tick); }; requestAnimationFrame(tick); })`);
    await b.send("Input.dispatchKeyEvent", { type: "keyUp", key });
    return result;
  };
  const ascent = await traverse("w", -25.8, "<=");
  await b.sleep(350);
  await b.evaluate(`(() => { const B = window.__ooga, o = B.pilot.orbit; o.yaw = o.tYaw = Math.PI; })()`);
  await b.sleep(100);
  const descent = await traverse("w", -21.2, ">=");
  record("hub perspective: first-person ascent and descent ease across consecutive voxel steps while both feet retain exact support", ascent.levels >= 4 && descent.levels >= 4 && ascent.maxRootStep >= 0.24 && descent.maxRootStep >= 0.24 && ascent.easedBoundaries >= 2 && descent.easedBoundaries >= 2 && ascent.liftSamples > 5 && descent.liftSamples > 5 && ascent.maxEyeError < 0.001 && descent.maxEyeError < 0.001 && ascent.maxFootError < 0.000001 && descent.maxFootError < 0.000001, JSON.stringify({ ascent, descent }));

  // Measure exact airborne intervals. A delayed protocol reply under parallel
  // browser load must not let this short fall land before its pose is sampled.
  const airbornePose = (falling) => b.evaluate(`(() => { const B = window.__ooga, scene = window.BL.scenes.hub, cave = B.crew.player; if (${falling}) { cave.hop = 1.2; cave.hopV = -3; cave.root.position.y = cave.baseY + B.island.surfaceAt(cave.root.position.x, cave.root.position.z) + cave.hop; } else cave.hopV = 3; let elapsed = B.matrixCave.world.sampleStream(0).time; for (let i = 0; i < ${falling ? 12 : 18}; i++) scene.update(1 / 120, elapsed += 1 / 120); const eye = cave.root.position.y - cave.baseY + cave.headOffset * 0.95; return { hop: cave.hop, velocity: cave.hopV, lift: cave.viewLift, groundLift: B.pilot.groundLift, eyeError: Math.abs(B.camera.position.y - eye) }; })()`);
  const airborne = await airbornePose(false), falling = await airbornePose(true);
  record("hub perspective: jumps and large falling drops bypass step smoothing and keep the first-person eye synchronized", airborne.hop > 0 && Math.abs(airborne.lift) < 0.000001 && Math.abs(airborne.groundLift) < 0.000001 && airborne.eyeError < 0.001 && falling.hop > 0 && falling.velocity < 0 && Math.abs(falling.lift) < 0.000001 && Math.abs(falling.groundLift) < 0.000001 && falling.eyeError < 0.001, JSON.stringify({ rising: airborne, falling }));
  await wheel(1, 60);
  await settle("trailing", 0);
  const terrainRestored = await b.evaluate(`(() => { const B = window.__ooga, cave = B.crew.player, heights = []; for (let z = -21; z >= -26.001; z -= 0.25) heights.push(B.island.surfaceAt(0, z)); return { heights, verts: B.island.geometry.verts.length, faces: B.island.geometry.faces.length, lift: cave.viewLift, legs: [cave.parts.legL.scale.y, cave.parts.legR.scale.y] }; })()`);
  record("hub perspective: leaving first person during a fall clears visual offsets and does not alter terrain geometry", terrainRestored.lift === 0 && terrainRestored.legs.every((v) => v === 1) && terrainRestored.verts === terrainSetup.verts && terrainRestored.faces === terrainSetup.faces && terrainRestored.heights.every((v, i) => v === terrainSetup.heights[i]), JSON.stringify({ setup: terrainSetup, restored: terrainRestored }));

  await b.evaluate(`(() => { const B = window.__ooga, cave = B.crew.player, o = B.pilot.orbit; cave.root.position.x = 0; cave.root.position.z = -21; cave.root.position.y = cave.baseY + B.island.surfaceAt(0, -21); cave.hop = cave.hopV = 0; cave.root.rotation.y = Math.PI; o.yaw = o.tYaw = 0; o.pitch = o.tPitch = 0.35; })()`);
  await b.sleep(150);
  // This hillside rises one unit per unit traveled. Measure its continuous
  // grade and the camera rate independently of irregular rendered intervals.
  const traverseTrailing = async (limit, comparison) => {
    await b.send("Input.dispatchKeyEvent", { type: "keyDown", key: "w", text: "w" });
    const result = await b.evaluate(`new Promise((resolve) => { const B = window.__ooga, cave = B.crew.player, leg = cave.parts.legL, start = performance.now(), levels = new Set(), done = (z) => z ${comparison} ${limit}, state = { samples: 0, levels: 0, maxRootStep: 0, maxVisualStep: 0, maxVisualSlope: 0, maxCameraStep: 0, maxCameraRate: 0, maxOrbitError: 0, maxCameraAt: null, maxFootError: 0, easedBodyBoundaries: 0, easedCameraBoundaries: 0, liftSamples: 0 }, tick = () => { const p = cave.root.position, ground = p.y - cave.baseY, visual = p.y + cave.viewLift, foot = p.y + leg.position.y - cave.baseY * leg.scale.y, previous = state.previousGround, time = B.renderOpts.matrix.time; levels.add(ground); state.samples++; const o = B.pilot.orbit, pitch = B.pilot.viewPitch, cp = Math.cos(pitch), eye = B.camera.position; state.maxOrbitError = Math.max(state.maxOrbitError, Math.hypot(eye.x - o.tx - Math.sin(o.yaw) * cp * o.dist, eye.y - o.ty - Math.sin(pitch) * o.dist, eye.z - o.tz - Math.cos(o.yaw) * cp * o.dist)); state.maxFootError = Math.max(state.maxFootError, Math.abs(foot - ground)); if (Math.abs(cave.viewLift) > 0.005) state.liftSamples++; if (previous !== undefined) { const rootStep = Math.abs(ground - previous), visualStep = Math.abs(visual - state.previousVisual), cameraStep = Math.abs(B.camera.position.y - state.previousCamera); state.maxRootStep = Math.max(state.maxRootStep, rootStep); state.maxVisualStep = Math.max(state.maxVisualStep, visualStep); state.maxVisualSlope = Math.max(state.maxVisualSlope, visualStep / Math.max(1e-9, Math.hypot(p.x - state.previousX, p.z - state.previousZ))); state.maxCameraRate = Math.max(state.maxCameraRate, cameraStep / Math.max(1e-9, time - state.previousTime)); if (cameraStep > state.maxCameraStep) { state.maxCameraStep = cameraStep; state.maxCameraAt = { z: p.z, ground, visual, lift: cave.viewLift, cameraY: B.camera.position.y, previousCamera: state.previousCamera, cave: B.cameraCave.index, mode: B.pilot.mode }; } if (rootStep > 0.1 && visualStep < rootStep * 0.8) state.easedBodyBoundaries++; if (rootStep > 0.1 && cameraStep < rootStep * 0.8) state.easedCameraBoundaries++; } state.previousX = p.x; state.previousZ = p.z; state.previousTime = time; state.previousGround = ground; state.previousVisual = visual; state.previousCamera = B.camera.position.y; if (done(p.z) || performance.now() - start > 3500) { state.levels = levels.size; state.z = p.z; delete state.previousX; delete state.previousZ; delete state.previousTime; delete state.previousGround; delete state.previousVisual; delete state.previousCamera; resolve(state); } else requestAnimationFrame(tick); }; requestAnimationFrame(tick); })`);
    await b.send("Input.dispatchKeyEvent", { type: "keyUp", key: "w" });
    return result;
  };
  const trailingAscent = await traverseTrailing(-25.8, "<=");
  await b.sleep(200);
  await b.evaluate(`(() => { const o = window.__ooga.pilot.orbit; o.yaw = o.tYaw = Math.PI; })()`);
  await b.sleep(100);
  const trailingDescent = await traverseTrailing(-21.2, ">=");
  const trailingTerrain = await b.evaluate(`(() => { const B = window.__ooga, cave = B.crew.player, heights = []; for (let z = -21; z >= -26.001; z -= 0.25) heights.push(B.island.surfaceAt(0, z)); return { mode: B.pilot.mode, heights, verts: B.island.geometry.verts.length, faces: B.island.geometry.faces.length, footL: cave.root.position.y + cave.parts.legL.position.y - cave.baseY * cave.parts.legL.scale.y, footR: cave.root.position.y + cave.parts.legR.position.y - cave.baseY * cave.parts.legR.scale.y, ground: cave.root.position.y - cave.baseY }; })()`);
  const ascentBoundaries = Math.floor(trailingAscent.levels * 0.6), descentBoundaries = Math.floor(trailingDescent.levels * 0.6);
  record("hub perspective: third-person walking smooths the steep hillside while the camera retains its exact chosen orbit", trailingTerrain.mode === "trailing" && trailingAscent.levels >= 4 && trailingDescent.levels >= 4 && trailingAscent.easedBodyBoundaries >= ascentBoundaries && trailingDescent.easedBodyBoundaries >= descentBoundaries && trailingAscent.easedCameraBoundaries >= ascentBoundaries && trailingDescent.easedCameraBoundaries >= descentBoundaries && trailingAscent.maxVisualSlope <= 1.25 && trailingDescent.maxVisualSlope <= 1.25 && trailingAscent.maxOrbitError < 0.000001 && trailingDescent.maxOrbitError < 0.000001 && trailingAscent.liftSamples > 20 && trailingDescent.liftSamples > 20 && trailingAscent.maxFootError < 0.000001 && trailingDescent.maxFootError < 0.000001 && Math.abs(trailingTerrain.footL - trailingTerrain.ground) < 0.000001 && Math.abs(trailingTerrain.footR - trailingTerrain.ground) < 0.000001, JSON.stringify({ ascent: trailingAscent, descent: trailingDescent, terrain: trailingTerrain }));
  record("hub perspective: third-person smoothing leaves the photographed hillside geometry and support heights unchanged", trailingTerrain.verts === terrainSetup.verts && trailingTerrain.faces === terrainSetup.faces && trailingTerrain.heights.every((v, i) => v === terrainSetup.heights[i]), JSON.stringify({ setup: terrainSetup, terrain: trailingTerrain }));

  await b.evaluate(`(() => { const B = window.__ooga, cave = B.crew.player, item = window.BL.models.SWAG.find((v) => v.id === "crown"), entry = B.game.addItem({ item, tier: item.tier, donationId: "first-person-reflection" }), m = B.mouths.find((v) => v.id === "c1"), o = B.pilot.orbit; B.game.assign(entry.id, cave.traits.name); B.applyAllSwag(); B.pilot.release(true); cave.root.position.x = m.apron.x; cave.root.position.z = m.apron.z; cave.root.position.y = cave.baseY; cave.hop = cave.hopV = 0; cave.root.rotation.y = Math.atan2(m.x - m.apron.x, m.z - m.apron.z); B.pilot.possess(cave); o.yaw = o.tYaw = cave.root.rotation.y + Math.PI; o.pitch = o.tPitch = 0.25; o.dist = o.tDist = 3.5; })()`);
  await b.sleep(200);
  await wheel(1, -60);
  await settle("first-person", 1);
  await b.evaluate(`window.__ooga.pilot.orbit.tPitch = 0.55`);
  await b.sleep(500);
  const reflectedHead = await b.evaluate(`(() => { const B = window.__ooga, cave = B.crew.player, head = cave.parts.head, mirror = B.mirror, count = (node) => (node.geometry ? 1 : 0) + node.children.reduce((n, child) => n + count(child), 0); return { visible: head.visible, cameraHidden: head.cameraHidden, mirrorActive: mirror.active, portal: mirror.portal, captureValid: mirror.captureValid, reflectionOnlyCount: mirror.reflectionOnlyCount, reflectedParts: count(head), bodyHeading: cave.root.rotation.y, viewHeading: B.pilot.orbit.yaw + Math.PI, headPitch: head.rotation.x, viewPitch: B.pilot.orbit.pitch }; })()`);
  record("hub perspective: the reflected first-person Ooga preserves body heading, head pitch, hats, and face accessories", reflectedHead.visible && reflectedHead.cameraHidden && reflectedHead.mirrorActive && !reflectedHead.portal && reflectedHead.captureValid && reflectedHead.reflectedParts > 1 && reflectedHead.reflectionOnlyCount >= reflectedHead.reflectedParts && angleError(reflectedHead.bodyHeading, reflectedHead.viewHeading) < 0.001 && reflectedHead.headPitch > 0.5 && Math.abs(reflectedHead.headPitch - reflectedHead.viewPitch) < 0.001, JSON.stringify(reflectedHead));
  await b.send("Input.dispatchKeyEvent", { type: "keyDown", key: "s", text: "s" });
  await b.sleep(250);
  const reflectedWalk = await b.evaluate(`(() => { const B = window.__ooga, cave = B.crew.player; return { active: B.mirror.active, captureValid: B.mirror.captureValid, phase: cave.act.phase, backwardLean: cave.parts.torso.rotation.x, bodyHeading: cave.root.rotation.y, viewHeading: B.pilot.orbit.yaw + Math.PI, headPitch: cave.parts.head.rotation.x, viewPitch: B.pilot.orbit.pitch }; })()`);
  await b.send("Input.dispatchKeyEvent", { type: "keyUp", key: "s" });
  record("hub perspective: the Mirror Cave capture retains the backward gait and current first-person pose", reflectedWalk.active && reflectedWalk.captureValid && reflectedWalk.phase < 0 && reflectedWalk.backwardLean > 0.05 && angleError(reflectedWalk.bodyHeading, reflectedWalk.viewHeading) < 0.001 && Math.abs(reflectedWalk.headPitch - reflectedWalk.viewPitch) < 0.001, JSON.stringify(reflectedWalk));
  await b.send("Input.dispatchKeyEvent", { type: "keyDown", key: "w", text: "w" });
  const caveEntered = await b.evaluate(`new Promise((resolve) => { const B = window.__ooga, expected = B.matrixCave.world.permanentCave, start = performance.now(), tick = () => { if (B.cameraCave.playerIndex === expected && B.cameraCave.index === expected || performance.now() - start > 6000) { const cave = B.crew.player, p = cave.root.position, h = cave.root.rotation.y, m = B.mouths.find((v) => v.id === "c1"), eye = [p.x + Math.sin(h) * 0.16, p.y - cave.baseY + cave.headOffset * 0.95, p.z + Math.cos(h) * 0.16]; resolve({ scene: B.scene, expected, playerIndex: B.cameraCave.playerIndex, cameraIndex: B.cameraCave.index, actor: [p.x, p.y, p.z], apron: [m.apron.x, m.apron.z], mouth: [m.x, m.z], eyeError: Math.hypot(eye[0] - B.camera.position.x, eye[1] - B.camera.position.y, eye[2] - B.camera.position.z) }); } else requestAnimationFrame(tick); }; tick(); })`);
  await b.send("Input.dispatchKeyEvent", { type: "keyUp", key: "w" });
  const exitReleased = await untilPage(b, `(() => { const G = B.matrixGate, gate = G.gates.find((entry) => entry.mouth.id === "c1"), cave = B.crew.player, p = cave.root.position; if (!gate.localOpen) G.openNear(p.x, p.y - cave.baseY + 1.1, p.z); return gate.localOpen && gate.node.position.y === G.hiddenHeight; })()`);
  await b.send("Input.dispatchKeyEvent", { type: "keyDown", key: "s", text: "s" });
  const caveExited = await b.evaluate(`new Promise((resolve) => { const B = window.__ooga, m = B.mouths.find((v) => v.id === "c1"), sr = Math.sin(m.ry), cr = Math.cos(m.ry), start = performance.now(), tick = () => { const cave = B.crew.player, p = cave.root.position, outside = sr * (p.x - m.x) + cr * (p.z - m.z); if (!B.cameraCave.playerIndex && !B.cameraCave.index && outside >= 0.7 || performance.now() - start > 6000) { const h = cave.root.rotation.y, eye = [p.x + Math.sin(h) * 0.16, p.y - cave.baseY + cave.headOffset * 0.95, p.z + Math.cos(h) * 0.16]; resolve({ scene: B.scene, playerIndex: B.cameraCave.playerIndex, cameraIndex: B.cameraCave.index, outside, eyeError: Math.hypot(eye[0] - B.camera.position.x, eye[1] - B.camera.position.y, eye[2] - B.camera.position.z) }); } else requestAnimationFrame(tick); }; tick(); })`);
  await b.send("Input.dispatchKeyEvent", { type: "keyUp", key: "s" });
  record("hub perspective: first-person eye anchoring survives a low Mirror Cave entry and gate release before exit", exitReleased && caveEntered.scene === "hub" && caveEntered.playerIndex === caveEntered.expected && caveEntered.cameraIndex === caveEntered.expected && caveEntered.eyeError < 0.001 && caveExited.scene === "hub" && caveExited.playerIndex === 0 && caveExited.cameraIndex === 0 && caveExited.eyeError < 0.001, JSON.stringify({ exitReleased, caveEntered, caveExited }));

  await b.evaluate(`window.__ooga.pilot.release(true)`);
  await b.sleep(100);
  await b.evaluate(`(() => { const B = window.__ooga, cave = B.cavemen.get(${JSON.stringify(picked)}), m = B.mouths.find((v) => v.id === "c9"), o = B.pilot.orbit; cave.root.position.x = m.apron.x; cave.root.position.z = m.apron.z; cave.root.position.y = cave.baseY; cave.hop = cave.hopV = 0; cave.root.rotation.y = Math.atan2(m.x - m.apron.x, m.z - m.apron.z); B.pilot.possess(cave); o.yaw = o.tYaw = cave.root.rotation.y + Math.PI; o.pitch = o.tPitch = 0.25; o.dist = o.tDist = 3.5; })()`);
  await b.sleep(200);
  await wheel(1, -60);
  await settle("first-person", 1);
  const caveView = await b.evaluate(`({ mode: window.__ooga.pilot.mode, cameraY: window.__ooga.camera.position.y, playerIndex: window.__ooga.cameraCave.playerIndex })`);
  await b.send("Input.dispatchKeyEvent", { type: "keyDown", key: "w", text: "w" });
  const entered = await b.evaluate(`new Promise((resolve) => { const B = window.__ooga, m = B.mouths.find((m) => m.id === "c9"), target = { x: m.x - Math.sin(m.ry) * 3.6, z: m.z - Math.cos(m.ry) * 3.6 }, start = performance.now(), tick = () => { const p = B.crew.player?.root.position, distance = p ? Math.hypot(p.x - target.x, p.z - target.z) : Infinity; if (B.scene !== "hub" || distance < 3.1 || performance.now() - start > 6000) resolve({ scene: B.scene, distance, cameraY: B.camera.position.y, ms: Math.round(performance.now() - start) }); else requestAnimationFrame(tick); }; tick(); })`);
  await b.send("Input.dispatchKeyEvent", { type: "keyUp", key: "w" });
  await untilPage(b, 'document.getElementById("act").textContent === "START RALLY"');
  const waiting = await b.evaluate(`({ scene: window.__ooga.scene, mode: window.__ooga.pilot.mode, action: document.getElementById("act").textContent })`);
  await b.key(" ");
  const started = await untilPage(b, 'B.scene === "race" && B.race.phase === "garage"');
  record("hub perspective: first person stays low through the cave entrance and waits for Space to start Rally", caveView.mode === "first-person" && caveView.cameraY < 3 && entered.scene === "hub" && entered.distance < 3.1 && entered.cameraY < 3 && waiting.scene === "hub" && waiting.mode === "first-person" && waiting.action === "START RALLY" && started, JSON.stringify({ caveView, entered, waiting, started }));
});

const hubTrailingCaveSplit = () => withPage("hub trailing cave split", hubPage(src), async (b) => {
  const result = await b.evaluate(`(() => {
    const B = window.__ooga, scene = window.BL.scenes.hub, opening = B.cameraCave.openings.find((entry) => entry.id === "c5"), m = opening.mouth, o = B.pilot.orbit;
    const cave = [...B.cavemen.values()].find((entry) => entry.state === "working" && !entry.walk && !entry.build), dt = 1 / 120;
    let elapsed = B.matrixCave.world.sampleStream(0).time, rawSamples = 0, maxOrbitError = 0, bodyViolations = 0, maxSupportError = 0;
    const start = { x: m.x + opening.sr * 0.9, y: m.floorY, z: m.z + opening.cr * 0.9 };
    const sample = () => { const p = B.camera.position, dx = p.x - m.x, dz = p.z - m.z; return { x: dx * opening.cr - dz * opening.sr, y: p.y - m.floorY, z: dx * opening.sr + dz * opening.cr, player: B.cameraCave.playerIndex, camera: B.cameraCave.index, entrance: B.cameraCave.entranceIndex, constraint: B.cameraCave.constraint, yaw: o.yaw, targetYaw: o.tYaw, access: B.cameraCave.accessRamp, assist: B.cameraCave.rampAssist, chosen: o.tDist }; };
    // The step band straddles a slope; test exact foot support separately
    // from the full torso/head cylinder above that band.
    const step = () => { scene.update(dt, elapsed += dt); const eye = B.camera.position, body = cave.root.position, pitch = B.pilot.viewPitch, cp = Math.cos(pitch); rawSamples++; maxOrbitError = Math.max(maxOrbitError, Math.hypot(eye.x - o.tx - Math.sin(o.yaw) * cp * o.dist, eye.y - o.ty - Math.sin(pitch) * o.dist, eye.z - o.tz - Math.cos(o.yaw) * cp * o.dist)); const feet = body.y - cave.baseY; maxSupportError = Math.max(maxSupportError, Math.abs(feet - B.island.supportAt(body.x, body.z, feet, 0.6, -120, 0.3))); if (!B.island.clearAt(body.x, feet + 0.3, body.z, 0.3, cave.bodyHeight - 0.3)) bodyViolations++; return sample(); };
    B.pilot.release(true); B.pilot.possess(cave);
    // A wide chosen view bypasses ramp assistance. Keep the pilot's moving
    // follow target and walk through the mouth on the actual sloping floor.
    B.pilot.navigate({ position: start, yaw: m.ry, pitch: 0.08, dist: 12 });
    for (let i = 0; i < 8; i++) step();
    let previous = sample(), entryMaxYStep = 0;
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "w" }));
    try { for (let i = 0; i < 120; i++) { const next = step(); entryMaxYStep = Math.max(entryMaxYStep, Math.abs(next.y - previous.y)); previous = next; const p = cave.root.position; if ((p.x - m.x) * opening.sr + (p.z - m.z) * opening.cr <= -3.5) break; } }
    finally { window.dispatchEvent(new KeyboardEvent("keyup", { key: "w" })); }
    for (let i = 0; i < 180; i++) previous = step();
    const split = sample();
    const orbit = (dx) => { const before = sample(); B.pilot.hooks.onOrbit(dx, 0); const immediate = step(); let last = immediate, maxYStep = Math.abs(immediate.y - before.y), maxAt = { frame: 0, before, after: immediate, horizontal: Math.hypot(immediate.x - before.x, immediate.z - before.z) }, cameraChanges = immediate.camera !== split.camera ? 1 : 0, playerChanges = immediate.player !== split.player ? 1 : 0, entranceFrames = immediate.constraint === "entrance" ? 1 : 0, exteriorFrames = immediate.constraint === "exterior" ? 1 : 0; for (let i = 1; i < 60; i++) { const next = step(), yStep = Math.abs(next.y - last.y); if (yStep > maxYStep) { maxYStep = yStep; maxAt = { frame: i, before: last, after: next, horizontal: Math.hypot(next.x - last.x, next.z - last.z) }; } if (next.camera !== split.camera) cameraChanges++; if (next.player !== split.player) playerChanges++; if (next.constraint === "entrance") entranceFrames++; else if (next.constraint === "exterior") exteriorFrames++; last = next; } const settled = sample(), postInputDrift = Math.hypot(settled.x - immediate.x, settled.y - immediate.y, settled.z - immediate.z); for (let i = 0; i < 60; i++) step(); const idle = sample(); return { before, immediate, immediateMove: Math.hypot(immediate.x - before.x, immediate.z - before.z), immediateYawError: Math.abs(Math.atan2(Math.sin(immediate.targetYaw - immediate.yaw), Math.cos(immediate.targetYaw - immediate.yaw))), postInputDrift, maxYStep, maxAt, cameraChanges, playerChanges, entranceFrames, exteriorFrames, settled, idle, idleDrift: Math.hypot(idle.x - settled.x, idle.y - settled.y, idle.z - settled.z), yawError: Math.abs(Math.atan2(Math.sin(idle.targetYaw - idle.yaw), Math.cos(idle.targetYaw - idle.yaw))) }; };
    const left = orbit(105), right = orbit(-210); return { cave: opening.caveIndex, entryMaxYStep, rawSamples, maxOrbitError, bodyViolations, maxSupportError, split, left, right, terrain: { verts: B.island.geometry.verts.length, faces: B.island.geometry.faces.length } };
  })()`);
  const stable = (turn) => turn.immediateMove > 1 && turn.immediateYawError < 0.000001 && turn.postInputDrift < 0.01 && turn.playerChanges === 0 && turn.idleDrift < 0.01 && turn.yawError < 0.001;
  record("hub trailing cave split: the Ooga and camera retain independent cave admission while orbiting across the mouth", result.split.player === result.cave && result.split.camera === 0 && result.split.chosen === 12 && result.split.access && !result.split.assist && result.split.constraint === "exterior" && result.split.z > 0.5 && stable(result.left) && stable(result.right), JSON.stringify(result));
  record("hub trailing cave split: wide orbit follows its exact requested pose while the Ooga walks the physical ramp", result.rawSamples > 300 && result.maxOrbitError < 0.000001 && result.bodyViolations === 0 && result.maxSupportError < 0.000001 && result.left.immediateMove > 1 && result.right.immediateMove > 1 && result.left.postInputDrift < 0.01 && result.right.postInputDrift < 0.01, JSON.stringify({ entry: result.entryMaxYStep, rawSamples: result.rawSamples, orbitError: result.maxOrbitError, bodyViolations: result.bodyViolations, supportError: result.maxSupportError, left: { move: result.left.immediateMove, yaw: result.left.immediateYawError, drift: result.left.postInputDrift }, right: { move: result.right.immediateMove, yaw: result.right.immediateYawError, drift: result.right.postInputDrift } }));
  const state = () => b.evaluate(`(() => { const B = window.__ooga, o = B.pilot.orbit, p = B.camera.position; const pitch = B.pilot.viewPitch, cp = Math.cos(pitch); return { player: B.cameraCave.playerIndex, camera: B.cameraCave.index, yaw: o.yaw, targetYaw: o.tYaw, orbitError: Math.hypot(p.x - o.tx - Math.sin(o.yaw) * cp * o.dist, p.y - o.ty - Math.sin(pitch) * o.dist, p.z - o.tz - Math.cos(o.yaw) * cp * o.dist), position: [p.x, p.y, p.z] }; })()`);
  const beforeInput = await state();
  await b.drag({ x: 720, y: 450 }, { x: 560, y: 450 }, 8);
  await b.sleep(60);
  const mouseApplied = await state();
  await b.sleep(500);
  const mouse = await state();
  await b.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: 720, y: 450 }] });
  await b.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: 560, y: 450 }] });
  await b.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await b.sleep(60);
  const touchApplied = await state();
  await b.sleep(500);
  const touch = await state(), angle = (a, z) => Math.abs(Math.atan2(Math.sin(a - z), Math.cos(a - z))), drift = (a, z) => Math.hypot(a.position[0] - z.position[0], a.position[1] - z.position[1], a.position[2] - z.position[2]);
  record("hub trailing cave split: mouse and touch orbit apply large turns immediately and stop without delayed motion", angle(mouseApplied.yaw, beforeInput.yaw) > 0.5 && angle(touchApplied.yaw, mouse.yaw) > 0.5 && drift(mouse, mouseApplied) < 0.03 && drift(touch, touchApplied) < 0.03 && [mouseApplied, mouse, touchApplied, touch].every((sample) => sample.player === result.cave && sample.orbitError < 0.000001 && sample.position.every(Number.isFinite) && angle(sample.yaw, sample.targetYaw) < 0.001), JSON.stringify({ beforeInput, mouseApplied, mouse, touchApplied, touch }));
});

const hubPerspectiveTouch = () => withPage("hub perspective touch", hubPage(src), async (b) => {
  const pinch = async (from, to) => {
    await b.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: from });
    await b.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: to });
    await b.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  };
  await b.evaluate(`(() => { const B = window.__ooga, target = { x: 0, y: 1.1, z: 10 }; B.pilot.navigate({ position: target, target, yaw: 0, pitch: 0, dist: 3.5 }); })()`);
  await pinch([{ x: 145, y: 420 }, { x: 245, y: 420 }], [{ x: 95, y: 420 }, { x: 295, y: 420 }]);
  await b.sleep(900);
  const eye = await b.evaluate(`(() => { const B = window.__ooga; return { mode: B.pilot.mode, mix: B.pilot.closeMix, yaw: B.pilot.orbit.yaw, pitch: B.pilot.orbit.pitch, p: [B.camera.position.x, B.camera.position.y, B.camera.position.z] }; })()`);
  await b.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: 40, y: 400 }] });
  await b.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: 350, y: 80 }] });
  await b.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await b.sleep(500);
  const looked = await b.evaluate(`(() => { const B = window.__ooga; return { yaw: B.pilot.orbit.yaw, pitch: B.pilot.orbit.pitch, p: [B.camera.position.x, B.camera.position.y, B.camera.position.z] }; })()`);
  record("hub perspective touch: one-finger look swivels at eye level without moving the viewpoint", Math.abs(looked.yaw - eye.yaw) > 0.8 && Math.abs(looked.pitch - eye.pitch) > 0.8 && Math.hypot(looked.p[0] - eye.p[0], looked.p[1] - eye.p[1], looked.p[2] - eye.p[2]) < 0.01, JSON.stringify({ eye, looked }));
  await pinch([{ x: 95, y: 420 }, { x: 295, y: 420 }], [{ x: 145, y: 420 }, { x: 245, y: 420 }]);
  await b.sleep(900);
  const orbit = await b.evaluate(`({ mode: window.__ooga.pilot.mode, mix: window.__ooga.pilot.closeMix })`);
  record("hub perspective touch: pinch enters eye level and reverses smoothly back to orbit", eye.mode === "eye-level" && eye.mix === 1 && orbit.mode === "orbit" && orbit.mix === 0, JSON.stringify({ eye, orbit }));
  await b.evaluate(`(() => { const B = window.__ooga, cave = [...B.cavemen.values()].find((v) => v.state === "working" && !v.walk && !v.build), o = B.pilot.orbit; B.pilot.possess(cave); o.tDist = o.dist = 3.5; })()`);
  await pinch([{ x: 145, y: 420 }, { x: 245, y: 420 }], [{ x: 95, y: 420 }, { x: 295, y: 420 }]);
  await b.sleep(900);
  const first = await b.evaluate(`(() => { const B = window.__ooga, cave = B.crew.player; return { mode: B.pilot.mode, mix: B.pilot.closeMix, selected: cave && cave.traits.name, headVisible: cave && cave.parts.head.visible, headCameraHidden: cave && cave.parts.head.cameraHidden }; })()`);
  await pinch([{ x: 95, y: 420 }, { x: 295, y: 420 }], [{ x: 145, y: 420 }, { x: 245, y: 420 }]);
  await b.sleep(900);
  const trailing = await b.evaluate(`(() => { const B = window.__ooga, cave = B.crew.player; return { mode: B.pilot.mode, mix: B.pilot.closeMix, selected: cave && cave.traits.name, headVisible: cave && cave.parts.head.visible, headCameraHidden: cave && cave.parts.head.cameraHidden }; })()`);
  record("hub perspective touch: pinch enters first person and returns to the selected Ooga's trailing view", first.mode === "first-person" && first.mix === 1 && first.selected && first.headVisible && first.headCameraHidden && trailing.mode === "trailing" && trailing.mix === 0 && trailing.selected === first.selected && trailing.headVisible && !trailing.headCameraHidden, JSON.stringify({ first, trailing }));
}, { w: 390, h: 844, mobile: true, wait: 3000 });

const hubPerspectiveCanvas = () => withPage("hub perspective canvas", hubPage(src, "canvas2d=1"), async (b) => {
  const state = () => b.evaluate(`(() => { const B = window.__ooga, cave = B.crew.player; return { renderer: B.renderer.kind, mode: B.pilot.mode, mix: B.pilot.closeMix, selected: cave && cave.traits.name, headVisible: cave ? cave.parts.head.visible : null, headCameraHidden: cave ? cave.parts.head.cameraHidden : null }; })()`);
  await b.evaluate(`(() => { const B = window.__ooga, o = B.pilot.orbit; o.tDist = o.dist = 3.5; B.pilot.hooks.onZoom(0.85); })()`);
  await untilPage(b, 'B.pilot.mode === "eye-level" && B.pilot.closeMix === 1');
  const eye = await state();
  await b.evaluate(`(() => { const B = window.__ooga; B.pilot.hooks.onZoom(1.15); const cave = [...B.cavemen.values()].find((v) => v.state === "working" && !v.walk && !v.build), o = B.pilot.orbit; B.pilot.possess(cave); o.tDist = o.dist = 3.5; B.pilot.hooks.onZoom(0.85); })()`);
  await untilPage(b, 'B.pilot.mode === "first-person" && B.pilot.closeMix === 1');
  const first = await state();
  await b.evaluate(`window.__ooga.pilot.hooks.onZoom(1.15)`);
  await untilPage(b, 'B.pilot.mode === "trailing" && B.pilot.closeMix === 0');
  const trailing = await state();
  record("hub perspective canvas: eye-level and first-person modes retain Canvas 2D parity and restore the head", eye.renderer === "canvas2d" && eye.mode === "eye-level" && eye.mix === 1 && first.mode === "first-person" && first.mix === 1 && first.selected && first.headVisible && first.headCameraHidden && trailing.mode === "trailing" && trailing.mix === 0 && trailing.selected === first.selected && trailing.headVisible && !trailing.headCameraHidden, JSON.stringify({ eye, first, trailing }));
});

const matrixCharacterActivation = () => withPage("matrix character activation", hubPage(src), async (b) => {
  const result = await b.evaluate(`(() => {
    const B = window.__ooga, scene = window.BL.scenes.hub, C = B.matrixCave, W = C.world, m = B.mirrorCave.mouth;
    const sr = Math.sin(m.ry), cr = Math.cos(m.ry), dt = 1 / 60;
    let elapsed = W.sampleStream(0).time;
    const cave = [...B.cavemen.values()][0];
    cave.state = "working";
    cave.walk = cave.build = null;
    const place = (z) => {
      cave.root.position.x = m.x + sr * z;
      cave.root.position.y = cave.baseY + m.floorY;
      cave.root.position.z = m.z + cr * z;
      cave.hop = cave.hopV = 0;
    };
    const step = () => { scene.update(dt, elapsed += dt); B.renderer.render(scene.root, B.camera, B.renderOpts); };
    const sample = () => ({
      actorIndex: B.cameraCave.playerIndex, cameraIndex: B.cameraCave.index,
      inside: C.inside, active: W.active, radius: W.radius, direction: W.direction,
      permanentCave: W.permanentCave,
      portal: B.mirror.portal, reveal: B.mirror.reveal, nodePortal: B.mirrorCave.node.mirrorPortal,
      caves: C.caves.map((value) => ({ id: value.id, surface: value.activeGlyphCount, rain: value.rain.activeGlyphCount }))
    });
    C.viewApproach();
    B.pilot.possess(cave);
    place(0.8);
    const o = B.pilot.orbit;
    o.yaw = o.tYaw = m.ry;
    o.pitch = o.tPitch = 0.3;
    o.dist = o.tDist = 6;
    step();
    const outside = sample();
    C.viewInside(false);
    B.renderer.render(scene.root, B.camera, B.renderOpts);
    const cameraInside = sample();
    place(0.4);
    step();
    const entered = sample();
    for (let i = 0; i < 8; i++) step();
    const expanding = sample();
    place(0.6);
    step();
    const exited = sample();
    return { maxRadius: W.maxRadius, outside, cameraInside, entered, expanding, exited };
  })()`);
  const permanentOnly = (sample) => sample.permanentCave > 0 && sample.caves.every((c, i) => i + 1 === sample.permanentCave ? c.surface > 0 && c.rain > 0 : c.surface === 0 && c.rain === 0);
  record("matrix activation: the Mirror Cave stays glyph-covered while a controlled third-person camera cannot trigger the world", !result.outside.inside && !result.outside.active && permanentOnly(result.outside) && result.cameraInside.cameraIndex === result.outside.permanentCave && result.cameraInside.actorIndex === 0 && !result.cameraInside.inside && !result.cameraInside.active && result.cameraInside.radius === 0 && permanentOnly(result.cameraInside), JSON.stringify(result));
  record("matrix activation: the Ooga's entrance crossing starts a continuous pile-centered outward wave without prematurely removing the mirror", result.entered.actorIndex === result.entered.permanentCave && result.entered.inside && result.entered.active && result.entered.radius > 0 && result.entered.radius < result.maxRadius && result.entered.direction === 1 && !result.entered.portal && !result.entered.nodePortal && result.entered.reveal === 0 && result.entered.caves[result.entered.permanentCave - 1].surface > 0 && result.entered.caves[result.entered.permanentCave - 1].rain > 0 && result.expanding.radius > result.entered.radius && result.expanding.direction === 1 && !result.expanding.portal && result.expanding.reveal === 0, JSON.stringify({ entered: result.entered, expanding: result.expanding }));
  record("matrix activation: the Ooga's exit crossing closes the mirror and reverses the partial world wave while permanent room glyphs remain", result.exited.actorIndex === 0 && !result.exited.inside && result.exited.active && result.exited.radius < result.expanding.radius && result.exited.direction === -1 && !result.exited.portal && !result.exited.nodePortal && result.exited.caves[result.exited.permanentCave - 1].surface > 0 && result.exited.caves[result.exited.permanentCave - 1].rain > 0, JSON.stringify(result.exited));
});

const matrixFirstPersonBoundary = (backend) => withPage(`matrix first-person boundary ${backend}`, hubPage(src, backend === "canvas2d" ? "canvas2d=1" : ""), async (b) => {
  const result = await b.evaluate(`(() => {
    const B = window.__ooga, scene = window.BL.scenes.hub, C = B.matrixCave, W = C.world, m = B.mirrorCave.mouth;
    const sr = Math.sin(m.ry), cr = Math.cos(m.ry), dt = 1 / 60;
    let elapsed = W.sampleStream(0).time;
    const cave = [...B.cavemen.values()][0], o = B.pilot.orbit;
    cave.state = "working";
    cave.walk = cave.build = null;
    const place = (z, x = 0) => {
      cave.root.position.x = m.x + cr * x + sr * z;
      cave.root.position.y = cave.baseY + m.floorY;
      cave.root.position.z = m.z - sr * x + cr * z;
      cave.hop = cave.hopV = 0;
    };
    const step = (draw = true) => {
      scene.update(dt, elapsed += dt);
      if (draw) B.renderer.render(scene.root, B.camera, B.renderOpts);
    };
    const state = () => ({
      player: B.cameraCave.playerIndex, camera: B.cameraCave.index,
      permanent: W.permanentCave,
      inside: C.inside, active: W.active, radius: W.radius, direction: W.direction,
      portal: B.mirror.portal, reveal: B.mirror.reveal, nodePortal: B.mirrorCave.node.mirrorPortal,
      surfaceDrawn: B.mirror.surfaceDrawn,
      planeDistance: B.mirror.planeDistance,
      surfaceGlyphs: C.caves.reduce((sum, value) => sum + value.activeGlyphCount, 0),
      rainGlyphs: C.caves.reduce((sum, value) => sum + value.rain.activeGlyphCount, 0),
      cameraLocal: [
        cr * (B.camera.position.x - m.x) - sr * (B.camera.position.z - m.z),
        B.camera.position.y - m.floorY,
        sr * (B.camera.position.x - m.x) + cr * (B.camera.position.z - m.z)
      ],
      actorLocal: [
        cr * (cave.root.position.x - m.x) - sr * (cave.root.position.z - m.z),
        cave.root.position.y - cave.baseY,
        sr * (cave.root.position.x - m.x) + cr * (cave.root.position.z - m.z)
      ]
    });
    const aperture = () => {
      const vp = B.mirror.capturedViewProj;
      if (!vp) return null;
      const node = B.mirrorCave.node, g = node.geometry, T = window.BL.math.mat4;
      const p = new Float32Array(3), clip = new Float32Array(4);
      let wMin = Infinity, wMax = -Infinity, uMin = Infinity, uMax = -Infinity, vMin = Infinity, vMax = -Infinity, finite = true;
      for (let i = 0; i < g.verts.length; i += 3) {
        T.transformPoint(p, node.world, g.verts[i], g.verts[i + 1], g.verts[i + 2]);
        T.transformPoint4(clip, vp, p[0], p[1], p[2]);
        const u = clip[0] / clip[3] * 0.5 + 0.5, v = clip[1] / clip[3] * 0.5 + 0.5;
        finite = finite && [clip[0], clip[1], clip[2], clip[3], u, v].every(Number.isFinite);
        wMin = Math.min(wMin, clip[3]);
        wMax = Math.max(wMax, clip[3]);
        uMin = Math.min(uMin, u);
        uMax = Math.max(uMax, u);
        vMin = Math.min(vMin, v);
        vMax = Math.max(vMax, v);
      }
      return { finite, wMin, wMax, uMin, uMax, vMin, vMax };
    };
    C.viewApproach();
    // Reproduce the reported edge case: the stationary Ooga is one face-depth
    // outside the glass, so looking around moves the eye but not the body.
    place(0.66);
    cave.root.rotation.y = m.ry + Math.PI;
    B.pilot.possess(cave);
    o.yaw = o.tYaw = m.ry;
    o.pitch = o.tPitch = 0;
    o.dist = o.tDist = 3.5;
    B.pilot.hooks.onZoom(0.85);
    for (let i = 0; i < 60; i++) step(false);
    const views = [];
    for (const [yaw, pitch] of [[0, 0], [-1.2, -0.55], [1.2, 0.6], [-0.7, 0.7], [0.7, -0.4]]) {
      o.yaw = o.tYaw = m.ry + yaw;
      o.pitch = o.tPitch = pitch;
      step();
      views.push({
        ...state(), world: Array.from(B.mirrorCave.node.world),
        center: Array.from(B.mirror.planeCenter), normal: Array.from(B.mirror.planeNormal),
        reflectedEye: Array.from(B.mirror.cameraPosition), reflectedTarget: Array.from(B.mirror.cameraTarget),
        capturedViewProj: B.mirror.capturedViewProj ? Array.from(B.mirror.capturedViewProj) : [],
        aperture: aperture(),
        captures: B.mirror.reflectionPassCount
      });
    }
    place(0.66, 2.1);
    const edgeViews = [];
    for (const [yaw, pitch] of [[0, 0], [-1.2, -0.55], [1.2, 0.6], [-0.7, 0.7], [0.7, -0.4]]) {
      o.yaw = o.tYaw = m.ry + yaw;
      o.pitch = o.tPitch = pitch;
      step();
      edgeViews.push({
        ...state(), world: Array.from(B.mirrorCave.node.world),
        center: Array.from(B.mirror.planeCenter), normal: Array.from(B.mirror.planeNormal),
        reflectedEye: Array.from(B.mirror.cameraPosition), reflectedTarget: Array.from(B.mirror.cameraTarget),
        capturedViewProj: B.mirror.capturedViewProj ? Array.from(B.mirror.capturedViewProj) : [],
        aperture: aperture(),
        captures: B.mirror.reflectionPassCount
      });
    }
    place(1.16);
    o.yaw = o.tYaw = m.ry;
    o.pitch = o.tPitch = 0;
    step();
    const farther = { ...state(), capturedViewProj: B.mirror.capturedViewProj ? Array.from(B.mirror.capturedViewProj) : [] };
    o.yaw = o.tYaw = m.ry;
    o.pitch = o.tPitch = 0;
    place(0.5);
    step(false);
    const boundaryBeforeRender = state();
    B.renderer.render(scene.root, B.camera, B.renderOpts);
    const boundary = state();
    place(0.44);
    step(false);
    const crossedBeforeRender = state();
    B.renderer.render(scene.root, B.camera, B.renderOpts);
    const crossed = state();
    o.yaw = o.tYaw = m.ry + Math.PI;
    place(0.2);
    step();
    const insideOut = state();
    place(0.8);
    step(false);
    const exitedBeforeRender = state();
    B.renderer.render(scene.root, B.camera, B.renderOpts);
    const exited = state();
    o.yaw = o.tYaw = m.ry;
    step();
    const returned = state();
    return { backend: B.renderer.kind, maxRadius: W.maxRadius, views, edgeViews, farther, boundaryBeforeRender, boundary, crossedBeforeRender, crossed, insideOut, exitedBeforeRender, exited, returned };
  })()`);
  const label = `matrix first-person boundary ${backend}`, first = result.views[0], edge = result.edgeViews[0];
  const same = (a, z) => a.length === z.length && a.every((v, i) => Number.isFinite(v) && Math.abs(v - z[i]) < 0.00001);
  const fixed = (v, origin) => {
    const eyeRadius = Math.hypot(v.cameraLocal[0] - v.actorLocal[0], v.cameraLocal[2] - v.actorLocal[2]);
    const targetAxis = v.reflectedTarget.every((value, i) => Math.abs(value - v.reflectedEye[i] - v.normal[i]) < 0.00001);
    return !v.inside && !v.active && !v.portal && !v.nodePortal && same(v.actorLocal, origin.actorLocal) && eyeRadius >= 0.1598 && eyeRadius <= 0.16001 && v.cameraLocal[2] >= 0.50009 && same(v.world, origin.world) && same(v.center, origin.center) && same(v.normal, origin.normal) && targetAxis && (backend === "canvas2d" || v.capturedViewProj.length === 16);
  };
  record(`${label}: stationary close oblique head-look keeps the face-level eye, fixed mirror, and closed portal without projective stretching`, result.backend === backend && result.views.length === 5 && result.edgeViews.length === 5 && result.views.every((v) => fixed(v, first)) && result.edgeViews.every((v) => fixed(v, edge)), JSON.stringify({ centered: result.views, edge: result.edgeViews }));
  record(`${label}: a close edge-offset eye keeps every projective mirror coordinate finite and in front of the reflected camera`, backend === "canvas2d" ? result.edgeViews.every((v) => v.aperture === null) : result.edgeViews.every((v) => v.aperture && v.aperture.finite && v.aperture.wMin > 0.09 && v.aperture.wMax - v.aperture.wMin < 0.00001 && v.aperture.uMin >= -0.01 && v.aperture.uMax <= 1.01 && v.aperture.vMin >= -0.01 && v.aperture.vMax <= 1.01), JSON.stringify(result.edgeViews.map((v) => v.aperture)));
  record(`${label}: reflection sampling changes only after physical distance from the fixed plane changes`, result.farther.planeDistance > first.planeDistance + 0.4 && (backend === "canvas2d" || !same(result.farther.capturedViewProj, first.capturedViewProj)), JSON.stringify({ fixed: { distance: first.planeDistance, capture: first.capturedViewProj }, farther: { distance: result.farther.planeDistance, capture: result.farther.capturedViewProj } }));
  record(`${label}: a face-level eye stops at the sealed entrance until the Ooga completes a valid crossing`, result.boundaryBeforeRender.player === 0 && result.boundaryBeforeRender.camera === 0 && Math.abs(result.boundaryBeforeRender.actorLocal[2] - 0.5) < 0.00001 && result.boundaryBeforeRender.cameraLocal[2] >= 0.50009 && !result.boundaryBeforeRender.inside && !result.boundaryBeforeRender.active && !result.boundaryBeforeRender.nodePortal && !result.boundary.portal && result.boundary.surfaceDrawn, JSON.stringify({ beforeRender: result.boundaryBeforeRender, rendered: result.boundary }));
  record(`${label}: actual Ooga movement through the plane starts the outward wave while the mirror remains until that front arrives`, result.crossedBeforeRender.player === result.crossedBeforeRender.permanent && result.crossedBeforeRender.camera === result.crossedBeforeRender.permanent && result.crossedBeforeRender.actorLocal[2] < 0.5 && result.crossedBeforeRender.inside && result.crossedBeforeRender.active && result.crossedBeforeRender.radius > 0 && result.crossedBeforeRender.radius < result.maxRadius && result.crossedBeforeRender.direction === 1 && !result.crossedBeforeRender.nodePortal && result.crossedBeforeRender.reveal === 0 && result.crossedBeforeRender.surfaceGlyphs > 0 && result.crossedBeforeRender.rainGlyphs > 0 && !result.crossed.portal && result.crossed.reveal === 0, JSON.stringify({ beforeRender: result.crossedBeforeRender, rendered: result.crossed }));
  record(`${label}: the closed mirror and its wave removal are one-way and invisible from inside looking out`, result.insideOut.inside && result.insideOut.cameraLocal[2] < 0.5 && !result.insideOut.portal && result.insideOut.reveal === 0 && !result.insideOut.surfaceDrawn, JSON.stringify(result.insideOut));
  record(`${label}: the eye's outward crossing closes the fixed mirror before rendering while the short partial wave restores independently`, result.exitedBeforeRender.player === 0 && result.exitedBeforeRender.camera === 0 && result.exitedBeforeRender.cameraLocal[2] > 0.5 && !result.exitedBeforeRender.inside && result.exitedBeforeRender.radius < result.insideOut.radius && result.exitedBeforeRender.direction <= 0 && !result.exitedBeforeRender.nodePortal && result.exitedBeforeRender.surfaceGlyphs > 0 && result.exitedBeforeRender.rainGlyphs > 0 && !result.exited.portal && !result.returned.portal && result.returned.surfaceDrawn, JSON.stringify({ beforeRender: result.exitedBeforeRender, rendered: result.exited, viewed: result.returned }));
});

const hubPile = ["hub pile", async (b) => {
  await b.evaluate(`window.__ooga.setPileLevel(1000000)`);
  await b.sleep(1500);
  const perf = await b.evaluate(`new Promise((resolve) => { const B = window.__ooga; const t0 = performance.now(); let frames = 0; const f = () => { frames++; if (performance.now() - t0 < 3000) requestAnimationFrame(f); else resolve({ fps: +(frames / 3).toFixed(1), shown: B.shown }); }; requestAnimationFrame(f); })`);
  const mirror = await b.evaluate(`({ active: window.__ooga.mirror.active, passes: window.__ooga.mirror.reflectionPassCount, resources: window.__ooga.mirror.resources })`);
  record("hub: mirror and million-banana pile hold at least 50 FPS", perf.fps >= 50 && perf.shown >= 999999 && mirror.active && mirror.passes > 0 && mirror.resources === 6, `${perf.fps} fps at ${perf.shown} bananas · ${JSON.stringify(mirror)}`);
}];

// Held keys keep the camera and caveman moving
const hold = async (b, key, ms) => {
  await b.send("Input.dispatchKeyEvent", { type: "keyDown", key, text: key.length === 1 ? key : undefined });
  await b.sleep(ms);
  await b.send("Input.dispatchKeyEvent", { type: "keyUp", key });
};

const drivenSmoke = () => withPage("driven smoke", hubPage(src), async (b) => {
  // A clear straight runway, staged the way hub drive stages its chords
  const staged = await b.evaluate(`(() => { const B = window.__ooga, cave = [...B.cavemen.values()].find((c) => c.state === "working" && !c.walk && !c.build), S = B.headquarters.solids, o = B.pilot.orbit, speed = window.BL.pilot.WALK.speed; B.pilot.possess(cave); for (let radius = 8; radius <= 18; radius += 2) for (let i = 0; i < 64; i++) { const a = i / 64 * Math.PI * 2, x = Math.sin(a) * radius, z = Math.cos(a) * radius; let px = x, pz = z, clear = true; for (let t = 0; t < 2; t += 0.02) { const nx = px - Math.sin(a) * speed * 0.02, nz = pz - Math.cos(a) * speed * 0.02; if (!B.island.onLand(nx, nz) || Math.abs(S.supportAt(nx, nz, 0, 0, cave)) > 0.001 || !S.walkable(nx, nz, px, pz, 0, cave.bodyHeight, cave) || S.inBananas(cave, nx, nz)) { clear = false; break; } px = nx; pz = nz; } if (!clear) continue; B.crew.relocatePlayer({ x, y: 0, z }, a + Math.PI); o.yaw = o.tYaw = a; B.pilot.update(1); return true; } return false; })()`);
  const before = await b.evaluate(`(() => { const B = window.__ooga, p = B.crew.player.root.position; return { particles: B.stats().particles, x: p.x, z: p.z }; })()`);
  await hold(b, "w", 1200);
  const walking = await b.evaluate(`(() => { const B = window.__ooga, p = B.crew.player.root.position; return { particles: B.stats().particles, moved: +Math.hypot(p.x - ${before.x}, p.z - ${before.z}).toFixed(2) }; })()`);
  const decayed = await untilPage(b, `B.stats().particles === ${before.particles}`, 8000);
  record("driven smoke: a walking driven Ooga puffs a smoke trail that fades when he stops", staged && walking.moved > 2 && walking.particles > before.particles && decayed, JSON.stringify({ staged, before: before.particles, ...walking, decayed }));
});

const maskBreath = (backend, lab = false) => withPage(`mask breath ${lab ? "lab" : "hub"} ${backend}`, (lab ? page : hubPage)(src, backend === "canvas2d" ? "canvas2d=1" : ""), async (b) => {
  const r = await b.evaluate(`(() => {
    const B = window.__ooga, cave = B.cavemen.get("MrHodlX"), crew = B.crew;
    cave.override = "working"; crew.refreshStates(); crew.control(cave);
    crew.relocatePlayer({ x: 4, y: 0, z: 4 }, 0);
    const root = cave.root.parent, smoke = () => cave.breathSmoke.filter((p) => p.life > 0).map((p) => p.node);
    const expected = new Float32Array(3), rows = [];
    for (const heading of [0, Math.PI / 2, Math.PI]) {
      cave.root.rotation.y = heading; cave.breathAt = 0; cave.breathPuffs = 0;
      cave.breathCount = 0; cave.breathHugeAt = 10;
      for (const p of cave.breathSmoke) { p.life = 0; p.node.smokeOpacity = 0; }
      const before = smoke(), p = cave.root.position, x = p.x, z = p.z;
      crew.steer(rows.length ? 1 : 0, 0); crew.update(0.04, 100 + rows.length);
      const emitted = smoke().filter((n) => !before.includes(n));
      const atHoles = emitted.every((n, i) => {
        const a = (i - 1) / 6 * Math.PI * 2, hx = i ? Math.cos(a) * 0.065 : 0, hy = i ? Math.sin(a) * 0.065 : 0, h = cave.traits.height;
        window.BL.math.mat4.transformPoint(expected, cave.parts.head.world, hx * h, (0.1 + hy) * h, 0.49 * h);
        return Math.hypot(n.position.x - expected[0], n.position.y - expected[1], n.position.z - expected[2]) < 0.01;
      });
      const first = cave.breathSmoke[0];
      const m = cave.parts.head.world, forwardLength = Math.hypot(m[8], m[9], m[10]);
      const straight = cave.breathSmoke.slice(0, 7).every((p) => (p.vx * m[8] + (p.vy - 0.24) * m[9] + p.vz * m[10]) / (Math.hypot(p.vx, p.vy - 0.24, p.vz) * forwardLength) > 0.995);
      rows.push({ count: emitted.length, atHoles, straight, smaller: emitted.every((n) => n.scale.x >= 0.34 * 0.75 && n.scale.x <= 0.34), mostlyUp: Math.hypot(first.vx, first.vz) < first.vy, moved: Math.hypot(p.x - x, p.z - z), puffs: cave.breathPuffs });
    }
    crew.steer(0, 0);
    cave.breathMerge = 10;
    for (let i = 0; i < 11; i++) { cave.breathAt = 0; crew.update(0.01, 104 + i); }
    const normalCount = smoke().length;
    const gap = cave.breathAt, beforeGap = smoke().length;
    crew.update(0.1, 106);
    const silentGap = smoke().length === beforeGap, bounded = cave.breathSmoke.length === 252 && cave.breathSmoke.every((p) => p.node.parent === null) && cave.breathBatch.parent === root && cave.breathBatch.instanceData.length === 252 * 20;
    for (const p of cave.breathSmoke) { p.life = 0; p.node.smokeOpacity = 0; }
    cave.breathAt = 0; cave.breathPuffs = 0; cave.breathCount = 0; cave.breathHugeAt = 1;
    cave.breathMerge = 10;
    for (let i = 0; i < 36; i++) { cave.breathAt = 0; crew.update(0.04, 110 + i * 0.04); }
    const last = cave.breathSmoke[245];
    const huge = { count: smoke().length, smallCubes: cave.breathSmoke.every((p) => p.size >= 0.48 && p.size <= 0.64), remaining: cave.breathPuffs, burst: Math.hypot(last.vx, last.vz) > 0.9 };
    const puff = cave.breathSmoke[0], node = puff.node, x = node.position.x, y = node.position.y, z = node.position.z, size = node.scale.x, opacity = node.smokeOpacity;
    cave.breathAt = 40; crew.update(0.25, 113);
    const floatsAway = node.position.y > y && (node.position.x - x) * puff.vx + (node.position.z - z) * puff.vz > 0;
    const dissipates = node.scale.x >= size && node.smokeOpacity < opacity && node.smokeOpacity > 0;
    const volume = () => smoke().reduce((sum, n) => sum + n.scale.x ** 3, 0);
    const beforeMerge = smoke().length, beforeVolume = volume(), beforeSizes = cave.breathSmoke.map((p) => p.node.scale.x);
    cave.breathMerge = 0; crew.update(0, 114);
    const merged = { before: beforeMerge, after: smoke().length, larger: cave.breathSmoke.some((p, i) => p.life > 0 && p.node.scale.x > beforeSizes[i]), volumeKept: Math.abs(volume() - beforeVolume) < beforeVolume * 0.00001 };
    const sizeLimit = 0.34 * Math.cbrt(12);
    let capped = true, peak = 0;
    for (let i = 0; i < 8; i++) {
      crew.update(0.1, 114 + i * 0.1);
      for (const p of cave.breathSmoke) if (p.life > 0) { capped = capped && p.node.scale.x <= sizeLimit && p.cubes <= 12; peak = Math.max(peak, p.node.scale.x); }
    }
    crew.update(5, 118);
    const drained = cave.breathSmoke.every((p) => p.life === 0 && p.node.smokeOpacity === 0);
    return { rows, normalCount, gap, silentGap, bounded, huge, floatsAway, dissipates, merged, capped, peak, drained, backend: B.renderer.kind };
  })()`);
  record(`mask breath ${lab ? "lab" : "hub"} ${backend}: 84 varied small cubes per normal exhale leave seven holes straight and mostly rise while idle, walking and turning`, r.backend === backend && r.normalCount === 84 && r.rows.every((row) => row.count === 7 && row.atHoles && row.straight && row.smaller && row.mostlyUp && row.puffs === 11) && r.rows[0].moved === 0 && r.rows.slice(1).every((row) => row.moved > 0), JSON.stringify(r));
  record(`mask breath ${lab ? "lab" : "hub"} ${backend}: burst clouds merge at most 12 cubes, conserve volume, cap cube volume at 12 times the starting volume and fade in a fixed pool`, r.huge.count === 252 && r.huge.smallCubes && r.huge.remaining === 0 && r.huge.burst && r.floatsAway && r.dissipates && r.merged.after < r.merged.before && r.merged.larger && r.merged.volumeKept && r.capped && r.peak >= 0.34 * Math.cbrt(12) - 0.0001 && r.gap >= 15 && r.gap <= 30 && r.silentGap && r.bounded && r.drained, JSON.stringify({ huge: r.huge, merged: r.merged, capped: r.capped, peak: r.peak, floatsAway: r.floatsAway, dissipates: r.dissipates, bounded: r.bounded, drained: r.drained }));
  const pixels = await b.evaluate(`(${maskSmokePixelsProbe.toString()})(${JSON.stringify(backend)})`);
  record(`mask breath ${lab ? "lab" : "hub"} ${backend}: individual and batched smoke fade to nothing without changing mesh size`, pixels.sameSize && !pixels.error && [pixels.rows, pixels.batchRows].every((rows) => rows[0] > rows[1] && rows[1] > 0 && rows[2] === 0), JSON.stringify(pixels));
});

const hubFlight = () => withPage("hub flight", hubPage(src), async (b) => {
  const cam = () => b.evaluate(`(() => { const c = window.__ooga.camera; return { x: +c.target.x.toFixed(2), y: +c.target.y.toFixed(2), z: +c.target.z.toFixed(2), yaw: +Math.atan2(c.position.x - c.target.x, c.position.z - c.target.z).toFixed(2), py: +c.position.y.toFixed(2) }; })()`);
  const c0 = await cam();
  await hold(b, "w", 1000);
  await b.sleep(300);
  const c1 = await cam();
  await hold(b, "d", 600);
  await b.sleep(300);
  const c2 = await cam();
  await hold(b, "q", 500);
  await b.sleep(300);
  const c3 = await cam();
  await hold(b, "z", 500);
  await b.sleep(1000);
  const c4 = await cam();
  await b.sleep(1000);
  const c5 = await cam();
  record("hub: W flies forward, D strafes, Q turns, Z climbs", c1.z < c0.z - 5 && c2.x > c1.x + 2 && c3.yaw > c2.yaw + 0.4 && c4.y > c3.y + 1.5, `${JSON.stringify(c0)} -> ${JSON.stringify(c4)}`);
  record("hub: the camera holds still once the keys are up", Math.abs(c5.x - c4.x) < 0.2 && Math.abs(c5.z - c4.z) < 0.2 && Math.abs(c5.y - c4.y) < 0.2, `${JSON.stringify(c4)} -> ${JSON.stringify(c5)}`);
  // Fly beyond the old island rim, then keep flying into the full-tank boundary.
  await hold(b, "w", 4000);
  await b.drag({ x: 400, y: 500 }, { x: 400, y: 100 });
  await b.sleep(600);
  const far = await b.evaluate(`(() => { const B = window.__ooga, c = B.camera, o = B.pilot.orbit, pitch = B.pilot.viewPitch, cp = Math.cos(pitch); return { r: +Math.hypot(c.target.x, c.target.z).toFixed(1), clearance: c.position.y - B.island.surfaceAt(c.position.x, c.position.z), mode: B.pilot.mode, selected: !!B.pilot.player, rawError: Math.hypot(c.position.x - o.tx - Math.sin(o.yaw) * cp * o.dist, c.position.y - o.ty - Math.sin(pitch) * o.dist, c.position.z - o.tz - Math.cos(o.yaw) * cp * o.dist) }; })()`);
  await b.send("Input.dispatchKeyEvent", { type: "keyDown", key: "w", text: "w" });
  const bound = await b.evaluate(`(() => { const B = window.__ooga, scene = window.BL.scenes.hub, c = B.camera, o = B.pilot.orbit; let time = B.renderOpts.matrix.time, rawError = 0; for (let i = 0; i < 600; i++) { scene.update(1 / 60, time += 1 / 60); const pitch = B.pilot.viewPitch, cp = Math.cos(pitch); rawError = Math.max(rawError, Math.hypot(c.position.x - o.tx - Math.sin(o.yaw) * cp * o.dist, c.position.y - o.ty - Math.sin(pitch) * o.dist, c.position.z - o.tz - Math.cos(o.yaw) * cp * o.dist)); } const tankRange = B.island.radius + window.BL.crew.JET_SPEED * window.BL.crew.JET_MOVE_SECONDS; return { r: Math.hypot(c.target.x, c.target.z), limit: tankRange + 8, clearance: c.position.y - B.island.surfaceAt(c.position.x, c.position.z), mode: B.pilot.mode, selected: !!B.pilot.player, rawError, samples: 600 }; })()`);
  await b.send("Input.dispatchKeyEvent", { type: "keyUp", key: "w" });
  record("hub: free orbit reaches the full-tank boundary while preserving its chosen below-ground view", far.r > 44.1 && far.r <= bound.limit && Math.abs(bound.r - bound.limit) < 0.1 && bound.clearance < 0 && [far, bound].every((view) => view.mode === "orbit" && !view.selected && view.rawError < 1e-7) && bound.samples === 600, JSON.stringify({ far, bound }));
});

const hubCrew = () => withPage("hub crew", hubPage(src), async (b) => {
  // No builds during the check, so no timer hides
  await b.evaluate(`[...window.__ooga.cavemen.values()].forEach((c) => { c.nextBuildAt = 1e9; })`);
  // A meal ends, then the eater strolls and stands
  const stroll = await b.evaluate(`new Promise((resolve) => { const B = window.__ooga; const cave = [...B.cavemen.values()].find((c) => c.state === "working" && !c.walk && !c.build); cave.act.until = -1; setTimeout(() => resolve({ name: cave.traits.name, kind: cave.act.kind, to: cave.walk && cave.walk.to, away: cave.walk && +Math.hypot(cave.walk.tx, cave.walk.tz).toFixed(1) }), 300); })`);
  record("hub crew: a finished meal becomes a stroll to a meadow spot", stroll.kind === "wander" && stroll.to === "spot" && stroll.away >= 5, JSON.stringify(stroll));
  const idle = await b.evaluate(`new Promise((resolve) => { const B = window.__ooga; const cave = [...B.cavemen.values()].find((c) => c.traits.name === ${JSON.stringify(stroll.name)}); const t0 = performance.now(); const tick = () => { if (cave.act.kind === "idle" || performance.now() - t0 > 20000) resolve({ kind: cave.act.kind, walk: !!cave.walk, r: +Math.hypot(cave.root.position.x, cave.root.position.z).toFixed(1) }); else requestAnimationFrame(tick); }; tick(); })`);
  record("hub crew: the stroller arrives and idles away from the pile", idle.kind === "idle" && !idle.walk && idle.r >= 5, JSON.stringify(idle));
  // Bananas land and everyone free runs back
  await b.key("b");
  await b.sleep(300);
  const rushed = await b.evaluate(`[...window.__ooga.cavemen.values()].filter((c) => c.state === "working" && !c.build).map((c) => ({ kind: c.act.kind, speed: c.walk ? c.walk.speed : null, to: c.walk ? c.walk.to : null }))`);
  const runner = rushed.find((c) => c.speed !== null);
  record("hub crew: fresh bananas send free crew back to the pile", rushed.every((c) => c.kind === "eat" || c.kind === "rush" && c.speed >= 2.5 && c.to === "slot") && !!runner, JSON.stringify(rushed));
  const eating = await b.evaluate(`new Promise((resolve) => { const B = window.__ooga; const t0 = performance.now(); const tick = () => { const crew = [...B.cavemen.values()].filter((c) => c.state === "working" && !c.build); const done = crew.every((c) => !c.walk && c.act.kind === "eat" && Math.hypot(c.root.position.x - c.slot.x, c.root.position.z - c.slot.z) < 0.1); if (done || performance.now() - t0 > 12000) resolve({ done, kinds: crew.map((c) => c.act.kind + (c.walk ? "/walk" : "")).join(",") }); else requestAnimationFrame(tick); }; tick(); })`);
  record("hub crew: the runners settle at their slots and eat", eating.done, eating.kinds);
});

const hubProps = () => withPage("hub props", hubPage(src, "loot=1"), async (b) => {
  // Tapping a prop wobbles it and throws particles
  const bush = await b.evaluate(`(() => { const B = window.__ooga; for (const o of B.props) { if (o.prop !== "bush" || o.node.position.y !== 0) continue; const p = B.project(o.x, 0.5, o.z); if (!p || p.x < 60 || p.x > 1080 || p.y < 140 || p.y > 860) continue; const hit = B.input.pick(p.x, p.y); if (hit && hit.owner === o) return { x: p.x, y: p.y }; } return null; })()`);
  if (bush) await b.click(bush.x, bush.y);
  await b.sleep(200);
  const r = await b.evaluate(`(() => { const B = window.__ooga; return { particles: B.stats().particles, tweens: B.stats().tweens, toast: document.getElementById("toast").textContent }; })()`);
  record("hub props: tapping a bush rustles it", !!bush && r.particles > 0 && r.tweens > 0 && r.toast.length > 0, JSON.stringify({ bush: !!bush, ...r }));
  // Decorative props leave Space available for a quiet jump.
  const near = await b.evaluate(`(() => { const B = window.__ooga, pickup = B.jetpack.pickup; const cave = [...B.cavemen.values()].find((c) => c.state === "working" && !c.walk && !c.build); const o = B.props.find((o) => o.prop === "barrel" && o.active && (!pickup || Math.hypot(o.x - pickup.x, o.z - pickup.z) > 2)); B.pilot.possess(cave); B.crew.relocatePlayer({ x: o.x + 0.3, y: B.island.surfaceAt(o.x + 0.3, o.z), z: o.z }, 0); window.BL.scenes.hub.overlay(10); const probe = window.__decorativeJump = {}; window.addEventListener("keydown", () => { probe.before = B.stats().bubbles; }, { capture: true, once: true }); window.addEventListener("keydown", () => { probe.after = B.stats().bubbles; }, { once: true }); return { name: cave.traits.name, player: B.crew.player === cave }; })()`);
  await b.sleep(100);
  await b.key(" ");
  await b.sleep(200);
  const used = await b.evaluate(`(() => { const B = window.__ooga; return { hop: B.crew.player.hop, jumps: B.crew.player.jumps, label: document.getElementById("act").textContent, toast: document.getElementById("toast").textContent, bubbles: window.__decorativeJump }; })()`);
  record("hub props: Space jumps beside a decorative barrel without using it or shouting", near.player && used.hop > 0 && used.jumps === 1 && used.label === "JUMP!" && !used.toast.includes("Empty") && used.bubbles.before === used.bubbles.after, JSON.stringify({ ...near, ...used }));
  record("hub props: Reset View controls are absent from both scene toolbars", await b.evaluate(`document.querySelectorAll('[data-action="reset-view"]').length === 0`));
  await b.key("0");
  await b.sleep(900);
  const reset = await b.evaluate(`(() => { const B = window.__ooga; const c = B.camera; return { player: !!B.crew.player, toPile: +Math.hypot(c.target.x, c.target.z).toFixed(2), dist: +Math.hypot(c.position.x - c.target.x, c.position.y - c.target.y, c.position.z - c.target.z).toFixed(1) }; })()`);
  record("hub props: the 0 shortcut still lets go and returns to the landing view", !reset.player && reset.toPile < 0.5 && Math.abs(reset.dist - 24) < 1.5, JSON.stringify(reset));
  const altar = await b.evaluate(`(() => { const B = window.__ooga; const shellMinY = () => { const data = B.shell.instanceData, geometry = B.shell.geometry; let minY = Infinity; for (let instance = 0; instance < B.shell.instanceCount; instance++) { const offset = instance * 20; for (let i = 0; i < geometry.verts.length; i += 3) minY = Math.min(minY, data[offset + 1] * geometry.verts[i] + data[offset + 5] * geometry.verts[i + 1] + data[offset + 9] * geometry.verts[i + 2] + data[offset + 13]); } return minY; }; const sample = (level) => { B.setPileLevel(level); return { radius: B.altar.radius, platformRadius: B.altar.platformRadius, slabRadius: B.altar.slab.scale.x, height: B.altar.slab.scale.y, outerRingRadius: B.altar.outerRingRadius, outerRingInnerRadius: B.altar.outerRingInnerRadius, rings: B.altar.ringCount, blocks: B.altar.blockCount, visible: B.altar.rings.filter((r) => r.instanceCount > 0).length, nodes: B.altar.rings.length, minBananaY: shellMinY() }; }; const small = sample(300), before = sample(1000), after = sample(1100), medium = sample(10000), million = sample(1000000), radii = []; for (const ring of B.altar.rings) for (let i = 0; i < ring.instanceCount; i++) radii.push(Math.hypot(ring.instanceData[i * 20 + 12], ring.instanceData[i * 20 + 14])); const shades = new Set(B.altar.rings.map((ring) => ring.geometry.faces[0].color.join(","))).size, visibleScenery = B.props.filter((o) => o.scenery && o.active), nearestSceneryEdge = Math.min(...visibleScenery.map((o) => Math.hypot(o.x, o.z) - o.footprint)); return { small, before, after, medium, million, circularVariance: Math.max(...radii) - Math.min(...radii), shades, nearestSceneryEdge, sceneryClearance: B.scenery.clearanceRadius }; })()`);
  const altarMargin = (sample) => Math.abs(sample.platformRadius - sample.radius - 0.22) < 1e-10 && Math.abs(sample.outerRingInnerRadius - sample.radius - 0.02) < 1e-10;
  record("hub altar: its empty base grows continuously and stays one block ring beyond the bananas", altar.small.slabRadius === altar.small.outerRingInnerRadius && [altar.small, altar.before, altar.after, altar.medium, altar.million].every((sample) => altarMargin(sample) && sample.slabRadius === sample.outerRingInnerRadius) && Math.abs((altar.after.platformRadius - altar.before.platformRadius) - (altar.after.radius - altar.before.radius)) < 1e-10 && altar.million.height >= 0.3 && altar.small.minBananaY > altar.small.height && altar.medium.minBananaY > altar.medium.height && altar.million.minBananaY > altar.million.height && altar.nearestSceneryEdge >= altar.sceneryClearance - 1e-8, JSON.stringify(altar));
  const flushBlocks = await b.evaluate(`(() => { const A = window.__ooga.altar; let minBase = Infinity, maxBase = -Infinity, minTop = Infinity, maxTop = -Infinity; for (const ring of A.rings) for (let i = 0; i < ring.instanceCount; i++) { const offset = i * 20, base = ring.instanceData[offset + 13], top = base + ring.instanceData[offset + 5]; minBase = Math.min(minBase, base); maxBase = Math.max(maxBase, base); minTop = Math.min(minTop, top); maxTop = Math.max(maxTop, top); } return { platformTop: A.height, minBase, maxBase, minTop, maxTop }; })()`);
  record("hub altar: perimeter blocks stand on the ground outside the light platform and finish flush", Math.abs(flushBlocks.minBase) < 1e-6 && Math.abs(flushBlocks.maxBase) < 1e-6 && Math.abs(flushBlocks.minTop - flushBlocks.platformTop) < 1e-6 && Math.abs(flushBlocks.maxTop - flushBlocks.platformTop) < 1e-6, JSON.stringify(flushBlocks));
  record("hub altar: one concentric shaded perimeter adds blocks as it expands", altar.small.rings === 1 && altar.medium.rings === 1 && altar.million.rings === 1 && altar.small.blocks < altar.medium.blocks && altar.medium.blocks < altar.million.blocks && altar.million.visible === 3 && altar.million.nodes === 3 && altar.circularVariance < 1e-6 && altar.shades === 3, JSON.stringify({ small: altar.small.blocks, medium: altar.medium.blocks, million: altar.million.blocks, variance: altar.circularVariance, shades: altar.shades }));
  await b.evaluate(`window.__ooga.demoTip(120000)`);
  await b.sleep(2600);
  const landing = await b.evaluate(`(() => { const B = window.__ooga, c = B.crates[0]; return c && { crateRadius: Math.hypot(c.node.position.x, c.node.position.z), pileRadius: B.altar.radius, platformRadius: B.altar.platformRadius }; })()`);
  record("hub altar: loot crates land beyond the grown platform", !!landing && landing.crateRadius >= landing.platformRadius + 0.7, JSON.stringify(landing));
});

const selectByDoubleTap = async (b, pick) => {
  // Queue the ordered pointer gesture together, so host-side protocol latency
  // cannot stretch two real taps beyond the recognizer's double-tap window.
  const replies = [];
  for (const [type, buttons, clickCount] of [["mouseMoved", 0, 0], ["mousePressed", 1, 1], ["mouseReleased", 0, 1], ["mousePressed", 1, 2], ["mouseReleased", 0, 2]]) {
    replies.push(b.mouse(type, pick.x, pick.y, { buttons, clickCount, button: type === "mouseMoved" ? "none" : "left" }));
  }
  await Promise.all(replies);
  if (!await untilPage(b, `B.crew.player && B.crew.player.traits.name === ${JSON.stringify(pick.name)}`)) throw new Error(`Double tap did not select ${pick.name}`);
};
// Thrust checks begin clear of actions, which now consume Space on the ground.
const stageClearTakeoff = (b) => b.evaluate(`(() => { const B = window.__ooga, cave = B.crew.player; for (let r = 10; r < 19; r++) for (let i = 0; i < 64; i++) { const a = i / 64 * Math.PI * 2, x = Math.sin(a) * r, z = Math.cos(a) * r; if (!B.island.onLand(x, z) || B.island.surfaceAt(x, z) !== 0 || B.props.some((o) => o.active && Math.hypot(o.x - x, o.z - z) < 3.5) || [...B.cavemen.values()].some((c) => c !== cave && Math.hypot(c.root.position.x - x, c.root.position.z - z) < 3.5)) continue; B.crew.relocatePlayer({ x, y: 0, z }, 0); return; } throw new Error("No clear takeoff fixture"); })()`);

const labDrive = () => withPage("lab drive", page(src), async (b) => {
  const pick = await b.evaluate(`(() => { const B = window.__ooga; const cave = [...B.cavemen.values()].find((c) => c.state === "working" && !c.walk && !c.build); const p = B.project(cave.root.position.x, cave.root.position.y + 0.2, cave.root.position.z); const hit = B.input.pick(p.x, p.y); return { name: cave.traits.name, x: p.x, y: p.y, kind: hit && hit.owner.kind }; })()`);
  await selectByDoubleTap(b, pick);
  const pos = () => b.evaluate(`(() => { const B = window.__ooga; const p = B.crew.player; return p && { name: p.traits.name, x: +p.root.position.x.toFixed(2), z: +p.root.position.z.toFixed(2) }; })()`);
  const p0 = await pos();
  await hold(b, "w", 1200);
  await b.sleep(300);
  const p1 = await pos();
  record("lab drive: a double tap takes the wheel and W walks the caveman inside the room", pick.kind === "caveman" && !!p0 && p0.name === pick.name && Math.hypot(p1.x - p0.x, p1.z - p0.z) >= 2 && Math.abs(p1.x) < 10 && Math.abs(p1.z) < 10, `${JSON.stringify(p0)} -> ${JSON.stringify(p1)}`);
  // Cards and dice keep their pointer actions without intercepting a jump.
  await b.evaluate(`(() => { const B = window.__ooga; const card = B.lab.equipment.cards[0], w = card.world; B.crew.relocatePlayer({ x: w[12] + 0.6, y: 0, z: w[14] + 0.6 }, 0); window.BL.scenes.lab.overlay(10); const probe = window.__decorativeJump = {}; window.addEventListener("keydown", () => { probe.before = B.stats().bubbles; }, { capture: true, once: true }); window.addEventListener("keydown", () => { probe.after = B.stats().bubbles; }, { once: true }); })()`);
  await b.sleep(500);
  await b.key(" ");
  await b.sleep(120);
  const jumped = await b.evaluate(`(() => { const B = window.__ooga; return { hop: B.crew.player.hop, jumps: B.crew.player.jumps, reacted: B.lab.equipment.cards.some((c) => c.flipping) || B.lab.equipment.dice.some((d) => d.rolling), label: document.getElementById("act").textContent, bubbles: window.__decorativeJump }; })()`);
  record("lab drive: Space jumps beside the card table without flipping, rolling or shouting", jumped.hop > 0 && jumped.jumps === 1 && !jumped.reacted && jumped.label === "JUMP!" && jumped.bubbles.before === jumped.bubbles.after, JSON.stringify(jumped));
  await b.key("Escape");
  await b.sleep(200);
  const freed = await b.evaluate(`({ scene: window.__ooga.scene, player: !!window.__ooga.crew.player })`);
  record("lab drive: the first Escape only lets go", freed.scene === "lab" && !freed.player, JSON.stringify(freed));
});

const hubDrive = () => withPage("hub drive", hubPage(src), async (b) => {
  // The eater standing beside the pile, so a walk forward passes it instead of running into it
  const pick = await b.evaluate(`(() => { const B = window.__ooga; const cx = B.camera.position.x, cz = B.camera.position.z, cl = Math.hypot(cx, cz), side = (c) => { const p = c.root.position; return Math.abs((p.x * cx + p.z * cz) / (Math.hypot(p.x, p.z) * cl)); }; const cave = [...B.cavemen.values()].filter((c) => c.state === "working" && !c.walk && !c.build).sort((a, b) => side(a) - side(b))[0]; const p = B.project(cave.root.position.x, cave.root.position.y + 0.2, cave.root.position.z); const hit = B.input.pick(p.x, p.y); return { name: cave.traits.name, x: p.x, y: p.y, kind: hit && hit.owner.kind }; })()`);
  await selectByDoubleTap(b, pick);
  await b.sleep(300);
  const driven = await b.evaluate(`(() => { const B = window.__ooga; const p = B.crew.player; return { player: p && p.traits.name, kind: p && p.act.kind, act: !document.getElementById("act").hidden, follow: p && +Math.hypot(B.camera.target.x - p.root.position.x, B.camera.target.z - p.root.position.z).toFixed(2) }; })()`);
  record("hub drive: a double tap takes the wheel of a caveman", pick.kind === "caveman" && driven.player === pick.name && driven.kind === "player" && driven.act, JSON.stringify({ pick, driven }));
  const pos = () => b.evaluate(`(() => { const B = window.__ooga; const p = B.crew.player; return p && { x: +p.root.position.x.toFixed(2), z: +p.root.position.z.toFixed(2), follow: +Math.hypot(B.camera.target.x - p.root.position.x, B.camera.target.z - p.root.position.z).toFixed(2) }; })()`);
  const p0 = await pos();
  await hold(b, "w", 1500);
  await b.sleep(500);
  const p1 = await pos();
  record("hub drive: W walks the caveman and the camera follows", Math.hypot(p1.x - p0.x, p1.z - p0.z) >= 3 && p1.follow < 1.5, `${JSON.stringify(p0)} -> ${JSON.stringify(p1)}`);
  const stagedAct = await b.evaluate(`(() => { const B = window.__ooga, player = B.crew.player, p = player.root.position; for (let radius = 11; radius <= 18; radius++) for (let i = 0; i < 48; i++) { const a = i / 48 * Math.PI * 2, x = Math.sin(a) * radius, z = Math.cos(a) * radius; if (!B.island.onLand(x, z) || B.island.heightAt(x, z) !== 0 || B.props.some((o) => o.active && Math.hypot(o.x - x, o.z - z) < 3) || [...B.cavemen.values()].some((c) => c !== player && c.root.visible && Math.hypot(c.root.position.x - x, c.root.position.z - z) < 3)) continue; p.x = x; p.z = z; p.y = player.baseY; player.hop = player.hopV = 0; return true; } return false; })()`);
  await b.sleep(500);
  await b.key(" ");
  await b.sleep(120);
  // With no nearby action, Space always jumps.
  const act = await b.evaluate(`(() => { const B = window.__ooga; const p = B.crew.player; return { hop: p.hop > 0 || p.hopV > 0, bubbles: B.stats().bubbles, toast: document.getElementById("toast").textContent, tweens: B.stats().tweens }; })()`);
  record("hub drive: Space jumps when no action is nearby", stagedAct && act.hop, JSON.stringify({ stagedAct, ...act }));
  // Each chord gets a clear curved runway. The preceding chord can otherwise
  // leave the actor against a newly solid prop or the edge of a hill.
  const stageChord = (turn, lead) => b.evaluate(`(() => { const B = window.__ooga, cave = B.crew.player, S = B.headquarters.solids, o = B.pilot.orbit, speed = window.BL.pilot.WALK.speed; for (let radius = 8; radius <= 16; radius += 2) for (let i = 0; i < 64; i++) { const a = i / 64 * Math.PI * 2, x = Math.sin(a) * radius, z = Math.cos(a) * radius, yaw = a - Math.sign(${turn}) * Math.PI / 2; let px = x, pz = z, clear = true; for (let t = 0; t < 2.4; t += 0.02) { const angle = yaw + ${turn} * Math.max(0, Math.min(1, (t - ${lead}) / 0.32)), nx = px - Math.sin(angle) * speed * 0.02, nz = pz - Math.cos(angle) * speed * 0.02; if (!B.island.onLand(nx, nz) || Math.abs(S.supportAt(nx, nz, 0, 0, cave)) > 0.001 || !S.walkable(nx, nz, px, pz, 0, cave.bodyHeight, cave) || S.inBananas(cave, nx, nz)) { clear = false; break; } px = nx; pz = nz; } if (!clear) continue; B.crew.relocatePlayer({ x, y: 0, z }, yaw + Math.PI); o.yaw = o.tYaw = yaw; B.pilot.update(1); return true; } throw new Error("No clear chord runway"); })()`);
  // Both mouse buttons held on the canvas walk too, and the press never lands as a tap
  await stageChord(-0.8, 0.8);
  await b.sleep(150);
  const firstStart = await pos();
  const spot = await b.evaluate(`(() => { const B = window.__ooga, p = B.crew.player.root.position, s = B.project(p.x, p.y + 0.2, p.z); return { x: s.x, y: s.y, hit: !!B.input.pick(s.x, s.y) }; })()`);
  await b.mouse("mouseMoved", spot.x, spot.y, { button: "none" });
  await b.mouse("mousePressed", spot.x, spot.y, { buttons: 1 });
  await b.mouse("mousePressed", spot.x, spot.y, { button: "right", buttons: 3 });
  await b.sleep(800);
  const yaw = () => b.evaluate(`(() => { const c = window.__ooga.camera; return +Math.atan2(c.position.x - c.target.x, c.position.z - c.target.z).toFixed(2); })()`);
  const yaw0 = await yaw();
  for (let i = 1; i <= 8; i++) {
    await b.mouse("mouseMoved", spot.x + i * 25, spot.y, { buttons: 3 });
    await b.sleep(40);
  }
  await b.sleep(700);
  const chordHeld = await b.evaluate(`window.__ooga.controls.read().y`);
  const yaw1 = await yaw();
  await b.mouse("mouseReleased", spot.x + 200, spot.y, { button: "right", buttons: 1 });
  await b.mouse("mouseReleased", spot.x + 200, spot.y, { buttons: 0 });
  await b.sleep(400);
  const p2 = await pos();
  const chordFreed = await b.evaluate(`({ y: window.__ooga.controls.read().y, player: !!window.__ooga.crew.player })`);
  record("hub drive: both mouse buttons walk the caveman forward and dragging turns him, without letting go", spot.hit && chordHeld === 1 && Math.hypot(p2.x - firstStart.x, p2.z - firstStart.z) >= 3 && Math.abs(yaw1 - yaw0) > 0.3 && chordFreed.y === 0 && chordFreed.player, JSON.stringify({ spot, chordHeld, yaw0, yaw1, firstStart, p2, chordFreed }));
  // Pressed together, Chrome reports the pair as one move with no pointerdown; the chord must still turn
  await stageChord(0.8, 0.6);
  await b.sleep(150);
  const secondStart = await pos();
  const secondSpot = await b.evaluate(`(() => { const B = window.__ooga, p = B.crew.player.root.position, s = B.project(p.x, p.y + 0.2, p.z); return { x: s.x, y: s.y }; })()`);
  await b.mouse("mousePressed", secondSpot.x, secondSpot.y, { button: "right", buttons: 3 });
  await b.sleep(600);
  const yaw2 = await yaw();
  for (let i = 1; i <= 8; i++) {
    await b.mouse("mouseMoved", secondSpot.x - i * 25, secondSpot.y, { buttons: 3 });
    await b.sleep(40);
  }
  await b.sleep(700);
  const yaw3 = await yaw();
  await b.mouse("mouseReleased", secondSpot.x - 200, secondSpot.y, { buttons: 2 });
  await b.mouse("mouseReleased", secondSpot.x - 200, secondSpot.y, { button: "right", buttons: 0 });
  await b.sleep(400);
  const p3 = await pos();
  const chordFreed2 = await b.evaluate(`({ y: window.__ooga.controls.read().y, player: !!window.__ooga.crew.player })`);
  record("hub drive: the chord walks and turns when both buttons go down together", Math.hypot(p3.x - secondStart.x, p3.z - secondStart.z) >= 3 && Math.abs(yaw3 - yaw2) > 0.3 && chordFreed2.y === 0 && chordFreed2.player, JSON.stringify({ yaw2, yaw3, secondStart, p3, chordFreed2 }));
  await stageClearTakeoff(b);
  await b.evaluate(`window.__ooga.jetpack.grant(window.__ooga.crew.player)`);
  await b.key("j");
  await b.sleep(120);
  const equipped = await b.evaluate(`(() => { const B = window.__ooga, p = B.crew.player; return { lootEnabled: B.lootEnabled, lootCrates: B.crates.length, decorativeCrates: B.props.filter((o) => o.scenery && o.prop === "crate" && o.active).length, owned: B.jetpack.owned, pickup: !!B.jetpack.pickup, jet: !!p.jet, attached: !!p.jet && p.root.children.includes(p.jet.node), act: document.getElementById("act").textContent }; })()`);
  await hold(b, " ", 500);
  const flying = await b.evaluate(`(() => { const p = window.__ooga.crew.player; return { hop: p.hop, flame: p.jet.flame.visible }; })()`);
  record("hub drive: J equips a collected jetpack without enabling donation loot", !equipped.lootEnabled && equipped.lootCrates === 0 && equipped.decorativeCrates > 0 && equipped.owned && !equipped.pickup && equipped.jet && equipped.attached && /blast/i.test(equipped.act) && flying.hop > 0.5, JSON.stringify({ equipped, flying }));
  await b.key("Escape");
  await b.sleep(200);
  const freed = await b.evaluate(`(() => { const B = window.__ooga; const cave = [...B.cavemen.values()].find((c) => c.traits.name === ${JSON.stringify(pick.name)}); return { player: !!B.crew.player, act: !document.getElementById("act").hidden, kind: cave.act.kind }; })()`);
  record("hub drive: Escape lets go and the caveman goes back to its day", !freed.player && !freed.act && freed.kind === "idle", JSON.stringify(freed));
});

// The jetpack waits on a distant cloud, becomes visitor-owned, and is lost to the abyss.
const hubJetpack = () => withPage("hub jetpack", hubPage(src, "loot=1"), async (b) => {
  const initial = await b.evaluate(`(() => { const B = window.__ooga, j = B.jetpack.pickup, h = j.host, p = h.node.position; return { owned: B.jetpack.owned, hud: document.getElementById("jetpack-hud").hidden, cloud: B.matrixCave.clouds.indexOf(h), radius: Math.hypot(p.x, p.z), centered: j.x === p.x && j.z === p.z, hover: j.node.position.y - p.y - h.centerTop, angle: j.node.rotation.y }; })()`);
  await b.sleep(300);
  const spun = await b.evaluate(`window.__ooga.jetpack.pickup.node.rotation.y`);
  record("hub jetpack: an unowned pickup spins low and centered above a distant cloud", !initial.owned && initial.hud && initial.cloud >= 0 && initial.radius >= 44 && initial.centered && initial.hover > 0.4 && initial.hover < 0.6 && spun > initial.angle, JSON.stringify({ initial, spun }));
  const moved = await b.evaluate(`(() => { const B = window.__ooga, old = B.jetpack.pickup.host; B.jetpack.forceHostWrap(); window.BL.scenes.hub.update(1 / 30, B.renderOpts.matrix.time + 1 / 30); const falling = { active: B.jetpack.pickup.falling, host: B.jetpack.pickup.host, y: B.jetpack.pickup.node.position.y, vy: B.jetpack.pickup.vy }; B.jetpack.pickup.node.position.y = -61; window.BL.scenes.hub.update(1 / 30, B.renderOpts.matrix.time + 2 / 30); const j = B.jetpack.pickup, h = j.host, p = h.node.position; return { falling, changed: h !== old, radius: Math.hypot(p.x, p.z), centered: j.x === p.x && j.z === p.z, host: B.matrixCave.clouds.indexOf(h) }; })()`);
  record("hub jetpack: losing its cloud makes the pickup fall before it respawns on another far cloud", moved.falling.active && !moved.falling.host && moved.falling.vy < 0 && moved.changed && moved.radius >= 44 && moved.centered && moved.host >= 0, JSON.stringify(moved));
  const carried = await b.evaluate(`(() => { const B = window.__ooga, j = B.jetpack.pickup, cave = [...B.cavemen.values()].find((c) => c.state === "working"); B.pilot.possess(cave); B.crew.relocatePlayer({ x: j.x, y: j.host.node.position.y + j.host.centerTop, z: j.z }, 0); window.BL.scenes.hub.update(1 / 30, B.renderOpts.matrix.time + 3 / 30); const panel = document.getElementById("jetpack-hud"); return { owned: B.jetpack.owned, pickup: !!B.jetpack.pickup, equipped: !!cave.jet, hidden: panel.hidden, expanded: panel.dataset.equipped, width: panel.getBoundingClientRect().width, gauge: getComputedStyle(document.querySelector(".jetpack-readout")).visibility }; })()`);
  record("hub jetpack: touching the pickup carries it and reveals only the compact toggle", carried.owned && !carried.pickup && !carried.equipped && !carried.hidden && carried.expanded === "false" && carried.width === 52 && carried.gauge === "hidden", JSON.stringify(carried));
  await b.evaluate(`document.getElementById("jetpack-hud").click()`);
  await b.sleep(300);
  const worn = await b.evaluate(`(() => { const B = window.__ooga, p = B.crew.player, panel = document.getElementById("jetpack-hud"); return { jet: !!p.jet, onBack: !!p.jet && p.root.children.includes(p.jet.node), expanded: panel.dataset.equipped, width: panel.getBoundingClientRect().width, gauge: getComputedStyle(document.querySelector(".jetpack-readout")).visibility, pressed: panel.getAttribute("aria-pressed") }; })()`);
  record("hub jetpack: clicking the compact icon equips the pack and expands its fuel gauge", worn.jet && worn.onBack && worn.expanded === "true" && worn.width > carried.width + 80 && worn.gauge === "visible" && worn.pressed === "true", JSON.stringify(worn));
  await stageClearTakeoff(b);
  // Held Space climbs; releasing thrust returns him to the ground.
  const air = () => b.evaluate(`(() => { const B = window.__ooga; const p = B.crew.player; return { hop: +p.hop.toFixed(2), flame: p.jet.flame.visible, y: +p.root.position.y.toFixed(2), camY: +B.camera.target.y.toFixed(2) }; })()`);
  const ground = await air();
  await hold(b, " ", 1200);
  const up = await air();
  await b.sleep(4000);
  const down = await air();
  record("hub jetpack: held Space blasts off and released thrust returns to ground", ground.hop < 0.05 && up.hop > 2 && up.y > ground.y + 2 && up.camY > ground.camY + 1 && down.hop < 0.05, JSON.stringify({ ground, up, down }));
  // Wait for actual landing frames, bounded in case support never resolves.
  const flown = await b.evaluate(`new Promise((resolve) => { const B = window.__ooga, p = B.crew.player; p.hop = 6; p.hopV = 0; p.root.position.y += 6; const start = B.renderedFrames, t0 = performance.now(); const tick = () => { if (B.renderedFrames > start && p.hop === 0 && p.hopV === 0 || performance.now() - t0 > 5000) { const feet = p.root.position.y - p.baseY; resolve({ hop: p.hop, velocity: p.hopV, feet, support: B.island.supportAt(p.root.position.x, p.root.position.z, feet, window.BL.pilot.WALK.step, -120, 0.3), cloud: !!p.cloudSupport, frames: B.renderedFrames - start, elapsed: performance.now() - t0 }); } else requestAnimationFrame(tick); }; requestAnimationFrame(tick); })`);
  record("hub jetpack: released flight settles onto its support", flown.frames > 0 && flown.hop === 0 && flown.velocity === 0 && !flown.cloud && Math.abs(flown.feet - flown.support) < 1e-7, JSON.stringify(flown));
  const restricted = await b.evaluate(`(() => { const B = window.__ooga, p = B.crew.player, H = B.island.headquarters, panel = document.getElementById("jetpack-hud"); B.crew.relocatePlayer({ x: 0, y: H.floor, z: 0 }, 0); window.BL.scenes.hub.update(1 / 30, B.renderOpts.matrix.time + 4 / 30); panel.click(); return { owned: B.jetpack.owned, equipped: !!p.jet, hidden: panel.hidden, expanded: panel.dataset.equipped }; })()`);
  const restored = await b.evaluate(`(() => { const B = window.__ooga, p = B.crew.player; B.crew.relocatePlayer({ x: 12, y: 0, z: 0 }, 0); window.BL.scenes.hub.update(1 / 30, B.renderOpts.matrix.time + 5 / 30); document.getElementById("jetpack-hud").click(); return { owned: B.jetpack.owned, equipped: !!p.jet }; })()`);
  record("hub jetpack: underground travel removes only the worn pack and the icon works again outside", restricted.owned && !restricted.equipped && !restricted.hidden && restricted.expanded === "false" && restored.owned && restored.equipped, JSON.stringify({ restricted, restored }));
  const lost = await b.evaluate(`(() => { const B = window.__ooga, p = B.crew.player; p.hop = 59; p.hopV = -2; p.root.position.x = 45; p.root.position.z = 0; p.root.position.y = p.baseY - 61; window.BL.scenes.hub.update(1 / 60, B.renderOpts.matrix.time + 6 / 30); return { owned: B.jetpack.owned, equipped: !!p.jet, pickup: !!B.jetpack.pickup, host: !!B.jetpack.pickup?.host, hud: document.getElementById("jetpack-hud").hidden, feet: p.root.position.y - p.baseY, radius: Math.hypot(p.root.position.x, p.root.position.z) }; })()`);
  record("hub jetpack: abyss recovery removes ownership and returns the pickup to a cloud", !lost.owned && !lost.equipped && lost.pickup && lost.host && lost.hud && lost.feet === 0 && lost.radius < 20, JSON.stringify(lost));
});


// ---------- the clock ----------
const daylightNight = () => withPage("daylight night", hubPage(src, "hour=22&day=80"), async (b) => {
  const keys = await b.evaluate(`(() => {
    const D = window.BL.daylight;
    const make = () => ({ clear: [0, 0, 0], horizon: [0, 0, 0], zenith: [0, 0, 0], sky: [0, 0, 0], ground: [0, 0, 0], sun: [0, 0, 0], direct: [0, 0, 0], light: { x: 0, y: 0, z: 0 }, sunDirection: { x: 0, y: 0, z: 0 }, moon: { x: 0, y: 0, z: 0 }, celestialPole: { x: 0, y: 0, z: 0 }, starMatrix: new Float32Array(9) });
    const out = make(), sample = (hour, day = 80, continuous = day - 1 + hour / 24, latitude = 20) => { D.sample(hour, out, day, latitude, continuous); return { hour, sun: { ...out.sunDirection }, moon: { ...out.moon }, light: { ...out.light }, pole: { ...out.celestialPole }, altitude: out.sunAltitude, azimuth: out.sunAzimuth, moonAltitude: out.moonAltitude, daylight: out.day, twilight: out.twilight, stars: out.stars, lamps: out.lampFactor, sunStrength: out.sunStrength, moonStrength: out.moonStrength, direct: out.directStrength, ambientFloor: out.ambientFloor, diffuseFloor: out.diffuseFloor, shadow: out.shadowStrength, shadowFloor: out.shadowFloor, darkest: out.outdoorDarkestSurfaceEstimate, declination: out.solarDeclination, sunrise: out.sunriseHour, sunset: out.sunsetHour, clear: [...out.clear], horizon: [...out.horizon], zenith: [...out.zenith], sky: [...out.sky], ground: [...out.ground], matrix: [...out.starMatrix] }; };
    const base = sample(12), rise = sample(base.sunrise), noon = sample(12), set = sample(base.sunset), midnight = sample(0, 80, 80);
    const summer = sample(12, 172), summerRise = sample(summer.sunrise, 172), winter = sample(12, 355), winterRise = sample(winter.sunrise, 355);
    const morning = [8, 9, 10].map((h) => sample(h)), afternoon = [14, 15, 16].map((h) => sample(h));
    const angle = (a, z) => Math.acos(Math.max(-1, Math.min(1, a.x * z.x + a.y * z.y + a.z * z.z))) * 180 / Math.PI;
    let previous = null, maxSunStep = 0, maxMoonStep = 0, maxStarStep = 0, maxColorStep = 0, maxDirectStep = 0, maxShadowStep = 0;
    for (let minute = 0; minute <= 1440; minute++) {
      const rawHour = minute / 60, h = rawHour === 24 ? 0 : rawHour, current = sample(h, 80, 79 + rawHour / 24);
      if (previous) {
        maxSunStep = Math.max(maxSunStep, angle(previous.sun, current.sun));
        maxMoonStep = Math.max(maxMoonStep, angle(previous.moon, current.moon));
        for (let i = 0; i < 9; i++) maxStarStep = Math.max(maxStarStep, Math.abs(previous.matrix[i] - current.matrix[i]));
        for (let i = 0; i < 3; i++) maxColorStep = Math.max(maxColorStep, Math.abs(previous.clear[i] - current.clear[i]), Math.abs(previous.sky[i] - current.sky[i]), Math.abs(previous.ground[i] - current.ground[i]));
        maxDirectStep = Math.max(maxDirectStep, Math.abs(previous.direct - current.direct));
        maxShadowStep = Math.max(maxShadowStep, Math.abs(previous.shadow - current.shadow));
      }
      previous = current;
    }
    const phases = [0, 5, 6.9, 7, 11, 15.9, 16, 19, 22.9, 23, 23.9].map(D.phaseAt);
    const luma = (c) => c[0] * 0.2126 + c[1] * 0.7152 + c[2] * 0.0722;
    const visibility = [0, 5, 6, 18, 19, 22].map((h) => { const s = sample(h); return { hour: h, ambientMin: Math.min(...s.sky, ...s.ground), ambientSpan: Math.max(...s.sky, ...s.ground) - Math.min(...s.sky, ...s.ground), silhouetteContrast: luma(s.sky) - luma(s.zenith) }; });
    return { rise, noon, set, midnight, summer, summerRise, winter, winterRise, morning, afternoon, phases, visibility, continuity: { maxSunStep, maxMoonStep, maxStarStep, maxColorStep, maxDirectStep, maxShadowStep } };
  })()`);
  record("daylight: equinox sun rises east, crosses the southern sky and sets west", keys.rise.sun.x > 0.98 && Math.abs(keys.rise.sun.y) < 0.02 && keys.noon.sun.z > 0.3 && Math.abs(keys.noon.sun.x) < 1e-6 && keys.set.sun.x < -0.98 && Math.abs(keys.set.sun.y) < 0.02, JSON.stringify({ rise: keys.rise, noon: keys.noon, set: keys.set }));
  const poleAltitude = Math.asin(keys.noon.pole.y) * 180 / Math.PI;
  record("daylight: the gate is true north and its celestial pole is 20 degrees above that horizon", Math.abs(keys.noon.pole.x) < 1e-8 && keys.noon.pole.z < -0.9 && Math.abs(poleAltitude - 20) < 1e-5, JSON.stringify({ pole: keys.noon.pole, altitude: poleAltitude }));
  const c = keys.continuity;
  record("daylight: celestial motion, colors, direct light and shadows are continuous through all boundaries and midnight", c.maxSunStep < 0.27 && c.maxMoonStep < 0.28 && c.maxStarStep < 0.005 && c.maxColorStep < 0.03 && c.maxDirectStep < 0.05 && c.maxShadowStep < 0.05, JSON.stringify(c));
  record("daylight: dawn, dusk and night retain a readable ambient floor and silhouette contrast", keys.visibility.every((s) => s.ambientMin >= 0.225 && s.ambientSpan >= 0.12 && s.silhouetteContrast >= 0.08), JSON.stringify(keys.visibility));
  record("daylight: night visibility uses bounded ambient, back-face diffuse and shadow floors", keys.midnight.darkest >= 0.27 && keys.midnight.ambientFloor === 0.27 && keys.midnight.diffuseFloor === 0.1 && keys.midnight.shadowFloor === 0.38 && keys.midnight.moonStrength <= 0.26, JSON.stringify(keys.midnight));
  record("daylight: the sun continues below ground while its own direct and shadow contribution reaches zero", keys.midnight.sun.y < -0.8 && keys.midnight.sunStrength === 0 && keys.midnight.daylight === 0 && keys.midnight.stars === 1, JSON.stringify(keys.midnight));
  const shadowArc = keys.morning[0].sun.x > keys.morning[1].sun.x && keys.morning[1].sun.x > keys.morning[2].sun.x && keys.afternoon[0].sun.x > keys.afternoon[1].sun.x && keys.afternoon[1].sun.x > keys.afternoon[2].sun.x && keys.morning[1].light.x > 0 && keys.afternoon[1].light.x < 0;
  record("daylight: morning and afternoon shadow directions oppose and advance monotonically", shadowArc, JSON.stringify({ morning: keys.morning.map((s) => s.light), afternoon: keys.afternoon.map((s) => s.light) }));
  record("daylight: axial tilt changes declination, sunrise direction and seasonal day length", keys.summer.declination > 23 && keys.winter.declination < -23 && keys.summer.sunset - keys.summer.sunrise > keys.winter.sunset - keys.winter.sunrise + 2 && keys.summerRise.sun.z < 0 && keys.winterRise.sun.z > 0, JSON.stringify({ summer: keys.summer, summerRise: keys.summerRise, winter: keys.winter, winterRise: keys.winterRise }));
  const noonOk = Math.abs(keys.noon.clear[0] - 0.36) < 1e-6 && Math.abs(keys.noon.clear[2] - 0.82) < 1e-6 && keys.noon.sunStrength === 1 && keys.noon.stars === 0 && keys.noon.lamps === 0 && keys.noon.daylight === 1;
  record("daylight: noon reproduces the original hub look and the six phases sit on their hours", noonOk && keys.phases.join(",") === "midnight,dawn,dawn,morning,noon,noon,dusk,night,night,midnight,midnight", JSON.stringify(keys));
  const night = await b.evaluate(`(() => { const B = window.__ooga, o = B.renderOpts, d = B.daylight, luma = (c) => c[0] * 0.2126 + c[1] * 0.7152 + c[2] * 0.0722; return { hour: d.hour, continuousDay: d.continuousDay, dayOfYear: d.dayOfYear, latitude: d.latitude, phase: d.phase, altitude: d.sunAltitude, azimuth: d.sunAzimuth, sidereal: d.siderealAngle, source: d.activeLightSource, strength: d.directStrength, moon: d.moonStrength, ambientFloor: d.ambientFloor, diffuseFloor: d.diffuseFloor, shadow: d.shadowStrength, shadowFloor: d.shadowFloor, stars: o.stars, torch: o.torch, day: o.day, darkest: d.outdoorDarkestSurfaceEstimate, silhouetteContrast: luma(o.sky) - luma(o.zenith), lights: o.lightCount, tier: B.renderer.quality, lamps: B.lamps.map((l) => +l.node.glow.toFixed(2)), lit: B.lamps.every((l) => l.lit), critters: B.critters, subtitle: document.getElementById("subtitle").textContent, gl: B.renderer.stats }; })()`);
  record("daylight: day override and bounded debug values use the production 20-degree latitude", night.hour === 22 && night.dayOfYear === 80 && night.latitude === 20 && Number.isFinite(night.continuousDay) && Number.isFinite(night.altitude) && Number.isFinite(night.azimuth) && Number.isFinite(night.sidereal), JSON.stringify(night));
  record("daylight: night ambient stays readable and contrasted while below-ground sunlight is disabled", night.darkest >= 0.27 && night.ambientFloor === 0.27 && night.diffuseFloor === 0.1 && night.shadowFloor === 0.38 && night.silhouetteContrast >= 0.08 && night.altitude < 0 && night.strength <= 0.26 && night.shadow <= 0.13, JSON.stringify(night));
  record("daylight: at 22h the hub is night with stars, every lamp lit, ten point lights on the high tier and a fixed subtitle", night.hour === 22 && night.phase === "night" && night.stars === 1 && night.torch === 1 && night.day === 0 && night.lit && night.lamps.every((g) => g > 0.5) && (night.tier !== "high" || night.lights === 10) && night.subtitle === "an island of caves", JSON.stringify(night));
  record("daylight: fireflies and embers are out at night and the butterflies are gone", night.critters.fireflies > 0 && night.critters.embers > 0 && night.critters.butterflies === 0, JSON.stringify(night.critters));
  record("daylight: the camera pass culls what the frustum cannot see and still draws the island", night.gl.culled > 0 && night.gl.drawn > 0, JSON.stringify(night.gl));
  const stableStars = await b.evaluate(`new Promise((resolve) => { const B = window.__ooga, before = Array.from(B.renderOpts.starMatrix); B.camera.position.x += 0.25; const start = B.renderedFrames; const tick = () => { if (B.renderedFrames >= start + 3) resolve({ before, after: Array.from(B.renderOpts.starMatrix) }); else requestAnimationFrame(tick); }; requestAnimationFrame(tick); })`);
  record("daylight: camera movement does not rotate the world-space stars", stableStars.before.every((v, i) => v === stableStars.after[i]), JSON.stringify(stableStars));
  const reset = await b.evaluate(`new Promise((resolve) => { const B = window.__ooga; [...B.cavemen.values()].forEach((c) => { c.nextBuildAt = 1e9; }); B.setHour(12, NaN, 172); const warm = B.renderedFrames; const begin = () => { const before = { nodes: B.stats().allNodes, records: B.renderer.stats.records, shadowResources: B.renderer.stats.shadowResources, shadowSize: B.renderer.stats.shadowSize }; let resets = 0; const tick = () => { B.setHour(12, NaN, 172); resets++; if (resets < 24) requestAnimationFrame(tick); else requestAnimationFrame(() => resolve({ before, after: { nodes: B.stats().allNodes, records: B.renderer.stats.records, shadowResources: B.renderer.stats.shadowResources, shadowSize: B.renderer.stats.shadowSize, finite: B.renderer.stats.shadowFinite } })); }; requestAnimationFrame(tick); }; const wait = () => B.renderedFrames >= warm + 16 ? begin() : requestAnimationFrame(wait); requestAnimationFrame(wait); })`);
  record("daylight: repeated clock resets keep nodes and GPU shadow resources constant, including near overhead", reset.after.nodes === reset.before.nodes && reset.after.records === reset.before.records && reset.after.shadowResources === reset.before.shadowResources && reset.after.shadowSize === reset.before.shadowSize && reset.after.finite, JSON.stringify(reset));
  await b.evaluate(`window.__ooga.setHour(22, NaN, 80)`);
  await untilPage(b, "B.daylight.hour === 22 && B.critters.fireflies > 0");
  const shaken = await b.evaluate(`(() => { const B = window.__ooga, orbit = B.pilot.orbit, scene = window.BL.scenes.hub, canvas = document.getElementById("scene"), tree = B.props.find((o) => o.prop === "tree" && o.active); orbit.target = { x: tree.x, y: tree.node.world[13] + 1.5, z: tree.z }; orbit.tx = orbit.target.x; orbit.ty = orbit.target.y; orbit.tz = orbit.target.z; for (let i = 0; i < 8; i++) { orbit.yaw = orbit.tYaw = i * Math.PI / 4; orbit.pitch = orbit.tPitch = 0.45; orbit.dist = orbit.tDist = 8; B.pilot.update(1); B.pilot.update(1); B.renderer.render(scene.root, B.camera, B.renderOpts); for (const height of [1, 1.5, 2, 2.5]) { const p = B.project(tree.x, tree.node.world[13] + height, tree.z); if (p && document.elementFromPoint(p.x, p.y) === canvas && B.input.pick(p.x, p.y)?.owner === tree) return { x: p.x, y: p.y, fireflies: B.critters.fireflies, tree: true }; } } throw new Error("No visible tree click point"); })()`);
  await b.click(shaken.x, shaken.y);
  await b.sleep(150);
  const scattered = await b.evaluate(`(() => { const B = window.__ooga; return { particles: B.stats().particles, toast: document.getElementById("toast").textContent }; })()`);
  record("daylight: clicking a tree at night throws leaves and scatters fireflies", shaken.tree && shaken.fireflies > 0 && scattered.particles > 0 && scattered.toast.length > 0, JSON.stringify({ shaken, scattered }));
  await b.evaluate(`window.__ooga.setPileLevel(1000000)`);
  const perf = await b.evaluate(`new Promise((resolve) => { const t0 = performance.now(); let frames = 0; const tick = () => { frames++; if (performance.now() - t0 < 2000) requestAnimationFrame(tick); else resolve({ fps: +(frames / 2).toFixed(1), shown: window.__ooga.shown, lights: window.__ooga.renderOpts.lightCount }); }; requestAnimationFrame(tick); })`);
  record("daylight: the million-banana hub at night with lights and fireflies keeps 50 FPS", perf.fps >= 50 && perf.shown >= 999999, JSON.stringify(perf));
});

const dayCycle = () => withPage("day cycle", hubPage(src, "hour=4.9&day=80&daylen=12&bananas=1000000"), async (b) => {
  const cycle = await b.evaluate(`new Promise((resolve) => { const B = window.__ooga; const phases = [], lights = {}, toasts = new Set(); let last = null, frames = 0; const t0 = performance.now(), day0 = B.daylight.continuousDay, shown0 = B.shown, resources = B.renderer.stats.shadowResources; const tick = () => { frames++; const p = B.daylight.phase; if (p !== last) { phases.push(p); last = p; } lights[p] = B.renderOpts.lightCount; const t = document.getElementById("toast").textContent; if (t) toasts.add(t); if (B.daylight.continuousDay < day0 + 1 && performance.now() - t0 < 15000) requestAnimationFrame(tick); else { const elapsed = (performance.now() - t0) / 1000; resolve({ phases, lights, toasts: [...toasts], subtitle: document.getElementById("subtitle").textContent, stats: B.stats(), fps: +(frames / elapsed).toFixed(1), elapsed: +elapsed.toFixed(2), day0, day1: B.daylight.continuousDay, dayOfYear: B.daylight.dayOfYear, shown0, shown: B.shown, resources: [resources, B.renderer.stats.shadowResources], shadowFinite: B.renderer.stats.shadowFinite }); } }; tick(); })`);
  const order = ["dawn", "morning", "noon", "dusk", "night", "midnight"];
  const inOrder = cycle.phases.length === 7 && cycle.phases.every((p, i) => p === order[(order.indexOf(cycle.phases[0]) + i) % 6]);
  record("day cycle: the six phases pass in order under daylen while the subtitle stays fixed", inOrder && cycle.subtitle === "an island of caves", JSON.stringify({ phases: cycle.phases, subtitle: cycle.subtitle }));
  record("day cycle: point lights are off by day and on at night, with a toast at each phase", cycle.lights.noon === 0 && cycle.lights.morning === 0 && cycle.lights.night === 10 && cycle.lights.midnight === 10 && cycle.toasts.length >= 5, JSON.stringify({ lights: cycle.lights, toasts: cycle.toasts }));
  record("day cycle: accelerated time crosses midnight continuously and keeps the million-banana hub at 50 FPS", cycle.day1 >= cycle.day0 + 1 && cycle.dayOfYear === 81 && cycle.shown0 >= 999999 && cycle.shown >= cycle.shown0 - 5 && cycle.fps >= 50 && cycle.resources[0] === cycle.resources[1] && cycle.shadowFinite, JSON.stringify(cycle));
  record("day cycle: nothing accumulates across a day", cycle.stats.tweens <= 12 && cycle.stats.bubbles <= 10 && cycle.stats.zzz <= 40 && cycle.stats.particles <= 240 && cycle.stats.pool <= 60, JSON.stringify(cycle.stats));
});

const bannerClock = () => withPage("banner clock", `${src}?debug=1&nosim=1`, async (b) => {
  const local = await b.evaluate(`(() => { const B = window.__ooga, el = document.getElementById("world-clock"), title = document.querySelector(".brand h1"), subtitle = document.getElementById("subtitle"), bananas = document.querySelector(".world-bananas"), count = document.getElementById("world-banana-count"), icon = bananas.querySelector(".banana-icon"), now = new Date(), [h, m] = el.dateTime.split(":").map(Number), current = now.getHours() * 60 + now.getMinutes(), shown = h * 60 + m, delta = Math.min(Math.abs(current - shown), 1440 - Math.abs(current - shown)), svg = el.querySelector("svg"), path = el.querySelector("path"), style = getComputedStyle(bananas), subtitleStyle = getComputedStyle(subtitle), rect = el.getBoundingClientRect(), bananaRect = bananas.getBoundingClientRect(); return { delta, label: el.getAttribute("aria-label"), dateTime: el.dateTime, viewBox: svg.getAttribute("viewBox"), glyphs: path.getAttribute("d").length, fontSize: parseFloat(getComputedStyle(el).fontSize), titleSize: parseFloat(getComputedStyle(title).fontSize), rect: rect.toJSON(), bananas: { button: bananas.tagName === "BUTTON", count: count.textContent, level: Math.floor(B.level), panel: document.getElementById("meter-count").textContent, paths: bananas.querySelectorAll("path").length, below: bananaRect.top >= rect.bottom, font: style.fontFamily === subtitleStyle.fontFamily && style.fontSize === subtitleStyle.fontSize && style.letterSpacing === subtitleStyle.letterSpacing, fontSize: parseFloat(style.fontSize), iconOffset: new DOMMatrix(getComputedStyle(icon).transform).m42 } }; })()`);
  record("banner clock: normal mode shows local time with a larger subtitle-font banana button beneath it", local.delta <= 1 && local.label.startsWith("Local time ") && /^\d\d:\d\d$/.test(local.dateTime) && local.viewBox === "0 0 30 6" && local.glyphs > 100 && local.rect.width > 0 && local.fontSize === local.titleSize && local.bananas.button && local.bananas.count === local.bananas.level.toLocaleString("en-US") && local.bananas.count === local.bananas.panel && local.bananas.paths === 3 && local.bananas.below && local.bananas.font && local.bananas.fontSize === 12 && local.bananas.iconOffset === -1, JSON.stringify(local));
  const presentation = await b.evaluate(`(() => { const B = window.__ooga, M = window.BL.headquartersModels, light = [135, 120, 105], ramps = B.headquarters.entrances.filter((entry) => entry.ramp).map((entry) => { const faces = entry.node.geometry.faces.filter((face) => face.headquartersEntranceLintel); return { roomIndex: entry.roomIndex, model: entry.node.geometry === M.rampEntrance(entry.roomIndex), faces: faces.length, light: faces.every((face) => face.color.every((channel, i) => channel === light[i])) }; }), room = B.headquarters.entrances.find((entry) => !entry.ramp), roomFaces = room.node.geometry.faces.filter((face) => face.headquartersEntranceLintel); return { subtitle: document.getElementById("subtitle").textContent, ramps, roomSeparate: room.node.geometry !== M.rampEntrance(room.roomIndex), roomVaried: roomFaces.some((face) => !face.color.every((channel, i) => channel === light[i])) }; })()`);
  record("hub presentation: the subtitle omits the phase and both basement-ramp lintels use their separate light-stone model", presentation.subtitle === "an island of caves" && presentation.ramps.length === 2 && presentation.ramps.every((ramp) => ramp.model && ramp.faces === 48 && ramp.light) && presentation.roomSeparate && presentation.roomVaried, JSON.stringify(presentation));
  const hover = await b.evaluate(`(() => { const el = document.getElementById("world-bananas"), r = el.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2, before: getComputedStyle(el).color }; })()`);
  await b.mouse("mouseMoved", hover.x, hover.y, { button: "none" });
  await b.sleep(150);
  hover.after = await b.evaluate(`getComputedStyle(document.getElementById("world-bananas")).color`);
  record("banner clock: the banana count is paper white and turns banana yellow on hover", hover.before === "rgb(243, 239, 228)" && hover.after === "rgb(255, 216, 74)", JSON.stringify(hover));
  await b.evaluate(`(() => { const B = window.__ooga, cave = [...B.cavemen.values()].find((entry) => entry.state === "working"); B.pilot.possess(cave); B.hud.toast("Balanced message spacing", 3000); })()`);
  await b.sleep(400);
  const spacing = await b.evaluate(`(() => { const act = document.getElementById("act").getBoundingClientRect(), toast = document.getElementById("toast").getBoundingClientRect(); return { width: innerWidth, above: toast.top - act.bottom, below: innerHeight - toast.bottom, act: act.toJSON(), toast: toast.toJSON() }; })()`);
  record("banner clock: wide-screen messages have equal space above to JUMP and below to the viewport edge", spacing.width > 960 && spacing.above > 8 && Math.abs(spacing.above - spacing.below) < 0.5, JSON.stringify(spacing));
  const count = await b.evaluate(`new Promise((resolve) => { const B = window.__ooga, el = document.getElementById("world-banana-count"); B.setPileLevel(4321); const start = performance.now(), tick = () => { if (el.textContent === "4,321" || performance.now() - start > 2000) resolve(el.textContent); else requestAnimationFrame(tick); }; tick(); })`);
  record("banner clock: the comma-formatted banana readout follows the live shared pile count", count === "4,321", count);
  await b.open(hubPage(src, "hour=5&daylen=86400"));
  await untilReady(b);
  const relative = await b.evaluate(`new Promise((resolve) => { const B = window.__ooga, el = document.getElementById("world-clock"), read = () => { const [h, m] = el.dateTime.split(":").map(Number), world = Math.floor(B.daylight.hour * 60) % 1440, shown = h * 60 + m, delta = Math.min(Math.abs(world - shown), 1440 - Math.abs(world - shown)); return { delta, label: el.getAttribute("aria-label"), dateTime: el.dateTime, viewport: innerWidth, rect: el.getBoundingClientRect().toJSON() }; }; const first = read(); B.setHour(22.5, 86400, 80); const start = performance.now(), tick = () => { const next = read(); if (next.dateTime.startsWith("22:3") || performance.now() - start > 2000) resolve({ first, next }); else requestAnimationFrame(tick); }; requestAnimationFrame(tick); })`);
  record("banner clock: accelerated debug time follows the world and keeps xx:xx AM/PM centered without hour-width jiggle", relative.first.delta <= 1 && relative.next.delta <= 1 && relative.first.label.startsWith("Ooga Booga time 5:0") && relative.next.label.startsWith("Ooga Booga time 10:3") && Math.abs(relative.first.rect.x - relative.next.rect.x) < 0.01 && Math.abs(relative.first.rect.width - relative.next.rect.width) < 0.01 && Math.abs(relative.first.rect.x + relative.first.rect.width / 2 - relative.first.viewport / 2) < 0.01, JSON.stringify(relative));
  const headerAt = async (width) => {
    await b.send("Emulation.setDeviceMetricsOverride", { width, height: 800, deviceScaleFactor: 1, mobile: false });
    await untilPage(b, `innerWidth === ${width} && B.renderer.size.width === ${width}`);
    return b.evaluate(`(() => { const title = document.querySelector(".brand h1"), subtitle = document.getElementById("subtitle"), clock = document.getElementById("world-clock"), bananas = document.getElementById("world-bananas"); return { width: innerWidth, title: parseFloat(getComputedStyle(title).fontSize), subtitle: getComputedStyle(subtitle).display, subtitleSize: parseFloat(getComputedStyle(subtitle).fontSize), clock: parseFloat(getComputedStyle(clock).fontSize), bananas: parseFloat(getComputedStyle(bananas).fontSize) }; })()`);
  };
  const medium = await headerAt(800), narrow = await headerAt(720);
  record("banner clock: the full wide header switches directly to the narrow header without an intermediate hidden-subtitle state", medium.title === 22 && medium.subtitle !== "none" && medium.subtitleSize === 12 && medium.clock === 22 && medium.bananas === 12 && narrow.title === 13 && narrow.subtitle !== "none" && narrow.subtitleSize === 10.5 && narrow.clock === 13 && narrow.bananas === 10.5, JSON.stringify({ medium, narrow }));
});

const preloadedDebugView = () => withPage("preloaded debug view", hubPage(src, "view=hq"), async (b) => {
  const loaded = await b.evaluate(`(() => { const B = window.__ooga, p = B.camera.position, t = B.camera.target, opening = B.cameraCave.openings.find((entry) => entry.caveIndex === B.cameraCave.index), toFire = [-p.x, B.island.headquarters.floor + 0.8 - p.y, -p.z], look = [t.x - p.x, t.y - p.y, t.z - p.z], dot = (toFire[0] * look[0] + toFire[1] * look[1] + toFire[2] * look[2]) / Math.max(1e-9, Math.hypot(...toFire) * Math.hypot(...look)); return { scene: B.scene, mode: B.pilot.mode, selected: !!B.pilot.player, y: p.y, camera: B.cameraCave.index, headquarters: !!opening && opening.headquarters, dot }; })()`);
  record("preloaded debug view: view=hq opens the connected headquarters facing its fire", loaded.scene === "hub" && loaded.mode === "orbit" && !loaded.selected && loaded.y < 0 && loaded.camera !== 0 && loaded.headquarters && loaded.dot > 0.99, JSON.stringify(loaded));
  const initialView = `(() => { const B = window.__ooga, p = B.camera.position, c = B.pilot.player, q = c && c.root.position; return { scene: B.scene, renderer: B.renderer.kind, mode: B.pilot.mode, mix: B.pilot.closeMix, selected: c ? c.traits.name : null, headHidden: !!c && c.parts.head.cameraHidden, y: p.y, camera: B.cameraCave.index, player: B.cameraCave.playerIndex, eyeClear: B.island.clearAt(p.x, p.y - 0.3, p.z, 0.3, 0.6), bodyClear: !c || B.island.clearAt(q.x, q.y - c.baseY + 1e-5, q.z, 0.3, c.bodyHeight) }; })()`;
  for (const renderer of ["webgl2", "canvas2d"]) {
    const backend = renderer === "canvas2d" ? "canvas2d=1&" : "";
    for (const fixture of [
      { query: "firstperson=1", mode: "eye-level", selected: null },
      { query: "character=%20W-S-BITCOIN%20", mode: "trailing", selected: "w-s-bitcoin" },
      { query: "firstperson=1&character=w-s-bitcoin&view=hq", mode: "first-person", selected: "w-s-bitcoin" },
      { query: "firstperson=0&character=unknown-ooga", mode: "orbit", selected: null }
    ]) {
      await b.open(hubPage(src, backend + fixture.query));
      await untilReady(b);
      const start = await b.evaluate(initialView), close = fixture.mode === "eye-level" || fixture.mode === "first-person", underground = fixture.query.includes("view=hq");
      record(`preloaded debug view ${renderer}: ${fixture.query} starts in ${fixture.mode}`, start.scene === "hub" && start.renderer === renderer && start.mode === fixture.mode && start.selected === fixture.selected && start.mix === Number(close) && start.eyeClear && start.bodyClear && (!underground || start.y < 0 && start.camera !== 0 && start.player !== 0 && start.headHidden), JSON.stringify(start));
    }
  }
  await b.open(hubPage(src, "firstperson=1&character=w-s-bitcoin&view=hq"));
  await untilReady(b);
  const travel = (id) => b.evaluate(`new Promise((resolve) => { const B = window.__ooga, t0 = performance.now(); let enteredAt = 0; B.go(${JSON.stringify(id)}); const tick = () => { if (!enteredAt && B.scene === ${JSON.stringify(id)}) enteredAt = B.renderedFrames; if (enteredAt && B.renderedFrames >= enteredAt + 25) resolve(true); else if (performance.now() - t0 > 6000) resolve(false); else requestAnimationFrame(tick); }; requestAnimationFrame(tick); })`);
  const reachedLab = await travel("lab"), reachedHub = await travel("hub"), returned = await b.evaluate(initialView);
  record("preloaded debug view: startup control flags are not reapplied after returning to the hub", reachedLab && reachedHub && returned.scene === "hub" && returned.mode === "orbit" && !returned.selected && returned.y < 0, JSON.stringify(returned));
  await b.open(hubPage(src, "scene=lab&firstperson=1&character=w-s-bitcoin"));
  await untilReady(b);
  const routed = await b.evaluate(`({ scene: window.__ooga.scene, selected: !!window.__ooga.crew.player })`);
  record("preloaded debug view: startup control flags preserve explicit scene routing", routed.scene === "lab" && !routed.selected, JSON.stringify(routed));
  await b.open(hubPage(src));
  await untilReady(b);
  const defaults = await b.evaluate(initialView);
  record("preloaded debug view: reopening without flags keeps the default free orbit view", defaults.mode === "orbit" && !defaults.selected && defaults.mix === 0 && defaults.y > 0 && defaults.camera === 0, JSON.stringify(defaults));
  await b.open(`${src}?nosim=1&view=hq&firstperson=1&character=w-s-bitcoin`);
  const started = Date.now();
  let ignored = null;
  while (!ignored && Date.now() - started < 20000) {
    try {
      ignored = await b.evaluate(`(() => { const scene = window.BL?.scenes.hub; if (window.__ooga || !scene?.debug || document.getElementById("curtain")) return null; const p = scene.camera.position; return { y: p.y, targetY: scene.camera.target.y, mode: scene.debug.pilot.mode, selected: !!scene.debug.pilot.player }; })()`);
    } catch {
      // The previous debug document may still be tearing down.
    }
    if (!ignored) await b.sleep(40);
  }
  record("preloaded debug view: view and startup control flags are ignored outside debug mode", !!ignored && ignored.y > 0 && ignored.targetY >= 0 && ignored.mode === "orbit" && !ignored.selected, JSON.stringify(ignored));
});

const debugBasementView = () => withPage("debug basement view", hubPage(src, "view=bsmt&jetpack=1"), async (b) => {
  const fixtures = [
    { base: src, query: "view=bsmt&jetpack=1", backend: "webgl2", mode: "orbit", selected: null },
    { base: dist, query: "view=bsmt&firstperson=1&canvas2d=1", backend: "canvas2d", mode: "eye-level", selected: null },
    { base: src, query: "view=bsmt&firstperson=1&character=w-s-bitcoin&jetpack=1", backend: "webgl2", mode: "first-person", selected: "w-s-bitcoin" }
  ];
  for (const [i, fixture] of fixtures.entries()) {
    if (i) { await b.open(hubPage(fixture.base, fixture.query)); await untilReady(b); }
    const r = await b.evaluate(`(${basementStartupSnapshot.toString()})()`), close = fixture.mode !== "orbit";
    const owned = fixture.query.includes("jetpack=1");
    record(`debug basement view: ${fixture.backend} ${fixture.mode} starts safely with owned jetpacks visible and disabled`, r.backend === fixture.backend && r.scene === "hub" && r.mode === fixture.mode && r.selected === fixture.selected && r.mix === Number(close) && r.inside && r.supported && r.eyeClear && r.bodyClear && r.eyeY >= r.floor && r.eyeY < r.ceiling && r.camera !== 0 && !r.equipped && r.ownedJetpack === owned && r.hiddenJetpack !== owned && r.disabledJetpack === owned && (!fixture.selected || Math.abs(r.feet - r.floor) < 1e-6 && r.player !== 0 && r.headHidden), JSON.stringify(r));
  }
});

const debugTimeUrl = () => withPage("debug time URL", hubPage(src, "time=0000&hour=5&daylen=1&day=80"), async (b) => {
  const parsing = await b.evaluate(`(${debugTimeParsingProbe.toString()})()`);
  record("debug time URL: only four valid HHMM digits parse and a time pin overrides hour and day length", parsing.parsed.every((row) => Math.abs(row.actual - row.expected) < 1e-12) && parsing.rejected.every((row) => row.rejected) && parsing.before.every((hour, i) => Math.abs(hour - parsing.parsed[i].expected) < 1e-12 && hour === parsing.after[i]) && parsing.fallback === 7 && parsing.advanced, JSON.stringify(parsing));
  const pinned = (sample, expected) => Math.abs(sample.hour - expected) < 1e-9 && sample.day === 80
    && sample.dateTime === `${String(Math.floor(expected)).padStart(2, "0")}:${String(Math.round(expected * 60) % 60).padStart(2, "0")}` && sample.label.startsWith("Ooga Booga time ");
  const unchanged = (a, b) => a.hour === b.hour && a.continuous === b.continuous && a.dateTime === b.dateTime && a.sun.every((value, i) => value === b.sun[i]) && a.stars.every((value, i) => value === b.stars[i]) && a.sky.every((value, i) => value === b.sky[i]);
  for (const fixture of [
    { time: "0000", hour: 0, base: src, extra: "", label: "12:00 AM" },
    { time: "1300", hour: 13, base: dist, extra: "&canvas2d=1", label: "1:00 PM" },
    { time: "1347", hour: 13 + 47 / 60, base: src, extra: "", label: "1:47 PM" }
  ]) {
    if (fixture.time !== "0000") { await b.open(hubPage(fixture.base, `time=${fixture.time}&hour=5&daylen=1&day=80${fixture.extra}`)); await untilReady(b); }
    const r = await b.evaluate(`(${frozenClockProbe.toString()})({reset:true})`);
    record(`debug time URL: time=${fixture.time} freezes the displayed minute and sky despite hour, daylen and clock reset`, pinned(r.before, fixture.hour) && pinned(r.after, fixture.hour) && unchanged(r.before, r.after) && r.after.label === `Ooga Booga time ${fixture.label}`, JSON.stringify(r));
  }
  const visits = [];
  for (const id of ["drop", "hub"]) {
    await b.evaluate(`window.__ooga.go(${JSON.stringify(id)})`);
    const arrived = await untilPage(b, `B.scene === ${JSON.stringify(id)} && !B.transitioning`, 15000);
    const r = await b.evaluate(`(${frozenClockProbe.toString()})()`);
    visits.push({ arrived, ...r });
  }
  record("debug time URL: the frozen minute and celestial frame survive hub to drop to hub", visits.every((r) => r.arrived && pinned(r.before, 13 + 47 / 60) && pinned(r.after, 13 + 47 / 60) && unchanged(r.before, r.after)) && visits[0].after.continuous === visits[1].after.continuous && visits[0].after.sun.every((value, i) => value === visits[1].after.sun[i]) && visits[0].after.stars.every((value, i) => value === visits[1].after.stars[i]), JSON.stringify(visits));
  await b.open(hubPage(src, "time=2400&hour=7&day=80")); await untilReady(b);
  const invalid = await b.evaluate(`({ hour: window.__ooga.daylight.hour, label: document.getElementById("world-clock").getAttribute("aria-label") })`);
  record("debug time URL: malformed time is ignored and preserves the existing hour override", invalid.hour === 7 && invalid.label.startsWith("Local time "), JSON.stringify(invalid));
  await b.open(`${src}?nosim=1&time=1300&hour=5&daylen=1&view=bsmt&firstperson=1&character=w-s-bitcoin`);
  let ignored = null;
  const start = Date.now();
  while (!ignored && Date.now() - start < 20000) {
    try {
      ignored = await b.evaluate(`(() => { const s = window.BL?.scenes.hub; if (window.__ooga || !s?.debug || document.getElementById("curtain")) return null; const now = new Date(), local = now.getHours() * 60 + now.getMinutes(), el = document.getElementById("world-clock"), parts = el.dateTime.split(":").map(Number), shown = parts[0] * 60 + parts[1], delta = Math.abs(shown - local), skyDelta = Math.abs(s.debug.daylight.hour * 60 - local); return { label: el.getAttribute("aria-label"), delta: Math.min(delta, 1440 - delta), skyDelta: Math.min(skyDelta, 1440 - skyDelta), y: s.camera.position.y, mode: s.debug.pilot.mode, selected: !!s.debug.pilot.player }; })()`);
    } catch {
      // The preceding debug document can still be tearing down.
    }
    if (!ignored) await b.sleep(40);
  }
  record("debug time URL: time and basement startup flags are ignored without debug", !!ignored && ignored.label.startsWith("Local time ") && ignored.delta <= 1 && ignored.skyDelta <= 1.1 && ignored.y > 0 && ignored.mode === "orbit" && !ignored.selected, JSON.stringify(ignored));
});

const daylightCanvas = () => withPage("daylight canvas", hubPage(src, "canvas2d=1&hour=6&day=80"), async (b) => {
  const frames = await b.evaluate(`new Promise((resolve) => { const B = window.__ooga, samples = [], times = [6, 12, 18, 0]; let i = 0; const next = () => { B.setHour(times[i], NaN, 80); const start = B.renderedFrames; const tick = () => { if (B.renderedFrames < start + 2) return requestAnimationFrame(tick); const d = B.daylight; samples.push({ hour: d.hour, altitude: d.sunAltitude, daylight: d.daylightFactor, stars: d.starFactor, lamps: d.lampFactor }); i++; if (i < times.length) next(); else resolve({ kind: B.renderer.kind, samples, stats: B.renderer.stats }); }; requestAnimationFrame(tick); }; next(); })`);
  record("daylight canvas: dawn, noon, dusk and night render through the parity API", frames.kind === "canvas2d" && frames.samples.length === 4 && frames.samples.every((s) => Number.isFinite(s.altitude)) && frames.samples[1].daylight === 1 && frames.samples[3].stars === 1 && frames.stats.shadowResources === 0 && frames.stats.shadowFinite, JSON.stringify(frames));
});

// Walking the driven caveman off the cave roof arcs him clear of the front instead of dropping through it
const hubHopOff = () => withPage("hub hop-off", hubPage(src), async (b) => {
  const setup = await b.evaluate(`(() => { const B = window.__ooga; const cave = [...B.cavemen.values()].find((c) => c.state === "working" && !c.walk && !c.build); const m = B.mouths.find((m) => m.id === "c11"); const ox = Math.sin(m.angle), oz = -Math.cos(m.angle); B.crew.control(cave); const x = m.x + ox * 1.2, z = m.z + oz * 1.2; const roof = B.island.surfaceAt(x, z); cave.root.position.x = x; cave.root.position.z = z; cave.root.position.y = cave.baseY + roof; cave.hop = 0; cave.hopV = 0; cave.root.rotation.y = Math.PI - m.angle; B.pilot.orbit.tYaw = B.pilot.orbit.yaw = Math.PI - m.angle; return { name: cave.traits.name, roof, player: B.crew.player === cave }; })()`);
  await b.sleep(300);
  await b.send("Input.dispatchKeyEvent", { type: "keyDown", key: "w", text: "w" });
  const rows = await b.evaluate(`new Promise((resolve) => { const B = window.__ooga, p = B.crew.player, m = B.mouths.find((m) => m.id === "c11"), ox = Math.sin(m.angle), oz = -Math.cos(m.angle); const rows = []; const t0 = performance.now(); const tick = () => { const q = p.root.position; rows.push({ y: q.y - p.baseY, along: (q.x - m.x) * ox + (q.z - m.z) * oz, hop: p.hop }); if (performance.now() - t0 < 2500) requestAnimationFrame(tick); else resolve(rows); }; requestAnimationFrame(tick); })`);
  await b.send("Input.dispatchKeyEvent", { type: "keyUp", key: "w" });
  const drops = rows.slice(1).map((r, i) => rows[i].y - r.y);
  const left = rows.findIndex((r) => r.hop > 0);
  const landed = rows.findIndex((r, i) => left >= 0 && i > left && r.hop === 0);
  // The rim frame stands one unit in front of the face, up to the lintel
  const frontHit = rows.some((r) => r.along > -1.2 && r.along < 0.2 && r.y > 0.3 && r.y < 3.6);
  record("hub hop-off: leaving the cave roof falls over several frames, never a one-frame drop", setup.player && setup.roof > 3 && left > 0 && landed > left + 8 && Math.max(...drops) < 1, JSON.stringify({ roof: setup.roof, left, landed, maxDrop: +Math.max(...drops).toFixed(2), frames: rows.length }));
  record("hub hop-off: the arc clears the cave front and lands out on the apron", landed > 0 && !frontHit && rows[landed].along < -1.2 && Math.abs(rows[landed].y) < 0.1, JSON.stringify({ landing: rows[landed], frontHit }));
});


// ---------- Ooga Rally ----------
const racePage = (base, query) => `${base}?debug=1&nosim=1&scene=race${clock(query)}`;
// Run the race clock forward without frames: countdown, then the given seconds with everyone AI-driven
const autoRace = (track, seconds) => `(() => { const B = window.__ooga; document.querySelector('[data-track="${track}"]').click(); B.race.startRace(); B.race.simulate(4); B.racers.autopilot = true; B.racers.start(); B.race.simulate(${seconds}); return B.race.phase; })()`;

const raceGarage = () => withPage("race garage", racePage(src), async (b) => {
  const garage = await b.evaluate(`(() => { const B = window.__ooga; const q = (s) => document.querySelectorAll(s).length; return { scene: B.scene, phase: B.race.phase, racers: q("#garage-racers button"), mounts: q("#garage-mounts button"), tracks: q("#garage-tracks button"), medals: [...document.querySelectorAll("#garage-tracks .garage-medal")].map((m) => m.textContent), garageShown: !document.getElementById("garage").hidden, stripHidden: document.getElementById("race-strip").hidden, leaveShown: !document.querySelector('[data-scene="race"] [data-action="leave"]').hidden, lamps: B.track.lamps.length, records: B.renderer.stats.records, targets: B.input.targetCount, sheet: document.getElementById("sheet").dataset.open, onGrid: B.racers.racers.every((r) => r.node.visible && r.speed === 0 && r.mount), player: B.racers.player && B.racers.player.name, pressed: document.querySelector('#garage-mounts [aria-pressed="true"]').dataset.mount }; })()`);
  record("race garage: the scene lands in the garage with eight Oogas, three rides and three tracks", garage.scene === "race" && garage.phase === "garage" && garage.racers === 8 && garage.mounts === 3 && garage.tracks === 3 && garage.medals.every((m) => m === "NEW") && garage.garageShown && garage.stripHidden && garage.leaveShown && garage.lamps === 3 && garage.onGrid && garage.player === "portlandhodl" && garage.pressed === "kart" && garage.sheet === "false", JSON.stringify(garage));
  const eye = await b.evaluate(`(() => { const c = window.__ooga.camera; return { x: c.position.x, z: c.position.z, y: c.position.y, tx: c.target.x, tz: c.target.z }; })()`);
  await b.drag({ x: 150, y: 520 }, { x: 350, y: 480 });
  const swung = await b.evaluate(`(() => { const c = window.__ooga.camera, cam = window.__ooga.race.cam; return { x: c.position.x, z: c.position.z, y: c.position.y, tx: c.target.x, tz: c.target.z, yaw: cam.garageYaw, lift: cam.garageLift, phase: window.__ooga.race.phase }; })()`);
  const radius = (e) => Math.hypot(e.x - e.tx, e.z - e.tz);
  record("race garage: a drag swings the view round the grid and tilts it, keeping the grid in the middle", swung.phase === "garage" && swung.yaw < -0.5 && swung.lift < 0 && Math.abs(radius(swung) - radius(eye)) < 0.01 && Math.abs(swung.tx - eye.tx) < 1e-6 && Math.hypot(swung.x - eye.x, swung.z - eye.z) > 3 && swung.y < eye.y, JSON.stringify({ eye, swung }));
  await b.evaluate(`document.querySelector('[data-racer="bc1gui"]').click(); document.querySelector('[data-mount="dino"]').click()`);
  const picked = await b.evaluate(`(() => { const B = window.__ooga, p = B.racers.player; return { player: p.name, mount: p.mount.id, lastOnGrid: p.rank === 8, others: B.racers.racers.filter((r) => r !== p).map((r) => r.mount.id).sort().join(","), targets: B.input.targetCount }; })()`);
  record("race garage: picking an Ooga and a ride seats them on the grid, the visitor last", picked.player === "bc1gui" && picked.mount === "dino" && picked.lastOnGrid && picked.others.includes("kart") && picked.others.includes("run") && picked.targets === garage.targets, JSON.stringify(picked));
  await b.key("Enter");
  await b.sleep(600);
  const countdown = await b.evaluate(`(() => { const B = window.__ooga; return { phase: B.race.phase, center: document.getElementById("race-center").textContent, stripShown: !document.getElementById("race-strip").hidden, garageHidden: document.getElementById("garage").hidden, running: B.racers.running, itemBtn: !document.getElementById("item-btn").hidden }; })()`);
  await b.sleep(3400);
  const going = await b.evaluate(`(() => { const B = window.__ooga; return { phase: B.race.phase, running: B.racers.running, lamps: B.track.lamps.map((l) => l.glow), subtitle: document.getElementById("subtitle").textContent }; })()`);
  record("race garage: Enter starts a countdown, then the lamps light and the race runs", countdown.phase === "countdown" && countdown.center === "3" && countdown.stripShown && countdown.garageHidden && !countdown.running && countdown.itemBtn && going.phase === "racing" && going.running && going.lamps.every((g) => g === 1) && going.subtitle.includes("Banana Bay"), JSON.stringify({ countdown, going }));
  await b.key("Escape");
  await b.sleep(100);
  const paused = await b.evaluate(`(() => { const B = window.__ooga; const t = B.racers.raceTime; return { phase: B.race.phase, pauseShown: !document.getElementById("race-pause").hidden, t }; })()`);
  await b.sleep(400);
  const still = await b.evaluate(`window.__ooga.racers.raceTime`);
  await b.evaluate(`document.querySelector('[data-action="race-resume"]').click()`);
  await b.sleep(400);
  const resumed = await b.evaluate(`(() => { const B = window.__ooga; return { phase: B.race.phase, t: B.racers.raceTime, pauseHidden: document.getElementById("race-pause").hidden }; })()`);
  record("race garage: Escape pauses the clock and Resume restarts it", paused.phase === "paused" && paused.pauseShown && still === paused.t && resumed.phase === "racing" && resumed.t > still && resumed.pauseHidden, JSON.stringify({ paused, still, resumed }));
  await b.evaluate(`document.querySelector('[data-action="garage"]').click()`);
  await b.sleep(200);
  const back = await b.evaluate(`(() => { const B = window.__ooga; return { phase: B.race.phase, garageShown: !document.getElementById("garage").hidden, stripHidden: document.getElementById("race-strip").hidden, speed: B.racers.player.speed }; })()`);
  record("race garage: the Garage button returns to the board and parks everyone", back.phase === "garage" && back.garageShown && back.stripHidden && back.speed === 0, JSON.stringify(back));
});

const raceTracks = ["race tracks", async (b) => {
  const built = await b.evaluate(`(() => { const B = window.__ooga, T = window.BL.raceTrack, out = {}; for (const def of T.TRACKS) { const t0 = performance.now(); document.querySelector('[data-track="' + def.id + '"]').click(); const ms = performance.now() - t0; const t = B.track, S = t.samples, n = t.count; let maxStep = 0, gapNearCheck = false; for (let i = 0; i < n; i++) { const q = (i + 1) % n; if (S.surface[i] !== T.SURF.gap && S.surface[q] !== T.SURF.gap) maxStep = Math.max(maxStep, Math.abs(S.y[q] - S.y[i])); } for (const c of t.checkpoints) for (let k = 0; k < 30; k++) if (S.surface[(c + k) % n] === T.SURF.gap) gapNearCheck = true; const faces = t.sectors.reduce((sum, s) => sum + s.nodes.road.geometry.faces.length + s.nodes.big.geometry.faces.length + s.nodes.small.geometry.faces.length, 0); const h0 = t.heightAt(t.grid[0].x, t.grid[0].z, -1); out[def.id] = { ms: Math.round(ms), samples: n, length: Math.round(t.length), sectors: t.sectors.length, chunks: t.terrainNodes.length, checkpoints: t.checkpoints.length, first: t.checkpoints[0], gapNearCheck, maxStep: +maxStep.toFixed(2), faces, bananas: t.spawns.bananas.length, crates: t.spawns.crates.length, pads: t.spawns.pads.length, map: t.mapPts.length, grid: t.grid.length, gridHeight: Math.abs(h0 - t.grid[0].y) < 1e-6, torches: t.torches.length, spectators: t.spectators.count, records: B.renderer.stats.records, sky: !!(t.renderOpts.horizon && t.renderOpts.zenith) }; } return out; })()`);
  for (const [id, t] of Object.entries(built)) {
    record(`race tracks: ${id} builds fast into culled sectors with checkpoints clear of its gaps`, t.ms < 900 && t.samples > 300 && t.length > 600 && t.sectors >= 12 && t.chunks > 20 && t.checkpoints === 8 && t.first === 0 && !t.gapNearCheck && t.maxStep < 0.8 && t.faces > 15000 && t.faces < 120000 && t.bananas >= 30 && t.crates >= 6 && t.pads >= 2 && t.map >= 100 && t.grid === 8 && t.gridHeight && t.spectators > 12 && t.records < 320, JSON.stringify(t));
  }
  record("race tracks: the two outdoor tracks carry a sky and the gorge lights its torches", built.bay.sky && built.peak.sky && !built.gorge.sky && built.gorge.torches >= 20 && built.bay.torches === 0, JSON.stringify({ bay: built.bay.sky, gorge: [built.gorge.sky, built.gorge.torches], peak: built.peak.sky }));
  const swapped = await b.evaluate(`(() => { const B = window.__ooga; const r0 = B.renderer.stats.records; document.querySelector('[data-track="bay"]').click(); B.housekeep(); const r1 = B.renderer.stats.records; return { r0, r1, nodes: B.stats().allNodes }; })()`);
  record("race tracks: switching tracks releases the old track's GPU records", swapped.r1 <= swapped.r0 + 5 && swapped.nodes < 900, JSON.stringify(swapped));
}];

// Park the other racers far away and frozen, and stand the visitor on a checkpoint facing down the road
const isolate = (checkpoint) => `(() => { const B = window.__ooga, R = B.racers, t = B.track, S = t.samples, p = R.player; for (const r of R.racers) if (r !== p) { r.x += 1000; r.z += 1000; r.respawn = 1e9; } const i = t.checkpoints[${checkpoint}]; p.respawn = 0; p.invuln = 0; p.x = S.x[i]; p.z = S.z[i]; p.idx = i; p.y = p.ground = t.slabY(i, 0, 0); p.heading = p.motionHeading = Math.atan2(S.tx[i], S.tz[i]); p.speed = 0; p.airborne = false; p.vy = 0; p.drift.active = false; p.boost = 0; return i; })()`;
const racePhysics = ["race physics", async (b) => {
  const drive = await b.evaluate(`(() => { const B = window.__ooga, R = B.racers; B.race.startRace(); B.race.simulate(4); R.start(); const p = R.player; ${isolate(1)}; R.setInput(p, 0, 1, false, false); B.race.simulate(3); const a = { speed: p.speed, progress: p.progress, started: p.started, checkpoint: p.checkpoint }; R.setInput(p, 0, -1, false, false); B.race.simulate(2); const stopped = p.speed; return { ...a, stopped, top: p.mount.top }; })()`);
  record("race physics: throttle accelerates toward the ride's top speed and the brake stops it", drive.speed > drive.top * 0.8 && drive.speed <= drive.top + 0.01 && drive.stopped < 1 && drive.stopped >= -drive.top * 0.3 - 0.01, JSON.stringify(drive));
  const drift = await b.evaluate(`(() => { const B = window.__ooga, R = B.racers, p = R.player; ${isolate(1)}; const tiers = []; R.events.onDrift = (r, tier) => tiers.push(tier); p.speed = p.mount.top; R.setInput(p, 0, 1, false, false); B.race.simulate(0.3); const h0 = p.heading; R.setInput(p, 1, 1, true, false); B.race.simulate(1.1); const mid = { active: p.drift.active, dir: p.drift.dir, charge: +p.drift.charge.toFixed(2), turned: Math.abs(p.heading - h0) > 0.4, offset: +Math.abs(Math.atan2(Math.sin(p.motionHeading - p.heading), Math.cos(p.motionHeading - p.heading))).toFixed(2) }; R.setInput(p, 0, 1, false, false); const t = B.track, S = t.samples; const centre = () => { p.x -= t.rightX(p.idx) * p.lateral; p.z -= t.rightZ(p.idx) * p.lateral; p.heading = p.motionHeading = Math.atan2(S.tx[p.idx], S.tz[p.idx]); }; centre(); B.race.simulate(0.05); const released = { active: p.drift.active, boost: +p.boost.toFixed(2), tiers }; let boosted = 0; for (let k = 0; k < 90; k++) { centre(); B.race.simulate(1 / 120); boosted = Math.max(boosted, p.speed); } for (let k = 0; k < 360; k++) { centre(); B.race.simulate(1 / 120); } return { mid, released, boosted, top: p.mount.top, settled: p.speed, respawned: p.respawn > 0 }; })()`);
  record("race physics: holding Space through a turn drifts, charges and releases a tiered boost", drift.mid.active && drift.mid.dir === 1 && drift.mid.charge > 1 && drift.mid.turned && drift.mid.offset > 0.25 && !drift.released.active && drift.released.boost > 0 && drift.released.tiers.includes(2) && drift.boosted > drift.top * 1.05 && drift.settled <= drift.top + 0.01 && !drift.respawned, JSON.stringify(drift));
  const hop = await b.evaluate(`(() => { const B = window.__ooga, R = B.racers, p = R.player; ${isolate(2)}; R.setInput(p, 0, 1, false, false); B.race.simulate(0.5); R.setInput(p, 0, 1, true, false); B.race.simulate(1 / 60); const air = p.airborne; let maxY = 0; for (let i = 0; i < 60; i++) { B.race.simulate(1 / 120); maxY = Math.max(maxY, p.y - p.ground); } R.setInput(p, 0, 1, false, false); B.race.simulate(1); return { air, maxY: +maxY.toFixed(2), landed: !p.airborne }; })()`);
  record("race physics: tapping Space hops and lands", hop.air && hop.maxY > 0.15 && hop.landed, JSON.stringify(hop));
  const steer = await b.evaluate(`(() => { const B = window.__ooga, R = B.racers, p = R.player, t = B.track; ${isolate(2)}; p.speed = 14; const h0 = p.heading; R.setInput(p, 1, 1, false, false); B.race.simulate(0.6); const right = { dh: p.heading - h0, lateral: p.lateral }; ${isolate(2)}; p.speed = 14; R.setInput(p, -1, 1, false, false); B.race.simulate(0.6); const left = { dh: p.heading - h0, lateral: p.lateral }; ${isolate(1)}; const i = p.idx, lat = t.halfAt(i) + 0.25; p.x = t.samples.x[i] + t.rightX(i) * lat; p.z = t.samples.z[i] + t.rightZ(i) * lat; p.y = p.ground = t.heightAt(p.x, p.z, i); p.speed = 18; R.setInput(p, 0, 1, false, false); let maxAir = 0, onCurb = 0; for (let k = 0; k < 300; k++) { B.race.simulate(1 / 120); if (p.airborne) maxAir = Math.max(maxAir, p.y - p.ground); if (Math.abs(p.lateral) > t.halfAt(p.idx) && Math.abs(p.lateral) < t.halfAt(p.idx) + 0.55) onCurb++; } return { right, left, maxAir: +maxAir.toFixed(2), onCurb }; })()`);
  record("race physics: steering right goes right, left goes left, and a rumble strip never throws the racer", steer.right.dh < -0.1 && steer.right.lateral > 0.5 && steer.left.dh > 0.1 && steer.left.lateral < -0.5 && steer.onCurb > 30 && steer.maxAir < 0.25, JSON.stringify(steer));
  const wrong = await b.evaluate(`(() => { const B = window.__ooga, R = B.racers, p = R.player; ${isolate(3)}; const flags = []; R.events.onWrongWay = (r, on) => flags.push(on); p.heading = p.motionHeading = p.heading + Math.PI; R.setInput(p, 0, 1, false, false); B.race.simulate(2); const wrong = p.wrong; p.heading = p.motionHeading = p.heading + Math.PI; B.race.simulate(2); return { wrong, right: !p.wrong, flags, notice: document.getElementById("race-notice").hidden }; })()`);
  record("race physics: driving against the track flags wrong way and turning round clears it", wrong.wrong && wrong.right && flags(wrong.flags), JSON.stringify(wrong));
  const wall = await b.evaluate(`(() => { const B = window.__ooga, R = B.racers, T = window.BL.raceTrack; document.querySelector('[data-track="gorge"]').click(); B.race.startRace(); B.race.simulate(4); R.start(); const p = R.player, t = B.track, S = t.samples; ${isolate(0)}; let i = t.checkpoints[0] + 20; while (S.wall[i] !== 3) i++; p.x = S.x[i]; p.z = S.z[i]; p.idx = i; p.y = p.ground = t.slabY(i, 0, 0); p.heading = p.motionHeading = Math.atan2(S.tx[i], S.tz[i]) + 0.5; R.setInput(p, 0, 1, false, false); let maxLat = 0, minSpeed = 99, hits = 0; for (let k = 0; k < 360; k++) { B.race.simulate(1 / 120); maxLat = Math.max(maxLat, Math.abs(p.lateral)); if (p.speed > 6) minSpeed = Math.min(minSpeed, p.speed); if (p.wallHit > 0) hits++; } return { wall: S.wall[p.idx], maxLat: +maxLat.toFixed(2), limit: +(t.halfAt(p.idx) + T.CURB_W).toFixed(2), hits, respawned: p.respawn > 0, progressed: p.progress > S.dist[i] + 5 }; })()`);
  record("race physics: a walled track bumps the racer back onto the ribbon instead of letting him fall", wall.wall > 0 && wall.maxLat <= wall.limit + 0.05 && wall.hits > 0 && !wall.respawned && wall.progressed, JSON.stringify(wall));
  const fall = await b.evaluate(`(() => { const B = window.__ooga, R = B.racers, T = window.BL.raceTrack; document.querySelector('[data-track="bay"]').click(); B.race.startRace(); B.race.simulate(4); R.start(); const p = R.player, t = B.track, S = t.samples; ${isolate(0)}; const whys = []; R.events.onRespawn = (r, why) => whys.push(why); const i = t.checkpoints[3]; const off = t.halfAt(i) + T.CURB_W + T.SHOULDER + T.FALL + 1; p.x = S.x[i] + t.rightX(i) * off; p.z = S.z[i] + t.rightZ(i) * off; p.idx = i; p.checkpoint = 3; p.started = true; B.race.simulate(0.2); const at = { respawn: p.respawn > 0, x: p.x, z: p.z, cx: S.x[t.checkpoints[2]], cz: S.z[t.checkpoints[2]], speed: p.speed }; B.race.simulate(1.5); let gi = -1; for (let k = 0; k < t.count; k++) if (S.surface[k] === T.SURF.gap) { gi = k; break; } const before = (gi - 2 + t.count) % t.count; p.x = S.x[before]; p.z = S.z[before]; p.idx = before; p.y = p.ground = t.slabY(before, 0, 0); p.heading = p.motionHeading = Math.atan2(S.tx[before], S.tz[before]); p.speed = 4; R.setInput(p, 0, 1, false, false); B.race.simulate(2); return { ...at, whys, gapHazard: t.hazard }; })()`);
  record("race physics: leaving the shoulder respawns at the last checkpoint and a slow jump ends in the water", fall.respawn && Math.abs(fall.x - fall.cx) < 0.01 && Math.abs(fall.z - fall.cz) < 0.01 && fall.speed === 0 && fall.whys[0] === "fell" && fall.whys[1] === "water", JSON.stringify(fall));
  const jump = await b.evaluate(`(() => { const B = window.__ooga, R = B.racers, T = window.BL.raceTrack, p = R.player, t = B.track, S = t.samples; const whys = []; R.events.onRespawn = (r, why) => whys.push(why); let gi = -1; for (let k = 0; k < t.count; k++) if (S.surface[k] === T.SURF.gap) { gi = k; break; } const before = (gi - 24 + t.count) % t.count; p.respawn = 0; p.x = S.x[before]; p.z = S.z[before]; p.idx = before; p.y = p.ground = t.slabY(before, 0, 0); p.heading = p.motionHeading = Math.atan2(S.tx[before], S.tz[before]); p.speed = p.mount.top; p.boost = 0; R.setInput(p, 0, 1, false, false); let air = 0, maxAir = 0, rows = []; for (let k = 0; k < 360; k++) { if (!p.airborne) { p.x -= B.track.rightX(p.idx) * p.lateral; p.z -= B.track.rightZ(p.idx) * p.lateral; p.heading = p.motionHeading = Math.atan2(S.tx[p.idx], S.tz[p.idx]); } B.race.simulate(1 / 120); if (p.airborne) { air++; maxAir = Math.max(maxAir, p.y - p.ground); } if (k % 12 === 0) rows.push([p.idx, +p.lateral.toFixed(1), +p.y.toFixed(1), p.airborne ? 1 : 0, +p.speed.toFixed(0)].join("/")); } return { air, maxAir: +maxAir.toFixed(2), whys, landedPast: p.idx > gi + 2 && p.idx < gi + 60, rows: rows.slice(0, 20) }; })()`);
  record("race physics: a fast racer launches off the lip and clears the gap", jump.air > 20 && jump.whys.length === 0 && jump.landedPast, JSON.stringify(jump));
}];
const flags = (list) => list.length === 2 && list[0] === true && list[1] === false;

const raceItems = () => withPage("race items", racePage(src), async (b) => {
  const pick = await b.evaluate(`(() => { const B = window.__ooga, R = B.racers, I = B.items; B.race.startRace(); B.race.simulate(4); R.start(); const p = R.player; const banana = I.bananas[0]; p.x = banana.x; p.z = banana.z; p.y = banana.y; p.idx = B.track.nearest(p.x, p.z, -1); B.race.simulate(1 / 60); const one = { bananas: p.bananas, hidden: !banana.node.visible, taken: banana.taken > 0 }; for (let k = 0; k < 12; k++) { const bb = I.bananas[k % I.bananas.length]; bb.taken = 0; bb.node.visible = true; p.x = bb.x; p.z = bb.z; p.y = bb.y; B.race.simulate(1 / 60); } const full = { bananas: p.bananas, meterFull: p.meterFull, max: I.METER_MAX }; p.speed = 5; I.use(p); B.race.simulate(1 / 60); const spent = { bananas: p.bananas, meterFull: p.meterFull, boost: p.boost > 0 }; const crate = I.crates[0]; p.x = crate.x; p.z = crate.z; p.y = crate.y; B.race.simulate(1 / 60); return { one, full, spent, item: p.item, crateHidden: !crate.node.visible }; })()`);
  await b.sleep(3800);
  pick.itemShown = await b.evaluate(`document.getElementById("race-item").dataset.item`);
  record("race items: bananas fill a ten-segment turbo meter, spending it boosts, and a crate hands out an item", pick.one.bananas === 1 && pick.one.hidden && pick.one.taken && pick.full.bananas === pick.full.max && pick.full.meterFull && pick.spent.bananas === 0 && !pick.spent.meterFull && pick.spent.boost && ["rock", "peel", "turbo", "shout"].includes(pick.item) && pick.crateHidden && pick.itemShown === pick.item, JSON.stringify(pick));
  const rock = await b.evaluate(`(() => { const B = window.__ooga, R = B.racers, I = B.items, p = R.player, S = B.track.samples; const hits = []; I.events.onHit = (r, by, kind) => hits.push([r.name, by && by.name, kind]); const victim = R.racers.find((r) => r !== p); const i = B.track.checkpoints[1]; p.x = S.x[i]; p.z = S.z[i]; p.idx = i; p.y = p.ground = B.track.slabY(i, 0, 0); p.heading = p.motionHeading = Math.atan2(S.tx[i], S.tz[i]); p.speed = 0; victim.x = S.x[i + 6]; victim.z = S.z[i + 6]; victim.idx = i + 6; victim.y = victim.ground = B.track.slabY(i + 6, 0, 0); victim.speed = 0; victim.heading = victim.motionHeading = p.heading; victim.invuln = 0; for (const r of R.racers) if (r !== p && r !== victim) { r.x += 200; r.z += 200; } p.item = "rock"; I.use(p); const thrown = I.rocks.filter((r) => r.live).length; B.race.simulate(1.2); const spun = victim.spin > 0 || hits.length > 0; for (let k = 0; k < 20; k++) { p.item = "rock"; I.use(p); } const live = I.rocks.filter((r) => r.live).length; p.item = "peel"; I.use(p); const peel = I.peels.find((q) => q.live); const other = R.racers.find((r) => r !== p && r !== victim); other.x = peel.x; other.z = peel.z; other.y = other.ground = peel.y; other.idx = B.track.nearest(other.x, other.z, -1); other.invuln = 0; other.spin = 0; other.speed = 5; B.race.simulate(1 / 60); const peeled = other.spin > 0; p.item = "shout"; victim.spin = 0; victim.invuln = 0; victim.x = p.x + 3; victim.z = p.z; I.use(p); const shouted = victim.spin > 0; return { thrown, spun, hits: hits.slice(0, 3), live, cap: window.BL.raceItems.ROCK_CAP, peeled, shouted, skidCap: window.BL.raceItems.SKID_CAP }; })()`);
  record("race items: a thrown rock spins the racer ahead, a peel spins whoever drives over it, a shout spins the neighbours, and the pools stay capped", rock.thrown === 1 && rock.spun && rock.hits[0] && rock.hits[0][2] === "rock" && rock.live <= rock.cap && rock.peeled && rock.shouted, JSON.stringify(rock));
});

const raceAi = ["race AI", async (b) => {
  const results = {};
  for (const id of ["bay", "gorge", "peak"]) {
    results[id] = await b.evaluate(`(() => { const t0 = performance.now(); const phase = ${autoRace(id, 160)}; const B = window.__ooga; return { phase, ms: Math.round(performance.now() - t0), racers: B.racers.racers.map((r) => ({ n: r.name, m: r.mount.id, fin: r.finished, t: +r.finishTime.toFixed(1), best: +r.bestLap.toFixed(1), rank: r.rank })), ranks: [...B.racers.racers.map((r) => r.rank)].sort((a, c) => a - c).join(","), mounts: new Set(B.racers.racers.map((r) => r.mount.id)).size, rocks: B.items.rocks.filter((r) => r.live).length, skids: B.items.skids.filled }; })()`);
    const r = results[id];
    const times = r.racers.map((x) => x.t);
    record(`race AI: on ${id} every racer finishes three laps in a close pack`, r.racers.every((x) => x.fin && x.t > 50 && x.t < 160 && x.best > 15 && x.best < 60) && r.ranks === "1,2,3,4,5,6,7,8" && Math.max(...times) - Math.min(...times) < 40 && r.mounts === 3 && r.ms < 4000, JSON.stringify(r));
  }
  const rank = await b.evaluate(`(() => { const B = window.__ooga; const byTime = [...B.racers.racers].sort((a, c) => a.finishTime - c.finishTime).map((r) => r.rank).join(","); return byTime; })()`);
  record("race AI: finishing order matches finishing time", rank === "1,2,3,4,5,6,7,8", rank);
}];

const raceResults = () => withPage("race results", racePage(src), async (b) => {
  const done = await b.evaluate(`(() => { const B = window.__ooga; ${autoRace("bay", 120)}; B.race.finishRace(); const p = B.racers.player; return { phase: B.race.phase, shown: !document.getElementById("race-results").hidden, rows: document.querySelectorAll("#race-podium li").length, you: document.querySelector("#race-podium li.you") && document.querySelector("#race-podium li.you").textContent, summary: document.getElementById("race-summary").textContent, best: B.game.state.race.best.bay, race: Math.round(p.finishTime * 1000), lap: Math.round(p.bestLap * 1000), stored: JSON.parse(localStorage.getItem("oogaboogaland.v1")).race.best.bay, medal: document.querySelector('[data-track="bay"] .garage-medal').textContent, itemBtnHidden: document.getElementById("item-btn").hidden }; })()`);
  record("race results: the podium lists everyone, marks the visitor and saves the best times", done.phase === "finished" && done.shown && done.rows === 8 && done.you && done.you.includes("(you)") && /(1st|2nd|3rd|[4-8]th)/.test(done.summary) && done.best.race === done.race && done.best.lap === done.lap && done.stored.race === done.race && done.medal !== "NEW" && done.itemBtnHidden, JSON.stringify(done));
  const projected = await b.evaluate(`(() => { const B = window.__ooga; B.race.toGarage(); ${autoRace("bay", 40)}; B.race.finishRace(); const rows = () => [...document.querySelectorAll("#race-podium li span:last-child")].map((e) => e.textContent); const early = rows(); B.race.simulate(100); return { early, later: rows(), finished: B.racers.racers.every((r) => r.finished) }; })()`);
  record("race results: unfinished racers show projected times that turn real as they cross the line", projected.early.length === 8 && projected.early.some((t) => t.startsWith("≈")) && projected.early.every((t) => /\d:\d\d\.\d\d/.test(t)) && projected.finished && projected.later.every((t) => !t.startsWith("≈")), JSON.stringify(projected));
  await b.evaluate(`document.querySelector('#race-results [data-action="race-again"]').click()`);
  await b.sleep(200);
  const again = await b.evaluate(`(() => { const B = window.__ooga; return { phase: B.race.phase, resultsHidden: document.getElementById("race-results").hidden, lap: B.racers.player.lap, finished: B.racers.player.finished }; })()`);
  record("race results: Race again restarts from the countdown", again.phase === "countdown" && again.resultsHidden && again.lap === 1 && !again.finished, JSON.stringify(again));
  await b.evaluate(`(() => { const B = window.__ooga; const bad = JSON.parse(localStorage.getItem("oogaboogaland.v1")); bad.race.best.gorge = { lap: -5, race: "x" }; bad.race.best["a-very-long-track-name-here"] = { lap: 1000, race: 2000 }; localStorage.setItem("oogaboogaland.v1", JSON.stringify(bad)); })()`);
  await b.open(racePage(src));
  await b.sleep(2500);
  const reloaded = await b.evaluate(`(() => { const B = window.__ooga; return { keys: Object.keys(B.game.state.race.best).join(","), medal: document.querySelector('[data-track="bay"] .garage-medal').textContent, note: document.querySelector('[data-track="bay"] .garage-note').textContent }; })()`);
  record("race results: best times survive a reload and malformed entries are dropped", reloaded.keys === "bay" && reloaded.medal !== "NEW" && reloaded.note.startsWith("best "), JSON.stringify(reloaded));
});

const raceCup = () => withPage("race cup", racePage(src, "rain=0"), async (b) => {
  const first = await b.evaluate(`(() => { const B = window.__ooga; ${autoRace("gorge", 130)}; B.racers.player.rank = 2; B.race.finishRace(); return { track: B.track.id, next: !document.getElementById("race-next").hidden, label: document.getElementById("race-next").textContent, rank: B.racers.player.rank }; })()`);
  await b.evaluate(`document.getElementById("race-next").click()`);
  await b.sleep(300);
  const hopped = await b.evaluate(`(() => { const B = window.__ooga; return { track: B.track.id, phase: B.race.phase }; })()`);
  record("race cup: a podium finish offers the next track and it starts straight into the countdown", first.track === "gorge" && first.rank <= 3 && first.next && first.label === "Next track" && hopped.track === "peak" && hopped.phase === "countdown", JSON.stringify({ first, hopped }));
  const cup = await b.evaluate(`(() => { const B = window.__ooga; B.race.toGarage(); document.querySelector('[data-action="cup-start"]').click(); const rounds = []; for (let round = 0; round < 3; round++) { B.race.simulate(3.4); B.racers.autopilot = true; B.racers.start(); B.race.simulate(150); B.race.finishRace(); rounds.push({ track: B.track.id, round: B.race.cup.round, active: B.race.cup.active, done: B.race.cup.done, note: document.getElementById("race-cup-note").textContent, standings: document.querySelectorAll("#race-standings li").length, top: document.querySelector("#race-standings li span:last-child").textContent, next: !document.getElementById("race-next").hidden, summary: document.getElementById("race-summary").textContent }); if (round < 2) document.getElementById("race-next").click(); } const points = Array.from(B.race.cup.points); return { rounds, points, total: points.reduce((a, c) => a + c, 0), saved: B.game.state.race.cup, badge: document.getElementById("garage-cup").hidden }; })()`);
  const r = cup.rounds;
  record("race cup: three tracks in order with points, standings on every podium and a final cup", r.map((x) => x.track).join(",") === "bay,gorge,peak" && r[0].note.includes("race 1 of 3") && r[0].next && r[0].standings === 8 && r[0].top.endsWith("pts") && r[1].note.includes("race 2 of 3") && r[2].done && !r[2].active && !r[2].next && r[2].note === "Cup final" && /Cup: (1st|2nd|3rd|[4-8]th) with \d+ points/.test(r[2].summary) && cup.total === 3 * 40 && cup.points.every((p) => p >= 6), JSON.stringify(cup));
  await b.evaluate(`document.querySelector('#race-results [data-action="garage"]').click()`);
  await b.sleep(200);
  const garage = await b.evaluate(`(() => { const B = window.__ooga; const badge = document.getElementById("garage-cup"); return { saved: B.game.state.race.cup, badgeHidden: badge.hidden, badge: badge.textContent, stored: JSON.parse(localStorage.getItem("oogaboogaland.v1")).race.cup }; })()`);
  record("race cup: a podium cup finish is saved and shown in the garage", (garage.saved === null && garage.badgeHidden) || (garage.saved && ["gold", "silver", "bronze"].includes(garage.saved.medal) && !garage.badgeHidden && garage.badge.includes("CUP") && garage.stored.medal === garage.saved.medal), JSON.stringify(garage));
});

const raceWeather = () => withPage("race weather", racePage(src, "rain=1"), async (b) => {
  const wet = await b.evaluate(`(() => { const B = window.__ooga, T = window.BL.raceTrack; const out = {}; for (const id of ["bay", "gorge", "peak"]) { document.querySelector('[data-track="' + id + '"]').click(); const t = B.track; out[id] = { wet: t.wet, kind: t.precipitation, slip: +t.slipAt(T.SURF.road).toFixed(2), board: +t.slipAt(T.SURF.board).toFixed(2), ice: +t.slipAt(T.SURF.ice).toFixed(2), fogNear: t.renderOpts.fogNear, direct: +t.renderOpts.directStrength.toFixed(2), weather: B.weather, subtitle: document.getElementById("subtitle").textContent }; } return out; })()`);
  record("race weather: a forced wet load rains on the bay, snows on the peak and stays dry in the gorge", wet.bay.wet && wet.bay.kind === "rain" && wet.bay.weather && wet.bay.weather.count > 100 && wet.peak.kind === "snow" && wet.peak.weather.kind === "snow" && !wet.gorge.wet && wet.gorge.weather === null && wet.bay.subtitle.includes("rain"), JSON.stringify(wet));
  record("race weather: wet tarmac and boards slide more while ice stays ice, under a dimmer, closer sky", wet.bay.slip > 0.3 && wet.bay.board > 0.3 && wet.bay.ice === 1 && wet.gorge.slip === 0 && wet.bay.fogNear < 60 && wet.bay.direct < 0.6, JSON.stringify(wet));
  const drops = await b.evaluate(`new Promise((resolve) => { const B = window.__ooga; document.querySelector('[data-track="bay"]').click(); B.race.startRace(); const node = window.BL.scenes.race.root.children.find((n) => n.instanceData && n.instanceCount === B.weather.count); const v0 = node.instanceVersion, y0 = node.instanceData[13]; const start = B.renderedFrames; const tick = () => { if (B.renderedFrames >= start + 12) resolve({ found: !!node, moved: node.instanceVersion > v0 + 5 && node.instanceData[13] !== y0, cap: node.instanceData.length / 20, fixed: node.fixedInstanceCapacity === true }); else requestAnimationFrame(tick); }; requestAnimationFrame(tick); })`);
  record("race weather: the rain is one fixed-capacity batch that falls every frame", drops.found && drops.moved && drops.cap >= 100 && drops.fixed, JSON.stringify(drops));
  await b.open(racePage(src, "rain=0"));
  await b.sleep(2500);
  const dry = await b.evaluate(`(() => { const B = window.__ooga; return { wet: B.track.wet, weather: B.weather, slip: B.track.slipAt(window.BL.raceTrack.SURF.road) }; })()`);
  record("race weather: rain=0 forces a dry track", !dry.wet && dry.weather === null && dry.slip === 0, JSON.stringify(dry));
});

const raceAudio = () => withPage("race audio", racePage(src), async (b) => {
  const before = await b.evaluate(`(() => { const A = window.__ooga.audio; return { ready: A.ready, context: !!A.context }; })()`);
  await b.click(720, 450);
  await b.sleep(200);
  const after = await b.evaluate(`(() => { const A = window.__ooga.audio; for (const name of Object.keys(A.cues)) A.cues[name](1); A.state.speed = 20; A.state.mount = "kart"; A.update(1 / 60); A.state.mount = "dino"; A.update(1 / 60); A.state.mount = "run"; A.update(1 / 60); return { ready: A.ready, state: A.context.state, voices: A.voices, cues: Object.keys(A.cues).length, muted: A.muted }; })()`);
  await b.key("m");
  await b.sleep(100);
  const muted = await b.evaluate(`(() => { const A = window.__ooga.audio; return { muted: A.muted, pressed: document.getElementById("race-mute").getAttribute("aria-pressed"), stored: localStorage.getItem("oogaboogaland.audio") }; })()`);
  await b.key("m");
  await b.evaluate(`window.__ooga.go("hub")`);
  await b.sleep(900);
  const left = await b.evaluate(`(() => { const B = window.__ooga; return { scene: B.scene, audio: B.audio === undefined }; })()`);
  record("race audio: silent until a real gesture, then a running context with a fixed voice pool and every cue playable", !before.ready && !before.context && after.ready && after.state === "running" && after.voices === 8 && after.cues >= 20 && !after.muted, JSON.stringify({ before, after }));
  record("race audio: M mutes, remembers it, and leaving the cave closes the context", muted.muted && muted.pressed === "true" && muted.stored === "off" && left.scene === "hub" && left.audio, JSON.stringify({ muted, left }));
});

const raceCanvas = () => withPage("race canvas", racePage(src, "canvas2d=1"), async (b) => {
  const r = await b.evaluate(`(() => { const B = window.__ooga; document.querySelector('[data-track="gorge"]').click(); B.race.startRace(); B.racers.autopilot = true; return { kind: B.renderer.kind, faces: B.track.sectors.reduce((sum, s) => sum + s.nodes.big.geometry.faces.length + s.nodes.small.geometry.faces.length, 0) }; })()`);
  await b.sleep(3800);
  const frames = await b.evaluate(`new Promise((resolve) => { const B = window.__ooga; const start = B.renderedFrames; const t0 = performance.now(); const tick = () => { if (B.renderedFrames >= start + 30 || performance.now() - t0 > 6000) resolve({ frames: B.renderedFrames - start, phase: B.race.phase, speed: B.racers.player.speed }); else requestAnimationFrame(tick); }; requestAnimationFrame(tick); })`);
  record("race canvas: the Canvas 2D fallback runs a race with a lighter decor budget", r.kind === "canvas2d" && frames.phase === "racing" && frames.speed > 3 && r.faces < 20000 && frames.frames >= 30, JSON.stringify({ ...r, ...frames }));
});

const racePhone = () => withPage("race phone", racePage(src), async (b) => {
  const garage = await b.evaluate(`(() => { const g = document.getElementById("garage").getBoundingClientRect(); return { fits: g.bottom <= window.innerHeight && g.width <= window.innerWidth, columns: getComputedStyle(document.querySelector(".garage-columns")).gridTemplateColumns.split(" ").length, help: document.getElementById("garage-help").textContent }; })()`);
  await b.evaluate(`document.querySelector('[data-action="race-start"]').click()`);
  await b.sleep(4200);
  const race = await b.evaluate(`(() => { const B = window.__ooga; const act = document.getElementById("act"), item = document.getElementById("item-btn"), strip = document.querySelector(".race-hud-right").getBoundingClientRect(); return { phase: B.race.phase, act: !act.hidden && act.textContent, item: !item.hidden && item.textContent, stripFits: strip.right <= window.innerWidth && strip.left >= 0, sticks: getComputedStyle(document.getElementById("joy-move")).display, speedHidden: getComputedStyle(document.querySelector(".race-speed")).display === "none" }; })()`);
  await b.evaluate(isolate(0));
  const stick = await b.evaluate(`(() => { const r = document.getElementById("joy-move").getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; })()`);
  const heading = () => b.evaluate("window.__ooga.racers.player.heading");
  const h0 = await heading();
  await b.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: stick.x, y: stick.y }] });
  for (let i = 1; i <= 6; i++) {
    await b.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: stick.x + i * 6, y: stick.y }] });
    await b.sleep(100);
  }
  await b.sleep(900);
  const moved = await b.evaluate(`(() => { const p = window.__ooga.racers.player; return { heading: p.heading, speed: p.speed }; })()`);
  await b.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  record("race phone: the garage stacks, the race shows Drift and Throw buttons, and the stick steers an auto-accelerating racer", garage.fits && garage.columns === 1 && garage.help.includes("stick") && race.phase === "racing" && race.act === "Drift" && race.item && race.stripFits && race.sticks === "block" && moved.speed > 3 && moved.heading < h0 - 0.1, JSON.stringify({ garage, race, h0, moved }));
}, { w: 390, h: 844, mobile: true });

const hubRace = () => withPage("hub race route", hubPage(src), async (b) => {
  await b.evaluate(`window.__ooga.pilot.goPreset("race")`);
  await b.sleep(1200);
  const mouth = await b.evaluate(`(() => { const B = window.__ooga, sameModel = (geometry, model) => !!geometry && geometry.verts === model.verts && geometry.faces.length === model.faces.length && geometry.faces.every((face, index) => { const original = model.faces[index]; return face.i.length === original.i.length && face.i.every((vertex, i) => vertex === original.i[i]) && face.color.length === original.color.length && face.color.every((channel, i) => channel === original.color[i]) && face.emissive === original.emissive; }); const m = B.mouths.find((m) => m.id === "c9"); const p = B.project(m.x, 2, m.z); const hit = B.input.pick(p.x, p.y); return { x: Math.round(p.x), y: Math.round(p.y), kind: hit && hit.owner.kind, slot: hit && hit.owner.slot && hit.owner.slot.id, status: hit && hit.owner.slot && hit.owner.slot.status, label: B.labels.some((l) => l.text === "Ooga Rally"), torches: B.entranceLights.filter((l) => l.caveId === "c9").length, wheels: (() => { let n = 0; const wheel = window.BL.raceModels.kartWheel(); const walk = (node) => { if (sameModel(node.geometry, wheel)) n++; for (const c of node.children) walk(c); }; walk(window.BL.scenes.hub.root); return n; })(), shelves: (() => { let n = 0; const shelf = window.BL.hubModels.caveShelves(); const walk = (node) => { if (sameModel(node.geometry, shelf)) n++; for (const c of node.children) walk(c); }; walk(window.BL.scenes.hub.root); return n; })() }; })()`);
  await b.click(mouth.x, mouth.y);
  await untilPage(b, 'B.scene === "race" && !B.transitioning', 15000);
  const entered = await b.evaluate(`({ scene: window.__ooga.scene, phase: window.__ooga.race.phase, garage: !document.getElementById("garage").hidden })`);
  record("hub race route: the Ooga Rally cave is lit, signed and tapping it enters the garage", mouth.kind === "cave" && mouth.slot === "c9" && mouth.status === "open" && mouth.label && mouth.torches === 3 && mouth.wheels === 9 && mouth.shelves === 2 && entered.scene === "race" && entered.phase === "garage" && entered.garage, JSON.stringify({ ...mouth, ...entered }));
  await b.key("Escape");
  await untilPage(b, 'B.scene === "hub" && !B.transitioning', 15000);
  const back = await b.evaluate(`(() => { const B = window.__ooga; const c = B.camera; return { scene: B.scene, toPile: +Math.hypot(c.target.x, c.target.z).toFixed(2), raceHidden: document.getElementById("race").hidden, garageBtnHidden: document.getElementById("race-garage-btn").hidden }; })()`);
  record("hub race route: Escape in the garage returns to the hub landing view with the race HUD hidden", back.scene === "hub" && back.toPile < 0.5 && back.raceHidden && back.garageBtnHidden, JSON.stringify(back));
  const rejectedRoutes = await b.evaluate(`(${caveRoutingRejections.toString()})()`);
  record("hub cave routes: neither standing above an open cave nor occupying its interior without crossing enters its scene", rejectedRoutes.length === 6 && rejectedRoutes.every((r) => r.scene === "hub") && rejectedRoutes.filter((r) => r.name === "actor-on-roof").every((r) => r.atTrigger && r.actorY >= r.ground && r.actorY > 3 && r.playerIndex === 0) && rejectedRoutes.filter((r) => r.name === "inside-without-crossing").every((r) => r.atTrigger && Math.abs(r.actorY) < 0.001 && r.playerIndex === 0), JSON.stringify(rejectedRoutes));
  record("hub cave routes: an admitted Ooga at an inner trigger cannot route through a camera view above the roof", rejectedRoutes.filter((r) => r.name === "camera-above-admitted-actor").length === 2 && rejectedRoutes.filter((r) => r.name === "camera-above-admitted-actor").every((r) => r.scene === "hub" && r.atTrigger && Math.abs(r.actorY) < 0.001 && r.playerIndex > 0 && r.cameraCavity === r.playerIndex && r.ceiling !== null && r.cameraY >= r.ceiling), JSON.stringify(rejectedRoutes));
  await b.evaluate(`(() => { const B = window.__ooga; const cave = [...B.cavemen.values()].find((c) => c.state === "working" && !c.walk && !c.build); const m = B.mouths.find((m) => m.id === "c9"), o = B.pilot.orbit; B.crew.control(cave); cave.root.position.x = m.apron.x; cave.root.position.z = m.apron.z; cave.root.position.y = cave.baseY; cave.hop = 0; cave.root.rotation.y = m.ry + Math.PI; o.tYaw = o.yaw = m.ry; o.tPitch = o.pitch = 0.25; o.tDist = o.dist = 4; })()`);
  await b.sleep(300);
  await b.send("Input.dispatchKeyEvent", { type: "keyDown", key: "w", text: "w" });
  const walked = await b.evaluate(`new Promise((resolve) => { const B = window.__ooga, m = B.mouths.find((m) => m.id === "c9"), target = { x: m.x - Math.sin(m.ry) * 3.6, z: m.z - Math.cos(m.ry) * 3.6 }, t0 = performance.now(); const tick = () => { const p = B.crew.player && B.crew.player.root.position, distance = p ? Math.hypot(p.x - target.x, p.z - target.z) : Infinity; if (B.scene !== "hub" || distance < 3.1 || performance.now() - t0 > 6000) resolve({ scene: B.scene, distance, ms: Math.round(performance.now() - t0) }); else requestAnimationFrame(tick); }; tick(); })`);
  await b.send("Input.dispatchKeyEvent", { type: "keyUp", key: "w" });
  await b.evaluate(`window.__ooga.crew.player.root.rotation.y += Math.PI`);
  await untilPage(b, 'document.getElementById("act").textContent === "START RALLY"');
  const waiting = await b.evaluate(`({ scene: window.__ooga.scene, hop: window.__ooga.crew.player.hop })`);
  await b.key(" ");
  const started = await untilPage(b, 'B.scene === "race" && B.race.phase === "garage"');
  record("hub race route: approaching the launcher waits for Space, which works while facing away", walked.scene === "hub" && walked.distance < 3.1 && waiting.scene === "hub" && waiting.hop === 0 && started, JSON.stringify({ walked, waiting, started }));
});

// ---------- Ooga Drop ----------
const dropPage = (base, query) => `${base}?debug=1&nosim=1&scene=drop${clock(query)}`;
const dropControls = () => withPage("drop controls", dropPage(src), async (b) => {
  await b.evaluate(`(() => { const B = window.__ooga; B.drop.jumpNow(); B.diver.state.p.y = 900; })()`);
  await b.send("Input.dispatchKeyEvent", { type: "keyDown", key: " ", text: " " });
  const deployed = await b.evaluate(`({ phase: window.__ooga.diver.state.phase, up: window.__ooga.controls.read().up })`);
  await b.send("Input.dispatchKeyEvent", { type: "keyDown", key: " ", text: " ", autoRepeat: true });
  const flared = await untilPage(b, 'B.diver.state.phase === "canopy" && B.diver.state.flaring');
  const held = await b.evaluate(`({ phase: window.__ooga.diver.state.phase, up: window.__ooga.controls.read().up, flaring: window.__ooga.diver.state.flaring })`);
  await b.send("Input.dispatchKeyEvent", { type: "keyUp", key: " " });
  const quiet = await untilPage(b, "!B.diver.state.flaring && B.controls.read().up === 0");
  record("drop controls: holding Space after deployment keeps the existing repeat-to-flare behavior and releasing stops it", deployed.phase === "open" && deployed.up === 0 && flared && held.phase === "canopy" && held.up === 1 && held.flaring && quiet, JSON.stringify({ deployed, held, quiet }));
  await b.evaluate(`(() => { const B = window.__ooga; B.drop.toBoard(); B.drop.jumpNow(); B.diver.state.p.y = 900; })()`);
  await untilPage(b, 'B.diver.state.phase === "free"');
  const button = await b.evaluate(`(() => { const r = document.getElementById("act").getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; })()`);
  await b.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: button.x, y: button.y, id: 1 }] });
  await untilPage(b, "B.controls.read().up === 1");
  const touchHeld = await b.evaluate(`({ phase: window.__ooga.diver.state.phase, up: window.__ooga.controls.read().up })`);
  await b.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  const touchDeployed = await untilPage(b, 'B.diver.state.phase !== "free" && B.controls.read().up === 0');
  record("drop controls: its touch button retains hold input and deploys on release", touchHeld.phase === "free" && touchHeld.up === 1 && touchDeployed, JSON.stringify({ touchHeld, touchDeployed }));
}, { w: 390, h: 844, mobile: true });
const dropBoard = () => withPage("drop board", dropPage(src), async (b) => {
  const board = await b.evaluate(`(() => { const B = window.__ooga; const q = (s) => document.querySelectorAll(s).length; const hoop = window.BL.dropModels.hoop(); let hoops = 0; const walk = (n) => { if (n.geometry === hoop) hoops++; for (const c of n.children) walk(c); }; walk(window.BL.scenes.drop.root); return { scene: B.scene, phase: B.drop.phase, oogas: q("#drop-oogas button"), rows: q("#drop-best li"), boardShown: !document.getElementById("drop-board").hidden, stripHidden: document.getElementById("drop-strip").hidden, leaveShown: !document.querySelector('[data-scene="drop"] [data-action="leave"]').hidden, hoops, rings: B.course.rings.length, ringsDescend: B.course.rings.every((r, i, a) => !i || r.y < a[i - 1].y), records: B.renderer.stats.records, targets: B.input.targetCount, sheet: document.getElementById("sheet").dataset.open, seated: B.diver.body.visible && Math.hypot(B.diver.state.p.x - B.plane.node.position.x, B.diver.state.p.z - B.plane.node.position.z) < 1.5, signed: window.BL.scenes.drop.root.children.some((n) => n.geometry === window.BL.dropModels.roofSign() && Math.hypot(n.position.x - B.plane.node.position.x, n.position.z - B.plane.node.position.z) < 4.5), pressed: document.querySelector('#drop-oogas [aria-pressed="true"]').dataset.racer, target: B.course.target, targetOnMeadow: B.island.surfaceAt(B.course.target.x, B.course.target.z) === 0 }; })()`);
  record("drop board: the scene lands on the board with eight Oogas, the diver seated in the plane on the roof and ten hoops sharing one geometry", board.scene === "drop" && board.phase === "board" && board.oogas === 8 && board.rows === 4 && board.boardShown && board.stripHidden && board.leaveShown && board.hoops === 8 && board.rings === 8 && board.ringsDescend && board.seated && board.signed && board.pressed === "portlandhodl" && board.sheet === "false" && board.targetOnMeadow && board.records < 40, JSON.stringify(board));
  const eye = await b.evaluate(`(() => { const c = window.__ooga.camera; return { x: c.position.x, z: c.position.z, y: c.position.y, tx: c.target.x, tz: c.target.z }; })()`);
  await b.drag({ x: 150, y: 520 }, { x: 350, y: 480 });
  const swung = await b.evaluate(`(() => { const c = window.__ooga.camera, cam = window.__ooga.drop.cam; return { x: c.position.x, z: c.position.z, y: c.position.y, tx: c.target.x, tz: c.target.z, yaw: cam.boardYaw, lift: cam.boardLift, phase: window.__ooga.drop.phase }; })()`);
  const radius = (e) => Math.hypot(e.x - e.tx, e.z - e.tz);
  record("drop board: a drag swings the view round the plane and tilts it", swung.phase === "board" && swung.yaw < -0.5 && swung.lift < 0 && Math.abs(radius(swung) - radius(eye)) < 0.01 && Math.abs(swung.tx - eye.tx) < 1e-6 && Math.hypot(swung.x - eye.x, swung.z - eye.z) > 3 && swung.y < eye.y, JSON.stringify({ eye, swung }));
  await b.evaluate(`document.querySelector('[data-racer="bc1gui"]').click()`);
  const picked = await b.evaluate(`(() => { const B = window.__ooga; return { name: B.diver.cave.traits.name, skater: B.diver.cave.traits.skater, targets: B.input.targetCount, phase: B.drop.phase }; })()`);
  record("drop board: picking an Ooga rebuilds the diver without leaking input targets", picked.name === "bc1gui" && picked.skater && picked.targets === board.targets && picked.phase === "board", JSON.stringify(picked));
  await b.key("Enter");
  await b.sleep(1800);
  const climbing = await b.evaluate(`(() => { const B = window.__ooga, s = B.plane.state, c = B.camera; return { phase: B.drop.phase, t: s.t, alt: s.alt, speed: s.speed, stripShown: !document.getElementById("drop-strip").hidden, boardHidden: document.getElementById("drop-board").hidden, prop: B.plane.prop.rotation.z, seated: Math.hypot(B.diver.state.p.x - B.plane.node.position.x, B.diver.state.p.y - B.plane.node.position.y, B.diver.state.p.z - B.plane.node.position.z) < 3, camBehind: Math.hypot(c.position.x - B.plane.node.position.x, c.position.z - B.plane.node.position.z) < 16, subtitle: document.getElementById("subtitle").textContent }; })()`);
  record("drop board: Enter starts the climb with the Ooga in the seat, the strip up and the camera chasing the plane", climbing.phase === "climb" && climbing.t > 1 && climbing.alt > 7 && climbing.speed > 8 && climbing.stripShown && climbing.boardHidden && climbing.prop > 3 && climbing.seated && climbing.camBehind && climbing.subtitle.includes("climbing"), JSON.stringify(climbing));
  await b.key(" ");
  await b.sleep(150);
  const early = await b.evaluate(`({ phase: window.__ooga.drop.phase, notice: document.getElementById("drop-notice").textContent })`);
  await hold(b, " ", 2500);
  const hurried = await b.evaluate(`(() => { const B = window.__ooga, s = B.plane.state; return { phase: B.drop.phase, t: s.t, alt: s.alt }; })()`);
  record("drop board: Space before the mark waits, holding it hurries the climb", early.phase === "climb" && early.notice.includes("wait") && hurried.phase === "climb" && hurried.t > 8 && hurried.alt > 60, JSON.stringify({ early, hurried }));
  const camAt = () => b.evaluate(`(() => { const B = window.__ooga, cam = B.drop.cam; return { phase: B.drop.phase, offset: +cam.offset.toFixed(3), tilt: +cam.tilt.toFixed(3), orbiting: window.BL.scenes.drop.input.orbiting, since: +(B.drop.sceneTime - cam.dragAt).toFixed(2) }; })()`);
  await b.drag({ x: 300, y: 450 }, { x: 1300, y: 250 }, 20);
  const swungFar = await camAt();
  await b.mouse("mouseMoved", 400, 450, { button: "none" });
  await b.mouse("mousePressed", 400, 450, { buttons: 1 });
  for (let i = 1; i <= 8; i++) { await b.mouse("mouseMoved", 400 + 30 * i, 450, { buttons: 1 }); await b.sleep(30); }
  await b.sleep(2000);
  const heldStill = await camAt();
  await b.mouse("mouseReleased", 640, 450);
  await b.sleep(2600);
  const eased = await camAt();
  record("drop board: in flight a drag swings the eye more than a quarter turn and tilts it, a held drag keeps it, and it eases back behind the plane 1.5 s after the release", swungFar.phase === "climb" && Math.abs(swungFar.offset) > 1.6 && swungFar.tilt < -0.5 && heldStill.orbiting && Math.abs(heldStill.offset) > 0.5 && heldStill.since < 0.2 && !eased.orbiting && Math.abs(eased.offset) < 0.05 && Math.abs(eased.tilt) < 0.05, JSON.stringify({ swungFar, heldStill, eased }));
  const mark_ = await b.evaluate(`(() => { const B = window.__ooga; B.drop.simulate(30); const s = B.plane.state; let opened = false; for (let t = 0; t < 14 && !opened; t += 0.1) { B.drop.simulate(0.1); opened = B.drop.jumpOpen; } return { opened, alt: s.alt, laps: (s.angle - B.course.jumpAngle) / (Math.PI * 2) }; })()`);
  record("drop board: at height the plane circles until the jump window opens on the course start", mark_.opened && mark_.alt > 358 && mark_.alt <= 360.01, JSON.stringify(mark_));
  await b.key("Escape");
  await b.sleep(200);
  const back = await b.evaluate(`(() => { const B = window.__ooga; return { phase: B.drop.phase, boardShown: !document.getElementById("drop-board").hidden, parked: B.plane.state.t === 0 && B.plane.node.position.y === B.plane.state.alt, stripHidden: document.getElementById("drop-strip").hidden }; })()`);
  record("drop board: Escape in the climb parks the plane back on the roof", back.phase === "board" && back.boardShown && back.parked && back.stripHidden, JSON.stringify(back));
});

// The diver placed high in still air, with the plane's course out of the way
const isolateDiver = `(() => { const B = window.__ooga; if (B.drop.phase !== "air") B.drop.jumpNow(); const s = B.diver.state; s.p.x = 0; s.p.y = 900; s.p.z = 0; s.v.x = s.v.z = 0; s.v.y = -20; B.drop.setInput(0, 0, 0, false); return s; })()`;
const dropPhysics = () => withPage("drop physics", dropPage(src), async (b) => {
  const snap = `(s) => ({ speed: +s.speed.toFixed(2), h: +Math.hypot(s.v.x, s.v.z).toFixed(2), vy: +s.v.y.toFixed(2), front: Array.from(s.front).map((v) => +v.toFixed(3)), headDir: +Math.atan2(s.up[0], s.up[2]).toFixed(2), hDir: +Math.atan2(s.v.x, s.v.z).toFixed(2), y: +s.p.y.toFixed(1) })`;
  const fall = await b.evaluate(`(() => { const B = window.__ooga, K = window.BL.skydiver, snap = ${snap}; const s = ${isolateDiver}; B.drop.simulate(6); const flat = snap(s); B.drop.setInput(1, 0, 0, false); B.drop.simulate(5); const dive = snap(s); B.drop.setInput(0, 0, 0, false); B.drop.simulate(5); const back = snap(s); B.drop.setInput(0, 1, 0, false); B.drop.simulate(3); const roll = snap(s); B.drop.setInput(0, 0, 1, false); B.drop.simulate(0.7); const yaw = snap(s); return { flat, dive, back, roll, yaw, terminal: [K.TERMINAL_FLAT, K.TERMINAL_DIVE] }; })()`);
  record("drop physics: a hands-off diver settles belly down near the flat terminal speed", Math.abs(fall.flat.speed - fall.terminal[0]) < 1.5 && fall.flat.h < 0.5 && fall.flat.front[1] < -0.98, JSON.stringify(fall.flat));
  record("drop physics: holding pitch tips the head down, speeds the fall and tracks toward the head; releasing settles flat again", fall.dive.speed > fall.flat.speed + 4 && fall.dive.h > 4 && Math.abs(Math.atan2(Math.sin(fall.dive.hDir - fall.dive.headDir), Math.cos(fall.dive.hDir - fall.dive.headDir))) < 0.3 && fall.dive.front[1] > -0.96 && fall.back.front[1] < -0.97 && fall.back.h < fall.dive.h, JSON.stringify({ dive: fall.dive, back: fall.back }));
  // Headings grow to the left in this frame: a slide to the right of the head is a negative offset, a left turn a positive one
  const offset = (a, z) => Math.atan2(Math.sin(a - z), Math.cos(a - z));
  record("drop physics: D slides the diver to the right of the head and Q turns the head left", fall.roll.h > 3 && offset(fall.roll.hDir, fall.roll.headDir) < -0.9 && offset(fall.roll.hDir, fall.roll.headDir) > -2.2 && offset(fall.yaw.headDir, fall.roll.headDir) > 0.6, JSON.stringify({ roll: fall.roll, yaw: fall.yaw }));
  const rings = await b.evaluate(`(() => { const B = window.__ooga, R = B.course.rings; const s = ${isolateDiver}; s.v.y = -20; const through = (dx) => { const ring = R[3]; B.drop.toBoard(); B.drop.jumpNow(); const s = B.diver.state; s.p.x = ring.x + dx; s.p.y = ring.y + 3; s.p.z = ring.z; s.v.x = s.v.z = 0; s.v.y = -20; B.drop.setInput(0, 0, 0, false); const before = B.drop.ringsHit; B.drop.simulate(0.4); return { hit: B.drop.ringsHit - before, glow: ring.node.glow, below: s.p.y < ring.y }; }; return { inside: through(0), edge: through(R[3].r - 0.3), outside: through(R[3].r + 0.6), particles: B.stats().particles }; })()`);
  record("drop physics: a hoop counts when the fall crosses its plane inside the radius, not outside it", rings.inside.hit === 1 && rings.inside.glow < 0.5 && rings.inside.below && rings.edge.hit === 1 && rings.outside.hit === 0 && rings.outside.glow === 1 && rings.outside.below && rings.particles > 0, JSON.stringify(rings));
  const chute = await b.evaluate(`(() => { const B = window.__ooga, K = window.BL.skydiver; const s = ${isolateDiver}; B.drop.simulate(5); const before = { vy: s.v.y, canopy: B.diver.canopy.visible }; B.drop.deploy(); B.drop.simulate(0.4); const opening = { phase: s.phase, scale: B.diver.canopy.scale.x, visible: B.diver.canopy.visible }; B.drop.simulate(3); const flying = { phase: s.phase, vy: +s.v.y.toFixed(2), forward: +Math.hypot(s.v.x, s.v.z).toFixed(2), scale: +B.diver.canopy.scale.x.toFixed(2), chute: document.getElementById("drop-chute-name").textContent }; const h0 = s.heading; B.drop.setInput(0, 1, 0, false); B.drop.simulate(1); const turned = s.heading - h0; const h1 = s.heading; B.drop.setInput(0, 0, 1, false); B.drop.simulate(1); const yawed = Math.atan2(Math.sin(s.heading - h1), Math.cos(s.heading - h1)); B.drop.setInput(0, 0, 0, true); B.drop.simulate(1.5); const flare = { vy: +s.v.y.toFixed(2), forward: +Math.hypot(s.v.x, s.v.z).toFixed(2), flaring: s.flaring }; B.drop.simulate(2); const spent = { flaring: s.flaring, reserve: +s.flare.toFixed(2) }; return { before, opening, flying, turned, yawed, flare, spent, sink: K.SINK, flareSink: K.FLARE_SINK, again: B.drop.deploy() }; })()`);
  record("drop physics: pulling blooms the canopy, the sink settles at its rate, D banks it right, Q turns it left, a flare slows the sink until the reserve runs out", chute.before.vy < -20 && !chute.before.canopy && chute.opening.phase === "open" && chute.opening.visible && chute.opening.scale > 0.3 && chute.opening.scale < 1 && chute.flying.phase === "canopy" && Math.abs(chute.flying.vy + chute.sink) < 0.3 && chute.flying.forward > 5 && chute.flying.scale === 1 && chute.flying.chute === "canopy" && chute.turned < -0.8 && chute.yawed > 0.8 && chute.flare.flaring && chute.flare.vy > -chute.flareSink - 0.4 && chute.flare.forward < 4 && !chute.spent.flaring && chute.spent.reserve === 0 && !chute.again, JSON.stringify(chute));
  const landings = await b.evaluate(`(() => { const B = window.__ooga, T = B.course.target; const drop = (setup) => { B.drop.toBoard(); B.drop.jumpNow(); const s = B.diver.state; setup(s); B.drop.simulate(8); return { phase: B.drop.phase, landing: s.landing, result: B.drop.result && B.drop.result.landing, score: B.drop.score, dist: B.drop.result && +B.drop.result.dist.toFixed(2), bananaBonus: B.drop.result && B.drop.result.banana, y: +s.p.y.toFixed(2), ground: B.island.surfaceAt(s.p.x, s.p.z) }; }; const stand = drop((s) => { s.p.x = T.x - 2; s.p.y = 3.6; s.p.z = T.z; s.v.x = s.v.z = 0; s.v.y = -5; B.drop.deploy(); s.open = 1; s.phase = "canopy"; s.heading = Math.PI / 2; B.drop.setInput(0, 0, 0, true); }); const fast = drop((s) => { s.p.x = T.x + 6; s.p.y = 3.5; s.p.z = T.z; s.v.x = s.v.z = 0; B.drop.deploy(); s.open = 1; s.phase = "canopy"; s.v.y = -8; s.flare = 0; }); const pancake = drop((s) => { s.p.x = 2; s.p.y = 30; s.p.z = 2; s.v.x = s.v.z = 0; }); const tumble = drop((s) => { s.p.x = 2; s.p.y = 8; s.p.z = 2; s.v.x = 22; s.v.z = 0; s.v.y = -24; }); const hole = drop((s) => { s.p.x = -5; s.p.y = 10; s.p.z = 5; s.v.x = s.v.z = 0; s.v.y = -40; window.BL.math.quat.fromEuler(s.q, Math.PI, 0, 0); }); const holeShown = window.BL.scenes.drop.root.children.some((n) => n.geometry === window.BL.dropModels.hole() && n.visible); const lost = drop((s) => { s.p.x = 80; s.p.y = 10; s.p.z = 80; s.v.x = s.v.z = 0; }); return { stand, fast, pancake, tumble, hole, holeShown, lost, best: B.game.state.drop.best }; })()`);
  record("drop physics: any canopy touchdown, slow or fast, is a good landing scored by its distance to the target", landings.stand.phase === "results" && landings.stand.landing === "stand" && landings.stand.result === "stand" && landings.stand.score >= 600 && landings.stand.dist < 4 && landings.fast.landing === "stand" && landings.fast.score > 0 && landings.fast.score < landings.stand.score && landings.best && landings.best.landing === "stand", JSON.stringify({ stand: landings.stand, fast: landings.fast }));
  record("drop physics: without a chute a flat slow fall flattens, a flat fast one tumbles, a spine-first one punches a hole, all for nothing", landings.pancake.landing === "pancake" && landings.tumble.landing === "tumble" && landings.hole.landing === "hole" && landings.holeShown && [landings.pancake, landings.tumble, landings.hole].every((l) => l.phase === "results" && l.score === 0 && l.bananaBonus === 0), JSON.stringify({ pancake: landings.pancake, tumble: landings.tumble, hole: landings.hole, holeShown: landings.holeShown }));
  record("drop physics: off the island the fall is lost as soon as it drops past the rim", landings.lost.result === "lost" && landings.lost.y < -8 && landings.lost.y > -60, JSON.stringify(landings.lost));
});

const dropFlow = () => withPage("drop flow", dropPage(src), async (b) => {
  const rendered = (frames) => b.evaluate(`new Promise((resolve) => { const B = window.__ooga; const start = B.renderedFrames; const t0 = performance.now(); const tick = () => { if (B.renderedFrames >= start + ${frames} || performance.now() - t0 > 4000) resolve(B.renderedFrames - start); else requestAnimationFrame(tick); }; requestAnimationFrame(tick); })`);
  const jumped = await b.evaluate(`(() => { const B = window.__ooga; const ok = B.drop.jumpNow(); return { ok, phase: B.drop.phase, diver: B.diver.state.phase, alt: B.diver.state.p.y, speed: B.diver.state.speed, act: document.getElementById("act").textContent, centerHidden: document.getElementById("drop-center").hidden }; })()`);
  await rendered(8);
  const falling = await b.evaluate(`(() => { const B = window.__ooga, s = B.diver.state, c = B.camera; return { alt: s.p.y, streaks: B.drop.streaks, camAbove: c.position.y > s.p.y + 0.5, camNear: Math.hypot(c.position.x - s.p.x, c.position.y - s.p.y, c.position.z - s.p.z) < 12, fov: +(c.fov * 180 / Math.PI).toFixed(1), up: document.getElementById("drop-alt").textContent, time: document.getElementById("drop-time").textContent }; })()`);
  record("drop flow: the jump leaves the plane in freefall with the camera above the diver, the streaks up and the strip counting", jumped.ok && jumped.phase === "air" && jumped.diver === "free" && jumped.alt > 350 && jumped.speed > 15 && jumped.centerHidden && falling.alt < jumped.alt && falling.streaks === 160 && falling.camAbove && falling.camNear && +falling.up > 200 && falling.time !== "0:00.00", JSON.stringify({ jumped, falling }));
  // Fall to the pull height in simulated time, then pull for real with Space
  await b.evaluate(`(() => { const B = window.__ooga, s = B.diver.state; s.p.x = 0; s.p.z = 0; s.v.x = s.v.z = 0; while (s.p.y > 87 && B.drop.phase === "air") B.drop.simulate(0.25); })()`);
  await rendered(3);
  const prompt = await b.evaluate(`({ center: document.getElementById("drop-center").textContent, hidden: document.getElementById("drop-center").hidden, alt: window.__ooga.diver.state.p.y })`);
  await b.key(" ");
  await rendered(3);
  const pulled = await b.evaluate(`(() => { const B = window.__ooga, s = B.diver.state; return { phase: s.phase, canopy: B.diver.canopy.visible, chute: document.getElementById("drop-chute-name").textContent, act: document.getElementById("act").textContent }; })()`);
  record("drop flow: the PULL call shows near the ground and Space opens the canopy", !prompt.hidden && prompt.center === "PULL" && prompt.alt < 90 && pulled.phase !== "free" && pulled.canopy && pulled.chute === "canopy" && pulled.act === "Flare", JSON.stringify({ prompt, pulled }));
  // Bring the canopy down over the banana mound, flaring in
  await b.evaluate(`(() => { const B = window.__ooga, s = B.diver.state; B.drop.simulate(3); s.p.x = -2.4; s.p.y = 3.4; s.p.z = 0; s.v.x = s.v.z = 0; s.heading = Math.PI / 2; B.drop.setInput(0, 0, 0, true); B.drop.simulate(8); })()`);
  await rendered(3);
  const landed = await b.evaluate(`(() => { const B = window.__ooga, s = B.diver.state; return { phase: B.drop.phase, landing: s.landing, shown: !document.getElementById("drop-results").hidden, rows: document.querySelectorAll("#drop-score li").length, summary: document.getElementById("drop-summary").textContent, best: B.game.state.drop.best, stored: JSON.parse(localStorage.getItem("oogaboogaland.v1")).drop.best, result: B.drop.result, actHidden: document.getElementById("act").hidden, canopyDown: !B.diver.canopy.visible || B.diver.canopy.scale.y < 1 }; })()`);
  record("drop flow: the landing shows the results with the score rows, saves the best and folds the canopy", landed.phase === "results" && landed.landing === "stand" && landed.shown && landed.rows >= 5 && landed.summary.length > 0 && landed.best && landed.best.score === landed.result.score && landed.stored && landed.stored.score === landed.best.score && landed.result.banana === 300 && landed.actHidden && landed.canopyDown, JSON.stringify(landed));
  await b.evaluate(`document.querySelector('#drop-results [data-action="drop-again"]').click()`);
  await b.sleep(200);
  const again = await b.evaluate(`(() => { const B = window.__ooga; return { phase: B.drop.phase, resultsHidden: document.getElementById("drop-results").hidden, score: B.drop.score, rings: B.drop.ringsHit, ringsLit: B.course.rings.every((r) => r.node.glow === 1 && !r.hit), diverPhase: B.diver.state.phase }; })()`);
  record("drop flow: Again restarts the climb with the course reset", again.phase === "climb" && again.resultsHidden && again.score === 0 && again.rings === 0 && again.ringsLit && again.diverPhase === "idle", JSON.stringify(again));
  await b.evaluate(`(() => { const bad = JSON.parse(localStorage.getItem("oogaboogaland.v1")); bad.drop.best = { score: "x", rings: 3, ringTotal: 10, landing: "stand" }; localStorage.setItem("oogaboogaland.v1", JSON.stringify(bad)); })()`);
  await b.open(dropPage(src));
  await b.sleep(2500);
  const reloaded = await b.evaluate(`(() => { const B = window.__ooga; return { best: B.game.state.drop.best, rows: [...document.querySelectorAll("#drop-best li")].map((li) => li.textContent) }; })()`);
  record("drop flow: a malformed saved best is dropped on reload", reloaded.best === null && reloaded.rows[0].startsWith("Score"), JSON.stringify(reloaded));
  await b.evaluate(`document.querySelector('[data-scene="drop"] [data-action="leave"]').click()`);
  await b.sleep(900);
  const left = await b.evaluate(`(() => { const B = window.__ooga; const c = B.camera; return { scene: B.scene, toPile: +Math.hypot(c.target.x, c.target.z).toFixed(2), dropHidden: document.getElementById("drop").hidden, boardBtnHidden: document.getElementById("drop-board-btn").hidden }; })()`);
  record("drop flow: Back to the island returns to the hub landing view with the drop HUD hidden", left.scene === "hub" && left.toPile < 0.5 && left.dropHidden && left.boardBtnHidden, JSON.stringify(left));
});

const dropCanvas = () => withPage("drop canvas", dropPage(src, "canvas2d=1"), async (b) => {
  const r = await b.evaluate(`(() => { const B = window.__ooga; B.drop.jumpNow(); return { kind: B.renderer.kind, phase: B.drop.phase }; })()`);
  const frames = await b.evaluate(`new Promise((resolve) => { const B = window.__ooga; const start = B.renderedFrames; const t0 = performance.now(); const tick = () => { if (B.renderedFrames >= start + 30 || performance.now() - t0 > 6000) resolve({ frames: B.renderedFrames - start, alt: B.diver.state.p.y, streaks: B.drop.streaks }); else requestAnimationFrame(tick); }; requestAnimationFrame(tick); })`);
  record("drop canvas: the Canvas 2D fallback draws the fall with the streak batch", r.kind === "canvas2d" && r.phase === "air" && frames.frames >= 30 && frames.alt < 360 && frames.streaks === 160, JSON.stringify({ ...r, ...frames }));
});

const dropPhone = () => withPage("drop phone", dropPage(src), async (b) => {
  const board = await b.evaluate(`(() => { const g = document.getElementById("drop-board").getBoundingClientRect(); return { fits: g.bottom <= window.innerHeight && g.width <= window.innerWidth, columns: getComputedStyle(document.querySelector(".drop-columns")).gridTemplateColumns.split(" ").length, help: document.getElementById("drop-help").textContent }; })()`);
  await b.evaluate(`document.querySelector('[data-action="drop-start"]').click()`);
  await b.sleep(800);
  const climb = await b.evaluate(`(() => { const B = window.__ooga; const act = document.getElementById("act"), strip = document.querySelector(".race-hud-right").getBoundingClientRect(); return { phase: B.drop.phase, act: !act.hidden && act.textContent, stripFits: strip.right <= window.innerWidth && strip.left >= 0, sticks: getComputedStyle(document.getElementById("joy-move")).display, look: getComputedStyle(document.getElementById("joy-look")).display }; })()`);
  await b.evaluate(`(() => { const B = window.__ooga; B.drop.jumpNow(); const s = B.diver.state; s.p.y = 900; s.v.x = s.v.z = 0; s.v.y = -20; B.drop.simulate(4); })()`);
  const stick = await b.evaluate(`(() => { const r = document.getElementById("joy-move").getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; })()`);
  const flat = await b.evaluate(`Array.from(window.__ooga.diver.state.front).map((v) => +v.toFixed(2))`);
  await b.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: stick.x, y: stick.y }] });
  for (let i = 1; i <= 6; i++) {
    await b.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: stick.x, y: stick.y - i * 6 }] });
    await b.sleep(100);
  }
  await b.sleep(900);
  const tipped = await b.evaluate(`(() => { const s = window.__ooga.diver.state; return { front: Array.from(s.front).map((v) => +v.toFixed(2)), act: document.getElementById("act").textContent }; })()`);
  await b.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  record("drop phone: the board stacks, the climb shows the Jump button and both sticks, and the left stick tips the diver", board.fits && board.columns === 1 && board.help.includes("stick") && climb.phase === "climb" && climb.act === "Jump!" && climb.stripFits && climb.sticks === "block" && climb.look === "block" && flat[1] < -0.95 && tipped.front[1] > flat[1] + 0.15 && tipped.act === "Pull!", JSON.stringify({ board, climb, flat, tipped }));
}, { w: 390, h: 844, mobile: true });

const dropAudio = () => withPage("drop audio", dropPage(src), async (b) => {
  const before = await b.evaluate(`(() => { const A = window.__ooga.audio; return { ready: A.ready, context: !!A.context }; })()`);
  await b.click(720, 450);
  await b.sleep(200);
  const after = await b.evaluate(`(() => { const A = window.__ooga.audio; for (const name of Object.keys(A.cues)) A.cues[name](); A.state.planeSpeed = 20; A.state.speed = 30; A.state.falling = 1; A.update(1 / 60); A.state.canopy = 1; A.state.flaring = 1; A.update(1 / 60); return { ready: A.ready, state: A.context.state, voices: A.voices, cues: Object.keys(A.cues).length, muted: A.muted }; })()`);
  await b.key("m");
  await b.sleep(100);
  const muted = await b.evaluate(`(() => { const A = window.__ooga.audio; return { muted: A.muted, pressed: document.getElementById("drop-mute").getAttribute("aria-pressed"), stored: localStorage.getItem("oogaboogaland.audio") }; })()`);
  await b.key("m");
  await b.evaluate(`window.__ooga.go("hub")`);
  await b.sleep(900);
  const left = await b.evaluate(`(() => { const B = window.__ooga; return { scene: B.scene, audio: B.audio === undefined }; })()`);
  record("drop audio: silent until a real gesture, then a running context with a fixed voice pool and every cue playable", !before.ready && !before.context && after.ready && after.state === "running" && after.voices === 8 && after.cues >= 14 && !after.muted, JSON.stringify({ before, after }));
  record("drop audio: M mutes, remembers it, and leaving the drop closes the context", muted.muted && muted.pressed === "true" && muted.stored === "off" && left.scene === "hub" && left.audio, JSON.stringify({ muted, left }));
});

const hubDrop = () => withPage("hub drop route", hubPage(src), async (b) => {
  await b.evaluate(`window.__ooga.pilot.goPreset("drop")`);
  await b.sleep(1200);
  const roof = await b.evaluate(`(() => { const B = window.__ooga; const l = B.launchers[0], m = B.mouths.find((m) => m.id === "c9"); const p = B.project(l.x, l.y + 1, l.z); const hit = B.input.pick(p.x, p.y); const wheel = window.BL.raceModels.kartWheel(), body = window.BL.dropModels.planeBody(); let wheels = 0, planes = 0; const isGeometry = (node, geometry) => node.geometry === geometry || node.geometry?.matrixSourceGeometry === geometry; const walk = (node) => { if (isGeometry(node, wheel)) wheels++; if (isGeometry(node, body)) planes++; for (const c of node.children) walk(c); }; walk(window.BL.scenes.hub.root); return { launchers: B.launchers.length, onRoof: l.y > 3 && Math.abs(l.y - window.BL.dropModels.roofSpot(B.island, m, {}, 0.8).y) < 1e-6 && Math.abs(l.y - B.island.surfaceAt(l.x, l.z)) < 0.1, overRoom: Math.hypot(l.x - m.x, l.z - m.z) > 3 && Math.hypot(l.x - m.x, l.z - m.z) < 5, x: Math.round(p.x), y: Math.round(p.y), kind: hit && hit.owner.kind, prop: hit && hit.owner.prop, wheels, planes, sign: (() => { const o = B.props.find((o) => o.prop === "sign"); return o ? { tip: (() => { const q = B.project(o.x, o.node.world[13] + 0.8, o.z), hit = B.input.pick(q.x, q.y); return hit && hit.owner.prop; })(), onRoof: Math.abs(o.node.world[13] - B.island.surfaceAt(o.x, o.z)) < 1e-6, nearPlane: Math.hypot(o.x - l.x, o.z - l.z) < 4.5, text: o.node.geometry === window.BL.dropModels.roofSign() } : null; })(), scenery: B.scenery.candidateCount, clear: B.props.filter((o) => o.scenery && o.active && Math.hypot(o.x - l.x, o.z - l.z) < o.footprint + 3.6).length }; })()`);
  await b.mouse("mouseMoved", roof.x, roof.y, { button: "none" });
  await b.sleep(300);
  const tip = await b.evaluate(`document.getElementById("tooltip").textContent`);
  await b.click(roof.x, roof.y);
  await untilPage(b, 'B.scene === "drop" && !B.transitioning', 15000);
  const entered = await b.evaluate(`({ scene: window.__ooga.scene, phase: window.__ooga.drop.phase, board: !document.getElementById("drop-board").hidden })`);
  record("hub drop route: the plane parks on the rally cave roof with its sign on pegs beside it, tooltips, and tapping it enters the board", roof.launchers === 1 && roof.onRoof && roof.overRoom && roof.kind === "prop" && roof.prop === "plane" && roof.wheels === 9 && roof.planes === 1 && roof.sign && roof.sign.onRoof && roof.sign.nearPlane && roof.sign.text && roof.sign.tip === "sign" && roof.clear === 0 && roof.scenery === 376 && tip === "Ooga Drop · tap to fly" && entered.scene === "drop" && entered.phase === "board" && entered.board, JSON.stringify({ ...roof, tip, ...entered }));
  await b.key("Escape");
  await untilPage(b, 'B.scene === "hub" && !B.transitioning', 15000);
  const back = await b.evaluate(`(() => { const B = window.__ooga; const c = B.camera; return { scene: B.scene, toPile: +Math.hypot(c.target.x, c.target.z).toFixed(2), dropHidden: document.getElementById("drop").hidden }; })()`);
  record("hub drop route: Escape on the board returns to the hub landing view", back.scene === "hub" && back.toPile < 0.5 && back.dropHidden, JSON.stringify(back));
  // Approach beside the wing instead of trying to walk through its solid edge.
  const driver = await b.evaluate(`(() => { const B = window.__ooga; const l = B.launchers[0]; const cave = [...B.cavemen.values()].find((c) => c.state === "working" && !c.walk && !c.build && c.traits.name !== "portlandhodl"); const dx = Math.cos(l.ry), dz = -Math.sin(l.ry), x = l.x + dx * 3.6 + Math.sin(l.ry), z = l.z + dz * 3.6 + Math.cos(l.ry); B.crew.control(cave); B.crew.relocatePlayer({ x, y: B.island.surfaceAt(x, z), z }, Math.atan2(-dx, -dz)); B.pilot.orbit.tYaw = B.pilot.orbit.yaw = Math.atan2(dx, dz); return cave.traits.name; })()`);
  await b.sleep(300);
  await b.send("Input.dispatchKeyEvent", { type: "keyDown", key: "w", text: "w" });
  const walked = await b.evaluate(`new Promise((resolve) => { const B = window.__ooga, target = B.launchers[0], t0 = performance.now(); const tick = () => { const p = B.crew.player && B.crew.player.root.position, distance = p ? Math.hypot(p.x - target.x, p.z - target.z) : Infinity; if (B.scene !== "hub" || distance < 1.5 || performance.now() - t0 > 6000) resolve({ scene: B.scene, distance, ms: Math.round(performance.now() - t0) }); else requestAnimationFrame(tick); }; tick(); })`);
  await b.send("Input.dispatchKeyEvent", { type: "keyUp", key: "w" });
  await b.evaluate(`window.__ooga.crew.player.root.rotation.y += Math.PI`);
  await untilPage(b, "B.renderedFrames > 0");
  const waiting = await b.evaluate(`({ scene: window.__ooga.scene, hop: window.__ooga.crew.player.hop })`);
  await b.key(" ");
  const started = await untilPage(b, 'B.scene === "drop" && B.drop.phase === "board"');
  const preselected = await b.evaluate(`({ picked: document.querySelector('#drop-oogas [aria-pressed="true"]')?.dataset.racer, diver: window.__ooga.diver?.cave.traits.name })`);
  record("hub drop route: approaching the plane waits for Space, which works facing away and preserves the chosen Ooga", walked.scene === "hub" && walked.distance < 1.5 && waiting.scene === "hub" && waiting.hop === 0 && started && preselected.picked === driver && preselected.diver === driver, JSON.stringify({ walked, waiting, started, driver, preselected }));
});

const soakDrop = () => withPage("soak: drop cycles", hubPage(src), async (b) => {
  const { rendered, settled, snapshot, travel, heapDetail, within } = await soak(b);
  await settled();
  await rendered(2);
  const s0 = await snapshot();
  for (let i = 0; i < 6; i++) {
    for (const id of ["drop", "hub"]) {
      const t = await travel(id);
      if (t.stuck) throw new Error(`round trip ${i + 1}: the transition to the ${id} did not settle: ${JSON.stringify(t.stuck)}`);
      await b.sleep(400);
    }
  }
  const s6 = await snapshot();
  const same = (key) => s0.stats[key] === s6.stats[key];
  record("soak: drop cycles: node, target, tween and DOM counts identical after six hub/drop round trips", s6.stats.tweens === 0 && same("allNodes") && same("targets") && same("tweens") && same("dom"), `${JSON.stringify(s0.stats)} -> ${JSON.stringify(s6.stats)}`);
  record("soak: drop cycles: GPU records stable", Math.abs(s6.stats.gl.records - s0.stats.gl.records) <= 3, `${s0.stats.gl.records} -> ${s6.stats.gl.records}`);
  record("soak: drop cycles: live DOM nodes and event listeners identical", s6.nodes === s0.nodes && s6.listeners === s0.listeners, `nodes ${s0.nodes} -> ${s6.nodes}, listeners ${s0.listeners} -> ${s6.listeners}`);
  record("soak: drop cycles: heap after GC within 10%", within(s0, s6, 0.1), heapDetail(s0, s6));
  record("soak: drop cycles: no error thrown", !b.logs.some((l) => l.startsWith("[exception]")), b.logs.join(" | ").slice(0, 200));
});

// Sixty tips in fifteen seconds while the diver falls, then back to base
const soakDropDonations = () => withPage("soak: donations (drop)", dropPage(src), async (b) => {
  const { until, rendered, settled, snapshot, heapDetail, within } = await soak(b);
  await settled();
  await rendered(2);
  const before = await snapshot();
  await b.evaluate(`(() => { const B = window.__ooga; B.drop.jumpNow(); const s = B.diver.state; s.p.y = 2000; s.v.x = s.v.z = 0; })()`);
  const level0 = await b.evaluate("window.__ooga.level");
  const start = await b.evaluate("performance.now()");
  for (let i = 0; i < 60; i++) {
    await b.evaluate(`window.__ooga.demoTip(${i % 4 === 3 ? 120000 : 1200})`);
    await until(`performance.now() >= ${start + 250 * (i + 1)}`, 2000);
  }
  const mid = await b.evaluate(`(() => { const B = window.__ooga; return { level: B.level, phase: B.drop.phase, donations: B.game.state.donations, sats: document.getElementById("stat-sats").textContent, falling: B.diver.state.phase === "free" }; })()`);
  await b.evaluate(`window.__ooga.drop.toBoard()`);
  const quiet = await until("B.stats().particles === 0", 15000) && await settled(15000);
  await b.evaluate("(() => { const B = window.__ooga; B.trimPool(); B.housekeep(); })()");
  const after = await snapshot();
  const a = after.stats, s = before.stats;
  record("soak: donations (drop): tips credit the shared banana level mid-fall and the pools drain", quiet && mid.phase === "air" && mid.falling && mid.level > level0 + 150 && mid.donations === 60 && a.particles === 0 && a.tweens === 0 && a.pool <= 32 && a.streaks === 0, JSON.stringify({ level0, mid, particles: a.particles, pool: a.pool, tweens: a.tweens }));
  record("soak: donations (drop): node and target counts back to base", a.allNodes - a.pool === s.allNodes - s.pool && a.targets === s.targets, `allNodes ${s.allNodes} -> ${a.allNodes} (pool ${a.pool}), targets ${s.targets} -> ${a.targets}, dom ${s.dom} -> ${a.dom}, listeners ${before.listeners} -> ${after.listeners}`);
  record("soak: donations (drop): GPU records bounded", a.gl.records - s.gl.records <= 20, `${s.gl.records} -> ${a.gl.records}`);
  record("soak: donations (drop): heap after GC within 15%", within(before, after, 0.15), heapDetail(before, after));
});

const soakRace = () => withPage("soak: race cycles", hubPage(src), async (b) => {
  const { rendered, settled, snapshot, travel, heapDetail, within } = await soak(b);
  await settled();
  await rendered(2);
  const s0 = await snapshot();
  for (let i = 0; i < 6; i++) {
    for (const id of ["race", "hub"]) {
      const t = await travel(id);
      if (t.stuck) throw new Error(`round trip ${i + 1}: the transition to the ${id} did not settle: ${JSON.stringify(t.stuck)}`);
      // The garage has no tweens, so let the fade back in finish before the next go
      await b.sleep(400);
    }
  }
  const s6 = await snapshot();
  const same = (key) => s0.stats[key] === s6.stats[key];
  record("soak: race cycles: node, target, tween and DOM counts identical after six hub/race round trips", s6.stats.tweens === 0 && same("allNodes") && same("targets") && same("tweens") && same("dom"), `${JSON.stringify(s0.stats)} -> ${JSON.stringify(s6.stats)}`);
  record("soak: race cycles: GPU records stable", Math.abs(s6.stats.gl.records - s0.stats.gl.records) <= 3, `${s0.stats.gl.records} -> ${s6.stats.gl.records}`);
  record("soak: race cycles: live DOM nodes and event listeners identical", s6.nodes === s0.nodes && s6.listeners === s0.listeners, `nodes ${s0.nodes} -> ${s6.nodes}, listeners ${s0.listeners} -> ${s6.listeners}`);
  record("soak: race cycles: heap after GC within 10%", within(s0, s6, 0.1), heapDetail(s0, s6));
  record("soak: race cycles: no error thrown", !b.logs.some((l) => l.startsWith("[exception]")), b.logs.join(" | ").slice(0, 200));
});

// Sixty tips in fifteen seconds while a race runs, then back to base
const soakRaceDonations = () => withPage("soak: donations (race)", racePage(src), async (b) => {
  const { until, rendered, settled, snapshot, heapDetail, within } = await soak(b);
  await settled();
  await rendered(2);
  const before = await snapshot();
  await b.evaluate(`(() => { const B = window.__ooga; B.race.startRace(); B.racers.autopilot = true; })()`);
  await b.sleep(3600);
  const level0 = await b.evaluate("window.__ooga.level");
  const start = await b.evaluate("performance.now()");
  for (let i = 0; i < 60; i++) {
    await b.evaluate(`window.__ooga.demoTip(${i % 4 === 3 ? 120000 : 1200})`);
    await until(`performance.now() >= ${start + 250 * (i + 1)}`, 2000);
  }
  const mid = await b.evaluate(`(() => { const B = window.__ooga; return { level: B.level, phase: B.race.phase, donations: B.game.state.donations, sats: document.getElementById("stat-sats").textContent, ticker: !!B.stats().bubbles || true }; })()`);
  await b.evaluate(`(() => { const B = window.__ooga; B.race.toGarage(); })()`);
  const quiet = await until("B.stats().particles === 0", 15000) && await settled(15000);
  await b.evaluate("(() => { const B = window.__ooga; B.trimPool(); B.housekeep(); })()");
  const after = await snapshot();
  const a = after.stats, s = before.stats;
  record("soak: donations (race): tips credit the shared banana level mid-race and the pools drain", quiet && mid.phase === "racing" && mid.level > level0 + 150 && mid.donations === 60 && a.particles === 0 && a.tweens === 0 && a.pool <= 32 && a.rocksLive === 0, JSON.stringify({ level0, mid, particles: a.particles, pool: a.pool, tweens: a.tweens }));
  record("soak: donations (race): node and target counts back to base", a.allNodes - a.pool === s.allNodes - s.pool && a.targets === s.targets, `allNodes ${s.allNodes} -> ${a.allNodes} (pool ${a.pool}), targets ${s.targets} -> ${a.targets}, dom ${s.dom} -> ${a.dom}, listeners ${before.listeners} -> ${after.listeners}`);
  record("soak: donations (race): GPU records bounded", a.gl.records - s.gl.records <= 20, `${s.gl.records} -> ${a.gl.records}`);
  record("soak: donations (race): heap after GC within 15%", within(before, after, 0.15), heapDetail(before, after));
});

// ---------- soak ----------
// Round trips and storms must leave nothing behind
const mb = (bytes) => (bytes / 1048576).toFixed(2);
const FRESH_FRAMES = 150;
const soak = async (b) => {
  await b.send("HeapProfiler.enable");
  const until = (cond, ms) => b.evaluate(`new Promise((resolve) => { const B = window.__ooga; const t0 = performance.now(); const tick = () => { const ok = !!(${cond}); if (ok || performance.now() - t0 > ${ms}) resolve(ok); else requestAnimationFrame(tick); }; tick(); })`);
  const rendered = (frames, ms = 6000) => b.evaluate(`new Promise((resolve) => { const B = window.__ooga; const start = B.renderedFrames; const t0 = performance.now(); const tick = () => { if (B.renderedFrames >= start + ${frames} || performance.now() - t0 > ${ms}) resolve(B.renderedFrames - start); else requestAnimationFrame(tick); }; requestAnimationFrame(tick); })`);
  const settled = (ms = 4000) => until("window.BL.scene.tweenCount() === 0", ms);
  // Every scene writes its hint 1.2 s after entering; the first snapshot must already count that text node
  await until(`document.getElementById("hint").textContent`, 3000);
  const heap = async () => {
    await b.send("HeapProfiler.collectGarbage");
    // Count the page before Chrome's heap-snapshot machinery can add an inspector node.
    const dom = (await b.send("Memory.getDOMCounters")).result;
    const chunks = [];
    b.on("HeapProfiler.addHeapSnapshotChunk", (p) => chunks.push(p.chunk));
    await b.send("HeapProfiler.takeHeapSnapshot", { reportProgress: false });
    b.on("HeapProfiler.addHeapSnapshotChunk", null);
    const snap = JSON.parse(chunks.join(""));
    const { node_fields: fields, node_types: [types] } = snap.snapshot.meta;
    const iType = fields.indexOf("type"), iSize = fields.indexOf("self_size"), code = types.indexOf("code");
    let total = 0, compiled = 0;
    for (let i = 0; i < snap.nodes.length; i += fields.length) {
      total += snap.nodes[i + iSize];
      if (snap.nodes[i + iType] === code) compiled += snap.nodes[i + iSize];
    }
    return { used: (await b.send("Runtime.getHeapUsage")).result.usedSize, objects: total - compiled, code: compiled, nodes: dom.nodes, listeners: dom.jsEventListeners };
  };
  const snapshot = async (stats = null) => ({ stats: stats || await b.evaluate("window.__ooga.stats()"), ...await heap() });
  // go(id), then wait for swap, frames and animations
  const travel = (id) => b.evaluate(`new Promise((resolve) => { const B = window.__ooga; const T = window.BL.scene.tweenCount; const t0 = performance.now(); let last = t0, swap = 0, swapFrame = 0, swapGap = 0; B.go(${JSON.stringify(id)}); const tick = () => { const now = performance.now(); if (!swap && B.scene === ${JSON.stringify(id)}) { swap = now - t0; swapGap = now - last; swapFrame = B.renderedFrames; } last = now; if (swap && B.renderedFrames >= swapFrame + 3 && T() === 0) resolve({ swap, swapGap, settled: now - t0 }); else if (now - t0 > 8000) resolve({ stuck: { scene: B.scene, tweens: T(), framesSinceSwap: swap ? B.renderedFrames - swapFrame : -1, swap: Math.round(swap) } }); else requestAnimationFrame(tick); }; requestAnimationFrame(tick); })`);
  const heapDetail = (a, z) => `objects ${mb(a.objects)} -> ${mb(z.objects)} MB (used ${mb(a.used)} -> ${mb(z.used)} MB, code ${mb(a.code)} -> ${mb(z.code)} MB)`;
  const within = (a, z, share) => Math.abs(z.objects - a.objects) <= a.objects * share;
  return { until, rendered, settled, snapshot, travel, heapDetail, within };
};

const soakScenes = () => withPage("soak: scene cycles", hubPage(src), async (b) => {
  const { rendered, settled, snapshot, travel, heapDetail, within } = await soak(b);
  await settled();
  await rendered(2);
  const s0 = await snapshot();
  const times = [];
  for (let i = 0; i < 10; i++) {
    for (const id of ["lab", "hub"]) {
      const t = await travel(id);
      if (t.stuck) throw new Error(`round trip ${i + 1}: the transition to the ${id} did not settle: ${JSON.stringify(t.stuck)}`);
      times.push(t);
    }
  }
  const s10 = await snapshot();
  const same = (key) => s0.stats[key] === s10.stats[key];
  const avg = (key) => Math.round(times.reduce((sum, t) => sum + t[key], 0) / times.length);
  record("soak: scene cycles: node, target, tween and DOM counts identical after ten round trips", s10.stats.tweens === 0 && same("allNodes") && same("targets") && same("tweens") && same("dom"), `${JSON.stringify(s0.stats)} -> ${JSON.stringify(s10.stats)}`);
  record("soak: scene cycles: GPU records stable", Math.abs(s10.stats.gl.records - s0.stats.gl.records) <= 3, `${s0.stats.gl.records} -> ${s10.stats.gl.records}`);
  record("soak: scene cycles: live DOM nodes and event listeners identical", s10.nodes === s0.nodes && s10.listeners === s0.listeners, `nodes ${s0.nodes} -> ${s10.nodes}, listeners ${s0.listeners} -> ${s10.listeners}`);
  record("soak: scene cycles: heap after GC within 10%", within(s0, s10, 0.1), `${heapDetail(s0, s10)} · avg go->swap ${avg("swap")} ms (swap frame ${avg("swapGap")} ms), go->settled ${avg("settled")} ms`);
  record("soak: scene cycles: no error thrown", !b.logs.some((l) => l.startsWith("[exception]")), b.logs.join(" | ").slice(0, 200));
});

const soakResidency = () => withPage("soak: GPU residency", hubPage(src), async (b) => {
  const { until } = await soak(b);
  const records = () => b.evaluate("window.__ooga.renderer.stats.records");
  // Records come as geometry draws, so count equal frames
  const framesSince = (start) => until(`B.renderedFrames >= ${start + FRESH_FRAMES}`, 8000);
  const visit = async (id) => {
    await b.evaluate(`window.__ooga.go(${JSON.stringify(id)})`);
    const start = await b.evaluate(`new Promise((resolve) => { const B = window.__ooga; const t0 = performance.now(); const tick = () => { if (B.scene === ${JSON.stringify(id)} || performance.now() - t0 > 4000) resolve(B.renderedFrames); else requestAnimationFrame(tick); }; tick(); })`);
    await framesSince(start);
    return records();
  };
  // A fresh page of the same scene
  const fresh = async (url) => {
    await b.open(url);
    const search = new URL(url).search;
    for (const t0 = Date.now(); Date.now() - t0 < 15000;) {
      await b.sleep(100);
      try {
        if (await b.evaluate(`location.search === ${JSON.stringify(search)} && !!window.__ooga && window.__ooga.renderedFrames >= ${FRESH_FRAMES}`)) return records();
      } catch {
        // The old document is tearing down, so poll again
      }
    }
    throw new Error(`${url} did not load`);
  };
  await framesSince(0);
  const hubFresh = await records();
  const labAfterHub = await visit("lab");
  const hubAfterLab = await visit("hub");
  const labFresh = await fresh(page(src));
  record("soak: GPU residency: the lab after a hub visit holds only lab geometry", Math.abs(labAfterHub - labFresh) <= 3, `lab after hub ${labAfterHub}, fresh lab ${labFresh}`);
  record("soak: GPU residency: the hub after a lab visit holds no lab geometry", hubAfterLab <= hubFresh + 3, `hub after lab ${hubAfterLab}, fresh hub ${hubFresh}`);
});

// Sixty tips in fifteen seconds, then back to base
const soakDonations = (label, url, opts) => withPage(`soak: donations (${label})`, url, async (b) => {
  const { until, rendered, settled, snapshot, heapDetail, within } = await soak(b);
  await settled();
  await rendered(2);
  const before = await snapshot();
  // A tip, then the shut crates and where to tap
  const scan = (sats) => b.evaluate(`(() => { const B = window.__ooga; if (${sats}) B.demoTip(${sats}); return { crates: B.crates.length, landed: B.crates.filter((c) => !c.opened && c.node.visible && Math.abs(c.node.position.y) < 0.05).map((c) => { const p = B.project(c.node.position.x, c.node.position.y + 0.3, c.node.position.z); return p && { x: Math.round(p.x), y: Math.round(p.y) }; }).filter(Boolean) }; })()`);
  let tapped = 0;
  const openLanded = async (r) => {
    for (const c of r.landed) await b.click(c.x, c.y);
    tapped += r.landed.length;
  };
  const start = await b.evaluate("performance.now()");
  for (let i = 0; i < 60; i++) {
    await openLanded(await scan(i % 4 === 3 ? 120000 : 1200));
    await until(`performance.now() >= ${start + 250 * (i + 1)}`, 2000);
  }
  // The last crates land late and leave later
  let crates = -1;
  for (const t0 = Date.now(); crates && Date.now() - t0 < 15000;) {
    const r = await scan(0);
    crates = r.crates;
    await openLanded(r);
    await rendered(6);
  }
  // Capture the required quiet state in the same frame that observes it. A
  // working Ooga can legitimately begin its next finite build tween between
  // separate DevTools calls, which made the old final snapshot intermittent.
  const quietStats = await b.evaluate(`new Promise((resolve) => { const B = window.__ooga, start = performance.now(); const tick = () => { const stats = B.stats(); if (stats.particles === 0 && stats.pendingDrops === 0 && stats.deliveries === 0 && stats.tweens === 0) { B.trimPool(); B.housekeep(); resolve(B.stats()); } else if (performance.now() - start > 15000) resolve(null); else requestAnimationFrame(tick); }; tick(); })`);
  if (!quietStats) await b.evaluate("(() => { const B = window.__ooga; B.trimPool(); B.housekeep(); })()");
  const quiet = !!quietStats;
  const after = await snapshot(quietStats);
  const a = after.stats, s = before.stats;
  record(`soak: donations (${label}): every banana lands and transient pools return to zero`, quiet && crates === 0 && a.crates === 0 && a.particles === 0 && a.tweens === 0 && a.pendingDrops === 0 && a.deliveries === 0 && a.dropsStarted === a.dropsLanded && a.pool <= 32, `${tapped} crates tapped open · ${JSON.stringify({ crates: a.crates, particles: a.particles, pool: a.pool, tweens: a.tweens, drops: `${a.dropsLanded}/${a.dropsStarted}`, pending: a.pendingDrops, built: a.built, shown: await b.evaluate("window.__ooga.shown") })}`);
  record(`soak: donations (${label}): node and target counts back to base`, a.allNodes - a.pool - a.built === s.allNodes - s.pool - s.built && a.targets === s.targets, `allNodes ${s.allNodes} -> ${a.allNodes} (pool ${a.pool}, built ${a.built}), targets ${s.targets} -> ${a.targets}, dom ${s.dom} -> ${a.dom}, listeners ${before.listeners} -> ${after.listeners}`);
  record(`soak: donations (${label}): GPU records bounded`, a.gl.records - s.gl.records <= 20, `${s.gl.records} -> ${a.gl.records}`);
  record(`soak: donations (${label}): heap after GC within 15%`, within(before, after, 0.15), heapDetail(before, after));
}, opts);

// Blocks that measure frame rate or per-frame cost run first, one at a time, with the machine to themselves.
// The rest are independent (each has its own Chrome and profile) and run in parallel lanes, longest first.
// A block that reads what another one recorded names it in `after`.
const LANES = Number(process.env.LANES) || 6;
const tasks = [];
const task = (name, run, opts = {}) => tasks.push({ name, run, ...opts });
for (const backend of ["webgl2", "canvas2d"]) for (const scene of ["hub", "lab"]) {
  const label = `contributor likeness ${scene} ${backend}`, base = scene === "hub" ? src : dist;
  task(label, () => withPage(label, (scene === "hub" ? hubPage : page)(base, `loot=1${backend === "canvas2d" ? "&canvas2d=1" : ""}`), async (b) => {
    const r = await b.evaluate(`(${yellowLikenessProbe.toString()})()`);
    record(`${label}: YellowBrokeIt joins the eight-member crew with his face, shirt, cigarette and upright can`, r.roster === 8 && r.crew === 8 && r.state === "working" && r.traits && r.yellow && r.orange && r.cigarette && r.can && r.upright, JSON.stringify(r));
    record(`${label}: wardrobe refresh and gold reskin preserve the can and restore its default finish`, r.refreshed && r.gold && r.sameShape && r.restored, JSON.stringify(r));
  }));
}
for (const backend of ["webgl2", "canvas2d"]) task(`NPC paths ${backend}`, () => withPage(`NPC paths ${backend}`, hubPage(src, backend === "canvas2d" ? "canvas2d=1" : ""), async (b) => {
  const rows = await b.evaluate(`(${npcPathWalkingProbe.toString()})()`);
  record(`NPC paths ${backend}: prefer connected trails, pass other Oogas, replan changed paths and reach off-path fireplace seats`, rows.length === 5 && rows.slice(0, 4).every((r) => r.arrived && r.distance < 1e-6 && r.stable && r.maximumStep <= 1.7 / 30 + 1e-6 && r.count > 0) && rows[0].onPath > 0.95 && rows[1].onPath > 0.65 && rows[1].separation >= 0.68 && rows[2].changed && rows[2].replans > 0 && rows[3].onPath < 0.95, JSON.stringify(rows.slice(0, 4)));
  const recovery = rows[4];
  record(`NPC paths ${backend}: smooth ring walking stays on the midpoint without abrupt tile turns`, rows[0].midpointError < 0.05 && rows[0].maximumTurn < 0.1, JSON.stringify(rows[0]));
  record(`NPC paths ${backend}: blocked-trail recovery can jump onto its obstacle without path hints canceling flight`, recovery.recovered && recovery.jumps > 0 && recovery.intersections === 0 && recovery.stable && recovery.maximumStep <= 3 / 30 + 1e-6, JSON.stringify(recovery));
}));
for (const backend of ["webgl2", "canvas2d"]) task(`NPC centerlines ${backend}`, () => withPage(`NPC centerlines ${backend}`, hubPage(src, backend === "canvas2d" ? "canvas2d=1" : ""), async (b) => {
  const r = await b.evaluate(`(${npcCenterlineProbe.toString()})()`);
  record(`NPC centerlines ${backend}: every mapped branch connects and follows its unobstructed midpoint curve`, r.rows.length === r.lines && r.nodes < r.capacity && r.rows.every((row) => row.connected && row.arrived && row.distance < 1e-6 && row.onPath > 0.95 && row.error < 0.05), JSON.stringify(r));
}));
for (const backend of ["webgl2", "canvas2d"]) task(`NPC lower turns ${backend}`, () => withPage(`NPC lower turns ${backend}`, hubPage(src, backend === "canvas2d" ? "canvas2d=1" : ""), async (b) => {
  const rows = await b.evaluate(`(${npcLowerTurnsProbe.toString()})()`);
  record(`NPC lower turns ${backend}: every HQ and basement bed connects to both entrances in both directions with gradual turns and no rock collisions`, rows.length === 60 && rows.every((r) => r.arrived && r.collisions === 0 && r.maximumTurn < 0.4), JSON.stringify(rows));
}));
for (const backend of ["webgl2", "canvas2d"]) task(`NPC recovery ${backend}`, () => withPage(`NPC recovery ${backend}`, hubPage(src, backend === "canvas2d" ? "canvas2d=1" : ""), async (b) => {
  for (const dt of [1 / 20, 1 / 120]) {
    const rows = await b.evaluate(`(${npcRecoveryProbe.toString()})(${JSON.stringify({ dt })})`);
    record(`NPC recovery ${backend}: ${1 / dt}Hz walkers avoid narrow gaps, escape dead ends, jump clear and respect low ceilings`, rows.length === 5 && rows.every((r) => r.intersections === 0 && r.bounded && r.maximumWork <= 6 && (r.name === "no safe jump"
      ? !r.arrived && r.jumps === 0 && r.maximumFeet < 12.10001 && r.searches <= 12
      : r.arrived && r.distance < 1e-6 && r.maximumStep <= (r.name === "jump escape" ? 3 : 1.7) * dt + 1e-6 && (r.name === "jump escape" ? r.jumps > 0 && r.maximumFeet > 14.1 : r.maximumFeet < 12.10001 && (r.name === "narrow gap" || r.searches > 0 && r.minimumZ < -2.2)) && (r.name !== "changed recovery path" || r.changed && r.searches >= 2))), JSON.stringify(rows));
  }
}));
for (const backend of ["webgl2", "canvas2d"]) task(`tree clearance ${backend}`, () => withPage(`tree clearance ${backend}`, hubPage(backend === "webgl2" ? src : dist, backend === "canvas2d" ? "canvas2d=1" : ""), async (b) => {
  const r = await b.evaluate(`(${treeClearanceProbe.toString()})(${JSON.stringify({ dt: backend === "webgl2" ? 1 / 20 : 1 / 120 })})`);
  record(`tree clearance ${backend}: all four rendered canopies clear the tallest Ooga while rooted trunks remain solid`, r.backend === backend && r.variants.length === 4 && r.bodyHeight > 1.5 && r.variants.every((v) => v.bottom === 0 && v.top >= 4 && v.canopy >= 2.5 && v.canopy > r.bodyHeight && v.leaves > 50 && v.trunkSolid), JSON.stringify({ tallest: r.tallest, bodyHeight: r.bodyHeight, variants: r.variants }));
  record(`tree clearance ${backend}: all forty rotated roof trees are anchored and leave full body clearance above uphill terrain`, r.placements.length === 40 && r.placements.some((p) => p.active && p.visible) && r.placements.every((p) => p.active === p.visible && p.anchored && !p.rootBuried && p.headroom >= r.bodyHeight) && r.samples > 1000 && r.samples < 50000, JSON.stringify({ samples: r.samples, active: r.placements.filter((p) => p.active).length, uphill: r.placements.filter((p) => p.uphill > 0).length, minimumHeadroom: Math.min(...r.placements.map((p) => p.headroom)), failures: r.placements.filter((p) => !p.anchored || p.rootBuried || p.headroom < r.bodyHeight) }));
  const passed = (row) => row.clear && row.progress >= row.length - 0.02 && row.lateral < 0.02 && row.underCanopy > 0 && row.peakTwist < 1e-6;
  record(`tree clearance ${backend}: the tallest controlled Ooga walks straight beneath every canopy on flat ground`, r.rows.filter((row) => row.name.startsWith("flat")).length === 4 && r.rows.filter((row) => row.name.startsWith("flat")).every(passed), JSON.stringify(r.rows.filter((row) => row.name.startsWith("flat"))));
  const roof = r.rows.find((row) => row.name === "stepped cave roof");
  record(`tree clearance ${backend}: walking beneath a rotated tree across a real cave-roof step never traps or intersects the character`, !!r.roofLine && !!roof && passed(roof) && roof.maximumFeet - roof.minimumFeet >= 0.25 && r.attempts <= 640, JSON.stringify({ attempts: r.attempts, rejectedThreats: r.rejectedThreats, route: r.roofLine, roof }));
  const p = r.picking;
  record(`tree clearance ${backend}: the taller tree's highest leaves and roots are pickable through the live registry`, p.active && p.enclosesMesh && p.highestLeaf && p.root, JSON.stringify(p));
}));
for (const backend of ["webgl2", "canvas2d"]) task(`solid props ${backend}`, () => withPage(`solid props ${backend}`, hubPage(src, backend === "canvas2d" ? "canvas2d=1" : ""), async (b) => {
  const meshes = await b.evaluate(`(${solidPropsProbe.toString()})()`);
  record(`solid props ${backend}: actual prop meshes block bodies and support landings while preserving gate and aircraft openings`, meshes.length === 13 && meshes.every((row) => row.ok), JSON.stringify(meshes));
  for (const firstPerson of [false, true]) {
    const r = await b.evaluate(`(${solidCrewProbe.toString()})(${JSON.stringify({ firstPerson })})`), [npc, prop, propLoss, actor, actorLoss, side, overlap, npcActor, npcLanding, npcLoss] = r.rows;
    record(`solid props ${backend}: ${firstPerson ? "first" : "third"}-person landings, character collisions and NPC detours`, r.failures.length === 0 && [npc, npcActor].every((row) => row.arrived && row.distance < 0.1 && row.lateral > 0.5) && npc.intersections === 0 && npcActor.minimumSeparation >= 0.68 && [prop, actor, npcLanding].every((row) => row.grounded && row.upward < 1e-5 && Math.abs(row.feet - row.expected) < 1e-5) && [prop, actor].every((row) => row.held < 1e-5) && [propLoss, actorLoss, npcLoss].every((row) => row.airborne && row.velocity < 0 && Math.abs(row.drop - row.expected) < 1e-5) && side.separation >= 0.68 && side.finalZ > 0.2, JSON.stringify(r));
    record(`solid props ${backend}: an overlapping spawn can separate without walking farther through another character`, Math.abs(overlap.inward) < 1e-7 && overlap.separation > 0.68, JSON.stringify(overlap));
  }
  const sleeping = await b.evaluate(`(${sleepingSolidProbe.toString()})()`);
  record(`solid props ${backend}: a sleeping character blocks passage and supports a landing on its actual lying bounds`, sleeping.admitted && sleeping.mode === "rest" && sleeping.reserved && !sleeping.across && Math.abs(sleeping.top - sleeping.expected) < 1e-6, JSON.stringify(sleeping));
}));
for (const backend of ["webgl2", "canvas2d"]) task(`character carry ${backend}`, () => withPage(`character carry ${backend}`, hubPage(backend === "webgl2" ? src : dist, backend === "canvas2d" ? "canvas2d=1" : ""), async (b) => {
  const result = await b.evaluate(`(${characterCarryProbe.toString()})(${JSON.stringify({ dt: backend === "webgl2" ? 1 / 20 : 1 / 120 })})`);
  for (const row of result.rows) record(`character carry ${backend}: ${row.name}`, row.ok, JSON.stringify(row));
}));
for (const backend of ["webgl2", "canvas2d"]) for (const firstPerson of [false, true]) {
  const name = `shoulder passing ${backend} ${firstPerson ? "first" : "third"}`;
  task(name, () => withPage(name, hubPage(src, backend === "canvas2d" ? "canvas2d=1" : ""), async (b) => {
    const r = await b.evaluate(`(${shoulderPassProbe.toString()})(${JSON.stringify({ dt: backend === "webgl2" ? 1 / 20 : 1 / 120, firstPerson })})`);
    const safe = (row, speed) => row.clear && row.grounded && row.minimumGap >= 0.68 - 1e-7 && row.maximumStep <= speed * r.dt + 1e-7 && row.headError < 1e-6 && row.originalHeadError < 1e-6;
    const [center, right, left, grazeRight, grazeLeft, clear] = r.stationary;
    record(`${name}: only movers turn the contacted shoulder back and return to their original line`, r.stationary.length === 6 && r.stationary.every((row) => safe(row, 7.75) && row.passed && row.lineError < 0.006 && row.finalYaw < 0.001 && row.stationaryTravel === 0 && row.stationaryYaw === 0) && r.stationary.slice(0, 5).every((row) => row.pullback > 0 && row.oppositeForward > 0) && center.side === 1 && center.signedDeflection < 0 && right.side === 1 && right.signedDeflection < 0 && left.side === -1 && left.signedDeflection > 0, JSON.stringify(r.stationary));
    record(`${name}: twist and diversion scale with overlap and mirror correctly`, center.peakYaw > right.peakYaw && right.peakYaw > grazeRight.peakYaw && grazeRight.peakYaw > 0 && clear.peakYaw === 0 && center.lateral > right.lateral && right.lateral > grazeRight.lateral && grazeRight.lateral > 0 && clear.lateral === 0 && Math.abs(right.peakYaw - left.peakYaw) < 1e-6 && Math.abs(right.lateral - left.lateral) < 1e-6 && Math.abs(grazeRight.peakYaw - grazeLeft.peakYaw) < 1e-6 && Math.abs(grazeRight.lateral - grazeLeft.lateral) < 1e-6, JSON.stringify(r.stationary));
    const [pair, offset] = r.pairs;
    record(`${name}: opposing walkers both yield with stable heads, retain goals, and arrive without overlap`, r.pairs.length === 3 && r.pairs.every((row) => row.arrived && row.goalsPreserved && row.aError < 1e-6 && row.bError < 1e-6 && safe(row.left, row.aSpeed) && safe(row.right, row.bSpeed)) && pair.left.side === 1 && pair.right.side === 1 && pair.left.signedDeflection < 0 && pair.right.signedDeflection > 0 && pair.left.pullback > 0 && pair.right.pullback > 0 && pair.left.oppositeForward > 0 && pair.right.oppositeForward > 0 && pair.left.peakYaw > offset.left.peakYaw, JSON.stringify(r.pairs));
    const overtake = r.pairs[2];
    record(`${name}: overtaking turns the trailing shoulder back and the moving leader's contacted shoulder forward`, overtake.left.pullback > 0 && overtake.left.oppositeForward > 0 && overtake.right.rearPeakYaw > 0.05 && overtake.right.rearPullback < 0 && overtake.right.rearOppositeForward < 0 && overtake.right.rearAlong < -0.05, JSON.stringify(overtake));
    record(`${name}: releasing input stops translation and confined passes respect walls`, r.release.activeBeforeStop && r.release.resumed && r.release.drift < 1e-9 && r.release.lineError < 0.006 && r.release.finalYaw < 0.001 && r.walls.length === 2 && r.walls.every((row) => safe(row, 7.75) && row.finalZ < 0), JSON.stringify({ release: r.release, walls: r.walls }));
  }));
}
for (const backend of ["webgl2", "canvas2d"]) for (const firstPerson of [false, true]) {
  const name = `shoulder props ${backend} ${firstPerson ? "first" : "third"}`;
  task(name, () => withPage(name, hubPage(src, backend === "canvas2d" ? "canvas2d=1" : ""), async (b) => {
    const r = await b.evaluate(`(${shoulderPropsProbe.toString()})(${JSON.stringify({ dt: backend === "webgl2" ? 1 / 20 : 1 / 120, firstPerson })})`);
    const blocking = r.rows.filter((row) => !row.control), controls = r.rows.filter((row) => row.control);
    record(`${name}: players and NPCs shoulder past real trunks, rocks, barrels and rotated props without entering or climbing them`, r.rows.length === 22 && r.benchFaces > 0 && blocking.every((row) => row.blocked && row.clear && row.arrived && row.goalPreserved && row.lineError < 0.006 && row.targetError < 1e-6 && row.maximumStep <= (row.mode === "player" ? 7.75 : 1.7) * r.dt + 1e-7 && row.maximumLift < 1e-6 && row.originalHeadError < 1e-6 && row.pullback > 0 && row.oppositeForward > 0 && row.finalYaw < 0.001), JSON.stringify(blocking));
    for (const mode of ["player", "npc"]) {
      const [center, left, right, grazeLeft, grazeRight] = r.rows.filter((row) => row.name === "tree" && row.mode === mode);
      record(`${name}: ${mode} trunk contacts use the nearest shoulder and scale to the overlap`, center.side === 1 && center.deflection < 0 && left.side === 1 && left.deflection < 0 && right.side === -1 && right.deflection > 0 && center.peakYaw > left.peakYaw && center.peakYaw > right.peakYaw && left.peakYaw > grazeLeft.peakYaw && right.peakYaw > grazeRight.peakYaw && center.lateral > left.lateral && center.lateral > right.lateral && left.lateral > grazeLeft.lateral && right.lateral > grazeRight.lateral, JSON.stringify([center, left, right, grazeLeft, grazeRight]));
    }
    record(`${name}: arch openings, low benches and climbable steps preserve straight walking`, controls.length === 6 && controls.every((row) => !row.blocked && row.clear && row.arrived && row.peakYaw === 0 && row.lateral < 1e-6), JSON.stringify(controls));
    record(`${name}: architecture contact queries preserve existing collisions and release removed objects`, r.sensor.hit && r.sensor.collisionUnchanged && r.sensor.supportUnchanged && r.sensor.removed, JSON.stringify(r.sensor));
    record(`${name}: removing an obstacle mid-pass immediately restores the original walking line`, r.removal.activeBefore && r.removal.childStillParented && r.removal.released && r.removal.passed && r.removal.outwardDrift < 1e-9 && r.removal.lineError < 0.006, JSON.stringify(r.removal));
  }));
}
for (const backend of ["webgl2", "canvas2d"]) task(`banana interior ${backend}`, () => withPage(`banana interior ${backend}`, hubPage(src, backend === "canvas2d" ? "canvas2d=1" : ""), async (b) => {
  const r = await b.evaluate(`(${bananaInteriorProbe.toString()})()`);
  record(`banana interior ${backend}: soft yellow near-plane cover and body outlines match the actual heap`, r.inside.coverage === 1 && r.inside.yellow > 100000 && r.inside.bodyPixels > 100 && r.third.outline > 100 && r.partial.partial && r.partial.coverage > 0 && r.partial.coverage < 1 && r.exposed.outline > 0 && r.exposed.visibleOutlinePixels === 0 && r.empty.coverage === 0 && r.empty.outline === 0 && r.mesh.checked > 100 && r.mesh.mismatch === 0 && r.rayHidden && r.rayClear, JSON.stringify(r));
  const actual = await b.evaluate(`(${bananaSceneInteriorProbe.toString()})()`);
  record(`banana interior ${backend}: the selected Ooga stands on the platform inside fruit and sees its body when looking down`, actual.third.outlined && actual.first.outlined && actual.first.inside && actual.first.coverage === 1 && actual.first.hiddenHead && actual.first.closeMix === 1 && actual.first.bodyPixels > 0 && [actual.third, actual.first].every((row) => Math.abs(row.feet - 0.34) < 1e-5), JSON.stringify(actual));
  record(`banana interior ${backend}: walking enters the heap and falling passes through fruit to the stone platform`, actual.walking.end < 0.1 && actual.walking.inFruit && actual.walking.maxFeet <= 0.34 + 1e-5 && Math.abs(actual.walking.feet - 0.34) < 1e-5 && actual.falling.passedThrough && !actual.falling.landedOnFruit && Math.abs(actual.falling.feet - 0.34) < 1e-5 && actual.falling.velocity === 0, JSON.stringify({ walking: actual.walking, falling: actual.falling }));
}));
for (const backend of ["webgl2", "canvas2d"]) task(`banana lighting and guides ${backend}`, () => withPage(`banana lighting and guides ${backend}`, hubPage(src, backend === "canvas2d" ? "canvas2d=1" : ""), async (b) => {
  const lighting = await b.evaluate(`(${bananaLightingProbe.toString()})()`), [noon, dusk, night, repeat] = lighting.rows;
  record(`banana lighting ${backend}: the stationary interior follows live daylight and restores the same noon color`, lighting.backend === backend && lighting.rows.every((row) => row.coverage === 1 && row.filled === lighting.pixels && row.rgb[0] > row.rgb[2] && row.rgb[1] > row.rgb[2]) && noon.luminance > dusk.luminance && dusk.luminance > night.luminance && night.luminance < noon.luminance * 0.5 && noon.hash === repeat.hash, JSON.stringify(lighting));
  const clipping = await b.evaluate(`(${bananaGuideClippingProbe.toString()})()`), [inside, partial, first] = clipping.rows;
  record(`banana guides ${backend}: nearby perceived objects receive cap-clipped contours without leaking into clear pixels`, inside.coverage === 1 && inside.changes > 0 && partial.partial && partial.coverage > 0 && partial.coverage < 1 && partial.changes > 0 && clipping.rows.every((row) => row.clearChanges === 0) && [inside, partial, first].every((row) => row.owners.slice(0, 2).every((owner) => owner.perceived && owner.alpha > 0) && row.owners.slice(2).every((owner) => !owner.perceived && owner.alpha === 0)) && first.changes > 0 && first.count > 0, JSON.stringify(clipping));
  const scene = await b.evaluate(`(${bananaSceneGuidesProbe.toString()})()`), [fullScene, partialScene, firstScene, wallScene, restoredScene, outsideScene] = scene.rows;
  record(`banana guides ${backend}: both camera views show nearby cues inside fruit, while real walls and the platform remain opaque`, [fullScene, partialScene].every((row) => !row.actorInPile && row.enabled && row.guideLines > 0 && row.eligible.every(Boolean)) && fullScene.coverage === 1 && partialScene.partial && [firstScene, restoredScene].every((row) => row.firstPerson && row.actorInPile && row.cameraInPile && row.enabled && row.guideLines > 0 && row.eligible.every(Boolean) && row.platformBlocks) && !wallScene.eligible[0] && wallScene.eligible[1] && outsideScene.firstPerson && !outsideScene.actorInPile && !outsideScene.enabled && outsideScene.guideLines === 0, JSON.stringify(scene));
  const perception = await b.evaluate(`(${bananaPerceptionProbe.toString()})()`), expected = [false, true, true, false, true, false];
  record(`banana guides ${backend}: immersion bypasses only fruit for actor rays and invalidates visibility on exit`, perception.rows.length === 6 && perception.rows.every((row, i) => row.perceived === expected[i] && row.repeated === expected[i] && row.actorClear === expected[i] && !row.cameraClear && !row.ordinaryClear && !row.platformClear && row.cached) && perception.rows[1].version > perception.rows[0].version && perception.rows[2].version === perception.rows[1].version && perception.rows[5].version > perception.rows[4].version, JSON.stringify(perception));
}));
for (const backend of ["webgl2", "canvas2d"]) task(`banana dawn shadows ${backend}`, () => withPage(`banana dawn shadows ${backend}`, hubPage(src, backend === "canvas2d" ? "canvas2d=1" : ""), async (b) => {
  const r = await b.evaluate(`(${bananaDawnShadowProbe.toString()})()`), noon = r.rows.at(-1).samples;
  record(`banana dawn shadows ${backend}: the interior honors exterior shadowing without brightening early and restores when the shadow clears`, r.rows.every(({ sunAltitude, samples: [clear, shaded, restored] }) => [clear, shaded, restored].every((s) => s.coverage === 1) && Math.abs(clear.luminance - restored.luminance) < 0.1 && shaded.luminance <= clear.luminance + 0.1 && (backend === "canvas2d" ? shaded.shadowed === 0 && Math.abs(clear.luminance - shaded.luminance) < 0.1 : shaded.shadowed === (sunAltitude > 0 ? 9 : 0))) && (backend === "canvas2d" || r.rows[1].samples[0].shadowed === 9 && noon[0].shadowed === 0 && noon[0].luminance > noon[1].luminance * 1.2), JSON.stringify(r));
}));
for (const backend of ["webgl2", "canvas2d"]) task(`banana movement ${backend}`, () => withPage(`banana movement ${backend}`, hubPage(src, backend === "canvas2d" ? "canvas2d=1" : ""), async (b) => {
  for (const firstPerson of [false, true]) {
    const r = await b.evaluate(`(${bananaMovementProbe.toString()})(${JSON.stringify({ firstPerson })})`);
    const [outside, inside, above, jump, outsideJump, groundJet, airJet, heldExit, freshExit] = r.rows;
    record(`banana movement ${backend}: ${firstPerson ? "first" : "third"}-person walking slows exactly 50% only within fruit`, outside.speed > 0 && Math.abs(inside.speed / outside.speed - 0.5) < 1e-6 && Math.abs(above.speed / outside.speed - 1) < 1e-6 && inside.before.inside && inside.after.inside && !above.before.inside && !above.after.inside && r.mode === (firstPerson ? "first-person" : "trailing"), JSON.stringify(r.rows.slice(0, 3)));
    record(`banana movement ${backend}: ${firstPerson ? "first" : "third"}-person fresh presses repeat jumps inside fruit and keep the two-jump limit outside`, jump.held.hop > 0 && jump.held.jumps === 1 && jump.fresh.jumps === 2 && jump.third.jumps === 3 && jump.third.velocity > 0 && jump.landed.jumps === 0 && jump.renewed.jumps === 1 && outsideJump.hop > 0 && outsideJump.velocity > 0 && outsideJump.jumps === 1 && outsideJump.double.jumps === 2 && outsideJump.limited.jumps === 2 && outsideJump.limited.velocity < outsideJump.double.velocity, JSON.stringify({ jump, outsideJump }));
    const escapes = r.rows.filter((row) => row.name === "top-escape");
    record(`banana movement ${backend}: ${firstPerson ? "first" : "third"}-person repeated jumps escape the top even at the largest pile and stop boosting outside`, escapes.length === 2 && escapes.every((row) => row.crossed && row.presses > 2 && row.escaped.jumps > 2 && row.limited && row.outsidePress.velocity < row.escaped.velocity), JSON.stringify(escapes));
    record(`banana movement ${backend}: ${firstPerson ? "first" : "third"}-person jetpack stays equipped with normal thrust, sparks and fuel use inside`, groundJet.samePack && groundJet.equipped && groundJet.hop > 0 && groundJet.thrust && groundJet.flame && groundJet.spending && groundJet.fuel < groundJet.startFuel && airJet.samePack && airJet.after.equipped && airJet.after.thrust && airJet.after.flame && airJet.after.spending && airJet.after.velocity > 0 && airJet.after.y > airJet.before.y && airJet.after.fuel < airJet.before.fuel, JSON.stringify({ groundJet, airJet }));
    record(`banana movement ${backend}: ${firstPerson ? "first" : "third"}-person held thrust and fresh launches resume after leaving`, [heldExit, freshExit].every((row) => row.samePack && row.equipped && !row.inside && row.thrust && row.flame && row.spending && row.hop > 0 && row.velocity > 0) && freshExit.fuel < heldExit.fuel, JSON.stringify({ heldExit, freshExit }));
    const rises = r.rows.filter((row) => row.name === "rise");
    record(`banana movement ${backend}: ${firstPerson ? "first" : "third"}-person upward movement is exactly half speed inside with normal fuel use`, rises.length === 2 && rises.every(({ rises: [outside, inside] }) => outside.rise > 0 && Math.abs(inside.rise / outside.rise - 0.5) < 1e-6 && outside.after.velocity === inside.after.velocity && Math.abs((outside.before.fuel - outside.after.fuel) - (inside.before.fuel - inside.after.fuel)) < 1e-9), JSON.stringify(rises));
    const falls = r.rows.filter((row) => row.name === "fall");
    record(`banana movement ${backend}: ${firstPerson ? "first" : "third"}-person falls slow exactly 50% inside fruit with or without a jetpack`, falls.length === 2 && falls.every(({ equipped, falls: [outside, inside] }) => outside.drop > 0 && Math.abs(inside.drop / outside.drop - 0.5) < 1e-6 && outside.after.velocity === inside.after.velocity && inside.after.equipped === equipped && inside.before.inside && !outside.before.inside), JSON.stringify(falls));
  }
  const npc = await b.evaluate(`(${bananaNpcMovementProbe.toString()})()`);
  record(`banana movement ${backend}: autonomous routes avoid the platform rim and trapped walkers can leave at half speed`, npc.detour.arrived && npc.detour.entries === 0 && npc.detour.minimumRadius >= npc.detour.platformRadius + 0.3 - 1e-6 && npc.detour.lateral > 1 && npc.detour.distance < 1e-6 && npc.escape.stillInside && Math.abs(npc.escape.insideSpeed - 1) < 1e-6 && npc.escape.arrived && npc.escape.outside && npc.escape.distance < 1e-6, JSON.stringify(npc));
  const growth = npc.growth;
  record(`banana movement ${backend}: a growing pile cannot leave a walker circling a buried destination`, growth.initiallyClear && growth.coveredAfterGrowth && growth.sourceOutside && growth.preservedBeforeStep && growth.retargeted && growth.targetClear && growth.entries === 0 && growth.moved > 0.1, JSON.stringify(growth));
}));
for (const backend of ["webgl2", "canvas2d"]) task(`banana spill ${backend}`, () => withPage(`banana spill ${backend}`, hubPage(src, backend === "canvas2d" ? "canvas2d=1" : ""), async (b) => {
  const effect = await b.evaluate(`(${bananaSpillProbe.toString()})(${JSON.stringify(backend)})`);
  for (const row of effect.rows) record(`banana spill ${backend}: ${row.name}`, row.ok, JSON.stringify(row));
  const exits = await b.evaluate(`(${bananaExitProbe.toString()})()`);
  record(`banana spill ${backend}: continuous player and NPC exits emit once while relocation and resizing emit nothing`, exits.rows.every((row) => ["side", "top", "npc"].includes(row.name) ? row.crossed && row.bursts === 1 : row.bursts === 0), JSON.stringify(exits));
  const side = exits.rows.find((row) => row.name === "side").fruit, top = exits.rows.find((row) => row.name === "top").fruit;
  record(`banana spill ${backend}: side exits scatter fruit from feet to head and top exits shed it at the feet`, side.min < side.feet + side.bodyHeight * 0.2 && side.max > side.feet + side.bodyHeight * 0.85 && side.max <= side.feet + side.bodyHeight + 0.04 + 1e-5 && Math.abs(top.min - top.feet - 0.04) < 1e-5 && Math.abs(top.max - top.min) < 1e-5, JSON.stringify({ side, top }));
}));
for (const backend of ["webgl2", "canvas2d"]) task(`banana platform ${backend}`, () => withPage(`banana platform ${backend}`, hubPage(src, backend === "canvas2d" ? "canvas2d=1" : ""), async (b) => {
  const r = await b.evaluate(`(${bananaPlatformInteriorProbe.toString()})()`), stone = r.rows.find((row) => row.y === 0.17), fruit = r.rows.at(-1);
  record(`banana platform ${backend}: ground, stone platform and fruit interiors join without transparent gaps`, r.backend === backend && r.closeMix === 0 && r.rows.every((row) => row.gaps === 0) && stone.rock === 1 && stone.fruit === 0 && Math.max(...stone.rgb) - Math.min(...stone.rgb) < 15 && fruit.fruit === 1 && fruit.rgb[0] > fruit.rgb[2] * 2 && fruit.rgb[1] > fruit.rgb[2] * 2, JSON.stringify(r));
}));
for (const backend of ["webgl2", "canvas2d"]) task(`banana slots ${backend}`, () => withPage(`banana slots ${backend}`, hubPage(src, backend === "canvas2d" ? "canvas2d=1" : ""), async (b) => {
  const r = await b.evaluate(`(${bananaSlotProbe.toString()})()`);
  record(`banana slots ${backend}: approaching Oogas select the nearest free slot and retarget around players, NPCs and reservations`, r.initial && r.playerRetarget && r.npcRetarget && r.bedReturn && r.reserved && r.slots >= 3, JSON.stringify(r));
  record(`banana slots ${backend}: growth adds spaced destinations around the heap and shrinking releases the extras`, r.growth.every((row) => row.clear && row.separation >= 0.68 && row.count <= 128) && r.growth.slice(1, 4).every((row, i) => row.count > r.growth[i].count) && r.growth[4].count === r.growth[0].count, JSON.stringify(r.growth));
}));
for (const backend of ["webgl2", "canvas2d"]) task(`banana glyph interiors ${backend}`, () => withPage(`banana glyph interiors ${backend}`, hubPage(src, backend === "canvas2d" ? "canvas2d=1" : ""), async (b) => {
  const r = await b.evaluate(`(${bananaGlyphInteriorProbe.toString()})()`);
  record(`banana glyph interiors ${backend}: stone platform and fruit convert only when reached by the glyph wave, animate and restore`, [0.17, 0.5].every((y) => {
    const [normal, unreached, partial, glyph, animated, restored] = r.rows.filter((row) => row.y === y);
    return !normal.glyph && !unreached.glyph && normal.hash === unreached.hash && partial.glyph && partial.min > 0 && partial.max < 1 && glyph.glyph && glyph.min === 1 && glyph.max === 1 && glyph.green > 100 && glyph.dark > 100 && animated.glyph && animated.hash !== glyph.hash && !restored.glyph && restored.hash === normal.hash;
  }), JSON.stringify(r));
}));
for (const level of [0, 1000, 1000000, 10000000]) task(`solid pile spawn ${level}`, () => withPage(`solid pile spawn ${level}`, hubPage(src, `bananas=${level}`), async (b) => {
  const r = await b.evaluate(`(${crewBootRadiusProbe.toString()})()`);
  record(`solid pile spawn ${level}: crew loads around the actual pile without first walking out of it`, r.rows.length > 0 && r.rows.every((row) => !row.walking && Math.abs(row.radius - row.slot) < 0.02 && row.radius > r.platformRadius && Math.abs(row.radius - r.pileEdge - 1.1) < 0.005), JSON.stringify(r));
}));
task("room LifeHash", () => withPage("room LifeHash", hubPage(src), async (b) => {
  const r = await b.evaluate(`(${lifehashProbe.toString()})()`);
  record("room LifeHash: exact v2 images match independent reference vectors, including UTF-8 and coordinate domains", r.vectors === 14 && r.referenceMatches === 14 && r.shapeMatches === 14 && r.repeatMatches === 14 && r.unique === 14 && r.failures.length === 0, JSON.stringify(r));
}));
for (const backend of ["webgl2", "canvas2d"]) task(`jumbotron ${backend}`, () => withPage(`jumbotron ${backend}`, hubPage(src, backend === "canvas2d" ? "canvas2d=1" : ""), async (b) => {
  const r = await b.evaluate(`(${jumbotronProbe.toString()})()`);
  record(`jumbotron ${backend}: the board is solid on the north rim, facing the meadow with public stats parsed and guarded`, r.exists && r.placement.onNorthRim && r.placement.aboveGround && r.placement.facesCenter && r.placement.scale > 1 && r.placement.solid && r.data.contributors > 0 && r.data.schemaGuard && r.data.noPersonalMetadata && r.data.anonymousLabel, JSON.stringify({ placement: r.placement, data: r.data }));
  record(`jumbotron ${backend}: view changes rebuild the screen quads and pokes select contributors by handle or roster alias`, r.initial.view === "totals" && r.initial.screenFaces > 200 && r.initial.cabinetFaces === 84 && r.leaderboard.view === "leaderboard" && r.leaderboard.changed && r.poked.accepted && r.poked.view === "contributor" && r.poked.login === "portlandhodl" && r.alias.accepted && r.alias.login === "ottoz0r" && r.alias.caseInsensitive && r.pokeUnknown === false && r.advanced.drew, JSON.stringify({ initial: r.initial, leaderboard: r.leaderboard, poked: r.poked, alias: r.alias, advanced: r.advanced }));
  // The board stands above the default framing; walk the camera up to it
  // the way a visitor would before tapping.
  await b.evaluate(`window.__ooga.pilot.navigate({ position: { x: -7, y: 8.3, z: -27 }, target: { x: -7, y: 8.3, z: -27 }, yaw: -0.25, pitch: 0.05, dist: 14 })`);
  await b.sleep(2500);
  const tap = await b.evaluate(`(() => { const B = window.__ooga, j = B.jumbotron, w = j.node.world, c = document.querySelector("canvas"); const p = B.project(w[12], w[13], w[14]); const inView = p && p.x > 0 && p.x < c.clientWidth && p.y > 0 && p.y < c.clientHeight; const hit = inView && B.input.pick(p.x, p.y); return hit && hit.owner.kind === "prop" && hit.owner.prop === "jumbotron" ? { x: p.x, y: p.y, view: JSON.stringify(j.view) } : null; })()`);
  if (tap) {
    await b.click(tap.x, tap.y);
    await b.sleep(300);
  }
  record(`jumbotron ${backend}: tapping the board advances the view`, !!tap && (await b.evaluate("JSON.stringify(window.__ooga.jumbotron.view)")) !== tap.view, JSON.stringify(tap));
  const ticker = await b.evaluate(`(() => { const B = window.__ooga, j = B.jumbotron, scene = window.BL.scenes.hub; j.autoRotate(0); j.setView("ticker"); j.update(0, B.renderer); B.renderer.render(scene.root, scene.camera, B.renderOpts); const before = B.renderer.stats.records; let maximum = before, changed = false, previous = j.node.children[0].geometry; for (let i = 1; i <= 12; i++) { j.update(i * 0.25, B.renderer); changed ||= j.node.children[0].geometry !== previous; previous = j.node.children[0].geometry; B.renderer.render(scene.root, scene.camera, B.renderOpts); maximum = Math.max(maximum, B.renderer.stats.records); } window.__jumbotronLeaving = j.node; return { before, maximum, changed }; })()`);
  record(`jumbotron ${backend}: scrolling replaces its screen without retaining GPU records`, ticker.changed && ticker.maximum === ticker.before, JSON.stringify(ticker));
  await b.evaluate('window.__ooga.go("lab")');
  const left = await untilPage(b, 'B.scene === "lab" && !B.transitioning');
  const disposed = await b.evaluate('(() => { const node = window.__jumbotronLeaving; const cleared = !node.parent && node.geometry === null && node.children[0].geometry === null && !window.__ooga.jumbotron; delete window.__jumbotronLeaving; return cleared; })()');
  await b.evaluate('window.__ooga.go("hub")');
  const returned = await untilPage(b, 'B.scene === "hub" && !B.transitioning && B.jumbotron.node.children[0].geometry !== null');
  record(`jumbotron ${backend}: leaving releases the board and its screen, and returning rebuilds them`, left && disposed && returned, JSON.stringify({ left, disposed, returned }));
}));
task("room mattresses webgl2", () => roomMattresses("webgl2"));
task("room mattresses canvas2d", () => roomMattresses("canvas2d"));
task("room sleeping webgl2", () => roomSleeping("webgl2"));
task("room sleeping canvas2d", () => roomSleeping("canvas2d"));
for (const backend of ["webgl2", "canvas2d"]) task(`room sleep visibility ${backend}`, () => withPage(`room sleep visibility ${backend}`, hubPage(src, backend === "canvas2d" ? "canvas2d=1" : ""), async (b) => {
  const r = await b.evaluate(`(${sleepVisibilityProbe.toString()})()`), cases = r.rows.flatMap((row) => row.cases);
  record(`room sleep visibility ${backend}: sleep marks appear through visible rooms and apertures but stay hidden behind rock and outside the view`, r.rows.length === 15 && r.rows.every((row) => row.started && row.woke) && cases.length === 105 && cases.every((c) => !!c.drawn === c.expected && (c.projectionOnly || c.visible === c.expected)), JSON.stringify(r));
  record(`room sleep visibility ${backend}: a visible aperture reveals sleep marks even when its occupant is behind the room wall`, cases.some((c) => ["doorway", "window"].includes(c.name) && c.headBlocked && c.visible && c.drawn > 0));
}));
for (const backend of ["webgl2", "canvas2d"]) task(`room bed camera ${backend}`, () => withPage(`room bed camera ${backend}`, hubPage(src, backend === "canvas2d" ? "canvas2d=1" : ""), async (b) => {
  const r = await b.evaluate(`(${bedCameraProbe.toString()})()`);
  record(`room bed camera ${backend}: every room allows sleeping poses, orbiting, waking and walking off with physical first-person views`, r.rows.length === 30 && r.rows.every((row) => row.reached && row.standing && row.label === "SLEEP" && row.sleeping && row.woke && row.exited) && r.checks > 6800 && r.physicalChecks > 3400 && r.rawChecks > 3400 && r.failures.length === 0, JSON.stringify(r));
  record(`room bed camera ${backend}: scrolling into and out of first person preserves sleep and the selected trailing distance`, r.scrolls.length === 2 && r.scrolls.every((row) => row.firstPerson && row.trailing && row.sleeping && row.chosen === 6 && Math.abs(row.actual - row.chosen) < 1e-5) && r.failures.length === 0, JSON.stringify(r.scrolls));
}));
for (const backend of ["webgl2", "canvas2d"]) task(`camera distance ${backend}`, () => withPage(`camera distance ${backend}`, hubPage(src, backend === "canvas2d" ? "canvas2d=1" : ""), async (b) => {
  for (const [i, fixture] of [{ dt: 1 / 20, basement: false }, { dt: 1 / 20, basement: true }, { dt: 1 / 120, basement: false }, { dt: 1 / 120, basement: true }].entries()) {
    if (i) { await b.open(hubPage(src, backend === "canvas2d" ? "canvas2d=1" : "")); await untilReady(b); }
    const r = await b.evaluate(`(${cameraDistanceProbe.toString()})(${JSON.stringify(fixture)})`);
    record(`camera distance ${backend}: ${fixture.basement ? "basement" : "HQ"} ${Math.round(1 / fixture.dt)} Hz preserves the chosen eye distance when rock hides the moving Ooga`, r.backend === backend && r.rows.length === 1 && r.rows.every((row) => row.hidden === row.samples && row.samples > 20 && row.movement > 0.5 && row.maxDistanceError < 1e-5 && row.maxRequestedError < 1e-5 && row.chosen === row.dist && row.actual === row.dist && row.maxEyeStep < 0.6) && r.failures.length === 0, JSON.stringify(r));
    if (fixture.basement) record(`camera distance ${backend}: ${Math.round(1 / fixture.dt)} Hz preserves the selected orbit throughout the actual basement descent`, r.stagingReached && r.rampSamples >= 30 && r.rampRequestedError < 1e-5 && r.rampDistanceError < 1e-5 && r.failures.length === 0, JSON.stringify({ reached: r.stagingReached, samples: r.rampSamples, occlusions: r.rampOcclusions, requestedError: r.rampRequestedError, distanceError: r.rampDistanceError, failures: r.failures }));
  }
}));
for (const backend of ["webgl2", "canvas2d"]) task(`camera pitch ${backend}`, () => withPage(`camera pitch ${backend}`, hubPage(src, backend === "canvas2d" ? "canvas2d=1" : ""), async (b) => {
  const r = await b.evaluate(`(${cameraPitchProbe.toString()})()`), [floor, overhead, level, ceiling, room] = r.rows;
  record(`camera pitch ${backend}: explicit trailing input reaches both vertical limits with the exact chosen pose and finite views`, floor.chosen < -1.56 && floor.eye.y < floor.feet - 5 && overhead.chosen > 1.56 && overhead.radial < 0.005 && overhead.eye.y - overhead.feet > 6.5 && [floor, overhead].every((row) => Math.abs(row.viewPitch - row.chosen) < 1e-6 && row.requestedError < 1e-5 && Math.abs(row.actualDistance - row.chosenDistance) < 1e-5) && r.samples > 250 && r.failures.length === 0 && r.backend === backend, JSON.stringify(r));
  record(`camera pitch ${backend}: room rock does not alter the selected trailing pose and returning to a level view preserves movement`, ceiling.chosen > 1.56 && Math.abs(ceiling.viewPitch - ceiling.chosen) < 1e-6 && ceiling.throughRock && ceiling.eye.y - ceiling.feet > 6.5 && ceiling.distance === 6 && ceiling.chosenDistance === 6 && r.rows.every((row) => row.requestedError < 1e-5 && Math.abs(row.actualDistance - row.chosenDistance) < 1e-5) && [level, room].every((row) => row.chosen === 0 && row.viewPitch === 0 && row.mode === "trailing" && row.selected) && r.movement > 1 && r.failures.length === 0, JSON.stringify({ ceiling, level, room, movement: r.movement, failures: r.failures }));
}));
for (const backend of ["webgl2", "canvas2d"]) task(`mirror opening visibility ${backend}`, () => withPage(`mirror opening visibility ${backend}`, hubPage(src, backend === "canvas2d" ? "canvas2d=1" : ""), async (b) => {
  const r = await b.evaluate(`(${mirrorOpeningVisibilityProbe.toString()})()`);
  record(`mirror opening visibility ${backend}: looking directly through the open entrance suppresses every outline, while rock still hides the character from the side`, r.backend === backend && r.views.length === 5 && r.views.every((row) => row.inside && row.reveal === 1) && r.views.filter((row) => row.x !== 9).every((row) => !row.enabled && !row.outlined && row.lines === 0 && row.wallFaces === 0 && row.providers === 0) && r.views[3].enabled && r.views[3].outlined, JSON.stringify(r.views));
  record(`mirror opening visibility ${backend}: opening and closing invalidate stationary occlusion caches and follow the actual remaining mirror strip`, r.steps.length === 7 && r.steps.every((row, i, rows) => (!i || row.version > rows[i - 1].version) && row.actorVisible === (row.reveal >= 0.5) && row.lowClear === (row.reveal >= 0.5) && row.highClear === (row.reveal === 1)), JSON.stringify(r.steps));
}));
for (const backend of ["webgl2", "canvas2d"]) task(`matrix living distance ${backend}`, () => withPage(`matrix living distance ${backend}`, hubPage(src, backend === "canvas2d" ? "canvas2d=1" : ""), async (b) => {
  const r = await b.evaluate(`(${matrixLivingDistanceProbe.toString()})(${JSON.stringify(backend)})`);
  record(`matrix living distance ${backend}: distant living characters retain their glow through the outer cloud wave and lose it again when the effect ends`, r.backend === backend && r.far.length === 2 && r.far.every((row) => row.reference.green > row.off.green + 50 && row.frames[6].fingerprint === row.reference.fingerprint && row.frames[0].fingerprint === row.off.fingerprint && row.frames.at(-1).fingerprint === row.off.fingerprint && row.disabled.fingerprint === row.off.fingerprint && row.frames[3].green > row.off.green && row.frames[3].green < row.reference.green && row.frames[3].fingerprint === row.frames[8].fingerprint), JSON.stringify(r.far));
  record(`matrix living distance ${backend}: ordinary distant surfaces and carved cave travel stay unchanged`, r.ordinary.off.fingerprint === r.ordinary.on.fingerprint && r.cave.off.fingerprint === r.cave.notReached.fingerprint && r.cave.reached.green > r.cave.off.green + 50 && r.cave.permanent.green > r.cave.off.green + 50 && r.near.frames[0].fingerprint === r.near.off.fingerprint && r.near.frames.at(-1).fingerprint === r.near.reference.fingerprint, JSON.stringify({ near: r.near, ordinary: r.ordinary, cave: r.cave }));
}));
for (const backend of ["webgl2", "canvas2d"]) task(`mirror glyph parity ${backend}`, () => withPage(`mirror glyph parity ${backend}`, hubPage(src, backend === "canvas2d" ? "canvas2d=1" : ""), async (b) => {
  const r = await b.evaluate(`(${mirrorGlyphParityProbe.toString()})()`);
  record(`mirror glyph parity ${backend}: outlined rain matches native rune size, spacing, speed, cadence, trains and quality density without rebuilding its mask`, r.nativeSize && r.size && r.pattern && r.spacing && r.motion && r.cadence && r.gapsValid && r.trainsValid && r.interiorHidden && r.mutationPairs > 500 && r.gapPairs > 0 && r.completeTrains > 0 && r.tiers.length === 5 && r.tiers.every((tier) => tier.matches && tier.cached), JSON.stringify(r));
}));
for (const backend of ["webgl2", "canvas2d"]) task(`mirror outlines ${backend}`, () => withPage(`mirror outlines ${backend}`, hubPage(src, backend === "canvas2d" ? "canvas2d=1" : ""), async (b) => {
  const r = await b.evaluate(`(${mirrorOutlineProbe.toString()})()`);
  record(`mirror outlines ${backend}: exterior ivory glyphs fall on the actual mirror plane while the interior button stays absent`, r.backend === backend && r.registry && r.outside.standFaces === 0 && r.outside.glyphCells > 0 && r.changed > 50 && r.outsidePlane === 0 && r.downwardMatches > r.upwardMatches && r.deterministic && r.faded && r.sameVersion && r.animated.builds === r.outside.builds, JSON.stringify({ outside: r.outside, animated: r.animated, changed: r.changed, outsidePlane: r.outsidePlane, downwardMatches: r.downwardMatches, upwardMatches: r.upwardMatches, deterministic: r.deterministic, faded: r.faded, sameVersion: r.sameVersion }));
  record(`mirror outlines ${backend}: the actor's doorway crossing selects the interior cue, preserving first-person and visible-character suppression`, r.inside.inside && r.inside.standFaces > 0 && r.inside.glyphCells === 0 && r.noInteriorRain && !r.hiddenOutside.inside && r.hiddenOutside.enabled && r.hiddenOutside.draws > 0 && r.hiddenOutside.glyphCells > 0 && !r.visible.enabled && r.visible.draws === 0 && r.hiddenInside.inside && r.hiddenInside.portalInside && r.hiddenInside.enabled && r.hiddenInside.glyphCells === 0 && !r.first.enabled && r.first.draws === 0 && r.oblique.every((row) => row.width <= 1024 && row.height <= 1024), JSON.stringify({ inside: r.inside, noInteriorRain: r.noInteriorRain, outside: r.hiddenOutside, visible: r.visible, hiddenInside: r.hiddenInside, first: r.first, oblique: r.oblique }));
}));
for (const backend of ["webgl2", "canvas2d"]) task(`glyph gate exit ${backend}`, () => withPage(`glyph gate exit ${backend}`, hubPage(src, backend === "canvas2d" ? "canvas2d=1" : ""), async (b) => {
  for (const mode of ["trailing", "first-person"]) {
    const r = await b.evaluate(`(${glyphGateExitProbe.toString()})(${JSON.stringify({ mode })})`);
    record(`glyph gate exit ${backend} ${mode}: live barriers block exits until a reachable local Space release, with safe closure and free-camera passage`, r.backend === backend && r.mode === mode && r.gateCount === 5 && r.rows.length === 5 && r.failures.length === 0, JSON.stringify(r));
  }
}));
for (const backend of ["webgl2", "canvas2d"]) task(`mirror doorway glyphs ${backend}`, () => withPage(`mirror doorway glyphs ${backend}`, hubPage(src, backend === "canvas2d" ? "canvas2d=1" : ""), async (b) => {
  const r = await b.evaluate(`(${mirrorDoorwayGlyphProbe.toString()})(${JSON.stringify(backend)})`);
  record(`mirror doorway glyphs ${backend}: native falling ivory glyphs fill the inner doorway with correct opacity, depth, density and bounded storage`, r.backend === backend && r.errors.length === 0 && r.disposed, JSON.stringify(r));
  const scene = await b.evaluate(`(${mirrorDoorwaySceneProbe.toString()})()`);
  record(`mirror doorway glyphs ${backend}: only an outside selected actor and a camera inside the actual cave enable the inner glyph wall`, scene.rows.length === 11 && scene.errors.length === 0, JSON.stringify(scene));
}));
for (const backend of ["webgl2", "canvas2d"]) task(`camera glyph wave ${backend}`, () => withPage(`camera glyph wave ${backend}`, hubPage(src, backend === "canvas2d" ? "canvas2d=1" : ""), async (b) => {
  const r = await b.evaluate(`(${cameraGlyphWaveProbe.toString()})()`);
  record(`camera glyph wave ${backend}: advancing and receding fronts blend each rock texel in world space, preserving partial coverage and cache reuse`, r.unconverted && r.untouchedCache && r.cached && r.versionUpdated && r.reversible && r.returned && r.restored && r.middleBlend.errors === 0 && r.advancedBlend.errors === 0 && r.middleBlend.opaque === 16384 && r.advancedBlend.opaque === 16384 && r.middleBlend.rock > 0 && r.middleBlend.glyph > 0 && r.middleBlend.blend > 0 && r.advancedBlend.glyph > r.middleBlend.glyph && r.advancedBlend.rock < r.middleBlend.rock && r.moved > 500 && r.worldMatches === r.worldCompared && r.worldCompared > 10000 && r.cutState.partialRock && r.clearTop === 128 * 62 && r.solidBottom === 128 * 62 && r.coveredMatches === 128 * 62 && r.stationaryRock === r.middleBlend.rock && r.animatedGlyph > 0 && !r.untouchedState.glyphInterior && r.fullState.glyphBlendMin === 1 && r.fullState.glyphBlendMax === 1 && !r.ended.glyphInterior, JSON.stringify(r));
  const ownership = await b.evaluate(`(${cameraGlyphOwnershipProbe.toString()})()`);
  record(`camera glyph wave ${backend}: cave walls, roofs, flared windows and lower levels follow authored surface ownership and native wave timing`, ownership.failures.length === 0 && ownership.summary.faces > 0 && ownership.summary.radial > 0 && ownership.summary.headquarters > 0 && ownership.summary.basement > 0 && ownership.summary.roofPairs > 0 && ownership.summary.fragments > 0 && ownership.summary.waveSamples > 0 && ownership.summary.permanentSamples > 0 && ownership.rockCaveBytes > 0 && ownership.descriptor.coverage === "function", JSON.stringify(ownership));
}));
for (const backend of ["webgl2", "canvas2d"]) task(`camera cue contrast ${backend}`, () => withPage(`camera cue contrast ${backend}`, hubPage(src, backend === "canvas2d" ? "canvas2d=1" : ""), async (b) => {
  const r = await b.evaluate(`(${cameraCueContrastProbe.toString()})()`);
  record(`camera cue contrast ${backend}: ivory rims and narrow dark borders improve glyph contrast without changing normal cues, visibility, fades or window cutouts`, r.rows.length === 3 && r.rows.every((row) => row.defaultUnchanged && row.restored && row.brighter > 0 && row.darker > 0 && row.farChanged === 0 && row.gated && row.faded && row.windowClear) && r.contrastInvalidates && r.cached && r.providerContrast === 0.75, JSON.stringify(r));
  const world = await b.evaluate(`(${glyphOutlineContrastProbe.toString()})()`);
  record(`camera cue contrast ${backend}: a latched glyph button strengthens every cue across the map, including pile and exterior mirror providers`, world.backend === backend && world.rows.length === 5 && world.rows.slice(0, 4).every((row) => row.active && !row.inside && row.contrast === 1) && !world.rows[4].active && world.rows[4].contrast === 0 && world.providers.length === 2 && world.providers.every((row) => row.brighter > 0 && row.darker > 0 && row.cached && row.repeat && row.restored && row.faded), JSON.stringify(world));
  const interior = await b.evaluate(`(${glyphInteriorProbe.toString()})()`);
  record(`camera cue contrast ${backend}: glyph interiors replace stone with opaque black and soft green while preserving partial wall coverage and normal-mode restoration`, interior.entered.glyphInterior && interior.entered.textureUpdates > interior.before && interior.cached && interior.repeated && interior.green > 100 && interior.nearBlack > 100 && interior.opaque === interior.total && interior.maximum < 160 && interior.animated && interior.animationUpdates > 0 && interior.animationUpdates <= 16 && interior.crossing.partialRock && interior.clearTop === 640 * 178 && interior.solidBottom === 640 * 178 && interior.restored && !interior.ended.glyphInterior, JSON.stringify(interior));
}));
for (const backend of ["webgl2", "canvas2d"]) task(`camera cover ${backend}`, () => withPage(`camera cover ${backend}`, hubPage(src, backend === "canvas2d" ? "canvas2d=1" : ""), async (b) => {
  const r = await b.evaluate(`(${cameraCoverProbe.toString()})()`), solid = r.rows[0];
  record(`camera cover ${backend}: an eye inside rock sees opaque cave stone with no exposed island interior`, r.backend === backend && solid.actualSolid && solid.insideRock && solid.opaque === solid.total && solid.clear === 0, JSON.stringify(solid));
  record(`camera cover ${backend}: only the selected mesh silhouette receives a faint outline`, solid.outlined && solid.faces > 100 && solid.opacity === 0.22 && solid.changed > 100 && solid.outside === 0 && solid.interior > 100 && solid.interiorChanged === 0 && solid.maximumDelta > 0 && solid.maximumDelta <= 60, JSON.stringify(solid));
  record(`camera cover ${backend}: clear and first-person views draw only eligible guides, while unpossessed rock views retain only the stone`, r.rows.slice(1, 3).every((row) => !row.insideRock && !row.partialRock && !row.outlined && row.faces === 0 && row.opaque === 0 && row.guideLines >= 0 && row.guideLines <= row.eligibleGuides && (!row.guideLines || row.clear < row.total)) && r.rows[2].mode === "first-person" && !r.rows[3].selected && r.rows[3].insideRock && !r.rows[3].outlined && r.rows[3].faces === 0 && r.rows[3].guideLines === 0 && r.rows[3].opaque === r.rows[3].total, JSON.stringify(r.rows.slice(1)));
  const noCues = (row) => !row.objectsEnabled && row.cueCount === 0 && row.structureCount === 0 && row.objectCount === 0 && row.providerCount === 0 && row.guideLines === 0 && !row.outlined && row.faces === 0;
  record(`camera cover ${backend}: any visible selected body part and first-person entry immediately suppress all outline cues`, solid.objectsEnabled && solid.objectCount > 0 && solid.structureFaces > 0 && !solid.actorVisible && r.hiddenAgain.objectsEnabled && r.hiddenAgain.cueCount > 0 && r.hiddenAgain.outlined && r.partialActor.actorVisible && !r.partialActor.actorFullyVisible && r.partialActor.hop === 0 && Math.abs(r.partialActor.feet - r.partialActor.floor) < 1e-5 && r.rows[1].actorFullyVisible && r.rows[1].hop === 0 && Math.abs(r.rows[1].feet - r.rows[1].floor) < 1e-5 && r.firstEntry.closeWanted && r.firstEntry.closeMix < 1 && [r.partialActor, r.rows[1], r.rows[2], r.firstEntry].every(noCues), JSON.stringify({ partial: r.partialActor, hiddenAgain: r.hiddenAgain, clear: r.rows[1], firstEntry: r.firstEntry, first: r.rows[2] }));
  const wallPan = await b.evaluate(`(${wallPanOutlineProbe.toString()})()`);
  record(`camera cover ${backend}: complete nearby wall slabs stay solid while panning and camera-visible portions fade away outside rock`, wallPan.backend === backend && wallPan.rows.length === 66 && wallPan.rows.every((row) => row.enabled && row.outlined && row.faces > 0 && row.structureFilled && row.structureFaces > 0 && row.activeWalls > 0) && wallPan.boundaries.length === 3 && wallPan.boundaries.every((row) => row.rockOnly ? row.enabled && row.outlined && row.faces > 0 && (row.insideRock || row.partialRock) : !row.enabled && row.cues === 0 && !row.outlined && row.faces === 0 && !row.structureFilled && row.structureFaces === 0 && row.activeWalls === 0) && wallPan.surface.patches > 20 && wallPan.surface.cameraClear === 0 && wallPan.surface.revealed > 20 && wallPan.surface.visibleTargets === 0 && wallPan.surface.hiddenTargets > 20 && wallPan.surface.unchanged && wallPan.surface.fadingOut && wallPan.surface.fadedOut && wallPan.surface.fadingIn && wallPan.wallLines > 100 && wallPan.uniqueLines === wallPan.wallLines, JSON.stringify(wallPan));
  if (backend === "webgl2" && process.env.CAPTURE_CAMERA_FULL) await b.screenshot(process.env.CAPTURE_CAMERA_FULL);
  await b.open(hubPage(src, backend === "canvas2d" ? "canvas2d=1" : "")); await untilReady(b);
  const partial = await b.evaluate(`(${cameraPartialCoverProbe.toString()})()`);
  const partialRows = partial.rows.filter((row) => row.partialRock && row.fraction > 0 && row.fraction < 1);
  record(`camera cover ${backend}: crossing the floor reveals only the occupied near-plane rays with continuous partial coverage`, partial.rows.length === 33 && partial.rows[0].fraction === 0 && partial.rows.at(-1).fraction === 1 && partialRows.length > 10 && partial.rows.every((row, i, rows) => !i || row.fraction >= rows[i - 1].fraction && row.fraction - rows[i - 1].fraction < 0.12) && partial.comparisons > 5000 && partial.failures.length === 0 && partial.screenshotCoverage > 0 && partial.screenshotCoverage < 1, JSON.stringify(partial));
  record(`camera cover ${backend}: partial rock immediately enables cues only within the covered screen section`, partialRows.some((row) => row.objectsEnabled && row.rockOnly && row.outlined) && partialRows.filter((row) => row.rockOnly).every((row) => row.objectsEnabled), JSON.stringify(partialRows));
  const partialCue = await b.evaluate(`(${cameraPartialCueProbe.toString()})()`);
  record(`camera cover ${backend}: the partial-rock cue mask preserves the clear portion of split character and object outlines`, partialCue.partialRock && partialCue.rockCoverage > 0.4 && partialCue.rockCoverage < 0.6 && partialCue.outlined && partialCue.coveredChanges > 0 && partialCue.clearChanges === 0 && partialCue.clearAlpha === 0 && partialCue.objectOutlined && partialCue.objectCoveredChanges > 0 && partialCue.objectClearChanges === 0, JSON.stringify(partialCue));
  const eligibility = await b.evaluate(`(${cameraPartialEligibilityProbe.toString()})()`);
  record(`camera cover ${backend}: every eligible split prop and custom outline survives the rock boundary without outlining the clear half`, eligibility.rows.length === 4 && eligibility.rows.every((row, i) => row.updates === i + 1 && row.actualRockOnly === row.rockOnly && row.partialRock && row.clearChanges === 0 && row.perOwner.slice(3).every((owner) => !owner.perceived && owner.lines === 0) && (row.rockOnly ? row.perOwner.slice(0, 3).every((owner) => owner.perceived && owner.lines > 0 && owner.alpha === 1) && row.covered.every((pixels) => pixels > 0) && row.providerCount === 1 && row.providerDraws === 1 : row.perOwner.every((owner) => owner.lines === 0) && row.covered.every((pixels) => pixels === 0) && row.providerCount === 0 && row.providerDraws === 0)), JSON.stringify(eligibility));
  const wallEligibility = await b.evaluate(`(${cameraPartialWallEligibilityProbe.toString()})()`);
  record(`camera cover ${backend}: visible wall samples and window masks cannot remove wall portions covered by the rock cap`, wallEligibility.rows.length === 4 && wallEligibility.rows.every((row, i) => row.updates === i + 1 && row.clearChanges === 0 && row.covered.every((pixels) => row.rockOnly ? pixels > 0 : pixels === 0)), JSON.stringify(wallEligibility));
  if (backend === "webgl2" && process.env.CAPTURE_CAMERA_COVER) await b.screenshot(process.env.CAPTURE_CAMERA_COVER);
  const texture = await b.evaluate(`(${cameraRockTextureProbe.toString()})()`);
  record(`camera cover ${backend}: the rock texture uses actual material and stays anchored to world coordinates across motion and rotation`, texture.textureSize === 128 && texture.stationaryUpdates === 0 && texture.totalUpdates === 3 && texture.materialSamples === 1024 && texture.compared > 10000 && texture.worldMatches === texture.compared && texture.screenChanged > texture.compared * 0.1 && texture.rotationChanged > 1000 && texture.revisitMatches && texture.failures.length === 0, JSON.stringify(texture));
}));
for (const backend of ["webgl2", "canvas2d"]) task(`room sleep orientation ${backend}`, () => withPage(`room sleep orientation ${backend}`, hubPage(src, backend === "canvas2d" ? "canvas2d=1" : ""), async (b) => {
  const r = await b.evaluate(`(${sleepOrientationProbe.toString()})()`);
  record(`room sleep orientation ${backend}: awake and sleeping first-person entry preserves the actual approach direction and up vector`, r.rows.length === 4 && r.rows.every((row) => row.asleep && row.released && row.awake && row.sleepLabel === "SLEEP" && row.wakeLabel === "WAKE UP!" && row.entryDot > 0.9999 && row.entryUpDot > 0.9999 && row.releaseDot > 0.9999 && row.wakeDot > 0.95) && r.rows.some((row) => row.approachFaceDot < 0.5) && r.awakeEntries.length === 2 && r.awakeEntries.every((row) => row.entryDot > 0.9999 && row.entryUpDot > 0.9999 && row.mode === "first-person" && row.selected && !row.sleeping) && r.backend === backend, JSON.stringify(r));
  record(`room sleep orientation ${backend}: scroll, release and wake transitions keep an orthogonal continuous camera basis`, r.samples > 1000 && r.physicalChecks > 100 && r.minRightDot > 0.9 && r.failures.length === 0, JSON.stringify({ samples: r.samples, physicalChecks: r.physicalChecks, minRightDot: r.minRightDot, failures: r.failures }));
  record(`room sleep orientation ${backend}: leaving first person changes only distance along the existing view ray`, [...r.rows, ...r.awakeEntries].every((row) => row.exit.forwardDot > 0.9999 && row.exit.upDot > 0.9999 && row.exit.rayError < 1e-5 && row.exit.bodyMovement < 1e-5 && row.exit.mode === "trailing") && r.awakeEntries.some((row) => row.exit.lookY > 0.25 && row.exit.eyeDeltaY < -1) && r.awakeEntries.some((row) => row.exit.lookY < -0.25 && row.exit.eyeDeltaY > 1), JSON.stringify([...r.rows, ...r.awakeEntries].map((row) => row.exit)));
}));
for (const backend of ["webgl2", "canvas2d"]) task(`camera release ${backend}`, () => withPage(`camera release ${backend}`, hubPage(src, backend === "canvas2d" ? "canvas2d=1" : ""), async (b) => {
  const r = await b.evaluate(`(${cameraReleaseProbe.toString()})()`);
  record(`camera release ${backend}: releasing preserves the covered orbit and sleeping reservation, then first-person entry restores physical navigation`, r.rows.length === 2 && r.rows.every((row) => row.blocked && row.keptSleeping && row.released && row.releaseDelta < 1e-6 && row.stable < 1e-6 && row.freeCovered && row.freeMode === "orbit" && row.entryJump === 0 && row.entryFrames > 10 && row.entryFrames < 60 && !row.prematureFall && row.entryError < 1e-6 && row.recoveredClear && row.entryPhysical && row.mode === "eye-level" && row.movement > 0.5 && row.physical) && r.rows.some((row) => row.basement && row.wasSleeping), JSON.stringify(r));
}));
for (const backend of ["webgl2", "canvas2d"]) task(`camera ramp zoom ${backend}`, () => withPage(`camera ramp zoom ${backend}`, hubPage(src, backend === "canvas2d" ? "canvas2d=1" : ""), async (b) => {
  const r = await b.evaluate(`(${rampZoomProbe.toString()})()`);
  record(`camera ramp zoom ${backend}: both ramp levels retain the chosen angle and distance from close to wide while the character walks`, r.rows.length === 2 && r.rows.every((row) => [row.wide, row.close, row.nearest, row.wideAgain, row.atLimit, row.aboveLimit].every((view) => view.onRamp && view.rawError < 1e-6 && Math.abs(view.actualDistance - view.chosen) < 1e-6 && Math.abs(view.pitch - view.chosenPitch) < 1e-6 && Math.abs(view.yaw - view.chosenYaw) < 1e-6) && row.wide.chosen === 16 && row.wideAgain.chosen === 16 && row.nearest.chosen === 4 && row.close.chosen === 6 && row.atLimit.chosen === 8 && Math.abs(row.aboveLimit.chosen - 8.01) < 1e-6 && row.movedWide > 0.5 && row.movedClose > 0.5) && r.bodyChecks > 100 && r.rawChecks > 100 && r.maximumRawError < 1e-6 && r.failures.length === 0, JSON.stringify(r));
}));
for (const backend of ["webgl2", "canvas2d"]) task(`corridor visibility ${backend}`, () => withPage(`corridor visibility ${backend}`, hubPage(src, backend === "canvas2d" ? "canvas2d=1" : ""), async (b) => {
  const r = await b.evaluate(`(${corridorVisibilityProbe.toString()})()`);
  record(`corridor visibility ${backend}: narrow stone strips retain outlines through panning and zooming while real body reveals immediately clear them`, r.runtime.hidden > 40 && r.runtime.dropout === 0 && r.runtime.visibleOutlined === 0 && r.runtime.firstPerson && r.behindVisible && r.failures.length === 0, JSON.stringify(r));
}));
for (const backend of ["webgl2", "canvas2d"]) task(`ramp outline visibility ${backend}`, () => withPage(`ramp outline visibility ${backend}`, hubPage(src, backend === "canvas2d" ? "canvas2d=1" : ""), async (b) => {
  const r = await b.evaluate(`(${rampOutlineVisibilityProbe.toString()})()`);
  record(`ramp outline visibility ${backend}: exterior views retain ramp outlines through window reveals while inside and first-person views keep normal visibility gates`, r.rows.length === 4 && r.rows.every((row) => row.frames > 18 && row.visible > 0 && row.hidden > 0 && row.dropouts === 0 && row.interior.visible && !row.interior.enabled) && r.first && !r.first.enabled && r.failures.length === 0, JSON.stringify(r));
  const actor = await b.evaluate(`(${rampActorOutlineProbe.toString()})()`);
  record(`ramp outline visibility ${backend}: only exposed body rims disappear while hidden portions and other guides survive window, foreground and rear occlusion`, actor.backend === backend && actor.rows.length === 24 && actor.controls.length === 8 && actor.thin.length === 2 && actor.rows.every((row) => row.exposedRim > 10 && row.hiddenRim > 10 && row.interior > 100 && row.guidePixels > 10) && actor.failures.length === 0, JSON.stringify(actor));
}));
for (const backend of ["webgl2", "canvas2d"]) task(`ramp aperture occlusion ${backend}`, () => withPage(`ramp aperture occlusion ${backend}`, hubPage(src, backend === "canvas2d" ? "canvas2d=1" : ""), async (b) => {
  const r = await b.evaluate(`(${rampApertureOcclusionProbe})()`);
  record(`ramp aperture occlusion ${backend}: window cutouts preserve foreground stone while clear sections stay open through camera pans and zooms`, r.rows.filter((row) => row.kind === "synthetic").length === 9 && r.rows.filter((row) => row.kind === "ramp").length === 24 && r.rows.reduce((sum, row) => sum + row.blocked, 0) > 500 && r.rows.reduce((sum, row) => sum + row.clear, 0) > 500 && r.failures.length === 0, JSON.stringify(r));
}));
for (const backend of ["webgl2", "canvas2d"]) task(`window outlines ${backend}`, () => withPage(`window outlines ${backend}`, hubPage(src, backend === "canvas2d" ? "canvas2d=1" : ""), async (b) => {
  const r = await b.evaluate(`(${windowOutlineProbe.toString()})()`);
  record(`window outlines ${backend}: all 28 openings exclude exterior sill fragments including untagged voxel faces`, r.rows.length === 28 && r.rows.every((w) => w.exteriorFaces === 0 && w.originalExteriorFaces > 0), JSON.stringify(r.rows));
  record(`window outlines ${backend}: the thin gallery wall below the panorama spans every window segment and is visible from HQ`, r.panorama.selected && r.panorama.segments.length === 12 && r.panorama.segments.every((n) => n > 0) && r.panorama.visibleSegments.every((n) => n > 0), JSON.stringify(r.panorama));
  const aperture = await b.evaluate(`(${apertureOutlineProbe.toString()})()`);
  record(`window outlines ${backend}: a window cuts a precise hole in large wall faces during pans and zooms without dropping adjacent stone`, aperture.rows.length === 12 && aperture.rows.every((r) => r.windowSamples > 100 && r.wallSamples > 1000 && r.leaked === 0 && r.dropped === 0) && aperture.blocked > 20 && aperture.disabled, JSON.stringify(aperture));
  const floor = await b.evaluate(`(${rampWallFloorProbe.toString()})()`);
  record(`window outlines ${backend}: all four ramp wall lower edges follow the sloping floor`, floor.rows.length === 4 && floor.rows.every((r) => r.floorEdges > 100 && r.slopingEdges > 50 && r.maxFloorError < 0.00002), JSON.stringify(floor));
}));
for (const backend of ["webgl2", "canvas2d"]) task(`camera rock guides ${backend}`, () => withPage(`camera rock guides ${backend}`, hubPage(src, backend === "canvas2d" ? "canvas2d=1" : ""), async (b) => {
  const r = await b.evaluate(`(${rockGuidesProbe.toString()})()`);
  record(`camera rock guides ${backend}: occupied room, ramp and common-area references retain bounded cached structural geometry`, r.rows.length === 21 && r.rows.every((row) => row.cached && row.selected?.kind === row.kind && row.selected.index === row.index && row.selected.basement === row.basement && row.count > 0 && row.count <= 96) && r.sky && r.stats.surfaceContexts > 0 && r.stats.frontageContexts === 2 && r.stats.caveContexts === 3 && r.stats.contexts === 22 + r.stats.surfaceContexts + r.stats.frontageContexts + r.stats.caveContexts && r.stats.lines <= 21 * 96 && r.stats.taggedWindowReveals > 0 && r.stats.windowReveals === r.stats.taggedWindowReveals && r.finite && r.points > 5000 && r.failures.length === 0 && r.disposed, JSON.stringify({ ...r, views: undefined }));
  record(`camera rock guides ${backend}: faint structural lines project across full and partial rock views`, r.views.length === 2 && r.views.every((view) => view.guideLines > 0 && view.guideLines <= 96 && view.changed > 10 && view.maximumDelta > 0 && view.maximumDelta < 100 && (view.partial ? view.partialRock && view.rockCoverage > 0 && view.rockCoverage < 1 && view.leaked > 0 : view.insideRock && view.leaked === 0)) && r.failures.length === 0, JSON.stringify(r.views));
  const walls = r.wholeWalls, fade = walls.fade;
  record(`camera rock guides ${backend}: recognized wall runs stay continuous between visible ends while hidden rooms, levels and every window reveal remain excluded`, walls.activeContexts > 0 && walls.patches > 100 && walls.actorBlocked > 0 && walls.unequalPhases === 0 && walls.distanceError < 1e-5 && walls.targetError < 1e-6 && walls.reused && walls.orbitStable && walls.blockedNearbyWalls > 0 && walls.blockedActivated === 0 && walls.perceptionErrors === 0 && walls.otherLevelActive === 0 && walls.ceilingFaces === 0 && walls.auditedWindows === walls.totalWindows && walls.totalWindows > 0 && walls.windowRevealFaces === 0 && walls.intervalError < 1e-6 && walls.sectionError < 1e-6 && walls.hiddenEndTargets === 0, JSON.stringify(walls));
  record(`camera rock guides ${backend}: whole walls fade together at the proximity boundary and every context clears on the hard gate`, Math.abs(fade.edgeTarget - 0.5) < 1e-5 && Math.abs(fade.edgePhase - fade.edgeTarget) < 1e-6 && fade.heldPhase === fade.edgePhase && fade.outPhase > 0 && fade.outPhase < fade.edgePhase && fade.gonePhase === 0 && fade.inPhase > 0 && fade.inPhase < fade.edgeTarget && fade.beyondRadius > 0 && fade.farPhaseError < 1e-6 && walls.reset, JSON.stringify({ fade, reset: walls.reset }));
  const interval = walls.intervalFade;
  record(`camera rock guides ${backend}: an occluded middle stays connected while hidden wall ends fade out and return smoothly`, interval.span > 1 && interval.connectedMiddle > 0 && interval.retired > 0 && interval.held && interval.fading && interval.gone && interval.returning, JSON.stringify(interval));
  const hole = r.holeGuide;
  record(`camera rock guides ${backend}: the basement shaft shows its real shallow stone rim around an open center`, hole.count === 0 && hole.triangles > 100 && hole.boundarySamples > 50 && hole.depth > 0 && hole.depth <= 1 && hole.invalidSamples.length === 0 && hole.openCenter && hole.perceived && hole.filled && hole.outlinePixels > 1000 && hole.centerPixels === 0, JSON.stringify(hole));
  const mask = await b.evaluate(`(${wholeWallMaskProbe.toString()})()`);
  record(`camera rock guides ${backend}: visible panels create no false internal rim and cover hidden walls behind them`, mask.filled && mask.hiddenFill > 0 && mask.visibleFill === 0 && mask.visibleMaximum === 0 && mask.internalMaximum <= mask.hiddenFill + 1 && mask.outerMaximum > mask.hiddenFill + 10 && mask.cleared && mask.visibleOverlapMaximum === 0 && mask.orderStable, JSON.stringify(mask));
  const entrance = await b.evaluate(`(${rampOutlineSectionsProbe.toString()})()`);
  record(`camera rock guides ${backend}: both ramp entrances keep three complete wall sections visible on ascent and descent, excluding ceiling steps and buried exterior faces`, entrance.fronts === 2 && entrance.geometry.ramps === 4 && entrance.geometry.triangles > 1000 && entrance.geometry.exteriorSamples > 1000 && entrance.phases.sections === 6 && entrance.phases.activeSections === 6 && entrance.phases.sampled > 100 && entrance.phases.selfHidden > 0 && entrance.phases.cameraVisible > 0 && entrance.rows.length === 2 && entrance.rows.every((row) => row.returnSamples === 5 && row.visibleExitInside > 0 && row.outlinedExitInside > 0) && entrance.failures.length === 0, JSON.stringify(entrance));
  const outdoor = await b.evaluate(`(${surfaceRockGuideProbe.toString()})()`);
  record(`camera rock guides ${backend}: main-level walls and cliffs join vertical risers with elevated treads without subterranean or window artifacts`, outdoor.contexts > 20 && outdoor.contexts < 2000 && outdoor.triangles > 1000 && outdoor.groups > 500 && outdoor.verticalFaces > 100 && outdoor.treadFaces > 100 && outdoor.invalidFaces === 0 && outdoor.mixedContexts > 10 && outdoor.windowFaces === 0 && outdoor.interiorFaces === 0 && outdoor.candidate && outdoor.failures.length === 0, JSON.stringify(outdoor));
  record(`camera rock guides ${backend}: hill cross-sections synchronize vertically while camera-visible patches stay clear and the joined cliff fades away`, outdoor.hidden.perceived && outdoor.hidden.wallTarget > 0 && outdoor.hidden.wallPhase > 0 && outdoor.hidden.target > 0 && outdoor.hidden.phase > 0 && outdoor.hidden.cameraHidden && outdoor.hidden.active > 0 && outdoor.perception.visible > 1 && outdoor.perception.outlined === outdoor.perception.visible + outdoor.perception.synced && outdoor.perception.synced > 0 && outdoor.perception.verticalStacks > 0 && outdoor.perception.farSideOutlined === 0 && outdoor.perception.errors < 1e-6 && outdoor.perception.risers > 0 && outdoor.perception.treads > 0 && outdoor.outlinePixels > 100 && outdoor.structureFaces > 0 && outdoor.visible.directClear && !outdoor.visible.cameraHidden && outdoor.visible.target === 0 && outdoor.visible.phase === 0 && outdoor.visible.cameraVisible > 0 && outdoor.visible.cameraVisibleOutlined === 0 && outdoor.cleared, JSON.stringify(outdoor));
}));
for (const backend of ["webgl2", "canvas2d"]) task(`camera performance ${backend}`, () => withPage(`camera performance ${backend}`, hubPage(src, backend === "canvas2d" ? "canvas2d=1" : ""), async (b) => {
  const triggers = await b.evaluate(`(${outlineTriggerPolicyProbe})()`);
  record(`camera performance ${backend}: trees, clouds and mirror panels keep outline eligibility without activating cues; stone structures still activate them`, triggers.rows.length === 6 && triggers.structures.length === 6 && triggers.failures.length === 0, JSON.stringify(triggers));
  const mirror = await b.evaluate(`(${mirrorViewportProbe})()`);
  record(`camera performance ${backend}: offscreen glyph work is culled without clipping visible glyphs or mirror borders`, mirror.rows.length === 36 && mirror.errors.length === 0 && mirror.farCells > 1000 && mirror.nearCells < mirror.farCells * 0.1, JSON.stringify(mirror));
}));
for (const backend of ["webgl2", "canvas2d"]) task(`outline visibility cache ${backend}`, () => withPage(`outline visibility cache ${backend}`, hubPage(src, backend === "canvas2d" ? "canvas2d=1" : ""), async (b) => {
  const r = await b.evaluate(`(${outlinePerformanceProbe})()`);
  record(`outline visibility cache ${backend}: whole-wall witnesses remain correct as blockers change without retracing fixed-camera terrain`, r.rows.length === 3 && r.failures.length === 0, JSON.stringify(r));
  const objects = await b.evaluate(`(${objectVisibilityPerformanceProbe})()`);
  record(`outline visibility cache ${backend}: conservative object certificates preserve tiny openings, moving blockers, replacement geometry and the near plane`, objects.rows.length === 11 && objects.failures.length === 0 && objects.efficient && objects.witnessReused && objects.disposed, JSON.stringify(objects));
}));
for (const backend of ["webgl2", "canvas2d"]) task(`canopy occlusion ${backend}`, () => withPage(`canopy occlusion ${backend}`, hubPage(src, `bananas=1000000${backend === "canvas2d" ? "&canvas2d=1" : ""}`), async (b) => {
  const proof = await b.evaluate(`(${canopyCertificateProbe})()`);
  record(`canopy occlusion ${backend}: solid prop coverage avoids dense ray searches while preserving tiny gaps, partial edges, clip planes and moving blockers`, proof.rows.length === 9 && proof.failures.length === 0 && proof.disposed, JSON.stringify(proof));
  const pile = await b.evaluate(`(${canopyPileProbe})()`);
  record(`canopy occlusion ${backend}: panning through the roof trees with a million-banana pile retains outlines without searching every banana face`, pile.rows.length === 15 && pile.fruitInstances > (backend === "webgl2" ? 10000 : 500) && pile.failures.length === 0, JSON.stringify(pile));
}));
for (const backend of ["webgl2", "canvas2d"]) task(`slope outlines ${backend}`, () => withPage(`slope outlines ${backend}`, hubPage(src, backend === "canvas2d" ? "canvas2d=1" : ""), async (b) => {
  const slopes = await b.evaluate(`(${slopeOutlineSectionsProbe.toString()})()`);
  record(`slope outlines ${backend}: stepped hillside sides join up to the crest, exclude flat platforms, and reveal the far side only from its own line of sight`, slopes.synthetic.joined > 20 && slopes.synthetic.excluded >= 7 && slopes.synthetic.oppositeSides && slopes.synthetic.diagonalJoined && slopes.geometry.mixedSides > 0 && slopes.geometry.risers > 100 && slopes.geometry.treads > 100 && slopes.runtime.blockedBelow > 0 && slopes.runtime.revealedAbove === slopes.runtime.blockedBelow && slopes.runtime.partialFadeIn === slopes.runtime.blockedBelow && slopes.runtime.partialFadeOut === slopes.runtime.blockedBelow && slopes.failures.length === 0, JSON.stringify(slopes));
}));
for (const backend of ["webgl2", "canvas2d"]) task(`cave outlines ${backend}`, () => withPage(`cave outlines ${backend}`, hubPage(src, backend === "canvas2d" ? "canvas2d=1" : ""), async (b) => {
  const caves = await b.evaluate(`(${caveOutlineSectionsProbe.toString()})()`);
  record(`cave outlines ${backend}: accessible cave walls reveal through camera rock while sealed entrances remain solid and their interiors stay absent`, caves.registry.accessible === 3 && caves.registry.sealed === 3 && caves.coverage.interiorSamples > 100 && caves.coverage.sealSamples === 720 && caves.runtime.revealed === 6 && caves.runtime.sealedWhole === 3 && caves.runtime.fadeIn === 6 && caves.runtime.fadeOut === 6 && caves.runtime.cameraVisible > 0 && caves.failures.length === 0, JSON.stringify(caves));
}));
for (const backend of ["webgl2", "canvas2d"]) task(`sealed cave blocks ${backend}`, () => withPage(`sealed cave blocks ${backend}`, hubPage(src, backend === "canvas2d" ? "canvas2d=1" : ""), async (b) => {
  const r = await b.evaluate(`(${sealedCaveBlocksProbe.toString()})(${JSON.stringify(backend)})`);
  record(`sealed cave blocks ${backend}: all blocked caves have a solid core fitted to the rim and one complete outline while open caves stay open`, r.backend === backend && r.variants.length === 3 && r.accessible === 5 && r.closedOpenings.length === 0 && r.failures.length === 0, JSON.stringify(r));
}));
for (const backend of ["webgl2", "canvas2d"]) task(`sealed cave walking ${backend}`, () => withPage(`sealed cave walking ${backend}`, hubPage(backend === "webgl2" ? src : dist, `bananas=1000000${backend === "canvas2d" ? "&canvas2d=1" : ""}`), async (b) => {
  const r = await b.evaluate(`(${sealedCaveWalkingProbe.toString()})(${JSON.stringify({ dt: backend === "webgl2" ? 1 / 20 : 1 / 120 })})`);
  const valid = r.rows.filter((row) => row.name !== "embedded goal"), rejected = r.rows.filter((row) => row.name === "embedded goal");
  record(`sealed cave walking ${backend}: NPCs reach and leave all three cave aprons without trying to pass walls beyond their destinations`, r.backend === backend && valid.length === 9 && valid.every((row) => row.initialClear && row.destinationClear && row.arrived && row.goalsPreserved && row.distance < 1e-6 && row.intersections === 0 && row.peakYaw === 0 && row.searches === 0 && row.jumps === 0 && row.maximumStep <= 1.7 * r.dt + 1e-7), JSON.stringify(valid));
  record(`sealed cave walking ${backend}: destinations overlapping sealed rock are rejected and walkers can safely resume`, rejected.length === 3 && rejected.every((row) => row.initialClear && !row.destinationClear && row.retargeted && row.replacementClear && !row.goalsPreserved && row.arrived && row.distance < 1e-6 && row.intersections === 0 && row.maximumStep <= 1.8 * r.dt + 1e-7), JSON.stringify(rejected));
  record(`sealed cave walking ${backend}: solid seals stop the full body and allow walking away after contact`, r.walls.length === 3 && r.walls.every((row) => row.initialClear && row.insideBlocked && row.partialBlocked && row.sweepBlocked && row.intersections === 0 && row.walkedAway && row.maximumStep <= 7.75 * r.dt + 1e-7), JSON.stringify(r.walls));
}));
for (const backend of ["webgl2", "canvas2d"]) task(`outline moving characters ${backend}`, () => withPage(`outline moving characters ${backend}`, hubPage(src, backend === "canvas2d" ? "canvas2d=1" : ""), async (b) => {
  const r = await b.evaluate(`(${outlineMovingCharactersProbe.toString()})()`);
  record(`outline moving characters ${backend}: passing Oogas preserve item and wall eligibility while scenery and camera visibility retain their occlusion rules`, r.rows.length === 18 && r.structural.length === 5 && r.disposed && r.failures.length === 0, JSON.stringify(r));
}));
for (const backend of ["webgl2", "canvas2d"]) task(`camera free entry ${backend}`, () => withPage(`camera free entry ${backend}`, hubPage(src, backend === "canvas2d" ? "canvas2d=1" : ""), async (b) => {
  for (const portrait of [false, true]) {
    if (portrait) {
      await b.send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: false });
      await untilPage(b, "B.renderer.size.height > B.renderer.size.width");
    }
    const r = await b.evaluate(`(${freeCameraEntryProbe.toString()})()`);
    record(`camera free entry ${backend} ${portrait ? "portrait" : "landscape"}: scroll reaches the previous focal point along the held viewing ray before gravity starts`, r.rows.length === 6 && r.rows.every((row) => row.eventJump === 0 && row.initialMix === 0 && row.frames > 10 && !row.prematureFall && row.rayError < 1e-6 && row.forwardDot > 0.99999 && row.retreat < 1e-6 && row.endpointError < 1e-6 && row.arrived && row.fallError < 1e-6), JSON.stringify(r));
    record(`camera free entry ${backend} ${portrait ? "portrait" : "landscape"}: reversing an outward zoom keeps the displayed eye and returns to its focal point`, r.rows.every((row) => row.reversalJump === 0 && row.reversalError < 1e-6), JSON.stringify(r));
  }
}));
for (const backend of ["webgl2", "canvas2d"]) task(`camera free orbit ${backend}`, () => withPage(`camera free orbit ${backend}`, hubPage(src, backend === "canvas2d" ? "canvas2d=1" : ""), async (b) => {
  const r = await b.evaluate(`(${cameraFreeOrbitProbe.toString()})()`);
  record(`camera free orbit ${backend}: the unpossessed focal point and exact chosen eye move through rock with a solid unoutlined view`, r.initial.targetSolid && r.initial.eyeSolid && r.initial.targetError < 1e-7 && r.initial.insideRock && !r.initial.outlined && r.initial.faces === 0 && r.movement > 0.5 && r.maxError < 1e-5 && r.failures.length === 0, JSON.stringify(r));
  record(`camera free orbit ${backend}: both full vertical pitch limits retain the chosen distance and finite camera matrices`, r.rows.length === 3 && r.rows[0].chosen < -1.56 && r.rows[1].chosen > 1.56 && r.rows[2].chosen === 0 && r.rows.every((row) => Math.abs(row.view - row.chosen) < 1e-6 && Math.abs(row.distance - row.selectedDistance) < 1e-5) && r.samples > 100 && r.failures.length === 0, JSON.stringify(r));
  record(`camera free orbit ${backend}: leaving physical eye-level view retains its direction and roll along a straight zoom path`, r.exit.firstPerson && r.exit.mode === "orbit" && r.exit.unpossessed && r.exit.forwardDot > 0.9999 && r.exit.upDot > 0.9999 && r.exit.rayError < 1e-5, JSON.stringify(r.exit));
}));
for (const backend of ["webgl2", "canvas2d"]) task(`camera sight guides ${backend}`, () => withPage(`camera sight guides ${backend}`, hubPage(src, backend === "canvas2d" ? "canvas2d=1" : ""), async (b) => {
  const terrain = await b.evaluate(`(${terrainSightProbe.toString()})()`);
  record(`camera sight guides ${backend}: exact terrain rays agree with rendered faces, dense occupancy and reverse traversal`, Object.values(terrain.counts).length === 4 && Object.values(terrain.counts).every((count) => count === 120) && terrain.rays > 1400 && terrain.failures.length === 0 && terrain.seamCovered && terrain.outside && terrain.throughIsland && terrain.shaft, JSON.stringify(terrain));
  record(`camera sight guides ${backend}: empty terrain box certificates agree with independent occupancy and rays`, terrain.certifiedRays > 100 && terrain.clearBoxes > 300 && terrain.boxRays === terrain.clearBoxes * 8 && terrain.boxPoints === terrain.clearBoxes * 27 && terrain.solidBoxes > 100 && terrain.solidPoints === terrain.solidBoxes * 27 && terrain.failures.length === 0, JSON.stringify({ certifiedRays: terrain.certifiedRays, clearBoxes: terrain.clearBoxes, boxRays: terrain.boxRays, boxPoints: terrain.boxPoints, solidBoxes: terrain.solidBoxes, solidPoints: terrain.solidPoints, failures: terrain.failures }));
  record(`camera sight guides ${backend}: every window certifies actual convex stone fragments while rejecting two-millimetre air crossings`, terrain.fragmentWindows.length === 28 && terrain.fragmentWindows.every((count) => count === 3) && terrain.fragmentBoxes === 84 && terrain.fragmentAirBoxes === terrain.fragmentBoxes && terrain.fragmentPoints === terrain.fragmentBoxes * 27 && terrain.failures.length === 0, JSON.stringify({ windows: terrain.fragmentWindows, solid: terrain.fragmentBoxes, air: terrain.fragmentAirBoxes, points: terrain.fragmentPoints, failures: terrain.failures }));
  const r = await b.evaluate(`(${sightGuideClippingProbe.toString()})()`);
  record(`camera sight guides ${backend}: structural proximity is independent of actor heading and clips exactly to twelve metres`, r.initial.count === 4 && r.initial.structureCount === 4 && r.initial.objectCount === 0 && r.initial.lines.some((v, i) => i % 3 === 2 && v === -3) && r.samples > 300 && r.shownVisible === 0 && r.cached && r.rotationStable && r.unpossessed && r.sphere.count === 1 && r.sphere.radius === 12 && Math.abs(r.sphere.left + Math.sqrt(127)) < 1e-5 && Math.abs(r.sphere.right - Math.sqrt(127)) < 1e-5 && Math.abs(r.sphere.movedLeft - r.sphere.left - 0.5) < 1e-5 && Math.abs(r.sphere.movedRight - r.sphere.right - 0.5) < 1e-5, JSON.stringify(r));
  record(`camera sight guides ${backend}: only camera-hidden portions receive lines across thin blockers and narrow slits`, r.thin.length === 2 && r.thin[0].count === 1 && r.thin[0].length > 0.06 && r.thin[0].length <= 0.08 + 1e-6 && r.thin[1].count === 2 && r.thin[1].length > 1.9 && r.thin.every((row) => row.invalid === 0), JSON.stringify(r.thin));
  const perception = await b.evaluate(`(${sightGuidePerceptionProbe.toString()})()`);
  record(`camera sight guides ${backend}: the actor sees through doorways in all directions but walls, floors, ceilings and objects block perception`, perception.rows.length === 7 && perception.rows.every((row) => row.count === row.expected && row.rotationStable && row.eye.join(",") === "0,1,0" && (!row.name.includes("doorway") || row.length > 1.59 && row.length <= 1.6)) && perception.samples > 1000 && perception.invalid === 0, JSON.stringify(perception));
  const silhouettes = await b.evaluate(`(${objectSilhouetteProbe.toString()})()`);
  record(`camera sight guides ${backend}: object outlines follow the projected owner silhouette without face diagonals or internal overlapping-part contours`, silhouettes.rows.length === 4 && silhouettes.rows.every((row) => row.count > 0 && row.owners && row.invalid === 0 && (row.expected === null || row.count === row.expected)) && silhouettes.rows[2].candidates > silhouettes.rows[2].count && silhouettes.rows[3].interior > 0 && silhouettes.samples > 300 && silhouettes.rejectedInterior > 100 && silhouettes.failures.length === 0, JSON.stringify(silhouettes));
  const objects = await b.evaluate(`(${objectPerceptionProbe.toString()})()`);
  record(`camera sight guides ${backend}: any nearby actor-visible surface qualifies the complete wholly hidden object's outline, including visibility through a central aperture`, objects.rows.length === 11 && objects.rows.filter((row) => ["clear", "solid wall", "outside range"].includes(row.name)).every((row) => row.count === 0) && objects.rows.filter((row) => ["center aperture", "half aperture"].includes(row.name)).every((row) => row.perceived && row.concealed && row.count === 4 && row.complete && row.length > 15.99 && row.visibleFrontSamples === 0) && objects.rows.find((row) => row.name === "center aperture").actorVisible === 0 && objects.rows.find((row) => row.name === "center aperture").centerVisible && objects.rows.find((row) => row.name === "half aperture").actorVisible > 0 && objects.rows.find((row) => row.name === "near owner, far parts").count === 6 && objects.rows.find((row) => row.name === "near owner, far parts").complete && objects.rows.find((row) => row.name === "near owner, far parts").beyondRadius > 0, JSON.stringify(objects));
  record(`camera sight guides ${backend}: a visible exterior patch suppresses the whole outline through apertures and around narrow or central screens`, objects.rows.filter((row) => ["camera aperture", "narrow screen", "center screen"].includes(row.name)).every((row) => row.perceived && !row.concealed && row.count === 0 && row.visibleFrontSamples > 0 && row.visibleFrontSamples < 81), JSON.stringify(objects.rows.filter((row) => ["camera aperture", "narrow screen", "center screen"].includes(row.name))));
  const buried = objects.rows.find((row) => row.name === "buried rear surface"), front = objects.rows.find((row) => row.name === "exterior front blocker");
  record(`camera sight guides ${backend}: self-covered rear surfaces never outline an unobstructed object, while an exterior blocker exposes its complete silhouette`, buried.perceived && buried.frontVisible && buried.rearBlocked && buried.rearSelfCovered && !buried.concealed && buried.count === 0 && front.perceived && !front.frontVisible && front.rearBlocked && front.rearSelfCovered && front.concealed && front.count === 4 && front.complete && front.length > 15.99, JSON.stringify({ buried, front }));
  const world = await b.evaluate(`(${sightGuideWorldProbe.toString()})()`);
  record(`camera sight guides ${backend}: whole nearby walls render separately while object owners retain actor visibility and camera occlusion`, world.rows.length === 2 && world.rows.every((row) => row.radius === 12 && row.count > 0 && row.count <= row.capacity && row.structureCount === 0 && row.structureFaces > 0 && row.objectCount > 0 && row.bedEdges > 0) && world.samples > 500 && world.actorSamples === 0 && world.objectSamples === world.samples && world.ownerChecks > 5 && world.objectSamples > 50 && world.provenance > 100 && world.behindActorSamples > 50 && world.hiddenCandidates > 0 && world.failures.length === 0, JSON.stringify(world));
  record(`camera sight guides ${backend}: camera motion updates occlusion while head rotation leaves the proximity result unchanged`, world.rows.every((row) => row.cameraChanged && row.cameraUpdated && row.rotationStable && row.moved) && world.unpossessed && world.failures.length === 0, JSON.stringify(world));
  record(`camera sight guides ${backend}: camera-visible Oogas need no outline, camera-hidden room mates appear, and neighbors behind room walls or other floors remain hidden`, world.characters.length === 2 && world.characters.every((row) => row.visible === 0 && row.sameRoomHidden > 0 && row.blocked === 0 && row.blockedCandidate && row.otherFloor === 0 && row.otherFloorCandidate) && world.failures.length === 0, JSON.stringify(world.characters));
}));
for (const backend of ["webgl2", "canvas2d"]) task(`pile rendering ${backend}`, () => withPage(`pile rendering ${backend}`, hubPage(backend === "webgl2" ? src : dist, backend === "canvas2d" ? "canvas2d=1" : ""), async (b) => {
  const result = await b.evaluate(`(${pileRenderingProbe.toString()})(${JSON.stringify(backend)})`);
  for (const row of result.rows) record(`pile rendering ${backend}: ${row.name}`, row.ok, JSON.stringify(row));
}));
for (const backend of ["webgl2", "canvas2d"]) task(`pile walking performance ${backend}`, () => withPage(`pile walking performance ${backend}`, hubPage(src, `bananas=10000000${backend === "canvas2d" ? "&canvas2d=1" : ""}`), async (b) => {
  const r = await b.evaluate(`(${pileVisibilityPerformanceProbe.toString()})()`);
  record(`pile walking performance ${backend}: clear character views never build a partial pile mask`, r.visible === 16 && r.idleMasks && r.fruit > 0, JSON.stringify(r));
  record(`pile walking performance ${backend}: empty-volume batching preserves every mask pixel while reducing exact visibility rays`, r.rows.length === 3 && r.rows.every((row) => row.before.hash === row.after.hash && row.before.count === row.after.count) && r.rows.slice(0, 2).every((row) => row.before.rays > 500 && row.after.rays < row.before.rays * 0.5) && r.rows[2].after.count > 1000, JSON.stringify(r.rows));
}));
for (const backend of ["webgl2", "canvas2d"]) task(`pile partial outline ${backend}`, () => withPage(`pile partial outline ${backend}`, hubPage(src, `bananas=1000000${backend === "canvas2d" ? "&canvas2d=1" : ""}`), async (b) => {
  const r = await b.evaluate(`(${pilePartialProbe.toString()})()`), [hidden, cached, partial, clear, cap, restored] = r.rows;
  record(`pile partial outline ${backend}: only the camera-hidden half is filled and outlined without a bright cut edge`, r.backend === backend && r.left > 1000 && r.right > 1000 && r.leftKept / r.left > 0.98 && r.rightRemoved === r.right && partial.nonzero > 1000 && partial.nonzero < hidden.nonzero * 0.7 && r.cutBright === 0, JSON.stringify(r));
  record(`pile partial outline ${backend}: clear shells disappear, rock caps retain the whole shell, and occluder revisions invalidate cached masks`, clear.nonzero === 0 && cap.hash === hidden.hash && restored.hash === hidden.hash && cached.hash === hidden.hash && cached.updates === hidden.updates && cached.occlusionUpdates === hidden.occlusionUpdates && cached.rays === 0 && cached.boxes === 0 && partial.occlusionUpdates > cached.occlusionUpdates && clear.occlusionUpdates > partial.occlusionUpdates && restored.occlusionUpdates > clear.occlusionUpdates, JSON.stringify(r.rows));
  record(`pile partial outline ${backend}: shells thinner than a depth-mask pixel preserve their hidden half`, r.tiny.projectedHeight > 0 && r.tiny.projectedHeight < 640 / 256 && r.tiny.left > 20 && r.tiny.right > 20 && r.tiny.kept / r.tiny.left > 0.98 && r.tiny.removed === r.tiny.right, JSON.stringify({ tiny: r.tiny, rows: r.rows.slice(6) }));
  const eligibility = await b.evaluate(`(${pilePartialEligibilityProbe.toString()})()`);
  record(`pile partial outline ${backend}: partial providers stay eligible when a visible portion would suppress an ordinary object`, eligibility.shell.provider && eligibility.shell.state === 3 && eligibility.shell.alpha > 0 && eligibility.ordinary.state === 1 && eligibility.ordinary.alpha === 0 && eligibility.providerCount === 1, JSON.stringify(eligibility));
  const scene = await b.evaluate(`(${pilePartialSceneProbe.toString()})()`);
  record(`pile partial outline ${backend}: production canopy views retain hidden shell portions and remove exposed portions without inspecting individual fruit`, scene.backend === backend && scene.selected && scene.fruitInstances > 0 && scene.rows.length === 6 && scene.rows.every((row) => row.reference > 100 && row.leaked === 0 && row.instances === 0 && row.considered === 0 && row.samples === 0) && scene.rows.some((row) => row.hidden > 100 && row.clear > 100), JSON.stringify(scene));
}));
for (const backend of ["webgl2", "canvas2d"]) task(`camera pile outline ${backend}`, () => withPage(`camera pile outline ${backend}`, hubPage(src, backend === "canvas2d" ? "canvas2d=1" : ""), async (b) => {
  const r = await b.evaluate(`(${pileGuideProbe.toString()})()`);
  record(`camera pile outline ${backend}: inner mound and rock platform have distinct wall-style owners at every pile level`, r.rows.length === 11 && !r.empty.fruit && r.empty.platform && r.rows.every((row) => row.active && row.singleOwner && row.distinct && row.provider && row.instances === row.expectedInstances && row.registered === r.originalNodes && row.capacity === r.originalCapacity && row.buffers === row.expectedBuffers) && r.rows.at(-1).shell > 0 && r.fruitStable && r.fruitChanged === 0 && r.dropChanged === 0 && r.failures.length === 0, JSON.stringify(r));
  record(`camera pile outline ${backend}: the inner mound has a continuous soft wall fill and a brighter outer rim without fruit detail`, r.rows.every((row) => row.outline > 50 && row.maximumAlpha > row.interiorMax && row.maximumAlpha <= 120 && row.cached && row.referencePixels > 300 && row.interior > 100 && row.interiorMin > 0 && row.interiorMax - row.interiorMin <= 1 && row.seams === 0 && row.distant === 0) && r.rows.filter((row) => row.referencePixels !== null).length === 11 && new Set(r.rows.map((row) => row.fingerprint)).size > 3 && r.failures.length === 0, JSON.stringify(r.rows));
}));
for (const backend of ["webgl2", "canvas2d"]) task(`camera object registry ${backend}`, () => withPage(`camera object registry ${backend}`, hubPage(src, backend === "canvas2d" ? "canvas2d=1" : ""), async (b) => {
  const crowd = await b.evaluate(`(${objectCrowdingProbe.toString()})()`);
  record(`camera object registry ${backend}: nearby characters and scene growth never evict an eligible prop`, crowd.rows.length === 9 && crowd.rows.every((row) => row.candidates === row.expectedNodes && row.nearCount === row.expectedOwners && row.stateOwners === row.expectedOwners && row.allProps && row.targetEdges > 0 && row.targetPerceived && row.targetClear && row.recognized && row.sourceCapacity >= row.sourceCount && row.ownerCapacity >= row.expectedOwners) && crowd.rows.at(-1).sourceCount > 4096 && crowd.rows.at(-1).outputCount > 4096 && crowd.stable && crowd.disposed, JSON.stringify(crowd));
  const camera = await b.evaluate(`(${objectCameraIndependenceProbe.toString()})()`);
  record(`camera object registry ${backend}: actor visibility through interior and edge apertures survives every camera angle and zoom`, camera.rows.length === 2 && camera.rows.every((row) => row.samples === 48 && row.witness && row.recognized && row.distanceStable && row.nearVersionStable && row.rotationStable && !row.blocked.inView && !row.blocked.recognized && row.blocked.alpha === 0 && !row.reopened.inView && row.reopened.recognized && row.reopened.alpha === 1 && row.cleared) && camera.failures.length === 0, JSON.stringify(camera));
  record(`camera object registry ${backend}: looking away and back preserves partial and settled outline opacity`, camera.rows.every((row) => row.partial.alpha > 0 && row.partial.alpha < 1 && [row.away, row.held].every((sample) => sample.present && sample.recognized && !sample.inView && sample.count === 0 && sample.slot === row.partial.slot) && row.away.alpha === row.partial.alpha && row.held.alpha === row.control.alpha && row.returned.inView && row.returned.alpha === row.held.alpha && row.returned.slot === row.partial.slot && row.settled.alpha === 1 && row.settledReturn.alpha === 1), JSON.stringify(camera.rows.map(({ name, control, partial, away, held, returned, settled, settledReturn }) => ({ name, control, partial, away, held, returned, settled, settledReturn }))));
  const gate = await b.evaluate(`(${objectVisibilityGateProbe.toString()})()`);
  record(`camera object registry ${backend}: any selected actor surface in view suppresses all structural and object cues`, gate.rows.length === 7 && gate.rows.every((row) => row.perceived && row.concealed) && gate.rows[0].fullyVisible && gate.rows[0].visibleActorSamples === 81 && gate.rows[0].hiddenActorSamples === 0 && gate.rows.filter((row) => ["fully visible actor", "partially visible actor", "two millimetre slit", "uncertified occlusion", "first person gate"].includes(row.name)).every((row) => !row.enabled && row.count === 0 && row.objects === 0 && row.structures === 0 && row.providers === 0) && gate.rows.filter((row) => ["hidden actor", "reopened"].includes(row.name)).every((row) => !row.anyVisible && row.enabled && row.objects > 0 && row.structures > 0) && gate.rows[1].anyVisible && !gate.rows[1].fullyVisible && gate.rows[1].visibleActorSamples > 0 && gate.rows[1].hiddenActorSamples > 0 && gate.rows[2].sliverWitness && gate.rows[2].anyVisible && gate.rows[2].visibleActorSamples === 0 && gate.rows[3].visibleActorSamples === 0, JSON.stringify(gate));
  record(`camera object registry ${backend}: an oblique underfloor view certifies solid cover across the near plane but preserves a two-millimetre visible slot`, gate.underfloor.length === 2 && gate.underfloor.every((row) => row.minimumDepth < row.near && row.maximumDepth > row.near) && !gate.underfloor[0].slot && !gate.underfloor[0].anyVisible && !gate.underfloor[0].witnessClear && gate.underfloor[0].enabled && gate.underfloor[0].structures > 0 && gate.underfloor[1].slot && gate.underfloor[1].anyVisible && gate.underfloor[1].witnessClear && !gate.underfloor[1].enabled && gate.underfloor[1].count === 0 && gate.underfloor[1].structures === 0 && gate.underfloor[1].objects === 0 && gate.underfloor[1].providers === 0, JSON.stringify(gate.underfloor));
  const grass = await b.evaluate(`(${grassOutlineProbe.toString()})()`);
  record(`camera object registry ${backend}: grass, flowers, bushes and Lab signs remain rendered but never enter nearby owners or outlines`, grass.grass > 100 && grass.flowers > 20 && grass.bushes > 20 && grass.labSign && grass.buildSign && grass.rendered && grass.excluded && grass.rows.length === 3 && grass.rows.every((row) => row.registered === 1 && row.nearby === 1 && row.controlLines > 0 && row.grassLines === 0 && row.flowerLines === 0 && !row.grassSources && !row.flowerSources && !row.grassNearby && !row.flowerNearby && !row.productionSources && !row.productionNearby), JSON.stringify(grass));
  const provider = await b.evaluate(`(${objectProviderStateProbe.toString()})()`);
  record(`camera object registry ${backend}: a grouped object's provider keeps ownership and opacity without individual contour candidates`, provider.initial.count === 0 && provider.initial.same && provider.initial.alpha === 0 && provider.visible.providers === 1 && provider.visible.alpha === 1 && provider.visible.same && provider.away.providers === 0 && provider.away.alpha === 1 && provider.returned.providers === 1 && provider.returned.alpha === 1 && provider.clear.providers === 0 && provider.clear.recognized && provider.clear.alpha === 0 && !provider.blocked.recognized && provider.blocked.alpha === 0 && provider.restored.providers === 1 && provider.removed.owners === 0 && provider.removed.providers === 0 && provider.gated.providers === 0 && provider.gated.same && provider.removedWhileGated.owners === 0 && provider.removedWhileGated.providers === 0 && !provider.removedWhileGated.same && provider.disposed, JSON.stringify(provider));
}));
for (const backend of ["webgl2", "canvas2d"]) task(`camera object fade ${backend}`, () => withPage(`camera object fade ${backend}`, hubPage(src, backend === "canvas2d" ? "canvas2d=1" : ""), async (b) => {
  const r = await b.evaluate(`(${objectFadeProbe.toString()})()`);
  const monotonic = (samples, direction) => samples.every((sample, i) => !i || (sample.alpha - samples[i - 1].alpha) * direction >= -1e-7);
  record(`camera object fade ${backend}: complete outlines fade over a quarter second with identical timing at 20 and 120 Hz and cached visibility`, r.rows.length === 2 && r.rateError < 1e-6 && r.rows.every((row) => row.fadeSeconds === 0.25 && row.initial.alpha === 0 && row.fadeIn.length === 7 && row.fadeOut.length === 7 && row.fadeIn[5].alpha === 1 && row.fadeOut[5].alpha === 0 && monotonic(row.fadeIn, 1) && monotonic(row.fadeOut, -1) && row.complete && row.alphaError < 1e-7 && row.cached && row.reversalJump < 1e-7 && row.beforeReverse > 0 && row.beforeReverse < 1 && row.recovered === 1 && row.orderChanged && row.reorderError < 1e-7 && row.possessionReset), JSON.stringify(r));
  record(`camera object fade ${backend}: proximity fades smoothly from 10.5 to 12 metres and retains every contour until the boundary fade completes`, r.rows.every((row) => row.fadeStart === 10.5 && row.distances.length === 7 && row.distances.every((sample) => Math.abs(sample.alpha - sample.expected) < 1e-6) && row.boundary[0].alpha === 1 && row.boundary.at(-1).alpha === 0 && row.boundary.every((sample) => sample.alpha > 1e-7 ? sample.count === 4 : sample.count === 0) && row.hiddenCleared && row.removedCleared && row.releasedCleared && row.disposed && row.reentry === 0), JSON.stringify(r.rows.map(({ distances, boundary, hiddenCleared, removedCleared, releasedCleared, disposed, reentry }) => ({ distances, boundary, hiddenCleared, removedCleared, releasedCleared, disposed, reentry }))));
  record(`camera object fade ${backend}: the actual overlay pixels follow the shared whole-object opacity`, r.rows.every((row) => row.fadeIn[0].pixels === 0 && row.fadeOut.at(-1).pixels === 0 && row.fadeIn.at(-1).pixels > 100 && row.fadeIn.every((sample, i, samples) => !i || sample.pixels >= samples[i - 1].pixels) && row.fadeOut.every((sample, i, samples) => !i || sample.pixels <= samples[i - 1].pixels) && new Set(row.fadeIn.map((sample) => sample.pixels)).size >= 5), JSON.stringify(r.rows.map((row) => ({ dt: row.dt, in: row.fadeIn.map((sample) => sample.pixels), out: row.fadeOut.map((sample) => sample.pixels) }))));
  record(`camera object fade ${backend}: a camera-visible surface immediately suppresses the whole outline without resetting its fade history`, r.rows.every((row) => row.beforeVisible.count === 4 && row.visible.count === 0 && row.visible.pixels === 0 && row.visible.alpha === row.beforeVisible.alpha && row.hiddenReturn.count === 4 && row.hiddenReturn.pixels > 100 && row.hiddenReturn.alpha === row.beforeVisible.alpha), JSON.stringify(r.rows.map(({ dt, beforeVisible, visible, hiddenReturn }) => ({ dt, beforeVisible, visible, hiddenReturn }))));
}));
for (const backend of ["webgl2", "canvas2d"]) task(`camera trajectory ${backend}`, () => withPage(`camera trajectory ${backend}`, hubPage(src, backend === "canvas2d" ? "canvas2d=1" : ""), async (b) => {
  const r = await b.evaluate(`(${cameraEntryTrajectoryProbe.toString()})()`);
  record(`camera trajectory ${backend}: angled scroll transitions remain smooth outdoors and on both access-ramp levels`, r.rows.length === 8 && r.rows.every(({ metrics: m }) => m.maximumSpeed < 40 && m.maximumAcceleration < 600 && m.minimumDirectionDot > 0.95 && m.motionChecks > 10 && m.bodyMovement < 1e-7 && m.eyeViolations === 0 && m.firstPerson && m.firstPersonHeadGap < 0.5), JSON.stringify(r.rows.map(({ dt, pitch, ramp, metrics, worst }) => ({ dt, pitch, ramp, metrics, worst }))));
  const reversals = r.rows.filter((row) => row.reversals).map((row) => row.reversals);
  record(`camera trajectory ${backend}: reversing a partial zoom preserves the rendered eye and viewing direction through subsequent frames`, reversals.length === 2 && reversals.every((row) => row.events >= 6 && row.positiveFrames > 30 && row.maximumJump < 1e-5 && row.minimumForwardDot > 0.9999 && row.maximumSpeed < 40 && row.maximumAcceleration < 600), JSON.stringify(reversals));
  const reset = await b.evaluate(`(${cameraMotionResetProbe.toString()})()`);
  record(`camera trajectory ${backend}: possession clears prior free-camera velocity before first-person entry`, reset.rows.length === 2 && reset.rows.every((row) => row.before < 1e-9 && row.firstStep < 1e-9 && row.maximumSeparation < 1e-9 && row.samples >= 20 && row.finite && row.entered), JSON.stringify(reset));
}));
task("weighted delivery", weightedDelivery);
task("cave camera canvas2d", () => matrixNavigation("canvas2d"));
task("soak: donations (race)", soakRaceDonations);
task("soak: donations (hub night)", () => soakDonations("hub night", hubPage(src, "hour=22")));
task("soak: donations (hub)", () => soakDonations("hub", hubPage(src)));
task("soak: donations (lab)", () => soakDonations("lab", page(src), { w: 1920 }));
task("soak: donations (drop)", soakDropDonations);
task("soak: scene cycles", soakScenes);
task("soak: race cycles", soakRace);
task("sky altitude", () => withPage("sky altitude", hubPage(src, "hour=22&day=80"), async (b) => {
  const r = await b.evaluate(`(${skyAltitudeProbe.toString()})()`);
  record("sky altitude: visible upper stars retain identical angular positions from the abyss through the full jetpack flight range", r.backend === "webgl2" && r.starPixels > 100 && r.translations.length === 6 && r.translations.every((p) => p.changed === 0), JSON.stringify({ stars: r.starPixels, translations: r.translations }));
  record("sky altitude: turning, looking upward, and advancing sidereal time move the star field", r.yaw.changed > 1000 && r.pitch.changed > 1000 && r.sidereal.changed > 1000, JSON.stringify({ yaw: r.yaw, pitch: r.pitch, sidereal: r.sidereal }));
  record("sky altitude: climbing lowers the horizon haze and reveals previously hidden stars", r.haze.length === 4 && r.haze.every((p, i, rows) => !i || p.stars > rows[i - 1].stars && p.horizonRow < rows[i - 1].horizonRow) && r.haze.at(-1).below > r.haze[0].below + 100, JSON.stringify(r.haze));
  const canvas = await b.evaluate(`(${canvasHazeProbe.toString()})()`);
  record("sky altitude: Canvas lowers the same haze bank and restores its ground-level view on descent", canvas.backend === "canvas2d" && canvas.rows.slice(0, 4).every((p, i, rows) => !i || p.horizonRow > rows[i - 1].horizonRow) && canvas.rows.at(-1).horizonRow === canvas.rows[0].horizonRow && canvas.rows.at(-1).bottom.every((v, i) => v === canvas.rows[0].bottom[i]), JSON.stringify(canvas.rows));
}));
task("hub camera", hubCamera);
task("hub perspective", hubPerspective);
task("hub trailing cave split", hubTrailingCaveSplit);
task("hub perspective touch", hubPerspectiveTouch);
task("hub perspective canvas", hubPerspectiveCanvas);
for (const backend of ["webgl2", "canvas2d"]) task(`campfire ${backend}`, () => withPage(`campfire ${backend}`, hubPage(src, backend === "canvas2d" ? "canvas2d=1" : ""), async (b) => {
  const r = await b.evaluate(`(${campfireProbe.toString()})(${JSON.stringify({ dt: backend === "webgl2" ? 1 / 20 : 1 / 120 })})`);
  record(`campfire ${backend}: benches and hearth have solid sides and seats face the fire`, r.collision.bench && r.collision.hearth && r.collision.walkingClear && r.collision.flameNotSolid && Math.abs(r.collision.benchTop - 0.58) < 1e-5 && r.seats.length === 4 && r.seats.every((seat) => seat.prompt === "SIT" && seat.selected && seat.facing > 0.999 && seat.held && seat.stood && Math.abs(seat.feet) < 0.02) && r.movementStands, JSON.stringify(r));
  record(`campfire ${backend}: flame contact switches Space to an uninterrupted roll, then smoke and soot clear without growing the effect pool`, r.fire.length === 2 && r.fire.every((f) => f.lit && f.startsAtLegs && f.beforeRollClean && f.charDuringRoll && f.onlyReachedParts && f.nativeColors && f.prompt === "DROP & ROLL!" && f.particles > 0 && f.nearbyFlames > 0 && f.rolling && f.travel > 0.3 && f.positive && f.negative && f.repeatKeptProgress && f.out && f.smoke && f.fading && f.cleared && f.stableNodes && f.particlesAfter === 0), JSON.stringify(r.fire));
  const d = r.delayed;
  record(`campfire ${backend}: delaying the roll spreads flames slowly upward and rolling chars only the reached body surfaces`, d.initial[2] > 0 && d.initial[0] === 0 && d.initial[1] === 0 && d.middle[0] > 0 && d.middle[1] === 0 && d.late[1] > 0.5 && d.cleanUntilRoll && d.charDuringRoll && d.frozenSpread && d.reachedHead && d.nativeColors && d.cleared && d.particlesAfter === 0, JSON.stringify(d));
  const transitions = [...r.fire.map((f) => f.rollTransition), d.rollTransition];
  record(`campfire ${backend}: ember and char blend throughout the roll without a color jump on standing`, transitions.every((t) => t.samples >= 2.9 / r.dt && t.monotonicScorch && t.untouchedClean && t.mixedDuringRoll && t.maxScorchStep < r.dt * 0.6 + 0.002 && t.standScorchStep < r.dt * 0.11 + 0.003 && t.standGlowStep < 0.01) && r.fire.every((f) => f.rollTransition.untouchedParts >= 2), JSON.stringify(transitions));
}));
for (const backend of ["webgl2", "canvas2d"]) task(`fire avoidance ${backend}`, () => withPage(`fire avoidance ${backend}`, hubPage(src, backend === "canvas2d" ? "canvas2d=1" : ""), async (b) => {
  const r = await b.evaluate(`(${fireAvoidanceProbe.toString()})(${JSON.stringify({ dt: backend === "webgl2" ? 1 / 20 : 1 / 120 })})`);
  record(`fire avoidance ${backend}: NPCs detour around both lit pits and still reach their original destinations`, r.backend === backend && r.lit.length === 4 && r.lit.every((row) => row.lit && row.arrived && row.distance < 1e-6 && !row.burning && row.preserved && row.clear && row.minimumDistance >= 1 - 1e-7 && row.lateral > 0.5 && row.maximumStep <= 1.7 * r.dt + 1e-7 && row.jumps === 0), JSON.stringify(r.lit));
  record(`fire avoidance ${backend}: the safety margin permits escape but rejects inward steps and burning destinations`, r.query.blocked && r.query.outward && !r.query.inward && !r.query.destination && r.escape.arrived && r.escape.distance < 1e-6 && !r.escape.burning && r.escape.preserved && r.escape.clear && r.escape.minimumDistance >= 0.8 - 1e-7 && r.rejected.changed && r.rejected.safe, JSON.stringify({ query: r.query, escape: r.escape, rejected: r.rejected }));
  record(`fire avoidance ${backend}: unlit outdoor embers stay walkable and manual players can still enter the flames`, !r.unlit.lit && r.unlit.arrived && r.unlit.distance < 1e-6 && !r.unlit.burning && r.unlit.preserved && r.unlit.clear && r.unlit.minimumDistance < 0.65 && r.player.burning && r.player.controlled && r.player.moved > 0.5 && r.player.distance < 0.65, JSON.stringify({ unlit: r.unlit, player: r.player }));
}));
for (const backend of ["webgl2", "canvas2d"]) task(`fire contact ${backend}`, () => withPage(`fire contact ${backend}`, hubPage(src, backend === "canvas2d" ? "canvas2d=1" : ""), async (b) => {
  const r = await b.evaluate(`(${fireContactProbe.toString()})(${JSON.stringify({ dt: backend === "webgl2" ? 1 / 20 : 1 / 120 })})`);
  const g = r.glow;
  record(`fire contact ${backend}: embers heat with each part’s burn age and cool into native char during rolling`, g.early[2] > 0 && g.early[3] > 0 && g.early[0] === 0 && g.early[1] === 0 && g.middle[0] > 0 && g.middle[1] === 0 && g.late.every((v) => v > 0) && g.rolling.every((v, i) => v < g.late[i]) && g.brightensAtFixedCoverage && g.oldLegHotter && g.cleanBeforeRoll && g.charDuringRoll && g.out && g.scorched && g.nativeParts, JSON.stringify(g));
  record(`fire contact ${backend}: walking contact spreads fire in both directions while walls and height separate it`, Object.values(r.separation).every(Boolean) && r.walking.lit && r.walking.moved > 0.3 && r.walking.distance >= 0.675 && r.walking.distance <= 0.81 && r.walking.prompt === "DROP & ROLL!" && r.walking.stableIgnition && r.reverse.lit && r.reverse.prompt === "DROP & ROLL!" && r.reverse.rolling, JSON.stringify({ separation: r.separation, walking: r.walking, reverse: r.reverse }));
  record(`fire contact ${backend}: NPCs run before varied reactions, extinguish themselves, and resume their routines`, r.varyingDelays >= 2 && r.reactions.length === 3 && r.reactions.every((n) => n.delay >= 0.6 && n.delay <= 13 && n.age >= n.delay && n.age <= n.delay + 2 * r.dt && n.panicTravel > 0.1 && n.began && n.out && n.cooldown && n.recovery && n.embersOut && n.resumes) && r.contactCooldown.sourceBurning && r.contactCooldown.protected && r.contactCooldown.remaining > 0, JSON.stringify({ reactions: r.reactions, cooldown: r.contactCooldown }));
  const sleeper = r.sleeper, reaction = sleeper.reaction;
  record(`fire contact ${backend}: a sleeping Ooga wakes, frees its bed, and rolls to extinguish contact fire`, sleeper.admitted && sleeper.resting && sleeper.lit && sleeper.awake && sleeper.bedFreed && reaction.age >= reaction.delay && reaction.age <= reaction.delay + 2 * r.dt && reaction.began && reaction.out && reaction.embersOut && reaction.resumes, JSON.stringify(sleeper));
  const rendered = await b.evaluate(`(${emberRenderProbe.toString()})()`);
  for (const row of rendered.rows) record(`fire contact ${backend}: ${row.name}`, row.ok, JSON.stringify(row));
  const masked = await b.evaluate(`(${maskedHeadEmberProbe.toString()})()`);
  for (const row of masked.rows) record(`fire contact ${backend}: ${row.name}`, row.ok, JSON.stringify(row));
}));
for (const backend of ["webgl2", "canvas2d"]) task(`fire panic ${backend}`, () => withPage(`fire panic ${backend}`, hubPage(src, backend === "canvas2d" ? "canvas2d=1" : ""), async (b) => {
  const r = await b.evaluate(`(${firePanicProbe.toString()})(${JSON.stringify({ dt: backend === "webgl2" ? 1 / 20 : 1 / 120 })})`);
  record(`fire panic ${backend}: burning NPCs run at twice their walking speed and recover after varied burn coverage`, Math.abs(r.ordinarySpeed - 1.7) < 0.01 && r.reactions.length >= 6 && r.reactions.every((n) => n.delay >= 0.6 && n.delay <= 13 && n.age >= n.delay && n.age <= n.delay + 2 * r.dt && Math.abs(n.panicSpeed - n.speed * 2) < 1e-6 && Math.abs(n.firstSpeed - n.speed * 2) < 0.01 && n.travel > 0.1 && n.clear && n.graphCalls === 0 && n.began && n.out && n.resumed) && r.reactions.some((n) => n.coverage[2] > 0 && n.coverage[3] > 0 && n.coverage[0] === 0 && n.coverage[1] === 0 && n.coverage[4] === 0 && n.coverage[5] === 0) && r.reactions.some((n) => n.coverage.every((v) => v === 1)), JSON.stringify(r.reactions));
  const f = r.flee, o = r.obstacle;
  record(`fire panic ${backend}: nearby NPCs flee at double speed across the meadow while player control stays manual`, f.active && f.unburned && Math.abs(f.speed - f.expectedSpeed) < 0.01 && f.gained > 1.8 && f.offPath && f.graphCalls === 0 && f.clear && f.playerHeld, JSON.stringify(f));
  record(`fire panic ${backend}: escape respects obstacles and floors, then resumes ordinary routines`, o.blocked && o.clear && o.detour > 0.3 && o.travel > 0.3 && o.unburned && r.recovered && r.separation.differentFloor && r.separation.behindWall, JSON.stringify({ obstacle: o, recovered: r.recovered, separation: r.separation }));
}));
for (const backend of ["webgl2", "canvas2d"]) task(`fire panic memory ${backend}`, () => withPage(`fire panic memory ${backend}`, hubPage(backend === "webgl2" ? src : dist, backend === "canvas2d" ? "canvas2d=1" : ""), async (b) => {
  const r = await b.evaluate(`(${fireFleeMemoryProbe.toString()})(${JSON.stringify({ dt: backend === "webgl2" ? 1 / 20 : 1 / 120 })})`), f = r.far, s = r.stationary;
  record(`fire panic memory ${backend}: distant fire starts a double-speed escape and saves the interrupted route`, f.initialDistance === 6.5 && f.detected && f.settled && f.routeSaved && Math.abs(f.firstSpeed - 3.4) < 1e-6 && f.distance >= 10, JSON.stringify(f));
  record(`fire panic memory ${backend}: reaching safety preserves the stationary source's position without returning toward it`, s.held && s.sourceHeld && s.clear && s.grounded && s.drift === 0 && s.minimumDistance >= 10 && s.graphCalls === 0 && s.snapshotError === 0 && s.maximumStep <= 3.4 * r.dt + 1e-7 && r.smallMove.held && r.smallMove.drift === 0 && r.smallMove.graphCalls === 0, JSON.stringify({ stationary: s, smallMove: r.smallMove }));
  const released = (row) => row.released && row.restored && row.cleared && row.returned > 0.5;
  record(`fire panic memory ${backend}: source movement or extinction releases the saved route`, released(r.moved) && r.moved.sourceStillBurning && released(r.extinguished) && r.extinguished.sourceOut, JSON.stringify({ moved: r.moved, extinguished: r.extinguished }));
  const m = r.multiple;
  record(`fire panic memory ${backend}: extinguishing one fire preserves the other remembered threat`, m.bothKnown && m.firstCleared && m.secondRetained && m.hold.held && m.hold.drift === 0 && m.hold.graphCalls === 0 && released(m.final), JSON.stringify(m));
}));
for (const backend of ["webgl2", "canvas2d"]) task(`fire wake hub ${backend}`, () => withPage(`fire wake hub ${backend}`, hubPage(src, backend === "canvas2d" ? "canvas2d=1" : ""), async (b) => {
  const r = await b.evaluate(`(${fireWakeProbe.toString()})(${JSON.stringify({ dt: backend === "webgl2" ? 1 / 20 : 1 / 120 })})`), a = r.air, p = r.player;
  record(`fire wake hub ${backend}: ignition interrupts an airborne bed route without snapping height or stopping gravity`, a.landingRoute && a.lit && a.preservedY < 1e-6 && a.preservedVelocity < 1e-6 && a.gravityError < 1e-6 && a.positionError < 1e-6 && a.stillAirborne && a.routeInterrupted, JSON.stringify(a));
  record(`fire wake hub ${backend}: waking a sleeping player keeps manual control after extinguishing and refreshing`, p.admitted && p.sleeping && p.lit && p.awake && p.overrideCleared && p.controlledWhileBurning && p.refreshKeptControl && p.movement > 0.1, JSON.stringify(p));
}));
for (const backend of ["webgl2", "canvas2d"]) task(`fire wake lab ${backend}`, () => withPage(`fire wake lab ${backend}`, page(src, backend === "canvas2d" ? "canvas2d=1" : ""), async (b) => {
  const r = await b.evaluate(`(${labFireWakeProbe.toString()})(${JSON.stringify({ dt: backend === "webgl2" ? 1 / 20 : 1 / 120 })})`);
  record(`fire wake lab ${backend}: a sleeping NPC runs and rolls, then returns to its bedding and sleeping pose`, r.sleeping && r.lit && r.woke && r.planted && r.rolled && r.restored && r.pose && r.staysAsleep, JSON.stringify(r));
}));
for (const backend of ["webgl2", "canvas2d"]) task(`head camera boundary ${backend}`, () => withPage(`head camera boundary ${backend}`, hubPage(src, backend === "canvas2d" ? "canvas2d=1" : ""), async (b) => {
  const r = await b.evaluate(`(${headCameraProbe.toString()})()`);
  record(`head camera boundary ${backend}: entry and exit suppress head and accessory interiors as soon as the near plane reaches them`, r.rows.length === 12 && r.failures.length === 0 && r.rows.every((row) => row.entry.outside > 0 && row.entry.inside > 0 && row.exit.outside > 0 && row.exit.inside > 0 && row.firstHidden && row.exitStillInside && row.trailingVisible) && r.rows.some((row) => row.entry.clippedOutside > 0) && r.rows.some((row) => row.exit.clippedOutside > 0), JSON.stringify(r));
}));
for (const backend of ["webgl2", "canvas2d"]) for (const mode of ["trailing", "first-person", "eye-level"]) {
  const name = `matrix respawn ${backend} ${mode}`;
  task(name, () => withPage(name, hubPage(src, backend === "canvas2d" ? "canvas2d=1" : ""), async (b) => {
    const fall = mode === "eye-level" ? basementHoleFreeEyeProbe : abyssRespawnProbe;
    const r = await b.evaluate(`(${matrixRespawnProbe.toString()})(() => (${fall.toString()})(${JSON.stringify({ mode, dt: backend === "webgl2" ? 1 / 20 : 1 / 120 })}))`);
    record(`${name}: the first respawn frame disables Matrix while preserving perspective and possession`, r.normalNavigationKeepsMatrix && r.fallingFrames > 0 && r.heldDuringFall && !!r.respawn && r.failures.length === 0 && r.arrival?.off && r.arrival.mode === mode && r.arrival.selected === (mode !== "eye-level") && r.staysOff && r.canEnableAgain, JSON.stringify(r));
  }));
}
task("matrix character activation", matrixCharacterActivation);
task("matrix first-person boundary webgl2", () => matrixFirstPersonBoundary("webgl2"));
task("matrix first-person boundary canvas2d", () => matrixFirstPersonBoundary("canvas2d"));
task("soak: drop cycles", soakDrop);
task("hub crew", hubCrew);
task("drop board", dropBoard);
task("drop controls", dropControls);
task("hub flight", hubFlight);
task("hub jetpack", hubJetpack);
task("governor", governor);
task("weighted delivery canvas", weightedDeliveryCanvas);
task("soak: GPU residency", soakResidency);
task("keys", keys);
task("hub race route", hubRace);
task("hub drive", hubDrive);
task("driven smoke", drivenSmoke);
for (const backend of ["webgl2", "canvas2d"]) task(`driven smoke grounding ${backend}`, () => withPage(`driven smoke grounding ${backend}`, hubPage(src, backend === "canvas2d" ? "canvas2d=1" : ""), async (b) => {
  const r = await b.evaluate(`(${drivenSmokeGroundProbe.toString()})()`);
  record(`driven smoke grounding ${backend}: only ground travel emits puffs, including the first frame off a ledge`, r.backend === backend && r.rows.length === 5 && r.rows.every((row) => row.ok), JSON.stringify(r));
}));
task("mask breath hub webgl2", () => maskBreath("webgl2"));
task("mask breath hub canvas2d", () => maskBreath("canvas2d"));
task("mask breath lab webgl2", () => maskBreath("webgl2", true));
task("mask breath lab canvas2d", () => maskBreath("canvas2d", true));
task("fan", fan);
task("race phone", racePhone);
task("hub drop route", hubDrop);
// The locker counts the inventory, so it goes before the crates whose tips hand out loot
task("locker + crates", () => fold(page(src, "loot=1"), [locker, crates]));
task("race garage", raceGarage);
task("race tracks + physics + AI", () => fold(racePage(src), [raceTracks, racePhysics, raceAi]));
task("hub", hub);
task("race canvas", raceCanvas);
task("matrix rain canvas2d", () => matrixRain("canvas2d"));
task("hub props", hubProps);
task("drop flow", dropFlow);
task("phone", phone);
task("race items", raceItems);
task("sheet intro", sheetIntro);
task("matrix canvas2d", () => fold(hubPage(src, "canvas2d=1"), [matrixPhotometry("canvas2d"), matrixHorizontal("canvas2d")]));
task("drop phone", dropPhone);
task("race results", raceResults);
task("matrix rain webgl2", () => matrixRain("webgl2"));
task("matrix webgl2", () => fold(hubPage(src), [matrixPhotometry("webgl2"), matrixPhotometry("webgl2", false), matrixHorizontal("webgl2"), matrixCaves]));
task("hub hop-off", hubHopOff);
task("race weather", raceWeather);
task("cave camera webgl2", () => matrixNavigation("webgl2"));
task("lab drive", labDrive);
task("pile parameter", pileParameter);
task("hub dist", hubDist);
task("props", props);
task("scenes + refresh + weapons", () => fold(page(src), [scenes, refresh, weapons]));
task("race audio", raceAudio);
task("drop audio", dropAudio);
task("race cup", raceCup);
task("drop canvas", dropCanvas);
task("daylight canvas", daylightCanvas);
task("banner clock", bannerClock);
task("preloaded debug view", preloadedDebugView);
task("debug basement view", debugBasementView);
task("debug time URL", debugTimeUrl);
task("canvas2d fallback", fallback);
task("canvas culling", () => withPage("canvas culling", hubPage(src, "canvas2d=1"), async (b) => {
  const r = await b.evaluate(`(${canvasCullingProbe.toString()})()`);
  record("canvas culling: offscreen faces and lines submit no draw calls and preserve every visible pixel", r.changed === 0 && r.visibleCalls === 11 && r.extendedCalls === r.visibleCalls, JSON.stringify(r));
  record("canvas culling: crossing polygons, crossing lines, and glow outside the viewport remain visible", r.upper > 100 && r.crossing > 100 && r.edgeGlow > 0, JSON.stringify(r));
}));
task("hub route", hubRoute);
task("headquarters", headquarters);
task("movement collision webgl2", () => movementCollision("webgl2"));
task("movement collision canvas2d", () => movementCollision("canvas2d"));
task("movement windows webgl2", () => movementWindows("webgl2"));
task("movement windows canvas2d", () => movementWindows("canvas2d"));
task("window jump webgl2", () => windowJump("webgl2"));
task("window jump canvas2d", () => windowJump("canvas2d"));
task("window flares", windowFlares);
task("movement ceiling webgl2", () => movementCeiling("webgl2"));
task("movement ceiling canvas2d", () => movementCeiling("canvas2d"));
task("navigation buttons webgl2", () => navigationButtons("webgl2"));
task("navigation buttons canvas2d", () => navigationButtons("canvas2d"));
task("navigation buttons mobile", navigationButtonsMobile);
task("ramp ceiling webgl2", () => rampCeiling("webgl2"));
task("ramp ceiling canvas2d", () => rampCeiling("canvas2d"));
task("entrance ceiling webgl2", () => entranceCeiling("webgl2"));
task("entrance ceiling canvas2d", () => entranceCeiling("canvas2d"));
task("walking parity webgl2", () => walkingParity("webgl2"));
task("walking parity canvas2d", () => walkingParity("canvas2d"));
task("jump and jetpack webgl2", () => jumpJetpack("webgl2"));
task("jump and jetpack canvas2d", () => jumpJetpack("canvas2d"));
for (const backend of ["webgl2", "canvas2d"]) for (const kind of ["matrix", "bench", "race", "drop"]) {
  const name = `contextual actions ${backend} ${kind}`;
  task(name, () => withPage(name, hubPage(backend === "webgl2" ? src : dist, backend === "canvas2d" ? "canvas2d=1" : ""), async (b) => {
    const mode = backend === "webgl2" ? "trailing" : "first-person";
    const r = await b.evaluate(`(${contextualActionProbe.toString()})(${JSON.stringify({ kind, mode })})`);
    record(`${name}: walking and mouse-chord presses jump immediately without activating nearby objects`, !r.enteredWhileMoving && r.rows.length === (kind === "race" || kind === "drop" ? 5 : 1) && r.rows.every((row) => row.clear && row.moving === "JUMP!" && [row.fresh, row.held, row.chord].every((press) => press.jumped && press.unchanged)), JSON.stringify(r.rows));
    record(`${name}: stopped controls have usable reach around the object while looking preserves the action`, r.rows.every((row) => row.stopped === r.expected && row.looking === r.expected) && (kind === "race" || kind === "drop" ? r.wrongFloor !== r.expected && r.far !== r.expected : true), JSON.stringify({ expected: r.expected, rows: r.rows.map((row) => ({ point: row.point, stopped: row.stopped, looking: row.looking })), wrongFloor: r.wrongFloor, far: r.far }));
    record(`${name}: airborne presses keep the second jump and fire emergencies still take priority`, r.rows.every((row) => row.airborne.label === "JUMP!" && row.airborne.elevated && row.airborne.unchanged && row.airborne.secondJump) && (kind !== "bench" || r.emergency.prompt === "DROP & ROLL!" && r.emergency.rolling), JSON.stringify({ airborne: r.rows.map((row) => row.airborne), emergency: r.emergency }));
    const a = r.stoppedAction;
    record(`${name}: releasing movement restores the action before the next input frame`, !!a && !a.jumped && (kind === "matrix" ? a.toggled : kind === "bench" ? a.seated : a.released && a.scene === kind && a.selected), JSON.stringify(a));
  }));
}
task("jetpack range webgl2", () => jetpackRange("webgl2"));
task("jetpack range canvas2d", () => jetpackRange("canvas2d"));
task("jetpack fall webgl2", () => jetpackFall("webgl2"));
task("jetpack fall canvas2d", () => jetpackFall("canvas2d"));
task("cloud support webgl2", () => cloudSupport("webgl2"));
task("cloud support canvas2d", () => cloudSupport("canvas2d"));
task("cloud low support webgl2", () => cloudLowSupport("webgl2"));
task("cloud low support canvas2d", () => cloudLowSupport("canvas2d"));
task("ramp window contact webgl2", () => rampWindowContact("webgl2"));
task("ramp window contact canvas2d", () => rampWindowContact("canvas2d"));
task("jetpack notches webgl2", () => jetpackNotches("webgl2"));
task("jetpack notches canvas2d", () => jetpackNotches("canvas2d"));
task("basement hole webgl2", () => basementHole("webgl2"));
task("basement hole canvas2d", () => basementHole("canvas2d"));
task("basement shaft jetpack webgl2", () => basementShaftJetpack("webgl2"));
task("basement shaft jetpack canvas2d", () => basementShaftJetpack("canvas2d"));
task("jetpack debug startup webgl2", () => jetpackDebugStartup("webgl2"));
task("jetpack debug startup canvas2d", () => jetpackDebugStartup("canvas2d"));
task("convex collision", convexCollision);
task("wall landing webgl2", () => wallLanding("webgl2"));
task("wall landing canvas2d", () => wallLanding("canvas2d"));
task("jetpack HUD desktop", () => jetpackHud());
task("jetpack HUD mobile", () => jetpackHud(true));
task("jetpack HUD landscape", () => jetpackHud(true, true));
task("matrix gate clipping", matrixGateClipping);
task("pile cap parameter", pileCapParameter);
task("drop physics", dropPhysics);
for (const backend of ["webgl2", "canvas2d"]) task(`path depth ${backend}`, () => withPage(`path depth ${backend}`, hubPage(backend === "webgl2" ? src : dist, `bananas=1000000${backend === "canvas2d" ? "&canvas2d=1" : ""}`), async (b) => {
  const r = await b.evaluate(`(${pathDepthProbe.toString()})(${JSON.stringify({ backend })})`);
  if (backend === "webgl2") {
    record("path depth: distant path interiors cover grass at low and high quality", r.rows.length === 12 && r.rows.every((row) => row.samples > 100 && row.correctedGrass === 0), JSON.stringify(r.rows));
    record("path depth: nearby paths stay unchanged and foreground objects still occlude distant paths", r.rows.filter((row) => row.distance === 12).every((row) => row.delta === 0) && r.foreground > 100 && r.occluded === 0 && r.undersidePath === 0, JSON.stringify({ nearby: r.rows.filter((row) => row.distance === 12), foreground: r.foreground, occluded: r.occluded, undersidePath: r.undersidePath }));
  } else record("path depth: Canvas preserves its existing path layering", r.rows.length === 12 && r.rows.every((row) => row.samples > 100 && row.delta === 0) && r.foreground > 100 && r.occluded === 0, JSON.stringify(r));
}));
// No frame-rate check here, but it compares against what dynamic paths recorded
task("mirror canvas", mirrorCanvas, { after: "dynamic paths" });
// Frame-rate and per-frame-cost measurements, alone on the machine
task("core", () => core("source", src), { serial: true });
task("dynamic paths", dynamicPaths, { serial: true });
task("daylight night", daylightNight, { serial: true });
task("day cycle", dayCycle, { serial: true });
// The wave probe expects a resting wave, so it goes first; the mirror cave counts allocations from a fresh page, so it keeps its own
task("matrix wave webgl2 + hub pile", () => fold(hubPage(src), [matrixWave("webgl2"), hubPile]), { serial: true });
task("mirror cave", () => fold(hubPage(src), [mirrorCave]), { serial: true });
task("matrix wave canvas2d", () => fold(hubPage(src, "canvas2d=1"), [matrixWave("canvas2d")]), { serial: true });

const runTasks = async () => {
  const finished = new Map();
  const start = (t) => {
    const promise = (finished.get(t.after) || Promise.resolve()).then(() => t.run());
    finished.set(t.name, promise);
    return promise;
  };
  // ONLY=race runs just the blocks whose name contains it
  const picked = tasks.filter((t) => !process.env.ONLY || t.name.includes(process.env.ONLY));
  // A focused check still needs the reference state its explicit prerequisite
  // records (for example WebGL scenery before the Canvas parity check).
  for (const t of picked) if (t.after && !picked.some((dependency) => dependency.name === t.after)) {
    picked.push(tasks.find((dependency) => dependency.name === t.after));
  }
  const queue = picked.filter((t) => !t.serial);
  const lane = async () => {
    while (queue.length) await start(queue.shift());
  };
  for (const t of picked.filter((t) => t.serial)) await start(t);
  await Promise.all(Array.from({ length: LANES }, lane));
};
await runTasks();

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed in ${(performance.now() / 60000).toFixed(1)} min`);
process.exit(failed.length ? 1 : 0);
