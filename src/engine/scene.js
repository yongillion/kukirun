// =============================================================================
//  Scenes, scene manager with fade transitions, and modal dialogs.
// =============================================================================
import { Tweens } from './tween.js';
import { UIGroup, Button, panel, ribbon, para, text, COL } from './ui.js';
import { Ease } from './util.js';

export class Scene {
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

export class SceneManager {
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
export class Modal {
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

export { para };
