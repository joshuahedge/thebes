// Version 6.0, Wave 4 fix batch 1 (track C's part; ruling 792 and the review's minors): a burnt Large plot is one empty Large lot again, the lot's readiness is kept for the day while the
// buildings stand as they are, the advice asks once whether a Large plot stands, a Large plot below a Manor counts four plots' room for the "full home" first, the Manor goal's Show me
// does not point at a card the dock hides, a locked layer says why on a tap, a warned road preview keeps its warning over a bridge, Home progress's tick says a Townhouse on a small plot
// grows no further, and Show me for a tower leaves out a spot with no road while one with a road fits. Each set up both ways.
import { describe, it, expect } from '../../harness.js';
import { makeTestWorld, setRoad, addRaw, staffAll } from '../../helpers/testWorld.js';
import { mount, fire } from '../../helpers/dom.js';
import { TIERS } from '../../../src/data/housing.js';
import { LARGE_PLOT } from '../../../src/data/largePlots.js';
import { MILESTONES } from '../../../src/data/progression.js';
import { lotReady, stockLot, capacityOf } from '../../../src/sim/housing.js';
import { burnBuilding } from '../../../src/sim/fire.js';
import { noteLargePlotUnlock, isLot, isLargePlot } from '../../../src/sim/largePlots.js';
import { place } from '../../../src/sim/commands.js';
import { hasLargePlot } from '../../../src/sim/advice.js';
import { firstMet } from '../../../src/sim/firsts.js';
import { FIRSTS } from '../../../src/data/firsts.js';
import { nextItemFor, goalById } from '../../../src/sim/goals.js';
import { housesOf, removeBuilding, buildingsVersion, touchBuildings } from '../../../src/sim/world.js';
import { createLayersPicker } from '../../../src/ui/layersPicker.js';
import { createStore, INITIAL_UI_STATE } from '../../../src/ui/store.js';
import { createPlacement, ghostsFor, toolPreview, nearestFit } from '../../../src/ui/placement.js';
import { OVERLAY_NAMES, LAYERS_LOCKED_TEXT, V50_LAYERS_TEXT, OVERLAY_LEGEND, NEED_NAMES, CAUSE_TEXT, TIP_TEXT } from '../../../src/ui/text.js';
import { LAYER_UNLOCK } from '../../../src/data/layers.js';
import { T } from '../../../src/sim/terrain.js';
import { idx } from '../../../src/sim/grid.js';
import { canPlace } from '../../../src/sim/commands.js';

const lay = (w, terrain, x0, y0, x1, y1) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) w.terrain[idx(w.size, x, y)] = terrain; };

// A street where a lot at (12, 11) has every need of a Manor met (the lot rules' own rig), with a Townhouse elsewhere that has unlocked the card.
function served() {
  const w = makeTestWorld();
  setRoad(w, 0, 10, 31, 10);
  addRaw(w, 'house', 28, 11, { tier: 5, residents: 10, stockedFor: 10, stock: { grain: 3, pottery: 1 } });
  const parts = {
    well: addRaw(w, 'well', 12, 9), temple: addRaw(w, 'temple', 15, 8), booth: addRaw(w, 'booth', 14, 9), bazaar: addRaw(w, 'bazaar', 9, 11),
    statue1: addRaw(w, 'statue', 11, 11), statue2: addRaw(w, 'statue', 11, 12),
  };
  parts.bazaar.store.grain = 200;
  parts.bazaar.store.pottery = 100;
  staffAll(w);
  noteLargePlotUnlock(w);
  w.mood = 80;
  return { w, parts };
}
const lotAt = (w, x = 12, y = 11) => w.buildings[place(w, LARGE_PLOT.type, x, y, { roadLater: true }).id];

describe('v60 c fix: a burnt Large plot is one empty Large lot (ruling 792)', () => {
  it('lays one empty 2x2 lot, still marked large, in the place of a Large plot that burns down, whether it had people or was a lot', () => {
    for (const people of [0, 12]) {
      const { w } = served();
      const lot = lotAt(w);
      if (people) { lot.tier = 6; lot.residents = people; }
      const events = [], burned = w.tally.burned;
      const to = burnBuilding(w, lot.id, events);
      expect([people, to.length]).toEqual([people, 1]);
      const fresh = w.buildings[to[0]];
      expect([fresh.type, fresh.x, fresh.y, fresh.w, fresh.d, fresh.large, fresh.tier, fresh.residents]).toEqual(['house', 12, 11, 2, 2, true, 0, 0]);
      expect([isLot(fresh), isLargePlot(fresh), w.buildings[lot.id] === undefined]).toEqual([true, true, true]);
      expect([w.tally.burned, events.map((e) => [e.type, e.to.length])]).toEqual([burned + 1, [['burned', 1]]]);
      for (let y = 11; y <= 12; y++) for (let x = 12; x <= 13; x++) expect([x, y, w.occ[y * w.size + x]]).toEqual([x, y, fresh.id]);   // the four tiles are the one lot's
    }
  });

  it('still lays four 1x1 plots for a home merged under the old rule, one plot for a small plot, and one rubble a tile for anything else', () => {
    const w = makeTestWorld();
    setRoad(w, 0, 10, 31, 10);
    const merged = addRaw(w, 'house', 4, 11, { w: 2, d: 2, tier: 6, residents: 8 });
    const toMerged = burnBuilding(w, merged.id, []);
    expect([toMerged.length, toMerged.map((id) => [w.buildings[id].type, w.buildings[id].w, w.buildings[id].large || false])]).toEqual([4, [['house', 1, false], ['house', 1, false], ['house', 1, false], ['house', 1, false]]]);
    const hut = addRaw(w, 'house', 10, 11, { tier: 2, residents: 5 });
    const toHut = burnBuilding(w, hut.id, []);
    expect([toHut.length, w.buildings[toHut[0]].w, w.buildings[toHut[0]].tier]).toEqual([1, 1, 0]);
    const store = addRaw(w, 'storehouse', 16, 11);
    const toStore = burnBuilding(w, store.id, []);
    expect([toStore.length, w.buildings[toStore[0]].type, w.buildings[toStore[0]].was.type]).toEqual([BUILDINGS_FOOT('storehouse'), 'rubble', 'storehouse']);
  });
});
function BUILDINGS_FOOT(type) { const b = { storehouse: [2, 2] }[type]; return b[0] * b[1]; }

describe('v60 c fix: a lot\'s readiness and the Large plot question are kept while the buildings stand as they are', () => {
  it('answers a lot\'s readiness from one record in a day, and anew when a building goes (the version moves), a day passes or a lot is stocked', () => {
    const { w, parts } = served();
    const lot = lotAt(w);
    expect(lotReady(w, lot)).toBe(true);
    parts.bazaar.store.pottery = 0;                                      // not a change the buildings' version sees: the day's answer stands
    expect(lotReady(w, lot)).toBe(true);
    w.day += 1;
    expect(lotReady(w, lot)).toBe(false);                                // a new day re-reads the bazaar's stall
    parts.bazaar.store.pottery = 100;
    removeBuilding(w, parts.statue1.id);
    removeBuilding(w, parts.statue2.id);                                 // the buildings changed: asked again at once, and the street is plain now
    expect(lotReady(w, lot)).toBe(false);
    const before = buildingsVersion(w);
    touchBuildings(w);
    expect(buildingsVersion(w)).toBe(before + 1);
    expect(lotReady(w, lotAt(w, 20, 11))).toBe(false);                    // another lot: its own answer
    stockLot(w, lot);                                                    // stocking a lot clears the record
    expect(lotReady(w, lot)).toBe(false);
  });

  it('knows whether a Large plot stands: none until one is laid, one once it is, and none again when it goes', () => {
    const { w } = served();
    expect(hasLargePlot(w)).toBe(false);
    expect(hasLargePlot(w)).toBe(false);
    const lot = lotAt(w);
    expect(hasLargePlot(w)).toBe(true);
    removeBuilding(w, lot.id);
    expect(hasLargePlot(w)).toBe(false);
  });
});

describe('v60 c fix: a Large plot below a Manor is full at four plots\' room, not one\'s', () => {
  it('is not a full home at one Townhouse\'s people, and is at four Townhouses\' (housing.js capacityOf, as every other rule reads it)', () => {
    const w = makeTestWorld();
    setRoad(w, 0, 10, 31, 10);
    const full = FIRSTS.find((f) => f.check && f.check.kind === 'fullHome');
    expect(full === undefined).toBe(false);
    const town = TIERS[LARGE_PLOT.unlockTier].capacity;
    const lot = addRaw(w, 'house', 12, 11, { w: 2, d: 2, tier: LARGE_PLOT.unlockTier, residents: town });
    lot.large = true;
    expect([capacityOf(lot), firstMet(w, full)]).toEqual([4 * town, null]);              // one plot's worth in a lot that holds four: not full
    lot.residents = 4 * town;
    const at = firstMet(w, full);
    expect(at).toEqual({ x: lot.x + 1, y: lot.y + 1 });
    const small = makeTestWorld();
    addRaw(small, 'house', 12, 11, { tier: 2, residents: TIERS[2].capacity });
    expect(firstMet(small, full)).toEqual({ x: 12.5, y: 11.5 });                          // an ordinary full home is as it was
  });
});

describe('v60 c fix: the Manor goal\'s Show me', () => {
  it('points at a plot while the Large plot card is hidden (no Townhouse yet), and at the card once it is there', () => {
    const goal = goalById('manor');
    expect(goal.showMe.item).toBe(LARGE_PLOT.type);
    const w = makeTestWorld();
    setRoad(w, 0, 10, 31, 10);
    addRaw(w, 'house', 12, 11, { tier: 4, residents: 10 });
    expect(nextItemFor(w, goal)).toBe('house');                                            // the card is not offered: send the player to the homes
    addRaw(w, 'house', 14, 11, { tier: 5, residents: 10 });                                // a Townhouse unlocks the card
    expect(nextItemFor(w, goal)).toBe(LARGE_PLOT.type);
    const kept = makeTestWorld();
    kept.tally.largeUnlocked = 1;                                                          // unlocked once, kept
    expect(nextItemFor(kept, goal)).toBe(LARGE_PLOT.type);
    expect(nextItemFor(w, goalById('great_capital'))).toBe('house');                       // other goals' Show me are as they were
  });
});

describe('v60 c fix: Home progress says a Townhouse on a small plot grows no further', () => {
  it('names the Townhouse in the legend\'s tick words, from the data', () => {
    const words = V50_LAYERS_TEXT.ready.words;
    expect(words).toContain(`a ${TIERS[LARGE_PLOT.unlockTier].name} on a small plot grows no further`);
    expect(words.startsWith('Tick: every need met')).toBe(true);
    expect(OVERLAY_LEGEND.progress[0]).toBe(words);
  });
});

// ── The layers picker: a locked layer says why ──
const cityAt = (milestone) => { const w = makeTestWorld(); w.milestone = milestone; setRoad(w, 0, 10, 31, 10); addRaw(w, 'house', 12, 11, { tier: 1, residents: 4 }); return w; };
function pickerRig(world) {
  const { root, cleanup } = mount();
  const store = createStore(INITIAL_UI_STATE);
  const picker = createLayersPicker({ store, world, restoreFocus: () => {} });
  root.append(picker.node);
  return { root, store, picker, cleanup() { picker.destroy(); cleanup(); } };
}

describe('v60 c fix: a tap on a locked layer says why', () => {
  it('shows the words in the popover (a polite status line) and picks nothing; a layer on offer picks as before and the line clears when the popover closes', () => {
    const r = pickerRig(cityAt('village'));
    try {
      r.store.set({ layersOpen: true });
      const note = r.picker.node.querySelector('.locked-note');
      expect([note.hidden, note.getAttribute('role'), note.getAttribute('aria-live')]).toEqual([true, 'status', 'polite']);
      const town = MILESTONES.find((m) => m.id === LAYER_UNLOCK.supply.milestone).name;
      fire(r.picker.node.querySelector('[data-layer="supply"]'), 'click');
      expect([note.hidden, note.textContent]).toEqual([false, `${OVERLAY_NAMES.supply}: Unlocks at ${town}`]);
      expect(note.textContent).toBe(`${OVERLAY_NAMES.supply}: ${LAYERS_LOCKED_TEXT.words('supply')}`);
      expect([r.store.get().overlay, r.store.get().layersOpen]).toEqual([null, true]);
      fire(r.picker.node.querySelector('[data-layer="workers"]'), 'click');
      expect(note.textContent).toBe(`${OVERLAY_NAMES.workers}: ${LAYERS_LOCKED_TEXT.words('workers')}`);       // the line follows the last layer tapped
      fire(r.picker.node.querySelector('[data-layer="progress"]'), 'click');
      expect([r.store.get().overlay, r.store.get().layersOpen]).toEqual(['progress', false]);
      expect([note.hidden, note.textContent]).toEqual([true, '']);
      r.store.set({ layersOpen: true });
      expect(note.hidden).toBe(true);                                                                           // reopened: no stale line
    } finally { r.cleanup(); }
    const t = pickerRig(cityAt('town'));
    try {
      t.store.set({ layersOpen: true });
      fire(t.picker.node.querySelector('[data-layer="supply"]'), 'click');
      expect([t.picker.node.querySelector('.locked-note').hidden, t.store.get().overlay]).toEqual([true, 'supply']);   // on offer: picked, nothing said
    } finally { t.cleanup(); }
  });
});

// ── A warned road preview keeps its warning over a bridge ──
describe('v60 c fix: a warned road preview over water', () => {
  it('draws a bridge tile only while the preview is clean: a warned one keeps its "warn" state on every tile', () => {
    const world = makeTestWorld({ fertile: [], gold: 5000 });
    lay(world, T.WATER, 18, 0, 20, 31);
    const store = createStore({ ...INITIAL_UI_STATE, inputType: 'mouse' });
    const pl = createPlacement({ world, store, afterCommand: () => {}, effects: null, now: () => 0, roadMode: { get: () => 'route', set: () => {} } });
    pl.start({ kind: 'road' });
    pl.setRoute(true);
    pl.pointAt(4, 14);
    pl.pointAt(26, 14);
    const preview = toolPreview(world, store.get());
    const clean = ghostsFor(world, store.get(), { ...preview, state: 'ok' });
    expect(clean.filter((s) => s.state === 'bridge').length).toBe(3);
    const warned = ghostsFor(world, store.get(), { ...preview, state: 'warn' });
    expect([warned.length, warned.filter((s) => s.state === 'bridge').length, warned.every((s) => s.state === 'warn')]).toEqual([clean.length, 0, true]);
    const bad = ghostsFor(world, store.get(), { ...preview, state: 'bad' });
    expect(bad.filter((s) => s.state === 'bridge').length).toBe(0);
  });
});

// ── Show me for a tower: a road beside it, if any spot has one ──
describe('v60 c fix: Show me for a tower prefers a spot with a road beside it (ruling 787)', () => {
  const TOWER = { kind: 'building', type: 'tower' };
  it('lands on the nearest spot with a road when a nearer one has none, and on the nearest spot at all when none has a road in reach', () => {
    const w = makeTestWorld({ gold: 5000 });
    w.milestone = 'market_town';
    setRoad(w, 0, 20, 31, 20);
    const roadless = canPlace(w, 'tower', 5, 5, { roadLater: true });
    expect([roadless.ok, roadless.warnings]).toEqual([true, ['needs_road']]);               // a spot far from the road only passes with a road to come
    const spot = nearestFit(w, TOWER, 5, 17, null, w.size);                                  // aimed beside the road: the nearest spot with one
    expect(canPlace(w, 'tower', spot.x, spot.y, { roadLater: true }).warnings).toEqual([]);
    expect(Math.abs(spot.y + 0.5 - 20) <= 2).toBe(true);
    const aimedUp = nearestFit(w, TOWER, 5, 12, null, w.size);                               // aimed 8 tiles off the road: the roadless tile under the aim is passed over for one with a road
    expect([aimedUp.y > 12, canPlace(w, 'tower', aimedUp.x, aimedUp.y, { roadLater: true }).warnings]).toEqual([true, []]);
    const aimedAway = nearestFit(w, TOWER, 5, 5, null, w.size);                              // aimed beyond the search's reach (10 rings): the nearest roadless spot is the fit, never none
    expect([aimedAway.x, aimedAway.y, canPlace(w, 'tower', aimedAway.x, aimedAway.y, { roadLater: true }).warnings]).toEqual([5, 5, ['needs_road']]);
    const bare = makeTestWorld({ gold: 5000 });
    bare.milestone = 'market_town';                                                          // no road anywhere: the nearest roadless spot, so Show me is never "something is already here"
    const fallback = nearestFit(bare, TOWER, 5, 5, null, bare.size);
    expect([fallback.x, fallback.y, canPlace(bare, 'tower', fallback.x, fallback.y, { roadLater: true }).ok]).toEqual([5, 5, true]);
    const farm = nearestFit(w, { kind: 'building', type: 'well' }, 5, 5, null, w.size);      // other buildings keep a roadless spot as ever
    expect([farm.x, farm.y]).toEqual([5, 5]);
  });
});

// ── A spot that lacks only the gold ──
describe('v60 c fix: a tile that lacks only the gold carries the warnings it would have with it', () => {
  it('is not taken for a clean fit when a tile with nothing to warn of lies further out (below the debt floor)', () => {
    const w = makeTestWorld({ gold: -9000 });
    w.milestone = 'market_town';
    setRoad(w, 0, 20, 31, 20);
    const aim = nearestFit(w, { kind: 'building', type: 'well' }, 5, 14, null, w.size);        // a well under the aim, 6 tiles off the road, would need one: the search runs on to a tile beside the road
    expect([canPlace(w, 'well', aim.x, aim.y, { roadLater: true }).reason, aim.y > 14, Math.abs(aim.y - 20) <= 1]).toEqual(['no_gold', true, true]);
    w.gold = 5000;                                                                            // with the gold in hand the same search lands on the same tile: nothing but the price differs
    const funded = nearestFit(w, { kind: 'building', type: 'well' }, 5, 14, null, w.size);
    expect([funded.x, funded.y]).toEqual([aim.x, aim.y]);
  });
});

describe('v60 c fix: the merge words that nothing says any more are gone', () => {
  it('has no name for a merge row and no cause for a missing square, and the tip says the Large plot', () => {
    expect(NEED_NAMES.merge).toBe(undefined);
    expect(CAUSE_TEXT.no_square).toBe(undefined);
    expect(TIP_TEXT.merging_homes).toContain('Large plot');
    expect(TIP_TEXT.merging_homes.includes('three plots')).toBe(false);
  });
});
