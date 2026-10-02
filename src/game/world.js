// =============================================================================
//  World: terrain (ground segments with pits, floating platforms) and entities
//  (obstacles, pickups, springs, decorations, signs). Rendering included.
// =============================================================================
import { CFG } from '../config.js';
import { Assets } from '../engine/assets.js';
import { rgba, TAU } from '../engine/util.js';

const GY = CFG.GROUND_Y;
const OVER_Y = CFG.OVERHEAD_Y;

export const PICK = {
  jelly: { sprite: 'jelly', r: 13, score: 'jelly' },
  jelly_pink: { sprite: 'jelly_pink', r: 15, score: 'jelly_pink' },
  jelly_star: { sprite: 'jelly_star', r: 20, score: 'jelly_star' },
  jelly_choco: { sprite: 'jelly_choco', r: 16, score: 'jelly_choco' },
  jelly_big: { sprite: 'jelly_big', r: 34, score: 'jelly_big' },
  jelly_rainbow: { sprite: 'jelly_rainbow', r: 40, score: 'jelly_rainbow' },
  jelly_giant: { sprite: 'jelly_giant', r: 68, score: 'jelly_giant' },
  coin_s: { anim: 'coin_s', r: 15, coin: 's' },
  coin_g: { anim: 'coin_g', r: 17, coin: 'g' },
  coin_b: { anim: 'coin_b', r: 30, coin: 'b' },
  milk_s: { sprite: 'milk_s', r: 24, milk: 's' },
  milk_l: { sprite: 'milk_l', r: 30, milk: 'l' },
  pw: { r: 30 },
  letter: { r: 27 },
};
const COIN_FRAMES = {
  coin_s: ['coin_s0', 'coin_s1', 'coin_s2', 'coin_s3', 'coin_s4', 'coin_s5'],
  coin_g: ['coin_g0', 'coin_g1', 'coin_g2', 'coin_g3', 'coin_g4', 'coin_g5'],
  coin_b: ['coin_b0', 'coin_b1', 'coin_b2', 'coin_b3', 'coin_b4', 'coin_b5'],
};

export class World {
  constructor() {
    this.ground = [];   // {x0, x1, land}
    this.plats = [];    // {x, y, w, land}
    this.obs = [];
    this.picks = [];
    this.springs = [];
    this.decos = [];
    this.signs = [];
    this.genX = 0;
    this.lettersInFlight = new Set();
  }

  // ---------------------------------------------------------------- building
  addGround(x0, x1, land) {
    if (x1 - x0 < 1) return;
    const last = this.ground[this.ground.length - 1];
    if (last && Math.abs(last.x1 - x0) < 0.5 && last.land === land) { last.x1 = Math.max(last.x1, x1); return; }
    this.ground.push({ x0, x1, land });
  }
  addPlat(x, y, w, land) { this.plats.push({ x, y, w, land }); }
  addPick(kind, x, y, extra) {
    const def = PICK[kind.startsWith('pw:') ? 'pw' : kind];
    const p = { kind, x, y, r: def ? def.r : 14, taken: false, mag: false, vx: 0, vy: 0, ph: (x * 0.013) % TAU, born: 0, fall: false, ...extra };
    this.picks.push(p);
    if (kind === 'letter') this.lettersInFlight.add(p.idx);
    return p;
  }
  addObstacle(kind, x, land, extra = {}) {
    const o = { kind, x, y: GY, land, w: 0, state: 'idle', t: 0, smashed: false, vx: 0, vy: 0, rot: 0, vr: 0, hit: { x: 0, y: 0, w: 0, h: 0 }, tutorial: null, ...extra };
    const info = Assets.meta('obs_' + land)?.info || {};
    if (kind === 'hang') { o.y = OVER_Y; }
    else if (kind === 'beam') { o.y = OVER_Y; }
    else if (kind === 'fall') { o.state = 'hanging'; o.y = 150; }
    else if (kind === 'pop') { o.state = 'hidden'; }
    o.hdef = (info[kind === 'pop' ? 'pop1' : kind] || {}).hit || { x: -22, y: -58, w: 44, h: 58 };
    this.updateHit(o);
    this.obs.push(o);
    return o;
  }
  updateHit(o) {
    const h = o.hit;
    if (o.kind === 'hang') { h.x = o.x + o.hdef.x; h.w = o.hdef.w; h.y = -400; h.h = OVER_Y + o.hdef.y + o.hdef.h + 400; }
    else if (o.kind === 'beam') { h.x = o.x + 4; h.w = o.w - 8; h.y = -400; h.h = OVER_Y - 6 + 400; }
    else { h.x = o.x + o.hdef.x; h.y = o.y + o.hdef.y; h.w = o.hdef.w; h.h = o.hdef.h; }
  }
  addSpring(x, land) { this.springs.push({ x, land, t: 0 }); }
  addDeco(x, name, land, s = 0.8) { this.decos.push({ x, name, land, s }); }
  addSign(x, landIdx, land, label) { this.signs.push({ x, landIdx, land, label }); }

  // ---------------------------------------------------------------- queries
  groundAt(x, halfW = 14) {
    for (const g of this.ground) {
      if (g.x0 > x + halfW) break;
      if (g.x1 >= x - halfW) return g;
    }
    return null;
  }
  segmentAt(x) {
    for (const g of this.ground) { if (g.x0 > x) break; if (g.x1 >= x) return g; }
    return null;
  }
  /** Platform the feet land on while moving from prevY to y (one-way). */
  platformLanding(x, halfW, prevY, y) {
    for (const p of this.plats) {
      if (p.x > x + halfW) continue;
      if (p.x + p.w < x - halfW) continue;
      if (prevY <= p.y + 6 && y >= p.y) return p;
    }
    return null;
  }
  platformUnder(x, halfW, y) {
    for (const p of this.plats) {
      if (p.x <= x + halfW && p.x + p.w >= x - halfW && Math.abs(y - p.y) < 2) return p;
    }
    return null;
  }
  /** Surface height directly below (x, fromY) — ground or platform, else null. */
  surfaceBelow(x, fromY = 0) {
    let best = null;
    for (const p of this.plats) if (p.x <= x && p.x + p.w >= x && p.y >= fromY && (best === null || p.y < best)) best = p.y;
    if (this.groundAt(x, 0) && (best === null || GY < best) && GY >= fromY) best = GY;
    return best;
  }

  // ---------------------------------------------------------------- upkeep
  cull(minX) {
    const keep = (arr, xOf) => { let i = 0; while (i < arr.length && xOf(arr[i]) < minX) i++; if (i) arr.splice(0, i); };
    keep(this.ground, (g) => g.x1);
    keep(this.plats, (p) => p.x + p.w);
    keep(this.springs, (s) => s.x + 60);
    keep(this.decos, (d) => d.x + 140);
    keep(this.signs, (s) => s.x + 200);
    this.obs = this.obs.filter((o) => (o.kind === 'beam' ? o.x + o.w : o.x + 150) >= minX && !(o.smashed && o.t > 2.5));
    const before = this.picks.length;
    this.picks = this.picks.filter((p) => {
      const keepIt = !p.taken && p.x >= minX - 40 && p.y < 1400;
      if (!keepIt && p.kind === 'letter') this.lettersInFlight.delete(p.idx);
      return keepIt || (p.taken && p.t < 0.5);
    });
    return before - this.picks.length;
  }

  // ---------------------------------------------------------------- render
  renderDecos(ctx, camX, W) {
    for (const d of this.decos) {
      const x = d.x - camX;
      if (x < -150 || x > W + 150) continue;
      Assets.draw(ctx, 'obs_' + d.land, d.name, x, GY + 4, { scale: d.s });
    }
    for (const s of this.signs) {
      const x = s.x - camX;
      if (x < -200 || x > W + 200) continue;
      const id = 'obs_' + s.land;
      Assets.draw(ctx, id, 'sign', x, GY + 2);
      const b = Assets.meta(id)?.info?.sign?.board;
      if (b) {
        const sz = Assets.size(id, 'sign');
        const bx = x - sz.ax + b.x / 2, by = GY + 2 - sz.ay + b.y / 2, bw = b.w / 2, bh = b.h / 2;
        ctx.save();
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillStyle = '#4a2a1a';
        ctx.font = '700 15px "DDNum", sans-serif';
        ctx.fillText(s.label[0], bx + bw / 2, by + bh * 0.3);
        ctx.font = '900 16px "DDDisplay", sans-serif';
        ctx.fillText(s.label[1], bx + bw / 2, by + bh * 0.68, bw - 8);
        ctx.restore();
      }
    }
  }

  renderGround(ctx, camX, W, bridge = 0) {
    const x0v = camX - 80, x1v = camX + W + 80;
    // pits: soft dark gradient for depth
    for (let i = 0; i <= this.ground.length; i++) {
      const a = this.ground[i - 1], b = this.ground[i];
      const px0 = a ? a.x1 : -1e9, px1 = b ? b.x0 : 1e12;
      if (px1 - px0 < 2 || px1 < x0v || px0 > x1v) continue;
      const land = (b || a)?.land || 'meadow';
      const pitCol = Assets.meta('ground_' + land)?.pit || '#3a2018';
      const sx0 = Math.max(px0, x0v) - camX, sx1 = Math.min(px1, x1v) - camX;
      const g = ctx.createLinearGradient(0, GY - 6, 0, 720);
      g.addColorStop(0, rgba(pitCol, 0)); g.addColorStop(0.07, rgba(pitCol, 0.7)); g.addColorStop(0.45, rgba(pitCol, 0.96)); g.addColorStop(1, rgba(pitCol, 1));
      ctx.fillStyle = g; ctx.fillRect(sx0, GY - 6, sx1 - sx0, 720 - GY + 6);
      // inner shadow on both walls for depth
      const wsh = Math.min(26, (sx1 - sx0) / 3);
      for (const [x, dir] of [[sx0, 1], [sx1, -1]]) {
        const sg = ctx.createLinearGradient(x, 0, x + dir * wsh, 0);
        sg.addColorStop(0, 'rgba(0,0,0,0.35)'); sg.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = sg; ctx.fillRect(Math.min(x, x + dir * wsh), GY, wsh, 720 - GY);
      }
      if (bridge > 0) { // magic sugar bridge while protected
        ctx.save(); ctx.globalAlpha = 0.55 * bridge;
        const bg = ctx.createLinearGradient(0, GY - 6, 0, GY + 16);
        bg.addColorStop(0, '#fff6c8'); bg.addColorStop(1, 'rgba(255,200,240,0)');
        ctx.fillStyle = bg; ctx.fillRect(sx0, GY - 4, sx1 - sx0, 20);
        ctx.restore();
      }
    }
    for (let i = 0; i < this.ground.length; i++) {
      const g = this.ground[i];
      if (g.x1 < x0v) continue;
      if (g.x0 > x1v) break;
      const id = 'ground_' + g.land;
      const fr = Assets.frame(id, 0);
      if (!fr) continue;
      const tw = fr.sw / fr.s, th = fr.sh / fr.s, top = GY - 18;
      const sx0 = Math.max(g.x0, x0v), sx1 = Math.min(g.x1, x1v);
      ctx.save();
      ctx.beginPath(); ctx.rect(sx0 - camX, top - 40, sx1 - sx0, th + 60); ctx.clip();
      const k0 = Math.floor(sx0 / tw);
      for (let k = k0; k * tw < sx1; k++) ctx.drawImage(fr.img, fr.sx, fr.sy, fr.sw, fr.sh, k * tw - camX, top, tw + 0.5, th);
      ctx.restore();
      const prev = this.ground[i - 1], next = this.ground[i + 1];
      const capId = 'groundcap_' + g.land;
      if (Assets.has(capId)) {
        if (!prev || prev.x1 < g.x0 - 1) Assets.draw(ctx, capId, 'left', g.x0 - camX, GY);
        if (!next || next.x0 > g.x1 + 1) { if (next || g.x1 < this.genX - 2) Assets.draw(ctx, capId, 'right', g.x1 - camX, GY); }
      }
    }
  }

  renderPlats(ctx, camX, W) {
    for (const p of this.plats) {
      const x = p.x - camX;
      if (x > W + 50 || x + p.w < -50) continue;
      const id = 'plat_' + p.land;
      if (!Assets.has(id)) { ctx.fillStyle = '#c98a4b'; ctx.fillRect(x, p.y, p.w, 30); continue; }
      const y = p.y;
      Assets.draw(ctx, id, 'left', x, y);
      const mids = Math.round((p.w - 80) / 64);
      for (let i = 0; i < mids; i++) Assets.draw(ctx, id, 'mid', x + 40 + i * 64, y);
      Assets.draw(ctx, id, 'right', x + 40 + mids * 64, y);
    }
  }

  renderSprings(ctx, camX, W) {
    for (const s of this.springs) {
      const x = s.x - camX;
      if (x < -100 || x > W + 100) continue;
      Assets.draw(ctx, 'obs_common', s.t > 0 ? 'spring1' : 'spring0', x, GY + 2);
    }
  }

  renderObstacles(ctx, camX, W, time) {
    for (const o of this.obs) {
      const id = 'obs_' + o.land;
      const sx = o.x - camX;
      if (o.kind === 'beam') { if (sx > W + 60 || sx + o.w < -60) continue; }
      else if (sx < -160 || sx > W + 160) continue;
      if (o.smashed) {
        const a = Math.max(0, 1 - o.t / 1.4);
        if (o.kind === 'beam') continue;
        Assets.draw(ctx, id, o.kind === 'pop' ? 'pop1' : o.kind, sx + o.vx * 0 , o.y, { rot: o.rot, alpha: a });
        continue;
      }
      switch (o.kind) {
        case 'hang': {
          const head = Assets.size(id, 'hang');
          const topY = o.y - head.h + 4;
          const ch = Assets.size(id, 'chain');
          const sway = Math.sin(time * 2 + o.x * 0.01) * 0.0;
          for (let y = topY; y > -ch.h; y -= ch.h - 1) Assets.draw(ctx, id, 'chain', sx + sway, y);
          Assets.draw(ctx, id, 'hang', sx, o.y);
          break;
        }
        case 'beam': {
          const n = Math.max(1, Math.round(o.w / 128));
          const ch = Assets.size(id, 'chain');
          const bh = Assets.size(id, 'beam').h;
          for (const cxp of [sx + 30, sx + o.w - 30]) for (let y = o.y - bh + 10; y > -ch.h; y -= ch.h - 1) Assets.draw(ctx, id, 'chain', cxp, y);
          for (let i = 0; i < n; i++) Assets.draw(ctx, id, 'beam', sx + i * 128, o.y);
          break;
        }
        case 'fall': {
          let jx = 0;
          if (o.state === 'shake') jx = Math.sin(time * 70) * 3;
          if (o.state === 'hanging' || o.state === 'shake') {
            // short tether to the top
            ctx.save(); ctx.strokeStyle = 'rgba(74,42,26,0.7)'; ctx.lineWidth = 3;
            ctx.beginPath(); ctx.moveTo(sx, -10); ctx.lineTo(sx + jx, o.y - Assets.size(id, 'fall').h + 8); ctx.stroke(); ctx.restore();
            // warning shadow on the ground
            ctx.save(); ctx.globalAlpha = 0.25 + (o.state === 'shake' ? 0.25 : 0);
            ctx.fillStyle = '#2a1018'; ctx.beginPath(); ctx.ellipse(sx, GY - 2, 34, 8, 0, 0, TAU); ctx.fill(); ctx.restore();
          }
          Assets.draw(ctx, id, 'fall', sx + jx, o.y);
          break;
        }
        case 'pop': {
          if (o.state === 'hidden') {
            const pulse = 0.5 + 0.5 * Math.sin(time * 9 + o.x);
            Assets.draw(ctx, id, 'pop0', sx, GY + 2);
            ctx.save(); ctx.globalAlpha = 0.18 + 0.2 * pulse; ctx.globalCompositeOperation = 'lighter';
            ctx.fillStyle = '#bfefff'; ctx.beginPath(); ctx.ellipse(sx, GY - 6, 34, 10, 0, 0, TAU); ctx.fill(); ctx.restore();
          } else {
            const k = Math.min(1, o.t / 0.12);
            Assets.draw(ctx, id, 'pop1', sx, GY + 2, { sy: 0.3 + 0.7 * k + (k >= 1 ? Math.max(0, 0.15 - (o.t - 0.12)) : 0) });
          }
          break;
        }
        default:
          Assets.draw(ctx, id, o.kind, sx, o.y + 2);
      }
    }
  }

  renderPicks(ctx, camX, W, time, rushStyle = false) {
    for (const p of this.picks) {
      const x = p.x - camX;
      if (x < -80 || x > W + 80) continue;
      let y = p.y;
      if (p.taken) {
        const k = p.t / 0.35;
        if (k >= 1) continue;
        this.drawPick(ctx, p, x, y - k * 26, time, 1 - k, 1 + k * 0.6);
        continue;
      }
      if (!p.mag && !p.fall) y += Math.sin(time * 3.2 + p.ph) * (p.kind.startsWith('pw:') || p.kind === 'letter' || p.kind.startsWith('milk') ? 5 : 1.6);
      let a = 1;
      if (p.born > 0) a = Math.min(1, p.born);
      this.drawPick(ctx, p, x, y, time, a, p.born > 0 ? 0.4 + 0.6 * Math.min(1, p.born) : 1);
    }
  }

  drawPick(ctx, p, x, y, time, alpha = 1, scale = 1) {
    const k = p.kind;
    if (COIN_FRAMES[k]) {
      const fr = COIN_FRAMES[k];
      const f = fr[Math.floor((time * (k === 'coin_b' ? 10 : 12) + p.ph * 3) % fr.length)];
      Assets.draw(ctx, 'items', f, x, y, { alpha, scale });
      return;
    }
    if (k.startsWith('pw:')) {
      const name = 'pw_' + k.slice(3);
      const pulse = 1 + Math.sin(time * 6 + p.ph) * 0.05;
      Assets.draw(ctx, 'fx', 'glow', x, y, { scale: 0.62 * pulse * scale, alpha: 0.65 * alpha, add: true });
      Assets.draw(ctx, 'items', name, x, y, { alpha, scale: pulse * scale });
      return;
    }
    if (k === 'letter') {
      const pulse = 1 + Math.sin(time * 5 + p.ph) * 0.06;
      Assets.draw(ctx, 'fx', 'glow', x, y, { scale: 0.55 * scale, alpha: 0.6 * alpha, add: true });
      Assets.draw(ctx, 'items', 'letter_' + p.idx, x, y, { alpha, scale: pulse * scale });
      return;
    }
    if (k === 'milk_l') Assets.draw(ctx, 'fx', 'glow', x, y, { scale: 0.6 * scale, alpha: 0.5 * alpha, add: true });
    if (k === 'jelly_giant' || k === 'jelly_rainbow') Assets.draw(ctx, 'fx', 'glow_gold', x, y, { scale: (k === 'jelly_giant' ? 1.1 : 0.6) * scale, alpha: 0.55 * alpha, add: true });
    const def = PICK[k];
    Assets.draw(ctx, 'items', def ? def.sprite : 'jelly', x, y, alpha === 1 && scale === 1 ? undefined : { alpha, scale });
  }
}
