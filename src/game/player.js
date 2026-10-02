// =============================================================================
//  Runner: physics (jump / double jump / slide / fast-fall / platforms / pits),
//  animation state and rendering (spin, giant scale, flashes, afterimages).
// =============================================================================
import { CFG } from '../config.js';
import { Assets } from '../engine/assets.js';
import { TAU, clamp, rgba } from '../engine/util.js';

const G = CFG.GRAVITY, GY = CFG.GROUND_Y;

export class Runner {
  constructor(run, id) {
    this.run = run;
    this.setChar(id);
    this.x = 0; this.y = GY; this.vy = 0; this.prevY = GY;
    this.grounded = true; this.onPlat = null;
    this.jumps = 0; this.coyote = 0; this.buffer = 0;
    this.slideHeld = false; this.sliding = false;
    this.spinT = 0; this.spinDur = 0.42;
    this.landT = 0; this.hurtT = 0; this.flashT = 0; this.invuln = 0;
    this.scale = 1; this.targetScale = 1;
    this.animT = 0; this.mode = 'run';   // run | down | pit | fly | float | roll
    this.modeT = 0;
    this.alpha = 1;
    this.trail = []; this.trailT = 0;
    this.dustT = 0;
    this.thrust = false;
    this.rollAngle = 0;
    this.visible = true;
  }
  setChar(id) {
    this.id = id;
    this.sheet = 'char_' + id;
    this.meta = Assets.meta(this.sheet);
    this.color = this.meta?.color || '#ffb36b';
    this.skillColor = this.meta?.skillColor || '#fff2a0';
  }

  get airborne() { return !this.grounded; }

  hitbox() {
    const s = this.scale;
    let w = CFG.HIT_W, h = CFG.HIT_H;
    if (this.mode === 'roll') { w = 64; h = 70; }
    else if (this.sliding) { w = CFG.SLIDE_W; h = CFG.SLIDE_H; }
    else if (this.spinT > 0) h = CFG.TUCK_H;
    return { x: this.x - (w * s) / 2, y: this.y - h * s, w: w * s, h: h * s };
  }
  center() { const s = this.scale; return { x: this.x, y: this.y - (this.sliding ? 24 : 48) * s }; }

  /** Returns 1 (jump), 2 (double) or 0 (buffered). */
  pressJump() {
    if (this.mode === 'fly') { this.thrust = true; return 0; }
    if (this.mode !== 'run' && this.mode !== 'roll') return 0;
    if (this.grounded || this.coyote > 0 || this.jumps === 0) { this.doJump(1); return 1; }
    if (this.jumps < 2) { this.doJump(2); return 2; }
    this.buffer = CFG.JUMP_BUFFER;
    return 0;
  }
  doJump(n) {
    this.vy = n === 1 ? -CFG.JUMP_V : -CFG.DJUMP_V;
    this.jumps = n;
    if (n === 2) this.spinT = this.spinDur;
    this.grounded = false; this.onPlat = null; this.coyote = 0; this.buffer = 0;
    this.sliding = false;
  }
  bounce(v) {
    this.vy = -v; this.jumps = 1; this.grounded = false; this.onPlat = null; this.coyote = 0; this.sliding = false; this.spinT = 0;
  }

  /**
   * Physics step. o: { speed, bridge, floatY, world }
   * Returns event string or null: 'land' | 'fallStart'
   */
  step(dt, world, o) {
    this.prevY = this.y;
    this.x += o.speed * dt;
    this.modeT += dt;
    this.animT += dt * (o.speed / 480);
    if (this.spinT > 0) this.spinT = Math.max(0, this.spinT - dt);
    if (this.landT > 0) this.landT -= dt;
    if (this.hurtT > 0) this.hurtT -= dt;
    if (this.flashT > 0) this.flashT -= dt;
    if (this.invuln > 0) this.invuln -= dt;
    if (this.coyote > 0) this.coyote -= dt;
    if (this.buffer > 0) this.buffer -= dt;
    this.scale += (this.targetScale - this.scale) * Math.min(1, dt * 9);
    let ev = null;

    if (this.mode === 'down') { this.vy = 0; return null; }
    if (this.mode === 'pit') { this.vy = Math.min(this.vy + G * dt, CFG.MAX_FALL); this.y += this.vy * dt; return null; }
    if (this.mode === 'fly') {
      const acc = this.thrust ? -4300 : 2500;
      this.vy = clamp(this.vy + acc * dt, -760, 880);
      this.y += this.vy * dt;
      if (this.y > GY - 6) { this.y = GY - 6; this.vy = Math.min(-420, -Math.abs(this.vy) * 0.5); ev = 'bounce'; }
      if (this.y < 150) { this.y = 150; this.vy = Math.max(0, this.vy); }
      this.grounded = false;
      return ev;
    }
    if (o.floatY != null) {
      const target = o.floatY;
      this.vy = clamp((target - this.y) * 5.5, -900, 600);
      this.y += this.vy * dt;
      this.grounded = false; this.onPlat = null; this.jumps = 1; this.spinT = 0;
      return null;
    }

    if (!this.grounded) {
      let g = G;
      if (this.slideHeld && this.vy > -150) g *= CFG.FAST_FALL;
      this.vy = Math.min(this.vy + g * dt, CFG.MAX_FALL * (this.slideHeld ? 1.25 : 1));
      this.y += this.vy * dt;
      if (this.vy >= 0) {
        const hw = 16 * Math.max(1, this.scale * 0.8);
        const plat = world.platformLanding(this.x, hw, this.prevY, this.y);
        if (plat) { this.land(plat.y, plat); ev = 'land'; }
        else if (this.y >= GY && this.prevY <= GY + 4 && (o.bridge || world.groundAt(this.x, 14 * Math.max(1, this.scale * 0.7)))) { this.land(GY, null); ev = 'land'; }
      }
    } else {
      let supported;
      if (this.onPlat) { const p = this.onPlat; supported = this.x - 16 <= p.x + p.w && this.x + 16 >= p.x; }
      else supported = o.bridge || !!world.groundAt(this.x, 14 * Math.max(1, this.scale * 0.7));
      if (!supported) {
        this.grounded = false; this.onPlat = null; this.coyote = CFG.COYOTE; this.vy = 40; this.jumps = 0; ev = 'fallStart';
      } else if (this.buffer > 0) { this.doJump(1); ev = 'bufferedJump'; }
    }
    this.sliding = this.grounded && this.slideHeld && this.mode === 'run';
    return ev;
  }
  land(y, plat) {
    this.y = y; this.vy = 0; this.grounded = true; this.onPlat = plat; this.jumps = 0; this.spinT = 0;
    this.landT = 0.09;
    if (this.buffer > 0) { this.doJump(1); this.landT = 0; }
  }

  // ------------------------------------------------------------------ anim
  frameIndex() {
    const A = this.meta?.anims;
    if (!A) return 0;
    const pick = (name, fpsOverride) => {
      const a = A[name];
      if (!a) return 0;
      const fr = a.frames;
      if (fr.length === 1) return fr[0];
      const fps = fpsOverride ?? a.fps ?? 10;
      const i = Math.floor(this.animT * fps);
      return a.loop === false ? fr[Math.min(fr.length - 1, i)] : fr[i % fr.length];
    };
    switch (this.mode) {
      case 'down': return this.modeT < 0.32 ? A.down.frames[0] : A.down.frames[1];
      case 'pit': return pick('pit');
      case 'roll': return A.tuck.frames[0];
      case 'fly': return pick('cheer', 8);
      case 'float': return pick('skill');
      case 'idle': return pick('idle');
      case 'cheer': return pick('cheer');
    }
    if (this.hurtT > 0.12) return A.hurt.frames[0];
    if (!this.grounded) {
      if (this.spinT > 0) return A.tuck.frames[0];
      if (this.vy < -300) return A.jump.frames[0];
      if (this.vy < 300) return A.apex.frames[0];
      return A.fall.frames[0];
    }
    if (this.sliding) return pick('slide');
    if (this.landT > 0) return A.land.frames[0];
    if (this.skillPose > 0) return pick('skill');
    return pick('run');
  }

  /** Draw at screen coords. o: { camX, time, ghost, auraColor, shield } */
  render(ctx, camX, time, o = {}) {
    if (!this.visible) return;
    const sx = this.x - camX, sy = this.y;
    const s = this.scale;
    const f = this.frameIndex();
    // ground shadow
    if (this.mode !== 'pit' && this.mode !== 'fly') {
      const surf = o.surface;
      if (surf != null) {
        const h = Math.max(0, surf - sy);
        const k = clamp(1 - h / 420, 0.25, 1);
        ctx.save(); ctx.globalAlpha = 0.28 * k * this.alpha; ctx.fillStyle = '#2a140c';
        ctx.beginPath(); ctx.ellipse(sx, surf + 1, 34 * s * k * (this.sliding ? 1.3 : 1), 8 * s * k, 0, 0, TAU); ctx.fill(); ctx.restore();
      }
    }
    // afterimages
    for (let i = 0; i < this.trail.length; i++) {
      const t = this.trail[i];
      const a = (i + 1) / (this.trail.length + 1) * 0.35 * this.alpha;
      this.drawBody(ctx, t.x - camX, t.y, t.f, t.rot, t.s, { alpha: a, tint: o.ghost || '#bfe8ff' });
    }
    // aura
    if (o.auraColor) {
      const pulse = 0.75 + 0.25 * Math.sin(time * 10);
      const r = 86 * s * pulse;
      const cy = sy - 50 * s;
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const g = ctx.createRadialGradient(sx, cy, 0, sx, cy, r);
      g.addColorStop(0, rgba(o.auraColor, 0.55)); g.addColorStop(0.5, rgba(o.auraColor, 0.22)); g.addColorStop(1, rgba(o.auraColor, 0));
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(sx, cy, r, 0, TAU); ctx.fill(); ctx.restore();
    }
    let alpha = this.alpha;
    if (this.invuln > 0 && !o.noBlink && this.mode === 'run') alpha *= (Math.floor(time * 16) % 2 === 0) ? 0.45 : 1;
    let rot = 0;
    if (this.mode === 'roll') rot = this.rollAngle;
    else if (this.spinT > 0) rot = (1 - this.spinT / this.spinDur) * TAU;
    this.drawBody(ctx, sx, sy, f, rot, s, { alpha });
    if (this.flashT > 0 && Math.floor(this.flashT * 30) % 2 === 0) this.drawBody(ctx, sx, sy, f, rot, s, { alpha: 0.8 * alpha, tint: '#ffffff' });
    if (o.shield) {
      const pulse = 1 + Math.sin(time * 6) * 0.04;
      Assets.draw(ctx, 'fx', 'bubble', sx, sy - 52 * s, { scale: 0.62 * s * pulse, alpha: 0.85 * this.alpha });
    }
  }
  drawBody(ctx, sx, sy, f, rot, s, o) {
    if (rot) {
      const pv = 38 * s;
      ctx.save();
      ctx.translate(sx, sy - pv);
      ctx.rotate(rot);
      Assets.draw(ctx, this.sheet, f, 0, pv, { scale: s, alpha: o.alpha, tint: o.tint });
      ctx.restore();
    } else Assets.draw(ctx, this.sheet, f, sx, sy, { scale: s, alpha: o.alpha, tint: o.tint });
  }
  pushTrail(dt, on) {
    if (!on) { if (this.trail.length) this.trail.shift(); return; }
    this.trailT -= dt;
    if (this.trailT <= 0) {
      this.trailT = 0.035;
      let rot = 0;
      if (this.mode === 'roll') rot = this.rollAngle; else if (this.spinT > 0) rot = (1 - this.spinT / this.spinDur) * TAU;
      this.trail.push({ x: this.x - 26, y: this.y, f: this.frameIndex(), rot, s: this.scale });
      if (this.trail.length > 5) this.trail.shift();
    }
  }
}
