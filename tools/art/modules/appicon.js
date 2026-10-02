// =============================================================================
//  Dessert Dash — home-screen / PWA app icons (page shell only, not loaded by
//  the game, so tools/art/export.mjs writes no atlas metadata for this module).
//    app/icon-192, app/icon-512        rounded "sticker" tile, transparent corners
//    app/icon-maskable-512             full-bleed, art inside the 80 % safe circle
//    app/apple-touch-icon (180)        full-bleed (iOS applies its own mask)
//  Chip's happy portrait is re-rendered at high resolution from the character rig.
// =============================================================================
import { OUTLINE, TAU, canvas, ctx2d, linearGrad, radialGrad, sparkle } from '../lib.js';
import { basePose, drawFigure, alphaBox } from './_char_rig.js';
import { CAST1 } from './_char_cast.js';

const CHIP = CAST1.find((c) => c.id === 'chip');

/** Render the portrait figure supersampled; returns the canvas + centre + radius of the art. */
function portraitArt(ch, wantR) {
  const render = (k) => {
    const W = Math.ceil(440 * k);
    const big = canvas(W, W);
    const g = big.getContext('2d', { willReadFrequently: true });
    g.imageSmoothingQuality = 'high';
    const pose = basePose();
    pose.eyes = 'happy'; pose.mouth = 'grin'; pose.turn = 0.8; pose.look = [0, 0];
    pose.arms = [{ hide: true }, { hide: true }];
    pose.acc = { sway: 0, amp: 0.05, dir: Math.PI - 1.25, wob: 0, wind: 0, phase: 0.25, idle: 1, portrait: 1 };
    pose.portrait = 1;
    if (ch.portraitPose) ch.portraitPose(pose);
    g.scale(k, k);
    drawFigure(g, ch, pose, { ax: 220, ay: 340, noLegs: true });
    g.setTransform(1, 0, 0, 1, 0, 0);
    const d = g.getImageData(0, 0, W, W).data;
    const bb = alphaBox(big);
    const cx = (bb[0] + bb[2]) / 2, cy = (bb[1] + bb[3]) / 2;
    let rr = 1;
    for (let y = bb[1]; y < bb[3]; y++) for (let x = bb[0]; x < bb[2]; x++) if (d[(y * W + x) * 4 + 3] > 20) { const q = Math.hypot(x - cx, y - cy); if (q > rr) rr = q; }
    return { img: big, cx, cy, rr };
  };
  const probe = render(1);
  const k = Math.max(1, (wantR * 1.4) / probe.rr); // keep the art >= 1.4x the target so it is only ever downscaled
  return k > 1.01 ? render(k) : probe;
}

let ART = null;
function art() { if (!ART) ART = portraitArt(CHIP, 200); return ART; }

function rrPath(g, x, y, w, h, r) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r);
  g.closePath();
}

/** The icon artwork in a 512 x 512 space. tile=true: rounded sticker tile; false: full bleed. */
function drawIcon512(g, tile) {
  const S = 512, inset = tile ? 14 : 0, rad = tile ? 116 : 0;
  g.save();
  if (tile) { rrPath(g, inset, inset, S - inset * 2, S - inset * 2, rad); g.clip(); }
  // candy-pink backdrop with a soft top-left light
  g.fillStyle = linearGrad(g, 0, 0, 0, S, [[0, '#ffc3db'], [0.5, '#ff8bb8'], [1, '#ff5d97']]);
  g.fillRect(0, 0, S, S);
  g.fillStyle = radialGrad(g, 150, 110, 0, 330, [[0, 'rgba(255,255,255,0.6)'], [1, 'rgba(255,255,255,0)']]);
  g.fillRect(0, 0, S, S);
  // gentle sunburst
  g.save(); g.translate(256, 270);
  for (let i = 0; i < 18; i++) {
    const a0 = (i / 18) * TAU, a1 = a0 + TAU / 36;
    g.beginPath(); g.moveTo(0, 0); g.arc(0, 0, 420, a0, a1); g.closePath();
    g.fillStyle = 'rgba(255,255,255,0.10)'; g.fill();
  }
  g.restore();
  // sprinkles around the rim (kept outside the central art)
  const spr = [[70, 92, 0.6, '#fff6e6'], [430, 78, -0.5, '#ffd23f'], [462, 214, 1.1, '#7fd8c4'], [52, 250, -1.0, '#a77bff'],
    [86, 420, 0.4, '#ffd23f'], [418, 444, -0.9, '#fff6e6'], [250, 40, 0.15, '#7fd8c4'], [470, 340, 0.7, '#a77bff'], [40, 160, 1.4, '#ff4f6a']];
  for (const [x, y, r, col] of spr) {
    g.save(); g.translate(x, y); g.rotate(r);
    rrPath(g, -21, -8, 42, 16, 8);
    g.fillStyle = col; g.fill();
    g.lineWidth = 5; g.strokeStyle = OUTLINE; g.stroke();
    g.fillStyle = 'rgba(255,255,255,0.7)'; rrPath(g, -14, -4.5, 16, 4, 2); g.fill();
    g.restore();
  }
  // ground shadow under the cookie
  g.fillStyle = 'rgba(122,31,67,0.28)';
  g.beginPath(); g.ellipse(256, 452, 150, 26, 0, 0, TAU); g.fill();
  // Chip
  const A = art();
  const R = 192, s = R / A.rr;
  g.save();
  g.translate(256, 262); g.scale(s, s); g.translate(-A.cx, -A.cy);
  g.drawImage(A.img, 0, 0);
  g.restore();
  sparkle(g, 404, 136, 26, '#ffffff', 0.95, 0.2);
  sparkle(g, 116, 360, 18, '#ffffff', 0.85, -0.3);
  g.restore();
  if (tile) {
    rrPath(g, inset, inset, S - inset * 2, S - inset * 2, rad);
    g.lineWidth = 12; g.strokeStyle = OUTLINE; g.stroke();
    rrPath(g, inset + 13, inset + 13, S - (inset + 13) * 2, S - (inset + 13) * 2, rad - 13);
    g.lineWidth = 5; g.strokeStyle = 'rgba(255,255,255,0.45)'; g.stroke();
  }
}

/** Draw the 512 artwork scaled into an S x S target with a two-step downscale. */
function drawAt(g, S, tile) {
  const big = canvas(512, 512); const b = ctx2d(big);
  drawIcon512(b, tile);
  let src = big;
  if (S < 300) { const mid = canvas(S * 2, S * 2); const m = ctx2d(mid); m.drawImage(big, 0, 0, S * 2, S * 2); src = mid; }
  g.imageSmoothingQuality = 'high';
  g.drawImage(src, 0, 0, S, S);
}

export function build(F) {
  F.image('appicon_512', { path: 'app/icon-512', w: 512, h: 512, draw: (g) => drawAt(g, 512, true) });
  F.image('appicon_192', { path: 'app/icon-192', w: 192, h: 192, draw: (g) => drawAt(g, 192, true) });
  F.image('appicon_maskable', { path: 'app/icon-maskable-512', w: 512, h: 512, draw: (g) => drawAt(g, 512, false) });
  F.image('apple_touch_icon', { path: 'app/apple-touch-icon', w: 180, h: 180, draw: (g) => drawAt(g, 180, false) });
}
