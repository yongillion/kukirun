// =============================================================================
//  Small math / misc helpers
// =============================================================================
export const TAU = Math.PI * 2;
export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export const lerp = (a, b, t) => a + (b - a) * t;
export const invLerp = (a, b, v) => (b === a ? 0 : (v - a) / (b - a));
export const smoothstep = (a, b, v) => { const t = clamp(invLerp(a, b, v), 0, 1); return t * t * (3 - 2 * t); };
export const approach = (v, target, delta) => (v < target ? Math.min(v + delta, target) : Math.max(v - delta, target));
export const damp = (a, b, lambda, dt) => lerp(a, b, 1 - Math.exp(-lambda * dt));
export const sign = (v) => (v < 0 ? -1 : 1);

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
/** Random helper object around a [0,1) generator. */
export function makeRand(gen = Math.random) {
  const r = () => gen();
  r.range = (a, b) => a + (b - a) * gen();
  r.int = (a, b) => Math.floor(a + (b - a + 1) * gen());
  r.pick = (arr) => arr[Math.floor(gen() * arr.length)];
  r.chance = (p) => gen() < p;
  r.sign = () => (gen() < 0.5 ? -1 : 1);
  r.weighted = (items, weightFn) => {
    let total = 0;
    for (const it of items) total += Math.max(0, weightFn(it));
    let x = gen() * total;
    for (const it of items) { x -= Math.max(0, weightFn(it)); if (x <= 0) return it; }
    return items[items.length - 1];
  };
  r.shuffle = (arr) => { for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(gen() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; } return arr; };
  return r;
}
export const rand = makeRand();

export const Ease = {
  linear: (t) => t,
  inQuad: (t) => t * t,
  outQuad: (t) => 1 - (1 - t) * (1 - t),
  inOutQuad: (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2),
  inCubic: (t) => t * t * t,
  outCubic: (t) => 1 - Math.pow(1 - t, 3),
  inOutCubic: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  outQuart: (t) => 1 - Math.pow(1 - t, 4),
  inOutSine: (t) => -(Math.cos(Math.PI * t) - 1) / 2,
  outSine: (t) => Math.sin((t * Math.PI) / 2),
  outBack: (t) => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); },
  inBack: (t) => { const c1 = 1.70158, c3 = c1 + 1; return c3 * t * t * t - c1 * t * t; },
  outElastic: (t) => { if (t === 0 || t === 1) return t; const c4 = TAU / 3; return Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1; },
  outBounce: (t) => {
    const n1 = 7.5625, d1 = 2.75;
    if (t < 1 / d1) return n1 * t * t;
    if (t < 2 / d1) return n1 * (t -= 1.5 / d1) * t + 0.75;
    if (t < 2.5 / d1) return n1 * (t -= 2.25 / d1) * t + 0.9375;
    return n1 * (t -= 2.625 / d1) * t + 0.984375;
  },
};

/** 1,234,567 */
export function fmt(n) {
  n = Math.floor(n);
  const s = Math.abs(n).toString();
  let out = '';
  for (let i = 0; i < s.length; i++) {
    if (i > 0 && (s.length - i) % 3 === 0) out += ',';
    out += s[i];
  }
  return n < 0 ? '-' + out : out;
}
export function fmtShort(n) {
  if (n >= 1e9) return (n / 1e9).toFixed(1).replace(/\.0$/, '') + 'B';
  if (n >= 1e6) return (n / 1e6).toFixed(1).replace(/\.0$/, '') + 'M';
  if (n >= 1e4) return (n / 1e3).toFixed(1).replace(/\.0$/, '') + 'K';
  return fmt(n);
}

export function hexToRgb(hex) {
  let h = hex.replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const n = parseInt(h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
const _rgbaCache = new Map();
export function rgba(hex, a = 1) {
  const key = hex + a;
  let v = _rgbaCache.get(key);
  if (!v) {
    const [r, g, b] = hexToRgb(hex);
    v = `rgba(${r},${g},${b},${a})`;
    if (_rgbaCache.size < 4000) _rgbaCache.set(key, v);
  }
  return v;
}
export function mixHex(a, b, t) {
  const A = hexToRgb(a), B = hexToRgb(b);
  const c = (i) => Math.round(A[i] + (B[i] - A[i]) * t).toString(16).padStart(2, '0');
  return '#' + c(0) + c(1) + c(2);
}

export function rectsOverlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}
export function circleRect(cx, cy, r, rc) {
  const nx = clamp(cx, rc.x, rc.x + rc.w);
  const ny = clamp(cy, rc.y, rc.y + rc.h);
  const dx = cx - nx, dy = cy - ny;
  return dx * dx + dy * dy <= r * r;
}

export function now() { return performance.now() / 1000; }

/** Vibrate wrapper (mobile). */
export function buzz(ms, enabled = true) {
  if (!enabled) return;
  try { if (navigator.vibrate) navigator.vibrate(ms); } catch (e) { /* ignore */ }
}
