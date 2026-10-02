// =============================================================================
//  Missions: three active goals with coin rewards, plus lifetime stats.
// =============================================================================
import { Button, text, panel, bar, COL, icon } from '../engine/ui.js';
import { fmt, TAU } from '../engine/util.js';
import { Save } from '../engine/storage.js';
import { Progress } from '../game/progress.js';
import { MenuScene } from './common.js';

export class MissionsScene extends MenuScene {
  constructor(game) { super(game, '미션', 'mint'); }
  enter() { Progress.ensureMissions(); this.pop = [0, 0, 0]; this.build(); }
  layout() { this.build(); }
  build() {
    const W = this.W;
    this.ui.clear();
    this.chrome();
    const cw = Math.min(980, W - 80), x0 = (W - cw) / 2;
    this.cards = Save.data.missions.map((m, i) => ({ m, x: x0, y: 112 + i * 150, w: cw, h: 136 }));
    this.cards.forEach((c, i) => {
      const done = c.m.done;
      this.ui.add(new Button({ x: c.x + c.w - 210, y: c.y + 30, w: 186, h: 78, label: done ? '보상 받기' : '진행 중', color: done ? 'green' : 'grey', size: 25, enabled: done, sound: 'ui_reward',
        onClick: () => {
          const res = Progress.claim(i);
          if (!res) return;
          this.game.toast(`미션 완료! +${fmt(res.reward)} 코인`, { icon: 'coin' });
          for (const up of res.ups) { this.game.audio.play('ui_levelup'); this.game.toast(`레벨 업! Lv.${up.level}  +${fmt(up.reward)} 코인`, { icon: 'level', dur: 2.8 }); }
          this.pop[i] = 1;
          this.build();
        } }));
    });
  }
  update(dt) { super.update(dt); for (let i = 0; i < 3; i++) this.pop[i] = Math.max(0, this.pop[i] - dt * 2); }
  render(ctx) {
    const W = this.W, H = this.H, d = Save.data;
    this.drawBg(ctx);
    this.cards.forEach((c, i) => {
      const m = c.m;
      panel(ctx, c.x, c.y, c.w, c.h, { r: 26, fill: m.done ? '#f1ffe6' : '#fffaf3', fill2: m.done ? '#c8f5ad' : '#ffe9cc' });
      ctx.save(); ctx.fillStyle = 'rgba(79,220,185,0.2)'; ctx.beginPath(); ctx.arc(c.x + 68, c.y + c.h / 2, 46, 0, TAU); ctx.fill(); ctx.restore();
      icon(ctx, m.done ? 'check' : 'mission', c.x + 68, c.y + c.h / 2, 64);
      text(ctx, Progress.missionText(m), c.x + 132, c.y + 40, { size: 25, align: 'left', color: COL.ink, maxW: c.w - 380 });
      const k = Math.min(1, m.progress / m.target);
      bar(ctx, c.x + 132, c.y + 68, c.w - 380, 26, k, { colors: m.done ? ['#c4f78a', '#4fc43a'] : ['#9ff0de', '#2fbf9c'] });
      text(ctx, `${fmt(Math.floor(m.progress))} / ${fmt(m.target)}`, c.x + 132 + (c.w - 380) / 2, c.y + 82, { size: 16, font: 'num', color: '#fff', stroke: COL.ink, sw: 4 });
      icon(ctx, 'coin', c.x + 148, c.y + 114, 30);
      text(ctx, `보상 ${fmt(Progress.missionReward(m))}`, c.x + 168, c.y + 115, { size: 18, font: 'bold', align: 'left', color: COL.orangeD });
    });
    // lifetime stats
    const st = d.stats;
    const sy = 112 + 3 * 150 + 4;
    const cw = Math.min(980, W - 80), x0 = (W - cw) / 2;
    panel(ctx, x0, sy, cw, H - sy - 22, { r: 24, fill: '#fffaf3', fill2: '#f3e6ff' });
    const items = [['trophy', '최고 기록', fmt(d.best)], ['flag', '최장 거리', `${fmt(d.bestDist)}m`], ['retry', '플레이', `${fmt(st.runs)}판`], ['jelly', '누적 젤리', fmt(st.jellyTotal)], ['coin', '누적 코인', fmt(st.coinsTotal)]];
    const iw = cw / items.length;
    items.forEach(([ic, label, val], i) => {
      const cx = x0 + iw * i + iw / 2;
      icon(ctx, ic, cx - 52, sy + 44, 40);
      text(ctx, label, cx + 10, sy + 32, { size: 15, font: 'bold', color: COL.ink2 });
      text(ctx, val, cx + 10, sy + 58, { size: 21, font: 'num', color: COL.ink });
    });
    this.ui.draw(ctx);
    this.drawChrome(ctx);
  }
}
