// =============================================================================
//  Dessert Dash — module `lands`: parallax backgrounds, ground strips, caps,
//  platforms, ambient cloud atlases and the lobby scene. (SPEC §3.3)
// =============================================================================
import { want, canvas, ctx2d, fadeY } from './_env_kit.js';
import { MEADOW } from './_env_meadow.js';
import { CANYON } from './_env_canyon.js';
import { CAVERN } from './_env_cavern.js';
import { GLACIER } from './_env_glacier.js';
import { CASTLE } from './_env_castle.js';
import { RUSH } from './_env_rush.js';
import { drawLobby } from './_env_lobby.js';

export const BG_W = 1536;
const LANDS = { meadow: MEADOW, canyon: CANYON, cavern: CAVERN, glacier: GLACIER, castle: CASTLE, rush: RUSH };

function img(fn) { return (g) => g.drawImage(fn(), 0, 0); }
/** Layer image with a soft fade over its last `f` px (pits never show a hard cut). */
function layer(fn, h, f) { return (g) => { g.drawImage(fn(), 0, 0); if (f) fadeY(g, h - f, h, 1, 0); }; }

export async function build(F) {
  for (const [id, L] of Object.entries(LANDS)) {
    const P = `lands/${id}`;
    if (want(`bg_${id}_far`)) F.image(`bg_${id}_far`, {
      path: `${P}/far`, w: BG_W, h: L.farH, scale: 1, draw: layer(L.far, L.farH, 10),
      meta: { y: 600 - L.farH, parallax: 0.12, sky: L.sky, fog: L.fog, ambient: L.ambient },
    });
    if (want(`bg_${id}_mid`)) F.image(`bg_${id}_mid`, {
      path: `${P}/mid`, w: BG_W, h: L.midH, scale: 1, draw: layer(L.mid, L.midH, 14),
      meta: { y: L.midBottom - L.midH, parallax: 0.32 },
    });
    if (want(`bg_${id}_near`)) F.image(`bg_${id}_near`, {
      path: `${P}/near`, w: BG_W, h: L.nearH, scale: 1, draw: layer(L.near, L.nearH, 12),
      meta: { y: L.nearBottom - L.nearH, parallax: 0.62 },
    });
    if (want(`clouds_${id}`)) F.atlas(`clouds_${id}`, { path: `${P}/clouds`, scale: 1, padding: 4, maxWidth: 2048, items: L.clouds() });
    if (want(`ground_${id}`)) F.image(`ground_${id}`, {
      path: `${P}/ground`, w: 1024, h: 276, scale: 2, ax: 0, ay: 36, draw: img(L.ground),
      meta: { surface: 36, pit: L.pit },
    });
    if (L.cap && want(`groundcap_${id}`)) F.atlas(`groundcap_${id}`, { path: `${P}/caps`, scale: 2, padding: 4, items: L.caps() });
    if (L.plat && want(`plat_${id}`)) F.atlas(`plat_${id}`, { path: `${P}/plat`, scale: 2, padding: 4, meta: { surface: 12 }, items: L.plats() });
  }
  if (want('bg_lobby')) F.image('bg_lobby', {
    path: 'lands/lobby', w: 1600, h: 720, scale: 1, draw: (g) => drawLobby(g, 1600, 720),
    meta: { stage: { x: 600, y: 600 }, calm: { x: 300, y: 380, w: 600, h: 240 } },
  });
}
