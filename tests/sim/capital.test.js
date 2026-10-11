import { describe, it, expect } from '../harness.js';
import { advanceDays } from '../../src/sim/clock.js';
import { place, drawRoad, paintHouses, canPlace, previewRoad, previewHouses } from '../../src/sim/commands.js';
import { openRoute, setTradeOrder } from '../../src/sim/trade.js';
import { createWorld, allBuildings, housesOf, population } from '../../src/sim/world.js';
import { milestoneIndex } from '../../src/sim/progression.js';
import { ECONOMY } from '../../src/data/economy.js';
import { GOALS, EVENT_GOALS, GUIDE_REWARD } from '../../src/data/goals.js';
import { FIRSTS, FIRST_REWARD } from '../../src/data/firsts.js';
import { costOf, routeCostOf } from '../../src/sim/costs.js';
import { T } from '../../src/sim/terrain.js';
import { idx } from '../../src/sim/grid.js';

// The Stage 2 balance run (spec 9, 11): a city laid only through the public commands, the way a steady player would,
// grows from the starting treasury to Capital, then lives on for years. Each step waits for its milestone (and some for
// a population) and for the gold to pay for it with RESERVE to spare, so the script never spends the treasury below
// zero; whether it stays above zero after that is down to the economy. The chains are laid so their raw goods never
// outrun the workshops (two clay pits feed three potters), because a raw good that piles up fills the shared
// storehouse and stops every chain that uses it.
const SIZE = 48;
const RESERVE = 400;

// A band of fertile land south of the centre (farms) with a rocky patch in it at the west end (the gem mine), desert
// elsewhere. The trade entry is the east end of the farm street, which the script lays.
function capitalWorld() {
  const terrain = new Array(SIZE * SIZE).fill(T.DESERT);
  for (let y = 17; y < 24; y++) for (let x = 0; x < SIZE; x++) terrain[idx(SIZE, x, y)] = T.FERTILE;
  for (let y = 21; y < 23; y++) for (let x = 10; x < 14; x++) terrain[idx(SIZE, x, y)] = T.ROCKY;
  const map = { size: SIZE, terrain, tradeEntry: { x: 47, y: 20 }, startRoad: [], focus: { x: 24, y: 16 }, raiderEntries: [] };
  return createWorld({ seed: 5, size: SIZE, map });
}

// Each step: the milestone it waits for, what it costs now, and the command. A step that fails for any reason but gold
// is a broken script, so the run stops there.
const road = (x0, y0, x1, y1) => ({ cost: (w) => previewRoad(w, x0, y0, x1, y1).cost, run: (w) => drawRoad(w, x0, y0, x1, y1) });
const build = (type, x, y) => ({ cost: (w) => { const c = canPlace(w, type, x, y); return c.ok || c.reason === 'no_gold' ? costOf(w, type) : Infinity; }, run: (w) => place(w, type, x, y), type, x, y });
const plots = (x0, y0, x1, y1) => ({ cost: (w) => previewHouses(w, x0, y0, x1, y1).cost, run: (w) => paintHouses(w, x0, y0, x1, y1) });
const route = (partner) => ({ cost: (w) => routeCostOf(w, partner), run: (w) => openRoute(w, partner) });
const order = (good, mode, keep) => ({ cost: () => 0, run: (w) => setTradeOrder(w, good, mode, keep) });
const at = (milestone, ...steps) => steps.map((s) => ({ milestone, pop: 0, ...s }));
const once = (pop, ...steps) => steps.map((s) => ({ ...s, pop }));

// The main street (y 12) has homes on both sides and its services on the north side. A short works road (x 24) runs
// south past the granaries to the farm street (y 20) on the fertile band, where the storehouse sits at the corner with
// the workshops along the street. A block of paired plots (rows 13 and 14, east) with statues and gardens behind it is
// where Manors can form.
const CAPITAL_SCRIPT = [
  ...at('village',
    road(4, 12, 40, 12), road(24, 13, 24, 19), road(8, 20, 38, 20),
    build('farm_grain', 20, 18), build('granary', 25, 17),
    build('well', 17, 11), build('well', 25, 11), build('bazaar', 14, 10),
    plots(10, 13, 23, 13),
    ...once(40, build('temple', 19, 10), build('farm_grain', 27, 18)),
    ...once(80, build('well', 33, 11), build('well', 38, 11), plots(25, 13, 30, 13), plots(32, 13, 39, 13)),
    ...once(110, build('bazaar', 29, 10), build('temple', 34, 10), plots(10, 11, 39, 11), build('farm_grain', 18, 18)),
    ...once(140, build('farm_grain', 22, 21), build('farm_grain', 29, 18)),
  ),
  ...at('town',
    build('storehouse', 22, 18), build('clay_pit', 18, 21), build('potter', 20, 21),
    build('farm_fig', 16, 18), build('farm_fig', 31, 18),
    build('booth', 31, 13), plots(27, 14, 30, 14), plots(32, 14, 39, 14),
    build('statue', 29, 15), build('statue', 33, 15), build('statue', 37, 15),
    build('garden', 27, 15), build('garden', 31, 15), build('garden', 35, 15), build('garden', 39, 15),
    build('clay_pit', 14, 21), build('potter', 16, 21), build('granary', 25, 15), build('farm_grain', 24, 21),
  ),
  ...at('market_town',
    road(39, 20, 47, 20), build('trading_post', 36, 21), route('memphis'),
    order('pottery', 'sell', 150),
    build('farm_grain', 26, 21), build('farm_grain', 33, 18), build('potter', 12, 21),
  ),
  ...at('city',
    build('farm_barley', 28, 21), build('brewery', 30, 21), order('beer', 'sell', 40),
    build('farm_grain', 14, 18), build('farm_grain', 32, 21), build('farm_grain', 34, 21),
  ),
];

function sane(w) {
  expect(Number.isFinite(w.gold)).toBe(true);
  expect(w.mood >= 0 && w.mood <= 100).toBe(true);
  for (const b of allBuildings(w)) {
    for (const v of Object.values(b.store)) expect(v).toBeGreaterThanOrEqual(0);
    if (b.type === 'house') {
      expect(b.residents).toBeGreaterThanOrEqual(0);
      for (const v of Object.values(b.stock)) expect(v).toBeGreaterThanOrEqual(0);
    }
  }
}

// Runs the script month by month: each month end, the next steps whose milestone, population and price allow.
function runCapital(months) {
  const w = capitalWorld();
  let next = 0, lowestGold = w.gold, taxes = 0, capitalMonth = null;
  const made = [];                                   // tally.made at each month end
  const tryBuild = () => {
    while (next < CAPITAL_SCRIPT.length) {
      const s = CAPITAL_SCRIPT[next];
      if (milestoneIndex(w.milestone) < milestoneIndex(s.milestone) || population(w) < s.pop) return;
      const cost = s.cost(w);
      if (!Number.isFinite(cost)) throw new Error(`step ${next} (${s.type} at ${s.x}, ${s.y}) cannot go there: ${canPlace(w, s.type, s.x, s.y).reason}`);
      if (w.gold - cost < RESERVE) return;
      const r = s.run(w);
      if (!r.ok) throw new Error(`step ${next} failed: ${r.reason}`);
      next++;
    }
  };
  tryBuild();
  for (let m = 1; m <= months; m++) {
    advanceDays(w, 30);
    sane(w);
    lowestGold = Math.min(lowestGold, w.gold);
    taxes += w.stats.lastMonth.taxes;
    if (capitalMonth === null && w.milestone === 'capital') capitalMonth = m;
    made.push({ ...w.tally.made });
    tryBuild();
  }
  return { w, steps: next, lowestGold, taxes, capitalMonth, made };
}

const YEARS = 6;
const share = (list, test) => list.filter(test).length / Math.max(1, list.length);

describe('capital run', () => {
  it('grows from the starting treasury to Capital through the public commands, stays solvent, and keeps its chains and homes supplied', () => {
    const started = performance.now();
    const r = runCapital(YEARS * 12);
    const elapsed = performance.now() - started;
    const { w } = r;
    expect(r.steps).toBe(CAPITAL_SCRIPT.length);                               // every step found its place and its gold
    expect(w.milestone).toBe('capital');
    expect(r.capitalMonth).toBeLessThanOrEqual(36);                             // Capital within three game-years
    expect(r.lowestGold).toBeGreaterThan(0);                                    // never in debt at a month end
    expect(population(w)).toBeGreaterThanOrEqual(1000);
    expect(w.mood).toBeGreaterThanOrEqual(30);                                  // nobody is leaving
    // No money from nowhere: the treasury grows only by taxes, trade and the gold goals and firsts pay.
    const rewards = [...GOALS, ...EVENT_GOALS].reduce((n, g) => n + g.reward, 0) + GUIDE_REWARD + FIRSTS.length * FIRST_REWARD;
    expect(w.gold).toBeLessThanOrEqual(ECONOMY.startGold + r.taxes + w.tally.tradeIncome + rewards);
    // No stuck chain: in the last year every chain kept making its goods, at least a workshop's steady output.
    const yearAgo = r.made[r.made.length - 13];
    const lastYear = (good) => (w.tally.made[good] || 0) - (yearAgo[good] || 0);
    expect(lastYear('clay')).toBeGreaterThanOrEqual(12 * 30);
    expect(lastYear('pottery')).toBeGreaterThanOrEqual(12 * 30);
    expect(lastYear('barley')).toBeGreaterThanOrEqual(12 * 15);
    expect(lastYear('beer')).toBeGreaterThanOrEqual(12 * 15);
    expect(lastYear('grain') + lastYear('figs')).toBeGreaterThanOrEqual(12 * 250);
    // ...and the homes got them: the fed homes, and the Townhouses and up with their pottery, at the last monthly check.
    const homes = housesOf(w);
    expect(share(homes.filter((h) => h.tier >= 3), (h) => h.met.food)).toBeGreaterThanOrEqual(0.95);
    expect(share(homes.filter((h) => h.tier >= 5), (h) => h.met.pottery)).toBeGreaterThanOrEqual(0.9);
    expect(homes.filter((h) => h.tier >= 6).length).toBeGreaterThanOrEqual(2);   // Manors merged on the pleasant block
    expect(w.tally.caravans).toBeGreaterThanOrEqual(4);
    expect(w.tally.sold).toBeGreaterThan(0);
    expect(elapsed).toBeLessThan(5000);
  });
});
