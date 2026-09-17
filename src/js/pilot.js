// The visitor's camera, flight and possession
(() => {
  "use strict";
  const BL = window.BL = window.BL || {};
  const { clamp, damp, mat4, quat } = BL.math;
  const { boundsOf, updateWorld } = BL.scene;
  const { create: createControls } = BL.controls;
  const BASE_FOV = 48 * Math.PI / 180;
  const MAX_FOV = 64 * Math.PI / 180;
  const MIN_HFOV = 58 * Math.PI / 180;
  const YAW_RATE = 1.7, PITCH_RATE = 1.1;
  // Keep a tiny horizontal component so the vertical view retains its yaw.
  const TRAILING_PITCH = [-Math.PI / 2 + 1e-4, Math.PI / 2 - 1e-4];
  const CLOSE_RATE = 12, CLOSE_SNAP = 0.001, CLOSE_PINCH_EXIT = 1.08, CLOSE_LOOK_DIST = 4;
  const CLOSE_GROUND_RATE = 9, CLOSE_TELEPORT = 0.8;
  const WALK = { speed: 7.75, gravity: 9.8, step: 0.6, ledgeRise: 2.4, ledgeSpeed: 3, ledgeDrag: 1.5 };
  // The camera swings behind while walking forward
  const FOLLOW_TURN = 1.8, DRAG_HOLD = 1.5;
  // Act button labels, action or jetpack throttle
  const ACT_DO = "JUMP!", ACT_FLY = "Blast off!";
  // Camera rotations carry look and up together, including a sleeper's roll.
  // Local -Z looks forward; local +Y is the top of the rendered image.
  const viewRotation = (out, fx, fy, fz, ux, uy, uz, yaw) => {
    let length = Math.hypot(fx, fy, fz);
    if (length < 1e-9) { fx = -Math.sin(yaw); fy = 0; fz = -Math.cos(yaw); length = 1; }
    const bx = -fx / length, by = -fy / length, bz = -fz / length;
    let rx = uy * bz - uz * by, ry = uz * bx - ux * bz, rz = ux * by - uy * bx;
    length = Math.hypot(rx, ry, rz);
    if (length < 1e-9) { rx = Math.cos(yaw); ry = 0; rz = -Math.sin(yaw); length = 1; }
    rx /= length; ry /= length; rz /= length;
    ux = by * rz - bz * ry; uy = bz * rx - bx * rz; uz = bx * ry - by * rx;
    const trace = rx + uy + bz;
    if (trace > 0) {
      const s = Math.sqrt(trace + 1) * 2;
      out[0] = (uz - by) / s; out[1] = (bx - rz) / s; out[2] = (ry - ux) / s; out[3] = s / 4;
    } else if (rx > uy && rx > bz) {
      const s = Math.sqrt(1 + rx - uy - bz) * 2;
      out[0] = s / 4; out[1] = (ux + ry) / s; out[2] = (bx + rz) / s; out[3] = (uz - by) / s;
    } else if (uy > bz) {
      const s = Math.sqrt(1 + uy - rx - bz) * 2;
      out[0] = (ux + ry) / s; out[1] = s / 4; out[2] = (by + uz) / s; out[3] = (bx - rz) / s;
    } else {
      const s = Math.sqrt(1 + bz - rx - uy) * 2;
      out[0] = (bx + rz) / s; out[1] = (by + uz) / s; out[2] = s / 4; out[3] = (ry - ux) / s;
    }
    quat.normalize(out);
  };
  const create = (ctx) => {
    const { renderer, canvas, camera, hud, presets, dist: [DIST_MIN, DIST_MAX], follow, fly, clampTarget, clampCamera, coarse, close = null } = ctx;
    let crew = null, fx = null;
    const freeTarget = { x: 0, y: 0, z: 0 };
    const followTarget = { x: 0, y: 0, z: 0 };
    const view = presets[ctx.landing];
    const orbit = { ...view, tYaw: view.yaw, tPitch: view.pitch, tDist: view.dist, tx: view.target.x, ty: view.target.y, tz: view.target.z };
    let freeStrafe = 0, freeForward = 0, freeClimb = 0, freeMoveYaw = view.yaw;
    let closeWanted = false, closeMix = 0, closeVelocity = 0, closeRate = CLOSE_RATE, distanceVelocity = 0, closeExitScale = 1, closeCave = null, hiddenHead = null, hiddenHeadCameraHidden = false, viewPitch = orbit.pitch;
    let groundView = 0, groundTarget = 0, groundX = 0, groundZ = 0, groundZone = 0, groundValid = false, groundLift = 0, groundEasing = false;
    let freeFeetY = 0, freeFloorY = 0, freeFallV = 0, freeLeapX = 0, freeLeapZ = 0, freeFallValid = false, freeFalling = false;
    let freeCloud = null;
    let sleepingView = false, sleepYaw = 0, sleepPitch = 0, trailingPitchChosen = false;
    const sleepForward = new Float64Array(3), sleepUp = new Float64Array(3), sleepRight = new Float64Array(3);
    const sleepCameraUp = { x: 0, y: 1, z: 0 };
    const orbitRotation = quat.create(), headRotation = quat.create(), cameraRotation = quat.create(), releaseRotation = quat.create();
    const sleepViewRotation = quat.create(), entryRoll = quat.create(), inverseRotation = quat.create(), relativeRotation = quat.create();
    let releaseMix = 0, closeCameraActive = false;
    let headOrbit = false, exitAngleHold = false, exitBodyX = 0, exitBodyY = 0, exitBodyZ = 0;
    const headOrbitOffset = { x: 0, y: 0, z: 0 };
    const headInverse = mat4.create(), headPartMatrix = mat4.create(), headEye = new Float64Array(3), headNear = new Float64Array(3), headBounds = new Float64Array(6);
    const entryPosition = { x: 0, y: 0, z: 0 };
    let entryRebase = false, entryOffsetActive = false, freeEntry = false;
    const previousEye = { x: 0, y: 0, z: 0 }, eyeVelocity = { x: 0, y: 0, z: 0 }, dollyVelocity = { x: 0, y: 0, z: 0 };
    const previousAnchor = { x: 0, y: 0, z: 0 }, motionAnchor = { x: 0, y: 0, z: 0 }, anchorVelocity = { x: 0, y: 0, z: 0 };
    const DOLLY_HANDOFF = 0.25;
    let eyeMotionValid = false, dollyTime = DOLLY_HANDOFF;
    const carryDollyVelocity = (following = false) => {
      dollyVelocity.x = eyeVelocity.x - (following ? anchorVelocity.x : 0);
      dollyVelocity.y = eyeVelocity.y - (following ? anchorVelocity.y : 0);
      dollyVelocity.z = eyeVelocity.z - (following ? anchorVelocity.z : 0);
      dollyTime = eyeMotionValid ? 0 : DOLLY_HANDOFF;
    };
    const headAnchor = (cave, out) => {
      const p = crew.sleeping && cave.root.quaternion ? cave.sleepHead : cave.root.position;
      out.x = p.x; out.z = p.z;
      out.y = p.y + (p === cave.sleepHead ? 0 : -cave.baseY + cave.headOffset * close.eyeRatio + cave.viewLift);
    };
    const resetFreeFall = () => {
      freeFallV = freeLeapX = freeLeapZ = 0;
      freeFallValid = freeFalling = false;
      freeCloud = null;
    };
    const bind = (systems) => {
      crew = systems.crew;
      fx = systems.fx;
    };
    const player = () => crew ? crew.player : null;
    const resetGroundView = () => {
      freeEntry = false;
      const cave = player();
      if (cave) crew.elevate(0);
      groundView = groundTarget = groundLift = 0;
      groundEasing = false;
      groundValid = false;
      resetFreeFall();
    };
    const restoreHead = () => {
      if (!hiddenHead) return;
      hiddenHead.parts.head.cameraHidden = hiddenHeadCameraHidden;
      hiddenHead = null;
    };
    const hideHead = (cave) => {
      if (hiddenHead === cave) return;
      restoreHead();
      hiddenHead = cave;
      hiddenHeadCameraHidden = cave.parts.head.cameraHidden;
      cave.parts.head.cameraHidden = true;
    };
    const includeHeadPart = (node) => {
      if (!node.visible) return;
      if (node.geometry) {
        const b = boundsOf(node.geometry), m = headPartMatrix;
        mat4.multiply(m, headInverse, node.world);
        const cx = b.center[0], cy = b.center[1], cz = b.center[2];
        const hx = (b.max[0] - b.min[0]) * 0.5, hy = (b.max[1] - b.min[1]) * 0.5, hz = (b.max[2] - b.min[2]) * 0.5;
        for (let axis = 0; axis < 3; axis++) {
          const center = m[axis] * cx + m[axis + 4] * cy + m[axis + 8] * cz + m[axis + 12];
          const extent = Math.abs(m[axis]) * hx + Math.abs(m[axis + 4]) * hy + Math.abs(m[axis + 8]) * hz;
          headBounds[axis] = Math.min(headBounds[axis], center - extent);
          headBounds[axis + 3] = Math.max(headBounds[axis + 3], center + extent);
        }
      }
      for (const child of node.children) includeHeadPart(child);
    };
    const syncHeadVisibility = (cave) => {
      if (!cave) { restoreHead(); return; }
      // The near plane can expose interior faces before the eye enters.
      // Include the whole head subtree so hats and masks cannot flash either.
      updateWorld(cave.root, cave.root.parent ? cave.root.parent.world : undefined);
      const head = cave.parts.head;
      mat4.invert(headInverse, head.world);
      headBounds[0] = headBounds[1] = headBounds[2] = Infinity;
      headBounds[3] = headBounds[4] = headBounds[5] = -Infinity;
      includeHeadPart(head);
      mat4.transformPoint(headEye, headInverse, camera.position.x, camera.position.y, camera.position.z);
      if (headEye[0] >= headBounds[0] && headEye[0] <= headBounds[3]
        && headEye[1] >= headBounds[1] && headEye[1] <= headBounds[4]
        && headEye[2] >= headBounds[2] && headEye[2] <= headBounds[5]) { hideHead(cave); return; }
      let fx = camera.target.x - camera.position.x, fy = camera.target.y - camera.position.y, fz = camera.target.z - camera.position.z;
      const length = Math.hypot(fx, fy, fz);
      fx /= length; fy /= length; fz /= length;
      const up = camera.up, ux = up ? up.x : 0, uy = up ? up.y : 1, uz = up ? up.z : 0;
      let rx = fy * uz - fz * uy, ry = fz * ux - fx * uz, rz = fx * uy - fy * ux;
      const rightLength = Math.hypot(rx, ry, rz);
      rx /= rightLength; ry /= rightLength; rz /= rightLength;
      const vx = ry * fz - rz * fy, vy = rz * fx - rx * fz, vz = rx * fy - ry * fx;
      const halfH = camera.near * Math.tan(camera.fov * 0.5), halfW = halfH * renderer.size.width / Math.max(1, renderer.size.height);
      mat4.transformPoint(headNear, headInverse, camera.position.x + fx * camera.near, camera.position.y + fy * camera.near, camera.position.z + fz * camera.near);
      for (let axis = 0; axis < 3; axis++) {
        const m = headInverse;
        const extent = Math.abs(m[axis] * rx + m[axis + 4] * ry + m[axis + 8] * rz) * halfW
          + Math.abs(m[axis] * vx + m[axis + 4] * vy + m[axis + 8] * vz) * halfH;
        if (headNear[axis] + extent < headBounds[axis] || headNear[axis] - extent > headBounds[axis + 3]) { restoreHead(); return; }
      }
      hideHead(cave);
    };
    const setFreeEye = () => {
      resetFreeFall();
      const eyeHeight = close.eyeHeight;
      freeTarget.x = camera.position.x;
      freeTarget.z = camera.position.z;
      freeFloorY = close.groundAt(freeTarget.x, freeTarget.z, camera.position.y - eyeHeight);
      freeTarget.y = Math.max(camera.position.y, freeFloorY + eyeHeight);
      freeFeetY = freeTarget.y - eyeHeight;
      freeFallValid = true;
      freeFalling = freeFeetY - freeFloorY > WALK.step;
      const cave = player();
      if (freeFalling && cave) {
        freeFallV = cave.hopV;
        freeLeapX = cave.leap.vx;
        freeLeapZ = cave.leap.vz;
      }
      clampTarget(freeTarget);
      orbit.target = freeTarget;
    };
    const faceWith = (cave) => {
      closeCave = cave;
      entryPosition.x = camera.position.x; entryPosition.y = camera.position.y; entryPosition.z = camera.position.z;
      entryRebase = true;
      carryDollyVelocity();
      closeRate = 10;
      entryOffsetActive = false;
      closeMix = closeVelocity = 0;
      headOrbit = exitAngleHold = false;
      // The physical boom and close-distance flattening can differ from the
      // requested orbit. Enter along the direction actually on screen.
      const dx = camera.target.x - camera.position.x, dy = camera.target.y - camera.position.y, dz = camera.target.z - camera.position.z, up = camera.up;
      viewRotation(cameraRotation, dx, dy, dz, up ? up.x : 0, up ? up.y : 1, up ? up.z : 0, orbit.yaw);
      orbit.yaw = orbit.tYaw = Math.atan2(-dx, -dz);
      orbit.pitch = orbit.tPitch = Math.atan2(-dy, Math.hypot(dx, dz));
      closeCameraActive = true;
      sleepingView = !!(cave && crew.sleeping && cave.root.quaternion);
      if (sleepingView) {
        // Keep the approach as an offset from this pose; a later roll still
        // carries the head and view together without moving the sleeping body.
        const q = cave.root.quaternion;
        inverseRotation[0] = -q[0]; inverseRotation[1] = -q[1]; inverseRotation[2] = -q[2]; inverseRotation[3] = q[3];
        quat.multiply(sleepViewRotation, inverseRotation, cameraRotation);
        sleepYaw = orbit.yaw; sleepPitch = orbit.pitch;
      } else {
        viewRotation(headRotation, dx, dy, dz, 0, 1, 0, orbit.yaw);
        inverseRotation[0] = -headRotation[0]; inverseRotation[1] = -headRotation[1]; inverseRotation[2] = -headRotation[2]; inverseRotation[3] = headRotation[3];
        quat.multiply(entryRoll, inverseRotation, cameraRotation);
      }
    };
    const enterClose = () => {
      if (!close || closeWanted) return;
      closeWanted = true;
      closeExitScale = 1;
      const cave = player();
      if (cave) faceWith(cave);
      else {
        // Finish zooming to the displayed focal point before walking physics
        // takes over. Resolve an embedded destination before the dolly, so
        // recovery cannot teleport the eye when it reaches first person.
        freeTarget.x = headOrbit ? orbit.tx : camera.target.x;
        freeTarget.y = headOrbit ? orbit.ty : camera.target.y;
        freeTarget.z = headOrbit ? orbit.tz : camera.target.z;
        if (ctx.enterFreeView) ctx.enterFreeView(freeTarget);
        freeTarget.y = Math.max(freeTarget.y, close.groundAt(freeTarget.x, freeTarget.z, freeTarget.y - close.eyeHeight) + close.eyeHeight);
        clampTarget(freeTarget);
        orbit.target = freeTarget;
        resetFreeFall();
        faceWith(null);
        headOrbit = freeEntry = true;
      }
    };
    const exitClose = () => {
      if (!closeWanted) return;
      freeEntry = false;
      if (closeMix < 1) carryDollyVelocity(true);
      else dollyTime = DOLLY_HANDOFF;
      closeRate = closeMix < 1 ? 10 : CLOSE_RATE;
      distanceVelocity = 0;
      const cave = player(), up = camera.up, dx = camera.target.x - camera.position.x, dy = camera.target.y - camera.position.y, dz = camera.target.z - camera.position.z;
      if (dollyTime < DOLLY_HANDOFF) {
        // Outward zoom changes distance along the held viewing ray. Keep its
        // longitudinal velocity without carrying a fading sideways head turn.
        const along = (dollyVelocity.x * dx + dollyVelocity.y * dy + dollyVelocity.z * dz) / (dx * dx + dy * dy + dz * dz);
        dollyVelocity.x = dx * along; dollyVelocity.y = dy * along; dollyVelocity.z = dz * along;
      }
      viewRotation(cameraRotation, dx, dy, dz, up ? up.x : 0, up ? up.y : 1, up ? up.z : 0, orbit.yaw);
      orbit.yaw = orbit.tYaw = Math.atan2(-dx, -dz);
      orbit.pitch = orbit.tPitch = Math.atan2(-dy, Math.hypot(dx, dz));
      viewRotation(headRotation, dx, dy, dz, 0, 1, 0, orbit.yaw);
      inverseRotation[0] = -headRotation[0]; inverseRotation[1] = -headRotation[1]; inverseRotation[2] = -headRotation[2]; inverseRotation[3] = headRotation[3];
      quat.multiply(entryRoll, inverseRotation, cameraRotation);
      // Zoom back on the ray already being viewed, including its roll. The
      // starting eye becomes the head-relative orbit anchor, so only distance
      // changes even when collision previously displaced that eye slightly.
      if (cave) {
        headAnchor(cave, followTarget);
        headOrbitOffset.x = camera.position.x - followTarget.x; headOrbitOffset.y = camera.position.y - followTarget.y; headOrbitOffset.z = camera.position.z - followTarget.z;
        followTarget.x = camera.position.x; followTarget.y = camera.position.y; followTarget.z = camera.position.z;
        orbit.target = followTarget;
      } else {
        freeTarget.x = camera.position.x; freeTarget.y = camera.position.y; freeTarget.z = camera.position.z;
        orbit.target = freeTarget;
      }
      orbit.tx = orbit.target.x; orbit.ty = orbit.target.y; orbit.tz = orbit.target.z;
      const body = cave ? cave.root.position : freeTarget;
      exitBodyX = body.x; exitBodyY = body.y; exitBodyZ = body.z;
      headOrbit = exitAngleHold = closeCameraActive = trailingPitchChosen = true;
      releaseMix = 0;
      closeWanted = false;
      syncHeadVisibility(cave);
      // The new orbit starts at the displayed eye, including an interrupted
      // entry. Begin its outward dolly there without changing that position.
      closeMix = 1;
      closeVelocity = 0;
      entryRebase = entryOffsetActive = false;
      closeExitScale = 1;
      closeCave = null;
      resetFreeFall();
      orbit.tDist = clamp(cave ? close.trailingDist : close.orbitDist, DIST_MIN, DIST_MAX);
      if (cave && crew.sleeping) crew.look(0, 0, 0);
    };
    // ---------- possession ----------
    // Relabel the act button for what the press does
    const syncJetpackHud = () => {
      const cave = player(), status = ctx.jetpackStatus && ctx.jetpackStatus(cave);
      if (status) hud.setJetpack(status.owned, status.equipped, status.fuel, status.blocked);
      else hud.setJetpack(!!(cave && cave.jet), !!(cave && cave.jet), cave ? cave.jetFuel : 0);
    };
    const showAct = () => {
      const cave = player();
      if (cave) hud.setAct(cave.camp.burning ? "DROP & ROLL!" : cave.camp.seat ? "STAND UP!" : crew.sleeping ? "WAKE UP!" : cave.jet && !cave.jetRecovering ? ACT_FLY : ACT_DO);
      syncJetpackHud();
    };
    const possess = (cave) => {
      if (!crew.control(cave)) return;
      eyeMotionValid = false;
      dollyTime = DOLLY_HANDOFF;
      distanceVelocity = 0;
      headOrbit = exitAngleHold = false;
      releaseMix = 0;
      resetGroundView();
      orbit.tDist = clamp(orbit.tDist, follow.min, follow.max);
      orbit.tPitch = clamp(orbit.tPitch, TRAILING_PITCH[0], TRAILING_PITCH[1]);
      if (closeWanted) {
        closeMix = closeVelocity = 0;
        faceWith(cave);
      }
      hud.el.act.hidden = false;
      showAct();
      hud.tooltip.hide();
      fx.say(cave, crew.sleeping ? "zzz..." : "Ooga? Me?", 1.6);
      if (crew.sleeping) hud.hint(coarse ? "Tap WAKE UP! to get up" : cave.bedroll.sleep ? "Space wakes up · WASD changes sleeping pose" : "Space wakes up · Escape leaves them sleeping");
      else if (cave.jet && cave.jetRecovering) hud.hint("Jetpack recharges on the ground · restart above 20% fuel");
      else if (cave.jet) hud.hint(coarse ? "Left stick flies · pinch in for first person · hold Blast off to climb" : "WASD flies · scroll in for first person · hold Space to climb · Escape to let go");
      else hud.hint(coarse ? "Left stick walks · pinch in for first person · JUMP! jumps or uses a nearby control" : "WASD or both mouse buttons to walk · scroll in for first person · Space to jump or use a nearby control");
    };
    const rememberSleepView = () => {
      const up = camera.up;
      viewRotation(releaseRotation, camera.target.x - camera.position.x, camera.target.y - camera.position.y, camera.target.z - camera.position.z, up ? up.x : 0, up ? up.y : 1, up ? up.z : 0, orbit.yaw);
      releaseMix = 1;
    };
    const release = (quiet = false) => {
      const cave = player();
      if (!cave) return;
      eyeMotionValid = false;
      dollyTime = DOLLY_HANDOFF;
      if (crew.sleeping && closeWanted) {
        const dx = camera.target.x - camera.position.x, dy = camera.target.y - camera.position.y, dz = camera.target.z - camera.position.z;
        rememberSleepView();
        // Close-view input was relative to the sleeping head. Free navigation
        // starts from that same world direction and eases only its roll upright.
        orbit.yaw = orbit.tYaw = Math.atan2(-dx, -dz);
        orbit.pitch = orbit.tPitch = clamp(Math.atan2(-dy, Math.hypot(dx, dz)), TRAILING_PITCH[0], TRAILING_PITCH[1]);
      }
      const recovered = (closeWanted || closeMix > 0) && ctx.releaseView && ctx.releaseView(cave, camera.position);
      resetGroundView();
      if (closeWanted) {
        setFreeEye();
        closeMix = 1;
        closeVelocity = 0;
      }
      else if (recovered) {
        // A solid-rock third-person view hands free navigation a clear eye.
        // Rebase its orbit so the next frame keeps that accepted position.
        const cp = Math.cos(orbit.pitch), distance = orbit.dist;
        freeTarget.x = camera.position.x - Math.sin(orbit.yaw) * cp * distance;
        freeTarget.y = camera.position.y - Math.sin(orbit.pitch) * distance;
        freeTarget.z = camera.position.z - Math.cos(orbit.yaw) * cp * distance;
        orbit.target = freeTarget;
        orbit.tx = freeTarget.x; orbit.ty = freeTarget.y; orbit.tz = freeTarget.z;
      }
      restoreHead();
      entryRebase = entryOffsetActive = false;
      closeCave = null;
      crew.release();
      hud.el.act.hidden = true;
      syncJetpackHud();
      if (!quiet) hud.toast(`${cave.traits.name} ${cave.state === "sleeping" ? "keeps sleeping" : "wanders off"}`);
    };
    // Nearby actions consume a press; a ready jetpack leaves Space as throttle.
    const action = () => {
      const cave = player();
      return cave ? crew.playerAction() : !!ctx.onFreeAction && ctx.onFreeAction();
    };
    // Held it climbs, clicked it acts; both mouse buttons on the canvas walk
    const controls = createControls({ move: document.getElementById("joy-move"), look: document.getElementById("joy-look"), boost: hud.el.act, chord: canvas, onAction: action, pressActions: true });
    let dragHold = 0, trailingViewInput = false, trailingZoomInput = false;
    const hooks = {
      onOrbit: (dx, dy) => {
        dragHold = DRAG_HOLD;
        orbit.tYaw -= dx * 4e-3;
        const cave = player(), pitch = close && !cave && (closeWanted || closeMix > 0.5) ? close.pitch : TRAILING_PITCH;
        if (dy) orbit.tPitch = clamp(orbit.tPitch + dy * 3.5e-3, pitch[0], pitch[1]);
        if (cave && !closeWanted) {
          trailingViewInput = true;
          if (dy) trailingPitchChosen = true;
        }
      },
      onZoom: (factor) => {
        if (!close) {
          orbit.tDist = clamp(orbit.tDist * factor, DIST_MIN, DIST_MAX);
          return;
        }
        if (closeWanted) {
          if (factor > 1) {
            closeExitScale *= factor;
            if (closeExitScale >= CLOSE_PINCH_EXIT) {
              exitClose();
              if (player()) trailingZoomInput = true;
            }
          } else closeExitScale = 1;
          return;
        }
        orbit.tDist = clamp(orbit.tDist * factor, DIST_MIN, DIST_MAX);
        if (player()) {
          // Ease the chosen distance in the orbit itself. A wheel event must
          // not teleport the eye before its close-view dolly starts.
          trailingZoomInput = true;
        }
        if (factor < 1 && orbit.tDist <= DIST_MIN + 0.001) enterClose();
      },
      onDoubleTap: (hit) => {
        if (hit && hit.owner.kind === "caveman") {
          const cave = hit.owner.cave;
          if (cave === player()) release();
          else possess(cave);
        } else if (player()) release();
      }
    };
    // ---------- camera ----------
    const goPreset = (name) => {
      const p = presets[name];
      if (!p) return;
      eyeMotionValid = false;
      dollyTime = DOLLY_HANDOFF;
      distanceVelocity = 0;
      release(true);
      closeWanted = false;
      closeMix = closeVelocity = 0;
      closeExitScale = 1;
      closeCave = null;
      trailingPitchChosen = false;
      headOrbit = exitAngleHold = false;
      entryRebase = entryOffsetActive = false;
      releaseMix = 0;
      restoreHead();
      resetFreeFall();
      orbit.target = p.target;
      orbit.tYaw = p.yaw;
      orbit.tPitch = p.pitch;
      orbit.tDist = p.dist;
    };
    // Read keys and sticks before the crew moves
    const readInput = (dt) => {
      const a = controls.read();
      const cave = player();
      const fx0 = -Math.sin(orbit.yaw), fz0 = -Math.cos(orbit.yaw);
      const rx = Math.cos(orbit.yaw), rz = -Math.sin(orbit.yaw);
      if (cave) {
        freeStrafe = freeForward = freeClimb = 0;
        const p = cave.root.position;
        followTarget.x = p.x;
        followTarget.y = p.y - cave.baseY + follow.y;
        followTarget.z = p.z;
        orbit.target = followTarget;
        if (cave.jet) crew.thrust(a.up > 0);
        crew.steer(fx0 * a.y + rx * a.x, fz0 * a.y + rz * a.x, close ? closeMix : 0, a.y, a.x);
        if (dragHold > 0) dragHold -= dt;
        else if (!crew.sleeping && !closeWanted && a.y > 0.05 && Math.abs(a.x) > 0.05 && !a.yaw) {
          const behind = cave.root.rotation.y + Math.PI;
          orbit.tYaw += Math.atan2(Math.sin(behind - orbit.tYaw), Math.cos(behind - orbit.tYaw)) * Math.min(1, FOLLOW_TURN * dt);
        }
      } else {
        if (orbit.target === freeTarget) {
          const stopStrafe = freeStrafe && (!a.x || freeStrafe * a.x < 0), stopForward = freeForward && (!a.y || freeForward * a.y < 0);
          const stopClimb = freeClimb && (!a.up || freeClimb * a.up < 0);
          if (stopStrafe || stopForward || stopClimb) {
            // Consume released or reversed input's remaining damping. The eye's
            // current center also keeps close-view release from snapping back.
            const offset = orbit.dist * (1 - closeMix), cp = Math.cos(viewPitch);
            const centerX = camera.position.x - Math.sin(orbit.yaw) * cp * offset;
            const centerY = camera.position.y - Math.sin(viewPitch) * offset;
            const centerZ = camera.position.z - Math.cos(orbit.yaw) * cp * offset;
            const sr = Math.sin(freeMoveYaw), cr = Math.cos(freeMoveYaw);
            if (stopStrafe) {
              const target = (centerX - freeTarget.x) * cr - (centerZ - freeTarget.z) * sr;
              const current = (centerX - orbit.tx) * cr - (centerZ - orbit.tz) * sr;
              freeTarget.x += target * cr; freeTarget.z -= target * sr;
              orbit.tx += current * cr; orbit.tz -= current * sr;
            }
            if (stopForward) {
              const target = (centerX - freeTarget.x) * sr + (centerZ - freeTarget.z) * cr;
              const current = (centerX - orbit.tx) * sr + (centerZ - orbit.tz) * cr;
              freeTarget.x += target * sr; freeTarget.z += target * cr;
              orbit.tx += current * sr; orbit.tz += current * cr;
            }
            if (stopClimb) freeTarget.y = orbit.ty = centerY;
          }
        }
        if (a.x || a.y || a.up) {
          if (orbit.target !== freeTarget) {
            freeTarget.x = orbit.target.x;
            freeTarget.y = orbit.target.y;
            freeTarget.z = orbit.target.z;
            orbit.target = freeTarget;
          }
          const speed = (closeWanted ? WALK.speed / Math.max(1, Math.hypot(a.x, a.y)) : fly.speed + orbit.tDist * fly.perDist) * dt;
          freeTarget.x += (fx0 * a.y + rx * a.x) * speed;
          freeTarget.z += (fz0 * a.y + rz * a.x) * speed;
          if (a.up && !closeWanted) {
            // Underground bounds apply to the eye. A pitched orbit's focus can
            // sit below its floor, and horizontal input must leave it there.
            const offset = fly.yMin === undefined ? 0 : Math.sin(viewPitch) * orbit.dist * (1 - closeMix);
            freeTarget.y = clamp(freeTarget.y + a.up * fly.climb * dt, (fly.yMin === undefined ? 0 : fly.yMin) - offset, fly.yMax - offset);
          }
          clampTarget(freeTarget);
        }
        if (closeWanted && freeFalling && freeFeetY + (freeFallV - WALK.gravity * dt) * dt > freeFloorY && (freeLeapX || freeLeapZ)) {
          freeTarget.x += freeLeapX * dt;
          freeTarget.z += freeLeapZ * dt;
          freeLeapX = damp(freeLeapX, 0, WALK.ledgeDrag, dt);
          freeLeapZ = damp(freeLeapZ, 0, WALK.ledgeDrag, dt);
          clampTarget(freeTarget);
        }
        freeStrafe = a.x; freeForward = a.y; freeClimb = a.up;
        freeMoveYaw = orbit.yaw;
      }
      if (a.yaw) {
        orbit.tYaw += a.yaw * YAW_RATE * dt;
        if (cave && !closeWanted) trailingViewInput = true;
      }
      if (a.pitch) {
        const pitch = close && !cave && (closeWanted || closeMix > 0.5) ? close.pitch : TRAILING_PITCH;
        orbit.tPitch = clamp(orbit.tPitch + a.pitch * PITCH_RATE * dt, pitch[0], pitch[1]);
        if (cave && !closeWanted) trailingViewInput = trailingPitchChosen = true;
      }
    };
    // The camera moves only on input, no drift
    const update = (dt) => {
      const cave = player();
      const sleeping = !!(cave && crew.sleeping && cave.root.quaternion);
      if (sleepingView && !sleeping && cave && closeWanted && closeMix > 0) {
        rememberSleepView();
        // Waking restores the bed's upright stance. Ease the rendered roll
        // toward that heading without applying sleeping-relative Euler angles.
        orbit.yaw = orbit.tYaw = cave.root.rotation.y + Math.PI;
        orbit.pitch = orbit.tPitch = 0;
        quat.fromEuler(entryRoll, 0, 0, 0);
      }
      if (sleeping && !sleepingView) {
        sleepYaw = orbit.yaw; sleepPitch = orbit.pitch;
        quat.fromEuler(sleepViewRotation, 0, Math.PI, 0);
      }
      sleepingView = sleeping;
      if ((cave || headOrbit) && (closeWanted || closeMix > 0 || closeCameraActive)) {
        if (!closeCameraActive) {
          const up = camera.up;
          viewRotation(cameraRotation, camera.target.x - camera.position.x, camera.target.y - camera.position.y, camera.target.z - camera.position.z, up ? up.x : 0, up ? up.y : 1, up ? up.z : 0, orbit.yaw);
          closeCameraActive = true;
        }
      } else closeCameraActive = false;
      camera.up = null;
      syncJetpackHud();
      if (cave) {
        const p = cave.root.position;
        if (headOrbit) {
          headAnchor(cave, followTarget);
          followTarget.x += headOrbitOffset.x; followTarget.y += headOrbitOffset.y; followTarget.z += headOrbitOffset.z;
        } else {
          followTarget.x = sleeping ? cave.sleepHead.x : p.x;
          followTarget.y = sleeping ? cave.sleepHead.y : p.y - cave.baseY + follow.y;
          followTarget.z = sleeping ? cave.sleepHead.z : p.z;
        }
      }
      if (exitAngleHold && !closeWanted && closeMix === 0 && !sleeping) {
        const body = cave ? cave.root.position : freeTarget;
        if (Math.hypot(body.x - exitBodyX, body.y - exitBodyY, body.z - exitBodyZ) > 1e-5) exitAngleHold = false;
      }
      const directTrailingView = trailingViewInput && !!cave && !closeWanted;
      // Crossing into first person starts a dolly, even when the same wheel
      // event changed the trailing distance. Its physical corridor recovery
      // must keep the normal motion budget instead of acting as a direct drag.
      const directCameraPosition = directTrailingView || trailingZoomInput && !!cave && !closeWanted;
      trailingViewInput = false;
      trailingZoomInput = false;
      let groundReset = false;
      if (closeWanted && cave !== closeCave) {
        if (cave) {
          resetGroundView();
          closeMix = closeVelocity = 0;
          faceWith(cave);
        } else {
          resetGroundView();
          if (closeCave) setFreeEye();
          closeCave = null;
          restoreHead();
        }
      }
      if (close) {
        // An analytic critically damped dolly starts with continuous speed.
        // First-order easing adds its largest step exactly when the wheel
        // reaches first person, on top of the still-moving orbit distance.
        const target = closeWanted ? 1 : 0, delta = closeMix - target;
        const decay = Math.exp(-closeRate * dt), impulse = (closeVelocity + closeRate * delta) * dt;
        closeMix = target + (delta + impulse) * decay;
        closeVelocity = (closeVelocity - closeRate * impulse) * decay;
        if (closeMix < 0 || closeMix > 1 || Math.abs(closeMix - target) < CLOSE_SNAP && Math.abs(closeVelocity) < CLOSE_SNAP * closeRate) {
          closeMix = closeMix < 0 ? 0 : closeMix > 1 ? 1 : target;
          closeVelocity = 0;
        }
      } else closeMix = closeVelocity = 0;
      orbit.yaw = directTrailingView ? orbit.tYaw : damp(orbit.yaw, orbit.tYaw, 14, dt);
      orbit.pitch = directTrailingView ? orbit.tPitch : damp(orbit.pitch, orbit.tPitch, 14, dt);
      if (cave && close && !sleeping) crew.look(orbit.yaw + Math.PI, orbit.pitch, closeMix);
      if (cave && close && !sleeping) {
        const p = cave.root.position;
        const ground = p.y - cave.baseY - cave.hop;
        const zone = close.zone ? close.zone() : 0;
        const moved = Math.hypot(p.x - groundX, p.z - groundZ);
        const airborne = cave.hop > 0.001 || Math.abs(cave.hopV) > 0.001 || !!cave.jet && cave.jet.thrust;
        groundReset = !groundValid || airborne || zone !== groundZone || moved > CLOSE_TELEPORT || Math.abs(ground - groundTarget) > close.maxStep + 1e-6;
        if (groundReset) groundView = ground;
        else groundView = close.visualGroundAt ? close.visualGroundAt(p.x, p.z, ground) : damp(groundView, ground, CLOSE_GROUND_RATE, dt);
        groundLift = clamp(groundView - ground, -cave.baseY * 0.5, cave.baseY * 0.75);
        groundTarget = ground;
        groundX = p.x;
        groundZ = p.z;
        groundZone = zone;
        groundValid = true;
        groundEasing = !airborne;
        crew.elevate(groundLift);
        groundLift = cave.viewLift;
        groundView = ground + groundLift;
        followTarget.y = p.y - cave.baseY + (headOrbit ? cave.headOffset * close.eyeRatio + headOrbitOffset.y : follow.y) + cave.viewLift;
      } else {
        if (cave && close && !sleeping) crew.elevate(0);
        groundLift = 0;
        groundEasing = false;
        groundValid = false;
      }
      {
        // Repeated wheel events change the destination, never the current
        // distance velocity. Use the exact critically damped spring step.
        const delta = orbit.dist - orbit.tDist, decay = Math.exp(-CLOSE_RATE * dt);
        const impulse = (distanceVelocity + CLOSE_RATE * delta) * dt;
        orbit.dist = orbit.tDist + (delta + impulse) * decay;
        distanceVelocity = (distanceVelocity - CLOSE_RATE * impulse) * decay;
      }
      orbit.tx = damp(orbit.tx, orbit.target.x, 5, dt);
      orbit.ty = damp(orbit.ty, orbit.target.y, 5, dt);
      orbit.tz = damp(orbit.tz, orbit.target.z, 5, dt);
      const { width, height } = renderer.size;
      const aspect = width / Math.max(1, height);
      camera.fov = clamp(2 * Math.atan(Math.tan(MIN_HFOV / 2) / aspect), BASE_FOV, MAX_FOV);
      const portrait = clamp(1 - aspect, 0, 0.6);
      let flatten = 0;
      if (cave && close && !trailingPitchChosen && !headOrbit) {
        const span = close.trailingDist - DIST_MIN;
        flatten = span > 0 ? clamp((close.trailingDist - orbit.dist) / span, 0, 1) : 1;
        flatten = flatten * flatten * (3 - 2 * flatten);
      }
      viewPitch = orbit.pitch * (1 - flatten);
      const cp = Math.cos(viewPitch), sp = Math.sin(viewPitch);
      let targetX = orbit.tx, targetY = orbit.ty - portrait * 0.6, targetZ = orbit.tz;
      const orbitX = orbit.tx + Math.sin(orbit.yaw) * cp * orbit.dist;
      const orbitY = orbit.ty + sp * orbit.dist;
      const orbitZ = orbit.tz + Math.cos(orbit.yaw) * cp * orbit.dist;
      let eyeX = freeTarget.x, eyeZ = freeTarget.z, eyeY = freeTarget.y, eyeClearance = close ? close.eyeHeight : 0;
      let freeLedge = false, previousFloor = freeFloorY;
      if ((cave || headOrbit) && closeCameraActive) {
        if (sleeping && !headOrbit) {
          quat.multiply(relativeRotation, cave.root.quaternion, sleepViewRotation);
          quat.rotateVec(sleepForward, relativeRotation, 0, 0, -1);
          quat.rotateVec(sleepUp, relativeRotation, 0, 1, 0);
          quat.rotateVec(sleepRight, relativeRotation, 1, 0, 0);
          const cy = Math.cos(orbit.yaw - sleepYaw), sy = Math.sin(orbit.yaw - sleepYaw), cp = Math.cos(orbit.pitch - sleepPitch), sp = Math.sin(orbit.pitch - sleepPitch);
          const fx = sleepForward[0] * cy - sleepRight[0] * sy, fy = sleepForward[1] * cy - sleepRight[1] * sy, fz = sleepForward[2] * cy - sleepRight[2] * sy;
          viewRotation(headRotation, fx * cp - sleepUp[0] * sp, fy * cp - sleepUp[1] * sp, fz * cp - sleepUp[2] * sp, sleepUp[0] * cp + fx * sp, sleepUp[1] * cp + fy * sp, sleepUp[2] * cp + fz * sp, orbit.yaw);
        } else {
          const cp = Math.cos(orbit.pitch);
          viewRotation(headRotation, -Math.sin(orbit.yaw) * cp, -Math.sin(orbit.pitch), -Math.cos(orbit.yaw) * cp, 0, 1, 0, orbit.yaw);
          quat.multiply(headRotation, headRotation, entryRoll);
        }
      }
      if (closeMix > 0) {
        if (headOrbit && !closeWanted) {
          eyeX = orbit.tx; eyeY = orbit.ty; eyeZ = orbit.tz;
        } else if (sleeping) {
          quat.rotateVec(sleepForward, headRotation, 0, 0, -1);
          eyeX = cave.sleepHead.x + sleepForward[0] * 0.28;
          eyeY = cave.sleepHead.y + sleepForward[1] * 0.28;
          eyeZ = cave.sleepHead.z + sleepForward[2] * 0.28;
          // Author the dolly toward a clear resting eye, including the full
          // near-plane volume above its pillow, before blending positions.
          if (close.sleepEyeFloorAt) eyeY = Math.max(eyeY, close.sleepEyeFloorAt(cave));
          eyeClearance = Math.max(0.1, eyeY - close.groundAt(eyeX, eyeZ, eyeY - 0.1));
        } else if (cave) {
          const heading = cave.root.rotation.y, forward = close.eyeForward;
          eyeX = cave.root.position.x + Math.sin(heading) * forward;
          eyeY = cave.root.position.y - cave.baseY + cave.headOffset * close.eyeRatio + cave.viewLift;
          eyeZ = cave.root.position.z + Math.cos(heading) * forward;
          eyeClearance = eyeY - close.groundAt(eyeX, eyeZ, cave.root.position.y - cave.baseY - cave.hop);
        } else if (closeWanted && !freeEntry) {
          if (!freeFallValid) {
            freeFeetY = freeFloorY = close.groundAt(eyeX, eyeZ, camera.position.y - close.eyeHeight);
            freeFallValid = true;
          }
          previousFloor = freeFloorY;
          if (freeCloud && !freeFalling && !freeCloud.wrapped && freeCloud.node.visible && freeCloud.node.parent) {
            eyeX += freeCloud.dx; eyeZ += freeCloud.dz;
            freeTarget.x += freeCloud.dx; freeTarget.z += freeCloud.dz;
          }
          const previousFeet = freeFeetY;
          if (freeFalling) {
            freeFallV -= WALK.gravity * dt;
            freeFeetY += freeFallV * dt;
          }
          const ground = close.groundAt(eyeX, eyeZ, freeFeetY, Math.max(previousFeet, freeFeetY));
          if (!freeFalling && freeFloorY - ground > WALK.step) {
            freeFalling = freeLedge = true;
            freeFallV = freeCloud ? 0 : WALK.ledgeRise;
            freeLeapX = freeCloud ? 0 : -Math.sin(orbit.yaw) * WALK.ledgeSpeed;
            freeLeapZ = freeCloud ? 0 : -Math.cos(orbit.yaw) * WALK.ledgeSpeed;
          }
          if (!freeFalling) freeFeetY = ground;
          else freeFeetY = Math.max(ground, freeFeetY);
          freeFloorY = ground;
          eyeY = freeFeetY + close.eyeHeight;
        } else if (!freeEntry) eyeY = close.groundAt(eyeX, eyeZ, camera.position.y - close.eyeHeight) + close.eyeHeight;
      }
      camera.position.x = orbitX + (eyeX - orbitX) * closeMix;
      camera.position.y = orbitY + (eyeY - orbitY) * closeMix;
      camera.position.z = orbitZ + (eyeZ - orbitZ) * closeMix;
      if (entryRebase) {
        // A reversed dolly or a new possession may use another orbit pivot.
        // Its zero-distance-time endpoint is still the eye already displayed.
        entryRebase = false;
        entryOffsetActive = true;
      }
      if (entryOffsetActive) {
        camera.position.x += (entryPosition.x - orbitX) * (1 - closeMix);
        camera.position.y += (entryPosition.y - orbitY) * (1 - closeMix);
        camera.position.z += (entryPosition.z - orbitZ) * (1 - closeMix);
        if (closeMix === 1) entryOffsetActive = false;
      }
      if (dollyTime < DOLLY_HANDOFF) {
        dollyTime = Math.min(DOLLY_HANDOFF, dollyTime + dt);
        const u = dollyTime / DOLLY_HANDOFF, remaining = 1 - u;
        // This finite handoff starts with the previous rendered velocity and
        // zero acceleration, then ends with zero offset, velocity and
        // acceleration. The new dolly can brake before reversing direction.
        const carry = dollyTime * remaining * remaining * remaining * (1 + 3 * u);
        camera.position.x += dollyVelocity.x * carry;
        camera.position.y += dollyVelocity.y * carry;
        camera.position.z += dollyVelocity.z * carry;
      }
      const desiredX = camera.position.x, desiredY = camera.position.y, desiredZ = camera.position.z;
      const collided = clampCamera(camera.position, closeMix, eyeClearance, groundEasing, dt, groundReset, directCameraPosition, !cave && orbit.target === freeTarget, freeEntry || headOrbit && !closeWanted && (exitAngleHold || closeMix > 0));
      if (freeEntry && closeMix === 1) {
        freeEntry = false;
        setFreeEye();
        orbit.tx = freeTarget.x; orbit.ty = freeTarget.y; orbit.tz = freeTarget.z;
      }
      if (!cave && closeWanted && closeMix === 1 && freeFallValid) {
        const feet = camera.position.y - close.eyeHeight;
        const ground = close.groundAt(camera.position.x, camera.position.z, feet);
        // Collision may reject the requested ledge crossing. Only accepted
        // movement starts a fall, and a landing clears its velocity and drift.
        if (freeLedge && previousFloor - ground <= WALK.step || freeFalling && freeFallV <= 0 && feet <= ground + 1e-6) {
          freeFalling = false;
          freeFallV = freeLeapX = freeLeapZ = 0;
        } else if (freeFalling && freeFallV > 0 && feet < freeFeetY - 1e-6) freeFallV = 0;
        freeFeetY = feet;
        freeFloorY = ground;
        freeCloud = !freeFalling && close.cloudAt ? close.cloudAt(camera.position.x, camera.position.z, feet) : null;
        freeTarget.y = camera.position.y;
      }
      if (collided && !cave && orbit.target === freeTarget) {
        // A blocked eye consumes its blocked movement. Keep the orbit offset,
        // but discard hidden target travel so reversing responds immediately.
        const orbitMix = 1 - closeMix;
        if (Math.abs(camera.position.x - desiredX) > 1e-7) freeTarget.x = orbit.tx = camera.position.x - (orbitX - targetX) * orbitMix;
        if (Math.abs(camera.position.y - desiredY) > 1e-7) freeTarget.y = orbit.ty = camera.position.y - (orbitY - orbit.ty) * orbitMix;
        if (Math.abs(camera.position.z - desiredZ) > 1e-7) freeTarget.z = orbit.tz = camera.position.z - (orbitZ - targetZ) * orbitMix;
        targetX = orbit.tx;
        targetY = orbit.ty - portrait * 0.6;
        targetZ = orbit.tz;
      }
      const lookCp = Math.cos(orbit.pitch), lookSp = Math.sin(orbit.pitch);
      let lookX = camera.position.x - Math.sin(orbit.yaw) * lookCp * CLOSE_LOOK_DIST;
      let lookY = camera.position.y - lookSp * CLOSE_LOOK_DIST;
      let lookZ = camera.position.z - Math.cos(orbit.yaw) * lookCp * CLOSE_LOOK_DIST;
      if ((cave || headOrbit) && closeCameraActive) {
        viewRotation(orbitRotation, targetX - camera.position.x, targetY - camera.position.y, targetZ - camera.position.z, 0, 1, 0, orbit.yaw);
        // Follow the previously rendered rotation: choosing a fresh shortest
        // arc between two moving endpoints can reverse that arc at 180°.
        if (headOrbit || closeMix === 1) quat.copy(cameraRotation, headRotation);
        else quat.slerpTo(cameraRotation, closeWanted ? headRotation : orbitRotation, 1 - Math.exp(-CLOSE_RATE * dt));
        if (!headOrbit && !closeWanted && closeMix === 0) {
          // The physical close-view boom may end on a different side of the
          // head from the unrestricted orbit. Settle its orientation too,
          // rather than discarding a still-rolled camera at the position snap.
          const sign = cameraRotation[0] * orbitRotation[0] + cameraRotation[1] * orbitRotation[1] + cameraRotation[2] * orbitRotation[2] + cameraRotation[3] * orbitRotation[3] < 0 ? -1 : 1;
          const error = Math.hypot(cameraRotation[0] - sign * orbitRotation[0], cameraRotation[1] - sign * orbitRotation[1], cameraRotation[2] - sign * orbitRotation[2], cameraRotation[3] - sign * orbitRotation[3]);
          if (error < 1e-4) closeCameraActive = false;
        }
      }
      camera.target.x = targetX + (lookX - targetX) * closeMix;
      camera.target.y = targetY + (lookY - targetY) * closeMix;
      camera.target.z = targetZ + (lookZ - targetZ) * closeMix;
      if (releaseMix > 0) {
        releaseMix = damp(releaseMix, 0, CLOSE_RATE, dt);
        if (releaseMix < CLOSE_SNAP) releaseMix = 0;
        viewRotation(orbitRotation, camera.target.x - camera.position.x, camera.target.y - camera.position.y, camera.target.z - camera.position.z, 0, 1, 0, orbit.yaw);
        quat.copy(cameraRotation, releaseRotation);
        quat.slerpTo(cameraRotation, orbitRotation, 1 - releaseMix);
      }
      if ((cave || headOrbit) && closeCameraActive || releaseMix > 0) {
        quat.rotateVec(sleepForward, cameraRotation, 0, 0, -1);
        quat.rotateVec(sleepUp, cameraRotation, 0, 1, 0);
        camera.target.x = camera.position.x + sleepForward[0] * CLOSE_LOOK_DIST;
        camera.target.y = camera.position.y + sleepForward[1] * CLOSE_LOOK_DIST;
        camera.target.z = camera.position.z + sleepForward[2] * CLOSE_LOOK_DIST;
        sleepCameraUp.x = sleepUp[0]; sleepCameraUp.y = sleepUp[1]; sleepCameraUp.z = sleepUp[2];
        camera.up = sleepCameraUp;
      }
      if (sleeping && closeWanted && closeMix > 0) crew.look(0, 0, closeMix, cameraRotation);
      syncHeadVisibility(cave);
      if (cave && close) headAnchor(cave, motionAnchor);
      else {
        const anchor = cave ? cave.root.position : freeTarget;
        motionAnchor.x = anchor.x; motionAnchor.y = anchor.y; motionAnchor.z = anchor.z;
      }
      if (dt > 0 && eyeMotionValid) {
        eyeVelocity.x = (camera.position.x - previousEye.x) / dt;
        eyeVelocity.y = (camera.position.y - previousEye.y) / dt;
        eyeVelocity.z = (camera.position.z - previousEye.z) / dt;
        anchorVelocity.x = (motionAnchor.x - previousAnchor.x) / dt;
        anchorVelocity.y = (motionAnchor.y - previousAnchor.y) / dt;
        anchorVelocity.z = (motionAnchor.z - previousAnchor.z) / dt;
      } else if (!eyeMotionValid) {
        eyeVelocity.x = eyeVelocity.y = eyeVelocity.z = 0;
        anchorVelocity.x = anchorVelocity.y = anchorVelocity.z = 0;
      }
      previousEye.x = camera.position.x; previousEye.y = camera.position.y; previousEye.z = camera.position.z;
      previousAnchor.x = motionAnchor.x; previousAnchor.y = motionAnchor.y; previousAnchor.z = motionAnchor.z;
      eyeMotionValid = true;
    };
    // The scene supplies a safe arrival and resets its collision history first.
    // Navigation changes location, not the visitor's mode or chosen Ooga.
    const navigate = (destination) => {
      eyeMotionValid = false;
      dollyTime = DOLLY_HANDOFF;
      distanceVelocity = 0;
      sleepingView = false;
      headOrbit = exitAngleHold = false;
      entryRebase = entryOffsetActive = false;
      closeCameraActive = false;
      releaseMix = 0;
      quat.fromEuler(entryRoll, 0, 0, 0);
      trailingPitchChosen = false;
      camera.up = null;
      const cave = player(), position = destination.position;
      resetGroundView();
      freeStrafe = freeForward = freeClimb = dragHold = 0;
      trailingViewInput = trailingZoomInput = false;
      closeMix = closeWanted ? 1 : 0;
      closeVelocity = 0;
      closeExitScale = 1;
      closeCave = closeWanted ? cave : null;
      orbit.yaw = orbit.tYaw = freeMoveYaw = destination.yaw;
      orbit.pitch = orbit.tPitch = destination.pitch;
      orbit.dist = orbit.tDist = destination.dist;
      if (cave) {
        crew.relocatePlayer(position, destination.yaw + Math.PI);
        followTarget.x = position.x;
        followTarget.y = position.y + follow.y;
        followTarget.z = position.z;
        orbit.target = followTarget;
      } else {
        const target = closeWanted ? position : destination.target;
        freeTarget.x = target.x;
        freeTarget.y = target.y + (closeWanted ? close.eyeHeight : 0);
        freeTarget.z = target.z;
        orbit.target = freeTarget;
        if (closeWanted) {
          // Support selection must start on the destination's elevation layer.
          camera.position.x = freeTarget.x;
          camera.position.y = freeTarget.y;
          camera.position.z = freeTarget.z;
        }
      }
      orbit.tx = orbit.target.x;
      orbit.ty = orbit.target.y;
      orbit.tz = orbit.target.z;
      update(0);
    };
    const dispose = () => {
      resetGroundView();
      restoreHead();
      hud.el.act.hidden = true;
      hud.setAct(ACT_DO);
      controls.dispose();
      crew = fx = null;
    };
    return { orbit, hooks, controls, bind, readInput, update, goPreset, navigate, enterClose, possess, release, action, showAct, dispose, get player() {
      return player();
    }, get moving() {
      // A press can arrive between frames, before readInput updates crew steer.
      const cave = player(), a = controls.read();
      return !!cave && (Math.hypot(a.x, a.y) > 0.05 || cave.hop > 0 || cave.hopV > 0);
    }, get mode() {
      return closeWanted ? (player() ? "first-person" : "eye-level") : (player() ? "trailing" : "orbit");
    }, get closeMix() {
      return closeMix;
    }, get closeWanted() {
      return closeWanted;
    }, get preserveExitAngle() {
      return headOrbit && !closeWanted && (exitAngleHold || closeMix > 0);
    }, get freeFalling() {
      return freeFalling;
    }, get groundLift() {
      return groundLift;
    }, get groundView() {
      return groundView;
    }, get groundTarget() {
      return groundTarget;
    }, get viewPitch() {
      return viewPitch;
    } };
  };
  BL.pilot = { create, WALK };
})();
