// =============================================================================
//  Pre-run: lineup check and one-run boosts.
// =============================================================================
import { Button, text, panel, COL, icon, rrPath } from '../engine/ui.js';
import { Assets } from '../engine/assets.js';
import { fmt, TAU } from '../engine/util.js';
import { Save } from '../engine/storage.js';
import { Progress } from '../game/progress.js';
import { BOOSTS, CHAR, PET } from '../data/content.js';
import { MenuScene, drawChar, drawPet, pill } from './common.js';

export class PrerunScene extends MenuScene {
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
