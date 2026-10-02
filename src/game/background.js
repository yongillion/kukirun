// =============================================================================
//  Parallax background per land: sky gradient, sun/moon, drifting clouds,
//  far/mid/near layers, ambient particles; cross-fades between lands.
// =============================================================================
import { Assets } from '../engine/assets.js';
import { rand, TAU, rgba } from '../engine/util.js';

const VW = 2800; // virtual wrap width for clouds

function buildLand(id) {
  const far = Assets.meta(`bg_${id}_far`) || {};
  const cl = Assets.meta(`clouds_${id}`);
  const st = {
    id, sky: far.sky || ['#6cc3f2', '#a8dcf7', '#d8f3ff'], fog: far.fog || '#ffffff', ambient: far.ambient || null,
    clouds: [], ceil: [], fixed: [],
  };
  if (cl) {
    const names = Object.keys(cl.frames);
    for (const n of names) {
      const info = (cl.info && cl.info[n]) || {};
      if (info.fixed) st.fixed.push({ f: n, y: info.y ?? 200 });
    }
    const top = names.filter((n) => cl.info?.[n]?.anchor === 'top');
    const free = names.filter((n) => !cl.info?.[n]?.fixed && cl.info?.[n]?.anchor !== 'top');
    let x = 0;
    while (top.length && x < VW) { const f = rand.pick(top); st.ceil.push({ f, x }); x += Assets.size(`clouds_${id}`, f).w * rand.range(0.55, 0.85); }
    const n = id === 'cavern' ? 7 : 9;
    for (let i = 0; i < n && free.length; i++) {
      const f = free[i % free.length];
      const info = cl.info?.[f] || {};
      const yr = Array.isArray(info.y) ? info.y : [40, 250];
      st.clouds.push({ f, x: (i / n) * VW + rand.range(-120, 120), y: rand.range(yr[0], yr[1]), p: info.speed ?? 0.05, drift: info.glow ? 0 : rand.range(4, 10), glow: !!info.glow, ph: rand() * TAU });
    }
    st.clouds.sort((a, b) => a.p - b.p);
  }
  return st;
}

export class Background {
  constructor() {
    this.cache = {};
    this.cur = null; this.prev = null; this.blend = 1;
    this.t = 0;
    this.amb = [];
    this.ambType = null;
    this.speed = 0;
  }
  land(id) { return this.cache[id] || (this.cache[id] = buildLand(id)); }
  set(id, instant = false) {
    const st = this.land(id);
    if (this.cur && this.cur.id === id) return;
    this.prev = instant ? null : this.cur;
    this.cur = st;
    this.blend = instant || !this.prev ? 1 : 0;
    this.setAmbient(st.ambient);
  }
  setAmbient(type) {
    if (type === this.ambType) return;
    this.ambType = type;
    this.amb.length = 0;
    const n = { petals: 22, dust: 26, spores: 26, snow: 60, stars: 46, sparkles: 34 }[type] || 0;
    for (let i = 0; i < n; i++) this.amb.push(this.newAmb(type, true));
  }
  newAmb(type, init) {
    const W = 1600;
    const a = { x: rand.range(0, W + 200), y: rand.range(-20, 640), vx: 0, vy: 0, s: rand.range(0.6, 1.2), r: rand() * TAU, vr: rand.range(-2, 2), ph: rand() * TAU, a: 1 };
    if (!init) { a.x = W + rand.range(0, 200); }
    switch (type) {
      case 'petals': a.vx = rand.range(-50, -25); a.vy = rand.range(18, 40); a.c = rand.pick(['#ffb3cf', '#ffe1ec', '#ffffff', '#ffd27a']); if (!init) a.y = rand.range(-40, 300); break;
      case 'dust': a.vx = rand.range(-90, -40); a.vy = rand.range(-6, 6); a.c = rand.pick(['#fff1c9', '#ffd9a0', '#f6c58a']); a.s = rand.range(0.4, 1); break;
      case 'spores': a.vx = rand.range(-12, 6); a.vy = rand.range(-22, -8); a.c = rand.pick(['#c08bff', '#7ff0ff', '#ffb0f0']); if (!init) { a.x = rand.range(0, W); a.y = 660; } break;
      case 'snow': a.vx = rand.range(-40, -15); a.vy = rand.range(40, 90); a.s = rand.range(0.5, 1.4); if (!init) { a.x = rand.range(0, W + 300); a.y = -10; } break;
      case 'stars': a.y = rand.range(0, 330); a.x = rand.range(0, W); a.vx = 0; a.s = rand.range(0.5, 1.3); break;
      case 'sparkles': a.vx = rand.range(-60, -20); a.vy = rand.range(-10, 10); a.c = rand.pick(['#ffffff', '#fff3a0', '#ffc0ea', '#c8f0ff']); break;
    }
    return a;
  }

  update(dt, scrollSpeed = 0) {
    this.t += dt;
    this.speed = scrollSpeed;
    if (this.blend < 1) { this.blend = Math.min(1, this.blend + dt / 1.6); if (this.blend >= 1) this.prev = null; }
    const type = this.ambType;
    for (let i = 0; i < this.amb.length; i++) {
      const a = this.amb[i];
      if (type === 'stars') continue;
      a.x += (a.vx - scrollSpeed * 0.22) * dt;
      a.y += a.vy * dt;
      a.r += a.vr * dt;
      if (type === 'snow' || type === 'petals') a.x += Math.sin(this.t * 1.5 + a.ph) * 14 * dt;
      if (a.x < -40 || a.y > 680 || a.y < -60) this.amb[i] = this.newAmb(type, false);
    }
  }

  renderLand(ctx, st, W, H, camX, alpha) {
    if (alpha <= 0) return;
    ctx.save();
    if (alpha < 1) ctx.globalAlpha = alpha;
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, st.sky[0]); g.addColorStop(0.5, st.sky[1]); g.addColorStop(1, st.sky[2]);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    const cid = `clouds_${st.id}`;
    if (this.ambType === 'stars' && st.id === this.cur.id) this.renderStars(ctx, W);
    for (const f of st.fixed) Assets.draw(ctx, cid, f.f, W * 0.7 - (camX * 0.004) % 40, f.y);
    for (const c of st.clouds) {
      if (c.glow) continue;
      const x = ((((c.x - camX * c.p - this.t * c.drift) % VW) + VW) % VW) - 360;
      if (x > W + 360) continue;
      Assets.draw(ctx, cid, c.f, x, c.y);
    }
    const far = `bg_${st.id}_far`, mid = `bg_${st.id}_mid`, near = `bg_${st.id}_near`;
    const m = (id) => Assets.meta(id) || {};
    if (Assets.has(far)) Assets.tileX(ctx, far, camX * (m(far).parallax ?? 0.12), m(far).y ?? 180, 0, W);
    for (const c of st.ceil) {
      const x = ((((c.x - camX * 0.2) % VW) + VW) % VW) - 300;
      if (x < W + 300) Assets.draw(ctx, cid, c.f, x, 0);
    }
    if (Assets.has(mid)) Assets.tileX(ctx, mid, camX * (m(mid).parallax ?? 0.32), m(mid).y ?? 230, 0, W);
    for (const c of st.clouds) {
      if (!c.glow) continue;
      const x = ((((c.x - camX * 0.4) % VW) + VW) % VW) - 300;
      if (x > W + 300) continue;
      const pulse = 0.7 + 0.3 * Math.sin(this.t * 2 + c.ph);
      Assets.draw(ctx, cid, c.f, x, c.y + Math.sin(this.t * 0.8 + c.ph) * 10, { alpha: pulse, add: true });
    }
    if (Assets.has(near)) Assets.tileX(ctx, near, camX * (m(near).parallax ?? 0.62), m(near).y ?? 372, 0, W);
    ctx.restore();
  }

  renderStars(ctx, W) {
    ctx.save();
    for (const a of this.amb) {
      const tw = 0.45 + 0.55 * Math.abs(Math.sin(this.t * 1.7 + a.ph));
      ctx.globalAlpha = tw;
      ctx.fillStyle = '#fff8d8';
      const s = 1.6 * a.s;
      ctx.fillRect(a.x % W, a.y, s, s);
      if (a.s > 1.15) { ctx.globalAlpha = tw * 0.5; ctx.fillRect((a.x % W) - s * 1.5, a.y + s * 0.3, s * 4, s * 0.4); ctx.fillRect((a.x % W) + s * 0.3, a.y - s * 1.5, s * 0.4, s * 4); }
    }
    ctx.restore();
  }

  renderAmbient(ctx, W) {
    const type = this.ambType;
    if (!type || type === 'stars') return;
    ctx.save();
    for (const a of this.amb) {
      switch (type) {
        case 'petals':
          ctx.save(); ctx.translate(a.x, a.y); ctx.rotate(a.r); ctx.fillStyle = a.c; ctx.globalAlpha = 0.85;
          ctx.beginPath(); ctx.ellipse(0, 0, 6 * a.s, 3.2 * a.s, 0, 0, TAU); ctx.fill(); ctx.restore();
          break;
        case 'dust':
          ctx.globalAlpha = 0.45; ctx.fillStyle = a.c; ctx.beginPath(); ctx.arc(a.x, a.y, 2.4 * a.s, 0, TAU); ctx.fill();
          break;
        case 'spores': {
          const p = 0.55 + 0.45 * Math.sin(this.t * 3 + a.ph);
          ctx.globalCompositeOperation = 'lighter';
          ctx.globalAlpha = 0.35 * p; ctx.fillStyle = a.c; ctx.beginPath(); ctx.arc(a.x, a.y, 7 * a.s, 0, TAU); ctx.fill();
          ctx.globalAlpha = 0.9 * p; ctx.beginPath(); ctx.arc(a.x, a.y, 2.2 * a.s, 0, TAU); ctx.fill();
          ctx.globalCompositeOperation = 'source-over';
          break;
        }
        case 'snow':
          ctx.globalAlpha = 0.9; ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(a.x, a.y, 2.6 * a.s, 0, TAU); ctx.fill();
          break;
        case 'sparkles': {
          const p = Math.abs(Math.sin(this.t * 2.4 + a.ph));
          Assets.draw(ctx, 'fx', 'star_small', a.x, a.y, { scale: 0.5 + p * 0.5 * a.s, alpha: p, rot: a.r, add: true });
          break;
        }
      }
    }
    ctx.restore();
  }

  render(ctx, W, H, camX) {
    if (!this.cur) return;
    if (this.prev && this.blend < 1) this.renderLand(ctx, this.prev, W, H, camX, 1);
    this.renderLand(ctx, this.cur, W, H, camX, this.prev ? this.blend : 1);
    this.renderAmbient(ctx, W);
  }

  /** Fog tint overlay for depth near the horizon (optional). */
  haze(ctx, W, alpha = 0.12) {
    if (!this.cur) return;
    ctx.save(); ctx.globalAlpha = alpha; ctx.fillStyle = rgba(this.cur.fog, 1); ctx.fillRect(0, 0, W, 720); ctx.restore();
  }
}
