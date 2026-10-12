import { describe, it, expect } from '../../harness.js';
import { makeDraw } from '../../../src/render/art/ctx.js';
import { ART, slotFor, boundsFor } from '../../../src/render/art/registry.js';
import {
  siteLook, blocksIn, BLOCK_UNITS, MONUMENT_LOOK, MONUMENT_ART, drawSite, drawFinished, builtHeight, stockStep, CORE, CASING,
} from '../../../src/render/art/monuments.js';
import {
  drawMonument, siteMemo, newestBlock, FADE_MS, SETTLE_PX, SHINE_MS, OUTLINE_MS, liesBehind, fadesBehind, monumentTop,
  minimapGlyph, isLiveMonument,
} from '../../../src/render/monuments.js';
import { collectObjects } from '../../../src/render/renderer.js';
import { p } from '../../../src/render/iso.js';
import { MONUMENTS, MONUMENT_KINDS, MONUMENT, MONUMENT_PLACING } from '../../../src/data/monuments.js';
import { BUILDINGS } from '../../../src/data/buildings.js';
import { DAYS_PER_MONTH, DAYS_PER_SECOND } from '../../../src/sim/time.js';
import { makeBuilding, insertBuilding } from '../../../src/sim/world.js';
import { makeTestWorld, addRaw } from '../../helpers/testWorld.js';
import { makeCanvas, canvasHash, hexToRgb } from '../../helpers/canvas.js';

// A monument drawn alone at scale 2 (zoom 1 on a 1x screen), its art origin at canvas (ox, oy).
function drawAt(fn, w = 520, h = 400, ox = 260, oy = 150) {
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
// A site of a kind at (x, y) in a test world, `course` courses done and `frac` of the next laid.
function siteIn(w, type, x, y, { course = 0, frac = 0, stock = { stone: 0, bricks: 0 }, crews = [], rot = 0, done = null } = {}) {
  const b = insertBuilding(w, makeBuilding(w, type, x, y, rot));
  const c = MONUMENTS[type].courses[Math.min(course, MONUMENTS[type].courses.length - 1)];
  Object.assign(b.site, { course, laid: { stone: c.stone * frac, bricks: c.bricks * frac }, stock: { ...stock }, crews, done });
  return b;
}
const lookOf = (type, course, frac, extra = {}) => {
  const w = makeTestWorld();
  return siteLook(siteIn(w, type, 12, 12, { course, frac, ...extra }));
};

describe('s4 art monument sites', () => {
  it('reads the scene from the site alone, and lays a block at least every 5 s at 1x with one full crew', () => {
    const w = makeTestWorld();
    const b = siteIn(w, 'pyramid_great', 10, 10, { course: 5, frac: 0.55, stock: { stone: 120, bricks: 40 }, crews: [7, 8] });
    const L = siteLook(b);
    expect([L.type, L.n, L.course, L.done, L.crews, L.stock]).toEqual(['pyramid_great', 12, 5, false, 2, { stone: 120, bricks: 40 }]);
    expect(Math.abs(L.frac - 0.55) < 1e-9).toBe(true);
    expect([L.blocks, L.laid]).toEqual([blocksIn('pyramid_great', 5), Math.floor(0.55 * blocksIn('pyramid_great', 5))]);
    b.site.done = 900; b.site.course = 12;
    expect([siteLook(b).done, siteLook(b).course]).toEqual([true, 12]);
    expect(siteLook({ type: 'colossus' }).done).toBe(true);                       // a card: finished
    const unitsPerSecond = (MONUMENT.unitsPerCrewMonth / DAYS_PER_MONTH) * DAYS_PER_SECOND;   // one full crew at 1x
    for (const k of MONUMENT_KINDS) {
      MONUMENTS[k].courses.forEach((c, i) => {
        const perBlock = (c.stone + c.bricks) / blocksIn(k, i);
        expect([k, i, perBlock <= BLOCK_UNITS, perBlock / unitsPerSecond <= 5]).toEqual([k, i, true, true]);
      });
    }
  });

  it('rises course by course, block by block, with the stockpile in four steps', () => {
    const at = (course, frac) => drawAt((g) => drawSite(g, 0, 0, 7, 7, lookOf('pyramid_great', course, frac)));
    const tops = [2, 5, 8, 11].map((c) => topRow(at(c, 0)));
    for (let i = 1; i < tops.length; i++) expect(tops[i]).toBeLessThan(tops[i - 1]);
    expect(canvasHash(at(5, 0.2))).toBe(canvasHash(at(5, 0.2)));                // the same site, the same picture
    expect(canvasHash(at(5, 0.2)) !== canvasHash(at(5, 0.6))).toBe(true);        // more blocks laid
    const room = MONUMENT.stockPerCrew * MONUMENTS.pyramid_great.crews;
    expect([0, 1, room / 3 - 1, room / 3, (2 * room) / 3, room].map((n) => stockStep(n, room))).toEqual([0, 1, 1, 2, 3, 3]);
    const ink = (stone) => {                                                      // the stone's three faces, on a site just founded
      const c = drawAt((g) => drawSite(g, 0, 0, 7, 7, lookOf('pyramid_great', 0, 0, { stock: { stone, bricks: 0 } })));
      return CORE.reduce((n, hex) => n + countNear(c, hex, 3), 0);
    };
    expect(ink(room)).toBeGreaterThan(ink(room / 2));
    expect(ink(room / 2)).toBeGreaterThan(ink(1));
    expect(ink(1)).toBeGreaterThan(ink(0));
  });

  it('stakes the footprint until the first course is laid, then a ramp climbs the face towards the viewer', () => {
    const cord = (L) => countNear(drawAt((g) => drawSite(g, 0, 0, 7, 7, L)), '#7A5E44', 30);
    const ramp = (L) => countNear(drawAt((g) => drawSite(g, 0, 0, 7, 7, L)), '#D6B07A', 4);
    expect(cord(lookOf('pyramid_great', 0, 0)) > 50 && cord(lookOf('pyramid_great', 1, 0)) === 0).toBe(true);
    expect([ramp(lookOf('pyramid_great', 0, 0.5)), ramp(lookOf('pyramid_great', 4, 0)) > 200]).toEqual([0, true]);
    const scratch = () => makeDraw(makeCanvas(10, 10).getContext('2d'), 1);
    const r = drawSite(scratch(), 10, 10, 7, 7, lookOf('pyramid_great', 4, 0));
    expect([r.xt > r.xf, r.z1 > 0, r.yo <= 17]).toEqual([true, true, true]);     // its foot to the left, inside the footprint
    expect(drawSite(scratch(), 0, 0, 1, 1, lookOf('obelisk_large', 2, 0))).toBe(null);   // scaffolding instead
    for (const k of ['mastaba_small', 'mastaba_large', 'pyramid_small']) {
      expect([k, ramp(lookOf(k, 2, 0)) > 0]).toEqual([k, true]);
      expect([k, builtHeight(k, lookOf(k, 2, 0)) > builtHeight(k, lookOf(k, 1, 0))]).toEqual([k, true]);
    }
  });

  it('draws a rotated mastaba on its own turned footprint', () => {
    const w = makeTestWorld();
    const a = siteIn(w, 'mastaba_large', 4, 4, { course: 2, frac: 0.5 }), b = siteIn(w, 'mastaba_large', 12, 4, { course: 2, frac: 0.5, rot: 1 });
    expect([a.w, a.d, b.w, b.d]).toEqual([4, 3, 3, 4]);
    const flat = drawAt((g) => drawSite(g, 0, 0, a.w, a.d, siteLook(a))), turned = drawAt((g) => drawSite(g, 0, 0, b.w, b.d, siteLook(b)));
    expect(canvasHash(flat) !== canvasHash(turned)).toBe(true);
    // the turned one's ink stays over its own 3x4 footprint: from 4 tiles left of the origin to 3 tiles right (16 art px a tile)
    const cols = (c) => { const d = pixels(c); let l = c.width, r = -1; for (let y = 0; y < c.height; y++) for (let x = 0; x < c.width; x++) if (d[(y * c.width + x) * 4 + 3] >= 250) { l = Math.min(l, x); r = Math.max(r, x); } return [l, r]; };
    const [l, r] = cols(turned);
    expect([l >= 260 - 4 * 32 - 2, r <= 260 + 3 * 32 + 2]).toEqual([true, true]);
  });
});

describe('s4 art finished monuments', () => {
  it('cases a pyramid in white with a gold capstone, gilds the large obelisk\'s tip only, paints the colossus, whitewashes a mastaba', () => {
    const fin = (k) => drawAt((g) => drawFinished(g, 0, 0, MONUMENTS[k].w, MONUMENTS[k].d, k));
    for (const k of ['pyramid_small', 'pyramid_great']) {
      const c = fin(k);
      expect([k, countNear(c, CASING[1], 8) > 500, countNear(c, '#E2B13C', 10) > 20]).toEqual([k, true, true]);
    }
    expect([countNear(fin('obelisk_large'), '#E2B13C', 10) > 5, countNear(fin('obelisk_small'), '#E2B13C', 10)]).toEqual([true, 0]);
    expect(countNear(fin('colossus'), '#2F6FA8', 10)).toBeGreaterThan(20);        // the headcloth's stripes
    expect(countNear(fin('mastaba_large'), '#EFE6D9', 8)).toBeGreaterThan(400);   // whitewash
    const fl = drawAt((g) => drawFinished(g, 0, 0, 7, 7, 'pyramid_great')), site = drawAt((g) => drawSite(g, 0, 0, 7, 7, lookOf('pyramid_great', 11, 0.99)));
    expect(topRow(fl)).toBeLessThan(topRow(site));                                // the casing rises to its apex past the last course
    expect(countNear(site, '#D6B07A', 4)).toBeGreaterThan(0);
    expect(countNear(fl, '#D6B07A', 4)).toBe(0);                                  // the ramp has gone
  });

  it('registers the seven as live slots with their footprints; the card draws the finished monument', () => {
    for (const k of MONUMENT_KINDS) {
      const e = ART[k], m = MONUMENTS[k];
      expect([k, e, e.live, e.w, e.d, e.height, e.bounds, e.shadows]).toEqual([k, MONUMENT_ART[k], true, m.w, m.d, MONUMENT_LOOK[k].height, boundsFor(m.w, m.d, MONUMENT_LOOK[k].height), []]);
      expect([k, isLiveMonument(k), BUILDINGS[k].monument]).toEqual([k, true, true]);
      expect(canvasHash(drawAt((g) => e.draw(g, 0, 0)))).toBe(canvasHash(drawAt((g) => drawFinished(g, 0, 0, m.w, m.d, k))));
    }
    expect([isLiveMonument('palace'), isLiveMonument('house')]).toEqual([false, false]);
    expect(slotFor({ type: 'colossus', site: {} })).toBe('colossus');
  });
});

describe('s4 art monuments in motion', () => {
  it('fades the newest block in over 400 ms settling 3 px under Full, in place over 200 ms under Gentle, at once under Still', () => {
    const m = { blockAt: 1000 };
    expect([newestBlock(m, 1000, 'full'), newestBlock(m, 1200, 'full'), newestBlock(m, 1400, 'full')]).toEqual([{ alpha: 0, drop: SETTLE_PX }, { alpha: 0.5, drop: SETTLE_PX / 4 }, null]);
    expect([newestBlock(m, 1100, 'gentle'), newestBlock(m, 1200, 'gentle'), newestBlock(m, 1000, 'still')]).toEqual([{ alpha: 0.5, drop: 0 }, null, null]);
    expect([FADE_MS.full, FADE_MS.gentle, FADE_MS.still]).toEqual([400, 200, undefined]);
  });

  it('remembers what it last drew of a site: nothing fades on first sight (a reload), a new block, course or finish does', () => {
    const w = makeTestWorld();
    const b = siteIn(w, 'colossus', 10, 10, { course: 2, frac: 0.3 });
    const m = siteMemo(w, b, siteLook(b), 5000);
    expect([m.blockAt, m.courseAt, m.doneAt]).toEqual([-Infinity, -Infinity, -Infinity]);
    b.site.laid.stone += 10;
    siteMemo(w, b, siteLook(b), 6000);
    expect([m.blockAt, m.courseAt]).toEqual([6000, -Infinity]);
    siteMemo(w, b, siteLook(b), 6100);
    expect(m.blockAt).toBe(6000);                                                 // nothing new: it keeps its time
    Object.assign(b.site, { course: 3, laid: { stone: 0, bricks: 0 } });
    siteMemo(w, b, siteLook(b), 7000);
    expect([m.courseAt, m.lastCourse]).toEqual([7000, 2]);
    Object.assign(b.site, { course: 6, done: 400 });
    siteMemo(w, b, siteLook(b), 8000);
    expect(m.doneAt).toBe(8000);
    const other = makeTestWorld(), twin = siteIn(other, 'colossus', 10, 10, { course: 6, done: 400 });
    expect(siteMemo(other, twin, siteLook(twin), 9000).doneAt).toBe(-Infinity);  // another world (a reload) starts afresh
  });

  it('shines once across the gold under Full, holds a still outline under Gentle and Still, and nothing after', () => {
    const shot = (motion, after) => {
      const w = makeTestWorld();
      const b = siteIn(w, 'pyramid_great', 0, 0, { course: 11, frac: 0.99 });
      drawAt((g) => drawMonument(g, w, b, { now: 0, motion }));
      Object.assign(b.site, { course: 12, done: 10, laid: { stone: 0, bricks: 0 } });
      drawAt((g) => drawMonument(g, w, b, { now: 100, motion }));                 // the draw sees it finish at 100
      return drawAt((g) => drawMonument(g, w, b, { now: 100 + after, motion }));
    };
    const plain = drawAt((g) => drawFinished(g, 0, 0, 7, 7, 'pyramid_great'));
    expect(canvasHash(shot('full', SHINE_MS / 2)) !== canvasHash(plain)).toBe(true);
    expect(countNear(shot('full', SHINE_MS / 2), '#E2B13C', 8)).toBeLessThan(countNear(plain, '#E2B13C', 8) + 40);   // no outline under Full
    expect(canvasHash(shot('full', SHINE_MS + 1))).toBe(canvasHash(plain));
    for (const motion of ['gentle', 'still']) {
      expect([motion, countNear(shot(motion, OUTLINE_MS / 2), '#E2B13C', 8) > countNear(plain, '#E2B13C', 8) + 40]).toEqual([motion, true]);
      expect([motion, canvasHash(shot(motion, OUTLINE_MS + 1)) === canvasHash(plain)]).toEqual([motion, true]);
    }
  });
});

describe('s4 art monuments in the city', () => {
  it('fades to 40% while the ghost or the selected building lies behind it, not in front or beside', () => {
    const w = makeTestWorld();
    const b = siteIn(w, 'pyramid_small', 12, 12, { course: 7, frac: 0.5 });
    const behind = { type: 'house', x: 11, y: 11, w: 1, d: 1 }, front = { type: 'house', x: 16, y: 16, w: 1, d: 1 }, far = { type: 'house', x: 2, y: 2, w: 1, d: 1 };
    expect([liesBehind(behind, b), liesBehind(front, b), liesBehind(far, b)]).toEqual([true, false, false]);
    const hut = addRaw(w, 'house', 13, 11, { tier: 1 });
    expect([fadesBehind(w, b, null, hut.id), fadesBehind(w, b, null, b.id), fadesBehind(w, b, front, null), fadesBehind(w, b, behind, null)]).toEqual([true, false, false, true]);
    // a pixel on the body (the front corner of its courses, 10 art px up): solid when nothing is behind, 40% when the ghost is
    const at = (ghost) => drawAt((g) => drawMonument(g, w, b, { ghost, motion: 'still' }), 520, 400, 260, -150);
    const alpha = (c) => c.getContext('2d').getImageData(260, 278, 1, 1).data[3];
    expect(alpha(at(null))).toBe(255);
    expect(Math.abs(alpha(at(behind)) - 255 * MONUMENT_PLACING.fadeBehind) <= 3).toBe(true);
  });

  it('sorts neighbours at all four corners and walkers on all four sides around a big footprint, the apron keeping them off its body', () => {
    const w = makeTestWorld();
    const b = siteIn(w, 'pyramid_small', 12, 12, { course: 7, frac: 0.5 });
    const back = addRaw(w, 'well', 11, 11), front = addRaw(w, 'well', 16, 16), left = addRaw(w, 'well', 11, 16), right = addRaw(w, 'well', 16, 11);
    const walkers = [[14, 11.5], [11.5, 14], [16.5, 14], [14, 16.5]].map(([x, y], i) => ({ id: i + 1, kind: 'citizen', x, y }));
    const objs = collectObjects(w, { x0: 0, y0: 0, x1: 31, y1: 31 }, walkers);
    const at = (id) => objs.findIndex((o) => o.id === id), me = at(b.id);
    expect([at(back.id) < me, at(front.id) > me]).toEqual([true, true]);
    expect([at(2e6 + 1) < me, at(2e6 + 2) < me, at(2e6 + 3) > me, at(2e6 + 4) > me]).toEqual([true, true, true, true]);   // -y, -x behind; +x, +y in front
    // the left and right corners sit beside the body, never over it: the left neighbour's tile ends left of the body's left
    // corner and the right one's begins right of the body's right corner (screen x, art px)
    const m = MONUMENT_LOOK.pyramid_small.margin, x0 = 12 + m, x1 = 16 - m, y0 = 12 + m, y1 = 16 - m;
    expect([p(12, 16)[0] < p(x0, y1)[0], p(16, 12)[0] > p(x1, y0)[0]]).toEqual([true, true]);
  });

  it('stands a marker\'s roof on what stands now, and marks each monument on the minimap', () => {
    const w = makeTestWorld();
    const b = siteIn(w, 'pyramid_great', 10, 10, { course: 2 });
    const low = monumentTop(b)[1];
    b.site.course = 9;
    expect(monumentTop(b)[1]).toBeLessThan(low);
    const glyph = (bb) => { const c = makeCanvas(64, 64); minimapGlyph(c.getContext('2d'), bb, 2, 1); return c; };
    const site = glyph(b);
    Object.assign(b.site, { course: 12, done: 5 });
    const done = glyph(b);
    const ob = siteIn(w, 'obelisk_small', 3, 3, { course: 3, done: 1 });
    expect([countNear(site, CORE[1], 8) > 30, countNear(done, CASING[0], 8) > 30, countNear(done, '#F6D46A', 8) > 0, countNear(glyph(ob), CASING[0], 8) > 0]).toEqual([true, true, true, true]);
    const none = makeCanvas(64, 64);
    minimapGlyph(none.getContext('2d'), addRaw(w, 'well', 20, 20), 2, 1);
    expect(countNear(none, CORE[1], 60)).toBe(0);
  });

  it('draws three sites within 1 ms a frame (spec 5.7)', () => {
    const w = makeTestWorld({ size: 64 });
    const sites = [
      siteIn(w, 'pyramid_great', 4, 4, { course: 8, frac: 0.5, stock: { stone: 150, bricks: 60 }, crews: [1, 2, 3, 4] }),
      siteIn(w, 'mastaba_large', 20, 4, { course: 2, frac: 0.5, stock: { stone: 0, bricks: 120 }, crews: [5, 6, 7] }),
      siteIn(w, 'colossus', 30, 4, { course: 3, frac: 0.4, stock: { stone: 60, bricks: 0 }, crews: [8, 9] }),
    ];
    const c = makeCanvas(1280, 800), ctx = c.getContext('2d'), g = makeDraw(ctx, 2, 2);
    const frame = (i) => {
      for (const b of sites) {
        const [cx, cy] = [(b.x + b.w / 2 - (b.y + b.d / 2)) * 16, (b.x + b.w / 2 + b.y + b.d / 2) * 8];
        ctx.setTransform(1, 0, 0, 1, 640 - cx * 2, 450 - cy * 2);
        drawMonument(g, w, b, { now: i * 16, timeDays: 100 + i * 0.024, motion: 'full' });
      }
      ctx.setTransform(1, 0, 0, 1, 0, 0);
    };
    for (let i = 0; i < 5; i++) frame(i);
    const runs = [];                                                              // the timer is coarse: time 20 frames at a go
    for (let r = 0; r < 5; r++) { const t0 = performance.now(); for (let i = 0; i < 20; i++) frame(5 + r * 20 + i); runs.push((performance.now() - t0) / 20); }
    runs.sort((a, b) => a - b);
    expect(runs[2]).toBeLessThan(1);
  });
});
