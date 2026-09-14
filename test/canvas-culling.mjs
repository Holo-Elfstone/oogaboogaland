export const canvasCullingProbe = () => {
  const S = window.BL.scene, canvas = document.createElement("canvas"), context = canvas.getContext("2d", { willReadFrequently: true }), renderer = window.BL.canvasRenderer.createRenderer(canvas, { width: 320, height: 240 });
  const camera = S.createCamera({ fov: 90 });
  camera.position = { x: 0, y: 0, z: 5 }; camera.target = { x: 0, y: 0, z: 0 };
  const root = S.createNode(), geometry = { verts: [], faces: [], lines: [] };
  S.addChild(root, S.createNode({ geometry }));
  const quad = (x, y, width, height) => {
    const offset = geometry.verts.length / 3;
    geometry.verts.push(x, y, 0, x + width, y, 0, x + width, y + height, 0, x, y + height, 0);
    geometry.faces.push({ i: [offset, offset + 1, offset + 2, offset + 3], color: [180, 120, 65] });
  };
  const line = (x, y, dx, dy) => {
    const offset = geometry.verts.length / 3;
    geometry.verts.push(x, y, 0, x + dx, y + dy, 0);
    geometry.lines.push({ i: [offset, offset + 1], color: [90, 220, 150], emissive: 1 });
  };
  // Both endpoints can be outside opposite sides while the primitive is
  // visible. The last glow is outside the left edge but still paints pixels.
  quad(-8, 0, 16, 1); line(-8, -1, 16, 0); line(-6.85, -3, 0, 1);
  const methods = ["fill", "stroke", "beginPath"], originals = methods.map((name) => context[name]);
  let calls = 0;
  methods.forEach((name, i) => { context[name] = function (...args) { calls++; return originals[i].apply(this, args); }; });
  const draw = () => {
    calls = 0;
    renderer.render(root, camera, { clear: [0, 0, 0] });
    return { calls, pixels: context.getImageData(0, 0, canvas.width, canvas.height).data };
  };
  try {
    const visible = draw();
    for (const [x, y] of [[-30, 0], [30, 0], [0, -30], [0, 30]]) { quad(x, y, 1, 1); line(x, y, 1, 0); }
    const extended = draw();
    let changed = 0, upper = 0, crossing = 0, edgeGlow = 0;
    const scale = canvas.width / 320;
    for (let i = 0; i < visible.pixels.length; i++) if (visible.pixels[i] !== extended.pixels[i]) changed++;
    for (let y = 0; y < canvas.height; y++) for (let x = 0; x < canvas.width; x++) {
      const offset = (y * canvas.width + x) * 4;
      if (!visible.pixels[offset] && !visible.pixels[offset + 1] && !visible.pixels[offset + 2]) continue;
      if (y < 120 * scale) upper++;
      if (y >= 138 * scale && y <= 150 * scale) crossing++;
      if (x < 2 * scale && y >= 168 * scale && y <= 192 * scale) edgeGlow++;
    }
    return { visibleCalls: visible.calls, extendedCalls: extended.calls, changed, upper, crossing, edgeGlow };
  } finally {
    methods.forEach((name, i) => { context[name] = originals[i]; });
    renderer.dispose();
  }
};
