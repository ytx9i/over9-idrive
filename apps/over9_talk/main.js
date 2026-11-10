'use strict';
/**
 * OVER 9 Talk - the car gets a face and a mouth: it watches how it is driven and says so, in Arabic,
 * Kurdish (Badini) or English. Cold oil and high revs, speeding, a turn signal left on, standing still for
 * long, traffic, a hot engine, night falling, a smooth drive... each has its message and its face.
 *
 * Reads only: engine speed and temperatures, road speed, the turn signals, day / night. Writes nothing to
 * the car. The messages are a font of whole lines (tools/gen_talk.py), as the unit has no Arabic or
 * Kurdish font; change them there.
 */
const mgu = require('./kit/mgu');
const G = require('./kit/gauges');
const Car = require('./kit/car');
const A = require('./assets');

const W = 1600, H = 520;
const BG = [10, 10, 13, 255], BUBBLE = [30, 30, 37, 255];
const WHITE = [240, 240, 245, 255], DIM = [150, 150, 162, 255], ACCENT = [230, 30, 40, 255];
const SKIN = { happy: [255, 196, 40, 255], angry: [235, 70, 40, 255], cool: [90, 170, 255, 255] };
const INK = [25, 20, 10, 255];

// ---------------------------------------------------------------- text
// Each message is one glyph of a font made by tools/gen_talk.py (the renderer has no Arabic or Kurdish and
// shows no pixel images).
const GL = A.glyphs;
function put(cv, key, cx, cy, colour, scale) {
    const g = GL[key];
    if (!g) return;
    const k = scale || 1;
    cv.text(String.fromCodePoint(g.cp), Math.round(cx - g.w * k / 2), Math.round(cy - g.h * k / 2), g.size * k, colour, { font: g.font, literal: true });
}

// ---------------------------------------------------------------- what each message looks like
const MOOD = {
    morning: 'happy', day: 'happy', evening: 'happy', late: 'worried', cold_rev: 'angry', warm: 'happy',
    fast: 'shocked', very_fast: 'shocked', high_rpm: 'laugh', indicator: 'laugh', idle: 'sleepy', calm: 'proud',
    night: 'cool', hot: 'worried', traffic: 'sleepy', ok: 'neutral',
};
// seconds before the same message may come again
const COOLDOWN = { cold_rev: 60, fast: 90, very_fast: 60, high_rpm: 120, indicator: 120, idle: 300, calm: 900, hot: 120, traffic: 600, night: 3600, warm: 1e9 };
const HOLD = 7000;           // a message stays at least this long (ms)
const BACK_TO_OK = 25000;    // then "all good" again after this long

/** The face for a mood, centred on cx, cy, radius r. */
function face(cv, mood, cx, cy, r, now) {
    const skin = mood === 'angry' ? SKIN.angry : mood === 'cool' ? SKIN.cool : SKIN.happy;
    cv.circle(cx, cy, r + 8, [255, 255, 255, 22]);
    cv.circle(cx, cy, r, skin);
    const ex = r * 0.36, ey = cy - r * 0.18, er = r * 0.1;
    const blink = (now % 4200) < 140;                       // a blink every few seconds
    const eyes = (rad) => {
        if (blink) { cv.line(cx - ex - rad, ey, cx - ex + rad, ey, 6, INK); cv.line(cx + ex - rad, ey, cx + ex + rad, ey, 6, INK); return; }
        cv.circle(cx - ex, ey, rad, INK); cv.circle(cx + ex, ey, rad, INK);
    };
    const my = cy + r * 0.38;
    switch (mood) {
        case 'happy': case 'proud':
            eyes(er);
            cv.arc(cx, cy + r * 0.05, r * 0.5, r * 0.5 + 9, 115, 245, INK, { round: true });
            if (mood === 'proud') { cv.circle(cx - r * 0.62, cy + r * 0.22, r * 0.12, [255, 120, 90, 160]); cv.circle(cx + r * 0.62, cy + r * 0.22, r * 0.12, [255, 120, 90, 160]); }
            break;
        case 'laugh':
            cv.arc(cx - ex, ey + 10, er * 1.4, er * 1.4 + 7, 290, 430, INK, { round: true });
            cv.arc(cx + ex, ey + 10, er * 1.4, er * 1.4 + 7, 290, 430, INK, { round: true });
            cv.arc(cx, cy + r * 0.12, 0, r * 0.48, 90, 270, INK);
            cv.arc(cx, cy + r * 0.12 + r * 0.3, 0, r * 0.2, 90, 270, [230, 80, 80, 255]);
            break;
        case 'angry':
            eyes(er);
            cv.line(cx - ex - 26, ey - 40, cx - ex + 22, ey - 22, 9, INK);
            cv.line(cx + ex + 26, ey - 40, cx + ex - 22, ey - 22, 9, INK);
            cv.arc(cx, my + r * 0.32, r * 0.4, r * 0.4 + 9, 300, 420, INK, { round: true });
            break;
        case 'shocked':
            cv.circle(cx - ex, ey, er * 1.9, [255, 255, 255, 255]); cv.circle(cx + ex, ey, er * 1.9, [255, 255, 255, 255]);
            cv.circle(cx - ex, ey, er * 0.9, INK); cv.circle(cx + ex, ey, er * 0.9, INK);
            cv.circle(cx, my, r * 0.17, INK);
            break;
        case 'sleepy':
            cv.line(cx - ex - 22, ey + 4, cx - ex + 22, ey + 4, 7, INK); cv.line(cx + ex - 22, ey + 4, cx + ex + 22, ey + 4, 7, INK);
            cv.circle(cx, my, r * 0.09, INK);
            cv.text('z', cx + r * 0.9, cy - r * 0.7 - ((now / 40) % 20), 44, WHITE, { font: 'bold' });
            cv.text('z', cx + r * 1.15, cy - r * 1.0 - ((now / 40) % 20), 30, DIM, { font: 'bold' });
            break;
        case 'worried':
            eyes(er);
            cv.line(cx - ex - 24, ey - 24, cx - ex + 20, ey - 38, 8, INK);
            cv.line(cx + ex + 24, ey - 24, cx + ex - 20, ey - 38, 8, INK);
            cv.arc(cx, my + r * 0.3, r * 0.3, r * 0.3 + 8, 310, 410, INK, { round: true });
            cv.circle(cx + r * 0.72, cy - r * 0.45, r * 0.08, [120, 190, 255, 255]);
            break;
        case 'cool':
            cv.roundRect(cx - ex - 34, ey - 18, 68, 36, 12, INK); cv.roundRect(cx + ex - 34, ey - 18, 68, 36, 12, INK);
            cv.fillRect(cx - ex + 30, ey - 8, 2 * ex - 60, 8, INK);
            cv.arc(cx, cy + r * 0.05, r * 0.45, r * 0.45 + 8, 125, 215, INK, { round: true });
            break;
        default:
            eyes(er);
            cv.line(cx - r * 0.28, my, cx + r * 0.28, my, 8, INK);
    }
}

// ---------------------------------------------------------------- the turn signals and day / night
function find(v, key) {
    if (!v || typeof v !== 'object') return undefined;
    if (key in v) return v[key];
    for (const k of Object.keys(v)) { const r = find(v[k], key); if (r !== undefined) return r; }
    return undefined;
}
// 1 / 3 tap / steady left, 2 / 4 right (as numbers or the enum's names); 8 = hazards, not a turn
const indicatorOn = (c) => [1, 2, 3, 4].indexOf(c) >= 0 || (typeof c === 'string' && /BLINKEN_(LINKS|RECHTS)_EIN$/.test(c));

mgu.run({
    async start(ctx) {
        const { ui, settings, log } = ctx;
        const car = new Car(ctx, ['rpm', 'speed', 'temps']);

        let indicator = false, indicatorSince = 0, night = null;
        const onInd = (v) => {
            const c = find(v, 'controlIndicateDirection');
            if (c === undefined) return;
            const on = indicatorOn(c);
            if (on && !indicator) indicatorSince = Date.now();
            indicator = on;
        };
        ctx.signals.watch('de.bmw.body.Light', '1', { StatusFunctionsIndicators: onInd, StatusFunctionsIndicators2: onInd }, log)
            .then((s) => log.info('turn signals ' + (s.error ? 'error: ' + s.error : 'subscribed')));
        ctx.signals.watch('de.bmw.infotainment.vehicle.Vehicle', '1', {
            statusDayNightChangeOver: (v) => {
                const x = find(v, 'dayNightChangeOver');
                const n = x === 2 || x === 'NACHT' ? true : x === 1 || x === 'TAG' ? false : null;
                if (n !== null) night = n;
            },
        }, log).then((s) => log.info('day / night ' + (s.error ? 'error: ' + s.error : 'subscribed')));

        // ------------------------------------------------ what to say
        let msg = process.env.OVER9_TALK_SHOW || 'ok', msgAt = Date.now(), greeted = false, wasNight = null, warmSaid = false;
        let stoppedSince = 0, calmSince = 0, slowSince = 0;
        const lastSaid = Object.create(null);

        function say(key, force) {
            const now = Date.now();
            if (!force && now - msgAt < HOLD && msg !== 'ok') return false;
            if (lastSaid[key] && now - lastSaid[key] < (COOLDOWN[key] || 60) * 1000) return false;
            msg = key; msgAt = now; lastSaid[key] = now;
            log.info('says ' + key);
            return true;
        }

        function think() {
            const now = Date.now(), d = car.data();
            const rpm = G.isNum(d.rpm) ? d.rpm : null, kmh = G.isNum(d.speed) ? d.speed : null;
            const oil = G.isNum(d.oil) ? d.oil : G.isNum(d.coolant) ? d.coolant : null;
            const coolant = G.isNum(d.coolant) ? d.coolant : null;
            if (rpm === null && kmh === null) return;          // no car yet

            if (!greeted && !process.env.OVER9_TALK_SHOW) {
                greeted = true;
                const h = new Date().getHours();
                say(h >= 5 && h < 12 ? 'morning' : h < 17 ? 'day' : h < 22 ? 'evening' : 'late', true);
                return;
            }
            // most important first; each says something only when its cooldown has passed
            if (coolant !== null && coolant > 112 && say('hot', true)) return;
            if (oil !== null && oil < 60 && rpm !== null && rpm > 3500 && say('cold_rev', true)) return;
            if (kmh !== null && kmh > 180 && say('very_fast', true)) return;
            if (kmh !== null && kmh > 140 && say('fast')) return;
            if (oil !== null && rpm !== null && rpm > 5200 && oil >= 80 && say('high_rpm')) return;
            if (!warmSaid && oil !== null && oil >= 85 && kmh !== null && kmh > 5) { warmSaid = true; if (say('warm')) return; }
            if (indicator && kmh !== null && kmh > 20 && now - indicatorSince > 25000 && say('indicator')) return;
            if (night !== null && wasNight === false && night === true && say('night')) { wasNight = night; return; }
            if (night !== null) wasNight = night;

            // standing still with the engine running
            if (kmh !== null && kmh < 2 && rpm !== null && rpm > 400) { if (!stoppedSince) stoppedSince = now; } else stoppedSince = 0;
            if (stoppedSince && now - stoppedSince > 180000 && say('idle')) return;
            // creeping in traffic for five minutes
            if (kmh !== null && kmh > 0 && kmh < 20) { if (!slowSince) slowSince = now; } else if (kmh !== null && kmh >= 35) slowSince = 0;
            if (slowSince && now - slowSince > 300000 && say('traffic')) { slowSince = now; return; }
            // ten minutes of driving with nothing wild
            const wild = (kmh !== null && kmh > 130) || (rpm !== null && rpm > 4500);
            if (kmh !== null && kmh > 10 && !wild) { if (!calmSince) calmSince = now; } else if (wild) calmSince = 0;
            if (calmSince && now - calmSince > 600000 && say('calm')) { calmSince = now; return; }

            if (msg !== 'ok' && now - msgAt > BACK_TO_OK) { msg = 'ok'; msgAt = now; }
        }
        setInterval(() => { try { think(); } catch (e) { log.warn('think: ' + e.message); } }, 1000);

        // ------------------------------------------------ drawing
        function stats(cv, lang, d) {
            const items = [
                ['oil', G.isNum(d.oil) ? Math.round(d.oil) + '°' : '--'],
                ['coolant', G.isNum(d.coolant) ? Math.round(d.coolant) + '°' : '--'],
                ['speed', G.isNum(d.speed) ? String(Math.round(d.speed)) : '--'],
                ['rpm', G.isNum(d.rpm) ? String(Math.round(d.rpm / 50) * 50) : '--'],
            ];
            const x0 = 520, w = 1040 / items.length;
            items.forEach((it, i) => {
                const cx = x0 + w * i + w / 2;
                put(cv, lang + '_l_' + it[0], cx, 426, DIM);
                cv.text(it[1], cx, 486, 40, WHITE, { align: 'center', font: 'bold' });
            });
        }

        async function render() {
            const now = Date.now(), t = ctx.theme(), d = car.data();
            const lang = settings.get('lang') || 'ar';
            const cv = ctx.canvas(W, H).clear(BG);
            const mood = MOOD[msg] || 'neutral';
            const bob = Math.sin(now / 500) * 6 + (mood === 'shocked' ? Math.sin(now / 45) * 4 : 0);
            face(cv, mood, 250, 270 + bob, 150, now);

            // speech bubble with its tail towards the face
            const bx = 480, by = 70, bw = 1090, bh = 300;
            cv.roundRect(bx, by, bw, bh, 36, BUBBLE);
            cv.convex ? cv.convex([[bx + 4, by + 170], [bx - 46, by + 210], [bx + 4, by + 220]], BUBBLE) : null;
            const pop = Math.min(1, (now - msgAt) / 180);           // a new message pops in
            put(cv, lang + '_' + msg, bx + bw / 2, by + bh / 2, WHITE, 0.85 + 0.15 * pop);
            cv.fillRect(bx + 40, by + bh - 6, 120, 6, ACCENT);
            stats(cv, lang, d);
            G.frame(cv, t, ['OVER 9 TALK'], 0, [d.demo && { text: 'DEMO' }]);
            await ui.image('MAIN_GFX', cv);
        }

        settings.onChange(() => render().catch(() => {}));
        ctx.loop('MAIN', 20, render);
        render().then(() => log.info('first frame done')).catch((e) => log.warn('first render: ' + e));
    },
});
