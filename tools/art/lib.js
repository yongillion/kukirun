// =============================================================================
//  Dessert Dash — Art Forge shared drawing library
//  All game art is drawn procedurally with Canvas2D and exported to PNG by
//  tools/art/export.mjs (headless Chromium). Art is authored at S = 2 pixels
//  per logical game unit unless a module says otherwise.
//
//  Conventions
//   * A "shape" is a function (ctx) => void that ADDS sub-paths to the current
//     path (it must NOT call beginPath/fill/stroke itself). Helpers below
//     build shapes: circle(), ellipse(), rrect(), poly(), smooth(), blob() ...
//   * Light comes from the TOP-LEFT. Shade crescents sit bottom-right,
//     highlights/gloss sit top-left.
//   * Outlines use the warm cocoa OUTLINE colour, round joins/caps.
// =============================================================================

export const S = 2;                    // art pixels per logical unit
export const OUTLINE = '#4a2a1a';      // main outline (dark cocoa)
export const OUTLINE_SOFT = '#7a4b33'; // softer outline for inner lines / far art
export const INK = '#2b1a12';          // eyes / darkest details
export const WHITE = '#ffffff';
export const BLUSH = 'rgba(255,110,140,0.45)';

// Line widths in art pixels (at S = 2)
export const LW = { char: 6, item: 5, prop: 5, mid: 3.5, inner: 3.5, fine: 2.5 };

// ---------------------------------------------------------------------------
// Random
// ---------------------------------------------------------------------------
export function rng(seed = 1) {
  let a = seed >>> 0;
  const f = () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  f.range = (lo, hi) => lo + (hi - lo) * f();
  f.int = (lo, hi) => Math.floor(lo + (hi - lo + 1) * f());
  f.pick = (arr) => arr[Math.floor(f() * arr.length)];
  f.sign = () => (f() < 0.5 ? -1 : 1);
  return f;
}

// ---------------------------------------------------------------------------
// Canvas
// ---------------------------------------------------------------------------
export function canvas(w, h) {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.ceil(w));
  c.height = Math.max(1, Math.ceil(h));
  return c;
}
export function ctx2d(c) {
  const g = c.getContext('2d');
  g.imageSmoothingEnabled = true;
  g.imageSmoothingQuality = 'high';
  return g;
}

// ---------------------------------------------------------------------------
// Colour helpers
// ---------------------------------------------------------------------------
export function hexToRgb(hex) {
  let h = hex.replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const n = parseInt(h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
export function rgbToHex(r, g, b) {
  const c = (v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0');
  return '#' + c(r) + c(g) + c(b);
}
export function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0; const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      default: h = (r - g) / d + 4;
    }
    h /= 6;
  }
  return [h * 360, s, l];
}
export function hslToHex(h, s, l) {
  h = ((h % 360) + 360) % 360 / 360;
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const f = (t) => {
    if (t < 0) t += 1; if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  if (s === 0) return rgbToHex(l * 255, l * 255, l * 255);
  return rgbToHex(f(h + 1 / 3) * 255, f(h) * 255, f(h - 1 / 3) * 255);
}
/** Darken (amt < 0) or lighten (amt > 0) a hex colour in HSL lightness, with a
 *  slight hue shift (shadows drift warm/purple, lights drift yellow) for a
 *  painterly look. amt in [-1, 1]. */
export function tone(hex, amt, hueShift = true) {
  const [r, g, b] = hexToRgb(hex);
  let [h, s, l] = rgbToHsl(r, g, b);
  if (amt < 0) {
    l = l * (1 + amt);
    s = Math.min(1, s * (1 - amt * 0.25));
    if (hueShift) h = h + (h > 60 && h < 240 ? 8 : -8) * -amt;
  } else {
    l = l + (1 - l) * amt;
    if (hueShift) h = h + (h > 60 && h < 240 ? -6 : 6) * amt;
  }
  return hslToHex(h, s, l);
}
export function mix(a, b, t) {
  const A = hexToRgb(a), B = hexToRgb(b);
  return rgbToHex(A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t);
}
export function rgba(hex, a) {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r},${g},${b},${a})`;
}

// ---------------------------------------------------------------------------
// Shapes (functions that add sub-paths)
// ---------------------------------------------------------------------------
export const circle = (cx, cy, r) => (c) => { c.moveTo(cx + r, cy); c.arc(cx, cy, r, 0, Math.PI * 2); };
export const ellipse = (cx, cy, rx, ry, rot = 0) => (c) => {
  c.moveTo(cx + rx * Math.cos(rot), cy + rx * Math.sin(rot));
  c.ellipse(cx, cy, rx, ry, rot, 0, Math.PI * 2);
};
export const rrect = (x, y, w, h, r) => (c) => {
  const rr = Math.min(Math.abs(r), Math.abs(w) / 2, Math.abs(h) / 2);
  c.moveTo(x + rr, y);
  c.lineTo(x + w - rr, y); c.arcTo(x + w, y, x + w, y + rr, rr);
  c.lineTo(x + w, y + h - rr); c.arcTo(x + w, y + h, x + w - rr, y + h, rr);
  c.lineTo(x + rr, y + h); c.arcTo(x, y + h, x, y + h - rr, rr);
  c.lineTo(x, y + rr); c.arcTo(x, y, x + rr, y, rr);
  c.closePath();
};
export const poly = (pts, closed = true) => (c) => {
  c.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) c.lineTo(pts[i][0], pts[i][1]);
  if (closed) c.closePath();
};
/** Smooth closed (or open) curve through points (Catmull-Rom -> Bezier). */
export const smooth = (pts, closed = true, tension = 0.5) => (c) => {
  const n = pts.length;
  if (n < 3) return poly(pts, closed)(c);
  const P = (i) => closed ? pts[(i + n) % n] : pts[Math.max(0, Math.min(n - 1, i))];
  c.moveTo(P(0)[0], P(0)[1]);
  const last = closed ? n : n - 1;
  for (let i = 0; i < last; i++) {
    const p0 = P(i - 1), p1 = P(i), p2 = P(i + 1), p3 = P(i + 2);
    const t = tension / 3 * 2;
    const c1x = p1[0] + (p2[0] - p0[0]) * t / 2, c1y = p1[1] + (p2[1] - p0[1]) * t / 2;
    const c2x = p2[0] - (p3[0] - p1[0]) * t / 2, c2y = p2[1] - (p3[1] - p1[1]) * t / 2;
    c.bezierCurveTo(c1x, c1y, c2x, c2y, p2[0], p2[1]);
  }
  if (closed) c.closePath();
};
/** Organic blob: circle-ish outline with jitter (cookies, rocks, bushes). */
export function blobPoints(cx, cy, rx, ry, n = 14, jitter = 0.08, rand = Math.random, rot = 0) {
  const pts = [];
  for (let i = 0; i < n; i++) {
    const a = rot + (i / n) * Math.PI * 2;
    const j = 1 + (rand() * 2 - 1) * jitter;
    pts.push([cx + Math.cos(a) * rx * j, cy + Math.sin(a) * ry * j]);
  }
  return pts;
}
export const blob = (cx, cy, rx, ry, n, jitter, rand, rot) => smooth(blobPoints(cx, cy, rx, ry, n, jitter, rand, rot), true);
/** Star with optional rounded tips (roundness 0..1). */
export const star = (cx, cy, ro, ri, n = 5, rot = -Math.PI / 2, roundness = 0.0) => (c) => {
  const pts = [];
  for (let i = 0; i < n * 2; i++) {
    const r = i % 2 === 0 ? ro : ri;
    const a = rot + (i / (n * 2)) * Math.PI * 2;
    pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
  }
  if (roundness <= 0) return poly(pts)(c);
  // rounded corners via arcTo
  const m = (p, q) => [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2];
  const N = pts.length;
  const start = m(pts[N - 1], pts[0]);
  c.moveTo(start[0], start[1]);
  for (let i = 0; i < N; i++) {
    const p = pts[i], q = pts[(i + 1) % N];
    const mid = m(p, q);
    const rad = (i % 2 === 0 ? ro : ri) * 0.18 * roundness + 0.0001;
    c.arcTo(p[0], p[1], mid[0], mid[1], rad);
  }
  c.closePath();
};
export const heart = (cx, cy, s) => (c) => {
  c.moveTo(cx, cy + s * 0.9);
  c.bezierCurveTo(cx - s * 1.25, cy + s * 0.05, cx - s * 0.95, cy - s * 0.95, cx, cy - s * 0.38);
  c.bezierCurveTo(cx + s * 0.95, cy - s * 0.95, cx + s * 1.25, cy + s * 0.05, cx, cy + s * 0.9);
  c.closePath();
};
/** Tear-drop pointing up (tip at top). */
export const drop = (cx, cy, r) => (c) => {
  c.moveTo(cx, cy - r * 1.7);
  c.bezierCurveTo(cx + r * 0.55, cy - r * 1.0, cx + r, cy - r * 0.45, cx + r, cy);
  c.arc(cx, cy, r, 0, Math.PI, false);
  c.bezierCurveTo(cx - r, cy - r * 0.45, cx - r * 0.55, cy - r * 1.0, cx, cy - r * 1.7);
  c.closePath();
};
/** Puffy cloud made of overlapping circles along an ellipse base. */
export function cloudCircles(cx, cy, w, h, bumps = 6, rand = Math.random) {
  const out = [];
  for (let i = 0; i < bumps; i++) {
    const t = bumps === 1 ? 0.5 : i / (bumps - 1);
    const x = cx - w / 2 + w * t;
    const arch = Math.sin(t * Math.PI);
    const r = h * (0.35 + 0.35 * arch) * (0.85 + rand() * 0.3);
    out.push([x, cy - arch * h * 0.25, r]);
  }
  out.push([cx, cy + h * 0.1, h * 0.45]);
  return out;
}
export const cloud = (circles) => (c) => { for (const [x, y, r] of circles) { c.moveTo(x + r, y); c.arc(x, y, r, 0, Math.PI * 2); } };
/** Combine several shapes into one (for fill; overlapping areas fill once with nonzero rule). */
export const union = (...shapes) => (c) => { for (const s of shapes) s(c); };
/** Triangle spike row along a baseline, tips pointing in direction dir (-1 up, +1 down). */
export const spikes = (x0, x1, y, h, n, dir = -1, inset = 0) => (c) => {
  const w = (x1 - x0) / n;
  c.moveTo(x0, y);
  for (let i = 0; i < n; i++) {
    c.lineTo(x0 + w * (i + 0.5), y + dir * h);
    c.lineTo(x0 + w * (i + 1) - (i === n - 1 ? 0 : inset), y);
  }
  c.closePath();
};

// ---------------------------------------------------------------------------
// Painting primitives
// ---------------------------------------------------------------------------
export function fill(c, shape, style, rule = 'nonzero') {
  c.beginPath(); shape(c); c.fillStyle = style; c.fill(rule);
}
export function stroke(c, shape, lw = LW.char, color = OUTLINE) {
  c.beginPath(); shape(c);
  c.lineWidth = lw; c.strokeStyle = color; c.lineJoin = 'round'; c.lineCap = 'round';
  c.stroke();
}
export function clipTo(c, shape, fn) {
  c.save(); c.beginPath(); shape(c); c.clip(); fn(); c.restore();
}
/** Crescent of `color` inside `shape` on the side AWAY from the light.
 *  (dx, dy) is how far the shadow eats in (positive = bottom-right). */
export function innerShade(c, shape, color, dx = 10, dy = 12, alpha = 1) {
  c.save();
  c.beginPath(); shape(c); c.clip();
  c.globalAlpha *= alpha;
  c.beginPath(); c.rect(-1e5, -1e5, 2e5, 2e5);
  c.translate(-dx, -dy); shape(c);
  c.fillStyle = color; c.fill('evenodd');
  c.restore();
}
/** Crescent of light inside `shape` toward the light (top-left). */
export function innerLight(c, shape, color, dx = 8, dy = 8, alpha = 1) {
  c.save();
  c.beginPath(); shape(c); c.clip();
  c.globalAlpha *= alpha;
  c.beginPath(); c.rect(-1e5, -1e5, 2e5, 2e5);
  c.translate(dx, dy); shape(c);
  c.fillStyle = color; c.fill('evenodd');
  c.restore();
}
/** Soft white glossy highlight ellipse. */
export function gloss(c, x, y, rx, ry, rot = -0.6, alpha = 0.75) {
  c.save();
  c.translate(x, y); c.rotate(rot);
  const g = c.createRadialGradient(0, 0, 0, 0, 0, Math.max(rx, ry));
  g.addColorStop(0, `rgba(255,255,255,${alpha})`);
  g.addColorStop(0.55, `rgba(255,255,255,${alpha * 0.85})`);
  g.addColorStop(1, 'rgba(255,255,255,0)');
  c.scale(rx / Math.max(rx, ry), ry / Math.max(rx, ry));
  c.beginPath(); c.arc(0, 0, Math.max(rx, ry), 0, Math.PI * 2);
  c.fillStyle = g; c.fill();
  c.restore();
}
/** Crisp cartoon glint (solid white ellipse + small dot). */
export function glint(c, x, y, s = 10, rot = -0.6, alpha = 0.95) {
  c.save();
  c.globalAlpha *= alpha;
  c.fillStyle = '#fff';
  c.beginPath(); c.ellipse(x, y, s, s * 0.55, rot, 0, Math.PI * 2); c.fill();
  c.beginPath(); c.arc(x + s * 1.25, y + s * 0.9, s * 0.32, 0, Math.PI * 2); c.fill();
  c.restore();
}
export function linearGrad(c, x0, y0, x1, y1, stops) {
  const g = c.createLinearGradient(x0, y0, x1, y1);
  for (const [t, col] of stops) g.addColorStop(t, col);
  return g;
}
export function radialGrad(c, x, y, r0, r1, stops, fx = x, fy = y) {
  const g = c.createRadialGradient(fx, fy, r0, x, y, r1);
  for (const [t, col] of stops) g.addColorStop(t, col);
  return g;
}

/**
 * The standard cel-shaded "part" pipeline used for all characters/items/props:
 *  base fill -> inner shade crescent -> inner light crescent -> outline.
 * opts: { fill, shade, shadeDx, shadeDy, light, lightDx, lightDy, lw, outline,
 *         grad: [x0,y0,x1,y1, stops] (overrides fill with linear gradient),
 *         noOutline }
 */
export function part(c, shape, o = {}) {
  const base = o.fill || '#f5c26b';
  let style = base;
  if (o.grad) { const [x0, y0, x1, y1, stops] = o.grad; style = linearGrad(c, x0, y0, x1, y1, stops); }
  fill(c, shape, style, o.rule || 'nonzero');
  if (o.shade !== false) innerShade(c, shape, o.shade || tone(base, -0.22), o.shadeDx ?? 10, o.shadeDy ?? 12, o.shadeAlpha ?? 1);
  if (o.light) innerLight(c, shape, o.light, o.lightDx ?? 7, o.lightDy ?? 7, o.lightAlpha ?? 1);
  if (!o.noOutline) stroke(c, shape, o.lw ?? LW.char, o.outline || OUTLINE);
}

/** Soft elliptical ground shadow. */
export function groundShadow(c, x, y, rx, ry, alpha = 0.28) {
  c.save();
  const g = c.createRadialGradient(x, y, 0, x, y, rx);
  g.addColorStop(0, `rgba(40,20,10,${alpha})`);
  g.addColorStop(1, 'rgba(40,20,10,0)');
  c.translate(x, y); c.scale(1, ry / rx); c.translate(-x, -y);
  c.fillStyle = g; c.beginPath(); c.arc(x, y, rx, 0, Math.PI * 2); c.fill();
  c.restore();
}
/** Soft glow (additive-looking radial) — use for items, magic, crystals. */
export function glow(c, x, y, r, color = '#fff6b0', alpha = 0.8) {
  c.save();
  const [R, G, B] = hexToRgb(color);
  const g = c.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, `rgba(${R},${G},${B},${alpha})`);
  g.addColorStop(0.4, `rgba(${R},${G},${B},${alpha * 0.45})`);
  g.addColorStop(1, `rgba(${R},${G},${B},0)`);
  c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill();
  c.restore();
}
/** Four-point twinkle sparkle. */
export function sparkle(c, x, y, r, color = '#fff', alpha = 1, rot = 0) {
  c.save(); c.translate(x, y); c.rotate(rot); c.globalAlpha *= alpha;
  c.fillStyle = color;
  c.beginPath();
  c.moveTo(0, -r);
  c.quadraticCurveTo(r * 0.12, -r * 0.12, r, 0);
  c.quadraticCurveTo(r * 0.12, r * 0.12, 0, r);
  c.quadraticCurveTo(-r * 0.12, r * 0.12, -r, 0);
  c.quadraticCurveTo(-r * 0.12, -r * 0.12, 0, -r);
  c.fill();
  c.restore();
}

/**
 * Sticker-style outer outline around everything already drawn on `src`.
 * Returns a NEW canvas (same size) = dilated silhouette in `color` under the art.
 * Leave >= width px of transparent margin around the art.
 */
export function outerOutline(src, width = 4, color = OUTLINE, steps = 24) {
  const out = canvas(src.width, src.height);
  const o = ctx2d(out);
  const sil = canvas(src.width, src.height);
  const s = ctx2d(sil);
  s.drawImage(src, 0, 0);
  s.globalCompositeOperation = 'source-in';
  s.fillStyle = color; s.fillRect(0, 0, sil.width, sil.height);
  for (let i = 0; i < steps; i++) {
    const a = (i / steps) * Math.PI * 2;
    o.drawImage(sil, Math.cos(a) * width, Math.sin(a) * width);
  }
  o.drawImage(sil, 0, 0);
  o.drawImage(src, 0, 0);
  return out;
}
/** Flat-colour silhouette copy of a canvas (for hit-flash frames etc). */
export function silhouette(src, color = '#ffffff') {
  const out = canvas(src.width, src.height);
  const o = ctx2d(out);
  o.drawImage(src, 0, 0);
  o.globalCompositeOperation = 'source-in';
  o.fillStyle = color; o.fillRect(0, 0, out.width, out.height);
  return out;
}

// ---------------------------------------------------------------------------
// Faces — shared so every character & pet has the same "family" look
// ---------------------------------------------------------------------------
/**
 * Draw one eye. kind: 'open' | 'happy' | 'closed' | 'x' | 'swirl' | 'wince'
 *   | 'determined' | 'star' | 'wide' | 'sad'
 * s = eye height scale (1 ~ 24px tall eye at S=2), side = -1 left eye, +1 right eye
 * look = [dx, dy] pupil offset in px.
 */
export function eye(c, x, y, s = 1, kind = 'open', side = 1, look = [0, 0]) {
  const h = 24 * s, w = 15 * s;
  c.save();
  c.lineCap = 'round'; c.lineJoin = 'round';
  switch (kind) {
    case 'happy': { // ^ shape
      c.lineWidth = 5 * s; c.strokeStyle = INK;
      c.beginPath(); c.moveTo(x - w * 0.8, y + h * 0.15);
      c.quadraticCurveTo(x, y - h * 0.55, x + w * 0.8, y + h * 0.15); c.stroke();
      break;
    }
    case 'closed': {
      c.lineWidth = 5 * s; c.strokeStyle = INK;
      c.beginPath(); c.moveTo(x - w * 0.8, y); c.quadraticCurveTo(x, y + h * 0.25, x + w * 0.8, y); c.stroke();
      break;
    }
    case 'x': {
      c.lineWidth = 5 * s; c.strokeStyle = INK;
      const r = w * 0.75;
      c.beginPath(); c.moveTo(x - r, y - r); c.lineTo(x + r, y + r); c.moveTo(x + r, y - r); c.lineTo(x - r, y + r); c.stroke();
      break;
    }
    case 'swirl': {
      c.lineWidth = 3.5 * s; c.strokeStyle = INK;
      c.beginPath();
      for (let t = 0; t < Math.PI * 5; t += 0.2) {
        const r = (t / (Math.PI * 5)) * w * 0.95;
        const px = x + Math.cos(t * side) * r, py = y + Math.sin(t * side) * r;
        if (t === 0) c.moveTo(px, py); else c.lineTo(px, py);
      }
      c.stroke();
      break;
    }
    case 'wince': { // > <
      c.lineWidth = 5 * s; c.strokeStyle = INK;
      const r = w * 0.8;
      c.beginPath();
      c.moveTo(x - r * side, y - r * 0.7); c.lineTo(x + r * 0.6 * side, y); c.lineTo(x - r * side, y + r * 0.7);
      c.stroke();
      break;
    }
    case 'star': {
      fill(c, star(x, y, w * 1.05, w * 0.45, 5, -Math.PI / 2, 0.6), INK);
      c.fillStyle = '#fff'; c.beginPath(); c.arc(x - w * 0.2, y - w * 0.2, w * 0.22, 0, Math.PI * 2); c.fill();
      break;
    }
    case 'sad': {
      fill(c, ellipse(x + look[0], y + look[1] + h * 0.05, w * 0.95, h * 0.45), INK);
      c.fillStyle = '#fff';
      c.beginPath(); c.arc(x + look[0] - w * 0.3, y + look[1] - h * 0.05, w * 0.28, 0, Math.PI * 2); c.fill();
      c.lineWidth = 4 * s; c.strokeStyle = INK; // worried brow
      c.beginPath(); c.moveTo(x - w * side * 0.9, y - h * 0.62); c.lineTo(x + w * side * 0.6, y - h * 0.82); c.stroke();
      break;
    }
    case 'determined':
    case 'wide':
    case 'open':
    default: {
      const ww = kind === 'wide' ? w * 1.15 : w;
      const hh = kind === 'wide' ? h * 1.1 : h;
      fill(c, ellipse(x + look[0], y + look[1], ww, hh * 0.5), INK);
      // big + small highlights
      c.fillStyle = '#fff';
      c.beginPath(); c.ellipse(x + look[0] - ww * 0.32, y + look[1] - hh * 0.2, ww * 0.36, hh * 0.17, -0.3, 0, Math.PI * 2); c.fill();
      c.beginPath(); c.arc(x + look[0] + ww * 0.3, y + look[1] + hh * 0.22, ww * 0.16, 0, Math.PI * 2); c.fill();
      if (kind === 'determined') {
        c.lineWidth = 5 * s; c.strokeStyle = INK;
        c.beginPath(); c.moveTo(x - w * 1.0 * side, y - h * 0.82); c.lineTo(x + w * 0.9 * side, y - h * 0.58); c.stroke();
      }
    }
  }
  c.restore();
}

/** Mouth. kind: 'smile' | 'grin' | 'o' | 'flat' | 'wavy' | 'shout' | 'cat' | 'tongue' | 'frown' | 'teeth' */
export function mouth(c, x, y, s = 1, kind = 'smile') {
  c.save();
  c.lineCap = 'round'; c.lineJoin = 'round';
  c.strokeStyle = INK; c.lineWidth = 4.5 * s;
  const w = 13 * s;
  switch (kind) {
    case 'grin': case 'shout': {
      const ww = kind === 'shout' ? w * 1.1 : w * 1.15;
      const hh = kind === 'shout' ? w * 1.35 : w * 0.95;
      const sh = (cc) => { cc.moveTo(x - ww, y - hh * 0.2); cc.quadraticCurveTo(x, y - hh * 0.35, x + ww, y - hh * 0.2); cc.quadraticCurveTo(x + ww * 0.9, y + hh, x, y + hh); cc.quadraticCurveTo(x - ww * 0.9, y + hh, x - ww, y - hh * 0.2); cc.closePath(); };
      fill(c, sh, '#7a2330');
      clipTo(c, sh, () => { fill(c, ellipse(x + ww * 0.15, y + hh * 0.95, ww * 0.65, hh * 0.45), '#ff7d93'); });
      stroke(c, sh, 4 * s, INK);
      break;
    }
    case 'o': {
      const sh = ellipse(x, y + w * 0.2, w * 0.45, w * 0.55);
      fill(c, sh, '#7a2330'); stroke(c, sh, 4 * s, INK);
      break;
    }
    case 'flat': c.beginPath(); c.moveTo(x - w * 0.6, y); c.lineTo(x + w * 0.6, y); c.stroke(); break;
    case 'frown': c.beginPath(); c.moveTo(x - w * 0.7, y + w * 0.35); c.quadraticCurveTo(x, y - w * 0.35, x + w * 0.7, y + w * 0.35); c.stroke(); break;
    case 'wavy': {
      c.beginPath(); c.moveTo(x - w, y);
      for (let i = 1; i <= 4; i++) c.quadraticCurveTo(x - w + (i - 0.5) * w / 2, y + (i % 2 ? -w * 0.35 : w * 0.35), x - w + i * w / 2, y);
      c.stroke(); break;
    }
    case 'cat': {
      c.beginPath(); c.moveTo(x - w * 0.9, y - w * 0.1);
      c.quadraticCurveTo(x - w * 0.45, y + w * 0.55, x, y);
      c.quadraticCurveTo(x + w * 0.45, y + w * 0.55, x + w * 0.9, y - w * 0.1); c.stroke(); break;
    }
    case 'tongue': {
      c.beginPath(); c.moveTo(x - w * 0.8, y); c.quadraticCurveTo(x, y + w * 0.6, x + w * 0.8, y); c.stroke();
      const t = (cc) => { cc.moveTo(x - w * 0.05, y + w * 0.28); cc.quadraticCurveTo(x + w * 0.05, y + w * 1.05, x + w * 0.5, y + w * 0.75); cc.quadraticCurveTo(x + w * 0.62, y + w * 0.4, x + w * 0.5, y + w * 0.18); };
      fill(c, t, '#ff7d93'); stroke(c, t, 3.5 * s, INK); break;
    }
    case 'teeth': {
      const sh = rrect(x - w, y - w * 0.4, w * 2, w * 0.9, w * 0.4);
      fill(c, sh, '#fff'); stroke(c, sh, 4 * s, INK);
      c.lineWidth = 2.5 * s; c.beginPath(); c.moveTo(x - w * 0.9, y + w * 0.05); c.lineTo(x + w * 0.9, y + w * 0.05); c.stroke();
      break;
    }
    case 'smile':
    default:
      c.beginPath(); c.moveTo(x - w * 0.8, y - w * 0.1); c.quadraticCurveTo(x, y + w * 0.75, x + w * 0.8, y - w * 0.1); c.stroke();
  }
  c.restore();
}
export function blush(c, x, y, s = 1, color = BLUSH) {
  c.save(); c.fillStyle = color;
  c.beginPath(); c.ellipse(x, y, 12 * s, 7 * s, 0, 0, Math.PI * 2); c.fill();
  c.restore();
}

// ---------------------------------------------------------------------------
// Text (for logo / signs). Fonts available in the forge page: 'DDDisplay'
// (Noto Sans CJK KR Black), 'DDBold' (Noto Sans CJK KR Bold), 'DDNum'
// (Poppins Bold). Wait for document.fonts.ready before drawing text.
// ---------------------------------------------------------------------------
export function outlinedText(c, text, x, y, { font = '900 64px DDDisplay', fill: f = '#fff', stroke: st = OUTLINE, lw = 10, align = 'center', baseline = 'alphabetic', shadow = null } = {}) {
  c.save();
  c.font = font; c.textAlign = align; c.textBaseline = baseline;
  c.lineJoin = 'round'; c.miterLimit = 2;
  if (shadow) { c.fillStyle = shadow.color; c.strokeStyle = shadow.color; c.lineWidth = lw; c.strokeText(text, x + shadow.dx, y + shadow.dy); c.fillText(text, x + shadow.dx, y + shadow.dy); }
  c.lineWidth = lw; c.strokeStyle = st; c.strokeText(text, x, y);
  c.fillStyle = f; c.fillText(text, x, y);
  c.restore();
}

// ---------------------------------------------------------------------------
// Math
// ---------------------------------------------------------------------------
export const lerp = (a, b, t) => a + (b - a) * t;
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const TAU = Math.PI * 2;
export const ease = {
  inOut: (t) => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2,
  out: (t) => 1 - (1 - t) * (1 - t),
  in: (t) => t * t,
  sine: (t) => -(Math.cos(Math.PI * t) - 1) / 2,
};
