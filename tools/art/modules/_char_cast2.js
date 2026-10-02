// =============================================================================
//  Dessert Dash — runner cast part 2: marsh, cupcake, cotton.
//  Not an export module (underscore prefix). Used by characters.js.
// =============================================================================
import { tone, rng, smooth, blobPoints, circle, ellipse, star, TAU, lerp } from '../lib.js';
import { M, cel, strokeL, fillL, glossL, glintL, tubeShape, qpts } from './_char_rig.js';
import { cherry, sprinkle, SPRINKLE_COLS, auraBase, twinkles, coin, bubble, cloudPuff } from './_char_kit.js';

// =============================================================================
//  MARSH — pillowy marshmallow cylinder, lightly toasted top, tiny pink bow
// =============================================================================
const MAR = { body: '#fffaf7', bottom: '#ffd3e1', shade: '#f1c7d4', toast: '#f2c27c', toastShade: '#d6914e', toastLight: '#fde4b2', bow: '#ff7aa8', bowShade: '#df5189', bowLight: '#ffb6cf' };
const MAR_SHAPE = (g) => {
  g.moveTo(-78, -150);
  g.bezierCurveTo(-78, -160, -44, -167, 0, -167);
  g.bezierCurveTo(44, -167, 78, -160, 78, -150);
  g.bezierCurveTo(84, -110, 84, -62, 80, -28);
  g.quadraticCurveTo(78, 0, 50, 0);
  g.lineTo(-50, 0);
  g.quadraticCurveTo(-78, 0, -80, -28);
  g.bezierCurveTo(-84, -62, -84, -110, -78, -150);
  g.closePath();
};
const MAR_TOP = ellipse(0, -150, 77, 16.5);
const MAR_TOAST = [[-40, -150, 13, 5], [8, -156, 15, 5], [46, -146, 12, 4.5], [-6, -143, 10, 3.5]];

function marBow(c, m) {
  const loopL = (g) => { g.moveTo(-2, 0); g.bezierCurveTo(-8, -14, -24, -12, -22, -1); g.bezierCurveTo(-21, 9, -8, 9, -2, 0); g.closePath(); };
  const loopR = (g) => { g.moveTo(2, 0); g.bezierCurveTo(8, -14, 24, -12, 22, -1); g.bezierCurveTo(21, 9, 8, 9, 2, 0); g.closePath(); };
  const o = { fill: MAR.bow, shade: MAR.bowShade, sdx: 3, sdy: 4, light: MAR.bowLight, ldx: 2.5, ldy: 2.5, lightAlpha: 0.8, lw: 4.5 };
  const t1 = [M.ap(m, -3, 3), M.ap(m, -7, 10), M.ap(m, -10, 15)];
  const t2 = [M.ap(m, 3, 3), M.ap(m, 7, 10), M.ap(m, 11, 14)];
  cel(c, M.I, tubeShape(qpts(...t1, 5), 3.6, 3.2), { ...o, shade: false });
  cel(c, M.I, tubeShape(qpts(...t2, 5), 3.6, 3.2), { ...o, shade: false });
  cel(c, m, loopL, o); cel(c, m, loopR, o);
  cel(c, m, circle(0, 0, 5.5), { ...o, lw: 4 });
}

export const marsh = {
  id: 'marsh', color: '#f7d6e4', skillColor: '#c79bff', k: 0.975,
  slideRot: -0.3, slideSy: 0.68,
  H: 167, W: 166, legLen: 40, stride: 23, lift: 23,
  hips: { near: [-18, -8], far: [18, -10] },
  shoulders: { near: [-80, -66], far: [82, -70] },
  leg: { w: 19, len: 42, color: '#fff2f0', farColor: '#f0dde2', shoe: { color: '#ff9ec2', lace: '#ffffff' } },
  arm: { w: 15, len: 30, color: '#fff6f3', farColor: '#efdce2', hand: 11.5 },
  face: { x: 5, y: -96, shift: 16, sp: 54, es: 1.12, ex: 0.88, ey: 1.1, my: 24, ms: 1.0, bx: 41, by: 14, bs: 1.2, blushColor: 'rgba(255,96,140,0.42)' },
  sweatAt: [66, -150],
  runMouth: 'grin', idleMouth: 'cat',
  tuckCy: 84,
  hullShapes: [MAR_SHAPE],
  pose(p) { // soft & squishy: a touch more squash/stretch than the others
    if (p.anim === 'run' || p.anim === 'idle') { p.sy = 1 + (p.sy - 1) * 1.35; p.sx = 1 + (p.sx - 1) * 1.35; }
  },
  body(R) {
    const { c, m } = R;
    cel(c, m, MAR_SHAPE, {
      fill: MAR.body, grad: [0, -167, 0, 0, [[0, MAR.body], [0.5, MAR.body], [1, MAR.bottom]]],
      mul: true, shade: MAR.shade, sdx: 12, sdy: 12, light: '#ffffff', ldx: 7, ldy: 7, lightAlpha: 0.9,
      details: (g) => {
        cel(g, m, MAR_TOP, {
          fill: MAR.toast, shade: MAR.toastShade, sdx: 7, sdy: 4, light: MAR.toastLight, ldx: 6, ldy: 4, lightAlpha: 0.9, lw: 4.5,
          details: (gg) => { for (const [x, y, rx, ry] of MAR_TOAST) fillL(gg, m, ellipse(x, y, rx, ry, 0.05), '#c9803f', 0.35); },
          after: (gg) => glossL(gg, m, -34, -156, 20, 4.5, -0.1, 0.7),
        });
      },
      after: (g) => { glossL(g, m, -58, -104, 8, 26, 0.04, 0.55); glintL(g, m, -60, -132, 5, -1.2, 0.85); },
    });
    R.face();
  },
  over(R) {
    const { c, pose } = R; const A = pose.acc || {};
    const [x, y] = R.P(-40, -163);
    marBow(c, M.chain(M.T(x, y), M.R(pose.rot - 0.38 + 0.14 * (A.sway || 0)), M.S(1.05)));
  },
  auraBack(c, k) { auraBase(c, k, this.skillColor); },
  auraFront(c, k) { // puff float: little clouds under the feet, sparkles
    cloudPuff(c, k ? 92 : 98, 252, 15); cloudPuff(c, k ? 196 : 190, 254, 13);
    cloudPuff(c, k ? 34 : 40, k ? 120 : 150, 11); cloudPuff(c, k ? 252 : 246, k ? 96 : 128, 12);
    twinkles(c, k, [[96, 34, 8, 0.4], [198, 30, 9, 1.4], [254, 200, 7, 2.2], [24, 206, 7, 0.9]], '#f6eeff');
  },
};

// =============================================================================
//  CUPCAKE — mint striped paper cup (face), chocolate cake, frosting swirl, cherry
// =============================================================================
const CUP = { cup: '#7fdcc4', stripe: '#c4f3e5', cupShade: '#4fb59c', cake: '#7a4429', cakeShade: '#552b17', cakeLight: '#a8683f', fr: '#ff94c4', frShade: '#ea6aa4', frLight: '#ffc8df' };
const CUP_SHAPE = (g) => { g.moveTo(-75, -80); g.lineTo(75, -80); g.lineTo(59, -7); g.quadraticCurveTo(57, 0, 49, 0); g.lineTo(-49, 0); g.quadraticCurveTo(-57, 0, -59, -7); g.closePath(); };
const CUP_CAKE = (g) => { g.moveTo(-80, -74); g.bezierCurveTo(-91, -76, -91, -99, -72, -102); g.lineTo(72, -102); g.bezierCurveTo(91, -99, 91, -76, 80, -74); g.closePath(); };
const CUP_TIERS = [[0, -104, 79, 17], [4, -126, 61, 15], [7, -145, 43, 13], [9, -160, 23, 10]];
const CUP_SPR = [[[-52, -104, 0.5], [-20, -99, 2.2], [24, -103, 1.0], [58, -99, 2.6]], [[-30, -127, 1.9], [12, -121, 0.4], [44, -127, 2.4]], [[-14, -146, 0.9], [24, -142, 2.0]], []];

export const cupcake = {
  id: 'cupcake', color: '#72d9c2', skillColor: '#ffd23f', k: 0.89,
  slideRot: -0.42, slideSy: 0.64,
  H: 170, W: 176, legLen: 34, stride: 22, lift: 22,
  hips: { near: [-14, -6], far: [14, -8] },
  shoulders: { near: [-67, -48], far: [68, -50] },
  leg: { w: 18, len: 36, color: '#7fdcc4', shoe: { color: '#7a4429', sole: '#ffe9d6', cap: '#93583a', lace: '#ffe9d6' } },
  arm: { w: 15, len: 30, color: '#86dfc8', hand: 11.5 },
  face: { x: 2, y: -48, shift: 14, sp: 46, es: 1.05, ex: 0.9, ey: 1.08, my: 22, ms: 0.95, bx: 35, by: 13, bs: 1.0, blushColor: 'rgba(255,92,130,0.45)' },
  sweatAt: [60, -100],
  runMouth: 'grin', idleMouth: 'smile',
  tuckCy: 98,
  tuckScale: 0.84,
  hullShapes: [CUP_SHAPE, CUP_CAKE, ...CUP_TIERS.map(([x, y, rx, ry]) => ellipse(x, y, rx, ry))],
  body(R) {
    const { c, m, pose } = R; const A = pose.acc || {};
    // paper cup with pleated stripes
    cel(c, m, CUP_SHAPE, {
      fill: CUP.cup, shade: CUP.cupShade, sdx: 10, sdy: 8, light: '#b5f0df', ldx: 6, ldy: 5, lightAlpha: 0.7,
      details: (g) => {
        for (let i = -6; i <= 5; i += 2) {
          const x0 = i * 12.6, x1 = (i + 1) * 12.6;
          fillL(g, m, (cc) => { cc.moveTo(x0, -82); cc.lineTo(x1, -82); cc.lineTo(x1 * 0.78, 2); cc.lineTo(x0 * 0.78, 2); cc.closePath(); }, CUP.stripe, 0.75);
        }
        for (let i = -6; i <= 6; i++) strokeL(g, m, (cc) => { cc.moveTo(i * 12.6, -80); cc.lineTo(i * 12.6 * 0.78, 0); }, 2.5, CUP.cupShade, 0.45);
      },
    });
    R.face();
    // chocolate cake muffin-top
    cel(c, m, CUP_CAKE, { fill: CUP.cake, shade: CUP.cakeShade, sdx: 6, sdy: 6, light: CUP.cakeLight, ldx: 5, ldy: 4, lightAlpha: 0.8, lw: 5.5,
      details: (g) => { for (const [x, y] of [[-62, -84], [-30, -80], [18, -82], [56, -86], [72, -80]]) fillL(g, m, circle(x, y, 2.6), '#4a2414', 0.6); } });
    // frosting swirl tiers (jiggle with lag up the swirl)
    const wob = (A.wob || 0) * (pose.anim === 'run' ? 1 : 0.6);
    CUP_TIERS.forEach(([x, y, rx, ry], k) => {
      const dx = -wob * (1.5 + k * 1.8);
      const sh = ellipse(x + dx, y, rx, ry);
      cel(c, m, sh, {
        fill: CUP.fr, shade: CUP.frShade, sdx: 6, sdy: 6, light: CUP.frLight, ldx: 4, ldy: 4, lightAlpha: 0.85, lw: 5.5,
        details: (g) => { CUP_SPR[k].forEach(([sx, sy, a], j) => sprinkle(g, m, sx + dx, sy, a, SPRINKLE_COLS[(k * 3 + j) % SPRINKLE_COLS.length], 10, 4.6)); },
        after: (g) => { strokeL(g, m, (cc) => { cc.ellipse(x + dx - rx * 0.12, y - ry * 0.18, rx * 0.68, ry * 0.55, 0, Math.PI * 1.12, Math.PI * 1.55); }, 4, '#ffffff', 0.75); },
      });
    });
  },
  over(R) {
    const { c, pose } = R; const A = pose.acc || {};
    const wob = (A.wob || 0) * (pose.anim === 'run' ? 1 : 0.6);
    cherry(c, R.P(10 - wob * 7.5, -167), pose.rot - 0.05 - 0.3 * (A.sway || 0), 15);
  },
  auraBack(c, k) { auraBase(c, k, this.skillColor); },
  auraFront(c, k) { // lucky sprinkle: coins
    const cs = k ? [[42, 84, 12, 0.55], [244, 70, 13, 1], [250, 186, 11, 0.4], [30, 196, 10, 1]] : [[48, 56, 13, 1], [236, 110, 12, 0.5], [34, 150, 11, 0.75], [248, 214, 10, 1]];
    cs.forEach(([x, y, r, sq]) => coin(c, x, y, r, sq));
    twinkles(c, k, [[110, 30, 8, 0.2], [190, 26, 9, 1.4], [258, 140, 7, 0.6]], '#fff6c8');
  },
};

// =============================================================================
//  COTTON — cotton-candy cloud (pink -> sky blue), star hair clip, thin legs
// =============================================================================
const COT_PUFFS = [[0, -94, 58], [-50, -128, 30], [-6, -140, 31], [42, -132, 29], [68, -98, 27], [58, -58, 29], [16, -34, 29], [-30, -36, 29], [-64, -66, 28], [-72, -104, 26]];
const COT_SHAPE = (g) => { for (const [x, y, r] of COT_PUFFS) { g.moveTo(x + r, y); g.arc(x, y, r, 0, TAU); } };
const COT_GRAD = [-58, -160, 52, -30, [[0, '#ffaed6'], [0.38, '#f2b2e8'], [0.68, '#bcc6ff'], [1, '#8fd0ff']]];

export const cotton = {
  id: 'cotton', color: '#a8d4ff', skillColor: '#7ff0ff', k: 0.965,
  H: 171, W: 184, legLen: 50, stride: 25, lift: 26,
  hips: { near: [-14, -12], far: [14, -14] },
  shoulders: { near: [-70, -64], far: [72, -68] },
  leg: { w: 9.5, len: 52, color: '#fff6fc', farColor: '#e9dff2', lw: 5, taper: 1, shoe: { color: '#ff8fc4', sole: '#ffffff', lace: '#ffffff', scale: 0.95 } },
  arm: { w: 14, len: 29, color: '#ffc0df', hand: 11.5, handColor: '#ffc8e4' },
  face: { x: 7, y: -98, shift: 16, sp: 52, es: 1.12, ex: 0.88, ey: 1.1, my: 24, ms: 1.0, bx: 40, by: 14, bs: 1.15, blushColor: 'rgba(255,80,150,0.42)' },
  sweatAt: [64, -152],
  runMouth: 'grin', idleMouth: 'cat',
  tuckCy: 92,
  hullShapes: [COT_SHAPE],
  body(R) {
    const { c, m } = R;
    cel(c, m, COT_SHAPE, {
      fill: '#e6b6f2', grad: COT_GRAD, under: true,
      mul: true, shade: '#e0cff2', sdx: 11, sdy: 12, light: '#ffffff', ldx: 7, ldy: 7, lightAlpha: 0.75,
      details: (g) => {
        // creases where puffs sit on the main mass
        for (const k of [1, 2, 3, 9]) { const [x, y, r] = COT_PUFFS[k]; strokeL(g, m, (cc) => cc.arc(x, y, r - 1, 0.55, 2.55), 3.2, '#a77bd0', 0.38); }
        for (const k of [5, 6, 7]) { const [x, y, r] = COT_PUFFS[k]; strokeL(g, m, (cc) => cc.arc(x, y, r - 1, 3.6, 5.6), 3.2, '#7f9fe0', 0.32); }
      },
      after: (g) => {
        for (const k of [1, 2, 9, 8]) { const [x, y, r] = COT_PUFFS[k]; strokeL(g, m, (cc) => cc.arc(x, y, r - 8, Math.PI * 1.08, Math.PI * 1.45), 4.5, '#ffffff', 0.7); }
        glintL(g, m, -52, -138, 5, -0.8, 0.9);
      },
    });
    R.face();
  },
  over(R) {
    const { c, pose } = R; const A = pose.acc || {};
    const [x, y] = R.P(38, -150);
    const m = M.chain(M.T(x, y), M.R(pose.rot + 0.28 + 0.12 * (A.sway || 0)));
    cel(c, m, star(0, 0, 16, 7.5, 5, -Math.PI / 2, 0.9), { fill: '#ffd84a', shade: '#f0a52c', sdx: 3, sdy: 3, light: '#fff3a8', ldx: 2, ldy: 2, lw: 4.5,
      after: (g) => glintL(g, m, -4, -5, 3, -0.7, 0.95) });
  },
  auraBack(c, k) { auraBase(c, k, this.skillColor); },
  auraFront(c, k) { // cloud cushion: bubble shield + little bubbles
    bubble(c, 144, 150, k ? 122 : 116, '#9ff3ff', 0.85);
    const bs = k ? [[38, 88, 9], [250, 64, 7], [252, 214, 10]] : [[30, 150, 8], [246, 112, 10], [56, 40, 7]];
    bs.forEach(([x, y, r]) => bubble(c, x, y, r, '#c8fbff', 1));
    twinkles(c, k, [[120, 24, 8, 0.3], [24, 230, 7, 1.2]], '#ffffff');
  },
};

export const CAST2 = [marsh, cupcake, cotton];
