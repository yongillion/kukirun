// =============================================================================
//  Level chunks: a physics-aware builder (jelly arcs follow the real jump path
//  at the current speed) and the library of hand-designed patterns.
// =============================================================================
import { CFG } from '../config.js';
import { clamp } from '../engine/util.js';

const G = CFG.GRAVITY, J = CFG.JUMP_V, DJ = CFG.DJUMP_V, GY = CFG.GROUND_Y;
const LIFT = CFG.ARC_LIFT;

/** Simulate a ballistic runner path. Returns points {t,x,y} until feet reach landY descending. */
export function simPath(x0, y0, v, vy0, landY = GY, td = null) {
  const dt = 1 / 240;
  const pts = [{ t: 0, x: x0, y: y0 }];
  let t = 0, x = x0, y = y0, vy = vy0, dbl = td == null;
  for (let i = 0; i < 2400; i++) {
    if (!dbl && t >= td) { vy = -DJ; dbl = true; }
    vy = Math.min(vy + G * dt, CFG.MAX_FALL);
    y += vy * dt; x += v * dt; t += dt;
    if (vy > 0 && y >= landY) { pts.push({ t, x, y: landY }); break; }
    pts.push({ t, x, y });
  }
  return pts;
}
function yAtX(path, x) {
  let lo = 0, hi = path.length - 1;
  if (x <= path[0].x) return path[0].y;
  if (x >= path[hi].x) return path[hi].y;
  while (hi - lo > 1) { const m = (lo + hi) >> 1; if (path[m].x < x) lo = m; else hi = m; }
  const a = path[lo], b = path[hi];
  return a.y + (b.y - a.y) * ((x - a.x) / (b.x - a.x || 1));
}
function apexOf(path) { let best = path[0]; for (const p of path) if (p.y < best.y) best = p; return best; }

const SHAPES = {
  heart: ['.##.##.', '#######', '#######', '.#####.', '..###..', '...#...'],
  star: ['...#...', '..###..', '#######', '.#####.', '.##.##.', '#.....#'],
  diamond: ['..#..', '.###.', '#####', '.###.', '..#..'],
  smile: ['.#...#.', '.......', '#.....#', '.#...#.', '..###..'],
  arrow: ['..#..', '...#.', '#####', '...#.', '..#..'],
};

export class Builder {
  constructor(world, x, speed, land, rand, opts = {}) {
    this.world = world; this.x = x; this.start = x; this.v = speed; this.land = land; this.r = rand;
    this.sy = GY; this.gOpen = x; this.slots = []; this.opts = opts;
    this.jellyKind = opts.jellyKind || 'mix';
    this.n = 0; // jelly counter for mixing
    this.hasHazard = false;
    this.tutorial = null;
  }
  // ----------------------------------------------------------------- terrain
  closeGround(x) { if (this.gOpen !== null) { if (x > this.gOpen) this.world.addGround(this.gOpen, x, this.land); this.gOpen = null; } }
  openGround(x) { if (this.gOpen === null) this.gOpen = x; }
  finish() {
    this.closeGround(this.x);
    this.world.genX = this.x;
    return { start: this.start, end: this.x, slots: this.slots, hazard: this.hasHazard };
  }
  // ----------------------------------------------------------------- content
  kindAt() {
    this.n++;
    const k = this.jellyKind;
    if (k === 'mix') return this.n % 7 === 0 ? 'jelly_pink' : 'jelly';
    if (k === 'pinkmix') return this.n % 3 === 0 ? 'jelly' : 'jelly_pink';
    return k;
  }
  jelly(x, y, kind) { return this.world.addPick(kind || this.kindAt(), x, y); }
  line(x0, x1, y, kind, gap = CFG.JELLY_GAP) { for (let x = x0; x <= x1 + 0.1; x += gap) this.jelly(x, y, kind); }
  slot(x, y) { this.slots.push({ x, y }); }
  arc(path, o = {}) {
    const gap = o.gap ?? CFG.JELLY_GAP;
    const x0 = path[0].x + gap * (o.skip0 ?? 1), x1 = path[path.length - 1].x - gap * (o.skip1 ?? 0.5);
    const apex = apexOf(path);
    let bestStar = null;
    for (let x = x0; x <= x1; x += gap) {
      const y = yAtX(path, x) - LIFT;
      const nearApex = Math.abs(x - apex.x) < gap * 0.5;
      const kind = nearApex && o.apexKind ? o.apexKind : (o.kind || this.kindAt());
      const p = this.jelly(x, y, kind);
      if (nearApex) bestStar = p;
    }
    if (o.slot !== false) this.slot(apex.x, apex.y - LIFT);
    return bestStar;
  }
  obstacle(kind, x, extra = {}) {
    this.hasHazard = true;
    const o = this.world.addObstacle(kind, x, this.land, extra);
    if (this.tutorial) { o.tutorial = this.tutorial; this.tutorial = null; }
    return o;
  }
  // ----------------------------------------------------------------- moves
  /** Flat running for t seconds with a jelly line. o: { kind, coins, empty, deco } */
  run(t, o = {}) {
    const len = Math.max(0, t * this.v);
    const y = this.sy - (GY - CFG.JELLY_Y);
    if (!o.empty) {
      if (!o.kind && !o.wave && !o.coins && this.coinChance && len > 160 && this.r() < this.coinChance) o = { ...o, coins: true };
      if (o.coins) {
        let i = 0;
        for (let x = this.x + 20; x <= this.x + len - 10; x += 46) { this.world.addPick(i % 4 === 3 ? 'coin_g' : 'coin_s', x, y - 2); i++; }
      } else if (o.wave) {
        let i = 0;
        for (let x = this.x + 20; x <= this.x + len - 10; x += CFG.JELLY_GAP) { this.jelly(x, y - 34 - Math.sin(i * 0.55) * 32, o.kind); i++; }
      } else this.line(this.x + 20, this.x + len - 10, y, o.kind);
    }
    if (len > 0.35 * this.v && this.sy === GY) this.slot(this.x + len * 0.5, y);
    if (o.deco !== false && this.sy === GY && len > 180 && this.r() < 0.55) {
      this.world.addDeco(this.x + this.r.range(40, len - 40), 'deco' + this.r.int(0, 7), this.land, this.r.range(0.68, 0.86));
    }
    this.x += len;
    return this;
  }
  /** Single jump over a ground obstacle (low | low2 | fall | pop). */
  hop(type = 'low', o = {}) {
    const path = simPath(this.x, GY, this.v, -J, GY);
    const apex = apexOf(path);
    this.obstacle(type, apex.x + (o.shift || 0));
    this.arc(path, { apexKind: o.apexKind || (this.r() < 0.5 ? 'jelly_star' : null), kind: o.kind });
    this.x = path[path.length - 1].x;
    return this;
  }
  /** Double jump over a tall obstacle. */
  dhop(type = 'tall', o = {}) {
    const td = o.td ?? 0.27;
    const path = simPath(this.x, GY, this.v, -J, GY, td);
    const apex = apexOf(path);
    this.obstacle(type, apex.x - this.v * 0.02);
    this.arc(path, { apexKind: 'jelly_star', kind: o.kind });
    this.x = path[path.length - 1].x;
    return this;
  }
  /** Slide under hanging obstacles for t seconds. */
  duck(t, o = {}) {
    let len = Math.max(66, t * this.v);
    const lead = 40;
    const x0 = this.x + lead;
    if (len <= 100 && !o.beam) { len = 70; this.obstacle('hang', x0 + 35); }
    else { const w = Math.max(2, Math.round(len / 128)) * 128; len = w; this.obstacle('beam', x0, { w }); }
    this.line(this.x + 10, x0 + len + 40, CFG.SLIDE_JELLY_Y, o.kind || 'jelly');
    this.slot(x0 + len / 2, CFG.SLIDE_JELLY_Y);
    this.x = x0 + len + 50;
    return this;
  }
  /** Jump over a pit lasting about t seconds of flight. */
  leap(t, o = {}) {
    const path = simPath(this.x, GY, this.v, -J, GY);
    const L = path[path.length - 1].x - this.x;
    const w = clamp(t * this.v, 90, L - 0.22 * this.v);
    const p0 = this.x + (L - w) / 2;
    this.closeGround(p0); this.openGround(p0 + w);
    this.hasHazard = true;
    if (this.tutorial) { this.world.tutorialPits = this.world.tutorialPits || []; this.world.tutorialPits.push({ x: p0, kind: this.tutorial }); this.tutorial = null; }
    this.arc(path, { apexKind: 'jelly_star', kind: o.kind });
    this.x += L;
    return this;
  }
  /** Long pit that needs a double jump. */
  dleap(t, o = {}) {
    const td = 0.3;
    const path = simPath(this.x, GY, this.v, -J, GY, td);
    const L = path[path.length - 1].x - this.x;
    const w = clamp(t * this.v, 150, L - 0.32 * this.v);
    const p0 = this.x + (L - w) * 0.42;
    this.closeGround(p0); this.openGround(p0 + w);
    this.hasHazard = true;
    this.arc(path, { apexKind: 'jelly_big', kind: o.kind });
    this.x += L;
    return this;
  }
  /** Bounce pad launching a big arc. */
  spring(o = {}) {
    const sx = this.x + 40;
    this.world.addSpring(sx, this.land);
    this.line(this.x + 10, sx - 20, CFG.JELLY_Y);
    const path = simPath(sx, GY, this.v, -CFG.SPRING_V, GY);
    const L = path[path.length - 1].x - sx;
    if (o.pit) { const w = L * 0.55; const p0 = sx + L * 0.24; this.closeGround(p0); this.openGround(p0 + w); this.hasHazard = true; }
    this.arc(path, { kind: 'jelly_star', apexKind: o.apexKind || 'jelly_big', gap: 46 });
    if (o.coins) { const a = apexOf(path); for (let i = -2; i <= 2; i++) this.world.addPick('coin_g', a.x + i * 44, a.y - LIFT - 56 - Math.abs(i) * -8); }
    this.x = path[path.length - 1].x;
    return this;
  }
  /** Jump up onto a floating platform at height h above the ground, run on it for t seconds. o: { pit } */
  stepUp(h, t, o = {}) {
    const top = GY - h;
    const path = simPath(this.x, this.sy, this.v, -J, top);
    const land = path[path.length - 1].x;
    const px = land - 46;
    const w = Math.max(144, Math.round((t * this.v + 46) / 64) * 64 + 16);
    this.world.addPlat(px, top, w, this.land);
    if (o.pit) { this.closeGround(this.x + 0.2 * this.v); this.hasHazard = true; }
    this.arc(path, { kind: o.arcKind, skip1: 0.2 });
    this.x = land;
    this.sy = top;
    const y = top - (GY - CFG.JELLY_Y);
    this.line(this.x + 18, px + w - 16, y, o.kind || 'jelly_star', 46);
    this.slot((this.x + px + w) / 2, y);
    this.platEnd = px + w;
    this.x = px + w - 26; // take-off point a little before the edge
    return this;
  }
  /** Leave a platform: falls (or hops) back to the ground. o: { pitEnd, hop } */
  stepDown(o = {}) {
    if (!o.hop && this.platEnd) this.x = this.platEnd;
    this.platEnd = null;
    const path = simPath(this.x, this.sy, this.v, o.hop ? -J : 0, GY);
    const land = path[path.length - 1].x;
    if (o.pitEnd) this.openGround(land - 0.16 * this.v);
    this.arc(path, { kind: o.kind, skip0: o.hop ? 1 : 0.5, slot: false });
    this.x = land; this.sy = GY;
    return this;
  }
  /** A jelly picture floating in the air at the apex of a jump. */
  airShape(name, kind = 'jelly_pink', o = {}) {
    const rows = SHAPES[name];
    const path = simPath(this.x, GY, this.v, -J, GY);
    const apex = apexOf(path);
    const gap = 24, h = rows.length, w = rows[0].length;
    const cx = apex.x, cy = apex.y - LIFT - 10;
    rows.forEach((row, j) => { for (let i = 0; i < w; i++) if (row[i] === '#') this.world.addPick(kind, cx + (i - (w - 1) / 2) * gap, cy + (j - (h - 1) / 2) * gap); });
    this.arc(path, { kind: 'jelly', slot: false });
    this.x = path[path.length - 1].x;
    return this;
  }
  coins(t) { return this.run(t, { coins: true }); }
}

// =============================================================================
//  Pattern library. d = difficulty 0..5, need = required land special.
// =============================================================================
export const PATTERNS = [
  // breathers / rewards (d 0)
  { id: 'jelly_wave', d: 0, reward: true, fn: (b) => { b.run(0.4); b.run(1.0, { wave: true, kind: 'jelly_pink' }); b.run(0.3); } },
  { id: 'coin_road', d: 0, reward: true, fn: (b) => { b.run(0.3); b.coins(1.1); b.run(0.3); } },
  { id: 'heart_jump', d: 0, reward: true, fn: (b) => { b.run(0.45); b.airShape('heart'); b.run(0.35); b.airShape('star', 'jelly_star'); b.run(0.4); } },
  { id: 'spring_star', d: 0.5, reward: true, fn: (b) => { b.run(0.45); b.spring({ coins: true }); b.run(0.45); } },
  { id: 'diamond_run', d: 0.5, reward: true, fn: (b) => { b.run(0.4); b.airShape('diamond', 'jelly_star'); b.coins(0.5); b.airShape('smile', 'jelly_pink'); b.run(0.3); } },

  // basics (d 1)
  { id: 'hop', d: 1, fn: (b) => { b.run(0.55); b.hop('low'); b.run(0.5); } },
  { id: 'duck', d: 1, fn: (b) => { b.run(0.55); b.duck(0.2); b.run(0.5); } },
  { id: 'gap', d: 1, fn: (b) => { b.run(0.55); b.leap(0.26); b.run(0.5); } },
  { id: 'hop_wide', d: 1.5, fn: (b) => { b.run(0.5); b.hop('low2'); b.run(0.5); } },
  { id: 'tall', d: 1.5, fn: (b) => { b.run(0.55); b.dhop('tall'); b.run(0.5); } },
  { id: 'duck_long', d: 1.5, fn: (b) => { b.run(0.5); b.duck(0.75); b.run(0.45); } },
  { id: 'spring_gap', d: 1.5, fn: (b) => { b.run(0.45); b.spring({ pit: true }); b.run(0.45); } },

  // doubles (d 2)
  { id: 'hop_hop', d: 2, fn: (b) => { b.run(0.45); b.hop('low'); b.run(0.32); b.hop('low'); b.run(0.45); } },
  { id: 'duck_hop', d: 2, fn: (b) => { b.run(0.45); b.duck(0.45); b.run(0.32); b.hop('low'); b.run(0.45); } },
  { id: 'hop_duck', d: 2, fn: (b) => { b.run(0.45); b.hop('low'); b.run(0.3); b.duck(0.5); b.run(0.45); } },
  { id: 'gap_hop', d: 2, fn: (b) => { b.run(0.45); b.leap(0.28); b.run(0.34); b.hop('low'); b.run(0.45); } },
  { id: 'plat_bridge', d: 2, fn: (b) => { b.run(0.45); b.stepUp(112, 0.8, { pit: true }); b.stepDown({ pitEnd: true }); b.run(0.45); } },
  { id: 'drop_hop', d: 2, need: 'fall', fn: (b) => { b.run(0.55); b.hop('fall'); b.run(0.5); } },
  { id: 'pop_hop', d: 2, need: 'pop', fn: (b) => { b.run(0.55); b.hop('pop'); b.run(0.5); } },
  { id: 'tall_duck', d: 2.5, fn: (b) => { b.run(0.45); b.dhop('tall'); b.run(0.35); b.duck(0.4); b.run(0.45); } },
  { id: 'gap_gap', d: 2.5, fn: (b) => { b.run(0.45); b.leap(0.26); b.run(0.32); b.leap(0.3); b.run(0.45); } },
  { id: 'wide_gap', d: 2.5, fn: (b) => { b.run(0.5); b.dleap(0.62); b.run(0.5); } },
  { id: 'upper_route', d: 2.5, fn: (b) => {
    // upper route: a platform full of stars; lower route: two hops on the ground
    b.run(0.4);
    const start = b.x, v = b.v;
    b.stepUp(150, 1.3, { kind: 'jelly_star' });
    b.obstacle('low', start + v * 0.78);
    b.obstacle('low', start + v * 1.48);
    b.stepDown();
    b.run(0.45);
  } },

  // combos (d 3)
  { id: 'hop3', d: 3, fn: (b) => { b.run(0.4); b.hop('low'); b.run(0.24); b.hop('low'); b.run(0.24); b.hop('low'); b.run(0.4); } },
  { id: 'tall_hop', d: 3, fn: (b) => { b.run(0.4); b.dhop('tall'); b.run(0.3); b.hop('low2'); b.run(0.45); } },
  { id: 'duck_gap', d: 3, fn: (b) => { b.run(0.4); b.duck(0.55); b.run(0.36); b.leap(0.3); b.run(0.45); } },
  { id: 'gap_duck', d: 3, fn: (b) => { b.run(0.4); b.leap(0.3); b.run(0.34); b.duck(0.6); b.run(0.45); } },
  { id: 'drop_duck', d: 3, need: 'fall', fn: (b) => { b.run(0.45); b.hop('fall'); b.run(0.3); b.duck(0.45); b.hop('fall'); b.run(0.45); } },
  { id: 'pop_pop', d: 3, need: 'pop', fn: (b) => { b.run(0.45); b.hop('pop'); b.run(0.26); b.hop('pop'); b.run(0.45); } },
  { id: 'plat_steps', d: 3, fn: (b) => { b.run(0.4); b.stepUp(95, 0.42, { pit: true }); b.stepUp(190, 0.5); b.stepDown({ pitEnd: true, hop: true }); b.run(0.3); b.hop('low'); b.run(0.45); } },
  { id: 'duck_tall', d: 3, fn: (b) => { b.run(0.4); b.duck(0.5); b.run(0.34); b.dhop('tall'); b.run(0.45); } },

  // hard (d 4+)
  { id: 'rhythm', d: 4, fn: (b) => { b.run(0.35); b.hop('low'); b.run(0.22); b.duck(0.35); b.run(0.26); b.hop('low2'); b.run(0.22); b.duck(0.3); b.run(0.4); } },
  { id: 'tall_tall', d: 4, fn: (b) => { b.run(0.35); b.dhop('tall'); b.run(0.3); b.dhop('tall'); b.run(0.45); } },
  { id: 'gap_tall', d: 4, fn: (b) => { b.run(0.35); b.leap(0.32); b.run(0.32); b.dhop('tall'); b.run(0.32); b.duck(0.4); b.run(0.4); } },
  { id: 'gauntlet', d: 4.5, fn: (b) => { b.run(0.35); b.hop('low'); b.run(0.22); b.leap(0.3); b.run(0.25); b.duck(0.45); b.run(0.25); b.hop('low2'); b.run(0.4); } },
  { id: 'drop_gauntlet', d: 4.5, need: 'fall', fn: (b) => { b.run(0.35); b.hop('fall'); b.run(0.22); b.dhop('tall'); b.run(0.26); b.hop('fall'); b.run(0.22); b.duck(0.35); b.run(0.4); } },
  { id: 'pop_gauntlet', d: 4.5, need: 'pop', fn: (b) => { b.run(0.35); b.hop('pop'); b.run(0.22); b.duck(0.4); b.run(0.24); b.hop('pop'); b.run(0.22); b.leap(0.3); b.run(0.4); } },
  { id: 'chaos', d: 5, fn: (b) => { b.run(0.3); b.hop('low'); b.run(0.2); b.hop('low'); b.run(0.22); b.dhop('tall'); b.run(0.24); b.duck(0.5); b.run(0.22); b.dleap(0.6); b.run(0.4); } },
];
export const PATTERN = Object.fromEntries(PATTERNS.map((p) => [p.id, p]));
