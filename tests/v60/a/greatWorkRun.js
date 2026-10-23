// Version 6.0, Track A (rulings 652-660): the great-work run. The grand district run (tests/v50/grand/grandRun.js: the capital run on a 64-tile
// map, lived on to year 10 by the advice) taken on to year GREAT_YEARS on Normal by the same player: each month end it sends the yearly tribute
// and answers the court (./answer.js), plays the grand district's advice (grandRun.js playMonth) and builds towers to each raid warning's count
// (the late run's rule), and then does what the reign's sheet and goals ask:
//   - two new streets of homes inside the north loop road, laid at the start: a road at y 9 from x 8 to 24 past the bazaar and temple that face
//     the main street (two wells, a firehouse, plots on both sides), and one at y 5 beyond the bazaar's reach (its homes stay Shacks), for the
//     people the Seat of the Two Lands needs (MILESTONES: 1,400 and an Estate) and the workers the great temple's guilds need (the late city has
//     more jobs than workers, and the monuments' guilds are staffed last; without the second street its crews stand short for years);
//   - at the Seat, the great temple founded in the works quarter (the works road at y 26 run on east and round it) with four builders' guilds and
//     a firehouse of its own, as the site sheet's "No crew" and Show me would lay them, and the other two monuments under way paused (their
//     sheets' Pause), so their guilds' workers go to it. Its offerings leave the stores by themselves as each stage begins.
// It records each year's end (gold, favour, people, rank, the great temple's course and stage), the day each rank was reached, the founding, each
// offering, and the day the reign is won.
import { grandRun, playMonth, sendTribute, GRAND_YEARS } from '../../v50/grand/grandRun.js';
import { answerCourt } from './answer.js';
import { serialize, deserialize } from '../../../src/save/serialize.js';
import { advanceDays } from '../../../src/sim/clock.js';
import { place, canPlace, drawRoad, paintHouses, setPaused } from '../../../src/sim/commands.js';
import { assignLabour } from '../../../src/sim/labour.js';
import { allBuildings, population, housesOf, isSite } from '../../../src/sim/world.js';
import { towersNeeded, firstRaidTarget } from '../../../src/sim/raids.js';
import { costOf } from '../../../src/sim/costs.js';
import { greatWorkStatus } from '../../../src/sim/monuments.js';
import { GREAT_WORK } from '../../../src/data/reign.js';
import { DAYS_PER_MONTH, MONTHS_PER_YEAR } from '../../../src/sim/time.js';
import { nearestFit } from '../../../src/ui/placement.js';

export const GREAT_YEARS = 20;
const YEAR_DAYS = DAYS_PER_MONTH * MONTHS_PER_YEAR;
const RESERVE = 400;
const TEMPLE = { x: 34, y: 27 };                       // the great temple's corner: east of the works quarter, the works road run on to it
const GUILDS = [[41, 27], [41, 29], [34, 33], [36, 33]];  // its own builders' guilds, on the road laid round it (each within a crew's reach)

// The new street (the street's road, its wells, then its plots), laid once the treasury holds it. Returns what it laid.
function layStreet(w) {
  const done = [];
  const r = drawRoad(w, 8, 9, 24, 9);
  if (!r.ok) return done;
  done.push('road');
  for (const x of [12, 20]) if (canPlace(w, 'well', x, 8).ok && place(w, 'well', x, 8).ok) done.push(`well@${x}`);
  if (canPlace(w, 'firehouse', 16, 8).ok && place(w, 'firehouse', 16, 8).ok) done.push('firehouse@16');   // the street is beyond the main street's firehouses
  // Plots on both sides of the new road: its north side, and the gaps on its south side between the main street's bazaar and temple.
  for (const [x0, x1, y] of [[8, 11, 8], [13, 15, 8], [17, 19, 8], [21, 24, 8], [8, 13, 10], [16, 18, 10], [21, 24, 10]]) if (paintHouses(w, x0, y, x1, y).ok) done.push(`plots ${x0}-${x1},${y}`);
  return done;
}

// A second street further in (a road at y 5 across the loop, wells and a firehouse, plots both sides): for the workers the great temple's guilds
// need (the late city has more jobs than workers, and the monuments' guilds are staffed last). Beyond the bazaar's reach, so its homes stay Shacks.
function layNorthStreet(w) {
  const done = [];
  if (!drawRoad(w, 8, 5, 25, 5).ok) return done;
  done.push('road');
  for (const x of [11, 21]) if (canPlace(w, 'well', x, 4).ok && place(w, 'well', x, 4).ok) done.push(`well@${x}`);
  if (canPlace(w, 'firehouse', 16, 4).ok && place(w, 'firehouse', 16, 4).ok) done.push('firehouse@16');
  for (const [x0, x1, y] of [[8, 10, 4], [12, 15, 4], [17, 20, 4], [22, 25, 4], [8, 25, 6]]) if (paintHouses(w, x0, y, x1, y).ok) done.push(`plots ${x0}-${x1},${y}`);
  return done;
}

// Towers to a warned raid's count, near the building its first band would strike (as the advice's tower item asks since ruling 787: firstRaidTarget), else near the entry,
// keeping RESERVE. Show me's search (nearestFit) leaves out the spots that have no road, so each tower stands where it can be staffed.
function meetWarning(w, built) {
  const warn = w.raid.warning;
  if (!warn || warn.first) return;
  const standing = () => allBuildings(w).filter((b) => b.type === 'tower').length;
  // A two-sided raid (warning.second) comes at a second entry too: the player reads both and puts the towers by each band's first strike in turn.
  const aims = [warn.entry, ...(warn.second ? [warn.second.entry] : [])].map((entry) => {
    const first = firstRaidTarget(w, entry, warn.target);
    return first ? { x: first.x + first.w / 2, y: first.y + first.d / 2 } : { x: entry.x, y: entry.y };
  });
  for (let tries = 0; tries < 6 && standing() < towersNeeded(warn.size); tries++) {
    if (w.gold - costOf(w, 'tower') < RESERVE) return;
    const aim = aims[tries % aims.length], round = Math.floor(tries / aims.length);
    const g = nearestFit(w, { kind: 'building', type: 'tower' }, aim.x - 3 * round, aim.y + 2 * round, null, w.size);
    if (!canPlace(w, 'tower', g.x, g.y, { roadLater: true }).ok) continue;
    if (place(w, 'tower', g.x, g.y, { roadLater: true }).ok) built.push({ day: w.day, type: 'tower', x: g.x, y: g.y });
  }
}

// The great temple and its guilds, once the city is the Seat and the treasury holds the founding with RESERVE to spare.
function foundTemple(w) {
  if (w.gold - costOf(w, GREAT_WORK.type) - 4 * costOf(w, 'builders_guild') < RESERVE) return null;
  if (!drawRoad(w, 34, 26, 40, 26).ok || !drawRoad(w, 40, 26, 40, 32).ok || !drawRoad(w, 33, 32, 40, 32).ok) return null;   // round three sides of it
  const r = place(w, GREAT_WORK.type, TEMPLE.x, TEMPLE.y);
  if (!r.ok) return null;
  const guilds = GUILDS.filter(([x, y]) => canPlace(w, 'builders_guild', x, y).ok && place(w, 'builders_guild', x, y).ok).length;
  // A firehouse at the road's corner: the guilds stand beyond the works quarter's firehouses (the fire layer would show them uncovered).
  const fire = canPlace(w, 'firehouse', 41, 31).ok && place(w, 'firehouse', 41, 31).ok;
  // The other monuments under way are paused (their sheets' Pause), so their guilds stand idle and their workers go to the great temple's guilds:
  // the city has fewer workers than jobs, and the monuments' guilds are staffed last.
  const paused = allBuildings(w).filter((b) => isSite(b) && b.id !== r.id && setPaused(w, b.id, true).ok).map((b) => b.type);
  assignLabour(w);
  return { day: w.day, id: r.id, guilds, fire, paused };
}

// Version 6.0 (Wave 4, tests/v60/balance): base is another grand run to take on (the one with the new dangers on) and onMonth(w, events, month) a player's answers to them,
// called after each month end's own play; both default to the run as it always was.
export function runGreatWork({ years = GREAT_YEARS, base: given = null, onMonth = null } = {}) {
  const started = performance.now();
  const base = given || grandRun();
  const w = deserialize(serialize(base.w));
  const built = [], yearly = {}, ranks = {}, offerings = [], dues = [], insane = [];
  let street = null, temple = null, won = null, lowestGold = w.gold;
  const firstMonth = Math.round(w.day / DAYS_PER_MONTH) + 1;
  for (let m = firstMonth; m <= years * MONTHS_PER_YEAR; m++) {
    const events = [];
    advanceDays(w, DAYS_PER_MONTH, events);
    for (const e of events) {
      if (e.type === 'milestone') ranks[e.id] = w.day;
      if (e.type === 'offering_made') offerings.push({ day: w.day, stage: e.stage, good: e.good, n: e.n });
      if (e.type === 'court_due') dues.push({ year: Math.floor(w.day / YEAR_DAYS) + 1, gold: e.gold, band: e.band, greatWork: e.greatWork });
      if (e.type === 'reign_won') won = { day: e.day, score: e.seal.score, medal: e.seal.medal };
    }
    if (!Number.isFinite(w.gold)) insane.push(`month ${m}: gold ${w.gold}`);
    lowestGold = Math.min(lowestGold, w.gold);
    sendTribute(w);
    answerCourt(w, { reserve: RESERVE });
    meetWarning(w, built);
    if (!street && w.gold > 2000) street = { day: w.day, laid: layStreet(w) };
    if (street && !street.north && w.gold > 3000) street.north = layNorthStreet(w);
    playMonth(w, built);
    if (onMonth) onMonth(w, events, m);
    if (!temple && w.milestone === 'seat') temple = foundTemple(w);
    if (w.day % YEAR_DAYS === 0) {
      const gw = temple ? w.buildings[temple.id] : null;
      yearly[w.day / YEAR_DAYS] = { gold: Math.round(w.gold), favour: w.court.favour, people: population(w), rank: w.milestone, course: gw ? gw.site.course : null, stage: gw ? greatWorkStatus(w, gw).stage : null, homes: housesOf(w).length, reason: gw ? gw.site.reason : null, crews: gw ? gw.site.crews.length : null, stock: gw ? { stone: Math.round(gw.site.stock.stone), bricks: Math.round(gw.site.stock.bricks) } : null, jobs: w.labour.jobs, workforce: w.labour.workforce, guilds: allBuildings(w).filter((b) => b.type === 'builders_guild').map((b) => b.staff).join('/'), burned: w.tally.buildingsBurned || 0, unfed: housesOf(w).filter((h) => h.met && h.met.food === false).length };
    }
  }
  return { w, base, street, temple, won, ranks, offerings, dues, yearly, built, lowestGold, insane, elapsed: performance.now() - started };
}

let shared = null;
export const greatWorkRun = () => shared || (shared = runGreatWork());
export { GRAND_YEARS };
