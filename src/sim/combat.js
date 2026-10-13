// Combat and soldiers (spec 4.13). Stage 3 contract: Track B implements the STUBs; raidDay (raids.js) calls them.
// Stage 4.6 (Armies track, rulings 340-341, 380-389): three unit kinds and four enemy kinds, read from src/data/armies.js.
//
// world.soldiers: one entry per trained unit of every kind, ascending id: { id, kind, barracks, x, y, hp, hit, task }
//   kind: 'soldier' | 'archer' | 'chariot' (a unit with none is a soldier); barracks: the id of the building that trained it (a
//   barracks, an archery range or a stables: UNIT_TYPES[kind].building); x, y: tile coordinates (may be fractional); hp: its kind's
//   hit points down to 1 (a unit at 0 is wounded and leaves the list); hit: hurt at least once; task: 'wait' | 'out' | 'back'.
// A training building keeps its progress in its own b.progress (days of training at full staff towards its kind's trainDays).
// Raiders live in world.raid.active.raiders, each with kind (ENEMY_KINDS; 'foot' when it has none).
//
// Distances are straight lines between points in tile coordinates (a building's point is its footprint's centre, a unit's its x, y).
// "Beside" is within BESIDE (one tile). Soldiers and archers walk straight towards their post, foe or building, over walls and
// buildings (they are the city's own; only raiders are kept out); chariots drive straight but stop short of a wall, gate or water
// tile (ruling 340: they cannot pass a gate). A unit whose building is gone (burned or demolished) leaves service. A tower on a wall
// tile falls when raiders break that tile (the tile becomes a breach, the tower is removed with no rubble); a tower on open ground
// falls when enemy archers have dealt it ARMY.towerHp in one raid (active.towerHits). Each fallen raider is counted once, for
// whatever hit it last: a tower (byTowers, tally.raidersByTowers), a soldier (bySoldiers, raidersBySoldiers), an archer (byArchers,
// raidersByArchers) or a chariot (byChariots, raidersByChariots).
//
// Situations (ruling 380): a unit's damage is its kind's damage times the matchup (MATCHUPS[unit][enemy][situation]) of every
// situation that applies at its tile (situationsAt), multiplied together, and for chariots times ARMY.hungry while their horses
// went unfed (world.army.fed false).
// Fields Track B adds to raid.active (raids.js): blocked (the tile index of the standing wall in the band's way, or
// null) and towerIds (the towers that have shot during this raid, for the report's tower count).
import { DEFENCE } from '../data/raids.js';
import { UNIT_TYPES, UNIT_OF_BUILDING, ENEMY_TYPES, ARMY, matchup } from '../data/armies.js';
import { allBuildings, removeBuilding } from './world.js';
import { isWorking, staffRatio } from './labour.js';
import { idx, inBounds } from './grid.js';
import { T } from './terrain.js';

export const BESIDE = 1;

const centre = (b) => ({ x: b.x + b.w / 2, y: b.y + b.d / 2 });
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const alive = (u) => u.hp > 0;
const kindOf = (u) => u.kind || 'soldier';
const enemyOf = (r) => r.kind || 'foot';
const unitDef = (u) => UNIT_TYPES[kindOf(u)] || UNIT_TYPES.soldier;
const enemyDef = (r) => ENEMY_TYPES[enemyOf(r)] || ENEMY_TYPES.foot;

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

// The tile index under a point, or -1 off the map.
const tileOf = (world, pt) => {
  const x = Math.floor(pt.x), y = Math.floor(pt.y);
  return inBounds(world.size, x, y) ? idx(world.size, x, y) : -1;
};

// Whether a straight line from a to b crosses only tiles that pass(i) allows (checked every quarter tile, the end included).
function clearLine(world, a, b, pass) {
  const d = dist(a, b), steps = Math.max(1, Math.ceil(d * 4));
  for (let s = 1; s <= steps; s++) {
    const i = tileOf(world, { x: a.x + ((b.x - a.x) * s) / steps, y: a.y + ((b.y - a.y) * s) / steps });
    if (i < 0 || !pass(i)) return false;
  }
  return true;
}

// A chariot's ground (ruling 340): no standing wall or gate, no water but a bridge.
const chariotGround = (world) => (i) => !(world.wall[i] > 0) && (world.terrain[i] !== T.WATER || Boolean(world.road[i]));
// An enemy chariot's charge (ruling 341): neither, nor rocky ground.
const chargeGround = (world) => { const g = chariotGround(world); return (i) => g(i) && world.terrain[i] !== T.ROCKY; };

// Moves a chariot up to `by` tiles towards a point, stopping `short` of it and before any tile it cannot drive onto (it stays put
// when the first quarter tile is barred).
function driveTowards(world, u, to, by, short = 0) {
  const d = dist(u, to);
  const move = Math.min(by, d - short);
  if (move <= 0) return;
  const ok = chariotGround(world), steps = Math.max(1, Math.ceil(move * 4));
  let k = 0;
  for (let s = 1; s <= steps; s++) {
    const f = (move * s) / steps / d;
    if (!ok(tileOf(world, { x: u.x + (to.x - u.x) * f, y: u.y + (to.y - u.y) * f }))) break;
    k = s;
  }
  if (!k) return;
  const f = (move * k) / steps / d;
  u.x += (to.x - u.x) * f;
  u.y += (to.y - u.y) * f;
}

// The situations at a unit's tile against a foe (ruling 380), in SITUATIONS order: wall (a standing wall tile or a tower on or next
// to its tile), melee (the foe within BESIDE), open or nearWall (no standing wall / one within ARMY.wallNear tiles, square), gate (a
// gate or a breach on or next to its tile).
export function situationsAt(world, at, foe = null) {
  const n = world.size, cx = Math.floor(at.x), cy = Math.floor(at.y);
  let wall = false, near = false, gate = false;
  const r = ARMY.wallNear;
  for (let y = cy - r; y <= cy + r; y++) for (let x = cx - r; x <= cx + r; x++) {
    if (!inBounds(n, x, y)) continue;
    const i = idx(n, x, y), v = world.wall[i];
    const close = Math.abs(x - cx) <= 1 && Math.abs(y - cy) <= 1;
    if (v > 0) near = true;
    if (close && (v > 0 || (world.occ[i] && world.buildings[world.occ[i]] && world.buildings[world.occ[i]].type === 'tower'))) wall = true;
    if (close && (v < 0 || (v > 0 && world.road[i]))) gate = true;
  }
  const out = [];
  if (wall) out.push('wall');
  if (foe && dist(at, foe) <= BESIDE) out.push('melee');
  out.push(near ? 'nearWall' : 'open');
  if (gate) out.push('gate');
  return out;
}

// The damage a unit deals a raider today: its kind's damage x every situation's matchup x the horses' feed for chariots.
export function unitDamage(world, u, foe) {
  const kind = kindOf(u);
  let f = unitDef(u).damage;
  for (const s of situationsAt(world, u, foe)) f *= matchup(kind, enemyOf(foe), s);
  if (kind === 'chariot' && world.army && world.army.fed === false) f *= ARMY.hungry;
  return f;
}

// The point a unit waits at: its building's centre (or where it stands, if the building has just gone).
function homeOf(world, s) {
  const b = world.buildings[s.barracks];
  return b ? centre(b) : { x: s.x, y: s.y };
}

function walkHome(world, s) {
  const home = homeOf(world, s);
  const speed = unitDef(s).speed;
  if (kindOf(s) === 'chariot') driveTowards(world, s, home, speed);
  else stepTowards(s, home, speed);
  if (dist(s, home) < 1e-6 || (kindOf(s) === 'chariot' && dist(s, home) < 0.5 && dist(s, home) > 0)) { s.x = home.x; s.y = home.y; s.task = 'wait'; }
  else s.task = 'back';
}

// Units with no raid to fight walk back to their building and wait there (raids.js, every day without a raid). A chariot that a
// wall keeps from its stables waits where it stops.
export function soldiersHome(world) {
  for (const s of world.soldiers) {
    if (s.task === 'wait') continue;
    const was = { x: s.x, y: s.y };
    walkHome(world, s);
    if (s.task === 'back' && kindOf(s) === 'chariot' && was.x === s.x && was.y === s.y) s.task = 'wait';
  }
}

// Trains units for the day (rulings 340, 381): each barracks, archery range and stables at 25% staff or more (isWorking) adds its
// staffing ratio to b.progress and, at its kind's trainDays, trains one unit (up to its kind's perBuilding of its own), placed at the
// building's centre, waiting, at its kind's hit points; tally.archersTrained and chariotsTrained count archers and chariots. A full
// building gathers no progress; a wounded unit's place is trained again. Units of a building that no longer stands (or is no longer
// its kind's) leave service first; units away at the capital keep their place (they come back to it).
export function trainSoldiers(world, events = null) {
  const own = (s) => world.buildings[s.barracks] && world.buildings[s.barracks].type === unitDef(s).building;
  if (world.soldiers.some((s) => !own(s))) world.soldiers = world.soldiers.filter(own);
  const away = (world.army && world.army.away) || [];
  for (const b of allBuildings(world)) {
    const kind = UNIT_OF_BUILDING[b.type];
    if (!kind) continue;
    const def = UNIT_TYPES[kind];
    const have = world.soldiers.filter((s) => s.barracks === b.id).length + away.filter((u) => u.barracks === b.id).length;
    if (have >= def.perBuilding || !isWorking(world, b)) continue;
    b.progress = (b.progress || 0) + staffRatio(world, b);
    if (b.progress < def.trainDays - 1e-9) continue;   // 5/6 staffing adds up in floating point
    b.progress = 0;
    const c = centre(b);
    world.soldiers.push({ id: world.nextUnitId++, kind, barracks: b.id, x: c.x, y: c.y, hp: def.hp, hit: false, task: 'wait' });
    if (kind === 'archer' && world.tally.archersTrained !== undefined) world.tally.archersTrained++;
    if (kind === 'chariot' && world.tally.chariotsTrained !== undefined) world.tally.chariotsTrained++;
  }
}

// A raider's blows break a standing wall tile: it becomes a breach (wallVersion goes up) and a tower on it falls.
function breakTile(world, i) {
  world.wall[i] = -1;
  world.wallVersion++;
  const id = world.occ[i];
  if (id && world.buildings[id] && world.buildings[id].type === 'tower') removeBuilding(world, id);
}

// An archer's post (ruling 380): the standing wall tile (or a tower's tile) nearest the archer, within its patrol of its building,
// from which the foe is in range but not beside; posts other archers took today are passed over while another is free. null when
// none (the archer then closes to its range in the open).
function archerPost(world, u, foe, home, taken) {
  const def = UNIT_TYPES.archer, n = world.size, r = Math.ceil(def.range);
  let best = null, bd = Infinity, free = null, fd = Infinity;
  for (let y = Math.floor(foe.y) - r; y <= Math.floor(foe.y) + r; y++) for (let x = Math.floor(foe.x) - r; x <= Math.floor(foe.x) + r; x++) {
    if (!inBounds(n, x, y)) continue;
    const i = idx(n, x, y);
    const tower = world.occ[i] && world.buildings[world.occ[i]] && world.buildings[world.occ[i]].type === 'tower';
    if (!(world.wall[i] > 0) && !tower) continue;
    const pt = { x: x + 0.5, y: y + 0.5 }, df = dist(pt, foe);
    if (df > def.range || df <= BESIDE + 0.25 || dist(pt, home) > def.patrol) continue;
    const d = dist(pt, u);
    if (d < bd) { bd = d; best = pt; }
    if (!taken.has(i) && d < fd) { fd = d; free = { ...pt, i }; }
  }
  if (free) { taken.add(free.i); return free; }
  return best;
}

// One day of fighting while a raid is under way (spec 4.13, rulings 340-341, 380-389), in this order:
//   towers: each working tower deals DEFENCE.towerDamage x its staffing ratio to the nearest raider within
//     DEFENCE.towerRange of its centre, and the shot is kept in raid.active.shots ({ from, to, by: 'tower' } points) for the arrows;
//   units: each unit with a raider within its kind's patrol of its building goes out ('out') to the nearest one; with none in its
//     patrol it walks home. A soldier beside it deals its damage, else walks up to its speed towards it. An archer makes for its post
//     (archerPost) or, with none, for a spot at its range, then shoots the foe if it is within range (a shot by 'archer'). A chariot
//     beside it deals its damage, else drives towards it (it cannot pass a wall, gate or water);
//   raiders: each raider beside a unit deals its kind's damage to the nearest. Otherwise an enemy archer shoots the nearest tower
//     within its range (a tower on a wall tile through the tile's hit points, which break at 0; one on open ground until it has
//     taken ARMY.towerHp, then it falls), else the nearest unit within it (a shot by 'enemy'); an enemy chariot charges the
//     nearest unit within its charge along a clear line (no wall, gate, water or rocky ground) and strikes it; a raider that breaks
//     walls hits the standing wall tile in its band's way (active.blocked), which breaks at 0.
// Then wounded units leave service (tally.soldiersWounded) and fallen raiders leave the band (byTowers, bySoldiers, byArchers,
// byChariots and their tallies). Returns { fighting, fightingBands }: whether a raider and a unit traded blows beside each other
// today, and which bands (0, or 1 of a two-sided raid) had a raider in those blows (a band that fought waits). Shots from range
// do not hold a band.
export function combatDay(world, events = null) {
  const a = world.raid.active;
  if (!a) return { fighting: false, fightingBands: [] };
  if (!a.towerIds) a.towerIds = [];
  if (a.byArchers === undefined) a.byArchers = 0;
  if (a.byChariots === undefined) a.byChariots = 0;
  a.shots = [];
  const killer = new Map();   // raider id -> 'tower' | 'soldier' | 'archer' | 'chariot', set as it falls
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
    a.shots.push({ from: c, to: { x: foe.x, y: foe.y }, by: 'tower' });
    if (!a.towerIds.includes(t.id)) a.towerIds.push(t.id);
  }
  let fighting = false;
  const fought = new Set();
  const posts = new Set();
  for (const s of world.soldiers) {
    const home = homeOf(world, s), def = unitDef(s), kind = kindOf(s);
    const foe = nearest(s, a.raiders.filter((r) => alive(r) && dist(home, r) <= def.patrol));
    if (!foe) { if (s.task !== 'wait') walkHome(world, s); continue; }
    s.task = 'out';
    if (kind === 'archer') {
      const post = archerPost(world, s, foe, home, posts);
      if (post) stepTowards(s, post, def.speed);
      else if (dist(s, foe) > def.range) stepTowards(s, foe, def.speed, def.range - 0.2);
      if (dist(s, foe) <= def.range) {
        hurt(foe, unitDamage(world, s, foe), 'archer');
        a.shots.push({ from: { x: s.x, y: s.y }, to: { x: foe.x, y: foe.y }, by: 'archer' });
        if (dist(s, foe) <= BESIDE) { fighting = true; fought.add(foe.band ? 1 : 0); }
      }
      continue;
    }
    if (dist(s, foe) <= BESIDE) { hurt(foe, unitDamage(world, s, foe), kind); fighting = true; fought.add(foe.band ? 1 : 0); }
    else if (kind === 'chariot') driveTowards(world, s, foe, def.speed, 0.8);
    else stepTowards(s, foe, def.speed, 0.8);
  }
  for (const r of a.raiders) {
    if (!alive(r)) continue;
    const e = enemyDef(r), kind = enemyOf(r);
    const live = world.soldiers.filter(alive);
    const foe = nearest(r, live.filter((s) => dist(r, s) <= BESIDE));
    if (foe) {
      foe.hp -= e.damage;
      foe.hit = true;
      fighting = true;
      fought.add(r.band ? 1 : 0);
      continue;
    }
    if (kind === 'archer') {
      if (shootTower(world, a, r, e)) continue;
      const mark = nearest(r, live.filter((s) => dist(r, s) <= e.range));
      if (mark) {
        mark.hp -= e.damage;
        mark.hit = true;
        a.shots.push({ from: { x: r.x, y: r.y }, to: { x: mark.x, y: mark.y }, by: 'enemy' });
      }
      continue;
    }
    if (kind === 'chariot') {
      const pass = chargeGround(world);
      const mark = nearest(r, live.filter((s) => dist(r, s) <= e.charge && clearLine(world, r, s, pass)));
      if (mark) {
        stepTowards(r, mark, e.charge, 0.8);
        mark.hp -= e.damage;
        mark.hit = true;
        fighting = true;
        fought.add(r.band ? 1 : 0);
      }
      continue;
    }
    if (!e.breaksWalls) continue;
    const blocked = (r.band && a.second ? a.second : a).blocked;   // the wall tile in this raider's band's way
    if (blocked !== null && blocked !== undefined && world.wall[blocked] > 0) {
      world.wall[blocked] = Math.max(0, world.wall[blocked] - e.damage);
      if (world.wall[blocked] === 0) breakTile(world, blocked);
    }
  }
  const wounded = world.soldiers.filter((s) => !alive(s)).length;
  if (wounded) {
    world.soldiers = world.soldiers.filter(alive);
    world.tally.soldiersWounded += wounded;
  }
  const BY = { tower: ['byTowers', 'raidersByTowers'], soldier: ['bySoldiers', 'raidersBySoldiers'], archer: ['byArchers', 'raidersByArchers'], chariot: ['byChariots', 'raidersByChariots'] };
  for (const r of a.raiders) {
    if (alive(r)) continue;
    const [field, tally] = BY[killer.get(r.id)] || BY.soldier;
    a[field] = (a[field] || 0) + 1;
    if (world.tally[tally] !== undefined) world.tally[tally]++;
  }
  a.raiders = a.raiders.filter(alive);
  return { fighting, fightingBands: [...fought].sort() };
}

// An enemy archer's shot at the nearest tower within its range (ruling 341): a tower on a standing wall tile loses the tile's hit
// points (it breaks at 0 and the tower falls); a tower on open ground keeps the damage in active.towerHits and falls at ARMY.towerHp
// (active.towersLost counts the fallen). Returns whether it shot.
function shootTower(world, a, r, e) {
  const towers = allBuildings(world).filter((b) => b.type === 'tower' && dist(centre(b), r) <= e.range);
  const t = nearest(r, towers.map((b) => ({ b, ...centre(b) })));
  if (!t) return false;
  const b = t.b, i = idx(world.size, b.x, b.y);
  a.shots.push({ from: { x: r.x, y: r.y }, to: { x: b.x, y: b.y }, by: 'enemy' });
  if (world.wall[i] > 0) {
    world.wall[i] = Math.max(0, world.wall[i] - e.damage);
    if (world.wall[i] === 0) { breakTile(world, i); a.towersLost = (a.towersLost || 0) + 1; }
    return true;
  }
  if (!a.towerHits) a.towerHits = {};
  a.towerHits[b.id] = (a.towerHits[b.id] || 0) + e.damage;
  if (a.towerHits[b.id] >= ARMY.towerHp) {
    removeBuilding(world, b.id);
    delete a.towerHits[b.id];
    a.towersLost = (a.towersLost || 0) + 1;
  }
  return true;
}

// The hit points a raider of a kind arrives with (raids.js arrive).
export const raiderHp = (kind) => (ENEMY_TYPES[kind] || ENEMY_TYPES.foot).hp;
