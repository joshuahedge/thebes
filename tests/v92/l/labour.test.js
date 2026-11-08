// Version 9.2 Track L (design 2.6; ruling 1758): until the city is a Town, services rank ahead of safety for workers; from Town, 9.1's order. The short workplace's alert names who took
// its workers. The lesson's steps are all still reached (tests/v92/l/pins.test.js and tests/v91/f/lesson.test.js walk them).
import { describe, it, expect } from '../../harness.js';
import { assignLabour, isWorking, priorityOrder, workersWentTo } from '../../../src/sim/labour.js';
import { alertText } from '../../../src/ui/text.js';
import { alertsFor } from '../../../src/sim/alerts.js';
import { makeTestWorld, setRoad, addRaw } from '../../helpers/testWorld.js';

// A 50-person city (20 workers) with a farm and granary (16 essential jobs), a firehouse (4 safety), a bazaar and a temple (6 and 6 services).
function city(milestone) {
  const w = makeTestWorld();
  setRoad(w, 0, 10, 31, 10);
  addRaw(w, 'house', 20, 11, { tier: 4, residents: 50 });
  w.milestone = milestone;
  const b = {
    farm: addRaw(w, 'farm_grain', 2, 8), granary: addRaw(w, 'granary', 5, 8), firehouse: addRaw(w, 'firehouse', 8, 9),   // (a 1x1 must stand on the row beside the road, y 9)
    bazaar: addRaw(w, 'bazaar', 12, 8), temple: addRaw(w, 'temple', 16, 8),
  };
  assignLabour(w);
  return { w, b };
}

describe('v92 l labour: services before safety until Town (D1, ruling 1758)', () => {
  it('a 50-person Village staffs the bazaar and the temple, not the firehouse', () => {
    const { w, b } = city('village');
    expect([b.farm.staff, b.granary.staff, b.bazaar.staff, b.temple.staff, b.firehouse.staff]).toEqual([10, 6, 2, 2, 0]);
    expect([isWorking(w, b.bazaar), isWorking(w, b.temple), isWorking(w, b.firehouse)]).toEqual([true, true, false]);
    expect(priorityOrder(w)).toEqual(['essential', 'services', 'safety', 'industry', 'monuments']);
  });

  it('the same city as a Town (and later) is 9.1\'s order: the firehouse first', () => {
    for (const rank of ['town', 'market_town']) {
      const { w, b } = city(rank);
      expect([rank, b.farm.staff, b.granary.staff, b.firehouse.staff, b.bazaar.staff, b.temple.staff]).toEqual([rank, 10, 6, 4, 0, 0]);
      expect([rank, isWorking(w, b.firehouse), isWorking(w, b.bazaar)]).toEqual([rank, true, false]);
    }
  });

  it('the short workplace\'s alert says who took its workers, from what the sim assigned', () => {
    const t = city('town'), v = city('village');
    const say = (c, b) => alertText(alertsFor(c.w).find((a) => a.code === 'understaffed' && a.id === b.id), c.w).fix;
    expect(say(t, t.b.bazaar)).toBe('Its workers went to the firehouse first. More homes bring more workers');
    expect(say(v, v.b.firehouse)).toBe('Its workers went to the bazaar first. More homes bring more workers');
    expect([workersWentTo(t.w, t.b.farm), workersWentTo(v.w, v.b.temple)]).toEqual([null, 'farm_grain']);
  });

  it('with workers to spare nobody is short and the order changes nothing', () => {
    const w = makeTestWorld();
    setRoad(w, 0, 10, 31, 10);
    addRaw(w, 'house', 20, 11, { tier: 4, residents: 200 });
    const fire = addRaw(w, 'firehouse', 8, 9), baz = addRaw(w, 'bazaar', 12, 8);
    assignLabour(w);
    expect([fire.staff, baz.staff, w.labour.shortLevels]).toEqual([4, 6, []]);
  });
});
