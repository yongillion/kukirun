// =============================================================================
//  Land 3 — Cocoa Cavern (코코아 동굴)
// =============================================================================
import {
  rng, tone, mix, rgba, OUTLINE, fill, stroke, clipTo, innerShade, innerLight, gloss, glint, glow,
  sparkle, poly, circle, ellipse, linearGrad, radialGrad, lerp, clamp, TAU, canvas, ctx2d,
  tiled, wrapAt, TM, waves, circles, unionPart, cel, hazeOnPaint, scallops, chunkPts, roundPoly,
  shadeU, lightU, candyBall,
} from './_env_kit.js';
import { GW, GH, SURF, makeGround, makeCaps, makePlats, matPath, platRepeat, PLAT_MID } from './_env_land.js';
import { catmull, ySampler, humpPts, scatter, memo } from './_env_util.js';

const W = 1536;
const C = {
  fog: '#5c3c6c',
  rock: '#5a3a2a', rockL: '#7a5038', rockD: '#3e2519', rockDD: '#2a1810',
  violet: '#c08bff', violetL: '#ecd9ff', violetD: '#8656d8',
  cyan: '#7ff0ff', cyanL: '#e2fdff', cyanD: '#36b3d4',
  milk: '#a4663e', milkL: '#d49866', milkD: '#7a4426',
};

// ---------------------------------------------------------------------------
// Crystals & glow
// ---------------------------------------------------------------------------
const CRY = {
  violet: { base: C.violet, light: C.violetL, dark: C.violetD, glow: '#b37cff' },
  cyan: { base: C.cyan, light: C.cyanL, dark: C.cyanD, glow: '#6fe8ff' },
  pink: { base: '#ff9ad8', light: '#ffe0f4', dark: '#d65aa8', glow: '#ff7fd0' },
};
/** One crystal prism from base (x,y), angle (0 = up), length, width. */
export function crystal(g, x, y, ang, len, w, pal, o = {}) {
  g.save(); g.translate(x, y); g.rotate(ang);
  const tipH = w * 0.9;
  const sh = (c) => { c.moveTo(-w / 2, 6); c.lineTo(-w / 2, -len + tipH); c.lineTo(0, -len); c.lineTo(w / 2, -len + tipH); c.lineTo(w / 2, 6); c.closePath(); };
  if (o.lw) stroke(g, sh, o.lw * 2, o.outline || OUTLINE);
  fill(g, sh, pal.base);
  clipTo(g, sh, () => {
    // right (shadow) facet
    g.fillStyle = pal.dark; g.beginPath(); g.moveTo(w * 0.12, 8); g.lineTo(w * 0.12, -len + tipH * 1.05); g.lineTo(0, -len); g.lineTo(w, -len); g.lineTo(w, 8); g.closePath(); g.fill();
    // left lit facet
    g.fillStyle = pal.light; g.globalAlpha = 0.85; g.beginPath(); g.moveTo(-w / 2, 8); g.lineTo(-w / 2, -len + tipH); g.lineTo(0, -len); g.lineTo(-w * 0.22, -len + tipH * 1.1); g.lineTo(-w * 0.22, 8); g.closePath(); g.fill(); g.globalAlpha = 1;
    // inner glow toward the base
    g.fillStyle = linearGrad(g, 0, -len, 0, 6, [[0, 'rgba(255,255,255,0)'], [1, rgba(pal.glow, 0.35)]]);
    g.fillRect(-w, -len, w * 2, len + 8);
  });
  if (o.glint !== false) { g.fillStyle = 'rgba(255,255,255,0.9)'; g.beginPath(); g.ellipse(-w * 0.3, -len + tipH + len * 0.18, w * 0.09, len * 0.12, 0, 0, TAU); g.fill(); }
  g.restore();
}
/** A cluster of crystals fanning out from (x, y). */
export function crystalCluster(g, x, y, s, pal, o = {}) {
  const R = rng(o.seed ?? Math.round(x * 13 + y * 7));
  if (o.glow !== false) glow(g, x, y - 26 * s, 90 * s * (o.glowK ?? 1), pal.glow, o.glowA ?? 0.45);
  const n = o.n ?? 5;
  const list = [];
  for (let i = 0; i < n; i++) {
    const t = n === 1 ? 0.5 : i / (n - 1);
    const ang = (t - 0.5) * (o.spread ?? 1.3) + (R() - 0.5) * 0.15;
    const len = (38 + R() * 26) * s * (1 - Math.abs(t - 0.5) * 0.9);
    const w = (14 + R() * 6) * s * (1 - Math.abs(t - 0.5) * 0.4);
    list.push({ ang, len, w, dx: (t - 0.5) * 18 * s });
  }
  // draw outer first, centre last
  list.sort((a, b) => Math.abs(b.ang) - Math.abs(a.ang));
  for (const c of list) crystal(g, x + c.dx, y, c.ang, c.len, c.w, pal, o);
}
function sporeDots(g, R, x0, x1, y0, y1, n, cols) {
  // x0/x1 ignored: dots are placed in [0, W) and wrapped so the layer tiles
  for (let i = 0; i < n; i++) {
    const x = R() * W, y = y0 + R() * (y1 - y0), r = 1 + R() * 2.2;
    const col = cols[Math.floor(R() * cols.length)];
    wrapAt(g, W, x - r * 6, x + r * 6, () => {
      glow(g, x, y, r * 5, col, 0.35);
      g.fillStyle = rgba('#ffffff', 0.8); g.beginPath(); g.arc(x, y, r * 0.6, 0, TAU); g.fill();
    });
  }
}

// ---------------------------------------------------------------------------
// Rock formations
// ---------------------------------------------------------------------------
/** Blunt, drippy chocolate stalagmite rising from (x, base) — rounded so it
 *  never reads as a hazard. */
function stalagmite(g, x, base, h, w, o) {
  const R = rng(Math.round(x * 3 + h));
  const tipR = w * 0.16;
  const pts = catmull([[x - w / 2, base + 10], [x - w * 0.44, base - h * 0.22], [x - w * 0.3, base - h * 0.55], [x - tipR * 1.1, base - h + tipR * 1.3], [x - tipR * 0.4, base - h + tipR * 0.15], [x + tipR * 0.5, base - h + tipR * 0.2], [x + tipR * 1.15, base - h + tipR * 1.4], [x + w * 0.32, base - h * 0.52], [x + w * 0.45, base - h * 0.2], [x + w / 2, base + 10]], 8);
  const sh = (c) => { poly(pts, false)(c); c.closePath(); };
  if (o.lw) stroke(g, sh, o.lw * 2, o.outline);
  fill(g, sh, linearGrad(g, 0, base - h, 0, base, [[0, o.top || o.col], [1, o.col]]));
  clipTo(g, sh, () => {
    // flowing drip ridges
    g.strokeStyle = rgba(o.dark, 0.55); g.lineWidth = Math.max(1.4, w * 0.035); g.lineCap = 'round';
    for (let i = 0; i < 3; i++) {
      const t = (i + 1) / 4;
      g.beginPath(); g.moveTo(x - w * 0.36 + w * 0.72 * t, base); g.quadraticCurveTo(x - w * 0.18 + w * 0.36 * t, base - h * 0.5, x - w * 0.05 + w * 0.1 * t, base - h * (0.7 + R() * 0.12)); g.stroke();
    }
    g.fillStyle = rgba(o.dark, 0.55);
    g.beginPath(); g.moveTo(x + w * 0.04, base - h - 4); g.quadraticCurveTo(x + w * 0.06, base - h * 0.4, x + w * 0.2, base + 10); g.lineTo(x + w, base + 10); g.lineTo(x + w, base - h - 4); g.closePath(); g.fill();
    // glossy wet highlight
    g.strokeStyle = rgba('#e8c8ff', 0.35); g.lineWidth = Math.max(2, w * 0.05);
    g.beginPath(); g.moveTo(x - tipR * 0.6, base - h + tipR * 1.2); g.quadraticCurveTo(x - w * 0.2, base - h * 0.55, x - w * 0.3, base - h * 0.25); g.stroke();
  });
  if (o.rim) innerLight(g, sh, o.rim, 3, 2);
  // a chocolate drip collar near the top
  const cy = base - h + tipR * 2.2;
  const col = (c) => { c.moveTo(x - tipR * 1.6, cy); c.quadraticCurveTo(x, cy - tipR * 1.3, x + tipR * 1.6, cy); c.quadraticCurveTo(x + tipR * 1.4, cy + tipR * 1.4, x + tipR * 0.7, cy + tipR); c.quadraticCurveTo(x + tipR * 0.5, cy + tipR * 2.6, x + tipR * 0.1, cy + tipR); c.quadraticCurveTo(x - tipR * 0.9, cy + tipR * 1.5, x - tipR * 1.6, cy); c.closePath(); };
  if (o.collar) cel(g, col, { fill: o.collar, shade: tone(o.collar, -0.2), shadeDx: 2, shadeDy: 3, lw: o.lw * 0.8, outline: o.outline });
  return pts;
}
/** Column spanning ceiling to floor (hourglass) for the far layer. */
function column(g, x, top, base, w, o) {
  const R = rng(Math.round(x * 5));
  const nw = w * (0.35 + R() * 0.25);
  const ym = top + (base - top) * (0.45 + R() * 0.2);
  const pts = catmull([[x - w * 0.75, top - 10], [x - w * 0.5, top + 30], [x - nw / 2, ym], [x - w * 0.55, base - 30], [x - w * 0.95, base + 10]], 10);
  const pr = catmull([[x + w * 0.95, base + 10], [x + w * 0.55, base - 30], [x + nw / 2, ym + 6], [x + w * 0.5, top + 30], [x + w * 0.75, top - 10]], 10);
  const sh = (c) => { poly([...pts, ...pr], true)(c); };
  fill(g, sh, o.col);
  innerShade(g, sh, rgba(o.dark, 0.5), w * 0.25, 0);
  innerLight(g, sh, rgba(o.rim, o.rimA ?? 0.35), 4, 0);
}

// ---------------------------------------------------------------------------
// FAR — deep cave: columns, distant glows, a chocolate waterfall
// ---------------------------------------------------------------------------
function far() {
  const H = 420, R = rng(3101);
  return tiled(W, H, (g) => {
    // light shafts from ceiling cracks
    for (const [x, w, col] of [[300, 90, '#b37cff'], [980, 120, '#6fe8ff'], [1350, 70, '#6fe8ff']]) wrapAt(g, W, x - 260, x + 260, () => {
      g.save();
      g.fillStyle = linearGrad(g, 0, 0, 0, H, [[0, rgba(col, 0.0)], [0.25, rgba(col, 0.1)], [1, rgba(col, 0.0)]]);
      g.beginPath(); g.moveTo(x - w / 2, 0); g.lineTo(x + w / 2, 0); g.lineTo(x + w * 1.4 + 120, H); g.lineTo(x - w * 0.4 + 120, H); g.closePath(); g.fill();
      g.restore();
    });
    // distant glows
    const glows = [[180, 280, '#b37cff'], [520, 320, '#6fe8ff'], [880, 260, '#b37cff'], [1230, 300, '#b37cff'], [1420, 340, '#6fe8ff']];
    for (const [x, y, col] of glows) wrapAt(g, W, x - 200, x + 200, () => glow(g, x, y, 190, col, 0.2));
    // distant giant crystal formation (soft focal glow)
    wrapAt(g, W, 700 - 160, 700 + 160, () => {
      const x = 700, y = 330;
      glow(g, x, y - 60, 220, '#b37cff', 0.32);
      glow(g, x, y - 40, 110, '#e6d2ff', 0.3);
      const pal = { base: mix('#b88cf2', C.fog, 0.25), light: mix('#eadcff', C.fog, 0.15), dark: mix('#7a54c8', C.fog, 0.3), glow: '#b37cff' };
      for (const [dx, a, len, w] of [[-60, -0.62, 120, 46], [56, 0.5, 132, 50], [-24, -0.22, 176, 58], [22, 0.12, 196, 62], [86, 0.86, 80, 36], [-92, -0.95, 76, 34]]) crystal(g, x + dx, y, a, len, w, pal, { glint: false });
    });
    // columns (two depths), dissolving upward into darkness
    const cols1 = [[90, 120], [400, 90], [1010, 140], [1310, 100]];
    for (const [x, w] of cols1) wrapAt(g, W, x - w, x + w, () => column(g, x, -40, 380, w, { col: mix('#2f1a38', C.fog, 0.2), dark: '#1a0c20', rim: '#a07ad0', rimA: 0.32 }));
    const cols2 = [[250, 70], [820, 80], [1180, 60]];
    for (const [x, w] of cols2) wrapAt(g, W, x - w, x + w, () => column(g, x, -40, 400, w, { col: mix('#3a2240', C.fog, 0.12), dark: '#1e0f24', rim: '#c8a4f0', rimA: 0.4 }));
    // floor mounds
    const f1 = waves(R, W, 330, [[3, 14], [5, 9], [9, 5]]);
    const mound = (c) => { c.moveTo(-TM, H + 10); for (let x = -TM; x <= W + TM; x += 4) c.lineTo(x, f1(x)); c.lineTo(W + TM, H + 10); c.closePath(); };
    fill(g, mound, linearGrad(g, 0, 300, 0, H, [[0, mix('#442848', C.fog, 0.28)], [1, mix('#56345a', C.fog, 0.45)]]));
    innerLight(g, mound, rgba('#c0a2ea', 0.38), 0, 3);
    // far crystal glints
    const pts = scatter(R, W, 14, 260, 360, 90);
    for (const [x, y] of pts) {
      const pal = R() < 0.5 ? CRY.violet : CRY.cyan;
      const s = 0.35 + R() * 0.2;
      wrapAt(g, W, x - 40, x + 40, () => { glow(g, x, f1(x) - 4, 40, pal.glow, 0.35); crystalCluster(g, x, f1(x) + 2, s, { base: mix(pal.base, C.fog, 0.3), light: mix(pal.light, C.fog, 0.2), dark: mix(pal.dark, C.fog, 0.3), glow: pal.glow }, { glow: false, n: 3, glint: false }); });
    }
    hazeOnPaint(g, -TM, W + TM, 240, H, '#7a5a8a', 0, 0.35);
    // dissolve the top edge into the cave darkness (no hard line at y=180)
    g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = 'destination-in';
    g.fillStyle = linearGrad(g, 0, 0, 0, 150, [[0, 'rgba(0,0,0,0)'], [1, 'rgba(0,0,0,1)']]);
    g.fillRect(0, 0, g.canvas.width, H); g.restore();
  });
}

// ---------------------------------------------------------------------------
// MID — stalagmites, glowing crystal clusters, giant glow mushrooms
// ---------------------------------------------------------------------------
function mushroom(g, x, base, h, r, o) {
  const lw = o.lw, oc = o.outline;
  if (o.glowA !== 0) glow(g, x, base - h, r * 3, o.glow, o.glowA ?? 0.4);
  const st = (c) => { c.moveTo(x - r * 0.18, base + 4); c.quadraticCurveTo(x - r * 0.12 + (o.lean ?? 0) * 0.5, base - h * 0.5, x - r * 0.14 + (o.lean ?? 0), base - h); c.lineTo(x + r * 0.14 + (o.lean ?? 0), base - h); c.quadraticCurveTo(x + r * 0.14 + (o.lean ?? 0) * 0.5, base - h * 0.5, x + r * 0.2, base + 4); c.closePath(); };
  cel(g, st, { fill: o.stem || '#e8d8f4', shade: tone(o.stem || '#e8d8f4', -0.2), shadeDx: r * 0.15, shadeDy: 0, lw, outline: oc });
  const cx = x + (o.lean ?? 0), cy = base - h;
  const cap = (c) => { c.moveTo(cx - r, cy + r * 0.12); c.bezierCurveTo(cx - r, cy - r * 0.95, cx + r, cy - r * 0.95, cx + r, cy + r * 0.12); c.quadraticCurveTo(cx, cy + r * 0.36, cx - r, cy + r * 0.12); c.closePath(); };
  cel(g, cap, { fill: o.cap, shade: tone(o.cap, -0.25), shadeDx: r * 0.25, shadeDy: r * 0.2, light: rgba('#ffffff', 0.45), lightDx: r * 0.1, lightDy: r * 0.12, lw, outline: oc });
  const R = rng(Math.round(x * 17));
  for (let i = 0; i < 4; i++) {
    const a = -Math.PI * (0.15 + R() * 0.7), d = r * (0.3 + R() * 0.45);
    g.fillStyle = rgba('#ffffff', 0.8); g.beginPath(); g.ellipse(cx + Math.cos(a) * d, cy + Math.sin(a) * d * 0.7 - r * 0.1, r * 0.11, r * 0.08, 0, 0, TAU); g.fill();
  }
  // gills underside
  g.strokeStyle = rgba(tone(o.cap, -0.35), 0.6); g.lineWidth = 1.2;
  g.beginPath(); g.moveTo(cx - r * 0.7, cy + r * 0.16); g.quadraticCurveTo(cx, cy + r * 0.32, cx + r * 0.7, cy + r * 0.16); g.stroke();
}
function mid() {
  const H = 380, R = rng(3301);
  const oc = mix(OUTLINE, '#1a0c14', 0.3), lw = 2;
  return tiled(W, H, (g) => {
    // rock shelf silhouettes behind
    const f0 = waves(R, W, 250, [[2, 18], [3, 12], [7, 6]]);
    const shelf = (c) => { c.moveTo(-TM, H + 10); for (let x = -TM; x <= W + TM; x += 4) c.lineTo(x, f0(x)); c.lineTo(W + TM, H + 10); c.closePath(); };
    fill(g, shelf, linearGrad(g, 0, 220, 0, H, [[0, '#432838'], [1, '#34202c']]));
    innerLight(g, shelf, rgba('#a07ad0', 0.35), 0, 4);
    // stalagmites
    const sm = [[60, 120, 92], [220, 170, 120], [610, 150, 110], [1000, 190, 130], [1150, 110, 84], [1400, 160, 116]];
    for (const [x, h, w] of sm) wrapAt(g, W, x - w, x + w, () => stalagmite(g, x, f0(x) + 30, h, w, { col: '#55372e', top: '#654334', dark: '#382019', rim: rgba('#c9a0ff', 0.4), lw, outline: oc, collar: '#8a5638' }));
    // crystal clusters (glowing)
    const cc = [[140, 'violet', 1.15], [470, 'cyan', 0.95], [880, 'violet', 1.3], [1270, 'cyan', 1.1], [1500, 'violet', 0.8]];
    for (const [x, k, s] of cc) wrapAt(g, W, x - 120, x + 120, () => crystalCluster(g, x, f0(x) + 22, s, CRY[k], { lw, outline: oc, n: 5, glowA: 0.4 }));
    // giant mushrooms
    const ms = [[400, 120, 34, '#7ff0ff', '#6fe8ff'], [700, 90, 26, '#c08bff', '#b37cff'], [1200, 104, 30, '#7ff0ff', '#6fe8ff']];
    for (const [x, h, r, cap, gl] of ms) wrapAt(g, W, x - 90, x + 90, () => mushroom(g, x, f0(x) + 26, h, r, { cap, glow: gl, lw, outline: oc, lean: (x % 3) - 1 }));
    // floor
    const f1 = waves(R, W, 316, [[3, 8], [6, 5], [11, 3]]);
    const floor = (c) => { c.moveTo(-TM, H + 10); for (let x = -TM; x <= W + TM; x += 4) c.lineTo(x, f1(x)); c.lineTo(W + TM, H + 10); c.closePath(); };
    fill(g, floor, linearGrad(g, 0, 300, 0, H, [[0, '#523242'], [1, '#3e2636']]));
    innerLight(g, floor, rgba('#b48ae6', 0.45), 0, 4);
    sporeDots(g, R, -TM, W + TM, 120, 330, 30, ['#c08bff', '#7ff0ff', '#d6b8ff']);
  });
}

// ---------------------------------------------------------------------------
// NEAR — rocks with crystals, small glow mushrooms, drips
// ---------------------------------------------------------------------------
function rockLump(g, R, x, base, w, h, o) {
  const pts = [];
  const n = 8;
  for (let i = 0; i <= n; i++) {
    const a = Math.PI + (i / n) * Math.PI;
    const rr = 1 + (R() - 0.5) * 0.22;
    pts.push([x + Math.cos(a) * w / 2 * rr, base + Math.sin(a) * h * rr]);
  }
  const shape = (c) => { const pp = catmull(pts, 5); poly(pp, false)(c); c.lineTo(x + w / 2, base + 12); c.lineTo(x - w / 2, base + 12); c.closePath(); };
  cel(g, shape, { fill: o.col, shade: o.shade, shadeDx: w * 0.14, shadeDy: h * 0.18, light: o.light, lightDx: w * 0.05, lightDy: h * 0.07, lw: o.lw, outline: o.outline });
  return shape;
}
function near() {
  const H = 240, R = rng(3401);
  const oc = mix(OUTLINE, '#1a0c14', 0.25), lw = 2.2;
  return tiled(W, H, (g) => {
    const fs = waves(R, W, H - 30, [[4, 5], [9, 3], [15, 2]]);
    const bank = (c) => { c.moveTo(-TM, H + 10); for (let x = -TM; x <= W + TM; x += 4) c.lineTo(x, fs(x)); c.lineTo(W + TM, H + 10); c.closePath(); };
    stroke(g, bank, lw * 2, oc);
    fill(g, bank, linearGrad(g, 0, H - 40, 0, H, [[0, '#5e3a34'], [1, '#4a2c28']]));
    innerLight(g, bank, rgba('#c9a0ff', 0.45), 0, 3);
    // rocks
    const rocks = [[120, 130, 66], [470, 90, 46], [760, 160, 80], [1060, 100, 50], [1340, 140, 70]];
    for (const [x, w, h] of rocks) wrapAt(g, W, x - w, x + w, () => {
      const Rr = rng(x * 3);
      rockLump(g, Rr, x, fs(x) + 12, w, h, { col: '#64402e', shade: '#45281c', light: rgba('#b78cd8', 0.55), lw, outline: oc });
      // chocolate drip on top
      const dx = x - w * 0.1, dy = fs(x) + 12 - h + 4;
      const dr = (c) => { c.moveTo(dx - w * 0.28, dy + 4); c.quadraticCurveTo(dx, dy - 6, dx + w * 0.26, dy + 3); c.quadraticCurveTo(dx + w * 0.24, dy + 12, dx + w * 0.12, dy + 11); c.bezierCurveTo(dx + w * 0.1, dy + 26, dx + 2, dy + 26, dx + 1, dy + 11); c.quadraticCurveTo(dx - w * 0.14, dy + 13, dx - w * 0.28, dy + 4); c.closePath(); };
      cel(g, dr, { fill: C.milkL, shade: C.milk, shadeDx: 3, shadeDy: 4, lw, outline: oc });
      glint(g, dx - w * 0.08, dy + 1, 3, -0.4, 0.85);
    });
    // small crystal clusters on rocks / ground
    const cc = [[60, 'cyan', 0.7], [300, 'violet', 0.8], [640, 'violet', 0.6], [920, 'cyan', 0.75], [1200, 'violet', 0.9], [1480, 'cyan', 0.6]];
    for (const [x, k, s] of cc) wrapAt(g, W, x - 80, x + 80, () => crystalCluster(g, x, fs(x) + 10, s, CRY[k], { lw, outline: oc, n: 4, glowA: 0.35, glowK: 0.8 }));
    // small mushrooms
    const ms = [[230, 44, 15, '#7ff0ff', '#6fe8ff'], [560, 36, 12, '#c08bff', '#b37cff'], [1130, 50, 16, '#c08bff', '#b37cff'], [1420, 40, 13, '#7ff0ff', '#6fe8ff']];
    for (const [x, h, r, cap, gl] of ms) wrapAt(g, W, x - 40, x + 40, () => {
      mushroom(g, x, fs(x) + 10, h, r, { cap, glow: gl, lw, outline: oc, glowA: 0.35 });
      mushroom(g, x + r * 1.6, fs(x) + 12, h * 0.6, r * 0.7, { cap, glow: gl, lw, outline: oc, glowA: 0 });
    });
  });
}

// ---------------------------------------------------------------------------
// CLOUDS — hanging stalactite silhouettes (c0-c3) + glowing spore clusters
// ---------------------------------------------------------------------------
function clouds() {
  const items = [];
  const defs = [[520, 250, 5], [420, 210, 4], [340, 170, 3], [460, 140, 4]];
  defs.forEach(([w, h, n], i) => items.push({
    name: `c${i}`, w, h, ax: w / 2, ay: 0, meta: { y: 0, anchor: 'top', note: 'ceiling mass: hang from the top edge of the screen' },
    draw: (g) => {
      const R = rng(3500 + i);
      const band = h * 0.22;
      const tips = [];
      for (let k = 0; k < n; k++) {
        const t = (k + 0.5) / n;
        const len = h * (0.45 + R() * 0.5) * (0.55 + 0.45 * Math.sin(Math.PI * t));
        tips.push({ x: w * (0.1 + 0.8 * t) + (R() - 0.5) * 24, len: Math.max(band + 30, len), ww: 36 + R() * 34 });
      }
      const bandY = (x) => band + 10 * Math.sin(x * 0.03 + i) + 6 * Math.sin(x * 0.071);
      const sh = (c) => {
        c.moveTo(-2, -2); c.lineTo(w + 2, -2); c.lineTo(w + 2, bandY(w) * 0.6);
        let x = w;
        for (let k = tips.length - 1; k >= 0; k--) {
          const tp = tips[k];
          const r = tp.ww * 0.18;
          const xr = tp.x + tp.ww / 2, xl = tp.x - tp.ww / 2;
          c.quadraticCurveTo((x + xr) / 2, bandY((x + xr) / 2) + 8, xr, bandY(xr));
          c.bezierCurveTo(xr - tp.ww * 0.08, tp.len * 0.55, tp.x + r * 1.6, tp.len - r * 2.5, tp.x + r, tp.len - r * 0.6);
          c.quadraticCurveTo(tp.x, tp.len + r * 0.5, tp.x - r, tp.len - r * 0.6);
          c.bezierCurveTo(tp.x - r * 1.6, tp.len - r * 2.5, xl + tp.ww * 0.08, tp.len * 0.55, xl, bandY(xl));
          x = xl;
        }
        c.quadraticCurveTo(x / 2, bandY(x / 2) + 8, -2, bandY(0) * 0.6);
        c.closePath();
      };
      fill(g, sh, linearGrad(g, 0, 0, 0, h, [[0, '#140a1a'], [0.5, '#22122a'], [1, '#3a2244']]));
      innerShade(g, sh, rgba('#0a0410', 0.7), 10, -2);
      innerLight(g, sh, rgba('#8a68bf', 0.6), 4, -3);
      clipTo(g, sh, () => {
        g.strokeStyle = rgba('#5a3a70', 0.5); g.lineWidth = 2.5; g.lineCap = 'round';
        for (const tp of tips) { g.beginPath(); g.moveTo(tp.x - tp.ww * 0.15, band); g.quadraticCurveTo(tp.x - tp.ww * 0.1, tp.len * 0.6, tp.x - tp.ww * 0.04, tp.len - 14); g.stroke(); }
      });
      for (const tp of tips) if (R() < 0.6) {
        glow(g, tp.x, tp.len + 6, 16, '#b37cff', 0.6);
        fill(g, (c) => { c.moveTo(tp.x, tp.len + 1); c.quadraticCurveTo(tp.x + 4, tp.len + 8, tp.x, tp.len + 11); c.quadraticCurveTo(tp.x - 4, tp.len + 8, tp.x, tp.len + 1); }, '#e2ccff');
      }
    },
  }));
  [[180, 140], [130, 110]].forEach(([w, h], i) => items.push({
    name: `c${4 + i}`, w, h, ax: w / 2, ay: h / 2, meta: { y: [140, 520], speed: 0.02, glow: true },
    draw: (g) => {
      const R = rng(3600 + i);
      glow(g, w / 2, h / 2, Math.min(w, h) * 0.5, i ? '#6fe8ff' : '#b37cff', 0.25);
      for (let k = 0; k < 14; k++) {
        const x = w / 2 + (R() - 0.5) * w * 0.7, y = h / 2 + (R() - 0.5) * h * 0.7, r = 1.4 + R() * 2.6;
        const col = R() < 0.5 ? '#c08bff' : '#7ff0ff';
        glow(g, x, y, r * 5, col, 0.55);
        g.fillStyle = '#ffffff'; g.beginPath(); g.arc(x, y, r * 0.55, 0, TAU); g.fill();
      }
    },
  }));
  return items;
}
function fadeTop() { /* stalactite masses are opaque at the top edge on purpose */ }

// ---------------------------------------------------------------------------
// GROUND — dark chocolate rock under a glossy milk-chocolate glaze
// ---------------------------------------------------------------------------
function chocoPlate(g, x, y, r, R, cols, lw = 3) {
  const pts = chunkPts(R, x, y, r, 7, 0.26);
  const sh = roundPoly(pts, r * 0.22);
  const col = cols[Math.floor(R() * cols.length)];
  cel(g, sh, { fill: col, shade: tone(col, -0.22), shadeDx: r * 0.16, shadeDy: r * 0.2, light: tone(col, 0.14), lightDx: r * 0.1, lightDy: r * 0.12, lw, outline: rgba('#2a160e', 0.75) });
  // a crisp snap edge highlight
  g.strokeStyle = 'rgba(255,220,190,0.22)'; g.lineWidth = 2; g.lineCap = 'round';
  g.beginPath(); g.moveTo(pts[3][0] * 0.3 + x * 0.7 - r * 0.5, y - r * 0.45); g.lineTo(x + r * 0.2, y - r * 0.6); g.stroke();
}
const bodyCanvas = memo(() => {
  const R = rng(3201);
  return tiled(GW, GH, (g) => {
    fill(g, (c) => c.rect(-TM, 0, GW + 2 * TM, GH), linearGrad(g, 0, 40, 0, GH, [[0, '#4a2c20'], [0.5, '#3a2218'], [1, '#26140e']]));
    // chocolate rock plates
    const pts = scatter(R, GW, 30, 84, 280, 76);
    for (const [x, y] of pts) {
      const r = 32 + R() * 20, seed = Math.floor(R() * 1e6);
      const cols = y < 160 ? ['#62402c', '#5a3a28', '#68442f'] : ['#4e3020', '#482c1d', '#523424'];
      wrapAt(g, GW, x - r - 8, x + r + 8, () => chocoPlate(g, x, y, r, rng(seed), cols));
    }
    // speckles
    for (let i = 0; i < 260; i++) {
      const x = R() * GW, y = 60 + R() * 210, r = 1 + R() * 2;
      const col = R() < 0.6 ? 'rgba(20,8,4,0.3)' : 'rgba(200,150,120,0.2)';
      wrapAt(g, GW, x - 4, x + 4, () => { g.fillStyle = col; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); });
    }
    // a few glowing crystal pockets
    const cp = scatter(R, GW, 3, 120, 230, 260);
    for (const [x, y] of cp) {
      const pal = [CRY.violet, CRY.cyan, CRY.violet][Math.floor(R() * 3)];
      const ang = (R() - 0.5) * 0.8, len = 22 + R() * 10, w = 12 + R() * 4;
      wrapAt(g, GW, x - 60, x + 60, () => {
        glow(g, x, y - 8, 56, pal.glow, 0.42);
        crystal(g, x - 8, y + 4, ang - 0.5, len * 0.75, w * 0.85, pal, { lw: 3, outline: OUTLINE });
        crystal(g, x + 8, y + 4, ang + 0.55, len * 0.7, w * 0.8, pal, { lw: 3, outline: OUTLINE });
        crystal(g, x, y + 4, ang, len, w, pal, { lw: 3, outline: OUTLINE });
      });
    }
  });
});

function nubFeats(R, period, n) {
  const out = []; const step = period / n;
  for (let i = 0; i < n; i++) if (R() < 0.5) out.push({ x: (i + 0.5) * step + (R() - 0.5) * step * 0.3, w: 12 + R() * 14, h: 2 + R() * 3 });
  return out;
}
const MAT_G = (() => { const R = rng(3202); return { top: SURF, base: 54, period: GW, rc: 10, bulge: 5, faceDrip: 52, faceInner: 16, topStyle: 'nubs', feats: nubFeats(R, GW, 24), scal: scallops(R, GW, 24, 6, 11, 0.45, 12, 30) }; })();
const MAT_P = (() => { const R = rng(3203); return { top: 12, base: 25, period: PLAT_MID, rc: 8, bulge: 4, faceDrip: 28, faceInner: 12, topStyle: 'nubs', feats: nubFeats(R, PLAT_MID, 3), scal: scallops(R, PLAT_MID, 4, 4, 7, 0.5, 6, 14) }; })();

function glazePaint(g, shape, M) {
  g.save(); g.translate(2, 6); fill(g, shape, 'rgba(20,8,4,0.35)'); g.restore();
  fill(g, shape, linearGrad(g, 0, M.top - 4, 0, M.base + 30, [[0, '#e0a676'], [0.25, '#c07e4e'], [0.7, '#9a5c36'], [1, '#7a4426']]));
  innerShade(g, shape, 'rgba(70,30,14,0.6)', 3, 6);
  innerLight(g, shape, 'rgba(255,230,200,0.9)', 0, 4);
  stroke(g, shape, 5, OUTLINE);
}
function lip(g, xa, xb, ends, kind, off = 0) {
  const M = kind === 'plat' ? MAT_P : MAT_G;
  g.save(); g.translate(-off, 0);
  const e = {};
  if (ends.left != null) e.left = ends.left + off;
  if (ends.right != null) e.right = ends.right + off;
  const a = xa + off, b = xb + off;
  const shape = matPath(M, a, b, e);
  glazePaint(g, shape, M);
  clipTo(g, shape, () => {
    const R = rng(3210);
    const period = kind === 'plat' ? PLAT_MID : GW;
    const n = kind === 'plat' ? 2 : 11;
    g.strokeStyle = 'rgba(255,240,220,0.8)'; g.lineWidth = kind === 'plat' ? 2.5 : 3; g.lineCap = 'round';
    const st = [];
    for (let i = 0; i < n; i++) st.push({ x: (i + R() * 0.5) * (period / n), w: 16 + R() * 36 });
    for (let k = -2; k <= 2; k++) for (const s of st) {
      const x = s.x + k * period;
      if (x < a - 60 || x > b + 60) continue;
      g.beginPath(); g.moveTo(x, M.top + 5); g.lineTo(x + s.w, M.top + 5); g.stroke();
    }
  });
  // tiny glowing crystal bits sitting on the glaze
  if (kind !== 'plat') {
    const R = rng(3211);
    const bits = [];
    for (let i = 0; i < 5; i++) bits.push({ x: (i + 0.3 + R() * 0.4) * (GW / 5), k: Math.floor(R() * 3) });
    for (let k = -1; k <= 1; k++) for (const bt of bits) {
      const x = bt.x + k * GW;
      if (x < a + 20 || x > b - 20 || (e.right != null && x > e.right - 24) || (e.left != null && x < e.left + 24)) continue;
      const pal = [CRY.violet, CRY.cyan, CRY.cyan][bt.k];
      glow(g, x, M.top - 6, 26, pal.glow, 0.5);
      crystal(g, x - 4, M.top + 3, -0.35, 15, 8, pal, { lw: 3, outline: OUTLINE });
      crystal(g, x + 5, M.top + 3, 0.3, 11, 7, pal, { lw: 3, outline: OUTLINE });
    }
  }
  g.restore();
}
function capOut(y) {
  const t = (y - SURF) / (GH - SURF);
  return 3 + 6 * Math.sin(t * Math.PI * 1.1) + 2 * Math.sin(y / 19);
}
function capFace(g, side, face) {
  const dir = side === 'right' ? 1 : -1;
  g.save();
  g.beginPath();
  g.moveTo(face(SURF), SURF);
  for (let y = SURF; y <= GH + 10; y += 4) g.lineTo(face(y) - dir * (18 + 3 * Math.sin(y / 15)), y);
  for (let y = GH + 10; y >= SURF; y -= 4) g.lineTo(face(y) + dir * 20, y);
  g.closePath();
  g.fillStyle = side === 'right' ? 'rgba(20,8,4,0.45)' : 'rgba(190,150,230,0.22)';
  g.fill();
  g.restore();
}
function capExtra(g, side, face, ax) {
  // a crystal growing out of the cliff face
  const dir = side === 'right' ? 1 : -1;
  const y = 150;
  glow(g, face(y), y, 40, CRY.cyan.glow, 0.4);
  crystal(g, face(y) - dir * 4, y, dir * 1.1, 26, 12, CRY.cyan, { lw: 3, outline: OUTLINE });
  crystal(g, face(y + 10) - dir * 4, y + 10, dir * 1.6, 18, 10, CRY.cyan, { lw: 3, outline: OUTLINE });
}

// ---------------------------------------------------------------------------
// PLATFORM — floating chocolate rock with a glowing crystal underneath
// ---------------------------------------------------------------------------
const platBottom = (px) => 62 + 4 * Math.sin((TAU * px) / 128 + 2.1) + 3 * Math.sin((TAU * px * 3) / 128 + 0.3);
function platBody(g, shape, { off, w, piece }) {
  fill(g, shape, linearGrad(g, 0, 14, 0, 72, [[0, '#553321'], [0.5, '#45291b'], [1, '#2e1a12']]));
  clipTo(g, shape, () => {
    for (const [px, py, r] of [[20, 46, 20], [62, 52, 22], [104, 44, 19]]) platRepeat(px, off, 0, w, (x) => chocoPlate(g, x, py, r, rng(px * 13), ['#68412c', '#5e3a28', '#71482f'], 2.5));
  });
  innerShade(g, shape, 'rgba(20,8,4,0.5)', 4, 7);
  innerLight(g, shape, 'rgba(190,150,230,0.35)', 3, 0);
  stroke(g, shape, 5, OUTLINE);
  // hanging crystal under the mid piece
  if (piece === 'mid') {
    glow(g, 64, 78, 30, CRY.violet.glow, 0.45);
    crystal(g, 60, 62, Math.PI - 0.15, 22, 11, CRY.violet, { lw: 3, outline: OUTLINE });
    crystal(g, 72, 62, Math.PI + 0.3, 14, 9, CRY.violet, { lw: 3, outline: OUTLINE });
  }
}

export const CAVERN = {
  id: 'cavern',
  sky: ['#1b0e26', '#2e173e', '#4a2a52'],
  fog: C.fog,
  ambient: 'spores',
  pit: '#12080f',
  farH: 420, midH: 380, nearH: 240, midBottom: 610, nearBottom: 612,
  far: memo(far), mid: memo(mid), near: memo(near), clouds,
  bodyCanvas, lip, capOut, capFace, capExtra, capTexX: 260,
  platBottom, platBody,
  ground: memo(() => makeGround(CAVERN)),
  cap: true, caps: () => makeCaps(CAVERN),
  plat: true, plats: () => makePlats(CAVERN),
};
