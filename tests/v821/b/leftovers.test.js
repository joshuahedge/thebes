// Version 8.2.1, the same day (rulings 1369-1370): the two places ruling 1367 left pointing a little off. A home left short because its bazaar sells out now says so
// (8.2.1: "Food arrives at the next delivery"), and the "Get food to the bazaar" goal's Show me follows its alert's cause as the alert list's does
// (8.2.1: always the granary card at the bazaar).
import { describe, it, expect } from '../../harness.js';
import { needCause } from '../../../src/sim/housing.js';
import { restockBazaars } from '../../../src/sim/distribution.js';
import { monthlyHousing } from '../../../src/sim/housing.js';
import { triggerEventGoals, goalById } from '../../../src/sim/goals.js';
import { causeFix } from '../../../src/sim/advice.js';
import { causeText } from '../../../src/ui/text.js';
import { showMeTarget } from '../../../src/ui/goalsList.js';
import { openSheet } from '../../../src/ui/modes.js';
import { makeTestWorld, setRoad, addRaw, staffAll } from '../../helpers/testWorld.js';
import { rigUI } from '../../helpers/uiWorld.js';
import { fire } from '../../helpers/dom.js';

// The bazaar test's town (tests/v821/b/bazaar.test.js): road along y = 10, the bazaar at (9, 11), its granary beside it at (11, 11), Manors along the road.
const SPOTS = [[2, 8], [4, 8], [6, 8], [8, 8], [10, 8], [12, 8], [14, 8], [16, 8], [18, 8], [13, 11], [15, 11], [7, 11], [17, 11], [5, 11]];
function town({ manors = 0, grain = 600 } = {}) {
  const w = makeTestWorld();
  setRoad(w, 0, 10, 31, 10);
  const bazaar = addRaw(w, 'bazaar', 9, 11);
  const store = addRaw(w, 'granary', 11, 11);
  store.store.grain = grain;
  const homes = SPOTS.slice(0, manors).map(([x, y]) => addRaw(w, 'house', x, y, { tier: 6, w: 2, d: 2, residents: 100, stockedFor: 100 }));
  staffAll(w);
  return { w, bazaar, store, homes };
}
const month = (w) => { restockBazaars(w); monthlyHousing(w); };
const centre = (b) => ({ x: b.x + b.w / 2, y: b.y + b.d / 2 });

describe('v821 b leftovers: a home short at a sold-out bazaar', () => {
  it('says its bazaar sells out and asks for a second bazaar, not "next delivery"', () => {
    const { w, bazaar, homes } = town({ manors: 14 });                              // 350 a month, a 300 shelf: two homes go without
    month(w);
    const short = homes.filter((h) => !(h.stock.grain > 0));
    expect(short.length).toBe(2);
    const cause = needCause(w, short[0], 'food');
    expect(cause).toEqual({ code: 'bazaar_sold_out', id: bazaar.id });
    expect(causeText(cause, w, 'food')).toEqual({ cause: 'Its bazaar sells out before every home is fed', fix: 'Build a second bazaar near these homes' });
    expect(causeFix(w, cause).item).toBe('bazaar');
  });
  it('a home waiting on a bazaar that will not sell out still reads "next delivery"', () => {
    const { w, bazaar, homes } = town({ manors: 4 });                               // a new bazaar, not restocked yet
    expect(needCause(w, homes[0], 'food')).toEqual({ code: 'next_delivery', id: bazaar.id });
  });
});

describe('v821 b leftovers: the bazaar goal\'s Show me follows the cause', () => {
  it('aims at the paused granary, the empty granary\'s farm place, or the granary card at the bazaar', () => {
    const { w, bazaar, store } = town({ manors: 2, grain: 0 });
    const goal = goalById('fix_bazaar');
    store.paused = true;
    expect(showMeTarget(w, goal)).toEqual(centre(store));                           // granary_idle: the granary to resume
    store.paused = false;
    expect(showMeTarget(w, goal)).toEqual(centre(store));                           // granary_empty: a farm by the granary
    w.buildings[store.id] = undefined; delete w.buildings[store.id];
    for (let i = 0; i < w.occ.length; i++) if (w.occ[i] === store.id) w.occ[i] = 0;
    expect(showMeTarget(w, goal)).toEqual(centre(bazaar));                          // no store near: a granary by the bazaar
  });
  it('in the goals sheet: Show me selects a paused granary, and opens the farm card for an empty one', async () => {
    const { w, store } = town({ manors: 2, grain: 0 });
    store.paused = true;
    expect(triggerEventGoals(w)).toEqual(['fix_bazaar']);
    const r = await rigUI({ width: 1280, height: 800, world: w });
    try {
      const press = () => {
        r.store.set(openSheet(r.store.get(), 'goals'));
        const row = [...r.root.querySelectorAll('#sheet .goals .goal')].find((li) => li.textContent.includes('Get food to the bazaar'));
        fire(row.querySelector('.show-me'), 'click');
      };
      press();
      expect(r.store.get().selectedId).toBe(store.id);
      store.paused = false;
      r.ui.refresh();
      press();
      expect([r.store.get().mode, r.store.get().tool.type]).toEqual(['placing', 'farm_grain']);
      r.ui.placement.cancel();
    } finally { r.cleanup(); }
  });
});
