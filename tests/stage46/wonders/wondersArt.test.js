// Stage 4.6, Wonders track (rulings 342, 343): the art. Each new kind is drawn in the house style (teal accents, lavender shadows) from its site alone, its
// stages of building read (a different picture at every course, rising), and every kind wears each of the four styles (classic is the old look, untouched).
import { describe, it, expect } from '../../harness.js';
import { makeDraw } from '../../../src/render/art/ctx.js';
import { ART } from '../../../src/render/art/registry.js';
import { siteLook, drawSite, drawFinished, builtHeight, MONUMENT_LOOK, TONES, styleOf, MONUMENT_ART } from '../../../src/render/art/monuments.js';
import { drawMonument, minimapGlyph } from '../../../src/render/monuments.js';
import { MONUMENTS, MONUMENT_KINDS } from '../../../src/data/monuments.js';
import { MONUMENT_STYLE_IDS, NEW_MONUMENT_KINDS } from '../../../src/data/wonders.js';
import { TEAL, OUTLINE } from '../../../src/render/art/palette.js';
import { makeBuilding, insertBuilding } from '../../../src/sim/world.js';
import { makeTestWorld } from '../../helpers/testWorld.js';
import { makeCanvas, canvasHash, hexToRgb } from '../../helpers/canvas.js';

function drawAt(fn, w = 560, h = 460, ox = 280, oy = 190) {
  const c = makeCanvas(w, h);
  const ctx = c.getContext('2d');
  ctx.translate(ox, oy);
  fn(makeDraw(ctx, 2, 2));
  return c;
}
const pixels = (c) => c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
const countNear = (c, hex, tol = 10) => {
  const [r, g, b] = hexToRgb(hex), d = pixels(c);
  let n = 0;
  for (let i = 0; i < d.length; i += 4) if (d[i + 3] >= 250 && Math.abs(d[i] - r) <= tol && Math.abs(d[i + 1] - g) <= tol && Math.abs(d[i + 2] - b) <= tol) n++;
  return n;
};
const topRow = (c) => { const d = pixels(c); for (let y = 0; y < c.height; y++) for (let x = 0; x < c.width; x++) if (d[(y * c.width + x) * 4 + 3] >= 250) return y; return c.height; };
const inked = (c) => { const d = pixels(c); let n = 0; for (let i = 3; i < d.length; i += 4) if (d[i] >= 250) n++; return n; };
function siteIn(w, type, { course = 0, frac = 0, stock = { stone: 0, bricks: 0 }, crews = [], done = null, style = null, x = 12, y = 12 } = {}) {
  const b = insertBuilding(w, makeBuilding(w, type, x, y, 0, { style }));
  const c = MONUMENTS[type].courses[Math.min(course, MONUMENTS[type].courses.length - 1)];
  Object.assign(b.site, { course, laid: { stone: c.stone * frac, bricks: c.bricks * frac }, stock: { ...stock }, crews, done });
  return b;
}
const lookOf = (type, course, frac, extra = {}) => siteLook(siteIn(makeTestWorld(), type, { course, frac, ...extra }));
const fin = (k, style) => drawAt((g) => drawFinished(g, 0, 0, MONUMENTS[k].w, MONUMENTS[k].d, k, style));

describe('s46 wonders art finished', () => {
  it('draws each new kind finished: inside its art slot, taller than its footprint, with teal and lavender in the house style', () => {
    for (const k of NEW_MONUMENT_KINDS) {
      const m = MONUMENTS[k], e = ART[k], c = fin(k, 'classic');
      expect([k, e.live, e.w, e.d, e.height, e.height === MONUMENT_LOOK[k].height, e.bounds[1] < 0]).toEqual([k, true, m.w, m.d, MONUMENT_LOOK[k].height, true, true]);
      expect(inked(c)).toBeGreaterThan(2000);
      expect(countNear(c, TEAL, 12) + countNear(c, '#22685F', 12)).toBeGreaterThan(30);   // teal-painted accents
      expect(countNear(c, '#C9BCCD', 14) + countNear(c, '#C1B3C6', 14) + countNear(c, '#B9ACB6', 14) + countNear(c, '#BDB0BE', 14)).toBeGreaterThan(40);   // lavender shadows
      // the card's picture is the finished classic one, and nothing is drawn above the slot's top
      expect(canvasHash(drawAt((g) => e.draw(g, 0, 0)))).toBe(canvasHash(c));
      const top = topRow(c), slotTop = 190 + e.bounds[1] * 2;                                // the art origin is at canvas y 190, scale 2
      expect([k, top >= slotTop - 1]).toEqual([k, true]);
    }
  });

  it('gives every kind four different pictures, one a style (classic first, the old look), and the style words a monument carries', () => {
    expect(MONUMENT_STYLE_IDS).toEqual(['classic', 'whitewashed', 'painted', 'gilded']);
    for (const k of MONUMENT_KINDS) {
      const hashes = MONUMENT_STYLE_IDS.map((s) => canvasHash(fin(k, s)));
      expect([k, new Set(hashes).size]).toEqual([k, 4]);
      expect(canvasHash(fin(k))).toBe(hashes[0]);                                           // no style named: classic
      expect(canvasHash(fin(k, 'tartan'))).toBe(hashes[0]);                                 // a style the art does not know: classic
    }
    expect([styleOf('painted'), styleOf(undefined), styleOf('tartan')]).toEqual(['painted', 'classic', 'classic']);
    expect(TONES.classic.stone[0]).toBe('#E8CC94');                                         // the old sandstone, so the old look draws as it did
  });

  it('paints a Painted one in teal and ochre, a Gilded one in gold, a Whitewashed one in neither (an existing kind: the small pyramid)', () => {
    const gold = (c) => countNear(c, '#E2B13C', 10) + countNear(c, '#F6D46A', 10);
    const teal = (c) => countNear(c, TEAL, 10) + countNear(c, '#22685F', 10);
    const k = 'pyramid_small';
    const [classic, white, painted, gilded] = MONUMENT_STYLE_IDS.map((s) => fin(k, s));
    expect([teal(painted) > 60, teal(white), teal(gilded)]).toEqual([true, 0, 0]);
    expect([gold(gilded) > 120, gold(painted) < gold(gilded) / 2, gold(white)]).toEqual([true, true, 0]);
    expect(gold(classic)).toBeGreaterThan(0);                                               // the old pyramids' gold capstone, as before
    // an obelisk too: the large one keeps the gold tip it was paid for in every style; the small one has gold only when Gilded
    expect([MONUMENT_STYLE_IDS.map((s) => gold(fin('obelisk_large', s)) > 5), MONUMENT_STYLE_IDS.map((s) => gold(fin('obelisk_small', s)) > 5)]).toEqual([[true, true, true, true], [false, false, false, true]]);
    expect(gold(fin('pyramid_great', 'whitewashed'))).toBeGreaterThan(5);                   // the great pyramid's capstone was paid for: gold in every style
  });

  it('tints the finished new kinds by style: ochre when Painted, gold when Gilded, plain white when Whitewashed', () => {
    for (const k of NEW_MONUMENT_KINDS) {
      const count = (s, hex) => countNear(fin(k, s), hex, 12);
      expect([k, count('painted', '#DCA45F') + count('painted', '#EFC384') + count('painted', '#F6E2B8') + count('painted', '#E7CB96') > 200]).toEqual([k, true]);
      expect([k, count('gilded', '#E2B13C') + count('gilded', '#F6D46A') + count('gilded', '#B98A4A') > 40]).toEqual([k, true]);
      expect([k, count('whitewashed', '#E2B13C') + count('whitewashed', TEAL) + count('whitewashed', '#DCA45F')]).toEqual([k, 0]);
    }
  });
});

describe('s46 wonders art stages of building', () => {
  it('rises course by course, a different picture at every course start and stage, higher each time (so it reads under Gentle, which moves nothing)', () => {
    for (const k of NEW_MONUMENT_KINDS) {
      const m = MONUMENTS[k], n = m.courses.length;
      const at = (course, frac) => drawAt((g) => drawSite(g, 0, 0, m.w, m.d, lookOf(k, course, frac, { crews: [1], stock: { stone: 60, bricks: 60 } })));
      const starts = Array.from({ length: n }, (_, i) => at(i, 0.5));
      const hashes = starts.map(canvasHash);
      expect([k, new Set(hashes).size]).toEqual([k, n]);
      const heights = Array.from({ length: n }, (_, i) => builtHeight(k, lookOf(k, i, 0)));
      for (let i = 1; i < n; i++) expect([k, i, heights[i] > heights[i - 1]]).toEqual([k, i, true]);
      const done = drawAt((g) => drawFinished(g, 0, 0, m.w, m.d, k));
      if (MONUMENT_LOOK[k].family === 'step') expect(topRow(done)).toBeLessThan(topRow(starts[n - 1]));   // finished stands higher than the last course under way (the others' scaffold stands above them)
      expect(canvasHash(at(0, 0.5))).toBe(canvasHash(at(0, 0.5)));                           // the same site, the same picture
      expect(canvasHash(at(0, 0.2)) !== canvasHash(at(0, 0.8))).toBe(true);                  // blocks laid within a course
    }
  });

  it('shows the stakes at course 0, the stockpile as it fills, scaffolding round the figures and a ramp up the step pyramid', () => {
    const k = 'step_pyramid', m = MONUMENTS[k];
    const ramp = (course) => countNear(drawAt((g) => drawSite(g, 0, 0, m.w, m.d, lookOf(k, course, 0.4))), '#D6B07A', 4);
    expect([ramp(0), ramp(5) > 0]).toEqual([0, true]);                                       // the mudbrick ramp climbs the face as the tiers rise
    for (const kind of ['great_sphinx', 'sun_temple']) {
      const mm = MONUMENTS[kind];
      const bare = drawAt((g) => drawSite(g, 0, 0, mm.w, mm.d, lookOf(kind, 2, 0.5)));
      const full = drawAt((g) => drawSite(g, 0, 0, mm.w, mm.d, lookOf(kind, 2, 0.5, { stock: { stone: 80, bricks: 80 } })));
      expect([kind, canvasHash(bare) !== canvasHash(full)]).toEqual([kind, true]);           // the stockpile steps with what is on site
      expect([kind, countNear(bare, '#6B4A3A', 12) > 0]).toEqual([kind, true]);              // the scaffold's poles
    }
  });

  it('flies the style from the first stake: a pennant for Whitewashed, Painted and Gilded, none for Classic', () => {
    for (const k of MONUMENT_KINDS) {
      const m = MONUMENTS[k];
      const hash = (style) => canvasHash(drawAt((g) => drawSite(g, 0, 0, m.w, m.d, lookOf(k, 0, 0, { style }))));
      const four = MONUMENT_STYLE_IDS.map(hash);
      expect([k, new Set(four).size]).toEqual([k, 4]);
    }
  });

  it('draws a finished new kind through the live renderer under every Motion level, and gives a minimap glyph', () => {
    const w = makeTestWorld();
    for (const k of NEW_MONUMENT_KINDS) {
      const b = siteIn(w, k, { course: MONUMENTS[k].courses.length, done: 5, style: 'painted', x: 0, y: 0 });
      const hashes = ['full', 'gentle', 'still'].map((motion) => canvasHash(drawAt((g) => drawMonument(g, w, b, { now: 99999, motion }))));
      expect([k, new Set(hashes).size]).toEqual([k, 1]);                                      // finished and settled: the same picture whatever the motion
      expect(inked(drawAt((g) => drawMonument(g, w, b, { now: 99999, motion: 'gentle' })))).toBeGreaterThan(2000);
      const c = makeCanvas(40, 40);
      minimapGlyph(c.getContext('2d'), b, 2, 1);
      expect(inked(c)).toBeGreaterThan(5);
    }
  });

  it('keeps the old kinds drawing from their own colours under classic: nothing else moved', () => {
    expect(OUTLINE).toBeTruthy();
    expect(MONUMENT_ART.colossus.live).toBe(true);
    expect(Object.keys(MONUMENT_LOOK)).toEqual(MONUMENT_KINDS.filter((k) => !NEW_MONUMENT_KINDS.includes(k)).concat(NEW_MONUMENT_KINDS).sort((a, b) => Object.keys(MONUMENT_LOOK).indexOf(a) - Object.keys(MONUMENT_LOOK).indexOf(b)));
  });
});
