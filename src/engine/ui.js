// =============================================================================
//  UI toolkit: fonts, outlined text, candy panels & buttons, sliders, toggles,
//  toasts. Everything is drawn with Canvas2D in logical units.
// =============================================================================
import { Assets } from './assets.js';
import { clamp, Ease, rgba, TAU } from './util.js';

export const FONT = {
  display: '"DDDisplay", "Malgun Gothic", "Apple SD Gothic Neo", "Noto Sans KR", sans-serif',
  bold: '"DDBold", "Malgun Gothic", "Apple SD Gothic Neo", "Noto Sans KR", sans-serif',
  num: '"DDNum", "DDDisplay", "Arial Rounded MT Bold", "Malgun Gothic", sans-serif',
};
const WEIGHT = { display: 900, bold: 700, num: 700 };

export const COL = {
  ink: '#4a2a1a', ink2: '#6b4430', cream: '#fff6e6', cream2: '#ffe7c2', paper: '#fffaf3', tan: '#f1d3a8',
  pink: '#ff6fa3', pinkD: '#c94479', green: '#5ccf4f', greenD: '#34952e', orange: '#ffa53a', orangeD: '#cf7417',
  blue: '#4fb6ff', blueD: '#2c7fc4', purple: '#a77bff', purpleD: '#7350c9', yellow: '#ffd23f', yellowD: '#c99a10',
  grey: '#c8bcc2', greyD: '#8f8288', red: '#ff5d5d', redD: '#c53a3a', mint: '#4fdcb9', mintD: '#24a383',
  white: '#ffffff', dim: 'rgba(40,18,24,0.55)', shade: 'rgba(74,42,26,0.28)',
};
export const BTN = {
  green: ['#7be36b', '#5ccf4f', '#34952e'], pink: ['#ff92bd', '#ff6fa3', '#c94479'],
  orange: ['#ffc06a', '#ffa53a', '#cf7417'], blue: ['#86ceff', '#4fb6ff', '#2c7fc4'],
  purple: ['#c3a3ff', '#a77bff', '#7350c9'], yellow: ['#ffe57f', '#ffd23f', '#c99a10'],
  grey: ['#ddd3d8', '#c8bcc2', '#8f8288'], red: ['#ff8c8c', '#ff5d5d', '#c53a3a'],
  mint: ['#8af0d6', '#4fdcb9', '#24a383'], cream: ['#fffaf2', '#fff0d9', '#d9b88a'],
};

export function font(size, kind = 'display') { return `${WEIGHT[kind] || 700} ${Math.round(size)}px ${FONT[kind] || FONT.display}`; }

/**
 * Outlined text. o: { size, font, color, stroke, sw, align, baseline, alpha, maxW, shadow }
 */
export function text(ctx, str, x, y, o = {}) {
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
export function measure(ctx, str, size, kind = 'display') { ctx.save(); ctx.font = font(size, kind); const w = ctx.measureText(String(str)).width; ctx.restore(); return w; }

/** Word-wrapped paragraph (Korean wraps by character when needed). Returns height used. */
export function para(ctx, str, x, y, maxW, o = {}) {
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

export function rrPath(ctx, x, y, w, h, r) {
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
export function panel(ctx, x, y, w, h, o = {}) {
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
export function ribbon(ctx, cx, cy, w, label, color = 'pink', size = 30) {
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

export function icon(ctx, name, x, y, size = 48, alpha = 1) {
  if (!Assets.has('ui')) return;
  Assets.draw(ctx, 'ui', name, x, y, { scale: size / 48, alpha });
}

/** Candy pill with icon + value (coins etc.). */
export function counter(ctx, x, y, iconName, value, o = {}) {
  const w = o.w ?? 170, h = o.h ?? 46;
  ctx.save();
  rrPath(ctx, x, y - h / 2, w, h, h / 2);
  ctx.fillStyle = o.bg || 'rgba(74,42,26,0.55)'; ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 2; ctx.stroke();
  ctx.restore();
  icon(ctx, iconName, x + 4, y, o.iconSize ?? 50);
  text(ctx, value, x + w - 16, y + 1, { size: o.size ?? 24, font: 'num', align: 'right', color: '#fff', stroke: COL.ink, sw: 5 });
}

export function bar(ctx, x, y, w, h, t, o = {}) {
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
export class Button {
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

export class Slider {
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

export class Toggle {
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
export class UIGroup {
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
export class Toasts {
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

export { rgba };
