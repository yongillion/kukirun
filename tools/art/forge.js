// =============================================================================
//  Art Forge — registry + exporter (runs inside a browser page)
//
//  Each art module in tools/art/modules/<name>.js exports:
//      export function build(F) { ... register outputs with F.sheet / F.image / F.atlas ... }
//
//  Output kinds (all sizes in ART PIXELS; meta stores `scale` = art px per logical unit):
//   F.image(id, { path, w, h, ax, ay, scale, draw(ctx, w, h) , meta })
//   F.sheet(id, { path, fw, fh, cols, count, ax, ay, scale, drawFrame(ctx, i, fw, fh), anims, meta })
//        anims: { name: { frames:[...indices], fps, loop } }
//   F.atlas(id, { path, scale, padding, maxWidth, items:[{ name, w, h, ax, ay, draw(ctx,w,h), meta }] })
//        -> packed sprites; meta.frames[name] = [x, y, w, h, ax, ay]
//
//  `path` is relative to assets/img/ and has no extension, e.g. 'characters/chip'.
//  Anchor (ax, ay) is in art px inside the image/frame (default: 0,0 = top-left).
// =============================================================================
import { canvas, ctx2d } from './lib.js';

export class Forge {
  constructor(moduleName) {
    this.module = moduleName;
    this.outputs = [];
  }
  image(id, o) {
    const c = canvas(o.w, o.h);
    const g = ctx2d(c);
    o.draw(g, o.w, o.h);
    this.outputs.push({ kind: 'image', id, path: o.path, canvas: c,
      meta: { type: 'image', src: o.path, w: o.w, h: o.h, ax: o.ax ?? 0, ay: o.ay ?? 0, scale: o.scale ?? 2, ...(o.meta || {}) } });
    return c;
  }
  sheet(id, o) {
    const cols = o.cols ?? Math.min(o.count, 8);
    const rows = Math.ceil(o.count / cols);
    const c = canvas(cols * o.fw, rows * o.fh);
    const g = ctx2d(c);
    for (let i = 0; i < o.count; i++) {
      const fx = (i % cols) * o.fw, fy = Math.floor(i / cols) * o.fh;
      g.save();
      g.beginPath(); g.rect(fx, fy, o.fw, o.fh); g.clip();
      g.translate(fx, fy);
      o.drawFrame(g, i, o.fw, o.fh);
      g.restore();
    }
    this.outputs.push({ kind: 'sheet', id, path: o.path, canvas: c,
      meta: { type: 'sheet', src: o.path, fw: o.fw, fh: o.fh, cols, count: o.count, ax: o.ax ?? o.fw / 2, ay: o.ay ?? o.fh / 2, scale: o.scale ?? 2, anims: o.anims || {}, ...(o.meta || {}) } });
    return c;
  }
  atlas(id, o) {
    const pad = o.padding ?? 4;
    const maxW = o.maxWidth ?? 2048;
    // render each item to its own canvas first
    const items = o.items.map((it) => {
      const c = canvas(it.w, it.h);
      it.draw(ctx2d(c), it.w, it.h);
      return { ...it, c };
    });
    // shelf pack, tallest first
    const order = [...items].sort((a, b) => b.h - a.h || b.w - a.w);
    let x = pad, y = pad, shelfH = 0, W = 0;
    for (const it of order) {
      if (x + it.w + pad > maxW) { x = pad; y += shelfH + pad; shelfH = 0; }
      it.x = x; it.y = y;
      x += it.w + pad; shelfH = Math.max(shelfH, it.h); W = Math.max(W, x);
    }
    const H = y + shelfH + pad;
    const c = canvas(W, H);
    const g = ctx2d(c);
    const frames = {};
    const extra = {};
    for (const it of items) {
      g.drawImage(it.c, it.x, it.y);
      frames[it.name] = [it.x, it.y, it.w, it.h, it.ax ?? it.w / 2, it.ay ?? it.h / 2];
      if (it.meta) extra[it.name] = it.meta;
    }
    this.outputs.push({ kind: 'atlas', id, path: o.path, canvas: c,
      meta: { type: 'atlas', src: o.path, scale: o.scale ?? 2, frames, ...(Object.keys(extra).length ? { info: extra } : {}), ...(o.meta || {}) } });
    return c;
  }
}

/** Load fonts available to art modules (same faces the game uses). */
export async function loadFonts() {
  const F = window.__DD_FONTS__;
  if (!F) return;
  const list = [['DDDisplay', '900'], ['DDBold', '700'], ['DDNum', '700']];
  for (const [name, weight] of list) {
    if (!F[name]) continue;
    const bin = Uint8Array.from(atob(F[name]), (ch) => ch.charCodeAt(0));
    const ff = new FontFace(name, bin.buffer, { weight });
    await ff.load();
    document.fonts.add(ff);
  }
  await document.fonts.ready;
}

/** Build the given modules; returns [{module, id, path, kind, dataURL, meta}] */
export async function runForge(moduleNames) {
  await loadFonts();
  const results = [];
  for (const name of moduleNames) {
    const mod = await import(`./modules/${name}.js?v=${Date.now()}`);
    const F = new Forge(name);
    await mod.build(F);
    for (const o of F.outputs) {
      results.push({ module: name, id: o.id, path: o.path, kind: o.kind, meta: o.meta,
        width: o.canvas.width, height: o.canvas.height, dataURL: o.canvas.toDataURL('image/png') });
    }
  }
  return results;
}

/** Interactive preview when forge.html is opened in a normal browser. */
export async function preview(moduleNames, root) {
  const res = await runForge(moduleNames);
  for (const r of res) {
    const box = document.createElement('figure');
    const img = new Image(); img.src = r.dataURL;
    img.style.maxWidth = '100%';
    const cap = document.createElement('figcaption');
    cap.textContent = `${r.module} / ${r.id}  (${r.width}×${r.height})  -> assets/img/${r.path}.png`;
    box.append(cap, img); root.append(box);
  }
  return res;
}
