// =============================================================================
//  Dessert Dash — art module `characters` (the 7 runners). SPEC §3.1
//  sheet  char_<id>      characters/<id>           288x288 x 28 frames, 8 cols
//  image  portrait_<id>  characters/<id>_portrait  192x192, anchor centre
//  Drawing lives in _char_rig.js (parametric rig + poses) and _char_cast.js.
// =============================================================================
import { FW, FH, AX, AY, renderFrame, renderPortrait } from './_char_rig.js';
import { CAST1 } from './_char_cast.js';
import { CAST2 } from './_char_cast2.js';

export const CAST = [...CAST1, ...CAST2]; // chip maca pudding donut marsh cupcake cotton

export const ANIMS = {
  run: { frames: [0, 1, 2, 3, 4, 5, 6, 7], fps: 14, loop: true },
  jump: { frames: [8] },
  apex: { frames: [9] },
  tuck: { frames: [10] },
  fall: { frames: [11] },
  slide: { frames: [12, 13], fps: 10, loop: true },
  land: { frames: [14] },
  hurt: { frames: [15] },
  down: { frames: [16, 17], fps: 3, loop: false },
  pit: { frames: [18, 19], fps: 8, loop: true },
  skill: { frames: [20, 21], fps: 8, loop: true },
  idle: { frames: [22, 23, 24, 25], fps: 6, loop: true },
  cheer: { frames: [26, 27], fps: 6, loop: true },
};

export function build(F) {
  const only = (typeof window !== 'undefined' && window.__CHAR_ONLY) || null;
  for (const ch of CAST) {
    if (only && !only.includes(ch.id)) continue;
    const frames = [];
    for (let i = 0; i < 28; i++) frames.push(renderFrame(ch, i));
    F.sheet('char_' + ch.id, {
      path: 'characters/' + ch.id, fw: FW, fh: FH, cols: 8, count: 28, ax: AX, ay: AY, scale: 2,
      anims: ANIMS,
      meta: { color: ch.color, skillColor: ch.skillColor },
      drawFrame: (g, i) => g.drawImage(frames[i], 0, 0),
    });
    const por = renderPortrait(ch);
    F.image('portrait_' + ch.id, {
      path: 'characters/' + ch.id + '_portrait', w: 192, h: 192, ax: 96, ay: 96, scale: 2,
      meta: { color: ch.color },
      draw: (g) => g.drawImage(por, 0, 0),
    });
  }
}
