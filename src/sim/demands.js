// Version 6.0, Track A (rulings 640-679): the court's demands with deadlines, and the reign's end. Track 0 (contract,
// docs/superpowers/notes/2026-10-22-version-6-0-contract.md) fixed the names and shapes here; Track A implements them. Draws are
// hash2(a, b, (world.seed + REIGN_SALT.x) | 0) (src/data/reign.js), a = the demand's id, b = the day: no Math.random, Date or clock.
//
// State: world.demands = { open, nextDay, nextId, log } and world.reign = { greatWork, won, closed, seal, offered } (src/data/reign.js).
//
// The demands (rulings 644-650): from Town, about once a game year (DEMANDS.gapMonths after the last offer, settled or not, the first DEMANDS.firstMonths
// after the city's first month end at Town or later), the court offers one demand: goods, gold, a building or soldiers. Every number is on
// the record from the moment it is offered (the amount, the deadline it would have, the reward and the favour won, lost or refused: ruling
// 612), so the sheet says each before Accept. An offer waits DEMANDS.offerMonths, then lapses as declined. Accepted, it is met by Send
// (goods leave the stores, gold the treasury, units go to the capital for DEMANDS.amounts.soldiers.months) or, for a building, by one more
// of it standing than when it was accepted (a monument finished); its deadline passing fails it. Favour (src/sim/court.js) moves the
// court's due and the raids (src/sim/pressure.js courtDue, court.js favourRaidSize). One demand at a time.
//
// Events (pushed into the events array; never saved): { type: 'demand_offered', demand }, { type: 'demand_accepted', demand },
// { type: 'demand_settled', result: 'met' | 'failed' | 'refused', demand, favour, gold }, { type: 'reign_won', day, seal }.
import { DAYS_PER_MONTH } from './time.js';
import { DEMANDS, DEMAND_KINDS, REIGN_SALT, GREAT_WORK, COURT_DUE } from '../data/reign.js';
import { GOOD_VALUE } from '../data/court.js';
import { HOUSEHOLD_GOODS, RAW_GOODS } from '../data/goods.js';
import { BUILDINGS } from '../data/buildings.js';
import { MONUMENTS } from '../data/monuments.js';
import { DIFFICULTIES } from '../data/difficulty.js';
import { hash2 } from './rng.js';
import { allBuildings, isFinished } from './world.js';
import { atLeast, isUnlocked } from './progression.js';
import { costScale, costOf } from './costs.js';
import { monthFigures } from './economy.js';
import { addFavour, favourChange, stockOf, takeGoods, outputPerMonth } from './court.js';
import { unitsAtHome, sendUnits } from './armies.js';
import { courtDue, dueComing } from './pressure.js';
import { sealReign } from './score.js';
import { offeringsMade, offeringOf, storedOf, offeringSource } from './monuments.js';
import { canAfford } from './money.js';


const draw = (world, a, b, salt) => hash2(a, b, (world.seed + REIGN_SALT[salt]) | 0);
const pick = ([lo, hi], u) => lo + Math.min(hi - lo, Math.floor(u * (hi - lo + 1)));   // a whole number in [lo, hi]
const span = ([lo, hi], u) => lo + (hi - lo) * u;
const roundTo = (n, step, min = 0) => Math.max(min, Math.round(n / step) * step);
const fail = (reason, extra = {}) => ({ ok: false, reason, ...extra });
const unitsHome = (world) => Object.values(unitsAtHome(world)).reduce((a, b) => a + b, 0);
const copy = (d) => JSON.parse(JSON.stringify(d));

// The demands the court has open, oldest first, each the record in world.demands.open with monthsLeft (whole game months to its
// deadline, rounded up; 0 once due): what the court sheet, the alert row and the advice read (ruling 612: every demand says its reward
// and its failure cost before it is accepted, so Track A keeps both on the record). A copy: changing it changes nothing. While a demand
// is only offered, `due` is the day the offer lapses, so monthsLeft is the time left to answer.
export const courtDemands = (world) => world.demands.open.map((d) => ({ ...d, monthsLeft: Math.max(0, Math.ceil((d.due - world.day) / DAYS_PER_MONTH)) }));

// The great work's building (world.reign.greatWork), or null while none is founded (or it is gone).
export const greatWorkOf = (world) => (world.reign.greatWork === null ? null : world.buildings[world.reign.greatWork] || null);

// Whether the reign is won (the great work finished): the city plays on after.
export const reignWon = (world) => world.reign.won !== null;

// Whether the court makes demands of this city yet: from DEMANDS.from (Town), never of the guided first city (world.lesson, src/sim/lesson.js).
export const demandsOn = (world) => !world.lesson && atLeast(world, DEMANDS.from);

// ── What a demand can ask ──
// The goods it may name: household and raw goods the city makes (or trades for), as the court's goods requests.
export const demandGoods = (world) => [...HOUSEHOLD_GOODS, ...RAW_GOODS].filter((g) => outputPerMonth(world, g) > 0);
const goldCap = (world) => { const A = DEMANDS.amounts.gold; return Math.floor((Math.max(0, world.gold) * A.reserve) / A.step) * A.step; };
const countOf = (world, type) => allBuildings(world).filter((b) => b.type === type && (!BUILDINGS[type].monument || isFinished(b))).length;
// The months a building takes to finish with its kind's most crews and full supply (a monument: crewMonths / crews; any other building is up the day it
// is placed, so 0). A building demand's deadline never runs shorter than this plus DEMANDS.buildSlackMonths, so the court never asks the impossible.
export const buildMonths = (type) => (MONUMENTS[type] ? MONUMENTS[type].crewMonths / MONUMENTS[type].crews : 0);
export const buildFitsDeadline = (type) => buildMonths(type) + DEMANDS.buildSlackMonths <= DEMANDS.deadlineMonths.building[0];
// The building it may name: the grandest of DEMANDS.buildings the city may build now (unlocked) that fits the shortest building deadline, or null.
export function demandBuilding(world) {
  const ok = DEMANDS.buildings.filter((t) => BUILDINGS[t] && buildFitsDeadline(t) && isUnlocked(world, t));
  return ok.length ? ok[ok.length - 1] : null;
}
// The kinds the court may ask now, in DEMAND_KINDS order.
function demandKinds(world) {
  return DEMAND_KINDS.filter((k) => {
    if (k === 'goods') return demandGoods(world).length > 0;
    if (k === 'gold') return goldCap(world) >= DEMANDS.amounts.gold.min && monthFigures(world).taxes > 0;
    if (k === 'building') return demandBuilding(world) !== null;
    return unitsHome(world) >= DEMANDS.amounts.soldiers.min + 1;
  });
}
const scaleOf = (world) => costScale(world).court * DIFFICULTIES[world.difficulty].cost;

// Draws the demand the court would offer now (not stored), or null when it can ask nothing.
function drawDemand(world, id) {
  const kinds = demandKinds(world);
  if (!kinds.length) return null;
  const day = world.day, u = (salt) => draw(world, id, day, salt);
  const kind = kinds[Math.floor(u('demandKind') * kinds.length)];
  const A = DEMANDS.amounts, R = DEMANDS.rewards;
  let good = null, type = null, amount = 1, reward;
  if (kind === 'goods') {
    const goods = demandGoods(world);
    good = goods[Math.floor(u('demandGood') * goods.length)];
    amount = roundTo(outputPerMonth(world, good) * span(A.goods.months, u('demandAmount')) * scaleOf(world), A.goods.step, A.goods.min);
    reward = roundTo(amount * (GOOD_VALUE[good] || 3) * span(R.goods, u('demandReward')), R.step, R.min);
  } else if (kind === 'gold') {
    amount = Math.min(goldCap(world), roundTo(monthFigures(world).taxes * span(A.gold.months, u('demandAmount')) * scaleOf(world), A.gold.step, A.gold.min));
    reward = roundTo(amount * span(R.gold, u('demandReward')), R.step, R.min);
  } else if (kind === 'building') {
    type = demandBuilding(world);
    reward = roundTo(costOf(world, type) * span(R.building, u('demandReward')), R.step, R.min);
  } else {
    const total = unitsHome(world);
    amount = Math.max(A.soldiers.min, Math.min(total - 1, Math.round(total * span(A.soldiers.share, u('demandAmount')))));
    reward = Math.max(R.min, amount * R.soldier);
  }
  const F = DEMANDS.favour;
  return {
    id, kind, good, type, amount, reward, day, accepted: false,
    offerDue: day + DEMANDS.offerMonths * DAYS_PER_MONTH, due: day + DEMANDS.offerMonths * DAYS_PER_MONTH,
    months: pick(DEMANDS.deadlineMonths[kind], u('demandDeadline')),
    met: pick(F.met, u('demandFavour')), failed: pick(F.failed, u('demandFailed')), declined: F.declined,
    had: null,
  };
}

// The favour each answer would really move now (favour stays inside its range: src/sim/court.js favourChange).
export const demandFavour = (world, d) => ({ met: favourChange(world, d.met), failed: favourChange(world, -d.failed), declined: favourChange(world, -d.declined) });

// Whether an accepted demand can be met now: { ok, reason, have, need, monthsLeft }. reason: 'short' (the stores hold less), 'no_gold',
// 'raid' (units cannot leave during a raid), 'not_enough' (fewer units at home), 'building' (met on its own once one more stands),
// 'offered' (not yet accepted).
export function demandStatus(world, d) {
  if (!d) return { ok: false, reason: 'none', have: 0, need: 0, monthsLeft: 0 };
  const monthsLeft = Math.max(0, Math.ceil((d.due - world.day) / DAYS_PER_MONTH));
  const out = (ok, reason, have, need) => ({ ok, reason: ok ? null : reason, have, need, monthsLeft });
  if (d.kind === 'goods') { const have = stockOf(world, d.good); return out(d.accepted && have >= d.amount, d.accepted ? 'short' : 'offered', have, d.amount); }
  if (d.kind === 'gold') return out(d.accepted && world.gold >= d.amount, d.accepted ? 'no_gold' : 'offered', Math.max(0, world.gold), d.amount);
  if (d.kind === 'soldiers') {
    const home = unitsHome(world);
    const reason = !d.accepted ? 'offered' : world.raid.active ? 'raid' : home < d.amount ? 'not_enough' : null;
    return out(reason === null, reason, home, d.amount);
  }
  const have = Math.max(0, countOf(world, d.type) - (d.had === null ? countOf(world, d.type) : d.had));
  return out(false, d.accepted ? 'building' : 'offered', have, 1);
}

const findOpen = (world, id) => world.demands.open.find((d) => d.id === id) || null;
function settle(world, d, result, favour, gold, events) {
  const s = world.demands;
  s.open = s.open.filter((x) => x.id !== d.id);
  s.log.push({ id: d.id, kind: d.kind, result, day: world.day, good: d.good, type: d.type, amount: d.amount, favour, gold });
  if (s.log.length > DEMANDS.logMax) s.log.splice(0, s.log.length - DEMANDS.logMax);
  if (result === 'met') world.tally.demandsMet += 1;
  else world.tally.demandsFailed += 1;
  if (events) events.push({ type: 'demand_settled', result, demand: copy(d), favour, gold });
}
function met(world, d, events) {
  const favour = addFavour(world, d.met);
  world.gold += d.reward;
  settle(world, d, 'met', favour, d.reward, events);
  return { ok: true, reason: null, favour, gold: d.reward };
}

// ── The commands (the court sheet's buttons) ──
// Accept: the deadline starts (DEMANDS.deadlineMonths drawn when it was offered); a building's count is noted. Fails: 'none', 'accepted'.
export function acceptDemand(world, id, events = null) {
  const d = findOpen(world, id);
  if (!d) return fail('none');
  if (d.accepted) return fail('accepted');
  d.accepted = true;
  d.due = world.day + d.months * DAYS_PER_MONTH;
  if (d.kind === 'building') d.had = countOf(world, d.type);
  if (events) events.push({ type: 'demand_accepted', demand: copy(d) });
  return { ok: true, reason: null, due: d.due };
}
// Decline an offer (or give up an accepted demand: then it fails, with its own favour): favour falls by the number the sheet named.
export function declineDemand(world, id, events = null) {
  const d = findOpen(world, id);
  if (!d) return fail('none');
  const favour = addFavour(world, -(d.accepted ? d.failed : d.declined));
  settle(world, d, d.accepted ? 'failed' : 'refused', favour, 0, events);
  return { ok: true, reason: null, favour, gold: 0 };
}
// Send what an accepted demand asks (goods, gold or units): favour rises and the reward is paid. Fails with demandStatus's reason.
export function meetDemand(world, id, events = null) {
  const d = findOpen(world, id);
  if (!d) return fail('none');
  const st = demandStatus(world, d);
  if (!st.ok) return fail(st.reason);
  if (d.kind === 'goods') takeGoods(world, d.good, d.amount);
  else if (d.kind === 'gold') world.gold -= d.amount;
  else if (d.kind === 'soldiers') {
    const sent = sendUnits(world, d.amount, DEMANDS.amounts.soldiers.months * DAYS_PER_MONTH, events);
    if (!sent.ok) return fail(sent.reason);
  }
  return met(world, d, events);
}

// ── The days and months ──
// A day of the demands (src/sim/v60.js v60Day): an offer left unanswered lapses (declined); an accepted building demand is met once one
// more stands; a deadline passing fails a demand. Then the reign: the great work's building is noted, and the day it is finished the reign
// is won (reign.won, the sealed score: src/sim/score.js sealReign with won: true).
export function demandDay(world, events = null) {
  for (const d of [...world.demands.open]) {
    if (!d.accepted && world.day >= d.due) { settle(world, d, 'refused', addFavour(world, -d.declined), 0, events); continue; }
    if (!d.accepted) continue;
    if (d.kind === 'building' && countOf(world, d.type) > d.had) { met(world, d, events); continue; }
    if (world.day >= d.due) settle(world, d, 'failed', addFavour(world, -d.failed), 0, events);
  }
  reignDay(world, events);
}

function reignDay(world, events) {
  const r = world.reign;
  if (!greatWorkOf(world)) {
    const gw = allBuildings(world).find((b) => b.type === GREAT_WORK.type);
    if (gw && r.greatWork !== gw.id) { r.greatWork = gw.id; r.offered = 0; }
  }
  const gw = greatWorkOf(world);
  if (r.won !== null || !gw || !isFinished(gw)) return;
  r.won = world.day;
  r.seal = sealReign(world, { won: true }).seal;
  if (events) events.push({ type: 'reign_won', day: world.day, seal: copy(r.seal) });
}

// The month's end (v60Month): the first demand is scheduled once the city is a Town (DEMANDS.firstMonths on: a migrated city's too), and an
// offer is made when one is due and none is open (the next DEMANDS.gapMonths after it). Nothing before Town.
export function demandMonth(world, events = null) {
  if (!demandsOn(world)) return;
  const s = world.demands;
  if (s.nextDay === null) { s.nextDay = world.day + DEMANDS.firstMonths * DAYS_PER_MONTH; return; }
  if (world.day < s.nextDay || s.open.length) return;
  const d = drawDemand(world, s.nextId);
  if (!d) { s.nextDay = world.day + DAYS_PER_MONTH; return; }   // nothing to ask yet: a month on
  s.nextId += 1;
  s.open.push(d);
  s.nextDay = world.day + pick(DEMANDS.gapMonths, draw(world, d.id, world.day, 'demandGap')) * DAYS_PER_MONTH;   // the next one's clock starts at this offer (ruling 794), not when it is settled
  if (events) events.push({ type: 'demand_offered', demand: copy(d) });
}

// The demands' alerts (src/sim/alerts.js through v60Alerts), warnings in the list (never the banner): 'demand_offered' while an offer waits
// for an answer; 'demand_due' when an accepted demand not yet ready is DEMANDS.reminderMonths or less from its deadline; 'court_due' when
// the court's due comes within COURT_DUE.warnMonths and the treasury holds less than it would take.
export function demandAlerts(world) {
  const out = [];
  for (const d of courtDemands(world)) {
    if (!d.accepted) out.push({ code: 'demand_offered', demand: d.id });
    else if (d.monthsLeft <= DEMANDS.reminderMonths && !demandStatus(world, d).ok) out.push({ code: 'demand_due', demand: d.id, months: d.monthsLeft });
  }
  const due = dueWarning(world);
  if (due) out.push({ code: 'court_due', gold: due.gold, months: due.monthsLeft, short: due.gold - Math.max(0, world.gold) });
  return out;
}
// The court's due when it comes within COURT_DUE.warnMonths and the treasury holds less than it would take, else null.
export function dueWarning(world) {
  if (!dueComing(world)) return null;
  const d = courtDue(world);
  return d.monthsLeft !== null && d.monthsLeft <= COURT_DUE.warnMonths && d.gold > 0 && d.gold > world.gold ? d : null;   // nothing owed (ruling 788) is nothing to warn of
}

// The demands' advice items (cityAdvice through v60Advice), kind 'demand' (ADVICE_KINDS), weights DEMANDS.advice: an offer waiting for an
// answer, an accepted demand not yet ready (more as its deadline nears), and the court's due the treasury cannot pay. The fix selects the
// store that holds the good (or the barracks), else opens the summary's court (the interface opens the demand's own sheet).
export function demandItems(world, alerts, out) {
  const A = DEMANDS.advice;
  for (const d of courtDemands(world)) {
    const st = demandStatus(world, d);
    if (d.accepted && st.ok) continue;
    const weight = d.accepted ? A.open + Math.max(0, A.perMonth * (DEMANDS.reminderMonths + 1 - d.monthsLeft)) : A.offered;
    out.push(item(world, `demand:${d.id}`, weight, d, { status: st }));
  }
  const due = dueWarning(world);
  if (due) out.push({ key: 'court_due', kind: 'demand', weight: A.due, count: 1, id: null, data: { due: true, gold: due.gold, monthsLeft: due.monthsLeft, have: world.gold }, fix: { view: 'summary', section: 'forecast', target: null }, cost: null, afford: null });
  offeringItem(world, out);
}
// Version 6.0 (Wave 4 fix, ruling 786): the great temple's next offering while the stores hold less than it asks, raised from the course before its stage begins (so the
// player has the course's time to stock up) and while the crews wait. The fix selects the store holding most of the good, else (none holds any) builds the good's producer.
function offeringItem(world, out) {
  const gw = greatWorkOf(world);
  if (!gw || !gw.site || gw.site.done !== null) return;
  const stage = offeringsMade(world, gw), o = offeringOf(world, stage);
  if (!o || gw.site.course < stage * GREAT_WORK.perStage - 1) return;
  const have = storedOf(world, o.good);
  if (have >= o.n) return;
  const src = offeringSource(world, o.good), store = src.store === null ? null : world.buildings[src.store];
  const buildable = src.producer && BUILDINGS[src.producer] && isUnlocked(world, src.producer);
  const fix = store ? { select: store.id, target: { x: store.x + store.w / 2, y: store.y + store.d / 2 }, why: 'great_offering' }
    : buildable ? { item: src.producer, at: BUILDINGS[src.producer].terrain ? 'terrain' : 'near', target: { x: gw.x + gw.w / 2, y: gw.y + gw.d / 2 } } : null;
  const cost = fix && fix.item ? costOf(world, fix.item) : null;
  out.push({ key: 'great_offering', kind: 'demand', weight: DEMANDS.advice.offering, count: 1, id: null,
    data: { offering: true, good: o.good, n: o.n, have, stage, waiting: gw.site.reason === 'waiting_offering', producer: src.producer, held: store !== null }, fix, cost, afford: cost === null ? null : canAfford(world, cost) });
}
function item(world, key, weight, d, extra) {
  const anchor = d.kind === 'goods' ? allBuildings(world).find((b) => (BUILDINGS[b.type].stores || []).includes(d.good) && (b.store[d.good] || 0) > 0)
    : d.kind === 'soldiers' ? allBuildings(world).find((b) => b.type === 'barracks') : null;
  const fix = anchor ? { select: anchor.id, target: { x: anchor.x + anchor.w / 2, y: anchor.y + anchor.d / 2 }, why: 'demand' } : { view: 'summary', section: 'forecast', target: null };
  return { key, kind: 'demand', weight: Math.round(weight * 100) / 100, count: 1, id: null, data: { demand: d.id, kind: d.kind, good: d.good, type: d.type, amount: d.amount, accepted: d.accepted, monthsLeft: d.monthsLeft, ...extra }, fix, cost: null, afford: null };
}
