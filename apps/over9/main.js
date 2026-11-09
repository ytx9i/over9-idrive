'use strict';
/**
 * OVER 9 - the workshop's card on the iDrive screen: name, what we do, where, the phone number,
 * and QR codes a customer scans with their phone (WhatsApp, Instagram, TikTok).
 *
 * The head unit has no Arabic font, so all text is drawn beforehand (tools/gen_assets.py -> assets.js)
 * and shown here as pictures; this file only lays them out. Nothing is read from the car.
 */
const zlib = require('zlib');
const mgu = require('./kit/mgu');
const G = require('./kit/gauges');
const { setImage } = require('./kit/record');
const A = require('./assets');

const W = 1600, H = 520;
const C = A.colours;

// ---------------------------------------------------------------- pictures
let nextId = 9100;
const pics = Object.create(null);

function picture(key, p) {
    const rgb = zlib.inflateSync(Buffer.from(p.rgb, 'base64'));
    const n = p.w * p.h, px = new Uint8Array(n * 4);
    for (let i = 0, j = 0; i < n; i++, j += 3) {
        px[i * 4] = rgb[j]; px[i * 4 + 1] = rgb[j + 1]; px[i * 4 + 2] = rgb[j + 2]; px[i * 4 + 3] = 255;
    }
    const id = nextId++;
    setImage(id, p.w, p.h, px);
    pics[key] = { id, w: p.w, h: p.h };
}

function qrPicture(key, q, size) {
    const quiet = 3, mods = q.n + quiet * 2, scale = Math.max(1, Math.floor(size / mods)), s = mods * scale;
    const px = new Uint8Array(s * s * 4).fill(255);
    for (let y = 0; y < q.n; y++) {
        for (let x = 0; x < q.n; x++) {
            if (q.bits[y * q.n + x] !== '1') continue;
            for (let dy = 0; dy < scale; dy++) {
                let i = (((y + quiet) * scale + dy) * s + (x + quiet) * scale) * 4;
                for (let dx = 0; dx < scale; dx++, i += 4) { px[i] = 0; px[i + 1] = 0; px[i + 2] = 0; }
            }
        }
    }
    const id = nextId++;
    setImage(id, s, s, px);
    pics[key] = { id, w: s, h: s };
}

for (const k of Object.keys(A.text)) picture(k, A.text[k]);
for (const k of Object.keys(A.logo)) picture('logo_' + k, A.logo[k]);
const QR_SIZE = 236;
for (const k of Object.keys(A.qr)) qrPicture('qr_' + k, A.qr[k], QR_SIZE);

/** Draw picture `key` at x (left, right or centre per align) with its middle at cy. Returns its width. */
function put(cv, key, x, cy, align) {
    const p = pics[key];
    if (!p) return 0;
    const left = align === 'right' ? x - p.w : align === 'center' ? x - p.w / 2 : x;
    cv.image(p.id, Math.round(left), Math.round(cy - p.h / 2), p.w, p.h);
    return p.w;
}

// ---------------------------------------------------------------- layout
const TOP = 56, BOT = 500;
const L = { x: 24, w: 600 };                         // the card with the name
const R = { x: L.x + L.w + 24, w: 1576 - (L.x + L.w + 24) };
const QW = Math.floor((R.w - 48) / 3);               // one QR card

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
    const lg = pics['logo_' + (C.accents[accentName] ? accentName : 'red')];
    put(cv, 'logo_' + (C.accents[accentName] ? accentName : 'red'), lang === 'ar' ? x1 : x0 - 4, TOP + 22 + lg.h / 2, lang === 'ar' ? 'right' : 'left');

    let y = TOP + 22 + lg.h + 30;
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
    [['wa', 'en_wa', 'ar_wa', 'h_wa'], ['ig', 'en_ig', 'ar_ig', 'h_ig'], ['tt', 'en_tt', 'ar_tt', 'h_tt']].forEach((q, i) => {
        const cx0 = R.x + i * (QW + 24), mid = cx0 + QW / 2;
        card(cv, cx0, TOP, QW, BOT - TOP);
        cv.fillRect(cx0 + 18, TOP, QW - 36, 4, accent);
        const ly = TOP + 42;
        if (lang === 'both') { put(cv, q[1], cx0 + 14, ly, 'left'); put(cv, q[2], cx0 + QW - 14, ly, 'right'); }
        else put(cv, lang === 'ar' ? q[2] : q[1], mid, ly, 'center');
        const p = pics['qr_' + q[0]];
        cv.roundRect(mid - p.w / 2 - 6, TOP + 76, p.w + 12, p.h + 12, 10, [255, 255, 255, 255]);
        cv.image(p.id, Math.round(mid - p.w / 2), TOP + 82, p.w, p.h);
        const hy = TOP + 82 + p.h + 34;
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
