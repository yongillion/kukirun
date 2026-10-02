// =============================================================================
//  Dessert Dash — shared accessory / effect helpers for runners & pets.
//  Not an export module (underscore prefix).
// =============================================================================
import { OUTLINE, tone, rgba, rng, smooth, blobPoints, circle, ellipse, star, rrect, glow, sparkle, lerp, TAU } from '../lib.js';
import { M, cel, strokeL, fillL, glintL, tubeShape, bendPts, qpts, AX } from './_char_rig.js';

const ID = (c) => c.setTransform(1, 0, 0, 1, 0, 0);

/** Fluttering ribbon tail from p0 (frame px) heading `ang`. */
export function ribbonTail(c, p0, ang, len, w, amp, phase, col, opts = {}) {
  const bend = (s) => amp * s * Math.sin(TAU * (s * 1.05 - phase)) + (opts.curl || 0) * s * s;
  const pts = bendPts(p0, ang, len, 14, bend);
  const n = pts.length; const e = pts[n - 1], e0 = pts[n - 2];
  const ea = Math.atan2(e[1] - e0[1], e[0] - e0[0]);
  if (opts.fringe) {
    const px = -Math.sin(ea), py = Math.cos(ea);
    for (const k of [-1, 0, 1]) {
      const s0 = [e[0] + px * k * w * 0.32 - Math.cos(ea) * 3, e[1] + py * k * w * 0.32 - Math.sin(ea) * 3];
      const tp = bendPts(s0, ea + k * 0.22, 11, 4, () => 0);
      cel(c, M.I, tubeShape(tp, 3.2, 2.8), { fill: opts.fringe, shade: false, lw: 4.5 });
    }
  }
  cel(c, M.I, tubeShape(pts, w / 2, w / 2 * (opts.taper ?? 0.95)), {
    fill: col.base, shade: col.shade, sdx: 4, sdy: 5, light: col.light, ldx: 3, ldy: 3, lightAlpha: 0.7, lw: 5.5,
    details: (g) => {
      if (!opts.ribs) return;
      for (let k = 1; k <= opts.ribs; k++) {
        const q = pts[Math.round((k / (opts.ribs + 1)) * (n - 1))];
        const qa = Math.atan2(e[1] - p0[1], e[0] - p0[0]) + Math.PI / 2;
        g.strokeStyle = col.rib; g.lineWidth = 3; g.lineCap = 'round'; g.globalAlpha = 0.8;
        g.beginPath(); g.moveTo(q[0] - Math.cos(qa) * w, q[1] - Math.sin(qa) * w); g.lineTo(q[0] + Math.cos(qa) * w, q[1] + Math.sin(qa) * w); g.stroke();
      }
    },
  });
  return { e, ea };
}

/** Cherry on a stem; base = frame px where it sits, ang = lean (0 = upright). */
export function cherry(c, base, ang, r = 16, col = {}) {
  const red = col.red || '#ee3550';
  const dir = [Math.sin(ang), -Math.cos(ang)];
  const cc = [base[0] + dir[0] * r * 0.55, base[1] + dir[1] * r * 0.55];
  const s0 = [cc[0] + dir[0] * r * 0.6, cc[1] + dir[1] * r * 0.6];
  const s1 = [s0[0] + dir[0] * 10 + dir[1] * -6, s0[1] + dir[1] * 10 - dir[0] * -6];
  const s2 = [s0[0] + dir[0] * 22 - 9 * Math.cos(ang), s0[1] + dir[1] * 22 - 9 * Math.sin(ang)];
  cel(c, M.I, tubeShape(qpts(s0, s1, s2, 8), 3.4, 2.6), { fill: col.stem || '#6aa83a', shade: false, lw: 4.5 });
  const m = M.chain(M.T(cc[0], cc[1]), M.R(ang));
  cel(c, m, (g) => {
    g.moveTo(0, -r * 0.82);
    g.bezierCurveTo(r * 0.45, -r * 1.12, r * 1.05, -r * 0.7, r * 1.0, -r * 0.05);
    g.bezierCurveTo(r * 0.95, r * 0.75, r * 0.4, r * 1.0, 0, r * 0.98);
    g.bezierCurveTo(-r * 0.4, r * 1.0, -r * 0.95, r * 0.75, -r * 1.0, -r * 0.05);
    g.bezierCurveTo(-r * 1.05, -r * 0.7, -r * 0.45, -r * 1.12, 0, -r * 0.82);
    g.closePath();
  }, {
    fill: red, shade: tone(red, -0.3), sdx: 5, sdy: 6, light: tone(red, 0.3), ldx: 3, ldy: 3, lightAlpha: 0.6, lw: 5,
    after: (g) => { glintL(g, M.T(cc[0], cc[1]), -r * 0.42, -r * 0.35, r * 0.3, -0.7, 0.95); },
  });
  return cc;
}

/** Small strawberry (with leafy calyx) standing on `base`, leaning by ang. */
export function strawberry(c, base, ang, s = 1) {
  const m = M.chain(M.T(base[0], base[1]), M.R(ang), M.S(s), M.T(0, -13));
  const berry = (g) => { g.moveTo(0, 14); g.bezierCurveTo(-9, 12, -16, 3, -15, -5); g.bezierCurveTo(-14, -13, -6, -14, 0, -12); g.bezierCurveTo(6, -14, 14, -13, 15, -5); g.bezierCurveTo(16, 3, 9, 12, 0, 14); g.closePath(); };
  const seeds = [[-7, -4], [0, -3], [7, -4], [-4, 3], [4, 3], [0, 9]];
  cel(c, m, berry, {
    fill: '#ff4d6a', shade: '#d22a50', sdx: 4, sdy: 4, light: '#ff95a5', ldx: 3, ldy: 3, lightAlpha: 0.8, lw: 5,
    details: (g) => { for (const [x, y] of seeds) fillL(g, m, ellipse(x, y, 1.7, 2.5, 0.2), '#ffe58a'); },
    after: (g) => glintL(g, m, -7, -6, 3, -0.7, 0.9),
  });
  const lm = M.mul(m, M.T(0, -12));
  cel(c, lm, star(0, 0, 11.5, 4.6, 5, -Math.PI / 2, 0.85), { fill: '#5cc85f', shade: '#3a9a45', sdx: 2, sdy: 2, light: '#9be58f', ldx: 2, ldy: 2, lw: 4 });
  const st = [M.ap(lm, 0, -2), M.ap(lm, 1, -8), M.ap(lm, 4, -12)];
  cel(c, M.I, tubeShape(qpts(st[0], st[1], st[2], 6), 2.6, 2.2), { fill: '#4fae4f', shade: false, lw: 4 });
}

/** Chunky sprinkle (rounded capsule). */
export function sprinkle(c, m, x, y, ang, col, L = 10, W = 4.6) {
  const p0 = M.ap(m, x - Math.cos(ang) * L / 2, y - Math.sin(ang) * L / 2);
  const p1 = M.ap(m, x + Math.cos(ang) * L / 2, y + Math.sin(ang) * L / 2);
  c.save(); ID(c);
  c.lineCap = 'round';
  c.strokeStyle = rgba('#4a2a1a', 0.5); c.lineWidth = W + 2.4;
  c.beginPath(); c.moveTo(p0[0], p0[1]); c.lineTo(p1[0], p1[1]); c.stroke();
  c.strokeStyle = col; c.lineWidth = W;
  c.beginPath(); c.moveTo(p0[0], p0[1]); c.lineTo(p1[0], p1[1]); c.stroke();
  c.restore();
}
export const SPRINKLE_COLS = ['#ff5a6e', '#ffb43c', '#ffe45a', '#66d36e', '#4fb8ff', '#a77bff', '#ffffff'];

/** Smooth closed band with wavy top/bottom edges and round ends (frills, cream). */
export function wavyBand(x0, x1, yT, yB, aT, aB, per, ph = 0) {
  const pts = []; const r = (yB - yT) / 2, cy = (yT + yB) / 2;
  const n = 22; const xa = x0 + r * 0.7, xb = x1 - r * 0.7;
  for (let i = 0; i <= n; i++) { const x = lerp(xa, xb, i / n); pts.push([x, yT + aT * Math.sin((x / per) * TAU + ph)]); }
  for (let k = 1; k < 4; k++) { const a = -Math.PI / 2 + (k / 4) * Math.PI; pts.push([xb + Math.cos(a) * r * 0.95, cy + Math.sin(a) * r]); }
  for (let i = n; i >= 0; i--) { const x = lerp(xa, xb, i / n); pts.push([x, yB + aB * Math.sin((x / per) * TAU + ph + 1.7)]); }
  for (let k = 1; k < 4; k++) { const a = Math.PI / 2 + (k / 4) * Math.PI; pts.push([xa + Math.cos(a) * r * 0.95, cy + Math.sin(a) * r]); }
  return smooth(pts, true, 0.5);
}

// ---------------------------------------------------------------------------
// skill-pose effects (drawn in frame space)
// ---------------------------------------------------------------------------
export function auraRays(c, cx, cy, col, k, n = 10, r0 = 70, r1 = 120) {
  c.save();
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU + k * 0.17 + 0.1;
    const w = 0.09;
    const g = c.createRadialGradient(cx, cy, r0 * 0.6, cx, cy, r1);
    g.addColorStop(0, rgba(col, 0.0)); g.addColorStop(0.35, rgba(col, 0.3)); g.addColorStop(1, rgba(col, 0));
    c.fillStyle = g;
    c.beginPath(); c.moveTo(cx, cy); c.arc(cx, cy, r1, a - w, a + w); c.closePath(); c.fill();
  }
  c.restore();
}
export function auraBase(c, k, col, cy = 150) {
  glow(c, AX, cy, 116, col, 0.55 + 0.1 * k);
  auraRays(c, AX, cy, col, k);
}
export function twinkles(c, k, list, col = '#ffffff') {
  for (const [x, y, r, ph] of list) {
    const s = 0.7 + 0.45 * Math.abs(Math.sin((k + ph) * 1.7));
    sparkle(c, x, y, r * s, col, 0.95, 0);
  }
}
export function chocoChunk(c, x, y, rot, s, seed) {
  c.save();
  const g = c.createLinearGradient(x, y - 34 * s, x, y);
  g.addColorStop(0, 'rgba(255,190,120,0)'); g.addColorStop(1, 'rgba(255,190,120,0.55)');
  c.fillStyle = g; c.beginPath(); c.moveTo(x - 7 * s, y - 2); c.lineTo(x - 3 * s, y - 34 * s); c.lineTo(x + 3 * s, y - 34 * s); c.lineTo(x + 7 * s, y - 2); c.closePath(); c.fill();
  c.restore();
  const sh = smooth(blobPoints(0, 0, 13, 11, 6, 0.16, rng(seed), rot), true);
  const m = M.chain(M.T(x, y), M.S(s));
  cel(c, m, sh, { fill: '#7a4226', shade: '#4f2715', sdx: 4, sdy: 4, light: '#b0703f', ldx: 3, ldy: 3, lw: 4.5,
    after: (gg) => glintL(gg, m, -4, -4, 3.6, -0.7, 0.95) });
}
export function flower(c, x, y, r, col, rot = 0) {
  const m = M.chain(M.T(x, y), M.R(rot));
  const petals = (g) => { for (let i = 0; i < 5; i++) { const a = i / 5 * TAU - Math.PI / 2; const px = Math.cos(a) * r * 0.6, py = Math.sin(a) * r * 0.6; g.moveTo(px + r * 0.5, py); g.arc(px, py, r * 0.5, 0, TAU); } };
  cel(c, m, petals, { fill: col, shade: tone(col, -0.18), sdx: 3, sdy: 3, light: tone(col, 0.45), ldx: 2, ldy: 2, lw: 4, under: true });
  cel(c, m, circle(0, 0, r * 0.34), { fill: '#ffd84a', shade: '#f0a830', sdx: 2, sdy: 2, lw: 3.5 });
}
export function starJelly(c, x, y, r, rot = 0, col = '#ffd84a', lw = 4.5) {
  const m = M.chain(M.T(x, y), M.R(rot));
  cel(c, m, star(0, 0, r, r * 0.52, 5, -Math.PI / 2, 0.9), { fill: col, shade: tone(col, -0.2), sdx: 3, sdy: 3, light: tone(col, 0.5), ldx: 2, ldy: 2, lw,
    after: (g) => glintL(g, m, -r * 0.25, -r * 0.3, r * 0.2, -0.7, 0.95) });
}
export function plusSign(c, x, y, r, col) {
  const u = (g) => { rrect(-r * 0.37, -r, r * 0.74, 2 * r, r * 0.32)(g); rrect(-r, -r * 0.37, 2 * r, r * 0.74, r * 0.32)(g); };
  const m = M.T(x, y);
  cel(c, m, u, { fill: col, shade: tone(col, -0.2), sdx: 2.5, sdy: 2.5, light: tone(col, 0.5), ldx: 2, ldy: 2, lw: 4, under: true });
}
export function coin(c, x, y, r, squash = 1) {
  const m = M.chain(M.T(x, y), M.S(squash, 1));
  cel(c, m, circle(0, 0, r), { fill: '#ffd23f', shade: '#e0961c', sdx: 3, sdy: 3, light: '#fff1a6', ldx: 2, ldy: 2, lw: 4 });
  strokeL(c, m, circle(0, 0, r * 0.64), 2.8, '#cf8a16', 0.85);
  fillL(c, m, star(0, 0, r * 0.4, r * 0.19, 5, -Math.PI / 2, 0.6), '#f2aa22');
  glintL(c, m, -r * 0.42, -r * 0.42, r * 0.2, -0.7, 0.95);
}
export function bubble(c, x, y, r, col = '#bff6ff', a = 1) {
  c.save(); ID(c); c.globalAlpha *= a;
  const g = c.createRadialGradient(x - r * 0.25, y - r * 0.3, r * 0.1, x, y, r);
  g.addColorStop(0, 'rgba(255,255,255,0.12)'); g.addColorStop(0.72, rgba(col, 0.22)); g.addColorStop(1, rgba(col, 0.6));
  c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill();
  c.strokeStyle = rgba(col, 0.95); c.lineWidth = Math.max(2.5, r * 0.09); c.stroke();
  c.strokeStyle = 'rgba(255,255,255,0.95)'; c.lineCap = 'round'; c.lineWidth = Math.max(2.5, r * 0.11);
  c.beginPath(); c.arc(x, y, r * 0.72, Math.PI * 1.05, Math.PI * 1.38); c.stroke();
  c.beginPath(); c.arc(x - r * 0.12, y - r * 0.62, r * 0.06, 0, TAU); c.fillStyle = '#fff'; c.fill();
  c.restore();
}
export function swoosh(c, cx, cy, rx, ry, a0, a1, col, lw = 7, rot = 0) {
  c.save(); ID(c);
  c.translate(cx, cy); c.rotate(rot);
  const n = 18;
  for (let i = 0; i < n; i++) {
    const t0 = i / n, t1 = (i + 1) / n;
    const aa = lerp(a0, a1, t0), bb = lerp(a0, a1, t1);
    c.strokeStyle = rgba(col, 0.15 + 0.85 * t1); c.lineWidth = lw * (0.35 + 0.65 * t1); c.lineCap = 'round';
    c.beginPath(); c.moveTo(Math.cos(aa) * rx, Math.sin(aa) * ry); c.lineTo(Math.cos(bb) * rx, Math.sin(bb) * ry); c.stroke();
  }
  c.restore();
}
export function cloudPuff(c, x, y, r, col = '#ffffff', shade = '#e4dcf4') {
  const u = (g) => { for (const [dx, dy, rr] of [[-0.55, 0.15, 0.55], [0, -0.2, 0.7], [0.6, 0.12, 0.5], [0.05, 0.3, 0.55]]) { g.moveTo(x + dx * r + rr * r, y + dy * r); g.arc(x + dx * r, y + dy * r, rr * r, 0, TAU); } };
  cel(c, M.I, u, { fill: col, shade, sdx: 4, sdy: 4, lw: 4, under: true });
}
