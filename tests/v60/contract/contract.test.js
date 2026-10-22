// Version 6.0 Track 0 (the contract, rulings 620-639): world version 9 and MIGRATIONS[8]. A new city has the reign, the demands and the
// dangers' records and the grace of three game years; a version 8 city keeps its merged homes, its rank and its treasury, and new dangers
// wait three game years from the day it is loaded.
import { describe, it, expect } from '../../harness.js';
import { makeTestWorld, addRaw } from '../../helpers/testWorld.js';
import { createWorld, WORLD_VERSION, STAGE47_TALLY, STAGE60_TALLY, newTally, makeBuilding, insertBuilding } from '../../../src/sim/world.js';
import { serialize, deserialize, validateWorld, REQUIRED, TALLY_KEYS, unpackSave, packSave } from '../../../src/save/serialize.js';
import { MIGRATIONS, CURRENT_VERSION, migrate } from '../../../src/save/migrate.js';
import { V60_TALLY } from '../../../src/data/v60.js';
import { REIGN_TALLY, newReignState, newDemandState, DEMAND_KINDS } from '../../../src/data/reign.js';
import { HAZARD_TALLY, HAZARD_KINDS, GRACE_DAYS, newHazardState } from '../../../src/data/hazards.js';
import { LARGE_TALLY } from '../../../src/data/largePlots.js';
import { mergeHouses, MERGE_TIER } from '../../../src/sim/merge.js';
import { dangerDraws } from '../../../src/sim/hazards.js';
import { isLargePlot, isMergedHome } from '../../../src/sim/largePlots.js';
import { advanceDays } from '../../../src/sim/clock.js';
import { buildSampleCity } from '../../../src/dev/sampleCity.js';
import { TIERS } from '../../../src/data/housing.js';

const NEW_KEYS = ['reign', 'demands', 'hazards'];
const YEAR = 360;

// A version 8 save: a Capital with 12,345 gold on day 2,000 and a home merged under the old rule (four Townhouses into a Manor), none of
// the version 9 fields.
function v8City() {
  const w = makeTestWorld({ gold: 12345 });
  const plots = [[4, 11], [5, 11], [4, 12], [5, 12]].map(([x, y]) => addRaw(w, 'house', x, y, { tier: MERGE_TIER - 1, residents: TIERS[MERGE_TIER - 1].capacity }));
  const manor = mergeHouses(w, plots[0], { x: 4, y: 11 });
  w.milestone = 'capital';
  w.day = 2000;
  const v8 = JSON.parse(serialize(w));
  for (const k of NEW_KEYS) delete v8[k];
  for (const k of STAGE60_TALLY) delete v8.tally[k];
  v8.version = 8;
  return { v8, manorId: manor.id };
}

describe('v60 contract world v9', () => {
  it('creates a version 9 world: no great work, no demands, every danger quiet, the grace three game years, the new tallies at 0', () => {
    const w = createWorld({ seed: 4 });
    expect([WORLD_VERSION, w.version, CURRENT_VERSION]).toEqual([9, 9, 9]);
    expect(Object.keys(w).sort()).toEqual([...REQUIRED].sort());
    for (const k of NEW_KEYS) expect(REQUIRED).toContain(k);
    expect([w.reign, w.demands, w.hazards]).toEqual([newReignState(), newDemandState(), newHazardState(GRACE_DAYS)]);
    expect([GRACE_DAYS, w.hazards.graceUntil]).toEqual([3 * YEAR, 3 * YEAR]);
    expect(HAZARD_KINDS).toEqual(['plague', 'drought', 'locusts']);
    for (const k of HAZARD_KINDS) expect(w.hazards[k]).toEqual({ warning: null, active: null, nextDay: null, last: null });
    expect(DEMAND_KINDS).toEqual(['goods', 'gold', 'building', 'soldiers']);
    expect(STAGE60_TALLY).toEqual([...REIGN_TALLY, ...HAZARD_TALLY, ...LARGE_TALLY]);
    expect(STAGE60_TALLY).toEqual(V60_TALLY);
    for (const k of V60_TALLY) { expect([k, w.tally[k]]).toEqual([k, 0]); expect(TALLY_KEYS).toContain(k); }
    expect(new Set(TALLY_KEYS).size).toBe(TALLY_KEYS.length);
    expect(w.tally).toEqual(newTally());
    // No building gets a new field: a home's large and rubble's was are set only by Tracks C and B1.
    for (const t of ['house', 'rubble', 'granary']) { const b = makeBuilding(w, t, 2, 2); expect([t, 'large' in b, 'was' in b]).toEqual([t, false, false]); }
    expect(validateWorld(JSON.parse(serialize(w)))).toBe(true);
    expect(JSON.parse(serialize(w))).toEqual(w);
  });

  it('checks the reign, the demands, the dangers, a Large plot\'s flag and rubble\'s was', () => {
    const bad = (fn) => {
      const w = createWorld({ seed: 3 });
      const h = insertBuilding(w, makeBuilding(w, 'house', 5, 5));
      const r = insertBuilding(w, makeBuilding(w, 'rubble', 9, 9));
      const o = JSON.parse(serialize(w));
      fn(o, h.id, r.id);
      return validateWorld(o);
    };
    const demand = { id: 1, kind: 'goods', good: 'linen', amount: 400, day: 10, due: 370, accepted: false };
    expect(bad(() => {})).toBe(true);
    expect(bad((o, h, r) => {
      o.reign = { greatWork: 4, won: 900, closed: true }; o.demands = { open: [demand], nextDay: 400, nextId: 2, log: [{ id: 0, result: 'met' }] };
      o.hazards.plague.active = { homes: [h] }; o.hazards.drought.warning = { day: 5, strikes: 95 }; o.hazards.locusts.nextDay = 700;
      o.buildings[h].large = true; o.buildings[r].was = { type: 'potter', x: 9, y: 9, w: 2, d: 2, rot: 0, day: 30, cause: 'wreck' };
    })).toBe(true);
    expect(bad((o, h, r) => { o.buildings[h].large = false; o.buildings[r].was = null; })).toBe(true);
    expect([
      bad((o) => { delete o.reign; }), bad((o) => { o.reign.won = 'today'; }), bad((o) => { o.reign.closed = 0; }), bad((o) => { o.reign.greatWork = 1.5; }),
      bad((o) => { delete o.demands; }), bad((o) => { o.demands.open = [{ ...demand, kind: 'people' }]; }), bad((o) => { o.demands.open = [{ ...demand, due: null }]; }),
      bad((o) => { o.demands.nextId = 0; }), bad((o) => { o.demands.log = {}; }),
      bad((o) => { delete o.hazards; }), bad((o) => { o.hazards.graceUntil = null; }), bad((o) => { delete o.hazards.plague; }),
      bad((o) => { o.hazards.drought.warning = 3; }), bad((o) => { o.hazards.locusts.nextDay = 1.5; }),
      bad((o, h) => { o.buildings[h].large = 'yes'; }), bad((o, h, r) => { o.buildings[r].large = true; }),
      bad((o, h, r) => { o.buildings[r].was = 'potter'; }), bad((o, h) => { o.buildings[h].was = null; }),
    ]).toEqual(new Array(18).fill(false));
  });

  it('migrates 8 to 9: the merged home, the rank and the treasury kept, nothing else touched, the new records new, tallies at 0', () => {
    const { v8, manorId } = v8City();
    const before = JSON.stringify(v8);
    const v9 = MIGRATIONS[8](v8);
    expect(JSON.stringify(v8)).toBe(before);                                          // the migration copies, never edits the save
    expect(v9.version).toBe(9);
    expect(Object.keys(v9).sort()).toEqual([...REQUIRED].sort());
    expect(v9.buildings).toEqual(v8.buildings);                                         // every building as it was: no flag added
    const manor = v9.buildings[manorId];
    expect([manor.w, manor.d, manor.tier, manor.residents, isMergedHome(manor), isLargePlot(manor)]).toEqual([2, 2, MERGE_TIER, 4 * TIERS[MERGE_TIER - 1].capacity, true, false]);
    expect([v9.milestone, v9.gold, v9.day]).toEqual(['capital', 12345, 2000]);
    for (const k of Object.keys(v8)) if (!['version', 'tally'].includes(k)) expect([k, v9[k]]).toEqual([k, v8[k]]);
    expect([v9.reign, v9.demands]).toEqual([newReignState(), newDemandState()]);
    expect(v9.hazards).toEqual(newHazardState(2000 + GRACE_DAYS));                     // three game years from the load, not from day 0
    for (const k of V60_TALLY) expect([k, v9.tally[k]]).toEqual([k, 0]);
    for (const k of STAGE47_TALLY) expect([k, v9.tally[k]]).toEqual([k, v8.tally[k]]);
    expect(validateWorld(v9)).toBe(true);
    expect(migrate(v8)).toEqual(v9);
    const back = deserialize(JSON.stringify(v8));                                       // loading runs the chain
    expect([back.version, back.gold, back.milestone, back.buildings[manorId].w]).toEqual([9, 12345, 'capital', 2]);
    const packed = unpackSave(packSave(v8, { savedAt: 1760000000000, lastSpeed: 2 }));
    expect([packed.world.version, packed.world.hazards.graceUntil]).toEqual([9, 2000 + GRACE_DAYS]);
  });

  it('keeps the new dangers away for three game years from the load, and from a new city\'s start', () => {
    const { v8 } = v8City();
    const w = deserialize(JSON.stringify(v8));
    const at = (world, day) => { world.day = day; return dangerDraws(world); };
    expect([at(w, 2000).open, at(w, 2000 + GRACE_DAYS - 1).open, at(w, 2000 + GRACE_DAYS).open]).toEqual([false, false, true]);
    expect([at(w, 2000).daysLeft, at(w, 2000 + GRACE_DAYS + 5).daysLeft]).toEqual([GRACE_DAYS, 0]);
    const fresh = createWorld({ seed: 4 });
    expect([at(fresh, 0).open, at(fresh, 3 * YEAR - 1).open, at(fresh, 3 * YEAR).open]).toEqual([false, false, true]);
    // A day's play draws as before: the stubs leave every new record untouched (classic at Normal draws as today).
    const city = createWorld({ seed: 11 });
    buildSampleCity(city);
    const records = JSON.stringify([city.reign, city.demands, city.hazards]);
    advanceDays(city, 65);
    expect(JSON.stringify([city.reign, city.demands, city.hazards])).toBe(records);
  });

  it('reports a malformed version 8 save as corrupt, not as a failed migration', () => {
    let msg = null;
    try { deserialize(JSON.stringify({ version: 8 })); } catch (e) { msg = e.message; }
    expect(msg).toBe('corrupt_save');
  });
});
