// Obstacles — Sugar Meadow: crimson-plum brambles & burrs with pale thorn tips.
import {
  rng, tone, mix, rgba, OUTLINE, fill, stroke, clipTo, innerShade, innerLight, gloss, glint, glow,
  sparkle, poly, circle, ellipse, rrect, star, linearGrad, radialGrad, lerp, TAU,
  circles, unionPart, cel, shadeU, lightU, groundShadow, candyFlower, candyBall, lollipop, sprinkle, SPRINKLE_COLS,
} from './_env_kit.js';
import { OLW, DLW, spikeG, spikeRing, spikedBall, vineTile, beamTile, signPost, tuftBase } from './_env_obs_kit.js';

const THORN = { base: '#f6cfdc', tip: '#ffffff', dark: 'rgba(150,40,90,0.45)', edge: 'rgba(255,255,255,0.9)' };
const BRAMBLE = { fill: '#9a2350', shade: '#5e0f30', light: rgba('#ff7aa4', 0.55) };
const LEAF = '#6cc35a';

function leafPair(g, x, y, s = 1) {
  for (const dir of [-1, 1]) {
    const lf = (c) => { c.moveTo(x, y); c.quadraticCurveTo(x + dir * 22 * s, y - 20 * s, x + dir * 40 * s, y - 6 * s); c.quadraticCurveTo(x + dir * 20 * s, y + 8 * s, x, y); c.closePath(); };
    cel(g, lf, { fill: LEAF, shade: '#3f9a45', shadeDx: 5, shadeDy: 5, light: rgba('#e0ffc0', 0.6), lightDx: 2, lightDy: 3, lw: OLW * 0.85 });
    g.strokeStyle = rgba('#2f7a3a', 0.7); g.lineWidth = 2; g.beginPath(); g.moveTo(x + dir * 4 * s, y - 1); g.quadraticCurveTo(x + dir * 20 * s, y - 9 * s, x + dir * 34 * s, y - 6 * s); g.stroke();
  }
}
/** Upper silhouette y(x) of a union of circles (or null outside). */
function topOf(list, x) {
  let best = null;
  for (const [cx, cy, r] of list) { const d = x - cx; if (Math.abs(d) < r) { const y = cy - Math.sqrt(r * r - d * d); if (best === null || y < best) best = y; } }
  return best;
}
/** Bramble mound: union of circles, big pale thorns growing out of the outer
 *  silhouette along its normal, vine curls, glossy berries. */
function brambleMound(g, cx, base, w, h, o = {}) {
  const R = rng(o.seed ?? 11);
  const n = Math.max(3, Math.round(w / 44));
  const list = [];
  for (let i = 0; i < n; i++) {
    const t = n === 1 ? 0.5 : i / (n - 1);
    const arch = Math.sin(t * Math.PI);
    const r = h * (0.36 + 0.2 * arch) * (0.92 + R() * 0.16);
    list.push([cx - w / 2 + r * 0.85 + (w - r * 1.7) * t, base - r * 0.8 - arch * h * 0.22, r]);
  }
  list.push([cx, base - h * 0.34, h * 0.44]);
  const sh = (c) => { circles(list)(c); c.rect(cx - w / 2 + 10, base - h * 0.3, w - 20, h * 0.3 + 2); };
  // thorns along the silhouette (sampled by arc length)
  const x0 = Math.min(...list.map(([x, , r]) => x - r)) + 4, x1 = Math.max(...list.map(([x, , r]) => x + r)) - 4;
  const pts = [];
  for (let x = x0; x <= x1; x += 2) { const y = topOf(list, x); if (y !== null) pts.push([x, y]); }
  const step = o.step ?? 30;
  let acc = step * 0.5;
  for (let i = 1; i < pts.length - 1; i++) {
    acc += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    if (acc < step) continue;
    acc = 0;
    const [px, py] = pts[i];
    if (py > base - 16) continue;
    const dx = pts[i + 1][0] - pts[i - 1][0], dy = pts[i + 1][1] - pts[i - 1][1];
    let a = Math.atan2(-dx, dy); // outward normal of the upper silhouette
    if (Math.sin(a) > 0) a = -a;
    a += (R() - 0.5) * 0.2;
    spikeG(g, px - Math.cos(a) * 8, py - Math.sin(a) * 8, a, (o.tl ?? 30) + R() * 6, (o.tw ?? 22) + R() * 3, THORN);
  }
  unionPart(g, sh, { fill: BRAMBLE.fill, shade: BRAMBLE.shade, shadeDx: h * 0.12, shadeDy: h * 0.16, light: BRAMBLE.light, lightDx: h * 0.07, lightDy: h * 0.08, lw: OLW });
  // vine curls & a few small leaves inside
  g.save(); g.strokeStyle = rgba('#4a0a26', 0.55); g.lineWidth = 4; g.lineCap = 'round';
  for (const [x, y, r] of list.slice(0, n)) { g.beginPath(); g.arc(x, y + r * 0.1, r * 0.55, -2.7, -0.5); g.stroke(); }
  g.restore();
  for (const [x, y, r] of list.slice(0, n)) {
    const lx = x + r * 0.15, ly = y + r * 0.35;
    const lf = (c) => { c.moveTo(lx, ly); c.quadraticCurveTo(lx + 10, ly - 12, lx + 22, ly - 6); c.quadraticCurveTo(lx + 10, ly + 4, lx, ly); c.closePath(); };
    cel(g, lf, { fill: '#5aa84a', shade: '#3a7a36', shadeDx: 3, shadeDy: 3, lw: OLW * 0.7 });
  }
  if (o.berries) for (let i = 0; i < o.berries; i++) {
    const c0 = list[i % n];
    candyBall(g, c0[0] - c0[2] * 0.3, c0[1] - c0[2] * 0.05, 7, '#ff2e5a', { lw: 3.5 });
    candyBall(g, c0[0] - c0[2] * 0.3 + 10, c0[1] + 5, 6, '#ff2e5a', { lw: 3.5 });
  }
  return list;
}

// ---------------------------------------------------------------------------
function low(g, w, h) {
  groundShadow(g, w / 2, h - 6, 62, 10, 0.3);
  brambleMound(g, w / 2, h - 6, 88, 84, { seed: 21, berries: 1, tl: 35, tw: 26, step: 21 });
  leafPair(g, w / 2, h - 8, 0.9);
}
function low2(g, w, h) {
  groundShadow(g, w / 2, h - 6, 140, 11, 0.3);
  brambleMound(g, w / 2, h - 6, 226, 72, { seed: 33, berries: 3, tl: 34, tw: 26, step: 22 });
  leafPair(g, w * 0.3, h - 8, 0.8); leafPair(g, w * 0.72, h - 8, 0.8);
}
function tall(g, w, h) {
  const cx = w / 2;
  groundShadow(g, cx, h - 6, 64, 10, 0.3);
  // twisted thorny vine trunk
  const top = 96;
  const trunk = (c) => {
    c.moveTo(cx - 38, h - 2);
    c.bezierCurveTo(cx - 30, h - 120, cx - 44, h - 240, cx - 30, top + 40);
    c.quadraticCurveTo(cx - 24, top + 10, cx, top + 6);
    c.quadraticCurveTo(cx + 24, top + 10, cx + 30, top + 40);
    c.bezierCurveTo(cx + 44, h - 240, cx + 30, h - 120, cx + 38, h - 2);
    c.closePath();
  };
  // side thorns (behind)
  for (let i = 0; i < 9; i++) {
    const y = top + 50 + i * 36;
    const s = i % 2 ? 1 : -1;
    spikeG(g, cx + s * 30, y, s > 0 ? -0.3 : Math.PI + 0.3, 44, 28, THORN);
    spikeG(g, cx - s * 30, y + 18, s > 0 ? Math.PI + 0.12 : -0.12, 32, 22, THORN);
  }
  cel(g, trunk, { fill: '#7a2a52', shade: '#4e1234', shadeDx: 18, shadeDy: 0, light: rgba('#e070a0', 0.5), lightDx: 6, lightDy: 0, lw: OLW });
  clipTo(g, trunk, () => {
    g.strokeStyle = rgba('#3a0820', 0.5); g.lineWidth = 5; g.lineCap = 'round';
    for (let y = top + 30; y < h; y += 44) { g.beginPath(); g.moveTo(cx - 40, y); g.quadraticCurveTo(cx, y + 22, cx + 40, y + 6); g.stroke(); }
    g.strokeStyle = rgba('#ff9cc2', 0.35); g.lineWidth = 3;
    for (let y = top + 34; y < h; y += 44) { g.beginPath(); g.moveTo(cx - 34, y - 4); g.quadraticCurveTo(cx - 10, y + 6, cx + 6, y + 10); g.stroke(); }
  });
  // leafy vine wraps around the trunk
  for (let i = 0; i < 3; i++) {
    const y = top + 120 + i * 110;
    const lf = (c) => { c.moveTo(cx - 8, y); c.quadraticCurveTo(cx + 10, y - 20, cx + 30, y - 10); c.quadraticCurveTo(cx + 12, y + 4, cx - 8, y); c.closePath(); };
    cel(g, lf, { fill: LEAF, shade: '#3f9a45', shadeDx: 4, shadeDy: 4, light: rgba('#e0ffc0', 0.6), lightDx: 2, lightDy: 2, lw: OLW * 0.8 });
  }
  // spiky thistle head
  const hy = top - 6;
  spikeRing(g, cx, hy, 40, 11, 30, 20, { ...THORN, base: '#ecd6ff', dark: 'rgba(100,40,150,0.45)' }, -Math.PI / 2, (i) => i >= 4 && i <= 6);
  const head = circle(cx, hy, 40);
  cel(g, head, { fill: '#9a46c8', shade: '#5e2288', shadeDx: 12, shadeDy: 12, light: rgba('#e2b8ff', 0.6), lightDx: 6, lightDy: 6, lw: OLW });
  clipTo(g, head, () => { g.strokeStyle = rgba('#4a1470', 0.45); g.lineWidth = 3; for (let k = -2; k <= 2; k++) { g.beginPath(); g.moveTo(cx + k * 14 - 20, hy - 40); g.lineTo(cx + k * 14 + 20, hy + 40); g.stroke(); g.beginPath(); g.moveTo(cx + k * 14 + 20, hy - 40); g.lineTo(cx + k * 14 - 20, hy + 40); g.stroke(); } });
  glint(g, cx - 16, hy - 16, 6, -0.6, 0.9);
  leafPair(g, cx, hy + 40, 0.95);
  leafPair(g, cx, h - 8, 1.0);
}
function hang(g, w, h) {
  const cx = w / 2;
  // vine knot at the top (connects to the chain tile)
  const knot = (c) => { c.moveTo(cx - 14, -4); c.lineTo(cx + 14, -4); c.lineTo(cx + 12, 40); c.quadraticCurveTo(cx, 52, cx - 12, 40); c.closePath(); };
  cel(g, knot, { fill: '#4f9a3c', shade: '#2f7030', shadeDx: 8, shadeDy: 0, lw: OLW });
  // the burr
  const by = 134, r = 52;
  const stem = (c) => { c.moveTo(cx - 8, 30); c.quadraticCurveTo(cx - 14, 60, cx - 4, by - r + 10); c.lineTo(cx + 8, by - r + 10); c.quadraticCurveTo(cx - 2, 60, cx + 8, 30); c.closePath(); };
  cel(g, stem, { fill: '#56a040', shade: '#2f7030', shadeDx: 5, shadeDy: 0, lw: OLW });
  leafPair(g, cx, 40, 0.85);
  spikeG(g, cx, by + r * 0.7, Math.PI / 2, h - (by + r * 0.7) - 6, 30, THORN); // long bottom thorn -> tip at the anchor
  spikedBall(g, cx, by, r, { n: 12, len: 32, w: 24, rot: -Math.PI / 2 + Math.PI / 12, spike: THORN, ball: '#a8244f', ballD: '#640c30', ballL: rgba('#ff86ae', 0.5), studs: false });
  g.save(); g.strokeStyle = rgba('#4a0a26', 0.55); g.lineWidth = 4; g.lineCap = 'round'; g.beginPath(); g.arc(cx + 4, by + 6, r * 0.55, -2.6, -0.4); g.stroke(); g.restore();
}
function chain(g, w, h) { vineTile(g, w, h, { base: '#56a040', leaf: LEAF, amp: 9, thorns: THORN }); }
function beam(g, w, h) {
  beamTile(g, w, h, {
    n: 8, barH: 98, spike: THORN,
    drawBar: (g2, W, barH) => {
      const bar = (c) => c.rect(-20, 8, W + 40, barH - 16);
      fill(g2, bar, '#fff4f4');
      clipTo(g2, bar, () => {
        // diagonal candy stripes (period 64 → tiles at 256)
        g2.fillStyle = '#e8304e';
        for (let x = -128; x < W + 128; x += 64) { g2.beginPath(); g2.moveTo(x, 8); g2.lineTo(x + 30, 8); g2.lineTo(x + 30 + 50, barH - 8); g2.lineTo(x + 50, barH - 8); g2.closePath(); g2.fill(); }
        g2.fillStyle = 'rgba(255,255,255,0.55)'; g2.fillRect(-20, 18, W + 40, 10);
        g2.fillStyle = 'rgba(120,0,30,0.28)'; g2.fillRect(-20, barH - 30, W + 40, 22);
      });
      g2.strokeStyle = OUTLINE; g2.lineWidth = OLW; g2.beginPath(); g2.moveTo(-20, 8); g2.lineTo(W + 20, 8); g2.moveTo(-20, barH - 8); g2.lineTo(W + 20, barH - 8); g2.stroke();
      // dark vine wrapping (period 128)
      for (let x = -128; x < W + 128; x += 128) {
        const v = (c) => { c.moveTo(x, barH - 2); c.bezierCurveTo(x + 30, barH - 2, x + 34, 2, x + 64, 2); c.lineTo(x + 64, 14); c.bezierCurveTo(x + 40, 14, x + 40, barH + 10, x, barH + 10); c.closePath(); };
        cel(g2, v, { fill: '#7a2a52', shade: '#4e1234', shadeDx: 0, shadeDy: 5, lw: OLW * 0.85 });
        const lf = (c) => { const lx = x + 64, ly = 6; c.moveTo(lx, ly); c.quadraticCurveTo(lx + 14, ly - 16, lx + 30, ly - 8); c.quadraticCurveTo(lx + 16, ly + 4, lx, ly); c.closePath(); };
        cel(g2, lf, { fill: LEAF, shade: '#3f9a45', shadeDx: 4, shadeDy: 4, lw: OLW * 0.8 });
      }
    },
  });
}

// ---------------------------------------------------------------------------
// Decos (harmless: round shapes, soft colours)
// ---------------------------------------------------------------------------
const decos = [
  [74, 112, (g, w, h) => { // pink candy flower on a stem
    tuftBase(g, w / 2, h - 4, 50, '#7ad36f', OUTLINE);
    const st = (c) => { c.moveTo(w / 2 - 3, h - 8); c.quadraticCurveTo(w / 2 + 8, h - 50, w / 2, h - 74); c.lineTo(w / 2 + 5, h - 74); c.quadraticCurveTo(w / 2 + 13, h - 50, w / 2 + 3, h - 8); c.closePath(); };
    cel(g, st, { fill: '#5fbf55', shade: '#3f9a45', shadeDx: 3, shadeDy: 0, lw: DLW });
    candyFlower(g, w / 2 + 2, h - 82, 24, { petal: '#ff9cc2', centre: '#ffe066', lw: DLW, n: 6 });
  }],
  [100, 92, (g, w, h) => { // marshmallow mushroom
    groundShadow(g, w / 2, h - 5, 40, 7, 0.25);
    cel(g, rrect(w / 2 - 13, h - 46, 26, 44, 12), { fill: '#fff6ea', shade: '#ead8c0', shadeDx: 8, shadeDy: 0, lw: DLW });
    const cap = (c) => { c.moveTo(w / 2 - 44, h - 40); c.bezierCurveTo(w / 2 - 44, h - 92, w / 2 + 44, h - 92, w / 2 + 44, h - 40); c.quadraticCurveTo(w / 2, h - 30, w / 2 - 44, h - 40); c.closePath(); };
    cel(g, cap, { fill: '#ff8fbe', shade: '#e2649a', shadeDx: 12, shadeDy: 8, light: rgba('#ffd6e8', 0.8), lightDx: 6, lightDy: 5, lw: DLW });
    for (const [x, y, r] of [[-20, -62, 7], [8, -72, 6], [22, -54, 5], [-4, -52, 4]]) fill(g, circle(w / 2 + x, h + y, r), '#fff6fb');
    glint(g, w / 2 - 26, h - 66, 4, -0.6, 0.9);
  }],
  [132, 74, (g, w, h) => { // gumdrop trio
    groundShadow(g, w / 2, h - 5, 60, 7, 0.25);
    for (const [x, r, col] of [[-36, 22, '#ffd36b'], [36, 22, '#9be7ff'], [0, 28, '#ff8fb8']]) {
      const gx = w / 2 + x, gy = h - 4;
      const gd = (c) => { c.moveTo(gx - r, gy); c.bezierCurveTo(gx - r, gy - r * 2, gx + r, gy - r * 2, gx + r, gy); c.quadraticCurveTo(gx, gy + 4, gx - r, gy); c.closePath(); };
      cel(g, gd, { fill: col, shade: tone(col, -0.2), shadeDx: r * 0.35, shadeDy: r * 0.2, light: rgba('#ffffff', 0.5), lightDx: r * 0.15, lightDy: r * 0.15, lw: DLW });
      for (let k = 0; k < 6; k++) fill(g, circle(gx + (k % 3 - 1) * r * 0.45, gy - r * 0.4 - Math.floor(k / 3) * r * 0.45, 2), 'rgba(255,255,255,0.85)');
      glint(g, gx - r * 0.4, gy - r * 1.05, r * 0.16, -0.7, 0.85);
    }
  }],
  [76, 150, (g, w, h) => { // small swirl lollipop
    tuftBase(g, w / 2, h - 4, 46, '#7ad36f', OUTLINE);
    lollipop(g, w / 2, h - 6, 100, 30, { a: '#b69cff', b: '#ffffff', lw: DLW, turns: 1.2, rot: 0.6, ribbon: '#ff6f9a', stickW: 7 });
  }],
  [104, 62, (g, w, h) => { // clover tuft with tiny flowers
    tuftBase(g, w / 2, h - 4, 90, '#76d06a', OUTLINE);
    for (const [x, y] of [[-24, -24], [6, -32], [30, -22]]) {
      const lf = circles([[w / 2 + x - 6, h + y, 8], [w / 2 + x + 6, h + y, 8], [w / 2 + x, h + y - 9, 8]]);
      unionPart(g, lf, { fill: '#8fe07a', shade: '#5fbf55', shadeDx: 3, shadeDy: 3, lw: DLW * 0.6 });
    }
    candyFlower(g, w / 2 - 36, h - 34, 9, { petal: '#ffffff', centre: '#ffd54a', lw: 3 });
    candyFlower(g, w / 2 + 40, h - 30, 8, { petal: '#ffffff', centre: '#ffd54a', lw: 3 });
  }],
  [114, 72, (g, w, h) => { // cookie-crumb rock
    groundShadow(g, w / 2, h - 5, 50, 7, 0.25);
    const rk = (c) => { c.moveTo(w / 2 - 50, h - 2); c.bezierCurveTo(w / 2 - 54, h - 50, w / 2 - 10, h - 66, w / 2 + 16, h - 58); c.bezierCurveTo(w / 2 + 50, h - 50, w / 2 + 54, h - 20, w / 2 + 50, h - 2); c.closePath(); };
    cel(g, rk, { fill: '#e0a560', shade: '#b8783c', shadeDx: 12, shadeDy: 10, light: rgba('#ffe2b4', 0.8), lightDx: 6, lightDy: 6, lw: DLW });
    for (const [x, y, r] of [[-18, -34, 7], [10, -40, 6], [24, -20, 7], [-30, -16, 5]]) cel(g, circle(w / 2 + x, h + y, r), { fill: '#7a4a2a', shade: '#53301a', shadeDx: 2, shadeDy: 2, lw: 3 });
  }],
  [96, 122, (g, w, h) => { // tulip pair
    tuftBase(g, w / 2, h - 4, 64, '#7ad36f', OUTLINE);
    for (const [x, hh, col] of [[-16, 80, '#ff6f9a'], [18, 64, '#ffd54a']]) {
      const sx = w / 2 + x;
      cel(g, rrect(sx - 3, h - hh, 6, hh - 4, 3), { fill: '#5fbf55', shade: '#3f9a45', shadeDx: 3, shadeDy: 0, lw: DLW * 0.8 });
      const tp = (c) => { c.moveTo(sx - 16, h - hh - 24); c.lineTo(sx - 8, h - hh - 14); c.lineTo(sx, h - hh - 26); c.lineTo(sx + 8, h - hh - 14); c.lineTo(sx + 16, h - hh - 24); c.quadraticCurveTo(sx + 18, h - hh + 6, sx, h - hh + 6); c.quadraticCurveTo(sx - 18, h - hh + 6, sx - 16, h - hh - 24); c.closePath(); };
      cel(g, tp, { fill: col, shade: tone(col, -0.2), shadeDx: 6, shadeDy: 4, light: rgba('#ffffff', 0.4), lightDx: 3, lightDy: 3, lw: DLW });
    }
  }],
  [176, 102, (g, w, h) => { // round bush with berries
    groundShadow(g, w / 2, h - 5, 80, 8, 0.25);
    const list = [[w / 2 - 44, h - 36, 32], [w / 2 + 40, h - 34, 34], [w / 2, h - 56, 40]];
    const sh = (c) => { circles(list)(c); c.rect(w / 2 - 70, h - 36, 140, 34); };
    unionPart(g, sh, { fill: '#62c058', shade: '#3f9a45', shadeDx: 12, shadeDy: 12, light: rgba('#dcffb8', 0.55), lightDx: 6, lightDy: 6, lw: DLW });
    for (const [x, y] of [[-30, -50], [20, -64], [44, -36], [-8, -30]]) { candyBall(g, w / 2 + x, h + y, 6, '#ff5f7e', { lw: 3 }); candyBall(g, w / 2 + x + 9, h + y + 4, 5, '#ff5f7e', { lw: 3 }); }
  }],
];

function sign(g, w, h) {
  return signPost(g, w, h, {
    post: '#b5672b', frame: '#f2c27a', board: '#fff3d6',
    postDeco: (g2, px, y0, hh) => { for (let y = y0 + 6; y < hh - 16; y += 18) { fill(g2, ellipse(px - 4, y, 2.5, 1.6), '#fff8ec'); fill(g2, ellipse(px + 4, y + 9, 2.5, 1.6), '#fff8ec'); } },
    boardDeco: (g2, bx, by, bw, bh) => {
      // wafer grid on the frame
      g2.save(); g2.beginPath(); rrect(bx, by, bw, bh, 22)(g2); rrect(bx + 14, by + 14, bw - 28, bh - 28, 14)(g2); g2.clip('evenodd');
      g2.strokeStyle = rgba('#c98a4b', 0.6); g2.lineWidth = 2;
      for (let x = bx - bh; x < bx + bw + bh; x += 12) { g2.beginPath(); g2.moveTo(x, by); g2.lineTo(x + bh, by + bh); g2.stroke(); g2.beginPath(); g2.moveTo(x + bh, by); g2.lineTo(x, by + bh); g2.stroke(); }
      g2.restore();
      stroke(g2, rrect(bx + 14, by + 14, bw - 28, bh - 28, 14), DLW * 0.8);
      candyFlower(g2, bx + 10, by + 10, 16, { petal: '#ff9cc2', centre: '#ffe066', lw: DLW, n: 6 });
      candyFlower(g2, bx + bw - 12, by + bh - 6, 12, { petal: '#ffffff', centre: '#ffd54a', lw: DLW });
    },
    base: (g2, ww, hh) => { tuftBase(g2, ww * 0.28, hh - 4, 50, '#7ad36f', OUTLINE); tuftBase(g2, ww * 0.72, hh - 4, 56, '#7ad36f', OUTLINE); candyFlower(g2, ww * 0.5, hh - 16, 10, { petal: '#ffb3d1', centre: '#ffd54a', lw: 3 }); },
  });
}

export function meadowObstacles() {
  return { low, low2, tall, hang, chain, beam, decos, sign, hits: { low: { x: -22, y: -56, w: 44, h: 56 }, low2: { x: -58, y: -50, w: 116, h: 50 } } };
}
