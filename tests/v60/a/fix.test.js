// Version 6.0, Wave 4 fix batch 1 (track A's part; rulings 786, 788, 789, 794 and the review's words): Advice names a great-work offering the stores cannot pay, the court takes no due
// from a treasury below 0 while the great temple rises, a version 8 city's first due waits a year from its load, the demand clock, the guided city gets no demand, the words
// for giving up a demand, a building demand's crews and the How to play due line. Each set up both ways, and every number a sentence says is read back from the sim.
import { describe, it, expect } from '../../harness.js';
import { makeTestWorld, setRoad, addRaw, staffAll } from '../../helpers/testWorld.js';
import { courtWorld, openCourt, YEAR, MONTH } from '../../stage46/court/courtHelpers.js';
import { courtDue, dueComing, dueFromDay, nextDueDay, pressureMonth } from '../../../src/sim/pressure.js';
import { demandAlerts, demandItems, dueWarning, demandMonth, demandDay, declineDemand, acceptDemand, demandsOn, courtDemands } from '../../../src/sim/demands.js';
import { cityAdvice } from '../../../src/sim/advice.js';
import { offeringOf, offeringSource } from '../../../src/sim/monuments.js';
import { lessonWorld } from '../../../src/sim/lesson.js';
import { costOf } from '../../../src/sim/costs.js';
import { adviceWords } from '../../../src/ui/adviceText.js';
import { causeFix } from '../../../src/ui/monumentSheet.js';
import { nearestTerrainTile } from '../../../src/ui/goalsList.js';
import { dueNodes } from '../../../src/ui/s46/court.js';
import { V60_REIGN_TEXT as R, V60_HELP } from '../../../src/ui/text.js';
import { COURT_DUE, DEMANDS, GREAT_WORK } from '../../../src/data/reign.js';
import { GRACE_DAYS } from '../../../src/data/hazards.js';
import { MONUMENTS } from '../../../src/data/monuments.js';
import { BUILDINGS } from '../../../src/data/buildings.js';
import { QUOTA } from '../../../src/data/s47.js';

// ── Ruling 786: the great temple's offering, in Advice ──
// The Seat with the great temple founded on a road, a granary and a storehouse; the great work's own record says how many offerings it has had.
function seat({ course = 0, offered = 0, grain = 0, beer = 0, reason = null } = {}) {
  const w = makeTestWorld({ size: 40, gold: 50000 });
  w.milestone = 'seat';
  setRoad(w, 0, 20, 39, 20);
  const gw = addRaw(w, GREAT_WORK.type, 10, 15);
  addRaw(w, 'granary', 23, 21, { store: grain ? { grain } : {} });
  addRaw(w, 'storehouse', 20, 21, { store: beer ? { beer } : {} });
  staffAll(w);
  gw.site.course = course;
  gw.site.reason = reason;
  w.reign.greatWork = gw.id;
  w.reign.offered = offered;
  return { w, gw };
}
const offeringItem = (w) => { const out = []; demandItems(w, [], out); return out.find((i) => i.key === 'great_offering') || null; };

describe('v60 a fix: Advice names the great temple\'s waiting offering (ruling 786)', () => {
  it('raises it while the stores hold less than the stage asks: weight 20 (under the due\'s 25, over an offer\'s 12), the store holding most of the good as its fix', () => {
    const first = offeringOf(makeTestWorld(), 0);
    const { w, gw } = seat({ grain: first.n - 5 });
    const a = offeringItem(w);
    expect([a.kind, a.weight, a.count, a.id]).toEqual(['demand', DEMANDS.advice.offering, 1, null]);
    expect(DEMANDS.advice.offering).toBe(20);
    expect(DEMANDS.advice.offered < DEMANDS.advice.offering && DEMANDS.advice.offering < DEMANDS.advice.due).toBe(true);
    const granary = Object.values(w.buildings).find((b) => b.type === 'granary');
    expect(a.data).toEqual({ offering: true, good: first.good, n: first.n, have: first.n - 5, stage: 0, waiting: false, producer: 'farm_grain', held: true, maker: null, makerIdle: null });
    expect(a.fix).toEqual({ select: granary.id, target: { x: granary.x + granary.w / 2, y: granary.y + granary.d / 2 }, why: 'great_offering' });
    expect([a.cost, a.afford]).toEqual([null, null]);
    const words = adviceWords(a, w);
    expect(words.what).toBe(`The great temple's next offering is ${first.n} grain: your stores hold ${first.n - 5}`);
    expect(words.fix).toContain('grain');
    expect(words.action.label).toBe('View');
    expect(gw.site.course).toBe(0);
  });

  it('is not raised once the stores hold it, and not before the course that comes before its stage, nor with no great work standing', () => {
    const first = offeringOf(makeTestWorld(), 0);
    expect(offeringItem(seat({ grain: first.n }).w)).toBe(null);                              // held: nothing to say
    expect(offeringItem(seat({ grain: first.n + 100 }).w)).toBe(null);
    const second = offeringOf(makeTestWorld(), 1);                                            // stage 1's offering: clay
    expect(offeringItem(seat({ offered: 1, course: 0 }).w)).toBe(null);                       // stage 0's first course: the next offering is two courses off
    const before = offeringItem(seat({ offered: 1, course: GREAT_WORK.perStage - 1 }).w);      // the course before stage 1 begins
    expect([before.data.good, before.data.n, before.data.stage, before.data.waiting]).toEqual([second.good, second.n, 1, false]);
    const waiting = offeringItem(seat({ offered: 1, course: GREAT_WORK.perStage, reason: 'waiting_offering' }).w);   // the crews wait for it
    expect([waiting.data.stage, waiting.data.waiting]).toEqual([1, true]);
    expect(adviceWords(waiting, makeTestWorld()).why).toContain('waiting');
    expect(offeringItem(seat({ offered: GREAT_WORK.stages.length, course: 9 }).w)).toBe(null);   // every offering made
    const none = makeTestWorld({ size: 40, gold: 50000 });
    none.milestone = 'seat';
    expect(offeringItem(none)).toBe(null);
    const done = seat({ course: 9, offered: 4 });
    done.gw.site.done = done.w.day;
    expect(offeringItem(done.w)).toBe(null);                                                   // finished: nothing to offer
  });

  it('names the producer\'s card when no store holds any of the good, and says so', () => {
    const { w } = seat();
    const a = offeringItem(w);
    expect(offeringSource(w, 'grain')).toEqual({ store: null, producer: 'farm_grain', maker: null });   // (6.0.1, ruling 805: no grain farm stands, so the card is offered)
    expect([a.data.held, a.data.have]).toEqual([false, 0]);
    expect(a.fix).toEqual({ item: 'farm_grain', at: 'terrain', target: { x: 12.5, y: 17.5 } });
    expect([a.cost, a.afford]).toEqual([costOf(w, 'farm_grain'), true]);
    const words = adviceWords(a, w);
    expect(words.fix).toBe('No store holds any grain: build a grain farm to make it');
    expect(words.action.label).toBe('Show me');
    expect(words.cost).toContain(`${costOf(w, 'farm_grain')} gold`);
    w.gold = -5000;
    expect(offeringItem(w).afford).toBe(false);                                               // the treasury cannot pay: the words say so
    // beer, the fourth stage's good: its producer is the brewer, and a storehouse holding some is the fix
    const b = seat({ offered: 3, course: 6, beer: 40 });
    const item = offeringItem(b.w);
    expect([item.data.good, item.data.have, item.data.producer, item.fix.why]).toEqual(['beer', 40, 'brewery', 'great_offering']);
  });

  it('is in the Advice list, ranked by its weight, and clears when the stores are filled', () => {
    const first = offeringOf(makeTestWorld(), 0);
    const { w } = seat({ grain: 10 });
    expect(cityAdvice(w).some((a) => a.key === 'great_offering')).toBe(true);
    Object.values(w.buildings).find((b) => b.type === 'granary').store.grain = first.n;
    expect(cityAdvice(w).some((a) => a.key === 'great_offering')).toBe(false);
  });
});

// ── Ruling 788: no due from a treasury below 0 while the great temple rises ──
function capitalCourt({ gold = 20000 } = {}) {
  const w = courtWorld({ open: true });
  w.milestone = 'capital';
  w.gold = gold;
  w.court.favour = 50;
  w.day = (QUOTA.fromYear - 2) * YEAR + 6 * MONTH;                              // year 7, month 7: year 8's due is the first
  return w;
}

describe('v60 a fix: the court takes nothing from a treasury in debt while the great temple rises (ruling 788)', () => {
  it('takes nothing below 0 while the temple rises, the twentieth at 0 or more, and the full due once it stands finished', () => {
    const w = capitalCourt({ gold: -500 });
    const site = addRaw(w, GREAT_WORK.type, 22, 12);
    expect(COURT_DUE.inDebt).toBe(0);
    const owed = courtDue(w);
    expect([owed.gold, owed.inDebt, owed.greatWork]).toEqual([0, true, true]);
    expect(dueWarning(w)).toBe(null);                                           // nothing owed, nothing to warn of
    w.gold = 0;
    const edge = courtDue(w);
    expect([edge.inDebt, edge.greatWork, edge.gold > 0]).toEqual([false, true, true]);   // 0 is not below 0: the taxes' share, cut to a twentieth
    w.gold = 40000;
    expect(Math.abs(courtDue(w).gold - Math.max(0.45 * 40000, courtDue(w).fromTaxes) * COURT_DUE.greatWork)).toBeLessThanOrEqual(COURT_DUE.step);
    w.gold = -500;
    site.site.done = w.day;                                                      // finished: the great work no longer rises, so debt is no excuse
    const full = courtDue(w);
    expect([full.inDebt, full.greatWork, full.gold > 0]).toEqual([false, false, true]);
  });

  it('takes the year\'s start due out of a treasury in credit and none from one in debt; a city with no temple is still taken from into debt (the careless run)', () => {
    const debt = capitalCourt({ gold: -500 });
    addRaw(debt, GREAT_WORK.type, 22, 12);
    debt.day = (QUOTA.fromYear - 1) * YEAR;
    const events = [];
    pressureMonth(debt, events);
    expect([debt.gold, events.some((e) => e.type === 'court_due')]).toEqual([-500, false]);
    expect(debt.court.log.some((e) => e.kind === 'due')).toBe(false);
    const careless = capitalCourt({ gold: -500 });
    careless.day = (QUOTA.fromYear - 1) * YEAR;
    const due = courtDue(careless).gold;
    expect(due).toBeGreaterThan(0);
    pressureMonth(careless, []);
    expect(careless.gold).toBe(-500 - due);                                     // taken all the same: the careless city falls further into debt
  });

  it('says what the sim does: nothing is taken, in the court sheet\'s due line, the summary line and How to play', () => {
    const w = capitalCourt({ gold: -500 });
    addRaw(w, GREAT_WORK.type, 22, 12);
    const due = courtDue(w);
    expect(R.dueNow(due, 8)).toBe('Year 8: nothing is taken while the great temple rises and the treasury is below 0.');
    expect(R.dueParts(due, w.gold)).toBe('');
    expect(R.dueSummary(due)).toBe('Nothing while the great temple rises and the treasury is below 0');
    const nodes = dueNodes(w).map((n) => n.textContent);
    expect(nodes.some((t) => t.includes('nothing is taken'))).toBe(true);
    expect(nodes.some((t) => t.includes('into debt'))).toBe(false);              // no "the due takes it past 0" line when nothing is due
    w.gold = 100;
    const credit = courtDue(w);
    expect(R.dueNow(credit, 8)).toContain('about');
    expect(R.dueParts(credit, w.gold)).toContain('cut to a twentieth while the great temple rises');
    const how = V60_HELP.a.find((h) => h.head === "The court's due").text;
    expect(how).toContain(`×${COURT_DUE.favour.low}`);
    expect(how).toContain(`×${COURT_DUE.favour.high}`);
    expect(how).toContain('a twentieth');
    expect(how).toContain('below 0');
    expect(how).toContain('into debt');
    expect(how).toContain('older save');
  });
});

// ── Ruling 789: a version 8 city's first due ──
describe('v60 a fix: a version 8 city\'s first due waits a year from its load (ruling 789)', () => {
  it('is not taken at the year\'s start a month after the load, and is taken a year on; the court says the later day', () => {
    const w = capitalCourt({ gold: 50000 });
    const load = (QUOTA.fromYear - 1) * YEAR - MONTH;                            // loaded a month before year 8 begins
    w.day = load;
    w.hazards.graceUntil = load + GRACE_DAYS;                                    // what the v8 -> v9 migration sets
    expect([dueFromDay(w), dueComing(w)]).toEqual([load + YEAR, true]);
    const yearEight = (QUOTA.fromYear - 1) * YEAR, yearNine = QUOTA.fromYear * YEAR;
    expect([nextDueDay(w), courtDue(w).day]).toEqual([yearNine, yearNine]);      // the day it is said to come: a year from the load, on a year's start
    expect(courtDue(w).monthsLeft).toBe(Math.round((yearNine - load) / MONTH));
    w.day = yearEight;
    const events = [];
    pressureMonth(w, events);
    expect([w.gold, events.some((e) => e.type === 'court_due')]).toEqual([50000, false]);
    w.day = yearNine;
    const due = courtDue(w).gold;
    expect(due).toBeGreaterThan(0);
    pressureMonth(w, events);
    expect([w.gold, events.filter((e) => e.type === 'court_due').map((e) => e.gold)]).toEqual([50000 - due, [due]]);
  });

  it('changes nothing for a new city (its load day is 0) or a world whose grace was set into the future by a test', () => {
    const fresh = capitalCourt({ gold: 50000 });
    expect(fresh.hazards.graceUntil).toBe(GRACE_DAYS);
    expect(dueFromDay(fresh)).toBe(0);
    fresh.day = (QUOTA.fromYear - 1) * YEAR;
    const events = [];
    pressureMonth(fresh, events);
    expect(events.some((e) => e.type === 'court_due')).toBe(true);                // taken at year 8's start, as ever
    const never = capitalCourt({ gold: 50000 });
    never.hazards.graceUntil = 1e9;                                              // tests/v60/b1/grace.js: the older runs' grace that never ends
    expect(dueFromDay(never)).toBe(0);
    never.day = (QUOTA.fromYear - 1) * YEAR;
    const later = [];
    pressureMonth(never, later);
    expect(later.some((e) => e.type === 'court_due')).toBe(true);
  });
});

// ── Ruling 794 and the guided city ──
describe('v60 a fix: the demand clock and the guided first city', () => {
  it('counts the next demand from the offer (ruling 794): settling it does not move the clock, and the court sheet says the days left', () => {
    const w = courtWorld();
    w.day = 2 * YEAR;
    w.demands.nextDay = w.day;
    demandMonth(w);
    const d = w.demands.open[0];
    const gap = (w.demands.nextDay - d.day) / MONTH;
    expect(gap >= DEMANDS.gapMonths[0] && gap <= DEMANDS.gapMonths[1]).toBe(true);
    const clock = w.demands.nextDay;
    acceptDemand(w, d.id);
    w.day += 3 * MONTH;
    declineDemand(w, d.id);                                                       // given up: settled
    expect(w.demands.nextDay).toBe(clock);                                        // the clock ran from the offer
    w.day = clock + MONTH;                                                         // the deadline had been long: the next is due at once
    demandMonth(w);
    expect(courtDemands(w).length).toBe(1);
  });

  it('makes no demand of the guided first city, at any rank, and still makes one of an ordinary Town', () => {
    const lesson = lessonWorld();
    lesson.milestone = 'town';
    expect(demandsOn(lesson)).toBe(false);
    lesson.day = 4 * YEAR;
    for (let i = 0; i < 40; i++) { demandMonth(lesson); lesson.day += MONTH; }
    expect([lesson.demands.nextDay, lesson.demands.open.length]).toEqual([null, 0]);
    expect(demandAlerts(lesson).some((a) => a.code === 'demand_offered')).toBe(false);
    const city = courtWorld({ open: true });
    city.milestone = 'town';
    expect(demandsOn(city)).toBe(true);
    demandMonth(city);
    expect(city.demands.nextDay === null).toBe(false);
  });
});

// ── The words ──
describe('v60 a fix: words that say what the sim does', () => {
  it('says "given up" for a demand being given up, with the favour the sim takes, not "failed (the deadline passes)"', () => {
    const f = { met: 11, failed: -17, declined: -5 };
    expect(R.giveUpWhat(f)).toBe('Given up: it counts as failed now, favour −17.');
    expect(R.giveUpWhat(f).includes('deadline')).toBe(false);
    expect(R.failed(f)).toContain('the deadline passes');                          // the line before the choice still says what a missed deadline costs
    const w = courtWorld({ open: true });
    w.day = 2 * YEAR;
    const d = { id: 1, kind: 'gold', good: null, type: null, amount: 300, reward: 100, day: w.day, accepted: true, offerDue: w.day, due: w.day + 6 * MONTH, months: 6, met: 10, failed: 17, declined: 5, had: null };
    w.demands.open.push(d);
    w.court.favour = 60;
    const before = w.court.favour;
    declineDemand(w, 1);
    expect(w.court.favour).toBe(before - 17);                                       // what the button said
    expect(w.demands.log[0].result).toBe('failed');
  });

  it('names the crews a building demand takes: a monument\'s builders\' guild crews and the months with all of them, nothing for a temple', () => {
    const o = MONUMENTS.obelisk_large;
    const words = R.buildIt({ kind: 'building', type: 'obelisk_large' });
    expect(words).toContain(`${o.crews} builders' guild crews`);
    expect(words).toContain(`${o.crewMonths / o.crews} months`);
    expect(R.buildIt({ kind: 'building', type: 'obelisk_small' })).toContain('1 builders\' guild crew:');
    expect(BUILDINGS.temple.monument).toBeFalsy();
    expect(R.buildIt({ kind: 'building', type: 'temple' }).includes('crew')).toBe(false);
  });
});

// ── The great-work sheet's Show me (the review's A minor, with ruling 786's source of the good) ──
describe('v60 a fix: the great temple\'s waiting row has a way to the good', () => {
  it('views the store holding most of the good, and shows the producer\'s card on its ground nearest the site when none holds any (6.0.1, ruling 805)', () => {
    const first = offeringOf(makeTestWorld(), 0);
    const held = seat({ grain: 30, reason: 'waiting_offering' });
    const view = causeFix(held.w, held.gw, 'waiting_offering');
    expect(view).toEqual({ view: Object.values(held.w.buildings).find((b) => b.type === 'granary').id });
    const none = seat({ reason: 'waiting_offering' });
    const c = { x: none.gw.x + none.gw.w / 2, y: none.gw.y + none.gw.d / 2 };
    const ground = nearestTerrainTile(none.w, BUILDINGS.farm_grain.terrain, c);   // a grain farm needs fertile ground: the test world's strip at x 0-7
    expect(ground.x < 8).toBe(true);
    expect(causeFix(none.w, none.gw, 'waiting_offering')).toEqual({ showMe: { category: 'food', item: 'farm_grain', x: ground.x, y: ground.y } });
    expect(first.good).toBe('grain');
    none.gw.site.course = 9;                                                       // no offering owed now (past the last stage's start): nothing to point at
    none.w.reign.offered = GREAT_WORK.stages.length;
    expect(causeFix(none.w, none.gw, 'waiting_offering')).toBe(null);
  });
});
