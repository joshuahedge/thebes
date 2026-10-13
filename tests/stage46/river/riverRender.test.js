// The River track's render tests (rulings 334-335, 362, 367): the flood's water reads under Gentle and stands still, wildlife is capped at 40, moves
// under Full, slowly under Gentle and not at all under Still, hunters and boats work where the lodges and wharves stand, and every figure has art.
import { describe, it, expect } from '../../harness.js';
import { WILDLIFE, FLOOD_LEVELS } from '../../../src/data/river.js';
import { drawFlood, floodDistances, coverageOf } from '../../../src/render/flood.js';
import { animalsAt, herdAnimals, ambientSpots, huntersOf, boatOf, WILDLIFE_ID_BASE } from '../../../src/render/wildlife.js';
import { RIVER_ART, riverSlot, wharfSide, nilometer, huntingLodge, fishingWharf, gazelle, ostrich, ibis, heron, hippo, croc } from '../../../src/render/art/river.js';
import { ART, slotFor } from '../../../src/render/art/registry.js';
import { makeDraw } from '../../../src/render/art/ctx.js';
import { collectObjects } from '../../../src/render/renderer.js';
import { drawThumb } from '../../../src/ui/thumbs.js';
import { s46Ground, s46Walkers } from '../../../src/render/s46.js';
import { crocSpots } from '../../../src/sim/wildlife.js';
import { seasonDays } from '../../../src/sim/flood.js';
import { idx } from '../../../src/sim/grid.js';
import { makeCanvas, canvasHash } from '../../helpers/canvas.js';
import { T } from '../../../src/sim/terrain.js';
import { riverWorld, addRaw, dayOf, MONTH } from './riverHelpers.js';

const ALL = { x0: 0, y0: 0, x1: 55, y1: 55 };
const herd = (w, o = {}) => {
  const h = { id: w.wildlife.nextId++, kind: 'gazelle', x: 34, y: 24, size: 6, max: 6, regrow: null, hx: 34, hy: 24, px: 34, py: 24, moved: 0, hunted: 0, dir: 1, ...o };
  w.wildlife.herds.push(h);
  return h;
};
// A fake drawing helper that records what is drawn.
function recorder() {
  const log = [];
  const g = new Proxy({}, { get: (_, name) => (...args) => { log.push([name, JSON.stringify(args)]); } });
  return { g, log };
}
const floodWorld = (level = 'good', phase = 'high') => {
  const w = riverWorld();
  const s = seasonDays(2);
  w.flood = { year: 2, level, forecast: level, from: s.from, to: s.to, applied: level, risen: true };
  w.day = { rising: s.from + MONTH / 2, high: s.from + 45, draining: s.to + 1 + MONTH / 2 }[phase];
  return w;
};
// A building drawn at the origin on a canvas with room all round it (a 2x2 reaches 100 px below it at this scale).
const paint = (draw) => { const c = makeCanvas(300, 300), ctx = c.getContext('2d'); ctx.translate(150, 150); draw(makeDraw(ctx, 3)); return { c, ctx }; };
const hash = (draw) => canvasHash(paint(draw).c);
const inked = (draw) => {
  const d = paint(draw).ctx.getImageData(0, 0, 300, 300).data;
  let n = 0;
  for (let i = 3; i < d.length; i += 4) if (d[i] > 100) n++;
  return n;
};

describe('s46 river render: the flood\'s water (ruling 334, 362)', () => {
  it('draws nothing when the water is not up, and from the rise until it has drained', () => {
    const dry = riverWorld();
    const a = recorder();
    drawFlood(a.g, dry, ALL, 0, 'full');
    expect(a.log.length).toBe(0);
    const w = floodWorld('good', 'high');
    const b = recorder();
    drawFlood(b.g, w, ALL, 0, 'full');
    expect(b.log.length).toBeGreaterThan(2);
    const s = seasonDays(2);
    const after = floodWorld('good', 'draining');
    after.day = s.to + 1 + MONTH;                                                           // month 10 is over
    const c = recorder();
    drawFlood(c.g, after, ALL, 0, 'full');
    expect(c.log.length).toBe(0);
  });
  it('spreads over the floodplain by the level: Low one tile from the river, Fair two, Good and High all three', () => {
    const tilesOf = (level) => {
      const w = floodWorld(level);
      const r = recorder();
      drawFlood(r.g, w, ALL, 0, 'gentle');
      const polys = r.log.filter(([n]) => n === 'polys').map(([, a]) => JSON.parse(a)[0].length);
      return polys;
    };
    const dist = floodDistances(floodWorld());
    const w = floodWorld();
    const byDist = [0, 0, 0, 0];
    for (let i = 0; i < w.size * w.size; i++) if (w.floodplain[i] === 1 && !w.occ[i] && !w.road[i]) byDist[dist[i]] += 1;
    expect(byDist[1]).toBeGreaterThan(0);
    expect(byDist[3]).toBeGreaterThan(0);
    const counts = Object.fromEntries(FLOOD_LEVELS.map((l) => [l.id, tilesOf(l.id).slice(0, 3)]));
    // The groups are the tiles at distance 1, 2, 3 (a group is drawn only when it has a tile under water).
    expect(counts.low.length).toBe(1);
    expect(counts.fair.length).toBe(2);
    expect(counts.good.length).toBe(3);
    expect(counts.high.length).toBe(3);
    expect(counts.low[0]).toBe(byDist[1]);
    expect(counts.good).toEqual([byDist[1], byDist[2], byDist[3]]);
    expect([coverageOf(1, 0.5, 3), coverageOf(2, 0.5, 3), coverageOf(2, 1, 1)]).toEqual([1, 0.5, 0]);   // the water spreads outward from the river as it rises
  });
  it('leaves a tile with a building or a road dry, and rises tile by tile from the river in the first month', () => {
    const w = floodWorld('good', 'high');
    const open = (x, y) => w.floodplain[idx(w.size, x, y)] === 1;
    addRaw(w, 'farm_grain', 22, 20);
    const r = recorder();
    drawFlood(r.g, w, { x0: 22, y0: 20, x1: 23, y1: 21 }, 0, 'gentle');
    expect(r.log.filter(([n]) => n === 'polys').length).toBe(0);                            // all four tiles carry the farm
    expect(open(22, 20)).toBe(true);
    const early = floodWorld('good', 'rising');
    const e = recorder();
    drawFlood(e.g, early, ALL, 0, 'gentle');
    const eTiles = e.log.filter(([n]) => n === 'polys').reduce((s, [, a]) => s + JSON.parse(a)[0].length, 0);
    const full = recorder();
    drawFlood(full.g, floodWorld('good', 'high'), ALL, 0, 'gentle');
    const fTiles = full.log.filter(([n]) => n === 'polys').reduce((s, [, a]) => s + JSON.parse(a)[0].length, 0);
    expect(eTiles).toBeGreaterThan(0);
    expect(eTiles).toBeLessThan(fTiles + 1);
  });
  it('reads under Gentle as a still sheen: the same marks at any time; under Full the shimmer changes; under Still it does not move either', () => {
    const w = floodWorld();
    const at = (motion, now) => { const r = recorder(); drawFlood(r.g, w, ALL, now, motion); return JSON.stringify(r.log); };
    expect(at('gentle', 0)).toBe(at('gentle', 7000));
    expect(at('still', 0)).toBe(at('still', 7000));
    expect(at('full', 0) === at('full', 7000)).toBe(false);
    expect(at('gentle', 0).length).toBeGreaterThan(200);                                    // and it is drawn (blue water), not empty
    expect(at('gentle', 0)).toBe(at('still', 0));                                           // the picture is the same under both
    expect(at('gentle', 0)).toContain('#3DA5A8');                                           // the Good level's water colour
  });
  it('is drawn through the Stage 4.6 ground hook with a real drawing helper', () => {
    const w = floodWorld();
    const c = makeCanvas(300, 300), ctx = c.getContext('2d');
    ctx.translate(150, 100);
    const g = makeDraw(ctx, 1);
    s46Ground(g, w, ALL, 0, 'full');
    expect(ctx.getImageData(0, 0, 300, 300).data.some((v, i) => i % 4 === 3 && v > 0)).toBe(true);
  });
});

describe('s46 river render: the animals (ruling 335, 367)', () => {
  it('draws none before the Town, and each herd\'s animals at its size', () => {
    const v = riverWorld({ milestone: 'village' });
    herd(v);
    expect(animalsAt(v, 0, ALL, 'full')).toEqual([]);
    const w = riverWorld();
    const h = herd(w, { size: 5 });
    const out = animalsAt(w, 0, ALL, 'full').filter((a) => a.id >= WILDLIFE_ID_BASE + h.id * 16 && a.id < WILDLIFE_ID_BASE + h.id * 16 + 16);
    expect(out.length).toBe(5);
    expect(out.every((a) => /^gazelle(_l)?$/.test(a.kind))).toBe(true);
  });
  it('never draws more than 40 animals at once, the herds\' first, and gives each figure its own id', () => {
    const w = riverWorld({ size: 80 });
    for (let i = 0; i < 12; i++) herd(w, { x: 30 + (i % 6) * 8, y: 20 + Math.floor(i / 6) * 8, size: 8, px: 30 + (i % 6) * 8, py: 20 + Math.floor(i / 6) * 8, hx: 30, hy: 20 });
    w.wildlife.herds.forEach((h, i) => { h.hx = h.x; h.hy = h.y; h.px = h.x; h.py = h.y; });
    const all = { x0: 0, y0: 0, x1: 79, y1: 79 };
    const out = animalsAt(w, 5, all, 'full');
    const animals = out.filter((a) => !/hunter|boat/.test(a.kind));
    expect(animals.length).toBe(WILDLIFE.ambientCap);
    expect(new Set(out.map((a) => a.id)).size).toBe(out.length);
    expect(out.every((a) => a.id >= WILDLIFE_ID_BASE && a.id < WILDLIFE_ID_BASE + 100000)).toBe(true);
    expect(animals.filter((a) => /gazelle|ostrich/.test(a.kind)).length).toBe(WILDLIFE.ambientCap);   // 96 herd animals fill it: the ambient life gives way
    const few = riverWorld();
    herd(few, { size: 4 });
    const ambient = animalsAt(few, 5, ALL, 'full').filter((a) => !/gazelle|ostrich|hunter|boat/.test(a.kind));
    expect(ambient.length).toBeGreaterThan(2);                                              // with room, birds, hippos, crocodiles and leaps show
    expect(ambient.length).toBeLessThanOrEqual(25);
  });
  it('shows ibis and herons on the banks, hippos in deep water and crocodiles on the sim\'s spots, in view only', () => {
    const w = riverWorld({ size: 56, seed: 3 });
    for (let y = 12; y < 44; y++) { w.terrain[idx(w.size, 19, y)] = T.BANK; w.terrain[idx(w.size, 22, y)] = T.BANK; }   // banks beside the river (a bird perches on a bank, not in a field)
    const sp = ambientSpots(w);
    expect(sp.birds.length).toBeGreaterThan(2);
    expect(sp.hippos.length).toBeGreaterThanOrEqual(0);
    for (const b of sp.birds) expect(w.terrain[b.i] === 1).toBe(false);
    const spots = crocSpots(w).map(([x, y]) => `${x},${y}`);
    const out = animalsAt(w, 5, ALL, 'gentle').filter((a) => a.kind.startsWith('croc'));
    expect(out.length).toBeGreaterThan(0);
    for (const c of out) expect(spots.includes(`${Math.floor(c.x)},${Math.floor(c.y)}`) || spots.some((s) => Math.abs(s.split(',')[0] - c.x) < 1 && Math.abs(s.split(',')[1] - c.y) < 1)).toBe(true);
    expect(animalsAt(w, 5, { x0: 40, y0: 40, x1: 45, y1: 45 }, 'gentle').filter((a) => a.x < 38 || a.y < 38).length).toBe(0);   // out of range, out of the list
    const birds = animalsAt(w, 5, ALL, 'gentle').filter((a) => /ibis|heron/.test(a.kind));
    expect(birds.length).toBeGreaterThan(0);
    expect(birds.length).toBeLessThanOrEqual(14);
  });
  it('moves under Full, more slowly under Gentle, and stands under Still', () => {
    const w = riverWorld();
    const h = herd(w, { moved: 0 });
    const pos = (motion, t) => herdAnimals(w, h, t, motion).map((a) => [a.x, a.y]);
    const travelled = (motion) => { const a = pos(motion, 40), b = pos(motion, 44); return a.reduce((s, p, i) => s + Math.hypot(p[0] - b[i][0], p[1] - b[i][1]), 0); };
    const full = travelled('full'), gentle = travelled('gentle');
    expect(full).toBeGreaterThan(0.1);
    expect(gentle).toBeGreaterThan(0.02);
    expect(gentle).toBeLessThan(full);                                                       // slower, still visibly alive (Gentle must read)
    expect(travelled('still')).toBe(0);
    expect(pos('still', 5)).toEqual(pos('still', 500));
    const lit = (motion) => JSON.stringify(animalsAt(w, 7, ALL, motion).filter((a) => /leap|splash/.test(a.kind)));
    expect(lit('still')).toBe('[]');                                                         // no jumping fish where nothing may move
  });
  it('walks a herd from where it stood to where it stands over the days a step takes, and Still shows it at its place', () => {
    const w = riverWorld();
    const h = herd(w, { x: 35, y: 24, px: 34, py: 24, moved: 100 });
    const at = (t, motion = 'gentle') => herdAnimals(w, h, t, motion).reduce((s, a) => s + a.x, 0) / h.size;
    expect(at(100)).toBeLessThan(at(101.5));
    expect(at(101.5)).toBeLessThan(at(103.2));
    expect(Math.abs(at(200, 'still') - (35.5))).toBeLessThan(1.1);
  });
  it('faces the way the herd stepped, and has art for every kind it names (left and right)', () => {
    const w = riverWorld({ seed: 2 });
    herd(w, { dir: -1 });
    herd(w, { kind: 'ostrich', x: 40, y: 30, dir: 1, hx: 40, hy: 30, px: 40, py: 30 });
    addRaw(w, 'hunting_lodge', 32, 11).staff = 3;
    const wh = addRaw(w, 'fishing_wharf', 22, 11); wh.rot = 1; wh.w = 1; wh.d = 2; wh.staff = 3;
    for (const motion of ['full', 'gentle', 'still']) {
      for (const t of [0, 3.3, 40, 111]) {
        for (const a of animalsAt(w, t, ALL, motion)) expect([a.kind, typeof (ART[`fig.${a.kind}`] && ART[`fig.${a.kind}`].draw)]).toEqual([a.kind, 'function']);
      }
    }
    const left = animalsAt(w, 5, ALL, 'gentle').filter((a) => a.kind === 'gazelle_l').length, right = animalsAt(w, 5, ALL, 'gentle').filter((a) => a.kind === 'gazelle').length;
    expect(left).toBeGreaterThan(right);
  });
});

describe('s46 river render: hunters and boats at work', () => {
  it('sends two hunters out from a working lodge toward the nearest herd in reach and back, and has them wait at the door under Still', () => {
    const w = riverWorld();
    const lodge = addRaw(w, 'hunting_lodge', 32, 11);
    lodge.staff = 3;
    const h = herd(w, { x: 32, y: 20 });
    const door = { x: lodge.x + lodge.w / 2, y: lodge.y + lodge.d + 0.35 };
    const at = (t, m = 'full') => huntersOf(w, lodge, t, m);
    expect(at(0).length).toBe(2);
    let furthest = 0;
    for (let t = 0; t < 40; t += 0.5) for (const k of at(t)) furthest = Math.max(furthest, Math.hypot(k.x - door.x, k.y - door.y));
    expect(furthest).toBeGreaterThan(4);                                                      // they walk toward the herd (about 8 tiles away)
    expect(furthest).toBeLessThan(Math.hypot(h.x + 0.5 - door.x, h.y + 0.5 - door.y) + 0.5);
    for (const k of at(20, 'still')) expect(Math.hypot(k.x - door.x, k.y - door.y)).toBeLessThan(1);
    w.wildlife.herds = [];
    for (const k of at(20)) expect(Math.hypot(k.x - door.x, k.y - door.y)).toBeLessThan(1);   // nothing to hunt: they stay home
    expect(at(0).every((k) => /^hunter(_l)?$/.test(k.kind))).toBe(true);
  });
  it('puts a boat on the water off a working wharf and not for an idle or paused one', () => {
    const w = riverWorld();
    const wh = addRaw(w, 'fishing_wharf', 22, 11);
    wh.rot = 1; wh.w = 1; wh.d = 2; wh.staff = 3;
    expect(wharfSide(w, wh)).toBe('w');
    const boat = boatOf(w, wh, 3, 'full');
    expect(Boolean(boat)).toBe(true);
    expect([20, 21].includes(Math.floor(boat.x))).toBe(true);                                // on the river
    const out = animalsAt(w, 3, ALL, 'gentle').filter((a) => a.kind.startsWith('boat'));
    expect(out.length).toBe(1);
    wh.paused = true;
    expect(animalsAt(w, 3, ALL, 'gentle').filter((a) => a.kind.startsWith('boat')).length).toBe(0);
    wh.paused = false; wh.staff = 0;
    expect(animalsAt(w, 3, ALL, 'gentle').filter((a) => a.kind.startsWith('boat')).length).toBe(0);
    wh.staff = 3;
    const a = boatOf(w, wh, 3, 'still'), b = boatOf(w, wh, 300, 'still');
    expect([a.x, a.y]).toEqual([b.x, b.y]);
  });
  it('joins the walkers through the Stage 4.6 hook and sorts into the frame with the figures', () => {
    const w = riverWorld();
    herd(w);
    const walkers = s46Walkers(w, 4, ALL, 'gentle');
    expect(walkers.length).toBeGreaterThan(3);
    const objects = collectObjects(w, { x0: 0, y0: 0, x1: 55, y1: 55 }, walkers);
    expect(objects.filter((o) => o.slot.startsWith('fig.gazelle')).length).toBe(6);
  });
});

describe('s46 river render: the art', () => {
  it('draws the three buildings, on their cards too, at their footprints', () => {
    for (const [t, w, d] of [['nilometer', 1, 1], ['hunting_lodge', 2, 2], ['fishing_wharf', 2, 1]]) {
      expect([t, ART[t] === RIVER_ART[t], ART[t].w, ART[t].d]).toEqual([t, true, w, d]);
      expect([t, inked((g) => ART[t].draw(g, 0, 0)) > 600]).toEqual([t, true]);
      expect([t, drawThumb(document.createElement('canvas'), t, 1).width > 0]).toEqual([t, true]);
    }
    expect([ART['fishing_wharf.w'].w, ART['fishing_wharf.w'].d, ART['fishing_wharf.n'].w, ART['fishing_wharf.n'].d]).toEqual([1, 2, 2, 1]);
  });
  it('shows a lodge with game hung while it works, and a wharf facing its water', () => {
    const w = riverWorld();
    const lodge = addRaw(w, 'hunting_lodge', 32, 11);
    expect(slotFor(lodge, w)).toBe('hunting_lodge');
    lodge.staff = 3;
    expect(slotFor(lodge, w)).toBe('hunting_lodge.g1');
    lodge.paused = true;
    expect(slotFor(lodge, w)).toBe('hunting_lodge');
    expect(hash((g) => ART['hunting_lodge.g1'].draw(g, 0, 0)) === hash((g) => ART['hunting_lodge'].draw(g, 0, 0))).toBe(false);   // the game on the rack changes the picture
    const east = addRaw(w, 'fishing_wharf', 22, 14); east.rot = 1; east.w = 1; east.d = 2;
    const west = addRaw(w, 'fishing_wharf', 19, 20); west.rot = 1; west.w = 1; west.d = 2;
    const north = addRaw(w, 'fishing_wharf', 20, 30);                                         // 2 wide on the river: water north and south: the one with more
    expect([slotFor(east, w), slotFor(west, w)]).toEqual(['fishing_wharf.w', 'fishing_wharf.e']);
    expect(riverSlot(addRaw(w, 'nilometer', 19, 40), w)).toBe(null);
    expect(slotFor(north, w).startsWith('fishing_wharf.')).toBe(true);
  });
  it('tells the animals apart by silhouette, not only colour', () => {
    const shapes = { gazelle, ostrich, ibis, heron, hippo, croc };
    const masks = {};
    for (const [k, f] of Object.entries(shapes)) {
      const c = makeCanvas(120, 120), ctx = c.getContext('2d');
      ctx.translate(60, 90);
      f(makeDraw(ctx, 3), 0, 0);
      const d = ctx.getImageData(0, 0, 120, 120).data;
      masks[k] = Array.from({ length: 120 * 120 }, (_, i) => (d[i * 4 + 3] > 100 ? 1 : 0));
      expect([k, masks[k].reduce((s, v) => s + v, 0) > 150]).toEqual([k, true]);
    }
    const names = Object.keys(masks);
    for (let i = 0; i < names.length; i++) for (let j = i + 1; j < names.length; j++) {
      let diff = 0, either = 0;
      for (let p = 0; p < masks[names[i]].length; p++) { if (masks[names[i]][p] !== masks[names[j]][p]) diff++; if (masks[names[i]][p] || masks[names[j]][p]) either++; }
      expect([`${names[i]}/${names[j]}`, diff / either > 0.25]).toEqual([`${names[i]}/${names[j]}`, true]);
    }
    expect(inked((g) => gazelle(g, 0, 0, true))).toBe(inked((g) => gazelle(g, 0, 0, false)));   // the left-facing slot is the same drawing mirrored
  });
  it('draws the nilometer, lodge and wharf directly too', () => {
    expect(inked((g) => nilometer(g, 0, 0))).toBeGreaterThan(500);
    expect(inked((g) => huntingLodge(g, 0, 0, 1))).toBeGreaterThan(2000);
    expect(inked((g) => fishingWharf(g, 0, 0, 'e'))).toBeGreaterThan(900);
  });
  it('has one dev scene for each picture the checkpoint takes', async () => {
    const { RIVER_SCENES } = await import('../../../src/dev/s46/river.js');
    expect(Object.keys(RIVER_SCENES).sort()).toEqual(['s46-farm-flood', 's46-flood', 's46-hunting', 's46-nilometer', 's46-wharf', 's46-wildlife']);
    let error = null;
    try { await RIVER_SCENES['s46-flood']({ game: () => null }); } catch (e) { error = e.message; }
    expect((error || '').includes('no city is open')).toBe(true);
  });
});
