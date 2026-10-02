// =============================================================================
//  Particle system (pooled). Particles use atlas sprites or simple shapes.
// =============================================================================
import { Assets } from './assets.js';
import { rand, TAU } from './util.js';

export class Particles {
  constructor(max = 900) {
    this.max = max;
    this.list = [];
    this.pool = [];
    this.quality = 1; // 0..1 spawn multiplier
  }

  /**
   * spawn({ x, y, vx, vy, ax, ay, drag, life, size, size1, rot, vr, alpha, alpha1,
   *         sprite:[atlasId, frame], anim:[atlasId, frames[], fps], color, shape:'circle'|'rect'|'star',
   *         add, screen, w, h, gravity })
   */
  spawn(o) {
    if (this.list.length >= this.max) return null;
    const p = this.pool.pop() || {};
    p.x = o.x; p.y = o.y;
    p.vx = o.vx || 0; p.vy = o.vy || 0;
    p.ax = o.ax || 0; p.ay = o.ay ?? 0;
    p.drag = o.drag || 0;
    p.life = 0; p.maxLife = o.life || 0.6;
    p.size = o.size ?? 1; p.size1 = o.size1 ?? p.size;
    p.rot = o.rot || 0; p.vr = o.vr || 0;
    p.alpha = o.alpha ?? 1; p.alpha1 = o.alpha1 ?? 0;
    p.sprite = o.sprite || null;
    p.anim = o.anim || null;
    p.color = o.color || '#fff';
    p.shape = o.shape || 'circle';
    p.add = !!o.add;
    p.screen = !!o.screen;
    p.w = o.w || 8; p.h = o.h || 8;
    p.fadeIn = o.fadeIn || 0;
    p.wobble = o.wobble || 0; p.ph = rand() * TAU;
    this.list.push(p);
    return p;
  }

  burst(n, fn) {
    const k = Math.max(1, Math.round(n * this.quality));
    for (let i = 0; i < k; i++) this.spawn(fn(i, k));
  }

  update(dt) {
    const L = this.list;
    for (let i = L.length - 1; i >= 0; i--) {
      const p = L[i];
      p.life += dt;
      if (p.life >= p.maxLife) { L[i] = L[L.length - 1]; L.pop(); this.pool.push(p); continue; }
      p.vx += p.ax * dt; p.vy += p.ay * dt;
      if (p.drag) { const d = Math.exp(-p.drag * dt); p.vx *= d; p.vy *= d; }
      p.x += p.vx * dt; p.y += p.vy * dt;
      if (p.wobble) p.x += Math.sin(p.life * 4 + p.ph) * p.wobble * dt;
      p.rot += p.vr * dt;
    }
  }

  clear() { while (this.list.length) this.pool.push(this.list.pop()); }

  render(ctx, camX = 0, camY = 0, screenPass = false) {
    for (const p of this.list) {
      if (p.screen !== screenPass) continue;
      const t = p.life / p.maxLife;
      let a = p.alpha + (p.alpha1 - p.alpha) * t;
      if (p.fadeIn && p.life < p.fadeIn) a *= p.life / p.fadeIn;
      if (a <= 0.01) continue;
      const s = p.size + (p.size1 - p.size) * t;
      const x = p.screen ? p.x : p.x - camX, y = p.screen ? p.y : p.y - camY;
      if (p.anim) {
        const [id, frames, fps] = p.anim;
        const fi = Math.min(frames.length - 1, Math.floor(p.life * fps));
        Assets.draw(ctx, id, frames[fi], x, y, { scale: s, rot: p.rot, alpha: a, add: p.add });
      } else if (p.sprite) {
        Assets.draw(ctx, p.sprite[0], p.sprite[1], x, y, { scale: s, rot: p.rot, alpha: a, add: p.add });
      } else {
        ctx.save();
        ctx.globalAlpha = a;
        if (p.add) ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = p.color;
        ctx.translate(x, y); ctx.rotate(p.rot); ctx.scale(s, s);
        if (p.shape === 'rect') ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        else { ctx.beginPath(); ctx.arc(0, 0, p.w / 2, 0, TAU); ctx.fill(); }
        ctx.restore();
      }
    }
  }
}
