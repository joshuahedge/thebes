// Combat and soldiers (spec 4.13). Stage 3 contract: Track B implements the STUBs; raidDay (raids.js) calls them.
//
// world.soldiers: one entry per trained soldier, ascending id: { id, barracks, x, y, hp, hit, task }
//   barracks: the id of the barracks that trained it; x, y: tile coordinates (may be fractional); hp: UNITS.soldier.hp
//   down to 1 (a soldier at 0 is wounded and leaves the list); hit: hurt at least once; task: 'wait' | 'out' | 'back'.
// A barracks keeps its training progress in its own b.progress (days of training at full staff towards
// DEFENCE.trainDays). Raiders live in world.raid.active.raiders.
//
// Distances are straight lines between points in tile coordinates (a building's point is its footprint's centre, a
// unit's its x, y). "Beside" is within BESIDE (one tile). Soldiers walk straight towards their raider or their barracks,
// over walls and buildings (they are the city's own; only raiders are kept out). A soldier whose barracks is gone
// (burned or demolished) leaves service. A tower on a wall tile falls when raiders break that tile (the tile becomes a
// breach, the tower is removed with no rubble). Each fallen raider is counted once, for whatever hit it last: a tower
// (raid.active.byTowers, tally.raidersByTowers) or a soldier (bySoldiers, raidersBySoldiers).
// Fields Track B adds to raid.active (raids.js): blocked (the tile index of the standing wall in the band's way, or
// null) and towerIds (the towers that have shot during this raid, for the report's tower count).
import { UNITS, DEFENCE } from '../data/raids.js';
import { allBuildings, removeBuilding } from './world.js';
import { isWorking, staffRatio } from './labour.js';

export const BESIDE = 1;

const centre = (b) => ({ x: b.x + b.w / 2, y: b.y + b.d / 2 });
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const alive = (u) => u.hp > 0;

function nearest(from, list) {
  let best = null, bd = Infinity;
  for (const u of list) {
    const d = dist(from, u);
    if (d < bd) { bd = d; best = u; }
  }
  return best;
}

// Moves a unit up to `by` tiles straight towards a point, stopping `short` of it.
function stepTowards(u, to, by, short = 0) {
  const d = dist(u, to);
  const move = Math.min(by, d - short);
  if (move <= 0) return;
  u.x += ((to.x - u.x) * move) / d;
  u.y += ((to.y - u.y) * move) / d;
}

// The point a soldier waits at: its barracks' centre (or where it stands, if the barracks has just gone).
function homeOf(world, s) {
  const b = world.buildings[s.barracks];
  return b ? centre(b) : { x: s.x, y: s.y };
}

function walkHome(world, s) {
  const home = homeOf(world, s);
  stepTowards(s, home, UNITS.soldier.speed);
  if (dist(s, home) < 1e-6) { s.x = home.x; s.y = home.y; s.task = 'wait'; }
  else s.task = 'back';
}

// Soldiers with no raid to fight walk back to their barracks and wait there (raids.js, every day without a raid).
export function soldiersHome(world) {
  for (const s of world.soldiers) if (s.task !== 'wait') walkHome(world, s);
}

// Trains soldiers for the day: each barracks at 25% staff or more (isWorking) adds its staffing ratio to b.progress
// and, at DEFENCE.trainDays, trains one soldier (up to DEFENCE.soldiersPerBarracks of its own), placed at the barracks'
// centre, waiting. A full barracks gathers no progress; a wounded soldier's place is trained again. Soldiers of a
// barracks that no longer stands leave service first.
export function trainSoldiers(world, events = null) {
  if (world.soldiers.some((s) => !world.buildings[s.barracks] || world.buildings[s.barracks].type !== 'barracks')) {
    world.soldiers = world.soldiers.filter((s) => world.buildings[s.barracks] && world.buildings[s.barracks].type === 'barracks');
  }
  for (const b of allBuildings(world)) {
    if (b.type !== 'barracks') continue;
    if (world.soldiers.filter((s) => s.barracks === b.id).length >= DEFENCE.soldiersPerBarracks || !isWorking(world, b)) continue;
    b.progress += staffRatio(world, b);
    if (b.progress < DEFENCE.trainDays - 1e-9) continue;   // 5/6 staffing adds up in floating point
    b.progress = 0;
    const c = centre(b);
    world.soldiers.push({ id: world.nextUnitId++, kind: 'soldier', barracks: b.id, x: c.x, y: c.y, hp: UNITS.soldier.hp, hit: false, task: 'wait' });   // kind: Stage 4.6 (src/data/armies.js)
  }
}

// A raider's blows break a standing wall tile: it becomes a breach (wallVersion goes up) and a tower on it falls.
function breakTile(world, i) {
  world.wall[i] = -1;
  world.wallVersion++;
  const id = world.occ[i];
  if (id && world.buildings[id] && world.buildings[id].type === 'tower') removeBuilding(world, id);
}

// One day of fighting while a raid is under way (spec 4.13), in this order:
//   towers: each working tower deals DEFENCE.towerDamage x its staffing ratio to the nearest raider within
//     DEFENCE.towerRange of its centre, and the shot is kept in raid.active.shots ({ from, to } points) for the arrows;
//   soldiers: each soldier with a raider within DEFENCE.patrol of its barracks' centre goes out ('out') to the nearest
//     one: beside it, it deals UNITS.soldier.damage; else it walks up to UNITS.soldier.speed tiles towards it. With none
//     in its patrol it walks home;
//   raiders: each raider beside a soldier deals UNITS.raider.damage to the nearest; otherwise, while the band is
//     blocked by a standing wall tile (active.blocked), it deals that to the tile, which breaks at 0.
// Then wounded soldiers leave service (tally.soldiersWounded) and fallen raiders leave the band (byTowers, bySoldiers and
// their tallies). Returns { fighting, fightingBands }: whether a raider and a soldier traded blows today, and which bands
// (0, or 1 of a two-sided raid) had a raider in those blows (a band that fought waits).
export function combatDay(world, events = null) {
  const a = world.raid.active;
  if (!a) return { fighting: false, fightingBands: [] };
  if (!a.towerIds) a.towerIds = [];
  a.shots = [];
  const killer = new Map();   // raider id -> 'tower' | 'soldier', set as it falls
  const hurt = (r, dmg, by) => {
    r.hp -= dmg;
    r.hit = true;
    if (r.hp <= 0 && !killer.has(r.id)) killer.set(r.id, by);
  };
  for (const t of allBuildings(world)) {
    if (t.type !== 'tower' || !isWorking(world, t)) continue;
    const c = centre(t);
    const foe = nearest(c, a.raiders.filter((r) => alive(r) && dist(c, r) <= DEFENCE.towerRange));
    if (!foe) continue;
    hurt(foe, DEFENCE.towerDamage * staffRatio(world, t), 'tower');
    a.shots.push({ from: c, to: { x: foe.x, y: foe.y } });
    if (!a.towerIds.includes(t.id)) a.towerIds.push(t.id);
  }
  let fighting = false;
  const fought = new Set();
  for (const s of world.soldiers) {
    const home = homeOf(world, s);
    const foe = nearest(s, a.raiders.filter((r) => alive(r) && dist(home, r) <= DEFENCE.patrol));
    if (!foe) { if (s.task !== 'wait') walkHome(world, s); continue; }
    s.task = 'out';
    if (dist(s, foe) <= BESIDE) { hurt(foe, UNITS.soldier.damage, 'soldier'); fighting = true; fought.add(foe.band ? 1 : 0); }
    else stepTowards(s, foe, UNITS.soldier.speed, 0.8);
  }
  for (const r of a.raiders) {
    if (!alive(r)) continue;
    const foe = nearest(r, world.soldiers.filter((s) => alive(s) && dist(r, s) <= BESIDE));
    if (foe) {
      foe.hp -= UNITS.raider.damage;
      foe.hit = true;
      fighting = true;
      fought.add(r.band ? 1 : 0);
    } else {
      const blocked = (r.band && a.second ? a.second : a).blocked;   // the wall tile in this raider's band's way
      if (blocked !== null && blocked !== undefined && world.wall[blocked] > 0) {
        world.wall[blocked] = Math.max(0, world.wall[blocked] - UNITS.raider.damage);
        if (world.wall[blocked] === 0) breakTile(world, blocked);
      }
    }
  }
  const wounded = world.soldiers.filter((s) => !alive(s)).length;
  if (wounded) {
    world.soldiers = world.soldiers.filter(alive);
    world.tally.soldiersWounded += wounded;
  }
  for (const r of a.raiders) {
    if (alive(r)) continue;
    if (killer.get(r.id) === 'tower') { a.byTowers++; world.tally.raidersByTowers++; }
    else { a.bySoldiers++; world.tally.raidersBySoldiers++; }
  }
  a.raiders = a.raiders.filter(alive);
  return { fighting, fightingBands: [...fought].sort() };
}
