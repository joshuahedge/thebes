// Version 6.0, Track A (rulings 640, 641): costs that grow with the city. costScale is the rank's row in COST_GROWTH, its growth over 1 times the
// difficulty's cost; each building is charged its upkeep and its staff's wages rounded to whole gold, and its card says that very bill.
import { describe, it, expect } from '../../harness.js';
import { makeTestWorld, setRoad, addRaw, staffAll } from '../../helpers/testWorld.js';
import { costScale, costOf, workGoldPerUnit } from '../../../src/sim/costs.js';
import { monthFigures, monthlyBill, balanceWith, biggestCost } from '../../../src/sim/economy.js';
import { tributeFor, towersNeeded } from '../../../src/sim/raids.js';
import { favourTributeFactor } from '../../../src/sim/court.js';
import { allBuildings } from '../../../src/sim/world.js';
import { lacksRoad } from '../../../src/sim/reach.js';
import { COST_GROWTH, COST_SCALE_NONE } from '../../../src/data/reign.js';
import { RAIDS } from '../../../src/data/raids.js';
import { BUILDINGS } from '../../../src/data/buildings.js';
import { ECONOMY } from '../../../src/data/economy.js';
import { MILESTONES } from '../../../src/data/progression.js';
import { MONUMENT, MONUMENTS } from '../../../src/data/monuments.js';
import { DIFFICULTIES, DIFFICULTY_ORDER } from '../../../src/data/difficulty.js';

function town(difficulty = 'normal') {
  const w = makeTestWorld({ size: 40, gold: 5000 });
  w.difficulty = difficulty;
  setRoad(w, 0, 10, 39, 10);
  addRaw(w, 'farm_grain', 2, 11);
  addRaw(w, 'granary', 6, 11);
  addRaw(w, 'storehouse', 9, 11);
  addRaw(w, 'potter', 12, 11);
  addRaw(w, 'builders_guild', 15, 11);
  addRaw(w, 'tower', 18, 11);
  for (let i = 0; i < 8; i++) addRaw(w, 'house', 14 + i, 9, { tier: 4, residents: 16 });
  staffAll(w);
  w.milestone = 'town';
  return w;
}
// The month's wages and upkeep, building by building, each rounded as the sim charges them.
function byBuilding(w) {
  const s = costScale(w);
  let wages = 0, upkeep = 0;
  for (const b of allBuildings(w)) {
    if (b.paused || lacksRoad(w, b)) continue;
    upkeep += Math.round(BUILDINGS[b.type].upkeep * s.upkeep);
    wages += Math.round(b.staff * ECONOMY.wagePerWorker * s.wages);
  }
  return { wages, upkeep };
}

describe('v60 a costs: the scale by rank and difficulty', () => {
  it('is the data\'s own at Village and Town, and grows from Market town to the Seat of the Two Lands, every multiplier at least the rank before', () => {
    const w = town();
    for (const id of ['village', 'town']) { w.milestone = id; expect([id, costScale(w)]).toEqual([id, COST_SCALE_NONE]); }
    let prev = COST_SCALE_NONE;
    for (const m of MILESTONES.slice(2)) {
      w.milestone = m.id;
      const s = costScale(w);
      expect([m.id, s]).toEqual([m.id, COST_GROWTH[m.id]]);                                 // Normal: the row itself
      for (const k of ['wages', 'upkeep', 'monuments', 'court']) expect([m.id, k, s[k] >= prev[k]]).toEqual([m.id, k, true]);
      prev = s;
    }
    expect(costScale(w).upkeep).toBeGreaterThan(1.2);
    expect(costScale(w).wages).toBeGreaterThan(1.05);
  });

  it('grows less on Relaxed and Peaceful and more on Hard: 1 + (row - 1) x the difficulty\'s cost', () => {
    for (const d of DIFFICULTY_ORDER) {
      const w = town(d);
      w.milestone = 'capital';
      const k = DIFFICULTIES[d].cost, row = COST_GROWTH.capital;
      expect([d, costScale(w).upkeep]).toEqual([d, 1 + (row.upkeep - 1) * k]);
      expect([d, costScale(w).court]).toEqual([d, 1 + (row.court - 1) * k]);
    }
    const at = (d) => { const w = town(d); w.milestone = 'seat'; return costScale(w).upkeep; };
    expect(at('relaxed')).toBeLessThan(at('normal'));
    expect(at('hard')).toBeGreaterThan(at('normal'));
  });
});

describe('v60 a costs: what a city pays', () => {
  it('charges each building its upkeep and wages rounded to whole gold, so the month\'s books are the buildings\' bills added up', () => {
    const w = town();
    const atTown = monthFigures(w);
    expect([atTown.wages, atTown.upkeep]).toEqual([byBuilding(w).wages, byBuilding(w).upkeep]);
    w.milestone = 'seat';
    const atSeat = monthFigures(w);
    expect([atSeat.wages, atSeat.upkeep]).toEqual([byBuilding(w).wages, byBuilding(w).upkeep]);
    expect(atSeat.upkeep).toBeGreaterThan(atTown.upkeep);
    expect(atSeat.wages).toBeGreaterThan(atTown.wages);
    expect(Number.isInteger(atSeat.wages) && Number.isInteger(atSeat.upkeep)).toBe(true);
    expect(atSeat.taxes).toBe(atTown.taxes);                                                 // taxes never grow with the rank
  });

  it('says on the card the bill the sim charges a fully staffed building, at Town the data\'s own and at the Seat more', () => {
    const w = town();
    for (const t of ['farm_grain', 'potter', 'tower', 'builders_guild']) expect([t, monthlyBill(t, w)]).toEqual([t, monthlyBill(t)]);
    w.milestone = 'seat';
    const s = costScale(w);
    for (const t of ['farm_grain', 'potter', 'tower']) {
      const def = BUILDINGS[t], bill = monthlyBill(t, w);
      expect([t, bill.upkeep, bill.wages]).toEqual([t, Math.round(def.upkeep * s.upkeep), Math.round(def.workers * ECONOMY.wagePerWorker * s.wages)]);
      expect([t, bill.bill > monthlyBill(t).bill]).toEqual([t, true]);
    }
    const potter = allBuildings(w).find((b) => b.type === 'potter');
    expect(biggestCost(w).cost).toBeGreaterThanOrEqual(monthlyBill(potter.type, w).bill);
    expect(balanceWith(w, 'potter')).toBeLessThan(monthFigures(w).net);
  });

  it('prices monuments and the raid tribute by the rank: the great temple at the Seat costs more than at Capital prices, the tribute grows with the court', () => {
    const w = town();
    w.milestone = 'capital';
    const capital = { found: costOf(w, 'colossus'), work: workGoldPerUnit(w), tribute: tributeFor(w, 18) };
    expect(capital.found).toBe(Math.round(MONUMENTS.colossus.founding * COST_GROWTH.capital.monuments));
    expect(capital.work).toBe(MONUMENT.goldPerUnit * COST_GROWTH.capital.monuments);
    expect(capital.tribute).toBe(Math.round(favourTributeFactor(w) * RAIDS.tributeShare * towersNeeded(18) * costOf(w, 'tower') * COST_GROWTH.capital.court));
    w.milestone = 'seat';
    expect(costOf(w, 'colossus')).toBeGreaterThan(capital.found);
    expect(workGoldPerUnit(w)).toBeGreaterThan(capital.work);
    expect(tributeFor(w, 18)).toBeGreaterThan(capital.tribute);
    expect(costOf(w, 'great_temple')).toBe(Math.round(MONUMENTS.great_temple.founding * COST_GROWTH.seat.monuments));
    w.milestone = 'town';
    expect(costOf(w, 'colossus')).toBe(MONUMENTS.colossus.founding);
  });
});
