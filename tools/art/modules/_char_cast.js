// =============================================================================
//  Dessert Dash — runner cast part 1: chip, maca, pudding, donut.
//  Not an export module (underscore prefix). Used by characters.js.
//  Body shapes are authored in LOCAL space: origin = bottom-centre of the body
//  (hip line), +x = facing direction, body extends up to y = -H.
// =============================================================================
import { OUTLINE, tone, rng, smooth, blobPoints, circle, ellipse, star, TAU, lerp } from '../lib.js';
import { M, cel, strokeL, fillL, glossL, glintL, tubeShape, mulColor } from './_char_rig.js';
import {
  ribbonTail, cherry, strawberry, sprinkle, SPRINKLE_COLS, wavyBand, auraBase, twinkles, chocoChunk,
  flower, starJelly, plusSign, swoosh,
} from './_char_kit.js';

// =============================================================================
//  CHIP — round chocolate-chip cookie, red knitted scarf, brown sneakers
// =============================================================================
const CHIP_SHAPE = smooth(blobPoints(0, -86, 86, 86, 22, 0.016, rng(1101)), true);
const CHIP_CHUNKS = [ // x, y, r, rot  (avoiding the face zone and the scarf band)
  [-50, -136, 12.5, 0.3], [-68, -96, 11, -0.6], [-20, -160, 9.5, 0.9], [30, -153, 11.5, 1.4],
  [68, -126, 9, 0.2], [-12, -136, 7.5, 2.1], [-38, -16, 10, 0.6], [34, -14, 9, 2.4], [74, -84, 7, 1.1],
];
const CHIP_CHUNK_SHAPES = CHIP_CHUNKS.map(([x, y, r, rot], i) => smooth(blobPoints(x, y, r, r * 0.86, 6, 0.2, rng(77 + i), rot), true));
const CHIP_SPECKS = (() => {
  const r = rng(4242); const out = [];
  for (let i = 0; i < 26; i++) {
    const a = r() * TAU, d = Math.sqrt(r()) * 78; const x = Math.cos(a) * d, y = -86 + Math.sin(a) * d;
    if (x > -30 && x < 64 && y > -132 && y < -66) continue; if (y > -84 && y < -36) continue;
    out.push([x, y, 1.8 + r() * 1.6]);
  }
  return out;
})();
const SCARF = { base: '#e8423f', shade: '#b52a35', light: '#ff8a76', rib: '#c3303a' };
const CB_TOP = (x) => -78 + 12 * (1 - (x / 88) ** 2);
const CB_BOT = (x) => -54 + 13 * (1 - (x / 80) ** 2);
const CHIP_BAND = (g) => { // knitted band wrapped under the face (smile curve = seen slightly from above)
  const r = 90, cy = -86;
  const aT = Math.asin(8 / r), aB = Math.asin(32 / r);
  const xT = r * Math.cos(aT), xB = r * Math.cos(aB);
  g.moveTo(-xT, cy + r * Math.sin(aT));
  for (let k = 1; k <= 14; k++) { const x = -xT + (2 * xT) * k / 14; g.lineTo(x, CB_TOP(x)); }
  g.arc(0, cy, r, aT, aB, false);
  for (let k = 1; k <= 14; k++) { const x = xB - (2 * xB) * k / 14; g.lineTo(x, CB_BOT(x)); }
  g.arc(0, cy, r, Math.PI - aB, Math.PI - aT, false);
  g.closePath();
};

export const chip = {
  id: 'chip', color: '#e3a35a', skillColor: '#ff9a3c',
  H: 172, W: 172, legLen: 40, stride: 24, lift: 24,
  hips: { near: [-13, -12], far: [14, -14] },
  shoulders: { near: [-80, -58], far: [82, -60] },
  armUnder: true,
  leg: { w: 19, len: 42, color: '#dc9c55', shoe: { color: '#8e5634', sole: '#fff1df', cap: '#ae6e42', lace: '#fff1df' } },
  arm: { w: 15, len: 30, color: '#e3a35a', hand: 11.5 },
  face: { x: 2, y: -110, shift: 18, sp: 50, es: 1.15, ex: 0.86, ey: 1.12, eyeY: 0, mx: 3, my: 25, ms: 1.05, bx: 38, by: 14, bs: 1.15, blushColor: 'rgba(255,92,92,0.42)' },
  sweatAt: [64, -150],
  runMouth: 'grin',
  tuckCy: 86,
  hullShapes: [CHIP_SHAPE, circle(-84, -66, 16)],
  body(R) {
    const { c, m } = R;
    const base = '#e8a95e';
    cel(c, m, CHIP_SHAPE, {
      fill: base, mul: true, shade: mulColor(base, '#c4803f'), sdx: 13, sdy: 15,
      light: '#fad596', ldx: 9, ldy: 10, lightAlpha: 0.9,
      details: (g) => {
        for (const [x, y, r] of CHIP_SPECKS) fillL(g, m, circle(x, y, r), '#c98a48', 0.75);
        for (const sh of CHIP_CHUNK_SHAPES) cel(g, m, sh, { fill: '#5e321d', shade: false, light: '#8f5535', ldx: 3, ldy: 3, lw: 3.2, outline: '#3d1f12' });
      },
      after: (g) => { glintL(g, m, -58, -132, 6.5, -0.9, 0.85); },
    });
    R.face();
  },
  back(R) {
    const { c, pose } = R; const A = pose.acc;
    const k0 = R.P(-86, -66);
    const curl = A.curl ? -1.6 : 0;
    const L = A.portrait ? 0.62 : A.curl ? 0.72 : 1; // short tails in the portrait close-up / tucked ball
    ribbonTail(c, [k0[0] + 2, k0[1] + 8], A.dir - 0.36 + (A.sway || 0) * 0.06, 30 * L, 15, A.amp, (A.phase || 0) + 0.3, SCARF, { fringe: '#d8363d', ribs: 2, curl });
    ribbonTail(c, [k0[0], k0[1] - 2], A.dir + 0.1 - (A.sway || 0) * 0.05, 39 * L, 16, A.amp, (A.phase || 0), SCARF, { fringe: '#d8363d', ribs: 3, curl });
  },
  over(R) {
    const { c, m } = R;
    cel(c, m, CHIP_BAND, {
      fill: SCARF.base, shade: SCARF.shade, sdx: 6, sdy: 7, light: SCARF.light, ldx: 4, ldy: 4, lightAlpha: 0.8, lw: 5.5,
      details: (g) => {
        for (let x = -72; x <= 76; x += 16) {
          const t0 = CB_TOP(x) + 5, b0 = CB_BOT(x) - 5;
          strokeL(g, m, (cc) => { cc.moveTo(x - 1, t0); cc.quadraticCurveTo(x + 2, (t0 + b0) / 2, x - 1, b0); }, 3.2, SCARF.rib, 0.85);
        }
      },
    });
    const km = M.mul(m, M.T(-84, -66)); // knot at the back-left
    cel(c, km, (g) => { g.moveTo(13, 0); g.ellipse(0, 0, 13, 14.5, 0, 0, TAU); }, {
      fill: SCARF.base, shade: SCARF.shade, sdx: 4, sdy: 5, light: SCARF.light, ldx: 3, ldy: 3, lw: 5.5,
      details: (g) => { strokeL(g, km, (cc) => { cc.moveTo(-4, -10); cc.quadraticCurveTo(2, 0, -3, 10); }, 3.2, SCARF.rib, 0.85); },
    });
  },
  auraBack(c, k) { auraBase(c, k, this.skillColor); },
  auraFront(c, k) { // glossy chocolate-chunk jellies raining down
    const list = k ? [[50, 78, 0.4, 1], [232, 96, 1.8, 0.9], [38, 176, 2.4, 0.8], [246, 196, 0.9, 0.85]] : [[60, 50, 1.1, 0.95], [222, 58, 2.6, 1], [32, 134, 0.2, 0.85], [252, 142, 1.6, 0.8]];
    list.forEach(([x, y, rot, s], j) => chocoChunk(c, x, y, rot, s, 500 + j));
    twinkles(c, k, [[100, 36, 9, 0], [196, 30, 7, 1.3], [26, 218, 7, 0.7], [256, 232, 8, 2.1]]);
  },
};

// =============================================================================
//  MACA — strawberry macaron: plump pink shells, frilly feet, cream, strawberry
// =============================================================================
const MAC = { shell: '#ffa3c6', shade: '#ef78a5', light: '#ffd7e6', foot: '#f586b0', footShade: '#d6608e', footLight: '#ffbcd5', cream: '#fff9f1', creamShade: '#efd5cf' };
const MAC_BOWL = (g) => { g.moveTo(-86, -50); g.bezierCurveTo(-87, -13, -52, 0, 0, 0); g.bezierCurveTo(52, 0, 87, -13, 86, -50); g.closePath(); };
const MAC_FOOT_B = wavyBand(-90, 90, -60, -45, 1.4, 2.6, 12, 0);
const MAC_CREAM = wavyBand(-97, 97, -79, -55, 2.2, 2.8, 26, 0.8);
const MAC_DOME = (g) => { g.moveTo(-88, -82); g.bezierCurveTo(-90, -138, -52, -164, 0, -164); g.bezierCurveTo(52, -164, 90, -138, 88, -82); g.closePath(); };
const MAC_FOOT_T = wavyBand(-90, 90, -91, -76, 2.6, 1.4, 12, 2.2);
function macFrill(c, m, shape, yMid) {
  cel(c, m, shape, {
    fill: MAC.foot, shade: MAC.footShade, sdx: 4, sdy: 5, light: MAC.footLight, ldx: 3, ldy: 3, lightAlpha: 0.75, lw: 5,
    details: (g) => { // bubbly "feet" texture
      for (let x = -80, j = 0; x <= 82; x += 10, j++) fillL(g, m, circle(x, yMid + (j % 2 ? 2 : -2), 2.6), MAC.footLight, 0.9);
    },
  });
}

export const maca = {
  id: 'maca', color: '#ff9cc0', skillColor: '#ff6fc0', k: 0.9,
  slideRot: -0.33, slideSy: 0.66,
  H: 164, W: 192, legLen: 38, stride: 22, lift: 22,
  hips: { near: [-16, -8], far: [16, -10] },
  shoulders: { near: [-84, -52], far: [84, -54] },
  armUnder: true,
  leg: { w: 18, len: 40, color: '#ffa0c4', shoe: { color: '#fff4ec', sole: '#ff9cc0', strap: '#ff6f9f' } },
  arm: { w: 15, len: 30, color: '#ffa3c6', hand: 11.5 },
  face: { x: 2, y: -122, shift: 16, sp: 54, es: 1.12, ex: 0.88, ey: 1.1, my: 24, ms: 1.0, bx: 40, by: 13, bs: 1.15, blushColor: 'rgba(236,58,112,0.4)' },
  sweatAt: [70, -152],
  runMouth: 'grin', idleMouth: 'cat',
  tuckCy: 84,
  hullShapes: [MAC_BOWL, MAC_CREAM, MAC_DOME],
  body(R) {
    const { c, m } = R;
    cel(c, m, MAC_BOWL, { fill: MAC.shell, shade: MAC.shade, sdx: 11, sdy: 10, light: MAC.light, ldx: 7, ldy: 6, lightAlpha: 0.8 });
    macFrill(c, m, MAC_FOOT_B, -52);
  },
  over(R) {
    const { c, m, pose } = R;
    cel(c, m, MAC_CREAM, {
      fill: MAC.cream, shade: MAC.creamShade, sdx: 6, sdy: 7, light: '#ffffff', ldx: 4, ldy: 4, lw: 5.5,
      after: (g) => glossL(g, m, -40, -71, 22, 4.5, -0.05, 0.9),
    });
    cel(c, m, MAC_DOME, {
      fill: MAC.shell, shade: MAC.shade, sdx: 12, sdy: 13, light: MAC.light, ldx: 8, ldy: 8, lightAlpha: 0.85,
      after: (g) => { glossL(g, m, -44, -136, 24, 11, -0.55, 0.55); glintL(g, m, -58, -122, 6, -0.9, 0.9); },
    });
    macFrill(c, m, MAC_FOOT_T, -83);
    R.face();
    const A = pose.acc || {};
    strawberry(c, R.P(-8, -161), pose.rot + 0.1 + 0.22 * (A.sway || 0), 1.05);
  },
  auraBack(c, k) { auraBase(c, k, this.skillColor); },
  auraFront(c, k) { // sweet bloom: flowers + star jellies
    const fl = k ? [[44, 70, 13, 0.3], [244, 120, 12, 1.1]] : [[52, 96, 12, 0.8], [238, 62, 13, 0.1]];
    fl.forEach(([x, y, r, a]) => flower(c, x, y, r, '#ff8ccc', a));
    const st = k ? [[236, 196, 12, 0.3], [34, 186, 10, -0.2]] : [[30, 160, 11, 0.2], [252, 200, 10, -0.3]];
    st.forEach(([x, y, r, a]) => starJelly(c, x, y, r, a));
    twinkles(c, k, [[96, 34, 8, 0.4], [190, 28, 9, 1.1], [262, 236, 6, 2.2]]);
  },
};

// =============================================================================
//  PUDDING — custard flan dome, glossy dripping caramel top, cherry
// =============================================================================
const PUD = { custard: '#ffd862', shade: '#efa83f', light: '#fff2ae', car: '#c4652a', carShade: '#8e3d17', carLight: '#ea9a50' };
const PUD_SHAPE = (g) => {
  g.moveTo(-68, 0); g.lineTo(68, 0);
  g.quadraticCurveTo(86, 0, 85, -17);
  g.bezierCurveTo(83, -62, 72, -110, 65, -128);
  g.quadraticCurveTo(60, -146, 40, -147);
  g.lineTo(-40, -147);
  g.quadraticCurveTo(-60, -146, -65, -128);
  g.bezierCurveTo(-72, -110, -83, -62, -85, -17);
  g.quadraticCurveTo(-86, 0, -68, 0);
  g.closePath();
};
const PUD_DRIPS = [[-60, 22, 8.5], [-33, 10, 8], [2, 12, 8.5], [36, 9, 8], [64, 18, 8]];
const pudDripY = (x) => { let y = -117 + 2.5 * Math.sin(x / 10); for (const [cx, len, w] of PUD_DRIPS) { const u = (x - cx) / w; if (Math.abs(u) < 2) y += len * Math.exp(-u * u * 1.4); } return y; };
const PUD_CAR = (g) => { g.moveTo(-110, -230); g.lineTo(110, -230); for (let x = 110; x >= -110; x -= 2) g.lineTo(x, pudDripY(x)); g.closePath(); };

export const pudding = {
  id: 'pudding', color: '#ffd45e', skillColor: '#8ef06a', k: 0.95,
  slideRot: -0.36, slideSy: 0.66,
  H: 147, W: 172, legLen: 38, stride: 23, lift: 23,
  hips: { near: [-16, -8], far: [16, -10] },
  shoulders: { near: [-80, -54], far: [80, -57] },
  leg: { w: 19, len: 40, color: '#ffd35a', shoe: { style: 'boot', color: '#c4692e', sole: '#7a3a18', lace: null } },
  arm: { w: 15, len: 30, color: '#ffd862', hand: 11.5 },
  face: { x: 4, y: -78, shift: 16, sp: 56, es: 1.12, ex: 0.88, ey: 1.1, my: 24, ms: 1.0, bx: 41, by: 14, bs: 1.15, blushColor: 'rgba(255,110,90,0.42)' },
  sweatAt: [62, -128],
  runMouth: 'grin', idleMouth: 'smile',
  tuckCy: 74,
  hullShapes: [PUD_SHAPE],
  pose(p) { // wobbly custard: the top lags behind body motion
    const A = p.acc || {};
    if (p.anim === 'run') p.kx += 0.05 * (A.wob || 0);
    else if (p.anim === 'idle') p.kx += 0.03 * (A.wob || 0);
    else if (p.anim === 'jump') p.kx += 0.06;
    else if (p.anim === 'fall') p.kx -= 0.05;
    else if (p.anim === 'land') { p.kx -= 0.03; p.sx *= 1.02; }
    else if (p.anim === 'cheer') p.kx += p.frame === 27 ? -0.05 : 0.05;
    else if (p.anim === 'pit') p.kx += p.frame === 19 ? 0.05 : -0.05;
  },
  body(R) {
    const { c, m } = R;
    cel(c, m, PUD_SHAPE, {
      fill: PUD.custard, mul: true, shade: mulColor(PUD.custard, PUD.shade), sdx: 12, sdy: 12, light: PUD.light, ldx: 8, ldy: 7, lightAlpha: 0.9,
      details: (g) => {
        cel(g, m, PUD_CAR, {
          fill: PUD.car, shade: PUD.carShade, sdx: 8, sdy: 7, light: PUD.carLight, ldx: 5, ldy: 6, lightAlpha: 0.85, lw: 5,
          after: (gg) => {
            fillL(gg, m, ellipse(0, -141, 54, 7.5), '#f4b06a', 0.55); // flat top catching light
            glossL(gg, m, -36, -132, 20, 7, -0.25, 0.75);
            glintL(gg, m, -48, -125, 5, -0.6, 0.95);
            glintL(gg, m, 52, -108, 3, -0.6, 0.8);
          },
        });
      },
      after: (g) => glossL(g, m, -58, -70, 8, 20, 0.12, 0.45),
    });
    R.face();
  },
  over(R) {
    const { c, pose } = R; const A = pose.acc || {};
    cherry(c, R.P(8, -146), pose.rot - 0.05 - 0.32 * (A.sway || 0), 17);
  },
  auraBack(c, k) { auraBase(c, k, this.skillColor); },
  auraFront(c, k) { // caramel heal: rising plus signs
    const pl = k ? [[42, 92, 13], [242, 70, 11], [252, 178, 9]] : [[40, 150, 11], [236, 112, 13], [70, 46, 9]];
    pl.forEach(([x, y, r]) => plusSign(c, x, y, r, '#7ee35c'));
    twinkles(c, k, [[110, 30, 8, 0.2], [204, 36, 9, 1.4], [28, 224, 7, 0.6], [258, 236, 7, 2.0]], '#f4ffd8');
  },
};

// =============================================================================
//  DONUT — upright ring donut: pink drippy glaze, sprinkles, blue sweatband
// =============================================================================
const DON = { dough: '#eab26e', doughShade: '#c4854a', doughLight: '#f9dcaa', glaze: '#ff70ac', glazeShade: '#e04a8c', glazeLight: '#ffb3d1', band: '#3f90ea', bandShade: '#2a66bf', bandLight: '#8cc4ff' };
const DON_C = [0, -86], DON_R = 86, DON_HOLE = [0, -50, 20];
const DON_RING = (g) => {
  g.moveTo(DON_C[0] + DON_R, DON_C[1]); g.arc(DON_C[0], DON_C[1], DON_R, 0, TAU);
  g.moveTo(DON_HOLE[0] + DON_HOLE[2], DON_HOLE[1]); g.arc(DON_HOLE[0], DON_HOLE[1], DON_HOLE[2], 0, TAU, true);
};
const DON_GLAZE = (() => {
  const drips = [[0.25, 7], [0.95, 6], [1.6, 8], [2.3, 6], [2.95, 7], [3.6, 5], [5.9, 5]];
  const rOut = (a) => { let r = 75.5 + 2.2 * Math.sin(6 * a + 0.4); for (const [da, len] of drips) { let d = Math.atan2(Math.sin(a - da), Math.cos(a - da)); r += len * Math.exp(-((d / 0.11) ** 2)); } return Math.min(r, 83); };
  const outer = []; for (let i = 0; i < 72; i++) { const a = (i / 72) * TAU; outer.push([DON_C[0] + Math.cos(a) * rOut(a), DON_C[1] + Math.sin(a) * rOut(a)]); }
  const inner = []; for (let i = 0; i < 36; i++) { const a = -(i / 36) * TAU; const r = 29 + 1.8 * Math.sin(5 * a); inner.push([DON_HOLE[0] + Math.cos(a) * r, DON_HOLE[1] + Math.sin(a) * r]); }
  const so = smooth(outer, true), si = smooth(inner, true);
  return (g) => { so(g); si(g); };
})();
const DON_SPRINKLES = (() => {
  const r = rng(909); const out = [];
  for (let n = 0; out.length < 18 && n < 400; n++) {
    const a = r() * TAU, d = 34 + r() * 40; const x = DON_C[0] + Math.cos(a) * d, y = DON_C[1] + Math.sin(a) * d;
    if (Math.hypot(x - DON_HOLE[0], y - DON_HOLE[1]) < 36) continue;
    if (x > -48 && x < 68 && y > -128 && y < -74) continue; // face
    if (y < -124 && y > -160) continue; // under the band
    if (out.some(([px, py]) => Math.hypot(px - x, py - y) < 17)) continue;
    out.push([x, y, r() * Math.PI, SPRINKLE_COLS[out.length % SPRINKLE_COLS.length]]);
  }
  return out;
})();
// forehead sweatband: a band between two gently arched curves, ends tucked around the ring edge
const DB_TOP = (x) => -152 + 7 * (x / 70) ** 2;
const DB_BOT = (x) => -129 + 7 * (x / 76) ** 2;
const DB_R = 89;
const dbEnd = (f) => { let lo = 0, hi = DB_R; for (let i = 0; i < 40; i++) { const x = (lo + hi) / 2; if (x * x + (f(x) - DON_C[1]) ** 2 < DB_R * DB_R) lo = x; else hi = x; } return lo; };
const DB_XT = dbEnd(DB_TOP), DB_XB = dbEnd(DB_BOT);
const DON_BAND = (g) => {
  const aT = Math.atan2(DB_TOP(DB_XT) - DON_C[1], DB_XT), aB = Math.atan2(DB_BOT(DB_XB) - DON_C[1], DB_XB);
  g.moveTo(-DB_XT, DB_TOP(-DB_XT));
  for (let k = 1; k <= 16; k++) { const x = -DB_XT + 2 * DB_XT * k / 16; g.lineTo(x, DB_TOP(x)); }
  g.arc(DON_C[0], DON_C[1], DB_R, aT, aB, false);
  for (let k = 1; k <= 16; k++) { const x = DB_XB - 2 * DB_XB * k / 16; g.lineTo(x, DB_BOT(x)); }
  g.arc(DON_C[0], DON_C[1], DB_R, Math.PI - aB, Math.PI - aT, false);
  g.closePath();
};
const DB_MID = (x) => (DB_TOP(x) + DB_BOT(x)) / 2;

export const donut = {
  id: 'donut', color: '#ff6fa8', skillColor: '#4fb6ff',
  H: 172, W: 172, legLen: 40, stride: 24, lift: 25,
  hips: { near: [-14, -6], far: [14, -8] },
  shoulders: { near: [-83, -64], far: [84, -68] },
  leg: { w: 19, len: 42, color: '#e6ac68', shoe: { color: '#3f90ea', sole: '#ffffff', stripe: '#ffffff', lace: '#ffffff' } },
  arm: { w: 15, len: 30, color: '#eab26e', hand: 11.5 },
  face: { x: 3, y: -106, shift: 17, sp: 52, es: 1.1, ex: 0.88, ey: 1.1, my: 21, ms: 1.0, bx: 39, by: 12, bs: 1.1, blushColor: 'rgba(214,40,96,0.38)' },
  sweatAt: [64, -152],
  runMouth: 'grin', idleMouth: 'smile',
  tuckCy: 86,
  hullShapes: [circle(DON_C[0], DON_C[1], DON_R)],
  body(R) {
    const { c, m } = R;
    cel(c, m, DON_RING, {
      fill: DON.dough, shade: DON.doughShade, sdx: 11, sdy: 12, light: DON.doughLight, ldx: 7, ldy: 7, lightAlpha: 0.9,
      details: (g) => {
        cel(g, m, DON_GLAZE, {
          fill: DON.glaze, shade: DON.glazeShade, sdx: 8, sdy: 9, light: DON.glazeLight, ldx: 6, ldy: 6, lightAlpha: 0.85, lw: 4.5,
          details: (gg) => { for (const [x, y, a, col] of DON_SPRINKLES) sprinkle(gg, m, x, y, a, col, 11, 4.8); },
          after: (gg) => { glossL(gg, m, -46, -118, 18, 9, -0.8, 0.6); glintL(gg, m, -56, -104, 5.5, -0.9, 0.9); },
        });
      },
    });
    cel(c, m, DON_BAND, {
      fill: DON.band, shade: DON.bandShade, sdx: 5, sdy: 7, light: DON.bandLight, ldx: 3, ldy: 4, lightAlpha: 0.8, lw: 5.5,
      details: (g) => {
        for (let x = -66; x <= 70; x += 12) strokeL(g, m, (cc) => { cc.moveTo(x, DB_TOP(x) + 4); cc.lineTo(x + 1, DB_BOT(x) - 4); }, 2.6, DON.bandShade, 0.45);
        strokeL(g, m, (cc) => { const X = DB_XB * 0.98; cc.moveTo(-X, DB_MID(-X)); for (let k = 1; k <= 16; k++) { const x = -X + 2 * X * k / 16; cc.lineTo(x, DB_MID(x)); } }, 5, '#ffffff', 0.95);
      },
    });
    R.face();
  },
  auraBack(c, k) { auraBase(c, k, this.skillColor); },
  auraFront(c, k) { // ring roll: speed swooshes
    swoosh(c, 144, 156, 118, 96, k ? 2.2 : 2.6, k ? 3.9 : 4.3, '#bfe6ff', 8, 0.1);
    swoosh(c, 144, 156, 112, 90, k ? 5.4 : 5.8, k ? 7.0 : 7.4, '#ffffff', 7, 0.1);
    twinkles(c, k, [[30, 70, 8, 0.3], [256, 60, 9, 1.2], [24, 230, 7, 0.9], [258, 222, 8, 2.4]], '#e8f6ff');
  },
};

export const CAST1 = [chip, maca, pudding, donut];
