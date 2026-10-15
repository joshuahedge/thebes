// Stage 4.7 Task 4 (ruling 465): good spots for the next house. The sim marks a free tile Good (a working well and a working bazaar reach a plot there along the roads),
// Fair (one of them does) or nothing, from its own coverage functions; this file sets the world up both ways and checks the marks against what a real plot placed
// there gets (computeCoverage's water, bazaarsByHouse), the cache, the map's drawing, the legend and the Done button, tool persistence (houses only) and the tip.
import { describe, it, expect } from '../../harness.js';
import { fire } from '../../helpers/dom.js';
import { uiWorld, runningUiWorld, rigUI } from '../../helpers/uiWorld.js';
import { addRaw } from '../../helpers/testWorld.js';
import { place, drawRoad } from '../../../src/sim/commands.js';
import { houseSpots, spotAt, plotNeeds, spotsUnlocked, SPOT } from '../../../src/sim/spots.js';
import { computeCoverage, bazaarTiles } from '../../../src/sim/coverage.js';
import { bazaarsByHouse } from '../../../src/sim/distribution.js';
import { coveredBy } from '../../../src/sim/housing.js';
import { removeBuilding, housesOf, buildingAt } from '../../../src/sim/world.js';
import { BUILDINGS } from '../../../src/data/buildings.js';
import { TIPS, TIP_FIRST_DELAY_MS } from '../../../src/data/tips.js';
import { settle } from '../../../src/sim/settle.js';
import { makeDraw } from '../../../src/render/art/ctx.js';
import { drawHouseSpots, iconSize, ICON_MIN_CSS_SCALE } from '../../../src/render/spots.js';
import { spotsOn, spotsLegend } from '../../../src/ui/s47/spots.js';
import { TIP_TEXT, TIP_HELP_TEXT, S47_SPOTS_TEXT as W } from '../../../src/ui/text.js';

// uiWorld: a road along y = 10 (x 0-31), a staffed bazaar at (9, 11) (reach 10) and a staffed well at (15, 11) (reach 5), houses at (12, 9) and (13, 9). A second well far
// east gives a water-only stretch.
function spotWorld({ eastWell = true } = {}) {
  const w = uiWorld();
  if (eastWell) addRaw(w, 'well', 28, 11, { staff: 0 });
  return w;
}
const kindOf = (water, market) => (water && market ? SPOT.good : water || market ? SPOT.fair : null);

describe('s47 house spots: the sim coverage', () => {
  it('marks Good, Fair (either of the two) and nothing along a road, from the sim reach', () => {
    const w = spotWorld();
    expect(spotsUnlocked(w)).toBe(true);                                    // homes stand
    // (17, 9): the well (15, 11) is 3 road tiles off and the bazaar (9, 11) 8 off, both inside their reach (5 and 10)
    expect([spotAt(w, 17, 9), houseSpots(w).via.get(17 + 9 * 32) || null]).toEqual([SPOT.good, null]);
    expect([spotAt(w, 7, 9), houseSpots(w).via.get(7 + 9 * 32)]).toEqual([SPOT.fair, 'market']);   // the bazaar only: the well is 9 off
    expect([spotAt(w, 28, 9), houseSpots(w).via.get(28 + 9 * 32)]).toEqual([SPOT.fair, 'water']);  // the east well only: the bazaar is 19 off
    expect(spotAt(w, 22, 9)).toBe(null);                                    // 7 from the well, 12 from the bazaar: neither
    expect(spotAt(w, 17, 8)).toBe(null);                                    // two tiles off the road: no road beside it, never marked
    expect(spotAt(w, 12, 9)).toBe(null);                                    // an occupied tile
    expect(houseSpots(w).tiles.has(17 + 10 * 32)).toBe(false);              // the road itself
    expect(BUILDINGS.well.reach).toBe(5);
    expect(BUILDINGS.bazaar.reach).toBe(10);
  });

  it('agrees with a real plot laid on every tile beside the road: the mark is what that plot gets (water covered, a bazaar reaching it)', () => {
    const got = [];
    for (let x = 0; x < 32; x++) {
      for (const y of [9, 11]) {
        const w = spotWorld();
        const mark = spotAt(w, x, y), needs = plotNeeds(w, x, y);
        const placed = place(w, 'house', x, y);
        if (!placed.ok) { expect([x, y, mark]).toEqual([x, y, null]); continue; }   // somewhere a house cannot go: never marked
        const h = buildingAt(w, x, y);
        const water = computeCoverage(w).water.has(h.id), market = bazaarsByHouse(w).has(h.id);
        expect([x, y, water, coveredBy(w, h, 'water')]).toEqual([x, y, needs.water, water]);   // the two sim rules agree with each other...
        expect([x, y, market]).toEqual([x, y, needs.market]);                                   // ...and with the tile's own look-up
        expect([x, y, mark]).toEqual([x, y, needs.road ? kindOf(water, market) : null]);        // a plot with no road beside it is never marked
        got.push(mark);
      }
    }
    expect(new Set(got)).toEqual(new Set([SPOT.good, SPOT.fair, null]));      // the sweep met every kind, so it proves all of them
  });

  it('counts only working providers: an unstaffed bazaar, a paused well and a bazaar on fire reach nobody', () => {
    const w = spotWorld({ eastWell: false });
    const bazaar = Object.values(w.buildings).find((b) => b.type === 'bazaar'), well = Object.values(w.buildings).find((b) => b.type === 'well');
    expect(spotAt(w, 17, 9)).toBe(SPOT.good);
    bazaar.staff = 0;                                                        // under the staffing line: it does not work
    expect([spotAt(w, 17, 9), spotAt(w, 7, 9)]).toEqual([SPOT.fair, null]);
    bazaar.staff = BUILDINGS.bazaar.workers;
    expect(spotAt(w, 17, 9)).toBe(SPOT.good);
    well.paused = true;
    expect([spotAt(w, 17, 9), houseSpots(w).via.get(17 + 9 * 32)]).toEqual([SPOT.fair, 'market']);
    well.paused = false;
    bazaar.fire = { stage: 'fire' };
    expect([spotAt(w, 17, 9), houseSpots(w).via.get(17 + 9 * 32)]).toEqual([SPOT.fair, 'water']);
    expect(bazaarTiles(w).size).toBe(0);
  });

  it('is on once a plot has been laid (and stays on without one), or when a home stands, and not in an empty city', () => {
    const w = uiWorld();
    for (const b of housesOf(w)) removeBuilding(w, b.id);
    expect(spotsUnlocked(w)).toBe(false);
    const laid = place(w, 'house', 14, 9);
    expect(laid.ok).toBe(true);
    expect(w.tally.plotsLaid).toBe(1);
    removeBuilding(w, laid.id);
    expect(spotsUnlocked(w)).toBe(true);                                      // the tally keeps it: the plots are gone, the spots stay
  });
});

describe('s47 house spots: the cache', () => {
  it('is worked out again only when roads or the buildings that decide it change', () => {
    const w = spotWorld();
    const a = houseSpots(w);
    expect(houseSpots(w)).toBe(a);                                            // every frame: the same object
    const h = housesOf(w)[0];
    h.tier = 3; h.residents = 10; w.day += 30;
    expect(houseSpots(w)).toBe(a);                                            // growth and days do not move a spot
    w.gold -= 5;
    expect(houseSpots(w)).toBe(a);
    const road = drawRoad(w, 17, 10, 17, 14);                                 // a new road: the version moves
    expect(road.ok).toBe(true);
    const b = houseSpots(w);
    expect(b !== a).toBe(true);
    expect(houseSpots(w)).toBe(b);
    const bz = Object.values(w.buildings).find((x) => x.type === 'bazaar');
    bz.staff = 0;                                                             // staffing changes what works
    const c = houseSpots(w);
    expect(c !== b).toBe(true);
    bz.staff = BUILDINGS.bazaar.workers;
    const d = houseSpots(w);
    expect(d !== c).toBe(true);
    const placed = place(w, 'house', 16, 9);                                  // a plot takes a tile
    expect(placed.ok).toBe(true);
    const e = houseSpots(w);
    expect(e !== d).toBe(true);
    expect(e.tiles.has(16 + 9 * 32)).toBe(false);
    expect(d.tiles.has(16 + 9 * 32)).toBe(true);
    removeBuilding(w, placed.id);                                             // and demolishing frees it
    expect(houseSpots(w).tiles.has(16 + 9 * 32)).toBe(true);
    const f = houseSpots(w);
    place(w, 'well', 20, 11);                                                 // a new well: a new building
    expect(houseSpots(w) !== f).toBe(true);
  });
});

// A recording stand-in for the canvas wrapper (src/render/art/ctx.js makeDraw): what was drawn. ctx.drawImage is where each tile's icon sprite is stamped.
function recorder(cssScale = 2) {
  const calls = [];
  const rec = (name) => (...a) => { calls.push({ name, a }); };
  return { calls, g: { scale: 2, cssScale, ctx: { drawImage: rec('drawImage') }, poly: rec('poly'), polys: rec('polys'), hatchPolys: rec('hatchPolys'), path: rec('path'), stroke: rec('stroke'), circ: rec('circ'), line: rec('line') } };
}
const count = (calls, name) => calls.filter((c) => c.name === name).length;

describe('s47 house spots: the map', () => {
  it('draws a wash and two icons for a Good tile, hatching and one icon for a Fair one, from the sim list', () => {
    const w = spotWorld();
    const { list, good, fair } = houseSpots(w);
    expect([good > 0, fair > 0, list.length]).toEqual([true, true, good + fair]);
    const r = recorder();
    drawHouseSpots(r.g, w, null);
    expect(count(r.calls, 'polys')).toBe(3);                                  // the Good wash, one fill, and the two kinds' inset outlines, one stroke each
    expect(count(r.calls, 'hatchPolys')).toBe(1);                             // the Fair hatching, one fill
    expect(r.calls.filter((c) => c.name === 'polys')[1].a[0].length + r.calls.filter((c) => c.name === 'polys')[2].a[0].length).toBe(good + fair);   // an inset outline on each tile
    // icons: one stamp a tile (a sprite of both icons for Good, the drop or the basket for Fair), each sprite made once and shared
    const waterOnly = list.filter((s) => s.kind === SPOT.fair && s.via === 'water').length, marketOnly = list.filter((s) => s.kind === SPOT.fair && s.via === 'market').length;
    expect([count(r.calls, 'drawImage'), count(r.calls, 'path')]).toEqual([good + fair, 0]);
    const sprites = new Set(r.calls.filter((c) => c.name === 'drawImage').map((c) => c.a[0]));
    expect(sprites.size).toBe(3);                                             // Good, Fair water, Fair market
    drawHouseSpots(r.g, w, null);
    expect(new Set(r.calls.filter((c) => c.name === 'drawImage').map((c) => c.a[0])).size).toBe(3);   // the next frame makes no new sprite
    expect(waterOnly > 0 && marketOnly > 0).toBe(true);
  });
  it('draws only what is in view, and leaves the icons off when the tile is too small to hold them (the tint and hatching stay)', () => {
    const w = spotWorld();
    const r = recorder();
    drawHouseSpots(r.g, w, { x0: 0, y0: 0, x1: 3, y1: 3 });                    // nothing marked there
    expect(r.calls.length).toBe(0);
    const small = recorder(ICON_MIN_CSS_SCALE - 0.1);
    drawHouseSpots(small.g, w, null);
    expect([count(small.calls, 'polys'), count(small.calls, 'hatchPolys'), count(small.calls, 'drawImage')]).toEqual([3, 1, 0]);
    expect(iconSize(2) <= iconSize(1) && iconSize(1) <= 0.9).toBe(true);        // about the same size on screen whatever the zoom, within limits
  });
  it('stamps real icons: a real canvas takes the tint, the outline and the icons, and the Good icons are not blank', () => {
    const w = spotWorld();
    const cv = document.createElement('canvas');
    cv.width = 1400; cv.height = 700;
    const ctx = cv.getContext('2d');
    ctx.translate(700, 20);                                                   // the renderer's own origin for the overlay layer
    const g = makeDraw(ctx, 2, 2);
    drawHouseSpots(g, w, null);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const px = ctx.getImageData(0, 0, cv.width, cv.height).data;
    let opaque = 0;
    for (let i = 3; i < px.length; i += 4) if (px[i] > 0) opaque++;
    expect(opaque > 2000).toBe(true);
    // the Good tile at (17, 9) carries a blue drop (the water colour) and an orange basket (the goods colour) at its centre; the tint alone has neither
    const [cx, cy] = [(17.5 - 9.5) * 16 * 2 + 700, (17.5 + 9.5) * 8 * 2 + 20];
    const patch = ctx.getImageData(Math.round(cx) - 24, Math.round(cy) - 14, 48, 28).data;
    const near = (i, rgb) => Math.abs(patch[i] - rgb[0]) < 40 && Math.abs(patch[i + 1] - rgb[1]) < 40 && Math.abs(patch[i + 2] - rgb[2]) < 40 && patch[i + 3] > 200;
    let blue = 0, orange = 0;
    for (let i = 0; i < patch.length; i += 4) { if (near(i, [0x2F, 0x6F, 0xA8])) blue++; if (near(i, [0xB5, 0x56, 0x2A])) orange++; }
    expect([blue > 8, orange > 8]).toEqual([true, true]);
  });
  it('is on only with the house tool, a plot laid and no overlay', () => {
    const w = spotWorld();
    expect(spotsOn({ tool: { kind: 'houses' }, overlay: null }, w)).toBe(true);
    expect(spotsOn({ tool: { kind: 'houses' }, overlay: 'ground' }, w)).toBe(false);
    expect(spotsOn({ tool: { kind: 'road' }, overlay: null }, w)).toBe(false);
    expect(spotsOn({ tool: { kind: 'building', type: 'house' }, overlay: null }, w)).toBe(false);
    expect(spotsOn({ tool: null, overlay: null }, w)).toBe(false);
    const empty = uiWorld();
    for (const b of housesOf(empty)) removeBuilding(empty, b.id);
    expect(spotsOn({ tool: { kind: 'houses' }, overlay: null }, empty)).toBe(false);
  });
});

describe('s47 house spots: the legend, the tip and How to play', () => {
  it('says Good and Fair in words with the swatch the map draws, as one group, and the words match the sim rule', () => {
    const legend = spotsLegend();
    expect(legend.getAttribute('aria-label')).toBe(W.group);
    const keys = [...legend.querySelectorAll('.key')];
    expect(keys.map((k) => k.textContent.trim())).toEqual([`${W.good}: ${W.goodWords}`, `${W.fair}: ${W.fairWords}`]);
    expect(keys.every((k) => k.getAttribute('role') === 'img' && k.getAttribute('aria-label').length > 20)).toBe(true);
    expect(legend.querySelectorAll('svg').length).toBe(2);                    // never colour alone: each swatch has its icons
    expect(W.goodWords).toContain('water');                                   // Good: the well and the bazaar (set up both ways in the sweep above)
    expect(W.goodWords).toContain('bazaar');
    expect(W.goodLabel).toContain('drop');
    expect(W.goodLabel).toContain('basket');
  });
  it('has a tip and How to play words, each short', () => {
    expect(TIPS.find((t) => t.id === 'house_spots')).toEqual({ id: 'house_spots', trigger: 'houseSpots', priority: false });
    for (const text of [TIP_TEXT.house_spots, TIP_HELP_TEXT.house_spots]) expect(text.split(/\s+/).length <= 20).toBe(true);
    expect(TIP_TEXT.house_spots).toContain('water and a bazaar in reach');
    expect(TIP_HELP_TEXT.house_spots).toContain('Done');
  });
});

// A touch tick on the house tool: a finger taps a tile, then the tick is pressed with a touch pointerdown.
async function houseTool(world = runningUiWorld()) {
  const r = await rigUI({ world });
  r.ui.placement.start({ kind: 'houses' });
  r.frame(0);
  return r;
}
function touchTick(r) {
  const ok = r.root.querySelector('#confirm .ok');
  fire(ok, 'pointerdown', { pointerType: 'touch' });
  fire(ok, 'click');
}

describe('s47 house spots: the house tool stays, with Done', () => {
  it('stays on after a touch tick, shows a 44 px Done with an accessible name, and Done ends it', async () => {
    const r = await houseTool();
    try {
      expect(r.root.querySelector('#confirm .done') !== null).toBe(true);          // nothing waiting: Done in place of the x
      expect(r.root.querySelector('#confirm .cancel')).toBe(null);
      r.tap(14, 9);                                                           // a finger tap puts the tile in the plan
      expect(r.store.get().plan.tiles.length).toBe(1);
      expect(r.root.querySelector('#confirm .cancel') !== null).toBe(true);        // something waiting: the x takes it back
      expect(r.root.querySelector('#confirm .done')).toBe(null);
      touchTick(r);
      expect(buildingAt(r.world, 14, 9).type).toBe('house');
      const s = r.store.get();
      expect([s.mode, s.tool && s.tool.kind, s.plan]).toEqual(['drawing', 'houses', null]);   // the tool stays after a touch tick (the drawing tools' mode)
      const done = r.root.querySelector('#confirm .done');
      expect(done.textContent).toBe(W.done);
      expect(done.getAttribute('aria-label')).toBe(W.doneLabel);
      expect(done.tagName).toBe('BUTTON');
      const box = done.getBoundingClientRect();
      expect([box.width >= 43.5, box.height >= 43.5]).toEqual([true, true]);
      expect(r.root.querySelector('#legend .strip.spots') !== null).toBe(true);    // the spots are on and the legend has the guidance row
      expect(document.body.dataset.guidance).toBe('legend');
      fire(done, 'click');
      expect([r.store.get().mode, r.store.get().tool]).toEqual(['browse', null]);
      expect(r.root.querySelector('#legend .strip.spots')).toBe(null);        // it ends with the tool
      expect(r.root.querySelector('#confirm').hidden).toBe(true);
    } finally { r.cleanup(); }
  });
  it('gives way to an overlay: with an overlay on, the overlay legend has the row', async () => {
    const r = await houseTool();
    try {
      expect(r.root.querySelector('#legend .strip.spots') !== null).toBe(true);
      r.store.set({ overlay: 'water' });
      expect(r.root.querySelector('#legend .strip.spots')).toBe(null);
      expect(r.root.querySelector('#legend .strip') !== null).toBe(true);
    } finally { r.cleanup(); }
  });
  it('is for houses only: a touch tick still ends a road, a building and Demolish', async () => {
    for (const tool of [{ kind: 'road' }, { kind: 'building', type: 'well' }, { kind: 'demolish' }]) {
      const r = await rigUI({ world: runningUiWorld() });
      try {
        r.ui.placement.start(tool);
        r.frame(0);
        if (tool.kind === 'building') r.tap(5, 8);
        else if (tool.kind === 'road') { r.tap(16, 12); r.tap(16, 14); }
        else r.tap(12, 9);
        expect([tool.kind, r.store.get().plan !== null || r.store.get().ghost !== null]).toEqual([tool.kind, true]);
        touchTick(r);
        const s = r.store.get();
        expect([tool.kind, s.mode, s.tool]).toEqual([tool.kind, 'browse', null]);
        expect(r.root.querySelector('#confirm .done')).toBe(null);
      } finally { r.cleanup(); }
    }
  });
  it('lays another plot on the next tick with the tool still on, and the tip waits for Done', async () => {
    let t = 0;
    const r = await rigUI({ world: runningUiWorld(), now: () => t });
    try {
      settle(r.world, []);                                                    // finish what the test city already meets, so placing raises no goal events
      t = TIP_FIRST_DELAY_MS;
      r.ui.placement.start({ kind: 'houses' });
      r.tap(14, 9); touchTick(r);
      r.tap(15, 9); touchTick(r);
      expect([buildingAt(r.world, 14, 9).type, buildingAt(r.world, 15, 9).type, r.store.get().tool.kind]).toEqual(['house', 'house', 'houses']);
      expect(r.ui.tips.current()).toBe(null);                                 // a tool is active: the tip waits
      fire(r.root.querySelector('#confirm .done'), 'click');
      expect(r.ui.tips.current()).toBe('house_spots');
    } finally { r.cleanup(); }
  });
  it('lets the Play tip (a priority tip) show over the legend on a phone while the game is paused, and the legend returns once it is gone', async () => {
    const r = await rigUI({ world: uiWorld() });                              // paused, as a new city is
    try {
      r.ui.placement.start({ kind: 'houses' });
      r.ui.placement.pointAt(14, 9);
      r.ui.placement.pointAt(15, 9);
      expect(r.ui.placement.confirm().ok).toBe(true);
      expect(r.ui.tips.current()).toBe('press_play');
      r.frame(16);
      expect(document.body.dataset.guidance).toBe('tip');                     // "Press Play so people can move in" is the row's
      expect(r.root.querySelector('#tip').textContent).toContain(TIP_TEXT.press_play);
      expect(r.store.get().tool.kind).toBe('houses');
      r.ui.speedControl.set(1);                                               // its condition clears
      r.frame(32);
      expect([document.body.dataset.guidance, r.store.get().tool && r.store.get().tool.kind, r.root.querySelector('#legend').children.length]).toEqual(['legend', 'houses', 1]);
      expect(r.root.querySelector('#legend .strip.spots') !== null).toBe(true);
    } finally { r.cleanup(); }
  });
  it('stops marking a tile once a plot stands on it', async () => {
    const r = await houseTool();
    try {
      const before = houseSpots(r.world).tiles.has(14 + 9 * 32);
      r.tap(14, 9); touchTick(r);
      expect([before, houseSpots(r.world).tiles.has(14 + 9 * 32)]).toEqual([true, false]);
    } finally { r.cleanup(); }
  });
});
