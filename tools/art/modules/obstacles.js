// =============================================================================
//  Dessert Dash — module `obstacles` (SPEC §3.4)
//  Atlas obs_<land> (scale 2): low, low2, tall, hang, chain, beam, [fall],
//  [pop0, pop1], deco0..deco7, sign  — anchor bottom-centre unless noted.
//  meta.hit = hitbox in LOGICAL units relative to the anchor (forgiving: a bit
//  smaller than the visible dangerous part). Atlas obs_common: spring0/1.
// =============================================================================
import { want } from './_env_kit.js';
import { springPad } from './_env_obs_kit.js';
import { meadowObstacles } from './_env_obs_meadow.js';
import { canyonObstacles } from './_env_obs_canyon.js';
import { cavernObstacles } from './_env_obs_cavern.js';
import { glacierObstacles } from './_env_obs_glacier.js';
import { castleObstacles } from './_env_obs_castle.js';

const SPECS = {
  low: { w: 144, h: 168, hit: { x: -23, y: -60, w: 46, h: 60 } },
  low2: { w: 300, h: 148, hit: { x: -60, y: -52, w: 120, h: 52 } },
  tall: { w: 172, h: 472, hit: { x: -27, y: -216, w: 54, h: 216 } },
  hang: { w: 208, h: 240, hit: { x: -33, y: -120, w: 66, h: 114 }, note: 'anchor = bottom tip (place at y=518); extend hit to the top of the screen' },
  chain: { w: 80, h: 128, note: 'tiles vertically above hang (anchor bottom-centre)' },
  beam: { w: 256, h: 180, ax: 0, ay: 180, hit: { x: 0, y: -90, w: 128, h: 85 }, note: 'anchor bottom-left; tiles horizontally every 128 logical' },
  fall: { w: 140, h: 220, hit: { x: -23, y: -68, w: 46, h: 68 }, note: 'drops from above, rests on the ground' },
  pop0: { w: 140, h: 40, note: 'hidden bump (harmless) — swap to pop1 when it pops' },
  pop1: { w: 144, h: 176, hit: { x: -23, y: -68, w: 46, h: 68 } },
  sign: { w: 240, h: 260 },
};

const LANDS = {
  meadow: meadowObstacles,
  canyon: canyonObstacles,
  cavern: cavernObstacles,
  glacier: glacierObstacles,
  castle: castleObstacles,
};

// debug only (?overflow): pad every item so scratch tools can measure clipping
const OVF = (() => { try { return new URLSearchParams(globalThis.location?.search || '').has('overflow') ? 60 : 0; } catch { return 0; } })();
function item(name, spec, draw, extra = {}) {
  const meta = { ...(spec.hit ? { hit: { ...spec.hit } } : {}), ...(spec.note ? { note: spec.note } : {}), ...extra };
  return {
    name, w: spec.w + 2 * OVF, h: spec.h + 2 * OVF, ax: (spec.ax ?? spec.w / 2) + OVF, ay: (spec.ay ?? spec.h) + OVF, meta: OVF ? { ...meta, ovf: OVF } : meta,
    draw: (g, w, h) => { g.translate(OVF, OVF); const r = draw(g, spec.w, spec.h); if (r && r.board) meta.board = r.board; },
  };
}

export async function build(F) {
  for (const [land, fn] of Object.entries(LANDS)) {
    const id = `obs_${land}`;
    if (!want(id)) continue;
    const O = fn();
    const items = [];
    for (const k of ['low', 'low2', 'tall', 'hang', 'chain', 'beam', 'fall', 'pop0', 'pop1']) {
      if (!O[k]) continue;
      const spec = { ...SPECS[k], ...(O.hits && O.hits[k] ? { hit: O.hits[k] } : {}) };
      items.push(item(k, spec, O[k]));
    }
    // decos have free sizes: pad them so glows / snow / outlines never clip
    O.decos.forEach(([w, h, draw], i) => items.push(item(`deco${i}`, { w: w + 28, h: h + 18 }, (g, W2, H2) => { g.save(); g.translate(14, 18); draw(g, w, h); g.restore(); }, { deco: true })));
    items.push(item('sign', SPECS.sign, (g, w, h) => ({ board: O.sign(g, w, h) })));
    F.atlas(id, { path: `obstacles/${land}`, scale: 2, padding: 4, maxWidth: 2048, items });
  }
  if (want('obs_common')) {
    F.atlas('obs_common', {
      path: 'obstacles/common', scale: 2, padding: 4, items: [
        { name: 'spring0', w: 168, h: 88, ax: 84, ay: 88, meta: { hit: { x: -36, y: -30, w: 72, h: 30 }, role: 'bounce' }, draw: (g, w, h) => springPad(g, w, h, false) },
        { name: 'spring1', w: 168, h: 56, ax: 84, ay: 56, meta: { hit: { x: -38, y: -20, w: 76, h: 20 }, role: 'bounce' }, draw: (g, w, h) => springPad(g, w, h, true) },
      ],
    });
  }
}
