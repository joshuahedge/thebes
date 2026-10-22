// Version 6.0, Track B1 (rulings 680-699): plague, drought and the low Nile, locusts and blight, and what raiders do when they get through. Track
// 0 (contract, docs/superpowers/notes/2026-10-22-version-6-0-contract.md) fixed the names and shapes here; this file is the hub: the day's and
// the month's hooks (src/sim/v60.js), the alerts and the advice, with the dangers themselves in plague.js, crops.js and strikes.js (and the draws
// every one shares in draws.js). Nothing here reads the clock or Math.random: every draw is hash2(a, b, (world.seed + HAZARD_SALT.x) | 0)
// (src/data/hazards.js), so a city's dangers are its seed's.
//
// State: world.hazards = { graceUntil, plague, drought, locusts } (newHazardState); each kind { warning, active, nextDay, last }.
// Every danger shows its warning (an alert and its Advice item, hazardAlerts and hazardItems) before it strikes, and none acts before
// graceUntil.
//
// Events (pushed into the clock's events array; never saved): { type: 'plague_warning', id, strikes }, 'plague_start' { id }, 'plague_spread'
// { id, cause }, 'plague_end' { homes, lost }, 'quarantine_end' { key }, 'drought_warning' { strikes, year }, 'drought_start' { until, factor },
// 'drought_end', 'locusts_warning' { kind, farms, strikes }, 'locusts_strike' { kind, farms, until, factor }, 'locusts_end' { kind }; and the
// raid strikes' 'raid_wreck' and 'raid_loot' (src/sim/strikes.js).
import { HAZARD_ADVICE, DROUGHT } from '../data/hazards.js';
import { BUILDINGS } from '../data/buildings.js';
import { allBuildings } from './world.js';
import { healthCause, healthCoverage } from './health.js';
import { costOf } from './costs.js';
import { canAfford } from './money.js';
import { isUnlocked } from './progression.js';
import { plagueDay, plagueMonth, sickHomes, quarantines } from './plague.js';
import { droughtDay, droughtMonth, locustsDay, locustsMonth, foodOutlook } from './crops.js';
import { HEALTH } from '../data/health.js';
import { FOOD_GOODS } from '../data/goods.js';
import { monthsBetween } from './draws.js';

export { dangerDraws } from './draws.js';

// A day of the dangers, after the court's day (src/sim/v60.js v60Day): a warning that has come due strikes, a plague spreads and mends, a
// drought or a swarm runs its course.
export function hazardDay(world, events = null) {
  plagueDay(world, events);
  droughtDay(world, events);
  locustsDay(world, events);
}

// The month's end (v60Month): the draws and their warnings (never before graceUntil: dangerDraws), the Nile reading's low flood.
export function hazardMonth(world, events = null) {
  plagueMonth(world, events);
  droughtMonth(world, events);
  locustsMonth(world, events);
}

const centreOf = (b) => ({ x: b.x + b.w / 2, y: b.y + b.d / 2 });
const standing = (world, ids) => (ids || []).filter((id) => world.buildings[id]);

// The dangers' alerts (src/sim/alerts.js through v60Alerts), warnings and never criticals: each warning, then each danger under way. Codes (words:
// ALERT_TEXT in src/ui/text.js's v60 b1 section): plague_warning { id: the home it starts in, arrives }, plague { id, ids, count: the sick homes },
// drought_warning { arrives }, drought { until }, locusts_warning { id, ids, kind, arrives } (the band's farms still standing), locusts { id, ids, kind, until }.
export function hazardAlerts(world) {
  const out = [], h = world.hazards;
  if (h.plague.warning && world.buildings[h.plague.warning.origin]) out.push({ code: 'plague_warning', id: h.plague.warning.origin, arrives: h.plague.warning.strikes });
  if (h.plague.active) {
    const ids = sickHomes(world).map((b) => b.id);
    if (ids.length) out.push({ code: 'plague', id: ids[0], ids, count: ids.length });
  }
  if (h.drought.warning) out.push({ code: 'drought_warning', arrives: h.drought.warning.strikes });
  if (h.drought.active) out.push({ code: 'drought', until: h.drought.active.until });
  const lw = h.locusts.warning;
  if (lw) {
    const ids = standing(world, lw.farms);
    if (ids.length) out.push({ code: 'locusts_warning', id: ids[0], ids, kind: lw.kind, arrives: lw.strikes });
  }
  const la = h.locusts.active;
  if (la) {
    const ids = standing(world, la.farms);
    if (ids.length) out.push({ code: 'locusts', id: ids[0], ids, kind: la.kind, until: la.until });
  }
  return out;
}

// ── The advice ──
const item = (key, kind, weight, count, id, data, fixed = { fix: null, cost: null, afford: null }) => ({ key, kind, weight: Math.round(weight * 100) / 100, count, id, data, ...fixed });

// The fix that puts a physician where a home has none: a physician near it (unlocked, none reaches it), or the service that reaches it but is short
// of workers, paused or burning; null when the home is covered (or nothing can be offered).
function physicianFix(world, home) {
  const c = healthCause(world, home);
  if (c.cause === 'none' && isUnlocked(world, 'physician')) {
    const cost = costOf(world, 'physician');
    return { fix: { item: 'physician', at: 'near', target: centreOf(home) }, cost, afford: canAfford(world, cost) };
  }
  const s = c.service !== null && c.service !== undefined ? world.buildings[c.service] : null;
  if (s && ['short', 'paused', 'burning'].includes(c.cause)) return { fix: { select: s.id, target: centreOf(s), why: c.cause }, cost: null, afford: null };
  return { fix: null, cost: null, afford: null };
}

// How many months short the stores are in a drought, and the stores' room: the data the drought's words say (foodOutlook is the sim's own count).
function droughtData(world) {
  const h = world.hazards.drought, o = foodOutlook(world);
  const monthsShort = o.short > 0 && !o.carries ? Math.ceil((o.need - o.held) / o.short) : 0;
  let capacity = 0;
  for (const b of allBuildings(world)) if (BUILDINGS[b.type].stores && BUILDINGS[b.type].stores.some((g) => FOOD_GOODS.includes(g))) capacity += BUILDINGS[b.type].capacity;
  return {
    warned: Boolean(h.warning), strikes: h.warning ? h.warning.strikes : null, until: h.active ? h.active.until : null, year: (h.warning || h.active).year,
    months: DROUGHT.months, ...o, monthsShort, capacity,
  };
}

// The dangers' advice items (src/sim/advice.js cityAdvice through v60Advice): onto `out`, kinds 'plague', 'drought' and 'locusts' (ADVICE_KINDS).
export function hazardItems(world, alerts, out) {
  const h = world.hazards;
  // Plague: the warning names the home it will start in (the counter is a physician there, a well, room); once under way, the sick homes.
  if (h.plague.warning) {
    const w = h.plague.warning, home = world.buildings[w.origin];
    if (home) {
      const f = physicianFix(world, home);
      out.push(item('plague:warned', 'plague', HAZARD_ADVICE.plagueWarned, 1, home.id, { warned: true, strikes: w.strikes, days: Math.max(0, w.strikes - world.day), cause: healthCause(world, home).cause }, f.fix ? f : { fix: { select: home.id, target: centreOf(home), why: 'plague' }, cost: null, afford: null }));
    }
  }
  if (h.plague.active) {
    const sick = sickHomes(world);
    if (sick.length) {
      const cover = healthCoverage(world);
      const open = sick.filter((b) => (cover.get(b.id) || 0) < HEALTH.staffedAt);
      const first = open[0] || sick[0];
      const held = quarantines(world);
      out.push(item('plague:active', 'plague', open.length * HAZARD_ADVICE.plagueHome + (sick.length - open.length), sick.length, first.id,
        { warned: false, sick: sick.length, uncovered: open.length, lost: h.plague.active.lost, quarantined: held.size, cause: healthCause(world, first).cause },
        { fix: { select: first.id, target: centreOf(first), why: 'plague' }, cost: null, afford: null }));
    }
  }
  // Drought: the Nile reading's warning, then the lean year; the stores either carry the city or do not.
  if (h.drought.warning || h.drought.active) {
    const d = droughtData(world);
    const weight = d.carries ? HAZARD_ADVICE.droughtCovered : HAZARD_ADVICE.droughtWarned + HAZARD_ADVICE.droughtShortMonth * d.monthsShort;
    let fixed;
    if (!d.carries && isUnlocked(world, 'granary') && d.capacity > 0 && d.held >= 0.7 * d.capacity) {
      const cost = costOf(world, 'granary'), at = world.focus;
      fixed = { fix: { item: 'granary', at: 'near', target: { x: at.x + 0.5, y: at.y + 0.5 } }, cost, afford: canAfford(world, cost) };
    }
    out.push(item(`drought:${d.warned ? 'warned' : 'active'}`, 'drought', weight, 1, null, d, fixed));
  }
  // Locusts and blight: the band's farms; a farm's sheet has Harvest now while they are warned.
  const lw = h.locusts.warning;
  if (lw) {
    const farms = standing(world, lw.farms);
    if (farms.length) {
      const todo = farms.filter((id) => !(lw.early || []).includes(id));
      const first = world.buildings[todo[0] || farms[0]];
      out.push(item('locusts:warned', 'locusts', farms.length * HAZARD_ADVICE.locustFarm, farms.length, first.id,
        { warned: true, kind: lw.kind, farms: farms.length, early: farms.length - todo.length, strikes: lw.strikes, days: Math.max(0, lw.strikes - world.day) },
        todo.length ? { fix: { select: first.id, target: centreOf(first), why: 'harvest' }, cost: null, afford: null } : undefined));
    }
  }
  const la = h.locusts.active;
  if (la) {
    const farms = standing(world, la.farms);
    if (farms.length) out.push(item('locusts:active', 'locusts', farms.length * HAZARD_ADVICE.cropBlight, farms.length, farms[0],
      { warned: false, kind: la.kind, farms: farms.length, days: Math.max(0, la.until - world.day), factor: la.factor }));
  }
}

// Whole months until a day, for the words ("in 2 months": rounded up, at least 1 while it is ahead).
export const monthsTo = (world, day) => monthsBetween(world.day, day);
