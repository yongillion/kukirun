#!/usr/bin/env python3
"""
Preview helper: composes PNGs onto a checkerboard so transparency/outlines are
visible, optionally scaled down, and writes one preview image.

  python3 tools/art/gallery.py OUT.png img1.png [img2.png ...] [--max 1600] [--bg dark|light|sky]
  python3 tools/art/gallery.py OUT.png assets/img/characters/chip.png --grid 288x288 --frames 0-27
      (--grid WxH splits a sprite sheet into frames and lays them out with index labels)
"""
import sys
from PIL import Image, ImageDraw


def checker(w, h, mode):
    if mode == 'sky':
        img = Image.new('RGBA', (w, h), (150, 205, 245, 255))
        return img
    a, b = ((58, 50, 66), (70, 60, 80)) if mode == 'dark' else ((235, 235, 235), (205, 205, 205))
    img = Image.new('RGBA', (w, h), a + (255,))
    d = ImageDraw.Draw(img)
    s = 16
    for y in range(0, h, s):
        for x in range(0, w, s):
            if (x // s + y // s) % 2:
                d.rectangle([x, y, x + s - 1, y + s - 1], fill=b + (255,))
    return img


def main():
    args = sys.argv[1:]
    out = args.pop(0)
    maxw, bg, grid, frames = 1600, 'dark', None, None
    files = []
    i = 0
    while i < len(args):
        a = args[i]
        if a == '--max': maxw = int(args[i + 1]); i += 2; continue
        if a == '--bg': bg = args[i + 1]; i += 2; continue
        if a == '--grid': grid = tuple(int(v) for v in args[i + 1].split('x')); i += 2; continue
        if a == '--frames':
            lo, hi = args[i + 1].split('-'); frames = list(range(int(lo), int(hi) + 1)); i += 2; continue
        files.append(a); i += 1

    tiles = []
    for f in files:
        im = Image.open(f).convert('RGBA')
        if grid:
            fw, fh = grid
            cols = im.width // fw
            rows = im.height // fh
            idxs = frames or list(range(cols * rows))
            for k in idxs:
                x, y = (k % cols) * fw, (k // cols) * fh
                if y + fh > im.height: continue
                tiles.append((f'{k}', im.crop((x, y, x + fw, y + fh))))
        else:
            tiles.append((f.split('/')[-1], im))

    pad = 10
    # simple flow layout
    rows, row, rw, rh = [], [], 0, 0
    width_limit = max(maxw * 2, max(t[1].width for t in tiles) + pad * 2)
    for name, im in tiles:
        if row and rw + im.width + pad > width_limit:
            rows.append((row, rh)); row, rw, rh = [], 0, 0
        row.append((name, im)); rw += im.width + pad; rh = max(rh, im.height + 18)
    if row: rows.append((row, rh))
    W = max(sum(im.width + pad for _, im in r) for r, _ in rows) + pad
    H = sum(h + pad for _, h in rows) + pad
    canvas = checker(W, H, bg)
    d = ImageDraw.Draw(canvas)
    y = pad
    for r, h in rows:
        x = pad
        for name, im in r:
            d.text((x + 2, y), name, fill=(255, 230, 120, 255) if bg == 'dark' else (40, 20, 10, 255))
            canvas.alpha_composite(im, (x, y + 16))
            d.rectangle([x, y + 16, x + im.width - 1, y + 16 + im.height - 1], outline=(255, 255, 255, 60))
            x += im.width + pad
        y += h + pad
    if canvas.width > maxw:
        s = maxw / canvas.width
        canvas = canvas.resize((maxw, int(canvas.height * s)), Image.LANCZOS)
    canvas.convert('RGB').save(out)
    print('wrote', out, canvas.size)


if __name__ == '__main__':
    main()
