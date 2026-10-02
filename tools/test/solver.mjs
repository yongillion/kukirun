#!/usr/bin/env node
// =============================================================================
//  Passability checker: builds every level pattern at every land speed and
//  searches for an input sequence (jump / double jump / slide / fast-fall) that
//  clears it using the real runner physics. Run: node tools/test/solver.mjs
// =============================================================================
import { CFG, LAND_IDS } from '../../src/config.js';
import { World } from '../../src/game/world.js';
import { Builder, PATTERNS } from '../../src/game/chunks.js';
import { Runner } from '../../src/game/player.js';
import { makeRand, mulberry32, rectsOverlap } from '../../src/engine/util.js';
import { LANDS } from '../../src/data/content.js';

const GY = CFG.GROUND_Y;
const SUB = 1 / 120, DEC = 6; // decision every 6 substeps (50 ms)
const FIELDS = ['x', 'y', 'vy', 'prevY', 'grounded', 'onPlat', 'jumps', 'coyote', 'buffer', 'slideHeld', 'sliding', 'spinT', 'landT', 'scale', 'targetScale', 'mode', 'modeT', 'invuln', 'hurtT', 'flashT', 'animT'];
const clone = (r) => { const o = {}; for (const f of FIELDS) o[f] = r[f]; return o; };
const restore = (r, o) => { for (const f of FIELDS) r[f] = o[f]; };

function solve(world, v, endX, opts = {}) {
  const r = new Runner({}, 'chip');
  r.x = -200; r.y = GY;
  const memo = new Set();
  let best = -1e9, nodes = 0;
  const obs = world.obs;
  const dead = () => {
    const hb = r.hitbox();
    for (const o of obs) if (rectsOverlap(hb, o.hit)) return true;
    if (!r.grounded && r.y > GY + 26) return true;
    return false;
  };
  const dfs = (depth) => {
    nodes++;
    if (nodes > 400000) return false;
    if (r.x >= endX) return true;
    best = Math.max(best, r.x);
    const key = `${Math.round(r.x / 4)}|${Math.round(r.y / 3)}|${Math.round(r.vy / 60)}|${r.jumps}|${r.grounded ? 1 : 0}|${r.slideHeld ? 1 : 0}|${r.spinT > 0 ? 1 : 0}`;
    if (memo.has(key)) return false;
    memo.add(key);
    const s0 = clone(r);
    // action order: keep doing nothing first, then jump, then slide toggles
    const acts = [[false, s0.slideHeld], [true, false], [false, !s0.slideHeld]];
    for (const [jump, slide] of acts) {
      restore(r, s0);
      r.slideHeld = slide;
      if (jump) { const res = r.pressJump(); if (!res) continue; }
      let ok = true;
      for (let i = 0; i < DEC; i++) { r.step(SUB, world, { speed: v }); if (dead()) { ok = false; break; } }
      if (ok && dfs(depth + 1)) return true;
    }
    restore(r, s0);
    return false;
  };
  const ok = dfs(0);
  return { ok, best, nodes };
}

function buildPattern(p, land, v, seed) {
  const world = new World();
  world.addGround(-1500, 0, land);
  const rand = makeRand(mulberry32(seed));
  const b = new Builder(world, 0, v, land, rand);
  b.run(0.6, { deco: false });
  p.fn(b);
  b.run(0.8, { deco: false });
  const res = b.finish();
  for (const o of world.obs) {
    if (o.kind === 'fall') { o.state = 'rest'; o.y = GY; world.updateHit(o); }
    if (o.kind === 'pop') { o.state = 'popped'; world.updateHit(o); }
  }
  return { world, end: res.end };
}

const speeds = [];
for (let lap = 0; lap < 3; lap++) for (let i = 0; i < 5; i++) speeds.push({ i, lap, v: Math.min(CFG.MAX_SPEED, CFG.LAND_SPEEDS[i] + lap * CFG.LAP_SPEED) });
let fails = 0, total = 0;
const only = process.argv[2];
for (const p of PATTERNS) {
  if (only && p.id !== only) continue;
  const res = [];
  for (const s of speeds) {
    const land = LAND_IDS[s.i];
    if (p.need && !LANDS[s.i].specials.includes(p.need)) continue;
    const { world, end } = buildPattern(p, land, s.v, 1234 + s.i);
    const r = solve(world, s.v, end);
    total++;
    if (!r.ok) { fails++; res.push(`✗ v${s.v}(${land}) best=${Math.round(r.best)}/${Math.round(end)} n=${r.nodes}`); }
  }
  console.log(`${res.length ? 'FAIL' : ' ok '} ${p.id.padEnd(16)} d${p.d} ${res.join('  ')}`);
}
console.log(`\n${total - fails}/${total} pattern×speed combos passable`);
