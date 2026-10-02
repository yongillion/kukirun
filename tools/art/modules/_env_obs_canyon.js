// Obstacles — Caramel Canyon: deep-teal gummy cacti with bone-white spines,
// turquoise rock-candy shards, plum spiked balls, silver spikes.
import {
  rng, tone, mix, rgba, OUTLINE, fill, stroke, clipTo, innerShade, innerLight, gloss, glint, glow,
  sparkle, poly, circle, ellipse, rrect, star, linearGrad, lerp, TAU,
  circles, unionPart, cel, shadeU, lightU, groundShadow, candyFlower, candyBall, roundPoly, chunkPts,
} from './_env_kit.js';
import { OLW, DLW, spikeG, spikeRing, spikedBall, shardG, ropeTile, beamTile, signPost, tuftBase } from './_env_obs_kit.js';

const SPINE = { base: '#fff6e4', tip: '#ffffff', dark: 'rgba(170,120,60,0.42)', edge: 'rgba(255,255,255,0.95)', lw: 3.8 };
const SILVER = { base: '#e6ecf4', tip: '#ffffff', dark: 'rgba(60,70,110,0.5)', edge: 'rgba(255,255,255,0.95)' };
const CACT = { fill: '#2f9576', shade: '#1b6450', light: rgba('#8ff0c8', 0.55) };
const TURQ = { light: '#c4fbf0', base: '#3cc6b2', dark: '#1d7f7a', edge: 'rgba(255,255,255,0.9)' };

/** Spines along a closed silhouette given as polyline samples (outward normals). */
function spinesAlong(g, pts, step, len, w, filterFn, R) {
  let acc = step * 0.5;
  for (let i = 1; i < pts.length - 1; i++) {
    acc += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    if (acc < step) continue;
    acc = 0;
    const [px, py] = pts[i];
    if (filterFn && !filterFn(px, py)) continue;
    const dx = pts[i + 1][0] - pts[i - 1][0], dy = pts[i + 1][1] - pts[i - 1][1];
    const a = Math.atan2(-dx, dy) + (R() - 0.5) * 0.2;
    // areole cluster: 1 long + 2 short splayed spines
    spikeG(g, px - Math.cos(a) * 4, py - Math.sin(a) * 4, a - 0.5, len * 0.62, w * 0.8, SPINE);
    spikeG(g, px - Math.cos(a) * 4, py - Math.sin(a) * 4, a + 0.5, len * 0.62, w * 0.8, SPINE);
    spikeG(g, px - Math.cos(a) * 6, py - Math.sin(a) * 6, a, len, w, SPINE);
  }
}
/** Small front areole: white dot with three tiny spines (no arrowheads). */
function areole(g, x, y, s = 1) {
  g.save(); g.lineCap = 'round';
  for (const a of [-2.3, -1.57, -0.85]) {
    g.strokeStyle = OUTLINE; g.lineWidth = 5 * s; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * 11 * s, y + Math.sin(a) * 11 * s); g.stroke();
    g.strokeStyle = '#fff6e4'; g.lineWidth = 2.4 * s; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * 10 * s, y + Math.sin(a) * 10 * s); g.stroke();
  }
  fill(g, circle(x, y, 3.6 * s), '#fff6e4'); stroke(g, circle(x, y, 3.6 * s), 2.2);
  g.restore();
}
function capsulePts(x, y0, y1, r) { // vertical capsule outline (clockwise from bottom-left)
  const pts = [];
  pts.push([x - r, y1]);
  for (let y = y1; y > y0 + r; y -= 4) pts.push([x - r, y]);
  for (let a = Math.PI; a <= TAU + 0.001; a += 0.12) pts.push([x + Math.cos(a) * r, y0 + r + Math.sin(a) * r]);
  for (let y = y0 + r; y < y1; y += 4) pts.push([x + r, y]);
  pts.push([x + r, y1]);
  return pts;
}
function cactusBody(g, shape, ribs) {
  cel(g, shape, { fill: CACT.fill, shade: CACT.shade, shadeDx: 18, shadeDy: 6, light: CACT.light, lightDx: 8, lightDy: 6, lw: OLW });
  clipTo(g, shape, () => {
    g.strokeStyle = rgba('#145040', 0.55); g.lineWidth = 4; g.lineCap = 'round';
    for (const [x0, y0, y1] of ribs) { g.beginPath(); g.moveTo(x0, y0); g.lineTo(x0, y1); g.stroke(); }
    g.strokeStyle = rgba('#a8ffe0', 0.35); g.lineWidth = 3;
    for (const [x0, y0, y1] of ribs) { g.beginPath(); g.moveTo(x0 - 6, y0 + 6); g.lineTo(x0 - 6, y1); g.stroke(); }
  });
}

function low(g, w, h) {
  const R = rng(201);
  const cx = w / 2, base = h - 4;
  groundShadow(g, cx, h - 6, 60, 10, 0.3);
  // squat barrel cactus
  const bw = 46, top = base - 114;
  const pts = [];
  for (let a = Math.PI; a <= TAU + 0.001; a += 0.08) pts.push([cx + Math.cos(a) * bw, top + bw * 0.9 + Math.sin(a) * bw * 0.9]);
  const sil = [[cx - bw, base], [cx - bw, top + bw * 0.9], ...pts, [cx + bw, top + bw * 0.9], [cx + bw, base]];
  const spinePts = [];
  for (let y = base - 10; y > top + bw * 0.9; y -= 4) spinePts.push([cx - bw, y]);
  spinePts.push(...pts);
  for (let y = top + bw * 0.9; y < base - 10; y += 4) spinePts.push([cx + bw, y]);
  spinesAlong(g, spinePts, 30, 30, 16, (x, y) => y < base - 16, R);
  const shape = (c) => { c.moveTo(cx - bw, base + 2); c.lineTo(cx - bw, top + bw * 0.9); c.ellipse(cx, top + bw * 0.9, bw, bw * 0.9, 0, Math.PI, TAU); c.lineTo(cx + bw, base + 2); c.closePath(); };
  cactusBody(g, shape, [[cx - 28, top + 18, base], [cx, top + 4, base], [cx + 28, top + 18, base]]);
  // front spines on the ribs
  for (const [x, y] of [[cx - 28, top + 60], [cx + 2, top + 46], [cx + 28, top + 74], [cx - 2, top + 96]]) areole(g, x, y, 0.85);
  candyFlower(g, cx + 4, top + 2, 15, { petal: '#ff5f9a', centre: '#ffe066', lw: OLW * 0.8, n: 6 });
}
function low2(g, w, h) {
  const cx = w / 2, base = h - 4;
  groundShadow(g, cx, h - 6, 138, 11, 0.3);
  // turquoise rock-candy shards fanning out of a toffee rock
  const shards = [[-108, -2.15, 74, 38], [-70, -1.9, 102, 44], [-26, -1.64, 116, 50], [22, -1.47, 110, 48], [66, -1.26, 96, 44], [106, -1.02, 72, 38], [-2, -1.32, 82, 36]];
  for (const [dx, a, len, sw] of shards) shardG(g, cx + dx * 0.95, base - 22, a, len, sw, TURQ);
  const rock = (c) => { c.moveTo(cx - 140, base + 2); c.bezierCurveTo(cx - 136, base - 36, cx - 70, base - 46, cx, base - 42); c.bezierCurveTo(cx + 70, base - 46, cx + 136, base - 34, cx + 140, base + 2); c.closePath(); };
  cel(g, rock, { fill: '#8a4a26', shade: '#5e2e14', shadeDx: 14, shadeDy: 10, light: rgba('#e09a60', 0.7), lightDx: 6, lightDy: 6, lw: OLW });
  for (const [x, y, r] of [[-80, -18, 8], [-20, -24, 7], [50, -16, 9], [96, -22, 6]]) cel(g, circle(cx + x, base + y, r), { fill: '#f6b54a', shade: '#d98a2a', shadeDx: 3, shadeDy: 3, lw: 3 });
}
function tall(g, w, h) {
  const R = rng(203);
  const cx = w / 2, base = h - 4;
  groundShadow(g, cx, h - 6, 66, 10, 0.3);
  const r = 36, top = 50;
  // arms as capsules: [side, elbowY, armR, uprightH, reach] — compact so spines stay inside the 172px frame
  const arms = [[-1, base - 236, 15, 90, 10], [1, base - 176, 14, 72, 10]];
  const armShapes = [], armSpine = [];
  for (const [dir, y0, ar, ah, reach] of arms) {
    const xo = cx + dir * (r + reach);
    const xa = dir < 0 ? xo - ar : cx;
    const hor = rrect(xa, y0 - ar, (dir < 0 ? cx : xo + ar) - xa, ar * 2, ar);
    const up = rrect(xo - ar, y0 - ah, ar * 2, ah + ar, ar);
    armShapes.push(hor, up);
    const ox = xo + dir * ar;
    for (let y = y0 + 4; y > y0 - ah + ar; y -= 4) armSpine.push([ox, y]);
    for (let a = 0; a <= Math.PI; a += 0.15) armSpine.push([xo + dir * Math.cos(a) * ar, y0 - ah + ar - Math.sin(a) * ar]);
  }
  const trunkPts = capsulePts(cx, top, base, r);
  spinesAlong(g, trunkPts, 36, 34, 16, (x, y) => y < base - 20 && (y < base - 260 || y > base - 160), R);
  for (const [dir, y0, ar, ah] of arms) {
    const xo = cx + dir * (r + arms[0][4]);
    const pts = [];
    for (let y = y0 + 8; y > y0 - ah + ar; y -= 4) pts.push([xo + dir * ar, y]);
    for (let a = 0; a <= Math.PI; a += 0.12) pts.push([xo + dir * Math.cos(a) * ar, y0 - ah + ar - Math.sin(a) * ar]);
    if (dir > 0) pts.reverse();
    spinesAlong(g, dir < 0 ? pts.slice().reverse() : pts, 30, 24, 14, null, R);
  }
  const all = (c) => { c.moveTo(cx - r, base + 2); c.lineTo(cx - r, top + r); c.arc(cx, top + r, r, Math.PI, 0); c.lineTo(cx + r, base + 2); c.closePath(); for (const sh of armShapes) sh(c); };
  stroke(g, all, OLW * 2, OUTLINE);
  fill(g, all, CACT.fill);
  shadeU(g, all, CACT.shade, 16, 6);
  lightU(g, all, CACT.light, 8, 6);
  clipTo(g, all, () => {
    g.strokeStyle = rgba('#145040', 0.55); g.lineWidth = 4; g.lineCap = 'round';
    for (const x of [cx - 18, cx + 2, cx + 22]) { g.beginPath(); g.moveTo(x, top + 22); g.lineTo(x, base); g.stroke(); }
  });
  for (let i = 0; i < 6; i++) areole(g, cx + (i % 2 ? 18 : -16), top + 74 + i * 62, 0.85);
  candyFlower(g, cx + 2, top + 4, 16, { petal: '#ff5f9a', centre: '#ffe066', lw: OLW * 0.8, n: 6 });
}
function hang(g, w, h) {
  const cx = w / 2;
  // rope knot + iron ring
  cel(g, rrect(cx - 10, -6, 20, 40, 8), { fill: '#d8a868', shade: '#a87a3a', shadeDx: 6, shadeDy: 0, lw: OLW });
  const ring = (c) => { c.moveTo(cx + 18, 46); c.ellipse(cx, 46, 18, 14, 0, 0, TAU); c.moveTo(cx + 9, 46); c.ellipse(cx, 46, 9, 6, 0, 0, TAU, true); };
  fill(g, ring, '#c8ced8', 'evenodd'); stroke(g, ring, OLW, OUTLINE);
  const by = 136, r = 50;
  spikeG(g, cx, by + r * 0.7, Math.PI / 2, h - (by + r * 0.7) - 6, 30, SILVER);
  spikedBall(g, cx, by, r, { n: 10, len: 34, w: 26, rot: -Math.PI / 2 + Math.PI / 10, spike: SILVER, ball: '#6a2a7a', ballD: '#3a1048', ballL: rgba('#c47ae0', 0.5), studs: false });
  // iron band
  clipTo(g, circle(cx, by, r), () => { g.fillStyle = '#4a4a5e'; g.fillRect(cx - r, by - 7, r * 2, 14); g.fillStyle = 'rgba(255,255,255,0.4)'; g.fillRect(cx - r, by - 6, r * 2, 3); });
  for (const x of [-30, 0, 30]) cel(g, circle(cx + x, by, 4), { fill: '#e6ecf4', shade: '#9aa4b8', shadeDx: 1, shadeDy: 1, lw: 2.5 });
  stroke(g, circle(cx, by, r), OLW, OUTLINE);
}
function chain(g, w, h) { ropeTile(g, w, h, { base: '#e0b070', dark: '#b07a3a', light: '#fff0c8', width: 22 }); }
function beam(g, w, h) {
  beamTile(g, w, h, {
    n: 8, barH: 96, spike: SILVER,
    drawBar: (g2, W, barH) => {
      const bar = (c) => c.rect(-20, 10, W + 40, barH - 18);
      fill(g2, bar, '#7a4426');
      clipTo(g2, bar, () => {
        g2.strokeStyle = rgba('#4e2814', 0.7); g2.lineWidth = 3;
        for (let x = -32; x < W + 32; x += 16) { g2.beginPath(); g2.moveTo(x, 10); g2.lineTo(x, barH); g2.stroke(); }
        for (let y = 24; y < barH; y += 16) { g2.beginPath(); g2.moveTo(-20, y); g2.lineTo(W + 20, y); g2.stroke(); }
        g2.fillStyle = 'rgba(255,220,180,0.25)'; g2.fillRect(-20, 14, W + 40, 8);
        g2.fillStyle = 'rgba(40,10,0,0.3)'; g2.fillRect(-20, barH - 26, W + 40, 18);
        // iron straps (period 128)
        for (let x = 40; x < W + 128; x += 128) { for (const xx of [x - W, x]) { g2.fillStyle = '#5a5e72'; g2.fillRect(xx - 12, 10, 24, barH); g2.fillStyle = 'rgba(255,255,255,0.35)'; g2.fillRect(xx - 10, 10, 5, barH); } }
      });
      for (let x = 40; x < W + 128; x += 128) for (const xx of [x - W, x]) {
        g2.strokeStyle = OUTLINE; g2.lineWidth = 3; g2.strokeRect(xx - 12, 10, 24, barH - 18);
        for (const yy of [26, barH - 26]) cel(g2, circle(xx, yy, 5), { fill: '#e6ecf4', shade: '#9aa4b8', shadeDx: 2, shadeDy: 2, lw: 2.5 });
      }
      g2.strokeStyle = OUTLINE; g2.lineWidth = OLW; g2.beginPath(); g2.moveTo(-20, 10); g2.lineTo(W + 20, 10); g2.moveTo(-20, barH - 8); g2.lineTo(W + 20, barH - 8); g2.stroke();
    },
  });
}

const decos = [
  [90, 96, (g, w, h) => { // friendly round cactus (dot spines) with flower
    groundShadow(g, w / 2, h - 5, 36, 7, 0.25);
    const sh = (c) => { c.moveTo(w / 2 - 30, h - 3); c.bezierCurveTo(w / 2 - 38, h - 74, w / 2 + 38, h - 74, w / 2 + 30, h - 3); c.closePath(); };
    cel(g, sh, { fill: '#72d6a6', shade: '#47ad80', shadeDx: 10, shadeDy: 6, light: rgba('#d8ffe8', 0.6), lightDx: 5, lightDy: 5, lw: DLW });
    for (const [x, y] of [[-14, -40], [4, -50], [18, -30], [-2, -22], [-20, -18]]) fill(g, circle(w / 2 + x, h + y, 2.4), '#ffffff');
    candyFlower(g, w / 2 + 2, h - 62, 13, { petal: '#ff8fb8', centre: '#ffe37a', lw: DLW * 0.8 });
  }],
  [124, 74, (g, w, h) => { // toffee rock pile
    groundShadow(g, w / 2, h - 5, 54, 7, 0.25);
    for (const [x, y, r, col] of [[-30, -24, 26, '#d9853f'], [28, -22, 24, '#e9a057'], [0, -44, 22, '#c9743a']]) cel(g, ellipse(w / 2 + x, h + y, r * 1.1, r * 0.9), { fill: col, shade: tone(col, -0.22), shadeDx: 8, shadeDy: 6, light: rgba('#ffe7b8', 0.7), lightDx: 4, lightDy: 4, lw: DLW });
  }],
  [96, 84, (g, w, h) => { // desert flowers
    tuftBase(g, w / 2, h - 4, 70, '#9cc96a', OUTLINE);
    for (const [x, y, r, p] of [[-22, -36, 11, '#ff8fb8'], [10, -48, 13, '#ffd36b'], [28, -30, 10, '#ffffff']]) candyFlower(g, w / 2 + x, h + y, r, { petal: p, centre: '#ff9a4a', lw: DLW * 0.8 });
  }],
  [92, 108, (g, w, h) => { // caramel barrel
    groundShadow(g, w / 2, h - 5, 38, 7, 0.25);
    const br = (c) => { c.moveTo(w / 2 - 30, h - 4); c.quadraticCurveTo(w / 2 - 40, h - 52, w / 2 - 30, h - 96); c.lineTo(w / 2 + 30, h - 96); c.quadraticCurveTo(w / 2 + 40, h - 52, w / 2 + 30, h - 4); c.closePath(); };
    cel(g, br, { fill: '#c98a4b', shade: '#9a6230', shadeDx: 12, shadeDy: 0, light: rgba('#ffd9a0', 0.6), lightDx: 5, lightDy: 0, lw: DLW });
    for (const y of [-80, -26]) { cel(g, rrect(w / 2 - 36, h + y, 72, 9, 4), { fill: '#7a7e92', shade: '#55596c', shadeDx: 0, shadeDy: 3, lw: DLW * 0.8 }); }
    const top = ellipse(w / 2, h - 96, 30, 8);
    cel(g, top, { fill: '#ffb84a', shade: '#e08a2a', shadeDx: 0, shadeDy: 3, lw: DLW });
    glint(g, w / 2 - 12, h - 98, 4, 0, 0.9);
  }],
  [96, 62, (g, w, h) => { tuftBase(g, w / 2, h - 4, 84, '#e9c46a', OUTLINE); }],
  [104, 136, (g, w, h) => { // arrow signpost
    cel(g, rrect(w / 2 - 6, h - 96, 12, 94, 5), { fill: '#a8673f', shade: '#7f4a2a', shadeDx: 5, shadeDy: 0, lw: DLW });
    const ar = (c) => { c.moveTo(w / 2 - 44, h - 120); c.lineTo(w / 2 + 26, h - 120); c.lineTo(w / 2 + 46, h - 104); c.lineTo(w / 2 + 26, h - 88); c.lineTo(w / 2 - 44, h - 88); c.closePath(); };
    cel(g, ar, { fill: '#f2c27a', shade: '#d39a50', shadeDx: 6, shadeDy: 5, light: rgba('#fff0d0', 0.6), lightDx: 3, lightDy: 3, lw: DLW });
    for (const x of [-34, 16]) fill(g, circle(w / 2 + x, h - 104, 3), '#7a4a2a');
    tuftBase(g, w / 2, h - 4, 40, '#e9c46a', OUTLINE);
  }],
  [116, 86, (g, w, h) => { // tiny cactus pair (rounded, dot spines)
    groundShadow(g, w / 2, h - 5, 46, 7, 0.25);
    for (const [x, hh, r] of [[-22, 64, 16], [20, 46, 14]]) {
      const sh = rrect(w / 2 + x - r, h - hh, r * 2, hh, r);
      cel(g, sh, { fill: '#7fdcae', shade: '#4fb488', shadeDx: 8, shadeDy: 0, light: rgba('#d8ffe8', 0.6), lightDx: 4, lightDy: 4, lw: DLW });
      for (let k = 0; k < 4; k++) fill(g, circle(w / 2 + x + (k % 2 ? 5 : -5), h - hh + 14 + k * 11, 2.2), '#ffffff');
    }
    candyFlower(g, w / 2 - 22, h - 66, 9, { petal: '#ffd36b', centre: '#ff8fb8', lw: DLW * 0.7 });
  }],
  [156, 96, (g, w, h) => { // boulder with caramel drip
    groundShadow(g, w / 2, h - 5, 68, 8, 0.25);
    const rk = (c) => { c.moveTo(w / 2 - 66, h - 2); c.bezierCurveTo(w / 2 - 72, h - 70, w / 2 - 14, h - 92, w / 2 + 20, h - 84); c.bezierCurveTo(w / 2 + 64, h - 74, w / 2 + 72, h - 30, w / 2 + 66, h - 2); c.closePath(); };
    cel(g, rk, { fill: '#d9853f', shade: '#a85a28', shadeDx: 16, shadeDy: 12, light: rgba('#ffd59a', 0.7), lightDx: 8, lightDy: 8, lw: DLW });
    const dr = (c) => { const x = w / 2 - 10, y = h - 82; c.moveTo(x - 34, y + 6); c.quadraticCurveTo(x, y - 10, x + 34, y + 4); c.quadraticCurveTo(x + 32, y + 16, x + 18, y + 16); c.bezierCurveTo(x + 16, y + 38, x + 4, y + 38, x + 4, y + 16); c.quadraticCurveTo(x - 18, y + 20, x - 34, y + 6); c.closePath(); };
    cel(g, dr, { fill: '#ffbf5a', shade: '#e8902f', shadeDx: 4, shadeDy: 5, lw: DLW });
    glint(g, w / 2 - 26, h - 82, 4, -0.4, 0.9);
  }],
];

function sign(g, w, h) {
  return signPost(g, w, h, {
    post: '#9a5a2e', frame: '#c98a4b', board: '#f6d49a', boardR: 12,
    boardDeco: (g2, bx, by, bw, bh) => {
      // plank seams on the frame + nails
      g2.strokeStyle = rgba('#7a4426', 0.6); g2.lineWidth = 2.5;
      for (const y of [by + bh / 3, by + (2 * bh) / 3]) { g2.beginPath(); g2.moveTo(bx + 2, y); g2.lineTo(bx + 14, y); g2.moveTo(bx + bw - 14, y); g2.lineTo(bx + bw - 2, y); g2.stroke(); }
      for (const [x, y] of [[bx + 7, by + 7], [bx + bw - 7, by + 7], [bx + 7, by + bh - 7], [bx + bw - 7, by + bh - 7]]) cel(g2, circle(x, y, 4), { fill: '#d8dee8', shade: '#9aa4b8', shadeDx: 1, shadeDy: 1, lw: 2.2 });
    },
    base: (g2, ww, hh) => {
      tuftBase(g2, ww * 0.28, hh - 4, 46, '#e9c46a', OUTLINE); tuftBase(g2, ww * 0.72, hh - 4, 50, '#e9c46a', OUTLINE);
      const sh = rrect(ww * 0.5 - 14, hh - 52, 28, 50, 14);
      cel(g2, sh, { fill: '#7fdcae', shade: '#4fb488', shadeDx: 8, shadeDy: 0, lw: DLW });
      for (let k = 0; k < 3; k++) fill(g2, circle(ww * 0.5 + (k % 2 ? 5 : -5), hh - 40 + k * 12, 2.2), '#ffffff');
    },
  });
}

export function canyonObstacles() {
  return { low, low2, tall, hang, chain, beam, decos, sign, hits: { low: { x: -22, y: -56, w: 44, h: 56 }, low2: { x: -58, y: -50, w: 116, h: 50 }, tall: { x: -26, y: -212, w: 52, h: 212 } } };
}
