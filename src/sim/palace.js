// The palace (spec 4.20, rulings 271-275): one per city, enlarged one style at a time. Stage 4 contract: complete in
// Track 0, because the palace sheet (Track C) and the score through mood read these rules; Track A owns the file after
// and may refine, never change, the behaviour. The palace's state is on its building: style (PALACE_STYLES index) and
// works (null, or { style: the style being built, left: game days to go }).
//
// Events: { type: 'palace_done', id, style } the day the works end (palaceDay). Enlarging is a command, so the interface
// learns of it from enlargePalace's result, not from an event.
import { PALACE_STYLES, PALACE } from '../data/palace.js';
import { allBuildings } from './world.js';
import { touchesRoad } from './reach.js';
import { atLeast } from './progression.js';
import { palacePriceOf, canPayNoDebt } from './costs.js';
import { spend } from './money.js';

const fail = (reason, extra = {}) => ({ ok: false, reason, warnings: [], ...extra });

// The city's palace, or null.
export const palaceOf = (world) => allBuildings(world).find((b) => b.type === PALACE.type) || null;

// What Enlarge the palace would do now: { next (the style index it would become, or null at the last), price, days, ok,
// reason }. reason, the first that applies: 'not_palace', 'works' (works already under way), 'last_style', 'locked' (the
// next style's milestone not reached; milestone names it), 'no_road', 'no_gold' (paying would take the treasury below 0).
export function palaceQuote(world, id) {
  const b = world.buildings[id];
  if (!b || b.type !== PALACE.type) return { next: null, price: 0, days: 0, ok: false, reason: 'not_palace' };
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
// no undo entry). { ok: true, warnings: [], style, price, days }, or fails with palaceQuote's reason.
export function enlargePalace(world, id) {
  const q = palaceQuote(world, id);
  if (!q.ok) return fail(q.reason);
  const b = world.buildings[id];
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
