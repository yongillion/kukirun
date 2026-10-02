// =============================================================================
//  Pet companion: floats behind the runner and performs its ability on a timer.
// =============================================================================
import { Assets } from '../engine/assets.js';
import { PET } from '../data/content.js';
import { TAU, damp } from '../engine/util.js';

export class Pet {
  constructor(run, id) {
    this.run = run; this.id = id; this.def = PET[id];
    this.sheet = 'pet_' + id;
    this.x = 0; this.y = 420; this.t = 0;
    this.cd = this.def.cd; this.timer = this.def.cd * 0.7;
    this.act = 0;
    this.visible = true;
  }
  get ready() { return 1 - this.timer / this.cd; }
  place(x, y) { this.x = x; this.y = y; }
  update(dt, runner, active) {
    this.t += dt;
    const tx = runner.x - 78 - (runner.scale - 1) * 40;
    const ty = runner.y - 128 * Math.max(1, runner.scale * 0.85) + Math.sin(this.t * 2.6) * 10;
    this.x = damp(this.x, tx, 7, dt);
    this.y = damp(this.y, Math.min(ty, 520), 5, dt);
    if (this.act > 0) this.act -= dt;
    if (!active) return false;
    this.timer -= dt;
    if (this.timer <= 0) { this.timer = this.cd; this.act = 0.7; return true; }
    return false;
  }
  render(ctx, camX) {
    if (!this.visible) return;
    const A = Assets.meta(this.sheet)?.anims;
    if (!A) return;
    const a = this.act > 0 ? A.act : A.fly;
    const f = a.frames[Math.floor(this.t * (a.fps || 8)) % a.frames.length];
    const sx = this.x - camX, sy = this.y;
    if (this.act > 0) {
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const g = ctx.createRadialGradient(sx, sy, 0, sx, sy, 70);
      g.addColorStop(0, 'rgba(255,240,160,0.5)'); g.addColorStop(1, 'rgba(255,240,160,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(sx, sy, 70, 0, TAU); ctx.fill(); ctx.restore();
    }
    Assets.draw(ctx, this.sheet, f, sx, sy, { scale: 0.92 });
  }
}
