// Version 7.0, the balance pass (wave 3): a steady player's answers to the city events, and the record of each one drawn. The long runs (the late run, the great-work run, the
// dangers-on runs: tests/stage47/pressure/lateRun.js, tests/v60/a/greatWorkRun.js, tests/v60/balance/dangerRuns.js) take `events: eventPlayer()` and call its onMonth(w, events, month)
// after the month end's own play (before the month-end hooks that read Advice), the way a player opens the card in the alert row and taps a choice (src/ui/v70/cityEvents.js:
// applyChoice with the effects the card showed). With `answer` off (the careless run) it only writes down what is drawn: every event waits out its months and takes its stated default.
//
// The habits (none is a rule changed; each is what the card says to a player who reads it, and each reads the sim's own numbers):
//   - a choice that costs gold is made when the price is a share of what the treasury holds beyond SPARE (a tenth; a quarter for the two that stop the quarries and the workshops
//     the great temple lives on: a strike or a quarrel costs more than its price), so the same event is bought off in a rich year and left to its default in a lean one;
//   - a choice that costs goods is made only when the stores keep what trade holds back for those goods (tradeRules.js heldBack: the player's Keep at least, the temple's stage,
//     the court's demands);
//   - a welcome kind's paid choice is taken when it adds something the city is short of: favour while the court's favour is under `high` (a tenth short of it for the feast), people
//     while the jobs outrun the workforce, the grain to the stores while the food held is thin, the festival's beer when the stores hold it.
// The record (rec.drawn): one row per event, { id, kind, offered, day, choice, default, result, gold } with the day it was offered, the day it was answered or lapsed, the choice
// taken, whether that is the kind's stated default, how it ended ('answered' | 'lapsed') and the gold its effects moved the treasury by.
import { eventChoices, applyChoice } from '../../../src/sim/cityEvents.js';
import { EVENT_DEFS } from '../../../src/data/cityEvents.js';
import { heldBack } from '../../../src/sim/tradeRules.js';
import { stockOf } from '../../../src/sim/court.js';
import { foodOutlook } from '../../../src/sim/crops.js';
import { FAVOUR } from '../../../src/data/court.js';

export const SPARE = 800;          // the treasury a paid choice leaves (the runs' own RESERVE is 400: events are not the plan's builds, so they keep twice that)
export const GREAT_SPARE = 15000;  // ... and while the great temple rises, what the crews' wages and the offerings still need: the great-work run's treasury is spent to under 8,000 in its last years
// What the treasury must keep after a paid choice: GREAT_SPARE from the founding of the great temple until it is finished, else SPARE.
export function spareOf(w) {
  const id = w.reign ? w.reign.greatWork : null, b = id === null || id === undefined ? null : w.buildings[id];
  return b && b.site && b.site.done === null ? GREAT_SPARE : SPARE;
}
const SHARE = 0.1;                 // a paid choice's price at most this share of the treasury beyond SPARE ...
const SHARE_STOPS = 0.25;          // ... a quarter when the event would stop the quarries or a workshop (the two kinds that stop work)
const FOOD_MONTHS = 6;

// The paid choices in the order a player prefers them, per kind: the first that `wants` says yes to and the card lets through. The default is always last (the card never refuses it).
const PREFER = {
  opet: ['full', 'small'],
  envoy: ['feast'],
  bumper: ['sell', 'store'],
  hoard: ['keep'],
  scribes: ['forgive'],
  healer: ['cure'],
  craftsman: ['settle'],
  pilgrims: ['lodge'],
  sandstorm: ['sweep'],
  fever: ['gate'],
  rumour: ['gift'],
  thief: ['watch'],
  feud: ['send_watch'],
  quarry_strike: ['raise_wages'],
  workshop_quarrel: ['settle_it'],
  lost_caravan: ['search'],
};
const STOPS = ['quarry_strike', 'workshop_quarrel'];

// Whether the player wants this choice now, beyond the card letting it through (ok) and the treasury keeping SPARE.
function wants(w, kind, choice) {
  switch (`${kind}:${choice.id}`) {
    case 'envoy:feast': return w.court.favour < FAVOUR.high;
    case 'scribes:forgive': return w.court.favour < FAVOUR.high - 10;
    case 'craftsman:settle': case 'pilgrims:lodge': return w.labour.jobs > w.labour.workforce;
    case 'bumper:sell': { const o = foodOutlook(w); return o.held >= 2 * FOOD_MONTHS * o.used; }
    default: return true;
  }
}

// Whether a choice's goods cost leaves the stores what trade holds back for those goods.
function goodsKept(w, choice) {
  return choice.effects.every((e) => e.kind !== 'goods' || e.n >= 0 || stockOf(w, e.good) + e.n >= heldBack(w, e.good).units);
}

export function pick(w, event, { spare = spareOf } = {}) {
  const keep = typeof spare === 'function' ? spare(w) : spare;
  const choices = eventChoices(w, event);
  const def = choices.find((c) => c.default);
  const share = STOPS.includes(event.kind) ? SHARE_STOPS : SHARE;
  for (const id of PREFER[event.kind] || []) {
    const c = choices.find((x) => x.id === id);
    if (!c) continue;
    if (c.default) { if (wants(w, event.kind, c)) return c; continue; }
    if (c.ok && w.gold - c.gold >= keep && c.gold <= share * (w.gold - keep) && goodsKept(w, c) && wants(w, event.kind, c)) return c;
  }
  return def;
}

const goldOf = (effects) => effects.reduce((n, e) => n + (e.kind === 'gold' ? e.n : 0), 0);

export function eventPlayer({ answer = true, spare = spareOf } = {}) {
  const rec = { drawn: [], answer };
  const open = new Map();                         // offer number -> its row
  const defaultOf = (kind) => EVENT_DEFS.find((d) => d.id === kind).default;
  const noteOffer = (w) => {
    const e = w.cityEvents.waiting;
    if (!e || open.has(e.id)) return;
    const row = { id: e.id, kind: e.kind, offered: e.day, due: e.due, day: null, choice: null, default: null, result: null, gold: 0 };
    open.set(e.id, row);
    rec.drawn.push(row);
  };
  function close(row, day, choice, result, effects) {
    Object.assign(row, { day, choice, default: choice === defaultOf(row.kind), result, gold: goldOf(effects || []) });
  }
  function onMonth(w, events) {
    // Lapses that happened inside the month just played (an event's default, taken on its due day).
    for (const e of events || []) {
      if (e.type !== 'city_event') continue;
      const row = [...open.values()].find((r) => r.kind === e.kind && r.result === null);
      if (row) close(row, row.due, e.choice, e.result === 'default' ? 'lapsed' : 'answered', e.effects);
    }
    noteOffer(w);
    const waiting = w.cityEvents.waiting;
    if (!waiting || !answer) return;
    const row = open.get(waiting.id);
    const c = pick(w, waiting, { spare });
    const r = applyChoice(w, waiting, c.id, null, c.effects);
    if (r.ok) close(row, w.day, c.id, 'answered', c.effects);
  }
  return { rec, onMonth };
}

// The kinds' ids, for the note and the tests.
export const KINDS = EVENT_DEFS.map((d) => d.id);
