// Version 6.0, Wave 4 fix batch 1 (track B1's part): the words and rules the final review found out of step with the sim. A low Nile's share of the crop is the level's own
// (50% Normal, 75% Relaxed, 37.5% Hard), the quarantine's fee has its minimum, the rebuild words say the clearing, a plague empties a home as every leaving does, a wrecked tower's wall
// tile falls back to a plain wall's hit points, the plague's work-stop answer is kept for the day, and the farm sheet's Harvest now sits above the problems. Each set up both ways.
import { describe, it, expect } from '../../harness.js';
import { makeTestWorld, setRoad, addRaw, staffAll } from '../../helpers/testWorld.js';
import { plagueDay, startPlague, plagueHalted, haltReason, quarantineDistrict, quarantineQuote, quarantines, sickHomes, districtKey } from '../../../src/sim/plague.js';
import { droughtDay, foodOutlook } from '../../../src/sim/crops.js';
import { STRIKES, wreckFate, rebuildQuote } from '../../../src/sim/strikes.js';
import { burnBuilding } from '../../../src/sim/fire.js';
import { rubbleCostOf } from '../../../src/sim/costs.js';
import { createSheets } from '../../../src/ui/sheets.js';
import { createHazardsUi } from '../../../src/ui/v60/hazards.js';
import { createPlacement } from '../../../src/ui/placement.js';
import { createMinimap } from '../../../src/ui/minimap.js';
import { createCameraControl } from '../../../src/ui/cameraControl.js';
import { createStore, INITIAL_UI_STATE } from '../../../src/ui/store.js';
import { select } from '../../../src/ui/modes.js';
import { createCamera } from '../../../src/render/camera.js';
import { alertsFor } from '../../../src/sim/alerts.js';
import { alertText, TIP_TEXT, TIP_HELP_TEXT, V60_HELP, ALERT_TEXT } from '../../../src/ui/text.js';
import { PLAGUE, DROUGHT, GRACE_DAYS, HAZARD_LEVELS } from '../../../src/data/hazards.js';
import { DEFENCE } from '../../../src/data/raids.js';
import { FIRE } from '../../../src/data/fire.js';
import { BUILDINGS } from '../../../src/data/buildings.js';
import { TIPS } from '../../../src/data/tips.js';
import { mount } from '../../helpers/dom.js';

const OPEN = GRACE_DAYS + 30;
function town({ n = 6, residents = 12, day = OPEN, difficulty = 'normal' } = {}) {
  const w = makeTestWorld();
  w.difficulty = difficulty;
  setRoad(w, 0, 13, 31, 13);
  w.milestone = 'town';
  w.day = day;
  const homes = [];
  for (let k = 0; k < n; k++) homes.push(addRaw(w, 'house', 2 + k, 14, { tier: 3, residents }));
  return { w, homes };
}
const run = (w, days) => { for (let k = 0; k < days; k++) { plagueDay(w, []); w.day += 1; } };
const pct = (f) => `${Math.round(f * 100)}%`;

describe('v60 b1 fix: a low Nile\'s share of the crop is the level\'s own', () => {
  it('says the share the sim gives on each level: the alert before it, the alert during it, and the help words that name the three levels', () => {
    const shares = {};
    for (const level of ['relaxed', 'normal', 'hard', 'peaceful']) {
      const { w } = town({ difficulty: level });
      w.hazards.drought.warning = { day: w.day, strikes: w.day + 90, year: 2 };
      const warnedShare = foodOutlook(w).factor;
      const warned = alertText({ code: 'drought_warning', arrives: w.day + 90 }, w);
      expect([level, warned.fix.includes(`about ${pct(warnedShare)} of their crop`)]).toEqual([level, true]);
      w.day += 90;
      const events = [];
      droughtDay(w, events);
      const started = events.find((e) => e.type === 'drought_start');
      expect([level, started.factor]).toEqual([level, warnedShare]);                         // what the words said is what the farms are given
      expect([level, alertText({ code: 'drought', until: w.hazards.drought.active.until }, w).title]).toEqual([level, `Low Nile: farms give ${pct(started.factor)} of their crop`]);
      shares[level] = started.factor;
    }
    expect([shares.normal, shares.relaxed, shares.hard, shares.peaceful]).toEqual([0.5, 0.75, 0.375, 0.75]);
    expect(shares.hard).toBe(Math.max(DROUGHT.floor, 1 - DROUGHT.cut * HAZARD_LEVELS.hard.severity));
    const help = TIP_HELP_TEXT.low_nile, how = V60_HELP.b1.find((h) => h.head === 'Drought and the low Nile').text;
    for (const text of [help, how]) for (const f of [shares.normal, shares.relaxed, shares.hard]) expect([text.includes(pct(f)), pct(f)]).toEqual([true, pct(f)]);
    expect(TIP_TEXT.low_nile.includes('half')).toBe(false);                                   // the tip no longer says "about half" for every level
    expect(TIP_TEXT.low_nile.split(/\s+/).length).toBeLessThanOrEqual(20);
    expect(TIPS.some((t) => t.id === 'low_nile')).toBe(true);
  });
});

describe('v60 b1 fix: the quarantine and the rebuild say what they cost', () => {
  it('names the quarantine\'s minimum: a small district pays it whatever the 25 a home comes to, and a large one pays the homes\' sum', () => {
    const q = PLAGUE.quarantine;
    const words = TIP_HELP_TEXT.plague_coming;
    expect(words).toContain(`${q.feePerHome} gold a home`);
    expect(words).toContain(`at least ${q.feeMin}`);
    expect(words.split(/\s+/).length).toBeLessThanOrEqual(20);
    const small = town({ n: 2, residents: 12 });
    startPlague(small.w, small.homes[0].id, []);
    expect([2 * q.feePerHome < q.feeMin, quarantineQuote(small.w, small.homes[0]).fee]).toEqual([true, q.feeMin]);     // "25 a home" alone would have said 50
    const big = town({ n: 12, residents: 12 });
    startPlague(big.w, big.homes[0].id, []);
    const inDistrict = big.homes.filter((h) => districtKey(h) === districtKey(big.homes[0])).length;
    expect([inDistrict * q.feePerHome > q.feeMin, quarantineQuote(big.w, big.homes[0]).fee]).toEqual([true, inDistrict * q.feePerHome]);
    const hard = town({ n: 2, residents: 12, difficulty: 'hard' });
    startPlague(hard.w, hard.homes[0].id, []);
    expect(quarantineQuote(hard.w, hard.homes[0]).fee).toBeGreaterThan(q.feeMin);                                   // and the difficulty scales it: the words say so
    expect(words).toContain('difficulty');
  });

  it('says the clearing in How to play, and it is what a rebuild charges for each tile of rubble', () => {
    const how = V60_HELP.b1.find((h) => h.head === 'Raiders that wreck and loot').text;
    expect(how).toContain(`${FIRE.rubbleCost} gold for each tile of rubble`);
    const { w } = town({ n: 0 });
    const store = addRaw(w, 'storehouse', 6, 16);
    const to = burnBuilding(w, store.id, []);
    const quote = rebuildQuote(w, to[0]);
    expect(quote.clear).toBe(to.length * rubbleCostOf(w));
    expect(rubbleCostOf(w)).toBe(FIRE.rubbleCost);                                                                  // Normal: the words' number
    expect(quote.cost).toBe(quote.clear + quote.build);
  });
});

describe('v60 b1 fix: plague empties a home as every leaving does', () => {
  it('a home the plague takes the last of is an empty plot (tier, stock and household cleared), and one it spares keeps them', () => {
    const { w, homes } = town({ n: 4, residents: 1 });
    homes[0].stock = { grain: 6 };
    homes[1].residents = 5;
    homes[1].stock = { grain: 6 };
    startPlague(w, homes[0].id, []);
    homes[0].illness.cap = 1;
    for (const h of [homes[1]]) { if (!h.illness) h.illness = { start: w.day, days: 20, left: 20, lost: 0, cap: 1, plague: true }; }
    w.hazards.plague.active.homes.push(homes[1].id);
    run(w, 1);
    expect([homes[0].residents, homes[0].tier, homes[0].stock, homes[0].leftThisMonth, homes[0].illness]).toEqual([0, 0, {}, 1, null]);
    expect([homes[1].residents, homes[1].tier, homes[1].stock.grain, homes[1].leftThisMonth]).toEqual([4, 3, 6, 1]);
    expect(w.hazards.plague.active.lost).toBeGreaterThanOrEqual(2);
  });

  it('splits a 2x2 home it empties into four plots, and leaves a Large plot whole as a lot', () => {
    const { w } = town({ n: 0 });
    const merged = addRaw(w, 'house', 8, 16, { w: 2, d: 2, tier: 3, residents: 1 });
    startPlague(w, merged.id, []);
    merged.illness.cap = 1;
    run(w, 1);
    const plots = Object.values(w.buildings).filter((b) => b.type === 'house' && b.x >= 8 && b.x <= 9 && b.y >= 16 && b.y <= 17);
    expect([plots.length, plots.every((p) => p.w === 1 && p.tier === 0 && p.residents === 0)]).toEqual([4, true]);
    const lot = addRaw(w, 'house', 14, 16, { w: 2, d: 2, tier: 6, residents: 1 });
    lot.large = true;
    startPlague(w, lot.id, []);
    lot.illness.cap = 1;
    run(w, 1);
    const same = Object.values(w.buildings).filter((b) => b.type === 'house' && b.x >= 14 && b.x <= 15 && b.y >= 16 && b.y <= 17);
    expect([same.length, same[0].large, same[0].w, same[0].tier, same[0].residents]).toEqual([1, true, 2, 0, 0]);
  });
});

describe('v60 b1 fix: the plague\'s work stop is kept for the day', () => {
  it('answers from the same record while the day, the buildings, the sick homes and the quarantines are as they were, and anew when any changes', () => {
    const { w, homes } = town({ n: 4, residents: 20 });
    const farm = addRaw(w, 'farm_grain', 3, 16, { staff: BUILDINGS.farm_grain.workers });
    startPlague(w, homes[0].id, []);
    const first = plagueHalted(w);
    expect(first.has(farm.id)).toBe(true);
    expect(plagueHalted(w) === first).toBe(true);                                               // asked again: the same answer, not another walk
    expect(haltReason(w, farm)).toBe('plague');
    expect(plagueHalted(w) === first).toBe(true);
    w.day += 1;
    const nextDay = plagueHalted(w);
    expect([nextDay === first, nextDay.has(farm.id)]).toEqual([false, true]);                   // a new day, a new answer (with the same content)
    const physician = addRaw(w, 'physician', 2, 12);
    staffAll(w);
    const covered = plagueHalted(w);
    expect([covered === nextDay, covered.has(farm.id)]).toEqual([false, false]);                // a building was added: the physician covers the farm
    w.day += 1;
    physician.paused = true;
    w.buildings[physician.id] = physician;
    sickHomes(w);
    const edge = plagueHalted(w);                                                               // a day on: re-judged, whatever changed in between
    expect(edge === covered).toBe(false);
    // a physician's staff is a change too, one the buildings' version never sees: the labour at the day's start moves it, a sheet asks between ticks, and both read the same
    const s = town({ n: 4, residents: 20 });
    const doc = addRaw(s.w, 'physician', 2, 12, { staff: BUILDINGS.physician.workers });
    const farm3 = addRaw(s.w, 'farm_grain', 3, 16, { staff: BUILDINGS.farm_grain.workers });
    startPlague(s.w, s.homes[0].id, []);
    const staffed = plagueHalted(s.w);
    expect(staffed.has(farm3.id)).toBe(false);
    doc.staff = 0;                                                                               // the physician loses the crew: same day, same buildings, same sick homes
    const unstaffed = plagueHalted(s.w);
    expect([unstaffed === staffed, unstaffed.has(farm3.id)]).toEqual([false, true]);
    doc.staff = BUILDINGS.physician.workers;
    expect(plagueHalted(s.w).has(farm3.id)).toBe(false);
    // a quarantine is a change too: the same day, the answer moves
    const q = town({ n: 4, residents: 20 });
    addRaw(q.w, 'physician', 2, 12);
    staffAll(q.w);
    const farm2 = addRaw(q.w, 'farm_grain', 3, 16, { staff: BUILDINGS.farm_grain.workers });
    startPlague(q.w, q.homes[0].id, []);
    const before = plagueHalted(q.w);
    expect(before.has(farm2.id)).toBe(false);
    expect(quarantineDistrict(q.w, q.homes[0].id).ok).toBe(true);
    expect([quarantines(q.w).size, plagueHalted(q.w) === before, plagueHalted(q.w).has(farm2.id)]).toEqual([1, false, true]);
    expect(plagueHalted(town().w)).toBe(null);                                                   // no plague: no walk at all
  });
});

describe('v60 b1 fix: a wrecked tower\'s wall tile falls back to a plain wall', () => {
  const EAST = { x: 31, y: 16 };
  function wallTower({ onWall = true } = {}) {
    const w = makeTestWorld({ gold: 5000, raiderEntries: [EAST] });
    setRoad(w, 0, 13, 31, 13);
    w.milestone = 'market_town';
    const tower = addRaw(w, 'tower', 10, 16);
    const i = tower.y * w.size + tower.x;
    if (onWall) w.wall[i] = DEFENCE.towerOnWallHp;
    let day = GRACE_DAYS + 100;
    for (; day < GRACE_DAYS + 600; day++) { w.day = day; if (wreckFate(w, tower)) break; }
    return { w, tower, i };
  }

  it('resets the tile to a wall\'s hit points and bumps the wall version, so the paths and the render see it', () => {
    const { w, tower, i } = wallTower();
    expect(w.wall[i]).toBe(DEFENCE.towerOnWallHp);
    const version = w.wallVersion;
    const to = STRIKES.wreck(w, { fires: [] }, tower, []);
    expect(to.length).toBe(BUILDINGS.tower.w * BUILDINGS.tower.d);
    expect([w.wall[i], w.wallVersion]).toEqual([DEFENCE.wallHp, version + 1]);
  });

  it('touches nothing when the tower stood on no wall, and nothing of a wall a wrecked storehouse stood beside', () => {
    const { w, tower, i } = wallTower({ onWall: false });
    const version = w.wallVersion;
    STRIKES.wreck(w, { fires: [] }, tower, []);
    expect([w.wall[i], w.wallVersion]).toEqual([0, version]);
    const other = wallTower();
    const store = addRaw(other.w, 'storehouse', 20, 20);
    const v = other.w.wallVersion;
    for (let day = GRACE_DAYS + 100; day < GRACE_DAYS + 600; day++) { other.w.day = day; if (wreckFate(other.w, store)) break; }
    STRIKES.wreck(other.w, { fires: [] }, store, []);
    expect([other.w.wall[other.i], other.w.wallVersion]).toEqual([DEFENCE.towerOnWallHp, v]);   // the tower and its wall tile stand as they were
  });
});

// ── The sheets: a Problems row's View and a farm's Harvest now ──
describe('v60 b1 fix: the farm sheet', () => {
  function rig() {
    const { root, cleanup } = mount();
    const w = makeTestWorld({ gold: 1000 });
    setRoad(w, 0, 10, 31, 10);
    w.day = OPEN;
    w.milestone = 'town';
    addRaw(w, 'granary', 10, 11, { store: { grain: 100 }, staff: BUILDINGS.granary.workers });
    const farm = addRaw(w, 'farm_grain', 2, 11, { staff: BUILDINGS.farm_grain.workers, blocked: 'no_storage' });
    const extra = [addRaw(w, 'farm_grain', 4, 11, { staff: BUILDINGS.farm_grain.workers }), addRaw(w, 'farm_grain', 6, 11, { staff: BUILDINGS.farm_grain.workers })];
    w.hazards.locusts.warning = { day: w.day, strikes: w.day + 30, kind: 'locusts', farms: [farm.id, ...extra.map((f) => f.id)], centre: { x: 4, y: 12 }, early: [] };
    const store = createStore(INITIAL_UI_STATE);
    const cam = createCamera({ x: 16, y: 16, zoom: 1 });
    const view = () => ({ width: 400, height: 300 });
    const ctx = { world: w, toasts: { show() {} }, afterCommand() {}, showMeAt() {}, celebrations: { show() {} }, fireTip() {}, selectBuilding() { return true; } };
    const sheets = createSheets({
      container: root, store, world: w, placement: createPlacement({ world: w, store }), cameraControl: createCameraControl({ cam, view, reducedMotion: () => true }),
      minimap: createMinimap({ world: w, cam, view, size: 100 }), getAlerts: () => alertsFor(w), parts: [createHazardsUi(ctx).sheetParts],
    });
    return { root, w, farm, store, sheets, cleanup };
  }

  it('puts Harvest now under the farm\'s crop rows and above its Problems, with Pause and Demolish still at the foot', () => {
    const r = rig();
    try {
      r.store.set(select(r.store.get(), r.farm.id));
      const body = r.root.querySelector('.body');
      const order = [...body.children];
      const at = (sel) => order.findIndex((n) => n.matches(sel) || n.querySelector(sel));
      const harvest = r.root.querySelector('.harvest');
      expect(harvest === null).toBe(false);
      const problemsHead = order.findIndex((n) => n.tagName === 'H3' && n.textContent === 'Problems');
      expect([at('.harvest') >= 0, at('.harvest') < problemsHead, problemsHead > 0]).toEqual([true, true, true]);
      expect(harvest.closest('.harvest-actions') === null).toBe(false);
      expect(order[order.length - 1].querySelector('.pause') === null).toBe(false);                 // the foot keeps Pause and Demolish
      expect(order[order.length - 1].querySelector('.harvest')).toBe(null);
      // a farm outside the warned band has no Harvest now anywhere
      r.w.hazards.locusts.warning = null;
      r.store.set(select(r.store.get(), null));
      r.store.set(select(r.store.get(), r.farm.id));
      expect(r.root.querySelector('.harvest')).toBe(null);
    } finally { r.cleanup(); }
  });

  it('lays a Problems row as its words in one block and View beside it, one word on one line', () => {
    const r = rig();
    try {
      r.store.set(select(r.store.get(), r.farm.id));
      const rows = [...r.root.querySelectorAll('.problems .problem')];
      expect(rows.length).toBeGreaterThan(0);
      for (const row of rows) {
        const text = row.querySelector('.problem-text'), view = row.querySelector('.view');
        expect([text === null, view === null]).toEqual([false, false]);
        expect([text.querySelector('strong') === null, view.style.whiteSpace, view.style.flex]).toEqual([false, 'nowrap', '0 0 auto']);
        expect(row.style.display).toBe('flex');
      }
    } finally { r.cleanup(); }
  });
});
