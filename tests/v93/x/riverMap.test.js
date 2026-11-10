// Version 9.3, fix wave (Josh, 10 Nov 2026): "Sea Peoples cannot be on Oasis". A week whose decrees need a river (Sea Peoples: its raids come by boat)
// takes the classic river when its seed would pick the Great oasis; every other week keeps the layout its seed picks. week.js decreeMapOf is the one
// place the run (boot), the ruler list's Play this map and a rival's row read the week's map.
import { describe, it, expect } from '../../harness.js';
import { decreeMapOf, decreesOfWeek, weeklySeed, weekKey } from '../../../src/ui/week.js';
import { variantFor } from '../../../src/sim/mapgen.js';
import { hasRiver } from '../../../src/data/map.js';
import { DECREES, DECREE } from '../../../src/data/decrees.js';

// Five years of week keys from the epoch's week (2026-W47), by the game's own weekKey on each Thursday.
const weeks = (n) => Array.from({ length: n }, (_, i) => weekKey(new Date(2026, 10, 19 + 7 * i)));

describe('v93 x river map: Sea Peoples never falls on the Great oasis', () => {
  const all = weeks(260);
  it('starts on the epoch week, and only Sea Peoples asks for a river', () => {
    expect(all[0]).toBe(`${DECREE.epoch[0]}-${DECREE.epoch[1]}`);
    expect(Object.keys(DECREES).filter((id) => DECREES[id].needsRiver)).toEqual(['sea_peoples']);
  });
  it('gives every Sea Peoples week, alone or in a pair, a map with a river, the oasis ones the classic river on the same seed', () => {
    const sea = all.filter((k) => decreesOfWeek(k).includes('sea_peoples'));
    expect(sea.length > 20).toBe(true);
    const moved = sea.filter((k) => !hasRiver(variantFor(weeklySeed(k))));
    expect(moved.includes('2026-47')).toBe(true);                   // the launch week's seed picks the oasis (Track K, ruling 1989)
    for (const k of sea) {
      const m = decreeMapOf(k);
      expect([k, hasRiver(m.mapVariant)]).toEqual([k, true]);
      expect(m.seed).toBe(weeklySeed(k));
    }
    for (const k of moved) expect(decreeMapOf(k).mapVariant).toBe('classic');
  });
  it('leaves every other week on the layout its seed picks, the Great oasis included', () => {
    const other = all.filter((k) => !decreesOfWeek(k).includes('sea_peoples'));
    for (const k of other) expect([k, decreeMapOf(k).mapVariant]).toEqual([k, variantFor(weeklySeed(k))]);
    expect(other.some((k) => !hasRiver(decreeMapOf(k).mapVariant))).toBe(true);
  });
});
