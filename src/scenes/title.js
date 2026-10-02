// =============================================================================
//  Title screen: parade of runners across Sugar Meadow, logo, tap to start.
// =============================================================================
import { Scene } from '../engine/scene.js';
import { Assets } from '../engine/assets.js';
import { Background } from '../game/background.js';
import { text, COL } from '../engine/ui.js';
import { CHARS, PETS } from '../data/content.js';
import { CFG } from '../config.js';
import { drawChar, drawPet, fsButton } from './common.js';
import { Ease } from '../engine/util.js';

export class TitleScene extends Scene {
  enter() {
    this.bg = new Background();
    this.bg.set('meadow', true);
    this.cam = 0;
    this.parade = CHARS.map((c, i) => ({ id: c.id, off: i * 210, jump: 0, vy: 0, y: 0 }));
    this.leaving = false;
    this.game.audio.playMusic('bgm_lobby', { fade: 0.8 });
    this.build();
  }
  layout() { this.build(); }
  build() {
    this.ui.clear();
    const b = fsButton(this.game, this.W - 50, 50);
    if (b) this.ui.add(b);
  }
  update(dt) {
    super.update(dt);
    this.cam += dt * 330;
    this.bg.update(dt, 330);
    for (const p of this.parade) {
      if (p.y === 0 && Math.random() < dt * 0.5) p.vy = -900;
      if (p.vy !== 0 || p.y < 0) { p.vy += 2600 * dt; p.y += p.vy * dt; if (p.y >= 0) { p.y = 0; p.vy = 0; } }
    }
  }
  start() {
    if (this.leaving) return;
    this.leaving = true;
    this.game.audio.unlock();
    this.game.audio.play('ui_select');
    this.game.goLobby();
  }
  pointer(type, p) {
    if (this.ui.pointer(type, p)) return true;
    if (type === 'down') this.start();
    return true;
  }
  key(code, acts) { if (acts.includes('confirm') || acts.includes('jump')) this.start(); }
  render(ctx) {
    const W = this.W, H = this.H;
    this.bg.render(ctx, W, H, this.cam);
    // ground strip
    const fr = Assets.frame('ground_meadow', 0);
    if (fr) { const tw = fr.sw / fr.s; for (let x = -((this.cam % tw) + tw) % tw; x < W; x += tw) ctx.drawImage(fr.img, fr.sx, fr.sy, fr.sw, fr.sh, x, CFG.GROUND_Y - 18, tw + 0.5, fr.sh / fr.s); }
    // parade (runs right, wraps)
    const span = W + 600;
    this.parade.forEach((p, i) => {
      const x = ((this.t * 120 + p.off) % span) - 200;
      const anim = p.y < 0 ? (p.vy < 0 ? 'jump' : 'fall') : 'run';
      drawChar(ctx, p.id, anim, this.t + i * 0.37, x, CFG.GROUND_Y + p.y, 0.92);
      if (i === 0) drawPet(ctx, PETS[(Math.floor(this.t / 6)) % PETS.length].id, this.t, x - 90, CFG.GROUND_Y - 150, 0.8);
    });
    // logo
    const k = Ease.outBack(Math.min(1, this.t / 0.8));
    const bob = Math.sin(this.t * 1.8) * 6;
    const ls = Math.min(0.9, (W - 120) / 800) * k;
    Assets.draw(ctx, 'logo', 0, W / 2, 210 + bob, { scale: ls });
    if (this.t > 0.6) {
      const a = 0.55 + 0.45 * Math.sin(this.t * 4);
      text(ctx, '화면을 눌러 시작하세요', W / 2, H - 44, { size: 30, color: '#fff', stroke: COL.ink, sw: 7, alpha: a });
    }
    text(ctx, `v${CFG.VERSION}`, W - 16, H - 16, { size: 14, font: 'num', align: 'right', color: '#fff', stroke: COL.ink, sw: 3, alpha: 0.8 });
    this.ui.draw(ctx);
  }
}
