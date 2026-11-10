'use strict';
/**
 * OVER 9 Relax - living pictures for the iDrive screen with a big clock: night over the mountains, northern
 * lights, a neon road, the sea under the moon, rain on the glass, snowy mountains, space (the stars rush past
 * as fast as the car goes) and a city at night.
 * Speed and engine speed at the bottom. Tap the screen (or Next) for the next scene. Reads only.
 */
const mgu = require('./kit/mgu');
const G = require('./kit/gauges');
const Car = require('./kit/car');

const W = 1600, H = 520, TOP = 44;
const SCENES = ['night', 'aurora', 'road', 'ocean', 'rain', 'snow', 'space', 'city'];
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


// ---------------------------------------------------------------- the new scenes
function ocean(cv, t) {
    const hy = 300;
    cv.gradientRect(0, TOP, W, hy - TOP, [[0, [8, 14, 40, 255]], [1, [40, 50, 100, 255]]]);
    for (const s of STARS) if (s.y < 250) cv.circle(s.x, s.y, s.r * 0.8, [255, 255, 255, Math.round(140 + 100 * Math.sin(t / 900 + s.p))]);
    const mx = 1100, my = 150;
    for (let i = 4; i >= 1; i--) cv.circle(mx, my, 40 + i * 14, [220, 230, 255, 12]);
    cv.circle(mx, my, 40, [250, 248, 232, 255]);
    cv.gradientRect(0, hy, W, H - hy, [[0, [14, 30, 70, 255]], [1, [4, 10, 28, 255]]]);
    // the moon's path on the water: short shimmering strokes
    for (let i = 0; i < 26; i++) {
        const y = hy + 6 + i * 8.5, k = i / 26, w = 30 + k * 120;
        const x = mx + Math.sin(t / 400 + i * 1.7) * (10 + k * 30);
        cv.fillRect(x - w / 2, y, w, 3, [255, 245, 210, Math.round(170 * (1 - k * 0.6))]);
    }
    // waves rolling in
    for (let w = 0; w < 7; w++) {
        const y0 = hy + 20 + w * 30, pts = Array.from({ length: 41 }, (_, i) => {
            const x = i * W / 40;
            return [x, y0 + 5 * Math.sin(x / (90 + w * 20) + t / (700 - w * 40) + w)];
        });
        cv.polyline(pts, 2, [120, 170, 255, 40 + w * 12]);
    }
}

const DROPS = Array.from({ length: 160 }, () => ({ x: rnd() * W, y: rnd() * H, l: 14 + rnd() * 26, v: 0.6 + rnd() * 0.8 }));
const BEADS = Array.from({ length: 70 }, () => ({ x: rnd() * W, y: TOP + rnd() * (H - TOP), r: 2 + rnd() * 6, p: rnd() * 6.28 }));
function rain(cv, t, kmh) {
    cv.gradientRect(0, TOP, W, H - TOP, [[0, [16, 22, 30, 255]], [1, [30, 40, 52, 255]]]);
    // city lights blurred behind the glass
    for (let i = 0; i < 24; i++) {
        const x = (i * 211) % W, y = 300 + ((i * 97) % 140), r = 20 + (i % 5) * 12;
        const c = i % 3 === 0 ? [255, 170, 60] : i % 3 === 1 ? [255, 80, 70] : [120, 180, 255];
        cv.circle(x, y, r, [c[0], c[1], c[2], 26]); cv.circle(x, y, r * 0.5, [c[0], c[1], c[2], 34]);
    }
    const slant = 0.25 + Math.min(1.5, (kmh || 0) / 80);        // faster car, more slanted rain
    for (const d of DROPS) {
        const y = (d.y + t * d.v) % (H - TOP) + TOP, x = (d.x - (y - TOP) * slant + W * 2) % W;
        cv.line(x, y, x + d.l * slant * 0.6, y + d.l, 1.5, [190, 210, 240, 110]);
    }
    for (const b of BEADS) {
        const y = b.y + ((t / 60 + b.p * 100) % 800 < 30 ? ((t / 60) % 30) : 0);
        cv.circle(b.x, Math.min(H - 4, y), b.r, [200, 220, 255, 45]);
        cv.circle(b.x - b.r * 0.3, Math.min(H - 4, y) - b.r * 0.3, b.r * 0.35, [255, 255, 255, 90]);
    }
}

const FLAKES = Array.from({ length: 150 }, () => ({ x: rnd() * W, y: rnd() * H, r: 1.2 + rnd() * 3.2, v: 0.02 + rnd() * 0.05, p: rnd() * 6.28 }));
function snow(cv, t) {
    cv.gradientRect(0, TOP, W, H - TOP, [[0, [40, 60, 100, 255]], [1, [150, 170, 200, 255]]]);
    const far = FAR.map(([x, y]) => [x, y - 90]), near = NEAR.map(([x, y]) => [x, y - 40]);
    cv.fillUnder(far, H, [200, 212, 230, 255]);
    cv.fillUnder(far.map(([x, y]) => [x, y + 26]), H, [150, 165, 190, 255]);
    cv.fillUnder(near, H, [235, 240, 250, 255]);
    // pine trees on the near slope
    for (let i = 0; i < 18; i++) {
        const x = 40 + i * 92 + (i % 3) * 17, base = NEAR[Math.min(40, Math.round(x / 40))][1] - 30, h = 60 + (i % 4) * 16;
        for (let k = 0; k < 3; k++) {
            const y = base - h + k * h * 0.28, w = h * (0.25 + k * 0.14);
            cv.quad([[x - 1, y], [x + 1, y], [x + w, y + h * 0.42], [x - w, y + h * 0.42]], [30, 60, 50, 255]);
        }
    }
    for (const f of FLAKES) {
        const y = (f.y + t * f.v) % (H - TOP) + TOP, x = (f.x + Math.sin(t / 1500 + f.p) * 30 + W) % W;
        cv.circle(x, y, f.r, [255, 255, 255, 220]);
    }
}

const WARP = Array.from({ length: 220 }, () => ({ a: rnd() * 6.283, d: rnd(), s: 0.4 + rnd() }));
let warpT = 0, warpLast = 0;
function space(cv, t, kmh) {
    const dt = warpLast ? Math.min(100, t - warpLast) : 16; warpLast = t;
    warpT += dt * (0.00004 + (kmh || 0) * 0.000008);           // the faster the car, the faster the stars
    cv.gradientRect(0, TOP, W, H - TOP, [[0, [4, 2, 14, 255]], [1, [12, 6, 30, 255]]]);
    // a nebula
    cv.circle(1150, 220, 220, [120, 40, 160, 22]); cv.circle(1250, 300, 160, [40, 90, 200, 22]); cv.circle(1080, 330, 120, [200, 60, 120, 18]);
    const cx = W / 2, cy = (H + TOP) / 2;
    for (const s of WARP) {
        const z = (s.d + warpT * s.s) % 1, r0 = 20 + z * z * 900, r1 = r0 + 4 + z * 60 * (0.3 + (kmh || 0) / 60);
        const x0 = cx + Math.cos(s.a) * r0, y0 = cy + Math.sin(s.a) * r0 * 0.6;
        const x1 = cx + Math.cos(s.a) * r1, y1 = cy + Math.sin(s.a) * r1 * 0.6;
        cv.line(x0, y0, x1, y1, 1 + z * 2.5, [220, 230, 255, Math.round(255 * Math.min(1, z * 2))]);
    }
    // a ringed planet
    cv.circle(330, 400, 70, [230, 150, 90, 255]);
    cv.fillRect(330 - 70, 392, 140, 10, [180, 100, 60, 120]);
    cv.arc(330, 400, 96, 104, 60, 120, [240, 210, 160, 200]); cv.arc(330, 400, 96, 104, 240, 300, [240, 210, 160, 200]);
}

const BUILD = (() => {
    const b = []; let x = 0, k = 0;
    while (x < W) { const w = 50 + ((k * 37) % 70), h = 90 + ((k * 53) % 200); b.push({ x, w, h, k }); x += w + 4; k++; }
    return b;
})();
function city(cv, t) {
    cv.gradientRect(0, TOP, W, H - TOP, [[0, [10, 6, 30, 255]], [0.7, [60, 20, 70, 255]], [1, [140, 50, 70, 255]]]);
    for (const s of STARS) if (s.y < 200) cv.circle(s.x, s.y, s.r * 0.7, [255, 255, 255, 130]);
    // far skyline, then the near one with lit windows
    for (const b of BUILD) cv.fillRect(b.x + 20, H - b.h * 1.25 - 20, b.w, b.h * 1.25 + 20, [30, 16, 48, 255]);
    for (const b of BUILD) {
        const top = H - b.h;
        cv.fillRect(b.x, top, b.w, b.h, [14, 10, 24, 255]);
        for (let wy = top + 12; wy < H - 10; wy += 18) {
            for (let wx = b.x + 8; wx < b.x + b.w - 10; wx += 14) {
                const on = ((wx * 7 + wy * 13 + b.k * 31) % 11) < 4;
                const flick = ((Math.floor(t / 3000) + wx + wy) % 97) === 0;      // now and then a light goes
                if (on && !flick) cv.fillRect(wx, wy, 7, 9, (wx + wy) % 3 ? [255, 210, 120, 220] : [150, 210, 255, 200]);
            }
        }
    }
    // a red light blinking on the tallest tower
    const tall = BUILD.reduce((a, b) => (b.h > a.h ? b : a));
    if ((t % 1600) < 700) cv.circle(tall.x + tall.w / 2, H - tall.h - 6, 5, [255, 40, 40, 255]);
}

/** Speed and engine speed in a glass panel at the bottom, with a bar that turns red near the redline. */
function gauges(cv, kmh, rpm, redline) {
    const x = 520, y = 388, w = 560, h = 112, mid = x + w / 2;
    cv.roundRect(x, y, w, h, 22, [0, 0, 0, 170]);
    cv.fillRect(mid, y + 18, 2, h - 36, [255, 255, 255, 40]);
    const sp = G.isNum(kmh) ? String(Math.round(kmh)) : '--';
    const rp = G.isNum(rpm) ? String(Math.round(rpm / 50) * 50) : '--';
    cv.text(sp, x + w / 4, y + 70, 64, [255, 255, 255, 240], { align: 'center', font: 'bold' });
    cv.text('KM/H', x + w / 4, y + 98, 18, [255, 255, 255, 150], { align: 'center', font: 'bold', spacing: 3 });
    const hot = G.isNum(rpm) && rpm >= redline * 0.85;
    cv.text(rp, mid + w / 4, y + 70, 64, hot ? [255, 70, 60, 255] : [255, 255, 255, 240], { align: 'center', font: 'bold' });
    cv.text('RPM', mid + w / 4, y + 98, 18, [255, 255, 255, 150], { align: 'center', font: 'bold', spacing: 3 });
    // engine speed bar along the panel's foot
    const f = G.isNum(rpm) ? Math.max(0, Math.min(1, rpm / (redline * 1.1))) : 0;
    cv.fillRect(x + 22, y + h - 8, w - 44, 4, [255, 255, 255, 30]);
    if (f > 0) cv.fillRect(x + 22, y + h - 8, (w - 44) * f, 4, hot ? [255, 60, 50, 255] : f > 0.6 ? [255, 190, 40, 255] : [80, 200, 255, 255]);
}

/**
 * The clock. The head unit's own clock runs in UTC, so the time is UTC + the Time zone setting (+3 for
 * Iraq) + the Adjust minutes setting; 24 or 12 hours.
 */
function clock(cv, scene, zone, adjust, h12) {
    const d = new Date(Date.now() + (zone * 60 + adjust) * 60000);
    let h = d.getUTCHours();
    const pm = h >= 12;
    if (h12) h = h % 12 || 12;
    const hh = h12 ? String(h) : String(h).padStart(2, '0'), mm = String(d.getUTCMinutes()).padStart(2, '0');
    const x = scene === 'aurora' || scene === 'space' ? W / 2 : 260, align = 'center';
    const y = scene === 'road' ? 150 : 200;
    const w = cv.text(hh + ':' + mm, x, y, 110, [255, 255, 255, 235], { align, font: 'light' });
    if (h12) cv.text(pm ? 'PM' : 'AM', x + w / 2 + 10, y - 58, 26, [255, 255, 255, 190], { font: 'bold', spacing: 2 });
    cv.text(DAYS[d.getUTCDay()] + '  ' + d.getUTCDate() + ' ' + MONTHS[d.getUTCMonth()], x, y + 46, 28, [255, 255, 255, 170], { align, font: 'bold', spacing: 3 });
}

mgu.run({
    async start(ctx) {
        const { ui, settings, log } = ctx;
        const car = new Car(ctx, ['speed', 'rpm']);
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
            const draw = { night, aurora, road, ocean, rain, snow, space, city }[scene] || night;
            draw(cv, t, d.speed);
            clock(cv, scene, Number(settings.get('zone')) || 0, Number(settings.get('adjust')) || 0, String(settings.get('format')) === '12');
            if (settings.get('gauges') !== false) gauges(cv, d.speed, d.rpm, Number(settings.get('redline')) || 6500);
            cv.roundRect(W - 244, H - 58, 152, 46, 14, [0, 0, 0, 120]);      // readable on the snow too
            cv.text('OVER', W - 150, H - 22, 30, [255, 255, 255, 200], { align: 'right', font: 'bold', spacing: 2 });
            cv.text('9', W - 122, H - 22, 30, [230, 30, 40, 255], { align: 'right', font: 'bold' });
            G.frame(cv, th, ['OVER 9 RELAX'], 0, []);
            await ui.image('MAIN_GFX', cv);
        }
        ctx.loop('MAIN', 30, render);
        render().then(() => log.info('first frame done')).catch((e) => log.warn('first render: ' + e));
    },
});
