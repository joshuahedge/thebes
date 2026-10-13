// The salt table (Stage 4.6, Track 0): every hash2 salt the game draws with, old and new, is unique, so no two kinds of draw share a
// stream. Each track's salts live in its own data file (the existing pattern: one SALT object per system); this test is the table.
import { describe, it, expect } from '../../harness.js';
import { FIRE_SALT } from '../../../src/data/fire.js';
import { HEALTH_SALT } from '../../../src/data/health.js';
import { CRIME_SALT } from '../../../src/data/crime.js';
import { RAID_SALT } from '../../../src/data/raids.js';
import { REMARK_SALT } from '../../../src/data/tips.js';
import { MAP, MAP_SALT } from '../../../src/data/map.js';
import { RIVER_SALT } from '../../../src/data/river.js';
import { COURT_SALT } from '../../../src/data/court.js';
import { WONDER_SALT } from '../../../src/data/wonders.js';

const TABLE = {
  fire: FIRE_SALT, health: HEALTH_SALT, crime: CRIME_SALT, raid: RAID_SALT, remark: { remark: REMARK_SALT },
  map: { variant: MAP.variantSalt, clay: MAP.clay.salt, ...MAP_SALT }, river: RIVER_SALT, court: COURT_SALT, wonders: WONDER_SALT,
};

describe('s46 contract salts', () => {
  it('has no salt twice across the game', () => {
    const all = Object.entries(TABLE).flatMap(([t, o]) => Object.entries(o).map(([k, v]) => [`${t}.${k}`, v]));
    const seen = new Map();
    for (const [name, v] of all) {
      expect([name, Number.isInteger(v)]).toEqual([name, true]);
      if (seen.has(v)) expect([name, v]).toEqual([seen.get(v), 'unique']);
      seen.set(v, name);
    }
  });
  it('registers each track its own range: Map 4601-4619, River 4621-4639, Court 4641-4659, Wonders 4681-4689, Armies RAID_SALT 8105-8119', () => {
    const within = (o, lo, hi) => Object.values(o).every((v) => v >= lo && v <= hi);
    expect([within(MAP_SALT, 4601, 4619), within(RIVER_SALT, 4621, 4639), within(COURT_SALT, 4641, 4659), within(WONDER_SALT, 4681, 4689)]).toEqual([true, true, true, true]);
    expect([RAID_SALT.mix, RAID_SALT.mix2, RAID_SALT.boatEntry, RAID_SALT.boatBank]).toEqual([8105, 8106, 8107, 8108]);
    expect(Object.keys(RIVER_SALT)).toEqual(['floodLevel', 'herdSpawn', 'herdWander', 'herdKind', 'herdSize', 'herdMove', 'crocSpot', 'crocScare', 'hunt', 'fishBoat', 'ambient', 'lostHerd', 'spare1', 'spare2']);
    expect(Object.keys(COURT_SALT).slice(0, 4)).toEqual(['requestGap', 'requestKind', 'requestAmount', 'requestGood']);
  });
});
