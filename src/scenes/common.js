// =============================================================================
//  Shared helpers for menu scenes
// =============================================================================
import { Assets } from '../engine/assets.js';
import { Scene } from '../engine/scene.js';
import { Button, text, ribbon, counter, COL, rrPath, icon } from '../engine/ui.js';
import { fmt, TAU } from '../engine/util.js';
import { Save } from '../engine/storage.js';

export function drawLobbyBg(ctx, W, H, t, dim = 0) {
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

export function drawChar(ctx, id, anim, t, x, y, scale = 1, o = {}) {
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
export function drawPet(ctx, id, t, x, y, scale = 1, o = {}) {
  const sheet = 'pet_' + id;
  const A = Assets.meta(sheet)?.anims;
  if (!A) return;
  const a = o.act ? A.act : A.fly;
  const f = a.frames[Math.floor(t * (a.fps || 8)) % a.frames.length];
  Assets.draw(ctx, sheet, f, x, y + Math.sin(t * 2.4) * 6, { scale, alpha: o.alpha ?? 1, tint: o.tint });
}

/** Base for menu screens: background, title ribbon, back button, coin pill. */
export class MenuScene extends Scene {
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

export function stars(ctx, x, y, n, max, size = 22, gap = 24) {
  for (let i = 0; i < max; i++) icon(ctx, 'star', x + i * gap, y, size, i < n ? 1 : 0.25);
}
export function pill(ctx, x, y, label, color = COL.pink, size = 16) {
  ctx.save();
  ctx.font = `900 ${size}px "DDDisplay", sans-serif`;
  const w = ctx.measureText(label).width + 22;
  rrPath(ctx, x - w / 2, y - size * 0.8, w, size * 1.6, size * 0.8);
  ctx.fillStyle = color; ctx.fill(); ctx.strokeStyle = COL.ink; ctx.lineWidth = 3; ctx.stroke();
  ctx.restore();
  text(ctx, label, x, y + 1, { size, color: '#fff', stroke: COL.ink, sw: 4 });
}
