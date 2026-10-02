// =============================================================================
//  Pet collection: buy & equip a companion.
// =============================================================================
import { Button, text, panel, para, COL, icon } from '../engine/ui.js';
import { fmt, TAU } from '../engine/util.js';
import { Assets } from '../engine/assets.js';
import { Save } from '../engine/storage.js';
import { Progress } from '../game/progress.js';
import { PETS, PET } from '../data/content.js';
import { MenuScene, drawPet, drawChar, pill } from './common.js';

export class PetsScene extends MenuScene {
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
