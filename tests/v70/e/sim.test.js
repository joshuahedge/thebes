// Version 7.0, Track E (rulings 900-929): the city events' sim. When one may come (the rank, the first year, the gaps, one at a time, the dangers and the
// court's deadlines, the cooldowns, the turns), what each kind offers and each choice does (from the same list the card words), that a choice costing gold
// is off with its reason while the treasury cannot pay it, that a default is taken when the time is up and never costs gold, the festival with and
// without incense, a version 9 city's quiet year, and the record in a save. Each set up both ways.
import { describe, it, expect } from '../../harness.js';
import { eventWorld, offer, days, storehouseOf, idsOf, withoutIncense, MONTH, YEAR } from './helpers.js';
import { drawEvent, eventChoices, applyChoice, eventDay, eventAlerts, eventItems, waitingEvent, firstEventDay, dangerStriking, courtSoon, unrestMood } from '../../../src/sim/cityEvents.js';
import { EVENT_DEFS, EVENT_KINDS, EVENT_NUMBERS, CITY_EVENTS, EVENT_V9_WAIT, newEventState, isEventState } from '../../../src/data/cityEvents.js';
import { stockOf } from '../../../src/sim/court.js';
import { allBuildings, createWorld } from '../../../src/sim/world.js';
import { updateMood } from '../../../src/sim/mood.js';
import { advanceDays } from '../../../src/sim/clock.js';
import { courtDay } from '../../../src/sim/court.js';
import { cityAdvice } from '../../../src/sim/advice.js';
import { alertsFor } from '../../../src/sim/alerts.js';
import { serialize, deserialize, validateWorld } from '../../../src/save/serialize.js';
import { GOODS } from '../../../src/data/goods.js';
import { BUILDINGS } from '../../../src/data/buildings.js';
import { INCENSE_GOOD } from '../../../src/data/trade.js';
import { FESTIVAL } from '../../../src/data/raids.js';
import { CRIME_MOOD } from '../../../src/data/crime.js';
import { buildSampleCity } from '../../../src/dev/sampleCity.js';
import { addRaw } from '../../helpers/testWorld.js';
import { fallIll } from '../../../src/sim/health.js';
import { setPaused } from '../../../src/sim/commands.js';

const choice = (w, kind, id) => eventChoices(w, w.cityEvents.waiting).find((c) => c.id === id);

describe('v70 e sim: the kinds', () => {
  it('has sixteen kinds, half welcome and half troublesome, each with at most three choices and one default that never costs gold', () => {
    expect([EVENT_KINDS.length, EVENT_DEFS.filter((d) => d.welcome).length, EVENT_DEFS.filter((d) => !d.welcome).length]).toEqual([16, 8, 8]);
    expect(new Set(EVENT_KINDS).size).toBe(16);
    const w = eventWorld({ gold: 100000, ill: 3 });
    for (const def of EVENT_DEFS) {
      expect([def.id, def.choices.length <= 3, def.choices.includes(def.default)]).toEqual([def.id, true, true]);
      const ev = offer(w, def.id);
      expect([def.id, ev !== null]).toEqual([def.id, true]);
      const list = eventChoices(w, ev);
      expect([def.id, list.length >= 2 && list.length <= 3]).toEqual([def.id, true]);
      expect([def.id, list.filter((c) => c.default).length]).toEqual([def.id, 1]);
      expect([def.id, list.find((c) => c.default).gold, list.find((c) => c.default).ok]).toEqual([def.id, 0, true]);
      for (const c of list) for (const e of c.effects) expect([def.id, c.id, e.kind === 'gold' && c.default && e.n < 0]).toEqual([def.id, c.id, false]);
      w.cityEvents.waiting = null;
    }
  });

  it('gates each kind by rank: none before Town, the Market town and City kinds not before theirs', () => {
    const w = eventWorld({ milestone: 'village', ill: 3 });
    expect(drawEvent(w)).toBe(null);
    for (const [milestone, kinds] of [['town', ['opet', 'bumper', 'hoard', 'healer', 'sandstorm', 'fever', 'workshop_quarrel']], ['market_town', []], ['city', []]]) {
      w.milestone = milestone;
      for (const k of kinds) expect([milestone, k, offer(w, k) !== null]).toEqual([milestone, k, true]);
      w.cityEvents.waiting = null;
    }
    w.milestone = 'town';
    for (const k of ['envoy', 'scribes', 'craftsman', 'pilgrims', 'rumour', 'thief', 'feud', 'lost_caravan', 'quarry_strike']) expect([k, offer(w, k)]).toEqual([k, null]);
    w.milestone = 'market_town';
    expect([offer(w, 'envoy') !== null, offer(w, 'quarry_strike')]).toEqual([true, null]);
    w.cityEvents.waiting = null;
    w.milestone = 'city';
    expect(offer(w, 'quarry_strike') !== null).toBe(true);
  });

  it('keeps a kind out until the city has what it needs: the court, disease and crime (not Peaceful), a temple, beer, ill homes, a quarry', () => {
    const w = eventWorld({ open: false });
    for (const k of ['envoy', 'scribes', 'rumour']) expect([k, offer(w, k)]).toEqual([k, null]);
    const p = eventWorld({ difficulty: 'peaceful' });
    for (const k of ['healer', 'fever', 'thief', 'feud']) expect([k, offer(p, k)]).toEqual([k, null]);
    const n = eventWorld();
    expect(offer(n, 'opet') !== null).toBe(true);
    n.cityEvents.waiting = null;
    delete storehouseOf(n).store.beer;
    expect(offer(n, 'opet')).toBe(null);                                        // no beer
    Object.assign(storehouseOf(n).store, { beer: 100 });
    for (const t of idsOf(n, 'temple')) n.buildings[t].paused = true;
    expect(offer(n, 'opet')).toBe(null);                                        // no working temple
    expect(offer(n, 'healer')).toBe(null);                                      // nobody ill
    const homes = allBuildings(n).filter((b) => b.type === 'house');
    for (const h of homes.slice(0, 2)) fallIll(n, h.id);
    expect(offer(n, 'healer') !== null).toBe(true);
    n.cityEvents.waiting = null;
    for (const q of idsOf(n, 'quarry')) n.buildings[q].paused = true;
    expect(offer(n, 'quarry_strike')).toBe(null);
  });
});

describe('v70 e sim: when an event may come', () => {
  it('comes the first time between 6 and 10 months after the city first became a Town, never in the guided first city', () => {
    const w = eventWorld();
    w.splits.town = 100;
    const first = firstEventDay(w);
    expect(first >= 100 + CITY_EVENTS.firstMonths * MONTH && first <= 100 + (CITY_EVENTS.firstMonths + CITY_EVENTS.firstJitter) * MONTH).toBe(true);
    w.day = first - 1;
    expect(drawEvent(w)).toBe(null);
    w.day = first;
    expect(drawEvent(w) !== null).toBe(true);
    w.lesson = true;
    expect(drawEvent(w)).toBe(null);
    w.lesson = null;
    expect(drawEvent(w) !== null).toBe(true);
    delete w.splits.town;                                                       // a city whose Town day is not on record, nextDay 0: none
    expect([firstEventDay(w), drawEvent(w)]).toEqual([null, null]);
    w.cityEvents.nextDay = w.day;                                               // a migrated city's own day lets one come
    expect(drawEvent(w) !== null).toBe(true);
  });

  it('is the same draw for the same world and a different one for another seed', () => {
    const a = eventWorld(), b = eventWorld(), c = eventWorld({ seed: 7 });
    a.day = b.day = c.day = 3 * YEAR;
    expect(JSON.stringify(drawEvent(a))).toBe(JSON.stringify(drawEvent(b)));
    const kinds = new Set();
    for (let d = 0; d < 40; d++) { const x = eventWorld({ seed: 1 + d }); x.day = 3 * YEAR; kinds.add(drawEvent(x).kind); }
    expect(kinds.size).toBeGreaterThan(1);
    void c;
  });

  it('offers one at a time, notes its cooldown and the next gap (5 to 9 months), takes turns between welcome and troublesome', () => {
    const w = eventWorld();
    w.day = 3 * YEAR;
    const events = [];
    eventDay(w, events);
    const s = w.cityEvents, first = s.waiting;
    expect(first !== null && EVENT_DEFS.find((d) => d.id === first.kind).welcome).toBe(true);   // the first is a welcome one
    expect(events.map((e) => e.type)).toEqual(['city_event_offered']);
    expect([w.tally.eventsOffered, first.day, first.due]).toEqual([1, w.day, w.day + EVENT_DEFS.find((d) => d.id === first.kind).months * MONTH]);
    const gap = (s.nextDay - w.day) / MONTH;
    expect(gap >= CITY_EVENTS.gapMonths[0] && gap <= CITY_EVENTS.gapMonths[1]).toBe(true);
    expect(s.cooldowns[first.kind]).toBe(w.day + EVENT_DEFS.find((d) => d.id === first.kind).cooldown * MONTH);
    expect(drawEvent(w)).toBe(null);                                           // one waiting: no second
    const welcome = [], trouble = [];
    for (let i = 0; i < 12; i++) {
      // answer it by letting it lapse, then wait out the gap
      w.day = s.waiting.due;
      eventDay(w);
      expect(s.waiting).toBe(null);
      w.day = s.nextDay;
      w.court.request = null;
      eventDay(w);
      if (s.waiting) (EVENT_DEFS.find((d) => d.id === s.waiting.kind).welcome ? welcome : trouble).push(s.waiting.kind);
    }
    expect(welcome.length + trouble.length).toBeGreaterThan(8);
    expect(Math.abs(welcome.length - trouble.length)).toBeLessThanOrEqual(1);   // they take turns
  });

  it('never offers the same kind again inside its cooldown', () => {
    const w = eventWorld();
    w.day = 3 * YEAR;
    const ev = offer(w, 'envoy');
    w.cityEvents.cooldowns.envoy = w.day + 18 * MONTH;
    w.cityEvents.waiting = null;
    w.tally.eventsOffered = 0;
    const seen = new Set();
    for (let i = 0; i < 30; i++) { w.tally.eventsOffered = i; const d = drawEvent(w); if (d) seen.add(d.kind); }
    expect(seen.has('envoy')).toBe(false);
    w.day += 18 * MONTH;
    w.court.request = null;
    expect(ev.kind).toBe('envoy');
  });

  it('is held off while a danger strikes and while a court deadline is under a month away, and comes when it passes', () => {
    const w = eventWorld();
    w.day = 3 * YEAR;
    expect([dangerStriking(w), courtSoon(w), drawEvent(w) !== null]).toEqual([false, false, true]);
    w.raid.active = { index: 0 };
    expect([dangerStriking(w), drawEvent(w)]).toEqual([true, null]);
    w.raid.active = null;
    w.raid.warning = { arrives: w.day + 20 };
    expect([dangerStriking(w), drawEvent(w)]).toEqual([true, null]);
    w.raid.warning = { arrives: w.day + 40 };
    expect([dangerStriking(w), drawEvent(w) !== null]).toEqual([false, true]);
    w.raid.warning = null;
    w.hazards.plague.active = { until: w.day + 50 };
    expect(drawEvent(w)).toBe(null);
    w.hazards.plague.active = null;
    w.hazards.locusts.active = { until: w.day + 50 };
    expect(drawEvent(w)).toBe(null);
    w.hazards.locusts.active = null;
    const f = allBuildings(w).find((b) => b.type === 'potter');
    f.fire = { stage: 'blaze', left: 5 };
    expect(drawEvent(w)).toBe(null);
    delete f.fire;
    w.court.request = { id: 1, kind: 'gold', amount: 100, day: w.day, due: w.day + 20 };
    expect([courtSoon(w), drawEvent(w)]).toEqual([true, null]);
    w.court.request.due = w.day + 31;
    expect([courtSoon(w), drawEvent(w) !== null]).toEqual([false, true]);
    w.court.request = null;
    w.demands.open.push({ id: 1, kind: 'gold', amount: 100, accepted: true, due: w.day + 29, months: 6, day: w.day });
    expect([courtSoon(w), drawEvent(w)]).toEqual([true, null]);
    w.demands.open = [];
    expect(drawEvent(w) !== null).toBe(true);
  });
});

describe('v70 e sim: a version 9 city sees no event for 360 days after it is loaded', () => {
  it('draws none, day after day, from the load to nextDay, though the same city saved as a new one is offered one at once', () => {
    const w = eventWorld();
    w.day = 3 * YEAR;
    expect(drawEvent(w) !== null).toBe(true);                                  // the city as it plays: an event is due now
    const v9 = JSON.parse(serialize(w));
    delete v9.cityEvents;
    delete v9.trade.switches;
    delete v9.trade.floors;
    for (const k of ['eventsOffered', 'eventsAnswered', 'eventsLapsed', 'caravansBoat']) delete v9.tally[k];
    v9.version = 9;
    const loaded = deserialize(JSON.stringify(v9));
    const day = loaded.day;
    expect([loaded.cityEvents.nextDay, EVENT_V9_WAIT, loaded.cityEvents.waiting]).toEqual([day + 360, 360, null]);
    const asNew = deserialize(JSON.stringify(JSON.parse(serialize(w))));
    expect(drawEvent(asNew) !== null).toBe(true);                              // the control: the same city with the record of a new one
    let seen = 0;
    for (let i = 0; i < 360; i++) {
      if (drawEvent(loaded) !== null) seen++;
      eventDay(loaded);
      loaded.day += 1;                                                         // the sim hooks only: the city is as it was saved, day by day
      expect(loaded.cityEvents.waiting).toBe(null);
    }
    expect([seen, loaded.day, loaded.cityEvents.nextDay]).toEqual([0, day + 360, day + 360]);
    expect(drawEvent(loaded) !== null).toBe(true);                             // the first day it may: nextDay itself
  });
});

describe('v70 e sim: answering', () => {
  const fresh = (kind, o = {}) => { const w = eventWorld(o); w.day = 3 * YEAR; offer(w, kind); return w; };

  it('a choice costing gold is off with its reason when the treasury cannot pay it, nothing changes on a refusal, and it is paid when it can', () => {
    const w = fresh('envoy');
    const fee = choice(w, 'envoy', 'feast').gold;
    expect(fee).toBeGreaterThan(0);
    w.gold = fee - 1;
    const c = choice(w, 'envoy', 'feast');
    expect([c.ok, c.reason, c.bad.kind]).toEqual([false, 'no_gold', 'gold']);
    const before = JSON.stringify([w.gold, w.court.favour, w.cityEvents]);
    expect(applyChoice(w, w.cityEvents.waiting, 'feast')).toEqual({ ok: false, reason: 'no_gold', warnings: [] });
    expect(JSON.stringify([w.gold, w.court.favour, w.cityEvents])).toBe(before);
    expect(choice(w, 'envoy', 'greet').ok).toBe(true);                         // the default is always open
    w.gold = fee;
    expect(choice(w, 'envoy', 'feast').ok).toBe(true);
    const fav = w.court.favour;
    const events = [];
    const r = applyChoice(w, w.cityEvents.waiting, 'feast', events);
    expect([r.ok, w.gold, w.court.favour, w.cityEvents.waiting, w.tally.eventsAnswered]).toEqual([true, 0, fav + EVENT_NUMBERS.envoy.feast, null, 1]);
    expect(events.map((e) => [e.type, e.kind, e.choice, e.result])).toEqual([['city_event', 'envoy', 'feast', 'answered']]);
  });

  it('never pushes a city into debt: with the treasury below 0 a price is refused, and a default that is taken costs no gold', () => {
    for (const def of EVENT_DEFS) {
      const w = eventWorld({ gold: 100000, ill: 3 });
      w.day = 3 * YEAR;
      const ev = offer(w, def.id);
      w.gold = -50;
      const list = eventChoices(w, ev);
      for (const c of list) {
        if (c.gold > 0) expect([def.id, c.id, c.ok, c.reason]).toEqual([def.id, c.id, false, 'no_gold']);
      }
      const before = w.gold;
      w.day = ev.due;
      eventDay(w);
      expect([def.id, w.cityEvents.waiting, w.gold >= before]).toEqual([def.id, null, true]);
    }
  });

  it('fails for an event that is not the waiting one, a choice it does not list, and when the card read different effects than it would do now', () => {
    const w = fresh('envoy');
    const ev = w.cityEvents.waiting;
    expect(applyChoice(w, { ...ev, kind: 'opet' }, 'greet').reason).toBe('no_event');
    expect(applyChoice(w, ev, 'dance').reason).toBe('no_choice');
    const shown = choice(w, 'envoy', 'greet').effects;
    w.court.favour = 99;                                                       // favour is nearly full: what the choice would do changes? (favour effect n stays)
    expect(applyChoice(w, ev, 'greet', null, shown).ok).toBe(true);
    const x = fresh('sandstorm');
    const shownX = choice(x, 'sandstorm', 'weather').effects;
    takeAll(x, shownX[0].good);
    const r = applyChoice(x, x.cityEvents.waiting, 'weather', null, shownX);
    expect([r.ok, r.reason]).toEqual([false, 'changed']);
    expect(x.cityEvents.waiting !== null).toBe(true);
    expect(applyChoice(x, null, 'weather').reason).toBe('no_event');
  });

  it('takes its default on the day it falls due, counts it as lapsed, and the answer after that finds none', () => {
    const w = fresh('envoy');
    const ev = w.cityEvents.waiting, fav = w.court.favour;
    w.day = ev.due - 1;
    eventDay(w);
    expect(w.cityEvents.waiting !== null).toBe(true);
    w.day = ev.due;
    const events = [];
    eventDay(w, events);
    expect([w.cityEvents.waiting, w.court.favour, w.tally.eventsLapsed, w.tally.eventsAnswered]).toEqual([null, fav + EVENT_NUMBERS.envoy.greet, 1, 0]);
    expect(events.map((e) => [e.type, e.choice, e.result])).toEqual([['city_event', 'greet', 'default']]);
    expect(applyChoice(w, ev, 'greet').reason).toBe('no_event');
  });

  it('drops a waiting event of a kind this build does not know', () => {
    const w = eventWorld();
    w.cityEvents.waiting = { kind: 'locust_god', day: w.day, due: w.day + 90 };
    eventDay(w);
    expect(w.cityEvents.waiting).toBe(null);
  });
});

function takeAll(w, good) { for (const b of allBuildings(w)) if (b.store && b.store[good]) delete b.store[good]; }

describe('v70 e sim: what each kind does', () => {
  const fresh = (kind, o = {}) => { const w = eventWorld({ gold: 5000, ...o }); w.day = 3 * YEAR; offer(w, kind); return w; };
  const answer = (w, id, events = null) => applyChoice(w, w.cityEvents.waiting, id, events);

  it('the festival of Opet: beer alone without incense (a festival without favour), beer and incense with it, off with why when either is short', () => {
    // Track T's incense is in the game, a raw good the storehouse keeps: the full festival is offered beside the smaller one.
    expect([Boolean(GOODS[INCENSE_GOOD]), BUILDINGS.storehouse.stores.includes(INCENSE_GOOD)]).toEqual([true, true]);
    // (Wave 3, ruling 988: the full festival is offered only when incense can reach the city: Punt's route is open or a store holds some.)
    const t = fresh('opet');
    expect(eventChoices(t, t.cityEvents.waiting).map((c) => c.id)).toEqual(['small', 'decline']);
    t.trade.routes.punt = { since: 0, gifted: true };
    expect(eventChoices(t, t.cityEvents.waiting).map((c) => c.id)).toEqual(['full', 'small', 'decline']);
    // A game without incense: the beer-only festival, without favour.
    withoutIncense(() => {
      const w = fresh('opet');
      expect(eventChoices(w, w.cityEvents.waiting).map((c) => c.id)).toEqual(['small', 'decline']);
      const small = choice(w, 'opet', 'small');
      expect(small.effects.map((e) => e.kind)).toEqual(['goods', 'festival']);
      const beer = stockOf(w, 'beer');
      expect(answer(w, 'small').ok).toBe(true);
      expect([stockOf(w, 'beer'), w.danger.festivalDay, w.tally.festivals]).toEqual([beer + small.effects[0].n, w.day, 1]);
      // the mood bonus is the temple festival's own: festival.js festivalMood, FESTIVAL.days long
      updateMood(w);
      expect(w.moodBreakdown.festival).toBe(FESTIVAL.mood);
      // a festival within a year: Opet is not offered
      expect(offer(w, 'opet')).toBe(null);
      w.day += FESTIVAL.every;
      expect(offer(w, 'opet') !== null).toBe(true);
    });
    expect([Boolean(GOODS[INCENSE_GOOD]), BUILDINGS.storehouse.stores.includes(INCENSE_GOOD)]).toEqual([true, true]);   // and back
  });

  it('with incense in the game: the full festival takes beer and incense and adds favour; off with its reason while the stores hold too little incense', () => {
    const w = fresh('opet');
    w.trade.routes.punt = { since: 0, gifted: true };                           // incense reaches the city (ruling 988)
    expect(eventChoices(w, w.cityEvents.waiting).map((c) => c.id)).toEqual(['full', 'small', 'decline']);
    const full = choice(w, 'opet', 'full');
    expect([full.ok, full.reason, full.bad.good]).toEqual([false, 'short', INCENSE_GOOD]);
    storehouseOf(w).store[INCENSE_GOOD] = 12;
    const ok = choice(w, 'opet', 'full');
    expect([ok.ok, ok.effects.map((e) => e.kind)]).toEqual([true, ['goods', 'goods', 'festival', 'favour']]);
    const fav = w.court.favour, beer = stockOf(w, 'beer');
    expect(answer(w, 'full').ok).toBe(true);
    expect([stockOf(w, INCENSE_GOOD), stockOf(w, 'beer'), w.court.favour]).toEqual([2, beer + ok.effects[0].n, fav + EVENT_NUMBERS.opet.favour]);
    expect(w.danger.festivalDay).toBe(w.day);
  });

  it('the envoy, the hoard, the scribes and the harvest move the treasury, favour, the festival and the stores as their cards say', () => {
    let w = fresh('hoard');
    const g = choice(w, 'hoard', 'keep');
    expect([g.effects.map((e) => e.kind), g.effects[0].n > 0, g.gold]).toEqual([['gold'], true, 0]);
    const gold = w.gold;
    answer(w, 'keep');
    expect(w.gold).toBe(gold + g.effects[0].n);
    w = fresh('hoard');
    w.danger.festivalDay = w.day - 100;
    expect([choice(w, 'hoard', 'bless').ok, choice(w, 'hoard', 'bless').reason]).toEqual([false, 'too_soon']);
    w.danger.festivalDay = null;
    expect(answer(w, 'bless').ok).toBe(true);
    expect(w.danger.festivalDay).toBe(w.day);
    w = fresh('scribes');
    const fav = w.court.favour;
    answer(w, 'forgive');
    expect(w.court.favour).toBe(fav + EVENT_NUMBERS.scribes.favour);
    w = fresh('bumper');
    const grain = stockOf(w, 'grain'), n = choice(w, 'bumper', 'store').effects[0].n;
    expect(n).toBeGreaterThan(0);
    answer(w, 'store');
    expect(stockOf(w, 'grain')).toBe(grain + n);
    w = fresh('bumper');
    const g0 = w.gold;
    answer(w, 'sell');
    expect(w.gold).toBe(g0 + n * EVENT_NUMBERS.bumper.price);
  });

  it('the craftsman and the pilgrims settle people into homes with room, and are off with why when there is none', () => {
    let w = fresh('craftsman');
    const settle = choice(w, 'craftsman', 'settle');
    expect(settle.effects.map((e) => e.kind)).toEqual(['gold', 'people']);
    const people = (x) => allBuildings(x).reduce((s, b) => s + (b.type === 'house' ? b.residents : 0), 0);
    const p = people(w), g = w.gold;
    answer(w, 'settle');
    expect([people(w), w.gold]).toEqual([p + settle.effects[1].n, g - settle.gold]);
    w = fresh('pilgrims');
    expect(choice(w, 'pilgrims', 'camp').effects[0].n > 0).toBe(true);
    for (const h of allBuildings(w)) if (h.type === 'house') h.residents = 40;      // full
    const lodge = choice(w, 'pilgrims', 'lodge');
    expect([lodge.ok, lodge.reason]).toEqual([false, 'no_room']);
  });

  it('the healer cures the ill homes for his fee, and is off when none is ill any more', () => {
    const w = fresh('craftsman');
    for (const h of allBuildings(w).filter((b) => b.type === 'house').slice(0, 3)) fallIll(w, h.id);
    w.cityEvents.waiting = null;
    offer(w, 'healer');
    const cure = choice(w, 'healer', 'cure');
    expect(cure.effects[1].ids.length).toBe(3);
    const g = w.gold;
    expect(answer(w, 'cure').ok).toBe(true);
    expect([w.gold, allBuildings(w).filter((b) => b.illness).length, w.tally.illnessesCured]).toEqual([g - cure.gold, 0, 3]);
    offer(w, 'healer');
    expect(w.cityEvents.waiting).toBe(null);                                   // nobody is ill: not offered again
    const x = fresh('craftsman');
    for (const h of allBuildings(x).filter((b) => b.type === 'house').slice(0, 2)) fallIll(x, h.id);
    x.cityEvents.waiting = null;
    offer(x, 'healer');
    for (const b of allBuildings(x)) b.illness = null;
    const gone = choice(x, 'healer', 'cure');
    expect([gone.ok, gone.reason]).toEqual([false, 'none']);
  });

  it('the strike and the quarrel stop the workshops for their days, paid off with gold; the player\'s own resume is refused until they end', () => {
    const w = fresh('quarry_strike', { milestone: 'city' });
    const strike = choice(w, 'quarry_strike', 'strike'), quarries = idsOf(w, 'quarry');
    expect([strike.default, strike.effects[0].kind, strike.effects[0].ids, strike.effects[0].days]).toEqual([true, 'pause', quarries, 60]);
    const raise = choice(w, 'quarry_strike', 'raise_wages');
    expect([raise.gold > 0, raise.effects.map((e) => e.kind)]).toEqual([true, ['gold']]);
    const day = w.day;
    w.day = w.cityEvents.waiting.due;
    eventDay(w);                                                               // unanswered: the default, the strike
    expect(quarries.every((id) => w.buildings[id].paused)).toBe(true);
    const until = w.court.effects.find((e) => e.event === true).until;
    expect(until).toBe(w.day + 60);
    expect(day < w.day).toBe(true);
    w.day = until - 1;
    eventDay(w);
    expect(quarries.every((id) => w.buildings[id].paused)).toBe(true);
    w.day = until;
    eventDay(w);                                                               // days up, the court asleep (open: false would not end it): our own end
    expect(quarries.every((id) => !w.buildings[id].paused)).toBe(true);
    expect(w.court.effects.length).toBe(0);
    // paid off: nothing stops
    const p = fresh('quarry_strike', { milestone: 'city' });
    answer(p, 'raise_wages');
    expect(idsOf(p, 'quarry').every((id) => !p.buildings[id].paused)).toBe(true);
    // the player's Resume is refused while the hold lasts (ruling 987, wave 3: the card said the works stop for their days); a pause the player added stays theirs
    const q = fresh('workshop_quarrel');
    const ids = q.cityEvents.waiting.figs.ids;
    q.day = q.cityEvents.waiting.due;
    eventDay(q);
    expect(ids.every((id) => q.buildings[id].paused)).toBe(true);
    expect(setPaused(q, ids[0], false)).toEqual({ ok: false, reason: 'event_hold', until: q.court.effects[0].until, warnings: [] });
    expect(ids.every((id) => q.buildings[id].paused)).toBe(true);
    q.day += 60;
    eventDay(q);
    expect(ids.every((id) => !q.buildings[id].paused)).toBe(true);
  });

  it('the sandstorm and the lost caravan take goods only up to what the stores hold; sweeping and searching cost gold and save them', () => {
    const w = fresh('sandstorm');
    const weather = choice(w, 'sandstorm', 'weather'), sweep = choice(w, 'sandstorm', 'sweep');
    const good = weather.effects[0].good, had = stockOf(w, good);
    expect([weather.effects[0].kind, sweep.effects[0].kind, sweep.gold > 0, sweep.effects[1].n < weather.effects[0].n]).toEqual(['lose', 'gold', true, true]);
    const x = fresh('sandstorm');
    answer(x, 'sweep');
    expect(stockOf(x, good)).toBe(had - sweep.effects[1].n);
    w.day = w.cityEvents.waiting.due;
    eventDay(w);
    expect([stockOf(w, good), w.gold]).toEqual([had - weather.effects[0].n, 5000]);
    const c = fresh('lost_caravan');
    const lost = choice(c, 'lost_caravan', 'write_off').effects[0];
    const gs = stockOf(c, lost.good);
    c.day = c.cityEvents.waiting.due;
    eventDay(c);
    expect(stockOf(c, lost.good)).toBe(gs - lost.n);
    const s = fresh('lost_caravan');
    takeAll(s, lost.good);                                                     // nothing left to lose: the loss is clamped, never refused
    expect(choice(s, 'lost_caravan', 'write_off').effects).toEqual([]);
    expect(answer(s, 'write_off').ok).toBe(true);
  });

  it('the fever makes the homes ill unless kept out for a fee; the thief takes less where a police post reaches; the feud costs mood', () => {
    let w = fresh('fever');
    const ill = choice(w, 'fever', 'let_in').effects[0];
    expect([ill.kind, ill.ids.length >= 2]).toEqual(['ill', true]);
    w.day = w.cityEvents.waiting.due;
    eventDay(w);
    expect(ill.ids.every((id) => w.buildings[id].illness)).toBe(true);
    w = fresh('fever');
    answer(w, 'gate');
    expect(allBuildings(w).some((b) => b.illness)).toBe(false);
    // the thief
    w = fresh('thief');
    const f = w.cityEvents.waiting.figs, store = w.buildings[f.store];
    const covered = choice(w, 'thief', 'let_run').effects[0].n;
    const police = allBuildings(w).find((b) => b.type === 'police_post');
    police.paused = true;                                                      // no staffed police post: nothing reaches the store
    const open = choice(w, 'thief', 'let_run').effects[0].n;
    expect(open).toBeGreaterThanOrEqual(covered);
    expect([open, covered].every((n) => n > 0)).toBe(true);
    const had = store.store[f.good];
    answer(w, 'let_run');
    expect(store.store[f.good]).toBe(had - open);
    // the feud: bad feeling is a mood row, as thefts are (crime.js crimeMood)
    w = fresh('feud');
    const mood0 = unrestMood(w, 2);
    expect(mood0).toBe(Math.max(CRIME_MOOD.max, 2 * CRIME_MOOD.each));
    w.day = w.cityEvents.waiting.due;
    eventDay(w);
    updateMood(w);
    expect(w.moodBreakdown.thefts).toBe(Math.max(CRIME_MOOD.max, 2 * CRIME_MOOD.each));
    expect(unrestMood(w, 2)).toBe(Math.max(CRIME_MOOD.max, 4 * CRIME_MOOD.each) - Math.max(CRIME_MOOD.max, 2 * CRIME_MOOD.each));
  });

  it('the rumour costs favour unless a gift is sent, and favour stays inside its range', () => {
    let w = fresh('rumour');
    const fav = w.court.favour;
    w.day = w.cityEvents.waiting.due;
    eventDay(w);
    expect(w.court.favour).toBe(fav - EVENT_NUMBERS.rumour.favour);
    w = fresh('rumour');
    w.court.favour = 2;
    w.day = w.cityEvents.waiting.due;
    eventDay(w);
    expect(w.court.favour).toBe(0);
    w = fresh('rumour');
    answer(w, 'gift');
    expect(w.court.favour).toBe(fav);
  });
});

describe('v70 e sim: the alert, the advice and the save', () => {
  it('raises one alert and one Advice item while an event waits, none otherwise, the item heavier when it is troublesome or in its last month', () => {
    const w = eventWorld();
    w.day = 3 * YEAR;
    expect([eventAlerts(w), alertsFor(w).some((a) => a.code === 'city_event')]).toEqual([[], false]);
    const out0 = []; eventItems(w, [], out0);
    expect(out0).toEqual([]);
    offer(w, 'opet');
    expect(eventAlerts(w)).toEqual([{ code: 'city_event', kind: 'opet', months: 3 }]);
    expect(alertsFor(w).filter((a) => a.code === 'city_event').length).toBe(1);
    const item = cityAdvice(w).find((a) => a.kind === 'event');
    expect([item.key, item.weight, item.count, item.data.monthsLeft, item.fix.view]).toEqual([`event:opet:${w.cityEvents.waiting.id}`, CITY_EVENTS.advice.welcome, 1, 3, 'summary']);
    w.day = w.cityEvents.waiting.due - 20;
    expect(cityAdvice(w).find((a) => a.kind === 'event').weight).toBe(CITY_EVENTS.advice.welcome + CITY_EVENTS.advice.soon);
    w.cityEvents.waiting = null;
    offer(w, 'sandstorm');
    expect(cityAdvice(w).find((a) => a.kind === 'event').weight).toBe(CITY_EVENTS.advice.trouble);
    expect(waitingEvent(w).monthsLeft).toBe(2);
    w.cityEvents.waiting = null;
    expect([waitingEvent(w), eventAlerts(w)]).toEqual([null, []]);
  });

  it('saves and loads the record with an event waiting, valid, and plays on from it', () => {
    const w = eventWorld();
    w.day = 3 * YEAR;
    eventDay(w);
    expect(w.cityEvents.waiting !== null).toBe(true);
    const o = JSON.parse(serialize(w));
    expect(validateWorld(o)).toBe(true);
    const loaded = deserialize(JSON.stringify(o));
    expect(loaded.cityEvents).toEqual(w.cityEvents);
    expect(isEventState(loaded.cityEvents)).toBe(true);
    expect(isEventState({ nextDay: 1, cooldowns: {}, waiting: { kind: 'x', day: 1, due: 2, id: 'a' } })).toBe(false);
    expect(isEventState({ nextDay: 1, cooldowns: {}, waiting: { kind: 'x', day: 1, due: 2, figs: [] } })).toBe(false);
    expect(isEventState({ ...newEventState(5), waiting: { kind: 'x', day: 1, due: 2, id: 3, figs: { fee: 4 } } })).toBe(true);
    const a = JSON.stringify(eventChoices(w, w.cityEvents.waiting));
    expect(JSON.stringify(eventChoices(loaded, loaded.cityEvents.waiting))).toBe(a);
  });

  it('plays a sample Capital for six game years with its events: they come about twice a year, are answered by default, and the city stays solvent', () => {
    const w = createWorld({ seed: 11 });
    buildSampleCity(w);                                                        // (building it plays days: the record starts afresh from here)
    w.splits.town = w.day;
    w.cityEvents = newEventState(0);
    w.tally.eventsOffered = w.tally.eventsAnswered = w.tally.eventsLapsed = 0;
    const offered = [];
    const events = [];
    const start = w.day;
    for (let i = 0; i < 6 * YEAR; i++) {
      advanceDays(w, 1, events);
      for (const e of events.splice(0)) if (e.type === 'city_event_offered') offered.push([w.day - start, e.kind]);
    }
    expect(offered.length).toBeGreaterThan(5);
    expect(offered.length).toBeLessThan(16);
    for (let i = 1; i < offered.length; i++) expect(offered[i][0] - offered[i - 1][0] >= CITY_EVENTS.gapMonths[0] * MONTH).toBe(true);
    expect(w.tally.eventsOffered).toBe(offered.length);
    expect(w.tally.eventsAnswered + w.tally.eventsLapsed + (w.cityEvents.waiting ? 1 : 0)).toBe(offered.length);
    expect(validateWorld(JSON.parse(serialize(w)))).toBe(true);
    void courtDay;
  });
});
