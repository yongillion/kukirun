// =============================================================================
//  Dessert Dash — environment art kit (shared by lands.js and obstacles.js)
//  Underscore file = helper, not an export module.
//
//  Tiling model: a horizontally tileable image of width W is painted into an
//  extended canvas (W + 2*M) where every element is drawn with wrap copies at
//  dx = -W, 0, +W. Whole-canvas effects (blur, outlines) then behave correctly
//  across the seam and the centre W is cropped out.
// =============================================================================
import {
  canvas, ctx2d, rng, tone, mix, rgba, OUTLINE, fill, stroke, clipTo, innerShade, innerLight,
  gloss, glint, glow, sparkle, smooth, poly, circle, ellipse, rrect, blobPoints, linearGrad,
  radialGrad, lerp, clamp, TAU, star, drop, cloudCircles, cloud, part, hexToRgb,
} from '../lib.js';

export * from '../lib.js';

// ---------------------------------------------------------------------------
// Build filter (scratch previews pass ?only=meadow,obs_canyon ...)
// ---------------------------------------------------------------------------
export const ONLY = (() => {
  try { return new URLSearchParams(globalThis.location?.search || '').get('only') || ''; } catch { return ''; }
})();
export function want(id) {
  if (!ONLY) return true;
  return ONLY.split(',').some((k) => k && id.includes(k));
}

// ---------------------------------------------------------------------------
// Periodic helpers
// ---------------------------------------------------------------------------
export const TM = 96; // tiling margin used by tiled() / wrapAt()

/** y(x) = base + sum a*sin(2πkx/W + p) — integer k => tiles with period W. */
export function periodic(W, base, terms) {
  return (x) => {
    let y = base;
    for (const [k, a, p] of terms) y += a * Math.sin(TAU * k * x / W + p);
    return y;
  };
}
/** periodic() with random phases. spec = [[k, amp], ...] */
export function waves(R, W, base, spec) {
  return periodic(W, base, spec.map(([k, a]) => [k, a, R() * TAU]));
}
/** call fn(dx) for each wrap copy of [x0,x1] that touches [-M, W+M]. */
export function wrapX(W, x0, x1, fn, M = TM) {
  for (const dx of [0, -W, W]) if (x1 + dx > -M && x0 + dx < W + M) fn(dx);
}
/** wrapX + translate. */
export function wrapAt(g, W, x0, x1, fn, M = TM) {
  wrapX(W, x0, x1, (dx) => { g.save(); g.translate(dx, 0); fn(dx); g.restore(); }, M);
}
/** Paint a horizontally tileable canvas of W×H. draw(g, W, H) paints in [-M, W+M]. */
export const SEAM_DEBUG = (() => { try { return new URLSearchParams(globalThis.location?.search || '').has('seamdebug'); } catch { return false; } })();
export function tiled(W, H, draw, M = TM, label = '') {
  const c = canvas(W + 2 * M, H);
  const g = ctx2d(c);
  g.translate(M, 0);
  draw(g, W, H);
  if (SEAM_DEBUG) {
    // exact periodicity test right at the seam: E[W..W+k) == E[0..k) and E[W-k..W) == E[-k..0)
    const k = 8;
    let ys = [1e9, -1];
    const cmp = (x1, x2) => { const a = g.getImageData(x1, 0, k, H).data, b = g.getImageData(x2, 0, k, H).data; let w = 0, s = 0; for (let i = 0; i < a.length; i++) { const d = Math.abs(a[i] - b[i]); s += d; if (d > w) w = d; if (d > 24) { const y = Math.floor(i / 4 / k); ys = [Math.min(ys[0], y), Math.max(ys[1], y)]; } } return [s / a.length, w]; };
    const [m1, w1] = cmp(M + W, M), [m2, w2] = cmp(M + W - k, M - k);
    const bad = m1 > 0.02 || m2 > 0.02 || w1 > 24 || w2 > 24;
    console.log(`[seam] ${label || W + 'x' + H} right=${m1.toFixed(3)}/${w1} left=${m2.toFixed(3)}/${w2}${bad ? '  <-- NOT PERIODIC rows ' + ys.join('..') : ''}`);
  }
  const out = canvas(W, H);
  ctx2d(out).drawImage(c, -M, 0);
  return out;
}
/** Copy a sub-window of a (periodic) canvas into ctx. */
export function blitWindow(g, src, sx, sy, w, h, dx = 0, dy = 0) {
  g.drawImage(src, sx, sy, w, h, dx, dy, w, h);
}

// ---------------------------------------------------------------------------
// Shapes
// ---------------------------------------------------------------------------
/** Area under a function curve (y=f(x)) down to `bottom`. */
export const ridgeShape = (f, x0, x1, bottom, step = 3) => (c) => {
  c.moveTo(x0, bottom);
  c.lineTo(x0, f(x0));
  for (let x = x0 + step; x < x1; x += step) c.lineTo(x, f(x));
  c.lineTo(x1, f(x1));
  c.lineTo(x1, bottom);
  c.closePath();
};
/** Open polyline of a function curve (for outlining just the top edge). */
export const ridgeLine = (f, x0, x1, step = 3) => (c) => {
  c.moveTo(x0, f(x0));
  for (let x = x0 + step; x < x1; x += step) c.lineTo(x, f(x));
  c.lineTo(x1, f(x1));
};
/** Union of circles [[x,y,r],...] */
export const circles = (list) => (c) => { for (const [x, y, r] of list) { c.moveTo(x + r, y); c.arc(x, y, r, 0, TAU); } };
/** Path through points as a polyline (closed). */
export const pathOf = (pts, closed = true) => poly(pts, closed);

/** Cel-shaded fill of a union shape with an outline ONLY around the outside. */
export function unionPart(g, shape, o = {}) {
  const lw = o.lw ?? 3;
  if (!o.noOutline && lw > 0) stroke(g, shape, lw * 2, o.outline || OUTLINE);
  const base = o.fill || '#cccccc';
  fill(g, shape, o.grad ? linearGrad(g, ...o.grad) : (o.style || base));
  if (o.shade !== false) shadeU(g, shape, o.shade || tone(base, -0.2), o.shadeDx ?? 8, o.shadeDy ?? 10, o.shadeAlpha ?? 1);
  if (o.light) lightU(g, shape, o.light, o.lightDx ?? 6, o.lightDy ?? 6, o.lightAlpha ?? 1);
}
/** part() but with optional gradient style + outline that can be switched off. */
export function cel(g, shape, o = {}) {
  const base = o.fill || '#cccccc';
  fill(g, shape, o.style || (o.grad ? linearGrad(g, ...o.grad) : base), o.rule || 'nonzero');
  if (o.shade !== false) innerShade(g, shape, o.shade || tone(base, -0.2), o.shadeDx ?? 8, o.shadeDy ?? 10, o.shadeAlpha ?? 1);
  if (o.light) innerLight(g, shape, o.light, o.lightDx ?? 6, o.lightDy ?? 6, o.lightAlpha ?? 1);
  if (!o.noOutline && (o.lw ?? 3) > 0) stroke(g, shape, o.lw ?? 3, o.outline || OUTLINE);
}

/** Soft vertical alpha fade toward `col` (atmospheric haze) over [y0,y1] of a canvas region. */
export function hazeBand(g, x0, x1, y0, y1, col, a0 = 0, a1 = 0.6) {
  g.save();
  g.fillStyle = linearGrad(g, 0, y0, 0, y1, [[0, rgba(col, a0)], [1, rgba(col, a1)]]);
  g.fillRect(x0, y0, x1 - x0, y1 - y0);
  g.restore();
}
/** Same but only on already-painted pixels (keeps transparency). */
export function hazeOnPaint(g, x0, x1, y0, y1, col, a0 = 0, a1 = 0.6) {
  g.save();
  g.globalCompositeOperation = 'source-atop';
  hazeBand(g, x0, x1, y0, y1, col, a0, a1);
  g.restore();
}

// ---------------------------------------------------------------------------
// Candy details
// ---------------------------------------------------------------------------
export function sprinkle(g, x, y, len, w, rot, col, oc = null) {
  g.save();
  g.translate(x, y); g.rotate(rot);
  g.lineCap = 'round';
  g.beginPath(); g.moveTo(-len / 2, 0); g.lineTo(len / 2, 0);
  if (oc) { g.strokeStyle = oc; g.lineWidth = w + 2.2; g.stroke(); }
  g.strokeStyle = col; g.lineWidth = w; g.stroke();
  g.strokeStyle = 'rgba(255,255,255,0.55)'; g.lineWidth = Math.max(0.8, w * 0.3);
  g.beginPath(); g.moveTo(-len / 2 + w * 0.3, -w * 0.18); g.lineTo(len / 2 - w * 0.6, -w * 0.18); g.stroke();
  g.restore();
}
export const SPRINKLE_COLS = ['#ff6fa5', '#ffd23f', '#6fd3ff', '#8ee06a', '#b88cff', '#ff9a4a', '#ffffff'];

/** Swirl stripes clipped to a circle (lollipop disc) — does not outline. */
export function swirlFill(g, cx, cy, r, colA, colB, { arms = 2, turns = 1.25, rot = 0, band = null } = {}) {
  clipTo(g, circle(cx, cy, r), () => {
    fill(g, circle(cx, cy, r + 1), colA);
    g.save(); g.translate(cx, cy); g.rotate(rot);
    const bw = band ?? (TAU / arms) * 0.5;
    for (let k = 0; k < arms; k++) {
      const a0 = (k * TAU) / arms;
      const N = 80;
      g.beginPath();
      for (let i = 0; i <= N; i++) { const t = i / N; const a = a0 + t * turns * TAU; const rr = r * 1.2 * t; g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
      for (let i = N; i >= 0; i--) { const t = i / N; const a = a0 + bw + t * turns * TAU; const rr = r * 1.2 * t; g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
      g.closePath(); g.fillStyle = colB; g.fill();
    }
    g.restore();
  });
}

/** A swirl lollipop on a stick. (x, baseY) = stick bottom. */
export function lollipop(g, x, baseY, h, r, o = {}) {
  const lw = o.lw ?? 2.5, oc = o.outline || OUTLINE;
  const cy = baseY - h;
  const stickW = o.stickW ?? Math.max(3, r * 0.16);
  const lean = o.lean ?? 0;
  const tx = x + lean;
  // stick
  const st = poly([[x - stickW / 2, baseY + 2], [tx - stickW / 2, cy], [tx + stickW / 2, cy], [x + stickW / 2, baseY + 2]]);
  cel(g, st, { fill: o.stick || '#fff6ea', shade: tone(o.stick || '#fff6ea', -0.18), shadeDx: stickW * 0.5, shadeDy: 0, lw, outline: oc });
  // disc
  const disc = circle(tx, cy, r);
  if (!o.noOutline) stroke(g, disc, lw * 2, oc);
  swirlFill(g, tx, cy, r, o.a || '#ff7eb6', o.b || '#ffffff', { arms: o.arms ?? 2, turns: o.turns ?? 1.2, rot: o.rot ?? 0 });
  innerShade(g, disc, rgba(o.shadeCol || '#7a2a5a', o.shadeA ?? 0.22), r * 0.18, r * 0.22);
  if (o.gloss !== false) {
    gloss(g, tx - r * 0.38, cy - r * 0.42, r * 0.34, r * 0.2, -0.7, o.glossA ?? 0.7);
    if (r > 10) glint(g, tx - r * 0.45, cy - r * 0.4, r * 0.12, -0.7, o.glintA ?? 0.85);
  }
  if (o.ribbon) {
    const ry = cy + r + 2;
    const rib = (c) => { c.moveTo(tx, ry); c.quadraticCurveTo(tx - r * 0.45, ry - r * 0.3, tx - r * 0.5, ry + r * 0.18); c.quadraticCurveTo(tx - r * 0.2, ry + r * 0.12, tx, ry); c.quadraticCurveTo(tx + r * 0.45, ry - r * 0.3, tx + r * 0.5, ry + r * 0.18); c.quadraticCurveTo(tx + r * 0.2, ry + r * 0.12, tx, ry); };
    cel(g, rib, { fill: o.ribbon, lw: lw * 0.8, outline: oc, shadeDx: 2, shadeDy: 2 });
  }
}

/** Five(ish)-petal candy flower. */
export function candyFlower(g, x, y, r, o = {}) {
  const n = o.n ?? 5, rot = o.rot ?? -Math.PI / 2;
  const lw = o.lw ?? 2, oc = o.outline || OUTLINE;
  const pet = (c) => {
    for (let i = 0; i < n; i++) {
      const a = rot + (i * TAU) / n;
      const px = x + Math.cos(a) * r * 0.6, py = y + Math.sin(a) * r * 0.6;
      c.moveTo(px + r * 0.5, py); c.arc(px, py, r * 0.5, 0, TAU);
    }
  };
  const petal = o.petal || '#ff9cc2';
  unionPart(g, pet, { fill: petal, shade: o.petalShade || tone(petal, -0.16), shadeDx: r * 0.18, shadeDy: r * 0.22, light: o.petalLight || null, lightDx: r * 0.12, lightDy: r * 0.12, lw: lw * 0.6, outline: oc, noOutline: o.noOutline });
  const cc = circle(x, y, r * 0.38);
  cel(g, cc, { fill: o.centre || '#ffd54a', shade: tone(o.centre || '#ffd54a', -0.2), shadeDx: r * 0.1, shadeDy: r * 0.12, lw, outline: oc, noOutline: o.noOutline });
  if (r > 7) { g.fillStyle = 'rgba(255,255,255,0.85)'; g.beginPath(); g.arc(x - r * 0.13, y - r * 0.13, r * 0.11, 0, TAU); g.fill(); }
}

/** Glossy round candy (gumdrop/berry) */
export function candyBall(g, x, y, r, col, o = {}) {
  cel(g, circle(x, y, r), { fill: col, shade: tone(col, -0.25), shadeDx: r * 0.3, shadeDy: r * 0.35, lw: o.lw ?? 2, outline: o.outline || OUTLINE, noOutline: o.noOutline });
  if (r > 3) { g.fillStyle = 'rgba(255,255,255,0.8)'; g.beginPath(); g.ellipse(x - r * 0.35, y - r * 0.38, r * 0.28, r * 0.17, -0.6, 0, TAU); g.fill(); }
}

/** Puffy cloud union (no outline by default), cel shaded. */
export function puffCloud(g, cx, cy, w, h, R, o = {}) {
  const bumps = o.bumps ?? Math.max(3, Math.round(w / (h * 0.75)));
  const list = cloudCircles(cx, cy, w, h, bumps, R);
  // extra small bumps along the base to flatten it
  const n2 = Math.max(2, Math.round(w / (h * 0.6)));
  for (let i = 0; i < n2; i++) {
    const t = (i + 0.5) / n2;
    list.push([cx - w * 0.48 + w * 0.96 * t, cy + h * 0.18, h * (0.26 + R() * 0.08)]);
  }
  const shape = circles(list);
  const top = o.top || '#ffffff', bot = o.bottom || '#dbeefa';
  const y0 = cy - h * 0.8, y1 = cy + h * 0.45;
  if (o.lw) stroke(g, shape, o.lw * 2, o.outline || OUTLINE);
  fill(g, shape, linearGrad(g, 0, y0, 0, y1, [[0, top], [0.55, mix(top, bot, 0.35)], [1, bot]]));
  shadeU(g, shape, o.shade || rgba(tone(bot, -0.12), 0.85), o.shadeDx ?? h * 0.1, o.shadeDy ?? h * 0.16, o.shadeAlpha ?? 1);
  if (o.rim !== false) lightU(g, shape, o.rim || 'rgba(255,255,255,0.9)', o.rimDx ?? h * 0.05, o.rimDy ?? h * 0.08, o.rimAlpha ?? 1);
  return list;
}

// ---------------------------------------------------------------------------
// Lip / edge generators (periodic)
// ---------------------------------------------------------------------------
/**
 * Build a periodic list of "scallop" segments covering [0, period): returns
 * [{x0,x1,depth,drip}] with widths summing exactly to period.
 */
export function scallops(R, period, n, depthLo, depthHi, dripChance = 0, dripLo = 0, dripHi = 0) {
  const ws = []; let sum = 0;
  for (let i = 0; i < n; i++) { const w = 0.7 + R() * 0.6; ws.push(w); sum += w; }
  const out = []; let x = 0;
  for (let i = 0; i < n; i++) {
    const w = (ws[i] / sum) * period;
    const d = depthLo + R() * (depthHi - depthLo);
    const drip = R() < dripChance ? dripLo + R() * (dripHi - dripLo) : 0;
    out.push({ x0: x, x1: x + w, depth: d, drip, dw: 0.28 + R() * 0.12 });
    x += w;
  }
  return out;
}
/**
 * Add the scalloped (drippy) lower edge to the current path, going from right
 * to left (so it can close a shape whose top edge went left->right).
 * yBase = attachment line; segments repeat with `period` to cover [xa, xb].
 */
export function scallopEdgeRL(c, segs, period, xa, xb, yBase) {
  const k0 = Math.floor(xa / period) - 1, k1 = Math.floor(xb / period) + 1;
  const all = [];
  for (let k = k0; k <= k1; k++) for (const s of segs) all.push({ ...s, x0: s.x0 + k * period, x1: s.x1 + k * period });
  all.sort((a, b) => b.x0 - a.x0);
  let first = true;
  for (const s of all) {
    if (s.x0 > xb || s.x1 < xa) continue;
    const w = s.x1 - s.x0, m = (s.x0 + s.x1) / 2;
    if (first) { c.lineTo(s.x1, yBase); first = false; }
    if (s.drip > 0) {
      // scallop with a drip hanging from its middle
      const dw = w * s.dw;
      c.quadraticCurveTo(s.x1 - w * 0.08, yBase + s.depth * 1.1, m + dw, yBase + s.depth * 0.9);
      c.bezierCurveTo(m + dw * 0.55, yBase + s.depth + s.drip * 0.55, m + dw * 0.95, yBase + s.depth + s.drip, m, yBase + s.depth + s.drip);
      c.bezierCurveTo(m - dw * 0.95, yBase + s.depth + s.drip, m - dw * 0.55, yBase + s.depth + s.drip * 0.55, m - dw, yBase + s.depth * 0.9);
      c.quadraticCurveTo(s.x0 + w * 0.08, yBase + s.depth * 1.1, s.x0, yBase);
    } else {
      c.bezierCurveTo(s.x1 - w * 0.05, yBase + s.depth * 1.25, s.x0 + w * 0.05, yBase + s.depth * 1.25, s.x0, yBase);
    }
  }
}

/** Grass-tuft feature list, periodic. */
export function tufts(R, period, count, hLo, hHi, wLo = 10, wHi = 18) {
  const out = [];
  for (let i = 0; i < count; i++) {
    const x = ((i + 0.15 + R() * 0.7) / count) * period;
    out.push({ x, h: hLo + R() * (hHi - hLo), w: wLo + R() * (wHi - wLo), blades: R() < 0.5 ? 2 : 3, lean: (R() - 0.4) * 0.5 });
  }
  return out;
}
/**
 * Top edge left->right at height y over [xa, xb] with periodic tufts
 * (pointy blades rising above y). Starts with lineTo (caller does moveTo).
 */
export function tuftEdgeLR(c, feats, period, xa, xb, y) {
  const k0 = Math.floor(xa / period) - 1, k1 = Math.floor(xb / period) + 1;
  const all = [];
  for (let k = k0; k <= k1; k++) for (const f of feats) all.push({ ...f, x: f.x + k * period });
  all.sort((a, b) => a.x - b.x);
  c.lineTo(xa, y);
  for (const f of all) {
    const l = f.x - f.w / 2, r = f.x + f.w / 2;
    if (r < xa || l > xb) continue;
    c.lineTo(l, y);
    const n = f.blades;
    for (let i = 0; i < n; i++) {
      const t0 = i / n, t1 = (i + 1) / n;
      const bh = f.h * (i === Math.floor(n / 2) ? 1 : 0.68 + 0.12 * i);
      const px = l + f.w * ((t0 + t1) / 2) + f.lean * bh;
      c.quadraticCurveTo(l + f.w * t0 + f.w * 0.12, y - bh * 0.45, px, y - bh);
      c.quadraticCurveTo(l + f.w * t1 - f.w * 0.18, y - bh * 0.35, l + f.w * t1, y - (i < n - 1 ? 2 : 0));
    }
  }
  c.lineTo(xb, y);
}

// ---------------------------------------------------------------------------
// Danger helpers (obstacles)
// ---------------------------------------------------------------------------
/** A single sharp spike (cone) from base centre (bx,by) at angle `ang` (radians, 0 = right, -PI/2 = up). */
export function spikeShape(bx, by, ang, len, w, curve = 0) {
  const ca = Math.cos(ang), sa = Math.sin(ang);
  const nx = -sa, ny = ca;
  const tx = bx + ca * len, ty = by + sa * len;
  const lx = bx + nx * w / 2, ly = by + ny * w / 2;
  const rx = bx - nx * w / 2, ry = by - ny * w / 2;
  const mx = bx + ca * len * 0.55 + nx * curve, my = by + sa * len * 0.55 + ny * curve;
  return (c) => {
    c.moveTo(lx, ly);
    c.quadraticCurveTo((lx + tx) / 2 + (mx - (bx + ca * len * 0.55)) + nx * w * 0.08, (ly + ty) / 2 + (my - (by + sa * len * 0.55)) + ny * w * 0.08, tx, ty);
    c.quadraticCurveTo((rx + tx) / 2 + (mx - (bx + ca * len * 0.55)) - nx * w * 0.08, (ry + ty) / 2 + (my - (by + sa * len * 0.55)) - ny * w * 0.08, rx, ry);
    c.closePath();
  };
}
/** Paint a cel-shaded spike: light half / dark half split along its axis + glint. */
export function paintSpike(g, bx, by, ang, len, w, o = {}) {
  const sh = spikeShape(bx, by, ang, len, w, o.curve || 0);
  const base = o.fill || '#e9eef6';
  const lw = o.lw ?? 5, oc = o.outline || OUTLINE;
  if (o.under !== false) stroke(g, sh, lw, oc);
  fill(g, sh, base);
  // dark half (the side facing away from the top-left light)
  const ca = Math.cos(ang), sa = Math.sin(ang);
  const nx = -sa, ny = ca;
  // which normal faces the light (-1,-1)?
  const s = (nx * -1 + ny * -1) > 0 ? -1 : 1; // dark side normal sign
  clipTo(g, sh, () => {
    g.beginPath();
    g.moveTo(bx - ca * 4, by - sa * 4);
    g.lineTo(bx + ca * (len + 6), by + sa * (len + 6));
    g.lineTo(bx + ca * (len + 6) + s * nx * w, by + sa * (len + 6) + s * ny * w);
    g.lineTo(bx - ca * 4 + s * nx * w, by - sa * 4 + s * ny * w);
    g.closePath();
    g.fillStyle = o.dark || tone(base, -0.3); g.fill();
    if (o.tip) { // coloured tip
      g.beginPath(); g.arc(bx + ca * len, by + sa * len, len * (o.tipLen ?? 0.32), 0, TAU); g.fillStyle = o.tip; g.globalAlpha = 0.95; g.fill(); g.globalAlpha = 1;
    }
    // light edge line on the lit side
    g.strokeStyle = o.edge || 'rgba(255,255,255,0.75)'; g.lineWidth = Math.max(1.5, w * 0.1); g.lineCap = 'round';
    g.beginPath();
    g.moveTo(bx - s * nx * w * 0.28 + ca * len * 0.12, by - s * ny * w * 0.28 + sa * len * 0.12);
    g.lineTo(bx + ca * len * 0.8 - s * nx * w * 0.06, by + sa * len * 0.8 - s * ny * w * 0.06);
    g.stroke();
  });
  stroke(g, sh, lw, oc);
}

// ---------------------------------------------------------------------------
// Misc
// ---------------------------------------------------------------------------
/** Multiply alpha by a horizontal ramp (fromAlpha at x0 -> toAlpha at x1, clamped
 *  outside). destination-in is unbounded, so the ramp covers the whole canvas. */
export function fadeX(g, x0, x1, h, fromAlpha = 1, toAlpha = 0) {
  g.save();
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.globalCompositeOperation = 'destination-in';
  const gr = g.createLinearGradient(x0, 0, x1, 0);
  gr.addColorStop(0, `rgba(0,0,0,${fromAlpha})`);
  gr.addColorStop(1, `rgba(0,0,0,${toAlpha})`);
  g.fillStyle = gr;
  g.fillRect(0, 0, g.canvas.width, g.canvas.height);
  g.restore();
}
/** Same idea vertically. */
export function fadeY(g, y0, y1, fromAlpha = 1, toAlpha = 0) {
  g.save();
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.globalCompositeOperation = 'destination-in';
  const gr = g.createLinearGradient(0, y0, 0, y1);
  gr.addColorStop(0, `rgba(0,0,0,${fromAlpha})`);
  gr.addColorStop(1, `rgba(0,0,0,${toAlpha})`);
  g.fillStyle = gr;
  g.fillRect(0, 0, g.canvas.width, g.canvas.height);
  g.restore();
}

// ---------------------------------------------------------------------------
// Union-safe crescents. lib's innerShade/innerLight use an evenodd trick that
// breaks on shapes built from overlapping sub-paths (circle unions); these use
// an offscreen mask instead (nonzero fills only).
// ---------------------------------------------------------------------------
let _tmp = null;
function tmpCtx(w, h) {
  if (!_tmp) _tmp = document.createElement('canvas');
  if (_tmp.width < w || _tmp.height < h) { _tmp.width = Math.max(_tmp.width, w); _tmp.height = Math.max(_tmp.height, h); }
  const t = _tmp.getContext('2d');
  t.setTransform(1, 0, 0, 1, 0, 0);
  t.globalCompositeOperation = 'source-over';
  t.globalAlpha = 1;
  t.clearRect(0, 0, _tmp.width, _tmp.height);
  return t;
}
function crescentU(g, shape, color, dx, dy, alpha) {
  const cw = g.canvas.width, ch = g.canvas.height;
  const t = tmpCtx(cw, ch);
  t.setTransform(g.getTransform());
  t.beginPath(); shape(t); t.fillStyle = color; t.fill();
  t.globalCompositeOperation = 'destination-out';
  t.translate(dx, dy);
  t.beginPath(); shape(t); t.fillStyle = '#000'; t.fill();
  g.save();
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.globalAlpha *= alpha;
  g.drawImage(t.canvas, 0, 0, cw, ch, 0, 0, cw, ch);
  g.restore();
}
/** Shade crescent (bottom-right for positive dx,dy) — union safe. */
export function shadeU(g, shape, color, dx = 10, dy = 12, alpha = 1) { crescentU(g, shape, color, -dx, -dy, alpha); }
/** Light crescent (top-left for positive dx,dy) — union safe. */
export function lightU(g, shape, color, dx = 8, dy = 8, alpha = 1) { crescentU(g, shape, color, dx, dy, alpha); }
/** Irregular chunk polygon points (chocolate chunk, rock) */
export function chunkPts(R, cx, cy, r, n = 6, jit = 0.28, rot = null) {
  const a0 = rot ?? R() * TAU;
  const pts = [];
  for (let i = 0; i < n; i++) {
    const a = a0 + (i / n) * TAU + (R() - 0.5) * 0.5;
    const rr = r * (1 - jit / 2 + R() * jit);
    pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr * 0.82]);
  }
  return pts;
}
/** Rounded polygon through points (corners rounded by radius rad). */
export const roundPoly = (pts, rad) => (c) => {
  const n = pts.length;
  const m = (p, q) => [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2];
  const s = m(pts[n - 1], pts[0]);
  c.moveTo(s[0], s[1]);
  for (let i = 0; i < n; i++) {
    const p = pts[i], q = pts[(i + 1) % n];
    const mm = m(p, q);
    c.arcTo(p[0], p[1], mm[0], mm[1], rad);
  }
  c.closePath();
};
