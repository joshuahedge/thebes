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
// Version 8.4 (the retune, rulings 1540-1546): towers by each band's first strike (meetWarning), the stores' surplus sold (sellSurplus), the temple's plot
// cleared of towers before the founding; with the dangers-on habits also the course rushed and the towers stood down between raids (rushTemple, standDown).
// It records each year's end (gold, favour, people, rank, the great temple's course and stage), the day each rank was reached, the founding, each
// offering, and the day the reign is won.
import { grandRun, playMonth, sendTribute, setHabits, freeIdle, feedFirst, act, GRAND_YEARS, setReserved } from '../../v50/grand/grandRun.js';
import { causeFix } from '../../../src/ui/monumentSheet.js';
import { answerCourt } from './answer.js';
import { serialize, deserialize } from '../../../src/save/serialize.js';
import { advanceDays } from '../../../src/sim/clock.js';
import { drawRoute } from '../../../src/sim/route.js';
import { undo } from '../../../src/sim/undo.js';
import { place, canPlace, drawRoad, paintHouses, setPaused, demolishAt } from '../../../src/sim/commands.js';
import { assignLabour } from '../../../src/sim/labour.js';
import { allBuildings, population, housesOf, isSite } from '../../../src/sim/world.js';
import { bandAims, towersNear, NEAR_TARGET } from '../../stage47/pressure/lateRun.js';   // Version 8.4 (the retune, ruling 1540): each band met where it strikes first
import { costOf } from '../../../src/sim/costs.js';
import { greatWorkStatus, siteStatus, offeringOf, offeringsMade, rushQuote, setRush } from '../../../src/sim/monuments.js';
import { SPEND } from '../../v84/balance/spending.js';
import { setKeepAtLeast, setTradeOrder } from '../../../src/sim/trade.js';
import { GREAT_WORK } from '../../../src/data/reign.js';
import { BUILDINGS } from '../../../src/data/buildings.js';
import { DAYS_PER_MONTH, MONTHS_PER_YEAR } from '../../../src/sim/time.js';
import { nearestFit } from '../../../src/ui/placement.js';
import { eventPlayer } from '../../v70/balance/events.js';
import { releaseEvents } from '../../v70/e/hold.js';

export const GREAT_YEARS = 20;
const YEAR_DAYS = DAYS_PER_MONTH * MONTHS_PER_YEAR;
const RESERVE = 400;
const TEMPLE = { x: 34, y: 27 };                       // the great temple's corner: east of the works quarter, the works road run on to it
const GUILDS = [[41, 27], [41, 29], [34, 33], [36, 33]];  // its own builders' guilds, on the road laid round it (each within a crew's reach)
const TEMPLE_PLOT = { x: 33, y: 26, w: 10, d: 9 };    // Version 8.4: the temple, the road round it, its guilds and firehouse (foundTemple), kept free until it is founded

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
// Version 8.4 (the retune, ruling 1540): each band is met by its own first strike. It counted the towers standing anywhere against the whole raid, so
// a raid from the south found the seven towers built for the north raid before it and met three of them (the year-12 raid, lost); now each band of the
// raid sheet needs its share of the towers within reach of the building it strikes first (the late run's bandAims and towersNear).
function meetWarning(w, built) {
  const warn = w.raid.warning;
  if (!warn || warn.first) return;
  for (const { aim, need } of bandAims(w, warn)) {
    for (let round = 0; round < 8 && towersNear(w, aim) < need; round++) {
      if (w.gold - costOf(w, 'tower') < RESERVE) return;
      const g = nearestFit(w, { kind: 'building', type: 'tower' }, aim.x - 3 * Math.floor(round / 2), aim.y + 2 * Math.floor(round / 2), null, w.size);
      if (Math.hypot(g.x + 0.5 - aim.x, g.y + 0.5 - aim.y) > NEAR_TARGET) break;   // no room left within reach of it: a tower further off would not shoot this band
      if (!canPlace(w, 'tower', g.x, g.y, { roadLater: true }).ok) continue;
      if (place(w, 'tower', g.x, g.y, { roadLater: true }).ok) built.push({ day: w.day, type: 'tower', x: g.x, y: g.y });
    }
  }
}

// The great temple and its guilds, once the city is the Seat and the treasury holds the founding with RESERVE to spare.
function foundTemple(w) {
  if (w.gold - costOf(w, GREAT_WORK.type) - 4 * costOf(w, 'builders_guild') < RESERVE) return null;
  // Version 8.4 (the retune, ruling 1544): the player clears the plot first. The grand years' advice put towers where the temple and its north road go (the
  // dangers-on seed 5: towers at 34,26 and 33,27), so neither the north road nor the west one would go, the road routed round them left the temple out of every
  // quarry's reach and its site waited for stone for nine years. The towers on the plot are demolished (the demolish tool, partly refunded) while no raid is warned
  // or under way; the next warning's towers go beside it (meetWarning).
  if (!w.raid.warning && !w.raid.active) {
    const p = TEMPLE_PLOT;
    for (const b of allBuildings(w).filter((o) => o.type === 'tower' && o.x >= p.x && o.x < p.x + p.w && o.y >= p.y && o.y < p.y + p.d)) demolishAt(w, b.x, b.y);
  }
  // Version 9.2 (the balance check, ruling 1857): and whatever else stands on the temple's own footprint. The grand years keep no ground free (setReserved is the
  // great-work years'), so the Builder's grand years' advice put a jeweller at 33,27 and the temple was refused ("occupied") every month for ten years.
  const t = BUILDINGS[GREAT_WORK.type];
  if (canPlace(w, GREAT_WORK.type, TEMPLE.x, TEMPLE.y, { roadLater: true }).reason === 'occupied') {
    for (const b of allBuildings(w).filter((o) => o.x < TEMPLE.x + t.w && o.x + o.w > TEMPLE.x && o.y < TEMPLE.y + t.d && o.y + o.d > TEMPLE.y)) demolishAt(w, b.x, b.y);
  }
  // Round three sides of it. Version 6.0.1: when something already stands on the north side's road (the dangers-on run's towers and granaries, placed by Show me), the temple is
  // laid first (its placing rule's "needs a road") and the works road is taken down its west side instead (x 33, straight from the works road's end), else round what stands
  // with the road tool's Route (src/sim/route.js), so the stone comes along it within a quarry's reach; then the east and south sides. All of it is taken back (undo, refunded)
  // if a road will not go. The tuned run lays the three sides straight, as it always has.
  let r;
  if (drawRoad(w, 34, 26, 40, 26).ok) {
    if (!drawRoad(w, 40, 26, 40, 32).ok || !drawRoad(w, 33, 32, 40, 32).ok) return null;
    r = place(w, GREAT_WORK.type, TEMPLE.x, TEMPLE.y);
  } else {
    const before = w.undo.length;
    r = place(w, GREAT_WORK.type, TEMPLE.x, TEMPLE.y, { roadLater: true });
    const west = () => drawRoad(w, 33, 26, 33, 32).ok || drawRoute(w, 33, 26, 40, 26).ok;
    if (r.ok && !(west() && drawRoad(w, 40, 26, 40, 32).ok && drawRoad(w, 33, 32, 40, 32).ok)) { while (w.undo.length > before) undo(w); return null; }
  }
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

// Version 7.0 (wave 3): the Trade sheet's "Keep at least" as a habit once the great temple stands: each good the offerings still ask for is kept at the most any stage still to come
// needs of it (the sheet's command setKeepAtLeast: the floor, and the order's keep when the good has an order), so no caravan sells below what the temple is owed, and the floor goes
// when the last offering is made. (The temple's waiting stage is held back by the sim whatever the floor says: tradeRules.js heldBack; the floor reaches the stages after it.)
export function keepOfferings(w, gw) {
  const made = offeringsMade(w, gw), want = {};
  GREAT_WORK.offerings.forEach((o, stage) => {
    if (stage < made) return;
    const n = offeringOf(w, stage);
    want[n.good] = Math.max(want[n.good] || 0, n.n);
  });
  for (const good of new Set(GREAT_WORK.offerings.map((o) => o.good))) setKeepAtLeast(w, good, want[good] || 0);
  return want;
}

// Version 8.4 (the retune, ruling 1542): the Trade sheet's Sell for what piles up. The run's beer (the grand run set it to Ignore for the Manors), linen and jewellery
// fill the main storehouse beside the potters (500 beer and 270 jewellery by year 14), so its clay pits stand with "no room in the stores", the potters with no clay,
// and some 50 Townhouses fall to Houses for want of pottery: the taxes the great temple lives on fall by a third. A player who reads the clay pits' sheet sells the
// surplus at the caravans' prices: each of these goods is set to Sell above what the homes draw (SURPLUS_KEEP) or the offering still owed of it, whichever is more
// (a good the luxury habit buys is left alone).
export const SURPLUS = ['beer', 'linen', 'jewellery'];
export const SURPLUS_KEEP = 200;
export function sellSurplus(w, temple) {
  const made = temple ? offeringsMade(w, temple) : 0, owed = {};
  GREAT_WORK.offerings.forEach((o, stage) => { if (stage >= made) owed[o.good] = Math.max(owed[o.good] || 0, offeringOf(w, stage).n); });
  for (const good of SURPLUS) {
    const o = w.trade.orders[good], keep = Math.max(SURPLUS_KEEP, owed[good] || 0);
    if (o && o.mode === 'buy') continue;
    if (!o || o.mode !== 'sell' || o.keep !== keep) setTradeOrder(w, good, 'sell', keep);
  }
}

// Version 6.0.1 (the dangers-on run's habits, tests/v60/balance; test-script habits, not a game change; grandRun.js setHabits): workers moved to the crews. While the great
// temple rises and the monuments' level stands short of workers (the Employment sheet: the guilds are staffed last), the player pauses every workplace that stands idle with
// workers in it (grandRun.js freeIdle), so its workers go to the guilds; feedFirst puts them back to work when food runs low.
function moveToCrews(w) {
  if ((w.labour.shortLevels || []).includes('monuments')) freeIdle(w, Infinity);
}

// Version 8.4 (the retune, ruling 1546): with the same habits, the towers stand down between raids. 8.4's clock brings a raid about every 16 months and the player meets
// each where it strikes, so the city ends with 11-13 towers (8.3: 7-8), and their 44-52 workers are staffed before the temple's guilds (safety before monuments): the guilds
// stood at 3-6 workers of 16 for years. While the monuments stand short of workers and no raid is warned or under way, the player pauses each tower (its sheet's Pause), so
// its workers go to the crews; at the first month end after a warning (60-90 days before the raid), or once the temple is finished, every tower it paused is manned again.
const towersPaused = new Set();
function standDown(w, rising) {
  if (w.raid.warning || w.raid.active || !rising) {
    if (!towersPaused.size) return;
    for (const id of towersPaused) if (w.buildings[id] && w.buildings[id].paused) setPaused(w, id, false);
    towersPaused.clear();
    assignLabour(w);
    return;
  }
  if (!(w.labour.shortLevels || []).includes('monuments')) return;
  for (const b of allBuildings(w)) if (b.type === 'tower' && !b.paused && setPaused(w, b.id, true).ok) towersPaused.add(b.id);
  assignLabour(w);
}

// The same habit reads the site sheet's stall row: with no stone or bricks and no maker in reach of the site (siteStatus), it does what the row's Show me leads to (causeFix:
// a quarry or brickworks on the nearest ground for it), the way the grand run's player acts on a Show me (grandRun.js act: the ghost, a road routed to it).
function followStall(w, gw, built) {
  const reason = gw.site.reason;
  if (reason !== 'no_stone' && reason !== 'no_bricks') return;
  const m = siteStatus(w, gw).materials[reason.slice(3)];
  if (!m || m.makers.length) return;
  const f = causeFix(w, gw, reason);
  if (!f || !f.showMe) return;
  const done = act(w, { item: f.showMe.item, at: 'near', target: { x: f.showMe.x, y: f.showMe.y } }, null, new Set());
  if (done) built.push(done);
}

// Version 8.4 (the retune, ruling 1545): the same habits spend a full treasury on the temple: its course is rushed (the site sheet's Rush this course) while the treasury
// stays above the spending player's line (tests/v84/balance/spending.js SPEND: 6 months of Normal-rate taxes plus 30 days of the rush), and cancelled below it. The
// dangers-on seed 5 holds 25,000-40,000 from the founding on while its crews stand short of workers (the monuments are staffed last), and Rush lays a course 2.5 times as fast
// with the same crews: without it the last offering is made on day 6,840 and the crown is not finished by year 20.
function rushTemple(w, gw) {
  const month = w.stats.lastMonth.taxesNormal, q = rushQuote(w, gw.id);
  if (gw.site.rush) { if (w.gold < SPEND.rushAbove * month + SPEND.rushDays * q.dayGold) setRush(w, gw.id, false); }
  else if (q.ok && w.gold >= SPEND.rushAbove * month + SPEND.rushDays * q.dayGold) setRush(w, gw.id, true);
}

// Version 6.0 (Wave 4, tests/v60/balance): base is another grand run to take on (the one with the new dangers on) and onMonth(w, events, month) a player's answers to them,
// called after each month end's own play; both default to the run as it always was.
// Version 6.0.1: habits the dangers-on run's player habits (grandRun.js setHabits, moveToCrews and followStall above; tests/v60/balance/dangerRuns.js), off as tuned.
export function runGreatWork({ years = GREAT_YEARS, base: given = null, onMonth = null, habits = false, events: eventsOpt = true } = {}) {
  const started = performance.now();
  const base = given || grandRun();
  setHabits(habits);
  towersPaused.clear();
  setReserved(TEMPLE_PLOT);                       // Version 8.4 (Track G, ruling 1478): the temple's plot kept free until it is founded
  const w = deserialize(serialize(base.w));
  const player = eventsOpt === true ? eventPlayer() : eventsOpt || null;   // Version 7.0 (wave 3): true is a steady player of its own, a given one the base run's, false none (the events held)
  if (player) releaseEvents(w);
  const built = [], yearly = {}, ranks = {}, offerings = [], dues = [], insane = [], raids = [];
  let street = null, temple = null, won = null, lowestGold = w.gold, foundedSave = null;
  const firstMonth = Math.round(w.day / DAYS_PER_MONTH) + 1;
  for (let m = firstMonth; m <= years * MONTHS_PER_YEAR; m++) {
    const events = [];
    advanceDays(w, DAYS_PER_MONTH, events);
    for (const e of events) {
      if (e.type === 'milestone') ranks[e.id] = w.day;
      if (e.type === 'offering_made') offerings.push({ day: w.day, stage: e.stage, good: e.good, n: e.n });
      if (e.type === 'court_due') dues.push({ year: Math.floor(w.day / YEAR_DAYS) + 1, gold: e.gold, band: e.band, greatWork: e.greatWork });
      if (e.type === 'reign_won') won = { day: e.day, score: e.seal.score, medal: e.seal.medal };
      // Version 8.4 (wave 2, ruling 1526): every raid's end, with what its war elephants did (the report's own fields), for the elephants' balance target (B8).
      if (e.type === 'raid_end') raids.push({ day: w.day, index: e.report.index, won: e.won, size: e.report.size, elephants: (e.report.mix && e.report.mix.elephant) || 0, felled: e.report.felled || 0, stampeded: e.report.stampeded || 0, ivory: e.report.ivory || 0 });
    }
    if (!Number.isFinite(w.gold)) insane.push(`month ${m}: gold ${w.gold}`);
    lowestGold = Math.min(lowestGold, w.gold);
    sendTribute(w);
    answerCourt(w, { reserve: RESERVE });
    meetWarning(w, built);
    if (!street && w.gold > 2000) street = { day: w.day, laid: layStreet(w) };
    if (street && !street.north && w.gold > 3000) street.north = layNorthStreet(w);
    playMonth(w, built);
    if (player) player.onMonth(w, events, m);   // Version 7.0 (wave 3): the city events, answered as a steady player does (tests/v70/balance/events.js)
    if (onMonth) onMonth(w, events, m);
    if (!temple && w.milestone === 'seat') { temple = foundTemple(w); if (temple) { foundedSave = serialize(w); setReserved(null); } }   // Version 7.0 (wave 3): the city the day it was founded, for the floors test (tests/v70/balance)
    if (temple && w.buildings[temple.id]) keepOfferings(w, w.buildings[temple.id]);   // Version 7.0 (wave 3): Keep at least for the offerings still owed
    sellSurplus(w, temple && w.buildings[temple.id]);                                 // Version 8.4 (the retune, ruling 1542): Sell what piles up in the stores
    if (habits) feedFirst(w);
    if (habits) standDown(w, Boolean(temple && !won && w.buildings[temple.id] && w.buildings[temple.id].site));   // Version 8.4 (the retune, ruling 1546)
    if (habits && temple && !won && w.buildings[temple.id] && w.buildings[temple.id].site) { followStall(w, w.buildings[temple.id], built); moveToCrews(w); rushTemple(w, w.buildings[temple.id]); }
    if (w.day % YEAR_DAYS === 0) {
      const gw = temple ? w.buildings[temple.id] : null;
      yearly[w.day / YEAR_DAYS] = { gold: Math.round(w.gold), favour: w.court.favour, people: population(w), rank: w.milestone, course: gw ? gw.site.course : null, stage: gw ? greatWorkStatus(w, gw).stage : null, homes: housesOf(w).length, reason: gw ? gw.site.reason : null, crews: gw ? gw.site.crews.length : null, stock: gw ? { stone: Math.round(gw.site.stock.stone), bricks: Math.round(gw.site.stock.bricks) } : null, jobs: w.labour.jobs, workforce: w.labour.workforce, guilds: allBuildings(w).filter((b) => b.type === 'builders_guild').map((b) => b.staff).join('/'), burned: w.tally.buildingsBurned || 0, unfed: housesOf(w).filter((h) => h.met && h.met.food === false).length };
    }
  }
  setReserved(null);
  return { w, eventRec: player ? player.rec : null, foundedSave, base, street, temple, won, ranks, offerings, dues, raids, yearly, built, lowestGold, insane, elapsed: performance.now() - started };
}

let shared = null;
export const greatWorkRun = () => shared || (shared = runGreatWork());
export { GRAND_YEARS };
