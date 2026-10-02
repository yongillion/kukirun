// =============================================================================
//  Land 2 — Caramel Canyon (캐러멜 캐니언)
// =============================================================================
import {
  rng, tone, mix, rgba, OUTLINE, fill, stroke, clipTo, innerShade, innerLight, gloss, glint, glow,
  sparkle, poly, circle, ellipse, linearGrad, radialGrad, lerp, clamp, TAU, canvas, ctx2d,
  tiled, wrapAt, TM, waves, circles, unionPart, cel, hazeOnPaint, sprinkle, candyFlower, candyBall,
  puffCloud, scallops, chunkPts, roundPoly, shadeU, lightU,
} from './_env_kit.js';
import { GW, GH, SURF, makeGround, makeCaps, makePlats, matPath, platRepeat, PLAT_MID } from './_env_land.js';
import { catmull, ySampler, humpPts, scatter, memo } from './_env_util.js';

const W = 1536;
const C = {
  fog: '#ffd9a8',
  rockL: '#e6954f', rock: '#d9823f', rockD: '#b5602b', rockDD: '#8f4523',
  sand: '#f2c27a', sandL: '#fbd99a', sandD: '#d9a160',
  caramel: '#ec9433', caramelL: '#ffc25e', caramelD: '#c46a1f',
  mint: '#6fd3a4', mintD: '#43a97c', pink: '#ff8fb8',
};

// ---------------------------------------------------------------------------
// Butte / mesa painter built from stacked tiers (cap rock overhang, eroded
// sides, talus skirt). m: {x, base, tiers:[{w,h}], talus, col, colB, side, ...}
// ---------------------------------------------------------------------------
function buttePts(R, m) {
  const { x, base } = m;
  const tal = m.talus ?? { w: 40, h: 26 };
  const total = m.tiers.reduce((s, t) => s + t.h, 0);
  const top = base - tal.h - total;
  const L = [], Rr = [], ledges = [];
  let y = top;
  m.tiers.forEach((t, i) => {
    const hw = t.w / 2, sl = t.slant ?? 0.05;
    const n = Math.max(2, Math.round(t.h / 22));
    for (let k = 0; k <= n; k++) {
      const yy = y + (t.h * k) / n;
      const out = (t.h * k / n) * sl;
      const jl = k === 0 || k === n ? 0 : (R() - 0.5) * 7;
      const jr = k === 0 || k === n ? 0 : (R() - 0.5) * 7;
      L.push([x - hw - out + jl, yy]);
      Rr.push([x + hw + out + jr, yy]);
    }
    if (i < m.tiers.length - 1) {
      const nw = m.tiers[i + 1].w / 2;
      // undercut below a wider tier (cap rock) / ledge onto a wider tier
      L.push([x - nw, y + t.h + 2]);
      Rr.push([x + nw, y + t.h + 2]);
      ledges.push({ y: y + t.h, hw: Math.max(hw, nw), nw, hw0: hw });
    }
    y += t.h;
  });
  const lw = m.tiers[m.tiers.length - 1].w / 2 + m.tiers[m.tiers.length - 1].h * (m.tiers[m.tiers.length - 1].slant ?? 0.05);
  L.push([x - lw - tal.w * 0.35, base - tal.h * 0.45], [x - lw - tal.w, base + 6]);
  Rr.push([x + lw + tal.w * 0.35, base - tal.h * 0.45], [x + lw + tal.w, base + 6]);
  // top edge with rounded corners
  const tw = m.tiers[0].w / 2;
  const T = [[x - tw + 5, top - 1]];
  const nT = Math.max(2, Math.round(m.tiers[0].w / 40));
  for (let i = 1; i < nT; i++) T.push([x - tw + (m.tiers[0].w * i) / nT, top + (R() - 0.5) * 4]);
  T.push([x + tw - 5, top - 1]);
  const pts = [...L.slice().reverse(), ...T, ...Rr];
  return { pts, top, ledges, lw, tal };
}
function paintMesa(g, R, m) {
  const B = buttePts(R, m);
  const { pts, top } = B;
  const shape = (c) => { poly(pts, false)(c); c.lineTo(pts[pts.length - 1][0], m.base + 200); c.lineTo(pts[0][0], m.base + 200); c.closePath(); };
  if (m.lw) stroke(g, shape, m.lw * 2, m.outline);
  fill(g, shape, linearGrad(g, 0, top, 0, m.base, [[0, m.col], [1, m.colB || m.col]]));
  clipTo(g, shape, () => {
    const xa = m.x - B.lw - 80, xb = m.x + B.lw + 80;
    // strata bands
    if (m.strata) {
      let y = top + 12 + R() * 8;
      let k = 0;
      while (y < m.base) {
        const th = 7 + R() * 14;
        const ph = R() * TAU, ph2 = R() * TAU;
        g.beginPath();
        g.moveTo(xa, y);
        for (let xx = xa; xx <= xb; xx += 6) g.lineTo(xx, y + 2.2 * Math.sin(xx * 0.05 + ph));
        for (let xx = xb; xx >= xa; xx -= 6) g.lineTo(xx, y + th + 2.2 * Math.sin(xx * 0.043 + ph2));
        g.closePath();
        g.fillStyle = m.strata[k % m.strata.length]; g.fill();
        y += th + 8 + R() * 16; k++;
      }
    }
    // vertical erosion grooves
    if (m.grooves) {
      g.strokeStyle = m.grooves; g.lineCap = 'round';
      const n = Math.round((B.lw * 2) / 34);
      for (let i = 0; i < n; i++) {
        const gx = m.x - B.lw + 14 + ((B.lw * 2 - 28) * (i + R() * 0.6)) / n;
        const gy = top + 14 + R() * 30, gl = 26 + R() * 60;
        g.lineWidth = 1.6 + R() * 1.6;
        g.beginPath(); g.moveTo(gx, gy); g.quadraticCurveTo(gx + (R() - 0.5) * 6, gy + gl * 0.5, gx + (R() - 0.5) * 4, gy + gl); g.stroke();
      }
    }
    // shaded right facet + shadow under ledges / cap rock
    const f = m.facet ?? 0.28;
    g.beginPath();
    g.moveTo(m.x + m.tiers[0].w / 2 * (1 - f * 2), top - 4);
    for (const t of m.tiers) { /* follow tier widths */ }
    let yy = top;
    for (const t of m.tiers) { g.lineTo(m.x + t.w / 2 * (1 - f * 2) + 3, yy + 6); g.lineTo(m.x + t.w / 2 * (1 - f * 2) - 2, yy + t.h); yy += t.h; }
    g.lineTo(m.x + B.lw * (1 - f * 2) - 6, m.base + 10);
    g.lineTo(m.x + B.lw + 400, m.base + 10); g.lineTo(m.x + B.lw + 400, top - 4); g.closePath();
    g.fillStyle = m.side; g.fill();
    for (const L of B.ledges) {
      if (L.nw < L.hw0) { // cap rock overhang shadow on the tier below
        g.fillStyle = m.under || m.side;
        g.beginPath(); g.moveTo(m.x - L.nw - 4, L.y); g.lineTo(m.x + L.nw + 4, L.y); g.lineTo(m.x + L.nw + 4, L.y + 9); g.quadraticCurveTo(m.x, L.y + 14, m.x - L.nw - 4, L.y + 7); g.closePath(); g.fill();
      } else if (m.rim) { // lit ledge top
        g.fillStyle = m.rim; g.fillRect(m.x - L.nw, L.y - 1, L.nw * 2, 4);
      }
    }
    if (m.rim) { g.fillStyle = m.rim; g.fillRect(m.x - m.tiers[0].w, top - 2, m.tiers[0].w * 2, m.rimH ?? 5); }
  });
  if (m.drips) caramelDrips(g, R, { ...m, top, w: m.tiers[0].w }, pts);
  return B;
}
/** Glossy caramel poured over a mesa top, running down in drips. */
function caramelDrips(g, R, m, pts) {
  const x0 = m.x - m.w / 2 + 2, x1 = m.x + m.w / 2 - 2;
  const y = m.top;
  const n = Math.max(3, Math.round(m.w / 26));
  const c = (cc) => {
    cc.moveTo(x0 - 3, y - 2);
    cc.lineTo(x1 + 3, y - 2);
    cc.lineTo(x1 + 3, y + 8);
    let xx = x1;
    for (let i = 0; i < n; i++) {
      const nx = x1 - ((i + 1) / n) * (x1 - x0);
      const mx = (xx + nx) / 2;
      const long = R() < 0.45;
      const d = long ? 18 + R() * (m.dripLen ?? 40) : 6 + R() * 8;
      const dw = Math.min((xx - nx) * 0.32, 7);
      cc.quadraticCurveTo(xx - 2, y + 9, mx + dw, y + 10);
      cc.bezierCurveTo(mx + dw * 0.8, y + d * 0.7, mx + dw * 1.1, y + d, mx, y + d + dw * 0.6);
      cc.bezierCurveTo(mx - dw * 1.1, y + d, mx - dw * 0.8, y + d * 0.7, mx - dw, y + 10);
      cc.quadraticCurveTo(nx + 2, y + 9, nx, y + 8);
      xx = nx;
    }
    cc.lineTo(x0 - 3, y + 8);
    cc.closePath();
  };
  if (m.lw) stroke(g, c, m.lw * 2, m.outline);
  fill(g, c, linearGrad(g, 0, y - 2, 0, y + 50, [[0, m.drip || C.caramelL], [1, m.dripD || C.caramel]]));
  shadeU(g, c, rgba(m.dripS || C.caramelD, 0.7), 3, 4);
  g.save(); g.globalAlpha = m.glossA ?? 0.8;
  g.strokeStyle = 'rgba(255,248,220,0.95)'; g.lineWidth = 2.2; g.lineCap = 'round';
  g.beginPath(); g.moveTo(x0 + 8, y + 2); g.lineTo(x0 + (x1 - x0) * 0.45, y + 2); g.stroke();
  g.restore();
}

// ---------------------------------------------------------------------------
// FAR — layered distant mesas in sunset haze
// ---------------------------------------------------------------------------
function far() {
  const H = 420, R = rng(2101);
  return tiled(W, H, (g) => {
    // farthest row: pale lilac-pink silhouettes
    const bc = mix('#e2a0a6', C.fog, 0.52);
    const back = [
      { x: 110, tiers: [{ w: 230, h: 64 }, { w: 250, h: 40 }], talus: { w: 70, h: 30 } },
      { x: 470, tiers: [{ w: 90, h: 50 }, { w: 120, h: 70 }], talus: { w: 60, h: 26 } },
      { x: 760, tiers: [{ w: 300, h: 52 }, { w: 320, h: 56 }], talus: { w: 90, h: 34 } },
      { x: 1120, tiers: [{ w: 150, h: 46 }, { w: 190, h: 50 }], talus: { w: 70, h: 30 } },
      { x: 1380, tiers: [{ w: 60, h: 90 }], talus: { w: 50, h: 30 } },
    ];
    for (const m of back) wrapAt(g, W, m.x - 260, m.x + 260, () => paintMesa(g, rng(Math.round(m.x * 7 + 3)), { ...m, base: 316, col: bc, colB: mix(bc, C.fog, 0.4), side: rgba(tone(bc, -0.1), 0.5), strata: [rgba('#ffffff', 0.08), rgba(tone(bc, -0.08), 0.16)], rim: rgba('#fff3e0', 0.3) }));
    hazeOnPaint(g, -TM, W + TM, 200, 330, C.fog, 0, 0.3);
    // near-far row: warmer buttes, spires
    const fc = mix('#df8e66', C.fog, 0.36);
    const front = [
      { x: 290, tiers: [{ w: 150, h: 26 }, { w: 120, h: 70 }, { w: 150, h: 30 }], talus: { w: 60, h: 30 } },
      { x: 600, tiers: [{ w: 40, h: 16 }, { w: 28, h: 74 }], talus: { w: 40, h: 22 } },
      { x: 960, tiers: [{ w: 240, h: 30 }, { w: 210, h: 60 }, { w: 250, h: 24 }], talus: { w: 80, h: 34 } },
      { x: 1270, tiers: [{ w: 110, h: 24 }, { w: 86, h: 54 }], talus: { w: 50, h: 28 } },
      { x: 1460, tiers: [{ w: 30, h: 14 }, { w: 20, h: 52 }], talus: { w: 34, h: 20 } },
    ];
    for (const m of front) wrapAt(g, W, m.x - 220, m.x + 220, () => paintMesa(g, rng(Math.round(m.x * 7 + 3)), { ...m, base: 372, col: fc, colB: mix(fc, C.fog, 0.32), side: rgba(tone(fc, -0.15), 0.55), under: rgba(tone(fc, -0.22), 0.5), strata: [rgba('#fff0d0', 0.12), rgba(tone(fc, -0.1), 0.22)], rim: rgba('#fff0d0', 0.38), grooves: rgba(tone(fc, -0.12), 0.25) }));
    // distant dune floor
    const fd = waves(R, W, 360, [[3, 8], [5, 6], [8, 3]]);
    const dune = (c) => { c.moveTo(-TM, H + 10); for (let x = -TM; x <= W + TM; x += 4) c.lineTo(x, fd(x)); c.lineTo(W + TM, H + 10); c.closePath(); };
    fill(g, dune, linearGrad(g, 0, 345, 0, H, [[0, mix('#f3c38a', C.fog, 0.35)], [1, mix('#f3c38a', C.fog, 0.6)]]));
    innerLight(g, dune, rgba('#fff4dc', 0.5), 0, 4);
    hazeOnPaint(g, -TM, W + TM, 300, H, C.fog, 0, 0.45);
  });
}

// ---------------------------------------------------------------------------
// MID — caramel mesas with drips, a rock arch, dunes
// ---------------------------------------------------------------------------
function arch(g, R, x, top, w, base, o) {
  const legW = w * 0.22, H = base - top;
  const outer = (c) => {
    c.moveTo(x - w / 2 - 10, base + 30);
    c.lineTo(x - w / 2, top + H * 0.35);
    c.bezierCurveTo(x - w / 2 + 4, top + 6, x - w * 0.2, top, x, top + 2);
    c.bezierCurveTo(x + w * 0.2, top, x + w / 2 - 4, top + 8, x + w / 2, top + H * 0.3);
    c.lineTo(x + w / 2 + 12, base + 30);
    c.lineTo(x + w / 2 - legW, base + 30);
    c.lineTo(x + w / 2 - legW + 4, top + H * 0.62);
    c.bezierCurveTo(x + w * 0.22, top + H * 0.22, x - w * 0.22, top + H * 0.2, x - w / 2 + legW - 4, top + H * 0.6);
    c.lineTo(x - w / 2 + legW, base + 30);
    c.closePath();
  };
  stroke(g, outer, o.lw * 2, o.outline);
  fill(g, outer, linearGrad(g, 0, top, 0, base, [[0, C.rockL], [1, C.rock]]));
  clipTo(g, outer, () => {
    for (let i = 0; i < 6; i++) {
      const y = top + 16 + i * 22 + R() * 6;
      g.fillStyle = i % 2 ? rgba(C.rockD, 0.22) : rgba('#ffd7a0', 0.25);
      g.fillRect(x - w, y, w * 2, 7 + R() * 6);
    }
  });
  innerShade(g, outer, rgba(C.rockD, 0.75), 12, 10);
  innerLight(g, outer, rgba('#ffe1b0', 0.7), 4, 5);
}
function candyCactus(g, x, base, h, o) {
  const lw = o.lw, oc = o.outline;
  const r = o.r ?? h * 0.16;
  const trunk = (c) => { c.moveTo(x - r, base + 4); c.lineTo(x - r, base - h + r); c.arc(x, base - h + r, r, Math.PI, 0); c.lineTo(x + r, base + 4); c.closePath(); };
  const armL = (c) => { const ay = base - h * 0.48, ah = h * 0.32, ar = r * 0.72; c.moveTo(x - r + 2, ay + ar); c.lineTo(x - r - ah * 0.55 + ar, ay + ar); c.arc(x - r - ah * 0.55 + ar, ay, ar, Math.PI / 2, Math.PI); c.lineTo(x - r - ah * 0.55, ay - ah + ar); c.arc(x - r - ah * 0.55 + ar, ay - ah + ar, ar, Math.PI, 0); c.lineTo(x - r - ah * 0.55 + ar * 2, ay - ar * 0.1); c.lineTo(x - r + 2, ay - ar * 0.1); c.closePath(); };
  const armR = (c) => { const ay = base - h * 0.62, ah = h * 0.26, ar = r * 0.66; c.moveTo(x + r - 2, ay + ar); c.lineTo(x + r + ah * 0.5 - ar, ay + ar); c.arc(x + r + ah * 0.5 - ar, ay, ar, Math.PI / 2, 0, true); c.lineTo(x + r + ah * 0.5, ay - ah + ar); c.arc(x + r + ah * 0.5 - ar, ay - ah + ar, ar, 0, Math.PI, true); c.lineTo(x + r + ah * 0.5 - ar * 2, ay - ar * 0.1); c.lineTo(x + r - 2, ay - ar * 0.1); c.closePath(); };
  const parts = o.arms === 0 ? [trunk] : o.arms === 1 ? [trunk, armL] : [trunk, armL, armR];
  const all = (c) => { for (const p of parts) p(c); };
  stroke(g, all, lw * 2, oc);
  fill(g, all, o.col || C.mint);
  shadeU(g, all, o.shade || C.mintD, r * 0.45, r * 0.2);
  lightU(g, all, rgba('#d8ffe8', 0.65), r * 0.22, r * 0.2);
  // ribs
  g.save(); g.strokeStyle = rgba(o.shade || C.mintD, 0.6); g.lineWidth = Math.max(1.2, lw * 0.6); g.lineCap = 'round';
  g.beginPath(); g.moveTo(x - r * 0.3, base - h + r * 1.3); g.lineTo(x - r * 0.3, base - 4); g.moveTo(x + r * 0.35, base - h + r * 1.2); g.lineTo(x + r * 0.35, base - 4); g.stroke();
  g.restore();
  // sugar "spines" as tiny dots
  g.fillStyle = rgba('#ffffff', 0.85);
  const R = rng(Math.round(x * 3 + h));
  for (let i = 0; i < Math.round(h / 9); i++) { g.beginPath(); g.arc(x + (R() - 0.5) * r * 1.4, base - h * 0.1 - R() * h * 0.8, Math.max(0.9, lw * 0.45), 0, TAU); g.fill(); }
  if (o.flower) candyFlower(g, x + r * 0.2, base - h - 1, r * 0.75, { petal: C.pink, centre: '#ffe37a', lw: lw * 0.9, outline: oc, n: 5 });
}
function mid() {
  const H = 380, R = rng(2301);
  const oc = mix(OUTLINE, C.fog, 0.4), lw = 2;
  return tiled(W, H, (g) => {
    const mesas = [
      { x: 120, tiers: [{ w: 170, h: 30 }, { w: 140, h: 86 }, { w: 176, h: 34 }], talus: { w: 50, h: 24 } },
      { x: 440, tiers: [{ w: 120, h: 28 }, { w: 96, h: 120 }, { w: 120, h: 30 }], talus: { w: 44, h: 22 } },
      { x: 1070, tiers: [{ w: 250, h: 32 }, { w: 226, h: 70 }, { w: 270, h: 44 }], talus: { w: 60, h: 26 } },
      { x: 1380, tiers: [{ w: 54, h: 22 }, { w: 36, h: 100 }], talus: { w: 34, h: 20 } },
    ];
    for (const m of mesas) wrapAt(g, W, m.x - 240, m.x + 240, () => paintMesa(g, rng(Math.round(m.x * 7 + 3)), {
      ...m, base: 300, col: C.rockL, colB: C.rock, side: rgba(C.rockD, 0.72), under: rgba(C.rockDD, 0.45), strata: [rgba('#ffd49a', 0.32), rgba(C.rockD, 0.26), rgba('#f6b46c', 0.32)],
      rim: rgba('#ffe5b5', 0.75), rimH: 4, lw, outline: oc, drips: true, dripLen: 46, grooves: rgba(C.rockD, 0.35),
    }));
    wrapAt(g, W, 760 - 200, 760 + 200, () => arch(g, R, 760, 150, 230, 300, { lw, outline: oc }));
    // dunes
    const fd = waves(R, W, 300, [[2, 10], [4, 7], [7, 4]]);
    const dune = (c) => { c.moveTo(-TM, H + 10); for (let x = -TM; x <= W + TM; x += 4) c.lineTo(x, fd(x)); c.lineTo(W + TM, H + 10); c.closePath(); };
    stroke(g, dune, lw * 2, oc);
    fill(g, dune, linearGrad(g, 0, 286, 0, H, [[0, C.sandL], [0.5, C.sand], [1, C.sandD]]));
    innerShade(g, dune, rgba(C.sandD, 0.6), 60, 6);
    innerLight(g, dune, rgba('#fff3d6', 0.8), 0, 4);
    // ripple lines
    g.save(); g.strokeStyle = rgba(C.sandD, 0.35); g.lineWidth = 1.5; g.lineCap = 'round';
    for (let i = 0; i < 26; i++) {
      const x = R() * W, y = fd(x) + 14 + R() * 50;
      wrapAt(g, W, x - 30, x + 30, () => { g.beginPath(); g.moveTo(x - 20, y); g.quadraticCurveTo(x, y - 4, x + 22, y); g.stroke(); });
    }
    g.restore();
    // small cacti on the dunes
    const cs = [[260, 0.9, 2], [640, 0.7, 1], [930, 1, 2], [1240, 0.8, 1], [1480, 0.75, 0]];
    for (const [x, s, arms] of cs) wrapAt(g, W, x - 50, x + 50, () => candyCactus(g, x, fd(x) + 10, 58 * s, { lw, outline: oc, arms, col: mix(C.mint, C.fog, 0.15), shade: mix(C.mintD, C.fog, 0.1), flower: s > 0.85 }));
  });
}

// ---------------------------------------------------------------------------
// NEAR — toffee boulders, honeycomb rocks, gummy cacti, dry grass
// ---------------------------------------------------------------------------
function boulder(g, R, x, base, w, h, o) {
  const pts = [];
  const n = 9;
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const a = Math.PI + t * Math.PI;
    const rr = 1 + (R() - 0.5) * 0.16;
    pts.push([x + Math.cos(a) * w / 2 * rr, base + Math.sin(a) * h * rr]);
  }
  const shape = (c) => { const pp = catmull(pts, 6); poly(pp, false)(c); c.lineTo(x + w / 2, base + 10); c.lineTo(x - w / 2, base + 10); c.closePath(); };
  cel(g, shape, { fill: o.col, shade: o.shade, shadeDx: w * 0.12, shadeDy: h * 0.15, light: o.light, lightDx: w * 0.06, lightDy: h * 0.08, lw: o.lw, outline: o.outline });
  if (o.stripes) {
    clipTo(g, shape, () => {
      for (let i = 0; i < 4; i++) {
        const y = base - h * (0.2 + i * 0.22) + (R() - 0.5) * 4;
        g.fillStyle = i % 2 ? rgba(o.shade, 0.45) : rgba('#ffe2b0', 0.4);
        g.beginPath(); g.moveTo(x - w, y); g.quadraticCurveTo(x, y - 5, x + w, y + 2); g.lineTo(x + w, y + 6); g.quadraticCurveTo(x, y + 1, x - w, y + 5); g.closePath(); g.fill();
      }
    });
  }
  if (o.drip) {
    const c = (cc) => {
      const y = base - h + 6;
      cc.moveTo(x - w * 0.3, y + 2);
      cc.quadraticCurveTo(x - w * 0.1, y - 9, x + w * 0.25, y);
      cc.quadraticCurveTo(x + w * 0.28, y + 10, x + w * 0.16, y + 12);
      cc.bezierCurveTo(x + w * 0.15, y + 26, x + w * 0.06, y + 26, x + w * 0.06, y + 12);
      cc.quadraticCurveTo(x - w * 0.12, y + 14, x - w * 0.3, y + 2);
      cc.closePath();
    };
    cel(g, c, { fill: C.caramelL, shade: C.caramel, shadeDx: 3, shadeDy: 4, lw: o.lw, outline: o.outline });
    glint(g, x - w * 0.12, base - h + 3, 3, -0.4, 0.9);
  }
}
function rockCandy(g, x, base, s, o) {
  // rounded (harmless-looking) crystal cluster
  const R = rng(Math.round(x * 7));
  const xs = [[-14, 0.75, -0.35], [12, 0.85, 0.3], [0, 1.1, -0.05], [22, 0.55, 0.55], [-24, 0.5, -0.6]];
  for (const [dx, k, ang] of xs) {
    const h = 34 * s * k, w = 15 * s * Math.sqrt(k);
    g.save(); g.translate(x + dx * s, base); g.rotate(ang);
    const sh = (c) => { c.moveTo(-w / 2, 4); c.lineTo(-w / 2, -h + w * 0.55); c.quadraticCurveTo(-w / 2, -h, 0, -h - w * 0.15); c.quadraticCurveTo(w / 2, -h, w / 2, -h + w * 0.55); c.lineTo(w / 2, 4); c.closePath(); };
    cel(g, sh, { fill: o.col, shade: tone(o.col, -0.2), shadeDx: w * 0.4, shadeDy: 0, light: rgba('#ffffff', 0.55), lightDx: w * 0.18, lightDy: 3, lw: o.lw, outline: o.outline });
    g.fillStyle = 'rgba(255,255,255,0.85)'; g.beginPath(); g.ellipse(-w * 0.15, -h + w * 0.5, w * 0.12, w * 0.3, 0, 0, TAU); g.fill();
    g.restore();
  }
}
function dryGrass(g, x, y, h, oc, lw) {
  g.save(); g.lineCap = 'round';
  const blades = [[-8, -6], [-3, -2], [2, 3], [7, 8]];
  for (const [bx, lean] of blades) {
    g.strokeStyle = oc; g.lineWidth = lw + 2.2;
    g.beginPath(); g.moveTo(x + bx * 0.5, y); g.quadraticCurveTo(x + bx, y - h * 0.6, x + bx + lean, y - h * (0.75 + Math.abs(bx) * -0.02)); g.stroke();
  }
  for (const [bx, lean] of blades) {
    g.strokeStyle = '#f7d27e'; g.lineWidth = lw;
    g.beginPath(); g.moveTo(x + bx * 0.5, y); g.quadraticCurveTo(x + bx, y - h * 0.6, x + bx + lean, y - h * (0.75 + Math.abs(bx) * -0.02)); g.stroke();
  }
  g.restore();
}
function near() {
  const H = 240, R = rng(2401);
  const oc = mix(OUTLINE, C.fog, 0.28), lw = 2.2;
  return tiled(W, H, (g) => {
    // sand bank strip
    const fs = waves(R, W, H - 34, [[4, 5], [9, 3], [15, 2]]);
    const bank = (c) => { c.moveTo(-TM, H + 10); for (let x = -TM; x <= W + TM; x += 4) c.lineTo(x, fs(x)); c.lineTo(W + TM, H + 10); c.closePath(); };
    stroke(g, bank, lw * 2, oc);
    fill(g, bank, linearGrad(g, 0, H - 44, 0, H, [[0, '#f6cd8a'], [1, '#e2a868']]));
    innerLight(g, bank, rgba('#fff2d2', 0.8), 0, 3);
    // cacti
    const cacti = [[90, 132, 2, true], [610, 96, 1, false], [1010, 150, 2, true], [1330, 84, 0, true]];
    for (const [x, h, arms, fl] of cacti) wrapAt(g, W, x - 70, x + 70, () => candyCactus(g, x, fs(x) + 12, h, { lw, outline: oc, arms, flower: fl, col: '#72d6a6', shade: '#47ad80' }));
    // boulders
    const bs = [
      { x: 250, w: 120, h: 62, stripes: true }, { x: 420, w: 70, h: 40, drip: true }, { x: 780, w: 150, h: 76, drip: true },
      { x: 880, w: 64, h: 34, stripes: true }, { x: 1180, w: 110, h: 56, stripes: true }, { x: 1460, w: 96, h: 50, drip: true },
    ];
    for (const b of bs) wrapAt(g, W, b.x - b.w, b.x + b.w, () => {
      const Rb = rng(Math.round(b.x * 11));
      const col = b.stripes ? '#e9a057' : '#c9743a';
      boulder(g, Rb, b.x, fs(b.x) + 14, b.w, b.h, { col, shade: tone(col, -0.22), light: rgba('#ffe7b8', 0.7), lw, outline: oc, stripes: b.stripes, drip: b.drip });
    });
    for (const [x, s, col] of [[520, 1, '#ffb0c8'], [1240, 0.8, '#ffd08a']]) wrapAt(g, W, x - 60, x + 60, () => rockCandy(g, x, fs(x) + 12, s, { col, lw, outline: oc }));
    for (let i = 0; i < 18; i++) {
      const x = (i + R()) * (W / 18);
      const h = 18 + R() * 12;
      wrapAt(g, W, x - 20, x + 20, () => dryGrass(g, x, fs(x) + 10, h, oc, 2.2));
    }
  });
}

// ---------------------------------------------------------------------------
// CLOUDS — warm dust streaks + the big setting sun
// ---------------------------------------------------------------------------
function clouds() {
  const items = [];
  const defs = [[420, 110], [320, 90], [260, 76], [200, 64], [340, 70]];
  defs.forEach(([w, h], i) => items.push({
    name: `c${i}`, w, h, ax: w / 2, ay: h / 2, meta: { y: [40, 240], speed: 0.03 + i * 0.008 },
    draw: (g) => {
      const R = rng(2500 + i);
      // long flat sunset cloud: lit pink-gold top, lavender underside
      puffCloud(g, w / 2, h * 0.62, w * 0.88, h * 0.5, R, { bumps: Math.round(w / 55), top: '#fff1dd', bottom: '#f3a3a8', shade: rgba('#d98a9e', 0.85), rim: 'rgba(255,250,235,0.95)' });
    },
  }));
  items.push({
    name: 'sun', w: 460, h: 460, ax: 230, ay: 230, meta: { y: 330, fixed: true },
    draw: (g) => {
      const x = 230, y = 230;
      glow(g, x, y, 228, '#fff1b8', 0.55);
      glow(g, x, y, 170, '#ffe48a', 0.6);
      const disc = circle(x, y, 118);
      fill(g, disc, radialGrad(g, x - 30, y - 34, 10, 140, [[0, '#fffbe2'], [0.45, '#fff0a0'], [0.8, '#ffd263'], [1, '#ffb347']]));
      // candy rings
      clipTo(g, disc, () => {
        g.strokeStyle = rgba('#ffffff', 0.12); g.lineWidth = 8;
        for (const r of [40, 70, 100]) { g.beginPath(); g.arc(x, y, r, 0, TAU); g.stroke(); }
      });
      innerShade(g, disc, rgba('#ff9a3c', 0.35), 18, 22);
      gloss(g, x - 46, y - 52, 40, 22, -0.7, 0.55);
    },
  });
  return items;
}

// ---------------------------------------------------------------------------
// GROUND — layered sandstone/toffee strata under a poured caramel crust
// ---------------------------------------------------------------------------
const bodyCanvas = memo(() => {
  const R = rng(2201);
  return tiled(GW, GH, (g) => {
    fill(g, (c) => c.rect(-TM, 0, GW + 2 * TM, GH), linearGrad(g, 0, 40, 0, GH, [[0, '#f4c47c'], [0.3, '#e9a85e'], [0.65, '#d4863f'], [1, '#b0602b']]));
    // wavy strata boundaries (period GW)
    const layers = [
      { y: 92, col: 'rgba(255,226,170,0.55)', th: 14 },
      { y: 132, col: 'rgba(196,106,40,0.45)', th: 22 },
      { y: 178, col: 'rgba(255,214,150,0.35)', th: 12 },
      { y: 214, col: 'rgba(150,72,30,0.45)', th: 30 },
    ];
    for (const L of layers) {
      const f1 = waves(R, GW, L.y, [[3, 5], [5, 4], [11, 2]]);
      const f2 = waves(R, GW, L.y + L.th, [[3, 5], [6, 3], [13, 2]]);
      g.beginPath();
      g.moveTo(-TM, f1(-TM));
      for (let x = -TM; x <= GW + TM; x += 4) g.lineTo(x, f1(x));
      for (let x = GW + TM; x >= -TM; x -= 4) g.lineTo(x, f2(x));
      g.closePath(); g.fillStyle = L.col; g.fill();
      // thin highlight on the upper edge
      g.beginPath(); for (let x = -TM; x <= GW + TM; x += 4) { if (x === -TM) g.moveTo(x, f1(x) + 1); else g.lineTo(x, f1(x) + 1); }
      g.strokeStyle = 'rgba(255,240,210,0.35)'; g.lineWidth = 2; g.stroke();
    }
    // sand grains
    for (let i = 0; i < 380; i++) {
      const x = R() * GW, y = 56 + R() * 214, r = 1 + R() * 2;
      const dark = R() < 0.55;
      wrapAt(g, GW, x - 4, x + 4, () => { g.fillStyle = dark ? 'rgba(140,70,25,0.25)' : 'rgba(255,236,190,0.45)'; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); });
    }
    // embedded rock-candy pebbles & honeycomb bits
    const pts = scatter(R, GW, 20, 84, 252, 64);
    for (const [x, y] of pts) {
      const r = 8 + R() * 8;
      const seed = Math.floor(R() * 1e6);
      const kind = R();
      wrapAt(g, GW, x - r - 6, x + r + 6, () => {
        const Rp = rng(seed);
        const pp = chunkPts(Rp, x, y, r, 6, 0.3);
        const sh = roundPoly(pp, r * 0.3);
        if (kind < 0.45) { // honeycomb toffee
          cel(g, sh, { fill: '#f6b54a', shade: '#d98a2a', shadeDx: r * 0.25, shadeDy: r * 0.3, light: '#ffe08a', lightDx: r * 0.15, lightDy: r * 0.15, lw: 3, outline: OUTLINE });
          clipTo(g, sh, () => { for (let k = 0; k < 4; k++) { g.fillStyle = 'rgba(160,80,20,0.55)'; g.beginPath(); g.arc(x + (Rp() - 0.5) * r, y + (Rp() - 0.5) * r * 0.8, 1.6 + Rp() * 1.6, 0, TAU); g.fill(); } });
        } else if (kind < 0.75) { // dark toffee pebble
          cel(g, sh, { fill: '#9a5428', shade: '#6e3818', shadeDx: r * 0.25, shadeDy: r * 0.3, light: '#c27a44', lightDx: r * 0.18, lightDy: r * 0.2, lw: 3, outline: OUTLINE });
        } else { // pink rock candy
          cel(g, sh, { fill: '#ff9cb8', shade: '#e0688c', shadeDx: r * 0.25, shadeDy: r * 0.3, light: '#ffd6e2', lightDx: r * 0.18, lightDy: r * 0.2, lw: 3, outline: OUTLINE });
        }
        g.fillStyle = 'rgba(255,248,230,0.7)'; g.beginPath(); g.ellipse(x - r * 0.3, y - r * 0.32, r * 0.2, r * 0.11, -0.6, 0, TAU); g.fill();
      });
    }
  });
});

function nubFeats(R, period, n) {
  const out = []; const step = period / n;
  for (let i = 0; i < n; i++) if (R() < 0.6) out.push({ x: (i + 0.5) * step + (R() - 0.5) * step * 0.3, w: 10 + R() * 12, h: 3 + R() * 4 });
  return out;
}
const MAT_G = (() => { const R = rng(2202); return { top: SURF, base: 52, period: GW, rc: 10, bulge: 5, faceDrip: 58, faceInner: 16, topStyle: 'nubs', feats: nubFeats(R, GW, 26), scal: scallops(R, GW, 22, 5, 10, 0.45, 12, 34) }; })();
const MAT_P = (() => { const R = rng(2203); return { top: 12, base: 25, period: PLAT_MID, rc: 8, bulge: 4, faceDrip: 30, faceInner: 12, topStyle: 'nubs', feats: nubFeats(R, PLAT_MID, 3), scal: scallops(R, PLAT_MID, 4, 4, 7, 0.5, 6, 16) }; })();

function caramelPaint(g, shape, M) {
  g.save(); g.translate(2, 6); fill(g, shape, 'rgba(110,50,15,0.28)'); g.restore();
  fill(g, shape, linearGrad(g, 0, M.top - 4, 0, M.base + 30, [[0, '#ffd47a'], [0.3, '#f7ac46'], [0.75, '#e48a2c'], [1, '#c96e20']]));
  innerShade(g, shape, 'rgba(170,80,20,0.6)', 3, 6);
  innerLight(g, shape, 'rgba(255,246,214,0.95)', 0, 4);
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
  caramelPaint(g, shape, M);
  // glossy streaks along the caramel
  clipTo(g, shape, () => {
    const R = rng(2210);
    const period = kind === 'plat' ? PLAT_MID : GW;
    const n = kind === 'plat' ? 2 : 12;
    const streaks = [];
    for (let i = 0; i < n; i++) streaks.push({ x: (i + R() * 0.5) * (period / n), w: 18 + R() * 40 });
    g.strokeStyle = 'rgba(255,252,236,0.85)'; g.lineWidth = kind === 'plat' ? 2.5 : 3; g.lineCap = 'round';
    for (let k = -2; k <= 2; k++) for (const s of streaks) {
      const x = s.x + k * period;
      if (x < a - 60 || x > b + 60) continue;
      g.beginPath(); g.moveTo(x, M.top + 5); g.lineTo(x + s.w, M.top + 5); g.stroke();
    }
  });
  g.restore();
}
function capOut(y) {
  const t = (y - SURF) / (GH - SURF);
  return 2 + 4 * Math.sin(t * Math.PI * 1.3) + (y > 120 && y < 150 ? 4 : 0) + (y > 196 && y < 230 ? -3 : 0);
}
function capFace(g, side, face) {
  const dir = side === 'right' ? 1 : -1;
  g.save();
  g.beginPath();
  g.moveTo(face(SURF), SURF);
  for (let y = SURF; y <= GH + 10; y += 4) g.lineTo(face(y) - dir * 18, y);
  for (let y = GH + 10; y >= SURF; y -= 4) g.lineTo(face(y) + dir * 20, y);
  g.closePath();
  g.fillStyle = side === 'right' ? 'rgba(140,60,20,0.38)' : 'rgba(255,230,180,0.3)';
  g.fill();
  // strata ledges continue across the face
  g.strokeStyle = side === 'right' ? 'rgba(100,45,15,0.45)' : 'rgba(255,240,210,0.5)'; g.lineWidth = 3; g.lineCap = 'round';
  for (const y of [92, 132, 178, 214]) { g.beginPath(); g.moveTo(face(y) - dir * 16, y + 4); g.lineTo(face(y) + dir * 1, y); g.stroke(); }
  g.restore();
}

// ---------------------------------------------------------------------------
// PLATFORM — floating toffee slab
// ---------------------------------------------------------------------------
const platBottom = (px) => 64 + 4 * Math.sin((TAU * px) / 128 + 0.4) + 2 * Math.sin((TAU * px * 4) / 128 + 1.2);
function platBody(g, shape, { off, w }) {
  fill(g, shape, linearGrad(g, 0, 14, 0, 72, [[0, '#f0b868'], [0.5, '#df954a'], [1, '#bf6d30']]));
  clipTo(g, shape, () => {
    g.fillStyle = 'rgba(255,226,170,0.5)'; g.fillRect(-40, 38, w + 80, 6);
    g.fillStyle = 'rgba(160,80,30,0.35)'; g.fillRect(-40, 50, w + 80, 8);
    const list = [[24, 44, 7, 0], [74, 52, 6, 1], [108, 40, 5, 2]];
    for (const [px, py, r, k] of list) platRepeat(px, off, 0, w, (x) => {
      const col = ['#f6b54a', '#9a5428', '#ff9cb8'][k];
      const sh = roundPoly(chunkPts(rng(px), x, py, r, 6, 0.3), r * 0.3);
      cel(g, sh, { fill: col, shade: tone(col, -0.25), shadeDx: r * 0.25, shadeDy: r * 0.3, lw: 2.5, outline: OUTLINE });
    });
  });
  innerShade(g, shape, 'rgba(130,56,20,0.45)', 4, 7);
  stroke(g, shape, 5, OUTLINE);
}

export const CANYON = {
  id: 'canyon',
  sky: ['#ff8f6a', '#ffbd86', '#ffe2ad'],
  fog: C.fog,
  ambient: 'dust',
  pit: '#8f4523',
  farH: 420, midH: 380, nearH: 240, midBottom: 610, nearBottom: 612,
  far: memo(far), mid: memo(mid), near: memo(near), clouds,
  bodyCanvas, lip, capOut, capFace, capTexX: 410,
  platBottom, platBody,
  ground: memo(() => makeGround(CANYON)),
  cap: true, caps: () => makeCaps(CANYON),
  plat: true, plats: () => makePlats(CANYON),
};
