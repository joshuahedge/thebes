// Version 8.2 Track G: a scripted city for any layout (no balance run before 8.2 plays a map other than its own fixed one). A steady player who lays out
// the same town on any map, from the map's own start: a street through the start area and more streets beside it as the homes fill, homes along
// them, then everything else where the city's own advice and Show me lead (the grand run's act: a build where the ghost lands, a road routed to it,
// a store beside a maker that has none), at most a few things a month, keeping a reserve. No dangers or city events (the balance runs' own
// grace), the court left alone. Returns the milestones' months and the people each year, so a Great oasis city can be set beside a river city.
import { createWorld } from '../../../src/sim/world.js';
import { advanceDays } from '../../../src/sim/clock.js';
import { paintHouses, setSpeed } from '../../../src/sim/commands.js';
import { drawRoute } from '../../../src/sim/route.js';
import { housesOf, population } from '../../../src/sim/world.js';
import { capacityOf } from '../../../src/sim/housing.js';
import { cityAdvice } from '../../../src/sim/advice.js';
import { MILESTONES } from '../../../src/data/progression.js';
import { idx, inBounds } from '../../../src/sim/grid.js';
import { act } from '../../v50/grand/grandRun.js';
import { noNewDangers } from '../../v60/b1/grace.js';
import { noCityEvents } from '../../v70/e/hold.js';

const BUILDS = 2, YEAR = 12;
const STARTERS = [['well'], ['farm_grain', 'terrain'], ['farm_grain', 'terrain'], ['granary'], ['bazaar'], ['temple'], ['farm_grain', 'terrain'], ['well']];

// The streets a town grows by: rows 3 apart through the start area, nearest first, each 20 tiles long, centred on the start.
function streets(w) {
  const out = [], f = w.focus;
  for (const k of [0, -1, 1, -2, 2, -3, 3, -4, 4, -5, 5]) out.push({ y: f.y + k * 3, x0: Math.max(1, f.x - 10), x1: Math.min(w.size - 2, f.x + 10) });
  return out;
}
function layStreet(w, s) {
  if (!inBounds(w.size, s.x0, s.y) || !inBounds(w.size, s.x1, s.y)) return false;
  const r = drawRoute(w, s.x0, s.y, s.x1, s.y);
  if (!r.ok) return false;
  for (const dy of [-1, 1]) if (inBounds(w.size, 0, s.y + dy)) paintHouses(w, s.x0, s.y + dy, s.x1, s.y + dy);
  return true;
}
const vacancy = (w) => housesOf(w).reduce((n, h) => n + Math.max(0, capacityOf(h) - (h.residents || 0)), 0);

export function runLayout({ seed, layout, size = 64, years = 8 } = {}) {
  const w = noCityEvents(noNewDangers(createWorld({ seed, size, mapVariant: layout })));
  setSpeed(w, 1);
  const top = w.startRoad[w.startRoad.length - 1];
  drawRoute(w, top[0], top[1], w.focus.x, w.focus.y);
  const plan = streets(w);
  let next = 0;
  while (next < plan.length && !layStreet(w, plan[next])) next++;
  next++;
  const tried = new Set(), built = [];
  for (const [item, at] of STARTERS) {
    const done = act(w, { item, at: at || 'near', target: { x: w.focus.x, y: w.focus.y } }, null, tried);
    if (done) built.push(done);
  }
  const first = {}, people = [];
  for (let m = 1; m <= years * YEAR; m++) {
    advanceDays(w, 30, []);
    // a new street when the homes are nearly full and the treasury can take it
    if (next < plan.length && vacancy(w) < 8 && w.gold > 500) { while (next < plan.length && !layStreet(w, plan[next])) next++; next++; }
    const monthTried = new Set();
    let n = 0;
    for (const a of cityAdvice(w)) {
      if (n >= BUILDS) break;
      const done = act(w, a.fix, a.data && (a.data.good || (a.data.cause && a.data.cause.good)), monthTried);
      if (done) { built.push(done); n++; }
    }
    for (const ms of MILESTONES) if (first[ms.id] === undefined && w.milestone === ms.id) first[ms.id] = m;
    if (m % YEAR === 0) people.push(population(w));
  }
  return { w, first, people, built: built.length, milestone: w.milestone };
}
