'use strict';
/**
 * OVER 9 Reaction - a drag-strip start tree on the iDrive screen: press to start, three ambers, then green
 * after a random wait; press as soon as it turns green. Pressing before green is a false start (red).
 * Shows the time in milliseconds, a rank, and the five best times (kept in the app's data folder).
 *
 * Pressing: tap anywhere on the screen, or press the iDrive knob on the button. Plays only while the car
 * stands still (kit/parked). Arabic text is a font of whole lines (tools/gen_reaction.py).
 */
const fs = require('fs');
const path = require('path');
const mgu = require('./kit/mgu');
const G = require('./kit/gauges');
const A = require('./assets');

const W = 1600, H = 520;
const BG = [10, 10, 13, 255];
const AMBER = [255, 176, 32, 255], GREEN = [40, 220, 90, 255], RED = [235, 45, 45, 255];
const OFF = [40, 40, 46, 255], HOUSING = [22, 22, 27, 255];
const WHITE = [240, 240, 245, 255], DIM = [150, 150, 162, 255];

// ---------------------------------------------------------------- text
// Each line is one glyph of a font made by tools/gen_reaction.py (the renderer has no Arabic and shows no
// pixel images); the colour is chosen here.
const GL = A.glyphs;
const COLOUR = { title: WHITE, ready: AMBER, go: GREEN, false: RED, best: WHITE, record: AMBER, parked: AMBER,
    r0: GREEN, r1: GREEN, r2: WHITE, r3: WHITE, r4: DIM, r5: RED };
function put(cv, key, x, cy, align) {
    const g = GL[key];
    if (!g) return;
    const left = align === 'right' ? x - g.w : align === 'center' ? x - g.w / 2 : x;
    cv.text(String.fromCodePoint(g.cp), Math.round(left), Math.round(cy - g.h / 2), g.size, COLOUR[key] || DIM, { font: g.font, literal: true });
}
function logo(cv, cx, cy) {
    const o = GL.logo_over, n = GL.logo_9, gap = 12, w = o.w + gap + n.w, x = cx - w / 2, y = cy - o.h / 2;
    cv.text(String.fromCodePoint(o.cp), x, y, o.size, WHITE, { font: o.font, literal: true });
    cv.text(String.fromCodePoint(n.cp), x + o.w + gap, y + o.h - n.h, n.size, [230, 30, 40, 255], { font: n.font, literal: true });
}

// ---------------------------------------------------------------- game
const RANKS = [180, 230, 280, 350, 450];           // ms: under each -> r0..r4, else r5
const rank = (ms) => { const i = RANKS.findIndex((v) => ms < v); return 'r' + (i < 0 ? 5 : i); };
const AMBER_STEP = 500;                            // ms between the ambers
const TIMEOUT = 3000;                              // no press after green -> back to the start

mgu.run({
    async start(ctx) {
        const { ui, log } = ctx;
        const parked = require('./kit/parked').watch(ctx, log);
        const file = path.join(ctx.dataDir || '.', 'best.json');
        let best = [];
        try { best = JSON.parse(fs.readFileSync(file, 'utf8')).filter((v) => typeof v === 'number').slice(0, 5); } catch (e) { best = []; }
        const save = () => { try { fs.writeFileSync(file, JSON.stringify(best)); } catch (e) { log.warn('save: ' + e.message); } };

        // state: idle | ready (ambers) | go (green) | result | false
        let state = 'idle', t0 = 0, greenAt = 0, greenShown = 0, last = null, record = false, lastPress = 0;

        function press() {
            const now = Date.now();
            if (now - lastPress < 150) return;      // one press can arrive twice (tap + button)
            lastPress = now;
            if (ctx.settings.get('parkedOnly') !== false && parked.moving()) return;
            if (state === 'ready') { state = 'false'; return; }
            if (state === 'go') {
                if (!greenShown) return;            // green not on screen yet
                last = now - greenShown;
                if (last < 100) { state = 'false'; return; }   // faster than a human can: guessed, not seen
                record = !best.length || last < best[0];
                best = best.concat(last).sort((a, b) => a - b).slice(0, 5);
                save();
                state = 'result';
                log.info('reaction ' + last + ' ms');
                return;
            }
            // idle, result, false: start again
            state = 'ready'; t0 = now; greenShown = 0; last = null; record = false;
            greenAt = t0 + AMBER_STEP * 3 + 600 + Math.random() * 2000;
        }

        ui.onClick('BTN_GO', press);
        if (ctx.onTap) ctx.onTap(() => press());

        function lights(cv, now) {
            const x = 60, y = 60, w = 300, h = 440, cx = x + w / 2;
            cv.roundRect(x, y, w, h, 24, HOUSING);
            const n = state === 'ready' ? Math.min(3, Math.floor((now - t0) / AMBER_STEP) + 1) : 0;
            const ambersOn = (i) => (state === 'ready' && i < n) || state === 'go' || state === 'result';
            for (let i = 0; i < 3; i++) {
                const cy = y + 62 + i * 80;
                cv.circle(cx - 62, cy, 32, ambersOn(i) ? AMBER : OFF);
                cv.circle(cx + 62, cy, 32, ambersOn(i) ? AMBER : OFF);
            }
            const g = state === 'go' || state === 'result';
            cv.circle(cx - 62, y + 302, 36, g ? GREEN : OFF);
            cv.circle(cx + 62, y + 302, 36, g ? GREEN : OFF);
            cv.circle(cx - 62, y + 386, 30, state === 'false' ? RED : OFF);
            cv.circle(cx + 62, y + 386, 30, state === 'false' ? RED : OFF);
        }

        function middle(cv, now) {
            const cx = 790;
            put(cv, 'title', cx, 84, 'center');
            if (ctx.settings.get('parkedOnly') !== false && parked.moving()) { put(cv, 'parked', cx, 280, 'center'); return; }
            if (state === 'idle') {
                cv.text('READY?', cx, 270, 64, WHITE, { align: 'center', font: 'bold' });
                put(cv, 'start', cx, 330, 'center');
            } else if (state === 'ready') {
                put(cv, 'ready', cx, 270, 'center');
            } else if (state === 'go') {
                put(cv, 'go', cx, 270, 'center');
            } else if (state === 'false') {
                put(cv, 'false', cx, 250, 'center');
                put(cv, 'again', cx, 320, 'center');
            } else if (state === 'result') {
                const s = String(last);
                const w = cv.text(s, cx - 30, 300, 150, record ? AMBER : WHITE, { align: 'center', font: 'num' });
                cv.text('ms', cx - 30 + w / 2 + 14, 300, 44, DIM, { font: 'bold' });
                put(cv, rank(last), cx, 370, 'center');
                if (record) put(cv, 'record', cx, 156, 'center');
                put(cv, 'again', cx, 430, 'center');
            }
            if (state !== 'ready' && state !== 'go') {
                G.button(cv, ctx.theme(), cx - 150, 456, 300, 50, state === 'idle' ? 'Start' : 'Again', press, { primary: true, key: 'go' });
            }
        }

        function side(cv) {
            const x = 1200, r = 1560;
            cv.roundRect(x - 24, 60, r - x + 48, 440, 18, HOUSING);
            logo(cv, (x + r) / 2, 104);
            put(cv, 'best', r, 168, 'right');
            if (!best.length) { put(cv, 'none', r, 220, 'right'); return; }
            best.forEach((ms, i) => {
                const y = 232 + i * 56;
                cv.text(String(i + 1), x, y, 32, i === 0 ? AMBER : DIM, { font: 'bold' });
                cv.text(ms + ' ms', r, y, 40, i === 0 ? AMBER : WHITE, { align: 'right', font: 'bold' });
            });
        }

        async function render() {
            const now = Date.now();
            if (state === 'ready' && now >= greenAt) state = 'go';
            if (state === 'go' && greenShown && now - greenShown > TIMEOUT) state = 'idle';
            const t = ctx.theme(), cv = ctx.canvas(W, H).clear(BG);
            lights(cv, now);
            middle(cv, now);
            side(cv);
            G.frame(cv, t, ['OVER 9 REACTION'], 0, []);
            const wasGo = state === 'go' && !greenShown;
            await ui.image('MAIN_GFX', cv);
            if (wasGo && state === 'go') greenShown = Date.now();     // timing starts when green is on screen
        }

        ctx.loop('MAIN', 30, render);
        render().then(() => log.info('first frame done')).catch((e) => log.warn('first render: ' + e));
    },
});
