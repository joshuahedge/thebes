// Version 8.3, Track C (rulings 1430-1444): crews at any distance. A builders' guild works any open site its roads reach, a running ferry included, nearest
// first; a far crew works at crewSpeed of its walk (full within 12 road tiles, then 10% less for each further 12 begun, never below 50%); the sheet's and the
// chip's numbers are the sim's own.
import { describe, it, expect } from '../../harness.js';
import { crewSpeed, crewSpeedAt, crewDistance, crewDayUnits, crewPlan, guildsNear, siteCrews, monumentDay, hasMonumentWork, roadLinked } from '../../../src/sim/monuments.js';
import { assignLabour } from '../../../src/sim/labour.js';
import { goalMet, goalById } from '../../../src/sim/goals.js';
import { conditionsFor } from '../../../src/sim/commands.js';
import { MONUMENT } from '../../../src/data/monuments.js';
import { DAYS_PER_MONTH } from '../../../src/sim/time.js';
import { drawFerry } from '../../../src/sim/ferryLay.js';
import { ferryWorld, dragLine, RIVER_X, ROW } from '../../v71/f/helpers.js';
import { makeTestWorld, setRoad, addRaw } from '../../helpers/testWorld.js';

const near = (a, b) => Math.abs(a - b) < 1e-9;
// A long straight city: a road along y = 10 across a 128-tile map, at City so the monuments are open.
function longCity() {
  const w = makeTestWorld({ size: 128, gold: 100000 });
  setRoad(w, 0, 10, 127, 10);
  w.milestone = 'capital';
  return w;
}
// A fully staffed guild at x (it touches road tiles (x, 10) and (x + 1, 10)), and a small obelisk `dist` road tiles from it (the guild's nearest road tile, x + 1, counts 1).
const guildAt = (w, x, extra = {}) => addRaw(w, 'builders_guild', x, 11, { staff: 16, ...extra });
const obeliskAt = (w, g, dist) => addRaw(w, 'obelisk_small', g.x + dist, 9);

describe('v83 c the walk and the speed', () => {
  it('is full speed within 12 road tiles, then 10% less for each further 12 begun, never below 50%: 12, 13, 24, 25, 48, 60 and 100', () => {
    expect([MONUMENT.crewReach, MONUMENT.crewStep, MONUMENT.crewLoss, MONUMENT.crewFloor]).toEqual([12, 12, 0.1, 0.5]);
    const at = (d) => crewSpeed(d);
    expect([1, 12].map(at)).toEqual([1, 1]);
    expect([13, 24].map(at)).toEqual([0.9, 0.9]);
    expect([25, 36].map(at)).toEqual([0.8, 0.8]);
    expect([37, 48].map(at)).toEqual([0.7, 0.7]);
    expect([49, 60].map(at)).toEqual([0.6, 0.6]);
    expect([61, 72, 100, 500].map(at)).toEqual([0.5, 0.5, 0.5, 0.5]);
    expect(crewSpeed(Infinity)).toBe(0.5);                                       // never asked for in play: the plan sends no crew without a way
  });

  it('is full speed at any distance with the workers\' camp', () => {
    for (const d of [1, 12, 13, 40, 100, 1000]) expect(crewSpeed(d, true)).toBe(1);
  });

  it('measures the walk in road tiles and gives the crew the speed of that walk, in a real city (12, 13, 24, 25, 48, 60, 100)', () => {
    const want = { 12: 1, 13: 0.9, 24: 0.9, 25: 0.8, 48: 0.7, 60: 0.6, 100: 0.5 };
    for (const [d, speed] of Object.entries(want)) {
      const w = longCity();
      const g = guildAt(w, 2), s = obeliskAt(w, g, Number(d));
      expect([Number(d), crewDistance(w, g, s), crewSpeedAt(w, g, s)]).toEqual([Number(d), Number(d), speed]);
      expect([...crewPlan(w)]).toEqual([[g.id, s.id]]);
      expect(siteCrews(w, s)).toEqual([{ id: g.id, dist: Number(d), walk: speed, speed, working: false }]);
    }
  });

  it('lays a far crew\'s day at its speed: 13 tiles lay 0.9 of a near crew\'s, 100 lay half, and the camp restores them', () => {
    const lay = (d, camp = false) => {
      const w = longCity();
      const g = guildAt(w, 2), s = obeliskAt(w, g, d);
      s.site.stock.stone = 20;
      if (camp) s.site.camp = true;
      expect(near(crewDayUnits(w, g, s), (MONUMENT.unitsPerCrewMonth / DAYS_PER_MONTH) * crewSpeed(d, camp))).toBe(true);
      monumentDay(w);
      return s.site.laid.stone;
    };
    const full = lay(5);
    expect(near(full, 2 / 3)).toBe(true);
    expect(near(lay(13), (2 / 3) * 0.9)).toBe(true);
    expect(near(lay(100), (2 / 3) * 0.5)).toBe(true);
    expect(near(lay(100, true), full)).toBe(true);                               // the camp: every crew at 100%
    expect(near(lay(13, true), full)).toBe(true);
  });

  it('keeps crewDayUnits the same for a guild with no site, and asks the crew plan for the site when none is given', () => {
    const w = longCity();
    const g = guildAt(w, 2);
    expect(near(crewDayUnits(w, g), MONUMENT.unitsPerCrewMonth / DAYS_PER_MONTH)).toBe(true);   // no site: 1
    const s = obeliskAt(w, g, 48);
    expect(near(crewDayUnits(w, g), (MONUMENT.unitsPerCrewMonth / DAYS_PER_MONTH) * 0.7)).toBe(true);   // the plan's site, 48 tiles away
    g.staff = 8;
    expect(near(crewDayUnits(w, g, s), (MONUMENT.unitsPerCrewMonth / DAYS_PER_MONTH) * 0.5 * 0.7)).toBe(true);   // staffing and the walk multiply
  });
});

describe('v83 c crews to far sites', () => {
  it('sends a guild\'s crew to a site 100 road tiles away that today\'s rule would never reach, and employs the guild', () => {
    const w = longCity();
    addRaw(w, 'house', 2, 8, { tier: 1, residents: 200 });
    const g = guildAt(w, 2, { staff: 0 });
    expect(hasMonumentWork(w, g)).toBe(false);                                   // no site yet
    const s = obeliskAt(w, g, 100);
    expect([crewPlan(w).get(g.id), hasMonumentWork(w, g)]).toEqual([s.id, true]);
    assignLabour(w);
    expect(g.staff > 0).toBe(true);                                               // it is employed now
  });

  it('works nearest first: a full site is passed over for the next nearest, and the nearer guild takes the last place', () => {
    const w = longCity();
    const g1 = guildAt(w, 2), g2 = guildAt(w, 10), g3 = guildAt(w, 20);
    const a = addRaw(w, 'obelisk_small', 40, 9);                                  // one crew
    const b = addRaw(w, 'obelisk_small', 90, 9);                                  // one crew, far from all three
    // g3 is nearest to a; g2 is next, but a is full, so g2 walks to b; g1 has nowhere left
    expect([...crewPlan(w)]).toEqual([[g3.id, a.id], [g2.id, b.id]]);
    expect(crewPlan(w).has(g1.id)).toBe(false);
    const c = addRaw(w, 'obelisk_small', 5, 9);                                   // right by g1
    expect([...crewPlan(w)]).toEqual([[g1.id, c.id], [g3.id, a.id], [g2.id, b.id]]);
  });

  it('breaks a tie as before: the older guild, then the older site', () => {
    const w = longCity();
    const g1 = guildAt(w, 10), g2 = guildAt(w, 10);                               // the same walk to the site: a tie
    const s = addRaw(w, 'obelisk_small', 60, 9);
    expect(crewPlan(w).get(Math.min(g1.id, g2.id))).toBe(s.id);
    expect(crewPlan(w).has(Math.max(g1.id, g2.id))).toBe(false);                  // the obelisk takes one crew
  });

  it('never sends a crew over a gap with no road or no running ferry, and goes over a running ferry as over a road', () => {
    const w = longCity();
    for (let x = 40; x <= 44; x++) w.road[10 * w.size + x] = 0;                  // a gap in the road
    w.roadVersion++;
    const g = guildAt(w, 2);
    const s = addRaw(w, 'obelisk_small', 80, 9);
    expect(crewPlan(w).size).toBe(0);                                             // no way across: unlinked sites are never listed (roadLinked drops Infinity)
    expect(roadLinked(w, g, (o) => o.id === s.id)).toEqual([]);
    const lone = addRaw(w, 'builders_guild', 100, 20, { staff: 16 });             // no road beside it at all
    expect(crewPlan(w).has(lone.id)).toBe(false);
    expect(guildsNear(w, { x: 70, y: 11, w: 1, d: 1 }).map((r) => r.id)).toEqual([]);   // a probe beyond the gap reaches no guild (g stands before it)
  });

  it('sends a crew over a running ferry to a site on the far bank, with the crossing counted in its walk', () => {
    const w = ferryWorld(7);
    const g = addRaw(w, 'builders_guild', 6, ROW + 1, { staff: 16 });             // west bank
    const s = addRaw(w, 'obelisk_small', RIVER_X + 12, ROW - 1);                  // east bank
    const ids = drawFerry(w, dragLine(7)).ids;
    expect(crewPlan(w).size).toBe(0);                                             // laid, not staffed yet: no crossing
    assignLabour(w);
    expect(ids.every((id) => w.buildings[id].ferry.run)).toBe(true);
    expect(crewPlan(w).get(g.id)).toBe(s.id);
    const d = crewDistance(w, g, s);
    expect(Number.isFinite(d) && d > 7).toBe(true);                               // along the road, across (crossingTiles) and on
    expect(siteCrews(w, s)[0]).toEqual({ id: g.id, dist: d, walk: crewSpeed(d), speed: crewSpeed(d), working: false });
  });

  it('counts a guild near a site for the goal at any distance (not one with no road)', () => {
    const w = longCity();
    w.milestone = 'city';
    addRaw(w, 'obelisk_small', 120, 9);
    expect(goalMet(w, goalById('guild_near').need)).toBe(false);
    addRaw(w, 'builders_guild', 100, 20);                                         // no road beside it
    expect(goalMet(w, goalById('guild_near').need)).toBe(false);
    addRaw(w, 'builders_guild', 2, 11);                                           // 118 road tiles away
    expect(goalMet(w, goalById('guild_near').need)).toBe(true);
  });
});

describe('v83 c the placing chip\'s guild', () => {
  it('says the nearest free guild\'s walk and speed, from the same sim function as the plan', () => {
    const w = longCity();
    w.milestone = 'capital';
    addRaw(w, 'quarry', 70, 11);
    const probe = { x: 56, y: 9, w: 1, d: 1 };
    expect(guildsNear(w, probe)).toEqual([]);
    const g = guildAt(w, 2);
    const near1 = guildsNear(w, probe);
    expect(near1.map((r) => [r.id, r.dist, r.speed])).toEqual([[g.id, 54, 0.6]]);        // 54 tiles: 4 further 12 begun
    const c = conditionsFor(w, 'obelisk_small', 56, 9).conditions.find((x) => x.key === 'crew');
    expect([c.state, c.n, c.dist, c.speed]).toEqual(['met', 1, 54, 0.6]);
    const nearer = guildAt(w, 40);
    expect(guildsNear(w, probe).map((r) => [r.id, r.dist, r.speed])).toEqual([[nearer.id, 16, 0.9], [g.id, 54, 0.6]]);   // nearest first
    expect(conditionsFor(w, 'obelisk_small', 56, 9).conditions.find((x) => x.key === 'crew')).toEqual({ key: 'crew', state: 'met', reason: null, n: 2, dist: 16, speed: 0.9 });
  });

  it('has no walk or speed, and says no guild, when none is free', () => {
    const w = longCity();
    const c = conditionsFor(w, 'obelisk_small', 56, 9).conditions.find((x) => x.key === 'crew');
    expect([c.state, c.reason, c.n, c.dist, c.speed]).toEqual(['later', 'no_crew', 0, undefined, undefined]);
  });
});
