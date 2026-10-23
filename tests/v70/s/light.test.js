// Version 7.0 Track S (rulings 930-959): day and night. The loop is about six minutes of real time, begins in daylight, has a short night, is
// the render layer's alone (never the sim or the save), holds while the game is paused and is daylight under Still or with Day and night off.
import { describe, it, expect } from '../../harness.js';
import { createWorld, allBuildings } from '../../../src/sim/world.js';
import { buildSampleCity } from '../../../src/dev/sampleCity.js';
import { LIGHT, LIGHT_PHASES, NIGHT, LAMP, SEASON_SALT } from '../../../src/data/seasons.js';
import { hash2 } from '../../../src/sim/rng.js';
import { lightAt, lightOn, lightClock, setLightClock, lightShown, drawLight, tintFor, tinted, streetLamps } from '../../../src/render/light.js';
import { makeDraw } from '../../../src/render/art/ctx.js';
import { createRenderer } from '../../../src/render/renderer.js';
import { createCamera } from '../../../src/render/camera.js';
import { p } from '../../../src/render/iso.js';
import { makeCanvas, pixelAt } from '../../helpers/canvas.js';
import { DEFAULT_SETTINGS } from '../../../src/ui/settings.js';

const CYCLE = LIGHT.cycleMs;
const at = (share) => share * CYCLE;
const lum = ([r, g, b]) => 0.2126 * r + 0.7152 * g + 0.0722 * b;

describe('v70 s light: the loop', () => {
  it('is a loop of six minutes whose shares sum to one: day, dusk, a short night, dawn', () => {
    expect(CYCLE).toBe(6 * 60 * 1000);
    expect(Math.round((LIGHT.day + LIGHT.dusk + LIGHT.night + LIGHT.dawn) * 1e6) / 1e6).toBe(1);
    expect(LIGHT.night).toBeLessThan(LIGHT.day / 2);                                   // night short: under a quarter of the cycle, under half the day
    expect(LIGHT.night * CYCLE).toBeLessThanOrEqual(90 * 1000);                        // at most a minute and a half of dark
    expect(LIGHT_PHASES).toEqual(['dawn', 'day', 'dusk', 'night']);
  });
  it('begins each cycle in full daylight and walks day, dusk, night, dawn in order, back to day', () => {
    const order = [];
    let last = null;
    for (let t = 0; t < CYCLE; t += 1000) {
      const l = lightAt(t);
      if (l.phase !== last) { order.push(l.phase); last = l.phase; }
    }
    expect(order).toEqual(['day', 'dusk', 'night', 'dawn']);
    expect(lightAt(0)).toEqual({ phase: 'day', dark: 0, warm: 0, lamps: 0 });
    expect(lightAt(CYCLE).phase).toBe('day');
    expect(lightAt(3 * CYCLE + 5000)).toEqual(lightAt(5000));                         // the same every cycle, whatever the clock has run to
    expect(lightAt(-1000)).toEqual(lightAt(CYCLE - 1000));
  });
  it('darkens smoothly: no step bigger than a few per cent a second, full dark through the night, lamps lit from deep dusk to early dawn', () => {
    let prev = lightAt(0), worst = 0;
    for (let t = 1000; t <= CYCLE; t += 1000) {
      const l = lightAt(t);
      worst = Math.max(worst, Math.abs(l.dark - prev.dark), Math.abs(l.lamps - prev.lamps));
      prev = l;
    }
    expect(worst).toBeLessThan(0.09);
    const night = lightAt(at(LIGHT.day + LIGHT.dusk + LIGHT.night / 2));
    expect([night.phase, night.dark, night.lamps]).toEqual(['night', 1, 1]);
    expect(lightAt(at(LIGHT.day + LIGHT.dusk * 0.05)).lamps).toBe(0);                  // dusk begun: the lamps wait for it to darken
    expect(lightAt(at(LIGHT.day + LIGHT.dusk * 0.95)).lamps).toBeGreaterThan(0.5);
    expect(lightAt(at(0.999)).dark).toBeLessThan(0.01);
    for (let t = 0; t < CYCLE; t += 1000) { const l = lightAt(t); expect([t, l.dark >= 0 && l.dark <= 1, l.lamps >= 0 && l.lamps <= 1, l.warm >= 0 && l.warm <= 1]).toEqual([t, true, true, true]); }
  });
  it('turns gold at dusk and dawn and blue at night: the tint is white by day, gold-touched at the edges, the deepest soft blue at night', () => {
    expect(tintFor(lightAt(0))).toEqual([255, 255, 255]);
    const noon = tintFor(lightAt(at(0.2))), deep = tintFor(lightAt(at(LIGHT.day + LIGHT.dusk + 1)));
    expect(noon).toEqual([255, 255, 255]);
    expect(deep).toEqual(NIGHT.rgb);
    expect(deep[2]).toBeGreaterThan(deep[0]);                                          // blue, not grey
    const dusk = tintFor(lightAt(at(LIGHT.day + LIGHT.dusk * 0.5)));
    expect(dusk[0]).toBeGreaterThan(dusk[2]);                                          // gold in the middle of dusk
  });
});

describe('v70 s light: the clock, the switch and Still', () => {
  const world = () => { const w = createWorld({ seed: 3 }); return w; };
  it('runs on the real frame clock only while the game runs, holds while it is paused, and never counts a long stall as more than a quarter second', () => {
    const w = world();
    expect(lightClock(w, 1000, true)).toBe(0);                                         // the first frame only notes the time
    expect(lightClock(w, 1100, true)).toBe(100);
    expect(lightClock(w, 1200, false)).toBe(100);                                      // paused: held
    expect(lightClock(w, 5200, false)).toBe(100);
    expect(lightClock(w, 5300, true)).toBe(200);                                       // running again: only the 100 ms since the paused frame
    expect(lightClock(w, 65300, true)).toBe(200 + LIGHT.maxStepMs);                    // a minute's stall counts a quarter second
    expect(lightClock(w, 65000, true)).toBe(200 + LIGHT.maxStepMs);                    // time never runs back
    expect(lightClock(w, 70000, true, false)).toBe(200 + LIGHT.maxStepMs);             // light off: noted, not counted
    expect(lightClock(w, 70100, true)).toBe(200 + LIGHT.maxStepMs + 100);              // and no jump when it comes back on
  });
  it('is daylight under Still and with Day and night off, and runs under Gentle and Full', () => {
    expect([lightOn('still', DEFAULT_SETTINGS), lightOn('gentle', DEFAULT_SETTINGS), lightOn('full', DEFAULT_SETTINGS)]).toEqual([false, true, true]);
    expect([lightOn('gentle', { ...DEFAULT_SETTINGS, dayNight: false }), lightOn('full', { ...DEFAULT_SETTINGS, dayNight: false })]).toEqual([false, false]);
    expect(lightOn('gentle', undefined)).toBe(true);
  });
  it('draws nothing by day, under Still and with the switch off, and tints the canvas at night exactly as the readability test measures it', () => {
    const w = world();
    const sand = [235, 214, 168];
    const frameOf = (c) => ({ ctx: c.getContext('2d'), W: c.width, H: c.height, ox: 0, oy: 0, dpr: 1 });
    const run = (motion, settings, ms) => {
      const c = makeCanvas(24, 24), ctx = c.getContext('2d');
      ctx.fillStyle = `rgb(${sand.join(',')})`;
      ctx.fillRect(0, 0, 24, 24);
      setLightClock(w, ms, 0);
      w.speed = 0;
      drawLight(makeDraw(ctx, 2, 2), w, { x0: 0, y0: 0, x1: 3, y1: 3 }, frameOf(c), 0, motion, settings);
      return pixelAt(c, 12, 12).slice(0, 3);
    };
    const night = at(LIGHT.day + LIGHT.dusk + LIGHT.night / 2);
    expect(run('gentle', DEFAULT_SETTINGS, at(0.2))).toEqual(sand);
    expect(run('still', DEFAULT_SETTINGS, night)).toEqual(sand);
    expect(run('gentle', { ...DEFAULT_SETTINGS, dayNight: false }, night)).toEqual(sand);
    const dark = run('gentle', DEFAULT_SETTINGS, night);
    const want = tinted(sand, lightAt(night));
    for (let i = 0; i < 3; i++) expect([i, Math.abs(dark[i] - want[i]) <= 1]).toEqual([i, true]);
    expect(lum(dark)).toBeLessThan(lum(sand) * 0.75);                                  // visibly night
    expect(lightShown().phase).toBe('night');
    run('gentle', DEFAULT_SETTINGS, at(0.2));
    expect(lightShown().phase).toBe('day');
  });
  it('holds the night while paused across frames (the draw does not move the loop when the game is paused)', () => {
    const w = world();
    setLightClock(w, at(LIGHT.day + LIGHT.dusk + 5000 / CYCLE), 0);
    w.speed = 0;
    const c = makeCanvas(8, 8);
    const g = makeDraw(c.getContext('2d'), 2, 2), frame = { ctx: c.getContext('2d'), W: 8, H: 8, ox: 0, oy: 0, dpr: 1 };
    for (let i = 1; i <= 5; i++) drawLight(g, w, { x0: 0, y0: 0, x1: 1, y1: 1 }, frame, i * 60000, 'gentle', DEFAULT_SETTINGS);
    expect(lightShown().phase).toBe('night');
    w.speed = 1;
    drawLight(g, w, { x0: 0, y0: 0, x1: 1, y1: 1 }, frame, 5 * 60000 + 100, 'gentle', DEFAULT_SETTINGS);
    expect(lightShown().phase).toBe('night');                                          // 100 ms of play: still night
  });
});

describe('v70 s light: the lamps', () => {
  const city = () => { const w = createWorld({ seed: 11 }); buildSampleCity(w); w.speed = 0; return w; };
  const night = at(LIGHT.day + LIGHT.dusk + LIGHT.night / 2);
  // A canvas the size of the sample city's view with the art origin placed so the lit home's door is on it, sand beneath.
  function shoot(w, css, clock, stride = 1) {
    const scale = css, W = 700, H = 500, c = makeCanvas(W, H), ctx = c.getContext('2d');
    ctx.fillStyle = '#EBD6A8';
    ctx.fillRect(0, 0, W, H);
    const home = allBuildings(w).find((b) => b.type === 'house' && b.tier >= 1 && b.id % stride === 0 && hash2(b.id, 3, (w.seed + SEASON_SALT.lamps) | 0) <= 0.9);   // a lit one: a share of homes keep their windows dark
    const q = p(home.x + home.w / 2, home.y + home.d / 2);
    const ox = W / 2 - q[0] * scale, oy = H / 2 - q[1] * scale;
    ctx.setTransform(1, 0, 0, 1, ox, oy);
    const g = makeDraw(ctx, scale, scale);
    g.cull = null;
    setLightClock(w, clock, 0);
    drawLight(g, w, { x0: 0, y0: 0, x1: w.size - 1, y1: w.size - 1 }, { ctx, W, H, ox, oy, dpr: 1 }, 0, 'gentle', DEFAULT_SETTINGS);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    return { c, door: [W / 2, H / 2 - LAMP.homeLift * scale], home };
  }
  it('lights the homes\' lamps at night: a warm pool brighter and warmer than the tinted ground round it', () => {
    const w = city();
    const { c, door } = shoot(w, 2, night);
    const lit = pixelAt(c, door[0], door[1]);
    const ground = tinted([235, 214, 168], lightAt(night));
    expect(lum(lit)).toBeGreaterThan(lum(ground) * 1.25);
    // Halfway out the pool is not yet white: it adds more red than blue (warm), where the centre can saturate to white.
    const rim = pixelAt(c, door[0] + 14, door[1]);
    expect(rim[0] - ground[0]).toBeGreaterThan(rim[2] - ground[2] + 15);
    const day = shoot(w, 2, at(0.2));
    expect(pixelAt(day.c, door[0], door[1]).slice(0, 3)).toEqual([235, 214, 168]);     // by day nothing is lit and nothing tinted
  });
  it('lights no lamps before dusk has darkened, and puts street lamps on road tiles only, one in every few', () => {
    const w = city();
    const { c, door } = shoot(w, 2, at(LIGHT.day + LIGHT.dusk * 0.1));
    const px = pixelAt(c, door[0], door[1]);
    expect(lum(px)).toBeLessThan(lum([235, 214, 168]) + 1);
    const lamps = streetLamps(w);
    expect(lamps.length).toBeGreaterThan(20);
    for (let i = 0; i < lamps.length; i += 2) {
      expect([lamps[i], lamps[i + 1], w.road[lamps[i + 1] * w.size + lamps[i]] ? 1 : 0, (lamps[i] + lamps[i + 1]) % LAMP.streetEvery]).toEqual([lamps[i], lamps[i + 1], 1, 0]);
    }
    expect(streetLamps(w)).toBe(lamps);                                                // found once a road version
    w.road[0] = 1; w.roadVersion += 1;
    expect(streetLamps(w) !== lamps).toBe(true);
  });
  it('shows each lamp as a single warm dot when zoomed far out, all in one fill', () => {
    const w = city();
    const { c, door } = shoot(w, 0.9, night, LAMP.farStride[1]);                                          // 0.9 CSS px an art px: below LAMP.farCss
    const dot = pixelAt(c, door[0], door[1]);
    expect(dot[0]).toBeGreaterThan(dot[2] + 20);
    expect(lum(dot)).toBeGreaterThan(lum(tinted([235, 214, 168], lightAt(night))));
  });
});

describe('v70 s light: where it sits in the frame', () => {
  it('draws after the sprites and the ground and before fire, the units\' marks, effects and the overlays, so nothing a player reads is dimmed', () => {
    const w = createWorld({ seed: 11 });
    buildSampleCity(w);
    const canvas = makeCanvas(400, 300);
    const renderer = createRenderer({ canvas, dpr: 1, maxBakesPerFrame: Infinity });
    const order = [];
    const cam = createCamera({ x: w.focus.x, y: w.focus.y, zoom: 1 });
    renderer.renderFrame(w, cam, {
      view: { width: 400, height: 300 }, now: 0,
      ambient: () => order.push('ambient'), scorch: () => order.push('scorch'), light: () => order.push('light'), fire: () => order.push('fire'), units: () => order.push('units'),
      effects: { draw: () => order.push('effects') }, drawOverlay: () => order.push('overlay'),
    });
    expect(order).toEqual(['ambient', 'scorch', 'light', 'fire', 'units', 'effects', 'overlay']);
  });
});
