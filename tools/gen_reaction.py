#!/usr/bin/env python3
"""
gen_reaction.py - the Arabic text of OVER 9 Reaction -> apps/over9_reaction/assets.js and the font
kit/runtime/fonts/o9react*.json (see glyphs.py). Change a line below, then: python3 tools/gen_reaction.py
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from glyphs import ROOT, bake, line, write_js  # noqa: E402

OUT = os.path.join(ROOT, 'apps', 'over9_reaction', 'assets.js')

# key: (text, size, weight) - the colour is chosen when drawing
TEXTS = {
    'title': ('اختبار ردة الفعل', 34, 800),
    'start': ('اضغط زر الـ iDrive أو الشاشة حتى تبدي', 30, 600),
    'ready': ('استعد... لا تضغط', 40, 800),
    'go': ('هسه!', 64, 1000),
    'false': ('بكّرت! انطلاق خاطئ', 44, 900),
    'again': ('اضغط مرة ثانية حتى تعيد', 26, 500),
    'best': ('أفضل الأوقات', 28, 800),
    'record': ('رقم قياسي جديد!', 34, 900),
    'parked': ('اللعبة تشتغل بس والسيارة واكفة', 34, 800),
    'none': ('بعد ماكو أوقات', 24, 500),
    'r0': ('صاروخ', 46, 1000), 'r1': ('نار', 46, 1000), 'r2': ('سريع', 46, 900),
    'r3': ('زين', 46, 900), 'r4': ('عادي', 46, 800), 'r5': ('نايم', 46, 800),
    'logo_over': ('OVER', 46, 1000), 'logo_9': ('9', 46, 1000),
}

if __name__ == '__main__':
    write_js(OUT, {'glyphs': bake('o9react', {k: line(*v) for k, v in TEXTS.items()})}, 'tools/gen_reaction.py')
    print(OUT, os.path.getsize(OUT) // 1024, 'KB')
