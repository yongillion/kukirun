// Obstacles — Sherbet Glacier: deep cobalt ice shards with white edges on
// snow, icicle clusters, frozen chains. Strong value contrast vs. pastels.
import {
  rng, tone, mix, rgba, OUTLINE, fill, stroke, clipTo, innerShade, innerLight, gloss, glint, glow,
  sparkle, poly, circle, ellipse, rrect, star, linearGrad, lerp, TAU,
  circles, unionPart, cel, shadeU, lightU, groundShadow, candyBall, candyFlower, roundPoly, chunkPts,
} from './_env_kit.js';
import { OLW, DLW, spikeG, shardG, chainTile, signPost, tuftBase } from './_env_obs_kit.js';
import { mintPine } from './_env_glacier.js';

const ICE = { light: '#e2ecff', base: '#4f74e6', dark: '#24379c', edge: 'rgba(255,255,255,0.95)' };
const ICE2 = { light: '#eef4ff', base: '#6f8ff0', dark: '#3448b0', edge: 'rgba(255,255,255,0.95)' };
const FROST = { base: '#aab6cc', dark: '#6a7896', light: '#f4f8ff' };
const SNOW = '#ffffff', SNOWS = '#c6dcf2';

function snowMound(g, cx, base, w, h, lw = OLW) {
  const list = [[cx - w * 0.28, base - h * 0.45, h * 0.62], [cx + w * 0.26, base - h * 0.42, h * 0.58], [cx, base - h * 0.6, h * 0.7]];
  const sh = (c) => { circles(list)(c); c.rect(cx - w / 2, base - h * 0.45, w, h * 0.45 + 2); };
  unionPart(g, sh, { fill: SNOW, shade: SNOWS, shadeDx: h * 0.25, shadeDy: h * 0.22, light: null, lw });
  sparkle(g, cx - w * 0.2, base - h * 0.85, 5, '#ffffff', 0.9);
}
function iceFan(g, cx, base, list, pal = ICE) { for (const [dx, a, len, w] of list) shardG(g, cx + dx, base, a, len, w, pal); }

function low(g, w, h) {
  const cx = w / 2, base = h - 4;
  groundShadow(g, cx, h - 6, 60, 10, 0.3);
  iceFan(g, cx, base - 18, [[-30, -2.0, 76, 44], [30, -1.14, 82, 44], [-12, -1.78, 120, 52], [12, -1.4, 128, 54], [0, -1.6, 84, 40]]);
  snowMound(g, cx, base - 8, 112, 36);
}
function low2(g, w, h) {
  const cx = w / 2, base = h - 4;
  groundShadow(g, cx, h - 6, 138, 11, 0.3);
  iceFan(g, cx, base - 20, [[-108, -2.12, 64, 42], [-78, -1.95, 94, 50], [-42, -1.72, 110, 54], [-4, -1.52, 118, 56], [36, -1.32, 108, 54], [74, -1.16, 92, 50], [106, -1.0, 64, 42], [-60, -1.56, 74, 40], [56, -1.6, 78, 40]]);
  snowMound(g, cx - 68, base - 8, 142, 36); snowMound(g, cx + 68, base - 8, 142, 34);
}
function tall(g, w, h) {
  const cx = w / 2, base = h - 4, top = 96;
  groundShadow(g, cx, h - 6, 66, 10, 0.3);
  // side shards
  for (let i = 0; i < 6; i++) {
    const y = top + 70 + i * 54, s = i % 2 ? 1 : -1;
    shardG(g, cx + s * 34, y, s > 0 ? -0.5 : Math.PI + 0.5, 56, 32, ICE);
  }
  // faceted ice column
  const col = poly([[cx - 52, base + 2], [cx - 46, top + 120], [cx - 36, top + 30], [cx - 10, top], [cx + 18, top + 8], [cx + 38, top + 40], [cx + 48, top + 130], [cx + 54, base + 2]]);
  fill(g, col, ICE2.base);
  clipTo(g, col, () => {
    g.fillStyle = ICE2.light; g.beginPath(); g.moveTo(cx - 60, base + 4); g.lineTo(cx - 52, top + 10); g.lineTo(cx - 12, top); g.lineTo(cx - 20, base + 4); g.closePath(); g.fill();
    g.fillStyle = ICE2.dark; g.beginPath(); g.moveTo(cx + 12, base + 4); g.lineTo(cx + 8, top + 8); g.lineTo(cx + 60, top + 30); g.lineTo(cx + 60, base + 4); g.closePath(); g.fill();
    g.strokeStyle = 'rgba(255,255,255,0.7)'; g.lineWidth = 3; g.lineCap = 'round';
    for (const y of [top + 110, top + 220, top + 300]) { g.beginPath(); g.moveTo(cx - 40, y); g.lineTo(cx - 24, y - 26); g.stroke(); }
    g.strokeStyle = rgba('#1a2a80', 0.4); g.lineWidth = 3;
    for (const y of [top + 160, top + 260]) { g.beginPath(); g.moveTo(cx + 16, y); g.lineTo(cx + 50, y + 18); g.stroke(); }
  });
  stroke(g, col, OLW, OUTLINE);
  // crown spikes
  iceFan(g, cx, top + 24, [[-16, -2.05, 74, 34], [16, -1.1, 74, 34], [0, -1.57, 104, 42]]);
  snowMound(g, cx, base - 8, 128, 30);
  // snow cap on top
  const cap = (c) => { c.moveTo(cx - 30, top + 34); c.quadraticCurveTo(cx - 20, top + 14, cx, top + 22); c.quadraticCurveTo(cx + 22, top + 14, cx + 32, top + 36); c.quadraticCurveTo(cx + 20, top + 46, cx + 10, top + 40); c.quadraticCurveTo(cx, top + 52, cx - 10, top + 42); c.quadraticCurveTo(cx - 24, top + 48, cx - 30, top + 34); c.closePath(); };
  cel(g, cap, { fill: SNOW, shade: SNOWS, shadeDx: 4, shadeDy: 4, lw: OLW * 0.9 });
}
function hang(g, w, h) {
  const cx = w / 2;
  const ring = (c) => { c.moveTo(cx + 16, 18); c.ellipse(cx, 18, 16, 20, 0, 0, TAU); c.moveTo(cx + 7, 18); c.ellipse(cx, 18, 7, 11, 0, 0, TAU, true); };
  fill(g, ring, FROST.base, 'evenodd'); stroke(g, ring, OLW, OUTLINE);
  // icicles hanging from a frozen chunk
  const top = 74;
  iceFan(g, cx, top + 30, [[-58, Math.PI / 2 + 0.18, 86, 36], [58, Math.PI / 2 - 0.18, 86, 36], [-30, Math.PI / 2 + 0.08, 120, 42], [30, Math.PI / 2 - 0.08, 120, 42], [0, Math.PI / 2, h - top - 34, 50]]);
  const chunk = (c) => { c.moveTo(cx - 84, top + 30); c.bezierCurveTo(cx - 90, top - 10, cx - 40, top - 30, cx, top - 26); c.bezierCurveTo(cx + 40, top - 30, cx + 90, top - 10, cx + 84, top + 30); c.quadraticCurveTo(cx, top + 50, cx - 84, top + 30); c.closePath(); };
  fill(g, chunk, ICE2.base);
  clipTo(g, chunk, () => { g.fillStyle = ICE2.light; g.fillRect(cx - 90, top - 40, 70, 90); g.fillStyle = ICE2.dark; g.fillRect(cx + 20, top - 40, 80, 90); });
  stroke(g, chunk, OLW, OUTLINE);
  // snow on top
  const sn = (c) => { c.moveTo(cx - 80, top + 4); c.bezierCurveTo(cx - 84, top - 26, cx - 40, top - 40, cx, top - 34); c.bezierCurveTo(cx + 40, top - 40, cx + 84, top - 26, cx + 80, top + 4); c.quadraticCurveTo(cx + 60, top + 16, cx + 40, top + 4); c.quadraticCurveTo(cx + 20, top + 18, cx, top + 6); c.quadraticCurveTo(cx - 24, top + 18, cx - 44, top + 4); c.quadraticCurveTo(cx - 62, top + 16, cx - 80, top + 4); c.closePath(); };
  cel(g, sn, { fill: SNOW, shade: SNOWS, shadeDx: 6, shadeDy: 6, lw: OLW });
  cel(g, rrect(cx - 7, 30, 14, top - 62, 5), { fill: FROST.base, shade: FROST.dark, shadeDx: 5, shadeDy: 0, lw: OLW * 0.8 });
}
function chain(g, w, h) {
  chainTile(g, w, h, FROST);
  // snow caps on the front rings
  for (const y of [h / 8, h * 5 / 8, h / 8 + h, h * 5 / 8 - h]) { const sh = (c) => { c.moveTo(w / 2 - 14, y - 14); c.quadraticCurveTo(w / 2, y - 30, w / 2 + 14, y - 16); c.quadraticCurveTo(w / 2, y - 12, w / 2 - 14, y - 14); c.closePath(); }; cel(g, sh, { fill: SNOW, shade: SNOWS, shadeDx: 2, shadeDy: 2, lw: 3 }); }
}
function beam(g, w, h) {
  const barH = 92, pitch = w / 8;
  for (const dx of [-w, 0, w]) for (let i = 0; i < 8; i++) {
    const x = dx + pitch * (i + 0.5);
    if (x < -pitch || x > w + pitch) continue;
    const long = i % 2 === 0;
    shardG(g, x, barH - 14, Math.PI / 2, long ? h - barH + 8 : (h - barH) * 0.66, long ? 34 : 28, ICE);
  }
  const bar = (c) => c.rect(-20, 18, w + 40, barH - 24);
  fill(g, bar, '#bfe6ff');
  clipTo(g, bar, () => {
    for (let x = 0; x < w + 128; x += 64) for (const xx of [x - w, x]) {
      g.fillStyle = 'rgba(255,255,255,0.45)'; g.beginPath(); g.moveTo(xx, 20); g.lineTo(xx + 22, 20); g.lineTo(xx + 6, barH); g.lineTo(xx - 16, barH); g.closePath(); g.fill();
      g.fillStyle = 'rgba(70,120,200,0.25)'; g.fillRect(xx + 30, 40, 26, 30);
    }
    g.fillStyle = 'rgba(60,100,180,0.3)'; g.fillRect(-20, barH - 24, w + 40, 20);
  });
  g.strokeStyle = OUTLINE; g.lineWidth = OLW; g.beginPath(); g.moveTo(-20, barH - 6); g.lineTo(w + 20, barH - 6); g.stroke();
  // snow blanket on top (period 64)
  const sn = (c) => {
    c.moveTo(-40, 26);
    for (let x = -40; x <= w + 40; x += 32) { c.quadraticCurveTo(x + 8, 4 + ((x / 32) % 2 ? 3 : 0), x + 16, 6); c.quadraticCurveTo(x + 26, 2, x + 32, 10); }
    c.lineTo(w + 40, 30);
    for (let x = w + 40; x >= -40; x -= 32) c.quadraticCurveTo(x - 16, 44, x - 32, 30);
    c.closePath();
  };
  cel(g, sn, { fill: SNOW, shade: SNOWS, shadeDx: 0, shadeDy: 6, lw: OLW });
}
function fall(g, w, h) {
  const cx = w / 2;
  iceFan(g, cx, 112, [[-26, Math.PI / 2 + 0.42, 76, 40], [26, Math.PI / 2 - 0.42, 76, 40], [0, Math.PI / 2, h - 116, 58]]);
  // frozen chunk + snow lump on top
  const chunk = (c) => { c.moveTo(cx - 56, 92); c.bezierCurveTo(cx - 62, 50, cx - 30, 36, cx, 40); c.bezierCurveTo(cx + 30, 36, cx + 62, 50, cx + 56, 92); c.quadraticCurveTo(cx, 128, cx - 56, 92); c.closePath(); };
  fill(g, chunk, ICE2.base);
  clipTo(g, chunk, () => { g.fillStyle = ICE2.light; g.fillRect(cx - 60, 30, 46, 100); g.fillStyle = ICE2.dark; g.fillRect(cx + 16, 30, 60, 100); });
  stroke(g, chunk, OLW, OUTLINE);
  const sn = (c) => { c.moveTo(cx - 54, 62); c.bezierCurveTo(cx - 62, 20, cx - 20, 4, cx + 6, 8); c.bezierCurveTo(cx + 40, 6, cx + 64, 26, cx + 54, 62); c.quadraticCurveTo(cx + 36, 74, cx + 22, 62); c.quadraticCurveTo(cx + 4, 78, cx - 12, 64); c.quadraticCurveTo(cx - 34, 76, cx - 54, 62); c.closePath(); };
  cel(g, sn, { fill: SNOW, shade: SNOWS, shadeDx: 6, shadeDy: 6, lw: OLW });
  sparkle(g, cx - 22, 24, 6, '#ffffff', 0.95);
}
function pop0(g, w, h) {
  const cx = w / 2, base = h - 2;
  glow(g, cx, base - 14, 30, '#7fb0ff', 0.35);
  const mound = (c) => { c.moveTo(cx - 62, base); c.bezierCurveTo(cx - 56, base - 30, cx + 56, base - 30, cx + 62, base); c.closePath(); };
  cel(g, mound, { fill: '#eef6ff', shade: '#bcd6f0', shadeDx: 10, shadeDy: 6, lw: DLW });
  g.strokeStyle = '#3a56c8'; g.lineWidth = 3.5; g.lineCap = 'round';
  g.beginPath(); g.moveTo(cx - 24, base - 10); g.lineTo(cx - 8, base - 18); g.lineTo(cx + 2, base - 10); g.lineTo(cx + 16, base - 19); g.lineTo(cx + 28, base - 9); g.stroke();
  g.beginPath(); g.moveTo(cx - 8, base - 18); g.lineTo(cx - 12, base - 24); g.moveTo(cx + 16, base - 19); g.lineTo(cx + 20, base - 25); g.stroke();
  shardG(g, cx + 2, base - 12, -Math.PI / 2, 16, 12, { ...ICE, lw: 3.5, glint: false });
  sparkle(g, cx + 30, base - 22, 5, '#ffffff', 0.95);
}
function pop1(g, w, h) {
  const cx = w / 2, base = h - 4;
  groundShadow(g, cx, h - 6, 60, 10, 0.3);
  iceFan(g, cx, base - 14, [[-26, -1.98, 88, 46], [26, -1.16, 92, 46], [0, -1.57, 146, 58]]);
  // burst snow + chunks
  snowMound(g, cx, base - 8, 120, 30);
  for (const [x, y, r, a] of [[-56, -70, 8, 0.4], [54, -86, 7, -0.5], [-40, -104, 6, 0.9], [44, -40, 6, 0.2]]) {
    const ch = roundPoly(chunkPts(rng(Math.round(x * 3 + y)), cx + x, base + y, r, 5, 0.3, a), 2);
    cel(g, ch, { fill: SNOW, shade: SNOWS, shadeDx: 2, shadeDy: 2, lw: 3 });
  }
  sparkle(g, cx - 34, base - 120, 7, '#ffffff', 0.95);
}

const decos = [
  [96, 132, (g, w, h) => { // small snowman with a candy-corn nose
    groundShadow(g, w / 2, h - 5, 38, 7, 0.25);
    cel(g, circle(w / 2, h - 34, 32), { fill: SNOW, shade: SNOWS, shadeDx: 10, shadeDy: 10, lw: DLW });
    cel(g, circle(w / 2, h - 86, 24), { fill: SNOW, shade: SNOWS, shadeDx: 8, shadeDy: 8, lw: DLW });
    for (const x of [-8, 8]) fill(g, circle(w / 2 + x, h - 92, 3.5), '#2b1a12');
    cel(g, poly([[w / 2 - 2, h - 86], [w / 2 + 20, h - 82], [w / 2 - 2, h - 78]]), { fill: '#ff9a3c', shade: '#e0702a', shadeDx: 2, shadeDy: 2, lw: 3 });
    const sc = (c) => { c.moveTo(w / 2 - 24, h - 66); c.quadraticCurveTo(w / 2, h - 58, w / 2 + 24, h - 66); c.lineTo(w / 2 + 24, h - 58); c.lineTo(w / 2 + 14, h - 40); c.lineTo(w / 2 + 6, h - 56); c.quadraticCurveTo(w / 2 - 10, h - 52, w / 2 - 24, h - 58); c.closePath(); };
    cel(g, sc, { fill: '#ff6f9a', shade: '#d84a78', shadeDx: 3, shadeDy: 3, lw: 3.5 });
    cel(g, rrect(w / 2 - 18, h - 120, 36, 8, 3), { fill: '#7a4a2a', shade: '#53301a', shadeDx: 0, shadeDy: 2, lw: 3.5 });
    cel(g, rrect(w / 2 - 12, h - 134, 24, 16, 4), { fill: '#7a4a2a', shade: '#53301a', shadeDx: 4, shadeDy: 0, lw: 3.5 });
  }],
  [64, 126, (g, w, h) => { // popsicle in snow
    cel(g, rrect(w / 2 - 5, h - 50, 10, 46, 4), { fill: '#f3d9a8', shade: '#d7b47a', shadeDx: 4, shadeDy: 0, lw: DLW });
    cel(g, rrect(w / 2 - 22, h - 118, 44, 74, 18), { fill: '#ff9cbd', shade: '#e8709a', shadeDx: 9, shadeDy: 5, light: rgba('#ffffff', 0.55), lightDx: 4, lightDy: 4, lw: DLW });
    fill(g, ellipse(w / 2 - 10, h - 96, 4, 12), 'rgba(255,255,255,0.8)');
    snowMound(g, w / 2, h - 2, 60, 22, DLW);
  }],
  [120, 66, (g, w, h) => { snowMound(g, w / 2, h - 2, 110, 46, DLW); sparkle(g, w / 2 + 30, h - 40, 6, '#ffffff', 0.95); }],
  [80, 140, (g, w, h) => { mintPine(g, w / 2, h - 6, 130, 74, { lw: DLW, outline: OUTLINE, tiers: 3, star: true }); }],
  [62, 128, (g, w, h) => { // candy cane in snow
    const cc = (c) => { c.moveTo(w / 2 - 6, h - 6); c.lineTo(w / 2 - 6, h - 96); c.arc(w / 2 + 8, h - 96, 14, Math.PI, 0); c.lineTo(w / 2 + 22, h - 86); c.lineTo(w / 2 + 12, h - 86); c.lineTo(w / 2 + 12, h - 96); c.arc(w / 2 + 8, h - 96, 4, 0, Math.PI, true); c.lineTo(w / 2 + 4, h - 6); c.closePath(); };
    fill(g, cc, '#ffffff');
    clipTo(g, cc, () => { g.fillStyle = '#ff4f6e'; for (let y = h - 130; y < h; y += 18) { g.beginPath(); g.moveTo(w / 2 - 30, y); g.lineTo(w / 2 + 30, y - 22); g.lineTo(w / 2 + 30, y - 14); g.lineTo(w / 2 - 30, y + 8); g.closePath(); g.fill(); } });
    stroke(g, cc, DLW);
    snowMound(g, w / 2, h - 2, 58, 22, DLW);
  }],
  [96, 92, (g, w, h) => { // rounded ice crystal (harmless)
    groundShadow(g, w / 2, h - 5, 38, 7, 0.25);
    for (const [x, hh, cw] of [[-16, 62, 28], [16, 50, 26], [0, 80, 32]]) {
      const sh = rrect(w / 2 + x - cw / 2, h - hh - 4, cw, hh, cw * 0.5);
      cel(g, sh, { fill: '#bfe6ff', shade: '#86c4ea', shadeDx: cw * 0.35, shadeDy: 0, light: rgba('#ffffff', 0.7), lightDx: cw * 0.15, lightDy: 4, lw: DLW });
    }
    sparkle(g, w / 2 - 8, h - 70, 6, '#ffffff', 0.95);
  }],
  [130, 84, (g, w, h) => { // frozen berry bush
    snowMound(g, w / 2, h - 2, 120, 50, DLW);
    for (const [x, y] of [[-30, -40], [4, -54], [32, -34]]) { candyBall(g, w / 2 + x, h + y, 7, '#e8406a', { lw: 3.5 }); candyBall(g, w / 2 + x + 10, h + y + 4, 6, '#e8406a', { lw: 3.5 }); }
  }],
  [104, 92, (g, w, h) => { // sherbet scoop rock
    groundShadow(g, w / 2, h - 5, 44, 7, 0.25);
    const sc = (c) => { c.moveTo(w / 2 - 44, h - 6); c.bezierCurveTo(w / 2 - 52, h - 80, w / 2 + 52, h - 80, w / 2 + 44, h - 6); c.closePath(); };
    cel(g, sc, { fill: '#ffc6da', shade: '#f09ab8', shadeDx: 12, shadeDy: 8, light: rgba('#ffffff', 0.55), lightDx: 6, lightDy: 6, lw: DLW });
    clipTo(g, sc, () => { g.fillStyle = 'rgba(160,236,214,0.7)'; g.beginPath(); g.ellipse(w / 2, h - 30, 60, 10, 0.1, 0, TAU); g.fill(); });
    snowMound(g, w / 2 + 10, h - 52, 50, 16, DLW);
  }],
];

function sign(g, w, h) {
  return signPost(g, w, h, {
    post: '#9a6a48', frame: '#b98a5e', board: '#eaf6ff', boardR: 18,
    boardDeco: (g2, bx, by, bw, bh) => {
      // snow cap with rounded icicles (harmless)
      const sn = (c) => { c.moveTo(bx - 6, by + 14); c.bezierCurveTo(bx - 8, by - 12, bx + bw * 0.3, by - 16, bx + bw * 0.5, by - 10); c.bezierCurveTo(bx + bw * 0.7, by - 16, bx + bw + 8, by - 12, bx + bw + 6, by + 14); c.quadraticCurveTo(bx + bw * 0.8, by + 22, bx + bw * 0.62, by + 12); c.quadraticCurveTo(bx + bw * 0.45, by + 24, bx + bw * 0.3, by + 12); c.quadraticCurveTo(bx + bw * 0.14, by + 22, bx - 6, by + 14); c.closePath(); };
      cel(g2, sn, { fill: SNOW, shade: SNOWS, shadeDx: 5, shadeDy: 5, lw: DLW });
      for (const x of [bx + 30, bx + bw - 40]) { const ic = (c) => { c.moveTo(x - 6, by + bh - 2); c.lineTo(x + 6, by + bh - 2); c.quadraticCurveTo(x + 4, by + bh + 14, x, by + bh + 18); c.quadraticCurveTo(x - 4, by + bh + 14, x - 6, by + bh - 2); c.closePath(); }; cel(g2, ic, { fill: '#e8f8ff', shade: '#9fd2f0', shadeDx: 3, shadeDy: 0, lw: 3.5 }); }
    },
    base: (g2, ww, hh) => { snowMound(g2, ww * 0.3, hh - 2, 80, 26, DLW); snowMound(g2, ww * 0.72, hh - 2, 90, 28, DLW); },
  });
}

export function glacierObstacles() {
  return {
    low, low2, tall, hang, chain, beam, fall, pop0, pop1, decos, sign,
    hits: { low: { x: -22, y: -60, w: 44, h: 60 }, low2: { x: -58, y: -52, w: 116, h: 52 }, tall: { x: -26, y: -214, w: 52, h: 214 } },
  };
}
