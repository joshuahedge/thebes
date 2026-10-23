// Version 6.0, the balance pass (wave 4; rulings 780-782): two places the balance runs found Advice or Show me saying what the sim would not do, each set up both ways.
//   - Harvest now (ruling 780): while locusts or blight are warned, Advice names a farm for Harvest now only when the sim takes it (harvestQuote ok). A farm whose stores have no room, or
//     that stands idle, is counted as stuck, not offered; when none can, the item has no fix and its words say so (it used to name the first farm whatever the quote said).
//   - Show me in deep debt (ruling 782): below the debt floor no tile "fits" for lack of gold, so the ghost stayed where it started and Show me said "Something is already here" for a tower or a
//     physician; the nearest tile that fits the ground now takes the ghost and the confirm bar says what it costs. Within the floor nothing changes.
import { describe, it, expect } from '../../harness.js';
import { hazardItems } from '../../../src/sim/hazards.js';
import { harvestQuote } from '../../../src/sim/production.js';
import { canPlace } from '../../../src/sim/commands.js';
import { nearestFit } from '../../../src/ui/placement.js';
import { showMeRefusal } from '../../../src/ui/adviceUi.js';
import { adviceWords } from '../../../src/ui/adviceText.js';
import { BUILDINGS } from '../../../src/data/buildings.js';
import { ECONOMY } from '../../../src/data/economy.js';
import { GRACE_DAYS } from '../../../src/data/hazards.js';
import { makeTestWorld, setRoad, addRaw } from '../../helpers/testWorld.js';

// A Town with a granary on a road and three staffed grain farms in a warned band (the older crops test's layout).
function warnedBand() {
  const w = makeTestWorld();
  setRoad(w, 0, 13, 31, 13);
  setRoad(w, 0, 19, 9, 19);
  setRoad(w, 9, 13, 9, 19);
  w.milestone = 'town';
  w.day = GRACE_DAYS + 30;
  const granary = addRaw(w, 'granary', 10, 11, { store: { grain: 100 }, staff: BUILDINGS.granary.workers });
  const farms = [[0, 14], [2, 14], [4, 14]].map(([x, y]) => addRaw(w, 'farm_grain', x, y, { staff: BUILDINGS.farm_grain.workers }));
  w.hazards.locusts.warning = { day: w.day, strikes: w.day + 30, kind: 'locusts', farms: farms.map((f) => f.id), centre: { x: 3, y: 15 }, early: [] };
  return { w, granary, farms };
}
const locustItem = (w) => { const out = []; hazardItems(w, [], out); return out.find((i) => i.kind === 'locusts'); };

describe('v60 balance refusals harvest now in the advice', () => {
  it('names the first farm the sim takes, and counts none stuck', () => {
    const { w, farms } = warnedBand();
    const a = locustItem(w);
    expect([a.fix.select, a.fix.why, a.data.early, a.data.stuck, harvestQuote(w, farms[0]).ok]).toEqual([farms[0].id, 'harvest', 0, 0, true]);
    expect(adviceWords(a, w).fix).toBe('Open a farm and Harvest now');
  });

  it('skips an idle farm for one that can harvest, and counts it stuck', () => {
    const { w, farms } = warnedBand();
    farms[0].staff = 0;
    expect(harvestQuote(w, farms[0]).reason).toBe('idle');
    const a = locustItem(w);
    expect([a.fix.select, a.data.early, a.data.stuck]).toEqual([farms[1].id, 0, 1]);
    expect(harvestQuote(w, w.buildings[a.fix.select]).ok).toBe(true);
  });

  it('offers no farm when no store has room: no fix, and words that say why', () => {
    const { w, granary, farms } = warnedBand();
    granary.store.grain = BUILDINGS.granary.capacity;
    expect(farms.map((f) => harvestQuote(w, f).reason)).toEqual(['no_room', 'no_room', 'no_room']);
    const a = locustItem(w);
    expect([a.fix, a.data.early, a.data.stuck]).toEqual([null, 0, 3]);
    expect(adviceWords(a, w).fix).toBe('No named farm can take Harvest now: its stores are full or it stands idle');
  });

  it('says every farm is harvested once each has been, and then none is stuck', () => {
    const { w, farms } = warnedBand();
    w.hazards.locusts.warning.early = farms.map((f) => f.id);
    const a = locustItem(w);
    expect([a.fix, a.data.early, a.data.stuck]).toEqual([null, 3, 0]);
    expect(adviceWords(a, w).fix).toBe('Every farm in the band has been harvested');
  });
});

describe('v60 balance refusals show me in deep debt', () => {
  // A Capital with a house on the tile the search starts from, so "already here" would be the wrong reason for a tile beside it.
  function town(gold) {
    const w = makeTestWorld({ gold });
    w.milestone = 'capital';
    setRoad(w, 0, 20, 31, 20);
    addRaw(w, 'house', 14, 14);
    return w;
  }
  const around = { x: 14.5, y: 14.5 };

  it('lands the ghost on the nearest free tile and refuses nothing while the treasury is within the debt floor', () => {
    const w = town(100);
    const spot = nearestFit(w, { kind: 'building', type: 'tower' }, around.x - 0.5, around.y - 0.5, null, w.size);
    expect([canPlace(w, 'tower', spot.x, spot.y, { roadLater: true }).ok, showMeRefusal(w, 'tower', around)]).toEqual([true, null]);
  });

  it('lands it on a free tile below the floor too, where the placing rule says no gold (not that something is there), and Show me does not call it a refusal', () => {
    const w = town(ECONOMY.debtFloor - 4000);
    const spot = nearestFit(w, { kind: 'building', type: 'tower' }, around.x - 0.5, around.y - 0.5, null, w.size);
    const c = canPlace(w, 'tower', spot.x, spot.y, { roadLater: true });
    expect([c.ok, c.reason]).toEqual([false, 'no_gold']);
    expect(showMeRefusal(w, 'tower', around)).toBe(null);
    expect(showMeRefusal(w, 'physician', around)).toBe(null);
  });

  it('still refuses a tile that is really taken or the wrong ground, in debt or not', () => {
    for (const gold of [100, ECONOMY.debtFloor - 4000]) {
      const w = makeTestWorld({ gold });
      w.milestone = 'capital';
      for (let y = 0; y < w.size; y++) for (let x = 0; x < w.size; x++) if (!w.occ[y * w.size + x]) addRaw(w, 'house', x, y);   // no free tile anywhere
      expect([gold, showMeRefusal(w, 'tower', around) !== null]).toEqual([gold, true]);
    }
  });
});
