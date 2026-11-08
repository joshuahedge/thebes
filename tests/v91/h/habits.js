// Version 9.1 Track H (design 7.1, rulings 1710, 1714-1718): the scripted players' habit for each heir's weakness. A balance run given `adapt` takes the
// heir's habit (heirHabit) and calls it at every month end after its own play, through the capital run's, the grand run's and the late and great-work
// runs' onMonth hooks. Each habit reads what a player reads (ruling 1540): the trait's line on the reign sheet, the palace sheet's taxes, the raid sheet,
// a workshop's sheet. The Steady has no habit (null), so every run with the Steady plays exactly as on 9.0.
//   builder      taxes x0.95: once the great temple is founded (the work its taxes must carry), the palace's High rate while the treasury holds under
//                TAXES.highBelow months of Normal-rate taxes, back to Normal at TAXES.normalAt (a palace laid, far from the homes, when there is none)
//   unconquered  the first warning 100 days sooner: every warned raid met with towers where each band strikes first (the late run's meetWarning),
//                from the capital years on
//   merchant     workshops x0.85: one more workshop of a kind for each that falls short, so the city keeps round(n / 0.85) where the script laid n,
//                each on the nearest free spot by one of them with its input and a store for its goods in reach (what its sheet's confirm bar checks)
//   bountiful, generous: none. Their weaknesses never bite in these runs (no balance map has a floodplain, and no script sets High: ruling 1717).
// The habit never builds on ground a script will want (scriptClaims: the capital script's steps, the great-work run's temple plot and streets), so the
// scripts' own steps all still go where they always went.
import { meetWarning } from '../../stage47/pressure/lateRun.js';
import { CAPITAL_SCRIPT } from '../../stage4/balance/capitalRun.js';
import { palaceOf, setTaxRate, taxRateOf } from '../../../src/sim/palace.js';
import { place, canPlace } from '../../../src/sim/commands.js';
import { undo } from '../../../src/sim/undo.js';
import { costOf } from '../../../src/sim/costs.js';
import { buildingsInReach } from '../../../src/sim/reach.js';
import { storeAccepts } from '../../../src/sim/production.js';
import { GREAT_WORK } from '../../../src/data/reign.js';
import { allBuildings, housesOf } from '../../../src/sim/world.js';
import { heirFactor } from '../../../src/sim/dynasty.js';
import { BUILDINGS } from '../../../src/data/buildings.js';
import { PALACE } from '../../../src/data/palace.js';

const RESERVE = 400;
export const TAXES = { highBelow: 1, normalAt: 2 };   // months of Normal-rate taxes in the treasury
const NEAR = 8;                                       // a workshop's twin goes within this many tiles of it

// Ground the scripts will build on: { x, y, w, d }. The capital script's buildings and the lines of its roads and plots, and the great-work run's temple
// plot (tests/v60/a/greatWorkRun.js TEMPLE_PLOT) and its two streets (layStreet, layNorthStreet: x 8-25, y 4-10).
const rectOf = (s) => {
  if (s.line) { const [x0, y0, x1, y1] = s.line; return { x: Math.min(x0, x1), y: Math.min(y0, y1), w: Math.abs(x1 - x0) + 1, d: Math.abs(y1 - y0) + 1 }; }
  if (s.type) { const def = BUILDINGS[s.type] || { w: 2, d: 2 }; return { x: s.x, y: s.y, w: def.w, d: def.d }; }
  return null;
};
let claims = null;   // made on first use (capitalRun.js imports this file, so CAPITAL_SCRIPT is not there yet when it loads)
export const scriptClaims = () => claims || (claims = [...CAPITAL_SCRIPT.map(rectOf).filter(Boolean), { x: 33, y: 26, w: 10, d: 9 }, { x: 8, y: 4, w: 18, d: 7 }]);
const claimed = (x, y, w, d) => scriptClaims().some((c) => x < c.x + c.w && x + w > c.x && y < c.y + c.d && y + d > c.y);

// The free spot for a building of type that a road touches and no script claims: the nearest to `by` within NEAR tiles, or (by null) the one farthest
// from any home, as the spending player lays its palace. null when there is none.
export function spotFor(w, type, by = null) {
  const def = BUILDINGS[type], homes = by ? [] : housesOf(w).map((h) => ({ x: h.x + h.w / 2, y: h.y + h.d / 2 }));
  let best = null;
  const [x0, x1, y0, y1] = by ? [by.x - NEAR, by.x + NEAR, by.y - NEAR, by.y + NEAR] : [0, w.size - 1, 0, w.size - 1];
  for (let y = Math.max(0, y0); y <= Math.min(w.size - 1, y1); y++) for (let x = Math.max(0, x0); x <= Math.min(w.size - 1, x1); x++) {
    if (claimed(x, y, def.w, def.d) || !canPlace(w, type, x, y).ok) continue;
    const score = by ? -Math.hypot(x - by.x, y - by.y) : homes.reduce((n, h) => Math.min(n, Math.hypot(h.x - x - def.w / 2, h.y - y - def.d / 2)), Infinity);
    if (!best || score > best.score) best = { x, y, score };
  }
  return best;
}

function builderHabit() {
  const rec = { high: 0, normal: 0, palace: null };
  const onMonth = (w) => {
    const month = w.stats.lastMonth.taxesNormal, rate = taxRateOf(w);
    if (!(month > 0) || !allBuildings(w).some((b) => b.type === GREAT_WORK.type)) return;
    if (rate !== 'high' && w.gold < TAXES.highBelow * month) {
      let p = palaceOf(w);
      if (!p && w.gold - costOf(w, PALACE.type) >= RESERVE) {
        const s = spotFor(w, PALACE.type);
        const r = s ? place(w, PALACE.type, s.x, s.y) : null;
        if (r && r.ok) { p = w.buildings[r.id]; rec.palace = { day: w.day, x: s.x, y: s.y }; }
      }
      if (p && setTaxRate(w, p.id, 'high').ok) rec.high++;
    } else if (rate === 'high' && w.gold >= TAXES.normalAt * month && setTaxRate(w, palaceOf(w).id, 'normal').ok) rec.normal++;
  };
  return { heir: 'builder', rec, onMonth };
}

function unconqueredHabit() {
  const rec = { towers: [] };
  return { heir: 'unconquered', rec, onMonth: (w) => { meetWarning(w, rec.towers); } };
}

// One workshop of type beside `by`, kept only if its input and a store for its goods are in its reach (else taken back, fully refunded). Returns it or null.
function twin(w, type, by) {
  const def = BUILDINGS[type];
  if (w.gold - costOf(w, type) < RESERVE || w.labour.workforce - w.labour.jobs < def.workers) return null;
  const s = spotFor(w, type, { x: by.x, y: by.y });
  if (!s) return null;
  const before = w.undo.length;
  const r = place(w, type, s.x, s.y);
  if (!r.ok) return null;
  const b = w.buildings[r.id];
  const fed = buildingsInReach(w, b, def.producerReach, (o) => (o.store[def.consumes] || 0) > 0).length > 0;
  const stored = buildingsInReach(w, b, def.producerReach, (o) => o.id !== b.id && storeAccepts(o, def.produces.good)).length > 0;
  if (fed && stored) return b;
  while (w.undo.length > before) undo(w);
  return null;
}

function merchantHabit() {
  const rec = { built: [] };
  const mine = new Set();                       // the workshops the habit laid (not the script's)
  const onMonth = (w) => {
    const factor = heirFactor(w, 'workshops');
    const byType = {};
    for (const b of allBuildings(w)) {
      const def = BUILDINGS[b.type];
      if (!def.consumes || !def.produces) continue;
      const t = (byType[b.type] = byType[b.type] || { laid: [], extra: 0 });
      if (mine.has(b.id)) t.extra++; else t.laid.push(b);
    }
    for (const [type, t] of Object.entries(byType)) {
      if (!t.laid.length || t.extra >= Math.round(t.laid.length / factor) - t.laid.length) continue;
      const b = twin(w, type, t.laid[t.extra % t.laid.length]);
      if (b) { mine.add(b.id); rec.built.push({ day: w.day, type, x: b.x, y: b.y }); }
    }
  };
  return { heir: 'merchant', rec, onMonth };
}

const HABITS = { builder: builderHabit, unconquered: unconqueredHabit, merchant: merchantHabit };

// The heir's habit, a fresh one each call ({ heir, rec, onMonth(w, events, month) }), or null: the Steady, the Bountiful and the Generous.
export const heirHabit = (heir) => (HABITS[heir] ? HABITS[heir]() : null);

// Two month-end hooks as one (either may be null).
export const both = (a, b) => (a && b ? (w, events, m) => { a(w, events, m); b(w, events, m); } : a || b || null);
