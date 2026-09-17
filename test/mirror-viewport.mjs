// A narrow mirror viewport must match the same region in a wider view. The
// wider reference keeps offscreen rune and rim faces in its canvas paths,
// catching clipped corners or missing silhouette borders in the narrow view.
export const mirrorViewportProbe = () => {
  const B = window.__ooga, BL = window.BL, m = B.mirrorCave.mouth, provider = B.mirrorCave.guides;
  const sr = Math.sin(m.ry), cr = Math.cos(m.ry), size = 300, rows = [], errors = [];
  const world = (x, y, z) => ({ x: m.x + cr * x + sr * z, y: m.floorY + y, z: m.z - sr * x + cr * z });
  const camera = BL.scene.createCamera({ near: 0.1 }), canvas = document.createElement("canvas");
  canvas.width = size * 3; canvas.height = size;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  BL.scene.updateWorld(BL.scenes.hub.root);
  let farCells = 0, nearCells = 0;
  for (const time of [10, 10.08]) for (const contrast of [0, 1]) {
    for (const view of [[0, 1.5, 12], [0, 1.5, 2], [0, 1.5, 0.7], [0, 1.5, 0.55], [4, 1.5, -3], [0, 1.5, -1], [8, 1.5, 3], [0, 6, 1], [-8, -2, 0.5]]) {
      Object.assign(camera.position, world(...view)); Object.assign(camera.target, world(0, 1.5, 0.5));
      provider.update(false, time);
      const images = [];
      for (const width of [size * 3, size]) {
        ctx.clearRect(0, 0, canvas.width, size);
        // An opaque backdrop compares the final visible result rather than
        // unpremultiplying nearly transparent ivory into noisy RGB values.
        ctx.fillStyle = "#18211a"; ctx.fillRect(0, 0, canvas.width, size);
        provider.draw(camera, ctx, 0.7, width, size, contrast);
        images.push(ctx.getImageData(width === size ? 0 : size, 0, size, size).data);
      }
      if (!contrast) {
        if (view[2] === 12) farCells = provider.state.glyphCells;
        if (view[2] === 0.7) nearCells = provider.state.glyphCells;
      }
      let changed = 0, maximum = 0, total = 0, unmatched = 0;
      for (let i = 0; i < images[0].length; i++) {
        const difference = Math.abs(images[0][i] - images[1][i]);
        if (difference) { changed++; maximum = Math.max(maximum, difference); total += difference; }
      }
      // Screen translation can change Canvas edge coverage by one pixel.
      // Compare each differing channel against the other image's immediate
      // neighborhood in both directions so a missing patch cannot pass.
      for (let direction = 0; direction < 2; direction++) {
        const source = images[direction], target = images[1 - direction];
        for (let y = 1; y < size - 1; y++) for (let x = 1; x < size - 1; x++) for (let channel = 0; channel < 3; channel++) {
          const at = (y * size + x) * 4 + channel;
          if (Math.abs(source[at] - target[at]) <= 3) continue;
          let lo = 255, hi = 0;
          for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
            const value = target[((y + dy) * size + x + dx) * 4 + channel];
            lo = Math.min(lo, value); hi = Math.max(hi, value);
          }
          if (source[at] < lo - 3 || source[at] > hi + 3) unmatched++;
        }
      }
      const row = { time, contrast, view, changed, maximum, total, unmatched };
      rows.push(row);
      if (unmatched || total > size * size * 0.03) errors.push(row);
    }
  }
  return { rows, errors, farCells, nearCells };
};
