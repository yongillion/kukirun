// =============================================================================
//  Obstacle kit — shared danger language for all lands (helper, not a module).
//  Danger = strong cocoa outline, saturated dark bodies, sharp pale tips,
//  split cel shading (lit left / dark right), crisp glints.
// =============================================================================
import {
  rng, tone, mix, rgba, OUTLINE, fill, stroke, clipTo, innerShade, innerLight, gloss, glint, glow,
  sparkle, poly, circle, ellipse, rrect, star, linearGrad, radialGrad, lerp, clamp, TAU, canvas, ctx2d,
  circles, unionPart, cel, shadeU, lightU, groundShadow, spikeShape, roundPoly, chunkPts,
} from './_env_kit.js';

export const OLW = 5.5;        // obstacle outline (art px)
export const DLW = 4.5;        // deco outline

// ---------------------------------------------------------------------------
// Spikes
// ---------------------------------------------------------------------------
/** Sharp cone from base centre (bx,by) along ang. p: {base, tip, dark, lw, outline, curve, edge} */
export function spikeG(g, bx, by, ang, len, w, p) {
  const sh = spikeShape(bx, by, ang, len, w, p.curve || 0);
  const ca = Math.cos(ang), sa = Math.sin(ang);
  const nx = -sa, ny = ca;
  const s = (nx * -1 + ny * -1) > 0 ? -1 : 1; // sign of the shaded side normal
  fill(g, sh, linearGrad(g, bx, by, bx + ca * len, by + sa * len, [[0, p.base], [0.5, mix(p.base, p.tip, 0.45)], [1, p.tip]]));
  clipTo(g, sh, () => {
    g.beginPath();
    g.moveTo(bx - ca * 6, by - sa * 6);
    g.lineTo(bx + ca * (len + 8), by + sa * (len + 8));
    g.lineTo(bx + ca * (len + 8) + s * nx * w, by + sa * (len + 8) + s * ny * w);
    g.lineTo(bx - ca * 6 + s * nx * w, by - sa * 6 + s * ny * w);
    g.closePath();
    g.fillStyle = p.dark || rgba('#2a1030', 0.35); g.fill();
    g.strokeStyle = p.edge || 'rgba(255,255,255,0.8)'; g.lineWidth = Math.max(1.6, w * 0.11); g.lineCap = 'round';
    g.beginPath();
    g.moveTo(bx - s * nx * w * 0.26 + ca * len * 0.1, by - s * ny * w * 0.26 + sa * len * 0.1);
    g.lineTo(bx + ca * len * 0.78 - s * nx * w * 0.05, by + sa * len * 0.78 - s * ny * w * 0.05);
    g.stroke();
  });
  stroke(g, sh, p.lw ?? OLW, p.outline || OUTLINE);
}
/** Ring of spikes around a centre. */
export function spikeRing(g, cx, cy, r, n, len, w, p, rot = 0, skip = null) {
  for (let i = 0; i < n; i++) {
    if (skip && skip(i)) continue;
    const a = rot + (i * TAU) / n;
    spikeG(g, cx + Math.cos(a) * r * 0.82, cy + Math.sin(a) * r * 0.82, a, len + r * 0.18, w, p);
  }
}
/** Spiked ball: spikes behind, glossy ball, small front studs. */
export function spikedBall(g, cx, cy, r, o) {
  spikeRing(g, cx, cy, r, o.n ?? 10, o.len ?? r * 0.7, o.w ?? r * 0.42, o.spike, o.rot ?? -Math.PI / 2);
  const b = circle(cx, cy, r);
  cel(g, b, { fill: o.ball, shade: o.ballD || tone(o.ball, -0.3), shadeDx: r * 0.3, shadeDy: r * 0.32, light: o.ballL || rgba('#ffffff', 0.35), lightDx: r * 0.14, lightDy: r * 0.14, lw: o.lw ?? OLW, outline: o.outline || OUTLINE });
  if (o.studs !== false) {
    // short spikes pointing out of the ball face (perspective studs)
    for (const [dx, dy, a] of [[-0.35, -0.2, -2.4], [0.3, 0.25, 0.7], [0.32, -0.35, -0.8], [-0.3, 0.4, 2.3]]) {
      spikeG(g, cx + dx * r * 0.6, cy + dy * r * 0.6, a, r * 0.42, r * 0.3, { ...o.spike, lw: (o.lw ?? OLW) * 0.8 });
    }
  }
  gloss(g, cx - r * 0.38, cy - r * 0.42, r * 0.3, r * 0.17, -0.7, 0.55);
  glint(g, cx - r * 0.45, cy - r * 0.38, r * 0.11, -0.7, 0.9);
}
/** Faceted shard (crystal / ice) — 3 facets, sharp tip. p: {light, base, dark, edge, lw, outline} */
export function shardG(g, bx, by, ang, len, w, p) {
  g.save(); g.translate(bx, by); g.rotate(ang + Math.PI / 2);
  const t = p.taper ?? 0.62;
  const pts = [[-w / 2, 8], [-w * 0.42, -len * t], [0, -len], [w * 0.46, -len * t * 0.94], [w / 2, 8]];
  const sh = poly(pts);
  fill(g, sh, p.base);
  clipTo(g, sh, () => {
    g.fillStyle = p.light; g.beginPath(); g.moveTo(-w / 2, 10); g.lineTo(-w * 0.42, -len * t); g.lineTo(0, -len); g.lineTo(-w * 0.08, -len * t * 0.7); g.lineTo(-w * 0.12, 10); g.closePath(); g.fill();
    g.fillStyle = p.dark; g.beginPath(); g.moveTo(w * 0.14, 10); g.lineTo(w * 0.1, -len * t * 0.72); g.lineTo(0, -len); g.lineTo(w * 0.46, -len * t * 0.94); g.lineTo(w / 2, 10); g.closePath(); g.fill();
    if (p.edge) { g.strokeStyle = p.edge; g.lineWidth = Math.max(1.5, w * 0.08); g.lineCap = 'round'; g.beginPath(); g.moveTo(-w * 0.36, -len * t * 0.4); g.lineTo(-w * 0.1, -len * 0.9); g.stroke(); }
  });
  stroke(g, sh, p.lw ?? OLW, p.outline || OUTLINE);
  if (p.glint !== false) { g.fillStyle = 'rgba(255,255,255,0.92)'; g.beginPath(); g.ellipse(-w * 0.24, -len * 0.52, w * 0.07, len * 0.1, 0.15, 0, TAU); g.fill(); }
  g.restore();
}

// ---------------------------------------------------------------------------
// Vertical tiles (period = tile height). Elements are drawn at y-h, y, y+h.
// ---------------------------------------------------------------------------
function wrapY(h, fn) { for (const dy of [-h, 0, h]) { fn(dy); } }
/** Iron/gold chain: alternating front ring / edge-on link, pitch h/4. */
export function chainTile(g, w, h, p) {
  const cx = w / 2, pitch = h / 4;
  const lw = p.lw ?? 4.5;
  const side = (y) => rrect(cx - 5.5, y - 24, 11, 48, 5.5);
  const ring = (y) => (c) => { c.moveTo(cx + 17, y); c.ellipse(cx, y, 17, 26, 0, 0, TAU); c.moveTo(cx + 8.5, y); c.ellipse(cx, y, 8.5, 16.5, 0, 0, TAU, true); };
  wrapY(h, (dy) => { for (let k = 0; k < 2; k++) { const y = pitch * (1.5 + 2 * k) + dy; cel(g, side(y), { fill: p.dark, shade: tone(p.dark, -0.25), shadeDx: 4, shadeDy: 0, light: rgba(p.light, 0.6), lightDx: 2, lightDy: 0, lw, outline: p.outline || OUTLINE }); } });
  wrapY(h, (dy) => {
    for (let k = 0; k < 2; k++) {
      const y = pitch * (0.5 + 2 * k) + dy;
      const sh = ring(y);
      fill(g, sh, p.base, 'evenodd');
      clipTo(g, (c) => { c.rect(cx, y - 30, 30, 60); }, () => { fill(g, sh, rgba(p.dark, 0.9), 'evenodd'); });
      stroke(g, sh, lw, p.outline || OUTLINE);
      g.strokeStyle = rgba(p.light, 0.95); g.lineWidth = 3; g.lineCap = 'round';
      g.beginPath(); g.ellipse(cx, y, 12.8, 21.2, 0, Math.PI * 1.08, Math.PI * 1.42); g.stroke();
    }
  });
}
/** Twisted rope, strand pitch divides h. */
export function ropeTile(g, w, h, p) {
  const cx = w / 2, rw = p.width ?? 20;
  const body = (c) => c.rect(cx - rw / 2, -10, rw, h + 20);
  fill(g, body, p.base);
  clipTo(g, body, () => {
    const pitch = h / 8;
    for (let k = -1; k <= 9; k++) {
      const y = k * pitch;
      g.fillStyle = p.dark; g.beginPath(); g.moveTo(cx - rw / 2 - 2, y); g.quadraticCurveTo(cx, y + pitch * 0.2, cx + rw / 2 + 2, y + pitch * 0.62); g.lineTo(cx + rw / 2 + 2, y + pitch * 0.92); g.quadraticCurveTo(cx, y + pitch * 0.5, cx - rw / 2 - 2, y + pitch * 0.34); g.closePath(); g.fill();
      g.strokeStyle = rgba(p.light, 0.8); g.lineWidth = 2; g.beginPath(); g.moveTo(cx - rw / 2 + 2, y + pitch * 0.42); g.quadraticCurveTo(cx - 2, y + pitch * 0.62, cx + rw * 0.2, y + pitch * 0.86); g.stroke();
    }
    g.fillStyle = rgba('#000000', 0.12); g.fillRect(cx + rw * 0.18, -10, rw, h + 20);
  });
  g.strokeStyle = p.outline || OUTLINE; g.lineWidth = p.lw ?? OLW;
  g.beginPath(); g.moveTo(cx - rw / 2, -10); g.lineTo(cx - rw / 2, h + 10); g.moveTo(cx + rw / 2, -10); g.lineTo(cx + rw / 2, h + 10); g.stroke();
}
/** Two intertwined vine strands with leaves. */
export function vineTile(g, w, h, p) {
  const cx = w / 2, A = p.amp ?? 9;
  const lw = p.lw ?? OLW;
  const strand = (ph, col, dark) => {
    const xs = (y) => cx + A * Math.sin((TAU * y) / h + ph);
    const sh = (c) => {
      c.moveTo(xs(-10) - 6, -10);
      for (let y = -10; y <= h + 10; y += 4) c.lineTo(xs(y) - 6, y);
      for (let y = h + 10; y >= -10; y -= 4) c.lineTo(xs(y) + 6, y);
      c.closePath();
    };
    fill(g, sh, col);
    clipTo(g, sh, () => { g.fillStyle = dark; for (let y = -10; y <= h + 10; y += 4) g.fillRect(xs(y) + 1.5, y, 6, 4.5); });
    g.strokeStyle = p.outline || OUTLINE; g.lineWidth = lw * 0.85; g.lineCap = 'round';
    g.beginPath(); for (let y = -10; y <= h + 10; y += 4) { if (y === -10) g.moveTo(xs(y) - 6, y); else g.lineTo(xs(y) - 6, y); } g.stroke();
    g.beginPath(); for (let y = -10; y <= h + 10; y += 4) { if (y === -10) g.moveTo(xs(y) + 6, y); else g.lineTo(xs(y) + 6, y); } g.stroke();
  };
  strand(Math.PI, p.dark2 || tone(p.base, -0.15), tone(p.base, -0.35));
  strand(0, p.base, tone(p.base, -0.22));
  // leaves (2 per tile), wrapped
  const leaf = (x, y, dir) => (c) => { c.moveTo(x, y); c.quadraticCurveTo(x + dir * 14, y - 16, x + dir * 28, y - 6); c.quadraticCurveTo(x + dir * 14, y + 6, x, y); c.closePath(); };
  wrapY(h, (dy) => {
    for (const [yy, dir] of [[h * 0.25, 1], [h * 0.75, -1]]) {
      const y = yy + dy, x = cx + A * Math.sin((TAU * yy) / h) + dir * 4;
      cel(g, leaf(x, y, dir), { fill: p.leaf || '#7ad36f', shade: tone(p.leaf || '#7ad36f', -0.25), shadeDx: 4, shadeDy: 4, light: rgba('#e8ffc8', 0.6), lightDx: 2, lightDy: 2, lw: lw * 0.8, outline: p.outline || OUTLINE });
      if (p.thorns) spikeG(g, cx - dir * (A + 4), y + 12, dir < 0 ? 0.3 : Math.PI - 0.3, 14, 8, { ...p.thorns, lw: lw * 0.7 });
    }
  });
}

// ---------------------------------------------------------------------------
// Beam (horizontal tile, period = w). drawBar(g, w, barH) paints the bar body
// in [-pad, w+pad]; spikes hang below with a pitch that divides w.
// ---------------------------------------------------------------------------
export function beamTile(g, w, h, o) {
  const barH = o.barH ?? 96;
  const pitch = w / (o.n ?? 8);
  // spikes first (behind the bar's lower edge)
  for (const dx of [-w, 0, w]) {
    for (let i = 0; i < (o.n ?? 8); i++) {
      const x = dx + pitch * (i + 0.5);
      if (x < -pitch || x > w + pitch) continue;
      const long = i % 2 === 0;
      const len = (long ? h - barH + 14 : (h - barH) * 0.62 + 10) - 4;
      spikeG(g, x, barH - 10, Math.PI / 2, len, long ? pitch * 0.9 : pitch * 0.7, o.spike);
    }
  }
  o.drawBar(g, w, barH);
}

// ---------------------------------------------------------------------------
// Signpost: two posts + board. Returns the board rect (art px).
// ---------------------------------------------------------------------------
export function signPost(g, w, h, o) {
  const lw = o.lw ?? DLW, oc = o.outline || OUTLINE;
  const bx = 18, by = 22, bw = w - 36, bh = 126;
  groundShadow(g, w / 2, h - 6, w * 0.42, 12, 0.25);
  for (const px of [w * 0.28, w * 0.72]) {
    const post = rrect(px - 10, by + bh - 20, 20, h - (by + bh) + 14, 7);
    cel(g, post, { fill: o.post, shade: tone(o.post, -0.25), shadeDx: 7, shadeDy: 0, light: rgba('#ffffff', 0.3), lightDx: 3, lightDy: 0, lw, outline: oc });
    if (o.postDeco) o.postDeco(g, px, by + bh, h);
  }
  const board = rrect(bx, by, bw, bh, o.boardR ?? 22);
  cel(g, board, { fill: o.frame, shade: tone(o.frame, -0.22), shadeDx: 8, shadeDy: 8, light: rgba('#ffffff', 0.45), lightDx: 4, lightDy: 4, lw, outline: oc });
  const inner = rrect(bx + 14, by + 14, bw - 28, bh - 28, (o.boardR ?? 22) - 8);
  cel(g, inner, { fill: o.board, shade: tone(o.board, -0.1), shadeDx: 6, shadeDy: 6, lw: lw * 0.8, outline: oc });
  if (o.boardDeco) o.boardDeco(g, bx, by, bw, bh);
  if (o.base) o.base(g, w, h);
  return { x: bx + 16, y: by + 16, w: bw - 32, h: bh - 32 };
}

// ---------------------------------------------------------------------------
// Candy spring pad (obs_common)
// ---------------------------------------------------------------------------
export function springPad(g, w, h, compressed) {
  const cx = w / 2, base = h - 4;
  const lw = OLW;
  groundShadow(g, cx, base, w * 0.42, 9, 0.28);
  // cookie base
  const b = rrect(cx - 66, base - 18, 132, 20, 10);
  cel(g, b, { fill: '#d99a55', shade: '#b0743a', shadeDx: 0, shadeDy: 6, light: rgba('#ffe0b0', 0.8), lightDx: 0, lightDy: 3, lw, outline: OUTLINE });
  for (const [x, y] of [[-40, -9], [-10, -11], [24, -8], [46, -10]]) fill(g, ellipse(cx + x, base + y, 4, 2.6), '#7a4a2a');
  // coil (striped candy spring)
  const top = compressed ? base - 34 : base - 58;
  const coils = compressed ? 3 : 4;
  const span = (base - 18) - (top + 6);
  for (let i = coils - 1; i >= 0; i--) {
    const y = top + 6 + span * ((i + 0.5) / coils);
    const ring = (c) => { c.moveTo(cx + 44, y); c.ellipse(cx, y, 44, compressed ? 6 : 9, 0, 0, TAU); };
    g.save(); g.lineCap = 'round';
    g.strokeStyle = OUTLINE; g.lineWidth = 15; g.beginPath(); g.ellipse(cx, y, 44, compressed ? 6 : 9, 0, 0, TAU); g.stroke();
    g.strokeStyle = i % 2 ? '#ffffff' : '#ff5f8f'; g.lineWidth = 7.5; g.beginPath(); g.ellipse(cx, y, 44, compressed ? 6 : 9, 0, 0, TAU); g.stroke();
    g.strokeStyle = 'rgba(255,255,255,0.7)'; g.lineWidth = 2.2; g.beginPath(); g.ellipse(cx, y - 1.5, 44, compressed ? 6 : 9, 0, Math.PI * 1.1, Math.PI * 1.45); g.stroke();
    g.restore();
  }
  // gummy cushion
  const cw = compressed ? 76 : 68, ch = compressed ? 22 : 28;
  const cush = (c) => { c.moveTo(cx - cw, top + ch * 0.55); c.bezierCurveTo(cx - cw, top - ch * 0.55, cx + cw, top - ch * 0.55, cx + cw, top + ch * 0.55); c.quadraticCurveTo(cx, top + ch * 0.95, cx - cw, top + ch * 0.55); c.closePath(); };
  cel(g, cush, { fill: '#ff7eb6', shade: '#e0508f', shadeDx: 10, shadeDy: 8, light: rgba('#ffd0e6', 0.9), lightDx: 6, lightDy: 5, lw, outline: OUTLINE });
  gloss(g, cx - cw * 0.4, top - ch * 0.05, cw * 0.32, ch * 0.18, -0.15, 0.7);
  glint(g, cx - cw * 0.62, top + ch * 0.05, 4, -0.4, 0.9);
  // sugar dots
  for (const [x, y] of [[-30, 2], [8, -4], [36, 4], [-6, 8]]) fill(g, circle(cx + x, top + y, 2.6), 'rgba(255,255,255,0.85)');
  if (compressed) { // squash puffs
    for (const s of [-1, 1]) sparkle(g, cx + s * (cw + 10), top + 4, 7, '#ffffff', 0.9);
  }
}

/** Little helpers for decos. */
export function tuftBase(g, x, y, w, col, oc, lw = DLW) {
  const sh = (c) => {
    c.moveTo(x - w / 2, y + 2);
    const n = Math.max(3, Math.round(w / 14));
    for (let i = 0; i < n; i++) {
      const x0 = x - w / 2 + (w * i) / n, x1 = x - w / 2 + (w * (i + 1)) / n;
      c.quadraticCurveTo(x0 + (x1 - x0) * 0.2, y - 10, (x0 + x1) / 2 + 2, y - 15 - (i % 2) * 5);
      c.quadraticCurveTo(x1 - (x1 - x0) * 0.2, y - 6, x1, y + 2);
    }
    c.closePath();
  };
  cel(g, sh, { fill: col, shade: tone(col, -0.22), shadeDx: 4, shadeDy: 2, light: rgba('#ffffff', 0.35), lightDx: 2, lightDy: 3, lw, outline: oc });
}
