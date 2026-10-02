// Small geometry utilities for environment art (helper, not an export module).

/** Open Catmull-Rom spline through pts, sampled `seg` points per span. */
export function catmull(pts, seg = 10) {
  const out = [];
  const n = pts.length;
  const P = (i) => pts[Math.max(0, Math.min(n - 1, i))];
  for (let i = 0; i < n - 1; i++) {
    const p0 = P(i - 1), p1 = P(i), p2 = P(i + 1), p3 = P(i + 2);
    for (let s = 0; s < seg; s++) {
      const t = s / seg, t2 = t * t, t3 = t2 * t;
      const f = (k) => 0.5 * ((2 * p1[k]) + (-p0[k] + p2[k]) * t + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * t2 + (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * t3);
      out.push([f(0), f(1)]);
    }
  }
  out.push(P(n - 1));
  return out;
}
/** Closed Catmull-Rom spline sampled. */
export function catmullClosed(pts, seg = 8) {
  const out = [];
  const n = pts.length;
  const P = (i) => pts[((i % n) + n) % n];
  for (let i = 0; i < n; i++) {
    const p0 = P(i - 1), p1 = P(i), p2 = P(i + 1), p3 = P(i + 2);
    for (let s = 0; s < seg; s++) {
      const t = s / seg, t2 = t * t, t3 = t2 * t;
      const f = (k) => 0.5 * ((2 * p1[k]) + (-p0[k] + p2[k]) * t + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * t2 + (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * t3);
      out.push([f(0), f(1)]);
    }
  }
  return out;
}
/** y(x) lookup on an x-sorted polyline (clamped). */
export function ySampler(pts) {
  return (x) => {
    if (x <= pts[0][0]) return pts[0][1];
    for (let i = 1; i < pts.length; i++) {
      if (x <= pts[i][0]) {
        const a = pts[i - 1], b = pts[i];
        const t = (x - a[0]) / Math.max(1e-6, b[0] - a[0]);
        return a[1] + (b[1] - a[1]) * t;
      }
    }
    return pts[pts.length - 1][1];
  };
}
/** Bell-shaped hill crest points. flat 0..1 widens the rounded top. */
export function humpPts(x, top, rx, ry, flat = 0.5) {
  const k = 0.1 + 0.16 * (1 - flat);
  return catmull([
    [x - rx, top + ry * 2.3], [x - rx * 0.74, top + ry * 0.9], [x - rx * 0.42, top + ry * k], [x, top],
    [x + rx * 0.42, top + ry * k], [x + rx * 0.74, top + ry * 0.9], [x + rx, top + ry * 2.3],
  ], 12);
}
/** Periodic (in x, period W) blue-noise-ish scatter. */
export function scatter(R, W, n, yLo, yHi, minD, tries = 40) {
  const out = [];
  for (let i = 0; i < n; i++) {
    let best = null;
    for (let t = 0; t < tries; t++) {
      const x = R() * W, y = yLo + R() * (yHi - yLo);
      let ok = true;
      for (const [px, py] of out) {
        let dx = Math.abs(px - x); dx = Math.min(dx, W - dx);
        if (dx * dx + (py - y) * (py - y) < minD * minD) { ok = false; break; }
      }
      if (ok) { best = [x, y]; break; }
    }
    if (best) out.push(best);
  }
  return out;
}
export function memo(fn) { let v = null; return (...a) => (v ??= fn(...a)); }
