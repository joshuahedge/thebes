// The palace (spec 4.20, rulings 271-275): one per city, enlarged one style at a time. Stage 4 contract: complete in
// Track 0, because the palace sheet (Track C) and the score through mood read these rules; Track A owns the file after
// and may refine, never change, the behaviour. The palace's state is on its building: style (PALACE_STYLES index) and
// works (null, or { style: the style being built, left: game days to go }).
//
// Events: { type: 'palace_done', id, style } the day the works end (palaceDay). Enlarging is a command, so the interface
// learns of it from enlargePalace's result, not from an event.
import { PALACE_STYLES, PALACE, TAX_RATES } from '../data/palace.js';
import { allBuildings } from './world.js';
import { touchesRoad } from './reach.js';
import { atLeast } from './progression.js';
import { palacePriceOf, canPayNoDebt } from './costs.js';
import { spend } from './money.js';
import { heirHighFactor } from './dynasty.js';

const fail = (reason, extra = {}) => ({ ok: false, reason, warnings: [], ...extra });

// The city's palace, or null.
export const palaceOf = (world) => allBuildings(world).find((b) => b.type === PALACE.type) || null;

// What Enlarge the palace would do now: { next (the style index it would become, or null at the last), price, days, ok,
// reason }. reason, the first that applies: 'not_palace', 'works' (works already under way), 'last_style', 'locked' (the
// next style's milestone not reached; milestone names it), 'no_road', 'no_gold' (paying would take the treasury below 0).
export function palaceQuote(world, id) {
  const b = world.buildings[id];
  if (!b || b.type !== PALACE.type) return { next: null, price: 0, days: 0, milestone: null, ok: false, reason: 'not_palace' };
  const next = b.style < PALACE.lastStyle ? b.style + 1 : null;
  const style = next === null ? null : PALACE_STYLES[next];
  const quote = { next, price: next === null ? 0 : palacePriceOf(world, next), days: style ? style.days : 0, milestone: style ? style.milestone : null };
  let reason = null;
  if (b.works) reason = 'works';
  else if (next === null) reason = 'last_style';
  else if (!atLeast(world, style.milestone)) reason = 'locked';
  else if (!touchesRoad(world, b)) reason = 'no_road';
  else if (!canPayNoDebt(world, quote.price)) reason = 'no_gold';
  return { ...quote, ok: !reason, reason };
}

// The enlargePalace command (spec 7.3): pays the next style's price in full and starts its works. Not undoable (it pushes
// no undo entry), and once enlarged the palace's own placing can no longer be undone either: its 'place' entry is dropped,
// so Undo cannot remove the palace and lose the enlargement's gold and works with it.
// { ok: true, warnings: [], style, price, days }, or fails with palaceQuote's reason.
export function enlargePalace(world, id) {
  const q = palaceQuote(world, id);
  if (!q.ok) return fail(q.reason);
  const b = world.buildings[id];
  const stack = world.undo || [];
  for (let i = stack.length - 1; i >= 0; i--) if (stack[i].kind === 'place' && (stack[i].ids || []).includes(id)) stack.splice(i, 1);
  spend(world, q.price);
  b.works = { style: q.next, left: q.days };
  world.tally.enlargements += 1;
  return { ok: true, warnings: [], style: q.next, price: q.price, days: q.days };
}

// The daily step (tickDay): the works count down on game time; when they end the palace takes the new style.
export function palaceDay(world, events = null) {
  for (const b of allBuildings(world)) {
    if (b.type !== PALACE.type || !b.works) continue;
    b.works.left = Math.max(0, b.works.left - 1);
    if (b.works.left > 0) continue;
    b.style = b.works.style;
    b.works = null;
    if (events) events.push({ type: 'palace_done', id: b.id, style: b.style });
  }
}

// The Palace mood row (spec 4.9): its style's mood while a road touches it, else 0 (no palace, 0).
export function palaceMood(world) {
  const b = palaceOf(world);
  return b && touchesRoad(world, b) ? PALACE_STYLES[b.style].mood : 0;
}

// ── Version 8.4, Track G: the tax rate (design 2a, rulings 1465, 1466) ──
// The rate lives on the palace (palace.tax: 'low' or 'high'; absent is Normal), so demolishing the palace sets it back to Normal and a city with
// no palace is always at Normal. It works through the month's taxes (src/sim/economy.js monthFigures) and the Taxes mood row (src/sim/mood.js).

// The rate in force: the palace's, or 'normal' with no palace or none set.
const isRate = (rate) => typeof rate === 'string' && Object.prototype.hasOwnProperty.call(TAX_RATES, rate);
export function taxRateOf(world) {
  const b = palaceOf(world);
  return b && isRate(b.tax) ? b.tax : 'normal';
}

// Version 9.0 (Track D, ruling 1567): a rate's factor on the month's taxes (TAX_RATES'), but High takes the heir of the Generous's own (src/sim/dynasty.js
// heirHighFactor: x1.15, not x1.25). economy.js monthFigures and the palace's Taxes row both read it, so the choices say what the month will take.
export function taxFactorOf(world, rate = taxRateOf(world)) {
  const r = isRate(rate) ? rate : 'normal';
  const high = r === 'high' ? heirHighFactor(world) : null;
  return high === null ? TAX_RATES[r].factor : high;
}

// The Taxes mood row: the rate's mood (+8 Low, -8 High, 0 Normal). Unlike the Palace row it asks for no road: taxes are gathered anyway.
export const taxMood = (world) => TAX_RATES[taxRateOf(world)].mood;

// The setTaxRate command: sets the palace's rate. Needs no gold and is not undoable (a rate is changed back the same way).
// { ok: true, warnings: [], rate } or fails with 'not_palace' (id is no palace) or 'bad_rate' (not a key of TAX_RATES).
export function setTaxRate(world, id, rate) {
  const b = world.buildings[id];
  if (!b || b.type !== PALACE.type) return fail('not_palace');
  if (!isRate(rate)) return fail('bad_rate');
  if (rate === 'normal') delete b.tax;
  else b.tax = rate;
  return { ok: true, warnings: [], rate };
}
