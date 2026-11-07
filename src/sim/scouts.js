// Version 8.4, Track R (ruling 1487): the scouts on the horizon. For the SCOUTS.days before every warning (the first included) two or three scouts stand at the map
// edge where the coming raid will enter, so the player can read what is about to happen. They are read from the state (raid.nextWarnDay and the entry the warning will use,
// nextRaidEntry) and never move the warning. Pure: no draw is kept, nothing is saved. The lesson's raid, staged with nextWarnDay = today, has none, and neither has a
// Peaceful city or one whose clock has not started.
import { SCOUTS, RAID_SALT } from '../data/raids.js';
import { hash2 } from './rng.js';
import { raidsOn } from './costs.js';
import { nextRaidEntry, entryDir, comesTwoSided, secondBand } from './raids.js';

// { entry, dir, days, bands, dirs } while the scouts stand, else null: entry is the entry the next warning will use (nextRaidEntry at the raid's index), dir the edge it is on
// ('north' | 'east' | 'south' | 'west') and days how many days are left before the warning. The window is nextWarnDay - SCOUTS.days <= day < nextWarnDay with no warning
// up and no raid under way.
export function scoutsAt(world) {
  const r = world.raid, day = world.day;
  if (!raidsOn(world) || world.lesson || r.nextWarnDay === null || r.nextWarnDay === undefined || r.warning || r.active) return null;
  if (!world.raiderEntries || !world.raiderEntries.length) return null;
  if (day < r.nextWarnDay - SCOUTS.days || day >= r.nextWarnDay) return null;
  const entry = nextRaidEntry(world, r.index);
  // Ruling 1538: a raid that will come as two bands has scouts at both entries; bands lists them (the first is entry), dirs their sides.
  const bands = [{ entry, dir: entryDir(world, entry) }];
  if (comesTwoSided(world, r.index)) { const s = secondBand(world, r.index, entry, 0); bands.push({ entry: s.entry, dir: s.dir }); }
  return { entry, dir: bands[0].dir, days: r.nextWarnDay - day, bands, dirs: bands.map((b) => b.dir) };
}

// How many scouts stand there, SCOUTS.min to SCOUTS.max, drawn by hash2(seed, the raid's index, RAID_SALT.scouts).
export const scoutCount = (world) => SCOUTS.min + Math.floor(hash2(world.seed, world.raid.index, RAID_SALT.scouts) * (SCOUTS.max - SCOUTS.min + 1));
