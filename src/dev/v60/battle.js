// Version 6.0, Track B2's dev scene (src/dev/v60/index.js joins it): a battle you can see. A band with its chieftain is brought to the sample city
// through the sim's own raid days (raidDay) until soldiers and raiders have closed under the tower's arrows; the world is then left paused so the
// shot holds. Open /?skipTitle=1&nosw=1&seed=11&sample=1 first. options: look, zoom, quick (no waits, no searching for a strike that burns), size (the
// band, 10), hold (ms: a screenshot's moment, see holdMoment), pose ('a' | 'b', for hold), gold.
//   look 'clash' (default)  the fight in progress: soldiers and raiders facing each other, the tower's arrows, the chieftain's banner
//        'chief'            the same, close on the chieftain and his banner
//        'burning'          the band at a building in the open that its strike set alight, unchecked, so the blaze has grown into a fire
//        'won'              the raid beaten: the last raiders have fallen, the result in the alert row (the chieftain's banner on the ground)
//        'lost'             the raid lost: the band has struck and left; the result in the alert row
//        'poses', 'shells'  every figure of a fight, and every shell a fire or a wreck leaves, on bare desert (not game states: art for a close look)
import { raidDay, entryDir, raidTargetKind, bandSlot } from '../../sim/raids.js';
import { setPaused } from '../../sim/commands.js';
import { allBuildings, makeBuilding, insertBuilding } from '../../sim/world.js';
import { assignLabour } from '../../sim/labour.js';
import { footMix } from '../../data/armies.js';
import { passable } from '../../sim/terrain.js';
import { canBurn, fireDay } from '../../sim/fire.js';
import { FIRE } from '../../data/fire.js';
import { setBattleHooks, unitsAt } from '../../render/units.js';
import { sampleCity, look, wait, endGrace } from './base.js';

// Soldier (on foot) and raider pairs within a tile of each other (the sim's own BESIDE), by sim position.
export function pairsOf(world) {
  const a = world.raid.active, out = [];
  if (!a) return out;
  for (const s of world.soldiers || []) {
    if ((s.kind || 'soldier') !== 'soldier') continue;
    for (const r of a.raiders) if (Math.hypot(s.x - r.x, s.y - r.y) <= 1.05) out.push([s, r]);
  }
  return out;
}

// Brings the band to the sample city: a warning that arrives today, raid index 2 (a later raid), a chieftain over the first band (and two archers among
// it), raised through raidDay so the raid is under way and has taken its first step (it has a target).
function raise(world, size) {
  const e = world.raiderEntries[0] || world.focus;
  const w = world;
  w.raid.index = 3;
  w.raid.clockDay = w.raid.clockDay === null ? 0 : w.raid.clockDay;
  const mix = { ...footMix(size - 2), archer: 2 };
  w.raid.warning = { index: 2, entry: { x: e.x, y: e.y }, dir: entryDir(w, e), size, tribute: 300, target: raidTargetKind(w), day: w.day - 90, arrives: w.day, first: false, mix, chiefs: [0] };
  const events = [];
  raidDay(w, events);                     // arrives
  raidDay(w, events);                     // its first step: it picks its target
  return events;
}

// The defences as the scene wants them: eight soldiers (the sample city has one barracks and four), and the building the band is sent for: with `kind`
// 'open' the burnable building with the fewest neighbours; else the store nearest the first tower (so the tower's range covers the fight), of that kind
// when one is given.
function defend(world, kind = null) {
  const tower = allBuildings(world).find((b) => b.type === 'tower'), barracks = allBuildings(world).find((b) => b.type === 'barracks');
  if (barracks) {
    for (let k = world.soldiers.length; k < 8; k++) world.soldiers.push({ id: world.nextUnitId++, kind: 'soldier', barracks: barracks.id, x: barracks.x + barracks.w / 2, y: barracks.y + barracks.d / 2, hp: 12, hit: false, task: 'wait' });
  }
  if (kind === 'open') {                                               // the burnable building with the fewest neighbours: a fire there can be seen
    const all = allBuildings(world), near = (b) => all.filter((o) => o !== b && Math.hypot(o.x - b.x, o.y - b.y) <= 4).length;
    return all.filter((b) => b.type !== 'house' && b.type !== 'rubble' && canBurn(b)).sort((p, q) => near(p) - near(q) || p.id - q.id)[0] || null;
  }
  const store = allBuildings(world).filter((b) => (kind ? b.type === kind : b.type === 'granary' || b.type === 'storehouse'));
  if (!tower || !store.length) return null;
  const d = (b) => Math.hypot(b.x + b.w / 2 - tower.x, b.y + b.d / 2 - tower.y);
  return store.sort((p, q) => d(p) - d(q) || p.id - q.id)[0];
}

// The city's defenders stood down (the barracks and towers paused, no soldiers): the band meets no one.
function standDown(world, fire = false) {
  for (const s of allBuildings(world)) if (s.type === 'barracks' || s.type === 'tower' || (fire && s.type === 'firehouse')) setPaused(world, s.id, true);   // fire: the firehouses too, so a blaze burns on
  world.soldiers = [];
  assignLabour(world);
}

// Stands the band a few tiles short of its target (as the sim would find it), where the defenders meet it.
function bring(world, tiles, target) {
  const a = world.raid.active;
  if (target) a.targetId = target.id;
  const t = world.buildings[a.targetId];
  if (!a || !t) return;
  const tx = t.x + t.w / 2, ty = t.y + t.d / 2, e = a.entry;
  const dx = e.x - tx, dy = e.y - ty, d = Math.hypot(dx, dy) || 1;
  for (let k = tiles; k >= 2; k--) {                                   // the nearest passable, empty tile on the line to the entry that far from the target
    const x = Math.round(tx + (dx / d) * k), y = Math.round(ty + (dy / d) * k);
    const i = y * world.size + x;
    if (x < 1 || y < 1 || x >= world.size - 1 || y >= world.size - 1 || !passable(world, i) || world.occ[i]) continue;
    a.x = x; a.y = y;
    for (const u of a.raiders) { const [sx, sy] = bandSlot(u.id, a.raiders.length); u.x = x + 0.5 + sx; u.y = y + 0.5 + sy; }   // as the sim's placeBand stands them
    return;
  }
}

const centre = (list) => ({ x: list.reduce((n, u) => n + u.x, 0) / list.length, y: list.reduce((n, u) => n + u.y, 0) / list.length });

// Runs raid days until `done(world)` or the limit; returns the days run. The events of the last day are kept in run.last (what the interface sees).
function run(world, done, limit = 60) {
  let n = 0;
  run.last = [];
  while (world.raid.active && !done(world) && n < limit) {
    world.day += 1; run.last = []; raidDay(world, run.last); n += 1;
  }
  return n;
}

// options.hold (ms): a screenshot of the moment: every arrow, spark and fall shows at that age (the drawing's clock for them is held; a real game never
// holds), the fighting poses at options.pose ('a' | 'b'), and two raiders and two soldiers in the fight have just been struck, so the sparks show.
function holdMoment(world, hold, options) {
  setBattleHooks({ hold, now: () => (options.pose === 'b' ? 450 : 0) });
  const a = world.raid.active;
  if (!a) return;
  const day = world.day;
  unitsAt(world, day, null, { now: 0 });                          // the drawing sees every unit as it is, then the blows land
  for (const [s, r] of pairsOf(world).slice(0, 3)) { s.hp = Math.max(1, s.hp - 2); s.hit = true; r.hp = Math.max(1, r.hp - 3); r.hit = true; }
}

// look 'poses': every figure of a fight laid out on bare desert for a close look (a sheet of rows: your soldier facing right and left against a raider, a
// chieftain, a raider carrying a sack, and the archers and chariots standing). The Motion hooks are set so the poses hold: options.pose 'a' | 'b' (default
// both, by id). Not a game state: a raid is faked so the drawing has something to draw.
// A patch of bare desert w x d tiles (nothing built, no road), or a corner of the map when the city leaves none.
function desertPatch(world, w, d) {
  for (let y = 4; y < world.size - d - 1; y++) for (let x = 4; x < world.size - w - 1; x++) {
    let ok = true;
    for (let j = 0; j < d && ok; j++) for (let i = 0; i < w && ok; i++) { const k = (y + j) * world.size + x + i; ok = world.terrain[k] === 0 && !world.occ[k] && !world.road[k]; }
    if (ok) return { x, y };
  }
  return { x: 8, y: 8 };
}

// look 'shells': what a fire and a wreck leave of a tall, a middling and a low building, side by side on bare desert (rubble that remembers what stood
// there, each tile of it); the front row burned down two days ago (it smoulders), the back row was wrecked two days ago (dust). options.age: days ago.
function shellsScene(api, world, options) {
  const at = desertPatch(world, 18, 9), age = options.age === undefined ? 2 : options.age;
  const kinds = [['tower', 1], ['storehouse', 2], ['farm_grain', 2], ['granary', 2], ['temple', 2]];
  ['wreck', 'fire'].forEach((cause, row) => {
    let x = at.x + 1;
    for (const [type, size] of kinds) {
      const was = { type, x, y: at.y + 1 + row * 4, w: size, d: size, rot: 0, day: world.day - age, cause };
      for (let j = 0; j < size; j++) for (let i = 0; i < size; i++) {
        const r = makeBuilding(world, 'rubble', was.x + i, was.y + j);
        r.was = { ...was };
        insertBuilding(world, r);
      }
      x += size + 1.5 | 0;
    }
  });
  return at;
}

function posesScene(api, world, options) {
  const at = desertPatch(world, 13, 7);
  const barracks = allBuildings(world).find((b) => b.type === 'barracks');
  const raiders = [], soldiers = [];
  let id = 1;
  const raider = (x, y, extra = {}) => { raiders.push({ id: id++, x, y, hp: 10, hit: false, ...extra }); };
  const soldier = (x, y, extra = {}) => { soldiers.push({ id: id++, kind: 'soldier', barracks: barracks.id, x, y, hp: 12, hit: false, task: 'wait', ...extra }); };
  for (let i = 0; i < 4; i++) { soldier(at.x + 1 + i * 3 - 0.5, at.y + 0.5); raider(at.x + 1 + i * 3 + 0.4, at.y + 0.5, i === 1 ? { hit: true, hp: 6 } : {}); }                     // soldiers facing right
  for (let i = 0; i < 4; i++) { raider(at.x + 1 + i * 3 - 0.5, at.y + 2.5); soldier(at.x + 1 + i * 3 + 0.4, at.y + 2.5, i === 2 ? { hit: true, hp: 7 } : {}); }                // soldiers facing left
  raider(at.x + 2, at.y + 4.5, { chief: true, hp: 20, hit: true }); soldier(at.x + 1.1, at.y + 4.5);                                                                          // the chieftain in a fight
  raider(at.x + 5, at.y + 4.5, { chief: true, hp: 20 });                                                                                                                      // and standing, his banner up
  raider(at.x + 7, at.y + 4.5); raider(at.x + 8.5, at.y + 4.5, { kind: 'archer' }); raider(at.x + 10, at.y + 4.5, { kind: 'chariot', hp: 14 });                                 // a raider carrying a sack, an archer and a chariot
  world.raid.active = {
    index: 2, entry: { x: 0, y: 0 }, dir: 'east', size: raiders.length, target: 'storehouse', day: world.day, phase: 'leave', targetId: null, struck: [], wait: 0, byTowers: 0, bySoldiers: 0, burned: 0, stolen: 40, shots: [],
    raiders, x: at.x, y: at.y, blocked: null, towerIds: [], fires: [], burnedKinds: [], chiefs: [{ id: raiders.find((r) => r.chief).id, band: 0 }],
  };
  world.soldiers = soldiers;
  setBattleHooks({ motion: () => options.motion || 'full', now: () => (options.pose === 'b' ? 450 : 0) });
  return at;
}

export async function battleScene(api, options = {}) {
  const world = sampleCity(api, 'v60-battle', options);
  endGrace(world);
  const size = options.size || 10, look_ = options.look || 'clash';
  if (look_ === 'shells') {
    const at = shellsScene(api, world, options);
    const g = api.game();
    g.ui.cameraControl.cancel();
    g.ui.refresh();
    look(api, at.x + 8, at.y + 4, options.zoom || 1.4);
    return `v60-battle: shells, on bare desert at ${at.x},${at.y}`;
  }
  if (look_ === 'poses') {
    const at = posesScene(api, world, options);
    const g = api.game();
    g.ui.cameraControl.cancel();
    g.ui.refresh();
    look(api, at.x + 6, at.y + 3, options.zoom || 2.2);
    return `v60-battle: poses, on bare desert at ${at.x},${at.y}`;
  }
  world.gold = Math.max(world.gold, 20000);
  assignLabour(world);
  const target = defend(world, look_ === 'burning' ? 'open' : null), tower = allBuildings(world).find((b) => b.type === 'tower');
  if (look_ === 'burning') {
    standDown(world, true);                                              // no one to stop it: the band strikes, and the blaze burns on
    // The draws decide whether a strike burns or wrecks: a few starting days are tried (each on a copy) for one on which the strike sets the store alight.
    let day = 0;
    if (!options.quick) {
      for (let k = 0; k < 30; k++) {
        const w = structuredClone(world);
        w.day += k; raise(w, size); bring(w, options.tiles || 9, w.buildings[target.id]);
        run(w, (x) => !x.raid.active || x.raid.active.struck.length >= 1);
        if (allBuildings(w).some((b) => b.fire)) { day = k; break; }
      }
    }
    world.day += day;
  }
  raise(world, size);
  bring(world, options.tiles || 9, target);
  const a = world.raid.active;
  const chief = () => a.raiders.find((u) => u.chief);
  let note = '';
  if (look_ === 'clash' || look_ === 'chief') {
    let days = run(world, (w) => pairsOf(w).length >= 2);
    if (tower && world.raid.active && !world.raid.active.shots.some((s) => s.by === 'tower')) {
      // The fight is wherever the sim met them: draw it close under the tower (every unit of the fight moved together, then one day's combat: the sim's
      // own blows and the tower's shots), so the arrows have a target.
      const c = centre(a.raiders), tx = tower.x + 0.5, ty = tower.y + 0.5, d = Math.hypot(c.x - tx, c.y - ty) || 1;
      for (const reach of [2.6, 2.2, 1.8]) {
        const dx = tx + ((c.x - tx) / d) * reach - c.x, dy = ty + ((c.y - ty) / d) * reach - c.y;
        for (const u of a.raiders) { u.x += dx; u.y += dy; }
        for (const s of world.soldiers) { s.x += dx; s.y += dy; }
        a.x = Math.round(a.x + dx); a.y = Math.round(a.y + dy);
        world.day += 1; run.last = []; raidDay(world, run.last); days += 1;
        if (!world.raid.active || a.shots.some((s) => s.by === 'tower')) break;
      }
    }
    note = `after ${days} days: ${pairsOf(world).length} pairs, ${a.shots.length} shots, ${a.raiders.length} raiders, ${world.soldiers.length} soldiers`;
  } else if (look_ === 'burning') {
    run(world, (w) => allBuildings(w).some((b) => b.fire) || (w.raid.active && w.raid.active.struck.length > 0 && w.raid.active.phase === 'strike'));
    for (let k = 0; k < FIRE.blazeDays + 1 && allBuildings(world).some((b) => b.fire && b.fire.stage === 'blaze'); k++) { world.day += 1; fireDay(world, []); }   // the blaze, unchecked, grows into a fire
    note = `burning: ${allBuildings(world).filter((b) => b.fire).length}, struck ${a.struck.length}`;
  } else {                                                              // won or lost: play the raid out
    if (look_ === 'won') {
      run(world, (w) => pairsOf(w).length >= 2);
      unitsAt(world, world.day, null, { now: 0 });                      // the drawing has seen every unit where it stands, so it sees them fall
      for (const r of a.raiders) r.hp = 0;                              // the soldiers' last blows: the sim removes the fallen and ends the raid beaten
      world.day += 1; run.last = []; raidDay(world, run.last);
    } else {
      standDown(world);                                                 // no one to stop it: it strikes and leaves
      run(world, () => false, 120);
    }
    note = world.raid.last ? `raid ${world.raid.last.won ? 'beaten' : 'lost'}, burned ${world.raid.last.burned}` : 'raid still on';
  }
  const g = api.game();
  g.ui.cameraControl.cancel();
  g.ui.refresh();
  if (options.hold !== undefined) holdMoment(world, options.hold, options);
  const ended = (run.last || []).filter((e) => e.type === 'raid_end');   // the result reaches the interface as it would from the loop
  if (ended.length) g.ui.onEvents(ended);
  // The camera: on the chieftain (chief), on the fight with the tower that covers it in the frame (clash), else on what the raid left.
  const fightAt = world.raid.active && world.raid.active.raiders.length ? centre(world.raid.active.raiders) : null;
  const burning = look_ === 'burning' ? allBuildings(world).find((b) => b.fire) : null;
  const focus = burning ? { x: burning.x + burning.w / 2, y: burning.y + burning.d / 2 }
    : look_ === 'chief' && chief() ? { x: chief().x + 0.5, y: chief().y + 0.5 }
    : fightAt && tower && look_ === 'clash' ? { x: fightAt.x * 0.45 + (tower.x + 0.5) * 0.55 + 0.5, y: fightAt.y * 0.45 + (tower.y + 0.5) * 0.55 + 0.5 }
      : fightAt || (target ? { x: target.x + target.w / 2, y: target.y + target.d / 2 } : { x: world.focus.x, y: world.focus.y });
  look(api, focus.x, focus.y, options.zoom || (look_ === 'chief' ? 2.2 : 1.7));
  if (!options.quick && (look_ === 'won' || look_ === 'lost')) await wait(300);
  return `v60-battle: ${look_}, ${note}`;
}
