// =============================================================================
//  Dessert Dash — UI icons atlas + title logo. SPEC §3.7.
//  Atlas `ui` (path ui/icons, scale 2): 96x96 icons, anchor centre. One family:
//  6 px cocoa outline, top-left light, cel shade crescent bottom-right, white
//  glint, and a 3 px "chunky sticker" extrusion under every icon.
//  Image `logo` (path ui/logo): drawn in _ui_logo.js.
// =============================================================================
import {
  OUTLINE, TAU, mix, rgba, tone, fill, stroke, clipTo, glint, gloss, circle, ellipse, rrect, poly,
  heart, linearGrad, radialGrad, canvas, ctx2d, silhouette, eye, mouth, blush, sparkle,
} from '../lib.js';
import {
  place, roundPoly, puffyStar, candyBody, PAL, shadeIn, lightIn, crescent, drawCoin, COIN_GOLD,
  drawDropJelly, drawStarCandy, drawMilkCarton, drawRocket, drawShieldCrest, upArrowShape,
} from './_ui_kit.js';
import { drawLogo } from './_ui_logo.js';

const LW = 6;       // icon outline (art px)
const EXTRUDE = 3;  // sticker extrusion depth (px)

// glyph palette (white icons that sit on coloured buttons)
const GLYPH = { base: '#ffffff', top: '#ffffff', bot: '#f3efff', shade: '#cdc3ea', deep: null, light: '#ffffff', rim: '#ffffff' };
const GREEN = { base: '#62d84a', top: '#b4f28e', bot: '#52c83e', shade: '#2f9e35', deep: '#23802c', light: '#e2ffd0' };
const GOLDP = { base: '#ffc928', top: '#fff0a0', bot: '#ffb81f', shade: '#e8860f', deep: '#c9670b', light: '#fff4c0' };
const SILVER = { base: '#d5ddec', top: '#ffffff', bot: '#c4cee2', shade: '#8f9cbb', deep: '#76819f', light: '#ffffff' };
const CORAL = { base: '#ff5d6c', top: '#ff9ca4', bot: '#f44a5c', shade: '#c92e47', deep: '#a5223c', light: '#ffc6ca' };
const PINKP = { base: '#ff79a8', top: '#ffb8d0', bot: '#ff6a9c', shade: '#dc4a80', deep: '#b8356a', light: '#ffd8e6' };
const SKYP = { base: '#4fb2ff', top: '#a6dcff', bot: '#3fa2f5', shade: '#2a78d0', deep: '#1f5fb0', light: '#d6eeff' };
const PURP = { base: '#9f74ff', top: '#cdb6ff', bot: '#8e62f5', shade: '#6a43d0', deep: '#5233ad', light: '#e6dcff' };
const MINTP = { base: '#4fdcb2', top: '#a8f3dc', bot: '#3dcfa4', shade: '#1fa385', deep: '#15836b', light: '#d0fff0' };
const ORANGEP = { base: '#ff9a35', top: '#ffcb88', bot: '#ff8a26', shade: '#e0621a', deep: '#bf4b10', light: '#ffe2bd' };
const CHOCO = { base: '#8a4f2c', top: '#a8683d', bot: '#7a4427', shade: '#5a311b', deep: '#46240f', light: '#c48a5a' };
const COOKIE = { base: '#e8b467', top: '#f6d398', bot: '#e0a656', shade: '#c4843f', deep: '#a86b2f', light: '#ffe2b0' };

/** Standard icon body on a 96 box. R ~ visual radius of the part (controls offsets). */
function body(c, shape, pal, R = 34, o = {}) {
  candyBody(c, shape, pal, R, LW, { caustic: false, sdx: 0.13, sdy: 0.16, gs: 0.16, ...o });
}
/** Outlined thick stroke (for arcs/waves): cocoa underlay then colour. */
function strokeOutlined(c, path, w, color, lw = LW) {
  c.save(); c.lineCap = 'round'; c.lineJoin = 'round';
  c.beginPath(); path(c); c.lineWidth = w + lw * 2; c.strokeStyle = OUTLINE; c.stroke();
  c.beginPath(); path(c); c.lineWidth = w; c.strokeStyle = color; c.stroke();
  c.restore();
}
const P = (x, y) => [x, y];

// --------------------------------------------------------------- shapes
function plusPts(cx, cy, L, w) {
  return [P(-w, -L), P(w, -L), P(w, -w), P(L, -w), P(L, w), P(w, w), P(w, L), P(-w, L), P(-w, w), P(-L, w), P(-L, -w), P(-w, -w)]
    .map(([x, y]) => [cx + x, cy + y]);
}
function rotPts(pts, cx, cy, a) {
  const cs = Math.cos(a), sn = Math.sin(a);
  return pts.map(([x, y]) => [cx + (x - cx) * cs - (y - cy) * sn, cy + (x - cx) * sn + (y - cy) * cs]);
}
const plusF = (n) => Array.from({ length: n }, (_, i) => (i % 3 === 2 ? 0.25 : 0.3));
function xShape(cx, cy, L, w) { return roundPoly(rotPts(plusPts(cx, cy, L, w), cx, cy, Math.PI / 4), plusF(12)); }
function plusShape(cx, cy, L, w) { return roundPoly(plusPts(cx, cy, L, w), plusF(12)); }

function gearShape(cx, cy, ro, ri, n, hole) {
  const pts = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU - Math.PI / 2;
    const hw = (TAU / n) * 0.2, hb = (TAU / n) * 0.3;
    for (const [r, d] of [[ri, -hb], [ro, -hw], [ro, hw], [ri, hb]]) pts.push([cx + Math.cos(a + d) * r, cy + Math.sin(a + d) * r]);
  }
  const outer = roundPoly(pts, pts.map((_, i) => (i % 4 === 1 || i % 4 === 2 ? 0.2 : 0.3)));
  return (cc) => { outer(cc); cc.moveTo(cx + hole, cy); cc.arc(cx, cy, hole, 0, TAU, true); };
}

function speakerShape(dx = 0) {
  return roundPoly([[12 + dx, 36], [28 + dx, 36], [48 + dx, 17], [48 + dx, 79], [28 + dx, 60], [12 + dx, 60]], [0.2, 0.15, 0.12, 0.12, 0.15, 0.2]);
}
function notesShape(dx = 0, dy = 0, s = 1) {
  const X = (v) => dx + v * s, Y = (v) => dy + v * s;
  const ra = 11.5 * s, rb = 8.8 * s, rot = -0.42;
  return (cc) => {
    cc.moveTo(X(24) + ra * Math.cos(rot), Y(66) + ra * Math.sin(rot)); cc.ellipse(X(24), Y(66), ra, rb, rot, 0, TAU);
    cc.moveTo(X(62) + ra * Math.cos(rot), Y(58) + ra * Math.sin(rot)); cc.ellipse(X(62), Y(58), ra, rb, rot, 0, TAU);
    // stems + beam as one polygon
    cc.moveTo(X(29), Y(64)); cc.lineTo(X(29), Y(22)); cc.lineTo(X(74), Y(12)); cc.lineTo(X(74), Y(58)); cc.lineTo(X(66), Y(58));
    cc.lineTo(X(66), Y(29)); cc.lineTo(X(37), Y(35)); cc.lineTo(X(37), Y(64)); cc.closePath();
  };
}
function slashBar(c, x0, y0, x1, y1, w = 11) {
  const path = (cc) => { cc.moveTo(x0, y0); cc.lineTo(x1, y1); };
  strokeOutlined(c, path, w, '#ff4d5e');
  c.save(); c.lineCap = 'round'; c.strokeStyle = 'rgba(255,255,255,0.55)'; c.lineWidth = 3;
  c.beginPath(); c.moveTo(x0 + (x1 - x0) * 0.08 - 2, y0 + (y1 - y0) * 0.08 + 1); c.lineTo(x0 + (x1 - x0) * 0.32 - 2, y0 + (y1 - y0) * 0.32 + 1); c.stroke();
  c.restore();
}
function redX(c, cx, cy, s) {
  const sh = xShape(cx, cy, 15 * s, 5.2 * s);
  body(c, sh, CORAL, 16, { gloss: false, sdx: 0.12, sdy: 0.14 });
}

// --------------------------------------------------------------- icons
const ICONS = {
  coin(c) { place(c, 48, 46, 0.76, (f) => drawCoin(c, 0, COIN_GOLD, LW * f, { face: { beads: 0 } })); },
  jelly(c) { place(c, 49, 46, 0.9, (f) => drawDropJelly(c, LW * f), -0.12); },
  star(c) { place(c, 48, 45, 0.88, (f) => drawStarCandy(c, LW * f, 46, PAL.gold, { bevelAlpha: 0.8 })); },
  milk(c) { place(c, 48, 49.5, 0.8, (f) => drawMilkCarton(c, LW * f)); },

  lock(c) {
    const sk = (cc) => {
      cc.moveTo(26, 46); cc.lineTo(26, 32); cc.arc(48, 32, 22, Math.PI, 0, false); cc.lineTo(70, 46);
      cc.lineTo(59, 46); cc.lineTo(59, 32); cc.arc(48, 32, 11, 0, Math.PI, true); cc.lineTo(37, 46); cc.closePath();
    };
    body(c, sk, SILVER, 26, { gloss: false });
    c.save(); c.strokeStyle = 'rgba(255,255,255,0.9)'; c.lineWidth = 3.5; c.lineCap = 'round';
    c.beginPath(); c.arc(48, 32, 17, Math.PI * 1.1, Math.PI * 1.45); c.stroke(); c.restore();
    const b = rrect(14, 40, 68, 46, 13);
    body(c, b, GOLDP, 34, { gx: -0.62, gy: -0.12 });
    const kh = (cc) => { cc.moveTo(48 + 8, 58); cc.arc(48, 58, 8, 0, TAU); cc.moveTo(44, 62); cc.lineTo(41.5, 75); cc.quadraticCurveTo(48, 78, 54.5, 75); cc.lineTo(52, 62); cc.closePath(); };
    fill(c, kh, '#5a311b');
    crescent(c, kh, '#3a1c0f', 2, 2.5);
  },

  check(c) {
    const sh = roundPoly([[10, 50], [25, 35], [40, 50], [70, 18], [86, 33], [40, 80]], [0.22, 0.25, 0.18, 0.25, 0.25, 0.18]);
    body(c, sh, GREEN, 30, { gx: -0.95, gy: -0.1, sdx: 0.1, sdy: 0.14 });
  },

  gear(c) {
    const sh = gearShape(48, 48, 41, 31, 8, 12);
    body(c, sh, SILVER, 36, { gx: -0.5, gy: -0.45 });
    stroke(c, circle(48, 48, 21), 3, rgba('#7d89a8', 0.6));
  },

  pause(c) {
    const sh = (cc) => { rrect(20, 16, 21, 64, 9)(cc); rrect(55, 16, 21, 64, 9)(cc); };
    body(c, sh, GLYPH, 30, { gloss: false });
  },
  play(c) {
    const sh = roundPoly([[26, 14], [84, 48], [26, 82]], [0.2, 0.22, 0.2]);
    body(c, sh, GLYPH, 32, { gloss: false });
  },
  home(c) {
    const chim = rrect(62, 14, 13, 26, 3);
    body(c, chim, { ...CHOCO, base: '#c8794a', top: '#e09a68', shade: '#9a5530' }, 10, { gloss: false });
    const walls = rrect(19, 40, 58, 46, 6);
    body(c, walls, PAL.cream, 30, { gloss: false });
    const door = rrect(39, 57, 18, 29, 8);
    body(c, door, CHOCO, 12, { gloss: false });
    c.fillStyle = '#ffd23a'; c.beginPath(); c.arc(52, 72, 2.2, 0, TAU); c.fill();
    const roof = roundPoly([[48, 8], [91, 44], [83, 52], [48, 23], [13, 52], [5, 44]], [0.22, 0.3, 0.2, 0.14, 0.2, 0.3]);
    body(c, roof, PINKP, 22, { gx: -0.9, gy: 0.4, gs: 0.22 });
  },
  retry(c) {
    const cx = 48, cy = 51, Ro = 33, Ri = 19.5, Rm = (Ro + Ri) / 2, rc = (Ro - Ri) / 2;
    const s0 = -0.62, e = -1.78 + TAU;   // arc runs clockwise from s0 (upper right) to e (top, slightly left)
    const sh = (cc) => {
      cc.moveTo(cx + Math.cos(s0) * Ro, cy + Math.sin(s0) * Ro);
      cc.arc(cx, cy, Ro, s0, e, false);
      const nx = Math.cos(e), ny = Math.sin(e), tx = -ny, ty = nx;     // radial + clockwise tangent
      const bx = cx + nx * Rm, by = cy + ny * Rm, hw = 18.5, hl = 25;
      cc.lineTo(bx + nx * hw, by + ny * hw);
      cc.lineTo(bx + tx * hl, by + ty * hl);
      cc.lineTo(bx - nx * hw, by - ny * hw);
      cc.lineTo(cx + nx * Ri, cy + ny * Ri);
      cc.arc(cx, cy, Ri, e, s0, true);
      cc.arc(cx + Math.cos(s0) * Rm, cy + Math.sin(s0) * Rm, rc, s0 + Math.PI, s0 + TAU, false);
      cc.closePath();
    };
    body(c, sh, GLYPH, 34, { gloss: false });
  },

  sound_on(c) {
    body(c, speakerShape(), GLYPH, 30, { gloss: false });
    const w1 = (cc) => cc.arc(50, 48, 17, -0.75, 0.75);
    const w2 = (cc) => cc.arc(50, 48, 31, -0.72, 0.72);
    strokeOutlined(c, w1, 8, '#ffffff');
    strokeOutlined(c, w2, 8, '#ffffff');
  },
  sound_off(c) {
    body(c, speakerShape(-4), GLYPH, 30, { gloss: false });
    redX(c, 69, 48, 1.32);
  },
  music_on(c) {
    body(c, notesShape(0, 0, 1), GLYPH, 30, { gloss: false });
  },
  music_off(c) {
    body(c, notesShape(-2, 0, 1), GLYPH, 30, { gloss: false });
    slashBar(c, 16, 16, 80, 80, 10);
  },
  arrow_r(c) {
    const sh = roundPoly([[12, 36], [46, 36], [46, 14], [86, 48], [46, 82], [46, 60], [12, 60]], [0.25, 0.12, 0.16, 0.18, 0.16, 0.12, 0.25]);
    body(c, sh, GLYPH, 30, { gloss: false });
  },
  arrow_l(c) {
    const pts = [[12, 36], [46, 36], [46, 14], [86, 48], [46, 82], [46, 60], [12, 60]].map(([x, y]) => [96 - x, y]);
    const sh = roundPoly(pts, [0.25, 0.12, 0.16, 0.18, 0.16, 0.12, 0.25]);
    body(c, sh, GLYPH, 30, { gloss: false });
  },
  close(c) {
    const sh = xShape(48, 48, 37, 12);
    body(c, sh, CORAL, 34, { gx: -0.55, gy: -0.62 });
  },
  plus(c) {
    const sh = plusShape(48, 48, 37, 12.5);
    body(c, sh, GREEN, 34, { gx: -0.22, gy: -0.82 });
  },

  trophy(c) {
    // handles (behind)
    const hl = (cc) => { cc.moveTo(30, 22); cc.bezierCurveTo(4, 18, 6, 50, 32, 50); cc.lineTo(32, 42); cc.bezierCurveTo(16, 42, 14, 28, 30, 30); cc.closePath(); };
    const hr = (cc) => { cc.moveTo(66, 22); cc.bezierCurveTo(92, 18, 90, 50, 64, 50); cc.lineTo(64, 42); cc.bezierCurveTo(80, 42, 82, 28, 66, 30); cc.closePath(); };
    body(c, hl, GOLDP, 12, { gloss: false }); body(c, hr, GOLDP, 12, { gloss: false });
    // base
    const plinth = rrect(22, 72, 52, 16, 5);
    body(c, plinth, CHOCO, 18, { gloss: false });
    c.fillStyle = '#ffd23a'; c.beginPath(); c.roundRect(36, 77, 24, 6, 2); c.fill();
    const stem = roundPoly([[42, 56], [54, 56], [58, 73], [38, 73]], 0.15);
    body(c, stem, GOLDP, 10, { gloss: false });
    // cup
    const cup = (cc) => { cc.moveTo(22, 12); cc.lineTo(74, 12); cc.bezierCurveTo(74, 44, 64, 60, 48, 60); cc.bezierCurveTo(32, 60, 22, 44, 22, 12); cc.closePath(); };
    body(c, cup, GOLDP, 30, { gx: -0.55, gy: -0.25 });
    // star emblem
    const st = puffyStar(48, 33, 12, 6, 5, -Math.PI / 2, 0.25, 0.18);
    fill(c, puffyStar(49.5, 35, 12, 6, 5, -Math.PI / 2, 0.25, 0.18), '#d9800c');
    fill(c, st, '#fff3a6');
    // rim lip
    const lip = rrect(18, 8, 60, 9, 4.5);
    body(c, lip, GOLDP, 10, { gloss: false });
  },

  mission(c) {
    const board = rrect(15, 13, 66, 76, 11);
    body(c, board, ORANGEP, 34, { gloss: false });
    const paper = rrect(24, 25, 48, 56, 6);
    fill(c, paper, '#fffdf8'); shadeIn(c, paper, '#e2dcf0', 3, 3); stroke(c, paper, 4, OUTLINE);
    // rows: checks + lines
    for (let k = 0; k < 3; k++) {
      const y = 38 + k * 15;
      if (k < 2) {
        c.save(); c.lineCap = 'round'; c.lineJoin = 'round';
        c.strokeStyle = '#3fbf4a'; c.lineWidth = 4.5;
        c.beginPath(); c.moveTo(30, y); c.lineTo(34, y + 4); c.lineTo(41, y - 4); c.stroke(); c.restore();
      } else {
        stroke(c, rrect(29, y - 5, 10, 10, 3), 3, '#b9b0cf');
      }
      c.fillStyle = k < 2 ? '#c9c1df' : '#b9b0cf';
      c.beginPath(); c.roundRect(45, y - 2.5, 21, 5, 2.5); c.fill();
    }
    // clip
    const clip = (cc) => { rrect(33, 7, 30, 16, 6)(cc); };
    body(c, clip, SILVER, 14, { gloss: false });
    fill(c, rrect(42, 11, 12, 5, 2.5), '#7d89a8');
  },

  lab(c) {
    const fl = (cc) => {
      cc.moveTo(40, 16); cc.lineTo(40, 36.4);
      cc.arc(48, 61, 26, Math.atan2(36.4 - 61, -8), Math.atan2(36.4 - 61, 8), true);
      cc.lineTo(56, 16); cc.closePath();
    };
    fill(c, fl, linearGrad(c, 22, 20, 74, 86, [[0, '#f4fbff'], [1, '#d6ecfb']]));
    // liquid
    clipTo(c, fl, () => {
      const liq = (cc) => { cc.moveTo(10, 56); cc.bezierCurveTo(28, 50, 38, 62, 52, 56); cc.bezierCurveTo(64, 51, 74, 56, 90, 54); cc.lineTo(90, 100); cc.lineTo(10, 100); cc.closePath(); };
      fill(c, liq, linearGrad(c, 0, 52, 0, 88, [[0, '#7ff0c8'], [1, '#2fc69a']]));
      shadeIn(c, liq, '#1fa07d', 0, 0, 0);
      c.fillStyle = rgba('#ffffff', 0.85);
      for (const [x, y, r] of [[40, 70, 4.5], [55, 64, 3.2], [50, 78, 2.6], [61, 74, 2.2]]) { c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill(); }
    });
    shadeIn(c, fl, rgba('#5aa0d8', 0.45), 5, 5);
    clipTo(c, fl, () => { c.fillStyle = 'rgba(255,255,255,0.95)'; c.beginPath(); c.roundRect(29, 50, 6, 16, 3); c.fill(); });
    stroke(c, fl, LW, OUTLINE);
    const lip = rrect(35, 10, 26, 10, 5);
    body(c, lip, SILVER, 10, { gloss: false });
    // rising bubbles
    for (const [x, y, r] of [[66, 12, 4.5], [74, 24, 3.2]]) { const b = circle(x, y, r); fill(c, b, '#c9fff0'); stroke(c, b, 3, OUTLINE); }
  },

  char(c) {
    const face = circle(48, 49, 37);
    body(c, face, COOKIE, 36, { gx: -0.56, gy: -0.6, gs: 0.13, inner: () => {
      // chocolate chips
      for (const [x, y, r, a] of [[24, 30, 5.5, 0.3], [70, 26, 5, -0.2], [78, 52, 4.5, 0.5], [22, 62, 4.2, 0.1], [56, 80, 4.5, -0.4], [40, 22, 3.6, 0]]) {
        c.save(); c.translate(x, y); c.rotate(a);
        fill(c, roundPoly([[-r, r * 0.6], [-r * 0.2, -r], [r, -r * 0.3], [r * 0.6, r * 0.8]], 0.3), '#6b3a22');
        c.fillStyle = 'rgba(255,220,180,0.55)'; c.beginPath(); c.arc(-r * 0.25, -r * 0.3, r * 0.28, 0, TAU); c.fill();
        c.restore();
      }
    } });
    eye(c, 37, 47, 0.62, 'open', -1, [1, 0]);
    eye(c, 61, 47, 0.62, 'open', 1, [1, 0]);
    blush(c, 28, 59, 0.62); blush(c, 70, 59, 0.62);
    mouth(c, 49, 60, 0.75, 'grin');
  },

  pet(c) {
    const pad = (cc) => {
      cc.moveTo(48, 46);
      cc.bezierCurveTo(64, 46, 76, 62, 74, 74);
      cc.bezierCurveTo(72, 86, 58, 84, 48, 80);
      cc.bezierCurveTo(38, 84, 24, 86, 22, 74);
      cc.bezierCurveTo(20, 62, 32, 46, 48, 46);
      cc.closePath();
    };
    body(c, pad, PINKP, 28, { gx: -0.5, gy: -0.15, gs: 0.15 });
    const toes = [[18, 44, 9, 11.5, -0.45], [35, 25, 9.5, 12, -0.15], [61, 25, 9.5, 12, 0.15], [78, 44, 9, 11.5, 0.45]];
    for (const [x, y, rx, ry, rot] of toes) body(c, ellipse(x, y, rx, ry, rot), PINKP, 11, { gs: 0.22, gx: -0.4, gy: -0.45 });
  },

  boost(c) {
    const sh = roundPoly([[58, 6], [20, 52], [44, 52], [34, 90], [78, 40], [53, 40], [66, 6]], [0.12, 0.16, 0.14, 0.12, 0.16, 0.14, 0.18]);
    body(c, sh, PAL.lemon, 32, { gx: 0.1, gy: -0.6, sdx: 0.12, sdy: 0.12 });
  },

  crown(c) {
    const band = rrect(16, 62, 64, 20, 6);
    const crown = roundPoly([[18, 66], [12, 26], [33, 46], [48, 18], [63, 46], [84, 26], [78, 66]], [0.1, 0.16, 0.2, 0.14, 0.2, 0.16, 0.1]);
    body(c, crown, GOLDP, 32, { gx: -0.55, gy: -0.1 });
    body(c, band, { ...GOLDP, base: '#ffb81f', top: '#ffd860' }, 14, { gloss: false });
    for (const [x, y, r] of [[12, 24, 6.5], [48, 15, 7], [84, 24, 6.5]]) body(c, circle(x, y, r), { ...PAL.pink }, 7, { gloss: false, gs: 0.3 });
    // gems on the band
    const gem = (x, col) => { const g = roundPoly([[x, 65], [x + 7, 72], [x, 79], [x - 7, 72]], 0.25); fill(c, g, col); shadeIn(c, g, tone(col, -0.3), 2, 2); stroke(c, g, 3.5, OUTLINE); c.fillStyle = '#fff'; c.beginPath(); c.arc(x - 2, 70, 1.6, 0, TAU); c.fill(); };
    gem(30, '#4fb2ff'); gem(48, '#ff4f6a'); gem(66, '#4fdc8f');
  },

  clock(c) {
    // bells
    const bl = (cc) => { cc.moveTo(10, 30); cc.arc(26, 24, 15, Math.PI * 0.86, Math.PI * 1.86, false); cc.closePath(); };
    const br = (cc) => { cc.moveTo(86, 30); cc.arc(70, 24, 15, Math.PI * 0.14, Math.PI * -0.86, true); cc.closePath(); };
    body(c, bl, GOLDP, 12, { gloss: false }); body(c, br, GOLDP, 12, { gloss: false });
    // legs
    for (const s of [-1, 1]) { const lg = roundPoly([[48 + s * 18, 74], [48 + s * 28, 88], [48 + s * 20, 90], [48 + s * 12, 78]], 0.2); body(c, lg, CHOCO, 6, { gloss: false }); }
    const rim = circle(48, 52, 35);
    body(c, rim, CORAL, 35, { gx: -0.55, gy: -0.62 });
    const face = circle(48, 53, 25);
    fill(c, face, '#fffdf8'); lightIn(c, face, '#e2dcf0', 3, 4); stroke(c, face, 4, OUTLINE);
    c.save(); c.lineCap = 'round'; c.strokeStyle = OUTLINE;
    for (let k = 0; k < 12; k += 3) { const a = (k / 12) * TAU; c.lineWidth = 3; c.beginPath(); c.moveTo(48 + Math.cos(a) * 19, 53 + Math.sin(a) * 19); c.lineTo(48 + Math.cos(a) * 22, 53 + Math.sin(a) * 22); c.stroke(); }
    c.lineWidth = 5; c.beginPath(); c.moveTo(48, 53); c.lineTo(48, 37); c.stroke();
    c.lineWidth = 5; c.beginPath(); c.moveTo(48, 53); c.lineTo(60, 58); c.stroke();
    c.restore();
    fill(c, circle(48, 53, 4), '#ff4f6a');
  },

  flag(c) {
    const pole = rrect(16, 16, 9, 74, 4.5);
    body(c, pole, CHOCO, 8, { gloss: false });
    const fl = (cc) => {
      cc.moveTo(25, 16);
      cc.bezierCurveTo(42, 8, 58, 24, 86, 14);
      cc.lineTo(86, 54);
      cc.bezierCurveTo(58, 64, 42, 48, 25, 56);
      cc.closePath();
    };
    fill(c, fl, '#fff8ec');
    clipTo(c, fl, () => {
      c.fillStyle = '#5a3423';
      const n = 5, m = 4;
      for (let i = 0; i < n; i++) for (let j = 0; j < m; j++) {
        if ((i + j) % 2) continue;
        const x0 = 25 + (i * 61) / n, x1 = 25 + ((i + 1) * 61) / n;
        const wave = (x) => Math.sin(((x - 25) / 61) * Math.PI * 2) * -5;
        const yT = (x, jj) => 16 + wave(x) + (jj * 40) / m;
        c.beginPath(); c.moveTo(x0, yT(x0, j)); c.lineTo(x1, yT(x1, j)); c.lineTo(x1, yT(x1, j + 1)); c.lineTo(x0, yT(x0, j + 1)); c.closePath(); c.fill();
      }
    });
    shadeIn(c, fl, rgba('#3a1c0f', 0.25), 4, 5);
    stroke(c, fl, LW, OUTLINE);
    body(c, circle(20.5, 14.5, 6.5), GOLDP, 7, { gloss: false });
  },

  bag(c) {
    // handles behind
    const h1 = (cc) => { cc.moveTo(33, 40); cc.bezierCurveTo(31, 14, 65, 14, 63, 40); };
    strokeOutlined(c, h1, 7, '#ff9cc0');
    const bag = roundPoly([[19, 34], [77, 34], [83, 87], [13, 87]], [0.14, 0.14, 0.12, 0.12]);
    body(c, bag, PINKP, 34, { gx: -0.6, gy: -0.3 });
    // fold band
    clipTo(c, bag, () => { c.fillStyle = rgba('#ffffff', 0.35); c.fillRect(0, 34, 96, 7); });
    // star emblem
    place(c, 48, 62, 0.36, (f) => drawStarCandy(c, LW * 0.8 * f, 46, PAL.lemon));
    for (const x of [33, 63]) { const h = circle(x, 41, 3.2); fill(c, h, '#7a3a50'); }
  },

  heart(c) {
    const sh = heart(48, 51, 37);
    body(c, sh, { base: '#ff4f74', top: '#ff9db2', bot: '#f23e66', shade: '#c92650', deep: '#a51d45', light: '#ffc6d2' }, 34, { gx: -0.62, gy: -0.62, gs: 0.15 });
  },

  info(c) {
    const disc = circle(48, 48, 39);
    body(c, disc, SKYP, 39, { gx: -0.6, gy: -0.55 });
    const ii = (cc) => { cc.moveTo(48 + 7.5, 28); cc.arc(48, 28, 7.5, 0, TAU); rrect(40.5, 40, 15, 36, 7.5)(cc); };
    fill(c, ii, '#ffffff'); shadeIn(c, ii, '#cfe2ff', 2.5, 3); stroke(c, ii, 4, OUTLINE);
  },

  gift(c) {
    // bow loops (behind lid)
    const loop = (s) => (cc) => { cc.moveTo(48, 28); cc.bezierCurveTo(48 + s * 6, 6, 48 + s * 34, 6, 48 + s * 28, 24); cc.bezierCurveTo(48 + s * 24, 32, 48 + s * 10, 32, 48, 28); cc.closePath(); };
    body(c, loop(-1), PINKP, 12, { gloss: false }); body(c, loop(1), PINKP, 12, { gloss: false });
    const box = rrect(18, 44, 60, 43, 6);
    body(c, box, MINTP, 30, { gloss: false });
    const lid = rrect(12, 30, 72, 18, 6);
    body(c, lid, { ...MINTP, base: '#6ce8c2', top: '#bff8e6' }, 14, { gx: -0.8, gy: -0.2, gs: 0.25 });
    // ribbons
    for (const [x, y, w, h] of [[41, 30, 14, 18], [41, 48, 14, 39]]) {
      const r = rrect(x, y, w, h, 2);
      fill(c, r, '#ff6f9e'); shadeIn(c, r, '#d9467a', 3, 0); stroke(c, r, 3.5, OUTLINE);
    }
    const knot = rrect(40, 22, 16, 12, 5);
    body(c, knot, PINKP, 7, { gloss: false });
  },

  btn_jump(c) {
    const plate = circle(48, 48.5, 40.5);
    body(c, plate, { base: '#ff9a3c', top: '#ffd08a', bot: '#ff7a3a', shade: '#e0551f', deep: '#c0400f', light: '#ffe2b8' }, 42, { gloss: false, sdx: 0.1, sdy: 0.12 });
    lightIn(c, circle(48, 48.5, 35.5), '#ffffff', 5, 5, 0.5);
    // bounce arcs under the arrow
    const arc1 = (cc) => { cc.moveTo(30, 72); cc.quadraticCurveTo(48, 80, 66, 72); };
    strokeOutlined(c, arc1, 6, '#ffffff', 4);
    const ar = upArrowShape(48, 41, 46, 50, 0.44, 0.5);
    fill(c, ar, '#ffffff'); shadeIn(c, ar, '#f0d2c2', 3, 4); stroke(c, ar, 5, OUTLINE);
    glint(c, 22, 24, 5.5, -0.75, 0.9);
  },

  btn_slide(c) {
    const plate = circle(48, 48.5, 40.5);
    body(c, plate, { base: '#45b4ff', top: '#a6dcff', bot: '#3596f0', shade: '#2266c8', deep: '#1a52a8', light: '#d6eeff' }, 42, { gloss: false, sdx: 0.1, sdy: 0.12 });
    lightIn(c, circle(48, 48.5, 35.5), '#ffffff', 5, 5, 0.5);
    // speed lines (sliding motion)
    for (const [x0, x1, y] of [[14, 24, 56], [16, 28, 70]]) strokeOutlined(c, (cc) => { cc.moveTo(x0, y); cc.lineTo(x1, y); }, 5, '#ffffff', 4);
    // curved swoosh arrow: down, then sliding to the right
    const ax = 40, w = 8, R = 15, top = 17, yl = 66, hx = 62;
    const sh = (cc) => {
      cc.moveTo(ax - w, top);
      cc.lineTo(ax - w, yl - R);
      cc.arc(ax + R, yl - R, R + w, Math.PI, Math.PI / 2, true);
      cc.lineTo(hx, yl + w);
      cc.lineTo(hx, yl + w + 9);
      cc.lineTo(hx + 22, yl);
      cc.lineTo(hx, yl - w - 9);
      cc.lineTo(hx, yl - w);
      cc.lineTo(ax + R, yl - w);
      cc.arc(ax + R, yl - R, R - w, Math.PI / 2, Math.PI, false);
      cc.lineTo(ax + w, top);
      cc.arc(ax, top, w, 0, Math.PI, true);
      cc.closePath();
    };
    fill(c, sh, '#ffffff'); shadeIn(c, sh, '#c9dcf5', 2.5, 3.5); c.save(); c.lineJoin = 'round'; stroke(c, sh, 5, OUTLINE); c.restore();
    glint(c, 22, 24, 5.5, -0.75, 0.9);
  },

  level(c) {
    const hex = roundPoly(Array.from({ length: 6 }, (_, i) => { const a = -Math.PI / 2 + (i * TAU) / 6; return [48 + Math.cos(a) * 42, 49 + Math.sin(a) * 42]; }), 0.2);
    body(c, hex, PURP, 38, { gx: -0.58, gy: -0.5 });
    lightIn(c, roundPoly(Array.from({ length: 6 }, (_, i) => { const a = -Math.PI / 2 + (i * TAU) / 6; return [48 + Math.cos(a) * 34, 49 + Math.sin(a) * 34]; }), 0.2), '#ffffff', 3, 3, 0.35);
    for (const y of [30, 50]) {
      const ch = roundPoly([[48, y - 6], [70, y + 14], [62, y + 22], [48, y + 9], [34, y + 22], [26, y + 14]], [0.18, 0.2, 0.2, 0.12, 0.2, 0.2]);
      fill(c, ch, '#ffffff'); shadeIn(c, ch, '#ddd0ff', 2, 3); stroke(c, ch, 4.5, OUTLINE);
    }
  },

  new(c) {
    const b = puffyStar(48, 48, 44, 35, 12, -Math.PI / 2, 0.3, 0.3);
    body(c, b, { base: '#ff4f6a', top: '#ff9aa6', bot: '#f2405c', shade: '#c92a48', deep: '#a5203d', light: '#ffc0c8' }, 40, { gloss: false });
    lightIn(c, circle(48, 48, 32), '#ffffff', 3, 3, 0.4);
    c.save();
    c.translate(48, 50); c.rotate(-0.14);
    c.font = '700 27px DDNum'; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.lineJoin = 'round'; c.lineWidth = 7; c.strokeStyle = OUTLINE; c.strokeText('NEW', 0, 1);
    c.fillStyle = '#ffffff'; c.fillText('NEW', 0, 1);
    c.restore();
    glint(c, 22, 22, 4.5, -0.75, 0.95);
  },

  shield(c) { place(c, 48, 46, 1.03, (f) => drawShieldCrest(c, LW * f)); },
  rocket(c) { place(c, 47, 49, 0.98, (f) => drawRocket(c, LW * f)); },

  // ---- display / install glyphs (white, sit on cream or coloured buttons)
  fullscreen(c) {
    const sh = (cc) => { for (const [x, y, dx, dy] of [[12, 12, 1, 1], [84, 12, -1, 1], [12, 84, 1, -1], [84, 84, -1, -1]]) cornerL(x, y, dx, dy)(cc); };
    body(c, sh, GLYPH, 30, { gloss: false });
  },
  exitfs(c) {
    const sh = (cc) => { for (const [x, y, dx, dy] of [[39, 39, -1, -1], [57, 39, 1, -1], [39, 57, -1, 1], [57, 57, 1, 1]]) cornerL(x, y, dx, dy)(cc); };
    body(c, sh, GLYPH, 30, { gloss: false });
  },
  share(c) {
    // open tray with inward flanges + an arrow rising out of it (the familiar "share" glyph)
    const tray = roundPoly([[36, 38], [36, 48], [28, 48], [28, 76], [68, 76], [68, 48], [60, 48], [60, 38], [78, 38], [78, 87], [18, 87], [18, 38]],
      [0.3, 0.3, 0.2, 0.15, 0.15, 0.2, 0.3, 0.3, 0.12, 0.12, 0.12, 0.12]);
    body(c, tray, GLYPH, 30, { gloss: false });
    const arrow = roundPoly([[48, 6], [70, 30], [54.5, 30], [54.5, 64], [41.5, 64], [41.5, 30], [26, 30]], [0.12, 0.2, 0.1, 0.25, 0.25, 0.1, 0.2]);
    body(c, arrow, GLYPH, 24, { gloss: false });
  },
  addhome(c) {
    // rounded square with a plus ("add to home screen")
    const ring = (cc) => { rrDir(12, 12, 72, 72, 20, false)(cc); rrDir(24, 24, 48, 48, 11, true)(cc); }; // inner contour reversed = hole
    body(c, ring, GLYPH, 34, { gloss: false });
    body(c, plusShape(48, 48, 15.5, 5.5), GLYPH, 18, { gloss: false });
  },
};

/** Rounded rect path with explicit winding (ccw=true punches a hole under the nonzero rule). */
function rrDir(x, y, w, h, r, ccw) {
  return (c) => {
    c.moveTo(x + r, y);
    if (!ccw) { c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); }
    else { c.arcTo(x, y, x, y + h, r); c.arcTo(x, y + h, x + w, y + h, r); c.arcTo(x + w, y + h, x + w, y, r); c.arcTo(x + w, y, x, y, r); }
    c.closePath();
  };
}
/** L-shaped bracket: corner at (cx,cy), arms of length L and width w towards +dx / +dy. */
function cornerL(cx, cy, dx, dy, L = 27, w = 12) {
  return roundPoly([[cx, cy], [cx + dx * L, cy], [cx + dx * L, cy + dy * w], [cx + dx * w, cy + dy * w], [cx + dx * w, cy + dy * L], [cx, cy + dy * L]],
    [0.2, 0.25, 0.25, 0.15, 0.25, 0.25]);
}

const ORDER = ['coin', 'jelly', 'star', 'milk', 'lock', 'check', 'gear', 'pause', 'play', 'home', 'retry', 'sound_on', 'sound_off',
  'music_on', 'music_off', 'arrow_l', 'arrow_r', 'close', 'plus', 'trophy', 'mission', 'lab', 'char', 'pet', 'boost', 'crown',
  'clock', 'flag', 'bag', 'heart', 'info', 'gift', 'btn_jump', 'btn_slide', 'level', 'new', 'shield', 'rocket',
  'fullscreen', 'exitfs', 'share', 'addhome'];

function iconItem(name) {
  return {
    name, w: 96, h: 96,
    draw: (c, w, h) => {
      const off = canvas(w, h), g = ctx2d(off);
      g.translate(0, -1.5); // leave room for the extrusion
      ICONS[name](g);
      c.drawImage(silhouette(off, OUTLINE), 0, EXTRUDE);
      c.drawImage(off, 0, 0);
    },
  };
}

export function build(F) {
  F.atlas('ui', { path: 'ui/icons', scale: 2, padding: 4, maxWidth: 2048, items: ORDER.map(iconItem) });
  F.image('logo', { path: 'ui/logo', w: 1600, h: 760, ax: 800, ay: 380, scale: 2, draw: (c, w, h) => drawLogo(c, w, h) });
}
