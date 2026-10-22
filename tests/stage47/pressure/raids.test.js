// Stage 4.7, Task 7 (ruling 470): raids that grow with the city's wealth (src/sim/raids.js wealthDraw), the likelier two-sided raids, the warning a year
// ahead (src/sim/pressure.js), the raid sheet's words, and the score that does not move (ruling 441).
import { describe, it, expect } from '../../harness.js';
import { makeTestWorld, setRoad, addRaw } from '../../helpers/testWorld.js';
import { raidDay, raidSize, baseRaidSize, wealthDraw, wealthTerms, wealthCap, twoSidedChance, tributeFor, lateRaids } from '../../../src/sim/raids.js';
import { favourRaidSize, favourTributeFactor } from '../../../src/sim/court.js';
import { pressureMonth } from '../../../src/sim/pressure.js';
import { scoreRow } from '../../../src/sim/score.js';
import { population } from '../../../src/sim/world.js';
import { hash2 } from '../../../src/sim/rng.js';
import { RAIDS, RAID_SALT } from '../../../src/data/raids.js';
import { RAIDS_LATE } from '../../../src/data/s47.js';
import { costOf, costScale } from '../../../src/sim/costs.js';
import { tributeSheet } from '../../../src/ui/dangerSheets.js';
import { S47_PRESSURE_TEXT as P, TIP_HELP_TEXT } from '../../../src/ui/text.js';

const YEAR = 360;
const LATE = (RAIDS_LATE.fromYear - 1) * YEAR;       // year 10's first day
const EAST = { x: 31, y: 16 }, NORTH = { x: 16, y: 0 }, WEST = { x: 0, y: 20 };

// A 32x32 Market town with `people` in one home and three raider entries, its raid clock started at day 0 and `index` raids warned so far.
function city({ people = 600, gold = 2000, difficulty = 'normal', day = LATE, index = 4 } = {}) {
  const w = makeTestWorld({ gold, raiderEntries: [EAST, NORTH, WEST] });
  setRoad(w, 0, 13, 31, 13);
  w.milestone = 'market_town';
  w.difficulty = difficulty;
  addRaw(w, 'house', 2, 14, { tier: 4, residents: people });
  Object.assign(w.raid, { clockDay: 0, index, nextWarnDay: day });
  w.day = day;
  return w;
}

describe('s47 raids wealth: the size', () => {
  it('draws one raider for each 40,000 gold and each 500 people from year 10, capped by difficulty, none before, on Peaceful or for the first raid', () => {
    const w = city({ people: 1200, gold: 94000 });
    expect(wealthTerms(w)).toEqual({ gold: 2, people: 2, total: 4 });
    expect(wealthDraw(w)).toBe(4);
    w.day = LATE - 1;                                                       // year 9's last day
    expect([lateRaids(w), wealthDraw(w)]).toEqual([false, 0]);
    w.day = LATE;
    w.raid.index = 0;
    expect(wealthDraw(w)).toBe(0);
    for (const [d, cap] of [['relaxed', 3], ['normal', 6], ['hard', 9], ['peaceful', 0]]) {
      const rich = city({ people: 3000, gold: 200000, difficulty: d });
      expect([d, wealthCap(rich), wealthDraw(rich)]).toEqual([d, cap, cap]);
      expect(RAIDS_LATE.cap[d]).toBe(cap);
    }
    const poor = city({ people: 499, gold: RAIDS_LATE.goldPer - 1 });
    expect(wealthDraw(poor)).toBe(0);
    expect(Math.floor(population(poor) / RAIDS_LATE.peoplePer)).toBe(0);
  });

  it('adds the term on top of favour\'s step (past 18 when it must), and the tribute prices the total with favour\'s factor', () => {
    for (const favour of [50, 20, 80]) {
      const w = city({ people: 3000, gold: 90000 });
      w.court.favour = favour;
      const total = favourRaidSize(w, baseRaidSize(w)) + wealthDraw(w);
      expect([favour, raidSize(w)]).toEqual([favour, total]);
      expect(raidSize(w)).toBe(RAIDS.maxSize + RAIDS_LATE.cap.normal);
      expect(tributeFor(w, raidSize(w))).toBe(Math.round(favourTributeFactor(w) * RAIDS.tributeShare * Math.ceil(raidSize(w) / RAIDS.raidersPerTower) * costOf(w, 'tower') * costScale(w).court));   // Version 6.0 (Track A): x the court's scale
    }
  });

  it('leaves the score alone: the defence term reads baseRaidSize, so the same city scores the same with and without the wealth term', () => {
    const w = city({ people: 3000, gold: 90000 });
    const withTerm = scoreRow(w);
    const size = raidSize(w);
    const keep = RAIDS_LATE.cap.normal;
    RAIDS_LATE.cap.normal = 0;
    try {
      expect(raidSize(w)).toBe(size - keep);
      expect(scoreRow(w)).toEqual(withTerm);
    } finally { RAIDS_LATE.cap.normal = keep; }
  });
});

describe('s47 raids wealth: the warning', () => {
  it('fixes the wealth term in the warning and its event, and the raid sheet says it; a year-9 raid has none and says none', () => {
    for (const [day, wealth] of [[LATE + 30, 4], [LATE - 60, 0]]) {
      const w = city({ people: 1000, gold: 85000, day });
      const events = [];
      raidDay(w, events);
      const warn = w.raid.warning;
      const e = events.find((x) => x.type === 'raid_warning');
      expect([day, warn.wealth || 0, e.wealth || 0]).toEqual([day, wealth, wealth]);
      const body = document.createElement('div');
      tributeSheet({ world: w })(body, { close: () => {} });
      const line = body.querySelector('.raid-wealth');
      expect([day, line ? line.textContent : null]).toEqual([day, wealth ? `${P.wealthLine(warn)}.` : null]);
      if (wealth) expect(line.textContent).toBe(`${warn.size} raiders: your wealth draws ${wealth} more.`);
    }
  });

  it('comes from two sides more often from year 10: a raid whose draw lies between the two chances is two-sided only then', () => {
    expect([RAIDS.twoSidedChance, RAIDS_LATE.twoSidedChance]).toEqual([0.35, 0.6]);
    let seed = 1;
    const index = 4;
    while (!(hash2(seed, index, RAID_SALT.two) >= RAIDS.twoSidedChance && hash2(seed, index, RAID_SALT.two) < RAIDS_LATE.twoSidedChance)) seed++;
    for (const [day, two] of [[LATE + 30, true], [LATE - 60, false]]) {
      const w = city({ day, index });
      w.seed = seed;
      expect(twoSidedChance(w)).toBe(two ? RAIDS_LATE.twoSidedChance : RAIDS.twoSidedChance);
      raidDay(w, []);
      expect([day, Boolean(w.raid.warning.second && !w.raid.warning.second.boat)]).toEqual([day, two]);
    }
  });

  it('warns a year ahead, at year 9\'s first month end, with the cap for the difficulty; never on Peaceful', () => {
    for (const [d, warned] of [['normal', true], ['hard', true], ['peaceful', false]]) {
      const w = city({ difficulty: d, day: (RAIDS_LATE.warnYear - 1) * YEAR });
      const events = [];
      pressureMonth(w, events);
      const e = events.find((x) => x.type === 'raids_grow');
      expect([d, Boolean(e)]).toEqual([d, warned]);
      if (e) expect(P.raidsGrow(e)).toBe(`From year ${RAIDS_LATE.fromYear} raids grow with your wealth: one more raider for each ${RAIDS_LATE.goldPer.toLocaleString('en-US')} gold and each ${RAIDS_LATE.peoplePer} people, up to ${RAIDS_LATE.cap[d]} more`);
    }
    expect(TIP_HELP_TEXT.raids_wealth).toContain(`per ${RAIDS_LATE.goldPer.toLocaleString('en-US')} gold and ${RAIDS_LATE.peoplePer} people: up to ${RAIDS_LATE.cap.relaxed}-${RAIDS_LATE.cap.hard} more raiders, by level.`);
  });
});
