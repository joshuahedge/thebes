// Version 8.4, Track E's dev scenes (src/dev/scenes.js joins them; names start with 'v84-e-'). Each opens a fresh seed-11 sample city (a Capital).
// Open /?skipTitle=1&nosw=1&seed=11&sample=1 first. Motion is left as the caller set it.
//   v84-e-wall      a band with war elephants at the city's north wall: the elephants hammering the gate, raiders on foot behind, a tower and archers
//                   on the wall shooting at them (options.zoom; options.hold: an age in ms at which the arrows hold, for a still picture)
//   v84-e-warning   an elephant raid warned: the banner leads with "War elephants!" (options.sheet: true opens the raid sheet, scrolled to its
//                   "What helps against them" lines; options.scroll: false leaves it at its top)
//   v84-e-report    an elephant raid beaten through the sim's own days: one elephant felled (its ivory in the storehouse), one stampeded; the
//                   report's caption, and with options.summary the summary sheet scrolled to the last raid
import { sampleCity, look, wait } from '../v60/base.js';
import { place, canPlace, drawRoad } from '../../sim/commands.js';
import { assignLabour } from '../../sim/labour.js';
import { allBuildings, makeBuilding, insertBuilding } from '../../sim/world.js';
import { raidDay, raidSize, tributeFor, raidTargetKind, entryDir, nextRaidEntry } from '../../sim/raids.js';
import { drawMix, elephantRaid, raidStrength } from '../../sim/armies.js';
import { raiderHp } from '../../sim/combat.js';
import { wouldStampede } from '../../sim/elephants.js';
import { idx, inBounds } from '../../sim/grid.js';
import { buildable } from '../../sim/terrain.js';
import { DEFENCE, RAIDS } from '../../data/raids.js';
import { UNIT_TYPES, footMix } from '../../data/armies.js';
import { setBattleHooks } from '../../render/units.js';
import { openSheet } from '../../ui/modes.js';

const freeLand = (world, x, y) => inBounds(world.size, x, y) && !world.occ[idx(world.size, x, y)] && buildable(world, idx(world.size, x, y));

// The north road's last tile (the sample city's main road runs north from the trade entry).
function northRoadEnd(world) {
  const ex = world.tradeEntry.x;
  let y = world.size - 10;
  while (y > 0 && world.road[idx(world.size, ex, y - 1)]) y--;
  return { x: ex, y };
}

// A building of `type` at the free spot nearest (x, y) the commands allow, else put there as the dev scenes do.
function placeNear(world, type, x, y) {
  for (let r = 0; r <= 6; r++) {
    for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
      if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
      if (canPlace(world, type, x + dx, y + dy).ok) return world.buildings[place(world, type, x + dx, y + dy).id];
    }
  }
  return insertBuilding(world, makeBuilding(world, type, x, y));
}

// The first elephant raid's index on this seed from the 8th raid on (ruling 1500).
const elephantIndex = (world) => { for (let i = 7; i < 200; i++) if (elephantRaid(world, i)) return i; return 7; };

// A wall across the north road five tiles past its end, a gate where the road crosses, a tower either side of the gate and an archery range
// behind it, staffed. Returns { ex, wallY, towers, range }.
function northWall(world) {
  const end = northRoadEnd(world), ex = end.x, wallY = end.y - 5;   // clear of the town's last buildings, so the band stands on open ground
  const gold = world.gold;
  world.gold = Math.max(gold, 20000);
  if (world.milestone === 'village' || world.milestone === 'town') world.milestone = 'market_town';
  // The road on north past the wall (its gate). Where the command refuses (a tile in the way), the free tiles are laid as the dev scenes do, so
  // the gate tile is road and the towers beside it touch one.
  if (!drawRoad(world, ex, end.y, ex, Math.max(1, wallY - 8)).ok) {
    for (let y = Math.max(1, wallY - 8); y < end.y; y++) if (freeLand(world, ex, y)) world.road[idx(world.size, ex, y)] = 1;
    world.roadVersion++;
  }
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
  for (const x of [ex - 1, ex + 1]) { const r = place(world, 'tower', x, wallY); if (r.ok) towers.push(world.buildings[r.id]); }
  const range = placeNear(world, 'archery_range', ex + 2, wallY + 2);
  world.gold = gold;
  assignLabour(world);
  return { ex, wallY, towers, range };
}

const raider = (world, kind, x, y, hp = raiderHp(kind)) => ({ id: world.nextUnitId++, kind, x, y, hp, hit: hp < raiderHp(kind) });
const unit = (world, kind, b, x, y, hp = UNIT_TYPES[kind].hp) => ({ id: world.nextUnitId++, kind, barracks: b.id, x, y, hp, hit: hp < UNIT_TYPES[kind].hp, task: 'out' });
const mixOf = (raiders) => { const m = footMix(0); for (const r of raiders) m[r.kind] = (m[r.kind] || 0) + 1; return m; };

export async function wallScene(api, options = {}) {
  const world = sampleCity(api, 'v84-e-wall', options);
  const { ex, wallY, towers, range } = northWall(world);
  const gate = idx(world.size, ex, wallY);
  world.wall[gate] = 22;                                                          // the gate, half broken by the elephants
  world.wallVersion++;
  const W = wallY + 0.5;
  world.soldiers = world.soldiers.filter((s) => (s.kind || 'soldier') === 'soldier');
  const archers = [[ex - 3.5, W, 8], [ex - 2.5, W, 6], [ex + 2.5, W, 8], [ex + 3.5, W, 7]].map(([x, y, hp]) => unit(world, 'archer', range, x, y, hp));
  world.soldiers.push(...archers);
  world.soldiers.sort((a, b) => a.id - b.id);
  const raiders = [
    raider(world, 'elephant', ex + 0.5, wallY - 1, 41), raider(world, 'elephant', ex - 2, wallY - 2.3),
    raider(world, 'foot', ex + 1.6, wallY - 1.2), raider(world, 'foot', ex - 0.4, wallY - 2.4, 6), raider(world, 'foot', ex + 0.9, wallY - 2.8),
    raider(world, 'archer', ex + 3.2, wallY - 3.4), raider(world, 'foot', ex - 2.8, wallY - 3.6),
  ];
  const mix = mixOf(raiders), r = world.raid, entry = { ...(world.raiderEntries.find((e) => entryDir(world, e) === 'north') || world.raiderEntries[0]) };
  r.clockDay = r.clockDay === null ? 0 : r.clockDay;
  r.warning = null;
  r.index = Math.max(r.index, 9);
  const at = (u) => ({ x: u.x, y: u.y });
  r.active = {
    index: 8, entry, dir: entryDir(world, entry), size: raiders.length + 2, mix: { ...mix, foot: mix.foot + 2 }, target: raidTargetKind(world), day: world.day - 5, raiders, phase: 'attack', targetId: null,
    struck: [], wait: 0, byTowers: 1, bySoldiers: 0, byArchers: 1, byChariots: 0, burned: 0, stolen: 0, x: ex, y: wallY - 1, blocked: gate, towerIds: towers.map((t) => t.id), fires: [], burnedKinds: [],
    shots: [
      ...towers.map((t, k) => ({ from: { x: t.x + 0.5, y: t.y + 0.5 }, to: at(raiders[k]), by: 'tower' })),
      { from: at(archers[0]), to: at(raiders[1]), by: 'archer' }, { from: at(archers[2]), to: at(raiders[0]), by: 'archer' },
    ],
  };
  world.tally.raids += 1;
  world.tally.elephantsMet += 2;
  if (options.hold !== undefined) setBattleHooks({ hold: options.hold });
  const g = api.game();
  g.ui.refresh();
  const portrait = g.ui.store.get().layout === 'portrait';
  look(api, ex + 0.5, wallY - (portrait ? 1.2 : 0.8), options.zoom || (portrait ? 1.6 : 2));
  await wait(150);
  return `v84-e-wall: ${raiders.length} raiders (2 war elephants) at the north gate, ${archers.length} archers on the wall, ${towers.length} towers`;
}

export async function warningScene(api, options = {}) {
  const world = sampleCity(api, 'v84-e-warning', options);
  const r = world.raid, index = elephantIndex(world);
  r.clockDay = r.clockDay === null ? 0 : r.clockDay;
  r.last = { index: index - 1, dir: 'east', size: 12, mix: footMix(12), won: true, byTowers: 9, bySoldiers: 3, towers: 4, burned: 0, stolen: 0, day: Math.max(0, world.day - 400) };
  r.index = index;
  const size = Math.max(16, raidSize(world));
  const entry = nextRaidEntry(world, index), mix = drawMix(world, index, size);
  const w = { index, entry, dir: entryDir(world, entry), size, tribute: tributeFor(world, raidStrength({ size, mix })), target: raidTargetKind(world), day: world.day - 20, arrives: world.day - 20 + RAIDS.warningDays, first: false, mix, elephants: mix.elephant };
  r.warning = w;
  r.index = index + 1;
  r.nextWarnDay = null;
  const g = api.game();
  g.ui.refresh();
  look(api, entry.x * 0.3 + world.focus.x * 0.7, entry.y * 0.3 + world.focus.y * 0.7, options.zoom || 0.9);
  if (options.sheet) {
    const alert = g.ui.alerts.list().find((a) => a.code === 'raid_warning') || { code: 'raid_warning', x: w.entry.x, y: w.entry.y, dir: w.dir, arrives: w.arrives };
    g.ui.alerts.action(alert, 'tribute');
    await wait(100);
    const head = document.querySelector('.raid-counters-head');
    let box = head && head.parentElement;
    while (box && box.scrollHeight <= box.clientHeight + 1) box = box.parentElement;
    // The elephants' line in view when the heading's whole list does not fit (a phone), else the heading.
    const line = [...document.querySelectorAll('.raid-counters li')].find((li) => li.textContent.includes('war elephant'));
    const room = box ? box.clientHeight - 72 : 0;
    const to = line && head && line.getBoundingClientRect().bottom - head.getBoundingClientRect().top > room ? line : head;
    if (to && box && options.scroll !== false) box.scrollTop += to.getBoundingClientRect().top - box.getBoundingClientRect().top - (to === head ? 72 : 24);
  }
  await wait(100);
  return `v84-e-warning: raid ${index + 1}, ${size} raiders ${JSON.stringify(mix)} from the ${w.dir}, tribute ${w.tribute}`;
}

export async function reportScene(api, options = {}) {
  const world = sampleCity(api, 'v84-e-report', options);
  const { ex, wallY, towers } = northWall(world);
  const store = placeNear(world, 'storehouse', ex + 4, wallY + 3);
  assignLabour(world);
  // Two elephants at the gate under the towers: one near felled, one whose panic draw says stampede, a tower's shot from taking it below half.
  const raiders = [raider(world, 'elephant', ex + 0.5, wallY - 0.7, 5), raider(world, 'elephant', ex - 0.6, wallY - 0.9, 33), raider(world, 'foot', ex + 0.2, wallY - 1.8, 2)];
  for (let id = world.nextUnitId + 50; id < world.nextUnitId + 2000; id++) if (wouldStampede(world, { id })) { raiders[1].id = id; break; }
  const entry = { ...(world.raiderEntries.find((e) => entryDir(world, e) === 'north') || world.raiderEntries[0]) }, r = world.raid;
  r.clockDay = r.clockDay === null ? 0 : r.clockDay;
  r.warning = null;
  r.index = Math.max(r.index, 9);
  r.active = {
    index: 8, entry, dir: entryDir(world, entry), size: 9, mix: { foot: 7, archer: 0, chariot: 0, boat: 0, elephant: 2 }, target: raidTargetKind(world), day: world.day - 6, raiders, phase: 'attack', targetId: null,
    struck: [], wait: 0, byTowers: 4, bySoldiers: 2, byArchers: 0, byChariots: 0, burned: 0, stolen: 0, x: ex, y: wallY - 1, blocked: idx(world.size, ex, wallY), towerIds: towers.map((t) => t.id), fires: [], burnedKinds: [], shots: [],
  };
  world.tally.raids += 1;
  world.tally.elephantsMet += 2;
  const events = [];
  for (let k = 0; k < 6 && r.active; k++) { world.day += 1; raidDay(world, events); }
  const g = api.game();
  g.ui.refresh();
  g.ui.onEvents(events.filter((e) => e.type === 'raid_end' || e.type === 'ivory' || e.type === 'stampede'));
  look(api, ex + 1.5, wallY + 0.5, options.zoom || 1.4);
  if (options.summary) {
    g.ui.store.set(openSheet(g.ui.store.get(), 'summary'));
    await wait(150);
    const head = [...document.querySelectorAll('h3')].find((h) => h.textContent === 'Last raid');
    let box = head && head.parentElement;
    while (box && box.scrollHeight <= box.clientHeight + 1) box = box.parentElement;
    if (head && box) box.scrollTop += head.getBoundingClientRect().top - box.getBoundingClientRect().top - 72;
  }
  await wait(100);
  const last = r.last;
  return `v84-e-report: ${last ? JSON.stringify({ won: last.won, elephants: last.elephants, felled: last.felled, stampeded: last.stampeded, ivory: last.ivory, ivoryLost: last.ivoryLost }) : 'raid still on'}, store ${store.id} ivory ${store.store.ivory || 0}`;
}

export const V84_E_SCENES = {
  'v84-e-wall': wallScene,
  'v84-e-warning': warningScene,
  'v84-e-report': reportScene,
};
