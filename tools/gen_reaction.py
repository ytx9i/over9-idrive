#!/usr/bin/env python3
"""
gen_reaction.py - draws the Arabic text of OVER 9 Reaction into apps/over9_reaction/assets.js
(the head unit has no Arabic font). Run after changing a line below:

    pip install pillow
    python3 tools/gen_reaction.py
"""
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from gen_assets import ACCENTS, BG, DIM, WHITE, pack, text_img, logo_img  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'apps', 'over9_reaction', 'assets.js')

GREEN = (40, 220, 90)
RED = (235, 45, 45)
AMBER = (255, 176, 32)

TEXTS = {
    'title': ('اختبار ردة الفعل', 34, 800, WHITE),
    'start': ('اضغط زر الـ iDrive أو الشاشة حتى تبدي', 30, 600, DIM),
    'ready': ('استعد... لا تضغط', 40, 800, AMBER),
    'go': ('هسه!', 64, 1000, GREEN),
    'false': ('بكّرت! انطلاق خاطئ', 44, 900, RED),
    'again': ('اضغط مرة ثانية حتى تعيد', 26, 500, DIM),
    'best': ('أفضل الأوقات', 28, 800, WHITE),
    'record': ('رقم قياسي جديد!', 34, 900, AMBER),
    'parked': ('اللعبة تشتغل بس والسيارة واكفة', 34, 800, AMBER),
    'none': ('بعد ماكو أوقات', 24, 500, DIM),
    # ranks, fastest first
    'r0': ('صاروخ', 46, 1000, GREEN),
    'r1': ('نار', 46, 1000, GREEN),
    'r2': ('سريع', 46, 900, WHITE),
    'r3': ('زين', 46, 900, WHITE),
    'r4': ('عادي', 46, 800, DIM),
    'r5': ('نايم', 46, 800, RED),
}


def main():
    out = {
        'text': {k: pack(text_img(t, s, w, c, BG)) for k, (t, s, w, c) in TEXTS.items()},
        'logo': pack(small_logo()),
    }
    with open(OUT, 'w', encoding='utf-8') as fh:
        fh.write("'use strict';\n// Made by tools/gen_reaction.py - do not edit, run it again instead.\n")
        fh.write('module.exports = ' + json.dumps(out, separators=(',', ':')) + ';\n')
    print('%s: %d KB' % (OUT, os.path.getsize(OUT) // 1024))


def small_logo():
    from PIL import Image
    im = logo_img(ACCENTS['red'], BG)
    h = 56
    return im.resize((round(im.width * h / im.height), h), Image.LANCZOS)


if __name__ == '__main__':
    main()
