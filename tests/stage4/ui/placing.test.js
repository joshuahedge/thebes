// Track C, Task C1: placing big footprints (spec 6.3 Ground, 6.5; rulings 226-234, 251, 252). Every chip and the confirm bar's
// line are the sim's own conditions in words (conditionsFor, workGoldPerUnit, desirabilityPreview, prestigeByKind), checked with
// the world set up both ways.
import { describe, it, expect } from '../../harness.js';
import { toolPreview, ghostsFor, nearestFit, fitRadiusOf, monumentLine } from '../../../src/ui/placement.js';
import { fitZoom, footprintExtent } from '../../../src/ui/monumentSheet.js';
import { roomTiles, drawGhost, drawOverlay, setPlacingRot } from '../../../src/render/overlays.js';
import { desirabilityPreview } from '../../../src/sim/desirability.js';
import { workGoldPerUnit } from '../../../src/sim/costs.js';
import { MONUMENTS } from '../../../src/data/monuments.js';
import { AUTO_OVERLAY, NEAREST_FIT_RADIUS } from '../../../src/data/ui.js';
import { ART } from '../../../src/render/art/registry.js';
import { MIN_ZOOM } from '../../../src/render/camera.js';
import { makeDraw } from '../../../src/render/art/ctx.js';
import { p } from '../../../src/render/iso.js';
import { idx } from '../../../src/sim/grid.js';
import { UI4_TEXT } from '../../../src/ui/text.js';
import { makeTestWorld, setRoad, addRaw } from '../../helpers/testWorld.js';
import { rigUI, uiWorld } from '../../helpers/uiWorld.js';
import { makeCanvas, pixelAt } from '../../helpers/canvas.js';
import { fire } from '../../helpers/dom.js';

// A Capital with both pyramids unlocked and a road along y = 10 (fertile land at x < 8).
function capital(gold = 20000) {
  const w = makeTestWorld({ gold });
  setRoad(w, 0, 10, 31, 10);
  w.milestone = 'capital';
  w.prestigeUnlocks.pyramid_small = 0;
  w.prestigeUnlocks.pyramid_great = 0;
  return w;
}
const preview = (w, type, x, y, rot = 0) => toolPreview(w, { tool: { kind: 'building', type, rot }, ghost: { x, y } });
const chips = (pv) => Object.fromEntries(pv.conditions.map((c) => [c.key, `${c.mark} ${c.text}`]));

describe('s4 ui monument chips', () => {
  it('words the ground: desert, or how many tiles are on the fields (coral, refused)', () => {
    const w = capital();
    expect(chips(preview(w, 'colossus', 20, 11)).ground).toBe('✓ Desert ground');
    const on = preview(w, 'colossus', 7, 11);                                      // x 7 is fertile, x 8 is not: 2 of 4
    expect([on.state, chips(on).ground]).toEqual(['bad', '✕ Not on the fields: 2 of 4 tiles are fertile']);
    expect(on.footprint.filter((t) => t.state === 'cant').length).toBe(2);
  });

  it('words the road as later, and the crew and supply only once a road touches it', () => {
    const w = capital();
    const far = preview(w, 'colossus', 20, 13);
    expect([far.state, chips(far)]).toEqual(['warn', { ground: '✓ Desert ground', road: '! No road yet: crews and stone come by road' }]);
    const near = preview(w, 'colossus', 20, 11);
    expect(chips(near)).toEqual({ ground: '✓ Desert ground', road: '✓ Road beside it', crew: "! No builders' guild near", supply: '! No stone near' });
    addRaw(w, 'builders_guild', 24, 11);
    addRaw(w, 'quarry', 27, 11);
    expect(chips(preview(w, 'colossus', 20, 11))).toEqual({ ground: '✓ Desert ground', road: '✓ Road beside it', crew: "✓ Crew: 1 builders' guild near", supply: '✓ Stone near' });
    addRaw(w, 'builders_guild', 14, 11);
    expect(chips(preview(w, 'colossus', 20, 11)).crew).toBe("✓ Crew: 2 builders' guilds near");
  });

  it('names the first course\'s materials: bricks for a mastaba, both for a pyramid', () => {
    const w = capital();
    expect(chips(preview(w, 'mastaba_small', 16, 11)).supply).toBe('! No bricks near');
    addRaw(w, 'brickworks', 20, 11);
    expect(chips(preview(w, 'mastaba_small', 16, 11)).supply).toBe('✓ Bricks near');
    expect(chips(preview(w, 'pyramid_small', 10, 11)).supply).toBe('! No stone near');
    addRaw(w, 'quarry', 24, 11);
    expect(chips(preview(w, 'pyramid_small', 10, 11)).supply).toBe('✓ Stone and bricks near');
  });

  it('shows the founding only when it would take the treasury below 0, and then refuses', () => {
    const w = capital(600);
    expect(chips(preview(w, 'colossus', 20, 11)).gold).toBe(undefined);
    w.gold = 599;
    const p1 = preview(w, 'colossus', 20, 11);
    expect([p1.state, chips(p1).gold]).toEqual(['bad', '✕ Founding 600 gold: you have 599']);
    w.gold = 640;
    expect(chips(preview(w, 'pyramid_great', 10, 11)).gold).toBe('✕ Founding 6,000 gold: you have 640');
  });
});

describe('s4 ui the monument line', () => {
  it('says the work gold a crew is paid a month from the sim, and what it does to the homes when finished and while building', () => {
    const w = capital();
    expect(monumentLine(w, 'colossus', 20, 11)).toBe(`then ${workGoldPerUnit(w) * 20} gold a crew a month`);
    expect(monumentLine(w, 'colossus', 20, 11)).toBe('then 100 gold a crew a month');
    w.difficulty = 'hard';
    expect(monumentLine(w, 'colossus', 20, 12)).toBe('then 125 gold a crew a month');
    w.difficulty = 'normal';
    for (const x of [17, 18, 19]) addRaw(w, 'house', x, 11, { tier: 2, residents: 5 });
    const done = desirabilityPreview(w, 'colossus', 20, 11), site = desirabilityPreview(w, 'colossus', 20, 11, { site: true });
    expect([done.better > 0, site.worse > 0]).toEqual([true, true]);
    expect(monumentLine(w, 'colossus', 20, 11)).toBe(`then 100 gold a crew a month · finished: ${done.better} homes nicer · while building: ${site.worse} homes less pleasant`);
  });

  it('says a second of a kind earns no prestige', () => {
    const w = capital();
    expect(monumentLine(w, 'obelisk_small', 20, 11).startsWith(UI4_TEXT.oneOfEach)).toBe(false);
    addRaw(w, 'obelisk_small', 28, 20);
    expect(monumentLine(w, 'obelisk_small', 20, 11)).toBe('One of each kind counts: no prestige · then 100 gold a crew a month');
  });

  it('rides in the confirm bar, after the score\'s part, while it can be placed or waits for its road', () => {
    const w = capital();
    const ok = preview(w, 'colossus', 20, 11), road = preview(w, 'colossus', 20, 13), bad = preview(w, 'colossus', 7, 11);
    expect([ok.line.endsWith(monumentLine(w, 'colossus', 20, 11)), road.line.endsWith(monumentLine(w, 'colossus', 20, 13)), bad.line]).toEqual([true, true, '']);
    expect(ok.nicer).toBe('');
  });
});

describe('s4 ui rotating, fitting and the silhouette', () => {
  it('searches 16 tiles for footprints of 3x3 and up and 10 below, and lands a pyramid on the nearest desert', () => {
    expect(['pyramid_great', 'pyramid_small', 'mastaba_large', 'palace', 'mastaba_small', 'colossus', 'obelisk_small'].map(fitRadiusOf)).toEqual([16, 16, 16, 16, NEAREST_FIT_RADIUS, NEAREST_FIT_RADIUS, NEAREST_FIT_RADIUS]);
    const w = makeTestWorld({ size: 48, fertile: [[0, 0, 13, 48]] });
    w.milestone = 'capital'; w.prestigeUnlocks.pyramid_great = 0;
    const tool = { kind: 'building', type: 'pyramid_great' };
    expect(nearestFit(w, tool, 0, 20)).toEqual({ x: 13, y: 20 });
    expect(nearestFit(w, tool, 0, 20, 10)).toEqual({ x: 0, y: 20 });          // within 10 nothing fits: it stays put
  });

  it('turns a mastaba\'s ghost a quarter about its centre tile with the bar\'s ⟳ and R, and founds it turned', async () => {
    const r = await rigUI({ width: 1280, height: 800, world: capital() });
    try {
      const { placement, store } = r.ui;
      placement.start({ kind: 'building', type: 'mastaba_small' });
      placement.moveGhost(20, 12);
      expect(placement.rotate()).toBe(true);
      expect([store.get().tool.rot, store.get().ghost]).toEqual([1, { x: 21, y: 11 }]);
      expect(placement.ghosts()[0].w * 10 + placement.ghosts()[0].d).toBe(23);
      const turn = r.root.querySelector('#confirm .rotate');
      expect(turn.disabled).toBe(false);
      fire(turn, 'click');
      expect([store.get().tool.rot, store.get().ghost]).toEqual([0, { x: 20, y: 12 }]);
      fire(r.root, 'keydown', { key: 'r' });
      expect(store.get().tool.rot).toBe(1);
      const res = placement.confirm();
      const b = r.world.buildings[res.id];
      expect([b.type, b.rot, b.w, b.d, b.x, b.y]).toEqual(['mastaba_small', 1, 2, 3, 21, 11]);
      expect(r.root.querySelector('#toasts').textContent.includes('Small mastaba founded')).toBe(true);
      placement.start({ kind: 'building', type: 'colossus' });
      expect([placement.rotate(), r.root.querySelector('#confirm .rotate')]).toEqual([false, null]);
    } finally { r.cleanup(); }
  });

  it('says a site placed with no road needs one, and keeps two chip rows for a monument', async () => {
    const r = await rigUI({ width: 390, height: 844, world: capital() });
    try {
      r.ui.placement.start({ kind: 'building', type: 'obelisk_small' });
      r.ui.placement.moveGhost(20, 14);
      expect(r.root.querySelector('#confirm .conds').classList.contains('tall')).toBe(true);
      expect(r.root.querySelector('#confirm .monument-line').textContent.endsWith('then 100 gold a crew a month')).toBe(true);
      r.ui.placement.confirm();
      expect(r.root.querySelector('#toasts').textContent.includes('Small obelisk founded · needs a road')).toBe(true);
    } finally { r.cleanup(); }
  });

  it('draws the finished monument\'s silhouette with the ghost', () => {
    const w = capital();
    const [shape] = ghostsFor(w, { tool: { kind: 'building', type: 'mastaba_small', rot: 1 }, ghost: { x: 20, y: 11 } });
    const b = shape.silhouette.b;
    expect([shape.w, shape.d, b.w, b.d, b.rot, b.site.course, b.site.done !== null, shape.silhouette.world === w]).toEqual([2, 3, 2, 3, 1, MONUMENTS.mastaba_small.courses.length, true, true]);
    expect(ghostsFor(w, { tool: { kind: 'building', type: 'granary' }, ghost: { x: 20, y: 11 } })[0].silhouette).toBe(undefined);
    const c = makeCanvas(240, 200), ctx = c.getContext('2d');
    const [ax, ay] = p(20, 11);
    ctx.translate(120 - 2 * ax, 120 - 2 * ay);
    drawGhost(makeDraw(ctx, 2), shape);
    let inked = 0;
    for (let y = 0; y < 110; y += 2) for (let x = 0; x < 240; x += 2) if (pixelAt(c, x, y)[3] > 0) inked++;   // above the footprint: the silhouette
    expect(inked).toBeGreaterThan(20);
  });

  it('fits the footprint and silhouette at the pick: just enough zoom out, never in, never past the least zoom', () => {
    const phone = { width: 390, height: 844 }, insets = { top: 100, right: 0, bottom: 240, left: 0 };
    const e = footprintExtent('pyramid_great');
    expect(e).toEqual({ up: ART.pyramid_great.height + 56, down: 56, across: 224 });
    const fit = fitZoom('pyramid_great', 0, 1, phone, insets);
    expect(fit).toEqual({ zoom: Math.min((390 - 96) / (224 * 2), (844 - 340 - 96) / ((e.up + e.down) * 2)), extent: { up: e.up, down: e.down } });
    expect(fit.zoom < 1).toBe(true);
    expect(fitZoom('pyramid_great', 0, 0.55, phone, insets)).toEqual({ extent: { up: e.up, down: e.down } });   // already fits: no zoom in
    expect(fitZoom('obelisk_small', 0, 1, phone, insets).zoom).toBe(undefined);
    expect(fitZoom('pyramid_great', 0, 1, { width: 200, height: 200 }, { top: 0, right: 0, bottom: 0, left: 0 }).zoom).toBe(MIN_ZOOM);
    expect(footprintExtent('mastaba_large', 1).across).toBe(footprintExtent('mastaba_large', 0).across);
  });

  it('grabExtent gives a monument drawn height (the art height, not footprintExtent up), the same turned, and null for anything else', async () => {
    const r = await rigUI({ world: uiWorld() });
    try {
      const m = r.ui.monumentUi;
      for (const type of ['pyramid_great', 'pyramid_small', 'mastaba_large']) {
        expect(m.grabExtent(type, 0)).toEqual({ up: ART[type].height });
        expect(m.grabExtent(type, 1)).toEqual({ up: ART[type].height });
        expect(m.grabExtent(type, 0).up < footprintExtent(type, 0).up).toBe(true);
      }
      expect(m.grabExtent('house', 0)).toBe(null);
      expect(m.grabExtent('nonsense', 0)).toBe(null);
    } finally { r.cleanup(); }
  });

  it('zooms the camera out once when a great pyramid\'s card is picked on a phone (a cut under Gentle)', async () => {
    const w = uiWorld();
    w.milestone = 'capital'; w.prestigeUnlocks.pyramid_small = 0; w.prestigeUnlocks.pyramid_great = 0; w.gold = 20000;
    const r = await rigUI({ width: 390, height: 844, world: w });
    try {
      r.ui.refresh();
      fire(r.root.querySelector('#dock .cat[data-category="monuments"]'), 'click');
      fire(r.root.querySelector('#dock .tray .card[data-item="pyramid_great"]'), 'click');
      expect([r.store.get().tool.type, r.store.get().overlay]).toEqual(['pyramid_great', 'ground']);
      expect([r.cam.zoom < 1, r.cam.zoom >= MIN_ZOOM]).toEqual([true, true]);
      const zoomed = r.cam.zoom;
      r.ui.placement.cancel();
      fire(r.root.querySelector('#dock .tray .card[data-item="obelisk_small"]'), 'click');
      expect(r.cam.zoom).toBe(zoomed);                                            // never zooms back in
    } finally { r.cleanup(); }
  });
});

describe('s4 ui the Ground overlay for a monument', () => {
  it('turns Ground on for every monument, and finds room on dry ground that is not the fields, in each rotation', () => {
    expect(Object.keys(MONUMENTS).every((k) => AUTO_OVERLAY[k] === 'ground')).toBe(true);
    const w = makeTestWorld({ fertile: [[0, 0, 8, 32], [10, 0, 22, 32]] });   // a desert strip two tiles wide, x 8 and 9
    expect([roomTiles(w, 'mastaba_small', 0).size, roomTiles(w, 'mastaba_small', 1).size]).toEqual([0, 64]);
    const open = makeTestWorld();
    const room = roomTiles(open, 'colossus');
    expect([room.has(idx(32, 8, 0)), room.has(idx(32, 7, 0))]).toEqual([true, false]);
    addRaw(open, 'granary', 20, 20);
    expect(roomTiles(open, 'colossus').has(idx(32, 20, 20))).toBe(false);        // worked out again once the buildings change
  });

  it('draws the room as a gold wash and says it in the legend: room, or none left in this rotation', async () => {
    const w = makeTestWorld({ gold: 20000, fertile: [[0, 0, 8, 32], [10, 0, 22, 32]] });
    w.milestone = 'great_city';
    const r = await rigUI({ width: 1280, height: 800, world: w });
    try {
      r.ui.placement.start({ kind: 'building', type: 'mastaba_small' }, { x: 8, y: 12 });
      const legend = () => r.root.querySelector('#legend').textContent;
      expect([r.store.get().overlay, legend().includes('Fertile: no monuments here'), legend().includes('No room left for a small mastaba')]).toEqual(['ground', true, true]);
      r.ui.placement.rotate();
      expect(legend().includes('Gold: room for a small mastaba')).toBe(true);
      r.ui.placement.start({ kind: 'building', type: 'farm_grain' }, { x: 2, y: 2 });
      expect(legend().includes('Rocky: mines')).toBe(true);
    } finally { r.cleanup(); }
    const c = makeCanvas(240, 200), ctx = c.getContext('2d');
    const [ax, ay] = p(8, 12);
    ctx.translate(120 - 2 * ax, 100 - 2 * ay);
    setPlacingRot(w, 1);
    drawOverlay(makeDraw(ctx, 2), w, 'ground', { x0: 0, y0: 0, x1: 31, y1: 31 }, 'mastaba_small');
    const [rr, gg, bb] = pixelAt(c, 120, 100 + 16);                              // the middle of tile (8, 12): gold over sand
    expect(rr > bb + 40 && gg > bb).toBe(true);
    setPlacingRot(w, 0);
  });
});
