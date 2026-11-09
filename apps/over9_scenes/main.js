'use strict';
/**
 * OVER 9 Scenes - living pictures for the iDrive screen with a big clock: a night over the mountains (stars,
 * a moon, shooting stars), northern lights, and a neon road that runs as fast as the car does.
 * Tap the screen (or Next) for the next scene. Reads only the road speed.
 */
const mgu = require('./kit/mgu');
const G = require('./kit/gauges');
const Car = require('./kit/car');

const W = 1600, H = 520, TOP = 44;
const SCENES = ['night', 'aurora', 'road'];
const DAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

// a fixed sky: the same stars every time
let seed = 9;
const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
const STARS = Array.from({ length: 140 }, () => ({ x: rnd() * W, y: TOP + rnd() * 330, r: 0.8 + rnd() * 2.2, p: rnd() * 6.28, s: 0.5 + rnd() * 2 }));
const RIDGE = (k, amp, base, phase) => Array.from({ length: 41 }, (_, i) => {
    const x = i * W / 40;
    return [x, base - amp * (0.55 * Math.sin(x / (170 * k) + phase) + 0.3 * Math.sin(x / (63 * k) + phase * 2) + 0.15 * Math.sin(x / (29 * k)))];
});
const FAR = RIDGE(1.6, 46, 400, 1.3), NEAR = RIDGE(1, 60, 470, 4.1);

function night(cv, t) {
    cv.gradientRect(0, TOP, W, H - TOP, [[0, [6, 10, 30, 255]], [0.6, [22, 26, 70, 255]], [1, [70, 40, 90, 255]]]);
    for (const s of STARS) {
        const a = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t * s.s / 1000 + s.p));
        cv.circle(s.x, s.y, s.r, [255, 255, 255, Math.round(255 * a)]);
    }
    // the moon with its glow
    const mx = 1290, my = 140;
    for (let i = 5; i >= 1; i--) cv.circle(mx, my, 46 + i * 14, [200, 210, 255, 10]);
    cv.circle(mx, my, 46, [245, 242, 225, 255]);
    cv.circle(mx - 14, my - 10, 9, [225, 220, 200, 255]); cv.circle(mx + 12, my + 14, 6, [228, 224, 205, 255]);
    // a shooting star every 7 s
    const k = (t % 7000) / 900;
    if (k < 1) {
        const x0 = 300 + (Math.floor(t / 7000) % 5) * 180, y0 = 80, x = x0 + k * 420, y = y0 + k * 160;
        cv.line(x - 120, y - 46, x, y, 3, [255, 255, 255, Math.round(200 * (1 - k))]);
        cv.circle(x, y, 3, [255, 255, 255, 255]);
    }
    cv.fillUnder(FAR, H, [30, 22, 52, 255]);
    cv.fillUnder(NEAR, H, [12, 10, 24, 255]);
}

function aurora(cv, t) {
    cv.gradientRect(0, TOP, W, H - TOP, [[0, [2, 6, 18, 255]], [1, [6, 24, 40, 255]]]);
    for (const s of STARS) if (s.y < 260) cv.circle(s.x, s.y, s.r * 0.8, [255, 255, 255, 120]);
    const bands = [[[40, 255, 160], 0.0007, 0], [[60, 200, 255], 0.0005, 2], [[170, 90, 255], 0.0004, 4]];
    bands.forEach(([c, sp, ph], b) => {
        // a curtain: many thin strokes, bright at its foot and fading upwards
        for (let layer = 0; layer < 14; layer++) {
            const pts = Array.from({ length: 61 }, (_, i) => {
                const x = i * W / 60;
                return [x, 250 + b * 40 - layer * 9 + 45 * Math.sin(x / 260 + t * sp + ph) + 20 * Math.sin(x / 90 - t * sp * 1.7 + ph)];
            });
            cv.polyline(pts, 10, [c[0], c[1], c[2], Math.round(70 * (1 - layer / 14))]);
        }
    });
    cv.fillUnder(NEAR.map(([x, y]) => [x, y + 10]), H, [4, 8, 14, 255]);
}

let roadPos = 0, lastT = 0;
function road(cv, t, kmh) {
    const dt = lastT ? Math.min(100, t - lastT) : 16; lastT = t;
    roadPos = (roadPos + dt * (0.04 + (kmh || 0) * 0.004)) % 1;
    const hy = 300, cx = W / 2;
    cv.gradientRect(0, TOP, W, hy - TOP, [[0, [20, 4, 40, 255]], [1, [120, 20, 90, 255]]]);
    // the sun with its stripes
    const sr = 120;
    for (let i = 0; i < 12; i++) {
        const y = hy - sr * 2 + 12 + i * 20, h = i > 6 ? 20 - (i - 6) * 3 : 20;
        const half = Math.sqrt(Math.max(0, sr * sr - Math.pow(y + h / 2 - (hy - sr + 12), 2)));
        const c = [255, Math.round(220 - i * 14), Math.round(60 + i * 6), 255];
        if (half > 0) cv.fillRect(cx - half, y, half * 2, h, c);
    }
    cv.fillUnder(FAR.map(([x, y]) => [x, y - 110]), hy, [40, 10, 60, 255]);
    cv.fillRect(0, hy, W, H - hy, [12, 4, 24, 255]);
    // the grid running towards us
    for (let i = 0; i < 10; i++) {
        const z = (i + roadPos) / 10, y = hy + (H - hy) * z * z;
        cv.fillRect(0, y, W, 2, [255, 60, 200, Math.round(60 + 160 * z)]);
    }
    for (let i = -12; i <= 12; i++) cv.line(cx + i * 22, hy, cx + i * 170, H, 2, [255, 60, 200, 140]);
    // centre line
    for (let i = 0; i < 6; i++) {
        const z0 = ((i + roadPos) / 6), z1 = z0 + 0.06, y0 = hy + (H - hy) * z0 * z0, y1 = hy + (H - hy) * z1 * z1;
        cv.line(cx, y0, cx, Math.min(H, y1), 2 + z0 * 8, [255, 230, 120, 230]);
    }
}

function clock(cv, scene, kmh) {
    const d = new Date(), hh = String(d.getHours()).padStart(2, '0'), mm = String(d.getMinutes()).padStart(2, '0');
    const x = scene === 'aurora' ? W / 2 : 260, align = 'center';
    const y = scene === 'road' ? 150 : 200;
    cv.text(hh + ':' + mm, x, y, 110, [255, 255, 255, 235], { align, font: 'light' });
    cv.text(DAYS[d.getDay()] + '  ' + d.getDate() + ' ' + MONTHS[d.getMonth()], x, y + 46, 28, [255, 255, 255, 170], { align, font: 'bold', spacing: 3 });
    if (scene === 'road' && G.isNum(kmh)) cv.text(Math.round(kmh) + ' KM/H', x, y + 84, 24, [255, 230, 120, 220], { align, font: 'bold', spacing: 2 });
}

mgu.run({
    async start(ctx) {
        const { ui, settings, log } = ctx;
        const car = new Car(ctx, ['speed']);
        let i = Math.max(0, SCENES.indexOf(settings.get('scene')));
        let since = Date.now();
        const next = () => { i = (i + 1) % SCENES.length; since = Date.now(); };
        ui.onClick('BTN_NEXT', next);
        if (ctx.onTap) ctx.onTap(next);
        settings.onChange((k) => { if (k === 'scene') { i = Math.max(0, SCENES.indexOf(settings.get('scene'))); since = Date.now(); } });

        async function render() {
            const t = Date.now(), d = car.data(), th = ctx.theme();
            const every = Number(settings.get('rotate')) || 0;
            if (every && t - since > every * 60000) next();
            const scene = SCENES[i];
            const cv = ctx.canvas(W, H).clear([0, 0, 0, 255]);
            if (scene === 'night') night(cv, t); else if (scene === 'aurora') aurora(cv, t); else road(cv, t, d.speed);
            clock(cv, scene, d.speed);
            cv.text('OVER', W - 150, H - 22, 30, [255, 255, 255, 200], { align: 'right', font: 'bold', spacing: 2 });
            cv.text('9', W - 122, H - 22, 30, [230, 30, 40, 255], { align: 'right', font: 'bold' });
            G.frame(cv, th, ['OVER 9 SCENES'], 0, []);
            await ui.image('MAIN_GFX', cv);
        }
        ctx.loop('MAIN', 30, render);
        render().then(() => log.info('first frame done')).catch((e) => log.warn('first render: ' + e));
    },
});
