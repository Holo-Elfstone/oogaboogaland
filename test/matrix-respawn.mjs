// Observe the real cliff/shaft fall and its first respawn update, including
// the unpossessed first-person camera's separate recovery branch.
export const matrixRespawnProbe = (fall) => {
  const B = window.__ooga, scene = window.BL.scenes.hub, update = scene.update, W = B.matrixCave.world;
  let time = B.renderOpts.matrix.time, fallingFrames = 0, heldDuringFall = true, arrival = null;
  const feet = () => B.pilot.player ? B.pilot.player.root.position.y - B.pilot.player.baseY : B.camera.position.y - 1.1;
  const off = () => !B.matrixGate.unlocked && !B.matrixGate.pressed && !B.matrixGate.button.matrixLiving
    && !B.matrixCave.inside && !W.active && W.radius === 0 && W.direction === 0 && !B.mirrorCave.node.mirrorPortal;
  B.matrixGate.set(true);
  for (let i = 0; i < 60; i++) update(1 / 60, time += 1 / 60);
  document.querySelector('nav[data-scene="hub"] [data-preset="pile"]').click();
  const normalNavigationKeepsMatrix = B.matrixGate.unlocked && !!W.active;
  scene.update = (dt, elapsed) => {
    const before = feet();
    update(dt, elapsed);
    const after = feet();
    if (before < -50 && after < -50) { fallingFrames++; heldDuringFall &&= B.matrixGate.unlocked && !!W.active; }
    if (before < -50 && after >= 0) arrival = { off: off(), mode: B.pilot.mode, selected: !!B.pilot.player };
  };
  try {
    const result = fall();
    time = B.renderOpts.matrix.time;
    for (let i = 0; i < 12; i++) update(1 / 60, time += 1 / 60);
    const staysOff = off();
    B.matrixGate.set(true); update(1 / 60, time += 1 / 60);
    return { normalNavigationKeepsMatrix, fallingFrames, heldDuringFall, arrival, staysOff,
      canEnableAgain: B.matrixGate.unlocked && !!W.active && W.radius > 0,
      respawn: result.respawn, failures: result.violations || result.failures };
  } finally { scene.update = update; }
};
