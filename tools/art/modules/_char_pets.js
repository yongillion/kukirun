// =============================================================================
//  Dessert Dash — pet drawings (twinkle, buzzy, puff, oink, pop). SPEC §1 / §3.2
//  Not an export module (underscore prefix). Used by pets.js.
//  Each pet: draw(c, st) where st = { k, bob, flap, sq, act } ; faces right (+x).
// =============================================================================
import { OUTLINE, tone, rgba, circle, ellipse, star, rrect, glow, sparkle, eye, mouth, blush, TAU, lerp, smooth } from '../lib.js';
import { M, setT, cel, strokeL, fillL, glossL, glintL, tubeShape, qpts, bendPts } from './_char_rig.js';
import { coin, starJelly } from './_char_kit.js';

export const PW = 160, PH = 160;
const LWP = 5;
const ID = (c) => c.setTransform(1, 0, 0, 1, 0, 0);

/** Pet face (same family style as the runners, scaled down). m = face-centre matrix. */
function petFace(c, m, o = {}) {
  const sp = o.sp ?? 30, es = o.es ?? 0.78;
  const kind = o.eyes || 'open';
  if (o.blush !== false) for (const side of [-1, 1]) {
    setT(c, M.mul(m, M.chain(M.T(side * (o.bx ?? 24) * (side > 0 ? 0.9 : 1), o.by ?? 9), M.S(side > 0 ? 0.8 : 1, 1))));
    blush(c, 0, 0, o.bs ?? 0.72, o.blushColor || 'rgba(255,90,120,0.45)');
  }
  for (const side of [-1, 1]) {
    setT(c, M.mul(m, M.chain(M.T(side * sp / 2 - (side > 0 ? 1.5 : 0), 0), M.S((side > 0 ? 0.84 : 0.96) * 0.9, 1.1))));
    eye(c, 0, 0, es, kind, -side, o.look || [2, 0]);
  }
  if (o.mouth !== null) { setT(c, M.mul(m, M.T(o.mx ?? 2, o.my ?? 15))); mouth(c, 0, 0, o.ms ?? 0.7, o.mouth || 'smile'); }
  ID(c);
}

/** Translucent insect/fairy wing pointing along +x of matrix m. */
function wing(c, m, len, w, far = false) {
  const sh = (g) => { g.moveTo(0, 0); g.bezierCurveTo(len * 0.25, -w * 1.05, len * 0.95, -w * 0.95, len, -w * 0.05); g.bezierCurveTo(len * 0.98, w * 0.55, len * 0.35, w * 0.6, 0, 0); g.closePath(); };
  c.save(); ID(c);
  setT(c, m); c.beginPath(); sh(c); ID(c);
  c.fillStyle = far ? 'rgba(196,232,255,0.55)' : 'rgba(225,246,255,0.72)'; c.fill();
  c.lineWidth = 3.5; c.strokeStyle = far ? 'rgba(74,42,26,0.6)' : 'rgba(74,42,26,0.85)'; c.lineJoin = 'round'; c.stroke();
  setT(c, m); c.beginPath(); c.moveTo(len * 0.12, -w * 0.05); c.quadraticCurveTo(len * 0.5, -w * 0.35, len * 0.82, -w * 0.3); ID(c);
  c.lineWidth = 2.5; c.strokeStyle = 'rgba(120,170,210,0.55)'; c.stroke();
  setT(c, m); c.beginPath(); c.ellipse(len * 0.42, -w * 0.45, len * 0.16, w * 0.16, -0.2, 0, TAU); ID(c);
  c.fillStyle = 'rgba(255,255,255,0.8)'; c.fill();
  c.restore();
}
/** Little feathered wing (piggy). */
function featherWing(c, m, s = 1, far = false) {
  const sh = (g) => {
    g.moveTo(0, 0); g.bezierCurveTo(6 * s, -20 * s, 26 * s, -30 * s, 38 * s, -24 * s);
    g.quadraticCurveTo(36 * s, -16 * s, 30 * s, -14 * s); g.quadraticCurveTo(32 * s, -6 * s, 24 * s, -4 * s);
    g.quadraticCurveTo(24 * s, 3 * s, 14 * s, 3 * s); g.quadraticCurveTo(6 * s, 6 * s, 0, 0); g.closePath();
  };
  const col = far ? '#e6e6f2' : '#ffffff';
  cel(c, m, sh, { fill: col, shade: far ? '#c9c9dc' : '#dcdcef', sdx: 3, sdy: 3, lw: 4.5 });
}

// =============================================================================
//  TWINKLE — little yellow star sprite with translucent wings (spawns star jellies)
// =============================================================================
function starShape(ro, ri) {
  const pts = [];
  for (let i = 0; i < 10; i++) { const r = i % 2 ? ri : ro; const a = -Math.PI / 2 + (i / 10) * TAU; pts.push([Math.cos(a) * r, Math.sin(a) * r]); }
  return smooth(pts, true, 0.32);
}
const TW_STAR = starShape(47, 29.5);
export const twinkle = {
  id: 'twinkle', color: '#ffd84a',
  draw(c, st) {
    const act = st.act;
    const cx = act ? 70 : 76, cy = 80 + st.bob;
    if (act) { glow(c, cx, cy, 58, '#fff2a0', 0.8); }
    // sparkle trail behind
    const tr = act ? [[cx - 50, cy + 24, 6], [cx - 56, cy + 6, 4.5]] : [[cx - 50, cy + 20, 6 - st.k % 2], [cx - 60, cy + 30, 4 + st.k % 2]];
    for (const [x, y, r] of tr) sparkle(c, x, y, r, '#fff6c0', 0.95);
    wing(c, M.chain(M.T(cx - 18, cy - 20), M.R(-2.35 + st.flap * 0.8)), 36, 18, true);
    const m = M.chain(M.T(cx, cy), M.R(-0.12 + (act ? 0.08 * (st.k - 4.5) : 0)), M.S(st.sq, 2 - st.sq));
    cel(c, m, TW_STAR, {
      fill: '#ffd84a', shade: '#f2a52a', sdx: 8, sdy: 9, light: '#fff3a6', ldx: 5, ldy: 5, lightAlpha: 0.9, lw: LWP,
      after: (g) => { glossL(g, m, -18, -22, 11, 6, -0.7, 0.6); glintL(g, m, -24, -12, 4, -0.8, 0.95); },
    });
    wing(c, M.chain(M.T(cx - 12, cy - 24), M.R(-1.75 + st.flap)), 40, 20, false);
    petFace(c, M.mul(m, M.T(6, 2)), { sp: 30, es: 0.8, eyes: act ? 'happy' : 'open', mouth: act ? 'grin' : 'smile', my: 14, ms: 0.72, bx: 22, by: 10 });
    if (act) { // a line of star jellies popping out ahead
      const js = st.k === 4 ? [[cx + 60, cy - 30, 10.5], [cx + 66, cy + 6, 9.5]] : [[cx + 58, cy - 40, 11], [cx + 68, cy - 6, 10.5], [cx + 62, cy + 28, 9.5]];
      for (const [x, y, r] of js) starJelly(c, x, y, r, 0.2, '#ffe066', 3.5);
      for (const [x, y, r] of [[cx - 30, cy - 50, 7], [cx + 34, cy + 44, 6], [cx - 44, cy + 36, 5]]) sparkle(c, x, y, r * (st.k === 4 ? 1 : 1.3), '#ffffff', 0.95);
    }
  },
};

// =============================================================================
//  BUZZY — chubby round bee carrying a tiny milk bottle (drops a small milk)
// =============================================================================
function milkBottle(c, m) {
  const body = (g) => { rrect(-11, -9, 22, 27, 8)(g); };
  const neck = (g) => { rrect(-6.5, -17, 13, 10, 3)(g); };
  cel(c, m, neck, { fill: '#ffffff', shade: '#d9e4f2', sdx: 2, sdy: 2, lw: 4 });
  cel(c, m, rrect(-8, -22, 16, 7, 3), { fill: '#6cc0ff', shade: '#3f8fe0', sdx: 2, sdy: 2, lw: 4 });
  cel(c, m, body, {
    fill: '#ffffff', shade: '#d9e4f2', sdx: 4, sdy: 4, lw: 4.5,
    details: (g) => { fillL(g, m, rrect(-14, 0, 28, 9, 0), '#8fd0ff'); fillL(g, m, circle(0, 4.5, 3.2), '#ffffff'); },
    after: (g) => glintL(g, m, -5, -3, 2.6, -1.2, 0.95),
  });
}
export const buzzy = {
  id: 'buzzy', color: '#ffd23f',
  draw(c, st) {
    const act = st.act;
    const cx = 76, cy = (act ? 76 : 78) + st.bob;
    const m = M.chain(M.T(cx, cy), M.S(st.sq * 0.9, (2 - st.sq) * 0.9));
    // far wing
    wing(c, M.chain(M.T(cx - 8, cy - 26), M.R(-2.45 + st.flap * 0.6)), 30, 14, true);
    // stinger
    cel(c, M.T(cx - 41, cy + 4), (g) => { g.moveTo(4, -7); g.quadraticCurveTo(-8, -3, -13, 1); g.quadraticCurveTo(-8, 5, 4, 7); g.closePath(); }, { fill: '#6a3c22', shade: false, lw: 4.5 });
    // bottle + arms
    const held = !act;
    const bm = held ? M.chain(M.T(cx + 6, cy + 42 - st.bob * 0.3), M.R(0.08)) : M.chain(M.T(cx + 8 + (st.k - 4) * 2, cy + 48 + (st.k - 4) * 5), M.R(0.3 + (st.k - 4) * 0.2));
    const armCol = '#ffd23f';
    const arm = (p0, p1) => cel(c, M.I, tubeShape(qpts(p0, [(p0[0] + p1[0]) / 2 + 3, (p0[1] + p1[1]) / 2], p1, 6), 5, 4.6), { fill: armCol, shade: tone(armCol, -0.2), sdx: 2, sdy: 2, lw: 4.5 });
    if (held) { arm([cx - 6, cy + 26], M.ap(bm, -10, -6)); }
    if (!held) { // motion streaks above the falling bottle
      const [bx, by] = M.ap(bm, 0, -20);
      c.save(); c.strokeStyle = 'rgba(255,255,255,0.9)'; c.lineWidth = 4; c.lineCap = 'round';
      for (const dx of [-8, 0, 8]) { c.beginPath(); c.moveTo(bx + dx, by - 6); c.lineTo(bx + dx - 2, by - 18 + Math.abs(dx) * 0.5); c.stroke(); }
      c.restore();
    }
    milkBottle(c, bm);
    // body + stripes
    cel(c, m, ellipse(0, 0, 41, 38), {
      fill: '#ffd23f', shade: '#eea12a', sdx: 8, sdy: 8, light: '#fff0a0', ldx: 5, ldy: 5, lightAlpha: 0.85, lw: LWP,
      details: (g) => {
        for (const x of [-8, -27]) fillL(g, m, (cc) => { cc.moveTo(x - 7, -50); cc.quadraticCurveTo(x - 13, 0, x - 7, 50); cc.lineTo(x + 6, 50); cc.quadraticCurveTo(x, 0, x + 6, -50); cc.closePath(); }, '#6a3c22');
      },
      after: (g) => { glossL(g, m, -14, -22, 12, 6, -0.5, 0.6); glintL(g, m, -20, -14, 3.6, -0.7, 0.9); },
    });
    if (held) arm([cx + 10, cy + 31], M.ap(bm, 9, -4));
    // antennae
    for (const [x0, y0, x1, y1] of [[6, -34, 3, -52], [18, -31, 24, -48]]) {
      const p0 = M.ap(m, x0, y0), p1 = M.ap(m, x1, y1);
      cel(c, M.I, tubeShape(qpts(p0, [(p0[0] + p1[0]) / 2 + 3, (p0[1] + p1[1]) / 2], p1, 6), 2.4, 2.2), { fill: '#6a3c22', shade: false, lw: 4 });
      cel(c, M.T(p1[0], p1[1]), circle(0, 0, 5.5), { fill: '#6a3c22', shade: false, light: '#a0663e', ldx: 1.5, ldy: 1.5, lw: 4 });
    }
    // near wing
    wing(c, M.chain(M.T(cx - 2, cy - 28), M.R(-2.05 + st.flap * 0.7)), 33, 16, false);
    petFace(c, M.mul(m, M.T(17, -2)), { sp: 28, es: 0.74, eyes: act ? 'happy' : 'open', mouth: act ? 'grin' : 'smile', my: 13, ms: 0.66, bx: 20, by: 9 });
  },
};

// =============================================================================
//  PUFF — tiny fluffy cloud with a red horseshoe-magnet charm (short magnet)
// =============================================================================
const PUFF_C = [[-32, 6, 22], [-12, -10, 28], [18, -9, 26], [38, 6, 19], [10, 12, 24], [-16, 16, 20]];
const PUFF_SHAPE = (g) => { for (const [x, y, r] of PUFF_C) { g.moveTo(x + r, y); g.arc(x, y, r, 0, TAU); } };
function magnet(c, m, glowOn) {
  if (glowOn) { const [x, y] = M.ap(m, 0, 2); glow(c, x, y, 34, '#ff7a7a', 0.7); }
  // U (opening down): tube along the top half circle
  const pts = []; for (let i = 0; i <= 16; i++) { const a = Math.PI + (i / 16) * Math.PI; pts.push(M.ap(m, Math.cos(a) * 14, Math.sin(a) * 14 + 4)); }
  cel(c, M.I, tubeShape(pts, 7.8, 7.8), { fill: '#ff4a4a', shade: '#c92a3a', sdx: 3, sdy: 3, light: '#ff9a8a', ldx: 2, ldy: 2, lw: 4.5,
    after: (g) => { const q = M.ap(m, -9, -7); glintL(g, M.T(q[0], q[1]), 0, 0, 2.6, -0.7, 0.9); } });
  for (const sx of [-14, 14]) cel(c, m, rrect(sx - 7.8, 4, 15.6, 11, 3), { fill: '#eef3fa', shade: '#b8c4d6', sdx: 2, sdy: 2, lw: 4.5 });
}
export const puff = {
  id: 'puff', color: '#f4f2ff',
  draw(c, st) {
    const act = st.act;
    const cx = 76, cy = 66 + st.bob;
    const m = M.chain(M.T(cx, cy), M.S(st.sq, 2 - st.sq));
    // cord necklace + horseshoe-magnet pendant (drawn over the cloud, see below)
    const sw = act ? 0.2 : -0.1 * Math.cos(TAU * st.k / 4);
    const top = M.ap(m, 14, 26);
    const mm = M.chain(M.T(top[0], top[1]), M.R(-0.42 + sw), M.T(0, 15));
    cel(c, m, PUFF_SHAPE, {
      fill: '#ffffff', shade: '#dfe2f6', sdx: 8, sdy: 9, light: '#ffffff', lw: LWP, under: true,
      details: (g) => { for (const k of [1, 2]) { const [x, y, r] = PUFF_C[k]; strokeL(g, m, (cc) => cc.arc(x, y, r - 1, 0.6, 2.5), 3, '#b8bde0', 0.45); } },
      after: (g) => { for (const k of [0, 1]) { const [x, y, r] = PUFF_C[k]; strokeL(g, m, (cc) => cc.arc(x, y, r - 7, Math.PI * 1.1, Math.PI * 1.45), 4, '#eef4ff', 0.9); } },
    });
    petFace(c, M.mul(m, M.T(10, -4)), { sp: 30, es: 0.76, eyes: act ? 'determined' : (st.k === 2 ? 'closed' : 'open'), mouth: act ? 'grin' : 'cat', my: 13, ms: 0.7, bx: 23, by: 8 });
    // cord
    const c0 = M.ap(m, -16, 22), c1 = M.ap(m, 42, 17);
    c.save(); c.lineCap = 'round'; c.strokeStyle = OUTLINE; c.lineWidth = 5.5;
    c.beginPath(); c.moveTo(c0[0], c0[1]); c.quadraticCurveTo(top[0] - 4, top[1] + 10, c1[0], c1[1]); c.stroke();
    c.strokeStyle = '#ff7a7a'; c.lineWidth = 2.5;
    c.beginPath(); c.moveTo(c0[0], c0[1]); c.quadraticCurveTo(top[0] - 4, top[1] + 10, c1[0], c1[1]); c.stroke();
    c.restore();
    if (act) { // magnetic waves pulling forward
      const [x, y] = M.ap(mm, 0, 10);
      c.save(); c.lineCap = 'round';
      for (let i = 0; i < 3; i++) {
        const r = 22 + i * 10 + (st.k === 5 ? 5 : 0);
        c.strokeStyle = rgba(i % 2 ? '#ffd23f' : '#ff6f6f', 0.9 - i * 0.22); c.lineWidth = 5 - i;
        c.beginPath(); c.arc(x, y, r, -0.7, 0.75); c.stroke();
      }
      c.restore();
    }
    magnet(c, mm, act);
    if (act) for (const [x, y, r] of [[cx - 48, cy - 28, 6], [cx + 54, cy - 30, 7]]) sparkle(c, x, y, r * (st.k === 4 ? 1 : 1.25), '#fff6c8', 0.95);
  },
};

// =============================================================================
//  OINK — pink piggy bank with little wings and a coin slot (drops coins)
// =============================================================================
export const oink = {
  id: 'oink', color: '#ffa6c4',
  draw(c, st) {
    const act = st.act;
    const cx = 76, cy = 90 + st.bob;
    const m = M.chain(M.T(cx, cy), M.R(act ? -0.06 : 0), M.S(st.sq, 2 - st.sq));
    const pink = '#ffa6c4', pinkS = '#ec789f', pinkL = '#ffd0df';
    const o = { fill: pink, shade: pinkS, sdx: 4, sdy: 4, light: pinkL, ldx: 2, ldy: 2, lightAlpha: 0.8, lw: 4.5 };
    // far wing, tail, far legs, far ear
    featherWing(c, M.mul(m, M.chain(M.T(-14, -26), M.R(-0.5 + st.flap * 0.7), M.S(-1, 1))), 0.82, true);
    const tp = [M.ap(m, -44, -2), M.ap(m, -56, -12), M.ap(m, -52, -22)];
    cel(c, M.I, tubeShape(qpts(...tp, 8), 3.4, 3), { ...o, shade: false });
    const tip = M.ap(m, -52, -22); cel(c, M.T(tip[0] + 2, tip[1] + 1), circle(0, 0, 5.5), { ...o, shade: false, light: false, lw: 4 });
    for (const [x, y] of [[-26, 30], [16, 32]]) cel(c, M.mul(m, M.T(x, y)), rrect(-7, -6, 14, 15, 6), { ...o, fill: pinkS, shade: tone(pinkS, -0.15), light: false });
    cel(c, M.mul(m, M.T(-2, -32)), (g) => { g.moveTo(-9, 4); g.quadraticCurveTo(-8, -12, 2, -14); g.quadraticCurveTo(8, -6, 9, 4); g.closePath(); }, { ...o, fill: pinkS, light: false });
    // coins popping out of the slot
    if (act) {
      const cs = st.k === 4 ? [[-10, -60, 11, 0.85]] : [[-26, -66, 11, 0.55], [4, -58, 10.5, 1]];
      for (const [x, y, r, sq] of cs) { const [X, Y] = M.ap(m, x, y); coin(c, X, Y, r, sq); }
    }
    // body
    cel(c, m, ellipse(0, 0, 47, 37), {
      fill: pink, shade: pinkS, sdx: 8, sdy: 9, light: pinkL, ldx: 5, ldy: 5, lightAlpha: 0.85, lw: LWP,
      details: (g) => { fillL(g, m, rrect(-20, -38, 22, 9, 4.5), '#c45c82'); }, // coin slot
      after: (g) => { strokeL(g, m, rrect(-18.5, -36, 19, 5.5, 2.75), 3, '#7a3048', 0.95); glossL(g, m, -20, -18, 13, 7, -0.5, 0.6); glintL(g, m, -28, -10, 3.6, -0.7, 0.9); },
    });
    // near legs
    for (const [x, y] of [[-12, 33], [30, 29]]) cel(c, M.mul(m, M.T(x, y)), rrect(-7.5, -6, 15, 15, 6), { ...o });
    // snout
    const sm = M.mul(m, M.T(44, 4));
    cel(c, sm, ellipse(0, 0, 11, 13.5), { ...o, fill: '#ffb8cf', shade: pinkS, lw: 4.5,
      after: (g) => { fillL(g, sm, ellipse(-1, -4, 2.6, 3.6), '#a8406a'); fillL(g, sm, ellipse(-1, 5, 2.6, 3.6), '#a8406a'); } });
    // near ear
    cel(c, M.mul(m, M.chain(M.T(16, -31), M.R(0.25))), (g) => { g.moveTo(-10, 5); g.quadraticCurveTo(-9, -13, 3, -15); g.quadraticCurveTo(10, -6, 10, 5); g.closePath(); }, { ...o, details: (g) => fillL(g, M.mul(m, M.chain(M.T(16, -31), M.R(0.25))), (cc) => { cc.moveTo(-5, 3); cc.quadraticCurveTo(-4, -8, 2, -9); cc.quadraticCurveTo(6, -3, 6, 3); cc.closePath(); }, '#ff8fb3') });
    // near wing
    featherWing(c, M.mul(m, M.chain(M.T(-8, -22), M.R(-0.4 + st.flap * 0.75))), 0.9, false);
    petFace(c, M.mul(m, M.T(16, -4)), { sp: 26, es: 0.72, eyes: act ? 'happy' : 'open', mouth: act ? 'grin' : 'smile', mx: 6, my: 14, ms: 0.62, bx: 20, by: 9, blushColor: 'rgba(240,60,110,0.42)' });
  },
};

// =============================================================================
//  POP — striped candy firework rocket with a sparking fuse (blasts obstacles)
// =============================================================================
const POP_BODY = (g) => { g.moveTo(-36, -22); g.lineTo(20, -22); g.quadraticCurveTo(28, -22, 32, -16); g.lineTo(32, 16); g.quadraticCurveTo(28, 22, 20, 22); g.lineTo(-36, 22); g.quadraticCurveTo(-42, 22, -42, 14); g.lineTo(-42, -14); g.quadraticCurveTo(-42, -22, -36, -22); g.closePath(); };
const POP_NOSE = (g) => { g.moveTo(28, -21); g.bezierCurveTo(44, -20, 58, -9, 60, 0); g.bezierCurveTo(58, 9, 44, 20, 28, 21); g.closePath(); };
function sparkBurst(c, x, y, r, k) {
  glow(c, x, y, r * 2.2, '#ffd25a', 0.85);
  const n = 8;
  c.save(); c.lineCap = 'round';
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU + k * 0.4; const r1 = r * (i % 2 ? 0.7 : 1.15);
    c.strokeStyle = i % 2 ? '#ff8a3a' : '#ffe066'; c.lineWidth = 3.4;
    c.beginPath(); c.moveTo(x + Math.cos(a) * r * 0.25, y + Math.sin(a) * r * 0.25); c.lineTo(x + Math.cos(a) * r1, y + Math.sin(a) * r1); c.stroke();
  }
  c.restore();
  sparkle(c, x, y, r * 0.75, '#ffffff', 1, k * 0.3);
}
export const pop = {
  id: 'pop', color: '#ff4a5f',
  draw(c, st) {
    const act = st.act;
    const cx = (act ? 90 : 84), cy = 80 + st.bob;
    const m = M.chain(M.T(cx, cy), M.R(-0.14 + (act ? -0.04 : 0.04 * Math.sin(TAU * st.k / 4))), M.S(act ? 0.92 : 0.9, act ? 0.87 : 0.9));
    if (act) { // blast flame from the tail
      const fm = M.mul(m, M.T(-46, 0));
      const L = st.k === 4 ? 32 : 40;
      cel(c, fm, (g) => { g.moveTo(0, -16); g.bezierCurveTo(-L * 0.4, -20, -L * 0.85, -10, -L, 0); g.bezierCurveTo(-L * 0.85, 10, -L * 0.4, 20, 0, 16); g.closePath(); }, { fill: '#ff8a3a', shade: false, lw: 4.5 });
      cel(c, fm, (g) => { g.moveTo(0, -9); g.bezierCurveTo(-L * 0.3, -11, -L * 0.6, -5, -L * 0.7, 0); g.bezierCurveTo(-L * 0.6, 5, -L * 0.3, 11, 0, 9); g.closePath(); }, { fill: '#ffe066', shade: false, noOutline: true });
    } else { // fuse with a sparkle at its tip
      const f0 = M.ap(m, -42, 0), f1 = M.ap(m, -51, -6 + (st.k % 2) * 4), f2 = M.ap(m, -58, 2);
      cel(c, M.I, tubeShape(qpts(f0, f1, f2, 8), 3, 2.6), { fill: '#8a5a3a', shade: false, lw: 4 });
      sparkBurst(c, f2[0], f2[1], 9 + (st.k % 2) * 2, st.k);
    }
    // fins (back)
    const fin = (sy) => (g) => { g.moveTo(-36, sy * 17); g.quadraticCurveTo(-44, sy * 28, -52, sy * 36); g.quadraticCurveTo(-36, sy * 36, -16, sy * 20); g.closePath(); };
    cel(c, m, fin(-1), { fill: '#4fb8ff', shade: '#2f86d6', sdx: 3, sdy: 3, light: '#a6dcff', ldx: 2, ldy: 2, lw: 4.5 });
    cel(c, m, fin(1), { fill: '#3a9ae8', shade: '#2a6fbf', sdx: 3, sdy: 3, lw: 4.5 });
    // nose cone
    cel(c, m, POP_NOSE, { fill: '#ffd23f', shade: '#eea12a', sdx: 5, sdy: 5, light: '#fff0a0', ldx: 3, ldy: 3, lw: LWP,
      after: (g) => glintL(g, m, 38, -8, 3.4, -0.6, 0.9) });
    // striped candy body
    cel(c, m, POP_BODY, {
      fill: '#ffffff', shade: '#f0d6dc', sdx: 5, sdy: 6, lw: LWP, mul: true,
      details: (g) => {
        for (let x = -66; x < 40; x += 16) fillL(g, m, (cc) => { cc.moveTo(x, -26); cc.lineTo(x + 8, -26); cc.lineTo(x + 24, 26); cc.lineTo(x + 16, 26); cc.closePath(); }, '#ff4a5f');
      },
      after: (g) => { glossL(g, m, -6, -12, 22, 4.5, 0, 0.75); },
    });
    // round porthole face plate (keeps the face readable over the stripes)
    cel(c, m, circle(4, 0, 18.5), { fill: '#fffaf6', shade: '#efdde0', sdx: 3, sdy: 3, lw: 4.5 });
    const fm = M.mul(m, M.chain(M.T(4, -3), M.S(1 / 0.9)));
    petFace(c, fm, { sp: 19, es: 0.56, eyes: act ? 'determined' : 'open', mouth: act ? 'shout' : 'grin', my: 9.5, ms: 0.46, bx: 13, by: 6, bs: 0.45, look: [2, 0] });
    if (act) {
      for (const [x, y, r] of [[cx + 6, cy - 46, 7], [cx - 30, cy + 42, 6], [cx + 46, cy + 30, 5]]) sparkle(c, x, y, r * (st.k === 4 ? 1 : 1.3), '#fff2b0', 1);
    }
  },
};

export const PETS = [twinkle, buzzy, puff, oink, pop];
