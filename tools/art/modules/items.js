// =============================================================================
//  Dessert Dash — items atlas (jellies, coins, milk, power-ups, letters)
//  Atlas `items`, scale 2, every sprite anchored at its centre. See SPEC §3.5.
// =============================================================================
import { OUTLINE, TAU, mix, rgba, tone, glow, sparkle, stroke, fill, circle, clipTo, innerShade, innerLight, glint } from '../lib.js';
import {
  place, PAL, drawDropJelly, drawGumdropJelly, drawStarCandy, drawRainbowStar, drawSwirlDisc, drawChocoChunk,
  drawCoin, COIN_GOLD, COIN_SILVER, drawMilkCarton, drawMilkBottle, drawPowerBubble, drawMagnet, drawMuffin,
  upArrowShape, drawRocket, drawPouch, drawWand, drawShieldCrest, drawLetterBall, candyBody,
} from './_ui_kit.js';

const LWI = 5; // item outline, art px

export const LETTERS = ['S', 'U', 'G', 'A', 'R', 'R', 'U', 'S', 'H'];
export const LETTER_COLORS = ['#ff7eb9', '#ff9a2e', '#ffd02a', '#6fd448', '#1fc2b0', '#4fb4ff', '#9a6bff', '#e040c8', '#ff4848'];

function sparkleStar(c, x, y, r, rot = 0, col = '#ffffff') {
  glow(c, x, y, r * 1.5, '#fff3b0', 0.55);
  sparkle(c, x, y, r, col, 1, rot);
  sparkle(c, x, y, r * 0.42, col, 1, rot + Math.PI / 4);
}

function coinItems(prefix, size, R, pal, opts) {
  const out = [];
  for (let i = 0; i < 6; i++) {
    const theta = (i * Math.PI) / 6;
    out.push({
      name: `${prefix}${i}`, w: size, h: size,
      draw: (c, w, h) => place(c, w / 2, h / 2, R / 50, (f) => drawCoin(c, theta, pal, LWI * f, opts)),
      meta: { r: Math.round(R / 2) },
    });
  }
  return out;
}

function powerUp(name, tint, icon) {
  return {
    name, w: 128, h: 128,
    draw: (c, w, h) => place(c, w / 2, h / 2, 1, () => drawPowerBubble(c, 50, tint, LWI, () => icon(c))),
    meta: { r: 25 },
  };
}

export function build(F) {
  const items = [];

  // ---------------------------------------------------------------- jellies
  items.push({ name: 'jelly', w: 52, h: 52, meta: { r: 11 },
    draw: (c, w, h) => place(c, w / 2 - 0.6, h / 2 - 0.9, 0.54, (f) => drawDropJelly(c, LWI * f)) });

  items.push({ name: 'jelly_pink', w: 60, h: 60, meta: { r: 13 },
    draw: (c, w, h) => place(c, w / 2, h / 2 - 0.8, 0.655, (f) => drawGumdropJelly(c, LWI * f)) });

  items.push({ name: 'jelly_star', w: 80, h: 80, meta: { r: 18 },
    draw: (c, w, h) => place(c, w / 2, h / 2 + 0.5, 0.82, (f) => drawStarCandy(c, LWI * f, 46, PAL.lemon)) });

  items.push({ name: 'jelly_big', w: 152, h: 152, meta: { r: 32 },
    draw: (c, w, h) => {
      glow(c, w / 2, h / 2 + 2, 74, '#ffd23a', 0.55);
      place(c, w / 2, h / 2 + 3, 1.3, (f) => drawStarCandy(c, LWI * 1.15 * f, 46, PAL.gold, { bevelAlpha: 0.8 }));
      sparkleStar(c, 122, 30, 15, 0);
      sparkleStar(c, 24, 58, 10, 0.2);
      sparkleStar(c, 120, 118, 9, 0.1);
    } });

  items.push({ name: 'jelly_rainbow', w: 168, h: 168, meta: { r: 38 },
    draw: (c, w, h) => {
      glow(c, w / 2, h / 2, 84, '#ffffff', 0.5);
      place(c, w / 2, h / 2 + 2, 1.62, (f) => drawRainbowStar(c, LWI * 1.2 * f, 46));
      sparkleStar(c, 140, 34, 12, 0);
      sparkleStar(c, 28, 132, 9, 0.3);
    } });

  items.push({ name: 'jelly_giant', w: 300, h: 300, meta: { r: 66 },
    draw: (c, w, h) => {
      glow(c, w / 2, h / 2, 150, '#fff2c0', 0.6);
      place(c, w / 2, h / 2, 2.72, (f) => drawSwirlDisc(c, 6.5 * f, 46));
      sparkleStar(c, 252, 52, 22, 0);
      sparkleStar(c, 40, 230, 16, 0.25);
      sparkleStar(c, 262, 238, 12, 0.1);
      sparkleStar(c, 44, 60, 11, 0.4);
    } });

  items.push({ name: 'jelly_choco', w: 64, h: 64, meta: { r: 14 },
    draw: (c, w, h) => place(c, w / 2, h / 2 + 0.5, 0.74, (f) => drawChocoChunk(c, LWI * f)) });

  // ------------------------------------------------------------------ coins
  items.push(...coinItems('coin_s', 60, 26, COIN_SILVER, { T: 20 }));
  items.push(...coinItems('coin_g', 68, 30, COIN_GOLD, { T: 20 }));
  items.push(...coinItems('coin_b', 120, 54, COIN_GOLD, { T: 19, grooves: 11, face: { beads: 18, starR: 24 } }));

  // ------------------------------------------------------------------- milk
  items.push({ name: 'milk_s', w: 88, h: 112, meta: { r: 20 },
    draw: (c, w, h) => place(c, w / 2 + 0.5, h / 2 + 2.5, 1.1, (f) => drawMilkCarton(c, LWI * f)) });

  items.push({ name: 'milk_l', w: 120, h: 152, meta: { r: 28 },
    draw: (c, w, h) => {
      glow(c, w / 2, h / 2 + 4, 62, '#bfe8ff', 0.85);
      glow(c, w / 2, h / 2 + 4, 40, '#ffffff', 0.6);
      place(c, w / 2, h / 2 + 3, 1.08, (f) => drawMilkBottle(c, LWI * f));
      sparkleStar(c, 100, 26, 10, 0);
      sparkleStar(c, 18, 112, 8, 0.2);
    } });

  // -------------------------------------------------------------- power-ups
  items.push(powerUp('pw_magnet', '#ff5f7e', (c) => place(c, 0, 2, 0.9, (f) => drawMagnet(c, LWI * f))));
  items.push(powerUp('pw_giant', '#ff9d2e', (c) => {
    place(c, 0, 7, 0.78, (f) => drawMuffin(c, LWI * f));
    for (const [x, y, s] of [[-30, -14, 1], [30, -20, 1.12]]) {
      const a = upArrowShape(x, y, 22 * s, 27 * s, 0.48, 0.52);
      fill(c, a, '#86e85c'); innerShade(c, a, '#3fae3a', 2.5, 3); innerLight(c, a, '#ffffff', 1.8, 1.8, 0.6); stroke(c, a, LWI * 0.85, OUTLINE);
    }
  }));
  items.push(powerUp('pw_dash', '#33bfff', (c) => place(c, -1, 1, 0.82, (f) => drawRocket(c, LWI * f))));
  items.push(powerUp('pw_coins', '#ffc928', (c) => place(c, 0, 2, 0.86, (f) => drawPouch(c, LWI * f))));
  items.push(powerUp('pw_stars', '#a77bff', (c) => place(c, 2, 2, 0.88, (f) => drawWand(c, LWI * f))));
  items.push(powerUp('pw_shield', '#3fd6a8', (c) => place(c, 0, 1, 0.84, (f) => drawShieldCrest(c, LWI * f))));

  // ---------------------------------------------------------------- letters
  LETTERS.forEach((ch, i) => {
    items.push({ name: `letter_${i}`, w: 112, h: 112, meta: { ch, color: LETTER_COLORS[i], r: 24 },
      draw: (c, w, h) => place(c, w / 2, h / 2, 1, () => drawLetterBall(c, ch, LETTER_COLORS[i], 51, LWI, { size: 76 })) });
    items.push({ name: `hud_letter_${i}`, w: 56, h: 56, meta: { ch, color: LETTER_COLORS[i] },
      draw: (c, w, h) => place(c, w / 2, h / 2, 1, () => drawLetterBall(c, ch, LETTER_COLORS[i], 25, 4, { size: 37, textLw: 6, shadow: 1.6 })) });
  });
  items.push({ name: 'hud_letter_off', w: 56, h: 56,
    draw: (c, w, h) => place(c, w / 2, h / 2, 1, () => {
      const sh = circle(0, 0, 25);
      fill(c, sh, rgba('#7d7590', 0.72));
      innerLight(c, sh, rgba('#3c3550', 0.8), 3, 4);      // recessed socket: shadow top-left
      innerShade(c, sh, rgba('#c9c3d8', 0.7), 2.5, 3);     // light bottom-right lip
      stroke(c, circle(0, 0, 13), 3, rgba('#c9c3d8', 0.55));
      stroke(c, sh, 4, OUTLINE);
    }) });

  F.atlas('items', {
    path: 'items/items', scale: 2, padding: 4, maxWidth: 2048, items,
    meta: {
      letters: LETTERS, letterColors: LETTER_COLORS,
      anims: {
        coin_s: { frames: [0, 1, 2, 3, 4, 5].map((i) => `coin_s${i}`), fps: 12, loop: true },
        coin_g: { frames: [0, 1, 2, 3, 4, 5].map((i) => `coin_g${i}`), fps: 12, loop: true },
        coin_b: { frames: [0, 1, 2, 3, 4, 5].map((i) => `coin_b${i}`), fps: 10, loop: true },
      },
    },
  });
}
