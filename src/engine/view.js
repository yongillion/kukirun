// =============================================================================
//  View: full-window canvas with a 720-unit-tall logical coordinate system.
//  Logical width adapts to the aspect ratio (1100..1600); outside that range the
//  game is letter-/pillar-boxed.
// =============================================================================
import { CFG } from '../config.js';
import { clamp } from './util.js';

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
    this.onResize = null;
    this._resize = () => this.resize();
    window.addEventListener('resize', this._resize);
    window.addEventListener('orientationchange', () => setTimeout(this._resize, 120));
    if (window.visualViewport) window.visualViewport.addEventListener('resize', this._resize);
    this.resize();
  }

  setQuality(q) { this.quality = q; this.resize(); }

  resize() {
    const vv = window.visualViewport;
    const ww = Math.max(1, Math.round(vv ? vv.width : window.innerWidth));
    const wh = Math.max(1, Math.round(vv ? vv.height : window.innerHeight));
    const aspect = ww / wh;
    const W = clamp(Math.round(this.H * aspect), CFG.VIEW_W_MIN, CFG.VIEW_W_MAX);
    const scale = Math.min(ww / W, wh / this.H);
    this.W = W;
    this.scale = scale;
    this.ox = Math.round((ww - W * scale) / 2);
    this.oy = Math.round((wh - this.H * scale) / 2);
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
    this.canvas.style.width = ww + 'px';
    this.canvas.style.height = wh + 'px';
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
    return { x: (clientX - r.left - this.ox) / this.scale, y: (clientY - r.top - this.oy) / this.scale };
  }
}
