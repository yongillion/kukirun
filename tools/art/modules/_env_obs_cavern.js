// Obstacles — Cocoa Cavern: bright crimson crystal shards (white edges, red
// glow) on dark chocolate rock with violet rim light; iron chains.
import {
  rng, tone, mix, rgba, OUTLINE, fill, stroke, clipTo, innerShade, innerLight, gloss, glint, glow,
  sparkle, poly, circle, ellipse, rrect, star, linearGrad, lerp, TAU,
  circles, unionPart, cel, shadeU, lightU, groundShadow, candyBall, roundPoly, chunkPts,
} from './_env_kit.js';
import { OLW, DLW, spikeG, shardG, chainTile, signPost, tuftBase } from './_env_obs_kit.js';
import { crystalCluster } from './_env_cavern.js';

const RED = { light: '#ffd0d8', base: '#ff4a6a', dark: '#b3163e', edge: 'rgba(255,255,255,0.95)' };
const ROCK = { fill: '#4e3226', shade: '#2c1810', light: rgba('#c9a0ff', 0.55) };
const IRON = { base: '#a3a9bd', dark: '#5f6378', light: '#eef1f8' };
const CYAN = { base: '#7ff0ff', light: '#e2fdff', dark: '#36b3d4', glow: '#6fe8ff' };
const VIOLET = { base: '#c08bff', light: '#ecd9ff', dark: '#8656d8', glow: '#b37cff' };

function rockBase(g, cx, base, w, h, o = {}) {
  const sh = (c) => { c.moveTo(cx - w / 2, base + 2); c.bezierCurveTo(cx - w / 2 + 4, base - h * 0.9, cx - w * 0.2, base - h * 1.15, cx + w * 0.05, base - h); c.bezierCurveTo(cx + w * 0.35, base - h * 0.95, cx + w / 2, base - h * 0.6, cx + w / 2, base + 2); c.closePath(); };
  cel(g, sh, { fill: ROCK.fill, shade: ROCK.shade, shadeDx: w * 0.08, shadeDy: h * 0.25, light: ROCK.light, lightDx: 5, lightDy: 4, lw: OLW });
  if (o.drip !== false) {
    // milk-chocolate drip on top
    const y = base - h + 4, x = cx - w * 0.12;
    const d = (c) => { c.moveTo(x - w * 0.22, y + 4); c.quadraticCurveTo(x, y - 8, x + w * 0.22, y + 2); c.quadraticCurveTo(x + w * 0.2, y + 12, x + w * 0.1, y + 12); c.bezierCurveTo(x + w * 0.09, y + 26, x + 2, y + 26, x + 1, y + 12); c.quadraticCurveTo(x - w * 0.1, y + 14, x - w * 0.22, y + 4); c.closePath(); };
    cel(g, d, { fill: '#c98a5a', shade: '#9a5c36', shadeDx: 3, shadeDy: 4, lw: OLW * 0.8 });
  }
}
function shardFan(g, cx, base, list, glowR = 0) {
  if (glowR) glow(g, cx, base - glowR * 0.55, glowR, '#ff3a60', 0.4);
  for (const [dx, a, len, w] of list) shardG(g, cx + dx, base, a, len, w, RED);
}

function low(g, w, h) {
  const cx = w / 2, base = h - 4;
  groundShadow(g, cx, h - 6, 60, 10, 0.35);
  shardFan(g, cx, base - 16, [[-30, -2.0, 76, 44], [30, -1.14, 80, 44], [-12, -1.78, 118, 52], [12, -1.4, 128, 54], [0, -1.6, 84, 40]], 62);
  rockBase(g, cx, base, 120, 36);
}
function low2(g, w, h) {
  const cx = w / 2, base = h - 4;
  groundShadow(g, cx, h - 6, 138, 11, 0.35);
  glow(g, cx, base - 50, 100, '#ff3a60', 0.32);
  shardFan(g, cx, base - 18, [[-108, -2.12, 64, 42], [-78, -1.95, 94, 50], [-42, -1.72, 110, 54], [-4, -1.52, 118, 56], [36, -1.32, 108, 54], [74, -1.16, 92, 50], [106, -1.0, 64, 42], [-60, -1.56, 74, 40], [56, -1.6, 78, 40]], 0);
  rockBase(g, cx, base, 280, 40);
}
function tall(g, w, h) {
  const cx = w / 2, base = h - 4, top = 92;
  groundShadow(g, cx, h - 6, 66, 10, 0.35);
  glow(g, cx, base - 220, 84, '#ff3a60', 0.22);
  // side shards (behind the column)
  for (let i = 0; i < 6; i++) {
    const y = top + 60 + i * 56, s = i % 2 ? 1 : -1, wy = 30 - i * 1.5 + (top + 60 + i * 56 - top) * 0.06;
    shardG(g, cx + s * (wy + 4), y, s > 0 ? -0.55 : Math.PI + 0.55, 42, 28, RED);
  }
  const col = (c) => {
    c.moveTo(cx - 58, base + 2);
    c.bezierCurveTo(cx - 52, base - 140, cx - 40, top + 120, cx - 26, top + 30);
    c.quadraticCurveTo(cx - 12, top, cx + 4, top + 4);
    c.quadraticCurveTo(cx + 20, top + 10, cx + 28, top + 40);
    c.bezierCurveTo(cx + 40, top + 130, cx + 54, base - 140, cx + 60, base + 2);
    c.closePath();
  };
  cel(g, col, { fill: ROCK.fill, shade: ROCK.shade, shadeDx: 22, shadeDy: 0, light: ROCK.light, lightDx: 7, lightDy: 2, lw: OLW });
  clipTo(g, col, () => {
    g.strokeStyle = rgba('#1e0e08', 0.5); g.lineWidth = 4; g.lineCap = 'round';
    for (let y = top + 60; y < base; y += 52) { g.beginPath(); g.moveTo(cx - 60, y); g.quadraticCurveTo(cx, y + 16, cx + 60, y - 4); g.stroke(); }
    g.strokeStyle = rgba('#d8b0ff', 0.3); g.lineWidth = 3;
    for (let y = top + 64; y < base; y += 52) { g.beginPath(); g.moveTo(cx - 40, y); g.quadraticCurveTo(cx - 14, y + 10, cx, y + 12); g.stroke(); }
  });
  // front shards poking out
  for (const [x, y, a, l, sw] of [[cx - 10, top + 150, -2.4, 40, 22], [cx + 14, top + 250, -0.8, 42, 22], [cx - 12, top + 330, -2.3, 36, 20]]) shardG(g, x, y, a, l, sw, RED);
  // crown crystals on top
  shardFan(g, cx, top + 26, [[-14, -2.0, 70, 30], [14, -1.15, 70, 30], [0, -1.57, 100, 38]]);
}
function hang(g, w, h) {
  const cx = w / 2;
  const ring = (c) => { c.moveTo(cx + 16, 18); c.ellipse(cx, 18, 16, 20, 0, 0, TAU); c.moveTo(cx + 7, 18); c.ellipse(cx, 18, 7, 11, 0, 0, TAU, true); };
  fill(g, ring, IRON.base, 'evenodd'); stroke(g, ring, OLW, OUTLINE);
  const by = 134, r = 50;
  glow(g, cx, by, 110, '#ff3a60', 0.3);
  // radiating shards (behind the geode)
  const n = 9;
  for (let i = 0; i < n; i++) {
    const a = -Math.PI / 2 + Math.PI / n + (i * TAU) / n;
    if (Math.abs(a + Math.PI / 2) < 0.4) continue; // keep the top free for the chain
    shardG(g, cx + Math.cos(a) * r * 0.62, by + Math.sin(a) * r * 0.62, a, 48 + (i % 2) * 8, 40, RED);
  }
  shardG(g, cx, by + r * 0.5, Math.PI / 2, h - by - r * 0.5 - 4, 38, RED); // bottom tip -> anchor
  // geode rock
  const geo = roundPoly(chunkPts(rng(5), cx, by, r, 9, 0.12, 0), 12);
  cel(g, geo, { fill: ROCK.fill, shade: ROCK.shade, shadeDx: 16, shadeDy: 16, light: ROCK.light, lightDx: 6, lightDy: 6, lw: OLW });
  // iron straps holding it
  g.strokeStyle = OUTLINE; g.lineWidth = OLW; g.beginPath(); g.moveTo(cx, 36); g.lineTo(cx, by - r + 6); g.stroke();
  cel(g, rrect(cx - 7, 30, 14, by - r - 20, 5), { fill: IRON.base, shade: IRON.dark, shadeDx: 5, shadeDy: 0, lw: OLW * 0.8 });
  // glowing crack seam across the geode
  clipTo(g, geo, () => {
    glow(g, cx + 6, by + 8, 40, '#ff3a60', 0.55);
    g.strokeStyle = '#ff8aa0'; g.lineWidth = 4; g.lineCap = 'round'; g.lineJoin = 'round';
    g.beginPath(); g.moveTo(cx - r, by + 14); g.lineTo(cx - 18, by + 4); g.lineTo(cx - 4, by + 18); g.lineTo(cx + 14, by + 2); g.lineTo(cx + r, by + 12); g.stroke();
  });
}
function chain(g, w, h) { chainTile(g, w, h, IRON); }
function beam(g, w, h) {
  const barH = 92;
  // shards pointing down (period: 8 per tile)
  const pitch = w / 8;
  glow(g, w / 2, barH + 30, 140, '#ff3a60', 0.18);
  for (const dx of [-w, 0, w]) for (let i = 0; i < 8; i++) {
    const x = dx + pitch * (i + 0.5);
    if (x < -pitch || x > w + pitch) continue;
    const long = i % 2 === 0;
    shardG(g, x, barH - 14, Math.PI / 2, long ? h - barH + 8 : (h - barH) * 0.66, long ? 32 : 26, RED);
  }
  const bar = (c) => c.rect(-20, 8, w + 40, barH - 14);
  fill(g, bar, ROCK.fill);
  clipTo(g, bar, () => {
    // strata + chunk texture (period 128)
    g.fillStyle = rgba('#6a4434', 0.8); g.fillRect(-20, 20, w + 40, 10);
    g.fillStyle = rgba('#2c1810', 0.55); g.fillRect(-20, barH - 30, w + 40, 24);
    g.fillStyle = rgba('#c9a0ff', 0.4); g.fillRect(-20, 10, w + 40, 4);
    for (let x = 0; x < w + 128; x += 64) for (const xx of [x - w, x]) {
      g.strokeStyle = rgba('#1e0e08', 0.55); g.lineWidth = 3.5; g.beginPath(); g.moveTo(xx, 14); g.lineTo(xx + 8, barH - 10); g.stroke();
      fill(g, ellipse(xx + 32, 50, 8, 5), rgba('#2c1810', 0.6));
    }
  });
  g.strokeStyle = OUTLINE; g.lineWidth = OLW; g.beginPath(); g.moveTo(-20, 8); g.lineTo(w + 20, 8); g.moveTo(-20, barH - 6); g.lineTo(w + 20, barH - 6); g.stroke();
}
function fall(g, w, h) {
  const cx = w / 2;
  glow(g, cx, h - 60, 66, '#ff3a60', 0.35);
  // red crystal tips (tripod)
  shardG(g, cx - 26, 120, Math.PI / 2 + 0.38, 86, 44, RED);
  shardG(g, cx + 26, 120, Math.PI / 2 - 0.38, 86, 44, RED);
  shardG(g, cx, 112, Math.PI / 2, h - 112 - 4, 58, RED);
  // stalactite body (broken top)
  const body = (c) => {
    c.moveTo(cx - 58, 18); c.lineTo(cx - 38, 6); c.lineTo(cx - 20, 16); c.lineTo(cx - 2, 4); c.lineTo(cx + 18, 14); c.lineTo(cx + 38, 4); c.lineTo(cx + 58, 16);
    c.bezierCurveTo(cx + 54, 50, cx + 30, 86, cx + 18, 132);
    c.quadraticCurveTo(cx, 148, cx - 18, 132);
    c.bezierCurveTo(cx - 30, 86, cx - 54, 50, cx - 58, 18);
    c.closePath();
  };
  cel(g, body, { fill: ROCK.fill, shade: ROCK.shade, shadeDx: 18, shadeDy: 8, light: ROCK.light, lightDx: 6, lightDy: 4, lw: OLW });
  clipTo(g, body, () => {
    g.fillStyle = rgba('#7a5040', 0.9); g.beginPath(); g.moveTo(cx - 58, 18); g.lineTo(cx - 38, 6); g.lineTo(cx - 20, 16); g.lineTo(cx - 2, 4); g.lineTo(cx + 18, 14); g.lineTo(cx + 38, 4); g.lineTo(cx + 58, 16); g.lineTo(cx + 58, 30); g.lineTo(cx - 58, 30); g.closePath(); g.fill();
    g.strokeStyle = rgba('#1e0e08', 0.5); g.lineWidth = 4; g.lineCap = 'round';
    for (const [x0, x1] of [[-30, -10], [4, 10], [26, 14]]) { g.beginPath(); g.moveTo(cx + x0, 34); g.quadraticCurveTo(cx + (x0 + x1) / 2 - 4, 80, cx + x1 * 0.6, 124); g.stroke(); }
    g.strokeStyle = rgba('#d8b0ff', 0.35); g.lineWidth = 3;
    g.beginPath(); g.moveTo(cx - 40, 34); g.quadraticCurveTo(cx - 30, 80, cx - 14, 120); g.stroke();
  });
  // drip ridges
  const d = (c) => { c.moveTo(cx - 34, 30); c.quadraticCurveTo(cx - 20, 22, cx - 6, 30); c.lineTo(cx - 12, 70); c.quadraticCurveTo(cx - 18, 82, cx - 24, 70); c.closePath(); };
  cel(g, d, { fill: '#c98a5a', shade: '#9a5c36', shadeDx: 3, shadeDy: 3, lw: OLW * 0.75 });
}

const decos = [
  [104, 104, (g, w, h) => { // glowing mushroom pair
    for (const [x, hh, r] of [[-18, 70, 26], [24, 48, 18]]) {
      const cx = w / 2 + x;
      glow(g, cx, h - hh, r * 2.6, CYAN.glow, 0.45);
      cel(g, rrect(cx - r * 0.2, h - hh, r * 0.4, hh - 2, r * 0.2), { fill: '#e8d8f4', shade: '#c4b0d8', shadeDx: 4, shadeDy: 0, lw: DLW });
      const cap = (c) => { c.moveTo(cx - r, h - hh + r * 0.1); c.bezierCurveTo(cx - r, h - hh - r * 0.95, cx + r, h - hh - r * 0.95, cx + r, h - hh + r * 0.1); c.quadraticCurveTo(cx, h - hh + r * 0.35, cx - r, h - hh + r * 0.1); c.closePath(); };
      cel(g, cap, { fill: CYAN.base, shade: CYAN.dark, shadeDx: r * 0.3, shadeDy: r * 0.2, light: rgba('#ffffff', 0.5), lightDx: r * 0.1, lightDy: r * 0.12, lw: DLW });
      for (const [dx, dy] of [[-0.4, -0.35], [0.2, -0.5], [0.45, -0.15]]) fill(g, ellipse(cx + dx * r, h - hh + dy * r, r * 0.12, r * 0.09), '#ffffff');
    }
  }],
  [112, 92, (g, w, h) => { // blunt glowing violet crystals (harmless look)
    glow(g, w / 2, h - 40, 52, VIOLET.glow, 0.45);
    for (const [x, hh, cw, a] of [[-26, 46, 24, -0.35], [24, 54, 26, 0.3], [0, 76, 30, 0]]) {
      g.save(); g.translate(w / 2 + x, h - 6); g.rotate(a);
      const sh = rrect(-cw / 2, -hh, cw, hh + 6, cw * 0.48);
      cel(g, sh, { fill: VIOLET.base, shade: VIOLET.dark, shadeDx: cw * 0.38, shadeDy: 0, light: rgba(VIOLET.light, 0.9), lightDx: cw * 0.16, lightDy: 3, lw: DLW });
      fill(g, ellipse(-cw * 0.18, -hh * 0.62, cw * 0.1, hh * 0.18), 'rgba(255,255,255,0.85)');
      g.restore();
    }
  }],
  [74, 152, (g, w, h) => { // mine lantern on a post
    cel(g, rrect(w / 2 - 6, h - 110, 12, 108, 5), { fill: '#8a5a36', shade: '#5e3a20', shadeDx: 5, shadeDy: 0, lw: DLW });
    cel(g, rrect(w / 2 - 6, h - 112, 34, 9, 4), { fill: '#8a5a36', shade: '#5e3a20', shadeDx: 0, shadeDy: 3, lw: DLW });
    glow(g, w / 2 + 22, h - 82, 34, '#ffcf6a', 0.55);
    g.strokeStyle = OUTLINE; g.lineWidth = 3; g.beginPath(); g.moveTo(w / 2 + 22, h - 104); g.lineTo(w / 2 + 22, h - 96); g.stroke();
    cel(g, rrect(w / 2 + 10, h - 96, 24, 30, 7), { fill: '#ffe48a', shade: '#f0b040', shadeDx: 6, shadeDy: 3, lw: DLW });
    cel(g, rrect(w / 2 + 7, h - 100, 30, 7, 3), { fill: IRON.base, shade: IRON.dark, shadeDx: 0, shadeDy: 2, lw: DLW * 0.8 });
    cel(g, rrect(w / 2 + 7, h - 68, 30, 6, 3), { fill: IRON.base, shade: IRON.dark, shadeDx: 0, shadeDy: 2, lw: DLW * 0.8 });
  }],
  [124, 72, (g, w, h) => { // rock pile
    groundShadow(g, w / 2, h - 5, 54, 7, 0.35);
    for (const [x, y, r, col] of [[-30, -24, 26, '#5e3c2c'], [28, -22, 24, '#523424'], [0, -44, 22, '#68442f']]) cel(g, ellipse(w / 2 + x, h + y, r * 1.1, r * 0.9), { fill: col, shade: tone(col, -0.3), shadeDx: 8, shadeDy: 6, light: rgba('#c9a0ff', 0.5), lightDx: 4, lightDy: 4, lw: DLW });
  }],
  [144, 56, (g, w, h) => { // chocolate puddle
    const pd = (c) => { c.moveTo(w / 2 - 64, h - 8); c.bezierCurveTo(w / 2 - 66, h - 26, w / 2 - 20, h - 30, w / 2 + 10, h - 26); c.bezierCurveTo(w / 2 + 50, h - 30, w / 2 + 68, h - 22, w / 2 + 64, h - 8); c.quadraticCurveTo(w / 2, h, w / 2 - 64, h - 8); c.closePath(); };
    cel(g, pd, { fill: '#8a5236', shade: '#5e3420', shadeDx: 6, shadeDy: 4, light: rgba('#e0a070', 0.6), lightDx: 3, lightDy: 3, lw: DLW });
    gloss(g, w / 2 - 24, h - 20, 22, 5, 0, 0.6);
    for (const [x, r] of [[-30, 5], [36, 4]]) { fill(g, circle(w / 2 + x, h - 34, r), '#8a5236'); stroke(g, circle(w / 2 + x, h - 34, r), 3); }
  }],
  [104, 52, (g, w, h) => { glow(g, w / 2, h - 20, 34, '#7ff0b0', 0.4); tuftBase(g, w / 2, h - 4, 90, '#5fd6a6', OUTLINE); for (const x of [-30, 0, 28]) { glow(g, w / 2 + x, h - 22, 10, '#c8fff0', 0.8); fill(g, circle(w / 2 + x, h - 22, 3), '#ffffff'); } }],
  [112, 84, (g, w, h) => { // pink mushroom trio
    for (const [x, hh, r] of [[-30, 44, 16], [4, 60, 20], [34, 36, 13]]) {
      const cx = w / 2 + x;
      glow(g, cx, h - hh, r * 2.4, '#b37cff', 0.35);
      cel(g, rrect(cx - r * 0.22, h - hh, r * 0.44, hh - 2, r * 0.2), { fill: '#f4e2f0', shade: '#d4bcd0', shadeDx: 3, shadeDy: 0, lw: DLW * 0.9 });
      const cap = (c) => { c.moveTo(cx - r, h - hh + r * 0.1); c.bezierCurveTo(cx - r, h - hh - r * 0.95, cx + r, h - hh - r * 0.95, cx + r, h - hh + r * 0.1); c.quadraticCurveTo(cx, h - hh + r * 0.35, cx - r, h - hh + r * 0.1); c.closePath(); };
      cel(g, cap, { fill: '#c9a0ff', shade: '#8f62d8', shadeDx: r * 0.3, shadeDy: r * 0.2, lw: DLW * 0.9 });
      fill(g, ellipse(cx - r * 0.35, h - hh - r * 0.3, r * 0.14, r * 0.1), '#ffffff');
    }
  }],
  [124, 104, (g, w, h) => { // crate of crystals
    groundShadow(g, w / 2, h - 5, 54, 7, 0.35);
    crystalCluster(g, w / 2, h - 50, 0.6, CYAN, { lw: DLW, n: 4, glowA: 0.4, seed: 21 });
    const cr = rrect(w / 2 - 46, h - 58, 92, 56, 6);
    cel(g, cr, { fill: '#a06a40', shade: '#74472a', shadeDx: 12, shadeDy: 6, light: rgba('#e0b080', 0.6), lightDx: 4, lightDy: 4, lw: DLW });
    clipTo(g, cr, () => { g.strokeStyle = rgba('#5e3a20', 0.7); g.lineWidth = 3; for (const y of [h - 40, h - 22]) { g.beginPath(); g.moveTo(w / 2 - 50, y); g.lineTo(w / 2 + 50, y); g.stroke(); } g.beginPath(); g.moveTo(w / 2 - 46, h - 58); g.lineTo(w / 2 + 46, h - 2); g.stroke(); });
  }],
];

function sign(g, w, h) {
  return signPost(g, w, h, {
    post: '#6a4430', frame: '#8a5a3a', board: '#e9c79a', boardR: 16,
    boardDeco: (g2, bx, by, bw, bh) => {
      // lantern hanging from the right corner
      g2.strokeStyle = OUTLINE; g2.lineWidth = 3; g2.beginPath(); g2.moveTo(bx + bw - 10, by + 4); g2.lineTo(bx + bw + 4, by + 4); g2.lineTo(bx + bw + 4, by + 16); g2.stroke();
      glow(g2, bx + bw + 4, by + 34, 18, '#ffcf6a', 0.55);
      cel(g2, rrect(bx + bw - 6, by + 18, 20, 26, 6), { fill: '#ffe48a', shade: '#f0b040', shadeDx: 5, shadeDy: 3, lw: DLW });
      crystalCluster(g2, bx + 18, by + bh + 6, 0.38, VIOLET, { lw: 3.5, n: 3, glowA: 0.4, seed: 4 });
    },
    base: (g2, ww, hh) => { for (const x of [ww * 0.2, ww * 0.82]) { glow(g2, x, hh - 14, 30, CYAN.glow, 0.4); } tuftBase(g2, ww * 0.5, hh - 4, 60, '#5fd6a6', OUTLINE); },
  });
}

export function cavernObstacles() {
  return {
    low, low2, tall, hang, chain, beam, fall, decos, sign,
    hits: { low: { x: -22, y: -60, w: 44, h: 60 }, low2: { x: -58, y: -52, w: 116, h: 52 }, tall: { x: -26, y: -214, w: 52, h: 214 } },
  };
}
