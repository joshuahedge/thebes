// Version 6.0, Track A (rulings 644-650): the court's demands. From Town about once a year: goods, gold, a building or soldiers; every number on
// the record when it is offered (ruling 612); an offer lapses as declined; accepted, it is met by Send (or by the building standing) or failed by
// its deadline. Each set up both ways.
import { describe, it, expect } from '../../harness.js';
import { addRaw } from '../../helpers/testWorld.js';
import { courtWorld, YEAR, MONTH } from '../../stage46/court/courtHelpers.js';
import {
  courtDemands, demandMonth, demandDay, acceptDemand, declineDemand, meetDemand, demandStatus, demandFavour, demandAlerts, demandItems, demandsOn, demandBuilding, buildMonths,
} from '../../../src/sim/demands.js';
import { stockOf } from '../../../src/sim/court.js';
import { allBuildings } from '../../../src/sim/world.js';
import { DEMANDS, DEMAND_KINDS, newDemandState } from '../../../src/data/reign.js';
import { MILESTONES } from '../../../src/data/progression.js';
import { MONUMENTS } from '../../../src/data/monuments.js';
import { GOOD_VALUE } from '../../../src/data/court.js';
import { serialize, deserialize } from '../../../src/save/serialize.js';

// A Market town (courtWorld) whose first demand is due now.
function due(opts = {}) {
  const w = courtWorld(opts);
  w.day = 2 * YEAR;
  w.demands.nextDay = w.day;
  return w;
}
// Puts a demand of the kind given on the record (as demandMonth would draw it), offered.
function offered(w, rec) {
  const d = { id: w.demands.nextId++, good: null, type: null, amount: 1, reward: 100, day: w.day, accepted: false, offerDue: w.day + DEMANDS.offerMonths * MONTH, due: w.day + DEMANDS.offerMonths * MONTH, months: 8, met: 10, failed: 16, declined: DEMANDS.favour.declined, had: null, ...rec };
  w.demands.open.push(d);
  return d;
}
const months = (w, n, events = null) => { for (let i = 0; i < n * MONTH; i++) { w.day += 1; demandDay(w, events); if (w.day % MONTH === 0) demandMonth(w, events); } };

describe('v60 a demands: when the court asks', () => {
  it('asks nothing before Town, and from Town schedules the first DEMANDS.firstMonths on, then offers one at a time about once a year', () => {
    const w = courtWorld();
    w.milestone = 'village';
    demandMonth(w);
    expect([demandsOn(w), w.demands.nextDay, w.demands.open.length]).toEqual([false, null, 0]);
    w.milestone = 'town';
    w.day = 3 * MONTH;
    demandMonth(w);
    expect(w.demands.nextDay).toBe(3 * MONTH + DEMANDS.firstMonths * MONTH);
    const events = [];
    w.day = w.demands.nextDay;
    demandMonth(w, events);
    expect(w.demands.open.length).toBe(1);
    const d = w.demands.open[0];
    expect(events.map((e) => e.type)).toEqual(['demand_offered']);
    const gap = (w.demands.nextDay - d.day) / MONTH;
    expect(gap >= DEMANDS.gapMonths[0] && gap <= DEMANDS.gapMonths[1]).toBe(true);
    w.day = w.demands.nextDay;                                                      // still open: no second one
    demandMonth(w);
    expect(w.demands.open.length).toBe(1);
  });

  it('puts every number on the record when it is offered: the ask, its deadline once accepted, the reward and the favour each answer moves', () => {
    const w = due();
    demandMonth(w);
    const d = courtDemands(w)[0];
    expect(DEMAND_KINDS).toContain(d.kind);
    expect([d.accepted, d.due, d.offerDue, d.monthsLeft]).toEqual([false, w.day + DEMANDS.offerMonths * MONTH, w.day + DEMANDS.offerMonths * MONTH, DEMANDS.offerMonths]);
    const [lo, hi] = DEMANDS.deadlineMonths[d.kind];
    expect(d.months >= lo && d.months <= hi).toBe(true);
    expect(d.reward).toBeGreaterThanOrEqual(DEMANDS.rewards.min);
    expect(d.met >= DEMANDS.favour.met[0] && d.met <= DEMANDS.favour.met[1]).toBe(true);
    expect(d.failed >= DEMANDS.favour.failed[0] && d.failed <= DEMANDS.favour.failed[1]).toBe(true);
    expect(d.declined).toBe(DEMANDS.favour.declined);
    expect(demandFavour(w, d)).toEqual({ met: d.met, failed: -d.failed, declined: -d.declined });
  });

  it('draws the same demand from the same city (seeded), and another from another seed; a save in between changes nothing', () => {
    const a = due(), b = due();
    demandMonth(a); demandMonth(b);
    expect(a.demands).toEqual(b.demands);
    const c = deserialize(serialize(due()));
    demandMonth(c);
    expect(c.demands).toEqual(a.demands);
    const seeds = new Set();
    for (const seed of [1, 2, 3, 4, 5, 6, 7, 8]) { const w = due({ seed }); demandMonth(w); const d = w.demands.open[0]; seeds.add(`${d.kind}:${d.good}:${d.amount}:${d.months}`); }
    expect(seeds.size).toBeGreaterThan(1);
  });

  it('sizes a goods demand from the city\'s own output, and a gold demand from its taxes, never past its share of the treasury', () => {
    for (let seed = 1; seed < 40; seed++) {
      const w = due({ seed });
      demandMonth(w);
      const d = w.demands.open[0];
      if (d.kind === 'goods') expect([seed, d.amount % DEMANDS.amounts.goods.step, d.amount >= DEMANDS.amounts.goods.min, d.reward >= Math.round(d.amount * GOOD_VALUE[d.good] * DEMANDS.rewards.goods[0] / 10) * 10 - 10]).toEqual([seed, 0, true, true]);
      if (d.kind === 'gold') expect([seed, d.amount <= Math.floor(w.gold * DEMANDS.amounts.gold.reserve)]).toEqual([seed, true]);
    }
  });
});

describe('v60 a demands: answers', () => {
  it('lapses an offer left unanswered as declined: favour falls by its own number and the tally counts it failed', () => {
    const w = due();
    const d = offered(w, { kind: 'gold', amount: 300 });
    const f0 = w.court.favour;
    const events = [];
    w.day = d.offerDue - 1;
    demandDay(w, events);
    expect(w.demands.open.length).toBe(1);
    w.day = d.offerDue;
    demandDay(w, events);
    expect([w.demands.open.length, w.court.favour, w.tally.demandsFailed, w.demands.log[0].result]).toEqual([0, f0 - d.declined, 1, 'refused']);
    expect(events.map((e) => [e.type, e.result])).toEqual([['demand_settled', 'refused']]);
  });

  it('starts the deadline on Accept and meets a goods demand by Send: the goods leave, favour rises, the reward is paid', () => {
    const w = due();
    const d = offered(w, { kind: 'goods', good: 'pottery', amount: 150, reward: 600 });
    expect(meetDemand(w, d.id).reason).toBe('offered');
    expect(acceptDemand(w, d.id).ok).toBe(true);
    expect(acceptDemand(w, d.id).reason).toBe('accepted');
    expect(w.demands.open[0].due).toBe(w.day + d.months * MONTH);
    const [pottery, gold, favour] = [stockOf(w, 'pottery'), w.gold, w.court.favour];
    const r = meetDemand(w, d.id);
    expect([r.ok, stockOf(w, 'pottery'), w.gold, w.court.favour, w.tally.demandsMet]).toEqual([true, pottery - 150, gold + 600, favour + d.met, 1]);
    expect(w.demands.log.map((e) => [e.result, e.good, e.amount])).toEqual([['met', 'pottery', 150]]);
  });

  it('refuses Send while the stores hold less (reason short, nothing taken), and fails the demand when its deadline passes', () => {
    const w = due();
    const d = offered(w, { kind: 'goods', good: 'pottery', amount: 500 });
    acceptDemand(w, d.id);
    const st = demandStatus(w, w.demands.open[0]);
    expect([st.ok, st.reason, st.have, st.need]).toEqual([false, 'short', 200, 500]);
    expect(meetDemand(w, d.id).reason).toBe('short');
    expect(stockOf(w, 'pottery')).toBe(200);
    const f0 = w.court.favour, events = [];
    w.day = w.demands.open[0].due;
    demandDay(w, events);
    expect([w.demands.open.length, w.court.favour, w.tally.demandsFailed, events[0].result]).toEqual([0, f0 - d.failed, 1, 'failed']);
  });

  it('meets a gold demand from the treasury, and refuses it with too little gold', () => {
    const w = due();
    const d = offered(w, { kind: 'gold', amount: 1000, reward: 300 });
    acceptDemand(w, d.id);
    w.gold = 900;
    expect(meetDemand(w, d.id).reason).toBe('no_gold');
    w.gold = 1500;
    expect(meetDemand(w, d.id).ok).toBe(true);
    expect(w.gold).toBe(1500 - 1000 + 300);
  });

  it('meets a building demand on its own the day one more stands than when it was accepted (a monument once finished)', () => {
    const w = due();
    w.milestone = 'city';
    expect(demandBuilding(w)).toBe('obelisk_large');
    const d = offered(w, { kind: 'building', type: 'obelisk_small', reward: 200 });
    acceptDemand(w, d.id);
    expect(w.demands.open[0].had).toBe(0);
    const ob = addRaw(w, 'obelisk_small', 30, 11);
    demandDay(w);
    expect(w.demands.open.length).toBe(1);                                          // a site is not yet one standing
    ob.site.done = w.day;
    ob.site.course = 3;
    demandDay(w);
    expect([w.demands.open.length, w.tally.demandsMet]).toEqual([0, 1]);
  });

  it('declines an offer by the button (its own favour), and gives up an accepted demand at its failure cost', () => {
    const w = due();
    const a = offered(w, { kind: 'gold', amount: 100 });
    const f0 = w.court.favour;
    expect(declineDemand(w, a.id).favour).toBe(-a.declined);
    expect(w.court.favour).toBe(f0 - a.declined);
    const b = offered(w, { kind: 'gold', amount: 100 });
    acceptDemand(w, b.id);
    expect(declineDemand(w, b.id).favour).toBe(-b.failed);
    expect(w.demands.log.map((e) => e.result)).toEqual(['refused', 'failed']);
  });
});

describe('v60 a demands: said in the alert row and Advice', () => {
  it('raises an offer at once, an accepted demand only near its deadline and only while it is not ready', () => {
    const w = due();
    const d = offered(w, { kind: 'goods', good: 'pottery', amount: 300 });
    expect(demandAlerts(w)).toEqual([{ code: 'demand_offered', demand: d.id }]);
    let out = [];
    demandItems(w, [], out);
    expect(out.map((x) => [x.key, x.kind, x.weight])).toEqual([[`demand:${d.id}`, 'demand', DEMANDS.advice.offered]]);
    acceptDemand(w, d.id);
    expect(demandAlerts(w)).toEqual([]);
    w.day = w.demands.open[0].due - DEMANDS.reminderMonths * MONTH;
    expect(demandAlerts(w)).toEqual([{ code: 'demand_due', demand: d.id, months: DEMANDS.reminderMonths }]);
    allBuildings(w).find((b) => b.type === 'storehouse').store.pottery = 400;   // ready: Send is all that is left
    expect(demandAlerts(w)).toEqual([]);
    out = [];
    demandItems(w, [], out);
    expect(out).toEqual([]);
  });

  it('starts a migrated city\'s demands from its load (nothing open, the first scheduled at its first month end)', () => {
    const w = courtWorld();
    w.milestone = 'capital';
    w.day = 5 * YEAR;
    w.demands = newDemandState();
    demandMonth(w);
    expect([w.demands.open.length, w.demands.nextDay]).toEqual([0, 5 * YEAR + DEMANDS.firstMonths * MONTH]);
    months(w, DEMANDS.firstMonths);
    expect(w.demands.open.length).toBe(1);
  });
});

describe('v60 a demands: a building demand can be met inside its deadline', () => {
  it('never names a building whose build time plus slack passes the shortest building deadline, at any rank', () => {
    const w = due();
    const shortest = DEMANDS.deadlineMonths.building[0];
    const named = new Set();
    for (const m of MILESTONES) {
      w.milestone = m.id;
      const t = demandBuilding(w);
      if (t === null) continue;
      named.add(t);
      expect([m.id, t, buildMonths(t) + DEMANDS.buildSlackMonths <= shortest]).toEqual([m.id, t, true]);
    }
    expect(named.has('obelisk_large')).toBe(true);
    expect(named.has('colossus') || named.has('great_sphinx')).toBe(false);                    // 24 and 18 months of crews: they could not be met
    expect(buildMonths('colossus') + DEMANDS.buildSlackMonths).toBeGreaterThan(DEMANDS.deadlineMonths.building[1]);
    expect(buildMonths('temple')).toBe(0);
    expect(buildMonths('obelisk_large')).toBe(MONUMENTS.obelisk_large.crewMonths / MONUMENTS.obelisk_large.crews);
  });

  it('draws only deadlines that fit: every building demand the court offers from a Great city on has months for its build time', () => {
    let seen = 0;
    for (let seed = 1; seed <= 80; seed++) {
      const w = due({ seed });
      w.milestone = 'great_city';
      demandMonth(w);
      const d = courtDemands(w)[0];
      if (!d || d.kind !== 'building') continue;
      seen++;
      expect([seed, d.type, d.months >= buildMonths(d.type) + DEMANDS.buildSlackMonths]).toEqual([seed, d.type, true]);
    }
    expect(seen).toBeGreaterThan(0);
  });
});
