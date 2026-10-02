// =============================================================================
//  Lab: permanent upgrades bought with coins.
// =============================================================================
import { Button, text, panel, COL, icon, rrPath } from '../engine/ui.js';
import { fmt, TAU } from '../engine/util.js';
import { Save } from '../engine/storage.js';
import { Progress } from '../game/progress.js';
import { LAB } from '../data/content.js';
import { MenuScene } from './common.js';

export class LabScene extends MenuScene {
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
