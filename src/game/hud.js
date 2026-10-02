// =============================================================================
//  In-run HUD: portrait + skill ring, energy bar, SUGAR RUSH letters, score,
//  coins, power-up timers, combo, touch buttons, bonus timer.
// =============================================================================
import { Assets } from '../engine/assets.js';
import { text, rrPath, icon, COL } from '../engine/ui.js';
import { TAU, clamp, fmt, Ease, damp } from '../engine/util.js';
import { CFG } from '../config.js';
import { LANDS } from '../data/content.js';

const PW_ORDER = ['magnet', 'giant', 'dash', 'coins', 'shield'];

export class HUD {
  constructor(run) {
    this.run = run;
    this.score = 0; this.coins = 0;
    this.energy = 1; this.lag = 1;
    this.letterPop = new Array(9).fill(0);
    this.comboPop = 0; this.scorePop = 0; this.coinPop = 0; this.barShake = 0;
    this.lowPulse = 0;
    this.alpha = 1;
  }
  update(dt) {
    const r = this.run;
    this.score = r.score < this.score ? r.score : damp(this.score, r.score, 14, dt) + 0.5;
    if (Math.abs(this.score - r.score) < 1) this.score = r.score;
    this.coins = r.coins;
    const e = clamp(r.energy / r.maxEnergy, 0, 1);
    this.energy = damp(this.energy, e, 18, dt);
    if (this.lag < this.energy) this.lag = this.energy; else this.lag = Math.max(this.energy, this.lag - dt * 0.35);
    for (let i = 0; i < 9; i++) if (this.letterPop[i] > 0) this.letterPop[i] = Math.max(0, this.letterPop[i] - dt * 2.2);
    this.comboPop = Math.max(0, this.comboPop - dt * 4);
    this.scorePop = Math.max(0, this.scorePop - dt * 5);
    this.coinPop = Math.max(0, this.coinPop - dt * 5);
    this.barShake = Math.max(0, this.barShake - dt * 3);
    this.lowPulse += dt;
  }

  barWidth() { return clamp(this.run.maxEnergy * 4.1, 380, Math.min(640, this.run.W * 0.42)); }

  render(ctx) {
    const r = this.run, W = r.W;
    ctx.save();
    if (this.alpha < 1) ctx.globalAlpha = this.alpha;
    // ---------------------------------------------------------------- energy
    const bx = 104 + (this.barShake > 0 ? Math.sin(this.barShake * 60) * 6 * this.barShake : 0), by = 28, bw = this.barWidth(), bh = 34;
    const low = this.energy < CFG.LOW_ENERGY;
    ctx.save();
    rrPath(ctx, bx - 4, by - 4, bw + 8, bh + 8, (bh + 8) / 2);
    ctx.fillStyle = 'rgba(74,42,26,0.55)'; ctx.fill();
    rrPath(ctx, bx, by, bw, bh, bh / 2); ctx.fillStyle = 'rgba(40,20,14,0.6)'; ctx.fill();
    ctx.save(); rrPath(ctx, bx, by, bw, bh, bh / 2); ctx.clip();
    if (this.lag > this.energy) { ctx.fillStyle = '#ffffff'; ctx.globalAlpha *= 0.75; ctx.fillRect(bx, by, bw * this.lag, bh); ctx.globalAlpha = this.alpha; }
    const ew = bw * this.energy;
    const g = ctx.createLinearGradient(0, by, 0, by + bh);
    if (low) { g.addColorStop(0, '#ff9a8a'); g.addColorStop(1, '#e8343a'); }
    else if (this.energy < 0.5) { g.addColorStop(0, '#ffe680'); g.addColorStop(1, '#ffa526'); }
    else { g.addColorStop(0, '#c4f78a'); g.addColorStop(1, '#4fc43a'); }
    ctx.fillStyle = g; ctx.fillRect(bx, by, ew, bh);
    ctx.fillStyle = 'rgba(255,255,255,0.38)'; ctx.fillRect(bx, by + 4, ew, bh * 0.28);
    // segment ticks every 20 energy
    ctx.fillStyle = 'rgba(40,20,14,0.22)';
    for (let v = 20; v < r.maxEnergy; v += 20) ctx.fillRect(bx + bw * (v / r.maxEnergy) - 1, by + bh * 0.55, 2, bh * 0.45);
    ctx.restore();
    if (low) {
      const p = 0.5 + 0.5 * Math.sin(this.lowPulse * 10);
      ctx.strokeStyle = `rgba(255,70,70,${0.4 + 0.5 * p})`; ctx.lineWidth = 4 + p * 3;
      rrPath(ctx, bx - 2, by - 2, bw + 4, bh + 4, (bh + 4) / 2); ctx.stroke();
    }
    ctx.strokeStyle = COL.ink; ctx.lineWidth = 3.5; rrPath(ctx, bx, by, bw, bh, bh / 2); ctx.stroke();
    ctx.restore();
    icon(ctx, 'milk', bx + bw + 4, by + bh / 2, 46);
    // ------------------------------------------------------------ portrait
    const px = 56, py = 52, pr = 44;
    ctx.save();
    ctx.fillStyle = 'rgba(74,42,26,0.55)'; ctx.beginPath(); ctx.arc(px, py, pr + 5, 0, TAU); ctx.fill();
    const pg = ctx.createRadialGradient(px - 10, py - 14, 4, px, py, pr);
    pg.addColorStop(0, '#fffaf0'); pg.addColorStop(1, '#ffd9b3');
    ctx.fillStyle = pg; ctx.beginPath(); ctx.arc(px, py, pr - 3, 0, TAU); ctx.fill();
    ctx.restore();
    Assets.draw(ctx, 'portrait_' + r.runner.id, 0, px, py + 2, { scale: 0.86 });
    // skill ring
    const sk = r.skill;
    if (sk) {
      const k = sk.active > 0 ? sk.active / sk.dur : 1 - sk.timer / sk.cd;
      ctx.save();
      ctx.lineCap = 'round';
      ctx.strokeStyle = 'rgba(40,20,14,0.5)'; ctx.lineWidth = 7;
      ctx.beginPath(); ctx.arc(px, py, pr + 1, 0, TAU); ctx.stroke();
      ctx.strokeStyle = sk.active > 0 ? '#fff6a0' : r.runner.skillColor; ctx.lineWidth = 7;
      ctx.beginPath(); ctx.arc(px, py, pr + 1, -Math.PI / 2, -Math.PI / 2 + TAU * clamp(k, 0, 1)); ctx.stroke();
      if (sk.active > 0) {
        ctx.globalCompositeOperation = 'lighter';
        ctx.strokeStyle = 'rgba(255,240,150,0.5)'; ctx.lineWidth = 12 + Math.sin(r.t * 14) * 4;
        ctx.beginPath(); ctx.arc(px, py, pr + 2, 0, TAU); ctx.stroke();
      }
      ctx.restore();
      ctx.strokeStyle = COL.ink; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(px, py, pr + 5, 0, TAU); ctx.stroke();
    }
    // pet badge
    if (r.pet) {
      const qx = px + 40, qy = py + 44;
      ctx.save(); ctx.fillStyle = 'rgba(74,42,26,0.6)'; ctx.beginPath(); ctx.arc(qx, qy, 21, 0, TAU); ctx.fill();
      ctx.strokeStyle = '#ffe680'; ctx.lineWidth = 4; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.arc(qx, qy, 19, -Math.PI / 2, -Math.PI / 2 + TAU * clamp(r.pet.ready, 0, 1)); ctx.stroke(); ctx.restore();
      Assets.draw(ctx, 'petportrait_' + r.pet.id, 0, qx, qy, { scale: 0.42 });
    }
    // ------------------------------------------------------------- letters
    for (let i = 0; i < 9; i++) {
      const lx = bx + 16 + i * 31, ly = by + bh + 26;
      const on = r.letters[i];
      const pop = this.letterPop[i];
      const s = 1 + Ease.outBack(Math.min(1, pop * 1.2)) * 0.6 * pop;
      Assets.draw(ctx, 'items', on ? 'hud_letter_' + i : 'hud_letter_off', lx, ly, { scale: s, alpha: on ? 1 : 0.8 });
    }
    // land label
    const landName = LANDS[r.landIdx]?.name || '';
    text(ctx, `LAND ${r.landNo}  ${landName}`, bx + 2, by + bh + 58, { size: 15, font: 'bold', align: 'left', color: '#fff', stroke: 'rgba(74,42,26,0.8)', sw: 4 });
    // --------------------------------------------------------------- score
    const ss = 1 + this.scorePop * 0.12;
    ctx.save(); ctx.translate(W / 2, 40); ctx.scale(ss, ss);
    text(ctx, fmt(this.score), 0, 0, { size: 42, font: 'num', color: '#fff', stroke: COL.ink, sw: 8, shadow: { dx: 0, dy: 3, color: 'rgba(74,42,26,0.5)' } });
    ctx.restore();
    const cs = 1 + this.coinPop * 0.18;
    const cw = 120;
    ctx.save(); ctx.translate(W / 2, 84); ctx.scale(cs, cs);
    rrPath(ctx, -cw / 2 - 6, -17, cw + 12, 34, 17); ctx.fillStyle = 'rgba(74,42,26,0.5)'; ctx.fill();
    icon(ctx, 'coin', -cw / 2 + 10, 0, 36);
    text(ctx, fmt(this.coins), cw / 2 - 4, 1, { size: 22, font: 'num', align: 'right', color: '#ffe680', stroke: COL.ink, sw: 5 });
    ctx.restore();
    // distance
    text(ctx, `${fmt(r.dist)}m`, W - 112, 46, { size: 20, font: 'num', align: 'right', color: '#fff', stroke: COL.ink, sw: 5 });
    // ------------------------------------------------------------ power-ups
    let ix = W - 60;
    const iy = 118;
    for (const k of PW_ORDER) {
      const t = r.pw[k];
      if (!(t > 0)) continue;
      const total = r.pwDur[k] || 1;
      ctx.save(); ctx.fillStyle = 'rgba(74,42,26,0.5)'; ctx.beginPath(); ctx.arc(ix, iy, 27, 0, TAU); ctx.fill();
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 4.5; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.arc(ix, iy, 27, -Math.PI / 2, -Math.PI / 2 + TAU * clamp(t / total, 0, 1)); ctx.stroke(); ctx.restore();
      const blink = t < 1.2 && Math.floor(t * 8) % 2 === 0 ? 0.45 : 1;
      Assets.draw(ctx, 'items', 'pw_' + k, ix, iy, { scale: 0.62, alpha: blink });
      ix -= 64;
    }
    // ---------------------------------------------------------------- combo
    if (r.combo >= 10) {
      const p = this.comboPop;
      const s = 1 + Ease.outBack(Math.min(1, p)) * 0.25 * p;
      ctx.save(); ctx.translate(W - 92, 196); ctx.scale(s, s); ctx.rotate(-0.06);
      text(ctx, 'COMBO', 0, -22, { size: 18, font: 'num', color: '#ffe680', stroke: COL.ink, sw: 5 });
      text(ctx, fmt(r.combo), 0, 8, { size: 38, font: 'num', color: '#fff', stroke: COL.ink, sw: 7 });
      const bonus = Math.round((r.comboMult() - 1) * 100);
      if (bonus > 0) text(ctx, `+${bonus}%`, 0, 38, { size: 17, font: 'num', color: '#9dff7a', stroke: COL.ink, sw: 4 });
      ctx.restore();
    }
    // ------------------------------------------------------------ rush timer
    if (r.state === 'rush' && r.rush) {
      const k = clamp(r.rush.left / r.rush.dur, 0, 1);
      const tw = 360, tx = W / 2 - tw / 2, ty = 112;
      rrPath(ctx, tx - 3, ty - 3, tw + 6, 26, 13); ctx.fillStyle = 'rgba(74,42,26,0.6)'; ctx.fill();
      ctx.save(); rrPath(ctx, tx, ty, tw, 20, 10); ctx.clip();
      const gg = ctx.createLinearGradient(tx, 0, tx + tw, 0);
      gg.addColorStop(0, '#ff7eb9'); gg.addColorStop(0.5, '#ffd02a'); gg.addColorStop(1, '#4fb4ff');
      ctx.fillStyle = gg; ctx.fillRect(tx, ty, tw * k, 20); ctx.restore();
      text(ctx, 'SUGAR RUSH', W / 2, ty + 10, { size: 15, font: 'num', color: '#fff', stroke: COL.ink, sw: 4 });
    }
    ctx.restore();
    this.renderButtons(ctx);
  }

  renderButtons(ctx) {
    const r = this.run, W = r.W, H = r.H;
    if (!r.showTouch) return;
    const touch = r.game.input.lastType !== 'mouse';
    const base = touch ? 0.9 : 0.62;
    const items = [
      { x: 96, y: H - 92, icon: 'btn_jump', label: '점프', key: 'SPACE', on: r.touchJumpT > 0 || r.game.input.isDown('jump') },
      { x: W - 96, y: H - 92, icon: 'btn_slide', label: '슬라이드', key: '↓', on: r.touchSlide.size > 0 || r.game.input.isDown('slide') },
    ];
    for (const b of items) {
      const s = b.on ? 0.92 : 1;
      ctx.save();
      ctx.globalAlpha = base * this.alpha;
      ctx.translate(b.x, b.y); ctx.scale(s, s);
      ctx.fillStyle = b.on ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.3)';
      ctx.beginPath(); ctx.arc(0, 0, 60, 0, TAU); ctx.fill();
      ctx.strokeStyle = 'rgba(74,42,26,0.7)'; ctx.lineWidth = 4; ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,0.75)'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(0, 0, 53, 0, TAU); ctx.stroke();
      ctx.restore();
      ctx.save(); ctx.globalAlpha = base * this.alpha;
      Assets.draw(ctx, 'ui', b.icon, b.x, b.y - 10, { scale: 1.05 * s });
      ctx.restore();
      text(ctx, touch ? b.label : b.key, b.x, b.y + 34, { size: touch ? 18 : 16, font: touch ? 'display' : 'num', color: '#fff', stroke: COL.ink, sw: 5, alpha: base * this.alpha });
    }
  }
}
