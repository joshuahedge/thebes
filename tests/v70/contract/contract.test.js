// Version 7.0 Track 0 (the contract, rulings 858-869): world version 10 and MIGRATIONS[9]. A new city has trade's switches and floors (all on,
// none set) and the city events' record; a version 9 city keeps everything it had, gets every switch on and no floor, no event waiting, and no
// event for a game year from the day it is loaded; then it plays exactly as the city it was saved from.
import { describe, it, expect } from '../../harness.js';
import { createWorld, WORLD_VERSION, STAGE60_TALLY, STAGE70_TALLY, newTally, newTradeState } from '../../../src/sim/world.js';
import { serialize, deserialize, validateWorld, REQUIRED, TALLY_KEYS, unpackSave, packSave } from '../../../src/save/serialize.js';
import { MIGRATIONS, CURRENT_VERSION, migrate } from '../../../src/save/migrate.js';
import { V70_TALLY } from '../../../src/data/v70.js';
import { TRADE_TALLY, newTradeSettings, TRADE_SIDES } from '../../../src/data/trade.js';
import { CITY_EVENT_TALLY, EVENT_KINDS, EVENT_V9_WAIT, newEventState } from '../../../src/data/cityEvents.js';
import { advanceDays } from '../../../src/sim/clock.js';
import { buildSampleCity } from '../../../src/dev/sampleCity.js';

const YEAR = 360;

// The seed-11 sample Capital after 90 more days of play, and the same city as a version 9 save (none of the version 10 fields).
function v9City() {
  const w = createWorld({ seed: 11 });
  buildSampleCity(w);
  advanceDays(w, 90);
  const v9 = JSON.parse(serialize(w));
  delete v9.cityEvents;
  delete v9.trade.switches;
  delete v9.trade.floors;
  for (const k of STAGE70_TALLY) delete v9.tally[k];
  v9.version = 9;
  // Version 7.0 (Track E): the city events are live now, and a version 9 city meets none for a game year after its load, so the original is held the same
  // way (no event for a year, its tallies at 0) for the comparison of the year they both play (the changed test's reason).
  w.cityEvents = newEventState(w.day + EVENT_V9_WAIT);
  for (const k of CITY_EVENT_TALLY) w.tally[k] = 0;
  return { w, v9 };
}

describe('v70 contract world v10', () => {
  it('creates a version 10 world: every trade switch on, no floor, no event waiting, the new tallies at 0', () => {
    const w = createWorld({ seed: 4 });
    expect([WORLD_VERSION, w.version, CURRENT_VERSION]).toEqual([10, 10, 10]);
    expect(Object.keys(w).sort()).toEqual([...REQUIRED].sort());
    expect(REQUIRED).toContain('cityEvents');
    expect(REQUIRED.includes('events')).toBe(false);
    expect(JSON.stringify(w).includes('"events"')).toBe(false);                      // never a key the sim's per-tick events list could be mistaken for
    expect(w.trade).toEqual({ ...newTradeState(), switches: {}, floors: {} });
    expect(newTradeSettings()).toEqual({ switches: {}, floors: {} });
    expect(TRADE_SIDES).toEqual(['buys', 'sells']);
    expect(w.cityEvents).toEqual({ nextDay: 0, cooldowns: {}, waiting: null });
    expect(w.cityEvents).toEqual(newEventState());
    expect(EVENT_KINDS.length).toBe(16);                                              // Track E added the kinds (it was [] in the contract)
    expect(STAGE70_TALLY).toEqual([...TRADE_TALLY, ...CITY_EVENT_TALLY]);
    expect(STAGE70_TALLY).toEqual(V70_TALLY);
    for (const k of V70_TALLY) { expect([k, w.tally[k]]).toEqual([k, 0]); expect(TALLY_KEYS).toContain(k); }
    expect(new Set(TALLY_KEYS).size).toBe(TALLY_KEYS.length);
    expect(w.tally).toEqual(newTally());
    expect(validateWorld(JSON.parse(serialize(w)))).toBe(true);
    expect(JSON.parse(serialize(w))).toEqual(w);
  });

  it('checks the switches, the floors and the events record', () => {
    const bad = (fn) => {
      const o = JSON.parse(serialize(createWorld({ seed: 3 })));
      fn(o);
      return validateWorld(o);
    };
    expect(bad(() => {})).toBe(true);
    expect(bad((o) => {
      o.trade.switches = { memphis: { buys: { grain: false, pottery: true }, sells: { clay: false } }, nubia: { sells: { incense: false } } };
      o.trade.floors = { grain: 200, linen: 0, incense: 10 };
      o.cityEvents = { nextDay: 450, cooldowns: { envoy: 900, strike: 1200 }, waiting: { kind: 'envoy', day: 400, due: 460, gift: 300 } };
    })).toBe(true);
    expect([
      bad((o) => { delete o.trade.switches; }), bad((o) => { delete o.trade.floors; }),
      bad((o) => { o.trade.switches = []; }), bad((o) => { o.trade.switches = { memphis: { both: { grain: false } } }; }),
      bad((o) => { o.trade.switches = { memphis: { buys: { grain: 'off' } } }; }), bad((o) => { o.trade.switches = { memphis: true }; }),
      bad((o) => { o.trade.floors = { grain: -1 }; }), bad((o) => { o.trade.floors = { grain: 1.5 }; }), bad((o) => { o.trade.floors = { grain: null }; }),
      bad((o) => { delete o.cityEvents; }), bad((o) => { o.cityEvents.nextDay = null; }), bad((o) => { o.cityEvents.nextDay = 1.5; }),
      bad((o) => { o.cityEvents.cooldowns = []; }), bad((o) => { o.cityEvents.cooldowns = { envoy: 'soon' }; }),
      bad((o) => { o.cityEvents.waiting = 'envoy'; }), bad((o) => { o.cityEvents.waiting = { kind: 'envoy', day: 3 }; }), bad((o) => { o.cityEvents.waiting = { day: 3, due: 9 }; }),
    ]).toEqual(new Array(17).fill(false));
  });

  it('migrates 9 to 10: everything kept, every switch on, no floor, no event waiting and none for a game year from the load', () => {
    const { v9 } = v9City();
    const before = JSON.stringify(v9);
    const v10 = MIGRATIONS[9](v9);
    expect(JSON.stringify(v9)).toBe(before);                                          // the migration copies, never edits the save
    expect(v10.version).toBe(10);
    expect(Object.keys(v10).sort()).toEqual([...REQUIRED].sort());
    for (const k of Object.keys(v9)) if (!['version', 'tally', 'trade'].includes(k)) expect([k, v10[k]]).toEqual([k, v9[k]]);
    expect(v10.trade).toEqual({ ...v9.trade, switches: {}, floors: {} });             // routes, orders, drift and quota used as they were
    const day = v9.day;                                                               // the sample city's own start, 90 days on
    expect(day >= 90).toBe(true);
    expect([v10.day, v10.cityEvents]).toEqual([day, { nextDay: day + EVENT_V9_WAIT, cooldowns: {}, waiting: null }]);
    expect(EVENT_V9_WAIT).toBe(YEAR);
    for (const k of V70_TALLY) expect([k, v10.tally[k]]).toEqual([k, 0]);
    for (const k of STAGE60_TALLY) expect([k, v10.tally[k]]).toEqual([k, v9.tally[k]]);
    expect(validateWorld(v10)).toBe(true);
    expect(migrate(v9)).toEqual(v10);
    expect(deserialize(JSON.stringify(v9)).version).toBe(10);                         // loading runs the chain
    const packed = unpackSave(packSave(v9, { savedAt: 1760000000000, lastSpeed: 2 }));
    expect([packed.world.version, packed.world.cityEvents.nextDay]).toEqual([10, day + YEAR]);
  });

  it('loads a version 9 city that then plays a year exactly as the city it was saved from (the events record apart)', () => {
    const { w, v9 } = v9City();
    const day = v9.day;
    const loaded = deserialize(JSON.stringify(v9));
    advanceDays(loaded, YEAR);
    advanceDays(w, YEAR);
    expect([loaded.day, loaded.cityEvents]).toEqual([day + YEAR, { nextDay: day + YEAR, cooldowns: {}, waiting: null }]);   // no event drew in the year
    expect(w.cityEvents).toEqual(newEventState(day + YEAR));
    const strip = (world) => { const o = JSON.parse(serialize(world)); delete o.cityEvents; return o; };
    expect(strip(loaded)).toEqual(strip(w));
    expect(validateWorld(JSON.parse(serialize(loaded)))).toBe(true);
  });

  it('reports a malformed version 9 save as corrupt, not as a failed migration', () => {
    let msg = null;
    try { deserialize(JSON.stringify({ version: 9 })); } catch (e) { msg = e.message; }
    expect(msg).toBe('corrupt_save');
  });
});
