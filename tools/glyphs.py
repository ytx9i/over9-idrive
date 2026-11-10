"""
glyphs.py - turns pictures of text into a font the head unit's GPU renderer can draw.

The renderer draws text from glyph atlases (kit/runtime/fonts/*.json) but cannot show pixel images in the
normal (mgu-render/1) mode, and has no Arabic or Kurdish font. So every line of Arabic / Kurdish / English
text is drawn here (Pillow + raqm shapes it right to left) and stored as ONE glyph of a private font:
the app then draws the whole line with cv.text(that one character). White on black = the glyph's alpha;
the colour is given when drawing.

bake(family, items) packs the glyphs into atlases of at most 2048 x 2048, writes
kit/runtime/fonts/<family><n>.json, and returns {key: {font, size, cp, w, h}} for the app.
"""
import base64
import hashlib
import json
import os
import zlib

from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FONTS_OUT = os.path.join(ROOT, 'kit', 'runtime', 'fonts')
CAIRO = os.path.join(ROOT, 'fonts', 'Cairo.ttf')
NOTO = os.path.join(ROOT, 'fonts', 'NotoSansArabic.ttf')

PAGE_W, PAGE_H, PAD = 1024, 2048, 2   # like the kit's own atlases (1024 wide)
SIZE = 100          # the one "size" of these fonts; apps draw at exactly this size (scale 1)
FIRST_CP = 0xE000   # private use area
KURDISH = set('ڤێۆڕەڵ')


def font(path, size, weight):
    f = ImageFont.truetype(path, size, layout_engine=ImageFont.Layout.RAQM)
    axes = f.get_variation_axes()
    f.set_variation_by_axes([weight if a['name'] in (b'Weight', b'wght') else a['default'] for a in axes])
    return f


def is_rtl(text):
    return any('؀' <= ch <= 'ۿ' for ch in text)


def line(text, size, weight, path=None, max_w=None):
    """A white-on-black ('L') picture of text, wrapped to max_w and centred line by line."""
    rtl = is_rtl(text)
    # Cairo has Arabic and Latin; Kurdish letters (and only those lines) need Noto Sans Arabic
    kurdish = any(ch in KURDISH for ch in text)
    f = font(path or (NOTO if kurdish else CAIRO), size, weight)
    direction = 'rtl' if rtl else 'ltr'
    lines = [text]
    if max_w:
        lines, cur = [], ''
        for w in text.split(' '):
            t = (cur + ' ' + w).strip()
            if cur and f.getlength(t, direction=direction) > max_w:
                lines.append(cur)
                cur = w
            else:
                cur = t
        lines.append(cur)
    asc, desc = f.getmetrics()
    lh = int((asc + desc) * 1.02)
    w = int(max(f.getlength(l, direction=direction) for l in lines)) + 8
    h = lh * len(lines) + 4
    im = Image.new('L', (w, h), 0)
    d = ImageDraw.Draw(im)
    for i, l in enumerate(lines):
        d.text(((w - f.getlength(l, direction=direction)) / 2, 2 + i * lh), l, font=f, fill=255, direction=direction)
    return trim(im)


def trim(im):
    """Cut empty rows and columns off the edges (keeping 2 px)."""
    box = im.getbbox()
    if not box:
        return im
    l, t, r, b = box
    return im.crop((max(0, l - 2), max(0, t - 2), min(im.width, r + 2), min(im.height, b + 2)))


def bake(family, items):
    """items: {key: PIL 'L' image}. Returns {key: {font, size, cp, w, h}}."""
    # shelf packing, tallest first
    order = sorted(items, key=lambda k: -items[k].height)
    pages, cur, x, y, shelf = [], [], 0, 0, 0
    for k in order:
        im = items[k]
        if im.width > PAGE_W:
            raise ValueError('%s is %d px wide, more than an atlas' % (k, im.width))
        if x + im.width > PAGE_W:
            x, y, shelf = 0, y + shelf + PAD, 0
        if y + im.height > PAGE_H:
            pages.append(cur)
            cur, x, y, shelf = [], 0, 0, 0
        cur.append((k, x, y))
        x += im.width + PAD
        shelf = max(shelf, im.height)
    pages.append(cur)

    # old pages of this family go (a family can shrink)
    for f in os.listdir(FONTS_OUT):
        if f.startswith(family) and f[len(family):-5].isdigit() and f.endswith('.json'):
            os.remove(os.path.join(FONTS_OUT, f))

    out, cp = {}, FIRST_CP
    for n, page in enumerate(pages):
        name = '%s%d' % (family, n)
        h = max(y + items[k].height for k, _, y in page)
        h = max(16, (h + 15) // 16 * 16)
        atlas = Image.new('L', (PAGE_W, h), 0)
        glyphs = {}
        for k, x, y in page:
            im = items[k]
            atlas.paste(im, (x, y))
            glyphs[str(cp)] = [x, y, im.width, im.height, 0, 0, im.width]
            out[k] = {'font': name, 'size': SIZE, 'cp': cp, 'w': im.width, 'h': im.height}
            cp += 1
        raw = atlas.tobytes()
        j = {
            'family': name,
            'source': 'tools/glyphs.py',
            'cacheKey': hashlib.sha1(raw).hexdigest()[:12],
            'sizes': [{'size': SIZE, 'ascent': SIZE, 'descent': 0, 'atlasW': PAGE_W, 'atlasH': h,
                       'alpha': base64.b64encode(zlib.compress(raw, 9)).decode(), 'glyphs': glyphs}],
        }
        with open(os.path.join(FONTS_OUT, name + '.json'), 'w') as fh:
            json.dump(j, fh, separators=(',', ':'))
    return out


def write_js(path, data, by):
    with open(path, 'w', encoding='utf-8') as fh:
        fh.write("'use strict';\n// Made by %s - do not edit, run it again instead.\n" % by)
        fh.write('module.exports = ' + json.dumps(data, separators=(',', ':'), ensure_ascii=False) + ';\n')
