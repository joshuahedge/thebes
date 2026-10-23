// Stage 4.7, Task 7 (rulings 469-471): late-game pressure. This file holds the yearly tribute quota (ruling 469) and the two warnings a year
// ahead; the raids' wealth term is in src/sim/raids.js (wealthDraw) and the tougher upper tiers in src/data/housing.js (threeFoods, use).
// The quota is the court's (ruling 349's ownership: the court's favour, stores and gifts are src/sim/court.js's, called from here), kept in
// world.court.quota, with the year's production snapshot in world.court.yearMade. No draw is used: the quota is worked out from the city's
// own records, so a reload changes nothing.
//
// pressureMonth runs at every month's end (runMonth, after the court's month). At a year's start (the month end that begins it):
//   1. an open quota whose year has ended is missed: favour - QUOTA.favourMissed, its shortfall noted to carry once;
//   2. from QUOTA.fromYear, with the court open, the new year's quota is asked (sized from last year's output, see quotaAsk);
//   3. the year's snapshot of tally.made is taken (last year's output is its rise);
//   4. the warnings a year ahead: at QUOTA.warnYear (court open) { type: 'quota_warning' }, at RAIDS_LATE.warnYear (raids on) { type: 'raids_grow' }.
// Events: { type: 'court_quota', result: 'asked' | 'met' | 'missed', quota, favour, gift, early }, { type: 'quota_warning', year },
// { type: 'raids_grow', year, cap, goldPer, peoplePer }.
import { QUOTA, RAIDS_LATE } from '../data/s47.js';
import { GOOD_VALUE, COURT } from '../data/court.js';
import { FOOD_SLOTS, FOOD_GOODS, HOUSEHOLD_GOODS } from '../data/goods.js';
import { courtOpen, addFavour, favourChange, stockOf, takeGoods, outputPerMonth, monthsLeft, dateOfDay } from './court.js';
import { raidsOn } from './costs.js';
import { DAYS_PER_MONTH, MONTHS_PER_YEAR } from './time.js';
import { COURT_DUE, GREAT_WORK } from '../data/reign.js';
import { GRACE_DAYS } from '../data/hazards.js';
import { DIFFICULTIES } from '../data/difficulty.js';
import { favourBand } from './court.js';
import { monthFigures } from './economy.js';
import { allBuildings, isSite } from './world.js';

const DAYS_PER_YEAR = DAYS_PER_MONTH * MONTHS_PER_YEAR;
const roundTo = (n, step, min = 0) => Math.max(min, Math.round(n / step) * step);
const fail = (reason, extra = {}) => ({ ok: false, reason, ...extra });

// The goods a quota may name, in the order ties go: the household goods, then the foods.
export const QUOTA_POOL = [...HOUSEHOLD_GOODS, ...FOOD_SLOTS.filter((g) => FOOD_GOODS.includes(g))];

// The quota open now (asked, met or missed this year), or null.
export const quotaOf = (world) => world.court.quota || null;
// Whether the yearly quota has begun for this city: the court is open and the year is QUOTA.fromYear or later.
export const quotaYearOn = (world, day = world.day) => dateOfDay(day).year >= QUOTA.fromYear;

// Last year's output of a good (ruling 469): tally.made's rise since the snapshot taken a year ago (scaled to a year if the snapshot is older
// or newer). With a snapshot the quota asks only what the city really made (a good it made none of is not asked); with no snapshot (an old
// save in its first year back) the court's outputPerMonth x 12 (a working producer's output, or an open route's yearly quota for a good the
// city only trades for) stands in.
export function yearOutput(world, good) {
  const y = world.court.yearMade;
  const made = (world.tally.made && world.tally.made[good]) || 0;
  if (y && world.day > y.day) return Math.max(0, (made - (y.made[good] || 0)) * (DAYS_PER_YEAR / (world.day - y.day)));
  return outputPerMonth(world, good) * MONTHS_PER_YEAR;
}

// The most a good's stores held at any month end this year (ruling 480: a quota asks only goods that rest in the stores; farms fill the granary and the
// bazaars empty it again, so the year's output alone can be far more than a store ever held). court.yearMade.kept[good], kept by pressureMonth;
// with no such record (an old save, or a snapshot from before it) what the stores hold now.
export function keptOf(world, good) {
  const y = world.court.yearMade;
  return y && y.kept ? y.kept[good] || 0 : stockOf(world, good);
}
function keepStock(world) {
  const y = world.court.yearMade;
  if (!y) return;
  if (!y.kept) y.kept = {};
  for (const good of QUOTA_POOL) y.kept[good] = Math.max(y.kept[good] || 0, stockOf(world, good));
}

// What the year's quota would ask now (ruling 469): [{ good, base }], up to QUOTA.goods goods from QUOTA_POOL, those the city made (or traded
// for) most of by value last year, each with a year's output of at least QUOTA.least, base = QUOTA.share (by difficulty) of it, rounded, and never more than the stores held (ruling 480: keptOf, askOf; a good whose stores never held QUOTA.min is not asked).
export function quotaAsk(world) {
  const share = QUOTA.share[world.difficulty] ?? QUOTA.share.normal;
  const rows = QUOTA_POOL.map((good, i) => ({ good, i, out: yearOutput(world, good), kept: keptOf(world, good) }))
    .filter((r) => r.out >= QUOTA.least && r.kept >= QUOTA.min)
    .sort((a, b) => b.out * (GOOD_VALUE[b.good] || 1) - a.out * (GOOD_VALUE[a.good] || 1) || a.i - b.i)
    .slice(0, QUOTA.goods);
  return rows.sort((a, b) => a.i - b.i).map((r) => ({ good: r.good, base: askOf(r.out * share, r.kept), out: Math.round(r.out) }));
}

// A good's ask: its share of the year's output rounded to QUOTA.step (at least QUOTA.min) as ever, but when that is more than the stores held, what they
// held rounded down to the step (still at least QUOTA.min: a good whose stores never held that much is not asked at all).
const askOf = (want, kept) => { const base = roundTo(want, QUOTA.step, QUOTA.min); return base <= kept ? base : Math.max(QUOTA.min, Math.floor(kept / QUOTA.step) * QUOTA.step); };

// The gift a met quota pays (fixed when it is asked): QUOTA.giftShare of the quota's value, rounded.
const giftFor = (goods) => roundTo(QUOTA.giftShare * goods.reduce((n, g) => n + g.amount * (GOOD_VALUE[g.good] || 1), 0), QUOTA.giftStep, QUOTA.giftMin);

// Asks the year's quota (the first day of the year): the ask, plus last year's shortfall carried once. null when nothing can be asked.
function askQuota(world, carry, events) {
  const ask = quotaAsk(world);
  const goods = ask.map((a) => ({ good: a.good, base: a.base, carried: carry[a.good] || 0, sent: 0 }));
  for (const [good, n] of Object.entries(carry)) if (n > 0 && !goods.some((g) => g.good === good)) goods.push({ good, base: 0, carried: n, sent: 0 });
  for (const g of goods) g.amount = g.base + g.carried;
  if (!goods.length) return null;
  const day = world.day;
  const year = dateOfDay(day).year;
  const quota = { year, day, due: day + DAYS_PER_YEAR, early: day + QUOTA.early * DAYS_PER_MONTH - 1, gift: giftFor(goods), goods, result: null, metDay: null };
  world.court.quota = quota;
  if (events) events.push({ type: 'court_quota', result: 'asked', quota: JSON.parse(JSON.stringify(quota)), favour: 0, gift: quota.gift, early: false });
  return quota;
}

// The quota's own figures for the court sheet and the Send button: per good { good, amount, base, carried, sent, left, have, ship } (ship: what
// a Send now would take from the stores), the share sent (0..1), monthsLeft to the deadline, earlyLeft (months still early, 0 once past),
// shipNow (the units a Send would ship), completes (a Send now meets it), favour (what meeting it now would add), gift, missFavour (what
// missing it would take, favour being kept inside its range), carry (what a miss would carry into next year), due; null with no quota.
export function quotaStatus(world, q = quotaOf(world)) {
  if (!q) return null;
  const goods = q.goods.map((g) => {
    const left = Math.max(0, g.amount - g.sent);
    const have = stockOf(world, g.good);
    return { ...g, left, have, ship: Math.min(left, have) };
  });
  const total = goods.reduce((n, g) => n + g.amount, 0);
  const sent = goods.reduce((n, g) => n + Math.min(g.sent, g.amount), 0);
  const shipNow = goods.reduce((n, g) => n + g.ship, 0);
  const completes = q.result === null && goods.every((g) => g.ship >= g.left);
  const early = world.day <= q.early;
  return {
    year: q.year, result: q.result, metDay: q.metDay, goods, share: total ? sent / total : 1, total, sent,
    monthsLeft: monthsLeft(world, q.due), earlyLeft: early ? monthsLeft(world, q.early + 1) : 0, early,
    shipNow, completes, favour: favourChange(world, early ? QUOTA.favourEarly : QUOTA.favourMet), favourLate: favourChange(world, QUOTA.favourMet), gift: q.gift,
    missFavour: favourChange(world, -QUOTA.favourMissed), carry: carryIfMissed(q), due: q.due,
  };
}

// Send (ruling 469): ships from the stores what they hold of each good still owed (as a request takes its goods, lowest building id first),
// up to what is owed. Meeting the whole quota adds QUOTA.favourEarly by the end of month QUOTA.early, else QUOTA.favourMet, and pays the
// gift. Fails with 'none' (no quota open), 'done' (met or missed already) or 'empty' (the stores hold none of what is owed).
export function sendQuota(world, events = null) {
  const q = quotaOf(world);
  if (!q) return fail('none');
  if (q.result !== null) return fail('done');
  const st = quotaStatus(world, q);
  if (st.shipNow <= 0) return fail('empty');
  const shipped = {};
  for (const g of q.goods) {
    const n = takeGoods(world, g.good, Math.min(Math.max(0, g.amount - g.sent), stockOf(world, g.good)));
    g.sent += n;
    if (n > 0) shipped[g.good] = n;
  }
  const met = q.goods.every((g) => g.sent >= g.amount);
  if (!met) return { ok: true, reason: null, shipped, met: false, favour: 0, gift: 0, early: false };
  const early = world.day <= q.early;
  const favour = addFavour(world, early ? QUOTA.favourEarly : QUOTA.favourMet);
  world.gold += q.gift;
  world.tally.quotasMet += 1;
  q.result = 'met';
  q.metDay = world.day;
  logQuota(world, 'met', favour, q.gift);
  if (events) events.push({ type: 'court_quota', result: 'met', quota: JSON.parse(JSON.stringify(q)), favour, gift: q.gift, early });
  return { ok: true, reason: null, shipped, met: true, favour, gift: q.gift, early };
}

function logQuota(world, result, favour, gold) {
  const c = world.court;
  if (!Array.isArray(c.log)) return;
  const q = c.quota;
  c.log.push({ day: world.day, kind: 'quota', result, year: q.year, goods: q.goods.map((g) => ({ good: g.good, amount: g.amount, sent: g.sent })), favour, gold });
  if (c.log.length > COURT.logMax) c.log.splice(0, c.log.length - COURT.logMax);
}

// The year's end for an open quota: missed when not met. Returns what carries into next year (each good's own ask not shipped; a carried part
// is never carried again: the sent units go to the carried part first).
function endQuotaYear(world, events) {
  const q = quotaOf(world);
  const carry = {};
  if (!q || world.day < q.due) return carry;
  if (q.result === null) {
    q.result = 'missed';
    const favour = addFavour(world, -QUOTA.favourMissed);
    world.tally.quotasMissed += 1;
    Object.assign(carry, carryIfMissed(q));
    logQuota(world, 'missed', favour, 0);
    if (events) events.push({ type: 'court_quota', result: 'missed', quota: JSON.parse(JSON.stringify(q)), favour, gift: 0, early: false, carry });
  }
  world.court.quota = null;
  return carry;
}

// What a missed quota would carry, said before the year ends (the court sheet's "if missed" line): { [good]: n }.
export function carryIfMissed(q) {
  const carry = {};
  if (!q) return carry;
  for (const g of q.goods) {
    const short = Math.max(0, g.base - Math.max(0, g.sent - g.carried));
    if (short > 0) carry[g.good] = short;
  }
  return carry;
}

// The day the next quota is asked: the first day of the next year from QUOTA.fromYear (the court must be open then), or null on a city whose
// court is closed. While a quota is open it is the day after it ends.
export function nextQuotaDay(world) {
  if (!courtOpen(world)) return null;
  const nextYearStart = (Math.floor(world.day / DAYS_PER_YEAR) + 1) * DAYS_PER_YEAR;
  return Math.max(nextYearStart, (QUOTA.fromYear - 1) * DAYS_PER_YEAR);
}

// The reminders (ruling 469): at the month ends 3 months and 1 month before an open, unmet quota is due, { type: 'quota_reminder', months, owed }
// (owed: what is still owed, [{ good, left }]).
function quotaReminder(world, events) {
  const q = quotaOf(world);
  if (!events || !q || q.result !== null || world.day >= q.due) return;
  const months = monthsLeft(world, q.due);
  if (months !== 3 && months !== 1) return;
  if (world.day !== q.due - months * DAYS_PER_MONTH) return;
  const owed = q.goods.map((g) => ({ good: g.good, left: Math.max(0, g.amount - g.sent) })).filter((g) => g.left > 0);
  if (owed.length) events.push({ type: 'quota_reminder', months, owed });
}

// At every month's end (runMonth): the year's work on the month end that begins a year (see the head of this file).
export function pressureMonth(world, events = null) {
  keepStock(world);
  if (world.day % DAYS_PER_YEAR !== 0) { quotaReminder(world, events); return; }
  const c = world.court;
  const year = dateOfDay(world.day).year;
  const carry = endQuotaYear(world, events);
  if (courtOpen(world) && year >= QUOTA.fromYear) takeDue(world, events);   // Version 6.0 (ruling 642): the court's due, after a missed tribute's favour
  if (courtOpen(world) && year >= QUOTA.fromYear) askQuota(world, carry, events);
  if (courtOpen(world)) { c.yearMade = { day: world.day, made: { ...(world.tally.made || {}) }, kept: {} }; keepStock(world); }   // a closed court keeps no record (it asks nothing)
  if (events && year === QUOTA.warnYear && courtOpen(world)) events.push({ type: 'quota_warning', year: QUOTA.fromYear });
  if (events && year === RAIDS_LATE.warnYear && raidsOn(world)) {
    events.push({ type: 'raids_grow', year: RAIDS_LATE.fromYear, cap: RAIDS_LATE.cap[world.difficulty] || 0, goldPer: RAIDS_LATE.goldPer, peoplePer: RAIDS_LATE.peoplePer });
  }
}

// ── Version 6.0, Track A (rulings 642, 643): the court's due ──
// On the first day of each year from QUOTA.fromYear (the court open), with the yearly tribute's goods, the court takes its due in gold: the
// rank's share of the treasury or its share of a year's taxes at this month's rate, whichever is more (COURT_DUE), times favour's factor and
// the difficulty's cost, cut to COURT_DUE.greatWork (a twentieth) while the great work is under way and to COURT_DUE.inDebt (nothing: ruling 788) while it rises with the treasury
// below 0; rounded to COURT_DUE.step. Otherwise it is taken even past 0 (the city goes into debt), so the court sheet, the alert row and Advice say it COURT_DUE.warnMonths
// ahead. A city loaded from a version 8 save owes nothing before a year from its load day (ruling 789: dueFromDay).
// courtDue(world) is what it would take now: { gold, treasuryShare, taxesShare, fromTreasury, fromTaxes, yearTaxes, by ('treasury' | 'taxes'),
// band (favour's), factor, greatWork (cut to COURT_DUE.greatWork), inDebt (greatWork with the treasury below 0: nothing owed), cost (the difficulty's), day (the day it is next
// taken, or null: the court is closed), monthsLeft }.
const dueRank = (table, world) => table[world.milestone] || 0;
export const greatWorkRising = (world) => allBuildings(world).some((b) => b.type === GREAT_WORK.type && isSite(b));
// The first day a due may be taken (ruling 789): a city loaded from a version 8 save (hazards.graceUntil is its load day + GRACE_DAYS) owes its first due a year after
// that load, so a save loaded a month before a year's start is not billed at once; 0 for a new city (and for a test world whose grace was moved to the future or
// the past, which has no load day).
export function dueFromDay(world) {
  const load = world.hazards.graceUntil - GRACE_DAYS;
  return load > 0 && load <= world.day ? load + DAYS_PER_YEAR : 0;
}
// The next day the due is taken: the next year's start, or the first one on or after dueFromDay; null while the court is closed.
export function nextDueDay(world) {
  const day = nextQuotaDay(world), from = dueFromDay(world);
  return day === null || from <= day ? day : Math.ceil(from / DAYS_PER_YEAR) * DAYS_PER_YEAR;
}
export function courtDue(world) {
  const taxesShare = dueRank(COURT_DUE.taxes, world), treasuryShare = dueRank(COURT_DUE.treasury, world);
  const yearTaxes = monthFigures(world).taxes * MONTHS_PER_YEAR;
  const fromTreasury = treasuryShare * Math.max(0, world.gold), fromTaxes = taxesShare * yearTaxes;
  const band = favourBand(world), factor = COURT_DUE.favour[band], cost = DIFFICULTIES[world.difficulty].cost;
  const greatWork = greatWorkRising(world), inDebt = greatWork && world.gold < 0;
  const base = Math.max(fromTreasury, fromTaxes);
  const gold = roundTo(base * factor * cost * (inDebt ? COURT_DUE.inDebt : greatWork ? COURT_DUE.greatWork : 1), COURT_DUE.step);
  const day = nextDueDay(world);
  return {
    gold, treasuryShare, taxesShare, fromTreasury: Math.round(fromTreasury), fromTaxes: Math.round(fromTaxes), yearTaxes, by: fromTreasury >= fromTaxes ? 'treasury' : 'taxes',
    band, factor, greatWork, inDebt, cost, day, monthsLeft: day === null ? null : monthsLeft(world, day),
  };
}
// Whether the due is coming: the court is open and the next day it is taken is in a year the due is taken.
export const dueComing = (world) => courtOpen(world) && dateOfDay(nextDueDay(world)).year >= QUOTA.fromYear;
// Takes the due (pressureMonth, at a year's start): logged in the court's letters and pushed as { type: 'court_due', gold, by, band, greatWork }.
function takeDue(world, events) {
  if (world.day < dueFromDay(world)) return;   // a v8 city's first year back (ruling 789)
  const d = courtDue(world);
  if (d.gold <= 0) return;
  world.gold -= d.gold;
  const c = world.court;
  if (Array.isArray(c.log)) {
    c.log.push({ day: world.day, kind: 'due', gold: d.gold, by: d.by, band: d.band });
    if (c.log.length > COURT.logMax) c.log.splice(0, c.log.length - COURT.logMax);
  }
  if (events) events.push({ type: 'court_due', gold: d.gold, by: d.by, band: d.band, greatWork: d.greatWork });
}
