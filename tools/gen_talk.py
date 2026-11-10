#!/usr/bin/env python3
"""
gen_talk.py - draws every message of OVER 9 Talk, in Arabic, Kurdish (Badini) and English, into
apps/over9_talk/assets.js and the font kit/runtime/fonts/o9talk*.json (see glyphs.py). Change a message
below, then: python3 tools/gen_talk.py
Kurdish uses Noto Sans Arabic (it has the Kurdish letters), Arabic and English use Cairo.
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from glyphs import ROOT, bake, line, write_js  # noqa: E402

OUT = os.path.join(ROOT, 'apps', 'over9_talk', 'assets.js')
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


def main():
    items = {}
    for k, tr in MESSAGES.items():
        for i, lang in enumerate(LANGS):
            items[lang + '_' + k] = line(tr[i], 46, 800, max_w=MAX_W)
    for k, tr in LABELS.items():
        for i, lang in enumerate(LANGS):
            items[lang + '_l_' + k] = line(tr[i], 24, 700)
    glyphs = bake('o9talk', items)
    write_js(OUT, {'glyphs': glyphs}, 'tools/gen_talk.py')
    print('%s: %d KB, fonts %s' % (OUT, os.path.getsize(OUT) // 1024, sorted({g['font'] for g in glyphs.values()})))


if __name__ == '__main__':
    main()
