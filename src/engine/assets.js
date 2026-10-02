// =============================================================================
//  Image assets: loading + sprite drawing from the generated atlas metadata.
//  Art is stored at `scale` art-px per logical unit (usually 2).
// =============================================================================
import { ATLAS } from '../data/atlas.js';

const images = new Map();      // src -> HTMLImageElement
const tintCache = new Map();   // key -> canvas
const F = { img: null, sx: 0, sy: 0, sw: 0, sh: 0, ax: 0, ay: 0, s: 1 };

export const Assets = {
  atlas: ATLAS,

  /** Load every image referenced by the atlas. onProgress(done, total) */
  async loadImages(onProgress, base = '') {
    const srcs = [...new Set(Object.values(ATLAS).map((a) => a.src))];
    let done = 0;
    await Promise.all(srcs.map((src) => new Promise((resolve) => {
      const img = new Image();
      img.onload = async () => {
        try { if (img.decode) await img.decode(); } catch (e) { /* ignore */ }
        images.set(src, img); done++; onProgress && onProgress(done, srcs.length); resolve();
      };
      img.onerror = () => { console.warn('image failed', src); done++; onProgress && onProgress(done, srcs.length); resolve(); };
      img.src = base + src;
    })));
  },

  has(id) { return !!ATLAS[id]; },
  meta(id) { return ATLAS[id]; },
  image(id) { const a = ATLAS[id]; return a ? images.get(a.src) : null; },

  /** Resolve a frame into the shared F struct (do not keep a reference). */
  frame(id, f = 0) {
    const a = ATLAS[id];
    if (!a) return null;
    const img = images.get(a.src);
    if (!img) return null;
    F.img = img; F.s = a.scale || 1;
    if (a.type === 'sheet') {
      const i = f | 0;
      F.sx = (i % a.cols) * a.fw; F.sy = Math.floor(i / a.cols) * a.fh;
      F.sw = a.fw; F.sh = a.fh; F.ax = a.ax; F.ay = a.ay;
    } else if (a.type === 'atlas') {
      const r = a.frames[f];
      if (!r) return null;
      F.sx = r[0]; F.sy = r[1]; F.sw = r[2]; F.sh = r[3]; F.ax = r[4]; F.ay = r[5];
    } else {
      F.sx = 0; F.sy = 0; F.sw = a.w; F.sh = a.h; F.ax = a.ax || 0; F.ay = a.ay || 0;
    }
    return F;
  },

  /** Logical size of a frame. */
  size(id, f = 0) {
    const fr = this.frame(id, f);
    return fr ? { w: fr.sw / fr.s, h: fr.sh / fr.s, ax: fr.ax / fr.s, ay: fr.ay / fr.s } : { w: 0, h: 0, ax: 0, ay: 0 };
  },

  /**
   * Draw a sprite with its anchor at (x, y) in logical units.
   * o: { scale, sx, sy, rot, alpha, flip, add, tint }
   */
  draw(ctx, id, f, x, y, o) {
    const fr = this.frame(id, f);
    if (!fr) return;
    const s = fr.s;
    if (!o) {
      ctx.drawImage(fr.img, fr.sx, fr.sy, fr.sw, fr.sh, x - fr.ax / s, y - fr.ay / s, fr.sw / s, fr.sh / s);
      return;
    }
    const scl = o.scale ?? 1;
    const kx = (o.sx ?? 1) * scl * (o.flip ? -1 : 1);
    const ky = (o.sy ?? 1) * scl;
    const alpha = o.alpha ?? 1;
    if (alpha <= 0.003) return;
    let src = fr.img, sx = fr.sx, sy = fr.sy;
    const { sw, sh, ax, ay } = fr;
    if (o.tint) {
      src = this.tinted(id, f, o.tint);
      sx = 0; sy = 0;
    }
    ctx.save();
    if (alpha !== 1) ctx.globalAlpha *= alpha;
    if (o.add) ctx.globalCompositeOperation = 'lighter';
    ctx.translate(x, y);
    if (o.rot) ctx.rotate(o.rot);
    if (kx !== 1 || ky !== 1) ctx.scale(kx, ky);
    ctx.drawImage(src, sx, sy, sw, sh, -ax / s, -ay / s, sw / s, sh / s);
    ctx.restore();
  },

  /** Flat-colour silhouette of a frame (cached) — for hit flashes, glows, shadows. */
  tinted(id, f, color) {
    const key = id + '|' + f + '|' + color;
    let c = tintCache.get(key);
    if (c) return c;
    const fr = this.frame(id, f);
    c = document.createElement('canvas');
    c.width = fr.sw; c.height = fr.sh;
    const g = c.getContext('2d');
    g.drawImage(fr.img, fr.sx, fr.sy, fr.sw, fr.sh, 0, 0, fr.sw, fr.sh);
    g.globalCompositeOperation = 'source-in';
    g.fillStyle = color; g.fillRect(0, 0, c.width, c.height);
    if (tintCache.size > 400) tintCache.clear();
    tintCache.set(key, c);
    return c;
  },

  /** Draw an image tiled horizontally across [x0, x1) starting at world offset. */
  tileX(ctx, id, worldOffset, y, x0, x1, alpha = 1) {
    const fr = this.frame(id, 0);
    if (!fr) return;
    const s = fr.s, w = fr.sw / s, h = fr.sh / s;
    let start = x0 - (((worldOffset % w) + w) % w);
    if (alpha !== 1) { ctx.save(); ctx.globalAlpha *= alpha; }
    for (let x = start; x < x1; x += w) ctx.drawImage(fr.img, fr.sx, fr.sy, fr.sw, fr.sh, x, y, w + 0.6, h);
    if (alpha !== 1) ctx.restore();
  },
};
