// =============================================================================
//  Generic builders for ground strips, cliff caps and floating platforms.
//  A land supplies painters; geometry and tiling rules live here.
//
//  Ground strip: 1024×276 art px (scale 2), walking surface at y = 36.
//  Caps 96×276: anchor (ax, 36) is the surface corner where the walkable
//  ground ends. The strip should be drawn up to the anchor; the cap overlaps
//  the strip on its inner side (alpha-faded) and its face/lip hangs a little
//  over the pit.
//  Platforms: left 80 / mid 128 (tileable) / right 80, 88 tall, top at 12.
// =============================================================================
import {
  canvas, ctx2d, tiled, wrapAt, TM, clipTo, fill, stroke, OUTLINE, fadeX, scallopEdgeRL, TAU, rng,
} from './_env_kit.js';

export const GW = 1024, GH = 276, SURF = 36;
export const CAP_W = 96, CAP_AX = { right: 62, left: 34 };
export const PLAT_H = 88, PLAT_TOP = 12, PLAT_END = 80, PLAT_MID = 128;

// ---------------------------------------------------------------------------
// Top-edge features (only features fully inside [xa, xb] are drawn)
// ---------------------------------------------------------------------------
function expand(feats, period, xa, xb) {
  const k0 = Math.floor(xa / period) - 1, k1 = Math.floor(xb / period) + 1;
  const all = [];
  for (let k = k0; k <= k1; k++) for (const f of feats) all.push({ ...f, x: f.x + k * period });
  return all.sort((a, b) => a.x - b.x);
}
/** Draw the top edge from xa to xb at height y (caller already moved to (xa,y)). */
export function edgeTop(c, M, xa, xb, y = M.top) {
  c.lineTo(xa, y);
  if (!M.feats || M.topStyle === 'flat') { c.lineTo(xb, y); return; }
  for (const f of expand(M.feats, M.period, xa, xb)) {
    const l = f.x - f.w / 2, r = f.x + f.w / 2;
    if (l < xa + 3 || r > xb - 3) continue;
    c.lineTo(l, y);
    if (M.topStyle === 'tufts') {
      const n = f.blades;
      for (let i = 0; i < n; i++) {
        const t0 = i / n, t1 = (i + 1) / n;
        const bh = f.h * (i === Math.floor(n / 2) ? 1 : 0.62 + 0.1 * i);
        const px = l + f.w * ((t0 + t1) / 2) + f.lean * bh;
        c.quadraticCurveTo(l + f.w * t0 + f.w * 0.1, y - bh * 0.45, px, y - bh);
        c.quadraticCurveTo(l + f.w * t1 - f.w * 0.16, y - bh * 0.35, l + f.w * t1, y - (i < n - 1 ? 3 : 0));
      }
    } else if (M.topStyle === 'bumps') {
      c.bezierCurveTo(l + f.w * 0.05, y - f.h * 1.25, r - f.w * 0.05, y - f.h * 1.25, r, y);
    } else if (M.topStyle === 'nubs') { // little rounded crust bits
      c.quadraticCurveTo(l + f.w * 0.1, y - f.h, f.x, y - f.h);
      c.quadraticCurveTo(r - f.w * 0.1, y - f.h, r, y);
    }
  }
  c.lineTo(xb, y);
}

/** Scallop edge with segments clamped to [xa, xb] (right -> left). */
function scallopClamped(c, M, xa, xb, yBase) {
  const segs = [];
  const k0 = Math.floor(xa / M.period) - 1, k1 = Math.floor(xb / M.period) + 1;
  for (let k = k0; k <= k1; k++) for (const s of M.scal) {
    const x0 = Math.max(xa, s.x0 + k * M.period), x1 = Math.min(xb, s.x1 + k * M.period);
    if (x1 - x0 < 6) continue;
    const shrink = (x1 - x0) / (s.x1 - s.x0);
    segs.push({ ...s, x0, x1, drip: shrink < 0.8 ? 0 : s.drip });
  }
  scallopEdgeRL(c, segs, 1e9, xa, xb, yBase);
}

/**
 * Lip ("mat") outline path over [xa, xb]. ends.left / ends.right = x of a
 * surface corner where the mat wraps over a cliff edge.
 * M: { top, base, period, feats, topStyle, scal, rc, bulge, faceDrip }
 */
export function matPath(M, xa, xb, ends = {}) {
  return (c) => {
    const { top, base } = M;
    const rc = M.rc ?? 10, bulge = M.bulge ?? 4, fd = M.faceDrip ?? 30;
    const L = ends.left, Rr = ends.right;
    if (L != null) {
      const fx = L - bulge;
      c.moveTo(fx + 3, top + fd);
      c.bezierCurveTo(fx - 3, top + fd * 0.7, fx - 1, top + rc, fx, top + rc * 0.55);
      c.quadraticCurveTo(fx + 1, top, L + rc * 0.6, top);
      edgeTop(c, M, L + rc * 0.6, Rr != null ? Rr - rc * 0.6 : xb);
    } else {
      c.moveTo(xa, base);
      c.lineTo(xa, top);
      edgeTop(c, M, xa, Rr != null ? Rr - rc * 0.6 : xb);
    }
    const inner = M.faceInner ?? 16;
    if (Rr != null) {
      const fx = Rr + bulge;
      c.quadraticCurveTo(fx - 1, top, fx, top + rc * 0.55);
      c.bezierCurveTo(fx + 1, top + rc, fx + 3, top + fd * 0.7, fx - 3, top + fd);
      c.bezierCurveTo(fx - 8, top + fd + 7, Rr - inner, top + fd + 2, Rr - inner, base + 4);
      scallopClamped(c, M, L != null ? L + inner : xa, Rr - inner, base);
    } else {
      c.lineTo(xb, top);
      c.lineTo(xb, base);
      scallopClamped(c, M, L != null ? L + inner : xa, xb, base);
    }
    if (L != null) {
      const fx = L - bulge;
      c.bezierCurveTo(L + inner, top + fd + 2, fx + 8, top + fd + 7, fx + 3, top + fd);
    }
    c.closePath();
  };
}

// ---------------------------------------------------------------------------
// Ground strip
// ---------------------------------------------------------------------------
export function makeGround(L) {
  const body = L.bodyCanvas();
  return tiled(GW, GH, (g) => {
    g.save();
    g.beginPath(); g.rect(-TM - 20, SURF + (L.bodyTop ?? 4), GW + 2 * TM + 40, GH); g.clip();
    for (const dx of [-GW, 0, GW]) g.drawImage(body, dx, 0);
    g.restore();
    L.lip(g, -TM - 160, GW + TM + 160, {}, 'ground'); // wider than the canvas: margin features stay complete
  });
}

// ---------------------------------------------------------------------------
// Cliff caps
// ---------------------------------------------------------------------------
export function makeCap(L, side) {
  const W = CAP_W, H = GH;
  const ax = CAP_AX[side];
  const c = canvas(W, H), g = ctx2d(c);
  const body = L.bodyCanvas();
  const dir = side === 'right' ? 1 : -1;
  const out = (y) => (L.capOut ? L.capOut(y) : 0);
  const face = (y) => ax + dir * out(y);
  const rcB = L.capRc ?? 12;
  const y0 = SURF + 2;
  const facePath = (cc, withTop) => {
    const far = side === 'right' ? -40 : W + 40;
    if (withTop) { cc.moveTo(far, y0); cc.lineTo(face(y0) - dir * rcB, y0); } else cc.moveTo(face(y0) - dir * rcB, y0);
    cc.quadraticCurveTo(face(y0), y0, face(y0 + rcB), y0 + rcB);
    for (let y = y0 + rcB; y <= H + 10; y += 3) cc.lineTo(face(y), y);
    if (withTop) { cc.lineTo(far, H + 10); cc.closePath(); }
  };
  const shape = (cc) => facePath(cc, true);
  clipTo(g, shape, () => {
    g.drawImage(body, -(L.capTexX ?? 320), 0);
    if (L.capFace) L.capFace(g, side, face, ax, shape);
  });
  stroke(g, (cc) => facePath(cc, false), L.capLw ?? 5, OUTLINE);
  if (L.capExtra) L.capExtra(g, side, face, ax);
  if (side === 'right') L.lip(g, -40, ax, { right: ax }, 'cap');
  else L.lip(g, ax, W + 40, { left: ax }, 'cap');
  if (side === 'right') fadeX(g, 0, 26, H, 0, 1); else fadeX(g, W - 26, W, H, 1, 0);
  return c;
}
export function makeCaps(L) {
  return ['left', 'right'].map((side) => ({
    name: side, w: CAP_W, h: GH, ax: CAP_AX[side], ay: SURF,
    meta: { side, surface: SURF, edgeX: CAP_AX[side], overlap: side === 'right' ? CAP_AX.right : CAP_W - CAP_AX.left,
      note: 'anchor = surface corner; draw the ground strip up to the anchor, cap on top' },
    draw: (g) => g.drawImage(makeCap(L, side), 0, 0),
  }));
}

// ---------------------------------------------------------------------------
// Floating platforms (one-way)
// ---------------------------------------------------------------------------
/**
 * Piece windows in "pattern" coordinates px (period 128):
 *   left : px in [-80, 0)   mid : [0, 128)   right : [0, 80)  (after a mid)
 */
export function platGeometry(L, piece) {
  const w = piece === 'mid' ? PLAT_MID : PLAT_END;
  const off = piece === 'left' ? -PLAT_END : 0;
  const top = PLAT_TOP + 2;
  const yb = L.platBottom; // periodic bottom profile (period 128)
  const inset = L.platInset ?? 5; // body end distance from the outer edge
  const endH = L.platEndDepth ?? 46; // where the end curve meets the bottom
  const rc = L.platRc ?? 14;
  let shape;
  if (piece === 'mid') {
    shape = (c) => {
      c.moveTo(-24, top); c.lineTo(w + 24, top);
      for (let x = w + 24; x >= -24; x -= 2) c.lineTo(x, yb(x + off));
      c.closePath();
    };
  } else if (piece === 'left') {
    const xs = inset;
    shape = (c) => {
      c.moveTo(xs, top + rc);
      c.quadraticCurveTo(xs, top, xs + rc, top);
      c.lineTo(w + 24, top);
      for (let x = w + 24; x >= xs + 34; x -= 2) c.lineTo(x, yb(x + off));
      const xm = xs + 34;
      c.bezierCurveTo(xm - 14, yb(xm + off) + 2, xs + 2, endH + 8, xs, endH * 0.7);
      c.closePath();
    };
  } else {
    const xe = w - inset;
    shape = (c) => {
      c.moveTo(-24, top);
      c.lineTo(xe - rc, top);
      c.quadraticCurveTo(xe, top, xe, top + rc);
      c.lineTo(xe, endH * 0.7);
      const xm = xe - 34;
      c.bezierCurveTo(xe - 2, endH + 8, xm + 14, yb(xm + off) + 2, xm, yb(xm + off));
      for (let x = xm; x >= -24; x -= 2) c.lineTo(x, yb(x + off));
      c.closePath();
    };
  }
  return { w, off, shape, inset };
}
export function makePlat(L, piece) {
  const { w, off, shape, inset } = platGeometry(L, piece);
  const c = canvas(w, PLAT_H), g = ctx2d(c);
  L.platBody(g, shape, { piece, w, off, inset });
  const ends = piece === 'left' ? { left: inset + 1 } : piece === 'right' ? { right: w - inset - 1 } : {};
  const xa = piece === 'left' ? inset + 1 : -30, xb = piece === 'right' ? w - inset - 1 : w + 30;
  L.lip(g, xa, xb, ends, 'plat', off);
  return c;
}
export function makePlats(L) {
  return ['left', 'mid', 'right'].map((p) => ({
    name: p, w: p === 'mid' ? PLAT_MID : PLAT_END, h: PLAT_H, ax: 0, ay: PLAT_TOP,
    meta: { surface: PLAT_TOP, tile: p === 'mid' },
    draw: (g) => g.drawImage(makePlat(L, p), 0, 0),
  }));
}

/** Periodic helper for platform patterns: call fn(x) for copies of px covering local [x0,x1]. */
export function platRepeat(px, off, x0, x1, fn, period = PLAT_MID) {
  for (let k = -2; k <= 2; k++) {
    const lx = px + k * period - off;
    if (lx > x0 - 40 && lx < x1 + 40) fn(lx);
  }
}
