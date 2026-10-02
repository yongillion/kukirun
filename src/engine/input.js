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

export class Input {
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
