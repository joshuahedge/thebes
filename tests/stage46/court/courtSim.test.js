// The Court track's sim tests (rulings 336-339, 370-379): favour and its effects on raids, when the court opens, requests (their sizing,
// sending, refusing and missing), the alert, gifts and the world's determinism. Every rule a sentence will state is set up both ways.
import { describe, it, expect } from '../../harness.js';
import { createWorld, allBuildings, makeBuilding, insertBuilding } from '../../../src/sim/world.js';
import { addRaw } from '../../helpers/testWorld.js';
import { FAVOUR, REQUESTS, COURT, GOOD_VALUE, REQUEST_KINDS, GIFTS } from '../../../src/data/court.js';
import { RAIDS } from '../../../src/data/raids.js';
import { GOODS, FOOD_GOODS, MATERIAL_GOODS } from '../../../src/data/goods.js';
import {
  courtDay, courtMonth, courtAlerts, courtOpen, favourBand, addFavour, favourRaidSize, favourTributeFactor, requestStatus, sendRequest,
  refuseRequest, readLetter, stockOf, outputPerMonth, askableGoods, monthsLeft,
} from '../../../src/sim/court.js';
import { tributeFor, raidSize } from '../../../src/sim/raids.js';
import { alertsFor } from '../../../src/sim/alerts.js';
import { unitsAtHome, unitsAway } from '../../../src/sim/armies.js';
import { tickDay } from '../../../src/sim/clock.js';
import { triage } from '../../../src/ui/alerts.js';
import { alertText } from '../../../src/ui/text.js';
import { courtWorld, openCourt, runCourt, MONTH, YEAR } from './courtHelpers.js';

const withUnits = (w, n) => {
  const bar = insertBuilding(w, makeBuilding(w, 'barracks', 20, 12));
  for (let i = 0; i < n; i++) w.soldiers.push({ id: w.nextUnitId++, kind: 'soldier', barracks: bar.id, x: 21, y: 13, hp: 12, hit: false, task: 'wait' });
  return bar;
};

describe('s46 court favour', () => {
  it('starts at 50 and drifts one point a month toward 50, from above and from below', () => {
    const w = courtWorld({ open: true });
    expect(w.court.favour).toBe(FAVOUR.start);
    w.court.favour = 62;
    courtMonth(w);
    expect(w.court.favour).toBe(61);
    w.court.favour = 38;
    courtMonth(w);
    courtMonth(w);
    expect(w.court.favour).toBe(40);
    w.court.favour = 50;
    courtMonth(w);
    expect(w.court.favour).toBe(50);
  });
  it('stays between 0 and 100 and names its band at the thresholds (inclusive)', () => {
    const w = courtWorld({ open: true });
    expect([addFavour(w, 80), w.court.favour]).toEqual([50, 100]);
    expect([addFavour(w, -200), w.court.favour]).toEqual([-100, 0]);
    const bands = [[0, 'low'], [30, 'low'], [31, 'steady'], [69, 'steady'], [70, 'high'], [100, 'high']];
    for (const [f, band] of bands) { w.court.favour = f; expect([f, favourBand(w)]).toEqual([f, band]); }
  });
  it('makes a raid one size step bigger at 30 or less, never past the cap, and leaves it alone above 30', () => {
    const w = courtWorld({ open: true });
    w.court.favour = 31;
    expect(favourRaidSize(w, 8)).toBe(8);
    w.court.favour = 30;
    expect([favourRaidSize(w, 8), favourRaidSize(w, 2), favourRaidSize(w, 4), favourRaidSize(w, 14)]).toEqual([10, 3, 5, 18]);
    expect([favourRaidSize(w, RAIDS.maxSize - 1), favourRaidSize(w, RAIDS.maxSize)]).toEqual([RAIDS.maxSize, RAIDS.maxSize]);
    w.court.favour = 0;
    expect(favourRaidSize(w, 8)).toBe(10);
    w.court.favour = 90;
    expect(favourRaidSize(w, 8)).toBe(8);
  });
  it('changes the warned raid size and its tribute through raids.js, and never the first raid', () => {
    const w = createWorld({ seed: 3 });
    w.raid.index = 3;
    w.court.favour = 50;
    const base = raidSize(w), tribute = tributeFor(w, 9);
    w.court.favour = 20;
    expect(raidSize(w)).toBe(favourRaidSize(w, base));
    expect(raidSize(w)).toBeGreaterThan(base - 1);
    w.court.favour = 80;
    expect(tributeFor(w, 9)).toBe(Math.round(0.8 * (tribute)));
    w.court.favour = 10;
    expect(tributeFor(w, 9)).toBe(Math.round(1.2 * tribute));
    w.raid.index = 0;
    for (const f of [0, 50, 100]) { w.court.favour = f; expect(raidSize(w)).toBe(RAIDS.firstSize); }
  });
  it('gives tribute 20% less at 70 or more and 20% more at 30 or less', () => {
    const w = courtWorld({ open: true });
    for (const [f, k] of [[100, 0.8], [70, 0.8], [69, 1], [31, 1], [30, 1.2], [0, 1.2]]) { w.court.favour = f; expect([f, favourTributeFactor(w)]).toEqual([f, k]); }
  });
});

describe('s46 court opening', () => {
  it('stays closed before Market town or without the trading goal, and opens when both hold (or at City)', () => {
    const w = courtWorld();
    w.milestone = 'town';
    courtDay(w);
    expect(courtOpen(w)).toBe(false);
    w.milestone = 'market_town';
    w.goals.completed = [];
    courtDay(w);
    expect(courtOpen(w)).toBe(false);
    w.milestone = 'city';
    courtDay(w);
    expect(courtOpen(w)).toBe(true);
    const v = courtWorld();
    courtDay(v);
    expect([courtOpen(v), v.court.guided]).toEqual([true, 'pending']);
  });
  it('writes the guided letter no earlier than year 2 and 10 days after opening, an easy request the stores can meet', () => {
    const w = courtWorld();
    w.day = 100;
    courtDay(w);
    expect(w.court.nextRequestDay).toBe((REQUESTS.firstYear - 1) * YEAR);
    runCourt(w, YEAR - 100 - 1);
    expect(w.court.request).toBe(null);
    runCourt(w, 2);
    const r = w.court.request;
    expect([r.guided, r.met, r.missed, r.gold, w.court.guided]).toEqual([true, REQUESTS.guided.met, REQUESTS.guided.missed, REQUESTS.guided.reward, 'issued']);
    expect(requestStatus(w).ok).toBe(true);
    expect(r.amount).toBeLessThanOrEqual(stockOf(w, r.good));
    expect(r.amount).toBeLessThanOrEqual(Math.round(stockOf(w, r.good) * REQUESTS.guided.stockShare / 5) * 5);
    expect(r.due - r.day).toBe(REQUESTS.guided.deadlineMonths * MONTH);
    const late = courtWorld();
    late.day = 5 * YEAR;
    courtDay(late);
    expect(late.court.nextRequestDay).toBe(5 * YEAR + COURT.guidedDelayDays);
  });
  it('asks a little gold of a city with no stock, and waits when it has neither', () => {
    const w = courtWorld();
    for (const b of allBuildings(w)) b.store = {};
    openCourt(w);
    runCourt(w, 12);
    expect(w.court.request.kind).toBe('gold');
    expect(w.court.request.amount).toBeLessThanOrEqual(REQUESTS.guided.goldMax);
    const poor = courtWorld();
    for (const b of allBuildings(poor)) b.store = {};
    poor.gold = 10;
    openCourt(poor);
    runCourt(poor, 40);
    expect([poor.court.request, poor.court.guided]).toEqual([null, 'pending']);
  });
});

describe('s46 court: never the last of the food (ruling 374)', () => {
  it('asks the first letter for a household good before food, for plenty of food if no other good, else gold', () => {
    const w = courtWorld();
    openCourt(w); runCourt(w, 12);
    expect(w.court.request.good).toBe('pottery');                            // 200 pottery in store, 600 grain: the luxury is asked
    const f = courtWorld();
    for (const b of allBuildings(f)) if (b.type === 'storehouse') b.store = {};
    openCourt(f); runCourt(f, 12);
    expect([f.court.request.kind, f.court.request.good]).toEqual(['food', 'grain']);
    expect(f.court.request.amount).toBeLessThanOrEqual(240);
    const s = courtWorld();
    for (const b of allBuildings(s)) { if (b.type === 'storehouse') b.store = {}; if (b.type === 'granary') b.store = { grain: 59 }; }
    openCourt(s); runCourt(s, 12);
    expect(s.court.request.kind).toBe('gold');                               // 59 grain is a city's last: it is not asked for
  });
  it('names a food only when the stores hold at least half of what would be asked, so a short city is never asked for bread', () => {
    const w = courtWorld({ seed: 4 });
    expect(askableGoods(w, 'food', 5)).toEqual(['grain']);                   // 600 grain in store, 60 to 120 asked
    for (const b of allBuildings(w)) if (b.type === 'granary') b.store = { grain: 20 };
    expect(askableGoods(w, 'food', 5)).toEqual([]);
    expect(askableGoods(w, 'food')).toEqual(['grain']);                      // asked of the city without a letter in mind: what it makes
    for (let seed = 1; seed <= 60; seed++) {
      const v = courtWorld({ seed });
      for (const b of allBuildings(v)) if (b.type === 'granary') b.store = { grain: 20 };
      v.court.awake = true; v.court.guided = 'answered'; v.court.nextRequestDay = YEAR; v.day = YEAR;
      courtDay(v);
      expect(v.court.request.kind === 'food').toBe(false);
    }
  });
});

describe('s46 court requests', () => {
  const openRequest = (w) => { openCourt(w); runCourt(w, 12); return w.court.request; };
  const afterGuided = (w) => { openRequest(w); sendRequest(w); const day = w.court.nextRequestDay; w.day = day; courtDay(w); return w.court.request; };

  it('asks for the good the city makes, in months of its output, rounded, and more of it for a bigger output', () => {
    const w = courtWorld();
    w.seed = 5;
    const r = afterGuided(w);
    expect(REQUEST_KINDS).toContain(r.kind);
    if (r.good) expect(outputPerMonth(w, r.good)).toBeGreaterThan(0);
    const small = courtWorld({ seed: 5 });
    const big = courtWorld({ seed: 5 });
    for (const b of allBuildings(big)) if (b.type === 'farm_grain') b.staff = 10;
    addRaw(big, 'farm_grain', 2, 14);
    addRaw(big, 'farm_grain', 4, 14);
    for (const b of allBuildings(big)) b.staff = 10;
    for (const b of allBuildings(small)) b.staff = 10;
    expect(outputPerMonth(big, 'grain')).toBeGreaterThan(outputPerMonth(small, 'grain'));
    const lo = REQUESTS.amounts.food.months[0] * outputPerMonth(small, 'grain'), hi = REQUESTS.amounts.food.months[1] * outputPerMonth(small, 'grain');
    expect(lo).toBe(60);
    expect(hi).toBe(120);
  });
  it('sizes goods and food requests by months of output, scaled by the difficulty, over many seeds', () => {
    const sizes = (difficulty) => {
      const out = [];
      for (let seed = 1; seed <= 40; seed++) {
        const w = courtWorld({ difficulty, seed });
        w.court.awake = true; w.court.guided = 'answered'; w.court.nextRequestDay = YEAR; w.day = YEAR;
        courtDay(w);
        const r = w.court.request;
        if (r && r.kind === 'food') out.push(r.amount);
      }
      return out;
    };
    const easy = sizes('relaxed'), normal = sizes('normal'), hard = sizes('hard');
    const mean = (a) => a.reduce((s, x) => s + x, 0) / Math.max(1, a.length);
    expect(easy.length).toBeGreaterThan(3);
    expect(mean(hard)).toBeGreaterThan(mean(normal));
    expect(mean(normal)).toBeGreaterThan(mean(easy));
    for (const n of normal) { expect(n >= 60 && n <= 120).toBe(true); expect(n % 10).toBe(0); }
  });
  it('draws deadlines of 6-12 months, favour of +10..+15 met and -10..-20 missed, and a reward in gold, from the seed alone', () => {
    const seen = { due: new Set(), met: new Set(), missed: new Set() };
    for (let seed = 1; seed <= 60; seed++) {
      const w = courtWorld({ seed });
      w.court.awake = true; w.court.guided = 'answered'; w.court.nextRequestDay = YEAR; w.day = YEAR;
      courtDay(w);
      const r = w.court.request;
      if (!r) continue;
      seen.due.add((r.due - r.day) / MONTH); seen.met.add(r.met); seen.missed.add(r.missed);
      expect(r.gold).toBeGreaterThan(0);
      const again = courtWorld({ seed });
      again.court.awake = true; again.court.guided = 'answered'; again.court.nextRequestDay = YEAR; again.day = YEAR;
      courtDay(again);
      expect(again.court.request).toEqual(r);
    }
    expect([...seen.due].every((m) => m >= 6 && m <= 12 && Number.isInteger(m))).toBe(true);
    expect([...seen.met].every((n) => n >= 10 && n <= 15)).toBe(true);
    expect([...seen.missed].every((n) => n >= 10 && n <= 20)).toBe(true);
    expect(seen.due.size).toBeGreaterThan(2);
    expect(seen.met.size).toBeGreaterThan(2);
  });
  it('comes every 8-14 months, one at a time: the next waits for the open one to be answered', () => {
    const w = courtWorld({ seed: 7 });
    w.court.awake = true; w.court.guided = 'answered'; w.court.nextRequestDay = YEAR; w.day = YEAR;
    courtDay(w);
    const first = w.court.request;
    expect(w.court.nextRequestDay - YEAR >= 8 * MONTH && w.court.nextRequestDay - YEAR <= 14 * MONTH).toBe(true);
    w.court.nextRequestDay = w.day + 5;
    w.day += 5;
    courtDay(w);
    expect(w.court.request).toBe(first);                                      // still open: no second request
    refuseRequest(w);
    expect(w.court.nextRequestDay).toBeGreaterThan(w.day);                    // a month's breather before the next
    w.day = w.court.nextRequestDay;
    courtDay(w);
    expect(w.court.request.id).toBeGreaterThan(first.id);
  });
  it('never asks for more gold than the reserve share of the treasury, and does not ask at all when that is under the minimum (ruling 383)', () => {
    const A = REQUESTS.amounts.gold;
    const asked = (gold, seed) => {
      const v = courtWorld({ seed });
      v.court.awake = true; v.court.guided = 'answered'; v.court.nextRequestDay = YEAR; v.day = YEAR;
      v.gold = gold;
      courtDay(v);
      return v.court.request;
    };
    for (let seed = 1; seed <= 60; seed++) {
      expect(Boolean(asked(150, seed) && asked(150, seed).kind === 'gold')).toBe(false);          // 50% of 150 is under the 100 minimum
      const r = asked(300, seed);
      if (r && r.kind === 'gold') expect(r.amount).toBeLessThanOrEqual(Math.floor(300 * A.reserve));
    }
  });
  it('can ask for soldiers only of a city with two or more units, never all of them, and for gold only of a city that has it', () => {
    const w = courtWorld({ seed: 3 });
    withUnits(w, 1);
    const kinds = new Set();
    for (let seed = 1; seed <= 80; seed++) {
      const v = courtWorld({ seed });
      v.court.awake = true; v.court.guided = 'answered'; v.court.nextRequestDay = YEAR; v.day = YEAR;
      withUnits(v, 4);
      courtDay(v);
      if (v.court.request) kinds.add(v.court.request.kind);
      if (v.court.request && v.court.request.kind === 'soldiers') expect(v.court.request.amount >= 1 && v.court.request.amount <= 3).toBe(true);
    }
    expect(kinds.has('soldiers')).toBe(true);
    for (let seed = 1; seed <= 80; seed++) {
      const v = courtWorld({ seed });
      v.court.awake = true; v.court.guided = 'answered'; v.court.nextRequestDay = YEAR; v.day = YEAR;
      v.gold = 50;
      courtDay(v);
      expect(v.court.request.kind === 'gold').toBe(false);
    }
  });
  it('meets a goods request: the stores lose exactly the amount, favour rises and the reward is paid', () => {
    const w = courtWorld();
    const r = openRequest(w);
    const before = { stock: stockOf(w, r.good), gold: w.gold, favour: w.court.favour, met: w.tally.requestsMet };
    expect(requestStatus(w)).toEqual({ ok: true, reason: null, have: before.stock, need: r.amount, monthsLeft: 12 });
    const events = [];
    const res = sendRequest(w, events);
    expect([res.ok, stockOf(w, r.good), w.gold, w.court.favour, w.tally.requestsMet]).toEqual([true, before.stock - r.amount, before.gold + r.gold, before.favour + r.met, before.met + 1]);
    expect([w.court.request, w.court.letters.length, w.court.guided, events[0].type, events[0].result]).toEqual([null, 0, 'answered', 'court_request', 'met']);
    expect(w.court.log[0].result).toBe('met');
  });
  it('refuses to send what the stores do not hold, taking nothing, and says why', () => {
    const w = courtWorld();
    const r = openRequest(w);
    for (const b of allBuildings(w)) b.store = { [r.good]: 1 };
    const gold = w.gold;
    expect(requestStatus(w).reason).toBe('short');
    expect(sendRequest(w)).toEqual({ ok: false, reason: 'short' });
    expect([w.gold, w.court.request.id, stockOf(w, r.good)]).toEqual([gold, r.id, 1]);
  });
  it('meets a gold request from the treasury and refuses one the treasury cannot pay', () => {
    const w = courtWorld({ seed: 2 });
    openCourt(w);
    w.court.request = { id: 9, kind: 'gold', good: null, amount: 400, day: w.day, due: w.day + 8 * MONTH, gold: 60, met: 12, missed: 15, guided: false };
    w.court.letters.push({ id: 9, kind: 'request', day: w.day, read: false });
    w.gold = 399;
    expect(sendRequest(w)).toEqual({ ok: false, reason: 'no_gold' });
    w.gold = 500;
    expect(sendRequest(w).ok).toBe(true);
    expect(w.gold).toBe(500 - 400 + 60);
    expect(w.court.favour).toBe(62);
  });
  it('lends soldiers for six months through the Armies interface, then they return', () => {
    const w = courtWorld({ seed: 2 });
    openCourt(w);
    withUnits(w, 4);
    w.court.request = { id: 9, kind: 'soldiers', good: null, amount: 2, day: w.day, due: w.day + 8 * MONTH, gold: 100, met: 12, missed: 15, guided: false };
    w.court.letters.push({ id: 9, kind: 'request', day: w.day, read: false });
    w.raid.active = { size: 3 };
    expect(requestStatus(w)).toEqual({ ok: false, reason: 'raid', have: 4, need: 2, monthsLeft: 8 });
    expect(sendRequest(w).reason).toBe('raid');
    w.raid.active = null;
    const day = w.day;
    expect(sendRequest(w).ok).toBe(true);
    expect([unitsAtHome(w).soldier, unitsAway(w)]).toEqual([2, [{ kind: 'soldier', n: 2, back: day + REQUESTS.soldiersMonths * MONTH }]]);
    for (let d = 0; d <= REQUESTS.soldiersMonths * MONTH; d++) tickDay(w);
    expect(unitsAtHome(w).soldier).toBe(4);
    withUnits(w, 0);
    w.court.request = { id: 10, kind: 'soldiers', good: null, amount: 9, day: w.day, due: w.day + 8 * MONTH, gold: 100, met: 12, missed: 15, guided: false };
    expect(requestStatus(w).reason).toBe('not_enough');
  });
  it('costs the favour the letter named on refusing, and the same on missing the deadline', () => {
    const a = courtWorld();
    const r = openRequest(a);
    const refused = refuseRequest(a);
    expect([refused.favour, a.court.favour, a.tally.requestsMissed, a.court.request, a.court.log[0].result]).toEqual([-r.missed, 50 - r.missed, 1, null, 'refused']);
    const b = courtWorld();
    const q = openRequest(b);
    const events = [];
    b.day = q.due - 1;
    courtDay(b, events);
    expect(b.court.request).toBe(q);
    b.day = q.due;
    courtDay(b, events);
    expect([b.court.request, b.court.favour, b.tally.requestsMissed, b.court.letters.filter((l) => l.kind === 'request').length, b.court.log[0].result, events.some((e) => e.type === 'court_request' && e.result === 'missed')]).toEqual([null, 50 - q.missed, 1, 0, 'missed', true]);
    expect(b.court.guided).toBe('answered');
  });
  it('keeps favour from going below 0 when a request is missed at low favour', () => {
    const w = courtWorld();
    const r = openRequest(w);
    w.court.favour = 4;
    w.day = r.due;
    courtDay(w);
    expect(w.court.favour).toBe(0);
  });
  it('gives every good a request can name a value, so rewards are sized, and none to the materials', () => {
    for (const g of Object.keys(GOODS)) if (!MATERIAL_GOODS.includes(g)) expect([g, Number.isFinite(GOOD_VALUE[g])]).toEqual([g, true]);
    const w = courtWorld({ seed: 4 });
    expect(askableGoods(w, 'food')).toEqual(['grain']);
    expect(askableGoods(w, 'goods')).toEqual(['pottery']);
    expect(FOOD_GOODS).toContain('grain');
  });
});

describe('s46 court letters and alerts', () => {
  const guided = (w) => { openCourt(w); runCourt(w, 12); return w.court.request; };
  it('raises one court_letter alert while a letter is unread, with the unread count', () => {
    const w = courtWorld();
    expect(courtAlerts(w)).toEqual([]);
    const r = guided(w);
    expect(courtAlerts(w)).toEqual([{ code: 'court_letter', letter: r.id, count: 1 }]);
    expect(alertsFor(w).filter((a) => a.code === 'court_letter').length).toBe(1);
    w.court.letters.push({ id: 50, kind: 'card', card: 'festival', day: w.day, read: false, args: {} });
    expect(courtAlerts(w)[0].count).toBe(2);
    expect(courtAlerts(w)[0].letter).toBe(r.id);                                 // the oldest first: one at a time
  });
  it('stops once the letters are read, counts each read once, and comes back within two months of a request\'s deadline', () => {
    const w = courtWorld();
    const r = guided(w);
    expect([readLetter(w, r.id), readLetter(w, r.id), w.tally.lettersRead]).toEqual([true, false, 1]);
    expect(courtAlerts(w)).toEqual([]);
    w.day = r.due - 3 * MONTH;
    expect(courtAlerts(w)).toEqual([]);
    w.day = r.due - 2 * MONTH;
    expect(courtAlerts(w)).toEqual([{ code: 'court_letter', letter: r.id, count: 1, due: true }]);
    w.day = r.due - 1;
    expect(monthsLeft(w, r.due)).toBe(1);
    expect(courtAlerts(w)[0].due).toBe(true);
    sendRequest(w);
    expect(courtAlerts(w)).toEqual([]);
  });
  it('ranks below a raid warning and above debt in the alert row', () => {
    const w = courtWorld();
    guided(w);
    const alerts = [{ code: 'debt' }, ...courtAlerts(w), { code: 'raid_warning', arrives: w.day + 10, dir: 'east' }];
    expect(triage(w, alerts).critical.map((a) => a.code)).toEqual(['raid_warning', 'court_letter', 'debt']);
  });
  it('never raises a request letter with no request open (a stale record), and words an unknown letter by its head', () => {
    const w = courtWorld();
    guided(w);
    const stale = { id: 70, kind: 'request', day: w.day, read: false };
    w.court.request = null;
    w.court.letters = [stale];
    expect(courtAlerts(w)).toEqual([]);
    w.court.letters.push({ id: 71, kind: 'card', card: 'festival', day: w.day, read: false, args: {} });
    expect(courtAlerts(w)).toEqual([{ code: 'court_letter', letter: 71, count: 1 }]);
    expect(alertText({ code: 'court_letter', letter: 70, count: 1 }, w)).toEqual({ title: 'A letter from the court', fix: '' });
    w.court.letters.push({ id: 72, kind: 'card', card: 'no_such_card', day: w.day, read: false, args: {} });
    expect(alertText({ code: 'court_letter', letter: 72, count: 1 }, w).title).toBe('A letter from the court');
  });
  it('says nothing before the court opens, and is empty on a fresh city', () => {
    expect(courtAlerts(createWorld({ seed: 2 }))).toEqual([]);
  });
});

describe('s46 court gifts', () => {
  it('sends a gift every six months while favour is 70 or more, gold or a good the city makes, and none below 70', () => {
    const w = courtWorld({ open: true });
    w.court.guided = 'answered';
    w.court.favour = 80;
    const gifts = [];
    const events = [];
    for (let m = 1; m <= 14; m++) { w.day += MONTH; w.court.favour = 80; courtMonth(w, events); }
    for (const e of events) if (e.type === 'court_gift') gifts.push(e);
    expect(gifts.length).toBe(2);
    expect(w.tally.gifts).toBe(2);
    for (const g of gifts) expect(g.gold > 0 || (g.good !== null && g.n >= GIFTS.goods.min)).toBe(true);
    const v = courtWorld({ open: true });
    v.court.favour = 69;
    for (let m = 1; m <= 14; m++) { v.day += MONTH; v.court.favour = 69; courtMonth(v); }
    expect([v.tally.gifts, v.court.nextGiftDay]).toEqual([0, null]);
  });
  it("keeps the gift clock running when favour drifts below 70, and pays at the first month's end from its day with favour at 70 or more (ruling 375)", () => {
    const w = courtWorld({ open: true });
    w.court.guided = 'answered';
    w.day = 2 * YEAR;                                                            // a month's end
    w.court.favour = 60;
    expect(addFavour(w, 12)).toBe(12);                                           // a request met: 72, and the clock starts
    const due = w.day + FAVOUR.giftEveryMonths * MONTH;
    expect(w.court.nextGiftDay).toBe(due);
    const events = [];
    for (let m = 1; m <= FAVOUR.giftEveryMonths; m++) { w.day += MONTH; courtMonth(w, events); }   // drift alone: 72 -> 66
    expect([w.day, w.court.favour, w.tally.gifts, w.court.nextGiftDay]).toEqual([due, 66, 0, due]);   // due, but favour is under 70: it waits
    w.day += MONTH; courtMonth(w, events);
    expect([w.tally.gifts, w.court.nextGiftDay]).toEqual([0, due]);
    addFavour(w, 10);                                                            // 75 mid-month
    w.day += MONTH; courtMonth(w, events);                                       // 74 at the month's end: the gift comes
    expect([w.court.favour, w.tally.gifts, events.filter((e) => e.type === 'court_gift').length]).toEqual([74, 1, 1]);
    expect(w.court.nextGiftDay).toBe(w.day + FAVOUR.giftEveryMonths * MONTH);
    // Held at 70 or more the whole time, the gift comes at its day exactly.
    const h = courtWorld({ open: true });
    h.day = 2 * YEAR;
    h.court.favour = 72;
    courtMonth(h);                                                               // 71, the clock starts here
    const hDue = h.court.nextGiftDay;
    expect(hDue).toBe(h.day + FAVOUR.giftEveryMonths * MONTH);
    for (let m = 1; m < FAVOUR.giftEveryMonths; m++) { h.day += MONTH; h.court.favour = 72; courtMonth(h); }
    expect(h.tally.gifts).toBe(0);
    h.day += MONTH; h.court.favour = 72; courtMonth(h);
    expect([h.day, h.tally.gifts]).toEqual([hDue, 1]);
  });
  it('a gift of goods that finds no room comes as gold', () => {
    const w = courtWorld({ open: true, seed: 11 });
    for (const b of allBuildings(w)) if (b.type === 'storehouse' || b.type === 'granary') b.store = { grain: 600, pottery: 800 - 600 };
    for (const b of allBuildings(w)) if (b.type === 'storehouse') b.store = { pottery: 800 };
    const gold = w.gold;
    const events = [];
    for (let m = 1; m <= 24; m++) { w.day += MONTH; w.court.favour = 90; courtMonth(w, events); }
    const gifts = events.filter((e) => e.type === 'court_gift');
    expect(gifts.length).toBe(3);                                            // months 7, 13 and 19
    expect(gifts.every((g) => g.good === null && g.gold > 0)).toBe(true);
    expect(w.gold - gold).toBe(gifts.reduce((s, g) => s + g.gold, 0));
  });
});

describe('s46 court in the sim', () => {
  it('opens and writes its first letter through the real daily tick, and the same city gives the same letters', () => {
    const run = (seed) => {
      const w = courtWorld({ seed });
      w.day = YEAR - 5;
      for (let i = 0; i < 40; i++) tickDay(w);
      return w.court;
    };
    const a = run(3), b = run(3);
    expect(a.request).toBeTruthy();
    expect(a).toEqual(b);
    expect(a.guided).toBe('issued');
  });
  it('changes nothing in a city that never reaches Market town', () => {
    const w = createWorld({ seed: 4 });
    const before = JSON.stringify(w.court);
    for (let i = 0; i < 400; i++) tickDay(w);
    expect(JSON.stringify(w.court)).toBe(before);
  });
});
