// Version 8.2.1 Track B (rulings 1360-1366): a player kept being told "Bazaar has no food: build a granary" with a granary right beside it. In 8.2 the alert
// fired whenever a working bazaar's shelf held no food, whatever the reason, and always asked for a granary. These tests set each case up through the
// sim, in runMonth's own order (restockBazaars, then monthlyHousing: the homes take their month the moment the shelf is filled):
//   - the homes it serves eat as much as its shelf holds: the shelf is empty all month though every home is fed (8.2: bazaar_empty, a false alarm);
//   - they eat more than its shelf holds, the granary full: the last homes go short (8.2: bazaar_empty, "build a granary");
//   - a new bazaar beside a full granary, not restocked yet (8.2: bazaar_empty until the month's end);
//   - the granary beside it is empty, paused or short of workers, or stands near it but is not joined to it by road (8.2: bazaar_empty, "build a granary").
// Now the alert is raised only when it is true, and says the cause, from the sim's own bazaarFoodProblem.
import { describe, it, expect } from '../../harness.js';
import { alertsFor } from '../../../src/sim/alerts.js';
import { bazaarFoodProblem } from '../../../src/sim/bazaarFood.js';
import { needCause } from '../../../src/sim/housing.js';
import { restockBazaars } from '../../../src/sim/distribution.js';
import { monthlyHousing } from '../../../src/sim/housing.js';
import { triggerEventGoals } from '../../../src/sim/goals.js';
import { causeFix } from '../../../src/sim/advice.js';
import { BUILDINGS } from '../../../src/data/buildings.js';
import { alertText, causeText } from '../../../src/ui/text.js';
import { bazaarFix } from '../../../src/ui/threatFix.js';
import { openSheet } from '../../../src/ui/modes.js';
import { makeTestWorld, setRoad, addRaw, staffAll } from '../../helpers/testWorld.js';
import { rigUI } from '../../helpers/uiWorld.js';
import { fire } from '../../helpers/dom.js';

// Road along y = 10. The bazaar at (9, 11), its granary right beside it at (11, 11). Manors (100 people, 25 food a month each) along the road, all
// within the bazaar's reach; a granary of 600 grain.
const SPOTS = [[2, 8], [4, 8], [6, 8], [8, 8], [10, 8], [12, 8], [14, 8], [16, 8], [18, 8], [13, 11], [15, 11], [7, 11], [17, 11], [5, 11]];
function town({ manors = 0, granary = true, grain = 600 } = {}) {
  const w = makeTestWorld();
  setRoad(w, 0, 10, 31, 10);
  const bazaar = addRaw(w, 'bazaar', 9, 11);
  const store = granary ? addRaw(w, 'granary', 11, 11) : null;
  if (store) store.store.grain = grain;
  const homes = SPOTS.slice(0, manors).map(([x, y]) => addRaw(w, 'house', x, y, { tier: 6, w: 2, d: 2, residents: 100, stockedFor: 100 }));
  staffAll(w);
  return { w, bazaar, store, homes };
}
const month = (w) => { restockBazaars(w); monthlyHousing(w); };   // runMonth's order (src/sim/clock.js)
const foodAlerts = (w) => alertsFor(w).filter((a) => a.code === 'bazaar_empty' || a.code === 'bazaar_sold_out');

describe('v821 b the bazaar food alert: no false alarm', () => {
  it('a bazaar whose homes eat its whole shelf each month, every home fed, raises nothing (8.2 said "Bazaar has no food" all month)', () => {
    const { w, bazaar, homes } = town({ manors: 12 });                              // 12 x 25 = 300: the shelf's grain
    month(w);
    expect([bazaar.store.grain, homes.every((h) => h.stock.grain === 25)]).toEqual([0, true]);
    expect([foodAlerts(w), bazaarFoodProblem(w, bazaar)]).toEqual([[], null]);
  });
  it('a new bazaar beside a full granary, its homes waiting for the first delivery, raises nothing: the month\'s end fills it', () => {
    const { w, bazaar } = town({ manors: 4 });
    expect(bazaar.store.grain || 0).toBe(0);
    expect(foodAlerts(w)).toEqual([]);
  });
  it('a bazaar that sells out with homes left short, the granary still full: bazaar_sold_out, with the numbers', () => {
    const { w, bazaar, homes } = town({ manors: 14 });                              // 350 a month, a 300 shelf
    month(w);
    expect(homes.filter((h) => (h.stock.grain || 0) < 25).length).toBe(2);
    expect(foodAlerts(w)).toEqual([{ code: 'bazaar_sold_out', id: bazaar.id, need: 350, stock: BUILDINGS.bazaar.stock.grain }]);
    expect(alertText(foodAlerts(w)[0], w)).toEqual({ title: 'Bazaar sells out before its homes are fed', fix: 'Its homes eat 350 food a month and it stocks 300: build a second bazaar near them' });
    expect(triggerEventGoals(w)).toEqual([]);                                       // not "Get food to the bazaar": food reaches it
    addRaw(w, 'bazaar', 19, 11); staffAll(w);                                        // a second bazaar shares the homes
    expect(foodAlerts(w).filter((a) => a.id === bazaar.id)).toEqual([]);
  });
});

describe('v821 b the bazaar food alert names the real cause', () => {
  it('homes short and the granary running low: granary_low, with what fills it', () => {
    const { w, bazaar, store } = town({ manors: 14, grain: 400 });                  // 300 to the shelf, 100 left: under the next month's 350
    month(w);
    expect(foodAlerts(w)).toEqual([{ code: 'bazaar_empty', id: bazaar.id, reason: 'granary_low', store: store.id, maker: 'none' }]);
    expect(alertText(foodAlerts(w)[0], w)).toEqual({ title: 'The granary by the bazaar runs low', fix: 'Nothing fills it: build a farm within 12 road tiles of it' });
  });
  it('an empty granary: granary_empty, and what fills it: nothing, a farm that cannot keep up, or one that is paused or short', () => {
    const { w, bazaar, store } = town({ manors: 2, grain: 0 });
    const alert = () => foodAlerts(w)[0];
    expect(alert()).toEqual({ code: 'bazaar_empty', id: bazaar.id, reason: 'granary_empty', store: store.id, maker: 'none' });
    expect(alertText(alert(), w)).toEqual({ title: 'The granary by the bazaar is empty', fix: 'Nothing fills it: build a farm within 12 road tiles of it' });
    const farm = addRaw(w, 'farm_grain', 0, 11); staffAll(w);                       // within its producer reach of the granary
    expect(alert()).toEqual({ code: 'bazaar_empty', id: bazaar.id, reason: 'granary_empty', store: store.id, maker: 'slow' });
    expect(alertText(alert(), w).fix).toBe('What fills it cannot keep up: build another farm within 12 road tiles of it');
    farm.paused = true;
    expect(alert()).toEqual({ code: 'bazaar_empty', id: bazaar.id, reason: 'granary_empty', store: store.id, maker: 'idle', makerId: farm.id });
    expect(alertText(alert(), w).fix).toBe('The grain farm that fills it is paused: resume it');
    farm.paused = false; farm.staff = 2;
    expect(alertText(alert(), w).fix).toBe('The grain farm that fills it is short of workers: more homes bring more workers');
    farm.staff = BUILDINGS.farm_grain.workers;
    store.store.grain = 20;                                                          // some food, less than the two homes' 50: still short
    expect(alert()).toEqual({ code: 'bazaar_empty', id: bazaar.id, reason: 'granary_low', store: store.id, maker: 'slow' });
    store.store.grain = 50;                                                          // enough for the next delivery: the trouble is over (the goal's noAlert)
    expect(foodAlerts(w)).toEqual([]);
  });
  it('a paused or short-staffed granary: granary_idle, worded by its state', () => {
    const { w, bazaar, store } = town({ manors: 2, grain: 0 });
    store.paused = true;
    expect(foodAlerts(w)).toEqual([{ code: 'bazaar_empty', id: bazaar.id, reason: 'granary_idle', store: store.id }]);
    expect(alertText(foodAlerts(w)[0], w)).toEqual({ title: 'The granary by the bazaar is paused', fix: 'Resume it' });
    store.paused = false; store.staff = 1;
    expect(alertText(foodAlerts(w)[0], w)).toEqual({ title: 'The granary by the bazaar is short of workers', fix: 'More homes bring more workers' });
  });
  it('a granary beside it with no road, or on another road: granary_apart; none near at all keeps 8.2\'s words', () => {
    const r = town({ manors: 2, granary: false });
    expect(foodAlerts(r.w)).toEqual([{ code: 'bazaar_empty', id: r.bazaar.id }]);
    expect(alertText(foodAlerts(r.w)[0], r.w)).toEqual({ title: 'Bazaar has no food', fix: 'Build a granary within 16 road tiles: grain farms, fig orchards, hunting lodges and fishing wharves fill it' });
    const beside = addRaw(r.w, 'granary', 11, 12, { store: { grain: 600 } }); staffAll(r.w);   // touching the bazaar, but no road beside it
    expect(foodAlerts(r.w)).toEqual([{ code: 'bazaar_empty', id: r.bazaar.id, reason: 'granary_apart', store: beside.id }]);
    expect(alertText(foodAlerts(r.w)[0], r.w)).toEqual({ title: 'The granary near the bazaar is not joined to it by road', fix: 'Lay a road between them, 16 road tiles at most' });
    const o = town({ manors: 2, granary: false });
    setRoad(o.w, 5, 20, 20, 20);                                                    // a road of its own, never joined to y = 10
    const apart = addRaw(o.w, 'granary', 11, 18, { store: { grain: 600 } }); staffAll(o.w);
    expect(foodAlerts(o.w)).toEqual([{ code: 'bazaar_empty', id: o.bazaar.id, reason: 'granary_apart', store: apart.id }]);
    setRoad(o.w, 13, 11, 13, 19);                                                   // joined: 9 road tiles
    expect(foodAlerts(o.w)).toEqual([]);
  });
  it('the real causes still raise bazaar_empty, so the first one brings the "Get food to the bazaar" goal', () => {
    const { w } = town({ manors: 2, grain: 0 });
    expect(triggerEventGoals(w)).toEqual(['fix_bazaar']);
  });
});

describe('v821 b the home\'s food cause and Advice', () => {
  it('a home whose bazaar has only an unjoined granary near it: granary_apart (View it), not "build a granary"', () => {
    const { w, bazaar, homes } = town({ manors: 1, granary: false });
    expect(needCause(w, homes[0], 'food')).toEqual({ code: 'bazaar_empty', id: bazaar.id });
    const beside = addRaw(w, 'granary', 11, 12); staffAll(w);
    const cause = needCause(w, homes[0], 'food');
    expect(cause).toEqual({ code: 'granary_apart', id: beside.id });
    expect(causeText(cause, w, 'food')).toEqual({ cause: 'The granary near its bazaar is not joined to it by road', fix: 'Lay a road between them' });
    expect(causeFix(w, cause)).toEqual({ view: true });
  });
});

describe('v821 b the alert list\'s Show me for the bazaar', () => {
  it('aims at the cause: the granary, the farm, or the card it needs', () => {
    const { w, bazaar, store } = town({ manors: 2, grain: 0 });
    expect(bazaarFix(w, { code: 'bazaar_empty', id: bazaar.id })).toEqual({ showMe: { category: 'food', item: 'granary', x: 10, y: 12 } });
    expect(bazaarFix(w, { code: 'bazaar_empty', id: bazaar.id, reason: 'granary_idle', store: store.id })).toEqual({ view: store.id });
    expect(bazaarFix(w, { code: 'bazaar_empty', id: bazaar.id, reason: 'granary_apart', store: store.id })).toEqual({ view: store.id });
    expect(bazaarFix(w, { code: 'bazaar_empty', id: bazaar.id, reason: 'granary_empty', store: store.id, maker: 'none' })).toEqual({ showMe: { category: 'food', item: 'farm_grain', x: 12, y: 12 } });
    expect(bazaarFix(w, { code: 'bazaar_empty', id: bazaar.id, reason: 'granary_empty', store: store.id, maker: 'idle', makerId: 99 })).toEqual({ view: 99 });
    expect(bazaarFix(w, { code: 'bazaar_sold_out', id: bazaar.id, need: 350, stock: 300 })).toEqual({ showMe: { category: 'services', item: 'bazaar', x: 10, y: 12 } });
    expect(bazaarFix(w, { code: 'no_road', id: bazaar.id })).toBe(null);
  });
  it('in the alert list: Show me selects a paused granary, and opens the farm card for an empty one', async () => {
    const { w, store } = town({ manors: 2, grain: 0 });
    store.paused = true;
    const r = await rigUI({ width: 1280, height: 800, world: w });
    try {
      r.store.set(openSheet(r.store.get(), 'minimap'));
      const row = (words) => [...r.root.querySelectorAll('#sheet .alert-list li')].find((li) => li.textContent.includes(words));
      const btn = row('The granary by the bazaar is paused').querySelector('.show-me');
      expect(btn.getAttribute('aria-label')).toBe('Show me: Resume it');
      const box = btn.getBoundingClientRect();
      expect([box.width >= 44, box.height >= 44]).toEqual([true, true]);
      fire(btn, 'click');
      expect(r.store.get().selectedId).toBe(store.id);
      store.paused = false;
      r.ui.refresh();
      r.store.set(openSheet(r.store.get(), 'minimap'));
      fire(row('The granary by the bazaar is empty').querySelector('.show-me'), 'click');
      expect([r.store.get().mode, r.store.get().tool.type]).toEqual(['placing', 'farm_grain']);
      r.ui.placement.cancel();
    } finally { r.cleanup(); }
  });
});
