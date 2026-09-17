// Check eye containment and near-plane clipping on every dolly step.
export const headCameraProbe = () => {
  const B = window.__ooga, BL = window.BL, P = B.pilot;
  let time = B.renderOpts.matrix.time;
  for (let i = 0; i < 120; i++) BL.scenes.hub.update(1 / 60, time += 1 / 60);
  const cave = [...B.cavemen.values()].find((c) => c.state === "working" && !c.build), head = cave.parts.head;
  const inverse = BL.math.mat4.create(), local = new Float64Array(3), world = new Float64Array(3), rows = [], failures = [];
  P.possess(cave);
  const room = B.island.headquarters.rooms[0];
  P.navigate({ position: { x: room.x, y: room.floor, z: room.z }, yaw: 0.7, pitch: 0, dist: 6 });
  const mask = BL.scene.createNode({ geometry: BL.models.box({ w: 0.55, h: 0.5, d: 0.25, color: "#ffffff", offset: { y: 0.2, z: -0.3 } }), visible: false });
  BL.scene.addChild(head, mask);
  for (const accessory of [false, true]) for (const dt of [1 / 20, 1 / 120]) for (const pitch of [0, -0.6, 0.6]) {
    mask.visible = accessory;
    const o = P.orbit;
    o.dist = o.tDist = 6; o.pitch = o.tPitch = pitch; o.yaw = o.tYaw = 0.7;
    for (let i = 0; i < Math.ceil(2 / dt); i++) P.update(dt);
    const entry = { outside: 0, inside: 0, clippedOutside: 0 }, exit = { outside: 0, inside: 0, clippedOutside: 0 };
    const inspect = (counts) => {
      BL.math.mat4.invert(inverse, head.world);
      const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
      BL.scene.traverseVisible(head, (node) => {
        if (!node.geometry) return;
        const b = BL.scene.boundsOf(node.geometry);
        for (let corner = 0; corner < 8; corner++) {
          BL.math.mat4.transformPoint(world, node.world, corner & 1 ? b.max[0] : b.min[0], corner & 2 ? b.max[1] : b.min[1], corner & 4 ? b.max[2] : b.min[2]);
          BL.math.mat4.transformPoint(local, inverse, world[0], world[1], world[2]);
          for (let axis = 0; axis < 3; axis++) { min[axis] = Math.min(min[axis], local[axis]); max[axis] = Math.max(max[axis], local[axis]); }
        }
      });
      BL.math.mat4.transformPoint(local, inverse, B.camera.position.x, B.camera.position.y, B.camera.position.z);
      const inside = local.every((value, axis) => value >= min[axis] && value <= max[axis]);
      const camera = B.camera, eye = camera.position, up = camera.up || { x: 0, y: 1, z: 0 };
      const f = [camera.target.x - eye.x, camera.target.y - eye.y, camera.target.z - eye.z], length = Math.hypot(...f);
      for (let axis = 0; axis < 3; axis++) f[axis] /= length;
      const r = [f[1] * up.z - f[2] * up.y, f[2] * up.x - f[0] * up.z, f[0] * up.y - f[1] * up.x], rLength = Math.hypot(...r);
      for (let axis = 0; axis < 3; axis++) r[axis] /= rLength;
      const u = [r[1] * f[2] - r[2] * f[1], r[2] * f[0] - r[0] * f[2], r[0] * f[1] - r[1] * f[0]];
      const halfH = camera.near * Math.tan(camera.fov / 2), halfW = halfH * B.renderer.size.width / B.renderer.size.height;
      const clipMin = [Infinity, Infinity, Infinity], clipMax = [-Infinity, -Infinity, -Infinity];
      for (const x of [-1, 1]) for (const y of [-1, 1]) {
        BL.math.mat4.transformPoint(local, inverse,
          eye.x + f[0] * camera.near + r[0] * halfW * x + u[0] * halfH * y,
          eye.y + f[1] * camera.near + r[1] * halfW * x + u[1] * halfH * y,
          eye.z + f[2] * camera.near + r[2] * halfW * x + u[2] * halfH * y);
        for (let axis = 0; axis < 3; axis++) { clipMin[axis] = Math.min(clipMin[axis], local[axis]); clipMax[axis] = Math.max(clipMax[axis], local[axis]); }
      }
      const clipped = min.every((value, axis) => clipMax[axis] >= value && clipMin[axis] <= max[axis]);
      counts[inside ? "inside" : "outside"]++;
      if (clipped && !inside) counts.clippedOutside++;
      if (head.cameraHidden !== (inside || clipped) && failures.length < 8) failures.push({ dt, pitch, accessory, mode: P.mode, mix: P.closeMix, inside, clipped, hidden: head.cameraHidden });
    };
    P.enterClose();
    for (let i = 0; i < Math.ceil(2 / dt); i++) { P.update(dt); inspect(entry); }
    const firstHidden = head.cameraHidden;
    P.hooks.onZoom(1.15);
    const exitStillInside = head.cameraHidden;
    inspect(exit);
    for (let i = 0; i < Math.ceil(2 / dt); i++) { P.update(dt); inspect(exit); }
    rows.push({ dt, pitch, accessory, entry, exit, firstHidden, exitStillInside, trailingVisible: !head.cameraHidden });
  }
  BL.scene.removeChild(head, mask);
  P.update(0);
  return { backend: B.renderer.kind, rows, failures };
};
