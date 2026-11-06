// Version 8.4 wave 0 (rulings 1460-1464; 1469 for the partner rows): the shared pieces the three tracks build on. No behaviour changes: an 8.3 city plays on as it did.
import { describe, it, expect } from '../../harness.js';
import { GOODS, RAW_GOODS, LUXURY_GOODS, ASKABLE_GOODS, HOUSEHOLD_GOODS } from '../../../src/data/goods.js';
import { BUILDINGS } from '../../../src/data/buildings.js';
import { GOOD_VALUE } from '../../../src/data/court.js';
import { PARTNERS, PRICE_DRIFT, DRIFT_LAST } from '../../../src/data/trade.js';
import { RAID_SALT } from '../../../src/data/raids.js';
import { V84_TALLY, LUXURY_GRACE_DAYS } from '../../../src/data/v84.js';
import { drawDrift } from '../../../src/sim/trade.js';
import { createRng, hash2 } from '../../../src/sim/rng.js';
import { createWorld, WORLD_VERSION, STAGE84_TALLY, newTally } from '../../../src/sim/world.js';
import { serialize, deserialize, validateWorld, REQUIRED, TALLY_KEYS } from '../../../src/save/serialize.js';
import { CURRENT_VERSION } from '../../../src/save/migrate.js';
import { nextRaidEntry } from '../../../src/sim/raids.js';
import { elephantRaid } from '../../../src/sim/armies.js';
import { raidSpoils } from '../../../src/sim/spoils.js';
import { raidReportExtras } from '../../../src/sim/elephants.js';
import { scoutWalkers } from '../../../src/render/scouts.js';
import { SFX } from '../../../src/audio/sfx.js';
import { CART_LOADS } from '../../../src/render/art/carts.js';
import { advanceDays } from '../../../src/sim/clock.js';
import { buildSampleCity } from '../../../src/dev/sampleCity.js';

// 8.3's drift: every partner's goods in PARTNERS order, buys then sells, with the 8.4 goods left out (they were appended to each list).
function drift83(seed, year) {
  const rng = createRng(Math.floor(hash2(seed, year, 7349) * 4294967296));
  const out = {};
  for (const [id, p] of Object.entries(PARTNERS)) {
    out[id] = {};
    for (const good of [...Object.keys(p.buys), ...Object.keys(p.sells)]) if (!DRIFT_LAST.includes(good)) out[id][good] = Math.round(rng.range(-PRICE_DRIFT, PRICE_DRIFT) * 1000) / 1000;
  }
  return out;
}

// The seed-11 sample Capital after 90 days, and the same city as a version 10 save (none of the version 11 fields).
function v10City() {
  const w = createWorld({ seed: 11 });
  buildSampleCity(w);
  advanceDays(w, 90);
  const v10 = JSON.parse(serialize(w));
  delete v10.luxuryFrom;
  for (const k of STAGE84_TALLY) delete v10.tally[k];
  v10.version = 10;
  return { w, v10 };
}

describe('v84 w0 goods: cedar, ivory and incense are the luxuries', () => {
  it('adds cedar and ivory as raw goods after incense, and flags all three', () => {
    // A 7.0 helper (tests/v70/e/helpers.js) deletes and puts back incense, which moves its key last in GOODS, so the live order is compared as a set.
    expect(Object.keys(GOODS).slice(-3).sort()).toEqual(['cedar', 'incense', 'ivory']);
    expect(LUXURY_GOODS).toEqual(['incense', 'cedar', 'ivory']);
    for (const g of LUXURY_GOODS) expect([g, GOODS[g].kind, GOODS[g].luxury, GOODS[g].perResidentPerMonth]).toEqual([g, 'raw', true, 0.01]);
    expect(RAW_GOODS.slice(-3)).toEqual(['incense', 'cedar', 'ivory']);
    expect(BUILDINGS.storehouse.stores.includes('cedar') && BUILDINGS.storehouse.stores.includes('ivory')).toBe(true);
    expect([GOOD_VALUE.cedar, GOOD_VALUE.ivory]).toEqual([45, 50]);
    expect([Boolean(CART_LOADS.cedar), Boolean(CART_LOADS.ivory)]).toEqual([true, true]);
  });
  it('never lets the court or a demand ask for cedar or ivory; incense stays askable as in 7.0', () => {
    expect(ASKABLE_GOODS).toEqual([...HOUSEHOLD_GOODS, 'clay', 'barley', 'flax', 'gems', 'incense']);
  });
});

describe('v84 w0 trade: Byblos and Nubia trade the new goods, and no 8.3 price moves', () => {
  it('has Byblos sell cedar and buy ivory, and Nubia sell ivory, above the arbitrage margin', () => {
    expect(PARTNERS.byblos.sells.cedar).toEqual({ price: 45, quota: 240 });
    expect(PARTNERS.byblos.buys.ivory).toEqual({ price: 40, quota: 80 });
    expect(PARTNERS.nubia.sells.ivory).toEqual({ price: 60, quota: 80 });
    expect(DRIFT_LAST).toEqual(['cedar', 'ivory']);
  });
  it('draws every 8.3 good the same drift as 8.3 did, years 1 to 30 on three seeds', () => {
    for (const seed of [1, 11, 20251027]) {
      for (let year = 1; year <= 30; year++) {
        const now = drawDrift(seed, year), then = drift83(seed, year);
        for (const [id, goods] of Object.entries(then)) for (const [good, d] of Object.entries(goods)) expect([seed, year, id, good, now[id][good]]).toEqual([seed, year, id, good, d]);
        for (const id of ['byblos', 'nubia']) for (const good of DRIFT_LAST) if (good in now[id]) expect(Math.abs(now[id][good]) <= PRICE_DRIFT).toBe(true);
      }
    }
  });
});

describe('v84 w0 save: world version 11', () => {
  it('creates a version 11 world with the new tallies at 0 and the luxury need counting from day 0', () => {
    const w = createWorld({ seed: 4 });
    expect([WORLD_VERSION, w.version, CURRENT_VERSION]).toEqual([11, 11, 11]);
    expect(Object.keys(w).sort()).toEqual([...REQUIRED].sort());
    expect(STAGE84_TALLY).toEqual(V84_TALLY);
    for (const k of V84_TALLY) { expect([k, w.tally[k]]).toEqual([k, 0]); expect(TALLY_KEYS).toContain(k); }
    expect(new Set(TALLY_KEYS).size).toBe(TALLY_KEYS.length);
    expect(w.tally).toEqual(newTally());
    expect(w.luxuryFrom).toBe(0);
    expect(validateWorld(JSON.parse(serialize(w)))).toBe(true);
  });
  it('refuses a world whose luxuryFrom is not a whole day', () => {
    for (const v of [-1, 1.5, '3', null]) {
      const o = JSON.parse(serialize(createWorld({ seed: 3 })));
      o.luxuryFrom = v;
      expect([v, validateWorld(o)]).toEqual([v, false]);
    }
  });
  it('loads an 8.3 (v10) city: the tallies at 0, the need from the load day + 360, and a year played as the 8.3 city plays it', () => {
    const { w, v10 } = v10City();
    const loaded = deserialize(JSON.stringify(v10));
    expect(loaded.version).toBe(11);
    expect(LUXURY_GRACE_DAYS).toBe(360);
    expect(loaded.luxuryFrom).toBe(v10.day + 360);
    for (const k of V84_TALLY) expect([k, loaded.tally[k]]).toEqual([k, 0]);
    expect(loaded.raid.nextWarnDay).toEqual(w.raid.nextWarnDay);
    w.luxuryFrom = loaded.luxuryFrom;
    expect(loaded).toEqual(w);
    advanceDays(w, 360);
    advanceDays(loaded, 360);
    expect(loaded).toEqual(w);
  });
});

describe('v84 w0 seams: each a stub with 8.3 behaviour', () => {
  it('registers the three raid salts, unique among all', () => {
    expect([RAID_SALT.elephant, RAID_SALT.panic, RAID_SALT.scouts]).toEqual([8109, 8110, 8111]);
    expect(new Set(Object.values(RAID_SALT)).size).toBe(Object.values(RAID_SALT).length);
  });
  it('draws the next raid entry as the warning always has', () => {
    const w = createWorld({ seed: 11 });
    const entries = w.raiderEntries;
    // Track E (ruling 1504): an elephant raid's index comes in from upriver instead (tests/v84/e); every other index draws as before.
    for (let i = 0; i < 12; i++) if (!elephantRaid(w, i)) expect(nextRaidEntry(w, i)).toEqual({ ...entries[Math.floor(hash2(w.seed, i, RAID_SALT.entry) * entries.length)] });
  });
  it('adds nothing to a report, leaves the world alone at a raid end, and draws no scouts', () => {
    const w = createWorld({ seed: 11 });
    const before = serialize(w);
    expect(raidReportExtras({ raiders: [] })).toEqual({});
    raidSpoils(w, { won: false }, false, []);       // Version 8.4 Track R: a lost raid leaves nothing (a beaten one leaves captured weapons: tests/v84/r/spoils.test.js)
    expect(serialize(w)).toBe(before);
    expect(scoutWalkers(w, 0, null)).toEqual([]);
  });
  it('has the trumpet and the fanfare, each filled by its track (their notes are tested in tests/v84/e and tests/v84/r/spoils.test.js)', () => {
    expect([SFX.trumpet.length > 0, SFX.fanfare.length > 0]).toEqual([true, true]);
  });
});
