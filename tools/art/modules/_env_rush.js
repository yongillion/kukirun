// =============================================================================
//  Bonus — Sugar Rush (슈가 러시): cotton-candy sky, rainbows, cloud floor
// =============================================================================
import {
  rng, tone, mix, rgba, OUTLINE, fill, stroke, clipTo, innerShade, innerLight, gloss, glint, glow,
  sparkle, poly, circle, ellipse, rrect, star, linearGrad, radialGrad, lerp, clamp, TAU,
  tiled, wrapAt, TM, waves, circles, unionPart, cel, hazeOnPaint, scallops, sprinkle, lollipop,
  candyBall, puffCloud, shadeU, lightU, SPRINKLE_COLS,
} from './_env_kit.js';
import { GW, GH, SURF, makeGround, matPath, edgeTop } from './_env_land.js';
import { scatter, memo } from './_env_util.js';

const W = 1536;
const C = { fog: '#ffe4f3', pink: '#ffb3df', pinkD: '#f08ac6', lilac: '#d9b8ff', peach: '#ffd2b0', mint: '#b8f2e6', cream: '#fff7fb' };

/** Periodic cloud mass along a band (circles), cel-shaded. */
function cloudMass(g, R, o) {
  const N = o.n, step = W / N, tab = [];
  for (let i = 0; i < N; i++) tab.push({ dy: (R() - 0.5) * o.amp * 2, r: o.r[0] + R() * (o.r[1] - o.r[0]) });
  const list = [];
  for (let i = -4; i < N + 4; i++) { const t = tab[((i % N) + N) % N]; list.push([i * step, o.y + t.dy, t.r]); }
  const sh = (c) => { circles(list)(c); c.rect(-TM - 20, o.y, W + 2 * TM + 40, o.H + 40); };
  if (o.lw) stroke(g, sh, o.lw * 2, o.outline);
  fill(g, sh, linearGrad(g, 0, o.y - o.r[1], 0, o.y + o.H, [[0, o.top], [1, o.bottom]]));
  shadeU(g, sh, rgba(o.shade, o.shadeA ?? 0.6), o.r[0] * 0.3, o.r[0] * 0.3);
  lightU(g, sh, rgba('#ffffff', o.rimA ?? 0.7), o.r[0] * 0.12, o.r[0] * 0.16);
  return list;
}

function far() {
  const H = 420, R = rng(6101);
  return tiled(W, H, (g) => {
    // towering cotton-candy cloud mountains (soft, no outlines)
    const peaks = [[150, 120, 200, C.lilac], [520, 160, 170, C.pink], [860, 100, 230, C.peach], [1230, 140, 190, C.pink], [1450, 190, 130, C.lilac]];
    for (const [x, top, r, col] of peaks) wrapAt(g, W, x - r * 1.6, x + r * 1.6, () => {
      const Rr = rng(Math.round(x));
      const list = [[x, top + r * 0.7, r * 0.62], [x - r * 0.6, top + r * 1.05, r * 0.55], [x + r * 0.62, top + r * 1.0, r * 0.58], [x - r * 1.1, top + r * 1.4, r * 0.5], [x + r * 1.15, top + r * 1.38, r * 0.52], [x + (Rr() - 0.5) * r * 0.3, top + r * 0.32, r * 0.42]];
      const sh = (c) => { circles(list)(c); c.rect(x - r * 1.5, top + r * 1.3, r * 3, H); };
      const c0 = mix(col, C.fog, 0.35);
      fill(g, sh, linearGrad(g, 0, top, 0, H, [[0, mix(c0, '#ffffff', 0.35)], [0.6, c0], [1, mix(c0, C.fog, 0.5)]]));
      shadeU(g, sh, rgba(tone(col, -0.12), 0.35), r * 0.16, r * 0.14);
      lightU(g, sh, rgba('#ffffff', 0.55), r * 0.06, r * 0.08);
    });
    hazeOnPaint(g, -TM, W + TM, 160, 330, C.fog, 0, 0.35);
    cloudMass(g, R, { n: 26, y: 300, amp: 16, r: [40, 70], H: 140, top: '#fff2fa', bottom: mix(C.pink, C.fog, 0.4), shade: '#f3a6d4', shadeA: 0.45, rimA: 0.6 });
    // floating sparkles
    for (let i = 0; i < 30; i++) {
      const x = R() * W, y = 40 + R() * 260, r = 3 + R() * 6;
      wrapAt(g, W, x - 12, x + 12, () => sparkle(g, x, y, r, '#ffffff', 0.85));
    }
    hazeOnPaint(g, -TM, W + TM, 300, H, C.fog, 0, 0.4);
  });
}

function gumdrop(g, x, y, r, col, o) {
  const gd = (c) => { c.moveTo(x - r, y); c.bezierCurveTo(x - r, y - r * 1.9, x + r, y - r * 1.9, x + r, y); c.quadraticCurveTo(x, y + r * 0.2, x - r, y); c.closePath(); };
  cel(g, gd, { fill: col, shade: tone(col, -0.2), shadeDx: r * 0.3, shadeDy: r * 0.2, light: rgba('#ffffff', 0.5), lightDx: r * 0.15, lightDy: r * 0.15, lw: o.lw, outline: o.outline });
  const R = rng(Math.round(x * 3 + y));
  for (let d = 0; d < 6; d++) { g.fillStyle = 'rgba(255,255,255,0.85)'; g.beginPath(); g.arc(x + (R() - 0.5) * r * 1.2, y - r * 0.25 - R() * r * 0.9, 1.6, 0, TAU); g.fill(); }
  glint(g, x - r * 0.4, y - r * 0.95, r * 0.16, -0.7, 0.85);
}
function candyStar(g, x, y, r, col, o) {
  cel(g, star(x, y, r, r * 0.5, 5, -Math.PI / 2 + (o.rot || 0), 0.7), { fill: col, shade: tone(col, -0.2), shadeDx: r * 0.25, shadeDy: r * 0.25, light: rgba('#ffffff', 0.6), lightDx: r * 0.12, lightDy: r * 0.12, lw: o.lw, outline: o.outline });
  glint(g, x - r * 0.25, y - r * 0.3, r * 0.15, -0.6, 0.85);
}

function mid() {
  const H = 380, R = rng(6301);
  const oc = mix(OUTLINE, C.fog, 0.45), lw = 2;
  return tiled(W, H, (g) => {
    // floating candy bits in the air
    const bits = [[120, 120, 'star', '#ffd55a', 18], [380, 70, 'gum', '#9be7ff', 16], [700, 140, 'star', '#ff8fc8', 14], [980, 90, 'gum', '#ffd36b', 15], [1260, 130, 'star', '#b9a2ff', 17], [1440, 60, 'gum', '#ff9cc2', 14]];
    for (const [x, y, k, col, r] of bits) wrapAt(g, W, x - 40, x + 40, () => { glow(g, x, y - r * 0.4, r * 3, '#ffffff', 0.4); if (k === 'star') candyStar(g, x, y, r, col, { lw, outline: oc, rot: x * 0.01 }); else gumdrop(g, x, y, r, col, { lw, outline: oc }); });
    // lollipops poking out of the clouds
    for (const [x, h, r, a, b] of [[260, 150, 30, '#ff7eb6', '#ffffff'], [880, 120, 26, '#7fd8ff', '#ffffff'], [1330, 170, 34, '#ffb347', '#fff3b0']]) wrapAt(g, W, x - 50, x + 50, () => lollipop(g, x, 330, h + 60, r, { a, b, lw, outline: oc, turns: 1.2, rot: x * 0.01, ribbon: '#ff6f9a' }));
    // big puffy cloud band
    cloudMass(g, R, { n: 22, y: 250, amp: 22, r: [46, 76], H: 200, top: '#ffe2f2', bottom: '#f4b0d8', shade: '#e286c0', shadeA: 0.6, rimA: 0.75, lw, outline: oc });
    // sprinkles on the clouds
    for (let i = 0; i < 16; i++) {
      const x = R() * W, y = 250 + R() * 110, rot = R() * TAU, col = SPRINKLE_COLS[Math.floor(R() * 6)];
      wrapAt(g, W, x - 8, x + 8, () => sprinkle(g, x, y, 9, 3.4, rot, col, rgba(OUTLINE, 0.35)));
    }
  });
}

function near() {
  const H = 240, R = rng(6401);
  const oc = mix(OUTLINE, C.fog, 0.3), lw = 2.2;
  return tiled(W, H, (g) => {
    for (const [x, y, col, r] of [[200, 120, '#ffd55a', 16], [760, 100, '#ff8fc8', 13], [1180, 130, '#9be7ff', 15]]) wrapAt(g, W, x - 30, x + 30, () => { glow(g, x, y, 44, '#ffffff', 0.5); candyStar(g, x, y, r, col, { lw, outline: oc, rot: 0.2 }); });
    cloudMass(g, R, { n: 30, y: H - 50, amp: 14, r: [28, 46], H: 80, top: '#f4e4ff', bottom: '#dcc0f2', shade: '#c29ee0', shadeA: 0.7, rimA: 0.85, lw, outline: oc });
    for (let i = 0; i < 12; i++) {
      const x = R() * W, y = H - 50 + R() * 40, rot = R() * TAU, col = SPRINKLE_COLS[Math.floor(R() * 6)];
      wrapAt(g, W, x - 8, x + 8, () => sprinkle(g, x, y, 10, 3.8, rot, col, rgba(OUTLINE, 0.4)));
    }
  });
}

function clouds() {
  const items = [];
  const defs = [[380, 150, 7, '#ffe6f5', '#ffb0dc'], [300, 120, 6, '#fff0e0', '#ffc2a6'], [240, 100, 5, '#f3e6ff', '#cfaaff'], [190, 84, 4, '#ffe6f5', '#ffb0dc'], [150, 64, 3, '#e6fbff', '#a8e6f6']];
  defs.forEach(([w, h, b, top, bot], i) => items.push({
    name: `c${i}`, w, h, ax: w / 2, ay: h / 2, meta: { y: [40, 300], speed: 0.06 + i * 0.01 },
    draw: (g) => puffCloud(g, w / 2, h * 0.58, w * 0.84, h * 0.62, rng(6500 + i), { bumps: b, top, bottom: bot, shade: rgba(tone(bot, -0.08), 0.75) }),
  }));
  items.push({
    name: 'rainbow', w: 760, h: 400, ax: 380, ay: 360, meta: { y: 420, fixed: true, note: 'anchor = arc centre bottom' },
    draw: (g) => {
      const cx = 380, cy = 380;
      const bands = ['#ff8aa8', '#ffb07a', '#ffe27a', '#9cebaa', '#8fd2ff', '#c3a2ff'];
      const r0 = 330, bw = 22;
      g.save(); g.globalAlpha = 0.85;
      bands.forEach((col, i) => {
        const r = r0 - i * bw;
        g.beginPath(); g.arc(cx, cy, r, Math.PI, 0); g.arc(cx, cy, r - bw, 0, Math.PI, true); g.closePath();
        g.fillStyle = col; g.fill();
      });
      g.restore();
      // soft inner gloss
      g.save(); g.globalAlpha = 0.35; g.strokeStyle = '#ffffff'; g.lineWidth = 6;
      g.beginPath(); g.arc(cx, cy, r0 - 6, Math.PI * 1.05, Math.PI * 1.6); g.stroke(); g.restore();
      // cloud puffs at both feet
      for (const fx of [cx - r0 + 66, cx + r0 - 66]) puffCloud(g, fx, cy - 20, 170, 74, rng(Math.round(fx)), { bumps: 4, top: '#ffffff', bottom: '#ffd9ef', shade: rgba('#f3b0d8', 0.8) });
    },
  });
  return items;
}

// ground: fluffy cloud floor
const PUFF_OC = mix(OUTLINE, '#f08ac6', 0.45);
function puffRow(g, R, y, rr, cols, o = {}) {
  const N = o.n ?? 14, step = GW / N, tab = [];
  for (let i = 0; i < N; i++) tab.push({ dy: (R() - 0.5) * (o.amp ?? 14), r: rr[0] + R() * (rr[1] - rr[0]) });
  const list = [];
  for (let i = -3; i < N + 3; i++) { const t = tab[((i % N) + N) % N]; list.push([i * step + (o.off ?? 0), y + t.dy, t.r]); }
  const sh = (c) => { circles(list)(c); c.rect(-TM - 20, y, GW + 2 * TM + 40, GH); };
  if (o.outline) stroke(g, sh, 7, PUFF_OC);
  fill(g, sh, linearGrad(g, 0, y - rr[1], 0, y + rr[1], [[0, cols[0]], [1, cols[1]]]));
  shadeU(g, sh, rgba(cols[2], 0.8), rr[0] * 0.22, rr[0] * 0.28);
  lightU(g, sh, rgba('#ffffff', 0.95), rr[0] * 0.1, rr[0] * 0.14);
}
const bodyCanvas = memo(() => {
  const R = rng(6201);
  return tiled(GW, GH, (g) => {
    fill(g, (c) => c.rect(-TM, 0, GW + 2 * TM, GH), linearGrad(g, 0, 40, 0, GH, [[0, '#fff3fa'], [1, '#f9c4e4']]));
    puffRow(g, R, 128, [48, 70], ['#fffafd', '#ffe6f4', '#f6bede'], { n: 11, off: 20 });
    puffRow(g, R, 206, [52, 74], ['#fff0f8', '#ffd6ec', '#f2aed4'], { n: 10, off: 70 });
    puffRow(g, R, 272, [54, 76], ['#ffe2f2', '#fcc6e4', '#eea0cc'], { n: 9, off: 10 });
    for (let i = 0; i < 8; i++) {
      const x = R() * GW, y = 100 + R() * 150, rot = R() * TAU, col = SPRINKLE_COLS[Math.floor(R() * 6)];
      wrapAt(g, GW, x - 10, x + 10, () => sprinkle(g, x, y, 13, 5, rot, col, rgba(OUTLINE, 0.6)));
    }
    for (let i = 0; i < 14; i++) {
      const x = R() * GW, y = 90 + R() * 170, r = 4 + R() * 5;
      wrapAt(g, GW, x - 10, x + 10, () => sparkle(g, x, y, r, '#ffffff', 0.9));
    }
  });
});
function bumpFeats(R, period, n, hLo, hHi) {
  const out = []; const step = period / n;
  for (let i = 0; i < n; i++) out.push({ x: (i + 0.5) * step, w: step * (0.94 + R() * 0.04), h: hLo + R() * (hHi - hLo) });
  return out;
}
const MAT_G = (() => { const R = rng(6202); return { top: SURF, base: 74, period: GW, rc: 12, bulge: 6, faceDrip: 40, faceInner: 18, topStyle: 'bumps', feats: bumpFeats(R, GW, 9, 9, 13), scal: scallops(R, GW, 9, 10, 16, 0, 0, 0) }; })();
function lip(g, xa, xb, ends, kind, off = 0) {
  const M = MAT_G;
  const shape = matPath(M, xa, xb, ends);
  fill(g, shape, linearGrad(g, 0, M.top - 14, 0, M.base + 20, [[0, '#ffffff'], [0.6, '#fff8fc'], [1, '#fff0f8']]));
  innerShade(g, shape, rgba('#f6c2e0', 0.75), 8, 10);
  innerLight(g, shape, 'rgba(255,255,255,1)', 0, 6);
  // outline only the top edge: the floor reads as one fluffy mass, the surface stays crisp
  g.save(); g.beginPath(); g.moveTo(xa, M.top); edgeTop(g, M, xa, xb); g.lineWidth = 5; g.strokeStyle = OUTLINE; g.lineJoin = 'round'; g.lineCap = 'round'; g.stroke(); g.restore();
  const R = rng(6210);
  for (let i = 0; i < 9; i++) {
    const x = R() * GW, y = M.top + 8 + R() * 14, r = 3 + R() * 3;
    for (let k = -1; k <= 1; k++) { const xx = x + k * GW; if (xx > xa + 6 && xx < xb - 6) sparkle(g, xx, y, r, '#ffffff', 0.95); }
  }
}

export const RUSH = {
  id: 'rush',
  sky: ['#ff8ad8', '#ffd9f0', '#ffe8a8'],
  fog: C.fog,
  ambient: 'sparkles',
  pit: '#f08ac6',
  farH: 420, midH: 380, nearH: 240, midBottom: 610, nearBottom: 612,
  far: memo(far), mid: memo(mid), near: memo(near), clouds,
  bodyCanvas, lip,
  ground: memo(() => makeGround(RUSH)),
  cap: false, plat: false,
};
