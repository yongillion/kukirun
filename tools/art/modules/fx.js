// =============================================================================
//  Dessert Dash — FX atlas (sparks, dust, smash/hit bursts, rings, glows,
//  confetti, trails, shield bubble, smoke, crumbs, notes). SPEC §3.6.
//  Atlas `fx`, scale 2, all sprites anchored at their centre.
//  Designed to work with normal AND additive ('lighter') blending: luminous
//  white/gold cores with soft alpha falloff; comic bursts are opaque & bold.
// =============================================================================
import { OUTLINE, TAU, rng, mix, rgba, tone, fill, stroke, clipTo, innerShade, innerLight, glint, glow, circle, ellipse, poly, canvas, ctx2d, outerOutline } from '../lib.js';
import { roundPoly, puffyStar, place, PAL, candyBody } from './_ui_kit.js';

const GOLD = '#ffd25a';

/** 4-point twinkle with concave sides; w = waist (0.05 thin .. 0.3 fat). */
function twinkle(c, x, y, r, w = 0.14, rot = 0, color = '#ffffff', alpha = 1) {
  c.save(); c.translate(x, y); c.rotate(rot); c.globalAlpha *= alpha;
  c.fillStyle = color;
  c.beginPath();
  c.moveTo(0, -r);
  c.quadraticCurveTo(r * w, -r * w, r, 0);
  c.quadraticCurveTo(r * w, r * w, 0, r);
  c.quadraticCurveTo(-r * w, r * w, -r, 0);
  c.quadraticCurveTo(-r * w, -r * w, 0, -r);
  c.fill();
  c.restore();
}
/** Gold-rimmed white twinkle (reads on white and dark backgrounds). */
function goldTwinkle(c, x, y, r, w = 0.14, rot = 0, alpha = 1) {
  twinkle(c, x, y, r * 1.12, w * 1.25, rot, GOLD, alpha * 0.95);
  twinkle(c, x, y, r, w, rot, '#ffffff', alpha);
}
function softGlow(c, x, y, r, color, a) {
  const [R, G, B] = [parseInt(color.slice(1, 3), 16), parseInt(color.slice(3, 5), 16), parseInt(color.slice(5, 7), 16)];
  const g = c.createRadialGradient(x, y, 0, x, y, r);
  const st = [[0, 1], [0.18, 0.82], [0.4, 0.45], [0.65, 0.16], [0.85, 0.04], [1, 0]];
  for (const [t, v] of st) g.addColorStop(t, `rgba(${R},${G},${B},${v * a})`);
  c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill();
}
/** Irregular comic burst polygon (shape fn). */
function burstShape(cx, cy, ro, ri, n, seed, jit = 0.18, rot = 0) {
  const r = rng(seed);
  const pts = [];
  for (let i = 0; i < n * 2; i++) {
    const a = rot + (i * Math.PI) / n + (r() - 0.5) * (Math.PI / n) * 0.35;
    const rr = (i % 2 ? ri : ro) * (1 + (r() * 2 - 1) * jit);
    pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]);
  }
  return roundPoly(pts, pts.map((_, i) => (i % 2 ? 0.12 : 0.06)));
}
function dot(c, x, y, r, color, a = 1) { c.save(); c.globalAlpha *= a; c.fillStyle = color; c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill(); c.restore(); }

// ------------------------------------------------------------------ sparks
function drawSpark(c, i) {
  const x = 40, y = 40;
  if (i === 0) {
    softGlow(c, x, y, 26, GOLD, 0.85);
    goldTwinkle(c, x, y, 22, 0.16, 0);
    dot(c, x, y, 5, '#ffffff');
  } else if (i === 1) {
    softGlow(c, x, y, 36, GOLD, 0.8);
    goldTwinkle(c, x, y, 33, 0.11, 0);
    goldTwinkle(c, x, y, 16, 0.16, Math.PI / 4);
    dot(c, x, y, 6, '#ffffff');
    for (let k = 0; k < 4; k++) { const a = Math.PI / 4 + k * Math.PI / 2; dot(c, x + Math.cos(a) * 27, y + Math.sin(a) * 27, 2.6, '#fff6c8'); }
  } else if (i === 2) {
    softGlow(c, x, y, 30, GOLD, 0.55);
    goldTwinkle(c, x, y, 25, 0.12, 0.25, 0.9);
    for (let k = 0; k < 6; k++) { const a = k * TAU / 6 + 0.3; dot(c, x + Math.cos(a) * 31, y + Math.sin(a) * 31, 3.2, '#ffffff'); dot(c, x + Math.cos(a) * 31, y + Math.sin(a) * 31, 4.6, GOLD, 0.45); }
  } else {
    softGlow(c, x, y, 20, GOLD, 0.3);
    goldTwinkle(c, x, y, 12, 0.14, 0.45, 0.6);
    for (let k = 0; k < 6; k++) { const a = k * TAU / 6 + 0.45; dot(c, x + Math.cos(a) * 36, y + Math.sin(a) * 36, 2.2, '#ffffff', 0.7); }
  }
}

// ------------------------------------------------------------------ glints
function drawGlint(c, i) {
  const x = 30, y = 30;
  const P = [[9, 0.5, 0.0], [19, 0.9, 0.12], [25, 1, 0.22], [14, 0.6, 0.34]][i];
  const [r, a, rot] = P;
  softGlow(c, x, y, r * 0.95, GOLD, 0.65 * a);
  goldTwinkle(c, x, y, r, 0.12, rot, a);
  if (i === 1 || i === 2) goldTwinkle(c, x, y, r * 0.45, 0.18, rot + Math.PI / 4, a * 0.9);
  dot(c, x, y, Math.max(2, r * 0.16), '#ffffff', a);
}

// -------------------------------------------------------------------- dust
/** Puff cluster rendered opaque offscreen (merged silhouette + soft outline), then
 *  composited with one alpha so fading frames never show overlapping circles. */
function puffCluster(c, w, h, list, cols, alpha) {
  const off = canvas(w, h), g = ctx2d(off);
  const sorted = [...list].sort((p, q) => p[2] - q[2] || p[1] - q[1]).reverse(); // big/back first
  for (const [x, y, r] of sorted) {
    const sh = circle(x, y, r);
    fill(g, sh, cols.base);
    innerShade(g, sh, cols.shade, r * 0.24, r * 0.32);
    innerLight(g, sh, '#ffffff', r * 0.18, r * 0.18, 0.95);
    // soft internal edge so puffs read as separate bumps
    g.save(); g.beginPath(); g.arc(x, y, r - 0.6, -0.2, Math.PI * 0.95); g.lineWidth = 1.6; g.strokeStyle = cols.inner; g.stroke(); g.restore();
  }
  const outl = outerOutline(off, cols.lw ?? 2, cols.edge, 20);
  c.save(); c.globalAlpha *= alpha; c.drawImage(outl, 0, 0); c.restore();
}
const DUST = { base: '#fff6ea', shade: '#ead8c6', inner: 'rgba(196,160,128,0.55)', edge: '#c9ab8f' };
function drawDust(c, i) {
  const r = rng(300 + i);
  const cx = 60, by = 68;
  const spec = [
    { n: 3, spread: 15, rmin: 8, rmax: 13, rise: 1, a: 1 },
    { n: 5, spread: 28, rmin: 9, rmax: 17, rise: 5, a: 1 },
    { n: 6, spread: 38, rmin: 10, rmax: 19, rise: 9, a: 0.92 },
    { n: 6, spread: 45, rmin: 8, rmax: 15, rise: 13, a: 0.68 },
    { n: 6, spread: 50, rmin: 4.5, rmax: 9.5, rise: 17, a: 0.42 },
  ][i];
  const list = [];
  for (let k = 0; k < spec.n; k++) {
    const t = spec.n === 1 ? 0.5 : k / (spec.n - 1);
    const x = cx + (t - 0.5) * 2 * spec.spread + (r() - 0.5) * 5;
    const mid = 1 - Math.abs(t - 0.5) * 2;           // middle puffs bigger & higher
    const rad = spec.rmin + (spec.rmax - spec.rmin) * (0.35 + 0.65 * mid) * (0.82 + r() * 0.36);
    const y = by - rad - spec.rise * (0.3 + 0.7 * mid) - (r() - 0.3) * (4 + i * 2.5);
    list.push([Math.max(rad + 4, Math.min(116 - rad, x)), Math.max(rad + 4, y), rad]);
  }
  puffCluster(c, 120, 80, list, DUST, spec.a);
}

// ------------------------------------------------------------------- smoke
const SMOKE = { base: '#f1edf7', shade: '#c4bad6', inner: 'rgba(140,124,170,0.45)', edge: '#9d92b6' };
function drawSmoke(c, i) {
  const r = rng(500 + i);
  const cx = 80, cy = 84;
  const spec = [
    { n: 5, R: 20, rmin: 19, rmax: 27, a: 0.96 },
    { n: 7, R: 36, rmin: 18, rmax: 30, a: 0.78 },
    { n: 8, R: 50, rmin: 10, rmax: 22, a: 0.48 },
  ][i];
  const list = [];
  for (let k = 0; k < spec.n; k++) {
    const a = (k / spec.n) * TAU + r() * 0.5;
    const d = spec.R * (0.6 + r() * 0.4);
    list.push([cx + Math.cos(a) * d, cy + Math.sin(a) * d * 0.75 - 6 - (i * 4), spec.rmin + r() * (spec.rmax - spec.rmin)]);
  }
  if (i < 2) list.push([cx, cy - 8, spec.rmax * 1.08]);
  else list.push([cx - 4, cy - 14, 18], [cx + 10, cy - 4, 14]);
  puffCluster(c, 160, 160, list, SMOKE, spec.a);
}

// ------------------------------------------------------------------- smash
function drawSmash(c, i) {
  const x = 120, y = 120;
  const r = rng(700 + i);
  const shards = (n, d0, d1, s0, s1, a) => {
    for (let k = 0; k < n; k++) {
      const ang = (k / n) * TAU + r() * 0.5;
      const d = d0 + r() * (d1 - d0), s = s0 + r() * (s1 - s0);
      const px = x + Math.cos(ang) * d, py = y + Math.sin(ang) * d;
      const sh = poly([[px + Math.cos(ang) * s * 1.4, py + Math.sin(ang) * s * 1.4], [px + Math.cos(ang + 2.2) * s, py + Math.sin(ang + 2.2) * s], [px + Math.cos(ang - 2.2) * s, py + Math.sin(ang - 2.2) * s]]);
      c.save(); c.globalAlpha *= a;
      fill(c, sh, k % 2 ? '#ffd23a' : '#ff8a2a'); stroke(c, sh, 3, '#c2410c');
      c.restore();
    }
  };
  const stars = (n, d0, d1, s, a) => {
    for (let k = 0; k < n; k++) {
      const ang = (k / n) * TAU + 0.4 + r() * 0.4, d = d0 + r() * (d1 - d0);
      const sh = puffyStar(x + Math.cos(ang) * d, y + Math.sin(ang) * d, s, s * 0.48, 5, -Math.PI / 2 + r(), 0.25, 0.15);
      c.save(); c.globalAlpha *= a; fill(c, sh, '#fff3a0'); stroke(c, sh, 2.5, '#e08a00'); c.restore();
    }
  };
  if (i === 0) {
    softGlow(c, x, y, 90, '#fff2b0', 0.85);
    const b1 = burstShape(x, y, 70, 44, 10, 11, 0.12);
    fill(c, b1, '#ffd23a'); stroke(c, b1, 4, '#e0701a');
    fill(c, burstShape(x, y, 44, 28, 8, 12, 0.12, 0.3), '#ffffff');
  } else if (i === 1) {
    softGlow(c, x, y, 118, '#fff2b0', 0.8);
    const b0 = burstShape(x, y, 100, 66, 13, 21, 0.12);
    fill(c, b0, '#ff7a2a'); stroke(c, b0, 5, '#c2410c');
    fill(c, burstShape(x, y, 80, 54, 11, 22, 0.12, 0.2), '#ffd23a');
    fill(c, burstShape(x, y, 54, 36, 9, 23, 0.12, 0.1), '#ffffff');
    softGlow(c, x, y, 40, '#ffffff', 0.9);
    stars(4, 92, 100, 10, 1);
  } else if (i === 2) {
    softGlow(c, x, y, 112, '#fff2b0', 0.45);
    // spiky ring breaking apart
    c.save();
    const ring = (cc) => { burstShape(x, y, 104, 78, 13, 31, 0.11)(cc); cc.moveTo(x + 64, y); cc.arc(x, y, 64, 0, TAU, true); };
    c.globalAlpha = 0.9;
    c.beginPath(); ring(c); c.fillStyle = '#ffb02e'; c.fill('evenodd');
    c.lineWidth = 4; c.strokeStyle = '#c2410c'; c.lineJoin = 'round'; c.stroke();
    c.restore();
    shards(9, 70, 92, 9, 14, 1);
    stars(5, 82, 100, 9, 1);
    goldTwinkle(c, x, y, 30, 0.12, 0.2, 0.9);
  } else {
    shards(8, 88, 104, 7, 10, 0.6);
    stars(6, 90, 106, 7.5, 0.65);
    goldTwinkle(c, x - 40, y - 52, 14, 0.14, 0.2, 0.6);
    goldTwinkle(c, x + 50, y + 36, 11, 0.14, 0.5, 0.5);
  }
}

// --------------------------------------------------------------------- hit
function drawHit(c, i) {
  const x = 80, y = 80;
  if (i === 0) {
    softGlow(c, x, y, 78, '#ff9aa8', 0.6);
    const b0 = burstShape(x, y, 64, 40, 9, 41, 0.15, 0.2);
    fill(c, b0, '#ff3b5c'); stroke(c, b0, 4.5, '#8f1233');
    const b1 = burstShape(x, y, 42, 26, 7, 42, 0.15, 0.5);
    fill(c, b1, '#ffffff');
    // crack lines
    c.save(); c.strokeStyle = '#ff3b5c'; c.lineWidth = 3.5; c.lineCap = 'round'; c.lineJoin = 'round';
    c.beginPath(); c.moveTo(x - 4, y - 18); c.lineTo(x + 4, y - 4); c.lineTo(x - 3, y + 6); c.lineTo(x + 6, y + 18); c.stroke();
    c.restore();
  } else {
    softGlow(c, x, y, 70, '#ff9aa8', 0.35);
    c.save(); c.globalAlpha = 0.85;
    const ring = (cc) => { burstShape(x, y, 66, 46, 9, 43, 0.15, 0.4)(cc); cc.moveTo(x + 36, y); cc.arc(x, y, 36, 0, TAU, true); };
    c.beginPath(); ring(c); c.fillStyle = '#ff5a74'; c.fill('evenodd');
    c.lineWidth = 4; c.strokeStyle = '#8f1233'; c.lineJoin = 'round'; c.stroke();
    c.restore();
    twinkle(c, x, y, 26, 0.14, 0.3, '#ffffff', 0.9);
  }
}

// -------------------------------------------------------------------- heal
function drawHeal(c) {
  const x = 40, y = 40;
  softGlow(c, x, y, 38, '#7dffb8', 0.75);
  const plus = roundPoly([[x - 8, y - 24], [x + 8, y - 24], [x + 8, y - 8], [x + 24, y - 8], [x + 24, y + 8], [x + 8, y + 8], [x + 8, y + 24], [x - 8, y + 24], [x - 8, y + 8], [x - 24, y + 8], [x - 24, y - 8], [x - 8, y - 8]],
    [0.3, 0.3, 0.2, 0.3, 0.3, 0.2, 0.3, 0.3, 0.2, 0.3, 0.3, 0.2]);
  fill(c, plus, '#4fe39a');
  innerShade(c, plus, '#22b673', 3, 4);
  innerLight(c, plus, '#ffffff', 3, 3, 0.8);
  clipTo(c, plus, () => softGlow(c, x - 2, y - 2, 18, '#ffffff', 0.85));
  stroke(c, plus, 3.5, '#1d8a5a');
  goldTwinkle(c, x + 25, y - 25, 9, 0.14, 0);
  goldTwinkle(c, x - 26, y + 22, 6, 0.16, 0.3);
}

// ------------------------------------------------------------ rings & glows
function drawRing(c, w, gold) {
  const x = w / 2, y = w / 2, R = w / 2 - 1;
  const g = c.createRadialGradient(x, y, 0, x, y, R);
  if (!gold) {
    for (const [t, a] of [[0, 0], [0.68, 0], [0.8, 0.55], [0.87, 1], [0.92, 0.7], [0.97, 0.18], [1, 0]]) g.addColorStop(t, `rgba(255,255,255,${a})`);
  } else {
    const stops = [[0, '255,210,90', 0], [0.66, '255,190,60', 0], [0.79, '255,200,70', 0.7], [0.86, '255,248,214', 1], [0.92, '255,206,74', 0.75], [0.97, '255,170,40', 0.2], [1, '255,170,40', 0]];
    for (const [t, rgb, a] of stops) g.addColorStop(t, `rgba(${rgb},${a})`);
  }
  c.fillStyle = g; c.beginPath(); c.arc(x, y, R, 0, TAU); c.fill();
}
function drawGlow(c, w, gold) {
  const x = w / 2, y = w / 2, R = w / 2;
  const g = c.createRadialGradient(x, y, 0, x, y, R);
  if (!gold) {
    for (const [t, a] of [[0, 1], [0.12, 0.92], [0.3, 0.62], [0.5, 0.32], [0.7, 0.12], [0.86, 0.035], [1, 0]]) g.addColorStop(t, `rgba(255,255,255,${a})`);
  } else {
    const st = [[0, '255,255,240', 1], [0.12, '255,244,190', 0.95], [0.3, '255,218,110', 0.66], [0.5, '255,196,70', 0.34], [0.7, '255,176,50', 0.13], [0.86, '255,160,40', 0.04], [1, '255,160,40', 0]];
    for (const [t, rgb, a] of st) g.addColorStop(t, `rgba(${rgb},${a})`);
  }
  c.fillStyle = g; c.fillRect(0, 0, w, w);
  predither(c, w, w, gold ? 91 : 90, 6);
}
/** Fine deterministic triangular noise on soft alpha so the exporter's 256-colour
 *  palette quantization yields grain instead of visible concentric bands. */
function predither(c, w, h, seed, amp) {
  const img = c.getImageData(0, 0, w, h), d = img.data, r = rng(seed);
  for (let i = 0; i < d.length; i += 4) {
    const a = d[i + 3];
    if (a > 0 && a < 255) d[i + 3] = Math.max(0, Math.min(255, Math.round(a + (r() + r() - 1) * amp * Math.min(1, a / 24))));
  }
  c.putImageData(img, 0, 0);
}

// ---------------------------------------------------------------- confetti
const CONF = ['#ff5f9e', '#ffd23a', '#47b8ff', '#4fdc8f', '#a77bff', '#ff8c3a'];
function drawConfetti(c, i, w, h) {
  const col = CONF[i], dk = tone(col, -0.35), lt = mix(col, '#ffffff', 0.45);
  c.save(); c.translate(w / 2, h / 2);
  c.lineJoin = 'round'; c.lineCap = 'round';
  const paint = (sh) => {
    fill(c, sh, col);
    clipTo(c, sh, () => { c.fillStyle = lt; c.fillRect(-20, -12, 40, 9); });
    stroke(c, sh, 1.8, dk);
  };
  if (i === 0 || i === 1) { c.rotate(i ? 0.22 : -0.2); paint((cc) => cc.rect(-10, -4.5, 20, 9)); }
  else if (i === 2) {
    const sh = (cc) => { cc.moveTo(-13, -2.5); cc.bezierCurveTo(-8, -9, -4, -9, 0, -3); cc.bezierCurveTo(4, 3, 8, 3, 13, -3); cc.lineTo(13, 3); cc.bezierCurveTo(8, 9, 4, 9, 0, 3); cc.bezierCurveTo(-4, -3, -8, -3, -13, 3.5); cc.closePath(); };
    paint(sh);
  } else if (i === 3) { paint(circle(0, 0, 7.5)); }
  else if (i === 4) { c.rotate(0.15); paint(roundPoly([[0, -7], [9, 6], [-9, 6]], 0.12)); }
  else {
    const sh = (cc) => { cc.moveTo(-13, 2); cc.bezierCurveTo(-10, -8, -2, -8, -1, -1); cc.bezierCurveTo(0, 6, 9, 6, 13, -4); cc.lineTo(13, 1); cc.bezierCurveTo(8, 10, -4, 9.5, -5, 1.5); cc.bezierCurveTo(-6, -3.5, -9, -3, -9, 4); cc.closePath(); };
    paint(sh);
  }
  c.restore();
}

// ------------------------------------------------------------------- trail
function drawTrail(c, w, h) {
  const cols = ['#ff5a6e', '#ff9a3c', '#ffd93d', '#6fdc5a', '#3cc4ff', '#9a7bff'];
  const top = 6, bh = (h - 12) / cols.length;
  cols.forEach((col, k) => {
    c.fillStyle = col; c.fillRect(0, top + k * bh, w, bh + 0.6);
    c.fillStyle = rgba('#ffffff', 0.32); c.fillRect(0, top + k * bh, w, bh * 0.32);
  });
  // soft top/bottom falloff
  c.globalCompositeOperation = 'destination-in';
  const g = c.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(0.16, 'rgba(0,0,0,0.95)'); g.addColorStop(0.5, 'rgba(0,0,0,1)');
  g.addColorStop(0.84, 'rgba(0,0,0,0.95)'); g.addColorStop(1, 'rgba(0,0,0,0)');
  c.fillStyle = g; c.fillRect(0, 0, w, h);
  c.globalCompositeOperation = 'source-over';
}

// --------------------------------------------------------------- speedline
function drawSpeedline(c, w, h) {
  const y = h / 2;
  const g = c.createLinearGradient(0, 0, w, 0);
  g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.45, 'rgba(255,255,255,0.55)'); g.addColorStop(1, 'rgba(255,255,255,1)');
  c.fillStyle = g;
  c.beginPath();
  c.moveTo(2, y);
  c.quadraticCurveTo(w * 0.5, y - 3.2, w - 8, y - 4.4);
  c.arc(w - 8, y, 4.4, -Math.PI / 2, Math.PI / 2);
  c.quadraticCurveTo(w * 0.5, y + 3.2, 2, y);
  c.closePath(); c.fill();
}

// ------------------------------------------------------------------ bubble
function drawBubble(c, w) {
  const x = w / 2, y = w / 2, R = w / 2 - 8;
  // body: clear centre, denser rim
  const g = c.createRadialGradient(x - R * 0.15, y - R * 0.18, 0, x, y, R);
  g.addColorStop(0, 'rgba(200,245,255,0.06)'); g.addColorStop(0.62, 'rgba(160,226,255,0.12)');
  g.addColorStop(0.86, 'rgba(130,210,255,0.3)'); g.addColorStop(0.97, 'rgba(190,236,255,0.62)'); g.addColorStop(1, 'rgba(255,255,255,0.85)');
  c.fillStyle = g; c.beginPath(); c.arc(x, y, R, 0, TAU); c.fill();
  // iridescent rim (conic)
  const cg = c.createConicGradient(-0.6, x, y);
  const iri = [[0, '120,230,255'], [0.2, '255,150,220'], [0.38, '255,236,140'], [0.55, '140,255,210'], [0.75, '170,160,255'], [1, '120,230,255']];
  for (const [t, rgb] of iri) cg.addColorStop(t, `rgba(${rgb},0.6)`);
  c.save(); c.beginPath(); c.arc(x, y, R - 6, 0, TAU); c.lineWidth = 11; c.strokeStyle = cg; c.stroke(); c.restore();
  c.save(); c.beginPath(); c.arc(x, y, R - 0.5, 0, TAU); c.lineWidth = 3; c.strokeStyle = 'rgba(255,255,255,0.95)'; c.stroke(); c.restore();
  c.save(); c.beginPath(); c.arc(x, y, R + 1.6, 0, TAU); c.lineWidth = 2; c.strokeStyle = 'rgba(40,120,190,0.45)'; c.stroke(); c.restore();
  // glossy highlights
  c.save();
  c.lineCap = 'round';
  c.strokeStyle = 'rgba(255,255,255,0.85)'; c.lineWidth = 15;
  c.beginPath(); c.arc(x, y, R - 22, Math.PI * 1.08, Math.PI * 1.4); c.stroke();
  c.strokeStyle = 'rgba(255,255,255,0.7)'; c.lineWidth = 8;
  c.beginPath(); c.arc(x, y, R - 22, Math.PI * 1.47, Math.PI * 1.56); c.stroke();
  c.strokeStyle = 'rgba(255,255,255,0.45)'; c.lineWidth = 9;
  c.beginPath(); c.arc(x, y, R - 18, Math.PI * 0.12, Math.PI * 0.36); c.stroke();
  c.restore();
  c.fillStyle = 'rgba(255,255,255,0.95)';
  c.beginPath(); c.ellipse(x - R * 0.42, y - R * 0.58, 9, 5.5, -0.7, 0, TAU); c.fill();
}

// --------------------------------------------------------------- star_small
function drawStarSmall(c) {
  softGlow(c, 20, 20, 19, GOLD, 0.6);
  const sh = puffyStar(20, 21, 14, 7, 5, -Math.PI / 2, 0.28, 0.2);
  fill(c, sh, '#ffd23a');
  innerShade(c, sh, '#f5a01a', 2, 2.5);
  clipTo(c, sh, () => softGlow(c, 19, 19, 9, '#ffffff', 0.9));
  stroke(c, sh, 2.4, '#d06a0a');
  c.fillStyle = '#ffffff'; c.beginPath(); c.ellipse(16, 16, 2.6, 1.6, -0.7, 0, TAU); c.fill();
}

// ----------------------------------------------------------------- crumbs
function drawCrumb(c, i) {
  const r = rng(900 + i);
  const pal = [
    { base: '#d9a05b', shade: '#b07a3c', light: '#f2c98a' },
    { base: '#6e3a20', shade: '#4d2716', light: '#a8653d' },
    { base: '#f0c27a', shade: '#cf9a52', light: '#fff0c8' },
  ][i];
  const rad = [8.5, 7.5, 6.5][i];
  const n = 6;
  const pts = [];
  for (let k = 0; k < n; k++) { const a = (k / n) * TAU + r() * 0.5; const d = rad * (0.75 + r() * 0.4); pts.push([12 + Math.cos(a) * d, 12 + Math.sin(a) * d]); }
  const sh = roundPoly(pts, 0.25);
  fill(c, sh, pal.base);
  innerShade(c, sh, pal.shade, 2, 2.5);
  innerLight(c, sh, pal.light, 1.6, 1.6);
  if (i === 0) dot(c, 13.5, 13.5, 2.6, '#6b3a22');
  stroke(c, sh, 2.5, OUTLINE);
  dot(c, 9.5, 9, 1.3, '#ffffff', 0.85);
}

// ------------------------------------------------------------------- notes
function drawNote(c, i) {
  const col = i ? '#a77bff' : '#ff6fae';
  const P = { base: col, top: mix(col, '#ffffff', 0.35), bot: col, shade: tone(col, -0.25), light: mix(col, '#ffffff', 0.6) };
  let sh;
  if (i === 0) {
    sh = (cc) => {
      cc.moveTo(18 + 9.5 * Math.cos(-0.42), 35 + 9.5 * Math.sin(-0.42)); cc.ellipse(18, 35, 9.5, 7.2, -0.42, 0, TAU);
      cc.moveTo(24, 34); cc.lineTo(24, 7); cc.lineTo(29, 7);
      cc.bezierCurveTo(31, 14, 41, 15, 39, 26); cc.bezierCurveTo(38, 20, 33, 18, 29, 18);
      cc.lineTo(29, 34); cc.closePath();
    };
  } else {
    sh = (cc) => {
      cc.moveTo(13 + 8.5 * Math.cos(-0.42), 37 + 8.5 * Math.sin(-0.42)); cc.ellipse(13, 37, 8.5, 6.6, -0.42, 0, TAU);
      cc.moveTo(34 + 8.5 * Math.cos(-0.42), 33 + 8.5 * Math.sin(-0.42)); cc.ellipse(34, 33, 8.5, 6.6, -0.42, 0, TAU);
      cc.moveTo(18, 36); cc.lineTo(18, 11); cc.lineTo(44, 6); cc.lineTo(44, 32); cc.lineTo(39, 32); cc.lineTo(39, 15); cc.lineTo(23, 18); cc.lineTo(23, 36); cc.closePath();
    };
  }
  fill(c, sh, linearFill(c, P));
  innerShade(c, sh, P.shade, 2, 2.5);
  innerLight(c, sh, '#ffffff', 1.6, 1.6, 0.6);
  stroke(c, sh, 3.4, OUTLINE);
  if (i === 0) glint(c, 14, 32, 3, -0.6, 0.95); else { glint(c, 9.5, 34.5, 2.6, -0.6, 0.95); glint(c, 30.5, 30.5, 2.6, -0.6, 0.95); }
}
function linearFill(c, P) { const g = c.createLinearGradient(0, 4, 0, 46); g.addColorStop(0, P.top); g.addColorStop(1, P.base); return g; }

// ----------------------------------------------------------------------------
export function build(F) {
  const it = [];
  const add = (name, w, h, draw, meta) => it.push({ name, w, h, draw, ...(meta ? { meta } : {}) });
  for (let i = 0; i < 4; i++) add(`spark_${i}`, 80, 80, (c) => drawSpark(c, i));
  for (let i = 0; i < 5; i++) add(`dust_${i}`, 120, 80, (c) => drawDust(c, i));
  for (let i = 0; i < 4; i++) add(`smash_${i}`, 240, 240, (c) => drawSmash(c, i));
  for (let i = 0; i < 2; i++) add(`hit_${i}`, 160, 160, (c) => drawHit(c, i));
  add('heal', 80, 80, (c) => drawHeal(c));
  for (let i = 0; i < 4; i++) add(`glint_${i}`, 60, 60, (c) => drawGlint(c, i));
  add('ring', 256, 256, (c, w) => drawRing(c, w, false));
  add('ring_gold', 256, 256, (c, w) => drawRing(c, w, true));
  add('glow', 256, 256, (c, w) => drawGlow(c, w, false));
  add('glow_gold', 256, 256, (c, w) => drawGlow(c, w, true));
  for (let i = 0; i < 6; i++) add(`confetti_${i}`, 32, 20, (c, w, h) => drawConfetti(c, i, w, h));
  add('trail', 128, 48, (c, w, h) => drawTrail(c, w, h), { tile: 'x' });
  add('speedline', 400, 12, (c, w, h) => drawSpeedline(c, w, h));
  add('bubble', 320, 320, (c, w) => drawBubble(c, w));
  for (let i = 0; i < 3; i++) add(`smoke_${i}`, 160, 160, (c) => drawSmoke(c, i));
  add('star_small', 40, 40, (c) => drawStarSmall(c));
  for (let i = 0; i < 3; i++) add(`chip_bit_${i}`, 24, 24, (c) => drawCrumb(c, i));
  for (let i = 0; i < 2; i++) add(`note_${i}`, 48, 48, (c) => drawNote(c, i));

  F.atlas('fx', {
    path: 'fx/fx', scale: 2, padding: 4, maxWidth: 2048, items: it,
    meta: {
      anims: {
        spark: { frames: ['spark_0', 'spark_1', 'spark_2', 'spark_3'], fps: 20, loop: false },
        dust: { frames: ['dust_0', 'dust_1', 'dust_2', 'dust_3', 'dust_4'], fps: 18, loop: false },
        smash: { frames: ['smash_0', 'smash_1', 'smash_2', 'smash_3'], fps: 16, loop: false },
        hit: { frames: ['hit_0', 'hit_1'], fps: 12, loop: false },
        glint: { frames: ['glint_0', 'glint_1', 'glint_2', 'glint_3'], fps: 14, loop: false },
        smoke: { frames: ['smoke_0', 'smoke_1', 'smoke_2'], fps: 10, loop: false },
      },
      additive: ['spark_0', 'spark_1', 'spark_2', 'spark_3', 'glint_0', 'glint_1', 'glint_2', 'glint_3', 'ring', 'ring_gold', 'glow', 'glow_gold', 'speedline', 'trail', 'heal', 'star_small'],
    },
  });
}
