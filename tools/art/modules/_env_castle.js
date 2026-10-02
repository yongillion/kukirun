// =============================================================================
//  Land 5 — Starlight Castle (별사탕 성)
// =============================================================================
import {
  rng, tone, mix, rgba, OUTLINE, fill, stroke, clipTo, innerShade, innerLight, gloss, glint, glow,
  sparkle, poly, circle, ellipse, rrect, star, linearGrad, radialGrad, lerp, clamp, TAU, canvas, ctx2d,
  tiled, wrapAt, TM, waves, circles, unionPart, cel, hazeOnPaint, scallops, chunkPts, roundPoly,
  shadeU, lightU, candyBall, puffCloud,
} from './_env_kit.js';
import { GW, GH, SURF, makeGround, makeCaps, makePlats, platRepeat, PLAT_MID, CAP_AX } from './_env_land.js';
import { catmull, ySampler, humpPts, scatter, memo } from './_env_util.js';

const W = 1536;
const C = {
  fog: '#6a5cb5',
  castle: '#3a3a8a', castleL: '#5656b0', castleD: '#2a2a6a',
  roof: '#7a5ad0', roofL: '#a487ee', roofD: '#5a3eaa',
  cloud: '#f3eaff', cloudS: '#c9b8f0', cloudSD: '#a493dc',
  brick: '#8f7ac8', brickL: '#ab98e0', brickD: '#6e5aa8', mortar: '#55438f',
  stone: '#c6b8f0', stoneL: '#e6dcff', stoneD: '#9a88d4',
  gold: '#ffd55a', goldL: '#fff0a8', goldD: '#d9a52a',
  window: '#ffd96a',
};

// ---------------------------------------------------------------------------
// Towers & castles
// ---------------------------------------------------------------------------
function towerShape(x, base, w, h, roofH, over = 0.18) {
  const body = poly([[x - w / 2, base + 30], [x - w / 2 * 0.96, base - h], [x + w / 2 * 0.96, base - h], [x + w / 2, base + 30]]);
  const rw = w / 2 * (1 + over);
  const roof = (c) => { c.moveTo(x - rw, base - h + 2); c.quadraticCurveTo(x - rw * 0.35, base - h - roofH * 0.45, x, base - h - roofH); c.quadraticCurveTo(x + rw * 0.35, base - h - roofH * 0.45, x + rw, base - h + 2); c.quadraticCurveTo(x, base - h + roofH * 0.08, x - rw, base - h + 2); c.closePath(); };
  return { body, roof };
}
/** Silhouette tower (no outline) for far layers. */
function farTower(g, x, base, w, h, o) {
  const roofH = o.roofH ?? w * 1.3;
  const { body, roof } = towerShape(x, base, w, h, roofH, o.over ?? 0.2);
  fill(g, body, o.col);
  if (o.shade) { clipTo(g, body, () => { g.fillStyle = o.shade; g.fillRect(x + w * 0.12, base - h - 10, w, h + 50); }); }
  fill(g, roof, o.roof || o.col);
  if (o.shade) clipTo(g, roof, () => { g.fillStyle = o.shade; g.beginPath(); g.moveTo(x, base - h - roofH - 4); g.lineTo(x + w * 0.1, base - h + 6); g.lineTo(x + w, base - h + 6); g.lineTo(x + w, base - h - roofH - 4); g.closePath(); g.fill(); });
  // finial star
  if (o.star) { const sy = base - h - roofH - 5; fill(g, star(x, sy, 6, 2.6, 5, -Math.PI / 2, 0.4), o.star); glow(g, x, sy, 16, '#ffe9a0', 0.45); }
  // windows
  if (o.windows) {
    const R = rng(Math.round(x * 3 + h));
    const n = Math.max(1, Math.round(h / 46));
    for (let i = 0; i < n; i++) {
      if (R() < 0.3) continue;
      const wy = base - h + 18 + i * 42, ww = Math.max(3, w * 0.16);
      glow(g, x, wy, ww * 4, '#ffcf6a', 0.25);
      fill(g, (c) => { c.moveTo(x - ww / 2, wy + ww * 1.4); c.lineTo(x - ww / 2, wy); c.arc(x, wy, ww / 2, Math.PI, 0); c.lineTo(x + ww / 2, wy + ww * 1.4); c.closePath(); }, o.windows);
    }
  }
}
/** Outlined, cel-shaded candy tower for the mid layer. */
function midTower(g, x, base, w, h, o) {
  const lw = o.lw, oc = o.outline;
  const roofH = o.roofH ?? w * 1.25;
  const { body, roof } = towerShape(x, base, w, h, roofH, 0.22);
  cel(g, body, { fill: o.col || C.castleL, shade: o.colD || C.castle, shadeDx: w * 0.3, shadeDy: 0, light: rgba('#9c9cf0', 0.5), lightDx: w * 0.08, lightDy: 0, lw, outline: oc });
  // brick hints
  clipTo(g, body, () => {
    g.strokeStyle = rgba(C.castleD, 0.5); g.lineWidth = 1.2;
    for (let y = base - h + 14; y < base; y += 14) { g.beginPath(); g.moveTo(x - w, y); g.lineTo(x + w, y); g.stroke(); const off = ((y / 14) % 2) * 9; for (let bx = x - w / 2 + off; bx < x + w / 2; bx += 18) { g.beginPath(); g.moveTo(bx, y); g.lineTo(bx, y + 14); g.stroke(); } }
  });
  // windows
  const n = Math.max(1, Math.round(h / 52));
  for (let i = 0; i < n; i++) {
    const wy = base - h + 22 + i * 48, ww = w * 0.22;
    glow(g, x, wy + ww * 0.5, ww * 3.2, '#ffcf6a', 0.3);
    const win = (c) => { c.moveTo(x - ww / 2, wy + ww * 1.5); c.lineTo(x - ww / 2, wy); c.arc(x, wy, ww / 2, Math.PI, 0); c.lineTo(x + ww / 2, wy + ww * 1.5); c.closePath(); };
    cel(g, win, { fill: C.window, shade: '#f0a838', shadeDx: ww * 0.3, shadeDy: ww * 0.3, lw: lw * 0.8, outline: oc });
  }
  // gold band under roof
  cel(g, rrect(x - w / 2 - 2, base - h - 2, w + 4, 6, 3), { fill: C.gold, shade: C.goldD, shadeDx: 0, shadeDy: 2, lw: lw * 0.8, outline: oc });
  cel(g, roof, { fill: o.roof || C.roof, shade: o.roofD || C.roofD, shadeDx: w * 0.35, shadeDy: 0, light: rgba(o.roofL || C.roofL, 0.8), lightDx: w * 0.1, lightDy: 4, lw, outline: oc });
  // roof candy stripes
  clipTo(g, roof, () => { g.strokeStyle = rgba('#ffffff', 0.16); g.lineWidth = w * 0.12; for (let k = -2; k <= 2; k++) { g.beginPath(); g.moveTo(x + k * w * 0.32, base - h + 4); g.lineTo(x, base - h - roofH); g.stroke(); } });
  // finial star / flag
  const sy = base - h - roofH - 6;
  if (o.flag) {
    g.strokeStyle = oc; g.lineWidth = lw; g.beginPath(); g.moveTo(x, base - h - roofH + 2); g.lineTo(x, sy - 22); g.stroke();
    const fl = (c) => { c.moveTo(x, sy - 22); c.quadraticCurveTo(x + 14, sy - 26, x + 26, sy - 18); c.quadraticCurveTo(x + 14, sy - 14, x, sy - 10); c.closePath(); };
    cel(g, fl, { fill: o.flag, shade: tone(o.flag, -0.2), shadeDx: 4, shadeDy: 3, lw: lw * 0.8, outline: oc });
  } else {
    glow(g, x, sy, 20, '#ffe9a0', 0.5);
    cel(g, star(x, sy, 8, 3.6, 5, -Math.PI / 2, 0.5), { fill: C.gold, shade: C.goldD, shadeDx: 2, shadeDy: 2, lw: lw * 0.8, outline: oc });
  }
}
function cloudBank(g, R, y, amp, col, o) {
  // periodic bumpy cloud strip across the layer
  const N = o.n ?? 40, step = W / N;
  const tab = [];
  for (let i = 0; i < N; i++) tab.push({ dy: R() * amp, r: o.r[0] + R() * (o.r[1] - o.r[0]) });
  const list = [];
  for (let i = -4; i < N + 4; i++) { const t = tab[((i % N) + N) % N]; list.push([i * step, y + t.dy, t.r]); }
  const sh = (c) => { circles(list)(c); c.rect(-TM - 20, y + 10, W + 2 * TM + 40, o.H); };
  if (o.lw) stroke(g, sh, o.lw * 2, o.outline);
  fill(g, sh, linearGrad(g, 0, y - (o.r[1]), 0, y + 80, [[0, o.top || col], [1, col]]));
  shadeU(g, sh, rgba(o.shade, o.shadeA ?? 0.8), o.r[0] * 0.25, o.r[0] * 0.35);
  if (o.rim) lightU(g, sh, o.rim, o.r[0] * 0.12, o.r[0] * 0.18);
  return list;
}

// ---------------------------------------------------------------------------
// FAR — distant candy castles over a sea of clouds
// ---------------------------------------------------------------------------
function far() {
  const H = 420, R = rng(5101);
  return tiled(W, H, (g) => {
    const col = mix(C.castle, C.fog, 0.38), shade = rgba(tone(col, -0.2), 0.45), roof = mix(C.roof, C.fog, 0.45);
    const castles = [
      { x: 260, s: 1.0 }, { x: 760, s: 0.7 }, { x: 1180, s: 0.9 },
    ];
    for (const k of castles) wrapAt(g, W, k.x - 260 * k.s, k.x + 260 * k.s, () => {
      const s = k.s, base = 330;
      // keep
      fill(g, poly([[k.x - 70 * s, base + 40], [k.x - 70 * s, base - 120 * s], [k.x + 70 * s, base - 120 * s], [k.x + 70 * s, base + 40]]), col);
      for (let i = 0; i < 7; i++) fill(g, rrect(k.x - 70 * s + i * 21 * s, base - 132 * s, 12 * s, 14 * s, 2), col);
      farTower(g, k.x, base - 120 * s, 46 * s, 60 * s, { col, shade, roof, star: '#ffe48a', windows: '#ffd96a', roofH: 70 * s });
      for (const [dx, tw, th, rh] of [[-110, 36, 170, 52], [-70, 30, 120, 42], [80, 34, 150, 50], [125, 28, 100, 40], [-150, 24, 80, 34]]) farTower(g, k.x + dx * s, base, tw * s, th * s, { col, shade, roof, star: '#ffe48a', windows: '#ffd96a', roofH: rh * s });
      for (let i = 0; i < 6; i++) { const wx = k.x - 50 * s + i * 20 * s, wy = base - 80 * s; glow(g, wx, wy, 10, '#ffcf6a', 0.4); fill(g, rrect(wx - 3, wy - 5, 6, 10, 3), '#ffd96a'); }
    });
    // lone spires
    for (const [x, h] of [[520, 120], [980, 90], [1420, 140]]) wrapAt(g, W, x - 40, x + 40, () => farTower(g, x, 340, 26, h, { col: mix(col, C.fog, 0.15), shade, roof: mix(roof, C.fog, 0.15), star: '#ffe48a', windows: '#ffd96a', roofH: 40 }));
    hazeOnPaint(g, -TM, W + TM, 200, 360, C.fog, 0, 0.35);
    // sea of clouds
    cloudBank(g, R, 318, 22, mix('#8f80d0', C.fog, 0.2), { r: [30, 54], H: 200, shade: '#6a5cb5', shadeA: 0.6, top: mix('#c8bcf2', C.fog, 0.15), rim: rgba('#efe8ff', 0.6), n: 34 });
    cloudBank(g, R, 362, 18, mix('#a596e0', C.fog, 0.1), { r: [26, 46], H: 200, shade: '#7a6cc4', shadeA: 0.55, top: '#d8ceff', rim: rgba('#ffffff', 0.55), n: 40 });
    hazeOnPaint(g, -TM, W + TM, 330, H, '#b4a6ea', 0, 0.35);
  });
}

// ---------------------------------------------------------------------------
// MID — candy towers on cloud islands, arched brick bridges
// ---------------------------------------------------------------------------
function brickBridge(g, x0, x1, y, o) {
  const lw = o.lw, oc = o.outline;
  const th = 22;
  const span = (c) => { c.moveTo(x0, y); c.lineTo(x1, y); c.lineTo(x1, y + th + 20); c.quadraticCurveTo((x0 + x1) / 2, y + th - 6, x0, y + th + 20); c.closePath(); };
  cel(g, span, { fill: C.brick, shade: C.brickD, shadeDx: 0, shadeDy: 6, light: rgba(C.brickL, 0.8), lightDx: 0, lightDy: 3, lw, outline: oc });
  clipTo(g, span, () => {
    g.strokeStyle = rgba(C.mortar, 0.6); g.lineWidth = 1.2;
    for (let bx = x0 + 8; bx < x1; bx += 16) { g.beginPath(); g.moveTo(bx, y + 2); g.lineTo(bx, y + 10); g.stroke(); }
    g.beginPath(); g.moveTo(x0, y + 10); g.lineTo(x1, y + 10); g.stroke();
  });
  // railing posts with lanterns
  for (let px = x0 + 12; px < x1 - 6; px += 34) {
    cel(g, rrect(px - 2.5, y - 14, 5, 15, 2), { fill: C.stone, shade: C.stoneD, shadeDx: 2, shadeDy: 0, lw: lw * 0.8, outline: oc });
    glow(g, px, y - 17, 10, '#ffd96a', 0.6);
    fill(g, circle(px, y - 17, 3), '#fff0a8');
  }
  g.strokeStyle = oc; g.lineWidth = lw * 0.8; g.beginPath(); g.moveTo(x0 + 10, y - 10); g.lineTo(x1 - 10, y - 10); g.stroke();
}
function mid() {
  const H = 380, R = rng(5301);
  const oc = mix(OUTLINE, '#1a1440', 0.35), lw = 2;
  return tiled(W, H, (g) => {
    // back cloud islands
    const isl = cloudBank(g, R, 262, 26, '#9a8bd8', { r: [34, 58], H: 200, shade: '#6e60bc', shadeA: 0.6, top: '#d6ccff', rim: rgba('#ffffff', 0.55), n: 30, lw, outline: oc });
    // towers
    const tw = [
      { x: 140, w: 46, h: 150, flag: '#ff7eb6' }, { x: 205, w: 34, h: 96 },
      { x: 560, w: 52, h: 180 }, { x: 640, w: 36, h: 110, flag: '#7ff0ff' },
      { x: 1010, w: 44, h: 130 }, { x: 1300, w: 56, h: 196, flag: '#ffd55a' }, { x: 1380, w: 34, h: 104 },
    ];
    for (const t of tw) wrapAt(g, W, t.x - 70, t.x + 70, () => midTower(g, t.x, 270, t.w, t.h, { lw, outline: oc, flag: t.flag, roof: t.flag ? '#8a62dc' : C.roof }));
    // bridges between towers
    for (const [x0, x1, y] of [[222, 545, 190], [655, 995, 206], [1025, 1285, 180]]) wrapAt(g, W, x0 - 10, x1 + 10, () => brickBridge(g, x0, x1, y, { lw, outline: oc }));
    // front clouds wrapping tower bases
    cloudBank(g, R, 300, 20, '#9283d0', { r: [28, 48], H: 200, shade: '#6c5db6', shadeA: 0.7, top: '#c4b8ee', rim: rgba('#ece4ff', 0.8), n: 36, lw, outline: oc });
  });
}

// ---------------------------------------------------------------------------
// NEAR — moonlit cloud puffs, star-candy clusters, lanterns
// ---------------------------------------------------------------------------
function konpeito(g, x, y, r, col, o) {
  // star candy: bumpy round sugar star (soft bumps = harmless)
  const n = 9;
  const sh = (c) => {
    for (let i = 0; i <= n * 2; i++) {
      const a = (i / (n * 2)) * TAU;
      const rr = i % 2 ? r * 0.82 : r;
      const px = x + Math.cos(a) * rr, py = y + Math.sin(a) * rr;
      if (i === 0) c.moveTo(px, py); else c.quadraticCurveTo(x + Math.cos(a - Math.PI / (n * 2)) * r * 1.02, y + Math.sin(a - Math.PI / (n * 2)) * r * 1.02, px, py);
    }
    c.closePath();
  };
  cel(g, sh, { fill: col, shade: tone(col, -0.2), shadeDx: r * 0.3, shadeDy: r * 0.32, light: rgba('#ffffff', 0.6), lightDx: r * 0.15, lightDy: r * 0.15, lw: o.lw, outline: o.outline });
  g.fillStyle = 'rgba(255,255,255,0.85)'; g.beginPath(); g.ellipse(x - r * 0.35, y - r * 0.35, r * 0.22, r * 0.14, -0.6, 0, TAU); g.fill();
}
function lantern(g, x, base, h, o) {
  const lw = o.lw, oc = o.outline;
  cel(g, rrect(x - 3, base - h, 6, h + 4, 3), { fill: '#4a4a96', shade: '#34347a', shadeDx: 3, shadeDy: 0, lw, outline: oc });
  glow(g, x, base - h - 12, 36, '#ffcf6a', 0.55);
  const body = rrect(x - 9, base - h - 24, 18, 22, 5);
  cel(g, body, { fill: '#ffe48a', shade: '#f0b040', shadeDx: 5, shadeDy: 3, lw, outline: oc });
  cel(g, (c) => { c.moveTo(x - 12, base - h - 23); c.lineTo(x, base - h - 34); c.lineTo(x + 12, base - h - 23); c.closePath(); }, { fill: C.roof, shade: C.roofD, shadeDx: 4, shadeDy: 0, lw, outline: oc });
  glint(g, x - 4, base - h - 18, 2.4, -0.6, 0.9);
}
function near() {
  const H = 240, R = rng(5401);
  const oc = mix(OUTLINE, '#1a1440', 0.25), lw = 2.2;
  return tiled(W, H, (g) => {
    // lanterns & candy clusters behind the cloud puffs
    for (const x of [180, 640, 1100, 1450]) wrapAt(g, W, x - 40, x + 40, () => lantern(g, x, H - 30, 70 + (x % 3) * 12, { lw, outline: oc }));
    const list = cloudBank(g, R, H - 48, 18, '#9c8cd6', { r: [26, 44], H: 100, shade: '#7262b8', shadeA: 0.85, top: '#c9bcf2', rim: rgba('#efe8ff', 0.9), n: 30, lw, outline: oc });
    // star candy piles on the clouds
    const piles = [[330, 3], [820, 2], [1290, 3]];
    for (const [x, n] of piles) wrapAt(g, W, x - 50, x + 50, () => {
      const cols = ['#ffd55a', '#ff9ad8', '#9ae8ff', '#c9a6ff'];
      for (let i = 0; i < n; i++) konpeito(g, x + (i - (n - 1) / 2) * 22, H - 58 - (i % 2) * 10, 11, cols[(i + x) % 4], { lw, outline: oc });
    });
    // twinkles
    for (let i = 0; i < 16; i++) {
      const x = R() * W, y = 60 + R() * 110, r = 3 + R() * 4;
      wrapAt(g, W, x - 10, x + 10, () => sparkle(g, x, y, r, '#fff6c8', 0.85));
    }
  });
}

// ---------------------------------------------------------------------------
// CLOUDS — night clouds, star clusters and the moon
// ---------------------------------------------------------------------------
function clouds() {
  const items = [];
  [[380, 130, 7], [300, 110, 6], [240, 90, 5], [180, 70, 4]].forEach(([w, h, b], i) => items.push({
    name: `c${i}`, w, h, ax: w / 2, ay: h / 2, meta: { y: [40, 260], speed: 0.03 + i * 0.008 },
    draw: (g) => {
      const R = rng(5500 + i);
      puffCloud(g, w / 2, h * 0.58, w * 0.86, h * 0.6, R, { bumps: b, top: '#b9aee8', bottom: '#5e52a8', shade: rgba('#4a3f94', 0.8), rim: rgba('#f2ecff', 0.95), rimDx: h * 0.05, rimDy: h * 0.09 });
    },
  }));
  [[200, 120], [150, 100]].forEach(([w, h], i) => items.push({
    name: `c${4 + i}`, w, h, ax: w / 2, ay: h / 2, meta: { y: [30, 280], speed: 0.01, stars: true },
    draw: (g) => {
      const R = rng(5600 + i);
      for (let k = 0; k < 9; k++) {
        const x = 14 + R() * (w - 28), y = 14 + R() * (h - 28), r = 2 + R() * 5;
        if (r > 4.5) { glow(g, x, y, r * 3, '#fff2b0', 0.4); fill(g, star(x, y, r, r * 0.45, 5, -Math.PI / 2, 0.5), '#fff2b0'); }
        else sparkle(g, x, y, r, '#ffffff', 0.9);
      }
    },
  }));
  items.push({
    name: 'moon', w: 320, h: 320, ax: 160, ay: 160, meta: { y: 150, fixed: true },
    draw: (g) => {
      const x = 160, y = 160, r = 82;
      glow(g, x, y, 158, '#fff3c4', 0.35);
      glow(g, x, y, 110, '#fff6d8', 0.4);
      const disc = circle(x, y, r);
      fill(g, disc, radialGrad(g, x - 24, y - 26, 6, r * 1.1, [[0, '#fffdf0'], [0.6, '#fff1b8'], [1, '#f6d77e']]));
      clipTo(g, disc, () => {
        for (const [cx, cy, cr] of [[x + 20, y - 18, 14], [x - 26, y + 22, 18], [x + 30, y + 30, 9], [x - 8, y - 40, 8]]) {
          fill(g, circle(cx, cy, cr), rgba('#e8c46a', 0.45));
          fill(g, circle(cx - cr * 0.18, cy - cr * 0.18, cr * 0.8), rgba('#fff6d0', 0.35));
        }
      });
      innerShade(g, disc, rgba('#e0b050', 0.4), 14, 16);
      gloss(g, x - 30, y - 34, 26, 14, -0.7, 0.6);
    },
  });
  return items;
}

// ---------------------------------------------------------------------------
// GROUND — lavender brick causeway with gold trim, floating on cloud fluff
// ---------------------------------------------------------------------------
const BRICK_H = 24;
const bodyCanvas = memo(() => {
  const R = rng(5201);
  return tiled(GW, GH, (g) => {
    fill(g, (c) => c.rect(-TM, 0, GW + 2 * TM, GH), C.mortar);
    // brick courses (period GW: each row's brick widths sum exactly to GW)
    let row = 0;
    for (let y = 66; y < GH + BRICK_H; y += BRICK_H + 3, row++) {
      const n = 18 + (row % 2);
      const ws = []; let sum = 0;
      for (let i = 0; i < n; i++) { const w = 0.8 + R() * 0.4; ws.push(w); sum += w; }
      let x = (row % 2) * 26;
      for (let i = 0; i < n; i++) {
        const w = (ws[i] / sum) * GW;
        const shade = R();
        const bx = x;
        const col = mix(C.brick, shade < 0.33 ? C.brickL : shade < 0.66 ? C.brick : C.brickD, 0.35);
        wrapAt(g, GW, bx - 4, bx + w + 4, () => {
          const b = rrect(bx + 1.5, y, w - 3, BRICK_H, 5);
          fill(g, b, col);
          innerShade(g, b, rgba(C.brickD, 0.8), 4, 4);
          innerLight(g, b, rgba(C.brickL, 0.9), 3, 3);
        });
        x += w;
      }
    }
    // darker toward the bottom
    g.fillStyle = linearGrad(g, 0, 120, 0, GH, [[0, 'rgba(40,30,90,0)'], [1, 'rgba(40,30,90,0.45)']]);
    g.fillRect(-TM, 0, GW + 2 * TM, GH);
    // cloud fluff billowing along the bottom
    const N = 22, step = GW / N, tab = [];
    for (let i = 0; i < N; i++) tab.push({ dy: R() * 26, r: 30 + R() * 22 });
    const list = [];
    for (let i = -3; i < N + 3; i++) { const t = tab[((i % N) + N) % N]; list.push([i * step, 236 + t.dy, t.r]); }
    const cl = (c) => { circles(list)(c); c.rect(-TM - 20, 250, GW + 2 * TM + 40, 60); };
    stroke(g, cl, 8, OUTLINE);
    fill(g, cl, linearGrad(g, 0, 190, 0, GH, [[0, '#ffffff'], [1, '#dcd0ff']]));
    shadeU(g, cl, rgba('#b6a6ee', 0.9), 8, 10);
    lightU(g, cl, rgba('#ffffff', 1), 4, 5);
  });
});

/** Coping stones + gold trim (the castle "lip"). */
const COPING = (() => { const R = rng(5202); const out = []; let x = 0; const n = 14; const ws = []; let s = 0; for (let i = 0; i < n; i++) { const w = 0.8 + R() * 0.4; ws.push(w); s += w; } for (let i = 0; i < n; i++) { const w = (ws[i] / s) * GW; out.push({ x0: x, x1: x + w, tint: R() }); x += w; } return out; })();
const COPING_P = [{ x0: 0, x1: 64, tint: 0.3 }, { x0: 64, x1: 128, tint: 0.7 }];
function lip(g, xa, xb, ends, kind, off = 0) {
  const plat = kind === 'plat';
  const top = plat ? 12 : SURF, h = plat ? 16 : 24, trim = plat ? 7 : 10;
  const list = plat ? COPING_P : COPING, period = plat ? PLAT_MID : GW;
  g.save(); g.translate(-off, 0);
  let a = xa + off, b = xb + off;
  const L = ends.left != null ? ends.left + off : null, Rr = ends.right != null ? ends.right + off : null;
  if (L != null) a = L - 4;
  if (Rr != null) b = Rr + 4;
  // gold trim band (under the stones)
  const ty = top + h - 1;
  const band = rrect(a - (L != null ? 0 : 40), ty, (b - a) + (L != null ? 0 : 40) + (Rr != null ? 0 : 40), trim, L != null || Rr != null ? 3 : 0);
  g.save(); g.translate(0, 5); fill(g, band, 'rgba(30,20,70,0.35)'); g.restore();
  cel(g, band, { fill: C.gold, shade: C.goldD, shadeDx: 0, shadeDy: 3, light: rgba(C.goldL, 0.9), lightDx: 0, lightDy: 2, lw: plat ? 4 : 5, outline: OUTLINE });
  // star studs on the trim
  for (let k = -2; k <= 2; k++) for (const sx of (plat ? [64] : [128, 384, 640, 896])) {
    const x = sx + k * period;
    if (x < a + 10 || x > b - 10) continue;
    cel(g, star(x, ty + trim / 2, plat ? 6 : 8, plat ? 2.8 : 3.6, 5, -Math.PI / 2, 0.5), { fill: '#fff2a8', shade: C.goldD, shadeDx: 2, shadeDy: 2, lw: 3, outline: OUTLINE });
  }
  // coping stones
  for (let k = -2; k <= 2; k++) for (const st of list) {
    let x0 = st.x0 + k * period, x1 = st.x1 + k * period;
    if (x1 < a || x0 > b) continue;
    const isL = L != null && x0 <= L + 2, isR = Rr != null && x1 >= Rr - 2;
    x0 = Math.max(x0, a); x1 = Math.min(x1, b);
    if (x1 - x0 < 4) continue;
    const col = mix(C.stone, st.tint < 0.4 ? C.stoneL : st.tint > 0.75 ? C.stoneD : C.stone, 0.3);
    const rad = plat ? 5 : 7;
    const s = rrect(x0 + 1.5, top, x1 - x0 - 3, h, rad);
    cel(g, s, { fill: col, shade: C.stoneD, shadeDx: 3, shadeDy: 5, light: rgba('#ffffff', 0.85), lightDx: 2, lightDy: 3, lw: plat ? 4 : 5, outline: OUTLINE });
    // small chip highlight
    g.fillStyle = 'rgba(255,255,255,0.7)'; g.beginPath(); g.ellipse(x0 + 12, top + 6, 5, 2, 0, 0, TAU); g.fill();
  }
  g.restore();
}
function capOut() { return 1.5; }
function capFace(g, side, face) {
  // quoin stones along the wall end
  const dir = side === 'right' ? 1 : -1;
  let y = 64, k = 0;
  while (y < GH) {
    const w = k % 2 ? 26 : 40, h = BRICK_H;
    const x0 = side === 'right' ? face(y) - w : face(y);
    const s = rrect(x0 + 1, y, w - 2, h, 5);
    fill(g, s, mix(C.stone, C.stoneD, 0.25));
    innerShade(g, s, rgba(side === 'right' ? '#6e5aa8' : C.stoneD, 0.9), side === 'right' ? 8 : 3, 4);
    innerLight(g, s, rgba('#ffffff', side === 'right' ? 0.4 : 0.8), 3, 3);
    stroke(g, s, 3, rgba(OUTLINE, 0.85));
    y += h + 3; k++;
  }
}

// ---------------------------------------------------------------------------
// PLATFORM — floating brick ledge with gold trim and a cloud puff under it
// ---------------------------------------------------------------------------
const platBottom = (px) => 60 + 2 * Math.sin((TAU * px) / 128 + 0.5);
function platBody(g, shape, { off, w, piece }) {
  // cloud puff underneath (drawn first)
  const R = rng(5230);
  clipTo(g, (c) => c.rect(-2, 30, w + 4, 60), () => {
    const list = [];
    for (const [px, r] of [[16, 15], [48, 18], [80, 14], [108, 17]]) platRepeat(px, off, 0, w, (x) => list.push([x, 72, r]));
    if (piece === 'left') list.splice(0, list.filter((p) => p[0] < 14).length);
    const sh = circles(list.filter((p) => (piece !== 'left' || p[0] > 16) && (piece !== 'right' || p[0] < w - 16)));
    stroke(g, sh, 8, OUTLINE);
    fill(g, sh, '#f3eaff');
    shadeU(g, sh, rgba('#b6a6ee', 0.9), 5, 6);
  });
  fill(g, shape, C.mortar);
  clipTo(g, shape, () => {
    for (const [px, row] of [[0, 0], [42, 0], [86, 0], [20, 1], [64, 1], [108, 1]]) platRepeat(px, off, 0, w, (x) => {
      const y = 32 + row * 15;
      const b = rrect(x + 1.5, y, 40, 13, 4);
      fill(g, b, row ? C.brick : mix(C.brick, C.brickL, 0.3));
      innerShade(g, b, rgba(C.brickD, 0.8), 3, 3);
      innerLight(g, b, rgba(C.brickL, 0.9), 2, 2);
    });
  });
  stroke(g, shape, 5, OUTLINE);
}

export const CASTLE = {
  id: 'castle',
  sky: ['#141a50', '#2c2c7a', '#5a4aa8'],
  fog: C.fog,
  ambient: 'stars',
  pit: '#1a1a4a',
  farH: 420, midH: 380, nearH: 240, midBottom: 610, nearBottom: 612,
  far: memo(far), mid: memo(mid), near: memo(near), clouds,
  bodyCanvas, bodyTop: 20, lip, capOut, capFace, capTexX: 200, capRc: 4, capLw: 5,
  platBottom, platBody, platRc: 6, platInset: 3,
  ground: memo(() => makeGround(CASTLE)),
  cap: true, caps: () => makeCaps(CASTLE),
  plat: true, plats: () => makePlats(CASTLE),
};
