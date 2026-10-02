// =============================================================================
//  Dessert Dash — art module `pets` (5 pets). SPEC §3.2
//  sheet  pet_<id>        pets/<id>           160x160 x 6 frames (fly 0-3, act 4-5)
//  image  petportrait_<id> pets/<id>_portrait 128x128, anchor centre
//  Drawing lives in _char_pets.js.
// =============================================================================
import { canvas, ctx2d, TAU } from '../lib.js';
import { PETS, PW, PH } from './_char_pets.js';
import { alphaBox } from './_char_rig.js';

export const PET_ANIMS = {
  fly: { frames: [0, 1, 2, 3], fps: 8, loop: true },
  act: { frames: [4, 5], fps: 8, loop: true },
};

/** Animation state for frame k: gentle bob + wing flap (fly), ability pose (act). */
export function petState(k) {
  if (k < 4) {
    const ph = TAU * k / 4;
    return { k, act: false, bob: -5 * Math.sin(ph), flap: 0.45 * Math.cos(ph), sq: 1 + 0.03 * Math.cos(ph) };
  }
  return { k, act: true, bob: k === 4 ? -3 : -1, flap: k === 4 ? 0.5 : -0.5, sq: k === 4 ? 1.05 : 0.98 };
}

function renderPetFrame(pet, k) {
  const cv = canvas(PW, PH); const g = ctx2d(cv);
  pet.draw(g, petState(k));
  return cv;
}

function renderPetPortrait(pet, size = 128, rMax = 58) {
  // draw a fly frame (pet drawers use absolute transforms), then fit it into the circle
  const fr = canvas(PW, PH); pet.draw(ctx2d(fr), { k: 0, act: false, bob: 0, flap: 0.3, sq: 1 });
  const src = canvas(PW * 2, PH * 2); const g = src.getContext('2d', { willReadFrequently: true });
  g.drawImage(fr, PW / 2, PH / 2);
  const bb = alphaBox(src);
  const cx = (bb[0] + bb[2]) / 2, cy = (bb[1] + bb[3]) / 2;
  const d = g.getImageData(0, 0, src.width, src.height).data;
  let rr = 1;
  for (let y = bb[1]; y < bb[3]; y++) for (let x = bb[0]; x < bb[2]; x++) if (d[(y * src.width + x) * 4 + 3] > 20) { const q = Math.hypot(x - cx, y - cy); if (q > rr) rr = q; }
  const s = Math.min(1.3, rMax / rr);
  const out = canvas(size, size); const o = ctx2d(out);
  o.imageSmoothingQuality = 'high';
  o.translate(size / 2, size / 2); o.scale(s, s); o.translate(-cx, -cy); o.drawImage(src, 0, 0);
  return out;
}

export function build(F) {
  const only = (typeof window !== 'undefined' && window.__CHAR_ONLY) || null;
  for (const pet of PETS) {
    if (only && !only.includes(pet.id)) continue;
    const frames = [];
    for (let k = 0; k < 6; k++) frames.push(renderPetFrame(pet, k));
    F.sheet('pet_' + pet.id, {
      path: 'pets/' + pet.id, fw: PW, fh: PH, cols: 6, count: 6, ax: PW / 2, ay: PH / 2, scale: 2,
      anims: PET_ANIMS,
      meta: { color: pet.color },
      drawFrame: (g, i) => g.drawImage(frames[i], 0, 0),
    });
    const por = renderPetPortrait(pet);
    F.image('petportrait_' + pet.id, {
      path: 'pets/' + pet.id + '_portrait', w: 128, h: 128, ax: 64, ay: 64, scale: 2,
      draw: (g) => g.drawImage(por, 0, 0),
    });
  }
}
