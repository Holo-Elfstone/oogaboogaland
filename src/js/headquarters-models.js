// Subterranean headquarters room, ramps and personal quarters
(() => {
  "use strict";
  const BL = window.BL = window.BL || {};
  const { box, merge } = BL.models;
  const cached = (build) => {
    let value = null;
    return () => value || (value = build());
  };
  const variants = (build) => {
    const cache = new Array(11);
    return (i = 0) => cache[i % 11] || (cache[i % 11] = build(i % 11));
  };
  const STONE = ["#7d6f61", "#5e5449", "#877869"];
  const MOSS = ["#6f7d3e", "#7b8945", "#65733a"];
  const ROOM_RADIUS = 14;
  const room = cached(() => {
    const parts = [box({ w: 1.3, h: 0.04, d: 1.3, color: "#39352d", offset: { y: 0.025 } })];
    for (let i = 0; i < 10; i++) {
      const angle = i * Math.PI / 5;
      parts.push(box({ w: 0.48, h: 0.22 + i % 3 * 0.045, d: 0.44, color: STONE[i % STONE.length], offset: { x: Math.sin(angle) * 0.95, y: 0.11, z: Math.cos(angle) * 0.95 } }));
    }
    for (const x of [-2.6, 2.6]) {
      parts.push(box({ w: 0.52, h: 0.2, d: 2.15, color: "#735338", offset: { x, y: 0.48 } }));
      for (const z of [-0.8, 0.8]) parts.push(box({ w: 0.58, h: 0.38, d: 0.45, color: STONE[1], offset: { x, y: 0.19, z } }));
    }
    parts.push(box({ w: 0.85, h: 0.17, d: 0.18, color: "#51402d", offset: { y: 0.1, z: -0.15 } }), box({ w: 0.18, h: 0.14, d: 0.92, color: "#63472f", offset: { x: 0.15, y: 0.23 } }));
    return merge(...parts);
  });
  // Rough cairns sit outside the clear entrance; the slope begins between them.
  const entranceRamp = cached(() => {
    const parts = [];
    for (const x of [-2.3, 2.3]) {
      parts.push(box({ w: 0.45, h: 0.3, d: 0.46, color: STONE[1], offset: { x, y: 0.15, z: 0.1 } }), box({ w: 0.34, h: 0.24, d: 0.3, color: STONE[0], offset: { x: x + 0.03, y: 0.42, z: 0.09 } }), box({ w: 0.24, h: 0.025, d: 0.22, color: MOSS[0], offset: { x: x + 0.02, y: 0.553, z: 0.09 } }));
    }
    const geo = merge(...parts);
    geo.headquartersRamp = true;
    return geo;
  });
  const roomEntrance = variants((i) => {
    const rand = BL.math.mulberry32(827 + i * 311), parts = [];
    for (const side of [-1, 1]) for (let row = 0; row < 6; row++) {
      const x = side * (2.25 + (row + i) % 3 * 0.07), y = 0.25 + row * 0.5, depth = 0.52 + rand() * 0.18;
      parts.push(box({ w: 0.64, h: 0.5, d: depth, color: STONE[(row + i + (side > 0 ? 1 : 0)) % STONE.length], offset: { x, y, z: -0.06 } }));
      if ((row + i + (side > 0 ? 2 : 0)) % 4 === 0) {
        parts.push(box({ w: 0.245, h: 0.245, d: 0.025, color: MOSS[(row + i) % MOSS.length], offset: { x: x + side * 0.08, y: y + 0.12, z: depth * 0.5 - 0.045 } }));
      }
    }
    for (let col = 0; col < 8; col++) {
      const x = -2.1 + col * 0.6, y = 3.06 + (col + i) % 3 * 0.04, depth = 0.58 + rand() * 0.15;
      parts.push(box({ w: 0.62, h: 0.52, d: depth, color: STONE[(col + i) % STONE.length], offset: { x, y, z: -0.06 } }));
      if ((col + i * 3) % 5 < 2) {
        parts.push(box({ w: 0.245, h: 0.245, d: 0.025, color: MOSS[(col + i) % MOSS.length], offset: { x, y: y + 0.12, z: depth * 0.5 - 0.045 } }));
        if ((col + i) % 2) parts.push(box({ w: 0.245, h: 0.245, d: 0.025, color: MOSS[(col + i + 1) % MOSS.length], offset: { x: x + 0.24, y: y - 0.12, z: depth * 0.5 - 0.045 } }));
      }
    }
    return merge(...parts);
  });
  BL.headquartersModels = { room, entranceRamp, roomEntrance, ROOM_RADIUS };
})();
