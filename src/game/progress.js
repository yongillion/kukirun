// =============================================================================
//  Meta progression: wallet, unlocks, levels, lab upgrades, missions, XP.
// =============================================================================
import { Save } from '../engine/storage.js';
import { CFG } from '../config.js';
import {
  CHAR, CHAR_LV_COST, MAX_CHAR_LV, LAB, LAB_ID, labCost, MISSION_TEMPLATES, MISSION_REWARD,
  xpNeed, levelReward, PET, charLevelBonus,
} from '../data/content.js';
import { makeRand } from '../engine/util.js';

const R = makeRand();

export const Progress = {
  get d() { return Save.data; },
  commit() { Save.save(); },

  // wallet --------------------------------------------------------------------
  canAfford(n) { return this.d.coins >= n; },
  spend(n) { if (this.d.coins < n) return false; this.d.coins -= n; this.commit(); return true; },
  earn(n) { this.d.coins += Math.max(0, Math.floor(n)); this.commit(); },

  // runners --------------------------------------------------------------------
  owned(id) { return !!this.d.chars[id]; },
  charLv(id) { return this.d.chars[id] ? this.d.chars[id].lv : 0; },
  buyChar(id) {
    const c = CHAR[id];
    if (!c || this.owned(id) || !this.spend(c.price)) return false;
    this.d.chars[id] = { lv: 1 }; this.commit(); return true;
  },
  charUpCost(id) { const lv = this.charLv(id); return lv >= MAX_CHAR_LV ? null : CHAR_LV_COST[lv]; },
  levelUpChar(id) {
    const cost = this.charUpCost(id);
    if (cost == null || !this.spend(cost)) return false;
    this.d.chars[id].lv++; this.commit(); return true;
  },
  select(id) { if (!this.owned(id)) return false; if (this.d.relay === id) this.d.relay = this.d.sel !== id ? this.d.sel : null; this.d.sel = id; this.commit(); return true; },
  setRelay(id) { if (id && (!this.owned(id) || id === this.d.sel)) return false; this.d.relay = id; this.commit(); return true; },

  // pets -----------------------------------------------------------------------
  ownsPet(id) { return !!this.d.pets[id]; },
  buyPet(id) { const p = PET[id]; if (!p || this.ownsPet(id) || !this.spend(p.price)) return false; this.d.pets[id] = { got: Date.now() }; this.commit(); return true; },
  selectPet(id) { if (id && !this.ownsPet(id)) return false; this.d.pet = id; this.commit(); return true; },

  // lab ------------------------------------------------------------------------
  lab(id) { return this.d.lab[id] || 0; },
  labNext(id) { const u = LAB_ID[id]; const lv = this.lab(id); return lv >= u.max ? null : labCost(u, lv); },
  buyLab(id) { const c = this.labNext(id); if (c == null || !this.spend(c)) return false; this.d.lab[id] = this.lab(id) + 1; this.commit(); return true; },
  anyLabAffordable() { return LAB.some((u) => { const c = this.labNext(u.id); return c != null && c <= this.d.coins; }); },

  /** Aggregated modifiers for a run with runner `id`. */
  mods(id) {
    const L = (k) => this.lab(k);
    const lv = Math.max(1, this.charLv(id));
    return {
      lv,
      jellyMult: 1 + L('jelly') * 0.07 + charLevelBonus(lv),
      maxEnergy: CHAR[id].energy + L('energy') * 6,
      milkMult: 1 + L('milk') * 0.1,
      itemMult: 1 + L('item') * 0.08,
      rushTime: CFG.RUSH_TIME + L('rush') * 0.8,
      coinMult: 1 + L('coin') * 0.08,
      spurt: L('spurt') ? 1.5 + L('spurt') * 0.5 : 0,
    };
  },

  // XP ------------------------------------------------------------------------
  addXP(n) {
    const ups = [];
    this.d.xp += Math.floor(n);
    while (this.d.xp >= xpNeed(this.d.level)) {
      this.d.xp -= xpNeed(this.d.level);
      this.d.level++;
      const reward = levelReward(this.d.level);
      this.d.coins += reward;
      ups.push({ level: this.d.level, reward });
    }
    this.commit();
    return ups;
  },

  // missions ------------------------------------------------------------------
  ensureMissions() {
    const ms = this.d.missions;
    while (ms.length < 3) ms.push(this.newMission(ms.map((m) => m.tid)));
    this.commit();
  },
  newMission(exclude = []) {
    const hist = this.d.missionHist;
    let pool = MISSION_TEMPLATES.filter((t) => !exclude.includes(t.id) && (hist[t.id] || 0) < t.tiers.length);
    if (!pool.length) pool = MISSION_TEMPLATES.filter((t) => !exclude.includes(t.id));
    const t = R.pick(pool);
    const done = hist[t.id] || 0;
    const tier = Math.min(done, t.tiers.length - 1);
    let target = t.tiers[tier];
    if (done >= t.tiers.length) target = Math.round(target * Math.pow(1.5, done - t.tiers.length + 1));
    return { tid: t.id, tier, target, progress: 0, done: false };
  },
  template(m) { return MISSION_TEMPLATES.find((t) => t.id === m.tid); },
  missionText(m) { return this.template(m).text(m.target); },
  missionReward(m) { return MISSION_REWARD[Math.min(m.tier, MISSION_REWARD.length - 1)] + (m.target > (this.template(m).tiers.at(-1)) ? 200 : 0); },
  claimable() { return this.d.missions.filter((m) => m.done).length; },

  /** Apply a finished run. run = { score, jellies, coins, land, milk, items, maxCombo, dist, cleanLand, relay, jumps, djumps, slideTime, smash, rush, skills } */
  applyRun(run) {
    const newly = [];
    for (const m of this.d.missions) {
      if (m.done) continue;
      const t = this.template(m);
      if (!t) continue;
      const v = run[t.stat] || 0;
      if (t.mode === 'run') m.progress = Math.max(m.progress, v);
      else m.progress += v;
      if (m.progress >= m.target) { m.progress = m.target; m.done = true; newly.push(m); }
    }
    const st = this.d.stats;
    st.runs++;
    st.jumps += run.jumps; st.djumps += run.djumps; st.slideTime += run.slideTime; st.smash += run.smash;
    st.rush += run.rush; st.coinsTotal += run.coins; st.jellyTotal += run.jellies;
    st.plays[run.char] = (st.plays[run.char] || 0) + 1;
    if (run.score > this.d.best) this.d.best = run.score;
    if (run.dist > this.d.bestDist) this.d.bestDist = run.dist;
    if (run.land > this.d.bestLand) this.d.bestLand = run.land;
    this.commit();
    return newly;
  },
  claim(i) {
    const m = this.d.missions[i];
    if (!m || !m.done) return null;
    const reward = this.missionReward(m);
    this.d.coins += reward;
    this.d.missionHist[m.tid] = (this.d.missionHist[m.tid] || 0) + 1;
    const xp = 25 * (m.tier + 1);
    this.d.missions.splice(i, 1, this.newMission(this.d.missions.map((x) => x.tid)));
    const ups = this.addXP(xp);
    this.commit();
    return { reward, xp, ups };
  },
};
