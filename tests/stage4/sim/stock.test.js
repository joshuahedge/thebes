import { describe, it, expect } from '../../harness.js';
import { MONUMENT } from '../../../src/data/monuments.js';
import { stockRoom, remainingNeed, monumentDay } from '../../../src/sim/monuments.js';
import { produceDay } from '../../../src/sim/production.js';
import { makeTestWorld, setRoad, addRaw } from '../../helpers/testWorld.js';

// A Capital with a road along y = 10 in the 32x32 test world (fertile land is x < 8; addRaw places anywhere).
function city() {
  const w = makeTestWorld({ gold: 100000 });
  setRoad(w, 0, 10, 31, 10);
  w.milestone = 'capital';
  return w;
}

describe('s4 sim the stockpile\'s limit', () => {
  it('shares the limit between the materials as the next work takes them, so the course under way is never starved by the other', () => {
    const w = city();
    const m = addRaw(w, 'mastaba_small', 12, 8);                                  // 3 brick courses of 540, then 540 stone
    expect(stockRoom(m)).toEqual({ stone: 0, bricks: 120 });                      // the next 120 units are all bricks
    Object.assign(m.site, { course: 2, laid: { stone: 0, bricks: 480 } });
    expect(stockRoom(m)).toEqual({ stone: 60, bricks: 60 });                      // 60 bricks end the course, then stone
    m.site.stock = { stone: 70, bricks: 10 };                                     // more stone than its share: none comes
    expect(stockRoom(m)).toEqual({ stone: 0, bricks: 50 });
    const p = addRaw(w, 'pyramid_small', 20, 6);                                  // 816 stone and 144 bricks a course
    expect(stockRoom(p)).toEqual({ stone: 136, bricks: 24 });
    const o = addRaw(w, 'obelisk_small', 26, 9);
    Object.assign(o.site, { course: 2, laid: { stone: 12, bricks: 0 } });
    expect(stockRoom(o)).toEqual({ stone: 8, bricks: 0 });                        // never more than its courses still need
  });

  it('never holds more than its limit or than its courses need, and moves from bricks to stone without waiting', () => {
    const w = city();
    for (const x of [8, 10, 14]) addRaw(w, 'builders_guild', x, 11, { staff: 16 });
    addRaw(w, 'quarry', 18, 11, { staff: 10 });
    addRaw(w, 'quarry', 20, 11, { staff: 10 });
    addRaw(w, 'brickworks', 22, 11, { staff: 8 });
    addRaw(w, 'brickworks', 24, 11, { staff: 8 });
    addRaw(w, 'storehouse', 26, 11, { staff: 6, store: { clay: 400 } });
    const m = addRaw(w, 'mastaba_small', 12, 8);
    Object.assign(m.site, { course: 2, laid: { stone: 0, bricks: 500 } });
    let worst = 0, over = 0;
    for (let d = 0; d < 60; d++) {
      produceDay(w);
      monumentDay(w);
      w.day += 1;
      const need = remainingNeed(m);
      worst = Math.max(worst, m.site.stock.stone + m.site.stock.bricks);
      over = Math.max(over, m.site.stock.stone - need.stone, m.site.stock.bricks - need.bricks);
    }
    expect([worst <= MONUMENT.stockPerCrew * 3 + 1e-9, over <= 1e-9, m.site.course, m.site.laid.stone > 30]).toEqual([true, true, 3, true]);
    expect(m.site.month.starvedDays).toBe(0);
  });
});
