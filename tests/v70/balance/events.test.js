// Version 7.0, the balance pass (wave 3): the city events in the long balance runs. The late run (from year 6), the careless run, the great-work run (from year 10) and the dangers-on
// runs play with the events on, answered as a steady player does (./events.js); village, capital and the dangers-off grand run keep the hold (../e/hold.js: their numbers are what
// the commits that wrote them calibrated). What this file holds: each run's record of what was drawn and answered is whole and obeys the sim's own promises (a default never costs gold,
// the first event waits for Town and its first year, one or two a year), the player's habits say what they claim (set up both ways), and the Keep at least floors keep the great
// temple's offerings in the great-work run (the caravan never sells below them). The numbers behind each run's headline are in docs/superpowers/notes/2026-10-23-version-7-0-balance.md.
import { describe, it, expect } from '../../harness.js';
import { eventPlayer, pick, spareOf, SPARE, GREAT_SPARE, KINDS } from './events.js';
import { eventWorld, offer } from '../e/helpers.js';
import { releaseEvents, NEVER } from '../e/hold.js';
import { eventChoices } from '../../../src/sim/cityEvents.js';
import { EVENT_DEFS, CITY_EVENTS } from '../../../src/data/cityEvents.js';
import { lateRun, runLate } from '../../stage47/pressure/lateRun.js';
import { greatWorkRun, keepOfferings } from '../../v60/a/greatWorkRun.js';
import { lateDangerRun, grandDangerRun, greatDangerRun } from '../../v60/balance/dangerRuns.js';
import { deserialize } from '../../../src/save/serialize.js';
import { advanceDays } from '../../../src/sim/clock.js';
import { setTradeOrder, nextCaravanDay, tradeMonth, tradePost, tradeStock, keepAtLeast } from '../../../src/sim/trade.js';
import { heldBack } from '../../../src/sim/tradeRules.js';
import { buildingsInReach } from '../../../src/sim/reach.js';
import { stockOf } from '../../../src/sim/court.js';
import { offeringOf } from '../../../src/sim/monuments.js';
import { BUILDINGS } from '../../../src/data/buildings.js';
import { TRADE_REACH } from '../../../src/data/trade.js';
import { GREAT_WORK } from '../../../src/data/reign.js';
import { DAYS_PER_MONTH, MONTHS_PER_YEAR } from '../../../src/sim/time.js';

const YEAR = DAYS_PER_MONTH * MONTHS_PER_YEAR;
let careless = null;
const carelessRun = () => careless || (careless = runLate({ defend: false, send: false, fetchClay: false, answer: false }));

// What every run's record must say: whole rows, known kinds, a default never costing gold, the gaps between offers (CITY_EVENTS.gapMonths), nothing offered before `from`.
function checkRecord(label, rec, from, { allLapse = false } = {}) {
  const rows = rec.drawn;
  expect([label, rows.length >= 3]).toEqual([label, true]);
  for (const r of rows) {
    expect([label, r.kind, KINDS.includes(r.kind), Number.isInteger(r.id), Number.isInteger(r.offered), r.offered >= from]).toEqual([label, r.kind, true, true, true, true]);
    if (r.result === null) continue;                                                     // the one still waiting when the run ended
    expect([label, r.kind, r.result === 'answered' || r.result === 'lapsed', typeof r.default, r.day >= r.offered]).toEqual([label, r.kind, true, 'boolean', true]);
    if (r.result === 'lapsed') expect([label, r.kind, r.default, r.gold >= 0]).toEqual([label, r.kind, true, true]);   // the stated default, and it never costs gold
    if (allLapse) expect([label, r.kind, r.result]).toEqual([label, r.kind, 'lapsed']);
  }
  for (let i = 1; i < rows.length; i++) expect([label, i, rows[i].offered - rows[i - 1].offered >= CITY_EVENTS.gapMonths[0] * DAYS_PER_MONTH]).toEqual([label, i, true]);
  expect(rows.filter((r) => r.result !== null).length).toBeGreaterThanOrEqual(rows.length - 1);
}

describe('v70 balance events: what the long runs drew', () => {
  it('the late run plays years 6 to 15 with the events on: whole rows, none before year 6, a default never costing gold', () => {
    const r = lateRun();
    checkRecord('late', r.eventRec, 6 * YEAR);
    expect(r.eventRec.drawn.length).toBeGreaterThanOrEqual(6);                           // one or two a year over nine years
    expect(r.eventRec.drawn.some((d) => d.result === 'answered' && !d.default)).toBe(true);   // the player paid for one of them
  });

  it('the careless run lets every event wait out its months: every one takes its stated default', () => {
    const r = carelessRun();
    checkRecord('careless', r.eventRec, 6 * YEAR, { allLapse: true });
  });

  it('the great-work run plays years 10 to 20 with the events on: whole rows, none before year 10, floors kept for the offerings and gone when the last is made', () => {
    const r = greatWorkRun();
    checkRecord('great', r.eventRec, 10 * YEAR);
    expect(r.won !== null).toBe(true);
    expect(r.w.trade.floors).toEqual({});                                                // keepOfferings: every offering made, no floor left
  });

  it('the dangers-on runs: the late run has the events from day 0 (never before Town and its first months), the grand district run from year 7, the great-work runs from year 10', () => {
    const late = lateDangerRun(), grand = grandDangerRun();
    checkRecord('late-dangers', late.events, 0);
    expect(late.events.drawn[0].offered).toBeGreaterThanOrEqual(CITY_EVENTS.firstMonths * DAYS_PER_MONTH);
    checkRecord('grand-dangers', grand.events, 6 * YEAR);
    for (const [seed, habits] of [[5, true], [10, false]]) {
      const g = greatDangerRun(seed, { habits });
      checkRecord(`great-dangers-${seed}`, g.events, 10 * YEAR);
    }
  });
});

describe('v70 balance events: the player\'s habits say what they claim', () => {
  it('holds the hold: a world made under it has its next event on day NEVER, releaseEvents makes it today and leaves a world with its own date alone', () => {
    const w = eventWorld();
    w.cityEvents.nextDay = NEVER;
    w.day = 4000;
    releaseEvents(w);
    expect(w.cityEvents.nextDay).toBe(4000);
    w.cityEvents.nextDay = 4500;
    releaseEvents(w);
    expect(w.cityEvents.nextDay).toBe(4500);
  });

  it('pays a price that is a tenth of the treasury beyond its spare and leaves a dearer one to its default; a strike or a quarrel may cost a quarter', () => {
    const w = eventWorld({ gold: 100000, ill: 3 });
    const ev = offer(w, 'healer');
    const fee = eventChoices(w, ev).find((c) => c.id === 'cure').gold;
    expect(fee).toBeGreaterThan(0);
    w.gold = SPARE + fee * 20;                                                           // the price is a twentieth of what is spare: paid
    expect(pick(w, ev).id).toBe('cure');
    w.gold = SPARE + fee * 5;                                                            // a fifth: not for a healer ...
    expect(pick(w, ev).id).toBe('send_away');
    w.gold = SPARE + fee * 5 - 1;
    const strike = offer(w, 'quarry_strike');
    const strikeFee = eventChoices(w, strike).find((c) => c.id === 'raise_wages').gold;
    w.gold = SPARE + strikeFee * 4;                                                      // ... but for a strike a quarter is fair
    expect(pick(w, strike).id).toBe('raise_wages');
    w.gold = SPARE + strikeFee * 3;
    expect(pick(w, strike).id).toBe('strike');
    w.gold = strikeFee + SPARE - 1;                                                      // and never below the spare
    expect(pick(w, strike).id).toBe('strike');
  });

  it('keeps 15,000 for the crews from the founding of the great temple until it is finished, 800 otherwise', () => {
    const w = { reign: { greatWork: null }, buildings: {} };
    expect(spareOf(w)).toBe(SPARE);
    w.reign.greatWork = 7;
    w.buildings[7] = { site: { done: null } };
    expect(spareOf(w)).toBe(GREAT_SPARE);
    w.buildings[7].site.done = 6000;
    expect(spareOf(w)).toBe(SPARE);
  });

  it('spends goods on a choice only above what trade holds back for them: the festival\'s beer is given with no floor and kept with one', () => {
    const w = eventWorld({ gold: 100000 });
    const ev = offer(w, 'opet');
    const small = eventChoices(w, ev).find((c) => c.id === 'small');
    expect(small.ok).toBe(true);
    expect(pick(w, ev).id).toBe('small');
    w.trade.floors.beer = stockOf(w, 'beer');                                            // Keep at least: all of it
    expect(heldBack(w, 'beer').units).toBe(stockOf(w, 'beer'));
    expect(pick(w, ev).id).toBe('decline');
    delete w.trade.floors.beer;
    expect(pick(w, ev).id).toBe('small');
  });

  it('records each answer: the day offered and answered, the choice, whether it was the stated default and the gold it moved', () => {
    const w = eventWorld({ gold: 100000, ill: 3 });
    const player = eventPlayer();
    offer(w, 'healer');
    player.onMonth(w, []);
    const row = player.rec.drawn[0];
    expect([row.kind, row.choice, row.default, row.result, row.day, row.offered]).toEqual(['healer', 'cure', false, 'answered', w.day, w.day]);
    expect(row.gold).toBeLessThan(0);
    expect(w.cityEvents.waiting).toBe(null);
    const careless2 = eventPlayer({ answer: false });
    offer(w, 'bumper');
    careless2.onMonth(w, []);
    expect(careless2.rec.drawn[0].result).toBe(null);                                    // it only writes it down
    expect(w.cityEvents.waiting.kind).toBe('bumper');
    expect(EVENT_DEFS.find((d) => d.id === 'bumper').default).toBe('store');
  });
});

// Keep at least in the great-work run: the city the day the great temple was founded (greatWorkRun().foundedSave), the caravan of the next arrival day with beer and grain on sale
// to Memphis, once with no floors and once with the floors keepOfferings sets. The stocks are put where the caravan counts them: beer under its floor, grain 50 over its floor.
function caravanAtFounding(withFloors) {
  const r = greatWorkRun();
  const w = deserialize(r.foundedSave);
  const gw = w.buildings[w.reign.greatWork];
  for (const good of ['beer', 'grain']) setTradeOrder(w, good, 'sell', 0);
  const want = keepOfferings(w, gw);                                                     // the habit's floors (the run sets them each month once the temple stands)
  if (!withFloors) { w.trade.floors = {}; for (const good of ['beer', 'grain']) w.trade.orders[good].keep = 0; }
  const post = tradePost(w);
  const setStock = (good, n) => {                                                        // all of it in one store the post reaches
    const stores = buildingsInReach(w, post, TRADE_REACH, (o) => (BUILDINGS[o.type].stores || []).includes(good)).map((x) => x.b);
    for (const b of stores) delete b.store[good];
    stores[0].store[good] = n;
  };
  setStock('beer', want.beer - 20);
  setStock('grain', want.grain + 50);
  w.trade.used = {};
  w.day = nextCaravanDay(w);
  const events = [];
  tradeMonth(w, events);
  const caravan = events.find((e) => e.type === 'caravan' && e.partner === 'memphis');
  return { w, want, caravan, left: { beer: tradeStock(w, 'beer', post), grain: tradeStock(w, 'grain', post) } };
}

describe('v70 balance events: Keep at least keeps the great temple\'s offerings in the great-work run', () => {
  it('sets a floor for every good the offerings still ask for, the most any stage to come needs, from the founding', () => {
    const w = deserialize(greatWorkRun().foundedSave);
    const want = keepOfferings(w, w.buildings[w.reign.greatWork]);
    const most = {};
    GREAT_WORK.offerings.forEach((o, stage) => { const n = offeringOf(w, stage); most[n.good] = Math.max(most[n.good] || 0, n.n); });
    expect(want).toEqual(most);
    for (const [good, n] of Object.entries(most)) expect([good, keepAtLeast(w, good), w.trade.floors[good]]).toEqual([good, n, n]);
  });

  it('with the floors the caravan sells the grain above its floor and none of the beer under it; without them it sells both', () => {
    const on = caravanAtFounding(true), off = caravanAtFounding(false);
    expect(on.caravan !== undefined && off.caravan !== undefined).toBe(true);
    expect(on.caravan.sold.beer).toBe(undefined);                                        // beer is under its floor: not a unit leaves
    expect(on.left.beer).toBe(on.want.beer - 20);
    expect(on.caravan.sold.grain).toBe(50);                                              // grain is 50 over its floor: the 50 go
    expect(on.left.grain).toBe(on.want.grain);                                           // and the stores keep exactly the floor
    expect(off.caravan.sold.beer).toBeGreaterThan(0);                                    // the same city with no floor sells below what the temple is owed
    expect(off.caravan.sold.grain).toBeGreaterThan(50);
    expect(off.left.beer).toBeLessThan(off.want.beer);
    expect(off.left.grain).toBeLessThan(off.want.grain);
  });
});
