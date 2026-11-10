#!/usr/bin/env python3
"""
gen_assets.py - the OVER 9 card's text (Arabic and English) and QR codes -> apps/over9/assets.js and the
font kit/runtime/fonts/o9card*.json (see glyphs.py for why text is a font). Edit INFO, then:

    pip install pillow segno
    python3 tools/gen_assets.py
"""
import os
import sys

import segno

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from glyphs import ROOT, bake, line, write_js  # noqa: E402

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


def qr(data):
    v = max(3, segno.make(data, error='m', micro=False).version)    # the same size for all
    q = segno.make(data, error='m', micro=False, version=v)
    rows = [''.join('1' if c else '0' for c in row) for row in q.matrix]
    return {'n': len(rows), 'bits': ''.join(rows), 'data': data}


def main():
    I = INFO
    # key: (text, size, weight)  - the colour is chosen when drawing
    texts = {
        'en_job': (I['job_en'], 28, 800), 'ar_job': (I['job_ar'], 32, 800),
        'en_name': (I['name_en'], 34, 600), 'ar_name': (I['name_ar'], 36, 700),
        'en_city': (I['city_en'], 28, 400), 'ar_city': (I['city_ar'], 28, 500),
        'phone': (I['phone'], 56, 800),
        'en_call': ('CALL / WHATSAPP', 22, 700), 'ar_call': ('اتصال / واتساب', 24, 700),
        'en_wa': ('WhatsApp', 28, 800), 'ar_wa': ('واتساب', 28, 800),
        'en_ig': ('Instagram', 28, 800), 'ar_ig': ('انستغرام', 28, 800),
        'en_tt': ('TikTok', 28, 800), 'ar_tt': ('تيك توك', 28, 800),
        'h_wa': (I['phone'], 24, 600), 'h_ig': ('@' + I['instagram'], 24, 600), 'h_tt': ('@' + I['tiktok'], 24, 600),
        'en_scan': ('Scan with your phone camera', 19, 400), 'ar_scan': ('امسح الرمز بكاميرا الموبايل', 20, 500),
        'logo_over': ('OVER', 150, 1000), 'logo_9': ('9', 150, 1000),
    }
    glyphs = bake('o9card', {k: line(*v) for k, v in texts.items()})
    write_js(OUT, {
        'glyphs': glyphs,
        'qr': {
            'wa': qr('https://wa.me/' + I['whatsapp']),
            'ig': qr('https://instagram.com/' + I['instagram']),
            'tt': qr('https://www.tiktok.com/@' + I['tiktok']),
        },
    }, 'tools/gen_assets.py')
    print('%s: %d KB' % (OUT, os.path.getsize(OUT) // 1024))


if __name__ == '__main__':
    main()
