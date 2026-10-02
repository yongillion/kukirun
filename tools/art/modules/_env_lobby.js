// =============================================================================
//  Lobby scene — cosy candy-village hill at golden hour (1600×720, scale 1).
//  Calm zone (x 300–900, y 380–620) keeps only soft gradients: the selected
//  runner stands there on a round stage at (600, 600).
// =============================================================================
import {
  rng, tone, mix, rgba, OUTLINE, fill, stroke, clipTo, innerShade, innerLight, gloss, glint, glow,
  sparkle, poly, circle, ellipse, rrect, star, linearGrad, radialGrad, lerp, clamp, TAU,
  circles, unionPart, cel, sprinkle, lollipop, candyFlower, candyBall, puffCloud, shadeU, lightU,
  SPRINKLE_COLS,
} from './_env_kit.js';
import { catmull, ySampler, humpPts } from './_env_util.js';
import { puffTree, bush, frostMountain } from './_env_meadow.js';

const HAZE = '#ffd9b8';

function hill(g, pts, bottom, o) {
  const sh = (c) => { poly(pts, false)(c); c.lineTo(pts[pts.length - 1][0], bottom); c.lineTo(pts[0][0], bottom); c.closePath(); };
  if (o.lw) stroke(g, sh, o.lw * 2, o.outline);
  fill(g, sh, linearGrad(g, 0, o.y0, 0, o.y1, o.stops));
  if (o.shade) innerShade(g, sh, o.shade, o.sdx ?? 40, o.sdy ?? 8);
  if (o.rim) innerLight(g, sh, o.rim, o.rdx ?? 0, o.rdy ?? 4);
  return sh;
}

function bunting(g, x0, y0, x1, y1, sag, o) {
  const n = Math.round(Math.hypot(x1 - x0, y1 - y0) / 34);
  const P = (t) => [lerp(x0, x1, t), lerp(y0, y1, t) + sag * 4 * t * (1 - t)];
  g.strokeStyle = o.outline; g.lineWidth = 2.2; g.lineCap = 'round';
  g.beginPath(); for (let i = 0; i <= 40; i++) { const [x, y] = P(i / 40); if (i === 0) g.moveTo(x, y); else g.lineTo(x, y); } g.stroke();
  const cols = ['#ff7eb6', '#ffd55a', '#7fd8ff', '#9be27a', '#c49cff', '#ffa45c'];
  for (let i = 1; i < n; i++) {
    const t = i / n, [x, y] = P(t), [xa, ya] = P(t - 0.35 / n), [xb, yb] = P(t + 0.35 / n);
    const col = cols[i % cols.length];
    const fl = poly([[xa, ya], [xb, yb], [x + 1, y + 22]]);
    cel(g, fl, { fill: col, shade: tone(col, -0.18), shadeDx: 4, shadeDy: 2, light: rgba('#ffffff', 0.4), lightDx: 2, lightDy: 2, lw: 2, outline: o.outline });
  }
}

function bakery(g, x, base, o) {
  const lw = o.lw, oc = o.outline;
  const w = 250, h = 150;
  // chimney: macaron stack (behind roof)
  const cx = x + 62, cyb = base - h - 70;
  for (let i = 0; i < 3; i++) {
    const col = ['#ffb3d1', '#b8f0c8', '#ffe08a'][i];
    const my = cyb - i * 22;
    const mac = rrect(cx - 22, my - 16, 44, 18, 9);
    cel(g, mac, { fill: col, shade: tone(col, -0.18), shadeDx: 6, shadeDy: 3, light: rgba('#ffffff', 0.5), lightDx: 3, lightDy: 2, lw, outline: oc });
    cel(g, rrect(cx - 20, my, 40, 5, 2.5), { fill: '#fff8ee', shade: '#efe0cc', shadeDx: 0, shadeDy: 2, lw: lw * 0.8, outline: oc });
  }
  // smoke puffs
  for (const [dx, dy, r] of [[0, -96, 13], [16, -120, 16], [8, -150, 20], [30, -180, 15]]) {
    const sh = circle(cx + dx, cyb + dy, r);
    fill(g, sh, rgba('#ffffff', 0.8)); innerShade(g, sh, rgba('#f0c8d8', 0.6), 4, 5);
  }
  // walls
  const wall = rrect(x - w / 2, base - h, w, h + 6, 14);
  cel(g, wall, { fill: '#fff1d8', shade: '#f1d2a8', shadeDx: 26, shadeDy: 8, light: rgba('#ffffff', 0.6), lightDx: 6, lightDy: 4, lw, outline: oc });
  // pink frosting drips under the roof
  const fy = base - h;
  const drip = (c) => {
    c.moveTo(x - w / 2 + 2, fy - 2); c.lineTo(x + w / 2 - 2, fy - 2); c.lineTo(x + w / 2 - 2, fy + 10);
    const n = 9;
    for (let i = 0; i < n; i++) {
      const xa = x + w / 2 - 2 - (i * (w - 4)) / n, xb = x + w / 2 - 2 - ((i + 1) * (w - 4)) / n, m = (xa + xb) / 2;
      const d = i % 3 === 1 ? 26 : 12;
      c.quadraticCurveTo(xa - 3, fy + 12, m + 6, fy + 12); c.bezierCurveTo(m + 6, fy + d, m - 6, fy + d, m - 6, fy + 12); c.quadraticCurveTo(xb + 3, fy + 12, xb, fy + 10);
    }
    c.lineTo(x - w / 2 + 2, fy - 2); c.closePath();
  };
  cel(g, drip, { fill: '#ffb3d1', shade: '#f08ab4', shadeDx: 3, shadeDy: 4, lw, outline: oc });
  // roof
  const rw = w / 2 + 26, rt = fy - 118;
  const roof = (c) => { c.moveTo(x - rw, fy + 4); c.quadraticCurveTo(x - rw * 0.55, fy - 52, x - 10, rt + 4); c.quadraticCurveTo(x, rt - 4, x + 10, rt + 4); c.quadraticCurveTo(x + rw * 0.55, fy - 52, x + rw, fy + 4); c.quadraticCurveTo(x, fy - 10, x - rw, fy + 4); c.closePath(); };
  cel(g, roof, { fill: '#ff8fbe', shade: '#e2649a', shadeDx: 30, shadeDy: 6, light: rgba('#ffd6e8', 0.85), lightDx: 8, lightDy: 6, lw, outline: oc });
  // roof scallop shingles + sprinkles
  clipTo(g, roof, () => {
    g.strokeStyle = rgba('#d65a8e', 0.55); g.lineWidth = 2;
    for (let row = 0; row < 5; row++) {
      const yy = fy - 14 - row * 22;
      for (let k = -8; k <= 8; k++) { const sx = x + k * 26 + (row % 2) * 13; g.beginPath(); g.arc(sx, yy, 13, 0.1, Math.PI - 0.1); g.stroke(); }
    }
    const Rr = rng(77);
    for (let i = 0; i < 26; i++) sprinkle(g, x + (Rr() - 0.5) * rw * 1.6, fy - 10 - Rr() * 100, 9, 3.4, Rr() * TAU, SPRINKLE_COLS[Math.floor(Rr() * 6)], rgba(OUTLINE, 0.5));
  });
  // cherry on the roof tip
  candyBall(g, x + 2, rt - 6, 11, '#ff4f6e', { lw, outline: oc });
  g.strokeStyle = oc; g.lineWidth = lw; g.beginPath(); g.moveTo(x + 4, rt - 16); g.quadraticCurveTo(x + 10, rt - 30, x + 20, rt - 32); g.stroke();
  // round window with warm light
  const wx = x - 60, wy = base - 84;
  glow(g, wx, wy, 60, '#ffdb7a', 0.5);
  cel(g, circle(wx, wy, 32), { fill: '#ffe9a0', shade: '#f6c45c', shadeDx: 8, shadeDy: 8, lw, outline: oc });
  g.strokeStyle = oc; g.lineWidth = lw * 0.9; g.beginPath(); g.moveTo(wx - 32, wy); g.lineTo(wx + 32, wy); g.moveTo(wx, wy - 32); g.lineTo(wx, wy + 32); g.stroke();
  glint(g, wx - 14, wy - 14, 5, -0.6, 0.9);
  // striped awning over the window
  const aw = (c) => { c.moveTo(wx - 46, wy - 44); c.lineTo(wx + 46, wy - 44); c.lineTo(wx + 52, wy - 22); for (let k = 0; k < 6; k++) { const a0 = wx + 52 - k * (104 / 6), a1 = wx + 52 - (k + 1) * (104 / 6); c.quadraticCurveTo((a0 + a1) / 2, wy - 8, a1, wy - 22); } c.closePath(); };
  cel(g, aw, { fill: '#ffffff', shade: '#f0dde8', shadeDx: 0, shadeDy: 4, lw, outline: oc });
  clipTo(g, aw, () => { g.fillStyle = '#ff7eb6'; for (let k = 0; k < 6; k += 2) { const a0 = wx - 52 + k * (104 / 6); g.beginPath(); g.moveTo(a0 + 4, wy - 46); g.lineTo(a0 + 104 / 6 + 4, wy - 46); g.lineTo(a0 + 104 / 6, wy - 8); g.lineTo(a0, wy - 8); g.closePath(); g.fill(); } });
  // flower box
  cel(g, rrect(wx - 36, wy + 36, 72, 14, 5), { fill: '#a8673f', shade: '#7f4a2a', shadeDx: 0, shadeDy: 4, lw, outline: oc });
  for (let k = 0; k < 4; k++) candyFlower(g, wx - 27 + k * 18, wy + 32, 8, { petal: ['#ff9cc2', '#ffffff', '#ffd54a', '#b69cff'][k], centre: '#ffd54a', lw: 1.8, outline: oc });
  // chocolate-bar door
  const dx = x + 46, dw = 64, dh = 98;
  const door = (c) => { c.moveTo(dx - dw / 2, base + 4); c.lineTo(dx - dw / 2, base - dh + dw / 2); c.arc(dx, base - dh + dw / 2, dw / 2, Math.PI, 0); c.lineTo(dx + dw / 2, base + 4); c.closePath(); };
  cel(g, door, { fill: '#8a4f2c', shade: '#64361c', shadeDx: 12, shadeDy: 4, light: rgba('#c0804e', 0.8), lightDx: 4, lightDy: 4, lw, outline: oc });
  clipTo(g, door, () => {
    g.strokeStyle = rgba('#4a2a1a', 0.6); g.lineWidth = 2.5;
    for (const yy of [base - 66, base - 34]) { g.beginPath(); g.moveTo(dx - dw, yy); g.lineTo(dx + dw, yy); g.stroke(); }
    g.beginPath(); g.moveTo(dx, base - dh + 10); g.lineTo(dx, base + 6); g.stroke();
    g.strokeStyle = rgba('#d49a6a', 0.5); g.lineWidth = 2;
    for (const yy of [base - 64, base - 32]) { g.beginPath(); g.moveTo(dx - dw, yy); g.lineTo(dx + dw, yy); g.stroke(); }
  });
  candyBall(g, dx + 20, base - 42, 4.5, '#ffd55a', { lw: 2, outline: oc });
  // hanging sign (cupcake icon, no text)
  const sx = x + 128, sy = base - 112;
  g.strokeStyle = oc; g.lineWidth = lw; g.beginPath(); g.moveTo(x + w / 2 - 4, sy - 26); g.lineTo(sx + 26, sy - 26); g.moveTo(sx - 6, sy - 26); g.lineTo(sx - 6, sy - 18); g.moveTo(sx + 18, sy - 26); g.lineTo(sx + 18, sy - 18); g.stroke();
  const board = circle(sx + 6, sy + 6, 26);
  cel(g, board, { fill: '#ffe7b0', shade: '#e9c27a', shadeDx: 6, shadeDy: 6, lw, outline: oc });
  // cupcake icon
  const cup = poly([[sx - 6, sy + 10], [sx + 18, sy + 10], [sx + 14, sy + 24], [sx - 2, sy + 24]]);
  cel(g, cup, { fill: '#7fd8c8', shade: '#55b8a8', shadeDx: 3, shadeDy: 0, lw: 2, outline: oc });
  const fr = circles([[sx + 6, sy + 2, 9], [sx - 2, sy + 7, 6], [sx + 14, sy + 7, 6]]);
  unionPart(g, fr, { fill: '#ff9cc2', shade: '#e8679b', shadeDx: 3, shadeDy: 3, lw: 1, outline: oc });
  candyBall(g, sx + 6, sy - 8, 3.5, '#ff4f6e', { lw: 1.6, outline: oc });
}

function mintHouse(g, x, base, o) {
  const lw = o.lw, oc = o.outline;
  const w = 150, h = 110;
  const wall = rrect(x - w / 2, base - h, w, h + 6, 12);
  cel(g, wall, { fill: '#c8f2e2', shade: '#96d8c0', shadeDx: 18, shadeDy: 6, light: rgba('#ffffff', 0.55), lightDx: 5, lightDy: 4, lw, outline: oc });
  const fy = base - h;
  const rw = w / 2 + 18;
  const roof = (c) => { c.moveTo(x - rw, fy + 6); c.lineTo(x, fy - 78); c.lineTo(x + rw, fy + 6); c.quadraticCurveTo(x, fy - 4, x - rw, fy + 6); c.closePath(); };
  cel(g, roof, { fill: '#8a5232', shade: '#64381e', shadeDx: 22, shadeDy: 4, light: rgba('#c0845a', 0.8), lightDx: 6, lightDy: 5, lw, outline: oc });
  // white icing drip along the eave
  const ic = (c) => { c.moveTo(x - rw + 6, fy); c.lineTo(x + rw - 6, fy); c.lineTo(x + rw - 6, fy + 6); for (let k = 0; k < 7; k++) { const a = x + rw - 6 - k * ((2 * rw - 12) / 7), b2 = a - (2 * rw - 12) / 7, m = (a + b2) / 2, d = k % 2 ? 18 : 9; c.quadraticCurveTo(a - 2, fy + 8, m + 5, fy + 8); c.bezierCurveTo(m + 5, fy + d, m - 5, fy + d, m - 5, fy + 8); c.quadraticCurveTo(b2 + 2, fy + 8, b2, fy + 6); } c.closePath(); };
  cel(g, ic, { fill: '#ffffff', shade: '#e6e0f0', shadeDx: 2, shadeDy: 3, lw, outline: oc });
  // windows
  for (const wx of [x - 36, x + 36]) {
    glow(g, wx, base - 58, 34, '#ffdb7a', 0.45);
    cel(g, rrect(wx - 16, base - 76, 32, 36, 14), { fill: '#ffe9a0', shade: '#f6c45c', shadeDx: 5, shadeDy: 5, lw, outline: oc });
    g.strokeStyle = oc; g.lineWidth = lw * 0.8; g.beginPath(); g.moveTo(wx, base - 76); g.lineTo(wx, base - 40); g.stroke();
  }
  candyFlower(g, x, fy - 30, 11, { petal: '#ffffff', centre: '#ff9cc2', lw: 2, outline: oc, n: 6 });
}

function fence(g, x0, x1, base, o) {
  const lw = o.lw, oc = o.outline;
  cel(g, rrect(x0 - 4, base - 34, x1 - x0 + 8, 8, 4), { fill: '#f6d6a0', shade: '#dcb070', shadeDx: 0, shadeDy: 3, lw, outline: oc });
  for (let x = x0; x <= x1; x += 22) {
    const p = (c) => { c.moveTo(x - 6, base + 4); c.lineTo(x - 6, base - 44); c.quadraticCurveTo(x, base - 54, x + 6, base - 44); c.lineTo(x + 6, base + 4); c.closePath(); };
    cel(g, p, { fill: '#fff4e0', shade: '#ead2b0', shadeDx: 4, shadeDy: 0, lw, outline: oc });
    g.strokeStyle = rgba('#e3c28e', 0.7); g.lineWidth = 1.2; g.beginPath(); g.moveTo(x - 6, base - 20); g.lineTo(x + 6, base - 26); g.moveTo(x - 6, base - 8); g.lineTo(x + 6, base - 14); g.stroke();
  }
}

export function drawLobby(g, W, H) {
  const R = rng(7001);
  const oc = OUTLINE, ocm = mix(OUTLINE, HAZE, 0.38);
  // sky
  g.fillStyle = linearGrad(g, 0, 0, 0, 520, [[0, '#6c9de6'], [0.38, '#b8b2ec'], [0.7, '#ffc5a6'], [1, '#ffe0a0']]);
  g.fillRect(0, 0, W, H);
  // sun glow (low, left: matches the top-left light of all game art)
  glow(g, 470, 430, 560, '#fff0b0', 0.55);
  glow(g, 470, 430, 230, '#fff6d6', 0.8);
  fill(g, circle(470, 432, 62), radialGrad(g, 452, 414, 4, 70, [[0, '#ffffff'], [0.55, '#fff7d8'], [1, '#ffe6a2']]));
  // golden-lit clouds
  const cl = [[220, 120, 300, 100], [700, 80, 240, 84], [1160, 140, 360, 120], [1480, 70, 220, 76]];
  for (const [x, y, w, h] of cl) puffCloud(g, x, y, w, h, rng(x), { bumps: Math.round(w / 60), top: '#fff4e6', bottom: '#f4b2c4', shade: rgba('#df98b6', 0.75) });
  // far: frosted mountains (left) & a castle silhouette on a far hill (right)
  for (const m of [{ x: 70, py: 318, hw: 170, col: mix('#b9a6e2', HAZE, 0.32), cap: '#fff6f8' }]) frostMountain(g, m, 720);
  const cast = mix('#8f7ac8', HAZE, 0.55);
  for (const [dx, tw, th] of [[0, 30, 90], [-34, 22, 60], [34, 24, 70], [-60, 16, 40], [60, 18, 44]]) {
    const tx = 1420 + dx, tb = 420;
    fill(g, rrect(tx - tw / 2, tb - th, tw, th + 20, 2), cast);
    fill(g, poly([[tx - tw / 2 - 4, tb - th + 2], [tx, tb - th - tw * 1.3], [tx + tw / 2 + 4, tb - th + 2]]), mix(cast, '#b490e0', 0.3));
    fill(g, star(tx, tb - th - tw * 1.3 - 5, 4.5, 2, 5), '#fff2b0');
  }
  // far hills
  const fh1 = catmull([[-60, 470], [160, 430], [420, 452], [700, 418], [980, 446], [1240, 410], [1460, 436], [1680, 420]], 14);
  hill(g, fh1, H, { y0: 400, y1: 560, stops: [[0, mix('#e6b4c6', HAZE, 0.25)], [1, mix('#f6c8b0', HAZE, 0.5)]], rim: rgba('#fff2dc', 0.55) });
  const fh2 = catmull([[-60, 500], [240, 478], [520, 494], [820, 468], [1100, 492], [1380, 470], [1680, 488]], 14);
  hill(g, fh2, H, { y0: 460, y1: 600, stops: [[0, mix('#b9d890', HAZE, 0.35)], [1, mix('#d8e6a0', HAZE, 0.5)]], rim: rgba('#fff6d0', 0.6) });
  // mid hills (golden lit)
  const mh = catmull([[-60, 560], [140, 520], [380, 548], [640, 534], [900, 552], [1120, 522], [1360, 536], [1680, 520]], 14);
  hill(g, mh, H, { y0: 500, y1: 660, stops: [[0, '#d6ef8c'], [0.3, '#a8dc72'], [1, '#78c062']], rim: rgba('#fffbd0', 0.85), rdy: 5, shade: rgba('#5aa86a', 0.4), sdx: 80, sdy: 6, lw: 1.8, outline: ocm });
  // left: big lollipop tree, puff trees and bushes
  puffTree(g, 70, 552, 60, 40, { col: '#78c860', lw: 2.4, outline: oc });
  lollipop(g, 205, 600, 300, 62, { a: '#ff7eb6', b: '#ffffff', lw: 3, outline: oc, turns: 1.3, rot: 0.4, ribbon: '#ff5f8f', stickW: 12 });
  puffTree(g, 285, 584, 40, 30, { col: '#8ad466', lw: 2.4, outline: oc, dot: '#ffd23f' });
  // village (right)
  puffTree(g, 1555, 560, 70, 44, { col: '#76c45e', lw: 2.4, outline: oc });
  mintHouse(g, 1430, 556, { lw: 2.6, outline: oc });
  lollipop(g, 1320, 566, 160, 34, { a: '#7fd8ff', b: '#ffffff', lw: 2.6, outline: oc, turns: 1.2, rot: 1.2 });
  bakery(g, 1150, 590, { lw: 3, outline: oc });
  lollipop(g, 990, 596, 130, 30, { a: '#ffb347', b: '#fff3b0', lw: 2.6, outline: oc, turns: 1.1, rot: 2.1, ribbon: '#ff6f9a' });
  // bunting from the bakery roof to the lollipop tree
  bunting(g, 1098, 352, 222, 282, 22, { outline: oc });
  // foreground plateau (stage sits at 600,600)
  const fg = catmull([[-60, 664], [120, 640], [300, 606], [600, 598], [880, 606], [1040, 628], [1240, 640], [1680, 652]], 14);
  hill(g, fg, H + 10, { y0: 590, y1: 720, stops: [[0, '#b8ec7c'], [0.25, '#8fd866'], [1, '#55ab4e']], rim: rgba('#fdffd0', 0.95), rdy: 6, shade: rgba('#3f8f47', 0.45), sdx: 90, sdy: 6, lw: 2.6, outline: oc });
  // cookie-stone path to the bakery door
  for (const [x, y, rx, ry] of [[1210, 610, 30, 9], [1250, 632, 36, 11], [1300, 660, 42, 13], [1360, 694, 50, 15]]) cel(g, ellipse(x, y, rx, ry), { fill: '#e8b878', shade: '#c88e4e', shadeDx: 4, shadeDy: 3, light: rgba('#fff0d0', 0.7), lightDx: 2, lightDy: 2, lw: 2.4, outline: oc });
  fence(g, 1440, 1600, 650, { lw: 2.4, outline: oc });
  // bushes & flowers on the fore edges (kept outside the calm zone)
  const Rb = rng(7010);
  for (const [x, y, w, h, col] of [[40, 706, 160, 70, '#5cb857'], [230, 690, 120, 50, '#66c25a'], [980, 690, 130, 52, '#62bf58'], [1540, 712, 170, 72, '#58b456']]) bush(g, x, y, w, h, Rb, { col, lw: 2.6, outline: oc });
  for (const [x, y, r, p] of [[120, 650, 10, '#ffffff'], [262, 642, 9, '#ffb3d1'], [930, 640, 9, '#ffd54a'], [1080, 660, 10, '#ffffff'], [1150, 690, 9, '#b69cff'], [1470, 690, 10, '#ffb3d1']]) candyFlower(g, x, y, r, { petal: p, centre: '#ffd54a', lw: 2.2, outline: oc });
  // grass tufts along the plateau rim (outside the calm zone)
  g.strokeStyle = rgba('#3f8f47', 0.6); g.lineWidth = 2; g.lineCap = 'round';
  for (let i = 0; i < 40; i++) {
    const x = R() * W;
    if (x > 290 && x < 910) continue;
    const y = ySampler(fg)(x) + 10 + R() * 70;
    g.beginPath(); g.moveTo(x - 4, y); g.quadraticCurveTo(x - 2, y - 6, x, y - 9); g.moveTo(x + 4, y); g.quadraticCurveTo(x + 2, y - 5, x + 1, y - 9); g.stroke();
  }
  // soft sparkles in the air
  for (let i = 0; i < 14; i++) { const x = R() * W, y = 60 + R() * 300; sparkle(g, x, y, 3 + R() * 4, '#ffffff', 0.7); }
  // gentle vignette
  g.fillStyle = radialGrad(g, 640, 420, 300, 1000, [[0, 'rgba(60,30,40,0)'], [1, 'rgba(60,30,40,0.28)']]);
  g.fillRect(0, 0, W, H);
}
