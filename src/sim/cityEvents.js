// Version 7.0, Track E (rulings 900-929): city events. Track 0 (contract, docs/superpowers/notes/2026-10-23-version-7-0-contract.md) left
// stubs that drew nothing; Track E owns this file. The record is world.cityEvents (src/data/cityEvents.js newEventState; not world.events: `events` is
// every sim function's per-tick list). Deterministic: draws come from the world's seed through EVENT_SALT (src/data/cityEvents.js), never Math.random or
// the clock; nothing here is memoised (the card calls these too, and what it shows must be what the next tick does).
//
// The rules (ruling 900): from Town (CITY_EVENTS.from), never in the guided first city, one or two a year. The first comes CITY_EVENTS.firstMonths (and a
// seeded few more) months after the city first became a Town; after an offer the next may come CITY_EVENTS.gapMonths later. Never while a danger is
// striking (a raid under way or due within a month, a plague, a low Nile, locusts or blight under way, a fire), never while a court deadline is under a
// month away, never two at once, and each kind has its own cooldown. Welcome and troublesome kinds take turns. A v9 city's nextDay is its load day + 360
// (src/save/migrate.js), so it sees none for a game year.
//
// An event is offered ({ kind, day, due, id, figs }: figs the figures it was offered with) and waits in world.cityEvents.waiting for EVENT_DEFS' months;
// the player's choice is carried out by applyChoice, and one left unanswered takes its stated default on the day it falls due (eventDay). The default
// never costs gold; a choice that costs gold is off, with its reason, while the treasury cannot pay it, and no effect ever pushes a city into debt.
//
// Every effect goes through the sim's own functions (ruling 903): gold and favour (src/sim/court.js addFavour), goods (court.js takeGoods, putGoods), the
// festival's mood (court.js applyEffects: the temple festival's own record), people (court.js settle), illness (health.js fallIll, and the court's cure),
// the mood row of thefts (crime.js's danger.theftDays) and a stopped workshop (the court's pause, so the player's own resume takes it back, commands.js).
//
//   drawEvent(world)                   -> null, or the event to offer today (pure: eventDay stores it)
//   eventChoices(world, event)         -> at most three choices { id, gold (its cost, 0 for none), ok, reason (why not, or null), default (on exactly one,
//                                         which never costs gold), effects (what it would do now), cost: the gold it asks }
//   applyChoice(world, event, choiceId, events, shown) -> { ok, reason, warnings, effects }: shown (the effects the card showed) makes it fail with
//                                         'changed' when the city has moved on since, doing nothing, so what is carried out is what was read
// Events pushed (never saved): { type: 'city_event_offered', kind, id, welcome, months }, { type: 'city_event', kind, choice, result: 'answered' |
// 'default', effects }.
import { hash2 } from './rng.js';
import { DAYS_PER_MONTH } from './time.js';
import { CITY_EVENTS, EVENT_DEFS, EVENT_NUMBERS, EVENT_SALT } from '../data/cityEvents.js';
import { INCENSE_GOOD } from '../data/trade.js';
import { FOOD_GOODS, HOUSEHOLD_GOODS } from '../data/goods.js';
import { GOOD_VALUE } from '../data/court.js';
import { FESTIVAL } from '../data/raids.js';
import { CRIME, CRIME_MOOD } from '../data/crime.js';
import { HEALTH_MOOD } from '../data/health.js';
import { DIFFICULTIES } from '../data/difficulty.js';
import { allBuildings, housesOf, population } from './world.js';
import { atLeast } from './progression.js';
import { isWorking } from './labour.js';
import { threatsOn } from './costs.js';
import { monthFigures } from './economy.js';
import { stockOf, roomFor, takeGoods, putGoods, addFavour, favourChange, courtOpen, applyEffects, outputPerMonth } from './court.js';
import { vacancies } from './immigration.js';
import { canFallIll, fallIll } from './health.js';
import { crimeCoverage } from './crime.js';
import { burning } from './fire.js';
import { courtDemands } from './demands.js';
import { quotaOf, dueComing, nextDueDay } from './pressure.js';

const draw = (world, a, b, salt) => hash2(a, b, (world.seed + EVENT_SALT[salt]) | 0);
const between = ([lo, hi], u) => lo + Math.min(hi - lo, Math.floor(u * (hi - lo + 1)));
const roundTo = (n, step, min = 0) => Math.max(min, Math.round(n / step) * step);
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
const defOf = (kind) => EVENT_DEFS.find((d) => d.id === kind) || null;
const copy = (v) => JSON.parse(JSON.stringify(v));

// ── Whether events come at all, and when ──
// Whether this city has city events: from CITY_EVENTS.from, and never in the guided first city (world.lesson).
export const eventsOn = (world) => !world.lesson && atLeast(world, CITY_EVENTS.from);

// The first day an event may be offered to a city that has never had one: its first month at Town plus firstMonths (and up to firstJitter more, seeded);
// null while the day the city became a Town is not on record (then only the record's own nextDay, a migrated city's, lets one come).
export function firstEventDay(world) {
  const town = world.splits ? world.splits[CITY_EVENTS.from] : undefined;
  if (!Number.isInteger(town)) return null;
  return town + (CITY_EVENTS.firstMonths + between([0, CITY_EVENTS.firstJitter], draw(world, town, 0, 'first'))) * DAYS_PER_MONTH;
}

// Whether a danger is striking now: a raid under way or due within CITY_EVENTS.dangerWithin days, a plague, a low Nile, locusts or blight under way, a fire.
export function dangerStriking(world) {
  const r = world.raid, h = world.hazards;
  if (r.active) return true;
  if (r.warning && r.warning.arrives - world.day <= CITY_EVENTS.dangerWithin) return true;
  if (h && ['plague', 'drought', 'locusts'].some((k) => h[k] && h[k].active)) return true;
  return burning(world).length > 0;
}

// Whether a court deadline is under CITY_EVENTS.courtWithin days away: a demand (its offer's or its deadline), the open request, the yearly tribute, the due.
export function courtSoon(world) {
  const within = (due) => Number.isFinite(due) && due - world.day < CITY_EVENTS.courtWithin;
  if (courtDemands(world).some((d) => within(d.due))) return true;
  const req = world.court.request;
  if (req && within(req.due)) return true;
  const q = quotaOf(world);
  if (q && q.result === null && within(q.due)) return true;
  return dueComing(world) && within(nextDueDay(world));
}

// ── What a city has, read by the kinds ──
const taxesOf = (world) => monthFigures(world).taxes;
const costOf = (world) => DIFFICULTIES[world.difficulty].cost;
// A price: max(min, share of the month's taxes, plus extra) times the difficulty's cost, to `step`, at least one step.
const feeOf = (world, row, extra = 0) => roundTo((Math.max(row.min, taxesOf(world) * row.share) + extra) * costOf(world), row.step, row.step);
// A gain: the same, never scaled by the difficulty.
const gainOf = (world, row) => roundTo(Math.max(row.min, taxesOf(world) * row.share), row.step, row.step);
const workingOf = (world, types) => allBuildings(world).filter((b) => types.includes(b.type) && isWorking(world, b));
// Whether incense can reach the city (ruling 988): Punt's route is open (incense comes only from Punt) or a store already holds some. The full Opet festival is
// offered only then; the card's words read this too.
export const incenseReaches = (world) => Boolean(world.trade.routes.punt) || stockOf(world, INCENSE_GOOD) > 0;
const festivalTooSoon = (world) => world.danger.festivalDay !== null && world.day - world.danger.festivalDay < FESTIVAL.every;
const roomForPeople = (world) => vacancies(world).reduce((n, v) => n + v.free, 0);
// The stocked good worth most gold in the stores among the goods homes use, with its stock: { good, stock, value } or null.
function richestStock(world, goods = [...FOOD_GOODS, ...HOUSEHOLD_GOODS]) {
  let best = null;
  for (const good of goods) {
    const stock = stockOf(world, good);
    if (stock <= 0) continue;
    const value = GOOD_VALUE[good] || 3;
    if (!best || stock * value > best.stock * best.value) best = { good, stock, value };
  }
  return best;
}
// The unrest row's mood now and with `n` more thefts: crime.js's crimeMood counts danger.theftDays in its window, each CRIME_MOOD.each, at most CRIME_MOOD.max.
const theftCount = (world) => (world.danger.theftDays || []).filter((d) => world.day - d <= CRIME_MOOD.days).length;
const theftMood = (count) => Math.max(CRIME_MOOD.max, count * CRIME_MOOD.each) + 0;
// How far the mood row falls if n thefts' worth of bad feeling is added now (0 or negative).
export const unrestMood = (world, n) => theftMood(theftCount(world) + n) - theftMood(theftCount(world));

// ── The effects ──
// Each choice is a list of effects, worded and carried out from the same list (src/ui/text.js CITY_EVENT_TEXT.effect words each kind):
//   { kind: 'gold', n }              the treasury moves by n (negative: a price)
//   { kind: 'goods', good, n }       a price in goods (n < 0) or goods put in the stores (n > 0, at most the room there is)
//   { kind: 'lose', good, n[, from] } goods lost (up to n, from the stores or the one store `from`): a loss is never refused
//   { kind: 'favour', n }            the court's favour (n is the change asked: favourChange says what really happens)
//   { kind: 'festival', n, days }    the temple festival's mood bonus for its days: it counts as the year's festival
//   { kind: 'pause', ids, days }     those workplaces stop for the days (the player's Resume is refused until they are up: ruling 987, commands.js setPaused)
//   { kind: 'people', n }            n people settle into homes with room
//   { kind: 'ill', ids }, { kind: 'cure', ids }   those homes fall ill, or those ill homes are cured
//   { kind: 'unrest', n }            n thefts' worth of bad feeling on the mood row for CRIME_MOOD.days
const gold = (n) => ({ kind: 'gold', n });
const goodsPay = (good, n) => ({ kind: 'goods', good, n: -n });
const goodsGet = (good, n) => ({ kind: 'goods', good, n });
const favour = (n) => ({ kind: 'favour', n });
const festival = () => ({ kind: 'festival', n: FESTIVAL.mood, days: FESTIVAL.days });
const unrest = (n) => ({ kind: 'unrest', n });
// An effect that does nothing now (nothing to lose, nobody to pause) is left out of the list, so the words never promise it.
const lose = (world, good, n, from = null) => {
  const have = from === null ? stockOf(world, good) : (world.buildings[from] ? world.buildings[from].store[good] || 0 : 0);
  const k = Math.min(n, have);
  return k > 0 ? [{ kind: 'lose', good, n: k, ...(from === null ? {} : { from }) }] : [];
};
const pauseOf = (world, ids, days) => {
  const live = ids.filter((id) => world.buildings[id] && !world.buildings[id].paused && isWorking(world, world.buildings[id]));
  return live.length ? [{ kind: 'pause', ids: live, days }] : [];
};
// people and cure stay in the list even when empty (n 0, no ids): a choice that would do nothing is refused with its reason, not sold for a price.
const peopleOf = (world, n) => [{ kind: 'people', n: Math.min(n, roomForPeople(world)) }];
const illOf = (world, ids) => { const live = ids.filter((id) => { const b = world.buildings[id]; return b && canFallIll(b) && !b.illness; }); return live.length ? [{ kind: 'ill', ids: live }] : []; };
const cureOf = (world, ids) => [{ kind: 'cure', ids: ids.filter((id) => { const b = world.buildings[id]; return b && b.illness && !b.illness.plague; }) }];

// Why one effect cannot be carried out now, or null: 'no_gold' (the treasury would go below 0), 'short' (the stores hold less than it takes),
// 'no_room' (no room for the goods or the people), 'too_soon' (a festival was held less than a year ago), 'none' (nothing for it to act on).
export function effectProblem(world, e) {
  switch (e.kind) {
    case 'gold': return e.n < 0 && world.gold + e.n < 0 ? 'no_gold' : null;
    case 'goods': return e.n < 0 ? (stockOf(world, e.good) < -e.n ? 'short' : null) : (roomFor(world, e.good) < e.n ? 'no_room' : null);
    case 'festival': return festivalTooSoon(world) ? 'too_soon' : null;
    case 'people': return e.n < 1 || roomForPeople(world) < e.n ? 'no_room' : null;
    case 'cure': case 'ill': case 'pause': return e.ids.length ? null : 'none';
    default: return null;
  }
}

// Carries out one effect (the others' checks are the caller's). The sim's own functions do the work.
function applyEffect(world, e, events) {
  const c = world.court;
  switch (e.kind) {
    case 'gold': world.gold += e.n; break;
    case 'goods': if (e.n < 0) takeGoods(world, e.good, -e.n); else putGoods(world, e.good, e.n); break;
    case 'lose': {
      if (e.from === undefined) { takeGoods(world, e.good, e.n); break; }
      const b = world.buildings[e.from];
      if (b && b.store[e.good] > 0) { b.store[e.good] = Math.max(0, b.store[e.good] - e.n); if (b.store[e.good] <= 0) delete b.store[e.good]; }
      break;
    }
    case 'favour': addFavour(world, e.n); break;
    case 'festival': applyEffects(world, [{ kind: 'mood', n: e.n, days: e.days, every: FESTIVAL.every }], events); break;   // the temple festival's own record: festivalDay, tally.festivals
    case 'pause': {
      const ids = e.ids.filter((id) => world.buildings[id] && !world.buildings[id].paused);
      for (const id of ids) world.buildings[id].paused = true;
      if (!Array.isArray(c.effects)) c.effects = [];
      c.effects.push({ kind: 'pause', ids, until: world.day + e.days, event: true });   // in the court's list, ended by its days (commands.js eventHoldUntil: the player's Resume is refused until then)
      break;
    }
    case 'people': applyEffects(world, [{ kind: 'people', n: e.n }]); break;
    case 'ill': for (const id of e.ids) fallIll(world, id, events, 'event'); break;
    case 'cure': applyEffects(world, [{ kind: 'cure', ids: e.ids }]); break;
    case 'unrest': {
      if (!Array.isArray(world.danger.theftDays)) world.danger.theftDays = [];
      for (let i = 0; i < e.n; i++) world.danger.theftDays.push(world.day);
      break;
    }
    default: break;
  }
}

// A pause the events started that the court is not awake to end (the court ends its own list from Market town on): its days are up, or the building is gone,
// so it is let go as the court would (src/sim/court.js endEffects).
function endEventPauses(world) {
  const c = world.court;
  if (!c || !Array.isArray(c.effects) || !c.effects.some((e) => e.event === true)) return;
  c.effects = c.effects.filter((e) => {
    if (e.kind !== 'pause' || e.event !== true) return true;
    e.ids = e.ids.filter((id) => world.buildings[id] && world.buildings[id].paused);
    if (world.day < e.until) return true;
    for (const id of e.ids) world.buildings[id].paused = false;
    return false;
  });
}

// ── The kinds: what each needs to be offered (its figures) and what its choices do ──
// OFFER[kind](world, id) -> the figures the event is offered with (everything the card says that is not read live), or null when the city cannot take it
// now. CHOICES[kind](world, figs) -> { choiceId: [effects] } worked out from the figures and the city as it is now (clamped to what is there).
const OFFER = {
  opet(world, id) {
    const N = EVENT_NUMBERS.opet;
    if (!workingOf(world, ['temple']).length || festivalTooSoon(world) || stockOf(world, 'beer') < N.beerMin) return null;
    const beer = roundTo(clamp(population(world) * N.beer.per, N.beer.min, N.beer.max), N.beer.step, N.beer.step);
    return { beer, small: roundTo(beer * N.small, N.beer.step, N.beer.step), incense: N.incense, favour: N.favour };
  },
  envoy: (world) => ({ fee: feeOf(world, EVENT_NUMBERS.envoy.fee) }),
  bumper(world) {
    const N = EVENT_NUMBERS.bumper;
    if (!workingOf(world, ['farm_grain']).length || roomFor(world, 'grain') < N.roomMin) return null;
    const n = roundTo(clamp(outputPerMonth(world, 'grain') * N.surplus.months, N.surplus.min, N.surplus.max), N.surplus.step, N.surplus.step);   // the farms' month, as the court reckons it
    return { n: Math.min(n, roomFor(world, 'grain')) };
  },
  hoard: (world) => ({ gold: gainOf(world, EVENT_NUMBERS.hoard.gold) }),
  scribes: (world) => ({ dues: gainOf(world, EVENT_NUMBERS.scribes.dues) }),
  healer(world) {
    const N = EVENT_NUMBERS.healer;
    const ill = housesOf(world).filter((b) => b.illness && !b.illness.plague).map((b) => b.id);
    if (ill.length < N.homesMin) return null;
    return { ids: ill, fee: roundTo(Math.max(N.feeMin, N.perHome * ill.length) * costOf(world), N.step, N.step) };
  },
  craftsman(world, id) {
    const N = EVENT_NUMBERS.craftsman;
    if (roomForPeople(world) < N.roomMin) return null;
    return { fee: feeOf(world, N.fee), n: between(N.people, draw(world, id, world.day, 'amount')) };
  },
  pilgrims(world, id) {
    const N = EVENT_NUMBERS.pilgrims;
    if (!workingOf(world, ['temple']).length || roomForPeople(world) < N.roomMin) return null;
    return { fee: feeOf(world, N.fee), n: between(N.people, draw(world, id, world.day, 'amount')), offering: gainOf(world, N.offering) };
  },
  sandstorm(world) {
    const N = EVENT_NUMBERS.sandstorm;
    const best = richestStock(world);
    if (!best || best.stock < N.stockMin) return null;
    const n = roundTo(Math.max(N.min, best.stock * N.lossShare), N.step, N.step);
    const saved = roundTo(n * N.sweepKeeps, N.step, N.step);
    return { good: best.good, n, saved, fee: roundTo(Math.max(N.fee.min, saved * best.value * N.price) * costOf(world), N.fee.step, N.fee.step) };
  },
  fever(world, id) {
    const N = EVENT_NUMBERS.fever;
    if (!threatsOn(world)) return null;
    const homes = housesOf(world).filter((b) => canFallIll(b) && !b.illness && b.residents >= N.residentsMin);
    const k = Math.min(homes.length, between(N.homes, draw(world, id, world.day, 'amount')));
    if (k < N.homes[0]) return null;
    const ids = homes.sort((a, b) => draw(world, a.id, id, 'pick') - draw(world, b.id, id, 'pick') || a.id - b.id).slice(0, k).map((b) => b.id).sort((a, b) => a - b);
    return { ids, fee: roundTo(Math.max(N.feeMin, N.perHome * k) * costOf(world), N.step, N.step) };
  },
  rumour: (world) => (courtOpen(world) ? { fee: feeOf(world, EVENT_NUMBERS.rumour.fee) } : null),
  thief(world) {
    const N = EVENT_NUMBERS.thief;
    if (!threatsOn(world)) return null;
    let best = null, bestTotal = 0;
    for (const b of allBuildings(world)) {
      if (b.type !== 'storehouse' && b.type !== 'bazaar') continue;
      const total = [...FOOD_GOODS, ...HOUSEHOLD_GOODS].reduce((s, g) => s + (b.store[g] || 0), 0);
      if (total > bestTotal) { best = b; bestTotal = total; }
    }
    if (!best || bestTotal < N.stockMin) return null;
    let good = null;
    for (const g of [...FOOD_GOODS, ...HOUSEHOLD_GOODS]) if ((best.store[g] || 0) > (good ? best.store[good] : 0)) good = g;
    const n = Math.min(best.store[good], roundTo(between(N.loss, draw(world, best.id, world.day, 'amount')), N.step, N.step));
    return { store: best.id, good, n, fee: feeOf(world, N.fee) };
  },
  feud(world) {
    const N = EVENT_NUMBERS.feud;
    if (!threatsOn(world) || housesOf(world).filter((b) => b.residents > 0).length < N.homesMin) return null;
    return { fee: feeOf(world, N.fee), thefts: N.thefts };
  },
  quarry_strike(world) {
    const N = EVENT_NUMBERS.quarry_strike;
    const ids = workingOf(world, ['quarry']).map((b) => b.id);
    return ids.length ? { ids, fee: feeOf(world, N.fee, N.perQuarry * ids.length), days: N.days } : null;
  },
  workshop_quarrel(world) {
    const N = EVENT_NUMBERS.workshop_quarrel;
    let best = null;
    for (const type of N.types) {
      const ids = workingOf(world, [type]).map((b) => b.id);
      if (ids.length > (best ? best.ids.length : 0)) best = { type, ids };
    }
    return best ? { type: best.type, ids: best.ids, fee: feeOf(world, N.fee, N.perShop * best.ids.length), days: N.days } : null;
  },
  lost_caravan(world) {
    const N = EVENT_NUMBERS.lost_caravan;
    if (!workingOf(world, ['trading_post']).length) return null;
    const best = richestStock(world, HOUSEHOLD_GOODS);
    if (!best || best.stock < N.stockMin) return null;
    return { good: best.good, n: roundTo(Math.max(N.min, best.stock * N.lossShare), N.step, N.step), fee: feeOf(world, N.fee) };
  },
};

const CHOICES = {
  opet(world, f) {
    const out = { decline: [] };
    out.small = [goodsPay('beer', f.small), festival()];
    if (incenseReaches(world)) out.full = [goodsPay('beer', f.beer), goodsPay(INCENSE_GOOD, f.incense), festival(), favour(f.favour)];
    return out;
  },
  envoy: (world, f) => ({ feast: [gold(-f.fee), favour(EVENT_NUMBERS.envoy.feast)], greet: [favour(EVENT_NUMBERS.envoy.greet)] }),
  bumper(world, f) {
    const room = Math.min(f.n, roomFor(world, 'grain'));
    return { store: room > 0 ? [goodsGet('grain', room)] : [], sell: [gold(f.n * EVENT_NUMBERS.bumper.price)] };
  },
  hoard: (world, f) => ({ keep: [gold(f.gold)], bless: [festival()] }),
  scribes: (world, f) => ({ collect: [gold(f.dues)], forgive: [favour(EVENT_NUMBERS.scribes.favour)] }),
  healer: (world, f) => ({ send_away: [], cure: [gold(-f.fee), ...cureOf(world, f.ids)] }),
  craftsman: (world, f) => ({ pass: [], settle: [gold(-f.fee), ...peopleOf(world, f.n)] }),
  pilgrims: (world, f) => ({ camp: [gold(f.offering)], lodge: [gold(-f.fee), ...peopleOf(world, f.n)] }),
  sandstorm: (world, f) => ({ weather: lose(world, f.good, f.n), sweep: [gold(-f.fee), ...lose(world, f.good, f.n - f.saved)] }),
  fever: (world, f) => ({ let_in: illOf(world, f.ids), gate: [gold(-f.fee)] }),
  rumour: (world, f) => ({ ignore: [favour(-EVENT_NUMBERS.rumour.favour)], gift: [gold(-f.fee)] }),
  thief(world, f) {
    const covered = (crimeCoverage(world).get(f.store) || 0) >= CRIME.staffedAt;
    const n = covered ? Math.max(EVENT_NUMBERS.thief.step, roundTo(f.n * EVENT_NUMBERS.thief.coveredShare, EVENT_NUMBERS.thief.step)) : f.n;
    return { let_run: lose(world, f.good, n, f.store), watch: [gold(-f.fee)] };
  },
  feud: (world, f) => ({ let_be: [unrest(f.thefts)], send_watch: [gold(-f.fee)] }),
  quarry_strike: (world, f) => ({ strike: pauseOf(world, f.ids, f.days), raise_wages: [gold(-f.fee)] }),
  workshop_quarrel: (world, f) => ({ quarrel: pauseOf(world, f.ids, f.days), settle_it: [gold(-f.fee)] }),
  lost_caravan: (world, f) => ({ write_off: lose(world, f.good, f.n), search: [gold(-f.fee)] }),
};

// Whether a staffed police post reaches the store a thief's offer is about (the loss halves when one does): for the card's words.
export const thiefCovered = (world, f) => (crimeCoverage(world).get(f.store) || 0) >= CRIME.staffedAt;

// ── The choices ──
// The event's choices as the city stands now, in the kind's order: [{ id, gold, ok, reason, default, effects }]. gold: what the choice takes from the
// treasury (0 for none); ok: whether it can be made; reason: the first effectProblem when not. The default is always ok (its losses are clamped to what is
// there) and never costs gold (a test keeps every kind so).
export function eventChoices(world, event) {
  const def = event && defOf(event.kind);
  if (!def || !CHOICES[def.id] || !event.figs) return [];
  const table = CHOICES[def.id](world, event.figs);
  return def.choices.filter((id) => table[id] !== undefined).map((id) => {
    const effects = table[id];
    const isDefault = id === def.default;
    const bad = isDefault ? undefined : effects.find((e) => effectProblem(world, e));
    const reason = bad ? effectProblem(world, bad) : null;
    return { id, gold: effects.reduce((s, e) => s + (e.kind === 'gold' && e.n < 0 ? -e.n : 0), 0), ok: reason === null, reason, bad: bad || null, default: isDefault, effects };
  });
}

// What favour really moves by under an effect list now (favour stays inside its range): for the words.
export const favourMoves = (world, effects) => effects.filter((e) => e.kind === 'favour').reduce((n, e) => n + favourChange(world, e.n), 0);

// Carries out the event's choice: the waiting event only (fails 'no_event' for another), 'no_choice' for an id it does not list, the choice's reason when it
// cannot be made, 'changed' when `shown` (the effects the card read) is not what the choice would do now. Clears the record's waiting event and counts it.
export function applyChoice(world, event, choiceId, events = null, shown = null) {
  const s = world.cityEvents, w = s.waiting;
  const fail = (reason) => ({ ok: false, reason, warnings: [] });
  if (!event || !w || w.kind !== event.kind || w.day !== event.day) return fail('no_event');
  const choice = eventChoices(world, w).find((c) => c.id === choiceId);
  if (!choice) return fail('no_choice');
  if (shown && JSON.stringify(shown) !== JSON.stringify(choice.effects)) return { ...fail('changed'), effects: choice.effects };
  if (!choice.ok) return fail(choice.reason);
  return resolve(world, w, choice, 'answered', events);
}

function resolve(world, w, choice, result, events) {
  for (const e of choice.effects) applyEffect(world, e, events);
  world.cityEvents.waiting = null;
  if (result === 'answered') world.tally.eventsAnswered += 1; else world.tally.eventsLapsed += 1;
  if (events) events.push({ type: 'city_event', kind: w.kind, choice: choice.id, result, effects: copy(choice.effects) });
  return { ok: true, reason: null, warnings: [], effects: choice.effects };
}

// ── The draw ──
// The kinds that can be offered today, in EVENT_DEFS' order: [{ def, figs }] (rank, cooldown, what the city needs and the kind's own conditions).
function eligible(world, id) {
  const s = world.cityEvents, out = [];
  for (const def of EVENT_DEFS) {
    if (!atLeast(world, def.from) || (s.cooldowns[def.id] || 0) > world.day) continue;
    if (def.needs.includes('court') && !courtOpen(world)) continue;
    if (def.needs.includes('threats') && !threatsOn(world)) continue;
    const figs = OFFER[def.id](world, id);
    if (figs) out.push({ def, figs });
  }
  return out;
}

// The event of one kind as it would be offered now, whatever the day and the draw (the kind's own conditions still hold: rank, what the city needs and has),
// or null: for the dev scenes and the tests; the draw is drawEvent's.
export function offerFor(world, kind) {
  const def = defOf(kind);
  if (!def || !atLeast(world, def.from)) return null;
  if (def.needs.includes('court') && !courtOpen(world)) return null;
  if (def.needs.includes('threats') && !threatsOn(world)) return null;
  const id = world.tally.eventsOffered, figs = OFFER[kind](world, id);
  return figs ? { kind, day: world.day, due: world.day + def.months * DAYS_PER_MONTH, id, figs } : null;
}

// The event to offer today, or null: { kind, day, due, id, figs } (see the header for when none is). Pure: the same world gives the same answer.
export function drawEvent(world) {
  const s = world.cityEvents;
  if (s.waiting || !eventsOn(world) || world.day < s.nextDay) return null;
  const first = firstEventDay(world);
  if (first === null ? s.nextDay === 0 : world.day < first) return null;     // a city whose Town day is not on record waits for its record's own day
  if (dangerStriking(world) || courtSoon(world)) return null;
  const id = world.tally.eventsOffered;
  const pool = eligible(world, id);
  const turn = pool.filter((p) => p.def.welcome === (id % 2 === 0));          // welcome and troublesome take turns, the other side when its own has none
  const from = turn.length ? turn : pool;
  if (!from.length) return null;
  const pick = from[Math.floor(draw(world, id, world.day, 'kind') * from.length)];
  return { kind: pick.def.id, day: world.day, due: world.day + pick.def.months * DAYS_PER_MONTH, id, figs: pick.figs };
}

// ── The hooks (src/sim/v70.js) ──
// The day (before the day counts on): an unanswered event whose time is up takes its default; else an event is offered when one is drawn. The offer notes
// the kind's cooldown and the next gap (from the offer, not from the answer).
export function eventDay(world, events = null) {
  const s = world.cityEvents;
  endEventPauses(world);
  const w = s.waiting;
  if (w) {
    const def = defOf(w.kind);
    if (!def) { s.waiting = null; return; }                                     // a kind this build does not know (a save from a later one)
    if (world.day >= w.due) {
      const choice = eventChoices(world, w).find((c) => c.default);
      if (choice) resolve(world, w, choice, 'default', events); else s.waiting = null;
    }
    return;
  }
  const ev = drawEvent(world);
  if (!ev) return;
  const def = defOf(ev.kind);
  s.waiting = ev;
  s.cooldowns[ev.kind] = world.day + def.cooldown * DAYS_PER_MONTH;
  s.nextDay = world.day + between(CITY_EVENTS.gapMonths, draw(world, ev.id, world.day, 'gap')) * DAYS_PER_MONTH;
  world.tally.eventsOffered += 1;
  if (events) events.push({ type: 'city_event_offered', kind: ev.kind, id: ev.id, welcome: def.welcome, months: def.months });
}

export function eventMonth() {}   // nothing happens at a month's end: events are offered and answered by the day

// The whole months an event has left to be answered (rounded up; 0 once due).
export const eventMonthsLeft = (world, event) => Math.max(0, Math.ceil((event.due - world.day) / DAYS_PER_MONTH));

// The waiting event as a record the card and the words read, or null: { ...event, def, monthsLeft }. A copy.
export function waitingEvent(world) {
  const w = world.cityEvents.waiting, def = w ? defOf(w.kind) : null;
  return def ? { ...copy(w), def, monthsLeft: eventMonthsLeft(world, w) } : null;
}

// The alert row's entry while an event waits (src/sim/alerts.js through v70Alerts): a warning, never the banner. { code: 'city_event', kind, months }.
export function eventAlerts(world) {
  const w = waitingEvent(world);
  return w ? [{ code: 'city_event', kind: w.kind, months: w.monthsLeft }] : [];
}

// The waiting event's Advice item (cityAdvice through v70Advice, ruling 866), kind 'event', weight CITY_EVENTS.advice (more in its last month): the fix
// opens the card (the interface's seam; the summary's Events row is its home).
export function eventItems(world, alerts, out) {
  const w = waitingEvent(world);
  if (!w) return;
  const A = CITY_EVENTS.advice;
  const weight = (w.def.welcome ? A.welcome : A.trouble) + (w.monthsLeft <= 1 ? A.soon : 0);
  out.push({ key: `event:${w.kind}:${w.id}`, kind: 'event', weight, count: 1, id: null, data: { event: w.kind, welcome: w.def.welcome, monthsLeft: w.monthsLeft }, fix: { view: 'summary', section: 'events', target: null }, cost: null, afford: null });
}
