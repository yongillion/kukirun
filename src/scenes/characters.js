// =============================================================================
//  Runner collection: buy, level up, choose main & relay runner.
// =============================================================================
import { Button, text, panel, para, COL, rrPath, icon } from '../engine/ui.js';
import { fmt, TAU } from '../engine/util.js';
import { Assets } from '../engine/assets.js';
import { Save } from '../engine/storage.js';
import { Progress } from '../game/progress.js';
import { CHARS, CHAR, MAX_CHAR_LV } from '../data/content.js';
import { MenuScene, drawChar, pill } from './common.js';

export class CharactersScene extends MenuScene {
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
