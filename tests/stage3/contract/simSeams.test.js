import { describe, it, expect } from '../../harness.js';
import { createWorld, buildingAt, population } from '../../../src/sim/world.js';
import { idx } from '../../../src/sim/grid.js';
import { T as TERRAIN } from '../../../src/sim/terrain.js';
import { runMonth, tickDay } from '../../../src/sim/clock.js';
import { createGameLoop } from '../../../src/render/loop.js';
import { updateMilestone } from '../../../src/sim/progression.js';
import { alertsFor } from '../../../src/sim/alerts.js';
import { updateMood } from '../../../src/sim/mood.js';
import { settle } from '../../../src/sim/settle.js';
import {
  canPlace, place, previewRoad, drawRoad, demolishAt, demolishArea, previewDemolishArea, clearRubble, setCityId, demolishRefundFor,
} from '../../../src/sim/commands.js';
import { undo, pushUndo } from '../../../src/sim/undo.js';
import { rubbleCostOf } from '../../../src/sim/costs.js';
import {
  baseRiskOf, canBurn, fireStarted, fireRiskOf, fireBand, burning, fireCoverage, coverageOf, staffedCover, dailyRiskOf,
  fireDay, igniteBuilding, burnBuilding, fireAlerts, fireMood, rubbleClearCost, clearRubble as clearRubbleFromFire,
} from '../../../src/sim/fire.js';
import {
  entryDir, towersNeeded, workingTowers, raidTargetKind, raidSize, raidWealth, tributeFor, laterWarnDay, tributeQuote, payTribute,
  raidDay, raidMonth, raidAlerts, raidMood,
} from '../../../src/sim/raids.js';
import { trainSoldiers, combatDay } from '../../../src/sim/combat.js';
import { tileCost, flowField } from '../../../src/sim/pathfinding.js';
import { isGate, wallHpFor, previewWall, drawWall } from '../../../src/sim/defence.js';
import { festivalStatus, holdFestival, festivalMood } from '../../../src/sim/festival.js';
import { scoreOf, scorePreview, scoreRow, scoreFactor, medalFor, nextMedal, splitMonths, sealReign } from '../../../src/sim/score.js';
import { checkFeats } from '../../../src/sim/feats.js';
import { DEFENCE, RAIDS } from '../../../src/data/raids.js';
import { ECONOMY } from '../../../src/data/economy.js';
import { MILESTONES } from '../../../src/data/progression.js';
import { makeTestWorld, setRoad, addRaw, staffAll } from '../../helpers/testWorld.js';

const near = (a, b) => Math.abs(a - b) < 1e-9;

// Road along y = 10 in a 32x32 test world, at Market town so the defences are unlocked.
function street(gold = 1000) {
  const w = makeTestWorld({ gold });
  setRoad(w, 0, 10, 31, 10);
  w.milestone = 'market_town';
  return w;
}

describe('s3 contract fire seams', () => {
  it('knows what can burn, from the data, and bands risk as the overlay does', () => {
    const w = street();
    const potter = addRaw(w, 'potter', 2, 11), garden = addRaw(w, 'garden', 5, 11), hut = addRaw(w, 'house', 6, 11, { tier: 1 }), plot = addRaw(w, 'house', 7, 11);
    const tower = addRaw(w, 'tower', 8, 11), rubble = addRaw(w, 'rubble', 9, 11);
    expect([potter, garden, hut, plot, tower, rubble].map(baseRiskOf)).toEqual([1, 0, 0.3, 0, 0, 0]);
    expect([potter, garden, hut, plot, tower, rubble].map(canBurn)).toEqual([true, false, true, false, false, false]);
    potter.risk = 42; garden.risk = 5;
    expect([fireRiskOf(w, potter), fireRiskOf(w, garden)]).toEqual([42, 0]);
    expect([0, 24, 25, 59, 60, 99, 100, 250].map(fireBand)).toEqual([0, 0, 1, 1, 2, 2, 3, 3]);
    expect(fireStarted(w)).toBe(true);
    w.milestone = 'village';
    expect(fireStarted(w)).toBe(false);
    potter.fire = { stage: 'blaze', days: 0, need: 1, fought: 0 };
    expect(burning(w).map((b) => b.id)).toEqual([potter.id]);
  });
  it('prices rubble clearing per tile at the city\'s level, and offers clearRubble from fire.js too', () => {
    const w = street();
    expect([rubbleClearCost(w), rubbleClearCost(w, 4)]).toEqual([5, 20]);
    w.difficulty = 'hard';
    expect(rubbleClearCost(w, 4)).toBe(24);
    expect(clearRubbleFromFire).toBe(clearRubble);
  });
  it('starts as safe stubs with their final signatures (Track A fills them in)', () => {
    const w = street();
    const potter = addRaw(w, 'potter', 2, 11);
    const before = JSON.stringify(w);
    expect(fireCoverage(w) instanceof Map).toBe(true);
    expect([coverageOf(w, potter), staffedCover(w, potter), typeof dailyRiskOf(w, potter)]).toEqual([0, false, 'number']);
    fireDay(w, []);
    expect(typeof igniteBuilding(w, potter.id, [], 'raid')).toBe('boolean');
    expect(Array.isArray(burnBuilding(w, 999, []))).toBe(true);
    expect([Array.isArray(fireAlerts(w)), typeof fireMood(w)]).toEqual([true, 'object']);
    expect(JSON.stringify(w)).toBe(before);
  });
  it('covers buildings whose road tiles a working firehouse reaches within 8 road tiles, at its staffing ratio', () => {
    const w = street();
    const fh = addRaw(w, 'firehouse', 10, 9, { staff: 4 });                         // its road tile is (10, 10)
    const potter = addRaw(w, 'potter', 12, 11), granary = addRaw(w, 'granary', 16, 11), bazaar = addRaw(w, 'bazaar', 18, 11);
    const cover = () => [potter, granary, bazaar].map((b) => coverageOf(w, b));
    expect(cover()).toEqual([1, 1, 0]);                                              // the bazaar's nearest road tile is 9 away
    expect(fireCoverage(w)).toBe(fireCoverage(w));                                   // cached while nothing changes
    fh.staff = 2;
    expect([cover(), staffedCover(w, potter)]).toEqual([[0.5, 0.5, 0], true]);
    fh.staff = 1;
    expect([cover(), staffedCover(w, potter)]).toEqual([[0.25, 0.25, 0], false]);   // working, but not staffed for putting fires out
    fh.staff = 0;
    expect(cover()).toEqual([0, 0, 0]);                                              // below 25%: it works not at all
    fh.staff = 4; fh.paused = true;
    expect(cover()).toEqual([0, 0, 0]);
    fh.paused = false;
    addRaw(w, 'firehouse', 20, 9, { staff: 2 });
    expect(cover()).toEqual([1, 1, 0.5]);                                            // the best ratio among those reaching it
  });
  it('builds risk each day from Town by the type, the level and the cover', () => {
    const w = street();
    addRaw(w, 'firehouse', 10, 9, { staff: 4 });
    const potter = addRaw(w, 'potter', 12, 11), bazaar = addRaw(w, 'bazaar', 18, 11), garden = addRaw(w, 'garden', 22, 11);
    expect([near(dailyRiskOf(w, potter), 0.2), near(dailyRiskOf(w, bazaar), 0.3), dailyRiskOf(w, garden)]).toEqual([true, true, 0]);
    w.difficulty = 'hard';
    expect(near(dailyRiskOf(w, bazaar), 0.45)).toBe(true);
    w.milestone = 'village';
    expect(dailyRiskOf(w, bazaar)).toBe(0);
  });
});

describe('s3 contract raid seams', () => {
  it('names an entry by its edge, counts the towers a raid needs and the working ones, and finds the target kind', () => {
    const w = createWorld({ seed: 3 });
    expect(w.raiderEntries.map((e) => entryDir(w, e))).toEqual(['east', 'north']);
    expect(entryDir(w, { x: 0, y: 30 })).toBe('west');
    expect(entryDir(w, { x: 30, y: w.size - 1 })).toBe('south');
    expect([1, 2, 3, 4, 6, 7, 12].map(towersNeeded)).toEqual([1, 1, 1, 2, 2, 3, 4]);
    const s = street();
    expect(raidTargetKind(s)).toBe('building');
    addRaw(s, 'temple', 2, 11);
    expect(raidTargetKind(s)).toBe('temple');
    addRaw(s, 'storehouse', 6, 11);
    expect(raidTargetKind(s)).toBe('storehouse');
    const t = addRaw(s, 'tower', 10, 11);
    expect(workingTowers(s)).toBe(0);
    staffAll(s);
    expect(workingTowers(s)).toBe(1);
    t.paused = true;
    expect(workingTowers(s)).toBe(0);
  });
  it('starts as safe stubs with their final signatures (Track B fills them in)', () => {
    const w = street();
    const before = JSON.stringify(w);
    expect(raidSize(w)).toBe(RAIDS.firstSize);
    expect(tributeQuote(w)).toBe(null);
    expect(payTribute(w)).toEqual({ ok: false, reason: 'no_warning', warnings: [] });
    raidDay(w, []); raidMonth(w, []); trainSoldiers(w, []); combatDay(w, []);
    expect([raidAlerts(w), raidMood(w), flowField(w, [[1, 1]])]).toEqual([[], {}, null]);
    expect(previewWall(w, 1, 1, 5, 1)).toEqual({ ok: false, reason: 'locked', warnings: [], tiles: [], gates: [], cost: 0 });
    expect(drawWall(w, 1, 1, 5, 1).ok).toBe(false);
    expect(checkFeats(w, [])).toEqual([]);
    expect(JSON.stringify(w)).toBe(before);
  });
  it('sizes a raid from people and wealth, the level and the adaptation; the first is always 3', () => {
    const w = street(0);
    const home = addRaw(w, 'house', 1, 1, { tier: 4, residents: 250 });
    w.difficulty = 'hard';
    expect(raidSize(w)).toBe(3);                                                      // index 0: the first raid, at every level
    w.difficulty = 'normal';
    w.raid.index = 1;
    const at = (people, wealth) => { home.residents = people; w.gold = wealth - 5; expect(raidWealth(w)).toBe(wealth); return raidSize(w); };
    expect(at(250, 6000)).toBe(3);                                                    // 1 + 2 + 0.2 = 3.2
    expect(at(600, 15000)).toBe(8);                                                   // 1 + 4.8 + 2 = 7.8
    expect(at(1000, 60000)).toBe(12);                                                 // 13, at most 12
    w.difficulty = 'relaxed';
    expect(at(1000, 60000)).toBe(7);                                                  // 6.5
    expect(at(0, 5)).toBe(2);                                                         // 1 x 0.5, at least 2
    w.difficulty = 'normal';
    w.raid.adaptation = 0.6;
    expect(at(600, 15000)).toBe(5);                                                   // 7.8 x 0.6 = 4.68
    w.gold = -300;
    expect(raidWealth(w)).toBe(5);                                                    // debt counts as 0
  });
  it('quotes and takes a warned raid\'s tribute, never the first one and never below 0, and schedules the next warning', () => {
    const w = street(1000);
    expect(tributeFor(w, 8)).toBe(360);                                               // 0.8 x 3 towers x 150
    w.difficulty = 'hard';
    expect(tributeFor(w, 4)).toBe(301);                                               // 0.8 x 2 x 188
    w.difficulty = 'normal';
    w.raid.index = 2;
    w.raid.warning = { index: 1, entry: { x: 31, y: 16 }, dir: 'east', size: 8, tribute: 360, target: 'storehouse', day: 800, arrives: 890, first: false };
    addRaw(w, 'tower', 3, 9, { staff: 4 });
    expect(tributeQuote(w)).toEqual({ cost: 360, size: 8, towersNeeded: 3, towersHave: 1, buildN: 2, buildCost: 300, hidden: false, payable: true, reason: null });
    w.gold = 359;
    expect([tributeQuote(w).reason, payTribute(w).reason]).toEqual(['below_zero', 'below_zero']);
    w.gold = 1000;
    w.raid.adaptation = 0.6;
    const next = laterWarnDay(w, 890);
    expect(next >= 890 + RAIDS.laterMin && next <= 890 + RAIDS.laterMax).toBe(true);
    expect(payTribute(w)).toEqual({ ok: true, cost: 360, warnings: [] });
    expect([w.gold, w.tally.tributes, w.raid.adaptation, w.raid.warning, w.raid.nextWarnDay]).toEqual([640, 1, Math.min(1, 0.6 + RAIDS.adaptStep), null, next]);
    expect(payTribute(w).reason).toBe('no_warning');
    w.raid.warning = { index: 0, entry: { x: 31, y: 16 }, dir: 'east', size: 3, tribute: null, target: 'building', day: 720, arrives: 810, first: true };
    const q = tributeQuote(w);
    expect([q.hidden, q.payable, q.reason, q.cost, q.buildN]).toEqual([true, false, 'first_raid', null, 0]);
    expect(payTribute(w).reason).toBe('first_raid');
  });
  it('holds a festival at a working temple from Town, once a year, for six mood points over three months', () => {
    const w = street(1000);
    w.milestone = 'village';
    expect(festivalStatus(w).reason).toBe('locked');
    w.milestone = 'town';
    expect(festivalStatus(w).reason).toBe('no_temple');
    const t = addRaw(w, 'temple', 2, 11);
    expect(festivalStatus(w).reason).toBe('no_temple');                              // not staffed: not working
    t.staff = 6;
    expect(festivalStatus(w)).toEqual({ can: true, reason: null, cost: 200, nextIn: 0, activeFor: 0 });
    w.day = 100;
    expect(holdFestival(w)).toEqual({ ok: true, cost: 200, warnings: [] });
    expect([w.gold, w.danger.festivalDay, w.tally.festivals, festivalMood(w)]).toEqual([800, 100, 1, { festival: 6 }]);
    w.day = 189;
    const s = festivalStatus(w);
    expect([festivalMood(w), s.activeFor, s.nextIn, s.reason]).toEqual([{ festival: 6 }, 1, 271, 'too_soon']);
    w.day = 190;
    expect(festivalMood(w)).toEqual({});
    w.day = 460;
    expect(festivalStatus(w).can).toBe(true);
    w.gold = -400;
    expect(holdFestival(w).reason).toBe('no_gold');
    w.difficulty = 'hard';
    expect(festivalStatus(w).cost).toBe(250);
    w.gold = 1000;
    expect(holdFestival(w).ok).toBe(true);
    updateMood(w);
    expect([w.moodBreakdown.festival, w.mood]).toEqual([6, 60 + 20 + 6]);            // no homes: everyone fed (+20), and the festival
  });
  it('costs a raider 1 a tile on open ground and roads, nothing through water or buildings, 1 + hp / 2 through a wall', () => {
    const w = street();
    addRaw(w, 'well', 3, 3);
    w.terrain[idx(w.size, 5, 5)] = TERRAIN.WATER;
    w.wall[idx(w.size, 6, 6)] = 40;
    w.wall[idx(w.size, 7, 7)] = -1;
    const t = addRaw(w, 'tower', 8, 8);
    w.wall[idx(w.size, 8, 8)] = DEFENCE.towerOnWallHp;
    expect([tileCost(w, 1, 1), tileCost(w, 1, 10), tileCost(w, 3, 3), tileCost(w, 5, 5), tileCost(w, 6, 6), tileCost(w, 7, 7), tileCost(w, 8, 8), tileCost(w, -1, 0)])
      .toEqual([1, 1, Infinity, Infinity, 21, 1, 41, Infinity]);
    expect(t.type).toBe('tower');
    expect([isGate(w, idx(w.size, 6, 6)), wallHpFor(w, idx(w.size, 6, 6)), wallHpFor(w, idx(w.size, 6, 10))]).toEqual([false, DEFENCE.wallHp, DEFENCE.gateHp]);
    w.wall[idx(w.size, 6, 10)] = 40;
    expect(isGate(w, idx(w.size, 6, 10))).toBe(true);
  });
});

describe('s3 contract clock and economy wiring', () => {
  it('runs the day with fire and raids, stops a frame\'s days when the sim pauses, and keeps a calm city\'s mood rows', () => {
    const w = street();
    w.speed = 3;
    let day = w.day;
    Object.defineProperty(w, 'day', { get: () => day, set: (v) => { day = v; if (v === 2) w.speed = 0; }, configurable: true, enumerable: true });   // the sim pausing on day 2
    const loop = createGameLoop({ world: w, render: () => {}, raf: () => 0, caf: () => {} });
    loop.tick(0); loop.tick(250); loop.tick(500);
    expect([w.day, loop.accumulator]).toEqual([2, 0]);
    loop.tick(750); loop.tick(1000);
    expect(w.day).toBe(2);
    const c = street();
    tickDay(c, []);
    updateMood(c);
    expect(Object.keys(c.moodBreakdown)).toEqual(['base', 'food', 'jobs', 'debt']);   // no danger terms in a calm city
  });
  it('pays soldiers monthly, in peace and from a paused barracks, on its own line', () => {
    const w = street(1000);
    const barracks = addRaw(w, 'barracks', 2, 11, { paused: true });
    w.soldiers.push({ id: 1, barracks: barracks.id, x: 3, y: 12, hp: 12, hit: false, task: 'wait' }, { id: 2, barracks: barracks.id, x: 3, y: 12, hp: 12, hit: false, task: 'wait' });
    const gold = w.gold;
    runMonth(w, []);
    const m = w.stats.lastMonth;
    expect(m.soldiers).toBe(2 * DEFENCE.soldierPay);
    expect(m.net).toBe(m.taxes - m.wages - m.upkeep - m.soldiers);
    expect(m.upkeep).toBe(0);                                                       // paused: no upkeep, but the pay stands
    expect(w.gold).toBe(gold + m.net);
  });
  it('stores the score and its four parts in each month-end row', () => {
    const w = street();
    runMonth(w, []);
    const row = w.history[w.history.length - 1];
    expect(row).toEqual({ day: w.day, people: population(w), gold: w.gold, mood: w.mood, ...scoreRow(w) });
    expect(Object.keys(row.parts)).toEqual(['people', 'prosperity', 'culture', 'safety']);
  });
  it('records the day the city first became each milestone, once, two at a time when it jumps', () => {
    const w = makeTestWorld();
    const home = addRaw(w, 'house', 1, 1, { tier: 4, residents: MILESTONES[2].population });   // straight to Market town
    w.day = 90;
    expect(updateMilestone(w)).toBe(true);
    expect(w.splits).toEqual({ town: 90, market_town: 90 });
    home.residents = 0; w.tally.peakPeople = 0; w.milestone = 'village';           // a city never loses a milestone; even then
    w.day = 300; home.residents = MILESTONES[1].population;
    updateMilestone(w);
    expect(w.splits).toEqual({ town: 90, market_town: 90 });                       // the first day stands
    expect(splitMonths(w)).toEqual({ town: 3, market_town: 3, city: null, great_city: null, capital: null });
  });
  it('skips fire and raids for a calm world, the test-only switch the long runs and sample cities carry until Track F', () => {
    const w = street();
    expect('calm' in w).toBe(false);                                                // never set by the game
    w.calm = true;
    tickDay(w, []);
    expect(w.day).toBe(1);
    expect(JSON.parse(JSON.stringify(w)).calm).toBe(true);
    expect(makeTestWorld({ raiderEntries: [{ x: 31, y: 16 }] }).raiderEntries).toEqual([{ x: 31, y: 16 }]);   // the fixture's entries for raid tests
  });
  it('lists fire and raid alerts with the rest, and settles feats after every command', () => {
    const w = street();
    expect(alertsFor(w)).toEqual([]);
    expect(settle(w, []).filter((e) => e.type === 'feat')).toEqual([]);
  });
});

describe('s3 contract commands', () => {
  it('keeps buildings and roads off wall tiles, but lets a tower stand on a standing wall', () => {
    const w = street();
    const wallTile = idx(w.size, 12, 9), breach = idx(w.size, 14, 9);
    w.wall[wallTile] = 40; w.wall[breach] = -1;
    expect(canPlace(w, 'firehouse', 12, 9).reason).toBe('occupied');
    expect(canPlace(w, 'tower', 12, 9).ok).toBe(true);
    expect(canPlace(w, 'tower', 14, 9).reason).toBe('occupied');                     // not on broken stone
    expect(previewRoad(w, 12, 8, 12, 9).reason).toBe('blocked');
    w.wall[idx(w.size, 16, 10)] = 40;                                                  // a gate: the road through it stays usable
    expect(drawRoad(w, 16, 9, 16, 10).ok).toBe(true);
  });
  it('gives a tower on a wall tile its 80 hit points, drops the tile to plain wall hit points on Demolish and restores both on undo', () => {
    const w = street();
    const t = idx(w.size, 12, 9), other = idx(w.size, 13, 9);
    w.wall[t] = 40; w.wall[other] = 40;
    const v = w.wallVersion;
    expect(place(w, 'tower', 12, 9).ok).toBe(true);
    expect([w.wall[t], w.wall[other], w.wallVersion]).toEqual([DEFENCE.towerOnWallHp, 40, v + 1]);
    expect(tileCost(w, 12, 9)).toBe(1 + DEFENCE.towerOnWallHp / 2);
    expect(undo(w).ok).toBe(true);                                                     // the placement: the tile goes back to 40
    expect([w.wall[t], buildingAt(w, 12, 9)]).toEqual([40, null]);
    place(w, 'tower', 12, 9);
    expect(undo(w).ok).toBe(true);
    place(w, 'tower', 12, 9);
    w.wall[t] = 25;                                                                    // damaged since: an undo never heals it
    undo(w);
    expect(w.wall[t]).toBe(25);
    w.wall[t] = 40;
    place(w, 'tower', 12, 9);
    expect(demolishAt(w, 12, 9).ok).toBe(true);                                        // the tower goes, the wall stays at a wall's hit points
    expect([w.wall[t], buildingAt(w, 12, 9)]).toEqual([DEFENCE.wallHp, null]);
    expect(undo(w).ok).toBe(true);
    expect([w.wall[t], buildingAt(w, 12, 9).type]).toEqual([DEFENCE.towerOnWallHp, 'tower']);
    const open = street();
    place(open, 'tower', 12, 9);                                                       // a tower on open ground leaves the wall layer alone
    expect([open.wall[idx(open.size, 12, 9)], open.wallVersion]).toEqual([0, 0]);
  });
  it('clears rubble through Demolish at its price, refuses below the debt floor, counts it and undoes it', () => {
    const w = street(100);
    const r = addRaw(w, 'rubble', 12, 9);
    expect(demolishRefundFor(w, r)).toBe(-rubbleCostOf(w));
    expect(demolishAt(w, 12, 9)).toEqual({ ok: true, refund: -5, warnings: [] });
    expect([w.gold, w.tally.rubbleCleared, buildingAt(w, 12, 9)]).toEqual([95, 1, null]);
    expect(undo(w).ok).toBe(true);
    expect([w.gold, w.tally.rubbleCleared, buildingAt(w, 12, 9).type]).toEqual([100, 0, 'rubble']);
    w.gold = ECONOMY.debtFloor + 4;
    expect(demolishAt(w, 12, 9).reason).toBe('no_gold');
    expect(buildingAt(w, 12, 9).type).toBe('rubble');
  });
  it('sums an area\'s refunds less its clearing, and clears only rubble with clearRubble', () => {
    const w = street(1000);
    for (const x of [12, 13, 14]) addRaw(w, 'rubble', x, 9);
    place(w, 'well', 15, 9);
    const p = previewDemolishArea(w, 12, 9, 15, 9);
    expect([p.rubble, p.clearCost, p.refund, p.ok, p.reason]).toEqual([3, 15, 7 - 15, true, null]);   // the well refunds 7
    expect(clearRubble(w, 0, 0)).toEqual({ ok: false, reason: 'no_rubble', warnings: [], count: 0, cost: 0 });
    const gold = w.gold;
    expect(clearRubble(w, 12, 9, 15, 9)).toEqual({ ok: true, warnings: [], count: 3, cost: 15 });
    expect([w.gold, w.tally.rubbleCleared, buildingAt(w, 15, 9).type]).toEqual([gold - 15, 3, 'well']);
    undo(w);
    expect([w.gold, w.tally.rubbleCleared, buildingAt(w, 13, 9).type]).toEqual([gold, 0, 'rubble']);
    w.gold = ECONOMY.debtFloor + 10;
    expect(clearRubble(w, 12, 9, 14, 9).reason).toBe('no_gold');
    expect(demolishArea(w, 12, 9, 14, 9).reason).toBe('no_gold');
  });
  it('takes up wall tiles with Demolish (a gate keeps its road) and puts them back on undo', () => {
    const w = street();
    const gate = idx(w.size, 5, 10), wall = idx(w.size, 5, 9), breach = idx(w.size, 5, 8);
    w.wall[gate] = 40; w.wall[wall] = 25; w.wall[breach] = -1;
    const v = w.wallVersion;
    expect(demolishAt(w, 5, 10).ok).toBe(true);
    expect([w.wall[gate], w.road[gate], w.wallVersion]).toEqual([0, 1, v + 1]);
    expect(demolishArea(w, 5, 8, 5, 9).count).toBe(2);
    expect([w.wall[wall], w.wall[breach]]).toEqual([0, 0]);
    undo(w); undo(w);
    expect([w.wall[gate], w.wall[wall], w.wall[breach], w.wallVersion]).toEqual([40, 25, -1, v + 4]);
  });
  it('undoes a wall entry to each tile\'s old value, refunds its cost and uncounts its tiles', () => {
    const w = street(1000);
    const a = idx(w.size, 3, 3), b = idx(w.size, 4, 3);
    w.wall[b] = -1;
    w.wall[a] = 40; w.wall[b] = 40; w.gold -= 16; w.tally.wallTiles += 2;            // what drawWall does (Track B)
    pushUndo(w, { kind: 'wall', tiles: [a, b], before: [0, -1], cost: 16 });
    expect(undo(w)).toEqual({ ok: true, kind: 'wall' });
    expect([w.wall[a], w.wall[b], w.gold, w.tally.wallTiles]).toEqual([0, -1, 1000, 0]);
  });
  it('refunds only what still stands on undo, and never puts a building back where something now stands', () => {
    const w = street(1000);
    expect(place(w, 'potter', 12, 8).ok).toBe(true);
    const id = buildingAt(w, 12, 8).id;
    delete w.buildings[id];                                                            // burned down (fire.js removes it and frees its tiles)
    for (const [x, y] of [[12, 8], [13, 8], [12, 9], [13, 9]]) w.occ[idx(w.size, x, y)] = 0;
    const gold = w.gold;
    expect(undo(w).ok).toBe(true);
    expect(w.gold).toBe(gold);                                                         // nothing back for a building that is gone
    place(w, 'well', 20, 9);
    demolishAt(w, 20, 9);
    place(w, 'garden', 20, 9);
    undo(w);                                                                           // the garden goes: its tile is free again
    place(w, 'garden', 20, 9);
    w.undo.splice(w.undo.length - 1, 1);                                               // keep the garden: the demolish is next
    const before = w.gold;
    expect(undo(w)).toEqual({ ok: false, reason: 'occupied' });
    expect([buildingAt(w, 20, 9).type, w.gold, w.undo.map((e) => e.kind)]).toEqual(['garden', before, ['place']]);   // refused, and dropped
  });
  it('takes a city id once, from the interface', () => {
    const w = street();
    expect(setCityId(w, '').reason).toBe('bad_id');
    expect(setCityId(w, 'abc').ok).toBe(true);
    expect(setCityId(w, 'def').reason).toBe('has_id');
    expect(w.cityId).toBe('abc');
  });
});

describe('s3 contract score seams', () => {
  it('scores zero until Track E fills in the parts, with the version, factor, medals and next medal per level', () => {
    const w = street();
    const s = scoreOf(w);
    expect(s).toEqual({ version: 1, total: 0, raw: 0, factor: 1, parts: { people: 0, prosperity: 0, culture: 0, safety: 0 },
      reasons: { people: null, prosperity: null, culture: null, safety: null }, medal: null, next: { medal: 'bronze', points: 160 } });
    expect(scorePreview(w, 'well', 3, 9)).toEqual({ people: 0, prosperity: 0, culture: 0, safety: 0 });
    expect([159, 160, 239, 240, 320, 400].map(medalFor)).toEqual([null, 'bronze', 'bronze', 'silver', 'gold', 'gold']);
    w.difficulty = 'relaxed';
    expect([scoreFactor(w), nextMedal(w, 200)]).toEqual([0.8, { medal: 'silver', points: 192 - 160 }]);
    w.difficulty = 'hard';
    expect([nextMedal(w, 0), nextMedal(w, 320)]).toEqual([{ medal: 'bronze', points: 200 }, null]);
  });
  it('seals a reign in the world, as often as asked', () => {
    const w = street();
    w.day = 400;
    const r = sealReign(w);
    expect(r).toEqual({ ok: true, warnings: [], seal: { day: 400, score: 0, parts: { people: 0, prosperity: 0, culture: 0, safety: 0 }, medal: null, version: 1 } });
    sealReign(w);
    expect(w.seals.length).toBe(2);
  });
});
