// Version 6.0, Track A (rulings 642, 643): the court's due. On the first day of each year from the yearly tribute's first year (the court open) the
// court takes the rank's share of the treasury or of a year's taxes, whichever is more, times favour's factor and the difficulty's cost, halved
// while the great temple rises; even past 0. The court sheet, the alert and Advice say it ahead.
import { describe, it, expect } from '../../harness.js';
import { addRaw } from '../../helpers/testWorld.js';
import { courtWorld, openCourt, YEAR, MONTH } from '../../stage46/court/courtHelpers.js';
import { courtDue, dueComing, pressureMonth } from '../../../src/sim/pressure.js';
import { demandAlerts, dueWarning, demandItems } from '../../../src/sim/demands.js';
import { monthFigures } from '../../../src/sim/economy.js';
import { COURT_DUE } from '../../../src/data/reign.js';
import { QUOTA } from '../../../src/data/s47.js';
import { FAVOUR } from '../../../src/data/court.js';

// An open court at Capital, favour steady, in year 7 (the due starts with year 8).
function capitalCourt({ gold = 20000, difficulty = 'normal' } = {}) {
  const w = courtWorld({ open: true, difficulty });
  w.milestone = 'capital';
  w.gold = gold;
  w.court.favour = 50;
  w.day = (QUOTA.fromYear - 2) * YEAR + 6 * MONTH;                              // year 7, month 7
  return w;
}
const yearTaxes = (w) => monthFigures(w).taxes * 12;

describe('v60 a due: what the court takes', () => {
  it('takes the treasury\'s share when that is more, else the taxes\' share: the two ways', () => {
    const rich = capitalCourt({ gold: 50000 });
    const d1 = courtDue(rich);
    expect([d1.by, d1.gold]).toEqual(['treasury', Math.round(50000 * COURT_DUE.treasury.capital / COURT_DUE.step) * COURT_DUE.step]);
    const poor = capitalCourt({ gold: 100 });
    const d2 = courtDue(poor);
    expect(d2.by).toBe('taxes');
    expect(d2.gold).toBe(Math.round(yearTaxes(poor) * COURT_DUE.taxes.capital / COURT_DUE.step) * COURT_DUE.step);
    expect(d2.gold).toBeGreaterThan(0);
    poor.milestone = 'town';
    expect(courtDue(poor).gold).toBeLessThan(d2.gold);                            // a Town owes a smaller share
  });

  it('doubles at low favour and falls at high favour, scales by difficulty, and is halved while the great temple rises', () => {
    const w = capitalCourt({ gold: 40000 });
    const steady = courtDue(w).gold;
    w.court.favour = FAVOUR.low;
    expect([courtDue(w).band, courtDue(w).gold]).toEqual(['low', steady * COURT_DUE.favour.low]);
    w.court.favour = FAVOUR.high;
    expect(courtDue(w).band).toBe('high');
    expect(Math.abs(courtDue(w).gold - steady * COURT_DUE.favour.high)).toBeLessThanOrEqual(COURT_DUE.step);
    w.court.favour = 50;
    const hard = capitalCourt({ gold: 40000, difficulty: 'hard' });
    expect(courtDue(hard).gold).toBeGreaterThan(steady);
    const relaxed = capitalCourt({ gold: 40000, difficulty: 'relaxed' });
    expect(courtDue(relaxed).gold).toBeLessThan(steady);
    const site = addRaw(w, 'great_temple', 22, 12);
    expect(courtDue(w)).toEqual({ ...courtDue(w), greatWork: true });
    expect(Math.abs(courtDue(w).gold - steady * COURT_DUE.greatWork)).toBeLessThanOrEqual(COURT_DUE.step);
    site.site.done = w.day;                                                         // finished: no longer rising
    expect(courtDue(w).gold).toBe(steady);
  });

  it('is taken on the first day of the yearly tribute\'s first year and each year after, not before, even into debt, and logged', () => {
    const w = capitalCourt({ gold: 100 });
    expect(dueComing(w)).toBe(true);
    w.day = (QUOTA.fromYear - 2) * YEAR;                                            // year 7 begins: nothing yet
    let events = [];
    const before = w.gold;
    pressureMonth(w, events);
    expect([w.gold, events.some((e) => e.type === 'court_due')]).toEqual([before, false]);
    w.day = (QUOTA.fromYear - 1) * YEAR;                                            // year 8 begins
    const due = courtDue(w).gold;
    events = [];
    pressureMonth(w, events);
    expect(w.gold).toBe(before - due);
    expect(w.gold).toBeLessThan(0);                                                 // the court takes it all the same
    expect(events.filter((e) => e.type === 'court_due').map((e) => e.gold)).toEqual([due]);
    expect(w.court.log.filter((e) => e.kind === 'due').map((e) => e.gold)).toEqual([due]);
    w.day += MONTH;                                                                  // a month end that is not a year's start: nothing
    const now = w.gold;
    pressureMonth(w, []);
    expect(w.gold).toBe(now);
  });

  it('is not coming while the court is closed', () => {
    const w = courtWorld({ open: false });
    w.milestone = 'capital';
    w.day = 9 * YEAR;
    expect(dueComing(w)).toBe(false);
    expect(dueWarning(w)).toBe(null);
  });
});

describe('v60 a due: said ahead', () => {
  it('raises the alert and the advice item within the warning months when the treasury holds less than the due, and neither when it holds enough', () => {
    const w = capitalCourt({ gold: 100 });
    w.day = (QUOTA.fromYear - 1) * YEAR - COURT_DUE.warnMonths * MONTH;              // three months before year 8
    const due = courtDue(w);
    expect(due.monthsLeft).toBe(COURT_DUE.warnMonths);
    expect(due.gold).toBeGreaterThan(w.gold);
    const a = demandAlerts(w).find((x) => x.code === 'court_due');
    expect(a).toEqual({ code: 'court_due', gold: due.gold, months: COURT_DUE.warnMonths, short: due.gold - w.gold });
    const out = [];
    demandItems(w, [], out);
    expect(out.map((x) => [x.key, x.kind, x.data.gold])).toEqual([['court_due', 'demand', due.gold]]);
    w.gold = 100000;                                                                 // the treasury holds it: no alert (the due grows with it, but it is paid)
    expect(demandAlerts(w).some((x) => x.code === 'court_due')).toBe(false);
    w.gold = 100;
    w.day -= MONTH;                                                                  // four months ahead: not yet
    expect(demandAlerts(w).some((x) => x.code === 'court_due')).toBe(false);
  });
});
