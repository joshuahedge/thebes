// The court (Stage 4.6, Court track, rulings 336-339, 370-379): favour, the capital's requests, the event cards and the letters
// that carry them. World state: world.court (src/data/court.js newCourtState). Draws: hash2(a, b, (world.seed + COURT_SALT.x) | 0), a =
// the letter's number, b = the day. No Math.random, Date or clock here.
//
// Two hooks are called from src/sim/raids.js (the Armies track's file): favour's effect on a raid's size and on its tribute. Favour never
// changes a raid's mix by enemy kind: that is the Armies track's, drawn from the size favourRaidSize gives. Do not import raids.js here
// (raids.js imports this file); read world.raid directly. Units for a soldiers request are lent through src/sim/armies.js, never
// through world.soldiers.
//
// The court opens (ruling 371) once the city is a Market town and has finished the trading goal (or is a City, whichever comes first).
// Then, in game time: a guided letter (an easy request) in year 2 at the earliest; a request every 8-14 months (one at a time, with a
// deadline of 6-12 months); a card every 12-18 months (none during a raid). Letters queue: { id, kind: 'request' | 'card', day, read }.
//
// A card's choices are lists of EFFECTS (cardChoices): { kind: 'favour', n } | { kind: 'gold', n } | { kind: 'goods', good, n } |
// { kind: 'mood', n, days, every } | { kind: 'pause', ids, days } | { kind: 'faster', ids, factor } | { kind: 'cure', ids } |
// { kind: 'people', n } | { kind: 'wages', perMonth, months } | { kind: 'herd', how } | { kind: 'forecast' }. The list is worked out from the
// state as it is when asked; the words on the card are written from it and applyEffects carries out that same list, so what a choice
// says it does and what it does cannot differ. effectProblem says why a list cannot be carried out now (the choice's button is off).
//
// Events (pushed into the events array; never saved): { type: 'court_letter', id, kind, card }, { type: 'court_letter_gone', id, card },
// { type: 'court_request', result: 'met' | 'refused' | 'missed', request, favour, gold }, { type: 'court_card', card, choice },
// { type: 'court_gift', gold, good, n }.
import { FAVOUR, COURT, REQUESTS, REQUEST_KINDS, GOOD_VALUE, GIFTS, CARDS, COURT_CARDS, CARD_NUMBERS, COURT_SALT } from '../data/court.js';
import { RAIDS, FESTIVAL } from '../data/raids.js';
import { HEALTH } from '../data/health.js';
import { CRIME } from '../data/crime.js';
import { DIFFICULTIES } from '../data/difficulty.js';
import { PARTNERS } from '../data/trade.js';
import { BUILDINGS } from '../data/buildings.js';
import { FOOD_GOODS, FOOD_SLOTS, HOUSEHOLD_GOODS, RAW_GOODS } from '../data/goods.js';
import { allBuildings } from './world.js';
import { isWorking } from './labour.js';
import { atLeast } from './progression.js';
import { canAfford } from './money.js';
import { festivalCostOf, threatsOn } from './costs.js';
import { monthFigures } from './economy.js';
import { storeAccepts, storeTotal } from './production.js';
import { partnerUnlocked } from './trade.js';
import { vacancies } from './immigration.js';
import { illHomes } from './health.js';
import { unitsAtHome, sendUnits } from './armies.js';
import { herdArrives, herdLeaves } from './wildlife.js';
import { buyForecast } from './flood.js';
import { hash2 } from './rng.js';
import { DAYS_PER_MONTH, MONTHS_PER_YEAR } from './time.js';

const DAYS_PER_YEAR = DAYS_PER_MONTH * MONTHS_PER_YEAR;
const draw = (world, a, b, salt) => hash2(a, b, (world.seed + COURT_SALT[salt]) | 0);
const pick = ([lo, hi], u) => lo + Math.min(hi - lo, Math.floor(u * (hi - lo + 1)));   // a whole number in [lo, hi]
const span = ([lo, hi], u) => lo + (hi - lo) * u;
const roundTo = (n, step, min = 0) => Math.max(min, Math.round(n / step) * step);
const costScale = (world) => DIFFICULTIES[world.difficulty].cost;
const fail = (reason, extra = {}) => ({ ok: false, reason, ...extra });

// ── Dates and favour ──
export const monthsLeft = (world, due) => Math.max(0, Math.ceil((due - world.day) / DAYS_PER_MONTH));
export const dateOfDay = (day) => ({ year: Math.floor(day / DAYS_PER_YEAR) + 1, month: Math.floor((day % DAYS_PER_YEAR) / DAYS_PER_MONTH) + 1 });

// 'high' (gifts, cheaper tribute), 'low' (bigger raids, dearer tribute) or 'steady'.
export const favourBand = (world) => (world.court.favour >= FAVOUR.high ? 'high' : world.court.favour <= FAVOUR.low ? 'low' : 'steady');

// Changes favour by n, kept inside FAVOUR.min..max; returns how much it really changed.
export function addFavour(world, n) {
  const c = world.court;
  const before = c.favour;
  c.favour = Math.max(FAVOUR.min, Math.min(FAVOUR.max, before + n));
  return c.favour - before;
}

// Favour's effect on a raid (ruling 336), called by raids.js: the raid size a warning fixes now, after the usual rule and its caps. At
// FAVOUR.low or less one size step bigger: FAVOUR.raidStep of the size, at least one raider more, never past RAIDS.maxSize (ruling 370).
export function favourRaidSize(world, size) {
  if (world.court.favour > FAVOUR.low) return size;
  return Math.max(size, Math.min(RAIDS.maxSize, size + Math.max(1, Math.round(size * FAVOUR.raidStep))));
}
// The multiplier on a raid's tribute: FAVOUR.tributeHigh at FAVOUR.high or more, FAVOUR.tributeLow at FAVOUR.low or less, else 1.
export const favourTributeFactor = (world) => (world.court.favour >= FAVOUR.high ? FAVOUR.tributeHigh : world.court.favour <= FAVOUR.low ? FAVOUR.tributeLow : 1);

// ── Goods in the city's stores ──
const holds = (b, good) => (BUILDINGS[b.type].stores || []).includes(good);
// Units of a good in every store that keeps it (granaries, storehouses).
export const stockOf = (world, good) => allBuildings(world).reduce((n, b) => n + (holds(b, good) ? b.store[good] || 0 : 0), 0);
// Takes up to n of a good out of the stores, lowest building id first; returns how many it took.
export function takeGoods(world, good, n) {
  let left = n;
  for (const b of allBuildings(world)) {
    if (left <= 0) break;
    if (!holds(b, good) || !(b.store[good] > 0)) continue;
    const k = Math.min(left, b.store[good]);
    b.store[good] -= k;
    if (b.store[good] <= 0) delete b.store[good];
    left -= k;
  }
  return n - left;
}
const takesGood = (world, b, good) => storeAccepts(b, good) && isWorking(world, b);
// Room for a good in the working stores that accept it.
export const roomFor = (world, good) => allBuildings(world).reduce((n, b) => n + (takesGood(world, b, good) ? Math.max(0, BUILDINGS[b.type].capacity - storeTotal(b)) : 0), 0);
// Puts up to n of a good into those stores, lowest building id first; returns how many it put.
export function putGoods(world, good, n) {
  let left = n;
  for (const b of allBuildings(world)) {
    if (left <= 0) break;
    if (!takesGood(world, b, good)) continue;
    const k = Math.min(left, Math.max(0, BUILDINGS[b.type].capacity - storeTotal(b)));
    if (k > 0) { b.store[good] = (b.store[good] || 0) + k; left -= k; }
  }
  return n - left;
}

// What the city makes of a good a month: its working producers' output at their staffing, else (for a good it only trades for) an open
// route's yearly quota / 12; 0 when it neither makes it nor can trade for it.
export function outputPerMonth(world, good) {
  let n = 0;
  for (const b of allBuildings(world)) {
    const def = BUILDINGS[b.type];
    if (def.produces && def.produces.good === good && isWorking(world, b)) n += def.produces.perMonth * (b.staff / def.workers);
  }
  if (n > 0) return n;
  for (const [id, p] of Object.entries(PARTNERS)) {
    if (!world.trade.routes[id] || !partnerUnlocked(world, id)) continue;
    if (p.sells[good] && !p.sells[good].from) n = Math.max(n, p.sells[good].quota / MONTHS_PER_YEAR);
  }
  return n;
}

// The goods a food or goods request may name: food in FOOD_SLOTS order, then household and raw goods, each only if the city makes it
// (or trades for it). Given the letter's number (id), a food is named only when the stores already hold half of what would be asked: a
// city short of food is never asked for it (ruling 374).
export function askableGoods(world, kind, id = null) {
  const pool = kind === 'food' ? FOOD_SLOTS.filter((g) => FOOD_GOODS.includes(g)) : [...HOUSEHOLD_GOODS, ...RAW_GOODS];
  return pool.filter((g) => outputPerMonth(world, g) > 0 && (kind !== 'food' || id === null || stockOf(world, g) * 2 >= askAmount(world, 'food', g, id)));
}
const unitsHome = (world) => Object.values(unitsAtHome(world)).reduce((a, b) => a + b, 0);

// ── Letters ──
const letterFor = (world, id) => world.court.letters.find((l) => l.id === id) || null;
export const letterOf = letterFor;
function logPush(world, entry) {
  const c = world.court;
  c.log.push({ day: world.day, ...entry });
  if (c.log.length > COURT.logMax) c.log.splice(0, c.log.length - COURT.logMax);
}
const removeLetter = (world, id) => { world.court.letters = world.court.letters.filter((l) => l.id !== id); };

// The letter has been opened: marks it read (the alert row stops raising it) and counts it, once. Returns true the first time.
export function readLetter(world, id) {
  const l = letterFor(world, id);
  if (!l || l.read) return false;
  l.read = true;
  world.tally.lettersRead += 1;
  return true;
}

// ── Requests (ruling 337) ──
// The amount a request asks for (see REQUESTS.amounts): kind 'goods' / 'food' for the good, 'gold' for months of taxes, 'soldiers' for a
// share of the units at home.
function askAmount(world, kind, good, id) {
  const A = REQUESTS.amounts[kind];
  const u = draw(world, id, world.day, 'requestAmount');
  if (kind === 'soldiers') {
    const total = unitsHome(world);
    return Math.max(1, Math.min(total - 1, Math.round(total * span(A.share, u))));
  }
  if (kind === 'gold') {
    const taxes = monthFigures(world).taxes;
    const base = taxes > 0 ? taxes : world.gold * 0.1;
    const amount = roundTo(base * span(A.months, u) * costScale(world), A.step, A.min);
    return Math.min(amount, Math.max(A.min, Math.floor((world.gold * A.reserve) / A.step) * A.step));
  }
  return roundTo(outputPerMonth(world, good) * span(A.months, u) * costScale(world), A.step, A.min);
}
// The gold a met request pays (see REQUESTS.rewards).
function rewardOf(world, kind, good, amount, id) {
  const R = REQUESTS.rewards;
  const u = draw(world, id, world.day, 'reward');
  if (kind === 'soldiers') return Math.max(R.min, amount * R.soldier);
  if (kind === 'gold') return roundTo(amount * span(R.gold, u), 5, R.min);
  return roundTo(amount * (GOOD_VALUE[good] || 3) * span(R.share, u), 5, R.min);
}
// The kinds the city can be asked for now, in REQUEST_KINDS order.
function askableKinds(world, id) {
  return REQUEST_KINDS.filter((k) => {
    if (k === 'goods' || k === 'food') return askableGoods(world, k, id).length > 0;
    if (k === 'gold') return world.gold >= REQUESTS.amounts.gold.min;
    return unitsHome(world) >= 2;
  });
}
// The guided letter's ask (ruling 371): a modest amount of the household or raw good the stores hold most of, else of a food the stores hold
// plenty of (never a city's last food), else a little gold; null when the city has none of these (the letter waits).
function guidedAsk(world) {
  const G = REQUESTS.guided;
  const most = (pool, atLeast) => {
    let best = null, bestStock = 0;
    for (const good of pool) {
      const s = stockOf(world, good);
      if (s > bestStock) { best = good; bestStock = s; }
    }
    return best && bestStock >= atLeast ? { good: best, stock: bestStock } : null;
  };
  const pick1 = most([...HOUSEHOLD_GOODS, ...RAW_GOODS], G.min * 2);
  const food = pick1 ? null : most(FOOD_GOODS, G.foodMin);
  const chosen = pick1 || food;
  if (chosen) {
    return { kind: FOOD_GOODS.includes(chosen.good) ? 'food' : 'goods', good: chosen.good, amount: Math.min(chosen.stock, roundTo(chosen.stock * G.stockShare, G.step, G.min)) };
  }
  if (world.gold >= G.goldMin * 3) return { kind: 'gold', good: null, amount: roundTo(Math.min(G.goldMax, world.gold * G.goldShare), G.goldStep, G.goldMin) };
  return null;
}

// Writes a request and its letter. Returns the request, or null when nothing can be asked yet.
function createRequest(world, events, guided) {
  const c = world.court;
  const id = c.nextId;
  let kind, good = null, amount;
  if (guided) {
    const ask = guidedAsk(world);
    if (!ask) return null;
    ({ kind, good, amount } = ask);
  } else {
    const kinds = askableKinds(world, id);
    if (!kinds.length) return null;
    kind = kinds[Math.floor(draw(world, id, world.day, 'requestKind') * kinds.length)];
    if (kind === 'goods' || kind === 'food') {
      const goods = askableGoods(world, kind, id);
      good = goods[Math.floor(draw(world, id, world.day, 'requestGood') * goods.length)];
    }
    amount = askAmount(world, kind, good, id);
  }
  const G = REQUESTS.guided;
  const months = guided ? G.deadlineMonths : pick(REQUESTS.deadlineMonths, draw(world, id, world.day, 'deadline'));
  const request = {
    id, kind, good, amount, day: world.day, due: world.day + months * DAYS_PER_MONTH, guided,
    gold: guided ? G.reward : rewardOf(world, kind, good, amount, id),
    met: guided ? G.met : pick(REQUESTS.met, draw(world, id, world.day, 'favourMet')),
    missed: guided ? G.missed : pick(REQUESTS.missed, draw(world, id, world.day, 'favourMissed')),
  };
  c.nextId += 1;
  c.request = request;
  c.letters.push({ id, kind: 'request', day: world.day, read: false });
  if (events) events.push({ type: 'court_letter', id, kind: 'request', card: null });
  return request;
}

// Whether the active request can be met now: { ok, reason, have, need, monthsLeft }. reason: 'short' (the stores hold less than asked),
// 'no_gold', 'raid' (units cannot leave during a raid) or 'not_enough' (fewer units at home than asked).
export function requestStatus(world, r = world.court.request) {
  if (!r) return { ok: false, reason: 'none', have: 0, need: 0, monthsLeft: 0 };
  const left = monthsLeft(world, r.due);
  if (r.kind === 'gold') return { ok: world.gold >= r.amount, reason: world.gold >= r.amount ? null : 'no_gold', have: world.gold, need: r.amount, monthsLeft: left };
  if (r.kind === 'soldiers') {
    const home = unitsHome(world);
    const reason = world.raid.active ? 'raid' : home < r.amount ? 'not_enough' : null;
    return { ok: reason === null, reason, have: home, need: r.amount, monthsLeft: left };
  }
  const have = stockOf(world, r.good);
  return { ok: have >= r.amount, reason: have >= r.amount ? null : 'short', have, need: r.amount, monthsLeft: left };
}

function resolveRequest(world, result, favour, gold, events) {
  const c = world.court;
  const r = c.request;
  removeLetter(world, r.id);
  c.request = null;
  if (r.guided) c.guided = 'answered';
  if (c.nextRequestDay !== null) c.nextRequestDay = Math.max(c.nextRequestDay, world.day + DAYS_PER_MONTH);   // a month's breather before the next
  logPush(world, { kind: 'request', result, request: { kind: r.kind, good: r.good, amount: r.amount }, favour, gold });
  if (events) events.push({ type: 'court_request', result, request: { kind: r.kind, good: r.good, amount: r.amount }, favour, gold });
}

// Meets the active request: the goods, gold or units leave, favour rises by the request's own number and its reward is paid. Fails with
// requestStatus's reason (nothing is taken).
export function sendRequest(world, events = null) {
  const r = world.court.request;
  const st = requestStatus(world, r);
  if (!r) return fail('none');
  if (!st.ok) return fail(st.reason);
  if (r.kind === 'gold') world.gold -= r.amount;
  else if (r.kind === 'soldiers') {
    const sent = sendUnits(world, r.amount, REQUESTS.soldiersMonths * DAYS_PER_MONTH, events);
    if (!sent.ok) return fail(sent.reason);
  } else takeGoods(world, r.good, r.amount);
  const favour = addFavour(world, r.met);
  world.gold += r.gold;
  world.tally.requestsMet += 1;
  resolveRequest(world, 'met', favour, r.gold, events);
  return { ok: true, reason: null, favour, gold: r.gold };
}

// Refuses the active request: favour falls by the number the letter named (the same as missing the deadline).
export function refuseRequest(world, events = null) {
  const r = world.court.request;
  if (!r) return fail('none');
  const favour = addFavour(world, -r.missed);
  world.tally.requestsMissed += 1;
  resolveRequest(world, 'refused', favour, 0, events);
  return { ok: true, reason: null, favour, gold: 0 };
}

// ── Event cards (ruling 338) ──
const cell = (b) => `${Math.floor(b.x / CRIME.districtTiles)},${Math.floor(b.y / CRIME.districtTiles)}`;
// The sick homes in one district square (ids, ascending).
const sickIn = (world, cx, cy) => illHomes(world).filter((b) => cell(b) === `${cx},${cy}`).map((b) => b.id);
// The workplaces in a district square that close in a quarantine: every building with workers but the safety services (firehouse,
// physician, police post, tower, barracks), not already paused.
const workplacesIn = (world, cx, cy) => allBuildings(world).filter((b) => BUILDINGS[b.type].workers > 0 && BUILDINGS[b.type].priority !== 'safety' && !b.paused && cell(b) === `${cx},${cy}`).map((b) => b.id);
const workshops = (world) => allBuildings(world).filter((b) => BUILDINGS[b.type].consumes && BUILDINGS[b.type].produces && isWorking(world, b));
const room = (world) => vacancies(world).reduce((n, v) => n + v.free, 0);

// The Stage 4.6 hooks the lost herd and the flood omen cards call (the River track's), probed on a copy of the world so asking never
// changes it; cached for the day. A card whose hook cannot act is not drawn.
const probes = new WeakMap();
function probed(world, key, fn) {
  let e = probes.get(world);
  if (!e || e.day !== world.day) { e = { day: world.day, v: {} }; probes.set(world, e); }
  if (!(key in e.v)) e.v[key] = Boolean(fn(structuredClone(world)));
  return e.v[key];
}
export const RIVER_HOOKS = {
  canArrive: (world) => probed(world, 'arrive', (w) => herdArrives(w, null)),
  canLeave: (world) => probed(world, 'leave', (w) => herdLeaves(w, null)),
  canForecast: (world) => probed(world, 'forecast', (w) => buyForecast(w).ok),
};

// What each card needs to be drawn, and what it draws: args (kept on the letter), or null when the card cannot come now. `id` is the
// letter's number (the draw's key).
const CARD_ARGS = {
  sickness(world) {
    const groups = new Map();
    for (const b of illHomes(world)) {
      const k = cell(b);
      if (!groups.has(k)) groups.set(k, { cx: Math.floor(b.x / CRIME.districtTiles), cy: Math.floor(b.y / CRIME.districtTiles), n: 0 });
      groups.get(k).n++;
    }
    let best = null;
    for (const g of groups.values()) if (!best || g.n > best.n) best = g;   // the district with the most sick homes; the first on a tie
    return best ? { cx: best.cx, cy: best.cy } : null;
  },
  festival(world) {
    const last = world.danger.festivalDay;
    return atLeast(world, FESTIVAL.from) && (last === null || world.day - last >= FESTIVAL.every) ? {} : null;
  },
  caravan(world, id) {
    const N = CARD_NUMBERS.caravan;
    const start = Math.floor(draw(world, id, world.day, 'cardGood') * N.goods.length);
    for (let k = 0; k < N.goods.length; k++) {
      const good = N.goods[(start + k) % N.goods.length];
      const free = roomFor(world, good);
      if (free < N.roomMin) continue;
      const units = Math.min(free, pick(N.units, draw(world, id, world.day, 'cardAmount')));
      const price = Math.max(1, Math.round((GOOD_VALUE[good] || 3) * span(N.discount, draw(world, id + 1, world.day, 'cardAmount'))));
      return { good, units, price };
    }
    return null;
  },
  deserters(world, id) {
    const N = CARD_NUMBERS.deserters;
    return room(world) >= N.roomMin ? { n: pick(N.band, draw(world, id, world.day, 'cardAmount')) } : null;
  },
  temple_gift(world) {
    const N = CARD_NUMBERS.temple_gift;
    let best = null, bestStock = 0;
    for (const good of [...FOOD_GOODS, ...HOUSEHOLD_GOODS]) {
      const s = stockOf(world, good);
      if (s > bestStock) { best = good; bestStock = s; }
    }
    return best && bestStock >= N.stockMin ? { good: best, n: roundTo(bestStock * N.share, 5, N.min) } : null;
  },
  lost_herd: (world, id, hooks) => (hooks.canArrive(world) && hooks.canLeave(world) ? {} : null),
  craftsmen_dispute(world, id) {
    const list = workshops(world);
    return list.length ? { id: list[Math.floor(draw(world, id, world.day, 'cardPick') * list.length)].id } : null;
  },
  flood_omen: (world, id, hooks) => (hooks.canForecast(world) ? {} : null),
};

// The cards that can come now: [{ card, args }] in COURT_CARDS order. A threat card (sickness) is off on Peaceful.
export function eligibleCards(world, hooks = RIVER_HOOKS) {
  const id = world.court.nextId;
  const out = [];
  for (const card of COURT_CARDS) {
    if (card.threat && !threatsOn(world)) continue;
    const args = CARD_ARGS[card.id](world, id, hooks);
    if (args) out.push({ card: card.id, args });
  }
  return out;
}

// Whether a card letter no longer applies (its sickness has passed, its workshop is gone): the court drops it.
export function cardStale(world, letter) {
  if (letter.card === 'sickness') return sickIn(world, letter.args.cx, letter.args.cy).length === 0;
  if (letter.card === 'craftsmen_dispute') { const b = world.buildings[letter.args.id]; return !b || !BUILDINGS[b.type].consumes; }
  return false;
}

// The choices of a card letter as lists of effects, from the state as it is now: [{ id, effects, problem }]. problem (null when the
// choice can be made) is effectProblem's first reason.
export function cardChoices(world, letter, hooks = RIVER_HOOKS) {
  const a = letter.args || {};
  const cost = costScale(world);
  const choice = (id, effects) => ({ id, effects, problem: effects.map((e) => effectProblem(world, e, hooks)).find(Boolean) || null });
  switch (letter.card) {
    case 'sickness': {
      const sick = sickIn(world, a.cx, a.cy), N = CARD_NUMBERS.sickness;
      return [
        choice('quarantine', [{ kind: 'pause', ids: workplacesIn(world, a.cx, a.cy), days: N.quarantineDays }, { kind: 'faster', ids: sick, factor: HEALTH.coverFactor }]),
        choice('physicians', [{ kind: 'gold', n: -Math.max(N.feeMin, Math.round(N.feePerHome * sick.length * cost)) }, { kind: 'cure', ids: sick }]),
      ];
    }
    case 'festival':
      return [
        choice('hold', [{ kind: 'gold', n: -festivalCostOf(world) }, { kind: 'mood', n: FESTIVAL.mood, days: FESTIVAL.days, every: FESTIVAL.every }]),
        choice('decline', [{ kind: 'favour', n: -CARD_NUMBERS.festival.declineFavour }]),
      ];
    case 'caravan': {
      const units = Math.min(a.units, roomFor(world, a.good));
      return [choice('buy', [{ kind: 'gold', n: -units * a.price }, { kind: 'goods', good: a.good, n: units }]), choice('pass', [])];
    }
    case 'deserters': {
      const N = CARD_NUMBERS.deserters;
      return [choice('settle', [{ kind: 'people', n: Math.min(a.n, room(world)) }, { kind: 'favour', n: N.settleFavour }]), choice('drive_off', [{ kind: 'favour', n: N.driveFavour }])];
    }
    case 'temple_gift':
      return [choice('donate', [{ kind: 'goods', good: a.good, n: -a.n }, { kind: 'favour', n: CARD_NUMBERS.temple_gift.donateFavour }]), choice('keep', [])];
    case 'lost_herd':
      return [choice('welcome', [{ kind: 'herd', how: 'arrive' }]), choice('send_away', [{ kind: 'herd', how: 'leave' }, { kind: 'favour', n: CARD_NUMBERS.lost_herd.sendFavour }])];
    case 'craftsmen_dispute': {
      const N = CARD_NUMBERS.craftsmen_dispute;
      const wages = Math.max(N.raiseMin, Math.round(N.raiseShare * monthFigures(world).wages));
      return [choice('raise_wages', [{ kind: 'wages', perMonth: wages, months: N.raiseMonths }]), choice('let_it_stand', [{ kind: 'pause', ids: world.buildings[a.id] ? [a.id] : [], days: N.strikeDays }])];
    }
    case 'flood_omen':
      return [choice('pay_priests', [{ kind: 'forecast' }, { kind: 'gold', n: -Math.round(CARD_NUMBERS.flood_omen.price * cost) }]), choice('pass', [])];
    default: return [];
  }
}

// Why one effect cannot be carried out now, or null: 'no_gold' (the treasury would go below 0), 'short' (the stores hold less than it
// takes), 'no_room' (nowhere to put it), 'too_soon' (a festival was held less than a year ago), 'none' (nothing for it to act on) or 'unavailable' (the River track's hook cannot act).
export function effectProblem(world, e, hooks = RIVER_HOOKS) {
  switch (e.kind) {
    case 'gold': return e.n < 0 && world.gold + e.n < 0 ? 'no_gold' : null;
    case 'goods':
      if (e.n < 0) return stockOf(world, e.good) < -e.n ? 'short' : null;
      return e.n < 1 || roomFor(world, e.good) < e.n ? 'no_room' : null;
    case 'people': return e.n < 1 ? 'no_room' : null;
    case 'mood': return world.danger.festivalDay !== null && world.day - world.danger.festivalDay < e.every ? 'too_soon' : null;
    case 'pause': case 'faster': case 'cure': return e.ids.length ? null : 'none';
    case 'herd': return (e.how === 'arrive' ? hooks.canArrive(world) : hooks.canLeave(world)) ? null : 'unavailable';
    case 'forecast': return hooks.canForecast(world) ? null : 'unavailable';
    default: return null;
  }
}

function settleIn(world, n) {
  let left = n;
  for (const { h, free } of vacancies(world)) {
    if (left <= 0) break;
    const k = Math.min(left, free);
    if (h.tier === 0) h.tier = 1;
    h.residents += k;
    left -= k;
  }
  return n - left;
}

// Carries out a list of effects (see the header). The River track's hooks run first: if one cannot act, nothing else happens. Returns
// { ok, reason }.
export function applyEffects(world, effects, events = null) {
  const c = world.court;
  for (const e of effects) {
    if (e.kind === 'herd') {
      const herd = e.how === 'arrive' ? herdArrives(world, events) : herdLeaves(world, events);
      if (!herd) return fail('unavailable');
    } else if (e.kind === 'forecast' && !buyForecast(world).ok) return fail('unavailable');
  }
  for (const e of effects) {
    switch (e.kind) {
      case 'favour': addFavour(world, e.n); break;
      case 'gold': world.gold += e.n; break;
      case 'goods': if (e.n < 0) takeGoods(world, e.good, -e.n); else putGoods(world, e.good, e.n); break;
      case 'mood': world.danger.festivalDay = world.day; world.tally.festivals += 1; break;
      case 'pause': {
        const ids = e.ids.filter((id) => world.buildings[id] && !world.buildings[id].paused);
        for (const id of ids) world.buildings[id].paused = true;
        c.effects.push({ kind: 'pause', ids, until: world.day + e.days });
        break;
      }
      case 'faster': for (const id of e.ids) { const b = world.buildings[id]; if (b && b.illness) b.illness.left = Math.max(1, Math.ceil(b.illness.left / e.factor)); } break;
      case 'cure':
        for (const id of e.ids) {
          const b = world.buildings[id];
          if (b && b.illness) { b.illness = null; b.health = 0; world.tally.illnessesCured += 1; }
        }
        break;
      case 'people': settleIn(world, e.n); break;
      case 'wages': c.effects.push({ kind: 'wages', perMonth: e.perMonth, left: e.months }); break;
      default: break;   // herd and forecast ran above
    }
  }
  return { ok: true, reason: null };
}

// Answers a card letter with one of its choices: carries out the effects the choice lists (fails with the first problem, doing
// nothing), removes the letter and writes it into the card history.
export function answerCard(world, letterId, choiceId, events = null, hooks = RIVER_HOOKS) {
  const c = world.court;
  const letter = letterFor(world, letterId);
  if (!letter || letter.kind !== 'card') return fail('no_letter');
  const choice = cardChoices(world, letter, hooks).find((x) => x.id === choiceId);
  if (!choice) return fail('no_choice');
  if (choice.problem) return fail(choice.problem);
  const done = applyEffects(world, choice.effects, events);
  if (!done.ok) return done;
  removeLetter(world, letterId);
  c.cards.push({ id: letter.card, day: world.day, choice: choiceId });
  world.tally.cardsPlayed += 1;
  logPush(world, { kind: 'card', card: letter.card, choice: choiceId });
  if (events) events.push({ type: 'court_card', card: letter.card, choice: choiceId });
  return { ok: true, reason: null, effects: choice.effects };
}

// ── The days and months ──
function tryOpen(world) {
  const c = world.court;
  if (!atLeast(world, COURT.from)) return;
  if (!(world.goals.completed.includes(COURT.afterGoal) || atLeast(world, COURT.fallback))) return;
  c.awake = true;
  c.guided = 'pending';
  c.nextRequestDay = Math.max(world.day + COURT.guidedDelayDays, (REQUESTS.firstYear - 1) * DAYS_PER_YEAR);
  c.nextCardDay = world.day + pick(CARDS.gapMonths, draw(world, 0, world.day, 'cardGap')) * DAYS_PER_MONTH;
}

// Whether the court has opened.
export const courtOpen = (world) => world.court.awake === true;

function endEffects(world) {
  const c = world.court;
  if (!c.effects.length) return;
  const keep = [];
  for (const e of c.effects) {
    if (e.kind === 'pause' && world.day >= e.until) {
      for (const id of e.ids) if (world.buildings[id]) world.buildings[id].paused = false;
    } else keep.push(e);
  }
  if (keep.length !== c.effects.length) c.effects = keep;
}

function issueRequest(world, events) {
  const c = world.court;
  const guided = c.guided === 'pending';
  const r = createRequest(world, events, guided);
  if (!r) { c.nextRequestDay = world.day + CARDS.retryDays; return; }
  if (guided) c.guided = 'issued';
  c.nextRequestDay = world.day + pick(REQUESTS.gapMonths, draw(world, r.id, world.day, 'requestGap')) * DAYS_PER_MONTH;
}

function issueCard(world, events, hooks) {
  const c = world.court;
  if (world.raid.active) { c.nextCardDay = world.day + CARDS.raidRetryDays; return; }
  if (c.letters.some((l) => l.kind === 'card')) { c.nextCardDay = world.day + CARDS.retryDays; return; }
  const all = eligibleCards(world, hooks);
  if (!all.length) { c.nextCardDay = world.day + CARDS.retryDays; return; }
  const fresh = all.filter((e) => e.card !== c.lastCard);
  const pool = fresh.length ? fresh : all;
  const id = c.nextId;
  const chosen = pool[Math.floor(draw(world, id, world.day, 'cardPick') * pool.length)];
  c.nextId += 1;
  c.letters.push({ id, kind: 'card', card: chosen.card, day: world.day, read: false, args: chosen.args });
  c.lastCard = chosen.card;
  c.nextCardDay = world.day + pick(CARDS.gapMonths, draw(world, id, world.day, 'cardGap')) * DAYS_PER_MONTH;
  if (events) events.push({ type: 'court_letter', id, kind: 'card', card: chosen.card });
}

// One day of the court: the court opens when its conditions are met; running choices end; a request past its deadline is missed (favour
// falls by the number its letter named); a card whose cause has passed is dropped; the next request and card come when due.
export function courtDay(world, events = null, hooks = RIVER_HOOKS) {
  const c = world.court;
  if (!c.awake) { tryOpen(world); return; }
  endEffects(world);
  if (c.request && world.day >= c.request.due) {
    const r = c.request;
    const favour = addFavour(world, -r.missed);
    world.tally.requestsMissed += 1;
    resolveRequest(world, 'missed', favour, 0, events);
  }
  for (const l of c.letters.filter((x) => x.kind === 'card' && cardStale(world, x))) {
    removeLetter(world, l.id);
    if (events) events.push({ type: 'court_letter_gone', id: l.id, card: l.card });
  }
  if (c.nextRequestDay !== null && world.day >= c.nextRequestDay && !c.request) issueRequest(world, events);
  if (c.nextCardDay !== null && world.day >= c.nextCardDay) issueCard(world, events, hooks);
}

// The month's court work: wages raised by a dispute are paid; favour drifts one point toward FAVOUR.start; at high favour a gift comes
// every FAVOUR.giftEveryMonths months (gold, or a household good when the stores have room for it).
export function courtMonth(world, events = null) {
  const c = world.court;
  if (!c.awake) return;
  const keep = [];
  for (const e of c.effects) {
    if (e.kind !== 'wages') { keep.push(e); continue; }
    world.gold -= e.perMonth;
    if (e.left > 1) keep.push({ ...e, left: e.left - 1 });
  }
  c.effects = keep;
  if (c.favour > FAVOUR.start) c.favour = Math.max(FAVOUR.start, c.favour - FAVOUR.drift);
  else if (c.favour < FAVOUR.start) c.favour = Math.min(FAVOUR.start, c.favour + FAVOUR.drift);
  if (c.favour < FAVOUR.high) { c.nextGiftDay = null; return; }
  if (c.nextGiftDay === null) { c.nextGiftDay = world.day + FAVOUR.giftEveryMonths * DAYS_PER_MONTH; return; }
  if (world.day < c.nextGiftDay) return;
  c.nextGiftDay = world.day + FAVOUR.giftEveryMonths * DAYS_PER_MONTH;
  giveGift(world, events);
}

// The gift (see GIFTS): gold or a household good the city makes, seeded; a good with no room in the stores comes as its value in gold.
function giveGift(world, events) {
  const n = world.tally.gifts + 1;
  const taxes = monthFigures(world).taxes;
  const goldGift = () => roundTo(Math.max(taxes, GIFTS.gold.min) * span(GIFTS.gold.months, draw(world, n, world.day, 'giftAmount')), GIFTS.gold.step, GIFTS.gold.min);
  const goods = HOUSEHOLD_GOODS.filter((g) => outputPerMonth(world, g) > 0);
  let gift = null;
  if (goods.length && draw(world, n, world.day, 'giftKind') < 0.5) {
    const good = goods[Math.floor(draw(world, n, world.day, 'giftGood') * goods.length)];
    const amount = roundTo(outputPerMonth(world, good) * span(GIFTS.goods.months, draw(world, n, world.day, 'giftAmount')), GIFTS.goods.step, GIFTS.goods.min);
    if (roomFor(world, good) >= amount) { putGoods(world, good, amount); gift = { gold: 0, good, n: amount }; }
  }
  if (!gift) { const gold = goldGift(); world.gold += gold; gift = { gold, good: null, n: 0 }; }
  world.tally.gifts += 1;
  logPush(world, { kind: 'gift', gold: gift.gold, good: gift.good, n: gift.n });
  if (events) events.push({ type: 'court_gift', ...gift });
}

// ── Alerts (ruling 339) ──
// One alert for the letters waiting: the oldest letter not yet read ({ code: 'court_letter', letter: id, count: how many are unread }); or,
// once every letter is read, the open request's own letter within COURT.reminderMonths of its deadline ({ ..., due: true }). Ranked in
// the alert row below an active raid, an uncovered fire and a raid warning, and above debt (src/ui/alerts.js CRITICAL_RANK).
export function courtAlerts(world) {
  const c = world.court;
  if (!c.awake) return [];
  const unread = c.letters.filter((l) => !l.read);
  if (unread.length) return [{ code: 'court_letter', letter: unread[0].id, count: unread.length }];
  if (c.request && monthsLeft(world, c.request.due) <= COURT.reminderMonths) return [{ code: 'court_letter', letter: c.request.id, count: 1, due: true }];
  return [];
}
