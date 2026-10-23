// The capital run (spec 9, 11): a city laid only through the public commands, the way a steady player would, grows
// from the starting treasury to Capital, then lives on for years. Each step waits for its milestone (and some for a
// population, the pyramid for its prestige) and for the gold to pay for it with RESERVE to spare, so the script never
// spends the treasury below zero; whether it stays above zero after that is down to the economy. The chains are laid
// so their raw goods never outrun the workshops (two clay pits feed three potters), because a raw good that piles up
// fills the shared storehouse and stops every chain that uses it. Stage 3: the city meets fire and raids, so it builds
// firehouses before fire risk starts at Town and defences once the raid clock can start at Market town. Stage 4 (Track
// F): the monument programme of spec 9 in a works quarter south of the fields (below). tests/sim/capital.test.js checks
// the Stage 2-3 promises and tests/stage4/balance/capital.test.js spec 9's Stage 4 ones, on one shared run.
import { advanceDays } from '../../../src/sim/clock.js';
import { place, drawRoad, paintHouses, canPlace, previewRoad, previewHouses } from '../../../src/sim/commands.js';
import { openRoute, setTradeOrder } from '../../../src/sim/trade.js';
import { createWorld, population, allBuildings, isSite } from '../../../src/sim/world.js';
import { noNewDangers } from '../../v60/b1/grace.js';
import { noCityEvents } from '../../v70/e/hold.js';   // Version 7.0 (Track E, ruling 913): the run measures the game before the city events
import { milestoneIndex, isUnlocked } from '../../../src/sim/progression.js';
import { costOf, routeCostOf } from '../../../src/sim/costs.js';
import { T } from '../../../src/sim/terrain.js';
import { idx } from '../../../src/sim/grid.js';
import { LARGE_PLOT } from '../../../src/data/largePlots.js';
import { largePlotUnlocked } from '../../../src/sim/largePlots.js';

const SIZE = 48;
const RESERVE = 400;
export const CAPITAL_YEARS = 6;

// A band of fertile land south of the centre (farms) with a rocky patch in it at the west end (the gem mine), desert
// elsewhere. Stage 4: three rocky patches on the desert south of the fields for the quarries. The trade entry is the
// east end of the farm street, which the script lays; the raider entries are the two mapgen gives a 48-tile map (the
// middle of the east edge and of the north edge).
function capitalWorld(size = SIZE, dangers = false, seed = 5, events = false) {
  const terrain = new Array(size * size).fill(T.DESERT);
  for (let y = 17; y < 24; y++) for (let x = 0; x < size; x++) terrain[idx(size, x, y)] = T.FERTILE;
  for (let y = 21; y < 23; y++) for (let x = 10; x < 14; x++) terrain[idx(size, x, y)] = T.ROCKY;
  for (const x0 of [10, 24, 26]) for (let y = 24; y < 26; y++) for (let x = x0; x < x0 + 2; x++) terrain[idx(size, x, y)] = T.ROCKY;
  // Stage 4.5 (ruling 312): the four clay pits the script lays stand on clay.
  for (const [x0, y0] of [[18, 21], [14, 21], [28, 24], [30, 24]]) for (let y = y0; y < y0 + 2; y++) for (let x = x0; x < x0 + 2; x++) terrain[idx(size, x, y)] = T.CLAY;
  // Version 5.0 (Task 7): a bigger map (the grand district run, tests/v50/grand/grandRun.js) keeps all of this where it is and adds room east,
  // with a rocky patch there for a gem mine; the entries stay where the 48-tile map has them.
  if (size > SIZE) for (let y = 25; y < 27; y++) for (let x = 52; x < 56; x++) terrain[idx(size, x, y)] = T.ROCKY;
  const raiderEntries = [{ x: 47, y: 24 }, { x: 24, y: 0 }];
  const map = { size, terrain, tradeEntry: { x: 47, y: 20 }, startRoad: [], focus: { x: 24, y: 16 }, raiderEntries };
  const world = createWorld({ seed, size, map });
  // Version 6.0: the run measures the game before the new dangers (tests/v60/b1/grace.js); the Wave 4 balance runs (tests/v60/balance) ask for them (dangers: the three-year grace from day 0).
  // Version 7.0 (wave 3): `events` is a run's player of the city events (tests/v70/balance/events.js): a run that has one plays with the events on from day 0, as a new city has them.
  const graced = dangers ? world : noNewDangers(world);
  return events ? graced : noCityEvents(graced);
}

// Each step: the milestone it waits for, what it costs now, and the command. A step that fails for any reason but gold
// is a broken script, so the run stops there. when: a further wait (the small pyramid's prestige unlock).
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
// where Manors can form. Five firehouses reach every building on a road (8 road tiles each): two in the north row of
// the main street, laid before its homes fill that row, and three on the farm street (the middle one also reaches the
// granaries on the works road). Two barracks (one at each end of the city) and two towers (by the trade road and at the
// works road's corner) face the raids, which come from the east and the north.
//
// Stage 4 (spec 9): the monument programme, in a works quarter on the desert south of the fields, ten tiles and more
// from any home, along a road (y 26) that a lane (x 9) joins to the west end of the farm street. North of it (y 24-25)
// the supply buildings: quarries on the rocky patches at x 10, 24 and 26, the four builders' guilds side by side at x
// 14-21, the quarter's storehouse at x 22 (the brickworks draw their clay from it) and the clay pits at x 28 and 30, the
// second brickworks at x 32; south of it (y 27 on) the sites and the quarter's two firehouses: the small pyramid at x 10,
// a firehouse at x 14, the colossus at x 15, the small obelisk at x 17, the small mastaba at x 18, the first brickworks at
// x 22, the large mastaba at x 26 and a firehouse at x 30. Every guild, quarry and brickworks reaches the sites it serves
// within 12 road tiles, and the colossus and the small mastaba lie nearer every guild than the large mastaba, so the four
// crews finish them first (a crew goes to the nearest site with room). At City a guild, a quarry and the small obelisk;
// at Great city a second guild and quarry, the storehouse, a clay pit and a brickworks, the colossus and the small
// mastaba; at Capital two more guilds, the third quarry, a second brickworks and clay pit and the large mastaba; then
// the small pyramid the day its prestige unlock comes (100 prestige). The second brickworks is one more than spec 9's
// list: with one, the small mastaba's brick courses (60 bricks a month for three crews) take twice as long, and it is
// not finished by year 6.
const CAPITAL_SCRIPT = [
  ...at('village',
    road(4, 12, 40, 12), road(24, 13, 24, 19), road(8, 20, 38, 20),
    build('farm_grain', 20, 18), build('granary', 25, 17),
    build('well', 17, 11), build('well', 25, 11), build('bazaar', 14, 10),
    plots(10, 13, 23, 13),
    ...once(40, build('temple', 19, 10), build('farm_grain', 27, 18)),
    // Version 6.0 (Track C, ruling 705): small plots stop at Townhouse, so the Manor block (x 29-37) is four Large plots laid at Market town (below), not plots that merge.
    ...once(80, build('well', 33, 11), build('well', 38, 11), plots(25, 13, 28, 13), plots(38, 13, 39, 13)),
    ...once(110, build('bazaar', 29, 10), build('temple', 34, 10), build('firehouse', 16, 11), build('firehouse', 32, 11),
      plots(10, 11, 39, 11), build('farm_grain', 18, 18)),
    ...once(140, build('farm_grain', 22, 21), build('farm_grain', 29, 18)),
  ),
  ...at('town',
    build('firehouse', 25, 19), build('firehouse', 11, 19), build('firehouse', 38, 19),
    build('storehouse', 22, 18), build('clay_pit', 18, 21), build('potter', 20, 21),
    // Two orchards, no more: homes eat grain before figs, so figs beyond what two-food homes need fill the shared
    // granaries and the grain farms stop with "no storage".
    build('farm_fig', 16, 18), build('farm_fig', 31, 18),
    build('booth', 31, 13),
    build('statue', 29, 15), build('statue', 33, 15), build('statue', 37, 15),
    build('garden', 27, 15), build('garden', 31, 15), build('garden', 35, 15), build('garden', 39, 15),
    build('clay_pit', 14, 21), build('potter', 16, 21), build('granary', 25, 15), build('farm_grain', 24, 21),
  ),
  ...at('market_town',
    // The four Large plots (2x2, rows 13-14, on the pleasant block where the Manors merged before 6.0), laid once a Townhouse has unlocked the card (a step that waits holds the
    // ones after it, so they come after the Town's steps, with Market town's people already there).
    ...[29, 32, 34, 36].map((x) => ({ ...build(LARGE_PLOT.type, x, 13), when: (w) => largePlotUnlocked(w) })),
    road(39, 20, 47, 20), build('trading_post', 36, 21), route('memphis'),
    build('barracks', 8, 13), build('barracks', 38, 21), build('tower', 40, 19), build('tower', 25, 14), build('tower', 23, 14),
    order('pottery', 'sell', 150),
    build('farm_grain', 26, 21), build('farm_grain', 33, 18), build('potter', 12, 21),
  ),
  ...at('city',
    build('farm_barley', 28, 21), build('brewery', 30, 21), order('beer', 'sell', 40),
    build('farm_grain', 14, 18), build('farm_grain', 32, 21), build('farm_grain', 34, 21),
    road(9, 21, 9, 26), road(10, 26, 33, 26),
    build('firehouse', 14, 27), build('builders_guild', 14, 24), build('quarry', 10, 24), build('obelisk_small', 17, 27),
  ),
  ...at('great_city',
    build('builders_guild', 16, 24), build('quarry', 24, 24), build('storehouse', 22, 24), build('clay_pit', 28, 24), build('brickworks', 22, 27),
    build('firehouse', 30, 27), build('colossus', 15, 27), build('mastaba_small', 18, 27),
  ),
  ...at('capital',
    build('builders_guild', 18, 24), build('builders_guild', 20, 24), build('quarry', 26, 24), build('brickworks', 32, 24), build('clay_pit', 30, 24),
    build('mastaba_large', 26, 27),
    { ...build('pyramid_small', 10, 27), when: (w) => isUnlocked(w, 'pyramid_small') },
  ),
];

export { CAPITAL_SCRIPT };

// What is wrong with the world at a month end, if anything: a treasury that is not a number, mood out of 0-100, a
// negative store, household or household stock.
function insanity(w, m) {
  const out = [];
  if (!Number.isFinite(w.gold)) out.push(`month ${m}: gold ${w.gold}`);
  if (!(w.mood >= 0 && w.mood <= 100)) out.push(`month ${m}: mood ${w.mood}`);
  for (const b of allBuildings(w)) {
    for (const [g, v] of Object.entries(b.store)) if (v < 0) out.push(`month ${m}: ${b.type} ${b.id} store ${g} ${v}`);
    if (b.type !== 'house') continue;
    if (b.residents < 0) out.push(`month ${m}: house ${b.id} residents ${b.residents}`);
    for (const [g, v] of Object.entries(b.stock)) if (v < 0) out.push(`month ${m}: house ${b.id} stock ${g} ${v}`);
  }
  return out;
}

// Runs the script month by month: each month end, the next steps whose milestone, population, wait and price allow.
// months: one row per month end, from the books (stats.lastMonth), the labour market (world.labour) and the crews at
// work that day (every site's site.crews). insane: every month end's insanity (none, in a sound run).
// Version 6.0 (Wave 4): dangers true leaves the new dangers' grace as a new city has it; onMonth(w, events, month) is called after each month end's books, before the
// script's next steps (a player's answers to the dangers: tests/v60/balance/respond.js). Both default to the run as it always was.
// Version 6.0.1: seed is the world's seed (5, the run as tuned; tests/v60/balance measures the great work on another seed too).
// Version 7.0 (wave 3): events the city events' player (tests/v70/balance/events.js eventPlayer), called after each month end's books like onMonth; with none the events are held off as before.
export function runCapital(monthsToRun, { size = SIZE, dangers = false, onMonth = null, seed = 5, events: eventsPlayer = null } = {}) {
  const started = performance.now();
  const w = capitalWorld(size, dangers, seed, Boolean(eventsPlayer));
  let next = 0, lowestGold = w.gold, net = 0, spent = 0, capitalMonth = null;
  const made = [], months = [], insane = [];
  const tryBuild = () => {
    while (next < CAPITAL_SCRIPT.length) {
      const s = CAPITAL_SCRIPT[next];
      if (milestoneIndex(w.milestone) < milestoneIndex(s.milestone) || population(w) < s.pop || (s.when && !s.when(w))) return;
      const cost = s.cost(w);
      if (!Number.isFinite(cost)) throw new Error(`step ${next} (${s.type} at ${s.x}, ${s.y}) cannot go there: ${canPlace(w, s.type, s.x, s.y).reason}`);
      if (w.gold - cost < RESERVE) return;
      const before = w.gold;
      const r = s.run(w);
      if (!r.ok) throw new Error(`step ${next} failed: ${r.reason}`);
      spent += before - w.gold;                      // what the step took from the treasury: building, road or route
      next++;
    }
  };
  tryBuild();
  for (let m = 1; m <= monthsToRun; m++) {
    const events = onMonth || eventsPlayer ? [] : null;
    advanceDays(w, 30, events);
    insane.push(...insanity(w, m));
    lowestGold = Math.min(lowestGold, w.gold);
    net += w.stats.lastMonth.net;                    // taxes less wages and upkeep (monument gold is outside net)
    if (capitalMonth === null && w.milestone === 'capital') capitalMonth = m;
    made.push({ ...w.tally.made });
    const crews = allBuildings(w).reduce((n, b) => n + (isSite(b) ? b.site.crews.length : 0), 0);
    months.push({ ...w.stats.lastMonth, workforce: w.labour.workforce, employed: w.labour.employed, crews, gold: w.gold });
    if (eventsPlayer) eventsPlayer.onMonth(w, events, m);
    if (onMonth) onMonth(w, events, m);
    tryBuild();
  }
  return { w, steps: next, lowestGold, net, spent, capitalMonth, made, months, insane, elapsed: performance.now() - started };
}

// The run both test files read: run once per page, the first time either asks (elapsed is that run's own time).
let shared = null;
export const capitalRun = () => shared || (shared = runCapital(CAPITAL_YEARS * 12));
