// Version 7.0, Track P (ruling 1008): placing a building shows each square on its own and says why. Josh: the whole ghost went yellow or red and he could not tell why (a farm needs green
// ground, but can its road be one tile away?). The sim judges every rule on its own (conditionsFor: the ground tile by tile, the road, the store in reach, the gold) and now also says which
// squares are on the ground the rule counts, which water counts, which road touches and whether one lies a tile off; the bar words that, the ghost draws it square by square, and the
// banks a water-bound building can go on are marked lightly. Every rule is set up both ways (fits and not; a road touching and one tile away), and the words are the sim's numbers.
import { describe, it, expect } from '../../harness.js';
import { makeTestWorld, setRoad, addRaw, layClay } from '../../helpers/testWorld.js';
import { uiWorld, rigUI } from '../../helpers/uiWorld.js';
import { conditionsFor, canPlace } from '../../../src/sim/commands.js';
import { fitOf, waterTilesOf } from '../../../src/sim/fit.js';
import { touchesRoad } from '../../../src/sim/reach.js';
import { T as TILE } from '../../../src/sim/terrain.js';
import { idx } from '../../../src/sim/grid.js';
import { BUILDINGS } from '../../../src/data/buildings.js';
import { QUAY_TYPE } from '../../../src/data/trade.js';
import { createPlacement, ghostsFor } from '../../../src/ui/placement.js';
import { placementWhy, needsLine } from '../../../src/ui/placementWhy.js';
import { createStore, INITIAL_UI_STATE } from '../../../src/ui/store.js';
import { P_TEXT, S46_MAP_TEXT, V70_HELP } from '../../../src/ui/text.js';
import { drawGhost, bankTiles, BANK_HUE } from '../../../src/render/overlays.js';
import { p } from '../../../src/render/iso.js';
import { makeDraw } from '../../../src/render/art/ctx.js';
import { UI } from '../../../src/render/art/palette.js';
import { makeCanvas, pixelAt, nearColour } from '../../helpers/canvas.js';

const W = P_TEXT.place;
const FARM = { kind: 'building', type: 'farm_grain' };
const CLAY = { kind: 'building', type: 'clay_pit' };
const QUAY = { kind: 'building', type: QUAY_TYPE };

// A 32 x 32 test city: fertile land on x < 8, a road along y = 10 and a granary in reach of it, or not.
function rig({ road = true, granary = true, gold = 5000, inputType = 'mouse' } = {}) {
  const world = makeTestWorld({ gold });
  world.milestone = 'capital';
  if (road) setRoad(world, 0, 10, 31, 10);
  if (granary) addRaw(world, 'granary', 4, 11);
  const store = createStore({ ...INITIAL_UI_STATE, inputType });
  const pl = createPlacement({ world, store, afterCommand: () => {}, effects: { puff() {}, rise() {} }, now: () => 0 });
  return { world, store, pl };
}
const preview = (r, tool, x, y) => { r.pl.start(tool, { x, y }); r.pl.moveGhost(x, y); return r.pl.preview(); };
const states = (p) => p.footprint.map((t) => t.state);

describe('v70 p what the sim marks beside the conditions', () => {
  it('says which footprint squares are on the ground the terrain rule counts: the fertile edge of a farm, nothing for a building with no terrain rule', () => {
    const w = makeTestWorld({ gold: 1000 });
    w.milestone = 'capital';                                                                      // (the clay pit is unlocked)
    expect(conditionsFor(w, 'farm_grain', 7, 20).more.on).toEqual([true, false, true, false]);   // x 7 is fertile, x 8 is sand
    expect(conditionsFor(w, 'farm_grain', 2, 20).more.on).toEqual([true, true, true, true]);
    expect(conditionsFor(w, 'well', 20, 20).more.on).toEqual([null]);
    layClay(w, 20, 4, 1, 1);                                                                      // one clay tile of the pit's four
    expect(conditionsFor(w, 'clay_pit', 20, 4).more.on).toEqual([true, false, false, false]);
  });
  it('names the road tiles that touch a side, and whether one lies a tile off or on a corner, which the rule does not count', () => {
    const w = makeTestWorld({ gold: 1000 });
    setRoad(w, 0, 10, 31, 10);
    const farm = (x, y) => { const c = conditionsFor(w, 'farm_grain', x, y, { roadLater: true }); return [touchesRoad(w, { x, y, w: 2, d: 2 }), c.more.roadAt.length, c.more.near]; };
    expect(farm(2, 8)).toEqual([true, 2, false]);                                                 // its bottom side on the road
    expect(farm(2, 7)).toEqual([false, 0, true]);                                                 // one tile above: a road a tile away does not count
    expect(farm(2, 5)).toEqual([false, 0, false]);                                                // further off: nothing near
    const c = makeTestWorld({ gold: 1000 });
    c.road[idx(c.size, 4, 10)] = 1;                                                               // a lone road tile on the footprint's lower-right corner
    expect([touchesRoad(c, { x: 2, y: 8, w: 2, d: 2 }), conditionsFor(c, 'farm_grain', 2, 8, { roadLater: true }).more.near]).toEqual([false, true]);
  });
  it('lists the water tiles that count for the water rule, as many as fitOf counts: the Quay on a bank and off it', () => {
    const w = makeTestWorld({ gold: 5000 });
    w.milestone = 'capital';
    for (let x = 0; x < w.size; x++) w.terrain[idx(w.size, x, 15)] = TILE.WATER;
    const on = conditionsFor(w, QUAY_TYPE, 10, 16, { roadLater: true });
    expect(waterTilesOf(w, QUAY_TYPE, 10, 16)).toEqual([[10, 15], [11, 15]]);
    expect([on.more.wet, fitOf(w, QUAY_TYPE, 10, 16).wet, on.conditions[0].state]).toEqual([[[10, 15], [11, 15]], 2, 'met']);
    const off = conditionsFor(w, QUAY_TYPE, 10, 19, { roadLater: true });
    expect([off.more.wet, fitOf(w, QUAY_TYPE, 10, 19).wet, off.conditions[0].reason]).toEqual([[], 0, 'needs_water']);
    expect(waterTilesOf(w, 'farm_grain', 2, 2)).toEqual([]);                                      // no water rule: none
  });
});

describe('v70 p the placing bar says why, from the sim', () => {
  it('while everything is met, says what the farm needs in one line, built from its own row (the squares, the road, the granary and how far)', () => {
    const r = rig();
    const pv = preview(r, FARM, 2, 8);
    expect([pv.state, pv.why, states(pv)]).toEqual(['ok', '', ['met', 'met', 'met', 'met']]);
    expect(pv.needs).toBe(`Needs ${S46_MAP_TEXT.ground.fertile} under every square, a road touching one side and a granary within ${BUILDINGS.farm_grain.producerReach} road tiles`);
    expect(needsLine('well')).toBe('Needs a road touching one side');
    expect(needsLine('garden')).toBe('');                                                          // nothing to need
    expect(needsLine(QUAY_TYPE)).toBe('Needs water along a long side and a road touching one side');
    expect(needsLine('bazaar')).toBe(`Needs a road touching one side and a granary within ${BUILDINGS.bazaar.supplyReach} road tiles to supply it`);
  });
  it('road rule both ways: touching a side is met, a road one tile away does not count and the line says so, no road says where to lay one', () => {
    const r = rig();
    const touching = preview(r, FARM, 2, 8);
    expect([touchesRoad(r.world, { x: 2, y: 8, w: 2, d: 2 }), touching.state, touching.roadAt]).toEqual([true, 'ok', [[2, 10], [3, 10]]]);
    const away = preview(r, FARM, 2, 7);
    expect([touchesRoad(r.world, { x: 2, y: 7, w: 2, d: 2 }), away.state, away.why.startsWith(`${W.leadLater}: ${W.road.near}`), away.roadAt]).toEqual([false, 'warn', true, []]);
    expect(away.why).toContain('one tile away does not count');
    expect(away.whyParts.find((k) => k.key === 'road').text).toBe(W.road.near);
    const bare = rig({ road: false });
    const none = preview(bare, FARM, 2, 7);
    expect(none.whyParts.find((k) => k.key === 'road').text).toBe(`${W.road.none}: ${W.road.joins}`);   // nothing near: the marked squares are where it would go
    expect(none.why).toBe('');                                                                     // wave 3 (ruling 992): the chip says "No road yet", so the line has nothing to add (only a road one tile off does)
    expect(none.joins.length).toBeGreaterThan(0);
  });
  it('ground rule both ways, counted as the sim counts it: 2 of 4 squares on fertile land refuses and says so, 4 of 4 does not, a house on a square is a square taken', () => {
    const r = rig();
    const half = preview(r, FARM, 7, 8);
    expect(half.state).toBe('bad');
    expect(half.whyParts.map((x) => x.text)).toEqual([W.terrain('fertile', 2, 4, 4)]);              // the sim's count, in the line's own words ...
    expect(half.whyParts[0].text).toBe('fertile land under 2 of 4 squares: all 4 needed');
    expect(half.why).toBe('');                                                                     // ... which the bar leaves to the chip while chips show (wave 3, ruling 992)
    expect(states(half)).toEqual(['met', 'cant', 'met', 'cant']);
    expect(preview(r, FARM, 6, 8).why).toBe('');                                                  // all four on the fertile land: nothing to refuse
    addRaw(r.world, 'house', 5, 9);
    const taken = preview(r, FARM, 4, 8);
    expect(taken.why).toBe(`${W.leadCant}: ${W.taken(1, 4)}`);
    expect(states(taken)).toEqual(['met', 'met', 'met', 'cant']);
    expect(taken.footprint[3].reason).toBe('occupied');
    r.world.road.fill(0); r.world.roadVersion++;                                                  // a refusal that also lacks what is not met yet: every unmet rule is a part, the chips say them
    const lacking = preview(r, FARM, 7, 8);
    expect(lacking.state).toBe('bad');
    expect(lacking.whyParts.map((x) => x.key)).toEqual(['ground', 'road', 'works']);
    expect(lacking.why).toBe('');
    addRaw(r.world, 'well', 7, 9);                                                                // a square taken is not a chip's word: it is the line, and the rest still follows it in the short form
    const both = preview(r, FARM, 7, 8);
    expect(both.why).toBe(`${W.leadCant}: ${W.taken(1, 4)}`);
  });
  it('the clay pit counts 2 of its 4 squares: one clay square refuses ("clay under 1 of 4 squares: 2 needed") with the others off, two is met with the others plain', () => {
    const r = rig();
    layClay(r.world, 20, 5, 1, 1);
    const one = preview(r, CLAY, 20, 5);
    expect([one.state, one.whyParts[0].text.startsWith(W.terrain('clay', 1, 4, 2)), one.why]).toEqual(['bad', true, '']);   // (the chip says it; wave 3, ruling 992)
    expect(one.whyParts[0].text).toBe('clay under 1 of 4 squares: 2 needed');
    expect(states(one)).toEqual(['met', 'off', 'off', 'off']);
    layClay(r.world, 21, 5, 1, 1);
    const two = preview(r, CLAY, 20, 5);
    expect([two.state === 'bad', two.why.includes('clay under')]).toEqual([false, false]);
    expect(states(two)).toEqual(['met', 'met', 'plain', 'plain']);
  });
  it('water rule both ways: the Quay off the bank says no water along a long side, on it marks the water that counts', () => {
    const r = rig();
    for (let x = 0; x < r.world.size; x++) r.world.terrain[idx(r.world.size, x, 15)] = TILE.WATER;
    const off = preview(r, QUAY, 12, 20);
    expect([off.state, off.whyParts[0].text.startsWith(W.water.longSide), off.why, off.wet]).toEqual(['bad', true, '', []]);   // (the ground chip says the water rule; wave 3, ruling 992)
    const on = preview(r, QUAY, 12, 16);
    expect([on.wet.length, fitOf(r.world, QUAY_TYPE, 12, 16).wet, states(on)]).toEqual([2, 2, ['met', 'met']]);
    expect(on.whyParts.find((k) => k.key === 'road').text).toContain(W.road.none);                // the bank is right; no road yet is amber, not a refusal (and the chip's word, so the line is empty)
    expect(on.state).toBe('warn');
    expect(ghostsFor(r.world, r.store.get())[0].wet).toEqual(on.wet);
  });
  it('leads with what the colour means: coral cannot be placed, amber will not work yet, and the bar shows the line in that colour with the older line kept hidden', async () => {
    // Wave 3 (ruling 992): the line carries only what no chip says, so the colours' leads show with a road one tile off (amber) and a square taken (coral).
    const amber = rig({ granary: false });
    const w = preview(amber, FARM, 2, 7);
    expect([w.state, w.why.startsWith(`${W.leadLater}: `), w.whyParts.some((k) => k.key === 'works')]).toEqual(['warn', true, true]);
    addRaw(amber.world, 'well', 7, 21);
    const bad = preview(amber, FARM, 7, 20);
    expect(bad.why.startsWith(`${W.leadCant}: `)).toBe(true);
    const r = await rigUI();
    try {
      r.ui.placement.start(FARM, { x: 2, y: 7 });
      r.ui.placement.moveGhost(2, 7);                                                              // fertile, a road one tile away (not touching)
      const pv = r.ui.placement.preview();
      const bar = r.root.querySelector('#confirm');
      const why = bar.querySelector('.why'), old = bar.querySelector('.reason');
      expect([pv.state, why.textContent, why.classList.contains('amber'), old.hidden]).toEqual(['warn', pv.why, true, true]);
      expect(pv.why.startsWith(W.leadLater)).toBe(true);
      r.ui.placement.moveGhost(2, 8);                                                              // beside the road, the granary in reach: met
      const ok = r.ui.placement.preview();
      const line = bar.querySelector('.why');
      expect([ok.state, line.textContent, line.classList.contains('muted')]).toEqual(['ok', ok.needs, true]);
      expect(ok.needs.startsWith(W.needsHead)).toBe(true);
    } finally { r.cleanup(); }
  });
  it('a service keeps its effect line while met (the effect has the room), and says why when refused', async () => {
    const r = await rigUI();
    try {
      r.ui.placement.start({ kind: 'building', type: 'well' }, { x: 20, y: 9 });
      r.ui.placement.moveGhost(20, 9);
      const ok = r.ui.placement.preview();
      expect([ok.state, Boolean(ok.effect), r.root.querySelector('#confirm .why'), r.root.querySelector('#confirm .effect') !== null]).toEqual(['ok', true, null, true]);
      r.ui.placement.moveGhost(12, 10);                                                            // on the road: taken
      const bad = r.ui.placement.preview();
      expect([bad.state, r.root.querySelector('#confirm .why').textContent]).toEqual(['bad', `${W.leadCant}: ${W.taken(1, 1)}`]);
    } finally { r.cleanup(); }
  });
  it('the words are the sim\'s: placementWhy on a spot with no tiles (a locked building) says nothing, and a bad spot\'s parts are each one failing condition', () => {
    const w = makeTestWorld({ gold: 1000 });
    expect(placementWhy(conditionsFor(w, 'well', 1.5, 1), 'well')).toEqual({ state: 'cant', lead: '', parts: [], text: '', needs: '' });
    const c = conditionsFor(w, 'farm_grain', 7, 20, { roadLater: true });
    const why = placementWhy(c, 'farm_grain');
    expect(why.parts.map((x) => [x.key, x.state])).toEqual([['ground', 'cant'], ['road', 'later'], ['works', 'later']].filter(([k]) => k !== 'works'));
  });
});

describe('v70 p how to play says what the colours mean', () => {
  it('has a placing entry that names amber and coral in the words the bar leads with, and the road rule it says is the sim\'s (a side, not one tile away)', () => {
    const entry = V70_HELP.p.find((h) => h.head.startsWith('Placing a building'));
    expect(Boolean(entry)).toBe(true);
    expect([entry.text.includes(`"${W.leadLater.toLowerCase()}"`), entry.text.includes(`"${W.leadCant.toLowerCase()}"`), entry.text.includes('one tile away does not count')]).toEqual([true, true, true]);
    const w = makeTestWorld({ gold: 1000 });
    setRoad(w, 0, 10, 31, 10);
    expect([touchesRoad(w, { x: 2, y: 8, w: 2, d: 2 }), touchesRoad(w, { x: 2, y: 7, w: 2, d: 2 })]).toEqual([true, false]);   // the claim, both ways
  });
});

describe('v70 p the ghost, square by square', () => {
  it('gives every square its verdict and the whole ghost its own: a farm half on the fields is two right squares and two wrong ones inside a coral outline', () => {
    const r = rig();
    preview(r, FARM, 7, 8);
    const [g] = ghostsFor(r.world, r.store.get());
    expect([g.state, g.tiles.map((t) => `${t.x},${t.y}:${t.state}`)]).toEqual(['bad', ['7,8:met', '8,8:cant', '7,9:met', '8,9:cant']]);
    preview(r, FARM, 2, 8);
    const [ok] = ghostsFor(r.world, r.store.get());
    expect([ok.state, ok.tiles.every((t) => t.state === 'met'), ok.roadAt]).toEqual(['ok', true, [[2, 10], [3, 10]]]);
  });
  // The canvas origin sits at device (120, 60); the scene draws tile (0, 0)'s corner there at scale 2.
  const scene = () => { const c = makeCanvas(240, 200); const ctx = c.getContext('2d'); const [ax, ay] = p(0, 0); ctx.translate(120 - 2 * ax, 60 - 2 * ay); return { c, g: makeDraw(ctx, 2), at: (x, y) => { const q = p(x, y); return [120 + 2 * (q[0] - ax), 60 + 2 * (q[1] - ay)]; } }; };
  // The pixels of a tile's inside (a diamond: |dx| / 24 + |dy| / 12 < 0.7) with some ink, and how many of them are of colour `hex`.
  function tileInk(s, tx, ty, hex = null, tol = 50) {
    const [cx, cy] = s.at(tx + 0.5, ty + 0.5);
    let inked = 0, total = 0, of = 0;
    for (let dx = -22; dx <= 22; dx += 2) for (let dy = -11; dy <= 11; dy += 2) {
      if (Math.abs(dx) / 24 + Math.abs(dy) / 12 > 0.7) continue;
      total++;
      const px = pixelAt(s.c, Math.round(cx) + dx, Math.round(cy) + dy);
      if (px[3] > 25) { inked++; if (hex && nearColour(px, hex, tol)) of++; }
    }
    return { inked, total, of };
  }
  it('draws a wrong square hatched and crossed and a right one washed and solid, so no verdict is colour alone', () => {
    const s = scene();
    drawGhost(s.g, { x: 0, y: 0, w: 2, d: 1, state: 'bad', badge: true, tiles: [{ x: 0, y: 0, state: 'met' }, { x: 1, y: 0, state: 'cant' }] });
    const right = tileInk(s, 0, 0, UI.bad), wrong = tileInk(s, 1, 0, UI.bad);
    expect(right.inked / right.total).toBeGreaterThan(0.9);                                       // a wash all over
    expect(right.of).toBe(0);                                                                     // and no coral in it
    expect(wrong.of / wrong.total).toBeGreaterThan(0.05);                                         // coral lines...
    expect(wrong.of / wrong.total).toBeLessThan(0.7);                                             // ...with the wash between them: hatching, not a fill
  });
  it('draws a square the rule does not count (off) hatched in amber with a dashed edge, and a plain one with no fill, so the three read apart', () => {
    const off = scene(), plain = scene(), met = scene();
    drawGhost(off.g, { x: 0, y: 0, w: 2, d: 1, state: 'bad', badge: true, tiles: [{ x: 0, y: 0, state: 'met' }, { x: 1, y: 0, state: 'off' }] });
    drawGhost(plain.g, { x: 0, y: 0, w: 2, d: 1, state: 'ok', badge: true, tiles: [{ x: 0, y: 0, state: 'met' }, { x: 1, y: 0, state: 'plain' }] });
    drawGhost(met.g, { x: 0, y: 0, w: 2, d: 1, state: 'ok', badge: true, tiles: [{ x: 0, y: 0, state: 'met' }, { x: 1, y: 0, state: 'met' }] });
    const o = tileInk(off, 1, 0, UI.warn), pl = tileInk(plain, 1, 0), m = tileInk(met, 1, 0);
    expect(o.of).toBeGreaterThan(4);                                                              // amber hatching
    expect(pl.inked).toBeLessThan(m.inked * 0.6);                                                 // a plain square is lighter than a right one
    expect(pl.inked).toBeGreaterThan(0);                                                          // but still drawn (a dashed edge)
  });
  it('marks the water that counts and the road that touches beside the ghost, and nothing when there are none', () => {
    const none = scene(), some = scene();
    drawGhost(none.g, { x: 0, y: 1, w: 1, d: 1, state: 'ok', badge: true, tiles: [{ x: 0, y: 1, state: 'met' }] });
    drawGhost(some.g, { x: 0, y: 1, w: 1, d: 1, state: 'ok', badge: true, tiles: [{ x: 0, y: 1, state: 'met' }], wet: [[0, 0]], roadAt: [[1, 1]] });
    expect(tileInk(some, 0, 0).inked).toBeGreaterThan(tileInk(none, 0, 0).inked + 10);
    expect(tileInk(some, 1, 1).inked).toBeGreaterThan(tileInk(none, 1, 1).inked + 10);
  });
});

describe('v70 p the banks a water-bound building can go on are marked lightly', () => {
  it('are the tiles of every free spot the sim\'s own canPlace accepts (the road and the gold left to the bar), none for a building with no water rule, and a building on the bank takes its tiles off', () => {
    const w = makeTestWorld({ gold: 5000 });
    w.milestone = 'capital';
    for (let x = 0; x < w.size; x++) w.terrain[idx(w.size, x, 15)] = TILE.WATER;
    const room = bankTiles(w, QUAY_TYPE);
    const expected = new Set();
    for (let y = 0; y < w.size; y++) for (let x = 0; x < w.size - 1; x++) {
      const c = canPlace(w, QUAY_TYPE, x, y, { roadLater: true });
      if (c.ok) { expected.add(idx(w.size, x, y)); expected.add(idx(w.size, x + 1, y)); }
    }
    expect(room.size).toBeGreaterThan(20);
    expect([...room].sort((a, b) => a - b)).toEqual([...expected].sort((a, b) => a - b));
    expect(room.has(idx(w.size, 10, 16)) && room.has(idx(w.size, 10, 14))).toBe(true);           // both banks of the water row
    expect(room.has(idx(w.size, 10, 20))).toBe(false);                                            // inland: no
    expect(bankTiles(w, 'farm_grain').size).toBe(0);
    addRaw(w, 'house', 10, 16);
    expect(bankTiles(w, QUAY_TYPE).has(idx(w.size, 10, 16))).toBe(false);
    expect(BANK_HUE.startsWith('#')).toBe(true);
  });
});
