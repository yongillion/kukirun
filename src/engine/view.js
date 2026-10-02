// =============================================================================
//  View: full-window canvas with a 720-unit-tall logical coordinate system.
//  Logical width adapts to the aspect ratio (1100..1600); outside that range the
//  game is letter-/pillar-boxed. The logical area stays inside the screen's safe
//  area (notch / rounded corners). On a touch screen held upright the landscape
//  game is drawn turned 90 degrees, so it is playable even with rotation lock on.
// =============================================================================
import { CFG } from '../config.js';
import { clamp } from './util.js';

const TOUCH = (() => { try { return matchMedia('(pointer: coarse)').matches || ((navigator.maxTouchPoints || 0) > 0 && matchMedia('(hover: none)').matches); } catch (e) { return false; } })();

export class View {
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
