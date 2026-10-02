// =============================================================================
//  Land 1 — Sugar Meadow (슈가 메도우)
// =============================================================================
import {
  rng, tone, mix, rgba, OUTLINE, fill, stroke, clipTo, innerShade, innerLight, gloss, glint, glow,
  sparkle, smooth, poly, circle, ellipse, linearGrad, radialGrad, lerp, clamp, TAU, canvas, ctx2d,
  tiled, wrapAt, TM, waves, circles, unionPart, cel, hazeOnPaint, sprinkle, lollipop, candyFlower,
  candyBall, puffCloud, scallops, tufts, chunkPts, roundPoly, swirlFill,
} from './_env_kit.js';
import { GW, GH, SURF, makeGround, makeCaps, makePlats, matPath, platRepeat, PLAT_MID } from './_env_land.js';
import { catmull, ySampler, humpPts, scatter, memo } from './_env_util.js';

const W = 1536;
const C = {
  fog: '#d6f1fc',
  g0: '#c4f590', g1: '#9be672', g2: '#7ad36f', g3: '#4fae4f', g4: '#3a8f43',
  soilL: '#e2a865', soil: '#c98a4b', soilD: '#9e6230', chunk: '#7a4a2a', chunkD: '#53301a', chunkL: '#a5704a',
  pink: '#ff9cc2', pinkD: '#e8679b', cream: '#fff6ea',
};

// ---------------------------------------------------------------------------
// FAR — pale frosted candy mountains + soft rolling hills
// ---------------------------------------------------------------------------
export function frostMountain(g, m, H) {
  const { x, py, hw, col, cap } = m;
  const base = 360;
  const pts = catmull([[x - hw * 1.15, base + 30], [x - hw * 0.7, base - 70], [x - hw * 0.34, py + 52], [x - hw * 0.1, py + 6], [x + hw * 0.08, py + 4], [x + hw * 0.36, py + 56], [x + hw * 0.72, base - 64], [x + hw * 1.15, base + 30]], 10);
  const shape = (c) => { poly(pts, false)(c); c.lineTo(x + hw * 1.15, H + 20); c.lineTo(x - hw * 1.15, H + 20); c.closePath(); };
  fill(g, shape, linearGrad(g, 0, py, 0, base + 40, [[0, col], [1, mix(col, C.fog, 0.55)]]));
  // shadow facet on the right
  clipTo(g, shape, () => {
    g.beginPath();
    g.moveTo(x + hw * 0.02, py);
    g.bezierCurveTo(x + hw * 0.16, py + 60, x - hw * 0.02, py + 120, x + hw * 0.16, base + 40);
    g.lineTo(x + hw * 1.4, base + 40); g.lineTo(x + hw * 1.4, py - 20); g.closePath();
    g.fillStyle = rgba(tone(col, -0.16), 0.5); g.fill();
    // frosting cap with drips
    const capY = py + hw * 0.2;
    const R = rng(Math.round(x * 7 + py));
    g.beginPath();
    g.moveTo(x - hw * 0.8, py - 30);
    g.lineTo(x + hw * 0.8, py - 30);
    const n = 7;
    let xx = x + hw * 0.62;
    g.lineTo(xx, capY + 10);
    for (let i = 0; i < n; i++) {
      const nx = x + hw * 0.62 - ((i + 1) / n) * hw * 1.26;
      const mx = (xx + nx) / 2;
      const d = 8 + R() * 14 + (i % 2 ? 0 : 10 + R() * 14);
      g.bezierCurveTo(xx, capY + d + 6, mx + 6, capY + d + 10, mx, capY + d);
      g.bezierCurveTo(mx - 6, capY + d - 8, nx + 4, capY + 4, nx, capY + 6);
      xx = nx;
    }
    g.closePath();
    g.fillStyle = cap; g.fill();
    g.save(); g.clip();
    g.beginPath(); g.moveTo(x + hw * 0.03, py - 10);
    g.bezierCurveTo(x + hw * 0.14, py + 40, x + hw * 0.05, py + 70, x + hw * 0.2, capY + 60);
    g.lineTo(x + hw, capY + 60); g.lineTo(x + hw, py - 20); g.closePath();
    g.fillStyle = rgba(tone(cap, -0.08), 0.8); g.fill();
    g.restore();
  });
}

export function hump(g, h, H, o) {
  const shape = (c) => { poly(h.pts, false)(c); c.lineTo(h.x + h.rx, H + 30); c.lineTo(h.x - h.rx, H + 30); c.closePath(); };
  const col = h.col || o.col;
  const lw = o.lw || 0;
  if (lw) stroke(g, shape, lw * 2, o.outline);
  fill(g, shape, linearGrad(g, 0, h.top, 0, Math.min(H, h.top + (o.gradH ?? 160)), [[0, o.topCol ? mix(col, o.topCol, 0.5) : col], [1, o.botCol || col]]));
  if (o.shadeA) innerShade(g, shape, rgba(o.shadeCol || tone(col, -0.18), o.shadeA), h.rx * (o.shadeK ?? 0.1), h.ry * 0.14);
  if (o.rimA) innerLight(g, shape, rgba(o.rimCol || '#ffffff', o.rimA), o.rimDx ?? 5, o.rimDy ?? 5);
  return shape;
}

function far() {
  const H = 420, R = rng(1101);
  return tiled(W, H, (g) => {
    const mts = [
      { x: 160, py: 118, hw: 270, col: '#a8c6ee', cap: '#f7fbff' },
      { x: 620, py: 160, hw: 220, col: '#b9cdf1', cap: '#fff0f7' },
      { x: 1040, py: 96, hw: 300, col: '#a3c2ec', cap: '#f7fbff' },
      { x: 1390, py: 168, hw: 190, col: '#bccff2', cap: '#fff0f7' },
    ];
    for (const m of mts) wrapAt(g, W, m.x - m.hw * 1.2, m.x + m.hw * 1.2, () => frostMountain(g, m, H));
    // back hills
    const backCol = mix('#97d6a1', C.fog, 0.48);
    const hs1 = humpBand(R, { n: 7, y: 236, yJit: 22, rx: [190, 300], ry: [60, 95] });
    for (const h of hs1) wrapAt(g, W, h.x - h.rx, h.x + h.rx, () => {
      hump(g, h, H, { col: backCol, botCol: mix(backCol, C.fog, 0.6), shadeA: 0.35, rimA: 0.4 });
      // tiny far trees on the crest
      const Rt = rng(Math.round(h.x * 13));
      const yAt = ySampler(h.pts);
      const nt = 2 + Math.floor(Rt() * 3);
      for (let i = 0; i < nt; i++) {
        const tx = h.x + (Rt() - 0.5) * h.rx * 0.9;
        const ty = yAt(tx) + 3;
        if (Rt() < 0.4) {
          const r = 6 + Rt() * 3;
          g.fillStyle = mix('#f3b5cf', C.fog, 0.45); g.fillRect(tx - 1, ty - 16, 2, 16);
          g.beginPath(); g.arc(tx, ty - 18 - r * 0.5, r, 0, TAU); g.fillStyle = mix('#ffc4dc', C.fog, 0.4); g.fill();
        } else {
          const r = 7 + Rt() * 5;
          const tc = mix('#7cc58a', C.fog, 0.5);
          g.fillStyle = mix('#b79a7a', C.fog, 0.5); g.fillRect(tx - 1.2, ty - r, 2.4, r);
          fill(g, circles([[tx, ty - r - 4, r], [tx - r * 0.7, ty - r * 0.6, r * 0.7], [tx + r * 0.7, ty - r * 0.6, r * 0.7]]), tc);
          g.globalAlpha = 0.5; fill(g, circle(tx - r * 0.3, ty - r - 7, r * 0.45), mix(tc, '#ffffff', 0.4)); g.globalAlpha = 1;
        }
      }
    });
    // front far hills
    const frontCol = mix('#86cf7e', C.fog, 0.3);
    const hs2 = humpBand(R, { n: 9, y: 292, yJit: 18, rx: [150, 240], ry: [46, 72] });
    for (const h of hs2) wrapAt(g, W, h.x - h.rx, h.x + h.rx, () => hump(g, h, H, { col: frontCol, botCol: mix(frontCol, C.fog, 0.45), shadeA: 0.4, rimA: 0.45 }));
    hazeOnPaint(g, -TM, W + TM, 300, H, C.fog, 0, 0.5);
  });
}

/** Evenly spaced humps across the period, sorted back (high) -> front (low). */
export function humpBand(R, o) {
  const out = [];
  for (let i = 0; i < o.n; i++) {
    const x = ((i + 0.5 + (R() - 0.5) * 0.5) / o.n) * W;
    const top = o.y + (R() - 0.5) * 2 * o.yJit;
    const rx = o.rx[0] + R() * (o.rx[1] - o.rx[0]);
    const ry = o.ry[0] + R() * (o.ry[1] - o.ry[0]);
    out.push({ x, top, rx, ry, pts: humpPts(x, top, rx, ry, o.flat ?? 0.5) });
  }
  return out.sort((a, b) => a.top - b.top);
}

// ---------------------------------------------------------------------------
// MID — rolling green hills with lollipop & gumdrop trees
// ---------------------------------------------------------------------------
export function puffTree(g, x, y, h, r, o) {
  const lw = o.lw, oc = o.outline;
  const tr = poly([[x - 3.2, y + 3], [x - 2.2, y - h], [x + 2.2, y - h], [x + 3.2, y + 3]]);
  cel(g, tr, { fill: '#9a6a48', shade: '#7a4e33', shadeDx: 2.5, shadeDy: 0, lw, outline: oc });
  const R = rng(Math.round(x * 31 + y));
  const cy = y - h - r * 0.4;
  const list = [[x, cy - r * 0.35, r], [x - r * 0.72, cy + r * 0.2, r * 0.7], [x + r * 0.75, cy + r * 0.18, r * 0.72], [x + r * 0.1, cy + r * 0.45, r * 0.68]];
  const sh = circles(list);
  unionPart(g, sh, { fill: o.col, shade: tone(o.col, -0.2), shadeDx: r * 0.28, shadeDy: r * 0.32, light: rgba('#f4ffd0', 0.55), lightDx: r * 0.14, lightDy: r * 0.16, lw, outline: oc });
  // sugar dots
  for (let i = 0; i < 6; i++) {
    const a = R() * TAU, d = R() * r * 0.8;
    const px = x + Math.cos(a) * d, py = cy + Math.sin(a) * d * 0.8;
    g.fillStyle = R() < 0.5 ? rgba('#ffffff', 0.75) : rgba(o.dot || '#ff8fbf', 0.9);
    g.beginPath(); g.arc(px, py, 1.6 + R() * 1.2, 0, TAU); g.fill();
  }
}

function mid() {
  const H = 380, R = rng(1301);
  const oc = mix(OUTLINE, C.fog, 0.45), lw = 2;
  const hoc = mix(OUTLINE, C.fog, 0.58), hlw = 1.6;
  return tiled(W, H, (g) => {
    const backCol = mix('#9be08a', C.fog, 0.24);
    const hs = humpBand(R, { n: 7, y: 226, yJit: 22, rx: [200, 290], ry: [70, 104] });
    const treeSlots = [
      { t: 'lolli', a: '#ff8cc0', b: '#ffffff' }, { t: 'puff', col: '#66c75f' }, { t: 'lolli', a: '#ffb347', b: '#fff3b0' },
      { t: 'puff', col: '#5fbf69' }, { t: 'gum', col: '#ffd0e4' }, { t: 'lolli', a: '#7fd8ff', b: '#ffffff' }, { t: 'puff', col: '#79cf60' },
    ];
    hs.forEach((h, i) => wrapAt(g, W, h.x - h.rx - 40, h.x + h.rx + 40, () => {
      hump(g, h, H, { col: backCol, topCol: '#d6f6aa', botCol: mix(backCol, '#62b85c', 0.3), gradH: 150, lw: hlw, outline: hoc, shadeA: 0.4, shadeCol: '#62b65e', shadeK: 0.09, rimA: 0.5, rimCol: '#f0ffd2', rimDx: 4, rimDy: 4 });
      // mown stripes (very soft)
      const yAt = ySampler(h.pts);
      // trees on this hill
      const s = treeSlots[i % treeSlots.length];
      const Rt = rng(1000 + i * 77);
      const tx = h.x + (Rt() - 0.5) * h.rx * 0.5;
      const ty = yAt(tx) + 6;
      if (s.t === 'lolli') {
        lollipop(g, tx, ty, 92 + Rt() * 34, 24 + Rt() * 8, { a: s.a, b: s.b, lw, outline: oc, stick: '#fffaf0', turns: 1.1, rot: Rt() * TAU, ribbon: Rt() < 0.6 ? '#ff6f9a' : null });
        // little companion puff tree
        const t2 = tx + (Rt() < 0.5 ? -1 : 1) * (50 + Rt() * 40);
        if (Rt() < 0.6) puffTree(g, t2, yAt(t2) + 5, 22 + Rt() * 10, 16 + Rt() * 5, { col: '#6cc663', lw, outline: oc });
      } else if (s.t === 'puff') {
        puffTree(g, tx, ty, 34 + Rt() * 12, 24 + Rt() * 6, { col: s.col, lw, outline: oc });
        const t2 = tx + (Rt() < 0.5 ? -1 : 1) * (44 + Rt() * 30);
        puffTree(g, t2, yAt(t2) + 5, 22 + Rt() * 8, 15 + Rt() * 4, { col: tone(s.col, 0.08), lw, outline: oc, dot: '#ffd23f' });
      } else {
        // gumdrop cottage-free cluster of gumdrops
        for (let k = 0; k < 3; k++) {
          const gx = tx + (k - 1) * 30, gy = yAt(gx) + 6;
          const gr = 13 + Rt() * 6;
          const col = ['#ff9cc2', '#ffd36b', '#9be7ff'][k];
          const gd = (c) => { c.moveTo(gx - gr, gy); c.bezierCurveTo(gx - gr, gy - gr * 1.9, gx + gr, gy - gr * 1.9, gx + gr, gy); c.closePath(); };
          cel(g, gd, { fill: col, shade: tone(col, -0.2), shadeDx: gr * 0.3, shadeDy: gr * 0.2, lw, outline: oc });
          for (let d = 0; d < 5; d++) { g.fillStyle = 'rgba(255,255,255,0.8)'; g.beginPath(); g.arc(gx + (Rt() - 0.5) * gr * 1.2, gy - gr * 0.3 - Rt() * gr * 0.9, 1.4, 0, TAU); g.fill(); }
          glint(g, gx - gr * 0.4, gy - gr * 0.95, gr * 0.16, -0.7, 0.8);
        }
      }
    }));
    // front mid band: lower richer hills with flower dots
    const frontCol = mix('#7fd16e', C.fog, 0.14);
    const hs2 = humpBand(R, { n: 9, y: 292, yJit: 16, rx: [150, 230], ry: [48, 70] });
    hs2.forEach((h) => wrapAt(g, W, h.x - h.rx, h.x + h.rx, () => {
      hump(g, h, H, { col: frontCol, topCol: '#c2f08e', botCol: mix(frontCol, '#4aa452', 0.35), gradH: 110, lw: hlw, outline: hoc, shadeA: 0.42, shadeCol: '#55ad55', shadeK: 0.09, rimA: 0.5, rimCol: '#eaffc8', rimDx: 4, rimDy: 4 });
      const yAt = ySampler(h.pts);
      const Rf = rng(Math.round(h.x * 3 + 7));
      for (let k = 0; k < 16; k++) {
        const fx = h.x + (Rf() - 0.5) * h.rx * 1.3;
        const fy = yAt(fx) + 8 + Rf() * 40;
        const col = Rf() < 0.5 ? '#ffc2dc' : (Rf() < 0.5 ? '#fff4a8' : '#ffffff');
        g.fillStyle = rgba(col, 0.9);
        g.beginPath(); g.arc(fx, fy, 1.8 + Rf() * 1.2, 0, TAU); g.fill();
      }
    }));
  });
}

// ---------------------------------------------------------------------------
// NEAR — bushes, candy flowers, lollipops right behind the ground
// ---------------------------------------------------------------------------
export function bush(g, x, y, w, h, R, o) {
  const n = Math.max(3, Math.round(w / (h * 0.55)));
  const list = [];
  for (let i = 0; i < n; i++) {
    const t = n === 1 ? 0.5 : i / (n - 1);
    const arch = Math.sin(t * Math.PI);
    const r = h * (0.36 + 0.3 * arch) * (0.88 + R() * 0.24);
    list.push([x - w / 2 + w * t, y - r * 0.75 - arch * h * 0.22, r]);
  }
  list.push([x, y - h * 0.18, h * 0.42]);
  const sh = circles(list);
  unionPart(g, sh, { fill: o.col, shade: o.shade || tone(o.col, -0.2), shadeDx: h * 0.16, shadeDy: h * 0.2, light: rgba(o.light || '#efffc4', 0.6), lightDx: h * 0.07, lightDy: h * 0.09, lw: o.lw, outline: o.outline });
  // leaf flick marks
  g.save(); g.strokeStyle = rgba(tone(o.col, -0.3), 0.55); g.lineWidth = 1.6; g.lineCap = 'round';
  for (let i = 0; i < Math.round(w / 28); i++) {
    const px = x + (R() - 0.5) * w * 0.7, py = y - h * (0.25 + R() * 0.45);
    g.beginPath(); g.moveTo(px - 3, py); g.quadraticCurveTo(px, py + 3, px + 4, py - 1); g.stroke();
  }
  g.restore();
  return list;
}

function near() {
  const H = 240, R = rng(1401);
  const oc = mix(OUTLINE, C.fog, 0.3), lw = 2.2;
  return tiled(W, H, (g) => {
    // continuous hedge strip (period W)
    const N = 48, step = W / N;
    const tab = [];
    for (let i = 0; i < N; i++) tab.push({ dy: R() * 10, r: 22 + R() * 12 });
    const hedge = [];
    for (let i = -4; i < N + 4; i++) {
      const t = tab[((i % N) + N) % N];
      hedge.push([i * step, H - 16 - t.dy, t.r]);
    }
    unionPart(g, circles(hedge), { fill: '#4fa94f', shade: '#3e8f45', shadeDx: 8, shadeDy: 10, light: rgba('#bdf08c', 0.45), lightDx: 4, lightDy: 5, lw, outline: oc });
    // tall props behind bushes
    const props = [
      { x: 120, k: 'flower', h: 128, r: 24, petal: '#ff9cc2', centre: '#ffe066' },
      { x: 520, k: 'lolli', h: 112, r: 21, a: '#b69cff', b: '#ffffff' },
      { x: 800, k: 'flower', h: 98, r: 20, petal: '#ffffff', centre: '#ffb347' },
      { x: 1180, k: 'flower', h: 138, r: 26, petal: '#ffb0d0', centre: '#ffe066' },
      { x: 1390, k: 'lolli', h: 96, r: 18, a: '#ff7b7b', b: '#fff2f2' },
    ];
    for (const p of props) wrapAt(g, W, p.x - 60, p.x + 60, () => {
      const by = H - 30;
      if (p.k === 'flower') {
        // stem with leaves
        const st = (c) => { c.moveTo(p.x - 2.5, by); c.quadraticCurveTo(p.x + 8, by - p.h * 0.5, p.x, by - p.h); c.lineTo(p.x + 4, by - p.h); c.quadraticCurveTo(p.x + 12, by - p.h * 0.5, p.x + 2.5, by); c.closePath(); };
        cel(g, st, { fill: '#5fbf55', shade: '#3f9a45', shadeDx: 2, shadeDy: 0, lw, outline: oc });
        const leaf = (sx, sy, dir) => (c) => { c.moveTo(sx, sy); c.quadraticCurveTo(sx + dir * 18, sy - 18, sx + dir * 30, sy - 8); c.quadraticCurveTo(sx + dir * 16, sy + 2, sx, sy); c.closePath(); };
        cel(g, leaf(p.x + 4, by - p.h * 0.38, 1), { fill: '#6fcb5a', shade: '#4aa54a', shadeDx: 3, shadeDy: 3, lw, outline: oc });
        cel(g, leaf(p.x + 2, by - p.h * 0.58, -1), { fill: '#6fcb5a', shade: '#4aa54a', shadeDx: 3, shadeDy: 3, lw, outline: oc });
        candyFlower(g, p.x + 2, by - p.h - 4, p.r, { petal: p.petal, centre: p.centre, lw, outline: oc, n: 6, rot: -Math.PI / 2 + 0.3 });
      } else {
        lollipop(g, p.x, by, p.h, p.r, { a: p.a, b: p.b, lw, outline: oc, turns: 1.15, rot: p.x * 0.01 });
      }
    });
    // bush clusters with flowers & berries
    const bushes = [
      { x: 60, w: 150, h: 64 }, { x: 330, w: 190, h: 78 }, { x: 640, w: 130, h: 56 }, { x: 900, w: 210, h: 84 },
      { x: 1110, w: 120, h: 52 }, { x: 1300, w: 170, h: 70 }, { x: 1480, w: 120, h: 58 },
    ];
    bushes.forEach((b, i) => wrapAt(g, W, b.x - b.w, b.x + b.w, () => {
      const Rb = rng(500 + i * 19);
      const col = i % 2 ? '#5db857' : '#54b054';
      const list = bush(g, b.x, H - 14, b.w, b.h, Rb, { col, lw, outline: oc });
      // flowers / berries on the bush
      const nF = Math.round(b.w / 45);
      for (let k = 0; k < nF; k++) {
        const c0 = list[Math.floor(Rb() * (list.length - 1))];
        const a = -Math.PI * (0.2 + Rb() * 0.6);
        const fx = c0[0] + Math.cos(a) * c0[2] * 0.62, fy = c0[1] + Math.sin(a) * c0[2] * 0.62;
        if (Rb() < 0.6) candyFlower(g, fx, fy, 7 + Rb() * 3, { petal: Rb() < 0.5 ? '#ffb3d1' : '#ffffff', centre: '#ffd54a', lw: 1.8, outline: oc, rot: Rb() });
        else { candyBall(g, fx, fy, 4.2, '#ff5f7e', { lw: 1.6, outline: oc }); candyBall(g, fx + 7, fy + 3, 3.8, '#ff5f7e', { lw: 1.6, outline: oc }); }
      }
    }));
    // grass blade clumps along the base
    for (let i = 0; i < 26; i++) {
      const x = (i + R()) * (W / 26), y = H - 22 - R() * 10, h = 14 + R() * 10;
      wrapAt(g, W, x - 20, x + 20, () => grassClump(g, x, y, h, '#69c65c', oc, lw * 0.85));
    }
  });
}

export function grassClump(g, x, y, h, col, oc, lw) {
  const sh = (c) => {
    c.moveTo(x - 9, y);
    c.quadraticCurveTo(x - 9, y - h * 0.5, x - 12, y - h * 0.8);
    c.quadraticCurveTo(x - 4, y - h * 0.5, x - 2, y - h * 0.45);
    c.quadraticCurveTo(x - 2, y - h * 0.8, x + 1, y - h);
    c.quadraticCurveTo(x + 4, y - h * 0.6, x + 4, y - h * 0.4);
    c.quadraticCurveTo(x + 8, y - h * 0.6, x + 13, y - h * 0.7);
    c.quadraticCurveTo(x + 9, y - h * 0.4, x + 9, y);
    c.closePath();
  };
  cel(g, sh, { fill: col, shade: tone(col, -0.2), shadeDx: 3, shadeDy: 2, lw, outline: oc });
}

// ---------------------------------------------------------------------------
// CLOUDS
// ---------------------------------------------------------------------------
function clouds() {
  const defs = [[380, 150, 7], [300, 120, 6], [240, 100, 5], [190, 84, 4], [150, 64, 3], [280, 70, 6]];
  return defs.map(([w, h, b], i) => ({
    name: `c${i}`, w, h, ax: w / 2, ay: h / 2,
    meta: { y: [40, 260], speed: 0.04 + i * 0.01 },
    draw: (g) => {
      const R = rng(1500 + i);
      const bh = i === 5 ? h * 0.75 : h * 0.62;
      puffCloud(g, w / 2, h * 0.58, w * 0.84, bh, R, { bumps: b, top: '#ffffff', bottom: '#d5ecfb', shade: rgba('#b9dcf5', 0.8) });
    },
  }));
}

// ---------------------------------------------------------------------------
// GROUND — cookie dough soil with chocolate chunks under a grass lip
// ---------------------------------------------------------------------------
function chocoChunk(g, x, y, r, R, lw = 3) {
  const pts = chunkPts(R, x, y, r, 6, 0.32);
  const sh = roundPoly(pts, r * 0.32);
  cel(g, sh, { fill: C.chunk, shade: C.chunkD, shadeDx: r * 0.22, shadeDy: r * 0.28, light: C.chunkL, lightDx: r * 0.18, lightDy: r * 0.2, lw, outline: OUTLINE });
  g.fillStyle = 'rgba(255,230,200,0.55)';
  g.beginPath(); g.ellipse(x - r * 0.3, y - r * 0.32, r * 0.22, r * 0.12, -0.6, 0, TAU); g.fill();
}

const bodyCanvas = memo(() => {
  const R = rng(1201);
  return tiled(GW, GH, (g) => {
    fill(g, (c) => c.rect(-TM, 0, GW + 2 * TM, GH), linearGrad(g, 0, 40, 0, GH, [[0, C.soilL], [0.38, C.soil], [1, C.soilD]]));
    // darker baked band near the bottom (soft wave)
    const fb = waves(R, GW, 214, [[3, 6], [5, 4], [8, 2]]);
    g.fillStyle = 'rgba(120,64,24,0.22)';
    g.beginPath(); g.moveTo(-TM, GH); for (let x = -TM; x <= GW + TM; x += 4) g.lineTo(x, fb(x)); g.lineTo(GW + TM, GH); g.closePath(); g.fill();
    // pores & crumbs
    for (let i = 0; i < 420; i++) {
      const x = R() * GW, y = 58 + R() * 210, r = 1.2 + R() * 2.6;
      const dark = R() < 0.6;
      wrapAt(g, GW, x - 4, x + 4, () => { g.fillStyle = dark ? 'rgba(110,58,20,0.22)' : 'rgba(255,214,160,0.35)'; g.beginPath(); g.ellipse(x, y, r * 1.3, r, 0, 0, TAU); g.fill(); });
    }
    // chocolate chunks
    const pts = scatter(R, GW, 26, 82, 250, 58);
    for (const [x, y] of pts) {
      const r = 9 + R() * 9;
      const seed = Math.floor(R() * 1e6);
      wrapAt(g, GW, x - r - 4, x + r + 4, () => chocoChunk(g, x, y, r, rng(seed)));
    }
    // a few candy sprinkles baked in
    const sp = scatter(R, GW, 8, 90, 240, 80);
    for (const [x, y] of sp) {
      const col = ['#ff7eb6', '#ffd54a', '#7fd8ff', '#ffffff'][Math.floor(R() * 4)];
      const rot = R() * TAU;
      wrapAt(g, GW, x - 10, x + 10, () => sprinkle(g, x, y, 11, 4.2, rot, col, rgba(OUTLINE, 0.7)));
    }
  });
});

// Grass mat spec (ground / cap) and platform mat spec
function bumpFeats(R, period, n, hLo, hHi) {
  const out = []; const step = period / n;
  for (let i = 0; i < n; i++) out.push({ x: (i + 0.5) * step + (R() - 0.5) * step * 0.2, w: step * (0.78 + R() * 0.18), h: hLo + R() * (hHi - hLo) });
  return out;
}
const MAT_G = (() => { const R = rng(1202); return { top: SURF, base: 56, period: GW, rc: 9, bulge: 5, faceDrip: 44, faceInner: 16, topStyle: 'bumps', feats: bumpFeats(R, GW, 22, 1.5, 3.5), scal: scallops(R, GW, 30, 6, 12, 0.3, 10, 24) }; })();
const MAT_P = (() => { const R = rng(1203); return { top: 12, base: 26, period: PLAT_MID, rc: 8, bulge: 4, faceDrip: 26, faceInner: 12, topStyle: 'bumps', feats: bumpFeats(R, PLAT_MID, 3, 1.5, 3), scal: scallops(R, PLAT_MID, 5, 4, 8, 0.4, 6, 12) }; })();
// grass clumps standing behind the surface line (periodic)
const CLUMPS_G = (() => { const R = rng(1204); const o = []; const n = 11; for (let i = 0; i < n; i++) o.push({ x: (i + 0.2 + R() * 0.6) * (GW / n), h: 15 + R() * 8, s: 0.85 + R() * 0.35, flip: R() < 0.5 }); return o; })();
const CLUMPS_P = [{ x: 30, h: 12, s: 0.7, flip: false }, { x: 100, h: 11, s: 0.65, flip: true }];

function grassPaint(g, shape, M) {
  g.save(); g.translate(2, 7); fill(g, shape, 'rgba(96,48,14,0.3)'); g.restore();
  fill(g, shape, linearGrad(g, 0, M.top - 6, 0, M.base + 26, [[0, '#b6f07e'], [0.3, '#93e06d'], [0.68, '#6cc75a'], [1, '#4aa84c']]));
  innerShade(g, shape, 'rgba(46,128,58,0.6)', 3, 7);
  innerLight(g, shape, 'rgba(240,255,206,0.95)', 0, 5);
  stroke(g, shape, 5, OUTLINE);
}
function grassClumpBig(g, x, y, h, s, flip, lw = 4) {
  g.save(); g.translate(x, y); g.scale(flip ? -s : s, s);
  const blade = (bx, lean, bh, bw) => (c) => {
    c.moveTo(bx - bw / 2, 8);
    c.quadraticCurveTo(bx - bw * 0.55 + lean * 0.3, -bh * 0.5, bx + lean, -bh);
    c.quadraticCurveTo(bx + bw * 0.5 + lean * 0.25, -bh * 0.45, bx + bw / 2, 8);
    c.closePath();
  };
  const bl = [blade(-9, -9, h * 0.72, 12), blade(9, 8, h * 0.8, 12), blade(0, 2, h, 13)];
  for (const b of bl) cel(g, b, { fill: '#8fe06c', shade: '#5fbf55', shadeDx: 4, shadeDy: 0, light: '#d4f9a8', lightDx: 2, lightDy: 3, lw, outline: OUTLINE });
  g.restore();
}

function daisy(g, x, y, r, col) {
  candyFlower(g, x, y, r, { petal: col, centre: '#ffd54a', lw: 3, outline: OUTLINE, n: 5, rot: x * 0.03 });
}

function lip(g, xa, xb, ends, kind, off = 0) {
  const M = kind === 'plat' ? MAT_P : MAT_G;
  g.save(); g.translate(-off, 0);
  const e = {};
  if (ends.left != null) e.left = ends.left + off;
  if (ends.right != null) e.right = ends.right + off;
  const a = xa + off, b = xb + off;
  const okX = (x, m) => x > a + m && x < b - m && (e.right == null || x < e.right - m - 8) && (e.left == null || x > e.left + m + 8);
  // clumps behind the surface line
  const clumps = kind === 'plat' ? CLUMPS_P : CLUMPS_G;
  const period = kind === 'plat' ? PLAT_MID : GW;
  for (let k = -2; k <= 2; k++) for (const c of clumps) {
    const x = c.x + k * period;
    if (okX(x, 14)) grassClumpBig(g, x, M.top + 2, c.h, c.s, c.flip, kind === 'plat' ? 3.5 : 4);
  }
  const shape = matPath(M, a, b, e);
  grassPaint(g, shape, M);
  // little flowers sitting on the lip
  if (kind !== 'plat') {
    const R = rng(1210);
    const fl = [];
    for (let i = 0; i < 5; i++) fl.push({ x: (i + 0.3 + R() * 0.4) * (GW / 5), col: R() < 0.5 ? '#ffffff' : '#ffb3d1', r: 7 + R() * 2 });
    for (let k = -1; k <= 1; k++) for (const f of fl) {
      const x = f.x + k * GW;
      if (okX(x, 16)) daisy(g, x, M.top - 2, f.r, f.col);
    }
  } else {
    platRepeat(66, 0, a, b, (x) => { if (okX(x, 10)) daisy(g, x, M.top - 1, 6, '#ffb3d1'); });
  }
  g.restore();
}

function capOut(y) {
  const t = (y - SURF) / (GH - SURF);
  return 3 + 5 * Math.sin(t * Math.PI * 0.9) + 1.5 * Math.sin(y / 23);
}
function capFace(g, side, face, ax) {
  // cut face band: right face in shade, left face catches light
  const dir = side === 'right' ? 1 : -1;
  g.save();
  g.beginPath();
  g.moveTo(face(SURF), SURF);
  for (let y = SURF; y <= GH + 10; y += 4) g.lineTo(face(y) - dir * (16 + 3 * Math.sin(y / 17)), y);
  for (let y = GH + 10; y >= SURF; y -= 4) g.lineTo(face(y) + dir * 20, y);
  g.closePath();
  g.fillStyle = side === 'right' ? 'rgba(112,58,22,0.38)' : 'rgba(255,226,170,0.32)';
  g.fill();
  // crisp baked crust line just inside the face
  g.beginPath();
  for (let y = SURF + 14; y <= GH + 10; y += 4) { const x = face(y) - dir * 6; if (y === SURF + 14) g.moveTo(x, y); else g.lineTo(x, y); }
  g.strokeStyle = side === 'right' ? 'rgba(90,46,18,0.45)' : 'rgba(255,236,196,0.5)'; g.lineWidth = 3; g.stroke();
  g.restore();
}

// ---------------------------------------------------------------------------
// PLATFORM — floating cookie slab with a grass top
// ---------------------------------------------------------------------------
const platBottom = (px) => 66 + 3 * Math.sin((TAU * px) / 64 + 0.7) + 2 * Math.sin((TAU * px * 3) / 128 + 1.9);
function platBody(g, shape, { off, w }) {
  g.save(); g.translate(0, 5); fill(g, shape, 'rgba(70,40,20,0.0)'); g.restore();
  fill(g, shape, linearGrad(g, 0, 14, 0, 72, [[0, C.soilL], [0.5, C.soil], [1, C.soilD]]));
  clipTo(g, shape, () => {
    const R = rng(1220);
    const list = [[18, 46, 8], [58, 40, 7], [92, 52, 9], [118, 38, 6]];
    for (const [px, py, r] of list) platRepeat(px, off, 0, w, (x) => chocoChunk(g, x, py, r, rng(px * 7), 2.5));
    for (let i = 0; i < 40; i++) {
      const px = R() * PLAT_MID, py = 30 + R() * 34, r = 1 + R() * 2;
      const dark = R() < 0.6;
      platRepeat(px, off, 0, w, (x) => { g.fillStyle = dark ? 'rgba(110,58,20,0.25)' : 'rgba(255,214,160,0.4)'; g.beginPath(); g.arc(x, py, r, 0, TAU); g.fill(); });
    }
  });
  innerShade(g, shape, 'rgba(110,56,20,0.45)', 4, 7);
  stroke(g, shape, 5, OUTLINE);
}

// ---------------------------------------------------------------------------
export const MEADOW = {
  id: 'meadow',
  sky: ['#56b0ec', '#94d3f5', '#d8f3ff'],
  fog: C.fog,
  ambient: 'petals',
  pit: '#7a4a2a',
  farH: 420, midH: 380, nearH: 240, midBottom: 610, nearBottom: 612,
  far: memo(far), mid: memo(mid), near: memo(near), clouds,
  bodyCanvas, lip, capOut, capFace, capTexX: 300,
  platBottom, platBody,
  ground: memo(() => makeGround(MEADOW)),
  cap: true, caps: () => makeCaps(MEADOW),
  plat: true, plats: () => makePlats(MEADOW),
};
