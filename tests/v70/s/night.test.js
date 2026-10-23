// Version 7.0 Track S (rulings 930-959, 931): night never lowers the top bar, the labels or the markers below the readability bar. The top bar is the
// page, never the canvas, so the tint cannot reach it (measured at night in the real interface, 375 px at 150% text); the markers and labels are drawn
// after the light pass with a white ring and a pill of their own, so what matters is their edge against the night ground (measured on real pixels
// with the real marker drawing, over every colour the ground can be).
import { describe, it, expect } from '../../harness.js';
import { rigUI } from '../../helpers/uiWorld.js';
import { contrastIn } from '../../helpers/contrast.js';
import { makeCanvas, pixelAt } from '../../helpers/canvas.js';
import { addRaw } from '../../helpers/testWorld.js';
import { createWorld } from '../../../src/sim/world.js';
import { LIGHT, NIGHT } from '../../../src/data/seasons.js';
import { TERRAIN, UI } from '../../../src/render/art/palette.js';
import { drawLight, setLightClock, lightAt, tinted } from '../../../src/render/light.js';
import { drawMarkers } from '../../../src/render/markers.js';
import { makeDraw } from '../../../src/render/art/ctx.js';
import { DEFAULT_SETTINGS } from '../../../src/ui/settings.js';

const NIGHT_MS = (LIGHT.day + LIGHT.dusk + LIGHT.night / 2) * LIGHT.cycleMs;
const lum = (c) => { const f = (v) => { const s = v / 255; return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]); };
const ratio = (a, b) => { const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x); return (hi + 0.05) / (lo + 0.05); };
const rgbOf = (hex) => { const n = parseInt(hex.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
const GROUND = ['sand', 'grass', 'grassSoft', 'fertile', 'bank', 'bankSecond', 'water', 'waterDeep', 'shallows', 'road', 'clay', 'rocky', 'hills', 'plot', 'field', 'wadi', 'beltRock'];

describe('v70 s night: the top bar', () => {
  it('keeps every word of the top bar at 4.5:1 or better at night, unchanged from the day, on a phone at 375 px and 150% text', async () => {
    const r = await rigUI({ width: 375, height: 667 });
    try {
      r.ui.settings.set({ textSize: 150, motion: 'gentle' });
      r.world.speed = 0;
      r.ui.refresh();
      const bar = r.root.querySelector('#topbar');
      const words = () => [...bar.querySelectorAll('.stats .value, .stats .season, .stats .forecast')].filter((n) => n.textContent.trim());
      const read = () => words().map((n) => [n.className, getComputedStyle(n).color, getComputedStyle(n).opacity, contrastIn(n, bar)]);
      setLightClock(r.world, 0, 0);
      r.frame(0);
      const day = read(), dayPixel = pixelAt(r.canvas, 20, 300);
      expect(day.length).toBeGreaterThanOrEqual(4);
      setLightClock(r.world, NIGHT_MS, 0);
      r.frame(0);
      const night = read(), nightPixel = pixelAt(r.canvas, 20, 300);
      expect(lum(nightPixel) < lum(dayPixel) * 0.8).toBe(true);                         // the light really ran: the map is darker
      expect(night).toEqual(day);                                                       // and the page did not change at all
      for (const [name, , , c] of night) expect([name, c >= 4.5]).toEqual([name, true]);
    } finally { r.cleanup(); }
  });
});

describe('v70 s night: the map\'s marks and labels', () => {
  const night = lightAt(NIGHT_MS);
  it('keeps the white ring of a marker and the pill of a label at 3:1 or better against every colour the ground can be, at the deepest night', () => {
    expect(night.dark).toBe(1);
    for (const key of GROUND) {
      const ground = tinted(rgbOf(TERRAIN[key]), night);
      expect([key, 'ring', ratio(rgbOf(UI.halo), ground) >= NIGHT.minRing]).toEqual([key, 'ring', true]);
      expect([key, 'pill', ratio(rgbOf('#FFF8EA'), ground) >= NIGHT.minRing]).toEqual([key, 'pill', true]);
    }
  });
  it('never lowers a light mark\'s edge below the day\'s: where the ring is 1.4:1 on the sand by day it is better at night (the tint only helps what is drawn light on the ground)', () => {
    for (const key of GROUND) expect([key, ratio(rgbOf(UI.halo), tinted(rgbOf(TERRAIN[key]), night)) >= ratio(rgbOf(UI.halo), rgbOf(TERRAIN[key]))]).toEqual([key, true]);
  });
  it('holds on real pixels: a marker drawn over the night-tinted ground (the order createUI draws them in) has its ring at 3:1 against it, over each ground colour', () => {
    const w = createWorld({ seed: 11 });
    const home = addRaw(w, 'house', 10, 10, { tier: 1, residents: 4 });
    for (const key of ['sand', 'grass', 'fertile', 'road', 'waterDeep', 'rocky']) {
      const W = 220, H = 160, c = makeCanvas(W, H), ctx = c.getContext('2d');
      ctx.fillStyle = TERRAIN[key];
      ctx.fillRect(0, 0, W, H);
      setLightClock(w, NIGHT_MS, 0);
      w.speed = 0;
      const g = makeDraw(ctx, 2, 2);
      g.cull = null;
      drawLight(g, w, { x0: 0, y0: 0, x1: 1, y1: 1 }, { ctx, W, H, ox: 0, oy: 0, dpr: 1 }, 0, 'gentle', DEFAULT_SETTINGS);
      const ground = pixelAt(c, 200, 20).slice(0, 3);
      const m = { ids: [home.id], x: 110, y: 60, r: 11, foot: { x: 110, y: 95 }, glyph: '!', tone: 'problem', count: 1 };
      drawMarkers(g, w, [], { x0: 0, y0: 0, x1: 0, y1: 0 }, [m]);
      const ring = pixelAt(c, m.x + m.r + 1, m.y).slice(0, 3);                            // between the badge's fill and the ring's outer edge
      expect([key, ratio(ring, ground) >= NIGHT.minRing]).toEqual([key, true]);
      const fill = pixelAt(c, m.x + m.r - 3, m.y + 3).slice(0, 3);
      expect([key, 'the badge reads against its own ring', ratio(fill, ring) >= 3]).toEqual([key, 'the badge reads against its own ring', true]);
    }
  });
  it('keeps the night the tint\'s deepest and no darker: a mid-tone, not black (every channel of the multiplier stays above 100, a third of daylight)', () => {
    for (const v of NIGHT.rgb) expect(v).toBeGreaterThan(100);
    const sand = tinted(rgbOf(TERRAIN.sand), night);
    expect(lum(sand) / lum(rgbOf(TERRAIN.sand))).toBeGreaterThan(0.15);                 // the sand keeps more than a seventh of its daylight light
  });
});
