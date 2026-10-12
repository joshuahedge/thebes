// Cities for the dev page and the title card, laid through the public commands so they are legal cities. Every call
// is deterministic for a seed: the commands are deterministic and so is the clock.
import { drawRoad, paintHouses, place, canPlace } from '../sim/commands.js';
import { advanceDays } from '../sim/clock.js';
import { assignLabour } from '../sim/labour.js';
import { housesOf, allBuildings } from '../sim/world.js';
import { crewPlan } from '../sim/monuments.js';
import { atLeast } from '../sim/progression.js';
import { canBurn } from '../sim/fire.js';
import { roadReach, adjacentRoadTiles } from '../sim/reach.js';
import { FIRE } from '../data/fire.js';
import { TIERS } from '../data/housing.js';
import { MONUMENTS } from '../data/monuments.js';
import { T } from '../sim/terrain.js';
import { idx } from '../sim/grid.js';

const water = (world, x, y) => world.terrain[idx(world.size, x, y)] === T.WATER;

// Lays road west from (x0, y) one tile at a time until the river or the map edge stops it.
function roadWest(world, x0, y, minX) {
  for (let x = x0; x > minX; x--) {
    if (water(world, x - 1, y)) return x;
    if (!drawRoad(world, x, y, x - 1, y).ok) return x;
  }
  return minX;
}

// The first spot in the list where the building can go (the river can take any one of them on some maps).
function placeFirst(world, type, spots) {
  for (const [x, y] of spots) if (place(world, type, x, y).ok) return true;
  return false;
}

// Stage 3 (spec 4.12): fire risk builds from Town, and a firehouse reaches FIRE.reach road tiles. Each street keeps two
// spots on its south row free of homes, four tiles either side of the north road; their two firehouses reach the whole
// street (nine tiles either side) and the north road up to the next street. They are built the day the city becomes a
// Town, like a careful player.
const FIRE_DX = [-4, 4];

// Paints a street's south row of homes around its two firehouse spots (the wells at five tiles are skipped as built).
function paintAroundFirehouses(world, ex, y) {
  paintHouses(world, ex - 9, y, ex - 5, y);
  paintHouses(world, ex - 3, y, ex + 3, y);
  paintHouses(world, ex + 5, y, ex + 9, y);
}

// Whether a firehouse standing at f (a building, or a spot being tried) reaches one of the building's road tiles.
function reaches(world, f, b, cache = true) {
  const reach = roadReach(world, f, FIRE.reach, { cache });
  return adjacentRoadTiles(world, b).some((t) => reach.has(t));
}
const reachedByAny = (world, b) => allBuildings(world).some((f) => f.type === 'firehouse' && reaches(world, f, b));

// Gives every building that can burn and stands on a road a firehouse that reaches it: first the streets' spots, then,
// for anything still out of reach (farms far out west on a map whose river lies far off), the nearest free tile that
// reaches it, searched in rings around it.
function addFirehouses(world, streets) {
  const ex = world.tradeEntry.x;
  for (const y of streets) for (const dx of FIRE_DX) place(world, 'firehouse', ex + dx, y + 1);
  for (let guard = 0; guard < 8; guard++) {
    const b = allBuildings(world).find((x) => canBurn(x) && adjacentRoadTiles(world, x).length && !reachedByAny(world, x));
    if (!b) return;
    let spot = null;
    for (let r = 1; r <= 6 && !spot; r++) {
      for (let y = b.y - r; y < b.y + b.d + r && !spot; y++) {
        for (let x = b.x - r; x < b.x + b.w + r && !spot; x++) {
          const onRing = y === b.y - r || y === b.y + b.d + r - 1 || x === b.x - r || x === b.x + b.w + r - 1;
          if (onRing && canPlace(world, 'firehouse', x, y).ok && reaches(world, { x, y, w: 1, d: 1 }, b, false)) spot = [x, y];
        }
      }
    }
    if (!spot) return;
    place(world, 'firehouse', spot[0], spot[1]);
  }
}

// Stage 3 (spec 4.13): a Market town's defences, at the north end of the north road where the raiders' northern entry
// lies: a tower beside the road's end and a barracks across it (both reached by the top street's firehouses). A city
// in debt, or close to it, leaves them for later (their upkeep, wages and pay would sink it further).
const DEFENCE_RESERVE = 1000;
function addDefences(world) {
  const ex = world.tradeEntry.x;
  const top = world.size - 10;
  place(world, 'tower', ex + 1, top - 24);
  place(world, 'barracks', ex - 2, top - 25);
}

// Runs the city day by day until test(world) holds or n days have passed; returns the days run.
function advanceUntil(world, n, test) {
  let d = 0;
  while (d < n && !test(world)) { advanceDays(world, 1); d++; }
  return d;
}

// Stage 2 on top of the village once it is a Town (spec 4.6, 4.7, 4.10): a storehouse, a clay pit and a potter on the
// north road between the streets, and on the first street, beside the start road, a pleasant block: a row of empty
// plots behind four homes, two statues and two gardens behind those, and a booth, so Townhouses there join into Manors.
function addStageTwo(world) {
  const ex = world.tradeEntry.x;
  const top = world.size - 10;
  placeFirst(world, 'storehouse', [[ex + 1, top - 13], [ex - 2, top - 13]]);
  placeFirst(world, 'clay_pit', [[ex - 2, top - 13], [ex + 1, top - 19], [ex - 2, top - 19]]);
  placeFirst(world, 'potter', [[ex + 1, top - 19], [ex - 2, top - 19], [ex + 1, top - 13]]);
  placeFirst(world, 'booth', [[ex - 1, top - 2], [ex - 1, top - 12]]);
  paintHouses(world, ex + 1, top - 2, ex + 4, top - 2);
  for (const x of [ex + 2, ex + 3]) place(world, 'statue', x, top - 1);
  for (const x of [ex + 1, ex + 4]) place(world, 'garden', x, top - 1);
}

// Stage 4 (spec 4.1, 5.7 item 7): the sample city's monuments and palace, where the title backdrop first looks (its
// first drift point, east of the north road between the second and third streets from the start road): a lane east
// from the north road along the free row between those streets, two builders' guilds for the colossus's crews south of
// it, then a colossus under way, a finished small obelisk on a spur below the lane just west of it, and the palace in its
// third style at the lane's end, north of the lane where the streets stop. Laid out so the three stand in one row across
// the screen (obelisk, colossus, palace from left to right, their footprints' middles within 16 px of one height), which
// fits the band under the title card on a phone held upright as well as a laptop. A 600-day sample city is a Town or a
// little more, so what years of play would leave is written as the contract's state: the milestone is lifted for the
// placing as the gold is, the obelisk was finished SHOWCASE_DONE_AGO days ago (so no dedication procession is still
// walking), the colossus is half built (three of its six courses, 60 stone on site and its two crews at work) and the
// palace stands in its third style (pylons). No day runs after it. Returns the ids.
const SHOWCASE_DONE_AGO = 90;
export const SHOWCASE_STYLE = 2;
function addShowcase(world) {
  const ex = world.tradeEntry.x, y = world.size - 24;
  drawRoad(world, ex + 1, y, ex + 9, y);
  drawRoad(world, ex + 7, y + 1, ex + 7, y + 1);    // the obelisk's spur
  const milestone = world.milestone;
  world.milestone = 'great_city';
  const ids = {};
  for (const [key, type, x, yy] of [
    ['guild', 'builders_guild', ex + 3, y + 1], ['guild2', 'builders_guild', ex + 5, y + 1], ['obelisk', 'obelisk_small', ex + 7, y + 2],
    ['colossus', 'colossus', ex + 8, y + 1], ['palace', 'palace', ex + 10, y - 2],
  ]) {
    const r = place(world, type, x, yy);
    if (r.ok) ids[key] = r.id;
  }
  world.milestone = milestone;
  const b = (key) => world.buildings[ids[key]];
  if (ids.obelisk) {
    const done = Math.max(0, world.day - SHOWCASE_DONE_AGO);
    Object.assign(b('obelisk').site, { course: MONUMENTS.obelisk_small.courses.length, done, last: { units: 20, gold: 130, crews: 1 } });
  }
  if (ids.colossus) {
    const crews = [ids.guild, ids.guild2].filter(Boolean);
    Object.assign(b('colossus').site, {
      course: 3, laid: { stone: 64, bricks: 0 }, stock: { stone: 60, bricks: 0 }, crews, idle: 0, reason: null,
      last: { units: 20 * crews.length, gold: 130 * crews.length, crews: crews.length },
    });
  }
  if (ids.palace) b('palace').style = SHOWCASE_STYLE;
  return ids;
}

export function buildSampleCity(world, { days = 360, stageTwoDays = 240 } = {}) {
  const gold = world.gold;
  world.gold = 1e9;
  const ex = world.tradeEntry.x;
  const top = world.size - 10;                      // the start road already runs up to y = size - 9
  drawRoad(world, ex, top, ex, top - 24);
  const streets = [top - 4, top - 10, top - 16, top - 22];
  for (const y of streets) {
    drawRoad(world, ex, y, ex + 9, y);
    roadWest(world, ex, y, ex - 9);   // tile by tile, so the river can cut a street short without losing it
  }
  for (const y of streets) {
    place(world, 'well', ex - 5, y + 1);
    place(world, 'well', ex + 5, y + 1);
  }
  place(world, 'bazaar', ex + 1, top - 9);
  place(world, 'temple', ex - 3, top - 15);
  place(world, 'granary', ex + 1, top - 21);
  // Farms need fertile land, which lies west towards the river: run the lowest street out and try spots.
  const westEnd = roadWest(world, ex - 9, top - 4, 1);
  let farms = 0;
  for (let x = ex - 4; x >= westEnd && farms < 3; x--) if (place(world, 'farm_grain', x, top - 6).ok) { farms++; x--; }
  // The farms' granary beside the north road (within their reach and the bazaar's), else past them on the lowest
  // street; and a second temple on the north road for the two lower streets.
  placeFirst(world, 'granary', [[ex - 2, top - 7], [ex - 12, top - 3]]);
  place(world, 'temple', ex + 1, top - 7);
  for (const y of streets) {
    paintAroundFirehouses(world, ex, y + 1);
    paintHouses(world, ex - 9, y - 1, ex + 9, y - 1);
  }
  world.gold = gold;
  const untilTown = advanceUntil(world, days, (w) => atLeast(w, 'town'));
  if (atLeast(world, 'town')) {
    const spent = world.gold;
    world.gold = 1e9;
    addFirehouses(world, streets);
    world.gold = spent;
  }
  advanceDays(world, days - untilTown);
  if (stageTwoDays > 0 && world.milestone !== 'village') {
    const spent = world.gold;
    world.gold = 1e9;
    addStageTwo(world);
    addFirehouses(world, streets);                  // anything Stage 2 laid out of reach
    if (spent >= DEFENCE_RESERVE) addDefences(world);
    world.gold = spent;
    advanceDays(world, stageTwoDays);
  }
  if (stageTwoDays > 0) {
    const spent = world.gold;
    world.gold = 1e9;
    addShowcase(world);
    addFirehouses(world, streets);                  // the guilds burn like any workshop
    world.gold = spent;
  }
  assignLabour(world);
  return world;
}

// A road along row y, split wherever the river or a building (the stress city's monument sites) crosses it.
function roadRow(world, y) {
  let start = null;
  for (let x = 0; x <= world.size; x++) {
    const blocked = x === world.size || water(world, x, y) || Boolean(world.occ[idx(world.size, x, y)]);
    if (!blocked && start === null) start = x;
    if (blocked && start !== null) {
      if (x - 1 > start) drawRoad(world, start, y, x - 1, y);
      start = null;
    }
  }
}

// Every building the stress city cycles through, Stage 2's and Stage 3's included, so the frame draws them all at once
// (a farm only takes where the land is fertile).
const STRESS_SERVICES = [
  'well', 'bazaar', 'temple', 'granary', 'farm_grain', 'well', 'granary', 'storehouse', 'potter', 'booth', 'clay_pit',
  'brewery', 'garden', 'weaver', 'statue', 'jeweller', 'trading_post', 'farm_fig', 'farm_barley', 'farm_flax',
  'firehouse', 'tower', 'barracks',
];

// Stage 4 (spec 5.7, 9): three monument sites in the middle of the stress city, for the live draw's budget (three sites
// within 1 ms a frame): a great pyramid (laid before the roads, which part round it), a large mastaba and a colossus, each
// at a course part way up with stone and bricks on site, and six builders' guilds beside them. [type, x, y] from the
// map's middle; STRESS_SITE_STATE is each site's state, written after the city's days have run (as years of crews would
// leave it), its crews the guilds the sim's crew plan sends it.
const STRESS_SITES = [['pyramid_great', 2, -5], ['mastaba_large', -5, -1], ['colossus', -8, 0]];
const STRESS_GUILDS = [[-12, 3], [-10, 3], [-5, 3], [-3, 3], [-1, 3], [1, 3]];
const STRESS_SITE_STATE = {
  pyramid_great: { course: 5, laid: { stone: 510, bricks: 90 }, stock: { stone: 150, bricks: 60 } },
  mastaba_large: { course: 2, laid: { stone: 0, bricks: 480 }, stock: { stone: 0, bricks: 120 } },
  colossus: { course: 3, laid: { stone: 64, bricks: 0 }, stock: { stone: 60, bricks: 0 } },
};

export function buildStressCity(world, { days = 60 } = {}) {
  const gold = world.gold;
  world.gold = 1e9;
  world.milestone = 'capital';   // a fixture: every building unlocked, as the homes below are filled directly
  world.prestigeUnlocks.pyramid_great = world.day;   // and the great pyramid's prestige unlock with it
  const size = world.size;
  const mid = Math.floor(size / 2);
  const sites = STRESS_SITES.map(([type, dx, dy]) => place(world, type, mid + dx, mid + dy, { roadLater: true })).filter((r) => r.ok).map((r) => r.id);
  for (const [dx, dy] of STRESS_GUILDS) place(world, 'builders_guild', mid + dx, mid + dy, { roadLater: true });
  const services = STRESS_SERVICES;
  for (let y = 2; y < size - 1; y += 4) roadRow(world, y);
  for (let y = 2; y < size - 3; y += 4) {
    for (let x = 1; x < size - 2; x += 7) place(world, services[(x / 7 + y / 4) % services.length | 0], x, y + 1);
  }
  for (let y = 2; y < size - 1; y += 4) {
    paintHouses(world, 0, y - 1, size - 1, y - 1);
    if (y + 1 < size) paintHouses(world, 0, y + 1, size - 1, y + 1);
  }
  // Fill the homes directly: a stress fixture needs a crowded frame now, not after years of arrivals. Tiers 1 to 5:
  // the one-tile tiers (Manors and up need merged squares, which this street pattern has no room for).
  for (const h of housesOf(world)) {
    h.tier = 1 + ((h.x * 7 + h.y * 13) % 5);
    h.residents = TIERS[h.tier].capacity;
  }
  world.gold = gold;
  advanceDays(world, days);
  const plan = crewPlan(world);
  for (const id of sites) {
    const b = world.buildings[id];
    const crews = [...plan].filter(([, s]) => s === id).map(([g]) => g);
    Object.assign(b.site, { ...STRESS_SITE_STATE[b.type], crews, idle: 0, reason: null });
  }
  assignLabour(world);
  return world;
}
