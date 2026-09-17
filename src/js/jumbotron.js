// The jumbotron: a wooden stadium board on the north rim that shows
// EntropyLab contributor stats. Ported from rules-without-rulers/oogatron
// (its jumbotron/data.js + views.js) into the BL namespace. Data is baked in
// at build time as BL.jumbotronData (scripts/jumbotron-data.mjs); the page
// never fetches. The board renders onto a small offscreen 2D canvas, then
// becomes run-merged emissive quads — the same technique the HQ bed linens
// use for LifeHash prints — so nothing here needs a texture path.
(() => {
  "use strict";
  const BL = window.BL = window.BL || {};
  const { box, merge } = BL.models;
  const { createNode, addChild } = BL.scene;

  // Palette extracted from this world's own materials (see oogatron Phase 4).
  const PALETTE = {
    screenBg: "#0a0c0a",
    grid: "#131912",
    text: "#f3efe4",
    dim: "#a6a6a2",
    accent: "#d8892b",
    commits: "#46ff70",
    prs: "#3fd1c5",
    reviews: "#6f9fca",
    comments: "#f5c542",
    plank: "#a9773f",
    woodDark: "#5c4425",
    screenBezel: "#1d2326",
    standDark: "#4a3319",
    nail: "#3a2a18"
  };

  const BOARD_W = 192, BOARD_H = 108;

  // ---------- 5x7 bitmap font (deterministic, chunky) ----------
  const FONT = {
    A: [0b01110, 0b10001, 0b10001, 0b11111, 0b10001, 0b10001, 0b10001],
    B: [0b11110, 0b10001, 0b11110, 0b10001, 0b10001, 0b10001, 0b11110],
    C: [0b01110, 0b10001, 0b10000, 0b10000, 0b10000, 0b10001, 0b01110],
    D: [0b11100, 0b10010, 0b10001, 0b10001, 0b10001, 0b10010, 0b11100],
    E: [0b11111, 0b10000, 0b11110, 0b10000, 0b10000, 0b10000, 0b11111],
    F: [0b11111, 0b10000, 0b11110, 0b10000, 0b10000, 0b10000, 0b10000],
    G: [0b01110, 0b10001, 0b10000, 0b10111, 0b10001, 0b10001, 0b01111],
    H: [0b10001, 0b10001, 0b11111, 0b10001, 0b10001, 0b10001, 0b10001],
    I: [0b01110, 0b00100, 0b00100, 0b00100, 0b00100, 0b00100, 0b01110],
    J: [0b00111, 0b00010, 0b00010, 0b00010, 0b10010, 0b10010, 0b01100],
    K: [0b10001, 0b10010, 0b10100, 0b11000, 0b10100, 0b10010, 0b10001],
    L: [0b10000, 0b10000, 0b10000, 0b10000, 0b10000, 0b10000, 0b11111],
    M: [0b10001, 0b11011, 0b10101, 0b10101, 0b10001, 0b10001, 0b10001],
    N: [0b10001, 0b11001, 0b10101, 0b10011, 0b10001, 0b10001, 0b10001],
    O: [0b01110, 0b10001, 0b10001, 0b10001, 0b10001, 0b10001, 0b01110],
    P: [0b11110, 0b10001, 0b10001, 0b11110, 0b10000, 0b10000, 0b10000],
    Q: [0b01110, 0b10001, 0b10001, 0b10001, 0b10101, 0b10010, 0b01101],
    R: [0b11110, 0b10001, 0b10001, 0b11110, 0b10100, 0b10010, 0b10001],
    S: [0b01111, 0b10000, 0b10000, 0b01110, 0b00001, 0b00001, 0b11110],
    T: [0b11111, 0b00100, 0b00100, 0b00100, 0b00100, 0b00100, 0b00100],
    U: [0b10001, 0b10001, 0b10001, 0b10001, 0b10001, 0b10001, 0b01110],
    V: [0b10001, 0b10001, 0b10001, 0b10001, 0b10001, 0b01010, 0b00100],
    W: [0b10001, 0b10001, 0b10001, 0b10101, 0b10101, 0b11011, 0b10001],
    X: [0b10001, 0b10001, 0b01010, 0b00100, 0b01010, 0b10001, 0b10001],
    Y: [0b10001, 0b10001, 0b01010, 0b00100, 0b00100, 0b00100, 0b00100],
    Z: [0b11111, 0b00001, 0b00010, 0b00100, 0b01000, 0b10000, 0b11111],
    0: [0b01110, 0b10001, 0b10011, 0b10101, 0b11001, 0b10001, 0b01110],
    1: [0b00100, 0b01100, 0b00100, 0b00100, 0b00100, 0b00100, 0b01110],
    2: [0b01110, 0b10001, 0b00001, 0b00110, 0b01000, 0b10000, 0b11111],
    3: [0b11111, 0b00010, 0b00100, 0b00010, 0b00001, 0b10001, 0b01110],
    4: [0b00010, 0b00110, 0b01010, 0b10010, 0b11111, 0b00010, 0b00010],
    5: [0b11111, 0b10000, 0b11110, 0b00001, 0b00001, 0b10001, 0b01110],
    6: [0b00110, 0b01000, 0b10000, 0b11110, 0b10001, 0b10001, 0b01110],
    7: [0b11111, 0b00001, 0b00010, 0b00100, 0b01000, 0b01000, 0b01000],
    8: [0b01110, 0b10001, 0b10001, 0b01110, 0b10001, 0b10001, 0b01110],
    9: [0b01110, 0b10001, 0b10001, 0b01111, 0b00001, 0b00010, 0b01100],
    " ": [0, 0, 0, 0, 0, 0, 0],
    "-": [0, 0, 0, 0b01110, 0, 0, 0],
    "_": [0, 0, 0, 0, 0, 0, 0b11111],
    ".": [0, 0, 0, 0, 0, 0b00110, 0b00110],
    ",": [0, 0, 0, 0, 0, 0b00100, 0b01000],
    ":": [0, 0b00110, 0b00110, 0, 0b00110, 0b00110, 0],
    "/": [0b00001, 0b00010, 0b00010, 0b00100, 0b01000, 0b01000, 0b10000],
    "+": [0, 0b00100, 0b00100, 0b11111, 0b00100, 0b00100, 0],
    "*": [0, 0b10101, 0b01110, 0b11111, 0b01110, 0b10101, 0],
    "'": [0b00100, 0b00100, 0, 0, 0, 0, 0],
    "!": [0b00100, 0b00100, 0b00100, 0b00100, 0b00100, 0, 0b00100]
  };
  const FALLBACK_GLYPH = [0b11111, 0b10001, 0b10001, 0b10001, 0b10001, 0b10001, 0b11111];
  const GLYPH_W = 5, GLYPH_H = 7, TRACKING = 1;

  const glyphOf = (ch) => FONT[ch.toUpperCase()] || FALLBACK_GLYPH;
  const measureText = (text, scale = 1) =>
    text.length === 0 ? 0 : (text.length * (GLYPH_W + TRACKING) - TRACKING) * scale;
  const drawText = (ctx, text, x, y, color, scale = 1) => {
    ctx.fillStyle = color;
    let cx = x;
    for (const ch of text) {
      const rows = glyphOf(ch);
      for (let r = 0; r < GLYPH_H; r++) {
        const bits = rows[r];
        for (let c = 0; c < GLYPH_W; c++) {
          if (bits & (1 << (GLYPH_W - 1 - c))) ctx.fillRect(cx + c * scale, y + r * scale, scale, scale);
        }
      }
      cx += (GLYPH_W + TRACKING) * scale;
    }
  };
  const fitText = (text, maxWidth, scale = 1) => {
    const perChar = (GLYPH_W + TRACKING) * scale;
    const maxChars = Math.max(0, Math.floor((maxWidth + TRACKING * scale) / perChar));
    return text.length <= maxChars ? text : text.slice(0, maxChars);
  };

  // ---------- stats model (oogatron data.js, schema_version 1) ----------
  const normalizeComments = (c) => ({
    issue: (c && c.issue || 0) | 0, review: (c && c.review || 0) | 0,
    commit: (c && c.commit || 0) | 0, all: (c && c.all || 0) | 0
  });
  const normalizeCounts = (counts) => ({
    commits: (counts && counts.commits || 0) | 0, prs: (counts && counts.prs || 0) | 0,
    reviews: (counts && counts.reviews || 0) | 0, comments: normalizeComments(counts && counts.comments)
  });
  const normalizeBoard = (b) => Array.isArray(b) ? b.map((e) => ({ login: String(e.login), count: e.count | 0 })) : [];
  const displayLabel = (c) => c.login.startsWith("email:") ? c.display_name || "anonymous" : c.login;

  const parseStats = (json) => {
    if (typeof json !== "object" || json === null) throw new Error("stats payload is not an object");
    if (!json.meta || json.meta.schema_version !== 1) throw new Error("unsupported stats schema_version");
    if (!Array.isArray(json.contributors)) throw new Error("stats contributors is not an array");
    const contributors = json.contributors.map((c) => ({
      login: String(c.login),
      display_name: c.display_name || null,
      counts: normalizeCounts(c.counts),
      weekly: Array.isArray(c.weekly)
        ? c.weekly.map((w) => ({ week: String(w.week), commits: w.commits | 0, prs: w.prs | 0, reviews: w.reviews | 0, comments: w.comments | 0 })).sort((a, b) => a.week < b.week ? -1 : 1)
        : []
    }));
    const byLogin = new Map(contributors.map((c) => [c.login, c]));
    const weeklyMap = new Map();
    for (const c of contributors) {
      for (const w of c.weekly) {
        let agg = weeklyMap.get(w.week);
        if (!agg) { agg = { week: w.week, total: 0 }; weeklyMap.set(w.week, agg); }
        agg.total += w.commits + w.prs + w.reviews + w.comments;
      }
    }
    const weeklyTotals = [...weeklyMap.values()].sort((a, b) => a.week < b.week ? -1 : 1);
    const model = {
      repo: String(json.meta.repo || ""),
      totals: { contributors: json.totals.contributors | 0, commits: json.totals.commits | 0, prs: json.totals.prs | 0, reviews: json.totals.reviews | 0, comments: normalizeComments(json.totals.comments) },
      leaderboards: {
        commits: normalizeBoard(json.leaderboards.commits), prs: normalizeBoard(json.leaderboards.prs),
        reviews: normalizeBoard(json.leaderboards.reviews), comments: normalizeBoard(json.leaderboards.comments)
      },
      contributors, byLogin, weeklyTotals,
      latestWeek: weeklyTotals.length ? weeklyTotals[weeklyTotals.length - 1].week : null,
      tickerText: ""
    };
    model.tickerText = deriveTicker(model);
    return model;
  };

  const deriveTicker = (model) => {
    const t = model.totals, parts = [];
    parts.push(`${model.repo}  ${t.contributors} CONTRIBUTORS  ${t.commits} COMMITS  ${t.prs} PRS  ${t.reviews} REVIEWS  ${t.comments.all} COMMENTS`);
    if (model.latestWeek) {
      const active = model.contributors
        .map((c) => ({ c, w: c.weekly.find((w) => w.week === model.latestWeek) }))
        .filter((e) => e.w && e.w.commits + e.w.prs + e.w.reviews + e.w.comments > 0)
        .sort((a, b) => b.w.commits + b.w.prs + b.w.reviews + b.w.comments - (a.w.commits + a.w.prs + a.w.reviews + a.w.comments));
      parts.push(`WEEK ${model.latestWeek}:`);
      for (const { c, w } of active) {
        const bits = [];
        if (w.commits) bits.push(`${w.commits} COMMIT${w.commits === 1 ? "" : "S"}`);
        if (w.prs) bits.push(`${w.prs} PR${w.prs === 1 ? "" : "S"}`);
        if (w.reviews) bits.push(`${w.reviews} REVIEW${w.reviews === 1 ? "" : "S"}`);
        if (w.comments) bits.push(`${w.comments} COMMENT${w.comments === 1 ? "" : "S"}`);
        parts.push(`${displayLabel(c).toUpperCase()}: ${bits.join(" + ")}`);
      }
    }
    return parts.join("   ***   ");
  };

  // ---------- views (oogatron views.js; identicon upgraded to lifehash) ----
  const lifehashCache = new Map();
  const lifehashFor = (login) => {
    let img = lifehashCache.get(login);
    if (!img) {
      img = BL.lifehash.make(`contributor:${login}`);
      lifehashCache.set(login, img);
    }
    return img;
  };
  const drawIdenticon = (ctx, login, x, y) => {
    const { width, height, colors } = lifehashFor(login);
    for (let r = 0; r < height; r++) {
      for (let c = 0; c < width; c++) {
        const i = (r * width + c) * 3;
        ctx.fillStyle = `rgb(${colors[i]},${colors[i + 1]},${colors[i + 2]})`;
        ctx.fillRect(x + c, y + r, 1, 1);
      }
    }
  };

  const clearBoard = (ctx) => {
    ctx.fillStyle = PALETTE.screenBg;
    ctx.fillRect(0, 0, BOARD_W, BOARD_H);
  };
  const header = (ctx, title, right) => {
    drawText(ctx, title, 3, 3, PALETTE.accent, 1);
    if (right) drawText(ctx, right, BOARD_W - 3 - measureText(right, 1), 3, PALETTE.dim, 1);
    ctx.fillStyle = PALETTE.dim;
    ctx.fillRect(0, 12, BOARD_W, 1);
  };
  const countTotal = (c) => c.commits + c.prs + c.reviews + c.comments.all;

  const renderTotals = (ctx, model) => {
    clearBoard(ctx);
    header(ctx, "ENTROPYLAB TOTALS", model.latestWeek || "");
    const t = model.totals;
    const rows = [
      ["CONTRIBUTORS", t.contributors, PALETTE.accent],
      ["COMMITS", t.commits, PALETTE.commits],
      ["PRS", t.prs, PALETTE.prs],
      ["REVIEWS", t.reviews, PALETTE.reviews],
      ["COMMENTS", t.comments.all, PALETTE.comments]
    ];
    let y = 17;
    for (const [label, value, color] of rows) {
      drawText(ctx, String(label), 6, y + 3, PALETTE.dim, 1);
      const v = String(value);
      drawText(ctx, v, BOARD_W - 66 - measureText(v, 2), y, color, 2);
      y += 15;
    }
    const spark = model.weeklyTotals.slice(-14);
    if (spark.length > 0) {
      const maxV = Math.max(...spark.map((w) => w.total), 1);
      const bw = 4, bx = BOARD_W - 6 - spark.length * bw, baseY = BOARD_H - 12, maxH = 56;
      spark.forEach((w, i) => {
        const h = Math.max(1, Math.round(w.total / maxV * maxH));
        ctx.fillStyle = i === spark.length - 1 ? PALETTE.accent : PALETTE.commits;
        ctx.fillRect(bx + i * bw, baseY - h, bw - 1, h);
      });
      const label = `${spark.length} WEEKS`;
      drawText(ctx, label, BOARD_W - 6 - measureText(label), baseY + 3, PALETTE.dim, 1);
    }
    return false;
  };

  const renderLeaderboard = (ctx, model, params) => {
    const type = params && params.type || "commits";
    const board = model.leaderboards[type] || [];
    const color = PALETTE[type] || PALETTE.accent;
    clearBoard(ctx);
    header(ctx, `TOP ${type.toUpperCase()}`, model.latestWeek || "");
    const top = board.slice(0, 7);
    const maxV = Math.max(...top.map((e) => e.count), 1);
    let y = 16;
    top.forEach((e, i) => {
      const c = model.byLogin.get(e.login);
      const label = fitText((c ? displayLabel(c) : e.login).toUpperCase(), 66, 1);
      drawText(ctx, String(i + 1), 4, y, i === 0 ? PALETTE.accent : PALETTE.dim, 1);
      drawText(ctx, label, 14, y, PALETTE.text, 1);
      const barX = 84, barMax = BOARD_W - barX - 30;
      ctx.fillStyle = color;
      ctx.fillRect(barX, y + 1, Math.max(1, Math.round(e.count / maxV * barMax)), 5);
      const v = String(e.count);
      drawText(ctx, v, BOARD_W - 4 - measureText(v, 1), y, color, 1);
      y += 13;
    });
    return false;
  };

  const renderContributor = (ctx, model, params) => {
    const login = params && params.login;
    const c = login && model.byLogin.get(login) || model.contributors[0];
    clearBoard(ctx);
    if (!c) {
      drawText(ctx, "NO CONTRIBUTORS", 40, 48, PALETTE.dim, 1);
      return false;
    }
    header(ctx, "CONTRIBUTOR", model.latestWeek || "");
    drawIdenticon(ctx, c.login, 6, 17);
    const name = fitText(displayLabel(c).toUpperCase(), BOARD_W - 50, 1);
    drawText(ctx, name, 44, 20, PALETTE.text, 1);
    if (c.display_name && !c.login.startsWith("email:")) {
      drawText(ctx, fitText(c.display_name.toUpperCase(), BOARD_W - 50, 1), 44, 30, PALETTE.dim, 1);
    }
    const counts = [
      ["CM", c.counts.commits, PALETTE.commits],
      ["PR", c.counts.prs, PALETTE.prs],
      ["RV", c.counts.reviews, PALETTE.reviews],
      ["MSG", c.counts.comments.all, PALETTE.comments]
    ];
    let x = 44;
    for (const [label, value, color] of counts) {
      drawText(ctx, String(label), x, 42, PALETTE.dim, 1);
      drawText(ctx, String(value), x, 50, color, 1);
      x += 36;
    }
    const weeks = c.weekly.slice(-26);
    if (weeks.length > 0) {
      const maxV = Math.max(...weeks.map((w) => w.commits + w.prs + w.reviews + w.comments), 1);
      const bw = 5, bx = 6, baseY = BOARD_H - 12, maxH = 28;
      weeks.forEach((w, i) => {
        const total = w.commits + w.prs + w.reviews + w.comments;
        const h = Math.max(total > 0 ? 1 : 0, Math.round(total / maxV * maxH));
        if (h > 0) {
          ctx.fillStyle = i === weeks.length - 1 ? PALETTE.accent : PALETTE.prs;
          ctx.fillRect(bx + i * bw, baseY - h, bw - 1, h);
        }
      });
      drawText(ctx, `${weeks.length} WEEKS`, bx, baseY + 3, PALETTE.dim, 1);
    }
    return false;
  };

  const TICKER_SPEED = 30;
  const renderTicker = (ctx, model, _params, t) => {
    clearBoard(ctx);
    header(ctx, "LIVE WIRE", model.latestWeek || "");
    const digest = [
      ["COMMITS", model.totals.commits, PALETTE.commits],
      ["PRS", model.totals.prs, PALETTE.prs],
      ["REVIEWS", model.totals.reviews, PALETTE.reviews],
      ["COMMENTS", model.totals.comments.all, PALETTE.comments]
    ];
    let x = 6;
    for (const [label, value, color] of digest) {
      drawText(ctx, String(label), x, 26, PALETTE.dim, 1);
      drawText(ctx, String(value), x, 36, color, 2);
      x += 46;
    }
    const text = model.tickerText || "NO DATA";
    const tw = measureText(text, 1) + BOARD_W;
    const offset = (t || 0) * TICKER_SPEED % tw;
    const y = BOARD_H - 20;
    ctx.fillStyle = PALETTE.grid;
    ctx.fillRect(0, y - 4, BOARD_W, 15);
    drawText(ctx, text, BOARD_W - offset, y, PALETTE.accent, 1);
    return true;
  };

  const VIEWS = { totals: renderTotals, leaderboard: renderLeaderboard, contributor: renderContributor, ticker: renderTicker };

  // ---------- cabinet: plank sign + dark frame + legs, native boxes -------
  const SW = 16 / 9, SH = 1, BORDER = 0.1, DEPTH = 0.14;
  const cabinetGeometry = () => {
    const outerW = SW + 2 * BORDER, outerH = SH + 2 * BORDER;
    const t = outerH / 9, zr = DEPTH / 2 - 0.02;
    const parts = [
      box({ w: outerW, h: outerH, d: DEPTH, color: PALETTE.plank }),
      box({ w: outerW, h: t, d: 0.05, color: PALETTE.woodDark, offset: { y: outerH / 2 - t / 2, z: zr } }),
      box({ w: outerW, h: t, d: 0.05, color: PALETTE.woodDark, offset: { y: -(outerH / 2 - t / 2), z: zr } }),
      box({ w: t, h: outerH, d: 0.05, color: PALETTE.woodDark, offset: { x: outerW / 2 - t / 2, z: zr } }),
      box({ w: t, h: outerH, d: 0.05, color: PALETTE.woodDark, offset: { x: -(outerW / 2 - t / 2), z: zr } }),
      box({ w: SW + 0.05, h: SH + 0.05, d: 0.018, color: PALETTE.screenBezel, offset: { z: DEPTH / 2 + 0.005 } })
    ];
    const nx = outerW / 2 - t / 2, ny = outerH / 2 - t / 2;
    for (const [px, py] of [[-nx, ny], [nx, ny], [-nx, -ny], [nx, -ny]]) {
      parts.push(box({ w: 0.07, h: 0.07, d: 0.028, color: PALETTE.nail, offset: { x: px, y: py, z: DEPTH / 2 + 0.032 } }));
    }
    const legX = SW / 2 - 0.18, legH = 0.6, bottom = -outerH / 2;
    for (const sx of [-legX, legX]) {
      parts.push(box({ w: 0.12, h: legH, d: 0.12, color: PALETTE.woodDark, offset: { x: sx, y: bottom - legH / 2 } }));
      parts.push(box({ w: 0.3, h: 0.06, d: 0.3, color: PALETTE.standDark, offset: { x: sx, y: bottom - legH - 0.03 } }));
    }
    return merge(...parts);
  };

  // ---------- board pixels -> run-merged emissive quads -------------------
  const SCREEN_Z = DEPTH / 2 + 0.02;
  const CONTENT_Z = DEPTH / 2 + 0.026;
  const PX_W = SW / BOARD_W, PX_H = SH / BOARD_H;

  const pushQuad = (geo, x0, x1, y0, y1, z, color, emissive) => {
    const base = geo.verts.length / 3;
    geo.verts.push(x0, y0, z, x1, y0, z, x1, y1, z, x0, y1, z);
    geo.faces.push({ i: [base, base + 1, base + 2, base + 3], color, emissive });
  };

  const screenGeometryFrom = (ctx) => {
    const geo = { verts: [], faces: [], lines: [] };
    // Base panel: the dark screen ground; content pixels sit just proud.
    // Face colors are 0-255, like models.js hexToRgb — the renderer
    // normalizes at upload.
    pushQuad(geo, -SW / 2, SW / 2, -SH / 2, SH / 2, SCREEN_Z, [10, 12, 10], 0.35);
    const data = ctx.getImageData(0, 0, BOARD_W, BOARD_H).data;
    // Skip background and the scanline tint (it would shimmer at distance).
    const skip = (r, g, b) => (r === 10 && g === 12 && b === 10) || (r === 19 && g === 25 && b === 18);
    for (let y = 0; y < BOARD_H; y++) {
      const wy0 = SH / 2 - (y + 1) * PX_H, wy1 = SH / 2 - y * PX_H;
      let x = 0;
      while (x < BOARD_W) {
        const i = (y * BOARD_W + x) * 4;
        const r = data[i], g = data[i + 1], b = data[i + 2];
        if (skip(r, g, b)) { x++; continue; }
        let run = x + 1;
        while (run < BOARD_W) {
          const j = (y * BOARD_W + run) * 4;
          if (data[j] !== r || data[j + 1] !== g || data[j + 2] !== b) break;
          run++;
        }
        pushQuad(geo, -SW / 2 + x * PX_W, -SW / 2 + run * PX_W, wy0, wy1, CONTENT_Z, [r, g, b], 0.9);
        x = run;
      }
    }
    geo.castShadow = false; // thousands of tiny quads have no business in the shadow pass
    return geo;
  };

  // ---------- public API --------------------------------------------------
  // BL.jumbotron.create({ data, position, ry, scale }) ->
  //   { node, update(elapsed, renderer), setView, nextView, autoRotate,
  //     showContributor, view, dispose(renderer) }
  const create = ({ data, position = { x: 0, y: 0, z: 0 }, ry = 0, scale = 1 } = {}) => {
    const canvas = document.createElement("canvas");
    canvas.width = BOARD_W;
    canvas.height = BOARD_H;
    // willReadFrequently: every refresh reads the board back for meshing;
    // without it Chrome warns after a few readbacks and the console-clean
    // suite checks would trip on every hub page.
    const ctx = canvas.getContext("2d", { alpha: false, willReadFrequently: true });

    let model = null;
    try {
      model = parseStats(data);
    } catch (e) {
      model = null; // board shows the awaiting screen; the island must not break on bad data
    }

    let view = { name: "totals", params: undefined };
    let cycleIndex = 0;
    let rotateEvery = 8;
    let lastSwitchAt = 0;
    let suspendUntil = 0;
    let lastTickerAt = 0;
    let dirty = true;
    let animated = false;

    const cycle = () => {
      const c = [
        { name: "totals" },
        { name: "leaderboard", params: { type: "commits" } },
        { name: "leaderboard", params: { type: "prs" } },
        { name: "leaderboard", params: { type: "reviews" } },
        { name: "leaderboard", params: { type: "comments" } }
      ];
      if (model) for (const entry of model.contributors.slice(0, 3)) c.push({ name: "contributor", params: { login: entry.login } });
      c.push({ name: "ticker" });
      return c;
    };

    const renderBoard = (t) => {
      if (!model) {
        clearBoard(ctx);
        drawText(ctx, "OOGATRON", 62, 44, PALETTE.accent, 2);
        drawText(ctx, "AWAITING DATA", 57, 60, PALETTE.dim, 1);
        return false;
      }
      return !!(VIEWS[view.name] || VIEWS.totals)(ctx, model, view.params, t);
    };

    const node = createNode({
      position: { x: position.x, y: position.y, z: position.z },
      rotation: { x: 0, y: ry, z: 0 },
      scale: { x: scale, y: scale, z: scale },
      geometry: cabinetGeometry()
    });
    const screenNode = createNode({ geometry: null });
    addChild(node, screenNode);

    const refresh = (t, renderer) => {
      animated = renderBoard(t);
      const old = screenNode.geometry;
      screenNode.geometry = screenGeometryFrom(ctx);
      if (old && renderer && renderer.releaseGeometry) renderer.releaseGeometry(old);
      dirty = false;
    };

    const api = {
      node,
      get view() { return view; },
      setView(name, params) {
        if (!VIEWS[name]) return;
        view = { name, params };
        dirty = true;
      },
      nextView() {
        const c = cycle();
        cycleIndex = (cycleIndex + 1) % c.length;
        view = c[cycleIndex];
        dirty = true;
      },
      autoRotate(seconds) {
        rotateEvery = seconds > 0 ? seconds : 0;
      },
      // Poke an Ooga -> their stats on the big screen. Roster names are
      // GitHub handles, but a couple are display names; match either.
      showContributor(name) {
        if (!model) return false;
        let login = model.byLogin.has(name) ? name : null;
        if (!login) {
          const lower = String(name).toLowerCase();
          const hit = model.contributors.find((c) => (c.display_name || "").toLowerCase() === lower);
          if (hit) login = hit.login;
        }
        if (!login) return false;
        view = { name: "contributor", params: { login } };
        dirty = true;
        suspendUntil = lastSwitchAt = -1; // resolved on next update from elapsed
        api._suspend = 14;
        return true;
      },
      update(elapsed, renderer) {
        if (api._suspend) {
          suspendUntil = elapsed + api._suspend;
          lastSwitchAt = elapsed;
          api._suspend = 0;
        }
        if (rotateEvery > 0 && elapsed >= suspendUntil && elapsed - lastSwitchAt >= rotateEvery) {
          lastSwitchAt = elapsed;
          api.nextView();
        }
        // The ticker scrolls; step it gently instead of every frame.
        if (animated && view.name === "ticker" && elapsed - lastTickerAt >= 0.25) {
          lastTickerAt = elapsed;
          dirty = true;
        }
        if (dirty) refresh(elapsed, renderer);
      },
      dispose(renderer) {
        if (renderer && renderer.releaseGeometry) {
          if (screenNode.geometry) renderer.releaseGeometry(screenNode.geometry);
          if (node.geometry) renderer.releaseGeometry(node.geometry);
        }
        screenNode.geometry = null;
        node.geometry = null;
      }
    };
    return api;
  };

  BL.jumbotron = { create, parseStats, PALETTE };
})();
