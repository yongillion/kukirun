// =============================================================================
//  Land 4 — Sherbet Glacier (셔벗 빙하)
// =============================================================================
import {
  rng, tone, mix, rgba, OUTLINE, fill, stroke, clipTo, innerShade, innerLight, gloss, glint, glow,
  sparkle, poly, circle, ellipse, rrect, linearGrad, radialGrad, lerp, clamp, TAU, canvas, ctx2d,
  tiled, wrapAt, TM, waves, circles, unionPart, cel, hazeOnPaint, scallops, chunkPts, roundPoly,
  shadeU, lightU, candyBall, puffCloud, sprinkle,
} from './_env_kit.js';
import { GW, GH, SURF, makeGround, makeCaps, makePlats, matPath, platRepeat, PLAT_MID } from './_env_land.js';
import { catmull, ySampler, humpPts, scatter, memo } from './_env_util.js';
import { humpBand } from './_env_meadow.js';

const W = 1536;
const SHERBET = [{}, { col: '#ffb8cf', colL: '#ffe2ec', colD: '#e57f9f' }, { col: '#fff0a6', colL: '#fffbe2', colD: '#e3c45c' }];
const C = {
  fog: '#e6f7ff',
  ice: '#bfe9ff', iceL: '#e6f8ff', iceD: '#8ccbec', iceDD: '#5fa8d6',
  mint: '#8fe3d0', mintL: '#c9f7ea', mintD: '#58c2aa',
  snow: '#ffffff', snowS: '#d6ebfa', snowSD: '#b5d6f0',
  pink: '#ffc6da', lemon: '#fff1a8', lilac: '#d9c9f6', peach: '#ffdcc6',
  cone: '#e8b878', coneD: '#c8904e',
};

// ---------------------------------------------------------------------------
// FAR — pastel sherbet peaks
// ---------------------------------------------------------------------------
function icePeak(g, R, p) {
  const { x, top, hw, base, col } = p;
  const h = base - top;
  const pts = [
    [x - hw * 1.1, base + 20], [x - hw * 0.72, top + h * 0.6], [x - hw * 0.5, top + h * 0.47], [x - hw * 0.42, top + h * 0.52],
    [x - hw * 0.2, top + h * 0.2], [x - hw * 0.05, top + h * 0.04], [x, top], [x + hw * 0.08, top + h * 0.07], [x + hw * 0.26, top + h * 0.3],
    [x + hw * 0.36, top + h * 0.26], [x + hw * 0.58, top + h * 0.5], [x + hw * 1.1, base + 20],
  ];
  const sh = roundPoly(pts, 10);
  const full = (c) => { sh(c); };
  fill(g, full, linearGrad(g, 0, top, 0, base, [[0, col], [1, mix(col, C.fog, 0.5)]]));
  clipTo(g, full, () => {
    // facet split: right faces in shade
    g.fillStyle = rgba(tone(col, -0.14), 0.55);
    g.beginPath(); g.moveTo(x, top - 4); g.lineTo(x + hw * 0.05, top + h * 0.3); g.lineTo(x - hw * 0.1, top + h * 0.55); g.lineTo(x + hw * 0.05, base + 30);
    g.lineTo(x + hw * 1.3, base + 30); g.lineTo(x + hw * 1.3, top - 4); g.closePath(); g.fill();
    g.fillStyle = rgba(tone(col, -0.08), 0.4);
    g.beginPath(); g.moveTo(x - hw * 0.5, top + h * 0.47); g.lineTo(x - hw * 0.46, top + h * 0.75); g.lineTo(x - hw * 0.62, base + 30); g.lineTo(x - hw * 0.35, base + 30); g.closePath(); g.fill();
    // snow cap
    const sy = top + h * 0.32;
    g.beginPath();
    g.moveTo(x - hw, top - 10); g.lineTo(x + hw, top - 10);
    g.lineTo(x + hw * 0.5, sy + 6);
    const n = 6;
    for (let i = 0; i <= n; i++) { const t = i / n; const xx = x + hw * 0.5 - t * hw * 0.95; g.lineTo(xx, sy + (i % 2 ? 14 + R() * 10 : -2 + R() * 6)); }
    g.closePath();
    g.fillStyle = rgba('#ffffff', 0.92); g.fill();
    g.save(); g.clip();
    g.fillStyle = rgba(C.snowS, 0.85);
    g.beginPath(); g.moveTo(x, top - 4); g.lineTo(x + hw * 0.05, top + h * 0.3); g.lineTo(x + hw, top + h * 0.3); g.lineTo(x + hw, top - 4); g.closePath(); g.fill();
    g.restore();
  });
}
function far() {
  const H = 420, R = rng(4101);
  return tiled(W, H, (g) => {
    const peaks = [
      { x: 130, top: 70, hw: 230, col: mix(C.lilac, C.fog, 0.3) },
      { x: 470, top: 120, hw: 190, col: mix(C.pink, C.fog, 0.3) },
      { x: 760, top: 60, hw: 260, col: mix('#bfe3f7', C.fog, 0.2) },
      { x: 1080, top: 112, hw: 200, col: mix(C.mint, C.fog, 0.35) },
      { x: 1360, top: 84, hw: 220, col: mix(C.peach, C.fog, 0.3) },
    ];
    for (const p of peaks) wrapAt(g, W, p.x - p.hw * 1.2, p.x + p.hw * 1.2, () => icePeak(g, rng(Math.round(p.x)), { ...p, base: 330 }));
    hazeOnPaint(g, -TM, W + TM, 150, 330, C.fog, 0, 0.45);
    // rounded ice hills in front
    const hs = humpBand(R, { n: 8, y: 270, yJit: 18, rx: [170, 260], ry: [50, 80] });
    const hc = mix('#d8f1fc', C.fog, 0.2);
    for (const h of hs) wrapAt(g, W, h.x - h.rx, h.x + h.rx, () => {
      const shape = (c) => { poly(h.pts, false)(c); c.lineTo(h.x + h.rx, H + 30); c.lineTo(h.x - h.rx, H + 30); c.closePath(); };
      fill(g, shape, linearGrad(g, 0, h.top, 0, H, [[0, '#ffffff'], [1, hc]]));
      innerShade(g, shape, rgba('#a9d4ef', 0.5), h.rx * 0.1, h.ry * 0.14);
    });
    hazeOnPaint(g, -TM, W + TM, 280, H, C.fog, 0, 0.4);
  });
}

// ---------------------------------------------------------------------------
// MID — glacier shelves, mint choc-chip pines with waffle-cone trunks
// ---------------------------------------------------------------------------
export function mintPine(g, x, base, h, w, o) {
  const lw = o.lw, oc = o.outline;
  const R = rng(Math.round(x * 7 + h));
  // waffle cone trunk
  const th = h * 0.2, tw = w * 0.2;
  const tr = poly([[x - tw * 0.5, base - th], [x + tw * 0.5, base - th], [x + tw * 0.32, base + 4], [x - tw * 0.32, base + 4]]);
  cel(g, tr, { fill: C.cone, shade: C.coneD, shadeDx: tw * 0.25, shadeDy: 0, lw, outline: oc });
  clipTo(g, tr, () => { g.strokeStyle = rgba(C.coneD, 0.8); g.lineWidth = Math.max(1, lw * 0.5); for (let i = -3; i <= 3; i++) { g.beginPath(); g.moveTo(x + i * tw * 0.3 - tw, base - th); g.lineTo(x + i * tw * 0.3 + tw, base + 4); g.moveTo(x + i * tw * 0.3 + tw, base - th); g.lineTo(x + i * tw * 0.3 - tw, base + 4); g.stroke(); } });
  // tiers
  const tiers = o.tiers ?? 3;
  const col = o.col || C.mint, colL = o.colL || C.mintL, colD = o.colD || C.mintD;
  for (let i = 0; i < tiers; i++) {
    const t = i / tiers;
    const tw2 = w * (1 - t * 0.55) / 2;
    const ty = base - th - (h - th) * t * 0.82;
    const tth = (h - th) * 0.42;
    const topY = ty - tth;
    const n = 4 + Math.round(tw2 / 14);
    const tier = (c) => {
      c.moveTo(x, topY);
      c.quadraticCurveTo(x + tw2 * 0.45, topY + tth * 0.35, x + tw2, ty - 2);
      for (let k = 0; k < n; k++) {
        const x0 = x + tw2 - (2 * tw2 * k) / n, x1 = x + tw2 - (2 * tw2 * (k + 1)) / n;
        c.quadraticCurveTo((x0 + x1) / 2, ty + 8 + (k % 2 ? 3 : 0), x1, ty - 2);
      }
      c.quadraticCurveTo(x - tw2 * 0.45, topY + tth * 0.35, x, topY);
      c.closePath();
    };
    cel(g, tier, { fill: col, shade: colD, shadeDx: tw2 * 0.28, shadeDy: tth * 0.15, light: rgba(colL, 0.9), lightDx: tw2 * 0.12, lightDy: tth * 0.12, lw, outline: oc });
    // choco chips
    for (let k = 0; k < Math.round(tw2 / 9); k++) {
      const cx = x + (R() - 0.5) * tw2 * 1.4, cy = ty - tth * (0.15 + R() * 0.5);
      if (Math.abs(cx - x) > (ty - cy) / tth * tw2 * 0.95 + 4) continue;
      g.fillStyle = '#6a3e26'; g.beginPath(); g.ellipse(cx, cy, Math.max(1.6, w * 0.022), Math.max(1.1, w * 0.016), R(), 0, TAU); g.fill();
    }
    // snow on the tier
    const sn = (c) => { c.moveTo(x - tw2 * 0.35, topY + tth * 0.45); c.quadraticCurveTo(x - tw2 * 0.12, topY + tth * 0.08, x, topY + 1); c.quadraticCurveTo(x + tw2 * 0.15, topY + tth * 0.1, x + tw2 * 0.3, topY + tth * 0.42); c.quadraticCurveTo(x + tw2 * 0.12, topY + tth * 0.55, x, topY + tth * 0.4); c.quadraticCurveTo(x - tw2 * 0.15, topY + tth * 0.58, x - tw2 * 0.35, topY + tth * 0.45); c.closePath(); };
    cel(g, sn, { fill: '#ffffff', shade: C.snowS, shadeDx: 3, shadeDy: 3, lw: lw * 0.8, outline: oc });
  }
  if (o.star) {
    // little sugar star on top
    const sy = base - h - 4;
    fill(g, (c) => { c.moveTo(x, sy - 7); c.lineTo(x + 2, sy - 2); c.lineTo(x + 7, sy - 1); c.lineTo(x + 3, sy + 2); c.lineTo(x + 4, sy + 7); c.lineTo(x, sy + 4); c.lineTo(x - 4, sy + 7); c.lineTo(x - 3, sy + 2); c.lineTo(x - 7, sy - 1); c.lineTo(x - 2, sy - 2); c.closePath(); }, '#ffe066');
  }
}
function snowMound(g, x, base, w, h, o) {
  const list = [[x, base - h * 0.4, h * 0.62], [x - w * 0.3, base - h * 0.2, h * 0.5], [x + w * 0.32, base - h * 0.18, h * 0.46], [x - w * 0.12, base - h * 0.5, h * 0.48]];
  const sh = (c) => { circles(list)(c); c.rect(x - w * 0.42, base - h * 0.3, w * 0.84, h * 0.4); };
  unionPart(g, sh, { fill: o.fill || '#ffffff', shade: o.shade || C.snowS, shadeDx: h * 0.18, shadeDy: h * 0.18, light: o.light || null, lightDx: h * 0.08, lightDy: h * 0.1, lw: o.lw, outline: o.outline });
  g.fillStyle = rgba('#ffffff', 0.9);
  sparkle(g, x - w * 0.12, base - h * 0.75, 4, '#ffffff', 0.9);
}
function mid() {
  const H = 380, R = rng(4301);
  const oc = mix(OUTLINE, C.fog, 0.5), lw = 1.9;
  return tiled(W, H, (g) => {
    // glacier shelves (angular ice hills with snow tops)
    const f0 = waves(R, W, 238, [[2, 20], [3, 12], [6, 6]]);
    const shelf = (c) => { c.moveTo(-TM, H + 10); for (let x = -TM; x <= W + TM; x += 24) c.lineTo(x, f0(x) + ((x / 24) % 2 ? 4 : -3)); c.lineTo(W + TM, H + 10); c.closePath(); };
    stroke(g, shelf, lw * 2, oc);
    fill(g, shelf, linearGrad(g, 0, 210, 0, H, [[0, '#c4f0ff'], [0.5, '#98dcf4'], [1, '#7ccbee']]));
    clipTo(g, shelf, () => {
      // facet columns
      for (let i = 0; i < 26; i++) {
        const x = (i + R() * 0.5) * (W / 26), w = 18 + R() * 30;
        wrapAt(g, W, x - w, x + w, () => {
          g.fillStyle = rgba(i % 2 ? '#ffffff' : '#7fc0e6', i % 2 ? 0.35 : 0.22);
          g.beginPath(); g.moveTo(x, f0(x) + 4); g.lineTo(x + w, f0(x + w) + 10); g.lineTo(x + w * 0.7, H + 10); g.lineTo(x - w * 0.2, H + 10); g.closePath(); g.fill();
        });
      }
    });
    // snow blanket on the shelf top
    const snow = (c) => { c.moveTo(-TM, f0(-TM) - 6); for (let x = -TM; x <= W + TM; x += 6) c.lineTo(x, f0(x) - 7 + 2 * Math.sin(TAU * 21 * x / W)); for (let x = W + TM; x >= -TM; x -= 6) c.lineTo(x, f0(x) + 9 + 5 * Math.sin(TAU * 11 * x / W + 1) + 3 * Math.sin(TAU * 32 * x / W)); c.closePath(); };
    stroke(g, snow, lw * 2, oc);
    fill(g, snow, '#ffffff');
    innerShade(g, snow, rgba(C.snowS, 0.9), 0, 5);
    // pines on the shelf
    const pines = [[60, 1.0, 0], [130, 0.7, 1], [420, 1.15, 0], [500, 0.8, 2], [880, 0.95, 0], [940, 0.65, 1], [1240, 1.1, 0], [1320, 0.75, 2], [1460, 0.9, 1]];
    for (const [x, s, k] of pines) wrapAt(g, W, x - 50, x + 50, () => mintPine(g, x, f0(x) + 6, 118 * s, 74 * s, { lw, outline: oc, tiers: s > 0.9 ? 3 : 2, star: s > 1.05, ...SHERBET[k] }));
    // front snow drifts
    const f1 = waves(R, W, 314, [[3, 9], [5, 6], [9, 3]]);
    const drift = (c) => { c.moveTo(-TM, H + 10); for (let x = -TM; x <= W + TM; x += 4) c.lineTo(x, f1(x)); c.lineTo(W + TM, H + 10); c.closePath(); };
    stroke(g, drift, lw * 2, oc);
    fill(g, drift, linearGrad(g, 0, 300, 0, H, [[0, '#ffffff'], [1, '#e2f2fc']]));
    innerShade(g, drift, rgba(C.snowS, 0.8), 70, 8);
  });
}

// ---------------------------------------------------------------------------
// NEAR — snow drifts, little pines, popsicles, ice rocks
// ---------------------------------------------------------------------------
function popsicle(g, x, base, s, col, o) {
  const lw = o.lw, oc = o.outline;
  const st = rrect(x - 4 * s, base - 30 * s, 8 * s, 34 * s, 3 * s);
  cel(g, st, { fill: '#f3d9a8', shade: '#d7b47a', shadeDx: 3 * s, shadeDy: 0, lw, outline: oc });
  const body = rrect(x - 15 * s, base - 78 * s, 30 * s, 54 * s, 13 * s);
  cel(g, body, { fill: col, shade: tone(col, -0.18), shadeDx: 6 * s, shadeDy: 4 * s, light: rgba('#ffffff', 0.6), lightDx: 3 * s, lightDy: 3 * s, lw, outline: oc });
  g.fillStyle = 'rgba(255,255,255,0.8)'; g.beginPath(); g.ellipse(x - 7 * s, base - 62 * s, 3 * s, 9 * s, 0, 0, TAU); g.fill();
  // drip of snow on top
  const cap = (c) => { c.moveTo(x - 15 * s, base - 66 * s); c.quadraticCurveTo(x - 15 * s, base - 80 * s, x, base - 80 * s); c.quadraticCurveTo(x + 15 * s, base - 80 * s, x + 15 * s, base - 66 * s); c.quadraticCurveTo(x + 9 * s, base - 62 * s, x + 6 * s, base - 66 * s); c.quadraticCurveTo(x + 2 * s, base - 58 * s, x - 2 * s, base - 66 * s); c.quadraticCurveTo(x - 9 * s, base - 63 * s, x - 15 * s, base - 66 * s); c.closePath(); };
  cel(g, cap, { fill: '#ffffff', shade: C.snowS, shadeDx: 3, shadeDy: 3, lw, outline: oc });
}
function iceRock(g, R, x, base, w, h, o) {
  const pts = [[x - w / 2, base + 8], [x - w * 0.46, base - h * 0.45], [x - w * 0.2, base - h], [x + w * 0.18, base - h * 0.9], [x + w * 0.48, base - h * 0.4], [x + w / 2, base + 8]];
  const sh = roundPoly(pts, 8);
  cel(g, sh, { fill: C.ice, shade: C.iceD, shadeDx: w * 0.16, shadeDy: h * 0.15, light: rgba('#ffffff', 0.85), lightDx: w * 0.06, lightDy: h * 0.08, lw: o.lw, outline: o.outline });
  clipTo(g, sh, () => { g.strokeStyle = rgba('#ffffff', 0.7); g.lineWidth = 2; g.beginPath(); g.moveTo(x - w * 0.2, base - h + 6); g.lineTo(x - w * 0.05, base - h * 0.3); g.stroke(); });
  glint(g, x - w * 0.25, base - h * 0.7, Math.max(2.5, w * 0.05), -0.5, 0.9);
}
function near() {
  const H = 240, R = rng(4401);
  const oc = mix(OUTLINE, C.fog, 0.32), lw = 2.2;
  return tiled(W, H, (g) => {
    const fs = waves(R, W, H - 32, [[4, 5], [9, 3], [15, 2]]);
    // little pines behind the drift line
    const pines = [[40, 0.8, 0], [330, 1.0, 0], [370, 0.6, 1], [760, 0.85, 2], [1100, 1.05, 0], [1150, 0.7, 1], [1430, 0.9, 0]];
    for (const [x, s, k] of pines) wrapAt(g, W, x - 60, x + 60, () => mintPine(g, x, fs(x) + 10, 132 * s, 86 * s, { lw, outline: oc, tiers: 3, star: s > 1, ...(k ? SHERBET[k] : { col: '#86dcc6', colL: '#c4f4e6', colD: '#4fb59d' }) }));
    // popsicles
    for (const [x, s, col] of [[560, 1, '#ff9cbd'], [600, 0.8, '#ffe17a'], [1270, 0.9, '#b9a2ff']]) wrapAt(g, W, x - 40, x + 40, () => popsicle(g, x, fs(x) + 6, s, col, { lw, outline: oc }));
    // ice rocks
    for (const [x, w, h] of [[200, 80, 50], [880, 110, 64], [1360, 70, 42]]) wrapAt(g, W, x - w, x + w, () => iceRock(g, rng(x), x, fs(x) + 10, w, h, { lw, outline: oc }));
    // snow drift bank (front)
    const bank = (c) => { c.moveTo(-TM, H + 10); for (let x = -TM; x <= W + TM; x += 4) c.lineTo(x, fs(x)); c.lineTo(W + TM, H + 10); c.closePath(); };
    stroke(g, bank, lw * 2, oc);
    fill(g, bank, linearGrad(g, 0, H - 44, 0, H, [[0, '#e3f1fb'], [1, '#c4dcf0']]));
    innerShade(g, bank, rgba('#a9c9e6', 0.9), 50, 6);
    // snow mounds along the bank (in cool shade so the bright ground lip pops)
    for (const [x, w, h] of [[120, 120, 46], [470, 150, 56], [700, 90, 36], [1000, 160, 60], [1210, 100, 40], [1500, 120, 44]]) wrapAt(g, W, x - w, x + w, () => snowMound(g, x, fs(x) + 12, w, h, { lw, outline: oc, fill: '#e9f4fc', shade: '#bcd6ee', light: rgba('#ffffff', 0.9) }));
  });
}

// ---------------------------------------------------------------------------
// CLOUDS — soft snow clouds
// ---------------------------------------------------------------------------
function clouds() {
  const defs = [[400, 150, 7], [320, 124, 6], [250, 100, 5], [200, 84, 4], [150, 64, 3], [300, 80, 6]];
  return defs.map(([w, h, b], i) => ({
    name: `c${i}`, w, h, ax: w / 2, ay: h / 2, meta: { y: [40, 240], speed: 0.03 + i * 0.008 },
    draw: (g) => {
      const R = rng(4500 + i);
      puffCloud(g, w / 2, h * 0.58, w * 0.84, h * (i === 5 ? 0.72 : 0.62), R, { bumps: b, top: '#ffffff', bottom: '#cfe3f2', shade: rgba('#b4cfe6', 0.85) });
    },
  }));
}

// ---------------------------------------------------------------------------
// GROUND — blue sherbet ice under a thick snow lip
// ---------------------------------------------------------------------------
const bodyCanvas = memo(() => {
  const R = rng(4201);
  return tiled(GW, GH, (g) => {
    fill(g, (c) => c.rect(-TM, 0, GW + 2 * TM, GH), linearGrad(g, 0, 40, 0, GH, [[0, '#a9defa'], [0.35, '#86c7ee'], [1, '#5a9fd6']]));
    // soft sherbet bands
    for (const [y, th, col] of [[118, 18, 'rgba(255,198,218,0.28)'], [166, 14, 'rgba(160,236,214,0.3)'], [214, 22, 'rgba(255,241,168,0.22)']]) {
      const f1 = waves(R, GW, y, [[3, 5], [5, 4]]), f2 = waves(R, GW, y + th, [[3, 5], [6, 3]]);
      g.beginPath(); g.moveTo(-TM, f1(-TM)); for (let x = -TM; x <= GW + TM; x += 4) g.lineTo(x, f1(x)); for (let x = GW + TM; x >= -TM; x -= 4) g.lineTo(x, f2(x)); g.closePath();
      g.fillStyle = col; g.fill();
    }
    // ice facets (light polygons)
    const pts = scatter(R, GW, 18, 76, 260, 90);
    for (const [x, y] of pts) {
      const r = 28 + R() * 26, seed = Math.floor(R() * 1e6), light = R() < 0.55;
      wrapAt(g, GW, x - r - 4, x + r + 4, () => {
        const Rp = rng(seed);
        const pp = chunkPts(Rp, x, y, r, 5, 0.35);
        g.fillStyle = light ? 'rgba(255,255,255,0.24)' : 'rgba(50,110,180,0.18)';
        roundPoly(pp, 4)(g); g.beginPath(); roundPoly(pp, 4)(g); g.fill();
        if (light) { g.strokeStyle = 'rgba(255,255,255,0.55)'; g.lineWidth = 2; g.beginPath(); g.moveTo(pp[0][0], pp[0][1]); g.lineTo(pp[1][0], pp[1][1]); g.stroke(); }
      });
    }
    // cracks
    for (let i = 0; i < 9; i++) {
      const x = R() * GW, y = 90 + R() * 150, l = 20 + R() * 30, a = (R() - 0.5) * 1.2, b = (R() - 0.5) * 1.2;
      wrapAt(g, GW, x - 60, x + 60, () => {
        g.strokeStyle = 'rgba(70,140,200,0.45)'; g.lineWidth = 2.2; g.lineCap = 'round';
        g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.lineTo(x + Math.cos(a) * l + Math.cos(b) * l * 0.6, y + Math.sin(a) * l + Math.sin(b) * l * 0.6); g.stroke();
      });
    }
    // bubbles & frozen berries
    for (let i = 0; i < 22; i++) {
      const x = R() * GW, y = 70 + R() * 200, r = 2.5 + R() * 4;
      wrapAt(g, GW, x - 8, x + 8, () => { g.strokeStyle = 'rgba(255,255,255,0.6)'; g.lineWidth = 1.5; g.beginPath(); g.arc(x, y, r, 0, TAU); g.stroke(); g.fillStyle = 'rgba(255,255,255,0.7)'; g.beginPath(); g.arc(x - r * 0.35, y - r * 0.35, r * 0.3, 0, TAU); g.fill(); });
    }
    // glassy vertical streaks
    for (let i = 0; i < 10; i++) {
      const x = R() * GW, w = 6 + R() * 10, y0 = 70 + R() * 60;
      wrapAt(g, GW, x - 30, x + 40, () => { g.fillStyle = 'rgba(255,255,255,0.18)'; g.beginPath(); g.moveTo(x, y0); g.lineTo(x + w, y0); g.lineTo(x + w + 18, GH); g.lineTo(x + 18, GH); g.closePath(); g.fill(); });
    }
    const berries = scatter(R, GW, 5, 110, 240, 160);
    for (const [x, y] of berries) {
      const col = ['#ff6f9a', '#b48cff', '#ff9a4a'][Math.floor(R() * 3)];
      wrapAt(g, GW, x - 14, x + 14, () => { g.globalAlpha = 0.85; candyBall(g, x, y, 7, col, { lw: 3, outline: OUTLINE }); candyBall(g, x + 9, y + 4, 6, col, { lw: 3, outline: OUTLINE }); g.globalAlpha = 1; g.fillStyle = 'rgba(220,245,255,0.35)'; g.beginPath(); g.arc(x + 4, y + 2, 16, 0, TAU); g.fill(); });
    }
  });
});

function bumpFeats(R, period, n, hLo, hHi) {
  const out = []; const step = period / n;
  for (let i = 0; i < n; i++) out.push({ x: (i + 0.5) * step + (R() - 0.5) * step * 0.15, w: step * (0.85 + R() * 0.12), h: hLo + R() * (hHi - hLo) });
  return out;
}
const MAT_G = (() => { const R = rng(4202); return { top: SURF, base: 58, period: GW, rc: 12, bulge: 7, faceDrip: 40, faceInner: 18, topStyle: 'bumps', feats: bumpFeats(R, GW, 18, 3, 6), scal: scallops(R, GW, 20, 8, 14, 0.15, 6, 12) }; })();
const MAT_P = (() => { const R = rng(4203); return { top: 12, base: 28, period: PLAT_MID, rc: 10, bulge: 5, faceDrip: 24, faceInner: 12, topStyle: 'bumps', feats: bumpFeats(R, PLAT_MID, 3, 2.5, 4), scal: scallops(R, PLAT_MID, 4, 5, 9, 0.2, 4, 8) }; })();

function snowPaint(g, shape, M) {
  g.save(); g.translate(1, 6); fill(g, shape, 'rgba(60,120,180,0.25)'); g.restore();
  fill(g, shape, linearGrad(g, 0, M.top - 6, 0, M.base + 20, [[0, '#ffffff'], [0.6, '#f4fbff'], [1, '#dcefff']]));
  innerShade(g, shape, rgba('#a9cdec', 0.9), 4, 7);
  innerLight(g, shape, 'rgba(255,255,255,1)', 0, 4);
  stroke(g, shape, 5, OUTLINE);
}
function icicles(g, M, a, b, e, period, seed, kind) {
  // little rounded icicles under the snow lip (decorative)
  const R = rng(seed);
  const n = kind === 'plat' ? 3 : 16;
  const list = [];
  for (let i = 0; i < n; i++) list.push({ x: (i + 0.2 + R() * 0.6) * (period / n), l: (kind === 'plat' ? 10 : 12) + R() * 10, w: 7 + R() * 4 });
  for (let k = -2; k <= 2; k++) for (const ic of list) {
    const x = ic.x + k * period;
    if (x < a + 12 || x > b - 12 || (e.right != null && x > e.right - 18) || (e.left != null && x < e.left + 18)) continue;
    const y = M.base + 2;
    const sh = (c) => { c.moveTo(x - ic.w / 2, y - 4); c.lineTo(x + ic.w / 2, y - 4); c.quadraticCurveTo(x + ic.w * 0.3, y + ic.l * 0.6, x + 1, y + ic.l); c.quadraticCurveTo(x - ic.w * 0.3, y + ic.l * 0.6, x - ic.w / 2, y - 4); c.closePath(); };
    cel(g, sh, { fill: '#e8f8ff', shade: '#9fd2f0', shadeDx: ic.w * 0.35, shadeDy: 0, lw: 3, outline: OUTLINE });
  }
}
function lip(g, xa, xb, ends, kind, off = 0) {
  const M = kind === 'plat' ? MAT_P : MAT_G;
  g.save(); g.translate(-off, 0);
  const e = {};
  if (ends.left != null) e.left = ends.left + off;
  if (ends.right != null) e.right = ends.right + off;
  const a = xa + off, b = xb + off;
  icicles(g, M, a, b, e, kind === 'plat' ? PLAT_MID : GW, kind === 'plat' ? 4211 : 4210, kind);
  const shape = matPath(M, a, b, e);
  snowPaint(g, shape, M);
  // sparkles on the snow
  const R = rng(4212);
  const period = kind === 'plat' ? PLAT_MID : GW;
  const sp = [];
  for (let i = 0; i < (kind === 'plat' ? 2 : 14); i++) sp.push({ x: R() * period, y: M.top + 4 + R() * (M.base - M.top - 8), r: 3 + R() * 3 });
  for (let k = -2; k <= 2; k++) for (const s of sp) {
    const x = s.x + k * period;
    if (x < a + 8 || x > b - 8 || (e.right != null && x > e.right) || (e.left != null && x < e.left)) continue;
    sparkle(g, x, s.y, s.r, '#ffffff', 0.95);
    sparkle(g, x, s.y, s.r * 0.6, '#bfe6ff', 0.6, 0.785);
  }
  g.restore();
}
function capOut(y) {
  const t = (y - SURF) / (GH - SURF);
  return 4 + 3 * Math.sin(t * Math.PI) + (y > 140 ? 2 : 0);
}
function capFace(g, side, face) {
  const dir = side === 'right' ? 1 : -1;
  g.save();
  // ice block face: smooth, glassy band
  g.beginPath();
  g.moveTo(face(SURF), SURF);
  for (let y = SURF; y <= GH + 10; y += 4) g.lineTo(face(y) - dir * 20, y);
  for (let y = GH + 10; y >= SURF; y -= 4) g.lineTo(face(y) + dir * 20, y);
  g.closePath();
  g.fillStyle = side === 'right' ? 'rgba(70,140,205,0.35)' : 'rgba(255,255,255,0.35)';
  g.fill();
  g.strokeStyle = 'rgba(255,255,255,0.8)'; g.lineWidth = 3; g.lineCap = 'round';
  g.beginPath(); g.moveTo(face(70) - dir * 8, 70); g.lineTo(face(130) - dir * 8, 130); g.stroke();
  g.beginPath(); g.moveTo(face(150) - dir * 12, 150); g.lineTo(face(170) - dir * 12, 170); g.stroke();
  g.restore();
}

// ---------------------------------------------------------------------------
// PLATFORM — floating ice block with snow cap and icicles
// ---------------------------------------------------------------------------
const platBottom = (px) => 64 + 3 * Math.sin((TAU * px) / 128 + 1.4) + 2 * Math.sin((TAU * px * 4) / 128 + 0.2);
function platBody(g, shape, { off, w }) {
  fill(g, shape, linearGrad(g, 0, 14, 0, 72, [[0, '#d6f3ff'], [0.5, '#aee0f8'], [1, '#86c4ea']]));
  clipTo(g, shape, () => {
    platRepeat(30, off, 0, w, (x) => { g.fillStyle = 'rgba(255,255,255,0.35)'; g.beginPath(); g.moveTo(x, 30); g.lineTo(x + 26, 34); g.lineTo(x + 14, 66); g.lineTo(x - 6, 62); g.closePath(); g.fill(); });
    platRepeat(92, off, 0, w, (x) => { g.fillStyle = 'rgba(255,198,218,0.35)'; g.fillRect(x - 30, 46, 60, 6); });
    platRepeat(70, off, 0, w, (x) => { g.strokeStyle = 'rgba(255,255,255,0.7)'; g.lineWidth = 1.5; g.beginPath(); g.arc(x, 54, 3, 0, TAU); g.stroke(); });
  });
  innerShade(g, shape, 'rgba(60,120,190,0.4)', 4, 7);
  stroke(g, shape, 5, OUTLINE);
}

export const GLACIER = {
  id: 'glacier',
  sky: ['#8bd5f7', '#c4ebfc', '#f0fbff'],
  fog: C.fog,
  ambient: 'snow',
  pit: '#2c5d8a',
  farH: 420, midH: 380, nearH: 240, midBottom: 610, nearBottom: 612,
  far: memo(far), mid: memo(mid), near: memo(near), clouds,
  bodyCanvas, lip, capOut, capFace, capTexX: 380,
  platBottom, platBody,
  ground: memo(() => makeGround(GLACIER)),
  cap: true, caps: () => makeCaps(GLACIER),
  plat: true, plats: () => makePlats(GLACIER),
};
