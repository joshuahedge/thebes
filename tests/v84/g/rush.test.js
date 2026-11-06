// Version 8.4, Track G (design 2b, rulings 1467, 1474-1476): Rush a course. Every crew at the site lays MONUMENT.rushPace (2) x its day's units at
// MONUMENT.rushGold (3) x the work gold a unit, paid day by day and never below 0; it covers the course under way only and ends with it; materials are
// still needed; the great temple's offering, the gilding and the capstone still wait; rushQuote's numbers are what a run of the sim does.
import { describe, it, expect } from '../../harness.js';
import { MONUMENT, MONUMENTS } from '../../../src/data/monuments.js';
import { GREAT_WORK } from '../../../src/data/reign.js';
import { rushQuote, setRush, rushPaceOf, crewDayUnits, monumentDay, monumentMonth, siteCrews } from '../../../src/sim/monuments.js';
import { workGoldPerUnit, rushGoldPerUnit, extraGoldOf } from '../../../src/sim/costs.js';
import { monthlyEconomy } from '../../../src/sim/economy.js';
import { DAYS_PER_MONTH } from '../../../src/sim/time.js';
import { addRaw } from '../../helpers/testWorld.js';
import { rushCity } from './fixtures.js';

const near = (a, b, eps = 1e-6) => Math.abs(a - b) < eps;
// n days of the monuments' daily step (no labour, so the guilds keep their staff).
const days = (w, n) => { for (let i = 0; i < n; i++) { monumentDay(w); w.day += 1; } };
const laidIn = (s) => s.site.laid.stone + s.site.laid.bricks;

describe('v84 g Rush: the pace and the price', () => {
  it('has the design\'s numbers (Q3) and prices a rushed unit at three times the work gold, at Normal, Hard and at Capital\'s and the Seat\'s costs', () => {
    expect([MONUMENT.rushPace, MONUMENT.rushGold]).toEqual([2, 3]);
    for (const [difficulty, milestone] of [['normal', 'capital'], ['hard', 'capital'], ['normal', 'seat'], ['relaxed', 'great_city']]) {
      const { w } = rushCity({ difficulty, milestone });
      expect([difficulty, milestone, near(rushGoldPerUnit(w), workGoldPerUnit(w) * 3)]).toEqual([difficulty, milestone, true]);
      expect(near(rushGoldPerUnit(w, 'gilded'), workGoldPerUnit(w, 'gilded') * 3)).toBe(true);
    }
  });

  it('doubles every crew\'s day and pays three times the work gold a unit while rushed (a plain twin beside it)', () => {
    for (const difficulty of ['normal', 'hard']) {
      const a = rushCity({ difficulty }), b = rushCity({ difficulty });
      expect(setRush(a.w, a.site.id, true).ok).toBe(true);
      expect([rushPaceOf(a.site), rushPaceOf(b.site)]).toEqual([2, 1]);
      expect(near(crewDayUnits(a.w, a.guilds[0], a.site), 2 * crewDayUnits(b.w, b.guilds[0], b.site))).toBe(true);
      const ga = a.w.gold, gb = b.w.gold;
      days(a.w, 12); days(b.w, 12);
      expect(near(laidIn(a.site), 2 * laidIn(b.site), 1e-6)).toBe(true);
      const paidA = ga - a.w.gold, paidB = gb - b.w.gold;
      expect(Math.abs(paidA - laidIn(a.site) * rushGoldPerUnit(a.w)) < 1).toBe(true);   // whole gold, the fraction carried
      expect(Math.abs(paidB - laidIn(b.site) * workGoldPerUnit(b.w)) < 1).toBe(true);
      expect(Math.abs(a.w.tally.rushGold - (paidA - laidIn(a.site) * workGoldPerUnit(a.w))) <= 24).toBe(true);   // the premium, rounded each crew-day (24 of them)
    }
  });

  it('pays nothing for units not laid: a short stockpile lays what it has, pays for that, and says it waits for stone', () => {
    const { w, site } = rushCity({ stone: 0 });
    site.site.stock.stone = 1;
    setRush(w, site.id, true);
    const gold = w.gold;
    days(w, 1);
    expect(near(laidIn(site), 1)).toBe(true);
    expect(gold - w.gold).toBe(Math.floor(rushGoldPerUnit(w)));
    expect(site.site.rushShort).toBe('stone');
    expect(site.site.rush).toBe(true);
    const before = w.gold;
    days(w, 2);                                                                   // nothing on site: no work, no gold
    expect([w.gold, site.site.reason]).toEqual([before, 'no_stone']);
  });

  it('does not work a rushed day that would take the treasury below 0', () => {
    const { w, site } = rushCity({ gold: 5 });
    setRush(w, site.id, true);                                                    // allowed? the quote says no_gold below one rushed day
    expect(site.site.rush).toBe(undefined);
    site.site.rush = true;                                                        // rushed while the treasury held more
    days(w, 1);
    expect([w.gold, laidIn(site), site.site.reason]).toEqual([5, 0, 'no_gold']);
  });
});

describe('v84 g Rush: one course, then it ends', () => {
  it('ends by itself when the course is laid: the next course goes at the crews\' own pace, and coursesRushed counts it', () => {
    const { w, site, guilds } = rushCity();
    setRush(w, site.id, true);
    let n = 0;
    while (site.site.course === 0 && n < 400) { days(w, 1); n++; }
    expect(site.site.course).toBe(1);
    expect(site.site.rush).toBe(undefined);
    expect(w.tally.coursesRushed).toBe(1);
    expect(laidIn(site) < 1e-6).toBe(true);                                      // a rushed crew stops at the course's end: nothing of the next is laid at the rushed price
    expect(near(crewDayUnits(w, guilds[0], site), MONUMENT.unitsPerCrewMonth / DAYS_PER_MONTH)).toBe(true);
    days(w, 3);
    expect(near(laidIn(site), 3 * 2 * MONUMENT.unitsPerCrewMonth / DAYS_PER_MONTH, 1e-6)).toBe(true);
  });

  it('can be cancelled at any time, with nothing refunded and nothing owed', () => {
    const { w, site } = rushCity();
    setRush(w, site.id, true);
    days(w, 5);
    const gold = w.gold, tally = w.tally.rushGold;
    expect(setRush(w, site.id, false)).toEqual({ ok: true, warnings: [], rush: false });
    expect([site.site.rush, w.gold, w.tally.rushGold, w.tally.coursesRushed]).toEqual([undefined, gold, tally, 0]);
    days(w, 3);
    expect(w.tally.rushGold).toBe(tally);
    expect(setRush(w, 9999, false).reason).toBe('not_site');
  });

  it('puts the month\'s premium in last month\'s record (rush) as part of the monuments\' gold', () => {
    const { w, site } = rushCity();
    setRush(w, site.id, true);
    days(w, DAYS_PER_MONTH);
    monthlyEconomy(w);
    monumentMonth(w);
    expect(w.stats.lastMonth.rush).toBe(w.tally.rushGold);
    expect(w.stats.lastMonth.monuments).toBeGreaterThan(w.stats.lastMonth.rush);
    monthlyEconomy(w);
    monumentMonth(w);
    expect(w.stats.lastMonth.rush).toBe(0);                                      // a month with no rush: none (site.month starts over)
  });
});

describe('v84 g Rush: the quote', () => {
  it('quotes the days, the days saved and the premium from today\'s crews at full supply, and a run of the sim does what it says', () => {
    for (const [type, crews] of [['colossus', 2], ['great_sphinx', 2], ['obelisk_large', 2]]) {
      const { w, site } = rushCity({ type, crews });
      const q = rushQuote(w, site.id);
      const units = MONUMENTS[type].courses[0].stone;
      const rate = crews * MONUMENT.unitsPerCrewMonth / DAYS_PER_MONTH;
      expect([type, q.ok, q.reason, q.units, q.days, q.daysRushed]).toEqual([type, true, null, units, Math.ceil(units / rate - 1e-6), Math.ceil(units / (2 * rate) - 1e-6)]);
      expect(q.saved).toBe(q.days - q.daysRushed);
      expect(q.extra).toBe(Math.round(units * (rushGoldPerUnit(w) - workGoldPerUnit(w))));
      expect(q.perDay).toBe(Math.round(q.extra / q.saved));
      setRush(w, site.id, true);
      const start = w.day;
      while (site.site.course === 0 && w.day - start < 1000) days(w, 1);
      expect([type, w.day - start]).toEqual([type, q.daysRushed]);
      expect([type, Math.abs(w.tally.rushGold - q.extra) <= q.daysRushed]).toEqual([type, true]);   // rounded to whole gold each crew-day
    }
  });

  it('is about 70 gold a day saved for a four-crew site at Normal (the design\'s example)', () => {
    const { w, site } = rushCity({ type: 'sun_temple', crews: 4, milestone: 'capital', stone: 0, bricks: 800 });
    const q = rushQuote(w, site.id);
    expect(q.ok).toBe(true);
    expect(q.perDay >= 65 && q.perDay <= 75).toBe(true);
    expect(q.dayGold).toBe(Math.ceil(4 * 2 * (MONUMENT.unitsPerCrewMonth / DAYS_PER_MONTH) * rushGoldPerUnit(w) - 1e-6));
  });

  it('refuses with the reason: not a site, finished, already rushed, no crew, too little gold for a rushed day', () => {
    const { w, site, guilds } = rushCity();
    expect(rushQuote(w, guilds[0].id).reason).toBe('not_site');
    expect(setRush(w, guilds[0].id, true)).toEqual({ ok: false, reason: 'not_site', warnings: [] });
    setRush(w, site.id, true);
    const q = rushQuote(w, site.id);
    expect([q.ok, q.reason, q.days > 0]).toEqual([false, 'has_rush', true]);     // the numbers still come with it (the sheet's days to go)
    const lone = addRaw(w, 'obelisk_small', 50, 9);
    const noCrew = rushQuote(w, lone.id);
    expect([noCrew.reason, noCrew.days]).toEqual(['no_crew', 0]);
    const poor = rushCity({ gold: 0 });
    const p = rushQuote(poor.w, poor.site.id);
    expect([p.reason, p.dayGold > 0]).toEqual(['no_gold', true]);
    poor.w.gold = p.dayGold;
    expect(rushQuote(poor.w, poor.site.id).ok).toBe(true);
    Object.assign(site.site, { done: 100, course: MONUMENTS.colossus.courses.length });
    expect(rushQuote(w, site.id).reason).toBe('finished');
    expect(setRush(w, site.id, false).reason).toBe('finished');
  });

  it('does not skip the gilding: the last course waits for its gold, and Rush says so', () => {
    const { w, site } = rushCity({ type: 'obelisk_large' });
    site.site.course = MONUMENTS.obelisk_large.courses.length - 1;
    w.gold = extraGoldOf(w, 'obelisk_large') - 1;
    expect(rushQuote(w, site.id).reason).toBe('waiting_gilding');
    w.gold = 100000;
    expect(rushQuote(w, site.id).ok).toBe(true);                                 // payable: it is paid as the course begins, then the rush runs
  });

  it('does not skip the great temple\'s offering: a stage waiting for its goods refuses Rush, and a rushed stage waits as before', () => {
    const { w, site } = rushCity({ type: 'great_temple', crews: 4, milestone: 'seat' });
    expect(site.site.course % GREAT_WORK.perStage).toBe(0);
    expect(rushQuote(w, site.id).reason).toBe('waiting_offering');
    site.site.rush = true;
    const gold = w.gold;
    days(w, 3);
    expect([w.gold, laidIn(site), site.site.reason]).toEqual([gold, 0, 'waiting_offering']);
  });

  it('counts only crews that work today (a crew short of workers is left out)', () => {
    const { w, site, guilds } = rushCity();
    const full = rushQuote(w, site.id);
    guilds[1].staff = 0;
    const q = rushQuote(w, site.id);
    expect(q.days).toBe(Math.ceil(MONUMENTS.colossus.courses[0].stone / (MONUMENT.unitsPerCrewMonth / DAYS_PER_MONTH) - 1e-6));
    expect(q.days > full.days).toBe(true);
    expect(siteCrews(w, site).length).toBe(2);
  });
});
