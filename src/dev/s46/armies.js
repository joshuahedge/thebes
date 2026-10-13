// Stage 4.6, the Armies track's dev scenes (open /?skipTitle=1&nosw=1&seed=11&sample=1 first):
//   s46-mixed-raid  a mixed raid mid-fight north of the town: raiders on foot hammering the gate, enemy archers shooting a tower, enemy
//                   chariots riding at your chariots in the open beyond the wall, and your archers on the wall shooting down at them
//   s46-raid-sheet  a later raid's warning with archers and chariots in its mix, its raid sheet open: the mix in the title and what
//                   helps against each kind (the tribute sheet, which is also the raid sheet on phones)
// Motion is left as the caller set it (tools/shots.ps1 and tests/screenshot.ps1 set it before the scene).
import { inGame, wait } from './base.js';
import { place, canPlace, drawRoad } from '../../sim/commands.js';
import { assignLabour } from '../../sim/labour.js';
import { allBuildings, makeBuilding, insertBuilding } from '../../sim/world.js';
import { raidSize, tributeFor, raidTargetKind, entryDir } from '../../sim/raids.js';
import { drawMix } from '../../sim/armies.js';
import { raiderHp } from '../../sim/combat.js';
import { idx, inBounds } from '../../sim/grid.js';
import { T as TERRAIN } from '../../sim/terrain.js';
import { DEFENCE, RAIDS } from '../../data/raids.js';
import { UNIT_TYPES, footMix } from '../../data/armies.js';
import { screenToTile } from '../../render/camera.js';
import { freeTop } from '../../ui/layout.js';

const freeLand = (world, x, y) => inBounds(world.size, x, y) && !world.occ[idx(world.size, x, y)] && world.terrain[idx(world.size, x, y)] !== TERRAIN.WATER;

// The camera on a map point, in the middle of the map's free area (as the Stage 3 scenes' focus).
function focus(g, x, y, kind = 'browse') {
  const c0 = g.ui.cameraControl.centre(), v = { width: c0.x * 2, height: c0.y * 2 };
  const map = document.querySelector('#map');
  const layout = g.ui.store.get().layout, top = freeTop(map && map.parentElement, map, layout);
  const i = layout === 'portrait'
    ? { top, left: 0, right: 0, bottom: kind === 'sheet' ? v.height * 0.6 : v.height * 0.2 }
    : { top, left: 0, bottom: 0, right: layout === 'compact' ? 56 + 268 : 320 };
  const midX = i.left + (v.width - i.left - i.right) / 2, midY = i.top + (v.height - i.top - i.bottom) / 2;
  const c = screenToTile({ x, y, zoom: g.cam.zoom }, v, v.width - midX, v.height - midY);
  g.ui.cameraControl.jumpTo(c.x, c.y);
}

// The north road's last tile (the sample city's main road runs north from the trade entry).
function northRoadEnd(world) {
  const ex = world.tradeEntry.x;
  let y = world.size - 10;
  while (y > 0 && world.road[idx(world.size, ex, y - 1)]) y--;
  return { x: ex, y };
}

// Places a building of `type` at the free spot nearest (x, y) that the commands allow, else puts it there as the dev scenes do.
function placeNear(world, type, x, y) {
  for (let r = 0; r <= 6; r++) {
    for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
      if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
      if (canPlace(world, type, x + dx, y + dy).ok) return world.buildings[place(world, type, x + dx, y + dy).id];
    }
  }
  return insertBuilding(world, makeBuilding(world, type, x, y));
}

const unit = (world, kind, b, x, y, hp = UNIT_TYPES[kind].hp) => ({ id: world.nextUnitId++, kind, barracks: b.id, x, y, hp, hit: hp < UNIT_TYPES[kind].hp, task: 'out' });
const raider = (world, kind, x, y, hp = raiderHp(kind)) => ({ id: world.nextUnitId++, kind, x, y, hp, hit: hp < raiderHp(kind) });

async function mixedRaid(api) {
  const g = inGame(api, 's46-mixed-raid'), { world } = g;
  const end = northRoadEnd(world), ex = end.x;
  const gold = world.gold;
  world.gold = Math.max(gold, 20000);
  world.milestone = world.milestone === 'village' || world.milestone === 'town' ? 'market_town' : world.milestone;
  const wallY = end.y - 2;
  drawRoad(world, ex, end.y, ex, Math.max(1, wallY - 8));                       // the road on north, through the gate, into the open
  let tiles = 0;
  for (let x = ex - 7; x <= ex + 7; x++) {
    const i = idx(world.size, x, wallY);
    if (!(world.road[i] || freeLand(world, x, wallY))) continue;
    world.wall[i] = world.road[i] ? DEFENCE.gateHp : DEFENCE.wallHp;
    tiles++;
  }
  world.wallVersion++;
  world.tally.wallTiles += tiles;
  const towers = [];
  for (const x of [ex - 1, ex + 1]) {                                            // either side of the gate, beside the road
    const r = place(world, 'tower', x, wallY);
    if (r.ok) towers.push(world.buildings[r.id]);
  }
  const range = placeNear(world, 'archery_range', ex + 2, wallY + 2);
  const stables = placeNear(world, 'stables', ex + 2, wallY - 7);
  world.gold = gold;
  assignLabour(world);
  world.wall[idx(world.size, ex, wallY)] = 24;                                   // the gate, hit
  if (towers[0]) world.wall[idx(world.size, towers[0].x, towers[0].y)] = 52;      // the west tower's tile, shot at
  world.wallVersion++;
  // Your units: four archers up on the wall either side of the gate, three chariots out in the open north of it.
  world.soldiers = world.soldiers.filter((s) => (s.kind || 'soldier') === 'soldier');
  const W = wallY + 0.5;
  const archers = [[ex - 3.5, W, 8], [ex - 2.5, W, 5], [ex + 2.5, W, 8], [ex + 3.5, W, 6]].map(([x, y, hp]) => unit(world, 'archer', range, x, y, hp));
  const chariots = [[ex - 3.5, wallY - 5.5, 16], [ex + 3, wallY - 5, 11], [ex + 0.5, wallY - 6.5, 16]].map(([x, y, hp]) => unit(world, 'chariot', stables, x, y, hp));
  world.soldiers.push(...archers, ...chariots);
  world.soldiers.sort((a, b) => a.id - b.id);
  // The band: foot at the gate, archers behind them shooting the west tower, chariots riding at your chariots.
  const raiders = [
    raider(world, 'foot', ex + 0.5, wallY - 0.6), raider(world, 'foot', ex - 0.4, wallY - 0.8, 6), raider(world, 'foot', ex + 1.3, wallY - 1, 4),
    raider(world, 'foot', ex - 1.2, wallY - 1.5), raider(world, 'archer', ex - 3.2, wallY - 3.2), raider(world, 'archer', ex - 2.2, wallY - 3.6, 5),
    raider(world, 'archer', ex + 2.4, wallY - 3.4), raider(world, 'chariot', ex - 2.6, wallY - 5.1, 9), raider(world, 'chariot', ex + 4, wallY - 4.4),
  ];
  const mix = footMix(0);
  for (const r of raiders) mix[r.kind]++;
  const size = raiders.length + 3;
  mix.foot += 3;
  const entry = { ...(world.raiderEntries.find((e) => entryDir(world, e) === 'north') || world.raiderEntries[0]) };
  const r = world.raid;
  r.clockDay = r.clockDay === null ? 0 : r.clockDay;
  r.warning = null;
  r.index = Math.max(r.index, 7);
  const at = (u) => ({ x: u.x, y: u.y });
  r.active = {
    index: 6, entry, dir: entryDir(world, entry), size, mix, target: raidTargetKind(world), day: world.day - 4, raiders, phase: 'attack', targetId: null,
    struck: [], wait: 0, byTowers: 1, bySoldiers: 0, byArchers: 2, byChariots: 0, burned: 0, stolen: 0, x: ex, y: wallY - 1, blocked: idx(world.size, ex, wallY),
    towerIds: towers.map((t) => t.id), fires: [], burnedKinds: [],
    shots: [
      ...towers.slice(0, 1).map((t) => ({ from: { x: t.x + 0.5, y: t.y + 0.5 }, to: at(raiders[4]), by: 'tower' })),
      { from: at(archers[0]), to: at(raiders[1]), by: 'archer' }, { from: at(archers[3]), to: at(raiders[2]), by: 'archer' },
      ...(towers[0] ? [{ from: at(raiders[4]), to: { x: towers[0].x, y: towers[0].y }, by: 'enemy' }] : []),
    ],
  };
  world.tally.raids += 1;
  g.ui.refresh();
  const portrait = g.ui.store.get().layout === 'portrait';
  g.cam.zoom = portrait ? 1.25 : 1.7;
  focus(g, ex + 0.5, wallY - (portrait ? 3.5 : 2.5));
  await wait(100);
  return `mixed raid ${raiders.length} raiders (${Object.entries(mix).filter(([, n]) => n).map(([k, n]) => `${n} ${k}`).join(', ')}) ${archers.length} archers on the wall ${chariots.length} chariots in the open ${towers.length} towers`;
}

async function raidSheet(api, options = {}) {
  const g = inGame(api, 's46-raid-sheet'), { world } = g;
  const r = world.raid;
  const entry = { ...(world.raiderEntries.find((e) => entryDir(world, e) === 'east') || world.raiderEntries[0]) };
  r.clockDay = r.clockDay === null ? 0 : r.clockDay;
  r.last = { index: 5, dir: entryDir(world, entry), size: 8, mix: footMix(8), won: true, byTowers: 6, bySoldiers: 2, towers: 3, burned: 0, stolen: 0, day: Math.max(0, world.day - 300) };
  r.index = 6;
  const size = Math.max(14, raidSize(world));
  r.warning = { index: 6, entry, dir: entryDir(world, entry), size, tribute: tributeFor(world, size), target: raidTargetKind(world), day: world.day - 30, arrives: world.day - 30 + RAIDS.warningDays, first: false, mix: drawMix(world, 6, size) };
  r.index = 7;
  r.nextWarnDay = null;
  g.ui.refresh();
  const w = r.warning;
  const alert = g.ui.alerts.list().find((a) => a.code === 'raid_warning') || { code: 'raid_warning', x: w.entry.x, y: w.entry.y, dir: w.dir, arrives: w.arrives };
  g.ui.alerts.action(alert, 'tribute');
  await wait(100);
  const head = document.querySelector('.tribute-cost') || document.querySelector('.raid-mix');   // the sheet's top: the cost, then the arrival line that names the mix
  let box = head && head.parentElement;
  while (box && box.scrollHeight <= box.clientHeight + 1) box = box.parentElement;
  if (head && box && options.scroll !== false) box.scrollTop += head.getBoundingClientRect().top - box.getBoundingClientRect().top - 72;   // below the sheet's heading
  await wait(50);
  return `raid sheet ${w.size} ${JSON.stringify(w.mix)} ${allBuildings(world).length} buildings`;
}

export const ARMY_SCENES = {
  's46-mixed-raid': mixedRaid,
  's46-raid-sheet': raidSheet,
};
