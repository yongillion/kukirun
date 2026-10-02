// =============================================================================
//  Dessert Dash — title logo (helper for ui.js). 1600 x 760 art px.
//  "DESSERT" (strawberry-pink letters with dripping vanilla icing + sprinkles)
//  over "DASH" (glossy peach->orange, slanted for speed, motion streaks),
//  a mint ribbon "디저트 대시", and a few small sweets. Original design.
// =============================================================================
import { OUTLINE, TAU, rng, mix, rgba, tone, canvas, ctx2d, silhouette, fill, stroke, clipTo, circle, ellipse, rrect, poly, glint, gloss, linearGrad } from '../lib.js';
import { place, puffyStar, drawStarCandy, drawSwirlDisc, PAL, roundPoly, candyBody, shadeIn, lightIn } from './_ui_kit.js';

const FONT = 'DDDisplay';
const SPRINKLES = ['#ff5f8f', '#ffd23a', '#47b8ff', '#5fdc7a', '#a77bff', '#ff9a3c', '#ffffff'];

function tinted(src, color) { return silhouette(src, color); }

/** Shift-minus crescent on an offscreen letter canvas (source-atop onto it). */
function canvasCrescent(target, color, sx, sy, alpha = 1) {
  const w = target.width, h = target.height;
  const t = canvas(w, h), g = ctx2d(t);
  g.drawImage(tinted(target, color), 0, 0);
  g.globalCompositeOperation = 'destination-out';
  g.drawImage(target, sx, sy);
  const tg = ctx2d(target);
  tg.save(); tg.globalCompositeOperation = 'source-atop'; tg.globalAlpha = alpha; tg.drawImage(t, 0, 0); tg.restore();
}

/** Find a point well inside the letter near its top-left (for the glint). */
function insidePoint(cv, r, minY = 0) {
  const g = ctx2d(cv);
  const { data, width, height } = g.getImageData(0, 0, cv.width, cv.height);
  const A = (x, y) => (x < 0 || y < 0 || x >= width || y >= height) ? 0 : data[(Math.round(y) * width + Math.round(x)) * 4 + 3];
  for (let s = 0; s < width + height; s += 3) {
    for (let x = 0; x <= s; x += 3) {
      const y = minY + (s - x) * 0.8;
      if (y < 0 || y >= height) continue;
      let ok = A(x, y) > 250;
      for (let k = 0; ok && k < 8; k++) { const a = (k / 8) * TAU; if (A(x + Math.cos(a) * r, y + Math.sin(a) * r) < 250) ok = false; }
      if (ok) return [x, y];
    }
  }
  return null;
}

/**
 * Render one chunky candy letter into layers (each S x S, letter centred).
 * Returns { S, out, rim, body } canvases (out = outline silhouette, rim = white rim).
 */
function renderLetter(ch, size, o) {
  const S = Math.ceil(size * 1.5);
  const capH = size * 0.735;
  const cx = S / 2, base = S / 2 + capH / 2;
  const top = base - capH;
  const inflate = o.inflate, rimW = o.rim, outW = o.outline;
  const glyph = (g, lw, style) => {
    g.font = `900 ${size}px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'alphabetic';
    g.lineJoin = 'round'; g.lineCap = 'round'; g.miterLimit = 2;
    if (lw > 0) { g.lineWidth = lw; g.strokeStyle = style; g.strokeText(ch, cx, base); }
    g.fillStyle = style; g.fillText(ch, cx, base);
  };
  const mk = (lw, style) => { const cv = canvas(S, S); glyph(ctx2d(cv), lw, style); return cv; };
  const out = mk((inflate + rimW + outW) * 2, OUTLINE);
  const rim = mk((inflate + rimW) * 2, o.rimColor ?? '#fffaf4');
  // body with vertical gradient
  const body = canvas(S, S), g = ctx2d(body);
  const grad = g.createLinearGradient(0, top - inflate, 0, base + inflate);
  for (const [t, col] of o.grad) grad.addColorStop(t, col);
  glyph(g, inflate * 2, grad);
  // clean cel shade along the bottom-right edges
  canvasCrescent(body, o.shade, -size * 0.02, -size * 0.028, 0.9);
  canvasCrescent(body, o.deep, -size * 0.007, -size * 0.01, 0.75);
  const atop = (fn) => { g.save(); g.globalCompositeOperation = 'source-atop'; fn(); g.restore(); };
  let glintMinY = 0;
  // vanilla icing with drips + sprinkles (own layer, masked by the letter)
  if (o.icing) {
    const r = rng(o.seed);
    const yb = top + capH * (0.255 + r() * 0.045);
    glintMinY = yb + size * 0.05;
    const I = canvas(S, S), ig = ctx2d(I);
    ig.fillStyle = '#000';
    ig.beginPath();
    ig.moveTo(-10, -10); ig.lineTo(S + 10, -10); ig.lineTo(S + 10, yb);
    const segs = 9, step = (S + 20) / segs;
    let x = S + 10;
    for (let k = 0; k < segs; k++) { const nx = x - step; ig.quadraticCurveTo((x + nx) / 2, yb + (k % 2 ? -size * 0.018 : size * 0.026), nx, yb); x = nx; }
    ig.closePath(); ig.fill();
    const nd = 1 + (r() < 0.6 ? 1 : 0);
    for (let k = 0; k < nd; k++) {
      const dx = cx + (nd === 1 ? (r() - 0.5) * size * 0.3 : (k - 0.5) * size * 0.34 + (r() - 0.5) * size * 0.08);
      const len = size * (0.06 + r() * 0.12), w = size * (0.062 + r() * 0.02);
      ig.beginPath();
      ig.moveTo(dx - w - size * 0.03, yb - 2);
      ig.quadraticCurveTo(dx - w, yb, dx - w * 0.8, yb + len * 0.5);
      ig.lineTo(dx - w * 0.8, yb + len);
      ig.arc(dx, yb + len, w * 0.8 + 0.01, Math.PI, 0, true);
      ig.lineTo(dx + w * 0.8, yb + len * 0.5);
      ig.quadraticCurveTo(dx + w, yb, dx + w + size * 0.03, yb - 2);
      ig.closePath(); ig.fill();
    }
    // keep only inside the letter body
    ig.globalCompositeOperation = 'destination-in'; ig.drawImage(body, 0, 0);
    ig.globalCompositeOperation = 'source-over';
    // colour the icing
    const ic = canvas(S, S), icg = ctx2d(ic);
    icg.drawImage(I, 0, 0);
    icg.globalCompositeOperation = 'source-in';
    icg.fillStyle = linearGrad(icg, 0, top - inflate, 0, yb + size * 0.2, [[0, '#ffffff'], [0.55, '#fffaf2'], [1, '#fff0e2']]);
    icg.fillRect(0, 0, S, S);
    icg.globalCompositeOperation = 'source-over';
    canvasCrescent(ic, '#f6cfe0', 0, -size * 0.02, 0.95);        // soft pink shade at the drip edge
    canvasCrescent(ic, '#ffffff', size * 0.012, size * 0.012, 0.8); // bright top-left rim
    // sprinkles on the icing
    const sr = rng(o.seed * 7 + 3);
    const sg = ctx2d(ic); sg.save(); sg.globalCompositeOperation = 'source-atop';
    for (let k = 0; k < 7; k++) {
      const sx = cx + (sr() - 0.5) * size * 0.74, sy = top - inflate * 0.2 + sr() * (yb - top - size * 0.04);
      sg.save(); sg.translate(sx, sy); sg.rotate(sr() * TAU);
      const L = size * 0.06, Wd = size * 0.023;
      sg.fillStyle = SPRINKLES[(k + o.seed) % 6];
      sg.beginPath(); sg.roundRect(-L / 2, -Wd / 2, L, Wd, Wd / 2); sg.fill();
      sg.fillStyle = 'rgba(255,255,255,0.55)'; sg.beginPath(); sg.roundRect(-L / 2 + 1.5, -Wd / 2 + 0.8, L * 0.45, Wd * 0.32, Wd * 0.16); sg.fill();
      sg.restore();
    }
    sg.restore();
    // drip glints
    // icing shadow on the pink body, then the icing itself
    atop(() => { g.globalAlpha = 0.55; g.drawImage(tinted(I, o.deep), size * 0.008, size * 0.022); });
    g.drawImage(ic, 0, 0);
  }
  // glossy highlight band (candy glaze)
  atop(() => {
    const y0 = o.icing ? glintMinY : top + capH * 0.05, y1 = o.icing ? glintMinY + capH * 0.2 : top + capH * 0.36;
    const gb = g.createLinearGradient(0, y0, 0, y1);
    gb.addColorStop(0, 'rgba(255,255,255,0)'); gb.addColorStop(0.4, `rgba(255,255,255,${o.icing ? 0.32 : 0.55})`); gb.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gb;
    g.beginPath(); g.ellipse(cx - size * 0.06, (y0 + y1) / 2, size * 0.48, (y1 - y0) / 2, -0.04, 0, TAU); g.fill();
  });
  // crisp glint
  const p = insidePoint(body, size * 0.05, glintMinY);
  if (p) glint(g, p[0] + size * 0.01, p[1] + size * 0.006, size * 0.036, -0.75, 0.97);
  return { S, out, rim, body };
}

/** Lay out a word: returns per-letter placement. */
function layoutWord(c, word, size, cx, baseY, tracking, jit, seed, skew = 0) {
  c.save(); c.font = `900 ${size}px ${FONT}`;
  const widths = [...word].map((ch) => c.measureText(ch).width);
  c.restore();
  const total = widths.reduce((a, b) => a + b, 0) + tracking * (word.length - 1);
  let x = cx - total / 2;
  const r = rng(seed);
  const capH = size * 0.735;
  return [...word].map((ch, i) => {
    const lx = x + widths[i] / 2;
    x += widths[i] + tracking;
    const rot = (r() - 0.5) * 2 * jit.rot + (jit.rotBias ? jit.rotBias(i) : 0);
    const dy = (r() - 0.5) * 2 * jit.dy + (jit.wave ? jit.wave(i) : 0);
    return { ch, x: lx, y: baseY - capH / 2 + dy, rot, skew };
  });
}

function drawWord(c, W, H, letters, size, style, seedBase) {
  const layers = letters.map((L, i) => ({ L, R: renderLetter(L.ch, size, { ...style, seed: seedBase + i * 13 }) }));
  const put = (g, L, cv, S, dx = 0, dy = 0) => {
    g.save(); g.translate(L.x + dx, L.y + dy); if (L.skew) g.transform(1, 0, L.skew, 1, 0, 0); g.rotate(L.rot); g.drawImage(cv, -S / 2, -S / 2); g.restore();
  };
  // word-level silhouette for shadow + extrusion
  const word = canvas(W, H), wg = ctx2d(word);
  for (const { L, R } of layers) put(wg, L, R.out, R.S);
  // soft drop shadow
  c.save(); c.filter = 'blur(10px)'; c.globalAlpha = 0.38; c.drawImage(tinted(word, '#3a1a2a'), 0, style.extrude + 16); c.restore();
  // chunky extrusion
  const ext = tinted(word, style.extrudeColor ?? '#341a0f');
  for (let d = style.extrude; d > 0; d -= 2) c.drawImage(ext, 0, d);
  c.drawImage(tinted(word, OUTLINE), 0, 0);
  // letters back-to-front (left to right): outline, rim, body
  for (const { L, R } of layers) {
    put(c, L, R.out, R.S);
    put(c, L, R.rim, R.S);
    put(c, L, R.body, R.S);
  }
}

// ------------------------------------------------------------ decorations
function speedStreak(c, x0, x1, y, w) {
  c.save(); c.lineCap = 'round';
  c.beginPath(); c.moveTo(x0, y); c.lineTo(x1, y); c.lineWidth = w + 14; c.strokeStyle = OUTLINE; c.stroke();
  const g = c.createLinearGradient(x0, 0, x1, 0); g.addColorStop(0, '#ffe9a8'); g.addColorStop(1, '#ffffff');
  c.beginPath(); c.moveTo(x0, y); c.lineTo(x1, y); c.lineWidth = w; c.strokeStyle = g; c.stroke();
  c.restore();
}

function lollipop(c, x, y, s, rot) {
  c.save(); c.translate(x, y); c.rotate(rot); c.scale(s, s);
  const stick = rrect(-6, 30, 12, 92, 6);
  fill(c, stick, '#fffaf2'); shadeIn(c, stick, '#d8cfe8', 4, 0); stroke(c, stick, 7 / s * 0 + 7, OUTLINE);
  place(c, 0, 0, 1, () => drawSwirlDisc(c, 7, 46, { colors: ['#ff5f8f', '#ffffff', '#ffd23a', '#ffffff', '#47b8ff', '#ffffff'], twist: 3.2 }));
  c.restore();
}

function wrappedCandy(c, x, y, s, rot) {
  c.save(); c.translate(x, y); c.rotate(rot); c.scale(s, s);
  const lw = 7;
  for (const side of [-1, 1]) {
    const tw = roundPoly([[side * 26, -8], [side * 62, -30], [side * 56, 0], [side * 62, 30], [side * 26, 8]], [0.2, 0.2, 0.3, 0.2, 0.2]);
    fill(c, tw, '#ffd23a'); shadeIn(c, tw, '#e89a1a', 4 * side, 5); lightIn(c, tw, '#fff6c0', 3, 3);
    c.save(); clipTo(c, tw, () => { c.strokeStyle = rgba('#e08a10', 0.8); c.lineWidth = 3; for (const yy of [-14, 0, 14]) { c.beginPath(); c.moveTo(side * 30, yy * 0.4); c.lineTo(side * 60, yy); c.stroke(); } }); c.restore();
    stroke(c, tw, lw, OUTLINE);
  }
  const bodyS = ellipse(0, 0, 34, 28);
  candyBody(c, bodyS, { base: '#ff5f8f', top: '#ffa6c6', bot: '#f2457c', shade: '#c9306a', deep: '#a52458', light: '#ffd0e0' }, 30, lw, {
    caustic: false, gx: -0.5, gy: -0.45, gs: 0.2,
    inner: () => clipTo(c, bodyS, () => { c.fillStyle = 'rgba(255,255,255,0.85)'; for (const xx of [-16, 2, 20]) { c.beginPath(); c.ellipse(xx, 2, 4.5, 30, 0.5, 0, TAU); c.fill(); } }),
  });
  c.restore();
}

function cherry(c, x, y, s) {
  c.save(); c.translate(x, y); c.scale(s, s);
  c.lineCap = 'round';
  c.beginPath(); c.moveTo(0, -18); c.quadraticCurveTo(6, -44, 22, -56); c.lineWidth = 14; c.strokeStyle = OUTLINE; c.stroke();
  c.beginPath(); c.moveTo(0, -18); c.quadraticCurveTo(6, -44, 22, -56); c.lineWidth = 6; c.strokeStyle = '#6fbf4a'; c.stroke();
  const leaf = (cc) => { cc.moveTo(20, -54); cc.quadraticCurveTo(36, -72, 54, -60); cc.quadraticCurveTo(38, -46, 20, -54); cc.closePath(); };
  fill(c, leaf, '#7ad65a'); shadeIn(c, leaf, '#46a83c', 3, 4); stroke(c, leaf, 6, OUTLINE);
  const b = circle(0, 0, 24);
  candyBody(c, b, { base: '#ff3d5a', top: '#ff8a9a', bot: '#e8304e', shade: '#b81f40', deep: '#8f1533', light: '#ffc0c8' }, 24, 7, { caustic: false, gs: 0.2 });
  c.restore();
}

function twinkle(c, x, y, r, rot = 0) {
  c.save(); c.translate(x, y); c.rotate(rot);
  const sh = (cc) => { cc.moveTo(0, -r); cc.quadraticCurveTo(r * 0.16, -r * 0.16, r, 0); cc.quadraticCurveTo(r * 0.16, r * 0.16, 0, r); cc.quadraticCurveTo(-r * 0.16, r * 0.16, -r, 0); cc.quadraticCurveTo(-r * 0.16, -r * 0.16, 0, -r); cc.closePath(); };
  c.lineJoin = 'round';
  c.beginPath(); sh(c); c.lineWidth = 8; c.strokeStyle = OUTLINE; c.stroke();
  c.beginPath(); sh(c); c.fillStyle = '#fffbe8'; c.fill();
  c.restore();
}

function looseSprinkle(c, x, y, rot, col) {
  c.save(); c.translate(x, y); c.rotate(rot);
  const sh = rrect(-13, -5, 26, 10, 5);
  fill(c, sh, col); stroke(c, sh, 5, OUTLINE);
  c.fillStyle = 'rgba(255,255,255,0.65)'; c.beginPath(); c.roundRect(-9, -3.5, 10, 3, 1.5); c.fill();
  c.restore();
}

// ----------------------------------------------------------------- ribbon
function ribbon(c, cx, cy, halfW, thick, sag, text) {
  const yAt = (x) => cy - sag * Math.pow((x - cx) / halfW, 2);
  const slope = (x) => (-2 * sag * (x - cx)) / (halfW * halfW);
  const N = 40;
  const band = (cc) => {
    for (let i = 0; i <= N; i++) { const x = cx - halfW + (2 * halfW * i) / N; const y = yAt(x) - thick / 2; i ? cc.lineTo(x, y) : cc.moveTo(x, y); }
    for (let i = N; i >= 0; i--) { const x = cx - halfW + (2 * halfW * i) / N; cc.lineTo(x, yAt(x) + thick / 2); }
    cc.closePath();
  };
  const tails = [];
  for (const s of [-1, 1]) {
    const ex = cx + s * halfW, ey = yAt(ex);
    const tx = ex + s * 120, ty = ey + 34;
    const tail = poly([[ex - s * 40, ey - thick / 2 + 26], [tx, ty - thick / 2 + 10], [tx - s * 34, ty + 6], [tx, ty + thick / 2 + 4], [ex - s * 40, ey + thick / 2 + 26]]);
    const fold = poly([[ex - s * 2, ey + thick / 2 - 2], [ex - s * 40, ey + thick / 2 + 26], [ex - s * 40, ey + thick / 2 - 4]]);
    tails.push({ tail, fold, s });
  }
  // shadow
  c.save(); c.filter = 'blur(8px)'; c.globalAlpha = 0.3; c.translate(0, 16); c.fillStyle = '#2a1430';
  c.beginPath(); band(c); for (const t of tails) t.tail(c); c.fill(); c.restore();
  const MINT = { base: '#38cdb4', top: '#8ff3dd', bot: '#2bbaa3', shade: '#1f9686', deep: '#177366', light: '#d0fff4' };
  for (const { tail, fold, s } of tails) {
    fill(c, tail, linearGrad(c, 0, cy - thick, 0, cy + thick, [[0, '#2fb6a2'], [1, '#1d8f80']]));
    shadeIn(c, tail, '#167063', 6 * s, 6);
    stroke(c, tail, 12, OUTLINE);
    fill(c, fold, '#125d53'); stroke(c, fold, 10, OUTLINE);
  }
  fill(c, band, linearGrad(c, 0, cy - thick / 2 - sag, 0, cy + thick / 2, [[0, MINT.top], [0.45, MINT.base], [1, MINT.bot]]));
  shadeIn(c, band, MINT.shade, 0, 12);
  lightIn(c, band, '#ffffff', 0, 9, 0.55);
  // stitched edges
  c.save(); c.setLineDash([16, 12]); c.lineWidth = 4; c.strokeStyle = 'rgba(255,255,255,0.75)'; c.lineCap = 'round';
  for (const off of [-thick / 2 + 13, thick / 2 - 13]) { c.beginPath(); for (let i = 0; i <= N; i++) { const x = cx - halfW + 24 + ((2 * halfW - 48) * i) / N; const y = yAt(x) + off; i ? c.lineTo(x, y) : c.moveTo(x, y); } c.stroke(); }
  c.restore();
  stroke(c, band, 12, OUTLINE);
  // text along the curve
  const size = 82;
  c.save();
  c.font = `900 ${size}px ${FONT}`; c.textAlign = 'center'; c.textBaseline = 'middle';
  const chars = [...text];
  const gap = 6;
  const widths = chars.map((ch) => (ch === ' ' ? size * 0.32 : c.measureText(ch).width));
  const total = widths.reduce((a, b) => a + b, 0) + gap * (chars.length - 1);
  let x = cx - total / 2;
  const glyphs = chars.map((ch, i) => { const gx = x + widths[i] / 2; x += widths[i] + gap; return { ch, x: gx, y: yAt(gx) + 3, a: Math.atan(slope(gx)) }; });
  c.lineJoin = 'round';
  for (const pass of ['shadow', 'out', 'fill']) {
    for (const G of glyphs) {
      if (G.ch === ' ') continue;
      c.save(); c.translate(G.x, G.y); c.rotate(G.a);
      if (pass === 'shadow') { c.fillStyle = '#177366'; c.strokeStyle = '#177366'; c.lineWidth = 14; c.strokeText(G.ch, 0, 7); c.fillText(G.ch, 0, 7); }
      if (pass === 'out') { c.strokeStyle = OUTLINE; c.lineWidth = 14; c.strokeText(G.ch, 0, 0); }
      if (pass === 'fill') {
        const gg = c.createLinearGradient(0, -size * 0.4, 0, size * 0.4); gg.addColorStop(0, '#ffffff'); gg.addColorStop(0.62, '#ffffff'); gg.addColorStop(1, '#ffeef6');
        c.fillStyle = gg; c.fillText(G.ch, 0, 0);
      }
      c.restore();
    }
  }
  c.restore();
}

// ---------------------------------------------------------------- the logo
export function drawLogo(c, W, H) {
  const cx = W / 2;
  // fit the whole composition inside a >= 30 px transparent margin
  c.save();
  c.translate(W / 2 + 16, H / 2 + 2); c.scale(0.92, 0.92); c.translate(-W / 2, -H / 2);
  // DASH (behind) — big, slanted, peach -> orange
  const dashSize = 330;
  const dash = layoutWord(c, 'DASH', dashSize, cx + 20, 548, -6, { rot: 0.03, dy: 6, wave: (i) => [6, -6, 4, -8][i] }, 77, -0.16);
  // DESSERT (front) — strawberry pink with vanilla icing
  const desSize = 262;
  const des = layoutWord(c, 'DESSERT', desSize, cx, 300, -14, { rot: 0.055, dy: 9, wave: (i) => Math.sin(i * 1.2) * 8 }, 31);

  // motion streaks behind DASH
  const d0 = dash[0];
  speedStreak(c, d0.x - 330, d0.x - 150, d0.y - 70, 22);
  speedStreak(c, d0.x - 400, d0.x - 175, d0.y + 8, 26);
  speedStreak(c, d0.x - 300, d0.x - 160, d0.y + 86, 20);

  drawWord(c, W, H, dash, dashSize, {
    inflate: 9, rim: 8, outline: 15, extrude: 16,
    grad: [[0, '#fff2a6'], [0.32, '#ffc94a'], [0.68, '#ff9a2e'], [1, '#ff6a3d']],
    shade: '#ec5a22', deep: '#c9431a',
  }, 500);

  // sweets around DASH

  drawWord(c, W, H, des, desSize, {
    inflate: 9, rim: 8, outline: 15, extrude: 14, icing: true,
    grad: [[0, '#ffa8cf'], [0.45, '#ff6fae'], [0.8, '#ff5c8c'], [1, '#ff7a5c']],
    shade: '#e2407a', deep: '#c22a62',
  }, 100);

  const last = dash[dash.length - 1];
  wrappedCandy(c, last.x + 210, last.y + 40, 1.15, -0.35);
  const dT = des[des.length - 1];
  place(c, dT.x + 150, dT.y - 70, 1.25, (f) => drawStarCandy(c, 7 * f, 46, PAL.lemon, { bevelAlpha: 0.8 }), 0.25);
  cherry(c, des[0].x - 44, des[0].y - desSize * 0.735 / 2 - 18, 1.34);

  lollipop(c, cx - 540, 590, 0.92, 0.55);
  // ribbon with the Korean title
  ribbon(c, cx, 664, 360, 104, 26, '디저트 대시');

  // sparkles & loose sprinkles
  twinkle(c, des[0].x - 150, des[0].y - 40, 24, 0);
  twinkle(c, dT.x + 60, dT.y + 140, 20, 0.2);
  twinkle(c, last.x + 120, last.y - 170, 22, 0.1);
  twinkle(c, cx - 520, 640, 18, 0.3);
  const sr = rng(4242);
  const spots = [[cx - 690, 360], [cx + 690, 330], [cx - 560, 120], [cx + 470, 520], [cx + 640, 610], [cx - 640, 520], [cx + 560, 70]];
  spots.forEach(([x, y], i) => looseSprinkle(c, x, y, sr() * TAU, SPRINKLES[i % 6]));
  c.restore();
}
