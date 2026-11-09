#!/usr/bin/env python3
"""
gen_talk.py - draws every message of OVER 9 Talk, in Arabic, Kurdish (Badini) and English, into
apps/over9_talk/assets.js (the head unit has no Arabic or Kurdish font). Change a message below, then:

    pip install pillow
    python3 tools/gen_talk.py

Arabic and Kurdish use Noto Sans Arabic (it has the Kurdish letters), English uses Cairo.
"""
import base64
import json
import os
import zlib

from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'apps', 'over9_talk', 'assets.js')
NOTO = os.path.join(ROOT, 'fonts', 'NotoSansArabic.ttf')
CAIRO = os.path.join(ROOT, 'fonts', 'Cairo.ttf')

BUBBLE = (30, 30, 37)        # the speech bubble's colour: messages are drawn on it
BG = (10, 10, 13)
WHITE = (240, 240, 245)
DIM = (150, 150, 162)
MAX_W = 820                  # a message wider than this wraps

# ---------------------------------------------------------------- the messages: [Arabic, Kurdish (Badini), English]
MESSAGES = {
    'morning': ['صباح الخير! يلا نطلع؟', 'سپێدە باش! دێ چینە دەر؟', 'Good morning! Shall we go?'],
    'day': ['هلا بيك! وين رايحين اليوم؟', 'بخێر بێی! ئەڤرۆ دێ چینە کیڤە؟', 'Hey there! Where are we going today?'],
    'evening': ['مساء الخير! طلعة مسائية؟', 'ئێڤار باش! گەڕیانەکا ئێڤارێ؟', 'Good evening! Evening cruise?'],
    'late': ['ها؟ بهالوكت؟ دير بالك على نفسك', 'ها؟ ڤی دەمی؟ ئاگەهـ ل خۆ ببە', 'This late? Take care out there.'],
    'cold_rev': ['على كيفك عيني، الزيت بعده بارد!', 'هێدی برا، رۆن هێشتا سارە!', 'Easy! The oil is still cold!'],
    'warm': ['الزيت سخن، هسه تكدر تدوس', 'رۆن گەرم بوو، نوکە دشێی', 'The oil is warm. Now you can push it.'],
    'fast': ['هدّي هدّي، الشرطة تباوع!', 'هێدی هێدی، پۆلیس تە دبینن!', 'Slow down, the police are watching!'],
    'very_fast': ['تريد تطير؟ هاي مو طيارة!', 'تە دڤێت بفڕی؟ ئەڤە نە تەیارەیە!', "Trying to fly? This isn't a plane!"],
    'high_rpm': ['يا سلام على هالصوت!', 'ئەی دەنگەکێ خۆش!', 'Oh, that sound!'],
    'indicator': ['الإشارة صارلها ساعة شغالة، نسيتها؟', 'ئیشارەت ژ مێژە ڤەکرییە، تە ژبیرکر؟', "Your indicator's been on forever. Forgot it?"],
    'idle': ['شبيك واكف؟ نايم؟', 'بۆچی راوەستیای؟ تو نڤستی؟', 'Why are we stopped? Asleep?'],
    'calm': ['عاشت إيدك، سياقة نظيفة', 'دەستێن تە خۆش بن، ئاژۆتنەکا پاقژ', 'Nice, smooth driving!'],
    'night': ['صار ليل، فتّح عيونك زين', 'شەڤ هات، چاڤێن خۆ ڤەکە', "It's dark now. Eyes open!"],
    'hot': ['المحرك حار! خفف شوية', 'مۆتۆر گەلەک گەرمە! هێدی بکە', 'The engine is hot! Ease off.'],
    'traffic': ['زحمة؟ صبرك علينا', 'قەرەباڵغ؟ سەبرا تە هەبیت', 'Traffic? Hang in there.'],
    'ok': ['كلشي تمام', 'هەمی تشت باشە', 'All good.'],
}
LABELS = {
    'oil': ['الزيت', 'رۆن', 'OIL'],
    'coolant': ['الماي', 'ئاڤ', 'COOLANT'],
    'speed': ['السرعة', 'لەز', 'SPEED'],
    'rpm': ['الدوران', 'زڤڕین', 'RPM'],
}
LANGS = ['ar', 'ku', 'en']


def font(path, size, weight):
    f = ImageFont.truetype(path, size, layout_engine=ImageFont.Layout.RAQM)
    axes = f.get_variation_axes()
    f.set_variation_by_axes([weight if a['name'] in (b'Weight', b'wght') else a['default'] for a in axes])
    return f


def wrap(text, f, direction):
    words, lines, cur = text.split(' '), [], ''
    for w in words:
        t = (cur + ' ' + w).strip()
        if cur and f.getlength(t, direction=direction) > MAX_W:
            lines.append(cur)
            cur = w
        else:
            cur = t
    lines.append(cur)
    return lines


def draw(text, lang, size, weight, color, bg):
    path = CAIRO if lang == 'en' else NOTO
    direction = 'ltr' if lang == 'en' else 'rtl'
    f = font(path, size, weight)
    lines = wrap(text, f, direction)
    asc, desc = f.getmetrics()
    lh = int((asc + desc) * 1.05)
    w = int(max(f.getlength(l, direction=direction) for l in lines)) + 16
    h = lh * len(lines) + 8
    im = Image.new('RGB', (w, h), bg)
    d = ImageDraw.Draw(im)
    for i, l in enumerate(lines):
        lw = f.getlength(l, direction=direction)
        d.text(((w - lw) / 2, 4 + i * lh), l, font=f, fill=color, direction=direction)
    return im


def pack(im):
    return {'w': im.width, 'h': im.height, 'rgb': base64.b64encode(zlib.compress(im.tobytes(), 9)).decode()}


def main():
    out = {'msg': {}, 'label': {}}
    for k, tr in MESSAGES.items():
        for i, lang in enumerate(LANGS):
            out['msg'][lang + '_' + k] = pack(draw(tr[i], lang, 46, 800, WHITE, BUBBLE))
    for k, tr in LABELS.items():
        for i, lang in enumerate(LANGS):
            out['label'][lang + '_' + k] = pack(draw(tr[i], lang, 24, 700, DIM, BG))
    with open(OUT, 'w', encoding='utf-8') as fh:
        fh.write("'use strict';\n// Made by tools/gen_talk.py - do not edit, run it again instead.\n")
        fh.write('module.exports = ' + json.dumps(out, separators=(',', ':')) + ';\n')
    print('%s: %d KB' % (OUT, os.path.getsize(OUT) // 1024))
    widest = max(out['msg'].items(), key=lambda kv: kv[1]['w'])
    tallest = max(out['msg'].items(), key=lambda kv: kv[1]['h'])
    print('widest', widest[0], widest[1]['w'], '| tallest', tallest[0], tallest[1]['h'])


if __name__ == '__main__':
    main()
