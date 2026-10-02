// =============================================================================
//  Dessert Dash — shared candy-object kit for the `items`, `fx` and `ui`
//  modules (underscore = helper, not an export module).
//
//  Every object drawer here works in a NOMINAL local box (roughly -50..50 units,
//  centred on 0,0). Callers position/scale it with place(c, cx, cy, k, fn); the
//  outline width is passed in LOCAL units (lw = px / k) so every sprite gets the
//  same on-screen outline weight whatever its size.
//  Light from the top-left: shade crescents bottom-right, glints top-left.
// =============================================================================
import {
  OUTLINE, TAU, tone, mix, rgba, fill, stroke, clipTo, innerShade, innerLight,
  gloss, glint, glow, sparkle, linearGrad, radialGrad, circle, ellipse, rrect, poly, smooth, canvas, ctx2d,
} from '../lib.js';

// ---------------------------------------------------------------------------
// Placement / generic helpers
// ---------------------------------------------------------------------------
/** translate + uniform scale, run fn(lwFactor) where lwFactor converts px -> local units */
export function place(c, cx, cy, k, fn, rot = 0) {
  c.save();
  c.translate(cx, cy);
  if (rot) c.rotate(rot);
  c.scale(k, k);
  fn(1 / k);
  c.restore();
}

/** Rounded polygon: each corner i is cut at fraction f[i] (<= 0.5) of its edges and
 *  replaced by a quadratic curve through the corner as control point. */
export function roundPoly(pts, f = 0.3) {
  return (c) => {
    const n = pts.length;
    const F = (i) => (Array.isArray(f) ? f[((i % n) + n) % n] : f);
    const at = (p, q, t) => [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t];
    const s = at(pts[0], pts[1 % n], F(0));
    c.moveTo(s[0], s[1]);
    for (let k = 1; k <= n; k++) {
      const i = k % n;
      const v = pts[i], prev = pts[(i - 1 + n) % n], next = pts[(i + 1) % n];
      const a = at(v, prev, F(i)), b = at(v, next, F(i));
      c.lineTo(a[0], a[1]);
      c.quadraticCurveTo(v[0], v[1], b[0], b[1]);
    }
    c.closePath();
  };
}

export function starPts(cx, cy, ro, ri, n = 5, rot = -Math.PI / 2) {
  const pts = [];
  for (let i = 0; i < n * 2; i++) {
    const r = i % 2 ? ri : ro;
    const a = rot + (i * Math.PI) / n;
    pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
  }
  return pts;
}
/** Plump star with rounded tips and softened valleys. */
export const puffyStar = (cx, cy, ro, ri, n = 5, rot = -Math.PI / 2, fTip = 0.3, fVal = 0.2) =>
  roundPoly(starPts(cx, cy, ro, ri, n, rot), Array.from({ length: n * 2 }, (_, i) => (i % 2 ? fVal : fTip)));

/** Union-safe crescent: paints (shape minus shape shifted by (sx, sy)) in `color`.
 *  Unlike lib innerShade/innerLight (even-odd trick) this also works for shapes
 *  made of several overlapping sub-paths (icons, glyphs, letters). */
export function crescent(c, shape, color, sx, sy, alpha = 1) {
  const W = c.canvas.width, H = c.canvas.height;
  const L = canvas(W, H), g = ctx2d(L);
  g.setTransform(c.getTransform());
  g.fillStyle = color; g.beginPath(); shape(g); g.fill();
  g.globalCompositeOperation = 'destination-out';
  g.translate(sx, sy); g.beginPath(); shape(g); g.fillStyle = '#000'; g.fill();
  c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.globalAlpha *= alpha; c.drawImage(L, 0, 0); c.restore();
}
/** shade crescent bottom-right (like innerShade) */
export const shadeIn = (c, shape, color, dx, dy, alpha = 1) => crescent(c, shape, color, -dx, -dy, alpha);
/** light crescent top-left (like innerLight) */
export const lightIn = (c, shape, color, dx, dy, alpha = 1) => crescent(c, shape, color, dx, dy, alpha);

/** Region inside `outer` minus `cut` (both shapes), filled with style. */
export function fillMinus(c, outer, cut, style) {
  c.save();
  c.beginPath(); outer(c); c.clip();
  c.beginPath(); c.rect(-1e5, -1e5, 2e5, 2e5); cut(c);
  c.fillStyle = style; c.fill('evenodd');
  c.restore();
}

/** Stroke a shape but only the part INSIDE the shape (inner rim lines). */
export function strokeInside(c, shape, lw, color) {
  clipTo(c, shape, () => stroke(c, shape, lw * 2, color));
}

/** Glossy cartoon highlight band: crescent along the top-left of a circle-ish shape. */
export function rimGloss(c, shape, d, alpha = 0.8) {
  innerLight(c, shape, '#ffffff', d, d, alpha);
}

/** Generic cel-shaded candy body (base gradient, shade, caustic, rim light, gloss, outline). */
export function candyBody(c, shape, pal, R, lw, o = {}) {
  const cx = o.cx ?? 0, cy = o.cy ?? 0;
  const top = pal.top ?? mix(pal.base, '#ffffff', 0.3);
  const bot = pal.bot ?? pal.base;
  fill(c, shape, linearGrad(c, cx - R * 0.3, cy - R, cx + R * 0.3, cy + R, [[0, top], [0.5, pal.base], [1, bot]]));
  shadeIn(c, shape, pal.shade, R * (o.sdx ?? 0.16), R * (o.sdy ?? 0.2), o.shadeAlpha ?? 1);
  if (pal.deep && o.deep !== false) shadeIn(c, shape, pal.deep, R * (o.ddx ?? 0.06), R * (o.ddy ?? 0.075), 0.9);
  if (o.caustic !== false) clipTo(c, shape, () => glow(c, cx + R * (o.cauX ?? 0.3), cy + R * (o.cauY ?? 0.45), R * 0.5, pal.light, o.cauA ?? 0.55));
  if (o.rim !== false) lightIn(c, shape, pal.rim ?? '#ffffff', R * (o.rimD ?? 0.09), R * (o.rimD ?? 0.09), o.rimAlpha ?? 0.45);
  if (o.inner) o.inner();
  if (o.gloss !== false) {
    const gx = cx + R * (o.gx ?? -0.38), gy = cy + R * (o.gy ?? -0.42);
    clipTo(c, shape, () => gloss(c, gx + R * 0.06, gy + R * 0.06, R * 0.42, R * 0.24, -0.75, 0.42));
    glint(c, gx, gy, R * (o.gs ?? 0.17), -0.75, 0.96);
  }
  if (!o.noOutline) stroke(c, shape, lw, o.outline ?? OUTLINE);
}

// ---------------------------------------------------------------------------
// Palettes
// ---------------------------------------------------------------------------
export const PAL = {
  lemon: { base: '#ffe047', top: '#fff3a1', bot: '#ffd23a', shade: '#f6a823', deep: '#e3861a', light: '#fff8c8' },
  pink: { base: '#ff6fae', top: '#ffb3d6', bot: '#ff5c9f', shade: '#e23d84', deep: '#c22a6c', light: '#ffd6ea' },
  gold: { base: '#ffc21f', top: '#ffe78a', bot: '#ffb31a', shade: '#f18a12', deep: '#d2650c', light: '#fff2b0' },
  choco: { base: '#7b4427', top: '#9c5c36', bot: '#6b3820', shade: '#4d2716', deep: '#3a1c0f', light: '#b47548' },
  red: { base: '#ff4f5e', top: '#ff8e95', bot: '#f2404f', shade: '#cc2a3f', deep: '#a8203a', light: '#ffc0c4' },
  mint: { base: '#5fe0b9', top: '#b0f5df', bot: '#47d3a8', shade: '#22a98a', deep: '#178a73', light: '#d2fff1' },
  sky: { base: '#58b9ff', top: '#a8dcff', bot: '#45a8f5', shade: '#2f7fd8', deep: '#2462b8', light: '#d4eeff' },
  purple: { base: '#a77bff', top: '#d0b8ff', bot: '#9568f5', shade: '#7448d6', deep: '#5a33b3', light: '#e6dcff' },
  orange: { base: '#ff9a35', top: '#ffc883', bot: '#ff8a26', shade: '#e36414', deep: '#c24c0f', light: '#ffe1b8' },
  cream: { base: '#fff7ea', top: '#ffffff', bot: '#fbefdc', shade: '#e8d3bd', deep: '#d5bca4', light: '#ffffff' },
  white: { base: '#fffdf8', top: '#ffffff', bot: '#f7f3ff', shade: '#d9d3ec', deep: '#c4bce0', light: '#ffffff' },
  silverMetal: { base: '#dfe6f0', top: '#ffffff', bot: '#cdd7e4', shade: '#a2afc4', deep: '#8794ad', light: '#ffffff' },
};

// ---------------------------------------------------------------------------
// Jellies
// ---------------------------------------------------------------------------
/** Plump gummy drop, tip up and slightly curled to the right. Bottom circle radius r at (cx, cy). */
export const gummyDrop = (cx, cy, r, tip = 0.62, curl = 0.16) => (c) => {
  const tx = cx + curl * r, ty = cy - r * (1 + tip);
  c.moveTo(tx, ty);
  c.bezierCurveTo(tx + r * 0.18, ty + r * 0.34, cx + r * 1.0, cy - r * 0.62, cx + r, cy);
  c.arc(cx, cy, r, 0, Math.PI, false);
  c.bezierCurveTo(cx - r, cy - r * 0.72, tx - r * 0.5, ty + r * 0.22, tx, ty);
  c.closePath();
};

/** Classic gumdrop: wide flat-ish bottom, softly flared sides, round dome. */
export const gumdrop = (cx, cy, w, h) => {
  const x0 = cx - w / 2, x1 = cx + w / 2, yb = cy + h / 2, yt = cy - h / 2;
  return roundPoly([
    [x0, yb], [x0 + w * 0.06, yt + h * 0.42], [cx - w * 0.3, yt + h * 0.02], [cx, yt - h * 0.06],
    [cx + w * 0.3, yt + h * 0.02], [x1 - w * 0.06, yt + h * 0.42], [x1, yb],
  ], [0.22, 0.5, 0.5, 0.5, 0.5, 0.5, 0.22]);
};

/** Small yellow gummy drop (`jelly`). Nominal size ~ r 30 drop. */
export function drawDropJelly(c, lw, pal = PAL.lemon) {
  const sh = gummyDrop(0, 9, 34, 0.36, 0.14);
  candyBody(c, sh, pal, 36, lw, { cy: 3, sdx: 0.2, sdy: 0.16, cauX: 0.3, cauY: 0.55, gx: -0.36, gy: -0.3, gs: 0.2 });
}

/** Pink gumdrop (`jelly_pink`) with sugar crystals. */
export function drawGumdropJelly(c, lw, pal = PAL.pink, seedRand = null) {
  const sh = gumdrop(0, 3, 76, 70);
  candyBody(c, sh, pal, 38, lw, {
    cy: 2, sdx: 0.2, sdy: 0.12, cauX: 0.32, cauY: 0.5, gx: -0.42, gy: -0.36, gs: 0.2,
    inner: () => {
      // a lighter "sugar band" across the dome bottom & a few sugar crystals
      clipTo(c, sh, () => {
        c.fillStyle = rgba(pal.deep, 0.22);
        c.beginPath(); c.ellipse(0, 40, 46, 9, 0, 0, TAU); c.fill();
        const dots = [[-14, -8, 2.6], [10, -14, 2.4], [20, 6, 2.6], [-24, 14, 2.2], [2, 10, 2.6], [-6, 26, 2.2], [24, 24, 2.0], [-30, -2, 1.8]];
        for (const [x, y, r] of dots) {
          c.fillStyle = rgba('#ffffff', 0.85);
          c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill();
        }
      });
    },
  });
}

/** Puffy 5-point star candy. ro = tip radius (local). */
export function drawStarCandy(c, lw, ro = 46, pal = PAL.lemon, o = {}) {
  const ri = ro * (o.ratio ?? 0.56);
  const oy = ro * 0.06;
  const sh = puffyStar(0, oy, ro, ri, 5, -Math.PI / 2, o.fTip ?? 0.3, o.fVal ?? 0.24);
  candyBody(c, sh, pal, ro * 0.85, lw, {
    cy: oy, sdx: 0.17, sdy: 0.2, cauX: 0.25, cauY: 0.38, gx: -0.36, gy: -0.32, gs: 0.2,
    inner: () => {
      // embossed inner star (bevel): lighter centre facet
      const inner = puffyStar(0, oy + ro * 0.02, ro * 0.5, ri * 0.5, 5, -Math.PI / 2, 0.3, 0.24);
      c.save();
      c.globalAlpha = o.bevelAlpha ?? 0.7;
      fill(c, inner, linearGrad(c, -ro * 0.4, -ro * 0.4, ro * 0.4, ro * 0.4, [[0, pal.light], [1, rgba(pal.light, 0.2)]]));
      c.restore();
      if (o.extraInner) o.extraInner();
    },
  });
}

/** Rainbow spiral wedges filling a disc of radius R (clip it yourself). */
export function swirlFill(c, cx, cy, R, colors, twist = 2.4, rot = 0) {
  const arms = colors.length;
  const steps = 40;
  for (let i = 0; i < arms; i++) {
    const a0 = rot + (i * TAU) / arms, a1 = rot + ((i + 1) * TAU) / arms;
    c.beginPath();
    c.moveTo(cx, cy);
    for (let s = 1; s <= steps; s++) {
      const t = s / steps, r = R * t, a = a0 + twist * t;
      c.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
    }
    c.arc(cx, cy, R, a0 + twist, a1 + twist);
    for (let s = steps; s >= 0; s--) {
      const t = s / steps, r = R * t, a = a1 + twist * t;
      c.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
    }
    c.closePath();
    c.fillStyle = colors[i];
    c.fill();
  }
}
export const RAINBOW = ['#ff5a6e', '#ff9a3c', '#ffd93d', '#6fdc5a', '#3cc4ff', '#9a7bff'];

/** Paint `paint(g)` clipped to (shape minus shape shifted by (sx, sy)) — a crescent of
 *  arbitrary artwork (used to shade multi-coloured candies with darker hues). */
export function crescentPaint(c, shape, sx, sy, paint, alpha = 1) {
  const L = canvas(c.canvas.width, c.canvas.height), g = ctx2d(L);
  g.setTransform(c.getTransform());
  g.save(); g.beginPath(); shape(g); g.clip(); paint(g); g.restore();
  g.globalCompositeOperation = 'destination-out';
  g.translate(sx, sy); g.beginPath(); shape(g); g.fillStyle = '#000'; g.fill();
  c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.globalAlpha *= alpha; c.drawImage(L, 0, 0); c.restore();
}
const isWhite = (col) => col.toLowerCase() === '#ffffff';
const darker = (col) => (isWhite(col) ? '#e7defa' : tone(col, -0.2));
const deeper = (col) => (isWhite(col) ? '#cfc2f0' : tone(col, -0.36));

/** Multi-colour candy body: base swirl, darker-hue shade crescents, light rim, gloss, outline. */
function swirlBody(c, sh, R, paint, lw, cx = 0, cy = 0, o = {}) {
  clipTo(c, sh, () => paint(c, (x) => x));
  crescentPaint(c, sh, -R * 0.16, -R * 0.19, (g) => paint(g, darker));
  crescentPaint(c, sh, -R * 0.055, -R * 0.065, (g) => paint(g, deeper), 0.9);
  lightIn(c, sh, '#ffffff', R * 0.1, R * 0.1, 0.55);
  clipTo(c, sh, () => {
    glow(c, cx, cy, R * 0.55, '#ffffff', o.coreA ?? 0.3);
    gloss(c, cx - R * 0.32, cy - R * 0.36, R * 0.46, R * 0.25, -0.75, 0.6);
  });
  glint(c, cx - R * 0.4, cy - R * 0.42, R * 0.15, -0.75, 0.98);
  stroke(c, sh, lw, OUTLINE);
}

export function drawRainbowStar(c, lw, ro = 46) {
  const ri = ro * 0.56, oy = ro * 0.06;
  const sh = puffyStar(0, oy, ro, ri, 5, -Math.PI / 2, 0.3, 0.24);
  const tw = 3.3, rot = -Math.PI / 2 - 0.4;
  const paint = (g, map) => {
    swirlFill(g, 0, oy, ro * 1.25, RAINBOW.map(map), tw, rot);
    g.strokeStyle = map('#ffffff'); g.lineWidth = ro * 0.075; g.lineCap = 'round'; g.lineJoin = 'round';
    for (let i = 0; i < RAINBOW.length; i++) {
      const a0 = rot + (i * TAU) / RAINBOW.length;
      g.beginPath();
      for (let s = 3; s <= 48; s++) {
        const t = s / 48, r = ro * 1.25 * t, a = a0 + tw * t;
        const x = Math.cos(a) * r, y = oy + Math.sin(a) * r;
        if (s === 3) g.moveTo(x, y); else g.lineTo(x, y);
      }
      g.stroke();
    }
    g.fillStyle = map('#ffffff'); g.beginPath(); g.arc(0, oy, ro * 0.09, 0, TAU); g.fill();
  };
  swirlBody(c, sh, ro * 0.85, paint, lw, 0, oy);
}

export function drawSwirlDisc(c, lw, R = 46, o = {}) {
  const sh = circle(0, 0, R);
  const cols = o.colors ?? ['#ff5a6e', '#ffffff', '#ff9a3c', '#ffd93d', '#ffffff', '#6fdc5a', '#3cc4ff', '#ffffff', '#9a7bff'];
  const paint = (g, map) => {
    swirlFill(g, 0, 0, R * 1.02, cols.map(map), o.twist ?? 3.6, o.rot ?? 0);
    g.save(); g.beginPath(); sh(g); g.clip(); g.beginPath(); sh(g); g.lineWidth = R * 0.12; g.strokeStyle = rgba('#ffffff', 0.5); g.stroke(); g.restore();
  };
  swirlBody(c, sh, R, paint, lw, 0, 0, { coreA: 0.22 });
}

/** Chocolate chunk with shine: a chunky beveled chocolate-bar segment, tilted. Nominal ~70. */
export function drawChocoChunk(c, lw) {
  c.save();
  c.rotate(-0.22);
  const H = 31, h = 16.5, Hx = H + 3;
  const outer = rrect(-H, -H, H * 2, H * 2, 12);
  fill(c, outer, '#6e3a20');
  clipTo(c, outer, () => {
    fill(c, poly([[-Hx, -Hx], [Hx, -Hx], [h, -h], [-h, -h]]), linearGrad(c, 0, -H, 0, -h, [[0, '#b8784a'], [1, '#9a5a34']]));  // top bevel (lit)
    fill(c, poly([[-Hx, -Hx], [-h, -h], [-h, h], [-Hx, Hx]]), '#8a4e2c');                                                     // left bevel
    fill(c, poly([[Hx, -Hx], [Hx, Hx], [h, h], [h, -h]]), '#55301b');                                                         // right bevel
    fill(c, poly([[-Hx, Hx], [-h, h], [h, h], [Hx, Hx]]), '#45230f');                                                         // bottom bevel
    const pl = rrect(-h, -h, h * 2, h * 2, 4.5);
    fill(c, pl, linearGrad(c, -h, -h, h, h, [[0, '#93573a'], [0.55, '#7a4428'], [1, '#673520']]));
    // plateau gloss + reflected light
    clipTo(c, pl, () => {
      c.fillStyle = 'rgba(255,255,255,0.28)';
      c.beginPath(); c.ellipse(-6, -9, 12, 5, -0.6, 0, TAU); c.fill();
    });
    // bevel ridge highlights
    c.lineCap = 'round'; c.lineJoin = 'round';
    c.strokeStyle = 'rgba(255,214,170,0.75)'; c.lineWidth = 2.6;
    c.beginPath(); c.moveTo(-h + 1, h - 3); c.lineTo(-h + 1, -h + 1); c.lineTo(h - 3, -h + 1); c.stroke();
    c.strokeStyle = 'rgba(255,214,170,0.55)'; c.lineWidth = 3;
    c.beginPath(); c.moveTo(-H + 7, -H + 3.5); c.lineTo(H - 9, -H + 3.5); c.stroke();
  });
  innerLight(c, outer, 'rgba(255,220,180,0.55)', 3, 3);
  stroke(c, outer, lw);
  c.restore();
  glint(c, -22, -20, 5.5, -0.75, 0.98);
}

// ---------------------------------------------------------------------------
// Coins
// ---------------------------------------------------------------------------
export const COIN_GOLD = {
  rimLight: '#fff8c2', rim: '#ffd84a', rimShade: '#f09a12',
  face: '#ffc21f', faceShade: '#d9800c', faceLight: '#ffe58a', line: '#a8560a',
  emb: '#ffe466', embLight: '#fffce6', embDark: '#b8620a',
  edge: '#eda21c', edgeLight: '#ffd75e', edgeDark: '#b0620c', groove: '#a4580a',
};
export const COIN_SILVER = {
  rimLight: '#ffffff', rim: '#e8edf8', rimShade: '#a3aec8',
  face: '#cad3e8', faceShade: '#8892b4', faceLight: '#f1f4fc', line: '#5f6a8c',
  emb: '#f4f7ff', embLight: '#ffffff', embDark: '#6e7899',
  edge: '#b3bcd4', edgeLight: '#e6eaf6', edgeDark: '#7a83a3', groove: '#69728f',
};

/** Coin face (front), local radius R=50, centred at 0,0 (caller may scale x). */
export function coinFace(c, pal, o = {}) {
  const R = 50, Ri = o.inner ?? 37;
  const rimSh = circle(0, 0, R);
  fill(c, rimSh, linearGrad(c, -R * 0.7, -R * 0.7, R * 0.7, R * 0.7, [[0, pal.rimLight], [0.45, pal.rim], [1, pal.rimShade]]));
  const rec = circle(0, 0, Ri);
  fill(c, rec, linearGrad(c, -Ri, -Ri, Ri, Ri, [[0, pal.faceShade], [0.35, pal.face], [1, pal.faceLight]]));
  // recess: shadow under the top-left rim, bounce light bottom-right
  innerLight(c, rec, pal.faceShade, 5, 6, 0.9);
  innerShade(c, rec, pal.faceLight, 4, 5, 0.9);
  stroke(c, rec, o.lineW ?? 3, pal.line);
  if (o.beads) {
    c.fillStyle = pal.embLight;
    for (let i = 0; i < o.beads; i++) {
      const a = (i / o.beads) * TAU;
      c.globalAlpha = 0.85;
      c.beginPath(); c.arc(Math.cos(a) * (Ri - 5.5), Math.sin(a) * (Ri - 5.5), 1.9, 0, TAU); c.fill();
    }
    c.globalAlpha = 1;
  }
  // embossed star
  const sr = o.starR ?? 25;
  const st = (dx, dy, s = 1) => puffyStar(dx, dy + 1.5, sr * s, sr * 0.5 * s, 5, -Math.PI / 2, 0.24, 0.16);
  fill(c, st(2.8, 3.4), pal.embDark);
  fill(c, st(-1.4, -1.6), pal.embLight);
  fill(c, st(0, 0), linearGrad(c, -sr, -sr, sr, sr, [[0, pal.embLight], [0.4, pal.emb], [1, pal.emb]]));
  innerShade(c, st(0, 0), rgba(pal.embDark, 0.55), 2.2, 2.6);
  // diagonal shine streaks across the coin
  clipTo(c, rimSh, () => {
    c.save();
    c.rotate(-0.78);
    c.fillStyle = 'rgba(255,255,255,0.55)';
    c.fillRect(-R, -R * 0.62, R * 2, R * 0.2);
    c.fillStyle = 'rgba(255,255,255,0.35)';
    c.fillRect(-R, -R * 0.33, R * 2, R * 0.08);
    c.restore();
  });
  if (o.tint) fill(c, rimSh, o.tint);
}

/**
 * Coin turning around its vertical axis. theta: 0 = face-on, PI/2 = edge-on.
 * Local units: radius 50, thickness T. lw = outline width in local units.
 */
export function drawCoin(c, theta, pal, lw, o = {}) {
  const R = 50, T = o.T ?? 20;
  const cs = Math.cos(theta), sn = Math.sin(theta);
  const k = Math.abs(cs);
  const off = (T / 2) * sn;
  const front = cs >= 0;
  const fx = front ? off : -off;   // visible face centre
  const bx = -fx;                   // far face centre
  const rx = Math.max(R * k, 0.01);
  const left = Math.min(fx, bx), right = Math.max(fx, bx);
  const sil = (cc) => {
    cc.moveTo(left, -R); cc.lineTo(right, -R);
    cc.ellipse(right, 0, rx, R, 0, -Math.PI / 2, Math.PI / 2, false);
    cc.lineTo(left, R);
    cc.ellipse(left, 0, rx, R, 0, Math.PI / 2, Math.PI * 1.5, false);
    cc.closePath();
  };
  const faceSh = ellipse(fx, 0, rx, R);
  // edge band: lit when it is on the left (facing the light), darker on the right
  const bandLeft = fx > bx;      // face is on the right -> band on the left
  const eTop = bandLeft ? pal.edgeLight : pal.edge;
  const eBot = bandLeft ? pal.edge : pal.edgeDark;
  if (sn > 0.01) {
    fill(c, sil, linearGrad(c, 0, -R, 0, R, [[0, eTop], [0.5, mix(eTop, eBot, 0.4)], [1, eBot]]));
    // reeding grooves (horizontal dashes along the visible rim)
    if (o.grooves) {
      clipTo(c, sil, () => {
        c.strokeStyle = rgba(pal.groove, 0.75); c.lineWidth = o.grooveW ?? 2.2; c.lineCap = 'butt';
        const N = o.grooves;
        for (let j = 1; j <= N; j++) {
          const phi = Math.PI / 2 + (j * Math.PI) / (N + 1);
          const y = R * Math.sin(phi);
          const xc = R * Math.cos(phi) * Math.abs(cs) * (bandLeft ? 1 : -1);
          c.beginPath(); c.moveTo(xc - off, y); c.lineTo(xc + off, y); c.stroke();
        }
      });
    }
    // specular strip along the edge
    clipTo(c, sil, () => {
      c.fillStyle = rgba('#ffffff', bandLeft ? 0.45 : 0.2);
      c.beginPath(); c.ellipse((bandLeft ? -1 : 1) * (rx * 0.0) + (left + right) / 2, -R * 0.45, Math.max(off, 1) * 0.9, R * 0.28, 0, 0, TAU); c.fill();
    });
  }
  if (k > 0.04) {
    c.save();
    c.translate(fx, 0);
    c.scale(k, 1);
    // face brightness: back face turning toward the light flashes brighter
    let tint = null;
    if (front && theta > 0.05) tint = rgba('#7a3a00', 0.10 * Math.sin(theta * 1.4));
    if (!front) tint = rgba('#fffbe6', 0.22 * Math.sin((Math.PI - theta) * 1.6));
    coinFace(c, pal, { ...o.face, tint });
    c.restore();
    if (sn > 0.01) stroke(c, faceSh, lw * 0.6, OUTLINE);
  }
  stroke(c, sil, lw, OUTLINE);
}

// ---------------------------------------------------------------------------
// Milk
// ---------------------------------------------------------------------------
export function drawMilkCarton(c, lw, o = {}) {
  const blue = o.blue ?? '#4fb0ff', blueD = tone(blue, -0.25), blueL = mix(blue, '#ffffff', 0.45);
  const x0 = -27, x1 = 13, yT = -12, yB = 44, d = 14, e = 7, hR = 24;
  // pieces (front face, side face, front roof, side gable, fin)
  const front = rrect(x0, yT, x1 - x0, yB - yT, 3);
  const side = poly([[x1, yT], [x1 + d, yT - e], [x1 + d, yB - e], [x1, yB]]);
  const rx0 = x0 + d / 2, rx1 = x1 + d / 2, ry = yT - e / 2 - hR;
  const roof = poly([[x0, yT], [x1, yT], [rx1, ry], [rx0, ry]]);
  const gable = poly([[x1, yT], [x1 + d, yT - e], [rx1, ry]]);
  const fin = rrect(rx0 - 1.5, ry - 9, rx1 - rx0 + 3, 10, 2.5);
  const all = (cc) => { front(cc); side(cc); roof(cc); gable(cc); fin(cc); };
  // silhouette fill (prevents seams) then pieces
  fill(c, all, '#ffffff');
  fill(c, side, linearGrad(c, x1, 0, x1 + d, 0, [[0, '#dbe3f3'], [1, '#c3cfe8']]));
  fill(c, front, linearGrad(c, x0, yT, x1, yB, [[0, '#ffffff'], [0.7, '#fbfcff'], [1, '#eef2fb']]));
  innerShade(c, front, '#e3e9f6', 5, 4);
  fill(c, roof, linearGrad(c, 0, ry, 0, yT, [[0, blueL], [1, blue]]));
  fill(c, gable, blueD);
  fill(c, fin, linearGrad(c, 0, ry - 9, 0, ry + 1, [[0, blueL], [1, blue]]));
  // side band (blue stripe continues around)
  const bandY0 = yB - 20, bandY1 = yB - 9;
  clipTo(c, side, () => { fill(c, poly([[x1, bandY0], [x1 + d, bandY0 - e], [x1 + d, bandY1 - e], [x1, bandY1]]), blueD); });
  // front label: blue band + big white drop
  clipTo(c, front, () => {
    fill(c, rrect(x0 - 2, bandY0, x1 - x0 + 4, bandY1 - bandY0, 0), blue);
    c.fillStyle = rgba('#ffffff', 0.35); c.fillRect(x0, bandY0 + 1.5, x1 - x0, 2.5);
  });
  const dc = [(x0 + x1) / 2, 6];
  const dropSh = (cc) => { const [x, y] = dc; const r = 10.5; cc.moveTo(x, y - r * 1.75); cc.bezierCurveTo(x + r * 0.5, y - r * 0.95, x + r, y - r * 0.45, x + r, y); cc.arc(x, y, r, 0, Math.PI); cc.bezierCurveTo(x - r, y - r * 0.45, x - r * 0.5, y - r * 0.95, x, y - r * 1.75); cc.closePath(); };
  fill(c, dropSh, blue);
  innerShade(c, dropSh, blueD, 3, 3);
  glint(c, dc[0] - 4, dc[1] - 3, 3.2, -0.8, 0.95);
  stroke(c, dropSh, lw * 0.55, blueD);
  // inner crease lines
  c.save();
  c.strokeStyle = OUTLINE; c.lineWidth = lw * 0.5; c.lineJoin = 'round'; c.lineCap = 'round';
  c.beginPath(); c.moveTo(x1, yT); c.lineTo(x1, yB); c.stroke();
  c.beginPath(); c.moveTo(x0, yT); c.lineTo(x1, yT); c.lineTo(x1 + d, yT - e); c.stroke();
  c.beginPath(); c.moveTo(x1, yT); c.lineTo(rx1, ry); c.stroke();
  c.restore();
  // gloss on the front
  glint(c, x0 + 7, yT + 9, 4.2, -1.2, 0.9);
  c.save(); c.fillStyle = rgba('#ffffff', 0.9); c.beginPath(); c.roundRect?.(x0 + 4, yT + 16, 4, 18, 2); c.fill(); c.restore();
  // roof gloss
  c.save(); c.globalAlpha = 0.55; fill(c, poly([[x0 + 4, yT - 2], [x0 + 12, yT - 2], [rx0 + 9, ry + 3], [rx0 + 3, ry + 3]]), '#ffffff'); c.restore();
  stroke(c, all, lw, OUTLINE);
}

export function drawMilkBottle(c, lw, o = {}) {
  const capCol = o.cap ?? '#ff5f8f';
  // bottle silhouette
  const body = (cc) => {
    cc.moveTo(-14, -46);
    cc.lineTo(14, -46);
    cc.bezierCurveTo(14, -34, 15, -30, 22, -22);
    cc.bezierCurveTo(30, -13, 32, -6, 32, 6);
    cc.lineTo(32, 46);
    cc.quadraticCurveTo(32, 58, 20, 58);
    cc.lineTo(-20, 58);
    cc.quadraticCurveTo(-32, 58, -32, 46);
    cc.lineTo(-32, 6);
    cc.bezierCurveTo(-32, -6, -30, -13, -22, -22);
    cc.bezierCurveTo(-15, -30, -14, -34, -14, -46);
    cc.closePath();
  };
  // glass (empty top part) and milk
  fill(c, body, linearGrad(c, -32, 0, 32, 0, [[0, '#e9f6ff'], [1, '#cfe6fb']]));
  const milkTop = -28;
  clipTo(c, body, () => {
    // milk with a gentle wave surface
    const milk = (cc) => {
      cc.moveTo(-40, milkTop + 2);
      cc.bezierCurveTo(-20, milkTop - 4, -8, milkTop + 6, 8, milkTop + 1);
      cc.bezierCurveTo(20, milkTop - 3, 30, milkTop + 3, 40, milkTop);
      cc.lineTo(40, 70); cc.lineTo(-40, 70); cc.closePath();
    };
    fill(c, milk, linearGrad(c, -32, 0, 32, 0, [[0, '#ffffff'], [0.6, '#fbfdff'], [1, '#e4ecfa']]));
    innerShade(c, body, rgba('#b9c8e8', 0.85), 7, 6);
    // label band
    const lab = rrect(-40, 4, 80, 30, 0);
    fill(c, lab, linearGrad(c, 0, 4, 0, 34, [[0, '#7cc8ff'], [1, '#4aa8f6']]));
    c.fillStyle = rgba('#ffffff', 0.45); c.fillRect(-40, 7, 80, 3);
    c.fillStyle = rgba('#2f74c8', 0.5); c.fillRect(-40, 30, 80, 4);
  });
  // label emblem: white star
  const st = puffyStar(0, 20, 11.5, 5.8, 5, -Math.PI / 2, 0.28, 0.2);
  fill(c, st, '#ffffff');
  stroke(c, st, lw * 0.4, '#2f74c8');
  // label edge lines
  c.save();
  clipTo(c, body, () => {
    c.strokeStyle = OUTLINE; c.lineWidth = lw * 0.55;
    c.beginPath(); c.moveTo(-34, 4); c.lineTo(34, 4); c.moveTo(-34, 34); c.lineTo(34, 34); c.stroke();
  });
  c.restore();
  // glass reflections
  clipTo(c, body, () => {
    c.fillStyle = rgba('#ffffff', 0.95);
    c.beginPath(); c.roundRect(-25, -12, 6.5, 13, 3.2); c.fill();
    c.beginPath(); c.roundRect(-25, 38, 6.5, 13, 3.2); c.fill();
    c.fillStyle = rgba('#ffffff', 0.7);
    c.beginPath(); c.roundRect(-9, -44, 5, 12, 2.5); c.fill();
  });
  glint(c, -20, -18, 4.5, -0.9, 0.95);
  stroke(c, body, lw, OUTLINE);
  // foil cap with crimped skirt
  const cap = (cc) => {
    cc.moveTo(-18, -44);
    for (let i = 0; i <= 8; i++) { const x = -18 + i * 4.5; cc.lineTo(x, -44 + (i % 2 ? 3.5 : 0)); }
    cc.lineTo(18, -52);
    cc.quadraticCurveTo(18, -64, 0, -64);
    cc.quadraticCurveTo(-18, -64, -18, -52);
    cc.closePath();
  };
  fill(c, cap, linearGrad(c, -18, -64, 18, -44, [[0, mix(capCol, '#ffffff', 0.45)], [0.5, capCol], [1, tone(capCol, -0.2)]]));
  innerShade(c, cap, tone(capCol, -0.28), 4, 3);
  glint(c, -9, -58, 3.4, -0.6, 0.95);
  stroke(c, cap, lw, OUTLINE);
}

// ---------------------------------------------------------------------------
// Power-up icons (nominal ~ 70 units wide, centred)
// ---------------------------------------------------------------------------
export function drawMagnet(c, lw) {
  // horseshoe, opening downward, tilted
  c.save();
  c.rotate(-0.42);
  const Ro = 32, Ri = 14, yA = -6, legEnd = 30;
  const U = (cc) => {
    cc.moveTo(-Ro, yA);
    cc.arc(0, yA, Ro, Math.PI, 0, false);
    cc.lineTo(Ro, legEnd);
    cc.lineTo(Ri, legEnd);
    cc.lineTo(Ri, yA);
    cc.arc(0, yA, Ri, 0, Math.PI, true);
    cc.lineTo(-Ri, legEnd);
    cc.lineTo(-Ro, legEnd);
    cc.closePath();
  };
  const P = PAL.red;
  fill(c, U, linearGrad(c, -Ro, -Ro, Ro, legEnd, [[0, P.top], [0.45, P.base], [1, P.bot]]));
  innerShade(c, U, P.shade, 5, 6);
  innerLight(c, U, '#ffffff', 3.5, 3.5, 0.45);
  // silver pole tips
  const tipH = 14;
  const tipL = rrect(-Ro, legEnd - tipH, Ro - Ri, tipH, 1.5), tipR = rrect(Ri, legEnd - tipH, Ro - Ri, tipH, 1.5);
  for (const t of [tipL, tipR]) {
    fill(c, t, linearGrad(c, 0, legEnd - tipH, 0, legEnd, [[0, '#ffffff'], [0.5, '#dfe5f0'], [1, '#aab4c8']]));
    innerShade(c, t, '#97a3ba', 3, 3);
  }
  c.save(); c.strokeStyle = OUTLINE; c.lineWidth = lw * 0.6; c.lineCap = 'round';
  c.beginPath(); c.moveTo(-Ro, legEnd - tipH); c.lineTo(-Ri, legEnd - tipH); c.moveTo(Ri, legEnd - tipH); c.lineTo(Ro, legEnd - tipH); c.stroke();
  c.restore();
  // gloss along the arch
  c.save(); c.strokeStyle = rgba('#ffffff', 0.9); c.lineWidth = 4.5; c.lineCap = 'round';
  c.beginPath(); c.arc(0, yA, (Ro + Ri) / 2 + 3, Math.PI * 1.08, Math.PI * 1.42); c.stroke();
  c.restore();
  c.fillStyle = '#ffffff'; c.beginPath(); c.arc(-24, 10, 2.6, 0, TAU); c.fill();
  stroke(c, U, lw, OUTLINE);
  c.restore();
}

/** Bold candy arrow pointing up. (cx, cy) = centre, s = size scale. */
export function upArrowShape(cx, cy, w, h, shaft = 0.46, headH = 0.55) {
  const hw = w / 2, sw = (w * shaft) / 2, top = cy - h / 2, bot = cy + h / 2, hb = top + h * headH;
  return roundPoly([[cx, top], [cx + hw, hb], [cx + sw, hb], [cx + sw, bot], [cx - sw, bot], [cx - sw, hb], [cx - hw, hb]],
    [0.16, 0.2, 0.12, 0.24, 0.24, 0.12, 0.2]);
}

export function drawMuffin(c, lw) {
  // paper cup
  const cup = roundPoly([[-27, 2], [27, 2], [20, 38], [-20, 38]], [0.08, 0.08, 0.2, 0.2]);
  fill(c, cup, linearGrad(c, -27, 0, 27, 0, [[0, '#9fe9ff'], [1, '#4fc0f0']]));
  clipTo(c, cup, () => {
    c.strokeStyle = rgba('#2a8fc4', 0.7); c.lineWidth = 3;
    for (let i = -3; i <= 3; i++) { c.beginPath(); c.moveTo(i * 8.2, 2); c.lineTo(i * 6.2, 40); c.stroke(); }
    c.fillStyle = rgba('#ffffff', 0.55);
    for (let i = -3; i <= 2; i++) { c.beginPath(); c.moveTo(i * 8.2 + 1.5, 4); c.lineTo(i * 8.2 + 4.5, 4); c.lineTo(i * 6.2 + 3.6, 38); c.lineTo(i * 6.2 + 1.2, 38); c.closePath(); c.fill(); }
  });
  innerShade(c, cup, rgba('#1f6f9e', 0.45), 5, 4);
  stroke(c, cup, lw, OUTLINE);
  // domed muffin top (overhanging the cup)
  const top = (cc) => {
    cc.moveTo(-33, 6);
    cc.bezierCurveTo(-40, -10, -30, -26, -16, -30);
    cc.bezierCurveTo(-8, -40, 10, -40, 18, -30);
    cc.bezierCurveTo(32, -26, 41, -10, 33, 6);
    cc.bezierCurveTo(22, 11, -22, 11, -33, 6);
    cc.closePath();
  };
  fill(c, top, linearGrad(c, -20, -38, 20, 10, [[0, '#ffd48a'], [0.5, '#f2a649'], [1, '#d97c2a']]));
  innerShade(c, top, '#b85f22', 5, 6);
  innerLight(c, top, '#ffe9b8', 4, 4, 0.8);
  // chocolate chips / berries
  const chips = [[-18, -12, 4.6], [2, -24, 4.4], [16, -8, 4.8], [-4, -2, 4.2], [24, -20, 3.4], [-26, -2, 3.2]];
  for (const [x, y, r] of chips) {
    const ch = (cc) => { cc.moveTo(x - r, y + r * 0.6); cc.quadraticCurveTo(x - r * 0.7, y - r * 1.1, x, y - r); cc.quadraticCurveTo(x + r * 0.9, y - r * 0.9, x + r, y + r * 0.6); cc.closePath(); };
    fill(c, ch, '#6b3a22');
    c.fillStyle = rgba('#b07448', 0.9); c.beginPath(); c.arc(x - r * 0.25, y - r * 0.35, r * 0.3, 0, TAU); c.fill();
  }
  clipTo(c, top, () => gloss(c, -14, -22, 13, 7, -0.5, 0.65));
  glint(c, -16, -23, 4.4, -0.55, 0.95);
  stroke(c, top, lw, OUTLINE);
}

export function drawRocket(c, lw, o = {}) {
  c.save();
  c.rotate(o.rot ?? 0.78); // pointing up-right
  const body = (cc) => {
    cc.moveTo(0, -42);
    cc.bezierCurveTo(16, -30, 18, -8, 16, 18);
    cc.lineTo(-16, 18);
    cc.bezierCurveTo(-18, -8, -16, -30, 0, -42);
    cc.closePath();
  };
  // flame
  const fl = (cc) => { cc.moveTo(-11, 20); cc.bezierCurveTo(-12, 34, -4, 40, 0, 52); cc.bezierCurveTo(4, 40, 12, 34, 11, 20); cc.closePath(); };
  fill(c, fl, linearGrad(c, 0, 20, 0, 52, [[0, '#fff7b0'], [0.4, '#ffc63a'], [1, '#ff6a2a']]));
  const fl2 = (cc) => { cc.moveTo(-6, 20); cc.bezierCurveTo(-6, 28, -2, 32, 0, 40); cc.bezierCurveTo(2, 32, 6, 28, 6, 20); cc.closePath(); };
  fill(c, fl2, '#ffffff');
  stroke(c, fl, lw * 0.8, OUTLINE);
  // fins
  const finL = roundPoly([[-15, -2], [-28, 14], [-26, 26], [-14, 18]], 0.2);
  const finR = roundPoly([[15, -2], [28, 14], [26, 26], [14, 18]], 0.2);
  for (const f of [finL, finR]) { fill(c, f, '#ff4f6a'); innerShade(c, f, '#c92d4f', 3, 3); stroke(c, f, lw, OUTLINE); }
  // body with candy stripes
  fill(c, body, '#fffaf4');
  clipTo(c, body, () => {
    c.fillStyle = '#ff5a76';
    for (let i = -4; i < 6; i++) {
      c.beginPath(); c.moveTo(-30, i * 13); c.lineTo(30, i * 13 - 16); c.lineTo(30, i * 13 - 9); c.lineTo(-30, i * 13 + 7); c.closePath(); c.fill();
    }
    // nose cap
    c.fillStyle = '#ff4f6a'; c.beginPath(); c.ellipse(0, -44, 22, 14, 0, 0, TAU); c.fill();
  });
  innerShade(c, body, rgba('#b03a5a', 0.45), 6, 4);
  innerLight(c, body, '#ffffff', 3, 2, 0.5);
  // nose line
  clipTo(c, body, () => { c.strokeStyle = OUTLINE; c.lineWidth = lw * 0.5; c.beginPath(); c.ellipse(0, -44, 22, 14, 0, 0, TAU); c.stroke(); });
  // window
  const win = circle(0, -12, 8.5);
  fill(c, win, linearGrad(c, -8, -20, 8, -4, [[0, '#c8f4ff'], [1, '#3aa6f0']]));
  innerShade(c, win, '#2a7fc8', 2.5, 2.5);
  glint(c, -3, -15, 2.8, -0.7, 0.95);
  stroke(c, win, lw * 0.75, OUTLINE);
  clipTo(c, body, () => gloss(c, -8, -18, 4, 14, 0, 0.55));
  stroke(c, body, lw, OUTLINE);
  // nozzle
  const noz = rrect(-11, 16, 22, 7, 2.5);
  fill(c, noz, '#9aa6bd'); innerShade(c, noz, '#6b7792', 2, 2); stroke(c, noz, lw * 0.8, OUTLINE);
  c.restore();
}

export function drawPouch(c, lw) {
  const P = { base: '#ff7a9e', top: '#ffb2c8', bot: '#ff6890', shade: '#d94a74', deep: '#b8355e', light: '#ffd6e2' };
  // sack body
  const sack = (cc) => {
    cc.moveTo(-12, -16);
    cc.bezierCurveTo(-36, -8, -40, 20, -30, 32);
    cc.quadraticCurveTo(-20, 42, 0, 42);
    cc.quadraticCurveTo(20, 42, 30, 32);
    cc.bezierCurveTo(40, 20, 36, -8, 12, -16);
    cc.closePath();
  };
  candyBody(c, sack, P, 34, lw, { cy: 14, sdx: 0.18, sdy: 0.16, caustic: false, gx: -0.5, gy: -0.25, gs: 0.15 });
  // frill top
  const frill = (cc) => {
    cc.moveTo(-12, -16);
    cc.bezierCurveTo(-22, -22, -26, -34, -18, -38);
    cc.quadraticCurveTo(-10, -32, -6, -38);
    cc.quadraticCurveTo(0, -30, 6, -38);
    cc.quadraticCurveTo(10, -32, 18, -38);
    cc.bezierCurveTo(26, -34, 22, -22, 12, -16);
    cc.closePath();
  };
  fill(c, frill, P.top); innerShade(c, frill, P.shade, 3, 3); stroke(c, frill, lw, OUTLINE);
  // gold tie
  const tie = rrect(-15, -20, 30, 8, 4);
  fill(c, tie, '#ffd23a'); innerShade(c, tie, '#e08a10', 2, 2); stroke(c, tie, lw * 0.8, OUTLINE);
  // coin emblem on the sack
  place(c, 2, 16, 0.3, (f) => drawCoin(c, 0, COIN_GOLD, lw * 0.75 * f));
}

export function drawWand(c, lw) {
  // candy-cane stick
  c.save();
  c.rotate(0.62);
  const stick = rrect(-5.5, -6, 11, 54, 5.5);
  fill(c, stick, '#ffffff');
  clipTo(c, stick, () => {
    c.fillStyle = '#ff5fa2';
    for (let i = -2; i < 8; i++) { c.beginPath(); c.moveTo(-8, i * 10); c.lineTo(8, i * 10 - 6); c.lineTo(8, i * 10 - 1); c.lineTo(-8, i * 10 + 5); c.closePath(); c.fill(); }
  });
  innerShade(c, stick, rgba('#9a2a6a', 0.35), 3, 0);
  stroke(c, stick, lw, OUTLINE);
  c.restore();
  // star on top
  place(c, -9, -14, 0.62, (f) => drawStarCandy(c, lw * f, 44, PAL.lemon, { bevelAlpha: 0.75 }));
  // ribbon tails
  // sparkles
  sparkle(c, 25, -30, 8, '#ffffff', 1, 0);
  sparkle(c, 30, -8, 5, '#fff6a0', 1, 0.4);
  sparkle(c, -34, 12, 5.5, '#ffffff', 1, 0.2);
}

export function shieldShape(cx, cy, w, h) {
  const hw = w / 2, top = cy - h / 2, bot = cy + h / 2;
  return (cc) => {
    cc.moveTo(cx, top);
    cc.bezierCurveTo(cx + hw * 0.45, top + h * 0.08, cx + hw * 0.8, top + h * 0.05, cx + hw, top + h * 0.02);
    cc.bezierCurveTo(cx + hw * 1.02, top + h * 0.45, cx + hw * 0.8, top + h * 0.78, cx, bot);
    cc.bezierCurveTo(cx - hw * 0.8, top + h * 0.78, cx - hw * 1.02, top + h * 0.45, cx - hw, top + h * 0.02);
    cc.bezierCurveTo(cx - hw * 0.8, top + h * 0.05, cx - hw * 0.45, top + h * 0.08, cx, top);
    cc.closePath();
  };
}

export function drawShieldCrest(c, lw, o = {}) {
  const P = o.pal ?? PAL.sky;
  const sh = shieldShape(0, 2, 66, 80);
  fill(c, sh, linearGrad(c, -30, -40, 30, 40, [[0, P.top], [0.5, P.base], [1, P.bot]]));
  innerShade(c, sh, P.shade, 5, 6);
  // white inner rim band
  const inner = shieldShape(0, 3, 48, 60);
  stroke(c, inner, 5.5, '#ffffff');
  clipTo(c, inner, () => {
    fill(c, (cc) => { cc.rect(0, -40, 40, 80); }, rgba(P.deep, 0.25));
  });
  // star emblem
  place(c, 0, 2, 0.42, (f) => drawStarCandy(c, lw * 0.8 * f, 44, PAL.lemon, { bevelAlpha: 0.7 }));
  clipTo(c, sh, () => gloss(c, -16, -22, 12, 8, -0.6, 0.7));
  glint(c, -18, -24, 4.4, -0.6, 0.95);
  stroke(c, sh, lw, OUTLINE);
}

// ---------------------------------------------------------------------------
// Glossy power-up bubble
// ---------------------------------------------------------------------------
export function drawPowerBubble(c, r, tint, lw, icon) {
  const sh = circle(0, 0, r);
  // two-layer halo: saturated tint (reads on bright skies) + white core glow (reads on dark)
  c.save();
  const halo = c.createRadialGradient(0, 0, r * 0.85, 0, 0, r * 1.27);
  halo.addColorStop(0, rgba(tint, 0.85));
  halo.addColorStop(0.45, rgba(tint, 0.42));
  halo.addColorStop(1, rgba(tint, 0));
  c.fillStyle = halo; c.beginPath(); c.arc(0, 0, r * 1.27, 0, TAU); c.fill();
  const wh = c.createRadialGradient(0, 0, r * 0.9, 0, 0, r * 1.16);
  wh.addColorStop(0, 'rgba(255,255,255,0.9)'); wh.addColorStop(1, 'rgba(255,255,255,0)');
  c.fillStyle = wh; c.beginPath(); c.arc(0, 0, r * 1.16, 0, TAU); c.fill();
  c.restore();
  // body
  fill(c, sh, radialGrad(c, -r * 0.1, -r * 0.15, 0, r, [[0, '#ffffff'], [0.5, mix(tint, '#ffffff', 0.72)], [0.85, mix(tint, '#ffffff', 0.35)], [1, tint]], -r * 0.25, -r * 0.3));
  innerShade(c, sh, rgba(tone(tint, -0.25), 0.55), r * 0.12, r * 0.14);
  // icon
  icon();
  // rim reflections
  innerLight(c, circle(0, 0, r - 3), '#ffffff', r * 0.16, r * 0.16, 0.85);
  innerShade(c, circle(0, 0, r - 4), rgba('#ffffff', 0.6), r * 0.06, r * 0.06);
  c.fillStyle = '#ffffff';
  c.beginPath(); c.ellipse(-r * 0.5, -r * 0.5, r * 0.11, r * 0.07, -0.78, 0, TAU); c.fill();
  c.beginPath(); c.arc(r * 0.55, r * 0.5, r * 0.045, 0, TAU); c.fill();
  stroke(c, sh, lw, OUTLINE);
  // rim sparkle (top-right) so the bubble twinkles
  sparkle(c, r * 0.74, -r * 0.76, r * 0.24, '#ffffff', 1, 0);
  sparkle(c, r * 0.74, -r * 0.76, r * 0.1, '#fff6b0', 1, Math.PI / 4);
}

// ---------------------------------------------------------------------------
// Gummy letter ball
// ---------------------------------------------------------------------------
export function letterPal(hex) {
  return { base: hex, top: mix(hex, '#ffffff', 0.42), bot: tone(hex, -0.06), shade: tone(hex, -0.24), deep: tone(hex, -0.38), light: mix(hex, '#ffffff', 0.7) };
}
export function drawLetterBall(c, ch, hex, R, lw, o = {}) {
  const P = letterPal(hex);
  const sh = circle(0, 0, R);
  candyBody(c, sh, P, R, lw, { caustic: true, cauX: 0.25, cauY: 0.5, cauA: 0.45, gloss: false, noOutline: true });
  // gloss crescent on the top-left rim
  innerLight(c, circle(0, 0, R * 0.9), '#ffffff', R * 0.14, R * 0.14, 0.6);
  // letter
  const size = o.size ?? R * 1.42;
  c.save();
  c.font = `${o.weight ?? 900} ${size}px ${o.font ?? 'DDDisplay'}`;
  c.textAlign = 'center'; c.textBaseline = 'alphabetic';
  const m = c.measureText(ch);
  const asc = m.actualBoundingBoxAscent, des = m.actualBoundingBoxDescent;
  const by = (asc - des) / 2 + (o.dy ?? 0);
  const bx = ((m.actualBoundingBoxLeft - m.actualBoundingBoxRight) / 2) + (o.dx ?? 0);
  c.lineJoin = 'round'; c.miterLimit = 2;
  // drop shadow in the ball's deep colour
  c.fillStyle = P.deep; c.strokeStyle = P.deep; c.lineWidth = o.textLw ?? lw * 1.8;
  const sd = o.shadow ?? R * 0.07;
  c.strokeText(ch, bx + sd * 0.6, by + sd); c.fillText(ch, bx + sd * 0.6, by + sd);
  c.strokeStyle = OUTLINE; c.lineWidth = o.textLw ?? lw * 1.8;
  c.strokeText(ch, bx, by);
  c.fillStyle = linearGrad(c, 0, by - asc, 0, by + des, [[0, '#ffffff'], [0.6, '#ffffff'], [1, mix(hex, '#ffffff', 0.72)]]);
  c.fillText(ch, bx, by);
  c.restore();
  glint(c, -R * 0.52, -R * 0.5, R * 0.13, -0.75, 0.95);
  stroke(c, sh, lw, OUTLINE);
}
