// Obstacles — Starlight Castle: polished silver spikes, gold trims, deep purple
// bodies, magenta crystal spikes — bright metal reads against the night sky.
import {
  rng, tone, mix, rgba, OUTLINE, fill, stroke, clipTo, innerShade, innerLight, gloss, glint, glow,
  sparkle, poly, circle, ellipse, rrect, star, linearGrad, lerp, TAU,
  circles, unionPart, cel, shadeU, lightU, groundShadow, candyBall, candyFlower, roundPoly, chunkPts,
} from './_env_kit.js';
import { OLW, DLW, spikeG, spikedBall, shardG, chainTile, beamTile, signPost, tuftBase } from './_env_obs_kit.js';

const SILVER = { base: '#dfe6f4', tip: '#ffffff', dark: 'rgba(44,52,118,0.72)', edge: 'rgba(255,255,255,0.95)' };
const GOLD = { fill: '#ffcf4a', shade: '#d39a22', light: rgba('#fff2a8', 0.9) };
const PURP = { fill: '#5c3cb0', shade: '#38227a', light: rgba('#a88ae8', 0.6) };
const GEM = { light: '#ffd4f6', base: '#e64ad0', dark: '#8c1a90', edge: 'rgba(255,255,255,0.95)' };
const GOLDCHAIN = { base: '#ffd55a', dark: '#c9921e', light: '#fff4b8' };

function goldBand(g, x, y, w, h, gems = []) {
  const b = rrect(x, y, w, h, Math.min(8, h / 2));
  cel(g, b, { fill: GOLD.fill, shade: GOLD.shade, shadeDx: 0, shadeDy: h * 0.3, light: GOLD.light, lightDx: 0, lightDy: h * 0.18, lw: OLW });
  for (const [gx, col] of gems) { cel(g, circle(gx, y + h / 2, h * 0.28), { fill: col, shade: tone(col, -0.3), shadeDx: 2, shadeDy: 2, lw: 3 }); fill(g, circle(gx - h * 0.08, y + h * 0.4, h * 0.08), '#ffffff'); }
}

function low(g, w, h) {
  const cx = w / 2, base = h - 4;
  groundShadow(g, cx, h - 6, 62, 10, 0.35);
  // crown trap: silver spikes rising from a gold crown band on a velvet cushion
  for (const [dx, len, sw, a] of [[-44, 70, 32, -1.85], [44, 70, 32, -1.29], [-22, 96, 36, -1.68], [22, 96, 36, -1.46], [0, 112, 40, -1.5708]]) spikeG(g, cx + dx, base - 44, a, len, sw, SILVER);
  const cush = (c) => { c.moveTo(cx - 62, base + 2); c.bezierCurveTo(cx - 66, base - 30, cx - 40, base - 34, cx, base - 32); c.bezierCurveTo(cx + 40, base - 34, cx + 66, base - 30, cx + 62, base + 2); c.closePath(); };
  cel(g, cush, { fill: PURP.fill, shade: PURP.shade, shadeDx: 10, shadeDy: 6, light: PURP.light, lightDx: 4, lightDy: 4, lw: OLW });
  goldBand(g, cx - 56, base - 56, 112, 28, [[cx - 30, '#ff4f8a'], [cx, '#5fd6ff'], [cx + 30, '#ff4f8a']]);
}
function low2(g, w, h) {
  const cx = w / 2, base = h - 4;
  groundShadow(g, cx, h - 6, 140, 11, 0.35);
  // spear fence
  const n = 7, span = 252;
  for (let i = 0; i < n; i++) {
    const x = cx - span / 2 + (span * i) / (n - 1);
    const tall = i % 2 === 0;
    cel(g, rrect(x - 8, base - (tall ? 84 : 70), 16, (tall ? 84 : 70) + 2, 5), { fill: '#4a4a74', shade: '#2e2e52', shadeDx: 6, shadeDy: 0, light: rgba('#a0a0d8', 0.6), lightDx: 2, lightDy: 0, lw: OLW * 0.9 });
    // spear tip
    const ty = base - (tall ? 84 : 70);
    spikeG(g, x, ty + 4, -Math.PI / 2, tall ? 60 : 50, 38, SILVER);
    cel(g, circle(x, ty + 6, 10), { fill: GOLD.fill, shade: GOLD.shade, shadeDx: 3, shadeDy: 3, lw: OLW * 0.8 });
  }
  goldBand(g, cx - span / 2 - 16, base - 46, span + 32, 18, []);
  goldBand(g, cx - span / 2 - 16, base - 18, span + 32, 14, []);
}
function tall(g, w, h) {
  const cx = w / 2, base = h - 4, top = 104;
  groundShadow(g, cx, h - 6, 66, 10, 0.35);
  for (let i = 0; i < 6; i++) {
    const y = top + 70 + i * 54, s = i % 2 ? 1 : -1;
    spikeG(g, cx + s * 40, y, s > 0 ? -0.35 : Math.PI + 0.35, 44, 32, SILVER);
  }
  const col = rrect(cx - 46, top + 20, 92, base - top - 18, 10);
  cel(g, col, { fill: PURP.fill, shade: PURP.shade, shadeDx: 24, shadeDy: 0, light: PURP.light, lightDx: 7, lightDy: 0, lw: OLW });
  clipTo(g, col, () => {
    g.strokeStyle = rgba('#2a1860', 0.55); g.lineWidth = 3;
    for (let y = top + 44; y < base; y += 26) { g.beginPath(); g.moveTo(cx - 50, y); g.lineTo(cx + 50, y); g.stroke(); const o = ((y - top) / 26) % 2 ? 0 : 23; for (let x = cx - 46 + o; x < cx + 46; x += 46) { g.beginPath(); g.moveTo(x, y); g.lineTo(x, y + 26); g.stroke(); } }
  });
  for (const y of [top + 120, top + 250]) goldBand(g, cx - 54, y, 108, 20, [[cx, '#ff4f8a']]);
  goldBand(g, cx - 56, top + 8, 112, 26, [[cx - 26, '#5fd6ff'], [cx + 26, '#5fd6ff']]);
  // big star spike on top
  for (const [a, len, sw] of [[-Math.PI / 2, 92, 40], [-Math.PI / 2 - 0.85, 58, 30], [-Math.PI / 2 + 0.85, 58, 30]]) spikeG(g, cx, top + 6, a, len, sw, SILVER);
  cel(g, star(cx, top + 2, 22, 10, 5, -Math.PI / 2, 0.5), { fill: GOLD.fill, shade: GOLD.shade, shadeDx: 5, shadeDy: 5, light: GOLD.light, lightDx: 3, lightDy: 3, lw: OLW });
}
function hang(g, w, h) {
  const cx = w / 2;
  const ring = (c) => { c.moveTo(cx + 16, 18); c.ellipse(cx, 18, 16, 20, 0, 0, TAU); c.moveTo(cx + 7, 18); c.ellipse(cx, 18, 7, 11, 0, 0, TAU, true); };
  fill(g, ring, GOLDCHAIN.base, 'evenodd'); stroke(g, ring, OLW, OUTLINE);
  cel(g, rrect(cx - 7, 30, 14, 50, 5), { fill: GOLDCHAIN.base, shade: GOLDCHAIN.dark, shadeDx: 5, shadeDy: 0, lw: OLW * 0.8 });
  const by = 138, r = 48;
  glow(g, cx, by, 90, '#fff0a0', 0.25);
  spikeG(g, cx, by + r * 0.7, Math.PI / 2, h - (by + r * 0.7) - 6, 30, SILVER);
  spikedBall(g, cx, by, r, { n: 10, len: 36, w: 26, rot: -Math.PI / 2 + Math.PI / 10, spike: SILVER, ball: GOLD.fill, ballD: GOLD.shade, ballL: GOLD.light, studs: false });
  // star emblem
  cel(g, star(cx, by + 2, 20, 9, 5, -Math.PI / 2, 0.4), { fill: '#e64ad0', shade: '#8c1a90', shadeDx: 4, shadeDy: 4, light: rgba('#ffd4f6', 0.7), lightDx: 2, lightDy: 2, lw: OLW * 0.8 });
  glint(g, cx - 20, by - 20, 6, -0.7, 0.9);
}
function chain(g, w, h) { chainTile(g, w, h, GOLDCHAIN); }
function beam(g, w, h) {
  beamTile(g, w, h, {
    n: 8, barH: 98, spike: SILVER,
    drawBar: (g2, W, barH) => {
      const bar = (c) => c.rect(-20, 10, W + 40, barH - 30);
      fill(g2, bar, '#55438f');
      clipTo(g2, bar, () => {
        for (let row = 0; row < 3; row++) {
          const y = 12 + row * 22;
          for (let x = -64 + (row % 2) * 32; x < W + 64; x += 64) { const b = rrect(x + 2, y, 60, 19, 5); fill(g2, b, '#8f7ac8'); innerShade(g2, b, rgba('#6e5aa8', 0.8), 3, 3); innerLight(g2, b, rgba('#ab98e0', 0.9), 2, 2); }
        }
      });
      g2.strokeStyle = OUTLINE; g2.lineWidth = OLW; g2.beginPath(); g2.moveTo(-20, 10); g2.lineTo(W + 20, 10); g2.stroke();
      const band = (c) => c.rect(-20, barH - 22, W + 40, 18);
      cel(g2, band, { fill: GOLD.fill, shade: GOLD.shade, shadeDx: 0, shadeDy: 5, light: GOLD.light, lightDx: 0, lightDy: 3, lw: OLW });
      for (let x = 32; x < W + 64; x += 64) for (const xx of [x - W, x]) cel(g2, star(xx, barH - 13, 7, 3.2, 5, -Math.PI / 2, 0.4), { fill: '#fff2a8', shade: GOLD.shade, shadeDx: 2, shadeDy: 2, lw: 3 });
    },
  });
}
function fall(g, w, h) {
  const cx = w / 2;
  // spiked star-lantern: chain stub + ring, cage with a glowing star, silver spikes
  for (let k = 0; k < 2; k++) {
    const y = 22 + k * 24;
    if (k % 2 === 0) { const rg = (c) => { c.moveTo(cx + 10, y); c.ellipse(cx, y, 10, 15, 0, 0, TAU); c.moveTo(cx + 4, y); c.ellipse(cx, y, 4, 8, 0, 0, TAU, true); }; fill(g, rg, GOLDCHAIN.base, 'evenodd'); stroke(g, rg, OLW * 0.9, OUTLINE); }
    else cel(g, rrect(cx - 4, y - 15, 8, 30, 4), { fill: GOLDCHAIN.dark, shade: tone(GOLDCHAIN.dark, -0.2), shadeDx: 3, shadeDy: 0, lw: OLW * 0.8 });
  }
  const cy = 120, cw = 42, chh = 50;
  glow(g, cx, cy, 90, '#fff0a0', 0.45);
  // spikes around the cage
  // lengths solved so every tip stays inside the 140px frame
  for (const [a, len, sw] of [[-Math.PI * 0.82, 28, 26], [-Math.PI * 0.18, 28, 26], [Math.PI * 0.98, 32, 30], [Math.PI * 0.02, 32, 30], [Math.PI * 0.8, 44, 34], [Math.PI * 0.2, 44, 34], [Math.PI * 0.64, 58, 34], [Math.PI * 0.36, 58, 34], [Math.PI * 0.5, h - cy - chh * 0.64 - 6, 44]]) spikeG(g, cx + Math.cos(a) * cw * 0.72, cy + Math.sin(a) * chh * 0.64, a, len, sw, SILVER);
  const cage = rrect(cx - cw, cy - chh, cw * 2, chh * 2, 22);
  cel(g, cage, { fill: '#fff4b8', shade: '#ffd86a', shadeDx: 14, shadeDy: 10, lw: OLW });
  clipTo(g, cage, () => { glow(g, cx, cy, 50, '#ffffff', 0.8); });
  cel(g, star(cx, cy + 2, 26, 12, 5, -Math.PI / 2, 0.45), { fill: GOLD.fill, shade: GOLD.shade, shadeDx: 5, shadeDy: 5, light: GOLD.light, lightDx: 3, lightDy: 3, lw: OLW * 0.8 });
  // cage bars
  g.strokeStyle = OUTLINE; g.lineWidth = OLW * 0.9;
  for (const x of [cx - cw * 0.45, cx + cw * 0.45]) { g.beginPath(); g.moveTo(x, cy - chh + 4); g.lineTo(x, cy + chh - 4); g.stroke(); }
  cel(g, rrect(cx - cw - 6, cy - chh - 6, cw * 2 + 12, 18, 8), { fill: PURP.fill, shade: PURP.shade, shadeDx: 0, shadeDy: 5, light: PURP.light, lightDx: 0, lightDy: 3, lw: OLW });
  cel(g, rrect(cx - cw - 6, cy + chh - 12, cw * 2 + 12, 18, 8), { fill: PURP.fill, shade: PURP.shade, shadeDx: 0, shadeDy: 5, light: PURP.light, lightDx: 0, lightDy: 3, lw: OLW });
  glint(g, cx - cw * 0.6, cy - chh * 0.4, 5, -0.6, 0.9);
}
function pop0(g, w, h) {
  const cx = w / 2, base = h - 2;
  glow(g, cx, base - 14, 30, '#ff7fe6', 0.4);
  const rub = (c) => { c.moveTo(cx - 60, base); c.lineTo(cx - 52, base - 14); c.lineTo(cx - 30, base - 20); c.lineTo(cx - 8, base - 14); c.lineTo(cx + 14, base - 22); c.lineTo(cx + 38, base - 16); c.lineTo(cx + 56, base - 10); c.lineTo(cx + 62, base); c.closePath(); };
  cel(g, rub, { fill: '#c6b8f0', shade: '#9a88d4', shadeDx: 6, shadeDy: 4, light: rgba('#ffffff', 0.7), lightDx: 3, lightDy: 3, lw: DLW });
  g.strokeStyle = '#6a2a9a'; g.lineWidth = 3.5; g.lineCap = 'round';
  g.beginPath(); g.moveTo(cx - 26, base - 6); g.lineTo(cx - 10, base - 14); g.lineTo(cx + 4, base - 8); g.lineTo(cx + 20, base - 16); g.stroke();
  shardG(g, cx - 4, base - 12, -Math.PI / 2 - 0.1, 18, 12, { ...GEM, lw: 3.5, glint: false });
  sparkle(g, cx + 28, base - 22, 5, '#ffffff', 0.95);
}
function pop1(g, w, h) {
  const cx = w / 2, base = h - 4;
  groundShadow(g, cx, h - 6, 60, 10, 0.35);
  glow(g, cx, base - 70, 66, '#ff7fe6', 0.35);
  for (const [dx, a, len, sw] of [[-26, -1.98, 88, 46], [26, -1.16, 92, 46], [0, -1.57, 146, 58]]) shardG(g, cx + dx, base - 14, a, len, sw, GEM);
  // rubble
  for (const [x, y, r] of [[-44, -14, 16], [40, -12, 18], [0, -10, 20], [-60, -60, 7], [58, -84, 6]]) {
    const ch = roundPoly(chunkPts(rng(Math.round(x * 5 + y)), cx + x, base + y, r, 5, 0.3, 0.3), 3);
    cel(g, ch, { fill: '#c6b8f0', shade: '#9a88d4', shadeDx: 4, shadeDy: 4, lw: OLW * 0.8 });
  }
  sparkle(g, cx + 34, base - 120, 7, '#ffffff', 0.95);
}

const decos = [
  [74, 160, (g, w, h) => { // lantern post
    cel(g, rrect(w / 2 - 6, h - 112, 12, 110, 5), { fill: '#4a4a96', shade: '#34347a', shadeDx: 5, shadeDy: 0, lw: DLW });
    glow(g, w / 2, h - 128, 50, '#ffcf6a', 0.55);
    cel(g, rrect(w / 2 - 16, h - 148, 32, 38, 9), { fill: '#ffe48a', shade: '#f0b040', shadeDx: 8, shadeDy: 4, lw: DLW });
    cel(g, poly([[w / 2 - 22, h - 146], [w / 2, h - 166], [w / 2 + 22, h - 146]]), { fill: '#7a5ad0', shade: '#5a3eaa', shadeDx: 6, shadeDy: 0, lw: DLW });
    cel(g, rrect(w / 2 - 18, h - 112, 36, 8, 4), { fill: '#7a5ad0', shade: '#5a3eaa', shadeDx: 0, shadeDy: 3, lw: DLW * 0.8 });
    glint(g, w / 2 - 7, h - 138, 3, -0.6, 0.9);
  }],
  [116, 70, (g, w, h) => { // star candy pile (soft bumps)
    const cols = ['#ffd55a', '#ff9ad8', '#9ae8ff', '#c9a6ff', '#ffd55a'];
    for (const [i, [x, y, r]] of [[-30, -18, 16], [2, -16, 17], [32, -18, 15], [-14, -42, 15], [18, -42, 14]].entries()) {
      const sh = (c) => { const n = 9; for (let k = 0; k <= n * 2; k++) { const a = (k / (n * 2)) * TAU; const rr = k % 2 ? r * 0.84 : r; const px = w / 2 + x + Math.cos(a) * rr, py = h + y + Math.sin(a) * rr; if (k === 0) c.moveTo(px, py); else c.lineTo(px, py); } c.closePath(); };
      cel(g, sh, { fill: cols[i], shade: tone(cols[i], -0.2), shadeDx: 5, shadeDy: 5, light: rgba('#ffffff', 0.55), lightDx: 3, lightDy: 3, lw: DLW });
    }
  }],
  [132, 74, (g, w, h) => { const sh = circles([[w / 2 - 34, h - 26, 24], [w / 2 + 30, h - 24, 26], [w / 2, h - 40, 32]]); const s2 = (c) => { sh(c); c.rect(w / 2 - 58, h - 26, 116, 24); }; unionPart(g, s2, { fill: '#e8deff', shade: '#a493dc', shadeDx: 10, shadeDy: 10, light: rgba('#ffffff', 0.9), lightDx: 5, lightDy: 6, lw: DLW }); }],
  [86, 176, (g, w, h) => { // banner pole
    cel(g, rrect(w / 2 - 5, h - 170, 10, 168, 4), { fill: '#c9b8f0', shade: '#9a88d4', shadeDx: 4, shadeDy: 0, lw: DLW });
    cel(g, circle(w / 2, h - 172, 8), { fill: GOLD.fill, shade: GOLD.shade, shadeDx: 3, shadeDy: 3, lw: DLW });
    const fl = (c) => { c.moveTo(w / 2 + 5, h - 160); c.lineTo(w / 2 + 40, h - 160); c.lineTo(w / 2 + 40, h - 100); c.lineTo(w / 2 + 22, h - 112); c.lineTo(w / 2 + 5, h - 100); c.closePath(); };
    cel(g, fl, { fill: '#ff6fae', shade: '#d84a88', shadeDx: 6, shadeDy: 4, lw: DLW });
    cel(g, star(w / 2 + 22, h - 134, 9, 4, 5, -Math.PI / 2, 0.4), { fill: '#fff2a8', shade: GOLD.shade, shadeDx: 2, shadeDy: 2, lw: 3 });
    tuftBase(g, w / 2, h - 4, 40, '#9a88d4', OUTLINE);
  }],
  [84, 112, (g, w, h) => { // potted star flower
    cel(g, poly([[w / 2 - 26, h - 46], [w / 2 + 26, h - 46], [w / 2 + 18, h - 4], [w / 2 - 18, h - 4]]), { fill: '#7a5ad0', shade: '#5a3eaa', shadeDx: 8, shadeDy: 0, lw: DLW });
    goldBand(g, w / 2 - 30, h - 52, 60, 12, []);
    cel(g, rrect(w / 2 - 3, h - 94, 6, 44, 3), { fill: '#6fcb5a', shade: '#4aa54a', shadeDx: 3, shadeDy: 0, lw: DLW * 0.8 });
    glow(g, w / 2, h - 96, 30, '#fff0a0', 0.5);
    cel(g, star(w / 2, h - 96, 18, 8, 5, -Math.PI / 2, 0.6), { fill: GOLD.fill, shade: GOLD.shade, shadeDx: 4, shadeDy: 4, light: GOLD.light, lightDx: 2, lightDy: 2, lw: DLW });
  }],
  [120, 120, (g, w, h) => { // crown topiary bush
    groundShadow(g, w / 2, h - 5, 50, 7, 0.3);
    cel(g, rrect(w / 2 - 6, h - 40, 12, 38, 4), { fill: '#8a5a36', shade: '#5e3a20', shadeDx: 4, shadeDy: 0, lw: DLW });
    const cr = (c) => { c.moveTo(w / 2 - 46, h - 36); c.lineTo(w / 2 - 50, h - 96); c.quadraticCurveTo(w / 2 - 34, h - 80, w / 2 - 24, h - 104); c.quadraticCurveTo(w / 2 - 10, h - 82, w / 2, h - 112); c.quadraticCurveTo(w / 2 + 10, h - 82, w / 2 + 24, h - 104); c.quadraticCurveTo(w / 2 + 34, h - 80, w / 2 + 50, h - 96); c.lineTo(w / 2 + 46, h - 36); c.closePath(); };
    cel(g, cr, { fill: '#5fbf8a', shade: '#3a8f66', shadeDx: 12, shadeDy: 6, light: rgba('#c8ffe0', 0.6), lightDx: 5, lightDy: 5, lw: DLW });
    for (const x of [-24, 0, 24]) cel(g, circle(w / 2 + x, h - (x === 0 ? 112 : 104), 6), { fill: GOLD.fill, shade: GOLD.shade, shadeDx: 2, shadeDy: 2, lw: 3 });
  }],
  [110, 84, (g, w, h) => { // little treasure chest
    groundShadow(g, w / 2, h - 5, 46, 7, 0.3);
    const body = rrect(w / 2 - 44, h - 50, 88, 48, 8);
    cel(g, body, { fill: '#a06a40', shade: '#74472a', shadeDx: 12, shadeDy: 6, light: rgba('#e0b080', 0.6), lightDx: 4, lightDy: 4, lw: DLW });
    const lid = (c) => { c.moveTo(w / 2 - 46, h - 48); c.bezierCurveTo(w / 2 - 46, h - 84, w / 2 + 46, h - 84, w / 2 + 46, h - 48); c.closePath(); };
    cel(g, lid, { fill: '#b47a4a', shade: '#84522e', shadeDx: 12, shadeDy: 6, lw: DLW });
    for (const x of [-26, 26]) cel(g, rrect(w / 2 + x - 6, h - 80, 12, 78, 4), { fill: GOLD.fill, shade: GOLD.shade, shadeDx: 3, shadeDy: 0, lw: DLW * 0.8 });
    cel(g, rrect(w / 2 - 9, h - 56, 18, 18, 5), { fill: GOLD.fill, shade: GOLD.shade, shadeDx: 3, shadeDy: 3, lw: DLW * 0.8 });
    sparkle(g, w / 2 + 34, h - 82, 6, '#ffffff', 0.95);
  }],
  [104, 100, (g, w, h) => { // moon flowers
    tuftBase(g, w / 2, h - 4, 80, '#8a7ad8', OUTLINE);
    for (const [x, y, r] of [[-26, -46, 12], [6, -64, 14], [30, -40, 11]]) { glow(g, w / 2 + x, h + y, r * 2.4, '#fff6c0', 0.4); candyFlower(g, w / 2 + x, h + y, r, { petal: '#fff6d8', centre: '#ffd55a', lw: DLW * 0.8, n: 6 }); }
  }],
];

function sign(g, w, h) {
  return signPost(g, w, h, {
    post: '#9a88d4', frame: '#ffcf4a', board: '#3a3a8a', boardR: 20,
    boardDeco: (g2, bx, by, bw, bh) => {
      glow(g2, bx + bw / 2, by + 6, 26, '#fff0a0', 0.5);
      cel(g2, star(bx + bw / 2, by + 4, 18, 8.5, 5, -Math.PI / 2, 0.5), { fill: '#ffe066', shade: '#d39a22', shadeDx: 5, shadeDy: 5, light: rgba('#fff8c8', 0.8), lightDx: 3, lightDy: 3, lw: DLW });
      for (const [x, y] of [[bx + 8, by + 8], [bx + bw - 8, by + 8], [bx + 8, by + bh - 8], [bx + bw - 8, by + bh - 8]]) cel(g2, circle(x, y, 5), { fill: '#e64ad0', shade: '#8c1a90', shadeDx: 2, shadeDy: 2, lw: 2.5 });
    },
    base: (g2, ww, hh) => { const sh = circles([[ww * 0.3, hh - 16, 18], [ww * 0.42, hh - 22, 20], [ww * 0.6, hh - 18, 18], [ww * 0.72, hh - 14, 16]]); const s2 = (c) => { sh(c); c.rect(ww * 0.24, hh - 16, ww * 0.54, 14); }; unionPart(g2, s2, { fill: '#e8deff', shade: '#a493dc', shadeDx: 6, shadeDy: 6, lw: DLW }); },
  });
}

export function castleObstacles() {
  return {
    low, low2, tall, hang, chain, beam, fall, pop0, pop1, decos, sign,
    hits: { low: { x: -22, y: -60, w: 44, h: 60 }, low2: { x: -58, y: -48, w: 116, h: 48 }, tall: { x: -26, y: -214, w: 52, h: 214 } },
  };
}
