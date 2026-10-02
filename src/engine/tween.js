// =============================================================================
//  Tiny tween + timer manager (one per scene)
// =============================================================================
import { Ease } from './util.js';

export class Tweens {
  constructor() { this.list = []; this.timers = []; }

  /** Tween numeric props of obj to target values. */
  to(obj, props, dur, ease = Ease.outCubic, delay = 0, onDone = null) {
    const from = {};
    for (const k of Object.keys(props)) from[k] = obj[k];
    const tw = { obj, from, props, dur: Math.max(0.0001, dur), t: -delay, ease: typeof ease === 'string' ? Ease[ease] : ease, onDone, dead: false };
    this.list.push(tw);
    return tw;
  }
  after(delay, fn) { const t = { t: delay, fn, dead: false }; this.timers.push(t); return t; }
  every(interval, fn, count = Infinity) {
    const t = { t: interval, fn: null, dead: false };
    let n = 0;
    t.fn = () => { fn(n++); if (n < count && !t.dead) { t.t = interval; this.timers.push(t); } };
    this.timers.push(t);
    return t;
  }
  kill(obj) { for (const tw of this.list) if (tw.obj === obj) tw.dead = true; }
  clear() { this.list.length = 0; this.timers.length = 0; }

  update(dt) {
    for (let i = 0; i < this.list.length; i++) {
      const tw = this.list[i];
      if (tw.dead) continue;
      tw.t += dt;
      if (tw.t < 0) continue;
      const k = Math.min(1, tw.t / tw.dur);
      const e = tw.ease(k);
      for (const p in tw.props) tw.obj[p] = tw.from[p] + (tw.props[p] - tw.from[p]) * e;
      if (k >= 1) { tw.dead = true; if (tw.onDone) tw.onDone(); }
    }
    if (this.list.length > 64) this.list = this.list.filter((t) => !t.dead);
    else for (let i = this.list.length - 1; i >= 0; i--) if (this.list[i].dead) this.list.splice(i, 1);
    const ts = this.timers;
    this.timers = [];
    for (const t of ts) {
      if (t.dead) continue;
      t.t -= dt;
      if (t.t <= 0) { t.dead = true; t.fn(); }
      else this.timers.push(t);
    }
  }
}
