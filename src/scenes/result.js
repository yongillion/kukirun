// =============================================================================
//  Result screen: score count-up, record stamp, rewards, XP, missions.
// =============================================================================
import { Scene } from '../engine/scene.js';
import { Button, text, panel, ribbon, bar, COL, icon } from '../engine/ui.js';
import { Particles } from '../engine/particles.js';
import { fmt, Ease, rand, TAU, clamp } from '../engine/util.js';
import { Save } from '../engine/storage.js';
import { CHAR, LANDS, xpNeed } from '../data/content.js';
import { drawLobbyBg, drawChar } from './common.js';

export class ResultScene extends Scene {
  enter(res) {
    this.res = res;
    this.shown = 0; this.coinShown = 0;
    this.tickT = 0;
    this.revealed = false;
    this.fx = new Particles(400);
    this.game.audio.playMusic('bgm_result', { fade: 1.2, vol: 0.85 });
    this.tw.after(0.35, () => this.game.audio.jingle('jingle_clear', 0.3));
    this.build();
    this.xpFrom = res.xpBefore; this.xpK = 0;
  }
  layout() { this.build(); }
  build() {
    const W = this.W, H = this.H;
    this.ui.clear();
    const show = this.t > 1.6 || this.revealed;
    this.ui.add(new Button({ x: W / 2 - 330, y: H - 108, w: 300, h: 88, label: '로비로', icon: 'home', color: 'pink', size: 32, visible: show, key: ['back'], onClick: () => this.game.goLobby() }));
    this.ui.add(new Button({ x: W / 2 + 30, y: H - 108, w: 300, h: 88, label: '다시 달리기', icon: 'retry', color: 'green', size: 30, visible: show, key: ['confirm', 'Space'], sound: 'ui_select', onClick: () => this.game.goScene('prerun') }));
  }
  update(dt) {
    super.update(dt);
    this.fx.update(dt);
    const s = this.res.summary.score;
    if (this.t > 0.5 && this.shown < s) {
      const k = clamp((this.t - 0.5) / 1.5, 0, 1);
      this.shown = Math.round(s * Ease.outCubic(k));
      this.tickT -= dt;
      if (this.tickT <= 0) { this.tickT = 0.055; this.game.audio.play('ui_tick', { rate: 0.9 + k * 0.6, vol: 0.7 }); }
    }
    if (this.t > 2.05 && !this.revealed) {
      this.revealed = true; this.shown = s;
      this.build();
      if (this.res.newBest) {
        this.game.audio.play('new_record');
        this.confetti();
      }
      for (const up of this.res.ups) this.game.toast(`레벨 업! Lv.${up.level}  +${fmt(up.reward)} 코인`, { icon: 'level', dur: 3 });
      for (const m of this.res.missions) this.game.toast(`미션 완료: ${m}`, { icon: 'mission', dur: 3 });
    }
    if (this.t > 2.1) {
      const target = this.res.earned;
      this.coinShown = Math.min(target, this.coinShown + Math.max(1, target * dt * 1.2));
      this.xpK = Math.min(1, this.xpK + dt * 0.8);
    }
    if (this.res.newBest && this.revealed && rand() < dt * 6) this.confetti(3);
  }
  confetti(n = 60) {
    const W = this.W;
    this.fx.burst(n, () => ({ x: rand.range(0, W), y: -20 - rand() * 100, vx: rand.range(-60, 60), vy: rand.range(120, 300), ay: 160, vr: rand.range(-8, 8), life: 3.2, sprite: ['fx', 'confetti_' + rand.int(0, 5)], size: rand.range(0.9, 1.4), alpha: 1, alpha1: 0.8, wobble: 60, screen: true }));
  }
  render(ctx) {
    const W = this.W, H = this.H, r = this.res, s = r.summary;
    drawLobbyBg(ctx, W, H, this.t, 0.55);
    ctx.save(); ctx.fillStyle = 'rgba(40,16,26,0.35)'; ctx.fillRect(0, 0, W, H); ctx.restore();
    const pw = Math.min(1000, W - 80), ph = 560, px = (W - pw) / 2;
    const k = Ease.outBack(Math.min(1, this.t / 0.45));
    const py = 34 + (1 - k) * 60;
    ctx.save(); ctx.globalAlpha = Math.min(1, this.t * 3);
    panel(ctx, px, py, pw, ph, { r: 34 });
    ribbon(ctx, W / 2, py + 6, 320, '달리기 결과', 'pink', 32);
    // runner cheering
    const cid = s.relayChar || s.char;
    drawChar(ctx, cid, this.revealed ? 'cheer' : 'idle', this.t, px + 150, py + 360, 1.15);
    text(ctx, CHAR[cid].name, px + 150, py + 400, { size: 24, color: COL.ink });
    // score
    const cx = px + pw / 2 + 110;
    text(ctx, '점수', cx, py + 80, { size: 22, color: COL.ink2 });
    const pop = this.revealed ? 1 + Math.max(0, 0.25 - (this.t - 2.05)) : 1;
    ctx.save(); ctx.translate(cx, py + 140); ctx.scale(pop, pop);
    text(ctx, fmt(this.shown), 0, 0, { size: 72, font: 'num', color: COL.pink, stroke: COL.ink, sw: 10, shadow: { dx: 0, dy: 5, color: 'rgba(74,42,26,0.35)' } });
    ctx.restore();
    text(ctx, (r.newBest ? `이전 최고 ${fmt(r.prevBest)}` : `최고 기록 ${fmt(Save.data.best)}`) + (r.rank && r.rank <= 5 && this.revealed ? `   ·   내 기록 ${r.rank}위` : ''), cx, py + 196, { size: 18, font: 'bold', color: COL.ink2 });
    if (r.newBest && this.revealed) {
      const st = Ease.outBack(Math.min(1, (this.t - 2.05) / 0.35));
      ctx.save(); ctx.translate(cx + 250, py + 92); ctx.rotate(0.22); ctx.scale(st * 1.0, st * 1.0);
      ctx.fillStyle = '#ff5d7a'; ctx.beginPath();
      for (let i = 0; i < 24; i++) { const a = (i / 24) * TAU, rr = i % 2 ? 58 : 70; ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
      ctx.closePath(); ctx.fill(); ctx.strokeStyle = COL.ink; ctx.lineWidth = 4; ctx.stroke();
      text(ctx, 'NEW', 0, -14, { size: 28, font: 'num', color: '#fff', stroke: COL.ink, sw: 5 });
      text(ctx, 'RECORD', 0, 16, { size: 20, font: 'num', color: '#ffe680', stroke: COL.ink, sw: 4 });
      ctx.restore();
    }
    // stat rows
    const rows = [
      ['flag', '달린 거리', `${fmt(s.dist)}m`],
      ['jelly', '먹은 젤리', fmt(s.jellies)],
      ['star', '최대 콤보', fmt(s.maxCombo)],
      ['trophy', '도달한 랜드', `LAND ${s.land} · ${LANDS[(s.land - 1) % 5].name}`],
    ];
    const rx = px + 300, rw = pw - 340;
    rows.forEach(([ic, label, val], i) => {
      const a = clamp((this.t - 0.6 - i * 0.12) * 4, 0, 1);
      const y = py + 240 + i * 46;
      icon(ctx, ic, rx + 20, y, 36, a);
      text(ctx, label, rx + 50, y + 1, { size: 21, font: 'bold', align: 'left', color: COL.ink, alpha: a });
      text(ctx, val, rx + rw, y + 1, { size: 22, font: /[가-힣]/.test(val) ? 'bold' : 'num', align: 'right', color: COL.ink, alpha: a });
    });
    // coins
    const cy = py + 240 + 4 * 46 + 8;
    const ca = clamp((this.t - 1.2) * 3, 0, 1);
    icon(ctx, 'coin', rx + 20, cy, 40, ca);
    text(ctx, '획득 코인', rx + 50, cy + 1, { size: 22, align: 'left', color: COL.orangeD, alpha: ca });
    text(ctx, `+${fmt(Math.floor(this.coinShown))}`, rx + rw, cy + 1, { size: 28, font: 'num', align: 'right', color: COL.orangeD, stroke: '#fff', sw: 4, alpha: ca });
    if (r.bonus > 0) text(ctx, `(점수 보너스 +${fmt(r.bonus)} 포함)`, rx + rw, cy + 28, { size: 14, font: 'bold', align: 'right', color: COL.ink2, alpha: ca });
    // xp
    const d = Save.data;
    const xa = clamp((this.t - 1.5) * 3, 0, 1);
    text(ctx, `Lv.${d.level}`, rx + 20, py + ph - 48, { size: 22, font: 'num', align: 'left', color: COL.purpleD, alpha: xa });
    bar(ctx, rx + 90, py + ph - 62, rw - 90, 26, (d.xp / xpNeed(d.level)) * (r.ups.length ? 1 : Math.max(this.xpK, 0.0001)), { colors: ['#d6c2ff', '#9a6bff'] });
    text(ctx, `+${r.xp} XP`, rx + 90 + (rw - 90) / 2, py + ph - 48, { size: 15, font: 'num', color: '#fff', stroke: COL.ink, sw: 4, alpha: xa });
    ctx.restore();
    this.fx.render(ctx, 0, 0, true);
    this.ui.draw(ctx);
  }
}
