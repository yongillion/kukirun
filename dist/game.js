/* Dessert Dash (project kukirun) — bundled by tools/build.mjs from src/ (45 modules). Do not edit; edit src/ and rebuild. */
(function () {
'use strict';
const __mods = Object.create(null), __cache = Object.create(null);
function __def(id, fn) { __mods[id] = fn; }
function __exp(ex, g) { for (const k in g) Object.defineProperty(ex, k, { get: g[k], enumerable: true }); }
function __req(id) {
  const c = __cache[id]; if (c) return c;
  const ex = {}; __cache[id] = ex;
  const fn = __mods[id]; if (!fn) throw new Error('module not found: ' + id);
  fn(ex, __req); return ex;
}
// ---- src/config.js
__def("src/config.js", function (__exports, __req) {
__exp(__exports, { "CFG": () => CFG, "LAND_IDS": () => LAND_IDS });
// =============================================================================
//  Dessert Dash — global tuning constants (logical units: 720 px tall view)
// =============================================================================
const CFG = {
  VERSION: '1.1.0',
  SAVE_KEY: 'dessert-dash-save-v1',

  // view
  VIEW_H: 720,
  VIEW_W_MIN: 1100,
  VIEW_W_MAX: 1600,

  // world
  GROUND_Y: 600,          // walking surface
  OVERHEAD_Y: 518,        // bottom of hanging obstacles
  PLAYER_SX: 290,         // runner screen x (feet)
  DEATH_Y: 900,           // below this you fell into a pit

  // runner physics (px, s)
  GRAVITY: 3200,
  JUMP_V: 1150,
  DJUMP_V: 1050,
  FAST_FALL: 1.85,        // gravity multiplier while holding slide in the air
  MAX_FALL: 1900,
  COYOTE: 0.09,
  JUMP_BUFFER: 0.13,
  SPRING_V: 1750,

  // hitboxes (relative to feet centre)
  HIT_W: 46, HIT_H: 92,
  SLIDE_W: 72, SLIDE_H: 44,
  TUCK_H: 78,

  INVULN_HIT: 1.25,

  // pacing
  LAND_TIME: 46,                        // seconds per land
  LAND_SPEEDS: [470, 505, 540, 575, 610],
  LAP_SPEED: 45,
  MAX_SPEED: 760,

  // collectibles
  JELLY_Y: 558,           // centre height of ground jelly lines
  SLIDE_JELLY_Y: 576,
  JELLY_GAP: 42,
  ARC_LIFT: 44,           // jelly arcs float this much above the feet path
  MAGNET_R: 300,

  // energy
  DRAIN_BASE: 1.3,
  DRAIN_LAND: 0.3,
  DRAIN_LAP: 0.35,
  HIT_DAMAGE: 16,
  HIT_DAMAGE_LAND: 2,
  MILK_S: 16,
  MILK_L: 35,
  LOW_ENERGY: 0.22,

  // schedules (seconds of running between specials)
  MILK_EVERY: 11,
  MILK_EVERY_LAND: 1.2,
  BIGMILK_EVERY: 40,
  LETTER_EVERY: 6.2,
  ITEM_EVERY: 10.5,

  // power-up durations (s, before upgrades)
  DUR: { magnet: 6.5, giant: 5.5, dash: 4.2, coins: 6.0, shield: 12 },
  GIANT_SCALE: 2.3,
  DASH_MULT: 1.75,

  // bonus stage
  RUSH_TIME: 8.5,
  RUSH_SPEED: 640,

  // scoring
  SCORE: { jelly: 30, jelly_pink: 60, jelly_star: 150, jelly_choco: 120, jelly_big: 800, jelly_rainbow: 2000, jelly_giant: 8000, smash: 300 },
  COIN: { s: 1, g: 5, b: 20 },
  COMBO_MAX_BONUS: 0.5,   // +50 % at combo cap
  COMBO_CAP: 300,
};

const LAND_IDS = ['meadow', 'canyon', 'cavern', 'glacier', 'castle'];

});

// ---- src/engine/util.js
__def("src/engine/util.js", function (__exports, __req) {
__exp(__exports, { "mulberry32": () => mulberry32, "makeRand": () => makeRand, "fmt": () => fmt, "fmtShort": () => fmtShort, "hexToRgb": () => hexToRgb, "rgba": () => rgba, "mixHex": () => mixHex, "rectsOverlap": () => rectsOverlap, "circleRect": () => circleRect, "now": () => now, "buzz": () => buzz, "TAU": () => TAU, "clamp": () => clamp, "lerp": () => lerp, "invLerp": () => invLerp, "smoothstep": () => smoothstep, "approach": () => approach, "damp": () => damp, "sign": () => sign, "rand": () => rand, "Ease": () => Ease });
// =============================================================================
//  Small math / misc helpers
// =============================================================================
const TAU = Math.PI * 2;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const invLerp = (a, b, v) => (b === a ? 0 : (v - a) / (b - a));
const smoothstep = (a, b, v) => { const t = clamp(invLerp(a, b, v), 0, 1); return t * t * (3 - 2 * t); };
const approach = (v, target, delta) => (v < target ? Math.min(v + delta, target) : Math.max(v - delta, target));
const damp = (a, b, lambda, dt) => lerp(a, b, 1 - Math.exp(-lambda * dt));
const sign = (v) => (v < 0 ? -1 : 1);

function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
/** Random helper object around a [0,1) generator. */
function makeRand(gen = Math.random) {
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
const rand = makeRand();

const Ease = {
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
function fmt(n) {
  n = Math.floor(n);
  const s = Math.abs(n).toString();
  let out = '';
  for (let i = 0; i < s.length; i++) {
    if (i > 0 && (s.length - i) % 3 === 0) out += ',';
    out += s[i];
  }
  return n < 0 ? '-' + out : out;
}
function fmtShort(n) {
  if (n >= 1e9) return (n / 1e9).toFixed(1).replace(/\.0$/, '') + 'B';
  if (n >= 1e6) return (n / 1e6).toFixed(1).replace(/\.0$/, '') + 'M';
  if (n >= 1e4) return (n / 1e3).toFixed(1).replace(/\.0$/, '') + 'K';
  return fmt(n);
}

function hexToRgb(hex) {
  let h = hex.replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const n = parseInt(h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
const _rgbaCache = new Map();
function rgba(hex, a = 1) {
  const key = hex + a;
  let v = _rgbaCache.get(key);
  if (!v) {
    const [r, g, b] = hexToRgb(hex);
    v = `rgba(${r},${g},${b},${a})`;
    if (_rgbaCache.size < 4000) _rgbaCache.set(key, v);
  }
  return v;
}
function mixHex(a, b, t) {
  const A = hexToRgb(a), B = hexToRgb(b);
  const c = (i) => Math.round(A[i] + (B[i] - A[i]) * t).toString(16).padStart(2, '0');
  return '#' + c(0) + c(1) + c(2);
}

function rectsOverlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}
function circleRect(cx, cy, r, rc) {
  const nx = clamp(cx, rc.x, rc.x + rc.w);
  const ny = clamp(cy, rc.y, rc.y + rc.h);
  const dx = cx - nx, dy = cy - ny;
  return dx * dx + dy * dy <= r * r;
}

function now() { return performance.now() / 1000; }

/** Vibrate wrapper (mobile). */
function buzz(ms, enabled = true) {
  if (!enabled) return;
  try { if (navigator.vibrate) navigator.vibrate(ms); } catch (e) { /* ignore */ }
}

});

// ---- src/engine/view.js
__def("src/engine/view.js", function (__exports, __req) {
__exp(__exports, { "View": () => View });
// =============================================================================
//  View: full-window canvas with a 720-unit-tall logical coordinate system.
//  Logical width adapts to the aspect ratio (1100..1600); outside that range the
//  game is letter-/pillar-boxed. The logical area stays inside the screen's safe
//  area (notch / rounded corners). On a touch screen held upright the landscape
//  game is drawn turned 90 degrees, so it is playable even with rotation lock on.
// =============================================================================
const { CFG } = __req("src/config.js");
const { clamp } = __req("src/engine/util.js");

const TOUCH = (() => { try { return matchMedia('(pointer: coarse)').matches || ((navigator.maxTouchPoints || 0) > 0 && matchMedia('(hover: none)').matches); } catch (e) { return false; } })();

class View {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false });
    this.H = CFG.VIEW_H;
    this.W = 1280;
    this.scale = 1;
    this.ox = 0; this.oy = 0;
    this.dpr = 1;
    this.quality = 'high';
    this.rotated = false;          // portrait touch screen: landscape frame turned 90 degrees clockwise
    this.allowRotate = TOUCH;
    this.safe = { l: 0, r: 0, t: 0, b: 0 };
    this.safeOverride = null;      // ?safe=l,r,t,b (testing)
    try {
      const m = /[?&]safe=([\d.]+),([\d.]+),([\d.]+),([\d.]+)/.exec(location.search);
      if (m) this.safeOverride = { l: +m[1], r: +m[2], t: +m[3], b: +m[4] };
      if (/[?&]rotate=0/.test(location.search)) this.allowRotate = false;
      if (/[?&]rotate=1/.test(location.search)) this.allowRotate = true;
    } catch (e) { /* ignore */ }
    this._probe = null;
    this.onResize = null;
    this._resize = () => this.resize();
    window.addEventListener('resize', this._resize);
    window.addEventListener('orientationchange', () => setTimeout(this._resize, 120));
    if (window.visualViewport) window.visualViewport.addEventListener('resize', this._resize);
    this.resize();
  }

  setQuality(q) { this.quality = q; this.resize(); }

  /** CSS-px safe-area insets of the screen (env(safe-area-inset-*)), read via a hidden probe. */
  readSafe() {
    if (this.safeOverride) return this.safeOverride;
    try {
      if (!this._probe) {
        const p = document.createElement('div');
        p.setAttribute('aria-hidden', 'true');
        p.style.cssText = 'position:fixed;left:0;top:0;width:0;height:0;visibility:hidden;pointer-events:none;' +
          'padding:env(safe-area-inset-top,0px) env(safe-area-inset-right,0px) env(safe-area-inset-bottom,0px) env(safe-area-inset-left,0px)';
        document.body.appendChild(p);
        this._probe = p;
      }
      const cs = getComputedStyle(this._probe);
      return { t: parseFloat(cs.paddingTop) || 0, r: parseFloat(cs.paddingRight) || 0, b: parseFloat(cs.paddingBottom) || 0, l: parseFloat(cs.paddingLeft) || 0 };
    } catch (e) { return { l: 0, r: 0, t: 0, b: 0 }; }
  }

  resize() {
    const vv = window.visualViewport;
    const sw = Math.max(1, Math.round(vv ? vv.width : window.innerWidth));
    const sh = Math.max(1, Math.round(vv ? vv.height : window.innerHeight));
    const rot = this.allowRotate && sh > sw * 1.08;
    const s = this.readSafe();
    // the (landscape) frame we draw into, and its insets: turning the frame 90deg
    // clockwise maps screen top->frame left, bottom->right, right->top, left->bottom
    const ww = rot ? sh : sw, wh = rot ? sw : sh;
    const ins = rot ? { l: s.t, r: s.b, t: s.r, b: s.l } : s;
    this.safe = ins;
    // the bottom inset (home indicator) is not reserved: art may run underneath it
    const aw = Math.max(1, ww - ins.l - ins.r), ah = Math.max(1, wh - ins.t);
    const W = clamp(Math.round(this.H * (aw / ah)), CFG.VIEW_W_MIN, CFG.VIEW_W_MAX);
    const scale = Math.min(aw / W, ah / this.H);
    this.W = W;
    this.scale = scale;
    this.ox = Math.round(ins.l + (aw - W * scale) / 2);
    this.oy = Math.round(ins.t + (ah - this.H * scale) / 2);
    let dpr = window.devicePixelRatio || 1;
    dpr = Math.min(dpr, this.quality === 'high' ? 2.5 : 1.25);
    // pixel budget for fill-rate on huge / high-dpi screens
    const budget = this.quality === 'high' ? 4.6e6 : 2.2e6;
    const px = ww * wh * dpr * dpr;
    if (px > budget) dpr *= Math.sqrt(budget / px);
    this.dpr = dpr;
    const cw = Math.round(ww * dpr), ch = Math.round(wh * dpr);
    if (this.canvas.width !== cw || this.canvas.height !== ch) {
      this.canvas.width = cw; this.canvas.height = ch;
    }
    const st = this.canvas.style;
    st.width = ww + 'px';
    st.height = wh + 'px';
    st.transformOrigin = '0 0';
    st.transform = rot ? `translate(${sw}px, 0px) rotate(90deg)` : '';
    this.rotated = rot;
    this.ww = ww; this.wh = wh;
    if (this.onResize) this.onResize(this);
  }

  /** Prepare the context for a frame: clear letterbox, set logical transform. */
  begin() {
    const c = this.ctx;
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.globalAlpha = 1;
    c.globalCompositeOperation = 'source-over';
    if (this.ox > 0 || this.oy > 0) {
      c.fillStyle = '#1c1018';
      c.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }
    const s = this.scale * this.dpr;
    c.setTransform(s, 0, 0, s, this.ox * this.dpr, this.oy * this.dpr);
    c.save();
    c.beginPath(); c.rect(0, 0, this.W, this.H); c.clip();
    c.imageSmoothingEnabled = true;
    c.imageSmoothingQuality = this.quality === 'high' ? 'high' : 'low';
  }
  end() { this.ctx.restore(); }

  toLogical(clientX, clientY) {
    const r = this.canvas.getBoundingClientRect();
    // frame coordinates (undo the 90deg turn when rotated)
    const fx = this.rotated ? clientY - r.top : clientX - r.left;
    const fy = this.rotated ? r.right - clientX : clientY - r.top;
    return { x: (fx - this.ox) / this.scale, y: (fy - this.oy) / this.scale };
  }
}

});

// ---- src/engine/input.js
__def("src/engine/input.js", function (__exports, __req) {
__exp(__exports, { "Input": () => Input });
// =============================================================================
//  Input: keyboard, pointer (mouse/touch/pen) and gamepad -> actions/events.
// =============================================================================
const KEYMAP = {
  jump: ['Space', 'ArrowUp', 'KeyW', 'KeyZ', 'KeyJ'],
  slide: ['ArrowDown', 'KeyS', 'KeyX', 'KeyK', 'ShiftLeft', 'ShiftRight'],
  pause: ['Escape', 'KeyP'],
  confirm: ['Enter', 'NumpadEnter'],
  back: ['Escape', 'Backspace'],
  left: ['ArrowLeft', 'KeyA'],
  right: ['ArrowRight', 'KeyD'],
  up: ['ArrowUp', 'KeyW'],
  down: ['ArrowDown', 'KeyS'],
  debug: ['Backquote'],
};
const CODE_TO_ACTIONS = {};
for (const [act, codes] of Object.entries(KEYMAP)) for (const c of codes) (CODE_TO_ACTIONS[c] || (CODE_TO_ACTIONS[c] = [])).push(act);

class Input {
  constructor(view) {
    this.view = view;
    this.down = new Set();
    this.pressed = new Set();
    this.released = new Set();
    this.pointers = new Map();
    this.handler = null;          // { pointer(type, p), wheel(dy, p), key(code, action) }
    this.lastType = matchMedia && matchMedia('(pointer: coarse)').matches ? 'touch' : 'mouse';
    this.mouse = { x: -999, y: -999 };
    this.pad = { prev: [] };
    this.onFirstGesture = null;
    const cv = view.canvas;

    const gesture = () => { if (this.onFirstGesture) this.onFirstGesture(); };
    // Safari only treats some events as "user activation" for audio
    window.addEventListener('touchend', gesture, { passive: true });
    window.addEventListener('click', gesture);

    window.addEventListener('keydown', (e) => {
      gesture();
      const acts = CODE_TO_ACTIONS[e.code];
      if (acts) {
        if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Backspace'].includes(e.code)) e.preventDefault();
        if (!e.repeat) for (const a of acts) { if (!this.down.has(a)) this.pressed.add(a); this.down.add(a); }
      }
      if (!e.repeat && this.handler && this.handler.key) this.handler.key(e.code, acts || []);
    });
    window.addEventListener('keyup', (e) => {
      const acts = CODE_TO_ACTIONS[e.code];
      if (acts) for (const a of acts) {
        // keep action held if another key for it is still down
        const still = KEYMAP[a].some((c) => c !== e.code && this._codeDown && this._codeDown.has(c));
        if (!still) { this.down.delete(a); this.released.add(a); }
      }
      if (this._codeDown) this._codeDown.delete(e.code);
    });
    this._codeDown = new Set();
    window.addEventListener('keydown', (e) => this._codeDown.add(e.code));
    window.addEventListener('blur', () => { this.down.clear(); this._codeDown.clear(); this.pointers.clear(); if (this.handler && this.handler.blur) this.handler.blur(); });

    const toP = (e) => {
      const l = view.toLogical(e.clientX, e.clientY);
      return { x: l.x, y: l.y, id: e.pointerId, type: e.pointerType || 'mouse', button: e.button };
    };
    cv.addEventListener('pointerdown', (e) => {
      gesture();
      e.preventDefault();
      try { cv.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
      this.lastType = e.pointerType || 'mouse';
      const p = toP(e);
      this.pointers.set(e.pointerId, p);
      this.mouse.x = p.x; this.mouse.y = p.y;
      if (this.handler && this.handler.pointer) this.handler.pointer('down', p);
    }, { passive: false });
    cv.addEventListener('pointermove', (e) => {
      const p = toP(e);
      if (e.pointerType === 'mouse' || !e.pointerType) { this.mouse.x = p.x; this.mouse.y = p.y; }
      if (this.pointers.has(e.pointerId)) this.pointers.set(e.pointerId, p);
      if (this.handler && this.handler.pointer) this.handler.pointer('move', p);
    });
    const up = (type) => (e) => {
      const p = toP(e);
      this.pointers.delete(e.pointerId);
      if (this.handler && this.handler.pointer) this.handler.pointer(type, p);
    };
    cv.addEventListener('pointerup', up('up'));
    cv.addEventListener('pointercancel', up('cancel'));
    cv.addEventListener('lostpointercapture', (e) => { if (this.pointers.has(e.pointerId)) up('cancel')(e); });
    cv.addEventListener('contextmenu', (e) => e.preventDefault());
    cv.addEventListener('wheel', (e) => {
      e.preventDefault();
      if (this.handler && this.handler.wheel) this.handler.wheel(e.deltaY, this.mouse);
    }, { passive: false });
    // stop double-tap zoom / long-press menus on iOS
    document.addEventListener('gesturestart', (e) => e.preventDefault());
  }

  isDown(a) { return this.down.has(a); }
  wasPressed(a) { return this.pressed.has(a); }
  wasReleased(a) { return this.released.has(a); }
  consume(a) { this.pressed.delete(a); }

  /** Poll gamepads (call once per frame before game update). */
  pollPad() {
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    const gp = pads && [...pads].find((p) => p && p.connected);
    if (!gp) return;
    const b = (i) => !!(gp.buttons[i] && gp.buttons[i].pressed);
    const state = {
      jump: b(0) || b(12) || (gp.axes[1] || 0) < -0.6,
      slide: b(1) || b(2) || b(13) || (gp.axes[1] || 0) > 0.6,
      pause: b(9),
      confirm: b(0),
      back: b(1),
      left: b(14) || (gp.axes[0] || 0) < -0.6,
      right: b(15) || (gp.axes[0] || 0) > 0.6,
    };
    for (const [a, v] of Object.entries(state)) {
      const was = this.pad.prev[a];
      if (v && !was) { this.pressed.add(a); this.down.add(a); if (this.onFirstGesture) this.onFirstGesture(); }
      if (!v && was) { this.down.delete(a); this.released.add(a); }
      this.pad.prev[a] = v;
    }
  }

  endFrame() { this.pressed.clear(); this.released.clear(); }
}

});

// ---- src/data/audio_manifest.js
__def("src/data/audio_manifest.js", function (__exports, __req) {
__exp(__exports, { "AUDIO_MANIFEST": () => AUDIO_MANIFEST });
// AUTO-GENERATED by tools/audio/build.py - do not edit by hand.
// sfx gain = suggested playback gain (perceived-loudness balance). Pitch references:
//   jelly = C6 (1046.5 Hz) tick, pitch-shift along a scale for combos;
//   letter = chime rooted at C5 (523.25 Hz), pitch-shift upward per letter.
// bgm loops are exact bar multiples (dur = bars*4*60/bpm, rounded to the nearest sample):
//   loop the whole decoded buffer (source.loop = true, no loopStart/loopEnd needed).
const AUDIO_MANIFEST = {
  sfx: {
    ui_click: { file: 'sfx/ui_click', dur: 0.070, gain: 1.00 },
    ui_back: { file: 'sfx/ui_back', dur: 0.106, gain: 0.96 },
    ui_open: { file: 'sfx/ui_open', dur: 0.313, gain: 0.63 },
    ui_buy: { file: 'sfx/ui_buy', dur: 0.961, gain: 0.56 },
    ui_levelup: { file: 'sfx/ui_levelup', dur: 1.393, gain: 0.59 },
    ui_unlock: { file: 'sfx/ui_unlock', dur: 1.362, gain: 0.87 },
    ui_error: { file: 'sfx/ui_error', dur: 0.270, gain: 0.31 },
    ui_toggle: { file: 'sfx/ui_toggle', dur: 0.039, gain: 1.00 },
    ui_tick: { file: 'sfx/ui_tick', dur: 0.022, gain: 1.00 },
    ui_reward: { file: 'sfx/ui_reward', dur: 1.373, gain: 0.62 },
    ui_select: { file: 'sfx/ui_select', dur: 0.315, gain: 0.43 },
    ui_swipe: { file: 'sfx/ui_swipe', dur: 0.216, gain: 0.74 },
    jump: { file: 'sfx/jump', dur: 0.219, gain: 0.67 },
    jump2: { file: 'sfx/jump2', dur: 0.289, gain: 0.69 },
    slide: { file: 'sfx/slide', dur: 0.400, gain: 0.96 },
    land: { file: 'sfx/land', dur: 0.147, gain: 1.00 },
    jelly: { file: 'sfx/jelly', dur: 0.106, gain: 0.65 },
    jelly_big: { file: 'sfx/jelly_big', dur: 0.437, gain: 0.55 },
    jelly_rainbow: { file: 'sfx/jelly_rainbow', dur: 0.674, gain: 0.54 },
    coin: { file: 'sfx/coin', dur: 0.249, gain: 0.56 },
    coin_big: { file: 'sfx/coin_big', dur: 0.619, gain: 0.53 },
    item: { file: 'sfx/item', dur: 0.775, gain: 0.52 },
    magnet: { file: 'sfx/magnet', dur: 1.036, gain: 0.41 },
    giant_on: { file: 'sfx/giant_on', dur: 1.680, gain: 1.00 },
    giant_step: { file: 'sfx/giant_step', dur: 0.299, gain: 0.96 },
    giant_off: { file: 'sfx/giant_off', dur: 0.749, gain: 0.70 },
    dash_on: { file: 'sfx/dash_on', dur: 1.241, gain: 0.94 },
    smash: { file: 'sfx/smash', dur: 0.279, gain: 1.00 },
    convert: { file: 'sfx/convert', dur: 0.840, gain: 0.65 },
    shield_on: { file: 'sfx/shield_on', dur: 0.868, gain: 0.63 },
    shield_break: { file: 'sfx/shield_break', dur: 0.603, gain: 0.91 },
    milk: { file: 'sfx/milk', dur: 1.064, gain: 0.55 },
    letter: { file: 'sfx/letter', dur: 1.160, gain: 0.46 },
    rush_start: { file: 'sfx/rush_start', dur: 1.948, gain: 0.87 },
    rush_end: { file: 'sfx/rush_end', dur: 1.683, gain: 0.67 },
    hit: { file: 'sfx/hit', dur: 0.396, gain: 1.00 },
    low_energy: { file: 'sfx/low_energy', dur: 0.290, gain: 0.44 },
    exhausted: { file: 'sfx/exhausted', dur: 1.650, gain: 0.54 },
    fall: { file: 'sfx/fall', dur: 1.108, gain: 0.32 },
    revive: { file: 'sfx/revive', dur: 1.713, gain: 0.74 },
    relay: { file: 'sfx/relay', dur: 0.722, gain: 0.80 },
    skill: { file: 'sfx/skill', dur: 1.150, gain: 1.00 },
    skill_chip: { file: 'sfx/skill_chip', dur: 1.534, gain: 0.96 },
    skill_maca: { file: 'sfx/skill_maca', dur: 1.519, gain: 0.74 },
    skill_pudding: { file: 'sfx/skill_pudding', dur: 1.584, gain: 0.99 },
    skill_donut: { file: 'sfx/skill_donut', dur: 1.098, gain: 1.00 },
    skill_marsh: { file: 'sfx/skill_marsh', dur: 1.722, gain: 0.91 },
    skill_cupcake: { file: 'sfx/skill_cupcake', dur: 1.344, gain: 0.60 },
    skill_cotton: { file: 'sfx/skill_cotton', dur: 1.750, gain: 0.89 },
    pet: { file: 'sfx/pet', dur: 0.430, gain: 0.38 },
    spring: { file: 'sfx/spring', dur: 0.499, gain: 0.46 },
    crumble: { file: 'sfx/crumble', dur: 0.274, gain: 1.00 },
    pop_spike: { file: 'sfx/pop_spike', dur: 0.260, gain: 1.00 },
    land_change: { file: 'sfx/land_change', dur: 1.547, gain: 0.77 },
    count_beep: { file: 'sfx/count_beep', dur: 0.200, gain: 0.54 },
    count_go: { file: 'sfx/count_go', dur: 0.661, gain: 0.80 },
    new_record: { file: 'sfx/new_record', dur: 2.327, gain: 0.76 },
    spurt: { file: 'sfx/spurt', dur: 0.499, gain: 0.70 },
    combo: { file: 'sfx/combo', dur: 0.440, gain: 0.38 },
    whoosh: { file: 'sfx/whoosh', dur: 0.410, gain: 0.66 },
  },
  bgm: {
    bgm_lobby: { file: 'bgm/bgm_lobby', dur: 68.571429, loop: true, bpm: 112, gain: 1.0 },
    bgm_land1: { file: 'bgm/bgm_land1', dur: 51.2, loop: true, bpm: 150, gain: 1.0 },
    bgm_land2: { file: 'bgm/bgm_land2', dur: 49.87013, loop: true, bpm: 154, gain: 1.0 },
    bgm_land3: { file: 'bgm/bgm_land3', dur: 48.607595, loop: true, bpm: 158, gain: 1.0 },
    bgm_land4: { file: 'bgm/bgm_land4', dur: 47.407407, loop: true, bpm: 162, gain: 1.0 },
    bgm_land5: { file: 'bgm/bgm_land5', dur: 45.714286, loop: true, bpm: 168, gain: 1.0 },
    bgm_rush: { file: 'bgm/bgm_rush', dur: 20.869565, loop: true, bpm: 184, gain: 1.0 },
    bgm_result: { file: 'bgm/bgm_result', dur: 38.4, loop: true, bpm: 100, gain: 1.0 },
    jingle_over: { file: 'bgm/jingle_over', dur: 3.100, loop: false, bpm: 120, gain: 1.0 },
    jingle_clear: { file: 'bgm/jingle_clear', dur: 3.550, loop: false, bpm: 140, gain: 1.0 },
  },
};

});

// ---- src/engine/audio.js
__def("src/engine/audio.js", function (__exports, __req) {
__exp(__exports, { "AudioEngine": () => AudioEngine });
// =============================================================================
//  WebAudio mixer: SFX bus + music bus -> limiter -> speakers.
//  Audio comes from assets/audio/audiopack.js (base64 MP3s, works on file://)
//  or, if the pack is absent, from assets/audio/<file>.mp3 via fetch.
// =============================================================================
const { AUDIO_MANIFEST } = __req("src/data/audio_manifest.js");

function b64ToBuffer(b64) {
  const bin = atob(b64);
  const len = bin.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) bytes[i] = bin.charCodeAt(i);
  return bytes.buffer;
}

class AudioEngine {
  constructor() {
    const AC = window.AudioContext || window.webkitAudioContext;
    this.ok = !!AC;
    this.sfx = {}; this.bgm = {};
    this.inst = {};           // name -> [{src, g, t}]
    this.music = null; this.musicName = null; this.wantMusic = null;
    this.musicVol = 0.7; this.sfxVol = 0.9;
    this.unlocked = false;
    this.muted = false;
    if (!this.ok) return;
    this.ctx = new AC({ latencyHint: 'interactive' });
    const c = this.ctx;
    this.master = c.createGain();
    this.limiter = c.createDynamicsCompressor();
    this.limiter.threshold.value = -4; this.limiter.knee.value = 4; this.limiter.ratio.value = 8;
    this.limiter.attack.value = 0.002; this.limiter.release.value = 0.12;
    this.master.connect(this.limiter); this.limiter.connect(c.destination);
    this.musicBus = c.createGain(); this.musicBus.connect(this.master);
    this.sfxBus = c.createGain(); this.sfxBus.connect(this.master);
    this.duckGain = c.createGain(); // music ducking stage
    this.duckGain.connect(this.musicBus);
    this.setVolumes(this.musicVol, this.sfxVol);
  }

  async load(onProgress) {
    if (!this.ok) return;
    const pack = window.__DD_AUDIO__ || null;
    const jobs = [];
    for (const [name, e] of Object.entries(AUDIO_MANIFEST.sfx)) jobs.push(['sfx', name, e]);
    for (const [name, e] of Object.entries(AUDIO_MANIFEST.bgm)) jobs.push(['bgm', name, e]);
    let done = 0;
    const decode = (ab) => new Promise((resolve, reject) => {
      try {
        const p = this.ctx.decodeAudioData(ab, resolve, reject);
        if (p && p.then) p.then(resolve, reject);
      } catch (e) { reject(e); }
    });
    const runJob = async ([kind, name, e]) => {
      try {
        let ab;
        if (pack && pack[e.file]) ab = b64ToBuffer(pack[e.file]);
        else { const r = await fetch(`assets/audio/${e.file}.mp3`); ab = await r.arrayBuffer(); }
        const buf = await decode(ab);
        (kind === 'sfx' ? this.sfx : this.bgm)[name] = buf;
      } catch (err) { console.warn('audio failed', name, err); }
      done++; onProgress && onProgress(done, jobs.length);
    };
    const queue = jobs.slice();
    const workers = Array.from({ length: 4 }, async () => { while (queue.length) await runJob(queue.shift()); });
    await Promise.all(workers);
    if (pack) { try { delete window.__DD_AUDIO__; } catch (e) { window.__DD_AUDIO__ = null; } }
  }

  /** Must be called from a user gesture. */
  unlock() {
    if (!this.ok) return;
    if (this.ctx.state !== 'running') this.ctx.resume().catch(() => {});
    if (!this.unlocked) {
      this.unlocked = true;
      // iOS: play a silent buffer inside the gesture
      try { const b = this.ctx.createBuffer(1, 1, 22050); const s = this.ctx.createBufferSource(); s.buffer = b; s.connect(this.ctx.destination); s.start(0); } catch (e) { /* ignore */ }
      if (this.wantMusic) { const w = this.wantMusic; this.wantMusic = null; this.playMusic(w.name, w.opts); }
    }
  }
  suspend() { if (this.ok && this.ctx.state === 'running') this.ctx.suspend().catch(() => {}); }
  resume() { if (this.ok && this.unlocked && this.ctx.state !== 'running') this.ctx.resume().catch(() => {}); }

  setVolumes(music, sfx) {
    this.musicVol = music; this.sfxVol = sfx;
    if (!this.ok) return;
    const t = this.ctx.currentTime;
    // perceptual curve
    this.musicBus.gain.setTargetAtTime(Math.pow(music, 1.6) * 0.8, t, 0.03);
    this.sfxBus.gain.setTargetAtTime(Math.pow(sfx, 1.6), t, 0.03);
  }

  /**
   * Play a sound effect. o: { vol, rate, pan, delay, max }
   * Returns a handle with stop(fade) or null.
   */
  play(name, o = {}) {
    if (!this.ok || !this.unlocked || this.ctx.state !== 'running') return null;
    const buf = this.sfx[name];
    if (!buf) return null;
    const c = this.ctx;
    const e = AUDIO_MANIFEST.sfx[name];
    const src = c.createBufferSource();
    src.buffer = buf;
    if (o.rate && o.rate !== 1) src.playbackRate.value = o.rate;
    const g = c.createGain();
    g.gain.value = (o.vol ?? 1) * (e ? e.gain : 1);
    src.connect(g);
    let out = g;
    if (o.pan && c.createStereoPanner) { const p = c.createStereoPanner(); p.pan.value = o.pan; g.connect(p); out = p; }
    out.connect(this.sfxBus);
    const when = c.currentTime + (o.delay || 0);
    src.start(when);
    const list = this.inst[name] || (this.inst[name] = []);
    const h = { src, g, t: when, stop: (fade = 0.05) => { try { g.gain.setTargetAtTime(0, c.currentTime, fade / 3); src.stop(c.currentTime + fade); } catch (err) { /* ignore */ } } };
    list.push(h);
    const max = o.max ?? 5;
    while (list.length > max) { const old = list.shift(); old.stop(0.03); }
    src.onended = () => { const i = list.indexOf(h); if (i >= 0) list.splice(i, 1); };
    return h;
  }

  stopAll(name) { const l = this.inst[name]; if (l) { for (const h of l) h.stop(0.05); l.length = 0; } }

  playMusic(name, o = {}) {
    if (!this.ok) return;
    if (!this.unlocked || this.ctx.state !== 'running') { this.wantMusic = { name, opts: o }; if (!this.unlocked) return; }
    if (this.musicName === name && this.music && !o.restart) return;
    const c = this.ctx;
    const fade = o.fade ?? 0.6;
    this.stopMusic(fade);
    const buf = this.bgm[name];
    if (!buf) return;
    const e = AUDIO_MANIFEST.bgm[name];
    const src = c.createBufferSource();
    src.buffer = buf;
    src.loop = e ? e.loop : true;
    const g = c.createGain();
    const vol = (o.vol ?? 1) * (e ? e.gain : 1);
    g.gain.setValueAtTime(0.0001, c.currentTime);
    g.gain.exponentialRampToValueAtTime(vol, c.currentTime + Math.max(0.02, fade));
    src.connect(g); g.connect(this.duckGain);
    src.start(c.currentTime + 0.01, o.offset || 0);
    this.music = { name, src, g, vol };
    this.musicName = name;
  }

  stopMusic(fade = 0.5) {
    this.wantMusic = null;
    if (!this.music) { this.musicName = null; return; }
    const { src, g } = this.music;
    const c = this.ctx;
    try {
      g.gain.cancelScheduledValues(c.currentTime);
      g.gain.setValueAtTime(Math.max(0.0001, g.gain.value), c.currentTime);
      g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + Math.max(0.02, fade));
      src.stop(c.currentTime + fade + 0.05);
    } catch (e) { /* ignore */ }
    this.music = null; this.musicName = null;
  }

  /** Temporarily lower music (e.g. under a jingle). */
  duck(level = 0.25, attack = 0.08, hold = 1, release = 0.6) {
    if (!this.ok) return;
    const p = this.duckGain.gain, t = this.ctx.currentTime;
    p.cancelScheduledValues(t);
    p.setValueAtTime(p.value, t);
    p.linearRampToValueAtTime(level, t + attack);
    p.setValueAtTime(level, t + attack + hold);
    p.linearRampToValueAtTime(1, t + attack + hold + release);
  }

  /** One-shot music cue on the music bus (music ducked underneath). */
  jingle(name, duck = 0.15) {
    if (!this.ok || !this.unlocked) return;
    const buf = this.bgm[name];
    if (!buf) return;
    const c = this.ctx;
    const src = c.createBufferSource(); src.buffer = buf;
    const g = c.createGain(); g.gain.value = 1;
    src.connect(g); g.connect(this.musicBus);
    src.start(c.currentTime + 0.02);
    this.duck(duck, 0.1, buf.duration - 0.3, 0.8);
  }

  /** Smoothly change music playback level (e.g. pause menu). */
  musicLevel(v, time = 0.25) {
    if (!this.ok || !this.music) return;
    const g = this.music.g.gain, t = this.ctx.currentTime;
    g.cancelScheduledValues(t);
    g.setValueAtTime(Math.max(0.0001, g.value), t);
    g.linearRampToValueAtTime(Math.max(0.0001, v * this.music.vol), t + time);
  }
}

});

// ---- src/engine/tween.js
__def("src/engine/tween.js", function (__exports, __req) {
__exp(__exports, { "Tweens": () => Tweens });
// =============================================================================
//  Tiny tween + timer manager (one per scene)
// =============================================================================
const { Ease } = __req("src/engine/util.js");

class Tweens {
  constructor() { this.list = []; this.timers = []; }

  /** Tween numeric props of obj to target values. */
  to(obj, props, dur, ease = Ease.outCubic, delay = 0, onDone = null) {
    const from = {};
    for (const k of Object.keys(props)) from[k] = obj[k];
    const tw = { obj, from, props, dur: Math.max(0.0001, dur), t: -delay, ease: typeof ease === 'string' ? Ease[ease] : ease, onDone, dead: false };
    this.list.push(tw);
    return tw;
  }
  after(delay, fn) { const t = { t: delay, fn, dead: false }; this.timers.push(t); return t; }
  every(interval, fn, count = Infinity) {
    const t = { t: interval, fn: null, dead: false };
    let n = 0;
    t.fn = () => { fn(n++); if (n < count && !t.dead) { t.t = interval; this.timers.push(t); } };
    this.timers.push(t);
    return t;
  }
  kill(obj) { for (const tw of this.list) if (tw.obj === obj) tw.dead = true; }
  clear() { this.list.length = 0; this.timers.length = 0; }

  update(dt) {
    for (let i = 0; i < this.list.length; i++) {
      const tw = this.list[i];
      if (tw.dead) continue;
      tw.t += dt;
      if (tw.t < 0) continue;
      const k = Math.min(1, tw.t / tw.dur);
      const e = tw.ease(k);
      for (const p in tw.props) tw.obj[p] = tw.from[p] + (tw.props[p] - tw.from[p]) * e;
      if (k >= 1) { tw.dead = true; if (tw.onDone) tw.onDone(); }
    }
    if (this.list.length > 64) this.list = this.list.filter((t) => !t.dead);
    else for (let i = this.list.length - 1; i >= 0; i--) if (this.list[i].dead) this.list.splice(i, 1);
    const ts = this.timers;
    this.timers = [];
    for (const t of ts) {
      if (t.dead) continue;
      t.t -= dt;
      if (t.t <= 0) { t.dead = true; t.fn(); }
      else this.timers.push(t);
    }
  }
}

});

// ---- src/data/atlas_characters.js
__def("src/data/atlas_characters.js", function (__exports, __req) {
__exp(__exports, { "ATLAS_CHARACTERS": () => ATLAS_CHARACTERS });
// AUTO-GENERATED by tools/art/export.mjs from tools/art/modules/characters.js — do not edit by hand
const ATLAS_CHARACTERS = {
 "char_chip": {
  "type": "sheet",
  "src": "assets/img/characters/chip.png",
  "fw": 288,
  "fh": 288,
  "cols": 8,
  "count": 28,
  "ax": 144,
  "ay": 262,
  "scale": 2,
  "anims": {
   "run": {
    "frames": [
     0,
     1,
     2,
     3,
     4,
     5,
     6,
     7
    ],
    "fps": 14,
    "loop": true
   },
   "jump": {
    "frames": [
     8
    ]
   },
   "apex": {
    "frames": [
     9
    ]
   },
   "tuck": {
    "frames": [
     10
    ]
   },
   "fall": {
    "frames": [
     11
    ]
   },
   "slide": {
    "frames": [
     12,
     13
    ],
    "fps": 10,
    "loop": true
   },
   "land": {
    "frames": [
     14
    ]
   },
   "hurt": {
    "frames": [
     15
    ]
   },
   "down": {
    "frames": [
     16,
     17
    ],
    "fps": 3,
    "loop": false
   },
   "pit": {
    "frames": [
     18,
     19
    ],
    "fps": 8,
    "loop": true
   },
   "skill": {
    "frames": [
     20,
     21
    ],
    "fps": 8,
    "loop": true
   },
   "idle": {
    "frames": [
     22,
     23,
     24,
     25
    ],
    "fps": 6,
    "loop": true
   },
   "cheer": {
    "frames": [
     26,
     27
    ],
    "fps": 6,
    "loop": true
   }
  },
  "color": "#e3a35a",
  "skillColor": "#ff9a3c"
 },
 "portrait_chip": {
  "type": "image",
  "src": "assets/img/characters/chip_portrait.png",
  "w": 192,
  "h": 192,
  "ax": 96,
  "ay": 96,
  "scale": 2,
  "color": "#e3a35a"
 },
 "char_maca": {
  "type": "sheet",
  "src": "assets/img/characters/maca.png",
  "fw": 288,
  "fh": 288,
  "cols": 8,
  "count": 28,
  "ax": 144,
  "ay": 262,
  "scale": 2,
  "anims": {
   "run": {
    "frames": [
     0,
     1,
     2,
     3,
     4,
     5,
     6,
     7
    ],
    "fps": 14,
    "loop": true
   },
   "jump": {
    "frames": [
     8
    ]
   },
   "apex": {
    "frames": [
     9
    ]
   },
   "tuck": {
    "frames": [
     10
    ]
   },
   "fall": {
    "frames": [
     11
    ]
   },
   "slide": {
    "frames": [
     12,
     13
    ],
    "fps": 10,
    "loop": true
   },
   "land": {
    "frames": [
     14
    ]
   },
   "hurt": {
    "frames": [
     15
    ]
   },
   "down": {
    "frames": [
     16,
     17
    ],
    "fps": 3,
    "loop": false
   },
   "pit": {
    "frames": [
     18,
     19
    ],
    "fps": 8,
    "loop": true
   },
   "skill": {
    "frames": [
     20,
     21
    ],
    "fps": 8,
    "loop": true
   },
   "idle": {
    "frames": [
     22,
     23,
     24,
     25
    ],
    "fps": 6,
    "loop": true
   },
   "cheer": {
    "frames": [
     26,
     27
    ],
    "fps": 6,
    "loop": true
   }
  },
  "color": "#ff9cc0",
  "skillColor": "#ff6fc0"
 },
 "portrait_maca": {
  "type": "image",
  "src": "assets/img/characters/maca_portrait.png",
  "w": 192,
  "h": 192,
  "ax": 96,
  "ay": 96,
  "scale": 2,
  "color": "#ff9cc0"
 },
 "char_pudding": {
  "type": "sheet",
  "src": "assets/img/characters/pudding.png",
  "fw": 288,
  "fh": 288,
  "cols": 8,
  "count": 28,
  "ax": 144,
  "ay": 262,
  "scale": 2,
  "anims": {
   "run": {
    "frames": [
     0,
     1,
     2,
     3,
     4,
     5,
     6,
     7
    ],
    "fps": 14,
    "loop": true
   },
   "jump": {
    "frames": [
     8
    ]
   },
   "apex": {
    "frames": [
     9
    ]
   },
   "tuck": {
    "frames": [
     10
    ]
   },
   "fall": {
    "frames": [
     11
    ]
   },
   "slide": {
    "frames": [
     12,
     13
    ],
    "fps": 10,
    "loop": true
   },
   "land": {
    "frames": [
     14
    ]
   },
   "hurt": {
    "frames": [
     15
    ]
   },
   "down": {
    "frames": [
     16,
     17
    ],
    "fps": 3,
    "loop": false
   },
   "pit": {
    "frames": [
     18,
     19
    ],
    "fps": 8,
    "loop": true
   },
   "skill": {
    "frames": [
     20,
     21
    ],
    "fps": 8,
    "loop": true
   },
   "idle": {
    "frames": [
     22,
     23,
     24,
     25
    ],
    "fps": 6,
    "loop": true
   },
   "cheer": {
    "frames": [
     26,
     27
    ],
    "fps": 6,
    "loop": true
   }
  },
  "color": "#ffd45e",
  "skillColor": "#8ef06a"
 },
 "portrait_pudding": {
  "type": "image",
  "src": "assets/img/characters/pudding_portrait.png",
  "w": 192,
  "h": 192,
  "ax": 96,
  "ay": 96,
  "scale": 2,
  "color": "#ffd45e"
 },
 "char_donut": {
  "type": "sheet",
  "src": "assets/img/characters/donut.png",
  "fw": 288,
  "fh": 288,
  "cols": 8,
  "count": 28,
  "ax": 144,
  "ay": 262,
  "scale": 2,
  "anims": {
   "run": {
    "frames": [
     0,
     1,
     2,
     3,
     4,
     5,
     6,
     7
    ],
    "fps": 14,
    "loop": true
   },
   "jump": {
    "frames": [
     8
    ]
   },
   "apex": {
    "frames": [
     9
    ]
   },
   "tuck": {
    "frames": [
     10
    ]
   },
   "fall": {
    "frames": [
     11
    ]
   },
   "slide": {
    "frames": [
     12,
     13
    ],
    "fps": 10,
    "loop": true
   },
   "land": {
    "frames": [
     14
    ]
   },
   "hurt": {
    "frames": [
     15
    ]
   },
   "down": {
    "frames": [
     16,
     17
    ],
    "fps": 3,
    "loop": false
   },
   "pit": {
    "frames": [
     18,
     19
    ],
    "fps": 8,
    "loop": true
   },
   "skill": {
    "frames": [
     20,
     21
    ],
    "fps": 8,
    "loop": true
   },
   "idle": {
    "frames": [
     22,
     23,
     24,
     25
    ],
    "fps": 6,
    "loop": true
   },
   "cheer": {
    "frames": [
     26,
     27
    ],
    "fps": 6,
    "loop": true
   }
  },
  "color": "#ff6fa8",
  "skillColor": "#4fb6ff"
 },
 "portrait_donut": {
  "type": "image",
  "src": "assets/img/characters/donut_portrait.png",
  "w": 192,
  "h": 192,
  "ax": 96,
  "ay": 96,
  "scale": 2,
  "color": "#ff6fa8"
 },
 "char_marsh": {
  "type": "sheet",
  "src": "assets/img/characters/marsh.png",
  "fw": 288,
  "fh": 288,
  "cols": 8,
  "count": 28,
  "ax": 144,
  "ay": 262,
  "scale": 2,
  "anims": {
   "run": {
    "frames": [
     0,
     1,
     2,
     3,
     4,
     5,
     6,
     7
    ],
    "fps": 14,
    "loop": true
   },
   "jump": {
    "frames": [
     8
    ]
   },
   "apex": {
    "frames": [
     9
    ]
   },
   "tuck": {
    "frames": [
     10
    ]
   },
   "fall": {
    "frames": [
     11
    ]
   },
   "slide": {
    "frames": [
     12,
     13
    ],
    "fps": 10,
    "loop": true
   },
   "land": {
    "frames": [
     14
    ]
   },
   "hurt": {
    "frames": [
     15
    ]
   },
   "down": {
    "frames": [
     16,
     17
    ],
    "fps": 3,
    "loop": false
   },
   "pit": {
    "frames": [
     18,
     19
    ],
    "fps": 8,
    "loop": true
   },
   "skill": {
    "frames": [
     20,
     21
    ],
    "fps": 8,
    "loop": true
   },
   "idle": {
    "frames": [
     22,
     23,
     24,
     25
    ],
    "fps": 6,
    "loop": true
   },
   "cheer": {
    "frames": [
     26,
     27
    ],
    "fps": 6,
    "loop": true
   }
  },
  "color": "#f7d6e4",
  "skillColor": "#c79bff"
 },
 "portrait_marsh": {
  "type": "image",
  "src": "assets/img/characters/marsh_portrait.png",
  "w": 192,
  "h": 192,
  "ax": 96,
  "ay": 96,
  "scale": 2,
  "color": "#f7d6e4"
 },
 "char_cupcake": {
  "type": "sheet",
  "src": "assets/img/characters/cupcake.png",
  "fw": 288,
  "fh": 288,
  "cols": 8,
  "count": 28,
  "ax": 144,
  "ay": 262,
  "scale": 2,
  "anims": {
   "run": {
    "frames": [
     0,
     1,
     2,
     3,
     4,
     5,
     6,
     7
    ],
    "fps": 14,
    "loop": true
   },
   "jump": {
    "frames": [
     8
    ]
   },
   "apex": {
    "frames": [
     9
    ]
   },
   "tuck": {
    "frames": [
     10
    ]
   },
   "fall": {
    "frames": [
     11
    ]
   },
   "slide": {
    "frames": [
     12,
     13
    ],
    "fps": 10,
    "loop": true
   },
   "land": {
    "frames": [
     14
    ]
   },
   "hurt": {
    "frames": [
     15
    ]
   },
   "down": {
    "frames": [
     16,
     17
    ],
    "fps": 3,
    "loop": false
   },
   "pit": {
    "frames": [
     18,
     19
    ],
    "fps": 8,
    "loop": true
   },
   "skill": {
    "frames": [
     20,
     21
    ],
    "fps": 8,
    "loop": true
   },
   "idle": {
    "frames": [
     22,
     23,
     24,
     25
    ],
    "fps": 6,
    "loop": true
   },
   "cheer": {
    "frames": [
     26,
     27
    ],
    "fps": 6,
    "loop": true
   }
  },
  "color": "#72d9c2",
  "skillColor": "#ffd23f"
 },
 "portrait_cupcake": {
  "type": "image",
  "src": "assets/img/characters/cupcake_portrait.png",
  "w": 192,
  "h": 192,
  "ax": 96,
  "ay": 96,
  "scale": 2,
  "color": "#72d9c2"
 },
 "char_cotton": {
  "type": "sheet",
  "src": "assets/img/characters/cotton.png",
  "fw": 288,
  "fh": 288,
  "cols": 8,
  "count": 28,
  "ax": 144,
  "ay": 262,
  "scale": 2,
  "anims": {
   "run": {
    "frames": [
     0,
     1,
     2,
     3,
     4,
     5,
     6,
     7
    ],
    "fps": 14,
    "loop": true
   },
   "jump": {
    "frames": [
     8
    ]
   },
   "apex": {
    "frames": [
     9
    ]
   },
   "tuck": {
    "frames": [
     10
    ]
   },
   "fall": {
    "frames": [
     11
    ]
   },
   "slide": {
    "frames": [
     12,
     13
    ],
    "fps": 10,
    "loop": true
   },
   "land": {
    "frames": [
     14
    ]
   },
   "hurt": {
    "frames": [
     15
    ]
   },
   "down": {
    "frames": [
     16,
     17
    ],
    "fps": 3,
    "loop": false
   },
   "pit": {
    "frames": [
     18,
     19
    ],
    "fps": 8,
    "loop": true
   },
   "skill": {
    "frames": [
     20,
     21
    ],
    "fps": 8,
    "loop": true
   },
   "idle": {
    "frames": [
     22,
     23,
     24,
     25
    ],
    "fps": 6,
    "loop": true
   },
   "cheer": {
    "frames": [
     26,
     27
    ],
    "fps": 6,
    "loop": true
   }
  },
  "color": "#a8d4ff",
  "skillColor": "#7ff0ff"
 },
 "portrait_cotton": {
  "type": "image",
  "src": "assets/img/characters/cotton_portrait.png",
  "w": 192,
  "h": 192,
  "ax": 96,
  "ay": 96,
  "scale": 2,
  "color": "#a8d4ff"
 }
};

});

// ---- src/data/atlas_fx.js
__def("src/data/atlas_fx.js", function (__exports, __req) {
__exp(__exports, { "ATLAS_FX": () => ATLAS_FX });
// AUTO-GENERATED by tools/art/export.mjs from tools/art/modules/fx.js — do not edit by hand
const ATLAS_FX = {
 "fx": {
  "type": "atlas",
  "src": "assets/img/fx/fx.png",
  "scale": 2,
  "frames": {
   "spark_0": [
    1932,
    328,
    80,
    80,
    40,
    40
   ],
   "spark_1": [
    4,
    572,
    80,
    80,
    40,
    40
   ],
   "spark_2": [
    88,
    572,
    80,
    80,
    40,
    40
   ],
   "spark_3": [
    172,
    572,
    80,
    80,
    40,
    40
   ],
   "dust_0": [
    1312,
    328,
    120,
    80,
    60,
    40
   ],
   "dust_1": [
    1436,
    328,
    120,
    80,
    60,
    40
   ],
   "dust_2": [
    1560,
    328,
    120,
    80,
    60,
    40
   ],
   "dust_3": [
    1684,
    328,
    120,
    80,
    60,
    40
   ],
   "dust_4": [
    1808,
    328,
    120,
    80,
    60,
    40
   ],
   "smash_0": [
    1368,
    4,
    240,
    240,
    120,
    120
   ],
   "smash_1": [
    1612,
    4,
    240,
    240,
    120,
    120
   ],
   "smash_2": [
    4,
    328,
    240,
    240,
    120,
    120
   ],
   "smash_3": [
    248,
    328,
    240,
    240,
    120,
    120
   ],
   "hit_0": [
    492,
    328,
    160,
    160,
    80,
    80
   ],
   "hit_1": [
    656,
    328,
    160,
    160,
    80,
    80
   ],
   "heal": [
    256,
    572,
    80,
    80,
    40,
    40
   ],
   "glint_0": [
    340,
    572,
    60,
    60,
    30,
    30
   ],
   "glint_1": [
    404,
    572,
    60,
    60,
    30,
    30
   ],
   "glint_2": [
    468,
    572,
    60,
    60,
    30,
    30
   ],
   "glint_3": [
    532,
    572,
    60,
    60,
    30,
    30
   ],
   "ring": [
    328,
    4,
    256,
    256,
    128,
    128
   ],
   "ring_gold": [
    588,
    4,
    256,
    256,
    128,
    128
   ],
   "glow": [
    848,
    4,
    256,
    256,
    128,
    128
   ],
   "glow_gold": [
    1108,
    4,
    256,
    256,
    128,
    128
   ],
   "confetti_0": [
    960,
    572,
    32,
    20,
    16,
    10
   ],
   "confetti_1": [
    996,
    572,
    32,
    20,
    16,
    10
   ],
   "confetti_2": [
    1032,
    572,
    32,
    20,
    16,
    10
   ],
   "confetti_3": [
    1068,
    572,
    32,
    20,
    16,
    10
   ],
   "confetti_4": [
    1104,
    572,
    32,
    20,
    16,
    10
   ],
   "confetti_5": [
    1140,
    572,
    32,
    20,
    16,
    10
   ],
   "trail": [
    596,
    572,
    128,
    48,
    64,
    24
   ],
   "speedline": [
    1176,
    572,
    400,
    12,
    200,
    6
   ],
   "bubble": [
    4,
    4,
    320,
    320,
    160,
    160
   ],
   "smoke_0": [
    820,
    328,
    160,
    160,
    80,
    80
   ],
   "smoke_1": [
    984,
    328,
    160,
    160,
    80,
    80
   ],
   "smoke_2": [
    1148,
    328,
    160,
    160,
    80,
    80
   ],
   "star_small": [
    832,
    572,
    40,
    40,
    20,
    20
   ],
   "chip_bit_0": [
    876,
    572,
    24,
    24,
    12,
    12
   ],
   "chip_bit_1": [
    904,
    572,
    24,
    24,
    12,
    12
   ],
   "chip_bit_2": [
    932,
    572,
    24,
    24,
    12,
    12
   ],
   "note_0": [
    728,
    572,
    48,
    48,
    24,
    24
   ],
   "note_1": [
    780,
    572,
    48,
    48,
    24,
    24
   ]
  },
  "info": {
   "trail": {
    "tile": "x"
   }
  },
  "anims": {
   "spark": {
    "frames": [
     "spark_0",
     "spark_1",
     "spark_2",
     "spark_3"
    ],
    "fps": 20,
    "loop": false
   },
   "dust": {
    "frames": [
     "dust_0",
     "dust_1",
     "dust_2",
     "dust_3",
     "dust_4"
    ],
    "fps": 18,
    "loop": false
   },
   "smash": {
    "frames": [
     "smash_0",
     "smash_1",
     "smash_2",
     "smash_3"
    ],
    "fps": 16,
    "loop": false
   },
   "hit": {
    "frames": [
     "hit_0",
     "hit_1"
    ],
    "fps": 12,
    "loop": false
   },
   "glint": {
    "frames": [
     "glint_0",
     "glint_1",
     "glint_2",
     "glint_3"
    ],
    "fps": 14,
    "loop": false
   },
   "smoke": {
    "frames": [
     "smoke_0",
     "smoke_1",
     "smoke_2"
    ],
    "fps": 10,
    "loop": false
   }
  },
  "additive": [
   "spark_0",
   "spark_1",
   "spark_2",
   "spark_3",
   "glint_0",
   "glint_1",
   "glint_2",
   "glint_3",
   "ring",
   "ring_gold",
   "glow",
   "glow_gold",
   "speedline",
   "trail",
   "heal",
   "star_small"
  ]
 }
};

});

// ---- src/data/atlas_items.js
__def("src/data/atlas_items.js", function (__exports, __req) {
__exp(__exports, { "ATLAS_ITEMS": () => ATLAS_ITEMS });
// AUTO-GENERATED by tools/art/export.mjs from tools/art/modules/items.js — do not edit by hand
const ATLAS_ITEMS = {
 "items": {
  "type": "atlas",
  "src": "assets/img/items/items.png",
  "scale": 2,
  "frames": {
   "jelly": [
    988,
    432,
    52,
    52,
    26,
    26
   ],
   "jelly_pink": [
    1972,
    308,
    60,
    60,
    30,
    30
   ],
   "jelly_star": [
    1388,
    308,
    80,
    80,
    40,
    40
   ],
   "jelly_big": [
    480,
    4,
    152,
    152,
    76,
    76
   ],
   "jelly_rainbow": [
    308,
    4,
    168,
    168,
    84,
    84
   ],
   "jelly_giant": [
    4,
    4,
    300,
    300,
    150,
    150
   ],
   "jelly_choco": [
    1904,
    308,
    64,
    64,
    32,
    32
   ],
   "coin_s0": [
    4,
    432,
    60,
    60,
    30,
    30
   ],
   "coin_s1": [
    68,
    432,
    60,
    60,
    30,
    30
   ],
   "coin_s2": [
    132,
    432,
    60,
    60,
    30,
    30
   ],
   "coin_s3": [
    196,
    432,
    60,
    60,
    30,
    30
   ],
   "coin_s4": [
    260,
    432,
    60,
    60,
    30,
    30
   ],
   "coin_s5": [
    324,
    432,
    60,
    60,
    30,
    30
   ],
   "coin_g0": [
    1472,
    308,
    68,
    68,
    34,
    34
   ],
   "coin_g1": [
    1544,
    308,
    68,
    68,
    34,
    34
   ],
   "coin_g2": [
    1616,
    308,
    68,
    68,
    34,
    34
   ],
   "coin_g3": [
    1688,
    308,
    68,
    68,
    34,
    34
   ],
   "coin_g4": [
    1760,
    308,
    68,
    68,
    34,
    34
   ],
   "coin_g5": [
    1832,
    308,
    68,
    68,
    34,
    34
   ],
   "coin_b0": [
    1552,
    4,
    120,
    120,
    60,
    60
   ],
   "coin_b1": [
    1676,
    4,
    120,
    120,
    60,
    60
   ],
   "coin_b2": [
    1800,
    4,
    120,
    120,
    60,
    60
   ],
   "coin_b3": [
    1924,
    4,
    120,
    120,
    60,
    60
   ],
   "coin_b4": [
    4,
    308,
    120,
    120,
    60,
    60
   ],
   "coin_b5": [
    128,
    308,
    120,
    120,
    60,
    60
   ],
   "milk_s": [
    1296,
    308,
    88,
    112,
    44,
    56
   ],
   "milk_l": [
    636,
    4,
    120,
    152,
    60,
    76
   ],
   "pw_magnet": [
    760,
    4,
    128,
    128,
    64,
    64
   ],
   "pw_giant": [
    892,
    4,
    128,
    128,
    64,
    64
   ],
   "pw_dash": [
    1024,
    4,
    128,
    128,
    64,
    64
   ],
   "pw_coins": [
    1156,
    4,
    128,
    128,
    64,
    64
   ],
   "pw_stars": [
    1288,
    4,
    128,
    128,
    64,
    64
   ],
   "pw_shield": [
    1420,
    4,
    128,
    128,
    64,
    64
   ],
   "letter_0": [
    252,
    308,
    112,
    112,
    56,
    56
   ],
   "hud_letter_0": [
    388,
    432,
    56,
    56,
    28,
    28
   ],
   "letter_1": [
    368,
    308,
    112,
    112,
    56,
    56
   ],
   "hud_letter_1": [
    448,
    432,
    56,
    56,
    28,
    28
   ],
   "letter_2": [
    484,
    308,
    112,
    112,
    56,
    56
   ],
   "hud_letter_2": [
    508,
    432,
    56,
    56,
    28,
    28
   ],
   "letter_3": [
    600,
    308,
    112,
    112,
    56,
    56
   ],
   "hud_letter_3": [
    568,
    432,
    56,
    56,
    28,
    28
   ],
   "letter_4": [
    716,
    308,
    112,
    112,
    56,
    56
   ],
   "hud_letter_4": [
    628,
    432,
    56,
    56,
    28,
    28
   ],
   "letter_5": [
    832,
    308,
    112,
    112,
    56,
    56
   ],
   "hud_letter_5": [
    688,
    432,
    56,
    56,
    28,
    28
   ],
   "letter_6": [
    948,
    308,
    112,
    112,
    56,
    56
   ],
   "hud_letter_6": [
    748,
    432,
    56,
    56,
    28,
    28
   ],
   "letter_7": [
    1064,
    308,
    112,
    112,
    56,
    56
   ],
   "hud_letter_7": [
    808,
    432,
    56,
    56,
    28,
    28
   ],
   "letter_8": [
    1180,
    308,
    112,
    112,
    56,
    56
   ],
   "hud_letter_8": [
    868,
    432,
    56,
    56,
    28,
    28
   ],
   "hud_letter_off": [
    928,
    432,
    56,
    56,
    28,
    28
   ]
  },
  "info": {
   "jelly": {
    "r": 11
   },
   "jelly_pink": {
    "r": 13
   },
   "jelly_star": {
    "r": 18
   },
   "jelly_big": {
    "r": 32
   },
   "jelly_rainbow": {
    "r": 38
   },
   "jelly_giant": {
    "r": 66
   },
   "jelly_choco": {
    "r": 14
   },
   "coin_s0": {
    "r": 13
   },
   "coin_s1": {
    "r": 13
   },
   "coin_s2": {
    "r": 13
   },
   "coin_s3": {
    "r": 13
   },
   "coin_s4": {
    "r": 13
   },
   "coin_s5": {
    "r": 13
   },
   "coin_g0": {
    "r": 15
   },
   "coin_g1": {
    "r": 15
   },
   "coin_g2": {
    "r": 15
   },
   "coin_g3": {
    "r": 15
   },
   "coin_g4": {
    "r": 15
   },
   "coin_g5": {
    "r": 15
   },
   "coin_b0": {
    "r": 27
   },
   "coin_b1": {
    "r": 27
   },
   "coin_b2": {
    "r": 27
   },
   "coin_b3": {
    "r": 27
   },
   "coin_b4": {
    "r": 27
   },
   "coin_b5": {
    "r": 27
   },
   "milk_s": {
    "r": 20
   },
   "milk_l": {
    "r": 28
   },
   "pw_magnet": {
    "r": 25
   },
   "pw_giant": {
    "r": 25
   },
   "pw_dash": {
    "r": 25
   },
   "pw_coins": {
    "r": 25
   },
   "pw_stars": {
    "r": 25
   },
   "pw_shield": {
    "r": 25
   },
   "letter_0": {
    "ch": "S",
    "color": "#ff7eb9",
    "r": 24
   },
   "hud_letter_0": {
    "ch": "S",
    "color": "#ff7eb9"
   },
   "letter_1": {
    "ch": "U",
    "color": "#ff9a2e",
    "r": 24
   },
   "hud_letter_1": {
    "ch": "U",
    "color": "#ff9a2e"
   },
   "letter_2": {
    "ch": "G",
    "color": "#ffd02a",
    "r": 24
   },
   "hud_letter_2": {
    "ch": "G",
    "color": "#ffd02a"
   },
   "letter_3": {
    "ch": "A",
    "color": "#6fd448",
    "r": 24
   },
   "hud_letter_3": {
    "ch": "A",
    "color": "#6fd448"
   },
   "letter_4": {
    "ch": "R",
    "color": "#1fc2b0",
    "r": 24
   },
   "hud_letter_4": {
    "ch": "R",
    "color": "#1fc2b0"
   },
   "letter_5": {
    "ch": "R",
    "color": "#4fb4ff",
    "r": 24
   },
   "hud_letter_5": {
    "ch": "R",
    "color": "#4fb4ff"
   },
   "letter_6": {
    "ch": "U",
    "color": "#9a6bff",
    "r": 24
   },
   "hud_letter_6": {
    "ch": "U",
    "color": "#9a6bff"
   },
   "letter_7": {
    "ch": "S",
    "color": "#e040c8",
    "r": 24
   },
   "hud_letter_7": {
    "ch": "S",
    "color": "#e040c8"
   },
   "letter_8": {
    "ch": "H",
    "color": "#ff4848",
    "r": 24
   },
   "hud_letter_8": {
    "ch": "H",
    "color": "#ff4848"
   }
  },
  "letters": [
   "S",
   "U",
   "G",
   "A",
   "R",
   "R",
   "U",
   "S",
   "H"
  ],
  "letterColors": [
   "#ff7eb9",
   "#ff9a2e",
   "#ffd02a",
   "#6fd448",
   "#1fc2b0",
   "#4fb4ff",
   "#9a6bff",
   "#e040c8",
   "#ff4848"
  ],
  "anims": {
   "coin_s": {
    "frames": [
     "coin_s0",
     "coin_s1",
     "coin_s2",
     "coin_s3",
     "coin_s4",
     "coin_s5"
    ],
    "fps": 12,
    "loop": true
   },
   "coin_g": {
    "frames": [
     "coin_g0",
     "coin_g1",
     "coin_g2",
     "coin_g3",
     "coin_g4",
     "coin_g5"
    ],
    "fps": 12,
    "loop": true
   },
   "coin_b": {
    "frames": [
     "coin_b0",
     "coin_b1",
     "coin_b2",
     "coin_b3",
     "coin_b4",
     "coin_b5"
    ],
    "fps": 10,
    "loop": true
   }
  }
 }
};

});

// ---- src/data/atlas_lands.js
__def("src/data/atlas_lands.js", function (__exports, __req) {
__exp(__exports, { "ATLAS_LANDS": () => ATLAS_LANDS });
// AUTO-GENERATED by tools/art/export.mjs from tools/art/modules/lands.js — do not edit by hand
const ATLAS_LANDS = {
 "bg_meadow_far": {
  "type": "image",
  "src": "assets/img/lands/meadow/far.png",
  "w": 1536,
  "h": 420,
  "ax": 0,
  "ay": 0,
  "scale": 1,
  "y": 180,
  "parallax": 0.12,
  "sky": [
   "#56b0ec",
   "#94d3f5",
   "#d8f3ff"
  ],
  "fog": "#d6f1fc",
  "ambient": "petals"
 },
 "bg_meadow_mid": {
  "type": "image",
  "src": "assets/img/lands/meadow/mid.png",
  "w": 1536,
  "h": 380,
  "ax": 0,
  "ay": 0,
  "scale": 1,
  "y": 230,
  "parallax": 0.32
 },
 "bg_meadow_near": {
  "type": "image",
  "src": "assets/img/lands/meadow/near.png",
  "w": 1536,
  "h": 240,
  "ax": 0,
  "ay": 0,
  "scale": 1,
  "y": 372,
  "parallax": 0.62
 },
 "clouds_meadow": {
  "type": "atlas",
  "src": "assets/img/lands/meadow/clouds.png",
  "scale": 1,
  "frames": {
   "c0": [
    4,
    4,
    380,
    150,
    190,
    75
   ],
   "c1": [
    388,
    4,
    300,
    120,
    150,
    60
   ],
   "c2": [
    692,
    4,
    240,
    100,
    120,
    50
   ],
   "c3": [
    936,
    4,
    190,
    84,
    95,
    42
   ],
   "c4": [
    1414,
    4,
    150,
    64,
    75,
    32
   ],
   "c5": [
    1130,
    4,
    280,
    70,
    140,
    35
   ]
  },
  "info": {
   "c0": {
    "y": [
     40,
     260
    ],
    "speed": 0.04
   },
   "c1": {
    "y": [
     40,
     260
    ],
    "speed": 0.05
   },
   "c2": {
    "y": [
     40,
     260
    ],
    "speed": 0.06
   },
   "c3": {
    "y": [
     40,
     260
    ],
    "speed": 0.07
   },
   "c4": {
    "y": [
     40,
     260
    ],
    "speed": 0.08
   },
   "c5": {
    "y": [
     40,
     260
    ],
    "speed": 0.09
   }
  }
 },
 "ground_meadow": {
  "type": "image",
  "src": "assets/img/lands/meadow/ground.png",
  "w": 1024,
  "h": 276,
  "ax": 0,
  "ay": 36,
  "scale": 2,
  "surface": 36,
  "pit": "#7a4a2a"
 },
 "groundcap_meadow": {
  "type": "atlas",
  "src": "assets/img/lands/meadow/caps.png",
  "scale": 2,
  "frames": {
   "left": [
    4,
    4,
    96,
    276,
    34,
    36
   ],
   "right": [
    104,
    4,
    96,
    276,
    62,
    36
   ]
  },
  "info": {
   "left": {
    "side": "left",
    "surface": 36,
    "edgeX": 34,
    "overlap": 62,
    "note": "anchor = surface corner; draw the ground strip up to the anchor, cap on top"
   },
   "right": {
    "side": "right",
    "surface": 36,
    "edgeX": 62,
    "overlap": 62,
    "note": "anchor = surface corner; draw the ground strip up to the anchor, cap on top"
   }
  }
 },
 "plat_meadow": {
  "type": "atlas",
  "src": "assets/img/lands/meadow/plat.png",
  "scale": 2,
  "frames": {
   "left": [
    136,
    4,
    80,
    88,
    0,
    12
   ],
   "mid": [
    4,
    4,
    128,
    88,
    0,
    12
   ],
   "right": [
    220,
    4,
    80,
    88,
    0,
    12
   ]
  },
  "info": {
   "left": {
    "surface": 12,
    "tile": false
   },
   "mid": {
    "surface": 12,
    "tile": true
   },
   "right": {
    "surface": 12,
    "tile": false
   }
  },
  "surface": 12
 },
 "bg_canyon_far": {
  "type": "image",
  "src": "assets/img/lands/canyon/far.png",
  "w": 1536,
  "h": 420,
  "ax": 0,
  "ay": 0,
  "scale": 1,
  "y": 180,
  "parallax": 0.12,
  "sky": [
   "#ff8f6a",
   "#ffbd86",
   "#ffe2ad"
  ],
  "fog": "#ffd9a8",
  "ambient": "dust"
 },
 "bg_canyon_mid": {
  "type": "image",
  "src": "assets/img/lands/canyon/mid.png",
  "w": 1536,
  "h": 380,
  "ax": 0,
  "ay": 0,
  "scale": 1,
  "y": 230,
  "parallax": 0.32
 },
 "bg_canyon_near": {
  "type": "image",
  "src": "assets/img/lands/canyon/near.png",
  "w": 1536,
  "h": 240,
  "ax": 0,
  "ay": 0,
  "scale": 1,
  "y": 372,
  "parallax": 0.62
 },
 "clouds_canyon": {
  "type": "atlas",
  "src": "assets/img/lands/canyon/clouds.png",
  "scale": 1,
  "frames": {
   "c0": [
    468,
    4,
    420,
    110,
    210,
    55
   ],
   "c1": [
    892,
    4,
    320,
    90,
    160,
    45
   ],
   "c2": [
    1216,
    4,
    260,
    76,
    130,
    38
   ],
   "c3": [
    1824,
    4,
    200,
    64,
    100,
    32
   ],
   "c4": [
    1480,
    4,
    340,
    70,
    170,
    35
   ],
   "sun": [
    4,
    4,
    460,
    460,
    230,
    230
   ]
  },
  "info": {
   "c0": {
    "y": [
     40,
     240
    ],
    "speed": 0.03
   },
   "c1": {
    "y": [
     40,
     240
    ],
    "speed": 0.038
   },
   "c2": {
    "y": [
     40,
     240
    ],
    "speed": 0.046
   },
   "c3": {
    "y": [
     40,
     240
    ],
    "speed": 0.054
   },
   "c4": {
    "y": [
     40,
     240
    ],
    "speed": 0.062
   },
   "sun": {
    "y": 330,
    "fixed": true
   }
  }
 },
 "ground_canyon": {
  "type": "image",
  "src": "assets/img/lands/canyon/ground.png",
  "w": 1024,
  "h": 276,
  "ax": 0,
  "ay": 36,
  "scale": 2,
  "surface": 36,
  "pit": "#8f4523"
 },
 "groundcap_canyon": {
  "type": "atlas",
  "src": "assets/img/lands/canyon/caps.png",
  "scale": 2,
  "frames": {
   "left": [
    4,
    4,
    96,
    276,
    34,
    36
   ],
   "right": [
    104,
    4,
    96,
    276,
    62,
    36
   ]
  },
  "info": {
   "left": {
    "side": "left",
    "surface": 36,
    "edgeX": 34,
    "overlap": 62,
    "note": "anchor = surface corner; draw the ground strip up to the anchor, cap on top"
   },
   "right": {
    "side": "right",
    "surface": 36,
    "edgeX": 62,
    "overlap": 62,
    "note": "anchor = surface corner; draw the ground strip up to the anchor, cap on top"
   }
  }
 },
 "plat_canyon": {
  "type": "atlas",
  "src": "assets/img/lands/canyon/plat.png",
  "scale": 2,
  "frames": {
   "left": [
    136,
    4,
    80,
    88,
    0,
    12
   ],
   "mid": [
    4,
    4,
    128,
    88,
    0,
    12
   ],
   "right": [
    220,
    4,
    80,
    88,
    0,
    12
   ]
  },
  "info": {
   "left": {
    "surface": 12,
    "tile": false
   },
   "mid": {
    "surface": 12,
    "tile": true
   },
   "right": {
    "surface": 12,
    "tile": false
   }
  },
  "surface": 12
 },
 "bg_cavern_far": {
  "type": "image",
  "src": "assets/img/lands/cavern/far.png",
  "w": 1536,
  "h": 420,
  "ax": 0,
  "ay": 0,
  "scale": 1,
  "y": 180,
  "parallax": 0.12,
  "sky": [
   "#1b0e26",
   "#2e173e",
   "#4a2a52"
  ],
  "fog": "#5c3c6c",
  "ambient": "spores"
 },
 "bg_cavern_mid": {
  "type": "image",
  "src": "assets/img/lands/cavern/mid.png",
  "w": 1536,
  "h": 380,
  "ax": 0,
  "ay": 0,
  "scale": 1,
  "y": 230,
  "parallax": 0.32
 },
 "bg_cavern_near": {
  "type": "image",
  "src": "assets/img/lands/cavern/near.png",
  "w": 1536,
  "h": 240,
  "ax": 0,
  "ay": 0,
  "scale": 1,
  "y": 372,
  "parallax": 0.62
 },
 "clouds_cavern": {
  "type": "atlas",
  "src": "assets/img/lands/cavern/clouds.png",
  "scale": 1,
  "frames": {
   "c0": [
    4,
    4,
    520,
    250,
    260,
    0
   ],
   "c1": [
    528,
    4,
    420,
    210,
    210,
    0
   ],
   "c2": [
    952,
    4,
    340,
    170,
    170,
    0
   ],
   "c3": [
    1296,
    4,
    460,
    140,
    230,
    0
   ],
   "c4": [
    1760,
    4,
    180,
    140,
    90,
    70
   ],
   "c5": [
    4,
    258,
    130,
    110,
    65,
    55
   ]
  },
  "info": {
   "c0": {
    "y": 0,
    "anchor": "top",
    "note": "ceiling mass: hang from the top edge of the screen"
   },
   "c1": {
    "y": 0,
    "anchor": "top",
    "note": "ceiling mass: hang from the top edge of the screen"
   },
   "c2": {
    "y": 0,
    "anchor": "top",
    "note": "ceiling mass: hang from the top edge of the screen"
   },
   "c3": {
    "y": 0,
    "anchor": "top",
    "note": "ceiling mass: hang from the top edge of the screen"
   },
   "c4": {
    "y": [
     140,
     520
    ],
    "speed": 0.02,
    "glow": true
   },
   "c5": {
    "y": [
     140,
     520
    ],
    "speed": 0.02,
    "glow": true
   }
  }
 },
 "ground_cavern": {
  "type": "image",
  "src": "assets/img/lands/cavern/ground.png",
  "w": 1024,
  "h": 276,
  "ax": 0,
  "ay": 36,
  "scale": 2,
  "surface": 36,
  "pit": "#12080f"
 },
 "groundcap_cavern": {
  "type": "atlas",
  "src": "assets/img/lands/cavern/caps.png",
  "scale": 2,
  "frames": {
   "left": [
    4,
    4,
    96,
    276,
    34,
    36
   ],
   "right": [
    104,
    4,
    96,
    276,
    62,
    36
   ]
  },
  "info": {
   "left": {
    "side": "left",
    "surface": 36,
    "edgeX": 34,
    "overlap": 62,
    "note": "anchor = surface corner; draw the ground strip up to the anchor, cap on top"
   },
   "right": {
    "side": "right",
    "surface": 36,
    "edgeX": 62,
    "overlap": 62,
    "note": "anchor = surface corner; draw the ground strip up to the anchor, cap on top"
   }
  }
 },
 "plat_cavern": {
  "type": "atlas",
  "src": "assets/img/lands/cavern/plat.png",
  "scale": 2,
  "frames": {
   "left": [
    136,
    4,
    80,
    88,
    0,
    12
   ],
   "mid": [
    4,
    4,
    128,
    88,
    0,
    12
   ],
   "right": [
    220,
    4,
    80,
    88,
    0,
    12
   ]
  },
  "info": {
   "left": {
    "surface": 12,
    "tile": false
   },
   "mid": {
    "surface": 12,
    "tile": true
   },
   "right": {
    "surface": 12,
    "tile": false
   }
  },
  "surface": 12
 },
 "bg_glacier_far": {
  "type": "image",
  "src": "assets/img/lands/glacier/far.png",
  "w": 1536,
  "h": 420,
  "ax": 0,
  "ay": 0,
  "scale": 1,
  "y": 180,
  "parallax": 0.12,
  "sky": [
   "#8bd5f7",
   "#c4ebfc",
   "#f0fbff"
  ],
  "fog": "#e6f7ff",
  "ambient": "snow"
 },
 "bg_glacier_mid": {
  "type": "image",
  "src": "assets/img/lands/glacier/mid.png",
  "w": 1536,
  "h": 380,
  "ax": 0,
  "ay": 0,
  "scale": 1,
  "y": 230,
  "parallax": 0.32
 },
 "bg_glacier_near": {
  "type": "image",
  "src": "assets/img/lands/glacier/near.png",
  "w": 1536,
  "h": 240,
  "ax": 0,
  "ay": 0,
  "scale": 1,
  "y": 372,
  "parallax": 0.62
 },
 "clouds_glacier": {
  "type": "atlas",
  "src": "assets/img/lands/glacier/clouds.png",
  "scale": 1,
  "frames": {
   "c0": [
    4,
    4,
    400,
    150,
    200,
    75
   ],
   "c1": [
    408,
    4,
    320,
    124,
    160,
    62
   ],
   "c2": [
    732,
    4,
    250,
    100,
    125,
    50
   ],
   "c3": [
    986,
    4,
    200,
    84,
    100,
    42
   ],
   "c4": [
    1494,
    4,
    150,
    64,
    75,
    32
   ],
   "c5": [
    1190,
    4,
    300,
    80,
    150,
    40
   ]
  },
  "info": {
   "c0": {
    "y": [
     40,
     240
    ],
    "speed": 0.03
   },
   "c1": {
    "y": [
     40,
     240
    ],
    "speed": 0.038
   },
   "c2": {
    "y": [
     40,
     240
    ],
    "speed": 0.046
   },
   "c3": {
    "y": [
     40,
     240
    ],
    "speed": 0.054
   },
   "c4": {
    "y": [
     40,
     240
    ],
    "speed": 0.062
   },
   "c5": {
    "y": [
     40,
     240
    ],
    "speed": 0.07
   }
  }
 },
 "ground_glacier": {
  "type": "image",
  "src": "assets/img/lands/glacier/ground.png",
  "w": 1024,
  "h": 276,
  "ax": 0,
  "ay": 36,
  "scale": 2,
  "surface": 36,
  "pit": "#2c5d8a"
 },
 "groundcap_glacier": {
  "type": "atlas",
  "src": "assets/img/lands/glacier/caps.png",
  "scale": 2,
  "frames": {
   "left": [
    4,
    4,
    96,
    276,
    34,
    36
   ],
   "right": [
    104,
    4,
    96,
    276,
    62,
    36
   ]
  },
  "info": {
   "left": {
    "side": "left",
    "surface": 36,
    "edgeX": 34,
    "overlap": 62,
    "note": "anchor = surface corner; draw the ground strip up to the anchor, cap on top"
   },
   "right": {
    "side": "right",
    "surface": 36,
    "edgeX": 62,
    "overlap": 62,
    "note": "anchor = surface corner; draw the ground strip up to the anchor, cap on top"
   }
  }
 },
 "plat_glacier": {
  "type": "atlas",
  "src": "assets/img/lands/glacier/plat.png",
  "scale": 2,
  "frames": {
   "left": [
    136,
    4,
    80,
    88,
    0,
    12
   ],
   "mid": [
    4,
    4,
    128,
    88,
    0,
    12
   ],
   "right": [
    220,
    4,
    80,
    88,
    0,
    12
   ]
  },
  "info": {
   "left": {
    "surface": 12,
    "tile": false
   },
   "mid": {
    "surface": 12,
    "tile": true
   },
   "right": {
    "surface": 12,
    "tile": false
   }
  },
  "surface": 12
 },
 "bg_castle_far": {
  "type": "image",
  "src": "assets/img/lands/castle/far.png",
  "w": 1536,
  "h": 420,
  "ax": 0,
  "ay": 0,
  "scale": 1,
  "y": 180,
  "parallax": 0.12,
  "sky": [
   "#141a50",
   "#2c2c7a",
   "#5a4aa8"
  ],
  "fog": "#6a5cb5",
  "ambient": "stars"
 },
 "bg_castle_mid": {
  "type": "image",
  "src": "assets/img/lands/castle/mid.png",
  "w": 1536,
  "h": 380,
  "ax": 0,
  "ay": 0,
  "scale": 1,
  "y": 230,
  "parallax": 0.32
 },
 "bg_castle_near": {
  "type": "image",
  "src": "assets/img/lands/castle/near.png",
  "w": 1536,
  "h": 240,
  "ax": 0,
  "ay": 0,
  "scale": 1,
  "y": 372,
  "parallax": 0.62
 },
 "clouds_castle": {
  "type": "atlas",
  "src": "assets/img/lands/castle/clouds.png",
  "scale": 1,
  "frames": {
   "c0": [
    328,
    4,
    380,
    130,
    190,
    65
   ],
   "c1": [
    916,
    4,
    300,
    110,
    150,
    55
   ],
   "c2": [
    1374,
    4,
    240,
    90,
    120,
    45
   ],
   "c3": [
    1618,
    4,
    180,
    70,
    90,
    35
   ],
   "c4": [
    712,
    4,
    200,
    120,
    100,
    60
   ],
   "c5": [
    1220,
    4,
    150,
    100,
    75,
    50
   ],
   "moon": [
    4,
    4,
    320,
    320,
    160,
    160
   ]
  },
  "info": {
   "c0": {
    "y": [
     40,
     260
    ],
    "speed": 0.03
   },
   "c1": {
    "y": [
     40,
     260
    ],
    "speed": 0.038
   },
   "c2": {
    "y": [
     40,
     260
    ],
    "speed": 0.046
   },
   "c3": {
    "y": [
     40,
     260
    ],
    "speed": 0.054
   },
   "c4": {
    "y": [
     30,
     280
    ],
    "speed": 0.01,
    "stars": true
   },
   "c5": {
    "y": [
     30,
     280
    ],
    "speed": 0.01,
    "stars": true
   },
   "moon": {
    "y": 150,
    "fixed": true
   }
  }
 },
 "ground_castle": {
  "type": "image",
  "src": "assets/img/lands/castle/ground.png",
  "w": 1024,
  "h": 276,
  "ax": 0,
  "ay": 36,
  "scale": 2,
  "surface": 36,
  "pit": "#1a1a4a"
 },
 "groundcap_castle": {
  "type": "atlas",
  "src": "assets/img/lands/castle/caps.png",
  "scale": 2,
  "frames": {
   "left": [
    4,
    4,
    96,
    276,
    34,
    36
   ],
   "right": [
    104,
    4,
    96,
    276,
    62,
    36
   ]
  },
  "info": {
   "left": {
    "side": "left",
    "surface": 36,
    "edgeX": 34,
    "overlap": 62,
    "note": "anchor = surface corner; draw the ground strip up to the anchor, cap on top"
   },
   "right": {
    "side": "right",
    "surface": 36,
    "edgeX": 62,
    "overlap": 62,
    "note": "anchor = surface corner; draw the ground strip up to the anchor, cap on top"
   }
  }
 },
 "plat_castle": {
  "type": "atlas",
  "src": "assets/img/lands/castle/plat.png",
  "scale": 2,
  "frames": {
   "left": [
    136,
    4,
    80,
    88,
    0,
    12
   ],
   "mid": [
    4,
    4,
    128,
    88,
    0,
    12
   ],
   "right": [
    220,
    4,
    80,
    88,
    0,
    12
   ]
  },
  "info": {
   "left": {
    "surface": 12,
    "tile": false
   },
   "mid": {
    "surface": 12,
    "tile": true
   },
   "right": {
    "surface": 12,
    "tile": false
   }
  },
  "surface": 12
 },
 "bg_rush_far": {
  "type": "image",
  "src": "assets/img/lands/rush/far.png",
  "w": 1536,
  "h": 420,
  "ax": 0,
  "ay": 0,
  "scale": 1,
  "y": 180,
  "parallax": 0.12,
  "sky": [
   "#ff8ad8",
   "#ffd9f0",
   "#ffe8a8"
  ],
  "fog": "#ffe4f3",
  "ambient": "sparkles"
 },
 "bg_rush_mid": {
  "type": "image",
  "src": "assets/img/lands/rush/mid.png",
  "w": 1536,
  "h": 380,
  "ax": 0,
  "ay": 0,
  "scale": 1,
  "y": 230,
  "parallax": 0.32
 },
 "bg_rush_near": {
  "type": "image",
  "src": "assets/img/lands/rush/near.png",
  "w": 1536,
  "h": 240,
  "ax": 0,
  "ay": 0,
  "scale": 1,
  "y": 372,
  "parallax": 0.62
 },
 "clouds_rush": {
  "type": "atlas",
  "src": "assets/img/lands/rush/clouds.png",
  "scale": 1,
  "frames": {
   "c0": [
    768,
    4,
    380,
    150,
    190,
    75
   ],
   "c1": [
    1152,
    4,
    300,
    120,
    150,
    60
   ],
   "c2": [
    1456,
    4,
    240,
    100,
    120,
    50
   ],
   "c3": [
    1700,
    4,
    190,
    84,
    95,
    42
   ],
   "c4": [
    1894,
    4,
    150,
    64,
    75,
    32
   ],
   "rainbow": [
    4,
    4,
    760,
    400,
    380,
    360
   ]
  },
  "info": {
   "c0": {
    "y": [
     40,
     300
    ],
    "speed": 0.06
   },
   "c1": {
    "y": [
     40,
     300
    ],
    "speed": 0.06999999999999999
   },
   "c2": {
    "y": [
     40,
     300
    ],
    "speed": 0.08
   },
   "c3": {
    "y": [
     40,
     300
    ],
    "speed": 0.09
   },
   "c4": {
    "y": [
     40,
     300
    ],
    "speed": 0.1
   },
   "rainbow": {
    "y": 420,
    "fixed": true,
    "note": "anchor = arc centre bottom"
   }
  }
 },
 "ground_rush": {
  "type": "image",
  "src": "assets/img/lands/rush/ground.png",
  "w": 1024,
  "h": 276,
  "ax": 0,
  "ay": 36,
  "scale": 2,
  "surface": 36,
  "pit": "#f08ac6"
 },
 "bg_lobby": {
  "type": "image",
  "src": "assets/img/lands/lobby.png",
  "w": 1600,
  "h": 720,
  "ax": 0,
  "ay": 0,
  "scale": 1,
  "stage": {
   "x": 600,
   "y": 600
  },
  "calm": {
   "x": 300,
   "y": 380,
   "w": 600,
   "h": 240
  }
 }
};

});

// ---- src/data/atlas_obstacles.js
__def("src/data/atlas_obstacles.js", function (__exports, __req) {
__exp(__exports, { "ATLAS_OBSTACLES": () => ATLAS_OBSTACLES });
// AUTO-GENERATED by tools/art/export.mjs from tools/art/modules/obstacles.js — do not edit by hand
const ATLAS_OBSTACLES = {
 "obs_meadow": {
  "type": "atlas",
  "src": "assets/img/obstacles/meadow.png",
  "scale": 2,
  "frames": {
   "low": [
    896,
    4,
    144,
    168,
    72,
    168
   ],
   "low2": [
    1152,
    4,
    300,
    148,
    150,
    148
   ],
   "tall": [
    4,
    4,
    172,
    472,
    86,
    472
   ],
   "hang": [
    424,
    4,
    208,
    240,
    104,
    240
   ],
   "chain": [
    1690,
    4,
    80,
    128,
    40,
    128
   ],
   "beam": [
    636,
    4,
    256,
    180,
    0,
    180
   ],
   "deco0": [
    1584,
    4,
    102,
    130,
    51,
    130
   ],
   "deco1": [
    4,
    480,
    128,
    110,
    64,
    110
   ],
   "deco2": [
    136,
    480,
    160,
    92,
    80,
    92
   ],
   "deco3": [
    1044,
    4,
    104,
    168,
    52,
    168
   ],
   "deco4": [
    446,
    480,
    132,
    80,
    66,
    80
   ],
   "deco5": [
    300,
    480,
    142,
    90,
    71,
    90
   ],
   "deco6": [
    1456,
    4,
    124,
    140,
    62,
    140
   ],
   "deco7": [
    1774,
    4,
    204,
    120,
    102,
    120
   ],
   "sign": [
    180,
    4,
    240,
    260,
    120,
    260
   ]
  },
  "info": {
   "low": {
    "hit": {
     "x": -22,
     "y": -56,
     "w": 44,
     "h": 56
    }
   },
   "low2": {
    "hit": {
     "x": -58,
     "y": -50,
     "w": 116,
     "h": 50
    }
   },
   "tall": {
    "hit": {
     "x": -27,
     "y": -216,
     "w": 54,
     "h": 216
    }
   },
   "hang": {
    "hit": {
     "x": -33,
     "y": -120,
     "w": 66,
     "h": 114
    },
    "note": "anchor = bottom tip (place at y=518); extend hit to the top of the screen"
   },
   "chain": {
    "note": "tiles vertically above hang (anchor bottom-centre)"
   },
   "beam": {
    "hit": {
     "x": 0,
     "y": -90,
     "w": 128,
     "h": 85
    },
    "note": "anchor bottom-left; tiles horizontally every 128 logical"
   },
   "deco0": {
    "deco": true
   },
   "deco1": {
    "deco": true
   },
   "deco2": {
    "deco": true
   },
   "deco3": {
    "deco": true
   },
   "deco4": {
    "deco": true
   },
   "deco5": {
    "deco": true
   },
   "deco6": {
    "deco": true
   },
   "deco7": {
    "deco": true
   },
   "sign": {
    "board": {
     "x": 34,
     "y": 38,
     "w": 172,
     "h": 94
    }
   }
  }
 },
 "obs_canyon": {
  "type": "atlas",
  "src": "assets/img/obstacles/canyon.png",
  "scale": 2,
  "frames": {
   "low": [
    896,
    4,
    144,
    168,
    72,
    168
   ],
   "low2": [
    1180,
    4,
    300,
    148,
    150,
    148
   ],
   "tall": [
    4,
    4,
    172,
    472,
    86,
    472
   ],
   "hang": [
    424,
    4,
    208,
    240,
    104,
    240
   ],
   "chain": [
    1484,
    4,
    80,
    128,
    40,
    128
   ],
   "beam": [
    636,
    4,
    256,
    180,
    0,
    180
   ],
   "deco0": [
    1880,
    4,
    118,
    114,
    59,
    114
   ],
   "deco1": [
    280,
    480,
    152,
    92,
    76,
    92
   ],
   "deco2": [
    152,
    480,
    124,
    102,
    62,
    102
   ],
   "deco3": [
    1568,
    4,
    120,
    126,
    60,
    126
   ],
   "deco4": [
    436,
    480,
    124,
    80,
    62,
    80
   ],
   "deco5": [
    1044,
    4,
    132,
    154,
    66,
    154
   ],
   "deco6": [
    4,
    480,
    144,
    104,
    72,
    104
   ],
   "deco7": [
    1692,
    4,
    184,
    114,
    92,
    114
   ],
   "sign": [
    180,
    4,
    240,
    260,
    120,
    260
   ]
  },
  "info": {
   "low": {
    "hit": {
     "x": -22,
     "y": -56,
     "w": 44,
     "h": 56
    }
   },
   "low2": {
    "hit": {
     "x": -58,
     "y": -50,
     "w": 116,
     "h": 50
    }
   },
   "tall": {
    "hit": {
     "x": -26,
     "y": -212,
     "w": 52,
     "h": 212
    }
   },
   "hang": {
    "hit": {
     "x": -33,
     "y": -120,
     "w": 66,
     "h": 114
    },
    "note": "anchor = bottom tip (place at y=518); extend hit to the top of the screen"
   },
   "chain": {
    "note": "tiles vertically above hang (anchor bottom-centre)"
   },
   "beam": {
    "hit": {
     "x": 0,
     "y": -90,
     "w": 128,
     "h": 85
    },
    "note": "anchor bottom-left; tiles horizontally every 128 logical"
   },
   "deco0": {
    "deco": true
   },
   "deco1": {
    "deco": true
   },
   "deco2": {
    "deco": true
   },
   "deco3": {
    "deco": true
   },
   "deco4": {
    "deco": true
   },
   "deco5": {
    "deco": true
   },
   "deco6": {
    "deco": true
   },
   "deco7": {
    "deco": true
   },
   "sign": {
    "board": {
     "x": 34,
     "y": 38,
     "w": 172,
     "h": 94
    }
   }
  }
 },
 "obs_cavern": {
  "type": "atlas",
  "src": "assets/img/obstacles/cavern.png",
  "scale": 2,
  "frames": {
   "low": [
    1146,
    4,
    144,
    168,
    72,
    168
   ],
   "low2": [
    1294,
    4,
    300,
    148,
    150,
    148
   ],
   "tall": [
    4,
    4,
    172,
    472,
    86,
    472
   ],
   "hang": [
    424,
    4,
    208,
    240,
    104,
    240
   ],
   "chain": [
    1598,
    4,
    80,
    128,
    40,
    128
   ],
   "beam": [
    780,
    4,
    256,
    180,
    0,
    180
   ],
   "fall": [
    636,
    4,
    140,
    220,
    70,
    220
   ],
   "deco0": [
    1838,
    4,
    132,
    122,
    66,
    122
   ],
   "deco1": [
    4,
    480,
    140,
    110,
    70,
    110
   ],
   "deco2": [
    1040,
    4,
    102,
    170,
    51,
    170
   ],
   "deco3": [
    292,
    480,
    152,
    90,
    76,
    90
   ],
   "deco4": [
    448,
    480,
    172,
    74,
    86,
    74
   ],
   "deco5": [
    624,
    480,
    132,
    70,
    66,
    70
   ],
   "deco6": [
    148,
    480,
    140,
    102,
    70,
    102
   ],
   "deco7": [
    1682,
    4,
    152,
    122,
    76,
    122
   ],
   "sign": [
    180,
    4,
    240,
    260,
    120,
    260
   ]
  },
  "info": {
   "low": {
    "hit": {
     "x": -22,
     "y": -60,
     "w": 44,
     "h": 60
    }
   },
   "low2": {
    "hit": {
     "x": -58,
     "y": -52,
     "w": 116,
     "h": 52
    }
   },
   "tall": {
    "hit": {
     "x": -26,
     "y": -214,
     "w": 52,
     "h": 214
    }
   },
   "hang": {
    "hit": {
     "x": -33,
     "y": -120,
     "w": 66,
     "h": 114
    },
    "note": "anchor = bottom tip (place at y=518); extend hit to the top of the screen"
   },
   "chain": {
    "note": "tiles vertically above hang (anchor bottom-centre)"
   },
   "beam": {
    "hit": {
     "x": 0,
     "y": -90,
     "w": 128,
     "h": 85
    },
    "note": "anchor bottom-left; tiles horizontally every 128 logical"
   },
   "fall": {
    "hit": {
     "x": -23,
     "y": -68,
     "w": 46,
     "h": 68
    },
    "note": "drops from above, rests on the ground"
   },
   "deco0": {
    "deco": true
   },
   "deco1": {
    "deco": true
   },
   "deco2": {
    "deco": true
   },
   "deco3": {
    "deco": true
   },
   "deco4": {
    "deco": true
   },
   "deco5": {
    "deco": true
   },
   "deco6": {
    "deco": true
   },
   "deco7": {
    "deco": true
   },
   "sign": {
    "board": {
     "x": 34,
     "y": 38,
     "w": 172,
     "h": 94
    }
   }
  }
 },
 "obs_glacier": {
  "type": "atlas",
  "src": "assets/img/obstacles/glacier.png",
  "scale": 2,
  "frames": {
   "low": [
    1188,
    4,
    144,
    168,
    72,
    168
   ],
   "low2": [
    1576,
    4,
    300,
    148,
    150,
    148
   ],
   "tall": [
    4,
    4,
    172,
    472,
    86,
    472
   ],
   "hang": [
    424,
    4,
    208,
    240,
    104,
    240
   ],
   "chain": [
    100,
    480,
    80,
    128,
    40,
    128
   ],
   "beam": [
    780,
    4,
    256,
    180,
    0,
    180
   ],
   "fall": [
    636,
    4,
    140,
    220,
    70,
    220
   ],
   "pop0": [
    762,
    480,
    140,
    40,
    70,
    40
   ],
   "pop1": [
    1040,
    4,
    144,
    176,
    72,
    176
   ],
   "deco0": [
    1448,
    4,
    124,
    150,
    62,
    150
   ],
   "deco1": [
    4,
    480,
    92,
    144,
    46,
    144
   ],
   "deco2": [
    610,
    480,
    148,
    84,
    74,
    84
   ],
   "deco3": [
    1336,
    4,
    108,
    158,
    54,
    158
   ],
   "deco4": [
    1880,
    4,
    90,
    146,
    45,
    146
   ],
   "deco5": [
    320,
    480,
    124,
    110,
    62,
    110
   ],
   "deco6": [
    448,
    480,
    158,
    102,
    79,
    102
   ],
   "deco7": [
    184,
    480,
    132,
    110,
    66,
    110
   ],
   "sign": [
    180,
    4,
    240,
    260,
    120,
    260
   ]
  },
  "info": {
   "low": {
    "hit": {
     "x": -22,
     "y": -60,
     "w": 44,
     "h": 60
    }
   },
   "low2": {
    "hit": {
     "x": -58,
     "y": -52,
     "w": 116,
     "h": 52
    }
   },
   "tall": {
    "hit": {
     "x": -26,
     "y": -214,
     "w": 52,
     "h": 214
    }
   },
   "hang": {
    "hit": {
     "x": -33,
     "y": -120,
     "w": 66,
     "h": 114
    },
    "note": "anchor = bottom tip (place at y=518); extend hit to the top of the screen"
   },
   "chain": {
    "note": "tiles vertically above hang (anchor bottom-centre)"
   },
   "beam": {
    "hit": {
     "x": 0,
     "y": -90,
     "w": 128,
     "h": 85
    },
    "note": "anchor bottom-left; tiles horizontally every 128 logical"
   },
   "fall": {
    "hit": {
     "x": -23,
     "y": -68,
     "w": 46,
     "h": 68
    },
    "note": "drops from above, rests on the ground"
   },
   "pop0": {
    "note": "hidden bump (harmless) — swap to pop1 when it pops"
   },
   "pop1": {
    "hit": {
     "x": -23,
     "y": -68,
     "w": 46,
     "h": 68
    }
   },
   "deco0": {
    "deco": true
   },
   "deco1": {
    "deco": true
   },
   "deco2": {
    "deco": true
   },
   "deco3": {
    "deco": true
   },
   "deco4": {
    "deco": true
   },
   "deco5": {
    "deco": true
   },
   "deco6": {
    "deco": true
   },
   "deco7": {
    "deco": true
   },
   "sign": {
    "board": {
     "x": 34,
     "y": 38,
     "w": 172,
     "h": 94
    }
   }
  }
 },
 "obs_castle": {
  "type": "atlas",
  "src": "assets/img/obstacles/castle.png",
  "scale": 2,
  "frames": {
   "low": [
    1412,
    4,
    144,
    168,
    72,
    168
   ],
   "low2": [
    1560,
    4,
    300,
    148,
    150,
    148
   ],
   "tall": [
    4,
    4,
    172,
    472,
    86,
    472
   ],
   "hang": [
    424,
    4,
    208,
    240,
    104,
    240
   ],
   "chain": [
    120,
    480,
    80,
    128,
    40,
    128
   ],
   "beam": [
    898,
    4,
    256,
    180,
    0,
    180
   ],
   "fall": [
    636,
    4,
    140,
    220,
    70,
    220
   ],
   "pop0": [
    794,
    480,
    140,
    40,
    70,
    40
   ],
   "pop1": [
    1264,
    4,
    144,
    176,
    72,
    176
   ],
   "deco0": [
    1158,
    4,
    102,
    178,
    51,
    178
   ],
   "deco1": [
    646,
    480,
    144,
    88,
    72,
    88
   ],
   "deco2": [
    482,
    480,
    160,
    92,
    80,
    92
   ],
   "deco3": [
    780,
    4,
    114,
    194,
    57,
    194
   ],
   "deco4": [
    4,
    480,
    112,
    130,
    56,
    130
   ],
   "deco5": [
    1864,
    4,
    148,
    138,
    74,
    138
   ],
   "deco6": [
    340,
    480,
    138,
    102,
    69,
    102
   ],
   "deco7": [
    204,
    480,
    132,
    118,
    66,
    118
   ],
   "sign": [
    180,
    4,
    240,
    260,
    120,
    260
   ]
  },
  "info": {
   "low": {
    "hit": {
     "x": -22,
     "y": -60,
     "w": 44,
     "h": 60
    }
   },
   "low2": {
    "hit": {
     "x": -58,
     "y": -48,
     "w": 116,
     "h": 48
    }
   },
   "tall": {
    "hit": {
     "x": -26,
     "y": -214,
     "w": 52,
     "h": 214
    }
   },
   "hang": {
    "hit": {
     "x": -33,
     "y": -120,
     "w": 66,
     "h": 114
    },
    "note": "anchor = bottom tip (place at y=518); extend hit to the top of the screen"
   },
   "chain": {
    "note": "tiles vertically above hang (anchor bottom-centre)"
   },
   "beam": {
    "hit": {
     "x": 0,
     "y": -90,
     "w": 128,
     "h": 85
    },
    "note": "anchor bottom-left; tiles horizontally every 128 logical"
   },
   "fall": {
    "hit": {
     "x": -23,
     "y": -68,
     "w": 46,
     "h": 68
    },
    "note": "drops from above, rests on the ground"
   },
   "pop0": {
    "note": "hidden bump (harmless) — swap to pop1 when it pops"
   },
   "pop1": {
    "hit": {
     "x": -23,
     "y": -68,
     "w": 46,
     "h": 68
    }
   },
   "deco0": {
    "deco": true
   },
   "deco1": {
    "deco": true
   },
   "deco2": {
    "deco": true
   },
   "deco3": {
    "deco": true
   },
   "deco4": {
    "deco": true
   },
   "deco5": {
    "deco": true
   },
   "deco6": {
    "deco": true
   },
   "deco7": {
    "deco": true
   },
   "sign": {
    "board": {
     "x": 34,
     "y": 38,
     "w": 172,
     "h": 94
    }
   }
  }
 },
 "obs_common": {
  "type": "atlas",
  "src": "assets/img/obstacles/common.png",
  "scale": 2,
  "frames": {
   "spring0": [
    4,
    4,
    168,
    88,
    84,
    88
   ],
   "spring1": [
    176,
    4,
    168,
    56,
    84,
    56
   ]
  },
  "info": {
   "spring0": {
    "hit": {
     "x": -36,
     "y": -30,
     "w": 72,
     "h": 30
    },
    "role": "bounce"
   },
   "spring1": {
    "hit": {
     "x": -38,
     "y": -20,
     "w": 76,
     "h": 20
    },
    "role": "bounce"
   }
  }
 }
};

});

// ---- src/data/atlas_pets.js
__def("src/data/atlas_pets.js", function (__exports, __req) {
__exp(__exports, { "ATLAS_PETS": () => ATLAS_PETS });
// AUTO-GENERATED by tools/art/export.mjs from tools/art/modules/pets.js — do not edit by hand
const ATLAS_PETS = {
 "pet_twinkle": {
  "type": "sheet",
  "src": "assets/img/pets/twinkle.png",
  "fw": 160,
  "fh": 160,
  "cols": 6,
  "count": 6,
  "ax": 80,
  "ay": 80,
  "scale": 2,
  "anims": {
   "fly": {
    "frames": [
     0,
     1,
     2,
     3
    ],
    "fps": 8,
    "loop": true
   },
   "act": {
    "frames": [
     4,
     5
    ],
    "fps": 8,
    "loop": true
   }
  },
  "color": "#ffd84a"
 },
 "petportrait_twinkle": {
  "type": "image",
  "src": "assets/img/pets/twinkle_portrait.png",
  "w": 128,
  "h": 128,
  "ax": 64,
  "ay": 64,
  "scale": 2
 },
 "pet_buzzy": {
  "type": "sheet",
  "src": "assets/img/pets/buzzy.png",
  "fw": 160,
  "fh": 160,
  "cols": 6,
  "count": 6,
  "ax": 80,
  "ay": 80,
  "scale": 2,
  "anims": {
   "fly": {
    "frames": [
     0,
     1,
     2,
     3
    ],
    "fps": 8,
    "loop": true
   },
   "act": {
    "frames": [
     4,
     5
    ],
    "fps": 8,
    "loop": true
   }
  },
  "color": "#ffd23f"
 },
 "petportrait_buzzy": {
  "type": "image",
  "src": "assets/img/pets/buzzy_portrait.png",
  "w": 128,
  "h": 128,
  "ax": 64,
  "ay": 64,
  "scale": 2
 },
 "pet_puff": {
  "type": "sheet",
  "src": "assets/img/pets/puff.png",
  "fw": 160,
  "fh": 160,
  "cols": 6,
  "count": 6,
  "ax": 80,
  "ay": 80,
  "scale": 2,
  "anims": {
   "fly": {
    "frames": [
     0,
     1,
     2,
     3
    ],
    "fps": 8,
    "loop": true
   },
   "act": {
    "frames": [
     4,
     5
    ],
    "fps": 8,
    "loop": true
   }
  },
  "color": "#f4f2ff"
 },
 "petportrait_puff": {
  "type": "image",
  "src": "assets/img/pets/puff_portrait.png",
  "w": 128,
  "h": 128,
  "ax": 64,
  "ay": 64,
  "scale": 2
 },
 "pet_oink": {
  "type": "sheet",
  "src": "assets/img/pets/oink.png",
  "fw": 160,
  "fh": 160,
  "cols": 6,
  "count": 6,
  "ax": 80,
  "ay": 80,
  "scale": 2,
  "anims": {
   "fly": {
    "frames": [
     0,
     1,
     2,
     3
    ],
    "fps": 8,
    "loop": true
   },
   "act": {
    "frames": [
     4,
     5
    ],
    "fps": 8,
    "loop": true
   }
  },
  "color": "#ffa6c4"
 },
 "petportrait_oink": {
  "type": "image",
  "src": "assets/img/pets/oink_portrait.png",
  "w": 128,
  "h": 128,
  "ax": 64,
  "ay": 64,
  "scale": 2
 },
 "pet_pop": {
  "type": "sheet",
  "src": "assets/img/pets/pop.png",
  "fw": 160,
  "fh": 160,
  "cols": 6,
  "count": 6,
  "ax": 80,
  "ay": 80,
  "scale": 2,
  "anims": {
   "fly": {
    "frames": [
     0,
     1,
     2,
     3
    ],
    "fps": 8,
    "loop": true
   },
   "act": {
    "frames": [
     4,
     5
    ],
    "fps": 8,
    "loop": true
   }
  },
  "color": "#ff4a5f"
 },
 "petportrait_pop": {
  "type": "image",
  "src": "assets/img/pets/pop_portrait.png",
  "w": 128,
  "h": 128,
  "ax": 64,
  "ay": 64,
  "scale": 2
 }
};

});

// ---- src/data/atlas_ui.js
__def("src/data/atlas_ui.js", function (__exports, __req) {
__exp(__exports, { "ATLAS_UI": () => ATLAS_UI });
// AUTO-GENERATED by tools/art/export.mjs from tools/art/modules/ui.js — do not edit by hand
const ATLAS_UI = {
 "ui": {
  "type": "atlas",
  "src": "assets/img/ui/icons.png",
  "scale": 2,
  "frames": {
   "coin": [
    4,
    4,
    96,
    96,
    48,
    48
   ],
   "jelly": [
    104,
    4,
    96,
    96,
    48,
    48
   ],
   "star": [
    204,
    4,
    96,
    96,
    48,
    48
   ],
   "milk": [
    304,
    4,
    96,
    96,
    48,
    48
   ],
   "lock": [
    404,
    4,
    96,
    96,
    48,
    48
   ],
   "check": [
    504,
    4,
    96,
    96,
    48,
    48
   ],
   "gear": [
    604,
    4,
    96,
    96,
    48,
    48
   ],
   "pause": [
    704,
    4,
    96,
    96,
    48,
    48
   ],
   "play": [
    804,
    4,
    96,
    96,
    48,
    48
   ],
   "home": [
    904,
    4,
    96,
    96,
    48,
    48
   ],
   "retry": [
    1004,
    4,
    96,
    96,
    48,
    48
   ],
   "sound_on": [
    1104,
    4,
    96,
    96,
    48,
    48
   ],
   "sound_off": [
    1204,
    4,
    96,
    96,
    48,
    48
   ],
   "music_on": [
    1304,
    4,
    96,
    96,
    48,
    48
   ],
   "music_off": [
    1404,
    4,
    96,
    96,
    48,
    48
   ],
   "arrow_l": [
    1504,
    4,
    96,
    96,
    48,
    48
   ],
   "arrow_r": [
    1604,
    4,
    96,
    96,
    48,
    48
   ],
   "close": [
    1704,
    4,
    96,
    96,
    48,
    48
   ],
   "plus": [
    1804,
    4,
    96,
    96,
    48,
    48
   ],
   "trophy": [
    1904,
    4,
    96,
    96,
    48,
    48
   ],
   "mission": [
    4,
    104,
    96,
    96,
    48,
    48
   ],
   "lab": [
    104,
    104,
    96,
    96,
    48,
    48
   ],
   "char": [
    204,
    104,
    96,
    96,
    48,
    48
   ],
   "pet": [
    304,
    104,
    96,
    96,
    48,
    48
   ],
   "boost": [
    404,
    104,
    96,
    96,
    48,
    48
   ],
   "crown": [
    504,
    104,
    96,
    96,
    48,
    48
   ],
   "clock": [
    604,
    104,
    96,
    96,
    48,
    48
   ],
   "flag": [
    704,
    104,
    96,
    96,
    48,
    48
   ],
   "bag": [
    804,
    104,
    96,
    96,
    48,
    48
   ],
   "heart": [
    904,
    104,
    96,
    96,
    48,
    48
   ],
   "info": [
    1004,
    104,
    96,
    96,
    48,
    48
   ],
   "gift": [
    1104,
    104,
    96,
    96,
    48,
    48
   ],
   "btn_jump": [
    1204,
    104,
    96,
    96,
    48,
    48
   ],
   "btn_slide": [
    1304,
    104,
    96,
    96,
    48,
    48
   ],
   "level": [
    1404,
    104,
    96,
    96,
    48,
    48
   ],
   "new": [
    1504,
    104,
    96,
    96,
    48,
    48
   ],
   "shield": [
    1604,
    104,
    96,
    96,
    48,
    48
   ],
   "rocket": [
    1704,
    104,
    96,
    96,
    48,
    48
   ],
   "fullscreen": [
    1804,
    104,
    96,
    96,
    48,
    48
   ],
   "exitfs": [
    1904,
    104,
    96,
    96,
    48,
    48
   ],
   "share": [
    4,
    204,
    96,
    96,
    48,
    48
   ],
   "addhome": [
    104,
    204,
    96,
    96,
    48,
    48
   ]
  }
 },
 "logo": {
  "type": "image",
  "src": "assets/img/ui/logo.png",
  "w": 1600,
  "h": 760,
  "ax": 800,
  "ay": 380,
  "scale": 2
 }
};

});

// ---- src/data/atlas.js
__def("src/data/atlas.js", function (__exports, __req) {
__exp(__exports, { "ATLAS": () => ATLAS });
// AUTO-GENERATED by tools/art/export.mjs — merges every src/data/atlas_*.js
const { ATLAS_CHARACTERS } = __req("src/data/atlas_characters.js");
const { ATLAS_FX } = __req("src/data/atlas_fx.js");
const { ATLAS_ITEMS } = __req("src/data/atlas_items.js");
const { ATLAS_LANDS } = __req("src/data/atlas_lands.js");
const { ATLAS_OBSTACLES } = __req("src/data/atlas_obstacles.js");
const { ATLAS_PETS } = __req("src/data/atlas_pets.js");
const { ATLAS_UI } = __req("src/data/atlas_ui.js");
const ATLAS = Object.assign({}, ATLAS_CHARACTERS, ATLAS_FX, ATLAS_ITEMS, ATLAS_LANDS, ATLAS_OBSTACLES, ATLAS_PETS, ATLAS_UI);

});

// ---- src/engine/assets.js
__def("src/engine/assets.js", function (__exports, __req) {
__exp(__exports, { "Assets": () => Assets });
// =============================================================================
//  Image assets: loading + sprite drawing from the generated atlas metadata.
//  Art is stored at `scale` art-px per logical unit (usually 2).
// =============================================================================
const { ATLAS } = __req("src/data/atlas.js");

const images = new Map();      // src -> HTMLImageElement
const tintCache = new Map();   // key -> canvas
const F = { img: null, sx: 0, sy: 0, sw: 0, sh: 0, ax: 0, ay: 0, s: 1 };

const Assets = {
  atlas: ATLAS,

  /** Load every image referenced by the atlas. onProgress(done, total) */
  async loadImages(onProgress, base = '') {
    const srcs = [...new Set(Object.values(ATLAS).map((a) => a.src))];
    let done = 0;
    await Promise.all(srcs.map((src) => new Promise((resolve) => {
      const img = new Image();
      img.onload = async () => {
        try { if (img.decode) await img.decode(); } catch (e) { /* ignore */ }
        images.set(src, img); done++; onProgress && onProgress(done, srcs.length); resolve();
      };
      img.onerror = () => { console.warn('image failed', src); done++; onProgress && onProgress(done, srcs.length); resolve(); };
      img.src = base + src;
    })));
  },

  has(id) { return !!ATLAS[id]; },
  meta(id) { return ATLAS[id]; },
  image(id) { const a = ATLAS[id]; return a ? images.get(a.src) : null; },

  /** Resolve a frame into the shared F struct (do not keep a reference). */
  frame(id, f = 0) {
    const a = ATLAS[id];
    if (!a) return null;
    const img = images.get(a.src);
    if (!img) return null;
    F.img = img; F.s = a.scale || 1;
    if (a.type === 'sheet') {
      const i = f | 0;
      F.sx = (i % a.cols) * a.fw; F.sy = Math.floor(i / a.cols) * a.fh;
      F.sw = a.fw; F.sh = a.fh; F.ax = a.ax; F.ay = a.ay;
    } else if (a.type === 'atlas') {
      const r = a.frames[f];
      if (!r) return null;
      F.sx = r[0]; F.sy = r[1]; F.sw = r[2]; F.sh = r[3]; F.ax = r[4]; F.ay = r[5];
    } else {
      F.sx = 0; F.sy = 0; F.sw = a.w; F.sh = a.h; F.ax = a.ax || 0; F.ay = a.ay || 0;
    }
    return F;
  },

  /** Logical size of a frame. */
  size(id, f = 0) {
    const fr = this.frame(id, f);
    return fr ? { w: fr.sw / fr.s, h: fr.sh / fr.s, ax: fr.ax / fr.s, ay: fr.ay / fr.s } : { w: 0, h: 0, ax: 0, ay: 0 };
  },

  /**
   * Draw a sprite with its anchor at (x, y) in logical units.
   * o: { scale, sx, sy, rot, alpha, flip, add, tint }
   */
  draw(ctx, id, f, x, y, o) {
    const fr = this.frame(id, f);
    if (!fr) return;
    const s = fr.s;
    if (!o) {
      ctx.drawImage(fr.img, fr.sx, fr.sy, fr.sw, fr.sh, x - fr.ax / s, y - fr.ay / s, fr.sw / s, fr.sh / s);
      return;
    }
    const scl = o.scale ?? 1;
    const kx = (o.sx ?? 1) * scl * (o.flip ? -1 : 1);
    const ky = (o.sy ?? 1) * scl;
    const alpha = o.alpha ?? 1;
    if (alpha <= 0.003) return;
    let src = fr.img, sx = fr.sx, sy = fr.sy;
    const { sw, sh, ax, ay } = fr;
    if (o.tint) {
      src = this.tinted(id, f, o.tint);
      sx = 0; sy = 0;
    }
    ctx.save();
    if (alpha !== 1) ctx.globalAlpha *= alpha;
    if (o.add) ctx.globalCompositeOperation = 'lighter';
    ctx.translate(x, y);
    if (o.rot) ctx.rotate(o.rot);
    if (kx !== 1 || ky !== 1) ctx.scale(kx, ky);
    ctx.drawImage(src, sx, sy, sw, sh, -ax / s, -ay / s, sw / s, sh / s);
    ctx.restore();
  },

  /** Flat-colour silhouette of a frame (cached) — for hit flashes, glows, shadows. */
  tinted(id, f, color) {
    const key = id + '|' + f + '|' + color;
    let c = tintCache.get(key);
    if (c) return c;
    const fr = this.frame(id, f);
    c = document.createElement('canvas');
    c.width = fr.sw; c.height = fr.sh;
    const g = c.getContext('2d');
    g.drawImage(fr.img, fr.sx, fr.sy, fr.sw, fr.sh, 0, 0, fr.sw, fr.sh);
    g.globalCompositeOperation = 'source-in';
    g.fillStyle = color; g.fillRect(0, 0, c.width, c.height);
    if (tintCache.size > 400) tintCache.clear();
    tintCache.set(key, c);
    return c;
  },

  /** Draw an image tiled horizontally across [x0, x1) starting at world offset. */
  tileX(ctx, id, worldOffset, y, x0, x1, alpha = 1) {
    const fr = this.frame(id, 0);
    if (!fr) return;
    const s = fr.s, w = fr.sw / s, h = fr.sh / s;
    let start = x0 - (((worldOffset % w) + w) % w);
    if (alpha !== 1) { ctx.save(); ctx.globalAlpha *= alpha; }
    for (let x = start; x < x1; x += w) ctx.drawImage(fr.img, fr.sx, fr.sy, fr.sw, fr.sh, x, y, w + 0.6, h);
    if (alpha !== 1) ctx.restore();
  },
};

});

// ---- src/engine/ui.js
__def("src/engine/ui.js", function (__exports, __req) {
__exp(__exports, { "font": () => font, "text": () => text, "measure": () => measure, "para": () => para, "rrPath": () => rrPath, "panel": () => panel, "ribbon": () => ribbon, "icon": () => icon, "counter": () => counter, "bar": () => bar, "Button": () => Button, "Slider": () => Slider, "Toggle": () => Toggle, "UIGroup": () => UIGroup, "Toasts": () => Toasts, "FONT": () => FONT, "COL": () => COL, "BTN": () => BTN, "rgba": () => rgba });
// =============================================================================
//  UI toolkit: fonts, outlined text, candy panels & buttons, sliders, toggles,
//  toasts. Everything is drawn with Canvas2D in logical units.
// =============================================================================
const { Assets } = __req("src/engine/assets.js");
const { clamp, Ease, rgba, TAU } = __req("src/engine/util.js");

const FONT = {
  display: '"DDDisplay", "Malgun Gothic", "Apple SD Gothic Neo", "Noto Sans KR", sans-serif',
  bold: '"DDBold", "Malgun Gothic", "Apple SD Gothic Neo", "Noto Sans KR", sans-serif',
  num: '"DDNum", "DDDisplay", "Arial Rounded MT Bold", "Malgun Gothic", sans-serif',
};
const WEIGHT = { display: 900, bold: 700, num: 700 };

const COL = {
  ink: '#4a2a1a', ink2: '#6b4430', cream: '#fff6e6', cream2: '#ffe7c2', paper: '#fffaf3', tan: '#f1d3a8',
  pink: '#ff6fa3', pinkD: '#c94479', green: '#5ccf4f', greenD: '#34952e', orange: '#ffa53a', orangeD: '#cf7417',
  blue: '#4fb6ff', blueD: '#2c7fc4', purple: '#a77bff', purpleD: '#7350c9', yellow: '#ffd23f', yellowD: '#c99a10',
  grey: '#c8bcc2', greyD: '#8f8288', red: '#ff5d5d', redD: '#c53a3a', mint: '#4fdcb9', mintD: '#24a383',
  white: '#ffffff', dim: 'rgba(40,18,24,0.55)', shade: 'rgba(74,42,26,0.28)',
};
const BTN = {
  green: ['#7be36b', '#5ccf4f', '#34952e'], pink: ['#ff92bd', '#ff6fa3', '#c94479'],
  orange: ['#ffc06a', '#ffa53a', '#cf7417'], blue: ['#86ceff', '#4fb6ff', '#2c7fc4'],
  purple: ['#c3a3ff', '#a77bff', '#7350c9'], yellow: ['#ffe57f', '#ffd23f', '#c99a10'],
  grey: ['#ddd3d8', '#c8bcc2', '#8f8288'], red: ['#ff8c8c', '#ff5d5d', '#c53a3a'],
  mint: ['#8af0d6', '#4fdcb9', '#24a383'], cream: ['#fffaf2', '#fff0d9', '#d9b88a'],
};

function font(size, kind = 'display') { return `${WEIGHT[kind] || 700} ${Math.round(size)}px ${FONT[kind] || FONT.display}`; }

/**
 * Outlined text. o: { size, font, color, stroke, sw, align, baseline, alpha, maxW, shadow }
 */
function text(ctx, str, x, y, o = {}) {
  str = String(str);
  const size = o.size ?? 24;
  ctx.save();
  ctx.font = font(size, o.font || 'display');
  ctx.textAlign = o.align || 'center';
  ctx.textBaseline = o.baseline || 'middle';
  if (o.alpha != null) ctx.globalAlpha *= o.alpha;
  let sx = 1;
  if (o.maxW) { const w = ctx.measureText(str).width; if (w > o.maxW) sx = o.maxW / w; }
  if (sx !== 1) { ctx.translate(x, y); ctx.scale(sx, 1); x = 0; y = 0; }
  ctx.lineJoin = 'round'; ctx.miterLimit = 2;
  if (o.shadow) {
    const sh = o.shadow === true ? { dx: 0, dy: size * 0.09, color: 'rgba(74,42,26,0.45)' } : o.shadow;
    if (o.stroke) { ctx.strokeStyle = sh.color; ctx.lineWidth = o.sw ?? Math.max(3, size * 0.16); ctx.strokeText(str, x + sh.dx, y + sh.dy); }
    ctx.fillStyle = sh.color; ctx.fillText(str, x + sh.dx, y + sh.dy);
  }
  if (o.stroke) { ctx.strokeStyle = o.stroke; ctx.lineWidth = o.sw ?? Math.max(3, size * 0.16); ctx.strokeText(str, x, y); }
  ctx.fillStyle = o.color || '#fff';
  ctx.fillText(str, x, y);
  ctx.restore();
}
function measure(ctx, str, size, kind = 'display') { ctx.save(); ctx.font = font(size, kind); const w = ctx.measureText(String(str)).width; ctx.restore(); return w; }

/** Word-wrapped paragraph (Korean wraps by character when needed). Returns height used. */
function para(ctx, str, x, y, maxW, o = {}) {
  const size = o.size ?? 18, lh = o.lh ?? size * 1.4;
  ctx.save(); ctx.font = font(size, o.font || 'bold');
  const lines = [];
  for (const rawLine of String(str).split('\n')) {
    const words = rawLine.split(' ');
    let cur = '';
    for (const w of words) {
      const test = cur ? cur + ' ' + w : w;
      if (ctx.measureText(test).width <= maxW) { cur = test; continue; }
      if (cur) lines.push(cur);
      if (ctx.measureText(w).width > maxW) { // break long word by chars
        let part = '';
        for (const ch of w) { if (ctx.measureText(part + ch).width > maxW) { lines.push(part); part = ch; } else part += ch; }
        cur = part;
      } else cur = w;
    }
    lines.push(cur);
  }
  ctx.restore();
  lines.forEach((ln, i) => text(ctx, ln, x, y + i * lh, { size, font: o.font || 'bold', color: o.color || COL.ink, align: o.align || 'left', baseline: 'top', alpha: o.alpha }));
  return lines.length * lh;
}

function rrPath(ctx, x, y, w, h, r) {
  r = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** Cream rounded panel with cocoa outline and drop shadow. o: { r, fill, fill2, stroke, lw, shadow, alpha } */
function panel(ctx, x, y, w, h, o = {}) {
  const r = o.r ?? 26;
  ctx.save();
  if (o.alpha != null) ctx.globalAlpha *= o.alpha;
  if (o.shadow !== false) { ctx.fillStyle = 'rgba(60,25,15,0.22)'; rrPath(ctx, x + 2, y + 8, w, h, r); ctx.fill(); }
  const g = ctx.createLinearGradient(0, y, 0, y + h);
  g.addColorStop(0, o.fill || COL.paper); g.addColorStop(1, o.fill2 || COL.cream2);
  ctx.fillStyle = g; rrPath(ctx, x, y, w, h, r); ctx.fill();
  if (o.inner !== false) { ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 3; rrPath(ctx, x + 5, y + 5, w - 10, h - 10, Math.max(2, r - 5)); ctx.stroke(); }
  ctx.strokeStyle = o.stroke || COL.ink; ctx.lineWidth = o.lw ?? 4.5; rrPath(ctx, x, y, w, h, r); ctx.stroke();
  ctx.restore();
}

/** Ribbon title banner centred at (cx, cy). */
function ribbon(ctx, cx, cy, w, label, color = 'pink', size = 30) {
  const [hi, base, dark] = BTN[color] || BTN.pink;
  const h = size * 1.7;
  ctx.save();
  // tails
  for (const s of [-1, 1]) {
    ctx.beginPath();
    const ex = cx + s * (w / 2 + h * 0.55), bx = cx + s * (w / 2 - 6);
    ctx.moveTo(bx, cy - h * 0.25); ctx.lineTo(ex, cy - h * 0.25); ctx.lineTo(ex - s * h * 0.28, cy + h * 0.2); ctx.lineTo(ex, cy + h * 0.62); ctx.lineTo(bx, cy + h * 0.62); ctx.closePath();
    ctx.fillStyle = dark; ctx.fill(); ctx.strokeStyle = COL.ink; ctx.lineWidth = 4; ctx.lineJoin = 'round'; ctx.stroke();
  }
  const g = ctx.createLinearGradient(0, cy - h / 2, 0, cy + h / 2);
  g.addColorStop(0, hi); g.addColorStop(1, base);
  rrPath(ctx, cx - w / 2, cy - h / 2, w, h, 14);
  ctx.fillStyle = g; ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.28)'; rrPath(ctx, cx - w / 2 + 8, cy - h / 2 + 5, w - 16, h * 0.32, 8); ctx.fill();
  ctx.strokeStyle = COL.ink; ctx.lineWidth = 4.5; rrPath(ctx, cx - w / 2, cy - h / 2, w, h, 14); ctx.stroke();
  ctx.restore();
  text(ctx, label, cx, cy + 1, { size, color: '#fff', stroke: COL.ink, sw: size * 0.22, maxW: w - 20 });
}

function icon(ctx, name, x, y, size = 48, alpha = 1) {
  if (!Assets.has('ui')) return;
  Assets.draw(ctx, 'ui', name, x, y, { scale: size / 48, alpha });
}

/** Candy pill with icon + value (coins etc.). */
function counter(ctx, x, y, iconName, value, o = {}) {
  const w = o.w ?? 170, h = o.h ?? 46;
  ctx.save();
  rrPath(ctx, x, y - h / 2, w, h, h / 2);
  ctx.fillStyle = o.bg || 'rgba(74,42,26,0.55)'; ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 2; ctx.stroke();
  ctx.restore();
  icon(ctx, iconName, x + 4, y, o.iconSize ?? 50);
  text(ctx, value, x + w - 16, y + 1, { size: o.size ?? 24, font: 'num', align: 'right', color: '#fff', stroke: COL.ink, sw: 5 });
}

function bar(ctx, x, y, w, h, t, o = {}) {
  t = clamp(t, 0, 1);
  ctx.save();
  rrPath(ctx, x, y, w, h, h / 2); ctx.fillStyle = o.bg || 'rgba(74,42,26,0.35)'; ctx.fill();
  if (t > 0) {
    const g = ctx.createLinearGradient(0, y, 0, y + h);
    const [c0, c1] = o.colors || ['#9dff7a', '#3fbf3a'];
    g.addColorStop(0, c0); g.addColorStop(1, c1);
    ctx.save(); rrPath(ctx, x, y, w, h, h / 2); ctx.clip();
    rrPath(ctx, x, y, Math.max(h, w * t), h, h / 2); ctx.fillStyle = g; ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fillRect(x, y + 2, w * t, h * 0.3);
    ctx.restore();
  }
  ctx.strokeStyle = o.stroke || COL.ink; ctx.lineWidth = o.lw ?? 3.5; rrPath(ctx, x, y, w, h, h / 2); ctx.stroke();
  ctx.restore();
}

// ---------------------------------------------------------------------------
// Widgets
// ---------------------------------------------------------------------------
class Button {
  constructor(o) {
    Object.assign(this, { x: 0, y: 0, w: 200, h: 70, label: '', sub: null, icon: null, iconSize: null, color: 'green', size: null,
      onClick: null, enabled: true, visible: true, badge: null, round: false, sound: 'ui_click', key: null, hidden: false, alpha: 1, price: null }, o);
    this.press = 0; this.hover = false; this.downId = null; this.pop = 0;
  }
  hit(px, py) {
    if (!this.visible) return false;
    if (this.round) { const r = this.w / 2; return (px - this.x) ** 2 + (py - this.y) ** 2 <= r * r * 1.1; }
    return px >= this.x - 4 && px <= this.x + this.w + 4 && py >= this.y - 4 && py <= this.y + this.h + 6;
  }
  update(dt) {
    const target = this.downId !== null ? 1 : 0;
    this.press += (target - this.press) * Math.min(1, dt * 30);
    if (this.pop > 0) this.pop = Math.max(0, this.pop - dt * 3);
  }
  draw(ctx) {
    if (!this.visible) return;
    const cols = BTN[this.enabled ? this.color : 'grey'] || BTN.green;
    const [hi, base, dark] = cols;
    const depth = this.round ? 6 : 7;
    const p = this.press;
    const s = 1 + (this.hover && this.enabled ? 0.03 : 0) - p * 0.03 + Ease.outBack(Math.min(1, 1 - this.pop)) * 0 + this.pop * 0.08;
    ctx.save();
    if (this.alpha !== 1) ctx.globalAlpha *= this.alpha;
    if (this.round) {
      const r = this.w / 2, cx = this.x, cy = this.y;
      ctx.translate(cx, cy); ctx.scale(s, s); ctx.translate(-cx, -cy);
      const off = p * (depth - 2);
      ctx.fillStyle = 'rgba(60,25,15,0.25)'; ctx.beginPath(); ctx.arc(cx + 1, cy + depth + 4, r, 0, TAU); ctx.fill();
      ctx.fillStyle = dark; ctx.beginPath(); ctx.arc(cx, cy + depth, r, 0, TAU); ctx.fill();
      const g = ctx.createLinearGradient(0, cy - r + off, 0, cy + r + off);
      g.addColorStop(0, hi); g.addColorStop(1, base);
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy + off, r, 0, TAU); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.32)'; ctx.beginPath(); ctx.ellipse(cx - r * 0.18, cy - r * 0.42 + off, r * 0.58, r * 0.3, -0.2, 0, TAU); ctx.fill();
      ctx.strokeStyle = COL.ink; ctx.lineWidth = 4.5;
      ctx.beginPath(); ctx.arc(cx, cy + off, r, 0, TAU); ctx.stroke();
      ctx.beginPath(); ctx.arc(cx, cy + depth, r, 0.15, Math.PI - 0.15); ctx.stroke();
      if (this.icon) icon(ctx, this.icon, cx, cy + off, this.iconSize ?? r * 1.25);
      if (this.label) text(ctx, this.label, cx, cy + off + (this.icon ? r * 0.62 : 0), { size: this.size ?? r * 0.5, color: '#fff', stroke: COL.ink, sw: 5 });
    } else {
      const { x, y, w, h } = this;
      const r = Math.min(h / 2, 22);
      const cx = x + w / 2, cy = y + h / 2;
      ctx.translate(cx, cy); ctx.scale(s, s); ctx.translate(-cx, -cy);
      const off = p * (depth - 2);
      ctx.fillStyle = 'rgba(60,25,15,0.25)'; rrPath(ctx, x + 2, y + depth + 5, w, h - depth, r); ctx.fill();
      ctx.fillStyle = dark; rrPath(ctx, x, y + depth, w, h - depth, r); ctx.fill();
      const g = ctx.createLinearGradient(0, y + off, 0, y + h - depth + off);
      g.addColorStop(0, hi); g.addColorStop(1, base);
      ctx.fillStyle = g; rrPath(ctx, x, y + off, w, h - depth, r); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.3)'; rrPath(ctx, x + 8, y + off + 5, w - 16, (h - depth) * 0.36, r * 0.6); ctx.fill();
      ctx.strokeStyle = COL.ink; ctx.lineWidth = 4.5;
      rrPath(ctx, x, y + off, w, h - depth, r); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x + 3, y + h - depth - r * 0.3 + off); ctx.lineTo(x + 3, y + h - r * 0.6);
      ctx.arcTo(x + 3, y + h, x + r, y + h, r * 0.9); ctx.lineTo(x + w - r, y + h); ctx.arcTo(x + w - 3, y + h, x + w - 3, y + h - r, r * 0.9);
      ctx.lineTo(x + w - 3, y + h - depth - r * 0.3 + off); ctx.stroke();
      const fh = h - depth;
      const size = this.size ?? Math.min(fh * 0.46, 34);
      let lx = cx;
      const hasIcon = !!this.icon;
      if (hasIcon && this.label) {
        const iw = this.iconSize ?? fh * 0.72;
        const tw = measure(ctx, this.label, size);
        const total = iw * 0.85 + tw;
        icon(ctx, this.icon, cx - total / 2 + iw * 0.38, y + off + fh / 2, iw);
        lx = cx - total / 2 + iw * 0.85 + tw / 2;
      } else if (hasIcon) icon(ctx, this.icon, cx, y + off + fh / 2, this.iconSize ?? fh * 0.8);
      if (this.label) {
        const ly = y + off + fh / 2 + (this.sub ? -size * 0.32 : 1);
        text(ctx, this.label, lx, ly, { size, color: '#fff', stroke: COL.ink, sw: Math.max(4, size * 0.2), maxW: w - 24 });
        if (this.sub) text(ctx, this.sub, lx, ly + size * 0.82, { size: size * 0.6, font: 'num', color: '#fff', stroke: COL.ink, sw: 4, maxW: w - 24 });
      }
    }
    ctx.restore();
    if (this.badge) {
      const bx = this.round ? this.x + this.w * 0.36 : this.x + this.w - 8, by = this.round ? this.y - this.w * 0.36 : this.y + 4;
      ctx.save();
      ctx.fillStyle = COL.red; ctx.beginPath(); ctx.arc(bx, by, 14, 0, TAU); ctx.fill();
      ctx.strokeStyle = COL.ink; ctx.lineWidth = 3.5; ctx.stroke(); ctx.restore();
      text(ctx, this.badge === true ? '!' : this.badge, bx, by + 1, { size: 17, font: 'num', color: '#fff' });
    }
  }
}

class Slider {
  constructor(o) { Object.assign(this, { x: 0, y: 0, w: 300, value: 0.5, onChange: null, color: 'pink', visible: true }, o); this.drag = null; }
  hit(px, py) { return this.visible && px >= this.x - 20 && px <= this.x + this.w + 20 && Math.abs(py - this.y) < 30; }
  set(px) { this.value = clamp((px - this.x) / this.w, 0, 1); if (this.onChange) this.onChange(this.value); }
  update() {}
  draw(ctx) {
    if (!this.visible) return;
    bar(ctx, this.x, this.y - 11, this.w, 22, this.value, { colors: [BTN[this.color][0], BTN[this.color][2]] });
    const kx = this.x + this.w * this.value;
    ctx.save(); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(kx, this.y, 19, 0, TAU); ctx.fill();
    ctx.strokeStyle = COL.ink; ctx.lineWidth = 4; ctx.stroke(); ctx.restore();
    text(ctx, Math.round(this.value * 100), this.x + this.w + 46, this.y + 1, { size: 22, font: 'num', color: COL.ink });
  }
}

class Toggle {
  constructor(o) { Object.assign(this, { x: 0, y: 0, w: 92, h: 46, value: false, onChange: null, visible: true }, o); this.anim = this.value ? 1 : 0; }
  hit(px, py) { return this.visible && px >= this.x - 6 && px <= this.x + this.w + 6 && py >= this.y - 6 && py <= this.y + this.h + 6; }
  update(dt) { this.anim += ((this.value ? 1 : 0) - this.anim) * Math.min(1, dt * 14); }
  draw(ctx) {
    if (!this.visible) return;
    const { x, y, w, h } = this;
    ctx.save();
    rrPath(ctx, x, y, w, h, h / 2);
    ctx.fillStyle = this.anim > 0.5 ? COL.green : COL.grey; ctx.fill();
    ctx.strokeStyle = COL.ink; ctx.lineWidth = 4; ctx.stroke();
    const kx = x + h / 2 + (w - h) * this.anim;
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(kx, y + h / 2, h / 2 - 6, 0, TAU); ctx.fill();
    ctx.strokeStyle = COL.ink; ctx.lineWidth = 3.5; ctx.stroke();
    ctx.restore();
    text(ctx, this.value ? 'ON' : 'OFF', x + w + 40, y + h / 2 + 1, { size: 20, font: 'num', color: COL.ink });
  }
}

/** A set of widgets with shared pointer handling. */
class UIGroup {
  constructor(game) { this.game = game; this.items = []; this.enabled = true; }
  add(w) { this.items.push(w); return w; }
  clear() { this.items.length = 0; }
  update(dt) { for (const w of this.items) w.update && w.update(dt); }
  draw(ctx) { for (const w of this.items) w.draw(ctx); }
  pointer(type, p) {
    if (!this.enabled) return false;
    const audio = this.game.audio;
    if (type === 'move') {
      for (const w of this.items) {
        if (w instanceof Button) w.hover = p.type === 'mouse' && w.hit(p.x, p.y);
        if (w instanceof Slider && w.drag === p.id) w.set(p.x);
      }
      return false;
    }
    if (type === 'down') {
      for (let i = this.items.length - 1; i >= 0; i--) {
        const w = this.items[i];
        if (!w.visible || !w.hit(p.x, p.y)) continue;
        if (w instanceof Button) { if (w.enabled || w.onDisabled) { w.downId = p.id; } else audio.play('ui_error'); return true; }
        if (w instanceof Slider) { w.drag = p.id; w.set(p.x); return true; }
        if (w instanceof Toggle) { w.value = !w.value; audio.play('ui_toggle'); w.onChange && w.onChange(w.value); return true; }
      }
      return false;
    }
    if (type === 'up' || type === 'cancel') {
      let used = false;
      for (const w of this.items) {
        if (w instanceof Slider && w.drag === p.id) { w.drag = null; audio.play('ui_toggle'); used = true; }
        if (w instanceof Button && w.downId === p.id) {
          w.downId = null; used = true;
          if (type === 'up' && w.hit(p.x, p.y)) {
            if (w.enabled) { if (w.sound) audio.play(w.sound); w.pop = 0.5; w.onClick && w.onClick(w); }
            else if (w.onDisabled) { audio.play('ui_error'); w.onDisabled(w); }
          }
        }
      }
      return used;
    }
    return false;
  }
  /** Keyboard shortcut support: buttons with .key matching a code/action fire. */
  key(code, acts) {
    for (const w of this.items) {
      if (!(w instanceof Button) || !w.visible || !w.key) continue;
      const keys = Array.isArray(w.key) ? w.key : [w.key];
      if (keys.includes(code) || acts.some((a) => keys.includes(a))) {
        if (w.enabled) { if (w.sound) this.game.audio.play(w.sound); w.pop = 0.5; w.onClick && w.onClick(w); }
        else this.game.audio.play('ui_error');
        return true;
      }
    }
    return false;
  }
}

// ---------------------------------------------------------------------------
// Toasts (global, drawn above everything)
// ---------------------------------------------------------------------------
class Toasts {
  constructor() { this.list = []; }
  push(msg, o = {}) {
    this.list.push({ msg, t: 0, dur: o.dur ?? 2.2, color: o.color || 'rgba(74,42,26,0.88)', icon: o.icon || null });
    if (this.list.length > 4) this.list.shift();
  }
  update(dt) { for (const t of this.list) t.t += dt; this.list = this.list.filter((t) => t.t < t.dur); }
  draw(ctx, W) {
    let y = 112;
    for (const t of this.list) {
      const a = Math.min(1, t.t / 0.18, (t.dur - t.t) / 0.3);
      const slide = (1 - Ease.outBack(Math.min(1, t.t / 0.3))) * -30;
      ctx.save(); ctx.globalAlpha = a;
      const w = Math.min(W - 80, measure(ctx, t.msg, 24, 'bold') + (t.icon ? 90 : 60));
      rrPath(ctx, W / 2 - w / 2, y + slide - 26, w, 52, 26);
      ctx.fillStyle = t.color; ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 2.5; ctx.stroke();
      ctx.restore();
      if (t.icon) icon(ctx, t.icon, W / 2 - w / 2 + 34, y + slide, 40, a);
      text(ctx, t.msg, W / 2 + (t.icon ? 16 : 0), y + slide + 1, { size: 24, font: 'bold', color: '#fff', alpha: a, maxW: w - 50 });
      y += 62;
    }
  }
}



});

// ---- src/engine/scene.js
__def("src/engine/scene.js", function (__exports, __req) {
__exp(__exports, { "Scene": () => Scene, "SceneManager": () => SceneManager, "Modal": () => Modal, "para": () => para });
// =============================================================================
//  Scenes, scene manager with fade transitions, and modal dialogs.
// =============================================================================
const { Tweens } = __req("src/engine/tween.js");
const { UIGroup, Button, panel, ribbon, para, text, COL } = __req("src/engine/ui.js");
const { Ease } = __req("src/engine/util.js");

class Scene {
  constructor(game) {
    this.game = game;
    this.ui = new UIGroup(game);
    this.tw = new Tweens();
    this.t = 0;
  }
  get W() { return this.game.view.W; }
  get H() { return this.game.view.H; }
  enter() {}
  exit() {}
  layout() {}
  update(dt) { this.t += dt; this.tw.update(dt); this.ui.update(dt); }
  render() {}
  pointer(type, p) { return this.ui.pointer(type, p); }
  key(code, acts) { return this.ui.key(code, acts); }
  wheel() {}
  blur() {}
}

class SceneManager {
  constructor(game) {
    this.game = game;
    this.cur = null;
    this.pending = null;
    this.fade = 0;          // 0 = clear, 1 = covered
    this.phase = 'idle';    // idle | out | in
    this.fadeTime = 0.3;
    this.fadeColor = '#2a1420';
    this.modals = [];
  }

  go(scene, params = {}, o = {}) {
    if (this.phase === 'out') { this.pending = { scene, params, o }; return; }
    this.pending = { scene, params, o };
    this.fadeTime = o.fade ?? 0.3;
    this.fadeColor = o.color || '#2a1420';
    if (!this.cur || this.fadeTime <= 0) { this._swap(); this.phase = this.fadeTime > 0 ? 'in' : 'idle'; this.fade = this.fadeTime > 0 ? 1 : 0; return; }
    this.phase = 'out';
  }
  _swap() {
    if (!this.pending) return;
    const { scene, params } = this.pending;
    this.pending = null;
    try { if (this.cur) this.cur.exit(); } catch (e) { console.error(e); }
    this.modals.length = 0;
    this.cur = scene;
    scene.enter(params);
  }

  modal(m) { this.modals.push(m); m.open(); return m; }
  closeModal(m) { const i = this.modals.indexOf(m); if (i >= 0) this.modals.splice(i, 1); }
  get topModal() { return this.modals[this.modals.length - 1] || null; }

  update(dt) {
    if (this.phase === 'out') {
      this.fade = Math.min(1, this.fade + dt / this.fadeTime);
      if (this.fade >= 1) { this.phase = 'in'; this._swap(); }
    } else if (this.phase === 'in') {
      this.fade = Math.max(0, this.fade - dt / this.fadeTime);
      if (this.fade <= 0) this.phase = 'idle';
    }
    if (this.cur) this.cur.update(dt);
    for (const m of this.modals) m.update(dt);
  }

  render(ctx) {
    if (this.cur) this.cur.render(ctx);
    for (const m of this.modals) m.render(ctx);
    if (this.fade > 0) {
      ctx.save();
      ctx.globalAlpha = Ease.inOutQuad(this.fade);
      ctx.fillStyle = this.fadeColor;
      ctx.fillRect(0, 0, this.game.view.W, this.game.view.H);
      ctx.restore();
    }
  }

  pointer(type, p) {
    if (this.phase === 'out') return true;
    const m = this.topModal;
    if (m) { m.pointer(type, p); return true; }
    return this.cur ? this.cur.pointer(type, p) : false;
  }
  key(code, acts) {
    if (this.phase === 'out') return;
    const m = this.topModal;
    if (m) { m.key(code, acts); return; }
    if (this.cur) this.cur.key(code, acts);
  }
  wheel(dy, p) { if (!this.topModal && this.cur) this.cur.wheel(dy, p); }
  layout() { if (this.cur) this.cur.layout(); for (const m of this.modals) m.layout(); }
  blur() { if (this.cur) this.cur.blur(); }
}

/**
 * Modal dialog. o: { title, message, buttons:[{label,color,onClick,key}], width, height, draw(ctx, box, t), color, closeOnBack }
 * Button onClick receives the modal; return value ignored; modal closes unless onClick returns false.
 */
class Modal {
  constructor(game, o) {
    this.game = game;
    this.o = Object.assign({ width: 640, height: 360, color: 'pink', buttons: [{ label: '확인', color: 'green', key: ['confirm', 'Space'] }], closeOnBack: true }, o);
    this.ui = new UIGroup(game);
    this.t = 0; this.closing = false; this.k = 0;
  }
  open() { this.game.audio.play('ui_open'); this.layout(); }
  layout() {
    const { W, H } = this.game.view;
    const { width: w, height: h } = this.o;
    this.box = { x: (W - w) / 2, y: (H - h) / 2 + 10, w, h };
    this.ui.clear();
    const bs = this.o.buttons;
    const bw = Math.min(240, (w - 60 - (bs.length - 1) * 20) / bs.length), bh = 76;
    const total = bs.length * bw + (bs.length - 1) * 20;
    bs.forEach((b, i) => {
      this.ui.add(new Button({ x: (W - total) / 2 + i * (bw + 20), y: this.box.y + h - bh - 26, w: bw, h: bh, label: b.label, color: b.color || 'green', icon: b.icon || null,
        key: b.key || null, sound: b.sound ?? 'ui_click', enabled: b.enabled ?? true,
        onClick: () => { const r = b.onClick ? b.onClick(this) : undefined; if (r !== false) this.close(); } }));
    });
  }
  close() { if (this.closing) return; this.closing = true; }
  update(dt) {
    this.t += dt;
    this.ui.update(dt);
    if (this.closing) { this.k -= dt * 6; if (this.k <= 0) this.game.scenes.closeModal(this); }
    else this.k = Math.min(1, this.k + dt * 5);
  }
  render(ctx) {
    const { W, H } = this.game.view;
    const k = Math.max(0, this.k);
    ctx.save();
    ctx.globalAlpha = k;
    ctx.fillStyle = 'rgba(30,12,20,0.6)'; ctx.fillRect(0, 0, W, H);
    const b = this.box;
    const s = 0.85 + 0.15 * Ease.outBack(k);
    ctx.translate(W / 2, b.y + b.h / 2); ctx.scale(s, s); ctx.translate(-W / 2, -(b.y + b.h / 2));
    panel(ctx, b.x, b.y, b.w, b.h, { r: 30 });
    if (this.o.title) ribbon(ctx, W / 2, b.y + 4, Math.min(b.w - 120, 380), this.o.title, this.o.color, 30);
    if (this.o.draw) this.o.draw(ctx, b, this.t);
    else if (this.o.message) {
      const lines = String(this.o.message).split('\n');
      const top = b.y + 70;
      const avail = b.h - 70 - 110;
      const lh = 34;
      const y0 = top + Math.max(0, (avail - lines.length * lh) / 2);
      lines.forEach((ln, i) => text(ctx, ln, W / 2, y0 + i * lh + lh / 2, { size: 25, font: 'bold', color: COL.ink, maxW: b.w - 70 }));
    }
    this.ui.draw(ctx);
    ctx.restore();
  }
  pointer(type, p) { if (!this.closing) this.ui.pointer(type, p); }
  key(code, acts) {
    if (this.closing) return;
    if (this.ui.key(code, acts)) return;
    if (this.o.closeOnBack && acts.includes('back')) { this.game.audio.play('ui_back'); this.close(); if (this.o.onBack) this.o.onBack(); }
  }
}



});

// ---- src/engine/storage.js
__def("src/engine/storage.js", function (__exports, __req) {
__exp(__exports, { "defaultSave": () => defaultSave, "Save": () => Save });
// =============================================================================
//  Save data in localStorage (guarded: works without storage, e.g. private mode)
// =============================================================================
const { CFG } = __req("src/config.js");

function defaultSave() {
  return {
    v: 1,
    coins: 300,
    best: 0, bestDist: 0, bestLand: 1,
    xp: 0, level: 1,
    chars: { chip: { lv: 1 } },
    sel: 'chip', relay: null,
    pets: {}, pet: null,
    lab: { jelly: 0, energy: 0, milk: 0, item: 0, rush: 0, coin: 0, spurt: 0 },
    boosts: { dash: false, energy: false, revive: false, letters: false, magnet: false },
    missions: [],
    records: [],
    missionHist: {},
    stats: { runs: 0, jumps: 0, djumps: 0, slideTime: 0, smash: 0, rush: 0, coinsTotal: 0, jellyTotal: 0, plays: {} },
    settings: { music: 0.7, sfx: 0.9, shake: true, touch: 'auto', quality: 'high', vibrate: true, autoFS: true },
    tutorial: false,
    created: Date.now(),
  };
}

function merge(def, val) {
  if (val === null || val === undefined) return def;
  if (typeof def !== 'object' || def === null || Array.isArray(def)) return typeof val === typeof def || def === null ? val : def;
  const out = { ...def };
  for (const k of Object.keys(val)) out[k] = k in def ? merge(def[k], val[k]) : val[k];
  return out;
}

const Save = {
  data: defaultSave(),
  available: false,
  load() {
    try {
      const raw = localStorage.getItem(CFG.SAVE_KEY);
      this.available = true;
      if (raw) this.data = merge(defaultSave(), JSON.parse(raw));
    } catch (e) { this.available = false; this.data = defaultSave(); }
    return this.data;
  },
  save() {
    try { localStorage.setItem(CFG.SAVE_KEY, JSON.stringify(this.data)); return true; } catch (e) { return false; }
  },
  reset() {
    const keepSettings = this.data.settings;
    this.data = defaultSave();
    this.data.settings = keepSettings;
    this.save();
  },
};

});

// ---- src/engine/display.js
__def("src/engine/display.js", function (__exports, __req) {
__exp(__exports, { "Display": () => Display });
// =============================================================================
//  Display helpers for phones & tablets: fullscreen (+ landscape lock), the
//  "install as app" prompt, screen wake lock and a little platform sniffing.
//
//  mode tells a fullscreen button what it can do in this browser:
//    'toggle'   Fullscreen API works (Android, iPad, desktop)
//    'help'     iPhone Safari: no Fullscreen API -> explain "홈 화면에 추가"
//    'external' KakaoTalk in-app browser -> offer to reopen in a real browser
//    null       already an installed app window, or embedded where it can't work
// =============================================================================
const doc = document, root = document.documentElement;
const mq = (q) => { try { return matchMedia(q).matches; } catch (e) { return false; } };
const UA = navigator.userAgent || '';

const Display = {
  ios: /iPad|iPhone|iPod/.test(UA) || (navigator.platform === 'MacIntel' && (navigator.maxTouchPoints || 0) > 1),
  android: /Android/i.test(UA),
  kakao: /KAKAOTALK/i.test(UA),
  touch: mq('(pointer: coarse)') || ((navigator.maxTouchPoints || 0) > 0 && mq('(hover: none)')),
  embedded: (() => { try { return window.self !== window.top; } catch (e) { return true; } })(),

  installEvt: null,
  autoArmed: false,
  pending: null,
  lastPointer: 'mouse',
  restoreOnReturn: false,
  fsExitAt: -1e9,
  wake: null,
  wakeWanted: false,
  listeners: new Set(),

  /** Running as an installed app window ("display-mode: fullscreen" also matches Fullscreen-API fullscreen, so exclude that). */
  get standalone() { return mq('(display-mode: standalone)') || navigator.standalone === true || (mq('(display-mode: fullscreen)') && !this.isFullscreen); },
  get canFullscreen() { return !!(doc.fullscreenEnabled || doc.webkitFullscreenEnabled) && !!(root.requestFullscreen || root.webkitRequestFullscreen); },
  get isFullscreen() { return !!(doc.fullscreenElement || doc.webkitFullscreenElement); },
  get mode() {
    if (this.standalone) return null;
    if (this.kakao && (this.ios || !this.canFullscreen)) return 'external';
    if (this.canFullscreen) return 'toggle';
    if (this.ios && !this.embedded) return 'help';
    return null;
  },
  get canInstall() { return !!this.installEvt && !this.standalone; },

  /** o.auto(): whether to go fullscreen on the first tap (touch devices only). */
  init(o = {}) {
    this.autoPref = o.auto || (() => true);
    this.autoArmed = this.touch && this.autoPref();
    const onFs = () => {
      if (!this.isFullscreen) this.fsExitAt = performance.now();
      this.emit('fs');
    };
    doc.addEventListener('fullscreenchange', onFs);
    doc.addEventListener('webkitfullscreenchange', onFs);
    // The first tap (and the first tap after coming back to the app, if we were
    // fullscreen when it went to the background) enters fullscreen. For touch the
    // request has to happen in touchend: pointerdown is not a user gesture, and
    // Safari does not accept pointerup either.
    const release = (e) => {
      if (e.type === 'pointerup' && e.pointerType === 'touch') return; // wait for its touchend
      if (this.pending) { this.pending(); return; }
      if (!this.autoArmed) return;
      this.autoArmed = false;
      if (this.mode === 'toggle' && !this.isFullscreen) this.enter();
    };
    window.addEventListener('pointerdown', (e) => { this.lastPointer = e.pointerType || 'mouse'; }, true);
    window.addEventListener('pointerup', release, true);
    window.addEventListener('touchend', release, true);
    doc.addEventListener('visibilitychange', () => {
      if (doc.hidden) {
        if (this.isFullscreen || performance.now() - this.fsExitAt < 1500) this.restoreOnReturn = true;
      } else {
        if (this.restoreOnReturn && this.touch && this.autoPref()) this.autoArmed = true;
        this.restoreOnReturn = false;
        if (this.wakeWanted) this.keepAwake(true);
      }
    });
    window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); this.installEvt = e; this.emit('install'); });
    window.addEventListener('appinstalled', () => { this.installEvt = null; this.emit('install'); });
    try { matchMedia('(display-mode: standalone), (display-mode: fullscreen)').addEventListener('change', () => this.emit('mode')); } catch (e) { /* old browsers */ }
  },

  /** Enter fullscreen from a button / toggle handler: right away for mouse & keys, at touchend for touch. */
  enterSoon(cb) {
    const run = () => { if (this.pending !== run) return; this.pending = null; this.autoArmed = false; this.enter().then((ok) => { if (cb) cb(ok); }); };
    this.pending = run;
    if (this.lastPointer === 'touch') setTimeout(run, 700); // fallback if no touchend arrives
    else run();
  },

  async enter() {
    try {
      if (root.requestFullscreen) await root.requestFullscreen({ navigationUI: 'hide' });
      else if (root.webkitRequestFullscreen) root.webkitRequestFullscreen();
      else return false;
    } catch (e) { return false; }
    this.lockLandscape();
    return true;
  },
  async exit() {
    this.autoArmed = false;
    this.restoreOnReturn = false;
    try {
      if (doc.exitFullscreen) { if (doc.fullscreenElement) await doc.exitFullscreen(); }
      else if (doc.webkitExitFullscreen) doc.webkitExitFullscreen();
    } catch (e) { /* already out */ }
  },
  toggle() { return this.isFullscreen ? this.exit() : this.enter(); },
  async lockLandscape() {
    try { if (screen.orientation && screen.orientation.lock) await screen.orientation.lock('landscape'); } catch (e) { /* only works fullscreen / installed */ }
  },

  /** Show the browser's own "install app" dialog (Chrome / Edge / Samsung Internet). */
  async install() {
    const e = this.installEvt;
    if (!e) return false;
    this.installEvt = null;
    let ok = false;
    try { await e.prompt(); const r = await e.userChoice; ok = !!r && r.outcome === 'accepted'; } catch (err) { ok = false; }
    this.emit('install');
    return ok;
  },

  /** Keep the screen on while running (released automatically when hidden). */
  async keepAwake(on) {
    this.wakeWanted = on;
    if (!navigator.wakeLock) return;
    if (on) {
      if (this.wake || doc.hidden) return;
      try {
        const w = await navigator.wakeLock.request('screen');
        if (!this.wakeWanted) { w.release().catch(() => {}); return; }
        this.wake = w;
        w.addEventListener('release', () => { if (this.wake === w) this.wake = null; });
      } catch (e) { this.wake = null; }
    } else if (this.wake) {
      const w = this.wake; this.wake = null;
      try { await w.release(); } catch (e) { /* ignore */ }
    }
  },

  /** Reopen the page outside the KakaoTalk in-app browser. */
  openExternal() {
    location.href = 'kakaotalk://web/openExternal?url=' + encodeURIComponent(location.href);
  },

  onChange(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn); },
  emit(kind) { for (const fn of [...this.listeners]) { try { fn(kind); } catch (e) { console.error(e); } } },
};

});

// ---- src/data/content.js
__def("src/data/content.js", function (__exports, __req) {
__exp(__exports, { "charLevelBonus": () => charLevelBonus, "labCost": () => labCost, "xpNeed": () => xpNeed, "levelReward": () => levelReward, "MAX_CHAR_LV": () => MAX_CHAR_LV, "CHAR_LV_COST": () => CHAR_LV_COST, "CHARS": () => CHARS, "CHAR": () => CHAR, "PETS": () => PETS, "PET": () => PET, "LANDS": () => LANDS, "POWERUPS": () => POWERUPS, "LAB": () => LAB, "LAB_ID": () => LAB_ID, "BOOSTS": () => BOOSTS, "MISSION_TEMPLATES": () => MISSION_TEMPLATES, "MISSION_REWARD": () => MISSION_REWARD, "TIPS": () => TIPS });
// =============================================================================
//  Game content: runners, pets, lands, power-ups, lab upgrades, boosts, missions
//  (all original). Text is Korean.
// =============================================================================
const { fmt } = __req("src/engine/util.js");

const lvv = (base, per) => (lv) => base + per * (lv - 1);
const s1 = (v) => (Math.round(v * 10) / 10).toString();

const MAX_CHAR_LV = 10;
const CHAR_LV_COST = [0, 200, 350, 550, 800, 1100, 1450, 1850, 2300, 2800];

const CHARS = [
  {
    id: 'chip', name: '칩', kind: '초코칩 쿠키', price: 0, energy: 100,
    desc: '용감하고 씩씩한 초코칩 쿠키. 바람에 휘날리는 빨간 목도리가 자랑이에요.',
    skill: { name: '초코 소나기', cd: lvv(16, -0.5), dur: lvv(4, 0.2),
      text: (lv, S) => `${s1(S.cd(lv))}초마다 ${s1(S.dur(lv))}초 동안 길 위로 초코 젤리가 쏟아져요.` },
  },
  {
    id: 'maca', name: '마카', kind: '딸기 마카롱', price: 1500, energy: 95,
    desc: '달콤한 딸기 크림을 품은 마카롱. 반짝이는 걸 정말 좋아해요.',
    skill: { name: '스윗 블룸', cd: lvv(18, -0.5), dur: lvv(5, 0.25),
      text: (lv, S) => `${s1(S.cd(lv))}초마다 ${s1(S.dur(lv))}초 동안 앞의 젤리가 커다란 별 젤리로 피어나요.` },
  },
  {
    id: 'pudding', name: '푸딩', kind: '커스터드 푸딩', price: 2500, energy: 112,
    desc: '말랑말랑 탱글한 푸딩. 카라멜 시럽으로 친구들을 돌봐줘요.',
    skill: { name: '카라멜 힐', cd: lvv(15, -0.4), heal: lvv(10, 1.5),
      text: (lv, S) => `${s1(S.cd(lv))}초마다 에너지를 ${s1(S.heal(lv))} 회복해요. 체력이 높은 편이에요.` },
  },
  {
    id: 'donut', name: '도넛', kind: '스프링클 도넛', price: 4000, energy: 100,
    desc: '운동을 좋아하는 도넛. 바퀴처럼 굴러가면 아무도 못 말려요!',
    skill: { name: '링 롤', cd: lvv(17, -0.5), dur: lvv(3.5, 0.2),
      text: (lv, S) => `${s1(S.cd(lv))}초마다 ${s1(S.dur(lv))}초 동안 굴러가며 무적 상태로 장애물을 부숴요.` },
  },
  {
    id: 'marsh', name: '마시', kind: '마시멜로', price: 5500, energy: 96,
    desc: '폭신폭신 구름 같은 마시멜로. 몸을 부풀려 하늘을 둥실 떠다녀요.',
    skill: { name: '퐁신 플로트', cd: lvv(19, -0.5), dur: lvv(4.5, 0.25),
      text: (lv, S) => `${s1(S.cd(lv))}초마다 ${s1(S.dur(lv))}초 동안 하늘 높이 떠올라 젤리 길을 날아요.` },
  },
  {
    id: 'cupcake', name: '컵케', kind: '체리 컵케이크', price: 7000, energy: 95,
    desc: '행운을 부르는 컵케이크. 스프링클이 떨어지는 곳엔 코인이 가득!',
    skill: { name: '럭키 스프링클', cd: lvv(16, -0.5), dur: lvv(4.5, 0.25),
      text: (lv, S) => `${s1(S.cd(lv))}초마다 ${s1(S.dur(lv))}초 동안 젤리가 코인으로 바뀌고 자석 효과가 생겨요.` },
  },
  {
    id: 'cotton', name: '솜이', kind: '솜사탕', price: 9000, energy: 92,
    desc: '꿈결처럼 포근한 솜사탕. 넘어진 친구를 구름으로 받아줘요.',
    skill: { name: '구름 쿠션', cd: lvv(22, -0.6), revive: lvv(0.4, 0.04),
      text: (lv, S) => `한 판에 한 번, 쓰러지면 에너지 ${Math.round(S.revive(lv) * 100)}%로 부활해요. ${s1(S.cd(lv))}초마다 버블 실드를 만들어요.` },
  },
];
const CHAR = Object.fromEntries(CHARS.map((c) => [c.id, c]));
function charLevelBonus(lv) { return 0.03 * (lv - 1); } // jelly score bonus

const PETS = [
  { id: 'twinkle', name: '반짝이', price: 600, cd: 9, desc: '작은 별 요정. 9초마다 별 젤리를 줄지어 뿌려줘요.' },
  { id: 'buzzy', name: '붕붕', price: 1500, cd: 16, desc: '꿀벌 배달부. 16초마다 우유를 배달해 줘요.' },
  { id: 'puff', name: '몽실', price: 2000, cd: 12, desc: '자석 구름. 12초마다 3초 동안 젤리를 끌어당겨요.' },
  { id: 'oink', name: '꿀꿀', price: 2500, cd: 9, desc: '날개 달린 저금통. 9초마다 금화를 떨어뜨려요.' },
  { id: 'pop', name: '팡팡', price: 3500, cd: 12, desc: '폭죽 사탕. 12초마다 앞에 있는 장애물을 펑! 터뜨려요.' },
];
const PET = Object.fromEntries(PETS.map((p) => [p.id, p]));

const LANDS = [
  { id: 'meadow', name: '슈가 메도우', bgm: 'bgm_land1', specials: [] },
  { id: 'canyon', name: '캐러멜 캐니언', bgm: 'bgm_land2', specials: [] },
  { id: 'cavern', name: '코코아 동굴', bgm: 'bgm_land3', specials: ['fall'] },
  { id: 'glacier', name: '셔벗 빙하', bgm: 'bgm_land4', specials: ['fall', 'pop'] },
  { id: 'castle', name: '별사탕 성', bgm: 'bgm_land5', specials: ['fall', 'pop'] },
];

const POWERUPS = {
  magnet: { name: '자석!', sprite: 'pw_magnet', color: '#ff5a6a', weight: 30 },
  giant: { name: '거대화!', sprite: 'pw_giant', color: '#ffa53a', weight: 18 },
  dash: { name: '로켓 대시!', sprite: 'pw_dash', color: '#4fb6ff', weight: 18 },
  coins: { name: '코인 러시!', sprite: 'pw_coins', color: '#ffd23f', weight: 14 },
  stars: { name: '별빛 변환!', sprite: 'pw_stars', color: '#a77bff', weight: 12 },
  shield: { name: '버블 실드!', sprite: 'pw_shield', color: '#4fdcb9', weight: 8 },
};

const LAB = [
  { id: 'jelly', name: '젤리 연구', icon: 'jelly', max: 10, base: 150, mul: 1.5, desc: '젤리 점수가 올라가요.', val: (lv) => `+${lv * 7}%` },
  { id: 'energy', name: '튼튼한 체력', icon: 'heart', max: 8, base: 200, mul: 1.55, desc: '최대 에너지가 늘어나요.', val: (lv) => `+${lv * 6}` },
  { id: 'milk', name: '우유 영양', icon: 'milk', max: 6, base: 180, mul: 1.6, desc: '우유를 마시면 더 많이 회복해요.', val: (lv) => `+${lv * 10}%` },
  { id: 'item', name: '아이템 지속', icon: 'clock', max: 8, base: 160, mul: 1.5, desc: '자석·거대화·대시 등이 더 오래가요.', val: (lv) => `+${lv * 8}%` },
  { id: 'rush', name: '슈가 러시 연장', icon: 'star', max: 6, base: 250, mul: 1.6, desc: '보너스 스테이지가 더 길어져요.', val: (lv) => `+${(lv * 0.8).toFixed(1)}초` },
  { id: 'coin', name: '코인 행운', icon: 'coin', max: 6, base: 220, mul: 1.6, desc: '코인을 더 많이 얻어요.', val: (lv) => `+${lv * 8}%` },
  { id: 'spurt', name: '라스트 스퍼트', icon: 'rocket', max: 5, base: 400, mul: 1.7, desc: '에너지가 바닥나도 잠깐 무적으로 질주해요.', val: (lv) => (lv ? `${(1.5 + lv * 0.5).toFixed(1)}초` : '없음') },
];
const LAB_ID = Object.fromEntries(LAB.map((u) => [u.id, u]));
function labCost(u, lv) { return Math.round((u.base * Math.pow(u.mul, lv)) / 10) * 10; }

const BOOSTS = [
  { id: 'dash', name: '스타트 대시', price: 300, icon: 'rocket', desc: '출발하자마자 5초 동안 로켓 대시!' },
  { id: 'energy', name: '에너지 +30', price: 250, icon: 'milk', desc: '최대 에너지 +30으로 출발해요.' },
  { id: 'revive', name: '부활', price: 600, icon: 'heart', desc: '쓰러져도 한 번 다시 일어나요.' },
  { id: 'letters', name: '럭키 레터', price: 200, icon: 'star', desc: 'S·U·G 글자를 모은 채로 시작해요.' },
  { id: 'magnet', name: '자석 스타트', price: 150, icon: 'items:pw_magnet', desc: '처음 12초 동안 자석 효과가 있어요.' },
];

const MISSION_TEMPLATES = [
  { id: 'jelly_run', mode: 'run', stat: 'jellies', tiers: [250, 500, 900, 1400, 2200], text: (n) => `한 판에 젤리 ${fmt(n)}개 먹기` },
  { id: 'score_run', mode: 'run', stat: 'score', tiers: [20000, 60000, 150000, 300000, 600000], text: (n) => `한 판에 ${fmt(n)}점 달성하기` },
  { id: 'coins_total', mode: 'total', stat: 'coins', tiers: [300, 800, 1600, 3000, 5000], text: (n) => `코인 ${fmt(n)}개 모으기` },
  { id: 'land_run', mode: 'run', stat: 'land', tiers: [2, 3, 4, 5, 6], text: (n) => (n <= 5 ? `${n}번째 랜드까지 달리기` : '모든 랜드 돌파하기') },
  { id: 'jumps_total', mode: 'total', stat: 'jumps', tiers: [150, 400, 900, 1600], text: (n) => `점프 ${fmt(n)}번 하기` },
  { id: 'djump_total', mode: 'total', stat: 'djumps', tiers: [40, 120, 300, 600], text: (n) => `더블 점프 ${fmt(n)}번 하기` },
  { id: 'slide_total', mode: 'total', stat: 'slideTime', tiers: [20, 60, 150, 300], text: (n) => `슬라이드로 ${n}초 미끄러지기` },
  { id: 'smash_total', mode: 'total', stat: 'smash', tiers: [10, 30, 80, 160], text: (n) => `장애물 ${n}개 부수기` },
  { id: 'rush_total', mode: 'total', stat: 'rush', tiers: [1, 3, 8, 15], text: (n) => `슈가 러시 ${n}번 발동하기` },
  { id: 'milk_run', mode: 'run', stat: 'milk', tiers: [5, 9, 15, 22], text: (n) => `한 판에 우유 ${n}개 마시기` },
  { id: 'items_run', mode: 'run', stat: 'items', tiers: [4, 8, 14, 20], text: (n) => `한 판에 아이템 ${n}개 먹기` },
  { id: 'combo_run', mode: 'run', stat: 'maxCombo', tiers: [100, 250, 500, 800, 1200], text: (n) => `한 판에 ${fmt(n)} 콤보 달성하기` },
  { id: 'dist_run', mode: 'run', stat: 'dist', tiers: [800, 2000, 4000, 7000, 10000], text: (n) => `한 판에 ${fmt(n)}m 달리기` },
  { id: 'nohit_run', mode: 'run', stat: 'cleanLand', tiers: [1, 2, 3], text: (n) => `부딪히지 않고 랜드 ${n}개 통과하기` },
  { id: 'relay_run', mode: 'run', stat: 'relay', tiers: [1], text: () => '릴레이로 이어 달리기' },
  { id: 'skill_total', mode: 'total', stat: 'skills', tiers: [10, 30, 70], text: (n) => `스킬 ${n}번 사용하기` },
];
const MISSION_REWARD = [150, 260, 420, 650, 950];

function xpNeed(level) { return 100 + 60 * (level - 1); }
function levelReward(level) { return 100 + 50 * level; }

const TIPS = [
  '화면 왼쪽을 누르면 점프, 오른쪽을 꾹 누르면 슬라이드!',
  '공중에서 한 번 더 누르면 더블 점프를 할 수 있어요.',
  '공중에서 슬라이드를 누르면 빠르게 내려와요.',
  '우유를 마시면 에너지가 회복돼요. 에너지가 0이 되면 끝!',
  'S·U·G·A·R·R·U·S·H 글자를 모두 모으면 슈가 러시 보너스!',
  '릴레이 캐릭터를 정하면 쓰러져도 친구가 이어 달려요.',
  '연구소에서 업그레이드하면 더 멀리, 더 높은 점수로!',
  '거대화나 로켓 대시 중에는 장애물을 부술 수 있어요.',
  '젤리를 끊김 없이 먹으면 콤보 보너스가 쌓여요.',
  '스프링을 밟으면 하늘 높이 튀어 올라요.',
];

});

// ---- src/game/progress.js
__def("src/game/progress.js", function (__exports, __req) {
__exp(__exports, { "Progress": () => Progress });
// =============================================================================
//  Meta progression: wallet, unlocks, levels, lab upgrades, missions, XP.
// =============================================================================
const { Save } = __req("src/engine/storage.js");
const { CFG } = __req("src/config.js");
const { CHAR, CHAR_LV_COST, MAX_CHAR_LV, LAB, LAB_ID, labCost, MISSION_TEMPLATES, MISSION_REWARD, xpNeed, levelReward, PET, charLevelBonus } = __req("src/data/content.js");
const { makeRand } = __req("src/engine/util.js");

const R = makeRand();

const Progress = {
  get d() { return Save.data; },
  commit() { Save.save(); },

  // wallet --------------------------------------------------------------------
  canAfford(n) { return this.d.coins >= n; },
  spend(n) { if (this.d.coins < n) return false; this.d.coins -= n; this.commit(); return true; },
  earn(n) { this.d.coins += Math.max(0, Math.floor(n)); this.commit(); },

  // runners --------------------------------------------------------------------
  owned(id) { return !!this.d.chars[id]; },
  charLv(id) { return this.d.chars[id] ? this.d.chars[id].lv : 0; },
  buyChar(id) {
    const c = CHAR[id];
    if (!c || this.owned(id) || !this.spend(c.price)) return false;
    this.d.chars[id] = { lv: 1 }; this.commit(); return true;
  },
  charUpCost(id) { const lv = this.charLv(id); return lv >= MAX_CHAR_LV ? null : CHAR_LV_COST[lv]; },
  levelUpChar(id) {
    const cost = this.charUpCost(id);
    if (cost == null || !this.spend(cost)) return false;
    this.d.chars[id].lv++; this.commit(); return true;
  },
  select(id) { if (!this.owned(id)) return false; if (this.d.relay === id) this.d.relay = this.d.sel !== id ? this.d.sel : null; this.d.sel = id; this.commit(); return true; },
  setRelay(id) { if (id && (!this.owned(id) || id === this.d.sel)) return false; this.d.relay = id; this.commit(); return true; },

  // pets -----------------------------------------------------------------------
  ownsPet(id) { return !!this.d.pets[id]; },
  buyPet(id) { const p = PET[id]; if (!p || this.ownsPet(id) || !this.spend(p.price)) return false; this.d.pets[id] = { got: Date.now() }; this.commit(); return true; },
  selectPet(id) { if (id && !this.ownsPet(id)) return false; this.d.pet = id; this.commit(); return true; },

  // lab ------------------------------------------------------------------------
  lab(id) { return this.d.lab[id] || 0; },
  labNext(id) { const u = LAB_ID[id]; const lv = this.lab(id); return lv >= u.max ? null : labCost(u, lv); },
  buyLab(id) { const c = this.labNext(id); if (c == null || !this.spend(c)) return false; this.d.lab[id] = this.lab(id) + 1; this.commit(); return true; },
  anyLabAffordable() { return LAB.some((u) => { const c = this.labNext(u.id); return c != null && c <= this.d.coins; }); },

  /** Aggregated modifiers for a run with runner `id`. */
  mods(id) {
    const L = (k) => this.lab(k);
    const lv = Math.max(1, this.charLv(id));
    return {
      lv,
      jellyMult: 1 + L('jelly') * 0.07 + charLevelBonus(lv),
      maxEnergy: CHAR[id].energy + L('energy') * 6,
      milkMult: 1 + L('milk') * 0.1,
      itemMult: 1 + L('item') * 0.08,
      rushTime: CFG.RUSH_TIME + L('rush') * 0.8,
      coinMult: 1 + L('coin') * 0.08,
      spurt: L('spurt') ? 1.5 + L('spurt') * 0.5 : 0,
    };
  },

  // XP ------------------------------------------------------------------------
  addXP(n) {
    const ups = [];
    this.d.xp += Math.floor(n);
    while (this.d.xp >= xpNeed(this.d.level)) {
      this.d.xp -= xpNeed(this.d.level);
      this.d.level++;
      const reward = levelReward(this.d.level);
      this.d.coins += reward;
      ups.push({ level: this.d.level, reward });
    }
    this.commit();
    return ups;
  },

  // missions ------------------------------------------------------------------
  ensureMissions() {
    const ms = this.d.missions;
    while (ms.length < 3) ms.push(this.newMission(ms.map((m) => m.tid)));
    this.commit();
  },
  newMission(exclude = []) {
    const hist = this.d.missionHist;
    let pool = MISSION_TEMPLATES.filter((t) => !exclude.includes(t.id) && (hist[t.id] || 0) < t.tiers.length);
    if (!pool.length) pool = MISSION_TEMPLATES.filter((t) => !exclude.includes(t.id));
    const t = R.pick(pool);
    const done = hist[t.id] || 0;
    const tier = Math.min(done, t.tiers.length - 1);
    let target = t.tiers[tier];
    if (done >= t.tiers.length) target = Math.round(target * Math.pow(1.5, done - t.tiers.length + 1));
    return { tid: t.id, tier, target, progress: 0, done: false };
  },
  template(m) { return MISSION_TEMPLATES.find((t) => t.id === m.tid); },
  missionText(m) { return this.template(m).text(m.target); },
  missionReward(m) { return MISSION_REWARD[Math.min(m.tier, MISSION_REWARD.length - 1)] + (m.target > (this.template(m).tiers.at(-1)) ? 200 : 0); },
  claimable() { return this.d.missions.filter((m) => m.done).length; },

  /** Apply a finished run. run = { score, jellies, coins, land, milk, items, maxCombo, dist, cleanLand, relay, jumps, djumps, slideTime, smash, rush, skills } */
  applyRun(run) {
    const newly = [];
    for (const m of this.d.missions) {
      if (m.done) continue;
      const t = this.template(m);
      if (!t) continue;
      const v = run[t.stat] || 0;
      if (t.mode === 'run') m.progress = Math.max(m.progress, v);
      else m.progress += v;
      if (m.progress >= m.target) { m.progress = m.target; m.done = true; newly.push(m); }
    }
    const st = this.d.stats;
    st.runs++;
    st.jumps += run.jumps; st.djumps += run.djumps; st.slideTime += run.slideTime; st.smash += run.smash;
    st.rush += run.rush; st.coinsTotal += run.coins; st.jellyTotal += run.jellies;
    st.plays[run.char] = (st.plays[run.char] || 0) + 1;
    if (run.score > this.d.best) this.d.best = run.score;
    if (run.dist > this.d.bestDist) this.d.bestDist = run.dist;
    if (run.land > this.d.bestLand) this.d.bestLand = run.land;
    this.commit();
    return newly;
  },
  claim(i) {
    const m = this.d.missions[i];
    if (!m || !m.done) return null;
    const reward = this.missionReward(m);
    this.d.coins += reward;
    this.d.missionHist[m.tid] = (this.d.missionHist[m.tid] || 0) + 1;
    const xp = 25 * (m.tier + 1);
    this.d.missions.splice(i, 1, this.newMission(this.d.missions.map((x) => x.tid)));
    const ups = this.addXP(xp);
    this.commit();
    return { reward, xp, ups };
  },
};

});

// ---- src/scenes/loading.js
__def("src/scenes/loading.js", function (__exports, __req) {
__exp(__exports, { "LoadingScene": () => LoadingScene });
// =============================================================================
//  Loading screen (fonts -> images -> audio) then the title.
// =============================================================================
const { Scene } = __req("src/engine/scene.js");
const { text, bar, COL } = __req("src/engine/ui.js");
const { TAU } = __req("src/engine/util.js");
const { TIPS } = __req("src/data/content.js");

class LoadingScene extends Scene {
  enter() {
    this.p = { fonts: 0, images: 0, audio: 0 };
    this.done = false;
    this.tip = TIPS[Math.floor(Math.random() * TIPS.length)];
    this.error = null;
  }
  get progress() { return this.p.fonts * 0.1 + this.p.images * 0.45 + this.p.audio * 0.45; }
  update(dt) {
    super.update(dt);
    if (this.done && this.t > 0.6 && !this.left) { this.left = true; this.game.goTitle(); }
  }
  render(ctx) {
    const W = this.W, H = this.H;
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#ffcfe0'); g.addColorStop(1, '#ffe9c4');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    // spinning candy wheel
    const cx = W / 2, cy = H / 2 - 60;
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(this.t * 2.2);
    const cols = ['#ff6fa3', '#ffd23f', '#5ccf4f', '#4fb6ff', '#a77bff', '#ffa53a'];
    for (let i = 0; i < 12; i++) {
      ctx.fillStyle = cols[i % cols.length];
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, 58, (i / 12) * TAU, ((i + 1) / 12) * TAU); ctx.closePath(); ctx.fill();
    }
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(0, 0, 20, 0, TAU); ctx.fill();
    ctx.restore();
    ctx.strokeStyle = COL.ink; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(cx, cy, 58, 0, TAU); ctx.stroke();
    text(ctx, 'DESSERT DASH', W / 2, H / 2 + 50, { size: 50, font: 'num', color: '#fff', stroke: COL.ink, sw: 9 });
    const bw = Math.min(560, W - 200);
    bar(ctx, W / 2 - bw / 2, H / 2 + 100, bw, 28, this.progress, { colors: ['#ffb3d1', '#ff6fa3'] });
    text(ctx, this.error ? this.error : `${Math.round(this.progress * 100)}%  달콤한 재료를 굽는 중...`, W / 2, H / 2 + 154, { size: 22, font: 'bold', color: COL.ink });
    text(ctx, 'TIP  ' + this.tip, W / 2, H - 50, { size: 19, font: 'bold', color: COL.ink2, maxW: W - 80 });
  }
}

});

// ---- src/game/background.js
__def("src/game/background.js", function (__exports, __req) {
__exp(__exports, { "Background": () => Background });
// =============================================================================
//  Parallax background per land: sky gradient, sun/moon, drifting clouds,
//  far/mid/near layers, ambient particles; cross-fades between lands.
// =============================================================================
const { Assets } = __req("src/engine/assets.js");
const { rand, TAU, rgba } = __req("src/engine/util.js");

const VW = 2800; // virtual wrap width for clouds

function buildLand(id) {
  const far = Assets.meta(`bg_${id}_far`) || {};
  const cl = Assets.meta(`clouds_${id}`);
  const st = {
    id, sky: far.sky || ['#6cc3f2', '#a8dcf7', '#d8f3ff'], fog: far.fog || '#ffffff', ambient: far.ambient || null,
    clouds: [], ceil: [], fixed: [],
  };
  if (cl) {
    const names = Object.keys(cl.frames);
    for (const n of names) {
      const info = (cl.info && cl.info[n]) || {};
      if (info.fixed) st.fixed.push({ f: n, y: info.y ?? 200 });
    }
    const top = names.filter((n) => cl.info?.[n]?.anchor === 'top');
    const free = names.filter((n) => !cl.info?.[n]?.fixed && cl.info?.[n]?.anchor !== 'top');
    let x = 0;
    while (top.length && x < VW) { const f = rand.pick(top); st.ceil.push({ f, x }); x += Assets.size(`clouds_${id}`, f).w * rand.range(0.55, 0.85); }
    const n = id === 'cavern' ? 7 : 9;
    for (let i = 0; i < n && free.length; i++) {
      const f = free[i % free.length];
      const info = cl.info?.[f] || {};
      const yr = Array.isArray(info.y) ? info.y : [40, 250];
      st.clouds.push({ f, x: (i / n) * VW + rand.range(-120, 120), y: rand.range(yr[0], yr[1]), p: info.speed ?? 0.05, drift: info.glow ? 0 : rand.range(4, 10), glow: !!info.glow, ph: rand() * TAU });
    }
    st.clouds.sort((a, b) => a.p - b.p);
  }
  return st;
}

class Background {
  constructor() {
    this.cache = {};
    this.cur = null; this.prev = null; this.blend = 1;
    this.t = 0;
    this.amb = [];
    this.ambType = null;
    this.speed = 0;
  }
  land(id) { return this.cache[id] || (this.cache[id] = buildLand(id)); }
  set(id, instant = false) {
    const st = this.land(id);
    if (this.cur && this.cur.id === id) return;
    this.prev = instant ? null : this.cur;
    this.cur = st;
    this.blend = instant || !this.prev ? 1 : 0;
    this.setAmbient(st.ambient);
  }
  setAmbient(type) {
    if (type === this.ambType) return;
    this.ambType = type;
    this.amb.length = 0;
    const n = { petals: 22, dust: 26, spores: 26, snow: 60, stars: 46, sparkles: 34 }[type] || 0;
    for (let i = 0; i < n; i++) this.amb.push(this.newAmb(type, true));
  }
  newAmb(type, init) {
    const W = 1600;
    const a = { x: rand.range(0, W + 200), y: rand.range(-20, 640), vx: 0, vy: 0, s: rand.range(0.6, 1.2), r: rand() * TAU, vr: rand.range(-2, 2), ph: rand() * TAU, a: 1 };
    if (!init) { a.x = W + rand.range(0, 200); }
    switch (type) {
      case 'petals': a.vx = rand.range(-50, -25); a.vy = rand.range(18, 40); a.c = rand.pick(['#ffb3cf', '#ffe1ec', '#ffffff', '#ffd27a']); if (!init) a.y = rand.range(-40, 300); break;
      case 'dust': a.vx = rand.range(-90, -40); a.vy = rand.range(-6, 6); a.c = rand.pick(['#fff1c9', '#ffd9a0', '#f6c58a']); a.s = rand.range(0.4, 1); break;
      case 'spores': a.vx = rand.range(-12, 6); a.vy = rand.range(-22, -8); a.c = rand.pick(['#c08bff', '#7ff0ff', '#ffb0f0']); if (!init) { a.x = rand.range(0, W); a.y = 660; } break;
      case 'snow': a.vx = rand.range(-40, -15); a.vy = rand.range(40, 90); a.s = rand.range(0.5, 1.4); if (!init) { a.x = rand.range(0, W + 300); a.y = -10; } break;
      case 'stars': a.y = rand.range(0, 330); a.x = rand.range(0, W); a.vx = 0; a.s = rand.range(0.5, 1.3); break;
      case 'sparkles': a.vx = rand.range(-60, -20); a.vy = rand.range(-10, 10); a.c = rand.pick(['#ffffff', '#fff3a0', '#ffc0ea', '#c8f0ff']); break;
    }
    return a;
  }

  update(dt, scrollSpeed = 0) {
    this.t += dt;
    this.speed = scrollSpeed;
    if (this.blend < 1) { this.blend = Math.min(1, this.blend + dt / 1.6); if (this.blend >= 1) this.prev = null; }
    const type = this.ambType;
    for (let i = 0; i < this.amb.length; i++) {
      const a = this.amb[i];
      if (type === 'stars') continue;
      a.x += (a.vx - scrollSpeed * 0.22) * dt;
      a.y += a.vy * dt;
      a.r += a.vr * dt;
      if (type === 'snow' || type === 'petals') a.x += Math.sin(this.t * 1.5 + a.ph) * 14 * dt;
      if (a.x < -40 || a.y > 680 || a.y < -60) this.amb[i] = this.newAmb(type, false);
    }
  }

  renderLand(ctx, st, W, H, camX, alpha) {
    if (alpha <= 0) return;
    ctx.save();
    if (alpha < 1) ctx.globalAlpha = alpha;
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, st.sky[0]); g.addColorStop(0.5, st.sky[1]); g.addColorStop(1, st.sky[2]);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    const cid = `clouds_${st.id}`;
    if (this.ambType === 'stars' && st.id === this.cur.id) this.renderStars(ctx, W);
    for (const f of st.fixed) Assets.draw(ctx, cid, f.f, W * 0.7 - (camX * 0.004) % 40, f.y);
    for (const c of st.clouds) {
      if (c.glow) continue;
      const x = ((((c.x - camX * c.p - this.t * c.drift) % VW) + VW) % VW) - 360;
      if (x > W + 360) continue;
      Assets.draw(ctx, cid, c.f, x, c.y);
    }
    const far = `bg_${st.id}_far`, mid = `bg_${st.id}_mid`, near = `bg_${st.id}_near`;
    const m = (id) => Assets.meta(id) || {};
    if (Assets.has(far)) Assets.tileX(ctx, far, camX * (m(far).parallax ?? 0.12), m(far).y ?? 180, 0, W);
    for (const c of st.ceil) {
      const x = ((((c.x - camX * 0.2) % VW) + VW) % VW) - 300;
      if (x < W + 300) Assets.draw(ctx, cid, c.f, x, 0);
    }
    if (Assets.has(mid)) Assets.tileX(ctx, mid, camX * (m(mid).parallax ?? 0.32), m(mid).y ?? 230, 0, W);
    for (const c of st.clouds) {
      if (!c.glow) continue;
      const x = ((((c.x - camX * 0.4) % VW) + VW) % VW) - 300;
      if (x > W + 300) continue;
      const pulse = 0.7 + 0.3 * Math.sin(this.t * 2 + c.ph);
      Assets.draw(ctx, cid, c.f, x, c.y + Math.sin(this.t * 0.8 + c.ph) * 10, { alpha: pulse, add: true });
    }
    if (Assets.has(near)) Assets.tileX(ctx, near, camX * (m(near).parallax ?? 0.62), m(near).y ?? 372, 0, W);
    ctx.restore();
  }

  renderStars(ctx, W) {
    ctx.save();
    for (const a of this.amb) {
      const tw = 0.45 + 0.55 * Math.abs(Math.sin(this.t * 1.7 + a.ph));
      ctx.globalAlpha = tw;
      ctx.fillStyle = '#fff8d8';
      const s = 1.6 * a.s;
      ctx.fillRect(a.x % W, a.y, s, s);
      if (a.s > 1.15) { ctx.globalAlpha = tw * 0.5; ctx.fillRect((a.x % W) - s * 1.5, a.y + s * 0.3, s * 4, s * 0.4); ctx.fillRect((a.x % W) + s * 0.3, a.y - s * 1.5, s * 0.4, s * 4); }
    }
    ctx.restore();
  }

  renderAmbient(ctx, W) {
    const type = this.ambType;
    if (!type || type === 'stars') return;
    ctx.save();
    for (const a of this.amb) {
      switch (type) {
        case 'petals':
          ctx.save(); ctx.translate(a.x, a.y); ctx.rotate(a.r); ctx.fillStyle = a.c; ctx.globalAlpha = 0.85;
          ctx.beginPath(); ctx.ellipse(0, 0, 6 * a.s, 3.2 * a.s, 0, 0, TAU); ctx.fill(); ctx.restore();
          break;
        case 'dust':
          ctx.globalAlpha = 0.45; ctx.fillStyle = a.c; ctx.beginPath(); ctx.arc(a.x, a.y, 2.4 * a.s, 0, TAU); ctx.fill();
          break;
        case 'spores': {
          const p = 0.55 + 0.45 * Math.sin(this.t * 3 + a.ph);
          ctx.globalCompositeOperation = 'lighter';
          ctx.globalAlpha = 0.35 * p; ctx.fillStyle = a.c; ctx.beginPath(); ctx.arc(a.x, a.y, 7 * a.s, 0, TAU); ctx.fill();
          ctx.globalAlpha = 0.9 * p; ctx.beginPath(); ctx.arc(a.x, a.y, 2.2 * a.s, 0, TAU); ctx.fill();
          ctx.globalCompositeOperation = 'source-over';
          break;
        }
        case 'snow':
          ctx.globalAlpha = 0.9; ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(a.x, a.y, 2.6 * a.s, 0, TAU); ctx.fill();
          break;
        case 'sparkles': {
          const p = Math.abs(Math.sin(this.t * 2.4 + a.ph));
          Assets.draw(ctx, 'fx', 'star_small', a.x, a.y, { scale: 0.5 + p * 0.5 * a.s, alpha: p, rot: a.r, add: true });
          break;
        }
      }
    }
    ctx.restore();
  }

  render(ctx, W, H, camX) {
    if (!this.cur) return;
    if (this.prev && this.blend < 1) this.renderLand(ctx, this.prev, W, H, camX, 1);
    this.renderLand(ctx, this.cur, W, H, camX, this.prev ? this.blend : 1);
    this.renderAmbient(ctx, W);
  }

  /** Fog tint overlay for depth near the horizon (optional). */
  haze(ctx, W, alpha = 0.12) {
    if (!this.cur) return;
    ctx.save(); ctx.globalAlpha = alpha; ctx.fillStyle = rgba(this.cur.fog, 1); ctx.fillRect(0, 0, W, 720); ctx.restore();
  }
}

});

// ---- src/scenes/common.js
__def("src/scenes/common.js", function (__exports, __req) {
__exp(__exports, { "drawLobbyBg": () => drawLobbyBg, "drawChar": () => drawChar, "drawPet": () => drawPet, "stars": () => stars, "pill": () => pill, "fsButton": () => fsButton, "fullscreenAction": () => fullscreenAction, "showHomeScreenHelp": () => showHomeScreenHelp, "showExternalHelp": () => showExternalHelp, "installApp": () => installApp, "MenuScene": () => MenuScene });
// =============================================================================
//  Shared helpers for menu scenes
// =============================================================================
const { Assets } = __req("src/engine/assets.js");
const { Scene, Modal } = __req("src/engine/scene.js");
const { Display } = __req("src/engine/display.js");
const { Button, text, ribbon, counter, COL, rrPath, icon } = __req("src/engine/ui.js");
const { fmt, TAU } = __req("src/engine/util.js");
const { Save } = __req("src/engine/storage.js");

function drawLobbyBg(ctx, W, H, t, dim = 0) {
  const m = Assets.meta('bg_lobby');
  if (m) {
    const ox = (W - m.w) / 2;
    Assets.draw(ctx, 'bg_lobby', 0, ox, 0);
  } else { ctx.fillStyle = '#ffd9a8'; ctx.fillRect(0, 0, W, H); }
  if (dim > 0) {
    ctx.save();
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, `rgba(255,244,228,${dim})`); g.addColorStop(1, `rgba(255,224,200,${dim})`);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    // soft sprinkles
    ctx.globalAlpha = 0.18 * dim;
    const cols = ['#ff8fb8', '#ffd23f', '#7fd8c4', '#a77bff', '#ffa53a'];
    for (let i = 0; i < 46; i++) {
      const x = (i * 211 + t * 10) % (W + 40) - 20, y = (i * 97) % H;
      ctx.save(); ctx.translate(x, y); ctx.rotate(i * 1.3);
      ctx.fillStyle = cols[i % cols.length]; rrPath(ctx, -9, -3.5, 18, 7, 3.5); ctx.fill(); ctx.restore();
    }
    ctx.restore();
  }
}

function drawChar(ctx, id, anim, t, x, y, scale = 1, o = {}) {
  const sheet = 'char_' + id;
  const A = Assets.meta(sheet)?.anims;
  if (!A) return;
  const a = A[anim] || A.idle;
  const fr = a.frames;
  const i = Math.floor(t * (a.fps || 8));
  const f = fr.length === 1 ? fr[0] : a.loop === false ? fr[Math.min(fr.length - 1, i)] : fr[i % fr.length];
  if (o.shadow !== false) {
    ctx.save(); ctx.globalAlpha = 0.25 * (o.alpha ?? 1); ctx.fillStyle = '#3a1a10';
    ctx.beginPath(); ctx.ellipse(x, y + 2, 50 * scale, 11 * scale, 0, 0, TAU); ctx.fill(); ctx.restore();
  }
  Assets.draw(ctx, sheet, f, x, y, { scale, alpha: o.alpha ?? 1, tint: o.tint });
}
function drawPet(ctx, id, t, x, y, scale = 1, o = {}) {
  const sheet = 'pet_' + id;
  const A = Assets.meta(sheet)?.anims;
  if (!A) return;
  const a = o.act ? A.act : A.fly;
  const f = a.frames[Math.floor(t * (a.fps || 8)) % a.frames.length];
  Assets.draw(ctx, sheet, f, x, y + Math.sin(t * 2.4) * 6, { scale, alpha: o.alpha ?? 1, tint: o.tint });
}

/** Base for menu screens: background, title ribbon, back button, coin pill. */
class MenuScene extends Scene {
  constructor(game, title, color = 'pink') { super(game); this.title = title; this.color = color; this.coinShown = Save.data.coins; }
  chrome(onBack) {
    this.ui.add(new Button({ x: 52, y: 50, w: 62, round: true, icon: 'arrow_l', iconSize: 40, color: 'cream', sound: 'ui_back', key: ['back'], onClick: onBack || (() => this.game.goLobby()) }));
  }
  update(dt) {
    super.update(dt);
    const c = Save.data.coins;
    this.coinShown += (c - this.coinShown) * Math.min(1, dt * 10);
    if (Math.abs(c - this.coinShown) < 1) this.coinShown = c;
  }
  drawBg(ctx) { drawLobbyBg(ctx, this.W, this.H, this.t, 0.82); }
  drawChrome(ctx) {
    ribbon(ctx, this.W / 2, 50, Math.min(420, this.W * 0.3), this.title, this.color, 32);
    counter(ctx, this.W - 210, 50, 'coin', fmt(this.coinShown), { w: 180, h: 46 });
  }
}

function stars(ctx, x, y, n, max, size = 22, gap = 24) {
  for (let i = 0; i < max; i++) icon(ctx, 'star', x + i * gap, y, size, i < n ? 1 : 0.25);
}
function pill(ctx, x, y, label, color = COL.pink, size = 16) {
  ctx.save();
  ctx.font = `900 ${size}px "DDDisplay", sans-serif`;
  const w = ctx.measureText(label).width + 22;
  rrPath(ctx, x - w / 2, y - size * 0.8, w, size * 1.6, size * 0.8);
  ctx.fillStyle = color; ctx.fill(); ctx.strokeStyle = COL.ink; ctx.lineWidth = 3; ctx.stroke();
  ctx.restore();
  text(ctx, label, x, y + 1, { size, color: '#fff', stroke: COL.ink, sw: 4 });
}

// ---------------------------------------------------------------------------
// Fullscreen / home-screen helpers (shared by title, lobby, settings, pause)
// ---------------------------------------------------------------------------
/** Round fullscreen button suited to this browser, or null when it can't help here. */
function fsButton(game, x, y, o = {}) {
  if (!Display.mode) return null;
  const on = Display.isFullscreen;
  return new Button({ x, y, w: o.w ?? 58, round: true, icon: on ? 'exitfs' : 'fullscreen', iconSize: o.iconSize ?? 36, color: o.color ?? 'cream', sound: 'ui_click',
    onClick: () => fullscreenAction(game) });
}

function fullscreenAction(game) {
  const mode = Display.mode;
  if (mode === 'toggle') {
    if (Display.isFullscreen) Display.exit();
    else Display.enterSoon((ok) => {
      if (ok) return;
      if (Display.kakao) showExternalHelp(game);
      else game.toast('이 브라우저에서는 전체 화면을 쓸 수 없어요', { icon: 'info' });
    });
  } else if (mode === 'help') showHomeScreenHelp(game);
  else if (mode === 'external') showExternalHelp(game);
}

function stepBadge(ctx, x, y, n) {
  ctx.save(); ctx.beginPath(); ctx.arc(x, y, 17, 0, TAU);
  ctx.fillStyle = COL.pink; ctx.fill(); ctx.strokeStyle = COL.ink; ctx.lineWidth = 3.5; ctx.stroke(); ctx.restore();
  text(ctx, String(n), x, y + 1, { size: 20, font: 'num', color: '#fff', stroke: COL.ink, sw: 4 });
}
function glyphDisc(ctx, x, y, name, color = COL.blue) {
  ctx.save(); ctx.beginPath(); ctx.arc(x, y, 30, 0, TAU);
  ctx.fillStyle = color; ctx.fill(); ctx.strokeStyle = COL.ink; ctx.lineWidth = 4; ctx.stroke(); ctx.restore();
  icon(ctx, name, x, y, 40);
}

/** iPhone / iPad Safari: fullscreen means "Add to Home Screen" and launching from the icon. */
function showHomeScreenHelp(game) {
  game.scenes.modal(new Modal(game, {
    title: '전체 화면으로 하기', color: 'blue', width: 720, height: 480,
    buttons: [{ label: '알겠어요', color: 'green', key: ['confirm', 'back', 'Space'] }],
    draw: (ctx, b) => {
      text(ctx, '홈 화면에 추가한 뒤 아이콘으로 실행하면 전체 화면이 돼요', b.x + b.w / 2, b.y + 76, { size: 20, font: 'bold', color: COL.ink2, maxW: b.w - 60 });
      const steps = [
        ['share', 'Safari의 공유 버튼을 눌러요'],
        ['addhome', "'홈 화면에 추가'를 골라요"],
        [null, "홈 화면의 '디저트 대시'로 실행!"],
      ];
      steps.forEach(([ic, label], i) => {
        const y = b.y + 142 + i * 78;
        stepBadge(ctx, b.x + 64, y, i + 1);
        if (ic) glyphDisc(ctx, b.x + 128, y, ic);
        else Assets.draw(ctx, 'portrait_chip', 0, b.x + 128, y, { scale: 0.62 });
        text(ctx, label, b.x + 176, y + 1, { size: 25, align: 'left', color: COL.ink, maxW: b.w - 210 });
      });
      text(ctx, '휴대폰은 가로로 돌려서 플레이하세요', b.x + b.w / 2, b.y + b.h - 128, { size: 17, font: 'bold', color: COL.ink2 });
    },
  }));
}

/** KakaoTalk's in-app browser can't go fullscreen: offer to reopen in the real browser. */
function showExternalHelp(game) {
  game.scenes.modal(new Modal(game, {
    title: '전체 화면으로 하기', color: 'yellow', width: 680, height: 360,
    message: '카카오톡 안에서는 전체 화면을 쓸 수 없어요.\n브라우저로 열면 전체 화면으로 즐길 수 있어요!',
    buttons: [{ label: '닫기', color: 'grey', key: ['back'] }, { label: '브라우저로 열기', color: 'green', key: ['confirm'], onClick: () => Display.openExternal() }],
  }));
}

/** Chrome / Edge / Samsung Internet: the browser's own "install app" dialog. */
function installApp(game) {
  Display.install().then((ok) => { if (ok) game.toast('홈 화면에 설치했어요! 아이콘으로 실행해 보세요', { icon: 'check', dur: 3 }); });
}

});

// ---- src/scenes/title.js
__def("src/scenes/title.js", function (__exports, __req) {
__exp(__exports, { "TitleScene": () => TitleScene });
// =============================================================================
//  Title screen: parade of runners across Sugar Meadow, logo, tap to start.
// =============================================================================
const { Scene } = __req("src/engine/scene.js");
const { Assets } = __req("src/engine/assets.js");
const { Background } = __req("src/game/background.js");
const { text, COL } = __req("src/engine/ui.js");
const { CHARS, PETS } = __req("src/data/content.js");
const { CFG } = __req("src/config.js");
const { drawChar, drawPet, fsButton } = __req("src/scenes/common.js");
const { Ease } = __req("src/engine/util.js");

class TitleScene extends Scene {
  enter() {
    this.bg = new Background();
    this.bg.set('meadow', true);
    this.cam = 0;
    this.parade = CHARS.map((c, i) => ({ id: c.id, off: i * 210, jump: 0, vy: 0, y: 0 }));
    this.leaving = false;
    this.game.audio.playMusic('bgm_lobby', { fade: 0.8 });
    this.build();
  }
  layout() { this.build(); }
  build() {
    this.ui.clear();
    const b = fsButton(this.game, this.W - 50, 50);
    if (b) this.ui.add(b);
  }
  update(dt) {
    super.update(dt);
    this.cam += dt * 330;
    this.bg.update(dt, 330);
    for (const p of this.parade) {
      if (p.y === 0 && Math.random() < dt * 0.5) p.vy = -900;
      if (p.vy !== 0 || p.y < 0) { p.vy += 2600 * dt; p.y += p.vy * dt; if (p.y >= 0) { p.y = 0; p.vy = 0; } }
    }
  }
  start() {
    if (this.leaving) return;
    this.leaving = true;
    this.game.audio.unlock();
    this.game.audio.play('ui_select');
    this.game.goLobby();
  }
  pointer(type, p) {
    if (this.ui.pointer(type, p)) return true;
    if (type === 'down') this.start();
    return true;
  }
  key(code, acts) { if (acts.includes('confirm') || acts.includes('jump')) this.start(); }
  render(ctx) {
    const W = this.W, H = this.H;
    this.bg.render(ctx, W, H, this.cam);
    // ground strip
    const fr = Assets.frame('ground_meadow', 0);
    if (fr) { const tw = fr.sw / fr.s; for (let x = -((this.cam % tw) + tw) % tw; x < W; x += tw) ctx.drawImage(fr.img, fr.sx, fr.sy, fr.sw, fr.sh, x, CFG.GROUND_Y - 18, tw + 0.5, fr.sh / fr.s); }
    // parade (runs right, wraps)
    const span = W + 600;
    this.parade.forEach((p, i) => {
      const x = ((this.t * 120 + p.off) % span) - 200;
      const anim = p.y < 0 ? (p.vy < 0 ? 'jump' : 'fall') : 'run';
      drawChar(ctx, p.id, anim, this.t + i * 0.37, x, CFG.GROUND_Y + p.y, 0.92);
      if (i === 0) drawPet(ctx, PETS[(Math.floor(this.t / 6)) % PETS.length].id, this.t, x - 90, CFG.GROUND_Y - 150, 0.8);
    });
    // logo
    const k = Ease.outBack(Math.min(1, this.t / 0.8));
    const bob = Math.sin(this.t * 1.8) * 6;
    const ls = Math.min(0.9, (W - 120) / 800) * k;
    Assets.draw(ctx, 'logo', 0, W / 2, 210 + bob, { scale: ls });
    if (this.t > 0.6) {
      const a = 0.55 + 0.45 * Math.sin(this.t * 4);
      text(ctx, '화면을 눌러 시작하세요', W / 2, H - 44, { size: 30, color: '#fff', stroke: COL.ink, sw: 7, alpha: a });
    }
    text(ctx, `v${CFG.VERSION}`, W - 16, H - 16, { size: 14, font: 'num', align: 'right', color: '#fff', stroke: COL.ink, sw: 3, alpha: 0.8 });
    this.ui.draw(ctx);
  }
}

});

// ---- src/scenes/lobby.js
__def("src/scenes/lobby.js", function (__exports, __req) {
__exp(__exports, { "LobbyScene": () => LobbyScene });
// =============================================================================
//  Lobby: selected runner on stage, relay + pet, menus, play.
// =============================================================================
const { Scene, Modal } = __req("src/engine/scene.js");
const { Assets } = __req("src/engine/assets.js");
const { Button, text, counter, bar, COL, panel, rrPath, icon } = __req("src/engine/ui.js");
const { fmt, TAU, Ease } = __req("src/engine/util.js");
const { Save } = __req("src/engine/storage.js");
const { Progress } = __req("src/game/progress.js");
const { CHAR, CHARS, PET, PETS, TIPS, xpNeed } = __req("src/data/content.js");
const { drawLobbyBg, drawChar, drawPet, pill, fsButton } = __req("src/scenes/common.js");

class LobbyScene extends Scene {
  enter() {
    Progress.ensureMissions();
    this.cheer = 0; this.hop = 0; this.hopV = 0;
    this.tipI = Math.floor(Math.random() * TIPS.length); this.tipT = 0;
    this.game.audio.playMusic('bgm_lobby', { fade: 0.8 });
    this.coinShown = Save.data.coins;
    this.build();
  }
  layout() { if (this.ui) this.build(); }
  get stageX() { const m = Assets.meta('bg_lobby'); return (m ? m.stage.x : 600) + (this.W - (m ? m.w : 1600)) / 2; }
  build() {
    const W = this.W, H = this.H, d = Save.data;
    this.ui.clear();
    const colX = W - 410;
    const bw = 182, bh = 92, gap = 16;
    const charBadge = CHARS.some((c) => !Progress.owned(c.id) && c.price <= d.coins) || CHARS.some((c) => Progress.owned(c.id) && Progress.charUpCost(c.id) != null && Progress.charUpCost(c.id) <= d.coins);
    const petBadge = PETS.some((p) => !Progress.ownsPet(p.id) && p.price <= d.coins);
    const items = [
      { label: '캐릭터', icon: 'char', color: 'orange', go: () => this.game.goScene('characters'), badge: charBadge },
      { label: '펫', icon: 'pet', color: 'blue', go: () => this.game.goScene('pets'), badge: petBadge },
      { label: '연구소', icon: 'lab', color: 'purple', go: () => this.game.goScene('lab'), badge: Progress.anyLabAffordable() },
      { label: '미션', icon: 'mission', color: 'mint', go: () => this.game.goScene('missions'), badge: Progress.claimable() || null },
    ];
    items.forEach((it, i) => {
      this.ui.add(new Button({ x: colX + (i % 2) * (bw + gap), y: 210 + Math.floor(i / 2) * (bh + gap), w: bw, h: bh, label: it.label, icon: it.icon, iconSize: 54, color: it.color, size: 28, badge: it.badge || null, onClick: it.go }));
    });
    this.playBtn = this.ui.add(new Button({ x: colX, y: 440, w: bw * 2 + gap, h: 128, label: '달리기!', icon: 'play', iconSize: 76, color: 'green', size: 48, key: ['confirm', 'Space'], sound: 'ui_select', onClick: () => this.game.goScene('prerun') }));
    this.ui.add(new Button({ x: W - 50, y: 50, w: 58, round: true, icon: 'gear', iconSize: 40, color: 'cream', onClick: () => this.game.goScene('settings') }));
    this.fsBtn = fsButton(this.game, W - 120, 50);
    if (this.fsBtn) this.ui.add(this.fsBtn);
  }
  update(dt) {
    super.update(dt);
    if (this.cheer > 0) this.cheer -= dt;
    if (this.hop < 0 || this.hopV !== 0) { this.hopV += 2600 * dt; this.hop += this.hopV * dt; if (this.hop >= 0) { this.hop = 0; this.hopV = 0; } }
    this.tipT += dt; if (this.tipT > 6) { this.tipT = 0; this.tipI = (this.tipI + 1) % TIPS.length; }
    const c = Save.data.coins; this.coinShown += (c - this.coinShown) * Math.min(1, dt * 10); if (Math.abs(c - this.coinShown) < 1) this.coinShown = c;
  }
  pointer(type, p) {
    if (this.ui.pointer(type, p)) return true;
    if (type === 'down') {
      const sx = this.stageX;
      if (Math.abs(p.x - sx) < 110 && p.y > 330 && p.y < 620) { this.cheer = 1.4; this.hopV = -800; this.hop = -1; this.game.audio.play('ui_select'); }
      else if (p.x >= 22 && p.x <= 322 && p.y >= 96 && p.y <= 142) { this.game.audio.play('ui_click'); this.showRecords(); }
    }
    return false;
  }
  showRecords() {
    const recs = Save.data.records || [];
    this.game.scenes.modal(new Modal(this.game, {
      title: '내 기록 TOP 5', color: 'yellow', width: 640, height: 470,
      buttons: [{ label: '닫기', color: 'pink', key: ['confirm', 'back', 'Space'] }],
      draw: (ctx, b) => {
        if (!recs.length) { text(ctx, '아직 기록이 없어요. 달려볼까요?', b.x + b.w / 2, b.y + 180, { size: 24, font: 'bold', color: COL.ink }); return; }
        recs.forEach((r, i) => {
          const y = b.y + 92 + i * 56;
          text(ctx, `${i + 1}`, b.x + 60, y, { size: 30, font: 'num', color: i === 0 ? COL.orangeD : COL.ink2 });
          Assets.draw(ctx, 'portrait_' + r.char, 0, b.x + 118, y, { scale: 0.42 });
          text(ctx, fmt(r.score), b.x + 160, y + 1, { size: 26, font: 'num', align: 'left', color: COL.ink });
          const dt = new Date(r.at);
          text(ctx, `LAND ${r.land} · ${fmt(r.dist)}m · ${dt.getMonth() + 1}/${dt.getDate()}`, b.x + b.w - 40, y + 1, { size: 17, font: 'bold', align: 'right', color: COL.ink2 });
        });
      },
    }));
  }
  render(ctx) {
    const W = this.W, H = this.H, d = Save.data, t = this.t;
    drawLobbyBg(ctx, W, H, t, 0);
    const sx = this.stageX;
    // stage glow
    ctx.save();
    const g = ctx.createRadialGradient(sx, 600, 10, sx, 600, 190);
    g.addColorStop(0, 'rgba(255,250,220,0.55)'); g.addColorStop(1, 'rgba(255,250,220,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(sx, 596, 190, 50, 0, 0, TAU); ctx.fill();
    ctx.restore();
    if (d.relay && Progress.owned(d.relay)) {
      drawChar(ctx, d.relay, 'idle', t + 0.5, sx - 168, 590, 0.8);
      pill(ctx, sx - 168, 612, '릴레이', COL.blue, 14);
    }
    drawChar(ctx, d.sel, this.cheer > 0 ? 'cheer' : 'idle', t, sx, 598 + this.hop, 1.32);
    if (d.pet && Progress.ownsPet(d.pet)) drawPet(ctx, d.pet, t, sx + 150, 420, 1.0);
    // name plate
    const c = CHAR[d.sel];
    const lv = Progress.charLv(d.sel);
    ctx.save();
    rrPath(ctx, sx - 150, 626, 300, 62, 22); ctx.fillStyle = 'rgba(74,42,26,0.72)'; ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 2.5; ctx.stroke(); ctx.restore();
    text(ctx, `${c.name}  Lv.${lv}`, sx, 646, { size: 25, color: '#fff', stroke: COL.ink, sw: 5 });
    text(ctx, `스킬 · ${c.skill.name}`, sx, 673, { size: 16, font: 'bold', color: '#ffe680' });

    // top-left level + xp
    ctx.save();
    ctx.fillStyle = COL.purple; ctx.beginPath(); ctx.arc(56, 52, 34, 0, TAU); ctx.fill();
    ctx.strokeStyle = COL.ink; ctx.lineWidth = 4.5; ctx.stroke(); ctx.restore();
    text(ctx, 'Lv', 56, 36, { size: 14, font: 'num', color: '#fff' });
    text(ctx, d.level, 56, 60, { size: 30, font: 'num', color: '#fff', stroke: COL.ink, sw: 5 });
    bar(ctx, 100, 40, 220, 24, d.xp / xpNeed(d.level), { colors: ['#d6c2ff', '#9a6bff'] });
    text(ctx, `${d.xp} / ${xpNeed(d.level)} XP`, 210, 53, { size: 14, font: 'num', color: '#fff', stroke: COL.ink, sw: 3.5 });
    // best score
    ctx.save(); rrPath(ctx, 22, 96, 300, 46, 23); ctx.fillStyle = 'rgba(74,42,26,0.6)'; ctx.fill(); ctx.restore();
    icon(ctx, 'crown', 48, 119, 38);
    text(ctx, '최고 기록', 74, 119, { size: 17, align: 'left', color: '#ffe680', stroke: COL.ink, sw: 4 });
    text(ctx, fmt(d.best), 306, 120, { size: 22, font: 'num', align: 'right', color: '#fff', stroke: COL.ink, sw: 5 });
    // coins
    counter(ctx, W - (this.fsBtn ? 370 : 300), 50, 'coin', fmt(this.coinShown), { w: 200, h: 48 });
    // tip
    const tip = TIPS[this.tipI];
    const a = Math.min(1, this.tipT * 3, (6 - this.tipT) * 3);
    text(ctx, tip, W - 410 + 190, H - 34, { size: 17, font: 'bold', color: '#fff', stroke: 'rgba(74,42,26,0.85)', sw: 5, alpha: a, maxW: 400 });
    this.ui.draw(ctx);
    void panel; void Ease; void PET;
  }
}

});

// ---- src/scenes/characters.js
__def("src/scenes/characters.js", function (__exports, __req) {
__exp(__exports, { "CharactersScene": () => CharactersScene });
// =============================================================================
//  Runner collection: buy, level up, choose main & relay runner.
// =============================================================================
const { Button, text, panel, para, COL, rrPath, icon } = __req("src/engine/ui.js");
const { fmt, TAU } = __req("src/engine/util.js");
const { Assets } = __req("src/engine/assets.js");
const { Save } = __req("src/engine/storage.js");
const { Progress } = __req("src/game/progress.js");
const { CHARS, CHAR, MAX_CHAR_LV } = __req("src/data/content.js");
const { MenuScene, drawChar, pill } = __req("src/scenes/common.js");

class CharactersScene extends MenuScene {
  constructor(game) { super(game, '캐릭터', 'orange'); }
  enter() { this.focus = Save.data.sel; this.anim = 'idle'; this.animT = 0; this.build(); }
  layout() { if (this.focus) this.build(); }
  build() {
    const W = this.W, d = Save.data;
    this.ui.clear();
    this.chrome();
    this.cards = [];
    const cw = 150, ch = 186, gap = 14, x0 = 40, y0 = 112;
    CHARS.forEach((c, i) => {
      const x = x0 + (i % 4) * (cw + gap), y = y0 + Math.floor(i / 4) * (ch + gap + 6);
      this.cards.push({ id: c.id, x, y, w: cw, h: ch });
    });
    const dx = x0 + 4 * cw + 3 * gap + 26, dw = W - dx - 30;
    this.detail = { x: dx, y: 108, w: dw, h: 580 };
    const c = CHAR[this.focus];
    const owned = Progress.owned(c.id);
    const by = this.detail.y + this.detail.h - 100;
    const bx = dx + 24, bwAll = dw - 48;
    if (!owned) {
      this.ui.add(new Button({ x: bx, y: by, w: bwAll, h: 80, label: `구매하기`, sub: `${fmt(c.price)} 코인`, icon: 'coin', color: 'green', size: 30,
        enabled: d.coins >= c.price, sound: 'ui_buy',
        onClick: () => { if (Progress.buyChar(c.id)) { this.game.audio.play('ui_unlock'); this.game.toast(`${c.name}(이)가 친구가 되었어요!`, { icon: 'char' }); this.anim = 'cheer'; this.animT = 0; this.build(); } },
        onDisabled: () => this.game.toast('코인이 부족해요!', { icon: 'coin' }) }));
      return;
    }
    const isSel = d.sel === c.id, isRelay = d.relay === c.id;
    const third = (bwAll - 24) / 3;
    this.ui.add(new Button({ x: bx, y: by, w: third, h: 80, label: isSel ? '대표 캐릭터' : '대표로 선택', color: isSel ? 'grey' : 'orange', size: 22, enabled: !isSel,
      sound: 'ui_select', onClick: () => { Progress.select(c.id); this.anim = 'cheer'; this.animT = 0; this.build(); } }));
    this.ui.add(new Button({ x: bx + third + 12, y: by, w: third, h: 80, label: isRelay ? '릴레이 해제' : '릴레이 지정', color: 'blue', size: 22, enabled: !isSel,
      onClick: () => { Progress.setRelay(isRelay ? null : c.id); this.build(); if (!isRelay) this.game.toast(`${c.name}(이)가 릴레이로 이어 달려요!`, { icon: 'char' }); } }));
    const cost = Progress.charUpCost(c.id);
    this.ui.add(new Button({ x: bx + (third + 12) * 2, y: by, w: third, h: 80, label: cost == null ? '최고 레벨' : '레벨업', sub: cost == null ? null : `${fmt(cost)} 코인`,
      color: 'green', size: 22, enabled: cost != null && d.coins >= cost, sound: 'ui_buy',
      onClick: () => { if (Progress.levelUpChar(c.id)) { this.game.audio.play('ui_levelup'); this.anim = 'cheer'; this.animT = 0; this.build(); } },
      onDisabled: () => { if (cost != null) this.game.toast('코인이 부족해요!', { icon: 'coin' }); } }));
  }
  update(dt) { super.update(dt); this.animT += dt; if (this.anim === 'cheer' && this.animT > 1.6) this.anim = 'idle'; }
  pointer(type, p) {
    if (this.ui.pointer(type, p)) return true;
    if (type === 'down') {
      for (const cd of this.cards) if (p.x >= cd.x && p.x <= cd.x + cd.w && p.y >= cd.y && p.y <= cd.y + cd.h) {
        if (this.focus !== cd.id) { this.focus = cd.id; this.anim = 'idle'; this.animT = 0; this.game.audio.play('ui_swipe'); this.build(); }
        return true;
      }
    }
    return false;
  }
  key(code, acts) {
    if (super.key(code, acts)) return true;
    const i = CHARS.findIndex((c) => c.id === this.focus);
    if (acts.includes('right') || acts.includes('left')) {
      const n = (i + (acts.includes('right') ? 1 : CHARS.length - 1)) % CHARS.length;
      this.focus = CHARS[n].id; this.game.audio.play('ui_swipe'); this.build(); return true;
    }
    return false;
  }
  render(ctx) {
    const d = Save.data;
    this.drawBg(ctx);
    // cards
    for (const cd of this.cards) {
      const c = CHAR[cd.id];
      const owned = Progress.owned(c.id);
      const focus = this.focus === c.id;
      panel(ctx, cd.x, cd.y, cd.w, cd.h, { r: 22, fill: focus ? '#fff3cf' : '#fffaf3', fill2: focus ? '#ffd98a' : '#ffe9cc', lw: focus ? 6 : 4.5 });
      Assets.draw(ctx, 'portrait_' + c.id, 0, cd.x + cd.w / 2, cd.y + 76, { scale: 1.12, alpha: owned ? 1 : 0.95, tint: owned ? null : '#6b4f5e' });
      if (!owned) icon(ctx, 'lock', cd.x + cd.w / 2, cd.y + 82, 52);
      text(ctx, c.name, cd.x + cd.w / 2, cd.y + 140, { size: 24, color: COL.ink });
      if (owned) text(ctx, `Lv.${Progress.charLv(c.id)}`, cd.x + cd.w / 2, cd.y + 167, { size: 18, font: 'num', color: COL.pinkD });
      else { icon(ctx, 'coin', cd.x + 36, cd.y + 166, 28); text(ctx, fmt(c.price), cd.x + cd.w / 2 + 12, cd.y + 167, { size: 18, font: 'num', color: d.coins >= c.price ? COL.greenD : COL.ink2 }); }
      if (d.sel === c.id) pill(ctx, cd.x + 40, cd.y + 14, '대표', COL.orange, 14);
      else if (d.relay === c.id) pill(ctx, cd.x + 44, cd.y + 14, '릴레이', COL.blue, 14);
    }
    // detail
    const D = this.detail, c = CHAR[this.focus];
    const owned = Progress.owned(c.id);
    const lv = Math.max(1, Progress.charLv(c.id));
    panel(ctx, D.x, D.y, D.w, D.h, { r: 30 });
    const charCol = Math.max(150, Math.min(300, D.w * 0.38));
    const stageX = D.x + charCol / 2 + 12, feet = D.y + 196;
    const sc = charCol >= 250 ? 0.95 : 0.78;
    ctx.save(); ctx.fillStyle = 'rgba(255,200,150,0.35)'; ctx.beginPath(); ctx.ellipse(stageX, feet, charCol * 0.36, 22, 0, 0, TAU); ctx.fill(); ctx.restore();
    drawChar(ctx, c.id, this.anim, this.animT, stageX, feet, sc);
    const tx = D.x + charCol + 18, tw = D.x + D.w - 24 - tx;
    text(ctx, c.name, tx, D.y + 52, { size: 38, align: 'left', color: COL.pink, stroke: COL.ink, sw: 7, maxW: tw });
    text(ctx, c.kind, tx, D.y + 92, { size: 19, font: 'bold', align: 'left', color: COL.ink2, maxW: tw });
    text(ctx, `에너지 ${c.energy}`, tx, D.y + 124, { size: 18, font: 'bold', align: 'left', color: COL.greenD });
    const pg = Math.min(24, tw / MAX_CHAR_LV);
    for (let i = 0; i < MAX_CHAR_LV; i++) {
      ctx.save(); ctx.fillStyle = i < lv && owned ? COL.yellow : 'rgba(74,42,26,0.18)'; ctx.beginPath(); ctx.arc(tx + i * pg + 9, D.y + 156, Math.min(9, pg * 0.42), 0, TAU); ctx.fill(); ctx.strokeStyle = COL.ink; ctx.lineWidth = 2.5; ctx.stroke(); ctx.restore();
    }
    text(ctx, owned ? `Lv.${lv} / ${MAX_CHAR_LV}` : '잠김', tx, D.y + 184, { size: 15, font: 'num', align: 'left', color: COL.ink2 });
    para(ctx, c.desc, D.x + 28, D.y + 222, D.w - 56, { size: 17, color: COL.ink, lh: 24 });
    // skill box
    const sy = D.y + 306;
    ctx.save(); rrPath(ctx, D.x + 22, sy, D.w - 44, 166, 20); ctx.fillStyle = 'rgba(255,214,150,0.45)'; ctx.fill(); ctx.strokeStyle = 'rgba(74,42,26,0.3)'; ctx.lineWidth = 2.5; ctx.stroke(); ctx.restore();
    icon(ctx, 'star', D.x + 54, sy + 34, 40);
    text(ctx, `스킬 · ${c.skill.name}`, D.x + 82, sy + 35, { size: 23, align: 'left', color: COL.orangeD, stroke: '#fff', sw: 4, maxW: D.w - 120 });
    para(ctx, c.skill.text(lv, c.skill), D.x + 40, sy + 62, D.w - 80, { size: 17, color: COL.ink, lh: 25 });
    if (owned && lv < MAX_CHAR_LV) text(ctx, '다음 레벨: 스킬 강화 + 젤리 점수 +3%', D.x + 40, sy + 148, { size: 15, font: 'bold', align: 'left', color: COL.ink2, maxW: D.w - 80 });
    this.ui.draw(ctx);
    this.drawChrome(ctx);
  }
}

});

// ---- src/scenes/pets.js
__def("src/scenes/pets.js", function (__exports, __req) {
__exp(__exports, { "PetsScene": () => PetsScene });
// =============================================================================
//  Pet collection: buy & equip a companion.
// =============================================================================
const { Button, text, panel, para, COL, icon } = __req("src/engine/ui.js");
const { fmt, TAU } = __req("src/engine/util.js");
const { Assets } = __req("src/engine/assets.js");
const { Save } = __req("src/engine/storage.js");
const { Progress } = __req("src/game/progress.js");
const { PETS, PET } = __req("src/data/content.js");
const { MenuScene, drawPet, drawChar, pill } = __req("src/scenes/common.js");

class PetsScene extends MenuScene {
  constructor(game) { super(game, '펫', 'blue'); }
  enter() { this.focus = Save.data.pet || PETS[0].id; this.build(); }
  layout() { if (this.focus) this.build(); }
  build() {
    const W = this.W, d = Save.data;
    this.ui.clear();
    this.chrome();
    const cw = 196, ch = 186, gap = 16, x0 = 40, y0 = 112;
    this.cards = PETS.map((p, i) => ({ id: p.id, x: x0 + (i % 3) * (cw + gap), y: y0 + Math.floor(i / 3) * (ch + gap + 6), w: cw, h: ch }));
    const dx = x0 + 3 * cw + 2 * gap + 26, dw = W - dx - 30;
    this.detail = { x: dx, y: 108, w: dw, h: 580 };
    const p = PET[this.focus];
    const owned = Progress.ownsPet(p.id);
    const by = this.detail.y + this.detail.h - 100, bx = dx + 24, bw = dw - 48;
    if (!owned) {
      this.ui.add(new Button({ x: bx, y: by, w: bw, h: 80, label: '데려오기', sub: `${fmt(p.price)} 코인`, icon: 'coin', color: 'green', size: 30, enabled: d.coins >= p.price, sound: 'ui_buy',
        onClick: () => { if (Progress.buyPet(p.id)) { this.game.audio.play('ui_unlock'); Progress.selectPet(p.id); this.game.toast(`${p.name}(이)가 함께 달려요!`, { icon: 'pet' }); this.build(); } },
        onDisabled: () => this.game.toast('코인이 부족해요!', { icon: 'coin' }) }));
    } else {
      const eq = d.pet === p.id;
      this.ui.add(new Button({ x: bx, y: by, w: bw, h: 80, label: eq ? '함께하는 중 (해제)' : '함께 달리기', color: eq ? 'grey' : 'blue', size: 28, sound: 'ui_select',
        onClick: () => { Progress.selectPet(eq ? null : p.id); this.build(); } }));
    }
  }
  pointer(type, pt) {
    if (this.ui.pointer(type, pt)) return true;
    if (type === 'down') for (const c of this.cards) if (pt.x >= c.x && pt.x <= c.x + c.w && pt.y >= c.y && pt.y <= c.y + c.h) { if (this.focus !== c.id) { this.focus = c.id; this.game.audio.play('ui_swipe'); this.build(); } return true; }
    return false;
  }
  key(code, acts) {
    if (super.key(code, acts)) return true;
    const i = PETS.findIndex((p) => p.id === this.focus);
    if (acts.includes('right') || acts.includes('left')) { this.focus = PETS[(i + (acts.includes('right') ? 1 : PETS.length - 1)) % PETS.length].id; this.game.audio.play('ui_swipe'); this.build(); return true; }
    return false;
  }
  render(ctx) {
    const d = Save.data;
    this.drawBg(ctx);
    for (const c of this.cards) {
      const p = PET[c.id];
      const owned = Progress.ownsPet(p.id), focus = this.focus === p.id;
      panel(ctx, c.x, c.y, c.w, c.h, { r: 22, fill: focus ? '#e9f6ff' : '#fffaf3', fill2: focus ? '#a9dcff' : '#ffe9cc', lw: focus ? 6 : 4.5 });
      Assets.draw(ctx, 'petportrait_' + p.id, 0, c.x + c.w / 2, c.y + 76, { scale: 1.3, tint: owned ? null : '#6b4f5e' });
      if (!owned) icon(ctx, 'lock', c.x + c.w / 2, c.y + 80, 50);
      text(ctx, p.name, c.x + c.w / 2, c.y + 142, { size: 24, color: COL.ink });
      if (!owned) { icon(ctx, 'coin', c.x + c.w / 2 - 40, c.y + 167, 28); text(ctx, fmt(p.price), c.x + c.w / 2 + 12, c.y + 168, { size: 18, font: 'num', color: d.coins >= p.price ? COL.greenD : COL.ink2 }); }
      else text(ctx, d.pet === p.id ? '함께하는 중' : '보유 중', c.x + c.w / 2, c.y + 168, { size: 16, font: 'bold', color: d.pet === p.id ? COL.blueD : COL.ink2 });
      if (d.pet === p.id) pill(ctx, c.x + 40, c.y + 14, '장착', COL.blue, 14);
    }
    const D = this.detail, p = PET[this.focus];
    panel(ctx, D.x, D.y, D.w, D.h, { r: 30 });
    const sx = D.x + D.w / 2;
    ctx.save(); ctx.fillStyle = 'rgba(150,210,255,0.35)'; ctx.beginPath(); ctx.ellipse(sx, D.y + 300, 150, 28, 0, 0, TAU); ctx.fill(); ctx.restore();
    drawChar(ctx, d.sel, 'idle', this.t, sx - 60, D.y + 300, 0.85);
    drawPet(ctx, p.id, this.t, sx + 80, D.y + 170, 1.25, { act: Math.floor(this.t / 2) % 2 === 1 });
    text(ctx, p.name, sx, D.y + 360, { size: 40, color: COL.blue, stroke: COL.ink, sw: 7 });
    para(ctx, p.desc, D.x + 36, D.y + 396, D.w - 72, { size: 19, color: COL.ink, lh: 28, align: 'left' });
    text(ctx, `능력 쿨타임 ${p.cd}초`, sx, D.y + 462, { size: 18, font: 'bold', color: COL.ink2 });
    this.ui.draw(ctx);
    this.drawChrome(ctx);
  }
}

});

// ---- src/scenes/lab.js
__def("src/scenes/lab.js", function (__exports, __req) {
__exp(__exports, { "LabScene": () => LabScene });
// =============================================================================
//  Lab: permanent upgrades bought with coins.
// =============================================================================
const { Button, text, panel, COL, icon, rrPath } = __req("src/engine/ui.js");
const { fmt, TAU } = __req("src/engine/util.js");
const { Save } = __req("src/engine/storage.js");
const { Progress } = __req("src/game/progress.js");
const { LAB } = __req("src/data/content.js");
const { MenuScene } = __req("src/scenes/common.js");

class LabScene extends MenuScene {
  constructor(game) { super(game, '연구소', 'purple'); }
  enter() { this.flashRow = -1; this.flashT = 0; this.build(); }
  layout() { this.build(); }
  build() {
    const W = this.W, d = Save.data;
    this.ui.clear();
    this.chrome();
    const cols = 2, gap = 18, x0 = 40, y0 = 108;
    const rw = (W - x0 * 2 - gap) / cols, rh = 132;
    this.rows = LAB.map((u, i) => ({ u, x: x0 + (i % cols) * (rw + gap), y: y0 + Math.floor(i / cols) * (rh + 14), w: rw, h: rh }));
    this.rows.forEach((row, i) => {
      const cost = Progress.labNext(row.u.id);
      this.ui.add(new Button({ x: row.x + row.w - 196, y: row.y + 30, w: 176, h: 76, label: cost == null ? 'MAX' : fmt(cost), icon: cost == null ? null : 'coin', iconSize: 40, size: 26,
        color: cost == null ? 'grey' : 'green', enabled: cost != null && d.coins >= cost, sound: 'ui_buy',
        onClick: () => { if (Progress.buyLab(row.u.id)) { this.game.audio.play('ui_levelup'); this.flashRow = i; this.flashT = 0.6; this.build(); } },
        onDisabled: () => { if (cost != null) this.game.toast('코인이 부족해요!', { icon: 'coin' }); } }));
    });
  }
  update(dt) { super.update(dt); if (this.flashT > 0) this.flashT -= dt; }
  render(ctx) {
    this.drawBg(ctx);
    this.rows.forEach((row, i) => {
      const { u, x, y, w, h } = row;
      const lv = Progress.lab(u.id);
      const glow = this.flashRow === i && this.flashT > 0 ? this.flashT / 0.6 : 0;
      panel(ctx, x, y, w, h, { r: 24, fill: glow ? '#fff8d0' : '#fffaf3', fill2: glow ? '#ffe680' : '#f6e3ff' });
      ctx.save(); ctx.fillStyle = 'rgba(167,123,255,0.18)'; ctx.beginPath(); ctx.arc(x + 62, y + h / 2, 44, 0, TAU); ctx.fill(); ctx.restore();
      icon(ctx, u.icon.includes(':') ? 'star' : u.icon, x + 62, y + h / 2, 62);
      text(ctx, u.name, x + 118, y + 34, { size: 25, align: 'left', color: COL.purpleD, stroke: '#fff', sw: 4 });
      text(ctx, u.desc, x + 118, y + 66, { size: 16, font: 'bold', align: 'left', color: COL.ink, maxW: w - 340 });
      const nxt = lv < u.max ? `  →  ${u.val(lv + 1)}` : '';
      text(ctx, `현재 ${u.val(lv)}${nxt}`, x + 118, y + 94, { size: 16, font: 'bold', align: 'left', color: COL.greenD, maxW: w - 340 });
      // pips
      const pw = Math.min(22, (w - 340) / u.max);
      for (let k = 0; k < u.max; k++) {
        ctx.save(); rrPath(ctx, x + 118 + k * pw, y + 110, pw - 4, 10, 5);
        ctx.fillStyle = k < lv ? COL.purple : 'rgba(74,42,26,0.15)'; ctx.fill(); ctx.restore();
      }
      text(ctx, `Lv.${lv}/${u.max}`, x + w - 108, y + 18, { size: 15, font: 'num', color: COL.ink2 });
    });
    this.ui.draw(ctx);
    this.drawChrome(ctx);
  }
}

});

// ---- src/scenes/missions.js
__def("src/scenes/missions.js", function (__exports, __req) {
__exp(__exports, { "MissionsScene": () => MissionsScene });
// =============================================================================
//  Missions: three active goals with coin rewards, plus lifetime stats.
// =============================================================================
const { Button, text, panel, bar, COL, icon } = __req("src/engine/ui.js");
const { fmt, TAU } = __req("src/engine/util.js");
const { Save } = __req("src/engine/storage.js");
const { Progress } = __req("src/game/progress.js");
const { MenuScene } = __req("src/scenes/common.js");

class MissionsScene extends MenuScene {
  constructor(game) { super(game, '미션', 'mint'); }
  enter() { Progress.ensureMissions(); this.pop = [0, 0, 0]; this.build(); }
  layout() { this.build(); }
  build() {
    const W = this.W;
    this.ui.clear();
    this.chrome();
    const cw = Math.min(980, W - 80), x0 = (W - cw) / 2;
    this.cards = Save.data.missions.map((m, i) => ({ m, x: x0, y: 112 + i * 150, w: cw, h: 136 }));
    this.cards.forEach((c, i) => {
      const done = c.m.done;
      this.ui.add(new Button({ x: c.x + c.w - 210, y: c.y + 30, w: 186, h: 78, label: done ? '보상 받기' : '진행 중', color: done ? 'green' : 'grey', size: 25, enabled: done, sound: 'ui_reward',
        onClick: () => {
          const res = Progress.claim(i);
          if (!res) return;
          this.game.toast(`미션 완료! +${fmt(res.reward)} 코인`, { icon: 'coin' });
          for (const up of res.ups) { this.game.audio.play('ui_levelup'); this.game.toast(`레벨 업! Lv.${up.level}  +${fmt(up.reward)} 코인`, { icon: 'level', dur: 2.8 }); }
          this.pop[i] = 1;
          this.build();
        } }));
    });
  }
  update(dt) { super.update(dt); for (let i = 0; i < 3; i++) this.pop[i] = Math.max(0, this.pop[i] - dt * 2); }
  render(ctx) {
    const W = this.W, H = this.H, d = Save.data;
    this.drawBg(ctx);
    this.cards.forEach((c, i) => {
      const m = c.m;
      panel(ctx, c.x, c.y, c.w, c.h, { r: 26, fill: m.done ? '#f1ffe6' : '#fffaf3', fill2: m.done ? '#c8f5ad' : '#ffe9cc' });
      ctx.save(); ctx.fillStyle = 'rgba(79,220,185,0.2)'; ctx.beginPath(); ctx.arc(c.x + 68, c.y + c.h / 2, 46, 0, TAU); ctx.fill(); ctx.restore();
      icon(ctx, m.done ? 'check' : 'mission', c.x + 68, c.y + c.h / 2, 64);
      text(ctx, Progress.missionText(m), c.x + 132, c.y + 40, { size: 25, align: 'left', color: COL.ink, maxW: c.w - 380 });
      const k = Math.min(1, m.progress / m.target);
      bar(ctx, c.x + 132, c.y + 68, c.w - 380, 26, k, { colors: m.done ? ['#c4f78a', '#4fc43a'] : ['#9ff0de', '#2fbf9c'] });
      text(ctx, `${fmt(Math.floor(m.progress))} / ${fmt(m.target)}`, c.x + 132 + (c.w - 380) / 2, c.y + 82, { size: 16, font: 'num', color: '#fff', stroke: COL.ink, sw: 4 });
      icon(ctx, 'coin', c.x + 148, c.y + 114, 30);
      text(ctx, `보상 ${fmt(Progress.missionReward(m))}`, c.x + 168, c.y + 115, { size: 18, font: 'bold', align: 'left', color: COL.orangeD });
    });
    // lifetime stats
    const st = d.stats;
    const sy = 112 + 3 * 150 + 4;
    const cw = Math.min(980, W - 80), x0 = (W - cw) / 2;
    panel(ctx, x0, sy, cw, H - sy - 22, { r: 24, fill: '#fffaf3', fill2: '#f3e6ff' });
    const items = [['trophy', '최고 기록', fmt(d.best)], ['flag', '최장 거리', `${fmt(d.bestDist)}m`], ['retry', '플레이', `${fmt(st.runs)}판`], ['jelly', '누적 젤리', fmt(st.jellyTotal)], ['coin', '누적 코인', fmt(st.coinsTotal)]];
    const iw = cw / items.length;
    items.forEach(([ic, label, val], i) => {
      const cx = x0 + iw * i + iw / 2;
      icon(ctx, ic, cx - 52, sy + 44, 40);
      text(ctx, label, cx + 10, sy + 32, { size: 15, font: 'bold', color: COL.ink2 });
      text(ctx, val, cx + 10, sy + 58, { size: 21, font: 'num', color: COL.ink });
    });
    this.ui.draw(ctx);
    this.drawChrome(ctx);
  }
}

});

// ---- src/scenes/prerun.js
__def("src/scenes/prerun.js", function (__exports, __req) {
__exp(__exports, { "PrerunScene": () => PrerunScene });
// =============================================================================
//  Pre-run: lineup check and one-run boosts.
// =============================================================================
const { Button, text, panel, COL, icon, rrPath } = __req("src/engine/ui.js");
const { Assets } = __req("src/engine/assets.js");
const { fmt, TAU } = __req("src/engine/util.js");
const { Save } = __req("src/engine/storage.js");
const { Progress } = __req("src/game/progress.js");
const { BOOSTS, CHAR, PET } = __req("src/data/content.js");
const { MenuScene, drawChar, drawPet, pill } = __req("src/scenes/common.js");

class PrerunScene extends MenuScene {
  constructor(game) { super(game, '출발 준비', 'green'); }
  enter() {
    const d = Save.data;
    this.sel = {};
    for (const b of BOOSTS) this.sel[b.id] = !!d.boosts[b.id];
    this.fit();
    this.build();
  }
  layout() { this.build(); }
  total() { return BOOSTS.reduce((s, b) => s + (this.sel[b.id] ? b.price : 0), 0); }
  fit() { // drop remembered boosts the wallet can't cover
    const d = Save.data;
    for (const b of [...BOOSTS].reverse()) if (this.total() > d.coins && this.sel[b.id]) this.sel[b.id] = false;
  }
  build() {
    const W = this.W, H = this.H, d = Save.data;
    this.ui.clear();
    this.chrome();
    const lx = 40, lw = Math.min(420, W * 0.34);
    this.left = { x: lx, y: 108, w: lw, h: 580 };
    this.ui.add(new Button({ x: lx + 24, y: 108 + 580 - 96, w: (lw - 60) / 2, h: 72, label: '캐릭터', icon: 'char', color: 'orange', size: 22, onClick: () => this.game.goScene('characters') }));
    this.ui.add(new Button({ x: lx + 36 + (lw - 60) / 2, y: 108 + 580 - 96, w: (lw - 60) / 2, h: 72, label: '펫', icon: 'pet', color: 'blue', size: 22, onClick: () => this.game.goScene('pets') }));
    const rx = lx + lw + 24, rw = W - rx - 40;
    this.boostRects = BOOSTS.map((b, i) => ({ b, x: rx, y: 108 + i * 94, w: rw, h: 84 }));
    const total = this.total();
    this.goBtn = this.ui.add(new Button({ x: rx + rw - 300, y: H - 112, w: 300, h: 96, label: '출발!', icon: 'play', iconSize: 60, color: 'green', size: 40,
      key: ['confirm', 'Space'], sound: 'ui_select', enabled: total <= d.coins,
      onClick: () => this.go(), onDisabled: () => this.game.toast('코인이 부족해요!', { icon: 'coin' }) }));
  }
  go() {
    const d = Save.data;
    const total = this.total();
    if (total > d.coins) return;
    if (total > 0) { Progress.spend(total); this.game.audio.play('ui_buy'); }
    d.boosts = { ...this.sel };
    Save.save();
    const tutorial = !d.tutorial;
    this.game.startRun({ char: d.sel, relay: d.relay, pet: d.pet && Progress.ownsPet(d.pet) ? d.pet : null, boosts: { ...this.sel }, tutorial });
  }
  pointer(type, p) {
    if (this.ui.pointer(type, p)) return true;
    if (type === 'down') {
      for (const r of this.boostRects) if (p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h) {
        const on = !this.sel[r.b.id];
        if (on && this.total() + r.b.price > Save.data.coins) { this.game.audio.play('ui_error'); this.game.toast('코인이 부족해요!', { icon: 'coin' }); return true; }
        this.sel[r.b.id] = on;
        this.game.audio.play('ui_toggle');
        this.build();
        return true;
      }
    }
    return false;
  }
  render(ctx) {
    const W = this.W, H = this.H, d = Save.data;
    this.drawBg(ctx);
    const L = this.left;
    panel(ctx, L.x, L.y, L.w, L.h, { r: 30 });
    text(ctx, '함께 달릴 친구들', L.x + L.w / 2, L.y + 40, { size: 24, color: COL.ink });
    const cx = L.x + L.w / 2;
    ctx.save(); ctx.fillStyle = 'rgba(255,200,150,0.35)'; ctx.beginPath(); ctx.ellipse(cx, L.y + 300, 170, 34, 0, 0, TAU); ctx.fill(); ctx.restore();
    if (d.relay && Progress.owned(d.relay)) { drawChar(ctx, d.relay, 'idle', this.t + 0.4, cx - 110, L.y + 292, 0.72); pill(ctx, cx - 110, L.y + 318, '릴레이', COL.blue, 13); }
    drawChar(ctx, d.sel, 'idle', this.t, cx + 20, L.y + 304, 1.05);
    if (d.pet && Progress.ownsPet(d.pet)) drawPet(ctx, d.pet, this.t, cx + 130, L.y + 150, 0.95);
    text(ctx, `${CHAR[d.sel].name} Lv.${Progress.charLv(d.sel)}`, cx, L.y + 362, { size: 26, color: COL.pink, stroke: COL.ink, sw: 5 });
    text(ctx, `스킬 · ${CHAR[d.sel].skill.name}`, cx, L.y + 394, { size: 17, font: 'bold', color: COL.ink2 });
    text(ctx, d.relay ? `릴레이 · ${CHAR[d.relay].name}` : '릴레이 없음', cx, L.y + 422, { size: 16, font: 'bold', color: COL.blueD });
    text(ctx, d.pet && Progress.ownsPet(d.pet) ? `펫 · ${PET[d.pet].name}` : '펫 없음', cx, L.y + 448, { size: 16, font: 'bold', color: COL.blueD });
    // boosts
    for (const r of this.boostRects) {
      const on = this.sel[r.b.id];
      panel(ctx, r.x, r.y, r.w, r.h, { r: 22, fill: on ? '#f1ffe6' : '#fffaf3', fill2: on ? '#bff0a0' : '#ffe9cc', lw: on ? 6 : 4.5 });
      const ic = r.b.icon;
      if (ic.startsWith('items:')) Assets.draw(ctx, 'items', ic.slice(6), r.x + 50, r.y + r.h / 2, { scale: 0.75 });
      else icon(ctx, ic, r.x + 50, r.y + r.h / 2, 56);
      text(ctx, r.b.name, r.x + 98, r.y + 30, { size: 23, align: 'left', color: COL.ink });
      text(ctx, r.b.desc, r.x + 98, r.y + 60, { size: 16, font: 'bold', align: 'left', color: COL.ink2, maxW: r.w - 300 });
      icon(ctx, 'coin', r.x + r.w - 150, r.y + r.h / 2, 34);
      text(ctx, fmt(r.b.price), r.x + r.w - 128, r.y + r.h / 2 + 1, { size: 22, font: 'num', align: 'left', color: COL.orangeD });
      ctx.save(); rrPath(ctx, r.x + r.w - 56, r.y + r.h / 2 - 18, 36, 36, 9);
      ctx.fillStyle = on ? COL.green : '#fff'; ctx.fill(); ctx.strokeStyle = COL.ink; ctx.lineWidth = 3.5; ctx.stroke(); ctx.restore();
      if (on) icon(ctx, 'check', r.x + r.w - 38, r.y + r.h / 2, 34);
    }
    const total = this.total();
    const rx = this.boostRects[0].x;
    text(ctx, '부스트는 이번 한 판에만 적용돼요', rx + 10, H - 86, { size: 17, font: 'bold', align: 'left', color: COL.ink2 });
    text(ctx, `합계  ${fmt(total)} 코인`, rx + 10, H - 52, { size: 26, align: 'left', color: total > d.coins ? COL.redD : COL.ink });
    this.ui.draw(ctx);
    this.drawChrome(ctx);
  }
}

});

// ---- src/engine/particles.js
__def("src/engine/particles.js", function (__exports, __req) {
__exp(__exports, { "Particles": () => Particles });
// =============================================================================
//  Particle system (pooled). Particles use atlas sprites or simple shapes.
// =============================================================================
const { Assets } = __req("src/engine/assets.js");
const { rand, TAU } = __req("src/engine/util.js");

class Particles {
  constructor(max = 900) {
    this.max = max;
    this.list = [];
    this.pool = [];
    this.quality = 1; // 0..1 spawn multiplier
  }

  /**
   * spawn({ x, y, vx, vy, ax, ay, drag, life, size, size1, rot, vr, alpha, alpha1,
   *         sprite:[atlasId, frame], anim:[atlasId, frames[], fps], color, shape:'circle'|'rect'|'star',
   *         add, screen, w, h, gravity })
   */
  spawn(o) {
    if (this.list.length >= this.max) return null;
    const p = this.pool.pop() || {};
    p.x = o.x; p.y = o.y;
    p.vx = o.vx || 0; p.vy = o.vy || 0;
    p.ax = o.ax || 0; p.ay = o.ay ?? 0;
    p.drag = o.drag || 0;
    p.life = 0; p.maxLife = o.life || 0.6;
    p.size = o.size ?? 1; p.size1 = o.size1 ?? p.size;
    p.rot = o.rot || 0; p.vr = o.vr || 0;
    p.alpha = o.alpha ?? 1; p.alpha1 = o.alpha1 ?? 0;
    p.sprite = o.sprite || null;
    p.anim = o.anim || null;
    p.color = o.color || '#fff';
    p.shape = o.shape || 'circle';
    p.add = !!o.add;
    p.screen = !!o.screen;
    p.w = o.w || 8; p.h = o.h || 8;
    p.fadeIn = o.fadeIn || 0;
    p.wobble = o.wobble || 0; p.ph = rand() * TAU;
    this.list.push(p);
    return p;
  }

  burst(n, fn) {
    const k = Math.max(1, Math.round(n * this.quality));
    for (let i = 0; i < k; i++) this.spawn(fn(i, k));
  }

  update(dt) {
    const L = this.list;
    for (let i = L.length - 1; i >= 0; i--) {
      const p = L[i];
      p.life += dt;
      if (p.life >= p.maxLife) { L[i] = L[L.length - 1]; L.pop(); this.pool.push(p); continue; }
      p.vx += p.ax * dt; p.vy += p.ay * dt;
      if (p.drag) { const d = Math.exp(-p.drag * dt); p.vx *= d; p.vy *= d; }
      p.x += p.vx * dt; p.y += p.vy * dt;
      if (p.wobble) p.x += Math.sin(p.life * 4 + p.ph) * p.wobble * dt;
      p.rot += p.vr * dt;
    }
  }

  clear() { while (this.list.length) this.pool.push(this.list.pop()); }

  render(ctx, camX = 0, camY = 0, screenPass = false) {
    for (const p of this.list) {
      if (p.screen !== screenPass) continue;
      const t = p.life / p.maxLife;
      let a = p.alpha + (p.alpha1 - p.alpha) * t;
      if (p.fadeIn && p.life < p.fadeIn) a *= p.life / p.fadeIn;
      if (a <= 0.01) continue;
      const s = p.size + (p.size1 - p.size) * t;
      const x = p.screen ? p.x : p.x - camX, y = p.screen ? p.y : p.y - camY;
      if (p.anim) {
        const [id, frames, fps] = p.anim;
        const fi = Math.min(frames.length - 1, Math.floor(p.life * fps));
        Assets.draw(ctx, id, frames[fi], x, y, { scale: s, rot: p.rot, alpha: a, add: p.add });
      } else if (p.sprite) {
        Assets.draw(ctx, p.sprite[0], p.sprite[1], x, y, { scale: s, rot: p.rot, alpha: a, add: p.add });
      } else {
        ctx.save();
        ctx.globalAlpha = a;
        if (p.add) ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = p.color;
        ctx.translate(x, y); ctx.rotate(p.rot); ctx.scale(s, s);
        if (p.shape === 'rect') ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        else { ctx.beginPath(); ctx.arc(0, 0, p.w / 2, 0, TAU); ctx.fill(); }
        ctx.restore();
      }
    }
  }
}

});

// ---- src/scenes/result.js
__def("src/scenes/result.js", function (__exports, __req) {
__exp(__exports, { "ResultScene": () => ResultScene });
// =============================================================================
//  Result screen: score count-up, record stamp, rewards, XP, missions.
// =============================================================================
const { Scene } = __req("src/engine/scene.js");
const { Button, text, panel, ribbon, bar, COL, icon } = __req("src/engine/ui.js");
const { Particles } = __req("src/engine/particles.js");
const { fmt, Ease, rand, TAU, clamp } = __req("src/engine/util.js");
const { Save } = __req("src/engine/storage.js");
const { CHAR, LANDS, xpNeed } = __req("src/data/content.js");
const { drawLobbyBg, drawChar } = __req("src/scenes/common.js");

class ResultScene extends Scene {
  enter(res) {
    this.res = res;
    this.shown = 0; this.coinShown = 0;
    this.tickT = 0;
    this.revealed = false;
    this.fx = new Particles(400);
    this.game.audio.playMusic('bgm_result', { fade: 1.2, vol: 0.85 });
    this.tw.after(0.35, () => this.game.audio.jingle('jingle_clear', 0.3));
    this.build();
    this.xpFrom = res.xpBefore; this.xpK = 0;
  }
  layout() { this.build(); }
  build() {
    const W = this.W, H = this.H;
    this.ui.clear();
    const show = this.t > 1.6 || this.revealed;
    this.ui.add(new Button({ x: W / 2 - 330, y: H - 108, w: 300, h: 88, label: '로비로', icon: 'home', color: 'pink', size: 32, visible: show, key: ['back'], onClick: () => this.game.goLobby() }));
    this.ui.add(new Button({ x: W / 2 + 30, y: H - 108, w: 300, h: 88, label: '다시 달리기', icon: 'retry', color: 'green', size: 30, visible: show, key: ['confirm', 'Space'], sound: 'ui_select', onClick: () => this.game.goScene('prerun') }));
  }
  update(dt) {
    super.update(dt);
    this.fx.update(dt);
    const s = this.res.summary.score;
    if (this.t > 0.5 && this.shown < s) {
      const k = clamp((this.t - 0.5) / 1.5, 0, 1);
      this.shown = Math.round(s * Ease.outCubic(k));
      this.tickT -= dt;
      if (this.tickT <= 0) { this.tickT = 0.055; this.game.audio.play('ui_tick', { rate: 0.9 + k * 0.6, vol: 0.7 }); }
    }
    if (this.t > 2.05 && !this.revealed) {
      this.revealed = true; this.shown = s;
      this.build();
      if (this.res.newBest) {
        this.game.audio.play('new_record');
        this.confetti();
      }
      for (const up of this.res.ups) this.game.toast(`레벨 업! Lv.${up.level}  +${fmt(up.reward)} 코인`, { icon: 'level', dur: 3 });
      for (const m of this.res.missions) this.game.toast(`미션 완료: ${m}`, { icon: 'mission', dur: 3 });
    }
    if (this.t > 2.1) {
      const target = this.res.earned;
      this.coinShown = Math.min(target, this.coinShown + Math.max(1, target * dt * 1.2));
      this.xpK = Math.min(1, this.xpK + dt * 0.8);
    }
    if (this.res.newBest && this.revealed && rand() < dt * 6) this.confetti(3);
  }
  confetti(n = 60) {
    const W = this.W;
    this.fx.burst(n, () => ({ x: rand.range(0, W), y: -20 - rand() * 100, vx: rand.range(-60, 60), vy: rand.range(120, 300), ay: 160, vr: rand.range(-8, 8), life: 3.2, sprite: ['fx', 'confetti_' + rand.int(0, 5)], size: rand.range(0.9, 1.4), alpha: 1, alpha1: 0.8, wobble: 60, screen: true }));
  }
  render(ctx) {
    const W = this.W, H = this.H, r = this.res, s = r.summary;
    drawLobbyBg(ctx, W, H, this.t, 0.55);
    ctx.save(); ctx.fillStyle = 'rgba(40,16,26,0.35)'; ctx.fillRect(0, 0, W, H); ctx.restore();
    const pw = Math.min(1000, W - 80), ph = 560, px = (W - pw) / 2;
    const k = Ease.outBack(Math.min(1, this.t / 0.45));
    const py = 34 + (1 - k) * 60;
    ctx.save(); ctx.globalAlpha = Math.min(1, this.t * 3);
    panel(ctx, px, py, pw, ph, { r: 34 });
    ribbon(ctx, W / 2, py + 6, 320, '달리기 결과', 'pink', 32);
    // runner cheering
    const cid = s.relayChar || s.char;
    drawChar(ctx, cid, this.revealed ? 'cheer' : 'idle', this.t, px + 150, py + 360, 1.15);
    text(ctx, CHAR[cid].name, px + 150, py + 400, { size: 24, color: COL.ink });
    // score
    const cx = px + pw / 2 + 110;
    text(ctx, '점수', cx, py + 80, { size: 22, color: COL.ink2 });
    const pop = this.revealed ? 1 + Math.max(0, 0.25 - (this.t - 2.05)) : 1;
    ctx.save(); ctx.translate(cx, py + 140); ctx.scale(pop, pop);
    text(ctx, fmt(this.shown), 0, 0, { size: 72, font: 'num', color: COL.pink, stroke: COL.ink, sw: 10, shadow: { dx: 0, dy: 5, color: 'rgba(74,42,26,0.35)' } });
    ctx.restore();
    text(ctx, (r.newBest ? `이전 최고 ${fmt(r.prevBest)}` : `최고 기록 ${fmt(Save.data.best)}`) + (r.rank && r.rank <= 5 && this.revealed ? `   ·   내 기록 ${r.rank}위` : ''), cx, py + 196, { size: 18, font: 'bold', color: COL.ink2 });
    if (r.newBest && this.revealed) {
      const st = Ease.outBack(Math.min(1, (this.t - 2.05) / 0.35));
      ctx.save(); ctx.translate(cx + 250, py + 92); ctx.rotate(0.22); ctx.scale(st * 1.0, st * 1.0);
      ctx.fillStyle = '#ff5d7a'; ctx.beginPath();
      for (let i = 0; i < 24; i++) { const a = (i / 24) * TAU, rr = i % 2 ? 58 : 70; ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
      ctx.closePath(); ctx.fill(); ctx.strokeStyle = COL.ink; ctx.lineWidth = 4; ctx.stroke();
      text(ctx, 'NEW', 0, -14, { size: 28, font: 'num', color: '#fff', stroke: COL.ink, sw: 5 });
      text(ctx, 'RECORD', 0, 16, { size: 20, font: 'num', color: '#ffe680', stroke: COL.ink, sw: 4 });
      ctx.restore();
    }
    // stat rows
    const rows = [
      ['flag', '달린 거리', `${fmt(s.dist)}m`],
      ['jelly', '먹은 젤리', fmt(s.jellies)],
      ['star', '최대 콤보', fmt(s.maxCombo)],
      ['trophy', '도달한 랜드', `LAND ${s.land} · ${LANDS[(s.land - 1) % 5].name}`],
    ];
    const rx = px + 300, rw = pw - 340;
    rows.forEach(([ic, label, val], i) => {
      const a = clamp((this.t - 0.6 - i * 0.12) * 4, 0, 1);
      const y = py + 240 + i * 46;
      icon(ctx, ic, rx + 20, y, 36, a);
      text(ctx, label, rx + 50, y + 1, { size: 21, font: 'bold', align: 'left', color: COL.ink, alpha: a });
      text(ctx, val, rx + rw, y + 1, { size: 22, font: /[가-힣]/.test(val) ? 'bold' : 'num', align: 'right', color: COL.ink, alpha: a });
    });
    // coins
    const cy = py + 240 + 4 * 46 + 8;
    const ca = clamp((this.t - 1.2) * 3, 0, 1);
    icon(ctx, 'coin', rx + 20, cy, 40, ca);
    text(ctx, '획득 코인', rx + 50, cy + 1, { size: 22, align: 'left', color: COL.orangeD, alpha: ca });
    text(ctx, `+${fmt(Math.floor(this.coinShown))}`, rx + rw, cy + 1, { size: 28, font: 'num', align: 'right', color: COL.orangeD, stroke: '#fff', sw: 4, alpha: ca });
    if (r.bonus > 0) text(ctx, `(점수 보너스 +${fmt(r.bonus)} 포함)`, rx + rw, cy + 28, { size: 14, font: 'bold', align: 'right', color: COL.ink2, alpha: ca });
    // xp
    const d = Save.data;
    const xa = clamp((this.t - 1.5) * 3, 0, 1);
    text(ctx, `Lv.${d.level}`, rx + 20, py + ph - 48, { size: 22, font: 'num', align: 'left', color: COL.purpleD, alpha: xa });
    bar(ctx, rx + 90, py + ph - 62, rw - 90, 26, (d.xp / xpNeed(d.level)) * (r.ups.length ? 1 : Math.max(this.xpK, 0.0001)), { colors: ['#d6c2ff', '#9a6bff'] });
    text(ctx, `+${r.xp} XP`, rx + 90 + (rw - 90) / 2, py + ph - 48, { size: 15, font: 'num', color: '#fff', stroke: COL.ink, sw: 4, alpha: xa });
    ctx.restore();
    this.fx.render(ctx, 0, 0, true);
    this.ui.draw(ctx);
  }
}

});

// ---- src/scenes/settings.js
__def("src/scenes/settings.js", function (__exports, __req) {
__exp(__exports, { "SettingsScene": () => SettingsScene });
// =============================================================================
//  Settings: volumes, feel options, tutorial, reset, help & credits.
// =============================================================================
const { Modal } = __req("src/engine/scene.js");
const { Button, Slider, Toggle, text, panel, para, COL } = __req("src/engine/ui.js");
const { Save } = __req("src/engine/storage.js");
const { CFG } = __req("src/config.js");
const { MenuScene, showHomeScreenHelp, showExternalHelp, installApp } = __req("src/scenes/common.js");
const { Display } = __req("src/engine/display.js");

const SETTING_ROWS = [160, 214, 268, 322, 376, 430, 484];

class SettingsScene extends MenuScene {
  constructor(game) { super(game, '설정', 'purple'); }
  enter() { this.build(); }
  layout() { this.build(); }
  build() {
    const W = this.W, st = Save.data.settings;
    this.ui.clear();
    this.chrome();
    const lw = Math.min(560, W * 0.46), lx = 40;
    this.left = { x: lx, y: 108, w: lw, h: 580 };
    const cx = lx + 200;
    const save = () => { Save.save(); this.game.applySettings(); };
    const R = SETTING_ROWS;
    this.ui.add(new Slider({ x: cx, y: R[0], w: lw - 290, value: st.music, color: 'pink', onChange: (v) => { st.music = v; save(); } }));
    this.ui.add(new Slider({ x: cx, y: R[1], w: lw - 290, value: st.sfx, color: 'blue', onChange: (v) => { st.sfx = v; save(); this.game.audio.play('jelly', { rate: 1.3 }); } }));
    this.ui.add(new Toggle({ x: cx, y: R[2] - 23, value: st.shake, onChange: (v) => { st.shake = v; save(); } }));
    this.ui.add(new Toggle({ x: cx, y: R[3] - 23, value: st.vibrate, onChange: (v) => { st.vibrate = v; save(); } }));
    this.ui.add(new Toggle({ x: cx, y: R[4] - 23, value: st.touch !== 'off', onChange: (v) => { st.touch = v ? 'auto' : 'off'; save(); } }));
    this.ui.add(new Toggle({ x: cx, y: R[5] - 23, value: st.quality === 'high', onChange: (v) => { st.quality = v ? 'high' : 'normal'; save(); } }));
    // fullscreen: a real toggle where the Fullscreen API works, otherwise the right kind of help
    const mode = Display.mode, fy = R[6];
    this.fsNote = null;
    if (mode === 'toggle') {
      this.ui.add(new Toggle({ x: cx, y: fy - 23, value: Display.isFullscreen, onChange: (v) => {
        st.autoFS = v; Save.save();
        if (v) Display.enterSoon((ok) => { if (!ok) { this.game.toast('이 브라우저에서는 전체 화면을 쓸 수 없어요', { icon: 'info' }); this.build(); } });
        else Display.exit();
      } }));
    } else if (mode === 'help') {
      this.ui.add(new Button({ x: cx, y: fy - 24, w: 176, h: 48, label: '방법 보기', icon: 'share', iconSize: 30, color: 'blue', size: 19, onClick: () => showHomeScreenHelp(this.game) }));
    } else if (mode === 'external') {
      this.ui.add(new Button({ x: cx, y: fy - 24, w: 176, h: 48, label: '브라우저로', icon: 'fullscreen', iconSize: 30, color: 'blue', size: 19, onClick: () => showExternalHelp(this.game) }));
    } else {
      this.fsNote = Display.standalone ? '앱으로 실행 중 ✓' : '여기서는 쓸 수 없어요';
    }
    if (Display.canInstall) {
      const ix = cx + (mode === 'toggle' ? 108 : 190);
      this.ui.add(new Button({ x: ix, y: fy - 24, w: Math.max(150, lx + lw - 24 - ix), h: 48, label: '앱 설치', icon: 'addhome', iconSize: 30, color: 'green', size: 19, onClick: () => installApp(this.game) }));
    }
    const bw = (lw - 72) / 2;
    this.ui.add(new Button({ x: lx + 24, y: 560, w: bw, h: 76, label: '튜토리얼 다시', icon: 'info', color: 'blue', size: 21,
      onClick: () => { Save.data.tutorial = false; Save.save(); this.game.toast('다음 달리기에서 튜토리얼이 나와요!', { icon: 'info' }); } }));
    this.ui.add(new Button({ x: lx + 48 + bw, y: 560, w: bw, h: 76, label: '데이터 초기화', icon: 'retry', color: 'red', size: 21,
      onClick: () => this.game.scenes.modal(new Modal(this.game, {
        title: '데이터 초기화', color: 'red', height: 340,
        message: '코인, 캐릭터, 펫, 연구소, 미션 기록이\n모두 처음으로 돌아가요. 정말 할까요?',
        buttons: [{ label: '취소', color: 'grey', key: ['back'] }, { label: '초기화', color: 'red', onClick: () => { Save.reset(); this.game.applySettings(); this.game.toast('처음부터 다시 시작해요!', { icon: 'retry' }); this.game.goTitle(); } }],
      })) }));
  }
  render(ctx) {
    const W = this.W;
    this.drawBg(ctx);
    const L = this.left;
    panel(ctx, L.x, L.y, L.w, L.h, { r: 30 });
    const labels = ['배경음', '효과음', '화면 흔들림', '진동 (모바일)', '터치 버튼 표시', '고화질 그래픽', '전체 화면'];
    labels.forEach((label, i) => text(ctx, label, L.x + 36, SETTING_ROWS[i], { size: 22, align: 'left', color: COL.ink }));
    if (this.fsNote) text(ctx, this.fsNote, L.x + 200, SETTING_ROWS[6], { size: 18, font: 'bold', align: 'left', color: COL.ink2 });
    const rx = L.x + L.w + 24, rw = W - rx - 40;
    panel(ctx, rx, 108, rw, 580, { r: 30, fill: '#fffaf3', fill2: '#efe4ff' });
    text(ctx, '조작 방법', rx + rw / 2, 146, { size: 28, color: COL.purpleD, stroke: '#fff', sw: 4 });
    const help = [
      '점프 · 화면 왼쪽 탭 / Space · ↑ · W',
      '더블 점프 · 공중에서 한 번 더',
      '슬라이드 · 화면 오른쪽 꾹 / ↓ · S · Shift',
      '빨리 내려오기 · 공중에서 슬라이드',
      '일시 정지 · Esc · P',
      '게임패드 · A 점프, B 슬라이드',
      '전체 화면 · 로비·일시 정지의 전체 화면 버튼',
    ];
    help.forEach((h, i) => text(ctx, h, rx + 34, 192 + i * 36, { size: 19, font: 'bold', align: 'left', color: COL.ink, maxW: rw - 60 }));
    text(ctx, '게임 정보', rx + rw / 2, 462, { size: 24, color: COL.purpleD, stroke: '#fff', sw: 4 });
    para(ctx, `디저트 대시 v${CFG.VERSION} · 프로젝트 kukirun\n모든 캐릭터·그림·음악·효과음은 이 게임을 위해 새로 만든 오리지널 작품이에요.\n글꼴: Noto Sans CJK KR, Poppins (SIL Open Font License)`, rx + 34, 488, rw - 68, { size: 16, color: COL.ink2, lh: 25 });
    if (!Save.available) text(ctx, '※ 이 브라우저에서는 저장이 꺼져 있어요', rx + rw / 2, 660, { size: 16, font: 'bold', color: COL.redD });
    this.ui.draw(ctx);
    this.drawChrome(ctx);
  }
}

});

// ---- src/game/world.js
__def("src/game/world.js", function (__exports, __req) {
__exp(__exports, { "World": () => World, "PICK": () => PICK });
// =============================================================================
//  World: terrain (ground segments with pits, floating platforms) and entities
//  (obstacles, pickups, springs, decorations, signs). Rendering included.
// =============================================================================
const { CFG } = __req("src/config.js");
const { Assets } = __req("src/engine/assets.js");
const { rgba, TAU } = __req("src/engine/util.js");

const GY = CFG.GROUND_Y;
const OVER_Y = CFG.OVERHEAD_Y;

const PICK = {
  jelly: { sprite: 'jelly', r: 13, score: 'jelly' },
  jelly_pink: { sprite: 'jelly_pink', r: 15, score: 'jelly_pink' },
  jelly_star: { sprite: 'jelly_star', r: 20, score: 'jelly_star' },
  jelly_choco: { sprite: 'jelly_choco', r: 16, score: 'jelly_choco' },
  jelly_big: { sprite: 'jelly_big', r: 34, score: 'jelly_big' },
  jelly_rainbow: { sprite: 'jelly_rainbow', r: 40, score: 'jelly_rainbow' },
  jelly_giant: { sprite: 'jelly_giant', r: 68, score: 'jelly_giant' },
  coin_s: { anim: 'coin_s', r: 15, coin: 's' },
  coin_g: { anim: 'coin_g', r: 17, coin: 'g' },
  coin_b: { anim: 'coin_b', r: 30, coin: 'b' },
  milk_s: { sprite: 'milk_s', r: 24, milk: 's' },
  milk_l: { sprite: 'milk_l', r: 30, milk: 'l' },
  pw: { r: 30 },
  letter: { r: 27 },
};
const COIN_FRAMES = {
  coin_s: ['coin_s0', 'coin_s1', 'coin_s2', 'coin_s3', 'coin_s4', 'coin_s5'],
  coin_g: ['coin_g0', 'coin_g1', 'coin_g2', 'coin_g3', 'coin_g4', 'coin_g5'],
  coin_b: ['coin_b0', 'coin_b1', 'coin_b2', 'coin_b3', 'coin_b4', 'coin_b5'],
};

class World {
  constructor() {
    this.ground = [];   // {x0, x1, land}
    this.plats = [];    // {x, y, w, land}
    this.obs = [];
    this.picks = [];
    this.springs = [];
    this.decos = [];
    this.signs = [];
    this.genX = 0;
    this.lettersInFlight = new Set();
  }

  // ---------------------------------------------------------------- building
  addGround(x0, x1, land) {
    if (x1 - x0 < 1) return;
    const last = this.ground[this.ground.length - 1];
    if (last && Math.abs(last.x1 - x0) < 0.5 && last.land === land) { last.x1 = Math.max(last.x1, x1); return; }
    this.ground.push({ x0, x1, land });
  }
  addPlat(x, y, w, land) { this.plats.push({ x, y, w, land }); }
  addPick(kind, x, y, extra) {
    const def = PICK[kind.startsWith('pw:') ? 'pw' : kind];
    const p = { kind, x, y, r: def ? def.r : 14, taken: false, mag: false, vx: 0, vy: 0, ph: (x * 0.013) % TAU, born: 0, fall: false, ...extra };
    this.picks.push(p);
    if (kind === 'letter') this.lettersInFlight.add(p.idx);
    return p;
  }
  addObstacle(kind, x, land, extra = {}) {
    const o = { kind, x, y: GY, land, w: 0, state: 'idle', t: 0, smashed: false, vx: 0, vy: 0, rot: 0, vr: 0, hit: { x: 0, y: 0, w: 0, h: 0 }, tutorial: null, ...extra };
    const info = Assets.meta('obs_' + land)?.info || {};
    if (kind === 'hang') { o.y = OVER_Y; }
    else if (kind === 'beam') { o.y = OVER_Y; }
    else if (kind === 'fall') { o.state = 'hanging'; o.y = 150; }
    else if (kind === 'pop') { o.state = 'hidden'; }
    o.hdef = (info[kind === 'pop' ? 'pop1' : kind] || {}).hit || { x: -22, y: -58, w: 44, h: 58 };
    this.updateHit(o);
    this.obs.push(o);
    return o;
  }
  updateHit(o) {
    const h = o.hit;
    if (o.kind === 'hang') { h.x = o.x + o.hdef.x; h.w = o.hdef.w; h.y = -400; h.h = OVER_Y + o.hdef.y + o.hdef.h + 400; }
    else if (o.kind === 'beam') { h.x = o.x + 4; h.w = o.w - 8; h.y = -400; h.h = OVER_Y - 6 + 400; }
    else { h.x = o.x + o.hdef.x; h.y = o.y + o.hdef.y; h.w = o.hdef.w; h.h = o.hdef.h; }
  }
  addSpring(x, land) { this.springs.push({ x, land, t: 0 }); }
  addDeco(x, name, land, s = 0.8) { this.decos.push({ x, name, land, s }); }
  addSign(x, landIdx, land, label) { this.signs.push({ x, landIdx, land, label }); }

  // ---------------------------------------------------------------- queries
  groundAt(x, halfW = 14) {
    for (const g of this.ground) {
      if (g.x0 > x + halfW) break;
      if (g.x1 >= x - halfW) return g;
    }
    return null;
  }
  segmentAt(x) {
    for (const g of this.ground) { if (g.x0 > x) break; if (g.x1 >= x) return g; }
    return null;
  }
  /** Platform the feet land on while moving from prevY to y (one-way). */
  platformLanding(x, halfW, prevY, y) {
    for (const p of this.plats) {
      if (p.x > x + halfW) continue;
      if (p.x + p.w < x - halfW) continue;
      if (prevY <= p.y + 6 && y >= p.y) return p;
    }
    return null;
  }
  platformUnder(x, halfW, y) {
    for (const p of this.plats) {
      if (p.x <= x + halfW && p.x + p.w >= x - halfW && Math.abs(y - p.y) < 2) return p;
    }
    return null;
  }
  /** Surface height directly below (x, fromY) — ground or platform, else null. */
  surfaceBelow(x, fromY = 0) {
    let best = null;
    for (const p of this.plats) if (p.x <= x && p.x + p.w >= x && p.y >= fromY && (best === null || p.y < best)) best = p.y;
    if (this.groundAt(x, 0) && (best === null || GY < best) && GY >= fromY) best = GY;
    return best;
  }

  // ---------------------------------------------------------------- upkeep
  cull(minX) {
    const keep = (arr, xOf) => { let i = 0; while (i < arr.length && xOf(arr[i]) < minX) i++; if (i) arr.splice(0, i); };
    keep(this.ground, (g) => g.x1);
    keep(this.plats, (p) => p.x + p.w);
    keep(this.springs, (s) => s.x + 60);
    keep(this.decos, (d) => d.x + 140);
    keep(this.signs, (s) => s.x + 200);
    this.obs = this.obs.filter((o) => (o.kind === 'beam' ? o.x + o.w : o.x + 150) >= minX && !(o.smashed && o.t > 2.5));
    const before = this.picks.length;
    this.picks = this.picks.filter((p) => {
      const keepIt = !p.taken && p.x >= minX - 40 && p.y < 1400;
      if (!keepIt && p.kind === 'letter') this.lettersInFlight.delete(p.idx);
      return keepIt || (p.taken && p.t < 0.5);
    });
    return before - this.picks.length;
  }

  // ---------------------------------------------------------------- render
  renderDecos(ctx, camX, W) {
    for (const d of this.decos) {
      const x = d.x - camX;
      if (x < -150 || x > W + 150) continue;
      Assets.draw(ctx, 'obs_' + d.land, d.name, x, GY + 4, { scale: d.s });
    }
    for (const s of this.signs) {
      const x = s.x - camX;
      if (x < -200 || x > W + 200) continue;
      const id = 'obs_' + s.land;
      Assets.draw(ctx, id, 'sign', x, GY + 2);
      const b = Assets.meta(id)?.info?.sign?.board;
      if (b) {
        const sz = Assets.size(id, 'sign');
        const bx = x - sz.ax + b.x / 2, by = GY + 2 - sz.ay + b.y / 2, bw = b.w / 2, bh = b.h / 2;
        ctx.save();
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillStyle = '#4a2a1a';
        ctx.font = '700 15px "DDNum", sans-serif';
        ctx.fillText(s.label[0], bx + bw / 2, by + bh * 0.3);
        ctx.font = '900 16px "DDDisplay", sans-serif';
        ctx.fillText(s.label[1], bx + bw / 2, by + bh * 0.68, bw - 8);
        ctx.restore();
      }
    }
  }

  renderGround(ctx, camX, W, bridge = 0) {
    const x0v = camX - 80, x1v = camX + W + 80;
    // pits: soft dark gradient for depth
    for (let i = 0; i <= this.ground.length; i++) {
      const a = this.ground[i - 1], b = this.ground[i];
      const px0 = a ? a.x1 : -1e9, px1 = b ? b.x0 : 1e12;
      if (px1 - px0 < 2 || px1 < x0v || px0 > x1v) continue;
      const land = (b || a)?.land || 'meadow';
      const pitCol = Assets.meta('ground_' + land)?.pit || '#3a2018';
      const sx0 = Math.max(px0, x0v) - camX, sx1 = Math.min(px1, x1v) - camX;
      const g = ctx.createLinearGradient(0, GY - 6, 0, 720);
      g.addColorStop(0, rgba(pitCol, 0)); g.addColorStop(0.07, rgba(pitCol, 0.7)); g.addColorStop(0.45, rgba(pitCol, 0.96)); g.addColorStop(1, rgba(pitCol, 1));
      ctx.fillStyle = g; ctx.fillRect(sx0, GY - 6, sx1 - sx0, 720 - GY + 6);
      // inner shadow on both walls for depth
      const wsh = Math.min(26, (sx1 - sx0) / 3);
      for (const [x, dir] of [[sx0, 1], [sx1, -1]]) {
        const sg = ctx.createLinearGradient(x, 0, x + dir * wsh, 0);
        sg.addColorStop(0, 'rgba(0,0,0,0.35)'); sg.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = sg; ctx.fillRect(Math.min(x, x + dir * wsh), GY, wsh, 720 - GY);
      }
      if (bridge > 0) { // magic sugar bridge while protected
        ctx.save(); ctx.globalAlpha = 0.55 * bridge;
        const bg = ctx.createLinearGradient(0, GY - 6, 0, GY + 16);
        bg.addColorStop(0, '#fff6c8'); bg.addColorStop(1, 'rgba(255,200,240,0)');
        ctx.fillStyle = bg; ctx.fillRect(sx0, GY - 4, sx1 - sx0, 20);
        ctx.restore();
      }
    }
    for (let i = 0; i < this.ground.length; i++) {
      const g = this.ground[i];
      if (g.x1 < x0v) continue;
      if (g.x0 > x1v) break;
      const id = 'ground_' + g.land;
      const fr = Assets.frame(id, 0);
      if (!fr) continue;
      const tw = fr.sw / fr.s, th = fr.sh / fr.s, top = GY - 18;
      const sx0 = Math.max(g.x0, x0v), sx1 = Math.min(g.x1, x1v);
      ctx.save();
      ctx.beginPath(); ctx.rect(sx0 - camX, top - 40, sx1 - sx0, th + 60); ctx.clip();
      const k0 = Math.floor(sx0 / tw);
      for (let k = k0; k * tw < sx1; k++) ctx.drawImage(fr.img, fr.sx, fr.sy, fr.sw, fr.sh, k * tw - camX, top, tw + 0.5, th);
      ctx.restore();
      const prev = this.ground[i - 1], next = this.ground[i + 1];
      const capId = 'groundcap_' + g.land;
      if (Assets.has(capId)) {
        if (!prev || prev.x1 < g.x0 - 1) Assets.draw(ctx, capId, 'left', g.x0 - camX, GY);
        if (!next || next.x0 > g.x1 + 1) { if (next || g.x1 < this.genX - 2) Assets.draw(ctx, capId, 'right', g.x1 - camX, GY); }
      }
    }
  }

  renderPlats(ctx, camX, W) {
    for (const p of this.plats) {
      const x = p.x - camX;
      if (x > W + 50 || x + p.w < -50) continue;
      const id = 'plat_' + p.land;
      if (!Assets.has(id)) { ctx.fillStyle = '#c98a4b'; ctx.fillRect(x, p.y, p.w, 30); continue; }
      const y = p.y;
      Assets.draw(ctx, id, 'left', x, y);
      const mids = Math.round((p.w - 80) / 64);
      for (let i = 0; i < mids; i++) Assets.draw(ctx, id, 'mid', x + 40 + i * 64, y);
      Assets.draw(ctx, id, 'right', x + 40 + mids * 64, y);
    }
  }

  renderSprings(ctx, camX, W) {
    for (const s of this.springs) {
      const x = s.x - camX;
      if (x < -100 || x > W + 100) continue;
      Assets.draw(ctx, 'obs_common', s.t > 0 ? 'spring1' : 'spring0', x, GY + 2);
    }
  }

  renderObstacles(ctx, camX, W, time) {
    for (const o of this.obs) {
      const id = 'obs_' + o.land;
      const sx = o.x - camX;
      if (o.kind === 'beam') { if (sx > W + 60 || sx + o.w < -60) continue; }
      else if (sx < -160 || sx > W + 160) continue;
      if (o.smashed) {
        const a = Math.max(0, 1 - o.t / 1.4);
        if (o.kind === 'beam') continue;
        Assets.draw(ctx, id, o.kind === 'pop' ? 'pop1' : o.kind, sx + o.vx * 0 , o.y, { rot: o.rot, alpha: a });
        continue;
      }
      switch (o.kind) {
        case 'hang': {
          const head = Assets.size(id, 'hang');
          const topY = o.y - head.h + 4;
          const ch = Assets.size(id, 'chain');
          const sway = Math.sin(time * 2 + o.x * 0.01) * 0.0;
          for (let y = topY; y > -ch.h; y -= ch.h - 1) Assets.draw(ctx, id, 'chain', sx + sway, y);
          Assets.draw(ctx, id, 'hang', sx, o.y);
          break;
        }
        case 'beam': {
          const n = Math.max(1, Math.round(o.w / 128));
          const ch = Assets.size(id, 'chain');
          const bh = Assets.size(id, 'beam').h;
          for (const cxp of [sx + 30, sx + o.w - 30]) for (let y = o.y - bh + 10; y > -ch.h; y -= ch.h - 1) Assets.draw(ctx, id, 'chain', cxp, y);
          for (let i = 0; i < n; i++) Assets.draw(ctx, id, 'beam', sx + i * 128, o.y);
          break;
        }
        case 'fall': {
          let jx = 0;
          if (o.state === 'shake') jx = Math.sin(time * 70) * 3;
          if (o.state === 'hanging' || o.state === 'shake') {
            // short tether to the top
            ctx.save(); ctx.strokeStyle = 'rgba(74,42,26,0.7)'; ctx.lineWidth = 3;
            ctx.beginPath(); ctx.moveTo(sx, -10); ctx.lineTo(sx + jx, o.y - Assets.size(id, 'fall').h + 8); ctx.stroke(); ctx.restore();
            // warning shadow on the ground
            ctx.save(); ctx.globalAlpha = 0.25 + (o.state === 'shake' ? 0.25 : 0);
            ctx.fillStyle = '#2a1018'; ctx.beginPath(); ctx.ellipse(sx, GY - 2, 34, 8, 0, 0, TAU); ctx.fill(); ctx.restore();
          }
          Assets.draw(ctx, id, 'fall', sx + jx, o.y);
          break;
        }
        case 'pop': {
          if (o.state === 'hidden') {
            const pulse = 0.5 + 0.5 * Math.sin(time * 9 + o.x);
            Assets.draw(ctx, id, 'pop0', sx, GY + 2);
            ctx.save(); ctx.globalAlpha = 0.18 + 0.2 * pulse; ctx.globalCompositeOperation = 'lighter';
            ctx.fillStyle = '#bfefff'; ctx.beginPath(); ctx.ellipse(sx, GY - 6, 34, 10, 0, 0, TAU); ctx.fill(); ctx.restore();
          } else {
            const k = Math.min(1, o.t / 0.12);
            Assets.draw(ctx, id, 'pop1', sx, GY + 2, { sy: 0.3 + 0.7 * k + (k >= 1 ? Math.max(0, 0.15 - (o.t - 0.12)) : 0) });
          }
          break;
        }
        default:
          Assets.draw(ctx, id, o.kind, sx, o.y + 2);
      }
    }
  }

  renderPicks(ctx, camX, W, time, rushStyle = false) {
    for (const p of this.picks) {
      const x = p.x - camX;
      if (x < -80 || x > W + 80) continue;
      let y = p.y;
      if (p.taken) {
        const k = p.t / 0.35;
        if (k >= 1) continue;
        this.drawPick(ctx, p, x, y - k * 26, time, 1 - k, 1 + k * 0.6);
        continue;
      }
      if (!p.mag && !p.fall) y += Math.sin(time * 3.2 + p.ph) * (p.kind.startsWith('pw:') || p.kind === 'letter' || p.kind.startsWith('milk') ? 5 : 1.6);
      let a = 1;
      if (p.born > 0) a = Math.min(1, p.born);
      this.drawPick(ctx, p, x, y, time, a, p.born > 0 ? 0.4 + 0.6 * Math.min(1, p.born) : 1);
    }
  }

  drawPick(ctx, p, x, y, time, alpha = 1, scale = 1) {
    const k = p.kind;
    if (COIN_FRAMES[k]) {
      const fr = COIN_FRAMES[k];
      const f = fr[Math.floor((time * (k === 'coin_b' ? 10 : 12) + p.ph * 3) % fr.length)];
      Assets.draw(ctx, 'items', f, x, y, { alpha, scale });
      return;
    }
    if (k.startsWith('pw:')) {
      const name = 'pw_' + k.slice(3);
      const pulse = 1 + Math.sin(time * 6 + p.ph) * 0.05;
      Assets.draw(ctx, 'fx', 'glow', x, y, { scale: 0.62 * pulse * scale, alpha: 0.65 * alpha, add: true });
      Assets.draw(ctx, 'items', name, x, y, { alpha, scale: pulse * scale });
      return;
    }
    if (k === 'letter') {
      const pulse = 1 + Math.sin(time * 5 + p.ph) * 0.06;
      Assets.draw(ctx, 'fx', 'glow', x, y, { scale: 0.55 * scale, alpha: 0.6 * alpha, add: true });
      Assets.draw(ctx, 'items', 'letter_' + p.idx, x, y, { alpha, scale: pulse * scale });
      return;
    }
    if (k === 'milk_l') Assets.draw(ctx, 'fx', 'glow', x, y, { scale: 0.6 * scale, alpha: 0.5 * alpha, add: true });
    if (k === 'jelly_giant' || k === 'jelly_rainbow') Assets.draw(ctx, 'fx', 'glow_gold', x, y, { scale: (k === 'jelly_giant' ? 1.1 : 0.6) * scale, alpha: 0.55 * alpha, add: true });
    const def = PICK[k];
    Assets.draw(ctx, 'items', def ? def.sprite : 'jelly', x, y, alpha === 1 && scale === 1 ? undefined : { alpha, scale });
  }
}

});

// ---- src/game/chunks.js
__def("src/game/chunks.js", function (__exports, __req) {
__exp(__exports, { "simPath": () => simPath, "Builder": () => Builder, "PATTERNS": () => PATTERNS, "PATTERN": () => PATTERN });
// =============================================================================
//  Level chunks: a physics-aware builder (jelly arcs follow the real jump path
//  at the current speed) and the library of hand-designed patterns.
// =============================================================================
const { CFG } = __req("src/config.js");
const { clamp } = __req("src/engine/util.js");

const G = CFG.GRAVITY, J = CFG.JUMP_V, DJ = CFG.DJUMP_V, GY = CFG.GROUND_Y;
const LIFT = CFG.ARC_LIFT;

/** Simulate a ballistic runner path. Returns points {t,x,y} until feet reach landY descending. */
function simPath(x0, y0, v, vy0, landY = GY, td = null) {
  const dt = 1 / 240;
  const pts = [{ t: 0, x: x0, y: y0 }];
  let t = 0, x = x0, y = y0, vy = vy0, dbl = td == null;
  for (let i = 0; i < 2400; i++) {
    if (!dbl && t >= td) { vy = -DJ; dbl = true; }
    vy = Math.min(vy + G * dt, CFG.MAX_FALL);
    y += vy * dt; x += v * dt; t += dt;
    if (vy > 0 && y >= landY) { pts.push({ t, x, y: landY }); break; }
    pts.push({ t, x, y });
  }
  return pts;
}
function yAtX(path, x) {
  let lo = 0, hi = path.length - 1;
  if (x <= path[0].x) return path[0].y;
  if (x >= path[hi].x) return path[hi].y;
  while (hi - lo > 1) { const m = (lo + hi) >> 1; if (path[m].x < x) lo = m; else hi = m; }
  const a = path[lo], b = path[hi];
  return a.y + (b.y - a.y) * ((x - a.x) / (b.x - a.x || 1));
}
function apexOf(path) { let best = path[0]; for (const p of path) if (p.y < best.y) best = p; return best; }

const SHAPES = {
  heart: ['.##.##.', '#######', '#######', '.#####.', '..###..', '...#...'],
  star: ['...#...', '..###..', '#######', '.#####.', '.##.##.', '#.....#'],
  diamond: ['..#..', '.###.', '#####', '.###.', '..#..'],
  smile: ['.#...#.', '.......', '#.....#', '.#...#.', '..###..'],
  arrow: ['..#..', '...#.', '#####', '...#.', '..#..'],
};

class Builder {
  constructor(world, x, speed, land, rand, opts = {}) {
    this.world = world; this.x = x; this.start = x; this.v = speed; this.land = land; this.r = rand;
    this.sy = GY; this.gOpen = x; this.slots = []; this.opts = opts;
    this.jellyKind = opts.jellyKind || 'mix';
    this.n = 0; // jelly counter for mixing
    this.hasHazard = false;
    this.tutorial = null;
  }
  // ----------------------------------------------------------------- terrain
  closeGround(x) { if (this.gOpen !== null) { if (x > this.gOpen) this.world.addGround(this.gOpen, x, this.land); this.gOpen = null; } }
  openGround(x) { if (this.gOpen === null) this.gOpen = x; }
  finish() {
    this.closeGround(this.x);
    this.world.genX = this.x;
    return { start: this.start, end: this.x, slots: this.slots, hazard: this.hasHazard };
  }
  // ----------------------------------------------------------------- content
  kindAt() {
    this.n++;
    const k = this.jellyKind;
    if (k === 'mix') return this.n % 7 === 0 ? 'jelly_pink' : 'jelly';
    if (k === 'pinkmix') return this.n % 3 === 0 ? 'jelly' : 'jelly_pink';
    return k;
  }
  jelly(x, y, kind) { return this.world.addPick(kind || this.kindAt(), x, y); }
  line(x0, x1, y, kind, gap = CFG.JELLY_GAP) { for (let x = x0; x <= x1 + 0.1; x += gap) this.jelly(x, y, kind); }
  slot(x, y) { this.slots.push({ x, y }); }
  arc(path, o = {}) {
    const gap = o.gap ?? CFG.JELLY_GAP;
    const x0 = path[0].x + gap * (o.skip0 ?? 1), x1 = path[path.length - 1].x - gap * (o.skip1 ?? 0.5);
    const apex = apexOf(path);
    let bestStar = null;
    for (let x = x0; x <= x1; x += gap) {
      const y = yAtX(path, x) - LIFT;
      const nearApex = Math.abs(x - apex.x) < gap * 0.5;
      const kind = nearApex && o.apexKind ? o.apexKind : (o.kind || this.kindAt());
      const p = this.jelly(x, y, kind);
      if (nearApex) bestStar = p;
    }
    if (o.slot !== false) this.slot(apex.x, apex.y - LIFT);
    return bestStar;
  }
  obstacle(kind, x, extra = {}) {
    this.hasHazard = true;
    const o = this.world.addObstacle(kind, x, this.land, extra);
    if (this.tutorial) { o.tutorial = this.tutorial; this.tutorial = null; }
    return o;
  }
  // ----------------------------------------------------------------- moves
  /** Flat running for t seconds with a jelly line. o: { kind, coins, empty, deco } */
  run(t, o = {}) {
    const len = Math.max(0, t * this.v);
    const y = this.sy - (GY - CFG.JELLY_Y);
    if (!o.empty) {
      if (!o.kind && !o.wave && !o.coins && this.coinChance && len > 160 && this.r() < this.coinChance) o = { ...o, coins: true };
      if (o.coins) {
        let i = 0;
        for (let x = this.x + 20; x <= this.x + len - 10; x += 46) { this.world.addPick(i % 4 === 3 ? 'coin_g' : 'coin_s', x, y - 2); i++; }
      } else if (o.wave) {
        let i = 0;
        for (let x = this.x + 20; x <= this.x + len - 10; x += CFG.JELLY_GAP) { this.jelly(x, y - 34 - Math.sin(i * 0.55) * 32, o.kind); i++; }
      } else this.line(this.x + 20, this.x + len - 10, y, o.kind);
    }
    if (len > 0.35 * this.v && this.sy === GY) this.slot(this.x + len * 0.5, y);
    if (o.deco !== false && this.sy === GY && len > 180 && this.r() < 0.55) {
      this.world.addDeco(this.x + this.r.range(40, len - 40), 'deco' + this.r.int(0, 7), this.land, this.r.range(0.68, 0.86));
    }
    this.x += len;
    return this;
  }
  /** Single jump over a ground obstacle (low | low2 | fall | pop). */
  hop(type = 'low', o = {}) {
    const path = simPath(this.x, GY, this.v, -J, GY);
    const apex = apexOf(path);
    this.obstacle(type, apex.x + (o.shift || 0));
    this.arc(path, { apexKind: o.apexKind || (this.r() < 0.5 ? 'jelly_star' : null), kind: o.kind });
    this.x = path[path.length - 1].x;
    return this;
  }
  /** Double jump over a tall obstacle. */
  dhop(type = 'tall', o = {}) {
    const td = o.td ?? 0.27;
    const path = simPath(this.x, GY, this.v, -J, GY, td);
    const apex = apexOf(path);
    this.obstacle(type, apex.x - this.v * 0.02);
    this.arc(path, { apexKind: 'jelly_star', kind: o.kind });
    this.x = path[path.length - 1].x;
    return this;
  }
  /** Slide under hanging obstacles for t seconds. */
  duck(t, o = {}) {
    let len = Math.max(66, t * this.v);
    const lead = 40;
    const x0 = this.x + lead;
    if (len <= 100 && !o.beam) { len = 70; this.obstacle('hang', x0 + 35); }
    else { const w = Math.max(2, Math.round(len / 128)) * 128; len = w; this.obstacle('beam', x0, { w }); }
    this.line(this.x + 10, x0 + len + 40, CFG.SLIDE_JELLY_Y, o.kind || 'jelly');
    this.slot(x0 + len / 2, CFG.SLIDE_JELLY_Y);
    this.x = x0 + len + 50;
    return this;
  }
  /** Jump over a pit lasting about t seconds of flight. */
  leap(t, o = {}) {
    const path = simPath(this.x, GY, this.v, -J, GY);
    const L = path[path.length - 1].x - this.x;
    const w = clamp(t * this.v, 90, L - 0.22 * this.v);
    const p0 = this.x + (L - w) / 2;
    this.closeGround(p0); this.openGround(p0 + w);
    this.hasHazard = true;
    if (this.tutorial) { this.world.tutorialPits = this.world.tutorialPits || []; this.world.tutorialPits.push({ x: p0, kind: this.tutorial }); this.tutorial = null; }
    this.arc(path, { apexKind: 'jelly_star', kind: o.kind });
    this.x += L;
    return this;
  }
  /** Long pit that needs a double jump. */
  dleap(t, o = {}) {
    const td = 0.3;
    const path = simPath(this.x, GY, this.v, -J, GY, td);
    const L = path[path.length - 1].x - this.x;
    const w = clamp(t * this.v, 150, L - 0.32 * this.v);
    const p0 = this.x + (L - w) * 0.42;
    this.closeGround(p0); this.openGround(p0 + w);
    this.hasHazard = true;
    this.arc(path, { apexKind: 'jelly_big', kind: o.kind });
    this.x += L;
    return this;
  }
  /** Bounce pad launching a big arc. */
  spring(o = {}) {
    const sx = this.x + 40;
    this.world.addSpring(sx, this.land);
    this.line(this.x + 10, sx - 20, CFG.JELLY_Y);
    const path = simPath(sx, GY, this.v, -CFG.SPRING_V, GY);
    const L = path[path.length - 1].x - sx;
    if (o.pit) { const w = L * 0.55; const p0 = sx + L * 0.24; this.closeGround(p0); this.openGround(p0 + w); this.hasHazard = true; }
    this.arc(path, { kind: 'jelly_star', apexKind: o.apexKind || 'jelly_big', gap: 46 });
    if (o.coins) { const a = apexOf(path); for (let i = -2; i <= 2; i++) this.world.addPick('coin_g', a.x + i * 44, a.y - LIFT - 56 - Math.abs(i) * -8); }
    this.x = path[path.length - 1].x;
    return this;
  }
  /** Jump up onto a floating platform at height h above the ground, run on it for t seconds. o: { pit } */
  stepUp(h, t, o = {}) {
    const top = GY - h;
    const path = simPath(this.x, this.sy, this.v, -J, top);
    const land = path[path.length - 1].x;
    const px = land - 46;
    const w = Math.max(144, Math.round((t * this.v + 46) / 64) * 64 + 16);
    this.world.addPlat(px, top, w, this.land);
    if (o.pit) { this.closeGround(this.x + 0.2 * this.v); this.hasHazard = true; }
    this.arc(path, { kind: o.arcKind, skip1: 0.2 });
    this.x = land;
    this.sy = top;
    const y = top - (GY - CFG.JELLY_Y);
    this.line(this.x + 18, px + w - 16, y, o.kind || 'jelly_star', 46);
    this.slot((this.x + px + w) / 2, y);
    this.platEnd = px + w;
    this.x = px + w - 26; // take-off point a little before the edge
    return this;
  }
  /** Leave a platform: falls (or hops) back to the ground. o: { pitEnd, hop } */
  stepDown(o = {}) {
    if (!o.hop && this.platEnd) this.x = this.platEnd;
    this.platEnd = null;
    const path = simPath(this.x, this.sy, this.v, o.hop ? -J : 0, GY);
    const land = path[path.length - 1].x;
    if (o.pitEnd) this.openGround(land - 0.16 * this.v);
    this.arc(path, { kind: o.kind, skip0: o.hop ? 1 : 0.5, slot: false });
    this.x = land; this.sy = GY;
    return this;
  }
  /** A jelly picture floating in the air at the apex of a jump. */
  airShape(name, kind = 'jelly_pink', o = {}) {
    const rows = SHAPES[name];
    const path = simPath(this.x, GY, this.v, -J, GY);
    const apex = apexOf(path);
    const gap = 24, h = rows.length, w = rows[0].length;
    const cx = apex.x, cy = apex.y - LIFT - 10;
    rows.forEach((row, j) => { for (let i = 0; i < w; i++) if (row[i] === '#') this.world.addPick(kind, cx + (i - (w - 1) / 2) * gap, cy + (j - (h - 1) / 2) * gap); });
    this.arc(path, { kind: 'jelly', slot: false });
    this.x = path[path.length - 1].x;
    return this;
  }
  coins(t) { return this.run(t, { coins: true }); }
}

// =============================================================================
//  Pattern library. d = difficulty 0..5, need = required land special.
// =============================================================================
const PATTERNS = [
  // breathers / rewards (d 0)
  { id: 'jelly_wave', d: 0, reward: true, fn: (b) => { b.run(0.4); b.run(1.0, { wave: true, kind: 'jelly_pink' }); b.run(0.3); } },
  { id: 'coin_road', d: 0, reward: true, fn: (b) => { b.run(0.3); b.coins(1.1); b.run(0.3); } },
  { id: 'heart_jump', d: 0, reward: true, fn: (b) => { b.run(0.45); b.airShape('heart'); b.run(0.35); b.airShape('star', 'jelly_star'); b.run(0.4); } },
  { id: 'spring_star', d: 0.5, reward: true, fn: (b) => { b.run(0.45); b.spring({ coins: true }); b.run(0.45); } },
  { id: 'diamond_run', d: 0.5, reward: true, fn: (b) => { b.run(0.4); b.airShape('diamond', 'jelly_star'); b.coins(0.5); b.airShape('smile', 'jelly_pink'); b.run(0.3); } },

  // basics (d 1)
  { id: 'hop', d: 1, fn: (b) => { b.run(0.55); b.hop('low'); b.run(0.5); } },
  { id: 'duck', d: 1, fn: (b) => { b.run(0.55); b.duck(0.2); b.run(0.5); } },
  { id: 'gap', d: 1, fn: (b) => { b.run(0.55); b.leap(0.26); b.run(0.5); } },
  { id: 'hop_wide', d: 1.5, fn: (b) => { b.run(0.5); b.hop('low2'); b.run(0.5); } },
  { id: 'tall', d: 1.5, fn: (b) => { b.run(0.55); b.dhop('tall'); b.run(0.5); } },
  { id: 'duck_long', d: 1.5, fn: (b) => { b.run(0.5); b.duck(0.75); b.run(0.45); } },
  { id: 'spring_gap', d: 1.5, fn: (b) => { b.run(0.45); b.spring({ pit: true }); b.run(0.45); } },

  // doubles (d 2)
  { id: 'hop_hop', d: 2, fn: (b) => { b.run(0.45); b.hop('low'); b.run(0.32); b.hop('low'); b.run(0.45); } },
  { id: 'duck_hop', d: 2, fn: (b) => { b.run(0.45); b.duck(0.45); b.run(0.32); b.hop('low'); b.run(0.45); } },
  { id: 'hop_duck', d: 2, fn: (b) => { b.run(0.45); b.hop('low'); b.run(0.3); b.duck(0.5); b.run(0.45); } },
  { id: 'gap_hop', d: 2, fn: (b) => { b.run(0.45); b.leap(0.28); b.run(0.34); b.hop('low'); b.run(0.45); } },
  { id: 'plat_bridge', d: 2, fn: (b) => { b.run(0.45); b.stepUp(112, 0.8, { pit: true }); b.stepDown({ pitEnd: true }); b.run(0.45); } },
  { id: 'drop_hop', d: 2, need: 'fall', fn: (b) => { b.run(0.55); b.hop('fall'); b.run(0.5); } },
  { id: 'pop_hop', d: 2, need: 'pop', fn: (b) => { b.run(0.55); b.hop('pop'); b.run(0.5); } },
  { id: 'tall_duck', d: 2.5, fn: (b) => { b.run(0.45); b.dhop('tall'); b.run(0.35); b.duck(0.4); b.run(0.45); } },
  { id: 'gap_gap', d: 2.5, fn: (b) => { b.run(0.45); b.leap(0.26); b.run(0.32); b.leap(0.3); b.run(0.45); } },
  { id: 'wide_gap', d: 2.5, fn: (b) => { b.run(0.5); b.dleap(0.62); b.run(0.5); } },
  { id: 'upper_route', d: 2.5, fn: (b) => {
    // upper route: a platform full of stars; lower route: two hops on the ground
    b.run(0.4);
    const start = b.x, v = b.v;
    b.stepUp(150, 1.3, { kind: 'jelly_star' });
    b.obstacle('low', start + v * 0.78);
    b.obstacle('low', start + v * 1.48);
    b.stepDown();
    b.run(0.45);
  } },

  // combos (d 3)
  { id: 'hop3', d: 3, fn: (b) => { b.run(0.4); b.hop('low'); b.run(0.24); b.hop('low'); b.run(0.24); b.hop('low'); b.run(0.4); } },
  { id: 'tall_hop', d: 3, fn: (b) => { b.run(0.4); b.dhop('tall'); b.run(0.3); b.hop('low2'); b.run(0.45); } },
  { id: 'duck_gap', d: 3, fn: (b) => { b.run(0.4); b.duck(0.55); b.run(0.36); b.leap(0.3); b.run(0.45); } },
  { id: 'gap_duck', d: 3, fn: (b) => { b.run(0.4); b.leap(0.3); b.run(0.34); b.duck(0.6); b.run(0.45); } },
  { id: 'drop_duck', d: 3, need: 'fall', fn: (b) => { b.run(0.45); b.hop('fall'); b.run(0.3); b.duck(0.45); b.hop('fall'); b.run(0.45); } },
  { id: 'pop_pop', d: 3, need: 'pop', fn: (b) => { b.run(0.45); b.hop('pop'); b.run(0.26); b.hop('pop'); b.run(0.45); } },
  { id: 'plat_steps', d: 3, fn: (b) => { b.run(0.4); b.stepUp(95, 0.42, { pit: true }); b.stepUp(190, 0.5); b.stepDown({ pitEnd: true, hop: true }); b.run(0.3); b.hop('low'); b.run(0.45); } },
  { id: 'duck_tall', d: 3, fn: (b) => { b.run(0.4); b.duck(0.5); b.run(0.34); b.dhop('tall'); b.run(0.45); } },

  // hard (d 4+)
  { id: 'rhythm', d: 4, fn: (b) => { b.run(0.35); b.hop('low'); b.run(0.22); b.duck(0.35); b.run(0.26); b.hop('low2'); b.run(0.22); b.duck(0.3); b.run(0.4); } },
  { id: 'tall_tall', d: 4, fn: (b) => { b.run(0.35); b.dhop('tall'); b.run(0.3); b.dhop('tall'); b.run(0.45); } },
  { id: 'gap_tall', d: 4, fn: (b) => { b.run(0.35); b.leap(0.32); b.run(0.32); b.dhop('tall'); b.run(0.32); b.duck(0.4); b.run(0.4); } },
  { id: 'gauntlet', d: 4.5, fn: (b) => { b.run(0.35); b.hop('low'); b.run(0.22); b.leap(0.3); b.run(0.25); b.duck(0.45); b.run(0.25); b.hop('low2'); b.run(0.4); } },
  { id: 'drop_gauntlet', d: 4.5, need: 'fall', fn: (b) => { b.run(0.35); b.hop('fall'); b.run(0.22); b.dhop('tall'); b.run(0.26); b.hop('fall'); b.run(0.22); b.duck(0.35); b.run(0.4); } },
  { id: 'pop_gauntlet', d: 4.5, need: 'pop', fn: (b) => { b.run(0.35); b.hop('pop'); b.run(0.22); b.duck(0.4); b.run(0.24); b.hop('pop'); b.run(0.22); b.leap(0.3); b.run(0.4); } },
  { id: 'chaos', d: 5, fn: (b) => { b.run(0.3); b.hop('low'); b.run(0.2); b.hop('low'); b.run(0.22); b.dhop('tall'); b.run(0.24); b.duck(0.5); b.run(0.22); b.dleap(0.6); b.run(0.4); } },
];
const PATTERN = Object.fromEntries(PATTERNS.map((p) => [p.id, p]));

});

// ---- src/game/generator.js
__def("src/game/generator.js", function (__exports, __req) {
__exp(__exports, { "Generator": () => Generator });
// =============================================================================
//  Level generator: streams chunks ahead of the runner, paces difficulty per
//  land, inserts land transitions and schedules milk / letters / power-ups
//  into the "slots" each chunk exposes on its natural path.
// =============================================================================
const { CFG, LAND_IDS } = __req("src/config.js");
const { Builder, PATTERNS } = __req("src/game/chunks.js");
const { LANDS, POWERUPS } = __req("src/data/content.js");
const { makeRand, mulberry32, clamp } = __req("src/engine/util.js");

const TUTORIAL = [
  (b) => { b.run(1.5, { deco: false }); },
  (b) => { b.tutorial = 'jump'; b.hop('low'); b.run(1.0); },
  (b) => { b.tutorial = 'double'; b.dhop('tall'); b.run(1.0); },
  (b) => { b.tutorial = 'slide'; b.duck(0.65); b.run(1.0); },
  (b) => { b.tutorial = 'gap'; b.leap(0.28); b.run(0.6); b.slot(b.x, CFG.JELLY_Y); b.forceMilk = true; b.run(1.0); },
];

class Generator {
  constructor(run, opts = {}) {
    this.run = run;
    this.world = run.world;
    this.rand = makeRand(mulberry32(opts.seed ?? ((Date.now() * 7919) >>> 0)));
    this.landIdx = 0; this.lap = 0;
    this.landClock = 0;
    this.clock = 0;
    this.recent = [];
    this.sinceReward = 0;
    this.next = { milk: 6, bigmilk: 34, letter: 5, item: 8 };
    this.lastItem = null;
    this.tutorial = opts.tutorial ? TUTORIAL.slice() : null;
    this.transitions = [];
    this.started = false;
    this.startRun = opts.startRun ?? 1.4;
  }

  speed(landIdx = this.landIdx, lap = this.lap) { return Math.min(CFG.MAX_SPEED, CFG.LAND_SPEEDS[landIdx] + lap * CFG.LAP_SPEED); }
  get land() { return LAND_IDS[this.landIdx]; }

  fill(toX) { let guard = 0; while (this.world.genX < toX && guard++ < 30) this.chunk(); }

  builder(land = this.land, v = this.speed()) { return new Builder(this.world, this.world.genX, v, land, this.rand); }

  chunk() {
    const v = this.speed();
    let b;
    if (!this.started) {
      this.started = true;
      b = this.builder();
      b.run(this.startRun, { deco: false });
    } else if (this.tutorial && this.tutorial.length) {
      b = this.builder();
      this.tutorial.shift()(b);
    } else if (this.landClock >= CFG.LAND_TIME) {
      this.transition();
      return;
    } else {
      const p = this.pick();
      b = this.builder();
      b.jellyKind = this.rand() < 0.18 ? 'pinkmix' : 'mix';
      b.coinChance = 0.14;
      p.fn(b);
      b.run(0.12, { deco: false });
      this.recent.push(p.id); if (this.recent.length > 4) this.recent.shift();
      this.sinceReward = p.reward ? 0 : this.sinceReward + 1;
    }
    const res = b.finish();
    const dur = (res.end - res.start) / v;
    this.assignSpecials(res, dur, v, b.forceMilk);
    this.clock += dur;
    this.landClock += dur;
  }

  targetDifficulty() {
    const prog = clamp(this.landClock / CFG.LAND_TIME, 0, 1);
    return clamp(0.9 + this.landIdx * 0.75 + prog * 1.1 + this.lap * 1.1, 1, 5.5);
  }

  pick() {
    const target = this.targetDifficulty();
    const specials = LANDS[this.landIdx].specials;
    if (this.sinceReward >= 5 + Math.floor(this.rand() * 3)) {
      const rewards = PATTERNS.filter((p) => p.reward && !this.recent.includes(p.id));
      return this.rand.pick(rewards);
    }
    const pool = PATTERNS.filter((p) => !p.reward && (!p.need || specials.includes(p.need)) && p.d <= target + 0.6 && !this.recent.includes(p.id));
    return this.rand.weighted(pool, (p) => {
      let w = Math.exp(-((p.d - target) ** 2) / 1.3);
      if (p.need) w *= 1.6; // show off land gimmicks
      return w;
    }) || PATTERNS[5];
  }

  transition() {
    const nextIdx = (this.landIdx + 1) % LAND_IDS.length;
    const nextLap = this.lap + (nextIdx === 0 ? 1 : 0);
    // tail of current land
    let b = this.builder();
    b.run(0.45, { deco: false });
    let res = b.finish();
    this.clock += (res.end - res.start) / this.speed();
    // new land: signpost + safe run with coins
    const v2 = this.speed(nextIdx, nextLap);
    const land2 = LAND_IDS[nextIdx];
    b = new Builder(this.world, this.world.genX, v2, land2, this.rand);
    const signX = b.x + 70;
    const n = nextLap * LAND_IDS.length + nextIdx + 1;
    this.world.addSign(signX, nextIdx, land2, [`LAND ${n}`, LANDS[nextIdx].name]);
    b.run(0.5, { deco: false });
    b.coins(0.8);
    b.airShape('star', 'jelly_star');
    b.run(0.5);
    res = b.finish();
    this.transitions.push({ x: signX, landIdx: nextIdx, lap: nextLap, n });
    this.clock += (res.end - res.start) / v2;
    this.landIdx = nextIdx; this.lap = nextLap; this.landClock = 0;
    this.sinceReward = 0;
  }

  // --------------------------------------------------------------- specials
  assignSpecials(res, dur, v, forceMilk) {
    const t0 = this.clock, t1 = this.clock + dur;
    const slots = res.slots.slice();
    const slotTime = (s) => t0 + (s.x - res.start) / v;
    const take = (due) => {
      if (!slots.length) return null;
      let bi = 0, bd = Infinity;
      slots.forEach((s, i) => { const d = Math.abs(slotTime(s) - due); if (d < bd) { bd = d; bi = i; } });
      return slots.splice(bi, 1)[0];
    };
    if (this.tutorial && !forceMilk) return; // keep the tutorial clean
    if (forceMilk) { const s = slots.pop(); if (s) this.place('milk', s); this.next.milk = t1 + 9; return; }
    for (const key of ['letter', 'milk', 'item']) {
      if (this.next[key] > t1) continue;
      const s = take(this.next[key]);
      if (!s) continue;
      const placedAt = slotTime(s);
      if (this.place(key, s) || key !== 'letter') this.next[key] = placedAt + this.interval(key);
      else this.next[key] = placedAt + 2;
    }
  }
  interval(key) {
    const r = this.rand;
    if (key === 'milk') return CFG.MILK_EVERY + CFG.MILK_EVERY_LAND * this.landIdx + this.lap * 1.2 + r.range(-1.5, 1.5);
    if (key === 'letter') return CFG.LETTER_EVERY + r.range(-1.2, 1.2);
    return CFG.ITEM_EVERY + r.range(-2, 2.5);
  }
  clearAround(x, y, rad = 34) {
    for (const p of this.world.picks) if (!p.taken && Math.abs(p.x - x) < rad && Math.abs(p.y - y) < rad + 10 && p.kind.startsWith('jelly')) p.taken = true, p.t = 99;
  }
  place(key, s) {
    const w = this.world;
    if (key === 'letter') {
      const idx = this.run.letterToSpawn();
      if (idx < 0) return false;
      this.clearAround(s.x, s.y);
      w.addPick('letter', s.x, s.y - 6, { idx });
      return true;
    }
    this.clearAround(s.x, s.y);
    if (key === 'milk') {
      const big = this.clock >= this.next.bigmilk;
      if (big) this.next.bigmilk = this.clock + CFG.BIGMILK_EVERY + this.rand.range(-6, 6);
      w.addPick(big ? 'milk_l' : 'milk_s', s.x, s.y - 8);
      return true;
    }
    const types = Object.keys(POWERUPS).filter((t) => t !== this.lastItem);
    const type = this.rand.weighted(types, (t) => POWERUPS[t].weight);
    this.lastItem = type;
    w.addPick('pw:' + type, s.x, s.y - 8);
    return true;
  }
}

});

// ---- src/game/player.js
__def("src/game/player.js", function (__exports, __req) {
__exp(__exports, { "Runner": () => Runner });
// =============================================================================
//  Runner: physics (jump / double jump / slide / fast-fall / platforms / pits),
//  animation state and rendering (spin, giant scale, flashes, afterimages).
// =============================================================================
const { CFG } = __req("src/config.js");
const { Assets } = __req("src/engine/assets.js");
const { TAU, clamp, rgba } = __req("src/engine/util.js");

const G = CFG.GRAVITY, GY = CFG.GROUND_Y;

class Runner {
  constructor(run, id) {
    this.run = run;
    this.setChar(id);
    this.x = 0; this.y = GY; this.vy = 0; this.prevY = GY;
    this.grounded = true; this.onPlat = null;
    this.jumps = 0; this.coyote = 0; this.buffer = 0;
    this.slideHeld = false; this.sliding = false;
    this.spinT = 0; this.spinDur = 0.42;
    this.landT = 0; this.hurtT = 0; this.flashT = 0; this.invuln = 0;
    this.scale = 1; this.targetScale = 1;
    this.animT = 0; this.mode = 'run';   // run | down | pit | fly | float | roll
    this.modeT = 0;
    this.alpha = 1;
    this.trail = []; this.trailT = 0;
    this.dustT = 0;
    this.thrust = false;
    this.rollAngle = 0;
    this.visible = true;
  }
  setChar(id) {
    this.id = id;
    this.sheet = 'char_' + id;
    this.meta = Assets.meta(this.sheet);
    this.color = this.meta?.color || '#ffb36b';
    this.skillColor = this.meta?.skillColor || '#fff2a0';
  }

  get airborne() { return !this.grounded; }

  hitbox() {
    const s = this.scale;
    let w = CFG.HIT_W, h = CFG.HIT_H;
    if (this.mode === 'roll') { w = 64; h = 70; }
    else if (this.sliding) { w = CFG.SLIDE_W; h = CFG.SLIDE_H; }
    else if (this.spinT > 0) h = CFG.TUCK_H;
    return { x: this.x - (w * s) / 2, y: this.y - h * s, w: w * s, h: h * s };
  }
  center() { const s = this.scale; return { x: this.x, y: this.y - (this.sliding ? 24 : 48) * s }; }

  /** Returns 1 (jump), 2 (double) or 0 (buffered). */
  pressJump() {
    if (this.mode === 'fly') { this.thrust = true; return 0; }
    if (this.mode !== 'run' && this.mode !== 'roll') return 0;
    if (this.grounded || this.coyote > 0 || this.jumps === 0) { this.doJump(1); return 1; }
    if (this.jumps < 2) { this.doJump(2); return 2; }
    this.buffer = CFG.JUMP_BUFFER;
    return 0;
  }
  doJump(n) {
    this.vy = n === 1 ? -CFG.JUMP_V : -CFG.DJUMP_V;
    this.jumps = n;
    if (n === 2) this.spinT = this.spinDur;
    this.grounded = false; this.onPlat = null; this.coyote = 0; this.buffer = 0;
    this.sliding = false;
  }
  bounce(v) {
    this.vy = -v; this.jumps = 1; this.grounded = false; this.onPlat = null; this.coyote = 0; this.sliding = false; this.spinT = 0;
  }

  /**
   * Physics step. o: { speed, bridge, floatY, world }
   * Returns event string or null: 'land' | 'fallStart'
   */
  step(dt, world, o) {
    this.prevY = this.y;
    this.x += o.speed * dt;
    this.modeT += dt;
    this.animT += dt * (o.speed / 480);
    if (this.spinT > 0) this.spinT = Math.max(0, this.spinT - dt);
    if (this.landT > 0) this.landT -= dt;
    if (this.hurtT > 0) this.hurtT -= dt;
    if (this.flashT > 0) this.flashT -= dt;
    if (this.invuln > 0) this.invuln -= dt;
    if (this.coyote > 0) this.coyote -= dt;
    if (this.buffer > 0) this.buffer -= dt;
    this.scale += (this.targetScale - this.scale) * Math.min(1, dt * 9);
    let ev = null;

    if (this.mode === 'down') { this.vy = 0; return null; }
    if (this.mode === 'pit') { this.vy = Math.min(this.vy + G * dt, CFG.MAX_FALL); this.y += this.vy * dt; return null; }
    if (this.mode === 'fly') {
      const acc = this.thrust ? -4300 : 2500;
      this.vy = clamp(this.vy + acc * dt, -760, 880);
      this.y += this.vy * dt;
      if (this.y > GY - 6) { this.y = GY - 6; this.vy = Math.min(-420, -Math.abs(this.vy) * 0.5); ev = 'bounce'; }
      if (this.y < 150) { this.y = 150; this.vy = Math.max(0, this.vy); }
      this.grounded = false;
      return ev;
    }
    if (o.floatY != null) {
      const target = o.floatY;
      this.vy = clamp((target - this.y) * 5.5, -900, 600);
      this.y += this.vy * dt;
      this.grounded = false; this.onPlat = null; this.jumps = 1; this.spinT = 0;
      return null;
    }

    if (!this.grounded) {
      let g = G;
      if (this.slideHeld && this.vy > -150) g *= CFG.FAST_FALL;
      this.vy = Math.min(this.vy + g * dt, CFG.MAX_FALL * (this.slideHeld ? 1.25 : 1));
      this.y += this.vy * dt;
      if (this.vy >= 0) {
        const hw = 16 * Math.max(1, this.scale * 0.8);
        const plat = world.platformLanding(this.x, hw, this.prevY, this.y);
        if (plat) { this.land(plat.y, plat); ev = 'land'; }
        else if (this.y >= GY && this.prevY <= GY + 4 && (o.bridge || world.groundAt(this.x, 14 * Math.max(1, this.scale * 0.7)))) { this.land(GY, null); ev = 'land'; }
      }
    } else {
      let supported;
      if (this.onPlat) { const p = this.onPlat; supported = this.x - 16 <= p.x + p.w && this.x + 16 >= p.x; }
      else supported = o.bridge || !!world.groundAt(this.x, 14 * Math.max(1, this.scale * 0.7));
      if (!supported) {
        this.grounded = false; this.onPlat = null; this.coyote = CFG.COYOTE; this.vy = 40; this.jumps = 0; ev = 'fallStart';
      } else if (this.buffer > 0) { this.doJump(1); ev = 'bufferedJump'; }
    }
    this.sliding = this.grounded && this.slideHeld && this.mode === 'run';
    return ev;
  }
  land(y, plat) {
    this.y = y; this.vy = 0; this.grounded = true; this.onPlat = plat; this.jumps = 0; this.spinT = 0;
    this.landT = 0.09;
    if (this.buffer > 0) { this.doJump(1); this.landT = 0; }
  }

  // ------------------------------------------------------------------ anim
  frameIndex() {
    const A = this.meta?.anims;
    if (!A) return 0;
    const pick = (name, fpsOverride) => {
      const a = A[name];
      if (!a) return 0;
      const fr = a.frames;
      if (fr.length === 1) return fr[0];
      const fps = fpsOverride ?? a.fps ?? 10;
      const i = Math.floor(this.animT * fps);
      return a.loop === false ? fr[Math.min(fr.length - 1, i)] : fr[i % fr.length];
    };
    switch (this.mode) {
      case 'down': return this.modeT < 0.32 ? A.down.frames[0] : A.down.frames[1];
      case 'pit': return pick('pit');
      case 'roll': return A.tuck.frames[0];
      case 'fly': return pick('cheer', 8);
      case 'float': return pick('skill');
      case 'idle': return pick('idle');
      case 'cheer': return pick('cheer');
    }
    if (this.hurtT > 0.12) return A.hurt.frames[0];
    if (!this.grounded) {
      if (this.spinT > 0) return A.tuck.frames[0];
      if (this.vy < -300) return A.jump.frames[0];
      if (this.vy < 300) return A.apex.frames[0];
      return A.fall.frames[0];
    }
    if (this.sliding) return pick('slide');
    if (this.landT > 0) return A.land.frames[0];
    if (this.skillPose > 0) return pick('skill');
    return pick('run');
  }

  /** Draw at screen coords. o: { camX, time, ghost, auraColor, shield } */
  render(ctx, camX, time, o = {}) {
    if (!this.visible) return;
    const sx = this.x - camX, sy = this.y;
    const s = this.scale;
    const f = this.frameIndex();
    // ground shadow
    if (this.mode !== 'pit' && this.mode !== 'fly') {
      const surf = o.surface;
      if (surf != null) {
        const h = Math.max(0, surf - sy);
        const k = clamp(1 - h / 420, 0.25, 1);
        ctx.save(); ctx.globalAlpha = 0.28 * k * this.alpha; ctx.fillStyle = '#2a140c';
        ctx.beginPath(); ctx.ellipse(sx, surf + 1, 34 * s * k * (this.sliding ? 1.3 : 1), 8 * s * k, 0, 0, TAU); ctx.fill(); ctx.restore();
      }
    }
    // afterimages
    for (let i = 0; i < this.trail.length; i++) {
      const t = this.trail[i];
      const a = (i + 1) / (this.trail.length + 1) * 0.35 * this.alpha;
      this.drawBody(ctx, t.x - camX, t.y, t.f, t.rot, t.s, { alpha: a, tint: o.ghost || '#bfe8ff' });
    }
    // aura
    if (o.auraColor) {
      const pulse = 0.75 + 0.25 * Math.sin(time * 10);
      const r = 86 * s * pulse;
      const cy = sy - 50 * s;
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const g = ctx.createRadialGradient(sx, cy, 0, sx, cy, r);
      g.addColorStop(0, rgba(o.auraColor, 0.55)); g.addColorStop(0.5, rgba(o.auraColor, 0.22)); g.addColorStop(1, rgba(o.auraColor, 0));
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(sx, cy, r, 0, TAU); ctx.fill(); ctx.restore();
    }
    let alpha = this.alpha;
    if (this.invuln > 0 && !o.noBlink && this.mode === 'run') alpha *= (Math.floor(time * 16) % 2 === 0) ? 0.45 : 1;
    let rot = 0;
    if (this.mode === 'roll') rot = this.rollAngle;
    else if (this.spinT > 0) rot = (1 - this.spinT / this.spinDur) * TAU;
    this.drawBody(ctx, sx, sy, f, rot, s, { alpha });
    if (this.flashT > 0 && Math.floor(this.flashT * 30) % 2 === 0) this.drawBody(ctx, sx, sy, f, rot, s, { alpha: 0.8 * alpha, tint: '#ffffff' });
    if (o.shield) {
      const pulse = 1 + Math.sin(time * 6) * 0.04;
      Assets.draw(ctx, 'fx', 'bubble', sx, sy - 52 * s, { scale: 0.62 * s * pulse, alpha: 0.85 * this.alpha });
    }
  }
  drawBody(ctx, sx, sy, f, rot, s, o) {
    if (rot) {
      const pv = 38 * s;
      ctx.save();
      ctx.translate(sx, sy - pv);
      ctx.rotate(rot);
      Assets.draw(ctx, this.sheet, f, 0, pv, { scale: s, alpha: o.alpha, tint: o.tint });
      ctx.restore();
    } else Assets.draw(ctx, this.sheet, f, sx, sy, { scale: s, alpha: o.alpha, tint: o.tint });
  }
  pushTrail(dt, on) {
    if (!on) { if (this.trail.length) this.trail.shift(); return; }
    this.trailT -= dt;
    if (this.trailT <= 0) {
      this.trailT = 0.035;
      let rot = 0;
      if (this.mode === 'roll') rot = this.rollAngle; else if (this.spinT > 0) rot = (1 - this.spinT / this.spinDur) * TAU;
      this.trail.push({ x: this.x - 26, y: this.y, f: this.frameIndex(), rot, s: this.scale });
      if (this.trail.length > 5) this.trail.shift();
    }
  }
}

});

// ---- src/game/pet.js
__def("src/game/pet.js", function (__exports, __req) {
__exp(__exports, { "Pet": () => Pet });
// =============================================================================
//  Pet companion: floats behind the runner and performs its ability on a timer.
// =============================================================================
const { Assets } = __req("src/engine/assets.js");
const { PET } = __req("src/data/content.js");
const { TAU, damp } = __req("src/engine/util.js");

class Pet {
  constructor(run, id) {
    this.run = run; this.id = id; this.def = PET[id];
    this.sheet = 'pet_' + id;
    this.x = 0; this.y = 420; this.t = 0;
    this.cd = this.def.cd; this.timer = this.def.cd * 0.7;
    this.act = 0;
    this.visible = true;
  }
  get ready() { return 1 - this.timer / this.cd; }
  place(x, y) { this.x = x; this.y = y; }
  update(dt, runner, active) {
    this.t += dt;
    const tx = runner.x - 78 - (runner.scale - 1) * 40;
    const ty = runner.y - 128 * Math.max(1, runner.scale * 0.85) + Math.sin(this.t * 2.6) * 10;
    this.x = damp(this.x, tx, 7, dt);
    this.y = damp(this.y, Math.min(ty, 520), 5, dt);
    if (this.act > 0) this.act -= dt;
    if (!active) return false;
    this.timer -= dt;
    if (this.timer <= 0) { this.timer = this.cd; this.act = 0.7; return true; }
    return false;
  }
  render(ctx, camX) {
    if (!this.visible) return;
    const A = Assets.meta(this.sheet)?.anims;
    if (!A) return;
    const a = this.act > 0 ? A.act : A.fly;
    const f = a.frames[Math.floor(this.t * (a.fps || 8)) % a.frames.length];
    const sx = this.x - camX, sy = this.y;
    if (this.act > 0) {
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const g = ctx.createRadialGradient(sx, sy, 0, sx, sy, 70);
      g.addColorStop(0, 'rgba(255,240,160,0.5)'); g.addColorStop(1, 'rgba(255,240,160,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(sx, sy, 70, 0, TAU); ctx.fill(); ctx.restore();
    }
    Assets.draw(ctx, this.sheet, f, sx, sy, { scale: 0.92 });
  }
}

});

// ---- src/game/hud.js
__def("src/game/hud.js", function (__exports, __req) {
__exp(__exports, { "HUD": () => HUD });
// =============================================================================
//  In-run HUD: portrait + skill ring, energy bar, SUGAR RUSH letters, score,
//  coins, power-up timers, combo, touch buttons, bonus timer.
// =============================================================================
const { Assets } = __req("src/engine/assets.js");
const { text, rrPath, icon, COL } = __req("src/engine/ui.js");
const { TAU, clamp, fmt, Ease, damp } = __req("src/engine/util.js");
const { CFG } = __req("src/config.js");
const { LANDS } = __req("src/data/content.js");

const PW_ORDER = ['magnet', 'giant', 'dash', 'coins', 'shield'];

class HUD {
  constructor(run) {
    this.run = run;
    this.score = 0; this.coins = 0;
    this.energy = 1; this.lag = 1;
    this.letterPop = new Array(9).fill(0);
    this.comboPop = 0; this.scorePop = 0; this.coinPop = 0; this.barShake = 0;
    this.lowPulse = 0;
    this.alpha = 1;
  }
  update(dt) {
    const r = this.run;
    this.score = r.score < this.score ? r.score : damp(this.score, r.score, 14, dt) + 0.5;
    if (Math.abs(this.score - r.score) < 1) this.score = r.score;
    this.coins = r.coins;
    const e = clamp(r.energy / r.maxEnergy, 0, 1);
    this.energy = damp(this.energy, e, 18, dt);
    if (this.lag < this.energy) this.lag = this.energy; else this.lag = Math.max(this.energy, this.lag - dt * 0.35);
    for (let i = 0; i < 9; i++) if (this.letterPop[i] > 0) this.letterPop[i] = Math.max(0, this.letterPop[i] - dt * 2.2);
    this.comboPop = Math.max(0, this.comboPop - dt * 4);
    this.scorePop = Math.max(0, this.scorePop - dt * 5);
    this.coinPop = Math.max(0, this.coinPop - dt * 5);
    this.barShake = Math.max(0, this.barShake - dt * 3);
    this.lowPulse += dt;
  }

  barWidth() { return clamp(this.run.maxEnergy * 4.1, 380, Math.min(640, this.run.W * 0.42)); }

  render(ctx) {
    const r = this.run, W = r.W;
    ctx.save();
    if (this.alpha < 1) ctx.globalAlpha = this.alpha;
    // ---------------------------------------------------------------- energy
    const bx = 104 + (this.barShake > 0 ? Math.sin(this.barShake * 60) * 6 * this.barShake : 0), by = 28, bw = this.barWidth(), bh = 34;
    const low = this.energy < CFG.LOW_ENERGY;
    ctx.save();
    rrPath(ctx, bx - 4, by - 4, bw + 8, bh + 8, (bh + 8) / 2);
    ctx.fillStyle = 'rgba(74,42,26,0.55)'; ctx.fill();
    rrPath(ctx, bx, by, bw, bh, bh / 2); ctx.fillStyle = 'rgba(40,20,14,0.6)'; ctx.fill();
    ctx.save(); rrPath(ctx, bx, by, bw, bh, bh / 2); ctx.clip();
    if (this.lag > this.energy) { ctx.fillStyle = '#ffffff'; ctx.globalAlpha *= 0.75; ctx.fillRect(bx, by, bw * this.lag, bh); ctx.globalAlpha = this.alpha; }
    const ew = bw * this.energy;
    const g = ctx.createLinearGradient(0, by, 0, by + bh);
    if (low) { g.addColorStop(0, '#ff9a8a'); g.addColorStop(1, '#e8343a'); }
    else if (this.energy < 0.5) { g.addColorStop(0, '#ffe680'); g.addColorStop(1, '#ffa526'); }
    else { g.addColorStop(0, '#c4f78a'); g.addColorStop(1, '#4fc43a'); }
    ctx.fillStyle = g; ctx.fillRect(bx, by, ew, bh);
    ctx.fillStyle = 'rgba(255,255,255,0.38)'; ctx.fillRect(bx, by + 4, ew, bh * 0.28);
    // segment ticks every 20 energy
    ctx.fillStyle = 'rgba(40,20,14,0.22)';
    for (let v = 20; v < r.maxEnergy; v += 20) ctx.fillRect(bx + bw * (v / r.maxEnergy) - 1, by + bh * 0.55, 2, bh * 0.45);
    ctx.restore();
    if (low) {
      const p = 0.5 + 0.5 * Math.sin(this.lowPulse * 10);
      ctx.strokeStyle = `rgba(255,70,70,${0.4 + 0.5 * p})`; ctx.lineWidth = 4 + p * 3;
      rrPath(ctx, bx - 2, by - 2, bw + 4, bh + 4, (bh + 4) / 2); ctx.stroke();
    }
    ctx.strokeStyle = COL.ink; ctx.lineWidth = 3.5; rrPath(ctx, bx, by, bw, bh, bh / 2); ctx.stroke();
    ctx.restore();
    icon(ctx, 'milk', bx + bw + 4, by + bh / 2, 46);
    // ------------------------------------------------------------ portrait
    const px = 56, py = 52, pr = 44;
    ctx.save();
    ctx.fillStyle = 'rgba(74,42,26,0.55)'; ctx.beginPath(); ctx.arc(px, py, pr + 5, 0, TAU); ctx.fill();
    const pg = ctx.createRadialGradient(px - 10, py - 14, 4, px, py, pr);
    pg.addColorStop(0, '#fffaf0'); pg.addColorStop(1, '#ffd9b3');
    ctx.fillStyle = pg; ctx.beginPath(); ctx.arc(px, py, pr - 3, 0, TAU); ctx.fill();
    ctx.restore();
    Assets.draw(ctx, 'portrait_' + r.runner.id, 0, px, py + 2, { scale: 0.86 });
    // skill ring
    const sk = r.skill;
    if (sk) {
      const k = sk.active > 0 ? sk.active / sk.dur : 1 - sk.timer / sk.cd;
      ctx.save();
      ctx.lineCap = 'round';
      ctx.strokeStyle = 'rgba(40,20,14,0.5)'; ctx.lineWidth = 7;
      ctx.beginPath(); ctx.arc(px, py, pr + 1, 0, TAU); ctx.stroke();
      ctx.strokeStyle = sk.active > 0 ? '#fff6a0' : r.runner.skillColor; ctx.lineWidth = 7;
      ctx.beginPath(); ctx.arc(px, py, pr + 1, -Math.PI / 2, -Math.PI / 2 + TAU * clamp(k, 0, 1)); ctx.stroke();
      if (sk.active > 0) {
        ctx.globalCompositeOperation = 'lighter';
        ctx.strokeStyle = 'rgba(255,240,150,0.5)'; ctx.lineWidth = 12 + Math.sin(r.t * 14) * 4;
        ctx.beginPath(); ctx.arc(px, py, pr + 2, 0, TAU); ctx.stroke();
      }
      ctx.restore();
      ctx.strokeStyle = COL.ink; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(px, py, pr + 5, 0, TAU); ctx.stroke();
    }
    // pet badge
    if (r.pet) {
      const qx = px + 40, qy = py + 44;
      ctx.save(); ctx.fillStyle = 'rgba(74,42,26,0.6)'; ctx.beginPath(); ctx.arc(qx, qy, 21, 0, TAU); ctx.fill();
      ctx.strokeStyle = '#ffe680'; ctx.lineWidth = 4; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.arc(qx, qy, 19, -Math.PI / 2, -Math.PI / 2 + TAU * clamp(r.pet.ready, 0, 1)); ctx.stroke(); ctx.restore();
      Assets.draw(ctx, 'petportrait_' + r.pet.id, 0, qx, qy, { scale: 0.42 });
    }
    // ------------------------------------------------------------- letters
    for (let i = 0; i < 9; i++) {
      const lx = bx + 16 + i * 31, ly = by + bh + 26;
      const on = r.letters[i];
      const pop = this.letterPop[i];
      const s = 1 + Ease.outBack(Math.min(1, pop * 1.2)) * 0.6 * pop;
      Assets.draw(ctx, 'items', on ? 'hud_letter_' + i : 'hud_letter_off', lx, ly, { scale: s, alpha: on ? 1 : 0.8 });
    }
    // land label
    const landName = LANDS[r.landIdx]?.name || '';
    text(ctx, `LAND ${r.landNo}  ${landName}`, bx + 2, by + bh + 58, { size: 15, font: 'bold', align: 'left', color: '#fff', stroke: 'rgba(74,42,26,0.8)', sw: 4 });
    // --------------------------------------------------------------- score
    const ss = 1 + this.scorePop * 0.12;
    ctx.save(); ctx.translate(W / 2, 40); ctx.scale(ss, ss);
    text(ctx, fmt(this.score), 0, 0, { size: 42, font: 'num', color: '#fff', stroke: COL.ink, sw: 8, shadow: { dx: 0, dy: 3, color: 'rgba(74,42,26,0.5)' } });
    ctx.restore();
    const cs = 1 + this.coinPop * 0.18;
    const cw = 120;
    ctx.save(); ctx.translate(W / 2, 84); ctx.scale(cs, cs);
    rrPath(ctx, -cw / 2 - 6, -17, cw + 12, 34, 17); ctx.fillStyle = 'rgba(74,42,26,0.5)'; ctx.fill();
    icon(ctx, 'coin', -cw / 2 + 10, 0, 36);
    text(ctx, fmt(this.coins), cw / 2 - 4, 1, { size: 22, font: 'num', align: 'right', color: '#ffe680', stroke: COL.ink, sw: 5 });
    ctx.restore();
    // distance
    text(ctx, `${fmt(r.dist)}m`, W - 112, 46, { size: 20, font: 'num', align: 'right', color: '#fff', stroke: COL.ink, sw: 5 });
    // ------------------------------------------------------------ power-ups
    let ix = W - 60;
    const iy = 118;
    for (const k of PW_ORDER) {
      const t = r.pw[k];
      if (!(t > 0)) continue;
      const total = r.pwDur[k] || 1;
      ctx.save(); ctx.fillStyle = 'rgba(74,42,26,0.5)'; ctx.beginPath(); ctx.arc(ix, iy, 27, 0, TAU); ctx.fill();
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 4.5; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.arc(ix, iy, 27, -Math.PI / 2, -Math.PI / 2 + TAU * clamp(t / total, 0, 1)); ctx.stroke(); ctx.restore();
      const blink = t < 1.2 && Math.floor(t * 8) % 2 === 0 ? 0.45 : 1;
      Assets.draw(ctx, 'items', 'pw_' + k, ix, iy, { scale: 0.62, alpha: blink });
      ix -= 64;
    }
    // ---------------------------------------------------------------- combo
    if (r.combo >= 10) {
      const p = this.comboPop;
      const s = 1 + Ease.outBack(Math.min(1, p)) * 0.25 * p;
      ctx.save(); ctx.translate(W - 92, 196); ctx.scale(s, s); ctx.rotate(-0.06);
      text(ctx, 'COMBO', 0, -22, { size: 18, font: 'num', color: '#ffe680', stroke: COL.ink, sw: 5 });
      text(ctx, fmt(r.combo), 0, 8, { size: 38, font: 'num', color: '#fff', stroke: COL.ink, sw: 7 });
      const bonus = Math.round((r.comboMult() - 1) * 100);
      if (bonus > 0) text(ctx, `+${bonus}%`, 0, 38, { size: 17, font: 'num', color: '#9dff7a', stroke: COL.ink, sw: 4 });
      ctx.restore();
    }
    // ------------------------------------------------------------ rush timer
    if (r.state === 'rush' && r.rush) {
      const k = clamp(r.rush.left / r.rush.dur, 0, 1);
      const tw = 360, tx = W / 2 - tw / 2, ty = 112;
      rrPath(ctx, tx - 3, ty - 3, tw + 6, 26, 13); ctx.fillStyle = 'rgba(74,42,26,0.6)'; ctx.fill();
      ctx.save(); rrPath(ctx, tx, ty, tw, 20, 10); ctx.clip();
      const gg = ctx.createLinearGradient(tx, 0, tx + tw, 0);
      gg.addColorStop(0, '#ff7eb9'); gg.addColorStop(0.5, '#ffd02a'); gg.addColorStop(1, '#4fb4ff');
      ctx.fillStyle = gg; ctx.fillRect(tx, ty, tw * k, 20); ctx.restore();
      text(ctx, 'SUGAR RUSH', W / 2, ty + 10, { size: 15, font: 'num', color: '#fff', stroke: COL.ink, sw: 4 });
    }
    ctx.restore();
    this.renderButtons(ctx);
  }

  renderButtons(ctx) {
    const r = this.run, W = r.W, H = r.H;
    if (!r.showTouch) return;
    const touch = r.game.input.lastType !== 'mouse';
    const base = touch ? 0.9 : 0.62;
    const items = [
      { x: 96, y: H - 92, icon: 'btn_jump', label: '점프', key: 'SPACE', on: r.touchJumpT > 0 || r.game.input.isDown('jump') },
      { x: W - 96, y: H - 92, icon: 'btn_slide', label: '슬라이드', key: '↓', on: r.touchSlide.size > 0 || r.game.input.isDown('slide') },
    ];
    for (const b of items) {
      const s = b.on ? 0.92 : 1;
      ctx.save();
      ctx.globalAlpha = base * this.alpha;
      ctx.translate(b.x, b.y); ctx.scale(s, s);
      ctx.fillStyle = b.on ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.3)';
      ctx.beginPath(); ctx.arc(0, 0, 60, 0, TAU); ctx.fill();
      ctx.strokeStyle = 'rgba(74,42,26,0.7)'; ctx.lineWidth = 4; ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,0.75)'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(0, 0, 53, 0, TAU); ctx.stroke();
      ctx.restore();
      ctx.save(); ctx.globalAlpha = base * this.alpha;
      Assets.draw(ctx, 'ui', b.icon, b.x, b.y - 10, { scale: 1.05 * s });
      ctx.restore();
      text(ctx, touch ? b.label : b.key, b.x, b.y + 34, { size: touch ? 18 : 16, font: touch ? 'display' : 'num', color: '#fff', stroke: COL.ink, sw: 5, alpha: base * this.alpha });
    }
  }
}

});

// ---- src/game/bonus.js
__def("src/game/bonus.js", function (__exports, __req) {
__exp(__exports, { "RushStage": () => RushStage });
// =============================================================================
//  SUGAR RUSH bonus stage: a sky world full of jelly formations. The runner
//  flies (hold jump to rise) over a bouncy cloud floor. No obstacles.
// =============================================================================
const { CFG } = __req("src/config.js");
const { World } = __req("src/game/world.js");
const { makeRand } = __req("src/engine/util.js");

const GY = CFG.GROUND_Y;

class RushStage {
  constructor(run, dur) {
    this.run = run;
    this.world = new World();
    this.world.addGround(-2000, 1e9, 'rush');
    this.dur = dur; this.left = dur;
    this.genX = 520;
    this.r = makeRand();
    this.n = 0;
  }
  fill(toX) { while (this.genX < toX) this.wave(); }

  wave() {
    const w = this.world, r = this.r, x0 = this.genX;
    const kinds = ['rows', 'sine', 'stairs', 'bigs', 'coins', 'heart', 'double_sine', 'rainbow'];
    const k = this.n === 0 ? 'sine' : r.pick(kinds);
    this.n++;
    const jy = (y) => Math.max(170, Math.min(GY - 40, y));
    let len = 0;
    switch (k) {
      case 'rows': {
        len = 560;
        for (const y of [250, 370, 490]) for (let x = 0; x < len; x += 40) w.addPick(x % 200 === 0 ? 'jelly_star' : 'jelly_pink', x0 + x, y);
        break;
      }
      case 'sine': {
        len = 900;
        for (let x = 0; x < len; x += 36) w.addPick(x % 180 === 0 ? 'jelly_big' : 'jelly_star', x0 + x, jy(370 + Math.sin(x / 120) * 170));
        break;
      }
      case 'double_sine': {
        len = 840;
        for (let x = 0; x < len; x += 38) {
          w.addPick('jelly_pink', x0 + x, jy(370 + Math.sin(x / 110) * 150));
          w.addPick('jelly_star', x0 + x, jy(370 - Math.sin(x / 110) * 150));
        }
        break;
      }
      case 'stairs': {
        len = 800;
        for (let i = 0; i < 5; i++) for (let j = 0; j < 4; j++) w.addPick('jelly_star', x0 + i * 160 + j * 38, jy(500 - i * 70));
        w.addPick('jelly_rainbow', x0 + 780, 200);
        break;
      }
      case 'bigs': {
        len = 760;
        for (let i = 0; i < 6; i++) w.addPick('jelly_big', x0 + i * 130, i % 2 ? 260 : 460);
        for (let x = 0; x < len; x += 44) w.addPick('jelly_pink', x0 + x, 360);
        break;
      }
      case 'coins': {
        len = 520;
        for (let i = 0; i < 12; i++) for (let j = 0; j < 4; j++) w.addPick((i + j) % 5 === 0 ? 'coin_b' : 'coin_g', x0 + i * 44, 300 + j * 50);
        break;
      }
      case 'heart': {
        const rows = ['.##...##.', '####.####', '#########', '.#######.', '..#####..', '...###...', '....#....'];
        len = 9 * 34 + 120;
        rows.forEach((row, j) => { for (let i = 0; i < row.length; i++) if (row[i] === '#') w.addPick('jelly_pink', x0 + 60 + i * 34, 230 + j * 34); });
        w.addPick('jelly_giant', x0 + len + 90, 380);
        len += 260;
        break;
      }
      case 'rainbow': {
        len = 700;
        for (let x = 0; x < len; x += 40) w.addPick('jelly_star', x0 + x, jy(520 - Math.sin((x / len) * Math.PI) * 300));
        w.addPick('jelly_rainbow', x0 + len / 2, 170);
        break;
      }
    }
    this.genX = x0 + len + 160;
  }
}

});

// ---- src/scenes/run_view.js
__def("src/scenes/run_view.js", function (__exports, __req) {
__exp(__exports, { "renderRun": () => renderRun });
// =============================================================================
//  RunScene rendering: world layers, runner/pet, effects, HUD, banners,
//  tutorial prompts, pause overlay, debug overlay.
// =============================================================================
const { CFG } = __req("src/config.js");
const { Assets } = __req("src/engine/assets.js");
const { text, panel, ribbon, COL, rrPath } = __req("src/engine/ui.js");
const { TAU, Ease, fmt, rgba, clamp } = __req("src/engine/util.js");
const { LANDS } = __req("src/data/content.js");

const GY = CFG.GROUND_Y;

const TUT_TEXT = {
  jump: ['점프!', '화면 왼쪽을 탭하세요  ·  키보드 Space / ↑'],
  double0: ['점프!', '먼저 한 번 점프!'],
  double2: ['한 번 더!', '공중에서 한 번 더 누르면 더블 점프'],
  slide: ['슬라이드!', '화면 오른쪽을 꾹 누르세요  ·  키보드 ↓'],
  gap: ['구멍은 점프!', '떨어지면 바로 끝나요. 점프로 넘어가요'],
};

function renderRun(s, ctx) {
  const W = s.W, H = s.H;
  const r = s.runner;
  const cam = s.camX + s.shakeX;
  ctx.save();
  ctx.translate(0, s.shakeY);
  s.bg.render(ctx, W, H, cam);
  const w = s.world;
  w.renderDecos(ctx, cam, W);
  const protect = s.state === 'play' && (s.bridgeT > 0 || s.invincible || r.mode === 'float');
  w.renderGround(ctx, cam, W, protect ? 1 : 0);
  w.renderPlats(ctx, cam, W);
  w.renderSprings(ctx, cam, W);
  w.renderObstacles(ctx, cam, W, s.t);
  w.renderPicks(ctx, cam, W, s.t);
  if (s.downRunner) {
    const d = s.downRunner;
    Assets.draw(ctx, d.sheet, d.f, d.x - cam, d.y, { alpha: 0.95 });
  }
  // magnet field
  const magnet = s.pw.magnet > 0 || s.petMagnet > 0 || (s.skill && s.skill.id === 'cupcake' && s.skill.active > 0);
  if (magnet && s.state === 'play') {
    const c = r.center();
    const ph = (s.t * 1.6) % 1;
    for (let i = 0; i < 2; i++) {
      const k = (ph + i * 0.5) % 1;
      Assets.draw(ctx, 'fx', 'ring', c.x - cam, c.y, { scale: 0.4 + k * 1.1, alpha: (1 - k) * 0.35, add: true });
    }
  }
  if (s.pet) s.pet.render(ctx, cam);
  const surface = r.mode === 'fly' ? null : w.surfaceBelow(r.x, r.y - 4);
  let aura = null;
  if (s.skill && s.skill.active > 0) aura = r.skillColor;
  if (s.spurt > 0) aura = '#ffb36b';
  if (s.pw.giant > 0 && s.pw.giant < 1.2 && Math.floor(s.t * 10) % 2 === 0) aura = '#ffffff';
  r.render(ctx, cam, s.t, { surface, auraColor: aura, shield: s.pw.shield > 0, ghost: s.pw.dash > 0 ? '#9fe0ff' : r.mode === 'roll' ? '#ffd0e8' : '#ffe2b0', noBlink: s.state !== 'play' });
  for (const pr of s.projectiles) if (pr.cx != null) Assets.draw(ctx, 'pet_pop', 4, pr.cx - cam, pr.cy, { scale: 0.55, rot: 0.2 });
  s.fx.render(ctx, cam, 0, false);
  for (const p of s.popups) {
    if (p.screen) continue;
    const k = p.t / p.dur;
    const sc = k < 0.15 ? Ease.outBack(k / 0.15) : 1;
    text(ctx, p.txt, p.x - cam, p.y, { size: p.size * sc, font: 'num', color: p.color, stroke: COL.ink, sw: Math.max(4, p.size * 0.2), alpha: k > 0.7 ? 1 - (k - 0.7) / 0.3 : 1 });
  }
  ctx.restore();

  // ---------------------------------------------------------- screen fx
  if (s.state === 'play' && (s.pw.dash > 0 || r.mode === 'roll' || s.spurt > 0)) speedLines(ctx, s, W, H);
  if (s.state === 'rush' || s.state === 'rushIn') speedLines(ctx, s, W, H, 0.5);
  const lowE = s.energy / s.maxEnergy;
  if ((s.state === 'play' && lowE < CFG.LOW_ENERGY) || s.hitVig > 0) {
    const p = s.hitVig > 0 ? s.hitVig : (0.5 + 0.5 * Math.sin(s.t * 6)) * (1 - lowE / CFG.LOW_ENERGY) * 0.8;
    const g = ctx.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, W * 0.7);
    g.addColorStop(0, 'rgba(255,40,60,0)'); g.addColorStop(1, `rgba(255,40,60,${0.45 * p})`);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  }
  if (s.flash > 0) { ctx.save(); ctx.globalAlpha = Math.min(1, s.flash); ctx.fillStyle = s.flashColor; ctx.fillRect(0, 0, W, H); ctx.restore(); }
  s.fx.render(ctx, 0, 0, true);
  for (const p of s.popups) {
    if (!p.screen) continue;
    const k = p.t / p.dur;
    const sc = k < 0.15 ? Ease.outBack(k / 0.15) : 1;
    text(ctx, p.txt, p.x, p.y, { size: p.size * sc, font: /[가-힣]/.test(p.txt) ? 'display' : 'num', color: p.color, stroke: COL.ink, sw: Math.max(4, p.size * 0.2), alpha: k > 0.7 ? 1 - (k - 0.7) / 0.3 : 1 });
  }

  // ---------------------------------------------------------- HUD
  s.hud.alpha = s.state === 'over' ? Math.max(0, 1 - s.stateT * 1.5) : 1;
  s.hud.render(ctx);
  if (s.state !== 'over') s.ui.draw(ctx);

  // ---------------------------------------------------------- banners
  for (const b of s.banners) {
    const k = b.t / b.dur;
    const sIn = Ease.outBack(Math.min(1, b.t / 0.28));
    const a = k > 0.8 ? 1 - (k - 0.8) / 0.2 : 1;
    ctx.save();
    ctx.translate(W / 2, b.y);
    ctx.scale(sIn, sIn);
    ctx.rotate(Math.sin(b.t * 5) * 0.02);
    text(ctx, b.txt, 0, 0, { size: b.size, font: /[가-힣]/.test(b.txt) ? 'display' : 'num', color: b.color, stroke: COL.ink, sw: Math.max(6, b.size * 0.17), alpha: a, shadow: { dx: 0, dy: 5, color: 'rgba(74,42,26,0.45)' } });
    if (b.sub) text(ctx, b.sub, 0, b.size * 0.78, { size: b.size * 0.5, color: '#fff', stroke: COL.ink, sw: 6, alpha: a });
    ctx.restore();
  }

  if (s.tut.cur) tutorialPrompt(ctx, s, W, H);
  if (s.paused) pauseOverlay(ctx, s, W, H);
  if (s.game.debug) debugOverlay(ctx, s, cam);
}

function speedLines(ctx, s, W, H, amt = 1) {
  ctx.save();
  for (let i = 0; i < 12 * amt; i++) {
    const sp = 1900 + (i % 4) * 300;
    const x = W + 200 - ((s.t * sp + i * 397) % (W + 600));
    const y = 70 + ((i * 137) % 560);
    Assets.draw(ctx, 'fx', 'speedline', x, y, { scale: 0.6 + (i % 3) * 0.25, alpha: 0.4, add: true });
  }
  ctx.restore();
}

function tutorialPrompt(ctx, s, W, H) {
  const c = s.tut.cur;
  const key = c.kind === 'double' ? (c.stage === 2 ? 'double2' : 'double0') : c.kind;
  if (c.kind === 'double' && c.stage === 1) return;
  const [t1, t2] = TUT_TEXT[key];
  ctx.save();
  ctx.fillStyle = 'rgba(30,12,20,0.28)'; ctx.fillRect(0, 0, W, H);
  ctx.restore();
  const pw = 640, ph = 120, px = W / 2 - pw / 2, py = 150;
  panel(ctx, px, py, pw, ph, { r: 28 });
  text(ctx, t1, W / 2, py + 44, { size: 44, color: COL.pink, stroke: COL.ink, sw: 8 });
  text(ctx, t2, W / 2, py + 92, { size: 21, font: 'bold', color: COL.ink, maxW: pw - 40 });
  const isSlide = c.kind === 'slide';
  const bx = isSlide ? W - 96 : 96, by = H - 92;
  const p = (s.t * 2.2) % 1;
  ctx.save();
  ctx.strokeStyle = `rgba(255,255,255,${1 - p})`; ctx.lineWidth = 6;
  ctx.beginPath(); ctx.arc(bx, by, 62 + p * 40, 0, TAU); ctx.stroke();
  ctx.restore();
  const bob = Math.sin(s.t * 8) * 10;
  ctx.save();
  ctx.translate(bx, by - 110 + bob);
  ctx.fillStyle = '#ffe680'; ctx.strokeStyle = COL.ink; ctx.lineWidth = 5; ctx.lineJoin = 'round';
  ctx.beginPath(); ctx.moveTo(-22, -30); ctx.lineTo(22, -30); ctx.lineTo(22, 0); ctx.lineTo(40, 0); ctx.lineTo(0, 38); ctx.lineTo(-40, 0); ctx.lineTo(-22, 0); ctx.closePath();
  ctx.fill(); ctx.stroke();
  ctx.restore();
}

function pauseOverlay(ctx, s, W, H) {
  ctx.save(); ctx.fillStyle = 'rgba(30,12,20,0.62)'; ctx.fillRect(0, 0, W, H); ctx.restore();
  const pw = 440, ph = 470, px = W / 2 - pw / 2, py = H / 2 - 210;
  panel(ctx, px, py, pw, ph, { r: 32 });
  ribbon(ctx, W / 2, py + 6, 300, '일시 정지', 'purple', 30);
  text(ctx, `${fmt(s.score)}점  ·  LAND ${s.landNo}  ·  ${fmt(s.dist)}m`, W / 2, py + 64, { size: 19, font: 'bold', color: COL.ink2 });
  s.pauseUI.draw(ctx);
  text(ctx, '배경음', s.musicBtn.x, H / 2 + 246, { size: 15, font: 'bold', color: COL.ink2 });
  text(ctx, '효과음', s.sfxBtn.x, H / 2 + 246, { size: 15, font: 'bold', color: COL.ink2 });
  if (s.fsBtn) text(ctx, '전체 화면', s.fsBtn.x, H / 2 + 246, { size: 15, font: 'bold', color: COL.ink2 });
}

function debugOverlay(ctx, s, cam) {
  const r = s.runner;
  ctx.save();
  ctx.lineWidth = 2;
  const hb = r.hitbox();
  ctx.strokeStyle = '#00ff88'; ctx.strokeRect(hb.x - cam, hb.y, hb.w, hb.h);
  ctx.strokeStyle = '#ff3355';
  for (const o of s.world.obs) if (!o.smashed && o.hit.w) ctx.strokeRect(o.hit.x - cam, Math.max(-5, o.hit.y), o.hit.w, o.hit.h - Math.max(0, -5 - o.hit.y));
  ctx.strokeStyle = 'rgba(80,160,255,0.7)';
  for (const p of s.world.picks) if (!p.taken) { ctx.beginPath(); ctx.arc(p.x - cam, p.y, p.r, 0, TAU); ctx.stroke(); }
  ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(8, s.H - 150, 420, 140);
  ctx.fillStyle = '#fff'; ctx.font = '14px monospace'; ctx.textAlign = 'left';
  const lines = [
    `fps ${s.game.fps.toFixed(0)}  state ${s.state}  mode ${r.mode}`,
    `speed ${s.curV.toFixed(0)}  land ${s.landIdx} lap ${s.lap}  t ${s.gen.landClock.toFixed(1)}`,
    `x ${r.x.toFixed(0)} y ${r.y.toFixed(0)} vy ${r.vy.toFixed(0)} g ${r.grounded} j ${r.jumps}`,
    `energy ${s.energy.toFixed(1)}/${s.maxEnergy}  drain ${s.drain().toFixed(2)}/s`,
    `picks ${s.world.picks.length} obs ${s.world.obs.length} ground ${s.world.ground.length} fx ${s.fx.list.length}`,
    `keys: G M D C V B items, L letter, E energy, Q skill, N next land, O die`,
  ];
  lines.forEach((ln, i) => ctx.fillText(ln, 16, s.H - 128 + i * 20));
  ctx.restore();
  void rrPath; void rgba; void clamp; void LANDS; void GY; void ribbon;
}

});

// ---- src/scenes/run.js
__def("src/scenes/run.js", function (__exports, __req) {
__exp(__exports, { "RunScene": () => RunScene });
// =============================================================================
//  RunScene — the actual game: running, collisions, scoring, power-ups, skills,
//  pets, SUGAR RUSH bonus, revive / relay / last spurt, lands, tutorial, pause.
// =============================================================================
const { CFG, LAND_IDS } = __req("src/config.js");
const { Scene, Modal } = __req("src/engine/scene.js");
const { Button, UIGroup } = __req("src/engine/ui.js");
const { Particles } = __req("src/engine/particles.js");
const { approach, circleRect, clamp, rand, rectsOverlap, TAU, buzz } = __req("src/engine/util.js");
const { World } = __req("src/game/world.js");
const { Generator } = __req("src/game/generator.js");
const { Background } = __req("src/game/background.js");
const { Runner } = __req("src/game/player.js");
const { Pet } = __req("src/game/pet.js");
const { HUD } = __req("src/game/hud.js");
const { RushStage } = __req("src/game/bonus.js");
const { Progress } = __req("src/game/progress.js");
const { CHAR, LANDS, POWERUPS } = __req("src/data/content.js");
const { Save } = __req("src/engine/storage.js");
const { renderRun } = __req("src/scenes/run_view.js");
const { fsButton } = __req("src/scenes/common.js");
const { Display } = __req("src/engine/display.js");

const GY = CFG.GROUND_Y;
const JELLY_SCALE = [0, 2, 4, 7, 9, 12, 14, 16, 19, 16, 14, 12, 9, 7, 4, 2];
const LETTER_STEPS = [0, 2, 4, 5, 7, 9, 11, 12, 14];

class RunScene extends Scene {
  enter(p) {
    const g = this.game;
    this.params = p;
    this.charId = p.char;
    this.boosts = p.boosts || {};
    this.tutorialRun = !!p.tutorial;
    this.mods = Progress.mods(this.charId);
    this.world = new World();
    this.world.addGround(-1200, 0, 'meadow');
    this.mainWorld = this.world;
    this.gen = new Generator(this, { tutorial: this.tutorialRun });
    this.bg = new Background();
    this.bg.set('meadow', true);
    this.fx = new Particles(1100);
    this.fx.quality = Save.data.settings.quality === 'high' ? 1 : 0.55;
    this.hud = new HUD(this);
    this.runner = new Runner(this, this.charId);
    this.pet = p.pet ? new Pet(this, p.pet) : null;

    this.score = 0; this.coins = 0; this.coinAcc = 0; this.jellies = 0;
    this.combo = 0; this.maxCombo = 0; this.dist = 0;
    this.maxEnergy = this.mods.maxEnergy + (this.boosts.energy ? 30 : 0);
    this.energy = this.maxEnergy;
    this.letters = new Array(9).fill(false);
    if (this.boosts.letters) this.letters[0] = this.letters[1] = this.letters[2] = true;
    this.pw = { magnet: 0, giant: 0, dash: 0, coins: 0, shield: 0 };
    this.pwDur = { magnet: 1, giant: 1, dash: 1, coins: 1, shield: 1 };
    this.petMagnet = 0;
    this.skill = this.makeSkill(this.charId);
    this.saves = { cotton: this.charId === 'cotton', revive: !!this.boosts.revive, relay: p.relay && p.relay !== this.charId && Progress.owned(p.relay) ? p.relay : null };
    this.spurt = 0; this.spurtUsed = false;
    this.stats = { jumps: 0, djumps: 0, slideTime: 0, smash: 0, rush: 0, skills: 0, milk: 0, items: 0, cleanLand: 0, relay: 0, hits: 0, hitsLand: 0 };

    this.speed = this.gen.speed(); this.speedTarget = this.speed; this.curV = this.speed;
    this.landIdx = 0; this.lap = 0; this.landNo = 1;
    this.state = 'intro'; this.stateT = 0;
    this.camX = -CFG.PLAYER_SX;
    this.runner.x = -CFG.PLAYER_SX - 160;
    if (this.pet) this.pet.place(this.runner.x - 80, 430);
    this.bridgeT = 0; this.hitStop = 0; this.timeScale = 1;
    this.shake = 0; this.shakeX = 0; this.shakeY = 0;
    this.flash = 0; this.flashColor = '#ffffff'; this.hitVig = 0;
    this.popups = []; this.banners = []; this.projectiles = [];
    this.touchLeft = new Set(); this.touchSlide = new Set(); this.touchJumpQueued = false; this.touchJumpT = 0;
    this.lastJellyT = -1; this.jellyNote = 0;
    this.lowBeepT = 0; this.wasSliding = false; this.dustT = 0;
    this.downRunner = null;
    this.paused = false;
    this.tut = { cur: null, step: 0, shownMilk: false, shownLetter: !this.tutorialRun && Save.data.stats.runs > 2 };
    this.over = false;
    this.showTouch = Save.data.settings.touch !== 'off';

    this.gen.fill(this.camX + this.W + 1800);
    this.buildUI();
    g.audio.playMusic(LANDS[0].bgm, { fade: 0.4 });
    this.banner('READY?', { size: 64, dur: 0.95, color: '#ffe680' });
    g.audio.play('count_beep');
    this.visHandler = () => { if (document.hidden && !this.paused && this.state !== 'over') this.setPaused(true); };
    document.addEventListener('visibilitychange', this.visHandler);
    Display.keepAwake(true);
  }
  exit() { document.removeEventListener('visibilitychange', this.visHandler); Display.keepAwake(false); }

  buildUI() {
    this.ui.clear();
    this.pauseBtn = this.ui.add(new Button({ x: this.W - 50, y: 46, w: 58, round: true, icon: 'pause', iconSize: 40, color: 'cream', sound: 'ui_click', onClick: () => this.setPaused(true) }));
    this.pauseUI = new UIGroup(this.game);
    const W = this.W, H = this.H;
    const bw = 300, bh = 78, x = W / 2 - bw / 2;
    this.pauseUI.add(new Button({ x, y: H / 2 - 110, w: bw, h: bh, label: '계속 달리기', icon: 'play', color: 'green', key: ['confirm', 'Escape', 'KeyP'], onClick: () => this.setPaused(false) }));
    this.pauseUI.add(new Button({ x, y: H / 2 - 18, w: bw, h: bh, label: '다시 시작', icon: 'retry', color: 'orange', onClick: () => this.confirmLeave(true) }));
    this.pauseUI.add(new Button({ x, y: H / 2 + 74, w: bw, h: bh, label: '로비로', icon: 'home', color: 'pink', onClick: () => this.confirmLeave(false) }));
    const st = Save.data.settings;
    const fs = fsButton(this.game, 0, H / 2 + 200, { w: 64, iconSize: 40 });
    const xs = fs ? [W / 2 - 120, W / 2, W / 2 + 120] : [W / 2 - 80, W / 2 + 80];
    this.musicBtn = this.pauseUI.add(new Button({ x: xs[0], y: H / 2 + 200, w: 64, round: true, icon: st.music > 0 ? 'music_on' : 'music_off', iconSize: 44, color: 'cream',
      onClick: (b) => { st.music = st.music > 0 ? 0 : 0.7; this.game.applySettings(); b.icon = st.music > 0 ? 'music_on' : 'music_off'; Save.save(); } }));
    this.sfxBtn = this.pauseUI.add(new Button({ x: xs[1], y: H / 2 + 200, w: 64, round: true, icon: st.sfx > 0 ? 'sound_on' : 'sound_off', iconSize: 44, color: 'cream',
      onClick: (b) => { st.sfx = st.sfx > 0 ? 0 : 0.9; this.game.applySettings(); b.icon = st.sfx > 0 ? 'sound_on' : 'sound_off'; Save.save(); } }));
    this.fsBtn = fs;
    if (fs) { fs.x = xs[2]; this.pauseUI.add(fs); }
  }
  layout() { if (this.pauseUI) this.buildUI(); }

  setPaused(on) {
    if (this.state === 'over') return;
    this.paused = on;
    this.touchLeft.clear(); this.touchSlide.clear();
    this.game.audio.musicLevel(on ? 0.3 : 1);
    if (on) this.game.audio.play('ui_open');
  }
  confirmLeave(retry) {
    this.game.scenes.modal(new Modal(this.game, {
      title: retry ? '다시 시작' : '로비로 가기', message: '지금까지의 기록은 저장되지 않아요.\n정말 그만둘까요?', height: 330, color: 'orange',
      buttons: [{ label: '취소', color: 'grey', key: ['back'] }, { label: retry ? '다시 시작' : '로비로', color: retry ? 'orange' : 'pink', key: ['confirm'], onClick: () => { this.game.audio.musicLevel(1); this.game.audio.stopMusic(0.3); retry ? this.game.startRun(this.params) : this.game.goLobby(); } }],
    }));
  }

  // ======================================================================
  //  Helpers
  // ======================================================================
  makeSkill(id) {
    const S = CHAR[id].skill, lv = Math.max(1, Progress.charLv(id));
    const cd = S.cd(lv);
    return { id, lv, name: S.name, cd, dur: S.dur ? S.dur(lv) : 1, timer: cd * 0.5, active: 0, heal: S.heal ? S.heal(lv) : 0, revive: S.revive ? S.revive(lv) : 0, rainT: 0, spawnX: 0 };
  }
  comboMult() { return 1 + (Math.min(this.combo, CFG.COMBO_CAP) / CFG.COMBO_CAP) * CFG.COMBO_MAX_BONUS; }
  landMult() { return 1 + 0.1 * this.landIdx + 0.25 * this.lap; }
  drain() { return CFG.DRAIN_BASE + CFG.DRAIN_LAND * this.landIdx + CFG.DRAIN_LAP * this.lap; }
  letterToSpawn() {
    for (let i = 0; i < 9; i++) if (!this.letters[i] && !this.mainWorld.lettersInFlight.has(i)) return i;
    return -1;
  }
  get invincible() { return this.pw.giant > 0 || this.pw.dash > 0 || this.runner.mode === 'roll' || this.spurt > 0; }
  get immune() { return this.runner.mode === 'float'; }

  addShake(a) { if (Save.data.settings.shake) this.shake = Math.max(this.shake, a); }
  popup(x, y, txt, color = '#fff', size = 26, o = {}) { this.popups.push({ x, y, txt, color, size, t: 0, dur: o.dur ?? 0.9, vy: o.vy ?? -70, screen: !!o.screen }); if (this.popups.length > 40) this.popups.shift(); }
  /** Popup that follows the runner on screen (runner-relative offsets). */
  rpop(dx, dy, txt, color, size = 28, o = {}) { const r = this.runner; this.popup(r.x - this.camX + dx, r.y + dy, txt, color, size, { ...o, screen: true }); }
  banner(txt, o = {}) {
    this.banners.push({ txt, sub: o.sub || null, t: 0, dur: o.dur ?? 1.6, size: o.size ?? 54, color: o.color || '#ffffff', y: o.y ?? 250, icon: o.icon || null });
    if (this.banners.length > 3) this.banners.shift();
  }
  sfx(name, o) { return this.game.audio.play(name, o); }

  // ======================================================================
  //  Input
  // ======================================================================
  pointer(type, p) {
    if (this.paused) { this.pauseUI.pointer(type, p); return true; }
    if (this.ui.pointer(type, p)) return true;
    if (type === 'down') {
      if (p.x < this.W / 2) { this.touchLeft.add(p.id); this.touchJumpQueued = true; this.touchJumpT = 0.14; }
      else this.touchSlide.add(p.id);
    } else if (type === 'up' || type === 'cancel') { this.touchLeft.delete(p.id); this.touchSlide.delete(p.id); }
    return true;
  }
  key(code, acts) {
    if (this.paused) { this.pauseUI.key(code, acts); return; }
    if (acts.includes('pause') && this.state !== 'over') { this.setPaused(true); return; }
    if (this.game.debug) this.debugKey(code);
  }
  blur() { if (!this.paused && this.state !== 'over') this.setPaused(true); }

  debugKey(code) {
    const r = this.runner;
    if (code === 'KeyG') this.activatePower('giant');
    if (code === 'KeyM') this.activatePower('magnet');
    if (code === 'KeyD') this.activatePower('dash');
    if (code === 'KeyC') this.activatePower('coins');
    if (code === 'KeyV') this.activatePower('stars');
    if (code === 'KeyB') this.activatePower('shield');
    if (code === 'KeyL') { for (let i = 0; i < 9; i++) if (!this.letters[i]) { this.collectLetter(i); break; } }
    if (code === 'KeyE') this.energy = this.maxEnergy;
    if (code === 'KeyQ') this.skill.timer = 0.01;
    if (code === 'KeyN') this.gen.landClock = CFG.LAND_TIME;
    if (code === 'KeyO') this.energy = 0;
    void r;
  }

  onJump() {
    const r = this.runner;
    if (this.state !== 'play' && this.state !== 'intro') return;
    if (this.tut.cur) this.tutorialAction('jump');
    const res = r.pressJump();
    if (res === 1) {
      this.stats.jumps++;
      this.sfx('jump', { rate: 0.96 + rand() * 0.08 });
      this.dust(r.x - 8, r.y, 4);
    } else if (res === 2) {
      this.stats.djumps++;
      this.sfx('jump2');
      this.fx.spawn({ x: r.x, y: r.y - 10, sprite: ['fx', 'ring'], size: 0.15, size1: 0.6, life: 0.3, alpha: 0.8, add: true });
    }
  }

  // ======================================================================
  //  Update
  // ======================================================================
  update(dt) {
    this.t += dt;
    this.tw.update(dt);
    this.ui.update(dt);
    this.pauseUI.update(dt);
    if (this.paused) return;
    const inp = this.game.input;
    if (inp.wasPressed('jump') || this.touchJumpQueued) this.onJump();
    this.touchJumpQueued = false;
    if (this.touchJumpT > 0) this.touchJumpT -= dt;
    const slideHeld = inp.isDown('slide') || this.touchSlide.size > 0;
    const jumpHeld = inp.isDown('jump') || this.touchLeft.size > 0;
    this.runner.slideHeld = slideHeld && (this.state === 'play' || this.state === 'intro');
    this.runner.thrust = jumpHeld;
    if (this.tut.cur && slideHeld) this.tutorialAction('slide');

    let ts = this.timeScale;
    if (this.hitStop > 0) { this.hitStop -= dt; ts *= 0.2; }
    const gdt = Math.min(dt, 1 / 20) * ts;
    const n = Math.max(1, Math.ceil(gdt / (1 / 120)));
    for (let i = 0; i < n; i++) this.step(gdt / n);
    this.fx.update(gdt);
    this.bg.update(gdt, this.state === 'rush' ? CFG.RUSH_SPEED : this.curV);
    this.hud.update(dt);
    for (const p of this.popups) { p.t += dt; p.y += p.vy * dt; }
    this.popups = this.popups.filter((p) => p.t < p.dur);
    for (const b of this.banners) b.t += dt;
    this.banners = this.banners.filter((b) => b.t < b.dur);
    this.shake = Math.max(0, this.shake - dt * 2.4);
    const a = this.shake * this.shake * 14;
    this.shakeX = (rand() * 2 - 1) * a; this.shakeY = (rand() * 2 - 1) * a;
    this.flash = Math.max(0, this.flash - dt * 2.2);
    this.hitVig = Math.max(0, this.hitVig - dt * 2);
  }

  step(dt) {
    this.stateT += dt;
    switch (this.state) {
      case 'intro': this.introStep(dt); break;
      case 'play': this.playStep(dt); break;
      case 'rushIn': this.rushInStep(dt); break;
      case 'rush': this.rushStep(dt); break;
      case 'rushOut': this.rushOutStep(dt); break;
      case 'dying': this.dyingStep(dt); break;
      case 'revive': this.reviveStep(dt); break;
      case 'relay': this.relayStep(dt); break;
      case 'over': this.overStep(dt); break;
    }
    for (const pr of this.projectiles) this.projStep(pr, dt);
    this.projectiles = this.projectiles.filter((pr) => !pr.done);
  }

  introStep(dt) {
    const r = this.runner;
    this.curV = this.speed;
    r.step(dt, this.world, { speed: this.speed * 1.15, bridge: true });
    if (this.pet) this.pet.update(dt, r, false);
    if (r.x > -70 && !this.goShown) { this.goShown = true; this.banner('GO!', { size: 84, dur: 0.8, color: '#9dff7a' }); this.sfx('count_go'); }
    if (r.x >= 0) {
      this.state = 'play'; this.stateT = 0;
      if (this.boosts.dash) { this.pw.dash = 5; this.pwDur.dash = 5; this.sfx('dash_on'); this.banner('스타트 대시!', { size: 44, color: '#86ceff', y: 300 }); }
      if (this.boosts.magnet) { this.pw.magnet = 12; this.pwDur.magnet = 12; }
    }
  }

  playStep(dt) {
    const r = this.runner;
    this.speed = approach(this.speed, this.speedTarget, 60 * dt);
    let v = this.speed;
    if (this.pw.dash > 0) v *= CFG.DASH_MULT;
    if (r.mode === 'roll') v *= 1.45;
    if (this.spurt > 0) v *= 1.5;
    if (this.pw.giant > 0) v *= 1.06;
    this.curV = v;
    const inv = this.invincible;
    const bridge = inv || this.bridgeT > 0 || r.mode === 'float';
    const ev = r.step(dt, this.world, { speed: v, bridge, floatY: r.mode === 'float' ? 300 : null });
    if (ev === 'land') this.onLand();
    else if (ev === 'bufferedJump') { this.stats.jumps++; this.sfx('jump'); }
    if (r.sliding && !this.wasSliding) { this.sfx('slide', { vol: 0.8 }); }
    this.wasSliding = r.sliding;
    if (r.sliding) { this.stats.slideTime += dt; if (rand() < dt * 30) this.fx.spawn({ x: r.x - 30, y: GY - 4, vx: -120 - rand() * 80, vy: -40 - rand() * 60, ay: 300, life: 0.35, sprite: ['fx', 'dust_1'], size: 0.25, size1: 0.45, alpha: 0.7 }); }
    else if (r.grounded && r.mode === 'run') { this.dustT -= dt; if (this.dustT <= 0) { this.dustT = 0.3; this.fx.spawn({ x: r.x - 18, y: r.y - 4, vx: -60, vy: -20, life: 0.4, sprite: ['fx', 'dust_0'], size: 0.22 * r.scale, size1: 0.42 * r.scale, alpha: 0.5 }); } }
    if (this.pw.giant > 0 && r.grounded) { this.giantStepT = (this.giantStepT || 0) - dt; if (this.giantStepT <= 0) { this.giantStepT = 0.34; this.addShake(0.35); this.sfx('giant_step', { vol: 0.55 }); this.dust(r.x + 10, r.y, 3); } }

    // energy & timers
    if (this.spurt > 0) { this.spurt -= dt; this.energy = 0; if (this.spurt <= 0) { this.die('down'); return; } }
    else if (!this.tut.cur) this.energy -= this.drain() * dt;
    if (this.energy > this.maxEnergy) this.energy = this.maxEnergy;
    this.timers(dt);

    // world interaction
    this.obstacles(dt, r, v);
    if (this.state !== 'play') return;
    this.pickups(dt, r, v);
    this.springs(r);
    this.updateSkill(dt);
    this.updatePet(dt);
    r.pushTrail(dt, this.pw.dash > 0 || r.mode === 'roll' || this.spurt > 0);
    if (r.mode === 'roll') r.rollAngle += dt * v / 42;
    this.dist += (v * dt) / 10;

    // lands
    const tr = this.gen.transitions[0];
    if (tr && r.x >= tr.x) { this.gen.transitions.shift(); this.enterLand(tr); }
    this.camX = r.x - CFG.PLAYER_SX;
    this.gen.fill(this.camX + this.W + 1800);
    this.world.cull(this.camX - 500);

    this.tutorialCheck(r, v);

    // fail states
    if (!r.grounded && r.y > GY + 26 && !bridge && r.mode === 'run') { this.die('pit'); return; }
    if (this.energy <= 0 && this.spurt <= 0) this.exhausted();
    const low = this.energy / this.maxEnergy < CFG.LOW_ENERGY;
    if (low) { this.lowBeepT -= dt; if (this.lowBeepT <= 0) { this.lowBeepT = 1.1; this.sfx('low_energy', { vol: 0.8 }); } }
  }

  timers(dt) {
    const r = this.runner, pw = this.pw;
    if (pw.magnet > 0) pw.magnet -= dt;
    if (pw.coins > 0) pw.coins -= dt;
    if (pw.shield > 0) pw.shield -= dt;
    if (this.petMagnet > 0) this.petMagnet -= dt;
    if (this.bridgeT > 0) this.bridgeT -= dt;
    if (pw.giant > 0) { pw.giant -= dt; if (pw.giant <= 0) { r.targetScale = r.mode === 'float' ? 1.2 : 1; this.sfx('giant_off'); r.invuln = Math.max(r.invuln, 1.1); this.bridgeT = Math.max(this.bridgeT, 0.7); } }
    if (pw.dash > 0) { pw.dash -= dt; if (pw.dash <= 0) { r.invuln = Math.max(r.invuln, 1.1); this.bridgeT = Math.max(this.bridgeT, 0.6); } }
    if (r.skillPose > 0) r.skillPose -= dt;
  }

  onLand() {
    const r = this.runner;
    this.dust(r.x, r.y, r.scale > 1.5 ? 6 : 3);
    this.sfx('land', { vol: 0.45 });
    if (r.scale > 1.5) { this.addShake(0.5); this.sfx('giant_step'); }
  }
  dust(x, y, n) {
    this.fx.burst(n, (i, k) => ({ x: x + (i - k / 2) * 10, y: y - 4, vx: (i - k / 2) * 50 - 40, vy: -40 - rand() * 50, ay: 120, life: 0.45, sprite: ['fx', 'dust_' + (i % 3)], size: 0.3, size1: 0.55, alpha: 0.75 }));
  }

  // ---------------------------------------------------------------- obstacles
  obstacles(dt, r, v) {
    const hb = r.hitbox();
    const inv = this.invincible, immune = this.immune;
    for (const o of this.world.obs) {
      if (o.smashed) { o.t += dt; o.x += o.vx * dt; o.y += o.vy * dt; o.vy += 2600 * dt; o.rot += o.vr * dt; continue; }
      const dx = o.x - r.x;
      if (o.kind === 'fall') {
        if (o.state === 'hanging' && dx < v * 1.28) { o.state = 'shake'; o.t = 0; this.sfx('crumble', { vol: 0.8 }); }
        else if (o.state === 'shake') { o.t += dt; if (o.t > 0.22) { o.state = 'falling'; o.vy = 0; } }
        else if (o.state === 'falling') {
          o.vy += 4200 * dt; o.y += o.vy * dt;
          if (o.y >= GY) { o.y = GY; o.state = 'rest'; this.addShake(0.25); this.dust(o.x, GY, 4); }
          this.world.updateHit(o);
        }
        if (o.state === 'hanging' || o.state === 'shake') continue;
      } else if (o.kind === 'pop') {
        if (o.state === 'hidden') { if (dx < v * 0.6) { o.state = 'popped'; o.t = 0; this.world.updateHit(o); this.sfx('pop_spike', { vol: 0.9 }); this.fx.burst(5, () => ({ x: o.x + rand.range(-20, 20), y: GY - 10, vx: rand.range(-90, 90), vy: rand.range(-260, -120), ay: 900, life: 0.5, shape: 'circle', w: 6, color: '#dff6ff', alpha: 0.9 })); } else continue; }
        else o.t += dt;
      }
      if (dx > 900) { if (o.kind !== 'beam') break; else continue; }
      if (immune) continue;
      if (!rectsOverlap(hb, o.hit)) continue;
      if (inv) { this.smash(o); continue; }
      if (this.pw.shield > 0) { this.pw.shield = 0; this.smash(o); this.sfx('shield_break'); r.invuln = Math.max(r.invuln, 0.9); continue; }
      if (r.invuln > 0) continue;
      this.hitObstacle(o, hb);
      return;
    }
  }
  smash(o, silent = false) {
    if (o.smashed) return;
    o.smashed = true; o.t = 0;
    o.vx = 520 + this.curV * 0.4; o.vy = -820 - rand() * 300; o.vr = 8 + rand() * 8;
    if (o.kind === 'beam') o.vy = -1200;
    if (silent) return;
    this.score += CFG.SCORE.smash;
    this.stats.smash++;
    this.sfx('smash', { rate: 0.95 + rand() * 0.1 });
    const cx = o.kind === 'beam' ? o.x + o.w / 2 : o.x, cy = o.kind === 'hang' || o.kind === 'beam' ? CFG.OVERHEAD_Y - 40 : o.y - 40;
    this.fx.spawn({ x: cx, y: cy, anim: ['fx', ['smash_0', 'smash_1', 'smash_2', 'smash_3'], 16], life: 0.25, size: 0.8, alpha: 1, alpha1: 1 });
    this.fx.burst(8, () => ({ x: cx, y: cy, vx: rand.range(-200, 420), vy: rand.range(-520, -100), ay: 1400, vr: rand.range(-10, 10), life: 0.8, sprite: ['fx', 'chip_bit_' + rand.int(0, 2)], size: rand.range(0.8, 1.3), alpha: 1, alpha1: 0.2 }));
    this.popup(cx, cy - 30, `+${CFG.SCORE.smash}`, '#ffe680', 24);
    this.addShake(0.3);
  }
  hitObstacle(o, hb) {
    const r = this.runner;
    const dmg = CFG.HIT_DAMAGE + CFG.HIT_DAMAGE_LAND * this.landIdx + this.lap * 2;
    this.energy -= dmg;
    r.invuln = CFG.INVULN_HIT; r.hurtT = 0.36; r.flashT = 0.3;
    this.combo = 0;
    this.stats.hits++; this.stats.hitsLand++;
    this.hitStop = 0.07; this.hitVig = 1; this.addShake(0.55);
    this.hud.barShake = 1;
    this.sfx('hit');
    buzz(70, Save.data.settings.vibrate);
    const cx = clamp(o.hit.x + o.hit.w / 2, hb.x, hb.x + hb.w), cy = clamp(o.hit.y + o.hit.h, hb.y + 10, hb.y + hb.h - 10);
    this.fx.spawn({ x: cx + 10, y: cy, anim: ['fx', ['hit_0', 'hit_1'], 12], life: 0.22, size: 0.6, alpha: 1, alpha1: 0.6 });
    this.rpop(0, -120, `-${dmg}`, '#ff6b6b', 30);
  }

  springs(r) {
    if (r.mode !== 'run') return;
    for (const s of this.world.springs) {
      if (s.t > 0) s.t -= 1 / 120;
      const dx = Math.abs(s.x - r.x);
      if (dx > 38 * r.scale) continue;
      if (r.vy >= 0 && r.y >= GY - 34 && r.y <= GY + 4) {
        r.bounce(CFG.SPRING_V); s.t = 0.18;
        this.sfx('spring');
        this.fx.spawn({ x: s.x, y: GY - 20, sprite: ['fx', 'ring'], size: 0.2, size1: 0.7, life: 0.3, alpha: 0.8, add: true });
      }
    }
  }

  // ---------------------------------------------------------------- pickups
  pickups(dt, r, v) {
    const hb = r.hitbox();
    const pad = r.scale > 1.2 ? 14 : 6;
    const box = { x: hb.x - pad, y: hb.y - pad, w: hb.w + pad * 2, h: hb.h + pad * 2 };
    const c = r.center();
    const cupcake = this.skill && this.skill.id === 'cupcake' && this.skill.active > 0;
    const magnet = this.pw.magnet > 0 || this.petMagnet > 0 || cupcake || this.state === 'rush';
    const magR = this.state === 'rush' ? 150 : CFG.MAGNET_R * (r.scale > 1.2 ? 1.25 : 1);
    const toCoins = this.pw.coins > 0 || cupcake;
    const viewR = this.camX + this.W + 80;
    const maca = this.skill && this.skill.id === 'maca' && this.skill.active > 0;
    for (const p of this.world.picks) {
      if (p.taken) { p.t += dt; continue; }
      if (p.born > 0 && p.born < 1) p.born = Math.min(1, p.born + dt * 4);
      if (p.fall) {
        p.vy += 1700 * dt; p.y += p.vy * dt; if (p.vx) p.x += p.vx * dt;
        if (p.y >= p.restY) { p.y = p.restY; p.fall = false; p.vx = 0; }
        if (p.y > 1000) { p.taken = true; p.t = 99; continue; }
      }
      if (p.x > r.x + 1500) continue;
      if (p.x < viewR && p.kind.startsWith('jelly')) {
        if (toCoins && !p.mag) this.toCoin(p);
        else if (maca && !p.bloom && (p.kind === 'jelly' || p.kind === 'jelly_pink' || p.kind === 'jelly_choco' || p.kind === 'jelly_star')) {
          p.bloom = true;
          p.kind = p.kind === 'jelly_star' ? 'jelly_big' : 'jelly_star'; p.r = p.kind === 'jelly_big' ? 34 : 20;
          if (rand() < 0.35) this.fx.spawn({ x: p.x, y: p.y, anim: ['fx', ['spark_0', 'spark_1', 'spark_2', 'spark_3'], 20], life: 0.2, size: 0.5, add: true });
        }
      }
      const dx = c.x - p.x, dy = c.y - p.y;
      if (!p.mag && magnet && p.x > r.x - 60 && dx * dx + dy * dy < magR * magR) { p.mag = true; p.magT = 0; }
      if (p.mag) {
        p.magT += dt;
        const d = Math.hypot(dx, dy) || 1;
        const sp = 700 + 2600 * Math.min(1, p.magT * 2);
        p.x += (dx / d) * sp * dt + v * dt * 0.6;
        p.y += (dy / d) * sp * dt;
      }
      if (circleRect(p.x, p.y, p.r, box)) this.collect(p, r);
    }
  }
  toCoin(p) {
    const k = p.kind;
    p.kind = k === 'jelly_giant' || k === 'jelly_rainbow' ? 'coin_b' : k === 'jelly_big' || k === 'jelly_star' ? 'coin_g' : 'coin_s';
    p.r = p.kind === 'coin_b' ? 30 : 16;
  }
  collect(p, r) {
    p.taken = true; p.t = 0;
    const k = p.kind;
    if (k.startsWith('jelly')) {
      const base = CFG.SCORE[k] || 30;
      const val = Math.round(base * this.mods.jellyMult * this.comboMult() * this.landMult() * (this.state === 'rush' ? 1.5 : 1));
      this.score += val; this.jellies++;
      this.addCombo();
      this.hud.scorePop = Math.min(1, this.hud.scorePop + 0.25);
      if (k === 'jelly_big') {
        this.sfx('jelly_big'); this.popup(p.x, p.y - 30, `+${val}`, '#ffe680', 28);
        this.fx.spawn({ x: p.x, y: p.y, anim: ['fx', ['spark_0', 'spark_1', 'spark_2', 'spark_3'], 20], life: 0.2, size: 1.2, add: true });
      } else if (k === 'jelly_rainbow' || k === 'jelly_giant') {
        this.sfx('jelly_rainbow'); this.popup(p.x, p.y - 40, `+${val}`, '#ffb3f0', k === 'jelly_giant' ? 40 : 32, { dur: 1.2 });
        this.fx.burst(14, (i, n) => { const a = (i / n) * TAU; return { x: p.x, y: p.y, vx: Math.cos(a) * 340, vy: Math.sin(a) * 340, drag: 3, life: 0.6, sprite: ['fx', 'star_small'], size: 1, size1: 0.3, add: true }; });
        this.addShake(0.2);
      } else {
        this.jellySound(k === 'jelly_star' ? 1 : 0.85);
        if (rand() < 0.5) this.fx.spawn({ x: p.x, y: p.y, anim: ['fx', ['spark_0', 'spark_1', 'spark_2', 'spark_3'], 24], life: 0.17, size: k === 'jelly_star' ? 0.6 : 0.4, add: true });
      }
    } else if (k.startsWith('coin')) {
      const val = CFG.COIN[k[5]] * this.mods.coinMult;
      this.coinAcc += val; this.coins = Math.floor(this.coinAcc);
      this.addCombo();
      this.hud.coinPop = 1;
      this.sfx(k === 'coin_b' ? 'coin_big' : 'coin', { rate: 0.97 + rand() * 0.07, vol: 0.85, max: 6 });
      if (rand() < 0.6) this.fx.spawn({ x: p.x, y: p.y, anim: ['fx', ['glint_0', 'glint_1', 'glint_2', 'glint_3'], 18], life: 0.22, size: 0.6, add: true });
    } else if (k === 'milk_s' || k === 'milk_l') {
      const heal = (k === 'milk_l' ? CFG.MILK_L : CFG.MILK_S) * this.mods.milkMult;
      this.energy = Math.min(this.maxEnergy, this.energy + heal);
      this.stats.milk++;
      this.sfx('milk');
      this.rpop(0, -130, `+${Math.round(heal)}`, '#8dff7a', 30);
      this.fx.burst(8, () => ({ x: r.x + rand.range(-30, 30), y: r.y - rand.range(20, 100), vy: -rand.range(60, 140), life: 0.7, sprite: ['fx', 'heal'], size: rand.range(0.35, 0.6), alpha: 1, add: true }));
    } else if (k.startsWith('pw:')) {
      this.stats.items++;
      this.activatePower(k.slice(3));
    } else if (k === 'letter') {
      this.collectLetter(p.idx);
    }
  }
  addCombo() {
    this.combo++;
    if (this.combo > this.maxCombo) this.maxCombo = this.combo;
    if (this.combo % 10 === 0) this.hud.comboPop = 1;
    if (this.combo % 100 === 0) { this.sfx('combo'); this.popup(this.W - 92, 262, `${this.combo} COMBO!`, '#9dff7a', 26, { dur: 1.1, screen: true, vy: -40 }); }
  }
  jellySound(vol) {
    if (this.t - this.lastJellyT < 0.3) this.jellyNote++; else this.jellyNote = 0;
    this.lastJellyT = this.t;
    const semi = JELLY_SCALE[this.jellyNote % JELLY_SCALE.length];
    this.sfx('jelly', { rate: Math.pow(2, semi / 12), vol, max: 6 });
  }

  activatePower(type) {
    const r = this.runner;
    const dur = (CFG.DUR[type] || 5) * this.mods.itemMult;
    this.sfx('item');
    switch (type) {
      case 'magnet': this.pw.magnet = Math.max(this.pw.magnet, dur); this.sfx('magnet'); break;
      case 'giant': this.pw.giant = Math.max(this.pw.giant, dur); r.targetScale = CFG.GIANT_SCALE; this.sfx('giant_on'); this.addShake(0.4); break;
      case 'dash': this.pw.dash = Math.max(this.pw.dash, dur); this.sfx('dash_on'); break;
      case 'coins': this.pw.coins = Math.max(this.pw.coins, dur); this.sfx('convert'); break;
      case 'shield': this.pw.shield = Math.max(this.pw.shield, dur); this.sfx('shield_on'); break;
      case 'stars': this.convertStars(); this.sfx('convert'); break;
    }
    if (this.pw[type] !== undefined) this.pwDur[type] = this.pw[type];
    this.banner(POWERUPS[type].name, { size: 46, dur: 1.2, color: POWERUPS[type].color, y: 300 });
    this.fx.spawn({ x: r.x, y: r.y - 50 * r.scale, sprite: ['fx', 'ring_gold'], size: 0.3, size1: 1.4, life: 0.4, alpha: 0.9, add: true });
  }
  convertStars() {
    const viewR = this.camX + this.W + 300;
    for (const p of this.world.picks) {
      if (p.taken || p.x > viewR || !p.kind.startsWith('jelly')) continue;
      if (p.kind === 'jelly' || p.kind === 'jelly_pink' || p.kind === 'jelly_choco') { p.kind = 'jelly_star'; p.r = 20; }
      else if (p.kind === 'jelly_star') { p.kind = 'jelly_big'; p.r = 34; }
      if (rand() < 0.4) this.fx.spawn({ x: p.x, y: p.y, anim: ['fx', ['spark_0', 'spark_1', 'spark_2', 'spark_3'], 20], life: 0.2, size: 0.7, add: true });
    }
    this.flash = 0.35; this.flashColor = '#fff3b0';
  }

  collectLetter(idx) {
    if (this.letters[idx]) return;
    this.letters[idx] = true;
    this.mainWorld.lettersInFlight.delete(idx);
    this.hud.letterPop[idx] = 1;
    this.sfx('letter', { rate: Math.pow(2, LETTER_STEPS[idx] / 12) });
    const r = this.runner;
    this.fx.burst(10, (i, n) => { const a = (i / n) * TAU; return { x: r.x, y: r.y - 60, vx: Math.cos(a) * 260, vy: Math.sin(a) * 260, drag: 4, life: 0.5, sprite: ['fx', 'star_small'], size: 0.8, size1: 0.2, add: true }; });
    if (this.letters.every(Boolean)) this.tw.after(0.25, () => { if (this.state === 'play') this.startRush(); });
    else if (!this.tut.shownLetter) { this.tut.shownLetter = true; this.game.toast('S·U·G·A·R·R·U·S·H 글자를 모두 모으면 보너스 스테이지!', { icon: 'star', dur: 3.2 }); }
  }

  // ---------------------------------------------------------------- skills
  updateSkill(dt) {
    const sk = this.skill;
    if (!sk) return;
    if (sk.active > 0) {
      sk.active -= dt;
      this.skillTick(sk, dt);
      if (sk.active <= 0) this.skillEnd(sk);
      return;
    }
    sk.timer -= dt;
    if (sk.timer <= 0) { sk.timer = sk.cd; this.skillStart(sk); }
  }
  skillStart(sk) {
    const r = this.runner;
    this.stats.skills++;
    this.sfx('skill_' + sk.id);
    r.skillPose = 0.45;
    this.rpop(0, -160, sk.name, '#fff6a0', 28, { dur: 1.2 });
    this.fx.spawn({ x: r.x, y: r.y - 50, sprite: ['fx', 'ring'], size: 0.3, size1: 1.3, life: 0.45, alpha: 0.8, add: true });
    switch (sk.id) {
      case 'chip': sk.active = sk.dur; sk.rainT = 0; break;
      case 'maca': sk.active = sk.dur; break;
      case 'pudding': {
        sk.active = 0.9;
        this.energy = Math.min(this.maxEnergy, this.energy + sk.heal);
        this.rpop(40, -120, `+${Math.round(sk.heal)}`, '#8dff7a', 30);
        this.fx.burst(12, () => ({ x: r.x + rand.range(-40, 40), y: r.y - rand.range(10, 110), vy: -rand.range(80, 170), life: 0.8, sprite: ['fx', 'heal'], size: rand.range(0.4, 0.7), add: true }));
        break;
      }
      case 'donut': sk.active = sk.dur; r.mode = 'roll'; r.rollAngle = 0; r.sliding = false; break;
      case 'marsh': sk.active = sk.dur; r.mode = 'float'; r.targetScale = Math.max(r.targetScale, 1.2); sk.spawnX = r.x + 160; r.spinT = 0; break;
      case 'cupcake': sk.active = sk.dur; break;
      case 'cotton': sk.active = 0.6; this.pw.shield = Math.max(this.pw.shield, 7); this.pwDur.shield = this.pw.shield; this.sfx('shield_on'); break;
    }
  }
  skillTick(sk, dt) {
    const r = this.runner, w = this.world;
    if (sk.id === 'chip') {
      sk.rainT -= dt;
      while (sk.rainT <= 0) {
        sk.rainT += 0.085;
        const x = r.x + rand.range(240, 980);
        const surf = w.surfaceBelow(x, 0);
        const restY = surf == null ? 2000 : surf - (GY - CFG.JELLY_Y) - rand.range(0, 30);
        w.addPick('jelly_choco', x, -30 - rand() * 80, { fall: true, vy: rand.range(80, 260), vx: rand.range(-40, 10), restY, born: 0.01 });
      }
    } else if (sk.id === 'marsh') {
      while (sk.spawnX < r.x + this.W - 200) {
        w.addPick('jelly_star', sk.spawnX, 300 - 48 + Math.sin(sk.spawnX / 90) * 24, { born: 0.01 });
        sk.spawnX += 44;
      }
    }
  }
  skillEnd(sk) {
    const r = this.runner;
    if (sk.id === 'donut' && r.mode === 'roll') { r.mode = 'run'; r.invuln = Math.max(r.invuln, 0.9); this.bridgeT = Math.max(this.bridgeT, 0.5); }
    if (sk.id === 'marsh' && r.mode === 'float') {
      r.mode = 'run'; r.targetScale = this.pw.giant > 0 ? CFG.GIANT_SCALE : 1;
      r.grounded = false; r.vy = 0; r.jumps = 1;
      this.bridgeT = Math.max(this.bridgeT, 1.5); r.invuln = Math.max(r.invuln, 1.2);
    }
  }

  // ---------------------------------------------------------------- pet
  updatePet(dt) {
    if (!this.pet) return;
    if (this.pet.update(dt, this.runner, this.state === 'play' && !this.tut.cur)) this.petAbility();
  }
  petAbility() {
    const r = this.runner, w = this.world, pet = this.pet;
    this.sfx('pet');
    switch (pet.id) {
      case 'twinkle': {
        const x0 = r.x + 520;
        for (let i = 0; i < 9; i++) w.addPick('jelly_star', x0 + i * 44, CFG.JELLY_Y - 16 - Math.sin((i / 8) * Math.PI) * 34, { born: 0.01 });
        break;
      }
      case 'buzzy': {
        const x = pet.x + 420;
        const surf = w.surfaceBelow(x, 0);
        w.addPick('milk_s', x, pet.y, { fall: true, vy: -260, restY: (surf ?? GY) - 66, born: 0.01 });
        break;
      }
      case 'puff': this.petMagnet = 3; this.sfx('magnet', { vol: 0.6 }); break;
      case 'oink': {
        for (let i = 0; i < 6; i++) {
          const x = pet.x + 300 + i * 46;
          const surf = w.surfaceBelow(x, 0);
          w.addPick('coin_g', pet.x + 30, pet.y, { fall: true, vx: 300 + i * 46 * 1.5, vy: -420 - i * 20, restY: (surf ?? GY) - 46, born: 0.01 });
        }
        break;
      }
      case 'pop': {
        const target = w.obs.find((o) => !o.smashed && o.x > r.x + 80 && o.x < r.x + 1100 && !(o.kind === 'pop' && o.state === 'hidden'));
        if (target) this.projectiles.push({ x: pet.x, y: pet.y, o: target, t: 0, done: false });
        break;
      }
    }
  }
  projStep(pr, dt) {
    pr.t += dt;
    const o = pr.o;
    const tx = o.kind === 'beam' ? o.x + o.w / 2 : o.x, ty = o.kind === 'hang' || o.kind === 'beam' ? CFG.OVERHEAD_Y - 50 : o.y - 40;
    const k = Math.min(1, pr.t / 0.32);
    pr.cx = pr.x + (tx - pr.x) * k; pr.cy = pr.y + (ty - pr.y) * k - Math.sin(k * Math.PI) * 80;
    if (rand() < 0.7) this.fx.spawn({ x: pr.cx, y: pr.cy, vx: -60, vy: rand.range(-30, 30), life: 0.3, sprite: ['fx', 'spark_1'], size: 0.4, size1: 0.1, add: true });
    if (k >= 1) { pr.done = true; if (!o.smashed) { this.smash(o); this.sfx('smash'); } }
  }

  // ---------------------------------------------------------------- lands
  enterLand(tr) {
    if (this.stats.hitsLand === 0) this.stats.cleanLand++;
    this.stats.hitsLand = 0;
    this.landIdx = tr.landIdx; this.lap = tr.lap; this.landNo = tr.n;
    this.speedTarget = this.gen.speed(tr.landIdx, tr.lap);
    this.bg.set(LAND_IDS[tr.landIdx]);
    this.game.audio.playMusic(LANDS[tr.landIdx].bgm, { fade: 1.4 });
    this.sfx('land_change');
    this.banner(`LAND ${tr.n}`, { sub: LANDS[tr.landIdx].name, size: 58, dur: 2.4, color: '#ffe680', y: 230 });
    if (tr.n > 1) this.tw.after(0.9, () => this.rpop(140, -170, 'SPEED UP!', '#86ceff', 32, { dur: 1.3 }));
  }

  // ---------------------------------------------------------------- bonus
  startRush() {
    if (this.state !== 'play') return;
    const r = this.runner;
    this.state = 'rushIn'; this.stateT = 0;
    this.stats.rush++;
    this.sfx('rush_start');
    this.sfx('whoosh', { delay: 0.25 });
    this.game.audio.stopMusic(0.4);
    this.flash = 0.8; this.flashColor = '#ffffff';
    this.banner('SUGAR RUSH!', { size: 76, dur: 1.8, color: '#ffb3f0', y: 300 });
    if (r.mode === 'roll' || r.mode === 'float') r.mode = 'run';
    if (this.skill && this.skill.active > 0) { this.skillEnd(this.skill); this.skill.active = 0; }
    r.targetScale = 1;
  }
  rushInStep(dt) {
    const r = this.runner;
    r.x += this.curV * dt;
    r.y -= 900 * dt * Math.min(1, this.stateT * 3);
    r.grounded = false; r.spinT = 0;
    r.pushTrail(dt, true);
    this.camX = r.x - CFG.PLAYER_SX;
    if (this.pet) this.pet.update(dt, r, false);
    if (this.stateT > 0.85) this.beginRush();
  }
  beginRush() {
    const r = this.runner;
    this.mainX = r.x;
    this.rush = new RushStage(this, this.mods.rushTime);
    this.world = this.rush.world;
    r.x = 0; r.y = 330; r.vy = 200; r.mode = 'fly'; r.trail.length = 0; r.scale = 1;
    this.camX = r.x - CFG.PLAYER_SX;
    if (this.pet) this.pet.place(r.x - 90, 250);
    this.bg.set('rush', true);
    this.game.audio.playMusic('bgm_rush', { fade: 0.2 });
    this.flash = 0.7;
    this.state = 'rush'; this.stateT = 0;
  }
  rushStep(dt) {
    const r = this.runner, v = CFG.RUSH_SPEED;
    this.curV = v;
    const ev = r.step(dt, this.world, { speed: v });
    if (ev === 'bounce') this.sfx('spring', { vol: 0.5 });
    this.pickups(dt, r, v);
    if (this.pet) this.pet.update(dt, r, false);
    this.camX = r.x - CFG.PLAYER_SX;
    this.rush.fill(this.camX + this.W + 900);
    this.world.cull(this.camX - 300);
    this.dist += (v * dt) / 10;
    this.rush.left -= dt;
    if (this.rush.left <= 0) { this.state = 'rushOut'; this.stateT = 0; this.sfx('rush_end'); }
  }
  rushOutStep(dt) {
    const r = this.runner;
    r.x += CFG.RUSH_SPEED * dt;
    r.y -= 1000 * dt;
    this.camX = r.x - CFG.PLAYER_SX;
    this.pickups(dt, r, CFG.RUSH_SPEED);
    if (this.stateT > 0.6) this.endRush();
  }
  endRush() {
    const r = this.runner;
    this.world = this.mainWorld;
    r.x = this.mainX; r.y = -80; r.vy = 300; r.mode = 'run'; r.grounded = false; r.jumps = 1; r.onPlat = null; r.trail.length = 0;
    r.invuln = 2.6; this.bridgeT = 2.4;
    this.letters.fill(false);
    for (const p of this.world.picks) if (p.kind === 'letter' && !p.taken) { p.kind = 'jelly_star'; p.r = 20; }
    this.world.lettersInFlight.clear();
    this.camX = r.x - CFG.PLAYER_SX;
    for (const o of this.world.obs) if (!o.smashed && o.x > r.x - 100 && o.x < r.x + 700) this.smash(o, true);
    if (this.pet) this.pet.place(r.x - 90, 200);
    this.bg.set(LAND_IDS[this.landIdx], true);
    this.game.audio.playMusic(LANDS[this.landIdx].bgm, { fade: 0.6 });
    this.flash = 0.6;
    this.rush = null;
    this.state = 'play'; this.stateT = 0;
  }

  // ---------------------------------------------------------------- death
  exhausted() {
    if (!this.spurtUsed && this.mods.spurt > 0) {
      this.spurtUsed = true; this.spurt = this.mods.spurt;
      this.sfx('spurt');
      this.banner('라스트 스퍼트!', { size: 52, color: '#ffb36b', y: 290 });
      return;
    }
    this.die('down');
  }
  die(reason) {
    const r = this.runner;
    this.state = 'dying'; this.stateT = 0; this.deathReason = reason;
    if (r.mode === 'roll' || r.mode === 'float') r.mode = 'run';
    if (this.skill) this.skill.active = 0;
    this.pw.giant = 0; this.pw.dash = 0; r.targetScale = 1; this.spurt = 0;
    r.trail.length = 0;
    if (reason === 'pit') { r.mode = 'pit'; r.modeT = 0; r.vy = Math.max(r.vy, 200); this.sfx('fall'); }
    else { r.mode = 'down'; r.modeT = 0; r.y = r.onPlat ? r.onPlat.y : (this.world.groundAt(r.x, 30) ? GY : r.y); this.sfx('exhausted'); this.energy = 0; }
    this.deathV = this.curV;
    this.game.audio.musicLevel(0.25, 0.4);
    buzz(120, Save.data.settings.vibrate);
  }
  dyingStep(dt) {
    const r = this.runner;
    if (this.deathReason === 'down') {
      this.deathV = Math.max(0, this.deathV - 1100 * dt);
      r.x += this.deathV * dt;
      if (!r.grounded && r.y < GY) { r.vy += CFG.GRAVITY * dt; r.y = Math.min(GY, r.y + r.vy * dt); }
      this.camX = r.x - CFG.PLAYER_SX;
    } else r.step(dt, this.world, { speed: this.deathV * 0.35 });
    if (this.pet) this.pet.update(dt, r, false);
    if (this.stateT > 1.35) this.resolveDeath();
  }
  resolveDeath() {
    if (this.saves.cotton) { this.saves.cotton = false; this.revive(this.skill.revive || 0.4, '구름 쿠션!'); return; }
    if (this.saves.revive) { this.saves.revive = false; this.revive(0.5, '부활!'); return; }
    if (this.saves.relay) { this.startRelay(); return; }
    this.gameOver();
  }
  safeGroundX(from) {
    for (const g of this.world.ground) if (g.x1 - Math.max(g.x0, from) > 360) return Math.max(g.x0 + 60, from);
    return from;
  }
  revive(ratio, label) {
    const r = this.runner;
    this.state = 'revive'; this.stateT = 0;
    this.energy = Math.max(this.energy, this.maxEnergy * ratio);
    this.sfx('revive');
    this.banner(label, { size: 60, color: '#fff3a0', y: 280 });
    if (this.deathReason === 'pit') { r.x = this.safeGroundX(r.x + 40); r.y = 120; }
    r.mode = 'run'; r.grounded = false; r.vy = -600; r.jumps = 1;
    r.invuln = 3.2; this.bridgeT = 3;
    for (const o of this.world.obs) if (!o.smashed && o.x > r.x - 200 && o.x < r.x + 800) this.smash(o, true);
    this.flash = 0.7; this.flashColor = '#fff6c0';
    this.game.audio.musicLevel(1, 0.6);
    this.camX = r.x - CFG.PLAYER_SX;
  }
  reviveStep(dt) {
    const r = this.runner;
    r.step(dt, this.world, { speed: this.speed * Math.min(1, this.stateT), bridge: true });
    this.camX = r.x - CFG.PLAYER_SX;
    this.fx.spawn({ x: r.x + rand.range(-40, 40), y: r.y - rand.range(0, 100), vy: -120, life: 0.6, sprite: ['fx', 'star_small'], size: 0.6, size1: 0.1, add: true });
    if (this.pet) this.pet.update(dt, r, false);
    if (this.stateT > 0.9) { this.state = 'play'; this.stateT = 0; }
  }
  startRelay() {
    const old = this.runner;
    const id = this.saves.relay;
    this.saves.relay = null;
    this.stats.relay = 1;
    if (this.deathReason === 'down') this.downRunner = { id: old.id, sheet: old.sheet, x: old.x, y: old.y, f: old.meta.anims.down.frames[1] };
    const r = new Runner(this, id);
    this.runner = r;
    this.charId = id;
    this.mods = Progress.mods(id);
    this.maxEnergy = this.mods.maxEnergy + (this.boosts.energy ? 30 : 0);
    this.energy = this.maxEnergy * 0.75;
    this.skill = this.makeSkill(id);
    this.saves.cotton = id === 'cotton';
    this.spurtUsed = false;
    r.x = this.camX - 120; r.y = GY; r.grounded = true;
    r.invuln = 3; this.bridgeT = 3.2;
    this.state = 'relay'; this.stateT = 0;
    this.sfx('relay');
    this.sfx('whoosh', { vol: 0.8 });
    this.banner('릴레이!', { sub: `${CHAR[id].name} 출동!`, size: 64, color: '#9dff7a', y: 270 });
    this.game.audio.musicLevel(1, 0.6);
    for (const o of this.world.obs) if (!o.smashed && o.x > this.camX && o.x < this.camX + this.W + 400) this.smash(o, true);
  }
  relayStep(dt) {
    const r = this.runner;
    r.step(dt, this.world, { speed: this.speed * 1.7, bridge: true });
    if (this.pet) this.pet.update(dt, r, false);
    if (r.x >= this.camX + CFG.PLAYER_SX) { this.state = 'play'; this.stateT = 0; }
  }
  gameOver() {
    this.state = 'over'; this.stateT = 0;
    this.game.audio.stopMusic(0.6);
    this.game.audio.jingle('jingle_over');
    this.banner(this.deathReason === 'pit' ? '앗, 떨어졌다!' : '기진맥진!', { size: 60, color: '#ffd0d0', y: 300, dur: 2 });
  }
  overStep() {
    if (this.stateT > 2 && !this.over) {
      this.over = true;
      if (this.stats.hitsLand === 0 && this.landNo > 1) this.stats.cleanLand += 0; // only completed lands count
      this.game.endRun(this.summary());
    }
  }
  summary() {
    return {
      char: this.params.char, relayChar: this.stats.relay ? this.runner.id : null, pet: this.params.pet,
      score: this.score, coins: this.coins, jellies: this.jellies, land: this.landNo, milk: this.stats.milk, items: this.stats.items,
      maxCombo: this.maxCombo, dist: Math.floor(this.dist), cleanLand: this.stats.cleanLand, relay: this.stats.relay,
      jumps: this.stats.jumps, djumps: this.stats.djumps, slideTime: Math.floor(this.stats.slideTime), smash: this.stats.smash,
      rush: this.stats.rush, skills: this.stats.skills, tutorial: this.tutorialRun, params: this.params,
    };
  }

  // ---------------------------------------------------------------- tutorial
  tutorialCheck(r, v) {
    if (!this.tutorialRun) return;
    if (!this.tut.cur) {
      for (const o of this.world.obs) {
        if (!o.tutorial || o.tutDone) continue;
        const d = o.hit.x - (r.x + 23);
        const trigger = o.tutorial === 'slide' ? v * 0.32 : v * 0.34 - 20;
        if (d < trigger && d > -40) { this.tut.cur = { kind: o.tutorial, o, stage: 0 }; o.tutDone = true; this.timeScale = 0.06; break; }
      }
      if (!this.tut.cur && this.world.tutorialPits) {
        for (const pt of this.world.tutorialPits) {
          if (pt.done) continue;
          const d = pt.x - r.x;
          if (d < v * 0.22 && d > -20) { pt.done = true; this.tut.cur = { kind: 'gap', stage: 0 }; this.timeScale = 0.06; break; }
        }
      }
      if (!this.tut.shownMilk) {
        const milk = this.world.picks.find((p) => !p.taken && p.kind.startsWith('milk') && p.x < this.camX + this.W - 100);
        if (milk) { this.tut.shownMilk = true; this.game.toast('우유를 마시면 에너지가 회복돼요!', { icon: 'milk', dur: 3 }); }
      }
    } else if (this.tut.cur.kind === 'double' && this.tut.cur.stage === 1 && r.vy > -380) {
      this.tut.cur.stage = 2; this.timeScale = 0.06;
    }
  }
  tutorialAction(act) {
    const c = this.tut.cur;
    if (!c) return;
    if ((c.kind === 'jump' || c.kind === 'gap') && act === 'jump') { this.tut.cur = null; this.timeScale = 1; }
    else if (c.kind === 'slide' && act === 'slide') { this.tut.cur = null; this.timeScale = 1; }
    else if (c.kind === 'double' && act === 'jump') {
      if (c.stage === 0) { c.stage = 1; this.timeScale = 1; }
      else if (c.stage === 2) { this.tut.cur = null; this.timeScale = 1; }
    }
  }

  render(ctx) { renderRun(this, ctx); }
}

});

// ---- src/main.js
__def("src/main.js", function (__exports, __req) {
__exp(__exports, {  });
// =============================================================================
//  DESSERT DASH (디저트 대시) — project "kukirun"
//  An original single-player auto-runner. Entry point & game shell.
// =============================================================================
const { CFG } = __req("src/config.js");
const { View } = __req("src/engine/view.js");
const { Input } = __req("src/engine/input.js");
const { AudioEngine } = __req("src/engine/audio.js");
const { SceneManager } = __req("src/engine/scene.js");
const { Toasts, text, COL } = __req("src/engine/ui.js");
const { Assets } = __req("src/engine/assets.js");
const { Save } = __req("src/engine/storage.js");
const { Display } = __req("src/engine/display.js");
const { Progress } = __req("src/game/progress.js");
const { LoadingScene } = __req("src/scenes/loading.js");
const { TitleScene } = __req("src/scenes/title.js");
const { LobbyScene } = __req("src/scenes/lobby.js");
const { CharactersScene } = __req("src/scenes/characters.js");
const { PetsScene } = __req("src/scenes/pets.js");
const { LabScene } = __req("src/scenes/lab.js");
const { MissionsScene } = __req("src/scenes/missions.js");
const { PrerunScene } = __req("src/scenes/prerun.js");
const { ResultScene } = __req("src/scenes/result.js");
const { SettingsScene } = __req("src/scenes/settings.js");
const { RunScene } = __req("src/scenes/run.js");

function loadScript(src) {
  return new Promise((resolve) => {
    const s = document.createElement('script');
    s.src = src; s.async = true;
    s.onload = () => resolve(true);
    s.onerror = () => { console.warn('failed to load', src); resolve(false); };
    document.head.appendChild(s);
  });
}

class Game {
  constructor() {
    this.canvas = document.getElementById('game');
    this.view = new View(this.canvas);
    this.input = new Input(this.view);
    this.audio = new AudioEngine();
    this.scenes = new SceneManager(this);
    this.toasts = new Toasts();
    let dbg = false;
    try { dbg = /[?&#]debug/.test(location.href) || localStorage.getItem('dd-debug') === '1'; } catch (e) { /* ignore */ }
    this.debug = dbg;
    this.fps = 60;
    this.errors = [];
    Save.load();
    this.applySettings();
    Display.init({ auto: () => Save.data.settings.autoFS !== false });
    // fullscreen / install state changed: rebuild buttons; leaving fullscreen mid-run pauses it
    Display.onChange((kind) => { this.scenes.layout(); if (kind === 'fs' && !Display.isFullscreen) this.scenes.blur(); });
    this.input.handler = {
      pointer: (t, p) => this.scenes.pointer(t, p),
      key: (code, acts) => this.onKey(code, acts),
      wheel: (dy, p) => this.scenes.wheel(dy, p),
      blur: () => this.scenes.blur(),
    };
    this.input.onFirstGesture = () => this.audio.unlock();
    let wasRotated = this.view.rotated;
    this.view.onResize = () => {
      this.scenes.layout();
      // turning the phone mid-run pauses so nobody crashes while rotating
      if (this.view.rotated !== wasRotated) { wasRotated = this.view.rotated; this.scenes.blur(); }
    };
    document.addEventListener('visibilitychange', () => { if (document.hidden) this.audio.suspend(); else this.audio.resume(); });
    window.addEventListener('error', (e) => this.errors.push(String(e.message || e)));
    window.addEventListener('unhandledrejection', (e) => this.errors.push(String(e.reason && e.reason.message || e.reason)));
    this.last = performance.now() / 1000;
    this.loop = this.loop.bind(this);
  }

  async boot() {
    const loading = new LoadingScene(this);
    this.scenes.go(loading, {}, { fade: 0 });
    requestAnimationFrame(this.loop);
    if (!window.__DD_FONTS__) await loadScript('assets/fonts/fontpack.js');
    await this.loadFonts();
    loading.p.fonts = 1;
    await Assets.loadImages((d, n) => { loading.p.images = d / n; });
    if (!window.__DD_AUDIO__) await loadScript('assets/audio/audiopack.js');
    await this.audio.load((d, n) => { loading.p.audio = d / n; });
    loading.p.audio = 1;
    loading.done = true;
    window.__DD_READY__ = true;
    this.registerSW();
  }

  /** Offline cache + "install as app". Registered after loading so the precache reuses the HTTP cache. */
  registerSW() {
    try {
      if (!('serviceWorker' in navigator) || !/^https?:$/.test(location.protocol) || Display.embedded) return;
      const local = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);
      if (local && !/[?&]sw\b/.test(location.search)) return; // keep dev servers cache-free
      navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' }).catch((e) => console.warn('service worker', e));
    } catch (e) { /* ignore */ }
  }

  async loadFonts() {
    const F = window.__DD_FONTS__;
    if (!F || !window.FontFace) return;
    const list = [['DDDisplay', '900'], ['DDBold', '700'], ['DDNum', '700']];
    await Promise.all(list.map(async ([name, weight]) => {
      try {
        const bin = Uint8Array.from(atob(F[name]), (c) => c.charCodeAt(0));
        const ff = new FontFace(name, bin.buffer, { weight, style: 'normal' });
        await ff.load();
        document.fonts.add(ff);
      } catch (e) { console.warn('font failed', name, e); }
    }));
    try { delete window.__DD_FONTS__; } catch (e) { window.__DD_FONTS__ = null; }
  }

  loop(ts) {
    const now = ts / 1000;
    let dt = now - this.last;
    this.last = now;
    if (!(dt > 0)) dt = 1 / 60;
    dt = Math.min(dt, 0.1);
    this.fps = this.fps * 0.95 + (1 / dt) * 0.05;
    this.input.pollPad();
    if (this.input.wasPressed('debug')) { this.debug = !this.debug; try { localStorage.setItem('dd-debug', this.debug ? '1' : '0'); } catch (e) { /* ignore */ } }
    try {
      this.scenes.update(dt);
      this.toasts.update(dt);
      this.view.begin();
      this.scenes.render(this.view.ctx);
      this.toasts.draw(this.view.ctx, this.view.W);
      if (this.errors.length && this.debug) this.drawErrors(this.view.ctx);
      this.view.end();
    } catch (e) {
      console.error(e);
      this.errors.push(String(e && e.stack || e));
      try { this.view.end(); } catch (e2) { /* ignore */ }
    }
    this.input.endFrame();
    requestAnimationFrame(this.loop);
  }

  drawErrors(ctx) {
    ctx.save(); ctx.fillStyle = 'rgba(120,0,20,0.85)'; ctx.fillRect(0, 0, this.view.W, 28 + 20 * Math.min(4, this.errors.length));
    this.errors.slice(-4).forEach((e, i) => text(ctx, e.slice(0, 140), 10, 18 + i * 20, { size: 14, font: 'bold', align: 'left', color: '#fff' }));
    ctx.restore();
  }

  onKey(code, acts) {
    if (this.debug && code === 'KeyK' && !(this.scenes.cur instanceof RunScene)) { Progress.earn(10000); this.toast('[debug] +10,000 코인', { icon: 'coin' }); }
    this.scenes.key(code, acts);
  }

  applySettings() {
    const st = Save.data.settings;
    this.audio.setVolumes(st.music, st.sfx);
    if (this.view.quality !== st.quality) this.view.setQuality(st.quality);
  }
  toast(msg, o) { this.toasts.push(msg, o); }

  // ------------------------------------------------------------ navigation
  goTitle() { this.scenes.go(new TitleScene(this), {}, { fade: 0.45 }); }
  goLobby() { this.scenes.go(new LobbyScene(this), {}, { fade: 0.3 }); }
  goScene(name) {
    const map = { characters: CharactersScene, pets: PetsScene, lab: LabScene, missions: MissionsScene, prerun: PrerunScene, settings: SettingsScene };
    const S = map[name];
    if (S) this.scenes.go(new S(this), {}, { fade: 0.25 });
  }
  startRun(params) {
    this.audio.stopMusic(0.35);
    this.scenes.go(new RunScene(this), params, { fade: 0.45, color: '#1c0f18' });
  }
  endRun(summary) {
    const d = Save.data;
    const prevBest = d.best;
    const newBest = summary.score > prevBest && summary.score > 0;
    const bonus = Math.floor(summary.score / 2500);
    const earned = Math.floor(summary.coins + bonus);
    const xpBefore = d.xp;
    Progress.earn(earned);
    const missions = Progress.applyRun({ ...summary, coins: earned }).map((m) => Progress.missionText(m));
    const xp = 20 + Math.floor(summary.score / 600) + summary.land * 5;
    const ups = Progress.addXP(xp);
    if (summary.tutorial) d.tutorial = true;
    const rec = { score: summary.score, char: summary.relayChar || summary.char, land: summary.land, dist: summary.dist, at: Date.now() };
    d.records = [...(d.records || []), rec].sort((a, b) => b.score - a.score).slice(0, 5);
    const rank = d.records.indexOf(rec) + 1;
    Save.save();
    this.scenes.go(new ResultScene(this), { summary, earned, bonus, xp, ups, newBest, prevBest, missions, xpBefore, rank }, { fade: 0.5 });
  }
}

const game = new Game();
window.__DD_GAME__ = game;
game.boot();
void CFG; void COL;

});

__req("src/main.js");
})();
