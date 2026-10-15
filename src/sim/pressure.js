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

// What the year's quota would ask now (ruling 469): [{ good, base }], up to QUOTA.goods goods from QUOTA_POOL, those the city made (or traded
// for) most of by value last year, each with a year's output of at least QUOTA.least, base = QUOTA.share (by difficulty) of it, rounded.
export function quotaAsk(world) {
  const share = QUOTA.share[world.difficulty] ?? QUOTA.share.normal;
  const rows = QUOTA_POOL.map((good, i) => ({ good, i, out: yearOutput(world, good) }))
    .filter((r) => r.out >= QUOTA.least)
    .sort((a, b) => b.out * (GOOD_VALUE[b.good] || 1) - a.out * (GOOD_VALUE[a.good] || 1) || a.i - b.i)
    .slice(0, QUOTA.goods);
  return rows.sort((a, b) => a.i - b.i).map((r) => ({ good: r.good, base: roundTo(r.out * share, QUOTA.step, QUOTA.min), out: Math.round(r.out) }));
}

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
  if (world.day % DAYS_PER_YEAR !== 0) { quotaReminder(world, events); return; }
  const c = world.court;
  const year = dateOfDay(world.day).year;
  const carry = endQuotaYear(world, events);
  if (courtOpen(world) && year >= QUOTA.fromYear) askQuota(world, carry, events);
  if (courtOpen(world)) c.yearMade = { day: world.day, made: { ...(world.tally.made || {}) } };   // a closed court keeps no record (it asks nothing)
  if (events && year === QUOTA.warnYear && courtOpen(world)) events.push({ type: 'quota_warning', year: QUOTA.fromYear });
  if (events && year === RAIDS_LATE.warnYear && raidsOn(world)) {
    events.push({ type: 'raids_grow', year: RAIDS_LATE.fromYear, cap: RAIDS_LATE.cap[world.difficulty] || 0, goldPer: RAIDS_LATE.goldPer, peoplePer: RAIDS_LATE.peoplePer });
  }
}
