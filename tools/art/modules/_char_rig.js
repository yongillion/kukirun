// =============================================================================
//  Dessert Dash — character rig (shared by characters.js and pets.js)
//  Not an export module (underscore prefix).
//
//  A runner is drawn from a POSE object (body offset / rotation / shear /
//  squash, feet, arm angles, face, accessory parameters). Poses for every sheet
//  frame are generated from curves (run cycle) or keyed values, then rendered
//  by renderFrame(): back accessories -> far arm -> legs -> body+face -> near
//  arm -> front accessories.
//
//  All geometry is built under an affine matrix but STROKED in frame space so
//  outlines stay a uniform width under squash/stretch, and shade / light
//  crescents are offset in SCREEN space (light always from the top-left).
// =============================================================================
import {
  OUTLINE, INK, tone, mix, hexToRgb, rgbToHex, canvas, ctx2d, eye, mouth, blush, gloss,
  glint, glow, sparkle, lerp, clamp, TAU, circle, ellipse, star, drop,
} from '../lib.js';

export const FW = 288, FH = 288, AX = 144, AY = 262;
export const LWC = 6; // character outline width (art px)
/** global render state: lwk multiplies every outline width (used when a frame is drawn big then shrunk). */
export const RIG = { lwk: 1 };

// -----------------------------------------------------------------------------
// 2D affine matrices [a, b, c, d, e, f]  (x' = a x + c y + e ; y' = b x + d y + f)
// -----------------------------------------------------------------------------
export const M = {
  I: [1, 0, 0, 1, 0, 0],
  mul(A, B) {
    return [A[0] * B[0] + A[2] * B[1], A[1] * B[0] + A[3] * B[1],
      A[0] * B[2] + A[2] * B[3], A[1] * B[2] + A[3] * B[3],
      A[0] * B[4] + A[2] * B[5] + A[4], A[1] * B[4] + A[3] * B[5] + A[5]];
  },
  chain(...ms) { let r = M.I; for (const m of ms) r = M.mul(r, m); return r; },
  T: (x, y) => [1, 0, 0, 1, x, y],
  R: (a) => { const c = Math.cos(a), s = Math.sin(a); return [c, s, -s, c, 0, 0]; },
  S: (sx, sy = sx) => [sx, 0, 0, sy, 0, 0],
  K: (kx) => [1, 0, kx, 1, 0, 0], // x' = x + kx*y  (kx > 0 leans the top toward -x)
  ap: (m, x, y) => [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]],
  scale: (m) => Math.sqrt(Math.abs(m[0] * m[3] - m[1] * m[2])),
  angle: (m) => Math.atan2(m[1], m[0]),
};
export const setT = (c, m) => c.setTransform(m[0], m[1], m[2], m[3], m[4], m[5]);
const ID = (c) => c.setTransform(1, 0, 0, 1, 0, 0);

// -----------------------------------------------------------------------------
// misc helpers
// -----------------------------------------------------------------------------
export function catmull(K, s) {
  const n = K.length - 1; const f = clamp(s, 0, 1) * n;
  const i = Math.min(n - 1, Math.floor(f)); const t = f - i;
  const p0 = K[Math.max(0, i - 1)], p1 = K[i], p2 = K[i + 1], p3 = K[Math.min(n, i + 2)];
  const t2 = t * t, t3 = t2 * t;
  const f0 = -0.5 * t3 + t2 - 0.5 * t, f1 = 1.5 * t3 - 2.5 * t2 + 1, f2 = -1.5 * t3 + 2 * t2 + 0.5 * t, f3 = 0.5 * t3 - 0.5 * t2;
  return [p0[0] * f0 + p1[0] * f1 + p2[0] * f2 + p3[0] * f3, p0[1] * f0 + p1[1] * f1 + p2[1] * f2 + p3[1] * f3];
}
export function qpts(p0, p1, p2, n = 10) {
  const out = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n, u = 1 - t;
    out.push([u * u * p0[0] + 2 * u * t * p1[0] + t * t * p2[0], u * u * p0[1] + 2 * u * t * p1[1] + t * t * p2[1]]);
  }
  return out;
}
/** Points along a curve that starts at p0 heading `ang` and bends by bendFn(s) (radians, cumulative). */
export function bendPts(p0, ang, len, n, bendFn) {
  const pts = [[p0[0], p0[1]]]; let x = p0[0], y = p0[1];
  for (let i = 1; i <= n; i++) {
    const s = i / n; const a = ang + bendFn(s);
    x += Math.cos(a) * len / n; y += Math.sin(a) * len / n; pts.push([x, y]);
  }
  return pts;
}
/** Multiply colour that maps `base` onto `shade` (so details under a crescent darken consistently). */
export function mulColor(base, shade) {
  const b = hexToRgb(base), s = hexToRgb(shade);
  return rgbToHex(...b.map((v, i) => Math.min(255, (s[i] / Math.max(1, v)) * 255)));
}
export const wrap = (v) => ((v % 1) + 1) % 1;

// Offscreen layers (crescents) — one per canvas size
const layers = new Map();
function layer(w, h, slot = 0) {
  const k = `${w}x${h}:${slot}`;
  let L = layers.get(k);
  if (!L) { const cv = canvas(w, h); L = { cv, g: ctx2d(cv) }; layers.set(k, L); }
  const g = L.g; ID(g); g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1; g.filter = 'none';
  g.clearRect(0, 0, w, h);
  return L;
}
function buildPath(c, m, shape) { setT(c, m); c.beginPath(); shape(c); ID(c); }

/** shape minus (shape shifted by dx,dy), painted with colour (screen-space offsets). */
function crescent(c, m, shape, rule, dx, dy, color, alpha = 1, comp = null) {
  const L = layer(c.canvas.width, c.canvas.height, 1); const g = L.g;
  buildPath(g, m, shape); g.fillStyle = color; g.fill(rule);
  g.globalCompositeOperation = 'destination-out';
  buildPath(g, M.mul(M.T(dx, dy), m), shape); g.fillStyle = '#000'; g.fill(rule);
  g.globalCompositeOperation = 'source-over';
  c.save(); ID(c); c.globalAlpha *= alpha; if (comp) c.globalCompositeOperation = comp;
  c.drawImage(L.cv, 0, 0); c.restore();
}

/**
 * Cel-shaded part under matrix m: fill -> details (clipped) -> shade crescent
 * (bottom-right) -> light crescent (top-left) -> after (clipped) -> outline.
 * o: { fill, grad:[x0,y0,x1,y1,stops] (local), shade, mul, sdx, sdy, shadeAlpha,
 *      light, ldx, ldy, lightAlpha, details(c), after(c), lw, outline, rule,
 *      under (outline drawn beneath the fill: clean outline for unions), noOutline }
 */
export function cel(c, m, shape, o = {}) {
  const rule = o.rule || 'nonzero';
  const base = o.fill || '#f5c26b';
  const lw = (o.lw ?? LWC) * RIG.lwk;
  c.save();
  if (o.under && !o.noOutline) {
    buildPath(c, m, shape);
    c.lineWidth = lw * 2; c.strokeStyle = o.outline || OUTLINE; c.lineJoin = 'round'; c.lineCap = 'round'; c.stroke();
  }
  buildPath(c, m, shape);
  let style = base;
  if (o.grad) {
    const [x0, y0, x1, y1, stops] = o.grad;
    const p0 = M.ap(m, x0, y0), p1 = M.ap(m, x1, y1);
    style = c.createLinearGradient(p0[0], p0[1], p1[0], p1[1]);
    for (const [t, col] of stops) style.addColorStop(t, col);
  }
  c.fillStyle = style; c.fill(rule);
  if (o.details || o.shade !== false || o.light || o.after) {
    c.save();
    buildPath(c, m, shape); c.clip(rule);
    if (o.details) { c.save(); o.details(c); c.restore(); ID(c); }
    if (o.shade !== false) {
      const sh = o.shade || (o.mul ? mulColor(base, tone(base, -0.2)) : tone(base, -0.2));
      crescent(c, m, shape, rule, -(o.sdx ?? 10), -(o.sdy ?? 12), sh, o.shadeAlpha ?? 1, o.mul ? 'multiply' : null);
    }
    if (o.light) crescent(c, m, shape, rule, o.ldx ?? 7, o.ldy ?? 7, o.light, o.lightAlpha ?? 1);
    if (o.after) { c.save(); o.after(c); c.restore(); ID(c); }
    c.restore();
  }
  if (!o.noOutline && !o.under) {
    buildPath(c, m, shape);
    c.lineWidth = lw; c.strokeStyle = o.outline || OUTLINE; c.lineJoin = 'round'; c.lineCap = 'round'; c.stroke();
  }
  c.restore();
}
/** Plain stroke of a local-space shape with frame-space line width. */
export function strokeL(c, m, shape, lw = 3.5, color = OUTLINE, alpha = 1) {
  c.save(); buildPath(c, m, shape); c.globalAlpha *= alpha;
  c.lineWidth = lw * RIG.lwk; c.strokeStyle = color; c.lineJoin = 'round'; c.lineCap = 'round'; c.stroke(); c.restore();
}
export function fillL(c, m, shape, color, alpha = 1, rule = 'nonzero') {
  c.save(); buildPath(c, m, shape); c.globalAlpha *= alpha; c.fillStyle = color; c.fill(rule); c.restore();
}
/** gloss()/glint() at a local point, oriented with the matrix. */
export function glossL(c, m, x, y, rx, ry, rot = -0.6, alpha = 0.7) {
  const [X, Y] = M.ap(m, x, y); const s = M.scale(m);
  c.save(); ID(c); gloss(c, X, Y, rx * s, ry * s, rot + M.angle(m), alpha); c.restore();
}
export function glintL(c, m, x, y, s = 8, rot = -0.6, alpha = 0.95) {
  const [X, Y] = M.ap(m, x, y); const k = M.scale(m);
  c.save(); ID(c); glint(c, X, Y, s * k, rot + M.angle(m), alpha); c.restore();
}

/** Closed tube outline around a centre polyline (round caps), radius r0 -> r1. */
export function tubeShape(pts, r0, r1 = r0) {
  return (c) => {
    const n = pts.length; const N = []; const Rr = [];
    for (let i = 0; i < n; i++) {
      const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)];
      let tx = b[0] - a[0], ty = b[1] - a[1]; const l = Math.hypot(tx, ty) || 1; tx /= l; ty /= l;
      N.push([-ty, tx]); Rr.push(lerp(r0, r1, n > 1 ? i / (n - 1) : 0));
    }
    c.moveTo(pts[0][0] + N[0][0] * Rr[0], pts[0][1] + N[0][1] * Rr[0]);
    for (let i = 1; i < n; i++) c.lineTo(pts[i][0] + N[i][0] * Rr[i], pts[i][1] + N[i][1] * Rr[i]);
    const ae = Math.atan2(N[n - 1][1], N[n - 1][0]);
    c.arc(pts[n - 1][0], pts[n - 1][1], Rr[n - 1], ae, ae - Math.PI, true);
    for (let i = n - 1; i >= 0; i--) c.lineTo(pts[i][0] - N[i][0] * Rr[i], pts[i][1] - N[i][1] * Rr[i]);
    const as = Math.atan2(N[0][1], N[0][0]);
    c.arc(pts[0][0], pts[0][1], Rr[0], as + Math.PI, as, true);
    c.closePath();
  };
}

// -----------------------------------------------------------------------------
// Shoes (local space: sole bottom-centre at 0,0, toe toward +x)
// -----------------------------------------------------------------------------
const shoeShape = (L = 1) => (c) => {
  c.moveTo(-12 * L, -2); c.lineTo(15 * L, -2);
  c.quadraticCurveTo(24 * L, -2, 23.5 * L, -10);
  c.quadraticCurveTo(22 * L, -19, 8 * L, -21);
  c.quadraticCurveTo(-6 * L, -23.5, -13 * L, -18);
  c.quadraticCurveTo(-18 * L, -13, -17 * L, -7);
  c.quadraticCurveTo(-16 * L, -2, -12 * L, -2);
  c.closePath();
};
const bootShape = (c) => {
  c.moveTo(-12, -2); c.lineTo(15, -2);
  c.quadraticCurveTo(24, -2, 23, -10);
  c.quadraticCurveTo(21, -17, 8, -18);
  c.lineTo(6, -27); c.quadraticCurveTo(-4, -31, -13, -27);
  c.lineTo(-16, -10); c.quadraticCurveTo(-17, -2, -12, -2);
  c.closePath();
};
export const SHOE_ANKLE = [-2, -15];

export function drawShoe(c, foot, st, far) {
  const m = M.chain(M.T(foot.x, foot.y), M.R(foot.a || 0), M.S(st.scale || 1));
  const col = far ? tone(st.color, -0.12) : st.color;
  const shape = st.style === 'boot' ? bootShape : shoeShape(st.len || 1);
  cel(c, m, shape, {
    fill: col, shade: tone(col, -0.22), sdx: 4, sdy: 4, light: tone(col, 0.25), ldx: 3, ldy: 3, lightAlpha: 0.8,
    lw: st.lw ?? 5.5,
    details: (g) => {
      if (st.sole) { // sole band
        fillL(g, m, (cc) => cc.rect(-30, -8, 60, 10), far ? tone(st.sole, -0.1) : st.sole);
        strokeL(g, m, (cc) => { cc.moveTo(-30, -8); cc.lineTo(30, -8); }, 3, OUTLINE, 0.9);
      }
      if (st.cap) { // toe cap
        fillL(g, m, (cc) => { cc.moveTo(12, -8); cc.quadraticCurveTo(10, -18, 22, -16); cc.lineTo(30, -16); cc.lineTo(30, -8); cc.closePath(); }, far ? tone(st.cap, -0.1) : st.cap);
      }
      if (st.stripe) { // side stripe (sneaker)
        strokeL(g, m, (cc) => { cc.moveTo(-8, -10); cc.quadraticCurveTo(0, -17, 9, -12); }, 4, st.stripe, 0.95);
      }
      if (st.strap) {
        strokeL(g, m, (cc) => { cc.moveTo(-2, -20); cc.lineTo(4, -9); }, 5, st.strap);
      }
    },
    after: (g) => { glintL(g, m, 4, -15, 3.2, -0.3, 0.85); },
  });
  if (st.lace) {
    const [lx, ly] = M.ap(m, 2, -21);
    c.save(); c.fillStyle = st.lace; c.strokeStyle = OUTLINE; c.lineWidth = 3;
    c.beginPath(); c.arc(lx, ly, 4.2, 0, TAU); c.fill(); c.stroke(); c.restore();
  }
}

// -----------------------------------------------------------------------------
// Limbs
// -----------------------------------------------------------------------------
export function drawLeg(c, hip, foot, st, far) {
  const fm = M.chain(M.T(foot.x, foot.y), M.R(foot.a || 0));
  const ank = M.ap(fm, (st.ankle || SHOE_ANKLE)[0], (st.ankle || SHOE_ANKLE)[1]);
  const dx = ank[0] - hip[0], dy = ank[1] - hip[1]; const d = Math.hypot(dx, dy) || 1;
  const rest = st.len;
  const bend = Math.sqrt(Math.max(0, rest * rest - d * d)) * 0.55 * (st.knee ?? 1);
  let px = -dy / d, py = dx / d; if (px < 0) { px = -px; py = -py; }
  const ctrl = [(hip[0] + ank[0]) / 2 + px * bend, (hip[1] + ank[1]) / 2 + py * bend];
  const pts = qpts(hip, ctrl, ank, 12);
  const col = far ? (st.farColor || tone(st.color, -0.13)) : st.color;
  cel(c, M.I, tubeShape(pts, st.w / 2, st.w / 2 * (st.taper ?? 0.92)), {
    fill: col, shade: tone(col, -0.2), sdx: 4, sdy: 2, lw: st.lw ?? 5.5,
  });
  if (st.shoe) drawShoe(c, foot, st.shoe, far);
}

/** ang: frame-space angle (0 = down, +pi/2 = forward(+x), pi = up). */
export function drawArm(c, sh, ang, st, far, bend = 0.18, lenK = 1) {
  const len = st.len * lenK;
  const dir = [Math.sin(ang), Math.cos(ang)];
  const end = [sh[0] + dir[0] * len, sh[1] + dir[1] * len];
  const perp = [dir[1], -dir[0]];
  const ctrl = [(sh[0] + end[0]) / 2 + perp[0] * bend * len, (sh[1] + end[1]) / 2 + perp[1] * bend * len];
  const pts = qpts(sh, ctrl, end, 10);
  const col = far ? (st.farColor || tone(st.color, -0.14)) : st.color;
  cel(c, M.I, tubeShape(pts, st.w / 2, st.w / 2 * 0.95), { fill: col, shade: tone(col, -0.2), sdx: 3, sdy: 3, lw: st.lw ?? 5.5 });
  const hr = st.hand;
  const hc = [end[0] + dir[0] * hr * 0.35, end[1] + dir[1] * hr * 0.35];
  const hcol = far ? (st.farColor || tone(st.handColor || st.color, -0.14)) : (st.handColor || st.color);
  cel(c, M.T(hc[0], hc[1]), circle(0, 0, hr), {
    fill: hcol, shade: tone(hcol, -0.2), sdx: 4, sdy: 4, light: tone(hcol, 0.35), ldx: 3, ldy: 3, lightAlpha: 0.7, lw: st.lw ?? 5.5,
  });
  return hc;
}

// -----------------------------------------------------------------------------
// Face
// -----------------------------------------------------------------------------
/**
 * Draws the shared-style face. Face params live on ch.face:
 *   x, y (local centre), shift (3/4 shift toward +x), sp (eye spacing), es (eye scale),
 *   ex/ey (eye x/y stretch), eyeY, mx, my, ms (mouth), bx, by, bs, blushColor
 */
export function drawFace(R, extra = {}) {
  const { c, ch, pose: p } = R; const F = ch.face;
  const turn = p.turn || 0;
  const shift = (F.shift ?? 14) * (1 - turn);
  const [cx, cy] = R.P(F.x + shift + (p.faceDx || 0), F.y + (p.faceDy || 0));
  const fsx = 1 + (p.sx - 1) * 0.45, fsy = 1 + (p.sy - 1) * 0.45;
  const ang = p.rot - Math.atan(p.kx || 0) * 0.55 + (p.faceRot || 0);
  const fm = M.chain(M.T(cx, cy), M.R(ang), M.S(fsx * (F.scale || 1), fsy * (F.scale || 1)));
  const far = 1 - turn; // 0..1 how much the right eye is foreshortened
  const kind = extra.eyes || p.eyes;
  const look = p.look || [0, 0];
  // blush
  if (p.blush !== 0) {
    for (const side of [-1, 1]) {
      const fs = side > 0 ? 1 - 0.25 * far : 1;
      const bm = M.mul(fm, M.chain(M.T(side * F.bx * (side > 0 ? 1 - 0.1 * far : 1), F.by), M.S(fs, 1)));
      setT(c, bm); blush(c, 0, 0, F.bs ?? 1.1, F.blushColor);
    }
  }
  // eyes
  for (const side of [-1, 1]) {
    const fs = side > 0 ? 1 - 0.16 * far : 1;
    const ex = side * F.sp / 2 - (side > 0 ? 2.5 * far : 0);
    const em = M.mul(fm, M.chain(M.T(ex, F.eyeY ?? 0), M.S((F.ex ?? 0.88) * fs, F.ey ?? 1.1)));
    setT(c, em);
    let k = kind;
    if (kind === 'blinkHalf') k = 'closed';
    eye(c, 0, 0, F.es ?? 1.1, k, -side, look); // lib's `side` sign is mirrored for brows/wince
  }
  // mouth
  const mk = extra.mouth || p.mouth;
  if (mk) {
    const mm = M.mul(fm, M.chain(M.T((F.mx ?? 0) + (p.mouthDx || 0), F.my ?? 22), M.S(p.mouthS || 1)));
    setT(c, mm); mouth(c, 0, 0, F.ms ?? 1, mk);
  }
  ID(c);
  return fm;
}


// -----------------------------------------------------------------------------
// Silhouette hull (local space) by ray-casting the character's main shapes.
// Used to rest a rotated / squashed body exactly on the ground line.
// -----------------------------------------------------------------------------
let _hullCtx = null;
export function getHull(ch) {
  if (ch._hull) return ch._hull;
  if (!_hullCtx) _hullCtx = canvas(4, 4).getContext('2d');
  const paths = (ch.hullShapes || []).map((sh) => { const p = new Path2D(); sh(p); return p; });
  const inside = (x, y) => paths.some((p) => _hullCtx.isPointInPath(p, x, y));
  const cx = 0, cy = -ch.H / 2; const pts = [];
  for (let i = 0; i < 96; i++) {
    const a = (i / 96) * TAU; let lo = 0, hi = 220;
    for (let k = 0; k < 22; k++) { const r = (lo + hi) / 2; if (inside(cx + Math.cos(a) * r, cy + Math.sin(a) * r)) lo = r; else hi = r; }
    pts.push([cx + Math.cos(a) * lo, cy + Math.sin(a) * lo]);
  }
  ch._hull = pts;
  return pts;
}
/** `by` that makes the body hull's lowest point sit `gap` px above the ground line. */
export function restBy(ch, p, gap = 2) {
  const m = M.chain(M.R(p.rot), M.K(p.kx || 0), M.S(p.sx, p.sy));
  let maxY = -1e9;
  for (const [x, y] of getHull(ch)) { const q = M.ap(m, x, y); if (q[1] > maxY) maxY = q[1]; }
  // rootY = AY - legLen + by ; lowest = rootY + maxY = AY - gap
  return ch.legLen - gap - maxY;
}

// -----------------------------------------------------------------------------
// Pose library
//   Arms: angle 0 = hanging down, +pi/2 = forward (+x), pi = up, -pi/2 = back.
//   The NEAR arm sits on the left (back) edge of the body and is drawn in front;
//   the FAR arm sits on the right (front) edge and is drawn behind the body.
//   => "outward" is negative for the near arm and positive for the far arm.
// -----------------------------------------------------------------------------
export function basePose() {
  return {
    bx: 0, by: 0, rot: 0, kx: 0, sx: 1, sy: 1, k: 1,
    feet: [{ x: -15, y: 0, a: 0 }, { x: 15, y: 0, a: 0 }], feetLocal: false,
    arms: [{ a: -0.45, bend: -0.12, len: 1 }, { a: 0.45, bend: 0.12, len: 1 }],
    eyes: 'open', mouth: 'smile', look: [2, 0], turn: 0, blush: 1, faceRot: 0,
    acc: { t: 0, sway: 0, amp: 0.15, dir: Math.PI - 1.2, wob: 0, wind: 0, phase: 0 },
    aura: 0, sweat: 0, frame: 0, anim: 'idle', fit: null,
  };
}

const RUN_ST = 0.36;
export function runFoot(p, sxr = 24, lift = 24) {
  p = wrap(p);
  if (p < RUN_ST) { const s = p / RUN_ST; return { x: lerp(sxr, -sxr, s), y: 0, a: s > 0.8 ? (s - 0.8) * 0.9 : 0 }; }
  const s = (p - RUN_ST) / (1 - RUN_ST);
  const K = [[-sxr, 0], [-sxr * 1.15, -lift * 0.62], [-sxr * 0.35, -lift], [sxr * 0.65, -lift * 0.82], [sxr * 1.18, -lift * 0.3], [sxr, 0]];
  const [x, y] = catmull(K, s);
  const a = s < 0.32 ? 0.55 * Math.sin(Math.PI * s / 0.32) : -0.3 * Math.sin(Math.PI * (s - 0.32) / 0.68);
  return { x, y: Math.min(0, y), a };
}
const armBend = (a, k = 0.3) => k * clamp(a * 1.5, -1, 1);

/** Pose for sheet frame i. ch may override/extend via ch.pose(p, i). */
export function makePose(ch, i) {
  const p = basePose(); p.frame = i;
  const H = ch.H;
  const stride = ch.stride ?? 24, lift = ch.lift ?? 24;
  const fsp = ch.footSpread ?? 15;
  if (i <= 7) { // ---------------- run
    const t = i / 8, u = wrap(2 * t);
    const cb = Math.cos(TAU * (u - 0.25)); // +1 lowest (u=.25), -1 highest (u=.75)
    p.anim = 'run';
    p.by = cb > 0 ? 5 * cb : 8 * cb;
    p.sy = 1 - 0.045 * cb; p.sx = 1 + 0.04 * cb;
    p.rot = 0.1 + 0.025 * Math.sin(TAU * u);
    p.bx = 4;
    const fn = runFoot(t, stride, lift), ff = runFoot(t + 0.5, stride, lift);
    p.feet = [{ x: fn.x - 4, y: fn.y, a: fn.a }, { x: ff.x + 5, y: ff.y - 1, a: ff.a }];
    const sw = Math.cos(TAU * t);
    const an = 0.1 - 0.95 * sw, af = 0.05 + 0.9 * sw;
    p.arms = [{ a: an, bend: armBend(an), len: 1 }, { a: af, bend: armBend(af), len: 1 }];
    p.eyes = 'open'; p.mouth = ch.runMouth || 'grin'; p.look = [4, 0];
    p.acc = { t, u, cb, sway: Math.cos(TAU * (u - 0.25 - 0.17)), amp: 0.38, dir: Math.PI - 0.32 + 0.06 * cb, wob: Math.sin(TAU * (u - 0.1)), wind: 1, phase: 2 * t };
  } else if (i === 8) { // ---------------- jump (launch)
    p.anim = 'jump';
    p.by = -14; p.sy = 1.08; p.sx = 0.93; p.rot = -0.03; p.bx = 2;
    p.feet = [{ x: -14, y: -16, a: 0.65 }, { x: -30, y: -8, a: 0.75 }];
    p.arms = [{ a: -2.45, bend: 0.15, len: 1.15 }, { a: 2.5, bend: -0.15, len: 1.15 }];
    p.eyes = 'happy'; p.mouth = 'grin'; p.look = [3, -2];
    p.acc = { sway: 1, amp: 0.14, dir: Math.PI - 1.05, wob: 0.8, wind: 0.6, phase: 0.2 };
  } else if (i === 9) { // ---------------- apex
    p.anim = 'apex';
    p.by = -12; p.rot = 0; p.bx = 2;
    p.feet = [{ x: 14, y: -12, a: -0.25 }, { x: -12, y: -8, a: 0.25 }];
    p.arms = [{ a: -1.8, bend: -0.15, len: 1.0 }, { a: 1.85, bend: 0.15, len: 1.0 }];
    p.eyes = 'open'; p.mouth = 'smile'; p.look = [3, -1];
    p.acc = { sway: 0, amp: 0.2, dir: Math.PI - 0.75, wob: 0, wind: 0.3, phase: 0.45 };
  } else if (i === 10) { // ---------------- tuck: compact ball, body centre at (144,190)
    p.anim = 'tuck';
    const k = ch.tuckScale ?? 0.88;
    p.sx = 1.02 * k; p.sy = 0.92 * k; p.rot = 0.1;
    const cy = (ch.tuckCy ?? H * 0.5) * p.sy;
    const tY = AY - (AY - 190) / (ch.k ?? 1); // so that after the global scale the centre lands on y=190
    const rootX = AX - cy * Math.sin(p.rot), rootY = tY + cy * Math.cos(p.rot);
    p.bx = rootX - AX; p.by = rootY - (AY - ch.legLen);
    p.feetLocal = true;
    p.feet = [{ x: 30, y: -6, a: -0.9 }, { x: 10, y: -2, a: -0.7 }];
    p.arms = [{ a: 0.75, bend: 0.35, len: 0.9 }, { a: 0.3, bend: 0.2, len: 0.85 }];
    p.eyes = 'wince'; p.mouth = 'flat'; p.look = [0, 0];
    p.acc = { sway: -0.6, amp: 0.1, dir: Math.PI + 0.9, wob: -0.6, wind: 0.5, phase: 0.6, curl: 1 };
  } else if (i === 11) { // ---------------- fall
    p.anim = 'fall';
    p.by = -6; p.sy = 1.04; p.sx = 0.97; p.rot = -0.05;
    p.feet = [{ x: 12, y: -2, a: 0.2 }, { x: -12, y: 2, a: 0.35 }];
    p.arms = [{ a: -2.7, bend: 0.25, len: 1.15 }, { a: 2.55, bend: -0.25, len: 1.15 }];
    p.eyes = 'wide'; p.mouth = 'o'; p.look = [1, -4];
    p.acc = { sway: -1, amp: 0.25, dir: Math.PI + 0.75, wob: -1, wind: 0.6, phase: 0.75 };
  } else if (i === 12 || i === 13) { // ---------------- slide (drawn big then shrunk by k)
    const v = i - 12;
    p.anim = 'slide';
    p.k = ch.slideK ?? 0.84; p.maxH = 108;
    p.kx = ch.slideKx ?? 0.1; p.rot = ch.slideRot ?? -0.27;
    p.sy = ch.slideSy ?? 0.71; p.sx = ch.slideSx ?? 1.08;
    p.bx = ch.slideBx ?? 6; p.by = restBy(ch, p, 2) + (v ? 1.5 : 0);
    p.feet = [{ x: 58 + v * 2, y: -1, a: -0.55 }, { x: 38 - v, y: -3, a: -0.45 }];
    p.arms = [{ a: -1.78 - v * 0.06, bend: -0.2, len: 1.0 }, { a: 1.25 + v * 0.06, bend: 0.2, len: 1 }];
    p.eyes = 'determined'; p.mouth = v ? 'teeth' : 'grin'; p.look = [4, 0];
    p.acc = { sway: v ? 0.4 : -0.4, amp: 0.3, dir: Math.PI + 0.12, wob: v ? 0.5 : -0.5, wind: 1, phase: v * 0.5 };
  } else if (i === 14) { // ---------------- land squash
    p.anim = 'land';
    p.sy = 0.85; p.sx = 1.12; p.by = 6;
    p.feet = [{ x: 24, y: 0, a: 0 }, { x: -22, y: 0, a: 0 }];
    p.arms = [{ a: -0.9, bend: -0.15, len: 1 }, { a: 0.85, bend: 0.15, len: 1 }];
    p.eyes = 'closed'; p.mouth = 'grin'; p.look = [0, 0];
    p.acc = { sway: 1, amp: 0.12, dir: Math.PI - 1.15, wob: 1, wind: 0.2, phase: 0.1 };
  } else if (i === 15) { // ---------------- hurt (knocked back)
    p.anim = 'hurt';
    p.rot = -0.22; p.bx = 0; p.by = -4; p.sy = 1.02; p.sx = 0.98;
    p.feet = [{ x: 24, y: -14, a: -0.5 }, { x: -12, y: 0, a: 0 }];
    p.arms = [{ a: -2.62, bend: 0.3, len: 1.05 }, { a: 2.1, bend: -0.3, len: 1.1 }];
    p.eyes = 'wince'; p.mouth = 'wavy'; p.look = [0, 0]; p.sweat = 1;
    p.acc = { sway: 0.8, amp: 0.3, dir: Math.PI + 1.05, wob: 0.8, wind: 0.7, phase: 0.3 };
  } else if (i === 16) { // ---------------- down: stumbling, exhausted
    p.anim = 'down';
    p.rot = 0.26; p.bx = 6; p.by = 7; p.sy = 0.93; p.sx = 1.04;
    p.feet = [{ x: 10, y: 0, a: 0.1 }, { x: -16, y: 0, a: -0.1 }];
    p.arms = [{ a: -0.12, bend: -0.05, len: 1 }, { a: 0.12, bend: 0.05, len: 1 }];
    p.eyes = 'sad'; p.mouth = 'frown'; p.look = [1, 3]; p.turn = 0.2; p.sweat = 1;
    p.acc = { sway: 0, amp: 0.05, dir: Math.PI - 1.3, wob: 0, wind: 0, phase: 0.5 };
  } else if (i === 17) { // ---------------- down: lying flat on its back (auto-fit to ground)
    p.anim = 'down';
    p.rot = -Math.PI / 2 + 0.18; p.sx = ch.lieSx ?? 0.76; p.sy = 1.02;
    p.bx = 0; p.by = restBy(ch, p, 1); p.fit = 'ground';
    p.feetLocal = true;
    p.feet = [{ x: 12, y: 42, a: 0.79 }, { x: 41, y: 27, a: 0.19 }];
    p.arms = [{ a: -3.3, bend: 0.2, len: 1.05 }, { a: 0.5, bend: -0.25, len: 1.05 }];
    p.eyes = 'swirl'; p.mouth = 'wavy'; p.look = [0, 0]; p.turn = 0.45; p.faceRot = 0.42;
    p.acc = { sway: 0, amp: 0.03, dir: 0.1, wob: 0, wind: 0, phase: 0, lying: 1 };
  } else if (i === 18 || i === 19) { // ---------------- pit fall flail
    const v = i - 18;
    p.anim = 'pit';
    p.by = -8; p.sy = 1.05; p.sx = 0.96; p.rot = v ? 0.06 : -0.06;
    p.feet = v ? [{ x: -10, y: -4, a: 0.4 }, { x: 14, y: -12, a: -0.2 }] : [{ x: 14, y: -12, a: -0.3 }, { x: -12, y: -2, a: 0.4 }];
    p.arms = v ? [{ a: -2.9, bend: 0.25, len: 1.15 }, { a: 2.4, bend: -0.25, len: 1.15 }] : [{ a: -2.4, bend: -0.25, len: 1.15 }, { a: 2.9, bend: 0.25, len: 1.15 }];
    p.eyes = 'wide'; p.mouth = 'o'; p.look = [0, -4];
    p.acc = { sway: v ? 1 : -1, amp: 0.35, dir: Math.PI + 0.95 + (v ? 0.15 : -0.1), wob: v ? 1 : -1, wind: 0.8, phase: v * 0.5 };
  } else if (i === 20 || i === 21) { // ---------------- skill power pose
    const v = i - 20;
    p.anim = 'skill';
    p.by = v ? -8 : -2; p.sy = v ? 1.05 : 1.02; p.sx = v ? 0.97 : 0.99; p.rot = -0.04;
    p.feet = [{ x: 22, y: v ? -6 : 0, a: v ? -0.2 : 0 }, { x: -20, y: v ? -4 : 0, a: v ? 0.2 : 0 }];
    p.arms = [{ a: -2.8 + v * 0.08, bend: 0.1, len: 1.2 }, { a: 0.95 - v * 0.08, bend: 0.35, len: 1.0 }];
    p.eyes = 'determined'; p.mouth = 'grin'; p.look = [3, -2]; p.turn = 0.35;
    p.aura = 1 + v;
    p.acc = { sway: v ? 1 : -1, amp: 0.3, dir: Math.PI - 1.2, wob: v ? 1 : -1, wind: 0.8, phase: v * 0.5 };
  } else if (i >= 22 && i <= 25) { // ---------------- idle (facing viewer more), breathing
    const k = i - 22; const b = Math.cos(TAU * k / 4);
    p.anim = 'idle';
    p.sy = 1 + 0.02 * b; p.sx = 1 - 0.014 * b; p.by = -0.5 * b; p.rot = 0;
    p.feet = [{ x: -fsp, y: 0, a: -0.12 }, { x: fsp + 2, y: 0, a: 0.06 }];
    p.arms = [{ a: -0.42 - 0.05 * b, bend: -0.12, len: 1 }, { a: 0.42 + 0.05 * b, bend: 0.12, len: 1 }];
    p.eyes = k === 2 ? 'closed' : 'open'; p.mouth = ch.idleMouth || 'smile'; p.look = [1, 1]; p.turn = 0.75;
    p.acc = { sway: -b, amp: 0.06, dir: Math.PI - 1.2 + 0.05 * b, wob: Math.sin(TAU * k / 4), wind: 0, phase: k / 4, idle: 1 };
  } else if (i === 26 || i === 27) { // ---------------- cheer
    const v = i - 26;
    p.anim = 'cheer';
    p.by = v ? -16 : 3; p.sy = v ? 1.05 : 0.96; p.sx = v ? 0.97 : 1.04; p.rot = 0;
    p.feet = v ? [{ x: -12, y: -12, a: 0.3 }, { x: 14, y: -14, a: -0.15 }] : [{ x: -18, y: 0, a: -0.1 }, { x: 19, y: 0, a: 0.1 }];
    p.arms = v ? [{ a: -2.7, bend: 0.1, len: 1.2 }, { a: 2.7, bend: -0.1, len: 1.2 }] : [{ a: -2.35, bend: 0.15, len: 1.15 }, { a: 2.35, bend: -0.15, len: 1.15 }];
    p.eyes = 'happy'; p.mouth = 'grin'; p.look = [0, 0]; p.turn = 0.6;
    p.acc = { sway: v ? -1 : 1, amp: 0.15, dir: Math.PI - (v ? 0.95 : 1.25), wob: v ? -1 : 1, wind: 0.3, phase: v * 0.5 };
  }
  if (ch.pose) ch.pose(p, i);
  return p;
}

// -----------------------------------------------------------------------------
// Rendering
// -----------------------------------------------------------------------------
export function rigFor(c, ch, pose, opts = {}) {
  const ax = opts.ax ?? AX, ay = opts.ay ?? AY;
  const rootX = ax + pose.bx, rootY = ay - ch.legLen + pose.by;
  const m = M.chain(M.T(rootX, rootY), M.R(pose.rot), M.K(pose.kx || 0), M.S(pose.sx, pose.sy));
  const mr = M.chain(M.T(rootX, rootY), M.R(pose.rot));
  const R = {
    c, ch, pose, m, mr, ax, ay, root: [rootX, rootY],
    P: (x, y) => M.ap(m, x, y),
    L: (...ms) => M.mul(m, M.chain(...ms)),
    cel: (shape, o, mm = m) => cel(c, mm, shape, o),
    face: (extra) => drawFace(R, extra),
  };
  return R;
}

function footFrame(R, f) {
  if (!R.pose.feetLocal) return { x: R.ax + f.x, y: R.ay + f.y, a: f.a || 0 };
  const [x, y] = M.ap(R.mr, f.x, f.y);
  return { x, y, a: (f.a || 0) + R.pose.rot };
}
export function drawLegs(R) {
  const { c, ch, pose } = R;
  for (const k of [1, 0]) { // far first
    const hip = R.P(...(k ? ch.hips.far : ch.hips.near));
    drawLeg(c, hip, footFrame(R, pose.feet[k]), ch.leg, k === 1);
  }
}
export function drawArmK(R, k) {
  const { c, ch, pose } = R;
  const a = pose.arms[k]; if (!a || a.hide) return null;
  const sh = R.P(...(k ? ch.shoulders.far : ch.shoulders.near));
  return drawArm(c, sh, a.a - pose.rot, ch.arm, k === 1, a.bend ?? 0.15, a.len ?? 1);
}

export function drawSweat(c, x, y, s = 1) {
  const sh = drop(0, 0, 7);
  const m = M.chain(M.T(x, y), M.R(0.35), M.S(s));
  cel(c, m, sh, { fill: '#9fe0ff', shade: '#62b7f0', sdx: 3, sdy: 3, lw: 4 });
  glintL(c, m, -2, -2, 2.4, -0.6, 0.95);
}

/** Silhouette glow behind (aura). */
export function silhouetteGlow(c, src, color, blur = 10, alpha = 0.9, grow = 1) {
  const L = layer(src.width, src.height, 2); const g = L.g;
  g.drawImage(src, 0, 0);
  g.globalCompositeOperation = 'source-in'; g.fillStyle = color; g.fillRect(0, 0, src.width, src.height);
  g.globalCompositeOperation = 'source-over';
  const L2 = layer(src.width, src.height, 3); const g2 = L2.g;
  g2.filter = `blur(${blur}px)`;
  for (let k = 0; k < grow; k++) g2.drawImage(L.cv, 0, 0);
  g2.filter = 'none';
  c.save(); ID(c); c.globalAlpha *= alpha; c.drawImage(L2.cv, 0, 0); c.restore();
}

/** Alpha bounding box of a canvas: [l, t, r, b] (r/b exclusive) or null. */
export function alphaBox(cv, thr = 24) {
  const w = cv.width, h = cv.height; const d = cv.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, w, h).data;
  let l = w, t = h, r = -1, b = -1;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (d[(y * w + x) * 4 + 3] > thr) { if (x < l) l = x; if (x > r) r = x; if (y < t) t = y; if (y > b) b = y; }
  return r < 0 ? null : [l, t, r + 1, b + 1];
}

/** Render one sheet frame to its own 288x288 canvas.
 *  The figure is drawn on an oversized canvas (anchor offset OX,OY) so that
 *  shrinking (pose.k) and ground-fitting (pose.fit) never lose pixels. */
export const BIG = { OX: 96, OY: 64 };
export function renderFigureBig(ch, pose) {
  const { OX, OY } = BIG;
  const W = FW + 2 * OX, H = FH + OY + 40;
  const ax = AX + OX, ay = AY + OY;
  const draw = (k) => {
    const big = canvas(W, H); const bg = big.getContext('2d', { willReadFrequently: true });
    bg.imageSmoothingEnabled = true; bg.imageSmoothingQuality = 'high';
    if (k !== 1) {
      const tmp = canvas(W, H); const tg = ctx2d(tmp);
      RIG.lwk = 1 / k;
      try { drawFigure(tg, ch, pose, { ax, ay }); } finally { RIG.lwk = 1; }
      bg.save(); bg.translate(ax, ay); bg.scale(k, k); bg.translate(-ax, -ay); bg.drawImage(tmp, 0, 0); bg.restore();
    } else drawFigure(bg, ch, pose, { ax, ay });
    return big;
  };
  let k = (pose.k ?? 1) * (ch.k ?? 1);
  let big = draw(k);
  if (pose.maxH) { // e.g. slide: total height above the anchor must stay <= maxH
    const bb = alphaBox(big);
    const h = bb ? ay - bb[1] : 0;
    if (h > pose.maxH) { k *= pose.maxH / h; big = draw(k); }
  }
  let dx = -OX, dy = -OY;
  if (pose.fit === 'ground') { // rest the lowest pixel on the anchor line, centre horizontally
    let bb = alphaBox(big);
    const maxW = FW - 2 * 14;
    if (bb && bb[2] - bb[0] > maxW) { k *= maxW / (bb[2] - bb[0]); big = draw(k); bb = alphaBox(big); }
    if (bb) dx = Math.round(AX - (bb[0] + bb[2]) / 2);
  }
  const fig = canvas(FW, FH); ctx2d(fig).drawImage(big, dx, dy);
  return fig;
}
export function renderFrame(ch, i) {
  const pose = makePose(ch, i);
  const cv = canvas(FW, FH); const c = ctx2d(cv);
  const fig = renderFigureBig(ch, pose);
  if (pose.aura) {
    if (ch.auraBack) ch.auraBack(c, pose.aura - 1, pose);
    silhouetteGlow(c, fig, ch.skillColor, 9, 1, 2);
    silhouetteGlow(c, fig, '#ffffff', 3, 0.85, 1);
  }
  c.drawImage(fig, 0, 0);
  if (pose.aura && ch.auraFront) ch.auraFront(c, pose.aura - 1, pose);
  return cv;
}

export function drawFigure(g, ch, pose, opts = {}) {
  const R = rigFor(g, ch, pose, opts);
  if (ch.back) ch.back(R);
  drawArmK(R, 1);
  if (!opts.noLegs) drawLegs(R);
  ch.body(R);
  if (ch.armUnder) { drawArmK(R, 0); if (ch.over) ch.over(R); }
  else { if (ch.over) ch.over(R); drawArmK(R, 0); }
  if (ch.top) ch.top(R);
  if (pose.sweat && ch.sweatAt) { const [x, y] = R.P(...ch.sweatAt); drawSweat(g, x, y, 1.1); }
  return R;
}

/** 192x192 portrait (head/face close-up, happy), centred, inside r ~ 90. */
export function renderPortrait(ch, size = 192, rMax = 92) {
  const W = 440; const big = canvas(W, W); const g = big.getContext('2d', { willReadFrequently: true });
  const pose = basePose();
  pose.eyes = 'happy'; pose.mouth = 'grin'; pose.turn = 0.8; pose.look = [0, 0];
  pose.arms = [{ hide: true }, { hide: true }];
  pose.acc = { sway: 0, amp: 0.05, dir: Math.PI - 1.25, wob: 0, wind: 0, phase: 0.25, idle: 1, portrait: 1 };
  pose.portrait = 1;
  if (ch.portraitPose) ch.portraitPose(pose);
  drawFigure(g, ch, pose, { ax: 220, ay: 340, noLegs: true });
  const d = g.getImageData(0, 0, W, W).data;
  const bb = alphaBox(big);
  const cx = (bb[0] + bb[2]) / 2, cy = (bb[1] + bb[3]) / 2;
  let rr = 1;
  for (let y = bb[1]; y < bb[3]; y++) for (let x = bb[0]; x < bb[2]; x++) if (d[(y * W + x) * 4 + 3] > 20) { const q = Math.hypot(x - cx, y - cy); if (q > rr) rr = q; }
  const s = Math.min(1.25, rMax / rr);
  const out = canvas(size, size); const o = ctx2d(out);
  o.imageSmoothingQuality = 'high';
  o.translate(size / 2, size / 2); o.scale(s, s); o.translate(-cx, -cy);
  o.drawImage(big, 0, 0);
  return out;
}
