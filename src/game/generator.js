// =============================================================================
//  Level generator: streams chunks ahead of the runner, paces difficulty per
//  land, inserts land transitions and schedules milk / letters / power-ups
//  into the "slots" each chunk exposes on its natural path.
// =============================================================================
import { CFG, LAND_IDS } from '../config.js';
import { Builder, PATTERNS } from './chunks.js';
import { LANDS, POWERUPS } from '../data/content.js';
import { makeRand, mulberry32, clamp } from '../engine/util.js';

const TUTORIAL = [
  (b) => { b.run(1.5, { deco: false }); },
  (b) => { b.tutorial = 'jump'; b.hop('low'); b.run(1.0); },
  (b) => { b.tutorial = 'double'; b.dhop('tall'); b.run(1.0); },
  (b) => { b.tutorial = 'slide'; b.duck(0.65); b.run(1.0); },
  (b) => { b.tutorial = 'gap'; b.leap(0.28); b.run(0.6); b.slot(b.x, CFG.JELLY_Y); b.forceMilk = true; b.run(1.0); },
];

export class Generator {
  constructor(run, opts = {}) {
    this.run = run;
    this.world = run.world;
    this.rand = makeRand(mulberry32(opts.seed ?? ((Date.now() * 7919) >>> 0)));
    this.landIdx = 0; this.lap = 0;
    this.landClock = 0;
    this.clock = 0;
    this.recent = [];
    this.sinceReward = 0;
    this.next = { milk: 6, bigmilk: 34, letter: 5, item: 8 };
    this.lastItem = null;
    this.tutorial = opts.tutorial ? TUTORIAL.slice() : null;
    this.transitions = [];
    this.started = false;
    this.startRun = opts.startRun ?? 1.4;
  }

  speed(landIdx = this.landIdx, lap = this.lap) { return Math.min(CFG.MAX_SPEED, CFG.LAND_SPEEDS[landIdx] + lap * CFG.LAP_SPEED); }
  get land() { return LAND_IDS[this.landIdx]; }

  fill(toX) { let guard = 0; while (this.world.genX < toX && guard++ < 30) this.chunk(); }

  builder(land = this.land, v = this.speed()) { return new Builder(this.world, this.world.genX, v, land, this.rand); }

  chunk() {
    const v = this.speed();
    let b;
    if (!this.started) {
      this.started = true;
      b = this.builder();
      b.run(this.startRun, { deco: false });
    } else if (this.tutorial && this.tutorial.length) {
      b = this.builder();
      this.tutorial.shift()(b);
    } else if (this.landClock >= CFG.LAND_TIME) {
      this.transition();
      return;
    } else {
      const p = this.pick();
      b = this.builder();
      b.jellyKind = this.rand() < 0.18 ? 'pinkmix' : 'mix';
      b.coinChance = 0.14;
      p.fn(b);
      b.run(0.12, { deco: false });
      this.recent.push(p.id); if (this.recent.length > 4) this.recent.shift();
      this.sinceReward = p.reward ? 0 : this.sinceReward + 1;
    }
    const res = b.finish();
    const dur = (res.end - res.start) / v;
    this.assignSpecials(res, dur, v, b.forceMilk);
    this.clock += dur;
    this.landClock += dur;
  }

  targetDifficulty() {
    const prog = clamp(this.landClock / CFG.LAND_TIME, 0, 1);
    return clamp(0.9 + this.landIdx * 0.75 + prog * 1.1 + this.lap * 1.1, 1, 5.5);
  }

  pick() {
    const target = this.targetDifficulty();
    const specials = LANDS[this.landIdx].specials;
    if (this.sinceReward >= 5 + Math.floor(this.rand() * 3)) {
      const rewards = PATTERNS.filter((p) => p.reward && !this.recent.includes(p.id));
      return this.rand.pick(rewards);
    }
    const pool = PATTERNS.filter((p) => !p.reward && (!p.need || specials.includes(p.need)) && p.d <= target + 0.6 && !this.recent.includes(p.id));
    return this.rand.weighted(pool, (p) => {
      let w = Math.exp(-((p.d - target) ** 2) / 1.3);
      if (p.need) w *= 1.6; // show off land gimmicks
      return w;
    }) || PATTERNS[5];
  }

  transition() {
    const nextIdx = (this.landIdx + 1) % LAND_IDS.length;
    const nextLap = this.lap + (nextIdx === 0 ? 1 : 0);
    // tail of current land
    let b = this.builder();
    b.run(0.45, { deco: false });
    let res = b.finish();
    this.clock += (res.end - res.start) / this.speed();
    // new land: signpost + safe run with coins
    const v2 = this.speed(nextIdx, nextLap);
    const land2 = LAND_IDS[nextIdx];
    b = new Builder(this.world, this.world.genX, v2, land2, this.rand);
    const signX = b.x + 70;
    const n = nextLap * LAND_IDS.length + nextIdx + 1;
    this.world.addSign(signX, nextIdx, land2, [`LAND ${n}`, LANDS[nextIdx].name]);
    b.run(0.5, { deco: false });
    b.coins(0.8);
    b.airShape('star', 'jelly_star');
    b.run(0.5);
    res = b.finish();
    this.transitions.push({ x: signX, landIdx: nextIdx, lap: nextLap, n });
    this.clock += (res.end - res.start) / v2;
    this.landIdx = nextIdx; this.lap = nextLap; this.landClock = 0;
    this.sinceReward = 0;
  }

  // --------------------------------------------------------------- specials
  assignSpecials(res, dur, v, forceMilk) {
    const t0 = this.clock, t1 = this.clock + dur;
    const slots = res.slots.slice();
    const slotTime = (s) => t0 + (s.x - res.start) / v;
    const take = (due) => {
      if (!slots.length) return null;
      let bi = 0, bd = Infinity;
      slots.forEach((s, i) => { const d = Math.abs(slotTime(s) - due); if (d < bd) { bd = d; bi = i; } });
      return slots.splice(bi, 1)[0];
    };
    if (this.tutorial && !forceMilk) return; // keep the tutorial clean
    if (forceMilk) { const s = slots.pop(); if (s) this.place('milk', s); this.next.milk = t1 + 9; return; }
    for (const key of ['letter', 'milk', 'item']) {
      if (this.next[key] > t1) continue;
      const s = take(this.next[key]);
      if (!s) continue;
      const placedAt = slotTime(s);
      if (this.place(key, s) || key !== 'letter') this.next[key] = placedAt + this.interval(key);
      else this.next[key] = placedAt + 2;
    }
  }
  interval(key) {
    const r = this.rand;
    if (key === 'milk') return CFG.MILK_EVERY + CFG.MILK_EVERY_LAND * this.landIdx + this.lap * 1.2 + r.range(-1.5, 1.5);
    if (key === 'letter') return CFG.LETTER_EVERY + r.range(-1.2, 1.2);
    return CFG.ITEM_EVERY + r.range(-2, 2.5);
  }
  clearAround(x, y, rad = 34) {
    for (const p of this.world.picks) if (!p.taken && Math.abs(p.x - x) < rad && Math.abs(p.y - y) < rad + 10 && p.kind.startsWith('jelly')) p.taken = true, p.t = 99;
  }
  place(key, s) {
    const w = this.world;
    if (key === 'letter') {
      const idx = this.run.letterToSpawn();
      if (idx < 0) return false;
      this.clearAround(s.x, s.y);
      w.addPick('letter', s.x, s.y - 6, { idx });
      return true;
    }
    this.clearAround(s.x, s.y);
    if (key === 'milk') {
      const big = this.clock >= this.next.bigmilk;
      if (big) this.next.bigmilk = this.clock + CFG.BIGMILK_EVERY + this.rand.range(-6, 6);
      w.addPick(big ? 'milk_l' : 'milk_s', s.x, s.y - 8);
      return true;
    }
    const types = Object.keys(POWERUPS).filter((t) => t !== this.lastItem);
    const type = this.rand.weighted(types, (t) => POWERUPS[t].weight);
    this.lastItem = type;
    w.addPick('pw:' + type, s.x, s.y - 8);
    return true;
  }
}
