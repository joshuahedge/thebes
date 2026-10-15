// Stage 4.7, Task 7 (ruling 469): the yearly tribute quota (src/sim/pressure.js) and its words on the court sheet (src/ui/s47/pressure.js).
import { describe, it, expect } from '../../harness.js';
import { courtWorld, YEAR, MONTH } from '../../stage46/court/courtHelpers.js';
import { pressureMonth, quotaAsk, quotaOf, quotaStatus, sendQuota, yearOutput, carryIfMissed, nextQuotaDay } from '../../../src/sim/pressure.js';
import { outputPerMonth, stockOf, favourChange } from '../../../src/sim/court.js';
import { QUOTA } from '../../../src/data/s47.js';
import { GOOD_VALUE } from '../../../src/data/court.js';
import { serialize, deserialize, validateWorld } from '../../../src/save/serialize.js';
import { quotaNodes } from '../../../src/ui/s47/pressure.js';
import { createCourtUi } from '../../../src/ui/s46/court.js';
import { S47_PRESSURE_TEXT as P, S46_COURT_TEXT as C, TIP_TEXT, TIP_HELP_TEXT, FIRST_TEXT } from '../../../src/ui/text.js';
import { TIPS } from '../../../src/data/tips.js';
import { FIRSTS } from '../../../src/data/firsts.js';
import { allBuildings } from '../../../src/sim/world.js';

const store = (w, type) => allBuildings(w).find((b) => b.type === type);
// The court open at Market town, with a snapshot of production a year before year 8's first day: last year it made `made` of each good.
function quotaCity({ difficulty = 'normal', made = { pottery: 800, grain: 4000 }, snapshot = true } = {}) {
  const w = courtWorld({ open: true, difficulty });
  w.day = (QUOTA.fromYear - 1) * YEAR;
  w.tally.made = { ...made };
  w.court.yearMade = snapshot ? { day: w.day - YEAR, made: {} } : null;
  w.court.letters = []; w.court.request = null; w.court.nextRequestDay = w.day + 10 * YEAR; w.court.nextCardDay = w.day + 10 * YEAR;
  return w;
}
const text = (nodes) => nodes.map((n) => n.textContent).join(' | ');

describe('s47 quota: when it is asked', () => {
  it('asks nothing before year 8 nor with the court closed, and asks at year 8\'s first month end on every level, Peaceful too', () => {
    const early = quotaCity();
    early.day -= YEAR;                                                     // year 7's first day
    pressureMonth(early);
    expect(quotaOf(early)).toBe(null);
    const closed = quotaCity();
    closed.court.awake = false;
    pressureMonth(closed);
    expect(quotaOf(closed)).toBe(null);
    for (const d of ['peaceful', 'relaxed', 'normal', 'hard']) {
      const w = quotaCity({ difficulty: d });
      const events = [];
      pressureMonth(w, events);
      const q = quotaOf(w);
      expect([d, q && q.year, q && q.due, events.some((e) => e.type === 'court_quota' && e.result === 'asked')]).toEqual([d, QUOTA.fromYear, w.day + YEAR, true]);
    }
    // Only at the month end that begins a year.
    const mid = quotaCity();
    mid.day += MONTH;
    pressureMonth(mid);
    expect(quotaOf(mid)).toBe(null);
  });

  it('sizes each good at the difficulty\'s share of last year\'s output, the three it made most of by value, rounded to 5', () => {
    for (const d of ['relaxed', 'normal', 'hard']) {
      const w = quotaCity({ difficulty: d, made: { pottery: 800, grain: 4000, beer: 300, linen: 100, figs: 60 } });
      const ask = quotaAsk(w);
      // By value: pottery 6,400, grain 4,000, beer 3,000, linen 1,400, figs 180: the top three, named in the pool's order.
      const want = [['pottery', 800], ['beer', 300], ['grain', 4000]].map(([good, out]) => ({ good, base: Math.max(QUOTA.min, Math.round((out * QUOTA.share[d]) / QUOTA.step) * QUOTA.step), out }));
      expect([d, ask]).toEqual([d, want]);
    }
    // A good under QUOTA.least a year is not asked; nothing made at all asks nothing.
    const small = quotaCity({ made: { pottery: QUOTA.least - 1 } });
    expect(quotaAsk(small).map((a) => a.good).includes('pottery')).toBe(false);
  });

  it('reads last year\'s output from tally.made\'s rise since the year\'s snapshot, and from the court\'s outputPerMonth x 12 without one', () => {
    const w = quotaCity({ made: { pottery: 1500 } });
    w.court.yearMade = { day: w.day - YEAR, made: { pottery: 700 } };
    expect(yearOutput(w, 'pottery')).toBe(800);
    w.court.yearMade = null;                                              // an old save: no snapshot yet
    expect(yearOutput(w, 'pottery')).toBe(outputPerMonth(w, 'pottery') * 12);
    expect(outputPerMonth(w, 'pottery')).toBeGreaterThan(0);              // the potter works
    // The snapshot is taken at each year's start with the court open, so next year's output is this year's rise.
    const v = quotaCity({ made: { pottery: 900 } });
    pressureMonth(v);
    expect(v.court.yearMade).toEqual({ day: v.day, made: { pottery: 900 } });
  });
});

describe('s47 quota: sending, meeting and missing', () => {
  it('ships what the stores hold, part by part; met by month 6 it adds 8 favour and pays the gift; met later, 5', () => {
    for (const [months, favour] of [[2, QUOTA.favourEarly], [QUOTA.early, QUOTA.favourMet]]) {
      const w = quotaCity();
      pressureMonth(w);
      const q = quotaOf(w);
      const gift = q.gift;
      expect(gift).toBe(Math.max(QUOTA.giftMin, Math.round((QUOTA.giftShare * q.goods.reduce((n, g) => n + g.amount * GOOD_VALUE[g.good], 0)) / QUOTA.giftStep) * QUOTA.giftStep));
      w.day += months * MONTH;
      const pottery = q.goods.find((g) => g.good === 'pottery'), grain = q.goods.find((g) => g.good === 'grain');
      store(w, 'storehouse').store.pottery = pottery.amount;
      store(w, 'granary').store.grain = 0;
      const part = sendQuota(w);
      expect([part.ok, part.met, part.shipped]).toEqual([true, false, { pottery: pottery.amount }]);
      expect(sendQuota(w).reason).toBe('empty');                          // nothing more in store
      store(w, 'granary').store.grain = grain.amount + 10;
      w.court.favour = 50;
      const gold = w.gold;
      const st = quotaStatus(w);
      expect([st.completes, st.favour]).toEqual([true, favour]);           // what the sheet says before the tap
      const done = sendQuota(w);
      expect([months, done.met, done.favour, done.early, w.court.favour, w.gold - gold, stockOf(w, 'grain')]).toEqual([months, true, favour, months < QUOTA.early, 50 + favour, gift, 10]);
      expect([w.tally.quotasMet, quotaOf(w).result, sendQuota(w).reason]).toEqual([1, 'met', 'done']);
    }
  });

  it('costs 15 favour when missed at the year\'s end, and carries its own shortfall into next year once', () => {
    const w = quotaCity();
    pressureMonth(w);
    const q8 = quotaOf(w);
    const pottery8 = q8.goods.find((g) => g.good === 'pottery');
    store(w, 'storehouse').store.pottery = 30;
    store(w, 'granary').store.grain = 0;
    sendQuota(w);                                                         // 30 pottery shipped, the rest owed
    expect(carryIfMissed(quotaOf(w))).toEqual(Object.fromEntries(q8.goods.map((g) => [g.good, g.amount - (g.good === 'pottery' ? 30 : 0)])));
    w.court.favour = 50;
    w.day += YEAR;
    w.tally.made.pottery += 800; w.tally.made.grain += 4000;              // the same output again this year
    const events = [];
    pressureMonth(w, events);
    const missed = events.find((e) => e.type === 'court_quota' && e.result === 'missed');
    expect([missed.favour, w.court.favour, w.tally.quotasMissed]).toEqual([-QUOTA.favourMissed, 50 - QUOTA.favourMissed, 1]);
    const q9 = quotaOf(w);
    const pottery9 = q9.goods.find((g) => g.good === 'pottery');
    expect([q9.year, pottery9.carried, pottery9.amount]).toEqual([QUOTA.fromYear + 1, pottery8.amount - 30, pottery9.base + pottery8.amount - 30]);
    // Year 9 missed with nothing sent: only its own ask carries, never year 8's part again.
    w.day += YEAR;
    w.tally.made.pottery += 800; w.tally.made.grain += 4000;
    pressureMonth(w);
    const q10 = quotaOf(w);
    expect(q10.goods.find((g) => g.good === 'pottery').carried).toBe(pottery9.base);
    // Sent units pay the carried part first: shipping exactly the carried part leaves the whole own ask to carry.
    const c = { goods: [{ good: 'pottery', base: 100, carried: 40, amount: 140, sent: 40 }] };
    expect(carryIfMissed(c)).toEqual({ pottery: 100 });
  });

  it('keeps favour inside its range: a miss at 5 favour says and takes 5', () => {
    const w = quotaCity();
    pressureMonth(w);
    w.court.favour = 5;
    expect(quotaStatus(w).missFavour).toBe(-5);
    expect(favourChange(w, -QUOTA.favourMissed)).toBe(-5);
    w.day += YEAR;
    pressureMonth(w);
    expect(w.court.favour).toBe(0);
  });
});

describe('s47 quota: warnings, saves and words', () => {
  it('warns a year ahead: at year 7\'s first month end with the court open, and not with it closed', () => {
    for (const open of [true, false]) {
      const w = quotaCity();
      w.day = (QUOTA.warnYear - 1) * YEAR;
      w.court.awake = open;
      const events = [];
      pressureMonth(w, events);
      expect([open, events.some((e) => e.type === 'quota_warning' && e.year === QUOTA.fromYear)]).toEqual([open, open]);
    }
  });

  it('saves and loads a quota and its snapshot; a malformed quota is refused; a court with neither loads as it was', () => {
    const w = quotaCity();
    pressureMonth(w);
    const back = deserialize(serialize(w));
    expect([back.court.quota, back.court.yearMade]).toEqual([w.court.quota, w.court.yearMade]);
    const bad = JSON.parse(serialize(w));
    bad.court.quota.goods[0].sent = 'lots';
    expect(validateWorld(bad)).toBe(false);
    const none = JSON.parse(serialize(w));
    delete none.court.quota; delete none.court.yearMade;
    expect(validateWorld(none)).toBe(true);
  });

  it('says on the court sheet what the sim says: the ask, the bar, each good, the deadline in months, both favour cases and the carry', () => {
    const w = quotaCity();
    pressureMonth(w);
    const act = { send: () => sendQuota(w), select: () => {} };
    w.day += 2 * MONTH;
    store(w, 'storehouse').store.pottery = 20;
    store(w, 'granary').store.grain = 0;
    let st = quotaStatus(w);
    let nodes = quotaNodes(w, act);
    let all = text(nodes);
    expect(all).toContain(P.quotaTitle(st));
    expect(all).toContain(P.progress(st));
    for (const g of st.goods) expect(all).toContain(P.goodRow(g));
    expect(all).toContain(`${P.dueText(st)}.`);
    expect(st.monthsLeft).toBe(10);
    expect(all).toContain(`${P.ifMetText(st)}.`);
    expect(P.ifMetText(st)).toContain(`+${QUOTA.favourEarly} by month ${QUOTA.early} (4 months left), +${QUOTA.favourMet} after`);
    expect(all).toContain(`${P.ifMissedText(st)}.`);
    expect(all).toContain(`${P.sendConsequence(st)}.`);
    expect(P.sendConsequence(st)).toContain('Ships 20 pottery;');
    const bar = nodes.map((n) => n.querySelector && n.querySelector('[role="progressbar"]')).find(Boolean);
    expect([bar.getAttribute('aria-valuenow'), bar.getAttribute('aria-valuemax')]).toEqual([String(st.sent), String(st.total)]);
    // Past month 6: the plain favour, and the button names the whole send once the stores hold it all.
    w.day += 5 * MONTH;
    for (const g of quotaOf(w).goods) store(w, g.good === 'grain' ? 'granary' : 'storehouse').store[g.good] = g.amount;
    st = quotaStatus(w);
    all = text(quotaNodes(w, act));
    expect([st.early, P.ifMetText(st)]).toEqual([false, `favour +${QUOTA.favourMet} and ${st.gift} gold`]);
    expect(all).toContain(P.sendLabel(st));
    expect(P.sendLabel(st)).toBe('Send the tribute');
    // Nothing in store: the button is off and says why.
    for (const g of quotaOf(w).goods) store(w, g.good === 'grain' ? 'granary' : 'storehouse').store[g.good] = 0;
    nodes = quotaNodes(w, act);
    const send = nodes.find((n) => n.classList && n.classList.contains('quota-send')).querySelector('button');
    expect(send.disabled).toBe(true);
    expect(text(nodes)).toContain('Nothing to ship yet');
    // Met: when, and the next one's date in months.
    for (const g of quotaOf(w).goods) store(w, g.good === 'grain' ? 'granary' : 'storehouse').store[g.good] = g.amount;
    sendQuota(w);
    all = text(quotaNodes(w, act));
    expect(all).toContain(P.metLine(quotaStatus(w)));
    expect(all).toContain(P.nextLine(QUOTA.fromYear + 1, Math.ceil((nextQuotaDay(w) - w.day) / MONTH)));
  });

  it('names the owed tribute on the court summary with the months left, and not once it is met', () => {
    const w = quotaCity();
    pressureMonth(w);
    w.day += 3 * MONTH;
    const ui = createCourtUi({ world: w, celebrations: { show() {} }, store: { get: () => ({}), set() {} } });
    const said = () => ui.sheetParts.summary().map((n) => n.textContent).join(' | ');
    expect(said()).toContain(`${P.quotaHead}${P.summaryLine(quotaStatus(w))}`);
    expect(P.summaryLine(quotaStatus(w))).toBe(`0 of ${quotaStatus(w).total} sent, 9 months left`);
    for (const g of quotaOf(w).goods) store(w, g.good === 'grain' ? 'granary' : 'storehouse').store[g.good] = g.amount;
    sendQuota(w);
    expect(said().includes(P.quotaHead)).toBe(false);
    ui.destroy();
  });

  it('shows nothing before year 7, then the warning with today\'s ask, and logs a quota on the court\'s past letters', () => {
    const w = quotaCity();
    w.day = (QUOTA.warnYear - 1) * YEAR - MONTH;
    expect(quotaNodes(w, {})).toEqual([]);
    w.day += 2 * MONTH;
    const all = text(quotaNodes(w, {}));
    expect(all).toContain(P.warning(quotaAsk(w)));
    expect(quotaAsk(w).length).toBeGreaterThan(0);
    const log = { kind: 'quota', result: 'missed', year: 8, goods: [{ good: 'pottery', amount: 100, sent: 30 }], favour: -15, gold: 0 };
    expect(C.logLine(log)).toBe('Year 8\'s tribute missed (70 pottery short): favour −15');
  });

  it('has a first, three tips with How to play words, and none of them quotes a number the data does not hold', () => {
    expect(FIRSTS.some((f) => f.id === 'first_quota_met' && f.check.key === 'quotasMet')).toBe(true);
    expect(FIRST_TEXT.first_quota_met.why).toContain(`+${QUOTA.favourEarly} by month ${QUOTA.early}`);
    for (const id of ['tribute_quota', 'raids_wealth', 'upper_tiers']) {
      expect([id, TIPS.some((t) => t.id === id), typeof TIP_TEXT[id], typeof TIP_HELP_TEXT[id]]).toEqual([id, true, 'string', 'string']);
    }
    const shares = Object.values(QUOTA.share).map((x) => x * 100);
    expect(TIP_HELP_TEXT.tribute_quota).toContain(`${Math.min(...shares)}-${Math.max(...shares)}% of a year's output`);
    expect(TIP_HELP_TEXT.tribute_quota).toContain(`+${QUOTA.favourMet} favour (+${QUOTA.favourEarly} early); missed: −${QUOTA.favourMissed}`);
    expect(TIP_HELP_TEXT.tribute_quota).toContain(`From year ${QUOTA.fromYear}`);
  });
});
