// =============================================================================
//  Save data in localStorage (guarded: works without storage, e.g. private mode)
// =============================================================================
import { CFG } from '../config.js';

export function defaultSave() {
  return {
    v: 1,
    coins: 300,
    best: 0, bestDist: 0, bestLand: 1,
    xp: 0, level: 1,
    chars: { chip: { lv: 1 } },
    sel: 'chip', relay: null,
    pets: {}, pet: null,
    lab: { jelly: 0, energy: 0, milk: 0, item: 0, rush: 0, coin: 0, spurt: 0 },
    boosts: { dash: false, energy: false, revive: false, letters: false, magnet: false },
    missions: [],
    records: [],
    missionHist: {},
    stats: { runs: 0, jumps: 0, djumps: 0, slideTime: 0, smash: 0, rush: 0, coinsTotal: 0, jellyTotal: 0, plays: {} },
    settings: { music: 0.7, sfx: 0.9, shake: true, touch: 'auto', quality: 'high', vibrate: true, autoFS: true },
    tutorial: false,
    created: Date.now(),
  };
}

function merge(def, val) {
  if (val === null || val === undefined) return def;
  if (typeof def !== 'object' || def === null || Array.isArray(def)) return typeof val === typeof def || def === null ? val : def;
  const out = { ...def };
  for (const k of Object.keys(val)) out[k] = k in def ? merge(def[k], val[k]) : val[k];
  return out;
}

export const Save = {
  data: defaultSave(),
  available: false,
  load() {
    try {
      const raw = localStorage.getItem(CFG.SAVE_KEY);
      this.available = true;
      if (raw) this.data = merge(defaultSave(), JSON.parse(raw));
    } catch (e) { this.available = false; this.data = defaultSave(); }
    return this.data;
  },
  save() {
    try { localStorage.setItem(CFG.SAVE_KEY, JSON.stringify(this.data)); return true; } catch (e) { return false; }
  },
  reset() {
    const keepSettings = this.data.settings;
    this.data = defaultSave();
    this.data.settings = keepSettings;
    this.save();
  },
};
