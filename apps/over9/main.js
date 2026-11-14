'use strict';
/**
 * OVER 9 - the workshop's card on the iDrive screen: name, what we do, where, the phone number,
 * and QR codes a customer scans with their phone (WhatsApp, Instagram, TikTok, Snapchat).
 *
 * The head unit has no Arabic font, so all text is drawn beforehand into a font of whole lines
 * (tools/gen_assets.py); this file only lays it out. Nothing is read from the car.
 */
const mgu = require('./kit/mgu');
const G = require('./kit/gauges');
const A = require('./assets');

const W = 1600, H = 520;
const C = { bg: [10, 10, 13, 255], card: [22, 22, 27, 255], accents: { red: [230, 30, 40, 255], blue: [28, 105, 212, 255], gold: [212, 170, 60, 255] } };

// ---------------------------------------------------------------- text and QR codes
// Every line of text is one glyph of a font made by tools/gen_assets.py (the renderer has no Arabic and
// shows no pixel images), and the QR codes are drawn as rectangles, so all of it is drawn natively.
const GL = A.glyphs;
const WHITE = [240, 240, 245, 255], DIM = [150, 150, 162, 255];
const COLOUR = { phone: WHITE, en_job: WHITE, ar_job: WHITE, en_name: WHITE, ar_name: WHITE, en_wa: WHITE, ar_wa: WHITE, en_ig: WHITE, ar_ig: WHITE, en_tt: WHITE, ar_tt: WHITE, en_sc: WHITE, ar_sc: WHITE };

/** Draw text `key` at x (left, right or centre per align) with its middle at cy. Returns its width. */
function put(cv, key, x, cy, align, colour) {
    const g = GL[key];
    if (!g) return 0;
    const left = align === 'right' ? x - g.w : align === 'center' ? x - g.w / 2 : x;
    cv.text(String.fromCodePoint(g.cp), Math.round(left), Math.round(cy - g.h / 2), g.size, colour || COLOUR[key] || DIM, { font: g.font, literal: true });
    return g.w;
}

/** A QR code `size` px wide (whole modules, white quiet zone) centred on cx with its top at y. */
const QR_SIZE = 196;
function qrDraw(cv, q, cx, y) {
    const quiet = 3, mods = q.n + quiet * 2, m = Math.max(1, Math.floor(QR_SIZE / mods)), s = mods * m;
    const x0 = Math.round(cx - s / 2);
    cv.roundRect(x0 - 6, y - 6, s + 12, s + 12, 10, [255, 255, 255, 255]);
    for (let r = 0; r < q.n; r++) {
        let c = 0;
        while (c < q.n) {
            if (q.bits[r * q.n + c] !== '1') { c++; continue; }
            const c0 = c;
            while (c < q.n && q.bits[r * q.n + c] === '1') c++;
            cv.fillRect(x0 + (c0 + quiet) * m, y + (r + quiet) * m, (c - c0) * m, m, [0, 0, 0, 255]);
        }
    }
    return s;
}

// ---------------------------------------------------------------- layout
const TOP = 56, BOT = 500;
const L = { x: 24, w: 560 };                         // the card with the name
const R = { x: L.x + L.w + 24, w: 1576 - (L.x + L.w + 24) };
const QW = Math.floor((R.w - 72) / 4);               // one QR card

function card(cv, x, y, w, h, accent) {
    cv.roundRect(x, y, w, h, 14, C.card);
    if (accent) cv.roundRect(x, y + 18, 5, h - 36, 2, accent);
}

/** One row: English on the left, Arabic on the right (both), or just one of them. */
function row(cv, lang, en, ar, cy, x0, x1) {
    if (lang !== 'ar') put(cv, en, x0, cy, 'left');
    if (lang !== 'en') put(cv, ar, x1, cy, 'right');
}

function drawMain(cv, lang, accentName) {
    const accent = C.accents[accentName] || C.accents.red;
    const x0 = L.x + 36, x1 = L.x + L.w - 28;

    card(cv, L.x, TOP, L.w, BOT - TOP, accent);
    // logo: left in English and both, right in Arabic
    const o = GL.logo_over, n = GL.logo_9, gap = 34, lw = o.w + gap + n.w, lh = o.h;
    const lx = lang === 'ar' ? x1 - lw : x0 - 4, ly = TOP + 30;
    cv.text(String.fromCodePoint(o.cp), lx, ly, o.size, WHITE, { font: o.font, literal: true });
    cv.text(String.fromCodePoint(n.cp), lx + o.w + gap, ly + lh - n.h, n.size, accent, { font: n.font, literal: true });

    let y = ly + lh + 44;
    row(cv, lang, 'en_job', 'ar_job', y, x0, x1);
    y += 52;
    row(cv, lang, 'en_name', 'ar_name', y, x0, x1);
    y += 46;
    row(cv, lang, 'en_city', 'ar_city', y, x0, x1);
    y += 34;
    cv.fillRect(x0, y, x1 - x0, 2, [255, 255, 255, 20]);
    y += 34;
    row(cv, lang, 'en_call', 'ar_call', y, x0, x1);
    y += 50;
    put(cv, 'phone', lang === 'ar' ? x1 : x0, y, lang === 'ar' ? 'right' : 'left');

    // QR cards
    [['wa', 'en_wa', 'ar_wa', 'h_wa'], ['ig', 'en_ig', 'ar_ig', 'h_ig'], ['tt', 'en_tt', 'ar_tt', 'h_tt'], ['sc', 'en_sc', 'ar_sc', 'h_sc']].forEach((q, i) => {
        const cx0 = R.x + i * (QW + 24), mid = cx0 + QW / 2;
        card(cv, cx0, TOP, QW, BOT - TOP);
        cv.fillRect(cx0 + 18, TOP, QW - 36, 4, accent);
        // four cards are too narrow for both names on one line: English above Arabic
        const both = lang === 'both', qy = TOP + (both ? 96 : 82);
        if (both) { put(cv, q[1], mid, TOP + 34, 'center'); put(cv, q[2], mid, TOP + 66, 'center'); }
        else put(cv, lang === 'ar' ? q[2] : q[1], mid, TOP + 42, 'center');
        const qs = qrDraw(cv, A.qr[q[0]], mid, qy);
        const hy = qy + qs + 34;
        put(cv, q[3], mid, hy, 'center');
        if (lang === 'both') { put(cv, 'en_scan', mid, hy + 40, 'center'); put(cv, 'ar_scan', mid, hy + 70, 'center'); }
        else put(cv, lang === 'ar' ? 'ar_scan' : 'en_scan', mid, hy + 46, 'center');
    });
}

mgu.run({
    async start(ctx) {
        const { ui, settings, log } = ctx;

        async function render() {
            const t = ctx.theme(), cv = ctx.canvas(W, H).clear(C.bg);
            drawMain(cv, settings.get('lang') || 'both', settings.get('accent') || 'red');
            G.frame(cv, t, ['OVER 9'], 0, []);
            await ui.image('MAIN_GFX', cv);
        }

        settings.onChange(() => render().catch(() => {}));
        ctx.loop('MAIN', 1, render);
        render().then(() => log.info('first frame done')).catch((e) => log.warn('first render: ' + e));
    },
});
