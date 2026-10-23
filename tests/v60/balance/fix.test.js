// Version 6.0, Wave 4 fix batch 1 (ruling 787): Advice aims a tower at the building the warned band strikes first (firstRaidTarget: the raid's own choice of target, from its entry),
// not at the entry on the map's edge, and Show me for a tower prefers a spot with a road beside it. Each set up both ways.
import { describe, it, expect } from '../../harness.js';
import { makeTestWorld, setRoad, addRaw, staffAll } from '../../helpers/testWorld.js';
import { firstRaidTarget, raidTargetKind, towersNeeded } from '../../../src/sim/raids.js';
import { cityAdvice } from '../../../src/sim/advice.js';
import { adviceWords } from '../../../src/ui/adviceText.js';
import { showMeRefusal } from '../../../src/ui/adviceUi.js';
import { RAIDS } from '../../../src/data/raids.js';
import { T } from '../../../src/sim/terrain.js';
import { idx } from '../../../src/sim/grid.js';

const EAST = { x: 31, y: 16 }, WEST = { x: 0, y: 16 };
function city(entries = [EAST, WEST]) {
  const w = makeTestWorld({ gold: 5000, raiderEntries: entries });
  w.milestone = 'market_town';
  setRoad(w, 0, 13, 31, 13);
  return w;
}
const warn = (w, entry, extra = {}) => { w.raid.warning = { index: 1, size: 9, tribute: null, first: true, entry: { ...entry }, dir: entry.x > 15 ? 'east' : 'west', arrives: w.day + 100, ...extra }; };
const centre = (b) => ({ x: b.x + b.w / 2, y: b.y + b.d / 2 });
const towerItem = (w) => cityAdvice(w).find((a) => a.kind === 'raid_towers');

describe('v60 balance fix: the building a band strikes first (ruling 787)', () => {
  it('is the nearest reachable building of the warned kind from the band\'s own entry, so the two sides of a city have their own first targets', () => {
    const w = city();
    const near = addRaw(w, 'trading_post', 24, 14), far = addRaw(w, 'trading_post', 4, 14);
    addRaw(w, 'storehouse', 14, 14);                                                            // a lower kind in the middle: never first while a trading post stands
    expect(raidTargetKind(w)).toBe('trading_post');
    expect(firstRaidTarget(w, EAST).id).toBe(near.id);
    expect(firstRaidTarget(w, WEST).id).toBe(far.id);
    expect(firstRaidTarget(w, EAST, 'storehouse').type).toBe('storehouse');                     // a warning that named another kind: that kind's nearest
  });

  it('falls down RAIDS.targets, then any building that is not a home, then a home with people, and is null when the band can reach nothing', () => {
    const w = city([EAST]);
    expect(firstRaidTarget(w, EAST)).toBe(null);                                                // nothing to strike
    const hut = addRaw(w, 'house', 10, 14, { tier: 2, residents: 4 });
    expect(firstRaidTarget(w, EAST).id).toBe(hut.id);                                           // a home with people is the last resort
    const well = addRaw(w, 'well', 14, 14);
    expect(firstRaidTarget(w, EAST).id).toBe(well.id);                                          // any other building comes first
    const temple = addRaw(w, 'temple', 20, 14);
    expect(RAIDS.targets.includes('temple')).toBe(true);
    expect(firstRaidTarget(w, EAST).id).toBe(temple.id);                                        // then a warned kind (the temple is the last of RAIDS.targets)
    const bazaar = addRaw(w, 'bazaar', 8, 14);
    expect(firstRaidTarget(w, EAST).id).toBe(bazaar.id);                                        // and the kinds above it take precedence, near or far
    const wall = makeTestWorld({ gold: 5000, raiderEntries: [EAST] });
    for (let y = 0; y < wall.size; y++) wall.terrain[idx(wall.size, 20, y)] = T.WATER;           // a river across the map: what lies beyond it cannot be reached
    addRaw(wall, 'storehouse', 5, 14);
    expect(firstRaidTarget(wall, EAST)).toBe(null);
  });

  it('is where Advice puts the warned raid\'s tower: its centre, not the entry on the edge; before a warning, by the city\'s start as ever; with nothing to strike, by the entry', () => {
    const w = city([EAST]);
    const post = addRaw(w, 'trading_post', 24, 14);
    staffAll(w);
    w.raid.clockDay = 0;
    const calm = towerItem(w);
    expect([calm.data.warned, calm.fix.target]).toEqual([false, { x: w.focus.x + 0.5, y: w.focus.y + 0.5 }]);
    warn(w, EAST, { target: 'trading_post' });
    const a = towerItem(w);
    expect([a.data.warned, a.data.buildN, a.fix.item, a.fix.at, a.fix.target]).toEqual([true, towersNeeded(9), 'tower', 'near', centre(post)]);
    expect([a.fix.target.x === EAST.x + 0.5 && a.fix.target.y === EAST.y + 0.5]).toEqual([false]);
    expect(adviceWords(a, w).fix).toContain('tower');
    expect(showMeRefusal(w, 'tower', a.fix.target)).toBe(null);                                  // and Show me is not refused there
    const bare = city([EAST]);
    warn(bare, EAST);
    expect(towerItem(bare).fix.target).toEqual({ x: EAST.x + 0.5, y: EAST.y + 0.5 });           // nothing for the band to strike: beside the entry, as before
  });

  it('puts a two-sided raid\'s tower by the band whose first strike has the fewer towers in range: the first band\'s while neither has one, the second\'s once the first is guarded', () => {
    const w = city();
    const east = addRaw(w, 'trading_post', 24, 14), west = addRaw(w, 'trading_post', 4, 14);
    staffAll(w);
    w.raid.clockDay = 0;
    warn(w, EAST, { target: 'trading_post', size: 12, second: { entry: { ...WEST }, dir: 'west', size: 4 } });
    expect(towersNeeded(12) > 1).toBe(true);
    expect(towerItem(w).fix.target).toEqual(centre(east));                                      // neither band's strike is guarded: the first band's
    addRaw(w, 'tower', 26, 15);
    staffAll(w);
    const a = towerItem(w);
    expect(a.fix.target).toEqual(centre(west));                                                 // a tower now stands by the east strike: the west band's has none
    expect(showMeRefusal(w, 'tower', a.fix.target)).toBe(null);
    addRaw(w, 'tower', 6, 15);
    staffAll(w);
    expect(towerItem(w).fix.target).toEqual(centre(east));                                      // one each: back to the first band's
  });
});
