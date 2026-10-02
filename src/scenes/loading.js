// =============================================================================
//  Loading screen (fonts -> images -> audio) then the title.
// =============================================================================
import { Scene } from '../engine/scene.js';
import { text, bar, COL } from '../engine/ui.js';
import { TAU } from '../engine/util.js';
import { TIPS } from '../data/content.js';

export class LoadingScene extends Scene {
  enter() {
    this.p = { fonts: 0, images: 0, audio: 0 };
    this.done = false;
    this.tip = TIPS[Math.floor(Math.random() * TIPS.length)];
    this.error = null;
  }
  get progress() { return this.p.fonts * 0.1 + this.p.images * 0.45 + this.p.audio * 0.45; }
  update(dt) {
    super.update(dt);
    if (this.done && this.t > 0.6 && !this.left) { this.left = true; this.game.goTitle(); }
  }
  render(ctx) {
    const W = this.W, H = this.H;
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#ffcfe0'); g.addColorStop(1, '#ffe9c4');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    // spinning candy wheel
    const cx = W / 2, cy = H / 2 - 60;
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(this.t * 2.2);
    const cols = ['#ff6fa3', '#ffd23f', '#5ccf4f', '#4fb6ff', '#a77bff', '#ffa53a'];
    for (let i = 0; i < 12; i++) {
      ctx.fillStyle = cols[i % cols.length];
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, 58, (i / 12) * TAU, ((i + 1) / 12) * TAU); ctx.closePath(); ctx.fill();
    }
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(0, 0, 20, 0, TAU); ctx.fill();
    ctx.restore();
    ctx.strokeStyle = COL.ink; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(cx, cy, 58, 0, TAU); ctx.stroke();
    text(ctx, 'DESSERT DASH', W / 2, H / 2 + 50, { size: 50, font: 'num', color: '#fff', stroke: COL.ink, sw: 9 });
    const bw = Math.min(560, W - 200);
    bar(ctx, W / 2 - bw / 2, H / 2 + 100, bw, 28, this.progress, { colors: ['#ffb3d1', '#ff6fa3'] });
    text(ctx, this.error ? this.error : `${Math.round(this.progress * 100)}%  달콤한 재료를 굽는 중...`, W / 2, H / 2 + 154, { size: 22, font: 'bold', color: COL.ink });
    text(ctx, 'TIP  ' + this.tip, W / 2, H - 50, { size: 19, font: 'bold', color: COL.ink2, maxW: W - 80 });
  }
}
