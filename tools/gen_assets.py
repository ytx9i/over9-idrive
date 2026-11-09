#!/usr/bin/env python3
"""
gen_assets.py - draws the OVER 9 app's text (Arabic and English) and QR codes into apps/over9/assets.js.

The head unit's fonts have no Arabic, so every line of text is drawn here with the Cairo font (Arabic shaped
and right-to-left with Pillow + raqm) and shipped as small compressed pictures. Edit INFO below, then run:

    pip install pillow segno
    python3 tools/gen_assets.py

Needs Pillow built with raqm (python3 -c "from PIL import features; print(features.check('raqm'))").
"""
import base64
import json
import os
import zlib

import segno
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FONT = os.path.join(ROOT, 'fonts', 'Cairo.ttf')
OUT = os.path.join(ROOT, 'apps', 'over9', 'assets.js')

# ---------------------------------------------------------------- your details: edit these
INFO = {
    'name_en': 'Mohamed',
    'name_ar': 'محمد',
    'job_en': 'CAR PROGRAMMING',
    'job_ar': 'برمجة السيارات',
    'city_en': 'Duhok, Iraq',
    'city_ar': 'دهوك - العراق',
    'phone': '0750 278 6722',
    'whatsapp': '9647502786722',      # international, no + or spaces
    'instagram': 'f6sr',
    'tiktok': 'iamover9',
}

# ---------------------------------------------------------------- colours (also in main.js)
BG = (10, 10, 13)
CARD = (22, 22, 27)
WHITE = (240, 240, 245)
DIM = (150, 150, 162)
ACCENTS = {'red': (230, 30, 40), 'blue': (28, 105, 212), 'gold': (212, 170, 60)}


def font(size, weight):
    f = ImageFont.truetype(FONT, size, layout_engine=ImageFont.Layout.RAQM)
    f.set_variation_by_axes([weight, 0])
    return f


def text_img(text, size, weight, color, bg):
    f = font(size, weight)
    direction = 'rtl' if any('؀' <= ch <= 'ۿ' for ch in text) else 'ltr'
    l, t, r, b = f.getbbox(text, direction=direction)
    asc, desc = f.getmetrics()
    pad = 4
    w = (r - l) + pad * 2
    # a fixed band from the font's metrics (not the ink), so lines of one size line up
    top = min(t, int(asc * 0.25))
    bot = max(b, asc + int(desc * 0.35))
    h = (bot - top) + pad * 2
    im = Image.new('RGB', (w, h), bg)
    ImageDraw.Draw(im).text((pad - l, pad - top), text, font=f, fill=color, direction=direction)
    return im


def logo_img(accent, bg):
    f = font(150, 1000)
    a, b = 'OVER ', '9'
    la, ta, ra, ba = f.getbbox(a + b)
    wa = f.getlength(a)
    pad = 6
    im = Image.new('RGB', (int(ra - la) + pad * 2, int(ba - ta) + pad * 2), bg)
    d = ImageDraw.Draw(im)
    d.text((pad - la, pad - ta), a, font=f, fill=WHITE)
    d.text((pad - la + wa, pad - ta), b, font=f, fill=accent)
    return im


def pack(im):
    raw = im.convert('RGB').tobytes()
    return {'w': im.width, 'h': im.height, 'rgb': base64.b64encode(zlib.compress(raw, 9)).decode()}


def qr(data):
    q = segno.make(data, error='m', micro=False, version=max(3, segno.make(data, error='m', micro=False).version))  # same size for all
    rows = [''.join('1' if v else '0' for v in row) for row in q.matrix]
    return {'n': len(rows), 'bits': ''.join(rows), 'data': data}


def main():
    I = INFO
    texts = {
        # left card
        'en_job': (I['job_en'], 28, 800, WHITE, CARD),
        'ar_job': (I['job_ar'], 32, 800, WHITE, CARD),
        'en_name': (I['name_en'], 34, 600, WHITE, CARD),
        'ar_name': (I['name_ar'], 36, 700, WHITE, CARD),
        'en_city': (I['city_en'], 28, 400, DIM, CARD),
        'ar_city': (I['city_ar'], 28, 500, DIM, CARD),
        'phone': (I['phone'], 56, 800, WHITE, CARD),
        'en_call': ('CALL / WHATSAPP', 22, 700, DIM, CARD),
        'ar_call': ('اتصال / واتساب', 24, 700, DIM, CARD),
        # QR cards
        'en_wa': ('WhatsApp', 28, 800, WHITE, CARD),
        'ar_wa': ('واتساب', 28, 800, WHITE, CARD),
        'en_ig': ('Instagram', 28, 800, WHITE, CARD),
        'ar_ig': ('انستغرام', 28, 800, WHITE, CARD),
        'en_tt': ('TikTok', 28, 800, WHITE, CARD),
        'ar_tt': ('تيك توك', 28, 800, WHITE, CARD),
        'h_wa': (I['phone'], 24, 600, DIM, CARD),
        'h_ig': ('@' + I['instagram'], 24, 600, DIM, CARD),
        'h_tt': ('@' + I['tiktok'], 24, 600, DIM, CARD),
        'en_scan': ('Scan with your phone camera', 19, 400, DIM, CARD),
        'ar_scan': ('امسح الرمز بكاميرا الموبايل', 20, 500, DIM, CARD),
    }
    out = {
        'colours': {'bg': BG, 'card': CARD, 'white': WHITE, 'dim': DIM, 'accents': ACCENTS},
        'text': {k: pack(text_img(*v)) for k, v in texts.items()},
        'logo': {k: pack(logo_img(c, CARD)) for k, c in ACCENTS.items()},
        'qr': {
            'wa': qr('https://wa.me/' + I['whatsapp']),
            'ig': qr('https://instagram.com/' + I['instagram']),
            'tt': qr('https://www.tiktok.com/@' + I['tiktok']),
        },
    }
    with open(OUT, 'w', encoding='utf-8') as fh:
        fh.write("'use strict';\n// Made by tools/gen_assets.py - do not edit, run it again instead.\n")
        fh.write('module.exports = ' + json.dumps(out, separators=(',', ':')) + ';\n')
    print('%s: %d KB' % (OUT, os.path.getsize(OUT) // 1024))
    for k, v in out['text'].items():
        print('  %-8s %dx%d' % (k, v['w'], v['h']))


if __name__ == '__main__':
    main()
